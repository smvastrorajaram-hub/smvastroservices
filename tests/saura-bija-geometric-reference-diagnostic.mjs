import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  sauraOriginalMeanOrbitalLongitude,
  sauraBijaCorrectedMeanOrbitalLongitude,
  sauraBijaCorrectedMandoccaLongitude
} from '../research/saura-bija/saura-bija-mean-motion.mjs';
import {
  sauraFourPassTrueLongitude,
  sauraMandoccaResearch
} from '../public/horoscope/offline/saura-classical-true-longitude.browser.mjs';
import {
  sauraIau76PrecessionLongitudeFromBurgessEpoch,
  sauraSiderealOffsetFromBurgessIau76,
  sauraSiderealOffsetFromLahiri,
  jplEclipticJ2000VectorToMeanEclipticOfDateLongitude
} from '../research/saura-bija/saura-de441-apparent-true.mjs';
import { getSwe } from '../public/horoscope/offline/wasm-provider.mjs';

const norm=x=>((x%360)+360)%360;
const signed=(a,b)=>((a-b+540)%360)-180;
const jd=year=>Date.UTC(year,0,1)/86400000+2440587.5;
const baseSauraZero=18+5/60+8.25/3600;
const bodies=['Mercury','Venus','Mars','Jupiter','Saturn'];
const geometries=['verse39-direct-jya','common-plus','alternate-minus','absolute-koti-minus'];
const apparent=JSON.parse(fs.readFileSync(
  new URL('./fixtures/saura-bija-jpl-de441-annual-1800-2399.json',import.meta.url),'utf8'
));
const geometric=JSON.parse(fs.readFileSync(
  new URL('./fixtures/saura-bija-jpl-de441-geometric-vectors-annual-1800-2399.json',import.meta.url),'utf8'
));
assert.equal(geometric.ephemeris,'DE441');
assert.equal(geometric.ephemerisType,'VECTORS');
assert.equal(geometric.centerBody,'Earth (399)');
assert.equal(geometric.observerCenter,'500@399');
assert.equal(geometric.referencePoint,'planetary-system barycentres');
assert.equal(geometric.vectorCorrection,'NONE');
assert.equal(geometric.referenceFrame,'Ecliptic of J2000.0 (ICRF axes; IAU76/80 obliquity)');
assert.equal(apparent.ephemeris,'DE441');
assert.equal(apparent.centerBody,'Earth (399)');

const swe=await getSwe();
swe.setSiderealLahiri();
const lahiri1860=swe.ayanamsa(jd(1860));
assert.ok(Math.abs(sauraSiderealOffsetFromBurgessIau76(jd(1860))-baseSauraZero)<1e-10,
  'Burgess zero point must be reproduced at its own epoch');
const precession2020=sauraIau76PrecessionLongitudeFromBurgessEpoch(jd(2020));
assert.ok(Number.isFinite(precession2020)&&precession2020>2&&precession2020<2.5,
  'IAU76 precession of the 1860 equinox is finite and correctly directed');

function summarize(values){
  const abs=values.map(Math.abs).sort((a,b)=>a-b);
  const mean=values.reduce((a,b)=>a+b,0)/values.length;
  const rms=Math.sqrt(values.reduce((a,b)=>a+b*b,0)/values.length);
  return {
    samples:values.length,
    signedMean:+mean.toFixed(6),
    rms:+rms.toFixed(6),
    p95Abs:+abs[Math.ceil(abs.length*.95)-1].toFixed(6),
    maxAbs:+abs.at(-1).toFixed(6)
  };
}
function chosenInputs(at,body,raw=false){
  const sun=raw?sauraOriginalMeanOrbitalLongitude(at,'Sun'):sauraBijaCorrectedMeanOrbitalLongitude(at,'Sun');
  const own=raw?sauraOriginalMeanOrbitalLongitude(at,body):sauraBijaCorrectedMeanOrbitalLongitude(at,body);
  const inner=body==='Mercury'||body==='Venus';
  return {meanLongitude:inner?sun:own,sheeghrocca:inner?own:sun};
}
function trueAt(body,meanLongitude,sheeghrocca,mandocca,geometry){
  return sauraFourPassTrueLongitude({
    planet:body,
    meanLongitude,
    sheeghrocha:sheeghrocca,
    mandocca,
    mandaKarṇaConvention:geometry
  });
}

