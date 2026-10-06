# SMV ASTRO / SMV HOROSCOPE / SMV CALENDAR — Temporary Android Test Project

இந்த package **Play Store production release அல்ல**. ₹0 செலவில் phone-ல் test செய்ய தனித்தனி Android packages உருவாக்கப்பட்டுள்ளது.

## Apps

1. **SMV ASTRO**
   - Package: `in.smvastroservices.test`
   - URL: `https://smvastroservices.in/`

2. **SMV HOROSCOPE**
   - Package: `in.smvastroservices.horoscope.test`
   - URL: `https://smvastroservices.in/horoscope/`

3. **SMV CALENDAR**
   - Package: `in.smvastroservices.calendar.test`
   - URL: `https://smvastroservices.in/horoscope/calendar/`

## ஏன் `.test` package?

Temporary debug APK-ஐ future official Play Store package உடன் signature conflict வராமல் தனியாக வைத்திருக்கிறது.
பிறகு production release செய்யும்போது production package names + Play App Signing பயன்படுத்தலாம்.

## TWA behaviour

இந்த project `android-browser-helper` Trusted Web Activity launcher-ஐ பயன்படுத்துகிறது.
Domain-side Digital Asset Links production certificate-க்கு இன்னும் bind செய்யப்படாததால் test build-ல் browser toolbar காணப்படலாம்.
Website logic, Firebase, Firestore, Horoscope engine, Calendar engine ஆகியவை Android source-க்கு copy செய்யப்படவில்லை — live website தான் திறக்கப்படுகிறது.

## Official icons

`prepare-icons.sh` run செய்தால் தற்போதைய live SMV PWA icons download செய்து app resources-ல் பயன்படுத்தும்.
Fallback vector icons source-ல் இருக்கின்றன.

## Build option A — Android Studio

1. இந்த folder-ஐ Android Studio-ல் Open செய்யவும்.
2. Terminal-ல் `bash prepare-icons.sh` run செய்யவும்.
3. Gradle sync complete ஆனதும்:
   - `smvastro`
   - `smvhoroscope`
   - `smvcalendar`
   ஆகிய modules-க்கு **Build APK(s)** செய்யலாம்.

Required:
- JDK 17
- Android SDK 36
- Internet access for Gradle dependencies

## Build option B — GitHub Actions (₹0)

இந்த project-ஐ GitHub repository-க்கு upload செய்தால் `.github/workflows/build-test-apks.yml`
மூன்று debug APK-களையும் build செய்து `SMV-ANDROID-TEST-APKS` artifact ஆக தரும்.

Artifact files:
- `SMV-ASTRO-TEST.apk`
- `SMV-HOROSCOPE-TEST.apk`
- `SMV-CALENDAR-TEST.apk`
- `SHA256SUMS.txt`

## Production Play Storeக்கு முன்

Temporary `.test` packages-ஐ production என்று பயன்படுத்த வேண்டாம்.
Production release-க்கு:
- final package IDs
- release signing / Play App Signing
- `/.well-known/assetlinks.json`
- Play Data Safety
- screenshots / store listing
- policy review
- production AAB

தேவை.
