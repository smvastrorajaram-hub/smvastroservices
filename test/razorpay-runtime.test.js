'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createOptionalRazorpayRuntime } = require('../razorpay-runtime');

test('Render startup does not construct a Razorpay client when financial credentials are absent', () => {
  let constructions = 0;
  class Razorpay {
    constructor() { constructions += 1; }
  }
  const runtime = createOptionalRazorpayRuntime({ Razorpay, keyId: '', keySecret: '' });
  assert.equal(runtime.configured, false);
  assert.equal(runtime.client, null);
  assert.equal(constructions, 0);
  assert.throws(() => runtime.requireClient(), error =>
    error.code === 'RAZORPAY_NOT_CONFIGURED' && error.httpStatus === 503);
});

test('partial Razorpay credentials fail closed without throwing during application startup', () => {
  const runtime = createOptionalRazorpayRuntime({
    Razorpay: class { constructor() { throw new Error('must not be constructed'); } },
    keyId: 'rzp_live_placeholder',
    keySecret: ''
  });
  assert.equal(runtime.configured, false);
  assert.throws(() => runtime.requireClient(), error => error.httpStatus === 503);
});

test('fully configured Razorpay runtime constructs one client and exposes it through the guard', () => {
  const clients = [];
  class Razorpay {
    constructor(config) { this.config = config; clients.push(this); }
  }
  const runtime = createOptionalRazorpayRuntime({
    Razorpay, keyId: 'rzp_test_local_only', keySecret: 'test_secret_local_only'
  });
  assert.equal(runtime.configured, true);
  assert.equal(clients.length, 1);
  assert.equal(runtime.requireClient(), runtime.client);
  assert.deepEqual(runtime.client.config, {
    key_id: 'rzp_test_local_only', key_secret: 'test_secret_local_only'
  });
});


test('Production Render startup passes the optional Razorpay client explicitly to Wallet routes', () => {
  const server = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
  const start = server.indexOf('const walletService = registerWalletRoutes({');
  const end = server.indexOf('});', start);
  assert.ok(start >= 0 && end > start, 'Wallet route registration exists');
  const registration = server.slice(start, end);
  assert.ok(registration.includes('razorpay: razorpayRuntime.client'));
  assert.ok(!/\\bcrypto,\\s*razorpay,/.test(registration), 'removed Razorpay shorthand must not be referenced');
});

test('Render Wallet recharge create/verify routes fail closed before using a missing Razorpay client', () => {
  const source = fs.readFileSync(path.join(__dirname, '../wallet-service.js'), 'utf8');
  const createStart = source.indexOf("app.post('/wallet/recharge/create-order'");
  const verifyStart = source.indexOf("app.post('/wallet/recharge/verify'");
  assert.ok(createStart >= 0 && verifyStart > createStart, 'Wallet recharge routes exist');
  const createRoute = source.slice(createStart, verifyStart);
  const verifyRoute = source.slice(verifyStart, source.indexOf('return Object.assign(service', verifyStart));
  assert.ok(createRoute.includes("if (!razorpay?.orders?.create)"));
  assert.ok(createRoute.indexOf("if (!razorpay?.orders?.create)") < createRoute.indexOf('razorpay.orders.create'));
  assert.ok(verifyRoute.includes("if (!razorpay?.payments?.fetch || !razorpay?.payments?.capture)"));
  assert.ok(verifyRoute.indexOf("if (!razorpay?.payments?.fetch") < verifyRoute.indexOf('razorpay.payments.fetch'));
  assert.ok(createRoute.includes("code: 'RAZORPAY_NOT_CONFIGURED'"));
  assert.ok(verifyRoute.includes("code: 'RAZORPAY_NOT_CONFIGURED'"));
});
