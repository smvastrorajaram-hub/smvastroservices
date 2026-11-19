/**
 * Modern Dṛk-Bīja prototype validation.
 *
 * Fit:     1900..2299 (400 years per planet)
 * Holdout: 1800..1899 and 2300..2399 (200 years per planet)
 * No holdout row is passed into coefficient fitting.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  MODERN_DRIK_BIJA_LIMIT_DEGREES,
  MODERN_DRIK_BIJA_TRAINING,
  fitModernDrikBijaCoefficients,
  applyModernDrikBijaCorrection,
  signedResidualDegrees
} from '../research/modern-drik-bija/modern-drik-bija-model.mjs';
import { createModernMoshierReference } from '../research/modern-drik-bija/moshier-apparent-reference.mjs';

const fixture = JSON.parse(fs.readFileSync(
  new URL('./fixtures/modern-drik-bija-jpl-de441-apparent-annual-1800-2399.json', import.meta.url),
  'utf8'
));
assert.equal(fixture.ephemeris, 'DE441');
assert.equal(fixture.centerBody, 'Earth (399)');
assert.equal(fixture.observerCenter, '500@399');
assert.equal(fixture.quantity, 31);
assert.equal(fixture.interval.start, '1800-01-01');
assert.equal(fixture.interval.stop, '2400-01-01');

const planets = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];
const provider = await createModernMoshierReference();
const result = {
  pass: true,
  gate: 'MODERN_DRIK_BIJA_TRUE_ANNUAL_DE441_TIME_BLOCKED_0_05',
  modelVersion: '0.1.0-research',
  strictLimitDegrees: MODERN_DRIK_BIJA_LIMIT_DEGREES,
  source: 'Swiss Ephemeris 2.10.03 explicit MOSEPH flag 4',
  reference: 'NASA/JPL Horizons DE441 Earth-geocentric apparent quantity 31',
  frame: 'Geocentric apparent tropical ecliptic-of-date; no ayanamsa subtraction',
  fitWindow: '1900-01-01..2299-01-01',
  blindHoldoutWindows: ['1800-01-01..1899-01-01', '2300-01-01..2399-01-01'],
  totalAnnualSamples: 0,
  globalMaximumAbsoluteDegrees: 0,
  perPlanet: {},
  productionEligible: false,
  classicalBijaEquivalent: false,
  dailyOrContinuousCertification: false
};

try {
  for (const planet of planets) {
    const referenceRows = fixture.bodies?.[planet]?.rows;
    assert.ok(Array.isArray(referenceRows), planet + ' must have a DE441 row array');
    assert.equal(referenceRows.length, 600, planet + ' must have 600 annual checkpoints');

    const observations = referenceRows.map(row => {
      const calculated = provider.apparentTropicalLongitude(row.year, planet);
      return {
        year: row.year,
        candidateLongitude: calculated.longitude,
        referenceLongitude: row.longitude
      };
    });

    const coefficients = fitModernDrikBijaCoefficients({ planet, observations });
    assert.equal(coefficients.training.sampleCount, 400);
    assert.equal(coefficients.training.firstYear, MODERN_DRIK_BIJA_TRAINING.firstYear);
    assert.equal(coefficients.training.lastYear, MODERN_DRIK_BIJA_TRAINING.lastYear);

    const evaluated = observations.map(row => {
      const output = applyModernDrikBijaCorrection({
        year: row.year,
        apparentLongitude: row.candidateLongitude,
        coefficients
      });
      return {
        year: row.year,
        rawResidual: signedResidualDegrees(row.candidateLongitude, row.referenceLongitude),
        correctedResidual: signedResidualDegrees(output.trueLongitude, row.referenceLongitude),
        correction: output.bijaCorrectionDegrees
      };
    });

    const summarize = rows => {
      const residuals = rows.map(row => row.correctedResidual);
      const absolute = residuals.map(Math.abs).sort((a, b) => a - b);
      const rms = Math.sqrt(residuals.reduce((sum, value) => sum + value * value, 0) / residuals.length);
      return {
        samples: rows.length,
        rmsDegrees: +rms.toFixed(9),
        p95AbsoluteDegrees: +absolute[Math.ceil(absolute.length * 0.95) - 1].toFixed(9),
        maxAbsoluteDegrees: +absolute.at(-1).toFixed(9)
      };
    };
    const summarizeRaw = rows => {
      const absolute = rows.map(row => Math.abs(row.rawResidual)).sort((a, b) => a - b);
      return {
        rmsDegrees: +Math.sqrt(rows.reduce((sum, row) => sum + row.rawResidual * row.rawResidual, 0) / rows.length).toFixed(9),
        maxAbsoluteDegrees: +absolute.at(-1).toFixed(9)
      };
    };

    const trainingRows = evaluated.filter(row =>
      row.year >= MODERN_DRIK_BIJA_TRAINING.firstYear &&
      row.year <= MODERN_DRIK_BIJA_TRAINING.lastYear
    );
    const holdoutRows = evaluated.filter(row =>
      row.year < 1900 || row.year > 2299
    );
    assert.equal(trainingRows.length, 400, planet + ' training rows');
    assert.equal(holdoutRows.length, 200, planet + ' blind holdout rows');

    const all = summarize(evaluated);
    const holdout = summarize(holdoutRows);
    const training = summarize(trainingRows);
    const rawAll = summarizeRaw(evaluated);
    const maxCorrection = Math.max(...evaluated.map(row => Math.abs(row.correction)));

    assert.ok(all.maxAbsoluteDegrees <= MODERN_DRIK_BIJA_LIMIT_DEGREES,
      planet + ' full-grid Modern Dṛk-Bīja residual ' + all.maxAbsoluteDegrees +
      '° exceeds strict ' + MODERN_DRIK_BIJA_LIMIT_DEGREES + '°');
    assert.ok(holdout.maxAbsoluteDegrees <= MODERN_DRIK_BIJA_LIMIT_DEGREES,
      planet + ' blind-holdout residual ' + holdout.maxAbsoluteDegrees +
      '° exceeds strict ' + MODERN_DRIK_BIJA_LIMIT_DEGREES + '°');
    assert.ok(training.maxAbsoluteDegrees <= MODERN_DRIK_BIJA_LIMIT_DEGREES,
      planet + ' training residual exceeds strict 0.05°');

    result.totalAnnualSamples += evaluated.length;
    result.globalMaximumAbsoluteDegrees = Math.max(
      result.globalMaximumAbsoluteDegrees, all.maxAbsoluteDegrees
    );
    result.perPlanet[planet] = {
      training: {
        interval: '1900..2299',
        ...training,
        fitRmsResidualDegrees: +coefficients.training.rmsFitResidualDegrees.toFixed(9),
        fitMaximumResidualDegrees: +coefficients.training.maxFitResidualDegrees.toFixed(9)
      },
      blindHoldout: {
        interval: ['1800..1899', '2300..2399'],
        ...holdout
      },
      all600Years: all,
      rawUncorrectedMoshier: rawAll,
      fittedBijaCoefficients: {
        interceptDegreesAt2100: +coefficients.interceptDegreesAt2100.toFixed(12),
        slopeDegreesPerCentury: +coefficients.slopeDegreesPerCentury.toFixed(12)
      },
      maximumAbsoluteAppliedCorrectionDegrees: +maxCorrection.toFixed(12),
      result: 'PASS'
    };
  }

  assert.equal(result.totalAnnualSamples, 3000);
  assert.ok(result.globalMaximumAbsoluteDegrees <= MODERN_DRIK_BIJA_LIMIT_DEGREES);
  console.log(JSON.stringify(result, null, 2));
} finally {
  provider.close();
}
