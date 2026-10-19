# P.V.R. Narasimha Rao — longevity, Dasa and Sodhya Pinda audit

**Date:** 2026-10-20  
**Repository baseline audited:** `main` at the time the feature branch was created  
**Working branch:** `audit/pvr-narasimha-rao-dasa-longevity`  
**Source file:** *Vedic Astrology: An Integrated Approach*, P.V.R. Narasimha Rao  
**Page mapping:** the supplied PDF's printed page labels differ from the PDF page index by 12 pages: printed pp. 180–185 = PDF pp. 192–197; printed pp. 226–289 = PDF pp. 238–301; printed pp. 337–341 = PDF pp. 349–353.

## Current disposition

The source text has been compared with the current Dasa engine and a limited set of source-backed discrepancies have been corrected on the working branch. This is **not** a certification of all Dasa algorithms or of any method for predicting life span or death.

## Printed pp. 180–185 — longevity rules

Added the PVR research output alongside the existing chart/Sodhya-Pinda results:

- Method of Three Pairs: (1) Lagna lord and the Table-32 8th lord, (2) Moon and Saturn, (3) Lagna and Hora Lagna.
- Table-33 pair categories: movable+movable / fixed+dual = long; dual+dual / movable+fixed = middle; movable+dual / fixed+fixed = short.
- When two pairs agree and the third differs, Table 34 is used for Paramaayush. In the three-way tie, pair 3 is preferred except when Moon is in Lagna or the 7th, when pair 2 is preferred.
- The Eighth Lord Method is displayed separately: select the stronger of Lagna and the 7th, use Table 32 for the special 8th house, and classify the 8th lord's placement as quadrant / panaphara / apoklima.

**Caveat:** the existing sign-strength helper is an SMV approximation; it is not a complete reimplementation of every PVR strength rule and exception. Therefore the Eighth Lord comparison is flagged research-only. Maraka, Rudra, Trishoola and Maheswara definitions are listed as corroborating rule families, not passed off as fully computed/certified judgements. PVR explicitly says these longevity-category methods are not infallible and warns against frightening clients with death predictions.

## Printed pp. 226–289 — Dasa source audit

| Dasa | Finding / change | Status |
|---|---|---|
| Narayana Dasa (§18) | The old second cycle repeated the first cycle's lengths, and the duration routine used ordinary odd/even sign-number parity instead of the book's odd-footed/even-footed classification. Corrected both: second-cycle duration is 12 minus the corresponding first-cycle duration; length counting now uses the Table 18.2.2 footed-sign groups. Added regression assertions for both cycles and Taurus/Leo worked conditions. | Fixed on working branch; CI pending |
| Niryaana Shoola Dasa (§22) | The source's Example 87 applies the Saturn-in-seed forward-direction exception. The old code only used odd/even direction. Corrected for the explicit Saturn example and added a fixture regression. Sign-year mapping remains 7/8/9 years for movable/fixed/dual signs. | Fixed on working branch; CI pending |
| Shoola Dasa (§23) | The source says antardasas use the same method as the main Shoola sequence with the Dasa sign treated as Lagna. The old code incorrectly reused Narayana-style antardasa progression. Corrected: choose the stronger of Dasa sign and 7th from it, then proceed in zodiacal order through 12 equal antardasas. | Fixed on working branch; CI pending |
| Ashtottari (§17) | The engine's sequence/duration formula and applicability caveat exist. The book reports that the system's applicability conditions are disputed. | Partial review only |
| Lagna Kendradi, Sudasa, Drigdasa, Kalachakra | Present in the engine. Drigdasa's progression direction was corrected to use the book's odd-footed/even-footed groups, but its full aspect-group construction and fallback completion still need independent example oracles. Lagna Kendradi/Sudasa/Kalachakra still require fuller rule-by-rule and worked-example audits. | **Not certified / more audit needed** |

The implementation uses a heuristic for comparing sign strength. That limitation must not be hidden by a green syntax/regression run.

## Printed pp. 337–341 — Sodhya Pinda event-timing references

Added a separate PVR/Parasara research module, deliberately independent from B.V. Raman's Ashtakavarga Ayurdaya track. It:

1. obtains the seven classical grahas' raw Bhinnashtakavarga rows;
2. obtains each graha's PVR/Parasara Trikona + Ekadhipatya Shodhana and Sodhya/Yoga Pinda using the existing `classical-shodhana.browser.mjs` implementation;
3. takes the raw BAV rekha count in the specified house from that graha and calculates `rekhas × that graha's Sodhya Pinda`;
4. derives the nakshatra target from remainder modulo 27 and the rasi target from remainder modulo 12; zero remainder is mapped to the 27th nakshatra (Revati) and 12th rasi (Pisces);
5. shows the seven source topics: Sun/father/9th; Moon/mother/4th; Mars/siblings/3rd; Mercury/profession/10th; Jupiter/children/5th; Venus/marriage/7th; Saturn/longevity/8th.

The UI places these targets and the added longevity rules after the existing Sodhya Pinda report in Chart Analysis. The targets are **transit reference points**, not calendar dates or event guarantees. PVR states that this method is inconsistent and open to research. No final life-span/death date is produced. The existing B.V. Raman report remains a distinct formula/source track and is not used to substitute for PVR's Sodhya Pinda.

## Regression coverage added on this branch

- Narayana: all 12 second-cycle lengths equal 12 minus the corresponding first-cycle length.
- Niryaana Shoola: Saturn-in-seed fixture verifies the documented forward exception and movable/fixed/dual durations.
- Shoola: antardasa starts from the stronger of Dasa sign/7th and proceeds in regular zodiacal order.
- PVR Sodhya target: zero remainder maps to Revati/Pisces, and each source event product is raw BAV rekhas multiplied by that planet's Sodhya Pinda.
- Every new result explicitly reports `researchOnly: true` / `certified: false`.

**Remaining work before any overall PASS:** wait for pull-request CI; compare each Dasa system's first/second cycle, antardasa order, balance and examples against the relevant printed tables; add independent worked-example oracles for the methods marked partial; review all rule-specific strength/exception branches. Until then these features must not be described as fully book-certified.
