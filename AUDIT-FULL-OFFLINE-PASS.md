# SMV HOROSCOPE — Strict Offline Runtime Audit
Date: 2026-10-02

## Final architecture
- Login / Register / Logout: online authentication retained intentionally.
- Horoscope calculation: direct bundled offline engine.
- Advanced Analysis: direct bundled offline engine.
- Marriage Matching / Nakshatra Porutham: direct bundled offline engine.
- Transit / Panchang: bundled Swiss/WASM runtime.
- Place Search: bundled India place shards.
- Horoscope payment, server calculation, online geocode, saved-report/cloud storage flows: not part of this offline Horoscope runtime.

## Source audit
PASS — No `/api/`, Razorpay, Cloudinary, Render backend, or `SMV_BACKEND_URL` dependency remains in Horoscope calculation / Advanced / Marriage / Transit / Panchang / Place Search runtime files.

`horoscope-auth.mjs` is intentionally excluded from this assertion because authentication is the one online feature requested to remain.

## Service worker audit
PASS — all Horoscope runtime assets, Swiss WASM/data and all India place shards are listed in the precache.
PASS — after installation, same-origin Horoscope runtime requests are cache-only. There is no runtime network fallback. Missing uncached assets return HTTP 503 instead of silently contacting the server.
NOTE — network is necessarily used during initial install/update to seed the offline cache. Cross-origin authentication is not intercepted.

## Runtime engine test
Test input: 1992-07-31, 22:05, Perambalur coordinates, UTC +05:30.
PASS — chart returned 9 planets.
PASS — Advanced Analysis returned.
PASS — Phase-4/Dasa returned.
PASS — Transit returned.
PASS — Birth Panchang returned.
PASS — bundled offline place search returned Perambalur without a geocoding API.

## Result
FULL OFFLINE HOROSCOPE RUNTIME: PASS
Authentication: ONLINE BY DESIGN
