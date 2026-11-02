'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  FIREBASE_WEB_API_KEY,
  buildCustomVerificationHandlerUrl,
  createVerificationEmail,
  createVerificationEmailRateLimiter
} = require('../verification-email');

function generatedLink(overrides = {}) {
  const url = new URL('https://smv-astro.firebaseapp.com/__/auth/action');
  url.searchParams.set('mode', 'verifyEmail');
  url.searchParams.set('oobCode', 'test-one-time-code');
  url.searchParams.set('apiKey', FIREBASE_WEB_API_KEY);
  for (const [key, value] of Object.entries(overrides)) url.searchParams.set(key, value);
  return url.toString();
}

test('Firebase-generated verification action is rewritten to the dedicated HTTPS handler', () => {
  const link = buildCustomVerificationHandlerUrl(generatedLink(), { language: 'ta-IN' });
  const url = new URL(link);
  assert.equal(url.origin, 'https://verify.smvastroservices.in');
  assert.equal(url.pathname, '/auth/action.html');
  assert.equal(url.searchParams.get('mode'), 'verifyEmail');
  assert.equal(url.searchParams.get('oobCode'), 'test-one-time-code');
  assert.equal(url.searchParams.get('apiKey'), FIREBASE_WEB_API_KEY);
  assert.equal(url.searchParams.get('lang'), 'ta');
  assert.equal(url.searchParams.has('continueUrl'), false);
});

test('verification link rewriting fails closed for wrong hosts, modes, paths and API keys', () => {
  assert.throws(() => buildCustomVerificationHandlerUrl('https://evil.example/__/auth/action?mode=verifyEmail&oobCode=x&apiKey=' + FIREBASE_WEB_API_KEY));
  assert.throws(() => buildCustomVerificationHandlerUrl(generatedLink({ mode: 'resetPassword' })));
  assert.throws(() => buildCustomVerificationHandlerUrl(generatedLink({ apiKey: 'wrong-key' })));
  assert.throws(() => buildCustomVerificationHandlerUrl('https://sm-astro.firebaseapp.com/not-the-handler?mode=verifyEmail&oobCode=x&apiKey=' + FIREBASE_WEB_API_KEY));
});

test('English email content uses the custom link and does not allow HTML link injection', () => {
  const verificationUrl = buildCustomVerificationHandlerUrl(generatedLink(), { language: 'ta-IN' });
  assert.equal(new URL(verificationUrl).searchParams.get('lang'), 'en');
  const email = createVerificationEmail({ verificationUrl });
  assert.match(email.subject, /SMV ASTRO/);
  assert.match(email.text, /Please verify your SMV ASTRO email address/);
  assert.match(email.html, />Verify Email<\/a>/);
  assert.doesNotMatch(email.subject + email.text + email.html, /உங்கள்|மின்னஞ்சல்|உறுதிப்படுத்தவும்/);
  assert.ok(email.html.includes(verificationUrl.replace(/&/g, '&amp;')));
  assert.ok(!email.html.includes('href="https://smv-astro.firebaseapp.com'));
  assert.throws(() => createVerificationEmail({ verificationUrl: 'https://evil.example/auth/action.html?mode=verifyEmail' }));
});

test('per-user verification sender enforces a cooldown and daily attempt ceiling', () => {
  let now = 10_000;
  const limiter = createVerificationEmailRateLimiter({ now: () => now, cooldownMs: 60_000, windowMs: 86_400_000, maxAttempts: 2 });
  assert.equal(limiter.reserve('uid-1').allowed, true);
  assert.deepEqual(limiter.reserve('uid-1'), { allowed: false, reason: 'cooldown', retryAfterSeconds: 60 });
  now += 60_000;
  assert.equal(limiter.reserve('uid-1').allowed, true);
  now += 60_000;
  assert.deepEqual(limiter.reserve('uid-1'), { allowed: false, reason: 'daily_limit', retryAfterSeconds: 86_280 });
  assert.equal(limiter.reserve('uid-2').allowed, true);
});

test('per-user rate limiter rejects missing identities and bounds its map', () => {
  const limiter = createVerificationEmailRateLimiter({ now: () => 1_000, maxEntries: 4 });
  assert.throws(() => limiter.reserve(''));
  for (let i = 0; i < 20; i++) limiter.reserve('uid-' + i);
  assert.ok(limiter.size <= 4);
});
