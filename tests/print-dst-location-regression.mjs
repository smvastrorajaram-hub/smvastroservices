// Run: node tests/print-dst-location-regression.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {offsetMinutesAt} from '../public/horoscope/offline/places/timezone.mjs';
let checks=0;
const equal=(a,b)=>{assert.equal(a,b);checks++};
const includes=(str,text)=>{assert.ok(str.includes(text),text);checks++};
equal(offsetMinutesAt('Asia/Kolkata','1992-07-31','22:05'),330);
equal(offsetMinutesAt('America/New_York','2025-01-15','12:00'),-300);
equal(offsetMinutesAt('America/New_York','2025-07-15','12:00'),-240);
equal(offsetMinutesAt('America/New_York','2025-11-02','01:30'),-240);
equal(offsetMinutesAt('Europe/London','2026-10-25','01:30'),60);
for(const [zone,date,time] of [['America/New_York','2025-03-09','02:30'],['Europe/London','2026-03-29','01:30']]){
 assert.throws(()=>offsetMinutesAt(zone,date,time),/did not exist/);checks++;
}
assert.throws(()=>offsetMinutesAt('Invalid/Timezone','2026-10-16','12:00'),RangeError);checks++;
const file=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
includes(file('public/horoscope/report-print.js'),"root.querySelectorAll('[data-smv-screen-only^=\"daily-\"],.panchang-card,.hora-card')");
includes(file('public/horoscope/report-print.js'),"return 'SMVHS-'+safePdfFilenamePart");
includes(file('public/horoscope/horoscope.js'),'data-smv-screen-only="daily-panchang"');
includes(file('public/horoscope/horoscope.js'),'data-smv-screen-only="daily-hora"');
includes(file('public/horoscope/horoscope.js'),'card birth-time-panchang');
includes(file('public/horoscope/horoscope.js'),'class="card transit-card"');
includes(file('public/horoscope/report-print.css'),'#printReport .hora-card{display:none!important}');
includes(file('public/horoscope/offline/places/place-search.mjs'),'Math.min(70,Number(limit)||12)');
includes(file('public/horoscope/location-search-online-offline.js'),"Math.min(70,Number(limit)||70)");
includes(file('public/horoscope/location-search-online-offline.js'),"'/api/locations/search'");
includes(file('public/horoscope/location-search-online-offline.js'),"'/api/locations/timezone'");
assert.ok(!file('public/horoscope/location-search-online-offline.js').includes('nominatim.openstreetmap.org'),'Public Nominatim autocomplete must not be used');checks++;
console.log(JSON.stringify({passed:true,assertions:checks}));
