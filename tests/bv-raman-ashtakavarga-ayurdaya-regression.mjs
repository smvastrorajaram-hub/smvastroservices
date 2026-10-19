import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  BV_RAMAN_AYURDAYA_PLANETS,
  BV_RAMAN_RASI_GUNAKARA,
  BV_RAMAN_GRAHA_GUNAKARA,
  BV_RAMAN_METHOD_B_SECONDARY_EXAMPLE,
  BV_RAMAN_HPA_CHAPTER_XXVI_ORACLE,
  BV_RAMAN_HPA_STANDARD_HOROSCOPE_ASHTAKAVARGA_ORACLE,
  BV_RAMAN_STANDARD_HOROSCOPE_REDUCTION_ORACLE,
  bvRamanTrikonaShodhana,
  bvRamanEkadhipatyaShodhana,
  bvRamanAshtakavargaShodhana,
  bvRamanAshtakavargaMethodAFromReducedRows,
  bvRamanAshtakavargaMethodB
} from '../public/horoscope/offline/bv-raman-ashtakavarga-ayurdaya.browser.mjs';

let assertions = 0;
function same(actual, expected, label) {
  assert.deepEqual(actual, expected, label);
  assertions++;
}
function near(actual, expected, epsilon, label) {
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= epsilon,
    label + ': expected ' + expected + ', got ' + actual);
  assertions++;
}
function ok(value, label) {
  assert.ok(value, label);
  assertions++;
}
function throws(fn, pattern, label) {
  assert.throws(fn, pattern, label);
  assertions++;
}

same(BV_RAMAN_AYURDAYA_PLANETS,
  ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'],
  'seven classical grahas use explicit stable keys');
same(BV_RAMAN_RASI_GUNAKARA,
  [7, 10, 8, 4, 10, 5, 7, 8, 9, 5, 11, 12],
  'Raman secondary-transcription rasi gunakara row stays independent of BPHS');
same(BV_RAMAN_GRAHA_GUNAKARA,
  { Sun: 5, Moon: 5, Mars: 8, Mercury: 5, Jupiter: 10, Venus: 7, Saturn: 5 },
  'graha gunakara factors are explicit');

// Shodhana's research trace tests exercise every encoded Trikona branch.
const trineInput = Array(12).fill(1);
Object.assign(trineInput, { 0: 2, 4: 5, 8: 7, 1: 0, 5: 4, 9: 2, 2: 0, 6: 0, 10: 3 });
const trine = bvRamanTrikonaShodhana(trineInput);
same([trine.values[0], trine.values[4], trine.values[8]], [0, 3, 5],
  'unequal all-positive trine subtracts the minimum');
same([trine.values[1], trine.values[5], trine.values[9]], [0, 4, 2],
  'one-zero trine stays unchanged');
same([trine.values[2], trine.values[6], trine.values[10]], [0, 0, 0],
  'two-zero trine zeroes its remaining member');
same([trine.values[3], trine.values[7], trine.values[11]], [0, 0, 0],
  'equal positive trine zeroes all members');
ok(trine.certified === false, 'Trikona research result is not certified');

// Exact Trikona examples transcribed from B. V. Raman, Hindu Predictive
// Astrology, Ch. XXVI, pp. 186–189. These verify arithmetic edge cases, not
// the still-unseen ASOP book pages.
for (const sample of [
  { input: [5, 3, 3], expected: [2, 0, 0], label: '5,3,3 -> 2,0,0' },
  { input: [5, 2, 5], expected: [3, 0, 3], label: '5,2,5 -> 3,0,3' },
  { input: [1, 1, 3], expected: [0, 0, 2], label: '1,1,3 -> 0,0,2' },
  { input: [0, 4, 2], expected: [0, 4, 2], label: 'one zero leaves trine unchanged' },
  { input: [0, 0, 3], expected: [0, 0, 0], label: 'two zeros eliminate third member' },
  { input: [4, 4, 4], expected: [0, 0, 0], label: 'equal positive trine is eliminated' }
]) {
  const row = Array(12).fill(0);
  row[0] = sample.input[0];
  row[4] = sample.input[1];
  row[8] = sample.input[2];
  const result = bvRamanTrikonaShodhana(row);
  same([result.values[0], result.values[4], result.values[8]], sample.expected,
    'HPA Ch. XXVI Trikona example ' + sample.label);
}

