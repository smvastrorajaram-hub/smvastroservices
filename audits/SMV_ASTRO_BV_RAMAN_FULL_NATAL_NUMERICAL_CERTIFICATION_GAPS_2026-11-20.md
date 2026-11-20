# SMV ASTRO — Natal Shadbala Numerical Certification Gap Register

**Date:** 20 November 2026  
**Active method:** B.V. Raman `strength6`  
**Current external longitude reference scope:** **2026 only**

## Current result

- The existing B.V. Raman and C.G. Rajan source-verification certificates remain unchanged.
- The seven-graha Standard Horoscope worked-example arithmetic regression and certificate remain separate and unchanged.
- The previous historical-year longitude sample set has been withdrawn. The only date-specific external planetary longitude sample maintained by this PR is now the Government of India PAC 2026 series.
- The production calculation path remains unchanged. This PR is research and regression evidence only.

## 2026 official PAC longitude reference

The official Positional Astronomy Centre, Kolkata / India Meteorological Department publishes daily 2026 Nirayana longitude tables for Mercury, Venus, Mars, Jupiter and Saturn. The 2026 sample fixture and its scope are documented in:

`audits/SMV_ASTRO_PAC_2026_FIVE_GRAHA_NIRAYANA_CROSSCHECK_2026-11-20.md`

The regression currently compares 15 source values (three dates × five planets) with the bundled Swiss Ephemeris WASM 2.10.03 using its Lahiri sidereal mode and explicit SWIEPH data flags.

- Maximum absolute difference: **0.000065502° = 0.235806 arc-second**.
- RMS difference: **0.000028824° = 0.103767 arc-second**.
- Per-point acceptance: **0.0001° = 0.36 arc-second**.
- All 15 samples pass.

**Metadata limitation:** The PAC daily PDF headings do not explicitly state the row epoch or name the ayanamsa. The comparison's 00:00 TT epoch and Lahiri sidereal convention are empirical inferences, not source metadata. PAC confirmation and denser annual sampling remain required.

## Mandatory blockers before arbitrary natal totals can be certified

1. **Coherent five-graha Cheshta inputs:** Obtain Mean, True and Sheeghroccheya longitudes for Mars, Mercury, Jupiter, Venus and Saturn from one documented model/frame/epoch. Do not combine a modern PAC/Swiss True longitude with traditional Saura Mean/Sheeghroccheya and call the resulting Cheshta classical.
2. **Historical Saura method:** Verify the source-faithful four-pass True-longitude method, including date-specific Bīja and Mandocca/apsis inputs. The 2026 PAC sidereal samples do not certify that historical model.
3. **Other Shadbala components:** Retain source-linked verification for Sthana, Dig, Kala, Naisargika and Drig inputs, including declinations, solar-time inputs and aspect geometry.
4. **Graha Yuddha boundaries:** Independently verify source-specific eligibility, winner/loser and pre-war adjustments at conjunction boundaries. Unresolved cases must withhold affected totals.
5. **Broader numerical coverage:** Expand the 2026 PAC sample across the full annual span, retrograde stations, conjunctions and sign transitions. Then validate the date/model contract before considering wider date ranges.

## Required safety rule for a future, separately approved production correction

For any graha whose required six-Bala component is unavailable, preserve verified partial component evidence but set `complete=false` and withhold `totalVirupa`, `totalRupa`, `ratio` and `isStrong`. Customer-facing reports should show unavailable, not convert a missing total into zero or a false “below minimum” result. This behaviour is not introduced by this audit-only PR; it requires a separately approved production change after compatibility review.

## Release boundaries

- No production merge or deployment is part of this research PR.
- No production source, app Service Worker, cache release or customer-facing report is changed.
- No origin-wide storage/cache clearing and no user-data deletion is introduced.
- `historicalSauraTrueLongitudeCertified=false`, `classicalFiveGrahaCheshtaCertified=false` and `productionIntegrationAllowed=false` remain mandatory.
