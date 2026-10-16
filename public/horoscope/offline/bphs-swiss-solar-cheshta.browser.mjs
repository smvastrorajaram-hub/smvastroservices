/**
 * BPHS I, Santhanam Ch.27 v8–13: Kala Bala uses the actual solar
 * day/night and apparent (not civil-clock) birth time.
 *
 * Solar rise/set is solved against apparent solar altitude using Swiss
 * ephemeris geocentric equatorial coordinates. Model horizon -0.8333 deg:
 * standard refraction + solar semidiameter at sea level; no height, pressure
 * or weather inputs are available. Do NOT call this a meteorologically exact
 * sunrise or a complete Shadbala numerical certification.
 *
 * getSunAtUtcMs(ms) returns {jdUt,rightAscensionDegrees,declinationDegrees}.
 */
const RAD=Math.PI/180;
const DAY=86400000;
const MINUTE=60000;
const norm360=x=>((x%360)+360)%360;
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const isoDate=ms=>new Date(ms).toISOString().slice(0,10);
export function bphsGmstDegrees(jdUt){
  if(!finite(jdUt))throw new RangeError('finite UT Julian day required');
  const t=(jdUt-2451545)/36525;
  return norm360(280.46061837+360.98564736629*(jdUt-2451545)+0.000387933*t*t-t*t*t/38710000);
}
export function bphsApparentSolarHour(jdUt,rightAscensionDegrees,longitudeDegrees){
  if(![rightAscensionDegrees,longitudeDegrees].every(finite))throw new RangeError('finite coordinates required');
  const hourAngle=norm360(bphsGmstDegrees(jdUt)+longitudeDegrees-rightAscensionDegrees);
  return ((12+hourAngle/15)%24+24)%24;
}
export function bphsSolarAltitudeDegrees(jdUt,rightAscensionDegrees,declinationDegrees,latitudeDegrees,longitudeDegrees){
  if(![rightAscensionDegrees,declinationDegrees,latitudeDegrees,longitudeDegrees].every(finite)||
     Math.abs(latitudeDegrees)>90||Math.abs(longitudeDegrees)>180)throw new RangeError('invalid solar coordinates');
  const H=norm360(bphsGmstDegrees(jdUt)+longitudeDegrees-rightAscensionDegrees)*RAD;
  const p=latitudeDegrees*RAD,d=declinationDegrees*RAD;
  const s=Math.sin(p)*Math.sin(d)+Math.cos(p)*Math.cos(d)*Math.cos(H);
  return Math.asin(Math.max(-1,Math.min(1,s)))/RAD;
}
function parseDate(date){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(date)))throw new RangeError('YYYY-MM-DD date required');
  const ms=Date.parse(date+'T00:00:00Z');
  if(!Number.isFinite(ms)||isoDate(ms)!==date)throw new RangeError('invalid calendar date');
  return ms;
}
function altitudeResidual(utcMs,getSun,latitude,longitude,horizon){
  const sun=getSun(utcMs);
  if(!sun || ![sun.jdUt,sun.rightAscensionDegrees,sun.declinationDegrees].every(finite))
    throw new TypeError('ephemeris Sun equatorial coordinates unavailable');
  return bphsSolarAltitudeDegrees(sun.jdUt,sun.rightAscensionDegrees,sun.declinationDegrees,latitude,longitude)-horizon;
}
function rootBetween(a,b,goingUp,getSun,lat,lon,horizon){
  let lo=a,hi=b;
  for(let j=0;j<25;j++){
    const mid=(lo+hi)/2;
    const v=altitudeResidual(mid,getSun,lat,lon,horizon);
    if((goingUp&&v>=0)||(!goingUp&&v<=0))hi=mid;
    else lo=mid;
  }
  return (lo+hi)/2;
}
/**
 * Search ONE local civil day, crossing horizon from below to above for
 * sunrise and the reverse for sunset. Return null for polar no-event days;
 * never invent a 06:00/18:00 event for astronomical no-rise/no-set days.
 */
export function bphsSwissSolarEvents(date,latitude,longitude,utcOffsetMinutes,getSunAtUtcMs){
  const dateMs=parseDate(date);
  if(![latitude,longitude,utcOffsetMinutes].every(finite)||Math.abs(latitude)>90||
     Math.abs(longitude)>180||Math.abs(utcOffsetMinutes)>900)
    throw new RangeError('invalid location or UTC offset');
  if(typeof getSunAtUtcMs!=='function')throw new TypeError('getSunAtUtcMs required');
  const localStartUtc=dateMs-utcOffsetMinutes*MINUTE;
  const horizon=-0.8333;
  let rise=null,set=null,prev=altitudeResidual(localStartUtc,getSunAtUtcMs,latitude,longitude,horizon);
  for(let n=1;n<=48;n++){
    const end=localStartUtc+n*30*MINUTE;
    const current=altitudeResidual(end,getSunAtUtcMs,latitude,longitude,horizon);
    if(rise===null&&prev<0&&current>=0)
      rise=rootBetween(end-30*MINUTE,end,true,getSunAtUtcMs,latitude,longitude,horizon);
    if(set===null&&prev>0&&current<=0)
      set=rootBetween(end-30*MINUTE,end,false,getSunAtUtcMs,latitude,longitude,horizon);
    if(rise!==null&&set!==null)break;
    prev=current;
  }
  if(rise===null||set===null)return null;
  return {date,sunriseUtcMs:rise,sunsetUtcMs:set,
    sunriseMinutes:(rise-localStartUtc)/MINUTE,
    sunsetMinutes:(set-localStartUtc)/MINUTE,
    model:'Swiss geocentric Sun RA/Dec; GMST; -0.8333 degree sea-level horizon',
    ephemerisBased:true,meteorologicallyExact:false};
}
/**
 * Use three consecutive solar days so pre-sunrise births use the preceding
 * sunset, and post-sunset births use the NEXT sunrise. BPHS Ch27 v12
 * Tribhaga subdivisions need the actual length of day or night.
 */
