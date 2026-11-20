#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dataRoot=path.join(root,'public/horoscope/offline/naelos-data');
const server=createServer((req,res)=>{
  try{
    const url=new URL(req.url||'/', 'http://127.0.0.1');
    if(!url.pathname.startsWith('/naelos-data/')){res.writeHead(404).end('not found');return;}
    const relative=decodeURIComponent(url.pathname.slice('/naelos-data/'.length));
    const filename=path.resolve(dataRoot,relative);
    if(filename!==dataRoot&&!filename.startsWith(dataRoot+path.sep)){res.writeHead(403).end('forbidden');return;}
    if(!fs.existsSync(filename)||!fs.statSync(filename).isFile()){res.writeHead(404).end('not found');return;}
    res.setHeader('Content-Type',filename.endsWith('.json')?'application/json':'application/octet-stream');
    fs.createReadStream(filename).pipe(res);
  }catch(error){res.writeHead(500).end(String(error?.message||error));}
});
await new Promise((resolve,reject)=>{
  server.once('error',reject);
  server.listen(0,'127.0.0.1',resolve);
});
const address=server.address();
const baseUrl='http://127.0.0.1:'+address.port;
const originalFetch=globalThis.fetch.bind(globalThis);
globalThis.fetch=(resource,options)=>{
  const url=new URL(typeof resource==='string'?resource:
    (resource instanceof URL?resource.href:resource.url));
  if(url.protocol==='file:'){
    const pathname=decodeURIComponent(fileURLToPath(url));
    const marker=path.join('public','horoscope','offline','naelos-data')+path.sep;
    const index=pathname.lastIndexOf(marker);
    if(index<0)return Promise.reject(new Error('Unexpected local NAELOS data URL: '+url.href));
    const relative=pathname.slice(index+marker.length).split(path.sep).map(encodeURIComponent).join('/');
    return originalFetch(baseUrl+'/naelos-data/'+relative,options);
  }
  return originalFetch(resource,options);
};

try{
  const {calculateVedicChart}=await import('../public/horoscope/offline/server-wrapper.browser.mjs');
  const chart=await calculateVedicChart({
    name:'TRUE BPHS integration QA',
    date:'1992-06-17',time:'10:30',
    lat:11.232,lon:78.880,
    timezone:'Asia/Kolkata',timeZone:'Asia/Kolkata',utcOffsetMinutes:330
  });
  const frame='NAELOS_TRUE_ECLIPTIC_OF_DATE_EFFECTIVE_LAHIRI_V1';
  const seven=['சூரியன்','சந்திரன்','செவ்வாய்','புதன்','குரு','சுக்கிரன்','சனி'];
  assert.equal(chart.engine,'NAELOS Ephemeris 0.1.3 / NASA-JPL DE440');
  assert.equal(chart.referenceFrameId,frame);
  assert.equal(chart.classicalCertified,false);
  assert.equal(chart.naelosValidation?.tableIntegrityVerified,true);
  assert.equal(chart.naelosValidation?.referenceFrameId,frame);
  assert.equal(chart.planets.length,9);
  assert.equal(chart.bhavas.length,12);
  assert.equal(chart.lagna?.referenceFrameId,frame);
  assert.equal(chart.swissValidation,undefined,'the former Swiss validation label is not left on a NAELOS chart');
  assert.equal(chart.navamsa?.planets?.length,10);
  assert.ok(Array.isArray(chart.dashas?.periods)&&chart.dashas.periods.length>0);
  for(const bhava of chart.bhavas){
    assert.equal(bhava.referenceFrameId,frame);
    assert.ok(Number.isFinite(bhava.arambhaLongitude));
    assert.ok(Number.isFinite(bhava.madhyaLongitude));
  }
  for(const planet of chart.planets){
    assert.equal(planet.referenceFrameId,frame,planet.name+' Effective Lahiri frame');
    assert.ok(Number.isFinite(planet.longitude),planet.name+' finite longitude');
    assert.ok(Number.isFinite(planet.speed),planet.name+' finite speed');
  }
  const byName=new Map(chart.planets.map(p=>[p.name,p]));
  const sun=byName.get('சூரியன்'),moon=byName.get('சந்திரன்');
  for(const name of seven){
    const planet=byName.get(name);
    assert.ok(planet?.strength6?.available===true,name+' BPHS six-Bala output');
    assert.equal(planet.strength6.method,'TRUE_BPHS_SHADBALA_NAELOS_DE440',name+' Shadbala engine');
    assert.equal(planet.strength6.classicalCertified,false,name+' stays uncertified');
    assert.equal(planet.strength6.referenceFrameId,frame,name+' Shadbala frame');
    const c=planet.strength6.components;
    for(const field of ['sthana','dig','kala','cheshta','naisargika','drik']){
      const value=field==='sthana'||field==='kala'?c[field]?.total:c[field];
      assert.ok(Number.isFinite(value),name+' finite '+field+' Bala');
    }
    const phala=planet.strength6.ishtaKashta;
    assert.equal(phala?.available,true,name+' BPHS Chapter 28 Phala');
    assert.equal(phala.method,'TRUE_BPHS_CH28_RASMI_ISHTA_KASHTA',name+' Chapter 28 formula');
    assert.equal(phala.referenceFrameId,frame,name+' Ishta/Kashta frame');
    assert.ok(Math.abs(phala.ishtaPhala+phala.kashtaPhala-60)<=0.002,name+' Ishta+Kashta=60');
    assert.ok(Math.abs(phala.ishtaPhala-(phala.uchchaBala+phala.cheshtaForPhala)/2)<=0.002,name+' verse 6 mean formula');
  }
  assert.equal(sun.strength6.ishtaKashta.cheshtaForPhala,30,'Sun Ch28 separate 90-degree rule');
  const elongation=((moon.longitude-sun.longitude)%360+360)%360;
  assert.ok(Math.abs(moon.strength6.ishtaKashta.cheshtaForPhala-Math.min(elongation,360-elongation)/3)<=0.002,
    'Moon Ch28 Moon-minus-Sun Cheshta Kendra');
  for(const name of ['செவ்வாய்','புதன்','குரு','சுக்கிரன்','சனி']){
    const p=byName.get(name);
    assert.ok(Math.abs(p.strength6.ishtaKashta.cheshtaForPhala-p.strength6.components.cheshta)<=0.002,
      name+' BPHS Chapter 27 Cheshta is the Chapter 28 input');
  }
  for(const name of ['ராகு','கேது']){
    assert.equal(byName.get(name).strength6.available,false,name+' excluded from seven-graha BPHS Shadbala');
  }
  console.log(JSON.stringify({
    pass:true,
    engine:chart.engine,
    frame:chart.referenceFrameId,
    natalDate:chart.birthDate,
    grahas:seven.length,
    planetaryRows:chart.planets.length,
    sripatiCusps:chart.bhavas.length,
    shadbala:'7 x 6 BPHS Bala components',
    ishtaKashta:'BPHS Chapter 28 Rasmi; Sun, Moon and five-planet rules verified',
    tableIntegrityVerified:chart.naelosValidation.tableIntegrityVerified,
    classicalCertified:false
  },null,2));
}finally{
  globalThis.fetch=originalFetch;
  await new Promise(resolve=>server.close(resolve));
}
