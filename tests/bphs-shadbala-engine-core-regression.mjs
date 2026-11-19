import assert from 'node:assert/strict';
import { sthanaClassical, pakshaBala } from '../public/horoscope/offline/swiss_vedic.browser.mjs';
import {
  BPHS_SHADBALA_PLANETS,
  BPHS_SHADBALA_REQUIRED_VIRUPA,
  BPHS_SHADBALA_CHESHTA_PLANETS,
  bphsDigBala,
  calculateBphsShadbala
} from '../public/horoscope/offline/bphs-shadbala-engine.browser.mjs';

let checks=0;
const ok=(value,message)=>{assert.ok(value,message);checks++;};
const eq=(actual,expected,message)=>{assert.equal(actual,expected,message);checks++;};
const near=(actual,expected,tolerance,message)=>{
  assert.ok(Number.isFinite(actual)&&Math.abs(actual-expected)<=tolerance,
    message+' actual='+actual+' expected='+expected);
  checks++;
};
const frame='TEST_TRADITIONAL_SIDEREAL_FRAME';
const equatorialFrame='GEOCENTRIC_TROPICAL_EQUATORIAL_OF_DATE';
const epochJdUt=2450000.5;
const longitudes={
  'சூரியன்':300,'சந்திரன்':60,'செவ்வாய்':120,'புதன்':180,
  'குரு':240,'சுக்கிரன்':300,'சனி':0
};
const planets=BPHS_SHADBALA_PLANETS.map((name,index)=>({
  name,longitude:longitudes[name],speed:[1,.8,.5,-.2,.1,.3,.02][index],
  eclipticLatitude:[0,.5,1,-1,.2,-.3,.8][index],
  bhava:index+1,referenceFrameId:frame,
  longitudeFrameId:frame,speedFrameId:frame,eclipticLatitudeFrameId:frame,
  epochJdUt
}));
const bhavas=Array.from({length:12},(_,index)=>({
  house:index+1,longitude:(index+1)*30%360,
  referenceFrameId:frame,epochJdUt
}));
const temporal={
  solarCalendarDay:'1984-06-01',
  apparentSolarHour:12,epochJdUt,solarTimeFrameId:equatorialFrame,
  abdaLord:'குரு',masaLord:'சுக்கிரன்',dinaLord:'சுக்கிரன்',
  horaLord:'சுக்கிரன்',tribhagaLord:'புதன்',
  solarTimeMethod:'independent test fixture',
  sunriseApprox:true
};
const declinations={
  referenceFrameId:equatorialFrame,epochJdUt,
  values:Object.fromEntries(BPHS_SHADBALA_PLANETS.map(name=>[name,0]))
};
const cheshtaInputs=Object.fromEntries(BPHS_SHADBALA_CHESHTA_PLANETS.map((name,index)=>[
  name,{
    meanSunLongitude:170,
    meanPlanetLongitude:[100,190,220,250,310][index],
    truePlanetLongitude:longitudes[name],
    meanSunFrameId:frame,meanPlanetFrameId:frame,
    truePlanetFrameId:frame,sheeghroccaFrameId:frame,epochJdUt
  }
]));
const baseInput={
  planets,bhavas,temporal,declinations,cheshtaInputs,
  yuddha:{reviewed:true,encounters:[]}
};

// Exact Uchcha endpoints reuse the existing BPHS Phase-3 Sthana helper.
const signPositions=Object.fromEntries(BPHS_SHADBALA_PLANETS.map((name,index)=>[name,index]));
const exaltationLongitude={
  'சூரியன்':10,'சந்திரன்':33,'செவ்வாய்':298,'புதன்':165,
  'குரு':95,'சுக்கிரன்':357,'சனி':200
};
const debilitationLongitude={
  'சூரியன்':190,'சந்திரன்':213,'செவ்வாய்':118,'புதன்':345,
  'குரு':275,'சுக்கிரன்':177,'சனி':20
};
for(const name of BPHS_SHADBALA_PLANETS){
  near(sthanaClassical(name,exaltationLongitude[name],1,signPositions).uccha,
    60,1e-9,name+' exact exaltation is 60 Uchcha Virupa');
  near(sthanaClassical(name,debilitationLongitude[name],1,signPositions).uccha,
    0,1e-9,name+' exact debilitation is zero Uchcha Virupa');
}
// Paksha endpoints: new Moon 0°, full Moon 180°; Moon itself doubles.
near(pakshaBala('சந்திரன்',0,0,[]),0,0.001,'Moon Paksha Bala is zero at exact new Moon');
near(pakshaBala('சந்திரன்',0,180,[]),120,0.001,'Moon Paksha Bala is 120 at exact full Moon');
near(pakshaBala('குரு',0,0,[]),0,0.001,'benefic Paksha Bala is zero at new Moon');
near(pakshaBala('குரு',0,180,[]),60,0.001,'benefic Paksha Bala is 60 at full Moon');
near(pakshaBala('சூரியன்',0,0,[]),60,0.001,'malefic Paksha share is 60 at new Moon');
near(pakshaBala('சூரியன்',0,180,[]),0,0.001,'malefic Paksha share is zero at full Moon');

