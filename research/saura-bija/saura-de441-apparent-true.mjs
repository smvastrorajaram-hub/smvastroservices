/**
 * Direct, date-specific NASA/JPL Horizons DE441 observer-position adapter.
 *
 * This module deliberately does NOT interpolate the annual 1800–2399 fixture.
 * Each requested epoch is fetched from Horizons as an Earth-geocentric apparent
 * ecliptic-of-date position (quantity 31), and must identify DE441 in the
 * returned target AND Earth-centre headers.
 *
 * The caller supplies the Saura sidereal offset for the requested epoch. That
 * keeps frame conversion explicit and keeps the historical Bija model separate.
 */
import {
  sauraBijaCorrectedFivePlanetInputs,
  sauraBijaCorrectedTrueLongitudeResearch
} from './saura-bija-mean-motion.mjs';

const TARGET_IDS = Object.freeze({
  Mercury: '199',
  Venus: '299',
  Mars: '4',
  Jupiter: '5',
  // Saturn-system barycentre is required to span the complete 1800–2399 grid.
  Saturn: '6'
});
const TAMIL = Object.freeze({
  'புதன்': 'Mercury',
  'சுக்கிரன்': 'Venus',
  'செவ்வாய்': 'Mars',
  'குரு': 'Jupiter',
  'சனி': 'Saturn'
});
const norm360 = value => ((value % 360) + 360) % 360;
const signedAngle = (a, b) => ((a - b + 540) % 360) - 180;
const ARCSEC_TO_RAD = Math.PI / (180 * 3600);
const RAD_TO_DEG = 180 / Math.PI;
const BURGESS_SAURA_ZERO_POINT_1860 = 18 + 5 / 60 + 8.25 / 3600;
const BURGESS_FRAME_EPOCH_JD_UT = Date.UTC(1860, 0, 1) / 86400000 + 2440587.5;

function meanObliquityIau76(jdUt) {
  const T = (jdUt - 2451545) / 36525;
  return (84381.448 - 46.8150 * T - 0.00059 * T * T + 0.001813 * T * T * T) * ARCSEC_TO_RAD;
}

function precessEquatorialIau76(vector, fromJdUt, toJdUt) {
  if (![fromJdUt, toJdUt, ...vector].every(Number.isFinite)) {
    throw new TypeError('Finite vector and Julian-day epochs are required for IAU76 precession');
  }
  const T = (fromJdUt - 2451545) / 36525;
  const t = (toJdUt - fromJdUt) / 36525;
  const zetaArcsec =
    (2306.2181 + 1.39656 * T - 0.000139 * T * T) * t +
    (0.30188 - 0.000344 * T) * t * t +
    0.017998 * t * t * t;
  const zArcsec =
    (2306.2181 + 1.39656 * T - 0.000139 * T * T) * t +
    (1.09468 + 0.000066 * T) * t * t +
    0.018203 * t * t * t;
  const thetaArcsec =
    (2004.3109 - 0.85330 * T - 0.000217 * T * T) * t -
    (0.42665 + 0.000217 * T) * t * t -
    0.041833 * t * t * t;
  const zeta = zetaArcsec * ARCSEC_TO_RAD;
  const z = zArcsec * ARCSEC_TO_RAD;
  const theta = thetaArcsec * ARCSEC_TO_RAD;
  const [x, y, zz] = vector;
  const radius = Math.hypot(x, y, zz);
  const ra = Math.atan2(y, x);
  const dec = Math.asin(zz / radius);
  const A = Math.cos(dec) * Math.sin(ra + zeta);
  const B = Math.cos(theta) * Math.cos(dec) * Math.cos(ra + zeta) - Math.sin(theta) * Math.sin(dec);
  const C = Math.sin(theta) * Math.cos(dec) * Math.cos(ra + zeta) + Math.cos(theta) * Math.sin(dec);
  const raDate = Math.atan2(A, B) + z;
  const decDate = Math.asin(Math.max(-1, Math.min(1, C)));
  return [
    radius * Math.cos(decDate) * Math.cos(raDate),
    radius * Math.cos(decDate) * Math.sin(raDate),
    radius * Math.sin(decDate)
  ];
}

function rotateEclipticToEquatorial(vector, jdUt) {
  const epsilon = meanObliquityIau76(jdUt);
  const [x, y, z] = vector;
  return [
    x,
    y * Math.cos(epsilon) - z * Math.sin(epsilon),
    y * Math.sin(epsilon) + z * Math.cos(epsilon)
  ];
}

