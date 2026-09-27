'use strict';

// V138: Swiss Ephemeris primary Vedic calculation layer.
// The project must provide its own licensed ephemeris data in ./ephe or via
// SWISSEPH_EPHE_PATH. No ephemeris binaries are bundled in this patch.
const swe = require('sweph');
const { constants: C } = swe;
const path = require('path');
const fs = require('fs');

const RASIS = ['மேஷம்','ரிஷபம்','மிதுனம்','கடகம்','சிம்மம்','கன்னி','துலாம்','விருச்சிகம்','தனுசு','மகரம்','கும்பம்','மீனம்'];
const NAKSHATRAS = ['அஸ்வினி','பரணி','கார்த்திகை','ரோகிணி','மிருகசீரிடம்','திருவாதிரை','புனர்பூசம்','பூசம்','ஆயில்யம்','மகம்','பூரம்','உத்திரம்','ஹஸ்தம்','சித்திரை','சுவாதி','விசாகம்','அனுஷம்','கேட்டை','மூலம்','பூராடம்','உத்திராடம்','திருவோணம்','அவிட்டம்','சதயம்','பூரட்டாதி','உத்திரட்டாதி','ரேவதி'];
const NAK_LORDS = ['கேது','சுக்கிரன்','சூரியன்','சந்திரன்','செவ்வாய்','ராகு','குரு','சனி','புதன்'];
const PLANETS = [
  ['சூரியன்', C.SE_SUN], ['சந்திரன்', C.SE_MOON], ['செவ்வாய்', C.SE_MARS], ['புதன்', C.SE_MERCURY],
  ['குரு', C.SE_JUPITER], ['சுக்கிரன்', C.SE_VENUS], ['சனி', C.SE_SATURN]
];
const nodeId = C.SE_MEAN_NODE;
function norm360(x){ x%=360; return x<0?x+360:x; }
function zodiac(lon){ const x=norm360(lon), i=Math.floor(x/30), d=x-i*30; return {index:i,sign:RASIS[i],degree:d}; }
function degText(x){ const z=zodiac(x), d=Math.floor(z.degree), m=Math.floor((z.degree-d)*60); return `${String(d).padStart(2,'0')}° ${String(m).padStart(2,'0')}′`; }
function nakshatra(lon){ const span=360/27, q=norm360(lon), i=Math.floor(q/span), within=q-i*span; return {index:i,name:NAKSHATRAS[i],pada:Math.floor(within/(span/4))+1,lord:NAK_LORDS[i%9]}; }
function navamsa(lon){
  const q=norm360(lon), r=Math.floor(q/30), part=Math.min(8,Math.floor((q%30)/(30/9)));
  const start=r%3===0?r:r%3===1?(r+8)%12:(r+4)%12;
  return {rasi:RASIS[(start+part)%12],pada:part+1};
}

// V156 Phase 1: planetary state and basic Vedic dignity.
// Longitudes are sidereal Lahiri values calculated above.
const EXALTATION = {
  'சூரியன்':{rasi:0,degree:10}, 'சந்திரன்':{rasi:1,degree:3},
  'செவ்வாய்':{rasi:9,degree:28}, 'புதன்':{rasi:5,degree:15},
  'குரு':{rasi:3,degree:5}, 'சுக்கிரன்':{rasi:11,degree:27},
  'சனி':{rasi:6,degree:20}
};
const DEBILITATION = {
  'சூரியன்':{rasi:6,degree:10}, 'சந்திரன்':{rasi:7,degree:3},
  'செவ்வாய்':{rasi:1,degree:28}, 'புதன்':{rasi:11,degree:15},
  'குரு':{rasi:9,degree:5}, 'சுக்கிரன்':{rasi:5,degree:27},
  'சனி':{rasi:0,degree:20}
};
const OWN_SIGNS = {
  'சூரியன்':[4], 'சந்திரன்':[3], 'செவ்வாய்':[0,7], 'புதன்':[2,5],
  'குரு':[8,11], 'சுக்கிரன்':[1,6], 'சனி':[9,10]
};
// Classical Moolatrikona spans, in degrees from the beginning of the sign.
const MOOLATRIKONA = {
  'சூரியன்':{rasi:4,from:0,to:20}, 'சந்திரன்':{rasi:1,from:4,to:30},
  'செவ்வாய்':{rasi:0,from:0,to:12}, 'புதன்':{rasi:5,from:16,to:20},
  'குரு':{rasi:8,from:0,to:10}, 'சுக்கிரன்':{rasi:6,from:0,to:15},
  'சனி':{rasi:10,from:0,to:20}
};
const NATURAL_RELATIONSHIPS = {
  'சூரியன்':{friends:['சந்திரன்','செவ்வாய்','குரு'],enemies:['சுக்கிரன்','சனி']},
  'சந்திரன்':{friends:['சூரியன்','புதன்'],enemies:[]},
  'செவ்வாய்':{friends:['சூரியன்','சந்திரன்','குரு'],enemies:['புதன்']},
  'புதன்':{friends:['சூரியன்','சுக்கிரன்'],enemies:['சந்திரன்']},
  'குரு':{friends:['சூரியன்','சந்திரன்','செவ்வாய்'],enemies:['புதன்','சுக்கிரன்']},
  'சுக்கிரன்':{friends:['புதன்','சனி'],enemies:['சூரியன்','சந்திரன்']},
  'சனி':{friends:['புதன்','சுக்கிரன்'],enemies:['சூரியன்','சந்திரன்','செவ்வாய்']}
};
// Standard Parashari/Vedic combustion thresholds measured from the Sun.
const COMBUSTION = {
  'சந்திரன்':null, 'செவ்வாய்':17, 'புதன்':{direct:14,retrograde:12},
  'குரு':11, 'சுக்கிரன்':{direct:10,retrograde:8}, 'சனி':15
};

