import assert from 'node:assert/strict';
import { computeClassicalFiveNatalCheshta } from '../public/horoscope/offline/saura-natal-five-cheshta.browser.mjs';
import { sauraTabularFourPassTrueLongitude } from '../public/horoscope/offline/saura-classical-tabular-jya.browser.mjs';

const births=[
  ['1971-05-04','05:05'],
  ['1974-01-11','16:04'],
  ['1992-07-31','22:05'],
  ['1994-06-15','13:03'],
  ['2015-09-06','09:30']
];
const paper2024={
 Mercury:[353.2261,220.4772,151.249,.738],
 Venus:[353.2261,79.8785,328.7388,343.9867],
 Mars:[295.0651,130.0471,353.2261,319.9003],
 Jupiter:[31.7206,171.3844,353.2261,28.2115],
 Saturn:[316.5202,236.6267,353.2261,313.0236]
};
const angle=(a,b)=>Math.abs((((a-b)%360)+540)%360-180);
let assertions=0;
const check=(condition,message)=>{assert.ok(condition,message);assertions++;};

const natal=[];
for(const [date,time] of births){
  const result=computeClassicalFiveNatalCheshta({date,time,utcOffsetMinutes:330});
  check(result.calculationAvailable===true,date+' research calculation completes');
  check(result.referenceFrame==='traditional-Saura-nirayana',date+' uses canonical Saura sidereal frame');
  check(result.historicalTrueLongitudeEvidence?.meanTrueSheeghrochaFrameConsistent===true,
    date+' mean/true/Sheeghrocccha frame metadata agrees');
  check(result.historicalTrueLongitudeEvidence?.historicalBijaCorrectionsVerified===false,
    date+' missing historical Bija is not hidden');
  check(result.historicalTrueLongitudeEvidence?.independentHistoricalTrueLongitudeOracles===0,
    date+' absence of independent historical oracle is explicit');
  check(result.natalHistoricalNumericalCertified===false&&result.productionIntegrationAllowed===false,
    date+' research result cannot enter production');
  check(result.planets.length===5,date+' exactly five non-luminary planets');
  const rows=[];
  for(const p of result.planets){
    check(p.frameCompatible===true,date+' '+p.planet+' mean/true/Sheeghrocccha frame IDs are identical');
    check(p.meanLongitudeFrameId===p.trueLongitudeFrameId&&
      p.trueLongitudeFrameId===p.sheeghroccchaLongitudeFrameId,
      date+' '+p.planet+' exact frame-ID equality');
    check(Number.isFinite(p.trueLongitude)&&p.trueLongitude>=0&&p.trueLongitude<360,
      date+' '+p.planet+' candidate true longitude is finite and normalized');
    check(Number.isFinite(p.cheshtaVirupa)&&p.cheshtaVirupa>=0&&p.cheshtaVirupa<=60,
      date+' '+p.planet+' research Cheshta stays inside 0..60 Virupa');
    check(p.mathematicalCrossCheckPass===true&&p.continuousVs24JyaErrorDegrees<=0.05,
      date+' '+p.planet+' continuous vs 24-Jya arithmetic cross-check');
    check(p.certified===false,date+' '+p.planet+' not labelled historically certified');
    rows.push({
      planet:p.planet,
      meanLongitude:+p.meanLongitude.toFixed(6),
      trueLongitude:+p.trueLongitude.toFixed(6),
      sheeghrocccha:+p.sheeghrocha.toFixed(6),
      cheshtaVirupa:+p.cheshtaVirupa.toFixed(6),
      frameCompatible:p.frameCompatible,
      continuousVs24JyaErrorDegrees:+p.continuousVs24JyaErrorDegrees.toFixed(8),
      certified:p.certified
    });
  }
  natal.push({date,time,referenceFrame:result.referenceFrame,planets:rows});
}
const paperRows=[];
for(const [planet,[meanLongitude,mandocca,sheeghrocccha,publishedTrue]] of Object.entries(paper2024)){
  const result=sauraTabularFourPassTrueLongitude({planet,meanLongitude,mandocca,sheeghrocccha});
  const error=angle(result.trueLongitude,publishedTrue);
  paperRows.push({planet,publishedTrue,computedTrue:+result.trueLongitude.toFixed(6),
    differenceDegrees:+error.toFixed(6),within005Degrees:error<=0.05});
}
const strictMatches=paperRows.filter(x=>x.within005Degrees).length;
check(strictMatches===1,'only one of five 2024 published true-longitude values passes the strict 0.05-degree threshold');
check(natal.length===5&&natal.every(x=>x.planets.length===5),'25 five-graha natal research rows completed');

console.log(JSON.stringify({
  pass:true,assertions,
  scope:'same-frame Saura research and independent published-oracle challenge; no natal certification',
  natalCharts:natal.length,natalPlanetRows:natal.reduce((n,x)=>n+x.planets.length,0),
  referenceFrame:'traditional-Saura-nirayana',
  all25MeanTrueSheeghroccchaFrameIDsEqual:true,
  continuousVs24JyaCrossCheckToleranceDegrees:0.05,
  published2024OracleRows:paperRows,published2024StrictMatches:strictMatches,
  historicalBijaCorrectionsVerified:false,independentHistoricalNatalTrueLongitudeOracles:0,
  natalHistoricalNumericalCertified:false,productionIntegrationAllowed:false,results:natal
}));
