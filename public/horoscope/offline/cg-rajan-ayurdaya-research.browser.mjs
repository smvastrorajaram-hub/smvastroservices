/**
 * C. G. Rajan, Jathaka Kanitham I, printed pp. 230–244,
 * user-supplied original scan PDF pp. 252–266.
 * Research-only calculation. NEVER turn this into a life expectancy,
 * death-age forecast or customer report. Uttara III remains independent.
 */
const PLANETS=Object.freeze({
 'சூரியன்':Object.freeze({exaltation:10,maximumNaturalYears:20}),
 'சந்திரன்':Object.freeze({exaltation:33,maximumNaturalYears:1}),
 'செவ்வாய்':Object.freeze({exaltation:298,maximumNaturalYears:2}),
 'புதன்':Object.freeze({exaltation:165,maximumNaturalYears:9}),
 'குரு':Object.freeze({exaltation:95,maximumNaturalYears:18}),
 'சுக்கிரன்':Object.freeze({exaltation:357,maximumNaturalYears:20}),
 'சனி':Object.freeze({exaltation:200,maximumNaturalYears:50})
});
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const norm=x=>((x%360)+360)%360;
const NADIS_PER_DAY=60,DAYS_PER_MONTH=30,MONTHS_PER_YEAR=12;
const NADIS_PER_YEAR=NADIS_PER_DAY*DAYS_PER_MONTH*MONTHS_PER_YEAR;
export const CG_RAJAN_NAISARGIKA_MAXIMUM_YEARS=Object.freeze(Object.fromEntries(
 Object.entries(PLANETS).map(([k,v])=>[k,v.maximumNaturalYears])));
/**
 * Rajan pp.242–243: retain the major exaltation-to-true arc (180..360°).
 * Sun printed: 370°00′ - 167°02′ = 202°58′.
 * Jupiter printed: 360°00′ - (95°00′ - 28°17′) = 293°17′.
 * At exaltation the arc is 360 (full nominal quota), at debilitation
 * 180 (half quota). The table uses 12 months/year, 30 days/month,
 * 60 nazhigai/day; round ONLY the final nazhigai.
 */
export function cgRajanNaturalAyurdayaGraha({planet,trueLongitude}={}){
 const d=PLANETS[planet];
 if(!d)throw new RangeError('Seven traditional grahas only');
 if(!finite(trueLongitude))throw new TypeError('True sidereal longitude required');
 const raw=norm(d.exaltation-norm(trueLongitude));
 const remainingArc=raw<180?360-raw:raw;
 const totalNadisFloat=remainingArc/360*d.maximumNaturalYears*NADIS_PER_YEAR;
 const totalNadis=Math.round(totalNadisFloat);
 let rem=totalNadis;
 const years=Math.floor(rem/NADIS_PER_YEAR);rem%=NADIS_PER_YEAR;
 const months=Math.floor(rem/(DAYS_PER_MONTH*NADIS_PER_DAY));rem%=DAYS_PER_MONTH*NADIS_PER_DAY;
 const days=Math.floor(rem/NADIS_PER_DAY);rem%=NADIS_PER_DAY;
 return Object.freeze({
  planet,exaltationLongitude:d.exaltation,trueLongitude:norm(trueLongitude),
  remainingArcDegrees:remainingArc,maximumNaturalYears:d.maximumNaturalYears,
  theoreticalNaturalYearComponent:remainingArc/360*d.maximumNaturalYears,
  traditionalUnits:Object.freeze({years,months,days,nazhigai:rem}),
  exactPreRoundingNazhigai:totalNadisFloat,
  source:'CG Rajan Jathaka Kanitham I printed pp.242–243',
  researchOnly:true,individualLifespanCertified:false,
  natalTotalYears:null,predictedDeathAge:null
 });
}
/**
 * Rajan pp.231–232 Chakrapada house losses. Malefics, houses 12..7:
 * 1, 1/2, 1/3, 1/4, 1/5, 1/6. Benefics lose half those fractions.
 * For multiple occupants the printed rule requires selecting the
 * strongest relevant graha; THIS helper does not guess that winner.
 */
