# SMV ASTRO — Official PAC 2026 Full-Year Five-Graha Nirayana Longitude Cross-Check

**Date:** 20 November 2026  
**Scope:** 2026-01-01 through 2026-12-31; Mercury, Venus, Mars, Jupiter and Saturn  
**Status:** **UTC COMPARISON COMPLETED — all 1,825 daily rows parsed and calculated; the fixed 00:00:00 UTC comparison exceeds the retained 0.36″ numerical gate, so no sub-arcsecond PAC/Swiss certificate is issued.**  
**Qualification:** The fixed epoch is the project comparison convention requested for this audit, not yet a PAC-confirmed statement. Lahiri remains an inferred sidereal comparison convention. This is not a historical Saura or BPHS Cheshta certificate.

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
- Calculate at the civil date's 00:00:00 UTC instant, converted to TT through Swiss Ephemeris `utcToJd()` before `swe.calc` and compare normalized sidereal longitudes with a circular signed difference.

**Important metadata limitation:** The daily PAC PDF row headers identify the date and Nirayana longitude, but do **not** explicitly identify the row's time of day or name the ayanamsa. Therefore:

- **00:00:00 UTC** is the fixed project comparison epoch; it is not claimed as PAC-confirmed metadata. Swiss `utcToJd()` converts it to the TT/ET Julian Day required by `swe.calc`.
- **Lahiri** remains an empirically inferred sidereal convention used for comparison, not a confirmed PAC source label.
- The public PAC PDF metadata does not establish whether the underlying dynamical ephemeris is independent of Swiss Ephemeris.

These assumptions are deliberately exposed in the machine-readable test output. They are not claimed as text copied from the PAC PDF. PAC confirmation of the row epoch and named ayanamsa remains desirable.

## 3. Historical numerical result under the retired 00:00 TT convention — superseded

**Historical run #1214 (superseded epoch):** https://github.com/smvastrorajaram-hub/smvastroservices/actions/runs/44771494887 completed SUCCESS for the earlier 00:00 TT comparison. It does **not** validate the corrected 00:00 UTC convention and must not be cited as the UTC result. A new Actions run is required.

The earlier full-year run #1214 used the retired 00:00 TT input assumption. Its data extraction and monthly/event analysis remain useful for the PAC source rows, but its residual figures are **not** the result for the now-fixed 00:00:00 UTC comparison epoch. The old regression verified:

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

The separate hard-coded DMS regression remains in place to provide an independently reviewed, fixed transcription of 15 entries on 1 January, 1 July and 31 December 2026. It passed 135 assertions in run #1207 under the now-retired 00:00 TT convention; that run is not evidence for the revised UTC epoch:

https://github.com/smvastrorajaram-hub/smvastroservices/actions/runs/44769611357

This anchor test complements—not replaces—the full-year PDF parser test.

## 6. UTC epoch revalidation — current result

**GitHub Actions run #1225:** https://github.com/smvastrorajaram-hub/smvastroservices/actions/runs/44777225071 — workflow SUCCESS. The script reports comparison completion separately from the numerical gate.

The project comparison convention is fixed at **00:00:00 UTC** on each Gregorian date. The test calls Swiss Ephemeris `utcToJd(year, month, day, 0, 0, 0)`, verifies the returned UT1 JD is within one second of the nominal UTC JD (DUT1 allowance), and passes the returned ET/TT JD to `swe.calc`. This avoids treating a UTC JD as TT.

- Five official PAC PDFs: byte-length and SHA-256 checks PASS.
- Daily coverage: 365 rows per planet, no missing/duplicate dates.
- Calculations completed: **1,825 / 1,825**.
- Retained numerical acceptance limit: **0.36 arcsecond**.
- Actual UTC result: **gate FAIL**; maximum residual **6.312165″**, RMS **2.363192″**.
- The old 0.253273″ maximum was obtained at the retired 00:00 TT comparison epoch and is not the UTC result.

### Per-planet UTC residuals

| Planet | Samples | RMS residual | Maximum residual | Date of maximum |
|---|---:|---:|---:|---|
| Mercury | 365 | 3.933609″ | 6.312165″ | 2026-05-16 |
| Venus | 365 | 2.922025″ | 3.615318″ | 2026-01-03 |
| Mars | 365 | 1.927562″ | 2.256814″ | 2026-04-15 |
| Jupiter | 365 | 0.366088″ | 0.642222″ | 2026-01-10 |
| Saturn | 365 | 0.249695″ | 0.460897″ | 2026-10-03 |
| **All** | **1,825** | **2.363192″** | **6.312165″** | **Mercury, 2026-05-16** |

### Month-by-month UTC residuals

| Month | Samples | Maximum residual | RMS residual |
|---|---:|---:|---:|
| January | 155 | 3.809195″ | 1.474116″ |
| February | 140 | 4.124695″ | 1.512798″ |
| March | 155 | 4.581862″ | 2.283089″ |
| April | 150 | 5.050759″ | 2.841840″ |
| May | 155 | 5.094725″ | 2.587214″ |
| June | 150 | 3.603544″ | 2.079502″ |
| July | 155 | 5.306221″ | 2.622780″ |
| August | 155 | 6.312165″ | 3.215576″ |
| September | 150 | 4.971963″ | 2.247705″ |
| October | 155 | 3.272123″ | 1.786398″ |
| November | 150 | 5.796975″ | 2.696935″ |
| December | 155 | 5.430934″ | 2.352915″ |

### Three-date UTC anchor diagnostic

The 15-value anchor fixture now uses 00:00:00 UTC. Its maximum residual is **4.581862″** and RMS is **2.341320″**. Per-planet maxima are Mercury 4.581862″, Venus 3.611182″, Mars 2.189224″, Jupiter 0.626896″ and Saturn 0.093944″. The anchor diagnostic completes all 15 values but does not pass the 0.36″ numerical gate.

### Daily event coverage

The PAC daily source series still yields 12 station brackets, 36 sign-boundary transitions and 13 pairwise close-conjunction daily minima. These are derived directly from PAC's daily rows and remain date brackets / daily minima, not exact event instants.

### Scientific interpretation

The UTC convention is now implemented, but the PAC/Swiss Lahiri difference is materially larger than the old TT comparison. The first anchor, Mercury on 2026-01-01, differs by **4.392535″**. This pattern is consistent with a time-epoch effect but does not, by itself, prove PAC's actual row epoch. The daily PDFs still do not state the row time. The old TT agreement must not be used to override the requested UTC convention, and the UTC mismatch must not be hidden by widening the tolerance.

**Conclusion:** 00:00:00 UTC is fixed as the project's working comparison epoch. PAC's true published row epoch and exact ayanamsa remain unconfirmed. The UTC numerical gate is not passed; no sub-arcsecond accuracy certificate is granted.

## 7. Interpretation and limits

This is a full-calendar-year comparison against an official Government of India PAC-published five-planet Nirayana-longitude series, using all 365 daily rows for each planet. Under the retired 00:00 TT assumption, the measured residuals were sub-arcsecond. This numerical result is superseded and must not be attributed to the 00:00 UTC comparison.

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
