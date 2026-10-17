/** C.G. Rajan Part I Pindayurdaya printed-example and browser report QA.
 * Source: user supplied Jathaka Kanitham I printed pp.249–254.
 * NEVER predict an actual lifespan or death age.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {full} from '../public/horoscope/offline/offline-engine.mjs';
import {cgRajanPindaGraha, cgRajanCompareGrahas, cgRajanAyurdayaReportHtml}
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
ok(ta.includes('பிண்ட ஆயுள்')&&ta.includes('நைசர்க்கிக ஆயுள்'),'Tamil columns');
ok(en.includes('Pinda component')&&en.includes('Natural component'),'English columns');
ok(ta.includes('10 வ 8 மா 16 நா 22 நாழி'),'Tamil Sun printed result');
ok(en.includes('12y 2m 19d 15n'),'English Jupiter printed result');
eq((ta.match(/<tr>/g)||[]).length,8,'one header plus seven planet rows');
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
 ok(cgRajanAyurdayaReportHtml({planets:r.chart.planets,language:'en'}).includes('Natural component'),
 'html ' + date);
 count+=x.entries.length;
}
eq(count,35,'five births x seven grahas');
console.log(JSON.stringify({pass:true,assertions:checks,printedPinda:2,natalResearchPlanetPairs:35,
 customerHtml:{tamil:true,english:true},certifiedWholeAyurdaya:false,
 printedLifetimeYearsToCustomers:false,deathTimingComputed:false}));
