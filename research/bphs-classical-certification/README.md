# BPHS classical evidence reconstruction — research branch

## Scope

This branch isolates two outstanding proof tasks for a future BPHS natal Shadbala release:

1. Add an independent published historical longitude cross-check.
2. Build an auditable seven-graha × six-component BPHS source matrix.

No production calculation, renderer, horoscope default, marriage matching, cache, service worker, APK, Firebase, Render, Cloudflare or customer data is changed by this branch.

## Jacobi 1912 historical table cross-check

Primary source: H. Jacobi, “The Planetary Tables”, *Epigraphia Indica*, Vol. XII (1912), pp. 79–120.

- Jacobi states that the tables apply to dates from 300–2000 AD.
- Tables I–III provide mean longitudes; Tables IV–V provide equations to derive true longitudes.
- The published method uses mean sunrise at Lanka for the date's tabulated mean longitudes.
- Jacobi describes the tables as based on the Sūrya-Siddhānta without Bīja and says they were calculated from Warren's *Kalasankalita*.
- His 12 April 1168 worked example prints mean longitude inputs for Mercury, Venus, Mars, Jupiter, Saturn and Sun. He then demonstrates true longitude calculations for Venus and Saturn.

The regression `tests/jacobi-1912-planetary-tables-worked-example.mjs` reproduces the six printed mean values and the two complete printed True examples:

- Venus true longitude: 20°49′
- Saturn true longitude: 301°20′

This is a source-level worked-example PASS. It is not a 600-birth-epoch historical oracle. Jacobi's tables stop at 2000 AD, and their tabulated mean places refer to mean sunrise at Lanka rather than arbitrary exact birth times. The source-lineage note (Warren's *Kalasankalita*) is retained; this is a separate published tabulation, not a claim of wholly independent ancient parameters.

## BPHS 7 × 6 coverage inventory

`tests/bphs-seven-graha-six-bala-source-matrix.mjs` enumerates all 42 graha/component pairs and records their BPHS Chapter 27 source-rule locators, algorithms and existing independent test references.

The inventory is explicitly a coverage map, not a certificate. Several formula and component tests are green, but a complete independent per-natal numerical oracle has not yet been established for every one of the 42 rows. In particular, the five non-luminary Cheshta inputs require a single historical Mean / True / Sheeghroccheya chain at the exact birth epoch and in a consistent frame.

## Existing production boundary

At the current `main`, Horoscope `strength6` is supplied by the B.V. Raman implementation. The source states that it is not the BPHS calculator. BPHS arithmetic exists in research modules and regression tests, but the combined BPHS regression explicitly reports `fullShadbalaCertified:false`. This branch therefore does not change the production `classicalCertified` field or claim a BPHS production release.

## Merge gate

Do not change any generic natal result to `classicalCertified:true` until all of the following are complete and verified:

- a historical independent longitude comparator covering the requested supported epochs, all five eligible planets, and a documented exact-birth-time treatment;
- all 42 BPHS matrix rows independently verified with primary-source rule locators, formula checks, units, frame/epoch provenance and numeric tolerances;
- BPHS five-planet Cheshta source inputs certified for arbitrary exact natal epochs;
- BPHS Node/browser parity for all seven grahas and six components;
- Yuddha eligibility, victor, magnitude and final Kala recomposition source-certified;
- current CI fully green on the merged-base head.

The tests in this branch intentionally keep `classicalCertified:false` and `productionEligible:false` while any of those conditions is unmet.
