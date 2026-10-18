/** C.G. Rajan Part I Pindayurdaya printed-example and browser report QA.
 * Source: user supplied Jathaka Kanitham I printed pp.249–254.
 * NEVER predict an actual lifespan or death age.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {full} from '../public/horoscope/offline/offline-engine.mjs';
import {cgRajanPindaGraha, cgRajanAmsaAyurdayaGraha, cgRajanAmsaHaranaResearch,
 cgRajanMeanThreeTraditionalTotals, cgRajanCompareGrahas, cgRajanAyurdayaReportHtml,
 cgRajanSelectAyurdayaMethod as selectMethod,
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
 .map(([name,longitude],i)=>{
  const totalVirupa=[700,600,500,400,300,200,100][i];
  return {name,longitude,strength6:{
   available:true,components:{sthana:{total:totalVirupa},dig:0,kala:{total:0},cheshta:0,naisargika:0,drik:0},
   totalVirupa,classicalCertified:false
  }};
 });
const lagna={longitude:5};
const research=cgRajanCompareGrahas({planets:ref,lagna});
eq(research.entries.length,7,'seven researched grahas');
eq(research.allEightMethodsComplete,false,'cannot claim 8 methods are complete');
eq(research.combinedLongevityYears,null,'no calculated personal total');
eq(research.deathAgeOrDate,null,'no human death age');
const selection=selectMethod({planets:ref,lagna});
eq(selection.selectedMethod,'pinda','strongest Sun Shadbala selects only Pindayurdaya');
const ta=cgRajanAyurdayaReportHtml({planets:ref,lagna,language:'ta'});
const en=cgRajanAyurdayaReportHtml({planets:ref,lagna,language:'en'});
ok(ta.includes('பிண்ட ஆயுள்')&&!ta.includes('நைசர்க்கிக ஆயுள்')&&!ta.includes('அம்ச ஆயுர்த்தாயம்'),
 'Tamil report shows only the method selected by Shadbala');
ok(en.includes('Pinda Ayurdaya')&&!en.includes('Naisargika Ayurdaya')&&!en.includes('Amsa Ayurdaya'),
 'English report shows only the method selected by Shadbala');
eq(ta.includes('சராசரி ஆயுர்த்தாயம்')||en.includes('Average Ayurdaya'),false,
 'customer output never shows the average of competing Ayurdaya methods');
const totalRowOf=html=>html.match(/<tr class="smv-ayurdaya-totals">[\s\S]*?<\/tr>/)?.[0]||'';
for(const [report,language] of [[ta,'Tamil'],[en,'English']]){
 eq((report.match(/<tr\b/g)||[]).length,9,language+' only header + seven grahas + total row');
 eq(report.includes('data-ayurdaya-selection="pinda"'),true,language+' records selected method');
 eq(report.includes('data-selected-reference-role="sun"'),true,language+' records Sun as the strength winner');
 eq((totalRowOf(report).match(/<strong>/g)||[]).length,1,language+' has one selected-method total cell');
 eq(report.includes('class="smv-ayurdaya-average"'),false,language+' has no average-row markup');
 eq(report.includes('Naisargika Ayurdaya')||report.includes('நைசர்க்கிக ஆயுள்'),false,language+' never shows Moon-method output');
 eq(report.includes('Amsa Ayurdaya')||report.includes('அம்ச ஆயுர்த்தாயம்'),false,language+' never shows Lagna-lord method output');
 ok(report.includes(language==='Tamil'
   ?'இவை பாரம்பரிய ஆயுர்த்தாய முறையின் கணக்கீட்டு மதிப்பீடுகள் மட்டுமே; உண்மையான ஆயுளையோ மரண நேரத்தையோ உறுதியாகக் கூறுபவை அல்ல.'
   :'This is a traditional Ayurdaya calculation only; it does not establish actual lifespan or predict the time of death.'),
   language+' retains the actual-lifespan disclaimer');
 ok(report.includes(language==='Tamil'?'ஷட்பலத்தின் அடிப்படையில் தேர்வு':'Selected by chart Shadbala'),
   language+' explains which Shadbala reference selected the method');
}
eq(research.entries.find(x=>x.name==='சூரியன்').pinda.traditionalUnits,
 {years:10,months:8,days:16,nazhigai:22},
 'raw printed Sun Pinda example remains testable internally');
eq(research.entries.find(x=>x.name==='குரு').pinda.traditionalUnits,
 {years:12,months:2,days:19,nazhigai:15},
 'raw printed Jupiter Pinda example remains testable internally');
eq((ta.match(/data-pinda-harana="raw-unadjusted"/g)||[]).length,7,
 'only the seven selected Pinda terms are displayed when Harana is unresolved');
eq(ta.includes('data-natural-harana='),false,
 'unselected Naisargika graha values are not displayed');
eq(ta.includes('data-amsa-harana='),false,
 'unselected Amsa graha values are not displayed');
eq(ta.includes('data-selected-total="unavailable"')&&en.includes('data-selected-total="unavailable"'),true,
 'the seven-graha total is withheld when chart-specific Harana evidence is incomplete');
ok(ta.includes('Raw: ')===false&&en.includes('Raw: '),
 'English selected Pinda terms clearly disclose that unresolved entries are raw');
eq(ta.includes('data-amsa-total=')||en.includes('data-amsa-total='),false,
 'nonselected method totals are not output');
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
const amsaUiFixture=remainderDisplayFixture.map(p=>{
 const totalVirupa=p.name==='செவ்வாய்'?900:p.name==='சூரியன்'?700:p.name==='சந்திரன்'?600:100;
 return {...p,strength6:{...p.strength6,components:{
  sthana:{total:totalVirupa},dig:0,kala:{total:0},cheshta:0,naisargika:0,drik:0
 },totalVirupa}};
});
const remainderHtml=cgRajanAyurdayaReportHtml({planets:amsaUiFixture,lagna:{longitude:5},language:'en'});
eq(selectMethod({planets:amsaUiFixture,lagna:{longitude:5}}).selectedMethod,'amsa','Amsa output is used only when the Lagna lord has the strongest Shadbala');
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
const withShadbalaWinner=(planets,winnerName)=>planets.map(p=>{
 const totalVirupa=p.name===winnerName?900:
  p.name==='சூரியன்'?700:p.name==='சந்திரன்'?600:p.name==='செவ்வாய்'?500:400;
 return {...p,strength6:{
  available:true,components:{sthana:{total:totalVirupa},dig:0,kala:{total:0},cheshta:0,naisargika:0,drik:0},
  totalVirupa,classicalCertified:false
 }};
});
const reportLagna={longitude:5}; // Aries Lagna: Mars is Lagna lord.
const amsaResolvedFixture=withShadbalaWinner(chartResolvedFixture,'செவ்வாய்');
const resolvedHtml=cgRajanAyurdayaReportHtml({planets:amsaResolvedFixture,lagna:reportLagna,language:'en'});
eq((resolvedHtml.match(/<tr\b/g)||[]).length,9,
 'Amsa-only customer report has header, seven grahas and one total');
eq((resolvedHtml.match(/data-amsa-harana="adjusted-candidate"/g)||[]).length,7,
 'all seven selected Amsa grahas display post-Harana candidates');
eq(resolvedHtml.includes('data-pinda-harana='),false,
 'resolved Amsa output omits Pinda values');
eq(resolvedHtml.includes('data-natural-harana='),false,
 'resolved Amsa output omits Naisargika values');
ok(resolvedHtml.includes('data-total-harana-fraction=')&&resolvedHtml.includes('data-adjusted-amsa-years='),
 'the selected Amsa table retains row-level Harana arithmetic for audit');
ok(resolvedHtml.includes('data-amsa-total="adjusted-candidate"')&&resolvedHtml.includes('data-selected-total="adjusted-candidate"'),
 'adjusted Amsa total is rendered only when complete');
const pindaResolvedHtml=cgRajanAyurdayaReportHtml({
 planets:withShadbalaWinner(chartResolvedFixture,'சூரியன்'),lagna:reportLagna,language:'en'
});
eq((pindaResolvedHtml.match(/data-pinda-harana="adjusted-candidate"/g)||[]).length,7,
 'all seven selected Pinda rows display post-Harana candidates');
eq(pindaResolvedHtml.includes('data-natural-harana='),false,'resolved Pinda output omits Naisargika values');
eq(pindaResolvedHtml.includes('data-amsa-harana='),false,'resolved Pinda output omits Amsa values');
const naturalResolvedHtml=cgRajanAyurdayaReportHtml({
 planets:withShadbalaWinner(chartResolvedFixture,'சந்திரன்'),lagna:reportLagna,language:'en'
});
eq((naturalResolvedHtml.match(/data-natural-harana="adjusted-candidate"/g)||[]).length,7,
 'all seven selected Naisargika rows display post-Harana candidates');
eq(naturalResolvedHtml.includes('data-pinda-harana='),false,'resolved Naisargika output omits Pinda values');
eq(naturalResolvedHtml.includes('data-amsa-harana='),false,'resolved Naisargika output omits Amsa values');
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
ok(!shadbalaUi.includes('strengthJathakaKanitham')&&!shadbalaUi.includes('partialSubtotalExcludingCheshtaAndDrig')&&!shadbalaUi.includes('இடைமொத்தம் (சேஷ்டா/த்ரிக்/யுத்தம் சேராது)')&&!shadbalaUi.includes('யுத்த பலம்')&&!shadbalaUi.includes('Yuddha (UK)'),
 'primary Shadbala template does not show Rajan partial subtotal or separate war column');
ok(src.includes('smvShadbalaDisplayRows(d.planets)')&&src.includes('p?.strength6?.available===true'),
 'primary Shadbala values are calculated from B.V. Raman strength6');
for(const heading of ['ஸ்தான பலம்','திக் பலம்','கால பலம்','சேஷ்டா பலம்','நைசர்கிக பலம்','த்ரிக் பலம்','மொத்த ஷட்பலம் (விரூபம்)','மொத்த ரூபா','தேவையான ரூபா','தரவரிசை','வலிமை நிலை'])ok(src.includes(heading),'primary Shadbala defines '+heading);
for(const heading of ['Planet','Sthana Bala','Dig Bala','Kala Bala','Cheshta Bala','Naisargika Bala','Drig Bala','Total Shadbala (Virupa)','Total Rupa','Required Rupa','Rank','Strength status'])ok(src.includes(heading),'primary Shadbala defines English '+heading);

eq(shadbalaUi.includes('smv-shadbala-method-note'),false,'primary Shadbala hides the internal validation note');
ok(shadbalaUi.includes('smv-shadbala-table'),'primary Shadbala table has a stable UI regression hook');
ok(src.includes('smvShadbalaDisplayRows(d.planets)')&&src.includes('p?.strength6?.available===true'),
 'primary customer Shadbala rows come from the B.V. Raman six-Bala result');
eq(shadbalaUi.includes('சரிபார்க்கப்படாததால்')||shadbalaUi.includes('இறுதிச் சான்றிதழ் அல்ல'),false,
 'primary Shadbala has no indication message');
const analysisShadbalaStart=src.indexOf('const shadbalaDisplayRows=smvShadbalaDisplayRows(caPlanets);');
const analysisShadbalaEnd=src.indexOf('if(shadbalaRows)',analysisShadbalaStart);
const analysisShadbalaUi=src.slice(analysisShadbalaStart,analysisShadbalaEnd);
eq(analysisShadbalaUi.includes('smv-shadbala-method-note'),false,'Chart Analysis hides the internal validation note');
ok(analysisShadbalaUi.includes('smvShadbalaDisplayRows(caPlanets)')&&src.includes('p?.strength6?.available===true'),
 'Chart Analysis Shadbala uses B.V. Raman strength6 components');
eq(analysisShadbalaUi.includes('strengthJathakaKanitham'),false,'Chart Analysis does not substitute Rajan partial components');
const analysisShadbalaSectionStart=src.indexOf('if(shadbalaRows)',analysisShadbalaStart);
const analysisShadbalaSectionEnd=src.indexOf('part1-natural-karakas',analysisShadbalaSectionStart);
const analysisShadbalaSection=src.slice(analysisShadbalaSectionStart,analysisShadbalaSectionEnd);
ok(analysisShadbalaUi.includes('smv-shadbala-status')&&analysisShadbalaSection.includes('shadbalaRows')&&!analysisShadbalaSection.includes('யுத்தம் (UK)')&&!analysisShadbalaSection.includes('Shadbala · Uttara Kalamrita'),
 'Chart Analysis renders the shared strength-status rows without source mixing or a war column');
for(const heading of ["caTitle('Sthana','ஸ்தான பலம்')","caTitle('Dig','திக் பலம்')","caTitle('Kala','கால பலம்')","caTitle('Total Shadbala (Virupa)','மொத்த ஷட்பலம் (விரூபம்)')","caTitle('Total Rupa','மொத்த ரூபா')","caTitle('Required Rupa','தேவையான ரூபா')","caTitle('Rank','தரவரிசை')","caTitle('Strength','வலிமை நிலை')"])ok(analysisShadbalaSection.includes(heading),'Chart Analysis column '+heading);

eq(analysisShadbalaSection.includes('partialSubtotalExcludingCheshtaAndDrig'),false,
 'Chart Analysis does not present an incomplete subtotal as Shadbala');
ok(analysisShadbalaSection.includes('smv-shadbala-table')&&analysisShadbalaSection.includes("caTitle('Shadbala','ஷட்பலம்')"),
 'Chart Analysis heading is only Shadbala / ஷட்பலம் and shows individual Bala components');
const ramanShadbalaSrc=fs.readFileSync(new URL('../public/horoscope/offline/bv-raman-shadbala.browser.mjs',import.meta.url),'utf8');
ok(src.includes('data-smv-ishta-kashta="1"')&&src.includes('p.strength6?.ishtaKashta')&&src.includes('data-engine-source="BV_RAMAN_INTEGRATED_SIX_BALA"')&&
 ramanShadbalaSrc.includes('bvRamanIshtaKashta')&&ramanShadbalaSrc.includes('bvRamanChestaForPhala'),
 'Chart Analysis renders the unified B.V. Raman Ishta/Kashta output calculated by the Shadbala engine');
ok(!src.includes('B.V. Raman சதுரவேர் முறை. ஐந்து கிரகங்களின் சிறப்பு சேஷ்டா-பல உள்ளீடுகள்'), 'No Ishta/Kashta research note is displayed to Horoscope users');
const horoscopeCss=fs.readFileSync(new URL('../public/horoscope/horoscope.css',import.meta.url),'utf8');
ok(horoscopeCss.includes('.smv-ayurdaya-scroll')&&horoscopeCss.includes('overflow-x:auto!important')&&horoscopeCss.includes('width:358px;min-width:358px;max-width:none;table-layout:fixed')&&horoscopeCss.includes('white-space:normal;word-break:normal;overflow-wrap:anywhere'), 'Horoscope Ayurdaya table uses horizontal scroll with readable fixed-width wrapped columns');
ok(horoscopeCss.includes('tbody tr:not(.smv-ayurdaya-totals):not(.smv-ayurdaya-average)>th, #englishHoroscopeResult .smv-cg-rajan-ayurdaya .smv-ayurdaya-table tbody tr:not(.smv-ayurdaya-totals):not(.smv-ayurdaya-average)>th{background:#fff!important'), 'Horoscope Ayurdaya planet-name cells are truly white under the shared theme');
const matchingCss=fs.readFileSync(new URL('../public/horoscope/marriage-basic-report.css',import.meta.url),'utf8');
ok(matchingCss.includes('.mm-basic-report .smv-cg-rajan-ayurdaya table.smv-ayurdaya-table thead th{')&&matchingCss.includes('color:#4a352d;background:#fff7e8;font-weight:800;')&&matchingCss.includes('color:#302722;background:#fff;font-weight:800;')&&matchingCss.includes('.smv-ayurdaya-method-selection{')&&!matchingCss.includes('background:#fff7e8!important'), 'Matching Ayurdaya colors live in semantic component rules without a wrapper-specific override stack');
const appHtml=fs.readFileSync(new URL('../public/horoscope/index.html',import.meta.url),'utf8');
ok(appHtml.includes('horoscope.css?v=20261019-ayurdaya-single-method-v250')&&appHtml.includes('marriage-basic-report.css?v=20261019-ayurdaya-single-method-v250'), 'Live pages request the revised Marriage Matching stylesheet');
const swSource=fs.readFileSync(new URL('../public/horoscope/sw.js',import.meta.url),'utf8');
ok(swSource.includes('v249-arudha-a2-a11-cream-average-20261018'),'PWA refresh revision activates the revised Matching stylesheet');
ok(src.includes("p1Title('Arudha Padas','ஆரூட பாதங்கள்')")&&!src.includes('ஆரூட பாதங்கள் (A1–A12)'),'Arudha heading omits the A1-A12 range');
ok(src.includes("p1ArudhaLabel(x,i)")&&src.includes("const p1ArudhaLabel=(x,i=0)=>{const h=Number(x?.house);"), 'Arudha renderer normalizes house values before showing AL, A2-A11 and UL');
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
 const perNatalSelection=selectMethod({planets:r.chart.planets,lagna:r.chart.lagna});
 if(perNatalSelection.available){
  const selectedLabel={
   pinda:'Pinda Ayurdaya',
   natural:'Naisargika Ayurdaya',
   amsa:'Amsa Ayurdaya'
  }[perNatalSelection.selectedMethod];
  ok(perNatalHtml.includes(selectedLabel),'natal customer HTML includes its single Shadbala-selected method '+date);
  const hiddenLabels=['Pinda Ayurdaya','Naisargika Ayurdaya','Amsa Ayurdaya'].filter(v=>v!==selectedLabel);
  for(const label of hiddenLabels)ok(!perNatalHtml.includes(label),'natal customer HTML omits unselected method '+label+' '+date);
  eq((perNatalHtml.match(/<tr\b/g)||[]).length,9,'one selected method renders header + seven grahas + total '+date);
  eq(perNatalHtml.includes('Average Ayurdaya'),false,'natal customer HTML never displays method average '+date);
 }else{
  eq((perNatalHtml.match(/<tr\b/g)||[]).length,0,'natal report with missing/tied Shadbala has no unselected method table '+date);
  ok(perNatalHtml.includes('data-ayurdaya-selection="unavailable"'),'natal report exposes a safe no-selection state '+date);
 }
 if((date==='2002-10-18'||date==='1989-10-18')&&perNatalSelection.selectedMethod==='amsa'){
  const remainderRows=[...perNatalHtml.matchAll(/data-amsa-days="(\\d+)" data-amsa-nazhigai="(\\d+)"/g)];
  ok(remainderRows.some(m=>Number(m[1])>0||Number(m[2])>0),
   'when Amsa is actually selected, its output preserves computed days/nazhigai '+date);
 }
 const shadbalaRows=r.chart.planets.filter(p=>p?.strength6?.available);
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
  eq(p.strength6.classicalCertified,false,'Shadbala is not falsely certified '+date+' '+p.name);
  eq(p.strength6.provisional,true,'Shadbala stays provisional '+date+' '+p.name);
  eq(p.strength6.ishtaKashta?.available,true,'integrated B.V. Raman Ishta/Kashta is present '+date+' '+p.name);
  eq(p.strength6.ishtaKashta.classicalCertified,false,'Ishta/Kashta inputs remain uncertified '+date+' '+p.name);
  const c=p.strength6.components||{};
  ok(Math.abs(p.strength6.ishtaKashta.sixfoldShadbalaCheshtaBala-c.cheshta)<0.001,'special Chesta-for-Phala does not replace sixfold Cheshta Bala '+date+' '+p.name);
  ok(Number.isFinite(c.sthana?.total)&&Number.isFinite(c.dig)&&Number.isFinite(c.kala?.total)&&
   Number.isFinite(c.cheshta)&&Number.isFinite(c.naisargika)&&Number.isFinite(c.drik),
   'B.V. Raman six individual components remain available '+date+' '+p.name);
  if(Number.isFinite(p.strength6.totalVirupa)){
   const sum=Number(c.sthana.total)+Number(c.dig)+Number(c.kala.total)+Number(c.cheshta)+Number(c.naisargika)+Number(c.drik);
   ok(Math.abs(sum-p.strength6.totalVirupa)<0.01,
    'Shadbala total equals six components '+date+' '+p.name);
  }else{
   eq(p.strength6.totalVirupa,null,'unresolved total is withheld '+date+' '+p.name);
   eq(p.strength6.totalRupa,null,'Rupa is also withheld when total is unresolved '+date+' '+p.name);
  }
 }
 ok(x.entries.some(e=>e.amsa&&e.amsa.rawAmsaFractionOfPada>1e-8&&e.amsa.rawAmsaFractionOfPada<1-1e-8),
  'actual natal longitudes retain fractional Amsa arc '+date);
 count+=x.entries.length;
}
eq(count,49,'seven births including both saved Horoscope PDF charts x seven grahas');
console.log(JSON.stringify({pass:true,assertions:checks,printedPinda:2,natalResearchPlanetPairs:49,
 customerHtml:{tamil:true,english:true},certifiedWholeAyurdaya:false,
 printedLifetimeYearsToCustomers:false,deathTimingComputed:false}));
