/**
 * Independent implementation/data-format cross-check:
 * Naelos Ephemeris (JPL DE440 tables) against the existing exact-epoch
 * NASA/JPL Horizons DE441 apparent-longitude fixture.
 *
 * This verifies the repository-held DE440 binaries, their published
 * manifest checksums, the pinned Naelos runtime parser, and five natal
 * epochs x five BPHS Cheshta-eligible planets.
 *
 * DE440 and DE441 are distinct JPL integrations, but they are from the
 * same JPL ephemeris family. This is not an independent institutional
 * oracle and does not certify the historical Saura model or BPHS Cheshta.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const fixtureUrl = new URL(
  './fixtures/bv-raman-natal-de441-apparent-true-2026-11-20.json',
  import.meta.url
);
const dataDirectory = new URL('../naelos-ephemeris/', import.meta.url);
const fixture = JSON.parse(await readFile(fixtureUrl, 'utf8'));
const manifest = JSON.parse(await readFile(new URL('manifest.json', dataDirectory), 'utf8'));

assert.equal(fixture.schema, 'SMV_ASTRO_DE441_NATAL_APPARENT_TRUE_25_POINT_V1');
assert.equal(fixture.source.provider, 'NASA/JPL Horizons API');
assert.equal(fixture.source.ephemeris, 'DE441');
assert.equal(fixture.source.center, '500@399');
assert.equal(fixture.source.quantity, '31');
assert.equal(manifest.engine, 'Naelos Ephemeris');
assert.equal(manifest.format, 2);
assert.equal(manifest.source.name, 'JPL DE440');
assert.equal(manifest.source.file, 'de440.bsp');
assert.equal(manifest.source.licence, 'public domain (US Government work, NASA/JPL)');
assert.equal(manifest.files.length, 12);
assert.deepEqual(
  manifest.files.map(file => file.name),
  ['ne-1550.bin', 'ne-1600.bin', 'ne-1700.bin', 'ne-1800.bin',
    'ne-1900.bin', 'ne-2000.bin', 'ne-2100.bin', 'ne-2200.bin',
    'ne-2300.bin', 'ne-2400.bin', 'ne-2500.bin', 'ne-2600.bin']
);

const packageEntry = process.env.NAELOS_PACKAGE_ENTRY;
assert.ok(packageEntry, 'workflow must provide NAELOS_PACKAGE_ENTRY for pinned naelos-ephemeris@0.1.3');
const naelos = await import(pathToFileURL(packageEntry).href);
const {
  NaelosEphemeris,
  tablesFor,
  SE_MERCURY,
  SE_VENUS,
  SE_MARS,
  SE_JUPITER,
  SE_SATURN,
  SEFLG_SPEED
} = naelos;

assert.equal(typeof NaelosEphemeris?.fromBuffers, 'function');
assert.equal(typeof tablesFor, 'function');

let assertions = 15;
const buffers = [];
const bytesByName = new Map();

for (const entry of manifest.files) {
  const bytes = await readFile(new URL(entry.name, dataDirectory));
  assert.equal(bytes.byteLength, entry.bytes, entry.name + ' byte length matches manifest');
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  assert.equal(sha256, entry.sha256, entry.name + ' SHA-256 matches upstream manifest');
  buffers.push(bytes);
  bytesByName.set(entry.name, bytes);
  assertions += 2;
}

const eph = NaelosEphemeris.fromBuffers(buffers);
assert.ok(Math.abs(eph.range.start - manifest.files[0].start_jd_tdb) < 1e-9,
  'parsed DE440 table range begins at manifest TDB epoch');
assert.ok(Math.abs(eph.range.end - manifest.files.at(-1).end_jd_tdb) < 1e-9,
  'parsed DE440 table range ends at manifest TDB epoch');
assertions += 2;

const bodyIds = Object.freeze({
  Mercury: SE_MERCURY,
  Venus: SE_VENUS,
  Mars: SE_MARS,
  Jupiter: SE_JUPITER,
  Saturn: SE_SATURN
});
const expectedBodyIds = Object.freeze({
  Mercury: 2,
  Venus: 3,
  Mars: 4,
  Jupiter: 5,
  Saturn: 6
});
for (const [planet, bodyId] of Object.entries(bodyIds)) {
  assert.equal(bodyId, expectedBodyIds[planet], planet + ' uses the intended Swiss-compatible Naelos body number');
  assertions++;
}

const expectedCenturyFile = jdUt => jdUt < 2451544.5 ? 'ne-1900.bin' : 'ne-2000.bin';
const wrap = value => ((value % 360) + 360) % 360;
const signedDifference = (candidate, reference) =>
  ((candidate - reference + 540) % 360) - 180;
const maxAllowedDifferenceDegrees = 0.0001; // 0.36 arcseconds: strict, evidence-backed five-epoch cross-model gate
const observations = [];

assert.equal(fixture.births.length, 5);
assertions++;

for (const birth of fixture.births) {
  const expectedFile = expectedCenturyFile(birth.jdUt);
  const selectedFiles = tablesFor(birth.jdUt, birth.jdUt);
  assert.ok(selectedFiles.includes(expectedFile),
    birth.id + ' Naelos tablesFor selects ' + expectedFile);
  assert.ok(selectedFiles.every(name => bytesByName.has(name)),
    birth.id + ' all required century binaries are present in the repository');
  assertions += 2;

  const localEph = NaelosEphemeris.fromBuffers(selectedFiles.map(name => bytesByName.get(name)));
  for (const [planet, referenceTropical] of Object.entries(birth.longitudes)) {
    assert.ok(Number.isFinite(referenceTropical) && referenceTropical >= 0 && referenceTropical < 360,
      birth.id + ' ' + planet + ' DE441 longitude is normalized');
    const position = localEph.calc_ut(birth.jdUt, bodyIds[planet], SEFLG_SPEED);
    assert.ok(position && !('error' in position),
      birth.id + ' ' + planet + ' Naelos DE440 position is available: ' + (position?.error ?? ''));
    assert.ok(Number.isFinite(position.longitude),
      birth.id + ' ' + planet + ' finite DE440 apparent longitude');
    assert.ok(Number.isFinite(position.longitudeSpeed),
      birth.id + ' ' + planet + ' finite DE440 longitude speed');
    assert.equal(position.flags & SEFLG_SPEED, SEFLG_SPEED,
      birth.id + ' ' + planet + ' speed flag retained');

    const delta = signedDifference(wrap(position.longitude), referenceTropical);
    assert.ok(Math.abs(delta) <= maxAllowedDifferenceDegrees,
      birth.id + ' ' + planet + ' Naelos DE440 vs JPL DE441 <= ' +
        maxAllowedDifferenceDegrees + ' degrees; got ' + delta);
    assertions += 6;
    observations.push({
      birth: birth.id,
      planet,
      de440ApparentTropicalDegrees: Number(wrap(position.longitude).toFixed(9)),
      de441HorizonsTropicalDegrees: referenceTropical,
      signedDifferenceDegrees: Number(delta.toFixed(9)),
      de440LongitudeSpeedDegreesPerDay: Number(position.longitudeSpeed.toFixed(9)),
      sourceCenturyFile: expectedFile
    });
  }
}

assert.equal(observations.length, 25, 'five natal epochs x five planets');
assertions++;
const maxAbsResidual = Math.max(...observations.map(item => Math.abs(item.signedDifferenceDegrees)));
const rmsResidual = Math.sqrt(
  observations.reduce((sum, item) => sum + item.signedDifferenceDegrees ** 2, 0) / observations.length
);
const perPlanet = Object.keys(bodyIds).map(planet => {
  const rows = observations.filter(item => item.planet === planet);
  return {
    planet,
    samples: rows.length,
    maxAbsResidualDegrees: Number(Math.max(...rows.map(item => Math.abs(item.signedDifferenceDegrees))).toFixed(9)),
    rmsResidualDegrees: Number(Math.sqrt(rows.reduce((sum, item) => sum + item.signedDifferenceDegrees ** 2, 0) / rows.length).toFixed(9))
  };
});

console.log(JSON.stringify({
  test: 'Naelos DE440 vs JPL Horizons DE441 five-natal apparent tropical longitude cross-check',
  assertions,
  manifestFilesVerified: manifest.files.length,
  samples: observations.length,
  maximumAbsoluteResidualDegrees: Number(maxAbsResidual.toFixed(9)),
  rmsResidualDegrees: Number(rmsResidual.toFixed(9)),
  maximumAllowedDifferenceDegrees: maxAllowedDifferenceDegrees,
  perPlanet,
  observations
}, null, 2));
console.log('PASS: 12 Naelos DE440 files pass size/SHA-256/parse checks; all 25 Naelos-DE440 vs Horizons-DE441 points pass.');
