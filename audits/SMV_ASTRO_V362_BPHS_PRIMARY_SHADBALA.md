# SMV ASTRO V362 — BPHS-FIRST Shadbala: actual source behavior, corrections, certification gate

## User's priority policy
1. **Primary Shadbala rules:** R. Santhanam, *Brihat Parasara Hora Sastra* Volume 1, Chapter 27, PDF pp. 263–287 / printed pp. 264–288.
2. **Uttara Kalamrita only where BPHS is silent/ambiguous:** Chapter II, printed p.41 supplies a *north of the other planet* winner and same-house <=1° Graha Yuddha eligibility.
3. Do **not** replace an explicit BPHS rule with a different Uttara Kalamrita rule. PVR Narasimha Rao pertains to **Shodhana only**, already merged in PR #9. Other four requested topics not changed.

## Previously existing Shadbala implementation (live Phase 3)

`public/horoscope/offline/swiss_vedic.browser.mjs` already calculates:
- **Sthana Bala:** Uchcha, Saptavargaja (D1/D2/D3/D7/D9/D12/D30), Ojayugma, Kendradi, Drekkana from chart positions — BPHS Chapter 27 verses 1–6.
- **Dig Bala:** Angular separation of planetary longitude from directional maximum cusp — verses 7–7.5. Cusp-vs-midpoint semantics and independent positional oracle remain necessary.
- **Kala Bala:** Natonnatha, Paksha, Tribhaga, Abda, Masa, Vara, Hora, Ayana, planetary war — verses 8–17, 20. The birth sunrise in the existing code is a **geometric approximation**, not an independent Swiss exact rise event.
- **Cheshta Bala:** Sun uses own Ayana Bala; Moon uses Paksha Bala (v18). Five-planet Cheshta uses current speed-based eight-motion approximation **NOT** the mean/true longitude + Seeghrocha formula of vv24–25.
- **Naisargika Bala:** Fixed 1..7 natural strength ladder in Virupas, verse 14.
- **Drig Bala:** Existing signed geometric aspect strengths, Chapter 27 verse 19. Chapter 27 specific full Jupiter and Mercury aspect had been omitted before V362.

## Direct book-vs-code fixes

| BPHS direct rule | Prior V361 behavior | V362 correction |
|---|---|---|
| **Ch27 v19 / PDF p283**: take 1/4 of signed Drishti Pinda and **superadd entire measured aspect** of Mercury and Jupiter | Only 1/4 signed aspect for all planets | `bphsDrigBalaFromAspects` computes signed quarter Pinda + full Mercury/Jupiter contributions (signed as appropriate when Mercury is afflicted) |
| **Ch27 v20 / PDF p283**: when war occurs, **difference of their two Shadbalas** is added to winner and subtracted from loser | V361 used Uttara Kalamrita printed p45 **fixed +/-1 Rupa** in live chart | Resolve pre-war Shadbala for all 7; use BPHS **absolute difference**, not +/-60; re-evaluate final Phase 3 with the derived Yuddha Virupas. No recursive or double war bonus |
| Determination of which participant is victorious | BPHS v20 speaks of winner/loser without detailing geometric criterion | UK Chapter II p41 used **only for two-planet same-bhava, within-one-degree, northern-latitude winner**. Missing latitude / equal latitudes / triple war remains unresolved rather than invented |
| Chapter 27 verses 32–33 | Requirements 390/360/300/420/390/330/300 | Existing source values were already correct, unchanged |
| Chapter 27 verse 18 | Sun=Ayana, Moon=Paksha for Cheshta | Existing source values were already correct, unchanged |

**Independent regression:**
`tests/v362-bphs-primary-shadbala-regression.mjs` checks e.g. malefic Saturn 40, benefic Jupiter 60, benefic Mercury 20, Venus 30 => signed quarter 17.5 plus 80 full J/M = 97.5 Virupas; geometrical Jupiter 7th aspect 60 => 75 virupas on Mars; and a war at baseline 327.375 vs 351.25 => +/-23.875, **not** the Uttara p45 +/-60 convention. Also checks positive/negative cases, tie/overlap safeguards, five genuine Perambalur chart calculations and preservation of `classicalCertified:false`.

## Source disagreements and certification — do not mark full PASS without source math

- **BPHS vs Uttara Kalamrita on Yuddha magnitude is an actual conflict**: BPHS Ch27 v20 **difference between two Shadbalas**, UK Chapter II p45 **one Rupa** each; UK p41 notes **disc-diameter quotient** as another variant. BPHS prevails; UK is *only* eligibility/winner fallback.
- **Five-planet Cheshta Bala is not a full BPHS calculation yet:** BPHS vv24–25 needs planetary *mean longitude* and *Seeghrocha* as well as true longitude. Existing speed ratios are a classified-motion surrogate, not the exact required input. Do NOT certify these numerical Cheshta balas.
- **Accurate sunrise is not yet available:** the provider used by this browser engine does not expose a Swiss `rise_trans` primitive; calculated sunrise remains approximate. Thus exact sunrise-dependent Hora/Tribhaga and apparent-time Natonnatha remain unverified.
- **Drig angle interpolation and affliction classification:** BPHS v19 aggregation is tested here, but full degrees-to-aspect oracle and all conditions still require an independent book numeric crosscheck.
- **Positional / dignity**: existing V357 regression checks 19,026 varga boundaries and selected BPHS positional rules. It does not mathematically certify the entire 6-Bala system or every chart.
- **Sun/Moon phases and BPHS alternatives**: no silent change to the user-established general Moon strength convention or BPHS Paksha formula in this PR.
- **All seven planets / full totals:** book-specific structural tests passing prove the targeted rules and regressions, not complete Shadbala numerical certification or predictive outcome accuracy. Keep `classicalCertified:false` and `provisional:true` in output until all six categories have a genuine complete, independent source-based oracle.

## Scope and safe merge
Only change new supplemental BPHS arithmetic module, the current source calculation, independent numeric tests, CI workflow and this audit. Do not change Shodhana/Matching narrative/15-year forecasts/PWA/GeoNames/DST/Admin/Print/Payments.

Gate on complete Github Actions source QA and layout/HTTP smoke: a passing PR can be merged **as a targeted BPHS-first correction**, but not labeled full Shadbala certified.
