#!/usr/bin/env node
/**
 * Seven-graha PAC 2026 daily Nirayana check for the TRUE BPHS engine's
 * common effective-Lahiri output frame.
 *
 * PAC labels the published values Nirayana but does not name the ayanamsa.
 * The project records Lahiri as an inferred convention because the same-epoch
 * Swiss Lahiri match is within the stated 0.36 arcsecond comparison gate.
 *
 * One COMMON effective Lahiri offset is used for every graha:
 * Swiss apparent tropical Sun longitude - Swiss apparent Lahiri Sun longitude.
 * NAELOS remains the only provider of the planetary apparent True Longitudes.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

import { createTrueBphsShadbalaEngine } from '../research/true-bphs/naelos-bphs-shadbala-engine.mjs';
import { effectiveLahiriSiderealOffsetDegrees, TRUE_BPHS_LAHIRI_FRAME_ID } from '../research/true-bphs/effective-lahiri-frame.mjs';
import { getSwe, C } from '../public/horoscope/offline/wasm-provider.mjs';

const pdfDirectory=process.env.PAC_PDF_DIR;
assert.ok(pdfDirectory,'CI must set PAC_PDF_DIR to the seven official PAC PDFs');
const manifest=JSON.parse(readFileSync(
 new URL('./fixtures/pac-2026-seven-graha-official-pdf-manifest.json',import.meta.url),'utf8'
));
assert.equal(manifest.schema,'SMV_ASTRO_PAC_2026_OFFICIAL_SEVEN_GRAHA_DAILY_NIRAYANA_PDF_SHA256_V1');
assert.equal(manifest.publisher,
 'Positional Astronomy Centre, Kolkata — India Meteorological Department, Government of India');

const bodies=Object.freeze({
 Sun:C.SUN,Moon:C.MOON,Mercury:C.MERCURY,Venus:C.VENUS,
 Mars:C.MARS,Jupiter:C.JUPITER,Saturn:C.SATURN
});
const names=Object.keys(bodies);
const monthNumber=Object.freeze({
 JAN:1,FEB:2,MAR:3,APR:4,MAY:5,JUN:6,
 JUL:7,AUG:8,SEP:9,OCT:10,NOV:11,DEC:12
});
const wrap=value=>((value%360)+360)%360;
const signedDifference=(a,b)=>((a-b+540)%360)-180;
const isoDate=(year,month,day)=>year+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0');
const julianDayAtMidnightTt=(year,month,day)=>
 Date.UTC(year,month-1,day)/86400000+2440587.5;
const arcsec=(a,b)=>Math.abs(signedDifference(a,b))*3600;
function near(a,b,tolerance,message){
 assert.ok(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=tolerance,
  message+' actual='+a+' expected='+b+' tolerance='+tolerance);
}
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
   nirayanaDegrees:dmsToDegrees({degree,minute,second})
  });
 }
 return rows;
}
const pdfRows={},sourceIntegrity={};
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
}

const engine=await createTrueBphsShadbalaEngine();
const swe=await getSwe();
swe.setSiderealLahiri();
const siderealFlags=swe.siderealSpeedFlags();
assert.equal(engine.engine,'TRUE_BPHS_SHADBALA_NAELOS_DE440');
assert.equal(engine.sourceEphemeris,'JPL DE440');
assert.equal(engine.naelosPackageVersion,'0.1.3');
assert.equal(engine.tableIntegrityVerified,true);
assert.equal(engine.productionIntegrationAllowed,false);
assert.equal(names.length,7);

const observations=[];
const residualsByPlanet=Object.fromEntries(names.map(name=>[name,[]]));
const diagnostics={
 pacVsSwissLahiri:[],naelosVsSwissTropical:[],naelosVsSwissLahiri:[]
};
const OFFSET_MATCH_TOLERANCE_DEGREES=1e-10;
for(let dayOfYear=0;dayOfYear<365;dayOfYear++){
 const date=new Date(Date.UTC(2026,0,1+dayOfYear));
 const year=date.getUTCFullYear(),month=date.getUTCMonth()+1,day=date.getUTCDate();
 const dateKey=isoDate(year,month,day);
 const jdTt=julianDayAtMidnightTt(year,month,day);
 const positions=await engine.trueLongitudesAtTt(jdTt);
 assert.equal(positions.epochJdTt,jdTt,dateKey+' exact 00:00 TT epoch');
 assert.equal(positions.referenceFrameId,TRUE_BPHS_LAHIRI_FRAME_ID,
  dateKey+' engine output is effective Lahiri only');
 const independentlyComputedOffset=effectiveLahiriSiderealOffsetDegrees(swe,jdTt);
 near(positions.effectiveLahiriOffsetDegrees,independentlyComputedOffset,
  OFFSET_MATCH_TOLERANCE_DEGREES,dateKey+' common effective Lahiri offset');

 for(const name of names){
  const pac=pdfRows[name].get(dateKey);
  const naelos=positions.planets[name];
  assert.ok(naelos,dateKey+' NAELOS '+name+' exists');
  assert.equal(naelos.referenceFrameId,TRUE_BPHS_LAHIRI_FRAME_ID,
   dateKey+' '+name+' shares the common Lahiri frame');
  const candidate=naelos.trueLongitudeLahiri;
  const pacVsNaelos=arcsec(candidate,pac.nirayanaDegrees);
  const swissTropical=swe.calc(jdTt,bodies[name],2|256);
  const swissLahiri=swe.calc(jdTt,bodies[name],siderealFlags);
  assert.ok(Number.isFinite(swissTropical.longitude),dateKey+' '+name+' Swiss tropical finite');
  assert.ok(Number.isFinite(swissLahiri.longitude),dateKey+' '+name+' Swiss Lahiri finite');
  assert.equal(swissTropical.retFlag&2,2,dateKey+' '+name+' Swiss tropical data source');
  assert.equal(swissLahiri.retFlag&2,2,dateKey+' '+name+' Swiss Lahiri data source');
  const pacVsSwiss=arcsec(pac.nirayanaDegrees,swissLahiri.longitude);
  const naelosVsSwissTropical=arcsec(naelos.tropicalApparentTrueLongitude,swissTropical.longitude);
  const naelosVsSwissLahiri=arcsec(candidate,swissLahiri.longitude);
  residualsByPlanet[name].push(pacVsNaelos);
  diagnostics.pacVsSwissLahiri.push(pacVsSwiss);
  diagnostics.naelosVsSwissTropical.push(naelosVsSwissTropical);
  diagnostics.naelosVsSwissLahiri.push(naelosVsSwissLahiri);
  observations.push({
   date:dateKey,planet:name,julianDayTT:jdTt,
   pacNirayanaDegrees:Number(pac.nirayanaDegrees.toFixed(10)),
   naelosTropicalTrueLongitude:Number(naelos.tropicalApparentTrueLongitude.toFixed(10)),
   naelosEffectiveLahiriLongitude:Number(candidate.toFixed(10)),
   commonEffectiveLahiriOffsetDegrees:Number(positions.effectiveLahiriOffsetDegrees.toFixed(12)),
   pacVsNaelosAbsoluteResidualArcseconds:Number(pacVsNaelos.toFixed(9)),
   pacVsSwissLahiriAbsoluteResidualArcseconds:Number(pacVsSwiss.toFixed(9)),
   naelosVsSwissTropicalAbsoluteResidualArcseconds:Number(naelosVsSwissTropical.toFixed(9)),
   naelosVsSwissLahiriAbsoluteResidualArcseconds:Number(naelosVsSwissLahiri.toFixed(9))
  });
 }
}
assert.equal(observations.length,2555,'365 days x seven grahas');
const gateArcseconds=manifest.comparisonContract.gateArcseconds;
const perGraha=Object.fromEntries(names.map(name=>{
 const rows=observations.filter(row=>row.planet===name);
 const values=residualsByPlanet[name];
 const rms=Math.sqrt(values.reduce((sum,value)=>sum+(value/3600)**2,0)/values.length)*3600;
 const worst=rows.reduce((a,b)=>
  b.pacVsNaelosAbsoluteResidualArcseconds>a.pacVsNaelosAbsoluteResidualArcseconds?b:a);
 return [name,{
  samples:values.length,
  maximumAbsoluteResidualArcseconds:Math.max(...values),
  rmsResidualArcseconds:rms,
  pacVsSwissLahiriMaximumAbsoluteResidualArcseconds:Math.max(...rows.map(r=>r.pacVsSwissLahiriAbsoluteResidualArcseconds)),
  naelosVsSwissTropicalMaximumAbsoluteResidualArcseconds:Math.max(...rows.map(r=>r.naelosVsSwissTropicalAbsoluteResidualArcseconds)),
  naelosVsSwissLahiriMaximumAbsoluteResidualArcseconds:Math.max(...rows.map(r=>r.naelosVsSwissLahiriAbsoluteResidualArcseconds)),
  worstDate:worst.date,
  worstResidualArcseconds:worst.pacVsNaelosAbsoluteResidualArcseconds
 }];
}));
const failedGrahas=names.filter(name=>perGraha[name].maximumAbsoluteResidualArcseconds>gateArcseconds);
const maximumAbsoluteResidualArcseconds=Math.max(...observations.map(r=>r.pacVsNaelosAbsoluteResidualArcseconds));
const rmsResidualArcseconds=Math.sqrt(
 observations.reduce((sum,row)=>sum+(row.pacVsNaelosAbsoluteResidualArcseconds/3600)**2,0)/observations.length
)*3600;
assert.deepEqual(failedGrahas,[],
 'all seven grahas must pass the direct effective-Lahiri PAC/NAELOS gate');
const maxPacVsSwissLahiri=Math.max(...diagnostics.pacVsSwissLahiri);
const maxNaelosVsSwissTropical=Math.max(...diagnostics.naelosVsSwissTropical);
const maxNaelosVsSwissLahiri=Math.max(...diagnostics.naelosVsSwissLahiri);
assert.ok(maxPacVsSwissLahiri<=gateArcseconds,
 'PAC daily Nirayana values also remain within the effective Lahiri Swiss cross-check gate');
assert.ok(maxNaelosVsSwissTropical<=5,
 'NAELOS tropical apparent positions pass the independent Swiss tropical 5-arcsecond check');

const report={
 pass:true,status:'PASS_PAC_NAELOS_SEVEN_GRAHA_EFFECTIVE_LAHIRI_2555',
 certificateId:'SMV-ASTRO-PAC-NAELOS-SEVEN-GRAHA-EFFECTIVE-LAHIRI-2026',
 publisher:manifest.publisher,sourcePage:manifest.pageUrl,sourceTitle:manifest.sourceTitle,
 availability:manifest.availability,downloadedOfficialPdfCount:7,sourceIntegrity,
 dateRange:'2026-01-01 through 2026-12-31',samples:observations.length,
 dailyEpoch:'00:00:00 TT (project TT-only PAC comparison contract)',
 siderealAyanamsa:'Lahiri inferred from same-epoch Swiss tropical/Sun and Lahiri-sidereal/Sun agreement; PAC PDF headings do not name the ayanamsa',
 comparisonFrame:TRUE_BPHS_LAHIRI_FRAME_ID,
 commonFrameOffsetMethod:'same-epoch Swiss apparent tropical Sun longitude minus Swiss apparent Lahiri sidereal Sun longitude; one common offset is applied to all seven NAELOS positions and all twelve Bhava cusps',
 candidate:'NAELOS Ephemeris 0.1.3 / NASA-JPL DE440 apparent geocentric True Longitude',
 gateArcseconds,maximumAbsoluteResidualArcseconds,rmsResidualArcseconds,
 allSevenGrahasCompared:true,allSevenEffectiveLahiriGatePass:true,failedGrahas,
 maximumPacVsSwissLahiriResidualArcseconds:maxPacVsSwissLahiri,
 maximumNaelosVsSwissTropicalResidualArcseconds:maxNaelosVsSwissTropical,
 maximumNaelosVsSwissLahiriResidualArcseconds:maxNaelosVsSwissLahiri,
 perGraha,noSauraFrame:true,historicalClassicalFourPassCertified:false,
 arbitraryHistoricalEpochsCertified:false,classicalCheshtaCertified:false,
 classicalCertified:false,productionIntegrationAllowed:false,
 limitations:[
  'PAC publishes Nirayana Longitude but does not identify the named ayanamsa in the PDF headings; Lahiri is inferred from numerical agreement.',
  'The 00:00 TT daily comparison epoch is the project owner-confirmed TT-only contract; it is not stated on the PDF row headings.',
  'This 2026 daily source check does not certify all possible natal instants or dates outside 2026.',
  'PAC / Swiss numerical agreement does not establish independent underlying ephemeris provenance.',
  'The NAELOS DE440 True Longitude and V365 Mean / Sheeghroccheya are numerical models with separate source origins; only their coordinates are aligned into this one effective Lahiri frame before BPHS Cheshta.',
  'All results remain research-only; production integration is disabled.'
 ],
 observations
};
mkdirSync('artifacts',{recursive:true});
writeFileSync('artifacts/pac-2026-seven-graha-naelos-validation.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({
 pass:report.pass,status:report.status,samples:report.samples,gateArcseconds,
 maximumAbsoluteResidualArcseconds,rmsResidualArcseconds,
 maximumPacVsSwissLahiriResidualArcseconds:maxPacVsSwissLahiri,
 maximumNaelosVsSwissTropicalResidualArcseconds:maxNaelosVsSwissTropical,
 maximumNaelosVsSwissLahiriResidualArcseconds:maxNaelosVsSwissLahiri,
 perGraha,productionIntegrationAllowed:false,classicalCertified:false
},null,2));
