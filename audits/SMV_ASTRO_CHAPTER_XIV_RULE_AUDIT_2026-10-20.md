# Chapter XIV — Source-Rule and Worked-Example Regression Audit

**Audit date:** 2026-10-20  
**Pull request:** [#68 — Audit remaining Chapter XIV rules against HPA source examples](https://github.com/smvastrorajaram-hub/smvastroservices/pull/68)  
**Regression workflow:** [B.V. Raman Ashtakavarga Ayurdaya Research QA, run #221](https://github.com/smvastrorajaram-hub/smvastroservices/actions/runs/39318136000)  
**Rule-by-rule JSON artifact:** [Download the Chapter XIV regression matrix](https://github.com/smvastrorajaram-hub/smvastroservices/actions/runs/39318136000/artifacts/12219096637)  
**Scanned primary-source page images:** [Download pp. 63–72 source-page artifact](https://github.com/smvastrorajaram-hub/smvastroservices/actions/runs/39318136000/artifacts/12218044080)

## Test result

The new Chapter XIV regression succeeded. It checks 45 distinct rule IDs across 114 rule-case evaluations and completed 704 assertions.

| Evidence result | Cases |
|---|---:|
| `MATCHED` | 46 |
| `NOT_MATCHED` | 45 |
| `UNKNOWN` | 23 |
| Total rule cases | 114 |
| Distinct rule IDs directly tested in this matrix | 45 |
| Source inventory | 76 unique rule IDs |

Every recorded case asserts that the runtime trace contains the rule, that the evaluator exists, that the expected status is returned, and that the printed page and rule number agree with the Chapter XIV source inventory.

The JSON artifact records each case's ID, category, printed page/rule number, source description, expected/actual status, synthetic chart overrides and explicit evidence inputs. This allows individual results to be reviewed without relying on a single PASS total.

## Scope of the fixtures

The test matrix includes:

- Chart-position based positive and negative examples for Balarishta, Alpayu, Madhyayu and Purnayu combinations.
- Three-way evidence tests (`true`, `false`, missing → `UNKNOWN`) for rules that depend on facts not recoverable from house placement alone, including sunrise/hora/Navamsa, Dasa-lord conjunction, weakness/placement, Drekkana and Shadvarga evidence.
- Source-page mapping assertions that prevent rule IDs from drifting away from their printed page/rule numbers.

**The constructed placements are unit-test fixtures inferred from the printed rule descriptions. They are not claimed to be natal charts printed verbatim in the book.** They validate individual evaluator behavior, not full-chart historical case reproduction.

## Book examples on printed pp. 68–69

The test preserves a separate source-fact manifest for three worked horoscopes:

| Source example | Printed page | Treatment in the regression |
|---|---:|---|
| Horoscope No. 1 | 68 | The stated birth Dasa lord Venus and its described conjunction with Saturn/Ketu are retained. The Balarishta-10 predicate matches when the book-stated conjunction observation is explicitly supplied; a Dasa-lord name alone remains `UNKNOWN`. |
| Horoscope No. 2 | 68 | The source prose says the Moon is afflicted by Saturn and Saturn strongly aspects the birth Dasa lord. That prose is not treated as a complete computed aspect/house oracle; predicates without their exact supporting geometry remain `UNKNOWN`. |
| Horoscope No. 3 | 69 | The prose describes Balarishta affliction and redemption with Jupiter in a quadrant. It is deliberately not forced into numbered Antidote-1, whose coded predicate specifically requires strong Jupiter in the Ascendant. The mismatch is retained as an explicit source-interpretation/cancellation-coverage gap. |

A consequential remaining job is to reconcile the complete Horoscope No. 2/3 chart symbols and the prose-described Jupiter-in-a-quadrant redemption against the scanned source, then add source-linked positive/negative examples for the relevant cancellation precedence. Do not silently broaden Antidote-1 from “Ascendant” to “any Kendra” merely to make one prose example match.

## What is—and is not—certified

- The test establishes reproducible evaluator behaviour for the stated source-rule inputs.
- All 76 Chapter XIV rule IDs have runtime trace entries; this matrix directly exercises 45 IDs, while earlier integrated tests cover additional IDs.
- This does **not** certify all 76 interpretations or all chart-level predicates, and it does not select a final longevity category.
- Chapter XIV continues to emit research candidates only. Final lifespan stays `null`; certification and customer-facing lifespan display remain disabled.
- The 100-chart / 50-pair audit is a separate calculation/parity check; its fixtures are generated QA inputs, not 100 verified real-person charts. Chapter XIV can still have unresolved rules or multiple candidate categories even when Chapter XXVI Harana inputs are complete.
