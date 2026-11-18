# SMV CALENDAR — Exact Chandrashtama Rasi and Nakshatra-Pada windows

**Scope:** Add exact start/end timings for the complete Rasi-based Chandrashtama transit and each Nakshatra Pada within that Rasi. The existing Chandrashtama Rasi result, Panchanga, Hora, Tara Bala, Subha Muhurtham and unrelated Calendar calculations remain unchanged.

## 1. Existing Calendar behaviour

The existing Calendar calculates the transit Moon's sidereal Lahiri longitude and derives its sign by dividing the 0°–360° zodiac into twelve 30° Rasis. For the selected Janma Rasi, Chandrashtama is the eighth Rasi:

`ChandrashtamaRasi = (JanmaRasiIndex + 7) mod 12`

The existing card reports whether the selected Janma Rasi is affected at the selected Calendar time. It did not calculate the Moon's entry/exit instants or split the 30° transit into individual Nakshatra-Pada intervals.

## 2. Chosen method: the full eighth-Rasi transit

The new interval uses the same Rasi-based definition as the existing Calendar and Document 51's heading and table: the Moon's entry into the eighth Rasi starts Chandrashtama; leaving that Rasi ends it.

The sidereal Rasi interval is:

- Start: `30° × ChandrashtamaRasiIndex`
- End: `30° × (ChandrashtamaRasiIndex + 1)`, normalized across 360°
- Start boundary is inclusive; the next Rasi boundary is exclusive.

The 30° Rasi contains nine equal Nakshatra Padas. Each Pada is:

`360° / 108 = 3°20′`

Therefore the implementation returns one complete Rasi interval and nine sequential Pada intervals within it. Each start/end is obtained from the Moon's actual longitude boundary crossing, not by dividing the total transit duration evenly.

## 3. Astronomical timing

The worker reuses the repository's local Swiss Ephemeris WASM path:

- Geocentric Moon longitude
- Lahiri ayanamsa / sidereal zodiac
- Existing Swiss Ephemeris or Moshier fallback already used by Calendar
- Selected Calendar date/time and UTC/timezone configuration

The worker samples the Moon longitude along the upcoming 90-day timeline, unwraps the 0°/360° crossing, detects every target Rasi/Pada boundary, and refines each crossing by bisection to a one-second bracket. It then converts each instant to the selected IANA timezone; when a manually entered location has no IANA zone, it uses the explicitly stored UTC offset.

Moon's geocentric longitude is not made different by selecting a town. The selected place/timezone is used to present the astronomical instant as the correct local civil date and clock time. Document 51's printed table remains a reference for checking the annual Rasi entry/exit times; it is not copied as a fixed offset table.

## 4. Birth-star / Janma-Rasi consistency

Calendar already stores both the selected Janma Rasi and birth Nakshatra. Eighteen Nakshatras fit completely within one Rasi; nine cross a Rasi boundary, so the birth star name alone does not identify the Janma Rasi. The UI reports which pada or padas of the selected birth star fall inside the selected Rasi. If the selected star/Rasi pair is inconsistent, it warns the user and makes clear that the displayed transit windows are still based on the selected Rasi.

The nine split Nakshatras are Krittika, Mrigashira, Punarvasu, Uttara Phalguni, Chitra, Vishakha, Uttara Ashadha, Dhanishta and Purva Bhadrapada. The module and regression test explicitly check their Rasi/pada divisions.

A natal Pada does not change the full eighth-Rasi Chandrashtama window once the Janma Rasi is known. The transit Pada is different: all nine Padas occurring in the eighth Rasi are listed with their own exact start/end times.

## 5. Distinction from the 17th-Nakshatra shortcut

Some published explainers also describe a 17th-Nakshatra-from-birth-star calculation. That is a star-counting rule with a different interval and must not be conflated with the full eighth-Rasi transit. This implementation deliberately follows the full Rasi method already present in SMV CALENDAR and represented by Document 51. Any additional star-counting interpretation should be a separately labelled rule, not merged into this interval.

## 6. Reference cross-checks

