/**
 * Uttara Kalamrita, Khanda I, Section II, Slokas 2–22½;
 * V. Subrahmanya Sastri (1939), English translation, PDF pages 7–13:
 * https://indian-vedic-astrology.com/classic/uttara%20kalamritam.pdf
 *
 * Independent, browser-safe UK-specific SIX-BALA RESEARCH CHANNEL.
 * No BPHS dignity constants, BPHS aspect weights, or speed-bin Cheshta.
 * Absence of a verified, SAME-FRAME astronomical triple is represented by
 * null Cheshta and null total; NEVER invent a score or a certificate.
 * No Ayurdaya calculation (Section III) is included.
 */
import {uttaraKalamritaGrahaYuddha} from './uttara-kalamrita-shadbala.browser.mjs';
const names=Object.freeze(['சூரியன்','சந்திரன்','செவ்வாய்','புதன்','குரு','சுக்கிரன்','சனி']);
const namesSet=new Set(names);
const R=Math.PI/180;
const norm=x=>((x%360)+360)%360;
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const LORDS=Object.freeze(['செவ்வாய்','சுக்கிரன்','புதன்','சந்திரன்','சூரியன்','புதன்','சுக்கிரன்','செவ்வாய்','குரு','சனி','சனி','குரு']);
const FRIENDS=Object.freeze({
 'சூரியன்':['சந்திரன்','செவ்வாய்','குரு'],'சந்திரன்':['சூரியன்','புதன்'],
 'செவ்வாய்':['சூரியன்','சந்திரன்','குரு'],'புதன்':['சூரியன்','சுக்கிரன்'],
 'குரு':['சூரியன்','சந்திரன்','செவ்வாய்'],'சுக்கிரன்':['புதன்','சனி'],
 'சனி':['புதன்','சுக்கிரன்']
});
const ENEMIES=Object.freeze({
 'சூரியன்':['சுக்கிரன்','சனி'],'சந்திரன்':[],'செவ்வாய்':['புதன்'],
 'புதன்':['சந்திரன்'],'குரு':['புதன்','சுக்கிரன்'],
 'சுக்கிரன்':['சூரியன்','சந்திரன்'],'சனி':['சூரியன்','சந்திரன்','செவ்வாய்']
});
const OWN=Object.freeze({
 'சூரியன்':[4],'சந்திரன்':[3],'செவ்வாய்':[0,7],'புதன்':[2,5],
 'குரு':[8,11],'சுக்கிரன்':[1,6],'சனி':[9,10]
});
const MT=Object.freeze({'சூரியன்':4,'சந்திரன்':1,'செவ்வாய்':0,'புதன்':5,'குரு':8,'சுக்கிரன்':6,'சனி':10});
const EXALT=Object.freeze({'சூரியன்':0,'சந்திரன்':1,'செவ்வாய்':9,'புதன்':5,'குரு':3,'சுக்கிரன்':11,'சனி':6});
const DEB=Object.freeze({'சூரியன்':6,'சந்திரன்':7,'செவ்வாய்':3,'புதன்':11,'குரு':9,'சுக்கிரன்':5,'சனி':0});
const GENDER=Object.freeze({'சூரியன்':'male','சந்திரன்':'female','செவ்வாய்':'male','புதன்':'neutral','குரு':'male','சுக்கிரன்':'female','சனி':'neutral'});
const IDEAL=Object.freeze({'சூரியன்':10,'சந்திரன்':4,'செவ்வாய்':10,'புதன்':1,'குரு':1,'சுக்கிரன்':4,'சனி':7});
const NATURAL=Object.freeze({'சூரியன்':60,'சந்திரன்':360/7,'செவ்வாய்':120/7,'புதன்':180/7,'குரு':240/7,'சுக்கிரன்':300/7,'சனி':60/7});
export const UTTARA_KALAMRITA_NAISARGIKA_VIRUPA=NATURAL;
// Exact UK II.3½–5 and 8½–9½ relation ladder: NOT BPHS 20/10/4/2.
export const UTTARA_KALAMRITA_RELATION_VIRUPA=Object.freeze({
 exaltation:60,moolatrikona:45,own:30,greatFriend:22.5,
 friend:15,neutral:7.5,enemy:3.75,greatEnemy:1.875
});
function graha(name){if(!namesSet.has(name))throw new RangeError('Seven classical grahas required');return name;}
function signIndex(degrees){return Math.floor(norm(degrees)/30);}
function tempFriend(p,q,positions){
 const a=positions[p],b=positions[q];
 if(!Number.isInteger(a)||!Number.isInteger(b))throw new TypeError('All seven Rasi sign positions required');
 return [2,3,4,10,11,12].includes((b-a+12)%12+1);
}
function relation(p,lord,positions){
 if(p===lord)return 'own';
 const natural=FRIENDS[p].includes(lord)?1:ENEMIES[p].includes(lord)?-1:0;
 const temporary=tempFriend(p,lord,positions)?1:-1;
 if(natural===1&&temporary===1)return 'greatFriend';
 if(natural===-1&&temporary===-1)return 'greatEnemy';
 if(natural+temporary>0)return 'friend';
 if(natural+temporary<0)return 'enemy';
 return 'neutral';
}
function rawDignity(planet,sign,positions,{rasi=false,retrograde=false}={}){
 if(rasi&&retrograde&&sign===EXALT[planet])
   return {grade:'retrograde-exalted-neech',virupa:0};
 if(rasi&&retrograde)
   return {grade:'retrograde-uk-one-rupa',virupa:60};
 if(rasi&&sign===EXALT[planet])
   return {grade:'exaltation',virupa:60};
 if(rasi&&sign===MT[planet])
   return {grade:'moolatrikona',virupa:45};
 if(OWN[planet].includes(sign))
   return {grade:'own',virupa:30};
 const grade=relation(planet,LORDS[sign],positions);
 return {grade,virupa:UTTARA_KALAMRITA_RELATION_VIRUPA[grade]};
}
/**
 * UK II.8½–9½: the full Rasi dignity plus HALF each of six VARGA-owner
 * dignities (Hora/Drekkana/Saptamsa/Navamsa/Dvadasamsa/Trimsamsa).
 * Accept exactly seven original full-Rupa dignity values.
 * Caller is responsible for the seven varga owner/relationship grades.
 */
