# SMV ASTRO — All Dasa Systems Source-Correctness Audit

**Date:** 2026-10-20  
**Branch:** `fix/dasa-source-audit-20261020-r2`  
**Disposition:** PR #75 merged at \`3b84ae691d532271c1c52a38a8e8db00a86691a1\`. The source-regression workflow (#876) and browser-PDF smoke workflow (#281) both passed before merge. This is not a claim that every school/variant of every Dasa system is certified.

## Scope

The Horoscope application exposes Vimshottari plus eight Phase-4 systems: Ashtottari, Narayana, Lagna Kendradi Rasi Dasa, Sudasa, Drigdasa, Niryaana Shoola, Shoola, and Kalachakra. The audit distinguishes (a) formula/ordering verified against a cited worked example, (b) source conflict that must remain explicit, and (c) incomplete full-lineage certification.

## Selected source policy for this audit

- **Ashtottari eligibility:** use *Brihat Parashara Hora Shastra*, chapter 46, verse 17, as the primary rule: Rahu must not be in Lagna and must be in a kendra/trikona from the Lagna lord. This matches view (2) in P.V.R. Narasimha Rao §17.2.3. The universal-applicability and day/night–paksha formulations remain visible as alternate lineages; they are not mixed into a synthetic rule. If required chart data is missing, the selected rule remains **undetermined**, not PASS.
- **Narayana Dasa duration conflict:** retain the implemented inter-source reconciliation: preserve uncapped arithmetic as a warning but apply Sanjay Rath's stated 12-year maximum for the Mercury-in-Virgo 13-year conflict, producing 12 + 0 in the two cycles. Do not attribute the cap as a literal PVR sentence.
- **Kalachakra subgroup lineage:** use the complete 15-star Savya / 12-star Apasavya classification in a parallel Kalachakra tutorial: Savya-1 has 9 stars; Savya-2 has 6 including both Uttarabhadrapada and Revati. Retain PVR Tables 43–47 for the nine-rasi sequence of each pada. This completes the printed PVR Table 45 subgroup list, which appears to omit Uttarabhadrapada.
- **Drigdasa:** select the direct Parashara-style group construction documented in PVR §21.2 / Example 80: 9th-house group, then 10th-house group, then 11th-house group, each with its three rasi aspects. Scholarly/teaching sources note substantial variation among Jaimini commentators (including Sanjay Rath, P. S. Sastri and Iranganti Rangacharya), so their group ordering/direction variants are not blended into this engine. Preserve overlapping group signs because de-duplication would change the source sequence.
- **Lagna Kendradi, Niryaana Shoola and Shoola:** use PVR §§19.2, 22.2.1 and 23.2 as the chosen operational lineage. Where PVR says classical Niryaana Shoola Antardasa rules are unclear, use his stated Narayana-style suggestion and label it as such. Tests cover default directions and selected Saturn/Ketu/MD cases, not every classical variant.

