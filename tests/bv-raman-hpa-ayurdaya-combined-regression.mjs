import assert from 'node:assert/strict';
import {
  BV_RAMAN_HPA_CHAPTER_XIV_SOURCE,
  BV_RAMAN_HPA_CHAPTER_XXVI_SOURCE,
  BV_RAMAN_HPA_CHAPTER_XXVI_RASI_GUNAKARA,
  BV_RAMAN_HPA_CHAPTER_XXVI_GRAHA_GUNAKARA,
  bvRamanChapterXIVLongevityRules,
  bvRamanHpaChapterXXVIApplyHarana,
  bvRamanHpaChapterXXVICompute,
  bvRamanIntegratedAyurdayaResearch
} from '../public/horoscope/offline/bv-raman-hpa-ayurdaya-combined.browser.mjs';
import {
  BV_RAMAN_HPA_CHAPTER_XXVI_ORACLE,
  BV_RAMAN_STANDARD_HOROSCOPE_REDUCTION_ORACLE
} from '../public/horoscope/offline/bv-raman-ashtakavarga-ayurdaya.browser.mjs';

let assertions = 0;
function eq(actual, expected, message) { assert.deepEqual(actual, expected, message); assertions++; }
function near(actual, expected, epsilon, message) {
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= epsilon,
    message + '; expected ' + expected + ', got ' + actual); assertions++;
}
function ok(actual, message) { assert.ok(actual, message); assertions++; }

eq(BV_RAMAN_HPA_CHAPTER_XIV_SOURCE.chapter, 'XIV — Ayurdaya or Longevity',
  'Chapter XIV is a separate rule-evidence track');
eq(BV_RAMAN_HPA_CHAPTER_XXVI_SOURCE.chapter, 'XXVI — The Ashtakavarga System',
  'Chapter XXVI is the separate numerical track');
eq(BV_RAMAN_HPA_CHAPTER_XXVI_RASI_GUNAKARA,
  [7, 10, 8, 4, 10, 5, 7, 8, 9, 5, 11, 12],
  'HPA Chapter XXVI Rasi Gunakara constants');
eq(BV_RAMAN_HPA_CHAPTER_XXVI_GRAHA_GUNAKARA,
  { Sun: 5, Moon: 5, Mars: 8, Mercury: 5, Jupiter: 10, Venus: 7, Saturn: 5 },
  'HPA Chapter XXVI Graha Gunakara constants');

// Chapter XIV example: rule detection comes from chart positions; the selected
// rule set is partial, and a hit produces a candidate, never a final category.
const chart = {
  lagna: { longitude: 0 },
  planets: [
    { name: 'சூரியன்', longitude: 105, bhava: 4 },
    { name: 'சந்திரன்', longitude: 225, bhava: 8 },
    { name: 'செவ்வாய்', longitude: 195, bhava: 7 },
    { name: 'புதன்', longitude: 135, bhava: 5 },
    { name: 'குரு', longitude: 75, bhava: 3 },
    { name: 'சுக்கிரன்', longitude: 45, bhava: 2 },
    { name: 'சனி', longitude: 315, bhava: 11 },
    { name: 'ராகு', longitude: 255, bhava: 9 },
    { name: 'கேது', longitude: 165, bhava: 6 }
  ]
};
const xiv = bvRamanChapterXIVLongevityRules({ chart, evidence: {} });
ok(xiv.matchedRuleIds.includes('XIV-BAL-09'),
  'Chapter XIV detects Moon 8 / Mars 7 / Rahu 9 / Jupiter 3');
eq(xiv.categoryCandidates.includes('Balarishta'), true,
  'rule match creates a candidate category');
eq(xiv.selectedCategory, null, 'Chapter XIV does not select a final category');
eq(xiv.finalLifespan, null, 'Chapter XIV does not return a final lifespan');
eq(xiv.certified, false, 'Chapter XIV rules remain uncertified');
eq(xiv.customerDisplayAllowed, false, 'Chapter XIV rule trace is research-only');

// Harana rule: only the largest loss applies, never a stack of losses.
const halfAndThirds = bvRamanHpaChapterXXVIApplyHarana({
  grossLunarYears: 12,
  factors: {
    conjunctionInSign: true, debilitated: false, combust: false,
    temporaryEnemySign: true, aboveHorizon: false,
    defeatedInPlanetaryWar: false, eclipsed: true
  }
});
eq(halfAndThirds.appliedDeductionFraction, 0.5, 'half-loss takes precedence over one-third');
eq(halfAndThirds.remainingFraction, 0.5, 'Harana deductions are not multiplied/stacked');
eq(halfAndThirds.printedNetLunarYears, 6, '12 years with the highest half-Harana gives 6');
eq(halfAndThirds.ignoredLesserRules.includes('temporaryEnemySign'), true,
  'lower one-third deduction is recorded but not stacked');
eq(bvRamanHpaChapterXXVIApplyHarana({
  grossLunarYears: 12, factors: { conjunctionInSign: false }
}).resolved, false, 'missing Harana facts block adjusted term');

// The HPA Ch. XXVI Sun example: verify its own 112 + 45 = 157 calculation.
// Do not pretend the other six Pinda pairs come from the same Sun BAV row.
const hpa = BV_RAMAN_HPA_CHAPTER_XXVI_ORACLE;
const repeatedSunRow = Object.fromEntries(
  ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']
    .map(name => [name, [...hpa.sunAfterReductionRow]])
);
const hpaSun = bvRamanHpaChapterXXVICompute({
  afterReductionRows: repeatedSunRow,
  planetSigns: hpa.planetSigns,
  haranaByPlanet: {
    Sun: { conjunctionInSign:false, debilitated:false, combust:false, temporaryEnemySign:false,
      aboveHorizon:false, defeatedInPlanetaryWar:false, eclipsed:false }
  }
});
eq([hpaSun.planets.Sun.rasiPinda,hpaSun.planets.Sun.grahaPinda,hpaSun.planets.Sun.sodyaPinda],
  [112,45,157], 'HPA Chapter XXVI Sun Pinda example');
near(hpaSun.planets.Sun.grossLunarYears, 157 * 7 / 27 - 27, 1e-10,
  'Sun gross lunar-year arithmetic before Harana');
eq(hpaSun.planets.Sun.har ana, undefined, 'will be replaced');