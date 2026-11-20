import assert from 'node:assert/strict';
import {
  CLASSICAL_NATAL_SCOPE,
  BALA_EVIDENCE_REQUIREMENTS,
  evaluateBalaEvidenceMatrix,
  evaluateNatalClassicalCertification
} from '../research/natal-classical-certification/evidence-gates.mjs';

let checks = 0;
const eq = (actual, expected, message) => {
  assert.equal(actual, expected, message);
  checks++;
};
const ok = (condition, message) => {
  assert.ok(condition, message);
  checks++;
};

eq(CLASSICAL_NATAL_SCOPE.annualSamplesPerPlanet, 600,
  'annual coverage uses exactly one sample for each of 600 years');
eq(CLASSICAL_NATAL_SCOPE.expectedBalaEvidenceRows, 42,
  'all seven grahas × six Bala components are required');
eq(CLASSICAL_NATAL_SCOPE.expectedYuddhaEligiblePairs, 10,
  'five eligible planets require all ten possible pairs to be considered');

const completeRows = [];
for (const graha of CLASSICAL_NATAL_SCOPE.grahas) {
  for (const component of CLASSICAL_NATAL_SCOPE.balaComponents) {
    completeRows.push({
      graha,
      component,
      status: 'PASS',
      sourceId: 'TEST_FIXTURE_ONLY_' + component.toUpperCase(),
      sourceLocator: 'TEST_FIXTURE_ONLY',
      algorithmId: 'TEST_FIXTURE_ONLY_' + component,
      independentReferenceId: 'TEST_FIXTURE_ONLY_REFERENCE',
      sampleCount: 1,
      maxAbsResidual: 0,
      tolerance: 0,
      evidenceItems: [...BALA_EVIDENCE_REQUIREMENTS[component]],
      formulaChecksPassed: true,
      frameVerified: true
    });
  }
}
const matrixPass = evaluateBalaEvidenceMatrix(completeRows);
eq(matrixPass.certified, true,
  'synthetic policy fixture proves that a fully populated 42-row matrix can pass');
eq(matrixPass.acceptedRows, 42, 'all 42 synthetic fixture rows are accounted for');

// Missing one item must block the whole matrix.
const missingOne = completeRows.map(row => ({...row}));
missingOne[0].evidenceItems = missingOne[0].evidenceItems.slice(1);
const missingResult = evaluateBalaEvidenceMatrix(missingOne);
eq(missingResult.certified, false, 'one missing sub-rule blocks the 42-row matrix');
ok(missingResult.blockers.some(x => x.includes('missing ')),
  'missing sub-rule is reported');

// Residuals beyond source tolerance must fail closed.
const residualRows = completeRows.map(row => ({...row}));
residualRows[10].maxAbsResidual = 0.02;
residualRows[10].tolerance = 0.01;
const residualResult = evaluateBalaEvidenceMatrix(residualRows);
eq(residualResult.certified, false, 'residual outside tolerance blocks certification');

// Duplicate evidence cannot replace the unique 42 component rows.
const duplicateResult = evaluateBalaEvidenceMatrix([...completeRows, completeRows[0]]);
eq(duplicateResult.certified, false, 'duplicate component evidence blocks certification');

