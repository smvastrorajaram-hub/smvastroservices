/** C.G. Rajan Part I Pindayurdaya printed-example and browser report QA.
 * Source: user supplied Jathaka Kanitham I printed pp.249–254.
 * NEVER predict an actual lifespan or death age.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {full} from '../public/horoscope/offline/offline-engine.mjs';
import {cgRajanPindaGraha, cgRajanAmsaAyurdayaGraha, cgRajanAmsaHaranaResearch,
 cgRajanMeanThreeTraditionalTotals, cgRajanCompareGrahas, cgRajanAyurdayaReportHtml}
 from '../public/horoscope/offline/cg-rajan-ayurdaya-pinda.browser.mjs';
let checks=0;
const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++};
const ok=(v,m)=>{assert.ok(v,m);checks++};
for(const [planet,longitude,result] of [
 ['சூரியன்',167+2/60,{years:10,months:8,days:16,nazhigai:22}],
 ['குரு',28+17/60,{years:12,months:2,days:19,nazhigai:15}]
]){
 const p=cgRajanPindaGraha({planet,trueLongitude:longitude});
 eq(p.traditionalUnits,result,planet+' printed Pinda reference');
 eq(p.totalHumanLifetime,null,'no lifetime forecast');
 eq(p.deathAgeOrDate,null,'no death prediction');
}
const ref=[['சூரியன்',167+2/60],['சந்திரன்',118+10/60],
 ['செவ்வாய்',206+30/60],['புதன்',191+52/60],
 ['குரு',28+17/60],['சுக்கிரன்',204+32/60],['சனி',230+27/60]]
 .map(([name,longitude])=>({name,longitude}));
const research=cgRajanCompareGrahas({planets:ref});
eq(research.entries.length,7,'seven researched grahas');
eq(research.allEightMethodsComplete,false,'cannot claim 8 methods are complete');
eq(research.combinedLongevityYears,null,'no calculated personal total');
eq(research.deathAgeOrDate,null,'no human death age');
const ta=cgRajanAyurdayaReportHtml({planets:ref,language:'ta'});
const en=cgRajanAyurdayaReportHtml({planets:ref,language:'en'});
ok(ta.includes('பிண்ட ஆயுள்')&&ta.includes('நைசர்க்கிக ஆயுள்')&&ta.includes('அம்ச ஆயுள்'),'Tamil three columns');
ok(en.includes('Pinda Ayurdaya')&&en.includes('Naisargika Ayurdaya')&&en.includes('Amsa Ayurdaya'),'English three columns');
ok(ta.includes('சராசரி ஆயுள்')&&en.includes('Average Ayurdaya'),'three-total arithmetic mean is displayed');
ok(ta.includes('மொத்தம் (7 கிரகங்கள்)')&&ta.includes('அட்டவணை A'),'Tamil total row and source variant note');
ok(en.includes('Total (7 grahas)')&&en.includes('provisional arithmetic mean'),'English total row and provisional status');
ok(ta.includes('10 வ 8 மா 16 நா 22 நாழி'),'Tamil Sun printed result');
ok(en.includes('12y 2m 19d 15n'),'English Jupiter printed result');
eq((ta.match(/<tr\b/g)||[]).length,10,'header + seven grahas + total + average');
ok(ta.includes('ஹரணத்திற்கு முன்')&&en.includes('before Harana'),'Amsa table A is explicitly labelled pre-Harana');
const amsaCases=[
 [0,1],[3+20/60,1],[6+40/60,2],[40,12],[43+20/60,1],
 [167+2/60,3],[118+10/60,12],[206.5,2],[191+52/60,10],
 [28+17/60,9],[204+32/60,2],[230+27/60,10]
];
for(const [longitude,years] of amsaCases){
 eq(cgRajanAmsaAyurdayaGraha({planet:'செவ்வாய்',trueLongitude:longitude}).rawAmsaYears,
  years,'C.G. Rajan Amsa-table lookup '+longitude);
}
const completeHaranaEvidence={
 planet:'குரு',rawAmsaYears:12,enemySign:true,combust:true,
 houseFromLagna:7,occupantCount:1,chakrapadaBenefic:true,strongestOccupantVerified:false,
 isExaltationSign:false,retrograde:false,ownSign:true,ownNavamsa:false,
 ownDrekkana:false,vargottama:false
};
const haraCandidate=cgRajanAmsaHaranaResearch(completeHaranaEvidence);
eq(haraCandidate.resolved,true,'explicit evidence permits a Harana research candidate');
eq(haraCandidate.enemySignLossFraction,0,'combustion Harana takes precedence over enemy-sign Harana');
eq(haraCandidate.combustionLossFraction,1/2,'applicable combustion Harana is one half');
eq(haraCandidate.selectedConditionHarana,'combustion','printed p.231 precedence is surfaced');
eq(haraCandidate.benefic,true,'chart-verified Chakra benefic status is surfaced');
eq(haraCandidate.chakrapadaLossFraction,1/12,'Jupiter benefic house-7 loss is half the malefic fraction');
ok(Math.abs(haraCandidate.totalHaranaFraction-7/12)<1e-9,'selected condition deduction plus separate Chakrapada deduction');checks++;
ok(Math.abs(haraCandidate.yearsBeforeMultiplier-5)<1e-9,'deduct Haranas from raw 12-year term before multiplier');checks++;
eq(haraCandidate.multiplier,2,'only the maximum applicable multiplier is used');
ok(Math.abs(haraCandidate.adjustedAmsaYearsCandidate-10)<1e-9,'post-Harana own-sign candidate');checks++;
eq(haraCandidate.finalAmsaCertified,false,'candidate never self-certifies');
const missingHarana=cgRajanAmsaHaranaResearch({planet:'குரு',rawAmsaYears:12});
eq(missingHarana.resolved,false,'missing chart evidence blocks Amsa Harana');
eq(missingHarana.adjustedAmsaYearsCandidate,null,'missing evidence never assumes no Harana');
const collisionHarana=cgRajanAmsaHaranaResearch({...completeHaranaEvidence,occupantCount:2,strongestOccupantVerified:false});
eq(collisionHarana.resolved,false,'multiple occupants require verified strongest graha');
eq(collisionHarana.adjustedAmsaYearsCandidate,null,'Shadbala occupant choice cannot be guessed');
const totals=cgRajanCompareGrahas({planets:ref}).totals;
eq(totals.amsa.traditionalUnits,{years:48,months:0,days:0,nazhigai:0},
 'seven Amsa A terms sum to 48 traditional years in printed example input');
const sumNadis=totals.pinda.totalNazhigai+totals.natural.totalNazhigai+totals.amsa.totalNazhigai;
eq(totals.averageOfThreeTotals.exactNazhigaiNumerator,sumNadis,'mean numerator is sum of three totals');
eq(totals.averageOfThreeTotals.exactNazhigaiDenominator,3,'mean denominator remains three');
eq(totals.averageOfThreeTotals.exactNazhigai,sumNadis/3,'mean retains exact third-nazhigai precision');
const oneThird=cgRajanMeanThreeTraditionalTotals({pindaTotalNazhigai:1,naturalTotalNazhigai:0,amsaTotalNazhigai:0});
eq(oneThird.traditionalUnits.nazhigai,0,'one-third has no whole nazhigai');
eq(oneThird.traditionalUnits.nazhigaiFractionNumerator,1,'one-third nazhigai retained');
eq(oneThird.traditionalUnits.nazhigaiFractionDenominator,3,'fraction denominator is three');
const twoThirds=cgRajanMeanThreeTraditionalTotals({pindaTotalNazhigai:2,naturalTotalNazhigai:0,amsaTotalNazhigai:0});
eq(twoThirds.traditionalUnits.nazhigaiFractionNumerator,2,'two-thirds nazhigai retained');
eq(twoThirds.traditionalUnits.nazhigaiFractionDenominator,3,'two-thirds denominator is three');
for(const html of [ta,en]){
 ok(!/NaN|undefined|\[object Object\]/.test(html),'no NaN/undefined');
 ok(!/deathAgeOrDate|totalHumanLifetime|combinedLongevityYears/.test(html),
 'no internal lifespan/death data printed');
}
const src=fs.readFileSync(new URL('../public/horoscope/horoscope.js',import.meta.url),'utf8');
const printSrc=fs.readFileSync(new URL('../public/horoscope/report-print.js',import.meta.url),'utf8');
ok(src.includes("await import('./offline/cg-rajan-ayurdaya-pinda.browser.mjs')"),
 'live Horoscope module integration');
ok(src.includes("sectionI.insertAdjacentHTML('beforeend',html)"),
 'Ayurdaya is attached inside Advanced Analysis I, safe from print legacy stripping');
ok(printSrc.includes("root.querySelectorAll('.integrated-predictions"),'print strips only legacy content');
const births=[['1971-05-04','05:05'],['1974-01-11','16:04'],
 ['1992-07-31','22:05'],['1994-06-15','13:03'],['2015-09-06','09:30']];
let count=0;
for(const [date,time] of births){
 const r=await full({date,time,lat:11.232,lon:78.88,
  utcOffsetMinutes:330,referenceDate:'2026-10-17',name:'private research'});
 ok(r.ok,'calculated birth '+date);
 const x=cgRajanCompareGrahas({planets:r.chart.planets});
 eq(x.entries.length,7,'all grahas '+date);
 eq(x.combinedLongevityYears,null,'no calculated age '+date);
 eq(x.predictionCertified,false,'no certification '+date);
 const perNatalHtml=cgRajanAyurdayaReportHtml({planets:r.chart.planets,language:'en'});
 ok(perNatalHtml.includes('Pinda Ayurdaya')&&perNatalHtml.includes('Naisargika Ayurdaya')&&
  perNatalHtml.includes('Amsa Ayurdaya'),'three-method html ' + date);
 eq((perNatalHtml.match(/<tr\b/g)||[]).length,10,'header + seven grahas + total + average '+date);
 count+=x.entries.length;
}
eq(count,35,'five births x seven grahas');
console.log(JSON.stringify({pass:true,assertions:checks,printedPinda:2,natalResearchPlanetPairs:35,
 customerHtml:{tamil:true,english:true},certifiedWholeAyurdaya:false,
 printedLifetimeYearsToCustomers:false,deathTimingComputed:false}));
