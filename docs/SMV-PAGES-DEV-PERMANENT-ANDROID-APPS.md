# SMV Pages.dev permanent Android apps

This release family adds three standalone Android packages for the three Pages.dev entry routes. It does not replace the existing `.in` production apps.

| App | Start URL | Package |
|---|---|---|
| SMV ASTRO | https://smvastroservices.pages.dev/ | `in.smvastroservices.pages.astro` |
| SMV HOROSCOPE | https://smvastroservices.pages.dev/horoscope/ | `in.smvastroservices.pages.horoscope` |
| SMV CALENDAR | https://smvastroservices.pages.dev/horoscope/calendar/ | `in.smvastroservices.pages.calendar` |

## Signing and updates

- The three packages use the repository's existing password-protected PKCS12 Release keystore and alias `smvastro-release`.
- Release builds verify APK Signature Scheme v2 and the existing permanent certificate SHA-256 fingerprint before publication.
- Their application IDs are different from all three `.in` packages, so both app families can be installed together.
- A version allocator reads the previous Pages.dev release tags and advances the Android versionCode.
- Signed APKs are published as three permanent assets in one GitHub Release. Pull-request builds compile Release variants without signing and do not publish APKs.

## Website and cache behavior

Each app opens its exact Pages.dev URL. The WebView uses the platform's default online-first HTTP cache and the website's own Service Worker scope. It does not clear cookies, local storage, IndexedDB or Cache Storage. Website/PWA code updates continue to be delivered by the Pages.dev Service Workers; a native APK update is needed only for native Android source/configuration changes.

## Native integration boundary

- SMV ASTRO keeps the Pages.dev-only Credential Manager Google sign-in bridge and Android microphone permission required by its WebRTC pages.
- Native FCM background notifications are intentionally not copied from the `.in` ASTRO package. A separate Firebase Android app registration for `in.smvastroservices.pages.astro` is required before adding native FCM to this package.
- HOROSCOPE and ASTRO include path-checked native A4 PDF actions for their report-print route. CALENDAR does not expose the PDF bridge.
- The existing `.in` Firebase Android registration, FCM package, native Google login origin and all three `.in` Release modules remain unchanged.

## First release

After the PR is merged, the main-branch workflow restores the existing key from GitHub Actions secrets, builds all three signed Release APKs, verifies their certificate and package IDs, and publishes them together. The successful GitHub Release is the durable distribution source; Actions build artifacts are not used as the long-term APK store.
