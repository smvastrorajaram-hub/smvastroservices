import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = resolve(root, '../..');

function readJsonc(path) {
  const source = readFileSync(path, 'utf8')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/,\s*([}\]])/g, '$1');
  return JSON.parse(source);
}

const preview = readJsonc(resolve(root, 'wrangler.jsonc'));
const staging = readJsonc(resolve(root, 'wrangler.staging.jsonc'));
const production = readJsonc(resolve(root, 'wrangler.production.jsonc'));
const workerPackage = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const repoRootPreview = readJsonc(resolve(repo, 'wrangler.jsonc'));
const rootPackage = JSON.parse(readFileSync(resolve(repo, 'package.json'), 'utf8'));
const { removeWorkersIncompatibleBrowserAliases } = await import('../../../scripts/fix-cloudflare-iconv-lite.mjs');

test('root install applies the narrow iconv-lite Node stream compatibility patch for Worker bundling', () => {
  assert.equal(rootPackage.scripts.postinstall, 'node scripts/fix-cloudflare-iconv-lite.mjs');
  const legacyIconv = { name: 'iconv-lite', version: '0.4.24', browser: { './lib/extend-node': false, './lib/streams': false } };
  assert.equal(removeWorkersIncompatibleBrowserAliases(legacyIconv), true);
  assert.equal(legacyIconv.browser, undefined);
  const newerIconv = { name: 'iconv-lite', version: '0.7.0', browser: { stream: false } };
  assert.equal(removeWorkersIncompatibleBrowserAliases(newerIconv), true);
  assert.equal(newerIconv.browser, undefined);
  const unrelated = { name: 'other-package', browser: { stream: false } };
  assert.equal(removeWorkersIncompatibleBrowserAliases(unrelated), false);
  assert.deepEqual(unrelated.browser, { stream: false });
});

test('repository-root Worker Preview shim keeps root-based Preview Builds on Staging resources', () => {
  assert.equal(repoRootPreview.name, 'smvastroservices');
  assert.equal(repoRootPreview.main, './cloudflare/backend-api/src/index.mjs');
  assert.equal(repoRootPreview.vars.SMV_ENVIRONMENT, 'staging');
  assert.equal(repoRootPreview.vars.FIREBASE_AUTH_PROJECT_IDS, 'smv-astro-staging');
  assert.equal(repoRootPreview.d1_databases[0].database_name, 'smvastro-wallet-staging');
  assert.equal(repoRootPreview.d1_databases[0].database_id, '0ddb87a9-8a16-4e39-a806-c9137c64959a');
  assert.ok(repoRootPreview.previews && typeof repoRootPreview.previews === 'object');
  assert.equal(repoRootPreview.previews.vars.SMV_ENVIRONMENT, 'staging');
  assert.equal(repoRootPreview.previews.d1_databases[0].database_id, '0ddb87a9-8a16-4e39-a806-c9137c64959a');
  assert.ok(!JSON.stringify(repoRootPreview).includes('b1d5684c-3fcd-48fe-9571-ea41fc605c7d'), 'Root Preview config must never reference Production D1');
  assert.equal(repoRootPreview.preview_urls, false);
});

test('Workers Builds Preview uses a pinned Wrangler version that supports Worker Previews', () => {
  assert.equal(workerPackage.devDependencies?.wrangler, '4.158.0');
  const [major, minor] = workerPackage.devDependencies.wrangler.split('.').map(Number);
  assert.ok(major > 4 || (major === 4 && minor >= 135), 'Worker Previews require Wrangler 4.135.0 or later');
});

test('Workers Builds default Preview config matches the connected Worker but uses staging-only resources', () => {
  assert.equal(preview.name, 'smvastroservices');
  assert.equal(preview.vars.SMV_ENVIRONMENT, 'staging');
  assert.equal(preview.vars.SMV_BACKEND_CLOUDFLARE_ACTIVE, 'false');
  assert.equal(preview.vars.FIREBASE_AUTH_PROJECT_IDS, 'smv-astro-staging');
  assert.equal(preview.d1_databases[0].database_name, 'smvastro-wallet-staging');
  assert.equal(preview.d1_databases[0].database_id, '0ddb87a9-8a16-4e39-a806-c9137c64959a');
  assert.equal(preview.d1_databases[0].migrations_dir, undefined);
  assert.ok(preview.previews && typeof preview.previews === 'object');
  assert.equal(preview.previews.vars.SMV_ENVIRONMENT, 'staging');
  assert.equal(preview.previews.vars.FIREBASE_AUTH_PROJECT_IDS, 'smv-astro-staging');
  assert.equal(preview.previews.d1_databases[0].database_name, 'smvastro-wallet-staging');
  assert.equal(preview.previews.d1_databases[0].database_id, '0ddb87a9-8a16-4e39-a806-c9137c64959a');
  assert.deepEqual(
    preview.previews.durable_objects.bindings.map(binding => binding.name),
    ['LIVE_SESSION_COORDINATOR', 'LIVE_USER_EVENT_HUB']
  );
  assert.ok(!JSON.stringify(preview.previews).includes('b1d5684c-3fcd-48fe-9571-ea41fc605c7d'),
    'Preview bindings must never reference Production D1');
});