export function uttaraKalamritaSaptavargajaFromRupa(rupas){
 if(!Array.isArray(rupas)||rupas.length!==7||!rupas.every(v=>finite(v)&&v>=0&&v<=1))
   throw new RangeError('Seven finite 0..1 full Rupa dignity grades required');
 const fractions=rupas.map((x,i)=>i===0?x:x/2);
 return Object.freeze({fractionsRupa:fractions,partsVirupa:fractions.map(x=>x*60),
   totalVirupa:fractions.reduce((a,b)=>a+b,0)*60,
   source:'Uttara Kalamrita Khanda I Section II 8½–9½'});
}
/**
 * UK II.6½–8½ varga sign placements, selecting the AUTHOR'S explicitly
 * preferred Drekkana owners: 1st/12th/11th (not 1st/5th/9th).
 */
export function uttaraKalamritaSevenVargaSigns(longitude){
 if(!finite(longitude))throw new TypeError('finite ecliptic longitude required');
 const s=signIndex(longitude),d=norm(longitude)%30,odd=s%2===0;
 const h=d<15?(odd?4:3):(odd?3:4);
 const dr=(s+(Math.min(2,Math.floor(d/10))===0?0:Math.floor(d/10)===1?11:10))%12;
 const d7=(s+(odd?0:6)+Math.min(6,Math.floor(d/(30/7))))%12;
 const start9=s%3===0?s:s%3===1?(s+8)%12:(s+4)%12;
 const d9=(start9+Math.min(8,Math.floor(d/(10/3))))%12;
 const d12=(s+Math.min(11,Math.floor(d/2.5)))%12;
 const owners=odd?['செவ்வாய்','சனி','குரு','புதன்','சுக்கிரன்']:
                   ['சுக்கிரன்','புதன்','குரு','சனி','செவ்வாய்'];
 const widths=odd?[5,5,8,7,5]:[5,7,8,5,5];
 let index=0,cut=0;
 while(index<4&&d>=cut+widths[index]){cut+=widths[index];index++;}
 const selectedOwner=owners[index];
 // A conventional representative sign when a graha owns two signs;
 // UK explicitly assigns a Trimsamsa by LORD, not by unique Rasi.
 const d30={'செவ்வாய்':0,'சனி':10,'குரு':8,'புதன்':2,'சுக்கிரன்':6}[selectedOwner];
 return Object.freeze({
  signs:Object.freeze([s,h,dr,d7,d9,d12,d30]),
  trimsamsaLord:selectedOwner,
  drekkanaConvention:'UK author 1st, 12th, 11th',
  source:'Uttara Kalamrita Khanda I Section II 6½–8½'
 });
}
export function uttaraKalamritaSthana({planet,longitude,bhava,signPositions,retrograde=false}){
 graha(planet);
 if(!finite(longitude)||!Number.isInteger(bhava)||bhava<1||bhava>12)
   throw new RangeError('finite planet longitude and bhava 1..12 required');
 for(const n of names)if(!Number.isInteger(signPositions?.[n]))
   throw new TypeError('seven graha Rasi positions required');
 const {signs,trimsamsaLord,drekkanaConvention}=uttaraKalamritaSevenVargaSigns(longitude);
 const dignities=signs.map((sign,i)=>{
  if(i===0)return rawDignity(planet,sign,signPositions,{rasi:true,retrograde});
  // UK II.7½–9½ assigns Trimsamsa to a GRAHA, not to a unique
  // representative Rasi; determine strength from its actual LORD.
  if(i===6){
    const grade=relation(planet,trimsamsaLord,signPositions);
    return {grade,virupa:grade==='own'?30:
      UTTARA_KALAMRITA_RELATION_VIRUPA[grade]};
  }
  return rawDignity(planet,sign,signPositions);
 });
 const varga=uttaraKalamritaSaptavargajaFromRupa(dignities.map(x=>x.virupa/60));
 const debilitation=DEB[planet]*30+({'சூரியன்':10,'சந்திரன்':3,'செவ்வாய்':28,'புதன்':15,'குரு':5,'சுக்கிரன்':27,'சனி':20}[planet]);
 const u=Math.min(norm(longitude-debilitation),norm(debilitation-longitude));
 const uccha=u/3;
 const oja=(signs[0]%2===(GENDER[planet]==='female'?1:0)?15:0)+
           (signs[4]%2===(GENDER[planet]==='female'?1:0)?15:0);
 const kendradi=[1,4,7,10].includes(bhava)?60:[2,5,8,11].includes(bhava)?30:15;
 const drekkana=GENDER[planet]==='male'?0:GENDER[planet]==='female'?1:2;
 const drekkanaVirupa=Math.floor((norm(longitude)%30)/10)===drekkana?15:0;
 const result={uccha,saptavargaja:varga.totalVirupa,ojayugma:oja,kendradi,drekkana:drekkanaVirupa};
 return Object.freeze({planet,vargaSigns:signs,grades:dignities,
  drekkanaConvention,trimsamsaLord,saptavargajaPartsVirupa:varga.partsVirupa,
  ...result,totalVirupa:Object.values(result).reduce((a,b)=>a+b,0),
  source:'Uttara Kalamrita Khanda I Section II 3½–11½',
  bookArithmeticVerified:false,historicalPlanetPositionsCertified:false});
}
export function uttaraKalamritaDigBala({planet,longitude,bhavas}){
 graha(planet);
 if(!finite(longitude))throw new TypeError('longitude required');
 const opposite=[...(bhavas||[])].find(b=>Number(b.house)===IDEAL[planet]);
 const cusp=opposite?.madhyaLongitude??opposite?.longitude;
 if(!finite(cusp))return null;
 const angle=Math.min(norm(longitude-cusp),norm(cusp-longitude));
 return Object.freeze({virupa:60*(1-angle/180),
  targetHouse:IDEAL[planet],referenceLongitude:cusp,
  source:'Uttara Kalamrita Khanda I Section II 11½–12½',
  cuspSourceCertified:false});
}
/**
 * Uttara Kalamrita II.16½–17½ AND Sastri explanatory worked table
 * ("add to 23°27′, multiply by 5 and divide by 4").
 *
 * Formula is in the book COMMENTARY, not a claim that the original sloka
 * itself specifies this numerical factor. Input must be TRUE signed
 * declination relative to celestial equator (north positive), not Lahiri
 * sidereal ecliptic longitude or ecliptic latitude.
 *
 * North-favoured: Sun Mars Jupiter Venus; south-favoured: Moon Saturn;
 * Mercury ALWAYS adds absolute declination. Raw result in VIRUPA =
 * (23°27′ +/- actual signed declination) × (5/4).
 * This UK-specific ~29.3125 Virupa at equinox differs from BPHS 30.
 */
