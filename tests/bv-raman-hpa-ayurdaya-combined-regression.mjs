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
eq(xiv.status, 'RESEARCH_ONLY_PARTIAL_EVIDENCE_VALIDATION',
  'Rule evaluators exist, but independent evidence validation remains partial');
eq(xiv.ruleCoverageCounts.Balarishta.notImplemented, 0,
  'No Balarishta source-rule IDs lack an evaluator');
eq(xiv.ruleCoverageCounts.Antidote.notImplemented, 0,
  'No antidote source-rule IDs lack an evaluator');
eq(xiv.ruleCoverageCounts.Alpayu.notImplemented, 0,
  'No Alpayu source-rule IDs lack an evaluator');
eq(xiv.ruleCoverageCounts.Madhyayu.notImplemented, 0,
  'No Madhyayu source-rule IDs lack an evaluator');
eq(xiv.ruleCoverageCounts.Purnayu.notImplemented, 0,
  'No Purnayu source-rule IDs lack an evaluator');
ok(xiv.blockers.some(text => text.includes('All 76 Chapter XIV rule IDs have evaluator entries')),
  'Research blockers explain missing evidence wiring and validation rather than claiming rules are absent');
eq(xiv.finalLifespan, null, 'Chapter XIV does not return a final lifespan');
eq(xiv.certified, false, 'Chapter XIV rules remain uncertified');
eq(xiv.customerDisplayAllowed, false, 'Chapter XIV rule trace is research-only');
// Source-rule fixtures for the still-under-audited, chart-derivable placements.
// These are deliberately constructed rule examples from the printed combinations,
// not claimed as verbatim natal charts printed in the book.
// Primary-source worked example: HPA 20th ed., printed p.68, Horoscope No.1.
// The scan explicitly states: Moon in 7th, Saturn powerfully aspects Moon without
// benefic aspect; Venus is the birth Mahadasha lord and is conjunct Saturn/Ketu,
// while Rahu aspects Venus. The figure is sign-position rather than numeric-degree
// data, so Dasa facts are taken from the printed text; no exact Moon longitude,
// historical Lagna sign, or full reconstructed chart is asserted.
const hpaPrintedHoroscope1 = {
  lagna:{longitude:0},
  planets:[
    {name:'Jupiter',longitude:345,bhava:2},
    {name:'Rahu',longitude:45,bhava:4},
    {name:'Moon',longitude:135,bhava:7},
    {name:'Venus',longitude:225,bhava:10},
    {name:'Saturn',longitude:230,bhava:10},
    {name:'Ketu',longitude:225,bhava:10},
    {name:'Sun',longitude:250,bhava:11},
    {name:'Mars',longitude:251,bhava:11},
    {name:'Mercury',longitude:252,bhava:11}
  ]
};
const hpaHoroscope1Rules = bvRamanChapterXIVLongevityRules({
  chart:hpaPrintedHoroscope1,
  evidence:{birthDasaLord:'Venus',birthAntardasaLord:'Venus'}
});
eq(hpaHoroscope1Rules.rules.find(rule=>rule.id==='XIV-BAL-03').status,'MATCHED',
  'HPA p.68 Horoscope No.1: Moon in 7th, Saturn aspect and no benefic aspect match Balarishta rule 3');
eq(hpaHoroscope1Rules.rules.find(rule=>rule.id==='XIV-BAL-10').status,'MATCHED',
  'HPA p.68 Horoscope No.1: printed Venus birth Dasa lord conjunct Saturn/Ketu matches Balarishta rule 10');
eq(hpaHoroscope1Rules.rules.find(rule=>rule.id==='XIV-BAL-03').sourcePrintedPage,64,
  'Rule 3 match retains source p.64 while its worked example is p.68');
eq(hpaHoroscope1Rules.rules.find(rule=>rule.id==='XIV-BAL-10').sourcePrintedPage,65,
  'Rule 10 match retains source p.65 while its worked example is p.68');

// The rule 15 counterexample uses an explicitly defined synthetic Aries Lagna;
// it is not claimed to represent the p.68 Horoscope No.1.
const bal15VenusVenusCounterexample = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:[{name:'Moon',longitude:135,bhava:5}]},
  evidence:{birthDasaLord:'Venus',birthAntardasaLord:'Venus'}
});
eq(bal15VenusVenusCounterexample.rules.find(rule=>rule.id==='XIV-BAL-15').status,'NOT_MATCHED',
  'Balarishta rule 15 is negative when Venus/Venus is neither the Lagna nor 8th lord Dasa pairing under Aries Lagna');

const mad04AllPlanetsMiddleHouses = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:[
    {name:'Sun',longitude:120,bhava:5},{name:'Moon',longitude:150,bhava:6},
    {name:'Mars',longitude:180,bhava:7},{name:'Mercury',longitude:210,bhava:8},
    {name:'Jupiter',longitude:120,bhava:5},{name:'Venus',longitude:150,bhava:6},
    {name:'Saturn',longitude:180,bhava:7},{name:'Rahu',longitude:210,bhava:8},
    {name:'Ketu',longitude:120,bhava:5}
  ]}
});
eq(mad04AllPlanetsMiddleHouses.rules.find(rule=>rule.id==='XIV-MAD-04').status,'MATCHED',
  'HPA p.70 Madhyayu rule 4 matches when every graha occupies houses 5–8');
const mad04KnownOutside = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:[
    {name:'Sun',longitude:0,bhava:1},{name:'Moon',longitude:150,bhava:6}
  ]}
});
eq(mad04KnownOutside.rules.find(rule=>rule.id==='XIV-MAD-04').status,'NOT_MATCHED',
  'Madhyayu rule 4 is disproved if any known graha lies outside houses 5–8');
const mad04IncompleteInside = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:[
    {name:'Sun',longitude:120,bhava:5},{name:'Moon',longitude:150,bhava:6}
  ]}
});
eq(mad04IncompleteInside.rules.find(rule=>rule.id==='XIV-MAD-04').status,'UNKNOWN',
  'Madhyayu rule 4 stays UNKNOWN when all known grahas are in houses 5–8 but other grahas are absent');

