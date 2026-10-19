# SMV ASTRO — 100-chart Ayurdaya Missing-Evidence and Tie Re-audit

**Audit date:** 2026-10-20  
**Repository PR:** [#65 — Fix Ayurdaya missing-evidence audit and Shadbala tie output](https://github.com/smvastrorajaram-hub/smvastroservices/pull/65)  
**100-chart audit run:** [Run 14](https://github.com/smvastrorajaram-hub/smvastroservices/actions/runs/39309058651)  
**JSON evidence artifact:** [Download audit artifact](https://github.com/smvastrorajaram-hub/smvastroservices/actions/runs/39309058651/artifacts/12215186655)

## Population and calculation path

- 100 unique deterministic QA birth inputs: 50 male-cohort, 50 female-cohort; 50 two-person Matching pairs.
- The charts were calculated by the live offline engine / Swiss-WASM chart path; planetary longitudes were not preloaded.
- 50 matching report HTML outputs were rendered and both Ayurdaya appendices were checked.
- The audit completed **3,780 assertions**.
- These are generated QA fixtures, not 100 verified real-person birth records. The audit demonstrates behavior and arithmetic consistency for these inputs, not independent real-person astrology accuracy.

## Modified Sodhya Pinda and Ayurdaya Pinda parity

| Check | Result |
|---|---:|
| Charts included | 100 |
| Seven-graha rows compared | 700 |
| Rasi Pinda exact matches | 700/700 |
| Graha Pinda exact matches | 700/700 |
| Sodhya Pinda exact matches | 700/700 |
| Rows where all three fields match | 700/700 |
| Unexplained mismatches | 0 |

## Chapter XXVI Harana missing-input correction

The earlier run had 13 numeric candidates withheld due to unresolved Harana evidence: 20 planetary-war graha-factor records and 3 eclipse-factor records. Those were unresolved *factor records*, not 23 separate charts.

The updated code uses calculated ecliptic latitude alongside close-war longitude separation to assess planetary-war winners. For eclipse status it uses actual Sun–Moon phase/opposition, the Moon's ecliptic latitude and conservative geometric bounds; near-boundary cases remain UNKNOWN rather than being forced to a result.

The three previously incomplete eclipse records now resolve as “not eclipsed” at the tested birth instant because their phase/opposition geometries are outside the conservative actual-eclipse interval:

- `AUDIT-F-32`, Moon: Sun–Moon phase 169.0866° (about 10.9134° from opposition), Moon latitude +1.2819°.
- `AUDIT-F-39`, Moon: phase 167.8579° (about 12.1421° from opposition), Moon latitude −0.9557°.
- `AUDIT-F-41`, Sun: Sun–Moon phase separation 13.8667°.

| Harana status | Re-audit |
|---|---:|
| Complete inputs | 100/100 |
| Incomplete inputs | 0 |
| Missing-factor records | 0 |
| Missing-reason records | 0 |
| Chapter XXVI numeric band unavailable due to incomplete Harana | 0 |

The 100 numeric band candidates are:

| Candidate band | Charts |
|---|---:|
| Madhyayu | 87 |
| Alpayu | 10 |
| Purnayu | 3 |
| Unavailable due to Harana | 0 |

**Scope note:** the eclipse thresholds are conservative geometric checks used by this research engine; they are not a full shadow-cone/contact calculation and have not been independently certified as the precise source-book interpretation. A future chart inside a boundary band remains UNKNOWN.

## Chapter XIV versus Chapter XXVI comparison — corrected interpretation

The previous comparison treated “the numeric band was not present in the Chapter XIV candidate set” as a disagreement even when Chapter XIV still had UNKNOWN rule predicates or multiple candidate categories. That was not a valid like-for-like comparison.

The new comparison only calls an outcome a confirmed candidate overlap or disagreement when Chapter XIV has **exactly one category candidate and every Chapter XIV rule is evaluated**. This QA set contains **zero** charts meeting that condition. The audit therefore no longer labels the previous 36 candidate differences (or candidate overlaps) as proof of a true contradiction or validation.

| Comparison state after correction | Charts |
|---|---:|
| Chapter XIV partial / multiple candidates — not comparable to a single numeric band | 98 |
| No confirmed Chapter XIV category matched, while other rules remain UNKNOWN | 2 |
| Fully evaluated, unique Chapter XIV category available for a like-for-like comparison | 0 |
| True candidate disagreements established by fully evaluated unique categories | 0 |

This is **not a claim that the two methods agree**. It means Chapter XIV's current evidence track does not produce a fully evaluated unique category for these 100 inputs, so a disagreement count would be misleading.

The 76-rule source inventory has evaluator entries, but 30 distinct rule IDs remain UNKNOWN for at least one tested chart. Fourteen remain UNKNOWN in all 100 fixtures:

| Rule IDs | Source-rule subjects requiring evidence / regression work |
|---|---|
| XIV-BAL-04 | Birth near sunrise/sunset, Moon rising, malefic-sign Navamsas |
| XIV-BAL-10, XIV-BAL-15 | Birth Dasa lord / Dasa–Antardasa relationships |
| XIV-BAL-28 | Weak and badly placed Lagna lord or Moon-sign lord |
| XIV-ANT-04, XIV-ANT-07 | Full Moon, benefic-sign / benefic-between-Moon conditions |
| XIV-ANT-05 | Strong Mercury, Venus or Jupiter |
| XIV-ANT-10 | Shadvarga and auspicious Navamsa evidence |
| XIV-ALP-14 | The “no other planets in Kendras” condition |
| XIV-MAD-02, XIV-MAD-03, XIV-MAD-04, XIV-MAD-15 | Power/strength and placement combinations |
| XIV-PUR-02 | Benefic placements in the first six versus malefics in the last six houses |

These remaining UNKNOWN rule states are retained in the JSON artifact with rule IDs, category, title, page/rule numbers and occurrence counts. The next source-level task is to wire and regression-test the required Chapter XIV evidence and precedence/cancellation logic; the audit must not guess a single category from multiple partial matches.

## C.G. Rajan Shadbala ties

Eight of the 100 charts have equal Shadbala reference values. Those ties are now rendered with each tied method's seven graha results and a separate total for each method—no arbitrary winner and no average:

| Tied methods | Charts |
|---|---:|
| Pinda + Amsa | 4 |
| Naisargika + Amsa | 4 |
| Tie sections verified in the 50 pair reports | 8 |

If a particular method's Harana total is not resolved, its raw value is labelled as unadjusted rather than presented as a completed adjusted result.

## Source status and limits

- The final lifespan remains `null`; `certified` remains `false`.
- No age-of-death, death date or final lifespan is generated.
- The Pinda parity / Harana completeness results do not complete the outstanding 76-rule Chapter XIV source audit.
- The 100-chart workflow and this report preserve per-chart traces so the remaining Chapter XIV UNKNOWN cases can be addressed without hiding missing evidence.

