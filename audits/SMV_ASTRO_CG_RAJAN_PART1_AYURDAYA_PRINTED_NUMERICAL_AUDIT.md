# C. G. Rajan — Jathaka Kanitham I: Separate Ayurdaya source/numerical audit
**Date:** 2026-10-17. **Source:** user-uploaded TWO-part ZIP; ONLY Part I (320 scanned PDF pages) used in this work. Not uploading the scanned book to GitHub.

**Strict separation:** `cg-rajan-ayurdaya-research.browser.mjs` is NOT `uttara-kalamrita-ayurdaya.browser.mjs`. No mixing source formula sets, no change to `strength3` or `strengthUttaraKalamrita`, no customer Horoscope/Matching predictions, no birth-death age estimates.

## What the original scan actually says

- Printed **229** / PDF **251**: eight cited Ayurdaya families are Pindaja, Naisargika, Pindashtakavargaja, Rasija, Nakshatra, Kalachakra, Samudaya and Amsaja. The author discusses an ordered, competing set of alternative methods; do not add all eight as independent life years.
- Printed **230** / PDF **252**: the principal Pinda, Amsa and Naisargika methods are considered with planetary/ascendant strength criteria. The chosen applicable method is distinct from merely computing seven intermediate terms.
- Printed **231–232** / PDF **253–254**: enemy-sign Harana is 1/3; applicable combustion Harana is 1/2; the note explicitly says when both apply use the **combustion Harana only**, not the sum of 1/3 + 1/2. The same page exempts **Venus and Saturn from combustion Harana**. Chakrapada loss is separate: malefics in houses 12→7 lose `1, 1/2, 1/3, 1/4, 1/5, 1/6`; benefics lose half those fractions. With multiple occupants, source instructions require strength-based selection; unresolved occupant ranking still blocks a final natal result.
- Printed **233** / PDF **255**: ascendant rising interval/longitude conversions (requires real latitude/longitude and accurate Lagna rising interval); NOT yet source-implemented.
- Printed **241** / PDF **263**: actual author's sample chart sidereal planetary longitudes and Shadbala values. Some values conflict with earlier printed Shadbala p.50 (e.g., printed p.241 Mars 632 versus p.50 Mars 620; Jupiter 651 versus p.50 Jupiter 951); distinguish apparent printing inconsistencies from a proved formula.
- Printed **242–243** / PDF **264–265**: **independent seven-graha Naisargika worked arithmetic**, with full angular and traditional year/month/day/nazhigai results.
- Printed **244** / PDF **266**: combustion-state thresholds are Moon 12°, Mars 17°, Mercury 14° direct/12° retrograde, Jupiter 11°, Venus 10° direct/8° retrograde and Saturn 15°. These thresholds also classify Venus/Saturn's combustion state, but **do not override the p.231 instruction not to deduct their combustion Harana**. Missing direct/retrograde evidence for Mercury/Venus and exact threshold equality remain unresolved rather than guessed.
- Printed **248** / PDF **270**: a final eight-row Naisargika example with a printed **71 years 9 months 15 days 46 nazhigai**. Straight summation of the eight lines as actually printed gives **72 years 6 months 15 days 46 nazhigai**. The printed total matches **exactly when the Sun's 0y 9m 0d 0n line is omitted**. The source does not state an explicit exclusion alongside the table. **FLAG THIS**; do not patch the formula to force a matching full sum.

## Seven independent Naisargika worked examples (printed pp.241–243)

Units are `years/months/days/nazhigai`. The arithmetic uses 360°, the source-specified maximum years, and conventional 12×30×60 units. Each row is from the book's own example, **not a five-birth user result**.

| Graha | Source true degree | Exaltation | Natural max | Retained arc | Book example result |
|---|---:|---:|---:|---:|---|
| Sun | 167°02′ | 10° | 20 | 202°58′ | **11 / 3 / 9 / 20** |
| Moon | 118°10′ | 33° | 1 | 274°50′ | **0 / 9 / 4 / 50** |
| Mars | 206°30′ | 298° | 2 | 268°30′ | **1 / 5 / 27 / 0** |
| Mercury | 191°52′ | 165° | 9 | 333°08′ | **8 / 3 / 28 / 12** |
| Jupiter | 28°17′ | 95° | 18 | 293°17′ | **14 / 7 / 29 / 6** |
| Venus | 204°32′ | 357° | 20 | 207°32′ | **11 / 6 / 10 / 40** |
| Saturn | 230°27′ | 200° | 50 | 329°33′ | **45 / 9 / 7 / 30** |

