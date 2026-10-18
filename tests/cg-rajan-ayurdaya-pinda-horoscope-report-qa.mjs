/** C.G. Rajan Part I Pindayurdaya printed-example and browser report QA.
 * Source: user supplied Jathaka Kanitham I printed pp.249–254.
 * NEVER predict an actual lifespan or death age.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {full} from '../public/horoscope/offline/offline-engine.mjs';
import {cgRajanPindaGraha, cgRajanAmsaAyurdayaGraha, cgRajanAmsaHaranaResearch,
 cgRajanMeanThreeTraditionalTotals, cgRajanCompareGrahas, cgRajanAyurdayaReportHtml,
 cgRajanGururodayaHaranaResearch, cgRajanPindaNaisargikaHaranaResearch}
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
ok(ta.includes('பிண்ட ஆயுள்')&&ta.includes('நைசர்க்கிக ஆயுள்')&&ta.includes('அம்ச ஆயுர்த்தாயம்'),'Tamil three columns');
ok(en.includes('Pinda Ayurdaya')&&en.includes('Naisargika Ayurdaya')&&en.includes('Amsa Ayurdaya'),'English three columns');
ok(ta.includes('சராசரி ஆயுர்த்தாயம்')&&en.includes('Average Ayurdaya'),'three-total arithmetic mean is displayed');
const totalRowOf=html=>html.match(/<tr class="smv-ayurdaya-totals">[\s\S]*?<\/tr>/)?.[0]||'';
const averageRowOf=html=>html.match(/<tr class="smv-ayurdaya-average">[\s\S]*?<\/tr>/)?.[0]||'';
for(const [html,language] of [[ta,'Tamil'],[en,'English']]){
 const totalRow=totalRowOf(html),averageRow=averageRowOf(html);
 ok((totalRow.match(/<strong>/g)||[]).length===3,language+' three Ayurdaya totals are each bold');
 ok(averageRow.includes('colspan="3"')&&averageRow.includes('class="smv-ayurdaya-average-label"')&&averageRow.includes('class="smv-ayurdaya-average-value"'),
  language+' average label and result occupy separate table cells');
 ok(averageRow.includes('<strong>'),language+' average value is bold and separate from its label');
}
ok(ta.includes('மொத்தம் (7 கிரகங்கள்)')&&!ta.includes('அட்டவணை A')&&!ta.includes('Jathaka Kanitham'),'Tamil total row has no source-book notice');
ok(en.includes('Total (7 grahas)')&&en.includes('Average Ayurdaya')&&!en.includes('provisional arithmetic mean')&&!en.includes('Jathaka Kanitham'),'English total/mean rows have no indication/source note');
eq(research.entries.find(x=>x.name==='சூரியன்').pinda.traditionalUnits,
 {years:10,months:8,days:16,nazhigai:22},
 'raw printed Sun Pinda example remains testable internally');
eq(research.entries.find(x=>x.name==='குரு').pinda.traditionalUnits,
 {years:12,months:2,days:19,nazhigai:15},
 'raw printed Jupiter Pinda example remains testable internally');
eq((ta.match(/data-pinda-harana="raw-unadjusted"/g)||[]).length,7,
 'Pinda raw arithmetic remains visible but is explicitly marked unadjusted when Harana evidence is missing');
eq((ta.match(/data-natural-harana="raw-unadjusted"/g)||[]).length,7,
 'Naisargika raw arithmetic remains visible but is explicitly marked unadjusted when Harana evidence is missing');
ok(ta.includes('data-pinda-total="raw-unadjusted"')&&ta.includes('data-natural-total="raw-unadjusted"'),
 'Pinda and Naisargika raw totals remain visible with an explicit unadjusted marker');
ok(!en.includes('Harana evidence incomplete')&&en.includes('Average Ayurdaya')&&en.includes('Mean of raw totals; Harana reductions not applied')&&en.includes('Raw: '),
 'unresolved Harana cells and separate mean label/value expose raw terms without claiming adjustment');
eq((ta.match(/<tr\b/g)||[]).length,10,'header + seven grahas + total + average');
eq(ta.includes('அம்ச ஆயுர்த்தாயம் (அட்டவணை A — ஹரணத்திற்கு முன்)'),false,
 'Amsa heading omits the Harana status label in Tamil');
eq(en.includes('AMSA AYURDAYAM (Table A — before Harana)'),false,
 'Amsa heading omits the Harana status label in English');
ok(ta.includes('மூல மதிப்பு: ')&&en.includes('Raw: '),
 'raw Table-A and Pinda/Naisargika terms are explicitly labelled as raw values when Harana is unresolved');
ok(ta.includes('data-amsa-harana="raw-unadjusted"')&&en.includes('data-amsa-harana="raw-unadjusted"'),
 'missing natal Harana evidence is labelled as raw-unadjusted in both report languages');
eq((ta.match(/data-amsa-harana="raw-unadjusted"/g)||[]).length,7,
 'fixture without chart facts still displays all seven raw Amsa terms with unadjusted labeling');
ok(ta.includes('data-amsa-total="raw-unadjusted"')&&en.includes('data-amsa-total="raw-unadjusted"'),
 'raw Amsa table total stays visible but is marked unadjusted until every Harana resolves');
const amsaCases=[
 [0,0],[3+20/60,1],[6+40/60,2],[40,12],[43+20/60,1],
 [167+2/60,2.11],[118+10/60,11.45],[206.5,1.95],[191+52/60,9.56],
 [28+17/60,8.485],[204+32/60,1.36],[230+27/60,9.135]
];
for(const [longitude,years] of amsaCases){
 const row=cgRajanAmsaAyurdayaGraha({planet:'செவ்வாய்',trueLongitude:longitude});
 ok(Math.abs(row.rawAmsaYears-years)<1e-8,
  'C.G. Rajan Amsa table includes fractional arc '+longitude+': '+row.rawAmsaYears+' vs '+years);
}
eq(cgRajanAmsaAyurdayaGraha({planet:'செவ்வாய்',trueLongitude:206.5}).traditionalUnits,
 {years:1,months:11,days:12,nazhigai:0},
 'fractional Table-A remainder converts into months/days by rule of three');
ok(Math.abs(cgRajanAmsaAyurdayaGraha({planet:'செவ்வாய்',trueLongitude:1+40/60}).rawAmsaYears-0.5)<1e-8,
 'first pada fraction is calculated from the 0° origin using the printed 200-minute rule');
ok(Math.abs(cgRajanAmsaAyurdayaGraha({planet:'செவ்வாய்',trueLongitude:41+40/60}).rawAmsaYears-12.5)<1e-8,
 'fraction within the printed 12-year pada uses Table C, not interpolation toward the next cycle label');
eq(cgRajanAmsaAyurdayaGraha({planet:'செவ்வாய்',trueLongitude:43+20/60}).rawAmsaYears,1,
 'Table A resets to year 1 at the next printed 3°20′ boundary');
// A one-fifth Chakrapada loss must carry through to days, not be
// truncated to whole years/months or replaced by the raw Table-A term.
const fifthLossCase=cgRajanAmsaHaranaResearch({
 planet:'செவ்வாய்',rawAmsaYears:3,enemySign:false,combust:false,
 houseFromLagna:8,occupantCount:1,chakrapadaBenefic:false,
 isExaltationSign:false,retrograde:false,ownSign:false,
 ownNavamsa:false,ownDrekkana:false,vargottama:false
});
eq(fifthLossCase.resolved,true,'house-8 one-fifth Harana has complete evidence');
eq(fifthLossCase.chakrapadaLossFraction,1/5,'house-8 Harana uses the printed one-fifth fraction');
eq(fifthLossCase.traditionalUnitsCandidate,
 {years:2,months:4,days:24,nazhigai:0},
 'fractional Amsa years normalize to 2y 4m 24d without dropping the day remainder');
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
// End-to-end renderer fixture: every required fact is explicit. Saturn is
// the sole occupant of Chakrapada house 7, so its malefic loss is 1/6. Jupiter
// is in enemy-sign Gemini and has no multiplier: raw Amsa 11 -> 7y 4m.
// Sun at 260° tests Drekkana wrap: Sagittarius' third Drekkana is Leo (sign 4).
const chartResolvedFixture=ref.map((p,i)=>({
 ...p,
 ...(p.name==='குரு'?{longitude:75+20/60}:{}),
 ...(p.name==='சூரியன்'?{longitude:260}:{}),
 bhava:[2,3,4,5,6,8,7][i],
 strength:{relationship:p.name==='குரு'?'பகை':'நட்பு',
  retrograde:false,exalted:false,ownSign:false}
}));
const resolvedChart=cgRajanCompareGrahas({planets:chartResolvedFixture});
eq(resolvedChart.entries.every(x=>x.amsaHarana.resolved===true),true,
 'all seven Amsa rows resolve when all chart evidence is explicit');
const remainderDisplayFixture=chartResolvedFixture.map(p=>
 p.name==='செவ்வாய்'?{...p,longitude:10,bhava:8}:
 p.name==='சுக்கிரன்'?{...p,bhava:9}:p);
const remainderHtml=cgRajanAyurdayaReportHtml({planets:remainderDisplayFixture,language:'en'});
ok(remainderHtml.includes('data-amsa-years="2" data-amsa-months="4" data-amsa-days="24" data-amsa-nazhigai="0"'),
 'Amsa report renderer preserves year/month/day/nazhigai after a one-fifth Harana');
ok(remainderHtml.includes('Post-Harana normalized units=2y 4m 24d 0n'),
 'Amsa row hover evidence exposes the exact normalized post-Harana units');
const jupiterPost=resolvedChart.entries.find(x=>x.name==='குரு').amsaHarana;
const sunPost=resolvedChart.entries.find(x=>x.name==='சூரியன்').amsaHarana;
eq(sunPost.multiplier,2,
 'wrapped Drekkana sign maps to Leo and applies the Sun own-Drekkana multiplier');
eq(sunPost.adjustedAmsaYearsCandidate,sunPost.rawAmsaYears*2,
 'own-Drekkana multiplier is applied after Harana without stacking another multiplier');
ok(Math.abs(jupiterPost.rawAmsaYears-10.6)<1e-8,'fixture Jupiter raw Table-A lookup preserves fractional arc');
eq(jupiterPost.enemySignLossFraction,1/3,'fixture derives enemy-sign Harana from chart relation');
eq(jupiterPost.multiplier,1,'fixture does not invent a dignity/retrograde multiplier');
eq(jupiterPost.traditionalUnitsCandidate,{years:7,months:0,days:24,nazhigai:0},
 'fractional Table-A term survives enemy-sign Harana and displays post-Harana days');
eq(resolvedChart.totals.amsa.available,true,
 'adjusted Amsa total available when all seven row candidates resolve');
const saturnAmsa=resolvedChart.entries.find(x=>x.name==='சனி').amsaHarana;
eq(saturnAmsa.chakrapadaApplied,true,'single occupant in house 7 receives Chakrapada Harana');
eq(saturnAmsa.chakrapadaLossFraction,1/6,'malefic house-7 Chakrapada loss is 1/6');
eq(resolvedChart.entries.every(x=>x.pindaHarana.resolved===true&&
 x.naturalHarana.resolved===true),true,
 'all Pinda and Naisargika candidates resolve only with complete chart Harana evidence');
const jupiterPinda=resolvedChart.entries.find(x=>x.name==='குரு').pindaHarana;
const jupiterNatural=resolvedChart.entries.find(x=>x.name==='குரு').naturalHarana;
eq(jupiterPinda.enemySignLossFraction,1/3,
 'Pinda applies the book enemy-sign Harana to Jupiter');
eq(jupiterNatural.enemySignLossFraction,1/3,
 'Naisargika applies the book enemy-sign Harana to Jupiter');
ok(jupiterPinda.adjustedNazhigaiCandidate<jupiterPinda.rawNazhigai,
 'Pinda candidate subtracts the source Harana, not just displays its raw component');
ok(jupiterNatural.adjustedNazhigaiCandidate<jupiterNatural.rawNazhigai,
 'Naisargika candidate subtracts the source Harana, not just displays its raw component');
eq(resolvedChart.totals.pinda.available,true,
 'Pinda total is made from seven Harana-adjusted rows');
eq(resolvedChart.totals.natural.available,true,
 'Naisargika total is made from seven Harana-adjusted rows');
// Printed p.248 Lagna conversion: six complete signs + 1°27′36″ =>
// 6 years, 1 month, 27 days and 36 nazhigai in the source's traditional units.
const lagnaGuru=cgRajanGururodayaHaranaResearch({
 planets:[{name:'சூரியன்',longitude:181+27/60+36/3600,bhava:1,amsaHaranaBenefic:false}],
 lagna:{longitude:181+27/60+36/3600}
});
eq(lagnaGuru.resolved,true,'Gururodaya resolves when Lagna data and a unique malefic occupant are explicit');
eq(lagnaGuru.applied,true,'Gururodaya applies to malefic closest to Lagna');
eq(lagnaGuru.lossNazhigai,6*21600+1*1800+27*60+36,
 'Gururodaya contribution uses the full Lagna sign/degree/minute/nazhigai notation');
const lagnaGuruHalved=cgRajanGururodayaHaranaResearch({
 planets:[
  {name:'சூரியன்',longitude:181+27/60+36/3600,bhava:1,amsaHaranaBenefic:false},
  {name:'புதன்',longitude:1+27/60+36/3600,bhava:7,amsaHaranaBenefic:true}
 ],
 lagna:{longitude:181+27/60+36/3600}
});
eq(lagnaGuruHalved.resolved,true,'Gururodaya resolves when the printed aspect rule is evidenced');
eq(lagnaGuruHalved.beneficAspecting,true,'benefic Mercury in house 7 views the Lagna malefic');
eq(lagnaGuruHalved.lossNazhigai,lagnaGuru.lossNazhigai/2,
 'a permitted benefic aspect halves the Gururodaya Harana');
const lagnaGuruBlocked=cgRajanGururodayaHaranaResearch({
 planets:[{name:'சந்திரன்',longitude:181,bhava:1}],
 lagna:{longitude:181}
});
eq(lagnaGuruBlocked.resolved,false,'Gururodaya blocks missing explicit benefic/malefic evidence');
const reducedPinda=cgRajanPindaNaisargikaHaranaResearch({
 planet:'குரு',rawNazhigai:10000,
 amsaHarana:{resolved:true,enemySignLossFraction:1/3,combustionLossFraction:0,chakrapadaLossFraction:0},
 gururodayaHarana:{resolved:true,applied:false,targetPlanet:null,lossNazhigai:0}
});
eq(reducedPinda.resolved,true,'Pinda/Naisargika Harana helper accepts complete evidence');
eq(reducedPinda.traditionalUnitsCandidate,
 {years:0,months:3,days:21,nazhigai:7},
 'Harana subtraction rounds only after the adjusted component is calculated');

ok(resolvedChart.totals.averageOfThreeTotals?.traditionalUnits,
 'three-method mean is rendered when all seven post-Harana candidates resolve');
const resolvedHtml=cgRajanAyurdayaReportHtml({planets:chartResolvedFixture,language:'en'});
eq((resolvedHtml.match(/data-amsa-harana="adjusted-candidate"/g)||[]).length,7,
 'all seven fully evidenced grahas display post-Harana candidates');
eq((resolvedHtml.match(/data-pinda-harana="adjusted-candidate"/g)||[]).length,7,
 'all seven Pinda rows display post-Harana candidates');
eq((resolvedHtml.match(/data-natural-harana="adjusted-candidate"/g)||[]).length,7,
 'all seven Naisargika rows display post-Harana candidates');
ok(resolvedHtml.includes('data-total-harana-nazhigai=')&&
 resolvedHtml.includes('data-adjusted-amsa-years='),
 'the customer table retains row-level Harana arithmetic for audit');
ok(resolvedHtml.includes('data-amsa-total="adjusted-candidate"'),
 'adjusted Amsa total is rendered only when complete');
const jupiterAmsaCell=resolvedHtml.match(/<tr><th scope="row">Jupiter<\/th>.*?<td data-amsa-harana="adjusted-candidate"[^>]*>(.*?)<\/td><\/tr>/)?.[1];
eq(jupiterAmsaCell,'7y 0m 24d 0n',
 'customer table cell preserves post-Harana fractional Table-A days');
const totals=cgRajanCompareGrahas({planets:ref}).totals;
eq(totals.amsa.traditionalUnits,null,
 'Amsa adjusted total is not fabricated when chart-specific Harana evidence is absent');
eq(totals.amsa.available,false,'Amsa total is explicitly unavailable until all adjusted rows resolve');
eq(totals.amsaTableARaw.traditionalUnits,{years:44,months:0,days:18,nazhigai:0},
 'raw Table-A total preserves fractional day arithmetic internally and is not presented as final');
eq(totals.averageOfThreeTotals,null,
 'three-method mean is withheld rather than calculated from raw Amsa Table-A values');
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
const shadbalaStart=src.indexOf('<h3 class="base-shadbala"');
const shadbalaEnd=src.indexOf('<div class="transit-before-vimsottari">',shadbalaStart);
const shadbalaUi=src.slice(shadbalaStart,shadbalaEnd);
ok(printSrc.includes("const dashaTree=root.querySelector('#dashaTree')")&&printSrc.includes('dasha-head-print')&&!printSrc.includes('rawDasha.remove()'),
 'native PDF keeps Dasa/Bhukti/Antaram and makes interactive headings printable');
ok(shadbalaUi.includes('💪 ஷட்பலம்')&&!shadbalaUi.includes('💪 ஷட்பலம் (')&&!shadbalaUi.includes('Uttara Kalamrita'),'primary Horoscope has a source-neutral Shadbala heading');
ok(shadbalaUi.includes('strengthJathakaKanitham')&&shadbalaUi.includes('partialSubtotalExcludingCheshtaAndDrig')&&!shadbalaUi.includes('smv-shadbala-status')&&!shadbalaUi.includes('யுத்த பலம்')&&!shadbalaUi.includes('Yuddha (UK)'),
 'primary Shadbala shows calculated C.G. Rajan components and subtotal without a separate Yuddha/status column');
ok(shadbalaUi.includes('smv-shadbala-table'),'primary Shadbala table has a stable UI regression hook');
eq(shadbalaUi.includes('strength3'),false,'primary customer Shadbala never substitutes the legacy strength3 model');
eq(shadbalaUi.includes('சரிபார்க்கப்படாததால்')||shadbalaUi.includes('இறுதிச் சான்றிதழ் அல்ல'),false,
 'primary Shadbala has no indication message');
const analysisShadbalaStart=src.indexOf('const shadbalaRows=caPlanets.filter');
const analysisShadbalaEnd=src.indexOf('if(shadbalaRows)',analysisShadbalaStart);
const analysisShadbalaUi=src.slice(analysisShadbalaStart,analysisShadbalaEnd);
ok(analysisShadbalaUi.includes('strengthJathakaKanitham'),'Chart Analysis Shadbala reads C.G. Rajan calculated components');
eq(analysisShadbalaUi.includes('strength3'),false,'Chart Analysis Shadbala does not use legacy totals');
const analysisShadbalaSectionStart=src.indexOf('if(shadbalaRows)',analysisShadbalaStart);
const analysisShadbalaSectionEnd=src.indexOf('part1-natural-karakas',analysisShadbalaSectionStart);
const analysisShadbalaSection=src.slice(analysisShadbalaSectionStart,analysisShadbalaSectionEnd);
ok(!analysisShadbalaSection.includes('smv-shadbala-status')&&!analysisShadbalaSection.includes('யுத்தம் (UK)')&&!analysisShadbalaSection.includes('Shadbala · Uttara Kalamrita'),
 'Chart Analysis uses six Bala components without source/status text or a war column');
ok(analysisShadbalaSection.includes('smv-shadbala-table')&&analysisShadbalaSection.includes('<strong>'+fmt(r.partialSubtotalExcludingCheshtaAndDrig)+'</strong>'),
 'Chart Analysis keeps the calculated partial Shadbala subtotal visibly bold');
eq(src.includes('adv-ishta-kashta'),false,'No note-only Ishta/Kashta panel is shown without calculated values');
const births=[['1971-05-04','05:05'],['1974-01-11','16:04'],
 ['1992-07-31','22:05'],['1994-06-15','13:03'],['2015-09-06','09:30'],
 ['2002-10-18','06:06'],['1989-10-18','09:45']];
let count=0;
for(const [date,time] of births){
 const r=await full({date,time,lat:11.23333,lon:78.88333,
  utcOffsetMinutes:330,referenceDate:'2026-10-17',name:'private research'});
 ok(r.ok,'calculated birth '+date);
 const x=cgRajanCompareGrahas({planets:r.chart.planets,lagna:r.chart.lagna});
 eq(x.entries.length,7,'all grahas '+date);
 eq(x.combinedLongevityYears,null,'no calculated age '+date);
 eq(x.predictionCertified,false,'no certification '+date);
 const perNatalHtml=cgRajanAyurdayaReportHtml({planets:r.chart.planets,lagna:r.chart.lagna,language:'en'});
 ok(perNatalHtml.includes('Pinda Ayurdaya')&&perNatalHtml.includes('Naisargika Ayurdaya')&&
  perNatalHtml.includes('Amsa Ayurdaya'),'three-method html ' + date);
 if(date==='2002-10-18'||date==='1989-10-18'){
  const remainderRows=[...perNatalHtml.matchAll(/data-amsa-days="(\d+)" data-amsa-nazhigai="(\d+)"/g)];
  ok(remainderRows.some(m=>Number(m[1])>0||Number(m[2])>0),
   'actual saved Horoscope birth '+date+' renders Amsa days/nazhigai instead of zero for every resolved row');
 }
 eq((perNatalHtml.match(/<tr\b/g)||[]).length,10,'header + seven grahas + total + average '+date);
 const shadbalaRows=r.chart.planets.filter(p=>p?.strength3?.available);
 eq(shadbalaRows.length,7,'seven classical Shadbala rows '+date);
 const rajanRows=r.chart.planets.filter(p=>p?.strengthJathakaKanitham?.available===true);
 eq(rajanRows.length,7,'seven Rajan Shadbala rows available to primary and Analysis tables '+date);
 for(const p of rajanRows){
  const v=p.strengthJathakaKanitham;
  ok(Number.isFinite(v.sthana?.total)&&Number.isFinite(v.dig)&&Number.isFinite(v.kala?.total)&&
    Number.isFinite(v.ayana)&&Number.isFinite(v.naisargika)&&Number.isFinite(v.partialSubtotalExcludingCheshtaAndDrig),
    'Shadbala UI component/subtotal results are numeric '+date+' '+p.name);
 }
 for(const p of shadbalaRows){
  eq(p.strength3.classicalCertified,false,'Shadbala is not falsely certified '+date+' '+p.name);
  eq(p.strength3.provisional,true,'Shadbala stays provisional '+date+' '+p.name);
  const c=p.strength3.components||{};
  const sum=Number(c.sthana?.total||0)+Number(c.dig||0)+Number(c.kala?.total||0)+Number(c.cheshta||0)+Number(c.naisargika||0)+Number(c.drik||0);
  ok(Number.isFinite(sum)&&Number.isFinite(p.strength3.totalVirupa)&&Math.abs(sum-p.strength3.totalVirupa)<0.004,
   'Shadbala total equals six unrounded components '+date+' '+p.name);
 }
 ok(x.entries.some(e=>e.amsa&&e.amsa.rawAmsaFractionOfPada>1e-8&&e.amsa.rawAmsaFractionOfPada<1-1e-8),
  'actual natal longitudes retain fractional Amsa arc '+date);
 count+=x.entries.length;
}
eq(count,49,'seven births including both saved Horoscope PDF charts x seven grahas');
console.log(JSON.stringify({pass:true,assertions:checks,printedPinda:2,natalResearchPlanetPairs:49,
 customerHtml:{tamil:true,english:true},certifiedWholeAyurdaya:false,
 printedLifetimeYearsToCustomers:false,deathTimingComputed:false}));