const mad03BookCombination = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:[
    {name:'Mercury',longitude:60,bhava:2},
    {name:'Jupiter',longitude:90,bhava:3},
    {name:'Venus',longitude:300,bhava:11}
  ]}
});
const mad03Rule = mad03BookCombination.rules.find(rule=>rule.id==='XIV-MAD-03');
eq(mad03Rule.status,'MATCHED',
  'HPA printed p.70 Madhyayu rule 3 derives Mercury 2 / Jupiter 3 / Venus 11 from natal placements');
eq(mad03Rule.sourcePrintedPage,70,'Madhyayu rule 3 retains its printed page');
const mad03Counterexample = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:[
    {name:'Mercury',longitude:60,bhava:1},
    {name:'Jupiter',longitude:90,bhava:3},
    {name:'Venus',longitude:300,bhava:11}
  ]}
});
eq(mad03Counterexample.rules.find(rule=>rule.id==='XIV-MAD-03').status,'NOT_MATCHED',
  'Madhyayu rule 3 is negative when Mercury does not occupy the printed second house');
const mad03Missing = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:[
    {name:'Mercury',longitude:60,bhava:2},
    {name:'Jupiter',longitude:90,bhava:3}
  ]}
});
eq(mad03Missing.rules.find(rule=>rule.id==='XIV-MAD-03').status,'UNKNOWN',
  'Madhyayu rule 3 stays UNKNOWN when Venus house evidence is absent');

const pur02BookCombination = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:[
    {name:'Sun',longitude:210,bhava:7},
    {name:'Moon',longitude:300,bhava:4},
    {name:'Mars',longitude:240,bhava:8},
    {name:'Mercury',longitude:60,bhava:3},
    {name:'Jupiter',longitude:0,bhava:1},
    {name:'Venus',longitude:30,bhava:2},
    {name:'Saturn',longitude:270,bhava:9},
    {name:'Rahu',longitude:300,bhava:10},
    {name:'Ketu',longitude:330,bhava:11}
  ]}
});
const pur02Rule = pur02BookCombination.rules.find(rule=>rule.id==='XIV-PUR-02');
eq(pur02Rule.status,'MATCHED',
  'HPA printed p.71 Purnayu rule 2 recognizes benefics in houses 1-6 and malefics in 7-12');
eq(pur02Rule.sourcePrintedPage,71,'Purnayu rule 2 retains its printed page');
const pur02Counterexample = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:[
    {name:'Sun',longitude:210,bhava:2},
    {name:'Moon',longitude:300,bhava:4},
    {name:'Mars',longitude:240,bhava:8},
    {name:'Mercury',longitude:60,bhava:3},
    {name:'Jupiter',longitude:0,bhava:1},
    {name:'Venus',longitude:30,bhava:2},
    {name:'Saturn',longitude:270,bhava:9},
    {name:'Rahu',longitude:300,bhava:10},
    {name:'Ketu',longitude:330,bhava:11}
  ]}
});
eq(pur02Counterexample.rules.find(rule=>rule.id==='XIV-PUR-02').status,'NOT_MATCHED',
  'Purnayu rule 2 is negative when a malefic Sun occupies the benefic-designated first six houses');
const pur02Missing = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:[
    {name:'Jupiter',longitude:0,bhava:1},{name:'Venus',longitude:30,bhava:2}
  ]}
});
eq(pur02Missing.rules.find(rule=>rule.id==='XIV-PUR-02').status,'UNKNOWN',
  'Purnayu rule 2 remains UNKNOWN if the full nine-graha house evidence is unavailable');

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
eq(xiv.unimplementedRuleIds.includes('XIV-BAL-04'), false,
  'Balarishta rule 4 now has an evidence-gated evaluator');
eq(xiv.rules.find(rule => rule.id === 'XIV-BAL-07').implemented, true,
  'direct-position Balarishta rule 7 is now evaluated');
eq(xiv.rules.find(rule => rule.id === 'XIV-BAL-30').implemented, true,
  'aspect-based Balarishta rule 30 is now evaluated');
eq(xiv.rules.find(rule => rule.id === 'XIV-BAL-11').implemented, true,
  'Balarishta rule 11 requires explicit sunrise evidence and evaluates the placement conditions');
eq(xiv.rules.find(rule => rule.id === 'XIV-BAL-15').implemented, true,
  'Balarishta rule 15 uses explicit birth Dasa/Antardasa inputs');
eq(xiv.rules.find(rule => rule.id === 'XIV-BAL-16').implemented, true,
  'Balarishta rule 16 requires an explicit Navamsa Lagna lord');
eq(xiv.rules.find(rule => rule.id === 'XIV-BAL-10').implemented, true,
  'Balarishta rule 10 uses explicit birth-Dasa-lord conjunction evidence');
eq(xiv.rules.find(rule => rule.id === 'XIV-BAL-28').implemented, true,
  'Balarishta rule 28 uses explicit weakness and poor-placement evidence');
eq(xiv.rules.find(rule => rule.id === 'XIV-BAL-12').implemented, true,
  'Balarishta rule 12 evaluates the interpreted Lagna-lord OR paired 5th/9th-lord condition');
eq(xiv.unimplementedRuleIds.includes('XIV-BAL-12'), false,
  'Balarishta rule 12 no longer remains unimplemented');
eq(xiv.rules.find(rule => rule.id === 'XIV-MAD-05').implemented, true,
  'Madhyayu rule 5 separately tests Sun enemy-sign and affliction facts');
eq(xiv.rules.find(rule => rule.id === 'XIV-MAD-06').implemented, true,
  'Madhyayu rule 6 tests the birth lord in 6/8 with malefic conjunction and no benefic aspect');
eq(xiv.rules.find(rule => rule.id === 'XIV-MAD-13').implemented, true,
  'Madhyayu rule 13 checks benefic Kendra evidence and aspects to Lagna/lord');
