# V366 — BPHS five-graha Cheshta Bala: independent published numerical certificate, bounded scope

Date: 2026-10-17. Continues V365, PR #14, on a draft audit branch. No live customer-strength override.

## Classical hierarchy and independent numerical evidence

- BPHS (R. Santhanam), Vol I Ch 27 vv 24–25: the arithmetic takes the circular midpoint of Mean and True longitude; compare with Sheeghrocha; angular separation / 3 = Virupas (0–60). 
- Uttara Kalamrita II, pp 42–43: Mars, Jupiter, Saturn use own mean + mean Sun Sheeghrocha; Mercury and Venus use mean Sun as mean and their own fast orbital mean as Sheeghrocha.
- Modern scholarly **unmodified Saura** numerical worked example: Santhoju, Bhalla, Behera, Pai, *Mathematical model as per the algorithm of Suryasiddhanta for computation of location specific true position of the planets*, *Journal of Astrophysics and Astronomy* 46:9 (2025), Tables 6–7. Mean, Sheeghrocha and independent four-operation true positions at Mandi sunrise on 2024-04-09. **Paper-true longitudes are INPUTS**, not recomputed by the SMV application.
- Independent official **Bija-modernized** published data: Ministry of Earth Sciences / India Meteorological Department, *Rashtriya Panchang Saka 1948 (2026–27)*, 2026-03-22 05:30 IST. [IMD Bija-corrected mean longitudes](https://packolkata.imd.gov.in/panchang/en/bija_corrections) and [IMD actual Nirayana geocentric true longitudes](https://packolkata.imd.gov.in/panchang/en/longitude_planets), Chaitra 1–7. This is *not* the identical pure ancient Saura model: Bija corrections are necessary before using IMD modernized true data.
- V365 Saura mean-motion values independently match the **uncorrected** government mean-position column to <=1.75 arcseconds. V366 separately adds each government-reported Bija correction, checks against the government **corrected** column to <=1.75 arcseconds, and computes BPHS Virupas using their independently published *same-system* true longitudes. Importantly NO Swiss Lahiri true longitude is paired with unmodified Saura mean.

## Published-source pair A: official IMD 2026-03-22 05:30 IST (Bija-corrected)

| Planet | Mean input, deg | True (IMD) deg | Sheeghrocha, deg | Derived Cheshta Virupas |
|---|---:|---:|---:|---:|
| Mercury | 335.295136 | 314.334167 | 178.677442 | 48.712403 |
| Venus | 335.295136 | 355.072500 | 20.924744 | 11.913642 |
| Mars | 309.992211 | 321.051667 | 335.295136 | 6.591066 |
| Jupiter | 86.217681 | 81.052778 | 335.295136 | 36.113364 |
| Saturn | 346.644244 | 340.075000 | 335.295136 | 2.688162 |

Values are derived arithmetic from printed IMD means and true positions, not published IMD Cheshta Bala values. The JavaScript method is cross-checked against an *independently implemented* atan2/acos sine-cosine unit-circle midpoint (rather than the same modulo formula).

## Published-source pair B: published academic traditional Saura 2024-04-09 sunrise at Mandi

| Planet | Printed Mean | Printed True | Printed Sheeghrocha | Derived Cheshta Virupas |
|---|---:|---:|---:|---:|
| Mercury | 353.2261 | 0.7380 | 151.2490 | 51.422317 |
| Venus | 353.2261 | 343.9867 | 328.7388 | 6.622533 |
| Mars | 295.0651 | 319.9003 | 353.2261 | 15.247800 |
| Jupiter | 31.7206 | 28.2115 | 353.2261 | 12.246650 |
| Saturn | 316.5202 | 313.0236 | 353.2261 | 12.818067 |

**Caution:** The paper's 2024 numerical positions are an external traditional worked example, not an oracle proving our software's 2024 natal True Longitude implementation. These derived Bala numbers are NOT claims of paper-published Bala scores.

## Test procedure and genuine PASS scope

`node tests/v366-bphs-published-cheshta-numerical-regression.mjs` checks:
1. Six pure Saura mean longitudes vs published government *uncorrected* column.
2. Six V365 Saura + IMD-published Bija corrections vs government *corrected* column.
3. Exact 5-planet mapping mean/Sheeghrocha and BPHS Cheshta arithmetic independently in a second atan2/acos algorithm (not a copy of modulo arithmetic).
4. Two fully populated **published longitudes triples** (5 grahas each), derived Virupa oracle values within a bounded tolerance.
5. Physical finite/range checks, rejection of invalid/missing inputs, and continuity of 35 separate official True Longitude figures across March 22–28.
6. Explicit `natalCertified:false` from current book helper.

**Qualified PASS:** BPHS angular arithmetic and traditional input mapping, with source-backed numeric triples for **all five planets** in TWO published epochs; Saura mean and IMD Bija-calibrated mean at one official epoch. Previous V365 PASS still stands.

**NOT PASS for total five-planet natal Cheshta or whole Shadbala:**
- An automatic classical-compatible **True Longitude** generator for arbitrary natal dates is still missing; 2024 published true longitudes and 2026 official true longitudes are externally **supplied** numerical points. They do not certify 1971, 1974, 1992, 1994, 2015.
- Time-changing `Bija` correction model remains unverified outside official 2026 epoch; a static 2026 Bija offset for historical nativities would be wrong.
- Sun/Moon Cheshta, Drig special aspect disputed interpretation, full Kala/Yuddha system, and end-to-end natal output have separate remaining audit boundaries.
- Therefore `motionClassical()` speed-bin provisional implementation is **not** replaced. No new production Shadbala certification flag.

This is an incremental *numerical* certificate for the book formula, not an unsupported claim of full production/natal Bala certification.
