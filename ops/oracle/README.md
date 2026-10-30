# SMV ASTRO Oracle backend migration

## Scope and current state

This directory prepares a direct Node.js backend deployment to an Oracle Cloud Infrastructure (OCI) Ubuntu VM. It does **not** provision an OCI VM, create DNS records, assign a Reserved Public IP, open an OCI Network Security Group (NSG), issue a TLS certificate, copy production secrets, deploy Firebase data, or turn off existing Render services. Those steps require access to the OCI tenancy and must be completed and smoke-tested before the public website is switched.

Target hostnames:

| Purpose | Hostname | Listener |
| --- | --- | --- |
| Production backend API | `api.smvastroservices.in` | Nginx HTTPS → Node `127.0.0.1:10000` |
| Staging backend API | `api-staging.smvastroservices.in` | Nginx HTTPS → Node `127.0.0.1:10001` |
| Staging browser/PWA | `staging.smvastroservices.in` | Nginx HTTPS → `/opt/smvastroservices/staging/public` |

Cloudflare Pages continues to serve the existing production frontend domains. Cloudinary is not changed. Project 1 stays standalone; Project 2/3 and Project 4/5 Firebase data migration remains governed by its own migration PR and validation gates.

## OCI instance and network

1. In the OCI Console, create an Ubuntu 24.04 VM in the tenancy's **home region**. If available and eligible, the Always Free Ampere A1 Flex allowance is 1,500 OCPU-hours and 9,000 GB-hours monthly (equivalent to 2 OCPUs and 12 GB RAM total for Always Free accounts). Always Free host capacity is not guaranteed; do not choose a paid shape if a free-only deployment is required. See Oracle's [Always Free Resources](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm).
2. Assign a Reserved Public IP, attach the operator's SSH public key, and add an NSG/security-list policy that allows TCP 22 only from the operator's management IP and TCP 80/443 from the internet. Do **not** expose ports 10000 or 10001 publicly; those listeners are bound to localhost behind Nginx.
3. Add DNS A records for all three target hostnames to that Reserved Public IP. Do not switch the main frontend away from the old endpoint until the health, TLS and application tests below are green.
4. SSH to the VM, clone the repository/this branch, and run:
   ```sh
   sudo bash ops/oracle/bootstrap-ubuntu.sh
   ```
   The bootstrap installs Node.js, build tools for native Node packages, Nginx and Certbot. It does not change the OCI NSG and avoids auto-enabling UFW because a bad SSH rule can lock out the VM.

## Environment secrets and preserved data

Create the environment files from the examples:

```sh
sudo install -o root -g smvastro -m 0640 ops/oracle/backend.env.example /etc/smvastroservices/production.env
sudo install -o root -g smvastro -m 0640 ops/oracle/staging.env.example /etc/smvastroservices/staging.env
sudoedit /etc/smvastroservices/production.env
sudoedit /etc/smvastroservices/staging.env
```

Transfer live Firebase service-account keys, Razorpay secrets, email credentials, admin IDs, GeoNames username, and configured TURN credentials from the trusted secret store over an encrypted administration channel. Do not retrieve or commit secrets to GitHub, do not paste them into chat, and do not reuse production keys in staging. The staging file must use Firebase project `smv-astro-staging` and Razorpay `rzp_test_...` keys only.

Preserve the licensed Swiss Ephemeris data under `/opt/smvastroservices/shared/ephe`. Copy the existing `.se1` files from your trusted backup using a non-destructive transfer; never use `rsync --delete`, `git clean -fd`, or a cleanup step that might erase ephemeris files, the India offline locations database, WebAssembly files or other assets. The deploy script intentionally does not run `git clean` and does not recursively change ownership of the deployed tree.

## TLS and Nginx cutover

The bootstrap activates a temporary HTTP-only config solely for ACME challenge issuance. After DNS resolves to the OCI Reserved Public IP and ingress 80/443 is open, request a single certificate covering all three hostnames:

```sh
sudo certbot certonly --webroot -w /var/www/certbot \
  --cert-name api.smvastroservices.in \
  -d api.smvastroservices.in \
  -d api-staging.smvastroservices.in \
  -d staging.smvastroservices.in \
  --agree-tos --non-interactive --email YOUR_ADMIN_EMAIL
```

Then install the TLS reverse-proxy config and validate/reload Nginx:

