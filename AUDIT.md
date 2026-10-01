# SMV ASTRO V1 — Full Source Audit

**Audit date:** 2 October 2026  
**V1 definition:** latest `SMV ASTRO.zip` baseline + latest V143 Marriage Strength Matrix + this FAQ/documentation update.

## Executive result

**SOURCE / STATIC AUDIT: PASS WITH RUNTIME VERIFICATION ITEMS**

The merged source is internally loadable at static/source level. JavaScript syntax checks pass, the two principal HTML entry points have no duplicate IDs, the Horoscope page has no missing local asset references, V143 is merged into the Marriage Matching runtime, and the homepage FAQ has been extended without changing the existing FAQ `<details>` style.

This is not a claim that third-party live services were transaction-tested. Firebase Auth/Firestore, Razorpay capture/refund, email delivery, Cloudinary delivery, and the deployed backend require controlled production/staging runtime tests.

## Source composition

- Main/public SMV ASTRO website: latest `SMV ASTRO.zip`.
- Horoscope application: `public/horoscope/` from that same baseline.
- Marriage Matching: V143 `public/horoscope/marriage-matching.js` applied over the baseline.
- New documentation: `AUDIT.md`, refreshed `README.md`.
- FAQ update: `public/index.html`.
- Cache refresh for the changed homepage: `public/sw.js` cache key bumped.

## Homepage and public website

### PASS

- Homepage `public/index.html` parses with no duplicate HTML IDs.
- Existing FAQ structure is preserved: one FAQ section containing individual `<details><summary>…</summary><p>…</p></details>` items.
- Existing FAQ topics remain intact: asking questions, verified astrologers, account requirement, answer timing, refund/rejection, astrology disclaimer, offers, welcome offer, seasonal offers and astrologer qualification.
- Added FAQ topics reflect the current source behavior: Horoscope creation, public Basic access, saved reports after login, lazy PDF generation, Tamil/English switching, public vs Full Marriage Matching, prediction/matching disclaimer, Admin-controlled availability/pricing, reopening saved eligible reports and chronology-aware prediction periods.
- Header/footer public links and the existing FAQ section-collapse script remain present.

## Horoscope application

### PASS — source architecture

- `public/horoscope/index.html` has no duplicate IDs and no missing local HTML asset references in the static asset check.
- Horoscope routes are present server-side for calculate, full, advanced, dasa, transit and panchang.
- Offline router contains local handlers for calculate/full/advanced/dasa/transit/panchang, while AI Future is explicitly not part of the offline build.
- Runtime can therefore use the existing online/offline architecture rather than requiring a separate UI for each engine.
- Integrated prediction code and the advanced calculation modules remain present; this audit did not replace their calculation formulas.

## Horoscope access/payment/report flow

### Source contract present

The source contains server routes for:

- `/horoscope-feature/config`
- `/horoscope-auth/session`
- `/horoscope-feature/access`
- `/horoscope-feature/create-order`
- `/horoscope-feature/verify-payment`
- `/horoscope-feature/claim-marriage-payment`
- `/horoscope-reports`

Razorpay checkout integration remains in the Horoscope payment module. Saved-report routes remain in the backend. The current browser-native/lazy report behavior must still be checked once after deployment with a controlled customer account because a static audit cannot click the browser Print/Save dialog or validate a real payment capture.

## Marriage Matching — V143

### PASS — V143 merged

V143 is the active `public/horoscope/marriage-matching.js` in V1.

The source includes the existing matching layers plus the later Reality/Timing/Strength work, including:

- Public/basic versus Full chart acquisition path.
- Natal relationship evidence and dosha/bhanga logic already present in the matching engine.
- D7/D9 support used by the full matching path.
- Selected-date Gochara calculation.
- Timing-confirmation architecture added before V143.
- V143 Marriage Strength Matrix, designed to reuse available SMV Advanced evidence rather than exposing an artificial customer percentage.
- Full matching requests `/api/horoscope/full`; basic-only requests `/api/horoscope/calculate`.

