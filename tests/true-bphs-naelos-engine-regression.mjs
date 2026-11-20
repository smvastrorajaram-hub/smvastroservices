import assert from 'node:assert/strict';
import fs from 'node:fs';

import { TRUE_BPHS_FRAME_TRANSFER_METADATA } from '../research/true-bphs/saura-frame-transfer.mjs';

import {
  createTrueBphsShadbalaEngine,
  resolveBphsGrahaYuddha,
  TRUE_BPHS_SHADBALA_METADATA
} from '../research/true-bphs/naelos-bphs-shadbala-engine.mjs';

const fixture=JSON.parse(fs.readFileSync(
  new URL('./fixtures/true-bphs-naelos-de440-five-natal.json',import.meta.url),'utf8'
));
assert.equal(fixture.certificateId,'SMV-ASTRO-TRUE-BPHS-NAELOS-DE440-25-2026-11-21');
assert.equal(fixture.comparison.count,25);
assert.equal(TRUE_BPHS_SHADBALA_METADATA.engine,'TRUE_BPHS_SHADBALA_NAELOS_DE440');
assert.equal(TRUE_BPHS_SHADBALA_METADATA.productionIntegrationAllowed,false);
assert.equal(TRUE_BPHS_FRAME_TRANSFER_METADATA.historicalFourPassTrueLongitudeUsed,false);
assert.equal(TRUE_BPHS_FRAME_TRANSFER_METADATA.absoluteKotiMinusUsed,false);

const engine=await createTrueBphsShadbalaEngine();
assert.equal(engine.tableIntegrityVerified,true);
assert.equal(engine.sourceEphemeris,'JPL DE440');
assert.equal(engine.naelosPackageVersion,'0.1.3');
assert.ok(engine.loadedTables.some(x=>x.name==='ne-1800.bin'));
assert.ok(engine.loadedTables.some(x=>x.name==='ne-2300.bin'));

