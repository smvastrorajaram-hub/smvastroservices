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
 const n1=result.phase4.narayana.sequence.filter(x=>x.cycle===1),n2=result.phase4.narayana.sequence.filter(x=>x.cycle===2);
 ok(n1.length===12&&n2.length===12&&n1.every((x,i)=>Math.abs(n2[i].fullYears-(12-x.fullYears))<1e-9),date+' Narayana second cycle uses 12 minus first-cycle duration');
 ok(result.phase4.shoola.sequence.length===12&&result.phase4.shoola.sequence.every(md=>md.antardasas?.length===12&&md.antardasas[0].rasi===md.rasi||md.antardasas?.length===12&&md.antardasas[0].rasi===(md.rasi+6)%12),date+' Shoola Antardasa starts from stronger of Dasa sign/7th');
 ok(result.phase4.shoola.sequence.every(md=>md.antardasas.every((x,i,arr)=>i===0||x.rasi===(arr[i-1].rasi+1)%12),date+' Shoola Antardasa progresses zodiacally');
 ok(result.phase4.pvrResearch?.longevity?.researchOnly===true&&result.phase4.pvrResearch?.sodhyaPindaEventTiming?.researchOnly===true,date+' PVR add-on remains research-only');
 ok(result.phase4.pvrResearch.sodhyaPindaEventTiming.rows.length===7&&result.phase4.pvrResearch.sodhyaPindaEventTiming.rows.every(x=>x.product===x.rawBavRekhas*x.sodhyaPinda),date+' PVR Sodhya Pinda event products follow raw BAV rekha × Yoga Pinda');
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
let pairs=0;
for(const bride of charts)for(const groom of charts){
 const p=m.porutham(bride,groom),k=m.kujaSamyam(bride,groom),ds=m.dashaSandhi(bride,groom),s=m.dashaDoshaSync(bride,groom);
 const verdict=m.fullVerdict(p,k,ds,m.chartFacts(bride),m.chartFacts(groom),s,bride,groom);
 const strength=m.marriageStrengthMatrix(bride,groom);
 ok(verdict?.k&&verdict?.label&&strength?.B&&strength?.G,'Full pair '+pairs);pairs++;
}
console.log(JSON.stringify({pass:true,assertions:checks,natalCharts:charts.length,nakshatraPairs:729,fullMatchingPairs:pairs}));
