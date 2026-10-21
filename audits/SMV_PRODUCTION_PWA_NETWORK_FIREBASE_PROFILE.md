# SMV ASTRO — Production PWA, network and Firebase profile

**Scope:** low-volume, anonymous browser measurements against the deployed Cloudflare Pages site.
**Measurement source:** GitHub Actions Chromium/CDP; timestamps and transfer bytes are collected from live production HTTP requests, not estimated from repository file sizes.
**Privacy:** captures host/path, response status, duration and encoded transfer bytes only. It does not save request bodies, cookies, Firebase ID tokens, names, emails, UIDs or saved report contents.

## Automated scenarios

1. **Horoscope cold load:** fresh anonymous browser context at /horoscope/, Android-sized viewport/user-agent, service-worker registration/activation and web-manifest/icon checks.
2. **Real network timing:** three navigations with Chromium HTTP cache disabled. Report contains browser-native response-start, DOM-content-loaded and load-event times, CDP encoded transfer bytes, p50/p95 resource duration, and bytes by origin/resource type.
3. **Reinstall simulation:** unregister service workers; clear CacheStorage, local/session storage, IndexedDB and cookies in that empty anonymous context; reload and verify that the service worker and web manifest reinstall. This does not exercise the Android OS launcher or a physical Chrome Install app prompt.
4. **Calendar lazy-place cache:** fresh profile loads /horoscope/calendar/; checks manifest and active worker, confirms zero India location shards cached or requested at install, then searches Perambalur and confirms the selected split parts are downloaded and cached on demand.
5. **Quota-safety interaction profile:** records Firestore and Render-backend requests while idle, scrolling, making 20 harmless DOM changes and toggling Tamil/English. Then makes one anonymous, read-only call to the public prediction-rules ensureReady path and verifies that calling it again does not create another read.
6. **Static guards:** verifies the published-rule and saved-report source do not contain realtime Firestore listeners, interval polling or MutationObserver-driven reads.

## Limits and interpretation

- Network timings reflect the GitHub-hosted runner's current route to the live site. They are real measurements, but they are not a substitute for Jio/Airtel mobile-network measurements on the user's handset.
- Headless Chromium emulates an Android-sized mobile page but cannot install/uninstall the PWA shortcut in the Android launcher. A physical-device acceptance pass remains a manual check after this automated pass.
- Browser-observed Firestore HTTP/WebChannel requests quantify this anonymous client path only. They do not reveal project-wide Firebase quota totals, authenticated user profile reads, server-side Admin SDK calls or total daily operations. Project-wide read/write quotas need Firebase/Google Cloud Monitoring access; no credentials are stored in this workflow.
- This is a low-volume production check, not a stress test. It uses one read-only published-rules fetch and a small number of page navigations, and performs no write, account login, report save, payment or customer-data operation.

## Output

The Production PWA Network + Firebase Profile GitHub Actions run emits a JSON artifact named SMV-PRODUCTION-PWA-FIREBASE-PROFILE. It includes measured timing/transfer values, cache hit/miss evidence, Firestore transport counts and an explicit NOT_RUN field for physical Android launcher validation.
