import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const nodeRaman=require('../bv-raman-shadbala.cjs');
import {
  calculateBVRamanShadbala,
  BV_RAMAN_SHADBALA_SOURCE
} from '../public/horoscope/offline/bv-raman-shadbala.browser.mjs';
import { full } from '../public/horoscope/offline/offline-engine.mjs';

let checks=0;
const ok=(v,m)=>{assert.ok(v,m);checks++;};
const eq=(a,b,m)=>{assert.equal(a,b,m);checks++;};
const near=(a,b,e,m)=>{assert.ok(Number.isFinite(a)&&Math.abs(a-b)<=e,m+' actual='+a+' expected='+b);checks++;};
async function installLocalNaelosFetchBridge(){
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
 return async()=>{
  globalThis.fetch=originalFetch;
  await new Promise(resolve=>server.close(resolve));
 };
}

eq(BV_RAMAN_SHADBALA_SOURCE.method,'BV_RAMAN_INTEGRATED_SIX_BALA','source-specific engine identity');
eq(BV_RAMAN_SHADBALA_SOURCE.ishtaKashtaFormulaSeparate,true,'Ishta/Kashta formula remains distinct from sixfold Shadbala');
eq(BV_RAMAN_SHADBALA_SOURCE.ishtaKashtaAttachedToEachGraha,true,'integrated Ishta/Kashta is attached to each graha result');
eq(BV_RAMAN_SHADBALA_SOURCE.sixfoldSunMoonCheshtaVirupa,0,'Raman sixfold motional Cheshta excludes luminaries');
eq(BV_RAMAN_SHADBALA_SOURCE.productionCertification,false,'no false full classical certificate');

