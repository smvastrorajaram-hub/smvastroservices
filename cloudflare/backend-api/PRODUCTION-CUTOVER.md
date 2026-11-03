# SMV ASTRO Cloudflare Production Backend

## Production resources

- Worker name: `smvastroservices`
- Worker URL: `https://smvastroservices.astroservices.workers.dev`
- D1: `smvastro-wallet-production`
- D1 ID: `b1d5684c-3fcd-48fe-9571-ea41fc605c7d`
- Firebase identity and Admin role authority: Project 1, `smv-astro` only
- Allowed Origin: `https://smvastroservices.in`
- Workers.dev is enabled; no custom domain or production Pages/Render routes are created by this config.

## Enabled Worker domains

The production Wrangler config selects Production Project 1, the Production D1 binding, Wallet cutover gates, Live Session/Booking routes and Razorpay Live mode. D1 Identity/Profile authorization stays disabled; all Customer/Astrologer/Admin identity and role checks remain Firebase Project 1-backed.

Production D1 migrations 0002–0011 can be inspected and applied through the manual `Cloudflare Production D1 schema migrations` workflow. The workflow first prints the remote migration state and applies only pending migrations after the exact database name is confirmed.

## Browser routing

The frontend resolver switches only these API families when `window.SMV_CLOUDFLARE_FINANCIAL_API_ENABLED === true`:
- Wallet and Wallet recharge/offer endpoints
- Live Call/Chat sessions, bookings, event stream, pricing and ICE configuration
- Appointment booking, Razorpay connectivity check, Astrologer earnings/withdrawal and Admin withdrawal/Wallet-offer routes

The default in `public/index.html` is deliberately `false` in this PR. FCM push registration/status/test, other legacy APIs, Horoscope and Calendar remain on their existing Render/production endpoints. After the Worker deploy health check returns the Production runtime and Wallet/Live/Booking/Razorpay Live checks pass on the exact Worker URL, change the frontend flag to `true` in a separate frontend deployment to switch website traffic.

## Required Cloudflare Worker secrets

The existing Worker must retain/configure its server-only secrets for the Production Firebase Project 1 service account, Razorpay Live key ID, Razorpay key secret and webhook secret. Do not commit these values. The Firebase service-account JSON must have `project_id: smv-astro`. For payout/withdrawal data, retain the configured payout-encryption secret and its version. The Worker validates the Firebase service account project against the selected production project and accepts only Project 1.

The automatic Worker deployment workflow requires GitHub Production environment secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. It deploys the named Worker and verifies `/healthz`; it does not change Pages/Render DNS, custom domains or other Worker services.
