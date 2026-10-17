# SMV ASTRO — Saturn Manda-Karna and two-date 2024 Four-Correction Reconciliation

**Date:** 17 October 2026 (IST)  
**Primary text:** Sūrya Siddhānta, Chapter II, verses 29–45 (mean, manda and śīghra corrections).  
**External independent published worked numbers:**
- https://rkanetech.com/true-position (Caitanya worked example, five visible planets).
- Santhoju et al., *Journal of Astrophysics and Astronomy* 46:9 (2025), Tables 6, 7 and 9: https://doi.org/10.1007/s12036-024-10018-8 ; accessible transcription: https://www.scribd.com/document/977832014/suryasiddhant

## Root cause narrowed: signed-koti handling in Manda epicycle

Previous attempt to replace all Manda denominators with `R−(signed koti)` is **NOT** a general solution: it corrects the published Saturn sample, but creates larger Mercury and Mars errors. A single different **universal** research convention, `R−|koti|`, reproduces **all five** of the independently published Caitanya worked example using the 24 classical Jya entries (3438 radius), with no planet-dependent fitting. This is an arithmetic reconstruction of one publication, **not** independent proof that this is the uniquely correct historical reading of Chapter II for all eras.

Three systematically parameterized and independently numerically checked conventions now exist in the *research-only* geocentric calculation functions:
- `common-plus`: `R + signed koti` for Manda; reproduces **4/5** Caitanya final planet values within 0.0001°, except Saturn.
- `alternate-minus`: `R − signed koti`; reproduces **only Saturn** at 0.0001° and loses previously correct Mercury/Mars.
- `absolute-koti-minus`: `R − |koti|` for Manda, unchanged Śīghra `R+signed koti`; reproduces **all 5/5** Caitanya final planet values at 0.0001°. This is a consistent, single-branch rule; it is applied to all five grahas in the *research-only* birth-date Cheshta model. No customer's live `strength3` has been changed.

## Fixed published-example five-graha numerical oracle

| Graha | Published ° | 24-Jya universal `R−|koti|` ° | Absolute difference ° |
|---|---:|---:|---:|
| Mercury | 338.236980 | 338.236988 | 0.000008 |
| Venus | 7.292850 | 7.292852 | 0.000002 |
| Mars | 280.251060 | 280.251060 | <0.000001 |
| Jupiter | 264.436320 | 264.436313 | 0.000007 |
| Saturn | 232.004070 | 232.004077 | 0.000007 |

Saturn's **independently published intermediate corrections** under this same convention: half-Manda 0.711045° (book example ≈ 0.71105°), full-Manda 1.313097° (book example ≈ 1.31310°). This verifies the historical publication's *internal numerical algorithm* much more specifically than merely matching the final result.

## Cross-source limitations — 2024 paper does not fully agree

The Santhoju et al. 2024 April **9** and April **13** published corrections/True Longitudes have a different numerical trace. Two actual dates were compared under all three Manda conventions with their original printed mean, mandocca and śīghrocca inputs.

**Universal `R−|koti|` minus printed final True Longitude**, absolute angular difference (degrees, numeric research calculation):

| 2024 sample | Mercury | Venus | Mars | Jupiter | Saturn |
|---|---:|---:|---:|---:|---:|
| April 9 (Tables 6–7) | 0.521343 | 0.004290 | **3.301310** | 0.399829 | 0.0547 |
| April 13 (Table 9) | 0.178507 | 0.005523 | **3.339614** | 0.362429 | 0.056450 |

The Mars mismatch persists well above 3° for both separate dates under *all three* choices: it CANNOT be explained by simply flipping the sign of the Manda cosine term. The JAA tables' first stage column equals mean + **twice** the numerical Table-6 “half Śīghra correction” column, while their subsequent stage equations contain further distinct interpretations; do not silently use Table 7 as a direct one-step numerical oracle for the four passes. The two source examples therefore cannot presently be treated as the same agreed classical numerical method.

## Code and tests

1. `public/horoscope/offline/saura-classical-true-longitude.browser.mjs`: continuous-geometry research modes, explicit source convention.
2. `public/horoscope/offline/saura-classical-tabular-jya.browser.mjs`: printed 24-Jya independent table implementation with same modes.
3. `public/horoscope/offline/saura-natal-five-cheshta.browser.mjs`: one consistent `absolute-koti-minus` research candidate for all five planets; no date/planet parameter fitting; certification flags **remain false**.
4. `tests/saura-manda-karna-two-source-numerical-reconciliation.mjs`: all three modes, exact 5/5 published sample, two separate 2024 academic sample dates, and 25 five-Perambalur birth-engine integrations (1971, 1974, 1992, 1994, 2015).
5. Previous official V365 uncorrected means, V366 published-input BPHS Cheshta arithmetic, Phase3 Drig/Naisargika/sixfold tests remain intact.