function rotateEquatorialToEcliptic(vector, jdUt) {
  const epsilon = meanObliquityIau76(jdUt);
  const [x, y, z] = vector;
  return [
    x,
    y * Math.cos(epsilon) + z * Math.sin(epsilon),
    -y * Math.sin(epsilon) + z * Math.cos(epsilon)
  ];
}

/**
 * Return the IAU76 precession-in-longitude of the 1860 vernal equinox
 * measured in the mean ecliptic of the requested date.
 */
export function sauraIau76PrecessionLongitudeFromBurgessEpoch(jdUt) {
  if (!Number.isFinite(jdUt)) throw new TypeError('A finite Julian day is required');
  const oldEquinoxInDateEquatorial = precessEquatorialIau76(
    [1, 0, 0], BURGESS_FRAME_EPOCH_JD_UT, jdUt
  );
  const oldEquinoxInDateEcliptic = rotateEquatorialToEcliptic(
    oldEquinoxInDateEquatorial, jdUt
  );
  return Math.atan2(
    oldEquinoxInDateEcliptic[1],
    oldEquinoxInDateEcliptic[0]
  ) * RAD_TO_DEG;
}

/** Source-anchored Saura offset propagated with the same IAU76 frame as JPL. */
export function sauraSiderealOffsetFromBurgessIau76(jdUt) {
  return norm360(
    BURGESS_SAURA_ZERO_POINT_1860 +
    sauraIau76PrecessionLongitudeFromBurgessEpoch(jdUt)
  );
}

/** Convert a geometric JPL ecliptic-J2000 vector into mean ecliptic-of-date longitude. */
export function jplEclipticJ2000VectorToMeanEclipticOfDateLongitude(vector, jdUt) {
  if (!vector || ![vector.x, vector.y, vector.z, jdUt].every(Number.isFinite)) {
    throw new TypeError('Finite JPL ecliptic-J2000 vector components and Julian day are required');
  }
  const equatorialJ2000 = rotateEclipticToEquatorial(
    [vector.x, vector.y, vector.z], 2451545
  );
  const equatorialDate = precessEquatorialIau76(
    equatorialJ2000, 2451545, jdUt
  );
  const eclipticDate = rotateEquatorialToEcliptic(equatorialDate, jdUt);
  return norm360(Math.atan2(eclipticDate[1], eclipticDate[0]) * RAD_TO_DEG);
}

/** Carry the Burgess 1860 Saura zero point by the Lahiri precession delta. */
export function sauraSiderealOffsetFromLahiri(lahiriAyanamsaAtDate, lahiriAyanamsaAt1860) {
  if (!Number.isFinite(lahiriAyanamsaAtDate) || !Number.isFinite(lahiriAyanamsaAt1860)) {
    throw new TypeError('Finite Lahiri ayanamsa values at the requested date and 1860 epoch are required');
  }
  return BURGESS_SAURA_ZERO_POINT_1860 + (lahiriAyanamsaAtDate - lahiriAyanamsaAt1860);
}

function bodyOf(value) {
  const body = TAMIL[value] || value;
  if (!Object.prototype.hasOwnProperty.call(TARGET_IDS, body)) {
    throw new RangeError('DE441 research adapter supports Mercury, Venus, Mars, Jupiter and Saturn');
  }
  return body;
}

function finiteJd(jdUt) {
  if (!Number.isFinite(jdUt) || jdUt < 2378496.5 || jdUt >= 2597641.5) {
    throw new RangeError('DE441 research adapter accepts 1800-01-01 through 2399-12-31');
  }
}

