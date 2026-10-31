# SMV ASTRO Cloudflare Wallet API + D1 — infrastructure phase

This is an isolated **staging-only infrastructure scaffold**. It does not replace any existing Firebase project or Firebase function. It does not redirect production traffic, change Render, update DNS, read or copy customer data, or process live Wallet transactions.

## Scope of this phase

- Worker service: `smvastro-wallet-api-staging`
- D1 database: `smvastro-wallet-staging`
- Public health endpoint: `GET /healthz`
- D1 readiness/schema endpoint: `GET /api/wallet/v1/readiness`
- Versioned D1 migration: `migrations/0001_wallet_live_domain.sql`
- Staging-only manual deployment workflow, which applies the schema only to the named staging D1 database

**No Wallet/Call/Chat business route is enabled in this phase.** Other `/api/wallet/v1/*` routes return HTTP 503 with `WALLET_DOMAIN_NOT_CUT_OVER`. This is deliberate: a partially deployed payment backend must fail closed, not read an empty database and show a false zero balance or debit a customer without a reconciled ledger.

## Firebase scope

All currently used Firebase projects and functions remain in place. This phase does not assume Project 1 is the only source and does not rename, delete, merge, or repoint Firebase projects. Existing Firebase Authentication/login/email verification, roles and approval profiles, Admin Offer configuration, Razorpay order creation and payment verification, and existing dashboards remain unchanged. Any later event bridge must identify and authenticate the source Firebase project explicitly; a client-supplied project ID or role must never be trusted.

Offer definitions remain authoritative in the existing Admin/Firebase configuration. Later, a restricted server-to-server event/projection can copy verified offer rules to D1; bonus-minute granting and usage will only move after idempotency and reconciliation are implemented. The D1 schema uses `source_project_id` for records that originate in any configured Firebase project.

## D1 schema in this phase

The migration adds tables for wallet account balances and ledger, verified Razorpay recharge receipts, projected Admin offer rules and per-recharge offer usage, bookings, live sessions, chat messages, WebRTC signals, commission/earnings entries, refunds, withdrawals, Firebase source-event idempotency, domain idempotency/outbox, and schema version metadata.

Money is integer paise. The schema applies uniqueness/idempotency constraints to Razorpay order/payment IDs, ledger keys, messages, bookings, sessions, refunds, and event IDs. The schema contains no production data and does not migrate or delete Firebase records. Rate and commission values are snapshots for the relevant session; the actual calculation and cutover logic will be added and tested in a later phase. The existing ₹300 minimum withdrawal rule is represented as a database constraint; the seven-day lock and payout workflow still need service-level enforcement and compatibility tests before cutover.

## Create the isolated Cloudflare resources

1. In Cloudflare Dashboard → **Workers & Pages**, create a Worker named exactly `smvastro-wallet-api-staging`. Keep it on `workers.dev`; do not configure a custom domain, route, or production DNS.
2. In Cloudflare Dashboard → **D1 SQL Database**, create a database named exactly `smvastro-wallet-staging`. Choose the Asia-Pacific (`apac`) location hint if available to reduce geographic latency for this India service. Do not import any data.
3. Create an API token only after both resources exist. Grant only the account-scoped Workers edit permission for `smvastro-wallet-api-staging` and D1 edit permission for `smvastro-wallet-staging`. Do not grant Zone DNS, account administration, billing, R2, or unrelated permissions. Store the token only in GitHub Actions secrets; do not paste it into chat or source files.
4. In GitHub repository Settings → Secrets and variables → Actions, add:

| Secret | Value |
|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID |
| `CLOUDFLARE_API_TOKEN` | Narrowly scoped token for the named Worker and D1 database |
| `CLOUDFLARE_D1_DATABASE_ID` | UUID/ID displayed for `smvastro-wallet-staging` |
| `ALLOWED_ORIGINS` | Exact origin(s) allowed to call the staging API, comma-separated; no wildcard |

Never paste or commit secret values. The workflow checks that the secrets are present without printing them. It substitutes the D1 ID only into a temporary, untracked deployment config.

## Staging deployment

On the dedicated Draft PR/branch, open Actions → **Cloudflare Wallet API staging deployment** → **Run workflow**. The workflow is restricted to the exact feature branch, deploys only `smvastro-wallet-api-staging`, applies the versioned migration only to `smvastro-wallet-staging`, and smoke-tests health/schema readiness. If a secret is missing it skips deployment. It does not enable Wallet business routes.

Expected checks after a successful deployment:

- `GET /healthz` returns `ok: true`, with `walletDomainActive: false`.
- `GET /api/wallet/v1/readiness` returns `ready: true` and schema version `0001_wallet_live_domain`.
- Any not-yet-implemented business route remains disabled and returns `WALLET_DOMAIN_NOT_CUT_OVER`.

No Worker custom domain or DNS change is included. Do not merge this PR to production. Live business functionality needs separate Firebase-ID-token verification for every legitimate Auth project, authoritative role/profile checks, secure Razorpay event proof, transactional D1 operations, idempotent replay tests, source reconciliation, and an explicitly approved cutover/failover mechanism.

## Official references

- D1 getting started: https://developers.cloudflare.com/d1/get-started/
- D1 migrations: https://developers.cloudflare.com/d1/reference/migrations/
- Wrangler D1 commands: https://developers.cloudflare.com/d1/wrangler-commands/
- Firebase ID token verification model (for the later auth phase): https://firebase.google.com/docs/auth/admin/verify-id-tokens
