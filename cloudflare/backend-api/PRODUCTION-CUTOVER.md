# SMV ASTRO Cloudflare Production Backend

## Production resources

- Worker name: `smvastroservices`
- Worker URL: `https://smvastroservices.astroservices.workers.dev`
- D1: `smvastro-wallet-production`
- D1 ID: `b1d5684c-3fcd-48fe-9571-ea41fc605c7d`
- Firebase identity and Admin role authority: Project 1, `smv-astro` only
- Allowed Origin: `https://smvastroservices.in`
- Workers.dev is enabled; no custom domain or production Pages/Render routes are created by this config.

## Production financial cutover

The Production Worker is configured to enable the Cloudflare D1 financial domains for the confirmed new-customer launch:

- `SMV_BACKEND_CLOUDFLARE_ACTIVE=true`
- `SMV_WALLET_DOMAIN_BACKFILL_COMPLETE=true` and `SMV_WALLET_DOMAIN_CUTOVER_COMPLETE=true`
- `WALLET_READ_ROUTES_ENABLED=true`
- `SMV_LIVE_SESSION_ROUTES_ENABLED=true`
- `SMV_RAZORPAY_LIVE_MODE_ENABLED=true`
- `SMV_RAZORPAY_TEST_MODE_ENABLED=false`

The owner confirmed there are no real customers to migrate. The existing Production D1 domain tables were read-only audited as empty; no historical Firebase Wallet documents or Render test records are imported. New Wallet balances and financial transactions are created in Production D1. Firebase Project 1 (`smv-astro`) remains the authentication, user-profile and role authority; D1 Identity/Profile authorization remains disabled. The Admin identity and role checks continue to use Firebase Project 1.

Razorpay operates in **Live Mode only**. The Worker accepts only a `rzp_live_` key ID with the configured server-side key secret and webhook secret. Production Test Mode remains disabled. The deploy readiness check verifies that the live-mode policy is active and the credentials are present; the separate Admin-only `GET /test-razorpay` endpoint performs the provider's read-only `GET /orders?count=1` connectivity check.

Production D1 migrations 0002–0011 were applied and read-only audited against the exact Production database. The deploy workflow now verifies the actual Worker health and `/api/backend/readiness` response before reporting success.

## Identity/Profile authorization — owner-approved fresh start

Production Identity/Profile authorization is enabled in the Wrangler Production config with an explicit fresh-start approval. This is intentionally **not** a historical Firebase profile import:

- Firebase Authentication in Project 1 (`smv-astro`) continues to issue and verify credentials.
- D1 is authoritative for application Customer/Astrologer/Admin authorization after the fresh-start gate opens.
- Existing Firebase profile, phone-registry, public-ID and payout records are not copied or deleted by this cutover. Existing non-Admin accounts have no preloaded D1 role and may resolve as `unknown` until the Customer/Astrologer registration flow re-establishes the D1 profile.
- New Customer and Astrologer registration writes the profile, role/status, public ID and hashed phone to D1 after the existing Firebase-backed registration transaction. Astrologer Admin approval/rejection also mirrors the role/status into D1.
- Bank and payout fields are deliberately excluded from the registration profile writer; no payout documents are imported by this fresh start.
- The existing configured Admin UID remains project-scoped to Firebase Project 1 and is recognized by the D1 identity resolver without requiring a profile row.
- The three historical backfill attestations remain unset. Fresh-start authorization is enabled through its own explicit approval flag and still requires the D1 Identity/Profile schema to be ready.

This mode is an intentional clean D1 role/profile start. Do not turn off Firebase Auth or delete the Firebase collections as part of this change. A rollback disables D1 Identity/Profile authorization and returns the authorization endpoint to the Firebase-backed resolver.

## Browser routing

`public/index.html` enables `window.SMV_CLOUDFLARE_FINANCIAL_API_ENABLED = true`. The existing frontend resolver switches only these API families to `https://smvastroservices.astroservices.workers.dev`:

- Wallet, Wallet balance/transactions, recharge and offers
- Live Call/Chat sessions, Bookings, event stream, pricing and ICE configuration
- Appointment booking, Razorpay connectivity check, Astrologer earnings/withdrawal and Admin withdrawal/Wallet-offer routes

FCM push registration/status/test and other unfinished legacy APIs remain on their existing backend. Horoscope and Calendar code, deployments, DNS and their independent PWA repositories are not changed by this financial-routing cutover. The Pages workflow skips satellite PWA redeployment unless files under `public/horoscope/` actually change.

## Required Cloudflare Worker secrets

The existing Worker must retain/configure its server-only secrets for the Production Firebase Project 1 service account, Razorpay Live key ID, Razorpay key secret and webhook secret. Do not commit these values. The Firebase service-account JSON must have `project_id: smv-astro`. For payout/withdrawal data, retain the configured payout-encryption secret and its version. The Worker validates the Firebase service account project against the selected production project and accepts only Project 1.

The Production Wrangler config temporarily enables invocation logging at 100% sampling to diagnose the initial Worker runtime failure. The deploy workflow lists secret **names only** (never values) for Firebase Project 1 and Razorpay credentials before deployment. Reduce log sampling after the diagnosis is complete.

The automatic Worker deployment workflow requires the GitHub Production environment secret `CLOUDFLARE_API_TOKEN`. If `CLOUDFLARE_ACCOUNT_ID` is not provided, the workflow resolves it by querying the account list and matching the exact Production D1 database ID and name. The token therefore needs Account Read and D1 Read permission for that database. The account ID can also be configured directly as an optional GitHub Production environment secret. The workflow deploys the named Worker and verifies `/healthz`; it does not change Pages/Render DNS, custom domains or other Worker services.
