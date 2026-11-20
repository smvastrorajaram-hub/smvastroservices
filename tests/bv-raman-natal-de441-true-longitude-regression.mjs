/**
 * Five natal dates x five grahas: local ephemeris apparent longitude
 * against exact-epoch NASA/JPL Horizons DE441 geocentric apparent positions.
 *
 * This is a MODERN ephemeris cross-validation at historical epochs.
 * It does NOT certify historical Saura true longitude or a coherent
 * classical BPHS Cheshta triplet. No classical Mean/Sheeghroccheya inputs
 * are mixed with these modern True-longitude values.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { full } from '../public/horoscope/offline/offline-engine.mjs';
import { getSwe } from '../public/horoscope/offline/wasm-provider.mjs';

const fixture = JSON.parse(await readFile(
  new URL('./fixtures/bv-raman-natal-de441-apparent-true-2026-11-20.json', import.meta.url),
  'utf8'
));

const tamilNames = Object.freeze({
  Mercury: 'புதன்',
  Venus: 'சுக்கிரன்',
  Mars: 'செவ்வாய்',
  Jupiter: 'குரு',
  Saturn: 'சனி'
});
const expectedTargetIds = Object.freeze({
  Mercury: '199',
  Venus: '299',
  Mars: '4',
  Jupiter: '5',
  Saturn: '6'
});
const wrap = value => ((value % 360) + 360) % 360;
const signedDifference = (candidate, reference) =>
  ((candidate - reference + 540) % 360) - 180;

assert.equal(fixture.schema, 'SMV_ASTRO_DE441_NATAL_APPARENT_TRUE_25_POINT_V1');
assert.equal(fixture.source.provider, 'NASA/JPL Horizons API');
assert.equal(fixture.source.ephemeris, 'DE441');
assert.equal(fixture.source.center, '500@399');
assert.equal(fixture.source.quantity, '31');
assert.equal(fixture.source.timeScale, 'UT');
assert.deepEqual(fixture.source.targetIds, expectedTargetIds);
assert.equal(fixture.births.length, 5);

let assertions = 8;
const observations = [];
const swe = await getSwe();
const targetBodyIds = Object.freeze({ Mercury: 2, Venus: 3, Mars: 4, Jupiter: 5, Saturn: 6 });
for (const birth of fixture.births) {
  assert.equal(Object.keys(birth.longitudes).length, 5, birth.id + ' five JPL values');
  assertions++;
  assert.equal(birth.utcOffsetMinutes, 330, birth.id + ' India UTC offset');
  assertions++;

  const utcMillis = Date.parse(birth.localDate + 'T' + birth.localTime + ':00Z')
    - birth.utcOffsetMinutes * 60_000;
  const reconstructedUtc = new Date(utcMillis).toISOString().replace('.000Z', '');
  assert.equal(reconstructedUtc, birth.utcDateTime, birth.id + ' exact local-to-UT conversion');
  assertions++;
  const reconstructedJd = utcMillis / 86_400_000 + 2_440_587.5;
  assert.ok(Math.abs(reconstructedJd - birth.jdUt) < 1e-8,
    birth.id + ' discrete Horizons JD matches the natal instant');
  assertions++;

  const [year, month, day] = birth.utcDateTime.slice(0, 10).split('-').map(Number);
  const [hour, minute, second] = birth.utcDateTime.slice(11).split(':').map(Number);
  const jd = swe.utcToJd(year, month, day, hour, minute, second);
  assert.ok(Math.abs(jd.ut - birth.jdUt) < 1e-8, birth.id + ' WASM UTC-to-JD agrees with Horizons JD');
  assertions++;
  const result = await full({
    date: birth.localDate,
    time: birth.localTime,
    timezone: 'Asia/Kolkata',
    utcOffsetMinutes: birth.utcOffsetMinutes,
    lat: 11.232,
    lon: 78.88,
    basicOnly: true,
    language: 'ta'
  });
  assert.equal(result?.ok, true, birth.id + ' local chart calculated');
  assertions++;
  const chart = result.chart;
  assert.ok(['SWIEPH', 'MOSEPH'].includes(chart.ephemerisMode),
    birth.id + ' runtime must identify a supported Swiss or Moshier calculation mode');
  assertions++;
  assert.ok(Number.isFinite(chart.ayanamsa),
    birth.id + ' finite Lahiri ayanamsa for tropical-frame reconstruction');
  assertions++;

  for (const [planet, referenceTropical] of Object.entries(birth.longitudes)) {
    assert.equal(fixture.source.targetIds[planet], expectedTargetIds[planet],
      birth.id + ' ' + planet + ' DE441 target ID');
    assert.ok(Number.isFinite(referenceTropical) && referenceTropical >= 0 && referenceTropical < 360,
      birth.id + ' ' + planet + ' normalized JPL longitude');
    const local = chart.planets.find(p => p.name === tamilNames[planet]);
    assert.ok(local, birth.id + ' ' + planet + ' present');
    assert.ok(Number.isFinite(local.longitude), birth.id + ' ' + planet + ' sidereal longitude finite');
    const candidateTropical = wrap(Number(local.longitude) + Number(chart.ayanamsa));
    const delta = signedDifference(candidateTropical, referenceTropical);
    const directTropical = swe.calc(jd.et, targetBodyIds[planet], 2 | 256);
    assert.ok(Number.isFinite(directTropical.longitude), birth.id + ' ' + planet + ' direct tropical longitude finite');
    const directDelta = signedDifference(Number(directTropical.longitude), referenceTropical);
    assert.ok(Math.abs(directDelta) <= 0.05,
      birth.id + ' ' + planet + ' direct SWIEPH tropical vs DE441 <= 0.05 degrees; got ' + directDelta);
    assert.ok(Math.abs(delta) <= 0.05,
      birth.id + ' ' + planet + ' local ephemeris vs independent DE441 <= 0.05 degrees; got ' + delta);
    assertions += 7;
    observations.push({
      birth: birth.id,
      planet,
      de441ApparentTropicalDegrees: referenceTropical,
      localApparentTropicalDegrees: Number(candidateTropical.toFixed(9)),
      signedDifferenceDegrees: Number(delta.toFixed(9)),
      directTropicalDegrees: Number(directTropical.longitude.toFixed(9)),
      directSignedDifferenceDegrees: Number(directDelta.toFixed(9)),
      directRetFlag: directTropical.retFlag,
      runtimeMode: chart.ephemerisMode
    });
  }
}

assert.equal(observations.length, 25, 'five natal epochs x five planets');
assertions++;
const maxAbsResidual = Math.max(...observations.map(x => Math.abs(x.signedDifferenceDegrees)));
const maxDirectAbsResidual = Math.max(...observations.map(x => Math.abs(x.directSignedDifferenceDegrees)));
const rmsResidual = Math.sqrt(
  observations.reduce((sum, x) => sum + x.signedDifferenceDegrees ** 2, 0) / observations.length
);
const directRmsResidual = Math.sqrt(
  observations.reduce((sum, x) => sum + x.directSignedDifferenceDegrees ** 2, 0) / observations.length
);
assert.ok(maxAbsResidual <= 0.05, 'all 25 independent modern true-longitude comparisons pass');
assertions++;

const perPlanet = Object.fromEntries(Object.keys(expectedTargetIds).map(planet => {
  const sample = observations.filter(x => x.planet === planet);
  const values = sample.map(x => x.signedDifferenceDegrees);
  return [planet, {
    samples: sample.length,
    rmsResidualDegrees: Number(Math.sqrt(values.reduce((sum, x) => sum + x * x, 0) / values.length).toFixed(9)),
    maxAbsResidualDegrees: Number(Math.max(...values.map(Math.abs)).toFixed(9)),
    directTropicalRmsResidualDegrees: Number(Math.sqrt(sample.reduce((sum, x) => sum + x.directSignedDifferenceDegrees ** 2, 0) / sample.length).toFixed(9)),
    directTropicalMaxAbsResidualDegrees: Number(Math.max(...sample.map(x => Math.abs(x.directSignedDifferenceDegrees))).toFixed(9))
  }];
}));

console.log(JSON.stringify({
  pass: true,
  assertions,
  grid: '5 exact historical natal epochs x 5 visible planets',
  candidate: 'SMV bundled Swiss Ephemeris runtime (' + observations[0]?.runtimeMode + '), geocentric apparent tropical longitude reconstructed from Lahiri sidereal output',
  reference: 'NASA/JPL Horizons DE441, Earth-geocentric apparent IAU76/80 ecliptic-of-date quantity 31',
  samples: observations.length,
  perPlanet,
  maxAbsResidualDegrees: Number(maxAbsResidual.toFixed(9)),
  rmsResidualDegrees: Number(rmsResidual.toFixed(9)),
  directTropicalMaxAbsResidualDegrees: Number(maxDirectAbsResidual.toFixed(9)),
  directTropicalRmsResidualDegrees: Number(directRmsResidual.toFixed(9)),
  modernHistoricalEpochTrueLongitudeGate: true,
  historicalSauraTrueLongitudeCertified: false,
  classicalFiveGrahaCheshtaCertified: false,
  productionIntegrationAllowed: false
}));
