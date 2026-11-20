/**
 * 20,000 deterministic DOB/location Sripati Bhava audit.
 *
 * This is a focused house-engine audit, not a full 20,000-report/Advanced
 * Horoscope benchmark. It calculates native Swiss Ephemeris and local WASM
 * house cusps for 20,000 distinct UTC instants/locations, derives the actual
 * seven Graha + Rahu/Ketu longitudes through native Moshier, and verifies the
 * production Sripati boundary / Madhya / Antya / house-placement functions.
 *
 * Indian, worldwide and high-latitude samples are deterministic and repeatable.
 * Inputs are generated synthetic cases, not real-world birth records.
 * Rasi packing (two Bhava Madhyas in one Rasi and another empty Rasi) is
 * recorded, not automatically called an error: all twelve Bhavas must remain
 * present exactly once, and every Madhya must map to its own Rasi.
 */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import {getSwe} from '../public/horoscope/offline/wasm-provider.mjs';
import * as offlineSwiss from '../public/horoscope/offline/swiss_vedic.browser.mjs';
const require=createRequire(import.meta.url);
const swe=require('sweph');
const {calculateSwiss:unused,__test:nativeSwiss}=require('../swiss_vedic.js');
const offlineGeometry=offlineSwiss.__test;
const C=swe.constants;
const TOTAL=20000, INDIA_COUNT=10000, WORLD_COUNT=9000, HIGH_LAT_COUNT=1000;
const EPS=0.00002;
const norm=x=>((Number(x)%360)+360)%360;
const arc=(a,b)=>norm(b-a);
const angleDiff=(a,b)=>Math.min(arc(a,b),arc(b,a));
const close=(a,b,message,tolerance=EPS)=>{
  assert.ok(Number.isFinite(a)&&Number.isFinite(b)&&angleDiff(a,b)<=tolerance,
    message+': '+a+' vs '+b+' (delta '+angleDiff(a,b)+')');
};
const closeScalar=(a,b,message,tolerance=1e-8)=>{
  assert.ok(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=tolerance,
    message+': '+a+' vs '+b+' (absolute delta '+Math.abs(a-b)+')');
};
let state=0x5a17c0de;
function random(){
  state=(state+0x6D2B79F5)|0;
  let t=state;
  t=Math.imul(t^(t>>>15),t|1);
  t^=t+Math.imul(t^(t>>>7),t|61);
  return ((t^(t>>>14))>>>0)/4294967296;
}
const int=(min,max)=>min+Math.floor(random()*(max-min+1));
const float=(min,max)=>min+random()*(max-min);
function utcBirth(index){
  const year=int(1800,2399),month=int(1,12);
  const days=new Date(Date.UTC(year,month,0)).getUTCDate();
  const day=int(1,days),hour=int(0,23),minute=int(0,59),second=int(0,59);
  let zoneType,latitude,longitude,offset;
  if(index<INDIA_COUNT){
    zoneType='India';
    latitude=float(6.5,37.5);
    longitude=float(68.0,97.5);
    offset=330;
  }else if(index<INDIA_COUNT+WORLD_COUNT){
    zoneType='World';
    latitude=float(-65,65);
    longitude=float(-179.9,179.9);
    const offsets=[-720,-660,-600,-540,-480,-420,-360,-300,-240,-180,-120,-60,0,60,120,180,240,300,330,345,360,420,480,525,540,570,600,630,660,720,780,840];
    offset=offsets[int(0,offsets.length-1)];
  }else{
    zoneType='High-latitude';
    const abs=float(65.1,82.5);
    latitude=random()<0.5?-abs:abs;
    longitude=float(-179.9,179.9);
    offset=offsetsHighLatitude(longitude);
  }
  const localMs=Date.UTC(year,month-1,day,hour,minute,second);
  const utcMs=localMs-offset*60000;
  const d=new Date(utcMs);
  return {
    index:index+1,zoneType,year,month,day,hour,minute,second,offset,
    latitude,longitude,
    utcYear:d.getUTCFullYear(),utcMonth:d.getUTCMonth()+1,utcDay:d.getUTCDate(),
    utcHour:d.getUTCHours(),utcMinute:d.getUTCMinutes(),utcSecond:d.getUTCSeconds()
  };
}
function offsetsHighLatitude(longitude){
  return longitude>=-30&&longitude<45?0:(longitude< -30?-60:60);
}
function extractNativeCusps(result,label){
  if(!result||result.error||(result.flag!==undefined&&Number(result.flag)<0))
    throw new Error(label+' failed: '+(result?.error||result?.flag||'no result'));
  const raw=result.data?.houses??result.data?.cusps;
  let source=[];
  if(Array.isArray(raw))source=raw;
  else if(raw&&typeof raw==='object'){
    if(Array.isArray(raw.houses))source=raw.houses;
    else if(Array.isArray(raw.cusps))source=raw.cusps;
    else source=Array.from({length:13},(_,i)=>raw[i]??raw[String(i)]);
  }
  const oneBased=source.length>=13;
  const out=Array.from({length:12},(_,i)=>norm(Number(source[oneBased?i+1:i])));
  if(out.some(x=>!Number.isFinite(x)))throw new Error(label+' returned malformed cusps');
  return out;
}
function assertCuspRing(cusps,label){
  assert.equal(cusps.length,12,label+' has twelve cusps');
  const spans=cusps.map((c,i)=>arc(c,cusps[(i+1)%12]));
  assert.ok(spans.every(x=>Number.isFinite(x)&&x>1e-7&&x<180),label+' has twelve distinct forward-ordered cusp intervals: '+JSON.stringify(spans));
  const sum=spans.reduce((a,b)=>a+b,0);
  assert.ok(Math.abs(sum-360)<1e-7,label+' cusp intervals close one full 360-degree circle: '+sum);
  return spans;
}
const midpoint=(a,b)=>norm(a+arc(a,b)/2);
function validateGeometry(cusps,madhyaCusps,bhavas,label){
  const spans=assertCuspRing(cusps,label);
  assert.equal(madhyaCusps.length,12,label+' has twelve independently calculated Madhya cusps');
  assert.equal(bhavas.length,12,label+' returns twelve Bhava details');
  assert.deepEqual(bhavas.map(x=>Number(x.house)),Array.from({length:12},(_,i)=>i+1),label+' has houses I–XII exactly once');
  const counts=Array(12).fill(0),adjacent=[];
  for(let i=0;i<12;i++){
    const b=bhavas[i],next=cusps[(i+1)%12];
    close(Number(b.arambhaLongitude),cusps[i],label+' Bhava '+(i+1)+' Arambha is its Sripati boundary');
    close(Number(b.madhyaLongitude),madhyaCusps[i],label+' Bhava '+(i+1)+' Madhya is the corresponding Porphyry cusp');
    close(Number(b.antyaLongitude),next,label+' Bhava '+(i+1)+' Antya is the next Sripati boundary');
    const sign=Math.floor(norm(Number(b.madhyaLongitude))/30);
    assert.equal(Number(b.rasiIndex),sign,label+' Bhava '+(i+1)+' Rasi index matches its Madhya longitude');
    counts[sign]++;
    const offset=arc(cusps[i],Number(b.madhyaLongitude));
    assert.ok(offset>1e-8&&offset<spans[i]-1e-8,label+' Bhava '+(i+1)+' Porphyry Madhya is inside its Arambha–Antya interval');
    assert.equal((i+1),nativeSwiss.houseFromCusps(Number(b.madhyaLongitude),cusps),label+' Madhya lies within its own Bhava interval');
    assert.equal((i+1),offlineGeometry.houseFromCusps(Number(b.madhyaLongitude),cusps),label+' offline Madhya lies within its own Bhava interval');
    if(i>0&&Number(bhavas[i-1].rasiIndex)===sign)adjacent.push({firstHouse:i,secondHouse:i+1,sign:sign+1});
    const justInside=norm(cusps[i]+Math.min(0.001,spans[i]/1000));
    assert.equal(i+1,nativeSwiss.houseFromCusps(justInside,cusps),label+' immediately after Arambha belongs to Bhava '+(i+1));
    const justBefore=norm(next-Math.min(0.001,spans[i]/1000));
    assert.equal(i+1,nativeSwiss.houseFromCusps(justBefore,cusps),label+' immediately before Antya belongs to Bhava '+(i+1));
  }
  const emptySigns=counts.filter(x=>x===0).length;
  const duplicateSurplus=counts.reduce((sum,x)=>sum+Math.max(0,x-1),0);
  assert.equal(emptySigns,duplicateSurplus,label+' repeated Bhava-Madhya Rasis and empty Rasi boxes balance without losing a Bhava');
  return {
    counts,emptySigns,duplicateSurplus,
    repeatedSignGroups:counts.filter(x=>x>1).length,
    maxBhavasInOneRasi:Math.max(...counts),
    adjacentSameRasiPairs:adjacent
  };
}
function checkPlanetPositions(jdEt,cusps,label){
  const flags=C.SEFLG_MOSEPH|C.SEFLG_SIDEREAL|C.SEFLG_SPEED;
  const bodies=[
    ['Sun',C.SE_SUN],['Moon',C.SE_MOON],['Mars',C.SE_MARS],
    ['Mercury',C.SE_MERCURY],['Jupiter',C.SE_JUPITER],
    ['Venus',C.SE_VENUS],['Saturn',C.SE_SATURN],['Rahu',C.SE_MEAN_NODE]
  ];
  const positions=[];
  for(const [name,id] of bodies){
    const result=swe.calc(jdEt,id,flags);
    if(!result||result.error||(result.flag!==undefined&&Number(result.flag)<0)||
       !Array.isArray(result.data)||!Number.isFinite(Number(result.data[0])))
      throw new Error(label+' '+name+' Moshier position failed: '+(result?.error||result?.flag||'invalid'));
    const longitude=norm(Number(result.data[0]));
    const house=nativeSwiss.houseFromCusps(longitude,cusps);
    const offlineHouse=offlineGeometry.houseFromCusps(longitude,cusps);
    assert.ok(house>=1&&house<=12,label+' '+name+' receives a valid Bhava number');
    assert.equal(offlineHouse,house,label+' '+name+' receives identical native and offline Bhava number');
    positions.push({name,longitude,house});
  }
  const rahu=positions.find(x=>x.name==='Rahu');
  const ketuLongitude=norm(rahu.longitude+180);
  const ketuHouse=nativeSwiss.houseFromCusps(ketuLongitude,cusps);
  assert.equal(offlineGeometry.houseFromCusps(ketuLongitude,cusps),ketuHouse,label+' Ketu receives identical native and offline Bhava number');
  positions.push({name:'Ketu',longitude:ketuLongitude,house:ketuHouse});
  return positions;
}