- **User-supplied Document 51, page 42** — titled “சந்திரன் ராசிகளில் பிரவேசிக்கும் காலங்களும் சந்திராஷ்டமம் அடையும் ராசிகளும்”; the monthly table pairs Moon's Rasi ingress timing with the Chandrashtama Rasi.
- [Chandrashtama.in — What is Chandrashtama?](https://chandrashtama.in/what-is-chandrashtama/) — explains the eighth-Rasi definition, Rasi entry/exit and the Nakshatra/Pada content inside each affected Rasi.
- [Chandrashtama.in calculator](https://chandrashtama.in/) — demonstrates location/time-aware Moon-sign entry and exit output.
- [Jyotishya.date — Chandrashtama](https://jyotishya.date/chandrashtama) — independently describes the eighth sidereal sign from the natal Moon sign and the entry/exit interval.
- [Nava Panchangam — Chandrashtama](https://navapanchangam.com/chandrashtama/) — describes how the affected Rasi is determined from Janma Rasi and why the Pada is needed when a birth Nakshatra spans two Rasis.
- [Jathaka — Chandrashtama calculator](https://www.jathaka.com/chandrashtama-calculator/) — birth Nakshatra/Pada context and split-star mapping.
- [Swiss Ephemeris documentation](https://www.astro.com/swisseph/swephprg.htm) — source documentation for sidereal calculation and ayanamsa configuration.

## 7. Validation and safety boundaries

- Unit regression verifies the 12 Rasi targets, all 108 unique Nakshatra/Pada divisions, all nine split-star mappings, and the 3°20′ boundary arithmetic.
- Chromium preview verifies at least two upcoming windows in 90 days and all nine per-window Pada time rows.
- Calendar Service Worker precaches the new module for offline use.
- The same cache release marker is synchronised across SMV ASTRO, SMV HOROSCOPE and SMV CALENDAR. No origin-wide storage clear or user-data deletion is used.
- Main/production remain untouched until the user explicitly approves a merge/deploy.


## 8. User-directed display contract — selected Janma Rasi and its birth star only

The previous preview displayed all nine transit Padas in the eighth Rasi. The requested Calendar behavior is narrower: show only the selected Janma Rasi and a birth Nakshatra that actually belongs to that Rasi.

- The birth-star selector is populated dynamically from the selected Janma Rasi. A Nakshatra that does not fall in that Rasi is not offered.
- The birth-Pada selector offers only Padas of that Nakshatra that fall in the selected Janma Rasi. “All Padas” is the default; choosing a single Pada filters the Pada rows to that one birth Pada.
- For each future eighth-Rasi transit, the card shows:
  1. the full 30° Chandrashtama Rasi ingress-to-egress interval;
  2. the complete interval corresponding to the selected birth Nakshatra as it is projected into the eighth Rasi;
  3. the selected birth Nakshatra's own 1–4 Pada intervals (or only the chosen Pada when the Pada selector is set).
- A birth Pada is projected by adding exactly 210° (seven 30° signs) to its sidereal longitude interval. Its 3°20′ interval therefore maps to one specific Nakshatra/Pada in the eighth Rasi. The UI renders the transit star/Pada mapping and only the start/end local timestamps; it does not display unrelated transit Padas or explanatory caveats in the result card.
- For a birth Nakshatra crossing a Rasi boundary, only the Padas that belong to the selected Janma Rasi are used to build the selected-star interval. The dynamic selector prevents a random/incompatible birth star from being paired with the Rasi.
- Examples verified in Chromium:
  - Mesha + Ashwini: full Scorpio Rasi transit; full Ashwini projection is Vishakha 4 through Anuradha 3; Ashwini 1 → Vishakha 4. On 10-Nov-2026, Ashwini 1 is 02:48:28–09:19:30 IST.
  - Mesha + Bharani: full Bharani projection spans Anuradha 4 through Jyeshtha 3; Bharani 1 → Anuradha 4, Bharani 2 → Jyeshtha 1, Bharani 3 → Jyeshtha 2, Bharani 4 → Jyeshtha 3.
  - Simha + Pooram: full Pooram projection spans Uttara Bhadrapada 4 through Revati 3; Pooram 1 → Uttara Bhadrapada 4, Pooram 2 → Revati 1, Pooram 3 → Revati 2, Pooram 4 → Revati 3.

This 210° rule is explicitly a longitude-derived implementation refinement. It is not attributed to a verbatim clause on the supplied Document 51 or 1345.zip page 1. The source-described full eighth-Rasi interval remains visible separately.
