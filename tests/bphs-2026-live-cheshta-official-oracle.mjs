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
import assert from 'node:assert/strict';
import {full} from '../public/horoscope/offline/offline-engine.mjs';
import {bphsFivePlanetCheshtaFromClassicalMeans as cheshta}
 from '../public/horoscope/offline/bphs-swiss-solar-cheshta.browser.mjs';

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
 yes(liveP?.strength3?.available===true,planet+' live has sixfold Bala');
 const s=liveP.strength3;
 const independentlyPublishedOrbital=cheshta(tamilName,solarMean,
   dms(imdCorrectedMean2026[planet]),dms(imdGeocentricTrue2026[planet]));
 near(independentlyPublishedOrbital.virupa,publishedInputsExpectedVirupa[planet],
   .0000015,planet+' IMD published source input Cheshta Virupa');
 yes(s.cheshtaClassicalOrbitalInputsVerified===false,
   planet+' live DOES NOT claim independent ancient input confirmation');
 yes(s.cheshtaSourceMethod.includes('PROVISIONAL discrete'),
   planet+' exact live speed-heuristic source visible');
 const liveVirupa=s.components.cheshta;
 const discrepancy=Math.abs(liveVirupa-independentlyPublishedOrbital.virupa);
 yes(Number.isFinite(liveVirupa)&&discrepancy>.5,
    planet+' live speed approximation differs materially from published-source Cheshta');
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
 const s=live.chart.planets.find(p=>p.name===planet)?.strength3;
 yes(s&&s.classicalCertified===false&&s.cheshtaClassicalOrbitalInputsVerified===false,
     planet+' no false full Shadbala certificate');
 yes(s.cheshtaSourceMethod.startsWith('BPHS '),
     planet+' source-specific BPHS Cheshta replacement documented');
 if(planet==='சூரியன்')near(s.components.cheshta,s.components.kala.ayana,
     1e-9,'Sun Cheshta equals Ayana');
 else near(s.components.cheshta,s.components.kala.paksha,
     1e-9,'Moon Cheshta equals Paksha');
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
