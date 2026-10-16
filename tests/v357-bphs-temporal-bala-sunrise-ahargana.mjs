// BPHS I (R. Santhanam) Chapter 27 pp. 267-272, 277, 284.
// Independently verify Ahargana year/month/day and astronomical-day
// Hora/Tribhaga component selection (solar rise/set still approximate).
import assert from 'node:assert/strict';
import {traditionalAharganaLords,kalaDayFromSunrise,ayanaBala} from '../public/horoscope/offline/swiss_vedic.browser.mjs';
import {full} from '../public/horoscope/offline/offline-engine.mjs';
const BOOK=['சூரியன்','சந்திரன்','செவ்வாய்','புதன்','குரு','சுக்கிரன்','சனி'];
let checks=0;const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++};
const ok=(a,m)=>{assert.ok(a,m);checks++};
const a=traditionalAharganaLords('1984-06-01');
eq(a.ahargana,65295,'BPHS 1984 Jun 1 printed ahargana 65295');
eq(a.abdaLord,'குரு','BPHS June 1 1984 Varsha lord Jupiter (Thursday)');
eq(a.masaLord,'சுக்கிரன்','BPHS June 1 1984 Masa lord Venus (Friday)');
eq(a.dinaLord,'சுக்கிரன்','BPHS June 1 1984 weekday lord Venus (Friday)');
for(const date of ['1971-05-04','1974-01-11','1992-07-31','1994-06-15','2015-09-06']){
 const ah=traditionalAharganaLords(date);
 const dow=new Date(date+'T00:00:00Z').getUTCDay();
 eq(ah.dinaLord,BOOK[dow],date+' Ahargana weekday matches historical calendar');
}
ok(ayanaBala(0,'சூரியன்')===60,'Sun Ayana at zero declination = 60 after Ch27 doubling');
ok(ayanaBala(0,'சந்திரன்')===30,'Moon Ayana at zero declination = 30');
ok(ayanaBala(23+27/60,'சூரியன்')===120,'Sun at positive 23:27 declination max 120');
ok(ayanaBala(-23-27/60,'சூரியன்')===0,'Sun at negative extreme min zero');
ok(ayanaBala(0,'புதன்')===30,'Mercury zero declination 30');
const samples=[];
for(const [date,time] of [['1994-06-15','13:03'],['2015-09-06','09:30'],['1992-07-31','22:05'],['1971-05-04','05:05'],['1974-01-11','16:04']]){
 const r=await full({date,time,lat:11.232,lon:78.88,utcOffsetMinutes:330,referenceDate:'2026-10-16',name:'V357 Total Bala audit'});
 ok(r.ok,'calculated natal chart '+date);
 const tc=kalaDayFromSunrise(date,time,11.232,78.88,330);
 ok(tc.sunriseApprox===true,date+' sunrise approximation correctly disclosed');
 const expected=['abda','masa','vara','hora','tribhaga'];
 const owner={abda:tc.abdaLord,masa:tc.masaLord,vara:tc.dinaLord,hora:tc.horaLord,tribhaga:tc.tribhagaLord};
 const points={abda:15,masa:30,vara:45,hora:60,tribhaga:60};
 const bodies=r.chart.planets.filter(p=>BOOK.includes(p.name));
 eq(bodies.length,7,date+' seven classical planets');
 for(const p of bodies){
  const c=p.strength3;
  ok(c.available&&c.classicalCertified===false,date+' provisional label '+p.name);
  for(const k of expected)eq(c.components.kala[k], (owner[k]===p.name || (k==='tribhaga'&&p.name==='குரு'))?points[k]:0,
    date+' '+p.name+' '+k+' textbook temporal lord rule');
  if(p.name==='சூரியன்'){
   eq(c.requiredVirupa,390,date+' Sun BPHS minimum 390 not 300');
   eq(c.components.cheshta,c.components.kala.ayana,date+' Sun Cheshta=Ayana');
  }
  if(p.name==='சந்திரன்')
   eq(c.components.cheshta,c.components.kala.paksha,date+' Moon Cheshta=Paksha');
 }
 samples.push({date,sunriseMinutes:tc.sunriseMinutes,weekday:tc.dinaLord,abda:tc.abdaLord,masa:tc.masaLord,hora:tc.horaLord});
}
console.log(JSON.stringify({pass:true,assertions:checks,reference:'BPHS I Chapter27 Santhanam pp.267-272,277,284',sampleCharts:5,fullShadbalaCertified:false,limitations:['Sunrise is approximate','Yuddha=0','Drig/Cheshta remaining grahas lack full numeric textbook oracle'],samples}));
