/**
 * BPHS Vol 1, R. Santhanam, Chapter 27 Shadbala arithmetic.
 *
 * User source priority: BPHS is authoritative where explicit. Uttara
 * Kalamrita Chapter II p.41 is consulted ONLY for determining the northern
 * Graha Yuddha victor and the <=1 degree / same-bhava criterion: BPHS Ch27
 * v20 states the war MAGNITUDE as the difference of the two Shadbalas.
 *
 * Crucially: V361's Uttara Kalamrita p45 fixed +/-1-Rupa correction is NOT
 * interchangeable with BPHS v20, so it must never be added to the live
 * BPHS-phase3 strength calculation.
 */
export const BPHS_GRAHA_YUDDHA_REFERENCE='BPHS I (Santhanam), Chapter 27, sloka 20, printed p.284';
export const BPHS_DRIG_REFERENCE='BPHS I (Santhanam), Chapter 27, sloka 19, printed p.284';
const finite=x=>typeof x==='number'&&Number.isFinite(x);

/**
 * BPHS Ch27 v19: net Drig Bala gets one-fourth of the signed Drishti
 * Pinda, with the FULL measured Mercury/Jupiter aspect superadded.
 * Input is source-independent geometric aspect strengths (0..60).
 * Keep angular geometry separate from the BPHS signed aggregation.
 * For an afflicted Mercury, use its adverse sign consistently.
 */
export function bphsDrigBalaFromAspects(aspects){
  if(!Array.isArray(aspects))throw new TypeError('aspects must be an array');
  let signedPinda=0,mercuryJupiterFull=0;
  const trace=[];
  for(const x of aspects){
    if(!x||typeof x.name!=='string'||!finite(x.virupa)||x.virupa<0||x.virupa>60||typeof x.benefic!=='boolean')
      throw new RangeError('Each aspect needs name, strength 0..60 and benefic boolean');
    const sign=x.benefic?1:-1;
    signedPinda+=sign*x.virupa;
    const special=x.name==='குரு'||x.name==='புதன்';
    if(special)mercuryJupiterFull+=sign*x.virupa;
    trace.push({name:x.name,virupa:x.virupa,benefic:x.benefic,special});
  }
  return {virupa:signedPinda/4+mercuryJupiterFull,quarterPinda:signedPinda/4,
    mercuryJupiterFull,trace,reference:BPHS_DRIG_REFERENCE};
}

/**
 * BPHS Ch27 v20: apply the pre-war Shadbala difference (not a fixed 60).
 * The supplied encounters are unambiguous war pairs determined from the
 * explicitly reported UK p41 latitude and distance evidence. Compute all
 * differences from the SAME pre-war totals; do not apply recursively.
 */
export function bphsGrahaYuddhaFromBaselines(encounters,baselineByPlanet){
  if(!Array.isArray(encounters)||!baselineByPlanet||typeof baselineByPlanet!=='object')
    throw new TypeError('encounters and pre-war Shadbala mapping required');
  const virupaByPlanet={},trace=[],used=new Set();
  for(const pair of encounters){
    const winner=pair?.winner,loser=pair?.loser;
    if(!winner||!loser||winner===loser||used.has(winner)||used.has(loser))
      throw new RangeError('Each planet may participate in at most one resolved war');
    const w=baselineByPlanet[winner],l=baselineByPlanet[loser];
    if(!finite(w)||!finite(l))throw new RangeError('Missing finite pre-war Shadbala');
    used.add(winner);used.add(loser);
    const delta=Math.abs(w-l);
    virupaByPlanet[winner]=delta;
    virupaByPlanet[loser]=-delta;
    trace.push({winner,loser,preWarWinner:w,preWarLoser:l,differenceVirupa:delta,
      rule:'BPHS Ch27 v20 difference of two pre-war Shadbalas'});
  }
  return {virupaByPlanet,trace,reference:BPHS_GRAHA_YUDDHA_REFERENCE,
    winnerCriterion:'Uttara Kalamrita II printed p41 ONLY where BPHS Ch27 is silent',
    magnitudeConvention:'bphs-pre-war-difference',certified:false};
}
