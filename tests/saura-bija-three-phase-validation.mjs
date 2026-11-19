import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  sauraOriginalMeanOrbitalLongitude,
  sauraBijaCorrectedMeanOrbitalLongitude,
  sauraBijaCorrectedMandoccaLongitude,
  sauraBijaCorrectedTrueLongitudeResearch,
  SAURA_BIJA_CORRECTED_METADATA as META
} from '../research/saura-bija/saura-bija-mean-motion.mjs';
import { getSwe, C } from '../public/horoscope/offline/wasm-provider.mjs';

const norm = x => ((x % 360) + 360) % 360;
const signedAngle = (a,b) => ((a-b+540)%360)-180;
const absAngle = (a,b) => Math.abs(signedAngle(a,b));
const dms = ([sign,degree,minute,second]) =>
  sign*30 + degree + minute/60 + second/3600;
const jd = (year,month=1,day=1) =>
  Date.UTC(year,month-1,day,0,0,0)/86400000 + 2440587.5;
const close = (actual,expected,tolerance,label) =>
  assert.ok(Number.isFinite(actual) && absAngle(actual,expected)<=tolerance,
    label+' actual='+actual+' expected='+expected+' delta='+absAngle(actual,expected));

let phaseAChecks=0, phaseBChecks=0, phaseCChecks=0;

// PHASE A — exact reconstruction of Burgess 1860 raw/corrected table.
// Ujjain midnight on 1860-01-01 corresponds to 00:00 local mean time;
// the engine input is UTC Julian day and applies the Ujjain meridian itself.
const ujjainOffset=(75+46/60)/360;
const jd1860UjjainMidnight=jd(1860)-ujjainOffset;
const printed1860={
  Sun:{raw:[8,17,48,7],corrected:[8,17,48,7]},
  Mercury:{raw:[4,15,13,8],corrected:[4,8,36,16]},
  Venus:{raw:[10,21,8,59],corrected:[10,16,11,22]},
  Mars:{raw:[5,24,17,36],corrected:[5,24,17,36]},
  Jupiter:{raw:[2,26,0,7],corrected:[2,22,41,41]},
  Saturn:{raw:[3,20,11,12],corrected:[3,25,8,50]}
};
const phaseA=[];
for(const [body,printed] of Object.entries(printed1860)){
  const raw=sauraOriginalMeanOrbitalLongitude(jd1860UjjainMidnight,body);
  const corrected=sauraBijaCorrectedMeanOrbitalLongitude(jd1860UjjainMidnight,body);
  const rawErrorArcsec=absAngle(raw,dms(printed.raw))*3600;
  const correctedErrorArcsec=absAngle(corrected,dms(printed.corrected))*3600;
  close(raw,dms(printed.raw),1.5/3600,body+' raw 1860 Burgess source table <=1.5 arcsec');
  close(corrected,dms(printed.corrected),1.5/3600,body+' Bija 1860 Burgess corrected table <=1.5 arcsec');
  phaseAChecks+=2;
  phaseA.push({body,rawLongitude:+raw.toFixed(8),printedRaw:dms(printed.raw),
    rawErrorArcsec:+rawErrorArcsec.toFixed(4),
    bijaMeanLongitude:+corrected.toFixed(8),printedBija:dms(printed.corrected),
    bijaErrorArcsec:+correctedErrorArcsec.toFixed(4)});
}

// PHASE B — derive Mandocca from Kali epoch longitude + Surya Siddhanta
// Kalpa revolution counts, then reproduce a modern published anchor set.
const mandocca2024={
  Mercury:220.4772, Venus:79.8785, Mars:130.0471,
  Jupiter:171.3844, Saturn:236.6267
};
const jd2024=2460409.5;
const phaseB=[];
for(const body of Object.keys(mandocca2024)){
  const result=sauraBijaCorrectedMandoccaLongitude(jd2024,body);
  close(result.mandocca,mandocca2024[body],0.00005,
    body+' Kali-epoch/kalpa Mandocca reconstruction matches 2024 published anchor');
  assert.equal(result.frame,'traditional-Saura-nirayana');
  assert.equal(result.productionEligible,false);
  phaseBChecks+=3;
  phaseB.push({body,kaliEpochLongitude:META.apsisKaliEpochLongitude[body],
    apsisRevolutionsPerKalpa:META.apsisRevolutionsPerKalpa[body],
    derived2024Mandocca:+result.mandocca.toFixed(8),
    published2024Mandocca:mandocca2024[body],
    errorArcsec:+(absAngle(result.mandocca,mandocca2024[body])*3600).toFixed(4)});
}

// PHASE C — compare every annual sample 1800..2399 (3,000 planet/year rows)
// with JPL Horizons geocentric apparent ecliptic-of-date positions.
// JPL output is tropical IAU76/80 ecliptic-of-date. Carry the historical
// Saura zero-point of 18°05'08.25" at 1860-01-01 using Lahiri precession
// progression, and compare both longitudes in that same transferred frame.
const fixture=JSON.parse(fs.readFileSync(
  new URL('./fixtures/saura-bija-jpl-de441-annual-1800-2399.json',import.meta.url),
  'utf8'
));
assert.equal(fixture.ephemeris,'DE441');
assert.equal(fixture.centerBody,'Earth (399)');
assert.equal(fixture.observerCenter,'500@399');
assert.equal(fixture.quantity,31);
assert.equal(fixture.interval.start,'1800-01-01');
assert.equal(fixture.interval.stop,'2400-01-01');

