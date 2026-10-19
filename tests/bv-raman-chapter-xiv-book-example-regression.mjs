import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {
  BV_RAMAN_HPA_CHAPTER_XIV_SOURCE,
  BV_RAMAN_HPA_CHAPTER_XIV_SOURCE_RULE_INVENTORY,
  bvRamanChapterXIVLongevityRules
} from '../public/horoscope/offline/bv-raman-hpa-ayurdaya-combined.browser.mjs';

let assertions = 0;
const ruleCaseResults = [];
function eq(actual, expected, message) {
  assert.deepEqual(actual, expected, message);
  assertions++;
}
function ok(value, message) {
  assert.ok(value, message);
  assertions++;
}

const GRAHAS = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu'];
const DEFAULT_HOUSES = Object.freeze({
  Sun:3, Moon:5, Mars:6, Mercury:2, Jupiter:9, Venus:11, Saturn:12, Rahu:10, Ketu:4
});
function makeChart({houses={}, signs={}, degrees={}, lagnaLongitude=0, omit=[]}={}) {
  const lagnaSign = Math.floor(((lagnaLongitude % 360) + 360) % 360 / 30);
  return {
    lagna:{longitude:lagnaLongitude},
    planets:GRAHAS.filter(name=>!omit.includes(name)).map(name=>{
      const house = houses[name] ?? DEFAULT_HOUSES[name];
      const sign = signs[name] ?? ((lagnaSign + house - 1) % 12);
      const degree = degrees[name] ?? 5;
      return {name,longitude:sign*30+degree,bhava:house};
    })
  };
}
const sourceRules = new Map(BV_RAMAN_HPA_CHAPTER_XIV_SOURCE_RULE_INVENTORY.map(rule=>[rule.id,rule]));
eq(BV_RAMAN_HPA_CHAPTER_XIV_SOURCE.chapter,'XIV — Ayurdaya or Longevity',
  'the test oracle is tied to B. V. Raman HPA Chapter XIV');
eq(sourceRules.size,76,'the printed Chapter XIV inventory has 76 distinct rule IDs');

function ruleCase(id, expected, chartInput={}, evidence={}, description='source-rule fixture') {
  const result = bvRamanChapterXIVLongevityRules({chart:makeChart(chartInput),evidence});
  const rule = result.rules.find(item=>item.id===id);
  ok(!!rule,description+': runtime trace contains '+id);
  eq(rule.implemented,true,description+': '+id+' has an evaluator, not just an index entry');
  eq(rule.status,expected,description+': '+id+' — '+rule.title);
  const source = sourceRules.get(id);
  ok(!!source,description+': '+id+' has a source rule record');
  eq(rule.sourcePrintedPage,source.sourcePrintedPage,
    description+': '+id+' keeps the printed page mapping');
  eq(rule.sourceRuleNumber,source.sourceRuleNumber,
    description+': '+id+' keeps the source rule number');
  ruleCaseResults.push({
    id,category:rule.category,sourceRuleNumber:source.sourceRuleNumber,
    sourcePrintedPage:source.sourcePrintedPage,sourceDescription:source.sourceDescription,
    title:rule.title,expected,status:rule.status,implemented:rule.implemented===true,
    fixtureDescription:description,
    chartInput:JSON.parse(JSON.stringify(chartInput)),
    evidence:JSON.parse(JSON.stringify(evidence))
  });
}
function statuses(id, values, label) {
  for (const item of values) ruleCase(id,item.expected,item.chart||{},item.evidence||{},label+' / '+item.label);
}

