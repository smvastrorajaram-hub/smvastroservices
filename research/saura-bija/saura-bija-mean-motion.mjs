/**
 * Historical Saura-paksha Bīja mean-motion research model, 1800–2399.
 *
 * Bīja source profile: the corrected revolution counts printed in
 * E. Burgess, Translation of the Sūrya-Siddhānta (1860), "Mean Motions
 * of the Planets as corrected by the bīja" (pp. 22–23).
 *
 * This module does not alter the existing offline/production ephemeris.
 * It reuses only the existing Saura epoch, civil Mahāyuga length and
 * Ujjain mean-meridian convention. Corrected revolution counts are kept
 * separate from the IMD's single-epoch 2026 degree-correction table.
 *
 * Five-planet selectors follow the repository's existing BPHS/UK rule:
 *   Mars/Jupiter/Saturn: own corrected mean; mean Sun as śīghrocca.
 *   Mercury/Venus: mean Sun; own corrected mean orbit as śīghrocca.
 */
import { SAURA_MEAN_MOTION_METADATA } from '../../public/horoscope/offline/saura-classical-mean-motion.browser.mjs';
import {
  sauraFourPassTrueLongitude,
  sauraMandoccaResearch
} from '../../public/horoscope/offline/saura-classical-true-longitude.browser.mjs';

const {
  epochJdUt: KALI_EPOCH_JD_UT,
  civilDaysPerMahayuga: MAHAYUGA_CIVIL_DAYS,
  referenceMeridianDegrees: UJJAIN_MERIDIAN_DEGREES
} = SAURA_MEAN_MOTION_METADATA;

const REVOLUTIONS_PER_MAHAYUGA = Object.freeze({
  Sun: 4320000,
  Mercury: 17937044,
  Venus: 7022364,
  Mars: 2296832,
  Jupiter: 364212,
  Saturn: 146580
});
const FIVE = Object.freeze(['Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']);
const INNER = new Set(['Mercury', 'Venus']);
const TAMIL = Object.freeze({
  'செவ்வாய்': 'Mars',
  'புதன்': 'Mercury',
  'குரு': 'Jupiter',
  'சுக்கிரன்': 'Venus',
  'சனி': 'Saturn'
});
const has = Object.prototype.hasOwnProperty;
const norm360 = value => ((value % 360) + 360) % 360;

const MIN_JD_UT = Date.UTC(1800, 0, 1) / 86400000 + 2440587.5;
const MAX_JD_UT_EXCLUSIVE = Date.UTC(2400, 0, 1) / 86400000 + 2440587.5;

function knownBody(body) {
  const key = TAMIL[body] || body;
  if (!has.call(REVOLUTIONS_PER_MAHAYUGA, key)) {
    throw new RangeError('Bīja mean motion supports Sun and the five visible planets');
  }
  return key;
}

function validHistoricalJulianDay(jdUt) {
  if (!Number.isFinite(jdUt) || jdUt < MIN_JD_UT || jdUt >= MAX_JD_UT_EXCLUSIVE) {
    throw new RangeError('UTC Julian day must fall within 1800-01-01 to 2399-12-31');
  }
}

/** Traditional Bīja-corrected angular mean velocity, degrees per civil day. */
export function sauraBijaCorrectedMeanDailyMotion(body) {
  const key = knownBody(body);
  return REVOLUTIONS_PER_MAHAYUGA[key] * 360 / MAHAYUGA_CIVIL_DAYS;
}

/**
 * Bīja-corrected orbital mean longitude in the same traditional Saura frame
 * as the unmodified engine. Epoch and Ujjain meridian are not re-invented.
 */
export function sauraBijaCorrectedMeanOrbitalLongitude(jdUt, body) {
  validHistoricalJulianDay(jdUt);
  const key = knownBody(body);
  const localMeanDays = jdUt - KALI_EPOCH_JD_UT + UJJAIN_MERIDIAN_DEGREES / 360;
  const turns = localMeanDays * REVOLUTIONS_PER_MAHAYUGA[key] / MAHAYUGA_CIVIL_DAYS;
  return norm360((turns % 1) * 360);
}

