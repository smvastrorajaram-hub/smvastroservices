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
  'HPA Chapter XXVI Graha Gunakara constants remain explicit');

// Chapter XIV exact-rule candidate: geometry is derived from longitudes/house values;
// strengths and special Drekkana/full-Moon judgments are explicit evidence inputs.
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
  'Chapter XIV detects the Moon 8 / Mars 7 / Rahu 9 / Jupiter 3 configuration');
eq(xiv.categoryCandidates.includes('Balarishta'), true,
  'rule match creates a category candidate, not a selected outcome');
eq(xiv.selectedCategory, null, 'Chapter XIV never selects a final category automatically');
eq(xiv.finalLifespan, null, 'Chapter XIV never emits final lifespan');
eq(xiv.certified, false, 'Chapter XIV rule collection stays uncertified');
eq(xiv.customerDisplayAllowed, false, 'Chapter XIV rule collection is not customer-facing');

// Harana uses the maximum eligible loss, never stacked losses.
const halfAndThirds = bvRamanHpaChapterXXVIApplyHarana({
  grossLunarYears: 12,
  factors: {
    conjunctionInSign: true, debilitated: false, combust: false,
    temporaryEnemySign: true, aboveHorizon: false,
    defeatedInPlanetaryWar: false, eclipsed: true
  }
});
eq(halfAndThirds.appliedDeductionFraction, 0.5, 'half-loss is the highest applicable reduction');
eq(halfAndThirds.remainingFraction, 0.5, 'reductions are not multiplied/stacked');
eq(halfAndThirds.printedNetLunarYears, 6, '12 years with highest half-Harana gives 6');
eq(halfAndThirds.ignoredLesserRules.includes('temporaryEnemySign'), true,
  'lower one-third deduction is recorded but not stacked');
const unresolvedHarana = bvRamanHpaChapterXXVIApplyHarana({
  grossLunarYears: 12,
  factors: { conjunctionInSign: false }
});
eq(unresolvedHarana.resolved, false, 'missing Harana conditions block the adjusted term');
eq(unresolvedHarana.printedNetLunarYears, null, 'unknown Harana inputs are never silently treated as zero');

// The Chapter XXVI source example is reconstructed from the reduced Sun row
// and its seven planetary positions; each product and Harana term remains traceable.
const hpa = BV_RAMAN_HPA_CHAPTER_XXVI_ORACLE;
const hpaRows = Object.fromEntries(
  ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']
    .map(name => [name, [...hpa.sunAfterReductionRow]])
);
const haranaByPlanet = {
  Sun: { conjunctionInSign:false, debilitated:false, combust:false, temporaryEnemySign:false,
    aboveHorizon:false, defeatedInPlanetaryWar:false, eclipsed:false },
  Moon: { conjunctionInSign:true, debilitated:false, combust:false, temporaryEnemySign:false,
    aboveHorizon:false, defeatedInPlanetaryWar:false, eclipsed:false },
  Mars: { conjunctionInSign:true, debilitated:false, combust:false, temporaryEnemySign:false,
    aboveHorizon:false, defeatedInPlanetaryWar:false, eclipsed:false },
  Mercury: { conjunctionInSign:true, debilitated:false, combust:false, temporaryEnemySign:false,
    aboveHorizon:false, defeatedInPlanetaryWar:false, eclipsed:false },
  Jupiter: { conjunctionInSign:true, debilitated:false, combust:false, temporaryEnemySign:false,
    aboveHorizon:false, defeatedInPlanetaryWar:false, eclipsed:false },
  Venus: { conjunctionInSign:true, debilitated:false, combust:false, temporaryEnemySign:false,
    aboveHorizon:false, defeatedInPlanetaryWar:false, eclipsed:false },
  Saturn: { conjunctionInSign:true, debilitated:false, combust:false, temporaryEnemySign:false,
    aboveHorizon:false, defeatedInPlanetaryWar:false, eclipsed:false }
};
const hpaCalc = bvRamanHpaChapterXXVICompute({
  afterReductionRows: hpaRows, planetSigns: hpa.planetSigns, haranaByPlanet
});
const reportedPairs = {
  Sun: [112, 45, 157], Moon: [104, 60, 164], Mars: [8, 10, 18],
  Mercury: [132, 80, 212], Jupiter: [85, 50, 135], Venus: [81, 15, 96], Saturn: [118, 50, 168]
};
for (const [planet, expected] of Object.entries(reportedPairs)) {
  eq([hpaCalc.planets[planet].rasiPinda,hpaCalc.planets[planet].grahaPinda,hpaCalc.planets[planet].sodyaPinda],
    expected, planet + ' Rasi/Graha/Sodhya Pinda arithmetic');
}
eq(hpaCalc.planets.Sun.har ana, undefined, 'placeholder');