// These are positive/negative unit fixtures encoded from the printed rule
// statements on HPA pp. 64–72. They are source-rule tests, not invented claims
// that these constructed placements are historical birth charts printed by Raman.
statuses('XIV-BAL-01',[
 {label:'malefic at last Navamsa degree',expected:'MATCHED',chart:{degrees:{Saturn:26.8}}},
 {label:'malefic clearly before the last Navamsa',expected:'NOT_MATCHED',chart:{degrees:{Saturn:26.5}}},
 {label:'missing all candidate malefic longitudes',expected:'UNKNOWN',chart:{omit:['Sun','Mars','Saturn','Rahu','Ketu']}}
],'HPA p.64 Balarishta 1');
statuses('XIV-BAL-03',[
 {label:'Moon in 8 with same-house Mars and no benefic aspect',expected:'MATCHED',
  chart:{houses:{Sun:3,Moon:8,Mars:8,Mercury:4,Jupiter:5,Venus:3,Saturn:6,Rahu:10,Ketu:11}}},
 {label:'Moon outside 7/8/12',expected:'NOT_MATCHED',
  chart:{houses:{Sun:3,Moon:5,Mars:5,Mercury:4,Jupiter:7,Venus:3,Saturn:6,Rahu:10,Ketu:11}}},
 {label:'Moon house missing',expected:'UNKNOWN',chart:{omit:['Moon']}}
],'HPA p.64 Balarishta 3');
statuses('XIV-BAL-05',[
 {label:'malefics occupy 2, 6, 8 and 12',expected:'MATCHED',
  chart:{houses:{Sun:2,Mars:6,Saturn:8,Rahu:12,Ketu:3}}},
 {label:'house 2 has no malefic',expected:'NOT_MATCHED',
  chart:{houses:{Sun:3,Mars:6,Saturn:8,Rahu:12,Ketu:3}}}
],'HPA p.64 Balarishta 5');
statuses('XIV-BAL-06',[
 {label:'weak Moon in Ascendant and malefic in Kendra',expected:'MATCHED',
  chart:{houses:{Moon:1,Mars:10,Rahu:11,Saturn:5,Ketu:12},},evidence:{weakPlanets:['Moon']}},
 {label:'Moon weak but no malefic in Kendra',expected:'NOT_MATCHED',
  chart:{houses:{Moon:1,Mars:6,Rahu:11,Saturn:5,Ketu:12}},evidence:{weakPlanets:['Moon']}},
 {label:'weakness evidence absent',expected:'UNKNOWN',
  chart:{houses:{Moon:1,Mars:10}},evidence:{}}
],'HPA p.64 Balarishta 6');
statuses('XIV-BAL-08',[
 {label:'Moon weak in Ascendant plus stated malefic aspects',expected:'MATCHED',
  chart:{houses:{Moon:1}},evidence:{weakPlanets:['Moon'],maleficsAspectingHouses5_8_12:true}},
 {label:'placement matches but the aspect condition is false',expected:'NOT_MATCHED',
  chart:{houses:{Moon:1}},evidence:{weakPlanets:['Moon'],maleficsAspectingHouses5_8_12:false}},
 {label:'required aspect observation missing',expected:'UNKNOWN',
  chart:{houses:{Moon:1}},evidence:{weakPlanets:['Moon']}}
],'HPA p.64 Balarishta 8');
statuses('XIV-BAL-04',[
 {label:'all three printed sunrise/Moon-hora/Navamsa predicates reported true',expected:'MATCHED',
  evidence:{birthWithin48MinutesOfSunriseOrSunset:true,moonsHoraRising:true,maleficsInMaleficSignNavamsas:true}},
 {label:'one required condition reported false',expected:'NOT_MATCHED',
  evidence:{birthWithin48MinutesOfSunriseOrSunset:true,moonsHoraRising:false,maleficsInMaleficSignNavamsas:true}},
 {label:'sunrise/hora evidence absent',expected:'UNKNOWN',evidence:{}}
],'HPA p.64 Balarishta 4');
statuses('XIV-BAL-13',[
 {label:'Ketu in 4 with Mars in the same house',expected:'MATCHED',
  chart:{houses:{Sun:6,Moon:1,Mars:4,Mercury:2,Jupiter:5,Venus:9,Saturn:5,Rahu:11,Ketu:4}}},
 {label:'Ketu in 4 without malefic conjunction/aspect',expected:'NOT_MATCHED',
  chart:{houses:{Sun:6,Moon:1,Mars:3,Mercury:2,Jupiter:5,Venus:9,Saturn:5,Rahu:11,Ketu:4}}}
],'HPA p.65 Balarishta 13');
statuses('XIV-BAL-14',[
 {label:'Rahu in 7 and both luminaries aspect it',expected:'MATCHED',
  chart:{houses:{Sun:1,Moon:1,Rahu:7,Mars:5,Mercury:4,Jupiter:8,Venus:6,Saturn:10,Ketu:12}}},
 {label:'Rahu in 7 but Moon does not aspect it',expected:'NOT_MATCHED',
  chart:{houses:{Sun:1,Moon:2,Rahu:7,Mars:5,Mercury:4,Jupiter:8,Venus:6,Saturn:10,Ketu:12}}}
],'HPA p.65 Balarishta 14');
statuses('XIV-BAL-18',[
 {label:'Moon 8, Mars 7, Saturn 1',expected:'MATCHED',
  chart:{houses:{Moon:8,Mars:7,Saturn:1}}},
 {label:'Mars not in 7',expected:'NOT_MATCHED',
  chart:{houses:{Moon:8,Mars:6,Saturn:1}}}
],'HPA p.65 Balarishta 18');
statuses('XIV-BAL-19',[
 {label:'Saturn third aspect lands on Moon',expected:'MATCHED',chart:{houses:{Saturn:1,Moon:3}}},
 {label:'Moon is not in Saturn third aspect',expected:'NOT_MATCHED',chart:{houses:{Saturn:1,Moon:4}}},
 {label:'Moon placement unavailable',expected:'UNKNOWN',chart:{omit:['Moon']}}
],'HPA p.65 Balarishta 19');
statuses('XIV-BAL-10',[
 {label:'birth Dasa lord explicitly reported conjunct many malefics',expected:'MATCHED',
  evidence:{birthDasaLord:'Venus',birthDasaLordConjoinedWithManyMalefics:true}},
 {label:'Dasa lord conjunction condition explicitly false',expected:'NOT_MATCHED',
  evidence:{birthDasaLord:'Venus',birthDasaLordConjoinedWithManyMalefics:false}},
 {label:'Dasa name known but conjunction evidence absent',expected:'UNKNOWN',
  evidence:{birthDasaLord:'Venus'}}
],'HPA p.65 Balarishta 10');
statuses('XIV-BAL-15',[
 {label:'birth Dasa lord is Lagna/eighth lord',expected:'MATCHED',
  chart:{lagnaLongitude:0},evidence:{birthDasaLord:'Mars'}},
 {label:'both known periods are unrelated to Lagna/eighth lord',expected:'NOT_MATCHED',
  chart:{lagnaLongitude:0},evidence:{birthDasaLord:'Venus',birthAntardasaLord:'Mercury'}},
 {label:'birth Dasa and Antardasa unavailable',expected:'UNKNOWN',evidence:{}}
],'HPA p.65 Balarishta 15');
statuses('XIV-BAL-28',[
 {label:'weak Lagna lord and poor placement expressly supported',expected:'MATCHED',
  chart:{lagnaLongitude:0},evidence:{weakPlanets:['Mars'],lagnaLordBadlyPlaced:true}},
 {label:'Lagna lord not weak',expected:'NOT_MATCHED',
  chart:{lagnaLongitude:0},evidence:{weakPlanets:[],lagnaLordBadlyPlaced:true}},
 {label:'bad placement evidence missing',expected:'UNKNOWN',
  chart:{lagnaLongitude:0},evidence:{weakPlanets:['Mars']}}
],'HPA p.66 Balarishta 28');
statuses('XIV-BAL-20',[
 {label:'Moon 8 with no graha aspect',expected:'MATCHED',
  chart:{houses:{Sun:3,Moon:8,Mars:7,Mercury:4,Jupiter:10,Venus:9,Saturn:3,Rahu:11,Ketu:12}}},
 {label:'Moon outside 6/8',expected:'NOT_MATCHED',chart:{houses:{Moon:5}}}
],'HPA p.65 Balarishta 20');
statuses('XIV-BAL-21',[
 {label:'Moon in Ascendant conjunct malefic and unprotected',expected:'MATCHED',
  chart:{houses:{Sun:3,Moon:1,Mars:1,Mercury:4,Jupiter:4,Venus:3,Saturn:6,Rahu:9,Ketu:10}}},
 {label:'Moon in Ascendant but with benefic aspect',expected:'NOT_MATCHED',
  chart:{houses:{Sun:3,Moon:1,Mars:1,Mercury:4,Jupiter:7,Venus:3,Saturn:6,Rahu:9,Ketu:10}}}
],'HPA p.65 Balarishta 21');
statuses('XIV-BAL-22',[
 {label:'Moon Ascendant, Rahu and Mars 8',expected:'MATCHED',
  chart:{houses:{Moon:1,Rahu:8,Mars:8}}},
 {label:'Rahu not in 8',expected:'NOT_MATCHED',chart:{houses:{Moon:1,Rahu:7,Mars:8}}}
],'HPA p.65 Balarishta 22');
statuses('XIV-BAL-23',[
 {label:'Sun/Saturn Ascendant, Rahu/Mars 8',expected:'MATCHED',
  chart:{houses:{Sun:1,Saturn:1,Rahu:8,Mars:8}}},
 {label:'Saturn not in Ascendant',expected:'NOT_MATCHED',
  chart:{houses:{Sun:1,Saturn:2,Rahu:8,Mars:8}}}
],'HPA p.65 Balarishta 23');
statuses('XIV-BAL-24',[
 {label:'malefics 5/8/9 plus unprotected Sun in Ascendant',expected:'MATCHED',
  chart:{houses:{Sun:1,Moon:3,Mars:5,Mercury:2,Jupiter:4,Venus:3,Saturn:8,Rahu:9,Ketu:6}}},
 {label:'no malefic in 9',expected:'NOT_MATCHED',
  chart:{houses:{Sun:1,Moon:3,Mars:5,Mercury:2,Jupiter:4,Venus:3,Saturn:8,Rahu:10,Ketu:6}}}
],'HPA p.65 Balarishta 24');
statuses('XIV-BAL-27',[
 {label:'Moon at Aries 26 degrees in a Kendra',expected:'MATCHED',
  chart:{houses:{Moon:1},signs:{Moon:0},degrees:{Moon:26.5}}},
 {label:'Moon at a non-Mrityubhaga degree',expected:'NOT_MATCHED',
  chart:{houses:{Moon:1},signs:{Moon:0},degrees:{Moon:25.5}}}
],'HPA p.66 Balarishta 27');
statuses('XIV-BAL-29',[
 {label:'Moon 8 receives Saturn and Jupiter aspects',expected:'MATCHED',
  chart:{houses:{Moon:8,Saturn:6,Jupiter:4,Mars:3,Sun:3,Mercury:2,Venus:9,Rahu:11,Ketu:12}}},
 {label:'Moon 8 lacks benefic aspect',expected:'NOT_MATCHED',
  chart:{houses:{Moon:8,Saturn:3,Jupiter:5,Mars:3,Sun:3,Mercury:2,Venus:9,Rahu:11,Ketu:12}}}
],'HPA p.66 Balarishta 29');

