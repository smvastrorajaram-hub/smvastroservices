import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const nodeRaman=require('../bv-raman-shadbala.cjs');
import {calculateBVRamanShadbala as browserRaman,BV_RAMAN_SHADBALA_SOURCE as browserSource}
  from '../public/horoscope/offline/bv-raman-shadbala.browser.mjs';

let checks=0;
const yes=(value,label)=>{assert.ok(value,label);checks++;};
const eq=(actual,expected,label)=>{assert.deepEqual(actual,expected,label);checks++;};
const near=(actual,expected,tolerance,label)=>{
 assert.ok(Number.isFinite(actual)&&Math.abs(actual-expected)<=tolerance,
  label+' actual='+actual+' expected='+expected+' tolerance='+tolerance);
 checks++;
};
const norm=x=>((x%360)+360)%360;
const separation=(a,b)=>{const d=Math.abs(norm(a)-norm(b));return Math.min(d,360-d);};
const round3=x=>Math.round((x+Number.EPSILON)*1000)/1000;
eq(browserSource.yuddhaConjunctionThresholdDegrees,1,
 'Raman source contract uses a strict one-degree conjunction boundary');
eq(browserSource.yuddhaEligibleGrahas,['Mars','Mercury','Jupiter','Venus','Saturn'],
 'Raman source contract excludes Sun and Moon from Yuddha');
eq(browserSource.yuddhaDiscDiameterArcsec,
 { 'செவ்வாய்':9.4,'புதன்':6.6,'குரு':190.4,'சுக்கிரன்':16.6,'சனி':158.0 },
 'Raman source contract exposes all five printed disc diameters');
eq(browserSource.yuddhaPreWarComponents,['Sthana','Dig','Kala through Hora'],
 'Raman pre-war comparison excludes Ayana and prior Yuddha');
eq(browserSource.yuddhaWinnerRule,'lesser normalized nirayana longitude',
 'Raman source winner is the lesser normalized nirayana longitude');
eq(browserSource.yuddhaAdjustmentRule,
 'add the absolute pre-war difference divided by disc-diameter difference to winner Kala; subtract the same from loser Kala',
 'Raman Yuddha is booked as opposite adjustments in winner/loser Kala');
eq(browserSource.productionCertification,false,
 'source metadata does not grant global production certification');