The major arc is used: `remaining = (exaltation - true) mod 360; if < 180, 360 - remaining`. At exact exaltation retain the full 360°, at exact debilitation 180°. `theoreticalNaturalYearComponent = remaining / 360 * sourceMaximumYears`. Round only to the final nazhigai.

## Source-level work committed

- `public/horoscope/offline/cg-rajan-ayurdaya-research.browser.mjs`: isolated natural components, Chakrapada fractions, graha-specific p.244 combustion-state thresholds, the p.231 Venus/Saturn combustion-Harana exception, and the source precedence that chooses combustion over enemy-sign Harana when both apply.
- `public/horoscope/offline/cg-rajan-ayurdaya-pinda.browser.mjs`: a separate Amsa Harana research candidate applies the single selected condition deduction plus the separate Chakrapada deduction, then uses only the largest strength multiplier (×3 for exalted/retrograde; otherwise ×2 for own sign/Navamsa/Drekkana/Vargottama). Required chart facts must be explicit; multiple occupants require Shadbala-verified strongest-graha selection. Candidate stays uncertified without a complete independent printed Amsa worked-example oracle.
- The mean of the three seven-graha totals preserves exact one-third/two-thirds nazhigai rather than rounding the mean to a whole nazhigai.
- `tests/cg-rajan-ayurdaya-printed-oracle.mjs`: **76 assertions**: seven printed examples, condition/house math, exact exaltation/debilitation bounds, no fake longevity output, and **explicit p.248 total discrepancy**.
- `tests/cg-rajan-ayurdaya-five-natal-research.mjs`: five Perambalur date/time charts × seven grahas = 35 research intermediate records; DO NOT call these a validated independent astronomical true-longitude source.
- `.github/workflows/cg-rajan-ayurdaya-research-qa.yml`: dedicated non-production source syntax, printed arithmetic and five-date integration QA. Prior run passed with 73 oracle assertions; the additional 3 printed total checks require the new head CI to pass.

## Still not complete — no misleading Ayurdaya certificate

1. **Pindayurdaya**: planet-specific full years, ingress/dignity fraction, six forms of cuts and strong-vs-weak method selection require complete printed-example oracles.
2. **Amsayurdaya**: Table A is a raw lookup (3°20′ intervals, repeating years 1–12). Direct inspection of printed p.235 together with pp.231–232 corrected a material source interpretation: enemy-sign and combustion Harana are not additive; when both apply, choose combustion Harana only, except that Venus/Saturn have no combustion deduction, so their enemy-sign deduction can still apply. Chakrapada is a separate deduction added to that single selected condition loss, and the maximum applicable multiplier is then used without stacking ×3 and ×2. Regression cases now cover these combinations. The live table still remains explicitly **before Harana**, since strength-based method selection, strongest-occupant selection and a full independent worked Amsa example are not yet established. This is not a final life-span result.
3. The **other five Ayurdaya varieties** on p.229 are documented, not coded; they must not be silently treated as zero or conflated with Pinda/Amsa/Naisargika.
4. **Chakrapada multi-occupant priority** and sixfold-strength-controlled choice cannot be certified until the required source strength comparison is established. The p.231 Harana precedence and p.232 house fractions are now source-coded and regression-tested; strongest-occupant selection and complete chart-level arithmetic remain blocked.
5. The p.248 **Sun row versus total** discrepancy and p.241 **Shadbala p.50** discrepancies must be reconciled from the scanned printed examples.
6. No calibrated independent personal lifespan/age-of-death inference exists from this source. Therefore `fullAyurdayaCertified:false`, `natalTotalYears:null`, `predictedDeathAge:null`. The engine never attaches these research data to customer outputs.

**Status:** Rajan first-volume seven-graha **Naisargika arithmetic** and Pinda printed examples are source-tested. The raw Amsa table-A lookup is implemented but its Lagna-lord-strength selection and reductions are not certified. The report now includes a per-method total row and provisional mean of three raw totals; this must not be interpreted as a personal lifespan. **Full eight-method and complete natal Ayurdaya certification NOT issued.** The second volume remains reserved for separate Horoscope/Matching prediction rule work.


## 17 Oct follow-up: independently reproduced Pindayurdaya / guarded customer calculation appendix

