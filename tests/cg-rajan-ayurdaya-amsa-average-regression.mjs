import assert from 'node:assert/strict';
import {
 cgRajanAmsaAyurdayaGraha as amsa,
 cgRajanNormalizeAyurdayaUnits as normalize,
 cgRajanAverageFinalThreeMethods as average
} from '../public/horoscope/offline/cg-rajan-ayurdaya-research.browser.mjs';
import {cgRajanCompareGrahas as compare} from '../public/horoscope/offline/cg-rajan-ayurdaya-pinda.browser.mjs';

let assertions=0;
const eq=(a,b,message)=>{assert.deepEqual(a,b,message);assertions++};
const yes=(condition,message)=>{assert.ok(condition,message);assertions++};

// C. G. Rajan, printed p.255: seven planet-wise Amsa components.
const examples=[
 ['சூரியன்',167+2/60,[2,1,9,36]],
 ['சந்திரன்',118+10/60,[11,5,12,0]],
 ['செவ்வாய்',206.5,[1,11,12,0]],
 ['புதன்',191+52/60,[9,6,21,36]],
 ['குரு',28+17/60,[8,5,24,36]],
 ['சுக்கிரன்',204+32/60,[1,4,9,36]],
 ['சனி',230+27/60,[9,1,18,36]]
];
for(const [planet,trueLongitude,units] of examples) {
 const result=amsa({planet,trueLongitude});
 eq(Object.values(result.traditionalUnits),units,'printed p.255 Amsa component '+planet);
 eq(result.reductionCycleDegrees,40,'40 degree source cycle '+planet);
 eq(result.methodFinalCertified,false,'raw Amsa not mislabeled as final '+planet);
 eq(result.natalTotalYears,null,'no lifespan estimate '+planet);
 eq(amsa({planet,trueLongitude:trueLongitude+40}).traditionalUnits,
   result.traditionalUnits,'40-degree periodicity '+planet);
}
eq(Object.values(amsa({planet:'குரு',trueLongitude:28+17/60}).traditionalUnits),
 [8,5,24,36],'Guru worked example p.255');
eq(Object.values(amsa({planet:'லக்னம்',trueLongitude:184+48/60}).traditionalUnits),
 [7,5,8,24],'Lagna example p.256');
assert.throws(()=>amsa({planet:'செவ்வாய்',trueLongitude:NaN}),TypeError);assertions++;
assert.throws(()=>amsa({planet:'செவ்வாய்',trueLongitude:Infinity}),TypeError);assertions++;
assert.throws(()=>amsa({planet:'செவ்வாய்',trueLongitude:'28.3'}),TypeError);assertions++;

// Carry rules must all be applied: 12 months -> year, 30 days -> month,
// and 60 nazhigai -> day.
const carried=normalize({years:0,months:12,days:30,nazhigai:60});
eq([carried.years,carried.months,carried.days,carried.nazhigai,carried.totalNazhigai],
 [1,1,1,0,23460],'all three traditional unit carry boundaries');

// Average is allowed only for three status=final values in normalized units.
const final=(traditionalUnits)=>({status:'final',traditionalUnits});
const three=average({
 pinda:final({years:0,months:11,days:29,nazhigai:59}),
 naisargika:final({years:1,months:0,days:0,nazhigai:1}),
 amsa:final({years:1,months:0,days:0,nazhigai:0})
});
eq(three.available,true,'verified finals allow average');
eq(three.exactAverageNazhigai,21600,'mean is calculated in common nazhigai unit');
eq([three.traditionalUnits.years,three.traditionalUnits.months,
 three.traditionalUnits.days,three.traditionalUnits.nazhigai],[1,0,0,0],
 'average is rounded only to final nazhigai, then normalized');
eq(three.averageLifespanYears,null,'mean arithmetic is not labeled life expectancy');

const blocked=average({});
eq(blocked.available,false,'missing totals must block average');
eq(blocked.blockedMethods,['pinda','naisargika','amsa'],
 'all missing final totals are disclosed');
eq(blocked.traditionalUnits,null,'no guessed average total');
eq(average({
 pinda:final({years:0,months:12,days:0,nazhigai:0}),
 naisargika:final({years:1,months:0,days:0,nazhigai:0}),
 amsa:final({years:1,months:0,days:0,nazhigai:0})
}).available,false,'unnormalized final row must block average');
eq(average({
 pinda:{status:'raw',traditionalUnits:{years:1,months:0,days:0,nazhigai:0}},
 naisargika:final({years:1,months:0,days:0,nazhigai:0}),
 amsa:final({years:1,months:0,days:0,nazhigai:0})
}).available,false,'raw component must block average');

const chart=examples.map(([name,longitude])=>({name,longitude}));
const input=Object.keys(Object.fromEntries(examples.map(([name,longitude])=>[name,{name,longitude}])))
 .map(name=>({name,longitude:examples.find(x=>x[0]===name)[1]}));
// Seven-graha production-facing research rows always retain the guarded state.
const allNames=['சூரியன்','சந்திரன்','செவ்வாய்','புதன்','குரு','சுக்கிரன்','சனி'];
const rows=allNames.map(name=>({name,longitude:({
 'சூரியன்':167+2/60,'சந்திரன்':118+10/60,'செவ்வாய்':206.5,
 'புதன்':191+52/60,'குரு':28+17/60,'சுக்கிரன்':204+32/60,'சனி':230+27/60
 })[name]}));
const compared=compare({planets:rows});
eq(compared.entries.length,7,'seven rows in combined research view');
eq(compared.entries.map(x=>Object.values(x.amsa.traditionalUnits)),
 examples.map(x=>x[2]),'all displayed Amsa rows match source oracle');
eq(compared.threeMethodAverage.available,false,'no average before final reductions are verified');
eq(compared.combinedLongevityYears,null,'no calculated lifespan');

console.log(JSON.stringify({pass:true,assertions,printedAmsaExamples:9,
 carryBoundaries:3,averageRequiresThreeVerifiedFinalTotals:true,
 finalMethodReductionsCertified:false,individualLifespanPrediction:false}));
