# C.G. Rajan — Jathaka Kanitham: Two-Part Source Audit (SMV ASTRO)

**Source:** User-uploaded `Jathaka Kanitham Tamil - C G Ranjan.zip` (17 Oct 2026). It includes two IMAGE-ONLY PDFs (no native selectable text). The page mappings below come from directly reading the scan images, **not OCR**. Do not redistribute the PDFs as GitHub source/assets.

**Scope:** Compare calculations and prediction rules without silently replacing any previously implemented methods. This source is additional evidence, **not** proof that the five Perambalur historical birth charts are certified. This audit is separate from the Uttara-only numerical verification inside PR #14; no rule system should be mixed without an explicit source choice and reconciliation.

## Part I — `Jathaka Kanitham Tamil - C G Ranjan.pdf`: 320 PDF pages

Printed-page index (approximately PDF page = printed + 22):
- Printed **41–49** (PDF **63–71**): detailed graha bala arithmetic, including Saptavargaja, Kala, Ayana, Naisargika, Dig, Cheshta and other bala components.
- Printed **50** (PDF **72**): **seven-graha worked full Shadbala table**, every individual Bala, intermediate sums, Drig and Yuddha rows.
- Printed **51–62** (PDF **73–84**): Bhava/Dig and additional computed assessments; Ishta/Kashta examples (do not mistake Ishta/Kashta for sixfold Shadbala).
- Printed **228 onward** (PDF **250 onward**): **Ayurdaya computation**. The contents separately identify Pindayurdaya, Amsayurdaya and Naisargika Ayurdaya and reductions. NO import or coupling into Horoscope/Matching prediction.

### Seven-graha numeric fixture: printed page 50

Column order: Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn. Numerical units are retained exactly **as printed**; do not change to Rupa or rescale without matching the author's definition.

| Bala | Sun | Moon | Mars | Mercury | Jupiter | Venus | Saturn |
|---|---:|---:|---:|---:|---:|---:|---:|
| Sthana | 227 | 479 | 333 | 373 | 420 | 323 | 303 |
| Kala | 133 | 67 | 113 | 227 | 287 | 87 | 263 |
| Ayana | 42 | 23 | 12 | 83 | 85 | 12 | 94 |
| Naisargika | 100 | 86 | 29 | 43 | 57 | 71 | 14 |
| Dig | 60 | 13 | 38 | 96 | 13 | 60 | 26 |
| Cheshta | 42 | 27 | 55 | 87 | 85 | 59 | 58 |
| Subtotal | 604 | 695 | 580 | 909 | 947 | 612 | 758 |
| Drig | +11 | +6 | +40 | +24 | +4 | +37 | +29 |
| After Drig | 615 | 701 | 620 | 933 | 951 | 649 | 787 |
| Printed Yuddha row | 0 | 0 | 10 | 0 | 0 | 0 | 0 |
| Printed final | **615** | **701** | **620** | **933** | **951** | **649** | **787** |

A self-contained independent fixture in `tests/cg-rajan-jathaka-kanitham-shadbala-print50-oracle.mjs` now checks the six-group subtotals and after-Drig values while preserving the scan's final column as a separate source fact. **Mars discrepancy: the scan prints Yuddha +10 but leaves the final at 620. Accepted arithmetic rule: 620 after-Drig + 10 Yuddha = 630.** The source keeps `printedFinal=620` for audit traceability and uses `final=630` for the corrected arithmetic; no printed source value is rewritten. This resolves the arithmetic decision only; it does NOT certify the other planetary components or five SMV natal charts.

## Part II — `...ஜாதக_கணிதம்_இரண்டாம்_பாகம்_என்னும்_ஜாதகப்_பலாபலன்கள்_நிர்ணயம்.pdf`: 421 PDF pages

Approximate PDF page = printed page + 13; checked directly at printed pp. 111 and 365.
- **Printed 1–110**: planet/rasi/bhava classifications, benefic and malefic conditions, supporting interpretive groundwork.
- **Printed 111–137** (PDF 124–150): life results of **lords placed in 12 houses**.
- **Printed 138–207** (PDF 151–220): **Saptavarga / planetary placement interpretations** across planets.
- **Printed 208–303** (PDF 221–316): **12-house outcomes** grouped by house and planetary conditions.
- **Printed 333–363** (PDF 346–376): further Rasi/Navamsa/Nakshatra interpretation classes, per table of contents.
- **Printed 364–400** (PDF 377–413): **Dasha–Bhukti and planet-specific dasha results**.

### Prediction-engine source mapping (future separate work)

The book provides conditional interpretive rules, **not** evidence that the existing app has already implemented them. Incorporation requires:
1. Capture per-rule antecedents (planet, lordship, bhava, sign dignity, benefic/malefic, aspects, conjunctions, varga and exceptions), not duplicate canned paragraphs.
2. Produce house-specific life result -> natal reason -> counteracting evidence -> applicable 15-year Dasha–Bhukti and Gochara interval; avoid repeating the same generic karaka text in every house.
3. Apply to Horoscope 12-house predictions first. Matching should use two independent chart evidence chains, pairwise fit, D7/D9 if computed, and one coherent verdict.
4. Compare predictions with the user's five Perambalur reference births, not one universal horoscope.
5. Keep administrative Manual Rule Editor rules admin-only and do not change public/customer UI without separate regression.
6. Avoid verbatim copying of extended book passages; implement conditions and write individualized Tamil/English life-outcome explanations.

## Gating

- **Shadbala:** The printed p.50 example alone is useful independent arithmetic evidence, **not** a five-date independent astronomical mean/true/sheeghrocca validation or seven-graha full certification. No production `classicalCertified:true` change.
- **Ayurdaya:** separate numerical study and regression suite. No lifespan/death estimate published and no Shadbala merge.
- **Prediction:** Part II rule extraction/implementation is a **separate workstream**, not part of a numerical certificate.
- **Main:** PR #14 may remain draft; this audit and fixture require no production formula change.
