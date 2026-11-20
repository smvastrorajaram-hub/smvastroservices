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

### IENA / IAE archival editions

Bibliographic candidates were identified for 1971 and 1974 *Indian Ephemeris and Nautical Almanac*, 1992 and 2015 *Indian Astronomical Ephemeris*, and a 1994 library catalogue record. Official IMD PAC describes the modern IAE reference epoch as J2000.5 and ephemeris argument as TT. The actual daily planetary table pages from these editions were not downloaded and transcribed in this run; they are not numerical PASS evidence.

**Phase 1 verdict:** mean source-anchor limited PASS; True longitude PARTIAL / modern accuracy FAIL; Sheeghroccheya PARTIAL with Saturn conflict. No historical-longitude certificate is issued.

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
