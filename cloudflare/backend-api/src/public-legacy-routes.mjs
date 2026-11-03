const LEGACY_API_VERSION = '20260913-refund-v5-email-mobile-unique-v6';

function noStore(res) {
  return res.set('Cache-Control', 'no-store');
}

function enabled(value) {
  return String(value || '').trim().toLowerCase() === 'true';
}

/**
 * Small public contracts that do not require Firebase Admin or provider secrets.
 * No endpoint reveals private configuration or claims a provider is connected
 * merely because the Worker runtime is online.
 */
export function registerPublicLegacyRoutes({ app, env = {} } = {}) {
  if (!app || typeof app.get !== 'function') {
    throw new TypeError('Public legacy routes require an HTTP app.');
  }

  app.get('/public/registration-config', (_req, res) => {
    const whatsappEnabled = String(env.PHONE_VERIFICATION_MODE || 'email_unique')
      .trim().toLowerCase() === 'whatsapp';
    const providerConfigured = String(env.WHATSAPP_OTP_PROVIDER || '').trim().length > 0;
    return noStore(res).json({
      emailVerificationRequired: true,
      onePhoneOneAccount: true,
      phoneVerificationMode: whatsappEnabled && providerConfigured ? 'whatsapp' : 'email_unique',
      whatsappOtpEnabled: whatsappEnabled && providerConfigured,
      whatsappProviderConfigured: providerConfigured
    });
  });

  app.get('/api/smv-mode', (_req, res) => {
    const backend = String(env.SMV_PUBLIC_BACKEND_URL || '').trim();
    if (!backend || !/^https:\/\//i.test(backend)) {
      return res.status(503).set('Cache-Control', 'no-store').json({
        mode: 'unavailable',
        code: 'PUBLIC_BACKEND_URL_NOT_CONFIGURED'
      });
    }
    return noStore(res).json({ mode: 'server', backend });
  });

  app.get('/', (_req, res) => {
    return res.json({
      service: 'SMV ASTRO Cloudflare Backend',
      version: LEGACY_API_VERSION,
      status: 'online',
      backend: 'cloudflare',
      razorpay: enabled(env.SMV_RAZORPAY_TEST_MODE_ENABLED) ? 'test' :
        enabled(env.SMV_RAZORPAY_LIVE_MODE_ENABLED) ? 'live' : 'disabled',
      firebase: String(env.FIREBASE_AUTH_PROJECT_IDS || '').trim() ? 'token-verification-enabled' : 'disabled'
    });
  });

  app.get('/api-version', (_req, res) => {
    return noStore(res).json({
      version: LEGACY_API_VERSION,
      features: [
        'refund-retry',
        'original-price-payment-retry',
        'email-verification-only',
        'one-phone-one-account',
        'whatsapp-otp-switch-ready'
      ]
    });
  });

  return Object.freeze({
    paths: Object.freeze([
      '/public/registration-config',
      '/api/smv-mode',
      '/',
      '/api-version'
    ])
  });
}
