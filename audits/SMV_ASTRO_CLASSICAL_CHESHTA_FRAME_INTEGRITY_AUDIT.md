# SMV ASTRO — Classical Cheshta Reference-Frame Research and Guard

**Audit date:** 19 November 2026  
**Scope:** B.V. Raman sixfold Cheshta input integrity; BPHS I Chapter 27 verses 24–25 five-graha mean/true/Sheeghrocccha calculation; isolated Surya Siddhanta Saura research.  
**Status:** SAME-FRAME MODEL RESEARCH AVAILABLE; HISTORICAL NATAL TRUE-LONGITUDE CERTIFICATION WITHHELD.  
**Production status:** This branch adds a fail-closed Shadbala total guard. It does not merge, deploy, or replace the live horoscope ephemeris.

## 1. Finding in the previous live input path

The automatic five-graha B.V. Raman path combined:

- Mean longitude and Sheeghrocccha from the traditional Saura mean-motion model.
- True longitude from the current Swiss Ephemeris Lahiri geocentric chart.

Those are not the same declared astronomical reference frame. Computing a numeric angle from them is possible, but it is not evidence of a valid classical mean/true/Sheeghrocccha triple.

The prior automatic mixed-frame numerical candidate is no longer emitted as a Cheshta Bala. The Node and browser B.V. Raman engines now return `value:null`, `available:false`, and `BV_RAMAN_CHESHTA_BLOCKED_REFERENCE_FRAME_MISMATCH` for Mars–Saturn when no verified same-frame triplet is provided. The source evidence retains the three frame labels so the mismatch remains auditable.

The dependent Chapter X Ishta/Kashta calculation is also withheld for those five planets because it reuses the unavailable Chapter VI input. The sixfold Shadbala total, Rupa, ratio and strength ranking remain null. The other partial Bala components stay available. Sun/Moon continue to follow the B.V. Raman Chapter VI luminary rule and their separate Chapter X Chesta-for-Phala calculation remains intact. Downstream consumers that require a complete Shadbala total (including C.G. Rajan's Sun/Moon/Lagna-lord method selector and any multi-occupant Harana ranking that depends on Shadbala) must likewise show an unavailable/unresolved state rather than substitute a partial subtotal. Their source formulas are not changed by this guard.

## 2. Same-frame research model

The isolated research path uses:

- Saura-paksha mean motions from the extant Surya Siddhanta constants.
- The Surya Siddhanta four-stage true-position sequence: half śīghra, half manda, full manda, full śīghra.
- The printed 24-point Jya table as a separate arithmetic cross-check.
- The BPHS five-graha selector described alongside Uttara Kalamrita Chapter II: Mars/Jupiter/Saturn use their own mean with the Sun's mean as Sheeghrocche; Mercury/Venus use the Sun's mean with their own Sighrocche orbit.

All three research inputs carry the canonical frame ID `surya-siddhanta-saura-nirayana`. The continuous and tabular true-position calculations are cross-checks of the same model inputs, not two independent observations of historical truth.

The five Perambalur dates in the regression are:

- 1971-05-04 05:05 IST
- 1974-01-11 16:04 IST
- 1992-07-31 22:05 IST
- 1994-06-15 13:03 IST
- 2015-09-06 09:30 IST

These produce 25 same-frame research candidates (five dates × five planets). They are deliberately labelled uncertified. The Mandocca path is extrapolated from a 2024 published anchor and traditional rates; date-specific historical Bija corrections are not verified. No independent classical historical true-longitude oracle has been established for these 25 natal rows.

## 3. External numerical evidence

### IMD paired-date arithmetic benchmark

The test uses the India Meteorological Department Rashtriya Panchang Saka 1948 table for 22 March 2026, 05:30 IST:

- The Bija-corrected Mean Nirayana longitude rows.
- The same-date Nirayana geocentric true longitude rows.

Applying BPHS I Chapter 27 verses 24–25 with the five-graha mean/Sheeghrocche selector reproduces the recorded arithmetic values:

| Planet | Cheshta Virupa |
|---|---:|
| Mercury | 48.712403 |
| Venus | 11.913642 |
| Mars | 6.591066 |
| Jupiter | 36.113364 |
| Saturn | 2.688162 |

This verifies arithmetic on one published paired-date source. It does not certify historical natal positions in 1971–2015, nor does it certify the unmodified Saura model at every epoch. IMD's Bija-corrected modern values must not silently be transplanted to unrelated historical dates.

Official references:
- https://packolkata.imd.gov.in/panchang/en/bija_corrections
- https://packolkata.imd.gov.in/panchang/en/longitude_planets

### Independent published 2024 true-position comparison

The regression also checks the selected four-stage model against the printed values in Santhoju et al., *Journal of Astrophysics and Astronomy* 46:9 (2025), DOI https://doi.org/10.1007/s12036-024-10018-8.

The comparison deliberately retains the published Mars disagreement (greater than 3 degrees under the single universal Manda convention used by this research path). It asserts that the five-graha set does not pass a blanket 0.05-degree certification gate. No planet-specific coefficient is fitted to force a match.

A separate published worked example at https://rkanetech.com/true-position is useful comparative evidence, but a match to that example alone is not proof of historical Bija or Mandocca evolution.

## 4. Release gates for historical certification

A historical natal true longitude may only be considered certified when all of the following exist for the actual birth epoch:

1. A documented mean-longitude source and its epoch, meridian, ayanamsa/reference point, and Bija treatment.
2. A documented Sheeghrocche source in the same frame.
3. A documented Mandocca/apsis value and epoch-appropriate evolution/correction.
4. A true-longitude calculation whose intermediate stages reconcile with an independent, same-frame published or otherwise independently transcribed historical oracle.
5. A strict numerical tolerance agreed before comparison; no planet-specific fitting after seeing the discrepancy.
6. A green current GitHub Actions run for the source fixture, browser/Node parity and five-natal integration.

Until then, keep `historicalNumericalCertified:false`, `natalHistoricalNumericalCertified:false`, and `productionIntegrationAllowed:false`. A finite value or two algorithms agreeing with the same unverified inputs is not historical validation.

## 5. Regression guard behaviour

The new workflow runs `tests/saura-historical-true-longitude-frame-regression.mjs`. It checks:

- The IMD paired-date five-graha arithmetic.
- Same-frame tags on all 25 historical research candidates.
- The unresolved 2024 independent published comparison.
- The absence of a false historical certificate or Production integration flag.
- Live B.V. Raman rows emit no mixed-frame Cheshta number: the five affected grahas expose null Cheshta and an explicit blocked frame status; dependent Ishta/Kashta and Shadbala Virupa/Rupa/ratio/strength ranking are withheld.

The existing standard-horoscope printed-input tests remain separate. Their source-transcribed Chapter VI mean, true and Sheeghrocche values are valid arithmetic fixtures for that worked example; they do not authorize arbitrary-date live Swiss/Saura frame mixing.

## 6. Non-goals and safety

- No Horoscope or Calendar calculation engine is replaced.
- No Swiss ephemeris or Lahiri chart longitude is changed.
- The three SMV ASTRO / HOROSCOPE / CALENDAR Service Worker release markers are synchronized at `20261119-cheshta-frame-integrity-v3` so their existing clients request the updated offline calculation shell. No origin-wide Cache Storage deletion, local/session storage clearing, IndexedDB deletion, or user-data operation is introduced.
- No production deployment or PR merge is performed by this research branch.
- No unsupported historical value is substituted for a missing source.
- BPHS, B.V. Raman and Uttara Kalamrita remain separate source methods; their luminary and five-graha rules must not be blended.
