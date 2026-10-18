// CommonJS mirror so the server-side Swiss adapter does not require ESM interop.
const SAURA_YUGA_CIVIL_DAYS=1577917828, SAURA_KALI_EPOCH_JD_UT=588465.5, SAURA_UJJAIN=75+46/60;
const SAURA_REVOLUTIONS=Object.freeze({Sun:4320000,Mars:2296832,Mercury:17937060,Jupiter:364220,Venus:7022376,Saturn:146568});
const SAURA_INNER=new Set(['Mercury','Venus']);
const SAURA_EPICYCLES=Object.freeze({
 Mercury:Object.freeze({manda:[30,28],sighra:[133,132]}), Venus:Object.freeze({manda:[12,11],sighra:[262,260]}),
 Mars:Object.freeze({manda:[75,72],sighra:[235,232]}), Jupiter:Object.freeze({manda:[33,32],sighra:[70,72]}),
 Saturn:Object.freeze({manda:[49,48],sighra:[39,40]})
});
const SAURA_APSE_RATES=Object.freeze({Mercury:.368,Venus:.535,Mars:.204,Jupiter:.900,Saturn:.039});
const SAURA_ANCHOR_2024=Object.freeze({Mercury:220.4772,Venus:79.8785,Mars:130.0471,Jupiter:171.3844,Saturn:236.6267});
const SAURA_ANCHOR_JD=2460409.5,SAURA_R=Math.PI/180;
const normalizeSaura=x=>((x%360)+360)%360;
function sauraBody(planet){const key=({'செவ்வாய்':'Mars','புதன்':'Mercury','குரு':'Jupiter','சுக்கிரன்':'Venus','சனி':'Saturn'})[planet]||planet;if(!Object.prototype.hasOwnProperty.call(SAURA_EPICYCLES,key))throw new RangeError('Five visible planets only');return key;}
function sauraMeanOrbitalLongitude(jdUt,body){
 if(!Number.isFinite(jdUt)||jdUt<0||jdUt>SAURA_KALI_EPOCH_JD_UT+SAURA_YUGA_CIVIL_DAYS+5000000)throw new RangeError('Finite UTC Julian day in supported civil-date range required');
 const key=(body==='Sun'||body==='சூரியன்')?'Sun':sauraBody(body);
 const days=jdUt-SAURA_KALI_EPOCH_JD_UT+SAURA_UJJAIN/360;
 const turns=days*SAURA_REVOLUTIONS[key]/SAURA_YUGA_CIVIL_DAYS;
 return normalizeSaura((turns%1)*360);
}
function sauraFivePlanetCheshtaInputs(jdUt,planet){
 const key=sauraBody(planet);
 if(!['Mars','Mercury','Jupiter','Venus','Saturn'].includes(key))throw new RangeError('Only five planets eligible');
 const meanSun=sauraMeanOrbitalLongitude(jdUt,'Sun'),own=sauraMeanOrbitalLongitude(jdUt,key);
 return {meanLongitude:SAURA_INNER.has(key)?meanSun:own,sheeghrocha:SAURA_INNER.has(key)?own:meanSun};
}
function sauraEquation(mean,ucca,sizes,kind='sighra',convention='common-plus'){
 const k=normalizeSaura(ucca-mean),rad=k*SAURA_R,[even,odd]=sizes;
 const paridhi=even-(even-odd)*Math.abs(Math.sin(rad)),radius=paridhi/360,signedKoti=radius*Math.cos(rad);
 const num=radius*Math.sin(rad),absoluteMinus=kind==='manda'&&convention==='absolute-koti-minus';
 const sign=kind==='manda'&&convention==='alternate-minus'?-1:1;
 if(kind==='manda'&&convention==='verse39-direct-jya')return {degrees:Math.asin(Math.max(-1,Math.min(1,num)))/SAURA_R};
 const den=absoluteMinus?1-Math.abs(signedKoti):1+sign*signedKoti;
 if(den<=0||!Number.isFinite(den))throw new RangeError('Invalid circular epicycle geometry');
 return {degrees:Math.atan2(num,den)/SAURA_R};
}
function sauraFourPassTrueLongitude({planet,meanLongitude,mandocca,sheeghrocha,mandaKarṇaConvention='common-plus'}={}){
 const body=sauraBody(planet);
 if(!['common-plus','alternate-minus','absolute-koti-minus','verse39-direct-jya'].includes(mandaKarṇaConvention))throw new RangeError('Unknown Manda convention');
 if(![meanLongitude,mandocca,sheeghrocha].every(Number.isFinite))throw new TypeError('Three finite classical ecliptic longitudes required');
 const m=normalizeSaura(meanLongitude),a=normalizeSaura(mandocca),s=normalizeSaura(sheeghrocha),p=SAURA_EPICYCLES[body];
 const first=sauraEquation(m,s,p.sighra),afterHalfSighra=normalizeSaura(m+first.degrees/2);
 const second=sauraEquation(afterHalfSighra,a,p.manda,'manda',mandaKarṇaConvention),afterHalfManda=normalizeSaura(afterHalfSighra+second.degrees/2);
 const third=sauraEquation(afterHalfManda,a,p.manda,'manda',mandaKarṇaConvention),afterFullManda=normalizeSaura(m+third.degrees);
 const fourth=sauraEquation(afterFullManda,s,p.sighra);
 return {trueLongitude:normalizeSaura(afterFullManda+fourth.degrees),historicallyCertified:false,numericallyCertified:false};
}
function sauraMandoccaResearch(jdUt,planet){
 const body=sauraBody(planet);
 if(!Number.isFinite(jdUt)||jdUt<0||jdUt>5000000)throw new RangeError('Finite realistic Julian UT required');
 return {mandocca:normalizeSaura(SAURA_ANCHOR_2024[body]+(jdUt-SAURA_ANCHOR_JD)*SAURA_APSE_RATES[body]*360/SAURA_YUGA_CIVIL_DAYS),historicalNumericalCertified:false};
}