// Dig Bala's exact endpoints: ideal point=60, opposite point=0.
near(bphsDigBala('சூரியன்',300,bhavas,frame,epochJdUt),60,0.001,'Sun Dig Bala maximum at 10th cusp');
near(bphsDigBala('சூரியன்',120,bhavas,frame,epochJdUt),0,0.001,'Sun Dig Bala zero at 180 degrees from ideal point');
near(bphsDigBala('சந்திரன்',120,bhavas,frame,epochJdUt),60,0.001,'Moon Dig Bala maximum at 4th cusp');
assert.throws(()=>bphsDigBala('ராகு',0,bhavas,frame,epochJdUt),RangeError);checks++;
assert.throws(()=>bphsDigBala('சனி',0,bhavas.slice(0,11),frame,epochJdUt),RangeError);checks++;

// The core returns seven BPHS rows, but never claims historical certification.
const result=calculateBphsShadbala(baseInput);
eq(result.available,true,'complete source inputs produce an available research result');
eq(result.method,'BPHS_CH27_ISOLATED_SIX_BALA_ENGINE','dedicated BPHS integration identity');
eq(result.referenceFrameId,frame,'one ecliptic frame is reported');
eq(result.frameConsistent,true,'frame validation passes for a single-frame fixture');
eq(result.epochJdUt,epochJdUt,'one common epoch is reported');
eq(result.solarTimeFrameId,equatorialFrame,'solar-time equatorial frame is reported');
eq(result.declinationFrameId,equatorialFrame,'declination equatorial frame is reported');
eq(result.ahargana,65295,'BPHS Ahargana anchor is surfaced');
eq(Object.keys(result.planets).length,7,'exactly seven classical grahas');
eq(result.classicalCertified,false,'arbitrary natal chart is never self-certified');
eq(result.productionIntegrationAllowed,false,'research core cannot enter production implicitly');
for(const name of BPHS_SHADBALA_PLANETS){
  const row=result.planets[name],c=row.components;
  eq(row.available,true,name+' available');
  eq(row.requiredVirupa,BPHS_SHADBALA_REQUIRED_VIRUPA[name],name+' BPHS required strength');
  near(row.totalVirupa,c.sthana.total+c.dig+c.kala.total+c.cheshta+c.naisargika+c.drik,
    0.002,name+' six Bala sum reconciles');
  near(row.totalRupa,row.totalVirupa/60,0.001,name+' Virupa to Rupa conversion');
  near(row.ratio,row.totalVirupa/row.requiredVirupa,0.001,name+' required-strength ratio');
  eq(row.classicalCertified,false,name+' remains explicitly provisional');
}
near(result.planets['சூரியன்'].components.cheshta,
  result.planets['சூரியன்'].components.kala.ayana,0.001,
  'BPHS Sun Cheshta follows the existing BPHS Ayana rule');
near(result.planets['சந்திரன்'].components.cheshta,
  result.planets['சந்திரன்'].components.kala.paksha,0.001,
  'BPHS Moon Cheshta follows the existing BPHS Paksha rule');
for(const [name,rank] of [
  ['சூரியன்',7],['சந்திரன்',6],['செவ்வாய்',2],['புதன்',3],
  ['குரு',4],['சுக்கிரன்',5],['சனி',1]
]){
  near(result.planets[name].components.naisargika,60*rank/7,1e-12,
    name+' exact BPHS Naisargika fraction');
}