function angularDistance(a,b){ const d=Math.abs(norm360(a)-norm360(b)); return Math.min(d,360-d); }
function planetaryState(name, lon, speed, sunLon){
  const z=zodiac(lon), r=z.index, retro=(name==='ராகு'||name==='கேது') ? true : Number(speed)<-1e-7;
  const ex=EXALTATION[name], deb=DEBILITATION[name], mt=MOOLATRIKONA[name];
  const mtActive=!!(mt && r===mt.rasi && z.degree>=mt.from && z.degree<mt.to);
  let dignity='நடுநிலை';
  if(ex && r===ex.rasi) dignity='உச்ச ராசி';
  else if(deb && r===deb.rasi) dignity='நீச ராசி';
  else if(mtActive) dignity='மூலத்திரிகோணம்';
  else if((OWN_SIGNS[name]||[]).includes(r)) dignity='சுய ராசி';
  const rel=NATURAL_RELATIONSHIPS[name]||{friends:[],enemies:[]};
  const signLord=[ 'செவ்வாய்','சுக்கிரன்','புதன்','சந்திரன்','சூரியன்','புதன்','சுக்கிரன்','செவ்வாய்','குரு','சனி','சனி','குரு' ][r];
  let relationship='நடுநிலை';
  if(signLord===name) relationship='சுய ராசி';
  else if(rel.friends.includes(signLord)) relationship='நட்பு';
  else if(rel.enemies.includes(signLord)) relationship='பகை';
  const dist=angularDistance(lon,sunLon);
  let combustion=false, combustionLimit=null;
  const rule=COMBUSTION[name];
  if(rule!==null && rule!==undefined){ combustionLimit=typeof rule==='number'?rule:(retro?rule.retrograde:rule.direct); combustion=dist<=combustionLimit; }
  return {
    retrograde:retro, combustion, sunDistance:Number(dist.toFixed(6)),
    combustionLimit:combustionLimit, dignity, relationship, exalted:!!(ex&&r===ex.rasi), debilitated:!!(deb&&r===deb.rasi),
    ownSign:(OWN_SIGNS[name]||[]).includes(r), moolatrikona:mtActive, signLord
  };
}
function enrichPlanetaryStates(planets){
  const sun=planets.find(p=>p.name==='சூரியன்');
  return planets.map(p=>({...p,strength:planetaryState(p.name,p.longitude,p.speed||0,sun?.longitude??p.longitude)}));
}


// V158 Phase 2: advanced planetary strength indicators.
// This is an SMV composite strength layer, not a claim of a classical
// six-bala Shadbala implementation. It keeps the underlying Lahiri/SWE
// longitudes untouched and exposes six transparent components for UI use.
const NATURAL_BALA = {
  'சூரியன்':60, 'சந்திரன்':51.43, 'செவ்வாய்':17.14, 'புதன்':25.71,
  'குரு':34.29, 'சுக்கிரன்':42.86, 'சனி':8.57
};
const DIG_IDEAL_HOUSE = {'சூரியன்':10,'செவ்வாய்':10,'சந்திரன்':4,'சுக்கிரன்':4,'குரு':1,'புதன்':1,'சனி':7};
const BENEFICS = new Set(['குரு','சுக்கிரன்','புதன்','சந்திரன்']);
const MALefics = new Set(['சூரியன்','செவ்வாய்','சனி','ராகு','கேது']);
function circularHouseDistance(h1,h2){
  const a=((Number(h1)-1+12)%12), b=((Number(h2)-1+12)%12);
  const d=Math.abs(a-b); return Math.min(d,12-d);
}
function phase2Strength(name, lon, house, speed, state, planets, jdUt){
  if(name==='ராகு'||name==='கேது') return {available:false,reason:'Nodes excluded from the seven-planet strength score'};
  const ideal=DIG_IDEAL_HOUSE[name]||1;
  const dig=Math.max(0,Math.min(60,60*(1-circularHouseDistance(house,ideal)/6)));
  const dignity=state?.exalted?60:state?.moolatrikona?50:state?.ownSign?45:state?.debilitated?10:30;
  const kendra=[1,4,7,10].includes(Number(house));
  const trikona=[1,5,9].includes(Number(house));
  const sthana=Math.max(0,Math.min(60,dignity+(kendra?5:0)+(trikona?5:0)-(state?.combustion?10:0)));
  const maxSpeed={
    'சந்திரன்':15.0,'சூரியன்':1.02,'செவ்வாய்':0.79,'புதன்':1.95,'குரு':0.23,'சுக்கிரன்':1.26,'சனி':0.09
  }[name]||1;
  const absSpeed=Math.abs(Number(speed)||0);
  let cheshta=Number.isFinite(absSpeed)?Math.min(60,(absSpeed/maxSpeed)*45):0;
  if(state?.retrograde) cheshta=Math.max(cheshta,45);
  if(state?.combustion) cheshta=Math.max(0,cheshta-5);
  // Day/night + weekday component kept deliberately transparent.
  const jdPart=Number.isFinite(Number(jdUt))?Number(jdUt):0;
  const weekday=((Math.floor(jdPart+1.5)%7)+7)%7; // 0 Sunday ... 6 Saturday
  const dayPlanet=['சூரியன்','சந்திரன்','செவ்வாய்','புதன்','குரு','சுக்கிரன்','சனி'][weekday];
  const kala=30+(dayPlanet===name?20:0)+(BENEFICS.has(name)?5:0);
  let drik=30;
  const targetLon=norm360(lon);
  for(const q of (planets||[])){
    if(q.name===name||q.name==='ராகு'||q.name==='கேது') continue;
    const qHouse=Number(q.bhava)||0;
    const deltaHouse=circularHouseDistance(qHouse,house);
    let aspects=[];
    // 7th aspect for all planets; special Parashari aspects.
    if(deltaHouse===6) aspects.push(1);
    if(q.name==='செவ்வாய்'&&(deltaHouse===3||deltaHouse===7)) aspects.push(1);
    if(q.name==='குரு'&&(deltaHouse===4||deltaHouse===8)) aspects.push(1);
    if(q.name==='சனி'&&(deltaHouse===2||deltaHouse===9)) aspects.push(1);
    if(aspects.length){ const w=BENEFICS.has(q.name)?4:-4; drik+=w*aspects.length; }
  }
  drik=Math.max(0,Math.min(60,drik));
  const components={sthana:Number(sthana.toFixed(2)),dig:Number(dig.toFixed(2)),kala:Number(kala.toFixed(2)),cheshta:Number(cheshta.toFixed(2)),naisargika:Number(NATURAL_BALA[name].toFixed(2)),drik:Number(drik.toFixed(2))};
  const total=Object.values(components).reduce((a,b)=>a+b,0);
  const percent=total/3.6;
  const grade=percent>=75?'Very Strong':percent>=60?'Strong':percent>=45?'Moderate':percent>=30?'Weak':'Very Weak';
  return {available:true,components,total:Number(total.toFixed(2)),percent:Number(percent.toFixed(1)),grade};
}
function enrichPhase2(planets,jdUt){
  return planets.map(p=>({...p,strength2:phase2Strength(p.name,p.longitude,p.bhava,p.speed,p.strength,planets,jdUt)}));
}



