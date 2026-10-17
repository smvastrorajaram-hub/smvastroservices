/**
 * CG Rajan Jathaka Kanitham I, pp. 249–254 (scanned PDF pp.271–276).
 * Pindayurdaya and separately reviewed Naisargika per-graha fractions.
 * RESEARCH / CULTURAL ARITHMETIC, never a medical lifespan estimate or
 * an age/date-of-death prediction. Do not combine totals across systems.
 */
import {
 cgRajanNaturalAyurdayaGraha, cgRajanSevenNaturalResearch,
 cgRajanChakrapadaHouseFraction, cgRajanConditionReductions
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
/**
 * Rajan I printed p.235: research-only candidate for Table-A Amsa Harana.
 * Every chart condition is explicit. Missing evidence or unresolved
 * strongest-occupant selection blocks the adjusted candidate; this helper
 * never certifies a complete natal Amsa result.
 */
const AMSA_BENEFICS=new Set(['சந்திரன்','புதன்','குரு','சுக்கிரன்']);
export function cgRajanAmsaHaranaResearch({
 planet,rawAmsaYears,enemySign,combust,houseFromLagna,occupantCount,
 strongestOccupantVerified,isExaltationSign,retrograde,ownSign,ownNavamsa,
 ownDrekkana,vargottama
}={}){
 if(!SPEC[planet])throw new RangeError('Seven traditional grahas only');
 if(!finite(rawAmsaYears)||rawAmsaYears<1||rawAmsaYears>12)
  throw new RangeError('Raw Amsa table-A years must be between 1 and 12');
 const blockers=[];
 const flags={enemySign,combust,isExaltationSign,retrograde,ownSign,ownNavamsa,ownDrekkana,vargottama};
 for(const [key,value] of Object.entries(flags))if(typeof value!=='boolean')
  blockers.push('Missing explicit '+key+' evidence');
 if(!Number.isInteger(houseFromLagna)||houseFromLagna<1||houseFromLagna>12)
  blockers.push('Missing valid house-from-Lagna evidence');
 if(!Number.isInteger(occupantCount)||occupantCount<1)
  blockers.push('Missing verified occupancy count');
 if(Number.isInteger(occupantCount)&&occupantCount>1&&strongestOccupantVerified!==true)
  blockers.push('Shadbala-verified strongest occupant required for Chakrapada Harana');
 if(blockers.length)return Object.freeze({planet,rawAmsaYears,resolved:false,
  adjustedAmsaYearsCandidate:null,traditionalUnitsCandidate:null,blockers,
  finalAmsaCertified:false,sourceSpecificCalculationReconciled:false,
  source:'CG Rajan Jathaka Kanitham I printed pp.235, 237–238'});
 const condition=cgRajanConditionReductions({planet,enemySign,combust});
 const benefic=AMSA_BENEFICS.has(planet);
 const chakra=cgRajanChakrapadaHouseFraction({house:houseFromLagna,benefic});
 const chakrapadaLossFraction=houseFromLagna>=7?chakra.lossFraction:0;
 const totalHaranaFraction=condition.conditionHaranaFraction+chakrapadaLossFraction;
 if(totalHaranaFraction>1+1e-10)return Object.freeze({planet,rawAmsaYears,resolved:false,
  adjustedAmsaYearsCandidate:null,traditionalUnitsCandidate:null,
  enemySignLossFraction:condition.enemySignLossFraction,
  combustionLossFraction:condition.combustionLossFraction,chakrapadaLossFraction,totalHaranaFraction,
  blockers:['Additive Harana deductions exceed the raw Table-A term; source order/example unresolved'],
  finalAmsaCertified:false,sourceSpecificCalculationReconciled:false,
  source:'CG Rajan Jathaka Kanitham I printed pp.235, 237–238'});
 // Apply only the maximum factor: x3 if exalted or retrograde; otherwise x2
 // if in own Rasi/Navamsa/Drekkana or Vargottama; never stack multipliers.
 const multiplier=(isExaltationSign||retrograde)?3:
  ((ownSign||ownNavamsa||ownDrekkana||vargottama)?2:1);
 const yearsBeforeMultiplier=rawAmsaYears*(1-totalHaranaFraction);
 const adjustedAmsaYearsCandidate=yearsBeforeMultiplier*multiplier;
 return Object.freeze({planet,rawAmsaYears,resolved:true,enemySign,combust,
  houseFromLagna,occupantCount,benefic,
  enemySignLossFraction:condition.enemySignLossFraction,
  combustionLossFraction:condition.combustionLossFraction,
  chakrapadaLossFraction,totalHaranaFraction,yearsBeforeMultiplier,multiplier,
  adjustedAmsaYearsCandidate,
  traditionalUnitsCandidate:units(Math.round(adjustedAmsaYearsCandidate*NY)),
  finalAmsaCertified:false,sourceSpecificCalculationReconciled:false,
  blockers:['Research candidate only: complete Amsa Harana chain has no independent printed worked-example oracle',
   'Lagna-lord-strength Table A/B/C selection and full Shadbala decisions remain unverified'],
  source:'CG Rajan Jathaka Kanitham I printed pp.235, 237–238'});
}
/** Exact arithmetic mean of three integer-nazhigai method totals. */
export function cgRajanMeanThreeTraditionalTotals({pindaTotalNazhigai,naturalTotalNazhigai,amsaTotalNazhigai}={}){
 const values=[pindaTotalNazhigai,naturalTotalNazhigai,amsaTotalNazhigai];
 if(values.some(x=>!Number.isSafeInteger(x)||x<0))
  throw new TypeError('Three non-negative integer nazhigai totals required');
 const exactNazhigaiNumerator=values.reduce((a,b)=>a+b,0);
 if(!Number.isSafeInteger(exactNazhigaiNumerator))
  throw new RangeError('Three-total sum exceeds safe integer range');
 let rem=exactNazhigaiNumerator;
 const years=Math.floor(rem/(3*NY));rem%=3*NY;
 const months=Math.floor(rem/(3*NM));rem%=3*NM;
 const days=Math.floor(rem/(3*ND));rem%=3*ND;
 const nazhigai=Math.floor(rem/3);
 const nazhigaiFractionNumerator=rem%3;
 return Object.freeze({exactNazhigaiNumerator,exactNazhigaiDenominator:3,
  exactNazhigai:exactNazhigaiNumerator/3,
  traditionalUnits:Object.freeze({years,months,days,nazhigai,
   nazhigaiFractionNumerator,nazhigaiFractionDenominator:3})});
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
 const averageOfThree=cgRajanMeanThreeTraditionalTotals({
  pindaTotalNazhigai:pindaTotalNadis,naturalTotalNazhigai:naturalTotalNadis,
  amsaTotalNazhigai:amsaTotalNadis
 });
 const totals=Object.freeze({
  pinda:Object.freeze({traditionalUnits:units(pindaTotalNadis),totalNazhigai:pindaTotalNadis}),
  natural:Object.freeze({traditionalUnits:units(naturalTotalNadis),totalNazhigai:naturalTotalNadis}),
  amsa:Object.freeze({traditionalUnits:units(amsaTotalNadis),totalNazhigai:amsaTotalNadis}),
  averageOfThreeTotals:averageOfThree
 });
 return Object.freeze({entries,totals,
  averagingBasis:'Exact arithmetic mean of three seven-graha raw method totals divided by three, retaining fractional nazhigai; method selection and reductions remain provisional',
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
 const fraction=Number(u.nazhigaiFractionNumerator||0);
 const fractionText=fraction===1?'⅓':fraction===2?'⅔':'';
 const nadiText=String(u.nazhigai)+fractionText;
 return ta?String(u.years)+' வ '+String(u.months)+' மா '+String(u.days)+' நா '+nadiText+' நாழி':
  String(u.years)+'y '+String(u.months)+'m '+String(u.days)+'d '+nadiText+'n';
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
 'பிண்டம், நைசர்க்கிகம், அம்ச அட்டவணை A (நூல் பக்கங்கள் 237–238) ஆகியவற்றின் ஹரணத்திற்கு முந்தைய கிரகப் பங்குகள் இங்கே காட்டப்பட்டுள்ளன. சத்துரு க்ஷேத்திர ஹரணம் (1/3), பக்கம் 244-இன் கிரக-குறிப்பிட்ட அஸ்தங்கத எல்லைகளின்படி அஸ்தங்கத ஹரணம் (1/2), மற்றும் சக்கிரபாத ஹரணம் ஆகியவற்றுக்கான தனி research கணக்கீட்டு உதவி சேர்க்கப்பட்டுள்ளது; ஆனால் இந்த live அட்டவணையில் பிறப்பு ஜாதகத்திற்கான முழு ஹரண முடிவு காட்டப்படவில்லை, ஏனெனில் பின்னோக்கி இயக்க நிலை, உறுதிசெய்யப்பட்ட பாவம், கிரக உறவு மற்றும் பல கிரகங்கள் ஒரே பாவத்தில் இருந்தால் Shadbala மூலம் வலிமையான கிரகத் தேர்வு இன்னும் முழுமையாகச் சான்றளிக்கப்படவில்லை. ஆகவே இங்குள்ள அம்சத் தொகையும் மூன்று மொத்தங்களின் சராசரியும் மூல அட்டவணைக் கணிதம் மட்டுமே; இறுதி ஆயுள் உறுதியோ மரண வயது/நாள்கணிப்போ அல்ல; இது அறிவியல் அல்லது மருத்துவ ஆயுள் கணிப்பும் அல்ல.':
 'This table shows the pre-Harana planetary terms for Pinda, Naisargika and Amsa Table A (book pp.237–238). A separate research helper now expresses enemy-sign loss (1/3), combustion loss (1/2) using the individual thresholds printed on p.244, and Chakrapada loss. It is deliberately not presented as a finished chart-specific Harana: retrograde status, verified house placement, graha relationship and Shadbala-based strongest-occupant selection have not all been independently certified, and the complete Amsa reduction chain has no independent printed worked-example oracle yet. The totals and exact mean below sum the three raw method totals only; this is NOT a prediction of personal lifespan, death age or death date; it is not a certified Ayurdaya result.';
 return `<section class="smv-cg-rajan-ayurdaya" data-smv-cg-rajan-ayurdaya="1"><h3>${ta?'ஜாதக கணிதம் — பாரம்பரிய ஆயுர்த்தாயக் கணிதப் பகுப்பாய்வு':'Jathaka Kanitham — Traditional Ayurdaya Arithmetic'}</h3><p class="small">${esc(note)}</p><div class="adv-table-wrap smv-viii-table-scroll"><table class="adv-wide smv-ayurdaya-table"><thead><tr><th>${ta?'கிரகம்':'Planet'}</th><th>${ta?'பிண்ட ஆயுள்':'Pinda Ayurdaya'}</th><th>${ta?'நைசர்க்கிக ஆயுள்':'Naisargika Ayurdaya'}</th><th>${ta?'அம்ச ஆயுள் (அட்டவணை A — ஹரணத்திற்கு முன்)':'Amsa Ayurdaya (Table A — before Harana)'}</th></tr></thead><tbody>${lines}</tbody><tfoot>${totalLine}${averageLine}</tfoot></table></div></section>`;

}
