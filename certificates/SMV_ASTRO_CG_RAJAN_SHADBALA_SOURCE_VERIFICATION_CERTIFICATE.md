# SMV ASTRO — C.G. Rajan Shadbala Source-Verification Certificate

**Certificate ID:** SMV-CGR-SHADBALA-LIMITED-2026-10-19  
**Date:** 19 October 2026  
**Method under review:** C.G. Rajan, *Jathaka Kanitham*, Part I, printed pages 30–50  
**Status:** **LIMITED-SCOPE PASS for specified printed-number arithmetic and partial component checks; FULL NATAL CLASSICAL CERTIFICATION WITHHELD**  
**Independence rule:** This certificate uses the C.G. Rajan book-specific transcription, component formulas and regression fixtures. It does **not** use BPHS certification as evidence for C.G. Rajan.

## 1. What this certificate covers

The C.G. Rajan implementation and regression fixtures are source-specific and separate from the B.V. Raman production Shadbala result. The principal evidence files are:

- audits/SMV_ASTRO_CG_RAJAN_TWO_PARTS_SHADBALA_AYURDAYA_PREDICTION_SOURCE_MAP.md
- tests/cg-rajan-jathaka-kanitham-shadbala-source-qa.mjs
- tests/cg-rajan-jathaka-kanitham-shadbala-five-natal-integration.mjs
- public/horoscope/offline/cg-rajan-jathaka-kanitham-shadbala.browser.mjs

The bounded checks cover the seven-graha order; the printed p.50 component/transcription arithmetic; source-specific Sthana, Kala, Ayana, Naisargika, Dig and aspect-matrix/Drig intermediate calculations; explicit visibility of source discrepancies; and five Perambalur chart integrations with seven grahas per chart. The natal integration is deliberately partial and prevents unresolved totals from being presented as certified.

This is a repository-level, limited-scope evidence statement, not an institutional or publisher-issued certificate. The current GitHub Actions runtime result must be checked separately; this document does not claim to have executed CI.

## 2. Printed p.50 seven-graha reference values

Graha order: Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn. The test oracle records the following source-table values:

| Bala / subtotal | Sun | Moon | Mars | Mercury | Jupiter | Venus | Saturn |
|---|---:|---:|---:|---:|---:|---:|---:|
| Sthana | 227 | 479 | 333 | 373 | 420 | 323 | 303 |
| Kala | 133 | 67 | 113 | 227 | 287 | 87 | 263 |
| Ayana | 42 | 23 | 12 | 83 | 85 | 12 | 94 |
| Naisargika | 100 | 86 | 29 | 43 | 57 | 71 | 14 |
| Dig | 60 | 13 | 38 | 96 | 13 | 60 | 26 |
| Cheshta | 42 | 27 | 55 | 87 | 85 | 59 | 58 |
| Subtotal before Drig | 604 | 695 | 580 | 909 | 947 | 612 | 758 |
| Drig | +11 | +6 | +40 | +24 | +4 | +37 | +29 |
| After Drig / final in the oracle when Yuddha is zero | 615 | 701 | 620 | 933 | 951 | 649 | 787 |

These values are retained as the printed-example oracle. They are not asserted to be independently certified natal values for the five tested births.

## 3. Source conflicts that remain open

The following disagreements are deliberately visible. They are certification blockers, not values to patch away silently.

1. **Mars Saptavargaja / Sthana:** the printed table records Mars Saptavargaja 159 and Sthana 333. The current source-rule calculation derives Saptavargaja 147 and Sthana 321 because the Mars D12 segment maps to Leo and the relationship table gives the great-friend score of 38, whereas the printed row gives 50. The 12-point difference is localized to that D12 entry.
2. **Dig rounding:** the formula-derived example gives Venus 61 versus printed 60, and Saturn 25 versus printed 26. The regression retains these one-point differences rather than forcing the formula to match the table.
3. **Yuddha row / Mars final:** the source-map audit records a printed Mars Yuddha +10 while the final remains 620, not 630. The source-qa oracle currently uses a zero Yuddha row for its p.50 final-arithmetic fixture. These two records conflict and must be reconciled against the scanned page before the book's Yuddha/final-total rule can be certified. This certificate does not decide which transcription is correct.
4. **Natal Drig and Cheshta:** a printed example's aspect matrix can test arithmetic, but it does not independently supply the full angle-by-angle Drig oracle for every birth chart. The historical five-planet mean/true/Sheeghrocca values for each natal time are also not independently established.

## 4. Five-natal integration scope

The five-chart integration has 35 expected rows (five Perambalur dates × seven classical grahas). It is specifically designed to verify that:

- C.G. Rajan source-specific partial components are attached to the intended grahas.
- Sun/Moon Cheshta follows the separately defined source path.
- The five other grahas do not receive invented Cheshta values where the required historical inputs are missing.
- Drig remains unresolved where source evidence is not verified.
- The final Shadbala total remains null when required evidence is unverified.
- Rahu/Ketu are excluded from the seven-graha Shadbala.
- No lifespan/death-date result is emitted by this Shadbala path.

The SMV project’s fixed Graha Yuddha policy (+10 winner / −10 loser / 0 when no qualifying war exists) is a declared project policy; it must not be represented as a numeric rule proven by C.G. Rajan's printed example. A possible war with missing required inputs must remain unresolved.

## 5. Certification decision

- **Printed p.50 arithmetic fixture:** limited arithmetic evidence only.
- **Rule-derived components:** source-specific partial checks; documented discrepancies remain open.
- **Five natal charts / 35 graha rows:** partial integration only, not complete numerical certification.
- **Full seven-graha classical C.G. Rajan Shadbala:** **NOT CERTIFIED**.
- **Production status:** retain classicalCertified:false; retain null total where required Cheshta/Drig/Yuddha evidence is unresolved.
- **Release gate:** resolve the Mars D12 conflict, Dig rounding, p.50 Yuddha transcription/final-total conflict, independent natal Drig oracle, and historical five-planet Cheshta inputs; then obtain a green current GitHub Actions run before considering a full certificate.

This certificate is independent of the B.V. Raman and BPHS certificates. It certifies no prediction accuracy, lifespan inference, or complete natal Shadbala result.
