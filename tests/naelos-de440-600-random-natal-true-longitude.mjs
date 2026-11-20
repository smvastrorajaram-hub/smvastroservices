import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  NaelosEphemeris,
  SE_MERCURY, SE_VENUS, SE_MARS, SE_JUPITER, SE_SATURN
} from 'naelos-ephemeris';
import { getSwe, C } from '../public/horoscope/offline/wasm-provider.mjs';
import { sauraBijaCorrectedFivePlanetInputs } from '../research/saura-bija/saura-bija-mean-motion.mjs';
import { sauraSiderealOffsetFromLahiri } from '../research/saura-bija/saura-de441-apparent-true.mjs';

const ARTIFACT_URL = new URL(
  '../artifacts/natal-classical-random-600-charts-1800-2399.json',
  import.meta.url
);
const ROOT = new URL('../naelos-ephemeris/', import.meta.url);
const report = JSON.parse(readFileSync(ARTIFACT_URL, 'utf8'));
const manifest = JSON.parse(readFileSync(new URL('manifest.json', ROOT), 'utf8'));

const requiredFiles = [
  'ne-1800.bin',
  'ne-1900.bin',
  'ne-2000.bin',
  'ne-2100.bin',
  'ne-2200.bin',
  'ne-2300.bin'
];
const buffers = requiredFiles.map(name => {
  const entry = manifest.files.find(row => row.name === name);
  assert.ok(entry, 'NAELOS manifest contains ' + name);
  const bytes = readFileSync(new URL(name, ROOT));
  assert.equal(bytes.length, entry.bytes, name + ' exact manifest byte length');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256,
    name + ' SHA-256 matches the checked-in JPL DE440 manifest');
  return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
});
assert.equal(manifest.source.name, 'JPL DE440',
  'NAELOS binary manifest declares JPL DE440 as its source');

assert.equal(report.pass, true, 'the deterministic 600-chart artifact is present and passed');
assert.equal(report.records.length, 600, 'one random natal record for every year 1800–2399');
assert.equal(report.records[0].year, 1800, 'annual coverage starts in 1800');
assert.equal(report.records[599].year, 2399, 'annual coverage ends in 2399');

const eph = NaelosEphemeris.fromBuffers(buffers);
const swe = await getSwe();
swe.setSiderealLahiri();

const bodies = Object.freeze([
  ['செவ்வாய்', 'Mars', SE_MARS, C.MARS],
  ['புதன்', 'Mercury', SE_MERCURY, C.MERCURY],
  ['குரு', 'Jupiter', SE_JUPITER, C.JUPITER],
  ['சுக்கிரன்', 'Venus', SE_VENUS, C.VENUS],
  ['சனி', 'Saturn', SE_SATURN, C.SATURN]
]);
const MAX_ABS_RESIDUAL_ARCSEC = 5;
const norm = value => ((value % 360) + 360) % 360;
const signedArcsec = (a, b) => {
  const difference = ((a - b + 540) % 360) - 180;
  return difference * 3600;
};
const finite = value => typeof value === 'number' && Number.isFinite(value);
const lahiriAyanamsaAt1860 = swe.ayanamsa(
  swe.utcToJd(1860, 1, 1, 0, 0, 0).ut
);
assert.ok(finite(lahiriAyanamsaAt1860),
  'Lahiri ayanamsa at the Burgess 1860 frame epoch is finite');

let comparisonCount = 0;
let maxAbsResidualArcsec = 0;
let sumSquaresResidualArcsec = 0;
const perPlanet = Object.fromEntries(bodies.map(([, english]) => [english, {
  samples: 0,
  maxAbsResidualArcsec: 0,
  sumSquaresResidualArcsec: 0
}]));

