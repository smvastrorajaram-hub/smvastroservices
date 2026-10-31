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

## Cloudflare Git Builds versus the GitHub Actions deployment used here

This PR uses the **manual GitHub Actions deployment workflow** because that single workflow applies the D1 migration, deploys the Worker, and verifies the staging API. Avoid running two independent deployment pipelines against the same Worker.

If you attempted to deploy by connecting this monorepo in Cloudflare Workers Builds and saw `npm ci` / `npm clean-install` fail, the build was running at the repository root and reading the main SMV ASTRO `package.json` / `package-lock.json`. That mismatch is unrelated to the standalone Wallet Worker. Do not change the repository-root lockfile to solve this Worker-specific build.

For the deployment method in this PR:
1. Keep the Cloudflare Worker resource `smvastro-wallet-api-staging`.
2. In Workers & Pages → select that Worker → Settings → Builds → select **Disconnect** for the repository build integration, so it does not independently deploy on pushes.
3. The GitHub Actions workflow below deploys to the existing Worker using the token stored in GitHub Actions. If the Worker was not actually created because its first build failed, create a blank/Hello World Worker named exactly `smvastro-wallet-api-staging` in the Cloudflare dashboard without connecting the Git repository.
4. Do not delete the D1 database. The deployment workflow applies the migration only to the configured staging D1 database.

Cloudflare documents the Root directory, optional Build command, Deploy command, and Disconnect controls here:
- https://developers.cloudflare.com/workers/ci-cd/builds/configuration/
- https://developers.cloudflare.com/workers/ci-cd/builds/

## GitHub Actions settings needed to deploy

Open GitHub → repository → Settings → Secrets and variables → Actions:

**Repository Actions variable** (not a secret):

| Variable | Value |
|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare Account ID |

**Repository Actions secret:**

| Secret | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Narrowly scoped token for the named Worker and D1 database |

Add the Account ID under Settings → Secrets and variables → Actions → Variables → New repository variable. Add the token under the Secrets tab. Use a Custom Token with only Account → Workers Scripts → Edit and Account → D1 → Edit. Scope the token to the single Cloudflare account shown by the Account ID above; leave Zone resources and Zone permissions empty. Cloudflare API token resource scoping selects User, Account, or Zone (not an individual Worker/D1 database), so these two account permissions apply to Workers Scripts and D1 resources in that selected account. Do not grant Workers Routes, KV, R2, Zone DNS, account administration, billing, or unrelated permissions. Keep the token only in GitHub Actions secrets. Never paste or commit token values.

The database ID is configuration, not an API credential; it is already wired into `wrangler.jsonc`. The CORS origin is also configured as a non-secret staging variable.

## Staging deployment

The staging workflow runs automatically only when PR #253 is opened or updated on its dedicated same-repository branch. The `workflow_dispatch` option is retained as a fallback for later, after the workflow is registered on the default branch. For the current Draft PR, do not look for the Run workflow button; simply push a PR update and inspect the resulting Actions run. This deploy workflow uses `CLOUDFLARE_ACCOUNT_ID` from Actions Variables and `CLOUDFLARE_API_TOKEN` from Actions Secrets. The workflow is restricted to the exact feature branch, deploys only `smvastro-wallet-api-staging`, applies the versioned migration only to `smvastro-wallet-staging`, and smoke-tests health/schema readiness. If the Cloudflare Account ID or API token secret is missing, it skips deployment. It does not enable Wallet business routes.

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