// Test separate Ekadhipatya cases without relying on an astronomical chart.
const ownedInput = Array(12).fill(1);
Object.assign(ownedInput, { 0: 2, 7: 5, 1: 4, 6: 2, 2: 3, 5: 7, 8: 4, 11: 4, 9: 5, 10: 2 });
const ekadhipatya = bvRamanEkadhipatyaShodhana(ownedInput, [0, 2, 5, 10]);
same([ekadhipatya.values[0], ekadhipatya.values[7]], [2, 2],
  'one occupied owned sign adjusts higher empty sign to occupied count');
same([ekadhipatya.values[1], ekadhipatya.values[6]], [2, 2],
  'both empty unequal owned signs reduce to lower count');
same([ekadhipatya.values[2], ekadhipatya.values[5]], [3, 7],
  'both occupied owned signs are unchanged');
same([ekadhipatya.values[8], ekadhipatya.values[11]], [0, 0],
  'both empty equal owned signs become zero');
same([ekadhipatya.values[9], ekadhipatya.values[10]], [2, 2],
  'one occupied pair uses occupied-sign count, not subtraction');
ok(ekadhipatya.certified === false, 'Ekadhipatya research result is not certified');

const bavRows = Object.fromEntries(BV_RAMAN_AYURDAYA_PLANETS.map(planet =>
  [planet, Array(12).fill(1)]
));
const planetSigns = Object.fromEntries(BV_RAMAN_AYURDAYA_PLANETS.map(planet => [planet, 0]));
const shodhana = bvRamanAshtakavargaShodhana({
  bavRows,
  occupiedSigns: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
});
same(Object.keys(shodhana.afterReductionRows).sort(), [...BV_RAMAN_AYURDAYA_PLANETS].sort(),
  'Shodhana output retains all seven graha rows');
ok(shodhana.afterReductionSarvashtakavarga.every(value =>
  Number.isSafeInteger(value) && value >= 0 && value <= 56),
  'reduced SAV values are integer sums within the seven-graha theoretical bound');
ok(shodhana.certified === false, 'combined Shodhana remains research-only');

// Seven-graha Standard Horoscope oracle: test every BAV cell before and
// after Trikona + Ekadhipatya, not merely a repeated synthetic row.
const standardOracle = BV_RAMAN_STANDARD_HOROSCOPE_REDUCTION_ORACLE;
const standardShodhana = bvRamanAshtakavargaShodhana({
  bavRows: standardOracle.beforeReductionRows,
  occupiedSigns: standardOracle.occupiedSigns
});
ok(standardShodhana.source.includes('Chapter II'),
  'Trikona/Ekadhipatya audit explicitly cites the Chapter II table source track');
ok(!standardShodhana.source.includes('Chapter XIV'),
  'Shodhana source is not mislabeled as the Ayurdaya chapter');

same(
  Object.fromEntries(BV_RAMAN_AYURDAYA_PLANETS.map(planet =>
    [planet, standardShodhana.afterReductionRows[planet]])),
  standardOracle.afterReductionRows,
  'all seven standard-horoscope BAV rows match the two-reduction table oracle cell by cell'
);
same(standardShodhana.afterReductionSarvashtakavarga,
  [...standardOracle.afterReductionSarvashtakavarga],
  'per-sign reduced SAV sums match the standard-horoscope table');
same(standardOracle.afterReductionSarvashtakavarga.reduce((sum, n) => sum + n, 0),
  standardOracle.afterSavTotal,
  'reduced SAV aggregate is 82');
same(Object.fromEntries(BV_RAMAN_AYURDAYA_PLANETS.map(planet =>
  [planet, standardOracle.beforeReductionRows[planet].reduce((sum, n) => sum + n, 0)])),
  {Sun:48, Moon:49, Mars:39, Mercury:54, Jupiter:56, Venus:52, Saturn:39},
  'seven Standard Horoscope BAV source-row totals match 48/49/39/54/56/52/39');