// Source-rule inputs which are not all inferable from longitude/house alone
// are tested as explicit true / false / absent facts. An absent fact must not
// be silently treated as false.
statuses('XIV-ANT-01',[
 {label:'strong Jupiter in Ascendant',expected:'MATCHED',chart:{houses:{Jupiter:1}},evidence:{strongPlanets:['Jupiter']}},
 {label:'Jupiter not in Ascendant',expected:'NOT_MATCHED',chart:{houses:{Jupiter:2}},evidence:{strongPlanets:['Jupiter']}},
 {label:'strength not supplied',expected:'UNKNOWN',chart:{houses:{Jupiter:1}},evidence:{}}
],'HPA p.66 Antidote 1');
statuses('XIV-ANT-02',[
 {label:'strong Lagna lord Mars receives Jupiter aspect',expected:'MATCHED',
  chart:{houses:{Mars:1,Jupiter:5}},evidence:{strongPlanets:['Mars']}},
 {label:'Lagna lord not strong',expected:'NOT_MATCHED',
  chart:{houses:{Mars:1,Jupiter:5}},evidence:{strongPlanets:[]}}
],'HPA p.66 Antidote 2');
statuses('XIV-ANT-03',[
 {label:'Moon 8 in a stated benefic Drekkana',expected:'MATCHED',chart:{houses:{Moon:8}},evidence:{moonDrekkanaBenefic:true}},
 {label:'Drekkana explicitly not benefic',expected:'NOT_MATCHED',chart:{houses:{Moon:8}},evidence:{moonDrekkanaBenefic:false}},
 {label:'Drekkana not supplied',expected:'UNKNOWN',chart:{houses:{Moon:8}},evidence:{}}
],'HPA p.67 Antidote 3');
statuses('XIV-ANT-04',[
 {label:'source full-Moon/benefic/aspect condition true',expected:'MATCHED',evidence:{fullMoonInBeneficSignAndWellAspected:true}},
 {label:'source condition false',expected:'NOT_MATCHED',evidence:{fullMoonInBeneficSignAndWellAspected:false}},
 {label:'no full-Moon observation',expected:'UNKNOWN',evidence:{}}
],'HPA p.67 Antidote 4');
statuses('XIV-ANT-05',[
 {label:'Mercury is explicitly strong',expected:'MATCHED',evidence:{strongPlanets:['Mercury']}},
 {label:'all three named benefics explicitly not strong',expected:'NOT_MATCHED',evidence:{strongPlanets:[]}},
 {label:'strength not supplied',expected:'UNKNOWN',evidence:{}}
],'HPA p.67 Antidote 5');
statuses('XIV-ANT-06',[
 {label:'Moon 6 and benefic Drekkana',expected:'MATCHED',chart:{houses:{Moon:6},},evidence:{moonDrekkanaBenefic:true}},
 {label:'Moon not in 6',expected:'NOT_MATCHED',chart:{houses:{Moon:5}},evidence:{moonDrekkanaBenefic:true}},
 {label:'Drekkana unknown',expected:'UNKNOWN',chart:{houses:{Moon:6}},evidence:{}}
],'HPA p.67 Antidote 6');
statuses('XIV-ANT-07',[
 {label:'Full Moon between benefics fact true',expected:'MATCHED',evidence:{fullMoonBetweenBenefics:true}},
 {label:'explicitly not enclosed',expected:'NOT_MATCHED',evidence:{fullMoonBetweenBenefics:false}},
 {label:'no enclosure evidence',expected:'UNKNOWN',evidence:{}}
],'HPA p.67 Antidote 7');
statuses('XIV-ANT-09',[
 {label:'full Moon aspects Lagna and Jupiter is in a Kendra',expected:'MATCHED',
  chart:{houses:{Jupiter:4}},evidence:{fullMoonAspectsLagna:true}},
 {label:'Jupiter is not in a Kendra',expected:'NOT_MATCHED',
  chart:{houses:{Jupiter:3}},evidence:{fullMoonAspectsLagna:true}},
 {label:'full-Moon Lagna aspect is unknown',expected:'UNKNOWN',
  chart:{houses:{Jupiter:4}},evidence:{}}
],'HPA p.67 Antidote 9');
statuses('XIV-ANT-10',[
 {label:'benefic Shadvarga protection explicitly present',expected:'MATCHED',evidence:{maleficsInBeneficShadvargasWithBeneficAspect:true}},
 {label:'protection explicitly absent',expected:'NOT_MATCHED',evidence:{maleficsInBeneficShadvargasWithBeneficAspect:false}},
 {label:'Shadvarga result not supplied',expected:'UNKNOWN',evidence:{}}
],'HPA p.67 Antidote 10');

statuses('XIV-ALP-01',[
 {label:'Saturn 8, Mars 5, Ketu 1',expected:'MATCHED',chart:{houses:{Saturn:8,Mars:5,Ketu:1}}},
 {label:'Ketu not in Ascendant',expected:'NOT_MATCHED',chart:{houses:{Saturn:8,Mars:5,Ketu:2}}}
],'HPA p.69 Alpayu 1');
statuses('XIV-ALP-03',[
 {label:'Saturn 1, Sun/Moon/Mars all 7',expected:'MATCHED',chart:{houses:{Saturn:1,Sun:7,Moon:7,Mars:7}}},
 {label:'Mars not in 7',expected:'NOT_MATCHED',chart:{houses:{Saturn:1,Sun:7,Moon:7,Mars:6}}}
],'HPA p.69 Alpayu 3');
statuses('XIV-ALP-04',[
 {label:'Aries Lagna: eighth lord Mars and Ketu in Ascendant',expected:'MATCHED',
  chart:{houses:{Mars:1,Ketu:1},lagnaLongitude:0}},
 {label:'Ketu not in Ascendant',expected:'NOT_MATCHED',
  chart:{houses:{Mars:1,Ketu:2},lagnaLongitude:0}}
],'HPA p.69 Alpayu 4');
statuses('XIV-ALP-05',[
 {label:'malefic occupies Ascendant and Moon is conjunct it',expected:'MATCHED',chart:{houses:{Mars:1,Moon:1}}},
 {label:'Moon not conjunct Ascendant malefic',expected:'NOT_MATCHED',chart:{houses:{Mars:1,Moon:2}}}
],'HPA p.69 Alpayu 5');
statuses('XIV-ALP-06',[
 {label:'Aries Lagna eighth lord/Lagna lord Mars weak in Ascendant',expected:'MATCHED',
  chart:{houses:{Mars:1},lagnaLongitude:0},evidence:{weakPlanets:['Mars']}},
 {label:'Mars not weak',expected:'NOT_MATCHED',
  chart:{houses:{Mars:1},lagnaLongitude:0},evidence:{weakPlanets:[]}},
 {label:'weakness unknown',expected:'UNKNOWN',
  chart:{houses:{Mars:1},lagnaLongitude:0},evidence:{}}
],'HPA p.69 Alpayu 6');
statuses('XIV-ALP-07',[
 {label:'Scorpio Lagna, Sun/Jupiter 1, eighth lord Mercury in Kendra',expected:'MATCHED',
  chart:{lagnaLongitude:210,houses:{Sun:1,Jupiter:1,Mercury:4}}},
 {label:'eighth lord Mercury outside Kendra',expected:'NOT_MATCHED',
  chart:{lagnaLongitude:210,houses:{Sun:1,Jupiter:1,Mercury:5}}}
],'HPA p.70 Alpayu 7');
statuses('XIV-ALP-08',[
 {label:'Rahu 7, Moon 8, Jupiter 1',expected:'MATCHED',chart:{houses:{Rahu:7,Moon:8,Jupiter:1}}},
 {label:'Jupiter not in Ascendant',expected:'NOT_MATCHED',chart:{houses:{Rahu:7,Moon:8,Jupiter:2}}}
],'HPA p.70 Alpayu 8');
statuses('XIV-ALP-14',[
 {label:'explicit strong-malefic/no-benefic-aspect result true',expected:'MATCHED',
  evidence:{strongMaleficsInKendrasWithoutBeneficAspects:true}},
 {label:'explicit result false',expected:'NOT_MATCHED',
  evidence:{strongMaleficsInKendrasWithoutBeneficAspects:false}},
 {label:'strength/aspect observation missing',expected:'UNKNOWN',evidence:{}}
],'HPA p.70 Alpayu 14');

