// V357: independent Kakshya-owner -> BAV contributor mapping verification.
// Classical 8 Kakshya sectors (each 3°45'): Saturn,Jupiter,Mars,Sun,
// Venus,Mercury,Moon,Ascendant. Prastara columns follow a DIFFERENT order.
// Shodhana is excluded by explicit user instruction.
import assert from 'node:assert/strict';
import {full} from '../public/horoscope/offline/offline-engine.mjs';
import {advanced} from '../public/horoscope/offline/astro_advanced.browser.mjs';
const kakshya=['சனி','குரு','செவ்வாய்','சூரியன்','சுக்கிரன்','புதன்','சந்திரன்','லக்கினம்'];
const prastara=['சூரியன்','சந்திரன்','செவ்வாய்','புதன்','குரு','சுக்கிரன்','சனி','லக்கினம்'];
const seven=prastara.slice(0,7);
const sign=x=>Math.floor(((x%360)+360)%360/30);
let assertions=0;
const eq=(a,b,m)=>{assert.deepEqual(a,b,m);assertions++};
const sample=[['1994-06-15','13:03'],['2015-09-06','09:30'],['1992-07-31','22:05'],['1971-05-04','05:05'],['1974-01-11','16:04']];
const checks=[];
for(const [date,time] of sample){
 const f=await full({date,time,lat:11.232,lon:78.88,utcOffsetMinutes:330,referenceDate:'2026-10-16',name:'V357 Kakshya source audit'});
 assert.ok(f.ok,'full chart generated');
 assertions++;
 const av=f.advanced.ashtakavarga;
 const refTotals=Object.fromEntries(av.bhinna.map(r=>[r.planet,r.total]));
 eq(av.sarva,Array.from({length:12},(_,s)=>av.bhinna.reduce((n,r)=>n+r.bindus[s],0)),date+' SAV is sum of seven BAV per sign');
 eq(av.sarvaTotal,337,date+' complete aggregate 337');
 const rowBy=Object.fromEntries(av.bhinna.map(r=>[r.planet,r]));
 for(const p of f.chart.planets.filter(p=>seven.includes(p.name))){
  const actual=av.kakshya.items.find(x=>x.planet===p.name);
  assert.ok(actual,'Kakshya result exists for '+p.name); assertions++;
  const s=sign(p.longitude),d=((p.longitude%30)+30)%30,sector=Math.min(7,Math.floor(d/3.75));
  const ruler=kakshya[sector];
  const expected=!!rowBy[p.name].prastara[s][prastara.indexOf(ruler)];
  eq(actual.kakshyaIndex,sector+1,date+' '+p.name+' sector');
  eq(actual.hasRekha,expected,date+' '+p.name+' Kakshya contributor Rekha');
 }
 checks.push({date,savTotal:av.sarvaTotal,verifiedPlanets:7});
}
// Every Kakshya boundary and its immediate neighbours for all seven
// planet BAVs. This creates synthetic positions ONLY for testing mapping,
// not synthetic life predictions.
const f=await full({date:'1992-07-31',time:'22:05',lat:11.232,lon:78.88,utcOffsetMinutes:330,referenceDate:'2026-10-16',name:'V357 Kakshya boundary'});
for(const d of [0,0.000001,3.75-0.000001,3.75,7.5-0.000001,7.5,11.25,15,18.75,22.5,26.25,29.999999]){
 const planets=f.chart.planets.map(p=>seven.includes(p.name)?{...p,longitude:sign(p.longitude)*30+d}:p);
 const mock={...f.chart,planets};
 const av=advanced(mock,'ta').ashtakavarga;
 const rows=Object.fromEntries(av.bhinna.map(r=>[r.planet,r]));
 const segment=Math.min(7,Math.floor(d/3.75)),owner=kakshya[segment];
 for(const p of planets.filter(p=>seven.includes(p.name))){
  const item=av.kakshya.items.find(x=>x.planet===p.name);
  const expected=!!rows[p.name].prastara[sign(p.longitude)][prastara.indexOf(owner)];
  eq(item.kakshyaIndex,segment+1,p.name+' D1 degree '+d+' correct Kakshya sector');
  eq(item.hasRekha,expected,p.name+' D1 degree '+d+' correct book contributor column');
 }
}
console.log(JSON.stringify({pass:true,assertions,bookKakshyaLords:kakshya,prastaraColumns:prastara,realNatalCharts:5,syntheticBoundaryDegrees:12,shodhana:'SKIPPED',savBookIndependent:false,notes:'SAV aggregation audited, separate classical transit-effect oracle remains pending',checks}));