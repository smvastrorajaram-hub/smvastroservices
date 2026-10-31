# SMV ASTRO Cloudflare Backend API — staging foundation

This is a separate, isolated Cloudflare Workers staging runtime for the existing Render HTTP backend. It is deliberately **not a production cutover** and does not import or execute the 4,891-line legacy `server.js`.

## Deployed target

- Worker: `smvastro-backend-api-staging`
- Runtime: Express 4 over Cloudflare's documented Node.js HTTP server bridge
- D1 binding: existing empty-schema staging database `smvastro-wallet-staging`
- D1 ID: `0ddb87a9-8a16-4e39-a806-c9137c64959a`
- Worker environment variable: `SMV_BACKEND_CLOUDFLARE_ACTIVE=false`
- No custom domain, route, production DNS, Firebase production project, or live Razorpay key is configured.

## Why this is a runtime foundation, not the full migration

The audited current Render backend exposes approximately 117 Express route registrations. It initializes Firebase Admin and Firestore at startup and also includes:

- Firebase ID-token verification, role/approval checks, multi-project Firestore and server-controlled Admin authorization.
- Razorpay order creation, payment verification/capture, raw webhook signature verification and refunds.
- Wallet balance, ledger, recharge and Admin offer routes.
- Live Call/Chat, WebRTC signaling, server-side settlement and FCM notification delivery.
- SSE dashboard/live-session event streams, in-memory session timers and presence maps.
- Scheduled 24-hour answer commission settlement.
- Firebase Storage APK upload, GeoNames proxy, email delivery and public/admin content endpoints.

The existing financial service is transactionally coupled: Wallet balance/ledger writes and Live Call/Chat reservation/settlement use Firestore transactions. Moving only the Wallet balance code would break atomic settlement. This foundation therefore exposes no business API until the replacements and conformance tests exist.

## Firebase Authentication integration — identity verification only

The staging Worker now exposes `GET /api/auth/session`. It accepts a Firebase ID token in the `Authorization: Bearer` header and verifies its RS256 signature using Google's published Secure Token JWKs, then checks the token's Firebase project audience/issuer against the explicit `FIREBASE_AUTH_PROJECT_IDS` allowlist, UID, expiry, issued-at time, authentication time and Firebase sign-in metadata.

The current staging allowlist is sourced from the existing multi-project Firebase configuration: `smv-astro`, `astro-service-ae9e7`, `smv-astro-services`, `svm-astro`, `smvastro-services`, and `smv-astro-staging`. Add any other currently-used Auth project only after confirming its exact Firebase project ID.

This is **ID-token signature verification only**. It does not call Firebase Admin's user-management API, check disabled/revoked users, read Firestore roles, perform Admin allowlist lookup, or authorize Wallet/Call/Chat operations. The endpoint returns only the signed token's UID, project ID, email-verified flag and sign-in provider. All privileged endpoints remain disabled until authoritative role/profile verification is implemented against the correct Firebase project and independently tested.

The security tests generate temporary RSA signing keys locally and mock Google's public-key endpoint. They cover a valid allowlisted token, rejected project audience, expiry, malformed/unsupported algorithm, forged signature and missing Firebase sign-in metadata. These tests do not substitute for end-to-end tests using real staging Firebase test accounts.

## Cloudflare runtime choices

This Worker uses the official `cloudflare:node` `httpServerHandler` integration with Express. The current route handlers have not yet been ported.

Firestore Admin's `preferRest` option can use HTTP/1.1 REST for supported operations, but Firestore snapshot listeners (`onSnapshot`) require gRPC. Existing SSE dashboards/listeners therefore need an explicit replacement, such as authenticated polling or a Durable Object-backed event hub. Live-session timers and the 15-minute answer-credit sweep cannot depend on process-local timers or Maps; they need durable alarms/queues and a Cron Trigger. Firebase Admin Messaging and Storage need separate staging compatibility tests before use from Workers.

The main application uses native Swiss Ephemeris/ephemeris assets and a separate Horoscope server. Those files and the separate SMV HOROSCOPE/CALENDAR runtime are outside this PR and must not be bundled into or changed by this migration.

## Safety contract

- `/healthz` proves only that the Express-to-Workers runtime responds.
- `/api/backend/readiness` checks the existing staging D1 schema.
- `/api/backend/migration-status` documents which integrations are deliberately not connected.
- All unfinished `/api/*` routes return HTTP 503 `BACKEND_MIGRATION_NOT_CUT_OVER`.
- No Firebase data is copied; no existing Firebase functions, Firestore rules, user roles, or Razorpay credentials are modified.
- No frontend API base URL, `/api/smv-mode`, domain, DNS, Render setting, or production traffic is changed.
- The Worker has access only to the explicitly named staging D1 binding. Business routes remain disabled.

## Next implementation gates

1. Run end-to-end Firebase Auth staging-account tests for every currently-used Auth project and decide whether disabled/revoked-user checks are required. Keep role/approval authority in Firebase profiles/admin allowlists; do not trust client-supplied role claims.
2. Prove Firebase Admin Firestore REST transport compatibility with the existing CRUD, query, batch, transaction and multi-project calls. Reject any untested SDK operation. Replace `onSnapshot` routes rather than relying on gRPC.
3. Port non-financial route families in small groups and compare response contracts with existing browser clients.
4. Port Razorpay using direct HTTPS API calls and constant-time Web Crypto HMAC verification. Preserve raw webhook-body validation, order/payment amount/currency/status checks, capture verification, duplicate-event protection and refund reconciliation. Test with Razorpay Test Mode only.
5. Implement Wallet + Call/Chat as one D1 transaction domain with integer paise, immutable ledger, unique idempotency keys, reservation/release/settlement, offer-minute usage, commission, refunds and the existing ₹300 withdrawal minimum/7-day lock. Use concurrency and replay tests before enabling any route.
6. Replace FCM, Storage/APK, email and realtime/background work with individually tested Workers-compatible adapters, R2/Queues/Durable Objects/Cron as appropriate.
7. Run full route-parity, authorization, finance reconciliation, load/limit and browser tests. Only after sign-off should a separate, reversible frontend/DNS cutover be planned.

## Deployment

A GitHub Actions workflow deploys only this staging Worker using `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. It does not require Render pipeline minutes. Do not enable the Worker as the frontend API target until every required route is implemented and tested.
