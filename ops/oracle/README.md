# Oracle Cloud backend deployment (Draft)

This directory prepares the **SMV ASTRO Node backend** to run on an Oracle Cloud Infrastructure (OCI) Compute VM. It does not provision an OCI instance, copy secrets, change DNS, update frontends, switch Firebase projects, or stop Render. Those are separate cutover actions and must happen only after a successful staging verification.

## Architecture and safety

- Runs the existing `server.js` backend in a non-root Node 22 container.
- Exposes port `10000` on VM loopback only; use Nginx/Caddy for HTTPS and WebSocket/proxy handling. Never open port 10000 to the Internet.
- `/healthz` performs no Firestore read, so the process health check does not spend Firebase quota. It does not prove Firebase, Razorpay, email, wallet, or live-session end-to-end functionality.
- Keeps the repository's `ephe/` data and `public/` application assets in the image. The Docker ignore file intentionally does **not** exclude Swiss Ephemeris files or public location-search datasets.
- On ARM64 (OCI Ampere A1), HTML-to-PDF rendering uses `@sparticuz/chromium-min` and the pinned upstream ARM64 pack URL below. On x86_64 it uses the existing `@sparticuz/chromium` package.
- The Firebase primary project stays authoritative. Keep paired-read gates, wallet-domain cutover flags and replica mirror flags disabled until their backfills, rules and reconciliation have been reviewed. Do not copy Render environment secrets into Git.

Current OCI/Docker references: [Oracle Always Free resources](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm), [OCI security lists](https://docs.oracle.com/en-us/iaas/Content/Network/Concepts/securitylists.htm), and [Docker Engine on Ubuntu](https://docs.docker.com/engine/install/ubuntu/).

## 1. Prepare the VM

Use an OCI Compute VM in the tenancy's home region. Check the current free-tier availability and resource allowance in the Oracle documentation; instance capacity is not guaranteed. The Oracle docs describe up to two AMD `VM.Standard.E2.1.Micro` VMs and an Ampere A1 free allowance equivalent to 2 OCPUs/12 GB RAM when used within the published monthly limits.

Create a non-root administrator account, add your own SSH public key through OCI, and restrict inbound SSH (TCP 22) to your own known IP. Permit public TCP 80/443 only if serving HTTPS. Configure both the OCI Network Security Group/security list and the VM firewall. Do not post or commit a private key.

Install Docker Engine and the Docker Compose plugin using the official Docker instructions for your VM's Ubuntu version. Confirm that `docker --version` and `docker compose version` work.

## 2. Copy the source and configure secrets

On the VM, clone this repository and check out this Draft PR branch only for testing:

```sh
git clone https://github.com/smvastrorajaram-hub/smvastroservices.git
cd smvastroservices
git fetch origin feature/oracle-cloud-backend-deployment-20261030
git checkout feature/oracle-cloud-backend-deployment-20261030
```

Create the environment file locally on the VM; never commit it:

```sh
install -d -m 700 ops/oracle
install -m 600 /dev/null ops/oracle/backend.env
nano ops/oracle/backend.env
```

Copy the required backend values from the trusted secret manager / existing configuration yourself. At minimum, confirm `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` match the intended **staging** Firebase project for initial verification. The backend accepts a private key with escaped `\\n` sequences, which its existing initialization normalizes. Also carry over only the exact email, admin identity, mail, Razorpay, and other settings needed for the chosen test environment. Do not paste secrets into chat, issues, pull requests or shell history.

For ARM64 PDF support, add this public (not secret) pinned upstream URL to `backend.env`:

```dotenv
CHROMIUM_PACK_URL=https://github.com/Sparticuz/chromium/releases/download/v153.0.0/chromium-v153.0.0-pack.arm64.tar
```

Only set the ARM URL for an ARM64 host. The matching upstream release provides an ARM64 pack; the URL must stay aligned with the package version `153.0.0`.

**Initial smoke tests must use Firebase staging and Razorpay Test Mode.** Do not enable production wallet cutover, replica failover or paired mirror flags for this deployment just to make it start. Keep all of them unset/false until the paired replica work has been corrected, backfilled and validated. Never use production payment keys in the first deployment test.

## 3. Build and start

From the repository root on the VM:

```sh
docker compose -f ops/oracle/compose.yaml config
docker compose -f ops/oracle/compose.yaml build --pull
docker compose -f ops/oracle/compose.yaml up -d
docker compose -f ops/oracle/compose.yaml ps
docker compose -f ops/oracle/compose.yaml logs --tail=200 smv-astro-api
curl --fail http://127.0.0.1:10000/healthz
```

Expected liveness response: `{"status":"ok"}`. If the container is unhealthy, inspect the logs. Do not work around startup failures by disabling Firebase credential checks or changing application authentication.

## 4. TLS and hostname

After the container reports healthy, configure a hostname such as `api.smvastroservices.in` to point to the OCI VM's reserved public IP, and terminate HTTPS at Nginx or Caddy. Keep the API upstream at `http://127.0.0.1:10000`. Restrict the VM/OCI ingress rules to SSH from your IP and public HTTP/HTTPS only. The frontend API-base URL and DNS must be changed in a later, separately reviewed cutover; this PR does not do that.

## 5. Verification checklist before any traffic cutover

1. `/healthz` responds and container remains healthy after restart.
2. Server logs show the intended Firebase project ID; customer login/register, session persistence and role routing pass.
3. Location search works online; horoscope calculation and all other backend features are tested online. Do not rely on offline location data for horoscope calculation.
4. Test password/email flows, reports/PDF generation (including Tamil), admin/astrologer/customer dashboards and saved reports.
5. In Razorpay Test Mode, test recharge, webhook signature validation, wallet ledger, booking/call/chat billing and failed-call refund paths. Validate that no Firebase secondary project becomes authoritative unexpectedly.
6. Test live Call/Chat signaling, microphone permission and disconnect/reconnect paths from the supported browser/PWA/Android clients.
7. Compare request errors, Firestore usage, latency and memory against the existing service for a controlled staging session.

Only after every applicable test passes should a **separate** cutover change point frontend API URLs and DNS at the agreed time. Keep Render available as rollback until Oracle traffic and payment/session tests are proven stable; do not delete or stop Render as part of this PR.

## Rollback

Restore frontend API routing/DNS to the known-good backend. Leave the Oracle VM up for log review, and keep Firebase flags/secrets unchanged. Do not replay wallet or payment writes manually while changing routes.

## Known limitations of this Draft

- No Oracle VM was provisioned and no SSH/deployment credential was available to this workflow; deployment must still be run and verified on the actual tenancy.
- The container image build and source tests are CI checks, not a live Oracle deployment.
- This PR deliberately does not change Cloudinary, Firebase security rules or data, frontend hosting, Render environment settings, production Razorpay keys, Android signing workflow, or SMV HOROSCOPE/SMV CALENDAR sources.
