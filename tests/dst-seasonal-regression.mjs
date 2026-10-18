// Run: node tests/dst-seasonal-regression.mjs
import assert from 'node:assert/strict';
import {offsetMinutesAt,approximateTimezoneAt} from '../public/horoscope/offline/places/timezone.mjs';
import {timezoneFromCoordinates} from '../public/horoscope/offline/places/tz-boundary-lookup.mjs';
let count=0;
const equal=(actual,want,name)=>{assert.equal(actual,want,name);count++};
const samples=[
 ['Perambalur',11.232,78.88,'1992-07-31','22:05','Asia/Kolkata',330],
 ['New York winter',40.7128,-74.006,'2025-01-15','12:00','America/New_York',-300],
 ['New York summer',40.7128,-74.006,'2025-07-15','12:00','America/New_York',-240],
 ['US before 2007 DST change',40.7128,-74.006,'2006-03-20','12:00','America/New_York',-300],
 ['US after 2007 DST change',40.7128,-74.006,'2008-03-20','12:00','America/New_York',-240],
 ['London winter',51.5074,-0.1278,'2025-01-15','12:00','Europe/London',0],
 ['London summer',51.5074,-0.1278,'2025-07-15','12:00','Europe/London',60],
 ['Sydney summer',-33.87,151.21,'2025-01-15','12:00','Australia/Sydney',660],
 ['Sydney winter',-33.87,151.21,'2025-07-15','12:00','Australia/Sydney',600],
 ['Lord Howe summer (+30m DST)',-31.55,159.08,'2025-01-15','12:00','Australia/Lord_Howe',660],
 ['Lord Howe winter',-31.55,159.08,'2025-07-15','12:00','Australia/Lord_Howe',630],
 ['Nepal 45-minute time zone',27.71,85.32,'2025-07-15','12:00','Asia/Kathmandu',345],
];
for (const [name,lat,lon,date,time,zone,want] of samples) {
 equal(timezoneFromCoordinates(lat,lon),zone,name+' geographic IANA timezone');
 equal(await approximateTimezoneAt(lat,lon),zone,name+' typed coordinate fallback');
 equal(offsetMinutesAt(zone,date,time),want,name+' historical UTC offset');
}
for(const [z,d,t] of [['America/New_York','2025-03-09','02:30'],['Europe/London','2026-03-29','01:30']]){assert.throws(()=>offsetMinutesAt(z,d,t),/did not exist/);count++;}
equal(offsetMinutesAt('America/New_York','2025-11-02','01:30'),-240,'repeated hour uses first occurrence (needs verification)');

// Preserve the existing statutory time-zone auto-corrections in timezone.mjs.
// These rules are independent of coordinate-to-zone selection.
equal(offsetMinutesAt('America/Vancouver','2026-11-01','02:00'),-420,'BC statutory auto-correction after 2026 change');
equal(offsetMinutesAt('America/Edmonton','2026-11-01','02:00'),-360,'Alberta statutory auto-correction after 2026 change');
equal(offsetMinutesAt('America/Yellowknife','2026-11-01','02:00'),-360,'NWT statutory auto-correction');
equal(offsetMinutesAt('America/Inuvik','2026-11-01','02:00'),-360,'NWT Inuvik statutory auto-correction');
equal(offsetMinutesAt('America/Winnipeg','2026-11-01','02:00'),-300,'Manitoba statutory auto-correction');
equal(offsetMinutesAt('America/Rainy_River','2026-11-01','02:00'),-300,'Rainy River statutory auto-correction');
equal(offsetMinutesAt('Africa/Casablanca','2026-09-20','02:00'),0,'Morocco statutory offset auto-correction');
equal(offsetMinutesAt('Africa/El_Aaiun','2026-09-20','02:00'),0,'Western Sahara statutory offset auto-correction');

// Preserve legacy offset precision and the Moldova-to-Bucharest rule.
equal(offsetMinutesAt('EST5EDT','1883-11-17','12:00'),-300,'POSIX legacy pre-standard offset');
equal(offsetMinutesAt('CST6CDT','1883-11-17','12:00'),-360,'POSIX legacy central offset');
equal(offsetMinutesAt('Europe/Chisinau','2025-01-15','12:00'),120,'Moldova winter delegation');
equal(offsetMinutesAt('Europe/Chisinau','2025-07-15','12:00'),180,'Moldova summer delegation');

// Nearby locations on the other side of known borders must remain on their own zones.
equal(timezoneFromCoordinates(-53.1638,-70.9171),'America/Punta_Arenas','Nearby Chile zone not captured by Ushuaia correction');
equal(timezoneFromCoordinates(-13.8333,-171.75),'Pacific/Apia','Independent Samoa zone not captured by Pago Pago correction');
equal(timezoneFromCoordinates(-9.4438,147.1803),'Pacific/Port_Moresby','Papua New Guinea zone not captured by Jayapura correction');
equal(timezoneFromCoordinates(18.4861,-69.9312),'America/Santo_Domingo','Dominican zone not captured by Grand Turk correction');

assert.rejects(()=>approximateTimezoneAt('',0),/required/);count++;
console.log(JSON.stringify({
 pass:true,assertions:count,locations:samples.length,dstSeasonal:true,
 statutoryAutoCorrections:'PASS',fractionalHourMinuteZones:'PASS',
 posixLegacyOffsets:'PASS',moldovaDelegation:'PASS',neighborZoneIsolation:'PASS'
}));
