# SMV ASTRO — BPHS SHADBALA MATHEMATICAL VERIFICATION CERTIFICATE (SUBSYSTEM-ONLY)

**Date:** 2026-10-17  
**GitHub evidence:** [successful 5/5-job CI run 38975238038](https://github.com/smvastrorajaram-hub/smvastroservices/actions/runs/38975238038)  
**Source branch:** `audit/v365-saura-mean-motion-panchang-oracle` (Draft PR #14)  
**Verdict:** **PASS — Ch26 Sputa Drishti, Ch27 Naisargika exact fractions, and seven-graha sixfold sum arithmetic.**  
**NOT** a certificate of all six individual book-calculation inputs, nor a historical astronomical True Longitude or fully deployable classical Shadbala certificate.

## Authenticated source of rules

1. BPHS, R. Santhanam, Volume I, Chapter 26, printed pages 257–258: Drishti in degrees, six general piecewise arcs; Mars special +15 Virupas in 90–120 / 210–240; Jupiter +30 in 120–150 / 240–270; Saturn +45 in 60–90 / 270–300 (half-open range conventions explicitly codified).
2. BPHS Chapter 27, verse 19: signed one-quarter Drishti Pinda plus full Mercury/Jupiter Drig aspect.
3. BPHS Chapter 27, verse 14: exactly 60 × [Saturn=1, Mars=2, Mercury=3, Jupiter=4, Venus=5, Moon=6, Sun=7] / 7 Virupas.
4. BPHS Chapter 27: six total strengths = Sthana + Dig + Kala + Cheshta + Naisargika + Drig, then 60 Virupas per Rupa.

## Actual source-level fixes

- `public/horoscope/offline/bphs-sputa-drishti.browser.mjs`: independent, exact-angle piecewise Drishti component with general and special aspects.
- `public/horoscope/offline/swiss_vedic.browser.mjs`: **replaced** prior inconsistent `sputaDrishti` implementation in live Phase3 Drig with the new book formula; changed only Phase3 natural values to exact `60*n/7`. The legacy Phase2 composite display mapping retains its historical two-decimal approximation, intentionally.
- Existing classical research-only true/Cheshta pipeline remains isolated from production.

## Evidence: hard CI assertions, five actual Perambalur births

- `tests/bphs-ch26-sputa-drig-live-five-charts.mjs`: **2,193 assertions PASS**, including independent interpolated-knot oracle, all three special aspect windows, circular angular boundaries, 35 independent natal seven-graha Drig Bala outputs, source-level Phase3 agreement and negative signed strengths.
- `tests/bphs-seven-graha-sixfold-mathematical-reconciliation.mjs`: **363 assertions PASS**: seven exact classical natural Virupas, **35** independent sixfold recomputed totals, 35 Kala subdivision sums, Virupa/Rupa conversions, book minimum requirements and explicit incomplete-certificate guard.
- GitHub Actions: **5/5 jobs PASS**, including browser UI, GeoNames status and HTTP smoke. All older V365–V368 arithmetic/regression steps still pass.

**35 verified birth/planet rows:** 1971-05-04 05:05 IST, 1974-01-11 16:04 IST, 1992-07-31 22:05 IST, 1994-06-15 13:03 IST, 2015-09-06 09:30 IST. Source tests print *every* six-component Virupa ledger in CI logs.

## Strict certificate boundary

This mathematically verifies the stated book formulas GIVEN the calculated/entered planetary longitudes and remaining component figures. It DOES NOT independently validate the planetary positions or the accuracy of every one of the input component subroutines.

**NON-PASS / withheld certificates:**

- Full seven-graha classical Sthana/Dig/Kala/Cheshta/Naisargika/Drig astronomical and historical accuracy: **NOT CERTIFIED**.
- Historical 1971/1974/1992/1994/2015 **Saura four-stage True Longitude** with matching mean, Mandocca, Sheeghrocha and Bija: **NOT CERTIFIED** (2024 published 4/5 disagreement remains; source-dependent epicycle convention unresolved).
- Natal five-planet actual BPHS Cheshta in the strict consistent classical true reference frame: **NOT CERTIFIED**.
- All seven grahas' independently published **final** total six-bala values at those 5 dates: **NOT CERTIFIED**.
- Production integration of `saura-natal-five-cheshta.browser.mjs`: **NOT ACTIVE**. `classicalCertified` stays false; **DO NOT MERGE** for claimed complete classical certification.

**Signed scope:** automated, reproducible software-based BPHS mathematical-subsystem verification. This document is deliberately **not** an official BPHS full Shadbala certificate.
