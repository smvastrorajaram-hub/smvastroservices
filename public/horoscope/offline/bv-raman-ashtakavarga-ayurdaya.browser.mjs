/**
 * B. V. Raman — Ashtakavarga Ayurdaya research module.
 *
 * Kept separate from Shadbala (strength6), CG Rajan Pinda/Amsa/Naisargika,
 * BPHS Ayurdaya, and all customer-facing Horoscope/Marriage Matching output.
 *
 * SOURCE BOUNDARY:
 * - Chapter II / Standard Horoscope Table I is available through a secondary
 *   transcription of the printed table, including a July 2026 position
 *   correction. The original table page still needs visual verification.
 * - Chapter XIV (Ayurdaya) primary worked pages are not yet fully verified.
 *   Available secondary Method-A totals, visible-half Harana wording and
 *   Method-B's 100-year rule contain arithmetic conflicts.
 * - Hindu Predictive Astrology Chapter XXVI is a separate cross-reference,
 *   not a substitute for ASOP Chapter XIV.
 *
 * This module records arithmetic candidates and discrepancy traces only. It
 * never certifies or emits a final lifespan value. Nothing here is production
 * integrated or customer-display approved.
 *
 * Sign indices: Aries=0 ... Pisces=11. Planet row keys are English names.
 */
export const BV_RAMAN_AYURDAYA_PLANETS = Object.freeze([
  'Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'
]);

// B. V. Raman, Ashtakavarga System of Prediction — reported method factors.
// Do NOT replace with the BPHS helper's different Virgo multiplier (6).
export const BV_RAMAN_RASI_GUNAKARA = Object.freeze([
  7, 10, 8, 4, 10, 5, 7, 8, 9, 5, 11, 12
]);
export const BV_RAMAN_GRAHA_GUNAKARA = Object.freeze({
  Sun: 5, Moon: 5, Mars: 8, Mercury: 5, Jupiter: 10, Venus: 7, Saturn: 5
});
export const BV_RAMAN_OWNED_SIGN_PAIRS = Object.freeze([
  Object.freeze([0, 7]), // Mars: Aries / Scorpio
  Object.freeze([1, 6]), // Venus: Taurus / Libra
  Object.freeze([2, 5]), // Mercury: Gemini / Virgo
  Object.freeze([8, 11]), // Jupiter: Sagittarius / Pisces
  Object.freeze([9, 10]) // Saturn: Capricorn / Aquarius
]);
export const BV_RAMAN_TRIKONA_GROUPS = Object.freeze([
  Object.freeze([0, 4, 8]),  // Aries / Leo / Sagittarius
  Object.freeze([1, 5, 9]),  // Taurus / Virgo / Capricorn
  Object.freeze([2, 6, 10]), // Gemini / Libra / Aquarius
  Object.freeze([3, 7, 11])  // Cancer / Scorpio / Pisces
]);

/**
 * Standard Horoscope, B.V. Raman, Ashtakavarga System of Prediction, Chapter II,
 * Table I. Values transcribed from a modern reproduction of the printed table;
 * that reproduction records a July 2026 correction to Moon=Aquarius and
 * Mercury=Libra. Keep this as a secondary table-transcription oracle until
 * the original printed Table I scan is visually audited.
 *
 * Signs: Aries=0 ... Pisces=11. Values are BAV before both reductions and the
 * table's after-Ekadhipatya result for each graha. This data is only a
 * regression fixture; it is not an extra production calculation dependency.
 */
