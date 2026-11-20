/**
 * Uttara Kalamrita Ayurdaya and BPHS/Surya Cheshta evidence suite
 * Consolidates independent source oracles without dropping assertions.
 * Each original oracle runs in its own function scope so its fixtures and
 * imported bindings remain isolated. The original scripts are retired only
 * after this aggregate is wired into CI.
 */
import * as __bundle0mod0 from 'node:assert/strict';
import * as __bundle0mod1 from '../public/horoscope/offline/uttara-kalamrita-six-bala.browser.mjs';
import * as __bundle1mod0 from 'node:assert/strict';
import * as __bundle1mod1 from '../public/horoscope/offline/offline-engine.mjs';
import * as __bundle1mod2 from '../public/horoscope/offline/uttara-kalamrita-ayurdaya.browser.mjs';
import * as __bundle2mod0 from 'node:assert/strict';
import * as __bundle2mod1 from '../public/horoscope/offline/wasm-provider.mjs';
import * as __bundle2mod2 from '../public/horoscope/offline/offline-engine.mjs';
import * as __bundle2mod3 from '../public/horoscope/offline/swiss_vedic.browser.mjs';
import * as __bundle2mod4 from '../public/horoscope/offline/bphs-swiss-solar-cheshta.browser.mjs';
import * as __bundle3mod0 from 'node:assert/strict';
import * as __bundle3mod1 from '../public/horoscope/offline/wasm-provider.mjs';
import * as __bundle3mod2 from '../public/horoscope/offline/bphs-swiss-solar-cheshta.browser.mjs';
import * as __bundle3mod3 from '../public/horoscope/offline/offline-engine.mjs';
import * as __bundle3mod4 from '../public/horoscope/offline/bphs-cheshta-swiss-orbital-research.browser.mjs';
import * as __bundle4mod0 from 'node:assert/strict';
import * as __bundle4mod1 from '../public/horoscope/offline/saura-classical-mean-motion.browser.mjs';
import * as __bundle4mod2 from '../public/horoscope/offline/bphs-swiss-solar-cheshta.browser.mjs';
import * as __bundle5mod0 from 'node:assert/strict';
import * as __bundle5mod1 from '../public/horoscope/offline/saura-classical-true-longitude.browser.mjs';
import * as __bundle5mod2 from '../public/horoscope/offline/saura-classical-mean-motion.browser.mjs';
import * as __bundle5mod3 from '../public/horoscope/offline/bphs-swiss-solar-cheshta.browser.mjs';
import * as __bundle6mod0 from 'node:assert/strict';
import * as __bundle6mod1 from '../public/horoscope/offline/saura-classical-true-longitude.browser.mjs';
import * as __bundle6mod2 from '../public/horoscope/offline/saura-classical-mean-motion.browser.mjs';
import * as __bundle6mod3 from '../public/horoscope/offline/bphs-swiss-solar-cheshta.browser.mjs';
import * as __bundle6mod4 from '../public/horoscope/offline/wasm-provider.mjs';
import * as __bundle6mod5 from '../public/horoscope/offline/offline-engine.mjs';

import * as __extra7mod0 from 'node:assert/strict';
import * as __extra7mod1 from '../public/horoscope/offline/offline-engine.mjs';
import * as __extra7mod2 from '../public/horoscope/offline/bphs-swiss-solar-cheshta.browser.mjs';
import * as __extra8mod0 from 'node:assert/strict';
import * as __extra8mod1 from '../public/horoscope/offline/saura-natal-five-cheshta.browser.mjs';
import * as __extra8mod2 from '../public/horoscope/offline/saura-classical-true-longitude.browser.mjs';

async function runBundledOracle8() {
  const assert = __extra7mod0.default;
  const { full } = __extra7mod1;
  const { bphsFivePlanetCheshtaFromClassicalMeans: cheshta } = __extra7mod2;
/**
 * Official 2026 IMD vs SMV live five-graha Cheshta source discrepancy.
 *
 * Only official Ministry of Earth Sciences / IMD figures from Rashtriya
 * Panchang 2026–27 Chaitra 1 are used. No external worked-paper example.
 * IMD printed date: 2026-03-22 05:30 IST = 00:00 UTC.
 *
 * https://packolkata.imd.gov.in/panchang/en/bija_corrections
 * https://packolkata.imd.gov.in/panchang/en/longitude_planets
 * This is a scientific blocker test, NOT a sample-specific production
 * correction: a Bija-corrected IMD input triple is not interchangeable
 * with Swiss Lahiri geocentric longitudes at arbitrary natal epochs.
 */




const dms=([r,d,m,s])=>r*30+d+m/60+s/3600;
const imdCorrectedMean2026=Object.freeze({
 Sun:[11,5,17,42.49], Mercury:[5,28,40,38.79],
 Venus:[0,20,55,29.08], Mars:[10,9,59,31.96],
 Jupiter:[2,26,13,3.65], Saturn:[11,16,38,39.28]
});
const imdGeocentricTrue2026=Object.freeze({
 Mercury:[10,14,20,3],Venus:[11,25,4,21],
 Mars:[10,21,3,6],Jupiter:[2,21,3,10],Saturn:[11,10,4,30]
});
const publishedInputsExpectedVirupa=Object.freeze({
 Mercury:48.712403,Venus:11.913642,Mars:6.591066,
 Jupiter:36.113364,Saturn:2.688162
});
const tamil=Object.freeze({
 Mercury:'புதன்',Venus:'சுக்கிரன்',Mars:'செவ்வாய்',
 Jupiter:'குரு',Saturn:'சனி'
});
const verifiedNoFusion=[];
let assertions=0;
function yes(v,m){assert.ok(v,m);assertions++;}
function near(a,b,eps,m){
 yes(Number.isFinite(a)&&Math.abs(a-b)<=eps,
 m+' actual '+a+' expected '+b+' diff '+Math.abs(a-b));
}
const birth={date:'2026-03-22',time:'05:30',lat:11.232,lon:78.88,
 utcOffsetMinutes:330,referenceDate:'2026-10-17',name:'IMD live Cheshta methodological gate'};
const live=await full(birth);
yes(live.ok,'2026 official epoch actual SMV live chart exists');
const solarMean=dms(imdCorrectedMean2026.Sun);
for(const [planet,tamilName] of Object.entries(tamil)){
 const liveP=live.chart.planets.find(x=>x.name===tamilName);
 yes(liveP?.strength6?.available===true,planet+' live has sixfold Bala');
 const s=liveP.strength6;
 const independentlyPublishedOrbital=cheshta(tamilName,solarMean,
   dms(imdCorrectedMean2026[planet]),dms(imdGeocentricTrue2026[planet]));
 near(independentlyPublishedOrbital.virupa,publishedInputsExpectedVirupa[planet],
   .0000015,planet+' IMD published source input Cheshta Virupa');
 const orbitalEvidence=s.evidence?.cheshtaSource;
 yes(orbitalEvidence?.method==='BV_RAMAN_FORMULA_EPHEMERIS_TRUE_LONGITUDE_RESEARCH_MEAN_SHEEGHROCCA'&&orbitalEvidence.numericallyCertified===false,
   planet+' live uses B.V. Raman classical-formula candidate, not speed buckets');
 const liveVirupa=s.components.cheshta;
 const discrepancy=Math.abs(liveVirupa-independentlyPublishedOrbital.virupa);
 yes(Number.isFinite(liveVirupa)&&orbitalEvidence?.trueLongitudeHistoricalCertified===false,
    planet+' Raman Cheshta remains numerical candidate pending historical input certification');
 yes(s.classicalCertified===false&&s.provisional===true,
   planet+' shall NOT be classically certified');
 verifiedNoFusion.push({
  planet,liveDiscreteVirupa:liveVirupa,
  officialImdReferenceVirupa:+independentlyPublishedOrbital.virupa.toFixed(6),
  absoluteDifferenceVirupa:+discrepancy.toFixed(6),
  trueSource:'2026-03-22 official IMD printed Nirayana true',
  meanSource:'2026-03-22 official IMD Bija-corrected traditional mean',
  liveAstronomicalFrame:'Swiss Lahiri; not to be fused with IMD planetary mean',
  liveFiveGrahaClassicalCheshtaCertified:false
 });
}
for(const planet of ['சூரியன்','சந்திரன்']){
 const s=live.chart.planets.find(p=>p.name===planet)?.strength6;
 yes(s&&s.classicalCertified===false,
     planet+' no false full Shadbala certificate');
 yes(s.evidence?.cheshtaSource?.method==='BV_RAMAN_SIXFOLD_CHESTA_LUMINARIES_ZERO',
     planet+' Sun/Moon sixfold Cheshta follows the B.V. Raman source-specific rule');
 near(s.components.cheshta,0,1e-12,planet+' sixfold Cheshta is distinct from Ishta/Kashta special Chesta-for-Phala');
}
yes(verifiedNoFusion.length===5,'all five traditional mean-vs-speed comparisons');
console.log(JSON.stringify({
 pass:true,assertions,
 source:'IMD official 2026 Panchang only',
 event:'2026-03-22T00:00:00Z',
 actualLiveChartCount:1,actualLiveFiveGrahaComparisons:5,
 fivePlanetCheshtaSpeedHeuristicProvenNotEquivalent:true,
 automaticallyReplacingLiveSwissWithImd:false,
 fullSevenGrahaClassicalShadbalaNumericallyCertified:false,
 verifiedNoFusion
}));
}


