# Test suite map and retention rules

This folder intentionally contains two kinds of checks:

## Automated CI checks

- `.github/workflows/horoscope-matching-dst-qa.yml`: core Horoscope/Matching, Dasha, report/save/print, location, DST, boundary, and non-Shadbala numerical regression checks.
- `.github/workflows/bv-raman-strength6-qa.yml`: the live seven-graha `strength6` engine, B. V. Raman Standard Horoscope numeric oracles, browser/Node parity, five natal integration charts, Ishta/Kashta separation, and the CG Rajan Ayurdaya/report bridge. The historical Chesta input chain remains explicitly uncertified where published traditional astronomical values do not reconcile.
- `.github/workflows/cg-rajan-ayurdaya-research-qa.yml`: CG Rajan Pinda/Naisargika/Amsa Ayurdaya source arithmetic, consolidated five-chart natural/Pinda integration, bilingual report placement, and saved-report/print guards.
- `.github/workflows/cg-rajan-jathaka-kanitham-shadbala-qa.yml`: independent C.G. Rajan printed-source Shadbala research and five-natal integration, plus a standalone BPHS Drig-source oracle. BPHS `strength3` is no longer a production chart result; production Shadbala is B. V. Raman `strength6`.
- `.github/workflows/uttara-kalamrita-six-bala-source-qa.yml`: independent Uttara Kalamrita six-Bala, Section III Ayurdaya, 2026 IMD Cheshta inputs, V363/V364/V366 numerical evidence, V367 certification blockers, V368 published-stage audit, and five-natal integration. Nine independent Ayurdaya/Cheshta oracles are consolidated in `uttara-kalamrita-cheshta-ayurdaya-combined-regression.mjs`, including the official IMD 2026 live discrepancy check and the Surya Siddhanta five-graha natal Cheshta research engine check.
- `.github/workflows/horoscope-result-layout-browser-smoke.yml`: V358/V359 browser geometry checks.
- `.github/workflows/marriage-print-browser-smoke.yml`: Chromium native-print integration.
- `.github/workflows/smv-output-pdf-report-audit.yml`: searchable-text audit of checked-in PDF fixtures.
- `.github/workflows/world-timezone-certification.yml`: independent IANA/tzdata comparison. `global-timezone-probe.mjs` is a helper invoked by `global-timezone-audit.py`; it is not an unused standalone test.

## Standalone source-oracle / research checks

Several BPHS, C.G. Rajan Jathaka Kanitham, Uttara Kalamrita, B. V. Raman, and Surya Siddhanta checks preserve independent printed-number comparisons, source-specific research, or certification blockers. `bphs-shadbala-combined-regression.mjs` now runs only the standalone BPHS Drig-angle oracle and guards that the live browser/Node production engines do not emit `strength3`. The B. V. Raman worked-horoscope and natal integration fixtures live in `bv-raman-strength6-regression.mjs`. The nine Uttara Kalamrita/IMD/Surya Cheshta and Ayurdaya oracles are consolidated in `uttara-kalamrita-cheshta-ayurdaya-combined-regression.mjs`. Other checks may still be run explicitly with:

```sh
node tests/<test-file>.mjs
```

These scripts must not be deleted merely because they are not listed as a step in the core workflow. A printed numerical oracle, a five-natal integration guard, a report-rendering regression, and a research/certification blocker can cover overlapping subject matter while asserting different requirements.

## Cleanup policy

- Keep each independently sourced numerical oracle and safety/certification gate unless its assertions are shown to be fully covered by another retained test.
- Keep workflow trigger paths scoped to tests that the workflow actually executes. This avoids running the full core suite and live production checks when an unrelated manual research fixture changes.
- Keep live Render checks separate from browser/static production HTTP checks and from source-only regression runs.
- The duplicate five-chart CG Rajan natural-arithmetic pass was consolidated into `cg-rajan-ayurdaya-pinda-customer-report-regression.mjs`. Its 5-birth × 7-graha range checks and no-lifespan/no-cross-book safety assertions remain active there; the standalone script and its duplicate CI invocation are removed.
- The standalone `cg-rajan-jathaka-kanitham-shadbala-print50-oracle.mjs` was folded into `cg-rajan-jathaka-kanitham-shadbala-source-qa.mjs`: its independent p.50 component table, six-Bala subtotal, after-Drig and final/Yuddha arithmetic checks are preserved and now compared with the implementation's exported source table. The standalone duplicate was removed, and the comprehensive source/integration tests now run in their own focused workflow.
- The overlapping `v361-uttara-kalamrita-shadbala-regression.mjs` was consolidated into `uttara-kalamrita-only-six-bala-book-oracle.mjs` and `uttara-kalamrita-five-natal-intermediate-integration.mjs`. The unique Drig aspector-classification and live-chart evidence assertions were transferred; the newer retained tests now run from a focused Uttara Kalamrita workflow.

- `.github/workflows/full-website-150-horoscope-150-matching-source-audit.yml`: full-engine 150 Horoscope + 150 distinct pair report regression. Compares 1,050 seven-graha Pinda rows, checks Panchang/Transit/Dasa/16 Varga structure, Tamil/English D1 narrative variability, all 10 production Matching factors, Kuja/Dasa-sandhi evidence and final verdict structure. It uses deterministic synthetic birth inputs; it does not certify real-person predictive accuracy. The audit intentionally keeps Ayurdaya final lifespan uncertified and records the empty published admin prediction-rule set as a blocker.
