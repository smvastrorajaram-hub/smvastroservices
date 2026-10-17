/**
 * C.G. Rajan, Jathaka Kanitham Part I, printed pp. 41-50.
 * Source-specific Shadbala research channel; separate from BPHS/UK strength3.
 *
 * The printed p.50 arithmetic is an independent oracle. A green arithmetic
 * test is NOT proof that all component formulas or natal astronomical inputs
 * have been certified. Never emit a final total when book-specific Cheshta or
 * Drig inputs remain unreconciled.
 */
import { bphsSputaDrishtiVirupa } from './bphs-sputa-drishti.browser.mjs';

export const CG_RAJAN_SHADBALA_SOURCE = Object.freeze({
  book: 'C.G. Rajan, Jathaka Kanitham Part I',
  sthanaPages: 'printed pp. 41-42',
  kalaPages: 'printed pp. 43-46',
  ayanaPages: 'printed pp. 47-48',
  naisargikaPage: 'printed p. 48',
  digPage: 'printed p. 48',
  cheshtaPage: 'printed p. 49',
  drigPages: 'printed pp. 30-32 and p. 50',
  finalWorkedExample: 'printed p. 50 / PDF p. 72',
  unit: 'source points (100-point component scale)',
  completeSevenGrahaCertificate: false
});

export const CG_RAJAN_PRINTED_P50 = Object.freeze({
  planets: Object.freeze(['சூரியன்','சந்திரன்','செவ்வாய்','புதன்','குரு','சுக்கிரன்','சனி']),
  sthana: Object.freeze([227,479,333,373,420,323,303]),
  kala: Object.freeze([133,67,113,227,287,87,263]),
  ayana: Object.freeze([42,23,12,83,85,12,94]),
  naisargika: Object.freeze([100,86,29,43,57,71,14]),
  dig: Object.freeze([60,13,38,96,13,60,26]),
  cheshta: Object.freeze([42,27,55,87,85,59,58]),
  subtotalBeforeDrig: Object.freeze([604,695,580,909,947,612,758]),
  drig: Object.freeze([11,6,40,24,4,37,29]),
  afterDrig: Object.freeze([615,701,620,933,951,649,787]),
  yuddha: Object.freeze([0,0,10,0,0,0,0]),
  final: Object.freeze([615,701,620,933,951,649,787])
});

