/**
 * CG Rajan Jathaka Kanitham I, printed pp.231–254 (scanned PDF pp.253–276).
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
 const intervalPosition=arcMinutes/200;
 const completedIntervals=Math.floor(intervalPosition+1e-10);
 const rawAmsaFractionOfPada=Math.max(0,Math.min(1,intervalPosition-completedIntervals));
 // Printed Table A gives year values at 3°20′ boundaries, cycling 1..12
 // after the initial 0° origin. Table C converts the arcminutes progressed
 // inside the CURRENT pada by rule of three: 200′ = one year, 1′ = 1d 48n.
 // Do not interpolate the two boundary labels (notably 12 -> 1 at a cycle):
 // preserve the lower table value and add only the current-pada fraction.
 const tableYearAt=index=>index<=0?0:((index-1)%12)+1;
 const lowerBoundaryYears=tableYearAt(completedIntervals);
 const upperBoundaryYears=tableYearAt(completedIntervals+1);
 const rawAmsaYears=lowerBoundaryYears+rawAmsaFractionOfPada;
 const amsaIntervals=Math.max(1,completedIntervals+1);
 return Object.freeze({
  planet,trueLongitude:longitude,arcMinutes,intervalArcMinutes:200,
  amsaIntervals,completedIntervals,lowerBoundaryYears,upperBoundaryYears,rawAmsaFractionOfPada,rawAmsaYears,
  traditionalUnits:units(Math.round(rawAmsaYears*NY)),
  variant:'A',source:'C.G. Rajan Jathaka Kanitham I printed pp.237–238, Amsa table A; fractional arc by rule of three',
  lagnaLordStrengthConditionVerified:false,allSourceReductionsApplied:false,
  individualLifespanCertified:false,deathAgeOrDate:null
 });
}
/**
 * Rajan I printed pp.231–232, 235 and 244: research-only candidate for
 * Table-A Amsa Harana. p.231 selects combustion Harana over enemy-sign
 * Harana when both apply, and exempts Venus/Saturn from combustion Harana;
 * p.235 then adds the selected condition loss to the separate Chakrapada loss.
 * Missing chart facts or a tied/unavailable occupant ranking blocks the
 * candidate. A provisional strength6 winner allows a research candidate only;
 * this helper never certifies a complete natal Amsa result.
 */
export function cgRajanAmsaHaranaResearch({
 planet,rawAmsaYears,enemySign,combust,houseFromLagna,occupantCount,
 chakrapadaBenefic,strongestOccupantVerified,strongestOccupantSelected,
 applyChakrapadaLoss=true,isExaltationSign,retrograde,
 ownSign,ownNavamsa,ownDrekkana,vargottama
}={}){
 if(!SPEC[planet])throw new RangeError('Seven traditional grahas only');
 if(!finite(rawAmsaYears)||rawAmsaYears<0||rawAmsaYears>=13)
  throw new RangeError('Raw Amsa table-A term must be 0..12 years plus the current-pada fraction');
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
 const condition=cgRajanConditionReductions({planet,enemySign,combust,retrograde});
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
   conditionHaranaFraction:condition.conditionHaranaFraction,
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
   conditionHaranaFraction:condition.conditionHaranaFraction,
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
    ['The strongest occupant is selected provisionally from B.V. Raman strength6 scores; those scores are not independently certified Shadbala']:[]),
   'The computed result is a candidate, not a certified final Ayurdaya'
  ],
  source:'CG Rajan Jathaka Kanitham I printed pp.235, 237–238'});
}
/**
 * Resolve an Amsa Harana research candidate from the existing natal chart.
 * Explicit source-reviewed benefic status wins; otherwise derive a transparent
 * natural benefic/malefic candidate. When a Chakrapada house has multiple
 * seven-graha occupants, pick the unique highest B.V. Raman strength6 score for
 * candidate display only. Current strength6 is not independently certified.
 */
