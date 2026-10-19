// SMV ASTRO — deterministic horoscope/matching calculation regression.
// Run from repository root: node tests/calculation-regression.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {calculateSwiss} from '../public/horoscope/offline/swiss_vedic.browser.mjs';
import {full} from '../public/horoscope/offline/offline-engine.mjs';
import {phase4Dasa} from '../public/horoscope/offline/dasa_engine.browser.mjs';
import {resolveSodhyaPindaTarget,calculateSodhyaPindaTransitWindows} from '../public/horoscope/offline/pvr-longevity-sodhya-timing.browser.mjs';
let checks=0;
const ok=(condition,message)=>{assert.ok(condition,message);checks++};
for(const sample of [
 {date:'2025-02-29',time:'10:00',lat:11,lon:78},
 {date:'2026-04-31',time:'10:00',lat:11,lon:78},
 {date:'1992-07-31',time:'10:00',lat:'',lon:78},
 {date:'1992-07-31',time:'10:00',lat:11,lon:null}
]){
 let rejected=false;
 try{await calculateSwiss({...sample,utcOffsetMinutes:330})}catch{rejected=true}
 ok(rejected,'Invalid date or coordinates accepted');
}
let code=fs.readFileSync(new URL('../public/horoscope/marriage-matching.js',import.meta.url),'utf8');
const transformed=code.replace(/\}\)\(\);\s*$/,'globalThis.TEST={porutham,kuja,getD9Sign,kujaSamyam,dashaSandhi,dashaDoshaSync,chartFacts,fullVerdict,marriageStrengthMatrix};})();');
ok(code!==transformed,'Missing matching audit entry point');
const horoscopeSource=fs.readFileSync(new URL('../public/horoscope/horoscope.js',import.meta.url),'utf8');
const sharedArrDecls=horoscopeSource.match(/\bconst arr\s*=\s*v=>Array\.isArray\(v\)\?v:\(v&&typeof v==='object'\?Object\.values\(v\):\[\]\);/g)||[];
const sharedArrPos=horoscopeSource.indexOf(sharedArrDecls[0]||'__missing_shared_arr_helper__');
const advancedRendererPos=horoscopeSource.indexOf('function renderAdvancedAstrology(data, lang, rootId)');
const phase4RendererPos=horoscopeSource.indexOf('function renderPhase4Dasa(data,lang,slot)');
ok(sharedArrDecls.length===1&&sharedArrPos>=0&&sharedArrPos<advancedRendererPos&&sharedArrPos<phase4RendererPos,'Full-advanced regression: arr is shared by both Advanced Analysis and Phase-4 Dasa renderers');
const offlineSource=fs.readFileSync(new URL('../public/horoscope/offline/offline-engine.mjs',import.meta.url),'utf8');
ok(!offlineSource.includes("import {advanced} from './astro_advanced.browser.mjs'")&&offlineSource.includes("import('./astro_advanced.browser.mjs')"),'Basic-only startup defers Advanced module loading');
ok(!offlineSource.includes("import {phase4Dasa} from './dasa_engine.browser.mjs'")&&offlineSource.includes("import('./dasa_engine.browser.mjs')"),'Basic-only startup defers Dasa module loading');
ok(offlineSource.includes("if(body?.matchingOnly===true)")&&offlineSource.includes("matchingOnly:true,version:'SMV-matching-1'"),'Matching-only engine response bypasses unused Panchang/Transit work');
ok(code.includes('async function getChart(prefix,basicOnly=false,matchingOnly=false)')&&code.includes('matchingOnly:matchingOnly===true'),'Matching profile reaches the offline calculation engine');
ok(code.includes("getChart('mmBride',false,true)")&&code.includes("getChart('mmGroom',false,true)"),'Full matching uses the dedicated matching calculation profile');
const context={document:{readyState:'loading',documentElement:{lang:'ta'},body:{classList:{contains:()=>false}},addEventListener(){}},window:{addEventListener(){}}};
vm.runInNewContext(transformed,context,{timeout:20000});
const m=context.TEST;
ok(m.getD9Sign({})===''&&m.getD9Sign({signIndex:null})===''&&m.getD9Sign({rasi:'மீனம்'})==='மீனம்','Invalid D9 sign fallback');
const sampleChart=i=>({lagna:{longitude:344},planets:[{name:'சந்திரன்',longitude:(i+.5)*360/27},{name:'செவ்வாய்',longitude:100},{name:'சுக்கிரன்',longitude:135}]});
for(let a=0;a<27;a++)for(let b=0;b<27;b++){
 const p=m.porutham(sampleChart(a),sampleChart(b));
 ok(p.rows.length===10&&p.score>=0&&p.score<=10&&p.score===p.rows.filter(x=>x[1]).length,'Invalid Nakshatra pair '+a+'/'+b);
}
let rejectMoon=false;try{m.porutham({planets:[{name:'சந்திரன்',longitude:null}]},sampleChart(3))}catch{rejectMoon=true}
ok(rejectMoon,'Missing Moon position accepted');
ok(m.kuja({lagna:{longitude:null},planets:[{name:'செவ்வாய்',longitude:100},{name:'சந்திரன்',longitude:null},{name:'சுக்கிரன்',longitude:0}]}).all.length===1,'Null Kuja reference became Aries');
const birthCases=[['1994-06-15','13:03'],['2015-09-06','09:30'],['1992-07-31','22:05'],['1971-05-04','05:05'],['1974-01-11','16:04'],['2002-10-20','03:41']];
const dasaSource=fs.readFileSync(new URL('../public/horoscope/offline/dasa_engine.browser.mjs',import.meta.url),'utf8');
const dasaFixture=(moonLon,lagnaLon=180,rahuLon=300,marsLon=30)=>({birthDate:'2000-01-01',birth:{date:'2000-01-01',time:'12:00',latitude:11.232,longitude:78.88},lagna:{longitude:lagnaLon},planets:[
 {name:'Sun',longitude:0},{name:'Moon',longitude:moonLon},{name:'Mars',longitude:marsLon},
 {name:'Mercury',longitude:90},{name:'Jupiter',longitude:240},{name:'Venus',longitude:120},
 {name:'Saturn',longitude:210},{name:'Rahu',longitude:rahuLon},{name:'Ketu',longitude:(rahuLon+180)%360}
]});
const ashtBoundaries=[
 [26+40/60,'Venus'],[66+40/60,'Sun'],[120,'Moon'],[160,'Mars'],
 [213+20/60,'Mercury'],[253+20/60,'Saturn'],[293+20/60,'Jupiter'],[333+20/60,'Rahu']
];
for(const [longitude,expectedLord] of ashtBoundaries){
 const d=phase4Dasa(dasaFixture(longitude)).ashtottari;
 ok(d.available&&d.firstLord===expectedLord,'PVR Table 39 Ashtottari arc boundary '+longitude+'° selects '+expectedLord);
}
const example59=phase4Dasa(dasaFixture(144)).ashtottari;
ok(example59.firstLord==='Moon'&&Math.abs(example59.birthBalanceFraction-0.4)<1e-10,'PVR §17.3 Example 59: Moon at 24° Leo selects Moon Dasa with 0.4 remaining fraction');
ok(Math.abs(example59.sequence[0].years-6)<1e-9&&Math.abs(example59.sequence[0].elapsedBeforeBirthYears-9)<1e-9,'PVR Example 59: 6 years remain of 15-year Moon Dasa after 9 elapsed years');
const rahuAd=example59.sequence[0].antardasas[0];
ok(rahuAd?.lord==='Rahu'&&Math.abs(rahuAd.years-(15*12/108-(9-7.5)))<1e-9,'PVR Example 59: elapsed 9 years falls inside Rahu Antardasa; only its remainder is carried forward');
ok(Math.abs(example59.sequence[0].antardasas.reduce((s,x)=>s+x.years,0)-example59.sequence[0].years)<1e-8,'Ashtottari partial birth Dasa Antardasas sum to the remaining Mahadasa period');
ok(example59.applicabilityAudit.status==='UNRESOLVED_NO_INTERPRETATION_SELECTED'&&example59.applicabilityAudit.views.length===3,'PVR §17.2.3: preserve all three applicability interpretations without falsely certifying one');
const applicabilityNoRahu=dasaFixture(144,180,180,30); // Libra Lagna; Rahu in Libra: view (2) must fail.
const auditNoRahu=phase4Dasa(applicabilityNoRahu).ashtottari.applicabilityAudit;
ok(auditNoRahu.views[1].status==='not_met'&&auditNoRahu.views[1].rahuInLagna===true,'Ashtottari applicability counterexample: Rahu in Lagna fails interpretation (2)');
const applicabilityRahuQualifies=dasaFixture(144,180,300,30); // Libra Lagna, Venus is Lagna lord at Leo, Rahu Aquarius is 7th from Venus.
const auditQualifies=phase4Dasa(applicabilityRahuQualifies).ashtottari.applicabilityAudit;
ok(auditQualifies.views[1].status==='met'&&auditQualifies.views[1].rahuHouseFromLagnaLord===7,'Ashtottari applicability positive example: Rahu in a quadrant from the Lagna lord, outside Lagna');
const d95=phase4Dasa(dasaFixture(45+50/60)).kalachakra;
ok(d95.available&&d95.nakshatraIndex===4&&d95.pada===2&&d95.group==='apasavya1','PVR §24.2 Example 95: Moon 15°50 Taurus maps to Rohini Pada 2 / Apasavya-1');
ok(Math.abs(d95.paramayush-83)<1e-9&&Math.abs(d95.elapsedYearsBeforeBirth-62.25)<1e-9&&Math.abs(d95.birthDasaRemainingYears-4.75)<1e-9,'PVR Example 95: independent paramayush 83, elapsed 62.25 and remaining 4.75 years');
ok(d95.sequence.slice(0,9).map(x=>x.rasi).join(',')==='Sc,Li,Vi,Le,Cn,Ge,Ta,Ar,Sg','PVR Examples 95/97: Kalachakra Mahadasa continuation matches Sc, Li, Vi, Le, Cn, Ge, Ta, Ar, Sg');
ok(d95.sequence[0].antardasas.map(x=>x.rasi).join(',')==='Sc,Li,Vi,Le,Cn,Ge,Ta,Ar,Sg','PVR §24.2 Example 97: Scorpio Antardasa order crosses from Rohini Pada 2 into Pada 3');
ok(Math.abs(d95.sequence[0].antardasas.reduce((s,x)=>s+x.years,0)-d95.sequence[0].years)<1e-8,'Kalachakra Example 95: nine weighted Antardasas sum exactly to the Mahadasa duration');
ok(Math.abs(d95.sequence[0].antardasas[0].years-(4.75*7/100))<1e-9,'Kalachakra Example 95: Scorpio Antardasa weight uses actual nine-sign sum 100 (not birth pada paramayush 83)');
ok(d95.dehaRasi==='Sg'&&d95.jeevaRasi==='Sc','PVR §24.3.2 Example 95: Apasavya Deha is the ninth running Dasa (Sagittarius) and Jeeva is the first (Scorpio)');
ok(d95.sequence[3].antardasas.map(x=>x.rasi).join(',')==='Le,Cn,Ge,Ta,Ar,Sg,Cp,Aq,Pi','PVR Example 97: Leo Antardasa order is Le,Cn,Ge,Ta,Ar,Sg,Cp,Aq,Pi');
ok(Math.abs(d95.sequence[3].antardasas.reduce((s,x)=>s+x.years,0)-5)<1e-8,'PVR Example 97: nine weighted signs total 86 years and distribute the 5-year Leo Mahadasa');
const savanaDays=(row)=>((Date.parse(row.end+'T00:00:00Z')-Date.parse(row.start+'T00:00:00Z'))/86400000);
ok(Math.abs(savanaDays(example59.sequence[0])-example59.sequence[0].years*360)<1.01,'PVR §16.2 Ashtottari dates use the stated 360-day savana-year convention');
ok(Math.abs(savanaDays(d95.sequence[0])-d95.sequence[0].years*360)<1.01,'PVR Examples 95–97 Kalachakra dates use the stated 360-day savana-year convention');