// V158 Phase 3: Classical-style Parashari Shadbala.
// The six Bala framework follows the classical seven-graha model (Sun-Saturn).
// Rahu/Ketu are intentionally excluded from the Shadbala total.
const SHADBALA_REQUIRED = {
  'சூரியன்':300, 'சந்திரன்':360, 'செவ்வாய்':300, 'புதன்':420,
  'குரு':390, 'சுக்கிரன்':330, 'சனி':300
};
const SHADBALA_NATURAL = NATURAL_BALA;
const PLANET_GENDER = {
  'சூரியன்':'male','செவ்வாய்':'male','குரு':'male',
  'புதன்':'neutral','சனி':'neutral','சந்திரன்':'female','சுக்கிரன்':'female'
};
const VARA_LORDS = ['சூரியன்','சந்திரன்','செவ்வாய்','புதன்','குரு','சுக்கிரன்','சனி'];
const HORA_ORDER = ['சூரியன்','சுக்கிரன்','புதன்','சந்திரன்','சனி','குரு','செவ்வாய்'];
const SIGN_LORDS = ['செவ்வாய்','சுக்கிரன்','புதன்','சந்திரன்','சூரியன்','புதன்','சுக்கிரன்','செவ்வாய்','குரு','சனி','சனி','குரு'];
const SOLAR_MONTH_LORDS = SIGN_LORDS;
const NATURAL_REL = NATURAL_RELATIONSHIPS;
const MOOLOTRIKONA = MOOLATRIKONA;

function isOddSign(r){ return Number(r)%2===0; } // 0=Aries is sign 1, therefore odd.
function vargaSign(lon, division){
  const q=norm360(lon), r=Math.floor(q/30), deg=q-r*30;
  let idx=0, start=0;
  if(division===1) return r;
  if(division===2){ // Hora: odd signs Sun/Moon; even signs Moon/Sun.
    idx=deg<15 ? (isOddSign(r)?4:3) : (isOddSign(r)?3:4); return idx;
  }
  if(division===3){ idx=Math.min(2,Math.floor(deg/10)); return (r + idx*4)%12; }
  if(division===7){ const part=Math.min(6,Math.floor(deg/(30/7))); start=isOddSign(r)?r:(r+6)%12; return (start+part)%12; }
  if(division===9){ const start9=(r%3===0?r:r%3===1?(r+8)%12:(r+4)%12); return (start9+Math.min(8,Math.floor(deg/(30/9))))%12; }
  if(division===12){ return (r + Math.min(11,Math.floor(deg/2.5)))%12; }
  if(division===30){
    let lord;
    if(isOddSign(r)){
      if(deg<5) lord='செவ்வாய்'; else if(deg<10) lord='சனி'; else if(deg<18) lord='குரு'; else if(deg<25) lord='புதன்'; else lord='சுக்கிரன்';
    } else {
      if(deg<5) lord='சுக்கிரன்'; else if(deg<12) lord='புதன்'; else if(deg<20) lord='குரு'; else if(deg<25) lord='சனி'; else lord='செவ்வாய்';
    }
    const own={'செவ்வாய்':isOddSign(r)?0:7,'சனி':isOddSign(r)?10:9,'குரு':isOddSign(r)?8:11,'புதன்':isOddSign(r)?2:5,'சுக்கிரன்':isOddSign(r)?6:1};
    return own[lord];
  }
  return r;
}