Sources consulted: [BPHS, chapter 46 verses 16–20](https://www.siva.sh/brihat-parashara-hora-shastra/46/16-20); [P.V.R. Narasimha Rao, *Vedic Astrology: An Integrated Approach*](https://www.lakshminarayanlenasia.com/articles/vedic-astrology-an-integrated-approach2.pdf); [Kalachakra Dasa tutorial subgroup and pada tables](https://www.scribd.com/document/804014825/kalachakra-dasa-tutorial); [Cross-checked Kalachakra subgroup table](https://astroshruti.ai/jyotish/kalachakra-dasha); [Sanjay Rath, *Narayana Dasa*](https://scienceoflight.net/wp-content/uploads/extra/Narayana%20Dasa%20by%20Sanjay%20Rath.pdf).

## Confirmed source-level corrections in this change

### 1. Nakshatra-Dasa year length — Vimshottari browser/server paths

The old duplicate Vimshottari engines used 365.2425 days per Dasa year and also converted sub-period durations through that solar-year constant. P.V.R. Narasimha Rao, *Vedic Astrology: An Integrated Approach*, §16.2, explicitly states that he prefers a 360-day Savana year for Nakshatra Dasa calculations in the book. The offline browser wrapper and the duplicate server implementation now use the same 360-day convention for Mahadasa, Antardasa and Pratyantardasa date arithmetic. The proportional 7/20/6/10/7/18/16/19/17 Vimshottari year weights remain unchanged.

**Regression oracle:** §16.2 / Example 50, Moon at 2°23′ Aquarius in Dhanishtha: Mars balance = 7 × (1 − 0.67875) = 2.24875 years; the source example boundary is around 15–16 July 2002 from 28 April 2000. The regression tests the numeric balance, birth-period clipping and Antardasa balance sum.

This is an author-specific convention: many practitioners use solar-year dates. The application is choosing the named book’s convention for this book-based calculation; it must not mix solar and Savana year arithmetic inside the same nested Dasa tree.

### 2. Rasi/sign strength and co-lord choice

The previous helper condensed sign strength to a weighted numeric score (occupants × 10 plus ad-hoc lord dignity/degree weights). That was not the book’s ordered comparison and could choose a different seed sign. The source helper now applies the sequential sign-comparison criteria from PVR §§15.5.1–15.5.2: occupancy first, then sign/aspect support and the specified dignity, parity/modality and advancement comparisons, with explicit Scorpio/Aquarius co-lord handling. Narayana Dasa lengths use the Dasa-purpose co-lord comparison. A raw weighted score is no longer used as a substitute for the textual decision order.

### 3. Sudasa direction

The prior shared helper applied Narayana/Kendradi Saturn-in-seed and Ketu-in-seed direction overrides to Sudasa. PVR §20.2 instead says Sudasa direction depends on the *ordinary odd/even sign* occupied by Sree Lagna—not odd-footed/even-footed classification—and then orders Kendra, Panaphara and Apoklima signs from Sree Lagna. The Saturn/Ketu overrides are now scoped to Lagna Kendradi, not Sudasa.

**Regression oracle:** Example 77, Sree Lagna at 12°21′ Capricorn: direction is backward and the first-cycle order is Cp, Li, Cn, Ar, Sg, Vi, Ge, Pi, Sc, Le, Ta, Aq. The first balance is (30° − 12°21′)/30° of the full Capricorn Dasa.

## Per-system disposition

| System | Formula/ordering audit | Current disposition |
|---|---|---|
| **Vimshottari** | Nakshatra lord, remaining fraction, 120-year sequence, full-parent Antardasa proportions and nested Pratyantardasa clipping; Example 50 Savana-year oracle | Source-based year convention corrected; regressions added. End-to-end CI pending. |
| **Ashtottari** | Table 39 longitude arcs, 108-year sequence, Example 59 running Moon Dasa and Rahu Antardasa remainder; 360-day Nakshatra-Dasa dates | **Selected rule:** BPHS ch.46 v.17 — Rahu not in Lagna and in a kendra/trikona from Lagna lord. PVR §17.2.3's universal and day/night–paksha views remain visible as alternate traditions, not eligibility gates. Code returns applicable / not_applicable / undetermined under the selected rule; regression covers qualifying and non-qualifying cases. |
| **Narayana** | Table 40 sequence (normal/Saturn/Ketu variants), ordered stronger-sign comparison, sign-lord Dasa lengths, first/second-cycle period | Strength/co-lord decision logic replaced and source regression expanded. PVR’s literal Mercury-in-Virgo rule sequence can yield 13 years; the explicit 12-year ceiling is an inter-source reconciliation from Sanjay Rath, not a rule to attribute to PVR. Worked-example coverage is not exhaustive. |
| **Lagna Kendradi Rasi Dasa** | Stronger Lagna/7th seed; Kendra → Panaphara → Apoklima; ordinary Lagna parity with Saturn-forward and Ketu-reversal exceptions; Narayana sign lengths and second-cycle complement | Selected PVR §19.2 rules now have independent fixture assertions for backward default, Saturn-in-seed forward override, Ketu-in-seed reversal and grouped order. Other planetary co-location combinations and every printed worked example are not exhaustively certified. |
| **Sudasa** | Sree Lagna as seed; ordinary odd/even direction; Kendra/Panaphara/Apoklima; first balance from Sree-Lagna advancement; Narayana-style Dasa lengths | Source exception bleed removed; Example 77 oracle added. CI pending. |
| **Drigdasa** | 9th/10th/11th-house groups with three rasi aspects each, odd-footed direction within each group, cycle-2 complement | **Selected lineage:** PVR/Parashara §21.2, Example 80. Other Jaimini commentaries interpret the aphorisms differently; the code explicitly refuses to combine them with this direct Parashara grouping. Example 80 and all-12-Lagna group tests remain, including intentional group-overlap handling. This choice does not certify all alternate lineages. |
| **Niryaana Shoola** | Stronger 2nd/8th seed; ordinary odd/even direction; Saturn-in-seed forward exception; movable/fixed/dual 7/8/9-year periods; Narayana-style Antardasa is PVR's suggestion where classics are unclear | Selected PVR §22.2.1 policy now has separate backward-default and Saturn-forward fixtures, duration checks, and Antardasa conservation assertions. This is not exhaustive certification of every lineage/strength exception. |
| **Shoola** | Stronger Lagna/7th seed; always zodiacal order; 9-year Mahadasas; for each MD, select the stronger MD-sign/7th seed and apply 12 equal zodiacal Antardasas | Selected PVR §23.2 rules have explicit tests for seed, full zodiacal order, 9-year MDs and twelve equal 0.75-year Antardasas. Complex interpretive rules and every worked chart are not certified. |
| **Kalachakra** | Nakshatra/pada → Savya/Apasavya subgroup, current Mahadasa balance, continuous nine-token Antardasa weighting, Deha/Jeeva | A 108-pada grid now checks subgroup assignment, nine-rasi table rows, Paramayush and MD/AD balance conservation. **Selected grouping lineage:** complete 15/12 Savya/Apasavya classification (Savya-1 has 9 stars; Savya-2 has 6, including both Uttarabhadrapada and Revati), supported by parallel Kalachakra tables. PVR printed Table 45 appears to omit Uttarabhadrapada from the Savya-2 star list; PVR's nine-rasi pada sequences remain the selected sequence source. Other variants remain uncertified. |

## Known limits that remain open

1. **Ashtottari applicability:** the implementation explicitly selects BPHS ch.46 v.17 as the eligibility gate. It continues to report the two other PVR-described traditions as alternate evidence and does not combine all conditions into a synthetic rule.
2. **Narayana Mercury-in-Virgo conflict:** preserve the inter-source cap as a visible/source-documented reconciliation; do not label it as a literal PVR rule.
3. **Date presentation precision:** the special Rasi-Dasa interface stores date-only rows. Exact birth-time/time-zone anchoring and day-boundary presentation need a separate test before claiming sub-day date precision.
4. **Kalachakra source reconciliation:** PVR Table 45 appears to omit Uttarabhadrapada from the Savya-2 subgroup list. The complete subgroup taxonomy used here has nine Savya-1 stars and six Savya-2 stars, with both Uttarabhadrapada and Revati in Savya-2; the 108-pada regression pins that choice explicitly.
5. **Full certification:** regressions exercise specified worked examples, the complete Kalachakra 108-pada table grid, selected Lagna Kendradi/Niryaana Shoola/Shoola exception fixtures, boundaries and representative natal charts. They do not prove every possible combination or all living variants.

## Merge gate

- [x] JavaScript syntax and the full calculation-regression workflow passed (Horoscope Matching DST Source QA #876).
- [x] Example 50 Savana-year balance, Example 77 Sudasa direction/balance and sign-strength/co-lord oracles passed in calculation regression.
- [x] Ashtottari's selected BPHS gate has positive/negative regression fixtures; alternate applicability views remain visible.
- [x] Kalachakra's 108-pada subgroup/sequence/Paramayush/AD-balance grid is exercised under the documented selected lineage.
- [x] Lagna Kendradi default/Saturn/Ketu direction rules, Niryaana Shoola default/Saturn exception and Shoola's zodiacal 9-year/12-equal-AD structure have independent fixture assertions.
- [x] Drigdasa Example 80 and all-12-Lagna group regressions remain; this does not certify every lineage variant.
- [x] Manually compare the shared Savana-year/Antardasa/Pratyantardasa helper block in browser wrapper and duplicate server; the core block matches exactly.

Until these gates are green, this branch must not be described as fully textbook-certified.