/**
 * B.V. Raman integrated six-Bala Shadbala engine.
 * Source: B.V. Raman, Graha and Bhava Balas, 13th edition:
 * Ch. III (Sthana), Ch. IV (Dig), Ch. V (Kala and Yuddha),
 * Ch. VI (Cheshta), Ch. VII (Naisargika), Ch. VIII (Drik),
 * Ch. X (Ishta/Kashta special Chesta-for-Phala).
 *
 * This is source-specific and does not call the legacy BPHS Phase-3 calculator.
 * Sun/Moon special Chesta-for-Phala is not substituted for sixfold Cheshta Bala.
 * The traditional Saura true-longitude input path has published numerical
 * disagreements, so full natal certification deliberately remains false.
 * Missing required inputs fail closed; no speed-bucket fallback is accepted.
 */

const PLANETS=Object.freeze(['சூரியன்','சந்திரன்','செவ்வாய்','புதன்','குரு','சுக்கிரன்','சனி']);
const EN=Object.freeze({'சூரியன்':'Sun','சந்திரன்':'Moon','செவ்வாய்':'Mars','புதன்':'Mercury','குரு':'Jupiter','சுக்கிரன்':'Venus','சனி':'Saturn'});
const REQUIRED=Object.freeze({'சூரியன்':300,'சந்திரன்':360,'செவ்வாய்':300,'புதன்':420,'குரு':390,'சுக்கிரன்':330,'சனி':300});
// B.V. Raman Ch. VII values as printed (rounded in the source).
const NAISARGIKA=Object.freeze({'சூரியன்':60.00,'சந்திரன்':51.43,'சுக்கிரன்':42.85,'குரு':34.28,'புதன்':25.70,'செவ்வாய்':17.14,'சனி':8.57});
const DEBILITATION=Object.freeze({'சூரியன்':190,'சந்திரன்':213,'செவ்வாய்':118+20/60,'புதன்':345,'குரு':275,'சுக்கிரன்':177,'சனி':20});
const MOOLATRIKONA=Object.freeze({
 'சூரியன்':{rasi:4,from:0,to:20},'சந்திரன்':{rasi:1,from:4,to:30},
 'செவ்வாய்':{rasi:0,from:0,to:12},'புதன்':{rasi:5,from:16,to:20},
 'குரு':{rasi:8,from:0,to:10},'சுக்கிரன்':{rasi:6,from:0,to:15},'சனி':{rasi:10,from:0,to:20}
});
const OWN_SIGNS=Object.freeze({'சூரியன்':[4],'சந்திரன்':[3],'செவ்வாய்':[0,7],'புதன்':[2,5],'குரு':[8,11],'சுக்கிரன்':[1,6],'சனி':[9,10]});
const SIGN_LORDS=Object.freeze(['செவ்வாய்','சுக்கிரன்','புதன்','சந்திரன்','சூரியன்','புதன்','சுக்கிரன்','செவ்வாய்','குரு','சனி','சனி','குரு']);
const NATURAL_REL=Object.freeze({
 'சூரியன்':{friends:['சந்திரன்','செவ்வாய்','குரு'],enemies:['சுக்கிரன்','சனி']},
 'சந்திரன்':{friends:['சூரியன்','புதன்'],enemies:[]},
 'செவ்வாய்':{friends:['சூரியன்','சந்திரன்','குரு'],enemies:['புதன்']},
 'புதன்':{friends:['சூரியன்','சுக்கிரன்'],enemies:['சந்திரன்']},
 'குரு':{friends:['சூரியன்','சந்திரன்','செவ்வாய்'],enemies:['புதன்','சுக்கிரன்']},
 'சுக்கிரன்':{friends:['புதன்','சனி'],enemies:['சூரியன்','சந்திரன்']},
 'சனி':{friends:['புதன்','சுக்கிரன்'],enemies:['சூரியன்','சந்திரன்','செவ்வாய்']}
});
const GENDER=Object.freeze({'சூரியன்':'male','செவ்வாய்':'male','குரு':'male','புதன்':'neutral','சனி':'neutral','சந்திரன்':'female','சுக்கிரன்':'female'});
const DISC_ARCSEC=Object.freeze({'செவ்வாய்':9.4,'புதன்':6.6,'குரு':190.4,'சுக்கிரன்':16.6,'சனி':158.0});
const norm360=x=>((x%360)+360)%360;
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const round3=x=>Math.round((x+Number.EPSILON)*1000)/1000;
const angleDistance=(a,b)=>{const d=Math.abs(norm360(a)-norm360(b));return Math.min(d,360-d);};
const oddSign=signIndex=>signIndex%2===0;

