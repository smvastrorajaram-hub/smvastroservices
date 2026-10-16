// V365 independent PRINTED NUMERICAL oracle, NOT self-generated expected data.
// IMD/MoES Positional Astronomy Centre, Rashtriya Panchang 2026-27,
// "Mean Surya Siddhanta Longitude" BEFORE the separately printed Bija column,
// Chaitra 1, 1948 Saka = March 22, 2026 at 05:30 IST (= 00:00 UTC).
// https://packolkata.imd.gov.in/panchang/te/bija_corrections
import assert from 'node:assert/strict';
import {sauraMeanOrbitalLongitude as orbit,sauraMeanDailyMotion as velocity,
  sauraFivePlanetCheshtaInputs as inputs,SAURA_MEAN_MOTION_METADATA as model
} from '../public/horoscope/offline/saura-classical-mean-motion.browser.mjs';
const names=['Sun','Mercury','Venus','Mars','Jupiter','Saturn'];
const official=Object.freeze({
  Sun:[11,4,55,55.74],
  Mercury:[6,4,48,4.79],      // Budha Sighrocca, NOT geocentric Budha
  Venus:[0,29,23,48.06],     // Sukra Sighrocca, NOT geocentric Sukra
  Mars:[10,8,8,37.80],
  Jupiter:[3,0,52,52.68],
  Saturn:[11,10,19,39.50]
});
const rev=Object.freeze({Sun:4320000,Mercury:17937060,Venus:7022376,
                        Mars:2296832,Jupiter:364220,Saturn:146568});
const dms=([s,d,m,sec])=>s*30+d+m/60+sec/3600;
const wrap=x=>((x%360)+360)%360;
const circle=(x,y)=>Math.min(wrap(x-y),wrap(y-x));
const jd=2461121.5;
let count=0;
const check=(x,msg)=>{assert.ok(x,msg);++count;};
const close=(actual,expected,tolerance,msg)=>{
  check(Number.isFinite(actual)&&circle(actual,expected)<=tolerance,
        msg+' actual='+actual+' reference='+expected+' deltaArcsec='+circle(actual,expected)*3600);
};
const evidence=[];
for(const planet of names){
  const expected=dms(official[planet]),actual=orbit(jd,planet);
  const signed=((actual-expected+540)%360)-180;
  close(actual,expected,1.75/3600,planet+' independent IMD printed table within 1.75 arcseconds');
  check(Math.abs(velocity(planet)-360*rev[planet]/1577917828)<1e-12,
        planet+' ancient independent canonical angular rate');
  close(orbit(jd+1577917828,planet),actual,0.000001,
        planet+' exact mahayuga return to mean ecliptic longitude');
  close(orbit(jd+1,planet),wrap(actual+velocity(planet)),0.000001,
        planet+' full day mean-motion continuity');
  evidence.push({planet,imdMeanLongitude:expected,modelLongitude:actual,
    errorArcseconds:signed*3600});
}
for(const planet of ['Mars','Mercury','Jupiter','Venus','Saturn']){
 const r=inputs(jd,planet),sun=orbit(jd,'Sun'),own=orbit(jd,planet);
 close(r.meanLongitude,['Mercury','Venus'].includes(planet)?sun:own,1e-10,
       planet+' BPHS/UK mean selector');
 close(r.sheeghrocha,['Mercury','Venus'].includes(planet)?own:sun,1e-10,
       planet+' BPHS/UK Sheeghrocha selector');
 check(r.frame==='traditional-Saura-nirayana',planet+' correct separate classical frame');
 check(r.liveCheshtaEligible===false&&r.trueLongitudeAvailable===false,
       planet+' explicitly no unsafe automatic Swiss true+Saura mean pairing');
}
// Real Perambalur birth calendar-times: verify deterministic temporal/model
// invariants; DO NOT mislabel these as independent published 1971-2015 oracle.
const charts=[
 ['1994-06-15','13:03'],['2015-09-06','09:30'],
 ['1992-07-31','22:05'],['1971-05-04','05:05'],
 ['1974-01-11','16:04']
];
const exampleResults=[];
for(const [date,time] of charts){
 const [y,m,d]=date.split('-').map(Number),[hh,mi]=time.split(':').map(Number);
 const stamp=Date.UTC(y,m-1,d,hh,mi)-330*60000;
 const testJd=stamp/86400000+2440587.5;
 const record={date,time,jdUt:testJd,planets:{}};
 for(const p of ['Mars','Mercury','Jupiter','Venus','Saturn']){
  const x=inputs(testJd,p);
  for(const key of ['meanLongitude','sheeghrocha']){
   check(Number.isFinite(x[key])&&x[key]>=0&&x[key]<360,
         date+' '+p+' '+key+' finite angle');
  }
  record.planets[p]={
   mean:+x.meanLongitude.toFixed(6),sheeghrocha:+x.sheeghrocha.toFixed(6)
  };
 }
 exampleResults.push(record);
}

