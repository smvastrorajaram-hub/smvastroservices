import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  BV_RAMAN_AYURDAYA_PLANETS,
  BV_RAMAN_RASI_GUNAKARA,
  BV_RAMAN_GRAHA_GUNAKARA,
  BV_RAMAN_METHOD_B_SECONDARY_EXAMPLE,
  BV_RAMAN_HPA_CHAPTER_XXVI_ORACLE,
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
ok(methodA.certified === false, 'Method A not marked certified');

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
const hpaHaranaValues = BV_RAMAN_AYURDAYA_PLANETS.map(planet =>
  Math.trunc((hpa.reportedGrossLunarYears[planet] *
    hpa.reportedHaranaFactors[planet]) * 100) / 100
);
same(hpaHaranaValues, [13.7, 7.76, 2.33, 0.48, 4, 12.44, 8.27],
  'HPA Ch. XXVI example Harana factors reproduce the displayed per-graha values');
near(hpaHaranaValues.reduce((sum, value) => sum + value, 0),
  hpa.reportedNetLunarYears, 1e-10,
  'HPA Ch. XXVI net 48.98 is the sum of displayed two-decimal Harana values');
const hpaSolarRecalculated =
  hpa.reportedNetLunarYears * hpa.reportedLunarToSolarNumerator /
  hpa.reportedLunarToSolarDenominator;
near(hpaSolarRecalculated, 44.822, 0.002,
  'HPA Ch. XXVI recalculated solar total from 48.98 × 334 / 365');
ok(Math.abs(hpaSolarRecalculated - hpa.reportedFinalSolarYears) > 0.04,
  'HPA Ch. XXVI printed 44.87 remains explicitly inconsistent with its own 334/365 ratio');

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
  ['Mars', 'Jupiter', 'Venus', 'Saturn'],
  'secondary Method-A published gross-year values contain four reproducible arithmetic discrepancies');
near(secondaryMethodADiscrepancies[0].difference, 0.1481, 0.0001,
  'Method-A Mars arithmetic discrepancy is recorded, not patched over');
near(secondaryMethodADiscrepancies[1].difference, 0.1481, 0.0001,
  'Method-A Jupiter arithmetic discrepancy is recorded, not patched over');
near(secondaryMethodADiscrepancies[2].difference, 1.3111, 0.0001,
  'Method-A Venus arithmetic discrepancy is recorded, not patched over');
near(secondaryMethodADiscrepancies[3].difference, 11.0370, 0.0001,
  'Method-A Saturn arithmetic discrepancy is recorded, not patched over');

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
  sourceStatus: 'ASOP_PRIMARY_PAGES_PENDING_HPA_CHAPTER_XXVI_ARITHMETIC_GAPS_PINNED',
  hpaSolarYearDiscrepancy: {
    reported: hpa.reportedFinalSolarYears,
    recalculated: Number(hpaSolarRecalculated.toFixed(4))
  },
  secondaryMethodADiscrepancies,
  certification: false,
  customerReportIntegration: false,
  finalLifespanEmitted: false
}, null, 2));
