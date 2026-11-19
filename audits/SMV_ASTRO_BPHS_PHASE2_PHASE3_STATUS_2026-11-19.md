# SMV ASTRO — BPHS Phase 2 / Phase 3 status and isolated engine

**Audit date:** 19 November 2026  
**Base main commit:** \`1369b09985e93301f2d1407e08aee229697da5ae\`  
**Scope:** Shadbala Phase 2, Phase 3, customer-facing wiring, and reusable BPHS source modules.

## Executive result

- **Phase 2 exists, but it is not BPHS Shadbala.** The V158 \`strength2\` layer is explicitly an SMV composite score. It uses a simplified dignity score, distance from an ideal house, speed-based Cheshta estimate, weekday/benefic constants for Kala, and house-aspect counts for Drik. It must not be described or certified as BPHS.
- **Phase 3 BPHS-style source code exists, but a complete live Phase 3 engine does not.** The browser module retains independently tested helpers for BPHS Sthana, Paksha, Ayana, Ahargana, Drig and related arithmetic. BPHS source modules also cover exact Sputa Drishti, Drig aggregation, Yuddha arithmetic and five-planet Cheshta arithmetic.
- **The historical BPHS \`strength3\` output was deliberately removed from production.** The consolidated regression asserts that browser and Node production code do not emit \`strength3\`. Customer-facing \`strength6\` is the B.V. Raman engine.
- Therefore, a complete BPHS six-Bala integration was missing. Rewriting all existing helpers would duplicate code and risk source divergence.

## Existing code reused by the isolated engine

| Existing source | Reused responsibility |
|---|---|
| \`swiss_vedic.browser.mjs\` | BPHS Sthana (including seven vargas, Ojayugma and Drekkana), Paksha, Ayana, Ahargana and Drig |
| \`bphs-sputa-drishti.browser.mjs\` | Exact-degree BPHS Sputa Drishti |
| \`bphs-shadbala-rectification.browser.mjs\` | BPHS v19 signed Drig aggregation and v20 pre-war-difference Yuddha |
| \`bphs-swiss-solar-cheshta.browser.mjs\` | BPHS five-planet Mean/True/Sheeghrocca input selection and Cheshta arithmetic |
| \`saura-classical-mean-motion.browser.mjs\`, \`saura-classical-true-longitude.browser.mjs\`, \`saura-natal-five-cheshta.browser.mjs\` | Existing classical-astronomy research chain; still explicitly uncertified |

## New isolated integration

Added in branch \`feat/bphs-shadbala-core-isolated-20261119\`:

- \`public/horoscope/offline/bphs-shadbala-engine.browser.mjs\`
- \`tests/bphs-shadbala-engine-core-regression.mjs\`
- \`.github/workflows/bphs-shadbala-engine-core-qa.yml\`

The new module composes the existing BPHS components into Sthana, Dig, Kala, Cheshta, Naisargika and Drig, applies BPHS v20 Yuddha from pre-war totals, and returns Virupa, Rupa, Required Strength and Ratio.

## Safety and completeness boundaries

1. Seven graha longitudes must declare one shared reference-frame ID.
2. All five Cheshta triples must declare the same frame ID for Mean Sun, Mean Planet, True Planet and Sheeghrocca.
3. Each supplied True Longitude must match that graha's chart longitude in the same frame. Missing or mixed-frame inputs throw; the module does not guess.
4. All twelve Dig Bala cusps, seven tropical declinations, speed and ecliptic latitude inputs, sunrise-selected Ahargana lords, apparent solar hour and an explicit Yuddha review are required.
5. Sun Chesta reuses BPHS Ayana Bala; Moon Chesta reuses BPHS Paksha Bala. The five other eligible planets use the already-existing BPHS input selector and formula.
6. \`classicalCertified\` remains false and \`productionIntegrationAllowed\` remains false. The module is not imported by the live chart path and is not placed in the service-worker cache.
7. The eight named Cheshta motion states are not yet independently source-validated and are explicitly listed as a limitation. The five-planet historical Mean/True/Sheeghrocca chain and arbitrary-epoch Bija/mandocca accuracy also remain uncertified.
8. This change does not modify the customer-facing B.V. Raman \`strength6\`, Horoscope or Marriage Matching output, service-worker cache versions, production deployments, or APKs.

## Release decision

This is the missing integration core only—not a full classical certification and not a production switch. CI must pass on the draft PR, then the source/astronomy blockers must be resolved independently before any later UI wiring. Do not recreate Phase 2, the existing BPHS component helpers, or the existing BPHS reference arithmetic.
