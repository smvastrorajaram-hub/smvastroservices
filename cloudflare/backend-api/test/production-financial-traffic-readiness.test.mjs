import test from 'node:test';
import assert from 'node:assert/strict';
import { isProductionFinancialTrafficRoutingEnabled } from '../src/production-financial-traffic-readiness.mjs';

const readyState = Object.freeze({
  environment: 'production',
  backendActive: true,
  schemaReady: true,
  firebaseConnected: true,
  walletReadRoutesEnabled: true,
  walletRechargeRoutesEnabled: true,
  walletRechargeMode: 'live',
  walletOfferRoutesEnabled: true,
  liveCallChatRoutesEnabled: true,
  identityProfileD1AuthorizationEnabled: true,
  identityProfileD1AuthorizationReady: true,
  razorpayMode: 'live',
  razorpayCredentialsConfigured: true,
  razorpayProviderConnectionVerified: true
});

test('selected Production financial routing reports enabled only when every live route and dependency is ready', () => {
  assert.equal(isProductionFinancialTrafficRoutingEnabled(readyState), true);
});

test('selected Production financial routing fails closed when any required route or dependency is unavailable', () => {
  for (const [key, value] of Object.entries(readyState)) {
    assert.equal(isProductionFinancialTrafficRoutingEnabled({ ...readyState, [key]: false }), false, key);
    if (typeof value === 'string') {
      assert.equal(isProductionFinancialTrafficRoutingEnabled({ ...readyState, [key]: 'disabled' }), false, key);
    }
  }
});

test('selected Production financial routing never reports enabled for staging or development', () => {
  assert.equal(isProductionFinancialTrafficRoutingEnabled({ ...readyState, environment: 'staging' }), false);
  assert.equal(isProductionFinancialTrafficRoutingEnabled({ ...readyState, environment: 'development' }), false);
});