function vargaSign(longitude,division){
 const x=norm360(longitude),r=Math.floor(x/30),deg=x-r*30;
 if(division===1)return r;
 if(division===2)return deg<15?(oddSign(r)?4:3):(oddSign(r)?3:4);
 if(division===3){
  const part=Math.min(2,Math.floor(deg/10));
  return (r+part*4)%12;
 }
 if(division===7){
  const part=Math.min(6,Math.floor(deg/(30/7))),start=oddSign(r)?r:(r+6)%12;
  return (start+part)%12;
 }
 if(division===9){
  const part=Math.min(8,Math.floor(deg/(30/9))),start=r%3===0?r:r%3===1?(r+8)%12:(r+4)%12;
  return (start+part)%12;
 }
 if(division===12)return (r+Math.min(11,Math.floor(deg/2.5)))%12;
 if(division===30){
  let lord;
  if(oddSign(r)){
   if(deg<5)lord='செவ்வாய்';else if(deg<10)lord='சனி';else if(deg<18)lord='குரு';else if(deg<25)lord='புதன்';else lord='சுக்கிரன்';
  }else{
   if(deg<5)lord='சுக்கிரன்';else if(deg<12)lord='புதன்';else if(deg<20)lord='குரு';else if(deg<25)lord='சனி';else lord='செவ்வாய்';
  }
  const own={'செவ்வாய்':oddSign(r)?0:7,'சனி':oddSign(r)?10:9,'குரு':oddSign(r)?8:11,'புதன்':oddSign(r)?2:5,'சுக்கிரன்':oddSign(r)?6:1};
  return own[lord];
 }
 throw new RangeError('Unsupported Raman Saptavarga division '+division);
}
function naturalRelation(planet,other){
 if(planet===other)return 'own';
 const rel=NATURAL_REL[planet]||{friends:[],enemies:[]};
 if(rel.friends.includes(other))return 'friend';
 if(rel.enemies.includes(other))return 'enemy';
 return 'neutral';
}
function temporaryRelation(planet,other,rasiPositions){
 const a=rasiPositions[planet],b=rasiPositions[other];
 if(!Number.isInteger(a)||!Number.isInteger(b))return 'neutral';
 const fromPlanet=((b-a+12)%12)+1;
 return [2,3,4,10,11,12].includes(fromPlanet)?'friend':'enemy';
}
function compoundRelation(planet,other,rasiPositions){
 const natural=naturalRelation(planet,other),temporary=temporaryRelation(planet,other,rasiPositions);
 if(natural==='friend'&&temporary==='friend')return 'greatFriend';
 if(natural==='friend'&&temporary==='enemy')return 'neutral';
 if(natural==='neutral'&&temporary==='friend')return 'friend';
 if(natural==='neutral'&&temporary==='enemy')return 'enemy';
 if(natural==='enemy'&&temporary==='friend')return 'neutral';
 if(natural==='enemy'&&temporary==='enemy')return 'greatEnemy';
 return 'neutral';
}
function vargaDignity(planet,division,sign,rasiPositions,longitude){
 const mt=MOOLATRIKONA[planet];
 // Raman awards 45 for Moolatrikona in D1 only, not in the other six vargas.
 if(division===1&&mt&&mt.rasi===sign){
  const degree=norm360(longitude)%30;
  if(degree>=mt.from&&degree<mt.to)return 45;
 }
 if((OWN_SIGNS[planet]||[]).includes(sign))return 30;
 const lord=SIGN_LORDS[sign],rel=compoundRelation(planet,lord,rasiPositions);
 return {greatFriend:22.5,friend:15,neutral:7.5,enemy:3.75,greatEnemy:1.875}[rel]??7.5;
}
function sthanaBala(planet,row,lagnaSign,rasiPositions){
 const longitude=Number(row.longitude);
 if(!finite(longitude)||!Number.isInteger(row.bhava)||row.bhava<1||row.bhava>12)throw new TypeError('Sthana Bala needs finite longitude and house for '+planet);
 // Raman Ch. III §20: shortest angular distance from exact debilitation point / 3.
 const uccha=round3(Math.max(0,Math.min(60,angleDistance(longitude,DEBILITATION[planet])/3)));
 const divisions=[1,2,3,7,9,12,30];
 const saptavargaja=divisions.reduce((sum,d)=>sum+vargaDignity(planet,d,vargaSign(longitude,d),rasiPositions,longitude),0);
 const d1=Math.floor(norm360(longitude)/30),d9=vargaSign(longitude,9),g=GENDER[planet];
 const receivesOdd=g==='male'||g==='neutral',receivesEven=g==='female';
 const ojayugma=receivesOdd?((oddSign(d1)?15:0)+(oddSign(d9)?15:0)):
  receivesEven?((!oddSign(d1)?15:0)+(!oddSign(d9)?15:0)):0;
 const relative=((d1-lagnaSign+12)%12)+1;
 const kendradi=[1,4,7,10].includes(relative)?60:[2,5,8,11].includes(relative)?30:15;
 const within=norm360(longitude)%30,dec=Math.min(2,Math.floor(within/10));
 const drekkana=((g==='male'&&dec===0)||(g==='neutral'&&dec===1)||(g==='female'&&dec===2))?15:0;
 return {uccha:round3(uccha),saptavargaja:round3(saptavargaja),ojayugma:round3(ojayugma),kendradi:round3(kendradi),drekkana:round3(drekkana),total:round3(uccha+saptavargaja+ojayugma+kendradi+drekkana)};
}
function directionBala(planet,longitude,angles){
 const ideal=({'சூரியன்':angles.midheaven,'செவ்வாய்':angles.midheaven,'சந்திரன்':angles.nadir,'சுக்கிரன்':angles.nadir,'குரு':angles.ascendant,'புதன்':angles.ascendant,'சனி':angles.descendant})[planet];
 if(!finite(ideal))throw new TypeError('Raman Dig Bala needs direction angle for '+planet);
 return round3(Math.max(0,Math.min(60,60-angleDistance(longitude,ideal)/3)));
}
function natonnathaBala(planet,solarHour){
 if(!finite(solarHour)||solarHour<0||solarHour>=24)throw new TypeError('Apparent local solar hour must be 0..24');
 if(planet==='புதன்')return 60;
 const diurnal=['சூரியன்','குரு','சுக்கிரன்'].includes(planet);
 const day=60*(1-Math.abs(12-solarHour)/12);
 return round3(diurnal?day:60-day);
}
function pakshaBala(planet,planets){
 const sun=planets.find(p=>p.name==='சூரியன்'),moon=planets.find(p=>p.name==='சந்திரன்');
 if(!finite(sun?.longitude)||!finite(moon?.longitude))throw new TypeError('Raman Paksha Bala needs Sun and Moon longitudes');
 const elongation=norm360(moon.longitude-sun.longitude),phase=elongation<=180?elongation:360-elongation,base=Math.min(60,phase/3);
 if(planet==='சந்திரன்')return round3(Math.min(120,base*2));
 const mercury=planets.find(p=>p.name==='புதன்');
 const mercurySign=finite(mercury?.longitude)?Math.floor(norm360(mercury.longitude)/30):null;
 const joinedMalefic=planet==='புதன்'&&(
  mercury?.strength?.combustion===true||
  (mercurySign!==null&&planets.some(p=>p.name!=='புதன்'&&['சூரியன்','செவ்வாய்','சனி','ராகு','கேது'].includes(p.name)&&finite(p.longitude)&&Math.floor(norm360(p.longitude)/30)===mercurySign))
 );
 const benefic=['குரு','சுக்கிரன்'].includes(planet)||(planet==='புதன்'&&!joinedMalefic);
 // Raman's Paksha Bala assigns the arc/3 to Subhas and 60-minus-that to Papas,
 // regardless of whether the current date is waxing or waning. Only Moon itself
 // receives the doubled figure above.
 return round3(benefic?base:60-base);
}
function ayanaBala(planet,declination){
 if(!finite(declination))throw new TypeError('Tropical declination missing for '+planet);
 // Raman Ch. V §§71-75: 24-degree method shown in Example 33; Sun is doubled.
 const signedTerm=planet==='புதன்'?Math.abs(declination):
  (['சூரியன்','செவ்வாய்','குரு','சுக்கிரன்'].includes(planet)?declination:-declination);
 const raw=(24+signedTerm)*60/48;
 return round3(Math.max(0,Math.min(planet==='சூரியன்'?120:60,raw*(planet==='சூரியன்'?2:1))));
}
function chestaFromRamanInputs(planet,sourceInputs){
 const required=['meanLongitude','trueLongitude','sheeghroccaLongitude'];
 if(!sourceInputs||!required.every(k=>finite(sourceInputs[k])))throw new TypeError('B.V. Raman Chesta Bala needs printed mean, true and Sheeghrocca longitudes for '+planet);
 const mean=norm360(sourceInputs.meanLongitude),actual=norm360(sourceInputs.trueLongitude),sheeghrocca=norm360(sourceInputs.sheeghroccaLongitude);
 const separation=norm360(actual-mean);
 if(Math.abs(separation-180)<1e-10)throw new RangeError('Mean/true midpoint is ambiguous at 180 degrees for '+planet);
 const signed=separation>180?separation-360:separation,midpoint=norm360(mean+signed/2);
 const kendra=norm360(sheeghrocca-midpoint),reduced=kendra>180?360-kendra:kendra,value=round3(reduced/3);
 if(!finite(value)||value<0||value>60)throw new RangeError('Invalid B.V. Raman Chesta Bala for '+planet);
 return {value,available:true,method:'BV_RAMAN_CHAPTER_VI_VERIFIED_CLASSICAL_LONGITUDES',
  meanLongitude:mean,trueLongitude:actual,sheeghroccaLongitude:sheeghrocca,midpoint,reducedChestaKendra:reduced,
  trueLongitudeHistoricalCertified:true,numericallyCertified:true};
}
function chestaBala(planet,jdUt,planetRow,printedInputs){
 // In Raman Ch. VI the sixfold Cheshta is motional/retrograde strength.
 // The Sun/Moon special calculations in Ch. X are only for Ishta/Kashta Phala.
 if(planet==='சூரியன்'||planet==='சந்திரன்')return {value:0,available:true,method:'BV_RAMAN_SIXFOLD_CHESTA_LUMINARIES_ZERO',evidence:'Raman Ch. VI motional bala; Ch. X special Chesta-for-Phala remains separate'};
 const explicit=printedInputs||planetRow?.ramanChestaInputs;
 if(explicit)return chestaFromRamanInputs(planet,explicit);
 const english=EN[planet],inputs=sauraFivePlanetCheshtaInputs(jdUt,english);
 // Use the actual true longitude produced by the horoscope ephemeris. The former
 // production path reconstructed a second, approximate "true" longitude with a
 // four-pass Saura epicycle model, which was not Raman's printed Chesta input.
 const mean=norm360(inputs.meanLongitude),actual=norm360(planetRow?.longitude);
 if(!finite(actual))throw new TypeError('Ephemeris true longitude missing for Raman Chesta Bala: '+planet);
 const separation=norm360(actual-mean);
 if(Math.abs(separation-180)<1e-10)throw new RangeError('Mean/true midpoint is ambiguous at 180 degrees for '+planet);
 const signed=separation>180?separation-360:separation,midpoint=norm360(mean+signed/2);
 const kendra=norm360(inputs.sheeghrocha-midpoint),reduced=kendra>180?360-kendra:kendra,value=round3(reduced/3);
 if(!finite(value)||value<0||value>60)throw new RangeError('Invalid B.V. Raman Chesta Bala for '+planet);
 return {value,available:true,method:'BV_RAMAN_FORMULA_EPHEMERIS_TRUE_LONGITUDE_RESEARCH_MEAN_SHEEGHROCCA',
  meanLongitude:mean,trueLongitude:actual,sheeghroccaLongitude:inputs.sheeghrocha,midpoint,reducedChestaKendra:reduced,
  trueLongitudeHistoricalCertified:false,numericallyCertified:false};
}
function ramanDrishtiVirupa(angle,aspector){
 const a=norm360(angle);let base;
 if(a<30||a>=300)base=0;
 else if(a<60)base=(a-30)/2;
 else if(a<90)base=(a-60)+15;
 else if(a<120)base=(120-a)/2+30;
 else if(a<150)base=150-a;
 else if(a<180)base=(a-150)*2;
 else base=(300-a)/2;
 let special=0;
 if(aspector==='செவ்வாய்'&&((a>=90&&a<120)||(a>=210&&a<240)))special=15;
 else if(aspector==='குரு'&&((a>=120&&a<150)||(a>=240&&a<270)))special=30;
 else if(aspector==='சனி'&&((a>=60&&a<90)||(a>=270&&a<300)))special=45;
 return Math.max(0,Math.min(60,base+special));
}
function aspectorBenefic(aspector,planets){
 if(['குரு','சுக்கிரன்'].includes(aspector))return true;
 const sun=planets.find(p=>p.name==='சூரியன்'),moon=planets.find(p=>p.name==='சந்திரன்');
 const elongation=sun&&moon?norm360(moon.longitude-sun.longitude):null,waxing=elongation!==null&&elongation>0&&elongation<180;
 if(aspector==='சந்திரன்')return waxing;
 if(aspector!=='புதன்')return false;
 const mercury=planets.find(p=>p.name==='புதன்');
 if(!finite(mercury?.longitude))return false;
 const sign=Math.floor(norm360(mercury.longitude)/30);
 const joined=planets.some(p=>p.name!=='புதன்'&&(['சூரியன்','செவ்வாய்','சனி','ராகு','கேது'].includes(p.name)||(p.name==='சந்திரன்'&&!waxing))&&finite(p.longitude)&&Math.floor(norm360(p.longitude)/30)===sign);
 return !joined;
}
function drikBala(receiver,planets){
 const target=planets.find(p=>p.name===receiver);
 if(!target||!finite(target.longitude))throw new TypeError('Drik Bala target missing: '+receiver);
 let pinda=0;const trace=[];
 for(const source of planets){
  if(!PLANETS.includes(source.name)||source.name===receiver)continue;
  if(!finite(source.longitude))throw new TypeError('Drik Bala source longitude missing: '+source.name);
  const angle=norm360(target.longitude-source.longitude),raw=ramanDrishtiVirupa(angle,source.name),benefic=aspectorBenefic(source.name,planets),signed=benefic?raw:-raw;
  pinda+=signed;trace.push({aspector:source.name,angle,rawVirupa:round3(raw),benefic,signedVirupa:round3(signed)});
 }
 // Raman Ch. VIII §120: one-fourth of the signed Drishti Pinda; no BPHS
 // Chapter 27 v19 full Mercury/Jupiter addition is made here.
 return {pinda:round3(pinda),drik:round3(pinda/4),trace};
}
function kalaBase(planet,planets,solarHour,temporal,declinations){
 const natonnatha=natonnathaBala(planet,solarHour),paksha=pakshaBala(planet,planets),tribhagaLord=temporal?.tribhagaLord;
 if(!PLANETS.includes(tribhagaLord))throw new TypeError('Verified Raman Tribhaga lord is missing');
 const tribhaga=planet==='குரு'||tribhagaLord===planet?60:0;
 const abda=temporal?.abdaLord===planet?15:0,masa=temporal?.masaLord===planet?30:0,vara=temporal?.dinaLord===planet?45:0,hora=temporal?.horaLord===planet?60:0;
 const ayana=ayanaBala(planet,declinations?.[planet]);
 return {natonnatha,paksha,tribhaga,abda,masa,vara,hora,ayana,yuddha:0,total:round3(natonnatha+paksha+tribhaga+abda+masa+vara+hora+ayana),warPreTotal:round3(natonnatha+paksha+tribhaga+abda+masa+vara+hora)};
}
function applyRamanYuddha(rows,planets){
 const eligible=planets.filter(p=>DISC_ARCSEC[p.name]!==undefined),pairs=[];
 for(let i=0;i<eligible.length;i++)for(let j=i+1;j<eligible.length;j++){
  const a=eligible[i],b=eligible[j];
  if(!finite(a.longitude)||!finite(b.longitude)||angleDistance(a.longitude,b.longitude)>=1)continue;
  pairs.push({a:a.name,b:b.name,separation:angleDistance(a.longitude,b.longitude)});
 }
 if(!pairs.length)return {resolved:true,pairs:[],unresolved:[]};
 const counts=new Map();for(const pair of pairs)for(const p of [pair.a,pair.b])counts.set(p,(counts.get(p)||0)+1);
 const unresolved=pairs.filter(pair=>counts.get(pair.a)>1||counts.get(pair.b)>1);
 const usable=pairs.filter(pair=>counts.get(pair.a)===1&&counts.get(pair.b)===1);
 for(const pair of usable){
  const a=pair.a,b=pair.b,da=DISC_ARCSEC[a],db=DISC_ARCSEC[b],den=Math.abs(da-db);
  if(!finite(den)||den<=0){unresolved.push({...pair,reason:'disc-diameter difference unresolved'});continue;}
  // Raman Ch. V §76: pre-war Sthana + Dig + Kala up to Hora; Ayana excluded.
  const preA=rows[a].components.sthana.total+rows[a].components.dig+rows[a].components.kala.warPreTotal;
  const preB=rows[b].components.sthana.total+rows[b].components.dig+rows[b].components.kala.warPreTotal;
  const magnitude=Math.abs(preA-preB)/den;
  if(!finite(magnitude)){unresolved.push({...pair,reason:'pre-war total unavailable'});continue;}
  // Raman Ch. V §76 identifies the lesser longitude as winner.
  const winner=norm360(planets.find(p=>p.name===a).longitude)<norm360(planets.find(p=>p.name===b).longitude)?a:b,loser=winner===a?b:a;
  rows[winner].components.kala.yuddha=round3(rows[winner].components.kala.yuddha+magnitude);
  rows[loser].components.kala.yuddha=round3(rows[loser].components.kala.yuddha-magnitude);
  rows[winner].components.kala.yuddhaTrace=(rows[winner].components.kala.yuddhaTrace||[]).concat([{against:loser,result:'winner',magnitude:round3(magnitude),diameterDifferenceArcsec:den}]);
  rows[loser].components.kala.yuddhaTrace=(rows[loser].components.kala.yuddhaTrace||[]).concat([{against:winner,result:'loser',magnitude:round3(magnitude),diameterDifferenceArcsec:den}]);
 }
 for(const p of PLANETS){const c=rows[p].components.kala;c.total=round3(c.natonnatha+c.paksha+c.tribhaga+c.abda+c.masa+c.vara+c.hora+c.ayana+c.yuddha);}
 return {resolved:unresolved.length===0,pairs,unresolved,source:'B.V. Raman, Graha and Bhava Balas, Ch. V §§76–78, printed pp.60–62',diameterArcsec:DISC_ARCSEC};
}

