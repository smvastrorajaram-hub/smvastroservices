# SMV ASTRO — Special Dasa Source Audit
Date: 2026-10-20
Branch: `fix/full-advanced-arr-scope-dasa-regressions`
Status: **CODE MERGED — PRE-MERGE CI PASS; ASHTOTTARI GLOBAL APPLICABILITY REMAINS SOURCE-AMBIGUOUS**
Baseline: `main` after PR #70. PR #70 is not reused or re-merged.

## 1. Full-report `arr is not defined`

**Root cause:** `arr` was declared inside `renderAdvancedAstrology()`, while `renderPhase4Dasa()` independently calls `arr(block?.periods)`. The Phase-4 renderer cannot access a helper scoped inside its sibling renderer.

**Source fix:** Move a single normalizer to the enclosing Horoscope module scope, shared by both renderers. Do not add a duplicate helper inside the Dasa renderer.

**Regression:** The test verifies there is exactly one shared helper before both renderer declarations and invokes the actual production helper together with the Phase-4 renderer in a VM context. The full offline engine case list also includes 2002-10-20 03:41 IST, Perambalur (11.232 N, 78.88 E), and requires Full result, Advanced result, Phase-4 Dasa, Transit and birth Panchang.

## 2. Ashtottari Dasa — P.V.R. Narasimha Rao

Source: *Vedic Astrology: An Integrated Approach*, §17.2.1–17.2.3, Table 39 and Example 59 (printed pp. 226–229).

- Table 39 arc boundaries have numerical regressions. Moon at 24° Leo is 144°; it selects Moon Dasa and leaves (15 × (160-144)/40 = 6) years from a 15-year Mahadasa (Example 59).
- Antardasa follows the next lord after the Mahadasa lord; in Moon Dasa the sequence begins Mars, Mercury, Saturn, Jupiter, Rahu, Venus, Sun, Moon (§17.2.2).
- Example 59's nine elapsed years place birth within Rahu Antardasa; the remaining Rahu sub-period starts at birth, followed by later Antardasas. The Dasa and Antardasa boundaries use the author's stated 360-day Savana-year convention (§16.2).
- Applicability is **not certified as a single binary rule**. The book explicitly documents three different views in §17.2.3: universal applicability; a Rahu/Lagna-lord kendra/trikona condition; and a daytime/nighttime plus paksha condition. The implementation reports all alternatives without selecting a universal winner. The second view has positive/negative fixtures. The third view is evaluated when the actual birth Panchang supplies local sunrise/sunset; it remains `not_evaluated` when that evidence is absent. Boundary tests also protect exact longitudes from floating-point wraparound during normalization. Do not label overall applicability PASS solely because a Dasa sequence was calculated.

## 3. Kalachakra Dasa — PVR §24.2, Examples 95–97

- Example 95: Moon 15°50 Taurus = Rohini Pada 2 / Apasavya-1. The pada sequence is Vi, Li, Sc, Pi, Aq, Cp, Sg, Sc, Li; paramayush = 83; elapsed at birth = 62.25; Scorpio is running with 4.75 years left. The post-birth Mahadasas begin Sc, Li, then continue Vi, Le, Cn, Ge, Ta, Ar, Sg.
- Example 96: Moon 3°00 Cancer = Punarvasu Pada 4 / Savya-1. Paramayush = 86; elapsed = 77.4; Pisces has 8.6 years remaining; next signs are Sc, Li, Vi, Cn, Le, Ge, Ta, Ar.
- Example 97: Antardasa sequence is continuous across the current and following pada rows. Scorpio AD is Sc, Li, Vi, Le, Cn, Ge, Ta, Ar, Sg; Leo AD is Le, Cn, Ge, Ta, Ar, Sg, Cp, Aq, Pi. Each AD duration is weighted by the nine actual signs for that AD set, not by the birth pada's Paramayush total.
- Deha/Jeeva are based on the first/ninth running Mahadasas, with their order reversed for Apasavya (§24.3.2).
- Nakshatra Dasa calendar intervals use Savana years of 360 days, following the author's explicit preference in §16.2. This is an author-specific convention, not a universal recommendation.

## 4. Drigdasa — PVR §21.2, Example 80

For Libra Lagna, Example 80 specifies the full 12-sign sequence:
- 9th-house group: Ge, Vi, Sg, Pi
- 10th-house group: Cn, Ta, Aq, Sc
- 11th-house group: Le, Ar, Cp, Li
- Whole first cycle: Ge, Vi, Sg, Pi, Cn, Ta, Aq, Sc, Le, Ar, Cp, Li

The old final fallback that filled missing signs in zodiac order is removed. Each independently generated house group must produce exactly four source-derived signs; all 12 first-cycle entries are the concatenation of those three groups. If a source group is incomplete, the engine raises rather than fabricating an order. Overlapping rasis across different house groups are preserved, not deduplicated: the source describes three ordered groups, not a requirement that their union contain 12 unique signs. Regression checks Example 80 and iterates all 12 Lagna signs, including natural overlap cases. Dasa lengths use Narayana sign-period rules, as §21.2(5) specifies.

## CI / release gates

- [ ] JavaScript/module syntax
- [ ] Full calculation and Tamil Phase-4 rendering regression
- [ ] Table 39 and Ashtottari Example 59
- [ ] Kalachakra Examples 95–97 and Savana-year/deha/jeeva rules
- [ ] Drigdasa Example 80 plus all-12-Lagna group checks
- [ ] Review all failed jobs before considering merge
- [ ] Exact Table 39 boundary regression after precision-safe longitude normalization

No PASS is claimed for textbook-complete Ashtottari applicability, all Kalachakra variants, or all possible Drigdasa variants until CI and independent reference comparisons pass. The source fix and tests must remain unmerged if CI fails.
