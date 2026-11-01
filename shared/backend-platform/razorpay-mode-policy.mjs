const TEST_PREFIX = 'rzp_test_';
const LIVE_PREFIX = 'rzp_live_';

/**
 * Fail-closed Razorpay key policy for the Cloudflare Worker.
 *
 * Staging may use Test Mode only. Production Live Mode requires a distinct
 * explicit flag in addition to the rzp_live_ key prefix and both server-only
 * secrets. Production Test Mode is disabled unless separately opted in.
 */
export function resolveRazorpayMode({
  environment,
  keyId,
  keySecret,
  webhookSecret,
  allowProductionLive = false,
  allowProductionTest = false
} = {}) {
  const env = String(environment || '').trim().toLowerCase();
  const id = String(keyId || '').trim();
  const secret = String(keySecret || '').trim();
  const webhook = String(webhookSecret || '');
  if (!id || !secret || !webhook) {
    return Object.freeze({ enabled: false, mode: 'disabled', reason: 'credentials_missing' });
  }

  if (id.startsWith(TEST_PREFIX)) {
    const allowed = env === 'staging' || (env === 'production' && allowProductionTest === true);
    return Object.freeze({
      enabled: allowed,
      mode: allowed ? 'test' : 'disabled',
      reason: allowed ? 'test_mode_allowed' : 'test_mode_not_allowed_in_environment'
    });
  }

  if (id.startsWith(LIVE_PREFIX)) {
    const allowed = env === 'production' && allowProductionLive === true;
    return Object.freeze({
      enabled: allowed,
      mode: allowed ? 'live' : 'disabled',
      reason: allowed ? 'production_live_mode_explicitly_enabled' : 'live_mode_requires_production_flag'
    });
  }

  return Object.freeze({ enabled: false, mode: 'disabled', reason: 'key_prefix_invalid' });
}
