# SMV CALENDAR — Subha Muhurtham rule audit

**Audit date:** 17 November 2026  
**Audited main commit:** `f9f240a7b442776f565e4ab095686ba3f0256a6e`  
**Scope:** Read-only source and reference audit. No live calculation, published dates, cache, PWA, Android, Horoscope, or Calendar behaviour is changed by this document.

## Executive finding

The current SMV CALENDAR label **Subha Muhurtham day** is an annual published-date lookup, not an independently calculated Thirukanitham Muhurtham result.

`public/horoscope/calendar-muhurta-classification.mjs` accepts only a civil date and looks it up in hard-coded annual arrays for 2026 and 2027. It explicitly says that no score, rule inference, or Panchanga-limb override is used. The 2026 and 2027 lists contain 55 and 93 dates respectively. A covered year returns a positive or negative lookup; an uncovered year returns unavailable rather than guessing.

`public/horoscope/daily-calendar.mjs` calls `classifySubhaMuhurtham({ date: selected })`. The separately calculated Lagna and Rasi Mana Lagna balance are rendered beside the result, but they do not take part in the Subha Muhurtham classification. Place, coordinates, time zone, Tithi, Nakshatra, weekday, Yoga, Karana, planetary positions, and the selected Lagna are not arguments to that classifier.

The existing lookup therefore must not be described as a calculated, location-specific, Thirukanitham Muhurtham engine.

## What the cited Thirukanitham reference actually checks

A reference titled **“சுத்த திருக்கணித சர்வமுகூர்த்த பஞ்சாங்கம்”** includes a marriage-muhurtham rules article (September 2015, pp. 21–25). It describes a multi-stage selection rather than a date-only test:

| Layer | Rule information stated in the reference |
|---|---|
| Weekday | Tuesday and Saturday are excluded in the general marriage guidance; exceptions are discussed separately |
| Tamil month | Aadi, Purattasi, Margazhi and Masi are excluded in that article's general marriage guidance |
| Tithi | Dwitiya, Tritiya, Panchami, Shashti, Saptami, Dashami, Dwadashi and Trayodashi are listed as favourable |
| Nakshatra | Ashwini, Rohini, Uttiram, Uttiradam, Mrigashiridam, Magam, Moolam, Anusham, Uttirattadhi and Revathi are listed |
| Tara Bala | The bride/groom birth-star relationship is considered; the article explicitly notes a Tamil counting convention that differs from another regional convention |
| Lagna | The rising Lagna at the actual Muhurtham time matters; the article lists acceptable Lagnas and conditions for other Lagnas |
| Planetary condition | Benefic/malefic placements and special exceptions are considered |
| Panchakam | Weekday, Tithi, Nakshatra, Lagna and a Lagna Dhruva value are combined; the article lists different Panchaka outcomes and exceptions |