export const BV_RAMAN_STANDARD_HOROSCOPE_REDUCTION_ORACLE = Object.freeze({
  source: 'B. V. Raman, Ashtakavarga System of Prediction, Ch. II, Table I; secondary table transcription corrected July 2026',
  evidenceGrade: 'SECONDARY_REPRODUCTION_OF_PRINTED_TABLE',
  planetSigns: Object.freeze({
    Sun: 5, Moon: 10, Mars: 7, Mercury: 6, Jupiter: 2, Venus: 5, Saturn: 4
  }),
  occupiedSigns: Object.freeze([2, 4, 5, 6, 7, 10]),
  beforeReductionRows: Object.freeze({
    Sun: Object.freeze([5, 3, 5, 4, 4, 4, 3, 5, 5, 0, 5, 5]),
    Moon: Object.freeze([5, 3, 5, 5, 3, 2, 3, 4, 6, 5, 3, 5]),
    Mars: Object.freeze([4, 3, 4, 3, 4, 1, 1, 5, 3, 2, 5, 4]),
    Mercury: Object.freeze([4, 6, 4, 5, 5, 5, 3, 6, 4, 4, 5, 3]),
    Jupiter: Object.freeze([3, 4, 7, 6, 4, 4, 6, 4, 5, 5, 4, 4]),
    Venus: Object.freeze([7, 4, 4, 3, 3, 4, 5, 3, 4, 5, 4, 6]),
    Saturn: Object.freeze([5, 2, 4, 4, 3, 3, 5, 2, 3, 3, 1, 4])
  }),
  afterReductionRows: Object.freeze({
    Sun: Object.freeze([0, 3, 2, 0, 0, 4, 0, 1, 0, 0, 2, 0]),
    Moon: Object.freeze([2, 1, 2, 1, 0, 0, 0, 0, 1, 3, 0, 1]),
    Mars: Object.freeze([0, 2, 3, 0, 1, 0, 0, 2, 0, 0, 4, 1]),
    Mercury: Object.freeze([0, 2, 1, 2, 1, 1, 0, 3, 0, 0, 2, 0]),
    Jupiter: Object.freeze([0, 0, 3, 2, 1, 0, 2, 0, 2, 1, 0, 0]),
    Venus: Object.freeze([4, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1]),
    Saturn: Object.freeze([2, 0, 3, 2, 0, 1, 4, 0, 0, 1, 0, 2])
  }),
  beforeSavTotal: 337,
  afterReductionSarvashtakavarga: Object.freeze([8, 8, 14, 7, 3, 6, 7, 6, 4, 6, 8, 5]),
  afterSavTotal: 82
});

const SHODHANA_SOURCE =
  'B. V. Raman, Ashtakavarga System of Prediction, Chapter II / Standard Horoscope Table I (secondary transcription; printed page-image verification pending)';
const AYURDAYA_SOURCE =
  'B. V. Raman, Ashtakavarga System of Prediction, Chapter XIV (Ayurdaya; primary Method A/B worked pages pending verification)';
const SOURCE = AYURDAYA_SOURCE;
const finite = value => typeof value === 'number' && Number.isFinite(value);

function validateRow(value, label) {
  if (!Array.isArray(value) || value.length !== 12 ||
      !value.every(point => Number.isSafeInteger(point) && point >= 0 && point <= 8)) {
    throw new RangeError(label + ' must contain 12 integer bindus in 0..8');
  }
  return [...value];
}
function validateReducedSav(value) {
  if (!Array.isArray(value) || value.length !== 12 ||
      !value.every(point => Number.isSafeInteger(point) && point >= 0 && point <= 56)) {
    throw new RangeError('Reduced Sarvashtakavarga must contain 12 integer totals within 0..56');
  }
  return [...value];
}
function validateRows(rows) {
  if (!rows || typeof rows !== 'object' || Array.isArray(rows)) {
    throw new TypeError('bavRows must map the seven graha names to 12-point rows');
  }
  for (const planet of BV_RAMAN_AYURDAYA_PLANETS) {
    if (!(planet in rows)) throw new TypeError('Missing BAV row for ' + planet);
  }
  return Object.fromEntries(BV_RAMAN_AYURDAYA_PLANETS.map(
    planet => [planet, validateRow(rows[planet], 'BAV ' + planet)]
  ));
}
function validatePlanetSigns(planetSigns) {
  if (!planetSigns || typeof planetSigns !== 'object' || Array.isArray(planetSigns)) {
    throw new TypeError('planetSigns must map each graha to sign index 0..11');
  }
  const output = {};
  for (const planet of BV_RAMAN_AYURDAYA_PLANETS) {
    const sign = planetSigns[planet];
    if (!Number.isInteger(sign) || sign < 0 || sign > 11) {
      throw new RangeError('Missing/invalid sign index for ' + planet);
    }
    output[planet] = sign;
  }
  return output;
}
function validateOccupiedSigns(occupiedSigns) {
  if (!Array.isArray(occupiedSigns) ||
      occupiedSigns.some(sign => !Number.isInteger(sign) || sign < 0 || sign > 11)) {
    throw new TypeError('occupiedSigns must explicitly list occupied rasi indices 0..11');
  }
  // Duplicates are legitimate when several grahas occupy the same sign.
  return new Set(occupiedSigns);
}
function total(values) {
  return values.reduce((sum, value) => sum + value, 0);
}

