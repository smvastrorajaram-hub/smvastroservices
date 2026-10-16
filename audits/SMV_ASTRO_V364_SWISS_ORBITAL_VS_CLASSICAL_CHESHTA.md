# SMV ASTRO V364 — Existing ephe/WASM data, classical Mean Longitude & Sheeghrocha versus Swiss osculating elements

## User request and source policy

**Request:** Continue BPHS-based Cheshta Bala source-level work, use the repository's existing `ephe`/WASM files wherever possible, compare Swiss modern orbital elements with PyJHora's Ujjain-1900 mean-motion method, test against BPHS I Chapter 27 and *Uttara Kalamrita* Chapter II; merge only verified calculations.

**Priority:** R. Santhanam, BPHS I Chapter 27 verses 18, 21–25: BPHS six-Bala and formula are authoritative. *Uttara Kalamrita* II, printed pp.42–43, supplies an additional explicit five-planet interpretation of which **classical sidereal mean position** and **Sheeghrocha** to use. PyJHora is a DIFFERENT published implementation and comparison reference, **not** a source of code copied into SMV ASTRO.

## Confirmed repository data (prior to this PR)

- Root `ephe/sepl_18.se1` (~484 KB), `ephe/semo_18.se1` (~1.30 MB): modern Swiss planetary/lunar position data, **not tables of classical Sheeghrocha**.
- Browser/offline `vendor/wasm/swisseph.data` (~3.58 MB): embedded `/sweph/sepl_18.se1`, `/sweph/semo_18.se1`, `/sweph/sepl_24.se1`, `/sweph/semo_24.se1`. The `vendor/wasm/swisseph.wasm` program exports `swe_get_orbital_elements` but `smv-swisseph-local.mjs` previously did not expose it in JavaScript.
- Swiss Ephemeris programming manual v2.10, `swe_get_orbital_elements(tjd_et,ipl,iflag,dret,serr)`, **50 doubles** `dret`; index 9 is mean longitude at epoch, index 6 mean anomaly, index 5 longitude of perihelion. The manual says these are **Keplerian osculating**, not a classical Vedic mean motion. These modern positions cannot silently substitute for textbook Cheshta inputs.

## V364 modifications (research-only Swiss interface, no new `.se1` download)

1. `public/horoscope/offline/vendor/smv-swisseph-local.mjs`: expose the existing C `swe_get_orbital_elements` safely with a 50-double allocated buffer, error buffer, correct C parameter order, finite validation, `finally` memory free, and tight allowed planet IDs (Mercury/Venus/Mars/Jupiter/Saturn and Earth). Accept only the project's Swiss flag 2. Return normalized index 9 mean longitude, index 6 mean anomaly, index 5 perihelion longitude, etc. **Explicit metadata:** `frame:'modern-heliocentric-osculating'`, `BPHSClassicalCertified:false`, `canReplaceClassicalMeanLongitude:false`.
2. `public/horoscope/offline/bphs-swiss-solar-cheshta.browser.mjs`: add an **isolated pure function** to take externally verified *classical sidereal* `meanSun`, `meanPlanet`, and `truePlanet`; choose mean vs Sheeghrocha as in *Uttara Kalamrita* II pp42–43; call the existing BPHS I Ch27 vv24–25 circular angle/3 calculator. Reject all missing inputs; no synthetic guessed ephemerides.
3. `tests/v364-swiss-orbital-cheshta-evidence-regression.mjs`: for five existing Perambalur birth charts verify six Swiss modern osculating means each against **independent pyswisseph 2.10.03 / Moshier** numerics; check physical orbital plausibility, `meanLongitude≈longitudePerihelion+meanAnomaly` and return frame/qualification flags. Also prove five-planet classical book-selector arithmetic with controlled inputs and assert production Phase 3 stays provisional.
4. GitHub CI workflow runs V364 alongside V360 PVR Shodhana, V357 positional Kala, V361/362 Yuddha/Drig, and V363 Swiss sunrise oracle and existing Horoscope/Matching/UI/regression.

