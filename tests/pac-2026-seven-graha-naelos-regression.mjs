#!/usr/bin/env node
/**
 * Seven-graha full-year PAC 2026 daily Nirayana source cross-check against
 * the TRUE BPHS research engine's NAELOS DE440 apparent True Longitude.
 *
 * PAC publishes daily Nirayana values for Sun, Moon, Mercury, Venus, Mars,
 * Jupiter and Saturn. The PDF headings do not name the ayanamsa or daily row
 * epoch. This project fixes the row comparison at 00:00 TT (TT-only policy)
 * and treats Lahiri as the inferred comparison convention, consistent with
 * the previously audited five-planet PAC comparison.
 *
 * PAC Lahiri-Nirayana -> Saura frame:
 *   PAC longitude + (Lahiri ayanamsa - Burgess-1860/Lahiri Saura offset)
 * Candidate:
 *   NAELOS tropical apparent True Longitude - Burgess-1860/Lahiri Saura offset
 *
 * This keeps all seven grahas in one explicit sidereal frame before comparing.
 * This is a modern PAC/DE440 comparison, not a historical Saura four-pass
 * certificate, not BPHS Cheshta certification, and not a production switch.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

import { createTrueBphsShadbalaEngine } from '../research/true-bphs/naelos-bphs-shadbala-engine.mjs';

const pdfDirectory=process.env.PAC_PDF_DIR;
assert.ok(pdfDirectory,'CI must set PAC_PDF_DIR to the seven official PAC PDFs');
const manifest=JSON.parse(readFileSync(
 new URL('./fixtures/pac-2026-seven-graha-official-pdf-manifest.json',import.meta.url),'utf8'
));
assert.equal(manifest.schema,'SMV_ASTRO_PAC_2026_OFFICIAL_SEVEN_GRAHA_DAILY_NIRAYANA_PDF_SHA256_V1');
assert.equal(manifest.publisher,
 'Positional Astronomy Centre, Kolkata — India Meteorological Department, Government of India');

const planets=Object.freeze({
 Sun:{english:'Sun'},
 Moon:{english:'Moon'},
 Mercury:{english:'Mercury'},
 Venus:{english:'Venus'},
 Mars:{english:'Mars'},
 Jupiter:{english:'Jupiter'},
 Saturn:{english:'Saturn'}
});
const monthNumber=Object.freeze({
 JAN:1,FEB:2,MAR:3,APR:4,MAY:5,JUN:6,
 JUL:7,AUG:8,SEP:9,OCT:10,NOV:11,DEC:12
});
const names=Object.keys(planets);
const wrap=value=>((value%360)+360)%360;
const signedDifference=(a,b)=>((a-b+540)%360)-180;
const isoDate=(year,month,day)=>year+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0');
const julianDayAtMidnightTt=(year,month,day)=>
 Date.UTC(year,month-1,day)/86400000+2440587.5;
function dmsToDegrees(value){
 return value.degree+value.minute/60+value.second/3600;
}
function parseDailyRows(filePath,planet){
 const extracted=spawnSync('pdftotext',['-layout','-enc','UTF-8',filePath,'-'],{
  encoding:'utf8',maxBuffer:16*1024*1024
 });
 assert.equal(extracted.status,0,
  'pdftotext must read '+planet+' official PAC PDF: '+(extracted.stderr||''));
 const rows=[];
 const pattern=/^\s*(\d{1,3})\s+(\d{1,2})\s+(\d{1,2}(?:\.\d+)?)\s+(2025|2026|2027)\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+(\d{1,2})\s*$/gm;
 for(const match of extracted.stdout.matchAll(pattern)){
  const year=Number(match[4]);
  if(year!==2026)continue;
  const degree=Number(match[1]),minute=Number(match[2]),second=Number(match[3]);
  const month=monthNumber[match[5]],day=Number(match[6]);
  assert.ok(degree>=0&&degree<360,planet+' degree range '+match[0]);
  assert.ok(minute>=0&&minute<60,planet+' minute range '+match[0]);
  assert.ok(second>=0&&second<60,planet+' second range '+match[0]);
  rows.push({
   date:isoDate(year,month,day),year,month,day,degree,minute,second,
   nirayanaDegrees:degree+minute/60+second/3600
  });
 }
 return rows;
}
function near(a,b,tolerance,message){
 assert.ok(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=tolerance,
  message+' actual='+a+' expected='+b+' tolerance='+tolerance);
}

const pdfRows={},sourceIntegrity={},sourceValues=[];
for(const name of names){
 const filePath=path.join(pdfDirectory,name+'.pdf');
 const bytes=readFileSync(filePath);
 assert.ok(bytes.length>10000,name+' PAC official PDF is non-empty');
 const expected=manifest.files[name];
 assert.ok(expected,name+' appears in the official PAC source manifest');
 const sha256=createHash('sha256').update(bytes).digest('hex');
 if(expected.bytes!==null)assert.equal(bytes.length,expected.bytes,name+' source byte length');
 if(expected.sha256!==null)assert.equal(sha256,expected.sha256,name+' source SHA-256');
 sourceIntegrity[name]={url:expected.url,bytes:bytes.length,sha256};
 const rows=parseDailyRows(filePath,name);
 assert.equal(rows.length,365,name+' must contain exactly 365 Gregorian 2026 daily values');
 const byDate=new Map(rows.map(row=>[row.date,row]));
 assert.equal(byDate.size,365,name+' must not contain duplicate 2026 daily rows');
 for(let dayOfYear=0;dayOfYear<365;dayOfYear++){
  const date=new Date(Date.UTC(2026,0,1+dayOfYear));
  const key=isoDate(date.getUTCFullYear(),date.getUTCMonth()+1,date.getUTCDate());
  assert.ok(byDate.has(key),name+' missing PAC daily value '+key);
 }
 const anchor=byDate.get('2026-01-01');
 const expectedAnchor=manifest.januaryFirst2026Anchors[name];
 near(anchor.degree,expectedAnchor.degree,0,name+' Jan 1 2026 official degree anchor');
 near(anchor.minute,expectedAnchor.minute,0,name+' Jan 1 2026 official minute anchor');
 near(anchor.second,expectedAnchor.second,1e-7,name+' Jan 1 2026 official second anchor');
 pdfRows[name]=byDate;
 sourceValues.push(...rows);
}

const engine=await createTrueBphsShadbalaEngine();
assert.equal(engine.engine,'TRUE_BPHS_SHADBALA_NAELOS_DE440');
assert.equal(engine.sourceEphemeris,'JPL DE440');
assert.equal(engine.naelosPackageVersion,'0.1.3');
assert.equal(engine.tableIntegrityVerified,true);
assert.equal(engine.productionIntegrationAllowed,false);
assert.equal(engine.governmentReferenceCertificate.status,'PASS_PAC_VS_SWISS_LAHIRI_1825_OF_1825');
assert.equal(names.length,7);
assert.equal(sourceValues.length,2555);

const observations=[];
const byPlanet=Object.fromEntries(names.map(name=>[name,[]]));
for(let dayOfYear=0;dayOfYear<365;dayOfYear++){
 const date=new Date(Date.UTC(2026,0,1+dayOfYear));
 const year=date.getUTCFullYear(),month=date.getUTCMonth()+1,day=date.getUTCDate();
 const dateKey=isoDate(year,month,day);
 const jdTt=julianDayAtMidnightTt(year,month,day);
 // Direct 00:00:00 TT. Do not convert through UTC or UT1 in this PAC test.
 const positions=await engine.trueLongitudesAtTt(jdTt);
 assert.equal(positions.epochJdTt,jdTt,dateKey+' exact 00:00 TT epoch');
 assert.equal(positions.referenceFrameId,engine.governmentReferenceCertificate?
  'SAURA_NIRAYANA_NAELOS_TRUE_ECLIPTIC_OF_DATE_BURGESS1860_LAHIRI_DELTA_V1':
  'SAURA_NIRAYANA_NAELOS_TRUE_ECLIPTIC_OF_DATE_BURGESS1860_LAHIRI_DELTA_V1');
 for(const name of names){
  const pac=pdfRows[name].get(dateKey);
  const naelos=positions.planets[name];
  assert.ok(naelos,dateKey+' NAELOS '+name+' exists');
  assert.equal(naelos.referenceFrameId,positions.referenceFrameId,
   dateKey+' '+name+' NAELOS frame consistency');
  const pacSaura=wrap(pac.nirayanaDegrees+positions.pacLahiriToSauraOffsetDegrees);
  const candidate=naelos.trueLongitudeSaura;
  const delta=signedDifference(candidate,pacSaura);
  const residualArcseconds=Math.abs(delta)*3600;
  const observation={
   date:dateKey,planet:name,julianDayTT:jdTt,
   pacNirayanaDegrees:Number(pac.nirayanaDegrees.toFixed(10)),
   lahiriAyanamsaDegrees:positions.lahiriAyanamsaDegrees,
   pacToSauraOffsetDegrees:positions.pacLahiriToSauraOffsetDegrees,
   pacSauraDegrees:Number(pacSaura.toFixed(10)),
   naelosTropicalTrueLongitude:Number(naelos.tropicalApparentTrueLongitude.toFixed(10)),
   naelosLahiriNirayanaDegrees:Number(naelos.trueLongitudeLahiri.toFixed(10)),
   naelosSauraTrueLongitude:Number(candidate.toFixed(10)),
   signedResidualArcseconds:Number((delta*3600).toFixed(9)),
   absoluteResidualArcseconds:Number(residualArcseconds.toFixed(9))
  };
  near(residualArcseconds,0,manifest.comparisonContract.gateArcseconds,
   dateKey+' '+name+' PAC seven-graha Nirayana vs NAELOS DE440 same-frame True Longitude');
  observations.push(observation);
  byPlanet[name].push(residualArcseconds);
 }
}
assert.equal(observations.length,2555,'365 days x seven grahas');
const allResiduals=observations.map(row=>row.absoluteResidualArcseconds);
const maximumAbsoluteResidualArcseconds=Math.max(...allResiduals);
const rmsResidualArcseconds=Math.sqrt(
 observations.reduce((sum,row)=>sum+(row.signedResidualArcseconds/3600)**2,0)/observations.length
)*3600;
assert.ok(maximumAbsoluteResidualArcseconds<=manifest.comparisonContract.gateArcseconds,
 'all seven grahas satisfy the declared PAC / NAELOS 0.36 arcsecond gate');

const perGraha=Object.fromEntries(names.map(name=>{
 const values=byPlanet[name];
 const worst=observations.filter(row=>row.planet===name)
  .reduce((a,b)=>b.absoluteResidualArcseconds>a.absoluteResidualArcseconds?b:a);
 return [name,{
  samples:values.length,
  maximumAbsoluteResidualArcseconds:Math.max(...values),
  rmsResidualArcseconds:Math.sqrt(values.reduce((sum,value)=>sum+(value/3600)**2,0)/values.length)*3600,
  worstDate:worst.date,
  worstResidualArcseconds:worst.absoluteResidualArcseconds
 }];
}));
const report={
 pass:true,status:'PASS_PAC_NAELOS_SEVEN_GRAHA_2555_DAILY_VALUES',
 certificateId:'SMV-ASTRO-PAC-NAELOS-SEVEN-GRAHA-2026',
 publisher:manifest.publisher,
 sourcePage:manifest.pageUrl,
 sourceTitle:manifest.sourceTitle,
 availability:manifest.availability,
 downloadedOfficialPdfCount:7,
 sourceIntegrity,
 dateRange:'2026-01-01 through 2026-12-31',
 samples:observations.length,
 dailyEpoch:'00:00:00 TT (project TT-only PAC comparison contract)',
 siderealAyanamsa:'Lahiri inferred; PAC PDFs label Nirayana but do not name a particular ayanamsa',
 sourceFrameTransfer:'PAC Lahiri-Nirayana + (Lahiri ayanamsa - Burgess-1860/Lahiri Saura offset)',
 candidate:'NAELOS Ephemeris 0.1.3 / NASA-JPL DE440 apparent geocentric True Longitude',
 comparisonFrame:'SAURA_NIRAYANA_NAELOS_TRUE_ECLIPTIC_OF_DATE_BURGESS1860_LAHIRI_DELTA_V1',
 gateArcseconds:manifest.comparisonContract.gateArcseconds,
 maximumAbsoluteResidualArcseconds,
 rmsResidualArcseconds,
 perGraha,
 observations,
 historicalSauraFourPassCertified:false,
 arbitraryHistoricalEpochsCertified:false,
 classicalCheshtaCertified:false,
 classicalCertified:false,
 productionIntegrationAllowed:false,
 limitations:[
  'The PAC daily PDF heading says Nirayana Longitude; it does not name the underlying ayanamsa or explicitly print the daily time argument.',
  'The 00:00 TT comparison epoch uses the project owner-confirmed TT-only policy; it is not stated on the daily PDF headings.',
  'Lahiri is the inferred PAC comparison convention supported by the numerical match; written PAC specification is still needed to make the ayanamsa metadata explicit.',
  'This modern PAC/NAELOS validation does not prove the underlying PAC and JPL numerical integrations are independent.',
  'A 2026 daily cross-check is not a certificate for all possible natal instants or any date outside 2026.',
  'This does not certify the historical Saura four-pass True Longitude theory or BPHS Cheshta arithmetic.'
 ]
};
mkdirSync('artifacts',{recursive:true});
writeFileSync('artifacts/pac-2026-seven-graha-naelos-validation.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({
 pass:true,status:report.status,downloadedOfficialPdfCount:7,
 samples:report.samples,gateArcseconds:report.gateArcseconds,
 maximumAbsoluteResidualArcseconds:report.maximumAbsoluteResidualArcseconds,
 rmsResidualArcseconds:report.rmsResidualArcseconds,perGraha:report.perGraha,
 sourceIntegrity,artifacts:'artifacts/pac-2026-seven-graha-naelos-validation.json',
 productionIntegrationAllowed:false,classicalCertified:false
},null,2));