// B.V. Raman, Graha and Bhava Balas, 13th ed., standard horoscope (Chapters I/III/IV).
// Printed source longitudes and angular reference points are independent fixtures.
const standardPlanets=[
 {name:'சூரியன்',longitude:180+53/60+55/3600,bhava:9},
 {name:'சந்திரன்',longitude:311+17/60+19/3600,bhava:1},
 {name:'செவ்வாய்',longitude:229+30/60+34/3600,bhava:10},
 {name:'புதன்',longitude:181+31/60+34/3600,bhava:6},
 {name:'குரு',longitude:84+0/60+49/3600,bhava:9},
 {name:'சுக்கிரன்',longitude:171+9/60+56/3600,bhava:7},
 {name:'சனி',longitude:124+22/60+41/3600,bhava:11}
];
const jd=Date.UTC(1918,9,16,14,6,16)/86400000+2440587.5;
const planets=standardPlanets.map(p=>p.name);
// B.V. Raman, Graha and Bhava Balas, 13th ed., Ch. VI, Examples 49-51.
// These are transcribed from the printed Standard Horoscope table and are
// independent of the engine's astronomy path.
const standardChestaInputs={
 'செவ்வாய்':{meanLongitude:266.34,trueLongitude:229.50,sheeghroccaLongitude:181.23},
 'புதன்':{meanLongitude:181.23,trueLongitude:181.52,sheeghroccaLongitude:174.49},
 'குரு':{meanLongitude:66.91,trueLongitude:84.01,sheeghroccaLongitude:181.23},
 'சுக்கிரன்':{meanLongitude:181.23,trueLongitude:171.16,sheeghroccaLongitude:158.35},
 'சனி':{meanLongitude:111.23,trueLongitude:124.39,sheeghroccaLongitude:181.23}
};
const standard=calculateBVRamanShadbala({
 planets:standardPlanets,bhavas:[],
 ascendantLongitude:298+27/60,midheavenLongitude:216+30/60,
 apparentSolarHour:14.336,
 temporal:{abdaLord:'சனி',masaLord:'புதன்',dinaLord:'புதன்',horaLord:'சந்திரன்',tribhagaLord:'சனி',solarTimeMethod:'independent standard-chart fixture'},
 declinations:{'சூரியன்':-8.75,'சந்திரன்':-10.75,'செவ்வாய்':-22.528,'புதன்':-9,'குரு':23.5,'சுக்கிரன்':-4.96,'சனி':13.0},
 jdUt:jd,ayanamsa:(202+10/60)-(180+53/60+55/3600),classicalChestaInputs:standardChestaInputs
});
const nodeStandard=nodeRaman.calculateBVRamanShadbala({
  planets:standardPlanets,bhavas:[],ascendantLongitude:298+27/60,midheavenLongitude:216+30/60,
  apparentSolarHour:14.336,temporal:{abdaLord:'சனி',masaLord:'புதன்',dinaLord:'புதன்',horaLord:'சந்திரன்',tribhagaLord:'சனி',solarTimeMethod:'independent standard-chart fixture'},
  declinations:{'சூரியன்':-8.75,'சந்திரன்':-10.75,'செவ்வாய்':-22.528,'புதன்':-9,'குரு':23.5,'சுக்கிரன்':-4.96,'சனி':13.0},jdUt:jd,ayanamsa:(202+10/60)-(180+53/60+55/3600),classicalChestaInputs:standardChestaInputs
});
eq(nodeStandard.method,standard.method,'Node and browser use same B.V. Raman engine identity');
for(const name of planets){
 near(nodeStandard.planets[name].components.sthana.total,standard.planets[name].components.sthana.total,0.001,name+' browser/Node Sthana parity');
 near(nodeStandard.planets[name].components.dig,standard.planets[name].components.dig,0.001,name+' browser/Node Dig parity');
 near(nodeStandard.planets[name].components.kala.total,standard.planets[name].components.kala.total,0.001,name+' browser/Node Kala parity');
 near(nodeStandard.planets[name].components.cheshta,standard.planets[name].components.cheshta,0.001,name+' browser/Node Cheshta parity');
 near(nodeStandard.planets[name].components.drik,standard.planets[name].components.drik,0.001,name+' browser/Node Drik parity');
 const nodePhala=nodeStandard.planets[name].ishtaKashta, browserPhala=standard.planets[name].ishtaKashta;
 eq(nodePhala.available,true,name+' Node integrated Ishta/Kashta available: '+JSON.stringify(nodePhala));
 eq(browserPhala.available,true,name+' browser integrated Ishta/Kashta available');
 eq(browserPhala.method,'BV_RAMAN_SQRT_ISHTA_KASHTA',name+' uses Raman square-root Phala formulas');
 eq(browserPhala.classicalCertified,false,name+' Ishta/Kashta inputs are not falsely certified');
 near(nodePhala.uchchaBala,browserPhala.uchchaBala,0.001,name+' Node/browser Ishta Uchcha parity');
 near(nodePhala.cheshtaForPhala,browserPhala.cheshtaForPhala,0.001,name+' Node/browser special Chesta-for-Phala parity');
 near(nodePhala.ishtaPhala,browserPhala.ishtaPhala,0.001,name+' Node/browser Ishta parity');
 near(nodePhala.kashtaPhala,browserPhala.kashtaPhala,0.001,name+' Node/browser Kashta parity');
 near(browserPhala.sixfoldShadbalaCheshtaBala,standard.planets[name].components.cheshta,0.001,name+' sixfold Cheshta remains separately evidenced');
 if(name==='சூரியன்'||name==='சந்திரன்'){
  eq(standard.planets[name].components.cheshta,0,name+' sixfold Shadbala Cheshta remains zero for a luminary');
  ok(browserPhala.cheshtaForPhala>0,name+' Chapter X Ishta/Kashta Chesta-for-Phala is independently non-zero');
  eq(browserPhala.specialChestaMethod,'BV_RAMAN_SPECIAL_CHESTA_FOR_ISHTA_KASHTA',name+' uses Raman Chapter X luminary-specific rule');
 }else{
  near(browserPhala.cheshtaForPhala,standard.planets[name].components.cheshta,0.001,name+' Ishta/Kashta reuses the identical Chapter VI Cheshta value');
  near(browserPhala.computedChestaForPhala,standard.planets[name].components.cheshta,0.006,name+' Chapter X source formula reconciles with shared Chapter VI input');
  eq(browserPhala.specialChestaMethod,'BV_RAMAN_CHAPTER_VI_SHARED_SIXFOLD_INPUT',name+' explicitly shares Shadbala Cheshta');
 }
 eq(browserPhala.ishtaPhala,Math.round((Math.sqrt(browserPhala.uchchaBala*browserPhala.cheshtaForPhala)+Number.EPSILON)*100)/100,name+' Ishta formula uses the correct Chesta-for-Phala input');
 eq(browserPhala.kashtaPhala,Math.round((Math.sqrt((60-browserPhala.uchchaBala)*(60-browserPhala.cheshtaForPhala))+Number.EPSILON)*100)/100,name+' Kashta formula uses special Chesta-for-Phala');
}
eq(standard.classicalCertified,false,'standard fixture never overclaims full certification');
eq(Object.keys(standard.planets).length,7,'exactly seven classical grahas');
eq(Object.keys(nodeStandard.planets).length,7,'Node engine also returns seven classical grahas');
// Exact Bhava-Sandhi removes only the Bhava assignment. Raman's Kendradi
// Sthana term is computed from the D1 sign relative to Lagna, so it must remain
// available and numerically unchanged when one row has no Bhava number.
const sandhiPlanets=standardPlanets.map((p,i)=>i===0
 ?{...p,bhava:null,bhavaSandhi:{precedingHouse:12,followingHouse:1}}
 :{...p});
