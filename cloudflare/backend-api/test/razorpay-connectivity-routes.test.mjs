import test from 'node:test';
import assert from 'node:assert/strict';
import { registerRazorpayConnectivityRoute } from '../src/razorpay-connectivity-routes.mjs';

function harness() {
  const handlers = new Map();
  return { handlers, get(path, handler) { handlers.set('GET ' + path, handler); } };
}
function response() {
  return {
    statusCode: 200, headers: {}, body: null,
    status(code) { this.statusCode = code; return this; },
    set(name, value) {
      if (typeof name === 'object') Object.assign(this.headers, name);
      else this.headers[name] = value;
      return this;
    },
    json(body) { this.body = body; return this; }
  };
}
function request(authorization = 'Bearer valid-admin-token') {
  return { get(name) { return String(name).toLowerCase() === 'authorization' ? authorization : ''; } };
}

test('Razorpay connectivity is Admin-only and reports a successful read-only provider probe', async () => {
  const app = harness();
  let calls = 0;
  registerRazorpayConnectivityRoute({
    app,
    identityService: { async authenticateAuthorization() { return { uid: 'admin-1', role: 'admin', isAdmin: true }; } },
    razorpay: { async testConnection() { calls += 1; return { ok: true, visibleOrders: 2 }; } },
    mode: 'test',
    keyId: 'rzp_test_secret-prefix',
    credentialsConfigured: true
  });
  const res = response();
  await app.handlers.get('GET /test-razorpay')(request(), res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    ok: true, connectionVerified: true, provider: 'razorpay', mode: 'test',
    keyPrefix: 'rzp_test_', operation: 'GET /orders?count=1', readOnly: true,
    ordersVisible: 2, message: 'Razorpay test credentials were accepted by the provider.'
  });
  assert.equal(calls, 1);
});

test('Razorpay connectivity rejects Customer users without contacting the provider', async () => {
  const app = harness();
  let calls = 0;
  registerRazorpayConnectivityRoute({
    app,
    identityService: { async authenticateAuthorization() { return { uid: 'customer-1', role: 'customer', isAdmin: false }; } },
    razorpay: { async testConnection() { calls += 1; return { visibleOrders: 0 }; } },
    mode: 'test', keyId: 'rzp_test_key', credentialsConfigured: true
  });
  const res = response();
  await app.handlers.get('GET /test-razorpay')(request(), res);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.code, 'ADMIN_REQUIRED');
  assert.equal(calls, 0);
});

test('Razorpay connectivity refuses missing credentials and does not probe', async () => {
  const app = harness();
  let calls = 0;
  registerRazorpayConnectivityRoute({
    app,
    identityService: { async authenticateAuthorization() { return { uid: 'admin-1', role: 'admin', isAdmin: true }; } },
    razorpay: { async testConnection() { calls += 1; return { visibleOrders: 0 }; } },
    mode: 'disabled', keyId: '', credentialsConfigured: false
  });
  const res = response();
  await app.handlers.get('GET /test-razorpay')(request(), res);
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.code, 'RAZORPAY_CREDENTIALS_NOT_CONFIGURED');
  assert.equal(calls, 0);
});

test('Razorpay provider failure is sanitized and never exposes upstream details', async () => {
  const app = harness();
  registerRazorpayConnectivityRoute({
    app,
    identityService: { async authenticateAuthorization() { return { uid: 'admin-1', role: 'admin', isAdmin: true }; } },
    razorpay: { async testConnection() { throw Object.assign(new Error('secret provider details'), { code: 'RAZORPAY_REQUEST_REJECTED', httpStatus: 502 }); } },
    mode: 'live', keyId: 'rzp_live_secret', credentialsConfigured: true
  });
  const res = response();
  await app.handlers.get('GET /test-razorpay')(request(), res);
  assert.equal(res.statusCode, 502);
  assert.equal(res.body.connectionVerified, false);
  assert.equal(res.body.code, 'RAZORPAY_REQUEST_REJECTED');
  assert.equal(JSON.stringify(res.body).includes('secret provider details'), false);
});
