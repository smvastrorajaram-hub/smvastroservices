# SMV ASTRO Cloudflare Workers API — Phase 1

This is an isolated, staging-first Worker. It does not replace `server.js`, change any frontend API URL, alter DNS, or take production traffic.

## Phase 1 scope

- `GET /healthz`
- `GET /api/locations/status`
- `GET /api/locations/search?q=Madurai&limit=10&lang=ta`
- `GET /api/locations/timezone?lat=9.9252&lng=78.1198`

The GeoNames username is read only from the `GEONAMES_USERNAME` Worker secret. It is never returned to the browser or included in a cache key. The response mapping preserves the existing API shape expected by SMV ASTRO location-search clients. The selected-place timezone endpoint returns the IANA `timezoneId`; it deliberately does not return a current DST offset for historical birth-time calculations.

The Worker uses Cloudflare Workers Cache, enabled in Wrangler config. Cache TTLs are expressed through `Cache-Control` response headers, and `Vary: Origin` keeps the CORS response aligned with its requesting origin. The code does not rely on the legacy Cache API for this `workers.dev` staging endpoint.

## Staging deploy via GitHub Actions

The PR includes a separate staging-only workflow. It is limited to this exact feature branch and same-repository pull requests. It does not deploy on pushes to `main` and it does not configure a custom domain.

Before the workflow can deploy, add these four **GitHub Actions repository secrets** in the repository:

| Secret name | Value |
|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID for the account that owns the Worker |
| `CLOUDFLARE_API_TOKEN` | Account-scoped API token with the custom **Edit Cloudflare Workers** permission |
| `GEONAMES_USERNAME` | Your activated GeoNames web-services username |
| `ALLOWED_ORIGINS` | Exact browser origin(s), comma-separated; for the current staging browser use `https://smv-astro-phase1-browser-staging.onrender.com` |

GitHub location: **Repository → Settings → Secrets and variables → Actions → New repository secret**.

Cloudflare token guidance:
1. In Cloudflare Dashboard, open **Manage Account → Account API tokens** and create a custom token.
2. Select **Edit Cloudflare Workers** and restrict its account resource to only the Cloudflare account used for SMV ASTRO.
3. Copy the token once and store it directly in the GitHub Actions secret `CLOUDFLARE_API_TOKEN`. Do not paste it into chat, source files, issues, or PR comments.
4. Find the account ID from the Cloudflare account overview and save it as `CLOUDFLARE_ACCOUNT_ID`.

The workflow first checks that all four secrets exist without printing their values. If any is missing, it skips deployment safely. When all are present, it deploys only `smvastro-api-staging`, uploads `GEONAMES_USERNAME` and `ALLOWED_ORIGINS` as encrypted Worker secrets, and performs live smoke tests for health, a Madurai search, and the `Asia/Kolkata` timezone response.

After adding the secrets, rerun the skipped **Cloudflare Workers staging deployment** workflow from the pull request's Actions run page. A successful run prints the isolated `workers.dev` URL.

## Local validation

From this directory, run `npx --yes wrangler@4.156.0 dev` for local runtime testing. Validate a bundle without deploying using `npx --yes wrangler@4.156.0 deploy --dry-run`.

## Deliberate exclusions

The existing Node backend remains authoritative for authentication-sensitive workflows, Firestore writes, Razorpay verification, refunds, wallet ledger, Call/Chat billing, scheduled appointments, admin workflows, email, Swiss Ephemeris calculation, and PDF generation. These require dedicated compatibility and transactional-safety work before a later migration phase.

The existing India offline location database and all Horoscope/Calendar sources are untouched. No Render service is stopped or changed by this PR.
