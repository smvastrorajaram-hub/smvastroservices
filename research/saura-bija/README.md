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
- Consistent planetary-system barycentre targets are used: Mercury 199, Venus 299, Mars 4, Jupiter 5, Saturn 6. Each returned target header and the Earth-centre header identifies DE441. Mars centre (499) and Jupiter centre (599) currently select separate target ephemerides, so those IDs are not mislabeled as DE441.

For the comparison every fixture record is passed through the same explicit frame-transfer function used by the on-demand adapter: the JPL tropical apparent longitude is transferred using the Burgess 1 January 1860 zero-point (18°05′08.25″) plus the Lahiri ayanāṃśa precession delta at that epoch. The classical Bīja True Longitude is then compared to that independently sourced JPL apparent position. All 3,000 comparisons are finite and complete.

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

## Phase D — separate outputs and on-demand DE441 apparent True: implemented

The research API now exposes three distinct products and never substitutes one for another:

| Product key | Meaning | Coordinate/source identity |
|---|---|---|
| `CLASSICAL_BIJA_MEAN` | Bīja-corrected classical mean longitude | Traditional Saura-nirayana |
| `CLASSICAL_BIJA_TRUE` | Four-pass Sūrya Siddhānta true longitude | Traditional Saura-nirayana; strict DE441 accuracy gate remains failed |
| `DE441_GEOCENTRIC_APPARENT_TRUE` | JPL apparent geocentric longitude for the exact requested epoch | DE441 Earth-centred IAU76/80 ecliptic-of-date, transferred to the declared Saura sidereal frame |

The new `research/saura-bija/saura-de441-apparent-true.mjs` adapter queries the NASA/JPL Horizons API using a discrete Julian Day list (`TLIST_TYPE=JD`), Earth centre `500@399`, observer quantity 31, UT time input, and the DE441 planetary-system barycentre target IDs (Mercury 199, Venus 299, Mars 4, Jupiter 5 and Saturn 6). Saturn uses the Saturn-system barycentre (target 6), matching the 1800–2399 reference fixture. The adapter requires the response headers to identify DE441 for both the target barycentre and Earth centre. A different ephemeris, malformed response, unsupported date, or multiple data rows causes an error; there is no silent fallback.

The sidereal transfer is an explicit function, not a hidden default:

`Saura offset(t) = 18°05′08.25″ + [Lahiri(t) − Lahiri(1860-01-01)]`

The adapter requires the caller to supply the date-specific offset and checks that the reference JD exactly matches the classical calculation JD. The JPL quantity is *apparent* ecliptic-of-date longitude (including light-time and relativistic/stellar-aberration corrections); it is not described as a geometric longitude or a classical mean place. The three products carry separate keys, source labels and frame labels.

The 600-row-per-planet annual fixture uses the same five DE441 barycentre targets and is used only for annual regression checkpoints. It is not interpolated for intermediate dates. Arbitrary supported epochs are queried directly from JPL Horizons. CI uses a mocked API response to test request construction, DE441 header enforcement, parsing, frame conversion, epoch matching and output separation; it does not depend on network availability.


## Phase E — geometric DE441 and Burgess/IAU76 frame audit

A second, non-apparent reference has been added so that a classical geometric true-place calculation is not judged only against apparent observer positions.

The independent fixture `tests/fixtures/saura-bija-jpl-de441-geometric-vectors-annual-1800-2399.json` contains 600 annual Earth-geocentric geometric position vectors for each of the five planetary-system barycentres (Mercury 199, Venus 299, Mars 4, Jupiter 5, Saturn 6). Its Horizons request uses:
- `EPHEM_TYPE=VECTORS`, vector table 1.
- `VEC_CORR=NONE`: geometric states without light-time or aberration corrections.
- Earth centre `500@399`, DE441 for both target and centre.
- Ecliptic J2000.0 axes, ICRF.
- UT1 before 1962 and UTC thereafter.

The geometric vectors are transformed to the mean ecliptic of date using an explicit IAU 1976 precession chain: J2000 ecliptic → J2000 equatorial → equatorial of date → mean ecliptic of date. The Saura sidereal origin is held to Burgess's 1 January 1860 Hindu sidereal-sphere zero point (18°05′08.25″), propagated by the IAU76 precession longitude of the 1860 equinox. This source-defined origin is not Lahiri ayanāṃśa; a lower residual from substituting Lahiri's absolute origin is not an admissible correction.

The new exported research functions in `saura-de441-apparent-true.mjs` are:
- `sauraIau76PrecessionLongitudeFromBurgessEpoch(jdUt)`
- `sauraSiderealOffsetFromBurgessIau76(jdUt)`
- `jplEclipticJ2000VectorToMeanEclipticOfDateLongitude(vector, jdUt)`

