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
eq(hpaSun.planets.Sun.harana.resolved, true, 'explicit Sun Harana inputs resolve the Sun term');
eq(hpaSun.netLunarYears, null, 'other six planets remain unresolved without their own Harana inputs');
eq(hpaSun.finalLifespan, null, 'HPA source arithmetic never releases a final result');

const standard = BV_RAMAN_STANDARD_HOROSCOPE_REDUCTION_ORACLE;
const standardCalc = bvRamanHpaChapterXXVICompute({
  afterReductionRows: standard.afterReductionRows,
  planetSigns: standard.planetSigns,
  haranaByPlanet: {}
});
const standardPinda = {
  Sun:[96,86,182], Moon:[80,20,100], Mars:[126,71,197], Mercury:[97,61,158],
  Jupiter:[79,45,124], Venus:[61,5,66], Saturn:[108,62,170]
};
for (const [planet, expected] of Object.entries(standardPinda)) {
  eq([standardCalc.planets[planet].rasiPinda, standardCalc.planets[planet].grahaPinda,
    standardCalc.planets[planet].sodyaPinda], expected,
    planet + ' distinct Standard Horoscope reduced-row arithmetic');
}

// The book reports rounded gross terms for its worked chart. Keep those source
// figures separate from gross years recomputed from integer Pinda products.
const reportedNetExpected = {
  Sun:13.70, Moon:7.76, Mars:2.33, Mercury:0.48,
  Jupiter:4.00, Venus:12.44, Saturn:8.27
};
const sourceReportedNet = {};
const pindaRecomputedNet = {};
for (const planet of ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn']) {
  const flags = {
    conjunctionInSign: hpa.reportedHaranaFactors[planet] === 0.5,
    debilitated:false, combust:false, temporaryEnemySign:false,
    aboveHorizon:false, defeatedInPlanetaryWar:false, eclipsed:false
  };
  const sourceGross = hpa.reportedGrossLunarYears[planet];
  const sourceNet = bvRamanHpaChapterXXVIApplyHarana({grossLunarYears:sourceGross,factors:flags});
  sourceReportedNet[planet] = sourceNet.printedNetLunarYears;
  eq(sourceNet.printedNetLunarYears, reportedNetExpected[planet],
    planet + ' displayed gross term plus displayed Harana reproduces the printed net term');

  const pindaSum = hpa.reportedRasiPinda[planet] + hpa.reportedGrahaPinda[planet];
  const unwrapped = pindaSum * 7 / 27;
  const formulaGross = ((unwrapped % 27) + 27) % 27;
  const recomputedNet = bvRamanHpaChapterXXVIApplyHarana({grossLunarYears:formulaGross,factors:flags});
  pindaRecomputedNet[planet] = recomputedNet.printedNetLunarYears;
}
const printedNetSum = Object.values(sourceReportedNet).reduce((a,b)=>a+b,0);
const recomputedNetSum = Object.values(pindaRecomputedNet).reduce((a,b)=>a+b,0);
eq(printedNetSum, 48.98, 'printed per-graha net terms sum to the book total 48.98');
eq(recomputedNetSum, 48.97,
  'unrounded Pinda-to-gross recomputation then Harana truncation yields 48.97; discrepancy is preserved');
near(48.98 * 334 / 365, 44.8200547945, 1e-8,
  'printed total converted by 334/365 gives 44.82, not printed 44.87');
near(48.97 * 334 / 365, 44.8109041096, 1e-8,
  'recomputed net candidate converted by 334/365 gives 44.81');
ok(Math.abs(44.87 - 48.98 * 334 / 365) > 0.04,
  'printed 44.87 discrepancy is explicit and not patched');
eq(hpaSun.finalLifespan, null, 'source-example calculation never emits final lifespan');

// End-to-end join: raw BAV -> Trikona/Ekadhipatya -> Chapter XXVI Pinda/Harana,
// while the Chapter XIV category evidence stays as an independent track.
const noHarana = Object.fromEntries(
  ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'].map(name => [name, {
    conjunctionInSign:false, debilitated:false, combust:false, temporaryEnemySign:false,
    aboveHorizon:false, defeatedInPlanetaryWar:false, eclipsed:false
  }])
);
const integrated = bvRamanIntegratedAyurdayaResearch({
  chart, evidence: { strongPlanets: ['Jupiter'] },
  bavRows: standard.beforeReductionRows,
  occupiedSigns: standard.occupiedSigns,
  planetSigns: standard.planetSigns,
  haranaByPlanet: noHarana
});
ok(integrated.shodhana !== null, 'combined flow includes both Ashtakavarga reductions');
ok(integrated.chapterXXVI !== null, 'combined flow includes Chapter XXVI calculation');
ok(integrated.chapterXIV.matchedRuleIds.includes('XIV-BAL-09'),
  'combined flow carries the Chapter XIV rule trace');
eq(integrated.crossCheck.ruleAndNumberTracksKeptSeparate, true,
  'category evidence is not averaged with numerical arithmetic');
eq(integrated.finalLifespan, null, 'combined research flow has no final lifespan');
eq(integrated.finalAgeOrDateOfDeath, null, 'combined research flow has no death-age/date output');
eq(integrated.certified, false, 'combined flow remains uncertified');
eq(integrated.customerDisplayAllowed, false, 'combined flow is not customer-facing');

const fs = await import('node:fs');
const source = fs.readFileSync(
  new URL('../public/horoscope/offline/bv-raman-hpa-ayurdaya-combined.browser.mjs', import.meta.url),
  'utf8'
);
ok(!/cg-rajan|classical-shodhana/i.test(source),
  'combined module does not import C.G. Rajan or BPHS Shodhana helpers');
ok(!/predictedDeathAge|finalAgeOrDateOfDeath\s*=\s*[^n]/i.test(source),
  'combined module has no age-of-death predictor');
console.log(JSON.stringify({
  pass:true, assertions,
  scope:'B.V. Raman HPA Chapter XIV rule evidence + Chapter XXVI Ashtakavarga arithmetic',
  printedNetLunarYears:printedNetSum,
  recomputedNetLunarYears:recomputedNetSum,
  printedSolarYears:44.87,
  solarYearsFromPrintedNet:48.98 * 334 / 365,
  solarYearsFromRecomputedNet:48.97 * 334 / 365,
  certification:false, finalLifespanEmitted:false, customerDisplayAllowed:false
}, null, 2));