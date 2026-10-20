# SMV ASTRO — Source-Level Asset Optimization Audit

**Date:** 2026-10-20  
**Branch:** `perf/lazy-horoscope-engines-calendar-place-cache`  
**Baseline:** `main` before this optimization set  
**Status:** Source changes are prepared on a feature branch. CI/device results are not assumed until reported.

## Inventory and measurable findings

- The branch tree measured about **118.82 MiB** of raw repository blobs. This is not the compressed transfer size users receive.
- The location dataset has **557,995** records declared by the top-level manifest, with GeoNames attribution and CC BY 4.0 retained.
- Large single JSON assets were up to **8.5 MiB** before splitting. Frequently queried letters now use split files of at most roughly **1.45 MiB** each; split parts are still the same source rows, in their original order.
- The metadata inherited from the previous manifest has a discrepancy: top-level `records=557995`, whereas the sum of the per-letter `records` fields is **564,840**. The new regression reads every deployed location JSON, verifies each part's actual length, counts distinct GeoNames IDs, and requires the distinct ID count to match the published 557,995 dataset contract. CI must pass that assertion before merge; the metadata discrepancy is not silently hidden by changing the top-level number.
- Six large Horoscope reading/prediction bundles previously fetched with the initial HTML total roughly **1,439 KiB raw**.
- Duplicate 512×512 maskable PNG files were byte-identical to their ordinary 512×512 PNG counterparts in both app scopes: removing the duplicate copies eliminates about **842,221 raw bytes** while retaining the existing 512px files and both manifest purposes.
- The prior public duplicate backend file and retired prediction bundle measured roughly **271 KiB** and **615 KiB** respectively, excluding compression. The required root `server.js` is preserved.
- Large art assets remain candidates for lossless/loss-aware encoding work. Examples in the branch include Horoscope desktop/mobile heroes (about 596/517 KiB), Horoscope logo (about 498 KiB), temple frame (about 570 KiB), and the approved marriage cover (about 388 KiB). They were **not re-encoded in this change**; do not infer compression savings.

## Changes prepared

### 1. Calendar PWA install-time cache

- Removed the auto-generated list that fetched every India location JSON during service-worker installation.
- Kept the manifest, place-search facade, Worker and `place-display.mjs` dependency in the installation core; no location data shards are eagerly fetched.
- The existing fetch/cache-miss path still caches a requested part on demand; an already searched letter's parts can be reused offline.
- Rotated the Calendar cache name so activation deletes the previous large bulk-preloaded cache.
- Added a service-worker test that checks zero place-part fetches during installation and verifies a shard gets cached when requested.

### 2. Place-search split files and Worker

- The large letter buckets in the manifest use bounded parts while preserving the original row order. The full repository location dataset and attribution notice remain present.
- Consolidated the new work on the existing `place-search-worker.mjs` engine instead of retaining a second competing Worker implementation.
- Worker search parses and scans the selected letter's parts off the UI thread, yields between batches, accepts cancellation messages, and keeps the prior deterministic matching/population sort. The parsed letter-shard and prefix-candidate caches use a two-letter LRU bound to cap retained row memory.
- Kept a local fallback for browsers where module Workers are unavailable.
- Expanded `tests/place-search-regression.mjs` to load the full manifest/data, validate file/row counts and unique GeoNames IDs, check split-part loading, verify ranking/coordinates/timezone, and guard cancellation + Worker wiring.

### 3. Horoscope initial payload and dependency order

- Removed six large reading/prediction script tags from the eager HTML path. They load on the first Horoscope-generation interaction, then the original click is replayed once after dependencies resolve.
- Marriage Matching shares the same dependency loader before its own lazy script is loaded.
- The Admin button is not intercepted by the Horoscope generator's lazy-load guard; Admin remains independently reachable.
- The base/offline calculation boot, `horoscope.js`, forms, authentication, saved-report store, prediction-rule content/sync and Admin modules retain their existing script paths.
- Regression assertions check dependency order, one-time replay, protected eager modules, and saved-report/native print/PDF/font/approved-cover anchors.

### 4. Dormant public duplicates

- Removed `public/horoscope/server.js`; the production root `server.js` and `package.json` startup contract remain.
- Removed `public/horoscope/horoscope-predictions.js` after confirming it was not loaded by the active Horoscope HTML and updating old regression checks to assert its absence.
- Added a regression guard to prevent either retired public file from being accidentally reintroduced.

### 5. CSS consolidation and PWA icons

- Integrated symmetric gutters into the existing `v358-result-layout.css` owner declarations, removed the separate stylesheet/link, and eliminated the copied late V359 override block. The Horoscope/Maching parent frame owns the gutter; inner panels use the existing result rules instead of another appended reset stack. Browser smoke tests/workflows remain available.
- Removed the byte-identical duplicate `icon-512-maskable.png` copies; manifests use the same existing 512px PNG for `any` and `maskable` purposes.
- Added assertions for CSS ownership, responsive browser smoke presence, native print CSS/JS/HTML presence, and PWA manifest icon references.

## Preserved without optimization edits

No calculation formula or Dasa/Marriage Matching calculation module was rewritten. No Swiss Ephemeris WASM/data, ephemeris `.se1` data or license/source notice was deleted. Saved report generation, browser-native print/PDF files, Tamil font files, and the approved report-cover artwork remain untouched. Login/session/dashboard restore semantics, Admin feature gating, published prediction-rule data and Firebase quota-safe rule loading are also outside the edit set.

## Automated and manual validation

The isolated CI workflow now includes source/runtime regression tests for lazy loading, Calendar cache behavior, location-data integrity and Worker ranking, dormant assets, CSS/PDF guardrails and PWA icon deduplication. The existing responsive Horoscope layout and Marriage Matching print workflows remain in place.

**Not yet proven by source inventory alone:** browser network waterfall / compressed transfer size, physical Android/PWA reinstall and offline device tests, print-layout visual comparison on device, Firebase request/quota profiling, and before/after Web Vitals. Large hero/logo/cover re-encoding is intentionally left for a separate asset-by-asset visual and byte-size comparison.
