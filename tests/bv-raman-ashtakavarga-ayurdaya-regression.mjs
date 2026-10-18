import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  BV_RAMAN_AYURDAYA_PLANETS,
  BV_RAMAN_RASI_GUNAKARA,
  BV_RAMAN_GRAHA_GUNAKARA,
  BV_RAMAN_METHOD_B_SECONDARY_EXAMPLE,
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
  'reduced SAV bindus are integer sums and allow values above one BAV row limit');
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

const fixture = BV_RAMAN_METHOD_B_SECONDARY_EXAMPLE;
const methodB = bvRamanAshtakavargaMethodB({
  reducedSarvashtakavarga: fixture.reducedSarvashtakavarga,
  planetSigns: fixture.planetSigns
});
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
  sourceStatus: 'PRIMARY_PRINTED_CHART_PENDING',
  certification: false,
  customerReportIntegration: false,
  finalLifespanEmitted: false
}, null, 2));
