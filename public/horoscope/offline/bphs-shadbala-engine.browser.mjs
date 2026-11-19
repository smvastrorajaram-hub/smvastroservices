/**
 * SMV ASTRO — isolated BPHS Chapter 27 six-Bala integration core.
 *
 * This reuses the repository's existing BPHS helpers:
 *   - BPHS Phase-3 Sthana / Paksha / Ayana / Drig / Ahargana helpers
 *   - BPHS exact Sputa Drishti + signed Drig aggregation
 *   - BPHS v20 pre-war-difference Graha Yuddha rectification
 *   - BPHS / Uttara Kalamrita five-planet Mean/True/Sheeghrocca selector
 *
 * This module is RESEARCH-ONLY. It is deliberately not imported by the live
 * horoscope engine, is not added to the service-worker cache, and never marks
 * an arbitrary natal chart as classically certified.
 *
 * Critical gate: all seven grahas, Dig Bala cusps, tropical declinations,
 * temporal lords and five Chesta input triples must be supplied. The five
 * Chesta triples must declare one identical reference-frame ID, and each
 * True Longitude must equal that graha's chart longitude in that same frame.
 * Missing or mixed-frame inputs throw instead of yielding guessed totals.
 */
import {
  SHADBALA_NATURAL,
  sthanaClassical,
  pakshaBala,
  ayanaBala,
  drikBalaClassical,
  traditionalAharganaLords
} from './swiss_vedic.browser.mjs';
import { bphsFivePlanetCheshtaFromClassicalMeans } from './bphs-swiss-solar-cheshta.browser.mjs';
import { bphsGrahaYuddhaFromBaselines } from './bphs-shadbala-rectification.browser.mjs';

export const BPHS_SHADBALA_REQUIRED_VIRUPA = Object.freeze({
  'சூரியன்':390, 'சந்திரன்':360, 'செவ்வாய்':300, 'புதன்':420,
  'குரு':390, 'சுக்கிரன்':330, 'சனி':300
});
export const BPHS_SHADBALA_PLANETS = Object.freeze([
  'சூரியன்','சந்திரன்','செவ்வாய்','புதன்','குரு','சுக்கிரன்','சனி'
]);
export const BPHS_SHADBALA_CHESHTA_PLANETS = Object.freeze([
  'செவ்வாய்','புதன்','குரு','சுக்கிரன்','சனி'
]);

const DIG_IDEAL_HOUSE = Object.freeze({
  'சூரியன்':10, 'செவ்வாய்':10, 'சந்திரன்':4, 'சுக்கிரன்':4,
  'குரு':1, 'புதன்':1, 'சனி':7
});
const DAYTIME_GRAHAS = new Set(['சூரியன்','குரு','சுக்கிரன்']);
const VALID_GRAHAS = new Set([...BPHS_SHADBALA_PLANETS,'ராகு','கேது']);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const normalize = value => ((value % 360) + 360) % 360;
const circularDistance = (a,b) => {
  const delta = Math.abs(normalize(a)-normalize(b));
  return Math.min(delta,360-delta);
};
const round3 = value => Math.round((value+Number.EPSILON)*1000)/1000;

