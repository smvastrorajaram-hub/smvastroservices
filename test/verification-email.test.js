'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildCustomVerificationHandlerUrl,
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

test('Firebase link apiKey metadata is retained but not locally compared to the web config', () => {
  const link = buildCustomVerificationHandlerUrl(generatedLink({ apiKey: 'a-different-project-managed-link-key' }));
  assert.equal(new URL(link).searchParams.get('apiKey'), 'a-different-project-managed-link-key');
  assert.throws(() => buildCustomVerificationHandlerUrl(generatedLink({ apiKey: '' })));
});

test('verification link rewriting fails closed for wrong hosts, modes and paths', () => {
  assert.throws(() => buildCustomVerificationHandlerUrl('https://evil.example/__/auth/action?mode=verifyEmail&oobCode=x&apiKey=k'));
  assert.throws(() => buildCustomVerificationHandlerUrl(generatedLink({ mode: 'resetPassword' })));
  assert.throws(() => buildCustomVerificationHandlerUrl('https://smv-astro.firebaseapp.com/not-the-handler?mode=verifyEmail&oobCode=x&apiKey=k'));
});

test('English email content points only to the dedicated verification page', () => {
  const verificationUrl = buildCustomVerificationHandlerUrl(generatedLink());
  const email = createVerificationEmail({ verificationUrl });
  assert.equal(email.subject, 'Verify your SMV ASTRO account');
  assert.match(email.text, /verify your SMV ASTRO email address/i);
  assert.match(email.html, /Verify your email address/);
  assert.match(email.html, /background:#ffffff/);
  assert.ok(email.html.includes(verificationUrl.replace(/&/g, '&amp;')));
  assert.ok(!email.html.includes('href="https://smv-astro.firebaseapp.com'));
  assert.doesNotMatch(email.html, /உங்கள்/);
  assert.throws(() => createVerificationEmail({ verificationUrl: 'https://evil.example/auth/action.html?mode=verifyEmail&oobCode=x&apiKey=k' }));
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
