// SMV CALENDAR — exact Chandrashtama Rasi / Nakshatra-Pada geometry.
// The sidereal zodiac is divided into 12 x 30-degree Rasis, 27 x 13°20'
// Nakshatras, and 108 x 3°20' Padas. These are equal longitude divisions.

export const RASI_COUNT = 12;
export const NAKSHATRA_COUNT = 27;
export const PADA_COUNT = 108;
export const RASI_DEGREES = 30;
export const NAKSHATRA_DEGREES = 360 / NAKSHATRA_COUNT;
export const PADA_DEGREES = 360 / PADA_COUNT;

export function normalizeSiderealLongitude(value) {
  const longitude = Number(value);
  if (!Number.isFinite(longitude)) return null;
  return ((longitude % 360) + 360) % 360;
}

export function getChandrashtamaRasiIndex(janmaRasiIndex) {
  const rasi = Number(janmaRasiIndex);
  if (!Number.isInteger(rasi) || rasi < 0 || rasi >= RASI_COUNT) return null;
  return (rasi + 7) % RASI_COUNT;
}

export function getNakshatraPadaAtLongitude(longitude) {
  const siderealLongitude = normalizeSiderealLongitude(longitude);
  if (siderealLongitude === null) return null;
  // An epsilon assigns an exact 3°20' boundary to the pada that starts there.
  const padaIndex = Math.min(PADA_COUNT - 1,
    Math.floor((siderealLongitude + 1e-10) / PADA_DEGREES));
  return {
    signIndex: Math.floor(siderealLongitude / RASI_DEGREES),
    degreeInSign: siderealLongitude % RASI_DEGREES,
    nakshatraIndex: Math.floor(padaIndex / 4),
    pada: (padaIndex % 4) + 1,
    padaIndex
  };
}

// Project the selected Janma Nakshatra-Pada 210 degrees forward into the
// eighth sidereal Rasi, preserving the exact 3°20' pada interval.
// This is a pada-specific refinement requested for SMV CALENDAR; it is kept
// distinct from the full eighth-Rasi Chandrashtama and the separate 17th-star
// counting convention.
export function getChandrashtamaPadaProjection(nakshatraIndex, birthPada) {
  const star = Number(nakshatraIndex);
  const pada = Number(birthPada);
  if (!Number.isInteger(star) || star < 0 || star >= NAKSHATRA_COUNT ||
      !Number.isInteger(pada) || pada < 1 || pada > 4) return null;
  const natalStart = star * NAKSHATRA_DEGREES + (pada - 1) * PADA_DEGREES;
  const natalEnd = natalStart + PADA_DEGREES;
  const projectedStart = normalizeSiderealLongitude(natalStart + 210);
  const projectedEnd = normalizeSiderealLongitude(natalEnd + 210);
  const position = getNakshatraPadaAtLongitude(projectedStart + 1e-8);
  const natalPosition = getNakshatraPadaAtLongitude(natalStart + 1e-8);
  return {
    janmaNakshatraIndex: star,
    janmaPada: pada,
    janmaRasiIndex: natalPosition.signIndex,
    janmaDegreeStart: natalPosition.degreeInSign,
    targetNakshatraIndex: position.nakshatraIndex,
    targetPada: position.pada,
    targetRasiIndex: position.signIndex,
    targetDegreeStart: position.degreeInSign,
    targetDegreeEnd: (position.degreeInSign + PADA_DEGREES),
    startLongitude: projectedStart,
    endLongitude: projectedEnd,
    offsetDegrees: 210,
    method: 'Janma Nakshatra-Pada longitude + 210 degrees (eighth-Rasi degree projection)'
  };
}

export function getChandrashtamaPadaSegments(chandrashtamaRasiIndex) {
  const rasi = Number(chandrashtamaRasiIndex);
  if (!Number.isInteger(rasi) || rasi < 0 || rasi >= RASI_COUNT) return [];
  return Array.from({ length: 9 }, (_, index) => {
    const fromDegree = index * PADA_DEGREES;
    const toDegree = (index + 1) * PADA_DEGREES;
    const midpoint = rasi * RASI_DEGREES + (fromDegree + toDegree) / 2;
    const position = getNakshatraPadaAtLongitude(midpoint);
    return {
      index,
      signIndex: rasi,
      fromDegree,
      toDegree,
      nakshatraIndex: position.nakshatraIndex,
      pada: position.pada
    };
  });
}

// Returns the padas of a selected birth star that actually fall in the
// selected Janma Rasi. This matters for the nine Nakshatras split by a Rasi
// boundary; it does not guess a missing birth pada.
export function getBirthStarPadasInRasi(nakshatraIndex, janmaRasiIndex) {
  const star = Number(nakshatraIndex);
  const rasi = Number(janmaRasiIndex);
  if (!Number.isInteger(star) || star < 0 || star >= NAKSHATRA_COUNT ||
      !Number.isInteger(rasi) || rasi < 0 || rasi >= RASI_COUNT) return [];
  return [1, 2, 3, 4].filter(pada => {
    const midpoint = star * NAKSHATRA_DEGREES + (pada - 0.5) * PADA_DEGREES;
    return getNakshatraPadaAtLongitude(midpoint).signIndex === rasi;
  });
}

export function formatRasiDegree(degree) {
  const value = Number(degree);
  if (!Number.isFinite(value)) return '—';
  const totalSeconds = Math.max(0, Math.min(30 * 3600, Math.round(value * 3600)));
  const degrees = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return String(degrees).padStart(2, '0') + '°' +
    String(minutes).padStart(2, '0') + '′' +
    String(seconds).padStart(2, '0') + '″';
}
