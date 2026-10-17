/**
 * V368 independent forensic diagnostic and 5 natal chart Swiss comparisons.
 * Source: Santhoju et al., J Astrophys Astr 46:9 (2025), tables 6/7,
 * https://doi.org/10.1007/s12036-024-10018-8
 * WARNING: Table 7 first stage appears to double Table 6 half-sighra;
 * the full-four-stage published output is not reproduced to 0.05deg by V367.
 * A green TEST here means discrepant claims are correctly flagged, not
 * all classical true longitudes certified.
 */
import assert from 'node:assert/strict';
import {sauraFourPassTrueLongitude as classical,sauraMandoccaResearch} from '../public/horoscope/offline/saura-classical-true-longitude.browser.mjs';
import {sauraMeanOrbitalLongitude as mean} from '../public/horoscope/offline/saura-classical-mean-motion.browser.mjs';
import {bphsFivePlanetCheshtaFromClassicalMeans as bphs} from '../public/horoscope/offline/bphs-swiss-solar-cheshta.browser.mjs';
import {getSwe,C} from '../public/horoscope/offline/wasm-provider.mjs';
import {full} from '../public/horoscope/offline/offline-engine.mjs';
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
  A(!!p?.strength3,date+' Shadbala exists '+name);
  const b=p.strength3;
  A(!b.classicalCertified&&b.provisional,date+' seven-graha full numerical certificate remains correctly blocked '+name);
  A(Number.isFinite(b.totalVirupa)&&Number.isFinite(b.components.cheshta),
    date+' output finite '+name);
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
 sevenPlanetShadbalaCertified:false,productionStrengthChanged:false,
 note:'Swiss modern Lahiri is NOT same frame as unmodified Saura, so 25 differences are NOT errors or certification references'
}));
