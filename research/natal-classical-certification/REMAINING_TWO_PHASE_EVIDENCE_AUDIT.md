# Remaining two natal-certification phases — evidence audit

**PR:** [#564 — research only](https://github.com/smvastrorajaram-hub/smvastroservices/pull/564)  
**Scope:** 1800–2399; one seeded-random natal chart per year; five visible planets; seven grahas × six Bala components.  
**Overall result:** **Both evidence ledgers created and regression added; full general certification remains BLOCKED.**

## Phase 1 — Mean / True / Sheeghroccheya

Ledger: `historical-longitude-evidence-ledger.json` (15 rows).

- **Mean:** Burgess 1860 Bīja-corrected mean-motion and 1 Jan 1860 Ujjain mean-longitude table reconstruction is a limited PASS. Existing regression maximum residual 0.9674 arcsec against 1.5 arcsec tolerance. This is not an independent oracle for every one of the 600 random birth epochs.
- **True:** Sūrya-Siddhānta II.39–45's four-pass Manda/Śīghra sequence and a B.V. Raman 1918 worked example exist. An archival historical oracle for arbitrary epochs remains absent. The separate 3,000 annual DE441 comparisons fail the declared 0.05° modern accuracy gate for every graha:

| Planet | RMS | p95 absolute | Maximum absolute |
|---|---:|---:|---:|
| Mercury | 4.734911° | 6.802282° | 7.588441° |
| Venus | 5.890850° | 13.715045° | 21.503665° |
| Mars | 5.753817° | 7.230395° | 9.925365° |
| Jupiter | 2.477131° | 3.540302° | 3.993845° |
| Saturn | 6.007322° | 8.866978° | 9.459852° |

- **Sheeghroccheya:** B.V. Raman Ch.VI §§102–105, pp.76–78 provides the standard-chart example. Saturn conflicts: §104 p.77 prints 151.23°; Example 49 p.78 uses 181.23° and derives printed 63.42° Chesta Kendra / 21.14 Chesta Bala.

The 600 random charts and 3,000 candidate rows are coverage data, not independent archival verification at all 600 exact DOBs.

### Existing official Government PAC 2026 certificate — already complete

The official Government of India / IMD Positional Astronomy Centre 2026 five-planet daily Nirayana cross-check is already certified and is reused as an existing benchmark; it is not repeated in this PR.

- Five official PAC planet PDFs; 365 daily rows per planet; 1,825 values total.
- TT only: each civil date is evaluated at 00:00:00 TT.
- Maximum residual 0.253273 arcsec; RMS 0.128957 arcsec; the declared 0.36 arcsec gate passed.
- Existing report: [PAC 2026 full-year certificate](https://github.com/smvastrorajaram-hub/smvastroservices/blob/main/audits/SMV_ASTRO_PAC_2026_FIVE_GRAHA_NIRAYANA_CROSSCHECK_2026-11-20.md).
- Existing successful run: [Actions #44778196616](https://github.com/smvastrorajaram-hub/smvastroservices/actions/runs/44778196616).

No 1971, 1974, 1992, 1994 or 2015 IENA/IAE editions are required or to be searched for in this task. The PAC 2026 certificate is a contemporary benchmark; it does not by itself prove a historical Saura four-pass True Longitude or a same-model classical Mean/True/Sheeghroccheya chain.

**Phase 1 verdict:** mean source-anchor limited PASS; historical four-pass True longitude remains PARTIAL; exact-epoch modern DE440 parity is tracked separately; Sheeghroccheya PARTIAL with Saturn conflict. The existing Government PAC 2026 certificate remains PASS and is not repeated. No historical-longitude certificate is issued.

### Exact natal-epoch DE440 cross-check — implemented as a separate modern validation

The research workflow now takes the exact deterministic random DOB/time/place records already generated for 1800–2399 and evaluates the NAELOS/JPL DE440 apparent geocentric longitude for Mercury, Venus, Mars, Jupiter and Saturn at each same epoch. The test verifies all six relevant 100-year binaries against the checked-in byte-length/SHA-256 manifest, converts each historical local civil time using the recorded IANA offset, and compares NAELOS with the repository Swiss Ephemeris at the same ET/TT instant.

This is a distinct modern numerical parity test. The outputs are additionally transferred into the declared Burgess-1860 Saura frame to exercise the BPHS Chesta input geometry with the already audited Saura mean/Sheeghroccheya selector. The test does not change the historical Sūrya-Siddhānta True Longitude output and does not turn modern DE440 parity into a historical archive certificate. The completed run [#44806001549](https://github.com/smvastrorajaram-hub/smvastroservices/actions/runs/44806001549) passed all **3,000 / 3,000** exact-epoch comparisons under the predeclared 5-arcsecond maximum gate:

- Maximum absolute tropical apparent residual: **0.0085239654″**.
- RMS residual: **0.0013143326″**.
- Mercury: max 0.0059714356″; Venus: 0.0085239654″; Mars: 0.0056769214″; Jupiter: 0.0040623978″; Saturn: 0.0040692335″.
- The six DE440 century binaries (1800, 1900, 2000, 2100, 2200, 2300) passed exact byte-length and SHA-256 manifest checks.
- The updated full 600-chart / 3,000-longitude artifact is [artifact #14662204322](https://github.com/smvastrorajaram-hub/smvastroservices/actions/runs/44806001549/artifacts/14662204322).

This PASS is a **modern DE440-vs-Swiss numerical parity** check at the exact sampled instants. It is not an independent historical printed-table oracle, does not certify the Sūrya-Siddhānta four-pass True Longitude model, and leaves every ordinary natal chart `classicalCertified:false`.

### Classical Saura Mean / True / Sheeghroccheya — same-epoch, same-frame chain PASS

The new research regression reuses the exact same deterministic 600 DOB/time/place records (one for each year 1800–2399) and verifies five planets at each birth epoch. For all **3,000** rows, it independently recomputes:

- Bīja-corrected Mean longitude from Burgess/Bentley corrected Mahāyuga revolutions.
- Mandocca from Sūrya-Siddhānta I.41–42 apsis revolution counts and I.57–58 Kali-epoch locations.
- Sheeghroccheya from the BPHS/Uttara Kalamrita inner/outer-planet selector applied to the same Bīja Mean model.
- Four-pass True longitude using Sūrya-Siddhānta II.39–45 and the declared `verse39-direct-jya` Manda convention.
- BPHS Chesta Kendra / Virupa from those same-model Mean, True and Sheeghroccheya values.

Each calculation uses the exact record `julianDayUT`, and every classical input declares the common `traditional-Saura-nirayana` frame. The regression checks all 3,000 rows and recomputes BPHS Chesta independently from the returned three inputs. The modern DE440 True-longitude test is now separate: it no longer feeds a modern apparent longitude into a classical Chesta result using a different classical mean/Sheeghroccheya selector.

**Result:** 600/600 exact natal epochs and 3,000/3,000 classical same-epoch/same-frame input chains PASS. This proves the current research model is internally coherent across the selected epochs; it is not an independent printed historical astronomical oracle, so historical-oracle coverage remains 0 and all natal `classicalCertified` flags remain false.

#### Secondary 24-Jya table interpolation comparison

The printed 24-Jya implementation was also run with identical inputs alongside the continuous trigonometric four-pass implementation. This is an implementation diagnostic, not an independent source observation:

- 3,000 comparisons; RMS difference **0.0090840551°**.
- 2,999 rows are within the 0.05° diagnostic threshold.
- One Venus row (1875-01-12, Kochi) is **0.0532318994°** different, slightly over the 0.05° threshold.
- Therefore `tabularNumericalGatePass:false` is retained. The difference is not removed by widening the threshold or planet-specific tuning.

Full row-level results are included in the 600-chart artifact; the chain remains research-only.
## Phase 2 — 42 Bala source rows

Ledger: `shadbala-source-evidence-42.json`.

| Status | Count |
|---|---:|
| Direct source-example matches | 36 |
| Component values adjudicated for the 1918 example only | 3 |
| Luminary Chesta source ellipses / N/A | 2 |
| Open component-level source discrepancy (Jupiter Drik) | 1 |
| **Total rows** | **42** |

Source sections of B.V. Raman, *Graha and Bhava Balas*, 13th ed.:
- Sthana: Ch.III §§18–40, pp.11–29.
- Dig: Ch.IV §§43–45, pp.30–33.
- Kala: Ch.V §§46–78, pp.34–63.
- Cheshta: Ch.VI §§99–107, pp.72–79.
- Naisargika: Ch.VII §108, pp.80–81.
- Drik: Ch.VIII §§109–120, pp.82–88.

### Primary-page review of the seven printed discrepancies

The 13th-edition page images were rechecked directly ([full scanned book](https://astrojyotish.info/pdf/graha-bhava-balas.pdf)); no values were silently overwritten.

| Item | Printed evidence | Arithmetic / source disposition |
|---|---|---|
| Mercury Dig | Example 14 p.32: 63°05′; Example 15 p.33 and summary p.90: 21.09 | 63°05′ ÷ 3 = 21.02778 Virupas (~21.03). The exact 1918 input engine returns 21.025. **Adjudicated:** 21.09 is a printed arithmetic error; preserve it as printed, use ~21.03 only for formula-derived reconstruction of this example. |
| Saturn Chesta | §104 p.77: 151.23°; Example 49 p.78: 181.23°; final Chesta 21.14 | 181.23° − (111.23° + 124.39°)/2 = 63.42°; reduced Kendra / 3 = 21.14. **181.23° is the evidenced input for this 1918 worked example**; the §104 table cell remains a source typo. |
| Saturn Naisargika | Chapter VII table and Example 52 p.81: 8.57; summary p.90: 8.37 | The summary total 389.21 recomposes with 8.57, not 8.37. **Use 8.57 for this example**; 8.37 is a summary typo. |
| Jupiter Drik | Example 54 p.88 net Pinda −64.14; Example 55 p.88 Drik −16.04; summary p.90 −16.03 | The p.88 individual signed aspects add to −64.14, but printed Subha +30.79 and Asubha −94.23 sum to −63.44; −94.93 would be needed to reconcile the net. Exact-input engine: Pinda −64.096 / Drik −16.024. **Open detail + rounding conflict**; retain both source and engine results. |
| Sun total | Summary p.89: total 424.24; Rupa 7.08 | Displayed components sum to 424.94; 424.94/60 = 7.0823, matching 7.08. **424.24 is a total typo**. |
| Mars Kala | Example 35 p.62: 30.060; summary p.89: 33.06 | 11.68 + 16.54 + 1.84 = 30.06; total 298.14 / Rupa 4.97 also reconcile with 30.06. **Use 30.06 for the example**; 33.06 is a summary typo. |
| Mercury Rupa | Summary p.90: total 537.02; Rupa 8.85 | 537.02/60 = 8.95033..., which rounds to 8.95. **8.85 is a Rupa typo**. |

The machine-readable shadbala-source-evidence-42.json retains all seven printed issues, page locators, classification and disposition. Of the four component-level conflicts first identified, Mercury Dig is adjudicated as a formula/print arithmetic error for the 1918 example; Saturn Chesta and Saturn Naisargika are adjudicated from the worked example and total recomposition. Jupiter Drik is now the sole open component-level discrepancy. The other three are final-summary arithmetic typos. These are findings about one 1918 printed worked horoscope, not independent evidence for arbitrary natal birth dates.

**Phase 2 verdict:** all 42 rows are enumerated: 36 direct source-example matches, three components adjudicated for the 1918 example only (Mercury Dig formula error plus two Saturn source-table corrections), two luminary Chesta N/A and one open component discrepancy (Jupiter Drik). These rows apply to one 1918 horoscope, not arbitrary natal dates, and are not inserted into the per-natal certification gate.

## Final integrated CI after PAC / Shadbala evidence corrections

The latest PR head commit `82681f14b01da0f6d5f28158e8bbaea8cf74e8fa` passed the complete research workflow:

- [Actions run #44806565994 — SUCCESS](https://github.com/smvastrorajaram-hub/smvastroservices/actions/runs/44806565994).
- All 19 job steps completed successfully, including the existing B.V. Raman regressions, the Government PAC 2026 evidence-ledger assertions, seven printed Shadbala discrepancy assertions, 600 annual random charts, and 3,000 exact-natal-epoch DE440 comparisons.
- Latest consolidated research artifact: [artifact #14664255587](https://github.com/smvastrorajaram-hub/smvastroservices/actions/runs/44806565994/artifacts/14664255587) (600 DOB/time/place records, 25,200 six-Bala values, 3,000 DE440 exact-epoch comparisons).

This CI PASS confirms the research code and evidence ledger regressions. It does not elevate the incomplete classical historical longitude or per-natal six-Bala source evidence into a universal certificate.

## Automated gate

`tests/natal-classical-remaining-evidence-audit.mjs` checks all 15 longitude rows, 42 Bala rows, unique graha/component keys, sources, explicit discrepancy statuses, annual coverage and that generic `classicalCertified` remains false.

Primary references:
- [Burgess, Translation of the Sūrya-Siddhānta (1860)](https://classicalastrologer.com/wp-content/uploads/2018/04/surya_siddhanta_english.pdf), pp.164–165 and II.39–45.
- [B.V. Raman, *Graha and Bhava Balas*, 13th ed. PDF](https://astrojyotish.info/pdf/graha-bhava-balas.pdf).
- [Recognised-text copy](https://astrojyotish.info/pdf/txt/graha-bhava-balas.txt).
- [IMD PAC — Indian Astronomical Ephemeris](https://mausam.imd.gov.in/imd_latest/contents/indian_astronomical_ephemeris.php).

**Final:** ordinary 1800–2399 natal charts remain `classicalCertified:false`; no incomplete archive or single worked example is promoted into a universal certificate.
