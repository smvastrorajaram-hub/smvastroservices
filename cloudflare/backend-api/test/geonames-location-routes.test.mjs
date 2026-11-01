import test from 'node:test';
import assert from 'node:assert/strict';
import { registerGeoNamesRoutes } from '../src/geonames-location-routes.mjs';

function harness() {
  const handlers = new Map();
  return {
    handlers,
    get(path, handler) { handlers.set('GET ' + path, handler); }
  };
}

function response() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) { this.statusCode = code; return this; },
    set(name, value) {
      if (typeof name === 'object') Object.assign(this.headers, name);
      else this.headers[name] = value;
      return this;
    },
    json(body) { this.body = body; return this; }
  };
}

function request(query = {}) {
  return { query };
}

function jsonResponse(body, ok = true) {
  return { ok, async json() { return body; } };
}

test('status endpoint never exposes the GeoNames username', () => {
  const app = harness();
  registerGeoNamesRoutes({ app, env: { GEONAMES_USERNAME: 'server-only-user' } });
  const res = response();
  app.handlers.get('GET /api/locations/status')({}, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    ok: true, configured: true, provider: 'GeoNames', timezone: 'timezoneJSON'
  });
  assert.equal(JSON.stringify(res.body).includes('server-only-user'), false);
});

test('unconfigured and demo GeoNames accounts fail closed without upstream requests', async () => {
  for (const username of ['', 'demo', 'DeMo']) {
    const app = harness();
    let calls = 0;
    registerGeoNamesRoutes({
      app,
      env: { GEONAMES_USERNAME: username },
      fetchImpl: async () => { calls += 1; return jsonResponse({ geonames: [] }); }
    });
    const res = response();
    await app.handlers.get('GET /api/locations/search')(request({ q: 'Chennai' }), res);
    assert.equal(res.statusCode, 503);
    assert.equal(res.body.configured, false);
    assert.equal(calls, 0);
  }
});

test('location search validates inputs and clamps result count', async () => {
  const app = harness();
  let calledUrl = null;
  registerGeoNamesRoutes({
    app,
    env: { GEONAMES_USERNAME: 'private-user' },
    fetchImpl: async url => {
      calledUrl = new URL(url);
      return jsonResponse({ geonames: [] });
    }
  });

  const short = response();
  await app.handlers.get('GET /api/locations/search')(request({ q: 'x' }), short);
  assert.equal(short.statusCode, 400);

  const res = response();
  await app.handlers.get('GET /api/locations/search')(request({ q: 'Chennai', limit: '999', lang: 'ta' }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(calledUrl.searchParams.get('username'), 'private-user');
  assert.equal(calledUrl.searchParams.get('maxRows'), '70');
  assert.equal(calledUrl.searchParams.get('lang'), 'ta');
  assert.deepEqual(res.body, { ok: true, provider: 'GeoNames', rows: [] });
});

test('location search returns only validated coordinates and bounded fields', async () => {
  const app = harness();
  registerGeoNamesRoutes({
    app,
    env: { GEONAMES_USERNAME: 'server-user' },
    fetchImpl: async () => jsonResponse({
      geonames: [
        { name: 'Chennai', adminName1: 'Tamil Nadu', countryName: 'India', lat: '13.08', lng: '80.27', countryCode: 'IN', geonameId: 1264527 },
        { name: 'Invalid', lat: '120', lng: '80' },
        { name: '', lat: '13', lng: '80' }
      ]
    })
  });
  const res = response();
  await app.handlers.get('GET /api/locations/search')(request({ q: 'Chennai' }), res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.rows, [{
    place: 'Chennai, Tamil Nadu, India',
    name: 'Chennai',
    admin1: 'Tamil Nadu',
    country: 'India',
    latitude: 13.08,
    longitude: 80.27,
    countryCode: 'IN',
    geonameId: 1264527,
    timezone: '',
    timezoneSource: 'geonames-pending'
  }]);
});

test('identical searches share the cached upstream response', async () => {
  const app = harness();
  let calls = 0;
  registerGeoNamesRoutes({
    app,
    env: { GEONAMES_USERNAME: 'cache-user' },
    fetchImpl: async () => {
      calls += 1;
      return jsonResponse({ geonames: [] });
    }
  });
  for (let index = 0; index < 2; index += 1) {
    const res = response();
    await app.handlers.get('GET /api/locations/search')(request({ q: 'Perambalur' }), res);
    assert.equal(res.statusCode, 200);
  }
  assert.equal(calls, 1);
});

test('timezone endpoint validates coordinates and returns only an IANA zone', async () => {
  const app = harness();
  let calledUrl = null;
  registerGeoNamesRoutes({
    app,
    env: { GEONAMES_USERNAME: 'timezone-user' },
    fetchImpl: async url => {
      calledUrl = new URL(url);
      return jsonResponse({
        timezoneId: 'Asia/Kolkata',
        countryCode: 'IN',
        rawOffset: 5.5,
        dstOffset: 5.5
      });
    }
  });

  const invalid = response();
  await app.handlers.get('GET /api/locations/timezone')(request({ lat: '91', lng: '80' }), invalid);
  assert.equal(invalid.statusCode, 400);

  const res = response();
  await app.handlers.get('GET /api/locations/timezone')(request({ lat: '11.23', lng: '78.88' }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(calledUrl.searchParams.get('username'), 'timezone-user');
  assert.deepEqual(res.body, {
    ok: true,
    timezoneId: 'Asia/Kolkata',
    timezone: 'Asia/Kolkata',
    timezoneSource: 'geonames-timezoneJSON',
    countryCode: 'IN'
  });
  assert.equal('rawOffset' in res.body, false);
  assert.equal('dstOffset' in res.body, false);
});

test('invalid provider timezone and upstream failure are reported without leaking provider data', async () => {
  const app = harness();
  registerGeoNamesRoutes({
    app,
    env: { GEONAMES_USERNAME: 'failure-user' },
    fetchImpl: async () => jsonResponse({ timezoneId: 'not-a-zone' })
  });
  const invalidZone = response();
  await app.handlers.get('GET /api/locations/timezone')(request({ lat: '0', lng: '0' }), invalidZone);
  assert.equal(invalidZone.statusCode, 502);
  assert.equal(invalidZone.body.code, 'GEONAMES_INVALID_TIMEZONE');

  const failingApp = harness();
  registerGeoNamesRoutes({
    app: failingApp,
    env: { GEONAMES_USERNAME: 'failure-user' },
    fetchImpl: async () => { throw new Error('secret upstream detail'); }
  });
  const failed = response();
  await failingApp.handlers.get('GET /api/locations/search')(request({ q: 'London' }), failed);
  assert.equal(failed.statusCode, 502);
  assert.equal(failed.body.code, 'GEONAMES_UPSTREAM');
  assert.equal(JSON.stringify(failed.body).includes('secret upstream detail'), false);
});
