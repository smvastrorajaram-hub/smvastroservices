/**
 * Uttara Kalamrita, Khanda I Section III, Slokas 1–8.
 * Research-only Ayurdaya arithmetic. INACCESSIBLE from public customer
 * Horoscope/Matching reports and NOT an individual lifespan forecast.
 *
 * Source: V. Subrahmanya Sastri, Uttara Kalamrita (1939), PDF pp 13–15.
 * https://indian-vedic-astrology.com/classic/uttara%20kalamritam.pdf
 *
 * The preceding Section II Shadbala is not fully independently certified.
 * Never assert that the natal Ayurdaya estimate is independently proven,
 * and NEVER infer an age at death from one uncalibrated formula.
 */
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const norm=n=>((n%360)+360)%360;
const STAR=360/27,PADA=STAR/4;
const RADIX=60;
const REASON=Object.freeze({
 0:'12th',1:'11th',2:'10th',3:'9th',4:'8th',5:'7th'
});
function requireFinite(value,name){if(!finite(value))throw new TypeError(name+' must be finite');}
function validateGhati(value,name){requireFinite(value,name);if(value<0)throw new RangeError(name+' nonnegative');}
function validatedRange(value,name,min,max){requireFinite(value,name);if(value<min||value>max)throw new RangeError(name+' out of range');}
/** Section III.1: INTEGER years are completed Nakshatras mod 3 ×4 plus
 * completed Padas of the current star, NOT an arbitrary 0..108 count.
 * Fractional year requires actual INGRESS/EGRESS TIMES of the pada and
 * is intentionally null until supplied. */
export function uttaraAmsaAyurdayaPosition(longitude){
 requireFinite(longitude,'sidereal longitude');
 const x=norm(longitude);
 const completedNakshatras=Math.min(26,Math.floor(x/STAR));
 const along=x-completedNakshatras*STAR;
 const completedPadas=Math.min(3,Math.floor(along/PADA));
 const integerYears=(completedNakshatras%3)*4+completedPadas;
 return Object.freeze({
  completedNakshatras,completedPadas,integerYears,
  progressAngleWithinPadaDegrees:along-completedPadas*PADA,
  fractionOfYearByActualTransit:null,
  source:'Uttara Kalamrita Section III sloka 1',
  astronomicalTransitValidated:false,
  certifiedContributionYears:null,
  finalNativeLifespanYears:null
 });
}
/** Section III.1 exact temporal ratio when a source supplies BOTH exact
 * entry and exit instants. A pure geometric longitude fraction is NOT
 * silently substituted for actual ephemeris timing. */
export function uttaraAmsaTimeFraction({enteredMs,birthMs,exitedMs}={}){
 if(![enteredMs,birthMs,exitedMs].every(finite))
  throw new TypeError('Three documented ephemeris UTC millisecond instants required');
 if(!(enteredMs<exitedMs&&birthMs>=enteredMs&&birthMs<exitedMs))
  throw new RangeError('Birth instant must fall within the actual Pada traversal interval');
 return Object.freeze({
  fraction:(birthMs-enteredMs)/(exitedMs-enteredMs),
  spanMs:exitedMs-enteredMs,
  elapsedMs:birthMs-enteredMs,
  eventSourceCertified:false,
  contributionStillResearchOnly:true
 });
}
/** Sloka III.1 published Venus worked example in Karka ghati / vighati.
 * This helper takes the already counted 24-hour civil-day difference. */
export function uttaraAmsaGhatikaRatio({elapsedDays,elapsedGhati,elapsedVighati,
  totalDays,totalGhati,totalVighati}={}){
 for(const [v,n] of [
  [elapsedDays,'elapsedDays'],[elapsedGhati,'elapsedGhati'],[elapsedVighati,'elapsedVighati'],
  [totalDays,'totalDays'],[totalGhati,'totalGhati'],[totalVighati,'totalVighati']
 ])validatedRange(v,n,0,n.includes('Days')?200:n.includes('Vighati')?59:59);
 const elapsed=elapsedDays*RADIX+elapsedGhati+elapsedVighati/RADIX;
 const total=totalDays*RADIX+totalGhati+totalVighati/RADIX;
 if(!(total>0&&elapsed>=0&&elapsed<total))
  throw new RangeError('Elapsed ghati time must be within full Pada span');
 return Object.freeze({elapsedGhati:elapsed,spanGhati:total,
  fraction:elapsed/total,exampleArithmeticOnly:true});
}
/** Section III.2 six descending houses from 12th to 7th.
 * A benefic reduces HALF what a malefic at the same location would.
 * This is a factor on ONE graha's textbook Amsa contribution, not
 * the birth chart's years of life. */
export function uttaraAyurdayaHouseFraction({house,benefic}={}){
 if(!Number.isInteger(house)||house<1||house>12)
  throw new RangeError('house 1..12 required');
 if(typeof benefic!=='boolean')
  throw new TypeError('Explicit benefic classification required');
 const i=12-house;
 if(i<0||i>5)return Object.freeze({
  house,benefic,lossFraction:0,remainingFraction:1,source:'UK III.2'});
 const lossFraction=(benefic?.5:1)/(i+1);
 return Object.freeze({house,benefic,lossFraction,remainingFraction:1-lossFraction,
  formula:'12th, 11th, 10th, 9th, 8th, 7th: full, half, third, fourth, fifth, sixth',
  source:'UK III.2'});
}
/** UK III.2 ordered, explicit user/source-supplied book modifiers.
 * Never auto-diagnose eclipse or war results from an unverifiable chart.
 * Ascendant loss is a different separate Lagna term. */
