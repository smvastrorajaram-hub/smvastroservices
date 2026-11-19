# Historical Saura Bīja research model (1800–2399)

This PR adds a separate research layer. It does not edit production Horoscope calculations, Swiss/Lahiri, BPHS Shadbala, Marriage Matching, Calendar, cache versions, APKs, or deployed services.

## Phase A — printed Bīja Mean source reconstruction: PASS

The model uses Burgess's 1860 translation of the Sūrya-Siddhānta. The corrected Mahāyuga revolutions are:

| Graha | Original revolutions | Bīja-corrected revolutions |
|---|---:|---:|
| Sun | 4,320,000 | 4,320,000 |
| Mercury | 17,937,060 | 17,937,044 |
| Venus | 7,022,376 | 7,022,364 |
| Mars | 2,296,832 | 2,296,832 |
| Jupiter | 364,220 | 364,212 |
| Saturn | 146,568 | 146,580 |

The corrected daily mean rate is:

`360 × corrected_revolutions ÷ 1,577,917,828` degrees per civil day.

The regression reconstructs the raw and Bīja-corrected mean longitudes for 1 January 1860 at Ujjain midnight for all six classical bodies. Both sets match the printed Burgess positions within 1.0 arcsecond (the largest observed residual is 0.9674 arcsecond). The Ujjain meridian and Kali epoch are reused from the repository's existing Saura mean engine; the test does not replace the epoch or silently mix it with the Lahiri frame.

## Phase B — Kali-epoch Mandocca derivation: PASS

Mandocca is no longer extrapolated from the April 2024 anchor. It is derived from the published Surya-Siddhānta inputs:
- I.41–42: apsis revolutions per Kalpa.
- I.57–58: apsis longitudes at the beginning of Kali Yuga.

Kalpa civil days are computed as 1,000 × the civil Mahāyuga days. For each body the date-dependent Mandocca is:

`Kali-epoch apsis + 360° × apsis revolutions per Kalpa × elapsed local-mean days ÷ Kalpa civil days`

The five derived April 9, 2024 Mandocca values reproduce the existing published anchors within 0.158 arcsecond. This removes dependence on the previous 2024-anchor extrapolation and uses a single traditional Saura-nirayana frame.

## Phase C — independent JPL DE441 comparison: completed; strict classical accuracy gate NOT passed

The fixture `tests/fixtures/saura-bija-jpl-de441-annual-1800-2399.json` contains 600 annual reference dates for each planet: 3,000 rows in all. It was captured from NASA/JPL Horizons:
- Earth geocentric centre (399), DE441.
- Quantity 31: apparent observer-centred IAU76/80 ecliptic-of-date longitude/latitude.
- UT1 for dates before 1962, UTC thereafter.
- Saturn-system barycentre (target 6) is used for Saturn so the requested ephemeris span reaches 2399; Saturn body target 699 ends in 2250.

For the comparison the JPL tropical apparent longitude is transferred into the traditional Saura sidereal frame using the Burgess 1 January 1860 zero-point (18°05′08.25″) carried to each epoch by the Lahiri ayanāṃśa precession delta. The classical Bīja True Longitude is then compared to that JPL reference. All 3,000 comparisons are finite and complete.

### Measured result — annual checkpoints

Acceptance threshold was predeclared as maximum absolute longitude error ≤ 0.05° for every graha. This is a much tighter numerical-accuracy target than the historical classical model currently demonstrates.

| Graha | Samples | RMS error | 95th-percentile absolute error | Maximum absolute error |
|---|---:|---:|---:|---:|
| Mercury | 600 | 4.734911° | 6.802282° | 7.588441° |
| Venus | 600 | 5.890850° | 13.715045° | 21.503665° |
| Mars | 600 | 5.753817° | 7.230395° | 9.925365° |
| Jupiter | 600 | 2.477131° | 3.540302° | 3.993845° |
| Saturn | 600 | 6.007322° | 8.866978° | 9.459852° |

The residual is not a small rounding or numerical precision issue. The old-style four-pass classical geometry plus the historical corrected revolution counts does not reproduce the modern DE441 geocentric apparent true positions to the 0.05° requirement. The mean-source and apsis-source gates pass; the classical true-position accuracy gate fails.

**Correct next step:** retain Bīja-corrected Mean and classical Bīja True as separately labelled historical/traditional outputs. For an accuracy-critical true longitude, use the DE441-derived geocentric apparent position transformed to the same declared Saura/Lahiri sidereal frame, with its own reproducible source and frame metadata. Do not tune planet-specific constants to hide the residual, and do not silently replace the Bīja Mean with a modern osculating mean.

The current fixture checks annual epochs. It is a full 600-year coverage of yearly reference positions, not a daily 1.1-million-row comparison; daily or station/extrema sampling is a later dense-grid expansion. The result must not be described as a daily certification.

## Mean / śīghrocca selection

The existing BPHS/Uttara Kalamrita selection is retained: Mars/Jupiter/Saturn use their own mean and mean Sun as śīghrocca; Mercury/Venus use mean Sun as mean and their own orbit as śīghrocca.

## Source-family separation

The IMD Rashtriya Panchang's dated 22 March 2026 degree-correction table is a separate contemporary benchmark. Its one-date degree corrections must not be converted into annual rates or added on top of the Burgess corrected revolution counts. Brāhma-pakṣa and Ārya-pakṣa annual Bīja systems are also separate named models, not coefficients to transplant into this Saura-pakṣa profile.

## Safety boundary

The code and reports are isolated in this research branch. No production Horoscope, Swiss/Lahiri, BPHS Shadbala, Marriage Matching, Calendar, cache version, APK, Render, Cloudflare or Firebase changes are made. No production integration or merge is part of this PR.

## Primary references

- E. Burgess, *Translation of the Sūrya-Siddhānta* (1860), corrected mean motions and Kali-epoch apsis tables: https://upload.wikimedia.org/wikipedia/commons/2/2b/Translation_of_the_S%C3%BBrya-Siddh%C3%A2nta%2C_A_Text-Book_of_Hindu_Astronomy%3B_With_Notes%2C_and_an_Appendix_%28IA_jstor-592174%29.pdf
- IMD Rashtriya Panchang 2026–27 Bīja table: https://packolkata.imd.gov.in/panchang/en/bija_corrections
- Sahana Cidambi, Clemency Montelle and Kim Plofker (2024), Appendix A: https://doi.org/10.1177/00218286241241812
- JPL DE441 / Horizons: https://ssd.jpl.nasa.gov/planets/eph_export.html and https://ssd.jpl.nasa.gov/horizons/manual.html
