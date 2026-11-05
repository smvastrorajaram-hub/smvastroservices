# SMV ASTRO / HOROSCOPE / CALENDAR — Offline-first UI boundary

Date: 5 November 2026

## Intended behavior

The first successful online visit downloads the app shell and the required local calculation assets. After that, the previously loaded UI and supported browser calculations can reopen without a network connection. While a connection is available, the service workers refresh static files from the network before replacing the cached copy. A failed network request may use the last successfully cached static copy.

This is not an offline conversion of backend services. It is a static UI and deterministic-calculation cache policy.

## Current synchronized cache release

All three app workers use `SMV_CACHE_RELEASE=20261105-smv-zip-assets-v1`. Their cache namespaces remain independent, but the release marker is shared. The CI guard requires every future change under `public/` to update all three service workers and change this common marker; a missing or unsynchronized bump fails the pull request.

The production Android apps are remote-site WebViews, not bundled offline HTML packages. All three native WebViews now explicitly use `WebSettings.LOAD_DEFAULT` and configure Android's Service Worker runtime with `LOAD_DEFAULT` and network loads enabled. The hosted Service Worker then refreshes static UI files on successful online requests and serves the last cached UI/calculation assets offline. A web-only UI change is therefore delivered to the installed Android apps through their respective origin's updated Service Worker; an APK rebuild is needed when native Android code itself changes.

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
- Never call Android `WebView.clearCache()`, `localStorage.clear()`, `sessionStorage.clear()` or origin-wide Cache API deletion to force an update.
- On every future public website/PWA source change, bump all three `SMV_CACHE_RELEASE` markers together; the required CI guard enforces this rule before merge.
- Keep every non-GET request outside the cache path.
- Bypass same-origin online-only API/account/financial routes even when they use GET.
