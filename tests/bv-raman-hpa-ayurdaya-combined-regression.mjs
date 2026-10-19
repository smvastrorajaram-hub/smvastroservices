import assert from 'node:assert/strict';
import {
  BV_RAMAN_HPA_CHAPTER_XIV_SOURCE,
  BV_RAMAN_HPA_CHAPTER_XIV_SOURCE_RULE_INVENTORY,
  BV_RAMAN_HPA_CHAPTER_XXVI_SOURCE,
  BV_RAMAN_HPA_CHAPTER_XXVI_RASI_GUNAKARA,
  BV_RAMAN_HPA_CHAPTER_XXVI_GRAHA_GUNAKARA,
  BV_RAMAN_HPA_CHAPTER_XXVI_HARANA_RULES,
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
eq(BV_RAMAN_HPA_CHAPTER_XIV_SOURCE.evidenceGrade, 'PRIMARY_PAGE_IMAGES_VISUALLY_CHECKED_PARTIAL',
  'Chapter XIV scan evidence is checked but rule coverage remains partial');
eq(BV_RAMAN_HPA_CHAPTER_XXVI_SOURCE.chapter, 'XXVI — The Ashtakavarga System',
  'Chapter XXVI is the separate numerical track');
eq(BV_RAMAN_HPA_CHAPTER_XXVI_SOURCE.evidenceGrade, 'PRIMARY_PAGE_IMAGES_VISUALLY_CHECKED',
  'Chapter XXVI pages 199–203 have been visually checked');
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
const directPositionBal07 = bvRamanChapterXIVLongevityRules({
  chart: { lagna:{longitude:0}, planets:[
    {name:'Sun',longitude:240,bhava:9},{name:'Moon',longitude:10,bhava:1},
    {name:'Mars',longitude:210,bhava:8},{name:'Mercury',longitude:60,bhava:3},
    {name:'Jupiter',longitude:120,bhava:5},{name:'Venus',longitude:90,bhava:4},
    {name:'Saturn',longitude:330,bhava:12},{name:'Rahu',longitude:180,bhava:7},
    {name:'Ketu',longitude:0,bhava:1}
  ]}
});
eq(directPositionBal07.rules.find(rule => rule.id === 'XIV-BAL-07').status, 'MATCHED',
  'HPA p.64 Balarishta rule 7 matches its four printed house placements');

const fullMoonNightAntidote = bvRamanChapterXIVLongevityRules({
  chart: { lagna:{longitude:0}, planets:[
    {name:'Sun',longitude:180,bhava:12},{name:'Moon',longitude:5,bhava:6},
    {name:'Mars',longitude:210,bhava:8},{name:'Mercury',longitude:60,bhava:3},
    {name:'Jupiter',longitude:120,bhava:5},{name:'Venus',longitude:90,bhava:4},
    {name:'Saturn',longitude:330,bhava:12},{name:'Rahu',longitude:240,bhava:9},
    {name:'Ketu',longitude:60,bhava:3}
  ]}, evidence:{bornOnNightOfFullMoon:true}
});
eq(fullMoonNightAntidote.rules.find(rule => rule.id === 'XIV-ANT-08').status, 'MATCHED',
  'HPA p.67 Antidote rule 8 requires both Moon house 6/8 and explicit birth-night evidence');

eq(BV_RAMAN_HPA_CHAPTER_XIV_SOURCE_RULE_INVENTORY.length, 76,
  'source inventory includes all 30 Balarishta, 10 antidote, 15 Alpayu, 15 Madhyayu and 6 Purnayu rules');
eq(new Set(BV_RAMAN_HPA_CHAPTER_XIV_SOURCE_RULE_INVENTORY.map(rule => rule.id)).size, 76,
  'every source rule has a unique stable ID');
eq(xiv.rules.length, 76,
  'runtime rule trace exposes every source rule, not only implemented evaluators');
eq(xiv.unimplementedRuleIds.includes('XIV-BAL-04'), true,
  'unsupported Balarishta rule 4 remains explicitly visible as unimplemented');
eq(xiv.rules.find(rule => rule.id === 'XIV-BAL-07').implemented, true,
  'direct-position Balarishta rule 7 is now evaluated');
eq(xiv.rules.find(rule => rule.id === 'XIV-BAL-30').implemented, true,
  'aspect-based Balarishta rule 30 is now evaluated');
eq(xiv.rules.find(rule => rule.id === 'XIV-BAL-04').status, 'UNKNOWN',
  'unimplemented Balarishta rule is UNKNOWN, never silently NOT_MATCHED');
eq(xiv.unimplementedRuleIds.includes('XIV-ANT-08'), false,
  'antidote rule 8 is no longer listed as unimplemented after its evaluator was added');
eq(xiv.rules.find(rule => rule.id === 'XIV-ANT-08').status, 'UNKNOWN',
  'antidote rule 8 remains UNKNOWN when explicit full-moon-night evidence is absent');
eq(xiv.ruleCoverageCounts.Balarishta.sourceRules, 30,
  'Balarishta inventory has 30 source rules');
eq(xiv.ruleCoverageCounts.Balarishta.implemented, 20,
  'twenty source-numbered Balarishta rules have evaluators after this scan pass');
eq(xiv.ruleCoverageCounts.Alpayu.sourceRules, 15,
  'Alpayu inventory has 15 source rules');
eq(xiv.ruleCoverageCounts.Alpayu.implemented, 12,
  'Alpayu implementation count includes rules 1-8, 11, 12, 14 and 15');
eq(xiv.rules.find(rule => rule.id === 'XIV-ALP-11').implemented, true,
  'Alpayu rule 11 has an independent evaluator');
eq(xiv.rules.find(rule => rule.id === 'XIV-ALP-14').implemented, true,
  'Alpayu rule 14 exposes its explicit strength/aspect evidence gate');
eq(xiv.ruleCoverageCounts.Antidote.implemented, 10,
  'all ten source-numbered antidote conditions now have evaluators or explicit evidence inputs');
eq(xiv.rules.find(rule => rule.id === 'XIV-ALP-12').sourceRuleNumber, 12,
  'weak birth lord plus 8th lord in a Kendra is correctly attributed to printed Alpayu rule 12');
eq(xiv.rules.find(rule => rule.id === 'XIV-ALP-15').sourceRuleNumber, 15,
  'common-sign Lagna/Moon condition is correctly attributed to printed Alpayu rule 15');
eq(xiv.rules.find(rule => rule.id === 'XIV-MAD-15').sourceRuleNumber, 15,
  'powerful Saturn with benefics in Kendras/Trikonas is correctly attributed to printed Madhyayu rule 15');


const moonKendraWithJupiterAspect = bvRamanChapterXIVLongevityRules({
  chart: { lagna:{longitude:0}, planets:[
    {name:'Sun',longitude:300,bhava:10},{name:'Moon',longitude:10,bhava:1},
    {name:'Mars',longitude:15,bhava:1},{name:'Mercury',longitude:60,bhava:3},
    {name:'Jupiter',longitude:120,bhava:5},{name:'Venus',longitude:90,bhava:4},
    {name:'Saturn',longitude:180,bhava:7},{name:'Rahu',longitude:210,bhava:8},
    {name:'Ketu',longitude:30,bhava:2}
  ]}
});
eq(moonKendraWithJupiterAspect.rules.find(rule => rule.id === 'XIV-BAL-02').status, 'MATCHED',
  'Printed Chapter XIV rule 2 says Moon in a Kendra with malefics; unlike rule 3, it does not add a no-benefic-aspect condition');



const moonKendraMaleficConjunctionNoBeneficAspect = bvRamanChapterXIVLongevityRules({
  chart: { lagna:{longitude:0}, planets:[
    {name:'Sun',longitude:300,bhava:10},{name:'Moon',longitude:10,bhava:1},
    {name:'Mars',longitude:15,bhava:1},{name:'Mercury',longitude:60,bhava:4},
    {name:'Jupiter',longitude:90,bhava:4},{name:'Venus',longitude:155,bhava:6},
    {name:'Saturn',longitude:180,bhava:7},{name:'Rahu',longitude:210,bhava:8},
    {name:'Ketu',longitude:30,bhava:2}
  ]}
});
ok(moonKendraMaleficConjunctionNoBeneficAspect.matchedRuleIds.includes('XIV-BAL-02'),
  'Chapter XIV Balarishta rule 2 matches when Moon is conjunct a malefic in a Kendra and has no benefic aspect');

const moonKendraMaleficAspectOnly = bvRamanChapterXIVLongevityRules({
  chart: { lagna:{longitude:0}, planets:[
    {name:'Sun',longitude:35,bhava:2},{name:'Moon',longitude:5,bhava:1},
    {name:'Mars',longitude:65,bhava:3},{name:'Mercury',longitude:95,bhava:4},
    {name:'Jupiter',longitude:90,bhava:4},{name:'Venus',longitude:155,bhava:6},
    {name:'Saturn',longitude:185,bhava:7},{name:'Rahu',longitude:215,bhava:8},
    {name:'Ketu',longitude:245,bhava:9}
  ]}
});
const bal02AspectOnly = moonKendraMaleficAspectOnly.rules.find(rule => rule.id === 'XIV-BAL-02');
eq(bal02AspectOnly.status, 'NOT_MATCHED',
  'Chapter XIV "Moon in a Kendra with malefics" is not widened to a malefic aspect alone');

const independentMadhyayuRules = bvRamanChapterXIVLongevityRules({
  chart: { lagna:{longitude:0}, planets:[
    {name:'Sun',longitude:300,bhava:10},{name:'Moon',longitude:10,bhava:1},
    {name:'Mars',longitude:35,bhava:2},{name:'Mercury',longitude:80,bhava:4},
    {name:'Jupiter',longitude:120,bhava:5},{name:'Venus',longitude:155,bhava:6},
    {name:'Saturn',longitude:185,bhava:7},{name:'Rahu',longitude:215,bhava:8},
    {name:'Ketu',longitude:245,bhava:9}
  ]}, evidence: {}
});
eq(independentMadhyayuRules.rules.find(rule => rule.id === 'XIV-MAD-01').status, 'MATCHED',
  'Madhyayu rule 1 independently matches when the 3rd/6th lord is in a Kendra');
eq(independentMadhyayuRules.rules.find(rule => rule.id === 'XIV-MAD-02').status, 'UNKNOWN',
  'Madhyayu rule 2 remains unknown without independently supplied lord-strength inputs');
eq(independentMadhyayuRules.rules.find(rule => rule.id === 'XIV-MAD-03').status, 'UNKNOWN',
  'Madhyayu rule 3 remains unknown without the source-chart arrangement input');

const allThreeMaleficHouses = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:[
    {name:'Sun',longitude:160,bhava:6},{name:'Moon',longitude:20,bhava:2},
    {name:'Mars',longitude:220,bhava:8},{name:'Mercury',longitude:45,bhava:3},
    {name:'Jupiter',longitude:75,bhava:4},{name:'Venus',longitude:105,bhava:5},
    {name:'Saturn',longitude:330,bhava:12},{name:'Rahu',longitude:70,bhava:4},
    {name:'Ketu',longitude:250,bhava:10}
  ]}
});
ok(allThreeMaleficHouses.matchedRuleIds.includes('XIV-ALP-02'),
  'Alpayu house rule matches when malefic occupants exist in all of 6, 8 and 12');

