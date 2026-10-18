/**
 * BPHS positional, temporal and primary Shadbala regression suite
 * Consolidates independent source oracles without dropping assertions.
 * Each original oracle runs in its own function scope so its fixtures and
 * imported bindings remain isolated. The original scripts are retired only
 * after this aggregate is wired into CI.
 */
import * as __bundle0mod0 from 'node:assert/strict';
import * as __bundle0mod1 from '../public/horoscope/offline/swiss_vedic.browser.mjs';
import * as __bundle0mod2 from '../public/horoscope/offline/offline-engine.mjs';
import * as __bundle1mod0 from 'node:assert/strict';
import * as __bundle1mod1 from '../public/horoscope/offline/swiss_vedic.browser.mjs';
import * as __bundle1mod2 from '../public/horoscope/offline/offline-engine.mjs';
import * as __bundle2mod0 from 'node:assert/strict';
import * as __bundle2mod1 from '../public/horoscope/offline/bphs-shadbala-rectification.browser.mjs';
import * as __bundle2mod2 from '../public/horoscope/offline/swiss_vedic.browser.mjs';
import * as __bundle2mod3 from '../public/horoscope/offline/uttara-kalamrita-shadbala.browser.mjs';
import * as __bundle2mod4 from '../public/horoscope/offline/offline-engine.mjs';