## Certification / release verdict

**PASS condition only for 5/5 external Caitanya worked example reproduction under the expressly selected universal Manda convention.** This is **not** sufficient to certify the true positions for all natal dates, nor all six Shadbala components. Full 25 historically independent traditional same-frame planetary oracles and source-consistent historical Bija/Mandocca parameters are unavailable. The academic paper's two Mars numerical mismatches remain. No release to live Shadbala and no `classicalCertified:true` until these gates are cleared. PR #14 remains DRAFT.

The audit's accuracy claims are backed by the executable regression assertions and GitHub Actions results; do not describe a green test as a complete classical Shadbala certificate.


## Independent inverse-Śīghra proof — specific first divergence

**2025 journal article, based on received/accepted 2024 research:** Santhoju, Bhalla, Behera, Pai, *Journal of Astrophysics and Astronomy* **46:9**, Eq. (10),(11),(14)–(19), Table 5, Tables 6–7 p.16 and Table 9 p.19, DOI https://doi.org/10.1007/s12036-024-10018-8 . Public readable transcription: https://www.scribd.com/document/977832014/suryasiddhant .

Reconstruction uses ONLY its published Mars means/śīghroccas and published epicycle limits 235° and 232°; it does not use the SMV Jya table, ephemerides or mandocca. For the two **positive** śīghra kendras (58–60°), the plus-karṇa branch of Sūrya Siddhānta II.40 and the paper's own equations imply, with k in degrees:

