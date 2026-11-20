/**
 * BPHS I Ch.27 vv24-25 — source-coherent five-graha Cheshta candidate.
 *
 * Mean and Sheeghroccheya selection follows the checked V365/V366 rules.
 * True longitude uses the same named historical Saura/Bīja model and frame.
 * This is a research candidate, not a numerical historical-true certificate:
 * CLASSICAL_BIJA_TRUE's strict DE441 accuracy gate remains failed.
 *
 * The separately certified MODERN_DRIK_BIJA_TRUE / DE441/INPOP result is NOT
 * silently substituted into this classical tuple; it is a different model.
 */
import { sauraFourPassTrueLongitude } from './saura-classical-true-longitude.browser.mjs';
import { bphsFivePlanetCheshtaFromClassicalMeans } from './bphs-swiss-solar-cheshta.browser.mjs';

const KALI_EPOCH_JD_UT=588465.5;
const MAHAYUGA_CIVIL_DAYS=1577917828;
const UJJAIN_MERIDIAN_DEGREES=75+46/60;
const KALPA_CIVIL_DAYS=MAHAYUGA_CIVIL_DAYS*1000;
const BIJA_REVOLUTIONS=Object.freeze({
 Sun:4320000,Mercury:17937044,Venus:7022364,
 Mars:2296832,Jupiter:364212,Saturn:146580
});
const FIVE=Object.freeze(['Mars','Mercury','Jupiter','Venus','Saturn']);
const INNER=new Set(['Mercury','Venus']);
const TAMIL=Object.freeze({
 'செவ்வாய்':'Mars','புதன்':'Mercury','குரு':'Jupiter','சுக்கிரன்':'Venus','சனி':'Saturn'
});
const APSIS_REVOLUTIONS_PER_KALPA=Object.freeze({
 Sun:387,Mercury:368,Venus:535,Mars:204,Jupiter:900,Saturn:39
});
const APSIS_KALI_EPOCH_LONGITUDE=Object.freeze({
 Sun:2*30+17+7/60+48/3600,
 Mercury:7*30+10+19/60+12/3600,
 Venus:2*30+19+39/60,
 Mars:4*30+9+57/60+36/3600,
 Jupiter:5*30+21,
 Saturn:7*30+26+36/60+36/3600
});
const norm360=x=>((x%360)+360)%360;
function bodyOf(value){
 const body=TAMIL[value]||value;
 if(!Object.prototype.hasOwnProperty.call(BIJA_REVOLUTIONS,body))throw new RangeError('Five visible grahas only');
 return body;
}
function validJd(jdUt){
 const min=Date.UTC(1800,0,1)/86400000+2440587.5;
 const max=Date.UTC(2400,0,1)/86400000+2440587.5;
 if(!Number.isFinite(jdUt)||jdUt<min||jdUt>=max)throw new RangeError('Bīja Cheshta input must be within 1800–2399');
}
function meanLongitude(jdUt,body){
 const days=jdUt-KALI_EPOCH_JD_UT+UJJAIN_MERIDIAN_DEGREES/360;
 const turns=days*BIJA_REVOLUTIONS[body]/MAHAYUGA_CIVIL_DAYS;
 return norm360((turns%1)*360);
}
function correctedInputs(jdUt,planet){
 const body=bodyOf(planet);
 const meanSun=meanLongitude(jdUt,'Sun');
 const ownMean=meanLongitude(jdUt,body);
 const inner=INNER.has(body);
 return {
  body,jdUt,meanSunLongitude:meanSun,ownMeanOrbitLongitude:ownMean,
  meanLongitude:inner?meanSun:ownMean,
  sheeghrocca:inner?ownMean:meanSun,
  frame:'traditional-Saura-nirayana',
  model:'CLASSICAL_BIJA_MEAN',
  bījaProfile:'BURGESS_BENTLEY_CORRECTED_REVOLUTIONS',
  meanSourceCertificate:'V365 official IMD source snapshot + canonical mean-motion regression',
  sheeghroccaSelectionCertificate:'V366 BPHS/UK five-graha selector regression'
 };
}
function mandoccaLongitude(jdUt,body){
 const days=jdUt-KALI_EPOCH_JD_UT+UJJAIN_MERIDIAN_DEGREES/360;
 return norm360(APSIS_KALI_EPOCH_LONGITUDE[body]+
  APSIS_REVOLUTIONS_PER_KALPA[body]*360*days/KALPA_CIVIL_DAYS);
}
/**
 * Returns exact BPHS Cheshta arithmetic with all three source longitudes.
 * Numeric output is usable as a provisional research value; it does not
 * self-certify the historical true-longitude model.
 */
export function bphsClassicalFivePlanetCheshta(jdUt,planet){
 validJd(jdUt);
 const inputs=correctedInputs(jdUt,planet),mandocca=mandoccaLongitude(jdUt,inputs.body);
 const trueModel=sauraFourPassTrueLongitude({
  planet:inputs.body,meanLongitude:inputs.meanLongitude,mandocca,
  sheeghrocha:inputs.sheeghrocca,mandaKarṇaConvention:'verse39-direct-jya'
 });
 const arithmetic=bphsFivePlanetCheshtaFromClassicalMeans(
  TAMIL[inputs.body]===undefined?planet:TAMIL[inputs.body],
  inputs.meanSunLongitude,inputs.ownMeanOrbitLongitude,trueModel.trueLongitude
 );
 return Object.freeze({
  ...arithmetic,
  meanLongitude:inputs.meanLongitude,
  trueLongitude:trueModel.trueLongitude,
  sheeghroccaLongitude:inputs.sheeghrocca,
  mandocca,
  frame:'traditional-Saura-nirayana',
  inputModel:'CLASSICAL_BIJA_MEAN + CLASSICAL_BIJA_TRUE',
  meanHistoricallySourced:true,
  meanNumericallyVerifiedAtOfficialAnchor:true,
  sheeghroccaSelectionVerified:true,
  trueLongitudeHistoricallyCertified:false,
  trueLongitudeNumericallyCertified:false,
  tupleHistoricallyCertified:false,
  tupleNumericallyCertified:false,
  productionEligible:false,
  trueLongitudeMethod:trueModel.source||'Sūrya Siddhānta II.39, II.40–45 four-pass research model',
  limitations:[
   'CLASSICAL_BIJA_TRUE has not passed the strict DE441 0.05° historical-model gate',
   'Modern Dṛk-Bīja / DE441 / INPOP true-longitude certificates are separate model products and are not substituted here'
  ]
 });
}
export const BPHS_CLASSICAL_CHESHTA_METADATA=Object.freeze({
 method:'BPHS_CH27_24_25',
 meanSource:'Burgess 1860 Bīja-corrected Saura revolutions',
 sheeghroccheyaSelection:'BPHS I Ch.27 vv24–25; Uttara Kalamrita II pp.42–43',
 trueSource:'Sūrya Siddhānta II.39–45 four-pass Manda/Śīghra research model',
 frame:'traditional-Saura-nirayana',
 supportedYears:Object.freeze([1800,2399]),
 meanCertificate:'V365',
 sheeghroccheyaSelectorCertificate:'V366',
 trueLongitudeAccuracyCertificate:null,
 separateModernTrueCertificate:'MODERN_DRIK_BIJA_TRUE / INPOP19 0.05° — not interchangeable with CLASSICAL_BIJA_TRUE',
 productionEligible:false,
 classicalCertified:false
});