function naturalRelation(p, other){
  if(p===other) return 'own';
  const rel=NATURAL_REL[p]||{friends:[],enemies:[]};
  if(rel.friends.includes(other)) return 'friend';
  if(rel.enemies.includes(other)) return 'enemy';
  return 'neutral';
}
function temporaryRelation(p, other, rasiPositions){
  const a=rasiPositions[p], b=rasiPositions[other];
  if(a===undefined||b===undefined) return 'neutral';
  const d=((b-a+12)%12)+1;
  return [2,3,4,10,11,12].includes(d)?'friend':'enemy';
}
function compoundRelation(p, other, rasiPositions){
  if(p===other) return 'own';
  const n=naturalRelation(p,other), t=temporaryRelation(p,other,rasiPositions);
  if(n==='friend' && t==='friend') return 'greatFriend';
  if(n==='friend' && t==='enemy') return 'friend';
  if(n==='neutral' && t==='friend') return 'friend';
  if(n==='neutral' && t==='enemy') return 'enemy';
  if(n==='enemy' && t==='friend') return 'neutral';
  if(n==='enemy' && t==='enemy') return 'greatEnemy';
  return 'neutral';
}
function vargaDignityPoints(planet, sign, rasiPositions){
  const lord=SIGN_LORDS[sign];
  const mt=MOOLOTRIKONA[planet];
  if(mt && mt.rasi===sign) return 45;
  if((OWN_SIGNS[planet]||[]).includes(sign)) return 30;
  const rel=compoundRelation(planet,lord,rasiPositions);
  return {greatFriend:22.5,friend:15,neutral:7.5,enemy:3.75,greatEnemy:1.875}[rel] ?? 7.5;
}
function ucchaBala(planet, lon){
  const deb=DEBILITATION[planet];
  if(!deb) return 0;
  const debLon=deb.rasi*30+deb.degree;
  let d=norm360(lon-debLon); if(d>180) d=360-d;
  return Math.max(0,Math.min(60,d/3));
}
function sthanaClassical(planet, lon, house, rasiPositions){
  const vargas=[1,2,3,7,9,12,30];
  const points={};
  points.uccha=ucchaBala(planet,lon);
  points.saptavargaja=vargas.reduce((sum,v)=>sum+vargaDignityPoints(planet,vargaSign(lon,v),rasiPositions),0);
  const d1=vargaSign(lon,1), d9=vargaSign(lon,9), g=PLANET_GENDER[planet];
  points.ojayugma=((g==='female')?(d1%2===1?0:15):(d1%2===0?0:15)) + ((g==='female')?(d9%2===1?0:15):(d9%2===0?0:15));
  const h=Number(house); points.kendradi=[1,4,7,10].includes(h)?60:([2,5,8,11].includes(h)?30:15);
  const dec=Math.min(2,Math.floor((lon%30)/10));
  points.drekkana=(g==='male'&&dec===0)||(g==='female'&&dec===2)||(g==='neutral'&&dec===1)?15:0;
  points.total=Object.values(points).reduce((a,b)=>a+b,0);
  return Object.fromEntries(Object.entries(points).map(([k,v])=>[k,Number(v.toFixed(3))]));
}
function digBalaClassical(planet, lon, bhavas){
  const idealHouse=DIG_IDEAL_HOUSE[planet]||1;
  const cusp=bhavas?.find(b=>Number(b.house)===idealHouse)?.longitude;
  if(!Number.isFinite(Number(cusp))) return 0;
  const d=angularDistance(lon,Number(cusp));
  return Math.max(0,Math.min(60,60*(1-d/180)));
}
function localSolarHour(jdUt, longitude){
  const days=jdUt-2451545.0;
  let h=(12 + days*24 + Number(longitude)/15)%24;
  if(h<0) h+=24;
  return h;
}
function natonnatha(planet, solarHour){
  if(planet==='புதன்') return 60;
  const diurnal=['சூரியன்','குரு','சுக்கிரன்'].includes(planet);
  const x=Math.abs(12-solarHour)/12;
  const dayStrength=60*(1-x);
  return diurnal?dayStrength:60-dayStrength;
}
function pakshaBala(planet, sunLon, moonLon){
  let d=norm360(moonLon-sunLon); if(d>180) d=360-d;
  const base=Math.min(60,d/3);
  if(planet==='சந்திரன்') return Math.min(120,base*2);
  const benefic=['குரு','சுக்கிரன்','புதன்'].includes(planet);
  return benefic?base:60-base;
}
function tribhagaBala(planet, solarHour){
  if(planet==='குரு') return 60;
  const day=solarHour>=6 && solarHour<18;
  let lord=null;
  if(day){ const part=Math.min(2,Math.floor((solarHour-6)/4)); lord=['புதன்','சூரியன்','சனி'][part]; }
  else { const h=solarHour>=18?solarHour-18:solarHour+6; const part=Math.min(2,Math.floor(h/4)); lord=['சந்திரன்','சுக்கிரன்','செவ்வாய்'][part]; }
  return planet===lord?60:0;
}
function horaLord(solarHour, weekday){
  const day=VARA_LORDS[weekday];
  // Approximate equal 1-hour sunrise-based horas (6:00 sunrise convention).
  let n=Math.floor(((solarHour-6+24)%24));
  return HORA_ORDER[(HORA_ORDER.indexOf(day)+n)%7];
}
function solarIngressLord(jdEt, targetSign, flags, useSwissFiles){
  // Find the most recent sidereal Sun ingress into targetSign, then use its weekday.
  let prev=null, curJd=jdEt;
  for(let i=0;i<=370;i++){
    const r=swe.calc(curJd,C.SE_SUN,flags); if(!r||r.error||!Array.isArray(r.data)) break;
    const lon=norm360(r.data[0]), sign=Math.floor(lon/30);
    if(sign===targetSign) { prev=curJd; break; }
    curJd-=1;
  }
  if(prev===null) return null;
  const date=new Date((prev-2440587.5)*86400000);
  return date.getUTCDay();
}
function ayanaBala(decl, planet){
  if(!Number.isFinite(decl)) return 30;
  let v;
  if(['சந்திரன்','சனி'].includes(planet)) v=(24-decl)*60/48;
  else if(planet==='புதன்') v=(24+Math.abs(decl))*60/48;
  else v=(24+decl)*60/48;
  return Math.max(0,Math.min(60,v));
}
function sputaDrishti(angle, aspector){
  const a=norm360(angle);
  let s=0;
  if(a<30||a>330) s=0;
  else if(aspector==='சனி'){
    if(a<60) s=(a-30)*2;
    else if(a<90) s=120-a;
    else if(a<120) s=90-a/2;
    else if(a<150) s=150-a;
    else if(a<180) s=2*a-300;
    else if(a<240) s=150-a/2;
    else if(a<270) s=a-210;
    else if(a<300) s=600-2*a;
  } else if(aspector==='செவ்வாய்'){
    if(a<60) s=a/2-15;
    else if(a<90) s=1.5*a-75;
    else if(a<150) s=150-a;
    else if(a<180) s=2*a-300;
    else if(a<210) s=150-a/2;
    else if(a<240) s=270-a;
    else if(a<300) s=150-a/2;
  } else if(aspector==='குரு'){
    if(a<60) s=a/2-15;
    else if(a<90) s=a-45;
    else if(a<120) s=a/2;
    else if(a<150) s=180-a;
    else if(a<180) s=2*a-300;
    else if(a<210) s=150-a/2;
    else if(a<240) s=a-150;
    else if(a<270) s=300-a;
    else if(a<300) s=150-a/2;
  } else {
    if(a<60) s=(a-30)/2;
    else if(a<90) s=a-45;
    else if(a<120) s=30+(120-a)/2;
    else if(a<150) s=150-a;
    else if(a<180) s=2*a-300;
    else if(a<300) s=(300-a)/2;
  }
  return Math.max(0,Math.min(60,s));
}
function drikBalaClassical(planet, planets){
  let pinda=0;
  for(const q of planets){
    if(q.name===planet || !SHADBALA_REQUIRED[q.name]) continue;
    const d=norm360(q.longitude);
    const t=norm360(planets.find(x=>x.name===planet).longitude);
    const angle=norm360(t-d);
    const aspect=sputaDrishti(angle,q.name);
    const benefic=['குரு','சுக்கிரன்'].includes(q.name) || (q.name==='புதன்' && !q.strength?.combustion);
    pinda += benefic?aspect:-aspect;
  }
  return pinda/4;
}
function motionClassical(planet, speed, state){
  if(planet==='சூரியன்'||planet==='சந்திரன்') return 0;
  const v=Math.abs(Number(speed)||0);
  if(state?.retrograde) return 60;
  const mean={'செவ்வாய்':0.524,'புதன்':1.383,'குரு':0.083,'சுக்கிரன்':1.203,'சனி':0.034}[planet]||v;
  const ratio=mean? v/mean:0;
  if(v<0.02*mean) return 15;
  if(ratio<0.5) return 15;
  if(ratio<0.9) return 30;
  if(ratio<1.15) return 7.5;
  if(ratio<1.6) return 45;
  return 30;
}
function phase3Strength(planet, chartPlanets, jdUt, jdEt, bhavas, rasiPositions, weekday, declinations, calcFlags){
  const p=chartPlanets.find(x=>x.name===planet); if(!p) return null;
  const state=p.strength||{};
  const sth=sthanaClassical(planet,p.longitude,p.bhava,rasiPositions);
  const dig=digBalaClassical(planet,p.longitude,bhavas);
  const solarHour=localSolarHour(jdUt,0); // Longitude correction is injected below by caller when available.
  const sun=chartPlanets.find(x=>x.name==='சூரியன்'), moon=chartPlanets.find(x=>x.name==='சந்திரன்');
  const sh=Number(p._solarHour??solarHour);
  const nat=natonnatha(planet,sh);
  const pak=pakshaBala(planet,sun.longitude,moon.longitude);
  const tri=tribhagaBala(planet,sh);
  const hLord=horaLord(sh,weekday);
  const hora=hLord===planet?60:0;
  const vara=VARA_LORDS[weekday]===planet?45:0;
  const masaLord=SIGN_LORDS[Math.floor(sun.longitude/30)];
  const masa=masaLord===planet?30:0;
  const abda=planet==='சூரியன்'?15:0;
  const ayana=ayanaBala(declinations[planet],planet);
  const kala={natonnatha:nat,paksha:pak,tribhaga:tri,abda,masa,vara,hora,ayana,yuddha:0};
  kala.total=Object.values(kala).reduce((a,b)=>a+b,0);
  const cheshta=motionClassical(planet,p.speed,state);
  const naisargika=SHADBALA_NATURAL[planet];
  const drik=drikBalaClassical(planet,chartPlanets);
  const total=sth.total+dig+kala.total+cheshta+naisargika+drik;
  const req=SHADBALA_REQUIRED[planet];
  return {available:true,method:'Parashari Shadbala Phase 3',unit:'virupa',components:{sthana:{...sth,total:Number(sth.total.toFixed(3))},dig:Number(dig.toFixed(3)),kala:Object.fromEntries(Object.entries(kala).map(([k,v])=>[k,Number(v.toFixed(3))])),cheshta:Number(cheshta.toFixed(3)),naisargika:Number(naisargika.toFixed(3)),drik:Number(drik.toFixed(3))},totalVirupa:Number(total.toFixed(3)),totalRupa:Number((total/60).toFixed(3)),requiredVirupa:req,ratio:Number((total/req).toFixed(3)),isStrong:total>=req};
}
function enrichPhase3(planets,jdUt,jdEt,bhavas,longitude,flags){
  const rasiPositions=Object.fromEntries(planets.filter(p=>SHADBALA_REQUIRED[p.name]).map(p=>[p.name,Math.floor(p.longitude/30)]));
  const weekday=((Math.floor(jdUt+1.5)%7)+7)%7;
  const declinations={};
  const eqFlags=(flags & ~(C.SEFLG_SIDEREAL||0)) | (C.SEFLG_EQUATORIAL||0);
  for(const p of planets){
    if(!SHADBALA_REQUIRED[p.name]) continue;
    try{ const r=swe.calc(jdEt,PLANETS.find(x=>x[0]===p.name)?.[1]??C.SE_SUN,eqFlags); declinations[p.name]=Array.isArray(r?.data)&&Number.isFinite(Number(r.data[1]))?Number(r.data[1]):null; }catch{ declinations[p.name]=null; }
  }
  const solarHour=localSolarHour(jdUt,longitude);
  const withHour=planets.map(p=>({...p,_solarHour:solarHour}));
  return withHour.map(p=>({...p,strength3:SHADBALA_REQUIRED[p.name]?phase3Strength(p.name,withHour,jdUt,jdEt,bhavas,rasiPositions,weekday,declinations,flags):{available:false,reason:'Rahu/Ketu excluded from classical seven-graha Shadbala'}}));
}

