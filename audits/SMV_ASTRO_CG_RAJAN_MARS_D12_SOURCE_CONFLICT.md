# C.G. Rajan Saptavargaja — Mars D12 Source Conflict Audit

**Status:** Root cause identified as an internal contradiction in the printed worked example; no scoring-rule patch is justified.

## Source evidence (Part I, printed page numbers)

- **p.37 / scan PDF p.59 — compound relationship table:** the Mars row against the Sun column is marked **அ-மி (Ati-Mitra / great friend)**.
- **p.39 / scan PDF p.61 — Dvādaśāṃśa Vargaja Bala:** the method note says to calculate it in the same manner as Navāṃśa Vargaja Bala. Its printed row gives the seven values **13, 38, 50, 25, 50, 13, 3**.
- **p.41 / scan PDF p.63 — consolidated Saptavargaja table:** repeats the Mars D12 value **50** and prints the Mars Saptavargaja total **159**.
- **p.50 / scan PDF p.72 — Shadbala worked example:** carries the same Sthana Bala **333**, which includes the printed Saptavargaja value 159.

## Reproduction from the example inputs

The example input for Mars is **206°30′**, i.e. Libra 26°30′. Each D12 segment is 2°30′, so this is segment 11. Counting from Libra, the 11th D12 sign is **Leo**; Leo's lord is the **Sun**.

The p.37 relationship table classifies Mars–Sun as **great friend**. The p.39 D12 row itself provides an internal score cross-check: Moon's D12 great-friend case is 38, while Jupiter's own-sign case is 50. Therefore, applying the book's stated relationship-and-varga method gives Mars D12 **38**, not 50.

| Item | Printed book | Rule-derived |
|---|---:|---:|
| Mars D12 component | 50 | 38 |
| Mars Saptavargaja total | 159 | 147 |
| Mars Sthana Bala | 333 | 321 |
| Mars subtotal before Drig | 580 | 568 |
| Mars after Drig (Drig +40) | 620 | 608 |

The deltas are all exactly 12 and propagate from the one D12 component. The printed p.39 and p.41 values, the p.41 Saptavargaja sum, and p.50 Sthana/total arithmetic are internally consistent with each other, but conflict with the p.37 relationship classification and the p.39 calculation instruction.

## Fix decision

- **Do not change** the general D12 sign mapping or the great-friend score to force the printed Mars value.
- Keep the printed table as a literal source transcription: **50 / 159 / 333**.
- Keep the source-rule reconstruction as **38 / 147 / 321** for this example.
- Keep the source conflict visible in tests and certification gates. Do not claim the book's worked example is fully reconciled until an erratum, alternate edition, or different source input is independently established.
- This resolves the cause of the 12-point discrepancy as far as the supplied scan and stated rules allow; it does **not** certify the complete seven-graha Shadbala. Other Dig, Cheshta, Drig and historical-input gates remain open.
