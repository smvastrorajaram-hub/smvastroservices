#!/usr/bin/env node
/**
 * Monthly 1800–2399 Saura Bīja longitude coverage runner.
 *
 * This proves deterministic model coverage only. It does NOT prove that the
 * generated historical True Longitude is independently correct or suitable
 * for production certification.
 */
import assert from 'node:assert/strict';
import {
  sauraBijaCorrectedTrueLongitudeResearch
} from '../../research/saura-bija/saura-bija-mean-motion.mjs';
import { CLASSICAL_NATAL_SCOPE } from './evidence-gates.mjs';

const EPOCH_MS = Date.UTC(1970, 0, 1);
const JD_UNIX_EPOCH = 2440587.5;
const planets = CLASSICAL_NATAL_SCOPE.visiblePlanets;
const counts = Object.fromEntries(planets.map(planet => [planet, 0]));
const referenceVerifiedCounts = Object.fromEntries(planets.map(planet => [planet, 0]));
let rows = 0;
let invalidRows = 0;
let frameMismatchRows = 0;
let researchOnlyRows = 0;

function monthlyJulianDay(year, monthIndex) {
  const milliseconds = Date.UTC(year, monthIndex, 15, 12, 0, 0);
  return (milliseconds - EPOCH_MS) / 86400000 + JD_UNIX_EPOCH;
}

for (let year = CLASSICAL_NATAL_SCOPE.startYear;
     year <= CLASSICAL_NATAL_SCOPE.endYear; year++) {
  for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
    const jd = monthlyJulianDay(year, monthIndex);
    for (const planet of planets) {
      const result = sauraBijaCorrectedTrueLongitudeResearch(jd, planet);
      rows++;
      counts[planet]++;
      if (![result.meanLongitude, result.sheeghrocca, result.mandocca,
            result.trueLongitude].every(value =>
              typeof value === 'number' && Number.isFinite(value))) {
        invalidRows++;
      }
      if (result.frame !== 'traditional-Saura-nirayana') frameMismatchRows++;
      if (result.productionEligible !== false ||
          result.independentHistoricalOracleVerified !== false) {
        researchOnlyRows++;
      }
      if (result.independentHistoricalOracleVerified === true) {
        referenceVerifiedCounts[planet]++;
      }
    }
  }
}

const expectedPerPlanet = CLASSICAL_NATAL_SCOPE.monthlySamplesPerPlanet;
for (const planet of planets) {
  assert.equal(counts[planet], expectedPerPlanet, planet + ' monthly sample count');
  assert.equal(referenceVerifiedCounts[planet], 0,
    planet + ' stays uncertified without a verified independent historic oracle');
}
assert.equal(rows, expectedPerPlanet * planets.length, 'total monthly candidate rows');
assert.equal(invalidRows, 0, 'all monthly model outputs are finite');
assert.equal(frameMismatchRows, 0, 'all monthly model outputs keep one declared frame');
assert.equal(researchOnlyRows, 0, 'every result explicitly remains research-only');

const report = {
  pass: true,
  status: 'PASS_COVERAGE_ONLY_NOT_CERTIFIED',
  period: '1800-01 through 2399-12',
  sampling: '15th day at 12:00 UTC per civil month',
  planets,
  rows,
  expectedRows: 36000,
  rowsPerPlanet: counts,
  finiteOutputRows: rows - invalidRows,
  frameMismatchRows,
  independentHistoricalOracleVerifiedRows: referenceVerifiedCounts,
  eventWindowTests: 'NOT_RUN',
  sourceAnchor: {
    id: 'BURGESS_1860_JAN_01_MEAN_LONGITUDES',
    url: 'https://upload.wikimedia.org/wikipedia/commons/2/2b/Translation_of_the_S%C3%BBrya-Siddh%C3%A2nta%2C_A_Text-Book_of_Hindu_Astronomy%3B_With_Notes%2C_and_an_Appendix_%28IA_jstor-592174%29.pdf',
    location: 'Appendix table: Mean Longitudes of the Planets, 1 January 1860',
    reconciliation: 'AVAILABLE_NOT_RECONCILED'
  },
  classicalCertified: false,
  blockers: [
    'Burgess 1860 numerical anchor has not yet been reconciled to the current Saura model frame/time convention.',
    'Independent historical True Longitude references are not verified for all monthly epochs.',
    'High-resolution station, retrograde, sign-boundary and conjunction event windows remain untested.'
  ]
};
console.log(JSON.stringify(report));
