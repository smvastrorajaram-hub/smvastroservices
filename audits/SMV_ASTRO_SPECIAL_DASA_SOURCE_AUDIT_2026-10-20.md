# SMV ASTRO — Special Dasa Source Audit
Date: 2026-10-20
Branch: `audit/all-dasa-source-correctness-2026-10-20`
Status: **SOURCE-LEVEL AUDIT IN PROGRESS — Vimshottari Savana-year and Rasi-strength/Sudasa fixes added; CI pending**
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

## 1B. Vimshottari Dasa — PVR §16, Example 50

**Source oracle:** printed pp. 181–185, especially §16.2–16.3 and Example 50. PVR explicitly chooses 360-day Savana years for all Nakshatra Dasa date arithmetic in this book; this is the author's convention, not a universal recommendation.

- **Root cause found:** the browser wrapper and server engine used `365.2425` days per Dasa-year for Vimshottari Mahadasha, Antardasha and Pratyantardasha boundaries. That contradicted the chosen source convention even though Ashtottari and Kalachakra already used 360 days.
- **Fix on this branch:** Vimshottari now uses 360-day Savana years consistently. The subperiod duration is computed in Dasa-year units as parent Dasa years × the sublord's Vimshottari years / 120. The server and browser implementations are kept in sync.
- **Birth running period:** the first Mahadasha previously displayed its full nominal years with a birth-clipped start date. The first Mahadasha and any already-running Antardasa / Pratyantardasa now report visible remaining duration separately from `fullYears`; past Antardasas are excluded while their complete MD-based shares still determine boundaries.
- **Example 50 regression:** Moon 2°23′ Aquarius (Dhanishtha) gives the Mars Dasa balance (7 × 257/800 = 2.24875) years, and the visible Antardasa balances must sum to that remaining MD balance. The printed example's date is treated as an approximate worked-example boundary because its text calls the civil date “about” the given time.

## 5. Rasi strength and co-lord selection — PVR §15.5.1–15.5.2

**Root cause found:** `strongerSign()` used an arbitrary weighted score (occupied-sign count plus fixed exaltation/debilitation weights and a Leo bonus). That is not the source algorithm: the book says to stop at the first rule that breaks a tie.

**Fix on this branch:** the helper is now rule-ordered: (1) count occupied grahas, (2) count the source-specified occupation/rasi-aspect roles, (3) exalted planet in the sign, (4) sign-lord oddity mismatch, (5) dual > fixed > movable, (6) advancement of the sign lord, with Rahu/Ketu measured from the sign end. Ayur-dasa seed comparisons use a separate support count that omits the sign lord's aspect, rather than applying the ordinary Phalita-Dasa role list unchanged.

Scorpio/Aquarius co-lords now follow the textbook's ordered method: if one co-lord occupies its own sign, select the other; otherwise compare conjunction partners, Jupiter/Mercury/dispositor rasi support, exaltation, occupied-sign modality, and (for Dasa-duration selection) the larger Narayana period before using advancement as the final tie-break. A 12-year cap still remains an explicitly documented inter-source reconciliation for the Mercury-in-Virgo Narayana case, not a claim that the PVR passage itself states that cap.

## 6. Sudasa — PVR §20.2, Example 77

**Root cause found:** Sudasa reused the shared Kendradi direction code and therefore applied the Saturn-in-seed / Ketu-in-seed exceptions to Sudasa as well. PVR §20.2 instead uses the odd/even parity of the **Sree Lagna sign** to select direction.

**Fix on this branch:** Saturn/Ketu direction overrides are now limited to Lagna Kendradi Rasi Dasa (§19.2); Sudasa follows Sree-Lagna parity only. Regression recreates Example 77 with Sree Lagna at Capricorn 12°21′ and confirms the backward sign order and the first balance fraction `(30° − 12°21′)/30°`.

## Cross-system source audit status

| Dasa system | Audited source rules / regression | Current status |
|---|---|---|
| Vimshottari | PVR §16, Example 50; Nakshatra-lord start, 360-day Dasa years, MD/AD/PD ratios, birth-running subperiod balances | Source fix added; CI pending |
| Ashtottari | Table 39 boundaries, Example 59, partial birth AD, Savana-year dates | Calculation fixtures pass before this branch; overall applicability intentionally unresolved because §17.2.3 provides conflicting views |
| Narayana | Table 40 progression, odd/even-footed directions, Saturn/Ketu seed cases, duration and second-cycle rule, co-lord selection | Source fixes + expanded ordered-strength audit on this branch; CI pending; Mercury-in-Virgo 12-year cap remains inter-source reconciliation |
| Lagna Kendradi | Stronger Lagna/7th seed, sign direction/overrides, Kendra/Panaphara/Apoklima order, second-cycle years | Existing cycle fixtures; stronger-rasi helper updated on this branch; CI pending |
| Sudasa | Sree Lagna seed, Sree-sign direction, first-period balance, 2nd-cycle lengths; Example 77 | Direction bug fixed and Example 77 regression added; CI pending |
| Drigdasa | Example 80, all 12 Lagna aspect groups, overlaps retained, second-cycle lengths | Existing source-sequence fixtures; updated shared Narayana durations/co-lord logic on this branch; CI pending |
| Niryaana Shoola | Stronger 2nd/8th, Saturn-in-seed Example 87, movable/fixed/dual 7/8/9 year lengths | Existing fixtures; Ayur-specific strength mode and shared strength logic updated on this branch; CI pending |
| Shoola | Stronger Lagna/7th, zodiacal 9-year periods, 12 equal ADs from the stronger Dasa sign/7th, AD seed treated as Lagna | Existing structure fixtures; Ayur-specific strength mode updated on this branch; CI pending |
| Kalachakra | Examples 95–97, Pada/sequence continuation, Paramayush/balance, Deha/Jeeva, weighted nine-token ADs | These specific textbook examples have regression coverage; not every lineage variant is certified |

## CI / release gates

- [ ] JavaScript/module syntax
- [ ] Vimshottari Example 50: 360-day Savana year and partial birth MD/AD/PD balances
- [ ] Sudasa Example 77: Sree Lagna direction and first-period fraction
- [ ] PVR §15.5.1–15.5.2 ordered Rasi strength and co-lord tie-breakers
- [ ] Full calculation and Tamil Phase-4 rendering regression
- [ ] Table 39 and Ashtottari Example 59
- [ ] Kalachakra Examples 95–97 and Savana-year/deha/jeeva rules
- [ ] Drigdasa Example 80 plus all-12-Lagna group checks
- [ ] Review all failed jobs before considering merge
- [ ] Exact Table 39 boundary regression after precision-safe longitude normalization

No PASS is claimed for textbook-complete Ashtottari applicability, all Kalachakra variants, or all possible Drigdasa variants until CI and independent reference comparisons pass. The source fix and tests must remain unmerged if CI fails.
