# SMV ASTRO — B.V. Raman Printed Standard Horoscope Six-Bala / Yuddha Certificate

**Certificate ID:** `SMV-BVR-PRINTED-STANDARD-HOROSCOPE-SIX-BALA-YUDDHA-2026-11-20`  
**Issued:** 20 November 2026  
**Status:** **PASS — limited-scope, source-example software certification**  
**Certification scope:** The exact seven-graha Standard Horoscope worked example printed in B.V. Raman, *Graha and Bhava Balas*, 13th edition.  
**Not covered:** Arbitrary natal charts, arbitrary dates, historical ephemeris accuracy, prediction accuracy, or general production calculations.

## 1. Certified result

For the exact source-marked Standard Horoscope fixture, the Node and Browser B.V. Raman engines reproduce the six component values within the source-table rounding tolerances, calculate the final six-Bala Virupa and Rupa totals, compute the required-strength ratios and ranking, and resolve the final Yuddha stage as **no qualifying planetary war**.

The source-scoped engine result returns:

- `classicalCertified: true`
- `certificationScope: BV_RAMAN_PRINTED_STANDARD_HOROSCOPE_ONLY`
- Certificate ID: `SMV-BVR-PRINTED-STANDARD-HOROSCOPE-SIX-BALA-YUDDHA-2026-11-20`

This flag is **not** a global switch. The gate requires the exact Standard Horoscope longitudes, angular inputs, temporal lords, declinations, Julian epoch, and all five printed Chesta input triplets with their source provenance and coordinate-frame tags. If those inputs are absent or differ, the generic result remains `classicalCertified: false`.

## 2. Seven-graha six-Bala totals

The numerical regression compares the six components with the printed Standard Horoscope source values and verifies the final total, Rupa conversion, required Virupa, ratio, strength threshold, ranking, and Node/Browser parity.

| Graha | Total (Virupa) | Rupa | Required Rupa | Ratio | Rank | Meets minimum |
|---|---:|---:|---:|---:|---:|---|
| Sun | 425.022 | 7.084 | 5.0 | 141.674% | 3 | Yes |
| Moon | 389.851 | 6.498 | 6.0 | 108.292% | 4 | Yes |
| Mars | 298.109 | 4.968 | 5.0 | 99.370% | 7 | No |
| Mercury | 536.936 | 8.949 | 7.0 | 127.842% | 1 | Yes |
| Jupiter | 433.738 | 7.229 | 6.5 | 111.215% | 2 | Yes |
| Venus | 376.142 | 6.269 | 5.5 | 113.982% | 6 | Yes |
| Saturn | 389.193 | 6.487 | 5.0 | 129.731% | 5 | Yes |

The source values are rounded printed examples, so the regression declares separate explicit tolerances for Sthana, Dig, Kala, Cheshta, Naisargika, Drik and the assembled final Virupa total. It does not require the rounded printed component sum to equal the engine's unrounded intermediate arithmetic digit-for-digit.

## 3. Final Yuddha Bala evidence

B.V. Raman, Chapter V §§76–78, printed pages 60–62, is the governing source for the Yuddha rule used by the engine and the regression:

- Only Mercury, Venus, Mars, Jupiter and Saturn are eligible; Sun and Moon are excluded.
- The conjunction separation must be strictly less than 1 degree.
- The planet with the lesser normalized nirayana longitude is the winner.
- The absolute difference of the pre-war Sthana + Dig + Kala-through-Hora totals is divided by the difference in the two printed disc diameters.
- The resulting amount is added to the winner's Kala Bala and subtracted from the loser's Kala Bala.
- Ayana Bala is excluded from the pre-war comparison.

For the printed Standard Horoscope fixture, no eligible pair is within the strict 1-degree limit. The final Yuddha adjustment is therefore zero; the final Kala values and six-Bala totals pass the source-example regression.

A separate adversarial regression verifies two disjoint active war pairs, the exact 1.000-degree exclusion, the 0.999-degree inclusion, luminary exclusion, overlapping three-planet wars, final Kala recomposition, total Virupa/Rupa, and Node/Browser parity. Ambiguous overlapping pairs cause affected totals to be withheld rather than guessed.

## 4. Reproducible checks

The research validation workflow ran the following successful tests:

- `tests/bv-raman-strength6-regression.mjs` — **705 checks PASS**; existing Standard Horoscope component oracle, five natal integrations and default fail-closed status preserved.
- `tests/bv-raman-seven-graha-numerical-certification.mjs` — **164 assertions PASS**; seven-graha Standard Horoscope six-Bala totals, Rupa, ratios, ranking and scoped certificate.
- `tests/bv-raman-yuddha-regression.mjs` — **90 checks PASS**; Yuddha boundaries, formula, final Kala/total reconciliation and Node/Browser parity.
- `tests/bv-raman-ishta-kashta-regression.mjs` — **39 assertions PASS**; Chapter X Ishta/Kashta remains separate from the sixfold Bala.
- `tests/naelos-de440-five-natal-true-longitude.mjs` — separate five-natal, five-graha True Longitude/Chesta input evidence; it is not used to broaden this Standard Horoscope certificate.

**Integrated Actions run:** [#44790203571 — SUCCESS](https://github.com/smvastrorajaram-hub/smvastroservices/actions/runs/44790203571)  
**Validated source commit:** `4307fb2e1f84da6bb7ac25634afcf58d4b087ebd`

## 5. Certification boundary

This certificate proves that the source-specific six-Bala arithmetic and final Yuddha handling reproduce the stated printed Standard Horoscope worked example within declared tolerances. It does **not** prove that arbitrary natal astronomical inputs are historically exact.

Accordingly:

- The exact source-marked Standard Horoscope example may return `classicalCertified: true` with this certificate ID and scope.
- Ordinary natal calculations without that exact source fixture and provenance remain `classicalCertified: false` and provisional.
- The five-graha NAELOS DE440 True Longitude evidence remains limited to its own five natal epochs; it does not certify every date from 1800–2399.
- Historical natal True Longitude, arbitrary-date Mean/True/Sheeghroccheya consistency, and the complete natal Shadbala remain separately uncertified.
- `BV_RAMAN_SHADBALA_SOURCE.productionCertification` remains **false**. This certificate does not authorize a general production rollout.

This is a repository-internal, reproducible source-example certificate, not an external institutional accreditation.
