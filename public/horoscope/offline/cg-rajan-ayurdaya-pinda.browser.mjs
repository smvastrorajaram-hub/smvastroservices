/**
 * CG Rajan Jathaka Kanitham I, pp. 249–254 (scanned PDF pp.271–276).
 * Pindayurdaya and separately reviewed Naisargika per-graha fractions.
 * RESEARCH / CULTURAL ARITHMETIC, never a medical lifespan estimate or
 * an age/date-of-death prediction. Do not combine totals across systems.
 */
import {
 cgRajanNaturalAyurdayaGraha, cgRajanSevenNaturalResearch,
 cgRajanAmsaAyurdayaGraha, cgRajanAverageFinalThreeMethods
} from './cg-rajan-ayurdaya-research.browser.mjs';
const SPEC=Object.freeze({
 'சூரியன்':{maximumYears:19,exaltation:10,en:'Sun'},
 'சந்திரன்':{maximumYears:25,exaltation:33,en:'Moon'},
 'செவ்வாய்':{maximumYears:15,exaltation:298,en:'Mars'},
 'புதன்':{maximumYears:12,exaltation:165,en:'Mercury'},
 'குரு':{maximumYears:15,exaltation:95,en:'Jupiter'},
 'சுக்கிரன்':{maximumYears:21,exaltation:357,en:'Venus'},
 'சனி':{maximumYears:20,exaltation:200,en:'Saturn'}
});
const names=Object.keys(SPEC);
const norm=x=>((x%360)+360)%360;
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const NY=21600, NM=1800;
const units=value=>{
 if(!Number.isSafeInteger(value)||value<0)throw new RangeError('integer nazhigai required');
 let rem=value;
 const years=Math.floor(rem/NY);rem%=NY;
 const months=Math.floor(rem/NM);rem%=NM;
 const days=Math.floor(rem/60);rem%=60;
 return Object.freeze({years,months,days,nazhigai:rem});
};
/** Same retained major arc (180..360 degrees) demonstrated by Rajan's
 * Sun (202°58′) and Jupiter (293°17′) examples. Book-specific Pinda
 * maxima are 19,25,15,12,15,21,20.
 */
export function cgRajanPindaGraha({planet,trueLongitude}={}){
 const v=SPEC[planet];
 if(!v)throw new RangeError('Seven planets only');
 if(!finite(trueLongitude))throw new TypeError('finite sidereal longitude required');
 const difference=norm(v.exaltation-norm(trueLongitude));
 const arc=difference<180?360-difference:difference;
 const nazhigaiExact=arc/360*v.maximumYears*NY;
 return Object.freeze({
  planet,trueLongitude:norm(trueLongitude),exaltationLongitude:v.exaltation,
  retainedArcDegrees:arc,maximumPindaYears:v.maximumYears,
  symbolicComponentYears:arc/360*v.maximumYears,
  traditionalUnits:units(Math.round(nazhigaiExact)),
  researchOnly:true,independentBirthLongitudeCertified:false,
  totalHumanLifetime:null,deathAgeOrDate:null,
  source:'C. G. Rajan Jathaka Kanitham I printed pp.249–254'
 });
}
/** No birth-longitude recomputation: uses the already-produced chart
 * and never writes back into live Swiss graha, Shadbala or prediction.
 */
