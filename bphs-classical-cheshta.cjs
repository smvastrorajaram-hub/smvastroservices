/**
 * CommonJS mirror of the BPHS classical Cheshta input resolver.
 * Keep arithmetic and evidence flags in parity with the browser module.
 * Research candidate only: no historical true-longitude certification claim.
 */
const KALI_EPOCH_JD_UT=588465.5,MAHAYUGA_CIVIL_DAYS=1577917828;
const UJJAIN_MERIDIAN_DEGREES=75+46/60,KALPA_CIVIL_DAYS=MAHAYUGA_CIVIL_DAYS*1000;
const REV=Object.freeze({Sun:4320000,Mercury:17937044,Venus:7022364,Mars:2296832,Jupiter:364212,Saturn:146580});
const FIVE=Object.freeze(['Mars','Mercury','Jupiter','Venus','Saturn']),INNER=new Set(['Mercury','Venus']);
const TAMIL=Object.freeze({'செவ்வாய்':'Mars','புதன்':'Mercury','குரு':'Jupiter','சுக்கிரன்':'Venus','சனி':'Saturn'});
const APSIS_REV=Object.freeze({Sun:387,Mercury:368,Venus:535,Mars:204,Jupiter:900,Saturn:39});
const APSIS_KALI=Object.freeze({
 Sun:2*30+17+7/60+48/3600,Mercury:7*30+10+19/60+12/3600,
 Venus:2*30+19+39/60,Mars:4*30+9+57/60+36/3600,
 Jupiter:5*30+21,Saturn:7*30+26+36/60+36/3600
});
const EPICYCLES=Object.freeze({
 Mercury:{manda:[30,28],sighra:[133,132]},
 Venus:{manda:[12,11],sighra:[262,260]},
 Mars:{manda:[75,72],sighra:[235,232]},
 Jupiter:{manda:[33,32],sighra:[70,72]},
 Saturn:{manda:[49,48],sighra:[39,40]}
});
const norm=x=>((x%360)+360)%360,R=Math.PI/180;
function bodyOf(p){const b=TAMIL[p]||p;if(!Object.prototype.hasOwnProperty.call(REV,b)||b==='Sun')throw new RangeError('Five visible planets only');return b;}
function validJd(jd){
 const min=Date.UTC(1800,0,1)/86400000+2440587.5,max=Date.UTC(2400,0,1)/86400000+2440587.5;
 if(!Number.isFinite(jd)||jd<min||jd>=max)throw new RangeError('Bīja Cheshta input must be within 1800–2399');
}
function mean(jd,body){
 const days=jd-KALI_EPOCH_JD_UT+UJJAIN_MERIDIAN_DEGREES/360;
 return norm((days*REV[body]/MAHAYUGA_CIVIL_DAYS%1)*360);
}
function equation(m,u,sizes,kind='sighra',convention='verse39-direct-jya'){
 const k=norm(u-m),rad=k*R,[even,odd]=sizes;
 const paridhi=even-(even-odd)*Math.abs(Math.sin(rad)),radius=paridhi/360,num=radius*Math.sin(rad);
 if(kind==='manda'&&convention==='verse39-direct-jya')
  return {degrees:Math.asin(Math.max(-1,Math.min(1,num)))/R};
 const koti=radius*Math.cos(rad),den=kind==='manda'&&convention==='absolute-koti-minus'?1-Math.abs(koti):1+koti;
 if(!(den>0))throw new RangeError('Invalid Saura epicycle geometry');
 return {degrees:Math.atan2(num,den)/R};
}
function fourPass(planet,meanLongitude,mandocca,sheeghrocha){
 const p=EPICYCLES[planet],m=norm(meanLongitude),a=norm(mandocca),s=norm(sheeghrocha);
 const halfSighra=equation(m,s,p.sighra).degrees/2;
 const afterHalfSighra=norm(m+halfSighra);
 const halfManda=equation(afterHalfSighra,a,p.manda,'manda').degrees/2;
 const afterHalfManda=norm(afterHalfSighra+halfManda);
 const fullManda=equation(afterHalfManda,a,p.manda,'manda').degrees;
 const afterFullManda=norm(m+fullManda);
 const fullSighra=equation(afterFullManda,s,p.sighra).degrees;
 return norm(afterFullManda+fullSighra);
}
function angleCheshta(meanLongitude,trueLongitude,sheeghroccaLongitude){
 const delta=norm(trueLongitude-meanLongitude);
 if(Math.abs(delta-180)<1e-10)throw new RangeError('BPHS mean/true midpoint ambiguous at 180 degrees');
 const signed=delta>180?delta-360:delta,midpoint=norm(meanLongitude+signed/2);
 const raw=norm(sheeghroccaLongitude-midpoint),kendra=Math.min(raw,360-raw);
 const virupa=kendra/3;
 if(!Number.isFinite(virupa)||virupa<0||virupa>60)throw new RangeError('BPHS Cheshta result outside 0–60 Virupas');
 return {meanTrueMidpoint:midpoint,cheshtaKendraDegrees:kendra,virupa};
}
function bphsClassicalFivePlanetCheshta(jdUt,planet){
 validJd(jdUt);
 const body=bodyOf(planet),meanSun=mean(jdUt,'Sun'),ownMean=mean(jdUt,body),inner=INNER.has(body);
 const meanLongitude=inner?meanSun:ownMean,sheeghrocca=inner?ownMean:meanSun;
 const days=jdUt-KALI_EPOCH_JD_UT+UJJAIN_MERIDIAN_DEGREES/360;
 const mandocca=norm(APSIS_KALI[body]+APSIS_REV[body]*360*days/KALPA_CIVIL_DAYS);
 const trueLongitude=fourPass(body,meanLongitude,mandocca,sheeghrocca);
 const arithmetic=angleCheshta(meanLongitude,trueLongitude,sheeghrocca);
 return Object.freeze({
  planet:TAMIL[body],...arithmetic,meanLongitude,trueLongitude,sheeghroccaLongitude:sheeghrocca,mandocca,
  method:'BPHS_CH27_24_25',
  inputModel:'CLASSICAL_BIJA_MEAN + CLASSICAL_BIJA_TRUE',
  frame:'traditional-Saura-nirayana',
  meanHistoricallySourced:true,meanNumericallyVerifiedAtOfficialAnchor:true,
  sheeghroccheyaSelectionVerified:true,
  trueLongitudeHistoricallyCertified:false,trueLongitudeNumericallyCertified:false,
  tupleHistoricallyCertified:false,tupleNumericallyCertified:false,productionEligible:false,
  limitations:[
   'CLASSICAL_BIJA_TRUE has not passed the strict DE441 0.05° historical-model gate',
   'MODERN_DRIK_BIJA_TRUE / DE441 / INPOP certificates are separate model products and are not substituted'
  ]
 });
}
module.exports={bphsClassicalFivePlanetCheshta};
