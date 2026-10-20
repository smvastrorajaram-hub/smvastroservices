# SMV ASTRO — Asset Optimization Audit and Fixes

**Date:** 2026-10-20  
**Baseline:** main branch before this change  
**Status:** Source changes proposed on a feature branch. CI and browser/device validation must pass before merge.

## Measured source inventory

The tracked repository tree contained 390 files and about 120.75 MiB of raw blobs at the audit point. This includes source textbooks, screenshots and other repository-only material; it is not the website download size. The offline India GeoNames dataset has 28 logical letter shards, about 62.81 MiB of raw JSON, and 557,995 declared place records.

The Horoscope HTML eagerly loaded six large reading/prediction bundles before the user asked to create a chart or open Marriage Matching: `horoscope-life-engine.js`, `d9-reading.js`, `horoscope-judgement-engine.js`, `integrated.js`, `d1-time-reading.js`, and `prediction-synthesis.js`. Their combined tracked raw size was about 1,439 KiB. Transfer size depends on host compression and browser caching.

## Gate A — Defer heavy Horoscope-reading engines until first use

- Removed those six bundle tags from the initial HTML request list without deleting or renaming those six calculation/reading source files.
- Added a single bootstrap that loads these scripts when the user first requests Horoscope generation or opens the Admin rules entry. Concurrent taps are coalesced and the original click is replayed after dependencies load.
- The dependency manifest preserves the prior runtime execution order while requests may download concurrently; the lazy classic scripts set `async=false`.
- Marriage Matching waits for the shared dependency loader before loading its own script.
- Kept offline calculation boot, Horoscope form/renderer, auth/report store, published prediction-rule channel, rule engine/sync, Admin modules and PWA controller on their existing paths.
- Added a runtime harness for initial script tags, order, first-click replay, Matching dependency readiness and retained Admin/auth/report assets.

## Gate B — Do not download all place data during Calendar PWA installation

- Removed the generated list of all 28 GeoNames letter shards from the Calendar service-worker install core.
- Kept the place-search modules, manifest, all underlying data records, and all split or unsplit data parts in the repository.
- The Calendar worker continues to cache a missing requested resource on demand; the dedicated Horoscope offline worker also uses the existing lazy offline cache policy for `/horoscope/offline/` assets.
- Rotated the Calendar cache name so activation evicts the old cache that had preloaded the bulk place data.
- Updated the service-worker test to check both legacy full-shard filenames and split filenames, and to request a real split part (`k-00.json`) in its cache-on-demand fixture.

## Gate C — Split oversized place data and move scanning off the main thread

- Split large letter datasets into physical parts of at most 12,000 records each while preserving the manifest's per-letter totals and the complete 557,995-record total. Small letters retain a single file.
- Added `place-search-worker.mjs` as the main path for JSON parsing, alias normalization, candidate scanning, ranking and display formatting, so large-list scanning does not block the Horoscope/Calendar UI thread.
- The worker loads only the selected letter's parts, coalesces concurrent part fetches, keeps bounded result caches, reuses matched candidates when the query extends a prefix, yields periodically during long scans, and accepts cancellation messages.
- Retained deterministic exact/prefix/word-boundary/substring ranking, population tie-breaking, result limits, latitude/longitude, GeoNames identifiers and IANA timezone values.
- Retained a non-Worker fallback using the same search engine. Added regressions for manifest totals, every declared data part, ranking, result caching, split-shard loading, Worker usage and fallback behavior.
- Fixed the test harness to install its mocked `fetch` before dynamically importing the place-search module; the fallback engine captures its fetch dependency during module initialization.

## Gate D — Remove dormant public duplicates only after consumer migration

- Removed `public/horoscope/server.js`, the browser-published copy of a Node backend. The real root `server.js` remains present; `package.json` still starts `node server.js`, and `render.yaml` still uses `npm start`.
- Removed the stale `public/horoscope/horoscope-predictions.js` bundle only after confirming the current Horoscope entry point no longer loads it and the current `horoscope.js` renderer owns the live C.G. Rajan and B.V. Raman Ayurdaya appendix mounts through the offline report modules. The Ayurdaya placement and Save/Print guard tests now test this live source path and assert the retired bundle is absent.
- Removed duplicate maskable icon files after manifests were checked to use the existing `icon-512.png` resource for both standard and maskable purposes.
- Removed the retired `v359-symmetric-gutters.css` file; the current Horoscope page references `v358-result-layout.css`, which contains the live result-layout rules.
- Expanded regression workflow path filters so changes to place-search modules/data, the Calendar cache, related manifests, deleted public duplicates and the Ayurdaya cleanup guards trigger relevant checks.

## Preservation boundary

This change does not alter astrology calculation formulas or calculated values; matching factor rules; login/session or dashboard restoration; Admin feature gating; payment behavior; saved-report storage; browser-native Print/PDF implementation; report identity; Tamil fonts; approved cover art; Firebase request policy; or published rule contents. All India place records remain available as source assets. Only the Calendar install-time bulk download is removed; place data is fetched lazily by the selected letter.

## Validation status and remaining work

- Added automated lazy-load/click-replay, Calendar install/cache, split-place-manifest and search-ranking regression gates.
- CI must run on the pull request; **PASS has not yet been claimed** for these changes.
- Browser network-waterfall measurement, fresh-install/reinstall checks on Android Chrome/PWA, offline search after a selected letter has been visited, actual Tamil/English chart generation, and production device profiling have not been performed by source inspection alone.
- CI success certifies only the automated source/runtime harnesses. It does not substitute for browser/device validation or claim a measured real-device speedup.