export function cgRajanChakrapadaHouseFraction({house,benefic}={}){
 if(!Number.isInteger(house)||house<1||house>12)throw new RangeError('house 1..12 required');
 if(typeof benefic!=='boolean')throw new TypeError('explicit benefic classification required');
 if(house<7)return Object.freeze({house,benefic,lossFraction:0,
  remainingFraction:1,multiOccupantPriorityVerified:false});
 const denominator=13-house;
 const lossFraction=(benefic?0.5:1)/denominator;
 return Object.freeze({house,benefic,lossFraction,remainingFraction:1-lossFraction,
  multiOccupantPriorityVerified:false,source:'CG Rajan I printed pp.231–232'});
}
/**
 * Rajan pp.231–232 and 244: enemy-sign Harana is one third; applicable
 * combustion Harana is one half, EXCEPT Venus and Saturn. When both enemy
 * sign and combustion Harana apply, p.231 explicitly chooses combustion
 * Harana alone rather than adding both. The p.244 combustion thresholds
 * classify the state; they do not cancel the p.231 Venus/Saturn exception.
 */
/**
 * C.G. Rajan I printed p.244: combustion limits measured from the Sun.
 * Mercury and Venus have different direct/retrograde limits. An exact
 * threshold is unresolved because the scan does not establish equality.
 */
const COMBUSTION_LIMITS=Object.freeze({
 'சூரியன்':null,'சந்திரன்':12,'செவ்வாய்':17,
 'புதன்':Object.freeze({direct:14,retrograde:12}),
 'குரு':11,'சுக்கிரன்':Object.freeze({direct:10,retrograde:8}),'சனி':15
});
const COMBUSTION_HARANA_EXEMPTIONS=new Set(['சுக்கிரன்','சனி']);
export function cgRajanCombustionLimitDegrees({planet,retrograde}={}){
 if(!Object.prototype.hasOwnProperty.call(PLANETS,planet))
  throw new RangeError('Seven traditional grahas only');
 const entry=COMBUSTION_LIMITS[planet];
 if(entry===null)return Object.freeze({planet,applicable:false,resolved:true,limitDegrees:null,
  source:'CG Rajan Jathaka Kanitham I printed p.244'});
 if(typeof entry==='number')return Object.freeze({planet,applicable:true,resolved:true,
  limitDegrees:entry,retrogradeRelevant:false,source:'CG Rajan Jathaka Kanitham I printed p.244'});
 if(typeof retrograde!=='boolean')return Object.freeze({planet,applicable:true,resolved:false,
  limitDegrees:null,retrogradeRelevant:true,
  reason:'Direct/retrograde state required by the printed threshold',
  source:'CG Rajan Jathaka Kanitham I printed p.244'});
 return Object.freeze({planet,applicable:true,resolved:true,
  limitDegrees:entry[retrograde?'retrograde':'direct'],retrograde,retrogradeRelevant:true,
  source:'CG Rajan Jathaka Kanitham I printed p.244'});
}
/** Combustion is measured by minimum angular separation from the Sun. */
export function cgRajanCombustionHaranaStatus({planet,trueLongitude,sunLongitude,retrograde}={}){
 if(!Object.prototype.hasOwnProperty.call(PLANETS,planet))
  throw new RangeError('Seven traditional grahas only');
 if(!finite(trueLongitude)||!finite(sunLongitude))
  throw new TypeError('Finite sidereal graha and Sun longitudes required');
 const limit=cgRajanCombustionLimitDegrees({planet,retrograde});
 const delta=norm(norm(trueLongitude)-norm(sunLongitude));
 const distanceDegrees=Math.min(delta,360-delta);
 if(!limit.applicable)return Object.freeze({planet,distanceDegrees,combust:false,resolved:true,
  combustionHaranaFraction:0,combustionHaranaExempt:false,limitDegrees:null,source:limit.source});
 if(!limit.resolved)return Object.freeze({planet,distanceDegrees,combust:null,resolved:false,
  combustionHaranaFraction:null,
  combustionHaranaExempt:COMBUSTION_HARANA_EXEMPTIONS.has(planet),
  limitDegrees:null,reason:limit.reason,source:limit.source});
 if(Math.abs(distanceDegrees-limit.limitDegrees)<1e-8)
  return Object.freeze({planet,distanceDegrees,combust:null,resolved:false,
   combustionHaranaFraction:null,
   combustionHaranaExempt:COMBUSTION_HARANA_EXEMPTIONS.has(planet),
   limitDegrees:limit.limitDegrees,
   reason:'Exact combustion threshold: source equality convention not independently verified',
   source:limit.source});
 const combust=distanceDegrees<limit.limitDegrees;
 const combustionHaranaExempt=COMBUSTION_HARANA_EXEMPTIONS.has(planet);
 return Object.freeze({planet,distanceDegrees,combust,resolved:true,
  combustionHaranaFraction:combust&&!combustionHaranaExempt?1/2:0,
  combustionHaranaExempt,limitDegrees:limit.limitDegrees,source:limit.source});
}
/**
 * Rajan p.231 gives explicit precedence: if both enemy-sign and combustion
 * Harana apply, choose only the larger combustion loss (1/2), not 1/3 + 1/2.
 * The same page exempts Venus and Saturn from combustion Harana even though
 * p.244 supplies their distances for identifying combustion. Thus an enemy
 * sign still incurs 1/3 for Venus/Saturn when no combustion Harana is allowed.
 * Amsa p.235 then adds this one selected condition deduction to Chakrapada's
 * separate deduction; it does not multiply the remaining fractions.
 */
