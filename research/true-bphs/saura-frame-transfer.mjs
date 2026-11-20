/**
 * Frame transfer for the NAELOS-backed TRUE BPHS research engine.
 *
 * NAELOS returns modern apparent tropical ecliptic-of-date positions.
 * The BPHS Cheshta input chain retains the V365 Saura-paksha mean positions.
 * This function explicitly transfers the tropical NAELOS longitude into the
 * source-anchored Saura sidereal frame by carrying the Burgess 1860 zero point
 * with the date-specific Lahiri precession delta.
 *
 * This is only a coordinate-frame conversion. It does not calculate True
 * Longitude, call the historical four-pass Manda/Sheeghra model, or use the
 * rejected absolute-koti-minus convention.
 */
const BURGESS_SAURA_ZERO_POINT_1860 = 18 + 5 / 60 + 8.25 / 3600;

export function sauraSiderealOffsetFromLahiri(lahiriAyanamsaAtDate,lahiriAyanamsaAt1860) {
  if(!Number.isFinite(lahiriAyanamsaAtDate)||!Number.isFinite(lahiriAyanamsaAt1860)) {
    throw new TypeError('Finite date-specific and 1860 Lahiri ayanamsa values are required');
  }
  return BURGESS_SAURA_ZERO_POINT_1860 +
    (lahiriAyanamsaAtDate-lahiriAyanamsaAt1860);
}

export const TRUE_BPHS_FRAME_TRANSFER_METADATA=Object.freeze({
  zeroPointEpoch:'1860-01-01',
  zeroPointDegrees:BURGESS_SAURA_ZERO_POINT_1860,
  transfer:'Burgess 1860 Saura zero point + (date-specific Lahiri ayanamsa − Lahiri ayanamsa at 1860)',
  kind:'EXPLICIT_COORDINATE_FRAME_TRANSFER_ONLY',
  historicalFourPassTrueLongitudeUsed:false,
  absoluteKotiMinusUsed:false
});
