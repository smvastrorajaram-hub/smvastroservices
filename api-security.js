'use strict';

const DEFAULT_ALLOWED_ORIGINS = Object.freeze([
  'https://smvastroservices.in',
  'https://www.smvastroservices.in',
  'https://smvastroservices.pages.dev',
  'https://horoscope.smvastroservices.in',
  'https://calendar.smvastroservices.in'
]);

// The only normal request that needs a large JSON body is astrologer registration,
// which carries its profile photo as a data URL. All other routes use a conservative
// default and explicit smaller limits where the route already defined one.
const BODY_LIMITS = Object.freeze({
  '/contact-query': '20kb',
  '/question-notify': '20kb',
  '/appointment-booking': '20kb',
  '/astrologer/availability': '5kb',
  '/admin/appointment-status': '5kb',
  '/admin/approve-question': '10kb',
  '/admin/reject-question': '10kb',
  '/admin/retry-refund': '10kb',
  '/customer/sync-refund': '10kb',
  '/admin/sync-refund': '10kb',
  '/astrologer/claim-question': '10kb',
  '/admin/reallocate-question': '10kb',
  '/admin/edit-question': '20kb',
  '/admin/takeover-answer': '30kb',
  '/astrologer/change-payout': '10kb',
  '/admin/payout-change-status': '5kb',
  '/admin/set-open-workflow': '10kb',
  '/customer/mark-answer-viewed': '10kb',
  '/customer/private-consultation/mark-viewed': '10kb',
  '/admin/astrologer-quiz/load-defaults': '10kb',
  '/admin/astrologer-quiz/questions': '50kb',
  '/admin/astrologer-quiz/questions/delete': '10kb',
  '/admin/astrologer-auto-approval/settings': '20kb',
  '/admin/astrologer-quiz/sync-google-form': '10kb',
  '/webhooks/google-form/astrologer-qualification': '20kb',
  '/admin/approve-astrologer': '10kb',
  '/admin/reject-astrologer': '10kb',
  '/astrologer/sync-approval': '5kb',
  '/admin/astrologer-profile-permission': '10kb',
  '/admin/astrologer-profile-description': '10kb',
  '/admin/content/save': '30kb',
  '/admin/content/toggle': '5kb',
  '/admin/content/delete': '5kb',
  '/admin/astrologer-languages': '10kb',
  '/admin/astrologer-pricing': '10kb',
  '/admin/private-consultation/set-commission': '5kb',
  '/admin/private-consultation/set-word-count': '5kb',
  '/admin/private-consultation/set-workflow': '5kb',
  '/admin/private-consultation/approve-question': '10kb',
  '/admin/private-consultation/reject-question': '10kb',
  '/admin/private-consultation/retry-refund': '10kb',
  '/admin/private-consultation/sync-refund': '10kb',
  '/astrologer/private-consultation/submit-answer': '30kb',
  '/admin/private-consultation/approve-answer': '10kb',
  '/admin/private-consultation/reject-answer': '10kb',
  '/private-consultation/create-order': '30kb',
  '/private-consultation/retry-payment': '10kb',
  '/private-consultation/cancel-payment': '10kb',
  '/private-consultation/cancel-payment': '10kb',
  '/private-consultation/recover-payment': '10kb',
  '/private-consultation/verify-payment': '15kb',
  '/admin/withdrawal-mark-paid': '5kb',
  '/admin/offers/save': '20kb',
  '/admin/offers/delete': '10kb'
});

function normalizePath(path) {
  const value = String(path || '/').split('?')[0];
  return value.length > 1 ? value.replace(/\/+$/, '') : '/';
}

function requestBodyLimit(path) {
  const normalized = normalizePath(path);
  if (normalized === '/razorpay/webhook') return null; // The raw webhook body must be verified separately.
  if (normalized === '/register-astrologer-profile') return '15mb';
  return BODY_LIMITS[normalized] || '1mb';
}

function parseConfiguredOrigins(value) {
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .map(item => {
      try {
        const parsed = new URL(item);
        if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) return null;
        if (parsed.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)) return null;
        return parsed.origin;
      } catch (_) {
        return null;
      }
    })
    .filter(Boolean);
}

function isAllowedOrigin(origin, configuredOrigins = process.env.ALLOWED_ORIGINS) {
  if (!origin) return true; // Server-to-server / CLI requests do not use browser CORS.
  let parsed;
  try {
    parsed = new URL(String(origin));
  } catch (_) {
    return false;
  }
  if (parsed.origin !== String(origin) || parsed.username || parsed.password) return false;
  const allowed = new Set([...DEFAULT_ALLOWED_ORIGINS, ...parseConfiguredOrigins(configuredOrigins)]);
  if (allowed.has(parsed.origin)) return true;
  if (parsed.protocol !== 'https:') return false;
  const host = parsed.hostname.toLowerCase();
  // First-party custom subdomains and previews under this site's own Pages namespace.
  return host === 'smvastroservices.in' ||
    host.endsWith('.smvastroservices.in') ||
    host === 'smvastroservices.pages.dev' ||
    host.endsWith('.smvastroservices.pages.dev');
}

