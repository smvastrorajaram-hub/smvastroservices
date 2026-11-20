#!/usr/bin/env node
/**
 * Annual 1800–2399 Saura Bīja longitude coverage runner.
 *
 * Exactly one deterministic sample is taken in each civil year: 1 January
 * at 12:00 UTC. This checks model coverage at 600 annual epochs only. It does
 * not prove accuracy between those epochs or for arbitrary birth instants.
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

function annualJulianDay(year) {
  const milliseconds = Date.UTC(year, 0, 1, 12, 0, 0);
  return (milliseconds - EPOCH_MS) / 86400000 + JD_UNIX_EPOCH;
}

for (let year = CLASSICAL_NATAL_SCOPE.startYear;
     year <= CLASSICAL_NATAL_SCOPE.endYear; year++) {
  const jd = annualJulianDay(year);
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

const expectedPerPlanet = CLASSICAL_NATAL_SCOPE.annualSamplesPerPlanet;
for (const planet of planets) {
  assert.equal(counts[planet], expectedPerPlanet, planet + ' annual sample count');
  assert.equal(referenceVerifiedCounts[planet], 0,
    planet + ' stays uncertified without a verified independent historic oracle');
}
assert.equal(rows, expectedPerPlanet * planets.length, 'total annual candidate rows');
assert.equal(rows, 3000, '600 annual epochs × five planets');
assert.equal(invalidRows, 0, 'all annual model outputs are finite');
assert.equal(frameMismatchRows, 0, 'all annual model outputs keep one declared frame');
assert.equal(researchOnlyRows, 0, 'every result explicitly remains research-only');

const report = {
  pass: true,
  status: 'PASS_ANNUAL_COVERAGE_ONLY_NOT_CERTIFIED',
  period: '1800 through 2399',
  sampling: 'one sample per civil year: 1 January at 12:00 UTC',
  planets,
  rows,
  expectedRows: 3000,
  rowsPerPlanet: counts,
  finiteOutputRows: rows - invalidRows,
  frameMismatchRows,
  independentHistoricalOracleVerifiedRows: referenceVerifiedCounts,
  betweenAnnualEpochs: 'NOT_TESTED',
  arbitraryBirthInstantAccuracy: 'NOT_ESTABLISHED',
  sourceAnchor: {
    id: 'BURGESS_1860_JAN_01_MEAN_LONGITUDES',
    url: 'https://upload.wikimedia.org/wikipedia/commons/2/2b/Translation_of_the_S%C3%BBrya-Siddh%C3%A2nta%2C_A_Text-Book_of_Hindu_Astronomy%3B_With_Notes%2C_and_an_Appendix_%28IA_jstor-592174%29.pdf',
    location: 'Appendix table: Mean Longitudes of the Planets, 1 January 1860',
    reconciliation: 'AVAILABLE_NOT_RECONCILED'
  },
  classicalCertified: false,
  blockers: [
    'Burgess 1860 numerical anchor has not been reconciled to the current Saura model frame/time convention.',
    'Independent historical True Longitude references are not verified at the 600 annual epochs.',
    'Annual sampling does not validate dates between the annual epochs or arbitrary natal birth instants.',
    'High-resolution station, retrograde, sign-boundary, conjunction and Yuddha-threshold event windows remain untested.'
  ]
};
console.log(JSON.stringify(report));
