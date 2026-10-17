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
 chakrapadaBenefic,strongestOccupantVerified,strongestOccupantSelected,
 applyChakrapadaLoss=true,isExaltationSign,retrograde,
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
 if(chakrapadaApplies&&Number.isInteger(occupantCount)&&occupantCount>1&&
  strongestOccupantVerified!==true&&strongestOccupantSelected!==true)
  blockers.push('A unique strongest-occupant selection is required for multi-occupant Chakrapada Harana');
 if(blockers.length)return Object.freeze({planet,rawAmsaYears,resolved:false,
  adjustedAmsaYearsCandidate:null,traditionalUnitsCandidate:null,blockers,
  finalAmsaCertified:false,sourceSpecificCalculationReconciled:false,
  source:'CG Rajan Jathaka Kanitham I printed pp.235, 237–238'});
 const condition=cgRajanConditionReductions({planet,enemySign,combust});
 const benefic=chakrapadaApplies?chakrapadaBenefic:null;
 const chakra=chakrapadaApplies&&applyChakrapadaLoss!==false?
  cgRajanChakrapadaHouseFraction({house:houseFromLagna,benefic}):
  Object.freeze({house:houseFromLagna,benefic:chakrapadaApplies?benefic:null,
   lossFraction:0,remainingFraction:1,applied:false});
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
  chakrapadaApplied:chakrapadaApplies&&applyChakrapadaLoss!==false,
  strongestOccupantSelected:strongestOccupantSelected===true,
  strongestOccupantVerified:strongestOccupantVerified===true,
  enemySignLossFraction:condition.enemySignLossFraction,
  combustionLossFraction:condition.combustionLossFraction,
  combustionHaranaExempt:condition.combustionHaranaExempt,
  combustionHaranaApplied:condition.combustionHaranaApplied,
  selectedConditionHarana:condition.selectedConditionHarana,
  chakrapadaLossFraction,totalHaranaFraction,yearsBeforeMultiplier,multiplier,
  adjustedAmsaYearsCandidate,
  traditionalUnitsCandidate:units(Math.round(adjustedAmsaYearsCandidate*NY)),
  finalAmsaCertified:false,sourceSpecificCalculationReconciled:false,
  blockers:[
   'Research candidate only: no complete independent printed Amsa worked-example oracle yet',
   'The source selects Amsa when Lagna is the strongest among the Sun, Moon and Lagna factors; this comparison is not independently certified',
   ...(strongestOccupantSelected===true&&strongestOccupantVerified!==true?
    ['The strongest occupant is selected provisionally from current strength3 scores; those scores are not independently certified Shadbala']:[]),
   'The computed result is a candidate, not a certified final Ayurdaya'
  ],
  source:'CG Rajan Jathaka Kanitham I printed pp.235, 237–238'});
}
/**
 * Resolve an Amsa Harana research candidate from the existing natal chart.
 * Explicit source-reviewed benefic status wins; otherwise derive a transparent
 * natural benefic/malefic candidate. When a Chakrapada house has multiple
 * seven-graha occupants, pick the unique highest current strength3 score for
 * candidate display only. Current strength3 is not independently certified.
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
/**
 * Provisional natural-subha/paapa classification for the book's Chakrapada
 * half-loss. An explicit source-reviewed amsaHaranaBenefic flag takes
 * precedence. Moon nature follows waxing/waning elongation; Mercury is
 * treated as benefic unless it shares a sign with a natural malefic or node.
 * These classifications are candidates only and do not certify method choice.
 */
