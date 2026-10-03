# SMV ASTRO V130 — FINAL STRICT OFFLINE AUDIT

Audit date: 2026-10-02

## Final result

**PASS — source/runtime audit.** 100/100 horoscope calculations and 100/100 marriage-pair calculations completed without calculation/runtime errors in the bundled offline engine.

> Scope note: this automated audit executes the same bundled browser/offline calculation modules and Swiss Ephemeris WASM/data from the assembled V130 source. It is not a remote Android-device Flight Mode automation. The user has separately confirmed V130 is now working in the deployed browser.

## Effective source tested

- Full source: `SMV ASTRO 02102026-1840.zip`
- Strict offline runtime overlay retained
- Latest V130 overlay: `index.html`, `marriage-matching.js`, `sw.js`, `pwa.js`

## Architecture/source audit

| Check | Result |
|---|---|
| Horoscope calculation uses bundled offline engine | PASS |
| Advanced Analysis returned | PASS |
| Dasa/Phase-4 returned | PASS |
| Transit returned | PASS |
| Panchang returned | PASS |
| Swiss Ephemeris `.wasm` + `.data` present | PASS |
| Offline India place manifest/shards present | PASS |
| Horoscope/Marriage `/api/horoscope/*` dependency | PASS — none found |
| `/api/geocode` dependency | PASS — none found |
| Razorpay/onrender dependency in Horoscope runtime | PASS — none found |
| Login/Register/Logout online auth retained | PASS — by design |
| `NUM_LET`, `NUM_PLAN`, `NUM_FRIEND` runtime source present | PASS |
| Combined Rahu/Ketu & Naga/Sarpa heading pattern | PASS — zero source matches |
| Rahu/Ketu, Naga/Sarpa, Kala Sarpa remain separate report sections | PASS |
| Service Worker V130 cache generation | PASS |
| Old `smv-horoscope-*` caches deleted on activate | PASS |
| `updateViaCache: none` + explicit SW update | PASS |
| JS syntax: marriage/pwa/sw/horoscope-form | PASS |

## 100 Horoscope runtime test

- Total: **100/100 PASS**
- English: **50/50 PASS**
- Tamil: **50/50 PASS**
- Every passing case returned: 9+ planets, Advanced Analysis, Dasa, Transit and Birth Panchang.

## 100 Marriage-pair runtime test

- Total: **100/100 PASS**
- English-name/report cases: **50/50 PASS**
- Tamil-name/report cases: **50/50 PASS**
- MATCH: **46**
- CONSULTATION NEEDED: **30**
- NO MATCH: **24**
- Runtime errors: **0**

### Pair results

