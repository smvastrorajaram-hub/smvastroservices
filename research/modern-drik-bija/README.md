# Modern Dṛk-Bīja True — research prototype 0.1

**Status:** Research-only prototype. Not merged. Not production eligible.  
**Model key:** MODERN_DRIK_BIJA_TRUE  
**Validation gate:** MODERN_DRIK_BIJA_TRUE_ANNUAL_DE441_TIME_BLOCKED_0_05

## Why this is a separate model

The source-faithful historical CLASSICAL_BIJA_MEAN and CLASSICAL_BIJA_TRUE outputs remain unchanged. This prototype is a separately named modern Dṛk-calibrated hybrid. It must not be described as the historical Sūrya-Siddhānta Bīja model, or used to rewrite its mean-motion, Mandocca, Manda or Śīghra constants.

## Version 0.1 model definition

1. **Modern apparent-position kernel:** Swiss Ephemeris 2.10.03 is called with the explicit Moshier flag MOSEPH = 4. The output is an Earth-geocentric apparent tropical longitude in the ecliptic of date. The adapter rejects a different returned ephemeris flag. It does not use a hidden SWIEPH fallback.
2. **Dṛk calibration:** for each of Mercury, Venus, Mars, Jupiter and Saturn, the test fits a first-order secular correction to the signed longitude residual against JPL DE441:
   
   residual(year) = c0 + c1 × ((year − 2100) / 100)
   
   corrected output = normalize360(Moshier longitude − residual(year)).
3. **No arbitrary harmonic terms:** version 0.1 adds no free sin(2M), sin(3M) or 15–25-term periodic series. Those terms must be derived from a complete orbital theory and validated against double-counting, rather than chosen to fit residuals.

This makes the prototype an explicit modern empirical Dṛk calibration on top of an analytic apparent-position kernel. The fitted correction is a geocentric longitude residual correction; it is not claimed to be a classical mean-motion Bīja constant.

## Training and blind validation split

The immutable fixture is copied byte-for-byte from the DE441 annual Horizons fixture used in the separate historical-source research. It contains 600 annual samples per planet from 1800-01-01 to 2399-01-01, all in the same Earth-geocentric apparent quantity-31 frame.

- **Training:** 1900–2299 (400 annual epochs per planet).
- **Blind holdout:** 1800–1899 and 2300–2399 (200 annual epochs per planet).
- **Coverage:** 600 annual epochs × 5 planets = 3,000 calculations.
- **Hard limit:** maximum absolute wrapped longitude error ≤ 0.05° for every planet, on the full interval and on the blind holdout blocks. The threshold is not relaxed.
- **Frame discipline:** tropical apparent ecliptic-of-date against the matching DE441 quantity 31. No Lahiri or Saura ayanāṃśa is subtracted.

The coefficient fit function filters to the declared 1900–2299 training interval itself. The holdout rows are not passed to the fitting calculation. CI prints the fitted per-planet coefficients, fit residuals, raw Moshier residuals, corrected residuals, p95 and maximum.

## What a PASS would and would not mean

## 0.05° evidence certificate — PASS

The annual DE441 blind-holdout regression and the independent monthly/event INPOP19 validation have completed successfully.

- Annual DE441 grid: 3,000 comparisons; fit uses 1900–2299 and withholds 1800–1899 plus 2300–2399.
- Monthly INPOP19 grid: 36,000 comparisons (7,200 per planet; first day of each month from 1800-01 through 2399-12).
- Dense event-window INPOP19 grid: 245,925 comparisons around candidate stations, solar conjunctions/oppositions and mutual conjunctions.
- Corrected-model maximum absolute residual: **0.002457605°**, against the strict **0.05°** limit separately for every planet on both monthly and event-window grids.
- No daily INPOP grid was used; the requested monthly cadence is supplemented by a 12-hour candidate event locator and 6-hour independent INPOP samples across each detected event's ±24-hour window.

Certificate: [MODERN_DRIK_BIJA_INPOP_0_05_ACCURACY_CERTIFICATE.md](./MODERN_DRIK_BIJA_INPOP_0_05_ACCURACY_CERTIFICATE.md).  
Run [#44606465328](https://github.com/smvastrorajaram-hub/smvastroservices/actions/runs/44606465328) and its [validation job](https://github.com/smvastrorajaram-hub/smvastroservices/actions/runs/44606465328/job/135851363567) both succeeded.

The raw Moshier kernel and corrected Modern Dṛk-Bīja results are reported separately. The fitted correction does not improve every planet relative to raw Moshier; the certificate proves the declared error ceiling on the specified validation sets, not universal improvement.

## Current measured results

See [the annual DE441 holdout report](./ANNUAL_1800_2399_DE441_HOLDOUT_REPORT.md) for the per-planet coefficients and training/blind-holdout metrics. See the [certificate](./MODERN_DRIK_BIJA_INPOP_0_05_ACCURACY_CERTIFICATE.md) for the complete monthly and event-window INPOP result table and scope limitations.

## Monthly and event validation against an independent theory

The independent reference gate uses the IMCCE Miriade service with its INPOP planetary theory. Instead of a daily reference grid, it compares the first day of every month from 1800-01 through 2399-12: 7,200 epochs per planet, or 36,000 monthly positions for five planets.

Monthly epochs are submitted as explicit ascending text-file lists in batches no larger than the documented 1,000-epoch Miriade POST limit. The test validates INPOP theory identity, TT timescale, geocentre, apparent-of-date coordinates, ecliptic plane, returned row count and exact epoch order.

A monthly grid can miss short station and retrograde intervals. Therefore a separate 12-hour **Moshier-only event locator** scans for planetary stations, planet-Sun longitude conjunctions/oppositions and pairwise planetary conjunctions. This is not a daily INPOP comparison dataset. Around each located event, independent INPOP is queried every 6 hours from -24 hours to +24 hours. The fixed DE441-trained coefficients are applied without any fitting or retuning on monthly INPOP or event epochs.

Every planet must independently remain within the strict 0.05° maximum absolute error on both the entire 7,200-epoch monthly grid and its dense event subset. The threshold is not relaxed. The machine-readable report is uploaded as the MODERN-DRIK-BIJA-INPOP-MONTHLY-EVENT-VALIDATION artifact.

See [the monthly/event validation protocol](./INPOP_MONTHLY_EVENT_VALIDATION_PROTOCOL.md) and tests/modern-drik-bija-inpop-monthly-event-validation.mjs.


## Remaining research phases before any production consideration

1. Freeze the fitted coefficient set as a reviewed, versioned artifact with provenance, exact training epochs and a checksum; the present certificate binds the values to its recorded CI run but does not package a production coefficient release.
2. Continue the fuller heliocentric 3D audit, including Earth/Moon centre, light-time, aberration, deflection, timescale and ecliptic-of-date transformations.
3. Publish a derivation note and test a physically interpretable heliocentric mean/apsis parameterization before describing the prototype as a complete semi-analytical Bīja theory.

## Safety boundary

This PR adds only the research model, a read-only Moshier adapter, an annual reference fixture, tests, documentation and a research-only GitHub Actions workflow. It does not edit production horoscope calculations, classical Bīja, BPHS/Shadbala, Marriage Matching, Calendar, public UI, Service Workers, cache versions, APKs, Render configuration, Cloudflare, Firebase or deployed services. No production integration is proposed.

A later Render auto-deploy authorization for an approved merge does not authorize a manual deployment of any service while this PR remains unmerged.
