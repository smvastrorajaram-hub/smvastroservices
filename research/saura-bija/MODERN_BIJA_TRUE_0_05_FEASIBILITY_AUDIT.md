# Feasibility audit: a genuine Bīja certificate versus a modern Dṛk-calibrated model

**Assessment date:** 2026-11-20  
**Status:** Research decision — do not claim a new Modern Bīja accuracy pass until a separate implementation passes the gates below.  
**Related baseline:** PR #551, Phase C / Phase H.

## Executive decision

There are two different certificates, and they must not be conflated:

1. **Classical Bīja source-conformance evidence.** This is attainable for the present historical implementation: source parameters and selected procedures can be checked against named editions, worked examples and historical anchor positions. It is not a certificate that the historical model predicts modern apparent geocentric longitudes to 0.05°.
2. **Modern Dṛk-calibrated Bīja-inspired true longitude.** A modern semi-analytical or numerical model can plausibly meet a 0.05° comparison requirement over 1800–2399. It would, however, be a separate modern hybrid calibrated against a modern ephemeris, not the unmodified Sūrya-Siddhānta Bīja model. Its accuracy must be demonstrated on withheld epochs and dense samples; the four proposed layers alone do not prove it.

**Recommendation:** pursue the second route as a separate research-only model and PR, provisionally named `MODERN_DRIK_BIJA_TRUE` (or `MODERN_BIJA_TRUE` with an explicit “modern Dṛk-calibrated hybrid” qualifier). Keep `CLASSICAL_BIJA_MEAN` and `CLASSICAL_BIJA_TRUE` unchanged. Do not certify or merge a new Modern Bīja output until a blind validation gate passes. A source-conformance certificate for the Classical Bīja work may accompany it, but cannot substitute for the requested 0.05° accuracy certificate.

The earlier wording that a 0.05° result for the historical model is “mathematically impossible” is too absolute. The evidence demonstrates that the **current source-faithful implementation fails this particular modern-reference gate by degrees**. A different modern model can meet the tolerance; that would not make the old model retroactively accurate.

## 1. What historical Bīja means in the research literature

Cidambi, Montelle and Plofker (2024), in their study of Gaṇeśa Daivajña's 1520 `Graha-lāghava`, describe Bīja corrections as small correction constants applied to mean-motion computations. A Bīja is commonly expressed as an annual correction multiplied by elapsed years and added to or subtracted from the quantity being corrected. The stated historical purposes include secular changes since a parameter system was established and conversion between different `pakṣa` parameter systems.

The same study discusses Gaṇeśa's procedure for examining discrepancies between calculated and observed planetary longitudes and the use of sighting instruments. Gaṇeśa's resulting parameter choices could draw on more than one `pakṣa` for different planets or anomalies. This supports an empirical tradition of revising parameters against observations; it does **not** establish that any arbitrary modern Fourier fit or collection of periodic harmonics is a traditional Bīja.

This distinction matters for SMV ASTRO: the existing PR implements a specifically named **Sūrya-Siddhānta / Burgess Bīja mean-motion profile**. Brāhma-, Ārya-, Gaṇeśa- and other parameter families are not interchangeable correction constants. Mixing them without an explicit model definition would create an undocumented hybrid.

Primary study:
- Sahana Cidambi, Clemency Montelle and Kim Plofker, “Astronomical handbooks in 16th-century South Asia: Analysis of mean planetary motions in the 1520 Graha-lāghava of Gaṇeśa Daivajña,” *Journal for the History of Astronomy* (2024), DOI: https://doi.org/10.1177/00218286241241812
- Particularly relevant: discussion of Gaṇeśa's observational revisions and Appendix A, “Bīja-corrections to kṣepakas or epoch mean longitudes”.

## 2. Historical model innovations are not interchangeable with Bīja

