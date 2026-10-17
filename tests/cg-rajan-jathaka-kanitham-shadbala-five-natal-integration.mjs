/**
 * Five Perambalur birth charts: live Swiss engine integration guard.
 * This verifies source-specific PARTIAL components are attached without
 * replacing the legacy BPHS-style strength3 total or claiming certification.
 */
import assert from 'node:assert/strict';
import {full} from '../public/horoscope/offline/offline-engine.mjs';

const births=[
 ['1971-05-04','05:05'],
 ['1974-01-11','16:04'],
 ['1992-07-31','22:05'],
 ['1994-06-15','13:03'],
 ['2015-09-06','09:30']
];
const names=['சூரியன்','சந்திரன்','செவ்வாய்','புதன்','குரு','சுக்கிரன்','சனி'];
let checks=0,pairs=0;
const ok=(v,label)=>{assert.ok(v,label);checks++};
const eq=(a,b,label)=>{assert.deepEqual(a,b,label);checks++};
for(const [date,time] of births){
 const result=await full({date,time,lat:11.232,lon:78.88,
  utcOffsetMinutes:330,referenceDate:'2026-10-17',name:'source research'});
 ok(result?.ok===true,'chart generated '+date);
 const planets=result.chart?.planets;
 ok(Array.isArray(planets),'chart planet array '+date);
 for(const name of names){
  const p=planets.find(x=>x.name===name);
  ok(Boolean(p),'planet exists '+name+' '+date);
  const r=p.strengthJathakaKanitham;
  ok(r?.available===true,'Rajan partial calculator attached '+name+' '+date);
  eq(r.classicalCertified,false,'no false certification '+name+' '+date);
  eq(r.total,null,'no final total until Cheshta/Drig verified '+name+' '+date);
  ok(Number.isFinite(r.sthana.total),'Sthana partial '+name+' '+date);
  ok(Number.isFinite(r.kala.total),'Kala partial '+name+' '+date);
  ok(Number.isFinite(r.ayana),'Ayana partial '+name+' '+date);
  ok(Number.isFinite(r.naisargika),'Naisargika partial '+name+' '+date);
  ok(Number.isFinite(r.dig),'Dig partial '+name+' '+date);
  eq(r.drig,null,'unverified source Drig never passed as final '+name+' '+date);
  ok(Number.isFinite(r.yuddha)||r.yuddha===null,
   'C.G. Rajan project Yuddha is numeric or explicitly unresolved '+name+' '+date);
  eq(r.yuddhaDetails?.policy,'SMV ASTRO fixed +10/-10/0 project rule',
   'UK eligibility/winner method maps to the declared project rule '+name+' '+date);
  eq(r.drigCandidate.certified,false,'BPHS angle candidate clearly unverified '+name+' '+date);
  eq(r.deathAgeOrDate,null,'no death-date output '+name+' '+date);
  ok(Number.isFinite(p.strength3?.totalVirupa),
   'legacy engine strength3 remains available separately '+name+' '+date);
  if(name==='சூரியன்')eq(r.cheshta,r.ayana,'Sun Cheshta follows book Ayana rule '+date);
  else if(name==='சந்திரன்')ok(Number.isFinite(r.cheshta),'Moon Cheshta follows book Paksha rule '+date);
  else eq(r.cheshta,null,'five-planet Cheshta is not invented '+name+' '+date);
  pairs++;
 }
 for(const name of ['ராகு','கேது']){
  const p=planets.find(x=>x.name===name);
  if(p)eq(p.strengthJathakaKanitham.available,false,'nodes excluded '+name+' '+date);
 }
}
eq(pairs,35,'five births times seven grahas');
console.log(JSON.stringify({pass:true,checks,birthCharts:births.length,planetPairs:pairs,
 legacyStrength3Preserved:true,rajanPartialAttached:true,fullRajanCertificate:false,
 blocked:['five-planet Cheshta','Rajan Drig angle generation','Mars D12 Saptavargaja','Dig rounding','full classical Shadbala certification']}));
