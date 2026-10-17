/**
 * CG Rajan Jathaka Kanitham I, pp. 249–254 (scanned PDF pp.271–276).
 * Pindayurdaya and separately reviewed Naisargika per-graha fractions.
 * RESEARCH / CULTURAL ARITHMETIC, never a medical lifespan estimate or
 * an age/date-of-death prediction. Do not combine totals across systems.
 */
import {
 cgRajanNaturalAyurdayaGraha, cgRajanSevenNaturalResearch,
 cgRajanChakrapadaHouseFraction, cgRajanConditionReductions,
 cgRajanCombustionHaranaStatus
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
 * Rajan I printed pp.231–232, 235 and 244: research-only candidate for
 * Table-A Amsa Harana. p.231 selects combustion Harana over enemy-sign
 * Harana when both apply, and exempts Venus/Saturn from combustion Harana;
 * p.235 then adds the selected condition loss to the separate Chakrapada loss.
 * Missing chart facts or unverified strongest-occupant selection blocks
 * adjustment. This helper never certifies a complete natal Amsa result.
 */
export function cgRajanAmsaHaranaResearch({
 planet,rawAmsaYears,enemySign,combust,houseFromLagna,occupantCount,
 chakrapadaBenefic,strongestOccupantVerified,isExaltationSign,retrograde,
 ownSign,ownNavamsa,ownDrekkana,vargottama
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
 const chakrapadaApplies=Number.isInteger(houseFromLagna)&&houseFromLagna>=7&&houseFromLagna<=12;
 if(chakrapadaApplies&&typeof chakrapadaBenefic!=='boolean')
  blockers.push('Missing chart-verified benefic/malefic status required for Chakrapada Harana');
 if(chakrapadaApplies&&Number.isInteger(occupantCount)&&occupantCount>1&&strongestOccupantVerified!==true)
  blockers.push('Shadbala-verified strongest occupant required for multi-occupant Chakrapada Harana');
 if(blockers.length)return Object.freeze({planet,rawAmsaYears,resolved:false,
  adjustedAmsaYearsCandidate:null,traditionalUnitsCandidate:null,blockers,
  finalAmsaCertified:false,sourceSpecificCalculationReconciled:false,
  source:'CG Rajan Jathaka Kanitham I printed pp.235, 237–238'});
 const condition=cgRajanConditionReductions({planet,enemySign,combust});
 const benefic=chakrapadaApplies?chakrapadaBenefic:null;
 const chakra=chakrapadaApplies?
  cgRajanChakrapadaHouseFraction({house:houseFromLagna,benefic}):
  Object.freeze({house:houseFromLagna,benefic:null,lossFraction:0,remainingFraction:1});
 const chakrapadaLossFraction=chakra.lossFraction;
 const totalHaranaFraction=condition.conditionHaranaFraction+chakrapadaLossFraction;
 if(totalHaranaFraction>1+1e-10)return Object.freeze({planet,rawAmsaYears,resolved:false,
  adjustedAmsaYearsCandidate:null,traditionalUnitsCandidate:null,
  enemySignLossFraction:condition.enemySignLossFraction,
  combustionLossFraction:condition.combustionLossFraction,
  combustionHaranaExempt:condition.combustionHaranaExempt,
  combustionHaranaApplied:condition.combustionHaranaApplied,
  selectedConditionHarana:condition.selectedConditionHarana,
  chakrapadaLossFraction,totalHaranaFraction,
  blockers:['The separate condition and Chakrapada deductions exceed the raw Table-A term; source example does not authorize a negative contribution'],
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
  combustionHaranaExempt:condition.combustionHaranaExempt,
  combustionHaranaApplied:condition.combustionHaranaApplied,
  selectedConditionHarana:condition.selectedConditionHarana,
  chakrapadaLossFraction,totalHaranaFraction,yearsBeforeMultiplier,multiplier,
  adjustedAmsaYearsCandidate,
  traditionalUnitsCandidate:units(Math.round(adjustedAmsaYearsCandidate*NY)),
  finalAmsaCertified:false,sourceSpecificCalculationReconciled:false,
  blockers:['Research candidate only: no complete independent printed Amsa worked-example oracle yet',
   'The source selects Amsa when Lagna is the strongest among the Sun, Moon and Lagna factors; this comparison and required Shadbala/occupant-strength inputs are not independently certified',
   'Benefic/malefic classification and strongest-occupant state must be verified for the actual chart before Chakrapada Harana is treated as final'],
  source:'CG Rajan Jathaka Kanitham I printed pp.235, 237–238'});
}
/**
 * Resolve the Amsa Harana candidate from fields already present in the
 * natal chart. This intentionally refuses to infer source facts which the
 * chart object does not carry (notably chart-verified benefic status and a
 * Shadbala winner when multiple grahas share a Chakrapada house).
 */
const RAJAN_OWN_SIGNS=Object.freeze({
 'சூரியன்':[4],'சந்திரன்':[3],'செவ்வாய்':[0,7],'புதன்':[2,5],
 'குரு':[8,11],'சுக்கிரன்':[1,6],'சனி':[9,10]
});
const RAJAN_SIGN_LORDS=['செவ்வாய்','சுக்கிரன்','புதன்','சந்திரன்','சூரியன்','புதன்',
 'சுக்கிரன்','செவ்வாய்','குரு','சனி','சனி','குரு'];
const rajanSignIndex=lon=>Math.floor(norm(lon)/30);
function rajanNavamsaSignIndex(lon){
 const x=norm(lon),r=Math.floor(x/30),part=Math.min(8,Math.floor((x%30)/(30/9)));
 const start=r%3===0?r:r%3===1?(r+8)%12:(r+4)%12;
 return (start+part)%12;
}
function rajanDrekkanaSignIndex(lon){
 const x=norm(lon),r=Math.floor(x/30),part=Math.min(2,Math.floor((x%30)/10));
 return norm(r+(r%2===0?[0,4,8][part]:[8,4,0][part]));
}
function rajanExplicitBeneficState(planetRow){
 const candidates=[
  planetRow?.amsaHaranaBenefic,
  planetRow?.strength?.amsaHaranaBenefic,
  planetRow?.classicalState?.amsaHaranaBenefic
 ];
 return candidates.find(v=>typeof v==='boolean');
}
function cgRajanAmsaChartHarana({planet,amsa,planets}={}){
 const row=Array.isArray(planets)?planets.find(p=>p?.name===planet):null;
 const state=row?.strength||{};
 const lon=amsa?.trueLongitude;
 const sun=Array.isArray(planets)?planets.find(p=>p?.name==='சூரியன்'):null;
 const house=Number.isInteger(row?.bhava)&&row.bhava>=1&&row.bhava<=12?row.bhava:undefined;
 const allHouseEvidence=Array.isArray(planets)&&planets.length>0&&planets.every(p=>
  Number.isInteger(p?.bhava)&&p.bhava>=1&&p.bhava<=12);
 const occupants=house&&allHouseEvidence?planets.filter(p=>p.bhava===house).length:undefined;
 const relationship=state.relationship;
 const enemySign=['பகை','enemy','Enemy'].includes(relationship)?true:
  ['நட்பு','நடுநிலை','சுய ராசி','friend','neutral','own sign'].includes(relationship)?false:undefined;
 const combustStatus=finite(lon)&&finite(sun?.longitude)&&typeof state.retrograde==='boolean'
  ?cgRajanCombustionHaranaStatus({planet,trueLongitude:lon,
    sunLongitude:sun.longitude,retrograde:state.retrograde})
  :{resolved:false,reason:'Required natal longitude/Sun longitude/retrograde evidence is missing'};
 const rasi=finite(lon)?rajanSignIndex(lon):null;
 const d9=finite(lon)?rajanNavamsaSignIndex(lon):null;
 const d3=finite(lon)?rajanDrekkanaSignIndex(lon):null;
 const own=RAJAN_OWN_SIGNS[planet]||[];
 const chakraBenefic=rajanExplicitBeneficState(row);
 return cgRajanAmsaHaranaResearch({
  planet,rawAmsaYears:amsa?.rawAmsaYears,
  enemySign,combust:combustStatus.resolved===true?combustStatus.combust:undefined,
  houseFromLagna:house,occupantCount:occupants,
  chakrapadaBenefic:chakraBenefic,
  // The current chart does not provide a certified classical Shadbala
  // ranking, so multiple house occupants must remain unresolved.
  strongestOccupantVerified:false,
  isExaltationSign:typeof state.exalted==='boolean'?state.exalted:undefined,
  retrograde:typeof state.retrograde==='boolean'?state.retrograde:undefined,
  ownSign:typeof state.ownSign==='boolean'?state.ownSign:undefined,
  ownNavamsa:d9===null?undefined:own.includes(d9),
  ownDrekkana:d3===null?undefined:own.includes(d3),
  vargottama:rasi===null||d9===null?undefined:rasi===d9
 });
}
const traditionalNazhigai=value=>{
 const u=value||{};
 return Number(u.years||0)*NY+Number(u.months||0)*NM+
  Number(u.days||0)*ND+Number(u.nazhigai||0);
};
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
  const amsa=cgRajanAmsaAyurdayaGraha({planet:name,trueLongitude:p?.longitude});
  const amsaHarana=cgRajanAmsaChartHarana({planet:name,amsa,planets});
  return Object.freeze({name,english:SPEC[name].en,
   natural:native.byPlanet[name],pinda,amsa,amsaHarana});
 });
 const nadis=u=>traditionalNazhigai(u);
 const sumTerms=key=>entries.reduce((n,e)=>n+nadis(e[key]?.traditionalUnits),0);
 const pindaTotalNadis=sumTerms('pinda');
 const naturalTotalNadis=sumTerms('natural');
 // Keep raw Table-A arithmetic internally auditable, but never use it as the
 // displayed Amsa result or as a substitute for a Harana-adjusted total.
 const rawAmsaTableATotalNadis=sumTerms('amsa');
 const allAmsaHaranaResolved=entries.every(e=>e.amsaHarana?.resolved===true&&
  e.amsaHarana.traditionalUnitsCandidate);
 const amsaTotalNadis=allAmsaHaranaResolved
  ?entries.reduce((n,e)=>n+nadis(e.amsaHarana.traditionalUnitsCandidate),0):null;
 const averageOfThree=allAmsaHaranaResolved?cgRajanMeanThreeTraditionalTotals({
  pindaTotalNazhigai:pindaTotalNadis,naturalTotalNazhigai:naturalTotalNadis,
  amsaTotalNazhigai:amsaTotalNadis
 }):null;
 const totals=Object.freeze({
  pinda:Object.freeze({traditionalUnits:units(pindaTotalNadis),totalNazhigai:pindaTotalNadis}),
  natural:Object.freeze({traditionalUnits:units(naturalTotalNadis),totalNazhigai:naturalTotalNadis}),
  amsa:Object.freeze(allAmsaHaranaResolved
   ?{traditionalUnits:units(amsaTotalNadis),totalNazhigai:amsaTotalNadis,available:true}
   :{traditionalUnits:null,totalNazhigai:null,available:false,
     blockedGrahas:entries.filter(e=>!e.amsaHarana?.resolved).map(e=>e.name)}),
  amsaTableARaw:Object.freeze({traditionalUnits:units(rawAmsaTableATotalNadis),
   totalNazhigai:rawAmsaTableATotalNadis,displayedAsFinal:false}),
  averageOfThreeTotals:averageOfThree
 });
 return Object.freeze({entries,totals,
  averagingBasis:allAmsaHaranaResolved
   ?'Exact arithmetic mean of Pinda, Naisargika and post-Harana Amsa candidate totals divided by three; method selection remains provisional'
   :'Withheld because one or more chart-specific Amsa Harana inputs are unresolved; raw Table-A Amsa is not substituted',
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
 const amsaCell=v=>{
  if(v.amsaHarana?.resolved!==true||!v.amsaHarana.traditionalUnitsCandidate)
   return `<td data-amsa-harana="blocked" aria-label="${esc(ta?'அம்ச ஹரண முடிவு காட்டத் தேவையான ஜாதகத் தகவல் முழுமையில்லை':'Amsa Harana inputs are incomplete')}" title="${esc((v.amsaHarana?.blockers||[]).join('; '))}">—</td>`;
  return `<td data-amsa-harana="adjusted-candidate" title="${esc(ta?'மூல அட்டவணை A − தேர்ந்தெடுத்த ஹரணம்; பின்னர் அதிகபட்சப் பொருந்தும் multiplier':'Table A raw term less selected Harana, then maximum applicable multiplier')}">${esc(fmt({traditionalUnits:v.amsaHarana.traditionalUnitsCandidate},ta))}</td>`;
 };
 const fmtMaybe=(value,ta)=>value?.traditionalUnits?fmt(value,ta):'—';
 const lines=research.entries.map(v=>`<tr><th scope="row">${esc(ta?v.name:v.english)}</th><td>${esc(fmt(v.pinda,ta))}</td><td>${esc(fmt(v.natural,ta))}</td>${amsaCell(v)}</tr>`).join('');
 const totalLine=`<tr class="smv-ayurdaya-totals"><th scope="row">${ta?'மொத்தம் (7 கிரகங்கள்)':'Total (7 grahas)'}</th><td>${esc(fmt(research.totals.pinda,ta))}</td><td>${esc(fmt(research.totals.natural,ta))}</td><td data-amsa-total="${research.totals.amsa.available===true?'adjusted-candidate':'blocked'}">${esc(fmtMaybe(research.totals.amsa,ta))}</td></tr>`;
 const averageText=research.totals.averageOfThreeTotals
  ?esc(fmt(research.totals.averageOfThreeTotals,ta))
  :esc(ta?'— (அம்ச ஹரணத் தகவல் முழுமையில்லை)':'— (Amsa Harana inputs incomplete)');
 const averageLine=`<tr class="smv-ayurdaya-average"><th scope="row" colspan="4"><span>${ta?'சராசரி ஆயுள் — மூன்று மொத்தங்களின் கூட்டுத்தொகை ÷ 3 (இடைநிலை கணிதச் சராசரி)':'Average Ayurdaya — sum of the three totals ÷ 3 (provisional arithmetic mean)'}</span> <strong>${averageText}</strong></th></tr>`;
 const note=ta?
 'அம்ச ஆயுள் பத்தியில் மூல அட்டவணை A மதிப்பை இறுதி முடிவாகக் காட்டவில்லை. தேவையான கிரக உறவு, அஸ்தங்கதத் தொலைவு/வக்ரநிலை, பாவம், Navamsa/Drekkana/Vargottama மற்றும் சக்கிரபாத நிலை உறுதியாகக் கிடைத்தால் தேர்ந்தெடுத்த ஹரணம் கழித்து பொருந்தும் அதிகபட்ச multiplier பயன்படுத்திய ஆய்வு-மதிப்பு காட்டப்படும்; தேவையான தகவல் இல்லாத கிரகத்திற்கு — காட்டப்படும். பல கிரகங்கள் ஒரே சக்கிரபாதப் பாவத்தில் இருந்தால் முழுமையாகச் சான்றளிக்கப்பட்ட Shadbala வலிமைத் தேர்வு இல்லாமல் முடிவு காட்டப்படாது. பிண்டம் மற்றும் நைசர்க்கிகம் இங்கு இன்னும் மூலக் கணக்கீட்டு இடைநிலைகள்; ஏதேனும் அம்ச ஹரணத் தகவல் தீராதபோது அம்ச மொத்தமும் மூன்று மொத்தச் சராசரியும் மறைக்கப்படும். காட்டப்படும் அம்ச மதிப்புகளும் முழுமையான அச்சுப் புத்தக worked-example மூலம் இன்னும் சுயாதீனமாகச் சான்றளிக்கப்படாத ஆய்வு-வேட்பாளர்கள் மட்டுமே; இறுதி ஆயுள் உறுதியோ மரண வயது/நாள்கணிப்போ அல்ல; இது அறிவியல் அல்லது மருத்துவ ஆயுள் கணிப்பும் அல்ல.':
 'The Amsa column does not present the raw Table-A lookup as a final result. It shows a research candidate only when chart relationship, combustion distance/retrograde state, house, Navamsa/Drekkana/Vargottama and applicable Chakrapada evidence can be resolved; otherwise it shows —. If several grahas occupy a Chakrapada house, the result stays blocked until a source-valid Shadbala strength winner is verified. Pinda and Naisargika here remain intermediate raw terms. If any Amsa Harana inputs are unresolved, the Amsa total and three-method mean are withheld rather than substituting the raw Table-A sum. Even displayed adjusted Amsa values remain research candidates because a complete independent printed worked-example oracle and method-selection rule are not yet certified; this is NOT a prediction of personal lifespan, death age or death date.';
 return `<section class="smv-cg-rajan-ayurdaya" data-smv-cg-rajan-ayurdaya="1"><h3>${ta?'ஜாதக கணிதம் — பாரம்பரிய ஆயுர்த்தாயக் கணிதப் பகுப்பாய்வு':'Jathaka Kanitham — Traditional Ayurdaya Arithmetic'}</h3><p class="small">${esc(note)}</p><div class="adv-table-wrap smv-viii-table-scroll"><table class="adv-wide smv-ayurdaya-table"><thead><tr><th>${ta?'கிரகம்':'Planet'}</th><th>${ta?'பிண்ட ஆயுள்':'Pinda Ayurdaya'}</th><th>${ta?'நைசர்க்கிக ஆயுள்':'Naisargika Ayurdaya'}</th><th>${ta?'அம்ச ஆயுள்':'Amsa Ayurdaya'}</th></tr></thead><tbody>${lines}</tbody><tfoot>${totalLine}${averageLine}</tfoot></table></div></section>`;

}
