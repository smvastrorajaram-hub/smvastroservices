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
