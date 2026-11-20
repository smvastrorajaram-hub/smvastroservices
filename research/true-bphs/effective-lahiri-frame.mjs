/**
 * Common effective Lahiri sidereal-frame transfer for TRUE BPHS research.
 *
 * Planetary apparent positions remain exclusively NAELOS DE440. Swiss is
 * used only to determine the same-epoch coordinate-frame rotation:
 * tropical apparent Sun longitude minus Lahiri sidereal apparent Sun longitude.
 *
 * V365 Mean / Sheeghroccheya retain their already-audited source model. Their
 * native reference-epoch coordinates are rotated into the same effective Lahiri
 * frame before they enter BPHS Cheshta. No Saura frame is used as the BPHS
 * output/calculation frame.
 */
const RADIAN_FLAGS = 2 | 256; // Swiss Ephemeris data + speed
const V365_MEAN_SOURCE_REFERENCE_ZERO_POINT_DEGREES = 18 + 5 / 60 + 8.25 / 3600;
const norm360 = value => ((value % 360) + 360) % 360;

export const TRUE_BPHS_LAHIRI_FRAME_ID =
  'NAELOS_TRUE_ECLIPTIC_OF_DATE_EFFECTIVE_LAHIRI_V1';

export function v365MeanSourceNativeOffsetDegrees(lahiriAyanamsaAtDate, v365ReferenceAyanamsaAt1860) {
  if (!Number.isFinite(lahiriAyanamsaAtDate) || !Number.isFinite(v365ReferenceAyanamsaAt1860)) {
    throw new TypeError('Finite date-specific and 1860 Lahiri ayanamsa values are required');
  }
  return V365_MEAN_SOURCE_REFERENCE_ZERO_POINT_DEGREES +
    (lahiriAyanamsaAtDate - v365ReferenceAyanamsaAt1860);
}

export function effectiveLahiriSiderealOffsetDegrees(swe, jdTt) {
  if (!swe || !Number.isFinite(jdTt) || typeof swe.calc !== 'function' ||
      typeof swe.siderealSpeedFlags !== 'function') {
    throw new TypeError('Swiss Ephemeris and a finite TT epoch are required for Lahiri frame calibration');
  }
  const tropicalSun = swe.calc(jdTt, 0, RADIAN_FLAGS);
  const siderealSun = swe.calc(jdTt, 0, swe.siderealSpeedFlags());
  if (!Number.isFinite(tropicalSun?.longitude) || !Number.isFinite(siderealSun?.longitude)) {
    throw new Error('Effective Lahiri sidereal offset could not be computed from the same-epoch Sun');
  }
  return norm360(tropicalSun.longitude - siderealSun.longitude);
}

export function transferV365MeanToEffectiveLahiri(longitude, sourceNativeOffsetDegrees, effectiveLahiriOffsetDegrees) {
  if (![longitude, sourceNativeOffsetDegrees, effectiveLahiriOffsetDegrees].every(Number.isFinite)) {
    throw new TypeError('Finite V365 longitude and both frame offsets are required');
  }
  return norm360(longitude + sourceNativeOffsetDegrees - effectiveLahiriOffsetDegrees);
}

export const TRUE_BPHS_LAHIRI_FRAME_METADATA = Object.freeze({
  frameId: TRUE_BPHS_LAHIRI_FRAME_ID,
  coordinateSystem: 'effective Lahiri sidereal ecliptic-of-date',
  calibration: 'same-epoch Swiss tropical apparent Sun longitude minus Swiss Lahiri sidereal apparent Sun longitude',
  planetPositionProvider: 'NAELOS Ephemeris 0.1.3 / NASA-JPL DE440',
  v365MeanInput: 'V365 mean-motion source; values rotated into this same effective Lahiri frame',
  noSauraFrame: true,
  absoluteKotiMinusUsed: false
});
