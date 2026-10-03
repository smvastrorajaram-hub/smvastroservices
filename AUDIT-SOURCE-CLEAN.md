# SMV ASTRO — Public + Horoscope Source Clean Audit
Date: 2026-10-02

## Final architecture
- Horoscope calculations: browser-local only.
- Advanced Analysis: browser-local only.
- Dasa/Bhukti/Antaram: browser-local only.
- Transit/Panchang: browser-local only.
- Marriage/Nakshatra Matching: browser-local only.
- Horoscope place search: bundled offline India place database.
- Login/Register/Logout: online authentication retained.
- Main SMV ASTRO Ask Question / Private Consultation payment systems: retained and not treated as Horoscope payment.

## Removed from public UI/source
- Admin "Horoscope Paid Features" card and Advanced/Marriage price controls.
- Firestore read/write logic for `smv_settings/horoscope_features` in public admin JS.
- Hidden Saved Horoscope / Saved Marriage Matching UI and placement anchors.
- Horoscope payment and saved-report script imports.
- Dead legacy homepage horoscope location/generator scripts that still called `/api/geocode`.
- Obsolete saved-report CSS selectors.

## `/api/geocode` finding
The server route was introduced as birth-place autocomplete (`SMV-ASTRO/142 birth-place-autocomplete`). Remaining references outside `/horoscope/` were only dead legacy homepage horoscope scripts: their expected `tamilBirthPlace` / `englishBirthPlace` elements are not present in the current public page. `public/location_autocomplete_v142.js` was also not referenced by current HTML/runtime. Therefore no active non-Horoscope feature depended on `/api/geocode`, and the server route was removed.

## Server cleanup
Removed `/api/geocode` and its rate-limit/provider code. Previous Horoscope calculation/payment/saved-report server routes remain absent. No `/api/horoscope`, `/horoscope-feature`, `/horoscope-reports`, or `/api/geocode` routes remain.

## Service Worker
Horoscope runtime is cache-only for same-origin GET application assets. Network is used only during install/update to seed the cache. A cache miss returns HTTP 503 rather than falling back to network. Authentication traffic remains separate.

## Verification
- Forbidden Horoscope online route references: 0
- Removed payment/saved UI identifiers: 0
- Non-static network fetches in Horoscope runtime calculation files: 0
- `server.js` syntax: PASS
- `public/smvastro.mjs` syntax: PASS
- Horoscope JS/MJS syntax checks: PASS
- Offline sample full engine: PASS (chart + 9 planets + Advanced + Phase4 Dasa + Transit + Birth Panchang)

Note: bundled offline place JSON and WASM assets are fetched by the browser from the local/site origin and cached by the Horoscope service worker; they do not call the Render/API server.
