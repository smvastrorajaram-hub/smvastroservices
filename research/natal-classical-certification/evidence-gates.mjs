/**
 * Research-only three-phase classical natal certification gate.
 *
 * This module does not alter production horoscope calculations. It defines
 * auditable evidence requirements and fails closed whenever any proof row,
 * provenance field, independent oracle, or final Yuddha check is missing.
 */

export const CLASSICAL_NATAL_SCOPE = Object.freeze({
  startYear: 1800,
  endYear: 2399,
  annualSamplesPerPlanet: 600,
  visiblePlanets: Object.freeze(['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']),
  grahas: Object.freeze([
    'Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'
  ]),
  balaComponents: Object.freeze([
    'sthana', 'dig', 'kala', 'cheshta', 'naisargika', 'drik'
  ]),
  expectedBalaEvidenceRows: 42,
  expectedYuddhaEligiblePairs: 10
});

export const BALA_EVIDENCE_REQUIREMENTS = Object.freeze({
  sthana: Object.freeze([
    'uchcha', 'saptavargaja', 'ojhayugma', 'kendradi', 'drekkana'
  ]),
  dig: Object.freeze([
    'directional_arc', 'ascendant_reference', 'midheaven_reference'
  ]),
  kala: Object.freeze([
    'natonnata', 'paksha', 'tribhaga', 'abda', 'masa',
    'dina', 'hora', 'ayana', 'yuddha_pre_adjustment'
  ]),
  cheshta: Object.freeze([
    'mean_longitude', 'true_longitude', 'sheeghroccheya',
    'same_frame_provenance', 'planet_specific_rule'
  ]),
  naisargika: Object.freeze([
    'printed_constant', 'graha_order', 'unit_and_rounding_rule'
  ]),
  drik: Object.freeze([
    'aspect_matrix', 'angular_strength', 'drishti_pinda',
    'signed_total_recomposition'
  ])
});

const REQUIRED_FIVE = new Set(CLASSICAL_NATAL_SCOPE.visiblePlanets);
const REQUIRED_GRAHAS = new Set(CLASSICAL_NATAL_SCOPE.grahas);
const REQUIRED_COMPONENTS = new Set(CLASSICAL_NATAL_SCOPE.balaComponents);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const nonEmpty = value => typeof value === 'string' && value.trim().length > 0;

function addBlocker(blockers, message) {
  if (!blockers.includes(message)) blockers.push(message);
}

/**
 * Verify the shape and completeness of the 7-graha x 6-component evidence
 * matrix. One row is required for every graha/component pair.
 */
