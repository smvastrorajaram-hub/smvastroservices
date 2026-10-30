# SMV ASTRO Cloudflare Workers API — Phase 1

This is an isolated, staging-first Worker. It does not replace `server.js`, change any frontend API URL, alter DNS, or take production traffic.

## Phase 1 scope

- `GET /healthz`
- `GET /api/locations/status`
- `GET /api/locations/search?q=Madurai&limit=10&lang=ta`
- `GET /api/locations/timezone?lat=9.9252&lng=78.1198`

The GeoNames username is read only from the `GEONAMES_USERNAME` Worker secret. It is never returned to the browser or included in a cache key. The response mapping preserves the existing API shape expected by SMV ASTRO location-search clients. The selected-place timezone endpoint returns the IANA `timezoneId`; it deliberately does not return a current DST offset for historical birth-time calculations.

The Worker returns cache directives for Cloudflare's edge cache and uses exact-origin CORS. The Worker is deployed on the isolated `workers.dev` hostname; no production custom domain or DNS route is configured.

## One-time Cloudflare account setup

1. In Cloudflare Dashboard, open **Workers & Pages** → **Create application** → **Create Worker** → **Deploy**.
2. Name the starter Worker exactly `smvastro-api-staging`. This first Hello World deployment only reserves the Worker name; the repository workflow will replace its code with the reviewed SMV ASTRO Worker.
3. Do not add a custom domain, route, Pages project, DNS record, or production hostname.
4. In **Workers & Pages → Account Details**, copy the **Account ID**. Alternatively use Dashboard search for `Copy account ID`.
5. Create an **Account API Token** for the deployment pipeline. Prefer the account-owned token so the Workers permission can be scoped to the one existing Worker. Grant **Workers → Editor** for only `smvastro-api-staging`; do not grant Zone DNS, billing, account administration, KV, or R2 permissions. The Worker must already exist because creating a new Worker by API requires broader Workers Admin permission.
6. Keep the API token private. It is shown only once.

Official references:
- Account ID: https://developers.cloudflare.com/fundamentals/account/find-account-and-zone-ids/
- Account API tokens: https://developers.cloudflare.com/fundamentals/api/get-started/create-token/
- Worker permission scopes: https://developers.cloudflare.com/workers/authorization/

## GitHub Actions repository secrets

Open **GitHub → Repository → Settings → Secrets and variables → Actions → New repository secret** and add these four secrets:

| Secret name | Value |
|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | Account ID copied from Workers & Pages |
| `CLOUDFLARE_API_TOKEN` | Account API token with Workers Editor permission scoped only to `smvastro-api-staging` |
| `GEONAMES_USERNAME` | Your activated GeoNames web-services username |
| `ALLOWED_ORIGINS` | Exact staging browser origin: `https://smv-astro-phase1-browser-staging.onrender.com` |

Do not paste any secret into chat, a GitHub issue, a PR comment, a source file, or a public screenshot. The deployment workflow checks for all four secrets without printing their values. If any is missing, it skips deployment safely.

## Staging deployment and live verification

The separate staging deployment workflow is limited to this exact same-repository feature branch and its `workers.dev` service. It does not deploy on pushes to `main` and does not create a custom-domain route.

After adding all four repository secrets, rerun **Cloudflare Workers staging deployment** from the PR's Actions workflow runs. The workflow will:
1. Deploy the reviewed code to `smvastro-api-staging`.
2. Store `GEONAMES_USERNAME` and `ALLOWED_ORIGINS` as encrypted Worker secrets.
3. Test `/healthz`.
4. Check GeoNames configuration status.
5. Search for Madurai and verify the returned location.
6. Resolve coordinates `9.9252, 78.1198` and verify `Asia/Kolkata`.

A successful GitHub Actions run provides the staging Worker URL. No frontend endpoint is switched until this live verification passes.

## Deliberate exclusions

The existing Node backend remains authoritative for authentication-sensitive workflows, Firestore writes, Razorpay verification, refunds, wallet ledger, Call/Chat billing, scheduled appointments, admin workflows, email, Swiss Ephemeris calculation, and PDF generation. These require dedicated compatibility and transactional-safety work before a later migration phase.

The existing India offline location database and all Horoscope/Calendar sources are untouched. No Render service is stopped or changed by this PR.
