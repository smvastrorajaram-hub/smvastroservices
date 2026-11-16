# SMV CALENDAR — Place-based Rasi Mana

## Purpose

The Calendar's solar-ingress Lagna balance uses the rising-time measure of the selected place. It must not divide every 30-degree sign into an equal two-hour interval, and it must not approximate the remaining sign time by repeatedly sampling the Swiss ascendant at ten-minute intervals.

## Astronomical method

The calculation uses Oblique Ascension (OA), also called the oblique ascension of an ecliptic point, with the actual latitude selected in Calendar.

For tropical ecliptic longitude \(\lambda\), geographic latitude \(\phi\), and date-dependent mean obliquity \(\epsilon\):

- Declination: \(\delta=\arcsin(\sin\epsilon\sin\lambda)\)
- Right Ascension: \(\alpha=\operatorname{atan2}(\sin\lambda\cos\epsilon,\cos\lambda)\)
- Ascensional Difference: \(AD=\arcsin(\tan\phi\tan\delta)\)
- Oblique Ascension: \(OA=\alpha-AD\)

Calendar uses the current Swiss Ephemeris Lahiri ayanamsa to convert each nirayana sign boundary to tropical longitude before calculating OA. Mean obliquity is evaluated for the UT Julian Day of the solar ingress. For a sign, the forward OA difference between its beginning and end is its complete rising measure.

The traditional conversion used in the display is 360 OA degrees = 60 nazhigai = 3,600 vighati. Therefore 1 OA degree = 10 vighati, or 4 minutes. The 12 rounded sign values use a largest-remainder allocation so the complete set always adds to exactly 60 nazhigai without accumulating rounding drift.

At the solar ingress that defines the selected date's Sun sign, Calendar calculates the Lahiri sidereal ascendant and retains the matching Swiss local sidereal angle (ARMC). The current OA at the rising horizon is ARMC + 90 degrees. Calendar then calculates OA for the end of the current nirayana sign and takes the forward difference from that same-epoch current OA. This avoids reconstructing the horizon position from a rounded ascendant longitude and keeps the remaining balance tied to the exact Swiss horizon solution. The difference becomes the displayed Lagna balance in nazhigai and vighati.

## Place coverage

The calculation uses the selected place's numeric latitude. It is not limited to a list of Indian districts or a set of precomputed city tables. Therefore it applies to any location for which Calendar has valid coordinates.

The existing place-search boundary remains unchanged:
- India place records remain available offline through the current cached India location shards.
- Worldwide place search continues through the existing online GeoNames service.
- A worldwide place not already available in the offline India dataset still requires connectivity to search and select.

Longitude and the selected place's IANA timezone are used by the existing Calendar path to determine the correct local ingress date/time. Latitude determines that place's Rasi Mana.

## Polar limitations

At high latitudes, some zodiac signs can be circumpolar and do not rise on that date/latitude. The calculation marks those signs unavailable instead of inventing a rising duration. A complete 12-sign table is reported only when all 12 sign boundaries define rising intervals.

## Code and verification

- Calculation module: `public/horoscope/offline/rasi-mana.browser.mjs`
- Swiss Lahiri ascendant metadata: `public/horoscope/offline/swiss_vedic.browser.mjs`
- Calendar worker: `public/horoscope/calendar-worker.mjs`
- Offline cache: `public/horoscope/calendar/sw.js`
- Multi-latitude regression: `tests/calendar-rasi-palan-regression.mjs`
- Browser-level Swiss boundary comparison: `tests/calendar-rasi-palan-browser-smoke.mjs`

The regression set covers Perambalur, Chennai, Tiruchirappalli, London, New York, Sydney, Tokyo, and Quito, and verifies that all 12 sign measures total exactly 60 nazhigai. A polar fixture verifies that non-rising signs are explicitly unavailable.
