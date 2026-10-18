// IANA zone.tab reference-coordinate regression for known compressed-grid failures.
// This checks the lookup function used by the offline/manual-location fallback.
// These reference anchors do not certify every worldwide border or DST history.
import {timezoneFromCoordinates} from '../public/horoscope/offline/places/tz-boundary-lookup.mjs';
import {approximateTimezoneAt,offsetMinutesAt} from '../public/horoscope/offline/places/timezone.mjs';

const cases=[
 ["Antarctica Palmer","Antarctica/Palmer",-64.8,-64.1],
 ["Argentina Ushuaia","America/Argentina/Ushuaia",-54.8,-68.3],
 ["American Samoa Pago Pago","Pacific/Pago_Pago",-14.266666666666667,-170.7],
 ["Canada Blanc Sablon","America/Blanc-Sablon",51.416666666666664,-57.11666666666667],
 ["Canada Atikokan","America/Atikokan",48.75861111111111,-91.62166666666666],
 ["Greenland Danmarkshavn","America/Danmarkshavn",76.76666666666667,-18.666666666666668],
 ["Indonesia Jayapura","Asia/Jayapura",-2.533333333333333,140.7],
 ["Marshall Islands Kwajalein","Pacific/Kwajalein",9.083333333333334,167.33333333333334],
 ["Saint Pierre and Miquelon","America/Miquelon",47.05,-56.333333333333336],
 ["Turks and Caicos","America/Grand_Turk",21.466666666666665,-71.13333333333334],
 ["Timor Leste Dili","Asia/Dili",-8.55,125.58333333333333],
 ["US Indiana Vevay","America/Indiana/Vevay",38.74777777777778,-85.06722222222221],
 ["US North Dakota New Salem","America/North_Dakota/New_Salem",46.845,-101.41083333333334],
 ["US Metlakatla","America/Metlakatla",55.12694444444445,-131.57638888888889]
];
const dates=['1992-01-15','1992-07-15','2026-01-15','2026-07-15'];
const KWAJALEIN_EXPECTED_OFFSETS=Object.freeze({
 '1992-01-15':-720,'1992-07-15':-720,
 '2026-01-15':720,'2026-07-15':720
});
let directZoneChecks=0,productionFallbackChecks=0,offsetChecks=0;
function same(actual,expected,message){
 if(actual!==expected)throw new Error(`${message}: expected ${expected}, got ${actual}`);
}
for(const [place,expectedZone,latitude,longitude] of cases){
 const direct=timezoneFromCoordinates(latitude,longitude);
 same(direct,expectedZone,`${place} direct reference zone`);
 directZoneChecks++;
 const resolved=await approximateTimezoneAt(latitude,longitude);
 same(resolved,expectedZone,`${place} production coordinate fallback zone`);
 productionFallbackChecks++;
 for(const date of dates){
  const expected=offsetMinutesAt(expectedZone,date,'12:00');
  const actual=offsetMinutesAt(resolved,date,'12:00');
  if(place==="Marshall Islands Kwajalein"){
   const independent=KWAJALEIN_EXPECTED_OFFSETS[date];
   same(expected,independent,`Kwajalein IANA offset oracle on ${date}`);
   same(actual,independent,`Kwajalein selected-zone offset on ${date}`);
  }
  same(actual,expected,`${place} historical/current offset on ${date}`);
  offsetChecks++;
 }
}
const result={
 pass:true,
 referenceLocations:cases.length,
 datesPerLocation:dates.length,
 directZoneChecks,
 productionFallbackChecks,
 offsetComparisons:offsetChecks,
 timezoneZoneIdMismatches:0,
 timezoneOffsetMismatches:0,
 kwajaleinHistoricalGate:"PASS",
 worldwideProductionAccuracyCertified:false,
 scope:"Known reference points only; not a worldwide boundary or all-historical-DST certificate"
};
console.log(JSON.stringify(result,null,2));
console.warn('::warning::Known IANA reference points passed. The coordinate grid remains approximate between tested anchors; worldwide boundary/DST production accuracy is not certified.');
