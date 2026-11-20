# SMV ASTRO — Natal Shadbala Numerical Certification Gap Register

**Date:** 20 November 2026  
**Active method:** B.V. Raman `strength6`  
**Current external longitude reference scope:** **2026 only**

## Current result

- The existing B.V. Raman and C.G. Rajan source-verification certificates remain unchanged.
- The seven-graha Standard Horoscope worked-example arithmetic regression and certificate remain separate and unchanged.
- The previously included historical-year longitude sample set was withdrawn. The only external planetary-longitude comparison maintained by this PR is now the official Government of India PAC 2026 daily Nirayana series.
- The production calculation path remains unchanged. This PR is research and regression evidence only.

## 2026 official PAC full-year longitude reference

The Positional Astronomy Centre, Kolkata / India Meteorological Department publishes daily 2026 Nirayana longitude tables for Mercury, Venus, Mars, Jupiter and Saturn.

Detailed source contract, pinned source-file hashes, all residuals, monthly coverage, station brackets, sign transitions and conjunction minima are documented in:

`audits/SMV_ASTRO_PAC_2026_FIVE_GRAHA_NIRAYANA_CROSSCHECK_2026-11-20.md`

The full-year test downloads the five official PDFs, verifies their exact byte lengths and SHA-256 digests against `tests/fixtures/pac-2026-official-daily-pdf-manifest.json`, extracts daily selectable text, and requires complete 2026 coverage without a missing or duplicate date.

**GitHub Actions run #1214:** https://github.com/smvastrorajaram-hub/smvastroservices/actions/runs/44771494887 — complete workflow SUCCESS using the 00:00 TT comparison convention.

- Five grahas × 365 daily rows: **1,825 / 1,825** comparisons.
- Maximum absolute difference: **0.253273″**, Jupiter on 2026-01-06.
- Overall RMS difference: **0.128957″**.
- Per-point acceptance gate: **0.36″**; all points pass.
- Per-planet maximum residuals: Mercury 0.032790″; Venus 0.024843″; Mars 0.028122″; Jupiter 0.253273″; Saturn 0.234244″.
- All 12 months have exact expected daily coverage.
- 12 daily station brackets, 36 sign-boundary crossings and 13 close pairwise conjunction minima were enumerated from the PAC daily rows.

The separate hard-coded 15-value three-date anchor regression passed 135 assertions at 00:00 TT in run #1207: https://github.com/smvastrorajaram-hub/smvastroservices/actions/runs/44769611357.

**Epoch decision:** Keep **00:00:00 TT** as the sole time-scale convention for PAC daily comparisons. The project owner reports receiving email confirmation that TT is the intended time scale. The email itself is not attached to this repository; this records the owner's confirmation. No UTC input, UT1 conversion or UTC-to-TT conversion is used in the tests.

**Ayanamsa metadata limitation:** The PAC daily PDF headings identify Nirayana longitudes but do not name the exact ayanamsa definition. Lahiri remains the empirically supported comparison setting; its exact PAC reference epoch/value and mean/true realization should be documented from the received correspondence or PAC technical specification. The PDFs also do not establish independent underlying ephemeris provenance relative to Swiss Ephemeris.

## Mandatory blockers before arbitrary natal totals can be certified

1. **Coherent five-graha Cheshta inputs:** Obtain Mean, True and Sheeghroccheya longitudes for Mars, Mercury, Jupiter, Venus and Saturn from one documented model/frame/epoch. Do not combine a modern PAC/Swiss True longitude with traditional Saura Mean/Sheeghroccheya and call the resulting Cheshta classical.
2. **Historical Saura method:** Verify the source-faithful four-pass True-longitude method, including date-specific Bīja and Mandocca/apsis inputs. The 2026 PAC sidereal samples do not certify that historical model.
3. **Other Shadbala components:** Retain source-linked verification for Sthana, Dig, Kala, Naisargika and Drig inputs, including declinations, solar-time inputs and aspect geometry.
4. **Graha Yuddha boundaries:** Independently verify source-specific eligibility, winner/loser and pre-war adjustments at conjunction boundaries. Unresolved cases must withhold affected totals.
5. **High-resolution event validation:** Daily PAC rows identify station brackets and daily conjunction minima, not exact instants. Use a finer-resolution source to establish exact station/conjunction timings where the rule requires it.
6. **Scope boundary:** The 2026 comparison is limited to 2026. It does not create an arbitrary-date 1800–2399 certificate.

## Required safety rule for a future, separately approved production correction

For any graha whose required six-Bala component is unavailable, preserve verified partial component evidence but set `complete=false` and withhold `totalVirupa`, `totalRupa`, `ratio` and `isStrong`. Customer-facing reports should show unavailable, not convert a missing total into zero or a false “below minimum” result. This behaviour is not introduced by this audit-only PR; it requires a separately approved production change after compatibility review.

## Release boundaries

- No production merge or deployment is part of this research PR.
- No production source, app Service Worker, cache release or customer-facing report is changed.
- No origin-wide storage/cache clearing and no user-data deletion is introduced.
- `historicalSauraTrueLongitudeCertified=false`, `classicalFiveGrahaCheshtaCertified=false` and `productionIntegrationAllowed=false` remain mandatory.
