/**
 * Deterministic 20,000-chart Sripati validation.
 * 20,000 offline-WASM charts span India and global coordinates (1800–2399).
 * 200 distributed records are also checked through the native sweph backend.
 * Same-sign Bhava Madhyas are measured, not prohibited: they can be geometrically valid.
 */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {calculateSwiss as calculateOffline} from '../public/horoscope/offline/swiss_vedic.browser.mjs';
import {getSwe} from '../public/horoscope/offline/wasm-provider.mjs';

const require=createRequire(import.meta.url);
const native=require('../swiss_vedic.js');
const nativeSwe=require('sweph');
const C=nativeSwe.constants;
const offlineSwe=await getSwe();
offlineSwe.setSiderealLahiri();
nativeSwe.set_sid_mode(C.SE_SIDM_LAHIRI,0,0);

const TOTAL=20000, INDIA=10000, NATIVE_SAMPLES=200, SEED=0x5a17b4a1;
let state=SEED>>>0;
const rnd=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/0x100000000;};
const between=(a,b)=>a+rnd()*(b-a);
const wrap=x=>((x%360)+360)%360;
const distance=(a,b)=>{const d=wrap(a-b);return Math.min(d,360-d);};
function close(a,b,tolerance,label){
 assert.ok(Number.isFinite(Number(a)),label+': actual is not finite');
 assert.ok(distance(Number(a),Number(b))<=tolerance,
  label+': actual='+a+' expected='+b+' delta='+distance(Number(a),Number(b)));
}
function readNativeCusps(result,label){
 assert.ok(result&&!result.error&&!(Number(result.flag)<0),label+': Swiss house calculation failed');
 const raw=result.data?.houses||result.data?.cusps||[];
 let values=[];
 if(Array.isArray(raw))values=raw;
 else if(raw&&typeof raw==='object'){
  if(Array.isArray(raw.houses))values=raw.houses;
  else if(Array.isArray(raw.cusps))values=raw.cusps;
  else values=Array.from({length:13},(_,i)=>raw[i]??raw[String(i)]);
 }
 const oneBased=values.length>=13;
 const cusps=Array.from({length:12},(_,i)=>wrap(Number(values[oneBased?i+1:i])));
 assert.ok(cusps.every(Number.isFinite),label+': twelve finite cusps required');
 return cusps;
}
function expectedHouse(longitude,cusps){
 const x=wrap(longitude);
 for(let i=0;i<12;i++){
  const start=wrap(cusps[i]),span=wrap(cusps[(i+1)%12]-start);
  assert.ok(span>1e-9,'house '+(i+1)+' has positive width');
  if(wrap(x-start)<span)return i+1;
 }
 return 12;
}
function birthAt(index){
 const from=Date.UTC(1800,0,1),to=Date.UTC(2400,0,1);
 const date=new Date(from+Math.floor(rnd()*(to-from))).toISOString().slice(0,10);
 const minute=Math.floor(rnd()*1440);
 const time=String(Math.floor(minute/60)).padStart(2,'0')+':'+String(minute%60).padStart(2,'0');
 if(index<INDIA)return {date,time,lat:Number(between(8,37.5).toFixed(6)),lon:Number(between(68,97.5).toFixed(6)),timezone:'Asia/Kolkata',utcOffsetMinutes:330,region:'India'};
 const offsets=[-720,-660,-600,-570,-540,-480,-420,-360,-300,-240,-210,-180,-120,-60,0,60,120,180,210,240,300,330,345,360,420,480,525,540,570,600,630,660,720,765,780,840];
 return {date,time,lat:Number(between(-75,75).toFixed(6)),lon:Number(between(-180,180).toFixed(6)),timezone:'UTC',utcOffsetMinutes:offsets[Math.floor(rnd()*offsets.length)],region:'Global'};
}
const stats={seed:SEED,total:TOTAL,india:INDIA,global:TOTAL-INDIA,nativeParityCharts:0,
 repeatedMadhyaSignCharts:0,emptyMadhyaSignCharts:0,examples:[],dateRange:'1800-01-01..2399-12-31'};