eq(xiv.rules.find(rule => rule.id === 'XIV-ALP-09').implemented, true,
  'Alpayu rule 9 checks Saturn/Lagna-owner placement plus explicit benefic-house evidence');
eq(xiv.rules.find(rule => rule.id === 'XIV-MAD-07').implemented, true,
  'Madhyayu rule 7 checks Saturn/Moon placements plus explicit other-graha evidence');
eq(xiv.rules.find(rule => rule.id === 'XIV-MAD-11').implemented, true,
  'Madhyayu rule 11 checks four placements plus explicit unfavourable-house evidence');
eq(xiv.rules.find(rule => rule.id === 'XIV-BAL-04').status, 'UNKNOWN',
  'Balarishta rule 4 remains UNKNOWN when sunrise, Hora and Navamsa facts are absent');
eq(xiv.unimplementedRuleIds.includes('XIV-ANT-08'), false,
  'antidote rule 8 is no longer listed as unimplemented after its evaluator was added');
eq(xiv.rules.find(rule => rule.id === 'XIV-ANT-08').status, 'UNKNOWN',
  'antidote rule 8 remains UNKNOWN when explicit full-moon-night evidence is absent');
eq(xiv.ruleCoverageCounts.Balarishta.sourceRules, 30,
  'Balarishta inventory has 30 source rules');
eq(xiv.ruleCoverageCounts.Balarishta.implemented, 30,
  'all thirty Balarishta source rules now have evaluators');
eq(xiv.ruleCoverageCounts.Alpayu.sourceRules, 15,
  'Alpayu inventory has 15 source rules');
eq(xiv.ruleCoverageCounts.Alpayu.implemented, 15,
  'all fifteen Alpayu source rules now have evaluators, with missing data remaining UNKNOWN');
eq(xiv.rules.find(rule => rule.id === 'XIV-ALP-11').implemented, true,
  'Alpayu rule 11 has an independent evaluator');
eq(xiv.rules.find(rule => rule.id === 'XIV-ALP-14').implemented, true,
  'Alpayu rule 14 exposes its explicit strength/aspect evidence gate');
eq(xiv.rules.find(rule => rule.id === 'XIV-ALP-10').implemented, true,
  'Alpayu rule 10 has an independent lord-placement and aspect evaluator');
eq(xiv.rules.find(rule => rule.id === 'XIV-ALP-13').implemented, true,
  'Alpayu rule 13 evaluates Kendra lords, house-8 occupancy and no other Kendra planets');
eq(xiv.unimplementedRuleIds.includes('XIV-ALP-13'), false,
  'Alpayu rule 13 no longer remains unimplemented');
eq(xiv.rules.find(rule => rule.id === 'XIV-MAD-09').implemented, true,
  'Madhyayu rule 9 has an explicit afflicted-Moon evaluator');
eq(xiv.ruleCoverageCounts.Antidote.implemented, 10,
  'all ten source-numbered antidote conditions now have evaluators or explicit evidence inputs');
eq(xiv.rules.find(rule => rule.id === 'XIV-ALP-12').sourceRuleNumber, 12,
  'weak birth lord plus 8th lord in a Kendra is correctly attributed to printed Alpayu rule 12');
eq(xiv.rules.find(rule => rule.id === 'XIV-ALP-15').sourceRuleNumber, 15,
  'common-sign Lagna/Moon condition is correctly attributed to printed Alpayu rule 15');
eq(xiv.rules.find(rule => rule.id === 'XIV-MAD-15').sourceRuleNumber, 15,
  'powerful Saturn with benefics in Kendras/Trikonas is correctly attributed to printed Madhyayu rule 15');
eq(xiv.ruleCoverageCounts.Madhyayu.sourceRules, 15,
  'Madhyayu inventory retains all fifteen source rules after the new evaluators');
eq(xiv.ruleCoverageCounts.Madhyayu.implemented, 15,
  'all fifteen source-numbered Madhyayu rules now have evaluators');

// Balarishta 12 interpretation: Lagna lord alone qualifies, OR both the 5th
// and 9th lords each qualify through a natural enemy sign or house 8/9.
const bal12LagnaLordEnemySign = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:[
    {name:'Mars',longitude:60,bhava:3} // Aries Lagna lord Mars in Mercury's Gemini sign.
  ]}
});
eq(bal12LagnaLordEnemySign.rules.find(rule => rule.id === 'XIV-BAL-12').status,
  'MATCHED', 'Balarishta 12 matches when the Lagna lord occupies its natural enemy sign');

const bal12FifthAndNinthLords = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:[
    {name:'Mars',longitude:5,bhava:1},   // Lagna lord does not qualify.
    {name:'Sun',longitude:210,bhava:8},  // 5th lord qualifies by house 8.
    {name:'Jupiter',longitude:240,bhava:9} // 9th lord qualifies by house 9.
  ]}
});
eq(bal12FifthAndNinthLords.rules.find(rule => rule.id === 'XIV-BAL-12').status,
  'MATCHED', 'Balarishta 12 matches when both 5th and 9th lords qualify');

const bal12NoQualifyingPlacement = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:[
    {name:'Mars',longitude:5,bhava:1},     // Lagna lord in its own sign.
    {name:'Sun',longitude:125,bhava:5},    // 5th lord in its own sign.
    {name:'Jupiter',longitude:335,bhava:12} // 9th lord in its own sign, outside 8/9.
  ]}
});
eq(bal12NoQualifyingPlacement.rules.find(rule => rule.id === 'XIV-BAL-12').status,
  'NOT_MATCHED', 'Balarishta 12 is negative when neither the Lagna lord nor both 5th/9th lords qualify');

const bal12MissingPlacements = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:[]}
});
eq(bal12MissingPlacements.rules.find(rule => rule.id === 'XIV-BAL-12').status,
  'UNKNOWN', 'Balarishta 12 remains UNKNOWN when the relevant lords lack chart placements');

