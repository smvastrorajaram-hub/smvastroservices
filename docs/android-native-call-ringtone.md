# SMV ASTRO Android app: native incoming-call ringtone and permanent Release build

The Production Android app lives in `smvastroproduction/`, has launcher name **SMV ASTRO**, and uses package `in.smvastroservices.smvastro`. The modules `smvastro/`, `smvhoroscope/`, and `smvcalendar/` remain separate Test APKs. The existing `.github/workflows/build-test-apks.yml` workflow is not changed.

## Android launcher icons: three independent assets from the lowercase icon folder
The three production APKs use the exact product-specific 512x512 PNGs already stored in the repository's lowercase root `icon/` folder:
- `icon/astro_512.png` → SMV ASTRO
- `icon/horoscope_512.png` → SMV HOROSCOPE
- `icon/calendar_512.png` → SMV CALENDAR

Each source is already 512×512 and below 300,000 bytes. The build copies each PNG byte-for-byte into product-specific Android launcher resources (`smv_astro_launcher`, `smv_horoscope_launcher`, `smv_calendar_launcher`) without resizing or recompression. The manifests refer to those unique resource names, and the scripts remove the former generic `ic_launcher` resources before building.

Changing one source image triggers only its corresponding Android build workflow. The Website, Horoscope PWA, Calendar PWA, Firebase, Razorpay, Render and Cloudflare assets are not changed by this launcher-only update.
- When the Astrologer taps the full-screen notification, Android passes the data extras (including `type`, `sessionId` or `bookingId`) to the launcher activity. `MainActivity` converts those values into the existing `smvLivePush` URL, and the signed-in Astrologer dashboard opens the matching Live request or booking.
- The full-screen `IncomingCallActivity` uses its own `in.smvastroservices.smvastro.incoming` task affinity and remains excluded from Recents. Its Open action launches the normal `MainActivity` task (the package-default affinity, `excludeFromRecents=false`) with `NEW_TASK | CLEAR_TOP | SINGLE_TOP`, then finishes the temporary ringing activity. This prevents the launcher WebView from becoming the root of a hidden, excluded task; after Home, SMV ASTRO remains available in Android Recents.
- Audible incoming and scheduled alerts use Android notification channel IDs `smv_native_incoming_call_v2` and `smv_native_background_alerts_v2`. Android persists a channel's sound choice, so the new IDs avoid inheriting the older v1 channel's silent setting. Both channels use the device ringtone and vibration; the foreground service also loops the ringtone through `MediaPlayer`.
- If the foreground service or media player cannot start, the app uses the audible v2 alert-channel fallback while preserving the original booking/session identifiers and the two-minute stop watchdog. Device notification permission, channel sound settings, ringtone volume, Do Not Disturb and manufacturer battery restrictions still apply.
- When Android brings the retained app back to the foreground, `MainActivity` asks the authenticated WebView to refresh Dashboard data, reconnect dashboard and Live-session event streams, and restore a missing Live Call/Chat panel. The app keeps its existing WebView storage and offline caches.
- A swiped-away or process-killed app can be started by Android for a delivered high-priority FCM data message. Android does not deliver FCM while the user has force-stopped the app from system App Info; the user must launch it again. Notification permission, DND/silent mode, ringtone volume, battery management, OEM background limits and network/FCM delivery remain controlled by Android and the device owner.
- Browser notifications are separate from the native Android service. A browser tab that remains open can play its in-page alert sound, but web notifications cannot reliably force the phone's selected ringtone while the browser/tab is closed; the browser's system notification behavior is therefore left unchanged.

## Firebase Android configuration

The verified Android app is registered in Firebase project `smv-astro` with package `in.smvastroservices.smvastro` and Android App ID `1:299081899217:android:09e43164cfdd015ba539f0`. The workflow checks the expected Firebase project number prefix. The app ID is public client configuration; do not put Firebase Admin credentials or private service-account keys in the Android app.

## Version numbering

The installed app displays versions in this order:

| Display version | Android versionCode |
|---|---:|
| `v1.0` | 1000 |
| `v1.1` | 1001 |
| `v1.2` | 1002 |
| `v1.10` | 1010 |
| `v2.0` | 2000 |
| `v2.1` | 2001 |

The Gradle build derives Android's required increasing integer `versionCode` from the `vMAJOR.MINOR` name: `MAJOR * 1000 + MINOR`. Minor values are from 0 to 999. The workflow validates the version format before building. When creating a Release, enter the next version in the `version_name` workflow input. Example: after `v1.0`, use `v1.1`; after `v1.9`, use `v1.10`; after `v1.999`, use `v2.0`.

## Native Android Google Login (v1.2)

The Production Android WebView does not use Google's OAuth popup or redirect flow. It uses the Android **Credential Manager** account picker to obtain a Google ID token. The token is passed over the origin-restricted native WebMessage bridge to the Firebase JavaScript SDK, which signs into the existing WebView Auth instance. The existing `smv_users` role verification and Customer / Astrologer / Admin dashboard routing remain the source of authorization.

- OAuth Web Client ID (public client configuration): `299081899217-ht47n60l8t2c7gbo07nd4lpm8i51jk3m.apps.googleusercontent.com`
- Android `setServerClientId()` must use the **Web application** Client ID, not the Firebase Android App ID and never a Client Secret.
- Credential Manager dependencies are pinned to `androidx.credentials:1.3.0` and `googleid:1.1.1`; Firebase Auth dependencies remain managed by the existing Firebase BoM.
- The native bridge is restricted to the main frame on `https://smvastroservices.in` and `https://www.smvastroservices.in`. The Google ID token is not logged or stored by the native bridge.
- Normal website and PWA visits continue to use Firebase's browser popup flow. Only the installed native Android app uses Credential Manager.
- The v1.2 native implementation requires a new APK. The website-only source path is not enough to update an already-installed v1.1 APK.

