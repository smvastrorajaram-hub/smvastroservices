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
import assert from 'node:assert/strict';
import {uttaraKalamritaFiveGrahaCheshta as UK} from
 '../public/horoscope/offline/uttara-kalamrita-six-bala.browser.mjs';
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