- Source: printed **p.249** (PDF p.271). Book's Sun example (202°58′ retained arc × 19/360) = **10y 8m 16d 22 nazhigai**. Book's Jupiter example (293°17′ × 15/360) = **12y 2m 19d 15 nazhigai**. These have been numerically verified, with final-round-only 12×30×60 carry logic.
- New separate code: `public/horoscope/offline/cg-rajan-ayurdaya-pinda.browser.mjs` exports `cgRajanPindaGraha`, 7 × Pinda and Naisargika research adapter, and plain bilingual static HTML. **Pinda maxima:** Sun 19, Moon 25, Mars 15, Mercury 12, Jupiter 15, Venus 21, Saturn 20. This is source-specific arithmetic; it does **not** substitute a complete classical lifespan choice, debilitation/house/exemption adjustments, or all eight methods.
- New tests: `tests/cg-rajan-ayurdaya-pinda-customer-report-regression.mjs` verifies the two original printed Pinda examples, all seven maximum/exaltation/opposition boundaries, 35 per-graha Pinda/Naisargika calculations across the five Perambalur charts, and seven rows in each Tamil/English report. Separate `tests/cg-rajan-ayurdaya-save-pdf-integration-guard.mjs` checks append-only DOM placement and source Save/PDF stripping behaviour.
- Customer **Horoscope-only** rendering: `public/horoscope/horoscope-predictions.js` appends a labelled calculation-only Ayurdaya section as a **sibling** of `.integrated-predictions`, never as one of the 10 strict Horoscope parts. Critical: `report-store.mjs` and `report-print.js` delete the legacy `.integrated-predictions` subtree. Appending the table inside it would silently remove the data from Saved/PDF. The new layout deliberately keeps the self-contained static report section **outside** that discarded subtree. No `data-print-technical` marker is applied, so it remains printable.
- The customer report explicitly states that traditional year/month/day/nazhigai entries are **historic per-graha numeric fractions, not human lifespan or death age**. No aggregate lifespan is calculated. The complete method-selection / reduction chain and book pp.248/241 printed discrepancies remain UNRESOLVED and are disclosed. The displayed Pinda, Naisargika and Amsa totals and their arithmetic mean are preliminary source terms, not a certified lifespan. **Ayurdaya full certification is still NOT issued.** No Marriage Matching report changes.
- Production acceptance for an on-device browser, saved account sync, and Cloudflare deployment has **not** been asserted solely by source-level CI. PR remains draft.


## 17 Oct source-level correction — Amsa Harana precedence

Direct comparison of the user's scanned printed pages **231, 232, 235 and 244** now distinguishes two things previously conflated:

1. **Combustion status** is computed from the p.244 Sun-distance thresholds, with Mercury/Venus direct-versus-retrograde limits.
2. **Combustion Harana application** is governed by p.231: Venus and Saturn are exempt from that deduction. If both enemy-sign and applicable combustion deductions arise for another graha, p.231 directs the larger combustion Harana only. The separate Chakrapada deduction is then added to this selected condition deduction before the multiplier.
3. Printed p.235 says the applicable strength increase is ×3 if exalted or retrograde; otherwise ×2 if in own sign, own Navamsa, own Drekkana or Vargottama. When a ×3 and ×2 condition both apply, only the higher ×3 multiplier is used.

The browser research helper and printed-oracle regression have been corrected accordingly. This is a **specific rule-level correction**, not a full Amsa certificate. The unresolved source decisions below still prevent a final output.

## Uttara Kalamrita Shadbala — remaining book-only blockers

The independent *Uttara Kalamrita* Chapter II regression reproduces its seven printed p.45 totals. It still cannot certify the entire natal Shadbala calculation:

- **Graha Yuddha procedure:** printed p.41 describes a disk-diameter quotient that modifies Kala Bala; printed p.45 separately says the victor gains one Rupa and the defeated planet loses one Rupa in the rectified total. The worked p.45 example has no war, so it does not prove whether/how the two instructions are combined. The implementation deliberately labels the p.45 one-Rupa convention and does not pretend the p.41 calculation has been reconciled.
- **Cheshta Bala:** pp.42–43 require historical mean planetary positions and Sheeghra Kendra inputs for Mars, Mercury, Jupiter, Venus and Saturn. The book passage does not provide the actual five-planet historical orbital triples for each tested birth time. Modern Swiss orbital elements/speed bins cannot be substituted and called the book's classical method.
- **Drig Bala:** the printed sample's seven signed values and aggregate totals are testable, but a complete, independently sourced angle-by-angle Drishti Sputa oracle is still needed to derive all real chart values without fitting the sample.
- **Certification gate:** keep `classicalCertified:false`, `provisional:true`; never convert a successful limited source QA job into a complete Shadbala certificate. Exact Uttara Kalamrita rules and C.G. Rajan Ayurdaya rules remain separate.