export function uttaraAyurdayaBookReductions({
 fractionalAmsaYears,house,benefic,atDebilitation=false,
 inEnemySign=false,eclipsedOrWarDefeated=false
}={}){
 validatedRange(fractionalAmsaYears,'fractionalAmsaYears',0,12);
 const flags=[atDebilitation,inEnemySign,eclipsedOrWarDefeated];
 if(flags.some(x=>typeof x!=='boolean'))throw new TypeError('UK book status flags must be booleans');
 const positional=uttaraAyurdayaHouseFraction({house,benefic});
 const conditions=[
  {type:'house',fraction:positional.remainingFraction},
  {type:'debilitation',fraction:atDebilitation?.5:1},
  {type:'enemy-sign',fraction:inEnemySign?2/3:1},
  {type:'eclipse-or-war-defeat',fraction:eclipsedOrWarDefeated?.5:1}
 ];
 const finalFraction=conditions.reduce((a,c)=>a*c.fraction,1);
 return Object.freeze({
  startingResearchAmsaYears:fractionalAmsaYears,conditions,
  remainingFraction:finalFraction,
  provisionalContributionYears:fractionalAmsaYears*finalFraction,
  completeUKAyurdayaCertified:false,certifiedIndividualLifespanYears:null,
  source:'UK III.2'
 });
}
/** Section III.3 Lagna fraction: (ghatis elapsed / full sign ghatis) ×9.
 * Birth sign rising interval must be independently determined. */
export function uttaraAyurdayaLagnaFromGhati({
 elapsedGhatikas,risingPeriodGhatikas,astrologicalSourceVerified=false
}={}){
 validateGhati(elapsedGhatikas,'elapsedGhatikas');
 validateGhati(risingPeriodGhatikas,'risingPeriodGhatikas');
 if(risingPeriodGhatikas===0||elapsedGhatikas>risingPeriodGhatikas)
  throw new RangeError('Lagna rise period must be positive and contain elapsed ghatis');
 return Object.freeze({
  bookResearchYears:9*elapsedGhatikas/risingPeriodGhatikas,
  inputRiseIntervalCertified:astrologicalSourceVerified,
  alternativeStrongLagnaRuleApplied:false,
  natalAyurdayaCertified:false,
  source:'UK III.3'
 });
}
/** Section III.4–5 Punya/Papa arithmetic for THREE Drekkana rulers,
 * subject to independently validated UK Saptavargaja source. */
export function uttaraAyurdayaThreeDrekkanaPunyaPapa(
  {ukSaptavargajaRupas,independentShadbalaVerified=false}={}
){
 if(!Array.isArray(ukSaptavargajaRupas)||ukSaptavargajaRupas.length!==3||
    !ukSaptavargajaRupas.every(v=>finite(v)&&v>=0))
  throw new RangeError('Exactly three nonnegative UK Saptavargaja Rupa strengths needed');
 const sum=ukSaptavargajaRupas.reduce((a,b)=>a+b,0);
 const punyaRupa=sum/4,papaRupa=4-punyaRupa;
 const formalCycleYears=papaRupa*120/7;
 const boundedCycleYears=((formalCycleYears%120)+120)%120;
 return Object.freeze({
  threeDrekkanaSaptavargajaRupas:[...ukSaptavargajaRupas],
  punyaRupa,papaRupa,formalCycleYears,boundedCycleYears,
  bookArithmeticVerified:true,
  independentlyCertifiedUkShadbala:!!independentShadbalaVerified,
  finalHumanLifespanYears:null,
  notAnAgeAtDeath:true,
  source:'UK III.4–5'
 });
}
/** Produces research-only per-body POSITION intermediate, never a native
 * longevity result. Section II must be separately source certified before
 * any Section III candidate can move towards release. */
export function uttaraAyurdayaResearchChart({planets,lagnaLongitude,
 certifiedUttaraShadbala=false}={}){
 if(!Array.isArray(planets)||!finite(lagnaLongitude))
  throw new TypeError('natal bodies and Lagna longitude required');
 const sevenNames=['சூரியன்','சந்திரன்','செவ்வாய்','புதன்','குரு','சுக்கிரன்','சனி'];
 const seven={};
 for(const name of sevenNames){
  const p=planets.find(x=>x.name===name);
  if(!p||!finite(p.longitude))throw new TypeError('missing '+name+' natal longitude');
  seven[name]=uttaraAmsaAyurdayaPosition(p.longitude);
 }
 const lagna=uttaraAmsaAyurdayaPosition(lagnaLongitude);
 return Object.freeze({
  basis:'Uttara Kalamrita Section III (research)',
  seven,lagna,
  UKShadbalaInputCertified:certifiedUttaraShadbala===true,
  publishedToCustomers:false,
  natalLongevityCertified:false,completeAyurdayaCertified:false,
  personPredictedLifespan:null,deathTimingPrediction:null
 });
}