async function runBundledOracle9() {
  const assert = __extra8mod0.default;
  const { computeClassicalFiveNatalCheshta: calculate } = __extra8mod1;
  const { sauraMandoccaResearch } = __extra8mod2;
const births=Object.freeze([
 {date:'1971-05-04',time:'05:05',utcOffsetMinutes:330},
 {date:'1974-01-11',time:'16:04',utcOffsetMinutes:330},
 {date:'1992-07-31',time:'22:05',utcOffsetMinutes:330},
 {date:'1994-06-15',time:'13:03',utcOffsetMinutes:330},
 {date:'2015-09-06',time:'09:30',utcOffsetMinutes:330}
]);
let assertions=0;

const check=(v,label)=>{assert.ok(v,label);assertions++};
let planetCount=0;
const summary=[];
for(const birth of births){
  const r=calculate(birth);
  check(r.planets.length===5,birth.date+' all five grahas');
  check(r.calculationAvailable&&!r.productionIntegrationAllowed,
    birth.date+' distinguish running numerical engine from complete certification');
  check(!r.natalHistoricalNumericalCertified&&!r.shadbalaNumericallyCertified,
    birth.date+' no false complete certificate');
  const names=new Set(r.planets.map(x=>x.planet));
  check(names.size===5,birth.date+' unique planets');
  for(const p of r.planets){
    planetCount++;
    check([p.meanLongitude,p.trueLongitude,p.sheeghrocha,p.mandocca,
      p.cheshtaKendra,p.cheshtaVirupa].every(Number.isFinite),p.planet+' finite six inputs');
    check(p.cheshtaVirupa>=0&&p.cheshtaVirupa<=60,
      p.planet+' strict 0–60 Virupa');
    check(!p.certified&&p.model==='unmodified Surya Siddhanta',
      p.planet+' coherent classical model provenance');
    check(p.trueModelStages&&Number.isFinite(p.trueModelStages.fullMandaDegrees),
      p.planet+' four-stage internal evidence available');
  }
  const again=calculate(birth);
  check(JSON.stringify(r.planets)===JSON.stringify(again.planets),
    birth.date+' deterministic date-to-five-graha engine');
  const nextMinute=new Date((r.jdUt-2440587.5)*86400000+60000);
  const altered={date:birth.date,time:birth.time==='23:59'?'23:58':birth.time.slice(0,2)+':'+String((Number(birth.time.slice(3))+1)%60).padStart(2,'0'),
    utcOffsetMinutes:birth.utcOffsetMinutes};
  if(Number(birth.time.slice(3))!==59){
    const after=calculate(altered);
    check(after.planets.every((p,i)=>Math.abs(((p.trueLongitude-r.planets[i].trueLongitude+540)%360)-180)<0.15),
      birth.date+' minute resolution continuous');
  }
  summary.push({birth:birth.date+' '+birth.time,
    five: Object.fromEntries(r.planets.map(p=>[p.planet,Number(p.cheshtaVirupa.toFixed(4))])),
    eligible:false});
}
assert.equal(planetCount,25);assertions++;
for(const b of [
 {date:'2026-02-30',time:'12:00',utcOffsetMinutes:330},
 {date:'2026-04-05',time:'24:00',utcOffsetMinutes:330},
 {date:'2026-04-05',time:'12:60',utcOffsetMinutes:330},
 {date:'2026-04-05',time:'12:00',utcOffsetMinutes:841},
 {date:'2026-04-05',time:'12:00',utcOffsetMinutes:NaN},
 {date:'0001-01-01',time:'12:00',utcOffsetMinutes:330}
]){assert.throws(()=>calculate(b),RangeError);assertions++;}

/*
 * Sūrya Siddhānta Ch I vv41-42 explicitly give apogee revolutions in a
 * KALPA, not in one MAHĀYUGA. Since a kalpa has 1000 mahayugas,
 * the correct secular rate is (204 / 1000) Mars, (368 / 1000) Mercury,
 * (900 / 1000) Jupiter, (535 / 1000) Venus, (39 / 1000) Saturn
 * revolutions per 1,577,917,828 civil days. This catches the 1000x
 * unit mistake without modifying any candidate historical ephemeris.
 * Sources: 1861 Sastri SS I 40-42; 2024 scholarly Cidambi et al.
 * The 1861 English Venus "635" is inconsistent with the Sanskrit
 * 535 (and modern critical tables), so use the Sanskrit numeral.
 */

const mandoccaKalpaRev=Object.freeze({
 Mars:204,Mercury:368,Jupiter:900,Venus:535,Saturn:39
});
const paperApsis2024=Object.freeze({
 Mars:130.0471,Mercury:220.4772,Jupiter:171.3844,
 Venus:79.8785,Saturn:236.6267
});
const paperAnchorJD=2460409.5;
const mahayugaCivilDays=1577917828;
const kalpaMahayugaCount=1000;
const norm360=x=>((x%360)+360)%360;
const mandoccaSigned=(x,y)=>(((x-y)%360)+540)%360-180;
const kalpaApsisUnitsEvidence=[];
function independentHistoricalMandocca(jdUt,planet){
 const sourceRev=mandoccaKalpaRev[planet]/kalpaMahayugaCount;
 const elapsedDays=jdUt-paperAnchorJD;
 return norm360(paperApsis2024[planet] +
   elapsedDays*sourceRev*360/mahayugaCivilDays);
}
for(const birth of births){
 const [y,m,d]=birth.date.split('-').map(Number);
 const [hh,mi]=birth.time.split(':').map(Number);
 const jdUt=(Date.UTC(y,m-1,d,hh,mi)-birth.utcOffsetMinutes*60000)/86400000+2440587.5;
 const row={birth:birth.date+' '+birth.time,apsides:{}};
 for(const planet of Object.keys(mandoccaKalpaRev)){
  const fromText=independentHistoricalMandocca(jdUt,planet);
  const fromEngine=sauraMandoccaResearch(jdUt,planet);
  const error=Math.abs(mandoccaSigned(fromEngine.mandocca,fromText));
  check(error<1e-9,
    birth.date+' '+planet+' book Kalpa -> 1000 Mahayuga apsis unit consistency');
  check(fromEngine.historicalNumericalCertified===false,
    birth.date+' '+planet+' book secular rate does not prove historical anchor/Bija');
  const drift=Math.abs(mandoccaSigned(fromText,paperApsis2024[planet]));
  check(drift<.0041,
    birth.date+' '+planet+' secular apsis drift since 2024 strictly <0.0041 degrees');
  row.apsides[planet]={
    fromIndependentKalpaUnit:+fromText.toFixed(9),
    fromResearchEngine:+fromEngine.mandocca.toFixed(9),
    deltaDegrees:+error.toFixed(12),
    changeFromPrinted2024AnchorDegrees:+drift.toFixed(9)
  };
 }
 kalpaApsisUnitsEvidence.push(row);
}
check(kalpaApsisUnitsEvidence.length===5 &&
      kalpaApsisUnitsEvidence.every(x=>Object.keys(x.apsides).length===5),
      'all 25 five-natal Kalpa to Mahayuga conversions evaluated');

console.log(JSON.stringify({pass:true,assertions,planetCount,engineReadyForResearch:true,
   historicalTrueLongitudeCertified:false,natalCheshtaCertified:false,
   completeSevenGrahaShadbalaCertified:false,
   kalpaApsisUnitsEvidence,birthResults:summary}));
}

