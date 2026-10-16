// V357 BPHS I Ch 27 Paksha Bala — Mercury conjunction-dependent status.
// Moon-phase source separation and Moon Paksha point model remain un-certified.
// Shodhana is explicitly skipped.
import assert from 'node:assert/strict';
import {pakshaBala} from '../public/horoscope/offline/swiss_vedic.browser.mjs';
import {full} from '../public/horoscope/offline/offline-engine.mjs';
const P=(name,longitude)=>({name,longitude});
const SN='சூரியன்',MN='சந்திரன்',MC='புதன்',MA='செவ்வாய்',SAT='சனி',JU='குரு',VE='சுக்கிரன்',RA='ராகு';
let tests=0;
const eq=(a,b,m)=>{assert.equal(a,b,m);tests++};
const near=(a,b,m)=>{assert.ok(Math.abs(a-b)<0.002,m+': actual '+a+' expected '+b);tests++};
// 120° from Sun to Moon => standard benefic 40, malefic 20 Virupas.
const b=[P(SN,0),P(MN,120),P(MC,100)];
eq(pakshaBala(MC,0,120,b),40,'Mercury without malefic conjunction receives benefic Paksha');
eq(pakshaBala(JU,0,120,b),40,'Jupiter unchanged benefic Paksha');
eq(pakshaBala(VE,0,120,b),40,'Venus unchanged benefic Paksha');
eq(pakshaBala(SAT,0,120,b),20,'Saturn unchanged malefic Paksha');
eq(pakshaBala(MC,0,120,[...b,P(MA,102)]),20,'Mars in Mercury sign makes Mercury malefic');
eq(pakshaBala(MC,0,120,[...b,P(SAT,110)]),20,'Saturn in Mercury sign makes Mercury malefic');
eq(pakshaBala(MC,0,120,[...b,P(RA,119)]),20,'Rahu in Mercury sign makes Mercury malefic');
eq(pakshaBala(MC,0,120,[...b,P(MA,89)]),40,'Mars in previous sign does not conj Mercury');
eq(pakshaBala(MC,0,120,[P(SN,100),P(MN,220),P(MC,110)]),20,'Mercury in Sun sign makes Mercury malefic');
eq(pakshaBala(MC,0,120,[P(SN,200),P(MN,320),P(MC,100)]),40,'Mercury far from Sun remains benefic');
const births=[['1994-06-15','13:03'],['2015-09-06','09:30'],['1992-07-31','22:05'],['1971-05-04','05:05'],['1974-01-11','16:04']];
for(const [date,time] of births){
 const r=await full({date,time,lat:11.232,lon:78.88,utcOffsetMinutes:330,referenceDate:'2026-10-16',name:'V357 Paksha'});
 const planets=r.chart.planets;
 const sun=planets.find(x=>x.name===SN),moon=planets.find(x=>x.name===MN),mercury=planets.find(x=>x.name===MC);
 assert.ok(sun&&moon&&mercury&&mercury.strength3);tests++;
 near(mercury.strength3.components.kala.paksha,pakshaBala(MC,sun.longitude,moon.longitude,planets),date+' actual phase3 Paksha agrees with book-status helper');
}
console.log(JSON.stringify({pass:true,assertions:tests,reference:'BPHS I Chapter 27 pp. 269-270',certifies:'Conjunction status of Mercury Paksha Bala; not complete Shadbala',shodhana:'SKIPPED'}));