'use strict';

function createOptionalRazorpayRuntime({ Razorpay, keyId, keySecret } = {}) {
  const id = String(keyId || '').trim();
  const secret = String(keySecret || '').trim();
  let client = null;
  let errorCode = '';
  if (!id || !secret) {
    errorCode = 'RAZORPAY_NOT_CONFIGURED';
  } else if (typeof Razorpay !== 'function') {
    errorCode = 'RAZORPAY_CLIENT_UNAVAILABLE';
  } else {
    try {
      client = new Razorpay({ key_id: id, key_secret: secret });
    } catch {
      errorCode = 'RAZORPAY_CLIENT_INITIALIZATION_FAILED';
    }
  }
  function requireClient() {
    if (client) return client;
    const error = new Error('Razorpay is not configured on this backend. Financial routes are served by the configured Cloudflare backend.');
    error.code = errorCode || 'RAZORPAY_NOT_CONFIGURED';
    error.httpStatus = 503;
    throw error;
  }
  return Object.freeze({
    configured: !!client,
    client,
    requireClient
  });
}
module.exports = { createOptionalRazorpayRuntime };
