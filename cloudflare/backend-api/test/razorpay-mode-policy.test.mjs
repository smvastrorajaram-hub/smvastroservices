import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveRazorpayMode } from '../../../shared/backend-platform/razorpay-mode-policy.mjs';

const credentials = {
  keySecret: 'fixture-secret-not-a-real-credential',
  webhookSecret: 'fixture-webhook-not-a-real-credential'
};

test('staging accepts only Test Mode credentials', () => {
  assert.deepEqual(
    resolveRazorpayMode({ environment: 'staging', keyId: 'rzp_test_fixture', ...credentials }),
    { enabled: true, mode: 'test', reason: 'test_mode_allowed' }
  );
  assert.equal(
    resolveRazorpayMode({ environment: 'staging', keyId: 'rzp_live_fixture', ...credentials }).enabled,
    false
  );
});

test('Production Live Mode requires production environment and its explicit enable flag', () => {
  const disabled = resolveRazorpayMode({
    environment: 'production', keyId: 'rzp_live_fixture', ...credentials
  });
  assert.deepEqual(disabled, {
    enabled: false, mode: 'disabled', reason: 'live_mode_requires_production_flag'
  });
  const enabled = resolveRazorpayMode({
    environment: 'production', keyId: 'rzp_live_fixture',
    allowProductionLive: true, ...credentials
  });
  assert.deepEqual(enabled, {
    enabled: true, mode: 'live', reason: 'production_live_mode_explicitly_enabled'
  });
});

test('Production does not silently accept Test Mode credentials', () => {
  assert.equal(
    resolveRazorpayMode({ environment: 'production', keyId: 'rzp_test_fixture', ...credentials }).enabled,
    false
  );
  assert.equal(
    resolveRazorpayMode({
      environment: 'production', keyId: 'rzp_test_fixture',
      allowProductionTest: true, ...credentials
    }).mode,
    'test'
  );
});

test('missing secrets, malformed prefixes and cross-environment live keys fail closed', () => {
  for (const input of [
    { environment: 'production', keyId: 'rzp_live_fixture', keySecret: 'secret' },
    { environment: 'production', keyId: 'rzp_live_fixture', webhookSecret: 'webhook' },
    { environment: 'staging', keyId: 'rzp_live_fixture', allowProductionLive: true, ...credentials },
    { environment: 'development', keyId: 'rzp_test_fixture', ...credentials },
    { environment: 'production', keyId: 'rzp_unknown_fixture', ...credentials }
  ]) {
    assert.equal(resolveRazorpayMode(input).enabled, false);
  }
});
