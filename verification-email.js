'use strict';

const CUSTOM_VERIFICATION_HANDLER_URL = 'https://verify.smvastroservices.in/auth/action.html';
const FIREBASE_ACTION_HOSTS = new Set([
  'smv-astro.firebaseapp.com',
  'smv-astro.web.app',
  'auth.smvastroservices.in'
]);
const DAY_MS = 24 * 60 * 60 * 1000;

function buildCustomVerificationHandlerUrl(generatedLink) {
  if (typeof generatedLink !== 'string' || !generatedLink.trim()) {
    throw new TypeError('A Firebase-generated email verification link is required.');
  }
  const source = new URL(generatedLink);
  if (source.protocol !== 'https:' ||
      !FIREBASE_ACTION_HOSTS.has(source.hostname.toLowerCase()) ||
      source.pathname !== '/__/auth/action') {
    throw new Error('Firebase returned an unexpected email action link host or path.');
  }
  const mode = source.searchParams.get('mode');
  const actionCode = source.searchParams.get('oobCode');
  const apiKey = source.searchParams.get('apiKey');
  if (mode !== 'verifyEmail' || !actionCode || actionCode.length > 4096 ||
      !apiKey || apiKey.length > 256) {
    throw new Error('Firebase returned an incomplete email verification action link.');
  }

  // The Firebase link's apiKey is metadata. Never use it as SDK configuration
  // and do not reject it locally: Firebase validates the one-time action code
  // against the fixed Production project when the handler applies the code.
  const target = new URL(CUSTOM_VERIFICATION_HANDLER_URL);
  target.searchParams.set('mode', 'verifyEmail');
  target.searchParams.set('oobCode', actionCode);
  target.searchParams.set('apiKey', apiKey);
  target.searchParams.set('lang', 'en');
  return target.toString();
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
}

function createVerificationEmail({ verificationUrl } = {}) {
  const parsed = new URL(String(verificationUrl || ''));
  if (parsed.protocol !== 'https:' ||
      parsed.origin !== 'https://verify.smvastroservices.in' ||
      parsed.pathname !== '/auth/action.html' ||
      parsed.searchParams.get('mode') !== 'verifyEmail' ||
      !parsed.searchParams.get('oobCode') ||
      !parsed.searchParams.get('apiKey')) {
    throw new Error('A valid SMV ASTRO custom verification URL is required.');
  }
  const safeUrl = escapeHtml(parsed.toString());
  const subject = 'Verify your SMV ASTRO account';
  const text = [
    'Hello,',
    '',
    'Please verify your SMV ASTRO email address by opening this secure link:',
    parsed.toString(),
    '',
    'This link can be used once. If you did not create this account, you can ignore this email.',
    '',
    'SMV ASTRO SERVICES'
  ].join('\n');
  const html = [
    '<!doctype html>',
    '<html lang="en">',
    '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>',
    '<body style="margin:0;padding:24px 14px;background:#ffffff;color:#202124;font-family:Arial,Helvetica,sans-serif">',
    '  <main style="max-width:440px;margin:0 auto;padding:24px;background:#ffffff;border:1px solid #eceff1;border-radius:14px">',
    '    <p style="margin:0 0 18px;color:#80643c;font-size:11px;font-weight:700;letter-spacing:2px">SMV ASTRO SERVICES</p>',
    '    <h1 style="margin:0 0 9px;font-size:19px;line-height:1.35;font-weight:650">Verify your email address</h1>',
    '    <p style="margin:0;color:#687078;font-size:13px;line-height:1.6">Please confirm that this email address belongs to you using the secure button below.</p>',
    '    <p style="margin:22px 0"><a href="' + safeUrl + '" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#242629;color:#ffffff;text-decoration:none;font-size:13px;font-weight:650">Verify email</a></p>',
    '    <p style="margin:0;color:#858b91;font-size:11px;line-height:1.55">This secure link can be used once. If you did not create this account, ignore this email.</p>',
    '    <p style="margin:20px 0 0;color:#858b91;font-size:11px">SMV ASTRO SERVICES</p>',
    '  </main>',
    '</body>',
    '</html>'
  ].join('\n');
  return { subject, text, html };
}

function createVerificationEmailRateLimiter({
  now = Date.now,
  cooldownMs = 60_000,
  windowMs = DAY_MS,
  maxAttempts = 5,
  maxEntries = 20_000
} = {}) {
  const attemptsByUid = new Map();
  function reserve(uid) {
    const key = String(uid || '').trim();
    if (!key) throw new TypeError('A Firebase user ID is required for verification email rate limiting.');
    const timestamp = Number(now());
    const recent = (attemptsByUid.get(key) || [])
      .filter(value => Number.isFinite(value) && value > timestamp - windowMs);
    const lastAttempt = recent.length ? recent[recent.length - 1] : 0;
    if (lastAttempt && timestamp - lastAttempt < cooldownMs) {
      const retryAfterSeconds = Math.max(1, Math.ceil((cooldownMs - (timestamp - lastAttempt)) / 1000));
      attemptsByUid.set(key, recent);
      return { allowed: false, reason: 'cooldown', retryAfterSeconds };
    }
    if (recent.length >= maxAttempts) {
      const retryAfterSeconds = Math.max(1, Math.ceil((recent[0] + windowMs - timestamp) / 1000));
      attemptsByUid.set(key, recent);
      return { allowed: false, reason: 'daily_limit', retryAfterSeconds };
    }
    recent.push(timestamp);
    attemptsByUid.set(key, recent);
    if (attemptsByUid.size > maxEntries) {
      const targetSize = Math.max(1, Math.floor(maxEntries * 0.95));
      for (const [storedUid, storedAttempts] of attemptsByUid) {
        if (!storedAttempts.length || storedAttempts[storedAttempts.length - 1] <= timestamp - windowMs ||
            attemptsByUid.size > targetSize) attemptsByUid.delete(storedUid);
        if (attemptsByUid.size <= targetSize) break;
      }
    }
    return { allowed: true, attemptsRemaining: Math.max(0, maxAttempts - recent.length) };
  }
  return { reserve, get size() { return attemptsByUid.size; } };
}

module.exports = {
  CUSTOM_VERIFICATION_HANDLER_URL,
  buildCustomVerificationHandlerUrl,
  createVerificationEmail,
  createVerificationEmailRateLimiter
};
