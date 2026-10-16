/**
 * Traditional Sūrya Siddhānta Chapter II, verses 17–22 and 29–45:
 * four successive manda/sighra corrections using the PRINTED 24 Jya
 * (sine) table of radius 3438 and linear lookup / inverse interpolation.
 *
 * This independent math path does not call Math.sin, Math.cos,
 * Math.atan2 or Math.asin. It uses only the printed table values and
 * a geometric hypotenuse. It is a diagnostic, not a historical ephemeris
 * certification. The input mean/ucca must be from a consistent Saura frame.
 *
 * 24 Jya entries cross-checked against 1861 Sastri translation p.16:
 * https://en.wikisource.org/wiki/Page:English_translation_of_the_Surya_Siddhanta_and_the_Siddhanta_Siromani_by_Sastri,_1861.djvu/26
 */
import {SAURA_EPICYCLE_SIZES} from './saura-classical-true-longitude.browser.mjs';

const HALF_CIRCLE=180,QUADRANT=90,STEP=3.75,RADIUS=3438;
export const SAURA_CLASSICAL_JYA=Object.freeze([
  0,225,449,671,890,1105,1315,1520,1719,1910,
  2093,2267,2431,2585,2728,2859,2978,3084,3177,
  3256,3321,3372,3409,3431,3438
]);
const tamil=Object.freeze({'புதன்':'Mercury','சுக்கிரன்':'Venus','செவ்வாய்':'Mars','குரு':'Jupiter','சனி':'Saturn'});
const norm=x=>((x%360)+360)%360;
function lookupQuarter(x){
  if(x<0||x>QUADRANT)throw new RangeError('Quarter-angle lookup 0..90 only');
  if(x===QUADRANT)return RADIUS;
  const n=x/STEP,low=Math.floor(n),fraction=n-low;
  return SAURA_CLASSICAL_JYA[low]+fraction*(SAURA_CLASSICAL_JYA[low+1]-SAURA_CLASSICAL_JYA[low]);
}
/** Signed tabular sine multiplied by 3438. */
export function sauraJyaSignedDegrees(deg){
  if(!Number.isFinite(deg))throw new TypeError('finite angle required');
  const a=norm(deg),q=a<=90?a:a<=180?180-a:a<=270?a-180:360-a;
  const v=lookupQuarter(q);
  return a<=180?v:-v;
}
/** Invert printed sine table; accept signed trijya arc-minutes. */
export function sauraInverseJyaArcMinutes(jya){
  if(!Number.isFinite(jya)||Math.abs(jya)>RADIUS+1e-9)
    throw new RangeError('Inverse Jya input must be within ±3438');
  const abs=Math.min(RADIUS,Math.abs(jya));
  if(abs>=RADIUS)return jya<0?-90:90;
  let lo=0,hi=24;
  while(hi-lo>1){
    const mid=(lo+hi)>>1;
    if(SAURA_CLASSICAL_JYA[mid]<=abs)lo=mid;else hi=mid;
  }
  const v=SAURA_CLASSICAL_JYA;
  const degrees=STEP*(lo+(abs-v[lo])/(v[lo+1]-v[lo]));
  return jya<0?-degrees:degrees;
}
function correction(mean,ucca,paridhiPair,kind='sighra',mandaKarṇaConvention='common-plus'){
  const k=norm(ucca-mean),sin=sauraJyaSignedDegrees(k)/RADIUS,
        cos=sauraJyaSignedDegrees(k+90)/RADIUS;
  const correctedParidhi=paridhiPair[0]-
    (paridhiPair[0]-paridhiPair[1])*Math.abs(sin);
  // Arcminutes radius: paridhi degrees × 60 / (2π × trijya 3438).
  const relativeRadius=correctedParidhi*60/(2*Math.PI*RADIUS);
  // Two independently documented published examples use conflicting
  // effective Manda karna conventions. Keep the historically working
  // original 4/5 oracle convention as default; alternate-minus may be
  // used ONLY for source discrepancy diagnosis, never live output.
  const sign=kind==='manda'&&mandaKarṇaConvention==='alternate-minus'?-1:1;
  const side=relativeRadius*sin,axis=1+sign*relativeRadius*cos;
  const hypotenuse=Math.hypot(axis,side);
  if(hypotenuse<=0)throw new RangeError('invalid mandakarna / sighrakarna');
  const signedSine=Math.max(-RADIUS,Math.min(RADIUS,RADIUS*side/hypotenuse));
  return Object.freeze({
    correctionDegrees:sauraInverseJyaArcMinutes(signedSine),
    kendraDegrees:k,correctedParidhi,relativeRadius,
    karnaRatio:hypotenuse,signedSineArcMinutes:signedSine
  });
}
/**
 * Independent V367-style four-pass *interpolated printed Jya* route.
 * 1. Half Sighra correction to mean.
 * 2. Half Manda correction to that temporary position.
 * 3. Recompute full Manda at the twice-corrected position, but
 *    apply full correction to ORIGINAL mean.
 * 4. Full Sighra correction to full-Manda corrected mean.
 *
 * Any mismatch with academic 2024 tables remains explicit.
 */
export function sauraTabularFourPassTrueLongitude({planet,meanLongitude,mandocca,sheeghrocha,mandaKarṇaConvention='common-plus'}={}){
  const p=tamil[planet]||planet;
  if(!Object.prototype.hasOwnProperty.call(SAURA_EPICYCLE_SIZES,p))
    throw new RangeError('Only five visible grahas allowed');
  if(!['common-plus','alternate-minus'].includes(mandaKarṇaConvention))
    throw new RangeError('Unknown Manda karna convention');
  if(![meanLongitude,mandocca,sheeghrocha].every(Number.isFinite))
    throw new TypeError('three finite classical orbital longitudes required');
  const m=norm(meanLongitude),a=norm(mandocca),s=norm(sheeghrocha),size=SAURA_EPICYCLE_SIZES[p];
  const sh1=correction(m,s,size.sighra),afterHalfSighra=norm(m+sh1.correctionDegrees/2);
  const ma1=correction(afterHalfSighra,a,size.manda,'manda',mandaKarṇaConvention);
  const afterHalfManda=norm(afterHalfSighra+ma1.correctionDegrees/2);
  const ma2=correction(afterHalfManda,a,size.manda,'manda',mandaKarṇaConvention),afterFullManda=norm(m+ma2.correctionDegrees);
  const sh2=correction(afterFullManda,s,size.sighra);
  return Object.freeze({
    planet:p,meanLongitude:m,mandocca:a,sheeghrocha:s,mandaKarṇaConvention,
    trueLongitude:norm(afterFullManda+sh2.correctionDegrees),
    stages:Object.freeze({
      halfSighraDegrees:sh1.correctionDegrees/2,
      halfMandaDegrees:ma1.correctionDegrees/2,
      fullMandaDegrees:ma2.correctionDegrees,
      fullSighraDegrees:sh2.correctionDegrees,
      afterHalfSighra,afterHalfManda,afterFullManda
    }),
    method:'Sūrya Siddhānta printed 24-point Jya linear interpolation (3438 trijya)',
    historicallyCertified:false,numericallyCertifiedAgainstTwoPublications:false,
    useAsProductionCheshta:false
  });
}