const swe=await getSwe();
swe.setSiderealLahiri();
const frameEpochJd=jd(1860);
const lahiriAtFrameEpoch=swe.ayanamsa(frameEpochJd);
const sauraAyanamsaAtEpoch=18 + 5/60 + 8.25/3600;
const centuryOf=year=>year<1900?'1800-1899':year<2000?'1900-1999':'2000-2399';
const statsFor=rows=>{
  const errors=rows.map(x=>x.error);
  const sorted=[...errors].sort((a,b)=>a-b);
  const absSorted=errors.map(Math.abs).sort((a,b)=>a-b);
  const mean=errors.reduce((a,b)=>a+b,0)/errors.length;
  const rms=Math.sqrt(errors.reduce((a,b)=>a+b*b,0)/errors.length);
  return {
    samples:rows.length,
    signedMeanDegrees:+mean.toFixed(6),
    rmsDegrees:+rms.toFixed(6),
    p95AbsoluteDegrees:+absSorted[Math.ceil(absSorted.length*.95)-1].toFixed(6),
    maxAbsoluteDegrees:+Math.max(...absSorted).toFixed(6),
    minSignedDegrees:+sorted[0].toFixed(6),
    maxSignedDegrees:+sorted[sorted.length-1].toFixed(6)
  };
};
const allRows=[], perPlanet={}, perCentury={}, swissFrameRows=[];
const swissBody={Mercury:C.MERCURY,Venus:C.VENUS,Mars:C.MARS,Jupiter:C.JUPITER,Saturn:C.SATURN};
const siderealFlags=swe.siderealSpeedFlags();
for(const body of ['Mercury','Venus','Mars','Jupiter','Saturn']){
  const source=fixture.bodies[body];
  assert.equal(source.rows.length,600,body+' JPL annual reference rows');
  const rows=[];
  for(const reference of source.rows){
    const year=reference.year;
    const at=jd(year);
    const model=sauraBijaCorrectedTrueLongitudeResearch(at,body);
    const lahiriAyanamsa=swe.ayanamsa(at);
    const sauraAyanamsa=sauraAyanamsaAtEpoch+(lahiriAyanamsa-lahiriAtFrameEpoch);
    const jplLahiriLongitude=norm(reference.longitude-lahiriAyanamsa);
    const jplSauraLongitude=norm(reference.longitude-sauraAyanamsa);
    const utc=swe.utcToJd(year,1,1,0,0,0);
    const swiss=swe.calc(utc.et,swissBody[body],siderealFlags);
    if(!swiss || !Number.isFinite(swiss.longitude))
      throw new Error(body+' '+year+' Swiss Lahiri comparison returned invalid longitude');
    const swissVsJplError=signedAngle(swiss.longitude,jplLahiriLongitude);
    swissFrameRows.push({body,year,error:swissVsJplError});
    const error=signedAngle(model.trueLongitude,jplSauraLongitude);
    assert.ok(Number.isFinite(error),body+' '+year+' JPL residual finite');
    assert.ok(model.trueLongitude>=0 && model.trueLongitude<360,
      body+' '+year+' classical true longitude normalized');
    const row={body,year,jplTropicalLongitude:reference.longitude,
      transferredSauraLongitude:jplSauraLongitude,
      modelTrueLongitude:model.trueLongitude,error};
    rows.push(row);
    allRows.push(row);
    phaseCChecks++;
  }
  perPlanet[body]=statsFor(rows);
  perCentury[body]={};
  for(const century of ['1800-1899','1900-1999','2000-2399']){
    perCentury[body][century]=statsFor(rows.filter(x=>centuryOf(x.year)===century));
  }
}
assert.equal(allRows.length,3000,'five planets × 600 years = 3,000 independent JPL comparisons');

const accuracyThresholdDegrees=0.05;
const strictAccuracyGatePass=Object.values(perPlanet)
  .every(x=>x.maxAbsoluteDegrees<=accuracyThresholdDegrees);
const swissFrameStats={};
for(const body of ['Mercury','Venus','Mars','Jupiter','Saturn'])
  swissFrameStats[body]=statsFor(swissFrameRows.filter(x=>x.body===body));
const swissFrameTransferGatePass=Object.values(swissFrameStats)
  .every(x=>x.maxAbsoluteDegrees<=accuracyThresholdDegrees);
const report={
  pass:true,
  phases:{
    A:{pass:true,source:'Burgess 1860 raw and Bija-corrected mean positions',checks:phaseAChecks,rows:phaseA},
    B:{pass:true,source:'Surya Siddhanta I.41-42 and I.57-58 Kali-epoch apsis values and Kalpa revolution counts',checks:phaseBChecks,rows:phaseB},
    C:{completed:true,source:'NASA/JPL Horizons API, DE441, Earth geocentric, quantity 31',
      independentReferenceRows:allRows.length,
      frameTransfer:'Burgess Saura zero-point at 1860-01-01 (18°05′08.25″), carried using Lahiri ayanamsa precession delta',
      accuracyThresholdDegrees,
      strictAccuracyGatePass,
      jplVsSwissLahiriCrossCheck:{pass:swissFrameTransferGatePass,perPlanet:swissFrameStats},
      perPlanet:perPlanet,
      perCentury:perCentury}
  },
  productionChanged:false,
  note:'A passing diagnostic workflow proves source reconstruction and reference comparison coverage; strict accuracy is a separate numeric gate.'
};
console.log(JSON.stringify(report));
