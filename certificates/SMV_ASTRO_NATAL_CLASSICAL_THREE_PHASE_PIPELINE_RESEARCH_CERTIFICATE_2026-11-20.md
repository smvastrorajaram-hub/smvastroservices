# SMV ASTRO — Three-Phase Classical Natal Certification Pipeline

**Date:** 2026-11-20  
**Scope:** Research-only; B.V. Raman sixfold Shadbala; civil birth years 1800–2399  
**Status:** Pipeline implemented; historical certification remains **NOT CERTIFIED**  
**Production flag:** Keep `classicalCertified:false` for arbitrary natal charts.

## Phase 1 — Historical Mean / True / Sheeghroccheya chain

The 600-chart annual random runner generates exactly one full natal chart per civil year, 1800 through 2399. Each chart receives a seeded-random valid Gregorian date, local birth time and one randomly selected Indian city from a fixed 50-place coordinate pool. The city's historical `Asia/Kolkata` IANA UTC offset is calculated for that exact birth instant before invoking the offline natal engine.

- Required coverage: 600 complete random natal charts, one from each year.
- Expected output: 4,200 graha rows, 25,200 six-Bala component values and 3,000 five-planet Saura candidate rows.
- Each chart's exact random DOB/time/place, coordinates, historical UTC offset and Julian day are written to the Actions artifact.
- Every Saura candidate must return finite Mean Longitude, True Longitude, Sheeghroccheya and Mandocca in the declared `traditional-Saura-nirayana` frame.
- The seeded-random sample is reproducible and uses the same 50-place Indian city pool; it is not a claim that all dates/places between samples have been independently validated. Saura outputs remain research-only and `productionEligible:false`.

### Independent source anchor

Ebenezer Burgess, *Translation of the Sûrya-Siddhânta* (1860), includes a table titled “Mean Longitudes of the Planets, Jan. 1st, 1860, midnight at Washington,” with separate text, Bīja-corrected and “moderns” columns. It is a primary historical numeric anchor for a source-reconciliation test; it has **not** yet been reconciled with this repository's epoch, meridian, frame and time conventions.

- Original digitized source: https://commons.wikimedia.org/wiki/File:Translation_Of_The_Surya-siddhanta_(IA_in.ernet.dli.2015.96668).pdf
- Searchable PDF: https://upload.wikimedia.org/wikipedia/commons/2/2b/Translation_of_the_S%C3%BBrya-Siddh%C3%A2nta%2C_A_Text-Book_of_Hindu_Astronomy%3B_With_Notes%2C_and_an_Appendix_%28IA_jstor-592174%29.pdf

The India Meteorological Department describes the *Indian Astronomical Ephemeris* as an annual Positional Astronomy Centre publication and states that its modern ephemeris argument is Terrestrial Time. These modern editions can provide independent numerical cross-checks for their actual coverage, but do not by themselves establish historical Saura arithmetic for every year.

- IMD publication page: https://mausam.imd.gov.in/imd_latest/contents/indian_astronomical_ephemeris.php

The annual grid is not a substitute for a chart's exact birth instant. The final gate therefore also requires a per-chart exact natal-epoch record with all five planetary inputs, one verified frame, the applied validated-model certificate ID and no unverified fallback/interpolation.

The current phase deliberately does **not** claim:
1. that the Burgess 1860 anchor is reconciled;
2. that an independent historical True Longitude oracle exists for all 3,000 five-planet candidate rows from the 600 sampled natal epochs;
3. that high-resolution station, retrograde, sign-boundary, conjunction and Yuddha-threshold event windows have passed.

## Phase 2 — Six Bala evidence ledger

The gate requires one evidence row for every one of the seven grahas and every one of the six B.V. Raman components: **42 unique rows**.

Each row must include:
- source ID and exact source locator (edition/page/paragraph or stable primary-source URL);
- algorithm ID;
- independent reference ID;
- sample count;
- maximum absolute residual and explicit tolerance;
- all required sub-rule evidence IDs;
- explicit formula-check PASS and reference-frame verification.

Required sub-rule evidence IDs:

| Bala | Required evidence |
|---|---|
| Sthana | Uchcha, Saptavargaja, Ojhayugma, Kendradi, Drekkana |
| Dig | Directional arc, Ascendant reference, Midheaven reference |
| Kala | Natonnata, Paksha, Tribhaga, Abda, Masa, Dina, Hora, Ayana, pre-Yuddha adjustment |
| Cheshta | Mean, True, Sheeghroccheya, same-frame provenance, planet-specific rule |
| Naisargika | Printed constant, graha order, units and rounding rule |
| Drik | Aspect matrix, angular strength, Drishti Pinda, signed-total recomposition |

The current B.V. Raman Standard Horoscope fixture is an arithmetic/source-example validation only. It does not populate 42 independent arbitrary-date natal evidence rows. The test's synthetic PASS fixture verifies gate mechanics only; it is explicitly **not a source certificate**.

Sun and Moon's B.V. Raman sixfold motional Cheshta remains zero. The separate Chapter X Chesta-for-Phala rule is not accepted as a substitute for the sixfold Shadbala component.

## Phase 3 — Final natal chart gate

A chart can receive `classicalCertified:true` only when all conditions are met together:

1. Birth year is inside 1800–2399.
2. All five planets have verified Mean/True/Sheeghroccheya/Mandocca inputs in one coherent frame, with independent historical references, 600 random natal-epoch rows per planet, and event-window tests PASS.
3. All 42 six-Bala evidence rows pass their own source, sample, residual, tolerance and sub-rule checks.
4. All ten possible eligible five-planet Yuddha pairs are evaluated; the source winner/loser rule and disc diameters are verified; no pair is unresolved; final Kala and six-Bala totals are recomposed.
5. Node/Browser parity passes for all seven grahas and all six components.
6. The specific chart's exact birth instant has its own evaluated five-planet Mean/True/Sheeghroccheya input record, same-frame provenance, Julian day, and a validated-model certificate; no unverified interpolation is accepted for that epoch.
7. No fallback, guessed or uncertified substitute input is used.

Any missing or failing item returns `classicalCertified:false` and `provisional:true`.

## Code and test artifacts

- `research/natal-classical-certification/annual-random-natal-charts.mjs` — 600 seeded-random complete natal charts, their six-Bala audits and 3,000 five-planet longitude candidate rows.
- `research/natal-classical-certification/evidence-gates.mjs` — fail-closed 42-row Bala matrix, exact natal-epoch proof, and final natal-chart gate.
- `tests/natal-classical-certification-pipeline.mjs` — negative tests and explicitly synthetic gate-mechanics fixture.

## Current certification decision

**NOT CERTIFIED.** The pipeline is now specified and executable, but 600 random natal calculations are a coverage regression, not proof of historical truth or accuracy for every arbitrary birth instant. The Burgess 1860 anchor still needs exact frame/time conversion and reconciliation, independent historical True Longitude anchors need to be acquired and compared, event-window tests are pending, and the complete 42-row source evidence matrix does not yet exist for arbitrary natal charts.

No production calculations, default chart inputs, website/PWA/Android cache versions, APKs, Firebase, Render, Cloudflare, horoscope/calendar UI, marriage matching, or production services are changed by this research-only work.