const sandhiOptions={
 planets:sandhiPlanets,bhavas:[],
 ascendantLongitude:298+27/60,midheavenLongitude:216+30/60,
 apparentSolarHour:14.336,
 temporal:{abdaLord:'சனி',masaLord:'புதன்',dinaLord:'புதன்',horaLord:'சந்திரன்',tribhagaLord:'சனி',solarTimeMethod:'independent standard-chart fixture'},
 declinations:{'சூரியன்':-8.75,'சந்திரன்':-10.75,'செவ்வாய்':-22.528,'புதன்':-9,'குரு':23.5,'சுக்கிரன்':-4.96,'சனி':13.0},
 jdUt:jd,ayanamsa:(202+10/60)-(180+53/60+55/3600),classicalChestaInputs:standardChestaInputs
};
const browserSandhi=calculateBVRamanShadbala(sandhiOptions);
const nodeSandhi=nodeRaman.calculateBVRamanShadbala(sandhiOptions);
for(const name of planets){
 eq(browserSandhi.planets[name].available,true,name+' B.V. Raman remains available with a Sandhi row');
 eq(nodeSandhi.planets[name].available,true,name+' Node B.V. Raman remains available with a Sandhi row');
 near(browserSandhi.planets[name].components.sthana.total,standard.planets[name].components.sthana.total,0.001,name+' Sandhi does not alter independent Raman Sthana Bala');
 near(nodeSandhi.planets[name].components.sthana.total,standard.planets[name].components.sthana.total,0.001,name+' Node Sandhi does not alter Raman Sthana Bala');
}

