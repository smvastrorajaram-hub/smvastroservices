# SMV ASTRO Android app: native incoming-call ringtone and permanent Release build

The Production Android app lives in `smvastroproduction/`, has launcher name **SMV ASTRO**, and uses package `in.smvastroservices.smvastro`. The modules `smvastro/`, `smvhoroscope/`, and `smvcalendar/` remain separate Test APKs. The existing `.github/workflows/build-test-apks.yml` workflow is not changed.

## Native incoming-call ringtone

- The Production Android app registers a native Firebase Cloud Messaging token and posts it to `POST /live/push/register` with `platform: native-android`. The server derives the owner from the verified Firebase ID token and refuses a token already owned by another account.
- For `live_request` and `live_booking` data messages, Android runs a foreground media-playback service, loops the phone's configured ringtone, and shows an incoming request notification/full-screen screen where Android allows it.
- The ringtone stops when the request is opened from the native request screen, when the backend sends a `stop_ringing` event after handling/ending a request, or after the two-minute ring timeout.
- Scheduled-booking and test alerts use ordinary notification behavior, not the looping incoming-call ringtone.
- Android notification/full-screen permissions, DND/silent settings, ring volume, battery management, FCM delivery, and force-stop restrictions remain controlled by Android and the device owner.

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

## One-time permanent Release signing setup

A single private Android keystore must be created and retained securely. **Do not send the keystore, Base64 value, or passwords in ChatGPT, email, issue comments, or source files.** Keep at least two safe offline backups of the original `.jks` file and its passwords. Losing the private key prevents signing future updates for the same package.

1. On a trusted computer with Java `keytool` installed, create the key (it prompts you for the keystore password and certificate details):

   ```bash
   keytool -genkeypair -v -keystore smv-astro-release.jks -alias smvastro-release -keyalg RSA -keysize 4096 -validity 10000
   ```

   Keep the alias as `smvastro-release`. Set a strong keystore password and key password; store them in a password manager. The key file itself must be backed up securely.

2. Convert that same `.jks` file to a single-line Base64 string. On Linux/macOS:

   ```bash
   python -c "import base64; print(base64.b64encode(open('smv-astro-release.jks','rb').read()).decode())" > smv-astro-release.base64.txt
   ```

   On Windows PowerShell:

   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("$PWD\smv-astro-release.jks")) | Set-Content -NoNewline smv-astro-release.base64.txt
   ```

3. In the GitHub repository, open **Settings → Secrets and variables → Actions → New repository secret**. Create these four repository secrets. Put the Base64 text from the generated file in the first secret; type the matching values chosen in step 1 for the other three.

   | Secret name | Value |
   |---|---|
   | `SMV_ANDROID_KEYSTORE_BASE64` | Entire single-line Base64 content of the `.jks` |
   | `SMV_ANDROID_KEYSTORE_PASSWORD` | Keystore password |
   | `SMV_ANDROID_KEY_ALIAS` | `smvastro-release` |
   | `SMV_ANDROID_KEY_PASSWORD` | Key password |

4. Never commit the `.jks`, Base64 text file, or passwords to Git. The Release workflow restores the keystore into the temporary Actions runner, verifies its alias, signs the APK, verifies the APK signature with Android `apksigner`, uploads only the APK, and removes the temporary keystore at the end of the job.

5. Open **Actions → Build SMV ASTRO Production Android APK → Run workflow**. Enter the next `version_name` (first permanent release: `v1.0`) and keep **Build the permanent signed Release APK** enabled. The workflow stops before signing if any required secret is missing.

## Debug vs permanent Release

- Debug APKs are for testing only. Their GitHub artifact is named `SMV-ASTRO-PRODUCTION-DEBUG-TEST-APK` and is retained for 7 days.
- Permanent Release APKs use the stable private key and are named `SMV-ASTRO-PERMANENT-RELEASE-APK`; the Actions artifact is retained for 30 days. The installed Android app does not expire when an artifact link expires.
- Future updates to the website/backend loaded by the WebView do not usually require a new APK. A new Release APK is needed when the native Android app or its bundled configuration changes.
- All Release APKs for this same package must use the exact same keystore/certificate. Never regenerate a replacement key after the first Release.

**Important transition:** the existing test Debug APK and the signed Release APK have the same package name but different signing certificates. Android will not install the Release APK as an in-place update over that Debug APK. After the first signed Release APK has been built and verified, uninstall the Debug test app, then install the Release APK. Uninstalling can clear the app's local data; server-side account data is not deleted by uninstalling.

## Verification boundary

A CI compile proves the Android Release variant can be assembled, not that the signing secrets are configured. A permanent Release is considered ready only after the four secrets are supplied, the signed APK is built, and `apksigner` verifies its certificate. Real-device testing should then be performed with the signed Release app as well.
