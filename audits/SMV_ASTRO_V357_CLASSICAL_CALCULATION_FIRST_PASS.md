# SMV ASTRO V357 — Five-book classical calculation audit (first corrective pass)
Date: 2026-10-16
Reference main commit: b4dbde7b793dc94cc7968c45cd9251001f5dd04e
Status: **PARTIAL SOURCE CORRECTION — FULL CERTIFICATION NOT GRANTED**

## References consulted directly
- R. Santhanam, *Brihat Parasara Hora Sastra*, Volume 1, PDF pp. 67–80, Chapter 6. Relevant passages: D2/D3/D7/D9 (pp. 67–71), D10 (p. 72), D16 (pp. 73–74), D20/D24 (pp. 75–76), D27 (pp. 77–78), D30 (p. 79), D40/D45 (pp. 79–80).
- R. Santhanam, *Brihat Parasara Hora Sastra*, Volume 2, PDF pp. 377–390, Chapters 67–69 (Trikona Shodhana, Ekadhipatya Shodhana and Pinda Sadhana).
- B. V. Raman, *How to Judge a Horoscope*, Volumes I–II: house/relationship judgement still requires a systematic independent rule trace; not certified by this pass.
- *Encyclopedia of Astrological Remedies*: remedial condition/source mapping remains pending; practices are traditional claims, not verified health outcomes.
The five PDFs total 2,116 PDF pages. The limited pages above were examined, **not** all pages.

## Confirmed code/reference mismatches on the main baseline
| Area | Main implementation | BPHS I reference | Status / action |
|---|---|---|---|
| D16 Shodasamsa | Grouped four subparts into signs using a 3-sign jump, dependent on odd/even parity | For movable signs start Aries; fixed signs Leo; dual signs Sagittarius; advance **one sign per subdivision** (PDF pp. 73–74) | **FAIL in main**; branch correction proposed |
| D27 Bhamsa | Start chosen using floor(sign index/3) | Fire starts Aries, Earth Cancer, Air Libra, Water Capricorn (PDF p. 78) | **FAIL in main**; branch correction proposed |
| D30 Trimsamsa | Advanced vargaSign and vargaLongitude contained wrong destinations, e.g. last odd section mapped to Taurus rather than Libra | Odd: 0–5 Aries, 5–10 Aquarius, 10–18 Sagittarius, 18–25 Gemini, 25–30 Libra; even: 0–5 Taurus, 5–12 Virgo, 12–20 Pisces, 20–25 Capricorn, 25–30 Scorpio (PDF p. 79) | **FAIL in main**; branch correction proposed |
| D45 Akshavedamsa | Odd/even parity start | Movable starts Aries, fixed Leo, dual Sagittarius (PDF p. 80) | **FAIL in main**; branch correction proposed |
| D2/D7/D9/D10 sign starting convention | Source mapping has expected branch/sign starts | BPHS I PDF pp. 67–72 | **PRELIMINARY CONSISTENCY ONLY**, boundary oracle is added to this branch |
| D20/D24/D40 sign start | Source appears consistent with the cited BPHS division starts | BPHS I PDF pp. 75–80 | **PRELIMINARY CONSISTENCY ONLY** |
| D60 | No independent source-to-book sign/deity crosswalk yet | BPHS I PDF pp. 81–85 | **PENDING** |

