// V357 — BPHS II Chs. 67-69, Santhanam, PDF pp. 381-390.
// Textbook numeric examples verified independently; output NOT wired live.
import assert from 'node:assert/strict';
import {full} from '../public/horoscope/offline/offline-engine.mjs';
import {trikonaShodhana,ekadhipatyaShodhana,pindaSadhana,classicalShodhana} from '../public/horoscope/offline/classical-shodhana.browser.mjs';
let assertions=0;const same=(a,b,msg)=>{assert.deepEqual(a,b,msg);assertions++};
const yes=(a,msg)=>{assert.ok(a,msg);assertions++};
// BPHS II Ch 67 example: four trine groups min-subtraction, from the
// Sun's Ashtakavarga illustration (Aries, Taurus, Gemini, Cancer...).
const sunRaw=[4,3,4,6,5,2,3,6,5,5,3,2];
const sunTrikona=[0,1,1,4,1,0,0,4,1,3,0,0];
same(trikonaShodhana(sunRaw).values,sunTrikona,'Ch.67 Sun minimum subtraction');
// Ch.68 worked imaginary example (Aries1 occupied, Scorpio3 empty;
// Taurus2 occupied, Libra1 empty; Gemini4/Virgo4 both empty;
// Capricorn2 occupied/Aquarius2 empty; Sag1/Pisces2 both empty).
const exampleTrikona=[1,2,4,0,0,4,1,3,1,2,2,2];
const occupied=[0,1,3,9];
same(ekadhipatyaShodhana(exampleTrikona,occupied).values,
 [1,2,0,0,0,0,0,2,0,2,0,1],
 'Ch.68 six Ekadhipatya reduction rules/example');
// Ch.69 worked Sun's example: Rasi Pinda 100 + Graha Pinda 48 = 148.
const grahaSigns={
 'சூரியன்':9,'சந்திரன்':2,'செவ்வாய்':1,'புதன்':10,
 'குரு':10,'சுக்கிரன்':10,'சனி':7,'ராகு':3,'கேது':5
};
const p=pindaSadhana(sunTrikona,grahaSigns);
same([p.rasiPinda,p.grahaPinda,p.yogaPinda],[100,48,148],'Ch.69 printed worked numeric oracle');
same(p.grahaProducts.reduce((s,x)=>s+x.product,0),48,'Nodes excluded from Graha Pinda');
same(p.signProducts.reduce((s,x)=>s+x,0),100,'Rasi multipliers from the BPHS table');
// The source input cannot be mutated by reductions.
same(sunRaw,[4,3,4,6,5,2,3,6,5,5,3,2],'No raw BAV mutation');
same(trikonaShodhana([0,1,4,4,4,5,0,7,1,2,4,7]).values.slice(0,12),
 [0,0,4,0,4,4,0,3,1,1,4,3],'Trine having zero stays unchanged; other groups subtract min');
// Numeric safeguards.
for(const f of [
 ()=>trikonaShodhana(Array(11).fill(1)),
 ()=>trikonaShodhana(Array(12).fill(-1)),
 ()=>ekadhipatyaShodhana(Array(12).fill(1),[12]),
 ()=>pindaSadhana(Array(12).fill(1),{'குரு':15})
]){
 let failed=false;try{f()}catch{failed=true}yes(failed,'Invalid Shodhana input rejected');
}
// Five agreed Perambalur charts: per-planet audits of all 7 BAV arrays,
// with nodes retained only for the occupied-sign reduction criterion.
const cases=[['1994-06-15','13:03'],['2015-09-06','09:30'],['1992-07-31','22:05'],['1971-05-04','05:05'],['1974-01-11','16:04']];
const summary=[];
for(const [date,time] of cases){
 const r=await full({date,time,lat:11.232,lon:78.88,utcOffsetMinutes:330,referenceDate:'2026-10-16',name:'V357 Shodhana'});
 yes(r.ok&&r.advanced.ashtakavarga.sarvaTotal===337,date+' base BAV/SAV validity');
 const classicalSigns=Object.fromEntries(r.chart.planets.map(p=>[p.name,Math.floor(p.longitude/30)]));
 const currentOccupied=[...new Set(Object.values(classicalSigns))];
 const rows=[];
 for(const each of r.advanced.ashtakavarga.bhinna){
  const out=classicalShodhana(each.bindus,currentOccupied,classicalSigns);
  yes(!out.certified,date+' experimental status explicit '+each.planet);
  yes(out.trikona.values.every((x,i)=>x>=0&&x<=each.bindus[i]),date+' Trikona nonincreasing '+each.planet);
  yes(out.ekadhipatya.values.every((x,i)=>x>=0&&x<=out.trikona.values[i]),date+' Ekadhipatya nonincreasing '+each.planet);
  yes(out.pinda.yogaPinda===out.pinda.rasiPinda+out.pinda.grahaPinda,date+' Pinda additivity '+each.planet);
  rows.push({planet:each.planet,trikona:out.trikona.values.reduce((a,b)=>a+b,0),ekadhipatya:out.ekadhipatya.values.reduce((a,b)=>a+b,0),yogaPinda:out.pinda.yogaPinda});
 }
 same(rows.length,7,date+' seven classical BAV rows checked');
 summary.push({date,rows});
}
console.log(JSON.stringify({pass:true,assertions,sampleCharts:5,scope:'BPHS II 67-69 structural reductions + two numerical worked examples; NOT interpretive certification',published:false,summary}));
