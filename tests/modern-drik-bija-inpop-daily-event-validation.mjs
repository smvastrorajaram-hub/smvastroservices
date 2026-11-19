/**
 * Full monthly independent-INPOP validation for Modern Dṛk-Bīja.
 *
 * Monthly comparison grid: first day of each month, 1800-01 through 2399-12.
 * Event locator: 12-hour Moshier-only scan (not an INPOP comparison grid),
 * to ensure stations and angular conjunction/opposition crossings are not
 * missed between monthly reference epochs.
 * Event reference grid: INPOP comparison every 6 hours over +/- 24 hours
 * around each located event.
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
  fetchInpopEpochList,
  INPOP_PLANETS,
  INPOP_EVENT_EPOCH_LIMIT
} from '../research/modern-drik-bija/miriade-inpop-reference.mjs';

const FIXTURE = JSON.parse(fs.readFileSync(
  new URL('./fixtures/modern-drik-bija-jpl-de441-apparent-annual-1800-2399.json', import.meta.url),
  'utf8'
));
const PLANETS = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];
const BODIES = [...PLANETS, 'Sun'];
const START_MS = Date.UTC(1800, 0, 1);
const END_MS = Date.UTC(2400, 0, 1);
const MONTHLY_COUNT = 600 * 12;
const MONTHLY_EPOCHS = Array.from({ length: MONTHLY_COUNT }, (_, index) =>
  new Date(Date.UTC(1800, index, 1, 0, 0, 0))
);
const DAY_MS = 86400000;
const HALF_DAY_MS = DAY_MS / 2;
const SIX_HOURS_MS = 6 * 3600000;
const EVENT_SCAN_COUNT = Math.round((END_MS - START_MS) / HALF_DAY_MS) + 1;
const EPOCH_JD_UNIX = 2440587.5;

assert.equal(FIXTURE.ephemeris, 'DE441');
assert.equal(FIXTURE.quantity, 31);
assert.equal(FIXTURE.observerCenter, '500@399');
assert.equal(MONTHLY_COUNT, 7200);
assert.equal(MONTHLY_EPOCHS[0].toISOString(), '1800-01-01T00:00:00.000Z');
assert.equal(MONTHLY_EPOCHS.at(-1).toISOString(), '2399-12-01T00:00:00.000Z');
assert.equal(INPOP_PLANETS.join(','), BODIES.join(','));

const jdFromDate = date => EPOCH_JD_UNIX + date.getTime() / DAY_MS;
const decimalYear = date => {
  const year = date.getUTCFullYear();
  const yearStart = Date.UTC(year, 0, 1);
  const nextYearStart = Date.UTC(year + 1, 0, 1);
  return year + (date.getTime() - yearStart) / (nextYearStart - yearStart);
};
const normalize = value => ((value % 360) + 360) % 360;

function summarize(errors) {
  assert.ok(errors.length > 0, 'Cannot summarize an empty error set');
  const absolute = errors.map(Math.abs);
  const sorted = [...absolute].sort((a, b) => a - b);
  return {
    samples: errors.length,
    rmsDegrees: +Math.sqrt(errors.reduce((sum, value) => sum + value * value, 0) / errors.length).toFixed(9),
    p95AbsoluteDegrees: +sorted[Math.ceil(sorted.length * 0.95) - 1].toFixed(9),
    maxAbsoluteDegrees: +sorted.at(-1).toFixed(9)
  };
}

function fitCoefficients(provider) {
  return Object.fromEntries(PLANETS.map(planet => {
    const rows = FIXTURE.bodies[planet].rows;
    assert.equal(rows.length, 600, planet + ' DE441 annual training rows');
    const observations = rows.map(row => ({
      year: row.year,
      candidateLongitude: provider.apparentTropicalLongitude(row.year, planet).longitude,
      referenceLongitude: row.longitude
    }));
    return [planet, fitModernDrikBijaCoefficients({ planet, observations })];
  }));
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

function crossingEvents(body, other, datesMs, targetBoundaryStep, eventType, addEvent) {
  const firstRelative = normalize(body[0] - other[0]);
  let previousWrapped = signedResidualDegrees(firstRelative, 0);
  let previousUnwrapped = previousWrapped;
  for (let index = 1; index < body.length; index++) {
    const currentRelative = normalize(body[index] - other[index]);
    const currentWrapped = signedResidualDegrees(currentRelative, 0);
    const currentUnwrapped = previousUnwrapped +
      signedResidualDegrees(currentWrapped, previousWrapped);
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
      const centerMs = datesMs[index - 1] +
        fraction * (datesMs[index] - datesMs[index - 1]);
      addEvent(typeof eventType === 'function' ? eventType(boundary) : eventType, centerMs);
    }
    previousWrapped = currentWrapped;
    previousUnwrapped = currentUnwrapped;
  }
}

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

function makeEventEpochs(candidateLongitudes, datesMs) {
  const located = Object.fromEntries(PLANETS.map(planet => [planet, []]));
  const counts = Object.fromEntries(PLANETS.map(planet => [planet, {
    station: 0, solarConjunction: 0, solarOpposition: 0, mutualConjunction: 0
  }]));
  const add = planet => (kind, centerMs) => {
    if (centerMs < START_MS || centerMs >= END_MS) return;
    located[planet].push({ kind, centerMs });
    counts[planet][kind]++;
  };

  for (const planet of PLANETS) {
    detectStations(candidateLongitudes[planet], datesMs, add(planet));
    crossingEvents(candidateLongitudes[planet], candidateLongitudes.Sun, datesMs, 180,
      solarCrossingType, add(planet));
  }
  for (let i = 0; i < PLANETS.length; i++) {
    for (let j = i + 1; j < PLANETS.length; j++) {
      const left = PLANETS[i];
      const right = PLANETS[j];
      crossingEvents(candidateLongitudes[left], candidateLongitudes[right], datesMs, 360,
        'mutualConjunction', (kind, centerMs) => {
          add(left)(kind, centerMs);
          add(right)(kind, centerMs);
        });
    }
  }

  const epochsByPlanet = {};
  for (const planet of PLANETS) {
    const unique = new Set();
    for (const event of located[planet]) {
      for (let quarter = -4; quarter <= 4; quarter++) {
        const timestamp = Math.round(event.centerMs + quarter * SIX_HOURS_MS);
        if (timestamp >= START_MS && timestamp < END_MS) unique.add(timestamp);
      }
    }
    epochsByPlanet[planet] = [...unique].sort((a, b) => a - b).map(ms => new Date(ms));
  }
  return { epochsByPlanet, eventCounts: counts };
}

const report = {
  pass: true,
  gate: 'MODERN_DRIK_BIJA_MONTHLY_AND_EVENT_INPOP_0_05',
  modelVersion: '0.1.0-research',
  candidate: 'Swiss Ephemeris 2.10.03, explicit MOSEPH=4',
  independentReference: 'IMCCE Miriade INPOP19 planetary theory',
  referenceFrame: 'TT, geocenter, apparent ecliptic-of-date',
  monthlyGrid: 'First day of each month, 1800-01 through 2399-12',
  monthlySamplesPerPlanet: MONTHLY_COUNT,
  totalMonthlySamples: 0,
  eventLocator: 'Moshier-only 12-hour scan; not used as an INPOP comparison grid',
  eventReferenceGrid: 'INPOP every 6 hours from -24h to +24h around each located event',
  strictMaximumAbsoluteDegrees: MODERN_DRIK_BIJA_LIMIT_DEGREES,
  totalEventSamples: 0,
  inpopTheory: null,
  eventCounts: {},
  perPlanet: {},
  productionEligible: false,
  classicalBijaEquivalent: false,
  dailyGridUsed: false
};

const provider = await createModernMoshierReference();
try {
  console.log('Fitting fixed coefficients on the original central 1900-2299 JPL DE441 training interval.');
  const coefficients = fitCoefficients(provider);

  console.log('Fetching monthly INPOP epochs:', MONTHLY_COUNT, 'per body.');
  const monthlyReference = {};
  const theoryNames = new Set();
  for (const body of BODIES) {
    const rows = [];
    for (let offset = 0; offset < MONTHLY_EPOCHS.length; offset += INPOP_EVENT_EPOCH_LIMIT) {
      const batch = MONTHLY_EPOCHS.slice(offset, offset + INPOP_EVENT_EPOCH_LIMIT);
      const response = await fetchInpopEpochList(body, batch);
      theoryNames.add(response.theory);
      rows.push(...response.rows);
      console.log('Monthly INPOP', body, Math.min(offset + batch.length, MONTHLY_COUNT) + '/' + MONTHLY_COUNT);
    }
    assert.equal(rows.length, MONTHLY_COUNT, body + ' monthly INPOP rows');
    for (let i = 0; i < MONTHLY_COUNT; i++) {
      assert.ok(Math.abs(rows[i].date.getTime() - MONTHLY_EPOCHS[i].getTime()) <= 1000,
        body + ' monthly epoch mismatch at index ' + i);
    }
    monthlyReference[body] = rows.map(row => row.longitude);
  }
  assert.equal(theoryNames.size, 1, 'INPOP theory identity must remain constant');
  report.inpopTheory = [...theoryNames][0];
  assert.ok(report.inpopTheory.startsWith('INPOP'));

  console.log('Comparing all 7,200 monthly positions for each of the five planets.');
  const monthlyErrors = {};
  for (const planet of PLANETS) {
    const raw = [];
    const corrected = [];
    for (let i = 0; i < MONTHLY_COUNT; i++) {
      const date = MONTHLY_EPOCHS[i];
      const candidate = provider.apparentTropicalLongitudeAtJd(jdFromDate(date), planet).longitude;
      const reference = monthlyReference[planet][i];
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
      planet + ' monthly INPOP corrected maximum ' + correctedSummary.maxAbsoluteDegrees +
      '° exceeds strict ' + MODERN_DRIK_BIJA_LIMIT_DEGREES + '°');
    monthlyErrors[planet] = { rawMoshier: rawSummary, correctedDrikBija: correctedSummary };
    report.totalMonthlySamples += MONTHLY_COUNT;
    console.log('Monthly comparison', planet, JSON.stringify(monthlyErrors[planet]));
  }

  console.log('Locating all stations and angular conjunction/opposition events using a 12-hour Moshier-only scan.');
  const scanDates = new Float64Array(EVENT_SCAN_COUNT);
  const candidateLongitudes = Object.fromEntries(BODIES.map(body => [
    body, new Float64Array(EVENT_SCAN_COUNT)
  ]));
  for (let i = 0; i < EVENT_SCAN_COUNT; i++) {
    const timeMs = START_MS + i * HALF_DAY_MS;
    scanDates[i] = timeMs;
    const jd = EPOCH_JD_UNIX + timeMs / DAY_MS;
    for (const body of BODIES) {
      candidateLongitudes[body][i] =
        provider.apparentTropicalLongitudeAtJd(jd, body).longitude;
    }
    if (i > 0 && i % 50000 === 0) {
      console.log('Moshier event locator', i + '/' + EVENT_SCAN_COUNT);
    }
  }

  console.log('Detecting stations, solar conjunctions/oppositions, and mutual conjunctions.');
  const events = makeEventEpochs(candidateLongitudes, scanDates);
  report.eventCounts = events.eventCounts;
  report.totalCandidateEvents = Object.values(events.eventCounts)
    .reduce((sum, group) => sum + Object.values(group).reduce((a, b) => a + b, 0), 0);
  report.totalUniqueEventEpochs = Object.values(events.epochsByPlanet)
    .reduce((sum, epochs) => sum + epochs.length, 0);
  console.log('Located candidate events:', JSON.stringify(report.eventCounts));
  console.log('Unique dense INPOP event epochs:', report.totalUniqueEventEpochs);

  console.log('Validating dense event windows against independent INPOP.');
  const eventErrors = {};
  for (const planet of PLANETS) {
    const epochs = events.epochsByPlanet[planet];
    const raw = [];
    const corrected = [];
    for (let offset = 0; offset < epochs.length; offset += INPOP_EVENT_EPOCH_LIMIT) {
      const batch = epochs.slice(offset, offset + INPOP_EVENT_EPOCH_LIMIT);
      const response = await fetchInpopEpochList(planet, batch);
      assert.equal(response.theory, report.inpopTheory, 'INPOP theory identity changed for event samples');
      for (let i = 0; i < batch.length; i++) {
        const date = response.rows[i].date;
        assert.ok(Math.abs(date.getTime() - batch[i].getTime()) <= 1000,
          planet + ' event epoch mismatch at index ' + (offset + i));
        const candidate = provider.apparentTropicalLongitudeAtJd(jdFromDate(date), planet).longitude;
        const output = applyModernDrikBijaCorrection({
          year: decimalYear(date),
          apparentLongitude: candidate,
          coefficients: coefficients[planet]
        });
        raw.push(signedResidualDegrees(candidate, response.rows[i].longitude));
        corrected.push(signedResidualDegrees(output.trueLongitude, response.rows[i].longitude));
      }
      console.log('Dense event INPOP comparison', planet,
        Math.min(offset + batch.length, epochs.length) + '/' + epochs.length);
    }
    assert.ok(epochs.length > 0, planet + ' has no detected event-window validation epochs');
    const rawSummary = summarize(raw);
    const correctedSummary = summarize(corrected);
    assert.ok(correctedSummary.maxAbsoluteDegrees <= MODERN_DRIK_BIJA_LIMIT_DEGREES,
      planet + ' dense event INPOP maximum ' + correctedSummary.maxAbsoluteDegrees +
      '° exceeds strict ' + MODERN_DRIK_BIJA_LIMIT_DEGREES + '°');
    eventErrors[planet] = { rawMoshier: rawSummary, correctedDrikBija: correctedSummary };
    report.totalEventSamples += epochs.length;
  }

  report.perPlanet = Object.fromEntries(PLANETS.map(planet => [planet, {
    monthly: monthlyErrors[planet],
    denseEventWindows: eventErrors[planet],
    fittedCoefficientsFromDE441: {
      interceptDegreesAt2100: +coefficients[planet].interceptDegreesAt2100.toFixed(12),
      slopeDegreesPerCentury: +coefficients[planet].slopeDegreesPerCentury.toFixed(12)
    }
  }]));
  report.globalMonthlyMaximumAbsoluteDegrees = Math.max(...PLANETS.map(
    planet => monthlyErrors[planet].correctedDrikBija.maxAbsoluteDegrees
  ));
  report.globalEventMaximumAbsoluteDegrees = Math.max(...PLANETS.map(
    planet => eventErrors[planet].correctedDrikBija.maxAbsoluteDegrees
  ));
  report.globalMaximumAbsoluteDegrees = Math.max(
    report.globalMonthlyMaximumAbsoluteDegrees,
    report.globalEventMaximumAbsoluteDegrees
  );
  report.pass = report.globalMaximumAbsoluteDegrees <= MODERN_DRIK_BIJA_LIMIT_DEGREES;
  report.complete = true;

  const outputDirectory = 'modern-drik-bija-inpop-validation-output';
  await mkdir(outputDirectory, { recursive: true });
  fs.writeFileSync(
    outputDirectory + '/INPOP_MONTHLY_AND_EVENT_REPORT.json',
    JSON.stringify(report, null, 2) + '\n'
  );
  console.log('MODERN DṚK-BĪJA MONTHLY + EVENT INPOP REPORT');
  console.log(JSON.stringify(report, null, 2));
  assert.equal(report.pass, true, 'Monthly and dense-event independent INPOP 0.05° gate failed');
} finally {
  provider.close();
}
