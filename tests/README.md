# Test suite map and retention rules

This folder intentionally contains two kinds of checks:

## Automated CI checks

- `.github/workflows/horoscope-matching-dst-qa.yml`: core Horoscope/Matching, Dasha, report/save/print, location, DST, boundary, and selected BPHS/numerical regression checks.
- `.github/workflows/cg-rajan-ayurdaya-research-qa.yml`: CG Rajan Pinda/Naisargika/Amsa Ayurdaya source arithmetic, consolidated five-chart natural/Pinda integration, bilingual report placement, and saved-report/print guards.
- `.github/workflows/horoscope-result-layout-browser-smoke.yml`: V358/V359 browser geometry checks.
- `.github/workflows/marriage-print-browser-smoke.yml`: Chromium native-print integration.
- `.github/workflows/smv-output-pdf-report-audit.yml`: searchable-text audit of checked-in PDF fixtures.
- `.github/workflows/world-timezone-certification.yml`: independent IANA/tzdata comparison. `global-timezone-probe.mjs` is a helper invoked by `global-timezone-audit.py`; it is not an unused standalone test.

## Standalone source-oracle / research checks

Several BPHS, C.G. Rajan Jathaka Kanitham/Shadbala, Uttara Kalamrita, Surya Siddhanta, and V357–V368 files preserve independent printed-number or published-reference comparisons, partial-component tests, or explicit certification blockers. They are not all part of the fast core regression job. Run a standalone test explicitly with:

```sh
node tests/<test-file>.mjs
```

These scripts must not be deleted merely because they are not listed as a step in the core workflow. A printed numerical oracle, a five-natal integration guard, a report-rendering regression, and a research/certification blocker can cover overlapping subject matter while asserting different requirements.

## Cleanup policy

- Keep each independently sourced numerical oracle and safety/certification gate unless its assertions are shown to be fully covered by another retained test.
- Keep workflow trigger paths scoped to tests that the workflow actually executes. This avoids running the full core suite and live production checks when an unrelated manual research fixture changes.
- Keep live Render checks separate from browser/static production HTTP checks and from source-only regression runs.
- The duplicate five-chart CG Rajan natural-arithmetic pass was consolidated into `cg-rajan-ayurdaya-pinda-customer-report-regression.mjs`. Its 5-birth × 7-graha range checks and no-lifespan/no-cross-book safety assertions remain active there; the standalone script and its duplicate CI invocation are removed.