function rajanDerivedAmsaBenefic(planet,planets){
 if(planet==='குரு'||planet==='சுக்கிரன்')return true;
 if(planet==='சூரியன்'||planet==='செவ்வாய்'||planet==='சனி')return false;
 const sun=Array.isArray(planets)?planets.find(p=>p?.name==='சூரியன்'):null;
 const row=Array.isArray(planets)?planets.find(p=>p?.name===planet):null;
 if(planet==='சந்திரன்'){
  if(!finite(row?.longitude)||!finite(sun?.longitude))return undefined;
  const phase=norm(row.longitude-sun.longitude);
  if(phase<1e-7||Math.abs(phase-180)<1e-7)return undefined;
  return phase<180;
 }
 if(planet==='புதன்'){
  const sign=finite(row?.longitude)?Math.floor(norm(row.longitude)/30):null;
  if(sign===null)return undefined;
  const maleficOrNode=new Set(['சூரியன்','செவ்வாய்','சனி','ராகு','கேது']);
  const associated=Array.isArray(planets)&&planets.some(p=>p?.name!==planet&&
   maleficOrNode.has(p?.name)&&finite(p?.longitude)&&Math.floor(norm(p.longitude)/30)===sign);
  return !associated;
 }
 return undefined;
}
function rajanAmsaBeneficState(planetRow,planets){
 const explicit=rajanExplicitBeneficState(planetRow);
 return typeof explicit==='boolean'?explicit:rajanDerivedAmsaBenefic(planetRow?.name,planets);
}
function cgRajanAmsaChartHarana({planet,amsa,planets}={}){
 const row=Array.isArray(planets)?planets.find(p=>p?.name===planet):null;
 const state=row?.strength||{};
 const lon=amsa?.trueLongitude;
 const sun=Array.isArray(planets)?planets.find(p=>p?.name==='சூரியன்'):null;
 const house=Number.isInteger(row?.bhava)&&row.bhava>=1&&row.bhava<=12?row.bhava:undefined;
 const sevenGrahas=Array.isArray(planets)?planets.filter(p=>Object.prototype.hasOwnProperty.call(SPEC,p?.name)):[];
 const allHouseEvidence=sevenGrahas.length===7&&sevenGrahas.every(p=>
  Number.isInteger(p?.bhava)&&p.bhava>=1&&p.bhava<=12);
 const occupants=house&&allHouseEvidence?sevenGrahas.filter(p=>p.bhava===house).length:undefined;
 const houseOccupants=house&&allHouseEvidence?sevenGrahas.filter(p=>p.bhava===house):[];
 const occupantScores=houseOccupants.map(p=>({
  planet:p.name,score:p?.strength3?.totalVirupa,
  certified:p?.strength3?.classicalCertified===true
 }));
 const rankable=occupantScores.length>1&&occupantScores.every(x=>finite(x.score));
 const ranked=[...occupantScores].sort((a,b)=>b.score-a.score);
 const uniqueWinner=rankable&&ranked.length>1&&Math.abs(ranked[0].score-ranked[1].score)>1e-9;
 const selectedStrongest=occupants>1&&uniqueWinner?ranked[0].planet:null;
 const strongestOccupantSelected=occupants>1&&selectedStrongest!==null;
 const strongestOccupantVerified=strongestOccupantSelected&&occupantScores.every(x=>x.certified);
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
 const chakraBenefic=rajanAmsaBeneficState(row,planets);
 const chakraApplies=Number.isInteger(house)&&house>=7&&house<=12;
 const applyChakrapadaLoss=!chakraApplies||occupants<=1||
  (selectedStrongest===planet);
 return cgRajanAmsaHaranaResearch({
  planet,rawAmsaYears:amsa?.rawAmsaYears,
  enemySign,combust:combustStatus.resolved===true?combustStatus.combust:undefined,
  houseFromLagna:house,occupantCount:occupants,
  chakrapadaBenefic:chakraBenefic,
  strongestOccupantVerified,
  strongestOccupantSelected,
  applyChakrapadaLoss,
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
 'அம்ச ஆயுள் பத்தியில் மூல அட்டவணை A மதிப்பை இறுதி ஹரண முடிவாகக் காட்டவில்லை. கிரக உறவு, அஸ்தங்கதம், பாவம், Navamsa/Drekkana/Vargottama ஆகியவற்றிலிருந்து கிடைக்கும் தரவுகளைப் பயன்படுத்தி ஹரண candidate கணக்கிடப்படுகிறது. பல கிரகங்கள் ஒரே சக்கிரபாதப் பாவத்தில் இருந்தால் தற்போதைய strength3 மதிப்பின் அடிப்படையில் அதிக வலிமை கொண்ட கிரகம் ஆய்வு-வேட்பாளராகத் தேர்வு செய்யப்படுகிறது; அந்த strength3 மதிப்புகள் சுயாதீனமாகச் சான்றளிக்கப்பட்ட Shadbala அல்ல. முழுமையான அச்சுப் புத்தக worked-example மற்றும் Lagna-வலிமை முறைத் தேர்வு இன்னும் சான்றளிக்கப்படாததால், இவை இடைக்காலக் கணித ஆய்வு மதிப்புகள் மட்டுமே; இறுதி ஆயுள் உறுதியோ மரண வயது/நாள்கணிப்போ அல்ல; இது அறிவியல் அல்லது மருத்துவ ஆயுள் கணிப்பும் அல்ல.':
 'The Amsa column does not present raw Table-A values as final Harana results. It calculates research candidates from chart relationship, combustion, house, Navamsa/Drekkana/Vargottama and Chakrapada inputs. When multiple grahas occupy a Chakrapada house, the highest current strength3 score selects a research candidate; those scores are not independently certified Shadbala. The complete printed Amsa worked example and Lagna-strength method-selection rule are not yet certified, so these remain provisional arithmetic candidates, not a prediction of lifespan, death age or death date.';
 return `<section class="smv-cg-rajan-ayurdaya" data-smv-cg-rajan-ayurdaya="1"><h3>${ta?'ஜாதக கணிதம் — பாரம்பரிய ஆயுர்த்தாயக் கணிதப் பகுப்பாய்வு':'Jathaka Kanitham — Traditional Ayurdaya Arithmetic'}</h3><p class="small">${esc(note)}</p><div class="adv-table-wrap smv-viii-table-scroll"><table class="adv-wide smv-ayurdaya-table"><thead><tr><th>${ta?'கிரகம்':'Planet'}</th><th>${ta?'பிண்ட ஆயுள்':'Pinda Ayurdaya'}</th><th>${ta?'நைசர்க்கிக ஆயுள்':'Naisargika Ayurdaya'}</th><th>${ta?'அம்ச ஆயுள் (ஹரணத்திற்குப் பின் — ஆய்வு மதிப்பு)':'Amsa Ayurdaya (post-Harana candidate)'}</th></tr></thead><tbody>${lines}</tbody><tfoot>${totalLine}${averageLine}</tfoot></table></div></section>`;

}