const NAMES = CG_RAJAN_PRINTED_P50.planets;
const NATURAL = Object.freeze({
  'சூரியன்': 100, 'சந்திரன்': 86, 'செவ்வாய்': 29,
  'புதன்': 43, 'குரு': 57, 'சுக்கிரன்': 71, 'சனி': 14
});
const EXALTATION = Object.freeze({
  'சூரியன்':10, 'சந்திரன்':33, 'செவ்வாய்':298, 'புதன்':165,
  'குரு':95, 'சுக்கிரன்':357, 'சனி':200
});
const GENDER = Object.freeze({
  'சூரியன்':'male','செவ்வாய்':'male','குரு':'male',
  'புதன்':'neutral','சனி':'neutral','சந்திரன்':'female','சுக்கிரன்':'female'
});
const SIGN_LORDS = Object.freeze([
  'செவ்வாய்','சுக்கிரன்','புதன்','சந்திரன்','சூரியன்','புதன்',
  'சுக்கிரன்','செவ்வாய்','குரு','சனி','சனி','குரு'
]);
const NATURAL_RELATION = Object.freeze({
  'சூரியன்':{friends:['சந்திரன்','செவ்வாய்','குரு'],enemies:['சுக்கிரன்','சனி']},
  'சந்திரன்':{friends:['சூரியன்','புதன்'],enemies:[]},
  'செவ்வாய்':{friends:['சூரியன்','சந்திரன்','குரு'],enemies:['புதன்']},
  'புதன்':{friends:['சூரியன்','சுக்கிரன்'],enemies:['சந்திரன்']},
  'குரு':{friends:['சூரியன்','சந்திரன்','செவ்வாய்'],enemies:['புதன்','சுக்கிரன்']},
  'சுக்கிரன்':{friends:['புதன்','சனி'],enemies:['சூரியன்','சந்திரன்']},
  'சனி':{friends:['புதன்','சுக்கிரன்'],enemies:['சூரியன்','சந்திரன்','செவ்வாய்']}
});
const VARAGA_POINTS = Object.freeze({
  own:50, greatFriend:38, friend:25, neutral:13, enemy:6, greatEnemy:3
});
const VARAGAS = Object.freeze([1,9,3,12,7,2,30]);
const DIURNAL = new Set(['சூரியன்','குரு','சுக்கிரன்']);
const NATURAL_BENEFICS = new Set(['சந்திரன்','புதன்','குரு','சுக்கிரன்']);
const NATURAL_MALEFICS = new Set(['சூரியன்','செவ்வாய்','சனி']);
const finite = x => typeof x === 'number' && Number.isFinite(x);
const norm = x => ((x % 360) + 360) % 360;
const distance = (a,b) => {
  const d = Math.abs(norm(a)-norm(b));
  return Math.min(d,360-d);
};
const roundHalfUp = x => Math.floor(x+0.5);
const roundHalfEven = x => {
  const lo=Math.floor(x), f=x-lo;
  if(Math.abs(f-0.5)<1e-10) return lo%2===0?lo:lo+1;
  return Math.round(x);
};
function signIndex(lon){return Math.floor(norm(lon)/30);}
function vargaSign(lon,division){
  const q=norm(lon),r=Math.floor(q/30),deg=q-r*30,odd=r%2===0;
  if(division===1)return r;
  if(division===2)return deg<15?(odd?4:3):(odd?3:4);
  if(division===3)return (r+Math.min(2,Math.floor(deg/10))*4)%12;
  if(division===7){
    const start=odd?r:(r+6)%12;
    return (start+Math.min(6,Math.floor(deg/(30/7))))%12;
  }
  if(division===9){
    const start=r%3===0?r:r%3===1?(r+8)%12:(r+4)%12;
    return (start+Math.min(8,Math.floor(deg/(30/9))))%12;
  }
  if(division===12)return (r+Math.min(11,Math.floor(deg/2.5)))%12;
  if(division===30){
    let lord;
    if(odd){
      if(deg<5)lord='செவ்வாய்';else if(deg<10)lord='சனி';
      else if(deg<18)lord='குரு';else if(deg<25)lord='புதன்';else lord='சுக்கிரன்';
    }else{
      if(deg<5)lord='சுக்கிரன்';else if(deg<12)lord='புதன்';
      else if(deg<20)lord='குரு';else if(deg<25)lord='சனி';else lord='செவ்வாய்';
    }
    const own={'செவ்வாய்':odd?0:7,'சனி':odd?10:9,'குரு':odd?8:11,
      'புதன்':odd?2:5,'சுக்கிரன்':odd?6:1};
    return own[lord];
  }
  throw new RangeError('Unsupported varga division');
}
function naturalRelation(p,other){
  if(p===other)return 'own';
  const r=NATURAL_RELATION[p]||{friends:[],enemies:[]};
  return r.friends.includes(other)?'friend':r.enemies.includes(other)?'enemy':'neutral';
}
function compoundRelation(p,other,signs){
  if(p===other)return 'own';
  const n=naturalRelation(p,other),a=signs[p],b=signs[other];
  const house=((b-a+12)%12)+1;
  const temporary=[2,3,4,10,11,12].includes(house)?'friend':'enemy';
  // Book p.37 combined relation table: friend+enemy and enemy+friend
  // both become Sama; this is intentionally not the legacy strength3 rule.
  if(n==='friend'&&temporary==='friend')return 'greatFriend';
  if(n==='friend'&&temporary==='enemy')return 'neutral';
  if(n==='neutral'&&temporary==='friend')return 'friend';
  if(n==='neutral'&&temporary==='enemy')return 'enemy';
  if(n==='enemy'&&temporary==='friend')return 'neutral';
  return 'greatEnemy';
}
export function cgRajanSaptavargajaBala({planet,longitude,planets=[]}={}){
  if(!NAMES.includes(planet)||!finite(longitude)||!Array.isArray(planets))
    throw new TypeError('planet, finite longitude and seven-graha positions required');
  const signs=Object.fromEntries(planets.filter(p=>NAMES.includes(p.name)&&finite(p.longitude))
    .map(p=>[p.name,signIndex(p.longitude)]));
  const breakdown=VARAGAS.map(varga=>{
    const sign=vargaSign(longitude,varga),lord=SIGN_LORDS[sign];
    const relation=compoundRelation(planet,lord,signs);
    return Object.freeze({varga,sign,signLord:lord,relation,points:VARAGA_POINTS[relation]});
  });
  return Object.freeze({points:breakdown.reduce((s,x)=>s+x.points,0),breakdown,
    source:'Jathaka Kanitham I pp. 38-40; relation points pp. 35-37',
    sourceFormulaImplemented:true,workedExampleFullyReconciled:false});
}
export function cgRajanSthanaBala({planet,longitude,ascendantLongitude,planets=[]}={}){
  if(!NAMES.includes(planet)||![longitude,ascendantLongitude].every(finite))
    throw new TypeError('planet longitude and ascendant longitude required');
  const ex=EXALTATION[planet];
  const ucchaRaw=(180-distance(longitude,ex))/180*100;
  const uccha=roundHalfUp(ucchaRaw);
  const saptavargaja=cgRajanSaptavargajaBala({planet,longitude,planets});
  const d1=vargaSign(longitude,1),d9=vargaSign(longitude,9),gender=GENDER[planet];
  const matchesSign=r=>gender==='female'?r%2===1:r%2===0;
  const ojayugma=(matchesSign(d1)?25:0)+(matchesSign(d9)?25:0);
  const house=((d1-signIndex(ascendantLongitude)+12)%12)+1;
  const kendradi=[1,4,7,10].includes(house)?100:[2,5,8,11].includes(house)?50:25;
  const decan=Math.min(2,Math.floor((norm(longitude)%30)/10));
  const desired=gender==='male'?0:gender==='neutral'?1:2;
  const drekkana=decan===desired?25:0;
  const total=uccha+saptavargaja.points+ojayugma+kendradi+drekkana;
  return Object.freeze({
    uccha,ucchaRaw:+ucchaRaw.toFixed(6),
    saptavargaja:saptavargaja.points,saptavargajaBreakdown:saptavargaja.breakdown,
    ojayugma,kendradi,wholeSignHouse:house,drekkana,total,
    source:'Jathaka Kanitham I pp. 41-42',
    workedExampleFullyReconciled:false
  });
}
export function cgRajanAyanaBala({planet,declination}={}){
  if(!NAMES.includes(planet)||!finite(declination))
    throw new TypeError('planet and finite equatorial declination required');
  // Printed p.47 first rounds the declination to a whole degree. Source
  // p.48's p.50 oracle implies ties-to-even at 12.5 for Mars/Venus.
  const kranti=Math.sign(declination)*Math.round(Math.abs(declination));
  const signed=['சூரியன்','சந்திரன்','புதன்','சனி'].includes(planet)?-kranti:kranti;
  const raw=(24+signed)/48*100;
  return Object.freeze({virupa:roundHalfEven(raw),raw:+raw.toFixed(6),
    declination,bookKrantiDegree:kranti,source:'Jathaka Kanitham I pp. 47-48',
    printedExampleMatch:true});
}
export function cgRajanNaisargikaBala(planet){
  if(!Object.prototype.hasOwnProperty.call(NATURAL,planet))throw new RangeError('Seven planets only');
  return NATURAL[planet];
}
export function cgRajanPakshaBala({planet,sunLongitude,moonLongitude,planets=[]}={}){
  if(!NAMES.includes(planet)||![sunLongitude,moonLongitude].every(finite))
    throw new TypeError('planet and Sun/Moon longitudes required');
  const elongation=norm(moonLongitude-sunLongitude);
  const bright=elongation<=180;
  const arc=bright?elongation:360-elongation;
  const moonBala=arc/180*100;
  let benefic=NATURAL_BENEFICS.has(planet);
  if(planet==='புதன்'){
    const m=planets.find(p=>p.name==='புதன்');
    const sign=m&&finite(m.longitude)?signIndex(m.longitude):null;
    const joined=planets.some(p=>p.name!=='புதன்'&&NATURAL_MALEFICS.has(p.name)&&
      finite(p.longitude)&&signIndex(p.longitude)===sign);
    benefic=!joined;
  }
  const value=planet==='சந்திரன்'?moonBala:(benefic?moonBala:100-moonBala);
  return Object.freeze({virupa:roundHalfUp(value),raw:+value.toFixed(6),
    elongation,bright,moonPhaseBase:+moonBala.toFixed(6),benefic,
    source:'Jathaka Kanitham I printed pp. 27 and 45-46'});
}
export function cgRajanKalaBala({
  planet,apparentSolarHour,weekdayLord,monthLord,yearLord,horaLord,tribhagaLord,
  sunLongitude,moonLongitude,planets=[]
}={}){
  if(!NAMES.includes(planet)||!finite(apparentSolarHour))
    throw new TypeError('planet and apparent solar hour required');
  const hour=((apparentSolarHour%24)+24)%24;
  const day=100*(1-Math.abs(12-hour)/12);
  const natonnatha=planet==='புதன்'?100:(DIURNAL.has(planet)?day:100-day);
  const paksha=cgRajanPakshaBala({planet,sunLongitude,moonLongitude,planets}).virupa;
  const tribhaga=(planet==='குரு'||tribhagaLord===planet)?100:0;
  const dina=weekdayLord===planet?75:0;
  const masa=monthLord===planet?50:0;
  const varusha=yearLord===planet?25:0;
  const hora=horaLord===planet?100:0;
  const total=roundHalfUp(natonnatha)+tribhaga+dina+masa+varusha+hora+paksha;
  return Object.freeze({natonnatha:roundHalfUp(natonnatha),tribhaga,dina,masa,varusha,hora,
    paksha,total,source:'Jathaka Kanitham I printed pp. 43-46',
    temporalLordsIndependentlyReconciled:false});
}
export function cgRajanDigBala({planet,longitude,ascendantLongitude}={}){
  if(!NAMES.includes(planet)||![longitude,ascendantLongitude].every(finite))
    throw new TypeError('planet longitude and ascendant longitude required');
  const idealOffset=DIURNAL.has(planet)?270:
    ['சந்திரன்','சுக்கிரன்'].includes(planet)?90:
    ['புதன்','குரு'].includes(planet)?0:180;
  const ideal=norm(ascendantLongitude+idealOffset);
  const d=distance(longitude,ideal),raw=(180-d)/180*100;
  return Object.freeze({virupa:roundHalfUp(raw),raw:+raw.toFixed(6),idealLongitude:ideal,
    angularDistance:d,source:'Jathaka Kanitham I printed p. 48',
    workedExampleFullyReconciled:false});
}
export function cgRajanDrigBalaFromAspectMatrix(matrix){
  if(!Array.isArray(matrix)||matrix.length!==7||matrix.some(row=>!Array.isArray(row)||row.length!==7))
    throw new TypeError('7x7 aspect matrix in source 0..100 points required');
  const benefic=new Set(['குரு','சுக்கிரன்','புதன்','சந்திரன்']);
  const results={};
  for(let j=0;j<7;j++){
    let good=0,bad=0;
    for(let i=0;i<7;i++){
      const v=matrix[i][j];
      if(!finite(v)||v<0||v>100)throw new RangeError('Aspect values must be 0..100');
      if(i===j)continue;
      if(benefic.has(NAMES[i]))good+=v;else bad+=v;
    }
    const net=good-bad;
    results[NAMES[j]]=Object.freeze({good, bad, net, virupa:roundHalfUp(net/4)});
  }
  return Object.freeze({byPlanet:results,
    source:'Jathaka Kanitham I printed pp. 30-32; Drig = one quarter of net Subha/Asubha aspect',
    aggregationVerified:true,aspectMatrixIndependentNumericalOracleRequired:true});
}
export function cgRajanDrigBalaCandidate({planet,longitude,planets=[]}={}){
  if(!NAMES.includes(planet)||!finite(longitude)||!Array.isArray(planets))
    throw new TypeError('planet, longitude and chart planets required');
  const matrix=planets.filter(p=>NAMES.includes(p.name)&&finite(p.longitude));
  const aspects=[];
  for(const p of matrix){
    if(p.name===planet)continue;
    const angle=norm(longitude-p.longitude);
    const raw=bphsSputaDrishtiVirupa(angle,p.name)*100/60;
    aspects.push({aspector:p.name,angle,raw:+raw.toFixed(6),
      rounded:roundHalfUp(raw),sourceFormula:'BPHS Sputa Drishti used as an UNVERIFIED candidate'});
  }
  return Object.freeze({aspects,virupa:null,source:'Rajan p.30 source matrix not yet fully reproduced',
    certified:false,reason:'Rajan printed aspect matrix differs from the current BPHS angle routine for selected planet pairs'});
}
export function cgRajanShadbalaForPlanet({
  planet,planets=[],ascendantLongitude,declination,apparentSolarHour,
  weekdayLord,monthLord,yearLord,horaLord,tribhagaLord,
  classicalCheshtaVirupa,sourceDrigVirupa
}={}){
  const p=planets.find(x=>x.name===planet);
  if(!p||!finite(p.longitude))throw new TypeError('planet position missing');
  const sun=planets.find(x=>x.name==='சூரியன்'),moon=planets.find(x=>x.name==='சந்திரன்');
  if(!sun||!moon)throw new TypeError('Sun and Moon positions required');
  const sthana=cgRajanSthanaBala({planet,longitude:p.longitude,ascendantLongitude,planets});
  const ayana=cgRajanAyanaBala({planet,declination});
  const naisargika=cgRajanNaisargikaBala(planet);
  const dig=cgRajanDigBala({planet,longitude:p.longitude,ascendantLongitude});
  const kala=cgRajanKalaBala({planet,apparentSolarHour,weekdayLord,monthLord,yearLord,horaLord,
    tribhagaLord,sunLongitude:sun.longitude,moonLongitude:moon.longitude,planets});
  const paksha=cgRajanPakshaBala({planet,sunLongitude:sun.longitude,moonLongitude:moon.longitude,planets});
  const cheshta=planet==='சூரியன்'?ayana.virupa:planet==='சந்திரன்'?paksha.virupa:
    finite(classicalCheshtaVirupa)?classicalCheshtaVirupa:null;
  const drig=finite(sourceDrigVirupa)?sourceDrigVirupa:null;
  const knownSubtotal=sthana.total+kala.total+ayana.virupa+naisargika+dig.virupa;
  const complete=finite(cheshta)&&finite(drig);
  const total=complete?knownSubtotal+cheshta+drig:null;
  return Object.freeze({
    available:true,source:'C.G. Rajan Jathaka Kanitham Part I',
    unit:'printed 100-point component scale',sthana,kala,ayana:ayana.virupa,
    naisargika,dig:dig.virupa,cheshta,drig,
    partialSubtotalExcludingCheshtaAndDrig:knownSubtotal,
    total, totalHumanLifetime:null, deathAgeOrDate:null,
    classicalCertified:false,completeBookFormula:false,
    blockers:Object.freeze([
      ...(planet!=='சூரியன்'&&planet!=='சந்திரன்'&&!finite(classicalCheshtaVirupa)?
        ['Five-planet Rajan Cheshta formula/input not independently reconciled']:[]),
      ...(!finite(sourceDrigVirupa)?
        ['Rajan Drig aspect-generation formula not fully reconciled to printed p.30 matrix']:[]),
      ['Mars Dvadasamsa Saptavargaja p.39/41 mismatch: calculated 38 vs printed 50'],
      ['Printed p.50 Mars Yuddha +10 conflicts with printed final total'],
      ['Printed p.50 Dig has Venus/Saturn one-point rounding differences']
    ]),
    method:'C.G. Rajan source-specific partial Shadbala; not a final total certificate'
  });
}
