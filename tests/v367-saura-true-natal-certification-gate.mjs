// V367 genuine independent classical true-longitude comparisons.
// Two published sample tables are independent inputs, NOT synthetic fixtures.
// The unverified natal True/Bala MUST NOT turn classicalCertified to true.
import assert from 'node:assert/strict';
import {sauraFourPassTrueLongitude as compute,sauraMandoccaResearch} from '../public/horoscope/offline/saura-classical-true-longitude.browser.mjs';
import {sauraMeanOrbitalLongitude as mean} from '../public/horoscope/offline/saura-classical-mean-motion.browser.mjs';
import {bphsFivePlanetCheshtaFromClassicalMeans as bphs} from '../public/horoscope/offline/bphs-swiss-solar-cheshta.browser.mjs';
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