for (let index = 0; index < report.records.length; index++) {
  const record = report.records[index];
  assert.equal(record.year, 1800 + index,
    'annual random epoch is unique and in sequence for year ' + record.year);
  assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(record.date),
    record.epochId + ' has a Gregorian date');
  assert.ok(/^\d{2}:\d{2}$/.test(record.localTime),
    record.epochId + ' has a local wall-clock time');
  assert.ok(finite(record.historicalUtcOffsetMinutes),
    record.epochId + ' retains its historical IANA UTC offset');

  const [year, month, day] = record.date.split('-').map(Number);
  const [hour, minute] = record.localTime.split(':').map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day, hour, minute) -
    record.historicalUtcOffsetMinutes * 60_000);
  const swissJD = swe.utcToJd(
    utcDate.getUTCFullYear(),
    utcDate.getUTCMonth() + 1,
    utcDate.getUTCDate(),
    utcDate.getUTCHours(),
    utcDate.getUTCMinutes(),
    utcDate.getUTCSeconds()
  );
  assert.ok(finite(swissJD?.ut) && finite(swissJD?.et),
    record.epochId + ' UTC-to-UT1/ET conversion succeeds');

  const ut1DifferenceSeconds =
    (swissJD.ut - record.julianDayUT) * 86400;
  assert.ok(Math.abs(ut1DifferenceSeconds) < 2,
    record.epochId + ' independently reconstructed UT1 matches the natal UTC-derived JD');
  const jdUT = swissJD.ut;
  const jdTT = swissJD.et;
  const ayanamsa = swe.ayanamsa(jdUT);
  assert.ok(finite(ayanamsa), record.epochId + ' Lahiri ayanamsa is finite');

  const validatedRows = [];
  for (const [tamil, english, naelosBody, swissBody] of bodies) {
    const naelos = eph.calc(jdTT, naelosBody, 0);
    assert.ok(naelos && !('error' in naelos) && finite(naelos.longitude),
      record.epochId + ' ' + english + ' NAELOS DE440 apparent longitude exists');

    // Both engines receive the identical ET/TT Julian Day and are compared
    // in the tropical apparent ecliptic-of-date frame. The 5-arcsecond gate
    // is a modern numerical parity check, not a historical-Saura certificate.
    const swiss = swe.calc(jdTT, swissBody, 2 | 256);
    assert.ok(finite(swiss?.longitude),
      record.epochId + ' ' + english + ' Swiss tropical apparent longitude exists');
    const residualArcsec = signedArcsec(naelos.longitude, swiss.longitude);
    const absResidualArcsec = Math.abs(residualArcsec);
    maxAbsResidualArcsec = Math.max(maxAbsResidualArcsec, absResidualArcsec);
    sumSquaresResidualArcsec += residualArcsec * residualArcsec;
    perPlanet[english].samples++;
    perPlanet[english].maxAbsResidualArcsec =
      Math.max(perPlanet[english].maxAbsResidualArcsec, absResidualArcsec);
    perPlanet[english].sumSquaresResidualArcsec += residualArcsec * residualArcsec;
    comparisonCount++;

    // Preserve the already source-audited Saura mean / Sheeghroccheya
    // selector. Transfer only DE440's modern apparent true longitude into
    // the Burgess-1860 Saura sidereal frame; never call it a historical
    // Sūrya-Siddhānta True Longitude result.
    const sauraOffset = sauraSiderealOffsetFromLahiri(
      ayanamsa, lahiriAyanamsaAt1860
    );
    const trueLongitudeSaura = norm(naelos.longitude - sauraOffset);
    // The Bīja-corrected classical Mean and Sheeghroccheya are evaluated
    // independently at this exact same UT epoch and in the same Saura frame.
    // They remain separate from the modern DE440 apparent True longitude
    // below: same coordinates do not make two different dynamical models
    // interchangeable BPHS inputs.
    const classicalInputs = sauraBijaCorrectedFivePlanetInputs(jdUT, english);
    assert.ok(finite(classicalInputs.meanLongitude) &&
      finite(classicalInputs.sheeghrocca),
      record.epochId + ' ' + english + ' same-epoch Bīja Mean/Sheeghroccheya exist');
    assert.equal(classicalInputs.frame, 'traditional-Saura-nirayana',
      record.epochId + ' ' + english + ' Bīja Mean/Sheeghroccheya frame is explicit');
    assert.equal(classicalInputs.productionEligible, false,
      record.epochId + ' ' + english + ' Bīja inputs remain research-only');

    validatedRows.push({
      grahaTamil: tamil,
      planet: english,
      source: 'NAELOS Ephemeris 0.1.3 / NASA-JPL DE440',
      modernReference: 'Swiss Ephemeris tropical apparent longitude at the same ET/TT instant',
      comparisonFrame: 'geocentric tropical apparent ecliptic-of-date',
      signedTropicalResidualArcsec: residualArcsec,
      naelosTrueLongitudeTropicalApparent: naelos.longitude,
      swissTrueLongitudeTropicalApparent: swiss.longitude,
      sauraFrameTransfer: 'Burgess 1860 zero point + date-specific Lahiri precession delta',
      modernDe440TrueLongitudeSaura: trueLongitudeSaura,
      modernTrueLongitudeFrame: classicalInputs.frame,
      classicalBijaMeanLongitudeSaura: classicalInputs.meanLongitude,
      classicalBijaSheeghroccheyaSaura: classicalInputs.sheeghrocca,
      classicalBijaInputsFrame: classicalInputs.frame,
      exactSameBirthEpoch: true,
      coordinateFrameMatches: true,
      dynamicModelMatches: false,
      bphsCheshtaComputedFromMixedModels: false,
      historicalClassicalTrueLongitudeCertified: false,
      productionEligible: false
    });
  }
  record.trueLongitudeReferenceValidation = {
    sourceEngine: 'NAELOS Ephemeris 0.1.3 / NASA-JPL DE440',
    epoch: 'Same ET/TT Julian Day supplied to NAELOS and Swiss comparison',
    julianDayUT1: jdUT,
    julianDayTT: jdTT,
    ut1ReconstructionDifferenceSeconds: ut1DifferenceSeconds,
    rows: validatedRows
  };
}