Nīlakaṇṭha Somayājī's Kerala-school work is a genuine historical revision of planetary theory. K. Ramasubramanian's 1998 survey describes a heliocentric geometric construction for the five planets, a revised equation-of-centre treatment for Mercury and Venus, and projection of inclined orbital positions onto the ecliptic to obtain true longitude. A 2026 revised Springer edition of the `Tantrasaṅgraha` likewise characterizes the text as introducing a major revision to the traditional planetary model, including improved treatment of the interior planets.

That is strong historical precedent for a **separately named alternative planetary theory**. It is not evidence that one can take the Sūrya-Siddhānta four-pass sequence, append modern Kepler and perturbation terms, and still describe the result as the same classical Bīja model.

References:
- K. Ramasubramanian, “Model of planetary motion in the works of Kerala astronomers,” *Bulletin of the Astronomical Society of India* 26 (1998), pp. 11–31: http://hdl.handle.net/2248/2526
- K. Ramasubramanian and M. S. Sriram, *Tantrasaṅgraha of Nīlakaṇṭha Somayājī*, revised and expanded edition (2026): https://link.springer.com/book/10.1007/978-981-95-4857-6

A 2023 study of Sūrya-Siddhānta apses also cautions that the physical identity of traditional Manda for Mercury and Venus is unresolved; possible heliocentric-apsis comparisons for outer planets remain a research interpretation, not a license to substitute fitted modern apsis rates into the historical constants:
- Anil Narayanan and Nilesh Oak, “Planetary nodes and apses in the Sūrya-Siddhānta,” *Indian Journal of History of Science* 58 (2023), 87–95, DOI: https://doi.org/10.1007/s43539-023-00083-3

## 3. Audit of the four proposed modern layers

### Layer 1 — Modern mean and apsis rates

**Feasible, but this is modern calibration rather than a historical Bīja transcription.**

Fitting mean-longitude rates and secular orbital-element rates against DE441 can provide a useful initial model. The fit must be for a coherent heliocentric system: planet states, Earth or Earth–Moon barycentre state, apsidal/perihelion variables, time scale, reference plane and epoch must be defined together. Inner planets require their own orbital treatment; they cannot be repaired by changing only a geocentric longitude drift.

The fitted coefficients must carry their training interval, epoch, units, reference ephemeris and covariance/residual evidence. Do not call a value “the traditional Bīja rate” merely because it is expressed in degrees per year.

### Layer 2 — Keplerian equation-of-centre terms

**Mathematically sound when derived from a heliocentric two-body orbit; unsafe as ad-hoc additions to the current four-pass output.**

Terms proportional to `e² sin(2M)` and `e³ sin(3M)` occur in the Fourier expansion of the Kepler equation of centre, but they have specific eccentricity-dependent coefficients and are part of a complete series. They are not free correction knobs. They describe the conversion from mean anomaly to true anomaly in a heliocentric elliptical orbit.

The current Sūrya-Siddhānta Manda and Śīghra stages already approximate orbital non-uniformity and the geocentric viewing geometry. Adding a second equation-of-centre expansion directly to the already corrected geocentric longitude can double-count the same effect. The modern model should instead calculate heliocentric orbital states consistently, use one well-defined Kepler solution (or its complete validated series), then form the Earth-relative vector.

### Layer 3 — Planetary perturbations

**Essential for a high-quality long-span modern model; the proposed “15–25 terms” count is unsupported.**

The Jupiter–Saturn great inequality is important, but it is not the only interaction affecting apparent longitude over six centuries. Analytical planetary theories such as VSOP2013/TOP2013 use Lagrange planetary equations and Fourier/Poisson series in combinations of planetary mean longitudes, nodes and perihelia. Their derivations include perturbations from other planets and asteroid populations. The TOP history documents high-order treatment of Jupiter–Saturn mutual perturbations; the VSOP2013 work explicitly describes asteroid perturbation series.

This demonstrates that an analytical model can be compact and highly accurate, but it does not prove that an arbitrary 15–25 selected terms will meet 0.05°. The term set must be derived, ranked by a stated error budget, and tested on withheld epochs.

