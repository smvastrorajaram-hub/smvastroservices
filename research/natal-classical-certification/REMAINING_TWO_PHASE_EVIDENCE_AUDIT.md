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

This is a distinct modern numerical parity test. The outputs are additionally transferred into the declared Burgess-1860 Saura frame to exercise the BPHS Chesta input geometry with the already audited Saura mean/Sheeghroccheya selector. The test does not change the historical Sūrya-Siddhānta True Longitude output and does not turn modern DE440 parity into a historical archive certificate. Exact residual statistics are recorded in the uploaded 600-chart artifact after Actions completes.

## Phase 2 — 42 Bala source rows

Ledger: `shadbala-source-evidence-42.json`.

| Status | Count |
|---|---:|
| Source-example rows matched | 36 |
| Luminary Chesta source ellipses / N/A | 2 |
| Component-level source discrepancies | 4 |
| **Total rows** | **42** |

Source sections of B.V. Raman, *Graha and Bhava Balas*, 13th ed.:
- Sthana: Ch.III §§18–40, pp.11–29.
- Dig: Ch.IV §§43–45, pp.30–33.
- Kala: Ch.V §§46–78, pp.34–63.
- Cheshta: Ch.VI §§99–107, pp.72–79.
- Naisargika: Ch.VII §108, pp.80–81.
- Drik: Ch.VIII §§109–120, pp.82–88.

Errata retained: Mercury Dig 63°05′ / 3 versus 21.09; Saturn Sheeghroccheya 151.23° versus 181.23°; Saturn Naisargika 8.57 versus 8.37 in final summary; Jupiter Drik −16.04 versus −16.03; Sun total 424.24 versus component sum 424.94; Mars Kala summary 33.06 versus detailed 30.06; Mercury Rupa 537.02/60 = 8.9503 versus 8.85.

**Phase 2 verdict:** all 42 source-example rows enumerated; 36 chapter-example matches, two luminary Chesta N/A and four component-level source conflicts. These rows apply to one 1918 horoscope, not arbitrary natal dates, and are not inserted into the per-natal certification gate.

## Automated gate

`tests/natal-classical-remaining-evidence-audit.mjs` checks all 15 longitude rows, 42 Bala rows, unique graha/component keys, sources, explicit discrepancy statuses, annual coverage and that generic `classicalCertified` remains false.

Primary references:
- [Burgess, Translation of the Sūrya-Siddhānta (1860)](https://classicalastrologer.com/wp-content/uploads/2018/04/surya_siddhanta_english.pdf), pp.164–165 and II.39–45.
- [B.V. Raman, *Graha and Bhava Balas*, 13th ed. PDF](https://astrojyotish.info/pdf/graha-bhava-balas.pdf).
- [Recognised-text copy](https://astrojyotish.info/pdf/txt/graha-bhava-balas.txt).
- [IMD PAC — Indian Astronomical Ephemeris](https://mausam.imd.gov.in/imd_latest/contents/indian_astronomical_ephemeris.php).

**Final:** ordinary 1800–2399 natal charts remain `classicalCertified:false`; no incomplete archive or single worked example is promoted into a universal certificate.