async function runBundledOracle1() {
  // Consolidated from tests/v357-bphs-shadbala-positional-regression.mjs; keep this oracle's assertions isolated.
  const assert = __bundle0mod0.default;
  const { vargaDignityPoints, sthanaClassical } = __bundle0mod1;
  const { full } = __bundle0mod2;
// V357 BPHS Vol I, R. Santhanam, Ch. 27, PDF pp. 264–266.
// Independent direct numerical expectations for ONLY three positional
// Shadbala subcomponents. Not a complete Shadbala certification.



let assertions=0;
const eq=(a,b,m)=>{assert.equal(a,b,m);assertions++};
const yes=(a,m)=>{assert.ok(a,m);assertions++};
const longitudeInSign=(s,deg)=>s*30+deg;
const dignities=[
 ['சூரியன்',4,{'சூரியன்':4},45,'Moolatrikona Leo'],
 ['செவ்வாய்',7,{'செவ்வாய்':0},30,'Mars own Scorpio'],
 ['சூரியன்',8,{'சூரியன்':4,'குரு':5},20,'natural friend + temporary friend = great friend'],
 ['சூரியன்',8,{'சூரியன்':4,'குரு':10},15,'natural friend + temporary enemy = friend'],
 ['சூரியன்',1,{'சூரியன்':4,'சுக்கிரன்':5},10,'natural enemy + temporary friend = neutral'],
 ['சூரியன்',2,{'சூரியன்':4,'புதன்':10},4,'natural neutral + temporary enemy = enemy'],
 ['சூரியன்',1,{'சூரியன்':4,'சுக்கிரன்':10},2,'natural enemy + temporary enemy = great enemy']
];
for(const [p,sign,refs,expected,why] of dignities)
 eq(vargaDignityPoints(p,sign,refs),expected,'BPHS Saptavargaja '+why);
const genders={
 'சூரியன்':'male','சந்திரன்':'female','செவ்வாய்':'male',
 'புதன்':'neutral','குரு':'male','சுக்கிரன்':'female','சனி':'neutral'
};
// Book rule: Moon and Venus gain 15 each in EVEN Rasi and Navamsa;
// all other five gain 15 each in ODD Rasi and Navamsa.
// Drekkana: male first 10°, female second 10°, neutral third 10°.
const casesDegrees=[0.1,3.33333,9.999,10,13.333333,19.999,20,23.33333,29.999];
function bookNavamsaSign(sign,degree){
 const subdivision=Math.min(8,Math.floor(degree/(10/3)));
 const start=sign%3===0?sign:sign%3===1?(sign+8)%12:(sign+4)%12;
 return (start+subdivision)%12;
}
for(const [planet,gender] of Object.entries(genders)){
 for(let s=0;s<12;s++){
  for(const degree of casesDegrees){
   const lon=longitudeInSign(s,degree),d9=bookNavamsaSign(s,degree);
   const oddDesired=gender!=='female';
   const rasiMatch=(s%2===0)===oddDesired;
   const navMatch=(d9%2===0)===oddDesired;
   const expectedOja=15*Number(rasiMatch)+15*Number(navMatch);
   const dec=Math.floor(degree/10);
   const target=gender==='male'?0:gender==='female'?1:2;
   const positional=sthanaClassical(planet,lon,1,{'சூரியன்':0,'சந்திரன்':1,'செவ்வாய்':2,'புதன்':3,'குரு':4,'சுக்கிரன்':5,'சனி':6});
   eq(positional.ojayugma,expectedOja,planet+' sign='+s+' degree='+degree+' Oja');
   eq(positional.drekkana,dec===target?15:0,planet+' sign='+s+' degree='+degree+' Drekkana');
  }
 }
}
// Exact printed point ladder from BPHS ch.27 pp.264-265:
// 45 for MT, 30 own, 20 great friend, 15 friend, 10 neutral, 4 enemy, 2 great enemy.
const required=[45,30,20,15,10,4,2];
assert.deepEqual(dignities.map(x=>x[3]),required,'Book Saptavargaja Virupa ladder'); assertions++;
const births=[['1994-06-15','13:03'],['2015-09-06','09:30'],['1992-07-31','22:05'],['1971-05-04','05:05'],['1974-01-11','16:04']];
const summaries=[];
for(const [date,time] of births){
 const r=await full({date,time,lat:11.232,lon:78.88,utcOffsetMinutes:330,referenceDate:'2026-10-16',name:'V357 Shadbala audit'});
 yes(r.ok&&r.chart.planets.length>=7,date+' natal 7 grahas available');
 let checked=0;
 for(const p of r.chart.planets){
  if(!(p.name in genders))continue;
  const bala=p.strength3;
  yes(bala?.components?.sthana!=null,date+' '+p.name+' phase3 components present');
  const d=(p.longitude%30+30)%30;
  const s=Math.floor(((p.longitude%360)+360)%360/30);
  const nav=bookNavamsaSign(s,d);
  const odd=genders[p.name]!=='female';
  const expected=15*Number((s%2===0)===odd)+15*Number((nav%2===0)===odd);
  eq(bala.components.sthana.ojayugma,expected,date+' '+p.name+' expected BPHS Oja');
  const desired=genders[p.name]==='male'?0:genders[p.name]==='female'?1:2;
  eq(bala.components.sthana.drekkana,Math.floor(d/10)===desired?15:0,date+' '+p.name+' expected BPHS Drekkana');
  checked++;
 }
 eq(checked,7,date+' has all seven classical positional component readings');
 summaries.push({date,checked});
}
console.log(JSON.stringify({pass:true,assertions,births:summaries,reference:'Santhanam BPHS I Ch 27 PDF pp 264-266',scope:'Saptavargaja dignity table + Oja/Rasi/Navamsa parity + Drekkana ONLY',fullClassicalShadbalaCertified:false,shodhana:'SKIPPED'}));
}

