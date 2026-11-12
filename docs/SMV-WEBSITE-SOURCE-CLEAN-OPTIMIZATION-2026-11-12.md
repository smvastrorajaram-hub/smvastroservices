# Website Source Clean Optimization Audit — 12 November 2026

## Scope and safety

This is a source-level audit and a first, narrowly scoped performance change for the current `main` website family: the main SMV ASTRO site, the SMV HOROSCOPE sub-site/PWA, and the SMV CALENDAR sub-site/PWA. It follows the earlier report-only audit in `SMV-WEBSITE-SOURCE-OPTIMIZATION-AUDIT-2026-10-29.md`.

This PR does not change authentication, Firebase identity/profile/roles, Wallet balances or ledgers, Recharge/Razorpay, Live/Booking billing, Commission, payout, horoscope calculations, Marriage Matching calculations, or user data. It does not clear localStorage, sessionStorage, IndexedDB, or origin-wide Cache Storage. It does not force-reload open pages or alter calendar calculations.

## Measured source findings

Measurements below are repository source measurements, not compressed transfer sizes or browser timings.

| Source file | Characters | Lines | Findings |
|---|---:|---:|---|
| `public/smvastro.css` | 607,560 | 4,428 | 7,313 `!important` declarations; 3,570 parsed leaf rules; 302 repeated selector/context groups |
| `public/horoscope/horoscope.css` | 420,867 | 2,977 | 4,740 `!important` declarations; 2,631 parsed leaf rules; 259 repeated selector/context groups |

The repeated selector groups are **not automatically dead CSS**: their declarations differ, and media/cascade order may be intentional. The source scan found no exact repeated leaf-rule bodies in either file. Therefore this PR does not run a blanket `!important` removal or mass selector consolidation. Those changes require selector-specific cascade proofs and screen/print regression coverage.

The Horoscope document initially referenced four output-only stylesheets from the head:

| Stylesheet | Raw source bytes |
|---|---:|
| `chart-style.css` | 6,548 |
| `horoscope-readings.css` | 16,392 |
| `v358-result-layout.css` | 6,405 |
| `marriage-basic-report.css` | 18,964 |
| **Total deferred from initial render path** | **48,309** |

These styles are needed for generated reports/charts or Marriage Matching, not for the first Horoscope input screen.

## Changes in this PR

1. The four report-only stylesheets are no longer render-blocking links in the initial Horoscope HTML.
2. Chart/report styles are loaded when the user first requests a Horoscope result. The generate action is replayed only after the CSS and calculation modules are ready; load failures are shown through the existing status message and can be retried.
3. Marriage Matching styles are loaded alongside its existing IntersectionObserver/hash-triggered module loader. Direct navigation to the Matching section remains supported.
4. The four CSS assets remain in the Horoscope Service Worker core cache and are added to the required offline shell list. Query-versioned lazy stylesheet requests can use the worker's existing search-independent cache fallback. This preserves offline report presentation rather than trading it away for a faster first paint.
5. The Astro, Horoscope, and Calendar Service Worker release markers are updated together for both Pages.dev and .in. The workers do not clear origin-wide user data; the Calendar worker receives only the synchronized cache-key update.
6. A dedicated regression test verifies eager-link removal, lazy CSS/engine order, Matching entry points, offline precache retention, and synchronized cache markers. The existing lazy-engine tests continue to run in the same GitHub Actions workflow.

## Performance interpretation

The code removes 48,309 raw CSS bytes from the *initial render-blocking stylesheet path*. It does **not** prove a 48 KB network-transfer reduction: the Horoscope worker continues to precache these files so they are available offline, and browser/network behavior depends on whether the worker already controls the page. No Lighthouse, WebPageTest, device-level FCP/LCP, or runtime CPU profile is claimed by this source-only PR.

## Remaining root-cause work identified for later, separately verified batches

- Audit repeated selectors by declaration/property, specificity and media context; only remove a declaration when the final cascade is demonstrably unchanged.
- Profile the main `smvastro.mjs` startup path and separate admin/dashboard/wallet/live feature code only where call-site and route tests prove it is safe.
- Re-check server body-parser ordering, upload routes and webhook raw-body signature handling before changing parser limits.
- Audit Calendar build output and the public offline asset graph before removing copied files.
- Measure real Core Web Vitals and CPU/parse cost on low-end Android, desktop, cold cache and warm cache.
- Keep cache-version changes synchronized across all three PWAs for any later shared website source changes.

A source audit is not a replacement for visual review at desktop/mobile widths, print/PDF verification, offline cold-start tests, or the full financial/calculation regression suite. Those checks remain explicit merge gates.
