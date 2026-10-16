# SMV ASTRO — Five-Book Classical Source Coverage Audit
Date: 2026-10-16
Status: **INITIAL SOURCE-TO-BOOK COVERAGE AUDIT — NOT a comprehensive classical-rule PASS**
Scope: Existing Horoscope, Marriage Matching, offline Swiss/Varga/Dasha/Ashtakavarga and remedies engines. The new matching Basic Result optimisation is separately tested by GitHub CI.

## Five supplied reference PDFs (2,116 pages in total)
1. **Brihat Parasara Hora Sastra, Vol I**, R. Santhanam (482 PDF pages). PDF pp. 2–8 show chapter coverage of planetary qualities, 16 vargas, Lagna and Bhava considerations, and Avasthas.
2. **Brihat Parasara Hora Sastra, Vol II**, R. Santhanam (552 PDF pages). PDF pp. 1–9 cover Vimshottari and other Dasas, Antar-Dasa effects, Bhinnashtakavarga, Sarvashtakavarga and reduction procedures including Trikona/Ekadhipatya Shodhana.
3. **How to Judge a Horoscope, Vol I (Houses I–VI)**, B. V. Raman (311 PDF pages). PDF p. 4 is the TOC, pp. 16–18 discuss house lordship, aspects, dignities, timing and ascendant-dependent functional benefic/malefic criteria.
4. **How to Judge a Horoscope, Vol II (Houses VII–XII)**, B. V. Raman / Gayatri Devi Vasudev (483 PDF pages). PDF pp. 4, 7–8 give coverage/method, pp. 17–21 give seventh-house example rules and modifiers.
5. **Encyclopedia of Astrological Remedies**, Arun Kumar Bansal, editor / Yashkaran Sharma, compiler (288 PDF pages). PDF pp. 9–15 introduce the book's traditional remedial categories and their rationale; these claims are cultural/textual, not demonstrated medical or causal efficacy.

**Scope limitation:** These PDFs were identified and selected pages / tables of contents reviewed. This is NOT a line-by-line validation of all 2,116 pages, nor a verification that any prediction or remedy reliably affects real-world outcomes.

## Source-to-reference matrix

| Book area | Existing source | Coverage finding | Status |
|---|---|---|---|
| BPHS I — natal planetary states / dignity / retrograde / combustion | `public/horoscope/offline/swiss_vedic.browser.mjs` — `planetaryState()`, `enrichPlanetaryStates()` | Natal calculation returns explicit dignity, lord relationship, retrograde and combustion flags. Must still cross-check applicable classical thresholds/sign rules against the corresponding book passages. | PARTIAL |
| BPHS I — 16 divisions of a sign | `public/horoscope/offline/astro_advanced.browser.mjs` — `buildVargas()`, `vargaLongitude()` | All 16 conventional requested division IDs are implemented as a group. The existence of a Varga function is **not** proof each subdivision formula matches Santhanam's passages. | PARTIAL |
| BPHS I — Bhava and Avasthas | `swiss_vedic.browser.mjs` — `bhavaDetails()`; `astro_advanced.browser.mjs` — `avastha()` | Core house middles and selected avastha structures exist. Complete rule-by-rule reading and 12-house modifiers remain unverified. | PARTIAL |
| BPHS II — Vimshottari / Antar-Dasa | `offline/dasa_engine.browser.mjs`, `d1-15-year-reading.mjs`, `matching-timeline.mjs` | Dasa-Bhukti intervals are computed; 15-year timelines exist. Book-specific conditional effects have not been independently compared rule-by-rule. | PARTIAL |
| BPHS II — BAV/SAV / Shodhana | `offline/astro_advanced.browser.mjs` — `ashtakavarga()` | Bhinna, Sarva, Kakshya and fixed totals (seven grahas 48,49,39,54,56,52,39; SAV 337) are validated in code. Trikona/Ekadhipatya reduction procedures are NOT shown in the current `ashtakavarga()` implementation; if book-based reduced values are required, they need a separate, auditable calculation, not a silent substitution. | BASE PARTIAL / SHODHANA NOT IMPLEMENTED THERE |
| B. V. Raman I — 12 Lagna functional benefics and lords for houses I–VI | `prediction-rule-engine.js`, `prediction-synthesis.js`, `horoscope.js` | Rich calculated fields exist, but there is no demonstrated 12-Lagna × 7-graha independent crosswalk against Raman's house-judgement criteria. | NEEDS TRACE TEST |
| B. V. Raman II — VII–XII / partner indicators / conditional modifiers | `d9-reading.js`, `marriage-matching.js`, `matching-timeline.mjs` | Seventh-house, D9 and integrated matching outputs exist. Exact treatment of beneficial counter-evidence, special combinations and timing is not yet exhaustively book-validated. | PARTIAL |
| Remedies encyclopedia — conditions / categories and lifestyle practices | `marriage-matching.js`, `horoscope.js` | Traditional remedies and lifestyle guidance exist. There is no evidence that every category is mapped to a *specific* planetary/house/dasa condition and cited source passage. Do not imply scientifically demonstrated efficacy. | PARTIAL |
| Manual A/B book rule editor | `prediction-rule-engine.js`, `prediction-rules-published.js` | The published global rules file currently contains `window.SMVPUBLISHED_PREDICTION_RULES = []`. Other compiled prediction generators exist, but do NOT claim book-derived manual rules are already live through the published-rule channel. | NO PUBLISHED ADMIN RULES |
| Shadbala classical completeness | `offline/swiss_vedic.browser.mjs` Phase 3 | The source explicitly describes its six-component calculation as a *classical-style composite*, not a verified full classical six-Bala calculation. Do not represent its numerical result as certified exact Parashari Shadbala without a separate independent oracle. | NOT CERTIFIED |