/** Full seven-graha B.V. Raman Shadbala. Inputs are never guessed or replaced. */
function ramanIshtaKashtaForPlanet({planet,sunRow,moonRow,ayanamsa,uchchaBala,sixfoldCheshtaBala,sixfoldCheshtaSource}){
 if(!finite(uchchaBala)||(planet==='சூரியன்'&&!finite(ayanamsa)))throw new TypeError('B.V. Raman Ishta/Kashta needs engine Uchcha Bala and (for Sun) Lahiri ayanamsa');
 let chestaKendraRaw,midpoint=null,formula,cheshtaForPhala,specialChestaMethod;
 if(planet==='சூரியன்'){
  chestaKendraRaw=norm360(sunRow.longitude+ayanamsa+90);
  formula='(Sayana Sun longitude + 90 degrees), reduced to 0..180';
  const reduced=chestaKendraRaw>180?360-chestaKendraRaw:chestaKendraRaw;
  cheshtaForPhala=Math.round((reduced/3+Number.EPSILON)*100)/100;
  specialChestaMethod='BV_RAMAN_SPECIAL_CHESTA_FOR_ISHTA_KASHTA';
 }else if(planet==='சந்திரன்'){
  chestaKendraRaw=norm360(moonRow.longitude-sunRow.longitude);
  formula='(Moon Nirayana - Sun Nirayana), reduced to 0..180';
  const reduced=chestaKendraRaw>180?360-chestaKendraRaw:chestaKendraRaw;
  cheshtaForPhala=Math.round((reduced/3+Number.EPSILON)*100)/100;
  specialChestaMethod='BV_RAMAN_SPECIAL_CHESTA_FOR_ISHTA_KASHTA';
 }else{
  const source=sixfoldCheshtaSource||{};
  const inputs=[source.meanLongitude,source.trueLongitude,source.sheeghroccaLongitude];
  if(!inputs.every(finite)||!finite(sixfoldCheshtaBala))throw new TypeError('B.V. Raman Ishta/Kashta must reuse the sixfold Chapter VI Cheshta inputs for '+planet);
  const mean=norm360(source.meanLongitude),actual=norm360(source.trueLongitude),sheeghrocca=norm360(source.sheeghroccaLongitude);
  const delta=norm360(actual-mean);
  if(Math.abs(delta-180)<1e-10)throw new RangeError('Mean/true longitude midpoint is ambiguous at exactly 180 degrees');
  const signedDelta=delta>180?delta-360:delta;
  midpoint=norm360(mean+signedDelta/2);
  chestaKendraRaw=norm360(sheeghrocca-midpoint);
  const reduced=chestaKendraRaw>180?360-chestaKendraRaw:chestaKendraRaw;
  formula='Sighrocca - circular midpoint(mean, true), reduced to 0..180';
  const computed=Math.round((reduced/3+Number.EPSILON)*100)/100;
  if(Math.abs(computed-sixfoldCheshtaBala)>0.006)throw new RangeError('Chapter VI and Chapter X Cheshta inputs do not reconcile for '+planet);
  cheshtaForPhala=sixfoldCheshtaBala;
  specialChestaMethod='BV_RAMAN_CHAPTER_VI_SHARED_SIXFOLD_INPUT';
 }
 const ishtaRaw=Math.sqrt(uchchaBala*cheshtaForPhala);
 const kashtaRaw=Math.sqrt((60-uchchaBala)*(60-cheshtaForPhala));
 const reducedChestaKendra=chestaKendraRaw>180?360-chestaKendraRaw:chestaKendraRaw;
 const computedChestaForPhala=Math.round((reducedChestaKendra/3+Number.EPSILON)*100)/100;
 return Object.freeze({
  available:true,planet,method:'BV_RAMAN_SQRT_ISHTA_KASHTA',unit:'virupa',uchchaBala,
  cheshtaBala:cheshtaForPhala,cheshtaForPhala,computedChestaForPhala,
  specialChestaMethod,specialChestaFormula:formula,
  ishtaPhala:Math.round((ishtaRaw+Number.EPSILON)*100)/100,
  kashtaPhala:Math.round((kashtaRaw+Number.EPSILON)*100)/100,
  ishtaRaw,kashtaRaw,sixfoldShadbalaCheshtaBala:sixfoldCheshtaBala,
  formulaVerified:true,chartInputsCertified:false,classicalCertified:false,provisional:true,
  source:'B.V. Raman, Graha and Bhava Balas, Chapter X, paras 138-139, printed pp. 103-104',
  limitations:['Sun/Moon use the separate Chapter X Chesta-for-Phala calculation; their sixfold Chapter VI Cheshta remains zero','Mars-Saturn reuse the same Chapter VI Cheshta value and source longitudes for Ishta/Kashta; historical true-longitude inputs remain uncertified']
 });
}