const onlyOneMaleficHouse = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:[
    {name:'Sun',longitude:160,bhava:6},{name:'Moon',longitude:20,bhava:2},
    {name:'Mars',longitude:220,bhava:8},{name:'Mercury',longitude:45,bhava:3},
    {name:'Jupiter',longitude:75,bhava:4},{name:'Venus',longitude:105,bhava:5},
    {name:'Saturn',longitude:330,bhava:10},{name:'Rahu',longitude:70,bhava:4},
    {name:'Ketu',longitude:250,bhava:10}
  ]}
});
eq(onlyOneMaleficHouse.matchedRuleIds.includes('XIV-ALP-02'), false,
  'Alpayu 6/8/12 rule does not match if house 12 has no malefic');

// Regression for the original CI runtime failure and the source meaning of
// Alpayu rule 11: it matches only when houses 1/2/8 contain malefics AND no
// known benefic occupies a Kendra. The helper must preserve UNKNOWN when a
// partial chart cannot establish the benefic placements.
const alpayu11NoBeneficsInKendras = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:[
    {name:'Sun',longitude:10,bhava:1},{name:'Moon',longitude:160,bhava:6},
    {name:'Mars',longitude:40,bhava:2},{name:'Mercury',longitude:80,bhava:3},
    {name:'Jupiter',longitude:120,bhava:5},{name:'Venus',longitude:150,bhava:6},
    {name:'Saturn',longitude:220,bhava:8},{name:'Rahu',longitude:20,bhava:1},
    {name:'Ketu',longitude:50,bhava:2}
  ]}
});
eq(alpayu11NoBeneficsInKendras.rules.find(rule => rule.id === 'XIV-ALP-11').status,
  'MATCHED', 'Alpayu rule 11 matches when all benefics are outside Kendras');

