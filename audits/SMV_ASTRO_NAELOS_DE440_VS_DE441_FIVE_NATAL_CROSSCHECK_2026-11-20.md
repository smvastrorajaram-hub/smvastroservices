# SMV ASTRO — Naelos DE440 vs NASA/JPL Horizons DE441 Five-Natal Cross-Check

**Date:** 20 November 2026  
**Scope:** Five existing Perambalur natal epochs × Mercury, Venus, Mars, Jupiter and Saturn (25 values).  
**Status:** PASS — modern geocentric apparent tropical longitude cross-check only. This is not a historical Saura true-longitude or BPHS Cheshta certificate.

## 1. Data and implementation provenance

The repository-held tables are in `naelos-ephemeris/`:

- 12 binary tables, spanning the DE440-backed 1550–2649 interval.
- `manifest.json` identifies the source as JPL DE440, original source file `de440.bsp`, source frame as ICRF kilometres / TDB, and the JPL data as a US Government / NASA-JPL public-domain work.
- The manifest records exact TDB start/end Julian Days, byte lengths and SHA-256 digests for all 12 tables.
- CI verifies the byte length and SHA-256 digest of every file against the manifest, then parses all 12 files using the Naelos Ephemeris runtime.
- The test pins `naelos-ephemeris@0.1.3` for the CI-only runtime. Its JavaScript implementation is obtained from npm during the workflow; it is not added to the production application dependencies or customer bundle.

The five epochs select:

| Birth (IST) | UTC | DE440 table |
|---|---|---|
| 1971-05-04 05:05 | 1971-05-03 23:35 | `ne-1900.bin` |
| 1974-01-11 16:04 | 1974-01-11 10:34 | `ne-1900.bin` |
| 1992-07-31 22:05 | 1992-07-31 16:35 | `ne-1900.bin` |
| 1994-06-15 13:03 | 1994-06-15 07:33 | `ne-1900.bin` |
| 2015-09-06 09:30 | 2015-09-06 04:00 | `ne-2000.bin` |

The selected binary sizes and repository Git blob IDs were checked directly. The content-level SHA-256 tests additionally verify the exact bytes against the upstream manifest rather than relying on Git's SHA-1 blob identifier.

## 2. Comparison contract

The reference series is the existing 25-value exact-epoch NASA/JPL Horizons DE441 fixture:

- Earth geocentre: `500@399`.
- Horizons quantity 31: observer-centred apparent longitude/latitude, tropical ecliptic of date, with light-time, solar gravitational light deflection and stellar aberration.
- Planet targets: Mercury 199, Venus 299, Mars system barycentre 4, Jupiter-system barycentre 5 and Saturn-system barycentre 6.
- Epochs are the five exact birth instants, with India-local times converted to UTC+05:30 and their corresponding UT Julian Days.
- Naelos uses the DE440 tables and its own apparent-place implementation through `NaelosEphemeris.calc_ut(jdUt, body, SEFLG_SPEED)`. The returned longitude and longitude speed are both checked for finiteness; the speed flag is checked as retained.

The code checks that `tablesFor(jdUt, jdUt)` chooses the expected century file for every epoch. It then loads the selected table for each date, calculates all five planets and directly compares the tropical apparent longitude with the JPL Horizons DE441 value.

**Predeclared CI acceptance gate:** every point must be within **0.0001° (0.36 arc-second)**. No fitted correction constant or residual adjustment is applied.

## 3. Numerical results

CI run [#1201](https://github.com/smvastrorajaram-hub/smvastroservices/actions/runs/44765126996) completed SUCCESS. The Naelos test completed **208 assertions**, verified all **12** manifest files, parsed all 12 files and compared **25** natal/planet samples.

- Overall maximum absolute residual: **0.000016269° = 0.0585684 arc-second**.
- Overall RMS residual: **0.000012655° = 0.045558 arc-second**.
- Maximum allowed residual: **0.0001° = 0.36 arc-second**.

| Planet | Samples | RMS residual (degrees) | Maximum residual (degrees) | Maximum residual (arc-second) |
|---|---:|---:|---:|---:|
| Mercury | 5 | 0.000012060 | 0.000016269 | 0.0585684 |
| Venus | 5 | 0.000012914 | 0.000015767 | 0.0567612 |
| Mars | 5 | 0.000011979 | 0.000015028 | 0.0541008 |
| Jupiter | 5 | 0.000012725 | 0.000013621 | 0.0490356 |
| Saturn | 5 | 0.000013533 | 0.000014178 | 0.0510408 |
| **All** | **25** | **0.000012655** | **0.000016269** | **0.0585684** |

All 25 points pass the stricter sub-arcsecond gate. The CI step is implemented in `tests/bv-raman-natal-naelos-de440-crosscheck.mjs` and wired into `.github/workflows/bv-raman-strength6-qa.yml`.

## 4. Interpretation and limits

This is a strong cross-check between:

1. JPL DE440-derived Chebyshev table data parsed and evaluated by Naelos Ephemeris; and
2. JPL DE441 apparent positions independently queried from Horizons for the same dates.

The numerical agreement is approximately **0.059 arc-second maximum** across the sampled positions. However, **DE440 and DE441 are both NASA/JPL Development Ephemerides**. Therefore this is a separate JPL ephemeris version plus a separate implementation/data representation, not an independent institutional or observational historical oracle. The tiny residual also should not be generalized beyond these five dates without a broader predeclared sample.

Naelos uses its own apparent-place frame reductions. The DE441 fixture uses Horizons quantity 31 / IAU76/80 ecliptic-of-date conventions, while Naelos documents IAU 2006 precession and IAU 2000B nutation. The measured residual includes the differences between those conventions as well as the DE440/DE441 solutions and time conversion. No attempt is made to force the two implementations to have identical internal conventions.

This evidence validates **modern apparent geocentric tropical longitude at these five historical epochs**. It does not:

- certify the historical Saura / Sūrya-Siddhānta four-pass True-longitude method;
- establish historical Mean / True / Sheeghroccheya triplets from one coherent traditional model;
- certify the five natal BPHS Cheshta values;
- validate time-dependent historical Bīja or Mandocca values;
- establish an arbitrary-date 1800–2399 certification.

The DE440 apparent longitude and longitude speed must not be spliced into historical Saura Mean / Sheeghroccheya inputs to claim a classical Cheshta result. A same-model, source-backed historical triplet and separate BPHS rule verification remain necessary.

## 5. Production and release boundary

- The new runtime is downloaded only for CI; it is not a production runtime dependency.
- The 12 binary assets and manifest are data-only repository files; no Horoscope or Marriage Matching calculation imports them.
- No production calculation source, rendering, reports, cache/service worker, APK, Firebase, Render, Cloudflare or customer data is changed by this test.
- PR #561 remains a draft and is not merged or deployed by this audit.
- `historicalSauraTrueLongitudeCertified=false`, `classicalFiveGrahaCheshtaCertified=false` and `productionIntegrationAllowed=false` remain mandatory.
