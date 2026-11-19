/**
 * Isolated historical true-longitude / same-reference-frame research gate.
 *
 * Scope:
 *  - Verify that Saura mean, four-pass true and 24-Jya true candidates carry
 *    the same explicit frame identifier.
 *  - Reproduce a paired five-graha BPHS Cheshta arithmetic oracle from the
 *    official IMD 2026-03-22 Rashtriya Panchang mean/true tables.
 *  - Compare the Saura true-position model with independent published
 *    2024 worked examples; record disagreements rather than fitting them.
 *  - Evaluate five historical Perambalur birth dates as RESEARCH CANDIDATES,
 *    but explicitly refuse historical certification without date-specific
 *    Bija corrections and independent historical true-longitude oracles.
 *  - Verify that live B.V. Raman Shadbala withholds totals when its current
 *    mean/true/Sheeghrocccha inputs mix Saura and Swiss-Lahiri frames.
 *
 * No production ephemeris is replaced by this research module.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { full } from '../public/horoscope/offline/offline-engine.mjs';
import {
  sauraFivePlanetCheshtaInputs
} from '../public/horoscope/offline/saura-classical-mean-motion.browser.mjs';
import {
  sauraFourPassTrueLongitude,
  sauraMandoccaResearch
} from '../public/horoscope/offline/saura-classical-true-longitude.browser.mjs';
import {
  sauraTabularFourPassTrueLongitude
} from '../public/horoscope/offline/saura-classical-tabular-jya.browser.mjs';
import {
  computeClassicalFiveNatalCheshta
} from '../public/horoscope/offline/saura-natal-five-cheshta.browser.mjs';
import {
  bphsFivePlanetCheshtaFromClassicalMeans
} from '../public/horoscope/offline/bphs-swiss-solar-cheshta.browser.mjs';

const require=createRequire(import.meta.url);
const nodeSource=fs.readFileSync(new URL('../bv-raman-shadbala.cjs',import.meta.url),'utf8');
const browserSource=fs.readFileSync(new URL('../public/horoscope/offline/bv-raman-shadbala.browser.mjs',import.meta.url),'utf8');
const frameId='surya-siddhanta-saura-nirayana';
const names=['செவ்வாய்','புதன்','குரு','சுக்கிரன்','சனி'];
const english=['Mars','Mercury','Jupiter','Venus','Saturn'];
const tamil=Object.freeze({Mars:'செவ்வாய்',Mercury:'புதன்',Jupiter:'குரு',Venus:'சுக்கிரன்',Saturn:'சனி'});
const dms=([r,d,m,s])=>r*30+d+m/60+s/3600;
const angle=(a,b)=>Math.abs((((a-b)%360)+540)%360-180);
let assertions=0;
const yes=(v,label)=>{assert.ok(v,label);assertions++;};
const near=(a,b,tol,label)=>{yes(Number.isFinite(a)&&Math.abs(a-b)<=tol,label+' actual='+a+' expected='+b+' tol='+tol);};

// 1. The mean, continuous true and tabular true research modules must expose
// one canonical Saura nirayana frame ID. This is an arithmetic/model frame
// consistency assertion, not evidence that the historical epoch is correct.
const meanRows=names.map(name=>sauraFivePlanetCheshtaInputs(
  2461121.5,({செவ்வாய்:'Mars',புதன்:'Mercury',குரு:'Jupiter',சுக்கிரன்:'Venus',சனி:'Saturn'})[name]
));
yes(meanRows.every(x=>x.frameId===frameId),'all five classical mean/Sheeghrocccha records carry the canonical Saura frame ID');

// 2. Official paired IMD benchmark: 22 March 2026, 05:30 IST.
// The mean values are the Bija-corrected Mean Nirayana columns; true values
// are the same-date geocentric Nirayana rows. These are one published-date
// arithmetic oracle only, not historical 1971-2015 natal oracles.
const imdMean=Object.freeze({
  Sun:[11,5,17,42.49],
  Mercury:[5,28,40,38.79],
  Venus:[0,20,55,29.08],
  Mars:[10,9,59,31.96],
  Jupiter:[2,26,13,3.65],
  Saturn:[11,16,38,39.28]
});
const imdTrue=Object.freeze({
  Mercury:[10,14,20,3],
  Venus:[11,25,4,21],
  Mars:[10,21,3,6],
  Jupiter:[2,21,3,10],
  Saturn:[11,10,4,30]
});
const expectedImdVirupa=Object.freeze({
  Mercury:48.712403,Venus:11.913642,Mars:6.591066,
  Jupiter:36.113364,Saturn:2.688162
});
const imdSolarMean=dms(imdMean.Sun),imdRows=[];
for(const planet of english){
  const r=bphsFivePlanetCheshtaFromClassicalMeans(
    tamil[planet],imdSolarMean,dms(imdMean[planet]),dms(imdTrue[planet])
  );
  near(r.virupa,expectedImdVirupa[planet],0.0000015,
    planet+' BPHS 27.24-25 arithmetic from paired IMD mean/true source data');
  yes(r.virupa>=0&&r.virupa<=60,planet+' IMD Cheshta remains in 0-60 Virupa');
  imdRows.push({planet,virupa:+r.virupa.toFixed(6),sourceFrame:'IMD paired Bija-Nirayana table'});
}

// 3. Independent 2024 published true-position snapshots. Re-run with the
// same unmodified four-stage Saura model and one universal Manda convention.
// The academic paper contains an unresolved Mars discrepancy; the test keeps
// that disagreement visible and refuses a five-planet certification.
const academic2024=Object.freeze({
  Mercury:[353.2261,220.4772,151.249,0.738],
  Venus:[353.2261,79.8785,328.7388,343.9867],
  Mars:[295.0651,130.0471,353.2261,319.9003],
  Jupiter:[31.7206,171.3844,353.2261,28.2115],
  Saturn:[316.5202,236.6267,353.2261,313.0236]
});
const academicRows=[];
for(const [planet,[meanLongitude,mandocca,sheeghrocha,publishedTrue]] of Object.entries(academic2024)){
  const candidate=sauraTabularFourPassTrueLongitude({
    planet,meanLongitude,mandocca,sheeghrocha,
    mandaKarṇaConvention:'absolute-koti-minus'
  });
  const error=angle(candidate.trueLongitude,publishedTrue);
  yes(Number.isFinite(error),planet+' independent published true comparison is finite');
  academicRows.push({planet,publishedTrue,candidateTrue:+candidate.trueLongitude.toFixed(6),
    absoluteErrorDegrees:+error.toFixed(6),matched005Degrees:error<=0.05});
}
const marsAcademic=academicRows.find(x=>x.planet==='Mars');
yes(marsAcademic.absoluteErrorDegrees>3,
  'the independent 2024 academic Mars true-longitude disagreement remains visible (>3 degrees)');
yes(academicRows.some(x=>!x.matched005Degrees),
  'published 2024 dataset does not falsely pass all five at 0.05 degree');
yes(academicRows.every(x=>x.absoluteErrorDegrees>=0),
  'no negative/NaN comparison can accidentally be treated as a pass');

// 4. Five real historical birth cases, five grahas each. All three longitude
// inputs are from one *model* frame, but the true positions still depend on
// unverified ancient epoch/Bija/Mandocca history. Therefore all 25 results
// must remain explicitly uncertified and disconnected from production.
const births=[
  ['1971-05-04','05:05'],
  ['1974-01-11','16:04'],
  ['1992-07-31','22:05'],
  ['1994-06-15','13:03'],
  ['2015-09-06','09:30']
];
const historicalCandidates=[];
for(const [date,time] of births){
  const result=computeClassicalFiveNatalCheshta({date,time,utcOffsetMinutes:330});
  yes(result.calculationAvailable===true,date+' research calculation available');
  yes(result.historicalTrueLongitudeEvidence?.frameId===frameId,
    date+' research evidence declares the canonical same-frame model');
  yes(result.historicalTrueLongitudeEvidence?.meanTrueSheeghroccchaFrameConsistent===true,
    date+' mean/true/Sheeghrocccha use one model frame');
  yes(result.historicalTrueLongitudeEvidence?.historicalBijaCorrectionsVerified===false,
    date+' historical Bija remains honestly unverified');
  yes(result.historicalTrueLongitudeEvidence?.independentHistoricalTrueLongitudeOracles===0,
    date+' no independent historical oracle is fabricated');
  yes(result.natalHistoricalNumericalCertified===false&&result.productionIntegrationAllowed===false,
    date+' research candidates cannot be promoted to Production');
  for(const p of result.planets){
    yes(p.frameCompatible===true,date+' '+p.planet+' one-frame model inputs');
    yes(p.meanLongitudeFrameId===frameId&&p.trueLongitudeFrameId===frameId&&p.sheeghrochaLongitudeFrameId===frameId,
      date+' '+p.planet+' all three source frame IDs match');
    yes(p.mathematicalCrossCheckPass===true,
      date+' '+p.planet+' continuous/tabular implementation cross-check passes');
    yes(p.certified===false&&p.historicalBijaCorrectionApplied===false&&p.independentHistoricalTrueOracleAvailable===false,
      date+' '+p.planet+' same-frame arithmetic is not mislabelled as historical proof');
    yes(Number.isFinite(p.trueLongitude)&&Number.isFinite(p.cheshtaVirupa)&&p.cheshtaVirupa>=0&&p.cheshtaVirupa<=60,
      date+' '+p.planet+' bounded research candidate exists');
    historicalCandidates.push({date,planet:p.planet,mean:p.meanLongitude,
      trueLongitude:p.trueLongitude,sheeghrocccha:p.sheeghrocha,
      cheshtaVirupa:p.cheshtaVirupa,frameId:p.trueLongitudeFrameId,certified:false});
  }
}
yes(historicalCandidates.length===25,'exactly five dates x five planets = 25 same-frame historical research candidates');

// 5. Production regression guard. The live B.V. Raman route currently takes
// mean/Sheeghrocccha from Saura and chart true longitude from Swiss Lahiri.
// It may retain the numeric candidate for diagnostics, but MUST withhold the
// aggregate Shadbala totals/rankings for all five affected grahas.
yes(nodeSource.includes("frameGateStatus:'BLOCKED_MIXED_REFERENCE_FRAMES'"),
  'Node engine marks mixed Saura/Swiss live inputs as blocked');
yes(browserSource.includes("frameGateStatus:'BLOCKED_MIXED_REFERENCE_FRAMES'"),
  'browser engine marks mixed Saura/Swiss live inputs as blocked');
yes(nodeSource.includes('chesta.frameCompatible===false||chesta.productionEligible===false'),
  'Node Shadbala total has a hard frame-compatibility gate');
yes(browserSource.includes('chesta.frameCompatible===false||chesta.productionEligible===false'),
  'browser Shadbala total has a hard frame-compatibility gate');

const liveBirths=[];
for(const [date,time] of births){
  const live=await full({date,time,lat:11.232,lon:78.88,utcOffsetMinutes:330,
    referenceDate:'2026-10-17',name:'Classical Cheshta frame guard regression'});
  yes(live.ok,date+' live chart builds');
  for(const name of names){
    const p=live.chart.planets.find(x=>x.name===name);
    const s=p?.strength6;
    yes(!!s,date+' '+name+' live B.V. Raman strength6 exists');
    yes(Number.isFinite(s.components.cheshta),date+' '+name+' diagnostic Cheshta candidate remains inspectable');
    yes(s.evidence?.cheshtaSource?.frameCompatible===false,date+' '+name+' live candidate identifies frame mismatch');
    yes(s.evidence?.cheshtaSource?.productionEligible===false,date+' '+name+' candidate is explicitly production-ineligible');
    yes(s.frameSafety?.status==='BLOCKED_MIXED_REFERENCE_FRAMES',date+' '+name+' exposes blocked frame safety result');
    yes(s.totalVirupa===null&&s.totalRupa===null&&s.ratio===null&&s.isStrong===null,
      date+' '+name+' mixed-frame Cheshta is excluded from Shadbala total, Rupa and strength ranking');
    liveBirths.push({date,planet:name,diagnosticCheshta:s.components.cheshta,
      totalVirupa:s.totalVirupa,frameSafety:s.frameSafety.status});
  }
}

console.log(JSON.stringify({
  pass:true,assertions,
  sameFrameResearchFrameId:frameId,
  imdPairedSourceOracle:{date:'2026-03-22',rows:imdRows},
  independentAcademic2024Comparison:academicRows,
  historicalNatalCandidates:historicalCandidates,
  historicalNumericalCertification:false,
  historicalBijaCorrectionsVerified:false,
  productionIntegrationAllowed:false,
  liveMixedFrameGuard:{affectedGrahaRows:liveBirths.length,withheldShadbalaTotals:true},
  productionCalculationReplaced:false
}));
