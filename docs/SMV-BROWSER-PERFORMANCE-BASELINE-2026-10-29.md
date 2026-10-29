# SMV Website Browser Performance Baseline

**Measurement date (UTC):** 2026-10-29 11:16:17  
**Runner:** GitHub Actions, Lighthouse CLI 13.6.0, Node.js 22, headless Chrome, Lighthouse default mobile emulation/throttling  
**Method:** 3 independent samples per site; median values shown below. This is a synthetic lab measurement, not Chrome UX Report (CrUX) field data and not a before/after improvement claim.

## Median results

| Site | Samples | Performance | Accessibility | Best practices | SEO | FCP (ms) | LCP (ms) | TBT (ms) | CLS | Speed Index (ms) | Transfer bytes |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| SMV ASTRO (`smvastroservices.in`) | 3/3 | 65 | 96 | 100 | 100 | 5271.4 | 5271.4 | 66.0 | 0.00 | 6221.6 | 1,864,048 |
| SMV ASTRO Pages fallback | 3/3 | 97 | 96 | 100 | 100 | 1292.2 | 1292.2 | 163.5 | 0.00 | 2603.8 | 2,642,557 |
| SMV HOROSCOPE | 3/3 | 57 | 91 | 100 | 100 | 6228.5 | 17355.3 | 157.0 | 0.00 | 7292.2 | 2,903,212 |
| SMV CALENDAR | 3/3 | 63 | 92 | 100 | 100 | 1143.2 | 4425.2 | 118.0 | 0.60 | 1874.3 | 841,474 |

## Prioritized findings

### 1. SMV HOROSCOPE: very slow LCP and large initial image payload
- Median Lighthouse Performance score: **57**; median LCP: **17.36 s**; median total transferred bytes: **about 2.90 MB**.
- Lighthouse identified `main > section#home > picture > img` (`assets/hero-mobile.png`) as the LCP element in one report.
- Each sample reported `assets/temple-frame.png` (~584 KB) and `assets/hero-mobile.png` (~530 KB). Lighthouse estimated **271–302 KiB** unused JavaScript and about **47 KiB** unused CSS on the first view.
- Next: verify responsive image delivery and whether the hero needs to be delivered at that size; then split clearly noncritical initial JS/CSS, preserving calculation and report behavior. Measure again after a controlled change.

### 2. SMV CALENDAR: large layout shift
- Median Performance score: **63**, median LCP **4.43 s**, median CLS **0.60**.
- The layout-shift audit points to `section#smvDailyCalendar > section.cal-input-zone` as the moving element (one sample attributed ~0.528 layout-shift score to that element).
- Lighthouse estimated about **286–289 KiB** unused JavaScript and **44 KiB** unused CSS on the landing view. This is consistent with reviewing the shared Horoscope bundle, but does not prove which files can safely be removed.
- Next: reserve stable dimensions for the input zone and async content; then perform Calendar allowlist bundle optimization. Preserve the full offline India location database and Swiss Ephemeris/WASM/vendor data.

### 3. SMV ASTRO main domain: variable LCP and first-view unused assets
- Median Performance score: **65**, median FCP/LCP **5.27 s**, transferred bytes **about 1.86 MB**.
- Three samples vary substantially: two have LCP near 5.27 s, while one is near 1.35 s. Treat this as a signal to repeat under controlled cache/network conditions, not as a stable single-point estimate.
- Lighthouse estimated about **275 KiB** unused JavaScript and **64 KiB** unused CSS. Split/consolidate the main module and CSS only through small behavior-tested PRs; do not remove shared Firebase, dashboard, Wallet or consultation code from unused-code heuristics alone.

### 4. SMV ASTRO Pages fallback: high median score, one outlier
- Median Performance score: **97**, median FCP/LCP **1.29 s**, transferred bytes **about 2.64 MB**.
- One sample had LCP around 6.3 s and Performance 61; the other two were near 1.3 s and Performance 97–98. Investigate this variance separately.
- Lighthouse estimated about **366 KiB** unused JavaScript and **61 KiB** unused CSS on the initial view. Some of this is external Google/AdSense/Firebase code; the estimate alone is not a reason to remove it.

## Individual sample variability

| Site | Performance scores (sample 1 / 2 / 3) | LCP values (sample 1 / 2 / 3) |
|---|---|---|
| SMV ASTRO | 65 / 65 / 100 | 5.27 s / 5.27 s / 1.35 s |
| Pages fallback | 61 / 98 / 97 | 6.27 s / 1.29 s / 1.28 s |
| HOROSCOPE | 53 / 73 / 57 | 17.75 s / 10.55 s / 17.36 s |
| CALENDAR | 62 / 63 / 64 | 4.47 s / 4.43 s / 3.48 s |

## Reproduction and evidence

- GitHub Actions run: [Browser Performance Baseline](https://github.com/smvastrorajaram-hub/smvastroservices/actions/runs/40863455451) — completed successfully.
- That run's artifact includes 12 raw Lighthouse JSON reports and `summary.md`: `smv-browser-performance-lighthouse` (artifact ID `12892388617`, 2.22 MB; expires 2026-11-28).
- This measures the currently deployed public URLs. It does not measure the proposed `defer` change in PR #237, which remains unmerged, and is not a before/after result.