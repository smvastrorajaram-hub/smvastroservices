# SMV CALENDAR — Standalone Windows Edition

**Version 0.1.0 · Windows 10 / Windows 11 · 64-bit**

This is an independent Windows desktop application for **SMV CALENDAR only**.

- Opens https://calendar.smvastroservices.in/ directly.
- Uses the existing SMV CALENDAR website, Panchang/Hora logic and offline/PWA assets.
- Uses its own Windows application identity, app icon and persistent Chromium session.
- Does not include SMV ASTRO Services or SMV HOROSCOPE navigation.

## Build

From this folder, with Node.js 24.x and npm installed:

```powershell
npm install --no-audit --no-fund
npm test
npm start
npm run dist:win
```

Installer: `release/SMV-CALENDAR-Setup-0.1.0-x64.exe`.

Daily Panchang, calendar and calculation assets supported by the existing service worker can be available offline after the service has been loaded online. Online authentication and cloud features continue to need internet.

The installer is unsigned; validate Tamil/English calendar, Panchang, location selection and offline behavior on a real Windows device before distribution.
