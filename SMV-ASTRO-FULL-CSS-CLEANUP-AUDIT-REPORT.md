# SMV ASTRO V209 — Phase 6 CSS Source-Clean & Regression Audit

Baseline: V207 full UI/design layer + V208 Phase 1–4 re-optimization.

## Result

PASS. The two legacy CSS files were source-cleaned without deleting feature selectors based on guesswork. The cleanup is conservative and cascade-equivalent.

### Size / rule reduction

| File | Before | V209 | Raw reduction | Rules before | Rules V209 | Declarations before | Declarations V209 |
|---|---:|---:|---:|---:|---:|---:|---:|
| `public/smvastro.css` | 737,869 B | 562,104 B | 175,765 B (23.8%) | 3,698 | 3,411 | 10,822 | 10,039 |
| `public/horoscope/horoscope.css` | 679,024 B | 415,661 B | 263,363 B (38.8%) | 2,718 | 2,624 | 8,343 | 7,688 |
| **Combined** | **1,416,893 B** | **977,765 B** | **439,128 B (31.0%)** | **6,416** | **6,035** | **19,165** | **17,727** |

Gzip -9 comparison: `smvastro.css` 74,952 B → 67,834 B; `horoscope.css` 58,003 B → 50,465 B.

## What was cleaned

1. Exact repeated declarations with the same selector, same media/support context, same value and same `!important` state were removed while keeping the final effective declaration.
2. Rules made empty by that safe deduplication were removed.
3. Empty at-rules created by safe deduplication were removed.
4. Legacy patch comments and redundant formatting were normalized.
5. The extremely repeated exclusion suffix used to protect hero/banner/header/footer visual islands was replaced by the short neutral alias `.smv-css-island`.
   - Main site alias roots: `.smv33-hero`, dynamically-created `.smv-home-offer-banner`.
   - Horoscope alias roots: `.site-header`, `.temple-hero`, `.site-footer`.
6. CSS cache query versions and both service-worker cache names were bumped to V209 so stale V208 CSS cannot remain active after deployment.

## Regression protection

### Cascade-equivalence proof

For each legacy CSS file, the V209 stylesheet was expanded back from `.smv-css-island` to the exact original exclusion selector and normalized with the same safe duplicate-elimination rule. The complete ordered rule/at-rule/declaration signature then matched the pre-cleanup stylesheet.

- `smvastro.css`: **CASCADE_EQUIVALENT_PASS**
- `horoscope.css`: **CASCADE_EQUIVALENT_PASS**

This verifies that the cleanup did not change effective CSS declarations; it removed only repeated identical work and shortened equivalent scope selectors.

### Authenticated/dynamic state coverage

No authenticated dashboard selector was removed based on runtime visibility or unauthenticated page coverage. Customer, Astrologer and Admin dynamic selectors were retained. The cleanup algorithm operates on identical duplicate declarations rather than guessed unused selectors, so logged-in-only states remain present.

### Functional lock verification

Byte-for-byte unchanged from V208:

- `public/smvastro.mjs`
- `public/main-location-search-v187.js`
- `public/payment-receipt.js`
- `public/dashboard-events.js`
- `public/smv-ui-v207.css`
- `public/horoscope/smv-ui-v207.css`
- `public/horoscope/horoscope.js`
- `public/horoscope/marriage-matching.js`
- `public/horoscope/marriage-matching.css`
- `public/horoscope/offline/offline-engine.mjs`
- `public/horoscope/offline/places/place-search.mjs`

Therefore payment flow, Firebase/dashboard quota logic, compact IDs, Customer SUBMITTED-only behavior, Astrologer 24-hour commission, horoscope/matching formulas, V205/V208 location optimization, V206/V208 WASM calculation reuse, and the V207 design system were not modified in this phase.

## Validation

- CSS parser: PASS for both cleaned stylesheets.
- JavaScript syntax: PASS for `offer-banners.js`, main `sw.js`, Horoscope `sw.js`.
- Duplicate HTML IDs: PASS for main and Horoscope pages.
- CSS island root mapping: PASS.
- Exact changed-source scope: 7 files only.

## Changed files

- `public/smvastro.css`
- `public/horoscope/horoscope.css`
- `public/index.html`
- `public/horoscope/index.html`
- `public/offer-banners.js`
- `public/sw.js`
- `public/horoscope/sw.js`

## Note on visual-regression method

A live Firebase-authenticated browser login was deliberately not used, because CSS cleanup should not generate Firebase reads or touch account state. Instead, authenticated-only selectors were preserved by construction and the full stylesheet cascade was verified for semantic equivalence. This is safer for the locked dashboard/quota behavior than a test that mutates real sessions or data.
