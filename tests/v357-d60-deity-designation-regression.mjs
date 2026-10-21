// V357 BPHS I Chapter 6 Shashtiamsa: distinction of D60 sign-lord
// calculation and forward/reversed DESIGNATION names.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {shashtiamsaDesignation as web,advanced as browserAdvanced} from '../public/horoscope/offline/astro_advanced.browser.mjs';
import {full} from '../public/horoscope/offline/offline-engine.mjs';
const require=createRequire(import.meta.url);
const {shashtiamsaDesignation:server}=require('../astro_advanced.js');
const bookNames=[
'Ghora','Rakshasa','Deva','Kubera','Yaksha','Kinnara','Bhrashta','Kulaghna','Garala','Vahni',
'Maya','Purishaka','Apampathi','Marutwan','Kala','Sarpa','Amrita','Indu','Mridu','Komala',
'Heramba','Brahma','Vishnu','Maheswara','Deva','Ardra','Kalinasa','Kshiteesa','Kamalakara','Gulika',
'Mrithyu','Kaala','Davagni','Ghora','Yama','Kantaka','Sudha','Amrita','Poornachandra','Vishadagdha',
'Kulanasa','Vamsakshaya','Utpata','Kaala','Saumya','Komala','Seetala','Karala Damshtra','Chandramukhi','Praveena',
'Kalapavaka','Dandayudha','Nirmala','Saumya','Kroora','Atiseetala','Amrita','Payodhi','Bhramana','Chandrarekha'];
const signLord=['செவ்வாய்','சுக்கிரன்','புதன்','சந்திரன்','சூரியன்','புதன்','சுக்கிரன்','செவ்வாய்','குரு','சனி','சனி','குரு'];
const benefic=new Set([3,4,5,6,13,14,17,18,19,20,21,22,23,24,25,26,28,29,37,38,39,45,46,47,49,50,53,54,56,57,58,60]);
let assertions=0;
const eq=(a,b,msg)=>{assert.deepEqual(a,b,msg);assertions++};
eq(bookNames.length,60,'book table has 60 subdivisions');
for(let r=0;r<12;r++)for(let i=0;i<60;i++)for(const dx of [0,0.25,0.499999]){
 const lon=r*30+i*0.5+dx;
 const expectedSign=(r+i)%12;
 const j=r%2===0?i:59-i;
 const ordinal=j+1,expectedQuality=ordinal===27?'disputed':benefic.has(ordinal)?'benefic':'malefic';
 const a=web(lon);
 eq(a.signIndex,expectedSign,'BPHS D60 lord sign r '+r+' part '+(i+1));
 eq(a.signLord,signLord[expectedSign],'BPHS actual classical sign lord r '+r+' part '+(i+1));
 eq(a.sequence,ordinal,'BPHS odd/even name numbering '+lon);
 eq(a.name,bookNames[j],'BPHS deity name '+lon);
 eq(a.quality,expectedQuality,'printed B/M classification or explicit dispute '+lon);
 eq(server(lon),a,'server and browser D60 full metadata parity '+lon);
}
const venusCapricorn=9*30+13+25/60;
const a=web(venusCapricorn);
eq(a.signIndex,11,'printed Capricorn 13°25 is Pisces sign');
eq(a.signLord,'குரு','printed Capricorn D60 is ruled by Jupiter');
eq(a.sequence,34,'Capricorn even sign designations reverse');
eq(a.name,'Ghora','Capricorn 13°25 has odd-list name 34 due reversal');
const birth=[['1994-06-15','13:03'],['2015-09-06','09:30'],['1992-07-31','22:05'],['1971-05-04','05:05'],['1974-01-11','16:04']];
for(const [date,time] of birth){
 const f=await full({date,time,lat:11.232,lon:78.88,utcOffsetMinutes:330,referenceDate:'2026-10-16',name:'V357 D60 metadata'});
 const d60=f.advanced.vargas.find(v=>v.division==='D-60');
 assert.ok(d60&&d60.planets.length>=7);assertions++;
 for(const p of d60.planets){
  eq(p.shashtiamsa,web(p.natalLongitude),date+' D60 name metadata for '+p.planet);
 }
}
console.log(JSON.stringify({pass:true,assertions,scopes:['D60 book 60 names','odd/even reversal','D60 sign ruler','book B/M labels with #27 disputed','five natal charts','browser-server parity'],shodhana:'SKIPPED',deityPredictionCertified:false}));