assert.equal(comparisonCount, 600 * 5,
  '600 exact random natal epochs × five planets = 3,000 comparisons');
assert.equal(Object.values(perPlanet).reduce((sum, row) => sum + row.samples, 0), 3000,
  'all 3,000 comparisons are allocated to five planets');
assert.ok(maxAbsResidualArcsec <= MAX_ABS_RESIDUAL_ARCSEC,
  'all 3,000 DE440-vs-Swiss tropical apparent longitude residuals <= 5 arcsec; max=' +
  maxAbsResidualArcsec);

for (const row of Object.values(perPlanet)) {
  row.rmsResidualArcsec = Math.sqrt(row.sumSquaresResidualArcsec / row.samples);
  delete row.sumSquaresResidualArcsec;
  assert.equal(row.samples, 600, 'each of five planets has 600 exact-epoch comparisons');
}
const rmsResidualArcsec = Math.sqrt(sumSquaresResidualArcsec / comparisonCount);

report.trueLongitudeReferenceValidation = {
  status: 'PASS_3000_EXACT_RANDOM_NATAL_EPOCH_MODERN_PARITY',
  sourceEngine: 'NAELOS Ephemeris 0.1.3 / NASA-JPL DE440',
  comparisonEngine: 'Repository Swiss Ephemeris WASM',
  comparison: 'Tropical geocentric apparent ecliptic-of-date at the same ET/TT instant',
  randomNatalCharts: 600,
  planets: 5,
  comparisons: comparisonCount,
  requiredComparisons: 3000,
  acceptanceMaxArcsec: MAX_ABS_RESIDUAL_ARCSEC,
  maxAbsResidualArcsec,
  rmsResidualArcsec,
  perPlanet,
  binaryFilesVerified: requiredFiles,
  independentHistoricalOracleVerifiedRows: 0,
  classicalTrueLongitudeCertified: false,
  classicalNatalCertificationEligible: false,
  productionEligible: false,
  interpretation: 'This independently checks the modern DE440 apparent true-longitude numerical series at the exact 600 seeded-random natal epochs. It does not prove the historical Sūrya-Siddhānta four-pass True Longitude values, and it does not promote the 600 charts to classicalCertified.'
};
report.certification = {
  ...report.certification,
  classicalCertified: false,
  independentHistoricalOracleVerifiedRows: 0,
  modernDe440ExactNatalEpochParityRows: comparisonCount,
  status: 'NOT_CERTIFIED',
  note: 'Modern DE440 apparent-longitude parity is separately verified at each sampled epoch. It is not a historical Saura printed-table oracle and does not by itself certify Mean/True/Sheeghroccheya or all six Shadbala components.'
};

writeFileSync(ARTIFACT_URL, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({
  pass: true,
  status: report.trueLongitudeReferenceValidation.status,
  randomNatalCharts: 600,
  exactEpochComparisons: comparisonCount,
  maxAbsResidualArcsec,
  rmsResidualArcsec,
  acceptanceMaxArcsec: MAX_ABS_RESIDUAL_ARCSEC,
  perPlanet,
  historicalClassicalTrueLongitudeCertified: false,
  ordinaryNatalClassicalCertified: false,
  artifact: 'artifacts/natal-classical-random-600-charts-1800-2399.json'
}));
