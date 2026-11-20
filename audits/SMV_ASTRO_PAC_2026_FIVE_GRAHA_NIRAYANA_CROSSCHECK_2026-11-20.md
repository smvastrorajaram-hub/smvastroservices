# SMV ASTRO — Official PAC 2026 Full-Year Five-Graha Nirayana Longitude Cross-Check

**Date:** 20 November 2026  
**Scope:** 2026-01-01 through 2026-12-31; Mercury, Venus, Mars, Jupiter and Saturn  
**Status:** **PASS — all 1,825 daily PAC values parsed and compared against the bundled Swiss Ephemeris Lahiri-sidereal calculation within the 0.36 arc-second gate at 00:00 TT.**  
**Qualification:** The project has fixed TT as the only time scale for this comparison, based on the email confirmation reported by the project owner. Lahiri remains an inferred sidereal comparison convention pending its exact PAC definition. This is not a historical Saura or BPHS Cheshta certificate.

## 1. Official reference source

The reference is published by the Positional Astronomy Centre, Kolkata, under the India Meteorological Department, Government of India. The official IMD description states that the Indian Astronomical Ephemeris is an annual PAC publication and that Part I covers TIME, SUN, MOON and PLANETS. It describes the IAE standard reference system epoch as J2000.5 and the argument of its ephemerides as Terrestrial Time (TT).

The full-year regression downloads these five PAC daily Nirayana-longitude PDFs directly during GitHub Actions:

| Planet | Official PAC PDF |
|---|---|
| Mercury | https://packolkata.imd.gov.in/download/nirlon/Mercury.pdf |
| Venus | https://packolkata.imd.gov.in/download/nirlon/Venus.pdf |
| Mars | https://packolkata.imd.gov.in/download/nirlon/Mars.pdf |
| Jupiter | https://packolkata.imd.gov.in/download/nirlon/Jupiter.pdf |
| Saturn | https://packolkata.imd.gov.in/download/nirlon/Saturn.pdf |

They are not the Astrodienst tropical PDFs. The regression extracts selectable PDF text using `pdftotext -layout`, then requires every Gregorian date in 2026 exactly once for every planet: 365 rows per PDF, 1,825 source values total.

### Source integrity manifest

The exact downloaded documents are pinned in `tests/fixtures/pac-2026-official-daily-pdf-manifest.json`. CI asserts both byte length and SHA-256 before parsing:

| Planet | Bytes | SHA-256 |
|---|---:|---|
| Mercury | 68,167 | `52985afbd43e944949ebd863c14810b1e632682bc24a1603c4a8afd66158fd2c` |
| Venus | 67,773 | `ba012448354079180cfefdfa002adbb19191c1645fb78f508e9c7b19bec25c17` |
| Mars | 66,458 | `5878c1275a8b9f5db43d3f5a996612f6446d92da8d8e6ea5f3960c53ad43d93e` |
| Jupiter | 67,337 | `2a64a64539ae2223a1833fac028fe91cf1f3335fa21ad1b116b860caade8480f` |
| Saturn | 67,315 | `15b547d9b8cd20a82b4c645ed6d696c3a858efff6b601828f3a16a406425b2c8` |

A changed PAC PDF will fail the pinned hash check instead of silently changing the oracle.

## 2. Comparison contract and qualifications

The candidate is the repository's bundled Swiss Ephemeris WASM 2.10.03:

- Configure `setSiderealLahiri()`.
- Calculate with explicit `SWIEPH | SPEED | SIDEREAL` flags.
- Assert the returned Swiss Ephemeris data flag; a Moshier fallback cannot pass.
- Convert each daily PAC DMS longitude into decimal degrees.
- Calculate directly at the civil date's **00:00:00 TT Julian Day** and compare normalized sidereal longitudes with a circular signed difference. Do not convert from UTC or pass a UTC-derived Julian Day.

**Time-scale decision:** The project owner reports receiving email confirmation that TT is the correct time scale. The comparison therefore uses **00:00:00 TT** directly for every Gregorian date; UTC is not used. The email itself is not attached to this repository, so this audit records the owner-reported confirmation rather than reproducing the correspondence.

**Ayanamsa metadata limitation:** The daily PDF headings identify Nirayana longitude but do not name the exact ayanamsa definition. **Lahiri** remains the comparison convention supported by the numerical match, while its exact PAC realization (reference epoch/value and mean/true definition) remains to be documented.
- The public PAC PDF metadata does not establish whether the underlying dynamical ephemeris is independent of Swiss Ephemeris.

