// SMV ASTRO — deterministic horoscope/matching calculation regression.
// Run from repository root: node tests/calculation-regression.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {calculateSwiss} from '../public/horoscope/offline/swiss_vedic.browser.mjs';
import {full} from '../public/horoscope/offline/offline-engine.mjs';
import {phase4Dasa} from '../public/horoscope/offline/dasa_engine.browser.mjs';
import {resolveSodhyaPindaTarget,calculateSodhyaPindaTransitWindows,computeRudraTrishoolaMaheswara} from '../public/horoscope/offline/pvr-longevity-sodhya-timing.browser.mjs';
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
ok(horoscopeSource.includes('const special=longevity.specialIndicators')&&horoscopeSource.includes('Matching Niryaana Shoola Periods'),'Longevity panel renders chart-derived indicators and matching Dasa results');
ok(!horoscopeSource.includes('P.V.R. நரசிம்ம ராவ் — ஆயுள் விதிகள்')&&!horoscopeSource.includes('நூல் பக்கங்கள் 180–185')&&!horoscopeSource.includes('நூலாசிரியர் இந்த சோத்ய')&&!horoscopeSource.includes('மாரக பாவங்கள்: 2 மற்றும் 7; உயிர்/ஆயுள் பாவங்கள்'),'Longevity panel omits copied heading, page note and static rule text');
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
const vimWrapperSource=fs.readFileSync(new URL('../public/horoscope/offline/server-wrapper.browser.mjs',import.meta.url),'utf8');
const vimRuntimeStart=vimWrapperSource.indexOf('function nakshatraInfo(lon)');
const vimRuntimeEnd=vimWrapperSource.indexOf('function circularLonDiff(',vimRuntimeStart);
ok(vimRuntimeStart>=0&&vimRuntimeEnd>vimRuntimeStart,'Found production Vimshottari Nakshatra Dasa source block');
const vimRuntime=vimWrapperSource.slice(vimRuntimeStart,vimRuntimeEnd);
const vimContext={
 NAKSHATRAS:['அஸ்வினி','பரணி','கார்த்திகை','ரோகிணி','மிருகசீரிடம்','திருவாதிரை','புனர்பூசம்','பூசம்','ஆயில்யம்','மகம்','பூரம்','உத்திரம்','ஹஸ்தம்','சித்திரை','சுவாதி','விசாகம்','அனுஷம்','கேட்டை','மூலம்','பூராடம்','உத்திராடம்','திருவோணம்','அவிட்டம்','சதயம்','பூரட்டாதி','உத்திரட்டாதி','ரேவதி'],
 NAK_LORDS:['கேது','சுக்கிரன்','சூரியன்','சந்திரன்','செவ்வாய்','ராகு','குரு','சனி','புதன்'],
 DASHA_YEARS:{'கேது':7,'சுக்கிரன்':20,'சூரியன்':6,'சந்திரன்':10,'செவ்வாய்':7,'ராகு':18,'குரு':16,'சனி':19,'புதன்':17},
 DASHA_ORDER:['கேது','சுக்கிரன்','சூரியன்','சந்திரன்','செவ்வாய்','ராகு','குரு','சனி','புதன்'],
 norm360:n=>{const x=Number(n)%360;return x<0?x+360:x;}
};
vm.runInNewContext(vimRuntime+'\nglobalThis.__vimshottariAudit=dashaAtBirth;',vimContext,{timeout:10000});
const vimshottariExample50=vimContext.__vimshottariAudit(302+23/60,new Date('2000-04-28T00:00:00Z'),'2026-10-20',330);
const vimBirthMd=vimshottariExample50.periods[0];
ok(Math.abs(vimshottariExample50.balanceYears-2.24875)<1e-8&&Math.abs(vimBirthMd.years-2.24875)<1e-8&&vimBirthMd.fullYears===7,'PVR §16.2 Example 50: Dhanishtha Moon at 2°23 Aquarius leaves 2.24875 Mars Dasa years');
ok(vimBirthMd.start==='2000-04-28'&&['2002-07-15','2002-07-16'].includes(vimBirthMd.end),'PVR Example 50: Savana-year Mars balance ends at the source worked-example boundary');
ok(vimBirthMd.antardashas[0].lord==='கேது'&&vimBirthMd.antardashas[0].years>0&&vimBirthMd.antardashas[0].years<vimBirthMd.antardashas[0].fullYears,'PVR §16.3: birth Antardasa is clipped to the remaining balance from the full Mars Mahadasa');
ok(Math.abs(vimBirthMd.antardashas.reduce((sum,x)=>sum+x.years,0)-vimBirthMd.years)<1e-8,'Vimshottari visible Antardasa balances sum to the Mahadasa remaining balance');
const specialRuleChart={birthDate:'2000-01-01',lagna:{longitude:0},planets:[
 {name:'Sun',longitude:29},{name:'Moon',longitude:57},{name:'Mars',longitude:86},
 {name:'Mercury',longitude:115},{name:'Jupiter',longitude:144},{name:'Venus',longitude:173},
 {name:'Saturn',longitude:202},{name:'Rahu',longitude:190},{name:'Ketu',longitude:10}
]};
const specialRuleResult=computeRudraTrishoolaMaheswara(specialRuleChart);
ok(specialRuleResult.available===true&&specialRuleResult.rudra.length>=1&&specialRuleResult.rudra.length<=2,'Longevity source rules: calculate Rudra from complete natal positions');
ok(specialRuleResult.rudraCandidates.lagnaEighthSign==='Scorpio'&&specialRuleResult.rudraCandidates.seventhEighthSign==='Taurus','PVR Table 32 oracle: Aries Lagna and Libra 7th use Scorpio/Taurus special eighth-house signs');
ok(specialRuleResult.trishoola.length===specialRuleResult.rudra.length&&specialRuleResult.trishoola.every(x=>x.signIndices.length===3&&new Set(x.signIndices).size===3&&x.signIndices.every(n=>Number.isInteger(n)&&n>=0&&n<12)),'Each selected Rudra produces three valid Trishoola signs');
ok(specialRuleResult.maheswara?.planet&&!['Rahu','Ketu'].includes(specialRuleResult.maheswara.planet),'Maheshwara applies Rahu/Ketu substitution');
ok(specialRuleResult.maheswara.usedSixthLordException===true&&specialRuleResult.maheswara.planet==='Mercury','PVR §14.3: Ketu conjunct Atmakaraka uses 6th lord, Mercury');
const exaltMaheswaraChart={...specialRuleChart,lagna:{longitude:30},planets:[
 {name:'Sun',longitude:89},{name:'Moon',longitude:57},{name:'Mars',longitude:86},
 {name:'Mercury',longitude:115},{name:'Jupiter',longitude:144},{name:'Venus',longitude:173},
 {name:'Saturn',longitude:202},{name:'Rahu',longitude:10},{name:'Ketu',longitude:190}
]};
const exaltMaheswara=computeRudraTrishoolaMaheswara(exaltMaheswaraChart);
ok(exaltMaheswara.atmakaraka.planet==='Sun'&&exaltMaheswara.maheswara.usedOwnExaltException===true&&['Mercury','Venus'].includes(exaltMaheswara.maheswara.planet),'PVR §14.3: exalted 8th lord compares the 8th and 12th lords from its sign');
const saturnCancerChart={...specialRuleChart,lagna:{longitude:30},planets:specialRuleChart.planets.map(p=>p.name==='Saturn'?{...p,longitude:110}:p)};
const saturnCancerResult=computeRudraTrishoolaMaheswara(saturnCancerChart);
ok(saturnCancerResult.rudraCandidates.usedNormalEighthRule===true&&saturnCancerResult.rudraCandidates.lagnaEighthSign==='Sagittarius'&&saturnCancerResult.rudraCandidates.seventhEighthSign==='Gemini','PVR Example 86: when Saturn is in Cancer, use ordinary 8th houses for Rudra');
const sudasaExample77Chart={birthDate:'2000-01-01',lagna:{longitude:270},planets:[
 {name:'Sun',longitude:30},{name:'Moon',longitude:0.4574074074},{name:'Mars',longitude:120},
 {name:'Mercury',longitude:60},{name:'Jupiter',longitude:180},{name:'Venus',longitude:210},
 {name:'Saturn',longitude:275},{name:'Rahu',longitude:40},{name:'Ketu',longitude:220}
]};
const sudasaExample77=phase4Dasa(sudasaExample77Chart).sudasa;
ok(sudasaExample77.seed===9&&sudasaExample77.sequence.filter(x=>x.cycle===1).map(x=>x.rasi).join(',')==='9,6,3,0,8,5,2,11,7,4,1,10','PVR §20.2 Example 77: even-sign Capricorn Sree Lagna gives backward Sudasa order despite Saturn occupying the seed sign');
ok(Math.abs(sudasaExample77.firstFraction-(30-12.35)/30)<1e-4,'PVR §20.2 Example 77: first Sudasa balance uses (30° − 12°21′) / 30°');
const birthCases=[['1994-06-15','13:03'],['2015-09-06','09:30'],['1992-07-31','22:05'],['1971-05-04','05:05'],['1974-01-11','16:04'],['2002-10-20','03:41']];
const dasaSource=fs.readFileSync(new URL('../public/horoscope/offline/dasa_engine.browser.mjs',import.meta.url),'utf8');
const strengthStart=dasaSource.indexOf('const SIGN_LORDS=');
const strengthMid=dasaSource.indexOf('function rasiAspects(sign){',strengthStart);
const strengthEnd=dasaSource.indexOf('function narayanaLengthDetail(',strengthMid);
ok(strengthStart>=0&&strengthMid>strengthStart&&strengthEnd>strengthMid,'Found source strength hierarchy and Rasi aspect helpers');
const strengthContext={EXALT:{Sun:0,Moon:1,Mars:9,Mercury:5,Jupiter:3,Venus:11,Saturn:6},DEBIL:{Sun:6,Moon:7,Mars:3,Mercury:11,Jupiter:9,Venus:5,Saturn:0},mod12:n=>((n%12)+12)%12,oddSign:i=>[0,2,4,6,8,10].includes(i),oddFootedSign:i=>[0,1,2,6,7,8].includes(((i%12)+12)%12)};
const strengthRuntime=dasaSource.slice(strengthStart,strengthMid)+dasaSource.slice(strengthMid,strengthEnd);
vm.runInNewContext(strengthRuntime+'\nglobalThis.__strengthAudit={strongerSign,ownLord};',strengthContext,{timeout:10000});
const strength=strengthContext.__strengthAudit;
ok(strength.strongerSign(0,6,{Sun:{sign:0},Moon:{sign:0},Mars:{sign:4},Mercury:{sign:2},Jupiter:{sign:0},Venus:{sign:6},Saturn:{sign:8},Rahu:{sign:10},Ketu:{sign:4}})===0,'PVR §15.5.2 rule 1: occupied-planet count outranks later strength tie-breakers');
ok(strength.strongerSign(0,6,{Moon:{sign:0,degree:10},Rahu:{sign:6,degree:10},Mars:{sign:4,degree:23},Venus:{sign:4,degree:19}})===0,'PVR §15.5.2 tie-break sequence reaches lord advancement only after the earlier rules tie');
ok(strength.strongerSign(0,6,{Venus:{sign:0,degree:10},Saturn:{sign:6,degree:10}})===6,'PVR §15.5.2: exalted Saturn in Libra wins an otherwise tied Aries/Libra comparison');
ok(strength.strongerSign(4,10,{Rahu:{sign:0,degree:10},Saturn:{sign:2,degree:10}})===10,'PVR §15.5.2 Exercise 26: Aquarius co-lord Rahu aspect is counted even with Saturn as primary co-lord');
ok(strength.ownLord(7,{Mars:{sign:7,degree:5},Ketu:{sign:0,degree:5}})==='Ketu','PVR §15.5.1: co-lord in its own Scorpio sign selects the other co-lord');
ok(strength.ownLord(10,{Saturn:{sign:2,degree:6},Rahu:{sign:5,degree:10}},'dasa')==='Saturn','PVR §15.5.1: Aquarius Dasa co-lord comparison uses calculated Narayana years');
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
ok(example59.applicabilityAudit.status==='SELECTED_RULE_MET'&&example59.applicabilityAudit.selectedInterpretation==='rahu_from_lagna_lord'&&example59.applicabilityAudit.applicability==='applicable'&&example59.applicabilityAudit.views.length===3,'BPHS ch.46 v.17 selected as the primary Ashtottari gate; alternate lineages remain visible');
const applicabilityNoRahu=dasaFixture(144,180,180,30); // Libra Lagna; Rahu in Libra: view (2) must fail.
const auditNoRahu=phase4Dasa(applicabilityNoRahu).ashtottari.applicabilityAudit;
ok(auditNoRahu.status==='SELECTED_RULE_NOT_MET'&&auditNoRahu.applicability==='not_applicable'&&auditNoRahu.views[1].status==='not_met'&&auditNoRahu.views[1].rahuInLagna===true,'BPHS Ashtottari gate: Rahu in Lagna does not qualify');
const applicabilityRahuQualifies=dasaFixture(144,180,300,30); // Libra Lagna, Venus is Lagna lord at Leo, Rahu Aquarius is 7th from Venus.
const auditQualifies=phase4Dasa(applicabilityRahuQualifies).ashtottari.applicabilityAudit;
ok(auditQualifies.status==='SELECTED_RULE_MET'&&auditQualifies.applicability==='applicable'&&auditQualifies.views[1].status==='met'&&auditQualifies.views[1].selected===true&&auditQualifies.views[1].rahuHouseFromLagnaLord===7,'BPHS Ashtottari gate: Rahu in a qualifying kendra from Lagna lord, outside Lagna');
const dayKrishnaChart=dasaFixture(200,180,300,30);dayKrishnaChart.birth.time='12:00';
const dayKrishnaAudit=phase4Dasa(dayKrishnaChart,null).ashtottari.applicabilityAudit;
const dayKrishnaResolved=phase4Dasa(dayKrishnaChart,null).ashtottari.applicabilityAudit.views[2];
const dayKrishnaWithSunrise=phase4Dasa(dayKrishnaChart,null,{sunrise:'06:00',sunset:'18:00'}).ashtottari.applicabilityAudit.views[2];
ok(dayKrishnaWithSunrise.status==='met'&&dayKrishnaWithSunrise.birthPeriod==='day'&&dayKrishnaWithSunrise.paksha==='Krishna','Ashtottari rule (3) positive: daytime Krishna-paksha birth with local sunrise/sunset evidence');
const nightShuklaChart=dasaFixture(100,180,300,30);nightShuklaChart.birth.time='23:00';
const nightShukla=phase4Dasa(nightShuklaChart,null,{sunrise:'06:00',sunset:'18:00'}).ashtottari.applicabilityAudit.views[2];
ok(nightShukla.status==='met'&&nightShukla.birthPeriod==='night'&&nightShukla.paksha==='Shukla','Ashtottari rule (3) positive: night Shukla-paksha birth with local sunrise/sunset evidence');
const dayShuklaChart=dasaFixture(100,180,300,30);dayShuklaChart.birth.time='12:00';
const dayShukla=phase4Dasa(dayShuklaChart,null,{sunrise:'06:00',sunset:'18:00'}).ashtottari.applicabilityAudit.views[2];
ok(dayShukla.status==='not_met','Ashtottari rule (3) counterexample: daytime Shukla-paksha birth does not meet this interpretation');
const nightKrishnaChart=dasaFixture(200,180,300,30);nightKrishnaChart.birth.time='23:00';
const nightKrishna=phase4Dasa(nightKrishnaChart,null,{sunrise:'06:00',sunset:'18:00'}).ashtottari.applicabilityAudit.views[2];
ok(nightKrishna.status==='not_met','Ashtottari rule (3) counterexample: nighttime Krishna-paksha birth does not meet this interpretation');
ok(dayKrishnaAudit.views[2].status==='not_evaluated'&&dayKrishnaResolved.status==='not_evaluated','Ashtottari applicability remains unresolved without the required sunrise/sunset evidence');

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
// Full 108-nakshatra-pada grid. Star subgroup assignment is an explicit selected lineage, not inferred from the implementation under test.
const kcRasiIndex={Ar:0,Ta:1,Ge:2,Cn:3,Le:4,Vi:5,Li:6,Sc:7,Sg:8,Cp:9,Aq:10,Pi:11};
const kcExpectedGroupByNak=['savya1','savya2','savya1','apasavya1','apasavya2','apasavya2','savya1','savya2','savya1','apasavya1','apasavya2','apasavya2','savya1','savya2','savya1','apasavya1','apasavya2','apasavya2','savya1','savya2','savya1','apasavya1','apasavya2','apasavya2','savya1','savya2','savya2'];
const kcExpectedSequences={
 savya1:[[0,1,2,3,4,5,6,7,8],[9,10,11,7,6,5,3,4,2],[1,0,11,10,9,8,0,1,2],[3,4,5,6,7,8,9,10,11]],
 savya2:[[7,6,5,3,4,2,1,0,11],[10,9,8,0,1,2,3,4,5],[6,7,8,9,10,11,7,6,5],[3,4,2,1,0,11,10,9,8]],
 apasavya1:[[8,9,10,11,0,1,2,4,3],[5,6,7,11,10,9,8,7,6],[5,4,3,2,1,0,8,9,10],[11,0,1,2,4,3,5,6,7]],
 apasavya2:[[11,10,9,8,7,6,5,4,3],[2,1,0,8,9,10,11,0,1],[2,4,3,5,6,7,11,10,9],[8,7,6,5,4,3,2,1,0]]
};
const kcExpectedParamayush={savya1:[100,85,83,86],savya2:[100,85,83,86],apasavya1:[86,83,85,100],apasavya2:[86,83,85,100]};
let kcGridCases=0;
for(let nak=0;nak<27;nak++)for(let pada=0;pada<4;pada++){
 const moonLon=nak*(40/3)+pada*(10/3)+0.0001;
 const d=phase4Dasa(dasaFixture(moonLon)).kalachakra;
 const group=kcExpectedGroupByNak[nak],expected=kcExpectedSequences[group][pada];
 ok(d.available&&d.nakshatraIndex===nak+1&&d.pada===pada+1,'Kalachakra 108-grid: correct star/pada index '+(nak+1)+'/'+(pada+1));
 ok(d.group===group,'Kalachakra selected-lineage subgroup '+(nak+1)+'/'+(pada+1)+' = '+group);
 ok(d.paramayush===kcExpectedParamayush[group][pada],'Kalachakra paramayush source-table value '+(nak+1)+'/'+(pada+1));
 ok(d.sequence.slice(0,9).map(x=>kcRasiIndex[x.rasi]).join(',')===expected.join(','),'Kalachakra nine-rasi table oracle '+group+' pada '+(pada+1));
 ok(d.sequence.length===12&&d.sequence.every(md=>md.antardasas.length===9&&Math.abs(md.antardasas.reduce((sum,x)=>sum+x.years,0)-md.years)<1e-7),'Kalachakra MD/AD balance conservation '+(nak+1)+'/'+(pada+1));
 kcGridCases++;
}
ok(kcGridCases===108,'Kalachakra complete 108-nakshatra-pada matrix is exercised');
const drigExpected='2,5,8,11,3,1,10,7,4,0,9,6';
const drigExample80=phase4Dasa(dasaFixture(45,180)).drigdasa;
ok(drigExample80.groups.join(',')==='2,3,4','PVR §21.2 Example 80: Libra Lagna seeds 9th/10th/11th houses in Gemini/Cancer/Leo');
ok(drigExample80.groupSequences.map(g=>g.join(',')).join('|')==='2,5,8,11|3,1,10,7|4,0,9,6','PVR Example 80: complete 4-rasi aspect-group order matches Ge-Vi-Sg-Pi / Cn-Ta-Aq-Sc / Le-Ar-Cp-Li');
ok(drigExample80.sequence.filter(x=>x.cycle===1).map(x=>x.rasi).join(',')===drigExpected,'PVR Example 80: full Drigdasa sequence matches source oracle');
ok(drigExample80.sourceLineage==='PVR/Parashara §21.2, Example 80'&&drigExample80.variantPolicy.includes('Do not merge it with alternate Jaimini-commentary'),'Drigdasa explicitly selects Parashara-style lineage without mixing Jaimini commentary variants');
let drigdasaOverlapCases=0;
for(let lagnaSign=0;lagnaSign<12;lagnaSign++){
 const d=phase4Dasa(dasaFixture(45,lagnaSign*30)).drigdasa;
 const first=d.sequence.filter(x=>x.cycle===1);
 ok(d.groups.length===3&&d.groupSequences.length===3&&d.groupSequences.every(g=>g.length===4),'Drigdasa counterexample sign '+lagnaSign+': each source aspect group has exactly four signs');
 ok(first.length===12&&first.map(x=>x.rasi).join(',')===d.groupSequences.flat().join(','),'Drigdasa counterexample sign '+lagnaSign+': retain all 12 source-ordered group entries without fallback');
 if(new Set(first.map(x=>x.rasi)).size<12)drigdasaOverlapCases++;
}
ok(drigdasaOverlapCases>0,'Drigdasa overlap counterexample: repeated rasis from separately derived house-groups are preserved instead of padded');
const renderStart=horoscopeSource.indexOf('function renderPhase4Dasa(data,lang,slot){');
const renderEnd=horoscopeSource.indexOf('\n  window.__smvLoadPhase4Dasa=loadPhase4Dasa;',renderStart);
ok(renderStart>=0&&renderEnd>renderStart,'Found Phase-4 renderer source for runtime regression');
const rendererChunk=horoscopeSource.slice(renderStart,renderEnd);
const renderContext={window:{},mockResult:null};
const sharedArrStart=horoscopeSource.indexOf('const arr=v=>Array.isArray(v)?v:');
const sharedArrEnd=horoscopeSource.indexOf(';',sharedArrStart);
const sharedArrSource=sharedArrStart>=0&&sharedArrEnd>sharedArrStart?horoscopeSource.slice(sharedArrStart,sharedArrEnd+1):'';
ok(sharedArrSource.includes('const arr=v=>Array.isArray(v)?v:'),'Runtime regression extracts the production shared arr helper');
vm.runInNewContext(sharedArrSource+"\n"+rendererChunk+"\nglobalThis.runRenderer=renderPhase4Dasa;",renderContext,{timeout:20000});
const mockAdvanced={querySelectorAll:()=>[]};
const mockReport={querySelector:(selector)=>selector==='.smv-advanced-part.chart-analysis > .smv-advanced-part-content'?mockAdvanced:null};
const mockSlot={isConnected:true,parentElement:mockReport,closest:()=>mockReport,querySelector:()=>null,querySelectorAll:()=>[],innerHTML:''};
renderContext.runRenderer({
 ashtottari:{available:true,sequence:[{lord:'Moon',years:6,start:'2000-01-01',end:'2006-01-01',antardasas:[{lord:'Rahu',years:1,start:'2000-01-01',end:'2001-01-01'}]}]},
 pvrResearch:{
  longevity:{specialIndicators:{
   available:true,
   rudra:[{planet:'Mars',signIndex:7}],
   trishoola:[{rudraPlanet:'Mars',signIndices:[7,11,3]}],
   maheswara:{planet:'Jupiter',signIndex:8},
   niryaanaShoolaMatches:[{rasi:7,ageStartYears:1,ageEndYears:2,start:'2001-01-01',end:'2002-01-01'}]
  },dasaTiming:{
   ageBandYears:{start:0,end:36},
   niryaanaShoola:{periods:[{rasi:7,ageStartYears:1,ageEndYears:2,years:1,start:'2001-01-01',end:'2002-01-01'}]},
   shoola:{periods:[]}
  }},
  sodhyaPindaEventTiming:{rows:[]}
 }
},'ta',mockSlot);
ok(mockSlot.innerHTML.includes('ஆண்டுகள்')&&mockSlot.innerHTML.includes('விருச்சிகம்'),'Phase-4 Tamil renderer executes all report paths, including arr(block.periods), without ReferenceError');
ok(mockSlot.innerHTML.includes('ருத்ரன்')&&mockSlot.innerHTML.includes('திரிசூல ராசிகள்')&&mockSlot.innerHTML.includes('மகேஸ்வரன்')&&mockSlot.innerHTML.includes('பொருந்தும் நிர்யாண சூல தசைக் காலங்கள்'),'Phase-4 shows computed three-part longevity results');
ok(!mockSlot.innerHTML.includes('P.V.R. நரசிம்ம ராவ் — ஆயுள் விதிகள்')&&!mockSlot.innerHTML.includes('நூல் பக்கங்கள் 180–185')&&!mockSlot.innerHTML.includes('நூலாசிரியர் இந்த சோத்ய'),'Phase-4 omits copied author/page/rule text');
renderContext.runRenderer({narayana:{sourceWarnings:[{rasi:5,lord:'Mercury',uncappedYears:13,firstCycleYears:12,secondCycleYears:0,resolution:'The printed PVR rule sequence would produce more than 12 years (Mercury in Virgo: 12 + 1). A 12-year maximum is applied from Sanjay Rath, Narayana Dasa, printed p. 42. This is an inter-source reconciliation, not stated in the supplied PVR passage.'}]},pvrResearch:{longevity:{pairs:[]},sodhyaPindaEventTiming:{rows:[]}}},'en',mockSlot);
ok(mockSlot.innerHTML.includes('The printed PVR rule sequence would produce more than 12 years')&&!mockSlot.innerHTML.includes('undefined'),'Narayana English renderer shows the explicit PVR/Sanjay Rath reconciliation instead of undefined');

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
  const indicators=longevity.specialIndicators;
  ok(indicators?.available===true&&indicators.rudra?.length>=1&&indicators.maheswara?.planet,date+' chart-based Rudra/Maheshwara results available');
  ok(indicators.trishoola?.length===indicators.rudra.length&&indicators.trishoola.every(x=>x.signIndices?.length===3),date+' three Trishoola signs calculated for each Rudra result');
  ok(Array.isArray(indicators.niryaanaShoolaMatches)&&indicators.niryaanaShoolaMatches.every(x=>(indicators.trishoola||[]).some(t=>t.signIndices.includes(x.rasi))),date+' Niryaana Shoola matches must be among computed Trishoola signs');
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
// Independent source-rule fixtures for Lagna Kendradi, Niryaana Shoola and Shoola.
const makePhase4Fixture=(lagnaSign,overrides={})=>{
 const signs={Sun:1,Moon:2,Mars:3,Mercury:4,Jupiter:5,Venus:6,Saturn:11,Rahu:9,Ketu:3,...overrides};
 return {birthDate:'2000-01-01',lagna:{longitude:lagnaSign*30+10},planets:Object.entries(signs).map(([name,sign])=>({name,longitude:sign*30+5}))};
};
const kendradiNormal=phase4Dasa(makePhase4Fixture(7)).lagnaKendradi.sequence.filter(x=>x.cycle===1);
ok(kendradiNormal.map(x=>x.rasi).join(',')==='1,10,7,4,0,9,6,3,11,8,5,2','PVR §19.2 backward Lagna Kendradi: Scorpio Lagna with stronger Taurus seed follows Kendra/Panaphara/Apoklima groups');
const kendradiSaturn=phase4Dasa(makePhase4Fixture(7,{Saturn:1})).lagnaKendradi.sequence.filter(x=>x.cycle===1);
ok(kendradiSaturn.map(x=>x.rasi).join(',')==='1,4,7,10,2,5,8,11,3,6,9,0','PVR §19.2 exception: Saturn in the stronger seed forces the grouped sequence forward');
const kendradiKetu=phase4Dasa(makePhase4Fixture(7,{Rahu:7,Ketu:1})).lagnaKendradi.sequence.filter(x=>x.cycle===1);
ok(kendradiKetu.map(x=>x.rasi).join(',')==='1,4,7,10,2,5,8,11,3,6,9,0','PVR §19.2 exception: Ketu in the stronger seed reverses the ordinary direction');
const niryaanaNormal=phase4Dasa(makePhase4Fixture(0,{Sun:4,Moon:2,Mars:7,Mercury:5,Jupiter:9,Venus:3,Saturn:11,Rahu:7,Ketu:1})).niryaanaShoola;
ok(niryaanaNormal.seed===7&&niryaanaNormal.sequence.map(x=>x.rasi).join(',')==='7,6,5,4,3,2,1,0,11,10,9,8','PVR §22.2.1 normal even-sign seed runs backward from the stronger 8th-house Scorpio');
ok(niryaanaNormal.sequence.slice(0,3).map(x=>x.fullYears).join(',')==='8,7,9','Niryaana Shoola fixed/movable/dual sign durations are 8/7/9 years');
ok(niryaanaNormal.sequence.every(md=>md.antardasas.length===12&&Math.abs(md.antardasas.reduce((sum,x)=>sum+x.years,0)-md.years)<1e-7),'Niryaana Shoola Narayana-style Antardasas conserve each Mahadasa duration');
const shoolaOracle=phase4Dasa(makePhase4Fixture(0,{Sun:0,Moon:2,Mars:0,Mercury:4,Jupiter:5,Venus:7,Saturn:8,Rahu:9,Ketu:3})).shoola;
ok(shoolaOracle.seed===0&&shoolaOracle.sequence.map(x=>x.rasi).join(',')==='0,1,2,3,4,5,6,7,8,9,10,11','PVR §23.2 Shoola starts from stronger Lagna/7th and always progresses zodiacally');
ok(shoolaOracle.sequence.every(md=>md.fullYears===9&&md.antardasas.length===12&&md.antardasas.every(x=>Math.abs(x.years-0.75)<1e-9)),'PVR §23.2 Shoola uses 9-year Mahadasas and 12 equal Antardasas of 0.75 years');
const saturnSeedChart={birthDate:'2000-01-01',lagna:{longitude:0},planets:[
 {name:'Sun',longitude:120},{name:'Moon',longitude:60},{name:'Mars',longitude:210},
 {name:'Mercury',longitude:150},{name:'Jupiter',longitude:270},{name:'Venus',longitude:90},
 {name:'Saturn',longitude:210},{name:'Rahu',longitude:210},{name:'Ketu',longitude:30}
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
