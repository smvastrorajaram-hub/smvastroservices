# SMV ASTRO — Cloudflare Worker Staging (தமிழ்)

## தனிமைப்படுத்தல்

- Worker: `smv-astro-api-staging`
- D1 database: `smv-astro-staging-db`
- Git branch: `feat/cloudflare-worker-d1-staging-20261030`
- Project root: `cloudflare/smv-astro-api-staging`
- `APP_ENV=staging` இல்லாமல் Worker இயங்காது.
- இந்த starter Production Firebase, Razorpay, Wallet, Live Call/Chat அல்லது Horoscope சேவைகளுடன் இணைக்கப்படவில்லை.
- Production Pages project மற்றும் Render backend மாற்றப்படவில்லை.

## முக்கியம்: D1 முதலில் உருவாக்கப்பட வேண்டும்

Cloudflare Dashboard → Workers & Pages → D1 SQL Database → Create database.

Database name: `smv-astro-staging-db`

Location hint: `APAC` (இது location hint மட்டுமே; data residency உத்தரவாதம் அல்ல).

கொடுக்கப்பட்ட Database ID-ஐ Wrangler configuration-ல் சேர்த்துள்ளோம். இது user வழங்கிய ID மட்டுமே; Cloudflare API access இல்லாததால் database-ன் இருப்பு, பெயர் அல்லது location-ஐ இன்னும் remote-ஆக verify செய்யவில்லை. Deployment-க்கு முன் Cloudflare Dashboard-ல் ID `smv-astro-staging-db` என்ற பெயருடன் பொருந்துகிறதா என்பதை உறுதிப்படுத்த வேண்டும்.

## Worker-ஐ GitHub-உடன் இணைத்தல்

D1 ID கிடைத்து Wrangler config-இல் சேர்க்கப்பட்ட பிறகு:

1. Workers & Pages → Create application → GitHub.
2. Repository: `smvastrorajaram-hub/smvastroservices`.
3. Branch: `feat/cloudflare-worker-d1-staging-20261030`.
4. Worker name: `smv-astro-api-staging`.
5. Root directory: `cloudflare/smv-astro-api-staging`.
6. Build command: `npm install --no-audit --no-fund && npm run check`.
7. Deploy command: `npx wrangler d1 migrations apply smv-astro-staging-db --remote && npx wrangler deploy`.
8. Workers Builds API token: Cloudflare auto-generated token option பயன்படுத்தலாம்; தனியாக முழு Account API token பகிர வேண்டாம்.

இந்த branch-ஐ இந்த Worker-க்கான deployment branch ஆக மட்டும் தேர்ந்தெடுக்கவும். Pages project-ன் Production branch `main` மாற்றப்படக்கூடாது.

## Runtime secret

Worker உருவானதும் Settings → Variables & Secrets பகுதியில் `STAGING_ADMIN_TOKEN` என்ற Secret சேர்க்கவும். குறைந்தது 32 random characters கொண்ட தனிப்பட்ட secret உருவாக்கி password manager-ல் சேமிக்கவும். அதன் value-ஐ ChatGPT அல்லது GitHub source file-ல் இட வேண்டாம்.

## Smoke-test routes

- `GET /healthz`
- `GET /api/v1/staging/manifest`
- `GET /api/v1/staging/db-check`
- `POST /api/v1/staging/probe` — Bearer secret தேவை.

D1 binding மற்றும் migration முடியும் வரை DB-check/probe 503 வழங்குவது எதிர்பார்க்கப்படும் fail-closed நடத்தை.

## நிறுத்தப்பட்டுள்ள அம்சங்கள்

Firebase Auth, Wallet, Razorpay, live call/chat, Horoscope calculations, PDF rendering, production data import. இவற்றில் எதுவும் இந்த staging scaffold-ல் செயல்படுத்தப்படவில்லை.
