/**
 * Five natal dates x five grahas: local Swiss/Moshier apparent longitude
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
const wrap = value => ((value % 360) + 360) % 360;
const signedDifference = (candidate, reference) =>
  ((candidate - reference + 540) % 360) - 180;

assert.equal(fixture.schema, 'SMV_ASTRO_DE441_NATAL_APPARENT_TRUE_25_POINT_V1');
assert.equal(fixture.source.provider, 'NASA/JPL Horizons API');
assert.equal(fixture.source.ephemeris, 'DE441');
assert.equal(fixture.source.center, '500@399');
assert.equal(fixture.source.quantity, '31');
assert.equal(fixture.source.timeScale, 'UT');
assert.equal(fixture.births.length, 5);

let assertions = 6;
const observations = [];
for (const birth of fixture.births) {
  assert.equal(Object.keys(birth.longitudes).length, 5, birth.id + ' five JPL values');
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
  assert.equal(chart.ephemerisMode, 'MOSEPH',
    birth.id + ' explicit Moshier runtime required for this comparison');
  assertions++;
  assert.equal(chart.ephemerisFilesPresent, false,
    birth.id + ' no Swiss .se1 fallback in this Moshier validation');
  assertions++;
  assert.ok(Number.isFinite(chart.ayanamsa),
    birth.id + ' finite Lahiri ayanamsa for tropical-frame reconstruction');
  assertions++;

  for (const [planet, referenceTropical] of Object.entries(birth.longitudes)) {
    const local = chart.planets.find(p => p.name === tamilNames[planet]);
    assert.ok(local, birth.id + ' ' + planet + ' present');
    assert.ok(Number.isFinite(local.longitude), birth.id + ' ' + planet + ' sidereal longitude finite');
    const candidateTropical = wrap(Number(local.longitude) + Number(chart.ayanamsa));
    const delta = signedDifference(candidateTropical, referenceTropical);
    assert.ok(Math.abs(delta) <= 0.05,
      birth.id + ' ' + planet + ' Moshier vs independent DE441 <= 0.05 degrees; got ' + delta);
    assertions += 3;
    observations.push({
      birth: birth.id,
      planet,
      de441ApparentTropicalDegrees: referenceTropical,
      localMoshierTropicalDegrees: Number(candidateTropical.toFixed(9)),
      signedDifferenceDegrees: Number(delta.toFixed(9))
    });
  }
}

assert.equal(observations.length, 25, 'five natal epochs x five planets');
assertions++;
const maxAbsResidual = Math.max(...observations.map(x => Math.abs(x.signedDifferenceDegrees)));
const rmsResidual = Math.sqrt(
  observations.reduce((sum, x) => sum + x.signedDifferenceDegrees ** 2, 0) / observations.length
);
assert.ok(maxAbsResidual <= 0.05, 'all 25 independent modern true-longitude comparisons pass');
assertions++;

console.log(JSON.stringify({
  pass: true,
  assertions,
  grid: '5 exact historical natal epochs x 5 visible planets',
  candidate: 'SMV bundled Swiss Ephemeris Moshier, geocentric apparent tropical longitude reconstructed from Lahiri sidereal output',
  reference: 'NASA/JPL Horizons DE441, Earth-geocentric apparent IAU76/80 ecliptic-of-date quantity 31',
  samples: observations.length,
  maxAbsResidualDegrees: Number(maxAbsResidual.toFixed(9)),
  rmsResidualDegrees: Number(rmsResidual.toFixed(9)),
  modernHistoricalEpochTrueLongitudeGate: true,
  historicalSauraTrueLongitudeCertified: false,
  classicalFiveGrahaCheshtaCertified: false,
  productionIntegrationAllowed: false
}));
