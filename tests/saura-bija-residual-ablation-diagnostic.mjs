import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  sauraOriginalMeanOrbitalLongitude,
  sauraBijaCorrectedMeanOrbitalLongitude,
  sauraBijaCorrectedFivePlanetInputs,
  sauraBijaCorrectedMandoccaLongitude,
  sauraBijaCorrectedTrueLongitudeResearch
} from '../research/saura-bija/saura-bija-mean-motion.mjs';
import {
  sauraFourPassTrueLongitude,
  sauraMandoccaResearch
} from '../public/horoscope/offline/saura-classical-true-longitude.browser.mjs';
import {
  sauraSiderealOffsetFromLahiri
} from '../research/saura-bija/saura-de441-apparent-true.mjs';
import { getSwe } from '../public/horoscope/offline/wasm-provider.mjs';

const norm=x=>((x%360)+360)%360;
const signed=(a,b)=>((a-b+540)%360)-180;
const absAngle=(a,b)=>Math.abs(signed(a,b));
const jd=(year)=>Date.UTC(year,0,1)/86400000+2440587.5;
const BASE_SAURA_ZERO=18+5/60+8.25/3600;
const BODIES=['Mercury','Venus','Mars','Jupiter','Saturn'];
const GEOMETRIES=['verse39-direct-jya','common-plus','alternate-minus','absolute-koti-minus'];
const CENTURIES=['1800-1899','1900-1999','2000-2399'];
const centuryOf=y=>y<1900?'1800-1899':y<2000?'1900-1999':'2000-2399';
const fixture=JSON.parse(fs.readFileSync(
  new URL('./fixtures/saura-bija-jpl-de441-annual-1800-2399.json',import.meta.url),'utf8'
));
assert.equal(fixture.ephemeris,'DE441');
assert.equal(fixture.centerBody,'Earth (399)');
assert.equal(fixture.referencePoint,'planetary-system barycentres');

const swe=await getSwe();
swe.setSiderealLahiri();
const lahiri1860=swe.ayanamsa(jd(1860));

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
function summarizeDeltas(values){
  const abs=values.map(Math.abs).sort((a,b)=>a-b);
  const signedMean=values.reduce((a,b)=>a+b,0)/values.length;
  return {
    meanSignedDelta:+signedMean.toFixed(8),
    rmsDelta:+Math.sqrt(values.reduce((a,b)=>a+b*b,0)/values.length).toFixed(8),
    p95AbsDelta:+abs[Math.ceil(abs.length*.95)-1].toFixed(8),
    maxAbsDelta:+abs.at(-1).toFixed(8)
  };
}
function chosenInputs(jdUt,body,raw=false){
  const sun=raw
    ? sauraOriginalMeanOrbitalLongitude(jdUt,'Sun')
    : sauraBijaCorrectedMeanOrbitalLongitude(jdUt,'Sun');
  const own=raw
    ? sauraOriginalMeanOrbitalLongitude(jdUt,body)
    : sauraBijaCorrectedMeanOrbitalLongitude(jdUt,body);
  const inner=body==='Mercury'||body==='Venus';
  return {meanLongitude:inner?sun:own,sheeghrocca:inner?own:sun};
}
function trueAt(body,meanLongitude,sheeghrocca,mandocca,geometry){
  return sauraFourPassTrueLongitude({
    planet:body,meanLongitude,sheeghrocca,mandocca,
    mandaKarṇaConvention:geometry
  });
}
const report={
  pass:true,
  interval:'1800-01-01..2399-01-01 annual epochs',
  ephemeris:'DE441',
  samplesPerPlanet:600,
  frameReference:{
    lahiriAyanamsaAt1860Degrees:+lahiri1860.toFixed(9),
    burgessSauraZeroPointAt1860Degrees:+BASE_SAURA_ZERO.toFixed(9),
    fixedCalibrationDifferenceDegrees:+(BASE_SAURA_ZERO-lahiri1860).toFixed(9),
    currentTransfer:'Burgess Saura zero at 1860 + Lahiri(date) - Lahiri(1860)',
    comparisonTransferNote:'Frame variants below are diagnostic alternatives only; no fitted offset is accepted as a correction.'
  },
  perPlanet:{},
  productionChanged:false
};