function parseObserverQuantity31(payload, body, requestedJdUt, targetId) {
  if (!payload || typeof payload.result !== 'string') {
    throw new TypeError('JPL Horizons response did not contain a result text block');
  }
  const result = payload.result;
  const targetPattern = new RegExp('Target body name:.*\\(' + targetId + '\\).*\\{source:\\s*DE441\\}', 'i');
  const earthPattern = /Center body name:\s*Earth\s*\(399\).*?\{source:\s*DE441\}/i;
  const geocentricPattern = /Center-site name:\s*GEOCENTRIC/i;
  if (!targetPattern.test(result)) {
    throw new Error('JPL Horizons target header did not confirm the requested DE441 body (' + body + ', ' + targetId + ')');
  }
  if (!earthPattern.test(result) || !geocentricPattern.test(result)) {
    throw new Error('JPL Horizons response is not confirmed as DE441 Earth-geocentric output');
  }
  if (!/Observer-centered IAU76\/80 ecliptic-of-date longitude and latitude/i.test(result) &&
      !/ObsEcLon,\s*ObsEcLat/i.test(result)) {
    throw new Error('JPL Horizons response did not identify observer-centered ecliptic-of-date quantity 31');
  }

  const lines = result.split(/\r?\n/);
  const header = lines.find(line => line.includes('Date__') && line.includes('ObsEcLon') && line.includes('ObsEcLat'));
  if (!header) throw new Error('JPL Horizons quantity 31 CSV column header was not found');
  const columns = header.split(',').map(value => value.trim());
  const longitudeIndex = columns.findIndex(value => value === 'ObsEcLon');
  const latitudeIndex = columns.findIndex(value => value === 'ObsEcLat');
  if (longitudeIndex < 0 || latitudeIndex < 0) {
    throw new Error('JPL Horizons quantity 31 longitude/latitude columns were not found');
  }

  const start = result.indexOf('$$SOE');
  const stop = result.indexOf('$$EOE');
  if (start < 0 || stop <= start) throw new Error('JPL Horizons ephemeris data block is incomplete');
  const dataRows = result.slice(start + 5, stop).split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (dataRows.length !== 1) {
    throw new Error('Expected exactly one discrete JPL Horizons row for the requested Julian day; received ' + dataRows.length);
  }
  const values = dataRows[0].split(',').map(value => value.trim());
  const longitude = Number(values[longitudeIndex]);
  const latitude = Number(values[latitudeIndex]);
  if (!Number.isFinite(longitude) || longitude < 0 || longitude >= 360 ||
      !Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new Error('JPL Horizons returned invalid ObsEcLon/ObsEcLat values');
  }

  return Object.freeze({
    planet: body,
    target: targetId,
    jdUt: requestedJdUt,
    longitude,
    latitude,
    ephemeris: 'DE441',
    source: 'NASA/JPL Horizons API',
    apiVersion: payload.signature?.version || null,
    centerBody: 'Earth (399)',
    observerCenter: '500@399',
    centerSite: 'GEOCENTRIC',
    quantity: 31,
    quantityMeaning: 'Observer-centered IAU76/80 apparent ecliptic-of-date longitude and latitude; light time, gravitational deflection and stellar aberration included',
    coordinateFrame: 'JPL-IAU76/80-apparent-ecliptic-of-date',
    timeScale: 'UT1 before 1962; UTC thereafter',
    interpolated: false,
    requestMethod: 'TLIST discrete Julian day'
  });
}

/**
 * Fetch one exact epoch. The JPL response must itself identify DE441; no
 * fallback ephemeris, cached annual point, or interpolation is accepted.
 */
export async function fetchSauraDe441Reference({
  planet,
  jdUt,
  fetchImpl = globalThis.fetch
} = {}) {
  const body = bodyOf(planet);
  finiteJd(jdUt);
  if (typeof fetchImpl !== 'function') throw new TypeError('A fetch implementation is required');

  const targetId = TARGET_IDS[body];
  const params = new URLSearchParams({
    format: 'json',
    COMMAND: "'" + targetId + "'",
    OBJ_DATA: "'NO'",
    MAKE_EPHEM: "'YES'",
    EPHEM_TYPE: "'OBSERVER'",
    CENTER: "'500@399'",
    TLIST_TYPE: "'JD'",
    TLIST: "'" + jdUt.toFixed(8) + "'",
    TIME_TYPE: "'UT'",
    TIME_DIGITS: "'FRACSEC'",
    QUANTITIES: "'31'",
    ANG_FORMAT: "'DEG'",
    REF_SYSTEM: "'ICRF'",
    APPARENT: "'AIRLESS'",
    CSV_FORMAT: "'YES'"
  });
  const requestUrl = 'https://ssd.jpl.nasa.gov/api/horizons.api?' + params.toString();
  const response = await fetchImpl(requestUrl, {
    method: 'GET',
    headers: { accept: 'application/json' }
  });
  if (!response || response.ok !== true) {
    throw new Error('JPL Horizons request failed with HTTP status ' + (response?.status ?? 'unknown'));
  }
  const payload = await response.json();
  if (payload?.error) throw new Error('JPL Horizons error: ' + payload.error);
  return parseObserverQuantity31(payload, body, jdUt, targetId);
}