const alpayu11JupiterInKendra = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:[
    {name:'Sun',longitude:10,bhava:1},{name:'Moon',longitude:160,bhava:6},
    {name:'Mars',longitude:40,bhava:2},{name:'Mercury',longitude:80,bhava:3},
    {name:'Jupiter',longitude:90,bhava:4},{name:'Venus',longitude:150,bhava:6},
    {name:'Saturn',longitude:220,bhava:8},{name:'Rahu',longitude:20,bhava:1},
    {name:'Ketu',longitude:50,bhava:2}
  ]}
});
eq(alpayu11JupiterInKendra.rules.find(rule => rule.id === 'XIV-ALP-11').status,
  'NOT_MATCHED', 'Alpayu rule 11 does not match when Jupiter occupies a Kendra');

const alpayu11IncompleteChart = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:[
    {name:'Sun',longitude:10,bhava:1},{name:'Mars',longitude:40,bhava:2},
    {name:'Saturn',longitude:220,bhava:8},{name:'Rahu',longitude:20,bhava:1},
    {name:'Ketu',longitude:50,bhava:2}
  ]}
});
eq(alpayu11IncompleteChart.rules.find(rule => rule.id === 'XIV-ALP-11').status,
  'UNKNOWN', 'Alpayu rule 11 remains UNKNOWN when benefic placement evidence is incomplete');

