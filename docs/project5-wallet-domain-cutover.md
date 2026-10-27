# Project 5 Wallet/Live Session domain — guarded integration

> **Active product scope:** Consult an Astrologer, Astrologer list, Live Call, Live Chat, Book a Call, Book a Chat, Wallet recharge, reserve/debit/release/refund ledger entries, Razorpay recharge webhook, commission/earnings, and withdrawals. The retired Private Consultation flow is explicitly outside this integration; its legacy wallet payment endpoint is blocked once a Project 5 cutover is active.

> **Runtime safety:** Source routing is integrated behind one shared database resolver. Production still uses Project 1 unless the source integration gate, successful backfill, dependency verification and explicit cutover flags are all true. No Render environment variables were changed, no backfill was run, no production data/resources were changed, and this Draft PR is not merged.

Project 5 supplied for this change:

- Firebase project name: `smvastro`
- Project ID: `smvastro-services`
- Project number: `862081928731`

This change adds guarded runtime routing for the active Wallet/Call/Chat domain, a quiescence-checked non-destructive copy tool, and a read-only source/target reconciliation tool. It does **not** set Render environment variables, enable the cutover, merge itself, or create/modify Firebase resources. The runtime gate remains disabled until the integration/test workflow is green and the explicit migration review is completed.

## Why this is a coordinated domain

Live-session creation, reserve, settlement, refunds/release, wallet balance changes, and ledger writes currently use a single Firestore transaction containing both `smv_live_sessions` / `smv_live_bookings` and `smv_wallets` / `smv_wallet_transactions`. Firestore transactions cannot span Project 1 and Project 5. Moving only `smv_wallets` would break the atomic billing guarantee.

The backfill tool copies Wallet balances/ledger/recharges, recharge offers and usage, all active-domain live sessions/bookings (including message/signal subcollections), scheduled Call/Chat appointments, the session pricing and commission settings, live-session earning records, withdrawals and private payout snapshots, every Wallet recharge Razorpay order, and webhook idempotency records. Project 1 is preserved and source documents are never deleted. Auth identities/UIDs, FCM registration tokens, and the authoritative login/role/rate/approval profiles remain in Project 1; Project 5 is not a new Authentication project. The live service reads those current profiles from Project 1 and commits all session/wallet/ledger/earning mutations in one Project 5 transaction after cutover. Profile and appointment status projections are synced back to Project 1 for existing dashboards and Astrologer-list availability.

## Render variables — names only

After creating a service account that can access Project 5, add these to the existing Render backend Environment page. Never put the private key into GitHub/source code.

- `FIREBASE_WALLET_DOMAIN_PROJECT_ID=smvastro-services`
- `FIREBASE_WALLET_DOMAIN_CLIENT_EMAIL=<Project 5 service-account client email>`
- `FIREBASE_WALLET_DOMAIN_PRIVATE_KEY=<Project 5 service-account private key, stored as a secret>`
- `SMV_WALLET_DOMAIN_ENABLED=true`

The old four-project flag is not required for preparing Project 5. It can be initialized independently. The source-level `WALLET_DOMAIN_RUNTIME_ROUTING_IMPLEMENTED` readiness gate is now true because the active Wallet/Call/Chat routing is implemented and guarded by automated tests. That does **not** switch production to Project 5 by itself: production remains on Project 1 unless the backfill, dependency-verification, runtime-integration-verification, and explicit cutover flags are all true. Do not set those Render flags until a controlled backfill has finished, the read-only validator reports `ok=true` and `cutoverSafe=true`, and the controlled end-to-end tests are reviewed. This PR intentionally does not set any production cutover flag.

## FCM versus Project 3 WebRTC data

The current source keeps the production browser FCM configuration on Project 1 (`smv-astro`; sender ID `299081899217`) in `public/sw.js`. The backend initializes Firebase Admin from Render's `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY`, and `live-session-service.js` sends incoming-call/chat pushes through `admin.messaging().send()`. The separate `FCM_VAPID_PUBLIC_KEY` exposed by `/public/push-config` is a Web Push public key, not the Admin service-account private key.