// Alpayu 13: exclude the two named lords, but reject any additional Kendra
// occupants; proving the absence of additional occupants requires a complete chart.
const alp13BasePlanets = [
  {name:'Sun',longitude:210,bhava:8},
  {name:'Moon',longitude:30,bhava:2},
  {name:'Mars',longitude:5,bhava:1},      // Aries Lagna and 8th lord.
  {name:'Mercury',longitude:70,bhava:3},
  {name:'Jupiter',longitude:130,bhava:5},
  {name:'Venus',longitude:160,bhava:6},
  {name:'Saturn',longitude:300,bhava:11},
  {name:'Rahu',longitude:250,bhava:9},
  {name:'Ketu',longitude:330,bhava:12}
];
const alp13Matches = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:alp13BasePlanets}
});
eq(alp13Matches.rules.find(rule => rule.id === 'XIV-ALP-13').status,
  'MATCHED', 'Alpayu 13 matches when only the Lagna/8th lord occupies a Kendra and house 8 is occupied');
eq(alp13Matches.rules.find(rule => rule.id === 'XIV-ALP-13').displayMessageTamil,
  'கவனம் தேவை', 'Alpayu 13 uses neutral attention-needed wording instead of a death prediction');
ok(!/death|மரணம்/i.test(alp13Matches.rules.find(rule => rule.id === 'XIV-ALP-13').title),
  'Alpayu 13 display title must not state or imply a death prediction');

const alp13OtherKendraGraha = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:alp13BasePlanets.map(p =>
    p.name === 'Jupiter' ? {...p,bhava:4} : p)}
});
eq(alp13OtherKendraGraha.rules.find(rule => rule.id === 'XIV-ALP-13').status,
  'NOT_MATCHED', 'Alpayu 13 fails when another planet occupies Kendra house 4');

const alp13NoEighthHousePlanet = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:alp13BasePlanets.map(p =>
    p.name === 'Sun' ? {...p,bhava:2} : p)}
});
eq(alp13NoEighthHousePlanet.rules.find(rule => rule.id === 'XIV-ALP-13').status,
  'NOT_MATCHED', 'Alpayu 13 fails when house 8 is empty');

const alp13IncompleteChart = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:[
    {name:'Mars',longitude:5,bhava:1}
  ]}
});
eq(alp13IncompleteChart.rules.find(rule => rule.id === 'XIV-ALP-13').status,
  'UNKNOWN', 'Alpayu 13 remains UNKNOWN unless the absence of other Kendra planets can be established');


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

const bal17TwoMaleficAspects = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:[
    {name:'Sun',longitude:60,bhava:3},{name:'Moon',longitude:90,bhava:4},
    {name:'Mars',longitude:120,bhava:2},{name:'Mercury',longitude:150,bhava:6},
    {name:'Jupiter',longitude:180,bhava:9},{name:'Venus',longitude:210,bhava:7},
    {name:'Saturn',longitude:240,bhava:4},{name:'Rahu',longitude:270,bhava:5},
    {name:'Ketu',longitude:300,bhava:12}
  ]}
});
eq(bal17TwoMaleficAspects.rules.find(rule => rule.id === 'XIV-BAL-17').status, 'MATCHED',
  'Balarishta rule 17 matches malefic aspects to Lagna and the 8th sign from Moon');

const bal17Incomplete = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:[
    {name:'Sun',longitude:60,bhava:3},{name:'Moon',longitude:90,bhava:4}
  ]}
});
eq(bal17Incomplete.rules.find(rule => rule.id === 'XIV-BAL-17').status, 'UNKNOWN',
  'Balarishta rule 17 remains UNKNOWN when the malefic aspect-source set is incomplete');

const bal25NoJupiterAspects = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:[
    {name:'Sun',longitude:120,bhava:9},{name:'Moon',longitude:0,bhava:1},
    {name:'Mars',longitude:240,bhava:8},{name:'Mercury',longitude:60,bhava:3},
    {name:'Jupiter',longitude:270,bhava:10},{name:'Venus',longitude:30,bhava:2},
    {name:'Saturn',longitude:330,bhava:12},{name:'Rahu',longitude:90,bhava:4},
    {name:'Ketu',longitude:180,bhava:6}
  ]}
});
eq(bal25NoJupiterAspects.rules.find(rule => rule.id === 'XIV-BAL-25').status, 'MATCHED',
  'Balarishta rule 25 matches the four printed placements when Jupiter aspects none of them');

const bal25JupiterCancellation = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:[
    {name:'Sun',longitude:120,bhava:9},{name:'Moon',longitude:0,bhava:1},
    {name:'Mars',longitude:240,bhava:8},{name:'Mercury',longitude:60,bhava:3},
    {name:'Jupiter',longitude:120,bhava:5},{name:'Venus',longitude:30,bhava:2},
    {name:'Saturn',longitude:330,bhava:12},{name:'Rahu',longitude:90,bhava:4},
    {name:'Ketu',longitude:180,bhava:6}
  ]}
});
eq(bal25JupiterCancellation.rules.find(rule => rule.id === 'XIV-BAL-25').status, 'NOT_MATCHED',
  'Balarishta rule 25 is cancelled when Jupiter occupies house 5');

const bal26WithoutBeneficAspects = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:[
    {name:'Sun',longitude:90,bhava:3},{name:'Moon',longitude:0,bhava:2},
    {name:'Mars',longitude:210,bhava:8},{name:'Mercury',longitude:150,bhava:6},
    {name:'Jupiter',longitude:60,bhava:3},{name:'Venus',longitude:120,bhava:5},
    {name:'Saturn',longitude:270,bhava:1},{name:'Rahu',longitude:240,bhava:9},
    {name:'Ketu',longitude:300,bhava:10}
  ]}
});
eq(bal26WithoutBeneficAspects.rules.find(rule => rule.id === 'XIV-BAL-26').status, 'MATCHED',
  'Balarishta rule 26 matches Saturn/Mars in listed houses without benefic aspects');