**Firebase Console prerequisite:** in Firebase project `smv-astro`, Google must remain enabled under Authentication → Sign-in providers. Under Project settings → Your apps → Android app `in.smvastroservices.smvastro`, verify that the SHA-1 fingerprint for the permanent Release signing certificate is registered. Keep the existing Release signing key; do not generate a new keystore. If the SHA-1 is missing, add the fingerprint from the same permanent Release certificate before testing native Google Login. Do not substitute the Android app ID for the Web OAuth Client ID.

**Test boundary:** CI verifies source wiring and compiles Debug plus unsigned Release variants. A successful compile does not prove the Firebase SHA-1 setup or real-device Google account selection. Test on a phone after installing the signed v1.2 APK and confirming the SHA-1 / Google provider setup. No Firebase project settings, production backend, wallet, Razorpay, Render or Cloudflare resources are modified by the source change.

## One-time permanent Release signing setup — Android phone + GitHub Cloud

The permanent Release key is generated once by the dedicated manual mode in the existing GitHub Actions workflow. No PC or local Android terminal is required. The generated keystore uses **PKCS12** format and a strong password.

**Before generating the key**

1. On your Android phone, use a trusted password manager to create one random password of at least 32 characters. Save it securely; do not use a password from another account.
2. Open the repository's **Settings → Secrets and variables → Actions → New repository secret** page:
   [SMV ASTRO Actions Secrets](https://github.com/smvastrorajaram-hub/smvastroservices/settings/secrets/actions)
3. Add these three secrets before starting generation:

   | Secret name | Value |
   |---|---|
   | `SMV_ANDROID_KEYSTORE_PASSWORD` | Your newly generated random password |
   | `SMV_ANDROID_KEY_PASSWORD` | The exact same password as above (required by PKCS12) |
   | `SMV_ANDROID_KEY_ALIAS` | `smvastro-release` |

   Do not add `SMV_ANDROID_KEYSTORE_BASE64` yet. The workflow creates that value.

**Generate the keystore from GitHub Actions**

4. Open **Actions → Build SMV ASTRO Production Android APK → Run workflow**.
5. In the **Use workflow from** branch selector, select `feature/smv-astro-permanent-release-build-20261030` (the PR #245 branch). This selects the workflow version containing the new generation option.
6. Set **Generate the one-time Release keystore** to `true`, then run the workflow. When this option is selected, the APK build job is skipped; this run only creates the keystore package.
7. When the `generate_release_keystore` job succeeds, open that run's Artifacts section and download `SMV-ASTRO-RELEASE-KEYSTORE-ONE-TIME`. The artifact expires after **1 day**.
8. On the Android phone, extract the downloaded ZIP. It contains:
   - `smv-astro-release.p12` — the original permanent keystore; keep a secure backup.
   - `SMV_ANDROID_KEYSTORE_BASE64.txt` — open this file and copy its entire contents.
   - `certificate-sha256-fingerprint.txt` — the public certificate fingerprint for later identity checks.
9. Return to **Settings → Secrets and variables → Actions** and create the fourth secret:

   | Secret name | Value |
   |---|---|
   | `SMV_ANDROID_KEYSTORE_BASE64` | All the text copied from `SMV_ANDROID_KEYSTORE_BASE64.txt` |

10. Keep the original `.p12` file and password in at least two secure backups. Do not send the keystore, Base64 text, or passwords through ChatGPT, email, issue comments, or source files.

**Security and repeat-run rules**

- The artifact contains the password-protected PKCS12 keystore and its Base64 representation, but **does not contain either password**. This repository is public, so anyone may be able to download its Actions artifact. The private key is protected inside the PKCS12 file, but the artifact itself is not a private download; use a randomly generated 32+ character password and never expose it.
- The artifact is retained for only 1 day. Download it and save the original keystore before it expires. After saving the keystore and Base64 secret, delete the artifact from the workflow run summary as soon as you can.
- The generation job refuses to run if `SMV_ANDROID_KEYSTORE_BASE64` is already set. This prevents accidentally generating a replacement key after the permanent key has been saved.
- Do not generate a second key after the first key is saved or used. All future signed Release APKs must use this same `.p12` file and certificate.
- When all four secrets are present, use the same workflow with **Generate the one-time Release keystore** set to `false` and **Build the permanent signed Release APK** enabled.

## Debug vs permanent Release

- Debug APKs are for testing only. Their GitHub artifact is named `SMV-ASTRO-PRODUCTION-DEBUG-TEST-APK` and is retained for 7 days.
- Permanent Release APKs use the stable private key and are named `SMV-ASTRO-PERMANENT-RELEASE-APK`; the Actions artifact is retained for 30 days. The installed Android app does not expire when an artifact link expires.
- Future updates to the website/backend loaded by the WebView do not usually require a new APK. A new Release APK is needed when the native Android app or its bundled configuration changes.
- All Release APKs for this same package must use the exact same PKCS12 keystore/certificate. Never regenerate a replacement key after the first Release.

**Important transition:** the existing test Debug APK and the signed Release APK have the same package name but different signing certificates. Android will not install the Release APK as an in-place update over that Debug APK. After the first signed Release APK has been built and verified, uninstall the Debug test app, then install the Release APK. Uninstalling can clear the app's local data; server-side account data is not deleted by uninstalling.

## Verification boundary

A CI compile proves the Android Release variant can be assembled, not that the signing secrets are configured. A permanent Release is considered ready only after the four secrets are supplied, the signed APK is built, and `apksigner` verifies its certificate. Real-device testing should then be performed with the signed Release app as well.