// Frame mismatch is a hard failure, not a numeric result or a warning.
const mixedCheshta=structuredClone(baseInput);
mixedCheshta.cheshtaInputs['குரு'].truePlanetFrameId='OTHER_FRAME';
assert.throws(()=>calculateBphsShadbala(mixedCheshta),/frame/);checks++;
const mixedChart=structuredClone(baseInput);
mixedChart.planets[0].referenceFrameId='OTHER_FRAME';
assert.throws(()=>calculateBphsShadbala(mixedChart),/longitudeFrameId/);checks++;
const mixedSpeed=structuredClone(baseInput);
mixedSpeed.planets[1].speedFrameId='OTHER_FRAME';
assert.throws(()=>calculateBphsShadbala(mixedSpeed),/speedFrameId/);checks++;
const mixedEpoch=structuredClone(baseInput);
mixedEpoch.planets[2].epochJdUt=epochJdUt+1;
assert.throws(()=>calculateBphsShadbala(mixedEpoch),/Mixed astronomical epochs/);checks++;
const mixedCuspFrame=structuredClone(baseInput);
mixedCuspFrame.bhavas[0].referenceFrameId='OTHER_FRAME';
assert.throws(()=>calculateBphsShadbala(mixedCuspFrame),/cusp reference frame/);checks++;
const mixedDeclinationFrame=structuredClone(baseInput);
mixedDeclinationFrame.declinations.referenceFrameId='OTHER_EQUATORIAL_FRAME';
assert.throws(()=>calculateBphsShadbala(mixedDeclinationFrame),/declination frame/);checks++;
const mixedCheshtaEpoch=structuredClone(baseInput);
mixedCheshtaEpoch.cheshtaInputs['குரு'].epochJdUt=epochJdUt+1;
assert.throws(()=>calculateBphsShadbala(mixedCheshtaEpoch),/Chesta input epoch/);checks++;
const mismatchedTrue=structuredClone(baseInput);
mismatchedTrue.cheshtaInputs['செவ்வாய்'].truePlanetLongitude=121;
assert.throws(()=>calculateBphsShadbala(mismatchedTrue),/chart longitude/);checks++;

// Ahargana lords are checked against the solar-calendar date.
const wrongAhargana=structuredClone(baseInput);
wrongAhargana.temporal.masaLord='குரு';
assert.throws(()=>calculateBphsShadbala(wrongAhargana),/Ahargana/);checks++;

// Missing astronomy and war review must stop calculation.
const missingSpeed=structuredClone(baseInput);
delete missingSpeed.planets[3].speed;
assert.throws(()=>calculateBphsShadbala(missingSpeed),/speed/);checks++;
const missingLatitude=structuredClone(baseInput);
delete missingLatitude.planets[2].eclipticLatitude;
assert.throws(()=>calculateBphsShadbala(missingLatitude),/ecliptic latitude/);checks++;
const unreviewedWar=structuredClone(baseInput);
unreviewedWar.yuddha={reviewed:false,encounters:[]};
assert.throws(()=>calculateBphsShadbala(unreviewedWar),/Yuddha eligibility/);checks++;
const missingCheshta=structuredClone(baseInput);
delete missingCheshta.cheshtaInputs['சனி'];
assert.throws(()=>calculateBphsShadbala(missingCheshta),/classical Chesta triple/);checks++;

// BPHS v20 uses the difference between the same pre-war Shadbala totals.
const pairBaseline=calculateBphsShadbala(baseInput);
const warInput=structuredClone(baseInput);
warInput.yuddha={reviewed:true,encounters:[{winner:'செவ்வாய்',loser:'புதன்'}]};
const withWar=calculateBphsShadbala(warInput);
const expectedDelta=Math.abs(
  pairBaseline.planets['செவ்வாய்'].totalVirupa-
  pairBaseline.planets['புதன்'].totalVirupa
);
near(withWar.planets['செவ்வாய்'].components.kala.yuddha,
  expectedDelta,0.002,'BPHS Yuddha winner receives the pre-war difference');
near(withWar.planets['புதன்'].components.kala.yuddha,
  -expectedDelta,0.002,'BPHS Yuddha loser loses the pre-war difference');

ok(result.limitations.some(item=>item.includes('eight named Cheshta motion states')),
  'unverified eight-motion classification is explicitly disclosed');
console.log(JSON.stringify({pass:true,checks,engine:result.method,
  scope:'isolated BPHS component integration, arithmetic, frame guards, Ahargana and Yuddha',
  classicalCertified:false,productionIntegrationAllowed:false}));