function setEphe(){
  const configured=process.env.SWISSEPH_EPHE_PATH || '';
  const candidates=[
    configured ? path.resolve(process.cwd(), configured) : null,
    configured ? path.resolve(__dirname, configured) : null,
    path.join(__dirname,'ephe'),
    path.join(process.cwd(),'ephe')
  ].filter(Boolean);
  const ephe=candidates.find(p=>fs.existsSync(p)) || candidates[0];
  swe.set_ephe_path(ephe);
  return ephe;
}
function hasSwissEpheFiles(ephe){
  return fs.existsSync(path.join(ephe,'sepl_18.se1')) && fs.existsSync(path.join(ephe,'semo_18.se1'));
}
function fail(result, what){
  if(!result) throw new Error(`${what}: Swiss Ephemeris returned no result`);
  if(result.error) throw new Error(`${what}: ${result.error}`);
  if(result.flag !== undefined && Number(result.flag) < 0) throw new Error(`${what}: Swiss Ephemeris calculation failed (flag ${result.flag})`);
  if(!Array.isArray(result.data) || !Number.isFinite(Number(result.data[0]))) throw new Error(`${what}: Swiss Ephemeris returned invalid data`);
}
function calcPlanetSafe(jdEt,id,flags,moshierFlags,name,useSwissFiles){
  let r=swe.calc(jdEt,id,flags);
  try{ fail(r,name); return {result:r,mode:useSwissFiles?'SWIEPH':'MOSEPH'}; }
  catch(primaryErr){
    const fallback=swe.calc(jdEt,id,moshierFlags);
    try{ fail(fallback,`${name} (Moshier fallback)`); return {result:fallback,mode:'MOSEPH'}; }
    catch(fallbackErr){
      throw new Error(`${name}: Swiss Ephemeris calculation failed. Primary=${primaryErr.message}; Fallback=${fallbackErr.message}`);
    }
  }
}
function extractPoint(points, keyNames, index){
  for(const k of keyNames){ const v=points?.[k]; if(Array.isArray(v) && Number.isFinite(v[0])) return v[0]; if(Number.isFinite(v)) return v; }
  if(Array.isArray(points) && Number.isFinite(points[index])) return points[index];
  return null;
}
function houseFromCusps(lon,cusps){
  const x=norm360(lon);
  for(let i=0;i<12;i++){
    const a=norm360(cusps[i]), b=norm360(cusps[(i+1)%12]);
    const span=norm360(b-a), pos=norm360(x-a);
    if(pos < (span===0?360:span)) return i+1;
  }
  return 12;
}
function midpointArc(a,b){
  return norm360(a + norm360(b-a)/2);
}
function bhavaDetails(cusps){
  // Sripati house-system cusps returned by Swiss Ephemeris are the
  // Arambha (house-start) points.  The Bhava Madhya/Sphuta is the
  // midpoint from the current Arambha to the next Arambha, and Antya
  // is the next Arambha.  Keep the underlying Sripati cusps unchanged.
  return cusps.map((c,i)=>{
    const next=cusps[(i+1)%12];
    const madhya=midpointArc(c,next);
    const antya=next;
    const mz=zodiac(madhya);
    return {
      house:i+1,
      arambhaLongitude:Number(c.toFixed(8)),
      arambha:degText(c),
      longitude:Number(c.toFixed(8)),
      degree:degText(c),
      madhyaLongitude:Number(madhya.toFixed(8)),
      madhya:degText(madhya),
      // Bhava/Sphuta Rasi is the sign containing the Madhya (Sphuta).
      rasi:mz.sign,
      rasiIndex:mz.index,
      nakshatra:nakshatra(madhya).name,
      antyaLongitude:Number(antya.toFixed(8)),
      antya:degText(antya)
    };
  });
}


