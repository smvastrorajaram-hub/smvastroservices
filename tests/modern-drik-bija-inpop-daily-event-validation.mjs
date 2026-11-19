/**
 * Full-density independent INPOP validation for Modern Dṛk-Bīja.
 *
 * Daily grid: every calendar day 1800-01-01 TT through 2399-12-31 TT.
 * Event grid: 6-hourly samples over +/- 1 day around all detected daily-grid
 * stations, Sun conjunctions/oppositions and interplanetary conjunctions.
 *
 * INPOP is queried independently through IMCCE Miriade. It is not the JPL
 * DE441 training fixture and is not Swiss Ephemeris Moshier.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { mkdir } from 'node:fs/promises';
import {
  MODERN_DRIK_BIJA_LIMIT_DEGREES,
  fitModernDrikBijaCoefficients,
  applyModernDrikBijaCorrection,
  signedResidualDegrees
} from '../research/modern-drik-bija/modern-drik-bija-model.mjs';
import { createModernMoshierReference } from '../research/modern-drik-bija/moshier-apparent-reference.mjs';
import {
  fetchInpopDailySeries,
  fetchInpopEpochList,
  INPOP_PLANETS,
  INPOP_EVENT_EPOCH_LIMIT
} from '../research/modern-drik-bija/miriade-inpop-reference.mjs';

const FIXTURE = JSON.parse(fs.readFileSync(
  new URL('./fixtures/modern-drik-bija-jpl-de441-apparent-annual-1800-2399.json', import.meta.url),
  'utf8'
));
const PLANETS = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];
const START = new Date('1800-01-01T00:00:00Z'); // TT calendar label, not UTC instant.
const DAILY_COUNT = Math.round((Date.parse('2400-01-01T00:00:00Z') - START.getTime()) / 86400000);
const DAY_MS = 86400000;
const SIX_HOURS_MS = 6 * 3600000;
const EPOCH_JD_UNIX = 2440587.5;

assert.equal(FIXTURE.ephemeris, 'DE441');
assert.equal(FIXTURE.quantity, 31);
assert.equal(FIXTURE.observerCenter, '500@399');
assert.equal(DAILY_COUNT, 219145);
assert.deepEqual(INPOP_PLANETS, [...PLANETS, 'Sun']);

const normalize = value => ((value % 360) + 360) % 360;
const jdFromDate = date => EPOCH_JD_UNIX + date.getTime() / DAY_MS;

function decimalYear(date) {
  const year = date.getUTCFullYear();
  const start = Date.UTC(year, 0, 1);
  const stop = Date.UTC(year + 1, 0, 1);
  return year + (date.getTime() - start) / (stop - start);
}

function summarize(signedErrors) {
  assert.ok(signedErrors.length > 0, 'Cannot summarize an empty error set');
  const absolute = signedErrors.map(Math.abs);
  const sorted = [...absolute].sort((a, b) => a - b);
  const rms = Math.sqrt(signedErrors.reduce((sum, value) => sum + value * value, 0) / signedErrors.length);
  return {
    samples: signedErrors.length,
    rmsDegrees: +rms.toFixed(9),
    p95AbsoluteDegrees: +sorted[Math.ceil(sorted.length * 0.95) - 1].toFixed(9),
    maxAbsoluteDegrees: +sorted.at(-1).toFixed(9)
  };
}

function fitCoefficients(provider) {
  const output = {};
  for (const planet of PLANETS) {
    const rows = FIXTURE.bodies[planet].rows;
    assert.equal(rows.length, 600);
    const observations = rows.map(row => ({
      year: row.year,
      candidateLongitude: provider.apparentTropicalLongitude(row.year, planet).longitude,
      referenceLongitude: row.longitude
    }));
    output[planet] = fitModernDrikBijaCoefficients({ planet, observations });
  }
  return output;
}

function unwrapNext(previousUnwrapped, previousWrapped, currentWrapped) {
  return previousUnwrapped + signedResidualDegrees(currentWrapped, previousWrapped);
}

function crossingEvents(body, other, datesMs, targetBoundaryStep, eventType, addEvent) {
  const firstRelative = normalize(body[0] - other[0]);
  let previousWrapped = signedResidualDegrees(firstRelative, 0);
  let previousUnwrapped = previousWrapped;
  for (let index = 1; index < body.length; index++) {
    const currentRelative = normalize(body[index] - other[index]);
    const currentWrapped = signedResidualDegrees(currentRelative, 0);
    const currentUnwrapped = unwrapNext(previousUnwrapped, previousWrapped, currentWrapped);
    const low = Math.min(previousUnwrapped, currentUnwrapped);
    const high = Math.max(previousUnwrapped, currentUnwrapped);
    const firstBoundary = Math.ceil((low + 1e-12) / targetBoundaryStep);
    const lastBoundary = Math.floor((high - 1e-12) / targetBoundaryStep);
    for (let k = firstBoundary; k <= lastBoundary; k++) {
      const boundary = k * targetBoundaryStep;
      const delta = currentUnwrapped - previousUnwrapped;
      if (Math.abs(delta) < 1e-12) continue;
      const fraction = (boundary - previousUnwrapped) / delta;
      if (fraction < 0 || fraction > 1) continue;
      const center = datesMs[index - 1] + fraction * (datesMs[index] - datesMs[index - 1]);
      const kind = typeof eventType === 'function' ? eventType(k) : eventType;
      addEvent(kind, center);
    }
    previousWrapped = currentWrapped;
    previousUnwrapped = currentUnwrapped;
  }
}

function solarCrossingType(boundaryDegrees) {
  const halfTurns = Math.round(boundaryDegrees / 180);
  if (Math.abs(boundaryDegrees - halfTurns * 180) > 1e-9) {
    throw new RangeError('Solar crossing boundary must be a multiple of 180 degrees');
  }
  return Math.abs(halfTurns) % 2 === 0 ? 'solarConjunction' : 'solarOpposition';
}
assert.equal(solarCrossingType(0), 'solarConjunction');
assert.equal(solarCrossingType(360), 'solarConjunction');
assert.equal(solarCrossingType(180), 'solarOpposition');
assert.equal(solarCrossingType(-180), 'solarOpposition');
assert.equal(solarCrossingType(540), 'solarOpposition');

function detectStations(longitudes, datesMs, addEvent) {
  const rates = new Float64Array(longitudes.length - 1);
  for (let i = 0; i < rates.length; i++) {
    rates[i] = signedResidualDegrees(longitudes[i + 1], longitudes[i]);
  }
  for (let i = 1; i < rates.length; i++) {
    const before = rates[i - 1];
    const after = rates[i];
    if (before === 0 || after === 0 || before * after >= 0) continue;
    const fraction = Math.abs(before) / (Math.abs(before) + Math.abs(after));
    const leftMidpoint = (datesMs[i - 1] + datesMs[i]) / 2;
    const rightMidpoint = (datesMs[i] + datesMs[i + 1]) / 2;
    addEvent('station', leftMidpoint + fraction * (rightMidpoint - leftMidpoint));
  }
}

function makeEventEpochs(longitudes, datesMs) {
  const planetEvents = Object.fromEntries(PLANETS.map(planet => [planet, []]));
  const eventCounts = Object.fromEntries(PLANETS.map(planet => [planet, {
    station: 0, solarConjunction: 0, solarOpposition: 0, mutualConjunction: 0
  }]));
  const add = planet => (kind, centerMs) => {
    if (centerMs < datesMs[0] || centerMs >= datesMs.at(-1)) return;
    planetEvents[planet].push({ kind, centerMs });
    eventCounts[planet][kind]++;
  };

  for (const planet of PLANETS) {
    detectStations(longitudes[planet], datesMs, add(planet));
    crossingEvents(longitudes[planet], longitudes.Sun, datesMs, 180,
      solarCrossingType,
      add(planet));
  }
  for (let i = 0; i < PLANETS.length; i++) {
    for (let j = i + 1; j < PLANETS.length; j++) {
      const left = PLANETS[i];
      const right = PLANETS[j];
      const leftEvents = [];
      crossingEvents(longitudes[left], longitudes[right], datesMs, 360,
        'mutualConjunction', (kind, centerMs) => {
          leftEvents.push(centerMs);
          add(right)(kind, centerMs);
        });
      for (const centerMs of leftEvents) add(left)('mutualConjunction', centerMs);
    }
  }

  const epochsByPlanet = {};
  for (const planet of PLANETS) {
    const unique = new Set();
    for (const event of planetEvents[planet]) {
      for (let quarter = -4; quarter <= 4; quarter++) {
        unique.add(Math.round(event.centerMs + quarter * SIX_HOURS_MS));
      }
    }
    epochsByPlanet[planet] = [...unique].sort((a, b) => a - b).map(ms => new Date(ms));
  }
  return { epochsByPlanet, eventCounts };
}

function buildReport() {
  return {
    pass: true,
    gate: 'MODERN_DRIK_BIJA_DAILY_AND_EVENT_INPOP_0_05',
    candidate: 'Swiss Ephemeris 2.10.03, explicit MOSEPH=4',
    independentReference: 'IMCCE Miriade planetary theory INPOP',
    coordinateFrame: 'Geocentric apparent ecliptic-of-date, TT',
    dailyGrid: '1800-01-01T00:00:00 TT through 2399-12-31T00:00:00 TT, 1-day cadence',
    eventGrid: 'All detected stations, Sun conjunctions/oppositions and mutual conjunctions; +/-24 hours at 6-hour cadence',
    strictMaximumAbsoluteDegrees: MODERN_DRIK_BIJA_LIMIT_DEGREES,
    totalDailySamples: 0,
    totalEventSamples: 0,
    inpopTheory: null,
    perPlanet: {},
    productionEligible: false,
    classicalBijaEquivalent: false,
    dailyOrEventCoverageComplete: false
  };
}

const report = buildReport();
const provider = await createModernMoshierReference();
try {
  console.log('Fitting Dṛk coefficients on the predeclared JPL DE441 1900–2299 training interval.');
  const coefficients = fitCoefficients(provider);

  console.log('Downloading complete daily INPOP reference grid:', DAILY_COUNT, 'TT dates per target.');
  const referenceLongitudes = {};
  const dailyDatesMs = new Float64Array(DAILY_COUNT);
  const inpopTheoryNames = new Set();

  for (let bodyIndex = 0; bodyIndex < INPOP_PLANETS.length; bodyIndex++) {
    const body = INPOP_PLANETS[bodyIndex];
    const series = await fetchInpopDailySeries(body, START, DAILY_COUNT, {
      onProgress: ({ completed, total }) => {
        if (completed === total || completed % 25000 === 0) {
          console.log('INPOP daily download', body, completed + '/' + total);
        }
      }
    });
    inpopTheoryNames.add(series.theory);
    const longitudes = new Float64Array(DAILY_COUNT);
    for (let i = 0; i < DAILY_COUNT; i++) {
      const row = series.rows[i];
      if (bodyIndex === 0) dailyDatesMs[i] = row.date.getTime();
      else if (Math.abs(row.date.getTime() - dailyDatesMs[i]) > 1000) {
        throw new Error(body + ' daily TT epoch differs from the other body series at index ' + i);
      }
      longitudes[i] = row.longitude;
    }
    referenceLongitudes[body] = longitudes;
    console.log('Completed independent INPOP daily grid for', body, 'theory', series.theory);
  }
  assert.equal(inpopTheoryNames.size, 1, 'INPOP theory identity must remain fixed across all bodies');
  report.inpopTheory = [...inpopTheoryNames][0];

  console.log('Comparing every daily INPOP epoch for the five planets.');
  const dailyErrors = {};
  const eventRawErrors = {};
  let totalDailySamples = 0;
  for (const planet of PLANETS) {
    const raw = [];
    const corrected = [];
    for (let i = 0; i < DAILY_COUNT; i++) {
      const date = new Date(dailyDatesMs[i]);
      const jdTt = jdFromDate(date);
      const candidate = provider.apparentTropicalLongitudeAtJd(jdTt, planet).longitude;
      const reference = referenceLongitudes[planet][i];
      const output = applyModernDrikBijaCorrection({
        year: decimalYear(date),
        apparentLongitude: candidate,
        coefficients: coefficients[planet]
      });
      raw.push(signedResidualDegrees(candidate, reference));
      corrected.push(signedResidualDegrees(output.trueLongitude, reference));
    }
    const rawSummary = summarize(raw);
    const correctedSummary = summarize(corrected);
    assert.ok(correctedSummary.maxAbsoluteDegrees <= MODERN_DRIK_BIJA_LIMIT_DEGREES,
      planet + ' daily INPOP corrected max ' + correctedSummary.maxAbsoluteDegrees +
      '° exceeds strict ' + MODERN_DRIK_BIJA_LIMIT_DEGREES + '°');
    dailyErrors[planet] = { rawMoshier: rawSummary, correctedDrikBija: correctedSummary };
    eventRawErrors[planet] = [];
    totalDailySamples += DAILY_COUNT;
    console.log('Daily comparison', planet, JSON.stringify(dailyErrors[planet]));
  }
  report.totalDailySamples = totalDailySamples;

  console.log('Detecting station, solar conjunction/opposition and mutual-conjunction epochs.');
  const events = makeEventEpochs(referenceLongitudes, dailyDatesMs);
  report.eventCounts = events.eventCounts;
  const totalEventEpochs = Object.values(events.epochsByPlanet)
    .reduce((sum, epochs) => sum + epochs.length, 0);
  console.log('High-density event epochs:', totalEventEpochs);

  const eventErrors = {};
  let totalEventSamples = 0;
  for (const planet of PLANETS) {
    const epochs = events.epochsByPlanet[planet];
    const raw = [];
    const corrected = [];
    for (let offset = 0; offset < epochs.length; offset += INPOP_EVENT_EPOCH_LIMIT) {
      const batch = epochs.slice(offset, offset + INPOP_EVENT_EPOCH_LIMIT);
      const reference = await fetchInpopEpochList(planet, batch);
      if (reference.theory !== report.inpopTheory) {
        throw new Error('INPOP theory changed in high-density ' + planet + ' query');
      }
      for (let i = 0; i < batch.length; i++) {
        const date = reference.rows[i].date;
        if (Math.abs(date.getTime() - batch[i].getTime()) > 1000) {
          throw new Error(planet + ' event epoch mismatch at batch offset ' + (offset + i));
        }
        const candidate = provider.apparentTropicalLongitudeAtJd(jdFromDate(date), planet).longitude;
        const output = applyModernDrikBijaCorrection({
          year: decimalYear(date),
          apparentLongitude: candidate,
          coefficients: coefficients[planet]
        });
        raw.push(signedResidualDegrees(candidate, reference.rows[i].longitude));
        corrected.push(signedResidualDegrees(output.trueLongitude, reference.rows[i].longitude));
      }
      console.log('High-density event comparison', planet,
        Math.min(offset + batch.length, epochs.length) + '/' + epochs.length);
    }
    const rawSummary = summarize(raw);
    const correctedSummary = summarize(corrected);
    assert.ok(correctedSummary.maxAbsoluteDegrees <= MODERN_DRIK_BIJA_LIMIT_DEGREES,
      planet + ' high-density event max ' + correctedSummary.maxAbsoluteDegrees +
      '° exceeds strict ' + MODERN_DRIK_BIJA_LIMIT_DEGREES + '°');
    eventErrors[planet] = { rawMoshier: rawSummary, correctedDrikBija: correctedSummary };
    totalEventSamples += epochs.length;
  }
  report.totalEventSamples = totalEventSamples;

  report.perPlanet = Object.fromEntries(PLANETS.map(planet => [planet, {
    daily: dailyErrors[planet],
    highDensityEvents: eventErrors[planet],
    fittedCoefficientsFromDE441: {
      interceptDegreesAt2100: +coefficients[planet].interceptDegreesAt2100.toFixed(12),
      slopeDegreesPerCentury: +coefficients[planet].slopeDegreesPerCentury.toFixed(12)
    }
  }]));
  const dailyGlobal = Math.max(...PLANETS.map(p => dailyErrors[p].correctedDrikBija.maxAbsoluteDegrees));
  const eventGlobal = Math.max(...PLANETS.map(p => eventErrors[p].correctedDrikBija.maxAbsoluteDegrees));
  report.globalDailyMaximumAbsoluteDegrees = dailyGlobal;
  report.globalEventMaximumAbsoluteDegrees = eventGlobal;
  report.globalMaximumAbsoluteDegrees = Math.max(dailyGlobal, eventGlobal);
  report.dailyOrEventCoverageComplete = true;
  report.pass = report.globalMaximumAbsoluteDegrees <= MODERN_DRIK_BIJA_LIMIT_DEGREES;

  const outputDirectory = 'modern-drik-bija-inpop-validation-output';
  await mkdir(outputDirectory, { recursive: true });
  fs.writeFileSync(
    outputDirectory + '/INPOP_DAILY_AND_EVENT_REPORT.json',
    JSON.stringify(report, null, 2) + '\n'
  );
  console.log('MODERN DṚK-BĪJA DAILY + EVENT INPOP REPORT');
  console.log(JSON.stringify(report, null, 2));
  assert.equal(report.pass, true, 'Daily and dense-event independent INPOP 0.05° gate failed');
} finally {
  provider.close();
}
