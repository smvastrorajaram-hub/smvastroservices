import assert from 'node:assert/strict';
import {full} from '../public/horoscope/offline/offline-engine.mjs';
import {cgRajanPindaGraha as pinda,
 cgRajanAmsaAyurdayaGraha as amsa,
 cgRajanAmsaHaranaResearch as amsaHarana,
 cgRajanMeanThreeTraditionalTotals as exactMean,
 cgRajanCompareGrahas as all,
 cgRajanAyurdayaReportHtml as html}
 from '../public/horoscope/offline/cg-rajan-ayurdaya-pinda.browser.mjs';
const close=(a,b,m)=>assert.ok(Math.abs(a-b)<1e-9,m+': '+a+' != '+b);
let assertions=0;
const yes=(a,m)=>{assert.ok(a,m);assertions++};
const eq=(a,b,m)=>{assert.deepEqual(a,b,m);assertions++};
const examples=[
 {planet:'சூரியன்',trueLongitude:167+2/60,arc:202+58/60,
  years:19,units:[10,8,16,22]},
 {planet:'குரு',trueLongitude:28+17/60,arc:293+17/60,
  years:15,units:[12,2,19,15]}
];
for(const e of examples){
 const r=pinda(e);
 close(r.retainedArcDegrees,e.arc,e.planet+' book p249 angular arc');assertions++;
 eq(r.maximumPindaYears,e.years,'book Pinda year quota '+e.planet);
 eq(Object.values(r.traditionalUnits),e.units,'book p249 exact printed result '+e.planet);
 eq(r.totalHumanLifetime,null,'never person lifespan');
 eq(r.deathAgeOrDate,null,'never death age/date');
}
const unknownHarana=amsaHarana({planet:'செவ்வாய்',rawAmsaYears:2});
eq(unknownHarana.adjustedAmsaYearsCandidate,null,'missing evidence blocks customer Harana result');
eq(unknownHarana.finalAmsaCertified,false,'Amsa Harana research stays uncertified');
eq(exactMean({pindaTotalNazhigai:1,naturalTotalNazhigai:0,amsaTotalNazhigai:1})
 .traditionalUnits.nazhigaiFractionNumerator,2,'exact mean preserves two-thirds nazhigai');
const max={'சூரியன்':[10,19],'சந்திரன்':[33,25],'செவ்வாய்':[298,15],
 'புதன்':[165,12],'குரு':[95,15],'சுக்கிரன்':[357,21],'சனி':[200,20]};