| Pair | Lang | Porutham | Verdict | Kala Sarpa B/G | Naga B/G |
|---:|:---:|---:|---|---|---|
| 01 | EN | 5/10 | NO MATCH | partial / none | No / No |
| 02 | EN | 7/10 | MATCH | full / partial | No / Yes |
| 03 | EN | 6/10 | NO MATCH | partial / none | Yes / Yes |
| 04 | EN | 4/10 | MATCH | none / none | No / No |
| 05 | EN | 6/10 | CONSULTATION | none / none | No / Yes |
| 06 | EN | 6/10 | MATCH | none / none | No / Yes |
| 07 | EN | 5/10 | CONSULTATION | full / none | Yes / No |
| 08 | EN | 10/10 | NO MATCH | partial / none | Yes / Yes |
| 09 | EN | 7/10 | MATCH | partial / none | No / Yes |
| 10 | EN | 6/10 | NO MATCH | none / none | Yes / Yes |
| 11 | EN | 6/10 | CONSULTATION | boundary / partial | Yes / Yes |
| 12 | EN | 7/10 | NO MATCH | full / partial | Yes / No |
| 13 | EN | 4/10 | CONSULTATION | none / boundary | Yes / Yes |
| 14 | EN | 6/10 | NO MATCH | none / none | No / No |
| 15 | EN | 8/10 | NO MATCH | none / full | Yes / Yes |
| 16 | EN | 6/10 | MATCH | partial / none | Yes / No |
| 17 | EN | 8/10 | MATCH | full / partial | Yes / Yes |
| 18 | EN | 6/10 | MATCH | none / none | No / Yes |
| 19 | EN | 6/10 | MATCH | none / full | No / No |
| 20 | EN | 7/10 | NO MATCH | none / none | Yes / Yes |
| 21 | EN | 7/10 | CONSULTATION | partial / none | Yes / No |
| 22 | EN | 4/10 | CONSULTATION | none / boundary | Yes / Yes |
| 23 | EN | 5/10 | MATCH | none / none | No / No |
| 24 | EN | 6/10 | CONSULTATION | partial / partial | No / Yes |
| 25 | EN | 7/10 | NO MATCH | partial / boundary | Yes / Yes |
| 26 | EN | 6/10 | MATCH | partial / none | Yes / Yes |
| 27 | EN | 5/10 | NO MATCH | none / partial | Yes / No |
| 28 | EN | 7/10 | NO MATCH | none / partial | Yes / Yes |
| 29 | EN | 7/10 | CONSULTATION | partial / none | Yes / Yes |
| 30 | EN | 6/10 | MATCH | none / full | Yes / Yes |
| 31 | EN | 6/10 | MATCH | partial / partial | No / No |
| 32 | EN | 4/10 | NO MATCH | boundary / partial | Yes / No |
| 33 | EN | 7/10 | CONSULTATION | none / none | Yes / Yes |
| 34 | EN | 5/10 | MATCH | partial / full | Yes / No |
| 35 | EN | 7/10 | MATCH | none / full | No / No |
| 36 | EN | 4/10 | NO MATCH | none / partial | No / No |
| 37 | EN | 6/10 | MATCH | none / partial | No / Yes |
| 38 | EN | 6/10 | CONSULTATION | none / none | Yes / No |
| 39 | EN | 5/10 | CONSULTATION | none / none | Yes / Yes |
| 40 | EN | 9/10 | CONSULTATION | full / none | No / No |
| 41 | EN | 6/10 | MATCH | partial / none | No / No |
| 42 | EN | 7/10 | NO MATCH | none / partial | Yes / No |
| 43 | EN | 5/10 | MATCH | partial / partial | Yes / Yes |
| 44 | EN | 7/10 | MATCH | none / none | No / Yes |
| 45 | EN | 6/10 | NO MATCH | full / none | No / Yes |
| 46 | EN | 8/10 | MATCH | partial / partial | No / Yes |
| 47 | EN | 7/10 | NO MATCH | none / none | Yes / No |
| 48 | EN | 9/10 | MATCH | boundary / partial | Yes / Yes |
| 49 | EN | 8/10 | CONSULTATION | none / full | Yes / Yes |
| 50 | EN | 8/10 | CONSULTATION | full / full | Yes / Yes |
| 51 | TA | 6/10 | MATCH | none / partial | Yes / Yes |
| 52 | TA | 5/10 | MATCH | none / partial | No / No |
| 53 | TA | 6/10 | CONSULTATION | none / none | Yes / Yes |
| 54 | TA | 7/10 | MATCH | partial / none | Yes / Yes |
| 55 | TA | 6/10 | MATCH | partial / none | No / Yes |
| 56 | TA | 8/10 | MATCH | none / partial | Yes / Yes |
| 57 | TA | 7/10 | MATCH | none / none | No / Yes |
| 58 | TA | 6/10 | CONSULTATION | none / none | Yes / Yes |
| 59 | TA | 5/10 | NO MATCH | partial / none | Yes / Yes |
| 60 | TA | 6/10 | CONSULTATION | partial / partial | No / Yes |
| 61 | TA | 8/10 | MATCH | none / none | No / No |
| 62 | TA | 6/10 | MATCH | full / none | No / Yes |
| 63 | TA | 7/10 | NO MATCH | none / none | Yes / Yes |
| 64 | TA | 8/10 | CONSULTATION | partial / partial | Yes / No |
| 65 | TA | 6/10 | MATCH | none / full | No / No |
| 66 | TA | 7/10 | MATCH | none / none | No / Yes |
| 67 | TA | 6/10 | MATCH | partial / partial | No / No |
| 68 | TA | 7/10 | MATCH | none / none | Yes / No |
| 69 | TA | 6/10 | MATCH | none / none | Yes / No |
| 70 | TA | 7/10 | MATCH | none / none | Yes / Yes |
| 71 | TA | 6/10 | MATCH | partial / partial | No / Yes |
| 72 | TA | 6/10 | MATCH | partial / none | No / No |
| 73 | TA | 6/10 | CONSULTATION | none / none | Yes / Yes |
| 74 | TA | 7/10 | MATCH | none / none | Yes / Yes |
| 75 | TA | 4/10 | MATCH | none / full | Yes / Yes |
| 76 | TA | 7/10 | CONSULTATION | partial / none | No / Yes |
| 77 | TA | 7/10 | MATCH | partial / none | Yes / No |
| 78 | TA | 7/10 | CONSULTATION | none / none | Yes / Yes |
| 79 | TA | 6/10 | MATCH | partial / partial | No / No |
| 80 | TA | 4/10 | CONSULTATION | none / partial | Yes / No |
| 81 | TA | 4/10 | MATCH | none / none | Yes / Yes |
| 82 | TA | 5/10 | NO MATCH | full / none | Yes / Yes |
| 83 | TA | 8/10 | CONSULTATION | none / none | No / No |
| 84 | TA | 5/10 | CONSULTATION | none / none | No / Yes |
| 85 | TA | 4/10 | MATCH | none / none | Yes / No |
| 86 | TA | 5/10 | NO MATCH | none / partial | Yes / Yes |
| 87 | TA | 6/10 | MATCH | none / none | Yes / No |
| 88 | TA | 8/10 | MATCH | none / none | No / Yes |
| 89 | TA | 7/10 | CONSULTATION | none / none | Yes / Yes |
| 90 | TA | 7/10 | CONSULTATION | none / none | No / Yes |
| 91 | TA | 5/10 | NO MATCH | none / none | Yes / Yes |
| 92 | TA | 5/10 | NO MATCH | none / none | Yes / Yes |
| 93 | TA | 4/10 | CONSULTATION | none / none | Yes / Yes |
| 94 | TA | 4/10 | NO MATCH | none / none | Yes / No |
| 95 | TA | 6/10 | CONSULTATION | none / partial | Yes / No |
| 96 | TA | 6/10 | NO MATCH | none / partial | No / No |
| 97 | TA | 4/10 | MATCH | none / none | Yes / Yes |
| 98 | TA | 6/10 | CONSULTATION | none / none | Yes / Yes |
| 99 | TA | 6/10 | MATCH | partial / none | Yes / Yes |
| 100 | TA | 8/10 | CONSULTATION | none / none | Yes / No |

## PWA/assets audit

- `smvlogo.png`: present and non-empty.
- 192×192 icon asset: present and non-empty.
- 512×512 icon asset: present and non-empty.
- maskable 512 icon: present and non-empty.
- desktop/mobile hero assets: present and non-empty.
- Swiss WASM/data: present and non-empty.
- `sw.js` precaches `marriage-matching.js` and the Horoscope runtime; V130 changes the SW URL/version so stale V129 JS is not intentionally reused.

## Final classification

**SMV ASTRO V130 automated source + bundled offline runtime audit: PASS.**

No calculation/runtime error occurred in the 100 horoscope + 100 pair batch. The earlier `NUM_LET is not defined` regression is not reproduced in this assembled V130 runtime audit.

Physical-device Flight Mode remains a device-level acceptance test rather than something this container can press/toggle on the user’s Android phone. Because the user has confirmed V130 is now working in the deployed browser, this report records the automated source/runtime portion as PASS without pretending to have controlled the phone’s radio state.
