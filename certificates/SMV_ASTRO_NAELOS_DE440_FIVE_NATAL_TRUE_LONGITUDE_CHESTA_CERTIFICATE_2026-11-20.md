# SMV ASTRO — NAELOS DE440 Five-Natal True Longitude / B.V. Raman Chesta Input Certificate

**Certificate ID:** SMV-ASTRO-NAELOS-DE440-TRUE-LONGITUDE-25-2026-11-20  
**Issued:** 20 November 2026  
**Status:** **PASS — limited-scope, repository-internal numerical evidence**  
**Scope:** Five named Perambalur natal epochs × Mercury, Venus, Mars, Jupiter and Saturn (25 true-longitude / Chesta input rows).

> This is a reproducible internal numerical certificate for the stated input set. It is not external accreditation, and it does not certify every historical epoch, the classical Surya Siddhanta four-pass true-longitude model, or a complete natal Shadbala total.

## 1. Certified claim

The checked-in NAELOS Ephemeris 0.1.3 reader, using the repository's SHA-256-pinned JPL DE440 binary tables, provides apparent geocentric tropical true longitudes for all 25 specified natal planet/epoch pairs.

The NAELOS tropical apparent longitudes were independently cross-checked against the SMV local Swiss Ephemeris tropical apparent calculation at the **same ET/TT instant**. All 25 comparisons passed the predeclared maximum absolute residual limit of 5 arcseconds:

- Comparisons: **25 / 25**
- Maximum absolute residual: **0.0037490153317776276 arcsec**
- RMS residual: **0.0014701123292962758 arcsec**
- Acceptance limit: **5 arcsec**
- Gate: **PASS**

The independently checked true longitude was then transferred to the same declared Saura-nirayana frame as the already-audited Saura-paksha Mean Longitude and Sheeghrocca inputs, using the existing Burgess-1860 / Lahiri-precession transfer function. The BPHS Chesta formula was evaluated from those three same-frame longitudes. All 25 resulting Virupa values were finite and within 0–60.

## 2. Source and file integrity

**True-position source**
- Reader: NAELOS Ephemeris 0.1.3.
- Independent ephemeris: NASA/JPL DE440.
- Output: apparent geocentric tropical longitude on the true ecliptic of date.
- Reader call: `NaelosEphemeris.calc(jdTT, body, 0)`.
- The binary reader is the upstream NAELOS format-2 parser; the project did not reinterpret the binary format by hand.

**Checked binary tables**

| File | Bytes | SHA-256 |
|---|---:|---|
| `ne-1900.bin` | 639,683 | `9c1e589c9e801e3cdb9cd1d92da412e31a850457` |
| `ne-2000.bin` | 640,679 | `155f0f715ffad632d853e875f180ad3ac5e2a3731125b1e98c433412a7a15603` |

Both lengths and SHA-256 values are checked against `naelos-ephemeris/manifest.json` before calculating any positions.

## 3. Time and coordinate-frame contract

Birth times are recorded in India Standard Time (UTC+05:30). The test converts the local birth time to UTC, uses Swiss `utcToJd()` to obtain UT1 and ET, bounds the small UTC–UT1 difference separately, and supplies the same returned ET/TT Julian Day to both NAELOS `calc()` and Swiss `calc()`.

No Swiss `calc()` call is made with a UT Julian Day. The two ephemeris calculations therefore represent the same dynamical instant.

The 5-arcsecond numerical gate compares **tropical apparent** longitude to tropical apparent longitude. A separate diagnostic compares the manually subtracted Lahiri value with Swiss's sidereal reduction. That separate diagnostic has a maximum difference of 18.594118647024516 arcseconds and RMS 13.942573156719872 arcseconds. It is intentionally disclosed and is **not** treated as a failed tropical True Longitude source comparison or hidden inside the accepted residual.

For Chesta inputs, the true tropical longitude is transferred into the declared Saura sidereal frame using the repository's existing:

`sauraSiderealOffsetFromLahiri(lahiriAyanamsaAtDate, lahiriAyanamsaAt1860)`

That function carries the Burgess 1860 Saura zero point by the date-specific Lahiri precession delta. This is the already-audited frame-transfer convention used by `tests/saura-bija-three-phase-validation.mjs`. The existing Saura Mean Longitude and Sheeghrocca selector is retained unchanged; they are not silently replaced by Swiss heliocentric osculating elements.

## 4. Numerical source comparison

