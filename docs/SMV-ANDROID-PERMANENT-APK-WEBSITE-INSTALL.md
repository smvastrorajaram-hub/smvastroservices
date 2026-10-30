# SMV ASTRO permanent Android APK — GitHub Releases upload and update detection

The permanent SMV ASTRO Android APK is managed from the authenticated Admin Dashboard → Android App Release Management section. The APK is published as an asset of a versioned GitHub Release in the public smvastrorajaram-hub/smvastroservices repository. Firebase Storage, Firestore APK-release metadata, Cloudinary accounts and unsigned media presets are not used by this APK publishing flow.

## Hosting and version format

- Release repository: https://github.com/smvastrorajaram-hub/smvastroservices
- Release tag for version v1.1: smv-astro-v1.1
- Release asset for version v1.1: SMV-ASTRO-v1.1.apk
- The public download URL is the canonical GitHub Release asset URL. The website accepts only the exact repository, tag and APK filename pattern.
- Each version has its own release tag and asset. The Admin uploader never overwrites an existing release or APK.
- Uploads are created as GitHub Draft Releases. The backend uploads and verifies the asset, then publishes the Release. An incomplete upload is not made public; failed draft/tag cleanup is attempted.

GitHub Releases hosting is used without Firebase Blaze, Firebase Storage, Firestore release records, Cloudinary or a separate object-storage subscription. Public users download the APK without a GitHub account.

## One-time production backend configuration

Create a GitHub fine-grained personal access token for the repository owner smvastrorajaram-hub:

1. Set repository access to Only select repositories, and select only smvastrorajaram-hub/smvastroservices.
2. Grant Contents: Read and write. Do not grant Administration, Actions, Issues, Pull requests, Packages or other permissions.
3. Set an expiry date and maintain the token securely. Rotate it through the GitHub and Render consoles when it expires.

Add the token as the secret environment variable SMV_GITHUB_RELEASE_TOKEN on the production Render backend service only. Do not place it in source code, GitHub files, Android APKs, browser JavaScript, HTML, or client-visible API responses. Never paste the token into ChatGPT.

The staging backend is deliberately read-only for APK publishing because GitHub Releases in this public repository are publicly visible. Staging can read the production release version, but the upload API refuses to publish from staging even if a token is accidentally configured there.

No production Render variable is changed by this Draft PR. The token must be configured manually by the repository owner before the production Admin upload function becomes available. Until then, the public release lookup remains read-only and the Admin page displays the configuration requirement.

## Admin upload

1. Build the production permanent signed Release APK using the existing Android Release workflow. Keep the existing permanent signing key.
2. Sign in to the production SMV ASTRO website using the configured Admin account and open Admin Dashboard → Android App Release Management.
3. Select the signed production .apk and choose UPLOAD NEW APP VERSION.
4. The backend validates the APK binary and checks package in.smvastroservices.smvastro, the vMAJOR.MINOR / versionCode = major * 1000 + minor sequence, the SHA-256 checksum and the permanent Release signing certificate.
5. The backend checks all published SMV ASTRO app releases and refuses any versionCode that is not strictly greater than the latest published app release.
6. The backend creates the matching draft GitHub Release (smv-astro-vMAJOR.MINOR), uploads SMV-ASTRO-vMAJOR.MINOR.apk, verifies the returned asset name, size and canonical download URL, then publishes the release.
7. The website's public /public/android-app endpoint reads the latest valid production APK release. No Firebase Storage bucket or Firestore APK-release document is involved.

The existing permanent v1.0 APK from PR #245 is already distributed. It is retained as the version floor; the first website-managed update must be v1.1 or newer (versionCode 1001 or higher). Do not upload v1.0 as an update.

The backend accepts an APK between 1 KB and 100 MB. GitHub's API upload is performed server-side. The API token is never sent to the browser. If release creation or asset upload fails, the backend attempts to delete the incomplete draft Release and its tag so the version can be retried.

## Website behavior

- A new Android visitor sees DOWNLOAD APP once an Admin has published a valid APK Release.
- A visitor with an older installed SMV ASTRO production app sees UPDATE APP when the browser can verify the installed app and read its version. The newer APK uses the same package ID and permanent signing certificate, so Android can update the existing installation without uninstalling it.
- When the installed version is current or newer, the Android APK card and PWA install card are hidden on that device.
- The dedicated PWA INSTALL APP flow remains on non-Android browsers.
- The native Android WebView hides the PWA card, public APK card and Admin APK manager inside the installed app.
- iPhone/iPad and desktop users do not get an Android APK download button.
- The browser validates that a download URL is HTTPS and points exactly to github.com/smvastrorajaram-hub/smvastroservices/releases/download/smv-astro-vX.Y/SMV-ASTRO-vX.Y.apk. Other hosts and paths are rejected.

## Installed-app detection requirements

The website uses navigator.getInstalledRelatedApps() with Android package ID in.smvastroservices.smvastro. The web manifest declares the related Android app, while /.well-known/assetlinks.json and Android asset_statements establish the reciprocal Digital Asset Links relationship. The published assetlinks fingerprint is taken from the existing permanent Release APK.

Browser support is limited: Chrome on Android supports the installed-app check when the website/app relationship is correctly verified. Other browsers may not expose installed-app information; in those browsers the site cannot reliably distinguish an already-installed native package, so it falls back to DOWNLOAD APP rather than guessing. The originally distributed v1.0 APK contains the asset_statements resource but did not declare it in AndroidManifest.xml. The first v1.1 update adds that metadata; installed-app detection is therefore guaranteed only after the updated app has been installed once.

## Version and signing safety

The Android build uses the established Gradle rule versionCode = major * 1000 + minor. Every subsequent build must use the same application ID, permanent Release keystore and a strictly increasing versionCode. Never upload a Debug/Test APK, never rotate the permanent key, and do not uninstall the existing app to apply an update.

The Android upload endpoint validates the package, version sequence and signing certificate. Source tests do not prove a physical over-the-install update: test installation of v1.0 followed by v1.1 on an Android handset before announcing an update to all users.

This Draft PR does not merge, publish an APK, change Render environment variables, change PR #245 signing workflows, or deploy production services. Production publishing becomes available only after SMV_GITHUB_RELEASE_TOKEN is added securely to the production backend environment.
