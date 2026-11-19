# BPHS Shadbala — Astronomical and Source Audit

**Date:** 2026-11-19  
**Repository:** `smvastrorajaram-hub/smvastroservices`  
**Audited branch:** `feat/bphs-shadbala-core-isolated-20261119`  
**Scope:** PR #550 isolated BPHS Chapter 27 six-Bala core and the source helpers it reuses.  
**Decision:** **NOT CLEARED FOR MERGE AS A BPHS-CERTIFIED CALCULATOR.** The code is correctly marked research-only, but the source audit found formula/policy mismatches and missing evidence gates. No production calculator, deployment, or APK release was changed by this audit.

## Executive result

CI passing is not equivalent to source or astronomical certification. The new regression proves that the synthetic integration fixture is internally arithmetically consistent, that selected boundary values behave as written in the tests, and that some mismatched frame/epoch labels are rejected. It does not prove that the inputs are historically correct planetary positions, nor that all BPHS Chapter 27 rules have been faithfully implemented.

The following findings block a BPHS-source-complete or historically certified claim:

1. **Compound friendship calculation has a source-rule mismatch.** Natural friend + temporary enemy is returned as “friend” (15 Virupas) by `compoundRelation()`; BPHS Chapter 3’s compound relationship rule requires equality/neutrality for enmity on one count and friendship on the other. That changes Saptavargaja values.
2. **Moon Paksha Bala is missing the waning-Moon malefic branch.** The existing helper doubles Moon’s value, consistent with Santhanam’s note, but it always doubles the benefic base. The same note says the Moon in the dark half is malefic; v10–11 require malefics to receive 60 minus the benefic base. The doubled dark-half result is therefore not the same as the current code.
3. **Saptavargaja Moolatrikona policy is not fully reconciled to the printed chapter.** Chapter 27 v2–4 says the dignity values apply to all seven divisional occupations; the integrated helper awards the 45-Virupa Moolatrikona special only in D1. This D1-only choice needs an explicit edition/commentary decision and independent varga tests before it can be called BPHS-complete.
4. **Temporal Bala inputs are caller assertions, not a verified birth-time calculation.** The core checks that `horaLord` and `tribhagaLord` are valid graha names, but it does not require or recompute them from the actual sunrise, day/night length, birth clock, local longitude, and mean-local-time convention. An existing sunrise helper can calculate parts of this context, but the isolated core does not enforce its use.
5. **Graha Yuddha eligibility and winner are not verified.** A caller can set `reviewed:true` and supply arbitrary winner/loser names. The core checks names, but does not use the provided ecliptic latitudes to verify the north/south winner, does not enforce the Venus priority in BPHS Chapter 79 v9, and does not carry a verifiable war-evidence object. Chapter 27 v20 validates the *magnitude* after a war is established; it does not make a boolean “reviewed” field proof of eligibility.
6. **Historical Mean/True/Sheeghrocca positions remain uncertified.** The current Saura chain explicitly has no historical Bija corrections for all target epochs and no independent historical true-longitude oracle. Its continuous-trigonometry vs 24-Jya comparison shares the same underlying inputs and is not an independent ephemeris validation. The natal five-planet helper is limited to 1600–2200, not 1800–2399.

Additional caveats are recorded below. The module should remain isolated with `classicalCertified:false` and `productionIntegrationAllowed:false`.

## 1. What passed source comparison