// Book-based Gulika / Maandi helpers. The supplied reference divides the
// day/night into 8 equal parts, uses the weekday-specific rulers, takes Gulika
// at the middle of Saturn's part and Maandi at the beginning of Saturn's part.
// We calculate the ascendant at those exact instants with Swiss Ephemeris.
const UPAGRAHA_DAY = {
  0:['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn',null],
  1:['Moon','Mars','Mercury','Jupiter','Venus','Saturn',null,'Sun'],
  2:['Mars','Mercury','Jupiter','Venus','Saturn',null,'Sun','Moon'],
  3:['Mercury','Jupiter','Venus','Saturn',null,'Sun','Moon','Mars'],
  4:['Jupiter','Venus','Saturn',null,'Sun','Moon','Mars','Mercury'],
  5:['Venus','Saturn',null,'Sun','Moon','Mars','Mercury','Jupiter'],
  6:['Saturn',null,'Sun','Moon','Mars','Mercury','Jupiter','Venus']
};
const UPAGRAHA_NIGHT = {
  0:['Jupiter','Venus','Saturn',null,'Sun','Moon','Mars','Mercury'],
  1:['Venus','Saturn',null,'Sun','Moon','Mars','Mercury','Jupiter'],
  2:['Saturn',null,'Sun','Moon','Mars','Mercury','Jupiter','Venus'],
  3:['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn',null],
  4:['Moon','Mars','Mercury','Jupiter','Venus','Saturn',null,'Sun'],
  5:['Mars','Mercury','Jupiter','Venus','Saturn',null,'Sun','Moon'],
  6:['Mercury','Jupiter','Venus','Saturn','Sun','Moon','Mars',null]
};
const TA_TO_ID = {Sun:C.SE_SUN,Moon:C.SE_MOON,Mars:C.SE_MARS,Mercury:C.SE_MERCURY,Jupiter:C.SE_JUPITER,Venus:C.SE_VENUS,Saturn:C.SE_SATURN};
function upgUtcJd(date,time,offsetMinutes){
  const [y,mo,d]=String(date).split('-').map(Number), m=String(time).match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if(!m)return null; const local=Number(m[1])*60+Number(m[2])+Number(m[3]||0); const utcTotal=local-offsetMinutes;
  const shift=Math.floor(utcTotal/1440), mins=((utcTotal%1440)+1440)%1440; const base=new Date(Date.UTC(y,mo-1,d)); base.setUTCDate(base.getUTCDate()+shift);
  const yy=base.getUTCFullYear(), mm=base.getUTCMonth()+1, dd=base.getUTCDate(), hh=Math.floor(mins/60), mi=Math.floor(mins%60), sec=(mins-Math.floor(mins))*60;
  const r=swe.utc_to_jd(yy,mm,dd,hh,mi,sec,C.SE_GREG_CAL); return r&&r.data?[r.data[1],r.data[0]]:null;
}
function upgSolarRiseSet(date,lat,lon,offsetMinutes){
  // NOAA solar-rise approximation; used only to establish the eight day/night
  // divisions. The actual Maandi/Gulika longitude is obtained from Swiss houses.
  const [Y,M,D]=String(date).split('-').map(Number); const rad=Math.PI/180;
  const N=Math.floor((Date.UTC(Y,M-1,D)-Date.UTC(Y,0,1))/86400000)+1;
  const g=2*Math.PI/365*(N-1); const eq=229.18*(0.000075+0.001868*Math.cos(g)-0.032077*Math.sin(g)-0.014615*Math.cos(2*g)-0.040849*Math.sin(2*g));
  const decl=0.006918-0.399912*Math.cos(g)+0.070257*Math.sin(g)-0.006758*Math.cos(2*g)+0.000907*Math.sin(2*g)-0.002697*Math.cos(3*g)+0.00148*Math.sin(3*g);
  const phi=Number(lat)*rad, zen=90.833*rad, c=(Math.cos(zen)/(Math.cos(phi)*Math.cos(decl))-Math.tan(phi)*Math.tan(decl));
  if(c>=1||c<=-1)return {sunrise:360,sunset:1080,approx:true};
  const H=Math.acos(c)/rad, noon=720-4*Number(lon)-eq+Number(offsetMinutes), rise=noon-4*H, set=noon+4*H;
  return {sunrise:((rise%1440)+1440)%1440,sunset:((set%1440)+1440)%1440,approx:true};
}
function upgAscAtJd(jdUt,lat,lon,houseSystem='S'){
  if(!Array.isArray(jdUt))return null;
  const hs=houseSystem||'S'; const h=swe.houses_ex2(jdUt[0],C.SEFLG_SIDEREAL,Number(lat),Number(lon),hs); const pts=h?.data?.points||h?.data?.ascmc||{};
  const x=extractPoint(pts,['ascendant','ASC','asc'],0); return Number.isFinite(x)?norm360(x):null;
}
function bookUpagrahas(date,time,lat,lon,offsetMinutes,houseSystem='S'){
  const [Y,M,D]=String(date).split('-').map(Number); const m=String(time).match(/^(\d{1,2}):(\d{2})$/); if(!m)return null;
  const birthMin=Number(m[1])*60+Number(m[2]); const rs=upgSolarRiseSet(date,lat,lon,offsetMinutes); const day=birthMin>=rs.sunrise&&birthMin<=rs.sunset;
  // The weekday for the Hindu day changes at sunrise. For a pre-sunrise birth,
  // use the previous civil weekday for the day/night ruler table.
  const dt=new Date(Date.UTC(Y,M-1,D)); let wd=dt.getUTCDay(); if(!day && birthMin<rs.sunrise) wd=(wd+6)%7;
  const rulers=(day?UPAGRAHA_DAY:UPAGRAHA_NIGHT)[wd]; const span=day?rs.sunset-rs.sunrise:((rs.sunrise+1440)-rs.sunset); const start=day?rs.sunrise:rs.sunset;
  const part=span/8; const sat=rulers.findIndex(x=>x==='Saturn'); if(sat<0)return null;
  const make=(kind,offsetPart)=>{const mins=(start+part*(sat+offsetPart))%1440; let baseDate=date; if(mins<start && !day) {const b=new Date(Date.UTC(Y,M-1,D));b.setUTCDate(b.getUTCDate()+1);baseDate=b.toISOString().slice(0,10);} const hh=Math.floor(mins/60), mm=Math.floor(mins%60), sec=(mins-Math.floor(mins))*60; const tm=`${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`; const jd=upgUtcJd(baseDate,`${tm}:${String(Math.round(sec)).padStart(2,'0')}`,offsetMinutes); const ascLon=upgAscAtJd(jd,lat,lon,houseSystem); return {localTime:tm,part:sat+1,longitude:ascLon};};
  const gul=make('Gulika',0.5), maa=make('Maandi',0);
  const fmt=x=>{if(!x||!Number.isFinite(x.longitude))return null; const z=zodiac(x.longitude), nk=nakshatra(x.longitude); return {longitude:Number(x.longitude.toFixed(8)),degree:degText(x.longitude),rasi:z.sign,nakshatra:nk.name,pada:nk.pada,localTime:x.localTime,part:x.part};};
  return {gulika:fmt(gul),maandi:fmt(maa),daytime:day,weekday:wd,sunriseMinutes:rs.sunrise,sunsetMinutes:rs.sunset,partMinutes:part,method:''};
}

