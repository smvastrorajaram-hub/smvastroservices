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
assert.rejects(()=>approximateTimezoneAt('',0),/required/);count++;
console.log(JSON.stringify({pass:true,assertions:count,locations:samples.length,dstSeasonal:true}));