| Component | Source comparison | Audit status |
|---|---|---|
| Uchcha Bala | Shortest angular distance from deep debilitation point divided by 3, with 0–60 Virupa range. | **PASS — arithmetic rule** |
| Dig Bala | Chapter 27 v7 uses the reference cusps 4/7/10/Lagna for the seven planets. The implementation uses the opposite maximum-strength cusps 10/1/4/7 and (60 - distance/3). This is equivalent when the house axes are exactly antipodal. | **CONDITIONAL PASS** — add an antipodal-cusp invariant or calculate from the source reference cusp directly. |
| Natonnata Bala | Apparent birth time relative to midnight; Sun/Jupiter/Venus are diurnal, Moon/Mars/Saturn nocturnal, Mercury gets 60. | **PASS — stated rule**, subject to verified apparent solar time. |
| Naisargika Bala | (60/7) multiplied by rank Saturn=1 through Sun=7. | **PASS — exact constants** |
| Ayana Bala | The simplified Santhanam note uses 23°27′ declination base, reverses sign for Moon/Saturn, uses positive sign for Mercury, and doubles Sun. The helper follows that note. | **PASS — Santhanam simplified formula** |
| Drig Bala aggregation | Chapter 27 v19: signed one-quarter Drishti Pinda plus the full Mercury and Jupiter aspects. The aggregation helper implements this structure. | **PASS — aggregation only**; aspector benefic/malefic classification and angle provenance remain open. |
| Five-planet Cheshta arithmetic | Chapter 27 vv24–25: midpoint of mean and true longitude, distance from the applicable Sheeghrocca, converted to degrees and divided by 3. The helper implements this arithmetic when supplied with the correct longitudes. | **PASS — arithmetic given valid inputs**; astronomical inputs are not certified. |
| Yuddha magnitude | Chapter 27 v20 adds the difference between the same two pre-war Shadbala totals to the victor and subtracts it from the defeated planet. The rectification helper uses a shared pre-war baseline. | **PASS — arithmetic only**; pair eligibility and winner are not verified. |
| Required Shadbala | Sun–Saturn requirements 390, 360, 300, 420, 390, 330, 300 Virupas. | **PASS — constants match Chapter 27 vv32–33** |

## 2. Source mismatches and unresolved policy

### 2.1 Compound friendship affects Saptavargaja

**Code:** `public/horoscope/offline/swiss_vedic.browser.mjs`, `compoundRelation()` and `vargaDignityPoints()`.

The source’s compound relationship rules in BPHS Chapter 3 vv55–58 distinguish natural and temporary relationships. The source describes friendship on one count combined with enmity on the other as equality/neutrality; friendship plus neutrality becomes friendship; enmity plus neutrality becomes enmity; enmity on both counts becomes great enmity.

The current implementation contains:

```js
if(n==='friend' && t==='enemy') return 'friend';
```

That branch awards 15 Virupas through the Saptavargaja map, where the source relationship is neutral/equal and should map to the neutral value (10 Virupas). This can alter several varga scores. This is a **confirmed source-rule mismatch**, not a cosmetic rounding issue.

Required follow-up: implement an explicit 3×2 natural/temporary relationship truth table from the selected BPHS edition and add a test for every cell before changing any live calculator.

### 2.2 Moon Paksha Bala: double the phase-adjusted value, not always the bright-half base

**Code:** `swiss_vedic.browser.mjs`, `pakshaBala()`.

The Santhanam note under Chapter 27 v10–11 says:
- Moon in the dark half is malefic.
- Benefic Paksha Bala is the Moon–Sun arc divided by 3.
- Malefic Paksha Bala is 60 minus that benefic value.
- The Moon’s Paksha Bala is always doubled, as Sun’s Ayana Bala is doubled.

The helper currently returns `2 * base` for Moon before considering whether the Moon is waxing or waning. Its doubling is supported by the Santhanam note, but its phase classification is incomplete. For a waning Moon, the source sequence requires the malefic branch before doubling. The existing regression covers exact new/full endpoints only and does not test a waning-phase oracle.

Required follow-up: add source-derived tests for waxing and waning Moon, including a waning elongation such as 200°, plus the source’s benefic-association exception where applicable. Do not infer correctness from the current full-Moon=120 test alone.

### 2.3 Moolatrikona values across the seven Vargas

**Code:** `vargaDignityPoints()` gates the 45-Virupa Moolatrikona award on `division===1`; `sthanaClassical()` calls the helper for D1, D2, D3, D7, D9, D12 and D30.

BPHS Chapter 27 vv2–4 says the same dignity values occur for the other six divisional occupations. The current integration explicitly prevents the 45-Virupa Moolatrikona award in D2/D3/D7/D9/D12/D30. Some later schools/commentaries restrict Moolatrikona dignity to the Rasi chart, but the printed Chapter 27 wording used by this PR does not itself state that D1-only restriction.

