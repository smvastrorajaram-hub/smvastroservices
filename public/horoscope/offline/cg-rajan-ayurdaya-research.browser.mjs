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
 * Rajan pp.231 and 244: enemy sign loses one third; combustion loses
 * half, with the source's explicit Venus and Saturn exceptions.
 * Reduction PRIORITY is NOT independently verified, so the product is
 * illustrative research arithmetic only; not a final natal reduction.
 */
export function cgRajanConditionReductions({planet,enemySign=false,combust=false}={}){
 if(!PLANETS[planet])throw new RangeError('Seven grahas only');
 if(typeof enemySign!=='boolean'||typeof combust!=='boolean')
  throw new TypeError('Explicit Boolean condition indicators required');
 const combustionExempt=planet==='சுக்கிரன்'||planet==='சனி';
 const enemySignRemaining=enemySign?2/3:1;
 const combustionRemaining=combust&&!combustionExempt?1/2:1;
 return Object.freeze({planet,enemySignRemaining,combustionRemaining,
  combustionExempt,combinedResearchFraction:enemySignRemaining*combustionRemaining,
  priorityBetweenReductionsNotBookVerified:true,
  independentNatalFinalCertified:false,source:'CG Rajan I printed pp.231 and 244'});
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
