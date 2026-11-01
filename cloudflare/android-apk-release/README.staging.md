# SMV ASTRO APK Release Worker — isolated Staging

This configuration deploys the existing APK Worker source as a **separate Staging Worker**. It must never use the Production Worker, Production D1 database, or Production R2 bucket.

## Fixed Staging resource identities

- Worker: `smv-astro-apk-release-api-staging`
- D1 database: `smv-astro-apk-releases-staging`
- R2 bucket: `smv-astro-apk-releases-staging`
- Firebase Auth project accepted by this Worker: `smv-astro-staging`
- Allowed browser origin: `https://smv-astro-phase1-browser-staging-v2.onrender.com`
- Worker URL after creation: `https://smv-astro-apk-release-api-staging.astroservices.workers.dev`

The database ID in `wrangler.staging.toml` is deliberately a zero UUID placeholder. The deployment workflow requires the separate repository variable `CLOUDFLARE_APK_STAGING_D1_ID`, verifies that the live D1 name and ID match, and refuses the known Production D1 ID. Do not copy the Production database ID.

## One-time Cloudflare Staging resource setup

Create these resources in the same Cloudflare account that owns the current Workers account subdomain, but create them as new resources:

1. Create an R2 bucket named exactly `smv-astro-apk-releases-staging`.
2. Create a D1 database named exactly `smv-astro-apk-releases-staging`.
3. Save the new D1 database ID as GitHub repository variable `CLOUDFLARE_APK_STAGING_D1_ID`. A resource ID is not a credential.
4. Create a **new Cloudflare API token** limited to this Staging Worker, this Staging D1 database and this Staging R2 bucket. Save it as GitHub repository secret `CLOUDFLARE_APK_RELEASE_STAGING_API_TOKEN`. Do not reuse `CLOUDFLARE_API_TOKEN` or `CLOUDFLARE_APK_RELEASE_API_TOKEN`.
5. Reuse the already configured `CLOUDFLARE_ACCOUNT_ID` repository variable. The token needs Workers deployment permission for this new Worker, D1 read/edit permission for this new database, and R2 read/write permission for this new bucket.

The deployment config starts with `ALLOW_APK_UPLOADS = "false"`. The initial deployment is read-only at the application level. The worker may report healthy with an empty D1 release table; it does not import, copy, delete, or inspect Production APK records or binaries.

## Admin authorization

Only Firebase ID tokens issued by `smv-astro-staging` are accepted. Configure the Staging Admin identity using either a verified Admin custom claim (`admin: true` or `role: "admin"`) or the Staging-only Admin UID/email allowlists. The optional allowlists are supplied to the manual deployment workflow through repository variable `SMV_APK_STAGING_ADMIN_UIDS` and/or secret `SMV_APK_STAGING_ADMIN_EMAILS`. Never place a Production Admin UID in the Staging allowlist merely to make a test pass.

Admin uploads remain disabled until the required Staging identity is configured and a later manual workflow dispatch explicitly selects `yes` for the upload gate. Even then the Worker validates the app package, increasing versionCode, permanent release signing certificate, file size and rate limit before writing to the Staging R2/D1 resources.

## Deployment

After the two Staging Cloudflare resources and the dedicated token/ID variable are configured, note that GitHub requires a `workflow_dispatch` workflow to exist on the repository's default branch before it can be manually selected in Actions. PR #296 currently targets the `integration` branch, so this Staging deployment workflow becomes available in GitHub Actions only after the same workflow file has separately reached the default `main` branch through the normal reviewed promotion process. This PR does not promote or merge anything into `main`.

1. Open GitHub Actions → **Deploy SMV ASTRO APK Release Worker — Staging**.
2. Select branch `main`.
3. Run with `confirm_staging_apk_worker_deploy = yes`.
4. Keep `enable_staging_admin_uploads = no` for the first deployment.

The workflow is manual-only, branch-restricted, checks the exact Staging resource names/ID, applies only this Worker's D1 migration, deploys only `smv-astro-apk-release-api-staging`, and verifies D1/R2 readiness and public metadata. It does not call the Production deployment workflow.

To enable Staging Admin uploads later, first configure a valid Staging Admin identity and confirm the Staging R2/D1 health and authorization path. Only then dispatch this Staging workflow again with `enable_staging_admin_uploads = yes`.

## Website routing and isolation

Only the exact v2 Staging host `smv-astro-phase1-browser-staging-v2.onrender.com` uses this Worker URL. The other Phase 1 Staging hosts keep their existing Render API fallback. Production continues to use `smv-astro-apk-release-api.astroservices.workers.dev`.

This Worker has a separate D1 migration ledger and a separate R2 bucket. It does not use Firebase Storage, Production Worker bindings, Production R2, Production D1, Razorpay, or Render Production. No APK is copied automatically from Production.