// B.V. Raman, Graha and Bhava Balas, Ch. V §§76–78, pp.60–62.
// Keep an independent copy of the printed disc diameters in this source oracle.
const discArcsec=Object.freeze({
 'செவ்வாய்':9.4,'புதன்':6.6,'குரு':190.4,'சுக்கிரன்':16.6,'சனி':158.0
});
const basePlanets=[
 {name:'சூரியன்',longitude:180+53/60+55/3600,bhava:9},
 {name:'சந்திரன்',longitude:311+17/60+19/3600,bhava:1},
 {name:'செவ்வாய்',longitude:229+30/60+34/3600,bhava:10},
 {name:'புதன்',longitude:181+31/60+34/3600,bhava:6},
 {name:'குரு',longitude:84+0/60+49/3600,bhava:9},
 {name:'சுக்கிரன்',longitude:171+9/60+56/3600,bhava:7},
 {name:'சனி',longitude:124+22/60+41/3600,bhava:11}
];
const standardChestaInputs={
 'செவ்வாய்':{meanLongitude:266.34,trueLongitude:229.50,sheeghroccaLongitude:181.23},
 'புதன்':{meanLongitude:181.23,trueLongitude:181.52,sheeghroccaLongitude:174.49},
 'குரு':{meanLongitude:66.91,trueLongitude:84.01,sheeghroccaLongitude:181.23},
 'சுக்கிரன்':{meanLongitude:181.23,trueLongitude:171.16,sheeghroccaLongitude:158.35},
 'சனி':{meanLongitude:111.23,trueLongitude:124.39,sheeghroccaLongitude:181.23}
};
const optionsFor=planets=>({
 planets,bhavas:[],
 ascendantLongitude:298+27/60,
 midheavenLongitude:216+30/60,
 apparentSolarHour:14.336,
 temporal:{
  abdaLord:'சனி',masaLord:'புதன்',dinaLord:'புதன்',
  horaLord:'சந்திரன்',tribhagaLord:'சனி',
  solarTimeMethod:'B.V. Raman printed standard-horoscope source fixture'
 },
 declinations:{
  'சூரியன்':-8.75,'சந்திரன்':-10.75,'செவ்வாய்':-22.528,
  'புதன்':-9,'குரு':23.5,'சுக்கிரன்':-4.96,'சனி':13.0
 },
 jdUt:Date.UTC(1918,9,16,14,6,16)/86400000+2440587.5,
 ayanamsa:(202+10/60)-(180+53/60+55/3600),
 classicalChestaInputs:standardChestaInputs
});
const both=planets=>{
 const input=optionsFor(planets);
 return {
  browser:browserRaman(input),
  node:nodeRaman.calculateBVRamanShadbala(input)
 };
};
const resultPairs=result=>result.warEvidence.pairs.map(p=>[p.a,p.b,+p.separation.toFixed(9)]);
const assertResolvedPairTotals=(result,pair,planets)=>{
 const [a,b]=pair;
 const longitudeA=planets.find(p=>p.name===a).longitude;
 const longitudeB=planets.find(p=>p.name===b).longitude;
 const winner=norm(longitudeA)<norm(longitudeB)?a:b;
 const loser=winner===a?b:a;
 const denominator=Math.abs(discArcsec[a]-discArcsec[b]);
 near(denominator,Math.abs(discArcsec[a]-discArcsec[b]),0,
  a+' / '+b+' independent disc-diameter difference');
 const preWinner=result.planets[winner].components.sthana.total+
  result.planets[winner].components.dig+
  result.planets[winner].components.kala.warPreTotal;
 const preLoser=result.planets[loser].components.sthana.total+
  result.planets[loser].components.dig+
  result.planets[loser].components.kala.warPreTotal;
 const magnitude=round3(Math.abs(preWinner-preLoser)/denominator);
 near(result.planets[winner].components.kala.yuddha,magnitude,0.001,
  winner+' receives positive Raman Yuddha Bala');
 near(result.planets[loser].components.kala.yuddha,-magnitude,0.001,
  loser+' receives equal negative Raman Yuddha Bala');
 for(const name of [winner,loser]){
  const c=result.planets[name].components;
  const k=c.kala;
  const kalaExpected=round3(k.natonnatha+k.paksha+k.tribhaga+k.abda+
   k.masa+k.vara+k.hora+k.ayana+k.yuddha);
  near(k.total,kalaExpected,0.001,name+' final Kala includes Yuddha exactly once');
  const sixfold=c.sthana.total+c.dig+k.total+c.cheshta+c.naisargika+c.drik;
  near(result.planets[name].totalVirupa,round3(sixfold),0.001,
   name+' final six-Bala total includes adjusted Kala exactly once');
  near(result.planets[name].totalRupa,round3(sixfold/60),0.001,
   name+' final Rupa reconciles with adjusted six-Bala total');
 }
};
const calculate=planets=>both(planets);

// 1. Raman's printed Standard Horoscope (Example 34): no qualifying pair.
{
 const {browser,node}=calculate(basePlanets);
 eq(browser.warEvidence.resolved,true,'standard horoscope Yuddha is resolved');
 eq(browser.warEvidence.pairs,[],'standard horoscope has no qualifying Yuddha pair');
 eq(browser.warEvidence.unresolved,[],'standard horoscope has no unresolved Yuddha pair');
 eq(browser.classicalCertified,false,'same numeric inputs without the exact source provenance remain uncertified');
 eq(node.classicalCertified,false,'Node also fails closed without the source provenance marker');
 for(const name of Object.keys(discArcsec)){
  eq(browser.planets[name].components.kala.yuddha,0,name+' standard horoscope has zero Yuddha');
  near(browser.planets[name].components.kala.total,
   browser.planets[name].components.kala.warPreTotal+
    browser.planets[name].components.kala.ayana,0.001,
   name+' no-war Kala equals pre-war terms plus Ayana');
 }
 eq(node.warEvidence,browser.warEvidence,'Node/browser no-war evidence parity');
}

// 2. Two disjoint wars: <1 degree, lower longitude wins, Disc-diameter formula.
{
 const planets=basePlanets.map(p=>({...p}));
 planets.find(p=>p.name==='செவ்வாய்').longitude=229.500;
 planets.find(p=>p.name==='புதன்').longitude=229.700;
 planets.find(p=>p.name==='குரு').longitude=84.000;
 planets.find(p=>p.name==='சனி').longitude=84.650;
 const {browser,node}=calculate(planets);
 yes(browser.warEvidence.resolved,'two disjoint qualifying wars are resolved');
 eq(resultPairs(browser),[
  ['செவ்வாய்','புதன்',0.2],['குரு','சனி',0.65]
 ],'both qualifying pair separations are recorded');
 eq(browser.warEvidence.unresolved,[],'disjoint wars do not create unresolved pairs');
 assertResolvedPairTotals(browser,['செவ்வாய்','புதன்'],planets);
 assertResolvedPairTotals(browser,['குரு','சனி'],planets);
 eq(node.warEvidence,browser.warEvidence,'Node/browser Yuddha pair and resolution parity');
 for(const name of Object.keys(discArcsec)){
  near(node.planets[name].components.kala.yuddha,
   browser.planets[name].components.kala.yuddha,0.001,
   name+' Node/browser Yuddha adjustment parity');
  near(node.planets[name].totalVirupa,browser.planets[name].totalVirupa,0.001,
   name+' Node/browser final total parity after Yuddha');
 }
}

