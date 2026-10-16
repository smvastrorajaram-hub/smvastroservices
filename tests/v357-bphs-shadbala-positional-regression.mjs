// V357 BPHS Vol I, R. Santhanam, Ch. 27, PDF pp. 264–266.
// Independent direct numerical expectations for ONLY three positional
// Shadbala subcomponents. Not a complete Shadbala certification.
import assert from 'node:assert/strict';
import {vargaDignityPoints,sthanaClassical} from '../public/horoscope/offline/swiss_vedic.browser.mjs';
import {full} from '../public/horoscope/offline/offline-engine.mjs';
let assertions=0;
const eq=(a,b,m)=>{assert.equal(a,b,m);assertions++};
const yes=(a,m)=>{assert.ok(a,m);assertions++};
const longitudeInSign=(s,deg)=>s*30+deg;
const dignities=[
 ['சூரியன்',4,{'சூரியன்':4},45,'Moolatrikona Leo'],
 ['செவ்வாய்',7,{'செவ்வாய்':0},30,'Mars own Scorpio'],
 ['சூரியன்',8,{'சூரியன்':4,'குரு':5},20,'natural friend + temporary friend = great friend'],
 ['சூரியன்',8,{'சூரியன்':4,'குரு':10},15,'natural friend + temporary enemy = friend'],
 ['சூரியன்',1,{'சூரியன்':4,'சுக்கிரன்':5},10,'natural enemy + temporary friend = neutral'],
 ['சூரியன்',2,{'சூரியன்':4,'புதன்':10},4,'natural neutral + temporary enemy = enemy'],
 ['சூரியன்',1,{'சூரியன்':4,'சுக்கிரன்':10},2,'natural enemy + temporary enemy = great enemy']
];
for(const [p,sign,refs,expected,why] of dignities)
 eq(vargaDignityPoints(p,sign,refs),expected,'BPHS Saptavargaja '+why);
const genders={
 'சூரியன்':'male','சந்திரன்':'female','செவ்வாய்':'male',
 'புதன்':'neutral','குரு':'male','சுக்கிரன்':'female','சனி':'neutral'
};
// Book rule: Moon and Venus gain 15 each in EVEN Rasi and Navamsa;
// all other five gain 15 each in ODD Rasi and Navamsa.
// Drekkana: male first 10°, female second 10°, neutral third 10°.
const casesDegrees=[0.1,3.33333,9.999,10,13.333333,19.999,20,23.33333,29.999];
function bookNavamsaSign(sign,degree){
 const subdivision=Math.min(8,Math.floor(degree/(10/3)));
 const start=sign%3===0?sign:sign%3===1?(sign+8)%12:(sign+4)%12;
 return (start+subdivision)%12;
}
for(const [planet,gender] of Object.entries(genders)){
 for(let s=0;s<12;s++){
  for(const degree of casesDegrees){
   const lon=longitudeInSign(s,degree),d9=bookNavamsaSign(s,degree);
   const oddDesired=gender!=='female';
   const rasiMatch=(s%2===0)===oddDesired;
   const navMatch=(d9%2===0)===oddDesired;
   const expectedOja=15*Number(rasiMatch)+15*Number(navMatch);
   const dec=Math.floor(degree/10);
   const target=gender==='male'?0:gender==='female'?1:2;
   const positional=sthanaClassical(planet,lon,1,{'சூரியன்':0,'சந்திரன்':1,'செவ்வாய்':2,'புதன்':3,'குரு':4,'சுக்கிரன்':5,'சனி':6});
   eq(positional.ojayugma,expectedOja,planet+' sign='+s+' degree='+degree+' Oja');
   eq(positional.drekkana,dec===target?15:0,planet+' sign='+s+' degree='+degree+' Drekkana');
  }
 }
}
// Exact printed point ladder from BPHS ch.27 pp.264-265:
// 45 for MT, 30 own, 20 great friend, 15 friend, 10 neutral, 4 enemy, 2 great enemy.
const required=[45,30,20,15,10,4,2];
assert.deepEqual(dignities.map(x=>x[3]),required,'Book Saptavargaja Virupa ladder'); assertions++;
const births=[['1994-06-15','13:03'],['2015-09-06','09:30'],['1992-07-31','22:05'],['1971-05-04','05:05'],['1974-01-11','16:04']];
const summaries=[];
for(const [date,time] of births){
 const r=await full({date,time,lat:11.232,lon:78.88,utcOffsetMinutes:330,referenceDate:'2026-10-16',name:'V357 Shadbala audit'});
 yes(r.ok&&r.chart.planets.length>=7,date+' natal 7 grahas available');
 let checked=0;
 for(const p of r.chart.planets){
  if(!(p.name in genders))continue;
  const bala=p.strength3;
  yes(bala?.components?.sthana!=null,date+' '+p.name+' phase3 components present');
  const d=(p.longitude%30+30)%30;
  const s=Math.floor(((p.longitude%360)+360)%360/30);
  const nav=bookNavamsaSign(s,d);
  const odd=genders[p.name]!=='female';
  const expected=15*Number((s%2===0)===odd)+15*Number((nav%2===0)===odd);
  eq(bala.components.sthana.ojayugma,expected,date+' '+p.name+' expected BPHS Oja');
  const desired=genders[p.name]==='male'?0:genders[p.name]==='female'?1:2;
  eq(bala.components.sthana.drekkana,Math.floor(d/10)===desired?15:0,date+' '+p.name+' expected BPHS Drekkana');
  checked++;
 }
 eq(checked,7,date+' has all seven classical positional component readings');
 summaries.push({date,checked});
}
console.log(JSON.stringify({pass:true,assertions,births:summaries,reference:'Santhanam BPHS I Ch 27 PDF pp 264-266',scope:'Saptavargaja dignity table + Oja/Rasi/Navamsa parity + Drekkana ONLY',fullClassicalShadbalaCertified:false,shodhana:'SKIPPED'}));