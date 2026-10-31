import test from 'node:test';
import assert from 'node:assert/strict';
import { LEGACY_BACKEND_ROUTE_INVENTORY, isLegacyBackendPath } from '../../../shared/backend-platform/legacy-backend-route-inventory.mjs';

test('legacy route inventory remains exactly 144 unique method/path pairs', () => {
  assert.equal(LEGACY_BACKEND_ROUTE_INVENTORY.length, 144);
  assert.equal(LEGACY_BACKEND_ROUTE_INVENTORY.filter(route => route.method === 'GET').length, 54);
  assert.equal(LEGACY_BACKEND_ROUTE_INVENTORY.filter(route => route.method === 'POST').length, 90);
  assert.equal(new Set(LEGACY_BACKEND_ROUTE_INVENTORY.map(route => route.method + ' ' + route.path)).size, 144);
});

test('known literal legacy paths are recognized', () => {
  for (const path of ['/wallet', '/wallet/transactions', '/live/events', '/live/pricing', '/create-order', '/razorpay/webhook', '/api/locations/search']) {
    assert.equal(isLegacyBackendPath(path), true, path);
  }
});

test('parameterized legacy route paths match one non-empty path segment', () => {
  assert.equal(isLegacyBackendPath('/live/sessions/session-123/messages'), true);
  assert.equal(isLegacyBackendPath('/live/sessions/session-123/signals'), true);
  assert.equal(isLegacyBackendPath('/admin/refund-trace/q_123'), true);
  assert.equal(isLegacyBackendPath('/admin/withdrawal-payout/withdrawal-1'), true);
  assert.equal(isLegacyBackendPath('/live/sessions//messages'), false);
});

test('root and trailing slash behavior is stable', () => {
  assert.equal(isLegacyBackendPath('/'), true);
  assert.equal(isLegacyBackendPath('/wallet/'), true);
});

test('unknown non-legacy paths remain distinguishable for 404 responses', () => {
  for (const path of ['/unknown', '/healthz-extra', '/live/not-a-real-route', '/wallet-extra']) {
    assert.equal(isLegacyBackendPath(path), false, path);
  }
});