### Independently established modern mean-longitude oracle

The expected values were calculated outside the repository using `pyswisseph 2.10.03`: `utc_to_jd` at UTC = birth local time UTC+05:30, then `get_orbital_elements(jd_et,body,FLG_MOSEPH)[9]`. `SWIEPH` WASM values are compared to these **independent calculations with a bounded 0.25° model tolerance**. Planet order Mercury, Venus, Mars, Jupiter, Saturn, Earth:

| Perambalur date/time | Mercury | Venus | Mars | Jupiter | Saturn | Earth |
|---|---:|---:|---:|---:|---:|---:|
| 1994-06-15 13:03 | 240.41616 | 175.76815 | 13.65972 | 226.01862 | 342.11635 | 263.43682 |
| 2015-09-06 09:30 | 287.71597 | 356.84626 | 116.41815 | 150.20734 | 241.52706 | 344.71967 |
| 1992-07-31 22:05 | 322.79965 | 160.51305 | 15.41386 | 169.21790 | 319.27536 | 309.65328 |
| 1971-05-04 05:05 | 247.44134 | 328.44600 | 269.07160 | 244.55615 | 59.44936 | 221.61601 |
| 1974-01-11 16:04 | 312.08139 | 104.07795 | 64.44113 | 326.26168 | 92.30399 | 110.91820 |

These are **TROPICAL-REFERENCE MODERN HELIOCENTRIC** orbital means; not Shadbala book positions or classic input verification.

## Classical five-planet mapping (independently read from UK Chapter II printed p42)

| Graha | BPHS Cheshta mean position | Sheeghrocha |
|---|---|---|
| Mars / Jupiter / Saturn | **Each graha's classical mean** | **Classical mean Sun** |
| Mercury / Venus | **Classical mean Sun** | **Their own classical mean** |

The source book explains a classical astronomical computational process. **Do NOT use modern orbital means with classical sidereal true positions**; the frames/definitions do not match. The newly introduced helper is intentionally not called by production `phase3Strength` until sourced mean positions exist.

## Comparison with PyJHora (external reference, not imported)

Project: `https://github.com/naturalstupid/PyJHora`; `src/jhora/horoscope/chart/strength.py`. Its research implementation explicitly uses an **Ujjain-based 1900 epoch**, separate secular corrections, and a `get_planet_mean_longitude()` / `_cheshta_bala_new()` procedure. That model is NOT synonymous with the modern Swiss osculating mean anomaly or orbital elements. The **planet-to-Sheeghrocha mapping** does match the classical source, but its exact century-scale mean calculations require independent book-based verification before integration. Its code is **AGPL-3.0**: none was copied, translated, or bundled in this PR.

## What is PASS, and what is NOT

**Eligible for PASS:** the WASM C routine genuinely callable, correct memory layout/index 9, five-date independent modern numerical oracle, 5 classical selector synthetic book examples, CI regression, unchanged old customer results and classical `classicalCertified:false`.

**Still NOT full classical Shadbala numerical certification:**
- The classical sidereal **mean graha longitudes** and classical **Sheeghrocha** have not been independently reconstructed and verified against a specific tabular/astronomical textbook for 1971–2015.
- Chapter 26 BPHS geometric Drig special-aspect calculation remains contested with printed commentary; no final independent complete oracle.
- Thus the production five-planet `motionClassical()` continues as a speed-bin **provisional** estimate. The new modern orbital method is **research-only**. It must NOT be used to claim the full book Shadbala numerical PASS.
- PVR Shodhana Chapter 12.7 numeric examples were passed in PR #9, but the standalone Shodhana module is not yet live-wired and some corner-case conventions remain uncertain.

Scope boundaries: no Shodhana implementation modification, no Horoscope/Matching prediction or printed reports, no PWA/Admin/Payment/DST/GeoNames changes. Safe to merge after GitHub Actions PASS only.