const tamil={
  Mercury:'புதன்',Venus:'சுக்கிரன்',Mars:'செவ்வாய்',Jupiter:'குரு',Saturn:'சனி'
};
let assertions=0;
const yes=(value,message)=>{assert.ok(value,message);assertions++;};
const eq=(a,b,message)=>{assert.equal(a,b,message);assertions++;};
const near=(a,b,tolerance,message)=>{
  assert.ok(Number.isFinite(a)&&Math.abs(a-b)<=tolerance,
    message+'; actual='+a+'; expected='+b+'; tolerance='+tolerance);
  assertions++;
};
for(const birthFixture of fixture.births) {
  const result=await engine.calculate({
    date:birthFixture.date,time:birthFixture.time,
    latitude:11.232,longitude:78.88,timeZone:'Asia/Kolkata'
  });
  eq(result.method,'TRUE_BPHS_SHADBALA_NAELOS_DE440',
    birthFixture.date+' engine identity is BPHS, not Raman');
  eq(result.classicalCertified,false,
    birthFixture.date+' ordinary natal calculation is not falsely certified');
  eq(result.productionIntegrationAllowed,false,
    birthFixture.date+' production integration stays disabled');
  eq(result.planetaryPositions.length,9,
    birthFixture.date+' seven grahas plus Rahu/Ketu are present');
  eq(result.bhava.madhya.length,12,
    birthFixture.date+' twelve Sripati Madhya cusps are present');
  eq(result.bhava.arambha.length,12,
    birthFixture.date+' twelve Sripati Arambha cusps are present');
  eq(result.solarTime.solarTimeFrameId,'NAELOS_TRUE_EQUATOR_OF_DATE_GAST_V1',
    birthFixture.date+' apparent solar-time frame provenance');
  yes(result.solarTime.sunriseJdUt<result.birth.utcJd,
    birthFixture.date+' prior sunrise is reported');
  yes(result.solarTime.nextSunriseJdUt>result.birth.utcJd,
    birthFixture.date+' next sunrise is reported');

  for(const [english,expected] of Object.entries(birthFixture.planets)) {
    const name=tamil[english];
    const actual=result.cheshtaResults[name];
    near(actual.trueLongitude,expected.trueLongitudeSaura,1e-8,
      birthFixture.date+' '+english+' NAELOS true-longitude Saura transfer');
    near(actual.meanLongitude,expected.meanLongitudeSaura,1e-8,
      birthFixture.date+' '+english+' V365 Mean Longitude retained');
    near(actual.sheeghroccheya,expected.sheeghroccaSaura,1e-8,
      birthFixture.date+' '+english+' V365 Sheeghroccheya retained');
    near(actual.virupa,expected.cheshtaVirupa,1e-8,
      birthFixture.date+' '+english+' BPHS Ch27 24–25 Cheshta arithmetic');
    const sourceRow=result.planetaryPositions.find(row=>row.name===name);
    yes(sourceRow.referenceFrameId===result.frame.id,
      birthFixture.date+' '+english+' chart longitude uses the common frame');
    near(sourceRow.longitude,actual.trueLongitude,1e-10,
      birthFixture.date+' '+english+' chart longitude equals BPHS True Longitude input');
    yes(fixture.comparison.maxAbsTropicalResidualArcsec<=fixture.comparison.acceptanceMaxArcsec,
      birthFixture.date+' '+english+' is covered by the pinned independent NAELOS / Swiss tropical source-parity certificate');
  }

  eq(Object.keys(result.planets).length,7,
    birthFixture.date+' exactly seven BPHS Shadbala graha rows');
  for(const name of ['சூரியன்','சந்திரன்','செவ்வாய்','புதன்','குரு','சுக்கிரன்','சனி']) {
    const row=result.planets[name];
    yes(row?.available===true,birthFixture.date+' '+name+' six Bala output is available');
    eq(row.classicalCertified,false,birthFixture.date+' '+name+' remains research-only');
    for(const component of ['sthana','dig','kala','cheshta','naisargika','drik']) {
      const value=component==='sthana'?row.components.sthana?.total:
        component==='kala'?row.components.kala?.total:row.components[component];
      yes(Number.isFinite(value),birthFixture.date+' '+name+' '+component+' is finite');
    }
    if(Number.isFinite(row.totalVirupa)) {
      const c=row.components;
      const sum=c.sthana.total+c.dig+c.kala.total+c.cheshta+c.naisargika+c.drik;
      near(row.totalVirupa,sum,0.002,birthFixture.date+' '+name+' six-Bala total reconciles');
      near(row.totalRupa,row.totalVirupa/60,0.001,birthFixture.date+' '+name+' Virupa / Rupa reconciles');
    } else {
      yes(result.yuddhaEvidence.unresolvedGrahas.includes(name),
        birthFixture.date+' '+name+' total is withheld only for unresolved Yuddha');
      eq(row.totalRupa,null,birthFixture.date+' '+name+' Rupa also withheld');
    }
  }
  eq(result.yuddhaEvidence.pairs.length,10,
    birthFixture.date+' all ten five-planet Yuddha pairs are classified');
  eq(result.yuddhaEvidence.resolved,result.yuddhaEvidence.unresolved.length===0,
    birthFixture.date+' Yuddha resolution status matches unresolved rows');
  eq(result.researchOnly,true,birthFixture.date+' engine stays research-only');
}

const maxAbsResidualArcsec=fixture.comparison.maxAbsTropicalResidualArcsec;
yes(Number.isFinite(maxAbsResidualArcsec)&&maxAbsResidualArcsec<=fixture.comparison.acceptanceMaxArcsec,
  'pinned independent NAELOS / Swiss tropical comparisons satisfy the 5-arcsecond source-parity bound');

