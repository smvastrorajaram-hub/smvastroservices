import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { full } from '../public/horoscope/offline/offline-engine.mjs';
const require=createRequire(import.meta.url);
const nodeSource=fs.readFileSync(new URL('../bv-raman-shadbala.cjs',import.meta.url),'utf8');
const browserSource=fs.readFileSync(new URL('../public/horoscope/offline/bv-raman-shadbala.browser.mjs',import.meta.url),'utf8');
const nodeEngine=require('../bv-raman-shadbala.cjs');
const names=['சூரியன்','சந்திரன்','செவ்வாய்','புதன்','குரு','சுக்கிரன்','சனி'];
let assertions=0;
const check=(condition,message)=>{assert.ok(condition,message);assertions++;};
function functionBody(source,start,end){
  const a=source.indexOf(start),b=source.indexOf(end,a);
  assert.ok(a>=0&&b>a,'required source function boundaries exist');
  return source.slice(a,b);
}
for(const [name,source] of [['Node',nodeSource],['Browser',browserSource]]){
  const body=functionBody(source,'function chestaBala(','function ramanDrishtiVirupa(');
  check(body.includes('BV_RAMAN_CHESHTA_BLOCKED_REFERENCE_FRAME_MISMATCH'),
    name+' engine has an explicit blocked mixed-frame result');
  check(!body.includes('planetRow?.longitude'),
    name+' production Cheshta never consumes Swiss chart true longitude as a classical input');
  check(!body.includes('sauraFivePlanetCheshtaInputs'),
    name+' production Cheshta does not assemble Saura mean with an unrelated true longitude');
  check(source.includes('same reference frame for mean, true and Sheeghrocccha'),
    name+' validates the frame identity of all three explicit source inputs');
  check(source.includes('sourceInputs.referenceFrames'),
    name+' requires provenance metadata for the mean/true/Sheeghrocccha triplet');
}
check(nodeEngine.BV_RAMAN_SHADBALA_SOURCE.productionCertification===false,
  'B.V. Raman full natal certification remains withheld');
const births=[
 ['1971-05-04','05:05'],['1974-01-11','16:04'],['1992-07-31','22:05'],
 ['1994-06-15','13:03'],['2015-09-06','09:30']
];
let checkedFiveGrahas=0;
for(const [date,time] of births){
  const result=await full({date,time,lat:11.232,lon:78.88,utcOffsetMinutes:330,
    referenceDate:'2026-10-17',name:'Cheshta mixed-frame production guard'});
  check(result.ok===true,date+' natal chart still calculates');
  const rows=result.chart.planets.filter(p=>names.includes(p.name));
  check(rows.length===7,date+' all seven graha rows remain present');
  for(const p of rows){
    const strength=p.strength6;
    check(strength?.classicalCertified===false,date+' '+p.name+' no false classical certificate');
    if(p.name==='சூரியன்'||p.name==='சந்திரன்'){
      check(strength.components.cheshta===0,date+' '+p.name+' retains Raman sixfold luminary rule');
      continue;
    }
    checkedFiveGrahas++;
    check(strength.components.cheshta===null,date+' '+p.name+' mixed-frame Cheshta number is withheld');
    check(strength.evidence.cheshtaSource.value===null&&strength.evidence.cheshtaSource.available===false,
      date+' '+p.name+' unavailable evidence is explicit');
    check(strength.evidence.cheshtaSource.sameReferenceFrameVerified===false,
      date+' '+p.name+' frame mismatch cannot be marked verified');
    check(strength.evidence.cheshtaSource.method==='BV_RAMAN_CHESHTA_BLOCKED_REFERENCE_FRAME_MISMATCH',
      date+' '+p.name+' blocked method is recorded');
    check(strength.frameSafety?.status==='BLOCKED_MIXED_REFERENCE_FRAMES'&&strength.frameSafety.productionUseAllowed===false,
      date+' '+p.name+' production frame gate is active');
    check(strength.totalVirupa===null&&strength.totalRupa===null,
      date+' '+p.name+' incomplete sixfold Shadbala total and Rupa stay withheld');
    check(strength.ishtaKashta?.available===false&&String(strength.ishtaKashta.reason||'').includes('mixed astronomical reference frames'),
      date+' '+p.name+' dependent Ishta/Kashta does not reuse blocked Cheshta');
  }
}
check(checkedFiveGrahas===25,'five historical charts x five non-luminary planets guarded');
console.log(JSON.stringify({
  pass:true,assertions,productionFrameGuard:true,natalCharts:births.length,
  guardedFiveGrahaRows:checkedFiveGrahas,mixedFrameNumericalCheshtaEmitted:false,
  dependentTotalsWithheld:true,SunMoonBVRamanRulePreserved:true,fullClassicalShadbalaCertified:false
}));