const bal26JupiterAspectsMars = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:[
    {name:'Sun',longitude:90,bhava:3},{name:'Moon',longitude:0,bhava:2},
    {name:'Mars',longitude:210,bhava:8},{name:'Mercury',longitude:150,bhava:6},
    {name:'Jupiter',longitude:60,bhava:4},{name:'Venus',longitude:120,bhava:5},
    {name:'Saturn',longitude:270,bhava:1},{name:'Rahu',longitude:240,bhava:9},
    {name:'Ketu',longitude:300,bhava:10}
  ]}
});
eq(bal26JupiterAspectsMars.rules.find(rule => rule.id === 'XIV-BAL-26').status, 'NOT_MATCHED',
  'Balarishta rule 26 does not match when Jupiter aspects Mars');

const bal04AllSourceEvidence = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:[]},
  evidence:{birthWithin48MinutesOfSunriseOrSunset:true,moonsHoraRising:true,
    maleficsInMaleficSignNavamsas:true}
});
eq(bal04AllSourceEvidence.rules.find(rule => rule.id === 'XIV-BAL-04').status,
  'MATCHED', 'Balarishta rule 4 matches when all three printed birth-time/Hora/Navamsa facts are explicit');

const bal04MissingEvidence = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:[]},
  evidence:{birthWithin48MinutesOfSunriseOrSunset:true}
});
eq(bal04MissingEvidence.rules.find(rule => rule.id === 'XIV-BAL-04').status, 'UNKNOWN',
  'Balarishta rule 4 remains UNKNOWN when Hora and malefic-Navamsa facts are missing');

const bal10DasaLordAfflicted = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:[]},
  evidence:{birthDasaLordConjoinedWithManyMalefics:true}
});
eq(bal10DasaLordAfflicted.rules.find(rule => rule.id === 'XIV-BAL-10').status, 'MATCHED',
  'Balarishta rule 10 matches only with explicit source-sensitive Dasa conjunction evidence');

const bal10MissingEvidence = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:[]}
});
eq(bal10MissingEvidence.rules.find(rule => rule.id === 'XIV-BAL-10').status, 'UNKNOWN',
  'Balarishta rule 10 stays UNKNOWN without a validated birth-Dasa conjunction result');

const bal28WeakBadlyPlacedLagnaLord = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:[{name:'Moon',longitude:0,bhava:1}]},
  evidence:{weakPlanets:['Mars'],lagnaLordBadlyPlaced:true,moonSignLordBadlyPlaced:true}
});
eq(bal28WeakBadlyPlacedLagnaLord.rules.find(rule => rule.id === 'XIV-BAL-28').status, 'MATCHED',
  'Balarishta rule 28 matches when a weak Lagna/Moon-sign lord is explicitly badly placed');

const bal28NotWeak = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:[{name:'Moon',longitude:0,bhava:1}]},
  evidence:{weakPlanets:[],lagnaLordBadlyPlaced:true,moonSignLordBadlyPlaced:true}
});
eq(bal28NotWeak.rules.find(rule => rule.id === 'XIV-BAL-28').status, 'NOT_MATCHED',
  'Balarishta rule 28 does not match when the relevant lords are not marked weak');

const bal28MissingPlacement = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:[{name:'Moon',longitude:0,bhava:1}]},
  evidence:{weakPlanets:['Mars']}
});
eq(bal28MissingPlacement.rules.find(rule => rule.id === 'XIV-BAL-28').status, 'UNKNOWN',
  'Balarishta rule 28 remains UNKNOWN without badly-placed evidence');

const bal11SunriseAndMaleficTrikona = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:[
    {name:'Sun',longitude:60,bhava:3},{name:'Moon',longitude:0,bhava:1},
    {name:'Mars',longitude:120,bhava:5},{name:'Mercury',longitude:30,bhava:2},
    {name:'Jupiter',longitude:90,bhava:4},{name:'Venus',longitude:150,bhava:6},
    {name:'Saturn',longitude:270,bhava:10},{name:'Rahu',longitude:240,bhava:9},
    {name:'Ketu',longitude:300,bhava:12}
  ]},evidence:{sunRisingAtBirth:true}
});
eq(bal11SunriseAndMaleficTrikona.rules.find(rule => rule.id === 'XIV-BAL-11').status,
  'MATCHED', 'Balarishta rule 11 matches explicit sunrise evidence, a malefic trine and Venus in 6th');

const bal11MissingSunrise = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:[
    {name:'Sun',longitude:60,bhava:3},{name:'Moon',longitude:0,bhava:1},
    {name:'Mars',longitude:120,bhava:5},{name:'Mercury',longitude:30,bhava:2},
    {name:'Jupiter',longitude:90,bhava:4},{name:'Venus',longitude:150,bhava:6},
    {name:'Saturn',longitude:270,bhava:10},{name:'Rahu',longitude:240,bhava:9},
    {name:'Ketu',longitude:300,bhava:12}
  ]}
});
eq(bal11MissingSunrise.rules.find(rule => rule.id === 'XIV-BAL-11').status, 'UNKNOWN',
  'Balarishta rule 11 remains UNKNOWN without sunrise-at-birth evidence');

const bal15DasaLordAtBirth = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:[]},
  evidence:{birthDasaLord:'Mars'}
});
eq(bal15DasaLordAtBirth.rules.find(rule => rule.id === 'XIV-BAL-15').status, 'MATCHED',
  'Balarishta rule 15 matches when birth Dasa lord is the Lagna/8th lord');

const bal15MissingDasa = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:[]}
});
eq(bal15MissingDasa.rules.find(rule => rule.id === 'XIV-BAL-15').status, 'UNKNOWN',
  'Balarishta rule 15 remains UNKNOWN without birth Dasa/Antardasa evidence');

