/**
 * BPHS Vol II, Santhanam, Chapters 67-69, PDF pp. 381-390.
 * Exact-purpose offline calculation utilities: no predictions or UI changes.
 * WARNING: Experimental independent numeric channel; not yet connected to
 * Horoscope/Matching results or the existing (non-classical) sodhyaPinda().
 *
 * Sign indices 0..11: Aries ... Pisces. The 7 classical Grahas are used for
 * Graha Pinda. Occupancy for Ekadhipatya may include Rahu/Ketu, while Pinda
 * must exclude those nodes (BPHS II Ch.69 example).
 *
 * Ch.68 English prose rule (1) has ambiguous wording; the worked
 * illustration shows results inconsistent with rule (1) for empty sign pairs.
 * This implementation deliberately follows the LITERAL BPHS Chapter 68
 * prose rule, and exposes the printed-illustration mismatch in tests.
 * No attempt is made to assert those mutually incompatible data as PASS.
 */
export const RASI_MULTIPLIERS=Object.freeze([7,10,8,4,10,6,7,8,9,5,11,12]);
export const GRAHA_MULTIPLIERS=Object.freeze({
 'சூரியன்':5,'சந்திரன்':5,'செவ்வாய்':8,'புதன்':5,
 'குரு':10,'சுக்கிரன்':7,'சனி':5
});
const OWNED_PAIRS=Object.freeze([[0,7],[1,6],[2,5],[8,11],[9,10]]);
function row(value,where){
 if(!Array.isArray(value)||value.length!==12||
    !value.every(x=>Number.isSafeInteger(x)&&x>=0&&x<=8)){
  throw new RangeError(where+' requires 12 integer BAV points within 0..8');
 }
 return [...value];
}
function signs(value){
 const inputs=Array.isArray(value)?value:Array.from(value??[]);
 const set=new Set(inputs.map(x=>Number(x)));
 if(set.size!==inputs.length||[...set].some(x=>!Number.isInteger(x)||x<0||x>11)){
  throw new RangeError('occupiedSigns must have unique indices in 0..11');
 }
 return set;
}
export function trikonaShodhana(binduRow){
 const out=row(binduRow,'trikonaShodhana');
 const reductions=[];
 for(let start=0;start<4;start++){
  const group=[start,start+4,start+8];
  const before=group.map(i=>out[i]);
  const least=Math.min(...before);
  // BPHS II Ch.67: if any member is zero, leave this trine unchanged.
  // When all are nonzero, subtract its minimum from all three.
  if(least!==0) for(const i of group) out[i]-=least;
  reductions.push({signs:group,before,subtracted:least,after:group.map(i=>out[i])});
 }
 return {values:out,trace:reductions};
}
export function ekadhipatyaShodhana(trikonaRow,occupiedSigns){
 const out=row(trikonaRow,'ekadhipatyaShodhana');
 const occupied=signs(occupiedSigns);
 const trace=[];
 for(const [a,b] of OWNED_PAIRS){
  const before=[out[a],out[b]],occA=occupied.has(a),occB=occupied.has(b);
  let rule='unchanged';
  // Only dual sign owners (Mars, Venus, Mercury, Jupiter and Saturn).
  // Leave either-zero cases and both-occupied cases unchanged.
  if(out[a]>0&&out[b]>0&&! (occA&&occB)){
   if(!occA&&!occB){
    // Santhanam BPHS II Chapter 68, rule (1), LITERAL PROSE:
    // unequal non-zero unoccupied signs BOTH receive the lesser count.
    // Equal numbers are both zeroed (rule 5).
    // The printed example contradicts this rule for Taurus/Libra and
    // Sagittarius/Pisces. Never silently present it as reconciled.
    const least=Math.min(out[a],out[b]);
    if(out[a]===out[b]){out[a]=0;out[b]=0;rule='both-empty-equal-zero';}
    else {out[a]=least;out[b]=least;rule='both-empty-book-prose-minimum';}
   }else{
    const inhabited=occA?a:b,empty=occA?b:a;
    out[empty]=out[empty]>out[inhabited]?out[empty]-out[inhabited]:0;
    rule='one-occupied-reduce-empty';
   }
  }
  trace.push({signs:[a,b],before,occupancy:[occA,occB],after:[out[a],out[b]],rule});
 }
 return {values:out,trace};
}
export function pindaSadhana(ekadhipatyaRow,grahaSigns){
 const rowValues=row(ekadhipatyaRow,'pindaSadhana');
 if(!grahaSigns||typeof grahaSigns!=='object'||Array.isArray(grahaSigns))throw new TypeError('grahaSigns requires planet->rasi index object');
 for(const [p,s] of Object.entries(grahaSigns)){
  if(!(p in GRAHA_MULTIPLIERS)&&p!=='ராகு'&&p!=='கேது')throw new RangeError('unknown graha '+p);
  if(!Number.isInteger(s)||s<0||s>11)throw new RangeError('invalid sign for '+p);
 }
 const signsPinda=rowValues.map((v,i)=>v*RASI_MULTIPLIERS[i]);
 const rasiPinda=signsPinda.reduce((a,b)=>a+b,0);
 const grahaEntries=Object.entries(GRAHA_MULTIPLIERS).filter(([name])=>name in grahaSigns).map(([name,multiple])=>({
  planet:name,sign:grahaSigns[name],rekhas:rowValues[grahaSigns[name]],
  multiplier:multiple,product:rowValues[grahaSigns[name]]*multiple
 }));
 const grahaPinda=grahaEntries.reduce((a,r)=>a+r.product,0);
 return {rasiPinda,grahaPinda,yogaPinda:rasiPinda+grahaPinda,signProducts:signsPinda,grahaProducts:grahaEntries,method:'BPHS II Ch. 69; reduced per-planet BAV; non-nodal Graha Pinda'};
}
export function classicalShodhana(binduRow,occupiedSigns,grahaSigns){
 const trikona=trikonaShodhana(binduRow);
 const ekadhipatya=ekadhipatyaShodhana(trikona.values,occupiedSigns);
 return {trikona,ekadhipatya,pinda:pindaSadhana(ekadhipatya.values,grahaSigns),
  certified:false,ruleConvention:'Santhanam BPHS II Chapter 68 literal prose (not contradictory illustration)',
  note:'Numeric reduction follows explicit Ch.68 prose. Printed illustration and its planetary occupancy conflict with it; not connected to reports or fully certified'};
}
