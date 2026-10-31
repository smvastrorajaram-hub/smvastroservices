# SMV ASTRO Cloudflare APK Release Store

This isolated Worker is the APK release API for the SMV ASTRO production package **in.smvastroservices.smvastro**. Cloudflare D1 is the release metadata and version-history source of truth; Cloudflare R2 stores immutable APK binaries.

## Safety and source-of-truth rules

- The Worker fails closed when the upload flag is absent. The checked-in deployment config currently sets `ALLOW_APK_UPLOADS = "true"` by explicit repository-owner approval. Uploads still require a verified Firebase Admin identity on the allowlist and a valid permanently signed production APK.
- The Worker has no Firebase Admin service-account key and does not change existing Firebase, Razorpay, Render, Horoscope, Calendar, or Android signing configuration.
- Public metadata, Admin current-release information, Admin history, version checks and missing-version lookups read D1 only. The Worker does not call Render or fetch live release metadata from Firebase.
- An empty D1 release table is a normal first-deployment state: `GET /public/android-app` returns HTTP 200 with `{"success":true,"available":false}`; an unknown `GET /download/:versionCode` returns HTTP 404. Neither path contacts Render or produces a dependency-related HTTP 503.
- The first successful Admin upload writes the signed APK to R2 and its release pointer to D1. The first new release must have a versionCode above 1000 (for example, v1.1 / 1001); later uploads must strictly exceed the current D1 version. No existing Firebase object is downloaded, deleted or bulk-migrated by this Worker.
- Existing Firebase APKs and their links are left untouched. A Firebase historical record is served only if it has been explicitly recorded in D1; new Cloudflare releases are always streamed directly from R2.
- Staging and local CI do not publish real APKs or upload anything to Cloudflare.
- Before the first Admin upload, verify `/health` reports `ready=true`, `d1Ready=true`, `r2Ready=true` and `uploadsEnabled=true`. The health check uses a read-only R2 `HEAD` against a reserved non-written key; it does not create or delete bucket objects.

## Cloudflare resources

1. Use only the existing R2 bucket **smv-astro-apk-releases**.
2. Use only the existing D1 database **smv-astro-apk-releases**, ID `5105ebb3-435c-47b7-9983-2e171fa911cd`. Do not create another D1 database and do not substitute another database ID. If the live database name or ID differs, the deployment workflow stops before applying the migration.
3. The checked-in `cloudflare/android-apk-release/wrangler.toml` already contains this exact D1 name/ID and R2 bucket binding. The deployment workflow verifies both the configured values and the live D1 identity before applying the migration.
4. Keep the D1 binding name `DB`, the R2 binding name `APK_RELEASES`, and the owner-approved `ALLOW_APK_UPLOADS = "true"` setting. The upload route remains Admin-authenticated and validates package name, increasing versionCode, permanent signing certificate, file size and per-Admin rate limit.
5. The deployment workflow uses the default D1 migration ledger in this dedicated APK Release database. It applies only the SQL files in `cloudflare/android-apk-release/migrations`.
6. For GitHub Actions, use a dedicated Cloudflare API token stored as the repository secret `CLOUDFLARE_APK_RELEASE_API_TOKEN`. Leave the existing `CLOUDFLARE_API_TOKEN` secret unchanged. The workflow also reads the already configured `CLOUDFLARE_ACCOUNT_ID` repository variable.
7. The dedicated token needs D1 Read (to inspect the database identity and migration state), D1 Edit (to apply migrations), and Workers product-level Admin for the first creation/deployment of this Worker. After the Worker exists, a narrower token with D1 Read, D1 Edit and Editor access scoped to this Worker is sufficient for later migration checks and deployments.
8. Only run the manual GitHub Actions workflow from `main`, after explicitly selecting `yes`. It reports the exact `workers.dev` URL after deployment.
9. The Admin Dashboard uses the separate `window.SMV_APK_RELEASE_ADMIN_API_URL` setting, currently pointed at `https://smv-astro-apk-release-api.astroservices.workers.dev`, so signed APKs can be published to R2/D1. Keep the public installer setting `window.SMV_APK_RELEASE_API_URL` blank until a first R2 APK has been uploaded and its metadata and byte-for-byte download have been verified. Then point the public installer to the same Worker origin and deploy the public download switch.

## Admin upload activation

The owner has explicitly approved `ALLOW_APK_UPLOADS = "true"` in the dedicated APK Release Worker config. Once the Worker passes D1/R2 readiness checks and the Admin-only API setting is deployed with the website, the Admin APK manager can publish signed releases directly to R2 and save version metadata/history in D1. The public install/download card remains on its existing source until the R2 APK has been verified.

Before connecting the homepage to the Worker, complete these checks:
- GET `/health` returns `ready=true` and `uploadsEnabled=true`;
- GET `/public/android-app` returns `success=true`, `available=true`, the production package and the exact Worker-origin download URL;
- the Admin page shows the same current release and history;
- a signed production APK passes package, increasing version, v2 signer and size checks; and
- GET `/download/:versionCode` returns the same APK bytes and SHA-256 as the uploaded artifact.

After successful validation, Admin uploads are stored at immutable versioned R2 keys. D1 only moves the latest release pointer forward. A failed metadata write triggers best-effort cleanup of the not-published R2 object. Old release records and R2 objects are retained.

## Deployment health and diagnostics

- The manual deployment workflow retries the Worker health URL up to 10 times with a 3-second interval so a short Cloudflare edge-propagation delay does not fail an otherwise successful deployment.
- Health is considered ready only when the dedicated D1 tables can be queried and the R2 binding answers a read-only `HEAD` probe. The response exposes `d1Ready` and `r2Ready` separately; the probe does not write or delete R2 objects.
- The post-deployment public metadata check treats an empty D1 release table as a valid, healthy first-deployment state. It still validates package, version and same-Worker download origin whenever a release is available.
- Worker runtime errors are written to Cloudflare Worker logs as structured records containing request ID, route, stage and sanitized error/cause details. URLs, bearer values, tokens and long credential-like strings are redacted. The public JSON response never includes raw exception messages or credentials.

## API

- GET `/health` — reports D1 schema readiness, a read-only live R2 binding probe, upload-gate state and whether D1 currently has a release record.
- GET `/public/android-app` — returns the latest D1 release metadata; returns HTTP 200 with `available=false` until the first D1 release is published.
- GET `/download/:versionCode` — streams an R2 APK. Explicitly recorded Firebase archive rows remain supported as historical compatibility; missing versions return HTTP 404 without external network calls.
- GET `/admin/android-app` — verified Firebase ID token and Admin allowlist required; reads D1 only.
- GET `/admin/android-app/versions` — verified Admin release history from D1 only.
- POST `/admin/android-app/upload` — verified Admin, exact APK content type, up to 100 MiB, APK package/version/permanent signing validation, strictly increasing versionCode, and per-UID rate limiting; stores the binary in R2 and release metadata in D1.

CI validates the bundle with a non-deploying Wrangler dry-run and runs source tests. It does not apply remote migrations, upload APKs, or deploy to Cloudflare. Do not add secrets or APK binaries to this repository.
