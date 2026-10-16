// V362: primary-source BPHS I Santhanam Chapter 27 v19-20, printed p284.
// Independent arithmetic expectations, NOT copies of implementation internals.
import assert from 'node:assert/strict';
import { bphsDrigBalaFromAspects as drig, bphsGrahaYuddhaFromBaselines as war } from '../public/horoscope/offline/bphs-shadbala-rectification.browser.mjs';
import { drikBalaClassical } from '../public/horoscope/offline/swiss_vedic.browser.mjs';
import { uttaraKalamritaGrahaYuddha as ukEligibility } from '../public/horoscope/offline/uttara-kalamrita-shadbala.browser.mjs';
import { full } from '../public/horoscope/offline/offline-engine.mjs';
let n=0;
function eq(actual,expected,message){assert.deepEqual(actual,expected,message);n++;}
function near(actual,expected,message){assert.ok(Math.abs(actual-expected)<1e-8,message+': actual '+actual+' expected '+expected);n++;}
function yes(value,message){assert.ok(value,message);n++;}
const input=[{name:'சனி',virupa:40,benefic:false},{name:'குரு',virupa:60,benefic:true},
 {name:'புதன்',virupa:20,benefic:true},{name:'சுக்கிரன்',virupa:30,benefic:true}];
const frozen=JSON.stringify(input);
// BPHS v19: quarter of net Drishti Pinda + full Jupiter and Mercury.
// Signed sum: -40 +60+20+30=70, quarter=17.5, extras=80 -> 97.5.
const r=drig(input);
near(r.quarterPinda,17.5,'Ch27 v19 signed quarter Pinda');
near(r.mercuryJupiterFull,80,'Ch27 v19 full measured Jupiter + Mercury aspects');
near(r.virupa,97.5,'Ch27 v19 complete Drig strength');
eq(JSON.stringify(input),frozen,'does not mutate input');
near(drig([{name:'புதன்',virupa:20,benefic:false}]).virupa,-25,'malefic joined Mercury signed full aspect');
near(drig([{name:'குரு',virupa:40,benefic:true}]).virupa,50,'Jupiter 1/4 + full');
near(drig([{name:'செவ்வாய்',virupa:40,benefic:false}]).virupa,-10,'ordinary malefic quarter only');
near(drig([]).virupa,0,'no aspect no Drig');
assert.throws(()=>drig([{name:'குரு',virupa:61,benefic:true}]),RangeError);n++;
// BPHS v20: NOT Uttara Kalamrita p45 +/-1 Rupa. Difference in
// pre-war six-Bala aggregate is the final winner/loser rectification.
const encounters=[{winner:'செவ்வாய்',loser:'புதன்',degrees:.4}];
const baseline={'செவ்வாய்':320,'புதன்':380};
const before=JSON.stringify(baseline);
const w=war(encounters,baseline);
eq(w.magnitudeConvention,'bphs-pre-war-difference','BPHS authoritative variant');
eq([w.virupaByPlanet['செவ்வாய்'],w.virupaByPlanet['புதன்']],[60,-60],'320 vs 380 = +/-60 only by coincidence');
eq(w.trace[0].differenceVirupa,60,'BPHS difference = 60');
eq(JSON.stringify(baseline),before,'does not mutate baseline');
const nonSixty=war(encounters,{'செவ்வாய்':327.375,'புதன்':351.25});
near(nonSixty.virupaByPlanet['செவ்வாய்'],23.875,'non-60 BPHS winner addition');
near(nonSixty.virupaByPlanet['புதன்'],-23.875,'non-60 BPHS loser subtraction');
near(327.375+nonSixty.virupaByPlanet['செவ்வாய்'],351.25,'BPHS weaker war winner raised to loser starting total');
near(351.25+nonSixty.virupaByPlanet['புதன்'],327.375,'BPHS stronger war loser reduced to winner starting total');
eq(war([],baseline).trace.length,0,'no war means no correction');
eq(war([{winner:'குரு',loser:'சுக்கிரன்'}],{'குரு':400,'சுக்கிரன்':400}).virupaByPlanet['குரு'],0,'equal pre-war Shadbalas zero bonus');
assert.throws(()=>war([{winner:'செவ்வாய்',loser:'புதன்'},{winner:'செவ்வாய்',loser:'குரு'}],baseline),RangeError);n++;
assert.throws(()=>war(encounters,{'செவ்வாய்':Infinity,'புதன்':3}),RangeError);n++;
// The eligibility-only fallback comes from UK when BPHS does not specify
// northern latitude winner. Its OWN +/-60 is not used in the live BPHS total.
const p=(name,longitude,eclipticLatitude,bhava=1)=>({name,longitude,eclipticLatitude,bhava});
const uk=ukEligibility([p('செவ்வாய்',100,1.2),p('புதன்',100.5,0.2)]);
eq(uk.encounters[0].winner,'செவ்வாய்','northern winner from UK II p41 only');
eq(war(uk.encounters,{'செவ்வாய்':250,'புதன்':280}).virupaByPlanet['செவ்வாய்'],30,'BPHS v20 gives +30, NOT UK +60');
// BPHS derived geometry also validates Drig calculation: one Jupiter
// aspecting receiver at 180 degrees has 60 Virupa full aspect.
const geometric=drikBalaClassical('செவ்வாய்',[p('செவ்வாய்',180,0),p('குரு',0,0)]);
near(geometric,75,'Jupiter full 7th: 60/4 + 60 = 75 (BPHS v19)');
for(const [date,time] of [['1994-06-15','13:03'],['2015-09-06','09:30'],['1992-07-31','22:05'],['1971-05-04','05:05'],['1974-01-11','16:04']]){
 const out=await full({date,time,lat:11.232,lon:78.88,utcOffsetMinutes:330,referenceDate:'2026-10-17',name:'V362 BPHS primary Shadbala'});
 yes(out.ok,date+' computation OK');
 const classical=out.chart.planets.filter(x=>['சூரியன்','சந்திரன்','செவ்வாய்','புதன்','குரு','சுக்கிரன்','சனி'].includes(x.name));
 eq(classical.length,7,'seven classical grahas');
 for(const g of classical){
  const strength=g.strength3, k=strength.components.kala;
  yes(Number.isFinite(strength.totalVirupa),date+' '+g.name+' valid Shadbala total');
  yes(Number.isFinite(k.yuddha),date+' '+g.name+' valid Yuddha');
  yes(Number.isFinite(strength.components.drik),date+' '+g.name+' valid Drig');
  near(strength.totalRupa,Math.round((strength.totalVirupa/60)*1000)/1000,date+' '+g.name+' virupa/60');
  eq(strength.classicalCertified,false,'not falsely certify missing Cheshta oracle');
  yes(strength.limitations.some(x=>x.includes('BPHS Ch27 v20')),date+' explicit BPHS source priority');
 }
}
console.log(JSON.stringify({pass:true,assertions:n,reference:'BPHS I R Santhanam Ch27 verses 19-20 pp283-284 (PDF pp283-284)',scope:'BPHS-first Drig Pinda and pre-war difference Yuddha, UK only victory criterion; five natal charts',fullShadbalaCertified:false}));
