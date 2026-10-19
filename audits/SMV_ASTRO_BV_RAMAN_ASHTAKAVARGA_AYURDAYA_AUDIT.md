# B.V. Raman Ashtakavarga Ayurdaya — source and implementation audit

**Status: RESEARCH ONLY — NOT LIVE, NOT CLASSICALLY CERTIFIED**

## Scope

Create an isolated B.V. Raman Ashtakavarga Ayurdaya calculation channel. Do not substitute C.G. Rajan Pinda/Amsa/Naisargika Ayurdaya, BPHS longevity, or Shadbala-based selection. Do not change the current Horoscope or Marriage Matching customer output until the primary printed source and a complete independent worked-chart oracle have been reconciled.

## Existing website findings

- `public/horoscope/offline/astro_advanced.browser.mjs` already calculates the seven Bhinna Ashtakavarga (BAV) rows, Prastara contributor cells, Sarvashtakavarga (SAV), Kakshya indicators, and invariant totals.
- The existing BAV totals expected by the current structural checks are Sun 48, Moon 49, Mars 39, Mercury 54, Jupiter 56, Venus 52, Saturn 39; aggregate SAV total 337. These invariants do not prove every contributor cell or all reductions are correct.
- The existing `sodhyaPinda(chart, lang)` is a display helper that multiplies raw SAV by sign index and BAV totals by a planet's sign index. It is not a classical reduced-BAV Rasi Pinda/Graha Pinda/Sodhya Pinda implementation and must not be reused for B.V. Raman Ayurdaya.
- A separate `classical-shodhana.browser.mjs` implements a BPHS/P.V.R.-sourced reduction candidate, with documented source convention differences. It must not be silently aliased as Raman's method.

## Raman research implementation

File: `public/horoscope/offline/bv-raman-ashtakavarga-ayurdaya.browser.mjs`

- Keeps seven BAV rows and the Raman-reported Rasi/Graha Gunakara constants separate from BPHS/P.V.R. constants. The current Raman transcription uses Virgo multiplier 5, whereas the P.V.R. table used by the existing BPHS/P.V.R. module gives 6; do not blend these schools.
- Trikona Shodhana and Ekadhipatya Shodhana are separately implemented with per-sign audit traces.
- Method A computes per-graha Rasi Pinda, Graha Pinda, Sodhya Pinda and an unadjusted modulo-27 arithmetic candidate from reduced BAV rows.
- Method B computes an SAV-based candidate while preserving both branches of a disputed 100-year adjustment.
- All returned results are marked `certified: false`, `researchOnly: true`, and `customerDisplayAllowed: false`. Final/net/solar lifespan values are withheld.

## Primary-source and numerical blockers

The primary printed pages from *B.V. Raman, Ashtakavarga System of Prediction* have not yet been verified in this audit. The current test fixture uses secondary transcriptions. Reported discrepancies include:
1. Method-A per-graha gross-year totals that do not consistently reconcile with the displayed Pinda arithmetic.
2. Conflicting descriptions/examples for visible-half Harana.
3. Method-B worked output that appears inconsistent with the stated 100-year subtraction rule.
4. Need for a full chart example independently transcribed from the primary edition, with each BAV row, both reductions, all pinda products, Harana candidate selection, lunar/solar conversion, and printed rounding checked.

Until these are resolved, the system must not show a final lifespan, death age, or death date to customers. B.V. Raman himself warns that Ashtakavarga longevity should not be treated as reliable in actual practice.

## Regression gate

`tests/bv-raman-ashtakavarga-ayurdaya-regression.mjs` checks constants, edge cases in both reductions, per-sign product sums, a published-secondary Sun example, Method-B alternate branches, malformed inputs, and separation from other Ayurdaya engines. The new dedicated workflow also runs the existing BPHS and P.V.R. Shodhana regressions.

A passing regression confirms the encoded arithmetic and guardrails only. It does not establish primary-source certification or authorize customer-facing integration.

## 2026-10-19 regression expansion

A separate B. V. Raman *Hindu Predictive Astrology* Chapter XXVI worked-example transcription is now kept separate from the still-missing primary pages of *Ashtakavarga System of Prediction*. Regression covers the transcribed Sun row and the sign/planet products, the published Trikona examples, gross-year arithmetic for seven reported Pinda pairs, displayed Harana sum, and the 334/365 conversion discrepancy. The ASOP secondary Method-A comparison also pins the three rows beyond the 0.1-year tolerance (Jupiter, Venus, Saturn). Method-B continues to expose both 100-year-rule branches without selecting a certified final.

Evidence limits: the HPA source text is a searchable scan/OCR transcription; page-image verification is pending. The dedicated ASOP primary worked pages remain absent. Passing CI therefore means only that these arithmetic cases and known discrepancies are reproducible; it is not a certification of all seven reduced BAV rows or either method's final answer.