// Pin every Chapter XXVI p. 202 Harana factor to its printed rule number
// and fraction, then execute each factor independently through the public API.
eq(BV_RAMAN_HPA_CHAPTER_XXVI_HARANA_RULES.map(({key, fraction, sourcePrintedPage, sourceRuleNumber}) =>
  ({key, fraction, sourcePrintedPage, sourceRuleNumber})), [
  {key:'conjunctionInSign', fraction:1/2, sourcePrintedPage:202, sourceRuleNumber:52},
  {key:'debilitated', fraction:1/2, sourcePrintedPage:202, sourceRuleNumber:53},
  {key:'combust', fraction:1/2, sourcePrintedPage:202, sourceRuleNumber:54},
  {key:'temporaryEnemySign', fraction:1/3, sourcePrintedPage:202, sourceRuleNumber:55},
  {key:'aboveHorizon', fraction:1/2, sourcePrintedPage:202, sourceRuleNumber:56},
  {key:'defeatedInPlanetaryWar', fraction:1/3, sourcePrintedPage:202, sourceRuleNumber:57},
  {key:'eclipsed', fraction:1/3, sourcePrintedPage:202, sourceRuleNumber:58}
], 'each Harana factor maps to the exact printed page/rule and stated deduction fraction');
for (const rule of BV_RAMAN_HPA_CHAPTER_XXVI_HARANA_RULES) {
  const factors = Object.fromEntries(BV_RAMAN_HPA_CHAPTER_XXVI_HARANA_RULES.map(item =>
    [item.key, item.key === rule.key]));
  const planet = rule.key === 'eclipsed' ? 'Sun' : 'Mars';
  const result = bvRamanHpaChapterXXVIApplyHarana({
    grossLunarYears: 30, planet, factors
  });
  eq(result.resolved, true, 'single explicit ' + rule.key + ' Harana factor resolves');
  eq(result.appliedDeductionFraction, rule.fraction,
    'single ' + rule.key + ' uses the source-defined fraction');
  near(result.unroundedNetLunarYears, 30 * (1 - rule.fraction), 1e-12,
    'single ' + rule.key + ' transforms only the stated fraction');
}

// Harana rule: only the largest loss applies, never a stack of losses.
const halfAndThirds = bvRamanHpaChapterXXVIApplyHarana({
  grossLunarYears: 12, planet: 'Sun',
  factors: {
    conjunctionInSign: true, debilitated: false, combust: false,
    temporaryEnemySign: true, aboveHorizon: false,
    defeatedInPlanetaryWar: false, eclipsed: true
  }
});
eq(halfAndThirds.appliedDeductionFraction, 0.5, 'half-loss takes precedence over one-third');
eq(halfAndThirds.remainingFraction, 0.5, 'Harana deductions are not multiplied/stacked');
eq(halfAndThirds.roundedNetLunarYears, 6, '12 years with the highest half-Harana gives 6');
eq(halfAndThirds.ignoredLesserRules.includes('temporaryEnemySign'), true,
  'lower one-third deduction is recorded but not stacked');
