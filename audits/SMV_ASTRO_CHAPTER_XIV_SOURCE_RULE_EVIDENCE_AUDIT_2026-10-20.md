# SMV ASTRO — B. V. Raman Chapter XIV source-rule evidence audit

**Audit date:** 2026-10-20  
**Repository change:** [PR #65 — Ayurdaya missing-evidence and Shadbala tie correction](https://github.com/smvastrorajaram-hub/smvastroservices/pull/65)  
**Chapter XIV rule regression:** [Workflow run 232](https://github.com/smvastrorajaram-hub/smvastroservices/actions/runs/39321824507)  
**Rule-by-rule evidence artifact:** [Download JSON evidence matrix](https://github.com/smvastrorajaram-hub/smvastroservices/actions/runs/39321824507/artifacts/12220013195)  
**100-chart regression:** [Workflow run 51](https://github.com/smvastrorajaram-hub/smvastroservices/actions/runs/39321824398)

## What was added

The Chapter XIV rule inventory contains 76 source-numbered rules across Balarishta, Antidote, Alpayu, Madhyayu and Purnayu, sourced to B. V. Raman, *Hindu Predictive Astrology*, 20th edition (1992), printed pp. 63–72.

The rule-by-rule test file now has source-linked cases for **all 76/76 rule IDs**. Each rule is traceable to a printed page and source-rule number, and the suite tests positive and negative combinations; rules with incomplete-input states also retain explicit UNKNOWN cases.

| Regression measure | Result |
|---|---:|
| Distinct Chapter XIV source-rule IDs covered | 76 / 76 |
| MATCHED fixture outcomes | 48 |
| NOT_MATCHED fixture outcomes | 45 |
| UNKNOWN fixture outcomes | 23 |
| Individual source-rule fixture outcomes | 206 |
| Actual, partially replayed book horoscope examples | 3 |

The 76/76 assertion is part of the automated test, so a future change that omits a source rule from the matrix fails CI. The three outcomes are not one-per-rule: rules with incomplete source inputs can have UNKNOWN cases, and rules whose fixtures are adequately demonstrated by the text receive the positive/negative cases supported by their available conditions.

The separate integrated regression also adds MATCHED / NOT_MATCHED / UNKNOWN triplets for the 17 predicates that remained UNKNOWN in the first 100-chart fixture, so missing evidence handling is tested directly rather than inferred from this aggregate count.

## Book examples and limits

The three chart/horoscope examples present in the scanned chapter are kept separate from the constructed source-rule fixtures.

- **Book example 1:** Moon-in-Kendra and Moon-affliction predicates can be replayed from the source-stated geometry. The birth-Dasa-lord conjunction rule remains dependent on the source-stated Venus/Saturn/Ketu conjunction; the Dasa-lord name alone is not enough.
- **Book example 2:** predicates whose complete aspect/placement geometry is not stated in the prose remain UNKNOWN. Missing planetary facts are not synthesized.
- **Book example 3:** the text states strong Jupiter in a quadrant as a protective/redemption condition. The general strong-Jupiter antidote is recorded, but cancellation precedence across the full chapter remains a separate source-validation task.

The additional positive/negative fixtures are **constructed rule tests derived from the printed rule statements**. They are not represented as historical natal charts or worked-chart values printed by Raman. This distinction is recorded in the JSON artifact.

## Remaining UNKNOWNs in the 100 generated chart inputs

The 100-chart audit still uses generated QA birth inputs, not verified real-person records. Even though all 76 evaluators are present and the 100-chart Chapter XXVI Harana input paths resolve, some Chapter XIV source predicates require evidence that a plain natal-longitude chart does not provide by itself.

The 17 rule IDs that stayed UNKNOWN in the first chart of the audit fixture population included the following evidence-gated conditions:

| Rule IDs | Information required before automatic evaluation |
|---|---|
| XIV-BAL-04 | Minutes from sunrise/sunset, Moon hora, and malefics in malefic-sign Navamsas |
| XIV-BAL-10, XIV-BAL-15 | Birth Dasa / Antardasa lord and source-specific conjunction relationship |
| XIV-BAL-28 | Weakness and bad-placement evidence for Lagna lord / Moon-sign lord |
| XIV-ANT-04, XIV-ANT-07, XIV-ANT-09 | Full-Moon status, benefic enclosure/aspects and related geometry |
| XIV-ANT-05, XIV-MAD-02, XIV-MAD-15 | Independently validated strength classifications |
| XIV-ANT-10 | Shadvarga/Navamsa benefic-protection placements and aspects |
| XIV-ALP-06, XIV-ALP-12, XIV-ALP-14 | Powerlessness/strength and no-benefic-aspect evidence |
| XIV-MAD-03 | Complete calculated Mercury/Jupiter/Venus house placements |
| XIV-MAD-04 | Source-confirmed interpretation of “middle four houses” and all-graha placements |
| XIV-PUR-02 | All nine positions plus graha-nature state; uncertain Moon/Mercury nature must remain UNKNOWN |

These are input/evidence blockers, not missing evaluator functions. Rule-level fixtures prove that the current evaluators preserve MATCHED, NOT_MATCHED and UNKNOWN when evidence is supplied or withheld; they do **not** turn those unknown facts into known facts for real birth charts.

## Latest numeric-track guardrails

The separate Chapter XXVI/100-chart run still checks 100 engine-calculated charts, 50 Matching pairs and exact row parity between modified Sodhya Pinda and the Ashtakavarga Ayurdaya appendix:

- Rasi Pinda: 700/700 rows match.
- Graha Pinda: 700/700 rows match.
- Sodhya Pinda: 700/700 rows match.
- Chapter XXVI Harana: 100/100 fixtures have complete inputs in the re-audit.
- C.G. Rajan: the eight Shadbala ties render all tied method results and separate totals (four Pinda+Amsa; four Naisargika+Amsa).

The numeric longevity candidates and qualitative Chapter XIV candidates remain separate. In the 100 generated QA fixtures, the numeric band appears in the Chapter XIV candidate list in 56 cases, is absent from a non-empty candidate list in 42, and no Chapter XIV category candidate is confirmed in 2. These are list relationships only—not proof of 42 true contradictions or 56 independent validations. Chapter XIV has **zero** cases in this audit where all predicates are evaluated and a single category is uniquely selected.

## Certification boundary

- No final lifespan, death age or date is emitted.
- Chapter XIV remains research-only until the evidence-dependent predicates and cancellation/antidote precedence have independent source-linked chart validation.
- To validate the real-person calculation path, the next test population needs verified birth data (date, local time, coordinates, time-zone provenance) and independently checked source-chart results. The current generated QA inputs are not an accuracy certificate for real people.
