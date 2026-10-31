# SMV ASTRO Cloudflare APK Release Store

This isolated Worker is the APK release API for the SMV ASTRO production package **in.smvastroservices.smvastro**. It uses R2 for immutable APK binaries and D1 for the release pointer/history and upload throttling.

## Safety defaults

- APK publishing is deliberately disabled by default (ALLOW_APK_UPLOADS = "false").
- The Worker has no Firebase Admin service-account key and does not change existing Firebase, Razorpay, Render, Horoscope, Calendar, or Android signing configuration.
- On the first successful Cloudflare APK upload, D1 records the currently published Firebase release as a history baseline in the same atomic D1 batch as the new R2 release. A rejected/failed upload does not create the baseline. This records metadata only; it does not download, delete, or bulk-migrate historical APK objects. Previous Firebase APKs remain available through their existing links; nothing is deleted.
- Staging and local CI do not publish real APKs or upload anything to Cloudflare.
- Do not set ALLOW_APK_UPLOADS = "true" until R2/D1 bindings, Admin authorization, release lookup, download and version monotonicity have been verified in an isolated staging deployment.

## Cloudflare resources

1. Use only the existing R2 bucket **smv-astro-apk-releases**.
2. Use only the existing D1 database **smv-astro-apk-releases**, ID `5105ebb3-435c-47b7-9983-2e171fa911cd`. Do not create another D1 database and do not substitute another database ID. If the live database name or ID differs, the deployment workflow stops before applying the migration.
3. The checked-in `cloudflare/android-apk-release/wrangler.toml` already contains this exact D1 name/ID and R2 bucket binding. The deployment workflow verifies both the configured values and the live D1 identity before applying any migration.
4. Keep the D1 binding name `DB`, the R2 binding name `APK_RELEASES`, and `ALLOW_APK_UPLOADS = "false"`.
5. The deployment workflow uses the default D1 migration ledger in this dedicated APK Release database. It applies only the SQL files in `cloudflare/android-apk-release/migrations`.
6. For GitHub Actions, use a dedicated Cloudflare API token stored as the repository secret `CLOUDFLARE_APK_RELEASE_API_TOKEN`. Leave the existing `CLOUDFLARE_API_TOKEN` secret unchanged. The workflow also reads the already configured `CLOUDFLARE_ACCOUNT_ID` repository variable.
7. The dedicated token needs D1 Edit and Workers product-level Admin for the first creation/deployment of this Worker. After the Worker exists, a narrower token with D1 Edit and Editor access scoped to this Worker is sufficient for later deployments. Deploying a Worker with D1/R2 bindings does not require separate D1/R2 resource permissions; D1 Edit is required here because this workflow also runs migrations.
8. Only run the manual GitHub Actions workflow from `main`, after explicitly selecting `yes`. It reports the exact `workers.dev` URL after deployment.
9. Only after the Worker is deployed and `/health` confirms D1/R2 readiness, set `window.SMV_APK_RELEASE_API_URL` in `public/index.html` to that exact Worker origin, then deploy the website. It remains blank until the real URL is known.

## Admin upload activation

Initially leave ALLOW_APK_UPLOADS = "false". In that state the existing Render/Firebase upload endpoint remains available only while D1 has no release records. Once the Worker is ready, Homepage and Admin read-only release metadata come from Cloudflare regardless of the upload gate, so an existing R2 version is never replaced by a stale Firebase pointer. If Cloudflare already has release records and uploads are disabled, new publishing is blocked instead of silently writing a newer release to the legacy store.

Enable ALLOW_APK_UPLOADS = "true" only after:
- GET /health returns ready=true;
- the production Admin can read release metadata via GET /admin/android-app;
- the existing Firebase-published version appears as the baseline if one exists;
- a signed production APK passes package, version sequence, v2 signer and size checks in a controlled staging/test project;
- an R2 download returns the same APK bytes and SHA-256 as the uploaded artifact; and
- the homepage chooses the matching release version and the old installed app is shown an update action.

After successful validation, Admin uploads are stored at immutable versioned R2 keys. D1 only moves the latest release pointer forward. A failed metadata write triggers a best-effort cleanup of the not-published R2 object. Old release records and objects are retained.

## API

- GET /health — reports D1/R2 binding readiness and the explicit upload flag.
- GET /public/android-app — public latest-release metadata.
- GET /download/:versionCode — streams an R2 APK or redirects to a validated legacy Firebase Storage URL for a previously published release.
- GET /admin/android-app — verified Firebase ID token and Admin allowlist required.
- GET /admin/android-app/versions — verified Admin release history.
- POST /admin/android-app/upload — verified Admin, exact APK content type, up to 100 MiB, APK package/version/permanent signing validation, strictly increasing versionCode, and per-UID rate limiting.

CI only validates the bundle with a non-deploying Wrangler dry-run. It does not apply remote migrations, upload APKs, or deploy to Cloudflare. Do not add secrets or APK binaries to this repository.