Reference: [Apsara Publications — “சுத்த திருக்கணித சர்வமுகூர்த்த பஞ்சாங்கம்”, September 2015 PDF](https://apsaraepublications.com/e-magz/jothidam/jothidam_sep_2015.pdf), especially pp. 21–25. The rule article is a useful named tradition reference, but it is not by itself proof that every Tamil panchangam follows an identical rule table.

## Why a calculation must not be guessed from generic rules

The sources do not establish one universal Panchaka formula:

- The Apsara Thirukanitham article describes a Panchaka made from weekday, Tithi, Nakshatra, Lagna and Lagna Dhruva, with its own outcome classes and exceptions.
- [Dinamani's “சுப முகூர்த்தம் குறிக்க சுப பஞ்சகம்” article](https://www.dinamani.com/weekly-supplements/vellimani/2017/Dec/22/சுப-முகூர்த்தம்-குறிக்க-சுப-பஞ்சகம்-2831143.html) gives a different modulo-nine method and identifies remainders 3, 4, 7 and 9 as favourable.
- [Sri Sringeri's 2024–25 Tamil Panchangam PDF](https://www.sringeri.net/assets/documents/panchangam/2024_25_krodhi_tamil_panchanga_sringeri.pdf) is explicitly a **Vakya** Panchangam, not a Thirukanitham ephemeris. Its marriage section supplies its own month, Tithi, weekday, Nakshatra, Karana and Lagna-cleanliness guidance, and its Panchaka discussion has a different set of danger outcomes.

These references must not be merged into a new hybrid formula. The exact tradition/source table to be implemented must be fixed first, including the full Lagna-Dhruva mapping, modulo convention, exceptions, and activity-specific rules.

## Cross-check against the currently imported annual list

The current source URL is [Tamil Calendar App — Subha Muhurtham dates](https://tamilcalendarapp.com/subha-muhurtham-dates/). It publishes 2026/2027 date, Paksha, Lagna, Nakshatra, Tithi and time columns, but the page does not explain a complete reproducible calculation algorithm.

A visible example of why a generic hard filter is unsafe: the imported 2026 list includes **13 November 2026**, and that source labels its Tithi as **Chaturthi**. The 2015 Apsara marriage guide's favourable-Tithi list does not include Chaturthi. This could reflect a tradition-specific exception, a different activity rule, or a data discrepancy; the source material inspected does not resolve which. It must be investigated rather than silently accepted or rejected by code.

The current regression tests prove that SMV reproduces its imported list (including 11 Nov, 13 Nov and 29 Nov 2026) and that unlisted years remain unavailable. They do not prove the astronomical or ritual correctness of the list.

## Proposed implementation contract

The eventual calculation should be introduced as a separately tested engine, not as a silent rewrite of the annual lookup.

1. **Choose the activity class.** Marriage, Mangalyam, Grihapravesam, Seemantham and general auspicious beginnings may have different rule tables. A generic date must not be called suitable for every activity merely because one table accepts it.
2. **Use the user's selected local place and date.** Establish the Panchanga day boundary, time zone, sunrise and exact transition times using the existing SMV Lahiri/Thirukanitham astronomical engine. Do not use a single noon snapshot for a day whose Tithi or Nakshatra changes during the proposed time window.
3. **Evaluate the full candidate window.** Apply the activity's month, weekday, Tithi, Nakshatra, Yoga, Karana and forbidden-interval rules at the actual candidate time. Document any sunrise-based rule separately from an exact-time rule.
4. **Calculate the rising Lagna at each candidate interval.** Evaluate Lagna cleanliness and the relevant planetary placements. A day-level Lagna value cannot substitute for the actual selected Muhurtham interval.
5. **Calculate Panchaka using one named and verified tradition.** Do not combine the modulo-nine Dinamani summary with a different Panchangam's Lagna-Dhruva table.
6. **Separate public date suitability from personal suitability.** Tara Bala (and any required Chandra Bala) depends on the relevant person's birth Nakshatra/Rasi. Without those inputs, the public calendar may report only general date/time suitability; it must not imply that the date is personally suitable for both marriage partners.
7. **Show the reason for the result.** The output should expose the accepted time window, Tithi, Nakshatra, Yoga, Karana, weekday, Lagna, Panchaka remainder/category, applicable exceptions, location, time zone and rule-source version. A failure should name the failed condition, not merely say “No”.
8. **Preserve a transparent fallback.** Until the new engine is independently validated, retain the 2026/2027 published-list lookup but label it clearly as a published-list result. Do not fabricate a negative result for years without a reviewed rule/data set.

## Validation required before enabling the new result

- Confirm the intended primary Thirukanitham Panchangam/rule edition and transcribe its full activity-specific tables, including all exceptions and Lagna-Dhruva values.
- Reconcile the different Panchaka formulas against that selected source; record the decision and worked examples.
- Compare Tithi, Nakshatra, Yoga, Karana, sunrise, Lagna and planetary placements with at least two independently published Thirukanitham calendars for the same place, local date and time.
- Reproduce a known set of published date **and time-window** examples. Compare mismatches individually; do not tune the rules merely to force a match.
- Add unit tests for transitions across midnight/sunrise, changing Tithi/Nakshatra during a candidate window, time-zone/location changes, unavailable ephemeris data, all Panchaka remainders, and each activity's exceptions.
- Run the existing Calendar regression and browser-preview checks. Confirm the offline asset list and perform the required synchronized cache-version bump only when runtime files actually change.

## Files deliberately left unchanged

- `public/horoscope/calendar-muhurta-classification.mjs`
- `public/horoscope/daily-calendar.mjs`
- `public/horoscope/calendar-worker.mjs` and calculation modules
- Calendar service-worker/cache manifests
- Horoscope, Calendar and Android release files

**Decision:** No production calculation was changed in this audit. The evidence confirms the current lookup is not a Thirukanitham calculation, but the cited traditions disagree on important rule details. Implementing one of them without fixing the canonical source would risk publishing incorrect Muhurtham dates. The next safe coding step is to lock the exact rule edition and then build the engine behind tests, while retaining the published-list fallback until validation passes.


---

# Addendum — Approved source and expanded Muhurtham scope

**User direction confirmed:** Use the *Suddha Thirukanitha Sarva Muhurtha Panchangam* marriage rules as the primary rule tradition, and include Vastu days, Pushkara Navamsa, and the exact Pushkara Navamsa window for tying the Mangalyam (Thali). The user's month policy is that ordinary auspicious activities are generally avoided in Aadi and Margazhi; any exception must be explicit and activity-specific.

## 1. Canonical rule source and marriage filter

The primary reference is the article **“திருமண முகூர்த்த நல்ல நாள் குறித்து”** in *Guru’s Jothidam*, September 2015, pp. 21–25, followed by the titled *சுத்த திருக்கணித சர்வமுகூர்த்த பஞ்சாங்கம்* material and Tara Bala table (pp. 22–23).

The article's general marriage screening list states:

- **Tamil months excluded for marriage:** Aadi, Purattasi, Margazhi and Maasi (the article cites *Kala Vidhana Paddhati*, rules 132–134).
- **Tithi:** Dwitiya, Tritiya, Panchami, Shashti, Saptami, Dashami, Dwadashi and Trayodashi.
- **Nakshatra:** Ashwini, Rohini, Uttara, Uttarashada, Mrigashirsha, Magha, Moola, Anuradha, Uttarabhadra and Revati.
- **Tara Bala:** It explicitly distinguishes a north/Andhra counting list from the Tamil Nadu rule. For the Tamil Nadu method, the article lists counts 2, 4, 6, 8, 9, 11, 13, 15, 17, 18, 20, 22, 24, 26 and 27 from the groom's star to the bride's star. This must be coded as the chosen Tamil convention rather than silently substituting the other list.
- **Lagna and planets:** The article lists preferred marriage Lagnas and conditions for other Lagnas, and gives planetary placement / dosha-removal conditions. Those placements must be transcribed from the printed pages and tested before coding; the extracted text has ambiguous OCR in some planetary-house notation, so no uncertain house sequence is to be guessed.
- **Panchaka:** The article's own method adds the weekday count, Tithi count, Nakshatra count, marriage Lagna number and Lagna-Dhruva number. It specifically gives Dhruva values for Mesha, Simha, Kumbha and Meena as 5, 7, 4 and 6 respectively in the extracted passage, then classifies the total into Panchaka outcomes. The full Lagna-Dhruva mapping for all twelve signs and all exception handling must be verified from the printed rule table before implementation.

**Internal source inconsistency to resolve:** On p. 21 the general weekday line says Tuesday and Saturday are excluded. On p. 24 the exception paragraph appears to state Saturday and Friday are excluded, with an early-morning exception. This discrepancy must be checked against the printed page / original author or a matching edition before a weekday hard filter is enabled. Do not resolve it by choosing whichever version yields more dates.

The 2015 article also says that personal Tara Bala and the couple's birth stars matter. Therefore a date-only public calendar cannot claim that a day is personally suitable for a particular couple. Without the birth-star inputs, the UI must state “general Panchang suitability”; a couple-specific result requires both relevant birth-star inputs and the source's Tamil counting convention.

Reference: [Apsara Publications — Guru's Jothidam, September 2015 PDF](https://apsaraepublications.com/e-magz/jothidam/jothidam_sep_2015.pdf), pp. 21–25. Relevant extracted sections include the month/Tithi/star list and Tara Bala on pp. 21–22, Lagna/planetary conditions on p. 23–24, and the five-part Panchaka calculation on p. 25.

## 2. Aadi and Margazhi are category-specific restrictions, not one global switch

The user's general policy is retained: **ordinary auspicious functions are not to be recommended in Aadi or Margazhi.** However, the named source material contains a distinct Vastu-day rule that identifies Aadi 11 as one of the annual Vastu days. This is a specific Vastu exception only; it must not make ordinary marriage, engagement, housewarming, or unrelated ceremonies eligible in Aadi.

Apply month rules by activity:

| Activity | Month policy to encode |
|---|---|
| Marriage / Mangalyam | Follow the primary 2015 source's exclusion of Aadi, Purattasi, Margazhi and Maasi, subject to its documented, source-backed exceptions |
| Vastu / Bhoomi Pooja | Use the dedicated Vastu-day calendar; Aadi 11 is a specific listed Vastu day, not a general Aadi exception |
| Ordinary general Subha Karyam | Default block Aadi and Margazhi as requested; apply any other month restriction only when the selected activity's source requires it |
| Other Samskaras / Grahapravesam / business / travel | Their own Sarva Muhurtha / Dharma Shastra rule tables are required; do not copy the marriage month filter blindly |

Margazhi remains excluded for the Vastu schedule cited below as well. The Vastu-day reference also identifies Aani, Purattasi and Panguni as non-Vastu months. This makes the distinction explicit: Aadi 11 may qualify for its narrow Vastu purpose while ordinary Aadi activities remain blocked.

The existing imported annual list must not be relabelled as marriage approval. For example, its February 2026 dates include dates in Maasi, which conflicts with the selected marriage article's general Maasi exclusion. Keep the existing public-list data visible as a *published-list reference* until each activity-specific rule is reconciled; do not silently convert those dates to approved marriage dates.

## 3. Vastu days — a separate Sunrise-based calculator

The Vastu feature is not simply a “good date” badge. It should expose the traditional date and the location-specific waking / ritual interval.

The Tamil Vastu reference examined lists these eight Tamil-date anchors:

| Tamil month | Tamil date |
|---|---:|
| Chithirai | 10 |
| Vaikasi | 21 |
| Aadi | 11 |
| Avani | 6 |
| Aippasi | 11 |
| Karthigai | 8 |
| Thai | 12 |
| Maasi | 22 |

The reference describes a **90-minute Vastu-Purusha waking window**, with the first 54 minutes excluded for the actual puja and the **last 36 minutes** as the preferred Bhoomi Pooja / foundation / threshold ritual interval. It states that the interval is calculated from the selected place's local sunrise and gives the traditional month-day anchors. It excludes Aani, Purattasi, Margazhi and Panguni for the Vastu observance.

Reference: [Thirukanitha Panchangam — Vastu Naatkal 2026](https://thirukanithapanchangam.com/vastu-natkal-in-tamil/?t_year=2026), especially the explanatory sections on the 90-minute waking window, last 36-minute ritual interval, eight Tamil dates and sunrise dependency.

**Implementation constraints:**

1. Determine the selected place's correct local solar month/date and sunrise using the existing SMV Lahiri / Thirukanitham calculation boundary; do not use Chennai's published clock times for every user. The Calendar source already computes Tamil solar month/day from the local-sunrise civil boundary and supplies local sunrise.
2. Phase 1 now uses the selected 2026 Thirukanitha Vastu table's month offsets: Chithirai 5, Vaikasi 8, Aadi 2, Avani 21, Aippasi 2, Karthigai 10, Thai 8 and Masi 8 Nazhigai (1 Nazhigai = 24 minutes). These published offsets remain source-specific and must be reconciled against the user's exact Sarva Muhurtha Panchangam edition before treating them as the definitive canonical table for all years.
3. Present both the 90-minute waking span and the last 36-minute ritual span. Do not label all 90 minutes as the best puja time.
4. Keep this result under the Vastu / Bhoomi Pooja activity type. Do not override the general Aadi or Margazhi restriction for other activities.
5. Cross-check Gregorian dates, weekday, local sunrise and the computed 36-minute window against a published Thirukanitham Vastu table for Perambalur and at least one second Tamil Nadu location.

**Known data disagreement:** Public 2026 Vastu tables differ by one civil day for the Avani 6 observance (one source publishes 22 August; other common lists show 23 August). The selected source edition and location's solar-day boundary must decide the result. Do not hard-code the disagreement away.

## 4. Pushkara Navamsa — distinct from Pushkara Bhaga

The Pushkara Navamsa table is supported by C. S. Patel's *Navamsa in Astrology*, Chapter IV, and its cited Vidyamadhaviyam tradition. That source states that there are two Pushkara Navamsas in each sign, 24 in total, and that they are auspicious in Muhurta as well as other branches. It also notes that standard texts use them rarely while Deva-Keralam / Chandra Kala Nadi uses them more freely.

Use the following 24 intervals, measured from the start of each **sidereal Rasi**:

| Rasi group | Pushkara Navamsa | Degree interval inside each listed Rasi |
|---|---|---|
| Mesha, Simha, Dhanus | 7th (Tula), 9th (Dhanus) | 20°00′–23°20′; 26°40′–30°00′ |
| Rishabha, Kanya, Makara | 3rd (Meena), 5th (Rishabha) | 6°40′–10°00′; 13°20′–16°40′ |
| Mithuna, Tula, Kumbha | 6th (Meena), 8th (Rishabha) | 16°40′–20°00′; 23°20′–26°40′ |
| Kataka, Vrischika, Meena | 1st (Kataka), 3rd (Kanya) | 0°00′–3°20′; 6°40′–10°00′ |

Reference: C. S. Patel, *Navamsa in Astrology*, Chapter IV, “Pushkara Navamsas,” printed pp. 31–33; [accessible PDF copy](https://storage.yandexcloud.net/j108/library/tpg6o28l/C.S._Patel_-_Navamsa_in_Astrology.pdf). The source's mapping and degree intervals must be encoded with boundary tests (inclusive start, exclusive end, and exact sign-transition handling).

Do not confuse:
- **Pushkara Navamsa:** an entire 3°20′ Navamsa interval, two in each sign.
- **Pushkara Bhaga / Pushkaramsa:** a specific degree or degree point with its own source table.

The two concepts require separate labels, calculations and evidence. Do not substitute a Pushkara Bhaga degree for a Pushkara Navamsa interval.

## 5. Special “Thali tying Pushkara Navamsa” timing

Treat the Thali / Mangalyam tying moment as a distinct critical instant inside the already-approved marriage muhurta — not as a second independent date-selection system.

Proposed calculation sequence:

1. Find a marriage date and valid marriage-time window using the full primary Thirukanitham marriage rules first.
2. Within that approved interval, calculate the local sidereal rising degree continuously using the selected Lahiri ayanamsa, location and time zone.
3. Find every sub-interval during which the rising Lagna degree falls inside one of the 24 Pushkara Navamsa arcs above.
4. Intersect that interval with all marriage restrictions (Tithi / Nakshatra / weekday transitions, prohibited periods, Lagna Thyajya, Panchaka, planetary conditions and the source's exception rules).
5. Show the remaining exact Thali-tying time window, including start/end seconds and the Rasi + Navamsa labels. If there is no overlap, show “No valid Thali Pushkara interval within this marriage muhurta”; never move the time outside the approved marriage window just to force Pushkara.
6. Keep the actual tying moment distinct from the broader arrival / garland / homam / wedding programme time.

Murari Publications' *Sarva Muhurtha Naadi* contents explicitly list **“Necessity of Pushkara Navamsa in marriage”** as a topic, which supports treating this as an important marriage-specific requirement. The actual chapter's full procedure was not freely available in the page inspected, so the source's exact special rule (whether it requires only the rising Navamsa, or additional Moon / Navamsa-lord conditions) remains to be verified before claiming full compliance.

References: [Murari Publications — Sarva Muhurtha Naadi contents](https://muraripublications.com/books/); [C. S. Patel, *Navamsa in Astrology*, Chapter IV](https://storage.yandexcloud.net/j108/library/tpg6o28l/C.S._Patel_-_Navamsa_in_Astrology.pdf).

## 6. Product and calculation architecture

The future Calendar experience must separate these outputs:

- **Marriage / Mangalyam:** date eligibility, candidate time window, couple Tara Bala, marriage Lagna and planetary checks, Panchaka, and separate Thali Pushkara interval.
- **Vastu / Bhoomi Pooja:** Tamil Vastu date, local 90-minute waking interval and last 36-minute puja interval.
- **General Subha Karyam:** its own month and Panchanga rules; no inferred approval from the marriage or Vastu results.
- **Other named ceremonies:** independent rule modules and source tables for Grahapravesam, Seemantham, Upanayanam, Namakaranam, business commencement, etc.

Every result must show its activity type, rule-source edition, location, time zone, local sunrise, transition-sensitive Tithi / Nakshatra / Yoga / Karana, relevant Lagna, exact accepted/rejected interval and reasons. If any essential ephemeris or source table is absent, report unavailable / needs verification rather than inventing a favourable day.

## 7. Validation gates before runtime implementation

- Obtain and transcribe the complete Lagna-Dhruva mapping, Panchaka remainder table, planetary placement table and exceptions from the approved 2015 edition.
- Resolve the primary source's weekday contradiction (p. 21 versus p. 24) and verify the unclear planetary-house notation visually.
- Obtain the exact Vastu month-offset / nazhigai table from the same approved Panchangam edition and reconcile the Avani 6 date discrepancy.
- Verify the exact marriage-specific Pushkara Navamsa / Thali moment procedure from *Sarva Muhurtha Naadi* or an equivalent primary passage.
- Confirm whether Moon Pushkara placement, Pushkara Bhaga, Navamsa Lagna lord dignity or other additional conditions are required; do not add modern web-site rules without source support.
- Add unit tests for all 24 Pushkara intervals, all 12 sign changes, exact boundaries, local sunrise, time-zone / longitude variations, Vastu 90-minute and 36-minute windows, each activity-specific month block, and no-overlap cases.
- Run the existing Calendar calculation and browser tests; then perform the required cache-version bump for all affected Calendar delivery surfaces and relevant Android app assets. Do not clear origin storage or user data.

## 8. Current implementation decision

This addendum records the user's approved scope and the additional rule evidence. **No runtime calculation, published date, service-worker cache, PWA, Android, Horoscope, or production file has been changed.** The current 2026/2027 annual-list lookup remains untouched as a clearly identified legacy reference while the full activity-specific calculator is built and validated in a separate implementation change. The Draft PR must remain unmerged until the source contradictions and missing primary tables above are resolved.


---

## 9. Phase 1 code now present on the research branch

**Research branch:** `research/subha-muhurtham-rule-audit-20261117`  
**This section describes branch Preview code only. Main / production remain unchanged.**

The user approved the *Suddha Thirukanitha Sarva Muhurtha Panchangam* tradition as the primary marriage-rule source and asked for separate Vastu and Pushkara support. The following limited, independently testable Phase 1 work has now been added on this branch:

- `public/horoscope/calendar-muhurta-activities.mjs` contains activity-specific month screening; marriage month blocks (Aadi, Purattasi, Margazhi, Masi); the user's ordinary-work Aadi/Margazhi block; Vastu Tamil month/day and sunrise-offset lookup; and the 24 Pushkara Navamsa intervals.
- The Vastu helper takes the already-calculated local Thirukanitham Tamil solar date and local sunrise. It returns the 90-minute Vastu waking span and only the final 36 minutes as the Bhoomi Pooja interval. It does not use fixed Chennai clock times or hard-coded Gregorian dates.
- The Pushkara helper accepts the already-calculated selected-time sidereal Lahiri Lagna longitude and reports whether that instant is inside one of the source's Pushkara Navamsa intervals. It also returns Rasi degree and D9 sign.
- `daily-calendar.mjs` now labels the previous annual-list answer as a **published-list result**, displays the marriage month-only screening and selected-time Lagna Pushkara check, and adds a Vastu Day / Bhoomi Pooja card to Date Details.
- The UI explicitly says that selected-time Pushkara status is **not** the final Thali-tying time. It does not infer a Thali moment outside a validated marriage muhurta interval.
- Calendar service-worker CORE and REQUIRED_CORE both precache the new helper; Calendar cache revision and the daily module asset URL were bumped to `20261117-calendar-muhurta-activities-v1`. No user storage is cleared.

### New regression coverage

`tests/calendar-muhurta-activities-regression.mjs` covers the activity-specific month filters, the eight Vastu month/day anchors and offsets, Aadi 11 as a Vastu-only exception, local-sunrise interval lengths, all 24 Pushkara Navamsa ranges, and inclusive-start / exclusive-end boundaries.

The browser preview smoke test additionally checks Aadi 11 (27 July 2026) and verifies that the rendered Vastu waking span is 90 minutes and the Bhoomi Pooja span is 36 minutes.

### Still deliberately not calculated

1. A complete marriage-day / time verdict cannot yet be emitted: the source weekday exception conflict and the complete Panchaka remainder / all-sign Lagna-Dhruva / planetary tables remain open.
2. A Thali-timing window cannot yet be emitted: the named Sarva Muhurtha Naadi chapter is identified, but its full procedure and any extra Moon / Navamsa-lord conditions have not been verified from an accessible primary passage.
3. Other ceremony types remain unavailable until their own source tables are verified.

**This phase is not a production-ready full Muhurtham engine.** The branch shows the separate, source-attributed pieces that can safely be computed now, and leaves all unverified marriage rules as pending rather than presenting a misleading final date/time.


## 10. Panchaka / Lagna-Dhruva source comparison — updated after deeper lookup

The user asked specifically what happened to the Panchaka calculation and the complete Dhruva table. The primary-source page has now been located precisely:

**Apsara Publications, Guru's Jothidam, September 2015, printed page 25**, under “பஞ்சகம் பார்த்தல்”. The article explicitly defines five inputs:
1. weekday count,
2. Tithi count from Prathama,
3. Nakshatra count from Ashwini,
4. Lagna count from Mesha,
5. the Lagna-Dhruva number.

The printed passage lists these Dhruva values for the Sarva Muhurtha marriage calculation:
- Mesha = 5
- Simha = 7
- Kumbha = 4
- Meena = 6

It does **not** provide an explicit Dhruva value for the other eight Lagnas in that passage. Those missing cells must remain “not stated by this source” until a matching edition / author confirmation is obtained; they must not be silently filled with zero or copied from a different table.

The same page says that a combined total / remainder of 6 or 7 permits marriage, and names the remainder classes:
- 1 — Pithru Panchakam
- 2 — Anna Panchakam
- 3 — suitable for all activities
- 4 — Raja Panchakam
- 5 — suitable for all activities
- 6 — Soma Panchakam
- 7 — suitable for all activities
- 8 — Roga Panchakam

The page also adds time-of-day-specific Panchaka remarks. The extracted passage needs visual print-page verification before the entire day/night exception sentence can safely be hard-coded. The source's full passage does not explicitly spell out “divide by 9” in the visible extracted lines, although other five-factor Panchaka explanations do. Therefore the exact divisor and whether its “6 or 7” sentence means remainders must be visually checked against the printed original before production automation. A screenshot attempt on the hosted PDF timed out; the text extraction remains available.

**Different published traditions — do not merge:**

| Reference | Dhruva table stated | Panchaka method stated |
|---|---|---|
| Apsara, Sep 2015, Sarva Muhurtha marriage article, printed p.25 | Mesha 5, Simha 7, Kumbha 4, Meena 6 | Five inputs: weekday + Tithi + star + Lagna + Dhruva; marriage source's own remainder classes |
| Dinamani, 22 Dec 2017 | Mesha 5, Rishabha 7, Makara 2, Kumbha 4, Meena 6; says remaining signs have no Dhruva | Five inputs, divide total by 9; its article calls remainders 3,4,7,9 “Nishpanchakam” |
| Maalaimalar / Mr Online Astro | Mesha 5, Rishabha 7, Kumbha 2, Meena 6, others 0 | Five inputs, divide by 9; favourable remainders 0,3,5,7,9 |
| Current ThirukanithaPanchangam.com online Panchaka calculator | No Dhruva input | Its page explicitly says the live calculator sums only four values: Tithi + weekday + Nakshatra + Lagna, divided by 9. The page's remainder table labels 3,5,7,9/0 as favourable. |
| Sringeri Vikari 2019–20 Vakya Panchangam | No Dhruva input | Four-factor calculation, with 1,2,4,6,8 listed as inauspicious. This is a different Vakya edition, not the chosen Lahiri/Thirukanitham primary rule. |

References:
- [Apsara 2015 PDF, printed p.25](https://apsaraepublications.com/e-magz/jothidam/jothidam_sep_2015.pdf)
- [Dinamani — சுப முகூர்த்தம் குறிக்க சுப பஞ்சகம்](https://www.dinamani.com/weekly-supplements/vellimani/2017/Dec/22/சுப-முகூர்த்தம்-குறிக்க-சுப-பஞ்சகம்-2831143.html)
- [Maalaimalar — சுபமுகூர்த்தம் அமைப்பது எப்படி?](https://www.maalaimalar.com/news/sirappukatturaigal/prasanna-jothidar-anandhi-special-article-about-puratasi)
- [Thirukanitha Panchangam — Panchaka Calculator](https://thirukanithapanchangam.com/panchakam-calculator-in-tamil/)
- [Sringeri Vikari 2019–20 Tamil Vakya Panchangam](https://www.sringeri.net/assets/documents/panchangam/tamil_panchangam_2019_2020_vikari_samvatsara.pdf)

### Decision for SMV CALENDAR

The primary marriage rule remains the user's approved **Suddha Thirukanitha Sarva Muhurtha Panchangam** article, not the no-Dhruva online calculator. Until the eight missing source cells, the exact division wording, and the special day/night cases are confirmed, the Panchaka engine must return “source rule incomplete for this Lagna” rather than fabricate a value. The competing Dinamani / Maalaimalar tables can be kept as documented alternate traditions only.

No Panchaka calculation has yet been presented as a final result in the Calendar UI. The month-filter and Vastu / Pushkara Phase 1 code are separate from this unresolved five-factor Panchaka rule.


## 11. Sri Thanigai primary 2026–27 source comparison (checked against the PDFs)

The current publisher / compiler's pages are on **prohithar.com**, attributed to Balu Saravana Sarma, Sri Thanigai Panchangam.

### A. Sri Thanigai Parabhava Thirukanitha Panchangam 2026–27

[Original 15-page PDF](https://www.prohithar.com/panchangasadas/thanigai/parabhava-srithanigai-panchangam2026-2027.pdf)

The cover identifies it as **Sri Thanigai Thirukanitha Tamil Panchangam**, Parabhava 2026–27, based on Lahiri ayanamsa / astronomical reckoning and the Indian astronomical ephemeris. The visually inspected second page includes:

- a Chennai Lagna-Manam table for all 12 signs (Rasi-specific rising-duration values);
- the table is expressly for Chennai and a stated surrounding radius; it is not a Dhruva-number table;
- the Vastu-days table, with nine entries: Chithirai 10, Vaikasi 21, Aadi 11, Avani 6, Aippasi 11, Karthigai 8, Thai 12, Masi 22 and Panguni 22, each accompanied by a Chennai clock-time interval.

A text search of the full 15-page edition for “பஞ்சகம்”, “துருவம்” and “நவாம்ச” returns no matches. Thus this edition provides the astronomical calendar, local sunrise-related / Vastu schedule and Lagna-Manam, but **does not publish the missing eight marriage Dhruva numbers or a Panchaka-remainder table** in its searchable text.

### B. Sri Thanigai Parabhava 2026–27 Subha Muhurtha Dates

[Original five-page PDF](https://www.prohithar.com/subam/parabava/parabava-drik-vakya-muhurtham-2026-2027.pdf)

The first page explicitly cautions that the dates are general; the family's actual choice must be matched to the couple's Nakshatra and Rasi with astrologer guidance. It lists month-wise Thirukanitha and Vakya muhurtha dates, including Tithi, Nakshatra, Yoga, time window and Lagna. The PDF's metadata/description mentions “நவாம்ஸ புஷ்கர லக்னம்” (Navamsa Pushkara Lagna), but the inspected five pages do not contain a dedicated Pushkara Navamsa interval or a Dhruva/Panchaka rule table. It therefore evidences that Sri Thanigai publishes/uses this feature in its muhurtha material, but it does not reveal the exact calculation needed to reproduce each Thali-tying interval.

The original PDF's page 5 (visually inspected) gives a clear caution: families should consult their family astrologer in person and finalise a muhurtha before booking the hall. It also describes the published dates as general and says that in most cases the listed muhurtha time cannot be changed.

### C. Reconciled Panchaka position

The two source documents answer different questions:

| Source | What is actually supplied | What is not supplied |
|---|---|---|
| Sri Thanigai 2026–27 Panchangam | Lahiri/Thirukanitha astronomical data, Tamil solar dates, Chennai Lagna-Manam for 12 signs, Vastu schedule | Marriage Lagna-Dhruva table, Panchaka remainder rules, Pushkara Navamsa calculation table |
| Sri Thanigai 2026–27 Subha Muhurtha list | General date/time windows with Tithi, Nakshatra, Yoga and Rasi/Lagna; metadata states Navamsa Pushkara Lagna feature | Full calculation algorithm, per-second Navamsa Pushkara intervals, full Dhruva table |
| Suddha Thirukanitha Sarva Muhurtha article, Sep 2015 p.25 | Five Panchaka inputs and four explicit Dhruva values: Mesha 5, Simha 7, Kumbha 4, Meena 6; categories 1–8 and its marriage note that values 6 or 7 are accepted | The other eight Dhruva cells are not stated in the passage; the divisor / exact remainder wording and day/night sentence need a clear original-page scan / author confirmation |

**Implementation decision:** use Sri Thanigai's 2026–27 ephemeris / Lagna-Manam as the calculation-time reference for the calendar, and the September 2015 Sarva Muhurtha article as the primary Panchaka marriage-rule source, exactly as the user approved. Do not import the Rishabha 7 / Makara 2 values from the alternate 2012/2017 articles into that source's table. Do not infer 0 for the eight missing cells. Do not implement a final Panchaka verdict until the source explicitly resolves those cells and the divisor / remainder convention. The general five-factor structure and the four published Dhruva values can be unit-tested independently.

**Pushkara decision:** the branch may continue displaying the selected-time Lahiri Lagna's Pushkara Navamsa status as a standalone computed attribute. The Sri Thanigai list confirms a named “Navamsa Pushkara Lagna” feature but does not provide the actual algorithm; source confirmation is still required before using that feature to select a final Thali moment. Per the user's explicit UI instruction, no disclaimer stating that it is not the final Thali time is to be displayed.


## 12. Document 50 scanned marriage table and rule integration — 2026-11-18

The five repository scans were OCR-processed on the isolated branch `temp/document50-ocr-20261118` using Tesseract Tamil + English with PSM 3, 4, 6 and 11. The raw outputs are retained on that temporary branch. The new rules below are integrated into this PR branch only; `main`, production deployments and user storage were not changed.

Primary scan references:
- [Document 50_1 — Muhurtha rules and Panchaka](https://github.com/smvastrorajaram-hub/smvastroservices/blob/main/Read-only/Document%2050_1.jpg)
- [Document 50_2 — associated reference table](https://github.com/smvastrorajaram-hub/smvastroservices/blob/main/Read-only/Document%2050_2.jpg)
- [Document 50_3 — Parabhava 2026–27 marriage date rows](https://github.com/smvastrorajaram-hub/smvastroservices/blob/main/Read-only/Document%2050_3.jpg)
- [Document 50_4 — remaining Parabhava rows and Pushkara explanation; Pilavanga table starts](https://github.com/smvastrorajaram-hub/smvastroservices/blob/main/Read-only/Document%2050_4.jpg)
- [Document 50_5 — Pilavanga 2027–28 rows and repeated rules](https://github.com/smvastrorajaram-hub/smvastroservices/blob/main/Read-only/Document%2050_5.jpg)

### 12.1 Annual marriage-date transcription

The new module `public/horoscope/calendar-muhurta-activities.mjs` adds a Document 50-specific date lookup. It is intentionally separate from the existing external published Subha Muhurtham list and the Apsara September 2015 marriage-month helper.

- Parabhava 2026–27: 57 distinct Gregorian dates are now reconciled. The final Karthigai row is confirmed as Tamil month-day 27 / 13-12-2026 / Sunday / Chaturthi / Thiruvonam. The 13-12-2026 date was already present in the transcribed date set, so it is not duplicated; the previous unresolved-row count is now zero. OCR variants that read 18-12 or 19-12 were date-column alignment/recognition errors for this row, not additional dates.
- Pilavanga 2027–28: 41 Gregorian dates were transcribed from the pages supplied, covering 18 April 2027 through 10 December 2027. Later dates are outside the supplied table coverage and return unavailable.
- The date lookup returns “listed” or “not listed in the scanned date rows” within the observed coverage. “Not listed” is not a full time-specific rejection. A date outside the supplied table ranges returns unavailable.
- A listed annual date is not, by itself, a final marriage approval. The source also requires checking the selected time, couple-specific stars, Panchaka, Yoga and Lagna conditions.

### 12.2 Document 50 Panchaka — a separate source tradition

The scan defines five 1-based counts for the Panchaka day/time:
1. Weekday: Sunday = 1 through Saturday = 7.
2. Tithi: count from Pratipada to the current Tithi within its Paksha.
3. Nakshatra: count from Ashwini to the current Nakshatra.
4. Lagna: count from Mesha to the current Lagna.
5. Add the Lagna-Dhruva number.

The total is divided by 9. The scan expressly says remainders 3, 5 and 7 are Uttamam; remainders 1, 2, 4, 6 and 8 are inauspicious. It does not classify remainder 0, so the implementation returns “not stated by Document 50” rather than treating 0 as 9 or as favourable.

The only Dhruva cells legible in the supplied rule scan are:
- Mesha = 5
- Rishabha = 7
- Makara = 2
- Kumbha = 4
- Meena = 6

The other seven signs are not assigned a zero by assumption. The helper returns “source does not state a Dhruva value” for them. This Document 50 mapping is deliberately separate from the September 2015 Apsara article (which states Simha 7 instead of Rishabha 7 / Makara 2). The two editions must not be merged into a synthetic table.

The printed remainder classes identify Mrityu (1), Agni (2), Raja (4), Chora (6) and Roga (8) Panchakam. The additional day/night and ceremony-specific exception sentences are partially unclear in OCR and are not yet applied. Their exact exception wording needs a legible source confirmation.

### 12.3 Selected-time exclusions implemented from the readable clauses

The Document 50 time-screen helper now checks:
- Tithis 4, 6, 8, 9, 12 and 14 within the Paksha.
- Tuesday and Saturday as excluded weekdays.
- Sunday as a caution, not an automatic block: the same scanned paragraph states that Sunday is scripturally excluded but accepted in practice, and the annual date tables themselves contain Sunday entries.
- Selected clock time against the calculated local Rahu Kalam and Yamagandam intervals.
- Kari Naal and Thaniya Naal using the existing SMV / Sri Thanigai day-classification functions; unavailable Thaniya source data stays a warning.
- Marana and Prabalarishta Amirthadi Yoga when the existing local-sunrise Nakshatra timeline returns those exact keys.

Utpata Yoga is named in Document 50, but the current Calendar Yoga table does not provide a separately verified Utpata key; it remains an explicit warning, not a guessed result. The couple's Janma-star exclusions, 8th-from-Chandra-Lagna star group, bride/groom-specific star counts, full planetary filters, Guru/Sukra Moudham dates and the full night/day Panchaka exceptions remain pending source/data confirmation.

### 12.4 Pushkara Navamsa and place-specific timing

Document 50 explains that the unparenthesized Thali time is the Pushkara Navamsa interval; a parenthesized time is a substitute Subha Graha Navamsa interval where Pushkara is not present in the stated Muhurtha span. Its example table is calculated for Salem Central Station. It points to page 107 for place-specific minute corrections, and says the printed times may be reused unchanged only within 50 km.

The page 107 table is not among the five supplied scans. Rather than applying guessed minute offsets, the Calendar now recalculates the local morning Pushkara intervals directly from the selected place's latitude, longitude and local timezone using the repository's local Swiss Ephemeris WASM. It sets Lahiri sidereal mode, calls the same Swiss Ephemeris houses_ex / Sripati Lagna calculation used by the Calendar, scans the complete local 03:00–12:00 morning range in 30-second steps, and refines each Pushkara entry/exit boundary by bisection to one second. The result is a list of place-specific start/end windows; it is not copied from Salem and does not need the p.107 printed correction table. IANA timezone offsets are resolved at each local sample when a location timezone is available; a manually entered location uses the supplied UTC offset.

This verifies the astronomical Pushkara-Lagna interval for the selected date and place. It does not by itself approve a wedding time: the time must still be within Document 50's published marriage date/time eligibility, and must pass Panchaka, Tithi, Yoga, Rahu/Yamagandam, Kari/Thaniya, couple-star, planetary, and any source-specific substitute Graha Navamsa conditions. The currently supplied scan does not expose every one of those rules clearly enough to claim a complete marriage verdict.

### 12.5 Page 2 sex-prediction table is not implemented

Document 50_2 contains a table purporting to predict whether a child will be male or female. SMV will not digitise, calculate or display a fetal-sex prediction feature. India's PCPNDT Act, 1994 prohibits communicating the sex of a foetus (section 5(2)) and prohibits sex determination and sex selection (section 6). The official IndiaCode text and Ministry of Health handbook describe these prohibitions:
- https://upload.indiacode.nic.in/view-casepdf?id=AC_CEN_12_13_00013_199457_1517807323443&type=act
- https://www.mohfw-dohfw.gov.in/static/uploads/2026/10/5c2716ba4b5e68c8fa2a27956fb16568.pdf

### 12.6 Preview state and cache safety

This work extends the existing Draft PR #532; no duplicate PR is created. The new Document 50 helpers and tests are part of the PR branch only. The UI exposes the source date lookup, selected-time calculation, five-factor Panchaka components, selected-time restrictions, and coordinate-derived local morning Pushkara start/end intervals. It deliberately labels unresolved source rows and incomplete personal/planetary/Yoga checks instead of rendering a complete marriage verdict.

No production merge, production deployment, origin-wide storage deletion or user-data reset is part of this change.


### 12.7 Panchaka remainder 0 / traditional 9 — verified correction

The five-factor calculation and the readable Document 50 Lagna-Dhruva entries are unchanged. The new cross-check is limited to the **remainder category**:

- The [TamilMuhurtham Panchaka calculator](https://tamilmuhurtham.in/panchakam-calculator-in-tamil/) explicitly groups **9 (அ) 0** as **நிஷ்பஞ்சகம் / அமிர்தம்** and says remainders 0/3/5/7/9 are auspicious, while 1/2/4/6/8 are inauspicious.
- [Maalaimalar's “சுபமுகூர்த்தம் அமைப்பது எப்படி?”](https://www.maalaimalar.com/news/sirappukatturaigal/prasanna-jothidar-anandhi-special-article-about-puratasi) independently describes the five inputs (weekday, Tithi, Nakshatra, Lagna and Dhruva) and gives the same 0/3/5/7/9 favourable remainder class.
- [SRJ Astrology's Panchaka explanation](https://srjastrologycenter.blogspot.com/2018/03/blog-post_27.html) also corroborates the five-factor approach and the 0/3/5/7/9 favourable residues.

JavaScript's `total % 9` returns canonical residues 0–8. Therefore a traditional remainder of 9 is represented as **0** in code; it must not be treated as an unknown ninth outcome. The implementation now maps:
- **0 (traditional 0/9):** Nishpanchakam / Amirtham — `நிஷ்பஞ்சகம் / அமிர்தம்`
- **3, 5, 7:** Uttamam
- **1, 2, 4, 6, 8:** Panchaka Dosham

**Important source boundary:** Maalaimalar and other references are used here only to verify the residue classification. Their different Lagna-Dhruva tables are not imported. The five-factor counts, Paksha Tithi handling, and only the legible Document 50 Dhruva values remain as already implemented. Thus this correction does not invent missing Dhruva values or change the Document 50 input formula.
