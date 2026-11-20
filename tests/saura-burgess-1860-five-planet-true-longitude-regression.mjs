/**
 * Historical source-conformance regression for the existing five-planet
 * Sūrya-Siddhānta four-pass True Longitude engine.
 *
 * Independent printed oracle:
 * E. Burgess, Translation of the Sūrya-Siddhānta (1860), printed pp. 214–216:
 * first Śīghra table; second/third Manda tables; fourth/final True table.
 *
 * This uses the exact worked-example inputs printed by Burgess. It does not
 * call DE441, modern Swiss positions, annual interpolation, or a fitted model.
 * It does NOT certify arbitrary natal dates, long-span Bīja evolution, or
 * BPHS Cheshta / full Shadbala.
 */
import assert from 'node:assert/strict';
import {
  sauraFourPassTrueLongitude as continuous
} from '../public/horoscope/offline/saura-classical-true-longitude.browser.mjs';
import {
  sauraTabularFourPassTrueLongitude as tabular
} from '../public/horoscope/offline/saura-classical-tabular-jya.browser.mjs';

const sexagesimal = (sign, degree, minute = 0, second = 0) =>
  sign * 30 + degree + minute / 60 + second / 3600;
const signedDifference = (actual, expected) =>
  ((actual - expected + 540) % 360) - 180;
const close = (actual, expected, tolerance, label) => {
  assert.ok(Number.isFinite(actual), label + ': actual must be finite');
  const error = signedDifference(actual, expected);
  assert.ok(Math.abs(error) <= tolerance,
    label + ': actual=' + actual + ', expected=' + expected +
    ', signed error=' + error + '°, tolerance=' + tolerance + '°');
  return error;
};

// Burgess's table notation is signs / degrees / minutes / seconds.
// The Mercury apsis is printed only to the nearest minute (7s 10°28′).
const source = Object.freeze({
  Mercury: {
    mean: sexagesimal(8, 18, 13, 13),
    mandocca: sexagesimal(7, 10, 28),
    sheeghrocca: sexagesimal(4, 16, 57, 22),
    true: sexagesimal(7, 24, 51),
    stages: [
      -(21 + 12 / 60), -(2 + 7 / 60), -(2 + 2 / 60), -(21 + 20 / 60)
    ]
  },
  Venus: {
    mean: sexagesimal(8, 18, 13, 13),
    mandocca: sexagesimal(2, 19, 52, 17),
    sheeghrocca: sexagesimal(10, 21, 49, 47),
    true: sexagesimal(9, 14, 35),
    stages: [
      26 + 7 / 60, 22 / 60, 23 / 60, 25 + 59 / 60
    ]
  },
  Mars: {
    mean: sexagesimal(5, 24, 30, 57),
    mandocca: sexagesimal(4, 10, 2, 40),
    sheeghrocca: sexagesimal(8, 18, 13, 13),
    true: sexagesimal(6, 18, 45),
    stages: [
      31 + 1 / 60, -(10 + 2 / 60), -(9 + 30 / 60), 33 + 44 / 60
    ]
  },
  Jupiter: {
    mean: sexagesimal(2, 26, 2, 14),
    mandocca: sexagesimal(5, 21, 22, 19),
    sheeghrocca: sexagesimal(8, 18, 13, 13),
    true: sexagesimal(3, 4, 11),
    stages: [
      1 + 53 / 60, 5 + 5 / 60, 5 + 4 / 60, 3 + 5 / 60
    ]
  },
  Saturn: {
    mean: sexagesimal(3, 20, 12, 3),
    mandocca: sexagesimal(7, 26, 37, 34),
    sheeghrocca: sexagesimal(8, 18, 13, 13),
    true: sexagesimal(4, 1, 2),
    stages: [
      3 + 40 / 60, 6 + 20 / 60, 6 + 33 / 60, 4 + 17 / 60
    ]
  }
});