function specialLagnaSunriseReference(date,time,lat,lon,offsetMinutes,flags,moshierFlags,useSwissFiles){
  const m=String(time||'').match(/^(\d{1,2}):(\d{2})/);
  if(!m) return null;
  const birthMin=Number(m[1])*60+Number(m[2]);
  const [Y,M,D]=String(date).split('-').map(Number);
  const same=upgSolarRiseSet(date,lat,lon,offsetMinutes);
  let riseDate=date, rise=same;
  // For a birth before sunrise, Chapter 5's sunrise reference belongs to the
  // previous sunrise, not the sunrise later on the civil birth date.
  if(birthMin<same.sunrise){
    const prev=new Date(Date.UTC(Y,M-1,D)); prev.setUTCDate(prev.getUTCDate()-1);
    riseDate=prev.toISOString().slice(0,10);
    rise=upgSolarRiseSet(riseDate,lat,lon,offsetMinutes);
  }
  const riseMinutes=Number(rise?.sunrise);
  if(!Number.isFinite(riseMinutes)) return null;
  let elapsed=birthMin-riseMinutes;
  if(riseDate!==date) elapsed=birthMin+1440-riseMinutes;
  const hh=Math.floor(riseMinutes/60), mm=Math.floor(riseMinutes%60), sec=(riseMinutes-Math.floor(riseMinutes))*60;
  const riseTime=`${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:${String(Math.round(sec)).padStart(2,'0')}`;
  const jd=upgUtcJd(riseDate,riseTime,offsetMinutes);
  if(!jd) return null;
  const calc=calcPlanetSafe(jd[0],C.SE_SUN,flags,moshierFlags,'சூரியன்',useSwissFiles);
  const sunLon=norm360(calc.result.data[0]);
  return {sunriseDate:riseDate,sunriseMinutes:riseMinutes,sunriseLocalTime:riseTime,sunLongitudeAtSunrise:Number(sunLon.toFixed(8)),elapsedMinutes:Number(elapsed.toFixed(6)),approxSunrise:true};
}