// Independently project the published 2026 00:00 UTC uncorrected mean
// ORBITS backwards to actual 1971/1974/1992/1994/2015 birth UTC instants.
// This deliberately never reads the engine's Kali epoch, longitude-meridian,
// anchor output, or orbit calculation: the only shared intrinsic constant is
// Suryasiddhanta's canonical integer revolutions / Mahayuga days. The
// independent NUMBER is the official six-body IMD 2026 printed mean snapshot.
// This is a test of same-model historical MEAN MOTION, not independent
// historical TRUE geocentric longitude/Bija/Mandocca evidence.
const birthExpectedFromOfficial2026=[];
const circleSigned=(x,y)=>(((x-y)%360)+540)%360-180;
const canonicalDays=1577917828;
function independentFromPublished2026(jdUt,planet){
 const publishedMean=dms(official[planet]);
 const elapsed=jdUt-jd;
 const integerOrbitArc=360*rev[planet];
 // Independent baseline + elapsed turns (not engine's Kali-epoch formula);
 // reduce cycles before adding the published longitude.
 const elapsedDegrees=((elapsed*rev[planet])%canonicalDays)/canonicalDays*360;
 return wrap(publishedMean+elapsedDegrees);
}
for(const [date,time] of charts){
 const [y,mo,da]=date.split('-').map(Number);
 const [hh,mm]=time.split(':').map(Number);
 const jdBirth=(Date.UTC(y,mo-1,da,hh,mm)-330*60000)/86400000+2440587.5;
 const row={date,time,utcOffsetMinutes:330,jdUt:jdBirth,
   source:'IMD printed 2026-03-22 uncorrected Saura orbit + canonical independent backward propagation',
   planetOrbits:{}};
 for(const planet of names){
  const projected=independentFromPublished2026(jdBirth,planet),
        live=orbit(jdBirth,planet),
        errorArcseconds=circleSigned(live,projected)*3600;
  close(live,projected,1.75/3600,
    date+' '+planet+' official-origin independent 1971-2015 mean check within 1.75 arcseconds');
  row.planetOrbits[planet]={officialProjectedDegrees:+projected.toFixed(6),
    engineDegrees:+live.toFixed(6),signedErrorArcseconds:+errorArcseconds.toFixed(6)};
 }
 for(const planet of ['Mercury','Venus','Mars','Jupiter','Saturn']){
  const natal=inputs(jdBirth,planet),inner=planet==='Mercury'||planet==='Venus';
  const expectedMean=independentFromPublished2026(jdBirth,inner?'Sun':planet);
  const expectedSighrocca=independentFromPublished2026(jdBirth,inner?planet:'Sun');
  close(natal.meanLongitude,expectedMean,1.75/3600,
    date+' '+planet+' independent published-frame natal mean longitude selector');
  close(natal.sheeghrocha,expectedSighrocca,1.75/3600,
    date+' '+planet+' independent published-frame natal sighrocca selector');
  check(natal.fullShadbalaNumericallyCertified===false&&!natal.liveCheshtaEligible,
    date+' '+planet+' 2026 anchored mean does not certify a natal true longitude');
 }
 birthExpectedFromOfficial2026.push(row);
}
check(birthExpectedFromOfficial2026.length===5 &&
  birthExpectedFromOfficial2026.every(x=>Object.keys(x.planetOrbits).length===6),
  'five real birth UTC instants x six official-anchored mean orbit values');
close(orbit(model.epochJdUt-model.referenceMeridianDegrees/360,'Sun'),0,1e-8,'epoch sun zero');
for(const bad of [NaN,Infinity,-10,2000000000,undefined]){
 assert.throws(()=>inputs(bad,'Mars'),RangeError);count++;
}
for(const bad of ['Rahu','Ketu','Earth',undefined]){
 assert.throws(()=>orbit(jd,bad),RangeError);count++;
}
assert.throws(()=>inputs(jd,'Sun'),RangeError);count++;
check(model.modernSwissOrbitalElementsEquivalent===false&&model.liveCheshtaEligible===false,
      'no live Cheshta or Swiss mean substitution');
console.log(JSON.stringify({
 pass:true,assertions:count,
 printedReference:'India Meteorological Department 2026-03-22 05:30 IST UNCORRECTED Surya Siddhanta mean longitude',
 externalMeanOraclePlanets:6,externalFivePlanetMeanAndSheeghrochaMapping:true,
 toleranceArcseconds:1.75,maxAbsErrorArcseconds:Math.max(...evidence.map(x=>Math.abs(x.errorArcseconds))),
 evidence,perambalurModelDiagnosticsOnly:exampleResults,
 productionCheshtaChanged:false,completeCheshtaNumericalCertification:false
}));
