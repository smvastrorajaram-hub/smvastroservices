// V357 independent BPHS Volume II Chapter 66 BAV Prastara spot-audit.
// Direct prose-to-reference contributor lists for Sun/Moon/Mars ONLY
// (printed BPHS II pp. 854–858, PDF around pp. 366–370).
// No Shodhana, no new prediction claims, no copied source BAV arrays.
import assert from 'node:assert/strict';
import {full} from '../public/horoscope/offline/offline-engine.mjs';
const planets=['சூரியன்','சந்திரன்','செவ்வாய்','புதன்','குரு','சுக்கிரன்','சனி','லக்கினம்'];
const refs={
 'சூரியன்':[
  'சூரியன் செவ்வாய் சனி','சூரியன் செவ்வாய் சனி','சந்திரன் புதன் லக்கினம்',
  'சூரியன் செவ்வாய் சனி லக்கினம்','புதன் குரு',
  'சந்திரன் புதன் குரு சுக்கிரன் லக்கினம்','சூரியன் செவ்வாய் சுக்கிரன் சனி',
  'சூரியன் செவ்வாய் சனி','சூரியன் செவ்வாய் புதன் குரு சனி',
  'சூரியன் சந்திரன் செவ்வாய் புதன் சனி லக்கினம்',
  'சூரியன் சந்திரன் செவ்வாய் புதன் குரு சனி லக்கினம்','புதன் சுக்கிரன் லக்கினம்'
 ],
 'சந்திரன்':[
  'சந்திரன் புதன் குரு','செவ்வாய் குரு',
  'சூரியன் சந்திரன் செவ்வாய் புதன் சுக்கிரன் சனி லக்கினம்',
  'புதன் குரு சுக்கிரன்','செவ்வாய் புதன் சுக்கிரன் சனி',
  'சூரியன் சந்திரன் செவ்வாய் சனி லக்கினம்','சூரியன் சந்திரன் புதன் குரு சுக்கிரன்',
  'சூரியன் புதன் குரு','சந்திரன் சுக்கிரன்',
  'சூரியன் சந்திரன் செவ்வாய் புதன் குரு சுக்கிரன் லக்கினம்',
  'சூரியன் சந்திரன் செவ்வாய் புதன் குரு சுக்கிரன் சனி லக்கினம்',''
 ],
 'செவ்வாய்':[
  'செவ்வாய் சனி லக்கினம்','செவ்வாய்','சூரியன் சந்திரன் புதன் லக்கினம்',
  'செவ்வாய் சனி','சூரியன் புதன்','சூரியன் சந்திரன் புதன் குரு சுக்கிரன் லக்கினம்',
  'செவ்வாய் சனி','செவ்வாய் சுக்கிரன் சனி','சனி','சூரியன் செவ்வாய் குரு சனி லக்கினம்',
  'சூரியன் சந்திரன் செவ்வாய் புதன் குரு சுக்கிரன் சனி லக்கினம்','குரு சுக்கிரன்'
 ]
};
for(const [target,houses] of Object.entries(refs)){
 assert.equal(houses.length,12,target+' 12 independent house lists');
 for(const h of houses)for(const contributor of (h?h.split(' '):[]))
  assert.ok(planets.includes(contributor),'unknown reference contributor '+contributor);
}
let checks=0;const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++};
const births=[['1994-06-15','13:03'],['2015-09-06','09:30'],['1992-07-31','22:05'],['1971-05-04','05:05'],['1974-01-11','16:04']];
const summary=[];
for(const [date,time] of births){
 const d=await full({date,time,lat:11.232,lon:78.88,utcOffsetMinutes:330,referenceDate:'2026-10-16',name:'V357 BAV Prastara'});
 assert.ok(d.ok&&d.advanced?.ashtakavarga?.bhinna,'BAV chart present: '+date);
 checks++;
 const nat=d.chart;
 const signOf=lon=>Math.floor(((lon%360)+360)%360/30);
 const referenceSigns=Object.fromEntries(nat.planets.map(p=>[p.name,signOf(p.longitude)]));
 referenceSigns['லக்கினம்']=signOf(nat.lagna.longitude);
 for(const [target,houses] of Object.entries(refs)){
  const matrix=Array.from({length:12},()=>Array(8).fill(0));
  for(let h=0;h<12;h++){
   const list=houses[h] ? houses[h].split(' '):[];
   for(let k=0;k<8;k++){
    const contributor=planets[k];
    if(list.includes(contributor)){
     const targetSign=(referenceSigns[contributor]+h)%12;
     matrix[targetSign][k]=1;
    }
   }
  }
  const expectedBindus=matrix.map(row=>row.reduce((a,b)=>a+b,0));
  const actual=d.advanced.ashtakavarga.bhinna.find(x=>x.planet===target);
  assert.ok(actual,target+' BAV exists '+date);
  eq(actual.bindus,expectedBindus,target+' exact 12-sign book distribution '+date);
  for(let sign=0;sign<12;sign++){
   eq(actual.prastara[sign],matrix[sign],target+' contributor-by-contributor prastara '+date+' sign '+sign);
  }
 }
 summary.push({date,verifiedPlanets:3});
}
console.log(JSON.stringify({pass:true,checks,reference:'BPHS II Chapter 66 Sun/Moon/Mars Rekhaprada contributor prose',bookVerifiedRows:3,pendingRows:['Mercury','Jupiter','Venus','Saturn'],sampleCharts:summary,shodhana:'SKIPPED',fullClassicalBavCertified:false}));