The TT comparison contract is explicit in the machine-readable test output. Exact PAC ayanamsa provenance and the precise published clock instant still require the referenced email/technical specification to be archived with the research records.

## 3. Full-year numerical result — 00:00 TT

**GitHub Actions run #1214:** https://github.com/smvastrorajaram-hub/smvastroservices/actions/runs/44771494887 — complete workflow SUCCESS using 00:00 TT.

The full-year regression verified:

- Five official PAC PDFs fetched successfully and matched the pinned byte-length/SHA-256 manifest.
- Each planet has all 365 daily rows from 1 January through 31 December 2026, with no missing or duplicate date.
- **1,825 / 1,825** daily PAC values compared against Swiss Ephemeris.
- Each point is within the predeclared **0.36 arc-second** gate.
- The full B.V. Raman integrated QA workflow also completed SUCCESS, including the printed Standard Horoscope certificate, Ishta/Kashta, Ayurdaya-report and Marriage Matching regressions.

**Overall maximum absolute residual:** **0.253273″** (0.000070353631°).  
**Overall RMS residual:** **0.128957″**.  
**Acceptance gate:** **0.36″**.

The largest difference is Jupiter on **2026-01-06**:

- PAC Nirayana: 86° 28′ 23.6972″ (decimal 86.4732492222°).
- Swiss Lahiri sidereal: 86.4731788686°.
- Absolute difference: **0.253273″**.

### Per-planet residuals

| Planet | Samples | RMS residual | Maximum residual | Date of maximum |
|---|---:|---:|---:|---|
| Mercury | 365 | 0.013224″ | 0.032790″ | 2026-11-06 |
| Venus | 365 | 0.011795″ | 0.024843″ | 2026-04-02 |
| Mars | 365 | 0.014714″ | 0.028122″ | 2026-01-21 |
| Jupiter | 365 | 0.202727″ | 0.253273″ | 2026-01-06 |
| Saturn | 365 | 0.203766″ | 0.234244″ | 2026-10-03 |
| **All** | **1,825** | **0.128957″** | **0.253273″** | **2026-01-06 Jupiter** |

### Month-by-month coverage and residuals

Every calendar date is present. Sample count is five planetary values per calendar day.

| Month | Covered days | Samples | Maximum residual | RMS residual |
|---|---:|---:|---:|---:|
| January | 31 | 155 | 0.253273″ | 0.147557″ |
| February | 28 | 140 | 0.246726″ | 0.133873″ |
| March | 31 | 155 | 0.226239″ | 0.125074″ |
| April | 30 | 150 | 0.206660″ | 0.119465″ |
| May | 31 | 155 | 0.195459″ | 0.116271″ |
| June | 30 | 150 | 0.199126″ | 0.116799″ |
| July | 31 | 155 | 0.211725″ | 0.120537″ |
| August | 31 | 155 | 0.227597″ | 0.125278″ |
| September | 30 | 150 | 0.232968″ | 0.129635″ |
| October | 31 | 155 | 0.234244″ | 0.133316″ |
| November | 30 | 150 | 0.228603″ | 0.136104″ |
| December | 31 | 155 | 0.248857″ | 0.139571″ |
| **Total** | **365** | **1,825** | **0.253273″** | **0.128957″** |

## 4. Station, sign-boundary and conjunction stress coverage

All event dates below are **daily brackets / daily minima**, not exact instant-of-event calculations. The PAC daily table has one value per civil day, so a station is bracketed by adjacent daily intervals and a close conjunction is reported at the minimum daily separation found.

### Retrograde station brackets

The daily PAC series identifies **12 direction-change brackets**:

| Planet | Direction-change brackets in 2026 |
|---|---|
| Mercury | Direct → retrograde: 26–27 Feb; retrograde → direct: 21–22 Mar; direct → retrograde: 30 Jun–1 Jul; retrograde → direct: 24–25 Jul; direct → retrograde: 24–25 Oct; retrograde → direct: 14–15 Nov |
| Venus | Direct → retrograde: 3–4 Oct; retrograde → direct: 14–15 Nov |
| Mars | No direction-change bracket detected in the 2026 daily PAC rows |
| Jupiter | Retrograde → direct: 11–12 Mar; direct → retrograde: 13–14 Dec |
| Saturn | Direct → retrograde: 27–28 Jul; retrograde → direct: 11–12 Dec |

These are source-table daily sign changes in longitude increment, not a high-resolution station-time certification.

### Sign / Rasi boundary crossings

The test detects **36 daily sign-boundary crossings**:

