import test from 'node:test';
import assert from 'node:assert/strict';
import { handleRequest } from '../cloudflare/wallet-api/src/index.mjs';

const makeRequest = (path, { method = 'GET', origin, headers = {} } = {}) => {
  const merged = new Headers(headers);
  if (origin) merged.set('Origin', origin);
  return new Request('https://smvastro-wallet-api-staging.workers.dev' + path, {
    method,
    headers: merged
  });
};

const env = {
  ALLOWED_ORIGINS: 'https://smvastroservices.in,https://smv-astro-phase1-browser-staging.onrender.com'
};

test('health endpoint needs no Firebase or Cloudflare secret', async () => {
  const response = await handleRequest(makeRequest('/healthz'));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    service: 'smvastro-wallet-api',
    runtime: 'cloudflare-workers',
    walletDomainActive: false,
    businessRoutesEnabled: false
  });
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
});

test('readiness fails closed when the D1 binding is absent', async () => {
  const response = await handleRequest(makeRequest('/api/wallet/v1/readiness'));
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.ready, false);
  assert.equal(body.checks.d1Binding, false);
  assert.equal(body.walletDomainActive, false);
});

test('readiness requires the schema metadata row', async () => {
  const db = {
    prepare(sql) {
      assert.match(sql, /smv_wallet_schema_meta/);
      return {
        bind(id) {
          assert.equal(id, 'primary');
          return { async first() { return { schema_version: '0001_wallet_live_domain' }; } };
        }
      };
    }
  };
  const response = await handleRequest(makeRequest('/api/wallet/v1/readiness'), { ...env, DB: db });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ready, true);
  assert.equal(body.schemaVersion, '0001_wallet_live_domain');
  assert.equal(body.businessRoutesEnabled, false);
});

test('schema errors are sanitized and do not expose D1 internals', async () => {
  const db = {
    prepare() {
      return { bind() { return { async first() { throw new Error('private database detail'); } }; } };
    }
  };
  const response = await handleRequest(makeRequest('/api/wallet/v1/readiness'), { ...env, DB: db });
  assert.equal(response.status, 503);
  assert.equal(JSON.stringify(await response.json()).includes('private database detail'), false);
});

test('wallet business endpoints remain disabled even if an operator sets a cutover-like variable', async () => {
  let statements = 0;
  const db = { prepare() { statements++; throw new Error('must not be called'); } };
  const response = await handleRequest(
    makeRequest('/api/wallet/v1/wallet/balance'),
    { ...env, DB: db, SMV_WALLET_CLOUDFLARE_ACTIVE: 'true' }
  );
  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, 'WALLET_DOMAIN_NOT_CUT_OVER');
  assert.equal(statements, 0);
});

test('exact-origin CORS allows configured origin and rejects unconfigured origin', async () => {
  const allowed = await handleRequest(makeRequest('/healthz', { origin: 'https://smvastroservices.in' }), env);
  assert.equal(allowed.status, 200);
  assert.equal(allowed.headers.get('Access-Control-Allow-Origin'), 'https://smvastroservices.in');

  const blocked = await handleRequest(makeRequest('/healthz', { origin: 'https://attacker.invalid' }), env);
  assert.equal(blocked.status, 403);
});

test('preflight and unknown routes have explicit responses', async () => {
  const preflight = await handleRequest(makeRequest('/api/wallet/v1/session', {
    method: 'OPTIONS',
    origin: 'https://smvastroservices.in'
  }), env);
  assert.equal(preflight.status, 204);

  const unknown = await handleRequest(makeRequest('/not-a-route'));
  assert.equal(unknown.status, 404);
});
