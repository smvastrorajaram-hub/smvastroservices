# SMV ASTRO — Cloudflare route parity audit (2026-11-04)

## Audit boundary

This is a **source-level audit** of the 149 method/path pairs exported by `shared/backend-platform/legacy-backend-route-inventory.mjs`, compared with the current Worker route modules and the website's actual Cloudflare routing resolver. It is not a claim that every existing handler has full behavioural parity, nor is it a live end-to-end verification of every browser/API flow.

Audit base: `main` commit `8efee48924e6507e2868e6bc264a4dd6590d0e3f` (after PR #375).

## Result

| Classification | Count | Meaning |
|---|---:|---|
| Browser resolver sends request to Cloudflare Worker | **36** | Exact method/path is selected by `smvApiBackend()` when `SMV_CLOUDFLARE_FINANCIAL_API_ENABLED === true`. |
| Worker source handler exists, but browser resolver does not select it | **90** | Handler code exists, but browser calls continue to the legacy Render backend or an external integration handles the request. |
| Worker handler exists behind disabled Wallet backfill gate | **5** | Route module exists, but Production `SMV_WALLET_BACKFILL_TOOLS_ENABLED=false`; those routes are not registered in Production. |
| No exact Worker handler found in the audited route modules | **18** | Remains outside the Worker route surface; see the product-boundary notes below. |
| **Total legacy inventory** | **149** | **55 GET + 94 POST** pairs. |

The 131 source-handler matches (36 + 90 + 5) are a *syntactic registration/source match only*. They do not establish response-schema parity, authorization parity, data reconciliation, or successful user journeys. Of those, 5 Wallet backfill paths are deliberately not registered in Production.

## 1. Browser-routed Cloudflare paths (36)

- `GET /test-razorpay`
- `POST /appointment-booking`
- `GET /admin/withdrawals-data`
- `GET /astrologer/earnings`
- `POST /astrologer/withdrawal-request`
- `POST /admin/withdrawal-mark-paid`
- `GET /admin/withdrawal-payout/:withdrawalDocId`
- `GET /wallet/recharge-offers`
- `GET /admin/offers`
- `POST /admin/offers/save`
- `POST /admin/offers/delete`
- `GET /wallet`
- `GET /wallet/transactions`
- `POST /wallet/recharge/create-order`
- `POST /wallet/recharge/verify`
- `GET /live/pricing`
- `GET /live/ice-config`
- `POST /admin/live/pricing`
- `POST /admin/live/commission`
- `GET /live/events`
- `POST /live/scheduled-appointments/:id/start`
- `POST /live/requests`
- `GET /live/sessions`
- `GET /live/bookings/pending`
- `GET /live/bookings/mine`
- `POST /live/bookings/:id/accept`
- `POST /live/bookings/:id/reject`
- `POST /live/bookings/:id/cancel`
- `POST /live/sessions/:id/accept`
- `POST /live/sessions/:id/reject`
- `POST /live/sessions/:id/end`
- `POST /live/sessions/:id/ready`
- `POST /live/sessions/:id/signal`
- `GET /live/sessions/:id/signals`
- `POST /live/sessions/:id/messages`
- `GET /live/sessions/:id/messages`

These are the only paths selected by the current browser resolver's `financialRoute` regular expression. The flag in `public/index.html` is set to `true`. This is a route-family allowlist, not a global backend switch.

## 2. Worker source handler exists, but browser routing leaves it outside the Cloudflare allowlist (90)

- `GET /admin/access`
- `GET /account/role`
- `POST /lookup-customer-login`
- `POST /lookup-id-login`
- `POST /register-customer-profile`
- `POST /register-astrologer-profile`
- `GET /public/registration-config`
- `GET /api/smv-mode`
- `GET /`
- `POST /contact-query`
- `POST /astrologer/edit-answer`
- `POST /submit-answer`
- `POST /question-notify`
- `GET /astrologer/appointments`
- `GET /customer/appointments`
- `POST /astrologer/appointments/:id/respond`
- `GET /public/astrologers`
- `POST /astrologer/availability`
- `GET /public/astrologers/:astrologerId/reviews`
- `GET /customer/reviews`
- `POST /customer/submit-review`
- `GET /admin/appointments`
- `POST /admin/appointment-status`
- `POST /admin/approve-question`
- `POST /astrologer/claim-question`
- `GET /api-version`
- `POST /admin/reject-question`
- `POST /admin/retry-refund`
- `GET /admin/refund-trace/:questionId`
- `POST /customer/sync-refund`
- `POST /admin/sync-refund`
- `POST /admin/reallocate-question`
- `POST /admin/edit-question`
- `POST /admin/takeover-answer`
- `POST /astrologer/change-payout`
- `POST /admin/payout-change-status`
- `POST /admin/set-open-workflow`
- `GET /astrologer/open-questions`
- `POST /customer/mark-answer-viewed`
- `GET /customer/consultations`
- `POST /admin/astrologer-quiz/load-defaults`
- `GET /admin/astrologer-quiz/questions`
- `POST /admin/astrologer-quiz/questions`
- `POST /admin/astrologer-quiz/questions/delete`
- `GET /google-form/astrologer-quiz-config`
- `POST /admin/astrologer-auto-approval/settings`
- `POST /admin/astrologer-quiz/sync-google-form`
- `GET /astrologer/qualification-config`
- `POST /webhooks/google-form/astrologer-qualification`
- `GET /admin/settings-data`
- `GET /admin/reviews-data`
- `POST /admin/approve-astrologer`
- `POST /admin/reject-astrologer`
- `POST /astrologer/sync-approval`
- `POST /admin/astrologer-profile-permission`
- `POST /admin/astrologer-profile-description`
- `GET /public/android-app`
- `GET /admin/android-app`
- `POST /admin/android-app/upload`
- `GET /public/content`
- `GET /admin/content`
- `POST /admin/content/save`
- `POST /admin/content/toggle`
- `POST /admin/content/delete`
- `POST /admin/astrologer-languages`
- `POST /admin/astrologer-pricing`
- `GET /admin/astrologers-data`
- `GET /admin/questions-data`
- `POST /admin/dashboard-touch`
- `GET /admin-data`
- `POST /admin/private-consultation/reject-question`
- `POST /admin/private-consultation/retry-refund`
- `POST /admin/private-consultation/sync-refund`
- `POST /private-consultation/create-order`
- `POST /private-consultation/retry-payment`
- `POST /private-consultation/cancel-payment`
- `POST /private-consultation/recover-payment`
- `POST /private-consultation/verify-payment`
- `POST /create-order`
- `POST /verify-payment`
- `POST /razorpay/webhook`
- `GET /admin/wallet/transactions`
- `GET /public/push-config`
- `GET /api/locations/status`
- `GET /api/locations/search`
- `GET /api/locations/timezone`
- `GET /live/push/status`
- `POST /live/push/register`
- `POST /live/push/unregister`
- `POST /live/push/test`

This group includes normal legacy API handlers that still use the Render backend, as well as some intentionally disabled legacy payment routes. A source handler existing in the Worker does not mean the website is sending traffic to it.

### Explicitly disabled legacy payment behaviour within this group

- `POST /create-order` and `POST /verify-payment` have Worker handlers, but `index.mjs` passes `allowNewQuestions: false`; the legacy New Question payment endpoints return HTTP 410 from the Worker.
- Legacy Private Consultation payment/refund helpers are passed `enablePrivateConsultation: false`. Those retired payment flows must not be enabled as part of the broad migration. The old non-payment Private Consultation paths listed under section 4 have no exact Worker handler.
- `POST /razorpay/webhook` is a server-to-server/provider callback path, so the browser resolver count does not establish whether the provider dashboard is currently configured to call the Worker URL. That external webhook destination needs a separate configuration verification.

## 3. Wallet backfill routes present in source but closed in Production (5)

- `GET /admin/wallet/backfill/status`
- `POST /admin/wallet/backfill/preflight`
- `POST /admin/wallet/backfill/preview`
- `POST /admin/wallet/backfill/apply`
- `POST /admin/wallet/backfill/reconcile`

Production `wrangler.production.jsonc` explicitly sets `SMV_WALLET_BACKFILL_TOOLS_ENABLED` to `false`. Keep these tools closed until a separate, reviewed backfill/reconciliation plan is approved. Do not open this gate to make the whole-backend count appear complete.

## 4. No exact Worker handler found (18)

- `GET /customer/private-consultations`
- `POST /customer/private-consultation/mark-viewed`
- `GET /admin/private-consultations-data`
- `POST /admin/private-consultation/set-commission`
- `POST /admin/private-consultation/set-word-count`
- `POST /admin/private-consultation/set-workflow`
- `POST /admin/private-consultation/approve-question`
- `GET /astrologer/private-consultations`
- `POST /astrologer/private-consultation/submit-answer`
- `POST /admin/private-consultation/approve-answer`
- `POST /admin/private-consultation/reject-answer`
- `GET /horoscope-auth/session`
- `GET /horoscope-feature-config`
- `POST /admin/horoscope-feature-settings`
- `POST /horoscope-payment/create-order`
- `POST /horoscope-payment/verify`
- `POST /api/prediction/horoscope`
- `POST /api/prediction/matching`

These split into 11 legacy Private Consultation paths and 7 Horoscope paths. The Private Consultation product surface is already explicitly disabled in the current Worker registration policy; the user-facing project direction is Live Call/Chat and Booking, not the retired Private Consultation/Ask Now flow. Horoscope/Calendar remain separate product/backend boundaries and the current frontend code explicitly leaves Horoscope/Calendar APIs on Render. These routes are therefore **not migration targets for this audit**; preserve their current backend boundaries unless separately authorised.

## 5. Live Call/Chat timer conformance gap

The Worker uses a Durable Object coordinator with a D1-backed delivery path in Production. The coordinator's existing 8 tests instantiate it without `env.DB`, so they exercise the queue fallback rather than the Production D1-backed branch.

The existing route suite had 12 tests and covered Live request ring scheduling, booking expiry scheduling, cancellation events, disconnect generation state, accept/preparation scheduling, identity checks, and Admin/Astrologer route permissions. It did not assert the `/ready` route's connection timeout scheduling.

The existing local-D1 financial invariant suite had 4 tests for capacity concurrency, stale booking-release protection, atomic Live settlement/rollback, and Razorpay webhook/replay invariants. It did not call `processDeadline()` through the D1-backed coordinator.

This branch adds local-ephemeral-D1 integration coverage for:

1. `session_duration`: once-only final settlement, correct customer/astrologer/Admin wallet movements, and events to both participants.
2. `ring_timeout`: missed request ends with `no_answer`, full cash reserve release, and no earning.
3. `preparation_timeout`: preparing → connecting transition and generation-advanced Call connection deadline.
4. `call_connect_timeout` and `chat_accept_timeout`: full reserve release after failed connection.
5. `booking_expiry`: cash and promotional minute reserve released once, and both participants notified.
6. `disconnect_grace`: stale generation ignored; only the current generation ends the session.
7. `POST /live/sessions/:id/ready`: route contract asserts the durable Call connection timeout is scheduled before active state.

All new D1 tests use Wrangler's ephemeral local SQLite database found by the existing test helper. They do not bind to or write Production D1.

## 6. Production gate decision

Do **not** change `productionTrafficEnabled` to `true` in this audit. The status is currently a deliberate fail-closed aggregate, and the Production readiness workflow explicitly requires it to remain `false` while selected financial routing can be `true`. The website currently routes only 36/149 legacy route pairs to Cloudflare through its resolver. Flipping the aggregate flag would overstate the migration.

The safe next stage after these tests pass is to review the remaining active legacy Render route families one at a time, with explicit product-boundary decisions for retired Private Consultation and separate Horoscope/Calendar endpoints. For every route family, require frontend routing, Worker authorization/response parity, local D1 or Firebase contract coverage as appropriate, staging E2E, and rollback evidence before changing its Production route.

## Sources inspected

- `shared/backend-platform/legacy-backend-route-inventory.mjs`
- `cloudflare/backend-api/src/index.mjs`
- `cloudflare/backend-api/src/live-session-coordinator.mjs`
- `cloudflare/backend-api/src/live-session-routes.mjs`
- `shared/backend-platform/d1-live-session-service.mjs`
- `cloudflare/backend-api/src/legacy-razorpay-routes.mjs`
- `cloudflare/backend-api/src/wallet-domain-backfill-routes.mjs`
- `cloudflare/backend-api/wrangler.production.jsonc`
- `public/index.html`
- `public/smvastro.mjs`
- `.github/workflows/cloudflare-production-d1-readiness-audit.yml`

