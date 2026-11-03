# Production Worker remains deployed but inactive until Project 1 Wallet backfill completes

## Why this state is required

The read-only Production D1 row-count audit reported zero rows in all Wallet/Live financial tables and zero rows in the legacy Wallet import archive. The schema exists, but production Wallet balances, ledgers, recharges, sessions, bookings, earnings and withdrawals have not been imported from Firebase Project 1.

## Configured state

- Worker: `smvastroservices.astroservices.workers.dev` remains deployed.
- D1: the exact Production database `smvastro-wallet-production` remains bound.
- Firebase: Project 1 `smv-astro` service-account secret remains configured and connectivity is checked.
- Allowed Origin: `https://smvastroservices.in`.
- Worker runtime health: expected HTTP 200.
- Backend active, Wallet cutover, Wallet read/recharge routes, Live Session/Booking routes and Razorpay Live mode are set OFF.
- Frontend Cloudflare financial API switch remains OFF; current website API traffic stays on Render.
- D1 Identity/Profile authorization remains OFF.
- No D1 rows or schema are changed by this config PR.

Re-enable Wallet/Live/Booking/Razorpay only after the complete Project 1 Wallet backfill, reconciliation, remaining D1 migrations, authenticated conformance tests and production finance checks pass.
