/**
 * V367 Saura Siddhanta Chapter II: independent four-pass true-longitude
 * evaluator for FIVE classical planets. Research-only, browser-safe.
 *
 * Inputs must be from ONE classical sidereal system:
 *   mean position (Sun for inner planets), classical mandocca, sheeghrocha.
 * Four passes: half sighra, half manda, full manda (original mean),
 * full sighra. Epicycle circumference is variable with |sin anomaly|.
 *
 * Published numerical comparisons: Santhoju et al., Journal of Astrophysics
 * and Astronomy 46:9 (2025) tables 6-7, and rkanetech.com/true-position.
 * Some external printed oracles disagree beyond 0.05 deg. Do not mark this
 * as numerically certified or replace Swiss/production Shadbala.
 */
const R=Math.PI/180,normalize=x=>((x%360)+360)%360;
const EPICYCLES=Object.freeze({
 Mercury:Object.freeze({manda:[30,28],sighra:[133,132]}),
 Venus:Object.freeze({manda:[12,11],sighra:[262,260]}),
 Mars:Object.freeze({manda:[75,72],sighra:[235,232]}),
 Jupiter:Object.freeze({manda:[33,32],sighra:[70,72]}),
 Saturn:Object.freeze({manda:[49,48],sighra:[39,40]})
});
const TAMIL=Object.freeze({'புதன்':'Mercury','சுக்கிரன்':'Venus','செவ்வாய்':'Mars','குரு':'Jupiter','சனி':'Saturn'});
const APSE_RATES=Object.freeze({Mercury:.368,Venus:.535,Mars:.204,Jupiter:.900,Saturn:.039});
const ANCHOR_2024=Object.freeze({Mercury:220.4772,Venus:79.8785,Mars:130.0471,Jupiter:171.3844,Saturn:236.6267});
const ANCHOR_JD=2460409.5,MAHAYUGA_DAYS=1577917828;
const bodyOf=x=>{const b=TAMIL[x]||x;if(!Object.prototype.hasOwnProperty.call(EPICYCLES,b))throw new RangeError('Five visible planets only');return b;};
export const SAURA_EPICYCLE_SIZES=EPICYCLES;
function equation(mean,ucca,sizes){
  const k=normalize(ucca-mean),rad=k*R,[even,odd]=sizes;
  const paridhi=even-(even-odd)*Math.abs(Math.sin(rad));
  const radius=paridhi/360;
  const num=radius*Math.sin(rad),den=1+radius*Math.cos(rad);
  if(den<=0||!Number.isFinite(den))throw new RangeError('Invalid circular epicycle geometry');
  return Object.freeze({degrees:Math.atan2(num,den)/R,paridhiDegrees:paridhi,kendraDegrees:k});
}
export function sauraFourPassTrueLongitude({planet,meanLongitude,mandocca,sheeghrocha}){
  const body=bodyOf(planet);
  if(![meanLongitude,mandocca,sheeghrocha].every(Number.isFinite))
    throw new TypeError('Three finite classical ecliptic longitudes required');
  const m=normalize(meanLongitude),a=normalize(mandocca),s=normalize(sheeghrocha),p=EPICYCLES[body];
  const first=equation(m,s,p.sighra);
  const afterHalfSighra=normalize(m+first.degrees/2);
  const second=equation(afterHalfSighra,a,p.manda);
  const afterHalfManda=normalize(afterHalfSighra+second.degrees/2);
  const third=equation(afterHalfManda,a,p.manda);
  const afterFullManda=normalize(m+third.degrees);
  const fourth=equation(afterFullManda,s,p.sighra);
  return Object.freeze({
    planet:body,meanLongitude:m,mandocca:a,sheeghrocha:s,
    stages:Object.freeze({
      halfSighraDegrees:first.degrees/2,
      halfMandaDegrees:second.degrees/2,
      fullMandaDegrees:third.degrees,
      fullSighraDegrees:fourth.degrees,
      afterHalfSighra,afterHalfManda,afterFullManda
    }),
    trueLongitude:normalize(afterFullManda+fourth.degrees),
    frame:'traditional-Saura-nirayana-unmodified',
    source:'Surya Siddhanta Ch II v29-45 four-pass manda/sighra',
    historicallyCertified:false,
    numericallyCertified:false,
    productionShadbalaCertified:false,
    liveCheshtaEligible:false
  });
}
/**
 * The mandocca is extrapolated from published April 9 2024 apsis values,
 * using the very slow traditional rates (SS I.41-42). Historically useful
 * diagnostic, but NOT independent validation for any other birth date.
 * Neither ancient epoch offsets nor time-dependent Bija are certified.
 */
export function sauraMandoccaResearch(jdUt,planet){
  const body=bodyOf(planet);
  if(!Number.isFinite(jdUt)||jdUt<0||jdUt>5000000)
    throw new RangeError('Finite realistic Julian UT required');
  return Object.freeze({
    planet:body,jdUt,
    mandocca:normalize(ANCHOR_2024[body]+(jdUt-ANCHOR_JD)*APSE_RATES[body]*360/MAHAYUGA_DAYS),
    source:'Santhoju et al 2024 published apsis + Surya Siddhanta I.41-42 rates',
    historicalNumericalCertified:false
  });
}