async function runBundledOracle1() {
  // Consolidated from tests/uttara-kalamrita-2026-imd-same-frame-cheshta-oracle.mjs; keep this oracle's assertions isolated.
  const assert = __bundle0mod0.default;
  const { uttaraKalamritaFiveGrahaCheshta: UK } = __bundle0mod1;
/**
 * UK II.16½–17½ 2026 real external numeric input oracle:
 * India Meteorological Department, Rashtriya Panchang Saka 1948.
 * Same-frame officially printed Bija-corrected means at 2026-03-22
 * and official printed true planetary longitudes at Mar22-28.
 * Mar23-28 means are mathematically PROPAGATED from published epoch
 * with traditional Mahayuga rates, not six more independent means.
 *
 * This is an independent UK five-graha selector/computation regression.
 * No excluded research example. No Swiss/classical longitude fusion.
 * Not historical five natal chart certification.
 */


const DMS=([r,d,m,s])=>r*30+d+m/60+s/3600;
const N=x=>((x%360)+360)%360;
const RAD=Math.PI/180,MAHAYUGA_DAYS=1577917828;
const orbits={Sun:4320000,Mercury:17937060,Venus:7022376,
 Mars:2296832,Jupiter:364220,Saturn:146568};
const mean2026={
 Sun:[11,5,17,42.49],Mercury:[5,28,40,38.79],
 Venus:[0,20,55,29.08],Mars:[10,9,59,31.96],
 Jupiter:[2,26,13,3.65],Saturn:[11,16,38,39.28]
};
const officialTrue={
 Mercury:[[10,14,20,3],[10,14,29,42],[10,14,44,44],[10,15,4,55],
  [10,15,29,58],[10,15,59,36],[10,16,33,35]],
 Venus:[[11,25,4,21],[11,26,18,34],[11,27,32,45],[11,28,46,54],
  [0,0,1,0],[0,1,15,5],[0,2,29,7]],
 Mars:[[10,21,3,6],[10,21,50,14],[10,22,37,20],[10,23,24,26],
  [10,24,11,30],[10,24,58,34],[10,25,45,35]],
 Jupiter:[[2,21,3,10],[2,21,5,22],[2,21,7,44],[2,21,10,18],
  [2,21,13,3],[2,21,15,59],[2,21,19,5]],
 Saturn:[[11,10,4,30],[11,10,11,59],[11,10,19,28],[11,10,26,58],
  [11,10,34,27],[11,10,41,56],[11,10,49,26]]
};
const ukNames={Mercury:'புதன்',Venus:'சுக்கிரன்',Mars:'செவ்வாய்',
 Jupiter:'குரு',Saturn:'சனி'};
const expectedFirst={Mercury:48.712403,Venus:11.913642,
 Mars:6.591066,Jupiter:36.113364,Saturn:2.688162};
const expectedLast={Mercury:41.884296,Venus:12.896869,
 Mars:7.253576,Jupiter:34.269468,Saturn:.875211};
let assertions=0;const yes=(ok,msg)=>{assert.ok(ok,msg);assertions++};
function approx(a,b,epsilon,msg){
 yes(Number.isFinite(a)&&Math.abs(a-b)<=epsilon,
  msg+' got '+a+' expected '+b+' ±'+epsilon);
}
function sourceMean(planet,days){
 return N(DMS(mean2026[planet])+days*orbits[planet]*360/MAHAYUGA_DAYS);
}
/** Independently solve angular separation with dot-product/acos,
 * without calling the UK modulo/min-angle implementation. */
function vectorOracle(mean,trueLon,sh){
 const signed=Math.atan2(Math.sin((trueLon-mean)*RAD),
                        Math.cos((trueLon-mean)*RAD));
 const midpoint=mean+signed/(2*RAD);
 const separation=Math.acos(Math.max(-1,Math.min(1,
   Math.cos((sh-midpoint)*RAD))))/RAD;
 return {midpoint:N(midpoint),kendra:separation,virupa:separation/3};
}
const rows=[];
for(let day=0;day<7;day++){
 const meanSun=sourceMean('Sun',day);
 for(const [planet,name] of Object.entries(ukNames)){
  const own=sourceMean(planet,day),truePlanet=DMS(officialTrue[planet][day]);
  const inner=planet==='Venus'||planet==='Mercury';
  const expectedMean=inner?meanSun:own,expectedSighra=inner?own:meanSun;
  const uk=UK({planet:name,meanSun,meanPlanet:own,truePlanet,
    sourceFrameVerified:day===0});
  const independent=vectorOracle(expectedMean,truePlanet,expectedSighra);
  approx(uk.meanLongitude,expectedMean,1e-8,'UK source-select mean '+planet+day);
  approx(uk.sheeghrocca,expectedSighra,1e-8,'UK source-select sighrocca '+planet+day);
  approx(uk.cheshtaKendra,independent.kendra,1e-8,'UK vs dot product '+planet+day);
  approx(uk.virupa,independent.virupa,1e-8,'UK vs independent vector oracle '+planet+day);
  yes(uk.virupa>=0&&uk.virupa<=60,'UK Cheshta 0..60 Virupa '+planet+day);
  if(day===0)approx(uk.virupa,expectedFirst[planet],.000002,
   'UK 2026 22 March independently printed mean+true '+planet);
  if(day===6)approx(uk.virupa,expectedLast[planet],.000002,
   'UK 2026 March 28 propagated mean + official true '+planet);
  yes(uk.certified===(day===0),
   'Only IMD published original mean snapshot has two independently printed inputs');
  yes(uk.fullShadbalaCertified===false,
   'five planet UK Cheshta cannot certify full Shadbala');
  rows.push({date:'2026-03-'+String(22+day).padStart(2,'0'),
   planet:name,UKcheshtaVirupa:+uk.virupa.toFixed(6),
   officialTruePrinted:true,
   meanProvenance:day===0?'IMD exact date printed Bija':
     'IMD March22 Bija epoch + classical day-orbit propagation',
   fullNatalShadbalaCertified:false});
 }
}
yes(rows.length===35,'IMD official 7 days times 5 bodies = 35');
const unknown=UK({planet:'செவ்வாய்',meanSun:0,meanPlanet:10,
 truePlanet:undefined,sourceFrameVerified:true});
yes(unknown.virupa===null&&!unknown.certified,'missing true fails closed');
assert.throws(()=>UK({planet:'சூரியன்',meanSun:10,meanPlanet:10,
 truePlanet:12}),RangeError);assertions++;
console.log(JSON.stringify({pass:true,assertions,
 source:'Uttara Kalamrita II plus IMD official Rashtriya Panchang 2026 only',
 UKCheshtaOfficialFiveGrahaSnapshotVerified:5,
 UKCheshtaSevenDayActualTrueAndProjectedMeanCompared:35,
 historicalNatalSameFrameTrueOraclesVerified:0,
 UKFullSevenGrahaSixBalaCertified:false,
 UKAyurdayaFinalCertified:false,
 rows}));
}

async function runBundledOracle2() {
  // Consolidated from tests/uttara-kalamrita-ayurdaya-source-only-numeric-oracle.mjs; keep this oracle's assertions isolated.
  const assert = __bundle1mod0.default;
  const { full } = __bundle1mod1;
  const { uttaraAmsaAyurdayaPosition: amsa, uttaraAmsaTimeFraction: fraction, uttaraAmsaGhatikaRatio: ghati, uttaraAyurdayaHouseFraction: house, uttaraAyurdayaBookReductions: reduction, uttaraAyurdayaLagnaFromGhati: lagna, uttaraAyurdayaThreeDrekkanaPunyaPapa: punya, uttaraAyurdayaResearchChart: chart, uttaraAyurdayaTextualYogaEvidence: yoga, uttaraAyurdayaThreeDrekkanaFromResearchChart: threeDrekkana } = __bundle1mod2;
/**
 * UK Section III (Ayurdaya) slokas 1-8 book arithmetic/evidence + seven
 * research-only chart inputs, NEVER customer longevity forecasts.
 * V. Subrahmanya Sastri (1939) PDF pp 13-14.
 * No previously excluded study numbers or other longevity sources.
 */



const star=360/27,pada=star/4;
let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++};
const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++};
const near=(a,b,m,t=1e-10)=>{ok(Number.isFinite(a)&&Math.abs(a-b)<=t,
 m+' '+a+' vs '+b)};
for(let n=0;n<27;n++){
 const x=amsa(n*star+0.01);
 eq(x.completedNakshatras,n,'UK Amsa previous Nakshatra '+n);
 eq(x.completedPadas,0,'UK Amsa nakshatra first pada '+n);
 eq(x.integerYears,(n%3)*4,'UK exact star-mod-three x four');
 eq(x.certifiedContributionYears,null,'unverified actual Pada transit time not invented');
}
const venus=amsa(6*star+0.2);
eq(venus.completedNakshatras,6,'UK III.1 Punarvasu is seventh star');
eq(venus.completedPadas,0,'UK Venus example first quarter of Punarvasu');
eq(venus.integerYears,0,'UK book Venus has zero completed Pada-year');
const bookExample=ghati({
 elapsedDays:1,elapsedGhati:45,elapsedVighati:22,
 totalDays:2,totalGhati:43,totalVighati:32
});
const expectedBookRatio=(60+45+22/60)/(120+43+32/60);
near(bookExample.fraction,expectedBookRatio,
 'UK sloka1 published Venus elapsed 1d45gh22v / full 2d43gh32v');
ok(bookExample.fraction>7/12&&bookExample.fraction<8/12,
 'UK Venus fraction in printed approximate seven-month interval');
const equalMs=fraction({enteredMs:0,birthMs:650,exitedMs:1000});
near(equalMs.fraction,.65,'UK actual timestamp traversal ratio');
for(let houseNumber=12;houseNumber>=7;houseNumber--){
 const denom=13-houseNumber;
 near(house({house:houseNumber,benefic:false}).lossFraction,1/denom,
  'UK III.2 malefic 12th to 7th loss sequence '+houseNumber);
 near(house({house:houseNumber,benefic:true}).lossFraction,1/(2*denom),
  'UK III.2 benefic half loss '+houseNumber);
}
near(house({house:1,benefic:false}).lossFraction,0,'unlisted position zero reduction');
const reduced=reduction({fractionalAmsaYears:8,house:11,benefic:false,
 atDebilitation:true,inEnemySign:true,eclipsedOrWarDefeated:true});
near(reduced.provisionalContributionYears,8*.5*.5*(2/3)*.5,
 'UK III.2 ordered half-house/half-deb/two-thirds-enemy/half-war');
eq(reduced.certifiedIndividualLifespanYears,null,'no final lifespan from individual factor');
near(lagna({elapsedGhatikas:5,risingPeriodGhatikas:10}).bookResearchYears,4.5,
 'UK III.3 9 * elapsed ghatis / sign rise ghatis');
const pp=punya({ukSaptavargajaRupas:[1,1,2]});
near(pp.punyaRupa,1,'UK III.4 Punya = sum/4');
near(pp.papaRupa,3,'UK III.4 Papa = 4-Punya');
near(pp.formalCycleYears,3*120/7,'UK III.5 formal 120/7');
near(pp.boundedCycleYears,360/7,'UK III.5 modulo 120 bounded cycle');
eq(pp.finalHumanLifespanYears,null,'no certified predicted age');
assert.throws(()=>ghati({elapsedDays:2,elapsedGhati:0,elapsedVighati:0,
 totalDays:1,totalGhati:0,totalVighati:0}),RangeError);checks++;
assert.throws(()=>fraction({enteredMs:0,birthMs:1001,exitedMs:1000}),RangeError);checks++;

const yogaFixture=yoga({planets:[
 {name:'புதன்',bhava:1},{name:'குரு',bhava:11},
 {name:'சுக்கிரன்',bhava:6}
]});
eq(yogaFixture.beneficPlacements.map(x=>x.ukIII6Group),
 ['kendra-or-trikona','second-third-eleventh','sixth-eighth-twelfth'],
 'UK Section III.6 independent house classification for three grahas');
eq(yogaFixture.allAspectPredicatesIndependentlyEstablished,false,
 'Unknown aspect evidence remains UNKNOWN');
eq(yogaFixture.sourceAspectChecks.lagnaLordBeneficAspect,null,
 'UK III.7 no default benefic aspect guess');
eq(yogaFixture.deathAgePrediction,null,
 'UK III.6-8 makes no death-age forecast');
eq(yogaFixture.customerOutputAllowed,false,
 'UK III.6-8 isolated from Horoscope and Matching');
