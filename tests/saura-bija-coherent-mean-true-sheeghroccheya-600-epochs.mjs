import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {
  sauraBijaCorrectedFivePlanetInputs,
  sauraBijaCorrectedMandoccaLongitude,
  sauraBijaCorrectedTrueLongitudeResearch
} from '../research/saura-bija/saura-bija-mean-motion.mjs';
import {
  sauraTabularFourPassTrueLongitude
} from '../public/horoscope/offline/saura-classical-tabular-jya.browser.mjs';
import {
  bphsCheshtaFromOrbitalElements
} from '../public/horoscope/offline/bphs-swiss-solar-cheshta.browser.mjs';

const ARTIFACT_URL=new URL(
  '../artifacts/natal-classical-random-600-charts-1800-2399.json',
  import.meta.url
);
const report=JSON.parse(readFileSync(ARTIFACT_URL,'utf8'));
const PLANETS=Object.freeze([
  ['செவ்வாய்','Mars'],['புதன்','Mercury'],['குரு','Jupiter'],
  ['சுக்கிரன்','Venus'],['சனி','Saturn']
]);
const EXPECTED=600*5;
const MAX_TABULAR_CONTINUOUS_DIFFERENCE_DEGREES=0.05;
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const norm=x=>((x%360)+360)%360;
const signedAngle=(a,b)=>((a-b+540)%360)-180;
const near=(actual,expected,tolerance,label)=>{
  assert.ok(finite(actual)&&Math.abs(actual-expected)<=tolerance,
    label+' actual='+actual+' expected='+expected+' tolerance='+tolerance);
};

assert.equal(report.pass,true,'the 600-chart research artifact already passed');
assert.equal(report.records.length,600,'one exact random birth epoch per year 1800–2399');
const rows=[];
const perPlanet=Object.fromEntries(PLANETS.map(([,planet])=>[planet,{
  samples:0,maxTabularContinuousDifferenceDegrees:0,sumSquaresTabularContinuousDifference:0,
  cheshtaMinimum:Infinity,cheshtaMaximum:-Infinity
}]));
let maxTabularContinuousDifferenceDegrees=0;
let sumSquaresDifference=0;
let comparisons=0;

