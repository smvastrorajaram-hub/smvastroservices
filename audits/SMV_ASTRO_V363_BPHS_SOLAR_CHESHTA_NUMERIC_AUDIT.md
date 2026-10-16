# SMV ASTRO V363 — BPHS Shadbala completion audit: Swiss solar clock, BPHS Cheshta inputs, numeric evidence

**User's priority:** BPHS Vol I Santhanam Chapter 27 is primary for Shadbala. Uttara Kalamrita is consulted only when BPHS is unclear, NOT used to overwrite an explicit BPHS rule. Shodhana (PVR Narasimha Rao) is separate and already numerically tested/merged in PR #9.

## Exact distinction: tested Shodhana versus full certification

- `tests/v360-pvr-shodhana-textbook-regression.mjs` checks PVR §12.7 Examples 40–43: Mercury **77 Rasi Pinda + 75 Graha Pinda = 152** and exhausted five co-owned sign pairs for the explicitly stated rules. Source workflow PR #9 passed and was merged to main.
- `classical-shodhana.browser.mjs` correctly retains `certified:false`. **Unspecified one-occupied/equal-bindu case remains explicitly uncertified**. Its numeric processing is a standalone calculation, not integrated into Horoscope or Marriage Matching prediction or their published report. Therefore **book-numbered Shodhana regression PASS** is NOT equivalent to **end-to-end production Shodhana certified**.

## Shadbala source trace — BPHS primary

| Component | BPHS primary source | Earlier Phase3 | V363 status |
|---|---|---|---|
| Sthana | Ch27 vv1–6; five positional sub-Balas | Implemented, selected numerical/unit oracle in V357 | Preserved, not exhaustive all seven Grahas against fully independent natal book totals |
| Dig | Ch27 vv7–7.5 | Implemented from house reference angle; additional house cusp provenance needs independent audit | Preserved |
| Kala: Paksha/Ayana/Abda/Masa/Dina | Ch27 vv8–17 | Book arithmetic and anchors tested V357 | Preserved |
| Kala: Hora/Tribhaga and Natonnatha apparent solar time | Ch27 vv8,12–13 (apparent birth time, day/night parts) | Approximate NOAA sunrise and mean local solar time; previous-day night depended on same-day rise/set | **New independent astronomy method** using Swiss Sun equatorial coordinates, GMST, geometric solar altitude crossing standard sea-level horizon; three consecutive dates for sunrise-to-sunrise and sunset-to-sunrise; apparent hour angle for Natonnatha |
| Kala: Yuddha | Ch27 v20 | Initially V361 UK +/-60; V362 corrected to BPHS pre-war Shadbala difference with UK north-criterion only | Preserved |
| Cheshta Sun/Moon | Ch27 v18 | Sun=Ayana; Moon=Paksha | Preserved |
| Cheshta Mars/Mercury/Jupiter/Venus/Saturn | Ch27 vv21–25 | Speed-bin **estimate** in Phase3, not genuine mean/true/Sheeghrocha computation | New `bphsCheshtaFromOrbitalElements` implements the literal BPHS numeric formula *given independently proven input elements*. **WASM cannot supply those classical orbital elements**; this code does not replace the live speed estimate and is NOT natal-certified |
| Naisargika | Ch27 v14 | Correct fixed seven values | Preserved |
| Drig | Ch26 special-aspect interpretations and Ch27 v19 | BPHS signed 1/4+full Mercury/Jupiter aggregation tested V362; special angular interpolation still lacks a reliable complete book oracle | Preserved |

## Independent astronomical sunrise benchmark

`tests/v363-bphs-swiss-solar-cheshta-regression.mjs` hard-codes **separately obtained** Swiss Ephemeris 2.10.03 `rise_trans` results from `pyswisseph` under sea-level height 0m, 15°C, 11.232°N/78.88°E, UTC+05:30. Source under test **cannot** call `rise_trans`; it uses available local Swiss `calc` for the Sun's RA/Dec, a standard sidereal-time formula and altitude root finding. Tests allow a maximum error of **18 seconds** relative to the independent oracle.

| Birth date | Swiss sunrise reference (local) | Swiss sunset reference (local) |
|---|---|---|
| 1994-06-15 | 05:51:30 | 18:38:10 |
| 2015-09-06 | 06:04:25 | 18:21:25 |
| 1992-07-31 | 06:02:16 | 18:39:14 |
| 1971-05-04 | 05:55:02 | 18:27:43 |
| 1974-01-11 | 06:36:49 | 18:07:46 |

This is a **specified-model astronomical validation**, NOT exact local atmospheric or elevation validation. For polar no-rise/no-set dates the standalone routine returns `null` (no fabricated Sun event). If Swiss equatorial positions are unavailable in the browser, Phase3 retains the prior geometric fallback *and continues to be provisional*.

## Independent BPHS Cheshta arithmetic

For the five classical planets (not Sun/Moon), Ch27 vv24–25 describes:
1. Add the *documented mean* and *true* planetary longitude, divide by two (circular midpoint for crossings of 0°);
2. Calculate shortest separation from independently computed *Sheeghrocha*;
3. Divide the angular separation by 3 to obtain Cheshta Virupas (0–60).

The new library exports this pure function, rejects missing or non-finite values and independently tests 0°, 90°, 180°, and 359°↔1° boundaries. **Do not fabricate the input orbital elements**. The repository's Swiss WASM `public/horoscope/offline/vendor/smv-swisseph-local.mjs` exposes only `calc`, `utcToJd`, `houses`, and `ayanamsa`; it does not expose a documented classical `Sheeghrocha` or five-planet mean longitude. Consequently, current live five-planet Cheshta remains an 8-motion speed heuristic, not the exact BPHS vv24–25 calculation.

## BPHS intra-book Drig discrepancy (needs separate resolution)

Ch26 Sanskrit-based planet-specific descriptions (PDF pp254–256) and the translator's generic-speculum additive prose (pp256–257) give different mid-interval numerical implications. Example for Mars at 105°: planet-specific section produces 45 virupas while generic speculum 37.5 + 15 yields 52.5. Do not silently label these contradictory computations equivalent; comparison to Uttara Kalamrita may establish a separately named interpretive convention but cannot prove both. Keep older angular code under explicit `classicalCertified:false`.

## Acceptance policy / release

The CI gate includes this dedicated mathematical/ephemeris validation PLUS prior PVR Shodhana, BPHS Shadbala positional, Kala, Drig/Yuddha and five-natal chart regressions. A green PR allows **limited BPHS temporal computation improvement**, not entire Shadbala final PASS. End-to-end complete numeric certification still requires independently sourced mean planetary longitudes + Sheeghrocha for five planets, an unambiguous angular Drig oracle, and atmospheric/height scope labeling. Never set `classicalCertified:true` solely because the V363 tests pass.

No edits to Shodhana, matching reports, prediction text, UI/PWA, DST/timezone provider, GeoNames, saved reports, payment or PDF modules.
