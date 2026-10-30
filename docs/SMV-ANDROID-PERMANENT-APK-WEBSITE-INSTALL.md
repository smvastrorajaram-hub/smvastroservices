# SMV ASTRO permanent Android APK — website install and upload

The public website now has **two separate installation options**:

- **INSTALL SMV ASTRO APP** is the existing website PWA install flow. Its manifest, icons, prompt, and service worker are not replaced by the Android APK option.
- **INSTALL SMV ASTRO ANDROID APP** resolves the latest published permanent Android APK from this repository's GitHub Releases page.

The Android APK card checks the public GitHub Releases API for the latest published release. It enables **DOWNLOAD AND INSTALL APK** only when that release contains this exact asset name:

`SMV-ASTRO-PERMANENT-RELEASE.apk`

The page does not contain a GitHub token, signing secret, or APK upload credential. **ADMIN: UPLOAD / UPDATE APK** opens GitHub's Releases upload page; GitHub itself enforces repository write permissions.

## Publish the first APK

1. Open the successful **Build SMV ASTRO Production Android APK** Actions run that produced the permanent Release artifact (PR #245's signed build is run **41016568571**).
2. Download the Actions artifact named `SMV-ASTRO-PERMANENT-RELEASE-APK` and extract the signed `.apk` file. Do not use any Debug/Test APK from the separate Test APK workflow.
3. Rename the extracted signed APK to exactly `SMV-ASTRO-PERMANENT-RELEASE.apk`.
4. Open [Create a GitHub Release](https://github.com/smvastrorajaram-hub/smvastroservices/releases/new). Use a tag matching the APK's embedded app version (for example, `v1.0` if the APK was built as v1.0). Add a release title and upload the renamed APK asset.
5. Publish the release. A draft or prerelease is deliberately not offered to website visitors.
6. Open the SMV ASTRO website on Android and verify that **DOWNLOAD AND INSTALL APK** appears with the published version.

## Upload each future Android update

1. Run **Actions → Build SMV ASTRO Production Android APK → Run workflow** on the intended source branch, with **Generate the one-time Release keystore** set to `false`, **Build the permanent signed Release APK** enabled, and the next ordered version (for example, `v1.1` after `v1.0`).
2. Download the new `SMV-ASTRO-PERMANENT-RELEASE-APK` artifact after the workflow succeeds. Extract the signed APK and rename it to the exact asset filename above.
3. Create a **new** GitHub Release using the same version tag as the APK's embedded version, upload the renamed APK, and publish it. Use a new increasing version for every update; do not replace the existing permanent signing key.
4. The website automatically resolves the latest published release. No website source change, PWA manifest change, or public backend deployment is required for each APK update.

## Android installation notes

- Open the website in Chrome on the Android phone, download the APK, open the downloaded file, and confirm **Install** in Android's package installer.
- Android may ask the user to allow that browser to **Install unknown apps**. Grant it only to the browser used for this download, then return to the installer.
- To update an already-installed permanent app without uninstalling it, the new APK must use the same `in.smvastroservices.smvastro` package, the same permanent PKCS12 signing key, and a higher Android `versionCode`.
- The website's PWA install remains independent and available through its existing **INSTALL APP** button.

## WebRTC prerequisites and verification boundary

- The native Android WebView requests Android's runtime microphone permission only for audio-capture requests from `https://smvastroservices.in` or `https://www.smvastroservices.in`. Video capture and other origins are denied.
- Browser-side Live Call still uses `getUserMedia()`, `RTCPeerConnection`, the existing authenticated `/live/sessions/:id/signal` routes, and the Customer-offer / Astrologer-answer role restrictions.
- The backend's `/live/ice-config` route returns STUN by default. It adds short-lived TURN credentials only when Render has both `LIVE_TURN_URLS` (or `LIVE_TURN_URL`) and `LIVE_TURN_SHARED_SECRET` configured. STUN-only calls can fail on restrictive carrier/NAT networks; a real TURN endpoint and secret must be provisioned and verified separately.
- Source tests and Android compilation do not prove a physical handset call works. Before production use, test two different Android phones/accounts (Customer and Astrologer), approve microphone permission on both, complete a call in Wi-Fi and mobile data, verify two-way audio, and test call ending/retry. Also verify a signed APK update installs over the previous version without uninstalling it.

This Draft PR does not publish a GitHub Release, upload an APK, merge code, or deploy the website/production service.