swe.set_ephe_path(process.env.SWISSEPH_EPHE_PATH||'/sweph');
swe.set_sid_mode(C.SE_SIDM_LAHIRI,0,0);
const wasm=await getSwe();
wasm.setSiderealLahiri();
const summary={
  pass:true,totalCases:TOTAL,indiaCases:INDIA_COUNT,worldCases:WORLD_COUNT,
  highLatitudeCases:HIGH_LAT_COUNT,seed:'0x5a17c0de',
  dateYearRange:[1800,2399],coordinateCoverage:{indiaLatitude:[6.5,37.5],indiaLongitude:[68,97.5],worldLatitude:[-65,65],worldLongitude:[-179.9,179.9],highLatitudeAbs:[65.1,82.5]},
  checks:{nativeWasmSripatiCusps:0,nativeWasmPorphyryCusps:0,sripatiPorphyryMidpointOracle:0,
    bhavaDetailRows:0,planetBhavaAssignments:0,houseBoundaryChecks:0,fullCircleChecks:0},
  rasiPacking:{chartsWithRepeatedMadhyaRasi:0,chartsWithEmptyRasiBoxes:0,chartsWithAdjacentBhavasInSameRasi:0,
    repeatedSignGroups:0,emptySignBoxes:0,duplicateBhavaSurplus:0,maxBhavasInOneRasi:0,indiaRepeated:0,worldRepeated:0,highLatitudeRepeated:0,examples:[]},
  longitudeSamples:{},
  implementation:{native:'sweph 2.10.3-7 houses_ex2()',offline:'local Swiss Ephemeris WASM 2.10.03 houses()',houseSystem:'S / Sripati',boundaryOracle:'O / Porphyry',planetOracle:'native Moshier sidereal Lahiri'}
};
// Fixed real-input Golden Case supplied for the SMV ASTRO Bhava report.
// Perambalur local civil time (IST, UTC+05:30) is converted to UTC explicitly.
const PERAMBALUR_GOLDEN={
  date:'2026-11-20',time:'17:49',offsetMinutes:330,latitude:11.23,longitude:78.88,
  expectedMadhyaRasiIndices:[1,2,2,3,4,6,7,8,8,9,10,0]
};
const [goldenYear,goldenMonth,goldenDay]=PERAMBALUR_GOLDEN.date.split('-').map(Number);
const goldenLocalMs=Date.UTC(goldenYear,goldenMonth-1,goldenDay,17,49,0);
const goldenUtcDate=new Date(goldenLocalMs-PERAMBALUR_GOLDEN.offsetMinutes*60000);
const goldenUtcParts=[
  goldenUtcDate.getUTCFullYear(),goldenUtcDate.getUTCMonth()+1,goldenUtcDate.getUTCDate(),
  goldenUtcDate.getUTCHours(),goldenUtcDate.getUTCMinutes(),goldenUtcDate.getUTCSeconds()
];
const goldenNativeUtc=swe.utc_to_jd(...goldenUtcParts,C.SE_GREG_CAL);
if(!goldenNativeUtc||goldenNativeUtc.error||
   (goldenNativeUtc.flag!==undefined&&Number(goldenNativeUtc.flag)<0)||
   !Array.isArray(goldenNativeUtc.data))throw new Error('Perambalur Golden Case native UTC/JD failed');