function verify(chart,birth,index,S,O){
 assert.ok(chart?.ok===true,'chart '+index+' failed');
 assert.ok(Array.isArray(chart.bhavas)&&chart.bhavas.length===12,'chart '+index+' must contain twelve Bhavas');
 assert.ok(Array.isArray(chart.planets)&&chart.planets.length===9,'chart '+index+' must contain nine planet points');
 let total=0;
 for(let h=0;h<12;h++){
  const b=chart.bhavas[h],next=(h+1)%12;
  assert.equal(Number(b.house),h+1,'house sequence '+index);
  close(b.arambhaLongitude,S[h],0.000002,'Arambha '+index+'/'+(h+1));
  close(b.longitude,S[h],0.000002,'legacy longitude remains Arambha '+index+'/'+(h+1));
  close(b.madhyaLongitude,O[h],0.000002,'Madhya equals Porphyry cusp '+index+'/'+(h+1));
  close(b.antyaLongitude,S[next],0.000002,'Antya equals next Sripati boundary '+index+'/'+(h+1));
  assert.equal(Number(b.rasiIndex),Math.floor(wrap(O[h])/30),'Madhya Rasi '+index+'/'+(h+1));
  assert.equal(Number(b.rasiIndex),Math.floor(wrap(Number(b.madhyaLongitude))/30),'Madhya sign metadata '+index+'/'+(h+1));
  const span=wrap(S[next]-S[h]),offset=wrap(O[h]-S[h]);
  assert.ok(span>0.000001,'positive Bhava width '+index+'/'+(h+1));
  assert.ok(offset>0.000001&&offset<span-0.000001,'Porphyry Madhya inside Sripati Arambha/Antya '+index+'/'+(h+1));
  total+=span;
 }
 assert.ok(Math.abs(total-360)<0.0001,'twelve Sripati houses cover 360 degrees '+index);
 for(const p of chart.planets)assert.equal(Number(p.bhava),expectedHouse(p.longitude,S),'planet house by Sripati boundaries '+index+'/'+p.name);
 const counts=Array(12).fill(0);
 for(const b of chart.bhavas)counts[Number(b.rasiIndex)]++;
 const repeats=counts.filter(x=>x>1).length,empties=counts.filter(x=>x===0).length;
 if(repeats)stats.repeatedMadhyaSignCharts++;
 if(empties)stats.emptyMadhyaSignCharts++;
 if((repeats||empties)&&stats.examples.length<12)stats.examples.push({
  index,region:birth.region,date:birth.date,time:birth.time,lat:birth.lat,lon:birth.lon,
  repeated:counts.map((count,sign)=>({sign:sign+1,count})).filter(x=>x.count>1),
  empty:counts.map((count,sign)=>({sign:sign+1,count})).filter(x=>x.count===0)
 });
}

const started=performance.now();
const sampleEvery=Math.floor(TOTAL/NATIVE_SAMPLES);
for(let index=0;index<TOTAL;index++){
 const birth=birthAt(index);
 const input={date:birth.date,time:birth.time,lat:birth.lat,lon:birth.lon,timezone:birth.timezone,utcOffsetMinutes:birth.utcOffsetMinutes,houseSystem:'S'};
 const chart=await calculateOffline(input);
 const jd=Number(chart?.birth?.utc_jd);
 assert.ok(Number.isFinite(jd),'chart '+index+' UTC Julian day');
 const rawS=offlineSwe.houses(jd,birth.lat,birth.lon,'S');
 const rawO=offlineSwe.houses(jd,birth.lat,birth.lon,'O');
 assert.equal(rawS?.cusps?.length,12,'independent offline Sripati oracle '+index);
 assert.equal(rawO?.cusps?.length,12,'independent offline Porphyry oracle '+index);
 const S=rawS.cusps.map(wrap),O=rawO.cusps.map(wrap);
 verify(chart,birth,index,S,O,stats);

 if(index%sampleEvery===0&&stats.nativeParityCharts<NATIVE_SAMPLES){
  const n=native.calculateSwiss(input);
  assert.ok(n?.ok===true,'native chart '+index+' computes');
  const nS=readNativeCusps(nativeSwe.houses_ex2(jd,C.SEFLG_SIDEREAL,birth.lat,birth.lon,'S'),'native Sripati');
  const nO=readNativeCusps(nativeSwe.houses_ex2(jd,C.SEFLG_SIDEREAL,birth.lat,birth.lon,'O'),'native Porphyry');
  for(let h=0;h<12;h++){
   close(n.bhavas[h].arambhaLongitude,nS[h],0.000002,'native Arambha parity '+index+'/'+(h+1));
   close(n.bhavas[h].madhyaLongitude,nO[h],0.000002,'native Madhya parity '+index+'/'+(h+1));
   close(n.bhavas[h].antyaLongitude,nS[(h+1)%12],0.000002,'native Antya parity '+index+'/'+(h+1));
   close(n.bhavas[h].madhyaLongitude,chart.bhavas[h].madhyaLongitude,0.00002,'native/offline parity '+index+'/'+(h+1));
  }
  stats.nativeParityCharts++;
 }
 if((index+1)%500===0)console.log(JSON.stringify({progress:index+1,total:TOTAL,elapsedSeconds:Number(((performance.now()-started)/1000).toFixed(1))}));
}
assert.equal(stats.nativeParityCharts,NATIVE_SAMPLES,'200 native backend charts verified');
stats.elapsedSeconds=Number(((performance.now()-started)/1000).toFixed(2));
stats.pass=true;
stats.offlineOracle='Swiss Ephemeris WASM: S=Sripati Arambha, O=Porphyry Bhava Madhya';
stats.nativeOracle='Native sweph houses_ex2(S/O), 200 distributed parity charts';
stats.note='Repeated Madhya Rasi signs are reported, not forcibly remapped; only independently verified cusp geometry determines correctness.';
writeFileSync('sripati-bhava-20000-report.json',JSON.stringify(stats,null,2));
console.log(JSON.stringify(stats,null,2));