const bal16AllLordsWithSun = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:[
    {name:'Sun',longitude:270,bhava:9},{name:'Moon',longitude:270,bhava:2},
    {name:'Mars',longitude:270,bhava:3},{name:'Mercury',longitude:60,bhava:4},
    {name:'Jupiter',longitude:90,bhava:5},{name:'Venus',longitude:270,bhava:6},
    {name:'Saturn',longitude:270,bhava:7},{name:'Rahu',longitude:210,bhava:8},
    {name:'Ketu',longitude:300,bhava:10}
  ]},evidence:{navamsaLagnaLord:'Venus'}
});
eq(bal16AllLordsWithSun.rules.find(rule => rule.id === 'XIV-BAL-16').status, 'MATCHED',
  'Balarishta rule 16 matches when Lagna, Navamsa Lagna and Moon-sign lords share the Sun sign');

const bal16MissingNavamsaLagna = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:[
    {name:'Sun',longitude:270,bhava:9},{name:'Moon',longitude:270,bhava:2},
    {name:'Mars',longitude:270,bhava:3},{name:'Mercury',longitude:60,bhava:4},
    {name:'Jupiter',longitude:90,bhava:5},{name:'Venus',longitude:270,bhava:6},
    {name:'Saturn',longitude:270,bhava:7},{name:'Rahu',longitude:210,bhava:8},
    {name:'Ketu',longitude:300,bhava:10}
  ]}
});
eq(bal16MissingNavamsaLagna.rules.find(rule => rule.id === 'XIV-BAL-16').status, 'UNKNOWN',
  'Balarishta rule 16 remains UNKNOWN without Navamsa Lagna lord input');

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
eq(independentMadhyayuRules.rules.find(rule => rule.id === 'XIV-MAD-03').status, 'NOT_MATCHED',
  'Madhyayu rule 3 is a verified negative when all three graha houses are known but the printed pattern is absent');

const madhyayu05SunEnemySignWeak = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:[
    {name:'Sun',longitude:0,bhava:1},{name:'Moon',longitude:60,bhava:3},
    {name:'Mars',longitude:150,bhava:6},{name:'Mercury',longitude:30,bhava:2},
    {name:'Jupiter',longitude:30,bhava:2},{name:'Venus',longitude:120,bhava:5},
    {name:'Saturn',longitude:210,bhava:8},{name:'Rahu',longitude:270,bhava:10},
    {name:'Ketu',longitude:300,bhava:11}
  ]},
  evidence:{sunInEnemySign:true,sunBetweenMalefics:true,weakPlanets:['Sun']}
});
eq(madhyayu05SunEnemySignWeak.rules.find(rule => rule.id === 'XIV-MAD-05').status,
  'MATCHED', 'Madhyayu rule 5 matches the Lagna Sun with explicit enemy-sign, enclosure and weakness evidence');

const madhyayu05MissingEvidence = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:[{name:'Sun',longitude:0,bhava:1}]}
});
eq(madhyayu05MissingEvidence.rules.find(rule => rule.id === 'XIV-MAD-05').status, 'UNKNOWN',
  'Madhyayu rule 5 remains UNKNOWN without enemy-sign, enclosure and strength evidence');

const madhyayu06BirthLordAfflicted = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:[
    {name:'Sun',longitude:0,bhava:1},{name:'Moon',longitude:90,bhava:4},
    {name:'Mars',longitude:180,bhava:6},{name:'Mercury',longitude:120,bhava:5},
    {name:'Jupiter',longitude:210,bhava:8},{name:'Venus',longitude:60,bhava:3},
    {name:'Saturn',longitude:185,bhava:6},{name:'Rahu',longitude:240,bhava:9},
    {name:'Ketu',longitude:300,bhava:10}
  ]}
});
eq(madhyayu06BirthLordAfflicted.rules.find(rule => rule.id === 'XIV-MAD-06').status, 'MATCHED',
  'Madhyayu rule 6 matches a Lagna lord in the 6th with malefic conjunction and no benefic aspect');

const madhyayu06NoConjunction = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:[
    {name:'Sun',longitude:0,bhava:1},{name:'Moon',longitude:90,bhava:4},
    {name:'Mars',longitude:180,bhava:6},{name:'Mercury',longitude:120,bhava:5},
    {name:'Jupiter',longitude:210,bhava:8},{name:'Venus',longitude:60,bhava:3},
    {name:'Saturn',longitude:240,bhava:8},{name:'Rahu',longitude:270,bhava:10},
    {name:'Ketu',longitude:300,bhava:11}
  ]}
});
eq(madhyayu06NoConjunction.rules.find(rule => rule.id === 'XIV-MAD-06').status !== 'MATCHED',
  true, 'Madhyayu rule 6 does not falsely match without malefic conjunction');

const madhyayu07SaturnMoonOtherGrahas = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:[
    {name:'Saturn',longitude:0,bhava:1},{name:'Moon',longitude:210,bhava:8}
  ]},evidence:{otherGrahasInEleventh:true}
});
eq(madhyayu07SaturnMoonOtherGrahas.rules.find(rule => rule.id === 'XIV-MAD-07').status,
  'MATCHED', 'Madhyayu rule 7 matches Saturn in Lagna, Moon in 8th and explicit other-graha-in-11th evidence');

const madhyayu07MissingEvidence = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:[
    {name:'Saturn',longitude:0,bhava:1},{name:'Moon',longitude:210,bhava:8}
  ]}
});
eq(madhyayu07MissingEvidence.rules.find(rule => rule.id === 'XIV-MAD-07').status, 'UNKNOWN',
  'Madhyayu rule 7 remains UNKNOWN without evidence for the other planets');

const madhyayu11PlacementsAndUnfavourableEvidence = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:[
    {name:'Saturn',longitude:0,bhava:1},{name:'Moon',longitude:90,bhava:4},
    {name:'Mars',longitude:180,bhava:7},{name:'Rahu',longitude:270,bhava:10}
  ]},evidence:{jupiterVenusMercuryInUnfavourableHouses:true}
});
eq(madhyayu11PlacementsAndUnfavourableEvidence.rules.find(rule => rule.id === 'XIV-MAD-11').status,
  'MATCHED', 'Madhyayu rule 11 matches the four printed placements with explicit unfavourable-house evidence');