const expectedSthana={
 'சூரியன்':198,'சந்திரன்':126.5,'செவ்வாய்':172.06,
 'புதன்':279.5,'குரு':157.58,'சுக்கிரன்':178.2,'சனி':177.3
};
const expectedDig={
 'சூரியன்':48.1,'சந்திரன்':31.56,'செவ்வாய்':55.7,
 'புதன்':21.09,'குரு':11.5,'சுக்கிரன்':15.15,'சனி':58.02
};
const expectedKala={
 'சூரியன்':102.98,'சந்திரன்':202.04,'செவ்வாய்':30.06,
 'புதன்':192.79,'குரு':211.18,'சுக்கிரன்':115.53,'சனி':116.97
};
const expectedDrik={
 'சூரியன்':15.86,'சந்திரன்':-21.73,'செவ்வாய்':0.95,
 'புதன்':15.64,'குரு':-16.04,'சுக்கிரன்':18.47,'சனி':7.21
};
const expectedDrishtiPinda={
 'சூரியன்':63.45,'சந்திரன்':-86.93,'செவ்வாய்':3.81,
 'புதன்':62.57,'குரு':-64.14,'சுக்கிரன்':73.88,'சனி':28.82
};
const expectedCheshta={
 'செவ்வாய்':22.23,'புதன்':2.30,'குரு':35.26,'சுக்கிரன்':5.95,'சனி':21.14
};
for(const name of planets){
 const r=standard.planets[name];
 eq(r.classicalCertified,false,name+' keeps certification withheld');
 ok(r.components.sthana&&Number.isFinite(r.components.sthana.total),name+' Sthana Bala produced');
 near(r.components.sthana.total,expectedSthana[name],0.06,name+' Raman printed Sthana Bala worked example (source-table rounding)');
 // Raman's printed Mercury Dig Bala (21.09) does not reconcile exactly with its own printed arc (63°05′ / 3 ≈ 21.03); keep the source discrepancy visible without distorting the formula.
 near(r.components.dig,expectedDig[name],name==='புதன்'?0.08:0.06,name+' Raman printed Dig Bala worked example (source-table rounding)');
 near(r.components.kala.total,expectedKala[name],0.08,name+' Raman printed Kala Bala worked example');
 near(r.components.drik,expectedDrik[name],0.08,name+' Raman printed Drik Bala worked example');
 near(r.evidence.drikPinda,expectedDrishtiPinda[name],0.15,name+' Raman printed Drishti Pinda');
 if(Object.hasOwn(expectedCheshta,name)){
  near(r.components.cheshta,expectedCheshta[name],0.02,name+' Raman printed Chesta Bala worked example');
  eq(r.evidence.cheshtaSource.method,'BV_RAMAN_CHAPTER_VI_VERIFIED_CLASSICAL_LONGITUDES',name+' uses independently transcribed Raman Chesta inputs');
 }
 near(r.components.naisargika,BV_RAMAN_SHADBALA_SOURCE.naturalBalaPrinted[name],0.001,name+' Raman printed Naisargika constant');
}
// Five real Perambalur dates: the customer Horoscope now uses TRUE BPHS/N A E L O S
// for seven-graha Shadbala and Chapter 28 Ishta/Kashta; the independent B.V. Raman
// arithmetic fixtures above remain isolated formula tests only.
const births=[
 ['1992-07-31','22:05'],
 ['1994-06-15','13:03'],
 ['1971-05-04','05:05'],
 ['1974-01-11','16:04'],
 ['2015-09-06','09:30']
];
const TRUE_BPHS_FRAME='NAELOS_TRUE_ECLIPTIC_OF_DATE_EFFECTIVE_LAHIRI_V1';
const cleanupNaelosFetchBridge=await installLocalNaelosFetchBridge();
for(const [date,time] of births){
 const r=await full({date,time,lat:11.232,lon:78.88,utcOffsetMinutes:330,referenceDate:'2026-10-17',name:'TRUE BPHS strength6 audit'});
 ok(r.ok,'chart generated '+date);
 eq(r.chart.engine,'NAELOS Ephemeris 0.1.3 / NASA-JPL DE440',date+' NAELOS is the planetary source');
 eq(r.chart.referenceFrameId,TRUE_BPHS_FRAME,date+' one Effective Lahiri frame');
 eq(r.chart.classicalCertified,false,date+' never overclaims classical certification');
 eq(r.chart.naelosValidation?.tableIntegrityVerified,true,date+' DE440 tables are hash-verified');
 eq(r.chart.bhavas.length,12,date+' full Sripati Bhava result');
 const classical=r.chart.planets.filter(p=>planets.includes(p.name));
 eq(classical.length,7,date+' seven classical grahas');
 for(const p of classical){
  ok(p.strength6?.available===true,date+' '+p.name+' BPHS strength6 attached');
  eq(p.strength6.method,'TRUE_BPHS_SHADBALA_NAELOS_DE440',date+' '+p.name+' exact BPHS engine identity');
  eq(p.strength6.referenceFrameId,TRUE_BPHS_FRAME,date+' '+p.name+' Shadbala frame');
  eq(Object.hasOwn(p,'strength3'),false,date+' '+p.name+' old BPHS strength3 field absent');
  eq(p.strength6.classicalCertified,false,date+' '+p.name+' stays honestly provisional');
  ok(p.strength6.ishtaKashta?.available===true,date+' '+p.name+' Chapter 28 Ishta/Kashta attached');
  eq(p.strength6.ishtaKashta.method,'TRUE_BPHS_CH28_RASMI_ISHTA_KASHTA',date+' '+p.name+' Chapter 28 formula identity');
  eq(p.strength6.ishtaKashta.referenceFrameId,TRUE_BPHS_FRAME,date+' '+p.name+' Ishta/Kashta frame');
  eq(p.strength6.ishtaKashta.classicalCertified,false,date+' '+p.name+' Ishta/Kashta stays provisional');
  near(p.strength6.ishtaKashta.ishtaPhala+p.strength6.ishtaKashta.kashtaPhala,60,0.002,date+' '+p.name+' Ishta + Kashta = 60');
  near(p.strength6.ishtaKashta.ishtaPhala,
    (p.strength6.ishtaKashta.uchchaBala+p.strength6.ishtaKashta.cheshtaForPhala)/2,
    0.002,date+' '+p.name+' BPHS Ch28 verse 6 Rasmi mean');
  const c=p.strength6.components;
  ok(Number.isFinite(c.sthana?.total)&&Number.isFinite(c.dig)&&Number.isFinite(c.kala?.total)&&
    Number.isFinite(c.cheshta)&&Number.isFinite(c.naisargika)&&Number.isFinite(c.drik),
    date+' '+p.name+' six BPHS Bala components present');
  if(p.name==='சூரியன்'){
    near(p.strength6.ishtaKashta.cheshtaForPhala,30,0.002,date+' Sun BPHS Ch28 90-degree rule');
  }else if(p.name==='சந்திரன்'){
    const sun=r.chart.planets.find(x=>x.name==='சூரியன்');
    const separation=((p.longitude-sun.longitude)%360+360)%360;
    near(p.strength6.ishtaKashta.cheshtaForPhala,Math.min(separation,360-separation)/3,0.002,
      date+' Moon BPHS Ch28 Moon-minus-effective-Lahiri-Sun rule');
  }else{
    near(p.strength6.ishtaKashta.cheshtaForPhala,c.cheshta,0.002,
      date+' '+p.name+' BPHS Ch27 Cheshta reused as Ch28 Phala input');
  }
  if(Number.isFinite(p.strength6.totalVirupa)){
   const kalaSum=Object.entries(c.kala)
     .filter(([k,v])=>!['total','warPreTotal','yuddhaTrace'].includes(k)&&Number.isFinite(v))
     .reduce((s,[,v])=>s+v,0);
   near(kalaSum,c.kala.total,.005,date+' '+p.name+' Kala subtotal reconciles');
   near(c.sthana.total+c.dig+c.kala.total+c.cheshta+c.naisargika+c.drik,
     p.strength6.totalVirupa,.01,date+' '+p.name+' six-Bala total reconciles');
   near(p.strength6.totalRupa,p.strength6.totalVirupa/60,.002,date+' '+p.name+' Rupa conversion');
  }else{
   eq(p.strength6.totalRupa,null,date+' '+p.name+' total/Rupa withheld with unresolved Yuddha');
  }
 }
}
// The Ayurdaya integration consumes only strength6 as its ranking candidate.
const ayu=fs.readFileSync(new URL('../public/horoscope/offline/cg-rajan-ayurdaya-pinda.browser.mjs',import.meta.url),'utf8');
ok(ayu.includes('p?.strength6?.totalVirupa'),'C.G. Rajan Ayurdaya reads the sole seven-graha BPHS strength6 candidate');
ok(!ayu.includes('p?.strength3?.totalVirupa'),'C.G. Rajan Ayurdaya has no BPHS strength3 dependency');
const browserEngine=fs.readFileSync(new URL('../public/horoscope/offline/swiss_vedic.browser.mjs',import.meta.url),'utf8');
const nodeEngine=fs.readFileSync(new URL('../swiss_vedic.js',import.meta.url),'utf8');
ok(!browserEngine.includes('strength3:' )&&!browserEngine.includes('function phase3Strength('),'browser production engine has no BPHS strength3 calculation path');
ok(!nodeEngine.includes('strength3:' )&&!nodeEngine.includes('function phase3Strength('),'Node production engine has no BPHS strength3 calculation path');

await cleanupNaelosFetchBridge();
console.log(JSON.stringify({pass:true,checks,method:'TRUE BPHS Shadbala on NAELOS DE440; separate legacy B.V. Raman formula oracle retained',standardHoroscopeSthanaAndDigOracle:true,natalCharts:births.length,sevenGrahaStrength6:true,ayurdayaUsesStrength6:true,oldStrength3Removed:true,classicalCertified:false}));
