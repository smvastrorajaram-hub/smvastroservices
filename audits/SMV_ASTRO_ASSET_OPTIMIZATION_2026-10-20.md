# SMV ASTRO — Asset Optimization Audit and Fixes

**Date:** 2026-10-20  
**Baseline:** main branch before this change  
**Status:** Source changes proposed on a feature branch. Browser/device profiling is not claimed.

## Measured source inventory

The tracked repository tree contained 390 files and about 120.75 MiB of raw blobs at the audit point. That total includes source textbooks, screenshots and other repository-only material; it is not the website download size. The offline India GeoNames dataset has 28 separate JSON shards with about 62.81 MiB of raw JSON. The manifest declares 557,995 place records.

The Horoscope HTML eagerly loaded six large reading/prediction bundles before the user asked to create a chart or open Marriage Matching: horoscope-life-engine.js, d9-reading.js, horoscope-judgement-engine.js, integrated.js, d1-time-reading.js, and prediction-synthesis.js. Together their tracked raw size was about 1439 KiB. Actual transfer size depends on host compression and browser cache.

## Implemented root-cause changes

### Gate A — Defer heavy Horoscope-reading engines until first use

- Removed those six bundle tags from the initial HTML request list without deleting or renaming their source files.
- Added one bootstrap that loads the six scripts when the user first requests Horoscope generation or opens the Admin rules entry. Concurrent taps are coalesced and the original click is replayed once after dependencies load.
- Script tags use ordered dynamic execution. The dependency manifest preserves the previous runtime script order while the network requests can proceed together.
- Marriage Matching waits for the shared dependency loader before loading its own lazy script.
- Kept the offline calculation boot, Horoscope form/renderer, auth/report store, published prediction rule channel, rule engine/sync, Admin modules and PWA controller on their existing paths.
- Added a source/runtime regression gate for initial script tags, dependency order, click replay, Matching dependency readiness, and protected-flow anchors.

### Gate B — Cache India place shards on demand, not during Calendar PWA installation

- Removed the generated list of all 28 GeoNames place shards from the Calendar service-worker install CORE.
- Kept the place-search module, manifest and every shard file in the repository.
- The existing fetch/cache-miss path still caches a shard after it is requested online; a searched shard can then be reused while offline.
- Rotated the Calendar cache name so activation removes the prior bulk-preloaded cache rather than retaining the old large entries.
- Added a service-worker runtime regression proving installation requests zero full place shards and that an individually requested shard is cached on demand.

## Explicit non-change / preservation boundary

This change does not edit saved-report logic, report-store, browser-native print/PDF implementation, report-print assets, Tamil font files, approved cover artwork, login/session or dashboard restoration behavior, Admin feature-gating rules, published prediction-rule content, Firebase access/rate behavior, or astrology calculation formulas. The regression gate checks that key scripts and files remain present. The offline place dataset remains complete in the repository; a clean Calendar installation no longer preloads every unvisited letter's shard.

## Validation status

- Source-level lazy-loading and dependency-order gate: added.
- Simulated first-click/replay gate: added.
- Service-worker install and on-demand cache gate: added.
- Browser network waterfall, Android/PWA reinstall checks, print/PDF visual output checks, and Firebase quota/load profiling: not run here. CI passing certifies only the automated source/runtime harnesses; it does not substitute for device validation.
