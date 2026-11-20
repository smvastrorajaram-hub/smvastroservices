# SMV ASTRO — B.V. Raman Seven-Graha Standard-Horoscope Numerical Certificate

**Certificate ID:** SMV-BVR-SHADBALA-STANDARD-7G-NUMERICAL-2026-11-20  
**Date:** 20 November 2026  
**Method:** B.V. Raman, *Graha and Bhava Balas*, 13th edition  
**Status:** **PASS — seven-graha total, Rupa, required-strength ratio, threshold and ranking arithmetic for the printed Standard Horoscope worked example only.**  
**Scope:** Additional numerical-arithmetic evidence. The existing 19 October B.V. Raman and C.G. Rajan source-verification certificates remain unchanged.

## 1. Independent input oracle

The existing source-verification fixture transcribes the seven-graha Standard Horoscope component values. This certificate adds an independently assembled six-term total oracle and compares the browser and Node implementations against it. The published component values are rounded in the book; the test retains the explicit component tolerances already declared by the earlier source-verification audit.

\[
T = Sthana + Dig + Kala + Cheshta + Naisargika + Drik
\]

\[
Rupa = T/60, \qquad Ratio = T/RequiredVirupa
\]

A planet meets the minimum only when the unrounded total Virupa is greater than or equal to its source-specific required Virupa.

## 2. Reconciled seven-graha results

| Graha | Total Virupa | Total Rupa | Required Rupa | Ratio | Display | Rank | Minimum |
|---|---:|---:|---:|---:|---:|---:|---|
| Sun | 425.022 | 7.084 | 5.00 | 141.674% | 142% | 3 / 7 | Meets |
| Moon | 389.851 | 6.498 | 6.00 | 108.292% | 108% | 4 / 7 | Meets |
| Mars | 298.109 | 4.968 | 5.00 | 99.370% | 99% | 7 / 7 | Below |
| Mercury | 536.936 | 8.949 | 7.00 | 127.842% | 128% | 1 / 7 | Meets |
| Jupiter | 433.738 | 7.229 | 6.50 | 111.215% | 111% | 2 / 7 | Meets |
| Venus | 376.142 | 6.269 | 5.50 | 113.982% | 114% | 6 / 7 | Meets |
| Saturn | 389.193 | 6.487 | 5.00 | 129.731% | 130% | 5 / 7 | Meets |

The component-level source tolerances remain those recorded in the existing B.V. Raman certificate. The total values above are the exact three-decimal results produced by the current Node/Browser engines for that fixed printed Standard Horoscope fixture. The regression separately assembles the six-term sum, checks it against the source-derived oracle within the declared rounding tolerance, verifies the engine's three-decimal Rupa rounding, required-strength ratio, unrounded pass/fail decision, rounded display percentage, total-based rank order and Node/browser parity.

## 3. Automated evidence

The new regression is `tests/bv-raman-seven-graha-numerical-certification.mjs`. It checks all seven grahas in both calculation implementations.

**GitHub Actions evidence:** [B.V. Raman Integrated Strength6 QA run #1176](https://github.com/smvastrorajaram-hub/smvastroservices/actions/runs/44752918190) — PASS; the new numerical-certification step reports 132 assertions.

This is repository-level numerical evidence for the named printed worked example. It is not an institutional or publisher-issued certificate.

## 4. Explicit exclusions

This PASS does **not** certify arbitrary natal charts or every supported historical date. A live natal calculation still needs independently verified same-reference-frame mean, true and Sheeghrocchea inputs for Mars, Mercury, Jupiter, Venus and Saturn. The current live path uses a numeric candidate that combines Saura mean/Sheeghrocchea with Swiss/Lahiri true longitude; that mixed-frame candidate is not independently validated and must not be read as a certified natal Cheshta or full Shadbala result. Historical Bija/apsis inputs and independent natal true-longitude oracles remain outstanding.

**Production boundary:** This PR does not change the live engine or customer reports. The existing live output remains as it is today; this worked-example PASS must not be applied to arbitrary natal charts. Any future decision to withhold or revise those customer-facing totals requires a separate, explicitly reviewed production change after the required source data and compatibility tests are complete.

The existing two source-verification certificates are not replaced or edited.
