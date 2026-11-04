'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
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
