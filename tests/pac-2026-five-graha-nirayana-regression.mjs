/**
 * Cross-check the five visible grahas against the Government of India's
 * Positional Astronomy Centre 2026 daily Nirayana longitude tables.
 *
 * The PDFs state the civil dates and Nirayana longitudes, but their page
 * headings do not explicitly identify the daily epoch or named ayanamsa.
 * This regression fixes the requested project comparison epoch at
 * 00:00:00 UTC and converts that instant to TT with Swiss utcToJd().
 * Lahiri remains an inferred comparison convention, not PDF metadata.
 *
 * This validates selected official PAC table entries against the bundled
 * Swiss Ephemeris implementation. It does not prove that PAC used an
 * independent dynamical ephemeris, nor does it certify historical Saura
 * mean/true/Sheeghroccheya triplets or BPHS Cheshta.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getSwe } from '../public/horoscope/offline/wasm-provider.mjs';

const fixture = JSON.parse(await readFile(
  new URL('./fixtures/pac-2026-five-graha-nirayana.json', import.meta.url),
  'utf8'
));

const bodyIds = Object.freeze({
  Mercury: 2,
  Venus: 3,
  Mars: 4,
  Jupiter: 5,
  Saturn: 6
});
const wrap = value => ((value % 360) + 360) % 360;
const signedDifference = (candidate, reference) =>
  ((candidate - reference + 540) % 360) - 180;

assert.equal(fixture.schema, 'SMV_ASTRO_PAC_2026_NIRAYANA_LONGITUDE_15_POINT_V1');
assert.equal(fixture.source.publisher,
  'Positional Astronomy Centre, Kolkata — India Meteorological Department, Government of India');
assert.equal(fixture.samples.length, 3);
assert.deepEqual(Object.keys(fixture.comparison.targetBodyIds), Object.keys(bodyIds));
assert.equal(fixture.comparison.maximumAllowedDifferenceDegrees, 0.0001);
assert.equal(fixture.source.timeAndAyanamsaStatus,
  'UTC epoch fixed by project instruction; PAC confirmation pending. Lahiri remains an inferred comparison convention, not PDF metadata.');

const swe = await getSwe();
swe.setSiderealLahiri();
const flags = swe.siderealSpeedFlags();
assert.equal(flags & 2, 2, 'comparison must use Swiss Ephemeris data, not a Moshier fallback');

let assertions = 7;
const observations = [];
for (const sample of fixture.samples) {
  const [year, month, day] = sample.date.split('-').map(Number);
  const jd = swe.utcToJd(year, month, day, 0, 0, 0);
  assert.ok(Number.isFinite(jd?.ut) && Number.isFinite(jd?.et),
    sample.date + ' UTC midnight converts to UT and TT Julian days');
  const nominalJdUtc = Date.UTC(year, month - 1, day) / 86_400_000 + 2_440_587.5;
  assert.equal(sample.julianDayUTC, nominalJdUtc,
    sample.date + ' fixture records nominal 00:00:00 UTC');
  assert.ok(Math.abs(jd.ut - sample.julianDayUTC) < 1 / 86_400,
    sample.date + ' UTC midnight maps to UT1 within one second (DUT1 allowance)');
  assert.ok(jd.et > jd.ut, sample.date + ' TT/ET is later than UT1');
  assert.equal(Object.keys(sample.nirayanaDms).length, 5,
    sample.date + ' five PAC graha values');
  assertions += 2;

  for (const [planet, source] of Object.entries(sample.nirayanaDms)) {
    assert.ok(Object.hasOwn(bodyIds, planet), planet + ' is one of the five tested grahas');
    assert.ok(Number.isInteger(source.degree) && source.degree >= 0 && source.degree < 360,
      sample.date + ' ' + planet + ' valid degree');
    assert.ok(Number.isInteger(source.minute) && source.minute >= 0 && source.minute < 60,
      sample.date + ' ' + planet + ' valid minute');
    assert.ok(Number.isFinite(source.second) && source.second >= 0 && source.second < 60,
      sample.date + ' ' + planet + ' valid second');
    const reconstructed = source.degree + source.minute / 60 + source.second / 3600;
    assert.ok(Math.abs(reconstructed - source.decimalDegrees) < 1e-9,
      sample.date + ' ' + planet + ' DMS exactly reconstructs fixture decimal degrees');

    const actual = swe.calc(jd.et, bodyIds[planet], flags);
    assert.ok(Number.isFinite(actual.longitude),
      sample.date + ' ' + planet + ' Swiss sidereal longitude is finite');
    assert.equal(actual.retFlag & 2, 2,
      sample.date + ' ' + planet + ' returned Swiss ephemeris data flag');
    const delta = signedDifference(wrap(actual.longitude), source.decimalDegrees);
    // Preserve every UTC comparison result even when it misses the strict numerical gate.
    assertions += 7;
    observations.push({
      date: sample.date,
      planet,
      pacNirayanaDegrees: source.decimalDegrees,
      swissLahiriSiderealDegrees: Number(wrap(actual.longitude).toFixed(10)),
      signedDifferenceDegrees: Number(delta.toFixed(10)),
      absoluteDifferenceArcseconds: Number((Math.abs(delta) * 3600).toFixed(6)),
      swissReturnFlags: actual.retFlag
    });
  }
}

assert.equal(observations.length, 15, 'three 2026 anchor dates x five grahas');
assertions++;
const differences = observations.map(row => row.signedDifferenceDegrees);
const maxAbsResidualDegrees = Math.max(...differences.map(Math.abs));
const rmsResidualDegrees = Math.sqrt(
  differences.reduce((sum, value) => sum + value * value, 0) / differences.length
);
const comparisonGatePass = maxAbsResidualDegrees <= fixture.comparison.maximumAllowedDifferenceDegrees;

const perPlanet = Object.keys(bodyIds).map(planet => {
  const rows = observations.filter(row => row.planet === planet);
  return {
    planet,
    samples: rows.length,
    maxAbsResidualArcseconds: Number(Math.max(...rows.map(row => row.absoluteDifferenceArcseconds)).toFixed(6)),
    rmsResidualArcseconds: Number(Math.sqrt(
      rows.reduce((sum, row) => sum + row.signedDifferenceDegrees ** 2, 0) / rows.length
    ).toFixed(10) * 3600)
  };
});

console.log(JSON.stringify({
  test: 'PAC 2026 five-graha Nirayana longitude cross-check',
  assertions,
  dates: fixture.source.sampleDates,
  samples: observations.length,
  candidate: 'SMV bundled Swiss Ephemeris WASM 2.10.03, Lahiri sidereal, SWIEPH|SPEED|SIDEREAL',
  reference: 'Official PAC 2026 daily Nirayana longitude PDFs',
  comparisonConvention: '00:00:00 UTC is the fixed project convention (PAC has not confirmed it in the PDF headers); UTC is converted to TT by utcToJd() for swe.calc(); Lahiri remains inferred',
  maximumAllowedDifferenceArcseconds: fixture.comparison.maximumAllowedDifferenceArcseconds,
  maximumAbsoluteResidualDegrees: Number(maxAbsResidualDegrees.toFixed(10)),
  maximumAbsoluteResidualArcseconds: Number((maxAbsResidualDegrees * 3600).toFixed(6)),
  comparisonGatePass,
  comparisonGateStatus: comparisonGatePass ? 'WITHIN_0_36_ARCSECOND_GATE' : 'EXCEEDS_0_36_ARCSECOND_GATE — diagnostic only; no numerical certificate',
  rmsResidualDegrees: Number(rmsResidualDegrees.toFixed(10)),
  rmsResidualArcseconds: Number((rmsResidualDegrees * 3600).toFixed(6)),
  perPlanet,
  observations,
  officialPacTableComparisonCompleted: true,
  sourceTimeAndAyanamsaMetadataExplicit: false,
  independentUnderlyingEphemerisProvenanceEstablished: false,
  classicalFiveGrahaCheshtaCertified: false,
  productionIntegrationAllowed: false
}, null, 2));
console.log(comparisonGatePass
  ? 'UTC diagnostic: all 15 PAC anchor values are within the 0.36 arc-second gate.'
  : 'UTC diagnostic completed, but the 15 PAC anchor values exceed the 0.36 arc-second numerical gate; no accuracy certificate is issued.');
