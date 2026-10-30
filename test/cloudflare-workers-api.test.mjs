import test from 'node:test';
import assert from 'node:assert/strict';
import { handleRequest } from '../cloudflare/workers-api/src/index.mjs';

const makeRequest = (path, { method = 'GET', origin, headers = {} } = {}) => {
  const merged = new Headers(headers);
  if (origin) merged.set('Origin', origin);
  return new Request(`https://smvastro-api-staging.workers.dev${path}`, { method, headers: merged });
};

const allowedEnv = {
  GEONAMES_USERNAME: 'smv-test-user',
  ALLOWED_ORIGINS: 'https://smvastroservices.in,https://horoscope.smvastroservices.in'
};

function noCache() {
  return {
    async match() { return null; },
    async put() {}
  };
}

test('health route is independent of all provider credentials', async () => {
  const response = await handleRequest(makeRequest('/healthz'));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    service: 'smvastro-cloudflare-api',
    runtime: 'cloudflare-workers'
  });
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
});

test('GeoNames status reports configuration but never exposes the username', async () => {
  const response = await handleRequest(makeRequest('/api/locations/status'), allowedEnv);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.configured, true);
  assert.equal(body.provider, 'GeoNames');
  assert.equal(JSON.stringify(body).includes('smv-test-user'), false);

  const missing = await handleRequest(makeRequest('/api/locations/status'), {});
  assert.equal((await missing.json()).configured, false);
});

test('search validates input before calling GeoNames', async () => {
  let calls = 0;
  const response = await handleRequest(
    makeRequest('/api/locations/search?q=x'),
    allowedEnv,
    {},
    { fetchImpl: async () => { calls++; throw new Error('must not call'); }, cache: noCache() }
  );
  assert.equal(response.status, 400);
  assert.equal(calls, 0);
});

test('worldwide search preserves the existing SMV response shape and hides provider credentials', async () => {
  let upstream;
  const response = await handleRequest(
    makeRequest('/api/locations/search?q=Madurai&limit=5&lang=ta', { origin: 'https://smvastroservices.in' }),
    allowedEnv,
    {},
    {
      cache: noCache(),
      fetchImpl: async (url, init) => {
        upstream = new URL(url);
        assert.equal(init.method, 'GET');
        assert.equal(init.headers.Accept, 'application/json');
        return new Response(JSON.stringify({ geonames: [
          { name: 'Madurai', adminName1: 'Tamil Nadu', countryName: 'India', lat: '9.9252', lng: '78.1198', countryCode: 'IN', geonameId: 1264527 },
          { name: 'Bad row', lat: '999', lng: '12' }
        ] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
    }
  );
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://smvastroservices.in');
  assert.equal(upstream.hostname, 'secure.geonames.org');
  assert.equal(upstream.pathname, '/searchJSON');
  assert.equal(upstream.searchParams.get('username'), 'smv-test-user');
  assert.equal(upstream.searchParams.get('lang'), 'ta');
  assert.equal(body.rows.length, 1);
  assert.deepEqual(body.rows[0], {
    place: 'Madurai, Tamil Nadu, India',
    name: 'Madurai',
    admin1: 'Tamil Nadu',
    country: 'India',
    latitude: 9.9252,
    longitude: 78.1198,
    countryCode: 'IN',
    geonameId: 1264527,
    timezone: '',
    timezoneSource: 'geonames-pending'
  });
  assert.equal(JSON.stringify(body).includes('smv-test-user'), false);
});

test('timezone lookup returns only the IANA timezone ID, not a current DST offset', async () => {
  let upstream;
  const response = await handleRequest(
    makeRequest('/api/locations/timezone?lat=9.9252&lng=78.1198'),
    allowedEnv,
    {},
    {
      cache: noCache(),
      fetchImpl: async url => {
        upstream = new URL(url);
        return new Response(JSON.stringify({ timezoneId: 'Asia/Kolkata', countryCode: 'IN', dstOffset: 5.5, rawOffset: 5.5 }), { status: 200 });
      }
    }
  );
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(upstream.pathname, '/timezoneJSON');
  assert.equal(body.timezoneId, 'Asia/Kolkata');
  assert.equal(body.timezoneSource, 'geonames-timezoneJSON');
  assert.equal('dstOffset' in body, false);
  assert.equal('rawOffset' in body, false);
});

test('timezone validates coordinates and does not call the provider on invalid input', async () => {
  let calls = 0;
  const response = await handleRequest(
    makeRequest('/api/locations/timezone?lat=91&lng=78'),
    allowedEnv,
    {},
    { fetchImpl: async () => { calls++; throw new Error('must not call'); }, cache: noCache() }
  );
  assert.equal(response.status, 400);
  assert.equal(calls, 0);
});

test('unconfigured GeoNames returns a safe 503 response', async () => {
  const response = await handleRequest(makeRequest('/api/locations/search?q=Madurai'), {});
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.configured, false);
  assert.equal(body.error.includes('undefined'), false);
});

test('upstream failures are sanitized and do not echo secret or provider details', async () => {
  const response = await handleRequest(
    makeRequest('/api/locations/search?q=Madurai'),
    allowedEnv,
    {},
    {
      cache: noCache(),
      fetchImpl: async () => new Response(JSON.stringify({ status: { message: 'smv-test-user internal error' } }), { status: 200 })
    }
  );
  assert.equal(response.status, 502);
  const body = await response.text();
  assert.equal(body.includes('smv-test-user'), false);
  assert.equal(body.includes('internal error'), false);
});

test('CORS rejects unknown origins and allows configured origins only', async () => {
  const denied = await handleRequest(makeRequest('/healthz', { origin: 'https://evil.example' }), allowedEnv);
  assert.equal(denied.status, 403);
  const allowed = await handleRequest(makeRequest('/healthz', { origin: 'https://smvastroservices.in' }), allowedEnv);
  assert.equal(allowed.status, 200);
  assert.equal(allowed.headers.get('Access-Control-Allow-Origin'), 'https://smvastroservices.in');
});

test('OPTIONS preflight and unsupported methods are handled explicitly', async () => {
  const preflight = await handleRequest(makeRequest('/api/locations/search', { method: 'OPTIONS', origin: 'https://smvastroservices.in' }), allowedEnv);
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('Access-Control-Allow-Methods'), 'GET, OPTIONS');
  const post = await handleRequest(makeRequest('/api/locations/search', { method: 'POST' }), allowedEnv);
  assert.equal(post.status, 405);
});

test('unknown paths return 404 without touching upstream services', async () => {
  let calls = 0;
  const response = await handleRequest(makeRequest('/wallet'), allowedEnv, {}, {
    fetchImpl: async () => { calls++; throw new Error('must not call'); }
  });
  assert.equal(response.status, 404);
  assert.equal(calls, 0);
});
