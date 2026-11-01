import assert from 'node:assert/strict';
import { appendFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { LEGACY_BACKEND_ROUTE_INVENTORY } from '../../shared/backend-platform/legacy-backend-route-inventory.mjs';

const ROOT = process.cwd();
const PRODUCTION_CONFIG = path.join(ROOT, '.github/config/wrangler.production.jsonc');
const ROUTE_FILES = [
  'cloudflare/backend-api/src/index.mjs',
  'cloudflare/backend-api/src/wallet-read-routes.mjs',
  'cloudflare/backend-api/src/wallet-offer-routes.mjs',
  'cloudflare/backend-api/src/wallet-recharge-routes.mjs',
  'cloudflare/backend-api/src/live-session-routes.mjs',
  'cloudflare/backend-api/src/wallet-domain-backfill-routes.mjs',
  'cloudflare/backend-api/src/identity-profile-backfill-routes.mjs',
  'cloudflare/backend-api/src/core-read-routes.mjs'
];
const BASELINE = Object.freeze({
  inventoryRoutes: 149,
  getRoutes: 55,
  postRoutes: 94,
  uniquePairs: 149,
  sourceHandlerPairs: 53,
  exactLegacyMatches: 40,
  missingLegacyHandlers: 109
});
const PRODUCTION_DATABASE_ID = 'b1d5684c-3fcd-48fe-9571-ea41fc605c7d';

function pair(route) {
  return route.method + ' ' + route.path;
}

function parseSourceRoutes(source, file) {
  const results = [];
  const routePattern = /\bapp\.(get|post|put|patch|delete|options|all)\(\s*(['"`])([^'"`]+)\2/g;
  let match;
  while ((match = routePattern.exec(source)) !== null) {
    results.push({
      method: match[1].toUpperCase(),
      path: match[3],
      file
    });
  }
  return results;
}

async function main() {
  const inventory = [...LEGACY_BACKEND_ROUTE_INVENTORY];
  const inventoryPairs = inventory.map(pair);
  const getRoutes = inventory.filter(route => route.method === 'GET').length;
  const postRoutes = inventory.filter(route => route.method === 'POST').length;
  assert.equal(inventory.length, BASELINE.inventoryRoutes, 'Legacy route inventory count changed; refresh the audit.');
  assert.equal(getRoutes, BASELINE.getRoutes, 'GET route count changed; refresh the audit.');
  assert.equal(postRoutes, BASELINE.postRoutes, 'POST route count changed; refresh the audit.');
  assert.equal(new Set(inventoryPairs).size, inventory.length, 'Duplicate legacy method/path pair found.');

  const sources = await Promise.all(ROUTE_FILES.map(async file => ({
    file,
    source: await readFile(path.join(ROOT, file), 'utf8')
  })));
  const sourceRoutes = sources.flatMap(item => parseSourceRoutes(item.source, item.file));
  const sourcePairs = new Set(sourceRoutes.map(pair));
  const uniqueSourcePairs = new Set(sourceRoutes.map(pair));
  const exactMatches = inventory.filter(route => sourcePairs.has(pair(route)));
  const missing = inventory.filter(route => !sourcePairs.has(pair(route)));
  assert.equal(sourceRoutes.length, BASELINE.sourceHandlerPairs, 'Worker route handler definition count changed; refresh the audit.');
  assert.equal(uniqueSourcePairs.size, sourceRoutes.length, 'Duplicate literal Worker route handler found.');
  assert.equal(exactMatches.length, BASELINE.exactLegacyMatches, 'Worker route parity changed; update the route matrix.');
  assert.equal(missing.length, BASELINE.missingLegacyHandlers, 'Missing legacy handler count changed; update the route matrix.');

  const config = JSON.parse(await readFile(PRODUCTION_CONFIG, 'utf8'));
  assert.equal(config.name, 'smvastroservices', 'Unexpected production Worker name.');
  assert.equal(config.vars?.SMV_ENVIRONMENT, 'production', 'Production environment variable mismatch.');
  assert.equal(config.d1_databases?.length, 1, 'Production config must have exactly one D1 binding.');
  assert.equal(config.d1_databases[0]?.binding, 'DB', 'Unexpected production D1 binding name.');
  assert.equal(config.d1_databases[0]?.database_name, 'smvastro-wallet-production', 'Production D1 name mismatch.');
  assert.equal(config.d1_databases[0]?.database_id, PRODUCTION_DATABASE_ID, 'Production D1 ID mismatch.');

  const expectedFalseFlags = [
    'SMV_BACKEND_CLOUDFLARE_ACTIVE',
    'SMV_WALLET_BACKFILL_TOOLS_ENABLED',
    'SMV_WALLET_DOMAIN_QUIESCED',
    'SMV_WALLET_DOMAIN_CUTOVER_COMPLETE',
    'SMV_IDENTITY_PROFILE_BACKFILL_ENABLED',
    'SMV_IDENTITY_PROFILE_CUTOVER_COMPLETE',
    'SMV_IDENTITY_PROFILE_D1_AUTHORIZATION_ENABLED',
    'SMV_LIVE_SESSION_ROUTES_ENABLED',
    'SMV_RAZORPAY_LIVE_MODE_ENABLED',
    'SMV_RAZORPAY_TEST_MODE_ENABLED'
  ];
  for (const key of expectedFalseFlags) {
    assert.equal(String(config.vars?.[key] ?? 'false').toLowerCase(), 'false',
      'Production business flag must remain disabled: ' + key);
  }
  assert.equal(String(config.vars?.SMV_IDENTITY_PROFILE_BACKFILL_PREVIEW_ONLY).toLowerCase(), 'true',
    'Identity/Profile backfill must stay preview-only in Production.');
  assert.equal(config.vars?.FIREBASE_AUTH_PROJECT_IDS, 'smv-astro',
    'Production Firebase project allowlist must remain scoped to smv-astro.');
  assert.ok(!Object.hasOwn(config.vars || {}, 'RAZORPAY_KEY_ID'),
    'Do not put Razorpay credentials in the plain-text Production Worker config.');

  const index = sources.find(item => item.file === 'cloudflare/backend-api/src/index.mjs')?.source || '';
  const recharge = sources.find(item => item.file === 'cloudflare/backend-api/src/wallet-recharge-routes.mjs')?.source || '';
  const live = sources.find(item => item.file === 'cloudflare/backend-api/src/live-session-routes.mjs')?.source || '';
  const razorpayPolicy = await readFile(path.join(ROOT, 'shared/backend-platform/razorpay-mode-policy.mjs'), 'utf8');
  assert.ok(index.includes('resolveRazorpayMode') &&
            index.includes('SMV_RAZORPAY_LIVE_MODE_ENABLED') &&
            index.includes('SMV_BACKEND_CLOUDFLARE_ACTIVE') &&
            razorpayPolicy.includes('id.startsWith(LIVE_PREFIX)') &&
            razorpayPolicy.includes("env === 'production' && allowProductionLive === true"),
    'Razorpay Live Mode must require the explicit Production-only policy and active backend gate.');
  assert.equal(String(config.vars?.SMV_RAZORPAY_LIVE_MODE_ENABLED).toLowerCase(), 'false',
    'Production Razorpay Live Mode must remain disabled by configuration.');
  assert.equal(String(config.vars?.SMV_RAZORPAY_TEST_MODE_ENABLED).toLowerCase(), 'false',
    'Production Razorpay Test Mode must remain disabled by configuration.');
  assert.ok(live.includes("environment!=='staging'") && live.includes("sourceProjectId!=='smv-astro-staging'"),
    'Live/Booking environment fence changed; re-review before any production enablement.');
  assert.ok(index.includes('isLegacyBackendPath(req.path)') &&
            index.includes('BACKEND_MIGRATION_NOT_CUT_OVER'),
    'Legacy API fail-closed guard is missing.');
  assert.ok(recharge.includes('verifyWebhookSignature') &&
            recharge.includes('verifyPaymentSignature') &&
            recharge.includes("view.status !== 'captured'"),
    'Razorpay signature/captured-status checks changed; re-review before route enablement.');

  const summary = {
    audit: 'SMV ASTRO Cloudflare Production Backend Audit',
    workerName: config.name,
    productionDatabase: config.d1_databases[0].database_name,
    productionDatabaseId: config.d1_databases[0].database_id,
    legacyRoutes: inventory.length,
    legacyGetRoutes: getRoutes,
    legacyPostRoutes: postRoutes,
    workerLiteralHandlerPairs: sourceRoutes.length,
    exactLegacyMethodPathMatches: exactMatches.length,
    legacyPairsWithoutMatchingWorkerHandler: missing.length,
    productionBusinessRouteFamiliesEnabled: 0,
    productionTrafficEnabled: false,
    razorpayCurrentRegistrationMode: 'environment-aware; Production Live Mode requires explicit flag and active backend gate; Production flags remain false',
    liveBookingCurrentEnvironmentFence: 'staging-only / smv-astro-staging',
    productionD1MigrationApplied: false
  };

  console.log('CLOUDFLARE_PRODUCTION_BACKEND_AUDIT_PASS');
  console.log(JSON.stringify(summary, null, 2));
  console.log('Handler-matched legacy routes:');
  for (const route of exactMatches) console.log('  ' + pair(route));
  console.log('Legacy routes still fail-closed with no matching Worker handler:');
  for (const route of missing) console.log('  ' + pair(route));

  const markdown = [
    '## Cloudflare Production Backend route audit',
    '',
    '| Check | Result |',
    '|---|---:|',
    '| Legacy route method/path pairs | ' + inventory.length + ' |',
    '| Exact Worker handler matches (source only, not production-enabled) | ' + exactMatches.length + ' |',
    '| Legacy pairs without a matching Worker handler | ' + missing.length + ' |',
    '| Production business route families enabled | 0 |',
    '| Production traffic switch | false |',
    '| Production D1 migration/data writes by this audit | 0 |',
    '',
    'Status: **PASS — current safety fences verified; parity remains incomplete by design.**',
    'Production Worker: `https://smvastroservices.astroservices.workers.dev`',
    'Production D1: `smvastro-wallet-production` (' + PRODUCTION_DATABASE_ID + ')',
    'This job performs source/config inspection only. It does not contact Cloudflare, deploy, migrate, import data, or change traffic.',
    ''
  ].join('\n');

  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, markdown, 'utf8');
  }
}

await main();