export function uttaraKalamritaAyanaFromDeclination(planet,declinationDegrees,{
  equatorialFrameVerified=false
}={}){
 graha(planet);
 if(!finite(declinationDegrees))return Object.freeze({
  virupa:null,rawVirupa:null,declinationDegrees:null,
  pending:['true tropical equatorial declination from independently checked ephemeris'],
  certified:false});
 if(Math.abs(declinationDegrees)>90)
  throw new RangeError('Declination must be within ±90°');
 const e=23+27/60;
 const signed=planet==='புதன்'?Math.abs(declinationDegrees):
   ['சந்திரன்','சனி'].includes(planet)?-declinationDegrees:declinationDegrees;
 const raw=(e+signed)*5/4;
 return Object.freeze({
  virupa:Math.max(0,Math.min(60,raw)),rawVirupa:raw,
  declinationDegrees,declinationSignedForStrength:signed,
  equatorialFrameVerified:!!equatorialFrameVerified,
  pending:equatorialFrameVerified?[]:['independent tropical equatorial input verification'],
  certified:!!equatorialFrameVerified,
  source:'Uttara Kalamrita II.16½–17½, Sastri UK numerical commentary: 23°27′, 5/4'
 });
}
/**
 * UK II.15½–16½: elapsed ghatis from LAST sunrise × 2 / 5
 * gives the number of COMPLETED horas, not the solar-day length/24.
 * From weekday lord the seven hora owners repeat every seventh,
 * ordered [Sun, Venus, Mercury, Moon, Saturn, Jupiter, Mars].
 */
