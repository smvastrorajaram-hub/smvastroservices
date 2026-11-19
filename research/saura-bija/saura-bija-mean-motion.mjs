/**
 * Historical Saura-paksha Bīja research model, 1800–2399.
 *
 * Mean motions: Burgess (1860), corrected Mahāyuga revolution counts.
 * Mandocca: Surya Siddhanta I.41–42 Kalpa revolution counts and I.57–58
 * Kali-epoch sidereal longitudes, propagated from the same Kali epoch,
 * Ujjain meridian and civil-day convention as the existing Saura engine.
 *
 * No production calculation is changed. Bīja output is a separate,
 * research-only historical series.
 */
import { SAURA_MEAN_MOTION_METADATA } from '../../public/horoscope/offline/saura-classical-mean-motion.browser.mjs';
import { sauraFourPassTrueLongitude } from '../../public/horoscope/offline/saura-classical-true-longitude.browser.mjs';

const {
  epochJdUt: KALI_EPOCH_JD_UT,
  civilDaysPerMahayuga: MAHAYUGA_CIVIL_DAYS,
  referenceMeridianDegrees: UJJAIN_MERIDIAN_DEGREES
} = SAURA_MEAN_MOTION_METADATA;

const ORIGINAL_REVOLUTIONS_PER_MAHAYUGA = Object.freeze({
  Sun: 4320000, Mercury: 17937060, Venus: 7022376,
  Mars: 2296832, Jupiter: 364220, Saturn: 146568
});
const BIJA_CORRECTED_REVOLUTIONS_PER_MAHAYUGA = Object.freeze({
  Sun: 4320000, Mercury: 17937044, Venus: 7022364,
  Mars: 2296832, Jupiter: 364212, Saturn: 146580
});
const FIVE = Object.freeze(['Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']);
const INNER = new Set(['Mercury', 'Venus']);
const TAMIL = Object.freeze({
  'செவ்வாய்': 'Mars', 'புதன்': 'Mercury', 'குரு': 'Jupiter',
  'சுக்கிரன்': 'Venus', 'சனி': 'Saturn'
});
const has = Object.prototype.hasOwnProperty;
const norm360 = value => ((value % 360) + 360) % 360;
const KALPA_CIVIL_DAYS = MAHAYUGA_CIVIL_DAYS * 1000;

/*
 * Surya Siddhanta I.41–42 apogee revolutions per Kalpa and I.57–58
 * longitude at the beginning of Kali Yuga. The source longitudes are
 * sidereal rāśi/degree/minute/second positions in the classical Saura frame.
 */
const APSIS_REVOLUTIONS_PER_KALPA = Object.freeze({
  Sun: 387, Mercury: 368, Venus: 535, Mars: 204, Jupiter: 900, Saturn: 39
});
const APSIS_KALI_EPOCH_LONGITUDE = Object.freeze({
  Sun: 2 * 30 + 17 + 7 / 60 + 48 / 3600,
  Mercury: 7 * 30 + 10 + 19 / 60 + 12 / 3600,
  Venus: 2 * 30 + 19 + 39 / 60,
  Mars: 4 * 30 + 9 + 57 / 60 + 36 / 3600,
  Jupiter: 5 * 30 + 21,
  Saturn: 7 * 30 + 26 + 36 / 60 + 36 / 3600
});

const MIN_JD_UT = Date.UTC(1800, 0, 1) / 86400000 + 2440587.5;
const MAX_JD_UT_EXCLUSIVE = Date.UTC(2400, 0, 1) / 86400000 + 2440587.5;

function knownBody(body) {
  const key = TAMIL[body] || body;
  if (!has.call(BIJA_CORRECTED_REVOLUTIONS_PER_MAHAYUGA, key)) {
    throw new RangeError('Saura Bīja model supports Sun and the five visible planets');
  }
  return key;
}

function validHistoricalJulianDay(jdUt) {
  if (!Number.isFinite(jdUt) || jdUt < MIN_JD_UT || jdUt >= MAX_JD_UT_EXCLUSIVE) {
    throw new RangeError('UTC Julian day must fall within 1800-01-01 to 2399-12-31');
  }
}

function meanFromRevolutions(jdUt, body, revolutions) {
  const localMeanDays = jdUt - KALI_EPOCH_JD_UT + UJJAIN_MERIDIAN_DEGREES / 360;
  const turns = localMeanDays * revolutions[body] / MAHAYUGA_CIVIL_DAYS;
  return norm360((turns % 1) * 360);
}

/** Uncorrected Saura orbital mean longitude, retained for source audit only. */
export function sauraOriginalMeanOrbitalLongitude(jdUt, body) {
  validHistoricalJulianDay(jdUt);
  return meanFromRevolutions(jdUt, knownBody(body), ORIGINAL_REVOLUTIONS_PER_MAHAYUGA);
}

/** Bīja-corrected mean daily angular velocity in degrees per civil day. */
export function sauraBijaCorrectedMeanDailyMotion(body) {
  return BIJA_CORRECTED_REVOLUTIONS_PER_MAHAYUGA[knownBody(body)] *
    360 / MAHAYUGA_CIVIL_DAYS;
}

