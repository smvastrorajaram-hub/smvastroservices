# SMV ASTRO SERVICES

## Production Source Audit --- 29 September 2026

This repository powers **SMV ASTRO / Sri Madurai Veerayah Astro
Services**.

### Audit scope

The current production source was audited from the latest SMV ASTRO
baseline with the latest changed files applied in descending order. This
audit covers the main SMV ASTRO website and service workflows only.

**Horoscope and Marriage Matching calculation sections are intentionally
excluded from this audit.**

Covered areas:

-   Home, header, navigation, footer, public content, Blog/Media, FAQ
    and contact surfaces
-   Customer registration and login
-   Astrologer registration, qualification and login
-   Google authentication
-   Admin authentication and dashboard
-   Customer dashboard and all non-horoscope subsections
-   Astrologer dashboard and all subsections
-   Public Ask Question workflow
-   Private Consultation workflow
-   Admin question approval / allocation / reallocation
-   Public and Private answer submission / approval
-   Customer viewed / commission flow
-   Reviews and ratings
-   Offers, automatic offers and promotion codes
-   Home + Customer offer banners
-   Razorpay order / verify / retry / refund integration paths
-   Withdrawals and payout-management paths
-   Admin notifications
-   Resend email event flow
-   Firebase read/realtime behavior relevant to quota
-   Dashboard state reuse and live-update invalidation
-   PWA/session/navigation integration outside the Horoscope application

### Locked behavior preserved

-   Login and Dashboard opening logic is treated as working and must not
    be changed casually.
-   Returning to an already hydrated Dashboard reuses the existing
    dashboard state unless a real data-changing action requires refresh.
-   Dashboard live connection `ready`, `error`, or reconnect events do
    not themselves force a full reload; actual change events are
    coalesced.
-   MutationObserver must not initiate Firebase reads, backend requests,
    payment calls, or dashboard refreshes.
-   Public and Private answer email rules:
    -   Auto Allow ON → answer can be released to the customer
        immediately.
    -   Auto Allow OFF → customer answer email is sent only after Admin
        approval.
-   Email failure must not roll back a successful
    payment/question/answer business transaction.
-   Automatic offers do not require a promo code.
    Manual/No-Code-Required behavior remains separate according to the
    saved offer configuration.
-   Offers selected for both Public Question and Private Consultation
    are evaluated for both services.
-   Home + Customer banner visibility follows the saved banner display
    target.
-   Payment retries preserve the original service/question context
    rather than creating an unrelated duplicate transaction.

### Current audit result

**Static/source audit: PASS with two bounded quota-watch items
documented below.**

The source passed:

-   JavaScript syntax validation for the main backend and all public
    JS/MJS files.
-   HTML ID uniqueness check: no duplicate IDs found in the audited
    `index.html`.
-   Local HTML asset-reference check: no missing local assets were
    found.
-   Client/backend route contract check for the audited non-horoscope
    calls; query-string variants map to their corresponding backend
    routes.
-   MutationObserver audit: the active observer found in the main
    application only synchronizes Logout-button styling; it does not
    perform network/Firebase/payment work.
-   Admin Offer initial-load audit: Offers are supplied through the
    Admin data load instead of an extra initial `/admin/offers` request.
    `/admin/offers` remains available for explicit save
    verification/refresh.
-   Dashboard refresh deduplication and existing-dashboard reuse are
    present.

### Firebase quota notes

Two intentional bounded mechanisms remain and should not be converted
into uncontrolled polling:

1.  The Public Question price uses one Firestore `onSnapshot` listener
    for `smv_settings/question` per page session. It updates only when
    that document changes.
2.  A Customer Dashboard with a pending refund can schedule a 20-second
    reconciliation refresh while the pending refund condition exists.

Neither is driven by MutationObserver. Do not add retry loops, repeated
collection reads, or observer-triggered API calls around them.

### Deployment

Frontend/static files are deployed with the SMV ASTRO site.

Backend changes in `server.js` require the Render backend deployment
used by the production site.

Keep Firebase credentials and email/payment secrets server-side. Do not
commit production secrets to GitHub.

### Runtime verification

This audit validates source structure and static contracts. Live
Firebase Auth, Firestore, Razorpay, Resend delivery and Render
environment secrets cannot be fully simulated by a source-only test
environment. After deployment, use a controlled test account to verify
one complete Public Question and one complete Private Consultation
transaction without repeatedly generating paid orders.

See `FINAL-AUDIT-REPORT.md` for the detailed section-by-section result.
