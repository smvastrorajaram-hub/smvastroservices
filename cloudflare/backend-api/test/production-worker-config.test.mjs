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
  assert.equal(config.vars.ALLOWED_ORIGINS, 'https://smvastroservices.in');
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

test('Production Worker enables D1 Wallet, Razorpay Live and Live/Booking routes, not D1 Identity', () => {
  assert.equal(config.vars.SMV_BACKEND_CLOUDFLARE_ACTIVE, 'true');
  assert.equal(config.vars.SMV_WALLET_DOMAIN_BACKFILL_COMPLETE, 'true');
  assert.equal(config.vars.SMV_WALLET_DOMAIN_CUTOVER_COMPLETE, 'true');
  assert.equal(config.vars.WALLET_READ_ROUTES_ENABLED, 'true');
  assert.equal(config.vars.SMV_LIVE_SESSION_ROUTES_ENABLED, 'true');
  assert.equal(config.vars.SMV_RAZORPAY_LIVE_MODE_ENABLED, 'true');
  assert.equal(config.vars.SMV_RAZORPAY_TEST_MODE_ENABLED, 'false');
  assert.equal(config.vars.SMV_IDENTITY_PROFILE_D1_AUTHORIZATION_ENABLED, 'false');
  assert.equal(config.vars.SMV_WALLET_BACKFILL_TOOLS_ENABLED, 'false');
  assert.equal(config.workers_dev, true);
  assert.equal(config.preview_urls, false);
  assert.equal(config.routes, undefined);
});

test('Production frontend keeps Cloudflare financial routing opt-in until Worker deployment has been verified', () => {
  const html = fs.readFileSync(path.join(root, '..', '..', 'public', 'index.html'), 'utf8');
  const frontend = fs.readFileSync(path.join(root, '..', '..', 'public', 'smvastro.mjs'), 'utf8');
  const publicContent = fs.readFileSync(path.join(root, '..', '..', 'public', 'public-content.mjs'), 'utf8');
  assert.match(html, /SMV_CLOUDFLARE_FINANCIAL_API_ENABLED\s*=\s*false/);
  assert.match(frontend, /SMV_CLOUDFLARE_FINANCIAL_API_ENABLED\s*===\s*true/);
  assert.match(frontend, /smvastroservices\.astroservices\.workers\.dev/);
  assert.match(frontend, /live\/push/);
  assert.match(publicContent, /FINANCIAL_BACKEND\s*=\s*window\.SMV_CLOUDFLARE_FINANCIAL_API_ENABLED===true/);
});
