import test from 'node:test';
import assert from 'node:assert/strict';
import { createRazorpayProviderVerificationProbe } from '../src/razorpay-connectivity-probe.mjs';

test('provider verification is derived from the real successful read-only Razorpay probe', async () => {
  let calls = 0;
  let clock = 1_000;
  const getStatus = createRazorpayProviderVerificationProbe({
    razorpay: {
      async testConnection() {
        calls += 1;
        return { ok: true, visibleOrders: 3 };
      }
    },
    mode: 'live',
    credentialsConfigured: true,
    now: () => clock,
    cacheTtlMs: 30_000
  });

  const first = await getStatus();
  const cached = await getStatus();

  assert.equal(calls, 1);
  assert.equal(first.connected, true);
  assert.equal(first.connectionVerified, true);
  assert.equal(first.mode, 'live');
  assert.equal(first.ordersVisible, 3);
  assert.equal(first.operation, 'GET /orders?count=1');
  assert.equal(first.checkedAt, new Date(1_000).toISOString());
  assert.deepEqual(cached, first);
});

test('readiness verification fails closed and sanitizes provider errors', async () => {
  const getStatus = createRazorpayProviderVerificationProbe({
    razorpay: {
      async testConnection() {
        throw Object.assign(new Error('private upstream response'), {
          code: 'RAZORPAY_REQUEST_REJECTED',
          httpStatus: 502
        });
      }
    },
    mode: 'test',
    credentialsConfigured: true,
    now: () => 2_000
  });

  const status = await getStatus();
  assert.equal(status.connected, false);
  assert.equal(status.connectionVerified, false);
  assert.equal(status.code, 'RAZORPAY_REQUEST_REJECTED');
  assert.equal(JSON.stringify(status).includes('private upstream response'), false);
});

test('missing credentials do not contact Razorpay and remain unverified', async () => {
  let calls = 0;
  const getStatus = createRazorpayProviderVerificationProbe({
    razorpay: { async testConnection() { calls += 1; return { visibleOrders: 0 }; } },
    mode: 'disabled',
    credentialsConfigured: false
  });

  const status = await getStatus();
  assert.equal(calls, 0);
  assert.equal(status.connected, false);
  assert.equal(status.connectionVerified, false);
  assert.equal(status.code, 'RAZORPAY_CREDENTIALS_NOT_CONFIGURED');
});

test('forced Admin checks bypass the short readiness cache', async () => {
  let calls = 0;
  const getStatus = createRazorpayProviderVerificationProbe({
    razorpay: { async testConnection() { calls += 1; return { visibleOrders: calls }; } },
    mode: 'live',
    credentialsConfigured: true,
    now: () => 3_000,
    cacheTtlMs: 30_000
  });

  const first = await getStatus();
  const forced = await getStatus({ force: true });

  assert.equal(calls, 2);
  assert.equal(first.ordersVisible, 1);
  assert.equal(forced.ordersVisible, 2);
});

test('concurrent readiness requests share one provider probe', async () => {
  let calls = 0;
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const getStatus = createRazorpayProviderVerificationProbe({
    razorpay: {
      async testConnection() {
        calls += 1;
        await gate;
        return { visibleOrders: 1 };
      }
    },
    mode: 'live',
    credentialsConfigured: true
  });

  const first = getStatus();
  const second = getStatus();
  release();
  const [a, b] = await Promise.all([first, second]);

  assert.equal(calls, 1);
  assert.deepEqual(a, b);
});