## Required next verification, before claiming complete five-book implementation
1. Build a rule-to-chapter / physical-PDF-page crosswalk for the five volumes. Record what is calculated, how contradictory indications are resolved, and the life-result condition.
2. Run 12 Lagnas × seven classical grahas: natural vs functional benefic/malefic, friendship, house ownership, aspect, dignity, debility, retrogression, combustion and stronger counter-evidence.
3. Independently calculate D1/D2/D7/D9/D10 and the remaining 16 Varga divisions on boundary-degree samples, comparing Santhanam's reference.
4. Independently verify BAV/SAV totals plus Trikona/Ekadhipatya Shodhana as a separately named output, and Shadbala sixfold numerical components against classical sample computations.
5. For five agreed Perambalur sample births and a reproducible sample of marriage pairs, compare Dasha/Bhukti dates, the next 15-year reading, opposing evidence, and output repetition. Report failures; do not generate generic substitutes.
6. Check traditional remedies against the reported planetary evidence, age/time context and original book category; label the source and distinguish customary/spiritual advice from clinical treatment.

## Current release verification kept separate
- Matching Basic Result: short graha names in charts; retrograde/combustion abbreviations ONLY next to planet names in natal-position, Bhava and selected-date transit tables.
- Main and Basic Result sections use one continuous visual layer; no nested card backgrounds.
- Existing 10 Porutham, narrative analyses and verdict stay in full matching output. Saved bilingual views remain supported.
- CI source audit: 799 established calculations, 74 Basic Matching tests. Four-style browser A4-PDF smoke passed on the current Basic Result sources.
- No book interpretation changes are introduced during this UI/source optimization.

**Bottom line:** Existing engines demonstrably contain multiple classical data structures. Complete implementation of all five texts has NOT been proved by this audit. Keep pending items explicit and do not claim a completed 2,116-page validation until the remaining evidence comparisons run.


## Second pass — 2026-10-16: executed five-chart structural checks

CI audit: \`node tests/five-book-structural-audit.mjs\`.

- **403 assertions PASS**, covering five independently calculated Perambalur natal charts (15 Jun 1994; 06 Sep 2015; 31 Jul 1992; 04 May 1971; 11 Jan 1974).
- All five contain 9 validated natal grahas, 12 Sripati Bhavas with midpoint-Rasi consistency, and all 16 configured Varga divisors; each divisional chart has nine numeric planetary positions.
- All five have the seven classical Bhinna-Ashtakavarga distributions with independently checked 48/49/39/54/56/52/39 point totals and an aggregate Sarvashtakavarga of 337, together with nine Vimshottari Mahadasha records.
- Independently inspected the twelve-sign owner lookup in \`offline/astro_advanced.browser.mjs\`. A REAL source mismatch was found: the Aries lord entry was **Sun** when it must be **Mars**. Fixed \`SIGN_LORDS[0]\` to \`செவ்வாய்\`, preserving all eleven other entries. This influences auxiliary assessments using this lookup, such as \`phase1LordForSign\`, Indu Lagna, Paaka Lagna and certain planet-friendship checks; it does **not** imply all natal charts had incorrect ephemeris longitudes.
- Matching renderer: 81 dedicated source assertions PASS; source's natal/Transit/Bhava table flags are kept and compact chart flags restored. The standalone explanatory legend is omitted. Four A4 browser PDF chart-style outputs and matching-cover centering were also confirmed by Chromium.

### What these results **do not** certify

The PASS verifies numerical ranges, division availability, case structure, code-owner consistency and conventional Ashtakavarga totals. It does not independently prove classical Varga boundary algorithms, every BAV Prastara rule, the full 6-component Shadbala values, Trikona/Ekadhipatya Shodhana, every Raman house outcome and counter-evidence principle, all Vimshottari **event interpretations**, or the remedies book's conditions. These remain in the five-volume content audit queue. The currently empty published manual-rule array is still explicitly tracked.

### Next source-vs-page priorities

1. Santhanam BPHS I: verify each D2/D7/D9/D10 division mapping with sign/degree boundary samples and planetary status conditions.
2. Santhanam BPHS II: validate individual BAV tables and separately implement/test reduction rules if requested; do not conflate BAV/SAV base points with Shodhana.
3. Raman Vol I/II: compare 12-Lagna functional benefic/malefic combinations, house ownership/aspects, counter-evidence and the seventh-house narrative against actual reference passages, then validate on five birth charts and ten pairs.
4. Remedies encyclopedia: trace each conditional remedy to graha/Bhava/Dasha and separate lifestyle advice from purely devotional traditions.

**Approval state: structural calculation checks PASS; five-book rule-by-rule classical prediction certification remains PENDING.**
