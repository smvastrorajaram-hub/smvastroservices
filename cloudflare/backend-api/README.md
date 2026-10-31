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

## One shared backend source — Render + Cloudflare

The platform-neutral modules live in `shared/backend-platform/` and are imported by both runtimes:

- `firebase-id-token.mjs`: RS256 Firebase ID-token verification, with the same issuer/project/expiry checks in Node.js on Render and Cloudflare Workers.
- `firebase-firestore-rest.mjs`: authenticated Firestore document reads using the verified user's Firebase ID token. Firestore Security Rules remain active; this does not use a service-account Admin bypass.
- `firebase-authorization.mjs`: shared Admin / customer / astrologer status resolution. A mutable `smv_users.role=admin` value alone never grants Admin.

Render's existing Express `server.js` now imports the same ID-token verifier for `requireUser` and the same Firestore REST reader for the `smv_admins/{uid}` fallback check. The existing Render service, `render.yaml`, build command, start command, environment configuration and deployment connection have not been changed in this PR.

Cloudflare's Express Worker imports those same modules. It verifies the staging Firebase ID token, then reads only the caller's own `smv_users/{uid}`, `smv_admins/{uid}` and `smv_astrologers/{uid}` documents through Firestore REST; Firestore Security Rules control the result. Its staging allowlist is restricted to `smv-astro-staging`, not every Firebase project in the repository.

This is the shared platform foundation and identity/role integration only. The remaining 117 route handlers, Razorpay, Wallet, Call/Chat, bookings, Storage, FCM, email and scheduled/realtime functions are not yet at full parity. Therefore clients are **not** switched to Cloudflare failover yet.

## Independent deployment path

The Cloudflare staging deployment workflow is independent of Render's build pipeline. It runs for this PR and on `main` pushes that change the shared backend/runtime files. There is no dependency on a successful Render deployment and it does not call a Render deploy hook. If Render's pipeline minutes are exhausted and its deployment fails, this GitHub Actions job can still deploy the same merged shared source to the Cloudflare staging Worker.

That is deployment resilience, not yet live traffic failover. The Worker remains a staging service on `workers.dev`; no production hostname, DNS, frontend API URL or automatic request routing is changed. Before it can serve live traffic as a Render fallback, all required route families and financial flows must pass route-parity, authorization, concurrency, payment replay, data-reconciliation and browser tests. A separate production cutover will then be required.

## Firebase Authentication integration — identity verification only

The staging Worker now exposes `GET /api/auth/session`. It accepts a Firebase ID token in the `Authorization: Bearer` header and verifies its RS256 signature using Google's published Secure Token JWKs, then checks the token's Firebase project audience/issuer against the explicit `FIREBASE_AUTH_PROJECT_IDS` allowlist, UID, expiry, issued-at time, authentication time and Firebase sign-in metadata.

The current Cloudflare staging allowlist is restricted to `smv-astro-staging`. Render uses only its existing `FIREBASE_PROJECT_ID` value, so each deployment verifies tokens for its own configured Firebase project. Do not add cross-environment Firebase project IDs to the staging allowlist.

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

1. Run end-to-end Firebase Auth staging-account tests for the isolated staging Auth project and verify profile/approval reads against the real staging Security Rules. Keep role/approval authority in Firebase profiles/admin allowlists; do not trust client-supplied role claims.
2. Prove Firebase Admin Firestore REST transport compatibility with the existing CRUD, query, batch, transaction and multi-project calls. Reject any untested SDK operation. Replace `onSnapshot` routes rather than relying on gRPC.
3. Port non-financial route families in small groups and compare response contracts with existing browser clients.
4. Port Razorpay using direct HTTPS API calls and constant-time Web Crypto HMAC verification. Preserve raw webhook-body validation, order/payment amount/currency/status checks, capture verification, duplicate-event protection and refund reconciliation. Test with Razorpay Test Mode only.
5. Implement Wallet + Call/Chat as one D1 transaction domain with integer paise, immutable ledger, unique idempotency keys, reservation/release/settlement, offer-minute usage, commission, refunds and the existing ₹300 withdrawal minimum/7-day lock. Use concurrency and replay tests before enabling any route.
6. Replace FCM, Storage/APK, email and realtime/background work with individually tested Workers-compatible adapters, R2/Queues/Durable Objects/Cron as appropriate.
7. Run full route-parity, authorization, finance reconciliation, load/limit and browser tests. Only after sign-off should a separate, reversible frontend/DNS cutover be planned.

## Deployment

A GitHub Actions workflow deploys only this staging Worker using `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. It does not require Render pipeline minutes. Do not enable the Worker as the frontend API target until every required route is implemented and tested.
