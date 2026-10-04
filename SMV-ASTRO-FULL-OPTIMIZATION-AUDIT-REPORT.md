# SMV ASTRO V208 — Phase 1–4 Re-audit & Re-optimization Report

Baseline chain audited: full source → V203 Phase 1 → V204 Phase 2 → V205 Phase 3 → V206 Phase 4 → V207 UI layer.

> Naming note: the Phase 4 package is V206, not V205.

## Executive result

| Area | Previous status | Re-audit finding | V208 result |
|---|---|---|---|
| Phase 1 — Firebase/Dashboard | Good | One duplicate Astrologer profile read remained in role-fallback path | REFINED / PASS |
| Phase 2 — Homepage/Public | Good | Same-shard concurrent location requests could duplicate manifest/shard fetch; no exact-query result cache | REFINED / PASS |
| Phase 3 — Matching/Offline Location | Mostly correct | `basicOnly` matching optimization was correct; concurrent Bride/Groom location requests could duplicate manifest/shard fetch | REFINED / PASS |
| Phase 4 — Horoscope/WASM | Partial | Initial core generation still used `full()`, causing Advanced/Tajaka/Panchang/Transit/Dasa work to be calculated and discarded, then calculated again | CORRECTED / PASS |
| V207 — UI/Design layer | Good | V207 stylesheets are already lightweight; mobile-only legacy stylesheet still blocked desktop parsing | REFINED / PASS |
| Locked business behavior | Required unchanged | Payment/server/rules/commission/matching formula/UI design CSS hashes checked | PASS |

## Phase 1 — Firebase / Dashboard

The original Phase 1 work materially reduced source-level Firestore calls: `getDoc(` occurrences went from 19 in the base source to 13, and `getDocs(` from 13 to 9. The final V208 source retains those reductions.

One remaining duplicate read was found: when role resolution had just fetched `smv_astrologers/{uid}` to identify an Astrologer, the Astrologer dashboard immediately fetched the same document again. V208 reuses the just-fetched authoritative document for that fallback path. Explicit Astrologer dashboard opens still perform the existing fresh profile read, so rejected status/rejection reason behavior is preserved.

Dashboard load dedupe, existing dashboard reuse, SSE handling, quota protections, Customer SUBMITTED-only behavior, compact IDs and server-side commission logic were not rewritten.

## Phase 2 — Homepage / Public / Main Location

Existing V204 optimizations were verified: lazy public content/reviews, cached public data, idle offer loading, lazy blog bodies, media `preload=none`, prefix-narrowed location search, normalized alias cache, and main-site service-worker isolation from Firebase/API/payment requests.

V208 adds two safe location optimizations:

- in-flight manifest/shard promise deduplication, so simultaneous requests for the same shard share one fetch;
- bounded exact-query result cache, while retaining the existing prefix candidate narrowing.

The main location script is cache-busted to V208, and the main service-worker cache is bumped.

## Phase 3 — Horoscope / Marriage Matching / Offline Location

The V205 public Nakshatra-only optimization is valid: `basicOnly:true` returns after the natal chart and skips Tajaka, Advanced, Panchang, Transit and Dasa work. Full Marriage Matching remains on its original full-calculation path.

A missing concurrency optimization was found in offline place search. Before V208, two simultaneous searches using the same first-letter shard could both fetch the manifest and the shard before either cache was populated. Test with concurrent `per` and `pond` searches:

- V205/V207 path: manifest fetches = 2, `p.json` fetches = 2
- V208 path: manifest fetches = 1, `p.json` fetches = 1
- returned place results: identical

V208 also fixes the offline result-cache limit key/slice consistency so the clamped maximum and cached result size always match.

## Phase 4 — Horoscope / WASM / Swiss calculation

This was the main incomplete optimization.

Before V208, the initial Horoscope generation called `SMVOffline.full()` but used only `full.chart`. That first call still calculated Tajaka, Advanced analysis, birth Panchang, daily Panchang, Transit and Dasa. Later, Advanced Analysis called `full()` again with a precomputed natal chart; only the natal chart was avoided, while the other expensive sections were recalculated.

V208 changes the orchestration without changing astrology formulas:

1. Initial core generation calls `full(..., basicOnly:true)` and calculates only the natal chart.
2. Advanced/full generation receives that precomputed chart.
3. Already-calculated Basic Panchang/Transit data can be passed as `__smvPrecomputedBasic` and reused only when language/date/time match.
4. Redundant explicit `calculateSwiss()` warm calls before `panchang()` / `transit()` are removed because those functions already perform their own required Swiss calculation.
5. A legacy Transit/Panchang helper received the same safe redundant-call removal.

Mocked orchestration verification:

- core `basicOnly`: chart 1; Tajaka 0; Advanced 0; Dasa 0; Panchang 0; Transit 0
- full with precomputed chart + matching Basic data: chart 0; Tajaka 1; Advanced 1; Dasa 1; Panchang 0; Transit 0
- full with daily date/time mismatch: chart 0; Tajaka 1; Advanced 1; Dasa 1; Panchang 1; Transit 1

The Swiss, Advanced, Dasa and Transit/Panchang formula engine modules themselves are unchanged.

## V207 UI / Design optimization re-check

The V207 design layers are already small relative to the legacy styles:

- root V207 stylesheet: 21,051 bytes (~5.2 KB gzip)
- Horoscope V207 stylesheet: 11,615 bytes (~2.9 KB gzip)

Those V207 stylesheet files are byte-for-byte unchanged in V208. The only UI-loading refinement is adding `media="(max-width: 899px)"` to the existing mobile-only `mobile-home-v185.css` link so desktop does not treat it as a render-blocking stylesheet. Its contents were already entirely mobile-scoped, so mobile appearance is unchanged.

Static duplicate-ID check: 0 duplicates in root `index.html` and Horoscope `index.html`.

## Locked-behavior regression protection

Byte-for-byte hash checks passed for critical files including `server.js`, payment timing/receipt, dashboard event/window helpers, answer credit, refund service, Firestore rules/indexes, Marriage Matching engine, Horoscope auth/report store, Swiss wrapper, Swiss Vedic engine, Advanced engine, Dasa engine, Transit/Panchang engine, and both V207 design stylesheets.

The only `smvastro.mjs` V208 change is the targeted duplicate Astrologer-profile-read reuse described above.

JavaScript/MJS/service-worker syntax checks passed. ZIP integrity check passed.

## Deliberate non-changes / remaining technical debt

Two areas were intentionally not aggressively rewritten in this correction:

1. The offline India place database is about 63 MB and the Horoscope service worker precaches all shards. This is heavier at install time, but preserves the current requirement for complete fresh-install offline location coverage. Converting it to on-demand shards would improve install cost but weaken that guarantee unless a new compressed/indexed offline strategy is designed.
2. Legacy `smvastro.css` (~738 KB) and `horoscope.css` (~679 KB) are large because of historical layered styles. V207 provides a small final design-system layer. Blindly deleting old selectors is not safe because many dynamic dashboard/report states use classes that static HTML analysis cannot see. A future CSS-compaction phase should be done only with authenticated Customer/Astrologer/Admin + Horoscope/Matching visual regression coverage.

## V208 changed files

Nine changed source files only:

- `public/index.html`
- `public/sw.js`
- `public/smvastro.mjs`
- `public/main-location-search-v187.js`
- `public/horoscope/index.html`
- `public/horoscope/sw.js`
- `public/horoscope/horoscope.js`
- `public/horoscope/offline/offline-engine.mjs`
- `public/horoscope/offline/places/place-search.mjs`

V208 is an overlay on the V207/full latest source and preserves the V207 visual design layer.
