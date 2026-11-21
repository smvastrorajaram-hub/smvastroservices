# TRUE BPHS historical certification — production source audit (2026-11-21)

**Scope:** inspect the current production TRUE BPHS NAELOS Shadbala engine and the historical evidence required before any generic `classicalCertified` promotion.

**Base audited:** current `main` at audit start, commit `4336cd698f86241c2b45c9d515a06441794e5d98`.

## Result

**NOT CERTIFIED — keep `classicalCertified:false`.** This is not a rejection of the BPHS Chesta formula. It is a finding that the historical astronomical inputs required by that formula are not yet independently established for arbitrary natal epochs.

## 1. What production currently calculates

Source: `public/horoscope/offline/true-bphs-naelos-engine.browser.mjs`.

- Seven grahas × six Bala components are assembled.
- The five non-luminary Chesta values use `bphsFivePlanetCheshtaFromClassicalMeans`.
- The input selector is `sauraFivePlanetCheshtaInputs` from `saura-classical-mean-motion.browser.mjs`.
- The True Longitude passed into that calculation is required to equal the NAELOS planetary position at the exact epoch.
- The result labels the Chesta method `TRUE_BPHS_CH27_V365_MEAN_NAELOS_TRUE_LONGITUDE` and explicitly records `trueLongitudeHistoricalCertified:false`.
- The chart result, per-graha result and Ishta/Kashta result remain `classicalCertified:false`, `provisional:true`, and research-only.

This is a same-epoch, common-effective-Lahiri-frame calculation, but a common coordinate frame does not prove that Mean, True and Sheeghroccheya are a coherent historical source model. The production Chesta inputs currently combine V365 Mean/Sheeghroccheya with modern NAELOS/JPL DE440 apparent True Longitude. That is a modern hybrid calculation, not an independently reconstructed historical Saura triple.

## 2. Historical source evidence currently available

### Mean Longitude

Burgess (1860), pp.164–165, supports a limited Bīja-corrected source reconstruction. The 1 Jan 1860 Ujjain anchor regression covers six classical bodies and has maximum residual 0.9674 arcsec against a 1.5 arcsec tolerance. It is one printed epoch anchor, not a complete independent table for every natal epoch.

### True Longitude

The Sūrya-Siddhānta II.39–45 four-pass method and a historical worked example are available. However, the 3,000 annual modern DE441 comparisons show that the reconstructed Bīja True positions do not meet the declared 0.05° modern accuracy gate:

| Planet | RMS absolute residual | 95th percentile | Maximum |
|---|---:|---:|---:|
| Mercury | 4.734911° | 6.802282° | 7.588441° |
| Venus | 5.890850° | 13.715045° | 21.503665° |
| Mars | 5.753817° | 7.230395° | 9.925365° |
| Jupiter | 2.477131° | 3.540302° | 3.993845° |
| Saturn | 6.007322° | 8.866978° | 9.459852° |

These are model-vs-modern-reference diagnostics, not proof that a historical text was wrong. They do establish that the current reconstructed model must not be advertised as a modern-accuracy true-position engine.

### Sheeghroccheya

B.V. Raman, *Graha and Bhava Balas*, Ch.VI §§102–105, pp.76–78, provides a worked example but has a Saturn source conflict: §104 p.77 prints 151.23°, while Example 49 p.78 uses 181.23° and derives 63.42° Chesta Kendra / 21.14 Chesta Bala. A single worked example does not certify arbitrary epochs.

### Jacobi (1912)

Jacobi, *The Planetary Tables*, Epigraphia Indica XII, pp.79–120, supplies useful historical mean-table and two direct True Longitude worked examples (Venus and Saturn) at mean sunrise in Lanka on 12 April 1168. The source also contains internal printed arithmetic inconsistencies in the Mercury and Sun rows. The table's epoch and time convention do not provide an exact-time independent oracle for 600 random natal epochs or the full 1800–2399 range.

### PAC 2026

The existing Government of India / IMD PAC 2026 comparison is a valuable contemporary numerical benchmark. It is not an independent historical oracle for the traditional Saura Mean/True/Sheeghroccheya chain.

## 3. Remaining certification blockers

1. Independent historical True Longitude oracle coverage is 0 rows for the 600 sampled natal epochs.
2. The Bīja True model fails the declared 0.05° modern-accuracy gate for all five planets.
3. Sheeghroccheya remains a limited worked-example source with an unresolved Saturn printed conflict.
4. The production Chesta input chain mixes V365 Mean/Sheeghroccheya with NAELOS modern True Longitude.
5. The 42-row Bala evidence matrix is largely a single 1918 worked-example comparison; it is not 42 independent arbitrary-epoch natal oracles. Jupiter Drik retains an open source discrepancy.
6. The 24-Jya versus continuous implementation diagnostic has one Venus sample above its 0.05° comparison threshold (0.0532318994°).
7. Full event-window coverage (stations, retrograde turns, sign boundaries and conjunctions), independent Yuddha oracle coverage, and final exact-epoch browser/node certification must remain explicit gates.

## 4. Safe decision

- Do not change production `classicalCertified:false` to `true`.
- Do not relabel the NAELOS modern apparent longitude as a historical Saura True Longitude.
- Do not feed modern True Longitude into a classical Mean/Sheeghroccheya Chesta formula and call the triple historically certified.
- Keep the current calculation available only with its actual source/method metadata and provisional status.
- Continue the historical research as separate candidate outputs until independent printed-source oracles, coherent source lineage, exact-epoch coverage and all six Bala/Yuddha gates pass.

## References

- Burgess, *Translation of the Sūrya-Siddhānta* (1860), pp.164–165 and II.39–45.
- H. Jacobi, *The Planetary Tables*, Epigraphia Indica XII (1912), pp.79–120.
- B.V. Raman, *Graha and Bhava Balas*, 13th ed., Ch.VI §§99–107, pp.72–79.
- Repository evidence ledger: `research/natal-classical-certification/historical-longitude-evidence-ledger.json`.
- Repository gate: `research/natal-classical-certification/evidence-gates.mjs`.
- Repository source: `public/horoscope/offline/true-bphs-naelos-engine.browser.mjs`.

**Certification verdict: NOT CERTIFIED.** The correct current value remains `classicalCertified:false` until the above evidence is supplied and the production input model is demonstrably coherent.
