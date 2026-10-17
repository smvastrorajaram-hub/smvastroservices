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
const NY=21600, NM=1800, ND=60;
const units=value=>{
 if(!Number.isSafeInteger(value)||value<0)throw new RangeError('integer nazhigai required');
 let rem=value;
 const years=Math.floor(rem/NY);rem%=NY;
 const months=Math.floor(rem/NM);rem%=NM;
 const days=Math.floor(rem/ND);rem%=ND;
 return Object.freeze({years,months,days,nazhigai:rem});
};
/** Same retained major arc (180..360 degrees) demonstrated by Rajan's
 * Sun (202°58′) and Jupiter (293°17′) examples. Book-specific Pinda
 * maxima are 19,25,15,12,15,21,20.
 */
/**
 * C.G. Rajan I, printed pp.237–238: Amsa Ayurdaya table A.
 * The printed lookup advances in 3°20′ arc intervals and cycles values 1..12.
 * This returns ONLY the raw table-A graha term. The book's Lagna-lord-strength
 * condition and graha-specific strength/reduction rules are not yet fully
 * resolved, so this term cannot by itself certify final Ayurdaya.
 */
export function cgRajanAmsaAyurdayaGraha({planet,trueLongitude}={}){
 if(!SPEC[planet])throw new RangeError('Seven traditional grahas only');
 if(!finite(trueLongitude))throw new TypeError('finite sidereal longitude required');
 const longitude=norm(trueLongitude);
 const arcMinutes=longitude*60;
 const amsaIntervals=Math.max(1,Math.ceil(arcMinutes/200-1e-10));
 const amsaYears=((amsaIntervals-1)%12)+1;
 return Object.freeze({
  planet,trueLongitude:longitude,arcMinutes,intervalArcMinutes:200,
  amsaIntervals,rawAmsaYears:amsaYears,
  traditionalUnits:Object.freeze({years:amsaYears,months:0,days:0,nazhigai:0}),
  variant:'A',source:'C.G. Rajan Jathaka Kanitham I printed pp.237–238, Amsa table A',
  lagnaLordStrengthConditionVerified:false,allSourceReductionsApplied:false,
  individualLifespanCertified:false,deathAgeOrDate:null
 });
}
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
   natural:native.byPlanet[name],pinda,
   amsa:cgRajanAmsaAyurdayaGraha({planet:name,trueLongitude:p?.longitude})});
 });
 const nadis=u=>Number(u?.years||0)*NY+Number(u?.months||0)*NM+
  Number(u?.days||0)*ND+Number(u?.nazhigai||0);
 const sumTerms=key=>entries.reduce((n,e)=>n+nadis(e[key]?.traditionalUnits),0);
 const pindaTotalNadis=sumTerms('pinda');
 const naturalTotalNadis=sumTerms('natural');
 const amsaTotalNadis=sumTerms('amsa');
 const averageExactNadis=(pindaTotalNadis+naturalTotalNadis+amsaTotalNadis)/3;
 const totals=Object.freeze({
  pinda:Object.freeze({traditionalUnits:units(pindaTotalNadis),totalNazhigai:pindaTotalNadis}),
  natural:Object.freeze({traditionalUnits:units(naturalTotalNadis),totalNazhigai:naturalTotalNadis}),
  amsa:Object.freeze({traditionalUnits:units(amsaTotalNadis),totalNazhigai:amsaTotalNadis}),
  averageOfThreeTotals:Object.freeze({traditionalUnits:units(Math.round(averageExactNadis)),
   exactNazhigai:averageExactNadis,roundedNazhigai:Math.round(averageExactNadis)})
 });
 return Object.freeze({entries,totals,
  averagingBasis:'Arithmetic mean of the three seven-graha raw method totals before all book-specific strength selection and reductions are reconciled',
  finalAyurdayaCertified:false,personalLifespanCertified:false,
  methods:Object.freeze({
   pindayurdaya:'seven component arithmetic independently tested',
   naisargika:'seven component arithmetic independently tested',
   amsayurdaya:'Amsa table A raw graha terms implemented from printed pp.237–238; Lagna-lord-strength selection and all source reductions remain unverified',
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
 const lines=research.entries.map(v=>`<tr><th scope="row">${esc(ta?v.name:v.english)}</th><td>${esc(fmt(v.pinda,ta))}</td><td>${esc(fmt(v.natural,ta))}</td><td>${esc(fmt(v.amsa,ta))}</td></tr>`).join('');
 const totalLine=`<tr class="smv-ayurdaya-totals"><th scope="row">${ta?'மொத்தம் (7 கிரகங்கள்)':'Total (7 grahas)'}</th><td>${esc(fmt(research.totals.pinda,ta))}</td><td>${esc(fmt(research.totals.natural,ta))}</td><td>${esc(fmt(research.totals.amsa,ta))}</td></tr>`;
 const averageLine=`<tr class="smv-ayurdaya-average"><th scope="row" colspan="4"><span>${ta?'சராசரி ஆயுள் — மூன்று மொத்தங்களின் கூட்டுத்தொகை ÷ 3 (இடைநிலை கணிதச் சராசரி)':'Average Ayurdaya — sum of the three totals ÷ 3 (provisional arithmetic mean)'}</span> <strong>${esc(fmt(research.totals.averageOfThreeTotals,ta))}</strong></th></tr>`;
 const note=ta?
 'பிண்டம், நைசர்க்கிகம், அம்ச அட்டவணை A (நூல் பக்கங்கள் 237–238) ஆகியவற்றின் ஆரம்ப கிரகக் கணிதப் பங்குகள் இங்கே காட்டப்பட்டுள்ளன. கீழுள்ள மொத்தங்களும் சராசரியும் இந்தப் பங்குகளை மட்டும் கூட்டி கணக்கிட்ட இடைநிலை முடிவுகள். சத்துரு க்ஷேத்திரம், அஸ்தங்கதம், சக்கிரபாதம், கிரக வலிமை மற்றும் லக்னாதிபதி-வலிமை சார்ந்த தேர்வு ஆகியவற்றை முழுமையாக இணைத்து சுயாதீனமாகச் சரிபார்ப்பது இன்னும் நிலுவையில் உள்ளது. எனவே இந்தச் சராசரி இறுதி ஆயுள் உறுதியோ, தனிநபர் மரண வயது/நாள்கணிப்போ அல்ல.':
 'This table shows the initial planetary arithmetic terms for Pinda, Naisargika and Amsa table A (book pp.237–238). Totals and their arithmetic mean below only sum these initial terms. Enemy-sign, combustion, Chakrapada, planetary-strength and Lagna-lord-strength variant rules still require full integration and independent verification. This provisional mean is not a certified lifespan or a personal death-age/date prediction.';
 return `<section class="smv-cg-rajan-ayurdaya" data-smv-cg-rajan-ayurdaya="1"><h3>${ta?'ஜாதக கணிதம் — பாரம்பரிய ஆயுர்த்தாயக் கணிதப் பகுப்பாய்வு':'Jathaka Kanitham — Traditional Ayurdaya Arithmetic'}</h3><p class="small">${esc(note)}</p><div class="adv-table-wrap smv-viii-table-scroll"><table class="adv-wide smv-ayurdaya-table"><thead><tr><th>${ta?'கிரகம்':'Planet'}</th><th>${ta?'பிண்ட ஆயுள்':'Pinda Ayurdaya'}</th><th>${ta?'நைசர்க்கிக ஆயுள்':'Naisargika Ayurdaya'}</th><th>${ta?'அம்ச ஆயுள் (அட்டவணை A)':'Amsa Ayurdaya (table A)'}</th></tr></thead><tbody>${lines}</tbody><tfoot>${totalLine}${averageLine}</tfoot></table></div></section>`;

}
