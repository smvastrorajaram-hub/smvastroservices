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

## Worker-ஐ முதலில் உருவாக்கி GitHub-உடன் இணைத்தல்

1. Cloudflare Dashboard → Workers & Pages → Create application → Create Worker; பெயர் `smv-astro-api-staging` என்று கொடுத்து Hello World Worker-ஐ உருவாக்குங்கள். `workers.dev` இயக்கப்பட்டிருக்கட்டும். இதனால் முதல் Worker-ஐ உருவாக்க தேவையான Admin அனுமதி Dashboard வழியாகப் பயன்படுத்தப்படும்.
2. அந்த Worker → Settings → Builds → Connect → GitHub.
3. Repository: `smvastrorajaram-hub/smvastroservices`.
4. இந்த Worker-ன் Production branch: `feat/cloudflare-worker-d1-staging-20261030` (இந்த Worker staging-only என்பதால் இதுவே சரியான branch; Pages Production branch `main` அப்படியே இருக்கும்).
5. Root directory: `cloudflare/smv-astro-api-staging`.
6. Build command: `npm run check`.
7. Deploy command: `npx wrangler deploy`.
8. Build token-க்கு இந்த Worker-ஐ deploy செய்ய Workers Editor permission வேண்டும். D1 binding-ஐ deploy செய்ய D1 product-க்கான தனி permission தேவையில்லை; ஆனால் remote D1 SQL/migration இயக்க தனி D1 permission தேவை. Default token-க்கு D1 permission இல்லை என்பதால் migration-ஐ தனியாக D1 Console-ல் இயக்கும் வழியும் கீழே தரப்பட்டுள்ளது.

இந்த branch-ஐ இந்த Worker-க்கான deployment branch ஆக மட்டும் தேர்ந்தெடுக்கவும். Pages project-ன் Production branch `main` மாற்றப்படக்கூடாது. Pages project-ல் PR preview build தோன்றலாம்; அது Pages Production `main` deployment அல்ல.

## D1 schema-வை Dashboard Console-ல் அமைத்தல் (Remote SQL)

Cloudflare Dashboard → Storage & databases → D1 → `smv-astro-staging-db` → Console. கீழே உள்ள SQL-ஐ இயக்கவும். இது staging probe table மற்றும் index மட்டும் உருவாக்கும்; production data எதையும் தொடாது:

\`\`\`sql
CREATE TABLE IF NOT EXISTS staging_probe_events (
  id TEXT PRIMARY KEY NOT NULL,
  probe_name TEXT NOT NULL CHECK (length(probe_name) BETWEEN 1 AND 40),
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_staging_probe_events_created_at
  ON staging_probe_events (created_at DESC);
\`\`\`

இந்த SQL idempotent; மீண்டும் இயக்கப்பட்டாலும் ஏற்கெனவே உள்ள table/index அழிக்கப்படாது.

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
