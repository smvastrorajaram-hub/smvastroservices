# SMV ASTRO native Android incoming-call ringtone

This change adds native incoming-call ringing to the separate SMV ASTRO Production Android module at smvastroproduction/. Its Android launcher label is SMV ASTRO and its package name is in.smvastroservices.smvastro. The existing smvastro/, smvhoroscope/, and smvcalendar/ modules remain standalone Test APKs, and their workflow file is unchanged.

## What it does

- Registers a native Firebase Cloud Messaging token from the Android app and posts it to POST /live/push/register with platform: native-android. The server derives the owner from the verified Firebase ID token and refuses a token already owned by another account.
- For live_request and live_booking data messages, Android runs a foreground media-playback service, loops the phone's configured ringtone, and shows an incoming request notification/full-screen screen where Android allows it.
- The ringtone stops when the request is opened from the native request screen, when the backend sends a stop_ringing event after handling/ending a request, or after the two-minute ring timeout.
- Scheduled-booking and test alerts use ordinary notification behavior, not the looping incoming-call ringtone.
- The service worker ignores internal stop_ringing control messages rather than showing them as extra user-facing notifications.

## Firebase Console setup required before native ringing works

The Production Android module does not commit a google-services.json or assume an Android Firebase registration already exists. Native FCM needs an Android app registered in the existing Firebase project smv-astro; the web app ID cannot be substituted or guessed. The production package is deliberately separate from the Test APK package.

1. In Firebase Console, open the existing project smv-astro and add an Android app with the exact package name in.smvastroservices.smvastro. The Android launcher label is SMV ASTRO. Do not register in.smvastroservices.test for this Production App.
2. Copy the Android App ID. It must have the form 1:299081899217:android:....
3. The verified Android App ID is configured as the Production module's default: `1:299081899217:android:09e43164cfdd015ba539f0`. The workflow can override it with the repository Actions variable `SMV_FIREBASE_ANDROID_APP_ID`. For local builds, you can also use that environment variable or `-PsmvFirebaseAndroidAppId=1:299081899217:android:09e43164cfdd015ba539f0`.

   Example local build: `bash prepare-smv-astro-production-icon.sh && SMV_FIREBASE_ANDROID_APP_ID='1:299081899217:android:YOUR_REGISTERED_ANDROID_APP_SUFFIX' gradle --no-daemon :smvastroproduction:assembleDebug`

The App ID is public client configuration, not a service-account secret. Do not commit Firebase Admin credentials or private service-account keys.

The existing three-Test-APK workflow file is deliberately not modified, and the Test APK modules are kept separate from this Production module. The Production workflow now builds with the verified Android App ID by default. If an Actions variable overrides it, the workflow checks that the ID matches the current Firebase Project Number prefix before building. Do not describe an unconfigured APK as having working native ringing before that App ID is configured and a physical-device test is completed.

## Permissions and platform limits

- Allow Android notifications for SMV ASTRO.
- On Android 14+, grant the app's full-screen incoming-call permission in system settings if the device offers it. Without this permission, Android may show a heads-up notification instead of opening the full-screen view.
- Ring volume, Do Not Disturb/silent settings, device battery management, FCM delivery, user notification settings, and Android's background-start restrictions remain authoritative. Force-stopping the app from Android Settings can block push delivery until the app is opened again.

## Verification boundary

Automated checks can compile the native classes and run source regression tests. An APK build alone does not prove Firebase app registration, FCM delivery, lock-screen permissions, or physical-device ringtone behavior; those require the configured Android App ID and a real Android-device test.
