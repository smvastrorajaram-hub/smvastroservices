# V365 — Classical Mean Longitude / Sheeghrocha: independent numerical audit

**Scope:** isolated calculation only, no live five-graha Cheshta Bala replacement and no unrelated website changes. Source is `saura-classical-mean-motion.browser.mjs`; executable test is `tests/v365-saura-mean-motion-official-panchang-regression.mjs`.

## Textual source hierarchy

1. **BPHS**, R. Santhanam I Ch. 27 vv. 24–25: Cheshta Kendra/3 Virupas when mean/true/Sheeghrocha inputs are supplied.
2. **Uttara Kalamrita**, Ch. II printed pp. 42–43: Mars/Jupiter/Saturn mean = own mean, Sheeghrocha = mean Sun; Mercury/Venus mean = mean Sun, Sheeghrocha = own mean.
3. **Extant Surya Siddhanta** Saura-paksha I vv. 29–34, 53: astronomical mean-motion revolution parameters (these constants are **NOT** wrongly attributed to BPHS). Independent modern scholarly table: S. Cidambi, C. Montelle, K. Plofker, *Journal for the History of Astronomy* 55(4), Oct. 21 2024, doi:10.1177/00218286241241812, table 1.
4. **Independent published numerical oracle:** India Meteorological Department/Positional Astronomy Centre, *Rashtriya Panchang 2026–27*, "Mean Nirayana longitude of planets by Bija Corrections to Surya Siddhanta elements", at 2026-03-22 **05:30 IST = 00:00 UTC**, original **Mean Surya Siddhanta Longitude** column BEFORE Bija corrections: https://packolkata.imd.gov.in/panchang/te/bija_corrections.

## Astronomical model

- Kali reference JD = **588465.5**, canonical civil days/mahayuga = **1,577,917,828**; Ujjain traditional 75°46' east mean meridian.
- Mean position (360°) = fractional_part[ (JD_UTC − 588465.5 + (75+46/60)/360) × revolution_count / 1,577,917,828 ] × 360.
- Revolution counts in the same order: Sun **4,320,000**; Mercury Sighrocca **17,937,060**; Venus Sighrocca **7,022,376**; Mars **2,296,832**; Jupiter **364,220**; Saturn **146,568**.
- For Mercury/Venus their **own** fast revolution is the classical *Sighrocca*, **not** the apparent geocentric mean of the planet; mean = Sun. No `swe_get_orbital_elements()` is substituted.

## Published reference vs calculated independent position (degrees, March 22 2026, 00:00 UTC)

| Point | Official Mean SS (°) | V365 mean (°) | Signed error (arcseconds) |
|---|---:|---:|---:|
| Sun | 334.9321500 | 334.9321647 | +0.053 |
| Mercury Sighrocca | 184.8013306 | 184.8009109 | -1.511 |
| Venus Sighrocca | 29.3966833 | 29.3969804 | +1.069 |
| Mars mean | 308.1438333 | 308.1440819 | +0.895 |
| Jupiter mean | 90.8813000 | 90.8815262 | +0.814 |
| Saturn mean | 340.3276389 | 340.3275041 | -0.485 |

**6/6 within 1.75 arcseconds** of *independent* printed Indian government reference, without fitting per-planet offsets or reading Swiss orbital means. Five grahas' BPHS/UK selectors checked separately. Temporal continuity, mahayuga periodicity, input rejection and five real Perambalur birth times are also tested; the latter are *diagnostic* and have no independent published birth-date oracle.

## Certificate boundary

**PASS (limited):** six traditional mean-motion values at the official 2026 epoch; the mapping to the five specified mean/Sheeghrocha values; purely arithmetic date advancement.

**NOT CERTIFIED:** independent published comparisons at each 1971–2015 natal date; the definition/frame of **true longitude** and potential Bija/ayanamsa alignment to the Sūrya Siddhānta mean system; entire Cheshta Kendra -> Virupa per natal; full BPHS Shadbala/Drig/Yuddha. Direct mixing with Lahiri/Swiss true geocentric longitude would be a hybrid and is **not automatically justified**. Live `motionClassical()` speed-bin estimate and customer results remain unchanged pending those tests. The original `swe_get_orbital_elements()` is a distinct **modern heliocentric osculating** research API and is deliberately not an input here.

No PyJHora/AGPL code copied, imported, or ported.


## Back-propagation and academic non-solar orbital mean gate (17 October 2026)

**No new astronomical constants or correction factors fitted.** Instead of deriving the expected birth dates from the implementation's Kali epoch, this independent numerical path begins with the six external printed IMD 2026 **uncorrected** mean values above. It projects the official longitude backwards with only the ancient revolution integer / 1,577,917,828 civil days, independently of the engine's epoch and Ujjain meridian variables:

