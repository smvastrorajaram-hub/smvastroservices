# SMV ASTRO — Official PAC 2026 Five-Graha Nirayana Longitude Cross-Check

**Date:** 20 November 2026  
**Scope:** 2026 only; Mercury, Venus, Mars, Jupiter and Saturn  
**Status:** PASS for 15 selected official PAC daily-table entries against the bundled Swiss Ephemeris Lahiri-sidereal calculation. This is not a historical Saura or BPHS Cheshta certificate.

## 1. Official reference source

The reference is published by the Positional Astronomy Centre, Kolkata, under the India Meteorological Department, Government of India. The official IMD description states that the Indian Astronomical Ephemeris is an annual PAC publication and that Part I covers TIME, SUN, MOON and PLANETS. It also describes the IAE standard reference system epoch as J2000.5 and the argument of its ephemerides as Terrestrial Time (TT).

The directly accessible PAC daily Nirayana longitude PDFs used here are:

| Planet | Official PAC PDF |
|---|---|
| Mercury | https://packolkata.imd.gov.in/download/nirlon/Mercury.pdf |
| Venus | https://packolkata.imd.gov.in/download/nirlon/Venus.pdf |
| Mars | https://packolkata.imd.gov.in/download/nirlon/Mars.pdf |
| Jupiter | https://packolkata.imd.gov.in/download/nirlon/Jupiter.pdf |
| Saturn | https://packolkata.imd.gov.in/download/nirlon/Saturn.pdf |

These are the official PAC 2026 daily Nirayana-longitude tables, not the Astrodienst tropical PDFs suggested as an alternative. The PDFs include daily entries covering the 2026 calendar year.

## 2. Exact source samples

The fixture retains the original degree/minute/second values from the PAC tables and their decimal-degree reconstruction.

Three dates distributed across the year were selected: 1 January, 1 July and 31 December 2026. This gives 15 independently transcribed source entries: five planets × three dates.

| Date | Planet | PAC Nirayana longitude |
|---|---|---:|
| 2026-01-01 | Mercury | 244° 25′ 42.9394″ |
| 2026-01-01 | Venus | 254° 59′ 01.2244″ |
| 2026-01-01 | Mars | 258° 27′ 56.6724″ |
| 2026-01-01 | Jupiter | 87° 08′ 09.4454″ |
| 2026-01-01 | Saturn | 331° 56′ 43.6184″ |
| 2026-07-01 | Mercury | 91° 57′ 58.8431″ |
| 2026-07-01 | Venus | 115° 57′ 45.3991″ |
| 2026-07-01 | Mars | 37° 19′ 42.3311″ |
| 2026-07-01 | Jupiter | 95° 55′ 55.1041″ |
| 2026-07-01 | Saturn | 349° 57′ 26.0451″ |
| 2026-12-31 | Mercury | 254° 03′ 45.2949″ |
| 2026-12-31 | Venus | 208° 15′ 21.8149″ |
| 2026-12-31 | Mars | 135° 30′ 49.8689″ |
| 2026-12-31 | Jupiter | 122° 15′ 51.6599″ |
| 2026-12-31 | Saturn | 344° 03′ 28.8959″ |

Machine-readable source transcriptions are in `tests/fixtures/pac-2026-five-graha-nirayana.json`.

## 3. Comparison contract and qualifications

The candidate calculation is the repository's bundled Swiss Ephemeris WASM 2.10.03. It is explicitly configured with `setSiderealLahiri()`; calculations use `SWIEPH | SPEED | SIDEREAL`, and the returned flags must include the Swiss data bit. A Moshier fallback cannot pass.

The PAC daily PDF row headers show the civil date and DMS longitude, but do **not** explicitly state the time of day or the named ayanamsa on those pages. The comparison therefore uses:

- Daily epoch: **00:00 TT**, empirically inferred from the numerical match and consistent with the IAE's stated TT argument convention.
- Sidereal zero: **Lahiri**, used as the comparison convention because the official table entries align with it to sub-arcsecond precision; the PDF headers themselves do not name Lahiri.

These two items are explicit assumptions of this regression, not facts transcribed from the PDF. They must remain marked as inferred until PAC confirms the daily table's precise time argument and ayanamsa definition.

The three dates are annual anchor samples, not a full 365-day validation. The complete PAC PDFs are available as the source series; additional samples around retrograde stations, conjunctions and month boundaries should be added before broad annual claims.

## 4. Numerical result

The 15 PAC source values were converted from DMS to decimal degrees and compared against the direct sidereal Swiss Ephemeris WASM result at 00:00 TT.

Acceptance gate: **0.0001° = 0.36 arc-second** per point.

| Planet | Samples | RMS residual | Maximum residual |
|---|---:|---:|---:|
| Mercury | 3 | 0.013032″ | 0.020319″ |
| Venus | 3 | 0.016828″ | 0.028572″ |
| Mars | 3 | 0.021345″ | 0.033404″ |
| Jupiter | 3 | 0.092147″ | 0.125963″ |
| Saturn | 3 | 0.210803″ | 0.235806″ |
| **All** | **15** | **0.103767″** | **0.235806″** |

All 15 observations are within the 0.36″ acceptance gate. The maximum observed residual is Saturn on 1 July 2026: **0.000065502° = 0.235806″**. Overall RMS is **0.000028824° = 0.103767″**.

Automated regression: `tests/pac-2026-five-graha-nirayana-regression.mjs`.

## 5. Interpretation and limits

This is a strong cross-check against an official Government of India PAC-published 2026 sidereal-longitude series. It does not by itself prove that the PAC tables and the Swiss Ephemeris calculation are based on independent underlying dynamical integrations: the public table pages do not disclose sufficient computational provenance to establish that.

It does not certify the historical Saura / Sūrya-Siddhānta four-pass True-longitude method. It also does not provide a coherent BPHS Cheshta input triplet. Mean Longitude, True Longitude and Sheeghroccheya must all belong to one documented model, frame and epoch. A PAC/Swiss sidereal longitude must not be joined to traditional Saura Mean or Sheeghroccheya values and called a certified classical Cheshta input.

Further work still required:
1. Ask PAC to confirm the daily row's exact epoch and named ayanamsa.
2. Expand the 2026 sample over all months and planetary station/conjunction boundaries.
3. Verify date-specific classical Mean, True and Sheeghroccheya as one coherent same-model triplet before calculating BPHS Cheshta.
4. Preserve source-level verification for the other five Shadbala components and Graha Yuddha rules.

## 6. Release boundary

- Research/regression only.
- No production calculation, Horoscope renderer, Marriage Matching report, customer output, cache, service worker, APK, Firebase, Render, Cloudflare or customer data is changed.
- This PR is not merged or deployed.
- `historicalSauraTrueLongitudeCertified=false`, `classicalFiveGrahaCheshtaCertified=false` and `productionIntegrationAllowed=false` remain mandatory.
