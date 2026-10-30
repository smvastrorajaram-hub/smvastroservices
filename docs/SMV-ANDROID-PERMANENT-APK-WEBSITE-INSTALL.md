# SMV ASTRO permanent Android APK — Admin upload and automatic update detection

The permanent Android APK is managed from the authenticated Admin Dashboard → Android App Release Management section. There is no public APK upload link and no GitHub Release upload step.

## Admin upload

1. Build the SMV ASTRO Production permanent signed Release APK from the existing Android Release workflow.
2. Sign in to the SMV ASTRO website using the configured Admin account and open the Admin Dashboard.
3. Select the production APK file under Permanent Android APK and choose UPLOAD NEW APP VERSION.
4. The backend verifies the APK package (in.smvastroservices.smvastro), the ordered vMAJOR.MINOR version and calculated Android versionCode, and the permanent Release signing certificate before upload.
5. Only a strictly higher versionCode can replace the public current-version pointer. Each APK is stored at a versioned immutable Firebase Storage path; the previous APK file is retained.

The existing permanent v1.0 APK from PR #245 is already distributed. Therefore the first APK uploaded through this website manager must be v1.1 or newer (versionCode 1001 or higher). When manually running the existing Release workflow, set its version_name input to v1.1 for the first update. Do not upload the existing v1.0 artifact as an update.

The Admin upload API requires a verified Firebase ID token and server-side Admin authorization before it reads the binary APK body. The APK is not accepted through a public Cloudinary unsigned upload preset. The service account writes to Firebase Storage using the configured production/staging bucket; no Firebase Storage admin credential is sent to the browser.

## Website behavior

- A new Android visitor sees one DOWNLOAD APP action once the Admin has published the first APK.
- A visitor with an older installed SMV ASTRO production app sees UPDATE APP when the browser can verify the installed app and read its version. The newer signed APK can update the existing installation without uninstalling it.
- When the installed version is current or newer, both the Android APK card and the website PWA install card are hidden on that device.
- The dedicated PWA INSTALL APP flow remains on non-Android browsers. The native Android WebView hides the PWA card, public APK card, and Admin APK manager inside the installed app.
- iPhone/iPad and desktop users do not get an Android APK download button.

## Installed-app detection requirements

The website uses navigator.getInstalledRelatedApps() with the Android package ID in.smvastroservices.smvastro. The web manifest declares the related Android app, while /.well-known/assetlinks.json and the Android asset_statements establish the reciprocal Digital Asset Links relationship. The published assetlinks fingerprint is taken from the existing signed permanent Release APK.

Browser support is limited: Chrome on Android 80+ supports the Android-app check when the website/app relationship is correctly verified. Other browsers may not expose installed-app information; in those browsers the site cannot reliably distinguish an already-installed native package, so it falls back to DOWNLOAD APP rather than guessing. The originally distributed v1.0 APK contains the asset_statements resource but did not declare it in AndroidManifest.xml. The first v1.1 update adds that metadata; installed-app detection is therefore guaranteed only after the updated app has been installed once. On devices where the browser cannot verify the older installation, DOWNLOAD APP still points to the newer same-package signed APK, and Android's package installer can apply it over the old app without uninstalling it.

Reference: https://developer.chrome.com/docs/capabilities/get-installed-related-apps/

## Version and signing safety

The Android build uses the established Gradle rule versionCode = major * 1000 + minor. Every subsequent build must use the same application ID, permanent Release keystore, and a strictly increasing versionCode. Never upload a Debug/Test APK, never rotate the permanent key, and do not uninstall the existing app to apply an update.

The Android upload endpoint validates the package, version sequence and signing certificate before publishing. Source tests do not prove a physical over-the-install update: test installation of v1.0 followed by v1.1 on an Android handset before announcing an update to all users.

This Draft PR does not merge, publish an APK, or deploy production services. Once merged and deployed, the Admin Dashboard upload action publishes metadata to the production endpoint and the website reads the current release automatically.