export function cgRajanConditionReductions({planet,enemySign,combust}={}){
 if(!Object.prototype.hasOwnProperty.call(PLANETS,planet))
  throw new RangeError('Seven grahas only');
 if(typeof enemySign!=='boolean'||typeof combust!=='boolean')
  throw new TypeError('Explicit, verified enemySign and combust Boolean evidence required');
 const combustionHaranaExempt=COMBUSTION_HARANA_EXEMPTIONS.has(planet);
 const combustionHaranaApplied=combust&&!combustionHaranaExempt;
 const enemySignLossFraction=enemySign&&!combustionHaranaApplied?1/3:0;
 const combustionLossFraction=combustionHaranaApplied?1/2:0;
 const conditionHaranaFraction=combustionLossFraction||enemySignLossFraction;
 const selectedConditionHarana=combustionHaranaApplied?'combustion':
  (enemySignLossFraction?'enemy-sign':'none');
 return Object.freeze({planet,enemySign,combust,
  combustionHaranaExempt,combustionHaranaApplied,selectedConditionHarana,
  enemySignLossFraction,combustionLossFraction,conditionHaranaFraction,
  remainingFractionCandidate:1-conditionHaranaFraction,
  combinedResearchFraction:1-conditionHaranaFraction,
  independentNatalFinalCertified:false,
  source:'CG Rajan Jathaka Kanitham I printed pp.231–232, 235, 244'});
}
/** Seven per-planet contributions, NOT their sum or a lifespan. */
export function cgRajanSevenNaturalResearch({planets=[]}={}){
 if(!Array.isArray(planets))throw new TypeError('planets must be an array');
 const byPlanet={};
 for(const name of Object.keys(PLANETS)){
  const p=planets.find(x=>x.name===name);
  if(!p||!finite(p.longitude))throw new TypeError('Missing natal '+name+' longitude');
  byPlanet[name]=cgRajanNaturalAyurdayaGraha({planet:name,trueLongitude:p.longitude});
 }
 return Object.freeze({source:'CG Rajan I, research-only natural components',
  byPlanet,grahaCount:7,fullAyurdayaCertified:false,
  natalTotalYears:null,predictedDeathAge:null,
  publishedToCustomers:false,otherAyurdayaSystemsCombined:false});
}

/**
 * Research-only arithmetic for Rajan's printed p.248 eight rows
 * (seven planets + Lagna). This is NOT the selection/reduction method,
 * because p.248's printed sum does not include the Sun's shown 0y9m row.
 * All individual rows must be sourced/verified before drawing any outcome.
 */
export function cgRajanSumTraditionalRows({rows=[]}={}){
 if(!Array.isArray(rows)||rows.length===0||rows.length>8)
  throw new RangeError('1..8 documented rows required');
 let sum=0;
 for(const x of rows){
  if(!x||!['years','months','days','nazhigai'].every(k=>
   Number.isSafeInteger(x[k])&&x[k]>=0))
   throw new TypeError('Four nonnegative integer traditional-unit entries required');
  if(x.months>=12||x.days>=30||x.nazhigai>=60)
   throw new RangeError('Normalize each row into 12 months, 30 days, 60 nazhigai');
  sum+=x.years*NADIS_PER_YEAR+x.months*DAYS_PER_MONTH*NADIS_PER_DAY+
       x.days*NADIS_PER_DAY+x.nazhigai;
  if(!Number.isSafeInteger(sum))throw new RangeError('Sum outside safe integer range');
 }
 let rem=sum;
 const years=Math.floor(rem/NADIS_PER_YEAR);rem%=NADIS_PER_YEAR;
 const months=Math.floor(rem/(DAYS_PER_MONTH*NADIS_PER_DAY));rem%=DAYS_PER_MONTH*NADIS_PER_DAY;
 const days=Math.floor(rem/NADIS_PER_DAY);rem%=NADIS_PER_DAY;
 return Object.freeze({source:'CG Rajan I printed p.248 (research arithmetic)',
  traditionalUnits:Object.freeze({years,months,days,nazhigai:rem}),
  printedFullTableReconciliationVerified:false,
  finalHumanLifespanYears:null,predictedDeathAge:null});
}