assert.throws(()=>yoga({planets:[],verifiedAspectFlags:{lagnaBeneficAspect:42}}),TypeError);checks++;
assert.throws(()=>amsa(NaN),TypeError);checks++;
assert.throws(()=>house({house:12,benefic:null}),TypeError);checks++;
const births=[
 ['1971-05-04','05:05'],['1974-01-11','16:04'],
 ['1992-07-31','22:05'],['1994-06-15','13:03'],
 ['2015-09-06','09:30']
];
let found=0,certified=0;const researchResults=[];
for(const [date,time] of births){
 const r=await full({date,time,lat:11.232,lon:78.88,
  utcOffsetMinutes:330,referenceDate:'2026-10-17',name:'UK III private math QA'});
 ok(r.ok,'valid seven graha and Lagna chart '+date);
 const strength=Object.fromEntries(r.chart.planets.filter(p=>p.strengthUttaraKalamrita).map(p=>
  [p.name,p.strengthUttaraKalamrita]));
 const ukThree=threeDrekkana({lagnaLongitude:r.chart.lagna.longitude,
   ukStrengthByGraha:strength});
 eq(ukThree.entries.length,3,'UK 3 decanates per Lagna '+date);
 eq(ukThree.missing.length,0,'all UK research-only Saptavargaja source intermediates available '+date);
 ok(ukThree.bookIntermediate?.punyaRupa>=0,'UK III.4 Punya research computed '+date);
 ok(ukThree.bookIntermediate?.papaRupa>=0,'UK III.4 Papa research computed '+date);
 eq(ukThree.finalNativeLifespanYears,null,'UK 3 decanate cannot certify life years '+date);
 const input=chart({planets:r.chart.planets,lagnaLongitude:r.chart.lagna.longitude,
  certifiedUttaraShadbala:false});
 eq(input.publishedToCustomers,false,'no lifespan report output '+date);
 eq(input.completeAyurdayaCertified,false,'Shadbala unresolved blocks final Ayus '+date);
 eq(input.personPredictedLifespan,null,'no predicted years visible '+date);
 eq(input.deathTimingPrediction,null,'no death timing generated '+date);
 eq(input.UKShadbalaInputCertified,false,'UK Shadbala still uncertified '+date);
 const row={date,grahas:{},ascendant:input.lagna.integerYears};
 for(const [name,value] of Object.entries(input.seven)){
  found++;eq(value.certifiedContributionYears,null,'no transit time evidence '+date+name);
  ok(Number.isInteger(value.integerYears)&&value.integerYears>=0&&value.integerYears<=11,
   'UK III.1 each graha 0..11 completed Navamsa-years '+date+name);
  row.grahas[name]=value.integerYears;
 }
 certified+=Number(input.completeAyurdayaCertified);
 researchResults.push(row);
}
eq(found,35,'UK Section III first position stage: 5 natal dates ×7 grahas');
eq(certified,0,'No fabricated independent lifespan certificate');
console.log(JSON.stringify({pass:true,checks,
 source:'Uttara Kalamrita Khanda I Section III only, Sastri 1939',
 publishedVenusTextbookTransitRatio:bookExample.fraction,
 fiveNatalDatesTested:births.length,sevenPlanetIntermediatePositions:found,
 timeOfDeathPredictions:0,wholeAyurdayaNumericallyCertified:false,
 completeUKShadbalaPrerequisiteMet:false,customerReportChanged:false,
 birthResearchResults:researchResults}));
}

async function runBundledOracle3() {
  // Consolidated from tests/v363-bphs-swiss-solar-cheshta-regression.mjs; keep this oracle's assertions isolated.
  const assert = __bundle2mod0.default;
  const { getSwe, C } = __bundle2mod1;
  const { full } = __bundle2mod2;
  const { traditionalAharganaLords } = __bundle2mod3;
  const { bphsGmstDegrees, bphsApparentSolarHour, bphsSolarAltitudeDegrees, bphsSwissSolarEvents, bphsSwissKalaContext, bphsCheshtaFromOrbitalElements } = __bundle2mod4;
// V363 BPHS I Chapter 27 temporal Bala, independently compared with the
// Swiss Ephemeris *rise_trans* outputs (Swiss 2.10.03 / Moshier fallback).
// Reference times were generated independently using pyswisseph.rise_trans,
// Sun, 11.232N 78.88E, 0m altitude, sea-level default atmosphere, 15°C.
// The shipped WASM provider has NO rise_trans API: this test uses only
// its independent swe_calc(EQUATORIAL) position to solve the rise/set roots.





let checks=0;
const yes=(v,m)=>{assert.ok(v,m);checks++;};
const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++;};
const near=(a,b,eps,m)=>{assert.ok(Number.isFinite(a)&&Math.abs(a-b)<eps,m+' got '+a+' expected '+b);checks++;};
const w=await getSwe();
function solarAtUtcMs(ms){
  const d=new Date(ms);
  const j=w.utcToJd(d.getUTCFullYear(),d.getUTCMonth()+1,d.getUTCDate(),
    d.getUTCHours(),d.getUTCMinutes(),d.getUTCSeconds()+d.getUTCMilliseconds()/1000);
  const q=w.calc(j.et,C.SUN,2|2048);
  return {jdUt:j.ut,rightAscensionDegrees:q.longitude,declinationDegrees:q.latitude};
}
const jd=2451545.0,gmst=bphsGmstDegrees(jd),lon=78.88;
near(bphsApparentSolarHour(jd,gmst+lon,lon),12,1e-10,'Hour angle zero = apparent noon');
near(bphsApparentSolarHour(jd,gmst+lon+180,lon),0,1e-10,'Hour angle 180 = apparent midnight');
near(bphsApparentSolarHour(jd,gmst+lon+90,lon),6,1e-10,'Sun east of meridian = morning 06:00');
near(bphsApparentSolarHour(jd,gmst+lon-90,lon),18,1e-10,'Sun west of meridian = evening 18:00');
near(bphsSolarAltitudeDegrees(jd,gmst+lon,0,0,lon),90,1e-9,'Equatorial Sun at zenith');
near(bphsSolarAltitudeDegrees(jd,gmst+lon+180,0,0,lon),-90,1e-9,'Equatorial Sun at nadir');
const refs=[
 ['1994-06-15','13:03',351+30/60,1118+10/60],
 ['2015-09-06','09:30',364+25/60,1101+25/60],
 ['1992-07-31','22:05',362+16/60,1119+14/60],
 ['1971-05-04','05:05',355+2/60,1107+43/60],
 ['1974-01-11','16:04',396+49/60,1087+46/60]
];
for(const [date,time,sunriseRef,sunsetRef] of refs){
 const s=bphsSwissSolarEvents(date,11.232,78.88,330,solarAtUtcMs);
 yes(s!==null,date+' Swiss Sun altitude has rise/set');
 near(s.sunriseMinutes,sunriseRef,.3,date+' rise vs independent Swiss rise_trans (18 sec)');
 near(s.sunsetMinutes,sunsetRef,.3,date+' set vs independent Swiss rise_trans (18 sec)');
 eq(s.ephemerisBased,true,date+' Swiss equatorial position used');
 eq(s.meteorologicallyExact,false,date+' not falsely claiming weather precision');
 const tc=bphsSwissKalaContext({date,time,latitude:11.232,longitude:78.88,utcOffsetMinutes:330},
   solarAtUtcMs,traditionalAharganaLords);
 yes(tc?.ephemerisBased===true,date+' BPHS Kala sector from numerical solar events');
 yes(tc.horaStep>=0&&tc.horaStep<=23,date+' 24 hora sectors');
 yes(tc.tribhagaIndex>=0&&tc.tribhagaIndex<=2,date+' three parts of true day or night');
 const r=await full({date,time,lat:11.232,lon:78.88,utcOffsetMinutes:330,referenceDate:'2026-10-17',name:'V363 true Sun'});
 yes(r.ok,'actual Swiss natal birth '+date);
 const actual=r.chart.planets.filter(x=>['சூரியன்','சந்திரன்','செவ்வாய்','புதன்','குரு','சுக்கிரன்','சனி'].includes(x.name));
 eq(actual.length,7,'seven natal planets');
 for(const p of actual){
   yes(p.strength6.evidence.solarTimeMethod.includes('Swiss Sun ephemeris'),date+' '+p.name+' Swiss-based Kala source');
   yes(Number.isFinite(p.strength6.evidence.birthApparentSolarHour),date+' '+p.name+' apparent hour valid');
   yes(Number.isFinite(p.strength6.totalVirupa),date+' '+p.name+' finite Shadbala');
   eq(p.strength6.classicalCertified,false,date+' five-planet Cheshta still not certified');
 }
}
// Arctic polar winter: do not invent sunrise for a day without one.
eq(bphsSwissSolarEvents('2026-12-21',69.65,18.96,60,solarAtUtcMs),null,'Tromso polar winter: no fabricated solar event');
// BPHS Ch27 vv24-25: exact Cheshta arithmetic GIVEN source-proven
// mean / true / seeghrocha inputs. The current Swiss WASM does not offer
// classical mean planetary longitudes / sheeghrocha, so this remains
// an isolated, non-natal-completeness calculator.
near(bphsCheshtaFromOrbitalElements(20,40,210).virupa,60,1e-12,'BPHS 180-degree kendra => 60 Virupa');
near(bphsCheshtaFromOrbitalElements(10,50,120).virupa,30,1e-12,'BPHS 90-degree kendra => 30 Virupa');
near(bphsCheshtaFromOrbitalElements(359,1,90).virupa,30,1e-12,'BPHS mean/true midpoint crosses 360 degrees');
near(bphsCheshtaFromOrbitalElements(10,10,10).virupa,0,1e-12,'BPHS zero kendra zero Cheshta');
near(bphsCheshtaFromOrbitalElements(10,10,190).virupa,60,1e-12,'BPHS opposite apogee max');
eq(bphsCheshtaFromOrbitalElements(20,40,210).natalCertified,false,'exact arithmetic is not natal input certification');
assert.throws(()=>bphsCheshtaFromOrbitalElements(10,undefined,20),TypeError);checks++;
console.log(JSON.stringify({pass:true,assertions:checks,bphsReference:'R Santhanam BPHS I Chapter 27 verses 8-13 and 24-25',independentEphemerisOracle:'Swiss Ephemeris rise_trans v2.10.03 five Perambalur historical dates, within 18 seconds at sea level',realNatalCharts:refs.length,cheshtaArithmeticGivenInputs:true,fullShadbalaCertified:false,blockers:['Traditional five-planet mean longitudes/Sheeghrocha unavailable in deployed Swiss wrapper','BPHS Chapter26 Drig special-aspect prose vs explanatory note not numerically reconciled','Atmospheric refraction, elevation and meteorological values not supplied']}));
}