function ratePolicyForRequest(req) {
  const method = String(req?.method || 'GET').toUpperCase();
  const path = normalizePath(req?.path || req?.url || '/');
  if (method === 'OPTIONS' || method === 'GET' || method === 'HEAD') {
    if (method === 'GET' && (
      path === '/public/astrologers' ||
      /^\/public\/astrologers\/[^/]+\/reviews$/.test(path) ||
      path === '/public/content' ||
      path === '/public/android-app' ||
      path === '/public/registration-config' ||
      path === '/api/smv-mode'
    )) return { name: 'public-read', windowMs: 60_000, max: 240 };
    return null;
  }
  if (method !== 'POST') return null;
  if (path === '/lookup-customer-login' || path === '/lookup-id-login') {
    return { name: 'identity-lookup', windowMs: 15 * 60_000, max: 30 };
  }
  if (path === '/admin/android-app/upload') return { name: 'admin-apk-upload', windowMs: 60 * 60_000, max: 5 };
  if (path === '/contact-query' || path === '/question-notify') {
    return { name: 'public-form', windowMs: 15 * 60_000, max: 20 };
  }
  if (
    path === '/appointment-booking' ||
    path === '/wallet/recharge/create-order' ||
    path === '/wallet/recharge/verify' ||
    path === '/private-consultation/create-order' ||
    path === '/private-consultation/retry-payment' ||
    path === '/private-consultation/recover-payment' ||
    path === '/private-consultation/verify-payment' ||
    path === '/verify-payment'
  ) return { name: 'payment-action', windowMs: 60_000, max: 60 };
  return null;
}

function createRouteRateLimiter({ now = Date.now, maxEntries = 20_000 } = {}) {
  const buckets = new Map();
  const routeRateLimit = function routeRateLimit(req, res, next) {
    const policy = ratePolicyForRequest(req);
    if (!policy) return next();
    const ip = String(req?.ip || req?.socket?.remoteAddress || 'unknown').slice(0, 128);
    const key = policy.name + ':' + ip;
    const timestamp = now();
    let bucket = buckets.get(key);
    if (!bucket || timestamp >= bucket.resetAt) {
      bucket = { count: 0, resetAt: timestamp + policy.windowMs };
      buckets.set(key, bucket);
    }
    if (bucket.count >= policy.max) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - timestamp) / 1000));
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please wait before trying again.',
        retryAfterSeconds: retryAfter
      });
    }
    bucket.count += 1;
    if (buckets.size > maxEntries) {
      // Keep memory usage bounded even when many one-off IPs arrive before
      // their time windows expire. Evict oldest buckets until a small reserve
      // of capacity is available; evicted clients must earn a fresh bucket.
      const targetSize = Math.max(1, Math.floor(maxEntries * 0.95));
      for (const [storedKey, stored] of buckets) {
        if (timestamp >= stored.resetAt || buckets.size > targetSize) buckets.delete(storedKey);
        if (buckets.size <= targetSize) break;
      }
    }
    return next();
  };
  Object.defineProperty(routeRateLimit, 'bucketCount', { get: () => buckets.size });
  return routeRateLimit;
}

function createCorsMiddleware() {
  return function corsPolicy(req, res, next) {
    const origin = req.headers.origin;
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.vary('Origin');
    if (origin && !isAllowedOrigin(origin, process.env.ALLOWED_ORIGINS)) {
      return res.status(403).json({ success: false, error: 'Origin is not allowed for this API.' });
    }
    if (origin) res.header('Access-Control-Allow-Origin', origin);
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    return next();
  };
}

function createRequestBodyParser(express) {
  if (!express || typeof express.json !== 'function') throw new TypeError('An Express-compatible JSON parser is required.');
  const parsers = new Map();
  return function requestBodyParser(req, res, next) {
    const limit = requestBodyLimit(req.path);
    if (!limit) return next();
    let parser = parsers.get(limit);
    if (!parser) {
      parser = express.json({ limit });
      parsers.set(limit, parser);
    }
    return parser(req, res, next);
  };
}

module.exports = {
  DEFAULT_ALLOWED_ORIGINS,
  BODY_LIMITS,
  requestBodyLimit,
  parseConfiguredOrigins,
  isAllowedOrigin,
  createCorsMiddleware,
  createRequestBodyParser,
  ratePolicyForRequest,
  createRouteRateLimiter
};