function calculateSwiss({date,time,lat,lon,height=0,houseSystem,timezone='Asia/Kolkata',utcOffsetMinutes=330}){
  const ds=String(date||''); const ts=String(time||'');
  const m=ts.match(/^(\d{1,2}):(\d{2})$/); if(!/^\d{4}-\d{2}-\d{2}$/.test(ds)||!m) throw new Error('பிறந்த தேதி / நேரம் சரியாக உள்ளிடவும்.');
  const hh=Number(m[1]), mm=Number(m[2]); if(hh>23||mm>59) throw new Error('பிறந்த நேரம் சரியாக உள்ளிடவும்.');
  const latitude=Number(lat), longitude=Number(lon); if(!Number.isFinite(latitude)||latitude<-90||latitude>90||!Number.isFinite(longitude)||longitude<-180||longitude>180) throw new Error('Latitude / Longitude சரியாக உள்ளிடவும்.');
  const [y,mo,d]=ds.split('-').map(Number);
  const offsetMinutes=Number(utcOffsetMinutes);
  if(!Number.isFinite(offsetMinutes) || offsetMinutes < -720 || offsetMinutes > 840) throw new Error('UTC offset சரியாக உள்ளிடவும்.');
  const localTotal=hh*60+mm;
  const utcTotal=localTotal-offsetMinutes;
  const dayShift=Math.floor(utcTotal/1440);
  const normalized=((utcTotal%1440)+1440)%1440;
  const utcBase=new Date(Date.UTC(y,mo-1,d));
  utcBase.setUTCDate(utcBase.getUTCDate()+dayShift);
  const uy=utcBase.getUTCFullYear(), umo=utcBase.getUTCMonth()+1, ud=utcBase.getUTCDate();
  const uhh=Math.floor(normalized/60), umm=normalized%60;
  const utc=swe.utc_to_jd(uy,umo,ud,uhh,umm,0,C.SE_GREG_CAL); fail(utc,'UTC/JD');
  const [jdEt,jdUt]=utc.data;
  const ephePath=setEphe();
  if(typeof swe.set_sid_mode==='function' && C.SE_SIDM_LAHIRI!==undefined) swe.set_sid_mode(C.SE_SIDM_LAHIRI, 0, 0);
  const useSwissFiles=hasSwissEpheFiles(ephePath);
  const epheFlag=useSwissFiles ? C.SEFLG_SWIEPH : C.SEFLG_MOSEPH;
  const flags=epheFlag|C.SEFLG_SIDEREAL|C.SEFLG_SPEED;
  const moshierFlags=C.SEFLG_MOSEPH|C.SEFLG_SIDEREAL|C.SEFLG_SPEED;
  const planets=[];
  let calculationMode=useSwissFiles?'SWIEPH':'MOSEPH';
  for(const [ta,id] of PLANETS){ const calc=calcPlanetSafe(jdEt,id,flags,moshierFlags,ta,useSwissFiles); const r=calc.result; calculationMode=calc.mode==='MOSEPH'?'MOSEPH':calculationMode; const sid=norm360(r.data[0]); const z=zodiac(sid), nk=nakshatra(sid); planets.push({name:ta,longitude:Number(sid.toFixed(8)),degree:degText(sid),rasi:z.sign,nakshatra:nk.name,pada:nk.pada,lord:nk.lord,speed:Number((r.data[3]||0).toFixed(8)),navamsa:navamsa(sid)}); }
  const nodeCalc=calcPlanetSafe(jdEt,nodeId,flags,moshierFlags,'ராகு',useSwissFiles); calculationMode=nodeCalc.mode==='MOSEPH'?'MOSEPH':calculationMode; const rn=nodeCalc.result; const rahu=norm360(rn.data[0]), ketu=norm360(rahu+180);
  for(const [name,sid] of [['ராகு',rahu],['கேது',ketu]]){ const z=zodiac(sid), nk=nakshatra(sid); planets.push({name,longitude:Number(sid.toFixed(8)),degree:degText(sid),rasi:z.sign,nakshatra:nk.name,pada:nk.pada,lord:nk.lord,speed:0,navamsa:navamsa(sid)}); }
  // Numeric Lahiri ayanamsa for the UI. sweph returns {flag,error,data}.
  // Keep the label separate so the frontend can safely format the numeric value.
  // sweph 2.10.3-7 bindings may expose swe_get_ayanamsa_ut() as either
  // a numeric return value or an Ayanamsa result object { flag, error, data }.
  // Normalize both forms instead of assuming .data is always present.
  const ayRes = typeof swe.get_ayanamsa_ut === 'function' ? swe.get_ayanamsa_ut(jdUt) : null;
  let ayanamsaValue = null;
  if(Number.isFinite(Number(ayRes))){
    ayanamsaValue = Number(ayRes);
  } else if(ayRes && typeof ayRes === 'object'){
    if(ayRes.error) throw new Error(`அயனாம்சம்: ${ayRes.error}`);
    if(ayRes.flag !== undefined && Number(ayRes.flag) < 0) throw new Error(`அயனாம்சம்: Swiss Ephemeris failed (flag ${ayRes.flag})`);
    const rawAyan = Array.isArray(ayRes.data) ? ayRes.data[0] : ayRes.data;
    if(Number.isFinite(Number(rawAyan))) ayanamsaValue = Number(rawAyan);
  }
  if(!Number.isFinite(ayanamsaValue)){
    throw new Error('அயனாம்சம்: Swiss Ephemeris returned invalid data');
  }
  const hs=houseSystem || process.env.HOUSE_SYSTEM || 'S';
  const hres=swe.houses_ex2(jdUt, C.SEFLG_SIDEREAL, latitude, longitude, hs);
  // houses_ex2() returns data as an object { houses, points }, unlike calc()/utc_to_jd()
  // which return data as an array. Do NOT pass a house result through the generic
  // array validator; that was the cause of the current "returned invalid data" error.
  if(!hres) throw new Error('பாவ/லக்னம்: Swiss Ephemeris returned no result');
  if(hres.error) throw new Error(`பாவ/லக்னம்: ${hres.error}`);
  if(hres.flag !== undefined && Number(hres.flag) < 0) throw new Error(`பாவ/லக்னம்: Swiss Ephemeris house calculation failed (flag ${hres.flag})`);
  const hd=hres.data||{};
  if(!hd || typeof hd !== 'object') throw new Error('பாவ/லக்னம்: Swiss Ephemeris returned invalid house data');
  const rawCusps=hd.houses || hd.cusps || [];
  let sourceCusps=[];
  if(Array.isArray(rawCusps)) sourceCusps=rawCusps;
  else if(rawCusps && typeof rawCusps==='object'){
    if(Array.isArray(rawCusps.houses)) sourceCusps=rawCusps.houses;
    else if(Array.isArray(rawCusps.cusps)) sourceCusps=rawCusps.cusps;
    else sourceCusps=Array.from({length:13},(_,i)=>rawCusps[i] ?? rawCusps[String(i)]);
  }
  const oneBased=sourceCusps.length>=13;
  const cusps=Array.from({length:12},(_,i)=>norm360(Number(sourceCusps[oneBased?i+1:i])));
  if(cusps.some(x=>!Number.isFinite(x))) throw new Error('பாவ/லக்னம்: Swiss Ephemeris returned invalid house cusps.');
  if(cusps.some(x=>!Number.isFinite(x))) throw new Error('Swiss Ephemeris returned invalid house cusps.');
  const points=hd.points||hd.ascmc||{}; const asc=extractPoint(points,['ascendant','ASC','asc'],0); const mc=extractPoint(points,['mc','MC','mediumCoeli'],1);
  const ascLon=Number.isFinite(asc)?norm360(asc):cusps[0];
  const ascZ=zodiac(ascLon), ascNk=nakshatra(ascLon);
  const bhavas=bhavaDetails(cusps);
  const bookUpagraha=bookUpagrahas(date,time,latitude,longitude,offsetMinutes,hs);
  const specialLagnaReference=specialLagnaSunriseReference(date,time,latitude,longitude,offsetMinutes,flags,moshierFlags,useSwissFiles);
  const enriched0=enrichPlanetaryStates(planets.map(p=>({...p,bhava:houseFromCusps(p.longitude,cusps)})));
  const enriched2=enrichPhase2(enriched0,jdUt);
  const enriched=enrichPhase3(enriched2,jdUt,jdEt,bhavas,longitude,flags);
  const d9Lagna=navamsa(ascLon);
  const moon=enriched.find(p=>p.name==='சந்திரன்');
  return {
    ok:true, engine:'Swiss Ephemeris', engineVersion:'sweph 2.10.3-7 / Swiss Ephemeris 2.10.03', ephemerisMode:calculationMode, ephemerisFilesPresent:useSwissFiles, zodiac:'Sidereal', ayanamsa:ayanamsaValue, ayanamsaName:'Lahiri', houseSystem:hs==='S'?'Sripati':hs==='P'?'Placidus':hs, ephemerisPath:process.env.SWISSEPH_EPHE_PATH||'./ephe',
    birth:{date,time,timezone,utcOffsetMinutes:offsetMinutes,utcDate:`${uy}-${String(umo).padStart(2,'0')}-${String(ud).padStart(2,'0')}`,utcTime:`${String(uhh).padStart(2,'0')}:${String(umm).padStart(2,'0')}`,latitude,longitude,utc_jd:Number(jdUt.toFixed(8)),et_jd:Number(jdEt.toFixed(8))},
    lagna:{longitude:Number(ascLon.toFixed(8)),degree:degText(ascLon),rasi:ascZ.sign,nakshatra:ascNk.name,pada:ascNk.pada,mc:Number.isFinite(mc)?Number(norm360(mc).toFixed(8)):null},
    specialLagnaReference,
    moonRasi:moon.rasi,moonNakshatra:moon.nakshatra,moonPada:moon.pada,
    planets:enriched,
    upagrahas:bookUpagraha,
    bhavas,
    navamsa:{lagna:d9Lagna,planets:[{name:'லக்னம்',longitude:ascLon,degree:degText(ascLon),rasi:ascZ.sign,navamsa:d9Lagna,bhava:1},...enriched]},
    swissValidation:{latitude:Number(latitude.toFixed(8)),longitude:Number(longitude.toFixed(8)),utcJd:Number(jdUt.toFixed(8)),ayanamsaMode:'Lahiri',houseSystem:hs,timezone,utcOffsetMinutes:offsetMinutes,ephemerisPath:ephePath,ephemerisFilesPresent:useSwissFiles,ascendantSource:'Swiss Ephemeris houses_ex2()',houseCuspSource:'Swiss Ephemeris houses_ex2()'},
    calculatedAt:new Date().toISOString()
  };
}
module.exports={calculateSwiss};