// 3. Exact 1 degree is NOT a war; just below 1 degree IS a war.
{
 const exactly=basePlanets.map(p=>({...p}));
 exactly.find(p=>p.name==='செவ்வாய்').longitude=229.500;
 exactly.find(p=>p.name==='புதன்').longitude=230.500;
 const atBoundary=calculate(exactly).browser;
 eq(atBoundary.warEvidence.pairs,[],'exactly 1.000 degree is outside the strict less-than-one-degree rule');
 const below=exactly.map(p=>({...p}));
 below.find(p=>p.name==='புதன்').longitude=230.499;
 const inside=calculate(below).browser;
 eq(resultPairs(inside),[['செவ்வாய்','புதன்',0.999]],
  '0.999 degree satisfies the strict conjunction rule');
 yes(inside.warEvidence.resolved,'single pair just below one degree is resolved');
 assertResolvedPairTotals(inside,['செவ்வாய்','புதன்'],below);
}

// 4. Sun and Moon are not Yuddha participants, even when nearly conjunct.
{
 const luminaries=basePlanets.map(p=>({...p}));
 luminaries.find(p=>p.name==='சூரியன்').longitude=100;
 luminaries.find(p=>p.name==='சந்திரன்').longitude=100.001;
 const result=calculate(luminaries).browser;
 eq(result.warEvidence.pairs,[],'Sun/Moon near-conjunction does not enter planetary war');
 eq(result.warEvidence.resolved,true,'luminary conjunction does not make Yuddha unresolved');
}

// 5. Overlapping wars (three eligible grahas within one degree) are ambiguous.
// The implementation must withhold affected graha totals rather than allocate
// an ungrounded winner across simultaneous pairwise contests.
{
 const planets=basePlanets.map(p=>({...p}));
 planets.find(p=>p.name==='செவ்வாய்').longitude=100.000;
 planets.find(p=>p.name==='புதன்').longitude=100.300;
 planets.find(p=>p.name==='குரு').longitude=100.800;
 const {browser,node}=calculate(planets);
 eq(browser.warEvidence.resolved,false,'overlapping three-graha war is unresolved');
 eq(browser.warEvidence.pairs.length,3,'three close grahas produce all three pair records');
 eq(browser.warEvidence.unresolved.length,3,'all overlapping pair outcomes are withheld');
 for(const name of ['செவ்வாய்','புதன்','குரு']){
  eq(browser.planets[name].totalVirupa,null,name+' overlapping-war final total withheld');
  eq(browser.planets[name].totalRupa,null,name+' overlapping-war Rupa withheld');
  eq(browser.planets[name].ratio,null,name+' overlapping-war ratio withheld');
  eq(browser.planets[name].isStrong,null,name+' overlapping-war strength classification withheld');
  eq(browser.planets[name].classicalCertified,false,name+' remains uncertified');
 }
 yes(Number.isFinite(browser.planets['சுக்கிரன்'].totalVirupa),
  'non-participant Venus retains its computable total');
 eq(node.warEvidence,browser.warEvidence,'Node/browser ambiguous-war evidence parity');
 for(const name of ['செவ்வாய்','புதன்','குரு'])
  eq(node.planets[name].totalVirupa,null,name+' Node also withholds overlapping-war total');
}

console.log(JSON.stringify({
 pass:true,checks,
 source:'B.V. Raman, Graha and Bhava Balas, Ch. V §§76–78, printed pp.60–62',
 strictWarBoundaryDegrees:1,
 standardHoroscopeNoWar:true,
 disjointWarPairs:2,
 exactBoundaryExcluded:true,
 subDegreeBoundaryIncluded:true,
 sunMoonExcluded:true,
 overlappingWarWithheld:true,
 nodeBrowserParity:true,
 fullClassicalShadbalaCertification:false
},null,2));
