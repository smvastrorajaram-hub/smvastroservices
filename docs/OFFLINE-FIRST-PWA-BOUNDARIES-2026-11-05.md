# SMV ASTRO / HOROSCOPE / CALENDAR — Offline-first UI boundary

Date: 5 November 2026

## Intended behavior

The first successful online visit downloads the app shell and the required local calculation assets. After that, the previously loaded UI and supported browser calculations can reopen without a network connection. While a connection is available, the service workers refresh static files from the network before replacing the cached copy. A failed network request may use the last successfully cached static copy.

This is not an offline conversion of backend services. It is a static UI and deterministic-calculation cache policy.

## Current synchronized cache release

The three app workers select a synchronized release marker by hostname. The Pages.dev host uses `SMV_CACHE_RELEASE=20261112-narrative-quality-pages-v1`; the main `.in` host uses `SMV_CACHE_RELEASE=20261112-narrative-quality-in-v1`. The three application cache namespaces remain independent. A Pages.dev-only change bumps the Pages.dev marker across all three workers; a public `.in` content or homepage change also bumps the `.in` marker across all three workers.

The production Android apps are remote-site WebViews, not bundled offline HTML packages. All three native WebViews now explicitly use `WebSettings.LOAD_DEFAULT` and configure Android's Service Worker runtime with `LOAD_DEFAULT` and network loads enabled. The hosted Service Worker then refreshes static UI files on successful online requests and serves the last cached UI/calculation assets offline. A web-only UI change is therefore delivered to the installed Android apps through their respective origin's updated Service Worker; an APK rebuild is needed when native Android code itself changes.

## App boundaries

- **SMV ASTRO:** cache the root page, static CSS/JavaScript, manifest and essential visual assets. Keep the existing India/place-search cache independent. The root worker does not intercept the nested Horoscope/Calendar scope.
- **SMV HOROSCOPE:** precache the static UI and its browser calculation stack, including the local Swiss Ephemeris/WASM provider, advanced/Dasa/transit modules and offline engine. Continue lazy caching of other same-origin static files as the user opens those features.
- **SMV CALENDAR:** retain the existing required shell/calculation/WASM precache and versioned cache migration. Preserve already downloaded India place shards while moving the Calendar cache version.

## Must remain online

No service-worker cache is used for authentication, Login/Register/Logout, Firebase/Firestore account reads or writes, Customer/Astrologer/Admin data operations, wallet balances or transactions, Razorpay checkout/verification, Live Call/Chat signaling, Booking Call/Chat, booking/session status, email delivery, or backend API requests. These requests must continue to fail or report their existing offline/network state when there is no connection; cached UI is not a substitute for live account or financial data.

## Location search — complete India pack for all three apps

All production worldwide location boxes use the Cloudflare Worker GeoNames endpoints while connected:
- `https://smvastroservices.astroservices.workers.dev/api/locations/search`
- `https://smvastroservices.astroservices.workers.dev/api/locations/timezone`

The Worker remains online-only. Offline searching is performed on-device from Cache Storage; no network request runs while disconnected. During first successful online Service Worker installation, each origin downloads and verifies all 28 versioned India place shards from the Cloudflare Pages static asset origin. The pack contains 557,995 India place records. The new worker does not activate until the pack has been stored and verified; an incomplete download leaves the previously active worker in place and must be retried online.

All three app scopes use a shared `smv-shared-india-places` Cache Storage namespace within one origin, avoiding three duplicate downloads on the Pages host. App shell/calculation caches and Service Worker scopes remain independent and use the synchronized release marker. Production app subdomains are separate origins, so each subdomain keeps its own local copy. Calendar migration preserves any previously downloaded shards.

Online GeoNames search remains worldwide. Offline data currently covers India only; locations outside India still require connectivity. India rows include stored coordinates and IANA timezones, so selecting a cached India location does not call the online timezone endpoint.

## Offline limits

A user must open each app online after deployment and let the one-time India location pack finish downloading before the new worker activates. After that, the complete India location index is searchable offline. Offline mode does not guarantee fresh server-published admin rules, login state, account dashboards, payment verification, notifications, consultations or server-generated email.

## Safety and regression boundary

- Use separate cache namespaces for ASTRO, HOROSCOPE, CALENDAR and place data.
- Do not clear origin-wide localStorage, sessionStorage, IndexedDB or Cache API storage.
- Do not force-reload an open form/report/session during worker activation.
- Never call Android `WebView.clearCache()`, `localStorage.clear()`, `sessionStorage.clear()` or origin-wide Cache API deletion to force an update.
- For future public website/PWA source changes, bump the Pages.dev `SMV_CACHE_RELEASE` across all three workers together. When a change also updates the `.in` homepage, sitemap or public content, bump the `.in` marker across all three workers too. Keep Pages.dev-only changes from needlessly changing the `.in` marker. The required CI guard enforces this separation.
- Keep every non-GET request outside the cache path.
- Bypass same-origin online-only API/account/financial routes even when they use GET.
