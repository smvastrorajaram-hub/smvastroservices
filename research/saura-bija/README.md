# Historical Saura Bīja research model (1800–2399)

This PR adds an isolated research module. It does not edit Horoscope production calculations, Swiss/Lahiri, BPHS Shadbala, Marriage Matching, Calendar, cache versions, APKs, or deployed services.

## Bīja profile used

The first implementation freezes the corrected Mahāyuga revolution counts from E. Burgess, *Translation of the Sūrya-Siddhānta* (1860), “Mean Motions of the Planets as corrected by the bīja”, pp. 22–23:

| Graha | Corrected revolutions / Mahāyuga |
|---|---:|
| Sun | 4,320,000 |
| Mercury | 17,937,044 |
| Venus | 7,022,364 |
| Mars | 2,296,832 |
| Jupiter | 364,212 |
| Saturn | 146,580 |

For body B, the corrected daily mean rate is:

`360 × corrected_revolutions(B) ÷ 1,577,917,828` degrees per civil day.

The longitude calculation reuses the existing Saura Kali epoch and Ujjain mean-meridian convention, rather than building a second epoch implementation. Existing BPHS/Uttara Kalamrita mean/śīghrocca selection is preserved: Mars/Jupiter/Saturn use their own mean and mean Sun as śīghrocca; Mercury/Venus use mean Sun as mean and their own orbit as śīghrocca.

## Do not mix the two Bīja tables

IMD Rashtriya Panchang gives a separately dated 22 March 2026 table with mean Surya-Siddhānta positions, a Bīja correction in degrees, and the resulting mean Nirayana positions. Mercury and Venus are explicitly listed at śīghrocca, not as geocentric mean longitudes. This table is used as a separate contemporary benchmark; its one-date degree corrections must not be turned into annual rates or added on top of the Burgess corrected revolution counts.

Cidambi–Montelle–Plofker (2024) also document separate Brāhma-pakṣa and Ārya-pakṣa annual Bīja systems. Those coefficients are separate named models, not interchangeable with the Saura-pakṣa revolution table.

## What the regression does now

`tests/saura-bija-600y-regression.mjs` checks the corrected rates, independent formula reconstruction, mean/śīghrocca routing, strict date limits, and four dates per year across 1800–2399. That exercises 2,400 instants and 12,000 five-planet mean/true result rows. The True Longitude output deliberately reuses the existing four-pass classical evaluator and current Mandocca research model, and is not yet an independent accuracy result.

## Concrete route to final historical accuracy

1. Freeze the source profile, epoch, Ujjain meridian and exact conventions; add separate profiles for IMD, Brāhma or Ārya only with their own sources and epochs.
2. Validate all historical mean positions against printed tables and independently reconstruct the 22 March 2026 IMD table. Keep inner-planet śīghrocca values distinct from geocentric mean positions.
3. Establish date-dependent Mandocca and śīghrocca values for all five planets from historical primary sources. Reconcile each Manda/Śīghra stage against printed worked examples without planet-specific fitted constants.
4. Generate geocentric apparent positions from JPL DE441 across the entire interval, transform to one declared ecliptic/equinox frame and then Lahiri sidereal longitude. Use Swiss Ephemeris Lahiri as a second implementation; do not compare a tropical or heliocentric quantity against a sidereal geocentric result.
5. First compare annual checkpoints and every retrograde station/extremum. Then run every day from 1800-01-01 through 2399-12-31 for all five planets (about 1.1 million rows). Record signed residual, RMS, 95th percentile and maximum error by planet and century. Check leap days, wraparound, direct/retrograde transitions and missing rows.
6. Before calling the engine numerically certified, require a predeclared error budget. Proposed strict gate: maximum absolute true-longitude residual ≤ 0.05° against the independent JPL-derived result for every planet/date. Require Browser/Node parity ≤ 1e-10° as a separate implementation gate. Where the classical model cannot meet that limit, expose its classical Bīja output separately and use DE441-derived Lahiri true longitude as the accuracy-critical position.
7. Only after those gates pass should Horoscope and Marriage Matching be wired to the selected certified output, followed by the existing regression suites. No production integration or merge is part of this PR.

## Primary sources

- Burgess, *Translation of the Sūrya-Siddhānta* (1860), corrected mean motions table: https://upload.wikimedia.org/wikipedia/commons/2/2b/Translation_of_the_S%C3%BBrya-Siddh%C3%A2nta%2C_A_Text-Book_of_Hindu_Astronomy%3B_With_Notes%2C_and_an_Appendix_%28IA_jstor-592174%29.pdf
- IMD Rashtriya Panchang 2026–27 Bīja table: https://packolkata.imd.gov.in/panchang/en/bija_corrections
- Cidambi, Montelle & Plofker (2024), Appendix A: https://doi.org/10.1177/00218286241241812
- JPL DE441 coverage and documentation: https://ssd.jpl.nasa.gov/planets/eph_export.html and https://ssd.jpl.nasa.gov/horizons/manual.html
