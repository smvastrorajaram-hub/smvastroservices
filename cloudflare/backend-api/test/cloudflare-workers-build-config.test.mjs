import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = resolve(root, '../..');

function readJsonc(path) {
  const source = readFileSync(path, 'utf8').replace(/^\s*\/\/.*$/gm, '');
  return JSON.parse(source);
}

const preview = readJsonc(resolve(root, 'wrangler.jsonc'));
const staging = readJsonc(resolve(root, 'wrangler.staging.jsonc'));
const production = readJsonc(resolve(root, 'wrangler.production.jsonc'));

test('Workers Builds default Preview config matches the connected Worker but uses staging-only resources', () => {
  assert.equal(preview.name, 'smvastroservices');
  assert.equal(preview.vars.SMV_ENVIRONMENT, 'staging');
  assert.equal(preview.vars.SMV_BACKEND_CLOUDFLARE_ACTIVE, 'false');
  assert.equal(preview.vars.FIREBASE_AUTH_PROJECT_IDS, 'smv-astro-staging');
  assert.equal(preview.d1_databases[0].database_name, 'smvastro-wallet-staging');
  assert.equal(preview.d1_databases[0].database_id, '0ddb87a9-8a16-4e39-a806-c9137c64959a');
  assert.equal(preview.d1_databases[0].migrations_dir, undefined);
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
  assert.ok(doc.includes('npx wrangler preview'));
  assert.ok(doc.includes('wrangler.production.jsonc'));
  assert.ok(doc.includes('wrangler.staging.jsonc'));
});
