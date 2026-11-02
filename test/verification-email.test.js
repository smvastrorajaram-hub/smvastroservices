'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildCustomAccountActionHandlerUrl,
  buildCustomVerificationHandlerUrl,
  createAccountActionEmail,
  createVerificationEmail,
  createVerificationEmailRateLimiter
} = require('../verification-email');

function generatedLink(overrides = {}) {
  const url = new URL('https://smv-astro.firebaseapp.com/__/auth/action');
  url.searchParams.set('mode', 'verifyEmail');
  url.searchParams.set('oobCode', 'test-one-time-code');
  url.searchParams.set('apiKey', 'firebase-generated-link-key');
  for (const [key, value] of Object.entries(overrides)) url.searchParams.set(key, value);
  return url.toString();
}

test('Firebase-generated verification action is rewritten to the dedicated HTTPS handler', () => {
  const link = buildCustomVerificationHandlerUrl(generatedLink());
  const url = new URL(link);
  assert.equal(url.origin, 'https://verify.smvastroservices.in');
  assert.equal(url.pathname, '/auth/action.html');
  assert.equal(url.searchParams.get('mode'), 'verifyEmail');
  assert.equal(url.searchParams.get('oobCode'), 'test-one-time-code');
  assert.equal(url.searchParams.get('apiKey'), 'firebase-generated-link-key');
  assert.equal(url.searchParams.get('lang'), 'en');
  assert.equal(url.searchParams.has('continueUrl'), false);
});

test('Firebase-generated password reset action preserves the reset mode and one-time code', () => {
  const link = buildCustomAccountActionHandlerUrl(
    generatedLink({ mode: 'resetPassword', oobCode: 'reset-one-time-code' }),
    'resetPassword'
  );
  const url = new URL(link);
  assert.equal(url.origin, 'https://verify.smvastroservices.in');
  assert.equal(url.pathname, '/auth/action.html');
  assert.equal(url.searchParams.get('mode'), 'resetPassword');
  assert.equal(url.searchParams.get('oobCode'), 'reset-one-time-code');
  assert.equal(url.searchParams.get('apiKey'), 'firebase-generated-link-key');
  assert.equal(url.searchParams.get('lang'), 'en');
});

test('Firebase link apiKey metadata is retained but not locally compared to the web config', () => {
  const link = buildCustomVerificationHandlerUrl(generatedLink({ apiKey: 'a-different-project-managed-link-key' }));
  assert.equal(new URL(link).searchParams.get('apiKey'), 'a-different-project-managed-link-key');
  assert.throws(() => buildCustomVerificationHandlerUrl(generatedLink({ apiKey: '' })));
});

test('account action rewriting fails closed for wrong hosts, modes and paths', () => {
  assert.throws(() => buildCustomAccountActionHandlerUrl('https://evil.example/__/auth/action?mode=verifyEmail&oobCode=x&apiKey=k', 'verifyEmail'));
  assert.throws(() => buildCustomAccountActionHandlerUrl(generatedLink({ mode: 'recoverEmail' }), 'resetPassword'));
  assert.throws(() => buildCustomAccountActionHandlerUrl(generatedLink({ mode: 'verifyEmail' }), 'recoverEmail'));
  assert.throws(() => buildCustomAccountActionHandlerUrl('https://smv-astro.firebaseapp.com/not-the-handler?mode=verifyEmail&oobCode=x&apiKey=k', 'verifyEmail'));
});

test('English verification email points only to the dedicated white handler', () => {
  const verificationUrl = buildCustomVerificationHandlerUrl(generatedLink());
  const email = createVerificationEmail({ verificationUrl });
  assert.equal(email.subject, 'Verify your SMV ASTRO account');
  assert.match(email.text, /confirm that this email address belongs to you/i);
  assert.match(email.html, /Verify your email address/);
  assert.match(email.html, /background:#ffffff/);
  assert.ok(email.html.includes(verificationUrl.replace(/&/g, '&amp;')));
  assert.ok(!email.html.includes('href="https://smv-astro.firebaseapp.com'));
  assert.doesNotMatch(email.html, /உங்கள்/);
  assert.throws(() => createVerificationEmail({ verificationUrl: 'https://evil.example/auth/action.html?mode=verifyEmail&oobCode=x&apiKey=k' }));
});

test('English password reset email links to the reset UI with the resetPassword mode', () => {
  const actionUrl = buildCustomAccountActionHandlerUrl(
    generatedLink({ mode: 'resetPassword', oobCode: 'reset-code' }),
    'resetPassword'
  );
  const email = createAccountActionEmail({ actionUrl, mode: 'resetPassword' });
  assert.equal(email.subject, 'Reset your SMV ASTRO password');
  assert.match(email.text, /password reset was requested/i);
  assert.match(email.html, /Create a new password/);
  assert.match(email.html, /Reset password/);
  assert.match(email.html, /background:#ffffff/);
  assert.ok(email.html.includes(actionUrl.replace(/&/g, '&amp;')));
  assert.throws(() => createAccountActionEmail({ actionUrl, mode: 'recoverEmail' }));
});

test('per-identity sender enforces a cooldown and daily attempt ceiling', () => {
  let now = 10_000;
  const limiter = createVerificationEmailRateLimiter({ now: () => now, cooldownMs: 60_000, windowMs: 86_400_000, maxAttempts: 2 });
  assert.equal(limiter.reserve('identity-1').allowed, true);
  assert.deepEqual(limiter.reserve('identity-1'), { allowed: false, reason: 'cooldown', retryAfterSeconds: 60 });
  now += 60_000;
  assert.equal(limiter.reserve('identity-1').allowed, true);
  now += 60_000;
  assert.deepEqual(limiter.reserve('identity-1'), { allowed: false, reason: 'daily_limit', retryAfterSeconds: 86_280 });
  assert.equal(limiter.reserve('identity-2').allowed, true);
});

test('per-identity rate limiter rejects missing keys and bounds its map', () => {
  const limiter = createVerificationEmailRateLimiter({ now: () => 1_000, maxEntries: 4 });
  assert.throws(() => limiter.reserve(''));
  for (let i = 0; i < 20; i++) limiter.reserve('identity-' + i);
  assert.ok(limiter.size <= 4);
});
