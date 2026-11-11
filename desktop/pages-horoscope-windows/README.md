# SMV HOROSCOPE — Pages.dev Windows Edition

**Version 0.1.0 · Windows 10 / Windows 11 · 64-bit**

This independent Windows desktop app opens only the SMV HOROSCOPE section of the shared SMV ASTRO Cloudflare Pages site:

- URL: https://smvastroservices.pages.dev/horoscope/
- Separate Windows app identity, shortcut, icon and persistent Chromium session.
- Starts in a **desktop Chrome user-agent and a 1600 × 1000 desktop window** (minimum width 1100 px).
- Uses the site's existing PWA manifest and scoped service worker. The browser cache and service-worker storage persist between launches.
- The app menu includes **Work offline** to test the previously cached site, and **Open this PWA in browser** to open the same Pages.dev path in the default browser for Chrome PWA installation.

## Offline boundaries

First launch and the first complete service-worker cache install require internet. Keep the app online until the PWA's offline cache has completed. HOROSCOPE and CALENDAR service workers cache their local calculation assets and India location data; the SMV ASTRO root service worker caches its static app shell and the shared India location pack. The service workers are scoped independently to `/horoscope/`.

Firebase login, cloud account data, payment, wallet, live consultation, bookings, notifications that require server delivery, and other server-backed actions still require internet. Offline mode means cached app screens, supported local calculations and cached place lookup—not cloud transactions.

## Chrome PWA installation on Android

Open the URL above in Chrome on Android, then use **⋮ → Install app** (or **Add to Home screen**). Each path has its own manifest, app name, icon and service-worker scope. Do not install all three from the root URL; install HOROSCOPE and CALENDAR from their own paths.

## Build

Requires Node.js 24.x and npm:

```powershell
npm install --no-audit --no-fund
npm test
npm start
npm run dist:win
```

Installer: `release/SMV-HOROSCOPE-Pages-Setup-0.1.0-x64.exe`.

The installer is unsigned. Validate desktop rendering, the PWA cache, offline location search and local calculations on a real Windows device before distribution.