/**
 * B. V. Raman's reported Trikona-Shodhana convention:
 * - all-positive unequal trine: subtract the least from all three;
 * - all-positive equal trine: zero all three;
 * - exactly one zero: leave unchanged;
 * - two zeros: also zero the remaining member.
 *
 * This convention is separately encoded; it is not an alias of the BPHS
 * classical-shodhana helper. Verify the exact convention against the printed
 * primary text before marking the method certified.
 */
export function bvRamanTrikonaShodhana(binduRow) {
  const values = validateRow(binduRow, 'Trikona Shodhana');
  const trace = [];
  for (const group of BV_RAMAN_TRIKONA_GROUPS) {
    const before = group.map(index => values[index]);
    const zeroCount = before.filter(value => value === 0).length;
    let rule = 'subtract-minimum';
    let subtract = 0;
    if (zeroCount === 1) {
      rule = 'single-zero-no-reduction';
    } else if (zeroCount >= 2) {
      for (const index of group) values[index] = 0;
      rule = 'two-zero-third-also-zero';
    } else if (before.every(value => value === before[0])) {
      for (const index of group) values[index] = 0;
      rule = 'all-equal-zero-all';
    } else {
      subtract = Math.min(...before);
      for (const index of group) values[index] -= subtract;
    }
    trace.push({
      signs: [...group], before, subtract, rule,
      after: group.map(index => values[index])
    });
  }
  return Object.freeze({
    values: Object.freeze(values),
    trace: Object.freeze(trace.map(Object.freeze)),
    source: SHODHANA_SOURCE,
    certified: false
  });
}

/**
 * Reported Ekadhipatya Shodhana rules:
 * - Cancer and Leo are exempt because they have one lord;
 * - if either sign has zero bindus, do not alter the pair;
 * - both signs occupied: no reduction;
 * - one occupied: adjust the empty sign to the occupied count if the empty
 *   count is higher; otherwise zero the empty sign;
 * - both empty: equal counts zero both; unequal counts reduce the higher to
 *   the lower.
 *
 * This is deliberately a research transcription until compared against the
 * actual source pages. Occupancy must be supplied by the caller, not guessed.
 */
export function bvRamanEkadhipatyaShodhana(binduRow, occupiedSigns) {
  const values = validateRow(binduRow, 'Ekadhipatya Shodhana');
  const occupied = validateOccupiedSigns(occupiedSigns);
  const trace = [];
  for (const [a, b] of BV_RAMAN_OWNED_SIGN_PAIRS) {
    const before = [values[a], values[b]];
    const occupiedPair = [occupied.has(a), occupied.has(b)];
    let rule = 'unchanged-zero-bindus';
    if (values[a] > 0 && values[b] > 0) {
      if (occupiedPair[0] && occupiedPair[1]) {
        rule = 'both-occupied-no-reduction';
      } else if (occupiedPair[0] !== occupiedPair[1]) {
        const inhabited = occupiedPair[0] ? a : b;
        const empty = occupiedPair[0] ? b : a;
        values[empty] = values[empty] > values[inhabited] ? values[inhabited] : 0;
        rule = 'one-occupied-adjust-empty';
      } else if (values[a] === values[b]) {
        values[a] = 0;
        values[b] = 0;
        rule = 'both-empty-equal-zero';
      } else {
        const least = Math.min(values[a], values[b]);
        values[a] = least;
        values[b] = least;
        rule = 'both-empty-reduce-higher-to-lower';
      }
    }
    trace.push({
      signs: [a, b], before, occupancy: occupiedPair, rule,
      after: [values[a], values[b]]
    });
  }
  return Object.freeze({
    values: Object.freeze(values),
    trace: Object.freeze(trace.map(Object.freeze)),
    source: SHODHANA_SOURCE,
    certified: false
  });
}