const [goldenJdEt,goldenJdUt]=goldenNativeUtc.data;
const goldenWasmUtc=wasm.utcToJd(...goldenUtcParts);
closeScalar(goldenJdUt,goldenWasmUtc.ut,'Perambalur Golden Case native/offline UT',1e-8);
closeScalar(goldenJdEt,goldenWasmUtc.et,'Perambalur Golden Case native/offline ET',1e-8);
const goldenNativeS=extractNativeCusps(swe.houses_ex2(goldenJdUt,C.SEFLG_SIDEREAL,
  PERAMBALUR_GOLDEN.latitude,PERAMBALUR_GOLDEN.longitude,'S'),'Perambalur Golden Case native Sripati');
const goldenNativeO=extractNativeCusps(swe.houses_ex2(goldenJdUt,C.SEFLG_SIDEREAL,
  PERAMBALUR_GOLDEN.latitude,PERAMBALUR_GOLDEN.longitude,'O'),'Perambalur Golden Case native Porphyry');
const goldenWasmS=wasm.houses(goldenWasmUtc.ut,PERAMBALUR_GOLDEN.latitude,PERAMBALUR_GOLDEN.longitude,'S').cusps.map(norm);
const goldenWasmO=wasm.houses(goldenWasmUtc.ut,PERAMBALUR_GOLDEN.latitude,PERAMBALUR_GOLDEN.longitude,'O').cusps.map(norm);
assertCuspRing(goldenNativeS,'Perambalur Golden Case native Sripati');
assertCuspRing(goldenNativeO,'Perambalur Golden Case native Porphyry');
assertCuspRing(goldenWasmS,'Perambalur Golden Case offline Sripati');
assertCuspRing(goldenWasmO,'Perambalur Golden Case offline Porphyry');
for(let h=0;h<12;h++){
  close(goldenNativeS[h],goldenWasmS[h],'Perambalur Golden Case Sripati native/offline cusp '+(h+1),1e-5);
  close(goldenNativeO[h],goldenWasmO[h],'Perambalur Golden Case Porphyry native/offline cusp '+(h+1),1e-5);
  close(goldenNativeS[h],midpoint(goldenNativeO[(h+11)%12],goldenNativeO[h]),
    'Perambalur Golden Case independent Sripati/Porphyry midpoint '+(h+1),1e-5);
}
const goldenBhavas=nativeSwiss.bhavaDetails(goldenNativeS,goldenNativeO);
const goldenOfflineBhavas=offlineGeometry.bhavaDetails(goldenWasmS,goldenWasmO);
validateGeometry(goldenNativeS,goldenNativeO,goldenBhavas,'Perambalur Golden Case native');
validateGeometry(goldenWasmS,goldenWasmO,goldenOfflineBhavas,'Perambalur Golden Case offline');
assert.deepEqual(goldenBhavas.map(b=>b.rasiIndex),PERAMBALUR_GOLDEN.expectedMadhyaRasiIndices,
  'Perambalur Golden Case Bhava I–XII must retain the independently expected Sphuta Rasi mapping');