async function runBundledOracle4() {
  // Consolidated from tests/v364-swiss-orbital-cheshta-evidence-regression.mjs; keep this oracle's assertions isolated.
  const assert = __bundle3mod0.default;
  const { getSwe, C } = __bundle3mod1;
  const { bphsFivePlanetCheshtaFromClassicalMeans: classic, bphsCheshtaFromOrbitalElements: formula } = __bundle3mod2;
  const { full } = __bundle3mod3;
  const { compareSwissOsculatingWithClassicalCheshta: explore } = __bundle3mod4;
// V364 — Swiss modern osculating orbital elements versus BPHS/UK classical
// Cheshta eligibility. Independent Swiss Ephemeris 2.10.03 pyswisseph
// get_orbital_elements(..., FLG_MOSEPH) approximate numerical reference,
// generated independently of the local Swiss-WASM SWIEPH data.
//
// Mean longitudes herein are HELIOCENTRIC MODERN MEANS. NEVER auto-substitute
// for the SIDEREAL CLASSICAL BPHS mean longitudes / Sheeghrocha.
// The five-graha mean-vs-Sheeghrocha input-selection oracle is taken from
// Uttara Kalamrita Ch II pp42–43, not copied from PyJHora AGPL code.





const norm=x=>((x%360)+360)%360;
let n=0;
function ok(x,desc){assert.ok(x,desc);n++}
function eq(a,b,desc){assert.deepEqual(a,b,desc);n++}
function close(a,b,tol,desc){assert.ok(Number.isFinite(a)&&Math.abs(a-b)<=tol,desc+' actual='+a+' oracle='+b);n++}
function arc(a,b){const diff=Math.abs(norm(a)-norm(b));return Math.min(diff,360-diff)}
// Header fields are [Mercury, Venus, Mars, Jupiter, Saturn, Earth] in degrees.
// Moshier reference is a separate Swiss astronomical model; expect small
// model-dependent differences from the local SWIEPH version.
const cases=[
 ['1994-06-15','13:03',2449518.815279907,[240.41616,175.76815,13.65972,226.01862,342.11635,263.43682]],
 ['2015-09-06','09:30',2457271.667455833,[287.71597,356.84626,116.41815,150.20734,241.52706,344.71967]],
 ['1992-07-31','22:05',2448835.191657222,[322.79965,160.51305,15.41386,169.21790,319.27536,309.65328]],
 ['1971-05-04','05:05',2441075.483119417,[247.44134,328.44600,269.07160,244.55615,59.44936,221.61601]],
 ['1974-01-11','16:04',2442058.940800740,[312.08139,104.07795,64.44113,326.26168,92.30399,110.91820]]
];
const wes=await getSwe();
eq(typeof wes.orbitalElements,'function','existing WASM exposes Swiss orbital elements read-only');
const identities=[[C.MERCURY,'Mercury'],[C.VENUS,'Venus'],[C.MARS,'Mars'],[C.JUPITER,'Jupiter'],[C.SATURN,'Saturn'],[14,'Earth']];
const summaries=[];
for(const [date,time,referenceEt,means] of cases){
 const [yy,mm,dd]=date.split('-').map(Number),[hh,min]=time.split(':').map(Number);
 const utc=new Date(Date.UTC(yy,mm-1,dd,hh,min)-330*60_000);
 const ephe=wes.utcToJd(utc.getUTCFullYear(),utc.getUTCMonth()+1,utc.getUTCDate(),
     utc.getUTCHours(),utc.getUTCMinutes(),utc.getUTCSeconds());
 close(ephe.et,referenceEt,1e-4,date+' Swiss ET Julian day oracle');
 const row=[];
 for(let i=0;i<identities.length;i++){
   const [body,name]=identities[i];
   const o=wes.orbitalElements(ephe.et,body);
   ok(o.semiMajorAxisAU>0.2&&o.semiMajorAxisAU<32,date+' '+name+' credible orbital radius');
   ok(o.eccentricity>=0&&o.eccentricity<.25,date+' '+name+' physical eccentricity');
   ok(o.meanLongitude>=0&&o.meanLongitude<360,date+' '+name+' modern longitude [0,360)');
   ok(arc(o.meanLongitude,norm(o.meanAnomaly+o.perihelionLongitude))<1e-5,
       date+' '+name+' independent mean longitude = perihelion + mean anomaly');
   ok(arc(o.meanLongitude,means[i])<0.25,
       date+' '+name+' Swiss SWIEPH vs independent pyswisseph Moshier mean degree');
   eq(o.frame,'modern-heliocentric-osculating',date+' '+name+' coordinates clearly marked');
   eq(o.BPHSClassicalCertified,false,date+' '+name+' not falsely BPHS certified');
   eq(o.canReplaceClassicalMeanLongitude,false,date+' '+name+' cannot override BPHS calculator');
   row.push({planet:name,swissModernMeanDeg:Number(o.meanLongitude.toFixed(4)),
      moshierIndependentMeanDeg:means[i]});
 }
 const natal=await full({date,time,lat:11.232,lon:78.88,utcOffsetMinutes:330,referenceDate:'2026-10-17',name:'V364 read-only orbital comparison'});
 ok(natal.ok,date+' natal calculations preserved');
 for(const body of natal.chart.planets.filter(x=>['செவ்வாய்','புதன்','குரு','சுக்கிரன்','சனி'].includes(x.name))){
   eq(body.strength6.classicalCertified,false,date+' '+body.name+' classical certification is not faked');
   ok(Number.isFinite(body.strength6.components.cheshta),date+' '+body.name+' existing Cheshta finite');
 }
 summaries.push({date,reference:row});
}
// The source rule from UK is mathematical and requires genuine classical
// sidereal mean and true longitudes in a compatible frame.
const out={
 'செவ்வாய்':[80,100,20,70/3],
 'புதன்':[20,50,55,20/3],
 'குரு':[130,110,20,100/3],
 'சுக்கிரன்':[20,80,91,41/3],
 'சனி':[270,280,20,105/3]
};
const sunMean=20,owned={'செவ்வாய்':80,'புதன்':55,'குரு':130,'சுக்கிரன்':91,'சனி':270};
const trueLon={'செவ்வாய்':100,'புதன்':50,'குரு':110,'சுக்கிரன்':80,'சனி':280};
for(const [name,[m,t,sh,k]] of Object.entries(out)){
 const r=classic(name,sunMean,owned[name],trueLon[name]);
 close(r.meanLongitude,m,1e-10,name+' classical selector mean');
 close(r.trueLongitude,t,1e-10,name+' classical selector true');
 close(r.sheeghrocha,sh,1e-10,name+' classical selector Sheeghrocha');
 close(r.virupa,k,1e-10,name+' exact BPHS Cheshta Virupas after UK selection');
 eq(r.natalCertified,false,name+' classical source inputs not certified');
}
close(classic('செவ்வாய்',359,1,3).virupa,1,1e-10,'360 degree classical mean/true boundary');
assert.throws(()=>classic('சூரியன்',20,80,100),RangeError);n++;
assert.throws(()=>classic('செவ்வாய்',20,undefined,100),TypeError);n++;
assert.throws(()=>wes.orbitalElements(2451545,C.SUN),RangeError);n++;
assert.throws(()=>wes.orbitalElements(NaN,C.MARS),RangeError);n++;
assert.throws(()=>wes.orbitalElements(2451545,C.MARS,65536),RangeError);n++;
// Exercise the isolated research-only comparison in addition to the lower
// level Swiss getter: 1 real birth, 5 grahas, and hard no-production gates.
const exploreOut=await explore({date:'1992-07-31',time:'22:05',utcOffsetMinutes:330});
eq(exploreOut.planets.length,5,'Research comparator computes five book-eligible planets');
eq(exploreOut.classicalCheshtaCertified,false,'Research trial cannot certify classical Cheshta');
eq(exploreOut.productionShadbalaChanged,false,'Research trial does not mutate live Shadbala');
for(const p of exploreOut.planets){
 ok(p.withinArithmeticRange,'Research trial '+p.planet+' gives 0-60 only as arithmetic range');
 eq(p.canReplaceCurrentStrength3,false,'Research trial '+p.planet+' cannot replace current strength');
 eq(p.natalCertified,false,'Research trial '+p.planet+' not a verified book mean');
 eq(p.sourceFrames.trueLongitude,'Swiss geocentric Lahiri sidereal','Research trial '+p.planet+' true longitude frame');
}
await assert.rejects(explore({date:'invalid',time:'22:05',utcOffsetMinutes:330}),RangeError);n++;
console.log(JSON.stringify({pass:true,assertions:n,method:'read-only modern Swiss orbital elements verified against independent Moshier five Perambalur births; book five-planet BPHS+UK input selection',comparison:summaries,shadbalaClassicalCertified:false,liveCheshtaSource:'unchanged speed-based provisional',notes:['Modern orbital elements not classical mean/Sheeghrocha','PyJHora uses a different Ujjain-1900 mean-motion model under AGPL-3.0 and is NOT copied','BPHS true full numerical certification requires independently validated classical sidereal mean positions']}));
}

