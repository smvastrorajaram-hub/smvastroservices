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