const UK_HORA_ORDER=Object.freeze(['சூரியன்','சுக்கிரன்','புதன்',
 'சந்திரன்','சனி','குரு','செவ்வாய்']);
export function uttaraKalamritaHoraFromSunrise(weekdayLord,ghatikasSinceLastSunrise){
 graha(weekdayLord);
 if(!finite(ghatikasSinceLastSunrise)||ghatikasSinceLastSunrise<0||
    ghatikasSinceLastSunrise>=60)
  return Object.freeze({lord:null,step:null,virupa:null,
   pending:['valid 0..<60 ghatis after last sunrise']});
 const step=Math.floor(ghatikasSinceLastSunrise*2/5);
 const lord=UK_HORA_ORDER[(UK_HORA_ORDER.indexOf(weekdayLord)+step)%7];
 return Object.freeze({lord,step,ghatikasSinceLastSunrise,
  source:'Uttara Kalamrita II.15½–16½, ghatis ×2/5'});
}
export function uttaraKalamritaNatonnatha(planet,apparentSolarHour){
 graha(planet);
 if(!finite(apparentSolarHour))return null;
 const noon=Math.max(0,60*(1-Math.min(12,Math.abs(apparentSolarHour-12))/12));
 const unnata=['சூரியன்','புதன்','குரு','சுக்கிரன்'].includes(planet);
 return Object.freeze({virupa:unnata?noon:60-noon,
  division:unnata?'Unnata':'Nata',source:'Uttara Kalamrita II 14½–15½'});
}
const knots=Object.freeze([[30,0],[60,15],[90,45],[120,30],[150,0],[180,60],
 [210,45],[240,30],[270,15],[300,0]]);
export function uttaraKalamritaAspectVirupa(angle,aspector){
 graha(aspector);
 if(!finite(angle))throw new TypeError('aspect angle must be finite');
 const a=norm(angle);
 let v=0;
 for(let i=0;i<knots.length-1;i++){
  const [x0,y0]=knots[i],[x1,y1]=knots[i+1];
  if(a>=x0&&a<x1){v=y0+(y1-y0)*(a-x0)/(x1-x0);break;}
 }
 if(aspector==='செவ்வாய்'&&((a>=90&&a<120)||(a>=210&&a<240)))v+=15;
 if(aspector==='குரு'&&((a>=120&&a<150)||(a>=240&&a<270)))v+=30;
 if(aspector==='சனி'&&((a>=60&&a<90)||(a>=270&&a<300)))v+=45;
 return Math.min(60,v);
}
function isBenefic(planet,planets){
 if(['குரு','சுக்கிரன்'].includes(planet))return true;
 const sun=planets.find(x=>x.name==='சூரியன்'),moon=planets.find(x=>x.name==='சந்திரன்');
 const waxing=finite(sun?.longitude)&&finite(moon?.longitude)?
   norm(moon.longitude-sun.longitude)<=180:false;
 if(planet==='சந்திரன்')return waxing;
 if(planet!=='புதன்')return false;
 const me=planets.find(x=>x.name==='புதன்');
 if(!me)return false;
 return !planets.some(x=>x.name!=='புதன்'&&
  (['சூரியன்','செவ்வாய்','சனி','ராகு','கேது'].includes(x.name)||
   (x.name==='சந்திரன்'&&!waxing))&&
  finite(x.longitude)&&signIndex(x.longitude)===signIndex(me.longitude));
}
/**
 * II.17½–19½ signed benefic and malefic FULL Sputa aspects, algebraically
 * summed. Unlike prior BPHS implementation, DO NOT quarter every aspect
 * and then add Mercury/Jupiter once more: those are not the UK II words.
 */
