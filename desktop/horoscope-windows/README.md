# SMV HOROSCOPE — Standalone Windows Edition

**Version 0.1.0 · Windows 10 / Windows 11 · 64-bit**

This is an independent Windows desktop application for **SMV HOROSCOPE only**.

- Opens https://horoscope.smvastroservices.in/ directly.
- Uses the existing SMV HOROSCOPE website, authentication and offline/PWA calculation assets.
- Uses its own Windows application identity, app icon and persistent Chromium session.
- Does not include SMV ASTRO Services or SMV CALENDAR navigation.

## Build

From this folder, with Node.js 24.x and npm installed:

```powershell
npm install --no-audit --no-fund
npm test
npm start
npm run dist:win
```

Installer: `release/SMV-HOROSCOPE-Setup-0.1.0-x64.exe`.

Login, cloud data and other server-backed functions need internet. Horoscope screens/calculation assets supported by the existing service worker can be available offline after the service has been loaded online.

The installer is unsigned; validate sign-in, birth-chart calculations, saved reports, place search and offline behavior on a real Windows device before distribution.