const standardMethodAAll = bvRamanAshtakavargaMethodAFromReducedRows({
  afterReductionRows: standardShodhana.afterReductionRows,
  planetSigns: standardOracle.planetSigns
});
const standardPindaOracle = {
  Sun: {rasiPinda:96, grahaPinda:86, sodyaPinda:182},
  Moon: {rasiPinda:80, grahaPinda:20, sodyaPinda:100},
  Mars: {rasiPinda:126, grahaPinda:71, sodyaPinda:197},
  Mercury: {rasiPinda:97, grahaPinda:61, sodyaPinda:158},
  Jupiter: {rasiPinda:79, grahaPinda:45, sodyaPinda:124},
  Venus: {rasiPinda:61, grahaPinda:5, sodyaPinda:66},
  Saturn: {rasiPinda:108, grahaPinda:62, sodyaPinda:170}
};
for (const subject of BV_RAMAN_AYURDAYA_PLANETS) {
  const row = standardShodhana.afterReductionRows[subject];
  same(standardMethodAAll.planets[subject].rasiProducts,
    row.map((bindu, sign) => bindu * BV_RAMAN_RASI_GUNAKARA[sign]),
    'Standard Horoscope ' + subject + ' all 12 Rasi Pinda products');
  same(standardMethodAAll.planets[subject].grahaProducts,
    BV_RAMAN_AYURDAYA_PLANETS.map(planet => ({
      planet,
      sign: standardOracle.planetSigns[planet],
      bindus: row[standardOracle.planetSigns[planet]],
      multiplier: BV_RAMAN_GRAHA_GUNAKARA[planet],
      product: row[standardOracle.planetSigns[planet]] * BV_RAMAN_GRAHA_GUNAKARA[planet]
    })),
    'Standard Horoscope ' + subject + ' all 7 Graha Pinda products');
  same({
    rasiPinda: standardMethodAAll.planets[subject].rasiPinda,
    grahaPinda: standardMethodAAll.planets[subject].grahaPinda,
    sodyaPinda: standardMethodAAll.planets[subject].sodyaPinda
  }, standardPindaOracle[subject],
  'Standard Horoscope ' + subject + ' Rasi/Graha/Sodhya Pinda multiplication and sum');
}

const methodA = bvRamanAshtakavargaMethodAFromReducedRows({
  afterReductionRows: bavRows,
  planetSigns
});
same(methodA.planets.Sun.rasiPinda, 96, 'Method A sign-product sum');
same(methodA.planets.Sun.grahaPinda, 45, 'Method A graha-product sum');
same(methodA.planets.Sun.sodyaPinda, 141, 'Method A Sodya Pinda adds Rasi and Graha Pinda');
same(methodA.netTotalLunarYears, null, 'Method A refuses unsupported net-year total');
same(methodA.finalSolarYears, null, 'Method A refuses unsupported final solar-year total');
same(methodA.finalLifespan, null, 'Method A does not emit final lifespan');
same(methodA.customerDisplayAllowed, false, 'Method A must not appear in customer UI');
ok(methodA.source.includes('Chapter XIV'),
  'Ayurdaya Method A explicitly cites Chapter XIV, separate from Chapter II Shodhana');

ok(methodA.certified === false, 'Method A not marked certified');

// Primary-source table audit: HPA printed p. 190, separate from the ASOP
// secondary-transcription oracle above. Pin all 84 B.R./A.R. cells, row
// totals, sign totals, and printed 337 / 81 aggregates independently.
const hpaStandardTable = BV_RAMAN_HPA_STANDARD_HOROSCOPE_ASHTAKAVARGA_ORACLE;
same(hpaStandardTable.evidenceGrade, 'PRIMARY_PAGE_IMAGE_VISUALLY_CHECKED',
  'HPA p. 190 table has a distinct primary-page evidence grade');
same(hpaStandardTable.signs,
  ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
   'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'],
  'HPA p. 190 uses Aries-to-Pisces sign order');