/** Perform per-graha Trikona then Ekadhipatya reductions and form reduced SAV. */
export function bvRamanAshtakavargaShodhana({ bavRows, occupiedSigns } = {}) {
  const rows = validateRows(bavRows);
  const occupied = validateOccupiedSigns(occupiedSigns);
  const afterReduction = {};
  const traces = {};
  for (const planet of BV_RAMAN_AYURDAYA_PLANETS) {
    const trine = bvRamanTrikonaShodhana(rows[planet]);
    const ekadhipatya = bvRamanEkadhipatyaShodhana(trine.values, [...occupied]);
    afterReduction[planet] = [...ekadhipatya.values];
    traces[planet] = {
      before: rows[planet],
      trikona: trine,
      ekadhipatya
    };
  }
  const reducedSarva = Array.from({ length: 12 }, (_, sign) =>
    BV_RAMAN_AYURDAYA_PLANETS.reduce((sum, planet) => sum + afterReduction[planet][sign], 0)
  );
  return Object.freeze({
    beforeReductionRows: Object.freeze(rows),
    afterReductionRows: Object.freeze(afterReduction),
    afterReductionSarvashtakavarga: Object.freeze(reducedSarva),
    afterReductionSarvashtakavargaTotal: total(reducedSarva),
    traces: Object.freeze(traces),
    source: SHODHANA_SOURCE,
    certified: false,
    blockers: Object.freeze([
      'Chapter II standard-horoscope reductions currently match a secondary transcription; original printed Table I page-image verification remains pending.',
      'The Chapter XIV Ayurdaya primary worked chart is still required to certify any final Method A/B result.'
    ])
  });
}

/**
 * Method A (Bhinnashtakavarga): calculate Rasi/Graha/Sodya Pinda and gross
 * formula candidates for each graha. Harana/net-year/final solar results are
 * intentionally withheld because the transcribed worked example has arithmetic
 * conflicts; see the dedicated audit note.
 */