const madhyayu11MissingEvidence = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:[
    {name:'Saturn',longitude:0,bhava:1},{name:'Moon',longitude:90,bhava:4},
    {name:'Mars',longitude:180,bhava:7},{name:'Rahu',longitude:270,bhava:10}
  ]}
});
eq(madhyayu11MissingEvidence.rules.find(rule => rule.id === 'XIV-MAD-11').status, 'UNKNOWN',
  'Madhyayu rule 11 remains UNKNOWN without a validated Jupiter/Venus/Mercury house assessment');

const madhyayu13BeneficsAndMaleficAspect = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:[
    {name:'Sun',longitude:0,bhava:1},{name:'Moon',longitude:90,bhava:4},
    {name:'Mars',longitude:210,bhava:8},{name:'Mercury',longitude:30,bhava:2},
    {name:'Jupiter',longitude:90,bhava:4},{name:'Venus',longitude:270,bhava:10},
    {name:'Saturn',longitude:150,bhava:6},{name:'Rahu',longitude:240,bhava:9},
    {name:'Ketu',longitude:300,bhava:11}
  ]},evidence:{beneficsOccupyKendras:true}
});
eq(madhyayu13BeneficsAndMaleficAspect.rules.find(rule => rule.id === 'XIV-MAD-13').status,
  'MATCHED', 'Madhyayu rule 13 requires benefics in Kendras, no benefic aspect to Lagna and malefic aspect to Lagna lord');

const madhyayu13MissingBeneficEvidence = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:[
    {name:'Sun',longitude:0,bhava:1},{name:'Moon',longitude:90,bhava:4},
    {name:'Mars',longitude:210,bhava:8},{name:'Mercury',longitude:30,bhava:2},
    {name:'Jupiter',longitude:90,bhava:4},{name:'Venus',longitude:270,bhava:10},
    {name:'Saturn',longitude:150,bhava:6},{name:'Rahu',longitude:240,bhava:9},
    {name:'Ketu',longitude:300,bhava:11}
  ]}
});
eq(madhyayu13MissingBeneficEvidence.rules.find(rule => rule.id === 'XIV-MAD-13').status, 'MATCHED',
  'Madhyayu rule 13 derives benefic-Kendra evidence and aspect conditions from the complete natal chart');

const scorpioMadhyayu08 = bvRamanChapterXIVLongevityRules({
  chart: { lagna:{longitude:210}, planets:[
    {name:'Sun',longitude:0,bhava:3},{name:'Moon',longitude:30,bhava:4},
    {name:'Mars',longitude:240,bhava:8},{name:'Mercury',longitude:60,bhava:5},
    {name:'Jupiter',longitude:90,bhava:1},{name:'Venus',longitude:150,bhava:6},
    {name:'Saturn',longitude:180,bhava:10},{name:'Rahu',longitude:240,bhava:8},
    {name:'Ketu',longitude:300,bhava:2}
  ]}
});
eq(scorpioMadhyayu08.rules.find(rule => rule.id === 'XIV-MAD-08').status, 'MATCHED',
  'Madhyayu rule 8 matches Scorpio Lagna, Jupiter in Lagna, Mars and Rahu in 8th');

const ariesJupiterEighthMadhyayu10 = bvRamanChapterXIVLongevityRules({
  chart: { lagna:{longitude:0}, planets:[
    {name:'Sun',longitude:60,bhava:3},{name:'Moon',longitude:30,bhava:4},
    {name:'Mars',longitude:240,bhava:8},{name:'Mercury',longitude:120,bhava:5},
    {name:'Jupiter',longitude:90,bhava:8},{name:'Venus',longitude:150,bhava:6},
    {name:'Saturn',longitude:180,bhava:10},{name:'Rahu',longitude:240,bhava:9},
    {name:'Ketu',longitude:300,bhava:12}
  ]}
});
eq(ariesJupiterEighthMadhyayu10.rules.find(rule => rule.id === 'XIV-MAD-10').status, 'MATCHED',
  'Madhyayu rule 10 matches Aries Lagna, Jupiter in 8th and a malefic in a Kendra');

const exaltedThirdAndEleventhMadhyayu12 = bvRamanChapterXIVLongevityRules({
  chart: { lagna:{longitude:0}, planets:[
    {name:'Sun',longitude:30,bhava:2},{name:'Moon',longitude:60,bhava:5},
    {name:'Mars',longitude:270,bhava:4},{name:'Mercury',longitude:150,bhava:7},
    {name:'Jupiter',longitude:90,bhava:3},{name:'Venus',longitude:330,bhava:1},
    {name:'Saturn',longitude:180,bhava:11},{name:'Rahu',longitude:240,bhava:9},
    {name:'Ketu',longitude:300,bhava:10}
  ]}
});
eq(exaltedThirdAndEleventhMadhyayu12.rules.find(rule => rule.id === 'XIV-MAD-12').status, 'MATCHED',
  'Madhyayu rule 12 requires Mars/Mercury in Kendras, Venus in Lagna and exalted planets in houses 3 and 11');

const notExaltedEleventhMadhyayu12 = bvRamanChapterXIVLongevityRules({
  chart: { lagna:{longitude:0}, planets:[
    {name:'Sun',longitude:30,bhava:2},{name:'Moon',longitude:60,bhava:5},
    {name:'Mars',longitude:270,bhava:4},{name:'Mercury',longitude:150,bhava:7},
    {name:'Jupiter',longitude:90,bhava:3},{name:'Venus',longitude:330,bhava:1},
    {name:'Saturn',longitude:30,bhava:11},{name:'Rahu',longitude:240,bhava:9},
    {name:'Ketu',longitude:300,bhava:10}
  ]}
});
eq(notExaltedEleventhMadhyayu12.rules.find(rule => rule.id === 'XIV-MAD-12').status, 'NOT_MATCHED',
  'Madhyayu rule 12 does not match when house 11 has no exalted planet');

