// SMV ASTRO five-reference-book structural calculation audit.
 // This verifies the EXISTENCE and internal integrity of implemented numerical
 // structures. It is NOT a claim that 2,116 book pages or prediction rules
 // have been exhaustively validated, nor that astrological outcomes are factual.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {full} from '../public/horoscope/offline/offline-engine.mjs';
const sampleBirths=[
 ['1994-06-15','13:03'],['2015-09-06','09:30'],
 ['1992-07-31','22:05'],['1971-05-04','05:05'],
 ['1974-01-11','16:04']
];
const divisions=[1,2,3,4,7,9,10,12,16,20,24,27,30,40,45,60];
const expectedTotals={'சூரியன்':48,'சந்திரன்':49,'செவ்வாய்':39,'புதன்':54,'குரு':56,'சுக்கிரன்':52,'சனி':39};
const zodiacLords=['செவ்வாய்','சுக்கிரன்','புதன்','சந்திரன்','சூரியன்','புதன்','சுக்கிரன்','செவ்வாய்','குரு','சனி','சனி','குரு'];
const raw=fs.readFileSync(new URL('../public/horoscope/offline/astro_advanced.browser.mjs',import.meta.url),'utf8');
const owners=raw.match(/const SIGN_LORDS=(\[[^\]]+\])/);
assert.ok(owners,'Advanced sign-lord table present');
const configured=[...owners[1].matchAll(/'([^']+)'/g)].map(x=>x[1]);
assert.deepEqual(configured,zodiacLords,'All twelve classical sign lords, especially Aries/Mars');
let checks=1;
const test=(v,why)=>{assert.ok(v,why);checks++};
const summary=[];
for(const [date,time] of sampleBirths){
 const r=await full({date,time,lat:11.232,lon:78.88,utcOffsetMinutes:330,referenceDate:'2026-10-16',name:'Book audit'});
 const c=r.chart,a=r.advanced;
 test(r.ok&&Array.isArray(c.planets)&&c.planets.length===9,date+' Swiss full natal chart');
 test(Array.isArray(c.bhavas)&&c.bhavas.length===12,date+' Sripati houses');
 const validIndex=l=>Number.isFinite(Number(l))&&Number(l)>=0&&Number(l)<360;
 for(let h=0;h<12;h++){
  const b=c.bhavas[h];
  test(validIndex(b?.madhyaLongitude),date+' house midpoint '+(h+1));
  test(Number(b.rasiIndex)===Math.floor(Number(b.madhyaLongitude)/30),date+' midpoint sign '+(h+1));
 }
 for(const p of c.planets){
  test(validIndex(p.longitude)&&p.strength,date+' calculated state '+p.name);
  test(typeof p.strength.retrograde==='boolean'&&typeof p.strength.combustion==='boolean',date+' planetary motion '+p.name);
 }
 const v=a?.vargas||[];
 test(v.length===divisions.length,date+' all sixteen division charts available');
 const actual=v.map(x=>Number(String(x.division).replace('D-',''))).sort((x,y)=>x-y);
 assert.deepEqual(actual,divisions,date+' 16 canonical Varga divisors');checks++;
 for(const x of v){
  test(x.planets?.length===9&&x.planets.every(p=>validIndex(p.longitude)),date+' D'+x.division+' 9 valid positions');
 }
 const av=a?.ashtakavarga||{};
 test(av.bhinna?.length===7&&av.sarva?.length===12,date+' classical seven-planet BAV / twelve-sign SAV');
 for(const row of av.bhinna||[]){
  test(row.bindus?.length===12,date+' 12 BAV signs '+row.planet);
  test(row.total===expectedTotals[row.planet],date+' independent BAV total '+row.planet);
 }
 test(av.sarvaTotal===337&&av.sarva.reduce((x,y)=>x+y,0)===337,date+' SAV 337');
 test(av.validation?.ok===true,date+' built-in SAV validation');
 test(Array.isArray(c.dashas?.periods)&&c.dashas.periods.length===9,date+' nine Vimshottari Mahadashas');
 summary.push({date,divisions:v.length,sav:av.sarvaTotal,grahas:c.planets.length,bhava:c.bhavas.length});
}
test(raw.includes('function ashtakavarga(')&&!raw.includes('function trikonaShodhana('),'Base Ashtakavarga is present; do not silently claim separate classical Shodhana is implemented here');
const pub=fs.readFileSync(new URL('../public/horoscope/prediction-rules-published.js',import.meta.url),'utf8');
const publishedMatch=pub.match(/window\\.SMVPUBLISHED_PREDICTION_RULES\\s*=\\s*(\\[[\\s\\S]*?\\]);/);
let publishedRules=[];
if(publishedMatch){try{publishedRules=vm.runInNewContext('('+publishedMatch[1]+')',{}, {timeout:5000});}catch{}}
test(Array.isArray(publishedRules)&&publishedRules.length>=1,
  'Admin/static offline prediction fallback contains reviewed contextual rules; this is not a complete classical rule publication');
test(publishedRules.every(rule=>rule.channel==='natal'&&rule.effect?.ta&&rule.effect?.en&&rule.effect.mode==='append'),
  'static fallback prediction rules remain bilingual and append-only');
console.log(JSON.stringify({pass:true,checks,scope:'classical calculation structure, NOT book rule accuracy',sampleCharts:summary,bookRuleCertification:false,staticFallbackRules:publishedRules.length,fullClassicalCertification:false}));
