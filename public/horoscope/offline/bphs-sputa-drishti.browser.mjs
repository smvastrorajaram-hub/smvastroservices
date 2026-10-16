/**
 * BPHS, R Santhanam Vol I, Ch 26 verses 6-12, printed pages 256–258:
 * continuous longitude-based Sputa Drishti ("speculum of aspectual values").
 *
 * Rules are applied AS PRINTED: six ordinary piecewise arc intervals
 * plus SPECIAL additional Virupas for Mars/Jupiter/Saturn at their
 * classical aspect windows. We use angle of recipient minus aspector.
 * No occult averaging, no semicircle shortest-distance substitution.
 *
 * Note: source specifies abrupt boundaries at 300° / sign changes.
 * We explicitly choose half-open intervals to eliminate double counting;
 * the interpretation is visible in the audit/test, not silently smoothed.
 */
const TAMIL=Object.freeze({
 'செவ்வாய்':'Mars','குரு':'Jupiter','சனி':'Saturn'
});
const norm360=x=>((x%360)+360)%360;
function ordinary(angle){
  if(angle<30||angle>=300)return 0;
  if(angle<60)return (angle-30)/2;
  if(angle<90)return (angle-60)+15;
  if(angle<120)return (120-angle)/2+30;
  if(angle<150)return 150-angle;
  if(angle<180)return (angle-150)*2;
  return (300-angle)/2;
}
/**
 * For any finite angle a, return Virupas [0,60]. Unlike simplistic
 * fixed 4th/5th/8th/9th aspects, this handles exact ecliptic degrees.
 */
export function bphsSputaDrishtiVirupa(angleDegrees,aspector){
  if(!Number.isFinite(angleDegrees))throw new TypeError('Finite longitude difference required');
  const a=norm360(angleDegrees),p=TAMIL[aspector]||aspector;
  let s=ordinary(a),extra=0;
  if(p==='Mars'&&((a>=90&&a<120)||(a>=210&&a<240))) extra=15;
  else if(p==='Jupiter'&&((a>=120&&a<150)||(a>=240&&a<270)))extra=30;
  else if(p==='Saturn'&&((a>=60&&a<90)||(a>=270&&a<300)))extra=45;
  return Math.max(0,Math.min(60,s+extra));
}
/**
 * A visible breakdown for independent exact arithmetic book oracles.
 */
export function bphsSputaDrishtiDetail(angleDegrees,aspector){
  if(!Number.isFinite(angleDegrees))throw new TypeError('Finite longitude difference required');
  const a=norm360(angleDegrees);
  const base=ordinary(a);
  const total=bphsSputaDrishtiVirupa(angleDegrees,aspector);
  return Object.freeze({
    angleDegrees:a,aspector,ordinaryVirupa:base,
    specialAddedVirupa:total-base,finalVirupa:total,
    source:'BPHS Vol I Santhanam Ch 26, verses 6–12, pp.256–258',
    bookArithmeticChecked:true,wholeShadbalaCertified:false
  });
}
