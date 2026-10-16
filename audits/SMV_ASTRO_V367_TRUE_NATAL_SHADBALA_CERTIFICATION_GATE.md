# SMV ASTRO V367 — BPHS True Longitude / Natal Cheshta / Shadbala certification gate

Date: 17 October 2026. Status: **QUALIFIED / FULL CERTIFICATION WITHHELD**.

## Evidence scope

- **PASS:** V365 traditional Saura mean/Sheeghrocha (IMD 2026 March 22, six published uncorrected figures, <=1.75 arcseconds); V366 published BPHS five-planet Cheshta arithmetic (2026 IMD Bija-corrected + official true positions, 2024 academic printed triples).
- **NEW — V367:** dedicated `saura-classical-true-longitude.browser.mjs` four-pass Śīghra–Manda evaluator with 5 published planet-specific manda/sighra epicycle sizes; explicit original-mean step-3. `sauraMandoccaResearch` extrapolates published 2024 apsides via slow classical rates for research **only**.
- **NOT PASS:** book-consistent, historically validated True Longitude for arbitrary DOB; five natal Cheshta Bala values; full seven-planet BPHS six-fold Shadbala with numerical Drig + Kala/Yuddha and chart-level certification. No merging into production calculation.

## Independently published true-longitude examples — same four-pass evaluator

Source A: [traditional worked example of Caitanya appearance](https://rkanetech.com/true-position), with supplied mean/apsis/Sheeghrocha, 5 planets:

| Planet | Published (°) | V367 (°) | Error (°) |
|---|---:|---:|---:|
| Mercury | 338.236980 | 338.222908 | 0.014072 |
| Venus | 7.292850 | 7.291590 | 0.001260 |
| Mars | 280.251060 | 280.225348 | 0.025712 |
| Jupiter | 264.436320 | 264.435011 | 0.001309 |
| Saturn | 232.004070 | 231.717254 | 0.286816 |

All pass an **exploratory 0.35°** tolerance, but NOT all a precision-certificate threshold of 0.05°.

Source B: Santhoju, Bhalla, Behera and R.V. Pai, *Journal of Astrophysics and Astronomy* 46:9 (2025), Tables 6–7, 9 April 2024 Mandi sunrise:

| Planet | Published (°) | V367 (°) | Error (°) | <=0.05° |
|---|---:|---:|---:|---|
| Mercury | 0.738000 | 0.214323 | 0.523677 | FAIL |
| Venus | 343.986700 | 343.982769 | 0.003931 | PASS |
| Mars | 319.900300 | 316.586033 | 3.314267 | FAIL |
| Jupiter | 28.211500 | 28.611113 | 0.399613 | FAIL |
| Saturn | 313.023600 | 313.341874 | 0.318274 | FAIL |

These show substantial cross-implementation disagreement. **Do not assume printed source error without further evidence**; reproduce the paper's precise sine table, variable paridhi, apsis epoch and correction order, then reconcile both independent worked examples. Our atan2 circular-geometry implementation is an *unrounded geometric analogue*, not a byte-for-byte traditional sine table or the paper's specific numerical model. Lower threshold and/or planet-specific arbitrary fit is forbidden.

## Historical natal tests

The regression computes research-only traditional candidate mean, 2024-anchored apsis, four-pass True Longitude and Cheshta Virupas for five Perambalur input dates:

- 15 Jun 1994 13:03 IST
- 6 Sep 2015 09:30 IST
- 31 Jul 1992 22:05 IST
- 4 May 1971 05:05 IST
- 11 Jan 1974 16:04 IST

All 25 candidate results must remain 0–60 Virupas with `certified:false`, and must **never** overwrite existing production `motionClassical` speed-based estimates. No 25 independently printed DOB True Longitude values and no epoch-dependent Bija oracle exist yet.

## Certification criteria (hard safety gate)

1. Reproduce both independent 2024 worked examples at a predeclared precision/rounding tolerance (≤0.05°), or establish and document their differing astronomical conventions with independently sourced numerical oracles.
2. Supply independently tested classical Mandocca/Bija evolution and reconcile historical True Longitude at *all five* natal dates, all five planets: **25 timestamped independent pairs**.
3. Check BPHS mean–true circular midpoint, Sheeghrocha, Kendra, Virupa for those 25 pairs and verify no zodiac/frame mixing.
4. Cross-check seven-planet BPHS Shadbala components separately, resolve BPHS/UK Drig/Yuddha, verify sunrise/ayanamsa/temporal boundaries, record numeric expected totals for all five charts.
5. Only then set `classicalCertified:true` and change source-level `motionClassical`; require full GitHub Actions green before merge.

**Formal evidence decision:**
`meanMotionPartial=PASS`; `cheshtaPublishedSnapshotArithmetic=PASS`; `classicalTrueAllDates=FAIL_UNCERTIFIED`; `natalCheshta=NOT_CERTIFIED`; `completeShadbala=NOT_CERTIFIED`.

This is a test-evidence report, **not a falsely signed complete Shadbala certificate**.
