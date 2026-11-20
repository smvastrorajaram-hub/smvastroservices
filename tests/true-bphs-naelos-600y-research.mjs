#!/usr/bin/env node
/**
 * Deterministic full-coverage integration audit: one random Indian natal chart
 * per civil year 1800–2399, evaluated by TRUE_BPHS_SHADBALA_NAELOS_DE440.
 *
 * Coverage / arithmetic regression only. It is not an independent historical
 * ephemeris oracle and never sets classicalCertified:true.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createTrueBphsShadbalaEngine } from '../research/true-bphs/naelos-bphs-shadbala-engine.mjs';

const SEED=0x534d5641;
const YEAR_START=1800,YEAR_END=2399;
const EXPECTED=YEAR_END-YEAR_START+1;
const GRAHAS=['சூரியன்','சந்திரன்','செவ்வாய்','புதன்','குரு','சுக்கிரன்','சனி'];
const FIVE=['செவ்வாய்','புதன்','குரு','சுக்கிரன்','சனி'];
const PLACES=Object.freeze([
 ['Perambalur',11.232,78.880],
 ['Chennai',13.0827,80.2707],
 ['Coimbatore',11.0168,76.9558],
 ['Madurai',9.9252,78.1198],
 ['Tiruchirappalli',10.7905,78.7047],
 ['Salem',11.6643,78.1460],
 ['Thanjavur',10.7870,79.1378],
 ['Tirunelveli',8.7139,77.7567],
 ['Bengaluru',12.9716,77.5946],
 ['Mysuru',12.2958,76.6394],
 ['Hyderabad',17.3850,78.4867],
 ['Vijayawada',16.5062,80.6480],
 ['Visakhapatnam',17.6868,83.2185],
 ['Mumbai',19.0760,72.8777],
 ['Pune',18.5204,73.8567],
 ['Ahmedabad',23.0225,72.5714],
 ['Jaipur',26.9124,75.7873],
 ['New Delhi',28.6139,77.2090],
 ['Lucknow',26.8467,80.9462],
 ['Varanasi',25.3176,82.9739],
 ['Bhopal',23.2599,77.4126],
 ['Indore',22.7196,75.8577],
 ['Kolkata',22.5726,88.3639],
 ['Bhubaneswar',20.2961,85.8245],
 ['Patna',25.5941,85.1376],
 ['Ranchi',23.3441,85.3096],
 ['Guwahati',26.1445,91.7362],
 ['Shillong',25.5788,91.8933],
 ['Imphal',24.8170,93.9368],
 ['Agartala',23.8315,91.2868],
 ['Srinagar',34.0837,74.7973],
 ['Jammu',32.7266,74.8570],
 ['Shimla',31.1048,77.1734],
 ['Dehradun',30.3165,78.0322],
 ['Amritsar',31.6340,74.8723],
 ['Chandigarh',30.7333,76.7794],
 ['Jodhpur',26.2389,73.0243],
 ['Udaipur',24.5854,73.7125],
 ['Panaji',15.4909,73.8278],
 ['Kochi',9.9312,76.2673],
 ['Thiruvananthapuram',8.5241,76.9366],
 ['Kozhikode',11.2588,75.7804],
 ['Mangaluru',12.9141,74.8560],
 ['Raipur',21.2514,81.6296],
 ['Nagpur',21.1458,79.0882],
 ['Surat',21.1702,72.8311],
 ['Kanpur',26.4499,80.3319],
 ['Agra',27.1767,78.0081],
 ['Gwalior',26.2183,78.1828],
 ['Nashik',19.9975,73.7898]
].map(([name,latitude,longitude])=>Object.freeze({
 name,latitude,longitude,timeZone:'Asia/Kolkata',country:'India'
})));

let state=SEED>>>0;
function random(){
 state^=state<<13;state^=state>>>17;state^=state<<5;
 return (state>>>0)/4294967296;
}
const pick=rows=>rows[Math.floor(random()*rows.length)];
const pad2=value=>String(value).padStart(2,'0');
function birthForYear(year){
 const month=Math.floor(random()*12);
 const daysInMonth=new Date(Date.UTC(year,month+1,0)).getUTCDate();
 const day=1+Math.floor(random()*daysInMonth);
 const hour=Math.floor(random()*24);
 const minute=Math.floor(random()*60);
 const place=pick(PLACES);
 return {
  year,
  date:year+'-'+pad2(month+1)+'-'+pad2(day),
  time:pad2(hour)+':'+pad2(minute),
  latitude:place.latitude,longitude:place.longitude,
  timeZone:place.timeZone,place:place.name,country:place.country
 };
}
const finite=value=>typeof value==='number'&&Number.isFinite(value);
const engine=await createTrueBphsShadbalaEngine();
const records=[];
const placeCounts=new Map();
const stats={
 charts:0,grahaRows:0,componentValues:0,finiteTotals:0,withheldTotals:0,
 cheshtaRows:0,yuddhaPairs:0,resolvedWars:0,unresolvedWarPairs:0,
 chartsWithWars:0,chartsWithUnresolvedYuddha:0,
 kalaReconciliationFailures:0,sixBalaReconciliationFailures:0,
 falseClassicalCertificationFlags:0
};
for(let year=YEAR_START;year<=YEAR_END;year++){
 const birth=birthForYear(year);
 placeCounts.set(birth.place,(placeCounts.get(birth.place)||0)+1);
 const result=await engine.calculate(birth);
 assert.equal(result.engine,'TRUE_BPHS_SHADBALA_NAELOS_DE440',
  birth.date+' uses the requested independent BPHS engine');
 assert.equal(result.classicalCertified,false,
  birth.date+' cannot elevate annual sampling into classical certification');
 assert.equal(result.productionIntegrationAllowed,false,
  birth.date+' production remains disabled');
 assert.equal(result.planetaryPositions.filter(p=>GRAHAS.includes(p.name)).length,7,
  birth.date+' has all seven BPHS grahas');
 assert.equal(Object.keys(result.planets).length,7,
  birth.date+' has seven six-Bala outputs');
 assert.equal(result.bhava.madhya.length,12,birth.date+' twelve Sripati Madhya values');
 assert.equal(result.bhava.arambha.length,12,birth.date+' twelve Sripati Arambha values');
 assert.equal(Object.keys(result.cheshtaInputs).length,5,birth.date+' five same-frame Cheshta triples');
 assert.equal(result.yuddhaEvidence.pairs.length,10,birth.date+' ten Yuddha pairs classified');
 assert.equal(result.frame.noAbsoluteKotiMinus,true,birth.date+' rejected True Longitude method excluded');
 assert.equal(result.researchOnly,true,birth.date+' research-only result');
 stats.charts++;
 const chartRows=[];
 for(const name of GRAHAS){
  const row=result.planets[name],components=row?.components;
  assert.equal(row?.available,true,birth.date+' '+name+' result exists');
  assert.equal(row.classicalCertified,false,birth.date+' '+name+' not self-certified');
  stats.grahaRows++;
  const values={
   sthana:components?.sthana?.total,
   dig:components?.dig,
   kala:components?.kala?.total,
   cheshta:components?.cheshta,
   naisargika:components?.naisargika,
   drik:components?.drik
  };
  for(const [component,value] of Object.entries(values)){
   assert.ok(finite(value),birth.date+' '+name+' '+component+' is finite');
   stats.componentValues++;
  }
  const kalaParts=Object.entries(components.kala)
   .filter(([key,value])=>key!=='total'&&key!=='yuddha'&&finite(value))
   .reduce((sum,[,value])=>sum+value,0);
  assert.ok(Math.abs(kalaParts-components.kala.total)<=0.005,
   birth.date+' '+name+' Kala subcomponents reconcile');
  if(Math.abs(kalaParts-components.kala.total)>0.005)stats.kalaReconciliationFailures++;
  let sum=values.sthana+values.dig+values.kala+values.cheshta+values.naisargika+values.drik;
  if(finite(row.totalVirupa)){
   stats.finiteTotals++;
   assert.ok(Math.abs(sum-row.totalVirupa)<=0.01,
    birth.date+' '+name+' total equals six component sum');
   assert.ok(finite(row.totalRupa)&&Math.abs(row.totalRupa-row.totalVirupa/60)<=0.002,
    birth.date+' '+name+' Rupa equals Virupa / 60');
   if(Math.abs(sum-row.totalVirupa)>0.01)stats.sixBalaReconciliationFailures++;
  }else{
   stats.withheldTotals++;
   assert.equal(row.totalRupa,null,birth.date+' '+name+' Rupa withheld together with total');
   assert.ok(result.yuddhaEvidence.unresolvedGrahas.includes(name),
    birth.date+' '+name+' total withheld only when Yuddha is unresolved');
  }
  chartRows.push({
   graha:name,longitude:result.planetaryPositions.find(p=>p.name===name).longitude,
   componentsVirupa:values,totalVirupa:finite(row.totalVirupa)?row.totalVirupa:null,
   totalRupa:finite(row.totalRupa)?row.totalRupa:null,
   isStrong:row.isStrong,withheld:!finite(row.totalVirupa)
  });
 }
 for(const planet of FIVE){
  const input=result.cheshtaInputs[planet],value=result.cheshtaResults[planet];
  for(const key of ['meanSunLongitude','meanPlanetLongitude','truePlanetLongitude'])
   assert.ok(finite(input[key]),birth.date+' '+planet+' '+key+' is finite');
  assert.equal(input.meanSunFrameId,result.frame.id,birth.date+' '+planet+' Mean Sun frame');
  assert.equal(input.meanPlanetFrameId,result.frame.id,birth.date+' '+planet+' Mean planet frame');
  assert.equal(input.truePlanetFrameId,result.frame.id,birth.date+' '+planet+' True frame');
  assert.equal(input.sheeghroccaFrameId,result.frame.id,birth.date+' '+planet+' Sheeghroccheya frame');
  assert.ok(finite(value.virupa)&&value.virupa>=0&&value.virupa<=60,
   birth.date+' '+planet+' BPHS Cheshta range');
  stats.cheshtaRows++;
 }
 stats.yuddhaPairs+=result.yuddhaEvidence.pairs.length;
 stats.resolvedWars+=result.yuddhaEvidence.encounters.length;
 stats.unresolvedWarPairs+=result.yuddhaEvidence.unresolved.length;
 if(result.yuddhaEvidence.encounters.length)stats.chartsWithWars++;
 if(result.yuddhaEvidence.unresolved.length)stats.chartsWithUnresolvedYuddha++;
 records.push({
  year,date:birth.date,time:birth.time,place:birth.place,country:birth.country,
  latitude:birth.latitude,longitude:birth.longitude,timeZone:birth.timeZone,
  birthUtcOffsetMinutes:result.birth.utcOffsetMinutes,
  utcJd:result.birth.utcJd,ttJd:result.birth.ttJd,epochId:'TRUE_BPHS_RANDOM_'+year,
  frameId:result.frame.id,naelosTableFiles:result.astronomy.loadedTableFiles.map(x=>x.name),
  classicalCertified:false,grahas:chartRows,
  cheshta:Object.fromEntries(FIVE.map(name=>[name,{
   meanLongitude:result.cheshtaInputs[name].meanPlanetLongitude,
   meanSunLongitude:result.cheshtaInputs[name].meanSunLongitude,
   trueLongitude:result.cheshtaInputs[name].truePlanetLongitude,
   cheshtaVirupa:result.cheshtaResults[name].virupa
  }])),
  yuddha:result.yuddhaEvidence.pairs,
  unresolvedYuddha:result.yuddhaEvidence.unresolved
 });
}
assert.equal(records.length,EXPECTED,'one seeded-random natal per year 1800–2399');
assert.equal(stats.charts,600);
assert.equal(stats.grahaRows,4200);
assert.equal(stats.componentValues,25200);
assert.equal(stats.cheshtaRows,3000);
assert.equal(stats.yuddhaPairs,6000);
assert.equal(stats.kalaReconciliationFailures,0);
assert.equal(stats.sixBalaReconciliationFailures,0);

fs.mkdirSync('artifacts',{recursive:true});
const report={
 pass:true,status:'PASS_600_RANDOM_NATAL_TRUE_BPHS_RESEARCH_ONLY',
 seed:'0x'+SEED.toString(16).toUpperCase(),
 randomization:'xorshift32; deterministic sampling with replacement; one birth date/time/place per year',
 interval:'1800-01-01 through 2399-12-31',
 engine:'TRUE_BPHS_SHADBALA_NAELOS_DE440',
 ephemeris:'NAELOS Ephemeris 0.1.3 / NASA-JPL DE440',
 tableIntegrityVerified:engine.tableIntegrityVerified,
 tables:engine.loadedTables,
 samplingScope:records.length,
 aggregate:stats,
 uniqueIndianPlaces:placeCounts.size,
 placeDistribution:Object.fromEntries([...placeCounts].sort((a,b)=>a[0].localeCompare(b[0]))),
 classicalCertified:false,productionIntegrationAllowed:false,
 limitations:[
  '600 seeded-random charts are coverage evidence, not all possible birth instants.',
  'NAELOS supplies modern DE440 apparent True Longitude; this does not certify a historical Saura True Longitude theory.',
  'The combined Mean / True / Sheeghroccheya frame transfer is explicitly modelled, not an archival certificate for each natal epoch.',
  'All results remain research-only; no production calculation path or cache is changed.'
 ],
 records
};
fs.writeFileSync('artifacts/true-bphs-600-random-natal-charts-1800-2399.json',
 JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({
 pass:report.pass,status:report.status,seed:report.seed,
 engine:report.engine,source:report.ephemeris,aggregate:report.aggregate,
 uniqueIndianPlaces:report.uniqueIndianPlaces,
 artifact:'artifacts/true-bphs-600-random-natal-charts-1800-2399.json',
 classicalCertified:false,productionIntegrationAllowed:false
},null,2));
