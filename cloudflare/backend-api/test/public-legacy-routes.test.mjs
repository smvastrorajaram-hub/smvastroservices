import test from 'node:test';
import assert from 'node:assert/strict';
import { registerPublicLegacyRoutes } from '../src/public-legacy-routes.mjs';

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

test('registration config preserves email and one-phone policies without enabling an unconfigured WhatsApp provider', () => {
  const app = harness();
  registerPublicLegacyRoutes({ app, env: { PHONE_VERIFICATION_MODE: 'whatsapp' } });
  const res = response();
  app.handlers.get('GET /public/registration-config')({}, res);
  assert.deepEqual(res.body, {
    emailVerificationRequired: true,
    onePhoneOneAccount: true,
    phoneVerificationMode: 'email_unique',
    whatsappOtpEnabled: false,
    whatsappProviderConfigured: false
  });
  assert.equal(res.headers['Cache-Control'], 'no-store');
});

test('registration config enables WhatsApp only when both mode and provider are present', () => {
  const app = harness();
  registerPublicLegacyRoutes({ app, env: {
    PHONE_VERIFICATION_MODE: 'whatsapp',
    WHATSAPP_OTP_PROVIDER: 'test-provider'
  } });
  const res = response();
  app.handlers.get('GET /public/registration-config')({}, res);
  assert.equal(res.body.phoneVerificationMode, 'whatsapp');
  assert.equal(res.body.whatsappOtpEnabled, true);
  assert.equal(res.body.whatsappProviderConfigured, true);
});

test('SMV mode returns the configured HTTPS Worker URL and fails closed without it', () => {
  const app = harness();
  registerPublicLegacyRoutes({ app, env: { SMV_PUBLIC_BACKEND_URL: 'https://smvastro-backend-api-staging.astroservices.workers.dev' } });
  const res = response();
  app.handlers.get('GET /api/smv-mode')({}, res);
  assert.deepEqual(res.body, {
    mode: 'server',
    backend: 'https://smvastro-backend-api-staging.astroservices.workers.dev'
  });

  const missingApp = harness();
  registerPublicLegacyRoutes({ app: missingApp, env: {} });
  const missing = response();
  missingApp.handlers.get('GET /api/smv-mode')({}, missing);
  assert.equal(missing.statusCode, 503);
  assert.equal(missing.body.code, 'PUBLIC_BACKEND_URL_NOT_CONFIGURED');
});

test('root status distinguishes Worker runtime from disabled payment/provider features', () => {
  const app = harness();
  registerPublicLegacyRoutes({ app, env: {
    FIREBASE_AUTH_PROJECT_IDS: 'smv-astro-staging',
    SMV_RAZORPAY_TEST_MODE_ENABLED: 'true'
  } });
  const res = response();
  app.handlers.get('GET /')({}, res);
  assert.equal(res.body.backend, 'cloudflare');
  assert.equal(res.body.status, 'online');
  assert.equal(res.body.razorpay, 'test');
  assert.equal(res.body.firebase, 'token-verification-enabled');
});

test('API version preserves legacy feature names and uses no-store', () => {
  const app = harness();
  registerPublicLegacyRoutes({ app, env: {} });
  const res = response();
  app.handlers.get('GET /api-version')({}, res);
  assert.equal(res.body.version, '20260913-refund-v5-email-mobile-unique-v6');
  assert.ok(res.body.features.includes('one-phone-one-account'));
  assert.equal(res.headers['Cache-Control'], 'no-store');
});