/**
 * Transform a DE441 apparent tropical ecliptic-of-date longitude into the
 * caller-declared Saura sidereal frame. The offset is explicit, date-specific,
 * and must be supplied by the caller; this function never guesses an ayanamsa.
 */
export function sauraDe441ApparentTrueLongitude(reference, sauraSiderealOffsetDegrees) {
  if (!reference || reference.ephemeris !== 'DE441' || reference.quantity !== 31 ||
      reference.centerBody !== 'Earth (399)' || reference.observerCenter !== '500@399' ||
      reference.coordinateFrame !== 'JPL-IAU76/80-apparent-ecliptic-of-date' ||
      reference.interpolated !== false) {
    throw new TypeError('A direct DE441 Earth-geocentric apparent quantity-31 reference is required');
  }
  const body = bodyOf(reference.planet);
  if (reference.target !== TARGET_IDS[body]) throw new TypeError('DE441 target ID does not match the requested planet');
  if (!Number.isFinite(reference.jdUt) || !Number.isFinite(reference.longitude) ||
      reference.longitude < 0 || reference.longitude >= 360) {
    throw new TypeError('A finite epoch and tropical apparent longitude are required');
  }
  if (!Number.isFinite(sauraSiderealOffsetDegrees)) {
    throw new TypeError('The date-specific Saura sidereal offset must be supplied explicitly');
  }
  const longitude = norm360(reference.longitude - sauraSiderealOffsetDegrees);
  return Object.freeze({
    planet: body,
    jdUt: reference.jdUt,
    trueLongitude: longitude,
    latitude: reference.latitude,
    source: 'NASA/JPL Horizons DE441',
    ephemeris: 'DE441',
    kind: 'DE441_GEOCENTRIC_APPARENT_TRUE',
    inputQuantity: 31,
    inputFrame: 'JPL-IAU76/80-apparent-ecliptic-of-date',
    frame: 'Saura-sidereal transferred from JPL apparent ecliptic-of-date',
    siderealOffsetDegrees: sauraSiderealOffsetDegrees,
    transfer: 'JPL apparent tropical longitude − explicit date-specific Saura sidereal offset',
    interpolated: false,
    productionEligible: false
  });
}

/**
 * Return three non-interchangeable products. de441Reference is optional;
 * when supplied, sauraSiderealOffsetDegrees is mandatory.
 */
export function sauraBijaLongitudeProducts(jdUt, planet, {
  de441Reference = null,
  sauraSiderealOffsetDegrees
} = {}) {
  const body = bodyOf(planet);
  const inputs = sauraBijaCorrectedFivePlanetInputs(jdUt, body);
  const classical = sauraBijaCorrectedTrueLongitudeResearch(jdUt, body);

  const classicalBijaMean = Object.freeze({
    planet: body,
    jdUt,
    longitude: inputs.meanLongitude,
    frame: 'traditional-Saura-nirayana',
    kind: 'CLASSICAL_BIJA_MEAN',
    source: 'Burgess 1860 Bija-corrected Saura mean revolutions',
    productionEligible: false
  });
  const classicalBijaTrue = Object.freeze({
    planet: body,
    jdUt,
    longitude: classical.trueLongitude,
    frame: 'traditional-Saura-nirayana',
    kind: 'CLASSICAL_BIJA_TRUE',
    method: classical.trueLongitudeMethod,
    source: 'Classical Saura four-pass Manda/Sighra research model',
    accuracyCertification: 'Not certified against DE441; strict 0.05-degree gate failed',
    productionEligible: false
  });
  const de441ApparentTrue = de441Reference
    ? sauraDe441ApparentTrueLongitude(de441Reference, sauraSiderealOffsetDegrees)
    : null;
  if (de441ApparentTrue && de441ApparentTrue.planet !== body) {
    throw new TypeError('The DE441 reference planet does not match the classical model planet');
  }
  if (de441ApparentTrue && Math.abs(de441ApparentTrue.jdUt - jdUt) > 1e-7) {
    throw new TypeError('The DE441 reference epoch must exactly match the classical model epoch');
  }

  return Object.freeze({
    planet: body,
    jdUt,
    classicalBijaMean,
    classicalBijaTrue,
    de441ApparentTrue,
    classicalTrueMinusDe441Degrees: de441ApparentTrue
      ? signedAngle(classicalBijaTrue.longitude, de441ApparentTrue.trueLongitude)
      : null,
    outputsAreSeparate: true,
    productionEligible: false
  });
}

export const SAURA_DE441_TARGET_IDS = TARGET_IDS;