Required follow-up: resolve the source convention against the exact edition/commentary being adopted; then write separate D1 and six-varga oracles. Until resolved, the D1-only test is a project policy, not a fully proven reading of the cited Chapter 27 text.

### 2.4 Drig aspector classification

**Code:** `drigAspectorBenefic()` and `drikBalaClassical()`.

The signed quarter-Pinda plus full Mercury/Jupiter arithmetic matches Chapter 27 v19. However, the aspector classifier uses waxing/waning Moon and same-sign Mercury association. BPHS Chapter 3 v11 also says a waning Moon can become benefic when joined to or aspected by a benefic. The current Moon classifier does not evaluate that condition. The classifier’s current comment points to Uttara Kalamrita, so its policy should be reconciled with the BPHS source priority used by this engine.

Required follow-up: add benefic/malefic Moon association tests and document whether the adopted Drig classifier uses BPHS Chapter 3 or the cited Uttara Kalamrita rule.

## 3. Temporal Bala and solar-time provenance

**Primary source:** BPHS Chapter 27 vv8–13, printed pp.268–272.

- **Tribhaga:** day duration or night duration is divided into three equal parts. The first/second/third day thirds belong to Mercury/Sun/Saturn; the first/second/third night thirds belong to Moon/Venus/Mars; Jupiter receives it at all times.
- **Hora:** each interval from sunrise to the next sunrise is divided into 24 equal planetary hours. The chapter explicitly says Hora must be calculated for mean local time, not standard clock time.
- **Solar calendar day:** birth before local sunrise belongs to the preceding solar day for sunrise-based temporal lords.
- **Sunrise model:** `bphsSwissKalaContext()` can derive three solar events and unequal day/night thirds, but its event model uses a fixed -0.8333° sea-level horizon. The module documents that elevation, pressure and local weather are unavailable. It is therefore an approximation, not an observed/meteorologically exact sunrise.

**Integration gap:** `requireTemporalContext()` validates a numeric apparent solar hour, a date string, a frame/epoch label, and that Hora/Tribhaga lord names are among the seven grahas. It does not recalculate the values or prove they were produced by `bphsSwissKalaContext()`. The test fixture supplies arbitrary lord names. Consequently, CI currently tests the arithmetic on supplied values, not the astronomical derivation of those lords.

Required follow-up: use a typed, provenance-bearing temporal evidence object generated from birth date/time, longitude/latitude, UTC offset, solar ephemeris, and sunrise events; independently verify solar day, Hora index/lord and Tribhaga index/lord in the core. Preserve an explicit approximation flag and do not call the result fully certified while the sunrise model remains approximate.

## 4. Ahargana source discrepancy

**Code:** `traditionalAharganaLords()` uses `floor(ahargana / 360) * 3 + 1` for Varsha Lord.

The R. Santhanam worked example for 1 June 1984 has Ahargana 65,295, quotient 181, then (181 × 3 + 1 = 544), remainder 5, Thursday/Jupiter. This is exactly the convention used by the current code and its June 1984 regression.

There is a textual discrepancy: another printed Chapter 27 rendering says “divide by 60” in the prose. Applying 60 to 65,295 gives quotient 1,088 and a different weekday; it does not reproduce the worked example. The code follows the worked example (/360), not that prose wording. This decision is traceable, but the audit should preserve the discrepancy rather than describe the entire source as unambiguous.

The Month and Day Lord arithmetic does reproduce the Santhanam example: 65,295 / 30 = 2,176; (2,176 × 2 + 1 = 4,353); remainder 6 = Friday/Venus. Dina Lord uses Ahargana modulo 7. The solar-calendar date itself still has to be proven as the previous date for pre-sunrise births; the isolated core currently accepts that date from its caller.

## 5. Graha Yuddha: arithmetic is separated correctly, evidence is not

**Code:** `bphs-shadbala-engine.browser.mjs` `requireYuddhaReview()`; `bphs-shadbala-rectification.browser.mjs`.