/** Bīja-corrected orbital mean longitude in traditional Saura nirayana frame. */
export function sauraBijaCorrectedMeanOrbitalLongitude(jdUt, body) {
  validHistoricalJulianDay(jdUt);
  return meanFromRevolutions(
    jdUt, knownBody(body), BIJA_CORRECTED_REVOLUTIONS_PER_MAHAYUGA
  );
}

/** Return the BPHS/Uttara Kalamrita mean and śīghrocca input pair. */
export function sauraBijaCorrectedFivePlanetInputs(jdUt, planet) {
  validHistoricalJulianDay(jdUt);
  const key = knownBody(planet);
  if (!FIVE.includes(key)) throw new RangeError('Only the five visible planets are supported');

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
    productionEligible: false
  });
}

/**
 * Historical Mandocca in the same Saura nirayana frame as the mean place.
 * For each body:
 *   Kali-epoch longitude + (Kalpa apsis revolutions × elapsed civil days
 *   ÷ civil days per Kalpa) × 360 degrees.
 * This uses no 2024 anchor extrapolation and no planet-specific fitted rate.
 */
export function sauraBijaCorrectedMandoccaLongitude(jdUt, planet) {
  validHistoricalJulianDay(jdUt);
  const key = knownBody(planet);
  const elapsedLocalMeanDays =
    jdUt - KALI_EPOCH_JD_UT + UJJAIN_MERIDIAN_DEGREES / 360;
  const revolutions = APSIS_REVOLUTIONS_PER_KALPA[key];
  const mandocca = norm360(
    APSIS_KALI_EPOCH_LONGITUDE[key] +
    revolutions * 360 * elapsedLocalMeanDays / KALPA_CIVIL_DAYS
  );
  return Object.freeze({
    planet: key,
    jdUt,
    mandocca,
    frame: 'traditional-Saura-nirayana',
    source: 'Surya Siddhanta I.41–42 and I.57–58; Burgess 1860',
    revolutionCountPerKalpa: revolutions,
    kaliEpochLongitude: APSIS_KALI_EPOCH_LONGITUDE[key],
    productionEligible: false
  });
}

/** Four-pass Manda/Śīghra true longitude, still a separate research output. */
export function sauraBijaCorrectedTrueLongitudeResearch(jdUt, planet) {
  const input = sauraBijaCorrectedFivePlanetInputs(jdUt, planet);
  const apsis = sauraBijaCorrectedMandoccaLongitude(jdUt, input.planet);
  const trueModel = sauraFourPassTrueLongitude({
    planet: input.planet,
    meanLongitude: input.meanLongitude,
    mandocca: apsis.mandocca,
    sheeghrocha: input.sheeghrocca,
    mandaKarṇaConvention: 'verse39-direct-jya'
  });

  return Object.freeze({
    ...input,
    mandocca: apsis.mandocca,
    trueLongitude: trueModel.trueLongitude,
    trueLongitudeAvailable: true,
    trueLongitudeResearchOnly: true,
    trueLongitudeStages: trueModel.stages,
    trueLongitudeMethod: 'Sūrya Siddhānta II.39 direct-Jya Manda + II.40–45 Śīghra four-pass',
    mandoccaSource: apsis.source,
    bījaTrueLongitudeResearchOnly: true,
    independentHistoricalOracleVerified: false,
    productionEligible: false
  });
}

export const SAURA_BIJA_CORRECTED_METADATA = Object.freeze({
  supportedCivilYears: Object.freeze([1800, 2399]),
  epochJdUt: KALI_EPOCH_JD_UT,
  civilDaysPerMahayuga: MAHAYUGA_CIVIL_DAYS,
  civilDaysPerKalpa: KALPA_CIVIL_DAYS,
  referenceMeridianDegrees: UJJAIN_MERIDIAN_DEGREES,
  revolutionsPerMahayuga: BIJA_CORRECTED_REVOLUTIONS_PER_MAHAYUGA,
  originalRevolutionsPerMahayuga: ORIGINAL_REVOLUTIONS_PER_MAHAYUGA,
  apsisRevolutionsPerKalpa: APSIS_REVOLUTIONS_PER_KALPA,
  apsisKaliEpochLongitude: APSIS_KALI_EPOCH_LONGITUDE,
  meanSource: 'E. Burgess, Translation of the Sūrya-Siddhānta (1860), pp. 164–165, corrected mean motions by Bīja',
  apsisSource: 'Surya Siddhanta I.41–42, I.57–58; Burgess 1860, pp. 171–172',
  meanSourceUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/2b/Translation_of_the_S%C3%BBrya-Siddh%C3%A2nta%2C_A_Text-Book_of_Hindu_Astronomy%3B_With_Notes%2C_and_an_Appendix_%28IA_jstor-592174%29.pdf',
  frame: 'traditional-Saura-nirayana',
  productionEligible: false
});