test('Dedicated staging config continues to target the isolated staging Worker and D1', () => {
  assert.equal(staging.name, 'smvastro-backend-api-staging');
  assert.equal(staging.vars.SMV_ENVIRONMENT, 'staging');
  assert.equal(staging.vars.FIREBASE_AUTH_PROJECT_IDS, 'smv-astro-staging');
  assert.equal(staging.d1_databases[0].database_name, 'smvastro-wallet-staging');
  assert.equal(staging.d1_databases[0].database_id, '0ddb87a9-8a16-4e39-a806-c9137c64959a');
});

test('Production deploy config alone targets the Production Firebase project and Production D1', () => {
  assert.equal(production.name, 'smvastroservices');
  assert.equal(production.vars.SMV_ENVIRONMENT, 'production');
  assert.equal(production.vars.FIREBASE_PROJECT_ID, 'smv-astro');
  assert.equal(production.vars.FIREBASE_AUTH_PROJECT_IDS, 'smv-astro');
  assert.equal(production.d1_databases[0].database_name, 'smvastro-wallet-production');
  assert.equal(production.d1_databases[0].database_id, 'b1d5684c-3fcd-48fe-9571-ea41fc605c7d');
  assert.equal(production.d1_databases[0].migrations_dir, 'migrations');
});

test('Staging-only scripts and docs explicitly name the staging config', () => {
  const contract = readFileSync(resolve(repo, '.github/workflows/cloudflare-backend-api-contract-tests.yml'), 'utf8');
  const verifier = readFileSync(resolve(root, 'test/verify-d1-staging-migration-compatibility.mjs'), 'utf8');
  const identityDoc = readFileSync(resolve(root, 'IDENTITY-PROFILE-BACKFILL.md'), 'utf8');
  const livePushTest = readFileSync(resolve(repo, 'test/live-push-notifications.test.js'), 'utf8');
  assert.ok(contract.includes('--config wrangler.staging.jsonc'));
  assert.ok(!contract.includes('--config wrangler.jsonc'));
  assert.ok(verifier.includes("'wrangler.staging.jsonc'"));
  assert.ok(identityDoc.includes('cloudflare/backend-api/wrangler.staging.jsonc'));
  assert.ok(livePushTest.includes("read('cloudflare/backend-api/wrangler.staging.jsonc')"));
});

test('Full Production secret and D1 deployment remains manual, avoiding duplicate deploys on main pushes', () => {
  const workflow = readFileSync(resolve(repo, '.github/workflows/cloudflare-backend-api-production-deploy.yml'), 'utf8');
  assert.match(workflow, /^on:\n  workflow_dispatch:\s*$/m);
  assert.doesNotMatch(workflow, /^  push:/m);
  assert.ok(workflow.includes('secret put FIREBASE_SERVICE_ACCOUNT_JSON'));
  assert.ok(workflow.includes('d1 migrations apply smvastro-wallet-production --remote'));
  assert.ok(workflow.includes('deploy --config cloudflare/backend-api/wrangler.production.jsonc'));
});

test('Workers Builds process is documented with Preview and Production commands', () => {
  const doc = readFileSync(resolve(root, 'CLOUDFLARE-WORKERS-BUILDS.md'), 'utf8');
  assert.ok(doc.includes('cloudflare/backend-api'));
  assert.ok(doc.includes('SKIP_DEPENDENCY_INSTALL=1'));
  assert.ok(doc.includes('npx --yes wrangler@4.158.0 preview --config wrangler.jsonc'));
  assert.ok(doc.includes('wrangler.production.jsonc'));
  assert.ok(doc.includes('wrangler.staging.jsonc'));
});

test('Workers Builds Dashboard configuration is documented separately for Production and Preview', () => {
  const doc = readFileSync(resolve(root, 'CLOUDFLARE-WORKERS-BUILDS.md'), 'utf8');
  assert.match(doc, /\| Root directory \| `cloudflare\/backend-api` \|/);
  assert.match(doc, /\| Build command \| `npm install --ignore-scripts --no-audit --no-fund` \|/);
  assert.match(doc, /\| Deploy command \| `npx wrangler deploy --config wrangler\.production\.jsonc` \|/);
  assert.match(doc, /\| Root directory \| `\/` \(repository root\) \|/);
  assert.match(doc, /\| Build command \| `npm install --no-audit --no-fund` \|/);
  assert.match(doc, /\| Preview command \| `npx --yes wrangler@4\.158\.0 preview --config wrangler\.jsonc` \|/);
  assert.doesNotMatch(doc, /Preview command[\s\S]{0,100}cloudflare\/backend-api\/wrangler\.jsonc/);
  assert.match(doc, /must not use `--ignore-scripts`/);
});

test('Cloudflare contract tests are triggered by every repository-root Preview input', () => {
  const workflow = readFileSync(resolve(repo, '.github/workflows/cloudflare-backend-api-contract-tests.yml'), 'utf8');
  for (const path of [
    'wrangler.jsonc',
    'package.json',
    'package-lock.json',
    'scripts/fix-cloudflare-iconv-lite.mjs'
  ]) {
    const occurrences = workflow.split(`      - "${path}"`).length - 1;
    assert.equal(occurrences.length, 2, `${path} must trigger both pull_request and push contract checks.`);
  }
});
