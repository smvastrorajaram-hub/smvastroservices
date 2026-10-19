# SMV ASTRO — 100-Chart Ayurdaya / Sodhya Pinda Source-Level Audit

**Run date:** 2026-10-19  
**Branch / PR:** `audit/100-chart-ayurdaya-source-parity` / PR #64  
**Regression:** `tests/ayurdaya-100-chart-comparison-audit.mjs`  
**CI run:** https://github.com/smvastrorajaram-hub/smvastroservices/actions/runs/39305062967

## Population and calculation provenance

The CI test executed **100 distinct birth-input fixtures: 50 male-cohort and 50 female-cohort inputs arranged as 50 two-person Marriage Matching reports**. These dates/times are deterministic QA fixtures, not 100 verified real-person birth records. No planet longitude is supplied to the test. The test calls `offline-engine.full(matchingOnly:true)`, which follows the actual natal Swiss/WASM calculation path; all 100 natal longitude signatures were unique.

The test produced **3,620 passing assertions**. The four output tracks below each produced 100 distinct result signatures, so this fixture set did not replay a constant pre-filled result.

## Sodhya Pinda parity

The modified Horoscope analysis panel and the new B.V. Raman Ashtakavarga Ayurdaya appendix use the same seven-graha reduction/Pinda engine after this PR aligns Ekadhipatya occupancy.

| Metric | Result |
|---|---:|
| Calculated natal charts | 100 |
| Graha rows compared | 700 |
| Rasi Pinda exact matches | 700/700 |
| Graha Pinda exact matches | 700/700 |
| Sodhya Pinda exact matches | 700/700 |
| Rows with all three fields equal | 700/700 |
| Unexplained mismatches | 0 |

### Root cause fixed

Before this audit, the modified panel derived Ekadhipatya occupied signs from the seven classical grahas only, while the newly added Ayurdaya-report path derived occupancy from all nine grahas. Rahu/Ketu do not contribute Graha Pinda multipliers, but their occupied signs can change the empty/occupied branch of Ekadhipatya Shodhana. The panel now includes their signs for occupancy while retaining the seven-classical-graha Pinda formula. The 700-row comparison passes with exact integer equality.

## C.G. Rajan source track

The selector chose a single C.G. Rajan method for **92/100** cases, and correctly withheld selection in **8/100** cases where the Shadbala comparison tied.

| Selected method / state | Count |
|---|---:|
| Pindayurdaya | 45 |
| Naisargika / natural | 32 |
| Amsa | 15 |
| Unavailable — Shadbala tie | 8 |

C.G. Rajan Pinda/Amsa/Naisargika terms are not expected to numerically equal B.V. Raman's reduced-BAV weighted pinda values: the source methods use different inputs and formulae. This audit retains them as separate result tracks and does not average or substitute their values. Selection/reduction certification remains incomplete in the existing source module.

## Longevity-category and numeric-band comparison

The audit calls the same report-result function as the B.V. Raman customer appendix, including its chart-derived Harana inputs.

| Chapter XIV / Chapter XXVI cross-check state | Count |
|---|---:|
| Candidate overlap — **not validation** | 49 |
| Candidate disagreement — requires source/rule review | 36 |
| No Chapter XIV rule match in the currently implemented subset | 2 |
| Not comparable — Harana inputs incomplete | 13 |

Chapter XXVI numeric-band candidate availability:

| Candidate | Count |
|---|---:|
| Madhyayu | 76 |
| Alpayu | 8 |
| Purnayu | 3 |
| Unavailable | 13 |

For the 13 incomplete charts, the missing Harana evidence occurred in these graha-factor records: `defeatedInPlanetaryWar` (20 graha entries) and `eclipsed` (3 graha entries). These are missing *factor observations*, not 23 distinct charts.

**Important:** the Chapter XIV rules currently return a set of matched category candidates, not a single certified lifespan type. Multiple categories can match the partial rule inventory for the same chart. Numeric-band overlap is explicitly labelled `CANDIDATE_OVERLAP_NOT_VALIDATION`; disagreement is not silently overwritten. The final lifespan remains `null` and the engine remains `certified:false`.

## Source-level optimization changes

1. The `matchingOnly` flow now skips annual Tajaka chart computation, which the Marriage Matching report does not consume. A source-level regression checks the guard, and all 100 charts assert that no annual Tajaka chart was created on this path.
2. `advanced()` now calculates Ashtakavarga once and passes the already computed BAV/SAV object into the Sodhya Pinda panel. The static source guard verifies one Ashtakavarga invocation in `advanced()`, removing the prior duplicate BAV computation.
3. The audit processes charts sequentially to avoid 100 simultaneous WASM instances. On this CI run, the full 100-chart plus 50-report audit took approximately **1.74 seconds** (machine-/runner-specific, not a universal performance guarantee).
4. Each of the 50 rendered two-person Marriage Matching reports contained both partners' C.G. Rajan and B.V. Raman report sections. No report emitted a final lifespan/death-age claim.

## Verdict

- **PASS:** real engine calculation path exercised for all 100 valid test-input fixtures; no pre-supplied planetary longitudes.
- **PASS:** all 700 Rasi/Graha/Sodhya Pinda comparisons match exactly.
- **PASS:** all 50 Marriage Matching report renders include both Ayurdaya appendices.
- **PASS:** C.G. Rajan method selection varies with the calculated chart inputs and exposes 8 true ties rather than inventing a selection.
- **BLOCKED from classical certification:** 36 Chapter XIV/XXVI candidate disagreements, 13 incomplete numeric tracks, multiple simultaneous Chapter XIV category candidates, and the previously documented primary-source / worked-example gaps remain unresolved.

This is not a validation against 100 verified real-person records. To certify accuracy on actual people, the next test population must use 100 verified birth records with correct date, local time, coordinates, time-zone/offset provenance, and an independent source-chart oracle.
