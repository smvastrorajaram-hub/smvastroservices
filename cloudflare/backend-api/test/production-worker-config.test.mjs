import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'wrangler.production.jsonc'), 'utf8'));

test('Production Worker uses the exact requested Worker name, D1 ID, Firebase Project 1 and Origin', () => {
  assert.equal(config.name, 'smvastroservices');
  assert.equal(config.vars.SMV_PUBLIC_BACKEND_URL, 'https://smvastroservices.astroservices.workers.dev');
  assert.equal(config.vars.SMV_ENVIRONMENT, 'production');
  assert.equal(config.vars.FIREBASE_PROJECT_ID, 'smv-astro');
  assert.equal(config.vars.FIREBASE_AUTH_PROJECT_IDS, 'smv-astro');
  assert.equal(config.vars.ALLOWED_ORIGINS, 'https://smvastroservices.in,https://smvastroservices.pages.dev');
  assert.equal(config.observability.enabled, true);
  assert.equal(config.observability.logs.invocation_logs, true);
  assert.equal(config.observability.logs.head_sampling_rate, 1);
  assert.deepEqual(config.d1_databases, [{
    binding: 'DB',
    database_name: 'smvastro-wallet-production',
    database_id: 'b1d5684c-3fcd-48fe-9571-ea41fc605c7d',
    migrations_dir: 'migrations'
  }]);
});

test('Production Worker enables D1 Identity authorization for the explicitly approved fresh start', () => {
  assert.equal(config.vars.SMV_BACKEND_CLOUDFLARE_ACTIVE, 'true');
  assert.equal(config.vars.SMV_WALLET_DOMAIN_BACKFILL_COMPLETE, 'true');
  assert.equal(config.vars.SMV_WALLET_DOMAIN_CUTOVER_COMPLETE, 'true');
  assert.equal(config.vars.WALLET_READ_ROUTES_ENABLED, 'true');
  assert.equal(config.vars.SMV_LIVE_SESSION_ROUTES_ENABLED, 'true');
  assert.equal(config.vars.SMV_RAZORPAY_LIVE_MODE_ENABLED, 'true');
  assert.equal(config.vars.SMV_RAZORPAY_TEST_MODE_ENABLED, 'false');
  assert.equal(config.vars.SMV_IDENTITY_PROFILE_CUTOVER_COMPLETE, 'true');
  assert.equal(config.vars.SMV_IDENTITY_PROFILE_D1_AUTHORIZATION_ENABLED, 'true');
  assert.equal(config.vars.SMV_IDENTITY_PROFILE_PRODUCTION_AUTHORIZATION_APPROVED, 'true');
  assert.equal(config.vars.SMV_IDENTITY_PROFILE_FRESH_START_APPROVED, 'true');
  assert.equal(config.vars.SMV_IDENTITY_PROFILE_BACKFILL_ENABLED, 'false');
  assert.equal(config.vars.SMV_WALLET_BACKFILL_TOOLS_ENABLED, 'false');
  assert.equal(config.workers_dev, true);
  assert.equal(config.preview_urls, false);
  assert.equal(config.routes, undefined);
});

test('Production deploy workflow provisions and validates Firebase Project 1 credentials without logging values', () => {
  const workflow = fs.readFileSync(path.join(root, '..', '..', '.github', 'workflows', 'cloudflare-backend-api-production-deploy.yml'), 'utf8');
  assert.match(workflow, /Sync Firebase Project 1 service account into Production Worker/);
  assert.match(workflow, /FIREBASE_SERVICE_ACCOUNT_JSON:\s*\$\{\{ secrets\.FIREBASE_SERVICE_ACCOUNT_JSON \}\}/);
  assert.match(workflow, /FIREBASE_PRODUCTION_SERVICE_ACCOUNT_JSON/);
  assert.match(workflow, /FIREBASE_PROJECT_1_SERVICE_ACCOUNT_JSON/);
  assert.match(workflow, /project_id !== 'smv-astro'/);
  assert.match(workflow, /secret put FIREBASE_SERVICE_ACCOUNT_JSON/);
  // Production deploy must fail closed unless Firebase Project 1 and every
  // financial feature gate report ready/enabled on the actual Worker revision.
  assert.match(workflow, /d\.backendActive!==true/);
  assert.match(workflow, /d\.firebaseConnected!==true/);
  assert.match(workflow, /d\.walletReadRoutesRegistered!==true/);
  assert.match(workflow, /d\.walletRechargeRoutesRegistered!==true/);
  assert.match(workflow, /d\.walletRechargeMode!=='live'/);
  assert.match(workflow, /d\.liveSessionRoutesRegistered!==true/);
  assert.match(workflow, /d\.razorpayMode!=='live'/);
  assert.match(workflow, /d\.walletRechargeRoutesEnabled!==true/);
  assert.match(workflow, /d\.liveCallChatRoutesEnabled!==true/);
});

test('Production diagnostic probe Workers have separate names and cannot bind Production D1', () => {
  const native = JSON.parse(fs.readFileSync(path.join(root, 'wrangler.native-probe.jsonc'), 'utf8'));
  const express = JSON.parse(fs.readFileSync(path.join(root, 'wrangler.express-probe.jsonc'), 'utf8'));
  assert.equal(native.name, 'smvastroservices-native-probe');
  assert.equal(express.name, 'smvastroservices-http-probe');
  assert.equal(native.d1_databases, undefined);
  assert.equal(express.d1_databases, undefined);
  assert.equal(native.durable_objects, undefined);
  assert.equal(express.durable_objects, undefined);
});

test('Production frontend enables Cloudflare financial routing after Worker deployment is configured', () => {
  const html = fs.readFileSync(path.join(root, '..', '..', 'public', 'index.html'), 'utf8');
  const frontend = fs.readFileSync(path.join(root, '..', '..', 'public', 'smvastro.mjs'), 'utf8');
  const publicContent = fs.readFileSync(path.join(root, '..', '..', 'public', 'public-content.mjs'), 'utf8');
  assert.match(html, /SMV_CLOUDFLARE_FINANCIAL_API_ENABLED\s*=\s*true/);
  assert.match(frontend, /SMV_CLOUDFLARE_FINANCIAL_API_ENABLED\s*===\s*true/);
  assert.match(frontend, /smvastroservices\.astroservices\.workers\.dev/);
  assert.match(frontend, /live\/push/);
  assert.match(publicContent, /FINANCIAL_BACKEND\s*=\s*window\.SMV_CLOUDFLARE_FINANCIAL_API_ENABLED===true/);
});