```sh
sudo install -m 0644 ops/oracle/nginx/smvastro-oci.conf /etc/nginx/sites-available/smvastro-oci.conf
sudo ln -sfn /etc/nginx/sites-available/smvastro-oci.conf /etc/nginx/sites-enabled/smvastro-oci.conf
sudo nginx -t
sudo systemctl reload nginx
sudo certbot renew --dry-run
```

The renewal deploy hook installed by bootstrap runs an Nginx configuration check and reload after a certificate renews. The reverse proxy keeps SSE/Live Call/Chat connections from buffering and allows the existing 100 MB APK upload ceiling plus HTTP overhead.

## Deploy

The deployment script installs runtime npm packages using `npm install --package-lock=false --omit=dev`, because the current repository's lockfile is known not to be synchronized with `package.json`; `npm ci` fails against it. It checks JavaScript syntax, restarts only the selected systemd service and waits for a localhost health response.

```sh
sudo bash ops/oracle/deploy-backend.sh production feature/oracle-backend-migration-20261030
sudo bash ops/oracle/deploy-backend.sh staging feature/oracle-backend-migration-20261030
```

After the Oracle cutover PR has been reviewed/merged and the intended main branch is ready, redeploy with `main`. The service units run as the unprivileged `smvastro` account and use environment files under `/etc/smvastroservices`.

## Acceptance tests before any production switch

1. `curl -fsS https://api.smvastroservices.in/healthz` and `curl -fsS https://api-staging.smvastroservices.in/healthz`.
2. Test `/api/locations/status`, world-city search and selected-city timezone: `/api/locations/search?q=London&limit=10` and `/api/locations/timezone?lat=51.5074&lng=-0.1278`. Verify the returned `timezoneId` is `Europe/London` for London.
3. Verify login, registration/email verification, password reset, Customer/Astrologer/Admin dashboards, approval/rates, consultations, notifications, saved reports, public content and admin settings.
4. On staging only, verify Razorpay Test Mode recharge/order/recharge-webhook behavior. Verify refunds, wallet ledger, session reserve/settlement, withdrawal controls and idempotency only after the Firebase domain migration is fully ready.
5. Verify Live Call/WebRTC and Live Chat in two real browser/device sessions, including microphone permission, SSE streaming/reconnect, TURN configuration, connect failure/refund, duration settlement and low-balance termination.
6. Test the Admin APK release manager with a valid signed APK (upload limit is 100 MB), download/update URLs, health after restart, logs, HTTPS renewals and Nginx config.
7. Validate the actual staging static browser from `https://staging.smvastroservices.in`. Confirm that static files, PWA installation and service-worker refresh still work.
8. Run the paired Firestore read validator only after the separate Projects 2/3 and 4/5 mirror/backfill steps are ready; do not enable their flags through this Oracle deployment process.

## Render retirement order

The current production and staging Render services remain running until OCI tests pass. After every acceptance test above passes using the Oracle hostnames and production DNS/frontends have been switched, update any separately published Google Apps Script webhook URL, confirm scheduled monitors target Oracle, then explicitly disable/delete Render services and remove the Render deployment descriptor in a later cleanup change. This Draft PR alone does not switch DNS or decommission Render.

## Separate Horoscope offline/online requirement

The requested product rule is: only Horoscope location search may have an offline bundled-location fallback plus online lookup; Horoscope calculations and all other application functions must require an online connection. This is an application/PWA behavior change, not merely a hosting change. This infrastructure PR changes backend URLs but deliberately does not claim that the existing browser-side calculation modules or service-worker offline caches have already been converted to online-only. That change must be implemented and acceptance-tested separately so offline precache assets are not accidentally broken or older cached pages continue serving local calculations.

## Architecture notes

- OCI Always Free A1 uses ARM64. `sweph` is a native Node N-API module; if no compatible prebuild is available, npm builds it and therefore needs Python/make/g++. See [sweph package guidance](https://www.npmjs.com/package/sweph).
- The repository includes `@sparticuz/chromium`, whose npm package contains x64 binaries; for an ARM64 Chromium smoke-test runtime, use `@sparticuz/chromium-min` plus an ARM64 pack or prepare a separately validated compatible runtime. See [Chromium ARM64 notes](https://github.com/Sparticuz/chromium#frequently-asked-questions).
- Do not change `package.json`/Chromium dependency versions as part of the infrastructure-only migration without a dedicated architecture test.