\`\`\`text
k = normalized(sheeghrocca - mean)
P = 235 - (235 - 232) * |sin(k)|             [paper Eq. 11]
q = P/360                                     [r/R, Eq. 14-15]
B = q sin(k), K = q cos(k)                    [Eq. 16-17]
D = sqrt((1+K)^2 + B^2)                       [Eq. 18]
half-Sighra = asin(B/D)/2, degrees            [Eq. 19 + stage 1]
\`\`\`

| Printed 2024 example | 9 April | 13 April |
|---|---:|---:|
| Mean ° | 295.0651 | 297.5377 |
| Śīghrocca ° | 353.2261 | 357.8763 |
| Kendra ° | 58.1610 | 60.3386 |
| Paper Eq. 11 P ° | 232.451398574 | 232.393104681 |
| Dimensionless Bhuj B | 0.548542561 | 0.560948608 |
| Dimensionless Koti K | 0.340627937 | 0.319458769 |
| Dimensionless Karṇa D | 1.448510340 | 1.433748508 |
| **Independent Eq. 19 half-Sighra °** | **11.126412978** | **11.516030896** |
| Published/inferred half-Sighra ° | **11.684400** | **12.073400** |
| Max possible half-Sighra if P = 235° | 11.208205301 | 11.603373786 |
| **Inverse-implied P required for printed half °** | **250.250373195** | **249.398458075** |
| Required P EXCEEDS the 235° published cap by ° | **15.250373195** | **14.398458075** |

The required P is **calculated, not fitted** by inverting Eq. (19): for printed half h, let t=tan(2h). Then \`P=360t/(sin(k)−t cos(k))\`. Both values exceed the paper's maximum epicycle paridhi of 235°, so the displayed first-stage correction cannot be obtained from **all the paper's printed inputs and equations simultaneously**. Perturbing either printed four-decimal longitude by any ±0.00005° changes the computed half correction by <0.00004°, nowhere near the ≈0.55° gap. The independent continuous Eq. (19) result agrees with the SMV geometric model at ~machine precision and differs from printed 24-Jya interpolation by only 0.004352° / 0.009479°. This specifically excludes ordinary tabular interpolation and displayed-input rounding as root causes.

**A second separately evidenced printed-stage issue:** on 9 April Table 7 Mars 318.4339° = 295.0651° + **2 × 11.6844°** even though Table 6 calls 11.6844° the **half** correction. On 13 April Table 9 only prints a first-stage longitude of 321.6845°, so the comparable 12.0734° half correction is **inferred** using the same double-half relationship, not independently reported as a half correction.

**Decision:** The source's first correction trace is internally irreconcilable under its displayed equations/parameters. This is not proof of a specific publication implementation mistake, nor a proof of exact historical classical orbital positions for arbitrary dates. Do **not** change production formula to target the unreproducible printed values. Research-only diagnostics assert this impossibility and keep full-certification flags false. Existing five Perambalur DOB→25-planet research regression and BPHS seven-graha 35 arithmetic regression continue as separate gates; they are not same-frame external historical certification.

**Executable source:** \`tests/saura-manda-karna-two-source-numerical-reconciliation.mjs\`; [source commit](https://github.com/smvastrorajaram-hub/smvastroservices/commit/8624e8f84d69da59a481accd06ac23225d41ff57), [GitHub QA run](https://github.com/smvastrorajaram-hub/smvastroservices/actions/runs/38980890434).


## Original Sūrya Siddhānta II.39 direct-Manda source correction

**Direct textual source, not a fitted ephemeris:** Sūrya Siddhānta Chapter II, verse 39 (Burgess 1860, [text/English translation](https://www.swaveda.com/texts/surya-siddhanta/2/)) explicitly takes the **arc of bhujajyāphala**, where bhujajyāphala = corrected manda epicycle × sin(kendra) / 360. The separate variable hypotēnuse (cala-Karṇa) appears in II.40–42 for the Śīghra correction; it is **not included in the II.39 Manda expression**.

\`\`\`text
k = normalize360(mandocca - temporary_manda_input_longitude)
P = even_manda_paridhi - (even_manda_paridhi - odd_manda_paridhi) * abs(sin(k))
Manda(II.39) = asin((P/360) * sin(k))     [full in degrees]
half-Manda = Manda(II.39) / 2
\`\`\`

The previous code ONLY provided geometric manda denominators \`1+koti\`, \`1-koti\`, and \`1-|koti|\`, which combine a **Śīghra-style Karṇa** with the II.39 Manda equation. This is a genuine textual/methodology gap in the *research* engines. A standalone non-default research convention \`verse39-direct-jya\` has now been implemented in BOTH separate continuous-trigonometric and printed-24-Jya four-pass paths. It leaves the three previously defined conventions and natal calculation default untouched, does not enable live production, and leaves all certification gates false.

An independently coded scalar \`asin((P/360)*sin(k))\` oracle verifies BOTH half/full Manda intermediate corrections. The test examines 15 published five-body outputs across two independent references (Caitanya worked example plus Santhoju et al. on two April 2024 dates) and 25 actual Perambalur research natal values. **A book-text-equivalent algorithm is not itself a numerical certificate that independently printed historical positions agree.**

### Comparison against published reference data

Continuous-trig preliminary independent values, in degrees of signed **model − published true longitude**, retaining the paper's provided mean/mandocca/śīghrocca inputs:

| External worked reference | Body | Old common-plus Manda error ° | Textual II.39 direct Manda error ° |
|---|---|---:|---:|
| Santhoju 2024-04-09 | Mercury | −0.52368 | −0.23856 |
| Santhoju 2024-04-09 | Venus | −0.00393 | −0.00395 |
| Santhoju 2024-04-09 | Mars | −3.31427 | −3.14879 |
| Santhoju 2024-04-09 | Jupiter | +0.39961 | +0.18889 |
| Santhoju 2024-04-09 | Saturn | +0.31827 | +0.07897 |
| Caitanya worked example | Mercury | −0.01407 | +0.09945 |
| Caitanya worked example | Venus | −0.00126 | −0.00439 |
| Caitanya worked example | Mars | −0.02571 | +0.87730 |
| Caitanya worked example | Jupiter | −0.00131 | −0.01564 |
| Caitanya worked example | Saturn | −0.28682 | −0.15921 |

**Technical interpretation:** The direct verse-39 route is textually grounded, but it does *not* by itself reconcile both publications; changing the formula in live horoscope to this result without testing additional epicycle/epoch/Bīja conventions would be unsupported. Academic first Half-Śīghra mismatch occurs *before* either Manda convention can change it, and remains unresolved as previously proven.

**GitHub:** [continuous branch source commit 997f468](https://github.com/smvastrorajaram-hub/smvastroservices/commit/997f468c8e04e797163a0966510ba3ef12d4005b), [24-Jya branch source commit 722f285](https://github.com/smvastrorajaram-hub/smvastroservices/commit/722f285e7574919b3ebef20bf4565215a9aeb11a), [independent two-book + 25 birth regression commit 98a4e2a](https://github.com/smvastrorajaram-hub/smvastroservices/commit/98a4e2a61f3a5538503be44b4c1b87ce50dff6ce); [CI workflow](https://github.com/smvastrorajaram-hub/smvastroservices/actions/runs/38983269865).

**Certification:** historical True Longitude ❌; historically independent Bīja/Mandocca ❌; complete seven-graha six-component BPHS Shadbala ❌. Draft PR must remain unmerged.
