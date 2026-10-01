# SMV ASTRO V1

SMV ASTRO V1 is the consolidated source for **Sri Madurai Veerayah Astro Services**, combining the main service website, customer/astrologer/admin workflows, Horoscope, Marriage Matching, saved reports, payments and the current Reality Prediction work.

## V1 baseline

For this release, **V1 means the latest SMV ASTRO source with V143 Marriage Strength Matrix applied**. Older development version numbers are historical change labels; V1 is the whole-website release identity.

## Main applications

### SMV ASTRO website

The main public site provides service information, customer and astrologer registration/login, Ask Your Question, Private Consultation, approved astrologer/review surfaces, offers, FAQ, Blog/Media, contact and customer/astrologer/admin dashboards.

### SMV Horoscope

The Horoscope application is under `public/horoscope/`. It supports Basic chart calculation and the configured Full/Advanced experience, Tamil/English presentation, saved reports, browser report actions, Advanced Analysis, Dasa/Transit analysis and the current Reality Prediction layer.

The calculation architecture contains both backend API routes and a browser/offline engine for the supported astrology calculations. Authentication, cloud saved-report synchronization and Razorpay payments remain online services.

### Marriage Matching

The current Marriage Matching implementation is V143. It retains Nakshatra Porutham and the existing full matching evidence, while adding the later Reality Prediction, timing confirmation and Marriage Strength Matrix work. The strength matrix is an internal evidence-synthesis layer; it is not intended to present a fabricated compatibility percentage to the customer.

## Current interpretation principle

Prediction and matching should synthesize calculated evidence rather than rely on one-factor shortcuts.

The intended Horoscope flow is:

`Natal Promise → House/Lord/strength/aspects → Advanced evidence → D7/D9/D10 confirmation where relevant → chronology → Dasa/Bhukti/Antaram → Gochara/timing confirmation → Reality Prediction`.

Marriage Matching similarly combines natal relationship evidence, dosha/bhanga, divisional support, partner balance and timing confirmation. A favourable Dasa or transit does not by itself prove that a marriage or other event occurred.

## Saved reports and PDF actions

Saved eligible Horoscope and Marriage Matching reports are intended to be available again after customer login. Report/PDF preparation is lazy: saving a report should not require immediate PDF generation. When a PDF action needs preparation, one generation job should serve the requested action while repeated taps wait for completion.

## Access and pricing

Horoscope and Marriage Matching availability/price are controlled by the current service configuration. Public/basic access and logged-in Full access are intentionally separate flows. Paid access uses Razorpay and server-side verification/entitlement routes.

Do not bypass these gates in client-only UI code.

## Important source areas

- `public/index.html` — main public website and FAQ.
- `public/smvastro.mjs` — main application/dashboard workflows.
- `public/horoscope/` — Horoscope and Marriage Matching UI/runtime.
- `public/horoscope/marriage-matching.js` — current V143 matching implementation.
- `public/horoscope/horoscope-predictions.js` — Reality Prediction/integrated prediction UI.
- `public/horoscope/offline/` — browser/offline calculation router and modules.
- `server.js` — backend API, authentication support, payment, reports and service workflows.
- `firestore.rules` — Firestore security rules.
- `AUDIT.md` — current full-source audit and bounded runtime verification list.

## Locked dashboard behavior

Do not casually alter the Dashboard/session behavior:

- Explicit login opens the correct Customer/Astrologer/Admin dashboard.
- Closing and reopening the website/PWA with a persisted Firebase session starts at Home rather than automatically reopening the last dashboard.
- Re-entering an already hydrated Dashboard should reuse existing state unless a real data change requires refresh.
- MutationObserver must not be used to initiate Firebase/API/payment work.

## Development

The root package uses Node.js 20+ and starts the backend with:

```bash
npm start
```

The repository contains third-party astrology/ephemeris components. Keep the included licence/notice files with distributions and review them before changing packaging.

## Secrets and production safety

Do not commit private Firebase Admin credentials, Razorpay secrets, email credentials or other server secrets into client files. Public client configuration and private server credentials are different concerns.

A successful static audit does not replace controlled production tests for Firebase Auth/Firestore, Razorpay, refunds, email delivery or other third-party services.

## Release verification

Before production deployment, read `AUDIT.md`. At minimum verify login/dashboard cold-reopen behavior, public Basic gates, Admin pricing/access matrix, one Advanced Horoscope payment, one Full Marriage Matching payment, saved-report restoration and the lazy View/Download/Print flow.
