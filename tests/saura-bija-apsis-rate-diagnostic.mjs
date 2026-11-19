import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  SAURA_BIJA_CORRECTED_METADATA
} from '../research/saura-bija/saura-bija-mean-motion.mjs';
import {
  SAURA_EPICYCLE_SIZES
} from '../public/horoscope/offline/saura-classical-true-longitude.browser.mjs';

const norm=x=>((x%360)+360)%360;
const signed=(a,b)=>((a-b+540)%360)-180;
const BODIES=['Mercury','Venus','Mars','Jupiter','Saturn'];
const EXPECTED_REVOLUTIONS={Sun:387,Mercury:368,Venus:535,Mars:204,Jupiter:900,Saturn:39};
const EXPECTED_KALI={
  Sun:2*30+17+7/60+48/3600,
  Mercury:7*30+10+19/60+12/3600,
  Venus:2*30+19+39/60,
  Mars:4*30+9+57/60+36/3600,
  Jupiter:5*30+21,
  Saturn:7*30+26+36/60+36/3600
};
const EXPECTED_EPICYCLES={
  Mercury:{manda:[30,28],sighra:[133,132]},
  Venus:{manda:[12,11],sighra:[262,260]},
  Mars:{manda:[75,72],sighra:[235,232]},
  Jupiter:{manda:[33,32],sighra:[70,72]},
  Saturn:{manda:[49,48],sighra:[39,40]}
};
// Burgess 1860, table "Resulting position / True position / Error of Hindu position",
// A.D. 1850, degrees and arcminutes. The Venus signed error is intentionally
// retained as printed (-211°45′), not normalized into a misleading short angle.
const BURGESS_1850={
  Sun:{siddhanta:[95,4],biot:[100,22],error:[-5,-16]},
  Mercury:{siddhanta:[238,15],biot:[255,7],error:[-16,-52]},
  Venus:{siddhanta:[97,39],biot:[309,24],error:[-211,-45]},
  Mars:{siddhanta:[147,49],biot:[153,18],error:[-5,-29]},
  Jupiter:{siddhanta:[189,9],biot:[191,55],error:[-2,-46]},
  Saturn:{siddhanta:[254,24],biot:[270,6],error:[-15,-42]}
};
const physicalAphelionInterpretation={
  Mercury:{comparable:false,reason:'2023 study says the physical identity of inner-planet Manda is unknown; do not equate it to modern heliocentric aphelion'},
  Venus:{comparable:false,reason:'2023 study says the physical identity of inner-planet Manda is unknown; do not equate it to modern heliocentric aphelion'},
  Mars:{comparable:true,reason:'Outer-planet comparison proposed in Narayanan & Oak 2023; still an interpretation, not proof of model identity'},
  Jupiter:{comparable:true,reason:'Outer-planet comparison proposed in Narayanan & Oak 2023; still an interpretation, not proof of model identity'},
  Saturn:{comparable:true,reason:'Outer-planet comparison proposed in Narayanan & Oak 2023; still an interpretation, not proof of model identity'}
};
const fixture=JSON.parse(fs.readFileSync(
  new URL('./fixtures/saura-bija-jpl-de441-heliocentric-elements-annual-1800-2399.json',import.meta.url),
  'utf8'
));

assert.equal(fixture.source,'NASA/JPL Horizons API');
assert.equal(fixture.ephemeris,'DE441');
assert.equal(fixture.ephemerisType,'ELEMENTS');
assert.equal(fixture.centerBody,'Sun (10)');
assert.equal(fixture.referencePoint,'planetary-system barycentres');
assert.equal(fixture.referenceFrame,'Ecliptic of J2000.0 (ICRF)');
assert.equal(fixture.timeScale,'TDB');
assert.equal(fixture.interval.start,'1800-01-01');
assert.equal(fixture.interval.stop,'2400-01-01');
assert.equal(fixture.interval.step,'1 y');

for(const body of Object.keys(EXPECTED_REVOLUTIONS)){
  assert.equal(
    SAURA_BIJA_CORRECTED_METADATA.apsisRevolutionsPerKalpa[body],
    EXPECTED_REVOLUTIONS[body],
    body+' Surya Siddhanta apsis revolution count per Kalpa'
  );
  assert.ok(
    Math.abs(SAURA_BIJA_CORRECTED_METADATA.apsisKaliEpochLongitude[body]-EXPECTED_KALI[body])<1e-11,
    body+' 3102 BCE Sūrya-Siddhānta Kali-epoch apsis longitude from Burgess table'
  );
}
for(const body of BODIES){
  assert.deepEqual(SAURA_EPICYCLE_SIZES[body],EXPECTED_EPICYCLES[body],
    body+' Burgess II.34–37 even/odd Manda and Sighra epicycle sizes');
  assert.equal(fixture.bodies[body].targetEphemeris,'DE441');
  assert.equal(fixture.bodies[body].rows.length,600);
  assert.equal(fixture.bodies[body].rows[0].year,1800);
  assert.equal(fixture.bodies[body].rows.at(-1).year,2399);
}

function dms([degrees,minutes]){
  return degrees+minutes/60;
}
for(const [body,source] of Object.entries(BURGESS_1850)){
  const actual=dms(source.siddhanta)-dms(source.biot);
  // The two source position columns and the printed error are each rounded
  // to whole arcminutes; keep the original unwrapped signed difference.
  assert.ok(Math.abs(actual-dms(source.error))<0.04,
    body+' Burgess 1850 printed Hindu-vs-Biot apsis position error');
}

