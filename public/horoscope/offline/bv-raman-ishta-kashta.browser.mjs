/**
 * B.V. Raman / Sripathi-style square-root Ishta-Kashta Phala formulas.
 *
 * Scope is deliberately narrow: this module calculates Phala ONLY after the
 * caller supplies Uchcha Bala and the special Chesta-for-Phala input. It does
 * not calculate or certify the sixfold Shadbala total.
 *
 * Source: B.V. Raman, Graha and Bhava Balas (13th ed.), Chapter X,
 * printed pp. 102-104, paras 136-139.
 * Source page (transcription): https://studylib.net/doc/28274582/bhava-and-graha-balas-b.v.raman-1996
 *
 * Important source distinction:
 * BPHS Chapter 28 also describes a Rasmi-based Ishta/Kashta procedure. That is
 * a different method and MUST NOT be mixed into these square-root equations.
 * Values produced here are only as reliable as the two supplied inputs.
 */

const PLANETS = Object.freeze([
  'சூரியன்', 'சந்திரன்', 'செவ்வாய்', 'புதன்', 'குரு', 'சுக்கிரன்', 'சனி'
]);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const norm360 = value => ((value % 360) + 360) % 360;
const round2 = value => Math.round((value + Number.EPSILON) * 100) / 100;
const angleLimit = angle => {
  const normalized = norm360(angle);
  return normalized > 180 ? 360 - normalized : normalized;
};

/**
 * Square-root method as explicitly stated by B.V. Raman, Ch. X paras 138-139.
 * Inputs are Virupas/Shashtiamsas on the 0..60 scale.
 */
export function bvRamanIshtaKashta({ uchchaBala, cheshtaBala } = {}) {
  if (!finite(uchchaBala) || !finite(cheshtaBala)) {
    throw new TypeError('Finite Uchcha Bala and Chesta-for-Phala are required');
  }
  if (uchchaBala < 0 || uchchaBala > 60 ||
      cheshtaBala < 0 || cheshtaBala > 60) {
    throw new RangeError('Uchcha Bala and Chesta-for-Phala must each be 0..60 Virupas');
  }

  const ishtaRaw = Math.sqrt(uchchaBala * cheshtaBala);
  const kashtaRaw = Math.sqrt((60 - uchchaBala) * (60 - cheshtaBala));
  return Object.freeze({
    method: 'BV_RAMAN_SQRT_ISHTA_KASHTA',
    unit: 'virupa',
    uchchaBala,
    cheshtaBala,
    ishtaRaw,
    kashtaRaw,
    ishtaPhala: round2(ishtaRaw),
    kashtaPhala: round2(kashtaRaw),
    formulaVerified: true,
    chartInputsCertified: false,
    source: 'B.V. Raman, Graha and Bhava Balas, Chapter X, paras 138-139, printed pp. 103-104',
    note: 'The formula is calculated from the supplied inputs; this does not certify those inputs or the chart Shadbala.'
  });
}

/**
 * Calculate the B.V. Raman special Chesta value needed ONLY for Ishta/Kashta.
 * It is intentionally separate from the Sun/Moon terms included in sixfold
 * Shadbala and never claims that astronomical inputs have been certified.
 *
 * Sun: reduce (Sayana Sun longitude + 90 degrees), then divide by 3.
 * Moon: reduce (Nirayana Moon longitude - Nirayana Sun longitude), then divide by 3.
 * Mars/Mercury/Jupiter/Venus/Saturn: reduce
 *   (Sighrocca - midpoint(shortest arc from mean to true longitude)), then / 3.
 */
export function bvRamanChestaForPhala({
  planet,
  sunSayanaLongitude,
  sunNirayanaLongitude,
  moonNirayanaLongitude,
  meanLongitude,
  trueLongitude,
  sheeghroccaLongitude
} = {}) {
  if (!PLANETS.includes(planet)) throw new RangeError('Seven classical planets only');

  let chestaKendraRaw;
  let midpoint = null;
  let formula;

  if (planet === 'சூரியன்') {
    if (!finite(sunSayanaLongitude)) {
      throw new TypeError('Sun Ishta/Kashta Chesta requires Sayana solar longitude');
    }
    chestaKendraRaw = norm360(sunSayanaLongitude + 90);
    formula = '(Sayana Sun longitude + 90 degrees), reduced to 0..180';
  } else if (planet === 'சந்திரன்') {
    if (!finite(sunNirayanaLongitude) || !finite(moonNirayanaLongitude)) {
      throw new TypeError('Moon Ishta/Kashta Chesta requires Sun and Moon Nirayana longitudes');
    }
    chestaKendraRaw = norm360(moonNirayanaLongitude - sunNirayanaLongitude);
    formula = '(Moon Nirayana - Sun Nirayana), reduced to 0..180';
  } else {
    if (![meanLongitude, trueLongitude, sheeghroccaLongitude].every(finite)) {
      throw new TypeError('Five-planet Ishta/Kashta Chesta requires mean, true and Sighrocca longitudes');
    }
    const delta = norm360(trueLongitude - meanLongitude);
    if (Math.abs(delta - 180) < 1e-10) {
      throw new RangeError('Mean/true longitude midpoint is ambiguous at exactly 180 degrees');
    }
    const signedDelta = delta > 180 ? delta - 360 : delta;
    midpoint = norm360(meanLongitude + signedDelta / 2);
    chestaKendraRaw = norm360(sheeghroccaLongitude - midpoint);
    formula = 'Sighrocca - circular midpoint(mean, true), reduced to 0..180';
  }

  const reducedChestaKendra = angleLimit(chestaKendraRaw);
  const cheshtaForPhalaRaw = reducedChestaKendra / 3;
  return Object.freeze({
    planet,
    method: 'BV_RAMAN_SPECIAL_CHESTA_FOR_ISHTA_KASHTA',
    chestaKendraRaw,
    reducedChestaKendra,
    midpoint,
    cheshtaForPhalaRaw,
    cheshtaForPhala: round2(cheshtaForPhalaRaw),
    formula,
    formulaImplemented: true,
    astronomicalInputsCertified: false,
    source: 'B.V. Raman, Graha and Bhava Balas, Chapter VI, printed pp. 76-79; Chapter X, printed pp. 102-103',
    note: 'This Ishta/Kashta input is distinct from the sixfold Shadbala Cheshta Bala field; the source example contains rounding/transcription conflicts that require separate reconciliation.'
  });
}

export const BV_RAMAN_ISHTA_KASHTA_SOURCE = Object.freeze({
  method: 'BV_RAMAN_SQRT_ISHTA_KASHTA',
  ishtaFormula: 'sqrt(Uchcha Bala * Chesta-for-Phala)',
  kashtaFormula: 'sqrt((60 - Uchcha Bala) * (60 - Chesta-for-Phala))',
  inputScale: '0..60 Virupas/Shashtiamsas',
  source: 'B.V. Raman, Graha and Bhava Balas, Chapter X, paras 138-139, printed pp. 103-104',
  notEquivalentTo: 'The distinct Rasmis procedure in BPHS Chapter 28',
  sixfoldShadbalaIncluded: false,
  productionCertification: false
});
