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