export function bvRamanAshtakavargaMethodAFromReducedRows({
  afterReductionRows, planetSigns
} = {}) {
  const rows = validateRows(afterReductionRows);
  const signs = validatePlanetSigns(planetSigns);
  const planets = {};
  for (const subject of BV_RAMAN_AYURDAYA_PLANETS) {
    const row = rows[subject];
    const rasiProducts = row.map((bindu, index) => bindu * BV_RAMAN_RASI_GUNAKARA[index]);
    const rasiPinda = total(rasiProducts);
    const grahaProducts = BV_RAMAN_AYURDAYA_PLANETS.map(planet => ({
      planet,
      sign: signs[planet],
      bindus: row[signs[planet]],
      multiplier: BV_RAMAN_GRAHA_GUNAKARA[planet],
      product: row[signs[planet]] * BV_RAMAN_GRAHA_GUNAKARA[planet]
    }));
    const grahaPinda = grahaProducts.reduce((sum, entry) => sum + entry.product, 0);
    const sodyaPinda = rasiPinda + grahaPinda;
    const grossLunarYearsUnwrapped = sodyaPinda * 7 / 27;
    const grossLunarYearsModulo27 = ((grossLunarYearsUnwrapped % 27) + 27) % 27;
    // Keep the two source-reported conversion constants separate. The
    // dedicated ASOP Method-A secondary transcription uses 324/365; the
    // separate Hindu Predictive Astrology Ch. XXVI transcription says 334/365.
    // Neither gross candidate is a final/net lifespan because Harana is pending.
    const grossSolarYears324Secondary = grossLunarYearsModulo27 * 324 / 365;
    const grossSolarYears334HpaCh26 = grossLunarYearsModulo27 * 334 / 365;
    planets[subject] = Object.freeze({
      rasiPinda, rasiProducts: Object.freeze(rasiProducts),
      grahaPinda, grahaProducts: Object.freeze(grahaProducts.map(Object.freeze)),
      sodyaPinda, grossLunarYearsUnwrapped, grossLunarYearsModulo27,
      grossSolarYears324Secondary,
      grossSolarYears334HpaCh26,
      netAfterHaranaLunarYears: null,
      solarYears: null
    });
  }
  return Object.freeze({
    method: 'A — individual Bhinnashtakavarga',
    planets: Object.freeze(planets),
    sumOfModulo27GrossCandidates: total(
      BV_RAMAN_AYURDAYA_PLANETS.map(planet => planets[planet].grossLunarYearsModulo27)
    ),
    netTotalLunarYears: null,
    finalSolarYears: null,
    finalLifespan: null,
    source: SOURCE,
    researchOnly: true,
    certified: false,
    customerDisplayAllowed: false,
    blockers: Object.freeze([
      'Secondary Method-A transcription contains mismatched reported Venus/Saturn gross years versus Sodya-Pinda arithmetic.',
      'Visible-half Harana wording and at least one worked reduction do not agree.',
      'Exact primary Ashtakavarga System of Prediction Method-A pages and its complete worked chart are still required.',
      'Separate Hindu Predictive Astrology Chapter XXVI transcribes 334/365, while the ASOP secondary transcription reports 324/365; these source tracks must not be conflated.',
      'No Method-A Harana loss is silently stacked; no final value is emitted.'
    ])
  });
}

/**
 * Method B (Nakshatrayu): use reduced Sarvashtakavarga. Both outcomes of the
 * source's disputed 100-year rule are returned for comparison; neither is
 * selected as the final result.
 */
export function bvRamanAshtakavargaMethodB({
  reducedSarvashtakavarga, planetSigns
} = {}) {
  const sav = validateReducedSav(reducedSarvashtakavarga);
  const signs = validatePlanetSigns(planetSigns);
  const rasiProducts = sav.map((bindu, index) => bindu * BV_RAMAN_RASI_GUNAKARA[index]);
  const rasiPinda = total(rasiProducts);
  const grahaProducts = BV_RAMAN_AYURDAYA_PLANETS.map(planet => ({
    planet,
    sign: signs[planet],
    bindus: sav[signs[planet]],
    multiplier: BV_RAMAN_GRAHA_GUNAKARA[planet],
    product: sav[signs[planet]] * BV_RAMAN_GRAHA_GUNAKARA[planet]
  }));
  const grahaPinda = grahaProducts.reduce((sum, entry) => sum + entry.product, 0);
  const sodyaPinda = rasiPinda + grahaPinda;
  const lunarYearsUnadjusted = sodyaPinda * 7 / 27;
  const lunarYearsAfterSingle100Subtraction = lunarYearsUnadjusted > 100
    ? lunarYearsUnadjusted - 100 : lunarYearsUnadjusted;
  return Object.freeze({
    method: 'B — Sarvashtakavarga / Nakshatrayu',
    reducedSarvashtakavarga: Object.freeze(sav),
    rasiProducts: Object.freeze(rasiProducts),
    rasiPinda,
    grahaProducts: Object.freeze(grahaProducts.map(Object.freeze)),
    grahaPinda,
    sodyaPinda,
    lunarYearsUnadjusted,
    lunarYearsAfterSingle100Subtraction,
    solarYearsWithout100Subtraction: lunarYearsUnadjusted * 324 / 365,
    solarYearsAfter100Subtraction: lunarYearsAfterSingle100Subtraction * 324 / 365,
    finalSolarYears: null,
    finalLifespan: null,
    source: SOURCE,
    researchOnly: true,
    certified: false,
    customerDisplayAllowed: false,
    blockers: Object.freeze([
      'The secondary source does not clearly establish whether a 100-unit deduction precedes or follows lunar-to-solar conversion; 94.8 follows converting the unadjusted quotient.',
      'Both plausible placements of the 100-unit deduction are kept for audit; neither is designated final until the original Chapter XIV page is checked.',
      'Primary printed source pages and independent worked-chart oracle are required.'
    ])
  });
}

