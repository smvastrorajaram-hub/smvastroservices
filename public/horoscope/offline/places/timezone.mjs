/* Historic birth-time DST conversion using the browser's IANA timezone database.
 * A coordinate alone does not identify a timezone. Caller must supply a verified
 * IANA timezone for international places, or an explicit user-provided UTC offset.
 */

/* IANA 2026e civil-time changes. Keep these narrow and remove/review them
 * once all supported Android/browser ICU versions ship IANA >=2026e.
 * Only apply when the supplied wall clock occurs AFTER the point at which
 * older IANA releases would incorrectly return to the previous UTC offset.
 * Official tzdb release notes: https://www.iana.org/time-zones/releases/2026e
 */
const STATUTORY_2026_ZONES=new Map([
 ['America/Vancouver',-420],['Canada/Pacific',-420],            // British Columbia: 2026b
 ['America/Edmonton',-360],['Canada/Mountain',-360],            // Alberta: 2026c
 ['America/Yellowknife',-360],                                 // NWT via Edmonton
 ['America/Inuvik',-360],                                    // Northwest Territories: 2026d
 ['America/Winnipeg',-300],['Canada/Central',-300],            // Manitoba: 2026e
 ['America/Rainy_River',-300]                                // 2026e current assumption
]);
const STATUTORY_MOROCCO_ZONES=new Set(['Africa/Casablanca','Africa/El_Aaiun']);

function civilParts(date, time) {
 const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date));
 const t=/^(\d{1,2}):([0-5]\d)$/.exec(String(time));
 if(!m||!t)throw new RangeError('Birth date/time must be YYYY-MM-DD and HH:mm');
 const [y,mo,d,h,mi]=[+m[1],+m[2],+m[3],+t[1],+t[2]];
 const utc=Date.UTC(y,mo-1,d,h,mi,0);
 const check=new Date(utc);
 if(y<1800||y>2399||h>23||check.getUTCFullYear()!==y||check.getUTCMonth()!==mo-1||check.getUTCDate()!==d)
  throw new RangeError('Invalid birth date or time');
 return {utc,y,mo,d,h,mi};
}
function zonedSeconds(formatter,milliseconds) {
 const p=Object.fromEntries(formatter.formatToParts(new Date(milliseconds)).filter(x=>x.type!=='literal').map(x=>[x.type,Number(x.value)]));
 return Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second);
}
export function offsetMinutesAt(timeZone,date,time){
 const zone=String(timeZone||'').trim();
 if(!zone)throw new RangeError('Select a valid birth-place timezone');
 const c=civilParts(date,time);
 const fmt=new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
 // For zones changed by 2026e, stale device ICU data otherwise silently
 // produces an hour error. Data is statutory and independent of DST labels.
 const localClock=String(date)+'T'+String(time).padStart(5,'0');
 if(STATUTORY_2026_ZONES.has(zone)&&localClock>='2026-11-01T02:00')
  return STATUTORY_2026_ZONES.get(zone);
 if(STATUTORY_MOROCCO_ZONES.has(zone)&&localClock>='2026-09-20T02:00')
  return 0;
 // Moldova aligned DST transition instants with the EU since 2022 (IANA 2026a).
 // Bucharest uses the same EU clock shifts but may be newer than Chisinau in ICU.
 if((zone==='Europe/Chisinau'||zone==='Europe/Tiraspol')&&String(date)>='2022-01-01')
  return offsetMinutesAt('Europe/Bucharest',date,time);

 const offsets=new Set();
 // Include second-precision pre-standardisation local mean times (e.g. 19th century)
 // rather than rounding historical offsets to whole minutes.
 // Collect both sides of any DST transition; most zones need only one.
 for(const hours of [-36,-24,-12,0,12,24,36]){
  const probe=c.utc+hours*3600000;
  offsets.add(zonedSeconds(fmt,probe)-probe);
 }
 const valid=[];
 for(const offsetMs of offsets){
  const instant=c.utc-offsetMs;
  if(zonedSeconds(fmt,instant)===c.utc)valid.push({instant,offset:offsetMs/60000});
 }
 if(!valid.length)throw new RangeError('This local birth time did not exist due to a DST clock change; verify the time.');
 // On clock rollback, two real instants can share one local clock reading.
 // Deterministic earlier occurrence. The UI should invite users to verify
 // documented offset if the birth happened during the repeated hour.
 valid.sort((a,b)=>a.instant-b.instant);
 return valid[0].offset;
}

/** Coordinate-derived fallback for manual locations.
 * This is an approximate geographic boundary lookup, not a DST calculation.
 * Historical DST correction still happens in offsetMinutesAt(). */
export async function approximateTimezoneAt(latitude,longitude){
  if(latitude===null||latitude===undefined||String(latitude).trim()===''||longitude===null||longitude===undefined||String(longitude).trim()==='')
    throw new RangeError('Latitude and longitude are required to find the time zone');
  const lat=Number(latitude),lon=Number(longitude);
  if(!Number.isFinite(lat)||lat < -90||lat > 90||!Number.isFinite(lon)||lon < -180||lon > 180)
    throw new RangeError('Latitude or longitude outside supported range');
  const {timezoneFromCoordinates}=await import('./tz-boundary-lookup.mjs');
  return timezoneFromCoordinates(lat,lon);
}