| Graha | Samples | RMS tropical residual | Maximum tropical residual | Gate |
|---|---:|---:|---:|---|
| Mercury | 5 | 0.0010845004″ | 0.0020373296″ | PASS |
| Venus | 5 | 0.0022005711″ | 0.0037490153″ | PASS |
| Mars | 5 | 0.0004300224″ | 0.0006554415″ | PASS |
| Jupiter | 5 | 0.0008907991″ | 0.0013286540″ | PASS |
| Saturn | 5 | 0.0019516800″ | 0.0036348156″ | PASS |
| **Total** | **25** | **0.0014701123″** | **0.0037490153″** | **PASS** |

The per-row signed tropical and sidereal-reduction diagnostics are emitted by `tests/naelos-de440-five-natal-true-longitude.mjs` in the Actions log.

## 5. B.V. Raman Chapter VI Chesta values

The same five-planet selector and Chesta arithmetic are used:

- Mars, Jupiter and Saturn: own mean longitude; mean Sun as Sheeghrocca.
- Mercury and Venus: mean Sun as the mean input; own Sighrocca orbit as Sheeghrocca.
- Chesta Kendra: shortest angular separation between Sheeghrocca and the circular midpoint of Mean and True longitude.
- Virupa: reduced Chesta Kendra divided by 3.

The values below are generated from the three same-frame inputs, not from a speed bucket.

| Birth date (IST) | Mercury | Venus | Mars | Jupiter | Saturn |
|---|---:|---:|---:|---:|---:|
| 1971-05-04 05:05 | 46.800333 | 17.472220 | 38.498246 | 50.934589 | 4.917812 |
| 1974-01-11 16:04 | 8.369297 | 56.609245 | 40.380104 | 11.711155 | 53.215754 |
| 1992-07-31 22:05 | 54.560715 | 10.396234 | 29.627361 | 14.008146 | 57.640666 |
| 1994-06-15 13:03 | 51.390966 | 26.842197 | 17.309939 | 47.229804 | 33.976340 |
| 2015-09-06 09:30 | 38.273935 | 48.642478 | 12.081236 | 2.460069 | 24.922094 |

The full-precision longitude triplets and Virupa results are pinned in:

- `tests/fixtures/naelos-de440-five-natal-chesta.json`

The regression asserts the computed True, Mean and Sheeghrocca inputs and Chesta values against that fixture. It also passes the same input set through both Node and Browser B.V. Raman helpers and verifies their parity.

## 6. Certification flags and scope boundary

For the explicit evidence-backed input path `calculateBVRamanChestaFromInputs()`, Node and Browser return:

- `trueLongitudeHistoricalCertified: true`
- `numericallyCertified: true`
- Method: `BV_RAMAN_CHAPTER_VI_NAELOS_DE440_TRUE_LONGITUDE`
- Attached evidence identity: this certificate ID, NAELOS 0.1.3 / JPL DE440, 25 checked rows and the measured tropical residuals.

The generic fallback path, where this independent evidence object is not supplied, remains **false** for both flags. The two flags are not promoted globally for arbitrary dates or untested inputs.

This certificate does **not** change or certify the separate research-only historical Surya Siddhanta four-pass implementation (`sauraFourPassTrueLongitude` / tabular Jya route). Its independent historical-model accuracy gates remain separate.

It also does **not** certify the full B.V. Raman Shadbala:
- `classicalCertified` remains **false**.
- Drig, Yuddha, Kala, Sthana, Dig, Naisargika and the complete natal total retain their existing independent evidence requirements.
- No production chart is made to consume this research-only explicit input unless a later, separately reviewed integration is approved.

## 7. Reproducible evidence

- Binary manifest: `naelos-ephemeris/manifest.json`
- Binary reader/Chesta test: `tests/naelos-de440-five-natal-true-longitude.mjs`
- Pinned output: `tests/fixtures/naelos-de440-five-natal-chesta.json`
- Existing frame-transfer regression: `tests/saura-bija-three-phase-validation.mjs`
- Existing Node/BVR regression: `tests/bv-raman-strength6-regression.mjs`
- Existing Ishta/Kashta regression: `tests/bv-raman-ishta-kashta-regression.mjs`
- Workflow: `.github/workflows/naelos-binary-forensics.yml`
- Green integrated Actions run: [#44785227278](https://github.com/smvastrorajaram-hub/smvastroservices/actions/runs/44785227278) — SUCCESS.
- That run validated the 25 NAELOS-vs-Swiss tropical comparisons and the earlier Chesta candidate calculation. The final integrated workflow additionally reruns the Node/Browser certified helper checks and the pinned 25-row fixture.

This certificate is tied to the research branch's code, binary hashes, fixture and reproducible Actions workflow. It is not an external institutional certificate.
