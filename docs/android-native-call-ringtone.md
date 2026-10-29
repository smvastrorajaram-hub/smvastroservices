# SMV ASTRO native Android incoming-call ringtone

This change adds a native ringing path to the existing standalone Android test wrapper in smvastro/. The website/PWA FCM path remains available and the existing APK workflow file is unchanged.

## What it does

- Registers a native Firebase Cloud Messaging token from the Android app and posts it to POST /live/push/register with platform: native-android. The server derives the owner from the verified Firebase ID token and refuses a token already owned by another account.
- For live_request and live_booking data messages, Android runs a foreground media-playback service, loops the phone's configured ringtone, and shows an incoming request notification/full-screen screen where Android allows it.
- The ringtone stops when the request is opened from the native request screen, when the backend sends a stop_ringing event after handling/ending a request, or after the two-minute ring timeout.
- Scheduled-booking and test alerts use ordinary notification behavior, not the looping incoming-call ringtone.
- The service worker ignores internal stop_ringing control messages rather than showing them as extra user-facing notifications.

## Firebase Console setup required before native ringing works

The repository has no Android Firebase client registration or google-services.json. Native FCM needs an Android app registered in the existing production Firebase project smv-astro; the web app ID cannot be substituted or guessed.

1. In Firebase Console, open project smv-astro and add an Android app with package name in.smvastroservices.test (the package ID of this repository's existing standalone test APK).
2. Copy the Android App ID. It must have the form 1:299081899217:android:....
3. Build with SMV_FIREBASE_ANDROID_APP_ID set in the environment, or pass -PsmvFirebaseAndroidAppId=1:299081899217:android:... to Gradle.

   Example: SMV_FIREBASE_ANDROID_APP_ID='1:299081899217:android:YOUR_REGISTERED_ANDROID_APP_SUFFIX' gradle --no-daemon :smvastro:assembleDebug

The App ID is public client configuration, not a service-account secret. Do not commit Firebase Admin credentials or private service-account keys.

The existing APK workflow is deliberately not modified. Its unconfigured build remains buildable, but native FCM is disabled until an Android App ID is supplied. Do not describe a default workflow APK as having working native ringing before that app ID is configured and a physical-device test is completed.

## Permissions and platform limits

- Allow Android notifications for SMV ASTRO.
- On Android 14+, grant the app's full-screen incoming-call permission in system settings if the device offers it. Without this permission, Android may show a heads-up notification instead of opening the full-screen view.
- Ring volume, Do Not Disturb/silent settings, device battery management, FCM delivery, user notification settings, and Android's background-start restrictions remain authoritative. Force-stopping the app from Android Settings can block push delivery until the app is opened again.

## Verification boundary

Automated checks can compile the native classes and run source regression tests. An APK build alone does not prove Firebase app registration, FCM delivery, lock-screen permissions, or physical-device ringtone behavior; those require the configured Android App ID and a real Android-device test.
