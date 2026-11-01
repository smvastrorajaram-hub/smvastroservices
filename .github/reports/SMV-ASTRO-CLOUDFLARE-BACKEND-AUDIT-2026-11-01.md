# SMV ASTRO — Cloudflare Production Backend Audit

**Date:** 1 November 2026  
**Repository branch reviewed:** `integration/cloudflare-backend-staging-stack-20261031`  
**Audit-only branch:** `audit/cloudflare-production-backend-parity-20261101`  
**Production endpoint:** [`smvastroservices.astroservices.workers.dev`](https://smvastroservices.astroservices.workers.dev)  
**Production D1:** `smvastro-wallet-production`  
**Production D1 ID:** `b1d5684c-3fcd-48fe-9571-ea41fc605c7d`

## Executive result

**Do not switch production traffic or enable Wallet, Razorpay, Live Call/Chat, or backfill flags yet.**

The production Worker runtime and D1 binding are deployed and verified, but this is a runtime foundation, not a full replacement for Render:

| Measurement | Audited result |
|---|---:|
| Legacy method/path inventory | 149 |
| Legacy GET pairs | 55 |
| Legacy POST pairs | 94 |
| Literal Worker handler pairs in reviewed route source files | 70 |
| Exact legacy method+path pairs with a Worker handler | 57 (38.3%) |
| Legacy pairs with no exact Worker handler | 92 (61.7%) |
| Production business route families enabled | 0 |
| Production traffic switched | No |
| Production D1 writes/migrations performed by this audit | 0 |

A matching source handler is **not** counted as parity: parity also requires request/response contract equivalence, authorization equivalence, persistence/reconciliation behavior, and conformance tests.

The route inventory is maintained in [`legacy-backend-route-inventory.mjs`](https://github.com/smvastrorajaram-hub/smvastroservices/blob/integration/cloudflare-backend-staging-stack-20261031/shared/backend-platform/legacy-backend-route-inventory.mjs). The source-level audit parser reviewed `index.mjs`, Wallet, offer, recharge, Live, Wallet backfill, Identity/Profile backfill, core read, and the new `legacy-razorpay-routes.mjs` module. The latter adds 16 exact legacy method/path pairs.

## Priority findings

### P0 — Route parity is incomplete (cutover blocker)

There are 149 unique legacy method/path pairs. Of those, 57 have an exact method/path handler literal in the reviewed Worker source files; 92 have no exact handler and remain routed to the generic `BACKEND_MIGRATION_NOT_CUT_OVER` fail-closed guard. This fail-closed behavior is desirable while migration is incomplete, but it is not production parity.

The existing README says approximately 117 route registrations; the current version-controlled route inventory says 149. Use the inventory as the audit baseline until a fresh automated extraction of all active route registrations—including indirect router/module registrations—is compared against it.

**Unified webhook source route added:** `POST /razorpay/webhook` now has its own raw-body signature-verifying handler; it uses the shared D1 atomic event inbox and dispatches by stored Razorpay order metadata to Wallet, Question, and Staging-enabled Private Consultation records. It is not an alias for `/wallet/recharge/webhook`. The new source handler still requires Staging deployment and provider webhook replay tests before it can be treated as operational parity.

### P0 — Production Razorpay mode remains disabled; explicit Live-key support is implemented but not approved for cutover

The Worker now resolves Razorpay mode through `shared/backend-platform/razorpay-mode-policy.mjs`. Staging accepts Test Mode only. Production `rzp_live_` keys are accepted only when both `SMV_RAZORPAY_LIVE_MODE_ENABLED=true` and `SMV_BACKEND_CLOUDFLARE_ACTIVE=true`; Production Test Mode has a separate opt-in flag. The Production Wrangler config keeps both Razorpay mode flags `false`, and key ID, key secret and webhook secret remain environment secrets—not plain-text config. CI tests the policy with synthetic fixtures. No real Production credentials were supplied or tested; provider Live API verification and a separately approved cutover remain outstanding.

### P0 — Live/Booking handlers have a staging-only fence

[`live-session-routes.mjs`](https://github.com/smvastrorajaram-hub/smvastroservices/blob/integration/cloudflare-backend-staging-stack-20261031/cloudflare/backend-api/src/live-session-routes.mjs) requires both `environment === 'staging'` and `sourceProjectId === 'smv-astro-staging'`. That is a valuable fence, but it is an intentional production blocker. Do not remove it until there is a separate, explicit production-safe allowlist, production-specific secrets/config, data reconciliation attestation and full D1 concurrency/cutover suite.

### P1 — Firebase ID-token validation is good foundation; disabled/revoked account and real-rule integration still need evidence

The shared verifier checks RS256 signature, issuer/audience project allowlist, expiry, issued-at/auth time, optional not-before and Firebase sign-in metadata. Existing tests cover the happy path and several malformed/forged/disallowed token cases. The Worker health/migration-status output says Firebase Admin user-management and Firestore are not connected. Thus this audit does **not** establish Firebase-disabled/revoked-user checks or real-project end-to-end role/approval behavior.

Before privileged routes are enabled, run tests with dedicated staging Firebase accounts against actual Security Rules and profile/admin allowlist records; define and test the policy for disabled/revoked users. Do not test using Production accounts or mutate Production rules/data.

Positive authorization checks in the current source: a mutable `smv_users.role='admin'` alone does not grant Admin; Admin uses a verified admin claim or server-controlled `smv_admins` document, and astrologer approval requires both an active user profile and an approved astrologer profile. See [`firebase-authorization.mjs`](https://github.com/smvastrorajaram-hub/smvastroservices/blob/integration/cloudflare-backend-staging-stack-20261031/shared/backend-platform/firebase-authorization.mjs) and [`firestore.rules`](https://github.com/smvastrorajaram-hub/smvastroservices/blob/integration/cloudflare-backend-staging-stack-20261031/firestore.rules).

### P1 — Wallet ledger invariants are present, but current test evidence is mostly mocked

The D1 schema enforces `UNIQUE(owner_uid, idempotency_key)`; ledger inserts drive Wallet balance changes through SQLite triggers. Current CI now applies all migrations to an ephemeral Wrangler local D1 and tests eight independent writers against a capacity of two, booking reserve-transfer versus stale cash/bonus release, forced settlement rollback, and two concurrent settlement calls with exact Wallet/earning reconciliation. These results strengthen the local evidence; they do not authorize Production Live traffic. The duplicate-request-ID state-machine and full Durable Object + D1 end-to-end coordination still need additional coverage.

Do not use the Production D1 to simulate these cases.

### P1 — Razorpay signature and capture checks are present; webhook inbox atomicity/recovery needs hardening/tests

The current REST adapter uses WebCrypto HMAC-SHA256 for checkout signature (`orderId|paymentId`) and raw-body webhook signature; it checks hex signature shape and compares byte arrays. Recharge verify matches payment order, amount and INR currency, captures authorized payments and finalizes only when server-fetched payment status is `captured`. Webhook code verifies raw body, checks order/recharge/amount/currency/status against Razorpay's server-fetched payment, and the D1 ledger is idempotent.

Addressed in the current Draft PR:
- Webhook events use an atomic D1 claim/lease with token-guarded completion/release and expired-lease recovery.
- `payment.authorized` attempts capture and re-fetches authoritative provider state before credit; an unsettled or failed payment is never credited.
- Local-D1 tests exercise concurrent duplicate deliveries, stale lease takeover, invalid webhook/payment signatures, wrong order/amount/currency/provider payment ID, retry after mismatch and duplicate replay with exactly one Wallet credit.
- The REST adapter exposes `fetchMultipleRefund`/`fetchPaymentRefunds`, order/payment lookup and pagination, and refund creation with a stable idempotency header.
- `legacy-razorpay-routes.mjs` now registers the unified `POST /razorpay/webhook`, Question `/create-order` + `/verify-payment`, Question reject/retry/sync refund + trace, and Private Consultation create/retry/cancel/recover/verify + reject/retry/sync refund endpoints. Private Consultation payment routes are controlled by a separate Staging-only flag; they remain disabled in Production.
- The webhook verifies the exact raw body, claims `X-Razorpay-Event-Id` through the shared D1 lease inbox, re-fetches authoritative captured payment details, records Question/Private Consultation payment and payment-ledger documents in Firestore transactions, and completes the event only after state reconciliation.
- Question/Private Consultation refunds check existing provider refund history before sending a new refund, then persist provider refund IDs and bank references. 19 in-memory Firestore/D1-inbox route tests cover the main flows and negative cases. These are contract tests, not actual Firestore or Razorpay Sandbox E2E.
- Six synthetic REST-adapter tests verify refund pagination, invalid page bounds, malformed responses and identical idempotency-header/body reuse. Provider sandbox replay/idempotency remains unverified; no Live refund path is approved.

Razorpay's own guidance emphasizes verifying webhook signatures over the raw request body and handling duplicate/out-of-order webhooks; see [Razorpay security checklist](https://razorpay.com/security/checklist/) and [Razorpay webhook guidance](https://razorpay.com/blog/payment-gateway-webhooks-india/). No production payment request was made in this audit.

### P1 — Live session settlement uses D1 triggers and atomic batch design, but real concurrency proof is missing

The source has a D1 capacity trigger, compare-and-swap transitions for several state changes, reserve-ledger validation, disconnect generation/deadline checks and a multi-statement settlement batch. Durable Object deadlines and event-ID deduplication are tested separately.

Actual local-D1 tests now prove configured capacity under independent concurrent writers, stale booking release rejection after acceptance, atomic settlement rollback, and one settlement under two competing end-session calls. The separate Durable Object timer/event tests still do not constitute a complete end-to-end D1 + Durable Object concurrency proof. Live Call/Chat remains disabled in Production.

## Existing test evidence inventory

| Area | Existing evidence | Audit gap |
|---|---|---|
| Firebase ID-token | `test/firebase-id-token.test.mjs`: allowed project, bad project, expiry, malformed/non-RS256 token, bad signature, Firebase sign-in metadata | Add disabled/revoked-user policy and real staging project integration |
| Authorization | `test/firebase-authorization.test.mjs`: mutable profile role alone cannot grant Admin; profile + approved astrologer record required | Real Security Rules/profile/admin allowlist E2E and negative cross-user tests |
| Wallet | `test/wallet-adapters.test.mjs`: integer paise, reserve, settlement, duplicate idempotency | Real SQLite/D1 trigger/batch/concurrency and rollback tests |
| Razorpay | `test/wallet-recharge-routes.test.mjs`, `test/razorpay-mode-policy.test.mjs`, `test/razorpay-rest-adapter.test.mjs`, `test/legacy-razorpay-routes.test.mjs`, and `test/local-d1-live-payment-invariants.local.mjs`: key-mode gate, raw-body signature check, Question/Private Consultation verify/recovery/refunds, duplicate event handling, order/amount/ownership negatives, refund history lookup and stable idempotency request shape | Real Razorpay Sandbox duplicate webhook replay/refund provider proof; actual Staging Firestore/D1 E2E and complete out-of-order event matrix |
| Live/Booking | `test/live-session-domain.test.mjs`, `test/live-session-routes.test.mjs` and `test/local-d1-live-payment-invariants.local.mjs`: capacity concurrency, stale booking release, settlement rollback, double-settlement prevention | Full D1 + Durable Object end-to-end ordering and duplicate request-ID replay coverage |
| Durable timers/events | `test/live-session-coordinator.test.mjs`: durable deadline behavior and event-id dedupe | End-to-end D1+DO interaction under concurrent delivery |
| Route inventory | `test/legacy-route-inventory.test.mjs`: 149 unique pairs; audit parser now finds 57 exact source pairs and 92 missing pairs | Contract equivalence for all remaining 92 routes and full legacy parity for every source match |

## Route-by-route coverage matrix (149 inventory pairs)

“Handler found” is only a source-level match; it does not mean enabled, secure, or response-compatible. All Production business routes remain disabled. Missing handlers are intentionally fail-closed.

| # | Route family | Method | Legacy path | Source coverage | Worker source |
|---:|---|---|---|---|---|
| 1 | Admin / configuration | GET | `/admin/access` | Exact source handler; verified Firebase Admin claim/allowlist only | `cloudflare/backend-api/src/core-read-routes.mjs` |
| 2 | Authentication / profile | GET | `/account/role` | Exact source handler; verified profile role plus UID/publicId-bound Astrologer lookup | `cloudflare/backend-api/src/core-read-routes.mjs` |
| 3 | Authentication / profile | POST | `/lookup-customer-login` | No exact source handler; fails closed | — |
| 4 | Authentication / profile | POST | `/lookup-id-login` | No exact source handler; fails closed | — |
| 5 | Authentication / profile | POST | `/register-customer-profile` | No exact source handler; fails closed | — |
| 6 | Authentication / profile | POST | `/register-astrologer-profile` | No exact source handler; fails closed | — |
| 7 | Public config / content | GET | `/public/registration-config` | No exact source handler; fails closed | — |
| 8 | Public config / content | GET | `/api/smv-mode` | No exact source handler; fails closed | — |
| 9 | Public config / content | GET | `/` | No exact source handler; fails closed | — |
| 10 | Payments / earnings / withdrawals | GET | `/test-razorpay` | No exact source handler; fails closed | — |
| 11 | Contact | POST | `/contact-query` | No exact source handler; fails closed | — |
| 12 | Appointments / Q&A / consultations | POST | `/astrologer/edit-answer` | No exact source handler; fails closed | — |
| 13 | Appointments / Q&A / consultations | POST | `/submit-answer` | No exact source handler; fails closed | — |
| 14 | Appointments / Q&A / consultations | POST | `/question-notify` | No exact source handler; fails closed | — |
| 15 | Appointments / Q&A / consultations | GET | `/astrologer/appointments` | No exact source handler; fails closed | — |
| 16 | Appointments / Q&A / consultations | GET | `/customer/appointments` | No exact source handler; fails closed | — |
| 17 | Appointments / Q&A / consultations | POST | `/astrologer/appointments/:id/respond` | No exact source handler; fails closed | — |
| 18 | Appointments / Q&A / consultations | POST | `/appointment-booking` | No exact source handler; fails closed | — |
| 19 | Other | GET | `/public/astrologers` | No exact source handler; fails closed | — |
| 20 | Other | POST | `/astrologer/availability` | No exact source handler; fails closed | — |
| 21 | Appointments / Q&A / consultations | GET | `/public/astrologers/:astrologerId/reviews` | No exact source handler; fails closed | — |
| 22 | Appointments / Q&A / consultations | GET | `/customer/reviews` | No exact source handler; fails closed | — |
| 23 | Appointments / Q&A / consultations | POST | `/customer/submit-review` | No exact source handler; fails closed | — |
| 24 | Admin / configuration | GET | `/admin/appointments` | No exact source handler; fails closed | — |
| 25 | Admin / configuration | POST | `/admin/appointment-status` | No exact source handler; fails closed | — |
| 26 | Admin / configuration | POST | `/admin/approve-question` | No exact source handler; fails closed | — |
| 27 | Appointments / Q&A / consultations | POST | `/astrologer/claim-question` | No exact source handler; fails closed | — |
| 28 | Public config / content | GET | `/api-version` | No exact source handler; fails closed | — |
| 29 | Admin / configuration | POST | `/admin/reject-question` | Exact source route; admin-only Question rejection/refund | `cloudflare/backend-api/src/legacy-razorpay-routes.mjs` |
| 30 | Admin / configuration | POST | `/admin/retry-refund` | Exact legacy Question refund retry route | `cloudflare/backend-api/src/legacy-razorpay-routes.mjs` |
| 31 | Admin / configuration | GET | `/admin/refund-trace/:questionId` | Exact source route; admin-only refund trace | `cloudflare/backend-api/src/legacy-razorpay-routes.mjs` |
| 32 | Other | POST | `/customer/sync-refund` | Exact source route; customer ownership checked | `cloudflare/backend-api/src/legacy-razorpay-routes.mjs` |
| 33 | Admin / configuration | POST | `/admin/sync-refund` | Exact source Question refund sync route | `cloudflare/backend-api/src/legacy-razorpay-routes.mjs` |
| 34 | Admin / configuration | POST | `/admin/reallocate-question` | No exact source handler; fails closed | — |
| 35 | Admin / configuration | POST | `/admin/edit-question` | No exact source handler; fails closed | — |
| 36 | Admin / configuration | POST | `/admin/takeover-answer` | No exact source handler; fails closed | — |
| 37 | Payments / earnings / withdrawals | POST | `/astrologer/change-payout` | No exact source handler; fails closed | — |
| 38 | Admin / configuration | POST | `/admin/payout-change-status` | No exact source handler; fails closed | — |
| 39 | Admin / configuration | POST | `/admin/set-open-workflow` | No exact source handler; fails closed | — |
| 40 | Appointments / Q&A / consultations | GET | `/astrologer/open-questions` | No exact source handler; fails closed | — |
| 41 | Appointments / Q&A / consultations | POST | `/customer/mark-answer-viewed` | No exact source handler; fails closed | — |
| 42 | Appointments / Q&A / consultations | GET | `/customer/consultations` | No exact source handler; fails closed | — |
| 43 | Appointments / Q&A / consultations | GET | `/customer/private-consultations` | No exact source handler; fails closed | — |
| 44 | Appointments / Q&A / consultations | POST | `/customer/private-consultation/mark-viewed` | No exact source handler; fails closed | — |
| 45 | Admin / configuration | POST | `/admin/astrologer-quiz/load-defaults` | No exact source handler; fails closed | — |
| 46 | Admin / configuration | GET | `/admin/astrologer-quiz/questions` | No exact source handler; fails closed | — |
| 47 | Admin / configuration | POST | `/admin/astrologer-quiz/questions` | No exact source handler; fails closed | — |
| 48 | Admin / configuration | POST | `/admin/astrologer-quiz/questions/delete` | No exact source handler; fails closed | — |
| 49 | Appointments / Q&A / consultations | GET | `/google-form/astrologer-quiz-config` | No exact source handler; fails closed | — |
| 50 | Admin / configuration | POST | `/admin/astrologer-auto-approval/settings` | No exact source handler; fails closed | — |
| 51 | Admin / configuration | POST | `/admin/astrologer-quiz/sync-google-form` | No exact source handler; fails closed | — |
| 52 | Appointments / Q&A / consultations | GET | `/astrologer/qualification-config` | No exact source handler; fails closed | — |
| 53 | Appointments / Q&A / consultations | POST | `/webhooks/google-form/astrologer-qualification` | No exact source handler; fails closed | — |
| 54 | Admin / configuration | GET | `/admin/private-consultations-data` | No exact source handler; fails closed | — |
| 55 | Admin / configuration | GET | `/admin/settings-data` | No exact source handler; fails closed | — |
| 56 | Admin / configuration | GET | `/admin/withdrawals-data` | Source handler exists; production remains disabled / gated | `cloudflare/backend-api/src/live-session-routes.mjs:194` |
| 57 | Admin / configuration | GET | `/admin/reviews-data` | No exact source handler; fails closed | — |
| 58 | Admin / configuration | POST | `/admin/approve-astrologer` | No exact source handler; fails closed | — |
| 59 | Admin / configuration | POST | `/admin/reject-astrologer` | No exact source handler; fails closed | — |
| 60 | Other | POST | `/astrologer/sync-approval` | No exact source handler; fails closed | — |
| 61 | Admin / configuration | POST | `/admin/astrologer-profile-permission` | No exact source handler; fails closed | — |
| 62 | Admin / configuration | POST | `/admin/astrologer-profile-description` | No exact source handler; fails closed | — |
| 63 | Public config / content | GET | `/public/android-app` | No exact source handler; fails closed | — |
| 64 | Admin / configuration | GET | `/admin/android-app` | No exact source handler; fails closed | — |
| 65 | Admin / configuration | POST | `/admin/android-app/upload` | No exact source handler; fails closed | — |
| 66 | Public config / content | GET | `/public/content` | No exact source handler; fails closed | — |
| 67 | Admin / configuration | GET | `/admin/content` | No exact source handler; fails closed | — |
| 68 | Admin / configuration | POST | `/admin/content/save` | No exact source handler; fails closed | — |
| 69 | Admin / configuration | POST | `/admin/content/toggle` | No exact source handler; fails closed | — |
| 70 | Admin / configuration | POST | `/admin/content/delete` | No exact source handler; fails closed | — |
| 71 | Admin / configuration | POST | `/admin/astrologer-languages` | No exact source handler; fails closed | — |
| 72 | Admin / configuration | POST | `/admin/astrologer-pricing` | No exact source handler; fails closed | — |
| 73 | Admin / configuration | GET | `/admin/astrologers-data` | No exact source handler; fails closed | — |
| 74 | Admin / configuration | GET | `/admin/questions-data` | No exact source handler; fails closed | — |
| 75 | Admin / configuration | POST | `/admin/dashboard-touch` | No exact source handler; fails closed | — |
| 76 | Admin / configuration | GET | `/admin-data` | No exact source handler; fails closed | — |
| 77 | Admin / configuration | POST | `/admin/private-consultation/set-commission` | No exact source handler; fails closed | — |
| 78 | Admin / configuration | POST | `/admin/private-consultation/set-word-count` | No exact source handler; fails closed | — |
| 79 | Admin / configuration | POST | `/admin/private-consultation/set-workflow` | No exact source handler; fails closed | — |
| 80 | Admin / configuration | POST | `/admin/private-consultation/approve-question` | No exact source handler; fails closed | — |
| 81 | Admin / configuration | POST | `/admin/private-consultation/reject-question` | Exact source route; Staging-only feature gate | `cloudflare/backend-api/src/legacy-razorpay-routes.mjs` |
| 82 | Admin / configuration | POST | `/admin/private-consultation/retry-refund` | Exact source route; Staging-only feature gate | `cloudflare/backend-api/src/legacy-razorpay-routes.mjs` |
| 83 | Admin / configuration | POST | `/admin/private-consultation/sync-refund` | Exact source route; Staging-only feature gate | `cloudflare/backend-api/src/legacy-razorpay-routes.mjs` |
| 84 | Appointments / Q&A / consultations | GET | `/astrologer/private-consultations` | No exact source handler; fails closed | — |
| 85 | Appointments / Q&A / consultations | POST | `/astrologer/private-consultation/submit-answer` | No exact source handler; fails closed | — |
| 86 | Admin / configuration | POST | `/admin/private-consultation/approve-answer` | No exact source handler; fails closed | — |
| 87 | Admin / configuration | POST | `/admin/private-consultation/reject-answer` | No exact source handler; fails closed | — |
| 88 | Appointments / Q&A / consultations | POST | `/private-consultation/create-order` | Exact source route; Staging-only legacy payment gate | `cloudflare/backend-api/src/legacy-razorpay-routes.mjs` |
| 89 | Appointments / Q&A / consultations | POST | `/private-consultation/retry-payment` | Exact source route; Staging-only legacy payment gate | `cloudflare/backend-api/src/legacy-razorpay-routes.mjs` |
| 90 | Appointments / Q&A / consultations | POST | `/private-consultation/cancel-payment` | Exact source route; Staging-only legacy payment gate | `cloudflare/backend-api/src/legacy-razorpay-routes.mjs` |
| 91 | Appointments / Q&A / consultations | POST | `/private-consultation/recover-payment` | Exact source route; Staging-only legacy payment gate | `cloudflare/backend-api/src/legacy-razorpay-routes.mjs` |
| 92 | Appointments / Q&A / consultations | POST | `/private-consultation/verify-payment` | Exact source route; Staging-only legacy payment gate | `cloudflare/backend-api/src/legacy-razorpay-routes.mjs` |
| 93 | Payments / earnings / withdrawals | POST | `/create-order` | Exact Question order route; customer-owned question contract | `cloudflare/backend-api/src/legacy-razorpay-routes.mjs` |
| 94 | Payments / earnings / withdrawals | POST | `/verify-payment` | Exact Question verification; captured provider payment required | `cloudflare/backend-api/src/legacy-razorpay-routes.mjs` |
| 95 | Payments / earnings / withdrawals | GET | `/astrologer/earnings` | Source handler exists; production remains disabled / gated | `cloudflare/backend-api/src/live-session-routes.mjs:170` |
| 96 | Payments / earnings / withdrawals | POST | `/astrologer/withdrawal-request` | Source handler exists; production remains disabled / gated | `cloudflare/backend-api/src/live-session-routes.mjs:179` |
| 97 | Admin / configuration | POST | `/admin/withdrawal-mark-paid` | Source handler exists; production remains disabled / gated | `cloudflare/backend-api/src/live-session-routes.mjs:234` |
| 98 | Admin / configuration | GET | `/admin/withdrawal-payout/:withdrawalDocId` | Source handler exists; production remains disabled / gated | `cloudflare/backend-api/src/live-session-routes.mjs:203` |
| 99 | Payments / earnings / withdrawals | POST | `/razorpay/webhook` | Exact unified raw-body signature + D1 event-claim route | `cloudflare/backend-api/src/legacy-razorpay-routes.mjs` |
| 100 | Horoscope / predictions | GET | `/horoscope-auth/session` | No exact source handler; fails closed | — |
| 101 | Horoscope / predictions | GET | `/horoscope-feature-config` | No exact source handler; fails closed | — |
| 102 | Admin / configuration | POST | `/admin/horoscope-feature-settings` | No exact source handler; fails closed | — |
| 103 | Payments / earnings / withdrawals | POST | `/horoscope-payment/create-order` | No exact source handler; fails closed | — |
| 104 | Payments / earnings / withdrawals | POST | `/horoscope-payment/verify` | No exact source handler; fails closed | — |
| 105 | Horoscope / predictions | POST | `/api/prediction/horoscope` | No exact source handler; fails closed | — |
| 106 | Horoscope / predictions | POST | `/api/prediction/matching` | No exact source handler; fails closed | — |
| 107 | Admin / configuration | GET | `/admin/wallet/transactions` | No exact source handler; fails closed | — |
| 108 | Wallet / offers / migration | GET | `/wallet/recharge-offers` | Source handler exists; production remains disabled / gated | `cloudflare/backend-api/src/wallet-offer-routes.mjs:67` |
| 109 | Admin / configuration | GET | `/admin/offers` | Source handler exists; production remains disabled / gated | `cloudflare/backend-api/src/wallet-offer-routes.mjs:83` |
| 110 | Admin / configuration | POST | `/admin/offers/save` | Source handler exists; production remains disabled / gated | `cloudflare/backend-api/src/wallet-offer-routes.mjs:98` |
| 111 | Admin / configuration | POST | `/admin/offers/delete` | Source handler exists; production remains disabled / gated | `cloudflare/backend-api/src/wallet-offer-routes.mjs:166` |
| 112 | Live Call / Chat / push | GET | `/public/push-config` | Exact source handler; public VAPID key only | `cloudflare/backend-api/src/core-read-routes.mjs` |
| 113 | Wallet / offers / migration | GET | `/wallet` | Source handler exists; production remains disabled / gated | `cloudflare/backend-api/src/wallet-read-routes.mjs:81` |
| 114 | Wallet / offers / migration | GET | `/wallet/transactions` | Source handler exists; production remains disabled / gated | `cloudflare/backend-api/src/wallet-read-routes.mjs:108` |
| 115 | Payments / earnings / withdrawals | POST | `/wallet/recharge/create-order` | Source handler exists; production remains disabled / gated | `cloudflare/backend-api/src/wallet-recharge-routes.mjs:67` |
| 116 | Wallet / offers / migration | POST | `/wallet/recharge/verify` | Source handler exists; production remains disabled / gated | `cloudflare/backend-api/src/wallet-recharge-routes.mjs:150` |
| 117 | Admin / configuration | GET | `/admin/wallet/backfill/status` | Source handler exists; production remains disabled / gated | `cloudflare/backend-api/src/wallet-domain-backfill-routes.mjs:91` |
| 118 | Admin / configuration | POST | `/admin/wallet/backfill/preflight` | Source handler exists; production remains disabled / gated | `cloudflare/backend-api/src/wallet-domain-backfill-routes.mjs:100` |
| 119 | Admin / configuration | POST | `/admin/wallet/backfill/preview` | Source handler exists; production remains disabled / gated | `cloudflare/backend-api/src/wallet-domain-backfill-routes.mjs:112` |
| 120 | Admin / configuration | POST | `/admin/wallet/backfill/apply` | Source handler exists; production remains disabled / gated | `cloudflare/backend-api/src/wallet-domain-backfill-routes.mjs:122` |
| 121 | Admin / configuration | POST | `/admin/wallet/backfill/reconcile` | Source handler exists; production remains disabled / gated | `cloudflare/backend-api/src/wallet-domain-backfill-routes.mjs:143` |
| 122 | Locations | GET | `/api/locations/status` | No exact source handler; fails closed | — |
| 123 | Locations | GET | `/api/locations/search` | No exact source handler; fails closed | — |
| 124 | Locations | GET | `/api/locations/timezone` | No exact source handler; fails closed | — |
| 125 | Live Call / Chat / push | GET | `/live/push/status` | No exact source handler; fails closed | — |
| 126 | Live Call / Chat / push | POST | `/live/push/register` | No exact source handler; fails closed | — |
| 127 | Live Call / Chat / push | POST | `/live/push/unregister` | No exact source handler; fails closed | — |
| 128 | Live Call / Chat / push | POST | `/live/push/test` | No exact source handler; fails closed | — |
| 129 | Live Call / Chat / push | GET | `/live/pricing` | Source handler exists; production remains disabled / gated | `cloudflare/backend-api/src/live-session-routes.mjs:250` |
| 130 | Live Call / Chat / push | GET | `/live/ice-config` | Source handler exists; production remains disabled / gated | `cloudflare/backend-api/src/live-session-routes.mjs:262` |
| 131 | Admin / configuration | POST | `/admin/live/pricing` | Source handler exists; production remains disabled / gated | `cloudflare/backend-api/src/live-session-routes.mjs:552` |
| 132 | Admin / configuration | POST | `/admin/live/commission` | Source handler exists; production remains disabled / gated | `cloudflare/backend-api/src/live-session-routes.mjs:579` |
| 133 | Live Call / Chat / push | GET | `/live/events` | Source handler exists; production remains disabled / gated | `cloudflare/backend-api/src/live-session-routes.mjs:286` |
| 134 | Appointments / Q&A / consultations | POST | `/live/scheduled-appointments/:id/start` | No exact source handler; fails closed | — |
| 135 | Live Call / Chat / push | POST | `/live/requests` | Source handler exists; production remains disabled / gated | `cloudflare/backend-api/src/live-session-routes.mjs:294` |
| 136 | Live Call / Chat / push | GET | `/live/sessions` | Source handler exists; production remains disabled / gated | `cloudflare/backend-api/src/live-session-routes.mjs:334` |
| 137 | Live Call / Chat / push | GET | `/live/bookings/pending` | Source handler exists; production remains disabled / gated | `cloudflare/backend-api/src/live-session-routes.mjs:343` |
| 138 | Live Call / Chat / push | GET | `/live/bookings/mine` | Source handler exists; production remains disabled / gated | `cloudflare/backend-api/src/live-session-routes.mjs:352` |
| 139 | Live Call / Chat / push | POST | `/live/bookings/:id/accept` | Source handler exists; production remains disabled / gated | `cloudflare/backend-api/src/live-session-routes.mjs:361` |
| 140 | Live Call / Chat / push | POST | `/live/bookings/:id/reject` | Source handler exists; production remains disabled / gated | `cloudflare/backend-api/src/live-session-routes.mjs:376` |
| 141 | Live Call / Chat / push | POST | `/live/bookings/:id/cancel` | Source handler exists; production remains disabled / gated | `cloudflare/backend-api/src/live-session-routes.mjs:390` |
| 142 | Live Call / Chat / push | POST | `/live/sessions/:id/accept` | Source handler exists; production remains disabled / gated | `cloudflare/backend-api/src/live-session-routes.mjs:401` |
| 143 | Live Call / Chat / push | POST | `/live/sessions/:id/reject` | Source handler exists; production remains disabled / gated | `cloudflare/backend-api/src/live-session-routes.mjs:414` |
| 144 | Live Call / Chat / push | POST | `/live/sessions/:id/end` | Source handler exists; production remains disabled / gated | `cloudflare/backend-api/src/live-session-routes.mjs:425` |
| 145 | Live Call / Chat / push | POST | `/live/sessions/:id/ready` | Source handler exists; production remains disabled / gated | `cloudflare/backend-api/src/live-session-routes.mjs:476` |
| 146 | Live Call / Chat / push | POST | `/live/sessions/:id/signal` | Source handler exists; production remains disabled / gated | `cloudflare/backend-api/src/live-session-routes.mjs:527` |
| 147 | Live Call / Chat / push | GET | `/live/sessions/:id/signals` | Source handler exists; production remains disabled / gated | `cloudflare/backend-api/src/live-session-routes.mjs:541` |
| 148 | Live Call / Chat / push | POST | `/live/sessions/:id/messages` | Source handler exists; production remains disabled / gated | `cloudflare/backend-api/src/live-session-routes.mjs:505` |
| 149 | Live Call / Chat / push | GET | `/live/sessions/:id/messages` | Source handler exists; production remains disabled / gated | `cloudflare/backend-api/src/live-session-routes.mjs:516` |

## Recommended completion gates

1. Build missing route modules in small family-by-family changes; compare response contracts and authorization rules against Render with fixtures. Keep all production flags off.
2. Add real local-D1 migration/trigger transaction tests, deterministic race tests, rollback tests and financial ledger reconciliation assertions.
3. Harden Razorpay webhook inbox claiming/recovery; add replay, duplicate parallel delivery, out-of-order, capture recovery and refund idempotency tests.
4. Establish staging-only end-to-end Firebase auth/role/approval tests and a policy/test for disabled/revoked users.
5. Make production payment/live support a separate reviewed design with production-only environment guards and secrets; no live keys in plain-text config or test scripts.
6. Only after all required route families reach tested parity, reconciliation is clean, and independent approval is recorded should a reversible Production cutover be planned.

## Safety statement

This report and audit script are source/config tests only. They do not deploy a Worker, enable any flag, mutate Production D1, import Firebase data, change Razorpay keys, change frontend URLs/DNS, alter Render, or touch `main`, staging, Horoscope, Calendar or APK-release workflows.