const debilitatedSaturnMadhyayu14 = bvRamanChapterXIVLongevityRules({
  chart: { lagna:{longitude:0}, planets:[
    {name:'Sun',longitude:0,bhava:7},{name:'Moon',longitude:30,bhava:2},
    {name:'Mars',longitude:250,bhava:5},{name:'Mercury',longitude:60,bhava:3},
    {name:'Jupiter',longitude:90,bhava:4},{name:'Venus',longitude:150,bhava:6},
    {name:'Saturn',longitude:20,bhava:3},{name:'Rahu',longitude:240,bhava:9},
    {name:'Ketu',longitude:300,bhava:10}
  ]}
});
eq(debilitatedSaturnMadhyayu14.rules.find(rule => rule.id === 'XIV-MAD-14').status, 'MATCHED',
  'Madhyayu rule 14 matches Mars in 5th, Sun in 7th and Saturn in Aries debilitation');

const exaltedSaturnInsteadMadhyayu14 = bvRamanChapterXIVLongevityRules({
  chart: { lagna:{longitude:0}, planets:[
    {name:'Sun',longitude:0,bhava:7},{name:'Moon',longitude:30,bhava:2},
    {name:'Mars',longitude:250,bhava:5},{name:'Mercury',longitude:60,bhava:3},
    {name:'Jupiter',longitude:90,bhava:4},{name:'Venus',longitude:150,bhava:6},
    {name:'Saturn',longitude:180,bhava:3},{name:'Rahu',longitude:240,bhava:9},
    {name:'Ketu',longitude:300,bhava:10}
  ]}
});
eq(exaltedSaturnInsteadMadhyayu14.rules.find(rule => rule.id === 'XIV-MAD-14').status, 'NOT_MATCHED',
  'Madhyayu rule 14 does not match when Saturn is not debilitated');

const alpayu09SaturnInMaleficOwnedLagna = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:[{name:'Saturn',longitude:0,bhava:1}]},
  evidence:{beneficsInHouses3_6_9_12:true}
});
eq(alpayu09SaturnInMaleficOwnedLagna.rules.find(rule => rule.id === 'XIV-ALP-09').status,
  'MATCHED', 'Alpayu rule 9 matches Saturn in a malefic-owned Lagna when benefic-house evidence is true');

const alpayu09VenusOwnedLagna = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:30},planets:[{name:'Saturn',longitude:30,bhava:1}]},
  evidence:{beneficsInHouses3_6_9_12:true}
});
eq(alpayu09VenusOwnedLagna.rules.find(rule => rule.id === 'XIV-ALP-09').status,
  'NOT_MATCHED', 'Alpayu rule 9 does not match when the Lagna is Venus-owned rather than malefic-owned');

const alpayu09MissingEvidence = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:[{name:'Saturn',longitude:0,bhava:1}]}
});
eq(alpayu09MissingEvidence.rules.find(rule => rule.id === 'XIV-ALP-09').status, 'UNKNOWN',
  'Alpayu rule 9 remains UNKNOWN without the source-specific benefic-house placement result');

const alpayu10LordsTogetherInEighth = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:30},planets:[
    {name:'Sun',longitude:60,bhava:3},{name:'Moon',longitude:0,bhava:2},
    {name:'Mars',longitude:180,bhava:6},{name:'Mercury',longitude:120,bhava:4},
    {name:'Jupiter',longitude:270,bhava:8},{name:'Venus',longitude:30,bhava:8},
    {name:'Saturn',longitude:240,bhava:8},{name:'Rahu',longitude:210,bhava:9},
    {name:'Ketu',longitude:300,bhava:10}
  ]}
});
eq(alpayu10LordsTogetherInEighth.rules.find(rule => rule.id === 'XIV-ALP-10').status,
  'MATCHED', 'Alpayu rule 10 matches when Lagna/8th lords and a malefic join in house 8 without benefic aspects');

const alpayu10NoMaleficInEighth = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:30},planets:[
    {name:'Sun',longitude:60,bhava:3},{name:'Moon',longitude:0,bhava:2},
    {name:'Mars',longitude:180,bhava:6},{name:'Mercury',longitude:120,bhava:4},
    {name:'Jupiter',longitude:270,bhava:8},{name:'Venus',longitude:30,bhava:8},
    {name:'Saturn',longitude:240,bhava:7},{name:'Rahu',longitude:210,bhava:9},
    {name:'Ketu',longitude:300,bhava:10}
  ]}
});
eq(alpayu10NoMaleficInEighth.rules.find(rule => rule.id === 'XIV-ALP-10').status,
  'NOT_MATCHED', 'Alpayu rule 10 does not match when the 8th house has no malefic');

const madhyayu09AfflictedMoon = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:[
    {name:'Sun',longitude:300,bhava:10},{name:'Moon',longitude:10,bhava:4},
    {name:'Mars',longitude:180,bhava:7},{name:'Mercury',longitude:60,bhava:3},
    {name:'Jupiter',longitude:120,bhava:5},{name:'Venus',longitude:90,bhava:6},
    {name:'Saturn',longitude:185,bhava:4},{name:'Rahu',longitude:215,bhava:8},
    {name:'Ketu',longitude:245,bhava:9}
  ]}
});
eq(madhyayu09AfflictedMoon.rules.find(rule => rule.id === 'XIV-MAD-09').status,
  'MATCHED', 'Madhyayu rule 9 matches the 8th lord in house 7 with Moon conjunct a malefic');

const madhyayu09EighthLordElsewhere = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:[
    {name:'Sun',longitude:300,bhava:10},{name:'Moon',longitude:10,bhava:4},
    {name:'Mars',longitude:180,bhava:6},{name:'Mercury',longitude:60,bhava:3},
    {name:'Jupiter',longitude:120,bhava:5},{name:'Venus',longitude:90,bhava:6},
    {name:'Saturn',longitude:185,bhava:4},{name:'Rahu',longitude:215,bhava:8},
    {name:'Ketu',longitude:245,bhava:9}
  ]}
});
eq(madhyayu09EighthLordElsewhere.rules.find(rule => rule.id === 'XIV-MAD-09').status,
  'NOT_MATCHED', 'Madhyayu rule 9 does not match when the 8th lord is outside house 7');

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