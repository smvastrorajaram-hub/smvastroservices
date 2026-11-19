/**
 * Research-only Modern Dṛk-Bīja calibration prototype.
 *
 * It starts from a separately identified modern apparent-geocentric
 * ephemeris and applies a first-order, per-planet secular residual correction.
 * Coefficients are fit only on 1900..2299; 1800..1899 and 2300..2399 are
 * withheld time blocks. This is not the historical Sūrya-Siddhānta Bīja model.
 */
export const MODERN_DRIK_BIJA_MODEL_ID = 'MODERN_DRIK_BIJA_TRUE';
export const MODERN_DRIK_BIJA_MODEL_VERSION = '0.1.0-research';
export const MODERN_DRIK_BIJA_LIMIT_DEGREES = 0.05;
export const MODERN_DRIK_BIJA_TRAINING = Object.freeze({
  referenceEphemeris: 'DE441',
  firstYear: 1900,
  lastYear: 2299,
  epochYear: 2100,
  holdoutWindows: Object.freeze([
    Object.freeze({ firstYear: 1800, lastYear: 1899 }),
    Object.freeze({ firstYear: 2300, lastYear: 2399 })
  ])
});
const PLANETS = new Set(['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']);

export function normalizeDegrees(value) {
  if (!Number.isFinite(value)) throw new TypeError('A finite longitude is required');
  return ((value % 360) + 360) % 360;
}

export function signedResidualDegrees(candidate, reference) {
  if (![candidate, reference].every(Number.isFinite)) {
    throw new TypeError('Finite candidate and reference longitudes are required');
  }
  return ((candidate - reference + 540) % 360) - 180;
}

function validateObservation(row, label) {
  if (!row || !Number.isInteger(row.year) ||
      !Number.isFinite(row.candidateLongitude) ||
      !Number.isFinite(row.referenceLongitude)) {
    throw new TypeError(label + ' requires integer year and finite longitude values');
  }
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Fit a linear secular correction to angular residuals:
 *   residual(year) = c0 + c1 * ((year - 2100) / 100)
 *   corrected longitude = normalize(Moshier longitude - residual(year))
 *
 * Only the predeclared central training interval is eligible for fitting.
 * Rows outside that interval are deliberately ignored by this function.
 */
export function fitModernDrikBijaCoefficients({ planet, observations }) {
  if (!PLANETS.has(planet)) throw new RangeError('Unsupported planet: ' + planet);
  if (!Array.isArray(observations)) throw new TypeError('observations must be an array');

  const seen = new Set();
  for (const row of observations) {
    validateObservation(row, planet);
    if (seen.has(row.year)) throw new Error(planet + ' contains duplicate year ' + row.year);
    seen.add(row.year);
  }

  const training = observations
    .filter(row => row.year >= MODERN_DRIK_BIJA_TRAINING.firstYear &&
                   row.year <= MODERN_DRIK_BIJA_TRAINING.lastYear)
    .sort((a, b) => a.year - b.year);

  const expectedCount = MODERN_DRIK_BIJA_TRAINING.lastYear -
                        MODERN_DRIK_BIJA_TRAINING.firstYear + 1;
  if (training.length !== expectedCount) {
    throw new Error(planet + ' needs exactly ' + expectedCount +
      ' unique training years from 1900 through 2299; received ' + training.length);
  }
  for (let index = 0; index < training.length; index++) {
    const expectedYear = MODERN_DRIK_BIJA_TRAINING.firstYear + index;
    if (training[index].year !== expectedYear) {
      throw new Error(planet + ' training interval is not contiguous at ' + expectedYear);
    }
  }

  const x = training.map(row => (row.year - MODERN_DRIK_BIJA_TRAINING.epochYear) / 100);
  const y = training.map(row =>
    signedResidualDegrees(row.candidateLongitude, row.referenceLongitude)
  );
  const xMean = mean(x);
  const yMean = mean(y);
  let numerator = 0;
  let denominator = 0;
  for (let index = 0; index < x.length; index++) {
    numerator += (x[index] - xMean) * (y[index] - yMean);
    denominator += (x[index] - xMean) ** 2;
  }
  if (!(denominator > 0)) throw new Error('Training epochs do not span a usable time interval');

  const slopeDegreesPerCentury = numerator / denominator;
  const interceptDegreesAt2100 = yMean - slopeDegreesPerCentury * xMean;
  const residuals = y.map((value, index) =>
    value - (interceptDegreesAt2100 + slopeDegreesPerCentury * x[index])
  );
  const rmsTrainingResidualDegrees = Math.sqrt(mean(residuals.map(value => value * value)));
  const maxTrainingResidualDegrees = Math.max(...residuals.map(Math.abs));

  return Object.freeze({
    modelId: MODERN_DRIK_BIJA_MODEL_ID,
    modelVersion: MODERN_DRIK_BIJA_MODEL_VERSION,
    planet,
    correctionModel: 'first-order-secular-apparent-longitude-residual',
    formula: 'c0 + c1 * ((year - 2100) / 100)',
    interceptDegreesAt2100,
    slopeDegreesPerCentury,
    epochYear: MODERN_DRIK_BIJA_TRAINING.epochYear,
    training: Object.freeze({
      referenceEphemeris: MODERN_DRIK_BIJA_TRAINING.referenceEphemeris,
      firstYear: MODERN_DRIK_BIJA_TRAINING.firstYear,
      lastYear: MODERN_DRIK_BIJA_TRAINING.lastYear,
      sampleCount: training.length,
      rmsFitResidualDegrees: rmsTrainingResidualDegrees,
      maxFitResidualDegrees: maxTrainingResidualDegrees
    }),
    holdoutWindows: MODERN_DRIK_BIJA_TRAINING.holdoutWindows
  });
}

/** Apply a previously fitted correction without refitting on the current epoch. */
export function applyModernDrikBijaCorrection({ year, apparentLongitude, coefficients }) {
  if (!Number.isInteger(year)) throw new TypeError('year must be an integer');
  if (!Number.isFinite(apparentLongitude)) throw new TypeError('apparentLongitude must be finite');
  if (!coefficients || coefficients.modelId !== MODERN_DRIK_BIJA_MODEL_ID ||
      !Number.isFinite(coefficients.interceptDegreesAt2100) ||
      !Number.isFinite(coefficients.slopeDegreesPerCentury) ||
      !Number.isInteger(coefficients.epochYear)) {
    throw new TypeError('A valid Modern Dṛk-Bīja coefficient set is required');
  }
  const centuries = (year - coefficients.epochYear) / 100;
  const correctionDegrees = coefficients.interceptDegreesAt2100 +
    coefficients.slopeDegreesPerCentury * centuries;
  const correctedLongitude = normalizeDegrees(apparentLongitude - correctionDegrees);
  return Object.freeze({
    kind: MODERN_DRIK_BIJA_MODEL_ID,
    modelVersion: MODERN_DRIK_BIJA_MODEL_VERSION,
    planet: coefficients.planet,
    year,
    rawApparentLongitude: normalizeDegrees(apparentLongitude),
    bijaCorrectionDegrees: correctionDegrees,
    trueLongitude: correctedLongitude,
    source: 'Swiss Ephemeris Moshier apparent geocentric longitude + DE441-trained secular Dṛk correction',
    frame: 'geocentric apparent tropical ecliptic-of-date',
    referenceEphemeris: 'DE441',
    trainingInterval: '1900-01-01..2299-01-01',
    productionEligible: false,
    classicalBijaEquivalent: false
  });
}
