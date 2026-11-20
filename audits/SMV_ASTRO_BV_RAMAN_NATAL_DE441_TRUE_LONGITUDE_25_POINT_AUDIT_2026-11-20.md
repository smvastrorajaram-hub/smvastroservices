# SMV ASTRO — Five-Natal DE441 Apparent True-Longitude Cross-Validation

**Date:** 20 November 2026  
**Scope:** Five historical Perambalur birth epochs × five BPHS Cheshta-eligible planets  
**Status:** PASS for the explicitly named modern apparent-ephemeris comparison; NOT a historical Saura true-longitude certificate.

## 1. Independent reference contract

The 25 reference values were retrieved directly from the NASA/JPL Horizons API using a discrete Julian-day list, not interpolated annual data.

- Target ephemeris: JPL DE441, with target IDs Mercury 199, Venus 299, Mars barycentre 4, Jupiter barycentre 5 and Saturn barycentre 6.
- Earth centre: geocentre, target centre `500@399`; the Horizons response identifies DE441 for both target and Earth.
- Quantity 31: observer-centred IAU76/80 ecliptic-of-date apparent longitude and latitude, including light-time, solar gravitational deflection and stellar aberration.
- Time scale: UT input; the five returned timestamps correspond to the supplied India-local birth times converted using UTC+05:30.
- Longitude values: tropical degrees. The runtime's Lahiri sidereal longitude is converted back to tropical by adding the runtime's own returned Lahiri ayanāṃśa before comparison.
- Fixture: `tests/fixtures/bv-raman-natal-de441-apparent-true-2026-11-20.json`.

The fixture preserves every exact epoch and all 25 JPL values. Each planet's response header was checked to ensure the target is DE441; the Saturn target is Saturn-system barycentre 6, not Saturn centre 699 (which resolves to a different Saturn ephemeris).

## 2. Numerical result

The independent local Python Swiss Ephemeris 2.10.03 Moshier binding was compared against the 25 exact JPL values. The regression test repeats the check through the repository's bundled browser-compatible Moshier/WASM runtime and requires each point to be within 0.05°.

| Planet | Samples | RMS absolute residual (degrees) | Maximum absolute residual (degrees) |
|---|---:|---:|---:|
| Mercury | 5 | 0.00001128 | 0.00001457 |
| Venus | 5 | 0.00002093 | 0.00003027 |
| Mars | 5 | 0.00003032 | 0.00005522 |
| Jupiter | 5 | 0.00001803 | 0.00002626 |
| Saturn | 5 | 0.00003722 | 0.00006783 |
| **All planets** | **25** | **0.00002528** | **0.00006783** |

The largest observed Python-binding difference is Saturn at the 1992-07-31 22:05 IST birth epoch: 0.000067825° (about 0.244 arcsecond). This is approximately 737 times smaller than the 0.05° acceptance ceiling. The Node/WASM Actions test is the executable repository release gate; its measured output is reported by the workflow run.

## 3. What this proves

This adds an independent, date-specific modern geocentric apparent True-longitude reference for every one of the five natal epochs and all five eligible planets. It is stronger than comparing the candidate against a second implementation of the same four-pass Saura equations: NASA/JPL DE441 and Swiss Moshier are independent ephemeris solutions.

It can validate the modern apparent True longitude used by the Swiss/Moshier calculation at these historical epochs. It also gives a precise baseline for any subsequent comparison against official yearly Indian ephemeris tables.

## 4. What this does not prove

This is **not** a certification of the historical Saura / Sūrya-Siddhānta four-pass True-longitude model. JPL DE441 is a modern physical ephemeris evaluated at historical dates; it is not a contemporary 1971/1974/1992/1994/2015 printed observation or a source-specific proof of the traditional model.

It also does **not** certify B.V. Raman / BPHS five-graha Cheshta. The BPHS input triplet must remain coherent: Mean Longitude, True Longitude and Sheeghroccheya must belong to one documented model/frame/epoch. Combining the already-validated traditional Saura Mean and Sheeghroccheya with a modern DE441 True position—even after a coordinate-frame conversion—would still mix two distinct astronomical models. This audit deliberately does not calculate or certify Cheshta from such a hybrid.

The earlier PR #14 evidence for Saura Mean and Sheeghroccheya remains valid within its recorded scope and is not repeated here. The remaining research target is a source-supported, internally coherent historical triplet for each natal epoch, including its time-dependent Bīja/Mandocca inputs, followed by the five BPHS Cheshta calculations. Official yearly Indian Ephemeris and Nautical Almanac / Indian Astronomical Ephemeris copies are bibliographically confirmed, but the exact historical table pages are not currently exposed in the public Google Books snippets used in this audit.

## 5. Safety / release boundary

- Research and regression evidence only.
- No production Shadbala, Horoscope, Marriage Matching, customer reports, cache, Service Worker, APK, Firebase, Render, Cloudflare or customer data changed.
- No production activation or deployment.
- `historicalSauraTrueLongitudeCertified=false`, `classicalFiveGrahaCheshtaCertified=false` and `productionIntegrationAllowed=false` remain mandatory.