// The production gate is only policy-tested with synthetic inputs. These are
// explicitly test-fixture IDs, not genuine source records or a real certificate.
const syntheticLongitude = {
  status: 'PASS',
  allFivePlanets: true,
  meanTrueSheeghroccheyaSameFrame: true,
  independentHistoricalReferenceVerified: true,
  annualRowsPerPlanet: 600,
  eventWindowStatus: 'PASS',
  certificateId: 'TEST_FIXTURE_ONLY_LONGITUDE_CERTIFICATE'
};
const syntheticNatalEpoch = {
  status: 'PASS',
  birthYear: 1994,
  exactBirthInstantUsed: true,
  birthInstant: '1994-06-15T13:03:00+05:30',
  julianDay: 2449520.5,
  epochId: 'TEST_FIXTURE_ONLY_BIRTH_EPOCH',
  meanTrueSheeghroccheyaSameFrame: true,
  frame: 'traditional-Saura-nirayana',
  certifiedModelApplied: true,
  modelCertificateId: 'TEST_FIXTURE_ONLY_VALIDATED_MODEL',
  fallbackOrUnverifiedInterpolationUsed: false,
  planetInputs: CLASSICAL_NATAL_SCOPE.visiblePlanets.map((planet, index) => ({
    planet,
    status: 'PASS',
    meanLongitude: 10 + index,
    trueLongitude: 11 + index,
    sheeghroccheya: 12 + index,
    mandocca: 13 + index,
    frame: 'traditional-Saura-nirayana',
    sourceId: 'TEST_FIXTURE_ONLY_' + planet,
    sourceLocator: 'TEST_FIXTURE_ONLY',
    algorithmId: 'TEST_FIXTURE_ONLY',
    independentReferenceId: 'TEST_FIXTURE_ONLY',
    fallbackUsed: false
  }))
};
const syntheticYuddhaPairs = [];
for (let i = 0; i < CLASSICAL_NATAL_SCOPE.visiblePlanets.length; i++) {
  for (let j = i + 1; j < CLASSICAL_NATAL_SCOPE.visiblePlanets.length; j++) {
    syntheticYuddhaPairs.push({
      planetA: CLASSICAL_NATAL_SCOPE.visiblePlanets[i],
      planetB: CLASSICAL_NATAL_SCOPE.visiblePlanets[j],
      status: 'PASS',
      sourceEvidenceId: 'TEST_FIXTURE_ONLY_YUDDHA_PAIR_' + i + '_' + j,
      war: false,
      outcome: 'NO_WAR',
      winner: null,
      loser: null,
      finalKalaAdjustmentApplied: false
    });
  }
}
const syntheticYuddha = {
  status: 'PASS',
  eligiblePlanets: [...CLASSICAL_NATAL_SCOPE.visiblePlanets],
  evaluatedEligiblePairs: 10,
  pairs: syntheticYuddhaPairs,
  unresolvedPairs: 0,
  finalKalaRecompositionPassed: true,
  independentReferenceVerified: true,
  winnerLoserRuleVerified: true,
  discDiameterSourceVerified: true
};
const syntheticParity = {
  status: 'PASS',
  allSevenGrahas: true,
  allSixComponents: true
};
const syntheticPass = evaluateNatalClassicalCertification({
  birthYear: 1994,
  longitudeEvidence: syntheticLongitude,
  natalEpochEvidence: syntheticNatalEpoch,
  balaEvidenceRows: completeRows,
  yuddhaEvidence: syntheticYuddha,
  nodeBrowserParity: syntheticParity,
  fallbackUsed: false
});
eq(syntheticPass.classicalCertified, true,
  'synthetic fixture proves final gate requires and accepts every completed proof');
eq(syntheticPass.provisional, false, 'synthetic complete fixture is not provisional');

const annualOnlyResult = evaluateNatalClassicalCertification({
  birthYear: 1994,
  longitudeEvidence: syntheticLongitude,
  natalEpochEvidence: null,
  balaEvidenceRows: completeRows,
  yuddhaEvidence: syntheticYuddha,
  nodeBrowserParity: syntheticParity,
  fallbackUsed: false
});
eq(annualOnlyResult.classicalCertified, false,
  'annual sample coverage alone cannot certify a specific natal birth instant');
ok(annualOnlyResult.blockers.includes('Exact natal birth-epoch evidence is missing'),
  'missing exact natal-epoch evidence is reported explicitly');

// Real current Saura research coverage must not pass the final historic gate.
const currentCoverage = {
  status: 'PASS',
  allFivePlanets: true,
  meanTrueSheeghroccheyaSameFrame: true,
  independentHistoricalReferenceVerified: false,
  annualRowsPerPlanet: 600,
  eventWindowStatus: 'NOT_RUN',
  certificateId: ''
};
const actualCurrentResult = evaluateNatalClassicalCertification({
  birthYear: 1994,
  longitudeEvidence: currentCoverage,
  natalEpochEvidence: null,
  balaEvidenceRows: [],
  yuddhaEvidence: {...syntheticYuddha, independentReferenceVerified: false},
  nodeBrowserParity: syntheticParity,
  fallbackUsed: true
});
eq(actualCurrentResult.classicalCertified, false,
  'real current evidence state remains uncertified');
eq(actualCurrentResult.provisional, true,
  'real current evidence state remains provisional');
ok(actualCurrentResult.blockers.length >= 8,
  'all missing historical, Bala, Yuddha and fallback proofs are surfaced');

const outOfRange = evaluateNatalClassicalCertification({
  birthYear: 2400,
  longitudeEvidence: syntheticLongitude,
  natalEpochEvidence: syntheticNatalEpoch,
  balaEvidenceRows: completeRows,
  yuddhaEvidence: syntheticYuddha,
  nodeBrowserParity: syntheticParity,
  fallbackUsed: false
});
eq(outOfRange.classicalCertified, false, 'year 2400 is outside the fixed 1800–2399 scope');

console.log(JSON.stringify({
  pass: true,
  checks,
  phases: {
    historicalLongitudeAnnualCoverage: '600 yearly epochs only; independent oracle pending',
    sixBalaMatrix: '42 independent evidence rows required',
    finalNatalGate: 'exact five-planet natal epoch + ten Yuddha pair records + all six Bala + parity + no fallback'
  },
  classicalCertifiedForRealCharts: false,
  syntheticFixturesAreNotCertificates: true
}));