Reference:
- J.-L. Simon, G. Francou, A. Fienga and H. Manche, “New analytical planetary theories VSOP2013 and TOP2013,” *Astronomy & Astrophysics* 557 (2013), A49, DOI: https://doi.org/10.1051/0004-6361/201321843
- IMCCE VSOP2013/TOP2013 data and technical descriptions: https://ftp.imcce.fr/pub/ephem/planets/

### Layer 4 — 3D projection and apparent place

**Required for comparison with the current DE441 quantity-31 fixture.**

The longitude must come from a 3D Earth-relative position vector, not a simple addition of scalar corrections. The model must account for orbital inclination and ecliptic projection. For an *apparent* geocentric result, it must also use a single declared time scale and a consistent light-time / aberration / gravitational-deflection convention and transform to the exact requested ecliptic-of-date frame.

JPL Horizons defines quantity 31 as observer-centred IAU76/80 ecliptic-of-date longitude/latitude of the target's **apparent** position, including light-time, gravitational deflection and stellar aberration (plus optional refraction where applicable). It is not the same quantity as a geometric heliocentric longitude or a mean longitude.

Reference: JPL Horizons Manual, “General Definitions,” “Apparent Coordinates,” and “31. Observer ecliptic longitude & latitude”: https://ssd.jpl.nasa.gov/horizons/manual.html

## 4. What the present repository evidence actually says

PR #551 currently has two separately measured outcomes:

### Classical Bīja True versus JPL DE441 — FAIL

The annual fixture contains 600 epochs × 5 planets = 3,000 DE441 geocentric apparent samples for 1800–2399. The reported maximum residuals are multi-degree:

| Planet | Classical Bīja True maximum absolute residual |
|---|---:|
| Mercury | 7.588441° |
| Venus | 21.503665° |
| Mars | 9.925365° |
| Jupiter | 3.993845° |
| Saturn | 9.459852° |

This does not meet 0.05°. The historical source audit finds that the Kali-epoch apsis counts/positions and even/odd epicycle table match the selected Burgess Sūrya-Siddhānta column. The present evidence therefore does not justify “fixing” the historical constants by fitting them to DE441.

The proposed informal residual estimates (Mercury about 3°, Mars 0.62°, Jupiter 0.33°, Saturn 0.8°) do not match this PR's 600-year DE441 fixture and are not accepted as measured evidence without a separate reproducible dataset, coordinate-frame definition and calculation.

### Modern Moshier versus JPL DE441 — PASS

The separate `MODERN_MOSHIER_GEOCENTRIC_APPARENT_TROPICAL_VS_DE441` test uses explicit Swiss Ephemeris `MOSEPH` flag 4 and tests tropical apparent geocentric longitudes against the JPL DE441 quantity-31 fixture:

| Planet | Maximum absolute residual |
|---|---:|
| Mercury | 0.00783929° |
| Venus | 0.00609985° |
| Mars | 0.00360333° |
| Jupiter | 0.00102214° |
| Saturn | 0.00073721° |

Global maximum is 0.00783929° across 3,000 annual comparisons, below 0.05° by approximately 6.38×. This proves that a separate modern ephemeris can pass the chosen annual DE441 comparison. It does **not** prove a new Bīja model passes.

Evidence:
- Test: `tests/saura-bija-modern-moshier-de441-accuracy.mjs`
- Actions #44597278434: https://github.com/smvastrorajaram-hub/smvastroservices/actions/runs/44597278434
- Actions #44599014479 after adding this assessment's certificate baseline: https://github.com/smvastrorajaram-hub/smvastroservices/actions/runs/44599014479
- Internal scoped certificate: `MODERN_MOSHIER_DE441_0_05_ACCURACY_CERTIFICATE.md`

## 5. DE441 is a reference ephemeris, not direct observation