/** Return the correct mean/śīghrocca pair for one of the five planets. */
export function sauraBijaCorrectedFivePlanetInputs(jdUt, planet) {
  validHistoricalJulianDay(jdUt);
  const key = knownBody(planet);
  if (!FIVE.includes(key)) throw new RangeError('Only Mars, Mercury, Jupiter, Venus and Saturn are supported');

  const meanSunLongitude = sauraBijaCorrectedMeanOrbitalLongitude(jdUt, 'Sun');
  const ownMeanOrbitLongitude = sauraBijaCorrectedMeanOrbitalLongitude(jdUt, key);
  const isInnerPlanet = INNER.has(key);

  return Object.freeze({
    planet: key,
    jdUt,
    meanSunLongitude,
    ownMeanOrbitLongitude,
    meanLongitude: isInnerPlanet ? meanSunLongitude : ownMeanOrbitLongitude,
    sheeghrocca: isInnerPlanet ? ownMeanOrbitLongitude : meanSunLongitude,
    isInnerPlanet,
    model: 'Surya Siddhanta Saura-paksha with Burgess/Bentley Bīja-corrected revolutions',
    frame: 'traditional-Saura-nirayana',
    bījaProfile: 'BURGESS_BENTLEY_CORRECTED_REVOLUTIONS',
    trueLongitudeAvailable: false,
    productionEligible: false
  });
}

/**
 * End-to-end classical true-longitude candidate. It reuses the existing
 * four-pass implementation and the currently available Mandocca research
 * model; it is deliberately research-only until independent 1800–2399
 * true-longitude comparisons pass the certification suite.
 *
 * Manda uses the literal Sūrya Siddhānta II.39 direct-Jya branch; Śīghra
 * retains the II.40–45 Karṇa geometry. No fitted planet-specific constants.
 */
export function sauraBijaCorrectedTrueLongitudeResearch(jdUt, planet) {
  const input = sauraBijaCorrectedFivePlanetInputs(jdUt, planet);
  const mandocca = sauraMandoccaResearch(jdUt, input.planet);
  const trueModel = sauraFourPassTrueLongitude({
    planet: input.planet,
    meanLongitude: input.meanLongitude,
    mandocca: mandocca.mandocca,
    sheeghrocca: input.sheeghrocca,
    mandaKarṇaConvention: 'verse39-direct-jya'
  });

  return Object.freeze({
    ...input,
    mandocca: mandocca.mandocca,
    trueLongitude: trueModel.trueLongitude,
    trueLongitudeAvailable: true,
    trueLongitudeResearchOnly: true,
    trueLongitudeStages: trueModel.stages,
    trueLongitudeMethod: 'Sūrya Siddhānta II.39 direct-Jya Manda + II.40–45 Śīghra four-pass',
    mandoccaSource: mandocca.source,
    bījaTrueLongitudeResearchOnly: true,
    independentHistoricalOracleVerified: false,
    productionEligible: false
  });
}

export const SAURA_BIJA_CORRECTED_METADATA = Object.freeze({
  supportedCivilYears: Object.freeze([1800, 2399]),
  epochJdUt: KALI_EPOCH_JD_UT,
  civilDaysPerMahayuga: MAHAYUGA_CIVIL_DAYS,
  referenceMeridianDegrees: UJJAIN_MERIDIAN_DEGREES,
  revolutionsPerMahayuga: REVOLUTIONS_PER_MAHAYUGA,
  source: 'E. Burgess, Translation of the Sūrya-Siddhānta (1860), corrected mean motions table, pp. 22–23',
  sourceUrl: 'https://classicalastrologer.com/wp-content/uploads/2018/04/surya_siddhanta_english.pdf',
  frame: 'traditional-Saura-nirayana',
  note: 'The IMD 2026 degree corrections are an independent dated benchmark, not interchangeable with these corrected revolution counts.',
  productionEligible: false
});