for(const [planet,[exalt,quota]] of Object.entries(max)){
 const top=pinda({planet,trueLongitude:exalt});
 close(top.retainedArcDegrees,360,'exaltation major arc '+planet);assertions++;
 close(top.symbolicComponentYears,quota,'exaltation full quota '+planet);assertions++;
 const min=pinda({planet,trueLongitude:exalt+180});
 close(min.symbolicComponentYears,quota/2,'opposition half quota '+planet);assertions++;
}
assert.throws(()=>pinda({planet:'ராகு',trueLongitude:10}),RangeError);assertions++;
assert.throws(()=>pinda({planet:'சனி',trueLongitude:Infinity}),TypeError);assertions++;
let rows=0;const seen=new Set();
for(const [date,time] of [
 ['1971-05-04','05:05'],['1974-01-11','16:04'],
 ['1992-07-31','22:05'],['1994-06-15','13:03'],
 ['2015-09-06','09:30']
]){
 const r=await full({date,time,lat:11.232,lon:78.88,
  utcOffsetMinutes:330,referenceDate:'2026-10-17',name:'Rajan Ayurdaya printable QA'});
 yes(r.ok,'source natal compute '+date);
 const result=all({planets:r.chart.planets,lagna:r.chart.lagna});
 eq(result.entries.length,7,'seven conventional grahas');
 eq(result.allEightMethodsComplete,false,'no artificial 8-method pass');
 eq(result.combinedLongevityYears,null,'no invented individual lifespan');
 eq(result.deathAgeOrDate,null,'no invented death age');
 const ta=html({planets:r.chart.planets,lagna:r.chart.lagna,language:'ta'});
 const en=html({planets:r.chart.planets,lagna:r.chart.lagna,language:'en'});
 yes(result.totals.pinda.available===true,
  'Pinda total resolves from all seven Harana-adjusted rows '+date);
 yes(result.totals.natural.available===true,
  'Naisargika total resolves from all seven Harana-adjusted rows '+date);
 yes(result.totals.amsa.available===true,
  'Amsa total resolves from all seven post-Harana rows '+date);
 yes(Boolean(result.totals.averageOfThreeTotals),
  'three-method mean is calculated for a fully evidenced regression chart '+date);
 yes(!ta.includes('மூன்று முறைகளின் ஹரணத் தகவல் முழுமையில்லை')&&
     !en.includes('Harana evidence incomplete'),
  'no incomplete-average fallback for a fully evidenced regression chart '+date);
 yes(ta.includes('ஜாதக கணிதம்')&&en.includes('Jathaka Kanitham'),
  'bilingual customer report heading');
 yes(ta.includes('ஆயுள் அல்லது மரண')&&/not predictions of lifespan/i.test(en),
  'plain-language boundaries retained');
 for(const x of result.entries){
  rows++;
  yes(Number.isFinite(x.pinda.symbolicComponentYears),'numeric Pinda '+date+x.name);
  yes(Number.isFinite(x.natural.theoreticalNaturalYearComponent),
    'numeric Naisargika '+date+x.name);
  yes(x.pindaHarana?.resolved===true,'Pinda Harana resolves '+date+x.name);
  yes(x.naturalHarana?.resolved===true,'Naisargika Harana resolves '+date+x.name);
  yes(x.amsaHarana?.resolved===true,'Amsa Harana resolves '+date+x.name);
  yes(x.pindaHarana.adjustedNazhigaiCandidate<=x.pindaHarana.rawNazhigai,
    'Pinda does not increase the raw contribution during Harana '+date+x.name);
  yes(x.naturalHarana.adjustedNazhigaiCandidate<=x.naturalHarana.rawNazhigai,
    'Naisargika does not increase the raw contribution during Harana '+date+x.name);
  eq(x.pinda.totalHumanLifetime,null,'Pinda never makes death date '+date+x.name);
  yes(Number.isFinite(x.amsaHarana.adjustedAmsaYearsCandidate),
    'numeric post-Harana Amsa candidate '+date+x.name);
 }
 for(const lang of [ta,en]){
  eq((lang.match(/<tr\b/g)||[]).length,10,'header + seven rows + total + average');
  yes(lang.includes('Amsa Ayurdaya')||lang.includes('அம்ச ஆயுர்த்தாயம்'),'Amsa column has the required bilingual heading');
  yes(lang.includes('Average Ayurdaya')||lang.includes('சராசரி ஆயுள்'),'mean row exists');
  const blocked=(lang.match(/data-amsa-harana="blocked"/g)||[]).length;
  const adjusted=(lang.match(/data-amsa-harana="adjusted-candidate"/g)||[]).length;
  eq(blocked+adjusted,7,'each graha has adjusted Amsa candidate or blocked cell');
  eq((lang.match(/data-pinda-harana="adjusted-candidate"/g)||[]).length,7,
    'Pinda report exposes seven actual post-Harana rows '+date);
  eq((lang.match(/data-natural-harana="adjusted-candidate"/g)||[]).length,7,
    'Naisargika report exposes seven actual post-Harana rows '+date);
  yes(lang.includes('data-total-harana-nazhigai=')&&lang.includes('data-adjusted-amsa-years='),
    'customer table includes auditable raw/deduction/adjusted values '+date);
  eq(lang.includes('data-amsa-total="adjusted-candidate"'),result.totals.amsa.available===true,
    'Amsa total is shown only when every chart-specific Harana resolves');
  eq(lang.includes('data-amsa-total="blocked"'),result.totals.amsa.available!==true,
    'Amsa total is withheld if any chart-specific Harana is blocked');
  yes(!lang.includes('undefined')&&!lang.includes('NaN'),'no malformed rows');
 }
 seen.add(ta);
}
eq(rows,35,'five natal charts x seven grahas Pinda and natural');
eq(seen.size,5,'distinct chart numeric report outputs');
close(amsa({planet:'செவ்வாய்',trueLongitude:206.5}).rawAmsaYears,1.95,
 'source Amsa table value with fractional degree at 206°30′');
eq(amsa({planet:'செவ்வாய்',trueLongitude:206.5}).allSourceReductionsApplied,false,
 'Amsa remains explicitly provisional before book reductions');
console.log(JSON.stringify({pass:true,assertions,printedPindaExamples:2,
 perNatalRows:35,languageVersions:2,fullEightMethodCertification:false,
 printedPatientLifespan:false,deathAgePredictions:0}));