const planetRows = [];
const stageResiduals = [[], [], [], []];
const finalResiduals = { continuous: [], tabular: [] };
const internalResiduals = [];
for (const [planet, row] of Object.entries(source)) {
  const input = {
    planet,
    meanLongitude: row.mean,
    mandocca: row.mandocca,
    sheeghrocha: row.sheeghrocca,
    // Sūrya-Siddhānta II.39 uses the direct Manda bhujajya arc.
    mandaKarṇaConvention: 'verse39-direct-jya'
  };
  const exact = continuous(input);
  const printedJya = tabular(input);

  assert.equal(exact.planet, planet, planet + ' continuous model identity');
  assert.equal(printedJya.planet, planet, planet + ' printed-Jya model identity');
  assert.equal(exact.mandaKarṇaConvention, 'verse39-direct-jya');
  assert.equal(printedJya.mandaKarṇaConvention, 'verse39-direct-jya');
  assert.equal(exact.historicallyCertified, false,
    planet + ' generic historical certification remains guarded');
  assert.equal(printedJya.historicallyCertified, false,
    planet + ' tabular generic historical certification remains guarded');

  // The API returns half-corrections for the first two stages; double them
  // to compare against Burgess's printed full equation at each stage.
  const exactStages = [
    2 * exact.stages.halfSighraDegrees,
    2 * exact.stages.halfMandaDegrees,
    exact.stages.fullMandaDegrees,
    exact.stages.fullSighraDegrees
  ];
  const jyaStages = [
    2 * printedJya.stages.halfSighraDegrees,
    2 * printedJya.stages.halfMandaDegrees,
    printedJya.stages.fullMandaDegrees,
    printedJya.stages.fullSighraDegrees
  ];
  const exactStageErrors = exactStages.map((value, i) =>
    signedDifference(value, row.stages[i]));
  const jyaStageErrors = jyaStages.map((value, i) =>
    signedDifference(value, row.stages[i]));

  // Burgess's first-stage worked figures contain a visible Mars discrepancy
  // (~0.124°); keep it bounded and reported rather than silently tuning it.
  for (let i = 0; i < 4; i++) {
    const tolerance = i === 0 ? 0.15 : 0.03;
    close(exactStages[i], row.stages[i], tolerance,
      planet + ' continuous printed stage ' + (i + 1));
    close(jyaStages[i], row.stages[i], tolerance,
      planet + ' 24-Jya printed stage ' + (i + 1));
    stageResiduals[i].push(
      exactStageErrors[i], jyaStageErrors[i]
    );
  }
  if (planet !== 'Mars') {
    assert.ok(Math.abs(exactStageErrors[0]) < 0.03,
      planet + ' continuous first Śīghra within 0.03°');
    assert.ok(Math.abs(jyaStageErrors[0]) < 0.03,
      planet + ' tabular first Śīghra within 0.03°');
  } else {
    assert.ok(Math.abs(exactStageErrors[0]) > 0.10 &&
      Math.abs(exactStageErrors[0]) < 0.15,
    'Mars first-stage discrepancy remains visible in continuous path');
    assert.ok(Math.abs(jyaStageErrors[0]) > 0.10 &&
      Math.abs(jyaStageErrors[0]) < 0.15,
    'Mars first-stage discrepancy remains visible in 24-Jya path');
  }

  const exactFinalError = close(
    exact.trueLongitude, row.true, 0.03, planet + ' continuous final True Longitude'
  );
  const jyaFinalError = close(
    printedJya.trueLongitude, row.true, 0.03, planet + ' 24-Jya final True Longitude'
  );
  const internalError = close(
    printedJya.trueLongitude, exact.trueLongitude, 0.02,
    planet + ' independent continuous versus tabular arithmetic'
  );
  finalResiduals.continuous.push(exactFinalError);
  finalResiduals.tabular.push(jyaFinalError);
  internalResiduals.push(internalError);
  planetRows.push({
    planet,
    meanLongitude: +row.mean.toFixed(9),
    mandocca: +row.mandocca.toFixed(9),
    sheeghrocca: +row.sheeghrocca.toFixed(9),
    burgessTrueLongitude: +row.true.toFixed(9),
    continuousTrueLongitude: +exact.trueLongitude.toFixed(9),
    continuousTrueErrorDegrees: +exactFinalError.toFixed(9),
    tabular24JyaTrueLongitude: +printedJya.trueLongitude.toFixed(9),
    tabularTrueErrorDegrees: +jyaFinalError.toFixed(9),
    continuousStageErrorsDegrees: exactStageErrors.map(x => +x.toFixed(9)),
    tabularStageErrorsDegrees: jyaStageErrors.map(x => +x.toFixed(9)),
    continuousVsTabularDegrees: +internalError.toFixed(9)
  });
}

const maxAbs = values => Math.max(...values.map(Math.abs));
const rms = values =>
  Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / values.length);
const summary = {
  maxAbsContinuousFinalErrorDegrees: +maxAbs(finalResiduals.continuous).toFixed(9),
  rmsContinuousFinalErrorDegrees: +rms(finalResiduals.continuous).toFixed(9),
  maxAbsTabularFinalErrorDegrees: +maxAbs(finalResiduals.tabular).toFixed(9),
  rmsTabularFinalErrorDegrees: +rms(finalResiduals.tabular).toFixed(9),
  maxAbsContinuousVsTabularDegrees: +maxAbs(internalResiduals).toFixed(9),
  maxAbsFirstStageErrorDegrees: +maxAbs(stageResiduals[0]).toFixed(9),
  maxAbsSecondStageErrorDegrees: +maxAbs(stageResiduals[1]).toFixed(9),
  maxAbsThirdStageErrorDegrees: +maxAbs(stageResiduals[2]).toFixed(9),
  maxAbsFourthStageErrorDegrees: +maxAbs(stageResiduals[3]).toFixed(9)
};

assert.equal(planetRows.length, 5, 'five independent Burgess planetary examples');
assert.ok(summary.maxAbsContinuousFinalErrorDegrees < 0.03);
assert.ok(summary.maxAbsTabularFinalErrorDegrees < 0.03);
assert.ok(summary.maxAbsContinuousVsTabularDegrees < 0.02);
assert.ok(summary.maxAbsFirstStageErrorDegrees < 0.15);
assert.ok(summary.maxAbsSecondStageErrorDegrees < 0.03);
assert.ok(summary.maxAbsThirdStageErrorDegrees < 0.03);
assert.ok(summary.maxAbsFourthStageErrorDegrees < 0.03);

console.log(JSON.stringify({
  pass: true,
  source: 'E. Burgess, Translation of the Sūrya-Siddhānta (1860), printed pp. 214–216',
  sourceScope: 'One worked epoch: midnight preceding 1860-01-01 at Washington; inputs as already adjusted and printed by Burgess',
  method: 'Sūrya-Siddhānta II.39 and II.43–45; four-pass Manda/Śīghra',
  sampleCount: 5,
  independentHistoricalWorkedExampleCount: 5,
  modernEphemerisUsed: false,
  fittedCorrectionUsed: false,
  arbitraryNatalHistoricalCertification: false,
  classicalCheshtaCertification: false,
  productionEligible: false,
  summary,
  planets: planetRows
}));
