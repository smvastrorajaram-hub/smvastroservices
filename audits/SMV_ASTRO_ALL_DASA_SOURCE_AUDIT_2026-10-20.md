# SMV ASTRO — All Dasa Systems Source-Correctness Audit

**Date:** 2026-10-20  
**Branch:** `fix/dasa-source-audit-20261020-r2`  
**Disposition:** PR #75 merged at \`3b84ae691d532271c1c52a38a8e8db00a86691a1\`. The source-regression workflow (#876) and browser-PDF smoke workflow (#281) both passed before merge. This is not a claim that every school/variant of every Dasa system is certified.

## Scope

The Horoscope application exposes Vimshottari plus eight Phase-4 systems: Ashtottari, Narayana, Lagna Kendradi Rasi Dasa, Sudasa, Drigdasa, Niryaana Shoola, Shoola, and Kalachakra. The audit distinguishes (a) formula/ordering verified against a cited worked example, (b) source conflict that must remain explicit, and (c) incomplete full-lineage certification.

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
| **Ashtottari** | Table 39 longitude arcs, 108-year sequence, Example 59 running Moon Dasa and Rahu Antardasa remainder; 360-day Nakshatra-Dasa dates | Covered examples/boundaries pass in existing regression history. §17.2.3 has three conflicting applicability interpretations; no global applicability PASS is asserted. |
| **Narayana** | Table 40 sequence (normal/Saturn/Ketu variants), ordered stronger-sign comparison, sign-lord Dasa lengths, first/second-cycle period | Strength/co-lord decision logic replaced and source regression expanded. PVR’s literal Mercury-in-Virgo rule sequence can yield 13 years; the explicit 12-year ceiling is an inter-source reconciliation from Sanjay Rath, not a rule to attribute to PVR. Worked-example coverage is not exhaustive. |
| **Lagna Kendradi Rasi Dasa** | Kendra → Panaphara → Apoklima; Lagna odd/even direction; Narayana-style sign lengths and second-cycle complement | Existing multi-chart second-cycle regressions remain; independent coverage of every source example is incomplete. |
| **Sudasa** | Sree Lagna as seed; ordinary odd/even direction; Kendra/Panaphara/Apoklima; first balance from Sree-Lagna advancement; Narayana-style Dasa lengths | Source exception bleed removed; Example 77 oracle added. CI pending. |
| **Drigdasa** | 9th/10th/11th-house groups with three rasi aspects each, correct odd-footed direction, cycle-2 complement | Example 80 and all-12-Lagna group sequence checks exist. The implementation deliberately preserves overlaps between three independently generated groups instead of fabricating a unique-sign permutation. Other lineage variants are not certified. |
| **Niryaana Shoola** | Stronger 2nd/8th seed, Saturn-in-seed forward exception, movable/fixed/dual 7/8/9-year periods | Example 87 exception has a regression. Antardasa and all exceptional strength cases still need more independent worked examples. |
| **Shoola** | Stronger Lagna/7th seed, zodiacal 9-year Mahadasas; Antardasa uses the Dasa sign as reference and 12 equal sub-periods in source-prescribed order | Main structure is implemented; independent full worked-example oracle remains incomplete. |
| **Kalachakra** | Nakshatra/pada → Savya/Apasavya group, current Mahadasa balance, continuous nine-token Antardasa weighting, Deha/Jeeva | PVR Examples 95–97 and 360-day year checks exist. A full 108-nakshatra-pada grid and every lineage variant have not been certified. |

## Known limits that remain open

1. **Ashtottari applicability:** the source itself records three alternatives; unless the product explicitly chooses a tradition, only a reference sequence and per-view audit should be shown.
2. **Narayana Mercury-in-Virgo conflict:** preserve the inter-source cap as a visible/source-documented reconciliation; do not label it as a literal PVR rule.
3. **Date presentation precision:** the special Rasi-Dasa interface stores date-only rows. Exact birth-time/time-zone anchoring and day-boundary presentation need a separate test before claiming sub-day date precision.
4. **Full certification:** the current regressions exercise specific source examples, boundary cases and a handful of natal charts. They do not prove every possible combination or all living variants of each system.

## Merge gate

- [x] JavaScript syntax and the full calculation-regression workflow passed (Horoscope Matching DST Source QA #876).
- [x] Example 50 Savana-year balance, Example 77 Sudasa direction/balance and sign-strength/co-lord oracles passed in calculation regression.
- [x] Existing Ashtottari, Kalachakra and Drigdasa example/boundary oracles remained green; this does not certify every lineage variant.
- [x] Manually compare the shared Savana-year/Antardasa/Pratyantardasa helper block in browser wrapper and duplicate server; the core block matches exactly.

Until these gates are green, this branch must not be described as fully textbook-certified.
