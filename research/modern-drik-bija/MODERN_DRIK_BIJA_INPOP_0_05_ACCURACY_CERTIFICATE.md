# SMV ASTRO — Modern Dṛk-Bīja 0.05° Accuracy Evidence Certificate

**Certificate ID:** SMV-RESEARCH-MODERN-DRIK-INPOP-005-2026-11-20  
**Issued:** 2026-11-20  
**Status:** PASS — repository-internal, reproducible numerical evidence  
**Certified gate:** `MODERN_DRIK_BIJA_MONTHLY_AND_EVENT_INPOP_0_05`  
**Model:** `MODERN_DRIK_BIJA_TRUE`, research prototype v0.1.0

> This is an internal numerical-evidence certificate tied to the recorded code, training split, reference contract, test suite and GitHub Actions run. It is not an external accreditation or a production-accuracy certificate.

## 1. Certified claim

The research-only Modern Dṛk-Bīja v0.1 corrected apparent longitude meets the predeclared maximum absolute wrapped-longitude residual limit of **0.05° per planet** on both:
- the first day of every month from January 1800 through December 2399, compared with IMCCE Miriade **INPOP19**; and
- the dense INPOP event-window samples around candidate stations, planet–Sun conjunctions/oppositions and mutual planetary conjunctions detected by the separate 12-hour Moshier event locator.

The coefficients were fitted only on the central 1900–2299 annual JPL DE441 training interval. No monthly INPOP or event-window reference value was used for coefficient fitting or retuning.

- Monthly samples: 7,200 per planet × 5 = **36,000**.
- Dense event-window samples: **245,925** total.
- Total independent INPOP comparisons: **281,925**.
- Acceptance rule: each planet's monthly maximum and event-window maximum must independently be ≤ **0.05°**.
- Worst corrected residual across both test sets: **0.002457605°**.
- Threshold-to-observed ratio: approximately **20.34×**.
- Remaining margin to the 0.05° limit: **0.047542395°**.

## 2. Corrected-model results against INPOP19

| Planet | Monthly samples | Monthly max absolute residual | Event samples | Event-window max absolute residual | Gate |
|---|---:|---:|---:|---:|---|
| Mercury | 7,200 | 0.002052212° | 103,689 | 0.002152138° | PASS |
| Venus | 7,200 | 0.002284422° | 42,336 | **0.002457605°** | PASS |
| Mars | 7,200 | 0.001207866° | 28,161 | 0.001586345° | PASS |
| Jupiter | 7,200 | 0.000931195° | 35,190 | 0.000847244° | PASS |
| Saturn | 7,200 | 0.000316032° | 36,549 | 0.001039242° | PASS |
| **Total / global** | **36,000** | **0.002284422° global monthly max** | **245,925** | **0.002457605° global event max** | **PASS** |

The test asserts the monthly and event-window limits separately for every planet. The global maximum is the Venus event-window value, 0.002457605°.

## 3. Model, training split and independent reference

**Candidate**
- Bundled Swiss Ephemeris 2.10.03, explicitly invoked with the Moshier kernel (`MOSEPH=4`).
- Earth-geocentric apparent tropical longitude in the ecliptic of date.
- Per-planet first-order secular residual correction:
  `r(y) = c0 + c1 × ((y − 2100) / 100)`.
- Corrected output is the normalized Moshier longitude minus the fitted residual.
- The model is an empirical Dṛk-calibrated hybrid; it is not the historical Sūrya-Siddhānta Bīja parameterization.

**Coefficient fitting and DE441 blind validation**
- Training interval: 1900–2299, 400 annual epochs per planet.
- Blind time-block holdouts: 1800–1899 and 2300–2399, 200 annual epochs per planet.
- Annual DE441 validation: 600 epochs × 5 planets = 3,000 comparisons.
- No holdout row enters coefficient fitting.

**Independent INPOP19 comparison**
- Reference provider: IMCCE Miriade ephemcc, reported theory identity INPOP19.
- Timescale: TT.
- Observer: geocentre.
- Coordinates: apparent ecliptic-of-date; longitude derived from the returned apparent rectangular position fields.
- Monthly epochs: first day of each month, 1800-01 through 2399-12.
- Explicit ascending epoch-list POST batches do not exceed the documented 1,000-epoch service limit.
- The test guards the INPOP theory identity, returned epoch identity/order, TT timescale, geocentric centre, apparent-coordinate mode and ecliptic plane.

## 4. Dense event-window sampling