async function runBundledOracle5() {
  // Consolidated from tests/v366-bphs-published-cheshta-numerical-regression.mjs; keep this oracle's assertions isolated.
  const assert = __bundle4mod0.default;
  const { sauraMeanOrbitalLongitude: pureMean } = __bundle4mod1;
  const { bphsFivePlanetCheshtaFromClassicalMeans: bphs } = __bundle4mod2;
/**
 * V366: NUMERICAL CERTIFICATION SCOPE = PUBLISHED SNAPSHOTS ONLY.
 *
 * Oracle A: India Meteorological Department / Ministry of Earth Sciences,
 * Rashtriya Panchang Saka 1948 (2026-27), Chaitra 1 = March 22 2026
 * 05:30 IST / 00:00 UTC. "Mean Nirayana longitude of planets by Bija
 * Corrections to Surya siddhanta elements" AND Chaitra "Nirayana Longitudes
 * of Planets" day 1 (geocentric true longitudes).
 * https://packolkata.imd.gov.in/panchang/en/bija_corrections
 * https://packolkata.imd.gov.in/panchang/en/longitude_planets
 *
 * BPHS I ch27 verses 24-25 and Uttara Kalamrita II pp42-43 govern
 * cheshta input selector and angle / 3 Virupas. A separately written
 * circular midpoint/kendra oracle checks the production pure helper.
 *
 * This does NOT independently derive true positions for natal 1971-2015
 * or justify mixing Swiss Lahiri with classical mean inputs in production.
 */



const JD=2461121.5; // 2026-03-22 00:00 UTC.
const names=['Mercury','Venus','Mars','Jupiter','Saturn'];
const ta={Mercury:'புதன்',Venus:'சுக்கிரன்',Mars:'செவ்வாய்',Jupiter:'குரு',Saturn:'சனி'};
const close=(a,b,t,label)=>{assert.ok(Number.isFinite(a)&&Math.abs(a-b)<=t,
 label+': got '+a+' printed or independent expected '+b+' tolerance '+t);checks++};
const deg=([r,d,m,s])=>30*r+d+m/60+s/3600;
const arc=(a,b)=>Math.abs(((a-b+540)%360)-180);
function independentBphsOracle(mean,trueLon,sighrocca){
 // This independent midpoint solution uses signed unit-vector angle,
 // not modulo-based midpoint calculation in the production helper.
 const toRad=Math.PI/180;
 const diff=Math.atan2(Math.sin((trueLon-mean)*toRad),Math.cos((trueLon-mean)*toRad));
 const midpoint=mean+diff/toRad/2;
 const kendra=Math.acos(Math.cos((sighrocca-midpoint)*toRad))/toRad;
 return {midpoint:((midpoint%360)+360)%360,kendra,virupa:kendra/3};
}
let checks=0;
// Each published mean contains 4-value [sign, degree, minute, second] fields.
// Bija includes its separate sign. NO fitted model parameters.
const imdMeanSurya=Object.freeze({
 Sun:[11,4,55,55.74], Mercury:[6,4,48,4.79],
 Venus:[0,29,23,48.06], Mars:[10,8,8,37.8],
 Jupiter:[3,0,52,52.68], Saturn:[11,10,19,39.5]
});
const imdBijaDegrees=Object.freeze({
 Sun:21/60+46.75/3600,
 Mercury:-(6+7/60+26/3600),
 Venus:-(8+28/60+18.98/3600),
 Mars:1+50/60+54.16/3600,
 Jupiter:-(4+39/60+49.03/3600),
 Saturn:6+18/60+59.78/3600
});
const imdCorrectedMean=Object.freeze({
 Sun:[11,5,17,42.49],Mercury:[5,28,40,38.79],
 Venus:[0,20,55,29.08],Mars:[10,9,59,31.96],
 Jupiter:[2,26,13,3.65],Saturn:[11,16,38,39.28]
});
const printedTrueOnMarch22=Object.freeze({
 Mercury:[10,14,20,3],Venus:[11,25,4,21],
 Mars:[10,21,3,6],Jupiter:[2,21,3,10],Saturn:[11,10,4,30]
});
// Independent human-calculated BPHS / UK three-input VIRUPA values, based
// solely on IMD published corrected means and true longitudes. In particular,
// Venus [335.295°, 355.073°, 20.925°] -> 11.913642 Virupas.
const expected2026=Object.freeze({
 Mercury:48.712403,Venus:11.913642,Mars:6.591066,
 Jupiter:36.113364,Saturn:2.688162
});
const correctedComputed={};
for(const body of ['Sun',...names]){
  const ancient=pureMean(JD,body);
  const printedUncorrected=deg(imdMeanSurya[body]);
  close(arc(ancient,printedUncorrected)*3600,0,1.75,
    body+' separate V365 ancient mean vs IMD ancient mean arcsec');
  correctedComputed[body]=((ancient+imdBijaDegrees[body])%360+360)%360;
  close(arc(correctedComputed[body],deg(imdCorrectedMean[body]))*3600,0,1.75,
    body+' IMD Bija sign and corrected mean arcsec');
}
const actual2026={};
for(const body of names){
  const isInner=body==='Mercury'||body==='Venus';
  const mean=isInner?correctedComputed.Sun:correctedComputed[body];
  const sh=isInner?correctedComputed[body]:correctedComputed.Sun;
  const planetTrue=deg(printedTrueOnMarch22[body]);
  const result=bphs(ta[body],correctedComputed.Sun,correctedComputed[body],planetTrue);
  close(arc(result.meanLongitude,mean),0,1e-9,body+' 2026 BPHS mean selector');
  close(arc(result.sheeghrocha,sh),0,1e-9,body+' 2026 UK Sheeghrocha selector');
  const independent=independentBphsOracle(mean,planetTrue,sh);
  close(result.cheshtaKendraDegrees,independent.kendra,1e-9,
      body+' 2026 independent vector-based circular Kendra');
  close(result.virupa,independent.virupa,1e-9,
      body+' 2026 independent vector-based Cheshta Bala');
  close(result.virupa,expected2026[body],0.001,
      body+' 2026 printed inputs -> independently precomputed Virupas');
  assert.ok(result.virupa>=0&&result.virupa<=60,body+' 2026 valid Virupa range');checks++;
  assert.equal(result.natalCertified,false);checks++;
  actual2026[body]=Number(result.virupa.toFixed(6));
}
// Certification reference for this test: IMD Rashtriya Panchang only.
// External worked-example figures are intentionally excluded from this gate.
// IMD publishes the true positions for every date Mar 22-28; ensure a
// second source's daily real planetary longitudes are not treated as
// constant or falsely called computed classical natal positions.
const chaitraSeven={
 Mercury:[[10,14,20,3],[10,14,29,42],[10,14,44,44],[10,15,4,55],
          [10,15,29,58],[10,15,59,36],[10,16,33,35]],
 Venus:[[11,25,4,21],[11,26,18,34],[11,27,32,45],[11,28,46,54],
        [0,0,1,0],[0,1,15,5],[0,2,29,7]],
 Mars:[[10,21,3,6],[10,21,50,14],[10,22,37,20],[10,23,24,26],
       [10,24,11,30],[10,24,58,34],[10,25,45,35]],
 Jupiter:[[2,21,3,10],[2,21,5,22],[2,21,7,44],[2,21,10,18],
          [2,21,13,3],[2,21,15,59],[2,21,19,5]],
 Saturn:[[11,10,4,30],[11,10,11,59],[11,10,19,28],[11,10,26,58],
         [11,10,34,27],[11,10,41,56],[11,10,49,26]]
};
for(const body of names){
 const days=chaitraSeven[body].map(deg);
 close(arc(days[0],deg(printedTrueOnMarch22[body])),0,1e-9,
       body+' IMD daily table joins March22 certificate fixture');
 for(let day=1;day<7;day++){
  assert.ok(arc(days[day],days[day-1])<2,
    body+' IMD published daily geocentric true longitude physically continuous day '+day);checks++;
 }
}
/*
 * Official IMD Chaitra 1-7 (2026 Mar22-28): all 35 true geocentric
 * Nirayana planet positions are PRINTED, not code-generated. The IMD
 * publishes mean/Bija parameters at Mar22 only; advance those *printed*
 * Bija-corrected mean/sighrocca orbits by canonical Saura daily velocities
 * (not by production pureMean) for each of the other six dates.
 *
 * Reconcile each of the 35 printed true-longitude -> BPHS Ch27 Cheshta
 * Virupa calculations with a separately coded vector-angle oracle.
 * This certifies arithmetic on externally printed *snapshot inputs*,
 * NOT historical 1971-2015 natal classical true longitudes/Bija or full
 * Shadbala. The 6 daily updated means are propagated, not independently
 * printed; do not portray them as distinct official mean observations.
 */
const imdWeekCheshtaNumeric=[];
const sourceMahayugaCivilDays=1577917828;
const sourceRevolutions=Object.freeze({
 Sun:4320000,Mercury:17937060,Venus:7022376,
 Mars:2296832,Jupiter:364220,Saturn:146568
});
const norm360=x=>((x%360)+360)%360;
function imdOriginDailyMean(body,offsetDays){
 return norm360(deg(imdCorrectedMean[body])+
   offsetDays*sourceRevolutions[body]*360/sourceMahayugaCivilDays);
}
const independentMar28Virupas=Object.freeze({
 Mercury:41.884296,Venus:12.896869,Mars:7.253576,
 Jupiter:34.269468,Saturn:0.875211
});
for(let day=0;day<7;day++){
 const printedBase=imdOriginDailyMean('Sun',day);
 const out={date:'2026-03-'+String(22+day).padStart(2,'0'),
  utc:'00:00Z',printedTrueGrahas:{}};
 close(arc(printedBase,pureMean(JD+day,'Sun')+imdBijaDegrees.Sun)*3600,
   0,1.75,'IMD-projected Sun consistent with ancient orbit day '+day);
 for(const planet of names){
  const own=imdOriginDailyMean(planet,day);
  const isInner=planet==='Venus'||planet==='Mercury';
  const mean=isInner?printedBase:own,sighrocca=isInner?own:printedBase;
  const trueFromImd=deg(chaitraSeven[planet][day]);
  const calculated=bphs(ta[planet],printedBase,own,trueFromImd);
  const oracle=independentBphsOracle(mean,trueFromImd,sighrocca);
  close(calculated.meanLongitude,mean,1e-9,
    out.date+' '+planet+' same-frame independent printed-origin mean mapping');
  close(calculated.sheeghrocha,sighrocca,1e-9,
    out.date+' '+planet+' same-frame independent printed-origin sighrocca mapping');
  close(calculated.cheshtaKendraDegrees,oracle.kendra,1e-9,
    out.date+' '+planet+' independently computed circular Cheshta kendra');
  close(calculated.virupa,oracle.virupa,1e-9,
    out.date+' '+planet+' independent IMD snapshot Cheshta Virupa');
  if(day===0)close(calculated.virupa,expected2026[planet],.000002,
    planet+' Chaitra 1 seven-day proof preserves first-day published snapshot');
  if(day===6)close(calculated.virupa,independentMar28Virupas[planet],.000002,
    planet+' Chaitra 7 independent hand-vector fixture of printed inputs');
  assert.ok(calculated.virupa>=0&&calculated.virupa<=60&&
    calculated.natalCertified===false,planet+' '+out.date+' still not natal certified');
  checks++;
  out.printedTrueGrahas[planet]={
    imdPrintedTrueDegrees:+trueFromImd.toFixed(6),
    imdOriginPropagatedMeanDegrees:+mean.toFixed(6),
    imdOriginPropagatedSighroccaDegrees:+sighrocca.toFixed(6),
    independentCheshtaVirupa:+oracle.virupa.toFixed(6),
    bphsCalculatedCheshtaVirupa:+calculated.virupa.toFixed(6),
    fullShadbalaCertified:false
  };
 }
 imdWeekCheshtaNumeric.push(out);
}
assert.equal(imdWeekCheshtaNumeric.length,7);checks++;
assert.ok(imdWeekCheshtaNumeric.every(x=>Object.keys(x.printedTrueGrahas).length===5));checks++;
assert.throws(()=>bphs('சூரியன்',1,2,3),RangeError);checks++;
assert.throws(()=>bphs('செவ்வாய்',1,2,undefined),TypeError);checks++;
console.log(JSON.stringify({
 pass:true,assertions:checks,
 certifiedScope:'five-planet BPHS Cheshta on seven IMD Panchang dates using IMD-printed true positions and IMD-origin propagated same-frame mean positions',
 imdDate:'2026-03-22T00:00:00Z',
 imdSource:'IMD Rashtriya Panchang 2026-27 Bija-corrected mean and five geocentric true Nirayana',
 imdBalaVirupas:actual2026,
 printedIndependentTrueDailyPositionsChecked:35,
 imdSevenDailyPrintedTrueFiveGrahaCheshta:imdWeekCheshtaNumeric,
 imdDailyCheshtaArithmeticCompared:35,
 historicalNatalSameFrameTrueOraclesCertified:0,
 natalHistoricalTrueLongitudeEngineCertified:false,
 liveProductionCheshtaChanged:false,
 fullFivePlanetShadbalaCertified:false
}));
}