The timing layer is not intended to override the natal MATCH / NO MATCH result merely because a transit is favourable.

## Prediction architecture

### PASS — structural

The current Horoscope source retains the Reality Prediction work developed before V143. The intended interpretation order remains:

`Natal Promise → Advanced evidence → divisional confirmation → chronology → Dasa/Bhukti/Antaram → transit/timing confirmation → practical interpretation`.

A strong astrological activation is treated as evidence to interpret, not proof that a real-world event occurred. This principle is also stated in the new FAQ.

## Dashboard / authentication

### PRESERVED

This V1 merge does not intentionally alter the previously locked Dashboard behavior. No Dashboard/authentication source was changed for the V143 merge or FAQ update.

Locked expectation remains:

- explicit login opens the appropriate dashboard;
- reopening the site/PWA with a persisted session starts at Home rather than automatically restoring the last dashboard;
- returning to an already hydrated dashboard should reuse its state unless real data changes require refresh.

These behaviors require a browser runtime regression check after deployment because Firebase session state is external to static source validation.

## Ask Question / Private Consultation / Admin

### Source routes present

The backend exposes the current workflows for question submission/approval/allocation, astrologer claim/answer, customer viewed status, private consultation create/retry/recover/verify, Admin private-consultation approval/rejection/refund, offers, withdrawals and reviews.

No workflow code in these areas was intentionally changed in this V1 merge.

## Static validation performed

- `node --check` on all public `.js`/`.mjs` files: **PASS**.
- `node --check server.js`: **PASS**.
- Duplicate IDs in `public/index.html`: **0 — PASS**.
- Duplicate IDs in `public/horoscope/index.html`: **0 — PASS**.
- Missing local asset refs from `public/horoscope/index.html`: **0 — PASS**.
- V143 file applied to the expected path: **PASS**.
- Homepage FAQ extension uses the existing FAQ markup style: **PASS**.

## Watch item — homepage payment timing script

`public/index.html` references `./payment-timing.js`, while the baseline ZIP stores `payment-timing.js` at the project root rather than under `public/`. Whether this is valid depends on the production deployment root/rewrite behavior. It is not automatically labelled a defect because the existing deployment may expose the project-root asset, but it should be checked in the deployed browser Network panel. If only `public/` is published as the static root, this reference would need alignment.

## External/runtime verification still required

A source audit cannot prove the following external effects. Run one controlled end-to-end test for each after deployment:

1. Customer email/password login and Google login.
2. Cold reopen starts at Home; explicit login opens the correct Dashboard.
3. Saved Horoscope and Marriage Matching items appear after login.
4. Public Horoscope remains Basic-only under the intended Admin configuration.
5. Public Marriage Matching remains Nakshatra-only under the intended gate.
6. Admin ON/OFF + ₹0/₹1+ feature matrix behaves as configured.
7. One successful paid Advanced Horoscope transaction and entitlement restore.
8. One successful paid Full Marriage Matching transaction and entitlement restore.
9. Saved report: first View/Download/Print starts one PDF preparation job; repeated taps wait; the first requested action continues when ready.
10. Tamil ↔ English switching does not trigger an unintended PDF action or unlock hidden Full content.
11. Razorpay refund path records the expected refund identifiers/status.
12. Firestore/dashboard reads remain bounded during repeated navigation.

## Live-site retrieval note

The audit attempted to retrieve `smvastroservices.in` and `/horoscope/` directly through the available web retrieval environment, but the fetch returned a cache-miss and indexed search did not return a usable copy. Therefore FAQ wording and the detailed audit were grounded in the supplied latest source rather than pretending the live pages were successfully fetched.

## Final status

**SMV ASTRO V1 source merge: PASS.**  
**V143 Marriage Matching integration: PASS.**  
**FAQ source update: PASS.**  
**Static syntax/HTML checks: PASS.**  
**Live third-party/payment/auth/browser behavior: requires the bounded post-deployment checks above.**
