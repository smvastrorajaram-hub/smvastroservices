// V363 BPHS I Chapter 27 temporal Bala, independently compared with the
// Swiss Ephemeris *rise_trans* outputs (Swiss 2.10.03 / Moshier fallback).
// Reference times were generated independently using pyswisseph.rise_trans,
// Sun, 11.232N 78.88E, 0m altitude, sea-level default atmosphere, 15°C.
// The shipped WASM provider has NO rise_trans API: this test uses only
// its independent swe_calc(EQUATORIAL) position to solve the rise/set roots.
import assert from 'node:assert/strict';
import { getSwe, C } from '../public/horoscope/offline/wasm-provider.mjs';
import { full } from '../public/horoscope/offline/offline-engine.mjs';
import { traditionalAharganaLords } from '../public/horoscope/offline/swiss_vedic.browser.mjs';
import {
  bphsGmstDegrees,bphsApparentSolarHour,bphsSolarAltitudeDegrees,
  bphsSwissSolarEvents,bphsSwissKalaContext,bphsCheshtaFromOrbitalElements
} from '../public/horoscope/offline/bphs-swiss-solar-cheshta.browser.mjs';
let checks=0;
const yes=(v,m)=>{assert.ok(v,m);checks++;};
const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++;};
const near=(a,b,eps,m)=>{assert.ok(Number.isFinite(a)&&Math.abs(a-b)<eps,m+' got '+a+' expected '+b);checks++;};
const w=await getSwe();
function solarAtUtcMs(ms){
  const d=new Date(ms);
  const j=w.utcToJd(d.getUTCFullYear(),d.getUTCMonth()+1,d.getUTCDate(),
    d.getUTCHours(),d.getUTCMinutes(),d.getUTCSeconds()+d.getUTCMilliseconds()/1000);
  const q=w.calc(j.et,C.SUN,2|2048);
  return {jdUt:j.ut,rightAscensionDegrees:q.longitude,declinationDegrees:q.latitude};
}
const jd=2451545.0,gmst=bphsGmstDegrees(jd),lon=78.88;
near(bphsApparentSolarHour(jd,gmst+lon,lon),12,1e-10,'Hour angle zero = apparent noon');
near(bphsApparentSolarHour(jd,gmst+lon+180,lon),0,1e-10,'Hour angle 180 = apparent midnight');
near(bphsApparentSolarHour(jd,gmst+lon+90,lon),6,1e-10,'Sun east of meridian = morning 06:00');
near(bphsApparentSolarHour(jd,gmst+lon-90,lon),18,1e-10,'Sun west of meridian = evening 18:00');
near(bphsSolarAltitudeDegrees(jd,gmst+lon,0,0,lon),90,1e-9,'Equatorial Sun at zenith');
near(bphsSolarAltitudeDegrees(jd,gmst+lon+180,0,0,lon),-90,1e-9,'Equatorial Sun at nadir');
const refs=[
 ['1994-06-15','13:03',351+30/60,1118+10/60],
 ['2015-09-06','09:30',364+25/60,1101+25/60],
 ['1992-07-31','22:05',362+16/60,1119+14/60],
 ['1971-05-04','05:05',355+2/60,1107+43/60],
 ['1974-01-11','16:04',396+49/60,1087+46/60]
];
for(const [date,time,sunriseRef,sunsetRef] of refs){
 const s=bphsSwissSolarEvents(date,11.232,78.88,330,solarAtUtcMs);
 yes(s!==null,date+' Swiss Sun altitude has rise/set');
 near(s.sunriseMinutes,sunriseRef,.3,date+' rise vs independent Swiss rise_trans (18 sec)');
 near(s.sunsetMinutes,sunsetRef,.3,date+' set vs independent Swiss rise_trans (18 sec)');
 eq(s.ephemerisBased,true,date+' Swiss equatorial position used');
 eq(s.meteorologicallyExact,false,date+' not falsely claiming weather precision');
 const tc=bphsSwissKalaContext({date,time,latitude:11.232,longitude:78.88,utcOffsetMinutes:330},
   solarAtUtcMs,traditionalAharganaLords);
 yes(tc?.ephemerisBased===true,date+' BPHS Kala sector from numerical solar events');
 yes(tc.horaStep>=0&&tc.horaStep<=23,date+' 24 hora sectors');
 yes(tc.tribhagaIndex>=0&&tc.tribhagaIndex<=2,date+' three parts of true day or night');
 const r=await full({date,time,lat:11.232,lon:78.88,utcOffsetMinutes:330,referenceDate:'2026-10-17',name:'V363 true Sun'});
 yes(r.ok,'actual Swiss natal birth '+date);
 const actual=r.chart.planets.filter(x=>['சூரியன்','சந்திரன்','செவ்வாய்','புதன்','குரு','சுக்கிரன்','சனி'].includes(x.name));
 eq(actual.length,7,'seven natal planets');
 for(const p of actual){
   yes(p.strength3.solarTimeMethod.includes('Swiss Sun ephemeris'),date+' '+p.name+' Swiss-based Kala source');
   yes(Number.isFinite(p.strength3.birthApparentSolarHour),date+' '+p.name+' apparent hour valid');
   yes(Number.isFinite(p.strength3.totalVirupa),date+' '+p.name+' finite Shadbala');
   eq(p.strength3.classicalCertified,false,date+' five-planet Cheshta still not certified');
 }
}
// Arctic polar winter: do not invent sunrise for a day without one.
eq(bphsSwissSolarEvents('2026-12-21',69.65,18.96,60,solarAtUtcMs),null,'Tromso polar winter: no fabricated solar event');
// BPHS Ch27 vv24-25: exact Cheshta arithmetic GIVEN source-proven
// mean / true / seeghrocha inputs. The current Swiss WASM does not offer
// classical mean planetary longitudes / sheeghrocha, so this remains
// an isolated, non-natal-completeness calculator.
near(bphsCheshtaFromOrbitalElements(20,40,210).virupa,60,1e-12,'BPHS 180-degree kendra => 60 Virupa');
near(bphsCheshtaFromOrbitalElements(10,50,120).virupa,30,1e-12,'BPHS 90-degree kendra => 30 Virupa');
near(bphsCheshtaFromOrbitalElements(359,1,90).virupa,30,1e-12,'BPHS mean/true midpoint crosses 360 degrees');
near(bphsCheshtaFromOrbitalElements(10,10,10).virupa,0,1e-12,'BPHS zero kendra zero Cheshta');
near(bphsCheshtaFromOrbitalElements(10,10,190).virupa,60,1e-12,'BPHS opposite apogee max');
eq(bphsCheshtaFromOrbitalElements(20,40,210).natalCertified,false,'exact arithmetic is not natal input certification');
assert.throws(()=>bphsCheshtaFromOrbitalElements(10,undefined,20),TypeError);checks++;
console.log(JSON.stringify({pass:true,assertions:checks,bphsReference:'R Santhanam BPHS I Chapter 27 verses 8-13 and 24-25',independentEphemerisOracle:'Swiss Ephemeris rise_trans v2.10.03 five Perambalur historical dates, within 18 seconds at sea level',realNatalCharts:refs.length,cheshtaArithmeticGivenInputs:true,fullShadbalaCertified:false,blockers:['Traditional five-planet mean longitudes/Sheeghrocha unavailable in deployed Swiss wrapper','BPHS Chapter26 Drig special-aspect prose vs explanatory note not numerically reconciled','Atmospheric refraction, elevation and meteorological values not supplied']}));