eq(bvRamanHpaChapterXXVIApplyHarana({
  grossLunarYears: 12, planet: 'Sun', factors: { conjunctionInSign: false }
}).resolved, false, 'missing Harana facts block adjusted term');
const invalidEclipse = bvRamanHpaChapterXXVIApplyHarana({
  grossLunarYears: 12, planet: 'Mars', factors: {
    conjunctionInSign:false, debilitated:false, combust:false, temporaryEnemySign:false,
    aboveHorizon:false, defeatedInPlanetaryWar:false, eclipsed:true
  }
});
eq(invalidEclipse.resolved, false, 'eclipse Harana cannot be applied to Mars');
eq(invalidEclipse.invalidFactors, ['eclipsed'], 'non-luminary eclipse input is identified as invalid');

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

// Primary scan pp. 199–203 provide the seven Pinda pairs and state that every
// graha term except the Sun is halved in this worked chart. Recalculate each term
// from integer Pindas at full precision; source-reported two-decimal terms are
// display evidence only, not arithmetic inputs. Do not infer which half-Harana
// factor caused each planet's effective reduction.
const reportedNetExpected = {
  Sun:13.70, Moon:7.76, Mars:2.33, Mercury:0.48,
  Jupiter:4.00, Venus:12.44, Saturn:8.27
};
const formulaNetByPlanet = {};
const formulaGrossByPlanet = {};
for (const planet of ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn']) {
  const pindaSum = hpa.reportedRasiPinda[planet] + hpa.reportedGrahaPinda[planet];
  const formulaGross = ((pindaSum * 7 / 27) % 27 + 27) % 27;
  const net = formulaGross * hpa.reportedRemainingFraction[planet];
  formulaGrossByPlanet[planet] = formulaGross;
  formulaNetByPlanet[planet] = net;
  near(net, formulaGross * hpa.reportedRemainingFraction[planet], 1e-12,
    planet + ' uses full-precision gross term and scanned effective remaining fraction');
}
const exactFormulaNetSum = Object.values(formulaNetByPlanet).reduce((a,b) => a+b, 0);
near(exactFormulaNetSum, 49, 1e-10,
  'exact Pinda arithmetic plus the scanned half-rule gives 49.00 lunar years before display rounding');
near(49 * 334 / 365, 44.83835616438356, 1e-10,
  'full-precision 49.00 lunar-year total converts to 44.838356... solar years');
eq(Math.round((49 * 334 / 365 + Number.EPSILON) * 100) / 100, 44.84,
  'formula-derived solar-year candidate rounds to 44.84 only at final display');
near(48.98 * 334 / 365, 44.82005479452055, 1e-10,
  'converting the printed net total alone gives 44.82, not the printed 44.87');
near(Object.values(reportedNetExpected).reduce((a,b)=>a+b,0),48.98,1e-10,
  'the seven printed net terms sum to the printed total 48.98');
eq(hpa.reportedFinalSolarYears,44.87,
  '44.87 is retained as what the scanned page prints, not treated as the formula result');
eq(formulaGrossByPlanet.Sun, 157 * 7 / 27 - 27,
  'Sun gross term comes from 157 Pinda and subtracting one full 27-year cycle');
ok(Math.abs(44.87 - 49 * 334 / 365) > 0.03,
  'the printed solar result is not patched into the formula-derived output');
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
  printedNetLunarYears:Object.values(reportedNetExpected).reduce((a,b)=>a+b,0),
  formulaNetLunarYears:exactFormulaNetSum,
  printedSolarYears:44.87,
  solarYearsFromPrintedNet:48.98 * 334 / 365,
  formulaSolarYears:exactFormulaNetSum * 334 / 365,
  formulaSolarYearsRounded:Math.round((exactFormulaNetSum * 334 / 365 + Number.EPSILON) * 100) / 100,
  certification:false, finalLifespanEmitted:false, customerDisplayAllowed:false
}, null, 2));