const report={
  pass:true,
  scope:'Annual checkpoints 1800-01-01 through 2399-01-01; not daily certification',
  geometricReference:{
    source:'NASA/JPL Horizons DE441',
    type:'Earth-geocentric geometric vectors, VEC_CORR=NONE',
    inputFrame:'Ecliptic J2000.0',
    convertedFrame:'Mean ecliptic-of-date using IAU76 precession and mean obliquity',
    siderealOrigin:'Burgess 1860 Hindu sidereal sphere zero point 18°05′08.25″',
    transform:'Ecliptic J2000 vector -> equatorial J2000 -> IAU76 precession -> mean ecliptic of date; subtract Burgess-origin offset'
  },
  precessionChecks:{
    burgessOffsetAt1860:+sauraSiderealOffsetFromBurgessIau76(jd(1860)).toFixed(10),
    burgessOffsetAt2020:+sauraSiderealOffsetFromBurgessIau76(jd(2020)).toFixed(9),
    '1860EquinoxPrecessionAt2020':+precession2020.toFixed(9),
    lahiriAyanamsaAt1860:+lahiri1860.toFixed(9)
  },
  perPlanet:{},
  productionChanged:false
};

for(const body of bodies){
  const vecRows=geometric.bodies[body].rows;
  const appRows=apparent.bodies[body].rows;
  assert.equal(vecRows.length,600,body+' geometric annual rows');
  assert.equal(appRows.length,600,body+' apparent annual rows');
  assert.equal(geometric.bodies[body].targetEphemeris,'DE441');
  assert.equal(apparent.bodies[body].targetEphemeris,'DE441');
  const errors={
    baseline:[],
    rawMean:[],
    legacyMandocca:[],
    geometry:{},
    frame:{
      fixedBurgessZero:[],
      lahiriPropagated:[],
      pureLahiri:[],
      oldLahiriDeltaOffset:[]
    }
  };
  const signals={
    geometricMinusApparent:[],
    lahiriOffsetMinusIau76:[],
    rawMeanInputDelta:[],
    mandoccaLegacyMinusKali:[],
    geometryDelta:{}
  };
  for(const g of geometries){errors.geometry[g]=[];signals.geometryDelta[g]=[];}

  for(let i=0;i<600;i++){
    const row=vecRows[i],app=appRows[i];
    assert.equal(row.year,app.year,body+' geometric/apparent epoch alignment');
    const at=jd(row.year);
    const tropicalGeometric=jplEclipticJ2000VectorToMeanEclipticOfDateLongitude(row,at);
    const tropicalApparent=app.longitude;
    const sauraOffset=sauraSiderealOffsetFromBurgessIau76(at);
    const reference=norm(tropicalGeometric-sauraOffset);
    const apparentMinusGeometric=signed(tropicalApparent,tropicalGeometric);
    signals.geometricMinusApparent.push(apparentMinusGeometric);

    const lahiriAt=swe.ayanamsa(at);
    const lahiriOffset=sauraSiderealOffsetFromLahiri(lahiriAt,lahiri1860);
    signals.lahiriOffsetMinusIau76.push(signed(lahiriOffset,sauraOffset));

    const bija=chosenInputs(at,body,false);
    const raw=chosenInputs(at,body,true);
    const mandocca=sauraBijaCorrectedMandoccaLongitude(at,body).mandocca;
    const oldMandocca=sauraMandoccaResearch(at,body).mandocca;
    const baseline=trueAt(body,bija.meanLongitude,bija.sheeghrocca,mandocca,'verse39-direct-jya').trueLongitude;
    errors.baseline.push(signed(baseline,reference));

    const rawTrue=trueAt(body,raw.meanLongitude,raw.sheeghrocca,mandocca,'verse39-direct-jya').trueLongitude;
    errors.rawMean.push(signed(rawTrue,reference));
    signals.rawMeanInputDelta.push(signed(raw.meanLongitude,bija.meanLongitude));

    const oldMandoccaTrue=trueAt(body,bija.meanLongitude,bija.sheeghrocca,oldMandocca,'verse39-direct-jya').trueLongitude;
    errors.legacyMandocca.push(signed(oldMandoccaTrue,reference));
    signals.mandoccaLegacyMinusKali.push(signed(oldMandocca,mandocca));

    for(const g of geometries){
      const value=trueAt(body,bija.meanLongitude,bija.sheeghrocca,mandocca,g).trueLongitude;
      errors.geometry[g].push(signed(value,reference));
      signals.geometryDelta[g].push(signed(value,baseline));
    }

    errors.frame.fixedBurgessZero.push(signed(baseline,norm(tropicalGeometric-baseSauraZero)));
    errors.frame.lahiriPropagated.push(signed(baseline,norm(tropicalGeometric-lahiriOffset)));
    errors.frame.pureLahiri.push(signed(baseline,norm(tropicalGeometric-lahiriAt)));
    errors.frame.oldLahiriDeltaOffset.push(signed(baseline,norm(tropicalGeometric-
      (baseSauraZero+(lahiriAt-lahiri1860)))));
  }

  const base=summarize(errors.baseline);
  const compare=values=>{
    const stat=summarize(values);
    return {...stat,rmsChangeVsIau76Saura:+(stat.rms-base.rms).toFixed(6),
      maxAbsChangeVsIau76Saura:+(stat.maxAbs-base.maxAbs).toFixed(6)};
  };
  report.perPlanet[body]={
    baselineIau76BurgessFrame:base,
    ablations:{
      rawVsBijaMeanMotion:compare(errors.rawMean),
      old2024MandoccaVsKaliEpoch:compare(errors.legacyMandocca),
      geometry:Object.fromEntries(geometries.map(g=>[g,{
        residual:compare(errors.geometry[g]),
        longitudeDeltaFromDirectJya:summarize(signals.geometryDelta[g])
      }])),
      coordinateFrame:{
        fixedBurgessZeroWithoutPrecession:compare(errors.frame.fixedBurgessZero),
        LahiriPrecessionDeltaProxy:compare(errors.frame.oldLahiriDeltaOffset),
        LahiriAbsoluteAyanamsaWrongOrigin:compare(errors.frame.pureLahiri),
        previousLahiriPropagatedOffset:compare(errors.frame.lahiriPropagated)
      }
    },
    referenceFrameDiagnostics:{
      apparentMinusGeometricTropical:summarize(signals.geometricMinusApparent),
      LahiriProxyOffsetMinusIAU76BurgessOffset:summarize(signals.lahiriOffsetMinusIau76),
      rawMinusBijaMeanInput:summarize(signals.rawMeanInputDelta),
      old2024MandoccaMinusKaliMandocca:summarize(signals.mandoccaLegacyMinusKali)
    }
  };
  assert.ok(report.perPlanet[body].referenceFrameDiagnostics.apparentMinusGeometricTropical.maxAbs<0.1,
    body+' apparent/geometric distinction stays within expected light-time/aberration scale');
}

const mercury2020=geometric.bodies.Mercury.rows.find(r=>r.year===2020);
const knownMercury2020=jplEclipticJ2000VectorToMeanEclipticOfDateLongitude(mercury2020,jd(2020));
assert.ok(Math.abs(signed(knownMercury2020,274.400974286077))<1e-7,
  'Mercury 2020 geometric vector transform known-value check');
report.interpretation={
  frame:'Burgess source zero point is retained; pure Lahiri is a different zodiac origin, not an allowed repair.',
  apparentVsGeometric:'Compare classical geometric true longitude to JPL VEC_CORR=NONE geometric vectors; quantity 31 apparent positions are a separate cross-check.',
  precession:'IAU76 transfer is the primary diagnostic frame; Lahiri delta remains a proxy/alternate until independently proven.',
  modelComponents:'Mean motion, Kali-epoch Mandocca and uniform global geometry are changed one at a time; no planet-specific fitted constants are introduced.'
};
console.log(JSON.stringify(report));
