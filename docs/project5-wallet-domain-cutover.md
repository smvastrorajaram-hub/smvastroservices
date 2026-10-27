# Project 5 Wallet/Live Session domain — guarded preflight

> **Current scope:** this PR adds preparation/configuration and a guarded migration tool only. It does not yet route production Wallet or Live Session requests to Project 5. A separate source integration must coordinate live profiles, Admin/Astrologer earnings, withdrawals, booking/session writes, all Wallet credits/debits/refunds, and client indexes before any cutover flag may be enabled.

Project 5 supplied for this change:

- Firebase project name: `smvastro`
- Project ID: `smvastro-services`
- Project number: `862081928731`

This change only adds guarded configuration and a non-destructive data-copy tool. It does **not** route production Wallet or Live Session traffic to Project 5, set Render environment variables, merge itself, or create/modify Firebase resources. The Wallet and Live Session billing path must stay on Project 1 until a complete domain cutover has been tested.

## Why this is a coordinated domain

Live-session creation, reserve, settlement, refunds/release, wallet balance changes, and ledger writes currently use a single Firestore transaction containing both `smv_live_sessions` / `smv_live_bookings` and `smv_wallets` / `smv_wallet_transactions`. Firestore transactions cannot span Project 1 and Project 5. Moving only `smv_wallets` would break the atomic billing guarantee.

The backfill tool copies the Wallet and live-session billing records together and also copies the relevant session participants' profile shadows, session settings, appointment references, live-session earning records, and withdrawal records. It preserves Project 1 and never deletes source documents. Auth identities/UIDs remain in Project 1; Project 5 is not a new Authentication project.

## Render variables — names only

After creating a service account that can access Project 5, add these to the existing Render backend Environment page. Never put the private key into GitHub/source code.

- `FIREBASE_WALLET_DOMAIN_PROJECT_ID=smvastro-services`
- `FIREBASE_WALLET_DOMAIN_CLIENT_EMAIL=<Project 5 service-account client email>`
- `FIREBASE_WALLET_DOMAIN_PRIVATE_KEY=<Project 5 service-account private key, stored as a secret>`
- `SMV_WALLET_DOMAIN_ENABLED=true`

The old four-project flag is not required for preparing Project 5. It can be initialized independently. The new routing state remains false unless backfill, cutover, and dependency-verification gates are explicitly enabled. This PR intentionally does not enable those gates.

## Firestore rules and indexes

Use `firebase.multi-project-wallet-domain.json` as the Firebase CLI configuration when deploying to Project 5. It applies the deny-all secondary-project rules and the existing index definitions; verify the index build state in the Firebase console before any migration or cutover. Admin SDK calls bypass client rules, so keep Project 5 service-account credentials restricted to the backend/migration environment.

## Backfill workflow

1. Wait until Project 1 can be read again; the migration must compare/copy source documents and cannot reconstruct missing quota-blocked reads.
2. Schedule downtime and stop/disable the production backend before an `--apply` copy. Ensure no active/ringing/preparing/connecting/active Live Sessions, pending bookings, or pending Razorpay wallet recharges. Also ensure the project is not receiving transactions from another backend instance.
3. Run dry-run first:
   `SMV_WALLET_DOMAIN_ENABLED=true node scripts/backfill-wallet-domain.js`
4. Inspect the collection counts. A failed query or quota error means the backfill is incomplete; do not proceed.
5. Only while the backend is stopped, set `SMV_WALLET_DOMAIN_QUIESCED=true` in the migration environment and run:
   `SMV_WALLET_DOMAIN_ENABLED=true SMV_WALLET_DOMAIN_QUIESCED=true node scripts/backfill-wallet-domain.js --apply`
6. Reconcile the source/target wallet counts, each balance against the sum/semantics of its ledger, recharges and Razorpay order references, live-session state, participant profiles, earnings and withdrawals. The script intentionally never sets `SMV_WALLET_DOMAIN_BACKFILL_COMPLETE`, `SMV_WALLET_DOMAIN_DEPENDENCIES_VERIFIED`, or `SMV_WALLET_DOMAIN_CUTOVER_COMPLETE`.
7. Do not turn the cutover flags on until a separate integration change completes profile/rate/settings synchronization, reroutes the admin/astrologer earnings and withdrawal reads, and passes the full Wallet + Live Session billing suite. During the initial preflight, all production traffic remains on Project 1.

## Security and correctness

- Project 5 Firestore rules must deny client writes to wallets, transactions, recharges, payout details, and billing/session collections. Server operations must use the service account and continue validating Firebase ID tokens/roles.
- Do not fail over individual financial transaction reads/writes between Project 1 and Project 5. That can split an idempotency key or show a stale balance. Any later cutover must route the complete transaction domain to one database.
- Do not share the Project 1 private key or any user credential in this PR or chat.
