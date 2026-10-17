# SMV ASTRO — Uttara Kālamṛta ONLY Shadbala research path (Ayurdhaya excluded)

**Source-of-formula decision:** Kalidasa, *Uttara Kālamṛta*, Khanda I, **Section II**, V. Subrahmanya Sastri (1939) English edition, [open facsimile transcription PDF, pp. 7–13](https://indian-vedic-astrology.com/classic/uttara%20kalamritam.pdf). All Shadbala *rules* for this new channel must derive from that section alone, not from the existing BPHS Phase3 algorithms.

**Functional scope:** create a separate `strengthUttaraKalamrita` field per Sun, Moon, Mars, Mercury, Jupiter, Venus and Saturn. Preserve existing `strength3` and Horoscope/Matching customer output until all independently cross-checked components are reliable. Never invent any missing planetary longitude. No Section III `Ayurdaya`, no lifespan estimate, no mortality prediction.

## Rule-by-rule implementation

| UK rule | PDF location (0-index page) | Source-specific intermediate output | Check |
|---|---|---|---|
| Compound friendship, 7 sign rulers, Mūlatrikona, exaltation, own; retro/exception | pp. 7–8; UK II 2–6½ | grade and Virupa for Rāśi and varga owner | Check 60,45,30,22.5,15,7.5,3.75,1.875 ladder. Retro in exaltation sign returns the documented inverse-grade special case. |
| Hora, Drekkāṇa, Saptāṁśa, Navāṁśa, Dvādaśāṁśa, Triṁśāṁśa | pp. 8–9; UK II 6½–8½ | Seven varga sign/lord/grade arrays | **UK author's explicitly preferred 1st/12th/11th Drekkāṇa**, *not* default 1st/5th/9th from another source. |
| Saptavargaja | p. 9; UK II 8½–9½ | Seven *individual* Virupa entries | Rāśi = full dignity grade; other six = HALF of their sign-lord grades. All **seven published numeric example totals** reconciled: 1.5625, 1.25, 1.9375, 1.375, 2.25, 1.4375, 1.625 Rupa. Printed truncated fractional rows are interpreted to meet their own printed exact totals; do not silently quote a rounded row as exact. |
| Uccha, Kendra/Panaphara/Apoklima, Ojayugma, Drekkāṇa | pp. 9–10; UK II 9½–11½ | Five individual Sthāna components | Uccha 0–60; Kendradi 60/30/15; Rāśi+Navāṁśa parity 0/15/30; male/female/neutral Drekkāṇa 0/15. |
| Dig Bala | p. 10; UK II 11½–12½ | Ideal cardinal bhāva, aspect angle, Virupa | Sun/Mars 10, Moon/Venus 4, Mercury/Jupiter 1, Saturn 7. Need separately certified input cusp to certify a natal Dig result. |
| Pakṣa, Tribhāga, Natonnata, Abda/Māsa/Vāra/Horā, Ayana | pp. 10–11; UK II 12½–17½ | **Eight named Kala sub-balā** plus whole Kala (or null) | UK Mercury has **Unnata** diurnal category rather than old flat-60 Nato model. Abda/Masa/Vara/Hora owner points = 15/30/45/60. **UK alone here gives Ayana directional rules but not an independently calibrated complete numeric declination-to-Virupa ephemeris**, so `ayana` and Kala total remain null on live charts; do NOT insert a BPHS numeric value silently. |
| Five planet Cheshta | p. 11; UK II 16½–17½ | `mean`, `true`, `Śīghrocca`, midpoint, kendra, Virupa | Do **not** use speed bins. If independently documented same-frame triplets for the natal date are missing, `cheshta.virupa` and full UK Shadbala remain **null**. Sun/Moon Cheshta convention likewise requires a declared source; never silently import old engine's rule into the UK channel. |
| Sphuṭa/Drig | pp. 11–12; UK II 17½–19½ | Six per-recipient aspect angles, base/special Virupa, benefic/malefic signed terms | UK full algebraic sum, **not** the previous BPHS quarter-every-aspect-plus-Mercury/Jupiter variant. Independent exact breakpoint checks added. Full arbitrary-date astronomical coordinate verification still pending. |
| Naisargika | p. 12; UK II 19½–20½ | Exact Virupa fractions | Sun 60, Moon 360/7, Venus 300/7, Jupiter 240/7, Mercury 180/7, Mars 120/7, Saturn 60/7. |
| UK graha-yuddha and total | p. 12; UK II 20½–22½ | UK north-wins +/-60 Virupa, total with signed Drig and all other parts | Keep Yuddha OUTSIDE the Kala intermediate sum; reject unresolvable latitude/overlapping wars. Total only when every term and its source is resolved. UK p.41 disc-diameter commentary conflicts with p.45 one-Rupa summary: keep convention disclosed. |
| Ayurdaya | **Section III p.13 onwards** | **not implemented** | Intentionally deferred until later user authorization. |

## Code / numerical evidence

- **New UK-only source:** `public/horoscope/offline/uttara-kalamrita-six-bala.browser.mjs` with explicit fail-closed whole scores.
- UK planetary war pre-existing source (UK p.45): `public/horoscope/offline/uttara-kalamrita-shadbala.browser.mjs`.
- Live chart integration: `public/horoscope/offline/swiss_vedic.browser.mjs` adds **parallel** `strengthUttaraKalamrita` per seven grahas; does **not** change `strength3` or its customer presentation.
- Seven independent **printed** Saptavargaja example total fixtures and all six category functions: `tests/uttara-kalamrita-only-six-bala-book-oracle.mjs`.
- Five actual Perambalur births × seven grahas = **35** chart-level UK intermediate groups, with Sthana parts, seven varga positions, Kala pending, six Drig aspects, UK natural fractions and missing Cheshta: `tests/uttara-kalamrita-five-natal-intermediate-integration.mjs`.
- Source-isolated CI: `.github/workflows/uttara-kalamrita-only-shadbala-qa.yml`.

## What is and is not certified

**Verified/book arithmetic:** Seven printed Saptavarga worked-example totals, the UK-specific point ladder, seven Naisargika fractions, UK-vs-older Sthana distinction, six aspect entries per recipient, signed summation, and 35 actual chart research integrations.

**Not yet independently verified:** The correct historical sidereal orbital inputs for every natal date; UK-only numeric Ayanabala calibration, complete correct Natonnata/Paksha/Tribhaga and other time intermediate reference oracles at natal epochs; independent external sign/dignity and signed Drig cross-checks of every chart; source interpretation of Graha Yuddha ambiguity; seven full UK Shadbala totals.

Therefore `classicalCertified:false`, `totalVirupa:null` whenever evidence is missing, and **NO FINAL SHADBALA CERTIFICATE**. No main merge until the whole UK numerical source chain has a credible independent evidence set.

**Future-only:** User specified Ayurdhaya as a later step. No Ayurdhaya equations have been added to this module or tests.
