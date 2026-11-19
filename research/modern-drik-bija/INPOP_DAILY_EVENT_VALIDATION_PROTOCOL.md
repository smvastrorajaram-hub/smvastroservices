# Monthly and event-focused INPOP validation — protocol

**Gate:** MODERN_DRIK_BIJA_MONTHLY_AND_EVENT_INPOP_0_05  
**Status:** Implemented in the research branch; awaiting a complete passing CI execution.  
**Reference:** IMCCE Miriade, INPOP planetary theory.  
**Candidate:** explicit Swiss Ephemeris Moshier plus the fixed DE441-trained v0.1 secular Dṛk correction.

## Monthly coverage

The calendar interval 1800-01 through 2399-12 contains exactly 7,200 monthly epochs (the first day of each month at 00:00 TT). The comparison covers five planets, for 36,000 independent monthly positions.

Miriade's ephemcc service accepts explicit lists of epochs in a text file, with a documented maximum of 1,000 epochs per POST. The monthly grid is therefore sent in ascending batches of no more than 1,000. The request omits -ep, -nbd and -step as required for epoch-list POSTs. The response parser rejects missing rows, changed theory identity, non-TT time scale, non-geocentric centre, non-ecliptic plane, non-apparent coordinates and any returned epoch mismatch.

The fixed model coefficients are those fitted previously on the central 1900–2299 JPL DE441 annual training block. No monthly INPOP value is used to train or retune them.

## Why an additional event scan is required

A monthly reference grid alone can miss short retrograde intervals, station reversals, or conjunction/opposition crossings between month starts. To avoid that aliasing:
- A separate 12-hour Moshier-only candidate scan locates station reversals for each planet.
- The same candidate scan locates planet-Sun longitude conjunction and opposition crossings.
- It locates pairwise mutual longitude conjunctions among the five planets.
- The 12-hour Moshier scan is only an event locator; it is **not** a daily or monthly independent-reference comparison and does not contribute INPOP validation rows.

For every located event, independent INPOP is queried at nine epochs from 24 hours before through 24 hours after, spaced 6 hours apart. Epoch-list requests respect the 1,000-epoch limit. Duplicate timestamps within an event window are evaluated only once.

## Strict accuracy requirement

Raw Moshier and corrected Dṛk output are separately compared against INPOP at the same TT epoch and frame. For every planet:
- the maximum absolute error on all 7,200 monthly reference epochs must be ≤0.05°;
- the maximum absolute error on all event-focused epochs must independently be ≤0.05°.

The threshold is not relaxed. An API/metadata failure is not a numerical PASS. A workflow report is required before issuing any full certificate.

## Coordinate and timescale contract

Miriade is requested with INPOP theory, geocentre observer 500, apparent-of-date ephemeris, ecliptic reference plane, and TT. The response's rectangular apparent position vector px/py/pz is converted to longitude using atan2(py, px). Moshier is queried at the same TT calendar epoch and returns geocentric apparent tropical ecliptic-of-date longitude. Any frame-systematic discrepancy must be investigated, not fitted away on the INPOP data.

## Full result

The CI job writes the machine-readable per-planet report to modern-drik-bija-inpop-validation-output/INPOP_MONTHLY_AND_EVENT_REPORT.json and uploads it as the MODERN-DRIK-BIJA-INPOP-MONTHLY-EVENT-VALIDATION artifact. This protocol is not itself an accuracy certificate.

## Official reference documentation

- IMCCE Miriade ephemcc API: https://ssp.imcce.fr/webservices/miriade/api/ephemcc/
- IMCCE Miriade ephemcc HOWTO including epoch-list POST and 1,000-epoch limit: https://ssp.imcce.fr/webservices/miriade/howto/ephemcc/
- IMCCE INPOP solutions: https://www.imcce.fr/inpop