Project 3 (`smv-astro-services`) is configured as the auxiliary Live Data project. In the existing code, Chat messages and WebRTC offer/answer/ICE signals are validated and written through the primary database first, then best-effort mirrored to Project 3; mirror reads only become eligible after their backfill flag and per-session ready marker. Project 3 does not have to send FCM merely because it stores or serves signaling data.

Therefore Project 1 FCM can continue delivering incoming-request notifications while Project 3 handles mirrored/eligible signaling data. Keep FCM registration tokens generated for Project 1 paired with the Project 1 sender credential. If client tokens are ever registered against Project 3, sending them with the Project 1 sender can fail with sender/credential mismatch; in that case, use a dedicated Project 3 Admin Messaging sender and a distinct Project 3 token registration flow. Do not change the production FCM client config just to move Firestore signals.

This is architecture-level source verification, not a live-device FCM delivery test. WebRTC media still requires the participants' browser/app to join, grant microphone permission, and complete peer negotiation; FCM alerts a user and does not carry voice media.

## Firestore rules and indexes

Use `firebase.multi-project-wallet-domain.json` as the Firebase CLI configuration when deploying to Project 5. It applies the deny-all secondary-project rules and the existing index definitions; verify the index build state in the Firebase console before any migration or cutover. Admin SDK calls bypass client rules, so keep Project 5 service-account credentials restricted to the backend/migration environment.

## Backfill workflow

1. Wait until Project 1 can be read again; the migration must compare/copy source documents and cannot reconstruct missing quota-blocked reads.
2. Schedule downtime and stop/disable the production backend before an `--apply` copy. Ensure no active/ringing/preparing/connecting/active Live Sessions, pending bookings, or pending Razorpay wallet recharges. Also ensure the project is not receiving transactions from another backend instance.
3. Run dry-run first:
   `SMV_WALLET_DOMAIN_ENABLED=true node scripts/backfill-wallet-domain.js`
4. Inspect the source counts; a failed query/quota error means the snapshot is incomplete. The `--apply` command now actively refuses to run while ringing/preparing/connecting/active Live Sessions, pending/reserved Live bookings, or non-terminal Wallet recharges remain.
5. Only while all backend instances are stopped, set `SMV_WALLET_DOMAIN_QUIESCED=true` in the migration environment and run:
   `SMV_WALLET_DOMAIN_ENABLED=true SMV_WALLET_DOMAIN_QUIESCED=true node scripts/backfill-wallet-domain.js --apply`
6. Run the read-only validator:
   `SMV_WALLET_DOMAIN_ENABLED=true node scripts/validate-wallet-domain.js`
   It compares source/target IDs and full document values for Wallet balances/ledger/recharges, offers and offer usage, Live Sessions/bookings, child messages/signals, scheduled appointments, referenced Razorpay wallet orders/webhook markers, earnings and withdrawal records. It also reconciles each Wallet balance against the latest applicable ledger snapshots, verifies every paid recharge has its matching paid Razorpay order and idempotent credit-ledger row, checks profile mirrors and billing settings, and blocks on non-terminal sessions/bookings/recharges or leftover Wallet reserves. The command exits non-zero unless every comparison matches and there are no cutover blockers; it does not modify either database or any environment flag.
7. Review and retain the validator report. Only after the report has `ok=true` and `cutoverSafe=true`, run a controlled end-to-end Wallet + Live Call/Chat test, and verify the Project 5 rules/indexes and profile projections, may an operator separately set `SMV_WALLET_DOMAIN_BACKFILL_COMPLETE`, `SMV_WALLET_DOMAIN_DEPENDENCIES_VERIFIED`, `SMV_WALLET_DOMAIN_RUNTIME_INTEGRATION_VERIFIED`, and `SMV_WALLET_DOMAIN_CUTOVER_COMPLETE`. Never set cutover flags as part of the copy/validation scripts.

## Security and correctness

- Project 5 Firestore rules must deny client writes to wallets, transactions, recharges, payout details, and billing/session collections. Server operations must use the service account and continue validating Firebase ID tokens/roles.
- Do not fail over individual financial transaction reads/writes between Project 1 and Project 5. That can split an idempotency key or show a stale balance. Any later cutover must route the complete transaction domain to one database.
- Do not share the Project 1 private key or any user credential in this PR or chat.