statuses('XIV-MAD-04',[
 {label:'all planets in the printed middle four houses',expected:'MATCHED',evidence:{allPlanetsMiddleFourHouses:true}},
 {label:'not all planets in middle four',expected:'NOT_MATCHED',evidence:{allPlanetsMiddleFourHouses:false}},
 {label:'middle-house classification missing',expected:'UNKNOWN',evidence:{}}
],'HPA p.70 Madhyayu 4');
statuses('XIV-MAD-15',[
 {label:'benefics in Kendra/Trikona and powerful Saturn',expected:'MATCHED',
  evidence:{beneficsInKendrasAndTrikonas:true,strongPlanets:['Saturn']}},
 {label:'Saturn not powerful',expected:'NOT_MATCHED',
  evidence:{beneficsInKendrasAndTrikonas:true,strongPlanets:[]}},
 {label:'benefic-placement evidence missing',expected:'UNKNOWN',evidence:{strongPlanets:['Saturn']}}
],'HPA p.71 Madhyayu 15');
statuses('XIV-MAD-02',[
 {label:'two relevant lords explicitly powerful',expected:'MATCHED',
  evidence:{strongPlanets:['Mars','Jupiter','Venus','Saturn']}},
 {label:'none of the relevant lords powerful',expected:'NOT_MATCHED',evidence:{strongPlanets:[],weakPlanets:[]}},
 {label:'strength evidence absent',expected:'UNKNOWN',evidence:{}}
],'HPA p.70 Madhyayu 2');

statuses('XIV-PUR-01',[
 {label:'Taurus Lagna lord Venus aspects 1; eighth lord Jupiter aspects 8; Jupiter Kendra',
  expected:'MATCHED',chart:{lagnaLongitude:30,houses:{Venus:7,Jupiter:4}}},
 {label:'Lagna lord fails to aspect Ascendant',expected:'NOT_MATCHED',
  chart:{lagnaLongitude:30,houses:{Venus:6,Jupiter:4}}}
],'HPA p.71 Purnayu 1');
statuses('XIV-PUR-03',[
 {label:'Jupiter Kendra from Lagna lord and no malefics in Kendras',expected:'MATCHED',
  chart:{houses:{Sun:3,Moon:2,Mars:5,Mercury:6,Jupiter:8,Venus:9,Saturn:6,Rahu:11,Ketu:12}}},
 {label:'malefic Saturn in a Kendra defeats the condition',expected:'NOT_MATCHED',
  chart:{houses:{Sun:3,Moon:2,Mars:5,Mercury:6,Jupiter:8,Venus:9,Saturn:10,Rahu:11,Ketu:12}}}
],'HPA p.72 Purnayu 3');
statuses('XIV-PUR-04',[
 {label:'Cancer Lagna, Jupiter 1 (exalted)',expected:'MATCHED',
  chart:{lagnaLongitude:90,houses:{Jupiter:1}}},
 {label:'Jupiter not in Lagna',expected:'NOT_MATCHED',
  chart:{lagnaLongitude:90,houses:{Jupiter:2}}}
],'HPA p.72 Purnayu 4');
statuses('XIV-PUR-05',[
 {label:'Lagna lord and Sun 10, Saturn 1, Jupiter 4',expected:'MATCHED',
  chart:{houses:{Mars:10,Sun:10,Saturn:1,Jupiter:4}}},
 {label:'Jupiter not in 4',expected:'NOT_MATCHED',
  chart:{houses:{Mars:10,Sun:10,Saturn:1,Jupiter:5}}}
],'HPA p.72 Purnayu 5');
statuses('XIV-PUR-06',[
 {label:'Jupiter 1, Venus 4, Saturn/Moon 10',expected:'MATCHED',
  chart:{houses:{Jupiter:1,Venus:4,Saturn:10,Moon:10}}},
 {label:'Moon not in 10',expected:'NOT_MATCHED',
  chart:{houses:{Jupiter:1,Venus:4,Saturn:10,Moon:9}}}
],'HPA p.72 Purnayu 6');

// Evidence from the actual historical examples printed on pp. 68–69 is
// transcribed separately from synthetic chart fixtures. Horoscope No. 1 says
// Venus is the birth Dasa lord and is conjunct Saturn/Ketu, with Rahu aspecting
// Venus. That statement is a direct positive oracle for the Dasa-lord
// conjunction input; it does not certify a lifespan or reconstruct an entire
// chart from illegible/ambiguous sign symbols.
const bookExample1 = Object.freeze({
  id:'HPA-XIV-HOROSCOPE-1',
  printedPage:68,
  birthDate:'1928-01-11',
  longitudeEastDegrees:74,
  latitudeNorthDegrees:12,
  ghatisAfterSunrise:7,
  birthDasaLord:'Venus',
  explicitlyReportedConjunctions:['Saturn','Ketu'],
  explicitlyReportedAspectFrom:'Rahu',
  statedConditions:[
    {ruleId:'XIV-BAL-02',predicate:'Moon in the 7th Kendra and aspected by Saturn',sourceStatus:'explicitly stated on printed p.68'},
    {ruleId:'XIV-BAL-03',predicate:'Moon in house 7 with malefic Saturn aspect and without benefic aspects',sourceStatus:'explicitly stated on printed p.68'},
    {ruleId:'XIV-BAL-10',predicate:'Birth Dasa lord Venus conjoined Saturn and Ketu',sourceStatus:'explicitly stated on printed p.68'}
  ],
  sourceStatement:'Printed p.68 states Moon in the 7th Kendra powerfully aspected by Saturn without benefic aspects; birth Dasa lord Venus joins Saturn and Ketu and receives Rahu aspect. The test replays only these stated predicates and does not claim to reconstruct the entire chart.'
});
eq(bookExample1.printedPage,68,'the worked-example metadata points to scanned HPA printed page 68');
eq(bookExample1.birthDasaLord,'Venus','worked-example birth Dasa lord is transcribed from the source');
eq(bookExample1.explicitlyReportedConjunctions,['Saturn','Ketu'],
  'worked-example conjunction participants are transcribed from the source');
eq(bookExample1.explicitlyReportedAspectFrom,'Rahu',
  'worked-example aspect participant is transcribed from the source');
eq(bookExample1.statedConditions.map(item=>item.ruleId),
  ['XIV-BAL-02','XIV-BAL-03','XIV-BAL-10'],
  'HPA printed p.68 Horoscope No.1 maps its three explicit statements to separate rule predicates');

// This is deliberately a predicate replay, not a claimed reconstruction of every
// sign/longitude on Rasi Chart No.2. Its houses encode only the prose-stated
// Moon-in-7th / Saturn-aspect condition and avoid a benefic aspect to Moon.
const bookExample1MoonPredicate = {
  houses:{Sun:2,Moon:7,Mars:3,Mercury:4,Jupiter:4,Venus:6,Saturn:1,Rahu:8,Ketu:9}
};
ruleCase('XIV-BAL-02','MATCHED',bookExample1MoonPredicate,{},
  'HPA printed p.68 Horoscope No.1 predicate replay: Moon in 7th Kendra receives Saturn aspect');
ruleCase('XIV-BAL-03','MATCHED',bookExample1MoonPredicate,{},
  'HPA printed p.68 Horoscope No.1 predicate replay: Moon in 7th with Saturn aspect and no benefic aspect');
ruleCase('XIV-BAL-10','MATCHED',{},{
  birthDasaLord:bookExample1.birthDasaLord,
  birthDasaLordConjoinedWithManyMalefics:true
},'HPA p.68 Horoscope No.1: the book-stated Venus/Saturn/Ketu configuration is wired into Balarishta 10');
ruleCase('XIV-BAL-10','UNKNOWN',{},{
  birthDasaLord:bookExample1.birthDasaLord
},'HPA p.68 Horoscope No.1: do not derive conjunction from a Dasa name alone');

