# INPOP daily and event validation — protocol

**Gate:** MODERN_DRIK_BIJA_DAILY_AND_EVENT_INPOP_0_05  
**Status:** Implemented in the research branch; awaiting the full GitHub Actions execution.  
**Reference:** IMCCE Miriade, INPOP planetary theory.  
**Candidate:** explicit Swiss Ephemeris Moshier plus the frozen DE441-trained v0.1 secular Dṛk correction.

## Daily coverage

The Gregorian interval 1800-01-01 TT to 2400-01-01 TT contains 219,145 daily intervals. The inclusive daily samples are 1800-01-01 through 2399-12-31: 219,145 dates per planet and 1,095,725 positions across the five planets.

The INPOP API is queried in chunks no larger than its documented 5,000-date limit. The script rejects mismatched dates, incomplete rows, changed theory identity, non-TT time scale, non-geocentric centres, non-ecliptic frames and non-apparent output. Each reference row is compared with Moshier at the same TT epoch. The fixed v0.1 coefficients are evaluated at fractional decimal year; they are never refit on the daily sample.

## Event-focused coverage

Events are first located from the independent daily INPOP longitudes:
- Geocentric apparent longitude station reversals for each planet.
- Planet-Sun conjunction and opposition crossings.
- Mutual conjunction crossings for every pair among the five planets.

For every detected event, the test requests nine points at 6-hour increments from 24 hours before through 24 hours after the event. Event epoch lists are submitted in chunks no larger than the documented Miriade 1,000-epoch list limit. If two windows overlap, exact duplicate timestamps are evaluated once.

The test separately reports raw-Moshier and corrected-model errors. Every planet must meet the strict 0.05° maximum in the daily and event-focused subsets. The 0.05° threshold is not relaxed.

## Frame and timescale note

The Miriade request is explicitly geocentric, apparent-of-date, ecliptic-plane, TT. Moshier uses the same TT calendar epochs, passing TT Julian Day as the Swiss swe_calc ET argument; the TT-to-TDB (ET) difference is millisecond-scale and far below the angular threshold. Any systematic coordinate-frame mismatch will appear in the residuals and must be investigated rather than removed by changing the threshold.

## Full result

The CI job writes the machine-readable per-planet report to modern-drik-bija-inpop-validation-output/INPOP_DAILY_AND_EVENT_REPORT.json and uploads it as the MODERN-DRIK-BIJA-INPOP-DAILY-EVENT-VALIDATION artifact. This document is protocol only; it is not an accuracy certificate until the workflow produces a complete passing report.

## Official reference documentation

- IMCCE Miriade ephemcc API: https://ssp.imcce.fr/webservices/miriade/api/ephemcc/
- IMCCE Miriade ephemcc HOWTO and API limits: https://ssp.imcce.fr/webservices/miriade/howto/ephemcc/
- IMCCE INPOP solutions: https://www.imcce.fr/inpop
