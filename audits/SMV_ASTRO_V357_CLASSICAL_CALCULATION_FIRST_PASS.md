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
