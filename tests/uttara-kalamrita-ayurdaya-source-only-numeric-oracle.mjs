/**
 * UK Section III (Ayurdaya) slokas 1-5 book arithmetic + seven
 * research-only chart inputs, NEVER customer longevity forecasts.
 * V. Subrahmanya Sastri (1939) PDF pp 13-14.
 * No previously excluded study numbers or other longevity sources.
 */
import assert from 'node:assert/strict';
import {full} from '../public/horoscope/offline/offline-engine.mjs';
import {
 uttaraAmsaAyurdayaPosition as amsa,
 uttaraAmsaTimeFraction as fraction,
 uttaraAmsaGhatikaRatio as ghati,
 uttaraAyurdayaHouseFraction as house,
 uttaraAyurdayaBookReductions as reduction,
 uttaraAyurdayaLagnaFromGhati as lagna,
 uttaraAyurdayaThreeDrekkanaPunyaPapa as punya,
 uttaraAyurdayaResearchChart as chart
,} from '../public/horoscope/offline/uttara-kalamrita-ayurdaya.browser.mjs';
const star=360/27,pada=star/4;
let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++};
const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++};
const near=(a,b,m,t=1e-10)=>{ok(Number.isFinite(a)&&Math.abs(a-b)<=t,
 m+' '+a+' vs '+b)};
for(let n=0;n<27;n++){
 const x=amsa(n*star+0.01);
 eq(x.completedNakshatras,n,'UK Amsa previous Nakshatra '+n);
 eq(x.completedPadas,0,'UK Amsa nakshatra first pada '+n);
 eq(x.integerYears,(n%3)*4,'UK exact star-mod-three x four');
 eq(x.certifiedContributionYears,null,'unverified actual Pada transit time not invented');
}
const venus=amsa(6*star+0.2);
eq(venus.completedNakshatras,6,'UK III.1 Punarvasu is seventh star');
eq(venus.completedPadas,0,'UK Venus example first quarter of Punarvasu');
eq(venus.integerYears,0,'UK book Venus has zero completed Pada-year');
const bookExample=ghati({
 elapsedDays:1,elapsedGhati:45,elapsedVighati:22,
 totalDays:2,totalGhati:43,totalVighati:32
});
const expectedBookRatio=(60+45+22/60)/(120+43+32/60);
near(bookExample.fraction,expectedBookRatio,
 'UK sloka1 published Venus elapsed 1d45gh22v / full 2d43gh32v');
ok(bookExample.fraction>7/12&&bookExample.fraction<8/12,
 'UK Venus fraction in printed approximate seven-month interval');
const equalMs=fraction({enteredMs:0,birthMs:650,exitedMs:1000});
near(equalMs.fraction,.65,'UK actual timestamp traversal ratio');
for(let houseNumber=12;houseNumber>=7;houseNumber--){
 const denom=13-houseNumber;
 near(house({house:houseNumber,benefic:false}).lossFraction,1/denom,
  'UK III.2 malefic 12th to 7th loss sequence '+houseNumber);
 near(house({house:houseNumber,benefic:true}).lossFraction,1/(2*denom),
  'UK III.2 benefic half loss '+houseNumber);
}
near(house({house:1,benefic:false}).lossFraction,0,'unlisted position zero reduction');
const reduced=reduction({fractionalAmsaYears:8,house:11,benefic:false,
 atDebilitation:true,inEnemySign:true,eclipsedOrWarDefeated:true});
near(reduced.provisionalContributionYears,8*.5*.5*(2/3)*.5,
 'UK III.2 ordered half-house/half-deb/two-thirds-enemy/half-war');
eq(reduced.certifiedIndividualLifespanYears,null,'no final lifespan from individual factor');
near(lagna({elapsedGhatikas:5,risingPeriodGhatikas:10}).bookResearchYears,4.5,
 'UK III.3 9 * elapsed ghatis / sign rise ghatis');