for(let index=0;index<report.records.length;index++){
  const birth=report.records[index];
  assert.equal(birth.year,1800+index,'annual epoch remains one sample per civil year');
  assert.ok(finite(birth.julianDayUT),birth.epochId+' exact UTC Julian day exists');
  const saved=birth.fivePlanetHistoricalLongitudeResearch;
  assert.ok(Array.isArray(saved)&&saved.length===5,
    birth.epochId+' has five saved classical research candidates');
  const savedByPlanet=new Map(saved.map(row=>[row.planet,row]));

  for(const [tamil,planet] of PLANETS){
    const input=sauraBijaCorrectedFivePlanetInputs(birth.julianDayUT,planet);
    const apsis=sauraBijaCorrectedMandoccaLongitude(birth.julianDayUT,planet);
    const continuous=sauraBijaCorrectedTrueLongitudeResearch(birth.julianDayUT,planet);
    const prior=savedByPlanet.get(planet);
    assert.ok(prior,birth.epochId+' '+planet+' saved same-year row exists');

    // The three classical inputs and the four-pass True place are required
    // to share the same exact birth epoch and traditional Saura-nirayana frame.
    for(const [label,row] of [
      ['mean/Sheeghroccheya selector',input],
      ['Mandocca',apsis],
      ['four-pass True',continuous]
    ]){
      near(row.jdUt,birth.julianDayUT,1e-10,
        birth.epochId+' '+planet+' '+label+' uses the exact same JD');
      assert.equal(row.frame,'traditional-Saura-nirayana',
        birth.epochId+' '+planet+' '+label+' declares the common Saura frame');
      assert.equal(row.productionEligible,false,
        birth.epochId+' '+planet+' '+label+' remains research-only');
    }
    assert.equal(continuous.independentHistoricalOracleVerified,false,
      birth.epochId+' '+planet+' remains without an independent printed historical oracle');
    near(continuous.meanLongitude,input.meanLongitude,1e-12,
      birth.epochId+' '+planet+' True model consumes that exact epoch mean');
    near(continuous.sheeghrocca,input.sheeghrocca,1e-12,
      birth.epochId+' '+planet+' True model consumes that exact epoch Sheeghroccheya');
    near(continuous.mandocca,apsis.mandocca,1e-12,
      birth.epochId+' '+planet+' True model consumes that exact epoch Mandocca');
    near(prior.meanLongitude,continuous.meanLongitude,1e-12,
      birth.epochId+' '+planet+' persisted Mean matches recomputation');
    near(prior.trueLongitude,continuous.trueLongitude,1e-12,
      birth.epochId+' '+planet+' persisted True matches recomputation');
    near(prior.sheeghroccheya,continuous.sheeghrocca,1e-12,
      birth.epochId+' '+planet+' persisted Sheeghroccheya matches recomputation');
    near(prior.mandocca,continuous.mandocca,1e-12,
      birth.epochId+' '+planet+' persisted Mandocca matches recomputation');
    assert.equal(prior.frame,continuous.frame,
      birth.epochId+' '+planet+' persisted row has the same frame');

    // Independent mathematical implementation using the printed 24-Jya
    // sine table receives the identical Mean / Mandocca / Sheeghroccheya.
    // This checks table interpolation against continuous trigonometry only;
    // both use the same historical inputs and neither is an independent
    // astronomical observation or a historical certificate.
    const tabular=sauraTabularFourPassTrueLongitude({
      planet,
      meanLongitude:continuous.meanLongitude,
      mandocca:continuous.mandocca,
      sheeghrocha:continuous.sheeghrocca,
      mandaKarṇaConvention:'verse39-direct-jya'
    });
    const difference=signedAngle(tabular.trueLongitude,continuous.trueLongitude);
    const absDifference=Math.abs(difference);
    assert.ok(absDifference<=MAX_TABULAR_CONTINUOUS_DIFFERENCE_DEGREES,
      birth.epochId+' '+planet+' printed 24-Jya and continuous paths agree within '+
      MAX_TABULAR_CONTINUOUS_DIFFERENCE_DEGREES+' degrees; actual='+absDifference);
    assert.equal(tabular.historicallyCertified,false,
      birth.epochId+' '+planet+' printed Jya lookup is not a historical natal certificate');
    assert.equal(tabular.useAsProductionCheshta,false,
      birth.epochId+' '+planet+' printed Jya lookup remains research-only');

    // BPHS I Ch.27 vv.24–25 uses all three inputs from this *one* classical
    // model and this same epoch. The separate DE440-modern comparison is not
    // allowed to flow into this classical Chesta result.
    const cheshta=bphsCheshtaFromOrbitalElements(
      continuous.meanLongitude,
      continuous.trueLongitude,
      continuous.sheeghrocca
    );
    assert.ok(finite(cheshta.virupa)&&cheshta.virupa>=0&&cheshta.virupa<=60,
      birth.epochId+' '+planet+' same-model BPHS Chesta lies in 0–60 Virupa');
    const midpointDiff=signedAngle(
      continuous.trueLongitude,continuous.meanLongitude
    );
    const manualMidpoint=norm(continuous.meanLongitude+midpointDiff/2);
    const manualKendra=Math.min(
      norm(continuous.sheeghrocca-manualMidpoint),
      360-norm(continuous.sheeghrocca-manualMidpoint)
    );
    near(cheshta.meanTrueMidpoint,manualMidpoint,1e-12,
      birth.epochId+' '+planet+' BPHS midpoint is independently recomputed');
    near(cheshta.cheshtaKendraDegrees,manualKendra,1e-12,
      birth.epochId+' '+planet+' BPHS Kendra is independently recomputed');
    near(cheshta.virupa,manualKendra/3,1e-12,
      birth.epochId+' '+planet+' BPHS Chesta is independently recomputed');

    const stats=perPlanet[planet];
    stats.samples++;
    stats.maxTabularContinuousDifferenceDegrees=Math.max(
      stats.maxTabularContinuousDifferenceDegrees,absDifference
    );
    stats.sumSquaresTabularContinuousDifference+=difference*difference;
    stats.cheshtaMinimum=Math.min(stats.cheshtaMinimum,cheshta.virupa);
    stats.cheshtaMaximum=Math.max(stats.cheshtaMaximum,cheshta.virupa);
    maxTabularContinuousDifferenceDegrees=Math.max(
      maxTabularContinuousDifferenceDegrees,absDifference
    );
    sumSquaresDifference+=difference*difference;
    comparisons++;
    rows.push({
      year:birth.year,date:birth.date,localTime:birth.localTime,
      place:birth.place,utcOffsetMinutes:birth.historicalUtcOffsetMinutes,
      julianDayUT:birth.julianDayUT,epochId:birth.epochId,
      grahaTamil:tamil,planet,
      sourceModel:'BURGESS_BENTLEY_BIJA_CORRECTED_SAURA_PAKSHA',
      frame:'traditional-Saura-nirayana',
      sameEpoch:true,sameFrame:true,sameDynamicModel:true,
      meanLongitude:continuous.meanLongitude,
      mandocca:continuous.mandocca,
      sheeghroccheya:continuous.sheeghrocca,
      classicalFourPassTrueLongitude:continuous.trueLongitude,
      continuousVsPrinted24JyaTrueDifferenceDegrees:difference,
      bphsCheshtaKendraDegrees:cheshta.cheshtaKendraDegrees,
      bphsCheshtaVirupa:cheshta.virupa,
      meanSource:'Burgess 1860 corrected Mahayuga revolutions, Ujjain reference',
      mandoccaSource:'Surya Siddhanta I.41–42 and I.57–58 Kali-epoch apsis values',
      trueSource:'Surya Siddhanta II.39–45; one declared direct-Jya Manda convention',
      bphsRuleSource:'BPHS I Ch.27 vv.24–25; five-planet input selector BPHS/Uttara Kalamrita',
      independentHistoricalOracleVerified:false,
      historicalClassicalTrueLongitudeCertified:false,
      classicalNatalCertified:false,
      productionEligible:false
    });
  }
}

