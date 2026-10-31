# SMV ASTRO Cloudflare Wallet API + D1 — infrastructure phase

This is an isolated **staging-only infrastructure scaffold**. It does not replace any existing Firebase project or Firebase function. It does not redirect production traffic, change Render, update DNS, read or copy customer data, or process live Wallet transactions.

## Scope of this phase

- Worker service: `smvastro-wallet-api-staging`
- D1 database: `smvastro-wallet-staging`
- Configured staging D1 database ID: `0ddb87a9-8a16-4e39-a806-c9137c64959a`
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

## Cloudflare resources already identified

- D1 database name: `smvastro-wallet-staging`
- D1 database ID: `0ddb87a9-8a16-4e39-a806-c9137c64959a`
- The staging browser origin is configured as a non-secret `ALLOWED_ORIGINS` variable in `wrangler.jsonc`.

If the Worker has not yet been created, in Cloudflare Dashboard → **Workers & Pages**, create a Worker named exactly `smvastro-wallet-api-staging`. Keep it on `workers.dev`; do not configure a custom domain, route, or production DNS. Do not import any Firebase/production data into the staging D1.

## GitHub Actions secrets needed to deploy

Open GitHub → repository → Settings → Secrets and variables → Actions and add only:

| Secret | Value |
|---|---|
**Repository Actions variable** (not a secret):

| Variable | Value |
|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare Account ID |

**Repository Actions secret:**

| Secret | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Narrowly scoped token for the named Worker and D1 database |

Add the Account ID under Settings → Secrets and variables → Actions → Variables → New repository variable. Add the token under the Secrets tab. Use the least privilege available for the existing Worker and D1. Do not grant Zone DNS, account administration, billing, R2, or unrelated permissions. Keep the token only in GitHub Actions secrets. Never paste or commit token values.

The database ID is configuration, not an API credential; it is already wired into `wrangler.jsonc`. The CORS origin is also configured as a non-secret staging variable.

## Staging deployment

On the dedicated Draft PR/branch, open Actions → **Cloudflare Wallet API staging deployment** → **Run workflow**. This repository deploy workflow uses `CLOUDFLARE_ACCOUNT_ID` from Actions Variables and `CLOUDFLARE_API_TOKEN` from Actions Secrets. The workflow is restricted to the exact feature branch, deploys only `smvastro-wallet-api-staging`, applies the versioned migration only to `smvastro-wallet-staging`, and smoke-tests health/schema readiness. If the Cloudflare Account ID or API token secret is missing, it skips deployment. It does not enable Wallet business routes.

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
