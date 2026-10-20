# SMV ASTRO — Full Website 150 Horoscope + 150 Marriage Matching Audit

**Audit scope:** full natal Horoscope and Advanced Analysis, Ayurdaya/longevity research tracks, core and newer calculated fields, Tamil/English D1 narrative generation, 150 distinct pairwise Marriage Matching reports, source-level calculation optimization.

**Audit branch:** `audit/full-website-150-horoscope-150-matching`  
**Regression:** `tests/full-website-150-horoscope-150-matching-source-audit.mjs`  
**CI workflow:** `.github/workflows/full-website-150-horoscope-150-matching-source-audit.yml`  
**Status:** awaiting execution of the new CI run; do not call the 150/150 regression PASS until its run and artifact are inspected.

## Population and execution design

- 150 deterministic generated birth profiles are computed by the production `offline-engine.full()` path; input longitudes are not injected.
- The audit checks the full Horoscope path, 12 calculated Sripati Bhava midpoints, 16 configured Vargas, Vimshottari Mahadasha output, birth/daily Panchang, transit, Dasa phase output, and Advanced Analysis.
- Those same 150 calculated individual profiles feed 150 distinct pair combinations: 75 aligned pairs and 75 adjacent-bride combinations. This means **150 natal profiles plus 150 pair reports**, not 300 unique people.
- The report test checks both partners' C.G. Rajan and B.V. Raman Ashtakavarga Ayurdaya appendices and protects the no-final-lifespan/no-death-age output guard.
- Independent comparison of the seven grahas' Rasi Pinda, Graha Pinda and Sodhya Pinda is expanded to 1,050 graha rows (150 charts × 7 grahas).
- The production Matching functions are separately called per pair to check all 10 porutham rows, score arithmetic, Kuja balance/severity evidence, Dasa Sandhi interval structure, Dasa/dosha sync, final verdict structure and the two-person strength matrix.
- D1 narrative output is rendered from the live engine-calculated planetary positions in Tamil and English. This checks chart-specific variability and paragraph integrity; it is **not** a professional astrologer quality certification.
- Generated fixtures are reproducible technical QA inputs, **not verified real-person birth records**. This regression measures code-path behavior, structural integrity and calculation parity; it cannot prove that an astrological prediction matches a person's real life.

## Known source-level blockers that remain visible

| Area | Finding | Classification |
|---|---|---|
| Published admin prediction rules | `public/horoscope/prediction-rules-published.js` currently publishes `window.SMVPUBLISHED_PREDICTION_RULES = []`. Book-derived administrator-reviewed rules are not populated through this channel. | ROOT CAUSE — BLOCKED |
| B.V. Raman Chapter XIV longevity type | Some rule predicates remain `UNKNOWN` on normal charts when sunrise/hora, birth Dasa, varga or strength evidence is absent. A category cannot be certified by choosing one of multiple partial candidates. | PARTIAL — EVIDENCE REQUIRED |
| Ayurdaya final output | The research path intentionally returns `finalLifespan: null` and `certified: false`; no lifespan/death-age prediction is allowed. | SAFETY / SOURCE-CERTIFICATION GUARD |
| C.G. Rajan Ayurdaya selection | Tied or unavailable Shadbala reference selection must keep method alternatives visible; do not manufacture a winner or averaged final lifespan. | EVIDENCE-GATED |
| Classical Shadbala | Production Phase 3 is labelled “classical-style” and is not certified as a complete exact Parashari six-Bala engine by the existing source audit. | PARTIAL |
| BPHS Ashtakavarga Shodhana | Base BAV/SAV output is validated separately; Trikona/Ekadhipatya reductions must be treated as their own independently audited calculation, not assumed present just because the base table exists. | SEPARATE SOURCE ORACLE REQUIRED |
| Ashtottari / Kalachakra / Drigdasa | Latest rule-lineage work exists, but all aspects and applicability variants still need the named independent worked-example coverage from the source audits. | SOURCE CERTIFICATION NOT COMPLETE |
| “Real astrologer” narrative | Existing narrative regressions cover contextual change, Tamil/English prose and house coverage. They do not establish real-world predictive accuracy or expert-reviewed interpretive quality. | NOT CERTIFIED BY AUTOMATED QA |

## Optimization guardrails

The test retains source-level checks for one shared Ashtakavarga calculation inside Advanced Analysis and reuse of that result for Sodhya Pinda. It also retains a runtime smoke check that `matchingOnly:true` skips unnecessary Tajaka annual calculation, while the 150 Horoscope cohort uses the full path.

Any formula change must be accompanied by an independent printed-source or worked-example oracle and a counterexample/unknown-evidence case. A code path existing or a chart rendering successfully is not sufficient for a calculation PASS.