const hpaPrintedBeforeRows = {
  Sun: [5, 5, 3, 6, 3, 2, 3, 3, 3, 5, 5, 5],
  Moon: [4, 6, 4, 3, 2, 4, 6, 5, 5, 2, 5, 3],
  Mars: [3, 3, 3, 3, 3, 3, 3, 4, 4, 3, 3, 4],
  Mercury: [4, 5, 7, 2, 5, 4, 4, 5, 6, 2, 4, 6],
  Jupiter: [4, 6, 6, 3, 5, 7, 3, 5, 4, 5, 4, 4],
  Venus: [5, 4, 7, 4, 4, 5, 4, 1, 6, 4, 3, 5],
  Saturn: [4, 4, 3, 7, 1, 2, 5, 1, 2, 4, 2, 4]
};
const hpaPrintedAfterRows = {
  Sun: [2, 3, 0, 3, 0, 0, 0, 0, 0, 2, 2, 2],
  Moon: [0, 4, 0, 0, 0, 2, 0, 2, 3, 0, 1, 0],
  Mars: [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
  Mercury: [0, 3, 2, 0, 1, 2, 0, 3, 2, 0, 0, 2],
  Jupiter: [0, 1, 2, 0, 1, 2, 0, 2, 0, 0, 1, 1],
  Venus: [1, 0, 1, 3, 0, 1, 1, 0, 2, 0, 0, 2],
  Saturn: [3, 2, 1, 6, 0, 0, 2, 0, 1, 2, 0, 1]
};
same(hpaStandardTable.beforeReductionRows, hpaPrintedBeforeRows,
  'all 84 HPA before-reduction cells match the printed p. 190 table');
same(hpaStandardTable.afterReductionRows, hpaPrintedAfterRows,
  'all 84 HPA after-reduction cells match the printed p. 190 table');
same(hpaStandardTable.printedBeforeReductionRowTotals,
  {Sun:48, Moon:49, Mars:39, Mercury:54, Jupiter:56, Venus:52, Saturn:39},
  'HPA p. 190 printed before-reduction totals are pinned');
same(hpaStandardTable.printedAfterReductionRowTotals,
  {Sun:14, Moon:12, Mars:1, Mercury:15, Jupiter:10, Venus:11, Saturn:18},
  'HPA p. 190 printed after-reduction totals are pinned');
for (const planet of BV_RAMAN_AYURDAYA_PLANETS) {
  same(hpaStandardTable.beforeReductionRows[planet].reduce((sum, n) => sum + n, 0),
    hpaStandardTable.printedBeforeReductionRowTotals[planet],
    'HPA p. 190 ' + planet + ' before-reduction row sum');
  same(hpaStandardTable.afterReductionRows[planet].reduce((sum, n) => sum + n, 0),
    hpaStandardTable.printedAfterReductionRowTotals[planet],
    'HPA p. 190 ' + planet + ' after-reduction row sum');
}
same(hpaStandardTable.beforeReductionRows[ 'Sun' ].reduce((sum, n) => sum + n, 0) +
  hpaStandardTable.beforeReductionRows.Moon.reduce((sum, n) => sum + n, 0) +
  hpaStandardTable.beforeReductionRows.Mars.reduce((sum, n) => sum + n, 0) +
  hpaStandardTable.beforeReductionRows.Mercury.reduce((sum, n) => sum + n, 0) +
  hpaStandardTable.beforeReductionRows.Jupiter.reduce((sum, n) => sum + n, 0) +
  hpaStandardTable.beforeReductionRows.Venus.reduce((sum, n) => sum + n, 0) +
  hpaStandardTable.beforeReductionRows.Saturn.reduce((sum, n) => sum + n, 0),
  hpaStandardTable.printedBeforeReductionSarvashtakavargaTotal,
  'HPA p. 190 seven-graha before-reduction total is 337');
same(hpaStandardTable.afterReductionRows.Sun.reduce((sum, n) => sum + n, 0) +
  hpaStandardTable.afterReductionRows.Moon.reduce((sum, n) => sum + n, 0) +
  hpaStandardTable.afterReductionRows.Mars.reduce((sum, n) => sum + n, 0) +
  hpaStandardTable.afterReductionRows.Mercury.reduce((sum, n) => sum + n, 0) +
  hpaStandardTable.afterReductionRows.Jupiter.reduce((sum, n) => sum + n, 0) +
  hpaStandardTable.afterReductionRows.Venus.reduce((sum, n) => sum + n, 0) +
  hpaStandardTable.afterReductionRows.Saturn.reduce((sum, n) => sum + n, 0),
  hpaStandardTable.printedAfterReductionSarvashtakavargaTotal,
  'HPA p. 190 seven-graha after-reduction total is 81');
same(hpaStandardTable.beforeReductionRows,
  hpaPrintedBeforeRows,
  'HPA primary table remains a separate source fixture from ASOP transcription');
ok(!hpaStandardTable.source.includes('Ashtakavarga System of Prediction'),
  'HPA primary table is not mislabeled as the separate ASOP book');
ok(standardOracle.source.includes('Ashtakavarga System of Prediction'),
  'ASOP Chapter II oracle keeps its own source provenance');

// Re-run both reduction stages against HPA p. 190. The occupancy facts
// are transcribed from the explanation on printed p. 188: Taurus is occupied,
// Scorpio is occupied; Aries, Libra, Gemini, Virgo, Sagittarius, Pisces,
// Capricorn and Aquarius are unoccupied (Rahu/Ketu are explicitly set aside).
// Sign indices: Taurus=1, Scorpio=7. This tests method output against primary
// printed A.R. rows, not just the self-contained table fixture.
const hpaStandardCalculatedReduction = bvRamanAshtakavargaShodhana({
  bavRows: hpaStandardTable.beforeReductionRows,
  occupiedSigns: [1, 7]
});
same(hpaStandardCalculatedReduction.afterReductionRows,
  hpaStandardTable.afterReductionRows,
  'HPA p. 188 occupancy + Trikona/Ekadhipatya reproduces all 84 printed p. 190 A.R. cells');
same(hpaStandardCalculatedReduction.afterReductionSarvashtakavarga,
  hpaStandardTable.printedAfterReductionBySign,
  'HPA p. 190 calculated A.R. per-sign SAV totals match 6/13/6/12/2/7/3/8/8/4/4/8');
same(hpaStandardCalculatedReduction.afterReductionSarvashtakavargaTotal, 81,
  "HPA p. 190 reduction engine matches the source's 81 total for this edition/example");
ok(hpaStandardCalculatedReduction.certified === false,
  'primary worked-table regression does not by itself certify the full Ayurdaya method');

// Standard Horoscope Sun row transcribed from the worked example's
// after-reduction chart; independent of the synthetic arithmetic fixture.
const standardSunReduced = [0, 3, 2, 0, 0, 4, 0, 1, 0, 0, 2, 0];
const standardSigns = {
  Sun: 5, Moon: 10, Mars: 7, Mercury: 6, Jupiter: 2, Venus: 5, Saturn: 4
};
const standardRows = Object.fromEntries(BV_RAMAN_AYURDAYA_PLANETS.map(
  planet => [planet, [...standardSunReduced]]
));
const standardMethodA = bvRamanAshtakavargaMethodAFromReducedRows({
  afterReductionRows: standardRows,
  planetSigns: standardSigns
});
same(standardMethodA.planets.Sun.rasiPinda, 96,
  'Standard Horoscope Sun Rasi Pinda independently matches worked example');
same(standardMethodA.planets.Sun.grahaPinda, 86,
  'Standard Horoscope Sun Graha Pinda independently matches worked example');
same(standardMethodA.planets.Sun.sodyaPinda, 182,
  'Standard Horoscope Sun Sodya Pinda independently matches worked example');
near(standardMethodA.planets.Sun.grossLunarYearsModulo27, 20.1851851852, 1e-8,
  'Standard Horoscope Sun gross years after the 27-year reduction');
same(standardMethodA.finalSolarYears, null,
  'matching Pinda arithmetic does not certify Harana/final solar years');

// A separate worked example from B. V. Raman, Hindu Predictive Astrology,
 // Chapter XXVI, pp. 199–203. Do not conflate this chart with the separate
 // Ashtakavarga System of Prediction Method-A/B secondary-transcription chart.
const hpa = BV_RAMAN_HPA_CHAPTER_XXVI_ORACLE;
const hpaRows = Object.fromEntries(BV_RAMAN_AYURDAYA_PLANETS.map(
  planet => [planet, [...hpa.sunAfterReductionRow]]
));
const hpaMethodA = bvRamanAshtakavargaMethodAFromReducedRows({
  afterReductionRows: hpaRows,
  planetSigns: hpa.planetSigns
});
same(hpaMethodA.planets.Sun.rasiPinda, hpa.reportedRasiPinda.Sun,
  'HPA Ch. XXVI Sun sign-products sum to printed Rasi Pinda 112');
same(hpaMethodA.planets.Sun.grahaPinda, hpa.reportedGrahaPinda.Sun,
  'HPA Ch. XXVI Sun planetary products sum to printed Graha Pinda 45');
same(hpaMethodA.planets.Sun.sodyaPinda, 157,
  'HPA Ch. XXVI Sun Sodhya Pinda is 112 + 45');
near(hpaMethodA.planets.Sun.grossLunarYearsModulo27, 13.7037037037, 1e-9,
  'HPA Ch. XXVI Sun gross lunar years are 157 × 7 / 27 less 27');
near(hpaMethodA.planets.Sun.grossSolarYears334HpaCh26,
  hpaMethodA.planets.Sun.grossLunarYearsModulo27 * 334 / 365, 1e-10,
  'HPA 334/365 conversion is separately retained');
near(hpaMethodA.planets.Sun.grossSolarYears324Secondary,
  hpaMethodA.planets.Sun.grossLunarYearsModulo27 * 324 / 365, 1e-10,
  'secondary ASOP 324/365 conversion is separately retained');

// Recalculate each book-reported HPA gross value from printed Pinda subtotals.
const hpaGrossArithmetic = {};
for (const planet of BV_RAMAN_AYURDAYA_PLANETS) {
  const pinda = hpa.reportedRasiPinda[planet] + hpa.reportedGrahaPinda[planet];
  const unwrapped = pinda * 7 / 27;
  const reduced = ((unwrapped % 27) + 27) % 27;
  hpaGrossArithmetic[planet] = reduced;
  near(reduced, hpa.reportedGrossLunarYears[planet], 0.02,
    'HPA Ch. XXVI ' + planet + ' reported gross years reconcile with Pinda arithmetic');
}
// Formula-first oracle: retain all gross and net terms at full precision;
// effective fractions come from the scan, without guessing the cause of each
// half reduction. Rounded values printed in the book are display evidence only.
const hpaFormulaNetValues = BV_RAMAN_AYURDAYA_PLANETS.map(planet =>
  hpaGrossArithmetic[planet] * hpa.reportedRemainingFraction[planet]
);
near(hpaFormulaNetValues.reduce((sum, value) => sum + value, 0),
  49, 1e-10,
  'HPA Ch. XXVI exact Pinda terms with the scanned effective half-rule sum to 49.00 lunar years');
const hpaSolarFromFormulaNet =
  hpaFormulaNetValues.reduce((sum, value) => sum + value, 0) *
  hpa.reportedLunarToSolarNumerator / hpa.reportedLunarToSolarDenominator;
near(hpaSolarFromFormulaNet, 44.83835616438356, 1e-10,
  'HPA Ch. XXVI full-precision 49.00 lunar years convert to 44.838356... solar years');
same(Math.round((hpaSolarFromFormulaNet + Number.EPSILON) * 100) / 100, 44.84,
  'HPA Ch. XXVI final display rounds formula-derived solar years to 44.84');
const hpaSolarFromPrintedNet =
  hpa.reportedNetLunarYears * hpa.reportedLunarToSolarNumerator /
  hpa.reportedLunarToSolarDenominator;
near(hpaSolarFromPrintedNet, 44.82005479452055, 1e-10,
  'converting printed 48.98 alone yields 44.82, not the printed 44.87');
ok(Math.abs(hpaSolarFromPrintedNet - hpa.reportedFinalSolarYears) > 0.04,
  'HPA Ch. XXVI printed 44.87 remains logged as a source arithmetic discrepancy');

// Secondary Method-A guide arithmetic audit. These are explicitly not the
// missing primary ASOP pages and must not be converted into a false oracle.
const secondaryMethodASamples = [
  { planet: 'Sun', rasi: 96, graha: 86, reported: 20.20 },
  { planet: 'Moon', rasi: 80, graha: 20, reported: 26.00 },
  { planet: 'Mars', rasi: 126, graha: 71, reported: 24.00 },
  { planet: 'Mercury', rasi: 97, graha: 61, reported: 14.00 },
  { planet: 'Jupiter', rasi: 79, graha: 45, reported: 5.00 },
  { planet: 'Venus', rasi: 66, graha: 0, reported: 15.80 },
  { planet: 'Saturn', rasi: 170, graha: 42, reported: 12.00 }
];
const secondaryMethodADiscrepancies = [];
for (const item of secondaryMethodASamples) {
  const modulo = ((((item.rasi + item.graha) * 7 / 27) % 27) + 27) % 27;
  if (Math.abs(modulo - item.reported) > 0.1) {
    secondaryMethodADiscrepancies.push({
      planet: item.planet,
      calculated: Number(modulo.toFixed(4)),
      reported: item.reported,
      difference: Number(Math.abs(modulo - item.reported).toFixed(4))
    });
  }
}
same(secondaryMethodADiscrepancies.map(item => item.planet),
  ['Jupiter', 'Venus', 'Saturn'],
  'secondary Method-A published gross-year values contain three discrepancies above 0.1 year');
near(secondaryMethodADiscrepancies[0].difference, 0.1481, 0.0001,
  'Method-A Jupiter arithmetic discrepancy is recorded, not patched over');
near(secondaryMethodADiscrepancies[1].difference, 1.3111, 0.0001,
  'Method-A Venus arithmetic discrepancy is recorded, not patched over');
near(secondaryMethodADiscrepancies[2].difference, 11.0370, 0.0001,
  'Method-A Saturn arithmetic discrepancy is recorded, not patched over');
near((((197 * 7 / 27) % 27) + 27) % 27, 24.0740740741, 1e-9,
  'Method-A Mars recalculated gross years are 24.0741, a 0.0741 difference within comparison tolerance');

const fixture = BV_RAMAN_METHOD_B_SECONDARY_EXAMPLE;
const methodB = bvRamanAshtakavargaMethodB({
  reducedSarvashtakavarga: fixture.reducedSarvashtakavarga,
  planetSigns: fixture.planetSigns
});
same(methodB.reducedSarvashtakavarga[5], 10,
  'Method B accepts a reduced SAV total greater than the single-BAV maximum of eight');
same(methodB.rasiPinda, fixture.reportedRasiPinda,
  'secondary Method B example Rasi Pinda arithmetic');
same(methodB.grahaPinda, fixture.reportedGrahaPinda,
  'secondary Method B example Graha Pinda arithmetic');
same(methodB.sodyaPinda, fixture.reportedSodyaPinda,
  'secondary Method B example Sodya Pinda total');
near(methodB.lunarYearsUnadjusted, 412 * 7 / 27, 1e-10,
  'Method B unadjusted lunar-year quotient');
near(methodB.solarYearsWithout100Subtraction, 94.8, 0.1,
  'Method B no-subtraction branch reproduces secondary source rounding');
near(methodB.solarYearsAfter100Subtraction, (412 * 7 / 27 - 100) * 324 / 365, 1e-10,
  'Method B records alternate 100-year subtraction branch');
same(methodB.finalSolarYears, null, 'Method B does not silently choose either disputed branch');
same(methodB.finalLifespan, null, 'Method B does not emit final lifespan');
same(methodB.customerDisplayAllowed, false, 'Method B must not appear in customer UI');
ok(methodB.certified === false, 'Method B is not certified');
same(fixture.evidenceGrade, 'SECONDARY_TRANSCRIPTION_ONLY',
  'fixture provenance remains secondary, never a book-certified oracle');
same(fixture.primaryBookPagesVerified, false,
  'primary printed-page verification gap remains explicit');

throws(() => bvRamanAshtakavargaShodhana({ bavRows: {}, occupiedSigns: [] }),
  /Missing BAV row/, 'missing graha rows rejected');
throws(() => bvRamanAshtakavargaMethodAFromReducedRows({
  afterReductionRows: { Sun: Array(12).fill(1) }, planetSigns
}), /Missing BAV row/, 'Method A missing rows rejected');
throws(() => bvRamanAshtakavargaMethodB({
  reducedSarvashtakavarga: Array(11).fill(1), planetSigns
}), /Reduced Sarvashtakavarga/, 'Method B malformed SAV rejected');

const src = fs.readFileSync(
  new URL('../public/horoscope/offline/bv-raman-ashtakavarga-ayurdaya.browser.mjs', import.meta.url),
  'utf8'
);
ok(!/import\s+[^;]*cg-rajan/i.test(src),
  'Raman Ayurdaya module does not import C.G. Rajan methods');
ok(!/import\s+[^;]*classical-shodhana/i.test(src),
  'Raman Ayurdaya module does not alias BPHS Shodhana helpers');
ok(!/export\s+function\s+.*(?:deathAge|predictedDeathAge)/i.test(src),
  'module exposes no death-age/date predictor');

console.log(JSON.stringify({
  pass: true,
  assertions,
  module: 'B.V. Raman Ashtakavarga Ayurdaya research engine',
  sourceStatus: 'ASOP_PRIMARY_PAGES_PENDING_HPA_PRIMARY_SCAN_FORMULA_DISCREPANCY_RECORDED',
  hpaSolarYearDiscrepancy: {
    reported: hpa.reportedFinalSolarYears,
    recalculatedFromPrintedNet: Number(hpaSolarFromPrintedNet.toFixed(4)),
    formulaDerivedNetLunarYears: 49,
    formulaDerivedSolarYears: 44.84
  },
  secondaryMethodADiscrepancies,
  certification: false,
  customerReportIntegration: false,
  finalLifespanEmitted: false
}, null, 2));
