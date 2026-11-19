# SMV ASTRO — Classical Cheshta Reference-Frame Audit

**Date:** 19 November 2026  
**Scope:** B.V. Raman sixfold Cheshta, five non-luminary planets, historical Saura True Longitude research, and a Production regression guard.  
**Production posture:** Mixed-frame five-graha Cheshta is blocked; no full natal Shadbala certification is granted.

## Finding

The former B.V. Raman production fallback combined:
- Mean longitude and Sheeghrocchea selected from the traditional Saura-paksha mean-motion model (traditional-Saura-nirayana); and
- True longitude read from the Swiss/Lahiri natal chart (Swiss-Lahiri-nirayana).

These are not interchangeable input frames. The Cheshta arithmetic may return a number in the 0–60 Virupa interval, but that numerical range does not validate the astronomical inputs.

## Production guard added on this branch

The Node and Browser B.V. Raman engines now:
- Continue to use the printed Raman Standard Horoscope triplets only when mean, true and Sheeghrocchea inputs explicitly declare the same reference frame and source provenance.
- Return a null value and unavailable status for the five grahas when the only available natal true longitude is in the Swiss/Lahiri frame while mean/Sheeghrocchea come from Saura.
- Expose frameSafety.status = BLOCKED_MIXED_REFERENCE_FRAMES.
- Withhold dependent Ishta/Kashta for Mars–Saturn when the sixfold Chapter VI source is blocked.
- Withhold the incomplete Shadbala total and Rupa for those five grahas.
- Preserve B.V. Raman's separate Sun/Moon sixfold rule and Chapter X Chesta-for-Phala path.

The guard does not change the general Swiss natal longitude engine, Rasi/house results, horoscope UI, calendar, or unrelated calculation layers.

## Historical Saura True Longitude research

The isolated research model calculates Saura mean, true and Sheeghrocchea candidate longitudes in the same surya-siddhanta-saura-nirayana frame for five historic Perambalur test epochs:
- 4 May 1971, 05:05 IST
- 11 January 1974, 16:04 IST
- 31 July 1992, 22:05 IST
- 15 June 1994, 13:03 IST
- 6 September 2015, 09:30 IST

For each of the 25 planet rows, the regression requires:
1. Equal mean, true and Sheeghrocchea frame IDs.
2. A finite normalized candidate true longitude.
3. Agreement between the independently coded continuous-trigonometric and printed 24-Jya implementations within 0.05 degrees.
4. An explicit certified:false status.

This verifies internal same-frame construction and independent arithmetic implementation, not historical physical truth. The two true-longitude implementations share the same mean and extrapolated apsis inputs, so they are not independent observational ephemerides.

## Why historical certification remains blocked

- Historical Bija corrections for the five natal epochs have not been independently reconstructed.
- The Mandocca model is extrapolated from a published 2024 anchor using traditional slow rates; its historical epoch calibration remains unverified.
- A 2024 published five-planet true-longitude sample is not reproduced within 0.05 degrees for all five planets by the current four-pass model. The dedicated regression expects only one strict match and preserves the discrepancies rather than fitting planet-specific coefficients.
- No independent historical classical true-longitude oracle covering the five natal epochs has been supplied or verified.

Therefore:
- natalHistoricalNumericalCertified remains false.
- shadbalaNumericallyCertified remains false.
- productionIntegrationAllowed remains false for the research model.
- No approximate or modern Swiss longitude is substituted into the classical same-frame model to fill the missing historical evidence.

## Regression and CI

The focused workflow classical-cheshta-reference-frame-qa.yml runs:
- Historical same-frame Saura True Longitude research audit.
- Production source scan and five-chart mixed-frame guard.
- B.V. Raman printed standard-horoscope and Node/Browser parity regression.
- Consolidated Uttara Kalamrita / Cheshta research regressions.

A green test result is a software regression result, not a certificate of historical astronomical accuracy or predictive validity.

**Release decision:** keep the changes on a separate review branch. Do not merge into main without explicit approval.
