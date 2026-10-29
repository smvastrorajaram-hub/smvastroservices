'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {
  requestBodyLimit,
  parseConfiguredOrigins,
  isAllowedOrigin,
  ratePolicyForRequest,
  createRouteRateLimiter
} = require('../api-security');

test('body parser retains explicit route limits and gives only astrologer photo registration a large body', () => {
  assert.equal(requestBodyLimit('/contact-query'), '20kb');
  assert.equal(requestBodyLimit('/admin/offers/delete'), '10kb');
  assert.equal(requestBodyLimit('/admin/reject-question'), '10kb');
  assert.equal(requestBodyLimit('/admin/retry-refund'), '10kb');
  assert.equal(requestBodyLimit('/customer/sync-refund'), '10kb');
  assert.equal(requestBodyLimit('/admin/sync-refund'), '10kb');
  assert.equal(requestBodyLimit('/private-consultation/cancel-payment'), '10kb');
  assert.equal(requestBodyLimit('/register-astrologer-profile'), '15mb');
  assert.equal(requestBodyLimit('/private-consultation/create-order'), '30kb');
  assert.equal(requestBodyLimit('/unlisted-route'), '1mb');
  assert.equal(requestBodyLimit('/razorpay/webhook'), null);
});

test('configured origins normalize safely and reject malformed origins', () => {
  assert.deepEqual(parseConfiguredOrigins('https://partner.example,https://partner.example/path,http://evil.example,not a URL'), [
    'https://partner.example',
    'https://partner.example'
  ]);
});

test('CORS permits first-party sites and explicit configured origins, but not arbitrary origins', () => {
  assert.equal(isAllowedOrigin('https://smvastroservices.in', ''), true);
  assert.equal(isAllowedOrigin('https://horoscope.smvastroservices.in', ''), true);
  assert.equal(isAllowedOrigin('https://preview.smvastroservices.pages.dev', ''), true);
  assert.equal(isAllowedOrigin('https://partner.example', 'https://partner.example'), true);
  assert.equal(isAllowedOrigin('https://evil.example', ''), false);
  assert.equal(isAllowedOrigin('http://evil.example', 'http://evil.example'), false);
  assert.equal(isAllowedOrigin('null', ''), false);
});

test('rate policy covers abuse-sensitive lookups/forms, public reads and payment creation', () => {
  assert.equal(ratePolicyForRequest({ method: 'POST', path: '/lookup-id-login' }).name, 'identity-lookup');
  assert.equal(ratePolicyForRequest({ method: 'POST', path: '/contact-query' }).name, 'public-form');
  assert.equal(ratePolicyForRequest({ method: 'GET', path: '/public/astrologers' }).name, 'public-read');
  assert.equal(ratePolicyForRequest({ method: 'POST', path: '/wallet/recharge/create-order' }).name, 'payment-action');
  assert.equal(ratePolicyForRequest({ method: 'OPTIONS', path: '/contact-query' }), null);
  assert.equal(ratePolicyForRequest({ method: 'POST', path: '/unclassified' }), null);
});

test('rate limiter returns 429 after the configured threshold and resets at the window boundary', () => {
  let now = 1_000;
  const limiter = createRouteRateLimiter({ now: () => now });
  const call = () => {
    let nextCalled = false, statusCode = 200, retryAfter, body;
    const res = {
      set(name, value) { if (name === 'Retry-After') retryAfter = value; return this; },
      status(value) { statusCode = value; return this; },
      json(value) { body = value; return this; }
    };
    limiter({ method: 'POST', path: '/contact-query', ip: '192.0.2.10' }, res, () => { nextCalled = true; });
    return { nextCalled, statusCode, retryAfter, body };
  };
  for (let i = 0; i < 20; i++) assert.equal(call().nextCalled, true);
  const blocked = call();
  assert.equal(blocked.statusCode, 429);
  assert.equal(blocked.nextCalled, false);
  assert.ok(Number(blocked.retryAfter) > 0);
  assert.equal(blocked.body.success, false);
  now += 15 * 60_000;
  assert.equal(call().nextCalled, true);
});


test('all literal route-specific JSON parser limits are enforced by the early parser', () => {
  const server = fs.readFileSync(require.resolve('../server.js'), 'utf8');
  const routeParser = /app\.(?:post|put|patch|delete)\((['"\x60])([^'"\x60]+)\1,\s*express\.json\(\{\s*limit:\s*(['"\x60])([^'"\x60]+)\3\s*\}\)/g;
  let match, count = 0;
  while ((match = routeParser.exec(server))) {
    count += 1;
    assert.equal(requestBodyLimit(match[2]), match[4], 'global parser limit must preserve ' + match[2]);
  }
  assert.ok(count >= 40, 'expected broad coverage of literal route-specific parser limits');
});

test('rate limiter keeps its in-memory bucket table bounded for many unique client IPs', () => {
  const limiter = createRouteRateLimiter({ maxEntries: 4 });
  for (let i = 0; i < 40; i++) {
    const req = { method: 'GET', path: '/public/astrologers', ip: '192.0.2.' + i };
    const res = {
      set() { return this; },
      status() { return this; },
      json() { return this; }
    };
    limiter(req, res, () => {});
  }
  assert.ok(limiter.bucketCount <= 4, 'rate bucket map must not grow without a bound');
});
