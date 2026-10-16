import assert from 'node:assert/strict';
import {computeClassicalFiveNatalCheshta as calculate}
  from '../public/horoscope/offline/saura-natal-five-cheshta.browser.mjs';
const births=Object.freeze([
 {date:'1971-05-04',time:'05:05',utcOffsetMinutes:330},
 {date:'1974-01-11',time:'16:04',utcOffsetMinutes:330},
 {date:'1992-07-31',time:'22:05',utcOffsetMinutes:330},
 {date:'1994-06-15',time:'13:03',utcOffsetMinutes:330},
 {date:'2015-09-06',time:'09:30',utcOffsetMinutes:330}
]);
let assertions=0;
const check=(v,label)=>{assert.ok(v,label);assertions++};
let planetCount=0;
const summary=[];
for(const birth of births){
  const r=calculate(birth);
  check(r.planets.length===5,birth.date+' all five grahas');
  check(r.calculationAvailable&&!r.productionIntegrationAllowed,
    birth.date+' distinguish running numerical engine from complete certification');
  check(!r.natalHistoricalNumericalCertified&&!r.shadbalaNumericallyCertified,
    birth.date+' no false complete certificate');
  const names=new Set(r.planets.map(x=>x.planet));
  check(names.size===5,birth.date+' unique planets');
  for(const p of r.planets){
    planetCount++;
    check([p.meanLongitude,p.trueLongitude,p.sheeghrocha,p.mandocca,
      p.cheshtaKendra,p.cheshtaVirupa].every(Number.isFinite),p.planet+' finite six inputs');
    check(p.cheshtaVirupa>=0&&p.cheshtaVirupa<=60,
      p.planet+' strict 0–60 Virupa');
    check(!p.certified&&p.model==='unmodified Surya Siddhanta',
      p.planet+' coherent classical model provenance');
    check(p.trueModelStages&&Number.isFinite(p.trueModelStages.fullMandaDegrees),
      p.planet+' four-stage internal evidence available');
  }
  const again=calculate(birth);
  check(JSON.stringify(r.planets)===JSON.stringify(again.planets),
    birth.date+' deterministic date-to-five-graha engine');
  const nextMinute=new Date((r.jdUt-2440587.5)*86400000+60000);
  const altered={date:birth.date,time:birth.time==='23:59'?'23:58':birth.time.slice(0,2)+':'+String((Number(birth.time.slice(3))+1)%60).padStart(2,'0'),
    utcOffsetMinutes:birth.utcOffsetMinutes};
  if(Number(birth.time.slice(3))!==59){
    const after=calculate(altered);
    check(after.planets.every((p,i)=>Math.abs(((p.trueLongitude-r.planets[i].trueLongitude+540)%360)-180)<0.15),
      birth.date+' minute resolution continuous');
  }
  summary.push({birth:birth.date+' '+birth.time,
    five: Object.fromEntries(r.planets.map(p=>[p.planet,Number(p.cheshtaVirupa.toFixed(4))])),
    eligible:false});
}
assert.equal(planetCount,25);assertions++;
for(const b of [
 {date:'2026-02-30',time:'12:00',utcOffsetMinutes:330},
 {date:'2026-04-05',time:'24:00',utcOffsetMinutes:330},
 {date:'2026-04-05',time:'12:60',utcOffsetMinutes:330},
 {date:'2026-04-05',time:'12:00',utcOffsetMinutes:841},
 {date:'2026-04-05',time:'12:00',utcOffsetMinutes:NaN},
 {date:'0001-01-01',time:'12:00',utcOffsetMinutes:330}
]){assert.throws(()=>calculate(b),RangeError);assertions++;}
console.log(JSON.stringify({pass:true,assertions,planetCount,engineReadyForResearch:true,
   historicalTrueLongitudeCertified:false,natalCheshtaCertified:false,
   completeSevenGrahaShadbalaCertified:false,birthResults:summary}));