| Planet | Crossings |
|---|---:|
| Mercury | 14 |
| Venus | 12 |
| Mars | 8 |
| Jupiter | 2 |
| Saturn | 0 |
| **Total** | **36** |

The parser uses unwrapped circular daily longitude differences to determine each adjacent day's sign-index transition, including wraparound at 360°/0°.

### Close pairwise conjunction windows

The test identifies **13 local daily minima with pairwise angular separation ≤2°**:

| Date (2026) | Planet pair | Minimum daily separation |
|---|---|---:|
| 8 Jan | Venus–Mars | 0.055618° |
| 18 Jan | Mercury–Mars | 0.279151° |
| 29 Jan | Mercury–Venus | 0.211831° |
| 28 Feb | Mercury–Venus | 0.359825° |
| 9 Mar | Venus–Saturn | 0.482027° |
| 15 Mar | Mercury–Mars | 0.466431° |
| 20 Apr | Mercury–Saturn | 0.682517° |
| 20 Apr | Mars–Saturn | 0.033983° |
| 21 Apr | Mercury–Mars | 0.074934° |
| 10 Jun | Venus–Jupiter | 0.161601° |
| 15 Aug | Mercury–Jupiter | 0.794146° |
| 7 Oct | Mercury–Venus | 0.010602° |
| 16 Nov | Mars–Jupiter | 0.097146° |

These are candidate dates for additional high-resolution sampling. They are not claims of exact geocentric minimum separation or physical close approach.

## 5. Three-date hard-coded anchor fixture

The separate hard-coded DMS regression provides an independently reviewed, fixed transcription of 15 entries on 1 January, 1 July and 31 December 2026. It passed 135 assertions at 00:00 TT in run #1207:

https://github.com/smvastrorajaram-hub/smvastroservices/actions/runs/44769611357

This anchor test complements—not replaces—the full-year PDF parser test.

## 6. TT confirmation and time-scale policy

The project keeps **TT only** for the PAC daily comparison. The project owner reports that the received email confirms TT as the appropriate time scale. The test uses the Gregorian date's 00:00:00 TT Julian Day directly and calls `swe.calc(jdTt, ...)`; there is no UTC input, UTC-to-TT conversion, or UT1 adjustment in this PAC comparison. The earlier UTC-only diagnostic runs (#1222–#1225) are superseded and are not used for the present comparison or certificate.

## 7. Interpretation and limits

This is a full-calendar-year comparison against an official Government of India PAC-published five-planet Nirayana-longitude series, using all 365 daily rows for each planet. At 00:00 TT, the measured residuals are sub-arcsecond and all 1,825 samples pass the predeclared 0.36″ gate.

However, this does **not** establish that PAC and Swiss Ephemeris use independent underlying dynamical integrations. The public daily PDFs do not disclose enough computational provenance to prove that.

It also does **not**:

- certify the historical Saura / Sūrya-Siddhānta four-pass True-longitude method;
- establish a coherent Mean / True / Sheeghroccheya triplet from one traditional model, frame and epoch;
- validate historical Bīja or Mandocca/apsis evolution;
- certify the five natal BPHS Cheshta values;
- establish arbitrary-date or 1800–2399 True-longitude certification.

A modern PAC/Swiss Nirayana longitude must not be combined with traditional Saura Mean or Sheeghroccheya values and labelled a classical Cheshta input. Before any BPHS Cheshta certification, the same-model Mean/True/Sheeghroccheya chain and the date-dependent classical inputs must be established from source-backed evidence.

## 8. Next evidence still required

1. Obtain written PAC confirmation of the daily row's exact time argument and named ayanamsa.
2. If an exact-instant station/conjunction certification is required, use a finer-than-daily official source or a separately identified high-resolution oracle; daily brackets alone do not provide exact station times.
3. Verify date-specific classical Mean, True and Sheeghroccheya values as one coherent model/frame/epoch, including Bīja and apsis inputs.
4. Verify Graha Yuddha eligibility/winner/loser boundaries and all other Shadbala component provenance.
5. Only then derive and certify the five BPHS Cheshta calculations.

## 9. Release boundary

- Research/regression only.
- No production calculation, Horoscope renderer, Marriage Matching report, customer output, cache, service worker, APK, Firebase, Render, Cloudflare or customer data is changed.
- PR #561 remains a draft and is not merged or deployed.
- `historicalSauraTrueLongitudeCertified=false`, `classicalFiveGrahaCheshtaCertified=false` and `productionIntegrationAllowed=false` remain mandatory.
