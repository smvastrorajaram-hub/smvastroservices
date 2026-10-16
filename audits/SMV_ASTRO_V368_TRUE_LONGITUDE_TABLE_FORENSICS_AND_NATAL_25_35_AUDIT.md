# V368 — True Longitude two-source forensic + five natal Shadbala comparison

**Date:** 17 October 2026. **Scope:** Read-only, classical model versus modern Swiss model; do NOT mix these model positions in certified Cheshta.

## Independent published-table diagnosis

Santhoju et al., *Journal of Astrophysics and Astronomy* **46:9** (2025), Tables 6 and 7 (Chaitra Pratipada 9 April 2024, Mandi). Verified publisher transcription at https://www.scribd.com/document/977832014/suryasiddhant (pp. 16, Table 6 and Table 7; original DOI https://doi.org/10.1007/s12036-024-10018-8).

The Table 6 **'Half-śīghra correction'** does not generate Table 7's **'Half-śīghra corrected'** stage from its printed mean. For all five planets, the printed Table 7 first stage equals the printed mean plus **twice** the printed Table 6 half correction, to <=0.0001°. Example Mars: mean 295.0651°; half +11.6844° gives **306.7495°**, yet Table 7 prints **318.4339°** (= mean + 2 × 11.6844°). Mercury: 353.2261° + 5.9244° = 359.1505°, Table 7 instead 5.0750° (mean + 2 × 5.9244° after wrapping). Venus: 353.2261° − 5.1368° = 348.0893°, Table 7 instead 342.9524°. Jupiter and Saturn follow the same pattern.

The paper's **final** true-longitude figures ARE arithmetically consistent with its Table 6 full manda/full sighra columns: mean + full manda + full sighra, modulo 360. Therefore **not** a proof that all scientific values are wrong; a demonstrable mismatch in the claimed *intermediate half-step stage*. Table 7's next intermediate column has additional differences and should not be silently used as a half-step oracle.

The Surya Siddhanta Ch 2 verses 43–45 require half-śīghra, half-manda, full-manda, full-śīghra in sequence (https://www.siva.sh/surya-siddhanta/2/41-45). V367 four-pass implementation follows this ordering. A printed mismatch in one example does not establish the cause of the remaining unverified V367 final-longitude differences without further analysis of the paper's particular geometry, rounding, and historical model.

## Five natal dates — 25 comparison pairs & 35 Shadbala outputs

Research-only test `tests/v368-published-stage-historical-shadbala-audit.mjs`:

1. Five birth instants, Perambalur Tamil Nadu, IST:
   - 04 May 1971 05:05
   - 11 Jan 1974 16:04
   - 31 Jul 1992 22:05
   - 15 Jun 1994 13:03
   - 06 Sep 2015 09:30
2. For each of five Mars, Mercury, Jupiter, Venus, Saturn, calculate V367 four-pass traditional unmodified Saura True Longitude and derived BPHS Virupa (source frame **traditional-Saura-nirayana-unmodified**).
3. Obtain each same UTC instant's **independently calculated Swiss-WASM modern Lahiri-sidereal geocentric true longitude**. Record 25 comparison differences explicitly labeled **DIFFERENT_MODEL_errorDegrees**. **Differences are not classical error scores** because classical unmodified Saura, Swiss Lahiri, and Bija-corrected government ephemerides are not the same astronomical model. These data show model divergence and aid diagnosis, but cannot satisfy the required 25 historical independent **classical** oracles.
4. Independently run the established offline Horoscope engine on all 5 births and inspect the **35 provisional seven-planet Shadbala totals**. Assert all numerical outputs are finite, all phase 3 `classicalCertified:false` and `provisional:true`.
5. Assert the published 2024 Table 6/7 five doubled initial corrections and correct Table 6 final arithmetic; assert 4/5 published 2024 V367 exact precision gate still unsatisfied.

## Genuine certificate

- **V365:** Classical Saura mean motion independent official 2026 uncorrected numbers, bounded PASS.
- **V366:** BPHS Cheshta arithmetic for 2026 official published Bija mean + true and published 2024 triples, PASS.
- **V367–V368:** separate four-pass evaluator exists; five historical DOB × 5 planets numerical diagnostics exist; 35 Shadbala Phase 3 outputs exist. This is **engineering / non-certification safety PASS** only.
- **NOT certified:** all dates classical-compatible true longitude, natal Cheshta at all 25 examples, fully sourced six-part Shadbala totals across seven planets.

Certificate cannot be signed because the known 2024 paper numerical discrepancy remains, historical time-dependent Bija/mandocca full verified astronomical model absent, and the Swiss modern comparison is a different model. No fitting of coefficients or cherry-picking examples allowed. The production provisional `motionClassical()` stays unchanged and PR #14 stays draft.