export function uttaraKalamritaDrigBala(planet,planets){
 graha(planet);
 const recipient=planets.find(p=>p.name===planet);
 if(!finite(recipient?.longitude))throw new TypeError('recipient longitude missing');
 const entries=planets.filter(p=>namesSet.has(p.name)&&p.name!==planet).map(p=>{
  if(!finite(p.longitude))throw new TypeError('aspector longitude missing');
  const virupa=uttaraKalamritaAspectVirupa(norm(recipient.longitude-p.longitude),p.name);
  const benefic=isBenefic(p.name,planets);
  return {aspector:p.name,angle:norm(recipient.longitude-p.longitude),virupa,
    benefic,signedVirupa:virupa*(benefic?1:-1)};
 });
 return Object.freeze({entries,virupa:entries.reduce((sum,x)=>sum+x.signedVirupa,0),
  source:'Uttara Kalamrita II 17½–19½',
  chartLongitudeFrameCertified:false});
}
/**
 * Preserve ALL nine Kala interim fields; no BPHS-specific war bonus in Kala.
 * Exact 1/4, 1/2, 3/4, 1 Rupa UK temporal owner ladder.
 * Missing solar/day/longitude sources remain null and block a total.
 */
export function uttaraKalamritaKala({planet,apparentSolarHour,solarLongitude,moonLongitude,
 owners,tribhagaLord,declinationVirupa,warVirupa=0,planets=[]}){
 graha(planet);
 const natonnatha=uttaraKalamritaNatonnatha(planet,apparentSolarHour)?.virupa??null;
 let paksha=null;
 if(finite(solarLongitude)&&finite(moonLongitude)){
  const phase=Math.min(norm(moonLongitude-solarLongitude),norm(solarLongitude-moonLongitude));
  const benefic=isBenefic(planet,planets);
  paksha=(benefic?phase/3:60-phase/3)*(planet==='சந்திரன்'?2:1);
 }
 const lord=(key,value)=>owners?.[key]===undefined||owners?.[key]===null?
   null:owners[key]===planet?value:0;
 const values={
  natonnatha,paksha,
  tribhaga:tribhagaLord===undefined||tribhagaLord===null?null:(planet===tribhagaLord||planet==='குரு'?60:0),
  abda:lord('abda',15),masa:lord('masa',30),vara:lord('vara',45),hora:lord('hora',60),
  ayana:finite(declinationVirupa)?declinationVirupa:null
 };
 const pending=Object.keys(values).filter(k=>!finite(values[k]));
 const totalVirupa=pending.length?null:Object.values(values).reduce((a,b)=>a+b,0);
 return Object.freeze({parts:values,pending,totalVirupa,planet,warSeparateVirupa:warVirupa,
  source:'Uttara Kalamrita II 12½–17½',
  timeAndDeclinationSourcesCertified:false});
}
export function uttaraKalamritaCheshta({meanLongitude,trueLongitude,sheeghrocca,
 sourceFrameVerified=false}={}){
 if(![meanLongitude,trueLongitude,sheeghrocca].every(finite))
  return Object.freeze({virupa:null,pending:['same-frame classical mean, true, Sighrocca'],certified:false});
 const diff=((trueLongitude-meanLongitude+540)%360+360)%360-180;
 const midpoint=norm(meanLongitude+diff/2),k=norm(sheeghrocca-midpoint);
 return Object.freeze({virupa:Math.min(k,360-k)/3,midpoint,cheshtaKendra:Math.min(k,360-k),
  pending:sourceFrameVerified?[]:['independent orbital inputs not certified'],
  certified:sourceFrameVerified,
  source:'Uttara Kalamrita II 16½–17½ (Sighra Kendra)'});
}
/**
 * UK II.16½–17½ Sighra-Kendra selection for five planets, as described
 * in the Sastri commentary. Mercury/Venus: mean Sun at first correction
 * and own mean as Sighrocca; Mars/Jupiter/Saturn: own mean at first
 * correction and mean Sun as Sighrocca. Same-frame source is mandatory
 * for CERTIFICATION, not for showing an openly research-only number.
 * NEVER combine classical mean orbital positions with unrelated Swiss
 * true positions. No 2024 study or constants are referenced.
 */