async function runBundledOracle6() {
  // Consolidated from tests/v367-saura-true-natal-certification-gate.mjs; keep this oracle's assertions isolated.
  const assert = __bundle5mod0.default;
  const { sauraFourPassTrueLongitude: compute, sauraMandoccaResearch } = __bundle5mod1;
  const { sauraMeanOrbitalLongitude: mean } = __bundle5mod2;
  const { bphsFivePlanetCheshtaFromClassicalMeans: bphs } = __bundle5mod3;
// V367 genuine independent classical true-longitude comparisons.
// Two published sample tables are independent inputs, NOT synthetic fixtures.
// The unverified natal True/Bala MUST NOT turn classicalCertified to true.




const tamil={Mercury:'புதன்',Venus:'சுக்கிரன்',Mars:'செவ்வாய்',Jupiter:'குரு',Saturn:'சனி'};
const inner=new Set(['Mercury','Venus']),arc=(a,b)=>Math.abs(((a-b+540)%360)-180);
let assertions=0;
function check(x,message){assert.ok(x,message);assertions++}
const site=Object.freeze({
 Mercury:[321.64431,220.46066,81.92843,338.23698],
 Venus:[321.64431,79.8545,80.8769,7.29285],
 Mars:[263.63927,130.03798,321.64431,280.25106],
 Jupiter:[259.86122,171.34402,321.64431,264.43632],
 Saturn:[224.31668,236.62491,321.64431,232.00407]
});
// Source A: rkanetech.com/true-position, Caitanya example.
const siteRows=[];
for(const [planet,[meanLongitude,mandocca,sheeghrocha,published]] of Object.entries(site)){
 const r=compute({planet,meanLongitude,mandocca,sheeghrocha}),err=arc(r.trueLongitude,published);
 check(err<=0.35,planet+' external worked example 0.35 degree exploratory tolerance');
 check(!r.historicallyCertified&&!r.liveCheshtaEligible,planet+' safe production guard');
 siteRows.push({planet,actual:+r.trueLongitude.toFixed(6),published,differenceDegrees:+err.toFixed(6)});
}
// Source B: Santhoju et al., Journal of Astrophysics and Astronomy 46:9
// (2025) Tables 6-7, Mandi sunrise April 9, 2024.
const paper=Object.freeze({
 Mercury:[353.2261,220.4772,151.249,0.738],
 Venus:[353.2261,79.8785,328.7388,343.9867],
 Mars:[295.0651,130.0471,353.2261,319.9003],
 Jupiter:[31.7206,171.3844,353.2261,28.2115],
 Saturn:[316.5202,236.6267,353.2261,313.0236]
});
const paperRows=[];
for(const [planet,[meanLongitude,mandocca,sheeghrocha,published]] of Object.entries(paper)){
 const r=compute({planet,meanLongitude,mandocca,sheeghrocha}),err=arc(r.trueLongitude,published);
 check(Number.isFinite(err)&&err<5,planet+' raw reproducible evidence; do not silently fit');
 paperRows.push({planet,actual:+r.trueLongitude.toFixed(6),published,differenceDegrees:+err.toFixed(6),within0_05Degree:err<=0.05});
}
check(paperRows.some(x=>!x.within0_05Degree),
      'Full numerical pass MUST be blocked by real independent paper mismatches');
// Five existing Perambalur birth cases, 25 research-only True/Bala attempts.
// These diagnostics are NOT external oracles for historical 1971-2015.
const births=[['1994-06-15','13:03'],['2015-09-06','09:30'],
 ['1992-07-31','22:05'],['1971-05-04','05:05'],['1974-01-11','16:04']];
const birthRows=[];
for(const [date,time] of births){
 const [y,m,d]=date.split('-').map(Number),[h,min]=time.split(':').map(Number);
 const jd=(Date.UTC(y,m-1,d,h,min)-330*60000)/86400000+2440587.5;
 const meanSun=mean(jd,'Sun'),row={date,time,jdUt:jd,planets:{}};
 for(const planet of Object.keys(paper)){
  const own=mean(jd,planet),apsis=sauraMandoccaResearch(jd,planet);
  const trueLon=compute({planet,meanLongitude:inner.has(planet)?meanSun:own,
    sheeghrocha:inner.has(planet)?own:meanSun,mandocca:apsis.mandocca});
  const strength=bphs(tamil[planet],meanSun,own,trueLon.trueLongitude);
  check(Number.isFinite(trueLon.trueLongitude)&&trueLon.trueLongitude>=0&&trueLon.trueLongitude<360,
        planet+' '+date+' true value finite');
  check(strength.virupa>=0&&strength.virupa<=60,
        planet+' '+date+' BPHS result bounded 0-60');
  check(!strength.natalCertified&&!trueLon.liveCheshtaEligible&&!apsis.historicalNumericalCertified,
        planet+' '+date+' cannot falsely pass unverified natal');
  row.planets[planet]={trueResearch:+trueLon.trueLongitude.toFixed(6),
    cheshtaVirupaResearch:+strength.virupa.toFixed(6),certified:false};
 }
 birthRows.push(row);
}
assert.throws(()=>compute({planet:'Sun',meanLongitude:20,mandocca:70,sheeghrocha:50}),RangeError);assertions++;
assert.throws(()=>compute({planet:'Mars',meanLongitude:20,mandocca:70}),TypeError);assertions++;
assert.throws(()=>sauraMandoccaResearch(NaN,'Mars'),RangeError);assertions++;
console.log(JSON.stringify({
 passedGuardTests:true,assertions,
 externalSourceA:'rkanetech.com/true-position',
 externalSourceB:'Santhoju et al (2025) J Astrophys Astr 46:9 tables 6-7',
 siteRows,paperRows,
 fineToleranceDegree:0.05,
 allFivePlanetsFineNumericalPASS:paperRows.every(x=>x.within0_05Degree)&&siteRows.every(x=>x.differenceDegrees<=0.05),
 fivePerambalurBirthResearchCandidates:birthRows,
 historicalBijaCorrectionVerified:false,
 fiveIndependentHistoricalNatalTrueOraclesAvailable:false,
 natalCheshtaCertified:false,fullShadbalaCertified:false,productionModified:false
}));
}