const pp=punya({ukSaptavargajaRupas:[1,1,2]});
near(pp.punyaRupa,1,'UK III.4 Punya = sum/4');
near(pp.papaRupa,3,'UK III.4 Papa = 4-Punya');
near(pp.formalCycleYears,3*120/7,'UK III.5 formal 120/7');
near(pp.boundedCycleYears,360/7,'UK III.5 modulo 120 bounded cycle');
eq(pp.finalHumanLifespanYears,null,'no certified predicted age');
assert.throws(()=>ghati({elapsedDays:2,elapsedGhati:0,elapsedVighati:0,
 totalDays:1,totalGhati:0,totalVighati:0}),RangeError);checks++;
assert.throws(()=>fraction({enteredMs:0,birthMs:1001,exitedMs:1000}),RangeError);checks++;

const yogaFixture=yoga({planets:[
 {name:'புதன்',bhava:1},{name:'குரு',bhava:11},
 {name:'சுக்கிரன்',bhava:6}
]});
eq(yogaFixture.beneficPlacements.map(x=>x.ukIII6Group),
 ['kendra-or-trikona','second-third-eleventh','sixth-eighth-twelfth'],
 'UK Section III.6 independent house classification for three grahas');
eq(yogaFixture.allAspectPredicatesIndependentlyEstablished,false,
 'Unknown aspect evidence remains UNKNOWN');
eq(yogaFixture.sourceAspectChecks.lagnaLordBeneficAspect,null,
 'UK III.7 no default benefic aspect guess');
eq(yogaFixture.deathAgePrediction,null,
 'UK III.6-8 makes no death-age forecast');
eq(yogaFixture.customerOutputAllowed,false,
 'UK III.6-8 isolated from Horoscope and Matching');
assert.throws(()=>yoga({planets:[],verifiedAspectFlags:{lagnaBeneficAspect:42}}),TypeError);checks++;
assert.throws(()=>amsa(NaN),TypeError);checks++;
assert.throws(()=>house({house:12,benefic:null}),TypeError);checks++;
const births=[
 ['1971-05-04','05:05'],['1974-01-11','16:04'],
 ['1992-07-31','22:05'],['1994-06-15','13:03'],
 ['2015-09-06','09:30']
];
let found=0,certified=0;const researchResults=[];
for(const [date,time] of births){
 const r=await full({date,time,lat:11.232,lon:78.88,
  utcOffsetMinutes:330,referenceDate:'2026-10-17',name:'UK III private math QA'});
 ok(r.ok,'valid seven graha and Lagna chart '+date);
 const input=chart({planets:r.chart.planets,lagnaLongitude:r.chart.lagna.longitude,
  certifiedUttaraShadbala:false});
 eq(input.publishedToCustomers,false,'no lifespan report output '+date);
 eq(input.completeAyurdayaCertified,false,'Shadbala unresolved blocks final Ayus '+date);
 eq(input.personPredictedLifespan,null,'no predicted years visible '+date);
 eq(input.deathTimingPrediction,null,'no death timing generated '+date);
 eq(input.UKShadbalaInputCertified,false,'UK Shadbala still uncertified '+date);
 const row={date,grahas:{},ascendant:input.lagna.integerYears};
 for(const [name,value] of Object.entries(input.seven)){
  found++;eq(value.certifiedContributionYears,null,'no transit time evidence '+date+name);
  ok(Number.isInteger(value.integerYears)&&value.integerYears>=0&&value.integerYears<=11,
   'UK III.1 each graha 0..11 completed Navamsa-years '+date+name);
  row.grahas[name]=value.integerYears;
 }
 certified+=Number(input.completeAyurdayaCertified);
 researchResults.push(row);
}
eq(found,35,'UK Section III first position stage: 5 natal dates ×7 grahas');
eq(certified,0,'No fabricated independent lifespan certificate');
console.log(JSON.stringify({pass:true,checks,
 source:'Uttara Kalamrita Khanda I Section III only, Sastri 1939',
 publishedVenusTextbookTransitRatio:bookExample.fraction,
 fiveNatalDatesTested:births.length,sevenPlanetIntermediatePositions:found,
 timeOfDeathPredictions:0,wholeAyurdayaNumericallyCertified:false,
 completeUKShadbalaPrerequisiteMet:false,customerReportChanged:false,
 birthResearchResults:researchResults}));
