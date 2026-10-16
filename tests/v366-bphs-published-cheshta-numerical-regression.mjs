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
 * Oracle B: Santhoju, Bhalla, Behera & Pai, "Mathematical model as per the
 * algorithm of Suryasiddhanta", Journal of Astrophysics and Astronomy,
 * 46:9 (2025) tables 6-7, 2024-04-09 sunrise Mandi, five graha published
 * Saura mean/Sheeghrocca and true-longitude triples.
 *
 * BPHS I ch27 verses 24-25 and Uttara Kalamrita II pp42-43 govern
 * cheshta input selector and angle / 3 Virupas. A separately written
 * circular midpoint/kendra oracle checks the production pure helper.
 *
 * This does NOT independently derive true positions for natal 1971-2015
 * or justify mixing Swiss Lahiri with classical mean inputs in production.
 */
import assert from 'node:assert/strict';
import {sauraMeanOrbitalLongitude as pureMean} from
  '../public/horoscope/offline/saura-classical-mean-motion.browser.mjs';
import {bphsFivePlanetCheshtaFromClassicalMeans as bphs} from
  '../public/horoscope/offline/bphs-swiss-solar-cheshta.browser.mjs';
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
// Published 2024 Saura inputs are UNCORRECTED, NOT the modern 2026
// Bija-corrected reference. Never compare or mix their coordinate families.
const paper2024=Object.freeze({
 Mercury:{mean:353.2261,sh:151.249,true:0.738,virupa:51.422317},
 Venus:{mean:353.2261,sh:328.7388,true:343.9867,virupa:6.622533},
 Mars:{mean:295.0651,sh:353.2261,true:319.9003,virupa:15.247800},
 Jupiter:{mean:31.7206,sh:353.2261,true:28.2115,virupa:12.246650},
 Saturn:{mean:316.5202,sh:353.2261,true:313.0236,virupa:12.818067}
});
const actual2024={};
for(const body of names){
 const data=paper2024[body],inner=body==='Mercury'||body==='Venus';
 const meanSun=353.2261;
 const own=inner?data.sh:data.mean;
 const val=bphs(ta[body],meanSun,own,data.true);
 const independently=independentBphsOracle(data.mean,data.true,data.sh);
 close(val.meanLongitude,data.mean,1e-9,body+' 2024 published mean map');
 close(val.sheeghrocha,data.sh,1e-9,body+' 2024 published Sheeghrocha map');
 close(val.cheshtaKendraDegrees,independently.kendra,1e-9,
       body+' 2024 independently computed Kendra');
 close(val.virupa,independently.virupa,1e-9,body+' 2024 independently computed Bala');
 close(val.virupa,data.virupa,0.000002,body+' published triple expected Bala');
 assert.ok(val.virupa>=0&&val.virupa<=60);checks++;
 actual2024[body]=Number(val.virupa.toFixed(6));
}
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
 certifiedScope:'five-planet numeric input-selector and BPHS Cheshta angular arithmetic at two published ephemeris snapshots',
 imdDate:'2026-03-22T00:00:00Z',
 imdSource:'IMD Rashtriya Panchang 2026-27 Bija-corrected mean and five geocentric true Nirayana',
 imdBalaVirupas:actual2026,
 secondOracle:'Santhoju et al. Journal of Astrophysics and Astronomy 46:9 (2025) tables 6-7 for 2024 Mandi sunrise',
 paperBalaVirupas:actual2024,
 printedIndependentTrueDailyPositionsChecked:35,
 imdSevenDailyPrintedTrueFiveGrahaCheshta:imdWeekCheshtaNumeric,
 imdDailyCheshtaArithmeticCompared:35,
 historicalNatalSameFrameTrueOraclesCertified:0,
 natalHistoricalTrueLongitudeEngineCertified:false,
 liveProductionCheshtaChanged:false,
 fullFivePlanetShadbalaCertified:false
}));