A separate 12-hour Moshier-only scan locates candidate:
- planetary station reversals;
- planet–Sun longitude conjunctions and oppositions; and
- mutual longitude conjunctions among Mercury, Venus, Mars, Jupiter and Saturn.

The candidate locator is not an INPOP comparison grid and is not used to fit coefficients. Around each located event, INPOP19 is queried at nine epochs, from −24 hours to +24 hours in 6-hour increments. Duplicate timestamps for the same planet are evaluated once.

The event sample counts in Section 2 describe the actual unique per-planet INPOP reference epochs used by the passing test. They are not a claim that the 12-hour locator is a mathematically exhaustive catalogue of every continuous-time event.

## 5. Reproducible repository evidence

- Model: [`modern-drik-bija-model.mjs`](./modern-drik-bija-model.mjs)
- Explicit Moshier adapter: [`moshier-apparent-reference.mjs`](./moshier-apparent-reference.mjs)
- INPOP adapter: [`miriade-inpop-reference.mjs`](./miriade-inpop-reference.mjs)
- Annual DE441 / blind-holdout regression: [`modern-drik-bija-true-regression.mjs`](../../tests/modern-drik-bija-true-regression.mjs)
- Monthly and event-window regression: [`modern-drik-bija-inpop-monthly-event-validation.mjs`](../../tests/modern-drik-bija-inpop-monthly-event-validation.mjs)
- Protocol: [`INPOP_MONTHLY_EVENT_VALIDATION_PROTOCOL.md`](./INPOP_MONTHLY_EVENT_VALIDATION_PROTOCOL.md)
- Full workflow run: [#44606465328](https://github.com/smvastrorajaram-hub/smvastroservices/actions/runs/44606465328) — SUCCESS.
- Job: [#135851363567](https://github.com/smvastrorajaram-hub/smvastroservices/actions/runs/44606465328/job/135851363567) — SUCCESS; all syntax, annual DE441 blind-holdout, monthly INPOP, dense-event INPOP and report-upload steps completed.
- Machine-readable report artifact: `MODERN-DRIK-BIJA-INPOP-MONTHLY-EVENT-VALIDATION`, artifact ID `14574515279`, SHA-256 `792a24059fe0f06949a35162edd3443a918f02b2e1e1c1d609634f73442329b1`.

The workflow report records `pass: true`, `productionEligible: false`, `classicalBijaEquivalent: false`, and `dailyGridUsed: false`.

## 6. Raw-kernel comparison and interpretation

Raw Moshier is also compared and reported separately. The secular correction is not claimed to improve every planet relative to raw Moshier: for Mercury, Venus, Mars and Saturn, the corrected maximum residual is higher than the raw-kernel maximum in these INPOP samples; Jupiter's is slightly lower. The certified claim is strictly that the **corrected v0.1 output meets the declared 0.05° ceiling** on the specified monthly and event-window reference sets. It is not a claim that this correction universally improves Moshier.

## 7. Explicit exclusions — not certified by this document

This certificate does **not** certify:
- the historical `CLASSICAL_BIJA_TRUE` model against DE441 or INPOP at 0.05°; its separate DE441 strict gate remains **FAIL**;
- the historical Sūrya-Siddhānta Bīja mean motion, Mandocca, Manda or Śīghra parameters as a modern ephemeris;
- a complete heliocentric perturbation theory or a physically unique interpretation of the fitted residual coefficients;
- every daily instant, arbitrary epoch, continuous-time interval or event not captured by the candidate locator and sampled windows;
- external accreditation or observatory certification;
- production Horoscope calculations, BPHS Shadbala, Marriage Matching, Calendar, APKs, deployed services or customer-facing astronomical output.

The requested validation cadence is monthly, supplemented by the documented dense event-window samples; no daily INPOP reference grid was used. The Modern Dṛk-Bīja prototype and historical Classical Bīja engine remain separate named models.

## 8. Integrity and change boundary

This certificate is bound to the source at the PR #552 head used by run #44606465328, its checked-in annual DE441 fixture, fixed 1900–2299 training interval, regression tests, INPOP19 response checks and the recorded Actions output. It is a reproducible repository evidence statement, not third-party endorsement.

All files in PR #552 are research-only. No production Horoscope, Swiss/Lahiri provider, BPHS Shadbala, Marriage Matching, Calendar, public UI, cache version, APK, Render configuration, Cloudflare Worker, Firebase project or deployed calculation path is changed by this certificate.