The Chapter 27 v20 magnitude rule is applied to common pre-war totals, which avoids recursive winner/loser differences. That part is sound.

But `reviewed:true` is only an assertion from the caller. The core does not validate:
- whether the two planets are actually a qualifying planetary-war pair under the selected source convention;
- which planet wins from the relevant source rule;
- the source’s Venus priority where Venus is involved;
- the northern/southern latitude evidence for the remaining winner rule.

The input ecliptic latitudes are range-checked in `requirePlanetaryInputs()`, but are not consumed to decide the winner. `bphsGrahaYuddhaFromBaselines()` accepts the winner and loser and applies the difference without checking the evidence. The rectification module’s comment mentions Uttara Kalamrita p.41 criteria, but the evidence object itself is not passed to or validated by the core.

BPHS Chapter 27 v20 gives the magnitude once a war exists; BPHS Chapter 79 v9 gives the stated Venus/northern-position victory rule. Any additional angular-distance or same-Bhava eligibility rule taken from Uttara Kalamrita must be explicitly labelled as that source’s criterion, rather than silently called BPHS v20.

Required follow-up: replace the boolean with auditable war evidence (pair, relative longitude/separation, same epoch/frame, ecliptic latitudes, selected source rule, winner derivation, and source citations). Reject an encounter if the winner cannot be independently derived.

## 6. Classical astronomical input chain — not numerically certified

**Files:** `saura-classical-mean-motion.browser.mjs`, `saura-classical-true-longitude.browser.mjs`, `saura-natal-five-cheshta.browser.mjs`.

The five-planet Cheshta formula is correct when Mean, True and Sheeghrocca are correct and in one coherent classical sidereal frame. The upstream source currently does not establish that for all natal epochs:

- The mean-motion module uses uncorrected extant Saura/Surya Siddhanta revolution counts and an Ujjain reference meridian.
- It does not apply historical Bija corrections for each epoch.
- The mandocca model extrapolates from a 2024 anchor and fixed rates; its own metadata says historical certification is false.
- The four-pass true-longitude module labels the outputs numerically uncertified and acknowledges published numerical disagreements beyond its tolerance in some samples.
- The 24-Jya lookup comparison shares the same underlying classical parameters; it is a mathematical implementation comparison, not an independent historical ephemeris oracle.
- `saura-natal-five-cheshta.browser.mjs` currently accepts years 1600–2200, so it does not provide the requested 2201–2399 range.

This is a decisive reason not to connect the research engine to production. The IMD Rashtriya Panchang 2026–27 publishes non-zero Bija corrections for multiple mean planetary positions (for example Mercury, Venus, Jupiter and Saturn), and scholarly historical work describes Bija as corrections to mean-motion parameters/epoch values. Those corrections are not optional if the target is a historically corrected classical longitude series.

Required follow-up: obtain the documented historical Bija/mandocca series for the whole supported epoch range; compare all five planets’ mean and true longitudes against independent printed Panchanga/ephemeris tables at multiple historical dates; include independent tables not generated from the same constants/model; document time scale, origin, meridian, ayanamsa and ecliptic/equatorial frame transformations.

## 7. Frame and input evidence guards

The core correctly rejects mismatched caller-provided frame IDs and Julian epochs. This is a valuable *consistency guard*, but it is not proof that the IDs describe the same physical reference system. A string such as `TEST_TRADITIONAL_SIDEREAL_FRAME` is accepted if supplied consistently.

The core requires speed and ecliptic latitude for all seven planets, but the six-Bala result does not use speed to resolve the eight motion states, and it does not use latitude to resolve Yuddha. Those values are checked for shape/range only. A future source-certified input contract should include provenance fields for:
- geocentric/topocentric origin;
- sidereal/tropical and ayanamsa convention;
- equinox/ecliptic-of-date vs fixed epoch;
- UT/TT and epoch;
- source ephemeris/version and flags;
- transformation path for declinations and apparent solar time;
- evidence provenance for Bhava assignment and Yuddha.

## 8. Eight motion states are not covered by the new core

