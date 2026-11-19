/**
 * Independent modern-ephemeris accuracy check:
 * Swiss Ephemeris' bundled Moshier algorithm (explicit MOSEPH mode) against
 * NASA/JPL Horizons DE441 Earth-geocentric apparent quantity-31 positions.
 *
 * This is not SWIEPH: the current repository contains the Swiss WASM module
 * but not the Swiss planetary .se1 files, and the guarded local provider
 * correctly rejected a silent SWIEPH -> Moshier fallback. This test calls
 * MOSEPH explicitly so the source identity is visible and verifiable.
 *
 * It is also NOT a test of CLASSICAL_BIJA_TRUE. The historical Saura model
 * retains its own separate residual report and accuracy status.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Swisseph from '../public/horoscope/offline/vendor/wasm/swisseph.mjs';

const MOSEPH = 4;
const GREGORIAN = 1;
const LIMIT_DEGREES = 0.05;
const BODY_IDS = Object.freeze({
  Mercury: 2,
  Venus: 3,
  Mars: 4,
  Jupiter: 5,
  Saturn: 6
});
const signed = (a, b) => ((a - b + 540) % 360) - 180;

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

const M = await Swisseph({
  locateFile: path => {
    const url = new URL('../public/horoscope/offline/vendor/wasm/' + path, import.meta.url);
    return typeof process !== 'undefined' && process.versions?.node
      ? decodeURIComponent(url.pathname)
      : url.href;
  }
});
M.ccall('swe_set_ephe_path', 'void', ['string'], ['/sweph']);

function utcToEt(year) {
  const ptr = M._malloc(16);
  if (!ptr) throw new Error('Swiss WASM could not allocate UTC-to-JD output memory');
  try {
    M.ccall('swe_utc_to_jd', 'void',
      ['number','number','number','number','number','number','number','pointer'],
      [year, 1, 1, 0, 0, 0, GREGORIAN, ptr]);
    const et = M.HEAPF64[ptr >> 3];
    if (!Number.isFinite(et)) throw new Error('Swiss WASM returned an invalid ET Julian day for ' + year);
    return et;
  } finally {
    M._free(ptr);
  }
}

function moshierLongitude(jdEt, bodyId, label) {
  const valuesPtr = M._malloc(48);
  const errorPtr = M._malloc(256);
  if (!valuesPtr || !errorPtr) {
    if (valuesPtr) M._free(valuesPtr);
    if (errorPtr) M._free(errorPtr);
    throw new Error('Swiss WASM could not allocate calculation buffers');
  }
  try {
    const retFlag = M.ccall('swe_calc', 'number',
      ['number','number','number','pointer','pointer'],
      [jdEt, bodyId, MOSEPH, valuesPtr, errorPtr]);
    const message = M.UTF8ToString(errorPtr);
    if (retFlag < 0) throw new Error(message || 'Moshier calculation failed');
    assert.equal(retFlag & MOSEPH, MOSEPH,
      label + ' must explicitly return MOSEPH, not another ephemeris');
    const longitude = M.HEAPF64[valuesPtr >> 3];
    assert.ok(Number.isFinite(longitude) && longitude >= 0 && longitude < 360,
      label + ' must return a normalized tropical longitude');
    return longitude;
  } finally {
    M._free(valuesPtr);
    M._free(errorPtr);
  }
}

const perPlanet = {};
let samples = 0;
let globalMax = 0;
for (const [planet, bodyId] of Object.entries(BODY_IDS)) {
  const rows = fixture.bodies[planet].rows;
  assert.equal(rows.length, 600, planet + ' has 600 annual DE441 rows');
  const errors = [];
  for (const row of rows) {
    const et = utcToEt(row.year);
    const longitude = moshierLongitude(et, bodyId, planet + ' ' + row.year);
    errors.push(signed(longitude, row.longitude));
    samples++;
  }
  const sortedAbs = errors.map(Math.abs).sort((a, b) => a - b);
  const maxAbs = sortedAbs.at(-1);
  const rms = Math.sqrt(errors.reduce((sum, value) => sum + value * value, 0) / errors.length);
  perPlanet[planet] = {
    samples: errors.length,
    signedMeanDegrees: +(errors.reduce((sum, value) => sum + value, 0) / errors.length).toFixed(8),
    rmsDegrees: +rms.toFixed(8),
    p95AbsoluteDegrees: +sortedAbs[Math.ceil(sortedAbs.length * 0.95) - 1].toFixed(8),
    maxAbsoluteDegrees: +maxAbs.toFixed(8),
    thresholdDegrees: LIMIT_DEGREES,
    pass: maxAbs <= LIMIT_DEGREES
  };
  globalMax = Math.max(globalMax, maxAbs);
  assert.ok(maxAbs <= LIMIT_DEGREES,
    planet + ' Moshier-vs-DE441 max residual ' + maxAbs +
    '° exceeds strict ' + LIMIT_DEGREES + '° threshold');
}
assert.equal(samples, 3000);
assert.ok(globalMax <= LIMIT_DEGREES);

console.log(JSON.stringify({
  pass: true,
  gate: 'MODERN_MOSHIER_GEOCENTRIC_APPARENT_TROPICAL_VS_DE441',
  thresholdDegrees: LIMIT_DEGREES,
  maxAbsoluteDegrees: +globalMax.toFixed(8),
  samples,
  interval: '1800-01-01..2399-01-01 annual epochs',
  reference: 'NASA/JPL Horizons DE441 Earth-geocentric apparent quantity 31',
  candidate: 'Swiss Ephemeris Moshier algorithm (explicit MOSEPH flag 4)',
  coordinateFrame: 'Tropical ecliptic-of-date on both sides; no ayanamsa subtraction',
  independentEphemerisModes: ['DE441', 'MOSEPH'],
  classicalBijaTrueAccuracyClaim: false,
  productionChanged: false,
  perPlanet
}));