export function uttaraKalamritaFiveGrahaCheshta({
 planet,meanSun,meanPlanet,truePlanet,sourceFrameVerified=false
}={}){
 if(!['புதன்','சுக்கிரன்','செவ்வாய்','குரு','சனி'].includes(planet))
  throw new RangeError('UK only the 5 non-luminary grahas receive Sighra kendra');
 if(![meanSun,meanPlanet,truePlanet].every(finite))
  return Object.freeze({planet,meanLongitude:null,sheeghrocca:null,
   virupa:null,pending:['same-frame planetary means and true longitude'],
   certified:false});
 const inner=['புதன்','சுக்கிரன்'].includes(planet);
 const meanLongitude=norm(inner?meanSun:meanPlanet);
 const sheeghrocca=norm(inner?meanPlanet:meanSun);
 const cheshta=uttaraKalamritaCheshta({
  meanLongitude,trueLongitude:truePlanet,sheeghrocca,
  sourceFrameVerified});
 return Object.freeze({planet,meanLongitude,sheeghrocca,
  trueLongitude:norm(truePlanet),...cheshta,
  noProductionActivation:true,fullShadbalaCertified:false,
  source:'Uttara Kalamrita II.16½–17½, five graha Sighra-Kendra selector'});
}
export function uttaraKalamritaSixBala({planets,bhavas,apparentSolarHour,owners,
 tribhagaLord,declinations={},classicalOrbitalInputs={}}={}){
 if(!Array.isArray(planets))throw new TypeError('seven visible planetary positions required');
 const seven=names.map(name=>planets.find(p=>p.name===name));
 if(seven.some(p=>!p||!finite(p.longitude)))throw new TypeError('all seven graha longitudes required');
 const signs=Object.fromEntries(seven.map(p=>[p.name,signIndex(p.longitude)]));
 const sun=seven[0],moon=seven[1];
 const wars=uttaraKalamritaGrahaYuddha(seven);
 const result={};
 for(const p of seven){
  const sthana=uttaraKalamritaSthana({planet:p.name,longitude:p.longitude,
   bhava:p.bhava,signPositions:signs,retrograde:!!p.strength?.retrograde});
  const dig=uttaraKalamritaDigBala({planet:p.name,longitude:p.longitude,bhavas});
  const drig=uttaraKalamritaDrigBala(p.name,planets);
  const kala=uttaraKalamritaKala({planet:p.name,apparentSolarHour,
   solarLongitude:sun.longitude,moonLongitude:moon.longitude,
   owners,tribhagaLord,declinationVirupa:declinations[p.name],
   planets});
  const cheshta=uttaraKalamritaCheshta(classicalOrbitalInputs[p.name]);
  const warVirupa=wars.virupaByPlanet[p.name]??0;
  const n=NATURAL[p.name];
  const list=[sthana.totalVirupa,dig?.virupa,kala.totalVirupa,
   cheshta.virupa,n,drig.virupa,warVirupa];
  const complete=list.every(finite)&&cheshta.certified&&wars.unresolved.length===0;
  const missing=[
   ...(dig===null?['Dig: house reference']:[]),
   ...kala.pending.map(k=>'Kala: '+k),
   ...cheshta.pending.map(k=>'Cheshta: '+k),
   ...(wars.unresolved.length?['planetary war unresolved']:[])
  ];
  const partialWithoutCheshta=[sthana.totalVirupa,dig?.virupa,kala.totalVirupa,n,drig.virupa,warVirupa]
   .filter(finite).reduce((a,b)=>a+b,0);
  result[p.name]=Object.freeze({
   sthana,dig,kala,cheshta,naisargikaVirupa:n,drig,warVirupa,
   partialWithoutCheshtaVirupa:partialWithoutCheshta,
   missing,completeInputArithmetic:complete,
   totalVirupa:complete?list.reduce((a,b)=>a+b,0):null,
   totalRupa:complete?list.reduce((a,b)=>a+b,0)/60:null,
   classicalCertified:false,
   source:'Uttara Kalamrita Khanda I Section II 2–22½',
   historicalAstronomicalInputCertified:false
  });
 }
 return Object.freeze({basis:'Uttara Kalamrita only',bookChapter:'Khanda I Section II',
  birthSevenGraha:result,grahaYuddha:wars,
  completeCertification:false,ayurdayaCalculationIncluded:false,
  bookFormulaModel:'separate UK rules; never reuse prior BPHS sixfold totals'});
}
