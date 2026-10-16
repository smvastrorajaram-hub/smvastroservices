// V364 — Swiss modern osculating orbital elements versus BPHS/UK classical
// Cheshta eligibility. Independent Swiss Ephemeris 2.10.03 pyswisseph
// get_orbital_elements(..., FLG_MOSEPH) approximate numerical reference,
// generated independently of the local Swiss-WASM SWIEPH data.
//
// Mean longitudes herein are HELIOCENTRIC MODERN MEANS. NEVER auto-substitute
// for the SIDEREAL CLASSICAL BPHS mean longitudes / Sheeghrocha.
// The five-graha mean-vs-Sheeghrocha input-selection oracle is taken from
// Uttara Kalamrita Ch II pp42–43, not copied from PyJHora AGPL code.
import assert from 'node:assert/strict';
import {getSwe,C} from '../public/horoscope/offline/wasm-provider.mjs';
import {bphsFivePlanetCheshtaFromClassicalMeans as classic,
  bphsCheshtaFromOrbitalElements as formula
} from '../public/horoscope/offline/bphs-swiss-solar-cheshta.browser.mjs';
import {full} from '../public/horoscope/offline/offline-engine.mjs';
import {compareSwissOsculatingWithClassicalCheshta as explore} from '../public/horoscope/offline/bphs-cheshta-swiss-orbital-research.browser.mjs';
const norm=x=>((x%360)+360)%360;
let n=0;
function ok(x,desc){assert.ok(x,desc);n++}
function eq(a,b,desc){assert.deepEqual(a,b,desc);n++}
function close(a,b,tol,desc){assert.ok(Number.isFinite(a)&&Math.abs(a-b)<=tol,desc+' actual='+a+' oracle='+b);n++}
function arc(a,b){const diff=Math.abs(norm(a)-norm(b));return Math.min(diff,360-diff)}
// Header fields are [Mercury, Venus, Mars, Jupiter, Saturn, Earth] in degrees.
// Moshier reference is a separate Swiss astronomical model; expect small
// model-dependent differences from the local SWIEPH version.
const cases=[
 ['1994-06-15','13:03',2449518.815279907,[240.41616,175.76815,13.65972,226.01862,342.11635,263.43682]],
 ['2015-09-06','09:30',2457271.667455833,[287.71597,356.84626,116.41815,150.20734,241.52706,344.71967]],
 ['1992-07-31','22:05',2448835.191657222,[322.79965,160.51305,15.41386,169.21790,319.27536,309.65328]],
 ['1971-05-04','05:05',2441075.483119417,[247.44134,328.44600,269.07160,244.55615,59.44936,221.61601]],
 ['1974-01-11','16:04',2442058.940800740,[312.08139,104.07795,64.44113,326.26168,92.30399,110.91820]]
];
const wes=await getSwe();
eq(typeof wes.orbitalElements,'function','existing WASM exposes Swiss orbital elements read-only');
const identities=[[C.MERCURY,'Mercury'],[C.VENUS,'Venus'],[C.MARS,'Mars'],[C.JUPITER,'Jupiter'],[C.SATURN,'Saturn'],[14,'Earth']];
const summaries=[];
for(const [date,time,referenceEt,means] of cases){
 const [yy,mm,dd]=date.split('-').map(Number),[hh,min]=time.split(':').map(Number);
 const utc=new Date(Date.UTC(yy,mm-1,dd,hh,min)-330*60_000);
 const ephe=wes.utcToJd(utc.getUTCFullYear(),utc.getUTCMonth()+1,utc.getUTCDate(),
     utc.getUTCHours(),utc.getUTCMinutes(),utc.getUTCSeconds());
 close(ephe.et,referenceEt,1e-4,date+' Swiss ET Julian day oracle');
 const row=[];
 for(let i=0;i<identities.length;i++){
   const [body,name]=identities[i];
   const o=wes.orbitalElements(ephe.et,body);
   ok(o.semiMajorAxisAU>0.2&&o.semiMajorAxisAU<32,date+' '+name+' credible orbital radius');
   ok(o.eccentricity>=0&&o.eccentricity<.25,date+' '+name+' physical eccentricity');
   ok(o.meanLongitude>=0&&o.meanLongitude<360,date+' '+name+' modern longitude [0,360)');
   ok(arc(o.meanLongitude,norm(o.meanAnomaly+o.perihelionLongitude))<1e-5,
       date+' '+name+' independent mean longitude = perihelion + mean anomaly');
   ok(arc(o.meanLongitude,means[i])<0.25,
       date+' '+name+' Swiss SWIEPH vs independent pyswisseph Moshier mean degree');
   eq(o.frame,'modern-heliocentric-osculating',date+' '+name+' coordinates clearly marked');
   eq(o.BPHSClassicalCertified,false,date+' '+name+' not falsely BPHS certified');
   eq(o.canReplaceClassicalMeanLongitude,false,date+' '+name+' cannot override BPHS calculator');
   row.push({planet:name,swissModernMeanDeg:Number(o.meanLongitude.toFixed(4)),
      moshierIndependentMeanDeg:means[i]});
 }
 const natal=await full({date,time,lat:11.232,lon:78.88,utcOffsetMinutes:330,referenceDate:'2026-10-17',name:'V364 read-only orbital comparison'});
 ok(natal.ok,date+' natal calculations preserved');
 for(const body of natal.chart.planets.filter(x=>['செவ்வாய்','புதன்','குரு','சுக்கிரன்','சனி'].includes(x.name))){
   eq(body.strength3.classicalCertified,false,date+' '+body.name+' classical certification is not faked');
   ok(Number.isFinite(body.strength3.components.cheshta),date+' '+body.name+' existing Cheshta finite');
 }
 summaries.push({date,reference:row});
}
// The source rule from UK is mathematical and requires genuine classical
// sidereal mean and true longitudes in a compatible frame.
const out={
 'செவ்வாய்':[80,100,20,70/3],
 'புதன்':[20,50,55,20/3],
 'குரு':[130,110,20,100/3],
 'சுக்கிரன்':[20,80,91,41/3],
 'சனி':[270,280,20,105/3]
};
const sunMean=20,owned={'செவ்வாய்':80,'புதன்':55,'குரு':130,'சுக்கிரன்':91,'சனி':270};
const trueLon={'செவ்வாய்':100,'புதன்':50,'குரு':110,'சுக்கிரன்':80,'சனி':280};
for(const [name,[m,t,sh,k]] of Object.entries(out)){
 const r=classic(name,sunMean,owned[name],trueLon[name]);
 close(r.meanLongitude,m,1e-10,name+' classical selector mean');
 close(r.trueLongitude,t,1e-10,name+' classical selector true');
 close(r.sheeghrocha,sh,1e-10,name+' classical selector Sheeghrocha');
 close(r.virupa,k,1e-10,name+' exact BPHS Cheshta Virupas after UK selection');
 eq(r.natalCertified,false,name+' classical source inputs not certified');
}
close(classic('செவ்வாய்',359,1,3).virupa,1,1e-10,'360 degree classical mean/true boundary');
assert.throws(()=>classic('சூரியன்',20,80,100),RangeError);n++;
assert.throws(()=>classic('செவ்வாய்',20,undefined,100),TypeError);n++;
assert.throws(()=>wes.orbitalElements(2451545,C.SUN),RangeError);n++;
assert.throws(()=>wes.orbitalElements(NaN,C.MARS),RangeError);n++;
assert.throws(()=>wes.orbitalElements(2451545,C.MARS,65536),RangeError);n++;
// Exercise the isolated research-only comparison in addition to the lower
// level Swiss getter: 1 real birth, 5 grahas, and hard no-production gates.
const exploreOut=await explore({date:'1992-07-31',time:'22:05',utcOffsetMinutes:330});
eq(exploreOut.planets.length,5,'Research comparator computes five book-eligible planets');
eq(exploreOut.classicalCheshtaCertified,false,'Research trial cannot certify classical Cheshta');
eq(exploreOut.productionShadbalaChanged,false,'Research trial does not mutate live Shadbala');
for(const p of exploreOut.planets){
 ok(p.withinArithmeticRange,'Research trial '+p.planet+' gives 0-60 only as arithmetic range');
 eq(p.canReplaceCurrentStrength3,false,'Research trial '+p.planet+' cannot replace current strength');
 eq(p.natalCertified,false,'Research trial '+p.planet+' not a verified book mean');
 eq(p.sourceFrames.trueLongitude,'Swiss geocentric Lahiri sidereal','Research trial '+p.planet+' true longitude frame');
}
assert.throws(()=>explore({date:'invalid',time:'22:05',utcOffsetMinutes:330}),RangeError);n++;
console.log(JSON.stringify({pass:true,assertions:n,method:'read-only modern Swiss orbital elements verified against independent Moshier five Perambalur births; book five-planet BPHS+UK input selection',comparison:summaries,shadbalaClassicalCertified:false,liveCheshtaSource:'unchanged speed-based provisional',notes:['Modern orbital elements not classical mean/Sheeghrocha','PyJHora uses a different Ujjain-1900 mean-motion model under AGPL-3.0 and is NOT copied','BPHS true full numerical certification requires independently validated classical sidereal mean positions']}));
