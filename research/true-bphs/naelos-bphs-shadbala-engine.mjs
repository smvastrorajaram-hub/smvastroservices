/**
 * TRUE BPHS SHADBALA — isolated research engine.
 *
 * Astronomy:
 *   - NAELOS Ephemeris 0.1.3, checked-in NAELOS/JPL DE440 tables.
 *   - Apparent geocentric true ecliptic-of-date positions for all seven grahas.
 *   - Equatorial-of-date declinations and apparent local sidereal time from NAELOS.
 *   - No Swiss/Moshier planetary longitude is substituted for NAELOS.
 *
 * Cheshta:
 *   - V365 Saura-paksha Mean and Sheeghroccheya inputs.
 *   - NAELOS True Longitude transferred into the same declared Saura-sidereal
 *     frame using the existing Burgess-1860 zero point + Lahiri precession
 *     delta transfer already audited in the five-natal NAELOS research.
 *   - BPHS I Ch27 vv24–25 arithmetic; UK II pp42–43 only selects the inputs.
 *
 * BPHS calculation:
 *   - Seven grahas × six Bala components.
 *   - BPHS Ch27 v19 Drig aggregation.
 *   - BPHS Ch27 v20 Yuddha magnitude (difference of pre-war totals).
 *   - UK II p41 is used only where BPHS is silent on war eligibility / northern
 *     latitude winner. Ambiguous or overlapping wars withhold affected totals.
 *
 * SAFETY: research-only. This file is outside public/ and is NOT imported by
 * Horoscope, Marriage Matching, Calendar, any service worker, PWA, APK or API.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

import {
  NaelosEphemeris, julday, tablesFor,
  SE_SUN, SE_MOON, SE_MERCURY, SE_VENUS, SE_MARS, SE_JUPITER, SE_SATURN,
  SE_TRUE_NODE
} from 'naelos-ephemeris';

import {
  SHADBALA_NATURAL,
  sthanaClassical,
  pakshaBala,
  ayanaBala,
  drikBalaClassical,
  traditionalAharganaLords
} from '../../public/horoscope/offline/swiss_vedic.browser.mjs';
import { getSwe } from '../../public/horoscope/offline/wasm-provider.mjs';
import { offsetMinutesAt } from '../../public/horoscope/offline/places/timezone.mjs';
import {
  sauraFivePlanetCheshtaInputs
} from '../../public/horoscope/offline/saura-classical-mean-motion.browser.mjs';
import {
  bphsFivePlanetCheshtaFromClassicalMeans
} from '../../public/horoscope/offline/bphs-swiss-solar-cheshta.browser.mjs';
import {
  bphsGrahaYuddhaFromBaselines
} from '../../public/horoscope/offline/bphs-shadbala-rectification.browser.mjs';
import {
  sauraSiderealOffsetFromLahiri
} from '../../research/saura-bija/saura-de441-apparent-true.mjs';

const DAY_MS = 86400000;
const JD_UNIX_EPOCH = 2440587.5;
const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
const SEFLG_SPEED = 256;
const SEFLG_EQUATORIAL = 2048;
const BURGESS_1860_JD = julday(1860, 1, 1, 0);
const YEAR_MIN = 1800;
const YEAR_MAX = 2399;
const NAELOS_VERSION = '0.1.3';
const NAELOS_SOURCE = 'JPL DE440';
const FRAME_ID = 'SAURA_NIRAYANA_NAELOS_TRUE_ECLIPTIC_OF_DATE_BURGESS1860_LAHIRI_DELTA_V1';
const EQUATORIAL_FRAME_ID = 'NAELOS_TRUE_EQUATOR_OF_DATE_GAST_V1';
const SOLAR_HORIZON_DEGREES = -0.8333;

const BODY_ROWS = Object.freeze([
  ['சூரியன்', 'Sun', SE_SUN],
  ['சந்திரன்', 'Moon', SE_MOON],
  ['செவ்வாய்', 'Mars', SE_MARS],
  ['புதன்', 'Mercury', SE_MERCURY],
  ['குரு', 'Jupiter', SE_JUPITER],
  ['சுக்கிரன்', 'Venus', SE_VENUS],
  ['சனி', 'Saturn', SE_SATURN]
]);
const FIVE_ROWS = Object.freeze([
  ['செவ்வாய்', 'Mars'],
  ['புதன்', 'Mercury'],
  ['குரு', 'Jupiter'],
  ['சுக்கிரன்', 'Venus'],
  ['சனி', 'Saturn']
]);
const BPHS_PLANETS = Object.freeze([
  'சூரியன்', 'சந்திரன்', 'செவ்வாய்', 'புதன்', 'குரு', 'சுக்கிரன்', 'சனி'
]);
const BPHS_REQUIRED_VIRUPA = Object.freeze({
  'சூரியன்':390, 'சந்திரன்':360, 'செவ்வாய்':300, 'புதன்':420,
  'குரு':390, 'சுக்கிரன்':330, 'சனி':300
});
const DIG_IDEAL_HOUSE = Object.freeze({
  'சூரியன்':10, 'செவ்வாய்':10, 'சந்திரன்':4, 'சுக்கிரன்':4,
  'குரு':1, 'புதன்':1, 'சனி':7
});
const DAYTIME_GRAHAS = new Set(['சூரியன்','குரு','சுக்கிரன்']);
const HORA_ORDER = Object.freeze(['சூரியன்','சுக்கிரன்','புதன்','சந்திரன்','சனி','குரு','செவ்வாய்']);
const TRIBHAGA_DAY = Object.freeze(['புதன்','சூரியன்','சனி']);
const TRIBHAGA_NIGHT = Object.freeze(['சந்திரன்','சுக்கிரன்','செவ்வாய்']);
const TAMIL_TO_ENGLISH = Object.freeze({
  'சூரியன்':'Sun','சந்திரன்':'Moon','செவ்வாய்':'Mars','புதன்':'Mercury',
  'குரு':'Jupiter','சுக்கிரன்':'Venus','சனி':'Saturn'
});

const norm360 = value => ((value % 360) + 360) % 360;
const norm24 = value => ((value % 24) + 24) % 24;
const signedAngle = (a,b) => ((a-b+540)%360)-180;
const circularDistance = (a,b) => Math.abs(signedAngle(a,b));
const round3 = value => Math.round((value + Number.EPSILON) * 1000) / 1000;
const finite = value => typeof value === 'number' && Number.isFinite(value);
const jdFromUtcMs = value => value / DAY_MS + JD_UNIX_EPOCH;

function fail(message) {
  throw new Error('[TRUE_BPHS_SHADBALA] ' + message);
}
function validateCivilInput({date,time,latitude,longitude,timeZone,utcOffsetMinutes}={}) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || ''));
  const clock = /^(\d{2}):([0-5]\d)$/.exec(String(time || ''));
  if (!match || !clock) throw new RangeError('Birth date YYYY-MM-DD and local time HH:mm are required');
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
  const hour = Number(clock[1]), minute = Number(clock[2]);
  const civil = new Date(Date.UTC(year,month-1,day));
  if (year < YEAR_MIN || year > YEAR_MAX ||
      civil.getUTCFullYear() !== year || civil.getUTCMonth() !== month-1 ||
      civil.getUTCDate() !== day) {
    throw new RangeError('TRUE BPHS NAELOS engine supports Gregorian natal dates 1800–2399');
  }
  if (hour > 23) throw new RangeError('Birth time hour must be 00–23');
  if (!finite(latitude) || latitude < -90 || latitude > 90 ||
      !finite(longitude) || longitude < -180 || longitude > 180) {
    throw new RangeError('Finite latitude and east-positive longitude are required');
  }
  let offset = utcOffsetMinutes;
  if (!finite(offset)) {
    if (typeof timeZone !== 'string' || !timeZone.trim()) {
      throw new TypeError('Supply an IANA timeZone or an exact utcOffsetMinutes');
    }
    offset = offsetMinutesAt(timeZone,date,time);
  }
  if (!finite(offset) || Math.abs(offset) > 14*60) {
    throw new RangeError('UTC offset is outside the supported civil-time range');
  }
  const localMs = Date.UTC(year,month-1,day,hour,minute,0,0);
  const utcMs = localMs - offset*60000;
  return Object.freeze({
    year,date,time,hour,minute,latitude,longitude,
    timeZone:timeZone || null,utcOffsetMinutes:offset,
    utcMs,jdUt:jdFromUtcMs(utcMs)
  });
}
function previousCivilDate(date) {
  const [y,m,d]=date.split('-').map(Number);
  const dt=new Date(Date.UTC(y,m-1,d)-DAY_MS);
  return dt.toISOString().slice(0,10);
}
function midpointArc(a,b) {
  return norm360(a + norm360(b-a)/2);
}
function housePlacement(longitude,arambhaCusps) {
  const x=norm360(longitude);
  for(let i=0;i<12;i++) {
    const start=arambhaCusps[i], end=arambhaCusps[(i+1)%12];
    const span=norm360(end-start), position=norm360(x-start);
    if(position < (span < 1e-10 ? 360 : span)) return i+1;
  }
  return 12;
}
function createSripatiCusps(madhyaCusps) {
  if(!Array.isArray(madhyaCusps)||madhyaCusps.length!==12||
     madhyaCusps.some(value=>!finite(value))) {
    throw new TypeError('NAELOS Porphyry Bhava Madhya must contain twelve finite cusps');
  }
  const arambha=madhyaCusps.map((current,index)=>
    midpointArc(madhyaCusps[(index+11)%12],current));
  return {madhya:[...madhyaCusps].map(norm360),arambha};
}
function requiredPosition(result,label) {
  if (!result || typeof result !== 'object' || 'error' in result) {
    fail(label + ' unavailable: ' + String(result?.error || 'NAELOS returned no position'));
  }
  for (const field of ['longitude','latitude','distance','longitudeSpeed','latitudeSpeed','distanceSpeed']) {
    if (!finite(result[field])) fail(label + ' has invalid ' + field);
  }
  return result;
}
function localHourAngleDegrees(armc,solarRightAscension) {
  return signedAngle(armc,solarRightAscension);
}
function apparentSolarAltitudeDegrees(jdUt,latitude,naelos) {
  const deltaTSeconds=naelos.eph.deltat(jdUt)*86400;
  const jdTt=jdUt+deltaTSeconds/86400;
  const sun=requiredPosition(
    naelos.eph.calc(jdTt,SE_SUN,SEFLG_EQUATORIAL),
    'Sun equatorial position at JDUT '+jdUt
  );
  const houses=naelos.eph.houses(jdUt,deltaTSeconds,latitude,naelos.longitude,'O');
  const hourAngle=localHourAngleDegrees(houses.armc,sun.longitude)*RAD;
  const phi=latitude*RAD, declination=sun.latitude*RAD;
  const sine=Math.sin(phi)*Math.sin(declination) +
    Math.cos(phi)*Math.cos(declination)*Math.cos(hourAngle);
  return {
    altitude:Math.asin(Math.max(-1,Math.min(1,sine)))*DEG,
    rightAscension:sun.longitude,
    declination:sun.latitude,
    armc:houses.armc
  };
}
function rootSolarCrossing(a,b,rising,latitude,naelos) {
  let lo=a,hi=b;
  for(let i=0;i<32;i++) {
    const mid=(lo+hi)/2;
    const value=apparentSolarAltitudeDegrees(mid,latitude,naelos).altitude-SOLAR_HORIZON_DEGREES;
    if ((rising && value>=0) || (!rising && value<=0)) hi=mid;
    else lo=mid;
  }
  return (lo+hi)/2;
}
function findSolarEvents(birthJdUt,latitude,naelos) {
  const start=birthJdUt-1.55, stop=birthJdUt+1.55, step=20/1440;
  const events=[];
  let previousJd=start;
  let previous=apparentSolarAltitudeDegrees(previousJd,latitude,naelos).altitude-SOLAR_HORIZON_DEGREES;
  for(let currentJd=start+step;currentJd<=stop+step/2;currentJd+=step) {
    const bounded=Math.min(currentJd,stop);
    const current=apparentSolarAltitudeDegrees(bounded,latitude,naelos).altitude-SOLAR_HORIZON_DEGREES;
    if(previous<0 && current>=0) {
      events.push({kind:'sunrise',jdUt:rootSolarCrossing(previousJd,bounded,true,latitude,naelos)});
    } else if(previous>0 && current<=0) {
      events.push({kind:'sunset',jdUt:rootSolarCrossing(previousJd,bounded,false,latitude,naelos)});
    }
    previousJd=bounded;
    previous=current;
    if(bounded>=stop) break;
  }
  events.sort((a,b)=>a.jdUt-b.jdUt);
  return events;
}
function calculateTemporalContext(birth,naelos) {
  const events=findSolarEvents(birth.jdUt,birth.latitude,naelos);
  const rises=events.filter(row=>row.kind==='sunrise');
  const sets=events.filter(row=>row.kind==='sunset');
  const lastRise=rises.filter(row=>row.jdUt<=birth.jdUt).at(-1);
  const nextRise=rises.find(row=>row.jdUt>birth.jdUt);
  if(!lastRise||!nextRise) {
    fail('Could not bracket the birth instant with Naelos apparent solar rises; polar/no-rise dates are withheld');
  }
  const sunset=sets.find(row=>row.jdUt>lastRise.jdUt && row.jdUt<nextRise.jdUt);
  if(!sunset) fail('Could not find the sunset between consecutive Naelos sunrises');
  const day=birth.jdUt>=lastRise.jdUt && birth.jdUt<sunset.jdUt;
  const elapsedFromRise=birth.jdUt-lastRise.jdUt;
  const horaLength=(nextRise.jdUt-lastRise.jdUt)/24;
  const horaStep=Math.max(0,Math.min(23,Math.floor(elapsedFromRise/horaLength)));
  const solarCalendarDay=day || birth.jdUt>=sunset.jdUt
    ?birth.date:previousCivilDate(birth.date);
  const owners=traditionalAharganaLords(solarCalendarDay);
  let tribhagaIndex;
  if(day) {
    tribhagaIndex=Math.max(0,Math.min(2,
      Math.floor(3*(birth.jdUt-lastRise.jdUt)/(sunset.jdUt-lastRise.jdUt))));
  } else {
    tribhagaIndex=Math.max(0,Math.min(2,
      Math.floor(3*(birth.jdUt-sunset.jdUt)/(nextRise.jdUt-sunset.jdUt))));
  }
  const horaLord=HORA_ORDER[
    (HORA_ORDER.indexOf(owners.dinaLord)+horaStep)%7
  ];
  const tribhagaLord=(day?TRIBHAGA_DAY:TRIBHAGA_NIGHT)[tribhagaIndex];
  const deltaTSeconds=naelos.eph.deltat(birth.jdUt)*86400;
  const sunEq=requiredPosition(
    naelos.eph.calc(birth.jdUt+deltaTSeconds/86400,SE_SUN,SEFLG_EQUATORIAL),
    'Sun equatorial birth position'
  );
  const localHouses=naelos.eph.houses(
    birth.jdUt,deltaTSeconds,birth.latitude,birth.longitude,'O'
  );
  const apparentSolarHour=norm24(
    12+localHourAngleDegrees(localHouses.armc,sunEq.longitude)/15
  );
  return Object.freeze({
    solarCalendarDay,day,night:!day,tribhagaIndex,horaStep,
    apparentSolarHour,
    abdaLord:owners.abdaLord,masaLord:owners.masaLord,dinaLord:owners.dinaLord,
    horaLord,tribhagaLord,ahargana:owners.ahargana,
    sunriseJdUt:lastRise.jdUt,sunsetJdUt:sunset.jdUt,nextSunriseJdUt:nextRise.jdUt,
    sunriseApprox:true,
    solarTimeMethod:'NAELOS DE440 apparent geocentric Sun RA/Dec + NAELOS apparent sidereal time; horizon −0.8333°; 32-step bisection',
    solarTimeFrameId:EQUATORIAL_FRAME_ID,
    epochJdUt:birth.jdUt,
    source:'NAELOS Ephemeris 0.1.3 / JPL DE440',
    sunriseModelUncertainty:'Sea-level −0.8333° standard horizon; local elevation, pressure and weather are not modelled'
  });
}
function natonnathaBala(planet,apparentSolarHour) {
  if(planet==='புதன்') return 60;
  const distance=Math.abs(12-apparentSolarHour)/12;
  const dayStrength=60*(1-distance);
  return round3(DAYTIME_GRAHAS.has(planet)?dayStrength:60-dayStrength);
}
function calculateKalaBala(planet,planetRows,temporal,declinations) {
  const sun=planetRows.find(row=>row.name==='சூரியன்');
  const moon=planetRows.find(row=>row.name==='சந்திரன்');
  const natonnatha=natonnathaBala(planet,temporal.apparentSolarHour);
  const paksha=pakshaBala(planet,sun.longitude,moon.longitude,planetRows);
  const tribhaga=planet==='குரு'||temporal.tribhagaLord===planet?60:0;
  const abda=temporal.abdaLord===planet?15:0;
  const masa=temporal.masaLord===planet?30:0;
  const vara=temporal.dinaLord===planet?45:0;
  const hora=temporal.horaLord===planet?60:0;
  const ayana=ayanaBala(declinations[planet],planet);
  if(!finite(ayana)) fail('BPHS Ayana Bala unavailable for '+planet);
  const total=natonnatha+paksha+tribhaga+abda+masa+vara+hora+ayana;
  return Object.freeze({
    natonnatha:round3(natonnatha),paksha:round3(paksha),tribhaga,abda,masa,vara,hora,
    ayana:round3(ayana),yuddha:0,total:round3(total)
  });
}
function calculateCheshtaBala(planet,planetRows,declinations,cheshtaInputs) {
  if(planet==='சூரியன்') return ayanaBala(declinations[planet],planet);
  const sun=planetRows.find(row=>row.name==='சூரியன்');
  const moon=planetRows.find(row=>row.name==='சந்திரன்');
  if(planet==='சந்திரன்') return pakshaBala(planet,sun.longitude,moon.longitude,planetRows);
  const input=cheshtaInputs[planet];
  const cheshta=bphsFivePlanetCheshtaFromClassicalMeans(
    planet,input.meanSunLongitude,input.meanPlanetLongitude,input.truePlanetLongitude
  );
  return cheshta.virupa;
}
function calculateDigBala(planet,longitude,madhyaCusps) {
  const idealHouse=DIG_IDEAL_HOUSE[planet];
  const idealLongitude=madhyaCusps[idealHouse-1];
  return round3(Math.max(0,Math.min(60,60-circularDistance(longitude,idealLongitude)/3)));
}
function resolveBphsGrahaYuddha(planetRows) {
  const eligible=planetRows.filter(row=>FIVE_ROWS.some(([ta])=>ta===row.name));
  if(eligible.length!==5) fail('All five eligible grahas are required for Graha Yuddha review');
  const minuteIndex=value=>Math.floor(norm360(value)*60+1e-9)%21600;
  const candidates=[],noWar=[],ambiguous=[];
  for(let i=0;i<eligible.length;i++) for(let j=i+1;j<eligible.length;j++) {
    const a=eligible[i],b=eligible[j];
    const degrees=circularDistance(a.longitude,b.longitude);
    if(minuteIndex(a.longitude)!==minuteIndex(b.longitude)) {
      noWar.push({planetA:a.name,planetB:b.name,separationDegrees:degrees,reason:'not-the-same-degree-and-minute'});
      continue;
    }
    if(a.bhava!==b.bhava) {
      noWar.push({planetA:a.name,planetB:b.name,separationDegrees:degrees,reason:'different-bhava'});
      continue;
    }
    if(!finite(a.eclipticLatitude)||!finite(b.eclipticLatitude)) {
      ambiguous.push({planetA:a.name,planetB:b.name,separationDegrees:degrees,reason:'missing-ecliptic-latitude'});
      continue;
    }
    if(Math.abs(a.eclipticLatitude-b.eclipticLatitude)<1e-9) {
      ambiguous.push({planetA:a.name,planetB:b.name,separationDegrees:degrees,reason:'northern-latitude-tie'});
      continue;
    }
    candidates.push({
      planetA:a.name,planetB:b.name,
      winner:a.eclipticLatitude>b.eclipticLatitude?a.name:b.name,
      loser:a.eclipticLatitude>b.eclipticLatitude?b.name:a.name,
      separationDegrees:degrees,
      winnerNorthLatitude:a.eclipticLatitude>b.eclipticLatitude?a.eclipticLatitude:b.eclipticLatitude,
      loserNorthLatitude:a.eclipticLatitude>b.eclipticLatitude?b.eclipticLatitude:a.eclipticLatitude,
      source:'Uttara Kalamrita II printed p.41 (BPHS-silent winner/eligibility fallback)'
    });
  }
  const counts=new Map();
  for(const row of candidates) for(const name of [row.planetA,row.planetB]) counts.set(name,(counts.get(name)||0)+1);
  const ambiguousNames=new Set();
  for(const row of ambiguous) {ambiguousNames.add(row.planetA);ambiguousNames.add(row.planetB);}
  for(const row of candidates) if(counts.get(row.planetA)>1||counts.get(row.planetB)>1) {
    ambiguous.push({
      planetA:row.planetA,planetB:row.planetB,separationDegrees:row.separationDegrees,
      reason:'overlapping-graha-yuddha-candidates'
    });
    ambiguousNames.add(row.planetA);ambiguousNames.add(row.planetB);
  }
  const resolved=[];
  for(const row of candidates) {
    if(ambiguousNames.has(row.planetA)||ambiguousNames.has(row.planetB)) continue;
    resolved.push(row);
  }
  const allPairs=[
    ...noWar.map(row=>({...row,status:'NO_WAR',winner:null,loser:null})),
    ...ambiguous.map(row=>({...row,status:'UNRESOLVED',winner:null,loser:null})),
    ...resolved.map(row=>({...row,status:'WAR'}))
  ];
  return Object.freeze({
    reviewed:true,
    resolved:ambiguous.length===0,
    encounters:Object.freeze(resolved.map(({winner,loser})=>Object.freeze({winner,loser}))),
    unresolved:Object.freeze(ambiguous),
    unresolvedGrahas:Object.freeze([...ambiguousNames]),
    pairs:Object.freeze(allPairs),
    evaluatedPairs:allPairs.length,
    eligibilityRule:'same Bhava and same degree+minute bin; northern ecliptic latitude is the winner',
    eligibilitySource:'Uttara Kalamrita II printed p.41, used only where BPHS does not specify the war winner/eligibility detail',
    magnitudeRule:'BPHS I Chapter 27 verse 20: difference of the two pre-war Shadbala totals'
  });
}

function assertCoreInputs(planetRows,bhavas,temporal,declinations,cheshtaInputs,epochJdUt) {
  const byName=new Map();
  for(const row of planetRows) {
    if(byName.has(row.name)) fail('Duplicate graha row '+row.name);
    if(row.referenceFrameId!==FRAME_ID) fail(row.name+' is not in the common declared ecliptic frame');
    for(const field of ['longitudeFrameId','speedFrameId','eclipticLatitudeFrameId']) {
      if(row[field]!==FRAME_ID) fail(row.name+' '+field+' does not match the common frame');
    }
    if(row.epochJdUt!==epochJdUt) fail(row.name+' is not at the natal epoch');
    if(!finite(row.longitude)||row.longitude<0||row.longitude>=360 ||
       !finite(row.speed)||!finite(row.eclipticLatitude)) fail(row.name+' has incomplete astronomical input');
    byName.set(row.name,row);
  }
  for(const name of BPHS_PLANETS) if(!byName.has(name)) fail('Missing required BPHS graha '+name);
  if(planetRows.length<7) fail('Seven grahas are required');
  if(bhavas.length!==12||bhavas.some((row,index)=>
     row.house!==index+1||row.referenceFrameId!==FRAME_ID||row.epochJdUt!==epochJdUt||
     !finite(row.longitude))) fail('All twelve Bhava Madhya cusps must match chart frame and epoch');
  if(!temporal||temporal.epochJdUt!==epochJdUt||
     temporal.solarTimeFrameId!==EQUATORIAL_FRAME_ID||
     temporal.sunriseApprox!==true||!finite(temporal.apparentSolarHour)) fail('Naelos solar-time provenance is incomplete');
  if(declinations.referenceFrameId!==EQUATORIAL_FRAME_ID||declinations.epochJdUt!==epochJdUt)
    fail('Tropical declinations are not in the common Naelos equatorial-of-date frame');
  for(const name of BPHS_PLANETS) if(!finite(declinations.values[name]))
    fail('Missing Naelos tropical declination for '+name);
  for(const [ta] of FIVE_ROWS) {
    const row=cheshtaInputs[ta];
    if(!row||row.epochJdUt!==epochJdUt||
       ![row.meanSunFrameId,row.meanPlanetFrameId,row.truePlanetFrameId,row.sheeghroccaFrameId].every(id=>id===FRAME_ID)||
       ![row.meanSunLongitude,row.meanPlanetLongitude,row.truePlanetLongitude].every(finite)||
       circularDistance(row.truePlanetLongitude,byName.get(ta).longitude)>1e-9) {
      fail('Mean / True / Sheeghroccheya frame/epoch mismatch for '+ta);
    }
  }
  return byName;
}

function assembleBphsShadbala({planetRows,bhavas,temporal,declinations,cheshtaInputs,yuddha}={}) {
  const byName=assertCoreInputs(planetRows,bhavas,temporal,declinations,cheshtaInputs,temporal.epochJdUt);
  const rasiPositions=Object.fromEntries(BPHS_PLANETS.map(name=>
    [name,Math.floor(norm360(byName.get(name).longitude)/30)]));
  const preWar={};
  const rows={};
  for(const name of BPHS_PLANETS) {
    const planet=byName.get(name);
    const sthana=sthanaClassical(name,planet.longitude,planet.bhava,rasiPositions);
    const dig=calculateDigBala(name,planet.longitude,bhavas.map(x=>x.longitude));
    const kala=calculateKalaBala(name,planetRows,temporal,declinations.values);
    const cheshta=calculateCheshtaBala(name,planetRows,declinations.values,cheshtaInputs);
    const naisargika=SHADBALA_NATURAL[name];
    const drik=drikBalaClassical(name,planetRows);
    if(!finite(cheshta)||cheshta<0||cheshta>(name==='சூரியன்'||name==='சந்திரன்'?120:60))
      fail('BPHS Cheshta Bala outside its source range for '+name);
    if(!finite(drik)) fail('BPHS Drig Bala unavailable for '+name);
    const preWarTotal=sthana.total+dig+kala.total+cheshta+naisargika+drik;
    preWar[name]=round3(preWarTotal);
    rows[name]={
      available:true,planet:name,method:'TRUE_BPHS_SHADBALA_NAELOS_DE440',
      components:{sthana,dig,kala,cheshta:round3(cheshta),naisargika:round3(naisargika),drik:round3(drik)},
      preWarTotalVirupa:round3(preWarTotal),classicalCertified:false,provisional:true
    };
  }
  const yuddhaResult=bphsGrahaYuddhaFromBaselines(yuddha.encounters,preWar);
  for(const name of BPHS_PLANETS) {
    const base=rows[name],adjustment=yuddhaResult.virupaByPlanet[name]??0;
    const kala={...base.components.kala,yuddha:round3(adjustment)};
    kala.total=round3(base.components.kala.total+adjustment);
    const components={...base.components,kala};
    const total=round3(
      components.sthana.total+components.dig+components.kala.total+
      components.cheshta+components.naisargika+components.drik
    );
    const unresolved=yuddha.unresolvedGrahas.includes(name);
    base.components=Object.freeze(components);
    base.totalVirupa=unresolved?null:total;
    base.totalRupa=unresolved?null:round3(total/60);
    base.requiredVirupa=BPHS_REQUIRED_VIRUPA[name];
    base.ratio=unresolved?null:round3(total/BPHS_REQUIRED_VIRUPA[name]);
    base.isStrong=unresolved?null:total>=BPHS_REQUIRED_VIRUPA[name];
    base.warEvidence=Object.freeze({
      unresolvedGraha:unresolved,
      appliedAdjustmentVirupa:round3(adjustment),
      rule:'BPHS I Chapter 27 verse 20, pre-war Shadbala difference'
    });
    Object.freeze(base);
  }
  const finiteTotals=Object.values(rows).filter(row=>finite(row.totalVirupa)).length;
  return Object.freeze({
    available:true,method:'TRUE_BPHS_SHADBALA_NAELOS_DE440',
    source:'Brihat Parashara Hora Shastra, R. Santhanam Vol I, Chapter 27; Chapter 26 Drig source helpers',
    referenceFrameId:FRAME_ID,frameConsistent:true,epochJdUt:temporal.epochJdUt,
    planets:Object.freeze(rows),yuddhaEvidence:yuddha,
    preWarTotals:Object.freeze(preWar),
    finalTotalsComplete:finiteTotals===7,
    classicalCertified:false,provisional:true,researchOnly:true,
    productionIntegrationAllowed:false,
    limitations:Object.freeze([
      'NAELOS DE440 provides modern apparent geocentric True Longitude; this does not prove a historical astronomical True Longitude theory.',
      'The V365 Mean / Sheeghroccheya source selectors are retained as a separate classical Saura input model; the combined hybrid frame transfer is explicitly named.',
      'Sunrise uses the standard −0.8333° sea-level horizon; local elevation, pressure and weather are unavailable.',
      'Uttara Kalamrita II p.41 is used only for Yuddha eligibility / northern-latitude winner where BPHS is silent; BPHS Ch27 v20 supplies the magnitude.',
      'A source-scoped arithmetic result is not independent certification of every Shadbala component for arbitrary natal epochs.',
      'This research engine is not connected to production Horoscope calculations.'
    ])
  });
}

export async function createTrueBphsShadbalaEngine({
  repositoryRoot=fileURLToPath(new URL('../..',import.meta.url))
}={}) {
  const root=path.resolve(repositoryRoot);
  const manifestPath=path.join(root,'naelos-ephemeris','manifest.json');
  const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  if(manifest?.source?.name!==NAELOS_SOURCE || manifest?.format!==2)
    fail('Checked-in NAELOS manifest is not the expected format-2 JPL DE440 manifest');

  // Load the DE440 century tables needed by every date from 1800 through 2399,
  // including the adjacent centuries needed for light-time at the range edges.
  const from=julday(1800,1,1,0),to=julday(2400,1,1,0);
  const names=tablesFor(from-2,to+2);
  const loaded=[];
  for(const name of names) {
    const meta=manifest.files.find(row=>row.name===name);
    if(!meta) fail('NAELOS manifest is missing '+name);
    const file=path.join(root,'naelos-ephemeris',name);
    const bytes=fs.readFileSync(file);
    if(bytes.length!==meta.bytes) fail(name+' byte length does not match NAELOS manifest');
    const sha256=createHash('sha256').update(bytes).digest('hex');
    if(sha256!==meta.sha256) fail(name+' SHA-256 does not match NAELOS manifest');
    loaded.push({name,bytes:new Uint8Array(bytes.buffer,bytes.byteOffset,bytes.byteLength),bytesLength:bytes.length,sha256});
  }
  const eph=NaelosEphemeris.fromBuffers(loaded.map(row=>row.bytes));
  const swe=await getSwe();
  swe.setSiderealLahiri();
  const lahiriAyanamsaAt1860=swe.ayanamsa(BURGESS_1860_JD);
  if(!finite(lahiriAyanamsaAt1860)) fail('Swiss Lahiri 1860 reference value is unavailable for the explicit frame-transfer formula');

  const naelos={
    eph,latitude:null,longitude:null,
    loadedTables:Object.freeze(loaded.map(({name,bytesLength,sha256})=>Object.freeze({name,bytes:bytesLength,sha256}))),
    manifestSource:manifest.source,
    lahiriAyanamsaAt1860,
    swe
  };
  return Object.freeze({
    engine:'TRUE_BPHS_SHADBALA_NAELOS_DE440',
    version:'1.0.0-research',
    supportedCivilYears:Object.freeze([YEAR_MIN,YEAR_MAX]),
    sourceEphemeris:NAELOS_SOURCE,
    naelosPackageVersion:NAELOS_VERSION,
    loadedTables:naelos.loadedTables,
    tableIntegrityVerified:true,
    productionIntegrationAllowed:false,
    researchOnly:true,
    async calculate(input={}) {
      const birth=validateCivilInput(input);
      const naelosContext={...naelos,latitude:birth.latitude,longitude:birth.longitude};
      const deltaTDays=eph.deltat(birth.jdUt);
      const deltaTSeconds=deltaTDays*86400;
      const jdTt=birth.jdUt+deltaTDays;

      // The source transfer is identical to the previously audited five-natal
      // NAELOS pathway: tropical apparent longitude minus the explicit
      // Burgess-1860 / date-specific Lahiri precession transfer.
      const ayanamsa=naelos.swe.ayanamsa(birth.jdUt);
      const ayanamsaBefore=naelos.swe.ayanamsa(birth.jdUt-0.5);
      const ayanamsaAfter=naelos.swe.ayanamsa(birth.jdUt+0.5);
      if(![ayanamsa,ayanamsaBefore,ayanamsaAfter].every(finite))
        fail('Date-specific Lahiri ayanamsa is unavailable');
      const siderealOffset=sauraSiderealOffsetFromLahiri(
        ayanamsa,naelos.lahiriAyanamsaAt1860
      );
      const offsetBefore=sauraSiderealOffsetFromLahiri(
        ayanamsaBefore,naelos.lahiriAyanamsaAt1860
      );
      const offsetAfter=sauraSiderealOffsetFromLahiri(
        ayanamsaAfter,naelos.lahiriAyanamsaAt1860
      );
      const siderealOffsetRate=signedAngle(offsetAfter,offsetBefore);

      const tropicalByName={},equatorialByName={};
      for(const [tamil,english,body] of BODY_ROWS) {
        const tropical=requiredPosition(eph.calc(jdTt,body,SEFLG_SPEED),'NAELOS '+english+' ecliptic position');
        const equatorial=requiredPosition(eph.calc(jdTt,body,SEFLG_EQUATORIAL),'NAELOS '+english+' equatorial position');
        tropicalByName[tamil]=tropical;
        equatorialByName[tamil]=equatorial;
      }
      const nodeTropical=requiredPosition(
        eph.calc(jdTt,SE_TRUE_NODE,SEFLG_SPEED),'NAELOS True Node'
      );
      const planetRows=BODY_ROWS.map(([tamil,english])=>{
        const p=tropicalByName[tamil];
        const longitude=norm360(p.longitude-siderealOffset);
        const speed=p.longitudeSpeed-siderealOffsetRate;
        const row={
          name:tamil,englishName:english,longitude,speed,
          eclipticLatitude:p.latitude,
          bhava:null,retrograde:speed<0,
          tropicalApparentLongitude:p.longitude,
          tropicalApparentLatitude:p.latitude,
          referenceFrameId:FRAME_ID,longitudeFrameId:FRAME_ID,
          speedFrameId:FRAME_ID,eclipticLatitudeFrameId:FRAME_ID,
          epochJdUt:birth.jdUt,
          positionSource:'NAELOS Ephemeris 0.1.3 / JPL DE440 apparent geocentric true ecliptic of date'
        };
        return row;
      });
      const nodeLongitude=norm360(nodeTropical.longitude-siderealOffset);
      planetRows.push({
        name:'ராகு',englishName:'True Node',longitude:nodeLongitude,
        speed:nodeTropical.longitudeSpeed-siderealOffsetRate,
        eclipticLatitude:nodeTropical.latitude,bhava:null,
        referenceFrameId:FRAME_ID,longitudeFrameId:FRAME_ID,
        speedFrameId:FRAME_ID,eclipticLatitudeFrameId:FRAME_ID,
        epochJdUt:birth.jdUt,positionSource:'NAELOS DE440 true lunar node'
      });
      planetRows.push({
        name:'கேது',englishName:'South Node',longitude:norm360(nodeLongitude+180),
        speed:nodeTropical.longitudeSpeed-siderealOffsetRate,
        eclipticLatitude:-nodeTropical.latitude,bhava:null,
        referenceFrameId:FRAME_ID,longitudeFrameId:FRAME_ID,
        speedFrameId:FRAME_ID,eclipticLatitudeFrameId:FRAME_ID,
        epochJdUt:birth.jdUt,positionSource:'NAELOS DE440 true lunar node + 180°'
      });

      // Naelos 'O' is Porphyry: its cusps are the Bhava Madhya values used by
      // the existing SMV Sripati construction. The Sripati Arambha boundaries
      // are the midpoints between adjacent Madhya cusps, as in the audited
      // Swiss S/O relationship; no Swiss planetary longitude enters here.
      const porphyry=eph.houses(birth.jdUt,deltaTSeconds,birth.latitude,birth.longitude,'O');
      const sripati=createSripatiCusps(porphyry.cusps.map(value=>norm360(value-siderealOffset)));
      for(const row of planetRows) row.bhava=housePlacement(row.longitude,sripati.arambha);
      const bhavas=sripati.madhya.map((longitude,index)=>({
        house:index+1,longitude,referenceFrameId:FRAME_ID,epochJdUt:birth.jdUt,
        cuspKind:'SRIPATI_BHAVA_MADHYA_FROM_NAELOS_PORPHYRY'
      }));

      const declinations={
        referenceFrameId:EQUATORIAL_FRAME_ID,epochJdUt:birth.jdUt,
        values:Object.fromEntries(BODY_ROWS.map(([tamil])=>[tamil,equatorialByName[tamil].latitude]))
      };
      const cheshtaInputs={};
      for(const [tamil,english] of FIVE_ROWS) {
        const inputs=sauraFivePlanetCheshtaInputs(birth.jdUt,english);
        cheshtaInputs[tamil]={
          meanSunLongitude:inputs.meanSunLongitude,
          meanPlanetLongitude:inputs.ownMeanOrbitLongitude,
          truePlanetLongitude:planetRows.find(row=>row.name===tamil).longitude,
          meanSunFrameId:FRAME_ID,meanPlanetFrameId:FRAME_ID,
          truePlanetFrameId:FRAME_ID,sheeghroccaFrameId:FRAME_ID,
          epochJdUt:birth.jdUt,
          source:{
            meanSheeghroccheya:'V365 Saura-paksha Mean motion / Uttara Kalamrita II pp.42–43 input selector',
            trueLongitude:'NAELOS Ephemeris 0.1.3 / NASA-JPL DE440',
            frameTransfer:'Burgess 1860 Saura zero point + date-specific Lahiri precession delta'
          }
        };
      }
      const temporal=calculateTemporalContext(birth,naelosContext);
      const yuddha=resolveBphsGrahaYuddha(planetRows);
      const result=assembleBphsShadbala({
        planetRows,bhavas,temporal,declinations,cheshtaInputs,yuddha
      });
      return Object.freeze({
        engine:'TRUE_BPHS_SHADBALA_NAELOS_DE440',
        version:'1.0.0-research',
        status:'RESEARCH_ONLY',
        researchOnly:true,productionIntegrationAllowed:false,
        classicalCertified:false,
        birth:Object.freeze({
          date:birth.date,time:birth.time,timeZone:birth.timeZone,
          utcOffsetMinutes:birth.utcOffsetMinutes,latitude:birth.latitude,
          longitude:birth.longitude,utcJd:birth.jdUt,ttJd:jdTt,
          deltaTSeconds
        }),
        astronomy:Object.freeze({
          ephemeris:'NAELOS Ephemeris 0.1.3',
          source:'NASA/JPL DE440',
          positionDefinition:'apparent geocentric true ecliptic-of-date',
          timeScale:'Birth civil time resolved to UT1 by the supplied IANA timezone / exact offset; Naelos ΔT converts UT to TT and Naelos converts TT to TDB internally',
          trueLongitudeFrame:'Naelos tropical apparent true ecliptic-of-date longitude − explicit Burgess-1860/Lahiri-precession Saura sidereal offset',
          siderealOffsetDegrees:siderealOffset,
          siderealOffsetRateDegreesPerDay:siderealOffsetRate,
          lahiriAyanamsaDegrees:ayanamsa,
          lahiriAyanamsaAt1860Degrees:naelos.lahiriAyanamsaAt1860,
          loadedTableFiles:naelos.loadedTables
        }),
        bhava:Object.freeze({
          system:'Sripati',
          source:'NAELOS Porphyry Bhava Madhya; Arambha = midpoint of adjacent Madhya cusps',
          madhya:Object.freeze(sripati.madhya),
          arambha:Object.freeze(sripati.arambha),
          ascendant: norm360(porphyry.ascendant-siderealOffset),
          midheaven: norm360(porphyry.mc-siderealOffset),
          vertex: norm360(porphyry.vertex-siderealOffset),
          referenceFrameId:FRAME_ID
        }),
        solarTime:temporal,
        frame:Object.freeze({
          id:FRAME_ID,epochJdUt:birth.jdUt,
          trueLongitudeSource:'NAELOS DE440',
          meanLongitudeSource:'V365 Saura-paksha',
          sheeghroccheyaSource:'V365 Saura-paksha',
          equatorialDeclinationSource:'NAELOS DE440 true equator of date',
          noAbsoluteKotiMinus:true
        }),
        planetaryPositions:Object.freeze(planetRows.map(row=>Object.freeze({...row}))),
        cheshtaInputs:Object.freeze(cheshtaInputs),
        cheshtaResults:Object.freeze(Object.fromEntries(FIVE_ROWS.map(([tamil])=>{
          const row=cheshtaInputs[tamil];
          const value=bphsFivePlanetCheshtaFromClassicalMeans(
            tamil,row.meanSunLongitude,row.meanPlanetLongitude,row.truePlanetLongitude
          );
          return [tamil,Object.freeze({
            meanLongitude:value.meanLongitude,trueLongitude:value.trueLongitude,
            sheeghroccheya:value.sheeghrocha,
            midpoint:value.meanTrueMidpoint,cheshtaKendraDegrees:value.cheshtaKendraDegrees,
            virupa:round3(value.virupa),source:'BPHS I Ch27 vv24–25; UK II pp.42–43 input selection'
          })];
        }))),
        ...result
      });
    }
  });
}

export const TRUE_BPHS_SHADBALA_METADATA=Object.freeze({
  engine:'TRUE_BPHS_SHADBALA_NAELOS_DE440',
  version:'1.0.0-research',
  authority:'BPHS I Chapter 27; BPHS Ch26 Sputa Drishti',
  trueLongitudeSource:'NAELOS Ephemeris 0.1.3 / NASA-JPL DE440',
  meanSheeghroccheyaSource:'V365 Saura-paksha',
  productionIntegrationAllowed:false,
  classicalCertificationDefault:false,
  scope:Object.freeze({startYear:1800,endYear:2399,grahas:7,components:6})
});
