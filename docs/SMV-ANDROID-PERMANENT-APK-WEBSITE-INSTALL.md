# SMV ASTRO permanent Android APK — Cloudinary upload and update detection

The permanent SMV ASTRO Android APK is managed from the authenticated Admin Dashboard → Android App Release Management section. APK upload remains server-side and is never performed through the existing public unsigned media upload preset.

## Cloudinary product environment already referenced by this repository

- Cloud name: \`l6r6c8zi\`
- Existing general media upload preset: \`smv_astro_media\` (used by the existing Blog / Media upload feature; do not repurpose it for APK publishing).
- The Cloudinary product-environment display name is not stored in the repository source, so it must be read from the Cloudinary Console's Product Environments page. Do not infer it from the cloud name.

## Important Cloudinary APK restriction — approval required

Cloudinary blocks the \`.apk\` extension by default as a potentially harmful executable file type. There is no normal Console switch or upload-preset setting that overrides this restriction. Cloudinary's documentation says customers on paid accounts should contact Cloudinary Support to request an exception for a blocked file type. A Free account must not assume this exception is available.

Before enabling this feature, contact Cloudinary Support and request explicit permission to upload and deliver SMV ASTRO's signed Android APK (\`.apk\`) as a raw file in cloud name \`l6r6c8zi\`. Do not rename the APK to another extension or use an unsigned preset to bypass Cloudinary's file-type controls. If Cloudinary does not approve APK hosting for this account, keep this integration disabled and choose another APK distribution host.

The code is fail-closed by default. It will not try to upload APKs until the account has been approved and the backend flag is deliberately enabled.

## Cloudinary options and Render backend environment

For the approved APK asset:
- Resource type: \`raw\`
- Delivery type: \`upload\` (public download URL, after the signed Admin-only backend upload)
- Upload method: authenticated / signed server-side SDK request; no unsigned upload preset is used for APKs.
- Asset folder / public ID scope: \`smv-astro/android/releases/production/\`; staging assets use \`smv-astro/android/releases/staging/\`.
- Keep overwrite disabled. Each Android version gets a separate immutable public ID containing versionName and versionCode.

After Cloudinary Support explicitly confirms that APK files are allowed, configure these environment variables only on the intended Render backend service:

- \`CLOUDINARY_CLOUD_NAME=l6r6c8zi\`
- \`CLOUDINARY_API_KEY\` = the API key shown in Cloudinary Console → Settings → API Keys
- \`CLOUDINARY_API_SECRET\` = the matching API secret (secret; never put it in GitHub, browser code, or chat)
- \`CLOUDINARY_APK_UPLOAD_ENABLED=true\` = set only after the Support approval is confirmed

Until approval is granted, leave \`CLOUDINARY_APK_UPLOAD_ENABLED\` unset or \`false\`. Never expose the API secret to the browser. The existing \`smv_astro_media\` preset remains unchanged for its current media use.

## Admin upload and release lookup

1. Build the SMV ASTRO Production permanent signed Release APK from the existing Android Release workflow.
2. Sign in to the SMV ASTRO website using the configured Admin account and open the Admin Dashboard.
3. Select the signed production APK file under Permanent Android APK and choose UPLOAD NEW APP VERSION.
4. The backend validates the APK package (\`in.smvastroservices.smvastro\`), the ordered \`vMAJOR.MINOR\` version / calculated Android versionCode, and the permanent Release signing certificate before contacting Cloudinary.
5. The backend performs an authenticated Cloudinary \`raw/upload\` request and stores a versioned asset. Cloudinary's Admin API asset listing is used to find the latest version; no Firestore APK-release document or Firebase Storage bucket is required.

The existing permanent v1.0 APK from PR #245 is already distributed. Therefore the first website-managed update must be v1.1 or newer (versionCode 1001 or higher). Never upload v1.0 as an update.

The public endpoint returns only the latest validated release details. The website accepts download links only from the configured Cloudinary cloud name, the expected raw/upload path and the environment-specific SMV ASTRO APK folder.

## Website behavior

- A new Android visitor sees one DOWNLOAD APP action once the Admin has published the first APK.
- A visitor with an older installed SMV ASTRO production app sees UPDATE APP when the browser can verify the installed app and read its version. The newer same-package APK signed with the same permanent key can update the existing installation without uninstalling it.
- When the installed version is current or newer, both the Android APK card and the website PWA install card are hidden on that device.
- The dedicated PWA INSTALL APP flow remains on non-Android browsers. The native Android WebView hides the PWA card, public APK card and Admin APK manager inside the installed app.
- iPhone/iPad and desktop users do not get an Android APK download button.

## Installed-app detection requirements

The website uses \`navigator.getInstalledRelatedApps()\` with Android package ID \`in.smvastroservices.smvastro\`. The web manifest declares the related Android app, while \`/.well-known/assetlinks.json\` and Android \`asset_statements\` establish the reciprocal Digital Asset Links relationship. The published assetlinks fingerprint is taken from the existing permanent Release APK.

Browser support is limited: Chrome on Android supports the installed-app check when the website/app relationship is correctly verified. Other browsers may not expose installed-app information; in those browsers the site cannot reliably distinguish an already-installed native package, so it falls back to DOWNLOAD APP rather than guessing. The originally distributed v1.0 APK contains the asset_statements resource but did not declare it in AndroidManifest.xml. The first v1.1 update adds that metadata; installed-app detection is therefore guaranteed only after the updated app has been installed once.

## Version and signing safety

The Android build uses the established Gradle rule \`versionCode = major * 1000 + minor\`. Every subsequent build must use the same application ID, permanent Release keystore and a strictly increasing versionCode. Never upload a Debug/Test APK, never rotate the permanent key, and do not uninstall the existing app to apply an update.

The Android upload endpoint validates the package, version sequence and signing certificate. Source tests do not prove a physical over-the-install update: test installation of v1.0 followed by v1.1 on an Android handset before announcing an update to all users.

This Draft PR does not merge, publish an APK, change Render environment variables, contact Cloudinary Support, or deploy production services. Cloudinary publishing remains disabled until Cloudinary grants the required APK file-type exception and the backend configuration is supplied.
