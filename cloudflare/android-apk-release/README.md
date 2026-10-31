# SMV ASTRO Cloudflare APK Release Store

This isolated Worker is the APK release API for the SMV ASTRO production package **in.smvastroservices.smvastro**. It uses R2 for immutable APK binaries and D1 for the release pointer/history and upload throttling.

## Safety defaults

- APK publishing is deliberately disabled by default (ALLOW_APK_UPLOADS = "false").
- The Worker has no Firebase Admin service-account key and does not change existing Firebase, Razorpay, Render, Horoscope, Calendar, or Android signing configuration.
- The initial D1 baseline import copies only the currently published Firebase release metadata. It does not download, delete, or bulk-migrate historical APK objects. Previous Firebase APKs remain available through their existing links; nothing is deleted.
- Staging and local CI do not publish real APKs or upload anything to Cloudflare.
- Do not set ALLOW_APK_UPLOADS = "true" until R2/D1 bindings, Admin authorization, release lookup, download and version monotonicity have been verified in an isolated staging deployment.

## Cloudflare resources

1. Create an R2 bucket named **smv-astro-apk-releases**.
2. Create a D1 database named **smv-astro-apk-releases**.
3. Copy wrangler.toml.example to wrangler.toml locally. Replace the all-zero placeholder for database_id with the database's real ID. Never commit account-specific IDs if your deployment policy treats them as environment-specific.
4. Keep the APK_RELEASES R2 binding and DB D1 binding names exactly as shown in the config.
5. Apply migrations/0001_android_app_releases.sql to the new D1 database. After reviewing the target ID, run Wrangler's remote migration command against the explicitly named APK release database only. Do not point it at Wallet or any other existing D1 database.
6. Add every existing production Admin UID that should be able to manage releases to SMV_ANDROID_RELEASE_ADMIN_UIDS, or configure an explicitly verified Admin custom claim / verified email. Do not rely on a mutable user profile role.
7. Configure FIREBASE_ALLOWED_PROJECT_IDS with the Firebase Auth project IDs that legitimately issue SMV ASTRO Admin ID tokens. Keep it narrow.
8. Deploy this dedicated Worker only after the previous steps and the local CI pass. A workers.dev URL has the shape https://worker-name.account-subdomain.workers.dev; use the actual URL from your Cloudflare dashboard.
9. Configure the front-end runtime value window.SMV_APK_RELEASE_API_URL to that exact Worker origin. The checked-in default is a convenience, not proof that your account owns that hostname.

## Admin upload activation

Initially leave ALLOW_APK_UPLOADS = "false". In that state the website continues using the existing Render/Firebase APK flow. The R2 release API reports uploadsEnabled=false; the new UI intentionally does not switch its source of truth to an empty or stale D1 database.

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

There is no automatic upload of the APK in CI and no automatic Cloudflare deployment in this PR. Do not add secrets or APK binaries to this repository.
