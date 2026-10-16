# V360 — P.V.R. Narasimha Rao Shodhana source-level crosscheck

**User-supplied source:** `vedic_astro_textbook.pdf`, P. V. R. Narasimha Rao, *Vedic Astrology: An Integrated Approach*, §12.7, **book pp. 157–160, PDF pp. 169–172**. The preface cautions that parts of this 2000 book were refined after publication (PDF p. 1). We therefore distinguish a tested published algorithm from absolute classical consensus.

**Baseline examined:** `main` SHA `866c3327b58f63eabcea4c567578b8d882af2c98`, advanced `classical-shodhana.browser.mjs`. All changes on branch `audit/v360-pvr-shodhana-book-crosscheck`; no PDF, UI, PWA, GeoNames, DST, Admin/Login, Payment or Print modifications.

## Book-to-source verdict

| Book chapter | User book's literal rule | Before patch | After patch |
|---|---|---|---|
| §12.7.1 Trikona | if any trine bindu 0, unchanged; else subtract minimum of Aries/Leo/Sag, Taurus/Virgo/Cap, Gemini/Libra/Aqu, Cancer/Scorpio/Pisces | MATCH | unchanged |
| §12.7.2 Ekadhipatya (no bindu in one sign) | if either owned sign 0 -> no change | MATCH | unchanged |
| Both owned signs have planets | no reduction | MATCH | unchanged |
| One occupied, empty sign smaller | set empty count to 0 | MATCH | unchanged |
| **One occupied, empty sign greater** | **REPLACE larger empty value with value of occupied sign (NOT subtract)** | **FAIL: previous `empty - occupied`** | FIXED: `empty = occupied` |
| Both owned signs empty and equal | both become 0 | MATCH | unchanged |
| Both owned signs empty and unequal | both become minimum | MATCH | unchanged |
| One occupied, both counts equal | **not specified explicitly** in §12.7.2 | existing convention zero | retained, not certified |
| §12.7.3 Rasi Pinda | use 12 Rasi multipliers [7,10,8,4,10,6,7,8,9,5,11,12] | MATCH | unchanged |
| §12.7.3 Graha Pinda | Sun=5 Moon=5 Mars=8 Mercury=5 Jupiter=10 Venus=7 Saturn=5 | MATCH | unchanged |

**Numerically discriminating counterexample:** Rishabha (Taurus) EMPTY=5; Thula (Libra) OCCUPIED=2. PVR rule 3(b) yields (Taurus,Libra)=(2,2); old implementation incorrectly yielded (3,2).

## Independent book samples
- PVR Example 40, Mercury raw BAV `[7,4,7,4,4,3,4,4,4,3,6,4]` -> Trikona-reduced `[3,1,3,0,0,0,0,0,0,0,2,0]`.
- Example 41, all Ekadhipatya co-owned pairs include a zero -> the reduced Mercury BAV remains unchanged.
- Example 42 (a–e), Venus Taurus/Libra occupancy cases -> (4,2), (4,0), (2,2), (2,2), (0,0).
- Example 43, Mercury's SoAV: Rasi Pinda **77** and Graha Pinda **75**, total **Sodhya Pinda 152**. All arithmetic is asserted from the PDF's numbered example.
- New `tests/v360-pvr-shodhana-textbook-regression.mjs` also enumerates all 5 co-owned pairs, all positive bindu levels 1..8 and both/none/one occupied cases where the book states a rule; tests nonmutation and full end-to-end composition. Existing `tests/v357-bphs-shodhana-regression.mjs` previously enforced subtracting the occupied value (1,3 -> 1,2); corrected to replacement (1,3 -> 1,1).

## Explicit limitations
- BPHS II (Santhanam) Chapter 68 printed diagram/prose conflict remains recorded. The PVR §12.7.2 prose gives an independent, clear algorithm consistent with the implemented literal co-owned-pair rule; it **does not retroactively reconcile** the other book's inconsistent diagram.
- PVR §12.8 warns of three differences between Parasara and Varahamihira in Moon and Venus BAV tables, which can affect resulting Shodhya Pindas. This audit tests the **Parasara** book convention; no other school silently substituted.
- Full chart predictions from Shodhya Pinda or empirical real-life event accuracy are **not** verified. The standalone classical Shodhana module remains disconnected from Horoscope and Marriage Matching report generators.
- No published code or production claim should mark complete interpretive certification solely because numeric tests pass.

## CI acceptance
Pending current branch's pull-request CI execution. Treat source-level PASS only after the new textbook regression and all pre-existing source, layout, DST, matching and five-chart tests complete successfully.
