// V357: Independent book-to-source BAV Prastara: Mercury/Jupiter/Venus/Saturn.
// BPHS II (R. Santhanam), Chapter 66, printed pp. 858-862,
// PDF pp. 368-372. Lists transcribed independently from the English prose
// (NOT copied from BAV_TABLES). Excludes Trikona/Ekadhipatya Shodhana.
import assert from 'node:assert/strict';
import {full} from '../public/horoscope/offline/offline-engine.mjs';
const P=['சூரியன்','சந்திரன்','செவ்வாய்','புதன்','குரு','சுக்கிரன்','சனி','லக்கினம்'];
const abbrev={SN:P[0],MN:P[1],MRS:P[2],MCY:P[3],JUP:P[4],VEN:P[5],SAT:P[6],ASC:P[7]};
const ALL='SN MN MRS MCY JUP VEN SAT ASC';
const seven='SN MN MRS MCY JUP VEN ASC';
const book={
 'புதன்':[
 'ASC SAT MRS VEN MCY', 'ASC MRS MN VEN SAT','VEN MCY',
 'ASC MN SAT VEN MRS',/* Book prose names SAT for house 5; its printed Rekhas table marks SN instead. */'SN MCY VEN','JUP MCY SN MN ASC',
 'MRS SAT','MRS SAT ASC MN VEN JUP','SAT MRS SN MCY VEN',
 'ASC SAT MRS MCY MN',ALL,'JUP MCY SN'
 ],
 'குரு':[
 // The Jupiter printed Prastara TABLE shows JUP in houses 1 and 4,
 // even though the English prose omits JUP there. Book internal discrepancy.
 'ASC MRS SN MCY JUP','JUP ASC MRS SN MCY MN VEN','SAT JUP SN',
 'ASC MRS SN MCY JUP','VEN MN ASC MCY SAT','VEN ASC MCY SAT',
 'ASC MRS JUP SN MN','JUP SN MRS','VEN SN ASC MN MCY',
 'JUP MCY MRS SN VEN ASC',seven,'SAT'
 ],
 'சுக்கிரன்':[
 'ASC VEN MN','ASC VEN MN','ASC VEN MN MCY SAT MRS',
 'ASC VEN MN SAT MRS','ASC MCY MN JUP SAT VEN','MCY MRS',
 '','VEN SN MN JUP ASC SAT','MN MRS MCY JUP VEN SAT ASC',
 'VEN JUP SAT',ALL,'MRS MN SN'
 ],
 'சனி':[
 'SN ASC','SN','ASC MN MRS SAT','ASC SN','JUP SAT MRS',
 'MN MRS MCY JUP VEN SAT ASC','SN','SN MCY','MCY',
 'SN MRS ASC MCY',ALL,'MRS MCY JUP VEN'
 ]
};
const expected={புதன்:54,குரு:56,சுக்கிரன்:52,சனி:39};
let checks=0;const same=(a,b,message)=>{assert.deepEqual(a,b,message);checks++};
for(const [planet,rows] of Object.entries(book)){
 same(rows.length,12,planet+' twelve independently transcribed houses');
 let total=0;
 for(let h=0;h<12;h++){
  const tokens=rows[h] ? rows[h].split(' ') : [];
  same(new Set(tokens).size,tokens.length,planet+' unique refs '+(h+1));
  for(const x of tokens) assert.ok(x in abbrev,'unknown book contributor '+x);
  total+=tokens.length;
 }
 same(total,expected[planet],planet+' classical 54/56/52/39 contributors');
}
const natalCases=[
 ['1994-06-15','13:03'],['2015-09-06','09:30'],['1992-07-31','22:05'],
 ['1971-05-04','05:05'],['1974-01-11','16:04']
];
const details=[];
for(const [date,time] of natalCases){
 const c=await full({date,time,lat:11.232,lon:78.88,utcOffsetMinutes:330,referenceDate:'2026-10-16',name:'V357 Classical BAV'});
 assert.ok(c.ok&&c.advanced?.ashtakavarga?.bhinna,date+' chart available');
 checks++;
 const sign=lon=>Math.floor((Number(lon)%360+360)%360/30);
 const refs=Object.fromEntries(c.chart.planets.map(p=>[p.name,sign(p.longitude)]));
 refs['லக்கினம்']=sign(c.chart.lagna.longitude);
 for(const [target,houseStrings] of Object.entries(book)){
  const reconstructed=Array.from({length:12},()=>Array(8).fill(0));
  for(let h=0;h<12;h++){
   const set=new Set(houseStrings[h]?houseStrings[h].split(' '):[]);
   for(const [j,source] of P.entries()){
    const code=Object.keys(abbrev).find(k=>abbrev[k]===source);
    if(set.has(code))reconstructed[(refs[source]+h)%12][j]=1;
   }
  }
  const expectedBindus=reconstructed.map(r=>r.reduce((a,b)=>a+b,0));
  const actual=c.advanced.ashtakavarga.bhinna.find(r=>r.planet===target);
  assert.ok(actual,target+' Prastara row exists on '+date);
  same(actual.total,expected[target],date+' '+target+' contributor total');
  same(actual.bindus,expectedBindus,date+' '+target+' twelve BAV signs');
  for(let s=0;s<12;s++)same(actual.prastara[s],reconstructed[s],date+' '+target+' sign='+s);
 }
 details.push({date,bookPlanets:['Mercury','Jupiter','Venus','Saturn']});
}
console.log(JSON.stringify({pass:true,checks,reference:'BPHS II Ch66 printed pp 858-862; four independent 12-house contributor lists',bookPlanets:4,chartCount:5,details,shodhana:'SKIPPED',remainingCoverage:'Seven BAV grahas covered in separate tests; independent reference checks for SAV and Kakshya still pending'}));