// The next two source examples contain facts whose full calculated positions
// or classical aspects cannot safely be recovered from the printed prose alone.
// They are retained as source-trace tests: no rule is forced to MATCH just
// because an unrelated risk/cancellation narrative is reported.
const bookExample2 = Object.freeze({
  id:'HPA-XIV-HOROSCOPE-2',
  printedPage:68,
  birthDate:'1912-08-06',
  birthTimeAfterSunrise:'42 ghatis 30 vighatis',
  birthDasaLord:'Sun',
  statedFacts:['Ascendant between Rahu and Saturn','Moon afflicted by a malefic Saturn','Saturn strongly aspects birth Dasa lord'],
  ruleMappingGaps:[
    {textFact:'Ascendant between Rahu and Saturn',ruleId:null,reason:'No source-numbered rule in the current inventory maps this exact phrase without the complete chart geometry.'},
    {textFact:'Moon afflicted by Saturn',ruleId:'XIV-BAL-19',reason:'“Afflicted” alone does not establish Saturn’s exact third-aspect geometry.'},
    {textFact:'Saturn aspects birth Dasa lord Sun',ruleId:'XIV-BAL-10',reason:'The numbered predicate requires conjunction with many malefics; an aspect is not silently substituted for conjunction.'}
  ],
  sourceNote:'The paragraph provides these interpretive facts; exact evaluated house/aspect geometry is not guessed from prose.'
});
const bookExample3 = Object.freeze({
  id:'HPA-XIV-HOROSCOPE-3',
  printedPage:69,
  birthDate:'1875-02-12',
  statedFacts:['malefics flank Ascendant','Moon under Rahu influence','Rahu strongly aspected by Mars and Ketu','Jupiter in a quadrant is cited as redemption'],
  redemptionEvidence:{planet:'Jupiter',placement:'quadrant (house 4 in the predicate replay)',strengthExplicitlyReported:true},
  ruleMappingGaps:[
    {textFact:'Malefics flank Ascendant',ruleId:null,reason:'The prose alone does not specify all house occupancies / sign-based positions for a rule-level reconstruction.'},
    {textFact:'Moon under Rahu influence',ruleId:null,reason:'The exact conjunction/aspect and other rule predicates require chart geometry.'},
    {textFact:'Rahu aspected by Mars and Ketu',ruleId:null,reason:'The exact aspect pattern is recorded as source narrative but not promoted to an unnumbered evaluator.'},
    {textFact:'Strong Jupiter in a quadrant redeems Balarishta',ruleId:'XIV-ANT-05',reason:'This supports the general strong-Jupiter antidote; the complete cancellation precedence still requires source rule/exception coverage.'}
  ],
  sourceNote:'Keep the historical narrative and its Jupiter protection distinct from rule matches; do not select a final category or lifespan without full rule and cancellation precedence.'
});
eq(bookExample2.printedPage,68,'HPA Horoscope No.2 retains its printed source page');
eq(bookExample2.birthDasaLord,'Sun','HPA Horoscope No.2 birth Dasa lord is preserved');
ok(bookExample2.statedFacts.length===3,'HPA Horoscope No.2 records each stated fact separately');
eq(bookExample3.printedPage,69,'HPA Horoscope No.3 retains its printed source page');
ok(bookExample3.statedFacts.length===4,'HPA Horoscope No.3 records affliction and protection facts separately');
eq(bookExample3.redemptionEvidence.planet,'Jupiter','HPA Horoscope No.3 explicitly names Jupiter as the protective planet');
eq(bookExample3.redemptionEvidence.placement,'quadrant (house 4 in the predicate replay)',
  'HPA Horoscope No.3 records the reported quadrant without claiming chart reconstruction');
eq(bookExample2.ruleMappingGaps[2].ruleId,'XIV-BAL-10',
  'HPA Horoscope No.2 aspect is not substituted for the Dasa-lord conjunction predicate');
const sourceExample2Trace = bvRamanChapterXIVLongevityRules({
  chart:{lagna:{longitude:0},planets:[]},
  evidence:{birthDasaLord:bookExample2.birthDasaLord}
});
eq(sourceExample2Trace.rules.find(rule=>rule.id==='XIV-BAL-10').status,'UNKNOWN',
  'HPA p.68 Horoscope No.2 does not imply the conjunction condition from the Dasa lord name alone');
eq(sourceExample2Trace.rules.find(rule=>rule.id==='XIV-BAL-19').status,'UNKNOWN',
  'HPA p.68 Horoscope No.2 does not infer Saturn third-aspect geometry from the phrase “Moon afflicted” alone');
eq(sourceExample2Trace.rules.find(rule=>rule.id==='XIV-BAL-02').status,'UNKNOWN',
  'HPA p.68 Horoscope No.2 does not infer a Moon Kendra without its house position');
const sourceExample3Trace = bvRamanChapterXIVLongevityRules({
  chart:makeChart({houses:{Jupiter:4}}),
  evidence:{strongPlanets:['Jupiter']}
});
eq(sourceExample3Trace.rules.find(rule=>rule.id==='XIV-ANT-01').status,'NOT_MATCHED',
  'HPA p.69 Horoscope No.3 describes Jupiter in a quadrant, while numbered Antidote 1 is specifically Jupiter in Ascendant');
eq(sourceExample3Trace.rules.find(rule=>rule.id==='XIV-ANT-05').status,'MATCHED',
  'HPA p.69 Horoscope No.3 source-stated strong Jupiter satisfies the general strong-Mercury/Venus/Jupiter antidote predicate');
ok(bookExample3.sourceNote.includes('cancellation'),
  'HPA p.69 quadrant-Jupiter redemption stays recorded as a separate source-example coverage gap, not silently discarded');

// Core safety invariant: source rules may match individually, but they remain
// candidates/antidotes. These tests never create a selected category, lifespan,
// certification or a death-age/date claim.
const research = bvRamanChapterXIVLongevityRules({
  chart:makeChart({houses:{Sun:1,Moon:1,Mars:8,Jupiter:4,Saturn:1,Rahu:8,Ketu:8}}),
  evidence:{}
});
eq(research.rules.length,76,'fixture audit leaves all source rule trace rows visible');
eq(research.selectedCategory,null,'Chapter XIV has no automatically selected longevity category');
eq(research.finalLifespan,null,'source-rule fixture audit never returns a lifespan');
eq(research.certified,false,'source-rule fixture audit remains uncertified');
eq(research.customerDisplayAllowed,false,'research rules remain unavailable for customer-facing lifespan display');

const statusCounts = ruleCaseResults.reduce((counts,row)=>{
  counts[row.status]=(counts[row.status]||0)+1;
  return counts;
},{});
const ruleIdCounts = ruleCaseResults.reduce((counts,row)=>{
  counts[row.id]=(counts[row.id]||0)+1;
  return counts;
},{});

