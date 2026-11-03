# SMV ASTRO, SMV HOROSCOPE and SMV CALENDAR Cloudflare APK Release Store

This isolated Worker is the APK release API for three independent production packages: SMV ASTRO (`in.smvastroservices.smvastro`), SMV HOROSCOPE (`in.smvastroservices.horoscope`) and SMV CALENDAR (`in.smvastroservices.calendar`). Cloudflare D1 is the app-scoped release metadata and version-history source of truth; Cloudflare R2 stores immutable APK binaries.

## Safety and source-of-truth rules

- The Worker fails closed when the upload flag is absent. The checked-in deployment config currently sets `ALLOW_APK_UPLOADS = "true"` by explicit repository-owner approval. Uploads still require a verified Firebase Admin identity on the allowlist and a valid permanently signed production APK.
- The Worker has no Firebase Admin service-account key and does not change existing Firebase, Razorpay, Render or website calculation services. The three signed packages use separate Android application IDs and independent version sequences, with the existing permanent Android release signer.
- Public metadata, Admin current-release information, Admin history, version checks and missing-version lookups read D1 only. The Worker does not call Render or fetch live release metadata from Firebase.
- An empty app release history is a normal first-deployment state: the matching `GET /public/android-apps/:appId` returns HTTP 200 with `{"success":true,"available":false}`; an unknown app/version download returns HTTP 404. Neither path contacts Render or produces a dependency-related HTTP 503.
- The first successful Admin upload writes the signed APK to R2 and its release pointer to D1. ASTRO continues above its historical 1000 baseline (v1.1 / 1001); HOROSCOPE and CALENDAR start independently at v1.0 / versionCode 1000. Later uploads must strictly exceed the current version for that same app only. No existing Firebase object is downloaded, deleted or bulk-migrated by this Worker.
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
9. The Admin Dashboard uses the separate `window.SMV_APK_RELEASE_ADMIN_API_URL` setting, currently pointed at `https://smv-astro-apk-release-api.astroservices.workers.dev`, so signed APKs for all three apps can be published to R2/D1. The Horoscope and Calendar custom domains are approved CORS origins for their public metadata cards. Keep the public installer setting `window.SMV_APK_RELEASE_API_URL` blank until a first R2 APK has been uploaded and its metadata and byte-for-byte download have been verified. Then point the public installer to the same Worker origin and deploy the public download switch.

## Admin upload activation

The owner has explicitly approved `ALLOW_APK_UPLOADS = "true"` in the dedicated APK Release Worker config. Once the Worker passes D1/R2 readiness checks and the Admin-only API setting is deployed with the website, the Admin APK manager can publish signed releases directly to R2 and save version metadata/history in D1. The public install/download card remains on its existing source until the R2 APK has been verified.

Before connecting the homepage to the Worker, complete these checks:
- GET `/health` returns `ready=true` and `uploadsEnabled=true`;
- GET `/public/android-app` for ASTRO and `/public/android-apps/horoscope`, `/public/android-apps/calendar` return the correct app package and exact Worker-origin download URL;
- the Admin page shows the same current release and history;
- a signed production APK passes package, increasing version, v2 signer and size checks; and
- the app-specific download URLs return the same APK bytes and SHA-256 as each uploaded artifact.

After successful validation, Admin uploads are stored at immutable versioned R2 keys. D1 only moves the latest release pointer forward. A failed metadata write triggers best-effort cleanup of the not-published R2 object. Old release records and R2 objects are retained.

## Deployment health and diagnostics

- The manual deployment workflow retries the Worker health URL up to 10 times with a 3-second interval so a short Cloudflare edge-propagation delay does not fail an otherwise successful deployment.
- Health is considered ready only when the dedicated D1 tables can be queried and the R2 binding answers a read-only `HEAD` probe. The response exposes `d1Ready` and `r2Ready` separately; the probe does not write or delete R2 objects.
- The post-deployment public metadata check treats an empty D1 release table as a valid, healthy first-deployment state. It still validates package, version and same-Worker download origin whenever a release is available.
- Worker runtime errors are written to Cloudflare Worker logs as structured records containing request ID, route, stage and sanitized error/cause details. URLs, bearer values, tokens and long credential-like strings are redacted. The public JSON response never includes raw exception messages or credentials.

## API

- GET `/health` — reports D1 schema readiness, a read-only live R2 binding probe, upload-gate state and whether D1 currently has a release record.
- GET `/public/android-app` and `/public/android-apps/:appId` — return the current metadata for ASTRO and each app key (`astro`, `horoscope`, `calendar`); app-specific histories are independent.
- GET `/download/:versionCode` and `/download/:appId/:versionCode` — stream the matching app APK from R2. Explicit ASTRO Firebase archive rows remain supported as historical compatibility; missing versions return HTTP 404 without external network calls.
- GET `/admin/android-app` and `/admin/android-apps/:appId` — verified Firebase ID token and Admin allowlist required; read current release metadata from D1.
- GET `/admin/android-app/versions` and `/admin/android-apps/:appId/versions` — verified Admin version history for the selected app only.
- POST `/admin/android-app/upload` and `/admin/android-apps/:appId/upload` — verified Admin, exact APK content type, up to 100 MiB, allowlisted package validation, permanent signer validation, per-app monotonic versionCode and per-UID rate limiting.
- DELETE `/admin/android-app/versions/:versionCode` and `/admin/android-apps/:appId/versions/:versionCode` — verified Admin; removes an older R2 object and its D1 row only; current release of that app is protected. Firebase legacy rows are not deletable through this Worker.

CI validates the bundle with a non-deploying Wrangler dry-run and runs source tests. It does not apply remote migrations, upload APKs, or deploy to Cloudflare. Do not add secrets or APK binaries to this repository.


## Historical APK deletion

- Admin-only `DELETE /admin/android-app/versions/:versionCode` and `/admin/android-apps/:appId/versions/:versionCode` require `ALLOW_APK_DELETES=true`.
- Only older APK files stored in the dedicated R2 bucket can be deleted from each manager. The highest/current version for the selected app is always protected.
- Legacy Firebase archive records are shown as protected because this Worker intentionally has no Firebase Storage delete authority.
