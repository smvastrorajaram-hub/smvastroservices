# SMV ASTRO V361 — Uttara Kalamrita Chapter II Shadbala Supplement

**Scope / user restriction:** Shodhana is sourced from **P.V.R. Narasimha Rao** only (already merged in V360 PR #9). For Shadbala retain existing BPHS-based positional and temporal implementation, adding only demonstrable missing calculations from *Uttara Kalamrita*, Kalidasa, translation/notes Prof. P. S. Sastri, Chapter II, printed pp. 34–45, PDF pp. 19–24. Four other calculation topics remain out of scope.

## Source-trace decisions

| Uttara Kalamrita | Existing source | V361 corrective action | Residual limitation |
|---|---|---|---|
| II p.44: waxing Moon benefic and waning Moon malefic in Drig Bala | `drikBalaClassical` counted Moon as malefic unconditionally | Determine waxing/waning from Moon-Sun elongation before assigning sign to received aspect | The angle-to-strength `sputaDrishti` remains the earlier BPHS implementation pending separate numerical angle oracle |
| II p.44: isolated/well-associated Mercury benefic; badly associated Mercury malefic | Old test was combustion flag only, not affliction/conjunction | Apply same-rasi joining Sun/Mars/Saturn/Rahu/Ketu or waning Moon before assigning Drig sign | Malefic grouping and exact orbs not a substitute for full interpretive judgement |
| II p.41: Graha Yuddha if five eligible planets share a house and are within 1 degree, northern one victorious | `kala.yuddha` permanently 0 | Keep Swiss ephemeris ecliptic latitude; calculate eligible angular pairs; skip ties, missing latitudes, multi-way overlaps; exclude Sun/Moon/nodes | Not a certified astronomical apparent-disc calculation |
| II p.45: winning planet +1 Rupa, losing planet -1 Rupa, as rectification | No positive/negative correction | Evidence-gated `+60/-60` Virupas under labeled UK p.45 **variant** | II p.41 ALSO describes a different disc-diameter quotient war adjustment. This is an **internal source disagreement**, not reconciled |
| II p.45: total previous four Balas + Naisargika + signed Drig gives Shadbala | Basic composition existed without external test | Independent seven-planet numerical oracle with the exact printed examples | Book's example itself has no Graha Yuddha, so it does not certify the p.41 vs p.45 competing war formulas |
| II pp. 42–43: mean/sheeghra Cheshta calculations for five planets | Existing speed bucket heuristic (not exact) | No invented mean/apogee astronomical source or silent replacement | Full Cheshta remains **provisional** |
| II pp. 38–41: sunrise and time divisions | Approximate geometrical sunrise inherited from BPHS Phase 3 | Leave existing BPHS temporal framework unchanged | Sunrise precision remains a certification blocker |

## Published printed numerical oracle — II p.45

Names: Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn.
- Previous (first four) Bala Rupas: `[3.83825,5.564,5.3799,7.658,5.1384,4.47685,4.97275]`
- Naisargika Rupas: `[1,.857,.286,.428,.571,.714,.143]`
- Signed Drishti Rupas: `[+.2236,-.333,-.105,-.0256,+.066,-.0123,+.25]`
- Book Shadbala totals: `[5.06185,6.088,5.5609,8.0604,5.7754,5.17855,5.36575]`

`tests/v361-uttara-kalamrita-shadbala-regression.mjs` independently asserts these seven book totals, north/south war sign, angular wrap, one-degree and same-bhava boundaries, no Sun/Moon/nodal war, missing latitude/tie/triple-war guards, waxing Moon / conjoined Mercury, and three Perambalur natal source smoke cases. The workflow runs it with pre-existing V357 / V360 source and layout tests.

## Release honesty

This is a **source-validated improvement** to the existing provisional Shadbala, NOT a proof that classical full Shadbala is numerically certified or that its life predictions are accurate. It changes the already-rendered `strength3` numerical channel only when the source supports a Drig polarity or unambiguous two-planet graha-war correction. `classicalCertified:false` and `provisional:true` remain unchanged. Horoscope/Matching interpretation, Dasha/Gochara, PWA, covers, GeoNames/DST, login, payment and PDF code are untouched.

**Merge gate:** PR head Github Actions must be completed SUCCESS. Do not merge on syntax alone or claim all six Bala categories are book-certified. If source-level CI is successful, merge this limited patch and record unresolved Cheshta/Yuddha convention for later dedicated work.
