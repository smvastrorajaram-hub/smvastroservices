import assert from 'node:assert/strict';

import {
  SHADBALA_NATURAL as researchNatural,
  sthanaClassical as researchSthana,
  pakshaBala as researchPaksha,
  ayanaBala as researchAyana,
  drikBalaClassical as researchDrik,
  traditionalAharganaLords as researchAhargana
} from '../research/true-bphs/bphs-components.mjs';

import {
  SHADBALA_NATURAL as sourceNatural,
  sthanaClassical as sourceSthana,
  pakshaBala as sourcePaksha,
  ayanaBala as sourceAyana,
  drikBalaClassical as sourceDrik,
  traditionalAharganaLords as sourceAhargana
} from '../public/horoscope/offline/swiss_vedic.browser.mjs';

const GRAHAS=['சூரியன்','சந்திரன்','செவ்வாய்','புதன்','குரு','சுக்கிரன்','சனி'];
const SEED=0x42504853;
let state=SEED>>>0,checks=0;
const random=()=>{
 state^=state<<13;state^=state>>>17;state^=state<<5;
 return (state>>>0)/4294967296;
};
const eq=(a,b,message)=>{
 assert.deepEqual(a,b,message);checks++;
};
const near=(a,b,message)=>{
 assert.ok(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-12,
  message+' research='+a+' repository='+b);checks++;
};

eq(researchNatural,sourceNatural,'all seven exact BPHS Naisargika constants match repository source');
for(const date of ['1800-01-01','1860-01-01','1918-10-16','1971-05-04','1984-06-01','2026-03-22','2399-12-31']){
 eq(researchAhargana(date),sourceAhargana(date),'Ahargana / solar calendar lords match '+date);
}

for(let sample=0;sample<60;sample++){
 const planets=GRAHAS.map((name,index)=>({
  name,longitude:random()*360,
  speed:(random()-.5)*2,
  eclipticLatitude:(random()-.5)*4,
  bhava:1+Math.floor(random()*12)
 }));
 planets.push(
  {name:'ராகு',longitude:random()*360,speed:-.05,eclipticLatitude:(random()-.5)*2,bhava:1+Math.floor(random()*12)},
  {name:'கேது',longitude:random()*360,speed:-.05,eclipticLatitude:(random()-.5)*2,bhava:1+Math.floor(random()*12)}
 );
 const rasi=Object.fromEntries(planets.filter(p=>GRAHAS.includes(p.name))
  .map(p=>[p.name,Math.floor(p.longitude/30)]));
 const sun=planets.find(p=>p.name==='சூரியன்').longitude;
 const moon=planets.find(p=>p.name==='சந்திரன்').longitude;
 for(const name of GRAHAS){
  const planet=planets.find(p=>p.name===name);
  eq(researchSthana(name,planet.longitude,planet.bhava,rasi),
   sourceSthana(name,planet.longitude,planet.bhava,rasi),
   'Sthana source parity '+sample+' '+name);
  near(researchPaksha(name,sun,moon,planets),
   sourcePaksha(name,sun,moon,planets),
   'Paksha source parity '+sample+' '+name);
  const declination=(random()-.5)*46;
  near(researchAyana(declination,name),sourceAyana(declination,name),
   'Ayana source parity '+sample+' '+name);
  near(researchDrik(name,planets),sourceDrik(name,planets),
   'Drig source parity '+sample+' '+name);
 }
}

console.log(JSON.stringify({
 pass:true,checks,seed:'0x'+SEED.toString(16).toUpperCase(),
 randomPlanetarySamples:60,grahaComponentComparisons:60*7*4,
 aharganaAnchorDates:7,
 status:'TRUE_BPHS_COMPONENT_HELPERS_MATCH_EXISTING_REPOSITORY_BPHS_IMPLEMENTATION'
},null,2));
