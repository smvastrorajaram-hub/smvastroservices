# C. G. Rajan — Jathaka Kanitham I: Separate Ayurdaya source/numerical audit
**Date:** 2026-10-17. **Source:** user-uploaded TWO-part ZIP; ONLY Part I (320 scanned PDF pages) used in this work. Not uploading the scanned book to GitHub.

**Strict separation:** `cg-rajan-ayurdaya-research.browser.mjs` is NOT `uttara-kalamrita-ayurdaya.browser.mjs`. No mixing source formula sets, no change to `strength3` or `strengthUttaraKalamrita`, no customer Horoscope/Matching predictions, no birth-death age estimates.

## What the original scan actually says

- Printed **229** / PDF **251**: eight cited Ayurdaya families are Pindaja, Naisargika, Pindashtakavargaja, Rasija, Nakshatra, Kalachakra, Samudaya and Amsaja. The author discusses an ordered, competing set of alternative methods; do not add all eight as independent life years.
- Printed **230** / PDF **252**: the principal Pinda, Amsa and Naisargika methods are considered with planetary/ascendant strength criteria. The chosen applicable method is distinct from merely computing seven intermediate terms.
- Printed **231–232** / PDF **253–254**: explicit per-planet reductions: enemy sign -1/3; combustion -1/2 subject to the author's Venus/Saturn exceptions; 12th-to-7th Chakra-pada loss, malefic `1,1/2,1/3,1/4,1/5,1/6`, benefic **half**. Multiple occupants and the choice of strongest must be resolved from verified independent Shadbala, not by naively multiplying every planet's fractions.
- Printed **233** / PDF **255**: ascendant rising interval/longitude conversions (requires real latitude/longitude and accurate Lagna rising interval); NOT yet source-implemented.
- Printed **241** / PDF **263**: actual author's sample chart sidereal planetary longitudes and Shadbala values. Some values conflict with earlier printed Shadbala p.50 (e.g., printed p.241 Mars 632 versus p.50 Mars 620; Jupiter 651 versus p.50 Jupiter 951); distinguish apparent printing inconsistencies from a proved formula.
- Printed **242–243** / PDF **264–265**: **independent seven-graha Naisargika worked arithmetic**, with full angular and traditional year/month/day/nazhigai results.
- Printed **244** / PDF **266**: combustion examples, including Venus/Saturn exclusion.
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

- `public/horoscope/offline/cg-rajan-ayurdaya-research.browser.mjs`: fully isolated, pure functions for 7 natural graha components, 7..12 house-Chakrapada fractions, source exceptions for enemy sign and combustion, exact traditional carry addition and seven-planet evidence adapter.
- `tests/cg-rajan-ayurdaya-printed-oracle.mjs`: **76 assertions**: seven printed examples, condition/house math, exact exaltation/debilitation bounds, no fake longevity output, and **explicit p.248 total discrepancy**.
- `tests/cg-rajan-ayurdaya-five-natal-research.mjs`: five Perambalur date/time charts × seven grahas = 35 research intermediate records; DO NOT call these a validated independent astronomical true-longitude source.
- `.github/workflows/cg-rajan-ayurdaya-research-qa.yml`: dedicated non-production source syntax, printed arithmetic and five-date integration QA. Prior run passed with 73 oracle assertions; the additional 3 printed total checks require the new head CI to pass.

## Still not complete — no misleading Ayurdaya certificate

1. **Pindayurdaya**: planet-specific full years, ingress/dignity fraction, six forms of cuts and strong-vs-weak method selection require complete printed-example oracles.
2. **Amsayurdaya**: the raw C.G. Rajan Part I printed pp.237–238 Amsa table A is now implemented as a research-only per-graha lookup (3°20′ intervals, repeating years 1–12), with method totals and a clearly labeled provisional arithmetic mean in the report. The Lagna-lord-strength condition that selects table A, Amsa-specific reductions and the full worked-example chain are NOT independently certified; this is not a final life-span result.
3. The **other five Ayurdaya varieties** on p.229 are documented, not coded; they must not be silently treated as zero or conflated with Pinda/Amsa/Naisargika.
4. **Chakrapada collision priority** and sixfold-strength-controlled choice cannot be certified until Shadbala intermediate evidence is established. Explicit per-body fractions are verified; overall combinations are NOT.
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