assert.equal(comparisons,EXPECTED,'600 exact natal epochs × five grahas = 3,000 coherent chains');
for(const [planet,stats] of Object.entries(perPlanet)){
  assert.equal(stats.samples,600,planet+' has 600 same-epoch classical chains');
  stats.rmsTabularContinuousDifferenceDegrees=Math.sqrt(
    stats.sumSquaresTabularContinuousDifference/stats.samples
  );
  delete stats.sumSquaresTabularContinuousDifference;
}
report.coherentClassicalMeanTrueSheeghroccheyaValidation={
  status:'PASS_3000_SAME_EPOCH_SAME_FRAME_CLASSICAL_INPUT_CHAINS_RESEARCH_ONLY',
  birthEpochs:600,
  years:[1800,2399],
  planets:5,
  comparisons,
  model:'Burgess/Bentley Bīja-corrected Saura-paksha',
  frame:'traditional-Saura-nirayana',
  epochConvention:'Every calculation uses that record exact julianDayUT and Ujjain local-mean meridian offset within the model',
  outputs:['Mean longitude','Mandocca','Sheeghroccheya','four-pass classical True longitude','BPHS Chesta Kendra','BPHS Chesta Virupa'],
  independentNumericalCrossCheck:'Printed 24-Jya table implementation vs continuous trigonometric implementation on identical same-epoch classical inputs',
  maxTabularContinuousDifferenceDegrees,
  rmsTabularContinuousDifferenceDegrees:Math.sqrt(sumSquaresDifference/comparisons),
  perPlanet,
  independentHistoricalOracleVerifiedRows:0,
  classicalTrueLongitudeCertified:false,
  classicalNatalCertified:false,
  productionEligible:false,
  rows
};
report.certification={
  ...report.certification,
  classicalCertified:false,
  independentHistoricalOracleVerifiedRows:0,
  coherentClassicalSameEpochRows:comparisons,
  coherentClassicalModel:'BURGESS_BENTLEY_BIJA_CORRECTED_SAURA_PAKSHA',
  status:'NOT_CERTIFIED',
  note:'3,000 same-epoch same-frame classical Mean/Mandocca/Sheeghroccheya/True/Chesta research chains passed internal and printed-24-Jya numerical reconciliation. These shared-input mathematical cross-checks are not independent historical astronomical observations and do not certify arbitrary natal charts.'
};
writeFileSync(ARTIFACT_URL,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({
  pass:true,
  status:report.coherentClassicalMeanTrueSheeghroccheyaValidation.status,
  birthEpochs:600,
  coherentClassicalChains:comparisons,
  maxTabularContinuousDifferenceDegrees,
  rmsTabularContinuousDifferenceDegrees:Math.sqrt(sumSquaresDifference/comparisons),
  perPlanet,
  independentHistoricalOracleVerifiedRows:0,
  classicalNatalCertified:false,
  artifact:'artifacts/natal-classical-random-600-charts-1800-2399.json'
}));