export function evaluateBalaEvidenceMatrix(rows) {
  const blockers = [];
  const indexed = new Map();

  if (!Array.isArray(rows)) {
    return Object.freeze({
      status: 'BLOCKED',
      certified: false,
      expectedRows: CLASSICAL_NATAL_SCOPE.expectedBalaEvidenceRows,
      acceptedRows: 0,
      blockers: Object.freeze(['Bala evidence matrix is not an array'])
    });
  }

  for (const row of rows) {
    if (!row || typeof row !== 'object') {
      addBlocker(blockers, 'Bala evidence row is not an object');
      continue;
    }
    const { graha, component } = row;
    if (!REQUIRED_GRAHAS.has(graha)) {
      addBlocker(blockers, 'Unknown or unsupported graha in Bala evidence row');
      continue;
    }
    if (!REQUIRED_COMPONENTS.has(component)) {
      addBlocker(blockers, graha + ': unknown Bala component');
      continue;
    }

    const key = graha + ':' + component;
    if (indexed.has(key)) {
      addBlocker(blockers, key + ': duplicate evidence row');
      continue;
    }
    indexed.set(key, row);

    const requiredItems = BALA_EVIDENCE_REQUIREMENTS[component];
    const providedItems = new Set(Array.isArray(row.evidenceItems) ? row.evidenceItems : []);
    for (const item of requiredItems) {
      if (!providedItems.has(item)) addBlocker(blockers, key + ': missing ' + item);
    }

    if (row.status !== 'PASS') addBlocker(blockers, key + ': evidence status is not PASS');
    for (const field of ['sourceId', 'sourceLocator', 'algorithmId', 'independentReferenceId']) {
      if (!nonEmpty(row[field])) addBlocker(blockers, key + ': missing ' + field);
    }
    if (!finite(row.sampleCount) || row.sampleCount < 1) {
      addBlocker(blockers, key + ': sampleCount must be a positive integer');
    } else if (!Number.isInteger(row.sampleCount)) {
      addBlocker(blockers, key + ': sampleCount must be an integer');
    }
    if (!finite(row.maxAbsResidual) || row.maxAbsResidual < 0) {
      addBlocker(blockers, key + ': invalid maxAbsResidual');
    }
    if (!finite(row.tolerance) || row.tolerance < 0) {
      addBlocker(blockers, key + ': invalid tolerance');
    }
    if (finite(row.maxAbsResidual) && finite(row.tolerance) &&
        row.maxAbsResidual > row.tolerance) {
      addBlocker(blockers, key + ': residual exceeds tolerance');
    }
    if (row.formulaChecksPassed !== true) {
      addBlocker(blockers, key + ': formula checks not explicitly PASS');
    }
    if (row.frameVerified !== true) {
      addBlocker(blockers, key + ': reference frame not verified');
    }
  }

  for (const graha of CLASSICAL_NATAL_SCOPE.grahas) {
    for (const component of CLASSICAL_NATAL_SCOPE.balaComponents) {
      if (!indexed.has(graha + ':' + component)) {
        addBlocker(blockers, graha + ':' + component + ': evidence row missing');
      }
    }
  }

  const acceptedRows = [...indexed.values()].filter(row => row.status === 'PASS').length;
  const certified = blockers.length === 0 &&
    indexed.size === CLASSICAL_NATAL_SCOPE.expectedBalaEvidenceRows;

  return Object.freeze({
    status: certified ? 'PASS' : 'BLOCKED',
    certified,
    expectedRows: CLASSICAL_NATAL_SCOPE.expectedBalaEvidenceRows,
    acceptedRows,
    blockers: Object.freeze(blockers)
  });
}

/**
 * Final chart-level certification policy. Inputs must be backed by actual
 * source records and test artifacts; a computed numeric subtotal alone is
 * never treated as certification evidence.
 */
