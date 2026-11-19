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

A CI PASS would establish only that this version-0.1 model meets the declared tolerance at the 3,000 **annual checkpoints**, including withheld early/late time blocks, against DE441. It would not certify daily positions, conjunction/station extremes between annual samples, a second independent ephemeris, external accreditation, or production behavior.

The raw Moshier kernel already has a separately scoped 0.05° annual DE441 comparison in PR #551 Phase H. The new test does not relabel that old result: it fits the Dṛk coefficients on the predeclared central training block and evaluates the corrected output separately.

## Current measured results

See [the annual DE441 holdout report](./ANNUAL_1800_2399_DE441_HOLDOUT_REPORT.md) for the exact run output, per-planet coefficients, training and blind-holdout errors, and the important caveat that the correction does not improve every planet relative to raw Moshier.

## Dense daily and event validation against an independent theory

A second research gate now downloads the complete 1800–2399 daily apparent-geocentric ecliptic grid from the IMCCE Miriade service with its INPOP planetary theory. The declared comparison frame is geocentric apparent-of-date ecliptic longitude in TT. The service's documented 5,000-date request cap is respected by chunked daily downloads; high-density event lists respect the documented 1,000-epoch request cap.

The daily gate covers 219,145 calendar dates per planet (1,095,725 planetary rows total). A second event gate detects stations, solar conjunctions/oppositions and mutual planetary conjunctions from the daily INPOP series, then compares at six-hour cadence over ±24 hours around each event. The same fixed DE441-trained v0.1 coefficients are applied; no INPOP or event epoch is used to refit them. Both daily and event maxima must independently remain ≤0.05° for every planet. See the new workflow and tests/modern-drik-bija-inpop-daily-event-validation.mjs; the output JSON is published as a workflow artifact.

INPOP is a separate planetary theory from the DE441 training reference and Moshier candidate. Coordinate metadata, ephemeris theory identity, geocentric centre, ecliptic plane, apparent-of-date flag and TT timescale are validated before accepting data. Official service documentation: https://ssp.imcce.fr/webservices/miriade/api/ephemcc/ and https://www.imcce.fr/inpop.

This new validation is an independent cross-check, but it still does not replace a review of frame-systematic differences, daily residual distribution, event-specific worst cases, or formal coefficient freezing. A CI failure remains a failure; the threshold is not relaxed.

## Next validation phases before any accuracy certificate or production consideration

1. Freeze the fitted coefficient set as a reviewed, versioned artifact with provenance, exact training epochs and a checksum; CI output alone is not a released coefficient package.
2. Run a daily 1800–2399 comparison (about 1.1 million planet/date points), plus high-density stations, conjunctions, oppositions and apsis windows. Keep the same per-planet 0.05° maximum.
3. Cross-check against an independent source such as IMCCE INPOP or a suitable VSOP theory, not only DE441. DE440 and DE441 share observational input and are not fully independent.
4. Audit the underlying heliocentric 3D vectors, time scale, Earth/Moon centre, light-time, aberration, deflection and ecliptic-of-date transformation.
5. Publish a coefficient derivation note and test a version with a truly heliocentric mean/apsis parameterization before calling the result a full semi-analytical Bīja theory.

## Safety boundary

This PR adds only the research model, a read-only Moshier adapter, an annual reference fixture, tests, documentation and a research-only GitHub Actions workflow. It does not edit production horoscope calculations, classical Bīja, BPHS/Shadbala, Marriage Matching, Calendar, public UI, Service Workers, cache versions, APKs, Render configuration, Cloudflare, Firebase or deployed services. No production integration is proposed.

A later Render auto-deploy authorization for an approved merge does not authorize a manual deployment of any service while this PR remains unmerged.