// Yuddha source-rule edge tests: same degree+minute, same Bhava, northern
// ecliptic latitude wins. Overlaps and exact latitude ties are withheld.
const yuddhaRows=[
  {name:'செவ்வாய்',longitude:100.001,eclipticLatitude:0.25,bhava:4},
  {name:'புதன்',longitude:100.005,eclipticLatitude:-0.25,bhava:4},
  {name:'குரு',longitude:230,eclipticLatitude:0.1,bhava:8},
  {name:'சுக்கிரன்',longitude:310,eclipticLatitude:-0.2,bhava:10},
  {name:'சனி',longitude:50,eclipticLatitude:0.05,bhava:2}
];
const resolved=resolveBphsGrahaYuddha(yuddhaRows);
eq(resolved.resolved,true,'one non-overlapping Yuddha pair resolves');
eq(resolved.encounters.length,1,'one resolved Yuddha encounter');
eq(resolved.encounters[0].winner,'செவ்வாய்','northern ecliptic latitude wins');
eq(resolved.encounters[0].loser,'புதன்','southern ecliptic latitude loses');
eq(resolved.evaluatedPairs,10,'all ten pairs explicitly classified');

const differentMinute=structuredClone(yuddhaRows);
differentMinute[1].longitude=100+1/60;
const noWar=resolveBphsGrahaYuddha(differentMinute);
eq(noWar.encounters.length,0,'next whole arcminute is not a Yuddha match');

const overlap=structuredClone(yuddhaRows);
overlap[2].longitude=100.007;overlap[2].eclipticLatitude=0.05;overlap[2].bhava=4;
const unresolved=resolveBphsGrahaYuddha(overlap);
eq(unresolved.resolved,false,'overlapping three-graha war is unresolved');
yes(unresolved.unresolvedGrahas.includes('செவ்வாய்')&&unresolved.unresolvedGrahas.includes('புதன்')&&unresolved.unresolvedGrahas.includes('குரு'),
  'overlapping Yuddha does not guess a winner');

const tie=structuredClone(yuddhaRows);
tie[1].eclipticLatitude=tie[0].eclipticLatitude;
const latitudeTie=resolveBphsGrahaYuddha(tie);
eq(latitudeTie.resolved,false,'equal northern latitudes are not guessed');
yes(latitudeTie.unresolved.some(row=>row.reason==='northern-latitude-tie'),
  'northern latitude tie is recorded');

const source=fs.readFileSync(new URL('../research/true-bphs/naelos-bphs-shadbala-engine.mjs',import.meta.url),'utf8');
yes(!source.includes('absolute-koti-minus'),'rejected absolute-koti-minus method is absent');
yes(!source.includes('sauraFourPassTrueLongitude'),'historical four-pass True Longitude function is not imported or called');
yes(!source.includes('saura-de441-apparent-true.mjs'),'legacy four-pass research module is outside the dependency graph');
yes(!/calculateBVRamanShadbala|BV_RAMAN_CHAPTER_VI/.test(source),
  'engine does not call the B.V. Raman Shadbala / Chesta implementation');
yes(!source.includes('MODERN_MOSHIER'),'Moshier is not the True Longitude provider');

console.log(JSON.stringify({
  pass:true,assertions,
  engine:'TRUE_BPHS_SHADBALA_NAELOS_DE440',
  fiveNatalEpochs:fixture.births.length,
  fivePlanetTrueLongitudeRows:fixture.comparison.count,
  maxAbsTropicalResidualArcsec: fixture.comparison.maxAbsTropicalResidualArcsec,
  source:'NAELOS Ephemeris 0.1.3 / checked-in JPL DE440 binaries',
  meanSheeghroccheya:'V365 Saura-paksha',
  cheshta:'BPHS I Ch27 vv24–25',
  yuddha:'BPHS I Ch27 v20 magnitude; Uttara Kalamrita II p.41 eligibility/winner fallback',
  classicalCertified:false,productionIntegrationAllowed:false
},null,2));