function requireCondition(condition,message) {
  if(!condition) throw new TypeError(message);
}
function requireLongitude(value,label) {
  if(!finite(value)||value<0||value>=360)
    throw new RangeError(label+' must be a finite longitude in [0,360)');
}
function requirePlanetaryInputs(planets) {
  if(!Array.isArray(planets)) throw new TypeError('Planetary input array required');
  const byName=new Map();
  for(const row of planets) {
    if(!row||!VALID_GRAHAS.has(row.name)||byName.has(row.name))
      throw new RangeError('Unknown or duplicate graha input: '+String(row?.name));
    requireLongitude(row.longitude,row.name+' longitude');
    if(typeof row.referenceFrameId!=='string'||!row.referenceFrameId.trim())
      throw new TypeError(row.name+' referenceFrameId required');
    byName.set(row.name,row);
  }
  for(const name of BPHS_SHADBALA_PLANETS) {
    const row=byName.get(name);
    if(!row) throw new TypeError('Missing classical graha: '+name);
    if(!Number.isInteger(row.bhava)||row.bhava<1||row.bhava>12)
      throw new RangeError(name+' Bhava must be an integer from 1 to 12');
    if(!finite(row.speed))
      throw new TypeError(name+' geocentric speed is required for astronomical input audit');
    if(!finite(row.eclipticLatitude))
      throw new TypeError(name+' ecliptic latitude is required for Yuddha review');
  }
  return byName;
}
function requireSharedFrame(byName) {
  const frameIds=new Set([...byName.values()].map(row=>row.referenceFrameId));
  if(frameIds.size!==1)
    throw new RangeError('Mixed planetary reference frames: all grahas must use one referenceFrameId');
  return [...frameIds][0];
}
function requireBhavaCusps(bhavas) {
  if(!Array.isArray(bhavas)) throw new TypeError('Twelve Bhava cusp longitudes are required');
  const byHouse=new Map();
  for(const row of bhavas) {
    const house=Number(row?.house), longitude=row?.longitude;
    if(!Number.isInteger(house)||house<1||house>12||byHouse.has(house))
      throw new RangeError('Bhava cusp table must contain unique houses 1..12');
    requireLongitude(longitude,'Bhava '+house+' cusp');
    byHouse.set(house,longitude);
  }
  if(byHouse.size!==12) throw new RangeError('All twelve Bhava cusps are required; missing cusps cannot be treated as zero Dig Bala');
  return byHouse;
}

/** BPHS Dig Bala: 60 Virupas at the planet's ideal direction, 0 at 180°. */
export function bphsDigBala(planet,longitude,bhavas) {
  const idealHouse=DIG_IDEAL_HOUSE[planet];
  if(!idealHouse) throw new RangeError('Unknown Dig Bala graha: '+planet);
  requireLongitude(longitude,planet+' longitude');
  const cusps=requireBhavaCusps(bhavas);
  const idealLongitude=cusps.get(idealHouse);
  return round3(Math.max(0,Math.min(60,60-circularDistance(longitude,idealLongitude)/3)));
}

