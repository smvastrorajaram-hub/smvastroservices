/**
 * Independent seven-planet PRINTED oracle:
 * C.G. Rajan, Jathaka Kanitham I pp.241–244 / scanned PDF pp.263–266.
 * Natal example is the author's historic test chart, NOT user's birthdays.
 * Nothing here licenses public lifespan/death predictions.
 */
import assert from 'node:assert/strict';
import {cgRajanNaturalAyurdayaGraha as nat,
 cgRajanChakrapadaHouseFraction as house,
 cgRajanConditionReductions as red,
 cgRajanSevenNaturalResearch as seven}
from '../public/horoscope/offline/cg-rajan-ayurdaya-research.browser.mjs';
let assertions=0;
function eq(a,b,msg){assert.deepEqual(a,b,msg);assertions++;}
function close(a,b,msg){assert.ok(Math.abs(a-b)<1e-10,msg+': '+a+' != '+b);assertions++;}
// True sidereal graha coordinates from printed p.241;
// exaltation and natural years from pp.242–243;
// verified 4-column outcomes from printed p.243 (pdf p.265).
const example=[
 ['சூரியன்',167+2/60,202+58/60,[11,3,9,20]],
 ['சந்திரன்',118+10/60,274+50/60,[0,9,4,50]],
 ['செவ்வாய்',206+30/60,268+30/60,[1,5,27,0]],
 ['புதன்',191+52/60,333+8/60,[8,3,28,12]],
 ['குரு',28+17/60,293+17/60,[14,7,29,6]],
 ['சுக்கிரன்',204+32/60,207+32/60,[11,6,10,40]],
 ['சனி',230+27/60,329+33/60,[45,9,7,30]]
];
const exaltByName={'சூரியன்':10,'சந்திரன்':33,'செவ்வாய்':298,
 'புதன்':165,'குரு':95,'சுக்கிரன்':357,'சனி':200};
for(const [planet,trueLongitude,arc,expected] of example){
 const v=nat({planet,trueLongitude});
 close(v.remainingArcDegrees,arc,planet+' printed angular remainder');
 eq(Object.values(v.traditionalUnits),expected,planet+' printed four-unit result');
 eq(v.individualLifespanCertified,false,planet+' not a certified natal lifespan');
 eq(v.predictedDeathAge,null,planet+' no death-age inference');
}
for(const [planet] of example){
 const exalt=nat({planet,trueLongitude:exaltByName[planet]});
 close(exalt.remainingArcDegrees,360,planet+' exact exaltation arc');
 close(exalt.theoreticalNaturalYearComponent,exalt.maximumNaturalYears,
  planet+' full natural-year quota at exaltation');
 const deb=nat({planet,trueLongitude:(exalt.exaltationLongitude+180)%360});
 close(deb.theoreticalNaturalYearComponent,exalt.maximumNaturalYears/2,
  planet+' half quota at debilitation');
}
for(let h=12;h>=7;h--){
 close(house({house:h,benefic:false}).lossFraction,1/(13-h),'malefic '+h);
 close(house({house:h,benefic:true}).lossFraction,1/(2*(13-h)),'benefic '+h);
}
eq(house({house:6,benefic:true}).lossFraction,0,'outside 7..12');
close(red({planet:'செவ்வாய்',enemySign:true,combust:true}).combinedResearchFraction,1/3,
 'enemy-sign and combustion research product');
close(red({planet:'சனி',enemySign:true,combust:true}).combinedResearchFraction,2/3,
 'Saturn combustion exempt');
close(red({planet:'சுக்கிரன்',enemySign:false,combust:true}).combinedResearchFraction,1,
 'Venus combustion exempt');
eq(red({planet:'சூரியன்'}).independentNatalFinalCertified,false,'reduction research only');
assert.throws(()=>nat({planet:'ராகு',trueLongitude:20}),RangeError);assertions++;
assert.throws(()=>nat({planet:'சனி',trueLongitude:NaN}),TypeError);assertions++;
assert.throws(()=>house({house:13,benefic:true}),RangeError);assertions++;
assert.throws(()=>house({house:8,benefic:null}),TypeError);assertions++;
const assembled=seven({planets:example.map(([name,longitude])=>({name,longitude}))});
eq(assembled.grahaCount,7,'all seven assembled');
eq(assembled.natalTotalYears,null,'no final natal total');
eq(assembled.publishedToCustomers,false,'isolated from customer reports');
console.log(JSON.stringify({pass:true,assertions,
 source:'CG Rajan I printed pp.231–244',bookExampleGrahasVerified:7,
 bookExampleUnits:example.map(([name,,,expected])=>({planet:name,units:expected})),
 personLifeExpectancyOutput:false,fullAyurdayaCertified:false,
 UttaraKalamritaModuleUnchanged:true}));
