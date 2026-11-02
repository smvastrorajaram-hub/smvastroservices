'use strict';

const CUSTOM_ACCOUNT_ACTION_HANDLER_URL = 'https://verify.smvastroservices.in/auth/action.html';
const FIREBASE_ACTION_HOSTS = new Set([
  'smv-astro.firebaseapp.com',
  'smv-astro.web.app',
  'auth.smvastroservices.in'
]);
const ACCOUNT_ACTIONS = Object.freeze({
  verifyEmail: {
    subject: 'Verify your SMV ASTRO account',
    title: 'Verify your email address',
    instruction: 'Please confirm that this email address belongs to you using the secure button below.',
    button: 'Verify email',
    disclaimer: 'This secure link can be used once. If you did not create this account, ignore this email.'
  },
  resetPassword: {
    subject: 'Reset your SMV ASTRO password',
    title: 'Create a new password',
    instruction: 'A password reset was requested for your SMV ASTRO account. Use the secure button below to choose a new password.',
    button: 'Reset password',
    disclaimer: 'This secure link can be used once. If you did not request a password reset, you can ignore this email.'
  }
});
const DAY_MS = 24 * 60 * 60 * 1000;

function buildCustomAccountActionHandlerUrl(generatedLink, expectedMode) {
  if (!Object.prototype.hasOwnProperty.call(ACCOUNT_ACTIONS, expectedMode)) {
    throw new Error('Unsupported Firebase account action mode.');
  }
  if (typeof generatedLink !== 'string' || !generatedLink.trim()) {
    throw new TypeError('A Firebase-generated account action link is required.');
  }
  const source = new URL(generatedLink);
  if (source.protocol !== 'https:' ||
      !FIREBASE_ACTION_HOSTS.has(source.hostname.toLowerCase()) ||
      source.pathname !== '/__/auth/action') {
    throw new Error('Firebase returned an unexpected account action link host or path.');
  }
  const mode = source.searchParams.get('mode');
  const actionCode = source.searchParams.get('oobCode');
  const apiKey = source.searchParams.get('apiKey');
  if (mode !== expectedMode || !actionCode || actionCode.length > 4096 ||
      !apiKey || apiKey.length > 256) {
    throw new Error('Firebase returned an incomplete or unexpected account action link.');
  }

  // Keep the Firebase-generated one-time code and link metadata intact. Firebase
  // validates the code against the fixed Production project in the handler UI.
  const target = new URL(CUSTOM_ACCOUNT_ACTION_HANDLER_URL);
  target.searchParams.set('mode', mode);
  target.searchParams.set('oobCode', actionCode);
  target.searchParams.set('apiKey', apiKey);
  target.searchParams.set('lang', 'en');
  return target.toString();
}

function buildCustomVerificationHandlerUrl(generatedLink) {
  return buildCustomAccountActionHandlerUrl(generatedLink, 'verifyEmail');
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
}

function createAccountActionEmail({ actionUrl, mode } = {}) {
  const action = ACCOUNT_ACTIONS[mode];
  if (!action) throw new Error('Unsupported SMV ASTRO account action email mode.');
  const parsed = new URL(String(actionUrl || ''));
  if (parsed.protocol !== 'https:' ||
      parsed.origin !== 'https://verify.smvastroservices.in' ||
      parsed.pathname !== '/auth/action.html' ||
      parsed.searchParams.get('mode') !== mode ||
      !parsed.searchParams.get('oobCode') ||
      !parsed.searchParams.get('apiKey')) {
    throw new Error('A valid SMV ASTRO custom account action URL is required.');
  }
  const safeUrl = escapeHtml(parsed.toString());
  const text = [
    'Hello,',
    '',
    action.instruction,
    parsed.toString(),
    '',
    action.disclaimer,
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
    '    <h1 style="margin:0 0 9px;font-size:19px;line-height:1.35;font-weight:650">' + action.title + '</h1>',
    '    <p style="margin:0;color:#687078;font-size:13px;line-height:1.6">' + action.instruction + '</p>',
    '    <p style="margin:22px 0"><a href="' + safeUrl + '" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#242629;color:#ffffff;text-decoration:none;font-size:13px;font-weight:650">' + action.button + '</a></p>',
    '    <p style="margin:0;color:#858b91;font-size:11px;line-height:1.55">' + action.disclaimer + '</p>',
    '    <p style="margin:20px 0 0;color:#858b91;font-size:11px">SMV ASTRO SERVICES</p>',
    '  </main>',
    '</body>',
    '</html>'
  ].join('\n');
  return { subject: action.subject, text, html };
}

function createVerificationEmail({ verificationUrl } = {}) {
  return createAccountActionEmail({ actionUrl: verificationUrl, mode: 'verifyEmail' });
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
    if (!key) throw new TypeError('A Firebase identity key is required for account action email rate limiting.');
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
  CUSTOM_ACCOUNT_ACTION_HANDLER_URL,
  buildCustomAccountActionHandlerUrl,
  buildCustomVerificationHandlerUrl,
  createAccountActionEmail,
  createVerificationEmail,
  createVerificationEmailRateLimiter
};