/** Full seven-graha B.V. Raman Shadbala. Inputs are never guessed or replaced. */
function calculateBVRamanShadbala({planets,bhavas,ascendantLongitude,midheavenLongitude,apparentSolarHour,temporal,declinations,jdUt,classicalChestaInputs,ayanamsa}={}){
 if(!Array.isArray(planets))throw new TypeError('Seven-graha positions are required');
 const chart=PLANETS.map(name=>planets.find(p=>p?.name===name));
 if(chart.some(p=>!p||!finite(p.longitude)))throw new TypeError('All seven finite planetary longitudes are required');
 if(!finite(ascendantLongitude)||!finite(midheavenLongitude))throw new TypeError('Ascendant and Midheaven longitudes required');
 if(!finite(jdUt))throw new TypeError('UT Julian day required for Raman Chesta Bala');
 const lagnaSign=Math.floor(norm360(ascendantLongitude)/30),rasiPositions=Object.fromEntries(chart.map(p=>[p.name,Math.floor(norm360(p.longitude)/30)]));
 const angles={ascendant:norm360(ascendantLongitude),midheaven:norm360(midheavenLongitude),descendant:norm360(ascendantLongitude+180),nadir:norm360(midheavenLongitude+180)},baseRows={};
 for(const planet of PLANETS){
  const p=chart.find(x=>x.name===planet),sthana=sthanaBala(planet,p,lagnaSign,rasiPositions),dig=directionBala(planet,p.longitude,angles),kala=kalaBase(planet,chart,apparentSolarHour,temporal,declinations||{}),cheshta=chestaBala(planet,jdUt,p,classicalChestaInputs?.[planet]),naisargika=NAISARGIKA[planet],drik=drikBala(planet,chart);
  let ishtaKashta;
  try{
   ishtaKashta=ramanIshtaKashtaForPlanet({planet,sunRow:chart.find(x=>x.name==='சூரியன்'),moonRow:chart.find(x=>x.name==='சந்திரன்'),ayanamsa,uchchaBala:sthana.uccha,sixfoldCheshtaBala:cheshta.value,sixfoldCheshtaSource:cheshta});
  }catch(error){
   ishtaKashta={available:false,planet,method:'BV_RAMAN_SQRT_ISHTA_KASHTA',classicalCertified:false,provisional:true,reason:String(error?.message||error),chartInputsCertified:false};
  }
  baseRows[planet]={available:true,classicalCertified:false,provisional:true,method:'B.V. Raman, Graha and Bhava Balas',unit:'virupa',source:'B.V. Raman, Graha and Bhava Balas, 13th ed., Chapters III–VIII',ishtaKashta,
   components:{sthana,dig,kala,cheshta:cheshta.value,naisargika,drik:drik.drik},
   evidence:{drikPinda:drik.pinda,drikTrace:drik.trace,cheshtaSource:cheshta,solarTimeMethod:temporal?.solarTimeMethod??'unverified/fallback solar-time context',birthApparentSolarHour:round3(apparentSolarHour)},
   limitations:['Full natal Shadbala remains uncertified until the worked example and historical astronomical inputs reconcile independently',...(cheshta.trueLongitudeHistoricalCertified===false?['Five-planet traditional mean-longitude/Sheeghrocca chain remains research-only; sixfold Cheshta uses the calculated chart true longitude rather than a synthetic reconstructed true longitude. No modern speed-bucket estimate is substituted.']:[])],
   totalVirupa:null,totalRupa:null,requiredVirupa:REQUIRED[planet],ratio:null,isStrong:null};
 }
 const wars=applyRamanYuddha(baseRows,chart);
 for(const planet of PLANETS){
  const r=baseRows[planet],c=r.components;
  if(!wars.resolved&&wars.unresolved.some(pair=>pair.a===planet||pair.b===planet)){
   // Keep the six components visible but withhold the aggregate total when
   // Raman's source-based war result is ambiguous; UI can still show all 7 grahas.
   r.totalVirupa=null;r.totalRupa=null;r.ratio=null;r.isStrong=null;
   r.classicalCertified=false;r.warEvidence=wars;
   r.reason='Total withheld because B.V. Raman Yuddha Bala is unresolved';
   continue;
  }
  const chesta=r.evidence.cheshtaSource;
  if(!finite(chesta.value)||!finite(c.sthana.total)||!finite(c.dig)||!finite(c.kala.total)||!finite(c.naisargika)||!finite(c.drik)){
   r.available=false;r.reason='One or more B.V. Raman six-Bala components is unavailable';continue;
  }
  const total=c.sthana.total+c.dig+c.kala.total+c.cheshta+c.naisargika+c.drik;
  r.totalVirupa=round3(total);r.totalRupa=round3(total/60);r.ratio=round3(total/r.requiredVirupa);r.isStrong=total>=r.requiredVirupa;r.classicalCertified=false;r.warEvidence=wars;
 }
 return Object.freeze({method:'BV_RAMAN_INTEGRATED_SIX_BALA',source:'B.V. Raman, Graha and Bhava Balas, 13th ed., Chapters III–VIII; Ch. X Ishta/Kashta uses separate Chesta-for-Phala',classicalCertified:false,planets:Object.freeze(Object.fromEntries(PLANETS.map(p=>[p,baseRows[p]]))),warEvidence:wars,note:'Provisional source-based values are not a full classical certification; missing inputs are not replaced by BPHS values or speed-bucket guesses.'});
}
const BV_RAMAN_SHADBALA_SOURCE=Object.freeze({method:'BV_RAMAN_INTEGRATED_SIX_BALA',source:'B.V. Raman, Graha and Bhava Balas, 13th ed., Chapters III–VIII',balaNames:['Sthana','Dig','Kala','Cheshta','Naisargika','Drik'],naturalBalaPrinted:NAISARGIKA,requiredVirupa:REQUIRED,yuddhaDiscDiametersArcsec:DISC_ARCSEC,cheshtaFormula:'reduced absolute circular distance between Sheeghrocca and circular midpoint(mean,true) divided by 3',drikFormula:'signed Drishti Pinda divided by 4; no BPHS Chapter 27 v19 Mercury/Jupiter full-aspect addition',ishtaKashtaFormulaSeparate:true,ishtaKashtaAttachedToEachGraha:true,ishtaKashtaEngineMethod:'BV_RAMAN_SQRT_ISHTA_KASHTA',sixfoldSunMoonCheshtaVirupa:0,productionCertification:false});

module.exports={calculateBVRamanShadbala,BV_RAMAN_SHADBALA_SOURCE};
