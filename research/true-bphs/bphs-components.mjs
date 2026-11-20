/**
 * Pure BPHS Shadbala numerical helpers for the isolated research engine.
 *
 * These source-specific formulas are copied from the repository's tested
 * BPHS component helpers so the standalone engine does not import the
 * B.V. Raman integration module or invoke any B.V. Raman calculation.
 * Regression compares these functions against the repository's existing
 * BPHS helper exports.
 */
import { bphsSputaDrishtiVirupa } from '../../public/horoscope/offline/bphs-sputa-drishti.browser.mjs';
import { bphsDrigBalaFromAspects } from '../../public/horoscope/offline/bphs-shadbala-rectification.browser.mjs';

const norm360=value=>((value%360)+360)%360;
const VARA_LORDS=['சூரியன்','சந்திரன்','செவ்வாய்','புதன்','குரு','சுக்கிரன்','சனி'];
const SIGN_LORDS=['செவ்வாய்','சுக்கிரன்','புதன்','சந்திரன்','சூரியன்','புதன்','சுக்கிரன்','செவ்வாய்','குரு','சனி','சனி','குரு'];
const NATURAL_REL=Object.freeze({
 'சூரியன்':{friends:['சந்திரன்','செவ்வாய்','குரு'],enemies:['சுக்கிரன்','சனி']},
 'சந்திரன்':{friends:['சூரியன்','புதன்'],enemies:[]},
 'செவ்வாய்':{friends:['சூரியன்','சந்திரன்','குரு'],enemies:['புதன்']},
 'புதன்':{friends:['சூரியன்','சுக்கிரன்'],enemies:['சந்திரன்']},
 'குரு':{friends:['சூரியன்','சந்திரன்','செவ்வாய்'],enemies:['புதன்','சுக்கிரன்']},
 'சுக்கிரன்':{friends:['புதன்','சனி'],enemies:['சூரியன்','சந்திரன்']},
 'சனி':{friends:['புதன்','சுக்கிரன்'],enemies:['சூரியன்','சந்திரன்','செவ்வாய்']}
});
const OWN_SIGNS=Object.freeze({
 'சூரியன்':[4],'சந்திரன்':[3],'செவ்வாய்':[0,7],'புதன்':[2,5],
 'குரு':[8,11],'சுக்கிரன்':[1,6],'சனி':[9,10]
});
const DEBILITATION=Object.freeze({
 'சூரியன்':{rasi:6,degree:10},'சந்திரன்':{rasi:7,degree:3},
 'செவ்வாய்':{rasi:3,degree:28},'புதன்':{rasi:11,degree:15},
 'குரு':{rasi:9,degree:5},'சுக்கிரன்':{rasi:5,degree:27},
 'சனி':{rasi:0,degree:20}
});
const MOOLATRIKONA=Object.freeze({
 'சூரியன்':{rasi:4,from:0,to:20},'சந்திரன்':{rasi:1,from:4,to:30},
 'செவ்வாய்':{rasi:0,from:0,to:12},'புதன்':{rasi:5,from:16,to:20},
 'குரு':{rasi:8,from:0,to:10},'சுக்கிரன்':{rasi:6,from:0,to:15},
 'சனி':{rasi:10,from:0,to:20}
});
const PLANET_GENDER=Object.freeze({
 'சூரியன்':'male','செவ்வாய்':'male','குரு':'male',
 'புதன்':'neutral','சனி':'neutral','சந்திரன்':'female','சுக்கிரன்':'female'
});
const REQUIRED=Object.freeze({
 'சூரியன்':390,'சந்திரன்':360,'செவ்வாய்':300,'புதன்':420,
 'குரு':390,'சுக்கிரன்':330,'சனி':300
});
export const SHADBALA_NATURAL=Object.freeze({
 'சூரியன்':60,'சந்திரன்':6*60/7,'செவ்வாய்':2*60/7,
 'புதன்':3*60/7,'குரு':4*60/7,'சுக்கிரன்':5*60/7,'சனி':60/7
});
const finite=value=>typeof value==='number'&&Number.isFinite(value);
const round3=value=>Number(value.toFixed(3));