// Source-rule gap closure: three-state, rule-number-linked cases for every
// Chapter XIV rule ID not previously referenced above. The fixtures are
// derived from the printed source-rule statements, not presented as invented
// historical charts from the book. Unknown input remains UNKNOWN rather than
// being converted to a negative rule match.
statuses('XIV-BAL-07',[
 {label:'Moon 1, Mars 8, Sun 9 and Saturn 12',expected:'MATCHED',chart:{houses:{Moon:1,Mars:8,Sun:9,Saturn:12}}},
 {label:'Sun not in 9',expected:'NOT_MATCHED',chart:{houses:{Moon:1,Mars:8,Sun:8,Saturn:12}}},
 {label:'Saturn placement unavailable',expected:'UNKNOWN',chart:{houses:{Moon:1,Mars:8,Sun:9},omit:['Saturn']}}
],'HPA p.64 Balarishta 7');
statuses('XIV-BAL-09',[
 {label:'Moon 8, Mars 7, Rahu 9 and Jupiter 3',expected:'MATCHED',chart:{houses:{Moon:8,Mars:7,Rahu:9,Jupiter:3}}},
 {label:'Moon outside 8',expected:'NOT_MATCHED',chart:{houses:{Moon:6,Mars:7,Rahu:9,Jupiter:3}}},
 {label:'Jupiter placement unavailable',expected:'UNKNOWN',chart:{houses:{Moon:8,Mars:7,Rahu:9},omit:['Jupiter']}}
],'HPA p.64 Balarishta 9');
statuses('XIV-BAL-11',[
 {label:'Sun rising evidence, malefic in Kendra/Trikona and Venus 6',expected:'MATCHED',chart:{houses:{Mars:10,Venus:6}},evidence:{sunRisingAtBirth:true}},
 {label:'Sun does not rise at birth',expected:'NOT_MATCHED',chart:{houses:{Mars:10,Venus:6}},evidence:{sunRisingAtBirth:false}},
 {label:'Sun-rise observation absent',expected:'UNKNOWN',chart:{houses:{Mars:10,Venus:6}},evidence:{}}
],'HPA p.65 Balarishta 11');
statuses('XIV-BAL-12',[
 {label:'Lagna lord Mars in house 8 qualifies directly',expected:'MATCHED',chart:{lagnaLongitude:0,houses:{Mars:8}}},
 {label:'Lagna lord Mars in own sign; 5th lord in own sign; 9th lord in own sign outside 8/9',expected:'NOT_MATCHED',chart:{lagnaLongitude:0,houses:{Mars:1,Sun:5,Jupiter:12}}},
 {label:'Lagna lord placement cannot be assessed',expected:'UNKNOWN',chart:{lagnaLongitude:0,omit:['Mars']}}
],'HPA p.65 Balarishta 12');
statuses('XIV-BAL-16',[
 {label:'Lagna lord, Navamsa Lagna lord and Moon-sign lord share Sun sign',expected:'MATCHED',
  chart:{houses:{Sun:1,Moon:1,Mars:1},signs:{Sun:0,Moon:0,Mars:0}},evidence:{navamsaLagnaLord:'Mars'}},
 {label:'Lagna lord is not in Sun sign',expected:'NOT_MATCHED',
  chart:{houses:{Sun:2,Moon:1,Mars:1},signs:{Sun:1,Moon:0,Mars:0}},evidence:{navamsaLagnaLord:'Mars'}},
 {label:'Navamsa Lagna lord not supplied',expected:'UNKNOWN',chart:{houses:{Sun:1,Moon:1,Mars:1},signs:{Sun:0,Moon:0,Mars:0}}}
],'HPA p.65 Balarishta 16');
statuses('XIV-BAL-17',[
 {label:'malefics aspect Lagna and the eighth from Moon sign',expected:'MATCHED',
  chart:{houses:{Sun:7,Moon:1,Mars:1}}},
 {label:'Lagna is afflicted but eighth-from-Moon is not',expected:'NOT_MATCHED',
  chart:{houses:{Sun:7,Moon:1,Mars:3,Saturn:4,Rahu:6,Ketu:11}}},
 {label:'malefic aspect observations unavailable',expected:'UNKNOWN',
  chart:{houses:{Moon:1},omit:['Sun','Mars','Saturn','Rahu','Ketu']}}
],'HPA p.65 Balarishta 17');
statuses('XIV-BAL-25',[
 {label:'Saturn 12, Sun 9, Moon 1, Mars 8, no Jupiter aspect',expected:'MATCHED',
  chart:{houses:{Saturn:12,Sun:9,Moon:1,Mars:8,Jupiter:10}}},
 {label:'Jupiter in house 5 gives the printed cancellation',expected:'NOT_MATCHED',
  chart:{houses:{Saturn:12,Sun:9,Moon:1,Mars:8,Jupiter:5}}},
 {label:'Moon placement and Jupiter aspect cannot be checked',expected:'UNKNOWN',
  chart:{houses:{Saturn:12,Sun:9,Mars:8,Jupiter:10},omit:['Moon']}}
],'HPA p.66 Balarishta 25');
statuses('XIV-BAL-26',[
 {label:'Saturn 8 and Mars 7 without benefic aspects',expected:'MATCHED',
  chart:{houses:{Saturn:8,Mars:7,Jupiter:10,Mercury:4,Venus:5,Moon:5}}},
 {label:'Mars is outside houses 1, 7 and 8',expected:'NOT_MATCHED',
  chart:{houses:{Saturn:8,Mars:6,Jupiter:10,Mercury:4,Venus:5,Moon:5}}},
 {label:'benefic-aspect evidence is incomplete',expected:'UNKNOWN',
  chart:{houses:{Saturn:8,Mars:7,Jupiter:10,Mercury:4,Venus:5,Moon:5},omit:['Jupiter']}}
],'HPA p.66 Balarishta 26');
statuses('XIV-BAL-30',[
 {label:'Moon 8 with benefic aspect and no malefic aspect',expected:'MATCHED',
  chart:{houses:{Sun:1,Moon:8,Mars:3,Mercury:4,Jupiter:10,Venus:5,Saturn:4,Rahu:6,Ketu:11}}},
 {label:'Moon is not in house 6 or 8',expected:'NOT_MATCHED',chart:{houses:{Moon:5}}},
 {label:'Moon placement is unavailable',expected:'UNKNOWN',chart:{omit:['Moon']}}
],'HPA p.66 Balarishta 30');
statuses('XIV-ANT-08',[
 {label:'Moon 6/8 with explicit full-moon-night birth evidence',expected:'MATCHED',chart:{houses:{Moon:6}},evidence:{bornOnNightOfFullMoon:true}},
 {label:'the source-stated night condition is false',expected:'NOT_MATCHED',chart:{houses:{Moon:6}},evidence:{bornOnNightOfFullMoon:false}},
 {label:'night-of-full-moon evidence absent',expected:'UNKNOWN',chart:{houses:{Moon:6}},evidence:{}}
],'HPA p.67 Antidote 8');
statuses('XIV-ALP-02',[
 {label:'malefics in each of houses 6, 8 and 12',expected:'MATCHED',chart:{houses:{Mars:6,Rahu:8,Saturn:12}}},
 {label:'house 12 has no malefic',expected:'NOT_MATCHED',chart:{houses:{Mars:6,Rahu:8,Saturn:10,Ketu:4,Sun:3}}},
 {label:'house-12 malefic position cannot be proven',expected:'UNKNOWN',chart:{houses:{Mars:6,Rahu:8,Sun:3},omit:['Saturn','Ketu']}}
],'HPA p.69 Alpayu 2');
statuses('XIV-ALP-09',[
 {label:'Scorpio/Mars-owned Lagna with Saturn in 1 and benefics 3/6/9/12 evidence',expected:'MATCHED',
  chart:{lagnaLongitude:210,houses:{Saturn:1}},evidence:{beneficsInHouses3_6_9_12:true}},
 {label:'Venus-owned Lagna cannot satisfy malefic ownership',expected:'NOT_MATCHED',
  chart:{lagnaLongitude:30,houses:{Saturn:1}},evidence:{beneficsInHouses3_6_9_12:true}},
 {label:'benefics-in-houses evidence absent',expected:'UNKNOWN',
  chart:{lagnaLongitude:210,houses:{Saturn:1}},evidence:{}}
],'HPA p.70 Alpayu 9');
statuses('XIV-ALP-10',[
 {label:'Lagna lord and 8th lord Mars in 8 with Saturn and no benefic aspect',expected:'MATCHED',
  chart:{lagnaLongitude:0,houses:{Mars:8,Saturn:8,Mercury:4,Jupiter:10,Venus:5,Moon:5}}},
 {label:'Lagna lord not in house 8',expected:'NOT_MATCHED',
  chart:{lagnaLongitude:0,houses:{Mars:6,Saturn:8,Mercury:4,Jupiter:10,Venus:5,Moon:5}}},
 {label:'Lagna/eighth lord position unavailable',expected:'UNKNOWN',
  chart:{lagnaLongitude:0,houses:{Saturn:8},omit:['Mars']}}
],'HPA p.70 Alpayu 10');
statuses('XIV-ALP-11',[
 {label:'malefics 1/2/8 and all known benefics outside Kendras',expected:'MATCHED',
  chart:{houses:{Sun:1,Moon:6,Mars:2,Mercury:3,Jupiter:9,Venus:5,Saturn:8,Rahu:11,Ketu:12},
   signs:{Sun:0,Moon:5,Mars:1,Mercury:2,Jupiter:8,Venus:4,Saturn:7,Rahu:10,Ketu:11}}},
 {label:'Jupiter in Kendra prevents match',expected:'NOT_MATCHED',
  chart:{houses:{Sun:1,Moon:6,Mars:2,Mercury:3,Jupiter:4,Venus:5,Saturn:8,Rahu:11,Ketu:12},
   signs:{Sun:0,Moon:5,Mars:1,Mercury:2,Jupiter:3,Venus:4,Saturn:7,Rahu:10,Ketu:11}}},
 {label:'benefic Kendra absence cannot be proven with Jupiter missing',expected:'UNKNOWN',
  chart:{houses:{Sun:1,Moon:6,Mars:2,Mercury:3,Venus:5,Saturn:8,Rahu:11,Ketu:12},omit:['Jupiter'],
   signs:{Sun:0,Moon:5,Mars:1,Mercury:2,Venus:4,Saturn:7,Rahu:10,Ketu:11}}}
],'HPA p.70 Alpayu 11');
statuses('XIV-ALP-12',[
 {label:'weak Aries Lagna lord and eighth lord Mars in Kendra',expected:'MATCHED',
  chart:{lagnaLongitude:0,houses:{Mars:1}},evidence:{weakPlanets:['Mars']}},
 {label:'Lagna lord is not weak',expected:'NOT_MATCHED',
  chart:{lagnaLongitude:0,houses:{Mars:1}},evidence:{weakPlanets:[]}},
 {label:'weakness evidence absent',expected:'UNKNOWN',chart:{lagnaLongitude:0,houses:{Mars:1}},evidence:{}}
],'HPA p.70 Alpayu 12');
statuses('XIV-ALP-13',[
 {label:'Lagna/eighth lord in Kendra, house 8 occupied, no other Kendra occupants',expected:'MATCHED',
  chart:{lagnaLongitude:0,houses:{Mars:1,Ketu:8,Venus:8,Sun:2,Moon:3,Mercury:5,Jupiter:6,Saturn:11,Rahu:12}}},
 {label:'extra Saturn in Kendra violates no-other-Kendra condition',expected:'NOT_MATCHED',
  chart:{lagnaLongitude:0,houses:{Mars:1,Ketu:8,Venus:8,Sun:2,Moon:3,Mercury:5,Jupiter:6,Saturn:4,Rahu:12}}},
 {label:'absence of other Kendra planets unproven in incomplete chart',expected:'UNKNOWN',
  chart:{lagnaLongitude:0,houses:{Mars:1,Ketu:8,Venus:8,Sun:2,Moon:3,Jupiter:6,Rahu:12},omit:['Mercury','Saturn']}}
],'HPA p.70 Alpayu 13');
statuses('XIV-ALP-15',[
 {label:'Lagna Gemini and Moon Virgo are both common signs',expected:'MATCHED',
  chart:{lagnaLongitude:60,houses:{Moon:4}}},
 {label:'Moon in fixed Leo-sign house does not match',expected:'NOT_MATCHED',
  chart:{lagnaLongitude:60,houses:{Moon:3}}},
 {label:'Moon sign unavailable',expected:'UNKNOWN',chart:{lagnaLongitude:60,omit:['Moon']}}
],'HPA p.70 Alpayu 15');
statuses('XIV-MAD-01',[
 {label:'third/sixth lord Mercury in a Kendra',expected:'MATCHED',chart:{houses:{Mercury:4}}},
 {label:'third/sixth lord Mercury outside Kendras',expected:'NOT_MATCHED',chart:{houses:{Mercury:3}}},
 {label:'Mercury placement unavailable',expected:'UNKNOWN',chart:{omit:['Mercury']}}
],'HPA p.70 Madhyayu 1');
statuses('XIV-MAD-03',[
 {label:'Mercury 2, Jupiter 3 and Venus 11',expected:'MATCHED',chart:{houses:{Mercury:2,Jupiter:3,Venus:11}}},
 {label:'Jupiter outside house 3',expected:'NOT_MATCHED',chart:{houses:{Mercury:2,Jupiter:4,Venus:11}}},
 {label:'Mercury position unavailable',expected:'UNKNOWN',chart:{omit:['Mercury']}}
],'HPA p.70 Madhyayu 3');
statuses('XIV-MAD-05',[
 {label:'Sun Lagna enemy sign, between malefics, weak and no benefic aspect',expected:'MATCHED',
  chart:{lagnaLongitude:30,houses:{Sun:1,Mars:10,Saturn:4,Jupiter:6,Mercury:4,Venus:11,Moon:5}},
  evidence:{sunInEnemySign:true,sunBetweenMalefics:true,weakPlanets:['Sun']}},
 {label:'Sun is not in a natural-enemy sign',expected:'NOT_MATCHED',
  chart:{lagnaLongitude:60,houses:{Sun:1,Mars:10,Saturn:4,Jupiter:6,Mercury:4,Venus:11,Moon:5}},
  evidence:{sunInEnemySign:false,sunBetweenMalefics:true,weakPlanets:['Sun']}},
 {label:'between-malefics observation absent',expected:'UNKNOWN',
  chart:{lagnaLongitude:30,houses:{Sun:1,Mars:10,Saturn:4,Jupiter:6,Mercury:4,Venus:11,Moon:5}},
  evidence:{sunInEnemySign:true,weakPlanets:['Sun']}}
],'HPA p.71 Madhyayu 5');
statuses('XIV-MAD-06',[
 {label:'Lagna lord Mars in 8 with Saturn conjunction and no benefic aspect',expected:'MATCHED',
  chart:{lagnaLongitude:0,houses:{Mars:8,Saturn:8,Jupiter:10,Mercury:4,Venus:5,Moon:5}}},
 {label:'Lagna lord Mars outside houses 6/8',expected:'NOT_MATCHED',
  chart:{lagnaLongitude:0,houses:{Mars:5,Saturn:8,Jupiter:10,Mercury:4,Venus:5,Moon:5}}},
 {label:'Lagna-lord placement unavailable',expected:'UNKNOWN',
  chart:{lagnaLongitude:0,houses:{Saturn:8},omit:['Mars']}}
],'HPA p.71 Madhyayu 6');
statuses('XIV-MAD-07',[
 {label:'Saturn 1, Moon 8 and remaining-house evidence true',expected:'MATCHED',
  chart:{houses:{Saturn:1,Moon:8}},evidence:{otherGrahasInEleventh:true}},
 {label:'other-graha eleventh condition false',expected:'NOT_MATCHED',
  chart:{houses:{Saturn:1,Moon:8}},evidence:{otherGrahasInEleventh:false}},
 {label:'other-graha eleventh condition absent',expected:'UNKNOWN',
  chart:{houses:{Saturn:1,Moon:8}},evidence:{}}
],'HPA p.71 Madhyayu 7');
statuses('XIV-MAD-08',[
 {label:'Scorpio Lagna, Jupiter 1, Mars and Rahu 8',expected:'MATCHED',
  chart:{lagnaLongitude:210,houses:{Jupiter:1,Mars:8,Rahu:8}}},
 {label:'Rahu not in 8',expected:'NOT_MATCHED',
  chart:{lagnaLongitude:210,houses:{Jupiter:1,Mars:8,Rahu:9}}},
 {label:'Jupiter position unavailable',expected:'UNKNOWN',
  chart:{lagnaLongitude:210,houses:{Mars:8,Rahu:8},omit:['Jupiter']}}
],'HPA p.71 Madhyayu 8');
statuses('XIV-MAD-10',[
 {label:'Aries Lagna, Jupiter 8 and malefic in Kendra',expected:'MATCHED',
  chart:{lagnaLongitude:0,houses:{Jupiter:8,Sun:1}}},
 {label:'no malefic in any Kendra',expected:'NOT_MATCHED',
  chart:{lagnaLongitude:0,houses:{Jupiter:8,Sun:3,Mars:6,Saturn:12,Rahu:11,Ketu:12}}},
 {label:'malefic Kendra state unavailable',expected:'UNKNOWN',
  chart:{lagnaLongitude:0,houses:{Jupiter:8},omit:['Sun','Mars','Saturn','Rahu','Ketu']}}
],'HPA p.71 Madhyayu 10');
statuses('XIV-MAD-11',[
 {label:'Saturn 1 Moon 4 Mars 7 Rahu 10 and unfavourable benefic-house evidence',expected:'MATCHED',
  chart:{houses:{Saturn:1,Moon:4,Mars:7,Rahu:10}},evidence:{jupiterVenusMercuryInUnfavourableHouses:true}},
 {label:'unfavourable-house predicate false',expected:'NOT_MATCHED',
  chart:{houses:{Saturn:1,Moon:4,Mars:7,Rahu:10}},evidence:{jupiterVenusMercuryInUnfavourableHouses:false}},
 {label:'unfavourable-house evidence missing',expected:'UNKNOWN',
  chart:{houses:{Saturn:1,Moon:4,Mars:7,Rahu:10}},evidence:{}}
],'HPA p.71 Madhyayu 11');
statuses('XIV-MAD-12',[
 {label:'Mars/Mercury in Kendras, Venus Lagna, exalted Moon 3 and Saturn 11',expected:'MATCHED',
  chart:{houses:{Mars:4,Mercury:7,Venus:1,Moon:3,Saturn:11},signs:{Moon:1,Saturn:6}}},
 {label:'no exalted planet in house 11',expected:'NOT_MATCHED',
  chart:{houses:{Mars:4,Mercury:7,Venus:1,Moon:3,Saturn:11},signs:{Moon:1,Saturn:9}}},
 {label:'house-3/11 exaltation placements incomplete',expected:'UNKNOWN',
  chart:{houses:{Mars:4,Mercury:7,Venus:1},omit:['Moon','Saturn']}}
],'HPA p.71 Madhyayu 12');
statuses('XIV-MAD-13',[
 {label:'benefic Kendra evidence, no benefic aspect Lagna, Lagna lord Mars aspected by Sun',expected:'MATCHED',
  chart:{houses:{Mars:10,Sun:4,Jupiter:4,Mercury:2,Venus:5,Moon:3,Saturn:7}},evidence:{beneficsOccupyKendras:true}},
 {label:'no benefic Kendra evidence',expected:'NOT_MATCHED',
  chart:{houses:{Mars:10,Sun:4,Jupiter:4,Mercury:2,Venus:5,Moon:3,Saturn:7}},evidence:{beneficsOccupyKendras:false}},
 {label:'benefic-occupancy evidence absent',expected:'UNKNOWN',
  chart:{houses:{Mars:10,Sun:4,Jupiter:4,Mercury:2,Venus:5,Moon:3,Saturn:7}},evidence:{}}
],'HPA p.71 Madhyayu 13');
statuses('XIV-MAD-14',[
 {label:'Mars 5, Sun 7, Saturn debilitated in Aries',expected:'MATCHED',
  chart:{houses:{Mars:5,Sun:7,Saturn:3},signs:{Saturn:0}}},
 {label:'Saturn is not debilitated',expected:'NOT_MATCHED',
  chart:{houses:{Mars:5,Sun:7,Saturn:3},signs:{Saturn:6}}},
 {label:'Saturn sign unavailable',expected:'UNKNOWN',chart:{houses:{Mars:5,Sun:7},omit:['Saturn']}}
],'HPA p.71 Madhyayu 14');
statuses('XIV-PUR-02',[
 {label:'all benefics in houses 1–6 and all malefics in 7–12',expected:'MATCHED',
  chart:{houses:{Sun:9,Moon:1,Mars:8,Mercury:3,Jupiter:4,Venus:5,Saturn:10,Rahu:11,Ketu:12},
   signs:{Sun:8,Moon:0,Mars:7,Mercury:2,Jupiter:3,Venus:4,Saturn:9,Rahu:10,Ketu:11}}},
 {label:'benefic Jupiter in house 7 violates the printed condition',expected:'NOT_MATCHED',
  chart:{houses:{Sun:9,Moon:1,Mars:8,Mercury:3,Jupiter:7,Venus:5,Saturn:10,Rahu:11,Ketu:12},
   signs:{Sun:8,Moon:0,Mars:7,Mercury:2,Jupiter:6,Venus:4,Saturn:9,Rahu:10,Ketu:11}}},
 {label:'incomplete nine-graha placement remains UNKNOWN',expected:'UNKNOWN',
  chart:{houses:{Sun:9,Moon:1,Mars:8,Mercury:3,Jupiter:4,Venus:5,Saturn:10,Rahu:11,Ketu:12},
   signs:{Sun:8,Moon:0,Mars:7,Mercury:2,Jupiter:3,Venus:4,Saturn:9,Rahu:10,Ketu:11},omit:['Mercury']}}
],'HPA p.71 Purnayu 2');