BPHS Chapter 27 vv21–23 describes eight motion states and assigns strengths to them. The new integration computes the vv24–25 geometric Cheshta Kendra method for Mars through Saturn and correctly lists the eight-state validation as a limitation. It must not be represented as a complete audit of every motional rule in Chapter 27 until the adopted interpretation of vv21–23 versus vv24–25 is documented and independently tested.

## 9. Regression evidence limits

The isolated engine regression uses deliberately synthetic longitudes, equal 30° cusps, zero declinations, test-only frame strings, an arbitrary calendar/time context, and fixed mean/true/Sheeghrocca triples. It is appropriate for unit arithmetic and rejection guards. It does not validate:
- a real birth chart;
- actual geocentric planetary positions;
- a corrected 1800–2399 Saura ephemeris;
- sunrise/Hora/Tribhaga against an independent source;
- actual Graha Yuddha eligibility or winner;
- all varga dignity and compound relationship combinations.

The passing Classical Shadbala workflow therefore means the current test suite passed. It does not close the source blockers documented here.

## 10. Merge gate / recommended order

**Keep PR #550 Draft and unmerged.** The engine should remain disconnected from production.

1. Correct and test the Saptavargaja compound relationship truth table.
2. Correct Moon Paksha classification (waxing/waning first, then the Santhanam doubling rule); add phase boundary and association oracles.
3. Resolve the Moolatrikona-in-seven-vargas policy against the exact source edition and encode it explicitly.
4. Make temporal Bala consume verifiable birth/sunrise evidence; derive and check the Hora and Tribhaga lords from the actual local solar context.
5. Make Yuddha proof-carrying: derive eligibility and victor from source-defined evidence; do not accept an unsupported caller-selected winner.
6. Audit the Ahargana /60 prose vs /360 worked-example discrepancy and retain the chosen convention with a regression tied to the printed worked example.
7. Complete the Bija-corrected mean/mandocca/true-longitude chain with independent historical numerical oracles over the supported date range.
8. Add the Ch27 vv21–23 motion-state audit or explicitly bound the feature to the vv24–25 geometric method.

Only after these gates are closed should an end-to-end seven-graha source certificate and a separate production-integration review be considered. This audit makes no production changes and does not approve a merge.

## Source references

1. **Brihat Parashara Hora Shastra**, R. Santhanam, Vol. I, Chapter 27, printed pp.263–284 (especially Saptavargaja/compound relationships pp.265–266; temporal/Paksha/Tribhaga pp.268–270; Ahargana/Hora pp.271–272; Ayana/Drig/Yuddha/motions pp.270–272); Chapter 3 vv.11 and 55–58; Chapter 79 v.9.  
   - [Chapter 27 text / scan](https://vedic-astro.s3.amazonaws.com/books/bhrihat_parasara_hora_shastra.pdf)  
   - [Chapter 27 verse translation](https://vedicpupil.in/library/books/brihat-parashara-hora-shastra/chapter-27)  
   - [Chapter 79 v.9 translation](https://vedicpupil.in/library/books/brihat-parashara-hora-shastra/chapter-79)  
   - [R. Santhanam Chapter 27 pages 265–272 text extract](https://www.scribd.com/document/1069209816/BPHS-1-RSanthanam-1-16)
2. **IMD Rashtriya Panchang 2026–27**, “Mean Nirayana longitude of planets by Bija Corrections to Surya Siddhanta elements.”  
   [IMD Bija corrections table](https://packolkata.imd.gov.in/panchang/en/bija_corrections)
3. Cidambi, Montelle & Plofker (2024), *Astronomical handbooks in 16th-century South Asia: Analysis of mean planetary motions in the 1520 Graha-lāghava of Gaṇeśa Daivajña* (discussion of Bīja corrections and historical mean-motion parameters).  
   [Journal article](https://journals.sagepub.com/doi/10.1177/00218286241241812)

## Final audit status

**Source-audit result: HOLD / NOT MERGE-READY.**  
**Research calculation core: may remain in the draft PR only.**  
**Production B.V. Raman strength6: not changed by this audit.**  
**Deployment / merge / APK release: none performed.**