function isOddSign(r){return Number(r)%2===0;}
function vargaSign(lon,division){
 const q=norm360(lon),r=Math.floor(q/30),deg=q-r*30;
 let idx=0,start=0;
 if(division===1)return r;
 if(division===2){
  idx=deg<15?(isOddSign(r)?4:3):(isOddSign(r)?3:4);return idx;
 }
 if(division===3){idx=Math.min(2,Math.floor(deg/10));return(r+idx*4)%12;}
 if(division===7){
  const part=Math.min(6,Math.floor(deg/(30/7)));
  start=isOddSign(r)?r:(r+6)%12;return(start+part)%12;
 }
 if(division===9){
  const start9=r%3===0?r:r%3===1?(r+8)%12:(r+4)%12;
  return(start9+Math.min(8,Math.floor(deg/(30/9)))%12)%12;
 }
 if(division===12)return(r+Math.min(11,Math.floor(deg/2.5)))%12;
 if(division===30){
  let lord;
  if(isOddSign(r)){
   if(deg<5)lord='செவ்வாய்';else if(deg<10)lord='சனி';else if(deg<18)lord='குரு';else if(deg<25)lord='புதன்';else lord='சுக்கிரன்';
  }else{
   if(deg<5)lord='சுக்கிரன்';else if(deg<12)lord='புதன்';else if(deg<20)lord='குரு';else if(deg<25)lord='சனி';else lord='செவ்வாய்';
  }
  const own={'செவ்வாய்':isOddSign(r)?0:7,'சனி':isOddSign(r)?10:9,'குரு':isOddSign(r)?8:11,'புதன்':isOddSign(r)?2:5,'சுக்கிரன்':isOddSign(r)?6:1};
  return own[lord];
 }
 return r;
}
function naturalRelation(planet,other){
 if(planet===other)return'own';
 const rel=NATURAL_REL[planet]||{friends:[],enemies:[]};
 if(rel.friends.includes(other))return'friend';
 if(rel.enemies.includes(other))return'enemy';
 return'neutral';
}
function temporaryRelation(planet,other,rasiPositions){
 const a=rasiPositions[planet],b=rasiPositions[other];
 if(a===undefined||b===undefined)return'neutral';
 const d=((b-a+12)%12)+1;
 return[2,3,4,10,11,12].includes(d)?'friend':'enemy';
}
function compoundRelation(planet,other,rasiPositions){
 if(planet===other)return'own';
 const n=naturalRelation(planet,other),t=temporaryRelation(planet,other,rasiPositions);
 if(n==='friend'&&t==='friend')return'greatFriend';
 if(n==='friend'&&t==='enemy')return'friend';
 if(n==='neutral'&&t==='friend')return'friend';
 if(n==='neutral'&&t==='enemy')return'enemy';
 if(n==='enemy'&&t==='friend')return'neutral';
 if(n==='enemy'&&t==='enemy')return'greatEnemy';
 return'neutral';
}
export function vargaDignityPoints(planet,sign,rasiPositions){
 const lord=SIGN_LORDS[sign],mt=MOOLATRIKONA[planet];
 if(mt&&mt.rasi===sign)return 45;
 if((OWN_SIGNS[planet]||[]).includes(sign))return 30;
 const rel=compoundRelation(planet,lord,rasiPositions);
 return{greatFriend:20,friend:15,neutral:10,enemy:4,greatEnemy:2}[rel]??10;
}
function ucchaBala(planet,longitude){
 const deb=DEBILITATION[planet];
 if(!deb)return 0;
 const debLongitude=deb.rasi*30+deb.degree;
 let distance=norm360(longitude-debLongitude);
 if(distance>180)distance=360-distance;
 return Math.max(0,Math.min(60,distance/3));
}
export function sthanaClassical(planet,longitude,bhava,rasiPositions){
 const vargas=[1,2,3,7,9,12,30],points={};
 points.uccha=ucchaBala(planet,longitude);
 points.saptavargaja=vargas.reduce((sum,v)=>sum+vargaDignityPoints(planet,vargaSign(longitude,v),rasiPositions),0);
 const d1=vargaSign(longitude,1),d9=vargaSign(longitude,9),gender=PLANET_GENDER[planet];
 points.ojayugma=((gender==='female')?(d1%2===1?15:0):(d1%2===0?15:0))+
  ((gender==='female')?(d9%2===1?15:0):(d9%2===0?15:0));
 const house=Number(bhava);
 points.kendradi=[1,4,7,10].includes(house)?60:([2,5,8,11].includes(house)?30:15);
 const drekkana=Math.min(2,Math.floor((longitude%30)/10));
 points.drekkana=(gender==='male'&&drekkana===0)||(gender==='female'&&drekkana===1)||(gender==='neutral'&&drekkana===2)?15:0;
 points.total=Object.values(points).reduce((a,b)=>a+b,0);
 return Object.fromEntries(Object.entries(points).map(([key,value])=>[key,round3(value)]));
}
export function pakshaBala(planet,sunLongitude,moonLongitude,planets=[]){
 let distance=norm360(moonLongitude-sunLongitude);
 if(distance>180)distance=360-distance;
 const base=Math.min(60,distance/3);
 if(planet==='சந்திரன்')return Math.min(120,base*2);
 const mercury=planets.find(p=>p.name==='புதன்');
 const mercurySign=mercury?Math.floor(norm360(mercury.longitude)/30):null;
 const joinedMalefic=planet==='புதன்'&&mercurySign!==null&&planets.some(p=>
  p.name!=='புதன்'&&['சூரியன்','செவ்வாய்','சனி','ராகு','கேது'].includes(p.name)&&
  Math.floor(norm360(p.longitude)/30)===mercurySign
 );
 const benefic=['குரு','சுக்கிரன்'].includes(planet)||(planet==='புதன்'&&!joinedMalefic);
 return benefic?base:60-base;
}
export function ayanaBala(declination,planet){
 if(!finite(declination))return null;
 const obliquity=23+27/60;
 const signed=planet==='புதன்'?Math.abs(declination):
  ['சந்திரன்','சனி'].includes(planet)?-declination:declination;
 const virupa=(obliquity+signed)*60/(2*obliquity);
 return Math.max(0,Math.min(planet==='சூரியன்'?120:60,
  virupa*(planet==='சூரியன்'?2:1)));
}
export function traditionalAharganaLords(date){
 const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date));
 if(!match)throw new RangeError('Ahargana requires YYYY-MM-DD');
 const year=+match[1],month=+match[2],day=+match[3];
 const dateValue=new Date(0);dateValue.setUTCFullYear(year,month-1,day);
 const ms=dateValue.getTime();
 if(!Number.isFinite(ms)||new Date(ms).toISOString().slice(0,10)!==date)
  throw new RangeError('Invalid Ahargana calendar date');
 const ahargana=65142+Math.round((ms-Date.UTC(1983,11,31))/86400000);
 const ix=value=>((value%7)+7)%7;
 const lordFromBook=value=>VARA_LORDS[ix(value-1)];
 return{
  ahargana,
  abdaLord:lordFromBook(Math.floor(ahargana/360)*3+1),
  masaLord:lordFromBook(Math.floor(ahargana/30)*2+1),
  dinaLord:lordFromBook(ahargana)
 };
}
export function drigAspectorBenefic(aspector,planets){
 if(['குரு','சுக்கிரன்'].includes(aspector))return true;
 const sun=planets.find(p=>p.name==='சூரியன்');
 const moon=planets.find(p=>p.name==='சந்திரன்');
 const elongation=sun&&moon?norm360(moon.longitude-sun.longitude):null;
 const waxing=elongation!==null&&elongation>0&&elongation<=180;
 if(aspector==='சந்திரன்')return waxing;
 if(aspector!=='புதன்')return false;
 const mercury=planets.find(p=>p.name==='புதன்');
 if(!mercury)return false;
 const sign=Math.floor(norm360(mercury.longitude)/30);
 const joinedMalefic=planets.some(p=>p.name!=='புதன்'&&
  (['சூரியன்','செவ்வாய்','சனி','ராகு','கேது'].includes(p.name)||
   (p.name==='சந்திரன்'&&!waxing))&&
  Math.floor(norm360(p.longitude)/30)===sign);
 return !joinedMalefic;
}
export function drikBalaClassical(planet,planets){
 const receiver=planets.find(row=>row.name===planet);
 if(!receiver)return 0;
 const aspects=[];
 for(const aspector of planets){
  if(aspector.name===planet||!Object.hasOwn(REQUIRED,aspector.name))continue;
  const angle=norm360(receiver.longitude-aspector.longitude);
  aspects.push({
   name:aspector.name,virupa:bphsSputaDrishtiVirupa(angle,aspector.name),
   benefic:drigAspectorBenefic(aspector.name,planets)
  });
 }
 return bphsDrigBalaFromAspects(aspects).virupa;
}
export const BPHS_SHADBALA_REQUIRED_VIRUPA=REQUIRED;
export const BPHS_COMPONENT_SOURCE_METADATA=Object.freeze({
 sthana:'BPHS I Chapter 27; seven Varga / Uchcha / Ojayugma / Kendradi / Drekkana helper',
 dig:'BPHS I Chapter 27; 60 Virupa at ideal direction, linearly reduced by angular distance',
 kala:'BPHS I Chapter 27; Natonnatha / Paksha / Tribhaga / Abda / Masa / Dina / Hora / Ayana',
 cheshta:'BPHS I Chapter 27 verses 24–25; UK II pp.42–43 only selects Mean / Sheeghroccheya pair',
 naisargika:'BPHS I Chapter 27 verse 14; exact 60*n/7 Virupa fractions',
 drik:'BPHS I Chapter 27 verse 19; BPHS Chapter 26 Sputa Drishti',
 yuddha:'BPHS I Chapter 27 verse 20; pre-war Shadbala difference'
});