async function runBundledOracle2() {
  // Consolidated from tests/v357-bphs-temporal-bala-sunrise-ahargana.mjs; keep this oracle's assertions isolated.
  const assert = __bundle1mod0.default;
  const { traditionalAharganaLords, kalaDayFromSunrise, ayanaBala } = __bundle1mod1;
  const { full } = __bundle1mod2;
// BPHS I (R. Santhanam) Chapter 27 pp. 267-272, 277, 284.
// Independently verify Ahargana year/month/day and astronomical-day
// Hora/Tribhaga component selection (solar rise/set still approximate).



const BOOK=['சூரியன்','சந்திரன்','செவ்வாய்','புதன்','குரு','சுக்கிரன்','சனி'];
let checks=0;const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++};
const ok=(a,m)=>{assert.ok(a,m);checks++};
const a=traditionalAharganaLords('1984-06-01');
eq(a.ahargana,65295,'BPHS 1984 Jun 1 printed ahargana 65295');
eq(a.abdaLord,'குரு','BPHS June 1 1984 Varsha lord Jupiter (Thursday)');
eq(a.masaLord,'சுக்கிரன்','BPHS June 1 1984 Masa lord Venus (Friday)');
eq(a.dinaLord,'சுக்கிரன்','BPHS June 1 1984 weekday lord Venus (Friday)');
for(const date of ['1971-05-04','1974-01-11','1992-07-31','1994-06-15','2015-09-06']){
 const ah=traditionalAharganaLords(date);
 const dow=new Date(date+'T00:00:00Z').getUTCDay();
 eq(ah.dinaLord,BOOK[dow],date+' Ahargana weekday matches historical calendar');
}
ok(ayanaBala(0,'சூரியன்')===60,'Sun Ayana at zero declination = 60 after Ch27 doubling');
ok(ayanaBala(0,'சந்திரன்')===30,'Moon Ayana at zero declination = 30');
ok(ayanaBala(23+27/60,'சூரியன்')===120,'Sun at positive 23:27 declination max 120');
ok(ayanaBala(-23-27/60,'சூரியன்')===0,'Sun at negative extreme min zero');
ok(ayanaBala(0,'புதன்')===30,'Mercury zero declination 30');
const samples=[];
for(const [date,time] of [['1994-06-15','13:03'],['2015-09-06','09:30'],['1992-07-31','22:05'],['1971-05-04','05:05'],['1974-01-11','16:04']]){
 const r=await full({date,time,lat:11.232,lon:78.88,utcOffsetMinutes:330,referenceDate:'2026-10-16',name:'V357 Total Bala audit'});
 ok(r.ok,'calculated natal chart '+date);
 const tc=kalaDayFromSunrise(date,time,11.232,78.88,330);
 ok(tc.sunriseApprox===true,date+' sunrise approximation correctly disclosed');
 const expected=['abda','masa','vara','hora','tribhaga'];
 const owner={abda:tc.abdaLord,masa:tc.masaLord,vara:tc.dinaLord,hora:tc.horaLord,tribhaga:tc.tribhagaLord};
 const points={abda:15,masa:30,vara:45,hora:60,tribhaga:60};
 const bodies=r.chart.planets.filter(p=>BOOK.includes(p.name));
 eq(bodies.length,7,date+' seven classical planets');
 for(const p of bodies){
  const c=p.strength3;
  ok(c.available&&c.classicalCertified===false,date+' provisional label '+p.name);
  for(const k of expected)eq(c.components.kala[k], (owner[k]===p.name || (k==='tribhaga'&&p.name==='குரு'))?points[k]:0,
    date+' '+p.name+' '+k+' textbook temporal lord rule');
  if(p.name==='சூரியன்'){
   eq(c.requiredVirupa,390,date+' Sun BPHS minimum 390 not 300');
   eq(c.components.cheshta,c.components.kala.ayana,date+' Sun Cheshta=Ayana');
  }
  if(p.name==='சந்திரன்')
   eq(c.components.cheshta,c.components.kala.paksha,date+' Moon Cheshta=Paksha');
 }
 samples.push({date,sunriseMinutes:tc.sunriseMinutes,weekday:tc.dinaLord,abda:tc.abdaLord,masa:tc.masaLord,hora:tc.horaLord});
}
console.log(JSON.stringify({pass:true,assertions:checks,reference:'BPHS I Chapter27 Santhanam pp.267-272,277,284',sampleCharts:5,fullShadbalaCertified:false,limitations:['Sunrise is approximate','Yuddha=0','Drig/Cheshta remaining grahas lack full numeric textbook oracle'],samples}));
}

async function runBundledOracle3() {
  // Consolidated from tests/v362-bphs-primary-shadbala-regression.mjs; keep this oracle's assertions isolated.
  const assert = __bundle2mod0.default;
  const { bphsDrigBalaFromAspects: drig, bphsGrahaYuddhaFromBaselines: war } = __bundle2mod1;
  const { drikBalaClassical } = __bundle2mod2;
  const { uttaraKalamritaGrahaYuddha: ukEligibility } = __bundle2mod3;
  const { full } = __bundle2mod4;
// V362: primary-source BPHS I Santhanam Chapter 27 v19-20, printed p284.
// Independent arithmetic expectations, NOT copies of implementation internals.





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
const uk=ukEligibility([p('செவ்வாய்',100+1/3600,1.2),p('புதன்',100+30/3600,0.2)]);
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
}

await runBundledOracle1();
await runBundledOracle2();
await runBundledOracle3();