for(const body of BODIES){
  const records=fixture.bodies[body].rows;
  assert.equal(records.length,600);
  assert.equal(fixture.bodies[body].targetEphemeris,'DE441');
  const variantErrors={
    currentBijaKaliMandoccaVerse39:[],
    rawMeanSameMandoccaVerse39:[],
    bijaMeanLegacy2024MandoccaVerse39:[],
    geometry:{},
    frame:{}
  };
  const signals={
    rawMinusBijaMeanLongitude:[],
    rawMinusBijaSheeghrocca:[],
    legacy2024MinusKaliMandocca:[],
    geometryLongitudeDelta:{},
    lahiriFrameMinusSauraFrame:[]
  };
  for(const key of GEOMETRIES) {
    variantErrors.geometry[key]=[];
    signals.geometryLongitudeDelta[key]=[];
  }
  variantErrors.frame.fixed1860SauraZero=[];
  variantErrors.frame.pureLahiriAyanamsa=[];

  for(const row of records){
    const at=jd(row.year);
    const inputs=sauraBijaCorrectedFivePlanetInputs(at,body);
    const bija=chosenInputs(at,body,false);
    const raw=chosenInputs(at,body,true);
    const apsis=sauraBijaCorrectedMandoccaLongitude(at,body);
    const legacy=sauraMandoccaResearch(at,body).mandocca;
    const currentTrue=trueAt(body,bija.meanLongitude,bija.sheeghrocca,apsis.mandocca,'verse39-direct-jya');
    const current=currentTrue.trueLongitude;
    const lahiriAtDate=swe.ayanamsa(at);
    const sauraOffset=sauraSiderealOffsetFromLahiri(lahiriAtDate,lahiri1860);
    const jplSaura=norm(row.longitude-sauraOffset);
    const baselineError=signed(current,jplSaura);

    variantErrors.currentBijaKaliMandoccaVerse39.push(baselineError);

    const rawTrue=trueAt(body,raw.meanLongitude,raw.sheeghrocca,apsis.mandocca,'verse39-direct-jya');
    variantErrors.rawMeanSameMandoccaVerse39.push(signed(rawTrue.trueLongitude,jplSaura));
    signals.rawMinusBijaMeanLongitude.push(signed(raw.meanLongitude,bija.meanLongitude));
    signals.rawMinusBijaSheeghrocca.push(signed(raw.sheeghrocca,bija.sheeghrocca));

    const legacyTrue=trueAt(body,bija.meanLongitude,bija.sheeghrocca,legacy,'verse39-direct-jya');
    variantErrors.bijaMeanLegacy2024MandoccaVerse39.push(signed(legacyTrue.trueLongitude,jplSaura));
    signals.legacy2024MinusKaliMandocca.push(signed(legacy,apsis.mandocca));

    for(const geometry of GEOMETRIES){
      const result=trueAt(body,bija.meanLongitude,bija.sheeghrocca,apsis.mandocca,geometry);
      const error=signed(result.trueLongitude,jplSaura);
      variantErrors.geometry[geometry].push(error);
      signals.geometryLongitudeDelta[geometry].push(signed(result.trueLongitude,current));
    }

    const fixedJplSaura=norm(row.longitude-BASE_SAURA_ZERO);
    variantErrors.frame.fixed1860SauraZero.push(signed(current,fixedJplSaura));
    const pureLahiriJplSaura=norm(row.longitude-lahiriAtDate);
    variantErrors.frame.pureLahiriAyanamsa.push(signed(current,pureLahiriJplSaura));
    signals.lahiriFrameMinusSauraFrame.push(signed(pureLahiriJplSaura,jplSaura));
  }
  const base=variantErrors.currentBijaKaliMandoccaVerse39;
  const baseStats=summarize(base);
  const compare=values=>{
    const stats=summarize(values);
    return {
      ...stats,
      rmsChangeVsCurrent:+(stats.rms-baseStats.rms).toFixed(6),
      maxAbsChangeVsCurrent:+(stats.maxAbs-baseStats.maxAbs).toFixed(6)
    };
  };
  report.perPlanet[body]={
    baseline:baseStats,
    ablations:{
      meanMotion:{rawUncorrectedCountsSameMandaAndFrame:compare(variantErrors.rawMeanSameMandoccaVerse39),
        inputDelta:{meanLongitude:summarizeDeltas(signals.rawMinusBijaMeanLongitude),
          sheeghrocca:summarizeDeltas(signals.rawMinusBijaSheeghrocca)}},
      mandocca:{legacy2024AnchorExtrapolationSameMeanGeometry:compare(variantErrors.bijaMeanLegacy2024MandoccaVerse39),
        inputDelta:summarizeDeltas(signals.legacy2024MinusKaliMandocca)},
      geometry:Object.fromEntries(GEOMETRIES.map(key=>[key,{
        residual:compare(variantErrors.geometry[key]),
        trueLongitudeDeltaFromDirectJya:summarizeDeltas(signals.geometryLongitudeDelta[key])
      }])),
      coordinateFrame:{
        fixed1860SauraZeroPoint:compare(variantErrors.frame.fixed1860SauraZero),
        pureLahiriAyanamsa:compare(variantErrors.frame.pureLahiriAyanamsa),
        pureLahiriMinusCalibratedSauraOffset:summarizeDeltas(signals.lahiriFrameMinusSauraFrame)
      }
    }
  };
}

const diagnosticInterpretation={
  meanMotion:'Raw-count ablation changes only the mean/śīghrocca input pair. It is not a fitted alternative.',
  mandocca:'Legacy 2024-anchor ablation changes only the Mandocca series; compare with Kali-epoch source-derived values.',
  geometry:'Alternative global geometry conventions are diagnostics, not selected corrections. All five planets use the same convention in each run.',
  coordinateFrame:'Fixed Saura zero and pure Lahiri are frame alternatives. A constant offset must not be silently tuned to improve residuals.'
};
report.methodology=diagnosticInterpretation;
console.log(JSON.stringify(report));