for(let h=0;h<12;h++){
  close(goldenBhavas[h].arambhaLongitude,goldenOfflineBhavas[h].arambhaLongitude,'Perambalur Golden Case Bhava '+(h+1)+' Arambha native/offline');
  close(goldenBhavas[h].madhyaLongitude,goldenOfflineBhavas[h].madhyaLongitude,'Perambalur Golden Case Bhava '+(h+1)+' Madhya native/offline');
  close(goldenBhavas[h].antyaLongitude,goldenOfflineBhavas[h].antyaLongitude,'Perambalur Golden Case Bhava '+(h+1)+' Antya native/offline');
}
const goldenPlanets=checkPlanetPositions(goldenJdEt,goldenNativeS,'Perambalur Golden Case');
summary.goldenCase={
  pass:true,input:{...PERAMBALUR_GOLDEN,timezone:'Asia/Kolkata'},
  utc:{date:goldenUtcParts.slice(0,3).join('-'),time:goldenUtcParts.slice(3).map(x=>String(x).padStart(2,'0')).join(':')},
  julianDayUT:Number(goldenJdUt.toFixed(8)),julianDayET:Number(goldenJdEt.toFixed(8)),
  nativeSripatiCusps:goldenNativeS,offlineSripatiCusps:goldenWasmS,
  nativePorphyryMadhyaCusps:goldenNativeO,offlinePorphyryMadhyaCusps:goldenWasmO,
  bhavas:goldenBhavas.map(b=>({...b})),
  planets:goldenPlanets
};
const started=Date.now();
for(let i=0;i<TOTAL;i++){
  const birth=utcBirth(i);
  const nativeUtc=swe.utc_to_jd(birth.utcYear,birth.utcMonth,birth.utcDay,birth.utcHour,birth.utcMinute,birth.utcSecond,C.SE_GREG_CAL);
  if(!nativeUtc||nativeUtc.error||(nativeUtc.flag!==undefined&&Number(nativeUtc.flag)<0)||!Array.isArray(nativeUtc.data))
    throw new Error('Case '+birth.index+' UTC-to-JD failed: '+(nativeUtc?.error||nativeUtc?.flag||'invalid'));
  const [jdEt,jdUt]=nativeUtc.data;
  const wasmUtc=wasm.utcToJd(birth.utcYear,birth.utcMonth,birth.utcDay,birth.utcHour,birth.utcMinute,birth.utcSecond);
  assert.ok(Number.isFinite(jdEt)&&Number.isFinite(jdUt)&&Number.isFinite(wasmUtc.et)&&Number.isFinite(wasmUtc.ut),'Case '+birth.index+' has valid UT/ET Julian days');
  closeScalar(jdUt,wasmUtc.ut,'Case '+birth.index+' native/WASM UT Julian day',1e-8);
  closeScalar(jdEt,wasmUtc.et,'Case '+birth.index+' native/WASM ET Julian day',1e-8);

  const nativeS=extractNativeCusps(swe.houses_ex2(jdUt,C.SEFLG_SIDEREAL,birth.latitude,birth.longitude,'S'),'case '+birth.index+' native Sripati');
  const nativeO=extractNativeCusps(swe.houses_ex2(jdUt,C.SEFLG_SIDEREAL,birth.latitude,birth.longitude,'O'),'case '+birth.index+' native Porphyry');
  const wasmS=wasm.houses(wasmUtc.ut,birth.latitude,birth.longitude,'S').cusps.map(norm);
  const wasmO=wasm.houses(wasmUtc.ut,birth.latitude,birth.longitude,'O').cusps.map(norm);
  assertCuspRing(nativeS,'case '+birth.index+' native Sripati');
  assertCuspRing(nativeO,'case '+birth.index+' native Porphyry');
  assertCuspRing(wasmS,'case '+birth.index+' offline Sripati');
  assertCuspRing(wasmO,'case '+birth.index+' offline Porphyry');
  for(let h=0;h<12;h++){
    close(nativeS[h],wasmS[h],'case '+birth.index+' Sripati cusp '+(h+1)+' native/WASM',1e-5);
    close(nativeO[h],wasmO[h],'case '+birth.index+' Porphyry cusp '+(h+1)+' native/WASM',1e-5);
    close(nativeS[h],midpoint(nativeO[(h+11)%12],nativeO[h]),
      'case '+birth.index+' Sripati cusp '+(h+1)+' independent Porphyry-midpoint oracle',1e-5);
    summary.checks.sripatiPorphyryMidpointOracle++;
  }
  summary.checks.nativeWasmSripatiCusps+=12;
  summary.checks.nativeWasmPorphyryCusps+=12;
  summary.checks.fullCircleChecks+=4;

  const bhavas=nativeSwiss.bhavaDetails(nativeS,nativeO);
  const offlineBhavas=offlineGeometry.bhavaDetails(wasmS,wasmO);
  const packed=validateGeometry(nativeS,nativeO,bhavas,'case '+birth.index+' native');
  validateGeometry(wasmS,wasmO,offlineBhavas,'case '+birth.index+' offline');
  assert.equal(bhavas.length,offlineBhavas.length,'case '+birth.index+' native/offline Bhava row count');
  for(let h=0;h<12;h++){
    close(bhavas[h].arambhaLongitude,offlineBhavas[h].arambhaLongitude,'case '+birth.index+' Bhava '+(h+1)+' Arambha parity');
    close(bhavas[h].madhyaLongitude,offlineBhavas[h].madhyaLongitude,'case '+birth.index+' Bhava '+(h+1)+' Madhya parity');
    close(bhavas[h].antyaLongitude,offlineBhavas[h].antyaLongitude,'case '+birth.index+' Bhava '+(h+1)+' Antya parity');
    assert.equal(bhavas[h].rasiIndex,offlineBhavas[h].rasiIndex,'case '+birth.index+' Bhava '+(h+1)+' Rasi parity');
  }
  summary.checks.bhavaDetailRows+=24;
  summary.checks.houseBoundaryChecks+=24;

  const planets=checkPlanetPositions(jdEt,nativeS,'case '+birth.index);
  summary.checks.planetBhavaAssignments+=planets.length;
  const duplicate=packed.repeatedSignGroups>0;
  if(duplicate)summary.rasiPacking.chartsWithRepeatedMadhyaRasi++;
  if(packed.emptySigns>0)summary.rasiPacking.chartsWithEmptyRasiBoxes++;
  if(packed.adjacentSameRasiPairs.length)summary.rasiPacking.chartsWithAdjacentBhavasInSameRasi++;
  summary.rasiPacking.repeatedSignGroups+=packed.repeatedSignGroups;
  summary.rasiPacking.emptySignBoxes+=packed.emptySigns;
  summary.rasiPacking.duplicateBhavaSurplus+=packed.duplicateSurplus;
  summary.rasiPacking.maxBhavasInOneRasi=Math.max(summary.rasiPacking.maxBhavasInOneRasi,packed.maxBhavasInOneRasi);
  for(const p of planets)summary.longitudeSamples[p.name]=(summary.longitudeSamples[p.name]||0)+1;
  if(packed.adjacentSameRasiPairs.length&&summary.rasiPacking.examples.length<12){
    summary.rasiPacking.examples.push({
      case:birth.index,zoneType:birth.zoneType,
      birth:{date:birth.year+'-'+String(birth.month).padStart(2,'0')+'-'+String(birth.day).padStart(2,'0'),
        time:String(birth.hour).padStart(2,'0')+':'+String(birth.minute).padStart(2,'0'),
        offsetMinutes:birth.offset,latitude:Number(birth.latitude.toFixed(5)),longitude:Number(birth.longitude.toFixed(5))},
      adjacentSameRasiPairs:packed.adjacentSameRasiPairs,
      emptyRasiNumbers:packed.counts.map((n,index)=>n===0?index+1:null).filter(Boolean),
      bhavas:bhavas.map(b=>({house:b.house,rasiIndex:b.rasiIndex+1,arambha:b.arambhaLongitude,madhya:b.madhyaLongitude,antya:b.antyaLongitude}))
    });
  }
  if(birth.zoneType==='India')summary.rasiPacking.indiaRepeated+=duplicate?1:0;
  if(birth.zoneType==='World')summary.rasiPacking.worldRepeated=(summary.rasiPacking.worldRepeated||0)+(duplicate?1:0);
  if(birth.zoneType==='High-latitude')summary.rasiPacking.highLatitudeRepeated=(summary.rasiPacking.highLatitudeRepeated||0)+(duplicate?1:0);
}
summary.elapsedMilliseconds=Date.now()-started;
summary.rasiPacking.interpretation=
  'A repeated Bhava Madhya Rasi and an empty Rasi cell are not by themselves a calculation failure. They are accepted only when all 12 Bhavas remain present exactly once, each planet has exactly one valid house, every Madhya is inside its own Arambha–Antya interval, and repeated-sign surplus equals empty-sign count.';
mkdirSync('artifacts',{recursive:true});
writeFileSync('artifacts/sripati-bhava-20k-audit.json',JSON.stringify(summary,null,2));
console.log(JSON.stringify(summary,null,2));