const d96=phase4Dasa(dasaFixture(93)).kalachakra; // 3° Cancer.
ok(d96.nakshatraIndex===7&&d96.pada===4&&d96.group==='savya1','PVR §24.2 Example 96: Moon 3° Cancer maps to Punarvasu Pada 4 / Savya-1');
ok(Math.abs(d96.paramayush-86)<1e-9&&Math.abs(d96.elapsedYearsBeforeBirth-77.4)<1e-9&&Math.abs(d96.birthDasaRemainingYears-8.6)<1e-9,'PVR Example 96: independent paramayush 86, elapsed 77.4 and remaining 8.6 years');
ok(d96.sequence.slice(0,9).map(x=>x.rasi).join(',')==='Pi,Sc,Li,Vi,Cn,Le,Ge,Ta,Ar','PVR Example 96: remaining Pisces Dasa followed by the first eight Savya-2 signs');
ok(d96.sequence[0].antardasas.map(x=>x.rasi).join(',')==='Pi,Sc,Li,Vi,Cn,Le,Ge,Ta,Ar','Kalachakra Example 96: antardasa chain crosses after Pada 4 into Savya-2 Pada 1');
ok(d96.sequence.every(md=>md.antardasas.length===9&&Math.abs(md.antardasas.reduce((s,x)=>s+x.years,0)-md.years)<1e-8),'Kalachakra counterexample grid: all displayed MDs have nine correctly weighted ADs summing to each MD');
const drigExpected='2,5,8,11,3,1,10,7,4,0,9,6';
const drigExample80=phase4Dasa(dasaFixture(45,180)).drigdasa;
ok(drigExample80.groups.join(',')==='2,3,4','PVR §21.2 Example 80: Libra Lagna seeds 9th/10th/11th houses in Gemini/Cancer/Leo');
ok(drigExample80.groupSequences.map(g=>g.join(',')).join('|')==='2,5,8,11|3,1,10,7|4,0,9,6','PVR Example 80: complete 4-rasi aspect-group order matches Ge-Vi-Sg-Pi / Cn-Ta-Aq-Sc / Le-Ar-Cp-Li');
ok(drigExample80.sequence.filter(x=>x.cycle===1).map(x=>x.rasi).join(',')===drigExpected,'PVR Example 80: full Drigdasa sequence matches source oracle');
for(let lagnaSign=0;lagnaSign<12;lagnaSign++){
 const d=phase4Dasa(dasaFixture(45,lagnaSign*30)).drigdasa;
 const first=d.sequence.filter(x=>x.cycle===1);
 ok(d.groups.length===3&&d.groupSequences.length===3&&d.groupSequences.every(g=>g.length===4),'Drigdasa counterexample sign '+lagnaSign+': each source aspect group has exactly four signs');
 ok(first.length===12&&new Set(first.map(x=>x.rasi)).size===12,'Drigdasa counterexample sign '+lagnaSign+': groups partition 12 signs with no arbitrary fallback');
}
const renderStart=horoscopeSource.indexOf('function renderPhase4Dasa(data,lang,slot){');
const renderEnd=horoscopeSource.indexOf('\n  window.__smvLoadPhase4Dasa=loadPhase4Dasa;',renderStart);
ok(renderStart>=0&&renderEnd>renderStart,'Found Phase-4 renderer source for runtime regression');
const rendererChunk=horoscopeSource.slice(renderStart,renderEnd);
const renderContext={window:{},mockResult:null};
const sharedArrSource=(horoscopeSource.match(/  \/\/ Shared shape-normalizer[\\s\\S]*?  const arr=v=>Array\\.isArray\\(v\\)\\?v:\\(v&&typeof v==='object'\\?Object\\.values\\(v\\):\\[\\]\\);/ )||[])[0];
ok(typeof sharedArrSource==='string'&&sharedArrSource.includes('const arr=v=>Array.isArray(v)?v:' ,'Runtime regression extracts the production shared arr helper');
vm.runInNewContext(sharedArrSource+"\\n"+rendererChunk+"\\nglobalThis.runRenderer=renderPhase4Dasa;",renderContext,{timeout:20000});
const mockAdvanced={querySelectorAll:()=>[]};
const mockReport={querySelector:(selector)=>selector==='.smv-advanced-part.chart-analysis > .smv-advanced-part-content'?mockAdvanced:null};
const mockSlot={isConnected:true,parentElement:mockReport,closest:()=>mockReport,querySelector:()=>null,querySelectorAll:()=>[],innerHTML:''};
renderContext.runRenderer({ashtottari:{available:true,sequence:[{lord:'Moon',years:6,start:'2000-01-01',end:'2006-01-01',antardasas:[{lord:'Rahu',years:1,start:'2000-01-01',end:'2001-01-01'}]}]},pvrResearch:{longevity:{dasaTiming:{ageBandYears:{start:0,end:36},niryaanaShoola:{periods:[{rasi:7,ageStartYears:1,ageEndYears:2,years:1,start:'2001-01-01',end:'2002-01-01'}]},shoola:{periods:[]}}},sodhyaPindaEventTiming:{rows:[]}},'ta',mockSlot);
ok(mockSlot.innerHTML.includes('ஆண்டுகள்')&&mockSlot.innerHTML.includes('விருச்சிகம்'),'Phase-4 Tamil renderer executes all report paths, including arr(block.periods), without ReferenceError');

const charts=[];
let pvrTransitFixtureRows=null;
for(const [date,time] of birthCases){
 const result=await full({date,time,lat:11.232,lon:78.88,utcOffsetMinutes:330,referenceDate:'2026-10-16',name:'Audit'});
 const c=result.chart;
 ok(result.ok&&result.advanced&&result.phase4&&result.transit&&result.birthPanchang,date+' full calculation');
 ok(result.phase4.narayana.sequence.length===24,date+' Narayana two-cycle rows');
 for(const key of ['lagnaKendradi','sudasa','drigdasa']){
  const periods=result.phase4[key]?.sequence||[];
  const firstCycle=periods.filter(x=>x.cycle===1),secondCycle=periods.filter(x=>x.cycle===2);
  const bad=firstCycle.map((x,i)=>({rasi:x.rasi,first:x.fullYears,second:secondCycle[i]?.fullYears,expected:Math.max(0,12-x.fullYears)})).filter(x=>Math.abs(Number(x.second)-x.expected)>1e-9);
  ok(firstCycle.length===12&&secondCycle.length===12&&bad.length===0,date+' '+key+' second-cycle lengths use 12 minus first-cycle: '+JSON.stringify(bad));
 }
 ok(result.phase4.narayana.sequence.every(md=>md.antardasas?.length===12&&md.antardasas.every(x=>Number.isInteger(x.rasi)&&x.rasi>=0&&x.rasi<12)),date+' Narayana Antardasa rows use valid rasi indices');
 const n1=result.phase4.narayana.sequence.filter(x=>x.cycle===1),n2=result.phase4.narayana.sequence.filter(x=>x.cycle===2);
 const cycleMismatches=n1.map((x,i)=>({rasi:x.rasi,first:x.fullYears,second:n2[i]?.fullYears,expected:Math.max(0,12-x.fullYears)})).filter(x=>Math.abs(Number(x.second)-x.expected)>1e-9); ok(n1.length===12&&n2.length===12&&cycleMismatches.length===0,date+' Narayana second-cycle source-rule handling mismatches: '+JSON.stringify(cycleMismatches));
 ok(n1.every(x=>x.fullYears<=12)&&n2.every(x=>x.fullYears>=0&&x.fullYears<=12),date+' Narayana Dasa durations respect the 12-year maximum and no-negative second-cycle rule');
 ok(result.phase4.shoola.sequence.length===12&&result.phase4.shoola.sequence.every(md=>md.antardasas?.length===12&&md.antardasas[0].rasi===md.rasi||md.antardasas?.length===12&&md.antardasas[0].rasi===(md.rasi+6)%12),date+' Shoola Antardasa starts from stronger of Dasa sign/7th');
 ok(result.phase4.shoola.sequence.every(md=>md.antardasas.every((x,i,arr)=>i===0||x.rasi===(arr[i-1].rasi+1)%12)),date+' Shoola Antardasa progresses zodiacally');
 ok(result.phase4.pvrResearch?.longevity?.researchOnly===true&&result.phase4.pvrResearch?.sodhyaPindaEventTiming?.researchOnly===true,date+' PVR add-on remains research-only');
 ok(result.phase4.pvrResearch.sodhyaPindaEventTiming.rows.length===7&&result.phase4.pvrResearch.sodhyaPindaEventTiming.rows.every(x=>x.product===x.rawBavRekhas*x.sodhyaPinda),date+' PVR Sodhya Pinda event products follow raw BAV rekha × Yoga Pinda');
 if(!pvrTransitFixtureRows)pvrTransitFixtureRows=result.phase4.pvrResearch.sodhyaPindaEventTiming.rows;
 const longevity=result.phase4.pvrResearch.longevity;
 ok(['short','middle','long'].includes(longevity.combinedCategory),date+' PVR method-of-three-pairs selects a longevity category with complete chart inputs');
 ok(longevity.dasaTiming?.category===longevity.combinedCategory&&longevity.dasaTiming.certified===false,date+' PVR longevity category exposes research-only Dasa timing bands');
 const focus=longevity.dasaTiming;
 const expectedBand={short:[0,36],middle:[36,72],long:[72,108]}[longevity.combinedCategory];
 ok(focus.ageBandYears.start===expectedBand[0]&&focus.ageBandYears.end===expectedBand[1],date+' PVR Dasa timing age band agrees with short/middle/long category');
 ok(focus.shoola.periods.length===4&&focus.shoola.periods.every(x=>x.ageStartYears>=expectedBand[0]&&x.ageEndYears<=expectedBand[1]),date+' PVR Shoola Dasa selects the four 9-year periods in the matching longevity range');
 ok(focus.niryaanaShoola.periods.length>0&&focus.niryaanaShoola.periods.every(x=>x.ageStartYears<expectedBand[1]&&x.ageEndYears>expectedBand[0]),date+' PVR Niryaana Shoola selects periods overlapping the relevant age range');
 ok(c.ephemerisMode==='SWIEPH'&&c.planets.length===9&&c.planets.every(p=>p.longitude>=0&&p.longitude<360&&p.bhava>=1&&p.bhava<=12),date+' valid grahas');
 const ra=c.planets.find(p=>p.name==='ராகு').longitude,ke=c.planets.find(p=>p.name==='கேது').longitude;
 ok(Math.abs(((ke-ra+360)%360)-180)<1e-6,date+' Rahu/Ketu');
 ok(c.dashas.periods.length===9&&c.dashas.balanceYears>=0&&c.dashas.balanceYears<=20,date+' Vimshottari');
 for(const d of [7,9,10])ok(result.advanced.vargas.some(x=>x.division==='D-'+d&&x.planets.length===9),date+' D'+d);
 charts.push(c);
}
ok(charts[2].lagna.rasi==='மீனம்'&&charts[2].moonRasi==='சிம்மம்'&&charts[2].moonNakshatra==='மகம்','1992 golden case');
let rejectDate=false;try{phase4Dasa({birthDate:'',planets:[],lagna:{}})}catch{rejectDate=true}ok(rejectDate,'Invalid Phase-4 default date');
const zeroSodhyaTarget=resolveSodhyaPindaTarget(0);
ok(zeroSodhyaTarget.nakshatraNumber===27&&zeroSodhyaTarget.nakshatra==='Revati'&&zeroSodhyaTarget.rasiNumber===12&&zeroSodhyaTarget.rasi==='Pisces','PVR Sodhya Pinda modulo-zero means 27th nakshatra / 12th rasi');
const historicalSodhyaTransit=await calculateSodhyaPindaTransitWindows([{
 planet:'Saturn',planetTamil:'சனி',topic:'Longevity',topicTamil:'ஆயுள்',
 targetNakshatraNumber:27,targetNakshatra:'Revati',targetNakshatraTamil:'ரேவதி',
 targetRasiNumber:12,targetRasi:'Pisces',targetRasiTamil:'மீனம்',
 relatedVimshottariNakshatras:[{number:9,name:'Ashlesha'},{number:18,name:'Jyeshtha'}]
}],{startDate:'1997-01-01',endDate:'1998-01-01',utcOffsetMinutes:330});
const historicalSaturn=historicalSodhyaTransit.rows[0].transits.Saturn;
const dianaReferenceMs=Date.parse('1997-08-31T06:30:00Z');
const sourceExampleNakshatra=historicalSaturn.nakshatras.find(x=>x.key==='primary')?.windows||[];
const sourceExampleRasi=historicalSaturn.rasi.windows||[];
ok(sourceExampleNakshatra.some(w=>Date.parse(w.startUtc)<=dianaReferenceMs&&Date.parse(w.endUtc)>dianaReferenceMs),'PVR §25.6 Example 111: Saturn Revati transit covers 1997-08-31');
ok(sourceExampleRasi.some(w=>Date.parse(w.startUtc)<=dianaReferenceMs&&Date.parse(w.endUtc)>dianaReferenceMs),'PVR §25.6 Example 111: Saturn Pisces transit covers 1997-08-31');
ok(sourceExampleNakshatra.every(w=>Date.parse(w.startUtc)<Date.parse(w.endUtc))&&sourceExampleRasi.every(w=>Date.parse(w.startUtc)<Date.parse(w.endUtc)),'PVR transit windows have positive duration and valid ingress/egress boundaries');
ok(historicalSodhyaTransit.ephemeris.includes('Swiss Ephemeris')&&historicalSodhyaTransit.horizon.timezoneLabel==='IST (UTC+05:30)'&&historicalSodhyaTransit.researchOnly===true,'PVR transit calendar exposes local Swiss ephemeris, IST horizon and research-only status');
const next15YearTransit=await calculateSodhyaPindaTransitWindows(pvrTransitFixtureRows,{startDate:'2026-10-20',endDate:'2041-10-20',utcOffsetMinutes:330});
ok(next15YearTransit.horizon.startDate==='2026-10-20'&&next15YearTransit.horizon.endDate==='2041-10-20'&&next15YearTransit.horizon.endExclusive===true,'PVR transit calendar covers the 15-year IST horizon with exclusive end date');
ok(next15YearTransit.rows.length===7&&next15YearTransit.rows.every(x=>x.transits?.Saturn&&x.transits?.Jupiter),'PVR 15-year transit calendar contains Saturn/Jupiter for all seven Sodhya topics');
const next15StarWindows=next15YearTransit.rows.flatMap(x=>x.transits.Jupiter.nakshatras.find(n=>n.key==='primary')?.windows||[]);
ok(next15StarWindows.length>=7,'Jupiter completes the source-target nakshatra crossings over the 15-year horizon');
const transitStartMs=Date.parse('2026-10-20T00:00:00Z')-330*60000,transitEndMs=Date.parse('2041-10-20T00:00:00Z')-330*60000;
const all15YearWindows=next15YearTransit.rows.flatMap(x=>['Saturn','Jupiter'].flatMap(body=>[...(x.transits[body].nakshatras||[]).flatMap(n=>n.windows||[]),...(x.transits[body].rasi?.windows||[])]));
ok(all15YearWindows.every(w=>Date.parse(w.startUtc)>=transitStartMs&&Date.parse(w.endUtc)<=transitEndMs&&Date.parse(w.startUtc)<Date.parse(w.endUtc)),'Every 15-year transit window is in-range and has valid ingress/egress');
console.log(JSON.stringify({pvr15YearTransitSample:next15YearTransit.rows.map(x=>({topic:x.topic,planet:x.planet,nakshatra:x.targetNakshatra,rasi:x.targetRasi,saturnNakshatra:x.transits.Saturn.nakshatras.find(n=>n.key==='primary')?.windows.map(w=>[w.startLocal,w.endLocal]),saturnRasi:x.transits.Saturn.rasi.windows.map(w=>[w.startLocal,w.endLocal]),jupiterNakshatra:x.transits.Jupiter.nakshatras.find(n=>n.key==='primary')?.windows.map(w=>[w.startLocal,w.endLocal]),jupiterRasi:x.transits.Jupiter.rasi.windows.map(w=>[w.startLocal,w.endLocal])}))}));
console.log(JSON.stringify({pvrHistoricalTransitExample:{source:'PVR §25.6 Example 111',SaturnRevati:sourceExampleNakshatra,SaturnPisces:sourceExampleRasi}}));
const saturnSeedChart={birthDate:'2000-01-01',lagna:{longitude:0},planets:[
 {name:'Sun',longitude:30},{name:'Moon',longitude:120},{name:'Mars',longitude:210},
 {name:'Mercury',longitude:240},{name:'Jupiter',longitude:270},{name:'Venus',longitude:60},
 {name:'Saturn',longitude:210},{name:'Rahu',longitude:150},{name:'Ketu',longitude:300}
]};
const saturnSeedDasa=phase4Dasa(saturnSeedChart);
ok(saturnSeedDasa.niryaanaShoola.seed===7,'PVR Niryaana Shoola fixture selects Scorpio as stronger of 2nd/8th');
ok(saturnSeedDasa.niryaanaShoola.sequence.map(x=>x.rasi).join(',')==='7,8,9,10,11,0,1,2,3,4,5,6','PVR Niryaana Shoola Saturn-in-seed exception advances zodiacally');
ok(saturnSeedDasa.niryaanaShoola.sequence.slice(0,3).map(x=>x.fullYears).join(',')==='8,9,7','PVR Niryaana Shoola sign-duration classes fixed/dual/movable = 8/9/7 years');
const footedSignChart={birthDate:'2000-01-01',lagna:{longitude:0},planets:[
 {name:'Sun',longitude:0},{name:'Moon',longitude:60},{name:'Mars',longitude:0},
 {name:'Mercury',longitude:90},{name:'Jupiter',longitude:180},{name:'Venus',longitude:120},
 {name:'Saturn',longitude:240},{name:'Rahu',longitude:30},{name:'Ketu',longitude:210}
]};
const footedDasa=phase4Dasa(footedSignChart);
ok(footedDasa.narayana.seed===0,'Narayana odd-footed fixture starts Aries');
ok(footedDasa.narayana.sequence.find(x=>x.cycle===1&&x.rasi===1)?.fullYears===3,'Narayana length: Taurus counts forward as odd-footed (source §18.2.2)');
ok(footedDasa.narayana.sequence.find(x=>x.cycle===1&&x.rasi===4)?.fullYears===5,'Narayana length: Leo counts backward as even-footed, with exalted Sun +1 (source §18.2.2)');
const ariesMd=footedDasa.narayana.sequence.find(x=>x.cycle===1&&x.rasi===0);
ok(ariesMd?.antardasas?.length===12&&ariesMd.antardasas[0].rasi===0&&ariesMd.antardasas.every(x=>Number.isInteger(x.rasi)&&x.rasi>=0&&x.rasi<12),'Narayana Dasa sign-code parsing preserves correct Antardasa seed and valid rasis');
const piSeedChart={birthDate:'2000-01-01',lagna:{longitude:330},planets:[
 {name:'Sun',longitude:0},{name:'Moon',longitude:60},{name:'Mars',longitude:90},
 {name:'Mercury',longitude:60},{name:'Jupiter',longitude:330},{name:'Venus',longitude:120},
 {name:'Saturn',longitude:240},{name:'Rahu',longitude:30},{name:'Ketu',longitude:210}
]};
const piSeedDasa=phase4Dasa(piSeedChart);
const mercuryVirgoChart={birthDate:'2000-01-01',lagna:{longitude:0},planets:[
 {name:'Sun',longitude:60},{name:'Moon',longitude:120},{name:'Mars',longitude:210},
 {name:'Mercury',longitude:165},{name:'Jupiter',longitude:270},{name:'Venus',longitude:30},
 {name:'Saturn',longitude:240},{name:'Rahu',longitude:150},{name:'Ketu',longitude:300}
]};
const mercuryVirgoDasa=phase4Dasa(mercuryVirgoChart);
const virgoCycle1=mercuryVirgoDasa.narayana.sequence.find(x=>x.cycle===1&&x.rasi===5);
const virgoCycle2=mercuryVirgoDasa.narayana.sequence.find(x=>x.cycle===2&&x.rasi===5);
ok(virgoCycle1?.fullYears===12&&virgoCycle2?.fullYears===0,'Narayana Mercury-in-Virgo conflict resolves to 12+0 years, never 13-1');
ok(mercuryVirgoDasa.narayana.sourceWarnings?.some(w=>w.rasi===5&&w.lord==='Mercury'&&w.uncappedYears===13&&w.firstCycleYears===12&&w.secondCycleYears===0),'Narayana Mercury-in-Virgo applies the documented inter-source 12-year cap and records the source reconciliation');
ok(piSeedDasa.narayana.seed===11&&piSeedDasa.narayana.sequence.slice(0,12).map(x=>x.rasi).join(',')==='11,3,7,8,0,4,5,9,1,2,6,10','PVR Narayana Table 40 Example 64: Pisces dual-sign progression');
ok(piSeedDasa.narayana.sequence.find(x=>x.cycle===1&&x.rasi===11)?.antardasas?.[0]?.rasi===11,'PVR Narayana Antardasa starts from its Dasa sign lord when Dasa sign is stronger than its 7th');

let pairs=0;
for(const bride of charts)for(const groom of charts){
 const p=m.porutham(bride,groom),k=m.kujaSamyam(bride,groom),ds=m.dashaSandhi(bride,groom),s=m.dashaDoshaSync(bride,groom);
 const verdict=m.fullVerdict(p,k,ds,m.chartFacts(bride),m.chartFacts(groom),s,bride,groom);
 const strength=m.marriageStrengthMatrix(bride,groom);
 ok(verdict?.k&&verdict?.label&&strength?.B&&strength?.G,'Full pair '+pairs);pairs++;
}
console.log(JSON.stringify({pass:true,assertions:checks,natalCharts:charts.length,nakshatraPairs:729,fullMatchingPairs:pairs}));