const audit = {
  pass:true,assertions,
  source:'B. V. Raman, Hindu Predictive Astrology, Chapter XIV, printed pp.64–72',
  chapterXIVRuleInventory:sourceRules.size,
  testedRuleIds:[...new Set(ruleCaseResults.map(row=>row.id))].sort(),
  directlyTestedRuleIdCount:new Set(ruleCaseResults.map(row=>row.id)).size,
  individualRuleCaseCount:ruleCaseResults.length,
  expectedOutcomeCounts:statusCounts,
  casesPerRuleId:ruleIdCounts,
  ruleCaseResults,
  sourceDerivedRuleFixtures:'constructed positive/negative rule tests; explicitly not claimed as book-printed natal charts',
  actualBookExamples:[bookExample1,bookExample2,bookExample3].map(example=>({
    id:example.id,printedPage:example.printedPage,
    birthDate:example.birthDate||null,birthDasaLord:example.birthDasaLord||null,
    statedFacts:example.statedFacts||null,
    statedConditions:example.statedConditions||null,
    ruleMappingGaps:example.ruleMappingGaps||null,
    redemptionEvidence:example.redemptionEvidence||null,
    explicitlyReportedConjunctions:example.explicitlyReportedConjunctions||null,
    explicitlyReportedAspectFrom:example.explicitlyReportedAspectFrom||null,
    sourceStatement:example.sourceStatement||null,
    sourceNote:example.sourceNote||null
  })),
  bookExampleRuleTraces:{
    horoscope1:{
      ruleIds:['XIV-BAL-02','XIV-BAL-03','XIV-BAL-10'],
      observedStatuses:{
        'XIV-BAL-02':'MATCHED by source-stated Moon 7th Kendra + Saturn aspect',
        'XIV-BAL-03':'MATCHED by source-stated Moon 7th + malefic aspect + no benefic aspect',
        'XIV-BAL-10':'MATCHED only when the source-stated Venus/Saturn/Ketu conjunction is explicitly wired; UNKNOWN from Dasa lord name alone'
      },
      predicateReplayIsNotFullChartReconstruction:true
    },
    horoscope2:{
      ruleIds:['XIV-BAL-02','XIV-BAL-10','XIV-BAL-19'],
      observedStatus:'UNKNOWN where prose does not provide complete predicate geometry',
      factToRuleMappingGaps:bookExample2.ruleMappingGaps
    },
    horoscope3:{
      ruleIds:['XIV-ANT-01','XIV-ANT-05'],
      observedStatuses:{
        'XIV-ANT-01':sourceExample3Trace.rules.find(rule=>rule.id==='XIV-ANT-01').status,
        'XIV-ANT-05':sourceExample3Trace.rules.find(rule=>rule.id==='XIV-ANT-05').status
      },
      redemptionEvidence:bookExample3.redemptionEvidence,
      gap:'the book states strong Jupiter in a quadrant as redemption; the general strong-Jupiter antidote predicate is recorded, but full rule/cancellation precedence still needs independent source regression'
    }
  },
  finalLifespan:null,certified:false,customerDisplayAllowed:false
};
mkdirSync('artifacts',{recursive:true});
writeFileSync('artifacts/chapter-xiv-book-example-regression.json',JSON.stringify(audit,null,2));
console.log(JSON.stringify(audit,null,2));
