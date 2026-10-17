# SMV ASTRO — C.G. Rajan Seven-Graha Shadbala Certification Work Log

**Status:** certification in progress; this file is NOT a certificate.
**Branch:** `audit/v365-saura-mean-motion-panchang-oracle`
**PR:** #14, draft and unmerged.
**Scope:** seven classical grahas only; C.G. Rajan Part I is the current Shadbala component method. The user's SMV fixed-scale Graha Yuddha policy is +10 for a resolved winner, -10 for a resolved loser, and 0 only when no qualifying war exists. Uttara Kalamrita supplies the eligibility/winner procedure, not the fixed numeric magnitude.

## Certification gates

| Gate | Current result | Evidence / remaining work |
|---|---|---|
| Seven-graha input integrity | **PASS — source guard added** | Saptavargaja now requires exactly one finite Rasi longitude for each of the seven grahas; missing, duplicate or invalid positions throw instead of silently changing temporary friendship. |
| Sthana Bala | **FAIL — source conflict proven; certification blocked** | Root cause of the Mars 12-point delta is now isolated: p.37 marks Mars–Sun as great friend; p.39 says D12 uses the Navamsa method and its row gives a great-friend score of 38; p.39/p.41 nevertheless print Mars D12 as 50. Rule-derived values remain D12 38, Saptavargaja 147, Sthana 321; literal printed values remain 50, 159, 333. No +12 patch. See the D12 source-conflict audit. |
| Dig Bala | **FAIL / unresolved** | Printed p.50 comparison: Venus calculated 61 vs printed 60; Saturn calculated 25 vs printed 26. The exact input precision / intermediate rounding rule needs a source-supported reconciliation. |
| Kala Bala | **PARTIAL PASS** | Fixed worked-example arithmetic reproduces the printed p.50 total, but the historical natal time, sunrise/Hora, year/month/day lord and other temporal inputs need independent source verification per chart. |
| Ayana Bala | **PARTIAL PASS** | Rounded-Kranti p.50 values match the printed worked example. This alone does not validate the historical equatorial-declination input for all 35 natal rows. |
| Naisargika Bala | **PASS — formula/table scope** | The seven printed fixed values are verified. This is not by itself a natal total certificate. |
| Cheshta Bala | **FAIL / unresolved** | The five non-luminary natal Cheshta values must be supported by same-frame classical mean, true and Śīghrocca inputs and an independent numerical oracle. Sun/Moon use the source-specific declared rule, not fabricated five-planet orbital triples. |
| Drig Bala | **PARTIAL PASS / unresolved** | The p.50 net benefic/malefic aggregation from the printed matrix is verified; generating each angle-specific aspect from a chart does not yet reproduce the full printed p.30 matrix. A supplied numeric Drig value no longer counts as verified evidence by itself. |
| Graha Yuddha | **PROJECT RULE TESTED; natal rows not certified** | Uttara Kalamrita eligibility and northern-latitude winner method; SMV fixed +10/-10/0 mapping. Missing/ambiguous latitude or overlapping wars stays unresolved rather than assumed zero. |
| Historical classical planetary inputs | **FAIL / unresolved** | Existing research astronomy candidates and modern Swiss comparison are not a same-frame independent historical classical true-longitude oracle for all 25 five-planet natal positions. |
| Full seven-graha final totals | **WITHHELD** | No final certification until every component/input gate passes for all seven grahas and all selected natal rows. No production activation. |

## Source-level changes in this certification stage

1. `cgRajanSaptavargajaBala` now validates all seven unique finite graha positions before deriving compound relationships. Missing data cannot silently become an accidental temporary-enemy classification.
2. `cgRajanShadbalaForPlanet` now requires explicit `classicalCheshtaEvidenceVerified: true` and `sourceDrigEvidenceVerified: true` before numeric five-planet Cheshta / source Drig values are accepted into a complete arithmetic total. A numeric value alone is not proof.
3. Tests cover missing, duplicate and non-finite graha inputs, plus the fail-closed behavior for unverified numeric Cheshta/Drig values. The synthetic total-path fixture is labelled arithmetic-only and does not certify a natal chart.
4. The p.50 worked example remains a fixed source arithmetic oracle, not a substitute for independent birth-chart evidence. Mars remains 620 in the printed example when Yuddha is absent; no +10 is added.

## Next required work, in order

1. Mars D12 root cause is isolated to an internal contradiction in the supplied book example (p.37 relationship table vs p.39/p.41 printed D12 score). Preserve the rule-derived 38/147/321 and literal printed 50/159/333 separately; do not force-fit. Full book-example reconciliation still requires independent evidence such as an erratum, alternate edition, or corrected input.
2. Reconcile Dig rounding using exact source input precision and independent calculations.
3. Reconstruct the Rajan angle-by-angle Drig generation from the printed pp. 30–32 matrix and add independent pairwise tests.
4. Verify the five-planet Cheshta chain using same-frame historical classical inputs and independent numeric evidence for each of the five natal dates.
5. Verify temporal Kala inputs (birth-local sunrise, Hora and temporal lords) for all 35 graha rows.
6. Run the full 5-birth × 7-graha integration with every source gate; issue a certificate only if every required row passes and all known discrepancies are resolved.

## Safety / release rule

- Keep `classicalCertified:false` until all required gates are proven.
- Keep `strength3` and customer Horoscope/Matching outputs unchanged.
- Do not merge PR #14 to `main` or describe a green arithmetic workflow as full Shadbala certification.
- Keep Ayurdaya separate from Shadbala and do not emit lifespan/death-age conclusions.


## Mars D12 discrepancy — root cause isolated (17 Oct 2026)

The scanned source comparison now establishes an internal contradiction rather than a demonstrated D12 implementation defect. Printed p.37 (scan PDF p.59) marks Mars–Sun as great friend. Printed p.39 (PDF p.61) says D12 Vargaja Bala is calculated by the Navamsa method and gives the Moon's great-friend score as 38; the same row gives Jupiter's own-sign score as 50. Mars 206°30′ is Libra 26°30′, the 11th D12 segment, hence Leo ruled by Sun. The source-rule result is therefore Mars D12 38. The printed p.39/p.41 row says 50, which propagates to printed Saptavargaja 159 and Sthana 333. Rule-derived results are 147 and 321, respectively; Mars subtotal before Drig becomes 568 rather than 580, and with the printed +40 Drig candidate the arithmetic would be 608 rather than 620. These are rule-derived reconstructions, not a final certified natal total.

Added independent D12 arithmetic and cross-check assertions to the source QA test, and an inline source comment. The literal printed table oracle remains unchanged; no arbitrary +12 adjustment was added. The full certificate remains withheld because this resolves only the cause of this discrepancy, not the remaining Dig, Cheshta, Drig and historical-input gates.
