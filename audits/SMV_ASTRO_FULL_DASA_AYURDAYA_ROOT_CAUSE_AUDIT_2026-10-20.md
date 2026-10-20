# SMV ASTRO — Full Dasa / Ayurdaya Source-Level Root-Cause Audit

**Date:** 2026-10-20  
**Working PR:** [#77 — Full Website 150 Horoscope + 150 Marriage Matching audit](https://github.com/smvastrorajaram-hub/smvastroservices/pull/77)  
**Branch:** `audit/full-website-150-horoscope-150-matching`  
**Current release state:** OPEN / NOT MERGED. The latest extended run is still the merge gate; only completed runs may be called PASS.

## 1. Audit scope and what PASS means

This audit separates five different questions that should not be conflated:

1. Does the real calculation path return a complete result for the input?
2. Are result structures, duration arithmetic, period boundaries and partner-report outputs internally consistent?
3. Do implemented calculations match independent printed-table / worked-example evidence?
4. Does a source rule have enough chart evidence to return MATCHED / NOT_MATCHED rather than UNKNOWN?
5. Has a qualified astrologer independently reviewed interpretation against verified real-life outcomes?

Automated regression can establish the first four only to the extent the fixture or source oracle actually tests them. It cannot by itself certify question 5. Current 150/150 fixtures are reproducible synthetic birth inputs at Perambalur, not 150 verified real-person records.

The last completed end-to-end full-site baseline before adding the per-period invariant matrix was [run #47](https://github.com/smvastrorajaram-hub/smvastroservices/actions/runs/39422376554): **11,514 assertions PASS**, 150 calculated natal profiles, 150 distinct pair reports, and 1,050/1,050 Pinda-row parity comparisons. Later commits add stricter Dasa-row / date-boundary / Antardasa conservation checks and duration-cache changes; that earlier count is not evidence that those later changes have passed.

## 2. Source-level optimizations and corrections on this branch

| Root cause | Correction | What validates it | Limits |
|---|---|---|---|
| Karakamsha builder called `buildVargas(chart,'en')` inside Phase-2 despite Advanced Analysis already calculating Varga results | Phase-2 now receives the already calculated Varga list and reads D9 from it | Source guard asserts only one `buildVargas(chart,lang)` call in `advanced()`; runtime assertion compares Karakamsha with the Atmakaraka's D9 position | The D9 value still needs independent sign/degree boundary examples across all supported Varga rules |
| Initial D9 reuse patch interpreted a longitude using sign-index normalisation; the test showed Aries where D9 parity expected Virgo | Use longitude normalisation before deriving a sign from the existing D9 longitude | Was caught by the 150-chart Atmakaraka/D9 parity assertion, corrected, and passed in run #47 | This is a parity oracle against the same calculated D9 dataset, not an independent printed D9 source oracle |
| `advanced()` could reconstruct Ashtakavarga separately for Sodhya Pinda | Compute Ashtakavarga once, share that output with V5/Sodhya Pinda | Source assertion checks a single call and the full-chart Pinda comparisons | Shared arithmetic prevents redundant work; it does not prove every classical reduction rule |
| Phase-4 Dasa made a JSON deep clone of the full chart merely to attach Sree-Lagna metadata | Replace with a shallow top-level copy; nested planetary data is read-only | Source guard plus runtime input-chart immutability check on a real calculated fixture | The extended 150-chart CI is the acceptance gate for the new implementation |
| Narayana Dasa computed the same sign duration again for both cycles and repeatedly recalculated identical sign Antardasa order | Cache the already computed first-cycle duration and Antardasa order per sign; use the source-prescribed second-cycle complement | Existing Example 64/Mercury-in-Virgo and all-chart Dasa regression plus extended duration/AD checks | No formula or selected lineage has been changed by this cache; performance measurements remain runner-specific |
| Marriage Matching's `matchingOnly` path used to calculate an annual Tajaka chart that the matching report does not consume | Guard annual Tajaka computation off on `matchingOnly:true`; execute charts sequentially to avoid high memory peaks | Source guard and 100/150 chart audits | Full Horoscope continues to calculate annual Tajaka; this gate applies only to Matching |
| Chapter XIV predicates required external caller input for facts derivable from the natal chart | Derive D9 Lagna lord, Vimshottari birth MD/AD, Moon Drekkana and specific malefic aspects from calculated positions; leave missing source-sensitive observations unknown | Positive / negative / missing-evidence Chapter XIV regressions and 150 profile trace | Sunrise/hora/full-Moon observations and independent strength judgement are not inferred without the needed input |

## 3. Dasa Analysis — source and arithmetic gate

The Phase-4 engine returns eight special Dasa systems in addition to the main Vimshottari calculation:

- Ashtottari
- Narayana
- Lagna Kendradi Rasi Dasa
- Sudasa
- Drigdasa
- Niryaana Shoola
- Shoola
- Kalachakra

The expanded 150-chart matrix now checks expected period-row counts, non-negative finite durations, ISO date boundaries, date continuity, Antardasa durations summing to their parent Mahadasa and the second-cycle complement `12 − first-cycle duration` for Narayana / Lagna Kendradi / Sudasa / Drigdasa. The dedicated calculation regression independently covers source-based cases such as Vimshottari Example 50, Ashtottari Table 39 / Example 59, Narayana Table 40 / the Mercury-in-Virgo cap, Sudasa Example 77, Drigdasa Example 80, Kalachakra Examples 95–97, Niryaana Shoola Example 87 and Shoola's 9-year / twelve-Antardasa structure.

### Dasa findings / limits

| System or output | Current source decision / root cause | Disposition |
|---|---|---|
| Vimshottari calendar durations | The engine follows P.V.R. Narasimha Rao's chosen 360-day Savana-year convention for nested Dasa arithmetic; browser/server duplication was a past source of divergent date math | Source-oracle regression exists; exact calendar convention is source-specific, not universal practice |
| Ashtottari eligibility | Three published views disagree. The engine selects BPHS ch. 46, v. 17: Rahu not in Lagna and in a Kendra/Trikona from the Lagna lord. Universal applicability and day/night–paksha views stay visible as alternatives | Selected rule can be tested; universal applicability is not a source-consensus PASS |
| Narayana duration | The PVR sign-strength/length sequence can produce a 13-year Virgo/Mercury value under a literal reading; an explicit 12-year cap from Sanjay Rath is applied as an inter-source reconciliation | The uncapped conflict remains visible; never attribute the cap as a literal PVR rule |
| Kalachakra | PVR Table 45's printed Savya-2 star list appears to omit Uttarabhadrapada; the engine uses a complete 15-Savya / 12-Apasavya grouping supported by parallel tables | Selected lineage is documented and grid-tested; alternate lineage remains unresolved |
| Drigdasa | Direct Parashara/PVR Example 80 group construction is selected; other Jaimini commentarial orderings are not merged into it | Selected lineage tested, not all variants certified |
| Date/time anchoring | Special Rasi-Dasa outputs are date-only and the current period grid is anchored to birth date midnight rather than representing sub-day birth-instant precision throughout the output | **OPEN ROOT CAUSE / PRECISION LIMIT**: do not advertise sub-day period-boundary precision until local birth instant, timezone offset and date-label oracle are independently specified and tested |

## 4. Ayurdaya — results and root causes

### 4.1 B. V. Raman, Chapter XIV — longevity-type category

The rule inventory contains Balarishta / antidote / Alpayu / Madhyayu / Purnayu combinations. The runtime now derives several position-based evidence items that previously remained unknown in every generated chart. Some inputs are intrinsically unavailable from longitude/house data alone (for example, minutes from sunrise, Moon's hora, birth-night/full-Moon observations, and source-specific strength evaluation).

In the completed run #47's deterministic 150-chart sample, Chapter XIV often produced **more than one candidate category** rather than exactly one. In the trace, the category sets included Balarishta+Madhyayu (56), Balarishta (28), Balarishta+Alpayu+Madhyayu (25), and several other multi-category combinations; four charts had no confirmed category. This is evidence of partial rule coverage and competing combinations, not a reason to choose a winner silently. The same run retained UNKNOWN results for source-sensitive rules, including sunrise/hora, strength, full-Moon and Shadvarga predicates.

**Root cause:** a source-rule inventory can be present and executable while the evidence/counter-evidence precedence and all full-chart rules are not yet complete. The engine must preserve three-state logic; it must not convert missing evidence to false or select a single life category because the UI expects one.

### 4.2 B. V. Raman, Chapter XXVI — Ashtakavarga Ayurdaya

The research path computes reduced BAV rows, Rasi Pinda, Graha Pinda, Sodhya Pinda and per-graha lunar-year candidates with Harana factors. It does not emit a certified final life-span result.

- The latest completed 150-chart baseline compared 1,050 rows (150 charts × seven classical grahas): Rasi Pinda, Graha Pinda and Sodhya Pinda each matched the independent calculation panel in 1,050/1,050 rows.
- The 100-chart source audit passes and reports Harana input completeness 100/100 for that fixture set.
- Those checks show calculation-path and parity consistency, not full certification of all source interpretations: the B.V. Raman Standard Horoscope reduction table is still held as a secondary transcription pending original printed-page verification.
- Chapter XIV category candidates and Chapter XXVI numeric bands are kept as distinct source channels. A non-overlapping numeric band is not a certified contradiction when the qualitative channel still has UNKNOWN or multiple categories.

**Root cause:** base BAV/SAV totals, reduction arithmetic, Pinda parity and final life-category selection are different gates. Correct 337 SAV totals or a matching Pinda table must not be represented as proof that the full method/Harana/category choice is textbook-certified.

### 4.3 C. G. Rajan Pinda / Amsa / Naisargika Ayurdaya

The completed full-site baseline found the method selector available on 138 of 150 charts; 12 remain unavailable because the Shadbala reference comparison tied. Method-selection counts were natural 47, Amsa 24, Pinda 67 and tie-unavailable 12.

**Root cause:** the method chooser depends on strength comparisons; a tie has no independently authorized winner in the audited rule set. Returning unavailable with the tied alternatives visible is preferable to a fabricated method selection. Full Amsa Harana / strongest-occupant selection, the printed Sun-row-versus-total discrepancy and other book-specific caveats remain source-audit items.

### 4.4 P. V. R. Narasimha Rao — chart-derived longevity and Sodhya-Pinda timing shown in Dasa Analysis

The new Dasa Analysis section calculates Rudra / Trishoola / Maheswara, the Method-of-Three-Pairs longevity category, the separate Eighth-Lord method and the selected-category Dasa windows. Sodhya-Pinda event timing multiplies raw BAV rekhas by the computed Yoga Pinda to generate Nakshatra/Rasi timing references, and uses transit-window arithmetic to display Saturn/Jupiter ingress dates.

**Root causes / limits:**
- The Eighth-Lord method uses an explicitly labelled SMV approximate sign-strength heuristic, not a complete textbook strength proof.
- The source describes Sodhya-Pinda timing as inconsistent/open to research; transit windows are not guaranteed events.
- The category's short/middle/long age ranges are timing bands, not a death-age algorithm.
- These outputs remain research-only, `certified:false`; no final lifespan or death date is computed or authorized for display.

### 4.5 Admin Prediction Rules

The old published-rule file was an empty array, so online publication had no versioned offline baseline and an empty remote publication could erase the effective rules. This branch adds 24 bilingual contextual house-lord modifiers as a **static fallback**, blocks empty Admin Publish, seeds a local Admin Draft for review, and uses the fallback when remote publication is absent/empty/malformed.

**Disposition:** this removes the empty-array root cause, but it is not a complete five-book rule library. Owner review/publish is still required; the 24 contextual rules must not be sold as exhaustive classical prediction.

## 5. Full-site technical regression — what it proves

The last completed baseline used 150 calculated profiles and 150 distinct pair combinations, not 300 unique people. It checked actual Swiss/WASM planetary calculations, 12 Sripati Bhava midpoints, 16 configured Varga rows, Vimshottari, birth/daily Panchang, Transit, Advanced Analysis, Tamil/English D1 narrative structure, all 10 Matching porutham rows, score arithmetic, Kuja/Dasa-Sandhi evidence and report appendices.

The new merge gate expands this with:
- all eight Phase-4 Dasa output grids and period/Antardasa invariants;
- Dasa source-regression cases;
- the independent 100-chart Ayurdaya / Harana audit;
- B.V. Raman Chapter XIV and XXVI source-rule tests;
- B.V. Raman Ashtakavarga reduction/report regression;
- C.G. Rajan Pinda / Naisargika / Amsa and advanced placement tests;
- one-shared-calculation and chart-immutability guards.

Even when every CI step passes, these are generated fixtures and source-limited oracles, not independent real-life validation of astrological predictions.

## 6. Release / merge gate

**Not yet fully certified.** Keep PR #77 unmerged until the latest run at the latest branch SHA passes the expanded Dasa/ Ayurdaya matrix and all related workflows. Even after that technical PASS, the following source-certification work remains open:

1. Add original printed worked examples for every unresolved longevity-type rule/exception and verify category conflict precedence.
2. Independently verify the B.V. Raman Standard Horoscope reduction rows from original print images; complete separate Trikona/Ekadhipatya rule oracles.
3. Resolve C.G. Rajan tied-strength / full Amsa method cases without arbitrary selection.
4. Specify source-approved date/timezone anchoring for date-only Rasi-Dasa boundaries and add local-midnight/birth-time boundary oracles.
5. Review the contextual Admin rules against the five books and publish only owner-reviewed additions.
6. Have an experienced astrologer review Tamil/English chart-specific interpretation against independent reference charts and verified records; automated narrative variety is not a quality certificate.

**Non-negotiable output rule:** calculation/structure may be PASS while classical source certification is PARTIAL/BLOCKED. Do not collapse those states into one green badge.
