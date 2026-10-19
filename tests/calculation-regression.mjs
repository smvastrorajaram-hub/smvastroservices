// SMV ASTRO — deterministic horoscope/matching calculation regression.
// Run from repository root: node tests/calculation-regression.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {calculateSwiss} from '../public/horoscope/offline/swiss_vedic.browser.mjs';
import {full} from '../public/horoscope/offline/offline-engine.mjs';
import {phase4Dasa} from '../public/horoscope/offline/dasa_engine.browser.mjs';
import {resolveSodhyaPindaTarget} from '../public/horoscope/offline/pvr-longevity-sodhya-timing.browser.mjs';
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
const birthCases=[['1994-06-15','13:03'],['2015-09-06','09:30'],['1992-07-31','22:05'],['1971-05-04','05:05'],['1974-01-11','16:04']];
const charts=[];
for(const [date,time] of birthCases){
 const result=await full({date,time,lat:11.232,lon:78.88,utcOffsetMinutes:330,referenceDate:'2026-10-16',name:'Audit'});
 const c=result.chart;
 ok(result.ok&&result.advanced&&result.phase4&&result.transit&&result.birthPanchang,date+' full calculation');
 ok(result.phase4.narayana.sequence.length===24,date+' Narayana two-cycle rows');
 ok(result.phase4.narayana.sequence.every(md=>md.antardasas?.length===12&&md.antardasas.every(x=>Number.isInteger(x.rasi)&&x.rasi>=0&&x.rasi<12)),date+' Narayana Antardasa rows use valid rasi indices');
 const n1=result.phase4.narayana.sequence.filter(x=>x.cycle===1),n2=result.phase4.narayana.sequence.filter(x=>x.cycle===2);
 const cycleMismatches=n1.map((x,i)=>({rasi:x.rasi,first:x.fullYears,second:n2[i]?.fullYears,expected:Math.max(0,12-x.fullYears)})).filter(x=>Math.abs(Number(x.second)-x.expected)>1e-9); ok(n1.length===12&&n2.length===12&&cycleMismatches.length===0,date+' Narayana second-cycle source-rule handling mismatches: '+JSON.stringify(cycleMismatches));
 if(n1.some(x=>x.fullYears>12))ok(result.phase4.narayana.sourceWarnings?.some(w=>w.rasi===n1.find(x=>x.fullYears>12).rasi),date+' Narayana flags impossible negative second-cycle source result');
 ok(result.phase4.shoola.sequence.length===12&&result.phase4.shoola.sequence.every(md=>md.antardasas?.length===12&&md.antardasas[0].rasi===md.rasi||md.antardasas?.length===12&&md.antardasas[0].rasi===(md.rasi+6)%12),date+' Shoola Antardasa starts from stronger of Dasa sign/7th');
 ok(result.phase4.shoola.sequence.every(md=>md.antardasas.every((x,i,arr)=>i===0||x.rasi===(arr[i-1].rasi+1)%12)),date+' Shoola Antardasa progresses zodiacally');
 ok(result.phase4.pvrResearch?.longevity?.researchOnly===true&&result.phase4.pvrResearch?.sodhyaPindaEventTiming?.researchOnly===true,date+' PVR add-on remains research-only');
 ok(result.phase4.pvrResearch.sodhyaPindaEventTiming.rows.length===7&&result.phase4.pvrResearch.sodhyaPindaEventTiming.rows.every(x=>x.product===x.rawBavRekhas*x.sodhyaPinda),date+' PVR Sodhya Pinda event products follow raw BAV rekha × Yoga Pinda');
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
