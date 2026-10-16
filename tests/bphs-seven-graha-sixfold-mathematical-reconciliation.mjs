// BPHS I Ch27 v14 exact Naisargika + all seven-graha six-Bala
// end-to-end mathematical reconciliation, five actual Perambalur births.
// This is a certificate for summation & natural constants ONLY.
// Other Shadbala inputs (true classical planetary places) are not certified.
import assert from 'node:assert/strict';
import {full} from '../public/horoscope/offline/offline-engine.mjs';
import {SHADBALA_NATURAL} from '../public/horoscope/offline/swiss_vedic.browser.mjs';
const ranks=Object.freeze([
 ['சூரியன்',7,390],['சந்திரன்',6,360],
 ['செவ்வாய்',2,300],['புதன்',3,420],
 ['குரு',4,390],['சுக்கிரன்',5,330],
 ['சனி',1,300]
]);
const births=[['1971-05-04','05:05'],['1974-01-11','16:04'],
 ['1992-07-31','22:05'],['1994-06-15','13:03'],
 ['2015-09-06','09:30']];
let assertions=0;let values=0;const outcomes=[];
const yes=(v,msg)=>{assert.ok(v,msg);assertions++};
const near=(a,b,eps,msg)=>{yes(Number.isFinite(a)&&Math.abs(a-b)<=eps,msg+' actual='+a+' expected='+b)};
for(const [name,rank] of ranks)near(SHADBALA_NATURAL[name],60*rank/7,1e-12,'BPHS book exact seven-rank natural '+name);
for(const [date,time] of births){
 const r=await full({date,time,lat:11.232,lon:78.88,utcOffsetMinutes:330,
   referenceDate:'2026-10-17',name:'BPHS mathematical certification'});
 yes(r.ok,'full natal chart generated '+date);
 const chart={date,time,planets:{}};
 for(const [name,rank,required] of ranks){
  const p=r.chart.planets.find(x=>x.name===name),s=p?.strength3;
  yes(s?.available===true,'seven graha Bala exists '+name);
  yes(s.classicalCertified===false&&s.provisional===true,'unverified astronomical model is not falsely certified');
  near(s.requiredVirupa,required,0,'BPHS required strength '+name);
  near(s.components.naisargika,Number((rank*60/7).toFixed(3)),1e-9,'exact natural shown to 3 decimal '+name);
  const c=s.components;
  const sum=c.sthana.total+c.dig+Object.entries(c.kala).filter(([k])=>k!=='total').reduce((a,[,v])=>a+v,0)+c.cheshta+c.naisargika+c.drik;
  near(sum,s.totalVirupa,0.007,'sixfold total (independent 9 Kala subparts) '+name+' '+date);
  const kalaSum=Object.entries(c.kala).filter(([k])=>k!=='total').reduce((a,[,v])=>a+v,0);
  near(kalaSum,c.kala.total,.005,'nine Kala component sum '+name+' '+date);
  near(s.totalRupa,Number((s.totalVirupa/60).toFixed(3)),.001,'Virupa/Rupa consistency '+name+' '+date);
  yes(Object.keys(c.sthana).length>=6,'five positional components and positional total '+date+' '+name);
  yes(c.cheshta>=0&&c.cheshta<=120,'Sun/Moon BPHS nonplanetary Cheshta bound '+date+' '+name);
  yes(Number.isFinite(c.drik),'Drig signed finite '+date+' '+name);
  values++;
  chart.planets[name]={sthana:c.sthana.total,dig:c.dig,kala:c.kala.total,
    cheshta:c.cheshta,naisargika:c.naisargika,drig:c.drik,
    totalVirupa:s.totalVirupa};
 }
 outcomes.push(chart);
}
yes(values===35,'exact 35 sixfold sums');
console.log(JSON.stringify({pass:true,assertions,verifiedSixBalaSummations:values,
 exactBookNaisargikaSevenGraha:true,bookChapter:'BPHS I Ch27 v14',
 mathematicalReconciliationPASS:true,historicalClassicalTrueLongitudeCertified:false,
 completeShadbalaCertified:false,charts:outcomes}));