`tests/saura-bija-geometric-reference-diagnostic.mjs` compares the classical true longitude against the geometric vector fixture, separately measures apparent-minus-geometric differences against the existing quantity-31 fixture, and repeats the one-factor ablations for mean motion, Mandocca, geometry and frame. The annual diagnostic is not a daily certification and does not tune planet-specific coefficients.

## Phase F — source audit of the four correction stages

The source-level audit compared the implementation with Burgess's translation of Sūrya-Siddhānta II.29–45 and his 1 January 1860 Mercury worked example.

### What matches the historical source

1. **Mean / conjunction selection.** For Mercury and Venus, the classical system exchanges the roles: the Sun supplies the mean place while the planet's own orbit supplies the conjunction/śīghrocca. The current selector implements that interchange. Burgess explicitly describes it in the Mercury worked example.
2. **Anomaly direction and sign.** The kendra is measured forward from the planet to the apsis or conjunction; an equation is additive in the Aries half and subtractive in the Libra half. For Mercury/Venus, the exchanged conjunction makes the commutation direction reverse. The current normalised signed-sine calculation reproduces that direction.
3. **Manda geometry.** Sūrya-Siddhānta II.39 uses the corrected variable epicycle multiplied by the base-sine and divided by 360, then takes the corresponding arc. The research engine's `verse39-direct-jya` branch follows this rule.
4. **Śīghra geometry.** II.40–42 requires the corrected epicycle's base/perpendicular components and the variable hypotenuse. The current `atan2` form is the continuous-trigonometric equivalent of that construction.
5. **Four-stage order.** The sequence is conjunction half-correction, apsis half-correction, apsis full-correction applied to the original mean place, then conjunction full-correction. This is the sequence described by Burgess under II.43–45 and matches the four-pass implementation.

### 1860 numerical source check

Burgess's Mercury example gives:
- Mean longitude: 8 signs 18°13′13″.
- Conjunction/śīghrocca: 4 signs 16°57′22″.
- First Śīghra equation: 21°12′, subtractive.

The new regression feeds those source inputs through the actual engine. It obtains -21.1866191109°, within 0.02° of the printed -21°12′. This verifies the first Śīghra correction's sign, variable-epicycle geometry and continuous-Jya numerical implementation against a historical worked example. It is not a full six-planet true-place certification.

### What the 600-year stage ablations show

The geometric DE441 test removes one correction family at a time. These removals are diagnostic counterfactuals only; they are not proposed changes to the classical model.

| Graha | Baseline RMS | Manda removed RMS | Śīghra removed RMS |
|---|---:|---:|---:|
| Mercury | 4.7416° | 2.7647° | 14.9778° |
| Venus | 5.8945° | 5.6397° | 32.4808° |
| Mars | 5.7592° | 11.8658° | 27.3927° |
| Jupiter | 2.4797° | 4.6450° | 8.3480° |
| Saturn | 6.0099° | 7.4581° | 7.2154° |

Interpretation:
- Removing Śīghra makes every planet materially worse. The first Śīghra stage also reproduces Burgess's 1860 Mercury example. The evidence does not point to a general Śīghra sign/order bug.
- Removing Manda improves Mercury and slightly improves Venus in this modern-reference diagnostic, but worsens Mars, Jupiter and Saturn. Since the source prescribes both correction families for all five planets, disabling Manda globally would contradict the text and is not accepted.
- The mixed Manda response makes the next research target the **Manda input chain per planet**: date-dependent mandocca/apogee provenance, the ancient apsis revolution rates, epicycle source table and its interpolation convention. The present Kali-epoch Mandocca and the older 2024-anchor series differ by at most 0.000044° in this 600-year test, so that old-vs-new propagation choice is not the multi-degree cause.
- Global alternative Manda denominator conventions do not produce a universal improvement. Do not select a different formula per planet to fit DE441.
- Raw mean-motion ablation improves Jupiter's RMS from 2.4797° to 1.2775°, but worsens the other four (and greatly worsens Venus and Saturn). This is evidence for a Jupiter-specific historical-rate question, not permission to discard the source-defined Bīja profile.

### Current forensic conclusion

No general four-pass sequencing or Śīghra sign error has been demonstrated. The main unresolved error is within the historical model's Manda/apsis input and the planet-specific historical mean-motion representation, with a separate Jupiter rate discrepancy. The classical model remains a historical reconstruction, not a 0.05° modern-ephemeris solution. The production engine must not be silently modified on the basis of these ablations.

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