function unwrapApsis(rows){
  const longitudes=rows.map(row=>norm(row.ascendingNodeDegrees+
    row.argumentOfPerifocusDegrees+180));
  const unwrapped=[longitudes[0]];
  for(let i=1;i<longitudes.length;i++){
    unwrapped.push(unwrapped[i-1]+signed(longitudes[i],longitudes[i-1]));
  }
  return {longitudes,unwrapped};
}
function fitTrend(rows,unwrapped){
  const x=rows.map(row=>row.year);
  const n=x.length;
  const xBar=x.reduce((a,v)=>a+v,0)/n;
  const yBar=unwrapped.reduce((a,v)=>a+v,0)/n;
  const covariance=x.reduce((a,v,i)=>a+(v-xBar)*(unwrapped[i]-yBar),0);
  const variance=x.reduce((a,v)=>a+(v-xBar)**2,0);
  const slope=covariance/variance;
  const residuals=unwrapped.map((v,i)=>v-(yBar+slope*(x[i]-xBar)));
  const rms=Math.sqrt(residuals.reduce((a,v)=>a+v*v,0)/n);
  return {
    slopeDegreesPerYear:slope,
    slopeDegreesPer1000Years:slope*1000,
    fittedResidualRmsDegrees:rms,
    fittedResidualMaxAbsDegrees:Math.max(...residuals.map(Math.abs))
  };
}

const report={
  pass:true,
  scope:'600 annual osculating-element epochs, 1800-01-01 through 2399-01-01; not a daily ephemeris audit',
  classicalSource:{
    apsisRevolutionsPerKalpa:EXPECTED_REVOLUTIONS,
    kaliEpochLongitudesDegrees:EXPECTED_KALI,
    kaliEpochSource:'Burgess 1860 table: positions at commencement of Iron Age 3102 BCE, Sūrya-Siddhānta column',
    '1850SourceComparison':BURGESS_1850,
    '1850Meaning':'Burgess printed Siddhanta-calculated apsis positions beside Biot true positions; these are source-model discrepancies already documented in 1860, not regression failures of this implementation.',
    epicycleSizes:EXPECTED_EPICYCLES,
    epicycleInterpolation:'Even quadrant size − (even − odd) × |sin(kendra)|, per Sūrya-Siddhānta II.38'
  },
  jplSource:{
    source:'NASA/JPL Horizons DE441',
    ephemerisType:'GEOMETRIC osculating heliocentric elements',
    center:'Sun (10)',
    frame:'Ecliptic J2000.0 / ICRF',
    aphelionLongitudeFormula:'normalize(OM + W + 180°)',
    note:'These are instantaneous osculating elements; their secular linear fit is a diagnostic over the selected 600-year interval, not a timeless physical constant.'
  },
  perPlanet:{},
  productionChanged:false
};

for(const body of BODIES){
  const item=fixture.bodies[body];
  const rows=item.rows;
  assert.equal(item.targetEphemeris,'DE441');
  const {longitudes,unwrapped}=unwrapApsis(rows);
  const trend=fitTrend(rows,unwrapped);
  const revolutionCount=EXPECTED_REVOLUTIONS[body];
  const ssRateDegreesPer1000Years=360*revolutionCount/4_320_000_000*1000;
  const modernRate=trend.slopeDegreesPer1000Years;
  report.perPlanet[body]={
    target:item.target,
    targetName:item.targetName,
    samples:rows.length,
    firstJ2000ApsisLongitude:+longitudes[0].toFixed(6),
    lastJ2000ApsisLongitude:+longitudes.at(-1).toFixed(6),
    unwrappedNetMotion600Years:+(unwrapped.at(-1)-unwrapped[0]).toFixed(6),
    de441OsculatingLinearTrendDegreesPer1000Years:+modernRate.toFixed(6),
    traditionalSiddhantaRateDegreesPer1000Years:+ssRateDegreesPer1000Years.toFixed(6),
    modernOverTraditionalRateRatio:+(modernRate/ssRateDegreesPer1000Years).toFixed(2),
    fitResidualRmsDegrees:+trend.fittedResidualRmsDegrees.toFixed(6),
    fitResidualMaxAbsDegrees:+trend.fittedResidualMaxAbsDegrees.toFixed(6),
    physicalAphelionComparable:physicalAphelionInterpretation[body].comparable,
    interpretation:physicalAphelionInterpretation[body].reason
  };
}

report.forensicConclusion={
  sourceFaithfulness:'The present Kali-epoch apsis longitudes and Kalpa revolution counts reproduce the Sūrya-Siddhānta-specific values printed by Burgess; they are not copied from another Siddhanta epoch family.',
  historicalLimitation:'Burgess himself documented substantial 1850 apsis-position differences from Biot and explained that Siddhanta apsis motions were not intended as readily observable physical precession rates.',
  innerPlanets:'Do not infer Mercury or Venus Manda is the heliocentric physical aphelion. Their physical interpretation remains unresolved in the 2023 comparative study.',
  outerPlanets:'Mars/Jupiter/Saturn may be compared with heliocentric aphelia as a research hypothesis, but the JPL osculating trends are interval-dependent and Jupiter/Saturn show larger long-period departures from a straight-line fit.',
  noCalibration:'Do not replace traditional apsis rates with DE441 fitted rates. Preserve the classical outputs as a named historical model and use DE441 as a separate modern reference.'
};
console.log(JSON.stringify(report));