/** Secondary-transcription fixture only; never an independent certification source. */
export const BV_RAMAN_METHOD_B_SECONDARY_EXAMPLE = Object.freeze({
  reducedSarvashtakavarga: Object.freeze([7, 0, 7, 1, 0, 10, 0, 0, 2, 1, 1, 2]),
  planetSigns: Object.freeze({
    Sun: 5, Moon: 10, Mars: 7, Mercury: 6, Jupiter: 2, Venus: 5, Saturn: 4
  }),
  reportedRasiPinda: 217,
  reportedGrahaPinda: 195,
  reportedSodyaPinda: 412,
  reportedSolarYears: 94.8,
  evidenceGrade: 'SECONDARY_TRANSCRIPTION_ONLY',
  primaryBookPagesVerified: false
});

/**
 * Cross-reference oracle from B. V. Raman, Hindu Predictive Astrology,
 * 20th edition (1992), Chapter XXVI, printed pp. 199–203 (Scribd-indexed
 * book text). This is NOT the same chart as the secondary ASOP Method-A/B
 * example. OCR/page-image confirmation remains a separate evidence task.
 *
 * The Sun's after-reduction row and the planet placements are supplied so
 * tests can independently recalculate its Rasi/Graha/Sodya Pinda. The other
 * grahas' Pinda totals and printed gross years are a separate book-reported
 * aggregate oracle; per-sign rows for those grahas are not fabricated here.
 */
export const BV_RAMAN_HPA_CHAPTER_XXVI_ORACLE = Object.freeze({
  source: 'B. V. Raman, Hindu Predictive Astrology, 20th ed. (1992), Ch. XXVI, pp. 199–203',
  evidenceGrade: 'PRIMARY_AUTHOR_TEXT_TRANSCRIPTION_PAGE_IMAGE_PENDING',
  sunAfterReductionRow: Object.freeze([2, 3, 0, 3, 0, 0, 0, 0, 0, 2, 2, 2]),
  planetSigns: Object.freeze({
    Sun: 3, Moon: 1, Mars: 4, Mercury: 4, Jupiter: 7, Venus: 4, Saturn: 1
  }),
  reportedRasiPinda: Object.freeze({
    Sun: 112, Moon: 104, Mars: 8, Mercury: 132,
    Jupiter: 85, Venus: 81, Saturn: 118
  }),
  reportedGrahaPinda: Object.freeze({
    Sun: 45, Moon: 60, Mars: 10, Mercury: 80,
    Jupiter: 50, Venus: 15, Saturn: 50
  }),
  reportedGrossLunarYears: Object.freeze({
    Sun: 13.70, Moon: 15.52, Mars: 4.66, Mercury: 0.96,
    Jupiter: 8.00, Venus: 24.88, Saturn: 16.55
  }),
  reportedHaranaFactors: Object.freeze({
    Sun: 1, Moon: 0.5, Mars: 0.5, Mercury: 0.5,
    Jupiter: 0.5, Venus: 0.5, Saturn: 0.5
  }),
  reportedNetLunarYears: 48.98,
  reportedLunarToSolarNumerator: 334,
  reportedLunarToSolarDenominator: 365,
  reportedFinalSolarYears: 44.87,
  note: 'Displayed net total and final solar years do not reconcile under the transcribed 334/365 ratio; retain as an explicit source-arithmetic discrepancy.'
});