const RAJAN_OWN_SIGNS=Object.freeze({
 'சூரியன்':[4],'சந்திரன்':[3],'செவ்வாய்':[0,7],'புதன்':[2,5],
 'குரு':[8,11],'சுக்கிரன்':[1,6],'சனி':[9,10]
});
const rajanSignIndex=lon=>Math.floor(norm(lon)/30);
function rajanNavamsaSignIndex(lon){
 const x=norm(lon),r=Math.floor(x/30),part=Math.min(8,Math.floor((x%30)/(30/9)));
 const start=r%3===0?r:r%3===1?(r+8)%12:(r+4)%12;
 return (start+part)%12;
}
function rajanDrekkanaSignIndex(lon){
 const x=norm(lon),r=Math.floor(x/30),part=Math.min(2,Math.floor((x%30)/10));
 // Drekkana returns a sign index, so wrap at 12 signs (not 360 degrees).
 return (r+(r%2===0?[0,4,8][part]:[8,4,0][part]))%12;
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
  planet:p.name,score:p?.strength6?.totalVirupa,
  certified:p?.strength6?.classicalCertified===true
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

/**
 * C.G. Rajan I printed pp.232–234, Gururodaya Harana.
 * Convert the Lagna's rasi/bhaga/kala/vikala into years/months/days/nazhigai.
 * If the closest graha in Lagna is malefic, deduct this Lagna term from
 * that graha's Pinda/Naisargika contribution; a source-defined benefic aspect
 * halves this deduction. This does NOT apply to Amsa (printed p.232).
 */
function cgRajanLagnaContributionNazhigai(longitude){
 if(!finite(longitude))throw new TypeError('Verified Lagna longitude required for Gururodaya Harana');
 const x=norm(longitude);
 let rasi=Math.floor(x/30);
 const within=x-rasi*30;
 let bhaga=Math.floor(within+1e-10);
 let minute=Math.floor(((within-bhaga)*60)+1e-8);
 let second=Math.round((((within-bhaga)*60)-minute)*60);
 if(second>=60){second=0;minute++;}
 if(minute>=60){minute=0;bhaga++;}
 if(bhaga>=30){bhaga=0;rasi++;}
 return rasi*NY+bhaga*NM+minute*ND+second;
}
const RAJAN_GURU_ASPECT_HOUSES=Object.freeze({
 'சந்திரன்':[7],'புதன்':[7],'சுக்கிரன்':[7],'குரு':[5,7,9]
});
/**
 * Resolve only the p.233 Lagna rule from explicit chart facts. Ambiguous
 * nearest-graha ties and absent Lagna longitude fail closed instead of
 * manufacturing a Harana. Planetary aspect convention follows p.233.
 */
export function cgRajanGururodayaHaranaResearch({planets=[],lagna}={}){
 if(!Array.isArray(planets))throw new TypeError('chart planets required');
 const inLagna=planets.filter(p=>SPEC[p?.name]&&p?.bhava===1);
 if(!inLagna.length)return Object.freeze({
  resolved:true,applied:false,targetPlanet:null,lossNazhigai:0,
  source:'C.G. Rajan Jathaka Kanitham I printed pp.232–233'
 });
 const stateRows=inLagna.map(p=>({
  row:p,benefic:rajanAmsaBeneficState(p,planets),
  distance:finite(p?.longitude)&&finite(lagna?.longitude)
   ?Math.min(norm(p.longitude-lagna.longitude),360-norm(p.longitude-lagna.longitude))
   :null
 }));
 if(stateRows.some(p=>typeof p.benefic!=='boolean'))
  return Object.freeze({resolved:false,applied:false,targetPlanet:null,lossNazhigai:null,
   blockers:['Gururodaya Harana needs verified benefic/malefic classification for every Lagna occupant'],
   source:'C.G. Rajan Jathaka Kanitham I printed pp.232–233'});
 if(!stateRows.some(p=>p.benefic===false))return Object.freeze({
  resolved:true,applied:false,targetPlanet:null,lossNazhigai:0,
  source:'C.G. Rajan Jathaka Kanitham I printed pp.232–233'
 });
 if(!finite(lagna?.longitude)||stateRows.some(p=>p.distance===null))
  return Object.freeze({resolved:false,applied:false,targetPlanet:null,lossNazhigai:null,
   blockers:['Gururodaya Harana needs the true Lagna longitude and each Lagna-occupant longitude'],
   source:'C.G. Rajan Jathaka Kanitham I printed pp.232–233'});
 const ranked=[...stateRows].sort((a,b)=>a.distance-b.distance);
 if(ranked.length>1&&Math.abs(ranked[0].distance-ranked[1].distance)<1e-8)
  return Object.freeze({resolved:false,applied:false,targetPlanet:null,lossNazhigai:null,
   blockers:['Gururodaya Harana cannot choose between Lagna occupants tied in angular proximity'],
   source:'C.G. Rajan Jathaka Kanitham I printed p.233'});
 const closest=ranked[0];
 if(closest.benefic)return Object.freeze({
  resolved:true,applied:false,targetPlanet:null,closestPlanet:closest.row.name,
  closestIsBenefic:true,lossNazhigai:0,
  source:'C.G. Rajan Jathaka Kanitham I printed p.233'
 });
 const beneficAspecting=planets.some(p=>{
  if(!SPEC[p?.name]||rajanAmsaBeneficState(p,planets)!==true)return false;
  const permitted=RAJAN_GURU_ASPECT_HOUSES[p.name]||[];
  return permitted.includes(p?.bhava);
 });
 const lagnaContributionNazhigai=cgRajanLagnaContributionNazhigai(lagna.longitude);
 return Object.freeze({
  resolved:true,applied:true,targetPlanet:closest.row.name,
  closestPlanet:closest.row.name,closestIsBenefic:false,
  beneficAspecting,lagnaContributionNazhigai,
  lossNazhigai:lagnaContributionNazhigai*(beneficAspecting?0.5:1),
  source:'C.G. Rajan Jathaka Kanitham I printed pp.232–233'
 });
}
/**
 * Shared Pinda/Naisargika reductions. Rajan pp.232–234 says to total the
 * applicable reductions and subtract them from the original graha term.
 * Enemy-sign/combustion precedence and Chakrapada fractions are reused from
 * the separately tested Amsa evidence (without applying Amsa's multiplier).
 */
export function cgRajanPindaNaisargikaHaranaResearch({
 planet,rawNazhigai,amsaHarana,gururodayaHarana
}={}){
 if(!SPEC[planet])throw new RangeError('Seven traditional grahas only');
 const blockers=[];
 if(!finite(rawNazhigai)||rawNazhigai<0)
  blockers.push('Missing finite nonnegative unrounded Pinda/Naisargika term');
 if(amsaHarana?.resolved!==true)
  blockers.push('Common chart-specific condition/Chakrapada evidence is unresolved');
 if(gururodayaHarana?.resolved!==true)
  blockers.push(...(gururodayaHarana?.blockers||['Gururodaya Harana evidence is unresolved']));
 const sourceEnemySignLossFraction=amsaHarana?.enemySignLossFraction;
 const sourceCombustionLossFraction=amsaHarana?.combustionLossFraction;
 const explicitConditionHaranaFraction=amsaHarana?.conditionHaranaFraction;
 const conditionLossesCompete=finite(sourceEnemySignLossFraction)&&sourceEnemySignLossFraction>0&&
  finite(sourceCombustionLossFraction)&&sourceCombustionLossFraction>0;
 // Older internal callers may provide the two component fractions without the
 // explicit selected field. Infer only when at most one condition deduction is
 // nonzero; conflicting simultaneous deductions still fail closed.
 const selectedConditionHaranaFraction=finite(explicitConditionHaranaFraction)
  ?explicitConditionHaranaFraction
  :(finite(sourceEnemySignLossFraction)&&sourceEnemySignLossFraction>=0&&
    finite(sourceCombustionLossFraction)&&sourceCombustionLossFraction>=0&&!conditionLossesCompete
    ?sourceEnemySignLossFraction+sourceCombustionLossFraction:null);
 const fractions=[
  amsaHarana?.enemySignLossFraction,amsaHarana?.combustionLossFraction,
  amsaHarana?.chakrapadaLossFraction
 ];
 if(fractions.some(v=>!finite(v)||v<0||v>1))
  blockers.push('Missing verified condition/Chakrapada Harana fractions');
 if(!finite(selectedConditionHaranaFraction)||selectedConditionHaranaFraction<0||selectedConditionHaranaFraction>1)
  blockers.push('Missing the single source-precedence-selected condition Harana fraction');
 else if(finite(amsaHarana?.enemySignLossFraction)&&finite(amsaHarana?.combustionLossFraction)&&
  Math.abs(amsaHarana.enemySignLossFraction+amsaHarana.combustionLossFraction-selectedConditionHaranaFraction)>1e-9)
  blockers.push('Enemy-sign and combustion Harana evidence conflicts with the single selected condition deduction');
 if(blockers.length)return Object.freeze({
  planet,resolved:false,adjustedNazhigaiCandidate:null,
  traditionalUnitsCandidate:null,blockers,
  finalAyurdayaCertified:false,
  source:'C.G. Rajan Jathaka Kanitham I printed pp.231–234'
 });
 const conditionHaranaFraction=selectedConditionHaranaFraction;
 const chakrapadaHaranaFraction=amsaHarana.chakrapadaLossFraction;
 const conditionHaranaNazhigai=rawNazhigai*conditionHaranaFraction;
 const chakrapadaHaranaNazhigai=rawNazhigai*chakrapadaHaranaFraction;
 const gururodayaHaranaNazhigai=gururodayaHarana.targetPlanet===planet
  ?gururodayaHarana.lossNazhigai:0;
 const totalHaranaNazhigai=conditionHaranaNazhigai+
  chakrapadaHaranaNazhigai+gururodayaHaranaNazhigai;
 const adjustedNazhigaiCandidate=rawNazhigai-totalHaranaNazhigai;
 if(adjustedNazhigaiCandidate< -1e-7)return Object.freeze({
  planet,resolved:false,rawNazhigai,conditionHaranaFraction,
  chakrapadaHaranaFraction,conditionHaranaNazhigai,
  chakrapadaHaranaNazhigai,gururodayaHaranaNazhigai,totalHaranaNazhigai,
  adjustedNazhigaiCandidate:null,traditionalUnitsCandidate:null,
  blockers:['Source Harana deductions exceed the raw graha term; negative contribution is not assumed'],
  finalAyurdayaCertified:false,
  source:'C.G. Rajan Jathaka Kanitham I printed pp.231–234'
 });
 const adjusted=Math.max(0,adjustedNazhigaiCandidate);
 return Object.freeze({
  planet,resolved:true,rawNazhigai,
  enemySignLossFraction:amsaHarana.enemySignLossFraction,
  combustionLossFraction:amsaHarana.combustionLossFraction,
  conditionHaranaFraction,chakrapadaHaranaFraction,
  conditionHaranaNazhigai,chakrapadaHaranaNazhigai,
  gururodayaHaranaNazhigai,totalHaranaNazhigai,
  adjustedNazhigaiCandidate:adjusted,
  traditionalUnitsCandidate:units(Math.round(adjusted)),
  blockers:[],finalAyurdayaCertified:false,
  source:'C.G. Rajan Jathaka Kanitham I printed pp.231–234'
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
  exactPreRoundingNazhigai:nazhigaiExact,
  traditionalUnits:units(Math.round(nazhigaiExact)),
  researchOnly:true,independentBirthLongitudeCertified:false,
  totalHumanLifetime:null,deathAgeOrDate:null,
  source:'C. G. Rajan Jathaka Kanitham I printed pp.249–254'
 });
}
/** No birth-longitude recomputation: uses the already-produced chart
 * and never writes back into live Swiss graha, Shadbala or prediction.
 */
export function cgRajanCompareGrahas({planets=[],lagna}={}){
 if(!Array.isArray(planets))throw new TypeError('chart planets required');
 const native=cgRajanSevenNaturalResearch({planets});
 const gururodayaHarana=cgRajanGururodayaHaranaResearch({planets,lagna});
 const entries=names.map(name=>{
  const p=planets.find(x=>x.name===name);
  const pinda=cgRajanPindaGraha({planet:name,trueLongitude:p?.longitude});
  const natural=native.byPlanet[name];
  const amsa=cgRajanAmsaAyurdayaGraha({planet:name,trueLongitude:p?.longitude});
  const amsaHarana=cgRajanAmsaChartHarana({planet:name,amsa,planets});
  const pindaHarana=cgRajanPindaNaisargikaHaranaResearch({
   planet:name,rawNazhigai:pinda.exactPreRoundingNazhigai,
   amsaHarana,gururodayaHarana
  });
  const naturalHarana=cgRajanPindaNaisargikaHaranaResearch({
   planet:name,rawNazhigai:natural.exactPreRoundingNazhigai,
   amsaHarana,gururodayaHarana
  });
  return Object.freeze({name,english:SPEC[name].en,natural,pinda,amsa,amsaHarana,
   pindaHarana,naturalHarana});
 });
 const nadis=u=>traditionalNazhigai(u);
 const sumTerms=key=>entries.reduce((n,e)=>n+nadis(e[key]?.traditionalUnits),0);
 const rawPindaTotalNadis=sumTerms('pinda');
 const rawNaturalTotalNadis=sumTerms('natural');
 const rawAmsaTableATotalNadis=sumTerms('amsa');
 const allPindaHaranaResolved=entries.every(e=>e.pindaHarana?.resolved===true&&
  e.pindaHarana.traditionalUnitsCandidate);
 const allNaturalHaranaResolved=entries.every(e=>e.naturalHarana?.resolved===true&&
  e.naturalHarana.traditionalUnitsCandidate);
 const allAmsaHaranaResolved=entries.every(e=>e.amsaHarana?.resolved===true&&
  e.amsaHarana.traditionalUnitsCandidate);
 const pindaTotalNadis=allPindaHaranaResolved
  ?entries.reduce((n,e)=>n+nadis(e.pindaHarana.traditionalUnitsCandidate),0):null;
 const naturalTotalNadis=allNaturalHaranaResolved
  ?entries.reduce((n,e)=>n+nadis(e.naturalHarana.traditionalUnitsCandidate),0):null;
 const amsaTotalNadis=allAmsaHaranaResolved
  ?entries.reduce((n,e)=>n+nadis(e.amsaHarana.traditionalUnitsCandidate),0):null;
 const averageOfThree=allPindaHaranaResolved&&allNaturalHaranaResolved&&allAmsaHaranaResolved
  ?cgRajanMeanThreeTraditionalTotals({
    pindaTotalNazhigai:pindaTotalNadis,naturalTotalNazhigai:naturalTotalNadis,
    amsaTotalNazhigai:amsaTotalNadis
   }):null;
 const totals=Object.freeze({
  pinda:Object.freeze(allPindaHaranaResolved
   ?{traditionalUnits:units(pindaTotalNadis),totalNazhigai:pindaTotalNadis,available:true}
   :{traditionalUnits:null,totalNazhigai:null,available:false,
     blockedGrahas:entries.filter(e=>!e.pindaHarana?.resolved).map(e=>e.name)}),
  natural:Object.freeze(allNaturalHaranaResolved
   ?{traditionalUnits:units(naturalTotalNadis),totalNazhigai:naturalTotalNadis,available:true}
   :{traditionalUnits:null,totalNazhigai:null,available:false,
     blockedGrahas:entries.filter(e=>!e.naturalHarana?.resolved).map(e=>e.name)}),
  pindaRaw:Object.freeze({traditionalUnits:units(rawPindaTotalNadis),
   totalNazhigai:rawPindaTotalNadis,displayedAsFinal:false}),
  naturalRaw:Object.freeze({traditionalUnits:units(rawNaturalTotalNadis),
   totalNazhigai:rawNaturalTotalNadis,displayedAsFinal:false}),
  amsa:Object.freeze(allAmsaHaranaResolved
   ?{traditionalUnits:units(amsaTotalNadis),totalNazhigai:amsaTotalNadis,available:true}
   :{traditionalUnits:null,totalNazhigai:null,available:false,
     blockedGrahas:entries.filter(e=>!e.amsaHarana?.resolved).map(e=>e.name)}),
  amsaTableARaw:Object.freeze({traditionalUnits:units(rawAmsaTableATotalNadis),
   totalNazhigai:rawAmsaTableATotalNadis,displayedAsFinal:false}),
  averageOfThreeTotals:averageOfThree
 });
 return Object.freeze({entries,totals,
  averagingBasis:averageOfThree
   ?'Exact arithmetic mean of the three Harana-adjusted research candidate totals divided by three; method selection remains provisional'
   :'Withheld until all seven Pinda, Naisargika and post-Harana Amsa rows resolve; raw terms are not substituted',
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
/**
 * Select exactly one of Rajan's principal methods from the actual chart's
 * available sixfold Shadbala totals (Virupa). The Lagna lord is derived only
 * from the calculated Lagna longitude; no sign-label guessing is permitted.
 *
 * This selector reports the engine's current Shadbala basis and its
 * certification status separately. It never upgrades a provisional Shadbala
 * total or Ayurdaya candidate into a classical certification.
 */
const RAJAN_LAGNA_LORD_BY_SIGN = Object.freeze([
 'செவ்வாய்', 'சுக்கிரன்', 'புதன்', 'சந்திரன்', 'சூரியன்', 'புதன்',
 'சுக்கிரன்', 'செவ்வாய்', 'குரு', 'சனி', 'சனி', 'குரு'
]);
const RAJAN_METHOD_FOR_REFERENCE = Object.freeze({
 sun: 'pinda',
 moon: 'natural',
 lagnaLord: 'amsa'
});
export function cgRajanSelectAyurdayaMethod({planets=[],lagna}={}) {
 const unavailable = (reasonCode, reason) => Object.freeze({
  available:false, selectedMethod:null, referenceRole:null,
  referencePlanet:null, scoreVirupa:null, shadbalaBasisCertified:false,
  reasonCode, reason,
  source:'C.G. Rajan Jathaka Kanitham I, printed p.230; strength comparison uses chart strength6.totalVirupa'
 });
 if(!Array.isArray(planets)) {
  return unavailable('chart-unavailable','Chart graha data is unavailable.');
 }
 if(!finite(lagna?.longitude)) {
  return unavailable('lagna-unavailable','A finite calculated Lagna longitude is required to determine the Lagna lord.');
 }
 const lagnaSignIndex=Math.floor(norm(lagna.longitude)/30);
 const lagnaLordPlanet=RAJAN_LAGNA_LORD_BY_SIGN[lagnaSignIndex];
 const references=[
  {referenceRole:'sun',planet:'சூரியன்',method:RAJAN_METHOD_FOR_REFERENCE.sun},
  {referenceRole:'moon',planet:'சந்திரன்',method:RAJAN_METHOD_FOR_REFERENCE.moon},
  {referenceRole:'lagnaLord',planet:lagnaLordPlanet,method:RAJAN_METHOD_FOR_REFERENCE.lagnaLord}
 ];
 const candidates=references.map(reference=>{
  const row=planets.find(p=>p?.name===reference.planet);
  const shadbala=row?.strength6;
  const c=shadbala?.components;
  const sixfoldParts=c?[
   c.sthana?.total,c.dig,c.kala?.total,c.cheshta,c.naisargika,c.drik
  ]:[];
  const sixfoldSum=sixfoldParts.reduce((sum,value)=>sum+(finite(value)?value:0),0);
  const completeSixfold=sixfoldParts.length===6&&sixfoldParts.every(finite)&&
   finite(shadbala?.totalVirupa)&&Math.abs(sixfoldSum-shadbala.totalVirupa)<0.01;
  const available=shadbala?.available===true&&completeSixfold;
  return Object.freeze({
   ...reference,
   available,
   scoreVirupa:available?shadbala.totalVirupa:null,
   classicalCertified:available&&shadbala.classicalCertified===true
  });
 });
 const missing=candidates.filter(candidate=>!candidate.available);
 if(missing.length) {
  return Object.freeze({
   ...unavailable('shadbala-unavailable',
    'Computed Shadbala totals for Sun, Moon, and the Lagna lord are not all available.'),
   lagnaLordPlanet, lagnaSignIndex,
   missingReferences:missing.map(candidate=>candidate.referenceRole)
  });
 }
 const maximum=Math.max(...candidates.map(candidate=>candidate.scoreVirupa));
 const winners=candidates.filter(candidate=>Math.abs(candidate.scoreVirupa-maximum)<=1e-7);
 if(winners.length!==1) {
  return Object.freeze({
   ...unavailable('shadbala-tie',
    'The comparison has equal Shadbala strength; render every tied method separately instead of selecting one.'),
   lagnaLordPlanet, lagnaSignIndex,
   tiedReferences:winners.map(candidate=>candidate.referenceRole),
   tiedCandidates:Object.freeze(winners.map(candidate=>Object.freeze({...candidate}))),
   comparedCandidates:Object.freeze(candidates.map(candidate=>Object.freeze({...candidate}))),
   comparedCandidateCount:candidates.length
  });
 }
 const winner=winners[0];
 return Object.freeze({
  available:true,
  selectedMethod:winner.method,
  referenceRole:winner.referenceRole,
  referencePlanet:winner.planet,
  referencePlanetEnglish:SPEC[winner.planet]?.en||'',
  scoreVirupa:winner.scoreVirupa,
  lagnaLordPlanet,
  lagnaLordEnglish:SPEC[lagnaLordPlanet]?.en||'',
  lagnaSignIndex,
  shadbalaBasisCertified:candidates.every(candidate=>candidate.classicalCertified),
  methodSelectionAndReductionsVerified:false,
  source:'C.G. Rajan Jathaka Kanitham I, printed p.230; chart Shadbala strength6.totalVirupa'
 });
}

/**
 * Customer-visible single-method Ayurdaya arithmetic.
 * The chart's computed Shadbala selects one method; only that method's seven
 * graha terms and its seven-graha total are rendered. A tie, missing score,
 * or unresolved Harana does not silently substitute an average/raw total.
 * This remains a traditional calculation, never a medical lifespan estimate
 * or a death-age/date prediction.
 */
export function cgRajanAyurdayaReportHtml({planets,lagna,language='ta'}={}) {
 const ta=language==='ta';
 const selection=cgRajanSelectAyurdayaMethod({planets,lagna});
 const heading=ta?'ஆயுர்த்தாயக் கணக்கீடு':'Ayurdaya Calculation';
 const disclaimer=ta
  ?'இவை பாரம்பரிய ஆயுர்த்தாய முறையின் கணக்கீட்டு மதிப்பீடுகள் மட்டுமே; உண்மையான ஆயுளையோ மரண நேரத்தையோ உறுதியாகக் கூறுபவை அல்ல.'
  :'This is a traditional Ayurdaya calculation only; it does not establish actual lifespan or predict the time of death.';
 const unavailableText=selection.reasonCode==='shadbala-tie'
  ?(ta?'ஷட்பலத்தில் சமபலம் உள்ளது; ஒரே ஆயுர்த்தாய முறையைத் தேர்ந்தெடுக்க முடியவில்லை.':'Shadbala values are tied; one Ayurdaya method cannot be selected uniquely.')
  :selection.reasonCode==='lagna-unavailable'
   ?(ta?'கணக்கிடப்பட்ட லக்ன நீளம் கிடைக்கவில்லை; லக்னாதிபதியை நிர்ணயிக்க முடியாததால் ஆயுர்த்தாய முறை தேர்வு செய்யப்படவில்லை.':'The calculated Lagna longitude is unavailable, so the Lagna lord and Ayurdaya method cannot be determined.')
   :(ta?'சூரியன், சந்திரன், லக்னாதிபதி ஆகியோரின் ஷட்பல மொத்த மதிப்புகள் அனைத்தும் கிடைக்கவில்லை; ஆயுர்த்தாய முறை தேர்வு செய்யப்படவில்லை.':'All three comparison Shadbala totals are not available, so the Ayurdaya method was not selected.');
 if(!selection.available) {
  return '<section class="smv-cg-rajan-ayurdaya" data-smv-cg-rajan-ayurdaya="1" data-ayurdaya-selection="unavailable">' +
   '<h3>'+heading+'</h3><p class="small smv-ayurdaya-disclaimer">'+esc(disclaimer)+'</p>' +
   '<p class="small smv-ayurdaya-selection-unavailable">'+esc(unavailableText)+'</p></section>';
 }
 const research=cgRajanCompareGrahas({planets,lagna});
 const rawDisplay=(rawUnits,languageCode)=>{
  if(!rawUnits)return languageCode?'கணக்கீடு கிடைக்கவில்லை':'Calculation unavailable';
  return (languageCode?'மூல மதிப்பு: ':'Raw: ')+fmt({traditionalUnits:rawUnits},languageCode);
 };
 const amsaCell=v=>{
  if(v.amsaHarana?.resolved===true&&v.amsaHarana.traditionalUnitsCandidate) {
   const candidateUnits=v.amsaHarana.traditionalUnitsCandidate;
   const displayedUnits=fmt({traditionalUnits:candidateUnits},ta);
   const unitsTrace=ta?'ஹரணத்திற்குப் பின் அலகுகள்='+displayedUnits:'Post-Harana normalized units='+displayedUnits;
   const auditTitle=(ta
    ?'மூல அம்ச ஆண்டு='+v.amsa.rawAmsaYears+'; மொத்த ஹரணப் பின்னம்='+v.amsaHarana.totalHaranaFraction+'; பெருக்கிக்கு முன்='+v.amsaHarana.yearsBeforeMultiplier+'; பெருக்கி='+v.amsaHarana.multiplier+'; ஹரணத்திற்குப் பின்='+v.amsaHarana.adjustedAmsaYearsCandidate
    :'Raw Amsa years='+v.amsa.rawAmsaYears+'; total Harana fraction='+v.amsaHarana.totalHaranaFraction+'; before multiplier='+v.amsaHarana.yearsBeforeMultiplier+'; multiplier='+v.amsaHarana.multiplier+'; post-Harana years='+v.amsaHarana.adjustedAmsaYearsCandidate)+'; '+unitsTrace;
   return '<td data-amsa-harana="adjusted-candidate" data-raw-amsa-years="'+esc(v.amsa.rawAmsaYears)+'" data-total-harana-fraction="'+esc(v.amsaHarana.totalHaranaFraction)+'" data-multiplier="'+esc(v.amsaHarana.multiplier)+'" data-adjusted-amsa-years="'+esc(v.amsaHarana.adjustedAmsaYearsCandidate)+'" data-amsa-years="'+esc(candidateUnits.years)+'" data-amsa-months="'+esc(candidateUnits.months)+'" data-amsa-days="'+esc(candidateUnits.days)+'" data-amsa-nazhigai="'+esc(candidateUnits.nazhigai)+'" data-amsa-total-nazhigai="'+esc(traditionalNazhigai(candidateUnits))+'" title="'+esc(auditTitle)+'">'+esc(displayedUnits)+'</td>';
  }
  const rawUnits=v.amsa?.traditionalUnits;
  const explanation=(v.amsaHarana?.blockers||[]).join('; ')||'Amsa Harana adjustment is unresolved; showing the calculated raw Table-A term';
  return '<td data-amsa-harana="raw-unadjusted" data-raw-amsa-years="'+esc(v.amsa?.rawAmsaYears??'')+'" data-amsa-years="'+esc(rawUnits?.years??'')+'" data-amsa-months="'+esc(rawUnits?.months??'')+'" data-amsa-days="'+esc(rawUnits?.days??'')+'" data-amsa-nazhigai="'+esc(rawUnits?.nazhigai??'')+'" data-amsa-total-nazhigai="'+esc(rawUnits?traditionalNazhigai(rawUnits):'')+'" title="'+esc(explanation)+'">'+esc(rawDisplay(rawUnits,ta))+'</td>';
 };
 const commonCell=(method,v)=>{
  const result=v[method+'Harana'];
  if(result?.resolved===true&&result.traditionalUnitsCandidate) {
   const auditTitle=ta
    ?'மூல நாழிகை='+result.rawNazhigai+'; பகை ராசி ஹரணம்='+result.enemySignLossFraction+'; அஸ்தங்கத ஹரணம்='+result.combustionLossFraction+'; சக்கிரபாத ஹரணம்='+result.chakrapadaHaranaFraction+'; குரூரோதய ஹரணம்='+result.gururodayaHaranaNazhigai+'; மொத்தக் கழிவு='+result.totalHaranaNazhigai+'; கழித்த பின்='+result.adjustedNazhigaiCandidate
    :'Raw nazhigai='+result.rawNazhigai+'; enemy-sign loss fraction='+result.enemySignLossFraction+'; combustion loss fraction='+result.combustionLossFraction+'; Chakrapada loss fraction='+result.chakrapadaHaranaFraction+'; Gururodaya loss nazhigai='+result.gururodayaHaranaNazhigai+'; total Harana nazhigai='+result.totalHaranaNazhigai+'; adjusted nazhigai='+result.adjustedNazhigaiCandidate;
   return '<td data-'+method+'-harana="adjusted-candidate" data-raw-nazhigai="'+esc(result.rawNazhigai)+'" data-total-harana-nazhigai="'+esc(result.totalHaranaNazhigai)+'" data-adjusted-nazhigai="'+esc(result.adjustedNazhigaiCandidate)+'" title="'+esc(auditTitle)+'">'+esc(fmt({traditionalUnits:result.traditionalUnitsCandidate},ta))+'</td>';
  }
  const raw=v[method]?.traditionalUnits;
  const explanation=(result?.blockers||[]).join('; ')||'Harana adjustment is unresolved; showing the calculated raw graha term';
  return '<td data-'+method+'-harana="raw-unadjusted" data-raw-nazhigai="'+esc(v[method]?.exactPreRoundingNazhigai??'')+'" title="'+esc(explanation)+'">'+esc(rawDisplay(raw,ta))+'</td>';
 };
 const selectedMethod=selection.selectedMethod;
 const methodLabel={
  pinda:ta?'பிண்ட ஆயுள்':'Pinda Ayurdaya',
  natural:ta?'நைசர்க்கிக ஆயுள்':'Naisargika Ayurdaya',
  amsa:ta?'அம்ச ஆயுர்த்தாயம்':'Amsa Ayurdaya'
 }[selectedMethod];
 const referenceLabel=selection.referenceRole==='sun'
  ?(ta?'சூரியன்':'Sun')
  :selection.referenceRole==='moon'
   ?(ta?'சந்திரன்':'Moon')
   :(ta?'லக்னாதிபதி ('+selection.referencePlanet+')':'Lagna lord ('+selection.referencePlanetEnglish+')');
 const selectionLabel=(ta?'ஷட்பலத்தின் அடிப்படையில் தேர்வு: ':'Selected by chart Shadbala: ')+referenceLabel+
  ' ('+selection.scoreVirupa.toFixed(2)+' '+(ta?'விரூபம்':'Virupa')+') — '+methodLabel;
 const selectionLine='<p class="small smv-ayurdaya-method-selection" data-selected-ayurdaya-method="'+esc(selectedMethod)+'" data-selected-reference-role="'+esc(selection.referenceRole)+'" data-selected-reference-planet="'+esc(selection.referencePlanet)+'" data-selected-strength-virupa="'+esc(selection.scoreVirupa)+'">'+esc(selectionLabel)+'</p>';
 const tableRows=research.entries.map(v=>{
  const cell=selectedMethod==='amsa'?amsaCell(v):commonCell(selectedMethod,v);
  return '<tr><th scope="row">'+esc(ta?v.name:v.english)+'</th>'+cell+'</tr>';
 }).join('');
 const total=research.totals[selectedMethod];
 const rawTotal=selectedMethod==='pinda'?research.totals.pindaRaw:
  selectedMethod==='natural'?research.totals.naturalRaw:research.totals.amsaTableARaw;
 const adjustedTotalAvailable=total?.available===true&&!!total.traditionalUnits;
 let totalCell,totalLabel;
 if(adjustedTotalAvailable) {
  totalLabel=ta?'மொத்தம் (7 கிரகங்கள்)':'Total (7 grahas)';
  totalCell='<td data-selected-total="adjusted-candidate" data-selected-method="'+esc(selectedMethod)+'"><strong>'+esc(fmt(total,ta))+'</strong></td>';
 } else if(rawTotal?.traditionalUnits) {
  const blockedCount=Array.isArray(total?.blockedGrahas)?total.blockedGrahas.length:7;
  const note=ta
   ?'ஹரணத் திருத்தம் நிலுவையில் உள்ளது ('+blockedCount+' கிரகங்கள்); இது இறுதி ஆயுர்த்தாய மொத்தம் அல்ல.'
   :'Harana adjustments remain unresolved for '+blockedCount+' graha rows; this is not the final Ayurdaya total.';
  totalLabel=ta?'மூல மொத்தம் (7 கிரகங்கள்)':'Raw total (7 grahas)';
  totalCell='<td data-selected-total="raw-unadjusted" data-selected-method="'+esc(selectedMethod)+'" title="'+esc(note)+'"><strong>'+esc(fmt(rawTotal,ta))+'</strong><p class="small smv-ayurdaya-total-note">'+esc(note)+'</p></td>';
 } else {
  totalLabel=ta?'மொத்தம் கிடைக்கவில்லை':'Total unavailable';
  totalCell='<td data-selected-total="unavailable" data-selected-method="'+esc(selectedMethod)+'"><strong>'+esc(ta?'மூல மொத்தத்தையும் கணக்கிட முடியவில்லை':'Raw total could not be calculated')+'</strong></td>';
 }
 const totalLine='<tr class="smv-ayurdaya-totals"><th scope="row">'+totalLabel+'</th>'+totalCell+'</tr>';
 return '<section class="smv-cg-rajan-ayurdaya" data-smv-cg-rajan-ayurdaya="1" data-ayurdaya-selection="'+esc(selectedMethod)+'">' +
  '<h3>'+heading+'</h3><p class="small smv-ayurdaya-disclaimer">'+esc(disclaimer)+'</p>' +
  selectionLine+
  '<div class="adv-table-wrap smv-viii-table-scroll smv-ayurdaya-scroll"><table class="smv-ayurdaya-table"><thead><tr><th>'+(ta?'கிரகம்':'Planet')+'</th><th>'+esc(methodLabel)+'</th></tr></thead><tbody>'+
  tableRows+totalLine+'</tbody></table></div></section>';
}
