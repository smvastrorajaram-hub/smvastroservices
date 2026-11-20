# SMV ASTRO — Full Natal Shadbala Numerical Certification Gap Register

**Date:** 20 November 2026  
**Active method:** B.V. Raman `strength6`  
**Objective:** Extend the existing printed-example verification to complete source- and numerically-supported seven-graha natal calculations.

## Current result

- The existing B.V. Raman and C.G. Rajan certificates remain unchanged.
- A new seven-graha Standard Horoscope test checks the six-component sum, Rupa, required-strength ratio, threshold decision and total-based ranking for the B.V. Raman printed worked example.
- The printed worked example can produce a complete total because its five planetary Cheshta input triples are transcribed from that same source example.
- The existing natal calculation path has no independent, date-specific same-frame input oracle for the five non-luminary planets. Its current path combines Saura traditional mean/Sheeghrocchea with a Swiss/Lahiri chart true longitude. Those values do not constitute one verified B.V. Raman Chapter VI input triple.
- This PR is deliberately audit-only: it does not change the production calculation, customer display, report selection, cache versions or app behaviour.

## Mandatory blockers before arbitrary natal totals can be certified

1. **Five-graha Cheshta source triplets:** Obtain date-specific mean, true and Sheeghrocchea longitudes for Mars, Mercury, Jupiter, Venus and Saturn, all in one explicit astronomical reference frame and epoch for each natal chart.
2. **Independent historical true-longitude oracle:** Compare the selected same-frame model to independent historical source data. Agreement between two implementations of the same model is an internal arithmetic cross-check, not independent truth.
3. **Historical Bija and apsis evolution:** Verify date-specific historical corrections and apsis positions. Current research candidates do not establish these for arbitrary 1800–2399 birth dates.
4. **Full component provenance:** Retain source-linked validation for Sthana, Dig, Kala, Naisargika and Drig inputs, including planetary positions, tropical declinations, solar-time inputs and aspect geometry.
5. **Graha Yuddha boundaries:** Independently verify source-specific eligibility, winner/loser and pre-war adjustments at conjunction boundaries. Unresolved wars must withhold affected totals.
6. **Broader epoch coverage:** After the independent oracle inputs exist, run a predeclared multi-epoch and boundary-heavy natal matrix. One Standard Horoscope fixture is not an arbitrary-date certificate.

## Required safety rule for a future, separately approved production correction

For any graha whose required six-Bala component is unavailable, preserve verified partial component evidence but set `complete=false` and withhold `totalVirupa`, `totalRupa`, `ratio` and `isStrong`. Customer-facing reports should show unavailable, not convert a missing total into zero or a false “below minimum” result. This behaviour is not introduced by this audit-only PR; it requires a separately approved production change after compatibility review.

## Release boundaries

- No production merge or deployment is part of this research PR.
- No production source, app Service Worker, cache release or customer-facing report is changed.
- No origin-wide storage/cache clearing and no user-data deletion is introduced.
- Full arbitrary natal `classicalCertified` remains false until all blockers and independent Actions evidence are satisfied.


## New date-specific modern True-longitude evidence — 20 November 2026

The gap register is refined by a new separate audit:
`audits/SMV_ASTRO_BV_RAMAN_NATAL_DE441_TRUE_LONGITUDE_25_POINT_AUDIT_2026-11-20.md`.

- NASA/JPL Horizons DE441 exact-epoch apparent geocentric tropical longitudes were retrieved for the five existing Perambalur natal epochs and all five eligible planets (25 values).
- Target and Earth-centre response headers both identify DE441; centre is Earth geocentre `500@399`; quantity 31 is apparent IAU76/80 ecliptic-of-date longitude.
- The local Swiss Ephemeris 2.10.03 Moshier comparison has a maximum absolute residual of 0.000067825° across these 25 values.
- A new repository regression reruns the comparisons through the bundled Moshier/WASM runtime with the predeclared 0.05° maximum per point.

**Interpretation:** This closes the *modern apparent True-longitude cross-check at the five sampled historical epochs*. It does not establish the historical Saura / Sūrya-Siddhānta true positions. NASA DE441 is a modern physical ephemeris evaluated backwards at historic epochs, not the historical printed almanac source for the old Saura model.

**Cheshta remains withheld:** A modern DE441 True longitude must not be joined to traditional Saura Mean and Sheeghroccheya merely because all three can be represented in Lahiri sidereal degrees. BPHS Cheshta requires a coherent, documented triplet from one model/frame/epoch. The remaining work is to obtain and reconcile the date-specific historical IENA/IAE tables or another source-faithful coherent astronomical triplet, including the time-dependent Bīja/Mandocca inputs, before calculating the five natal Cheshta values as certified.

No production source or customer output is changed. `historicalSauraTrueLongitudeCertified=false`, `classicalFiveGrahaCheshtaCertified=false` and `productionIntegrationAllowed=false` remain mandatory.