async function runBundledOracle7() {
  // Consolidated from tests/v368-published-stage-historical-shadbala-audit.mjs; keep this oracle's assertions isolated.
  const assert = __bundle6mod0.default;
  const { sauraFourPassTrueLongitude: classical, sauraMandoccaResearch } = __bundle6mod1;
  const { sauraMeanOrbitalLongitude: mean } = __bundle6mod2;
  const { bphsFivePlanetCheshtaFromClassicalMeans: bphs } = __bundle6mod3;
  const { getSwe, C } = __bundle6mod4;
  const { full } = __bundle6mod5;
/**
 * V368 independent forensic diagnostic and 5 natal chart Swiss comparisons.
 * Source: Santhoju et al., J Astrophys Astr 46:9 (2025), tables 6/7,
 * https://doi.org/10.1007/s12036-024-10018-8
 * WARNING: Table 7 first stage appears to double Table 6 half-sighra;
 * the full-four-stage published output is not reproduced to 0.05deg by V367.
 * A green TEST here means discrepant claims are correctly flagged, not
 * all classical true longitudes certified.
 */






const A=(condition,label)=>{assert.ok(condition,label);assertions++};
const close=(a,b,tol,label)=>A(Number.isFinite(a)&&Math.abs(a-b)<=tol,label+' actual='+a+' published='+b);
const norm=n=>((n%360)+360)%360;
const distance=(a,b)=>Math.abs(((a-b+540)%360)-180);
const paper={
 Mercury:{mean:353.2261,halfS:5.9244,halfM:-1.6013,fullM:-3.5381,fullS:11.0501,
          table7first:5.075,table7second:355.9479,true:0.738},
 Venus:{mean:353.2261,halfS:-5.1368,halfM:0.8788,fullM:1.7462,fullS:-10.9856,
        table7first:342.9524,table7second:349.8469,true:343.9867},
 Mars:{mean:295.0651,halfS:11.6844,halfM:-0.4649,fullM:-4.2191,fullS:29.0543,
       table7first:318.4339,table7second:305.8197,true:319.9003},
 Jupiter:{mean:31.7206,halfS:-3.1086,halfM:1.715,fullM:3.6705,fullS:-7.1795,
          table7first:25.5033,table7second:32.0419,true:28.2115},
 Saturn:{mean:316.5202,halfS:1.7966,halfM:-3.8317,fullM:-7.6159,fullS:4.1194,
         table7first:320.1135,table7second:310.6534,true:313.0236}
};
const english=['Mercury','Venus','Mars','Jupiter','Saturn'];
const tam={Mercury:'புதன்',Venus:'சுக்கிரன்',Mars:'செவ்வாய்',Jupiter:'குரு',Saturn:'சனி'};
const swissBody={Mercury:C.MERCURY,Venus:C.VENUS,Mars:C.MARS,Jupiter:C.JUPITER,Saturn:C.SATURN};
// Independently generated outside this JavaScript repository using
// pyswisseph 2.10.03 (Moshier geocentric + Lahiri sidereal at TT).
// Each sample instant is specified IST = UTC+05:30; 3 decimal deg resolution.
// These validate the SWISS comparison independently, NOT the classical model.
const modernIndependentMoshier=Object.freeze({
 '1994-06-15':{Mars:22.797,Mercury:74.383,Jupiter:191.407,Venus:96.225,Saturn:318.569},
 '2015-09-06':{Mars:113.991,Mercury:166.130,Jupiter:131.501,Venus:110.313,Saturn:215.176},
 '1992-07-31':{Mars:39.561,Mercury:108.663,Jupiter:141.320,Venus:118.150,Saturn:291.879},
 '1971-05-04':{Mars:276.597,Mercury:359.703,Jupiter:220.491,Venus:348.975,Saturn:30.734},
 '1974-01-11':{Mars:13.111,Mercury:268.628,Jupiter:293.238,Venus:286.472,Saturn:66.230}
});
const inner=new Set(['Mercury','Venus']);
let assertions=0;
const published=[];
for(const planet of english){
 const v=paper[planet];
 const expectedHalf=norm(v.mean+v.halfS);
 const expectedPublishedFirst=norm(v.mean+2*v.halfS);
 const calculatedFinal=norm(v.mean+v.fullM+v.fullS);
 const table7FirstDeviation=distance(expectedHalf,v.table7first);
 const v367=classical({planet,meanLongitude:v.mean,
   mandocca:{Mercury:220.4772,Venus:79.8785,Mars:130.0471,Jupiter:171.3844,Saturn:236.6267}[planet],
   sheeghrocha:{Mercury:151.249,Venus:328.7388,Mars:353.2261,Jupiter:353.2261,Saturn:353.2261}[planet]});
 close(distance(expectedPublishedFirst,v.table7first),0,.00011,planet+' Table7 first is twice the claimed half-correction in Table6');
 A(table7FirstDeviation>=Math.abs(v.halfS)-.00015,planet+' paper Table7 first is NOT the half step from Table6');
 close(distance(calculatedFinal,v.true),0,.00011,planet+' paper internally consistent FINAL = mean+fullM+fullS');
 A(distance(v367.trueLongitude,v.true)>0.05 || planet==='Venus',
    planet+' published final vs V367 not silently promoted to precision-certified');
 published.push({
  planet,printedHalfS:v.halfS,
  correctHalfStage:+expectedHalf.toFixed(6),table7First:v.table7first,
  paperDoubledStage:+expectedPublishedFirst.toFixed(6),
  table7HalfStageErrorDegrees:+table7FirstDeviation.toFixed(6),
  finalPrinted:v.true,paperStageReconstruction:+calculatedFinal.toFixed(6),
  v367Algorithm:+v367.trueLongitude.toFixed(6),
  v367DisagreementDegrees:+distance(v367.trueLongitude,v.true).toFixed(6)
 });
}
A(published.filter(x=>x.v367DisagreementDegrees>.05).length===4,
  'four of five 2024 external numerical mismatches remain unresolved');
// For each historical birth, independent MODERN Swiss true, five-graha
// classical candidate, and full seven-graha production Shadbala. This is
// a diagnostic model-to-model comparison, NOT a traditional orbital oracle.
const swe=await getSwe();swe.setSiderealLahiri();
const births=[['1994-06-15','13:03'],['2015-09-06','09:30'],
 ['1992-07-31','22:05'],['1971-05-04','05:05'],['1974-01-11','16:04']];
const samples=[];
const shadbalaNames=['சூரியன்','சந்திரன்','செவ்வாய்','புதன்','குரு','சுக்கிரன்','சனி'];
for(const [date,time] of births){
 const [y,m,d]=date.split('-').map(Number),[h,min]=time.split(':').map(Number);
 const utcMs=Date.UTC(y,m-1,d,h,min)-330*60000,stamp=new Date(utcMs);
 const jd=swe.utcToJd(stamp.getUTCFullYear(),stamp.getUTCMonth()+1,stamp.getUTCDate(),
 stamp.getUTCHours(),stamp.getUTCMinutes(),stamp.getUTCSeconds());
 const sample={date,time,jdUT:jd.ut,grahas:{},fullSevenShadbala:{}};
 const meanSun=mean(jd.ut,'Sun');
 for(const planet of english){
  const own=mean(jd.ut,planet),apsis=sauraMandoccaResearch(jd.ut,planet);
  const c=classical({planet,meanLongitude:inner.has(planet)?meanSun:own,
      mandocca:apsis.mandocca,sheeghrocha:inner.has(planet)?own:meanSun});
  const b=bphs(tam[planet],meanSun,own,c.trueLongitude);
  const modern=swe.calc(jd.et,swissBody[planet],swe.siderealSpeedFlags());
  const error=distance(c.trueLongitude,modern.longitude);
  close(distance(modern.longitude,modernIndependentMoshier[date][planet]),0,0.10,
        date+' '+planet+' Swiss-WASM versus independent pyswisseph/Moshier 2.10.03');
  A(Number.isFinite(modern.longitude)&&modern.longitude>=0&&modern.longitude<360,
    date+' '+planet+' independent Swiss true within circle');
  A(Number.isFinite(c.trueLongitude)&&b.virupa>=0&&b.virupa<=60,
    date+' '+planet+' research classic result finite and bounded');
  A(!c.liveCheshtaEligible&&!b.natalCertified&&
    !apsis.historicalNumericalCertified,date+' '+planet+' unproven true cannot live');
  sample.grahas[planet]={
   classicalTrueResearch:+c.trueLongitude.toFixed(6),
   swissLahiriModernTrue:+modern.longitude.toFixed(6),
   DIFFERENT_MODEL_errorDegrees:+error.toFixed(6),
   classicalResearchCheshta:+b.virupa.toFixed(6),certified:false
  };
 }
 const report=await full({date,time,lat:11.232,lon:78.88,utcOffsetMinutes:330,
   referenceDate:'2026-10-17',name:'V368 research only'});
 A(report.ok,date+' natal calculation still works');
 for(const name of shadbalaNames){
  const p=report.chart.planets.find(x=>x.name===name);
  A(!!p?.strength6,date+' Shadbala exists '+name);
  const b=p.strength6;
  A(!b.classicalCertified&&b.provisional,date+' seven-graha full numerical certificate remains correctly blocked '+name);
  A(Number.isFinite(b.components.cheshta)&&((Number.isFinite(b.totalVirupa))||b.totalVirupa===null),
    date+' B.V. Raman components are finite and unresolved totals fail closed '+name);
  sample.fullSevenShadbala[name]={totalVirupa:b.totalVirupa,cheshta:b.components.cheshta,
       certified:false};
 }
 samples.push(sample);
}
A(samples.length===5,'five full births compared');
A(samples.every(x=>Object.keys(x.grahas).length===5),'25 classical versus Swiss samples');
A(samples.every(x=>Object.keys(x.fullSevenShadbala).length===7),'35 provisional seven-planet Shadbala totals');
console.log(JSON.stringify({
 pass:true,assertions,scope:'audit and comparison ONLY',
 paperStageMismatchConfirmed:5,fullPublishedTraditional2024NumericPASS:false,
 paperForensic:published,
 modernVsClassicalDiagnostic:samples,
 independentHistoricalClassicalOracleCount:0,
 historicalTrueLongitudeCertified:false,natalCheshtaCertified:false,
 sevenPlanetShadbalaCertified:false,productionStrengthChanged:true,productionEngine:'B.V. Raman strength6',
 note:'Swiss modern Lahiri is NOT same frame as unmodified Saura, so 25 differences are NOT errors or certification references'
}));
}

await runBundledOracle1();
await runBundledOracle2();
await runBundledOracle3();
await runBundledOracle4();
await runBundledOracle5();
await runBundledOracle6();
await runBundledOracle7();
await runBundledOracle8();
await runBundledOracle9();
