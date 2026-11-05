# SMV ASTRO / HOROSCOPE / CALENDAR — Offline-first UI boundary

Date: 5 November 2026

## Intended behavior

The first successful online visit downloads the app shell and the required local calculation assets. After that, the previously loaded UI and supported browser calculations can reopen without a network connection. While a connection is available, the service workers refresh static files from the network before replacing the cached copy. A failed network request may use the last successfully cached static copy.

This is not an offline conversion of backend services. It is a static UI and deterministic-calculation cache policy.

## App boundaries

- **SMV ASTRO:** cache the root page, static CSS/JavaScript, manifest and essential visual assets. Keep the existing India/place-search cache independent. The root worker does not intercept the nested Horoscope/Calendar scope.
- **SMV HOROSCOPE:** precache the static UI and its browser calculation stack, including the local Swiss Ephemeris/WASM provider, advanced/Dasa/transit modules and offline engine. Continue lazy caching of other same-origin static files as the user opens those features.
- **SMV CALENDAR:** retain the existing required shell/calculation/WASM precache and versioned cache migration. Preserve already downloaded India place shards while moving the Calendar cache version.

## Must remain online

No service-worker cache is used for authentication, Login/Register/Logout, Firebase/Firestore account reads or writes, Customer/Astrologer/Admin data operations, wallet balances or transactions, Razorpay checkout/verification, Live Call/Chat signaling, Booking Call/Chat, booking/session status, email delivery, or backend API requests. These requests must continue to fail or report their existing offline/network state when there is no connection; cached UI is not a substitute for live account or financial data.

## Location search

Do not change its current behavior: online GeoNames place search and timezone resolution remain available when connected; bundled/cached India location data remains the offline fallback. Existing per-shard lazy caching is retained; this change does not download the entire India database or change the search ranking/results.

## Offline limits

A user must open the app online at least once after the new worker is deployed so the shell and required core assets can be saved. Optional images, modules and place-data shards are cached as they are requested; a feature or location shard that has never been downloaded may still require a first online request. Offline mode does not guarantee fresh server-published admin rules, login state, account dashboards, payment verification, notifications, consultations or server-generated email.

## Safety and regression boundary

- Use separate cache namespaces for ASTRO, HOROSCOPE, CALENDAR and place data.
- Do not clear origin-wide localStorage, sessionStorage, IndexedDB or Cache API storage.
- Do not force-reload an open form/report/session during worker activation.
- Keep every non-GET request outside the cache path.
- Bypass same-origin online-only API/account/financial routes even when they use GET.
