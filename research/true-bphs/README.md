# TRUE BPHS SHADBALA — NAELOS DE440 research engine

**Engine ID:** \`TRUE_BPHS_SHADBALA_NAELOS_DE440\`  
**Release:** \`1.0.0-research\`  
**Status:** Research-only; not connected to production.

This engine calculates the seven-graha, six-component Shadbala using BPHS source rules. It uses the checked-in NAELOS DE440 binary tables for the apparent geocentric True Longitude input. It is intentionally separate from the existing B.V. Raman \`strength6\` calculation.

## Calculation chain

1. **Time:** the supplied local birth date/time is resolved with the explicit IANA time zone (or an exact UTC offset). The same instant is converted to UT1 and TT before the NAELOS calculation.
2. **True Longitude:** NAELOS Ephemeris 0.1.3 evaluates the apparent geocentric true ecliptic-of-date positions from the checked-in JPL DE440 tables. The binary tables are checked against \`naelos-ephemeris/manifest.json\` by both byte length and SHA-256.
3. **Sidereal frame:** NAELOS tropical apparent longitude is transferred into the declared Saura-nirayana frame using the audited Burgess-1860 zero point plus the date-specific Lahiri precession delta. The same offset is applied to all seven grahas and the house Madhya cusps.
4. **Mean / Sheeghroccheya:** the existing V365 Saura-paksha selector is retained. Mars/Jupiter/Saturn use their own mean as Mean and Sun's mean as Sheeghroccheya; Mercury/Venus use Sun's mean as Mean and their own mean orbit as Sheeghroccheya.
5. **BPHS Cheshta:** Chapter 27 verses 24–25 midpoint / kendra / three-Virupa arithmetic. Uttara Kalamrita II pp.42–43 is used only to select the inner/outer planet input pair.
6. **Other five Bala:** BPHS source helpers calculate Sthana, Dig, Kala, Naisargika and Drig. Tropical equatorial declinations and apparent local solar time come from NAELOS.
7. **Sripati Bhava:** NAELOS Porphyry cusps are used as Bhava Madhya. Sripati Arambha boundaries are computed as midpoints between adjacent Madhya values, matching the existing SMV Sripati construction.
8. **Graha Yuddha:** eligibility and winner fallback use the same degree-and-minute / same-Bhava / northern-ecliptic-latitude rule from Uttara Kalamrita II p.41 where BPHS is silent. The magnitude applied to Kala is BPHS Chapter 27 verse 20's difference between the two pre-war Shadbala totals. Overlapping wars and exact latitude ties are unresolved; affected final totals and Rupas are withheld.

## Important scope

This is a modern-data BPHS calculator, not an implementation of the classical Sūrya-Siddhānta four-pass True Longitude theory. NAELOS DE440 supplies the modern apparent True Longitude; V365 supplies the traditional Saura mean positions. Their transfer into the same declared sidereal frame is explicit and visible in the returned provenance.

The five-natal NAELOS input baseline is retained as a pinned fixture from the earlier five Perambalur epochs (25 planet rows). The regression rechecks:
- NAELOS tropical True Longitude against the independent Swiss tropical calculation at the same TT epoch, with a strict 5-arcsecond bound;
- the five source Mean / True / Sheeghroccheya / BPHS Cheshta outputs against the pinned values;
- seven grahas × six components, final Virupa/Rupa arithmetic and frame/epoch checks;
- Yuddha edge cases, including exact same-minute selection, northern-latitude winner, overlapping candidate pairs and ties.

A second deterministic audit calculates one random natal chart per year from 1800 through 2399. This is numerical coverage and component-reconciliation evidence only. It is **not** independent historical verification at every birth instant.

Every result returns \`classicalCertified:false\`. The engine metadata and result both hard-code \`productionIntegrationAllowed:false\`.

## Run

From the repository root:

\`\`\`sh
npm install --no-save --no-package-lock --ignore-scripts naelos-ephemeris@0.1.3
node tests/true-bphs-naelos-engine-regression.mjs
node tests/true-bphs-naelos-600y-research.mjs
\`\`\`

The 600-chart audit writes:

\`artifacts/true-bphs-600-random-natal-charts-1800-2399.json\`

## Production boundary

No production integration is included. The engine is under \`research/true-bphs/\`; it is not imported by Horoscope, Marriage Matching, Calendar, public service workers, site bundles, PWA repositories, APKs, or deployed services. No service-worker file, cache release, app version, package manifest, customer data or production calculation is changed by this research branch.