```text
reference = IMD_2026_unmodified_mean_longitude(body)        [independently printed]
days = JD_UTC_birth - 2461121.5
expected = normalize360(reference + 360 * days * revolutions(body) / 1577917828)
```

All 30 computed **historical-model MEAN orbital longitudes** for five actual Perambalur UTC birth instants match the *engine's own independently implemented Kali-origin calculation* within 1.75 arcseconds, maximum **1.5109 arcseconds**. The predeclared tolerance includes the externally printed base-epoch discrepancy; there is no 1971-2015 external ephemeris for the same natal instant in this test.

| Perambalur IST birth | Sun mean ° | Mercury śīghrocca ° | Venus śīghrocca ° | Mars mean ° | Jupiter mean ° | Saturn mean ° |
|---|---:|---:|---:|---:|---:|---:|
| 1971-05-04 05:05 | 17.524225 | 230.122767 | 312.742231 | 243.642269 | 225.130579 | 30.002693 |
| 1974-01-11 16:04 | 266.822685 | 294.744208 | 88.385342 | 38.993130 | 306.852312 | 62.888836 |
| 1992-07-31 22:05 | 105.513357 | 305.317198 | 144.930965 | 349.879809 | 149.933959 | 289.481969 |
| 1994-06-15 13:03 | 59.294603 | 222.922437 | 160.196069 | 348.111829 | 206.740581 | 312.341869 |
| 2015-09-06 09:30 | 140.526197 | 270.058913 | 341.400086 | 90.756562 | 130.974231 | 211.591877 |

**Second published source cross-check, independent ten non-solar MEAN figures:** Santhoju et al., *Journal of Astrophysics and Astronomy* **46:9** (2025), Tables 6/9, DOI https://doi.org/10.1007/s12036-024-10018-8 ; readable transcription https://www.scribd.com/document/977832014/suryasiddhant . The paper's mean Sun locates its event instant on each date; this is a fitted *clock from one printed solar value*, NOT proof of an independently published clock. From that inferred instant, project each of Mercury/Venus/Mars/Jupiter/Saturn by the **independent IMD 2026 base** + fixed mean rate (without further parameter adjustment). All **10 independently printed NON-solar 2024 mean positions agree to <0.001° (3.6 arcseconds)**.

| Paper event | UTC hour after date's 00:00 UTC inferred from Sun mean | Approx. inferred IST | Max absolute error of five other mean positions |
|---|---:|---|---:|
| 2024-04-09, Mandi sunrise | 1.0481 h | 06:32:53 | 0.0006° |
| 2024-04-13, Meṣa Saṅkrānti | 18.2831 h | 23:46:59 | 0.0005° |

This narrows the independently demonstrated 2024 cross-paper arithmetic disagreement to the true-longitude correction chain; it is not evidence that the academic printed **Half-Śīghra** output can be reproduced by its written equations. See the explicit inverse-Paridhi proof in `audits/SMV_ASTRO_SATURN_MANDA_KARNA_2024_TWO_DATE_NUMERIC_RESOLUTION.md`: both paper half-corrections require Mars śīghra paridhi **outside 232°–235°**, so **do not alter** any research or production astronomical formula by fitting those outputs.

### Scope and remaining blocker

- **PASSED:** 6/6 official printed 2026 pure Saura mean orbits, all 30 official-source-anchored historical *mathematical* mean propagations, 10 independent 2024 non-solar printed mean values after solar-mean clock inference, five real birth time / five-graha research input mapping.
- **UNPROVEN:** independently *printed* 25 historically dated same-frame TRUE geocentric longitudes for the real five births, 1971–2015 historical Bīja and Mandocca corrections, the six separately independent seven-graha Shadbala calculations. No numerical full natal certificate; no enablement of `classicalCertified` and no merging into main.
- **No changed customer product source:** this update extends the existing research regression and its existing evidence document, not the Horoscope/Matching live engines.

**Executable:** `tests/v365-saura-mean-motion-official-panchang-regression.mjs`; test-source commits [aecd32b](https://github.com/smvastrorajaram-hub/smvastroservices/commit/aecd32bea2279becbc2ec1173ac5c9eddb144cc2) and [8ed4f53](https://github.com/smvastrorajaram-hub/smvastroservices/commit/8ed4f53b51b42a1d3f313cff0b15377cf07a82aa); [CI for final executable test](https://github.com/smvastrorajaram-hub/smvastroservices/actions/runs/38981921915).
