# SMV ASTRO — Modern Moshier vs JPL DE441 Accuracy Evidence Certificate

**Certificate ID:** SMV-RESEARCH-MOSHIER-DE441-005-2026-11-20  
**Issued:** 2026-11-20  
**Status:** PASS — repository-internal, reproducible numerical evidence  
**Scope key:** `MODERN_MOSHIER_GEOCENTRIC_APPARENT_TROPICAL_VS_DE441`

> This is an internal research/CI evidence certificate, not an external accreditation, observatory certification, or certification of the historical Classical Bīja model.

## 1. Certified claim

The explicitly selected Swiss Ephemeris **Moshier** algorithm (`MOSEPH`, flag 4) agrees with the independent NASA/JPL Horizons **DE441** Earth-geocentric apparent longitude fixture to within the predeclared maximum absolute residual limit of **0.05°** for every tested planet at all 600 annual checkpoints from 1800-01-01 through 2399-01-01.

- Annual samples per planet: 600
- Planets: 5
- Total comparisons: 3,000
- Acceptance rule: for each planet, maximum wrapped absolute longitude residual `<= 0.05°`
- Measured worst residual: **0.00783929°**
- Threshold-to-observed ratio: **approximately 6.38×**
- Remaining absolute margin to the threshold: **0.04216071°**

## 2. Numerical results

| Planet | Samples | RMS residual | 95th-percentile absolute residual | Maximum absolute residual | Gate |
|---|---:|---:|---:|---:|---|
| Mercury | 600 | 0.00219727° | 0.00555679° | **0.00783929°** | PASS |
| Venus | 600 | 0.00184286° | 0.00454005° | 0.00609985° | PASS |
| Mars | 600 | 0.00097395° | 0.00245549° | 0.00360333° | PASS |
| Jupiter | 600 | 0.00024697° | 0.00062425° | 0.00102214° | PASS |
| Saturn | 600 | 0.00016420° | 0.00037405° | 0.00073721° | PASS |

Every per-planet assertion is enforced by the regression test. The workflow fails if any planet's maximum absolute residual exceeds 0.05°.

## 3. Method and source identity

**Candidate calculation**
- Bundled Swiss Ephemeris WebAssembly module.
- Explicit Moshier mode: `MOSEPH = 4`.
- The test asserts the returned ephemeris flag includes `MOSEPH`; it does not describe this result as SWIEPH.
- Gregorian UTC 1 January checkpoints are converted to ET Julian day using `swe_utc_to_jd`.
- The candidate longitude is checked as a finite, normalized tropical longitude.

**Independent reference**
- NASA/JPL Horizons DE441.
- Earth-geocentric apparent observer quantity 31.
- Earth centre: 399 / observer centre `500@399`.
- Planetary-system targets in the fixture: Mercury 199, Venus 299, Mars barycentre 4, Jupiter barycentre 5, Saturn barycentre 6.
- 600 annual fixture rows per planet, with DE441 source identity checked by the source-audit workflow.

**Comparison contract**
- Tropical ecliptic-of-date longitude on both sides.
- No Lahiri or Saura ayanāṃśa subtraction.
- No interpolation between annual checkpoints.
- Signed angular difference is wrapped to the shortest range before absolute residual, RMS and percentile calculations.

## 4. Reproducible repository evidence

- Regression source: [`tests/saura-bija-modern-moshier-de441-accuracy.mjs`](../../tests/saura-bija-modern-moshier-de441-accuracy.mjs)
- Historical DE441 fixture: [`tests/fixtures/saura-bija-jpl-de441-annual-1800-2399.json`](../../tests/fixtures/saura-bija-jpl-de441-annual-1800-2399.json)
- Workflow: [`.github/workflows/saura-bija-historical-600y-qa.yml`](../../.github/workflows/saura-bija-historical-600y-qa.yml)
- Test/workflow commit: [`0bb20ae27cbeb0f5c1ba543c2961c7d43e668a9b`](https://github.com/smvastrorajaram-hub/smvastroservices/commit/0bb20ae27cbeb0f5c1ba543c2961c7d43e668a9b)
- Full numerical-output Actions run: [`#44597278434`](https://github.com/smvastrorajaram-hub/smvastroservices/actions/runs/44597278434) — SUCCESS; the Moshier-specific step completed and emitted all 3,000 comparison results.
- Follow-up full workflow run after the documentation-only PR update: [`#44597476275`](https://github.com/smvastrorajaram-hub/smvastroservices/actions/runs/44597476275) — SUCCESS; all 8 substantive validation steps, including the Moshier 0.05° step, completed.

The Moshier test and workflow were added in the test/workflow commit above. The subsequent PR-tip commit `2e6c4051a3a0e8e1772d35663a61470205fab9cb` updated the research README only; it did not change the Moshier source, fixture, test, or workflow. The follow-up run confirms the workflow remained green at that PR tip.

## 5. Explicit exclusions — not certified by this document

This certificate does **not** certify:
- `CLASSICAL_BIJA_TRUE` against DE441 at 0.05°. The separate Phase C historical-model gate remains **FAIL**, with multi-degree residuals.
- Bīja mean motion, Mandocca, Manda, Śīghra, or the historical Sūrya-Siddhānta model as a modern high-accuracy ephemeris.
- Daily, sub-daily, arbitrary-epoch, station-point, or continuous 1800–2399 accuracy. The certified grid is 600 annual checkpoints per planet.
- Swiss Ephemeris **SWIEPH** mode or use of external Swiss planetary `.se1` files. The verified candidate is explicitly Moshier.
- Production Horoscope calculations, BPHS Shadbala, Marriage Matching, Calendar, APKs, deployed services, or customer-facing astronomical output.

Classical Bīja and modern Moshier/DE441 remain separate named products. No Moshier values are inserted into the historical Bīja constants or correction sequence.

## 6. Integrity and change boundary

The numerical result is tied to the cited source commit, checked-in DE441 fixture, executable regression, and GitHub Actions run IDs above. The certificate records the test's measured output and the scope of its assertions; it is not a claim of third-party endorsement.

All work remains in the isolated research PR. No production calculation, Swiss/Lahiri provider, customer data, cache version, APK, Render, Cloudflare, Firebase, or deployed service is changed by this evidence record.