The corrected code is mirrored in **both** active browser module
\`public/horoscope/offline/astro_advanced.browser.mjs\` and legacy/server
\`astro_advanced.js\`; their unrelated contents are preserved.
No modifications are proposed to the already-correct D30 sign-lord selection
in \`public/horoscope/offline/swiss_vedic.browser.mjs\`.

## Independent regression added
\`tests/v357-bphs-varga-regression.mjs\` compares the corrected module's
\`vargaSign()\` and \`vargaLongitude()\` against an **independently coded**
book-table oracle for 12 signs, 14 Vargas, every division threshold and
adjacent epsilon degrees, including the unequal D30 sections.
It also tests D30 intra-section fractional longitudes. CI must execute the
new test as well as the existing five-chart, 799-calculation, matching and
timezone regressions before any merge. **A test being added is NOT a pass.**

## Remaining classical certification blockers
1. **Shadbala — NOT CERTIFIED**. Browser \`swiss_vedic.browser.mjs\` labels Phase 3 as Parashari Shadbala, but its hora uses a 06:00 convention; \`abda\` is hard-coded for Sun; \`yuddha\` is always zero; exact classical sunrise/annual/planetary war calculations and a book numeric oracle are missing. Its output is not certified numerical classical Shadbala.
2. **BAV/SAV — PARTIAL**. The 48/49/39/54/56/52/39 individual totals and 337 aggregate are structure/invariant checks only. They do not independently validate the 8 contributors' placement for all reference horoscopes or all tabular rules.
3. **Shodhana — NOT IMPLEMENTED IN BASE MODULE**. \`ashtakavarga()\` does not perform Trikona/Ekadhipatya reduction. \`sodhyaPinda()\` uses raw SAV sign index multiplication; this is **not** the classical, reduced per-planet Rasi/Graha/Yoga Pinda of BPHS II Chs. 67–69, pp. 377–390. Do not label its numeric output certified Shodhya Pinda. Separate implementation and textbook example oracle required.
4. **Remaining Vargas, dignities, functional ownership, aspects and yogas — NOT CERTIFIED** until independently checked against the five books and sign/degree boundaries.
5. **Vimshottari, 15-year house results and transit — PENDING** independent date calculations, opposite-indication evidence and human narrative/no-repetition checks.
6. **Marriage Matching — PENDING** integrated male/female D1/D7/D9 evidence, pair-specific 15-year timelines, consistent verdict and remedy alignment.
7. **Lifestyle/remedies — PENDING** identifiable book page plus graha/bhava/dasha condition. Keep cultural/religious advice separate from medical diagnosis/effectiveness.
8. **Admin published rule array — EMPTY**; the rule-editor framework must not be conflated with published live classical rules.

## Regression history and current acceptance
Historical repo report: 403 structural checks and 799 calculation checks passed before this change, across five Perambalur charts. This audit does **not** re-label those as a 2,116-page certification.
For this branch, verify new CI run results before claiming PASS.
Full 5-chart and 25-pair regression, UI/PWA/GeoNames/DST/chart-style/print/save/admin/payment smoke and live deployment checks have not been independently executed in this limited pass.

## Deployment separation
The source corrections are only on \`audit/v357-bphs-varga-fixes\`,
not merged into \`main\`; Cloudflare live deployments, UI,
PWA, login, payment, print and save are intentionally untouched.
After every regression is green and the changed Varga output is reviewed
on actual five birth charts, the source corrections can be merged separately.


## Third pass — BPHS II Ashtakavarga reduction candidate
- Reviewed BPHS II Santhanam PDF pp. 381–390, Chapters 67–69, including the Trikona and Ekadhipatya examples and published Shodhya Pinda example.
- Added \`public/horoscope/offline/classical-shodhana.browser.mjs\` as an isolated, **NOT LIVE** numerical implementation. It separately records:
  1. Trikona Shodhana: groups (Aries/Leo/Sagittarius), (Taurus/Virgo/Capricorn), (Gemini/Libra/Aquarius), (Cancer/Scorpio/Pisces); subtract minimum only when all three are nonzero.
  2. Ekadhipatya Shodhana: five dual-sign owners, with planet-occupancy cases and an explicit audit trace for each reduction; follows the book's worked numeric examples where literal English prose is ambiguous.
  3. Pinda Sadhana: **the reduced BAV**, not the unmodified Sarvashtakavarga, is multiplied by Rasi/Graha multipliers. Rahu/Ketu omitted from Graha Pinda.
- Added \`tests/v357-bphs-shodhana-regression.mjs\`: the Sun's Chapter 67 sample trine reductions; the Chapter 68 imaginary example of different occupied/unoccupied sign cases; Chapter 69 published **Rasi Pinda 100 + Graha Pinda 48 = Yoga Pinda 148**; input validation; and five Perambalur charts × seven BAV rows.
- Proposed numeric tests must be read from the CI result before being classified PASS. A unit test is not a source-to-book numerical certification unless its expected numbers originate independently from the printed example.
- **Unresolved blocker:** the live \`sodhyaPinda()\` helper still multiplies raw SAV by sign index and is not a complete BPHS II Ch. 69 implementation. Do not present that helper as certified classical Shodhya Pinda or automatically replace existing predictions. First audit differences on five charts and match the desired display fields.
- V358 compact UI/layout correction is now merged into main separately; V357 retains it by an explicit two-parent reconciliation commit on its **draft** branch only. This does NOT approve Classical calculations for production.

**V357 completion state:** Classical source errors D16/D27/D30/D45 corrected in draft; independent Shodhana candidate added in draft; certification of numerical Shadbala, the 16 Vargas and five books in full, conditional remedies, 15-year output and matching narratives remains PENDING.


## Verified CI acceptance — V357 draft head 35516b6 (2026-10-16)
Source QA GitHub Actions run **38944587383**: COMPLETED / SUCCESS. See
https://github.com/smvastrorajaram-hub/smvastroservices/actions/runs/38944587383 .

| Gate | Recorded result | Classical certification meaning |
|---|---|---|
| Source JS syntax | PASS | Parser acceptance only |
| 799 Calculation regressions, 5 natal / 25 matching pairs | PASS | Historical behavior/invariants, not literary interpretations |
| 403 structural assertions, five Perambalur births | PASS | Structure and BAV/SAV totals, not exhaustive reference cases |
| BPHS I Varga boundary oracle | **19,026 assertions PASS** | D2/D3/D4/D7/D9/D10/D12/D16/D20/D24/D27/D30/D40/D45 sign-mapping boundaries; **not D60 nor all dignity logic** |
| BPHS II Shodhana/Pinda | **161 assertions PASS**, five births × seven BAV rows | Confirms included Chapter 67/68/69 numeric worked examples including Pinda 100+48=148; exact editorial interpretations and live integration still pending |
| V358 mobile/desktop Chromium shell geometry | PASS | No reported UI layout regressions in test fixture |
| GeoNames/DST/UTC/print-source regression | PASS | Limited source tests, not global production scenario certification |

**Do not merge this V357 draft solely on the basis of these checks.**
Unverified areas: full exact Shadbala including hora/abda/yuddha, all D60 and other boundary variants, Raman's 12-Lagna functional-lordship interpretation and 12-house evidence, individualized 15-year Dasha/Gochara narrative, duplicate sentence elimination, detailed Marriage Matching verdict alignment and remedy source applicability. Live horoscope output and PDF page-by-page acceptance remain outstanding.

## Fourth pass — Chapter 68 diagram/prose/number mismatch (review required)

Direct visual reading of Santhanam, *BPHS II*, Chapter 68, printed pp. 875–877 (PDF pp. 385–387), revealed an editorial conflict. The printed imaginary illustration's planetary-position diagram places **Jupiter in Gemini (sign 3)** while the following prose says **both Gemini and Virgo contain no planet**, and the displayed Ekadhipatya reductions turn both 4-point signs into 0.

Under the stated one-occupied/one-empty rule, if Gemini contains Jupiter, its 4 points are kept and only Virgo's 4 are reduced to 0. The current candidate test formerly used the prose interpretation (Gemini unoccupied) to reproduce the printed 0/0 outcome. That does *not* independently establish that the original printed diagram's planetary placements agree with those output values.

**Controlled change:** The isolated experimental Shodhana regression now explicitly checks both readings, recording the mismatch instead of falsely claiming complete book/example agreement. Neither live Horoscope results nor the Shodhana source algorithm have been changed. The book's editorial conflict must be resolved against an independently authoritative Sanskrit commentary or a declared calculation school before exact Ekadhipatya certification. The test may pass at detecting this **known discrepancy**; the underlying book example remains **UNRESOLVED / NOT CERTIFIED**.

V359 equal-gutter UI changes were merged to main separately as `45264d220517d798ae9935b79ec685fbfb77ddfa`; all classical changes in this draft are still not deployed. No extrapolation from numeric test checks to predictions/remedies is valid.

## Fifth pass — user-approved Shodhana skip; BPHS I Chapter 27 positional Shadbala

**Shodhana — SKIPPED BY USER REQUEST**. No further Chapter 68 Shodhana tests are executed in this CI workflow, and the experimental Shodhana module remains offline and unconnected. Its book-example discrepancy is unchanged and NOT certified.

On resuming at Shadbala, cross-referenced the source with **BPHS Volume 1, Santhanam, Chapter 27, PDF pages 264–266**, and identified three definite positional miscalculations mirrored across `public/horoscope/offline/swiss_vedic.browser.mjs` and `swiss_vedic.js`:

| Rule | Incorrect baseline | Printed BPHS I rule | Action |
| --- | --- | --- | --- |
| Saptavargaja Bala friend ladder | 22.5/15/7.5/3.75/1.875 for great friend/friend/neutral/enemy/great enemy | **20/15/10/4/2 Virupas**; 45 moolatrikona and 30 own | Changed in BOTH Swiss engines on draft |
| Ojhayugmarasiamsa Bala | Awarded 15 in *opposite* parity sign/navamsa for male/neutral and female grahas | Venus/Moon even sign & Navamsa; other five odd, **15 Virupas each** | Corrected both sign and D9 parity in BOTH engines |
| Drekkana Bala | Female received 15 in third 10°, neutral in second 10° | Male first; **female second; neutral third** decan | Corrected BOTH engines |

Added `tests/v357-bphs-shadbala-positional-regression.mjs`: independent 7-Virupa ladder, explicit relationship cases, 7 planets × 12 signs × 9 longitude degrees and all five Perambalur natal charts. **Do not claim PASS until current branch's CI run completes.** Existing functional/structural/regression tests retained.

**Remaining Shadbala certification blockers:** Hora Bala uses a fixed 06:00 solar-hour convention rather than historical sunrise-to-sunrise horas; Abda is hard-coded to Sun; Yuddha Bala always zero; Paksha Moon-phase benefic/malefic differentiation and Mercury malefic conjunction need independent audit; Saptavargaja moolatrikona degree application and fuller Chesta/Drig calculation require independent reference cases. Therefore **full classical Shadbala = FAIL / NOT CERTIFIED** despite three corrected subcomponents.

**Scope discipline:** The changes are on the V357 *draft* branch only. No changes to UI/PWA/location/DST/chart/PDF/print/save/admin/login/payment; do not merge until remaining regression and book verification succeeds.

## Sixth pass — independent BAV Prastara and D60

**D60**: BPHS I Ch. 6 (PDF p. 82, printed p. 83) explains counting the sixty half-degree subdivisions from the natal sign; the **names** of Shashtiamsas reverse for even signs, but the **sign lord mapping** does not. Example: Venus in **Capricorn 13°25′** -> 27th half-degree subsection -> Pisces (Jupiter). The old `d===60` source used `odd?p:11-p`, incorrectly assigning the sign from Aries or a reversed Pisces offset with no natal sign. Replaced with `(r+p)%12` in both `astro_advanced.js` and `public/horoscope/offline/astro_advanced.browser.mjs` on draft. 60-part boundaries for all 12 signs plus the textbook Capricorn example are now covered by `tests/v357-bphs-varga-regression.mjs`. **D60 deity name/benefic/malefic interpretation is NOT certified**.

**BAV contributor-by-contributor comparison (Shodhana excluded):** `tests/v357-bphs-bav-prastara-regression.mjs` independently spells out Rekhaprada contributor lists for **Sun, Moon, Mars** from BPHS II Ch. 66 (printed pp. 854–858), rather than copying numeric `BAV_TABLES` from source. For each of the five Perambalur natal charts it reconstructs an expected 12-sign × 8-contributor Prastara based on the individual source graha/lagna signs and compares both Prastara and Bhinnashtakavarga sign bindus. CI reports **200 checks PASS** on the current draft. Remaining contributor tables **Mercury, Jupiter, Venus, Saturn** are **PENDING independent editorial cross-check**, and Sarvashtakavarga only has invariant 337, not 7/7 independent book confirmation.

Recorded CI `38948738702` source job: `799 calculation`, `24,428 Varga (15 divisions incl. D60)`, `1,635 positional Shadbala`, `200 BAV`, `403 structural` assertions/checks PASS. These are distinct overlapping scopes, not one 27,000-independent-conclusions certification. **Chapter 68 Shodhana remains SKIPPED by user's instruction**, removed from the CI job steps; its unconnected code is unchanged.

No alterations to Horoscope/Matching narrative logic, UI, PWA, GeoNames, DST, chart style, print/save, Admin, Login or Payment. All classical changes remain on draft PR #6; **do not merge** without book-level D60 deity and remaining Shadbala/BAV checks plus five live report acceptance. Also reconcile this branch with newer main V359 CI workflow steps before any eventual merge.