JPL DE440/DE441 are generated by fitting numerically integrated orbits to ground- and space-based observations. DE440 and DE441 use the same observational data set; DE441's different lunar-core dissipation assumption gives it a much longer backward/forward span, while the JPL paper states that DE441 is less accurate than DE440 for the current century. DE440 covers 1550–2650 and therefore also spans 1800–2399.

For a robust modern model, DE441 can remain the named acceptance target because it is already used by this research fixture. But an independent solution-family cross-check (for example, IMCCE VSOP2013/INPOP) is recommended. A result that has been fitted and scored only against the same DE441 points used during parameter estimation is not a blind accuracy certificate.

Reference:
- Ryan S. Park et al., “The JPL Planetary and Lunar Ephemerides DE440 and DE441,” *The Astronomical Journal* 161 (2021), 105, DOI: https://doi.org/10.3847/1538-3881/abd414
- JPL planetary ephemeris coverage: https://ssd.jpl.nasa.gov/planets/eph_export.html

## 6. Recommended certification design for a future Modern Dṛk-Bīja model

The following gates are required before the words “0.05° certified” are used:

1. **Freeze the identity:** a new product key, separate from both classical products; define whether the target is geocentric apparent tropical longitude or a specified sidereal conversion. Declare time scale, centre, frame, apparent/geometric convention and ephemeris reference.
2. **Publish the equations and coefficients:** all mean-rate, secular-element, eccentricity-series and perturbation coefficients must have units, source derivation, epoch, argument definitions and parameter provenance. Avoid free planet-specific residual fits without physical or statistical justification.
3. **Prevent double counting:** do not add a Kepler equation-of-centre expansion on top of the present Manda/Śīghra corrected longitude. Implement a consistent heliocentric vector pipeline or prove the algebraic equivalence of any chosen alternative.
4. **Use train/validation/holdout epochs:** publish time-blocked cross-validation so no reported holdout date helped determine coefficients. Keep a final blind interval or blind date set untouched until the model is frozen.
5. **Dense reference coverage:** annual points are not enough for the final certificate. Run at least daily samples across 1800–2399 for five planets (about 1.1 million planet/date comparisons), plus dense checks around retrograde stations, conjunctions, oppositions, perihelia/aphelia and other high-curvature intervals.
6. **Independent cross-check:** compare with DE441 and a second ephemeris solution family such as INPOP/VSOP where the same frame and apparent/geometric contract can be built. Disclose that DE440/DE441 share the same observation data set.
7. **Strict acceptance:** every planet must independently satisfy maximum absolute wrapped longitude error `<= 0.05°` on blind/holdout samples. Also report RMS, 95th percentile, sample count, worst epoch, source headers and the full per-planet result artifact. No threshold widening, date exclusion after seeing errors, or coefficient retuning on the holdout.
8. **No production substitution:** the modern model remains a separate research output until the source audit, browser/Node parity, offline footprint, cache-version policy and full regression evidence are separately reviewed and explicitly approved.

The annual Moshier-vs-DE441 gate can be reused as a baseline/control. It cannot be reused as the new Modern Bīja result.

## 7. Merge decision for PR #551

**Do not merge PR #551 yet as the delivery of a “true Bīja 0.05° certificate.”** It contains:
- a historically sourced Classical Bīja research model whose DE441 0.05° gate explicitly fails; and
- a distinct modern Moshier-vs-DE441 accuracy pass and its scoped internal certificate.

That is a valid and useful research result, but it is not the requested Modern Bīja layer. Keep #551 isolated and unmerged until the separate model/acceptance scope is settled. If it is later merged, the PR title, merge notes and certificate must continue to state that only the Moshier-vs-DE441 gate passes.

The user has authorized Render auto-deploy on merge. The Render service `smvastroservices` tracks this repository's `main` branch with auto-deploy enabled, so a future merge will trigger a Render build/deploy. This authorization does not authorize any manual Cloudflare Production deploy, Firebase/identity change, horoscope calculation switch or production integration beyond the exact reviewed merge scope.