function requireTemporalContext(temporal) {
  if(!temporal||typeof temporal!=='object')
    throw new TypeError('BPHS temporal context required');
  const hour=temporal.apparentSolarHour;
  if(!finite(hour)||hour<0||hour>=24)
    throw new RangeError('Apparent local solar hour must be in [0,24)');
  if(typeof temporal.solarCalendarDay!=='string')
    throw new TypeError('Solar-calendar date selected from the actual sunrise is required');
  if(typeof temporal.solarTimeMethod!=='string'||!temporal.solarTimeMethod.trim())
    throw new TypeError('Solar-time method provenance is required');
  if(temporal.sunriseApprox!==true)
    throw new TypeError('Sunrise approximation/provenance must be explicitly disclosed');
  const ahargana=traditionalAharganaLords(temporal.solarCalendarDay);
  for(const [field,key] of [
    ['abdaLord','abdaLord'],['masaLord','masaLord'],['dinaLord','dinaLord']
  ]) {
    if(temporal[field]!==ahargana[key])
      throw new RangeError('Temporal '+field+' does not match BPHS Ahargana for '+temporal.solarCalendarDay);
  }
  for(const field of ['horaLord','tribhagaLord']) {
    if(!BPHS_SHADBALA_PLANETS.includes(temporal[field]))
      throw new TypeError('Verified '+field+' is required');
  }
  return {...temporal,ahargana:ahargana.ahargana};
}
function requireDeclinations(declinations) {
  if(!declinations||typeof declinations!=='object')
    throw new TypeError('Tropical equatorial declinations are required');
  const out={};
  for(const name of BPHS_SHADBALA_PLANETS) {
    const value=declinations[name];
    if(!finite(value)||value < -90||value > 90)
      throw new RangeError('Valid tropical declination is required for '+name);
    out[name]=value;
  }
  return out;
}
function requireCheshtaInputs(cheshtaInputs,frameId,byName) {
  if(!cheshtaInputs||typeof cheshtaInputs!=='object')
    throw new TypeError('Five classical Mean / True / Sheeghrocca triples are required');
  const out={};
  for(const name of BPHS_SHADBALA_CHESHTA_PLANETS) {
    const row=cheshtaInputs[name];
    if(!row) throw new TypeError('Missing classical Chesta triple: '+name);
    const frameFields=['meanSunFrameId','meanPlanetFrameId','truePlanetFrameId','sheeghroccaFrameId'];
    for(const field of frameFields) {
      if(row[field]!==frameId)
        throw new RangeError(name+' '+field+' does not match chart frame '+frameId);
    }
    for(const field of ['meanSunLongitude','meanPlanetLongitude','truePlanetLongitude'])
      requireLongitude(row[field],name+' '+field);
    if(circularDistance(row.truePlanetLongitude,byName.get(name).longitude)>1e-7)
      throw new RangeError(name+' True Longitude is not the same value/frame as the chart longitude');
    out[name]=row;
  }
  return out;
}
function natonnathaBala(planet,apparentSolarHour) {
  if(planet==='புதன்') return 60;
  const distance=Math.abs(12-apparentSolarHour)/12;
  const dayStrength=60*(1-distance);
  return round3(DAYTIME_GRAHAS.has(planet)?dayStrength:60-dayStrength);
}
function kalaBeforeYuddha(planet,planets,temporal,declinations) {
  const natonnatha=natonnathaBala(planet,temporal.apparentSolarHour);
  const paksha=pakshaBala(
    planet,
    planets.find(row=>row.name==='சூரியன்').longitude,
    planets.find(row=>row.name==='சந்திரன்').longitude,
    planets
  );
  const tribhaga=planet==='குரு'||temporal.tribhagaLord===planet?60:0;
  const abda=temporal.abdaLord===planet?15:0;
  const masa=temporal.masaLord===planet?30:0;
  const vara=temporal.dinaLord===planet?45:0;
  const hora=temporal.horaLord===planet?60:0;
  const ayana=ayanaBala(declinations[planet],planet);
  if(!finite(ayana)) throw new RangeError('BPHS Ayana Bala unavailable for '+planet);
  const total=natonnatha+paksha+tribhaga+abda+masa+vara+hora+ayana;
  return {natonnatha:round3(natonnatha),paksha:round3(paksha),
    tribhaga,abda,masa,vara,hora,ayana:round3(ayana),
    yuddha:0,total:round3(total)};
}
function requireYuddhaReview(yuddha,byName) {
  if(!yuddha||yuddha.reviewed!==true||!Array.isArray(yuddha.encounters))
    throw new TypeError('Graha Yuddha eligibility must be explicitly reviewed; pass reviewed:true and encounters[]');
  for(const pair of yuddha.encounters) {
    if(!BPHS_SHADBALA_CHESHTA_PLANETS.includes(pair?.winner)||
       !BPHS_SHADBALA_CHESHTA_PLANETS.includes(pair?.loser)||
       !byName.has(pair.winner)||!byName.has(pair.loser))
      throw new RangeError('BPHS Yuddha encounter must name two eligible visible planets');
  }
  return yuddha.encounters;
}
function cheshtaForPlanet(name,planets,declinations,cheshtaInputs) {
  if(name==='சூரியன்') return ayanaBala(declinations[name],name);
  if(name==='சந்திரன்') {
    return pakshaBala(name,
      planets.find(row=>row.name==='சூரியன்').longitude,
      planets.find(row=>row.name==='சந்திரன்').longitude,
      planets);
  }
  const input=cheshtaInputs[name];
  return bphsFivePlanetCheshtaFromClassicalMeans(
    name,input.meanSunLongitude,input.meanPlanetLongitude,input.truePlanetLongitude
  ).virupa;
}

/**
 * Calculate the seven BPHS Shadbala rows from already-calculated source inputs.
 * Does not calculate planetary ephemerides and is not connected to production.
 *
 * Required inputs:
 *  - planets: seven grahas (optional Rahu/Ketu for Mercury's Paksha association),
 *    each with longitude, speed, eclipticLatitude, Bhava, referenceFrameId.
 *  - bhavas: all twelve cusp longitudes.
 *  - temporal: apparentSolarHour, sunrise-selected Ahargana lords,
 *    horaLord, tribhagaLord and explicit sunrise provenance.
 *  - declinations: tropical equatorial declinations for all seven grahas.
 *  - cheshtaInputs: the five eligible Mean/True/Sheeghrocca triples and frame IDs.
 *  - yuddha: { reviewed:true, encounters:[{winner,loser}, ...] }.
 */
