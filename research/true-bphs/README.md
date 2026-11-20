# TRUE BPHS SHADBALA — NAELOS DE440 research engine

**Engine ID:** `TRUE_BPHS_SHADBALA_NAELOS_DE440`  
**Release:** `1.1.0-research-lahiri`  
**Status:** Research-only; not connected to production.

This isolated engine calculates seven grahas × six Shadbala components using BPHS source rules. NAELOS Ephemeris 0.1.3 with the checked-in JPL DE440 binary tables supplies all apparent geocentric planetary True Longitudes. The engine is separate from the current B.V. Raman `strength6` calculation.

## One coordinate frame: effective Lahiri

The BPHS engine has one sidereal coordinate frame only:

`NAELOS_TRUE_ECLIPTIC_OF_DATE_EFFECTIVE_LAHIRI_V1`

At each exact TT epoch, the common effective Lahiri offset is determined from the same-epoch Swiss apparent tropical Sun longitude minus the Swiss apparent Lahiri-sidereal Sun longitude. That one common rotation is applied to all seven NAELOS planetary longitudes, the true lunar node, the twelve Bhava Madhya cusps, the ascendant, midheaven and vertex. Swiss supplies the coordinate-frame offset and time conversion only; it does not replace NAELOS planetary positions.

The V365 Mean / Sheeghroccheya source model and its previously checked input selection are retained. Its source-native angular values are rotated by the same date-specific amount into the effective Lahiri frame before they are passed to BPHS Cheshta. Thus all three Cheshta inputs (Mean, True and Sheeghroccheya) share the same frame ID and exact natal epoch. No Saura coordinate frame is used as the BPHS output or calculation frame.

## Calculation chain

1. **Time:** resolve local birth date/time using the supplied IANA timezone or exact UTC offset; convert once to UT1 and TT.
2. **True Longitude:** NAELOS Ephemeris 0.1.3 evaluates apparent geocentric true-ecliptic-of-date positions from the checked-in JPL DE440 tables. Verify every required binary against `naelos-ephemeris/manifest.json` by byte length and SHA-256.
3. **Sidereal coordinates:** reduce NAELOS tropical apparent positions into the common effective Lahiri frame using the same-epoch Swiss frame calibration described above.
4. **Mean / Sheeghroccheya:** retain the V365 mean-motion source selector. Rotate Sun and planet mean values uniformly into the same effective Lahiri frame before any Cheshta computation.
5. **BPHS Cheshta:** BPHS I Chapter 27 verses 24–25 midpoint / kendra / three-Virupa arithmetic. Uttara Kalamrita II pp.42–43 selects inner/outer input pairs only.
6. **Other Bala:** BPHS source helpers calculate Sthana, Dig, Kala, Naisargika and Drig. NAELOS true-equator-of-date declinations and apparent local solar-time inputs are retained for Ayana and Kala calculations.
7. **Sripati Bhava:** NAELOS Porphyry cusps are converted into the same effective Lahiri frame for Bhava Madhya; Arambha boundaries are midpoints between adjacent Madhya values.
8. **Graha Yuddha:** eligibility and winner fallback use the same degree-and-minute / same-Bhava / northern-ecliptic-latitude rule from Uttara Kalamrita II p.41 where BPHS is silent. BPHS I Chapter 27 verse 20 supplies the magnitude from pre-war Shadbala differences. Ambiguous or overlapping wars withhold affected totals and Rupas.

## PAC 2026 validation

The research workflow downloads the seven official PAC 2026 Nirayana PDFs and verifies their SHA-256 / byte-length manifest. It extracts 365 daily entries for each of Sun, Moon, Mars, Mercury, Jupiter and Saturn (2,555 rows total) and compares them at 00:00 TT with NAELOS DE440 in the **same common effective Lahiri frame**. The acceptance gate remains 0.36 arcseconds. The PAC PDFs say Nirayana but do not name Lahiri explicitly; Lahiri is therefore identified as the inferred convention supported by the numerical cross-check, not as a quoted PAC specification.

This 2026 daily comparison is not an all-epoch historical certificate and does not establish independent provenance of the underlying PAC and NAELOS integrations.

## Natal and regression scope

The five-natal regression verifies the NAELOS tropical comparison and checks that every pinned Mean / True / Sheeghroccheya triple is uniformly transferred into the effective Lahiri frame without changing BPHS Cheshta arithmetic. The engine checks a single shared frame ID and exact epoch across planetary positions, cusps and all five Cheshta triples.

A deterministic audit calculates one seeded-random Indian natal chart per civil year from 1800 through 2399. This is numerical coverage and component-reconciliation evidence only. It is **not** independent historical verification at every birth instant.

Every result returns `classicalCertified:false`. The engine metadata and result keep `productionIntegrationAllowed:false`.

## Run

```sh
npm install --no-save --no-package-lock --ignore-scripts naelos-ephemeris@0.1.3
node tests/true-bphs-naelos-engine-regression.mjs
node tests/pac-2026-seven-graha-naelos-regression.mjs
node tests/true-bphs-naelos-600y-research.mjs
```

The 600-chart audit writes `artifacts/true-bphs-600-random-natal-charts-1800-2399.json`.

## Production boundary

No production integration is included. The engine remains under `research/true-bphs/`; it is not imported by Horoscope, Marriage Matching, Calendar, public service workers, site bundles, PWA repositories, APKs, or deployed services. No cache version, app version, package manifest, customer data or production calculation is changed by this research branch.
