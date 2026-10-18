import assert from 'node:assert/strict';
import {full} from '../public/horoscope/offline/offline-engine.mjs';
import {cgRajanSevenNaturalResearch as natural} from '../public/horoscope/offline/cg-rajan-ayurdaya-research.browser.mjs';
import {cgRajanPindaGraha as pinda,
 cgRajanAmsaAyurdayaGraha as amsa,
 cgRajanAmsaHaranaResearch as amsaHarana,
 cgRajanMeanThreeTraditionalTotals as exactMean,
 cgRajanCompareGrahas as all,
 cgRajanAyurdayaReportHtml as html,
 cgRajanSelectAyurdayaMethod as selectMethod}
 from '../public/horoscope/offline/cg-rajan-ayurdaya-pinda.browser.mjs';
const makeSelectorChart=({sun=700,moon=600,mars=500,mercury=400,jupiter=300,venus=200,saturn=100,missing}={})=>
 [['சூரியன்',sun],['சந்திரன்',moon],['செவ்வாய்',mars],['புதன்',mercury],
  ['குரு',jupiter],['சுக்கிரன்',venus],['சனி',saturn]]
 .map(([name,totalVirupa],index)=>({
  name,longitude:index*30+1,bhava:index+1,
  strength6:{available:name!==missing,components:{},totalVirupa:name===missing?null:totalVirupa,classicalCertified:false}
 }));