export function calculateBphsShadbala({
  planets,bhavas,temporal,declinations,cheshtaInputs,yuddha
}={}) {
  const byName=requirePlanetaryInputs(planets);
  const frameId=requireSharedFrame(byName);
  const temporalContext=requireTemporalContext(temporal);
  const declinationMap=requireDeclinations(declinations);
  const cusps=requireBhavaCusps(bhavas);
  const cheshtaMap=requireCheshtaInputs(cheshtaInputs,frameId,byName);
  const encounters=requireYuddhaReview(yuddha,byName);

  const seven=BPHS_SHADBALA_PLANETS.map(name=>byName.get(name));
  const rasiPositions=Object.fromEntries(seven.map(row=>[
    row.name,Math.floor(normalize(row.longitude)/30)
  ]));
  const baseRows={};
  for(const name of BPHS_SHADBALA_PLANETS) {
    const planet=byName.get(name);
    const sthana=sthanaClassical(name,planet.longitude,planet.bhava,rasiPositions);
    const dig=bphsDigBala(name,planet.longitude,bhavas);
    const kala=kalaBeforeYuddha(name,planets,temporalContext,declinationMap);
    const cheshta=cheshtaForPlanet(name,planets,declinationMap,cheshtaMap);
    const naisargika=SHADBALA_NATURAL[name];
    const drik=drikBalaClassical(name,planets);
    if(!finite(cheshta)||cheshta<0||cheshta>(name==='சூரியன்'||name==='சந்திரன்'?120:60))
      throw new RangeError('BPHS Cheshta Bala outside its source-defined range for '+name);
    if(!finite(drik)) throw new RangeError('BPHS Drig Bala is unavailable for '+name);
    const preWarTotal=sthana.total+dig+kala.total+cheshta+naisargika+drik;
    baseRows[name]={
      available:true,planet:name,method:'BPHS I (R. Santhanam), Chapter 27',
      components:{sthana,dig,kala,cheshta:round3(cheshta),
        naisargika:round3(naisargika),drik:round3(drik)},
      preWarTotalVirupa:round3(preWarTotal)
    };
  }
  const preWarTotals=Object.fromEntries(BPHS_SHADBALA_PLANETS.map(name=>[
    name,baseRows[name].preWarTotalVirupa
  ]));
  const yuddhaResult=bphsGrahaYuddhaFromBaselines(encounters,preWarTotals);
  const rows={};
  for(const name of BPHS_SHADBALA_PLANETS) {
    const base=baseRows[name],bonus=yuddhaResult.virupaByPlanet[name]??0;
    const kala={...base.components.kala,yuddha:round3(bonus)};
    kala.total=round3(base.components.kala.total+bonus);
    const c={...base.components,kala};
    const totalVirupa=round3(c.sthana.total+c.dig+c.kala.total+c.cheshta+
      c.naisargika+c.drik);
    const requiredVirupa=BPHS_SHADBALA_REQUIRED_VIRUPA[name];
    rows[name]=Object.freeze({
      available:true,planet:name,method:'BPHS I (R. Santhanam), Chapter 27',
      components:Object.freeze(c),
      totalVirupa,totalRupa:round3(totalVirupa/60),
      requiredVirupa,ratio:round3(totalVirupa/requiredVirupa),
      isStrong:totalVirupa>=requiredVirupa,
      classicalCertified:false,provisional:true
    });
  }
  return Object.freeze({
    available:true,method:'BPHS_CH27_ISOLATED_SIX_BALA_ENGINE',
    source:'Brihat Parashara Hora Shastra, R. Santhanam Vol I, Chapter 27',
    referenceFrameId:frameId,frameConsistent:true,
    ahargana:temporalContext.ahargana,solarCalendarDay:temporalContext.solarCalendarDay,
    planets:Object.freeze(rows),yuddhaEvidence:yuddhaResult,
    classicalCertified:false,provisional:true,researchOnly:true,
    productionIntegrationAllowed:false,
    limitations:Object.freeze([
      'Historical classical Mean / True / Sheeghrocca accuracy is not certified for arbitrary natal epochs.',
      'The eight named Cheshta motion states are not inferred from speed bins in this engine; their independent BPHS transcription/oracle remains a separate validation task.',
      'Solar rise/set provenance remains approximate where the supplied temporal context says sunriseApprox:true.',
      'This isolated engine does not replace the customer-facing B.V. Raman strength6 path.'
    ])
  });
}
