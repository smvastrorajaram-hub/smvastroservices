# Modern Dṛk-Bīja v0.1 — annual DE441 holdout test report

**Test run:** GitHub Actions [#44601864425](https://github.com/smvastrorajaram-hub/smvastroservices/actions/runs/44601864425)  
**Gate:** MODERN_DRIK_BIJA_TRUE_ANNUAL_DE441_TIME_BLOCKED_0_05  
**Result:** PASS for 3,000 annual checkpoints only  
**Model:** MODERN_DRIK_BIJA_TRUE / 0.1.0-research  
**Status:** Research-only; not production eligible; not a full astronomical certification.

## Frozen test contract

- Candidate: Swiss Ephemeris 2.10.03, explicitly called with Moshier flag `MOSEPH=4`.
- Reference: NASA/JPL Horizons DE441, Earth-geocentric apparent quantity 31.
- Frame: tropical apparent ecliptic-of-date on both sides; no ayanāṃśa subtraction.
- Epoch cadence: 1 January of each year, 1800 through 2399.
- Fit interval: 1900–2299, 400 observations per planet.
- Blind time-block holdouts: 1800–1899 and 2300–2399, 200 observations per planet.
- Hard gate: each planet's maximum absolute wrapped residual must be ≤0.05° on the entire 600-row interval and separately on the holdout rows. No threshold relaxation.

The fitting function selects the central 1900–2299 interval itself. Holdout rows are not passed into the least-squares coefficient calculation.

## Results

| Planet | Raw Moshier max | Training max after correction | Blind holdout max | Full 600-year max after correction | Full corrected RMS |
|---|---:|---:|---:|---:|---:|
| Mercury | 0.007839293° | 0.004583222° | 0.009046213° | 0.009046213° | 0.001801286° |
| Venus | 0.006099853° | 0.003289335° | 0.004012013° | 0.004012013° | 0.001177131° |
| Mars | 0.003603334° | 0.001760731° | 0.002910197° | 0.002910197° | 0.000724677° |
| Jupiter | 0.001022138° | 0.000877068° | 0.001026282° | 0.001026282° | 0.000229904° |
| Saturn | 0.000737207° | 0.000318613° | 0.000544755° | 0.000544755° | 0.000139758° |

**Global maximum after correction: 0.009046213°**, approximately 5.53 times below the hard 0.05° limit. All five planets pass the annual full-grid and blind-holdout gates.

The full-grid corrected p95 values were:
- Mercury 0.004509052°
- Venus 0.003016202°
- Mars 0.001768064°
- Jupiter 0.000559375°
- Saturn 0.000338751°

## Fitted secular coefficients

Model equation:
`r(y) = c0 + c1 × ((y − 2100) / 100)`

Output equation:
`λ_corrected(y) = normalize360(λ_MOSEPH(y) − r(y))`

| Planet | c0 at 2100 (degrees) | c1 (degrees / century) |
|---|---:|---:|
| Mercury | +0.000513746719 | +0.000475626375 |
| Venus | +0.000563681494 | +0.000513184724 |
| Mars | +0.000253223386 | +0.000231004773 |
| Jupiter | +0.000049316292 | +0.000022846156 |
| Saturn | −0.000050664848 | −0.000049403258 |

These coefficients are fit parameters for this named modern model and this specified training reference. They are not historical Sūrya-Siddhānta Bīja constants.

## Important interpretation — passing the limit is not proof of universal improvement

The raw Moshier kernel already satisfies the 0.05° annual DE441 gate. The secular correction does **not** improve every planet's maximum error:
- Mercury's full-grid maximum increases from 0.007839293° raw to 0.009046213° corrected.
- Jupiter's maximum changes slightly from 0.001022138° to 0.001026282°.
- Venus, Mars and Saturn show lower full-grid maxima after correction.

Therefore this run demonstrates that the fitted v0.1 model remains inside the declared 0.05° annual tolerance on both withheld edge blocks. It does not demonstrate a uniform accuracy improvement over Moshier, nor that the secular term is a necessary or physically superior correction. The raw-kernel and corrected-model columns are retained to make that distinction visible.

## Scope exclusions and next gates

This report is **not**:
- a certification of the source-faithful historical `CLASSICAL_BIJA_TRUE`;
- a daily/continuous-time accuracy test;
- a test of every station, conjunction, opposition or apsis event;
- an independent INPOP/VSOP cross-check;
- an external accreditation or production-readiness certificate;
- evidence that the model is equivalent to a historical Bīja tradition or a complete heliocentric perturbation theory.

Before considering a full accuracy certificate:
1. Freeze and review a versioned coefficient artifact with derivation/provenance and checksum.
2. Run the dense daily 1800–2399 grid (approximately 1.1 million planet/date comparisons) and event-focused dense epochs, retaining the same ≤0.05° per-planet maximum.
3. Cross-check against an independent reference such as IMCCE INPOP or a suitably configured VSOP theory.
4. Complete a separate 3D heliocentric-to-geocentric frame, time-scale, Earth/Moon centre, light-time, aberration and deflection audit.
5. Keep the prototype research-only until reviewed and explicitly approved.

## Safety

PR #552 adds research files only. Historical Bīja source files and all production calculation paths remain unchanged. No production integration, merge, Render deployment, Cloudflare deployment, Firebase change, cache-version change or APK rebuild is part of this test.
