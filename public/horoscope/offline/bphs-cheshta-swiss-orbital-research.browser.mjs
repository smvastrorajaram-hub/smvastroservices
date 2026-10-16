/**
 * V364 research-only: evaluate whether the existing offline Swiss WASM data
 * can furnish trustworthy candidates for BPHS Ch27 vv24-25 Cheshta Bala.
 *
 * NOT wired into Phase3 strength3 or Horoscope/Matching predictions.
 * BPHS requires traditional mean planetary longitude and Sheeghrocha.
 * Swiss swe_get_orbital_elements() provides heliocentric OSCULATING orbital
 * mean longitude. This is NOT the same definition, even when converted to
 * approximately Lahiri-sidereal longitudes.
 *
 * Mapping of the *roles* of the three inputs follows Uttara Kalamrita Ch II:
 * Mars/Jupiter/Saturn: planetary mean, mean Sun as Sheeghrocha.
 * Mercury/Venus: mean Sun as "mean", planetary mean as Sheeghrocha.
 * The choice of classical mean-motion epoch/parameters remains unverified.
 * We did NOT copy PyJHora source code or its epoch tables (AGPL-3.0).
 */
import { getSwe, C } from './wasm-provider.mjs';
import { bphsCheshtaFromOrbitalElements } from './bphs-swiss-solar-cheshta.browser.mjs';

const PLANETS=Object.freeze([
  ['செவ்வாய்',C.MARS,'outer'],['புதன்',C.MERCURY,'inner'],
  ['குரு',C.JUPITER,'outer'],['சுக்கிரன்',C.VENUS,'inner'],
  ['சனி',C.SATURN,'outer']
]);
const norm=x=>((x%360)+360)%360;
const finite=x=>typeof x==='number'&&Number.isFinite(x);

function parseBirth({date,time,utcOffsetMinutes}={}){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(date))||
      !/^\d{1,2}:\d{2}$/.test(String(time))||!finite(utcOffsetMinutes))
    throw new RangeError('Date YYYY-MM-DD, birth HH:MM, numeric UTC offset required');
  const [h,m]=time.split(':').map(Number);
  if(h>23||m>59||Math.abs(utcOffsetMinutes)>900)
    throw new RangeError('Invalid birth clock or UTC offset');
  const start=Date.parse(date+'T00:00:00Z');
  if(!finite(start)||new Date(start).toISOString().slice(0,10)!==date)
    throw new RangeError('Invalid birth date');
  return start+(h*60+m-utcOffsetMinutes)*60000;
}
export async function compareSwissOsculatingWithClassicalCheshta(birth){
  const utcMs=parseBirth(birth),dt=new Date(utcMs);
  const swe=await getSwe();
  if(typeof swe.orbitalElements!=='function')
    throw new Error('V364 Swiss orbitalElements() is unavailable; do not fabricate Shadbala values');
  swe.setSiderealLahiri();
  const jd=swe.utcToJd(dt.getUTCFullYear(),dt.getUTCMonth()+1,dt.getUTCDate(),
    dt.getUTCHours(),dt.getUTCMinutes(),dt.getUTCSeconds());
  if(!finite(jd.et)||!finite(jd.ut))throw new Error('Swiss UTC Julian day missing');
  const ayanamsa=swe.ayanamsa(jd.ut);
  if(!finite(ayanamsa))throw new Error('Swiss sidereal correction missing');
  const earth=swe.orbitalElements(jd.et,C.EARTH);
  // Mean Sun is the direction opposing Earth's heliocentric orbital mean
  // longitude, NOT the observed/true geocentric Sun longitude.
  const modernSolarMean=norm(earth.meanLongitude+180-ayanamsa);
  const planets=[];
  for(const [planet,body,group] of PLANETS){
    const orbital=swe.orbitalElements(jd.et,body);
    const truePosition=swe.calc(jd.et,body,swe.siderealSpeedFlags());
    if(!finite(truePosition.longitude))throw new Error('Missing true Swiss longitude: '+planet);
    const modernPlanetMean=norm(orbital.meanLongitude-ayanamsa);
    const meanCandidate=group==='inner'?modernSolarMean:modernPlanetMean;
    const seeghrochaCandidate=group==='inner'?modernPlanetMean:modernSolarMean;
    const trial=bphsCheshtaFromOrbitalElements(meanCandidate,truePosition.longitude,seeghrochaCandidate);
    planets.push({
      planet,group,
      sourceFrames:{trueLongitude:'Swiss geocentric Lahiri sidereal',
        meanLongitude:'Swiss heliocentric osculating -> approximate sidereal',
        sheeghrocha:'UK Ch II role mapping applied to Swiss osculating reference'},
      trueLongitude:truePosition.longitude,
      modernPlanetMeanLongitude:modernPlanetMean,
      modernSolarMeanLongitude:modernSolarMean,
      trialMeanLongitude:meanCandidate,
      trialSheeghrocha:seeghrochaCandidate,
      trialCheshtaVirupa:trial.virupa,
      withinArithmeticRange:trial.virupa>=0&&trial.virupa<=60,
      natalCertified:false,canReplaceCurrentStrength3:false
    });
  }
  return {date:birth.date,time:birth.time,utcOffsetMinutes:birth.utcOffsetMinutes,
    jdET:jd.et,ayanamsa,earthOrbitalMeanLongitude:earth.meanLongitude,
    modernSolarMeanLongitude:modernSolarMean,planets,
    classicalCheshtaCertified:false,productionShadbalaChanged:false,
    evidence:'Swiss current WASM osculating vs BPHS formula; UK Chapter II role mapping',
    limitation:'Swiss heliocentric osculating means are not traditionally calibrated mean motions / Sheeghrocha'};
}
