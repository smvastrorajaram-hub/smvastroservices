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
- Longitude values: tropical degrees. The primary comparison calls the bundled Swiss Ephemeris directly with SWIEPH | SPEED and no sidereal flag, so candidate and JPL reference are both tropical apparent ecliptic-of-date values. The separate chart sidereal-longitude-plus-displayed-ayanāṃśa reconstruction is a diagnostic only; it is not the primary acceptance series.
- Fixture: `tests/fixtures/bv-raman-natal-de441-apparent-true-2026-11-20.json`.

The fixture preserves every exact epoch and all 25 JPL values. Each planet's response header was checked to ensure the target is DE441; the Saturn target is Saturn-system barycentre 6, not Saturn centre 699 (which resolves to a different Saturn ephemeris).

## 2. Numerical result

The independent local Python Swiss Ephemeris 2.10.03 Moshier binding was compared separately against the 25 exact JPL values. The repository regression also checks the bundled Swiss WASM direct-tropical result with explicit SWIEPH | SPEED flags, asserts that the returned ephemeris flag includes the Swiss data bit, and requires each natal/planet point to be within 0.05°.

**Primary repository SWIEPH direct-tropical result:**

| Planet | Samples | RMS absolute residual (degrees) | Maximum absolute residual (degrees) |
|---|---:|---:|---:|
| Mercury | 5 | 0.000013140 | 0.000013505 |
| Venus | 5 | 0.000013249 | 0.000014180 |
| Mars | 5 | 0.000013429 | 0.000013669 |
| Jupiter | 5 | 0.000013364 | 0.000013650 |
| Saturn | 5 | 0.000013432 | 0.000013769 |
| **All planets** | **25** | **0.000013323** | **0.000014180** |

The independent local Python Moshier result remains a separate cross-check:

| Planet | Samples | RMS absolute residual (degrees) | Maximum absolute residual (degrees) |
|---|---:|---:|---:|
| Mercury | 5 | 0.00001128 | 0.00001457 |
| Venus | 5 | 0.00002093 | 0.00003027 |
| Mars | 5 | 0.00003032 | 0.00005522 |
| Jupiter | 5 | 0.00001803 | 0.00002626 |
| Saturn | 5 | 0.00003722 | 0.00006783 |
| **All planets** | **25** | **0.00002528** | **0.00006783** |

The largest observed Python Moshier-binding difference is Saturn at the 1992-07-31 22:05 IST birth epoch: 0.000067825° (about 0.244 arcsecond). This supplemental Moshier result is approximately 737 times smaller than the 0.05° acceptance ceiling.

**Actual repository CI result:** B.V. Raman Integrated Strength6 QA run [#1195](https://github.com/smvastrorajaram-hub/smvastroservices/actions/runs/44758892194) completed SUCCESS with 251 assertions in the natal True-longitude test. Every direct planetary return flag was also asserted to include the Swiss ephemeris data bit; a Moshier fallback cannot satisfy this gate. The primary direct-tropical SWIEPH comparison across all 25 points has a maximum residual of **0.000014180°** and RMS **0.000013323°** (approximately 0.051 arcsecond maximum). All 25 values are within the predeclared 0.05° gate.

The diagnostic sidereal result (chart.planets[].longitude + chart.ayanamsa) has a larger common offset: maximum **0.005151651°**, RMS **0.003861270°**. This shows that the chart's displayed Lahiri ayanāṃśa is not an exact inverse of the full Swiss sidereal-flag transformation. This round-trip diagnostic is therefore kept separate and is **not** used as the True-longitude acceptance result. No correction constant was fitted or applied.

The same Actions workflow passed the B.V. Raman legacy 695-check regression, printed Standard Horoscope 132-assertion certificate test, Ishta/Kashta 39 assertions, Ayurdaya report 669 assertions and Marriage Matching/report 132 assertions.

## 3. What this proves

This adds an independent, date-specific modern geocentric apparent True-longitude reference for every one of the five natal epochs and all five eligible planets. It is stronger than comparing the candidate against a second implementation of the same four-pass Saura equations: NASA/JPL DE441 and Swiss Moshier are independent ephemeris solutions.

It validates the repository's modern apparent True-longitude calculation at these five historical epochs against an independent DE441 solution. It also gives a precise baseline for subsequent comparison against official yearly Indian ephemeris tables.

## 4. What this does not prove

This is **not** a certification of the historical Saura / Sūrya-Siddhānta four-pass True-longitude model. JPL DE441 is a modern physical ephemeris evaluated at historical dates; it is not a contemporary 1971/1974/1992/1994/2015 printed observation or a source-specific proof of the traditional model.

It also does **not** certify B.V. Raman / BPHS five-graha Cheshta. The BPHS input triplet must remain coherent: Mean Longitude, True Longitude and Sheeghroccheya must belong to one documented model/frame/epoch. Combining the already-validated traditional Saura Mean and Sheeghroccheya with a modern DE441 True position—even after a coordinate-frame conversion—would still mix two distinct astronomical models. This audit deliberately does not calculate or certify Cheshta from such a hybrid.

The earlier PR #14 evidence for Saura Mean and Sheeghroccheya remains valid within its recorded scope and is not repeated here. The remaining research target is a source-supported, internally coherent historical triplet for each natal epoch, including its time-dependent Bīja/Mandocca inputs, followed by the five BPHS Cheshta calculations.

The official IMD IAE page describes Part I as TIME, SUN, MOON and PLANETS, states its reference frame (J2000.5) and time argument (TT), and links the latest annual PDF. It also explicitly provides a historical-data enquiry contact. The yearly sources are bibliographically identifiable: 1971 and 1974 IENA, 1992 and 1994 IAE, and 2015 IAE. However, the specific historical daily table pages are not exposed by the current public download link or Google Books snippets. They must be acquired from the official IMD / Positional Astronomy Centre or the listed holding libraries before they can serve as the historical table oracle. [Official IMD IAE and historical-data enquiry page](https://mausam.imd.gov.in/responsive/indianAstronomicalEphemeris.php).

## 5. Safety / release boundary

- Research and regression evidence only.
- No production Shadbala, Horoscope, Marriage Matching, customer reports, cache, Service Worker, APK, Firebase, Render, Cloudflare or customer data changed.
- No production activation or deployment.
- `historicalSauraTrueLongitudeCertified=false`, `classicalFiveGrahaCheshtaCertified=false` and `productionIntegrationAllowed=false` remain mandatory.
