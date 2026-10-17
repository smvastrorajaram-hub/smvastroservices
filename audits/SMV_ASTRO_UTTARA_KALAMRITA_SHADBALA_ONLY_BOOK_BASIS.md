# SMV ASTRO — Uttara Kālamṛta ONLY Shadbala research path (Ayurdhaya excluded)

**Source-of-formula decision:** Kalidasa, *Uttara Kālamṛta*, Khanda I, **Section II**, V. Subrahmanya Sastri (1939) English edition, [open facsimile transcription PDF, pp. 7–13](https://indian-vedic-astrology.com/classic/uttara%20kalamritam.pdf). All Shadbala *rules* for this new channel must derive from that section alone, not from the existing BPHS Phase3 algorithms.

**Functional scope:** create a separate `strengthUttaraKalamrita` field per Sun, Moon, Mars, Mercury, Jupiter, Venus and Saturn. Preserve existing `strength3` and Horoscope/Matching customer output until all independently cross-checked components are reliable. Never invent any missing planetary longitude. Section III `Ayurdaya` pure-math research module now exists separately; no lifespan estimate or mortality prediction is published.

## Rule-by-rule implementation

| UK rule | PDF location (0-index page) | Source-specific intermediate output | Check |
|---|---|---|---|
| Compound friendship, 7 sign rulers, Mūlatrikona, exaltation, own; retro/exception | pp. 7–8; UK II 2–6½ | grade and Virupa for Rāśi and varga owner | Check 60,45,30,22.5,15,7.5,3.75,1.875 ladder. Retro in exaltation sign returns the documented inverse-grade special case. |
| Hora, Drekkāṇa, Saptāṁśa, Navāṁśa, Dvādaśāṁśa, Triṁśāṁśa | pp. 8–9; UK II 6½–8½ | Seven varga sign/lord/grade arrays | **UK author's explicitly preferred 1st/12th/11th Drekkāṇa**, *not* default 1st/5th/9th from another source. |
| Saptavargaja | p. 9; UK II 8½–9½ | Seven *individual* Virupa entries | Rāśi = full dignity grade; other six = HALF of their sign-lord grades. The publisher's seven TOTAL cells are 1.5625, 1.25, 1.9375, 1.375, 2.25, 1.4375, 1.625 Rupa. However exact LITERAL row sums match six totals only within normal 0.003 Rupa truncation: for Jupiter the text PRINTS Drekkana .157 and its literal row sums **2.218**, yet the printed total says **2.25**, a substantive **0.032 Rupa conflict**. Do not silently replace the printed .157 with an invented value in a numerical certificate. |
| Uccha, Kendra/Panaphara/Apoklima, Ojayugma, Drekkāṇa | pp. 9–10; UK II 9½–11½ | Five individual Sthāna components | Uccha 0–60; Kendradi 60/30/15; Rāśi+Navāṁśa parity 0/15/30; male/female/neutral Drekkāṇa 0/15. |
| Dig Bala | p. 10; UK II 11½–12½ | Ideal cardinal bhāva, aspect angle, Virupa | Sun/Mars 10, Moon/Venus 4, Mercury/Jupiter 1, Saturn 7. Need separately certified input cusp to certify a natal Dig result. |
| Pakṣa, Tribhāga, Natonnata, Abda/Māsa/Vāra/Horā, Ayana | pp. 10–11; UK II 12½–17½ | **Eight named Kala sub-balā** plus whole Kala (or null) | UK Mercury has **Unnata** diurnal category rather than old flat-60 Nato model. Abda/Masa/Vara/Hora owner points = 15/30/45/60. **UK alone here gives Ayana directional rules but not an independently calibrated complete numeric declination-to-Virupa ephemeris**, so `ayana` and Kala total remain null on live charts; do NOT insert a BPHS numeric value silently. |
| Five planet Cheshta | p. 11; UK II 16½–17½ | `mean`, `true`, `Śīghrocca`, midpoint, kendra, Virupa | Do **not** use speed bins. If independently documented same-frame triplets for the natal date are missing, `cheshta.virupa` and full UK Shadbala remain **null**. Sun/Moon Cheshta convention likewise requires a declared source; never silently import old engine's rule into the UK channel. |
| Sphuṭa/Drig | pp. 11–12; UK II 17½–19½ | Six per-recipient aspect angles, base/special Virupa, benefic/malefic signed terms | UK full algebraic sum, **not** the previous BPHS quarter-every-aspect-plus-Mercury/Jupiter variant. Independent exact breakpoint checks added. Full arbitrary-date astronomical coordinate verification still pending. |
| Naisargika | p. 12; UK II 19½–20½ | Exact Virupa fractions | Sun 60, Moon 360/7, Venus 300/7, Jupiter 240/7, Mercury 180/7, Mars 120/7, Saturn 60/7. |
| UK graha-yuddha and total | p. 12; UK II 20½–22½ | UK north-wins +/-60 Virupa, total with signed Drig and all other parts | Keep Yuddha OUTSIDE the Kala intermediate sum; reject unresolvable latitude/overlapping wars. Total only when every term and its source is resolved. UK p.41 disc-diameter commentary conflicts with p.45 one-Rupa summary: keep convention disclosed. |
| Ayurdaya | **Section III p.13 onwards** | **isolated pure-math research implementation** | `uttara-kalamrita-ayurdaya.browser.mjs` implements Slokas 1–5 research intermediates; no final native lifespan, age at death, or customer visibility. Final Ayurdhaya certification is blocked by incomplete upstream UK Shadbala and unverified natal transit times. |

## Code / numerical evidence

- **New UK-only source:** `public/horoscope/offline/uttara-kalamrita-six-bala.browser.mjs` with explicit fail-closed whole scores.
- UK planetary war pre-existing source (UK p.45): `public/horoscope/offline/uttara-kalamrita-shadbala.browser.mjs`.
- Live chart integration: `public/horoscope/offline/swiss_vedic.browser.mjs` adds **parallel** `strengthUttaraKalamrita` per seven grahas; does **not** change `strength3` or its customer presentation.
- Seven independent **printed** Saptavargaja example total fixtures and all six category functions: `tests/uttara-kalamrita-only-six-bala-book-oracle.mjs`.
- Five actual Perambalur births × seven grahas = **35** chart-level UK intermediate groups, with Sthana parts, seven varga positions, Kala pending, six Drig aspects, UK natural fractions and missing Cheshta: `tests/uttara-kalamrita-five-natal-intermediate-integration.mjs`.
- Source-isolated CI: `.github/workflows/uttara-kalamrita-only-shadbala-qa.yml`.

## What is and is not certified

**Verified/book arithmetic:** Six literal printed Saptavarga worked-example row sums within source truncation, the explicit Jupiter 0.032 Rupa table contradiction, seven separately printed total cells and seven final Shadbala worked-example sum identities, the UK-specific point ladder, seven Naisargika fractions, UK-vs-older Sthana distinction, six aspect entries per recipient, signed summation, and 35 actual chart research integrations.

**Not yet independently verified:** The correct historical sidereal orbital inputs for every natal date; UK-only numeric Ayanabala calibration, complete correct Natonnata/Paksha/Tribhaga and other time intermediate reference oracles at natal epochs; independent external sign/dignity and signed Drig cross-checks of every chart; source interpretation of Graha Yuddha ambiguity; seven full UK Shadbala totals.

Therefore `classicalCertified:false`, `totalVirupa:null` whenever evidence is missing, and **NO FINAL SHADBALA CERTIFICATE**. No main merge until the whole UK numerical source chain has a credible independent evidence set.

**Separate second step now implemented as research:** Ayurdaya was subsequently explicitly requested. The standalone UK III module exists, with no live report integration, and full Ayurdaya remains uncertified.


## Second workstream — UK Section III Ayurdhaya source-only research

The user explicitly requested this as a second step after initiating UK Shadbala verification. Added `public/horoscope/offline/uttara-kalamrita-ayurdaya.browser.mjs`, `tests/uttara-kalamrita-ayurdaya-source-only-numeric-oracle.mjs`, and its **dedicated** workflow `.github/workflows/uttara-kalamrita-ayurdaya-research-qa.yml`.

- Sloka 1: completed stars mod 3, completed Padas and position evidence; book's Venus Karka example of 1 day 45 ghatis 22 vighatis elapsed / 2 days 43 ghatis 32 vighatis total; continuous fraction must use actual entry/exit UTC and is null otherwise.
- Sloka 2: house 12→7 reductions with separate benefic-half and explicit flags for debility/enemy/defeat; the result is **one provisional planet contribution only**.
- Sloka 3: Lagna elapsed-ghati/full-sign-ghati ratio ×9; needs trustworthy rising instant.
- Slokas 4–5: three Drekkanas' UK Saptavargaja strengths, Punya/Papa and (120/7) arithmetic. A separate bridge now derives the three adjacent decan rulers from the actual Lagna and reads their **UK-only Saptavargaja components** from the chart; source-dependent, never a released lifespan number.
- Seven source positions × five Perambalur births = 35 intermediate inputs; `personPredictedLifespan:null`, `deathTimingPrediction:null`, `completeAyurdayaCertified:false`.
- Slokas 6–8: separate, research-only **structural house-placement group flags** and **nullable validated aspect-evidence flags**, with no lifespan classification or prediction; missing aspect confirmation remains null, not presumed. A final UK Shadbala and source-specific calibrated aspect calculation are still prerequisites.

**No certified full UK Shadbala or complete Ayurdhaya, and no main merge.** Historical time-of-death predictions would not be scientifically verifiable from these astrology rules and must never be represented as a medical fact.

### Latest second-stage CI numerical result

[UK III source-only QA run](https://github.com/smvastrorajaram-hub/smvastroservices/actions/runs/38988119392) PASS: book Venus passage fraction 0.6443130860171219, five Perambalur sample dates × seven birth planets = 35 completed Nakshatra/Pada-position research inputs, 3 UK-specific adjacent Drekkana owners per Lagna, plus UK Section III.6–8 nonpredictive condition flags. The research calculation does not generate any certified native lifespan or time-of-death output.
