# SMV ASTRO Cloudflare Workers API — Phase 1

This is an isolated, staging-first Worker. It does not replace `server.js`, change any frontend API URL, alter DNS, or take production traffic.

## Phase 1 scope

- `GET /healthz`
- `GET /api/locations/status`
- `GET /api/locations/search?q=Madurai&limit=10&lang=ta`
- `GET /api/locations/timezone?lat=9.9252&lng=78.1198`

The GeoNames username is read only from the `GEONAMES_USERNAME` Worker secret. It is never returned to the browser or included in a cache key. The response mapping preserves the existing API shape expected by SMV ASTRO location-search clients. The selected-place timezone endpoint returns the IANA `timezoneId`; it deliberately does not return a current DST offset for historical birth-time calculations.

## Staging setup

1. Create or select the Cloudflare account and confirm that the account is on the Free plan.
2. From this directory, run `npx --yes wrangler@4.156.0 dev` for local runtime testing.
3. Add the GeoNames username as a Worker secret: `npx --yes wrangler@4.156.0 secret put GEONAMES_USERNAME`.
4. Add the comma-separated, exact frontend origins as a Worker secret named `ALLOWED_ORIGINS`. Do not use `*`.
5. Validate the deployment bundle with `npx --yes wrangler@4.156.0 deploy --dry-run`.
6. Deploy only the staging Worker after the account owner has reviewed the Cloudflare project and secrets. The initial Worker uses its `workers.dev` hostname and has no production custom-domain route.
7. Test status, a worldwide location search, and timezone resolution with a real GeoNames account before changing any staging frontend URL.

No production secrets, Firebase service-account credentials, Razorpay keys, wallet state, or Cloudinary credentials belong in this Worker Phase 1.

## Deliberate exclusions

The existing Node backend remains authoritative for authentication-sensitive workflows, Firestore writes, Razorpay verification, refunds, wallet ledger, Call/Chat billing, scheduled appointments, admin workflows, email, Swiss Ephemeris calculation, and PDF generation. These require dedicated compatibility and transactional-safety work before a later migration phase.

The existing India offline location database and all Horoscope/Calendar sources are untouched. No Render service is stopped or changed by this PR.