export function evaluateNatalClassicalCertification({
  birthYear,
  longitudeEvidence,
  natalEpochEvidence,
  balaEvidenceRows,
  yuddhaEvidence,
  nodeBrowserParity,
  fallbackUsed = true
} = {}) {
  const blockers = [];

  if (!Number.isInteger(birthYear) ||
      birthYear < CLASSICAL_NATAL_SCOPE.startYear ||
      birthYear > CLASSICAL_NATAL_SCOPE.endYear) {
    addBlocker(blockers, 'Birth year is outside the certified scope 1800–2399');
  }

  if (!longitudeEvidence || typeof longitudeEvidence !== 'object') {
    addBlocker(blockers, 'Historical longitude evidence is missing');
  } else {
    if (longitudeEvidence.status !== 'PASS') {
      addBlocker(blockers, 'Historical longitude coverage is not PASS');
    }
    if (longitudeEvidence.allFivePlanets !== true) {
      addBlocker(blockers, 'All five eligible planets are not independently covered');
    }
    if (longitudeEvidence.meanTrueSheeghroccheyaSameFrame !== true) {
      addBlocker(blockers, 'Mean/True/Sheeghroccheya frame chain is not verified');
    }
    if (longitudeEvidence.independentHistoricalReferenceVerified !== true) {
      addBlocker(blockers, 'Independent historical longitude reference is not verified');
    }
    if (longitudeEvidence.annualRowsPerPlanet !==
        CLASSICAL_NATAL_SCOPE.annualSamplesPerPlanet) {
      addBlocker(blockers, 'Annual 1800–2399 coverage is incomplete');
    }
    if (longitudeEvidence.eventWindowStatus !== 'PASS') {
      addBlocker(blockers, 'Station/retrograde/sign-boundary/conjunction event windows are not PASS');
    }
    if (!nonEmpty(longitudeEvidence.certificateId)) {
      addBlocker(blockers, 'Historical longitude certificateId is missing');
    }
  }

  if (!natalEpochEvidence || typeof natalEpochEvidence !== 'object') {
    addBlocker(blockers, 'Exact natal birth-epoch evidence is missing');
  } else {
    if (natalEpochEvidence.status !== 'PASS') {
      addBlocker(blockers, 'Exact natal birth-epoch evidence is not PASS');
    }
    if (natalEpochEvidence.exactBirthInstantUsed !== true ||
        !finite(natalEpochEvidence.julianDay)) {
      addBlocker(blockers, 'Exact natal birth instant / Julian day is not verified');
    }
    if (natalEpochEvidence.allFivePlanets !== true) {
      addBlocker(blockers, 'Exact natal-epoch inputs for all five eligible planets are missing');
    }
    if (natalEpochEvidence.meanTrueSheeghroccheyaSameFrame !== true ||
        !nonEmpty(natalEpochEvidence.frame)) {
      addBlocker(blockers, 'Exact natal-epoch Mean/True/Sheeghroccheya frame is not verified');
    }
    if (natalEpochEvidence.certifiedModelApplied !== true ||
        !nonEmpty(natalEpochEvidence.modelCertificateId)) {
      addBlocker(blockers, 'A validated historical longitude model was not applied at this birth epoch');
    }
    if (natalEpochEvidence.fallbackOrUnverifiedInterpolationUsed !== false) {
      addBlocker(blockers, 'Unverified fallback/interpolation was used for the exact natal epoch');
    }
  }

  const bala = evaluateBalaEvidenceMatrix(balaEvidenceRows);
  if (!bala.certified) {
    for (const blocker of bala.blockers) addBlocker(blockers, blocker);
  }

  if (!yuddhaEvidence || typeof yuddhaEvidence !== 'object') {
    addBlocker(blockers, 'Final Yuddha evidence is missing');
  } else {
    if (yuddhaEvidence.status !== 'PASS') addBlocker(blockers, 'Final Yuddha status is not PASS');
    const eligible = new Set(Array.isArray(yuddhaEvidence.eligiblePlanets)
      ? yuddhaEvidence.eligiblePlanets : []);
    for (const planet of REQUIRED_FIVE) {
      if (!eligible.has(planet)) addBlocker(blockers, 'Yuddha eligible-planet coverage missing: ' + planet);
    }
    if (yuddhaEvidence.evaluatedEligiblePairs !==
        CLASSICAL_NATAL_SCOPE.expectedYuddhaEligiblePairs) {
      addBlocker(blockers, 'All 10 eligible Yuddha pairs were not evaluated');
    }
    if (yuddhaEvidence.unresolvedPairs !== 0) {
      addBlocker(blockers, 'One or more Yuddha pairs remain unresolved');
    }
    if (yuddhaEvidence.finalKalaRecompositionPassed !== true) {
      addBlocker(blockers, 'Final Kala / six-Bala recomposition is not PASS');
    }
    if (yuddhaEvidence.independentReferenceVerified !== true) {
      addBlocker(blockers, 'Independent Yuddha reference is not verified');
    }
    if (yuddhaEvidence.winnerLoserRuleVerified !== true) {
      addBlocker(blockers, 'Yuddha winner/loser rule is not source-verified');
    }
    if (yuddhaEvidence.discDiameterSourceVerified !== true) {
      addBlocker(blockers, 'Planetary disc-diameter source is not verified');
    }
  }

  if (!nodeBrowserParity || nodeBrowserParity.status !== 'PASS' ||
      nodeBrowserParity.allSevenGrahas !== true ||
      nodeBrowserParity.allSixComponents !== true) {
    addBlocker(blockers, 'Node/Browser parity is not PASS for all seven grahas and six components');
  }
  if (fallbackUsed !== false) {
    addBlocker(blockers, 'Fallback or unverified substitute input was used');
  }

  const classicalCertified = blockers.length === 0;
  return Object.freeze({
    classicalCertified,
    provisional: !classicalCertified,
    status: classicalCertified ? 'PASS' : 'BLOCKED',
    birthYear,
    balaEvidence: bala,
    blockers: Object.freeze(blockers)
  });
}