export function bphsSwissKalaContext({date,time,latitude,longitude,utcOffsetMinutes},
                                   getSunAtUtcMs,traditionalOwners){
  const dm=parseDate(date),tm=/^(\d{1,2}):(\d{2})$/.exec(String(time));
  if(!tm)throw new RangeError('HH:MM birth time required');
  const minute=(+tm[1])*60+(+tm[2]);
  if(+tm[1]>23||+tm[2]>59)throw new RangeError('invalid local birth time');
  if(typeof traditionalOwners!=='function')throw new TypeError('traditionalOwners callback required');
  const prevDate=isoDate(dm-DAY),nextDate=isoDate(dm+DAY);
  const previous=bphsSwissSolarEvents(prevDate,latitude,longitude,utcOffsetMinutes,getSunAtUtcMs);
  const today=bphsSwissSolarEvents(date,latitude,longitude,utcOffsetMinutes,getSunAtUtcMs);
  const tomorrow=bphsSwissSolarEvents(nextDate,latitude,longitude,utcOffsetMinutes,getSunAtUtcMs);
  if(!previous||!today||!tomorrow)return null;
  const birthUtcMs=dm+minute*MINUTE-utcOffsetMinutes*MINUTE;
  const beforeRise=birthUtcMs<today.sunriseUtcMs;
  const day=birthUtcMs>=today.sunriseUtcMs&&birthUtcMs<today.sunsetUtcMs;
  const solarCalendarDay=beforeRise?prevDate:date;
  const owners=traditionalOwners(solarCalendarDay);
  const lastRise=beforeRise?previous.sunriseUtcMs:today.sunriseUtcMs;
  const nextRise=beforeRise?today.sunriseUtcMs:tomorrow.sunriseUtcMs;
  const elapsedFromRise=birthUtcMs-lastRise;
  const horaLength=(nextRise-lastRise)/24;
  const horaStep=Math.max(0,Math.min(23,Math.floor(elapsedFromRise/horaLength)));
  let tribhagaIndex;
  if(day){
    tribhagaIndex=Math.max(0,Math.min(2,Math.floor(3*(birthUtcMs-today.sunriseUtcMs)/(today.sunsetUtcMs-today.sunriseUtcMs))));
  }else{
    const sunset=beforeRise?previous.sunsetUtcMs:today.sunsetUtcMs;
    tribhagaIndex=Math.max(0,Math.min(2,Math.floor(3*(birthUtcMs-sunset)/(nextRise-sunset))));
  }
  return {...owners,solarCalendarDay,
    day,tribhagaIndex,horaStep,sunriseMinutes:today.sunriseMinutes,
    sunsetMinutes:today.sunsetMinutes,
    sunriseApprox:true,ephemerisBased:true,
    solarTimeMethod:'Swiss Sun ephemeris RA/Dec, standard sea-level atmospheric horizon',
    sunriseModelUncertainty:'Atmospheric refraction, elevation and local weather unavailable'};
}
/**
 * BPHS I Ch27 vv24–25: mean & true geocentric longitude midpoint,
 * angular distance to specified Sheeghrocha, divided by 3 Virupas.
 * The input longitudes are intentionally REQUIRED, not generated from an
 * undocumented speed heuristic. No default mean/sheeghrocha is invented.
 */
export function bphsCheshtaFromOrbitalElements(meanLongitude,trueLongitude,sheeghrocha){
  if(![meanLongitude,trueLongitude,sheeghrocha].every(finite))
    throw new TypeError('Three independently computed longitudes required');
  const diff=((trueLongitude-meanLongitude+540)%360+360)%360-180;
  const midpoint=norm360(meanLongitude+diff/2);
  const angle=norm360(sheeghrocha-midpoint);
  const kendra=Math.min(angle,360-angle);
  return {meanTrueMidpoint:midpoint,cheshtaKendraDegrees:kendra,
    virupa:kendra/3,reference:'BPHS Santhanam Vol I Chapter 27 verses 24–25',
    exactArithmeticGivenInputs:true,
    natalCertified:false,note:'Mean longitude and Sheeghrocha MUST come from independent, documented classical ephemerides'};
}