export function cgRajanCompareGrahas({planets=[]}={}){
 if(!Array.isArray(planets))throw new TypeError('chart planets required');
 const native=cgRajanSevenNaturalResearch({planets});
 const entries=names.map(name=>{
  const p=planets.find(x=>x.name===name);
  const pinda=cgRajanPindaGraha({planet:name,trueLongitude:p?.longitude});
  const amsa=cgRajanAmsaAyurdayaGraha({planet:name,trueLongitude:p?.longitude});
  return Object.freeze({name,english:SPEC[name].en,
   natural:native.byPlanet[name],pinda,amsa});
 });
 return Object.freeze({entries,
  methods:Object.freeze({
   pindayurdaya:'seven component arithmetic independently tested',
   naisargika:'seven component arithmetic independently tested',
   amsayurdaya:'raw longitude-remainder component independently reproduced against printed pp.255–256; final reductions/selection not certified',
   pindashtakavarga:'not independently reconciled to Rajan worked example',
   rasija:'not independently reconciled to Rajan worked example',
   nakshatra:'not independently reconciled to Rajan worked example',
   kalachakra:'not independently reconciled to Rajan worked example',
   samudaya:'not independently reconciled to Rajan worked example'
  }),
  threeMethodAverage:cgRajanAverageFinalThreeMethods({}),
  methodSelectionAndReductionsVerified:false,allEightMethodsComplete:false,
  combinedLongevityYears:null,deathAgeOrDate:null,predictionCertified:false,
  source:'CG Rajan Jathaka Kanitham I (source-specific research)'});
}
const fmt=(value,ta)=>{
 const u=value.traditionalUnits;
 return ta?
  `${u.years} வ ${u.months} மா ${u.days} நா ${u.nazhigai} நாழி`:
  `${u.years}y ${u.months}m ${u.days}d ${u.nazhigai}n`;
};
const esc=s=>String(s).replace(/[&<>"']/g,ch=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[ch]));
/** Customer-visible CULTURAL arithmetic transparency, not longevity
 * prognostication; no consolidated lifespan or death-time output.
 * Does not depend on print-only DOM state so Saved/PDF snapshots can
 * contain this section just like the already-rendered horoscope.
 */
export function cgRajanAyurdayaReportHtml({planets,language='ta'}={}){
 const research=cgRajanCompareGrahas({planets});
 const ta=language==='ta';
 const lines=research.entries.map(v=>`<tr><th scope="row">${esc(ta?v.name:v.english)}</th><td>${esc(fmt(v.pinda,ta))}</td><td>${esc(fmt(v.natural,ta))}</td><td>${esc(fmt(v.amsa,ta))}</td></tr>`).join('');
 const note=ta?
 'இவை நூலில் காட்டப்பட்ட பிண்டம், நைசர்க்கிகம் மற்றும் அம்சம் ஆகியவற்றின் கிரக வாரியான கணிதப் பங்குகள் மட்டுமே. அம்சத்தின் 40° சுற்று மற்றும் அச்சுப் பக்க உதாரணங்கள் சரிபார்க்கப்பட்டுள்ளன; ஆனால் ஒவ்வொரு முறையின் இறுதி குறைப்புகள்/தேர்வு விதிகள் முழுமையாகச் சரிபார்க்கப்படவில்லை. ஆகவே மூன்று முறைகளின் சராசரி இப்போது கணக்கிடப்படாது. இவை தனிநபரின் உண்மையான ஆயுட்காலம் அல்லது மரண வயதைக் கணிக்கும் பலன் அல்ல; அறிவியல் அல்லது மருத்துவ வாழ்நாள் கணிப்பும் அல்ல.':
 'These are planet-wise arithmetic components for Pinda, Naisargika and Amsa. The Amsa 40-degree cycle and printed examples are reproduced, but final reductions/method selection for each method are not fully verified. Therefore no three-method average is shown. These values are NOT a prediction of a person\'s actual lifespan, age at death, or a scientific/medical life-expectancy estimate.';;
 return `<section class="smv-cg-rajan-ayurdaya" data-smv-cg-rajan-ayurdaya="1"><h3>${ta?'ஜாதக கணிதம் — பாரம்பரிய ஆயுர்த்தாயக் கணிதப் பகுப்பாய்வு':'Jathaka Kanitham — Traditional Ayurdaya Arithmetic'}</h3><p class="small">${esc(note)}</p><div class="smv-cg-rajan-ayurdaya-table-wrap" role="region" tabindex="0" aria-label="${ta?'பாரம்பரிய ஆயுர்த்தாய அட்டவணை — கிடைமட்டமாக உருட்டவும்':'Traditional Ayurdaya table — scroll horizontally'}"><table class="smv-cg-rajan-ayurdaya-table"><thead><tr><th>${ta?'கிரகம்':'Planet'}</th><th>${ta?'பிண்டக் கணிதப் பங்கு':'Pinda component'}</th><th>${ta?'நைசர்க்கிகக் கணிதப் பங்கு':'Naisargika component'}</th><th>${ta?'அம்சக் கணிதப் பங்கு':'Amsa component'}</th></tr></thead><tbody>${lines}</tbody></table></div><p class="small">${ta?'மூன்று முறைகளின் சராசரி பெற, பிண்டம், நைசர்க்கிகம், அம்சம் ஆகிய ஒவ்வொன்றின் இறுதி மதிப்பும் ஒரே அலகில் மூல விதிகளால் உறுதிப்படுத்தப்பட வேண்டும். அந்த இறுதிக் குறைப்புகள்/தேர்வு இன்னும் சரிபார்ப்பில் உள்ளதால் சராசரி காட்டப்படவில்லை.':'The three-method average requires a source-verified final total for each method in the same unit. Final reductions/selection remain under audit, so the average is withheld.'}</p></section>`;
}
