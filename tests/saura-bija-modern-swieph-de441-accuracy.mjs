/**
 * Independent modern-ephemeris accuracy check:
 * local Swiss Ephemeris SWIEPH geocentric apparent tropical longitude
 * versus the 600 annual NASA/JPL Horizons DE441 quantity-31 fixture epochs.
 *
 * This is deliberately NOT a test of CLASSICAL_BIJA_TRUE. The traditional
 * Saura model remains a separate historical product and its modern residual
 * gate remains reported independently. This test determines whether the
 * existing local Swiss ephemeris can provide a genuinely accurate modern
 * geocentric true-longitude product at the same epochs and in the same frame.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { C, getSwe } from '../public/horoscope/offline/wasm-provider.mjs';

const SWIEPH = 2;
const LIMIT_DEGREES = 0.05;
const BODY_IDS = Object.freeze({
  Mercury: C.MERCURY,
  Venus: C.VENUS,
  Mars: C.MARS,
  Jupiter: C.JUPITER,
  Saturn: C.SATURN
});
const jdFromCalendar = year =>
  Date.UTC(year, 0, 1, 0, 0, 0) / 86400000 + 2440587.5;
const signed = (a, b) => ((a - b + 540) % 360) - 180;
const abs = value => Math.abs(value);

const fixture = JSON.parse(fs.readFileSync(
  new URL('./fixtures/saura-bija-jpl-de441-annual-1800-2399.json', import.meta.url),
  'utf8'
));
assert.equal(fixture.ephemeris, 'DE441');
assert.equal(fixture.centerBody, 'Earth (399)');
assert.equal(fixture.observerCenter, '500@399');
assert.equal(fixture.quantity, 31);
assert.equal(fixture.interval.start, '1800-01-01');
assert.equal(fixture.interval.stop, '2400-01-01');

const swe = await getSwe();
// Do not enable sidereal flags: both sides must remain tropical ecliptic-of-date.
// swe_calc with SWIEPH alone returns the default geocentric apparent position.
const perPlanet = {};
let totalSamples = 0;
let globalMax = 0;

for (const [planet, bodyId] of Object.entries(BODY_IDS)) {
  const source = fixture.bodies[planet];
  assert.equal(source.rows.length, 600, planet + ' has 600 annual DE441 rows');
  const errors = [];

  for (const row of source.rows) {
    const jd = swe.utcToJd(row.year, 1, 1, 0, 0, 0);
    assert.ok(Number.isFinite(jd?.et), planet + ' ' + row.year + ' ET conversion');
    const modern = swe.calc(jd.et, bodyId, SWIEPH);
    assert.equal(modern.ephemeris, 'swiss', planet + ' ' + row.year + ' must use SWIEPH');
    assert.equal(modern.retFlag & SWIEPH, SWIEPH,
      planet + ' ' + row.year + ' must not fall back to Moshier');
    assert.ok(Number.isFinite(modern.longitude) &&
      modern.longitude >= 0 && modern.longitude < 360,
    planet + ' ' + row.year + ' has a valid tropical longitude');

    const residual = signed(modern.longitude, row.longitude);
    errors.push(residual);
    totalSamples++;
  }

  const absErrors = errors.map(abs).sort((a, b) => a - b);
  const rms = Math.sqrt(errors.reduce((sum, value) => sum + value * value, 0) / errors.length);
  const stats = {
    samples: errors.length,
    signedMeanDegrees: +(errors.reduce((sum, value) => sum + value, 0) / errors.length).toFixed(8),
    rmsDegrees: +rms.toFixed(8),
    p95AbsoluteDegrees: +absErrors[Math.ceil(absErrors.length * 0.95) - 1].toFixed(8),
    maxAbsoluteDegrees: +absErrors.at(-1).toFixed(8),
    thresholdDegrees: LIMIT_DEGREES,
    pass: absErrors.at(-1) <= LIMIT_DEGREES
  };
  perPlanet[planet] = stats;
  globalMax = Math.max(globalMax, stats.maxAbsoluteDegrees);
  assert.ok(stats.pass,
    planet + ' SWIEPH-vs-DE441 max residual ' + stats.maxAbsoluteDegrees +
    '° exceeds strict ' + LIMIT_DEGREES + '° threshold');
}

assert.equal(totalSamples, 3000, 'five planets × 600 annual DE441 epochs');
const strictModernReferenceGatePass = globalMax <= LIMIT_DEGREES;
assert.equal(strictModernReferenceGatePass, true);

console.log(JSON.stringify({
  pass: true,
  gate: 'MODERN_SWIEPH_GEOCENTRIC_APPARENT_TROPICAL_VS_DE441',
  thresholdDegrees: LIMIT_DEGREES,
  strictModernReferenceGatePass,
  samples: totalSamples,
  interval: '1800-01-01..2399-01-01 annual epochs',
  reference: 'NASA/JPL Horizons DE441 Earth-geocentric apparent quantity 31',
  candidate: 'Local Swiss Ephemeris SWIEPH geocentric apparent tropical longitude',
  coordinateFrame: 'Tropical ecliptic-of-date on both sides; no ayanamsa subtraction',
  independentEphemerisModes: ['DE441', 'SWIEPH'],
  classicalBijaTrueAccuracyClaim: false,
  productionChanged: false,
  perPlanet
}));
