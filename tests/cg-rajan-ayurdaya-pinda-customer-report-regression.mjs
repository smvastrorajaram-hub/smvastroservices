import assert from 'node:assert/strict';
import {full} from '../public/horoscope/offline/offline-engine.mjs';
import {cgRajanSevenNaturalResearch as natural} from '../public/horoscope/offline/cg-rajan-ayurdaya-research.browser.mjs';
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
let naturalRows=0;const naturalSignatures=[];
for(const [date,time] of [
 ['1971-05-04','05:05'],['1974-01-11','16:04'],
 ['1992-07-31','22:05'],['1994-06-15','13:03'],
 ['2015-09-06','09:30']
]){
 const r=await full({date,time,lat:11.232,lon:78.88,
  utcOffsetMinutes:330,referenceDate:'2026-10-17',name:'Rajan Ayurdaya printable QA'});
 yes(r.ok,'source natal compute '+date);
 const naturalResult=natural({planets:r.chart.planets});
 eq(naturalResult.grahaCount,7,date+' isolated CG Rajan natural research has seven grahas');
 eq(naturalResult.publishedToCustomers,false,date+' natural research is not published as a customer prediction');
 eq(naturalResult.fullAyurdayaCertified,false,date+' full Ayurdaya remains uncertified');
 eq(naturalResult.natalTotalYears,null,date+' research does not combine a life-expectancy total');
 eq(naturalResult.predictedDeathAge,null,date+' research does not calculate a death age');
 eq(naturalResult.otherAyurdayaSystemsCombined,false,date+' no cross-book system mixing');
 const naturalSignature=[];
 for(const v of Object.values(naturalResult.byPlanet)){
  naturalRows++;
  yes(Number.isFinite(v.remainingArcDegrees)&&v.remainingArcDegrees>=180&&
   v.remainingArcDegrees<=360,date+' '+v.planet+' natural research arc is within source range');
  yes(Number.isFinite(v.theoreticalNaturalYearComponent)&&
   v.theoreticalNaturalYearComponent>=v.maximumNaturalYears/2-1e-9&&
   v.theoreticalNaturalYearComponent<=v.maximumNaturalYears+1e-9,
   date+' '+v.planet+' natural quotient is within source range');
  eq(v.individualLifespanCertified,false,date+' '+v.planet+' natural component is not certified as personal lifespan');
  eq(v.predictedDeathAge,null,date+' '+v.planet+' has no personal death-age prediction');
  naturalSignature.push(v.remainingArcDegrees.toFixed(5));
 }
 naturalSignatures.push(naturalSignature.join(','));
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
 yes(result.amsaMethodSelectionVerified===false,
  'Table E method selection remains unverified '+date);
 yes(result.totals.amsa.available===false&&result.totals.amsa.blockedBy==='method-selection',
  'Amsa total is withheld until Table E method selection is source-verified '+date);
 eq(result.totals.averageOfThreeTotals,null,
  'three-method mean is withheld until Table E method selection is verified '+date);
 yes(ta.includes('அம்ச அட்டவணை E நிபந்தனைக்குட்பட்டது')&&
     en.includes('Amsa Table E is conditional'),
  'both language reports disclose the Table E method-selection gate '+date);
 yes(ta.includes('ஆயுர்த்தாயக் கணக்கீடு')&&en.includes('Ayurdaya Calculation')&&!ta.includes('Jathaka Kanitham')&&!en.includes('Jathaka Kanitham'),
  'bilingual source-neutral customer heading');
 yes(!ta.includes('Jathaka Kanitham')&&!en.includes('Jathaka Kanitham')&&!ta.includes('Harana evidence incomplete')&&!en.includes('Harana evidence incomplete'),
  'no source-book name or long calculation indication in customer results');
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
  yes(lang.includes('Average Ayurdaya')||lang.includes('சராசரி ஆயுர்த்தாயம்'),'mean row exists');
  yes(lang.includes('These are estimates from traditional Ayurdaya methods only; they do not establish actual lifespan or predict the time of death.')||lang.includes('இவை பாரம்பரிய ஆயுர்த்தாய முறைகளின் கணக்கீட்டு மதிப்பீடுகள் மட்டுமே; உண்மையான ஆயுளையோ மரண நேரத்தையோ உறுதியாகக் கூறுபவை அல்ல.'),'customer report shows the actual-lifespan disclaimer');
  const totalRow=lang.match(/<tr class="smv-ayurdaya-totals">[\s\S]*?<\/tr>/)?.[0]||'';
  const averageRow=lang.match(/<tr class="smv-ayurdaya-average">[\s\S]*?<\/tr>/)?.[0]||'';
  yes((totalRow.match(/<strong>/g)||[]).length===3,'three Ayurdaya totals each bold in customer HTML');
  yes(averageRow.includes('colspan="3"')&&averageRow.includes('class="smv-ayurdaya-average-value"'),
    'average result is separate from average label in customer HTML');
  const blocked=(lang.match(/data-amsa-harana="blocked"/g)||[]).length;
  const adjusted=(lang.match(/data-amsa-harana="adjusted-candidate"/g)||[]).length;
  const raw=(lang.match(/data-amsa-harana="raw-unadjusted"/g)||[]).length;
  eq(blocked+adjusted+raw,7,'each graha has adjusted, raw-unadjusted, or data-missing Amsa cell');
  eq(blocked,0,'per-graha Table E candidates are available internally even though method selection is blocked');
  eq(adjusted,0,'no per-graha Table E Harana adjustment is published before method selection');
  eq(raw,7,'all seven Amsa Table E rows are raw-unadjusted in the customer report');
  yes(lang.includes('Raw: ')||lang.includes('மூல மதிப்பு: '),
    'unverified Amsa Table E raw terms have an explicit label');
  const pindaAdjusted=(lang.match(/data-pinda-harana="adjusted-candidate"/g)||[]).length;
  const pindaRaw=(lang.match(/data-pinda-harana="raw-unadjusted"/g)||[]).length;
  const naturalAdjusted=(lang.match(/data-natural-harana="adjusted-candidate"/g)||[]).length;
  const naturalRaw=(lang.match(/data-natural-harana="raw-unadjusted"/g)||[]).length;
  eq(pindaAdjusted+pindaRaw,7,
    'Pinda report exposes seven adjusted or clearly raw rows '+date);
  eq(naturalAdjusted+naturalRaw,7,
    'Naisargika report exposes seven adjusted or clearly raw rows '+date);
  yes(lang.includes('data-total-harana-nazhigai=')&&lang.includes('data-raw-amsa-years=')&&!lang.includes('data-adjusted-amsa-years='),
    'customer table audits Pinda/Naisargika Harana while keeping Amsa Table E raw '+date);
  eq(lang.includes('data-amsa-total="adjusted-candidate"'),false,
    'Amsa total cannot be displayed as adjusted before Table E method selection');
  eq(lang.includes('data-amsa-total="blocked"'),true,
    'Amsa total shows an explicit blocked marker until method selection is verified');
  eq(lang.includes('data-amsa-total="raw-unadjusted"'),false,
    'Amsa total is not mislabeled as merely a Harana issue when the real blocker is method selection');
  yes(!lang.includes('undefined')&&!lang.includes('NaN'),'no malformed rows');
 }
 seen.add(ta);
}
eq(rows,35,'five natal charts x seven grahas Pinda and natural');
eq(seen.size,5,'distinct chart numeric report outputs');
eq(naturalRows,35,'consolidated CG Rajan natural research covers five charts × seven grahas');
eq(new Set(naturalSignatures).size,5,'consolidated natural research preserves five distinct chart signatures');
close(amsa({planet:'செவ்வாய்',trueLongitude:206.5}).rawAmsaYears,1.95,
 'source Amsa table value with fractional degree at 206°30′');
eq(amsa({planet:'செவ்வாய்',trueLongitude:206.5}).allSourceReductionsApplied,false,
 'Amsa remains explicitly provisional before book reductions');
console.log(JSON.stringify({pass:true,assertions,printedPindaExamples:2,
 perNatalRows:35,languageVersions:2,fullEightMethodCertification:false,
 printedPatientLifespan:false,deathAgePredictions:0}));
