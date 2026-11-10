# SMV ASTRO — Windows Desktop Edition

**Phase 1 · Version 0.1.0 · Windows 10 / Windows 11 (64-bit)**

This folder contains the first Windows desktop shell for the three existing SMV services:

| Desktop section | Existing hosted service |
| --- | --- |
| SMV ASTRO | https://smvastroservices.in/ |
| SMV HOROSCOPE | https://horoscope.smvastroservices.in/ |
| SMV CALENDAR | https://calendar.smvastroservices.in/ |

## What this first version does

- Opens all three existing services inside one Windows application, with a persistent SMV navigation bar and native Windows menus.
- Keeps the existing hosted Firebase, wallet, payment, consultation and dashboard flows as the source of truth. This project does not copy or replace those backends.
- Uses one persistent Chromium session partition so web storage and service-worker caches can survive app restarts. Each website origin still has its own browser storage boundary.
- Requests camera, microphone, notifications and geolocation permissions only when the requesting origin is one of the three configured SMV website hosts; Chromium still presents the user's permission prompt.
- Uses HTTPS-only remote navigation, context isolation, renderer sandboxing, and no Node.js integration in remote service content.

## Offline behavior and boundaries

The desktop wrapper does not claim that all cloud services work offline. The first launch and first visit to each service require internet access. After a service has loaded online, that service's existing PWA/service-worker cache may provide supported screens and cached astrology calculation assets offline.

Login, identity verification, cloud dashboards, wallet balance/recharge, Razorpay/payment verification, live call/chat, booking updates, email and other server-backed operations still require an internet connection. Offline capability depends on the existing website cache and the assets previously stored by Chromium; it is not a replacement for the deployed PWA offline implementation.

## Build on Windows

Requirements: Node.js 24.x and npm.

From this folder:

```powershell
npm install --no-audit --no-fund
npm test
npm start
npm run dist:win
```

The installer is written to `release/SMV-ASTRO-Setup-0.1.0-x64.exe`.

The Windows build workflow also runs the tests and packages the NSIS installer on a GitHub-hosted Windows runner. It uploads the installer as a workflow artifact for review.

## Security and release notes

- No Firebase service-account key, Razorpay secret, Render credential or Cloudflare secret is bundled.
- Remote website renderers have `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true` and `webSecurity: true`.
- The desktop application only accepts fixed internal module IDs for navigation; the website URL is not passed from the renderer.
- This initial installer is not code-signed. Windows SmartScreen may show an unknown-publisher warning until the owner configures a valid code-signing certificate.
- The installer artifact is a test build, not a production release. Validate sign-in, camera/microphone, notifications, file downloads, Razorpay checkout, live call/chat, and offline behavior on a real Windows device before distributing it.
- App self-update, signed releases, and automated end-to-end Windows device tests are later release tasks.

## Repository boundaries

This desktop-only change does not edit the website's `public/` files, synchronized PWA cache versions, Firebase configuration, Cloudflare Worker/D1 resources, Render services, or production data.
