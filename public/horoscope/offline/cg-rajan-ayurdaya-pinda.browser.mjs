/**
 * CG Rajan Jathaka Kanitham I, pp. 249–254 (scanned PDF pp.271–276).
 * Pindayurdaya and separately reviewed Naisargika per-graha fractions.
 * RESEARCH / CULTURAL ARITHMETIC, never a medical lifespan estimate or
 * an age/date-of-death prediction. Do not combine totals across systems.
 */
import {
 cgRajanNaturalAyurdayaGraha, cgRajanSevenNaturalResearch
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
  return Object.freeze({name,english:SPEC[name].en,
   natural:native.byPlanet[name],pinda});
 });
 return Object.freeze({entries,
  methods:Object.freeze({
   pindayurdaya:'seven component arithmetic independently tested',
   naisargika:'seven component arithmetic independently tested',
   amsayurdaya:'not independently reconciled to Rajan worked example',
   pindashtakavarga:'not independently reconciled to Rajan worked example',
   rasija:'not independently reconciled to Rajan worked example',
   nakshatra:'not independently reconciled to Rajan worked example',
   kalachakra:'not independently reconciled to Rajan worked example',
   samudaya:'not independently reconciled to Rajan worked example'
  }),
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
 const lines=research.entries.map(v=>`<tr><th scope="row">${esc(ta?v.name:v.english)}</th><td>${esc(fmt(v.pinda,ta))}</td><td>${esc(fmt(v.natural,ta))}</td></tr>`).join('');
 const note=ta?
 'இவை பழைய ஜோதிட நூலின் இரண்டு முறைகளுக்கான கிரக வாரியான கணிதப் பங்குகள் மட்டுமே. வருடம்/மாதம்/நாள்/நாழிகை என்பது நூலின் கணித அலகு. தனிநபரின் உண்மையான ஆயுட்காலம் அல்லது மரண வயது அல்ல; அறிவியல் அல்லது மருத்துவ வாழ்நாள் கணிப்பு அல்ல. எட்டு முறைகளுக்கான இறுதித் தேர்வும் அரண விதிகளும் இன்னும் முழுமையாகச் சரிபார்க்கப்படவில்லை.':
 'These are planet-wise arithmetic terms from two historical astrological methods. Year/month/day/nazhigai are traditional computational units, NOT a prediction of a person\'s actual lifespan, age at death, or a scientific/medical life-expectancy estimate. Complete selection and reductions across all eight source methods remain unverified.';
 return `<section class="smv-cg-rajan-ayurdaya" data-smv-cg-rajan-ayurdaya="1"><h3>${ta?'ஜாதக கணிதம் — பாரம்பரிய ஆயுர்த்தாயக் கணிதப் பகுப்பாய்வு':'Jathaka Kanitham — Traditional Ayurdaya Arithmetic'}</h3><p class="small">${esc(note)}</p><table><thead><tr><th>${ta?'கிரகம்':'Planet'}</th><th>${ta?'பிண்ட ஆயுள் — கிரகக் கணிதப் பங்கு':'Pinda component'}</th><th>${ta?'நைசர்க்கிக ஆயுள் — கிரகக் கணிதப் பங்கு':'Natural component'}</th></tr></thead><tbody>${lines}</tbody></table><p class="small">${ta?'அம்சம் மற்றும் மீதமுள்ள ஐந்து முறைகளின் முழுக் கணக்கீடுகள் சரிபார்ப்பில் உள்ளன. எந்த முறைகளையும் ஒன்றாகக் கூட்டி ஒருவருக்கு ஆயுள் ஆண்டுகள் கணிக்கப்படவில்லை.':'Amsa and five other source methods await worked-example reconciliation. No personal lifespan total is calculated from these rows.'}</p></section>`;
}