const sunWins=selectMethod({planets:makeSelectorChart(),lagna:{longitude:0}});
eq(sunWins.selectedMethod,'pinda','Sun Shadbala selects Pindayurdaya');
const moonWins=selectMethod({planets:makeSelectorChart({sun:600,moon:700}),lagna:{longitude:0}});
eq(moonWins.selectedMethod,'natural','Moon Shadbala selects Naisargika Ayurdaya');
const lagnaLordWins=selectMethod({planets:makeSelectorChart({sun:500,moon:600,mars:700}),lagna:{longitude:0}});
eq(lagnaLordWins.selectedMethod,'amsa','Aries Lagna lord Mars Shadbala selects Amsa Ayurdaya');
const strengthTie=selectMethod({planets:makeSelectorChart({sun:700,moon:700}),lagna:{longitude:0}});
eq(strengthTie.available,false,'equal reference strengths block selection instead of averaging');
eq(strengthTie.reasonCode,'shadbala-tie','equal Shadbala reports a method-selection tie');
const missingStrength=selectMethod({planets:makeSelectorChart({missing:'சந்திரன்'}),lagna:{longitude:0}});
eq(missingStrength.reasonCode,'shadbala-unavailable','missing reference Shadbala blocks selection');
const missingLagna=selectMethod({planets:makeSelectorChart(),lagna:{}});
eq(missingLagna.reasonCode,'lagna-unavailable','missing calculated Lagna blocks Lagna-lord selection');
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
 yes(result.totals.amsa.available===true,
  'Amsa total resolves from all seven post-Harana rows '+date);
 yes(Boolean(result.totals.averageOfThreeTotals),
  'three-method mean is calculated for a fully evidenced regression chart '+date);
 yes(!ta.includes('மூன்று முறைகளின் ஹரணத் தகவல் முழுமையில்லை')&&
     !en.includes('Harana evidence incomplete'),
  'no incomplete-average fallback for a fully evidenced regression chart '+date);
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
 const selected=selectMethod({planets:r.chart.planets,lagna:r.chart.lagna});
 const methodLabels={
  pinda:{ta:'பிண்ட ஆயுள்',en:'Pinda Ayurdaya'},
  natural:{ta:'நைசர்க்கிக ஆயுள்',en:'Naisargika Ayurdaya'},
  amsa:{ta:'அம்ச ஆயுர்த்தாயம்',en:'Amsa Ayurdaya'}
 };
 for(const [lang,code] of [[ta,'ta'],[en,'en']]){
  if(!selected.available){
   eq((lang.match(/<tr\b/g)||[]).length,0,'missing/tied Shadbala never chooses a fallback method '+date+' '+code);
   eq(lang.includes('data-ayurdaya-selection="unavailable"'),true,'no-selection state is explicit '+date+' '+code);
   for(const labels of Object.values(methodLabels))yes(!lang.includes(labels[code]),'no method is shown when Shadbala selection is unsafe '+date+' '+code);
   yes(!lang.includes(code==='ta'?'சராசரி ஆயுர்த்தாயம்':'Average Ayurdaya'),'no mean is shown in no-selection state '+date+' '+code);
   continue;
  }
  eq((lang.match(/<tr\b/g)||[]).length,9,'single method: header + seven grahas + total '+date+' '+code);
  yes(lang.includes(methodLabels[selected.selectedMethod][code]),'selected method heading is shown '+date+' '+code);
  eq(lang.includes('data-ayurdaya-selection="'+selected.selectedMethod+'"'),true,'the selected method is explicit in customer HTML '+date+' '+code);
  eq(lang.includes('data-selected-reference-role="'+selected.referenceRole+'"'),true,'the correct Sun/Moon/Lagna-lord reference is recorded '+date+' '+code);
  yes(!lang.includes(code==='ta'?'சராசரி ஆயுர்த்தாயம்':'Average Ayurdaya'),'no mean/average is shown '+date+' '+code);
  const otherMethods=Object.keys(methodLabels).filter(method=>method!==selected.selectedMethod);
  for(const other of otherMethods){
   yes(!lang.includes(methodLabels[other][code]),'unchosen method hidden: '+other+' '+date+' '+code);
  }
  const totalRow=lang.match(/<tr class="smv-ayurdaya-totals">[\s\S]*?<\/tr>/)?.[0]||'';
  eq((totalRow.match(/<strong>/g)||[]).length,1,'only the selected method total is emphasized '+date+' '+code);
  eq(lang.includes('data-selected-total="adjusted-candidate"'),true,'selected seven-graha total is available for this fully evidenced chart '+date+' '+code);
  eq(lang.includes('class="smv-ayurdaya-average"'),false,'no average row markup '+date+' '+code);
  const selectedPrefix=selected.selectedMethod==='amsa'?'data-amsa-harana=':
   selected.selectedMethod==='pinda'?'data-pinda-harana=':'data-natural-harana=';
  eq((lang.match(new RegExp(selectedPrefix+'"(?:adjusted-candidate|raw-unadjusted)"','g'))||[]).length,7,
   'exactly seven rows for the selected Ayurdaya method '+date+' '+code);
  const unselectedPrefixes=['pinda','natural','amsa'].filter(method=>method!==selected.selectedMethod);
  for(const method of unselectedPrefixes){
   eq(lang.includes('data-'+method+'-harana='),false,'other graha calculation rows are omitted '+method+' '+date+' '+code);
  }
  yes(lang.includes(code==='ta'
   ?'இவை பாரம்பரிய ஆயுர்த்தாய முறையின் கணக்கீட்டு மதிப்பீடுகள் மட்டுமே; உண்மையான ஆயுளையோ மரண நேரத்தையோ உறுதியாகக் கூறுபவை அல்ல.'
   :'This is a traditional Ayurdaya calculation only; it does not establish actual lifespan or predict the time of death.'),
   'actual-lifespan disclaimer stays visible '+date+' '+code);
  yes(!lang.includes('undefined')&&!lang.includes('NaN'),'no malformed selected-method rows '+date+' '+code);
  if(selected.selectedMethod==='amsa'){
   yes(lang.includes('data-adjusted-amsa-years='),'Amsa row preserves auditable Harana details '+date+' '+code);
  }else{
   yes(lang.includes('data-total-harana-nazhigai='),'Pinda/Naisargika row preserves auditable Harana details '+date+' '+code);
  }
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
