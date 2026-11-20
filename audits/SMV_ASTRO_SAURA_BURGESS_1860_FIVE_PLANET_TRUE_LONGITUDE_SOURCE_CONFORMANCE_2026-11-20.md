# SMV ASTRO — Burgess 1860 Five-Planet True Longitude Source-Conformance Audit

**Date:** 20 November 2026  
**Scope:** One published Sūrya-Siddhānta worked example, all five classical planets  
**Status:** Historical worked-example source conformance; not an arbitrary-date or modern-ephemeris accuracy certificate  
**Production impact:** None

## 1. Purpose

This audit checks the existing four-pass True Longitude implementation against a published numerical worked example. It does not replace the current calculator, change its inputs, recalibrate coefficients, or modify Shadbala.

The independent source is Ebenezer Burgess, *Translation of the Sūrya-Siddhānta* (1860), printed pages 214–216. It supplies the five planets' mean positions, conjunction/Śīghroccheya values, apsis longitudes and the printed outputs of the four correction stages. The worked example is for the midnight preceding 1 January 1860 at Washington; the book explains the meridian adjustment used for the Mercury conjunction. The same printed inputs are passed directly into the repository's existing calculation methods.

## 2. Source rules verified

- **II.39 — Manda:** use the corrected apsis epicycle and the base-sine (bhujajyā); the Manda equation is the corresponding direct arc. The test therefore selects the existing `verse39-direct-jya` mode rather than silently choosing a denominator convention.
- **II.40–42 — Śīghra:** use the conjunction epicycle, its base/perpendicular components and the variable hypotenuse.
- **II.43–45 — sequence:** first half Śīghra, then half Manda, then full Manda applied to the original mean place, then full Śīghra. The sign follows the anomaly's half-orbit.

The present test checks the four displayed correction values and final True Longitude, not only whether two implementations agree with one another.

## 3. Printed source inputs

All longitudes below are in the original sign-degree-minute-second notation. The Mercury apsis is printed only to the nearest minute, so seconds are represented as zero rather than invented.

| Planet | Mean longitude | Mandocca | Śīghroccheya | Burgess final True |
|---|---:|---:|---:|---:|
| Mercury | 8s 18°13′13″ | 7s 10°28′ | 4s 16°57′22″ | 7s 24°51′ |
| Venus | 8s 18°13′13″ | 2s 19°52′17″ | 10s 21°49′47″ | 9s 14°35′ |
| Mars | 5s 24°30′57″ | 4s 10°02′40″ | 8s 18°13′13″ | 6s 18°45′ |
| Jupiter | 2s 26°02′14″ | 5s 21°22′19″ | 8s 18°13′13″ | 3s 04°11′ |
| Saturn | 3s 20°12′03″ | 7s 26°37′34″ | 8s 18°13′13″ | 4s 01°02′ |

For Mercury and Venus, Burgess explains the classical exchange: the Sun's mean place is used as the planet's mean place, while the planet's own orbital place supplies the conjunction/Śīghroccheya. For the outer planets the table supplies the planet's own mean and the solar conjunction.

## 4. Results from the current implementation

The regression runs both existing mathematical paths:
1. the continuous trigonometric four-pass implementation; and
2. the printed 24-Jya table / interpolation implementation.

No date-based astronomical provider, DE441 position, Lahiri conversion, or fitted correction is used in this source-reproduction test.

| Planet | Continuous True | Continuous error | 24-Jya True | 24-Jya error |
|---|---:|---:|---:|---:|
| Mercury | 7s 24°51′48.5″ | +0.013479° | 7s 24°51′10.1″ | +0.002803° |
| Venus | 9s 14°33′26.5″ | −0.025967° | 9s 14°34′22.5″ | −0.010416° |
| Mars | 6s 18°44′44.3″ | −0.004351° | 6s 18°44′35.9″ | −0.006687° |
| Jupiter | 3s 04°10′08.9″ | −0.014172° | 3s 04°09′51.9″ | −0.018896° |
| Saturn | 4s 01°02′39.7″ | +0.011034° | 4s 01°02′11.0″ | +0.003055° |

**Measured continuous-path maximum final error:** 0.025967° (Venus); RMS 0.015546°.  
**Measured 24-Jya-path maximum final error:** 0.018896° (Jupiter); RMS 0.010271°.  
**Maximum continuous-versus-24-Jya difference:** 0.015551°.

These are source-example residuals against Burgess's printed, rounded worked values. They are not modern apparent-position residuals.

## 5. Stage-level discrepancy retained

The test compares all four printed corrections, not only the final result. The maximum absolute stage residuals measured during the audit are:

| Stage | Maximum absolute residual |
|---|---:|
| First Śīghra | 0.123634° |
| Half-Manda correction calculated at stage 2 | 0.010951° |
| Full-Manda correction at stage 3 | 0.016969° |
| Final Śīghra correction | 0.023459° |

The visible exception is **Mars's first Śīghra equation**: the continuous path differs from Burgess's printed +31°01′ by about −0.123634°. The 24-Jya path also retains a difference of about −0.120531°. This is deliberately not hidden by fitting a Mars-specific value. The test records it and uses a separately declared 0.15° bound for the first-stage printed value; the other three stages must remain within 0.03°.

This means the final five True longitudes reproduce the published example closely, while one intermediate Mars stage still deserves a closer historical table/interpolation review. The audit does not claim every intermediate value is exact.

## 6. What this establishes

- A primary historical printed worked example exists for all five planets, not only one.
- The current four-pass implementation uses the same source inputs and the source's stated correction order.
- The current continuous and tabular-Jya paths independently reproduce the five final printed True Longitude values within 0.03° for this example.
- Their agreement is an arithmetic cross-check; it is not a second independent historical source.

## 7. What remains unproven

This is one 1860 worked epoch. It does **not** establish:
- date-dependent historical Bīja and apsis evolution at the user's five natal epochs or for every date from 1800–2399;
- a source-backed historical Mean/True/Śīghroccheya triplet for arbitrary natal dates;
- the five natal Cheshta values or complete seven-graha Shadbala;
- 0.05° agreement with modern DE441 apparent positions.

Modern DE441 and the traditional Saura source are different models and frames. They remain separate. The existing generic historical and production-eligibility flags must remain false for unverified natal calculations.

## 8. Release boundary

- No production Horoscope or Shadbala calculation is changed.
- No browser/PWA/Android cache version or Service Worker is changed.
- No user data, storage or customer-facing output is changed.
- No merge, deployment or production activation is part of this audit.

## 9. Reproduction

Run:

```bash
node tests/saura-burgess-1860-five-planet-true-longitude-regression.mjs
```

The matching GitHub Actions workflow is the Uttara Kalamrita source QA workflow.
