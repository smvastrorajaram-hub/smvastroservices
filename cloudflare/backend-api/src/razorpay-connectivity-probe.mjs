'use strict';

const DEFAULT_CACHE_TTL_MS = 30_000;
const SAFE_ERROR_CODES = new Set([
  'RAZORPAY_REQUEST_REJECTED',
  'RAZORPAY_UPSTREAM_UNAVAILABLE',
  'RAZORPAY_RESPONSE_INVALID',
  'RAZORPAY_CONNECTIVITY_CHECK_FAILED'
]);

function createStatus({ connected, mode, checkedAt, ordersVisible = null, code = null }) {
  return Object.freeze({
    connected: connected === true,
    connectionVerified: connected === true,
    mode,
    operation: 'GET /orders?count=1',
    checkedAt,
    ordersVisible,
    code
  });
}

/**
 * Shares a short-lived, read-only Razorpay provider probe across Worker routes.
 * A forced Admin connectivity check bypasses the cache; readiness endpoints
 * reuse a recent result or perform the same real provider GET themselves.
 */
export function createRazorpayProviderVerificationProbe({
  razorpay,
  mode = 'disabled',
  credentialsConfigured = false,
  now = () => Date.now(),
  cacheTtlMs = DEFAULT_CACHE_TTL_MS
} = {}) {
  const normalizedMode = String(mode || 'disabled').trim().toLowerCase();
  const ttl = Number.isFinite(Number(cacheTtlMs))
    ? Math.max(0, Number(cacheTtlMs))
    : DEFAULT_CACHE_TTL_MS;
  let cached = null;
  let inFlight = null;

  function timestamp() {
    const value = Number(now());
    return new Date(Number.isFinite(value) ? value : Date.now()).toISOString();
  }

  async function getStatus({ force = false } = {}) {
    const currentTime = Number(now());
    if (!force && cached && currentTime < cached.expiresAt) return cached.value;
    if (inFlight) return inFlight;

    inFlight = (async () => {
      let status;
      if (credentialsConfigured !== true ||
          !['test', 'live'].includes(normalizedMode) ||
          !razorpay || typeof razorpay.testConnection !== 'function') {
        status = createStatus({
          connected: false,
          mode: normalizedMode,
          checkedAt: timestamp(),
          code: 'RAZORPAY_CREDENTIALS_NOT_CONFIGURED'
        });
      } else {
        try {
          const result = await razorpay.testConnection();
          const visibleOrders = Number(result?.visibleOrders);
          status = createStatus({
            connected: true,
            mode: normalizedMode,
            checkedAt: timestamp(),
            ordersVisible: Number.isSafeInteger(visibleOrders) && visibleOrders >= 0
              ? visibleOrders
              : null
          });
        } catch (error) {
          const candidate = String(error?.code || '');
          status = createStatus({
            connected: false,
            mode: normalizedMode,
            checkedAt: timestamp(),
            code: SAFE_ERROR_CODES.has(candidate)
              ? candidate
              : 'RAZORPAY_CONNECTIVITY_CHECK_FAILED'
          });
        }
      }

      const completedAt = Number(now());
      cached = {
        value: status,
        expiresAt: (Number.isFinite(completedAt) ? completedAt : Date.now()) + ttl
      };
      return status;
    })();

    try {
      return await inFlight;
    } finally {
      inFlight = null;
    }
  }

  return getStatus;
}
