function base64(value) {
  const bytes = new TextEncoder().encode(String(value));
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(bytes.length, offset + 0x8000)));
  }
  return btoa(binary);
}

function hex(bytes) {
  return Array.from(new Uint8Array(bytes), value => value.toString(16).padStart(2, '0')).join('');
}

function fromHex(value) {
  const input = String(value || '').trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(input)) return null;
  const result = new Uint8Array(32);
  for (let i = 0; i < 32; i += 1) result[i] = Number.parseInt(input.slice(i * 2, i * 2 + 2), 16);
  return result;
}

function fixedCompare(left, right) {
  if (!left || !right || left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left[i] ^ right[i];
  return diff === 0;
}

function validPaise(value, { allowZero = false } = {}) {
  const amount = Number(value);
  return Number.isSafeInteger(amount) && amount >= (allowZero ? 0 : 1) ? amount : null;
}

function cleanId(value, max = 128) {
  const id = String(value || '').trim();
  return id && id.length <= max && /^[A-Za-z0-9_-]+$/.test(id) ? id : '';
}

/** Fetch-based Razorpay REST client. It never reads environment globals or mode-switches keys itself. */
export function createRazorpayRestClient({
  keyId,
  keySecret,
  fetchImpl = globalThis.fetch,
  cryptoImpl = globalThis.crypto,
  baseUrl = 'https://api.razorpay.com/v1'
} = {}) {
  const id = String(keyId || '').trim();
  const secret = String(keySecret || '').trim();
  const root = String(baseUrl || '').replace(/\/+$/, '');
  if (!id || !secret || !/^https:\/\//i.test(root) || typeof fetchImpl !== 'function' ||
      typeof cryptoImpl?.subtle?.importKey !== 'function' || typeof cryptoImpl?.subtle?.sign !== 'function') {
    throw new TypeError('Razorpay credentials, HTTPS endpoint, Fetch and WebCrypto are required.');
  }
  const authorization = 'Basic ' + base64(id + ':' + secret);

  async function request(path, { method = 'GET', body, headers = {} } = {}) {
    let response;
    try {
      response = await fetchImpl(root + path, {
        method,
        headers: {
          Authorization: authorization,
          Accept: 'application/json',
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...headers
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(15000)
      });
    } catch {
      throw Object.assign(new Error('Razorpay is temporarily unavailable.'), { code: 'RAZORPAY_UPSTREAM_UNAVAILABLE', httpStatus: 503 });
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw Object.assign(new Error('Razorpay rejected the request.'), {
        code: 'RAZORPAY_REQUEST_REJECTED',
        httpStatus: response.status >= 500 ? 503 : 502,
        upstreamStatus: response.status,
        upstreamCode: String(payload?.error?.code || '').slice(0, 80)
      });
    }
    return payload;
  }

  async function hmacHex(value, signingSecret = secret) {
    const key = await cryptoImpl.subtle.importKey(
      'raw', new TextEncoder().encode(String(signingSecret)),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    return hex(await cryptoImpl.subtle.sign('HMAC', key, new TextEncoder().encode(String(value))));
  }

  async function verifyPaymentSignature({ orderId, paymentId, signature } = {}) {
    const order = cleanId(orderId);
    const payment = cleanId(paymentId);
    const expectedSignature = fromHex(signature);
    if (!order || !payment || !expectedSignature) return false;
    return fixedCompare(expectedSignature, fromHex(await hmacHex(order + '|' + payment)));
  }

  async function verifyWebhookSignature({ rawBody, signature, webhookSecret } = {}) {
    const provided = fromHex(signature);
    const secretValue = String(webhookSecret || '');
    if (!provided || !secretValue || rawBody == null) return false;
    const raw = typeof rawBody === 'string'
      ? rawBody
      : rawBody instanceof ArrayBuffer
        ? new TextDecoder().decode(rawBody)
        : ArrayBuffer.isView(rawBody)
          ? new TextDecoder().decode(rawBody)
          : '';
    if (!raw) return false;
    return fixedCompare(provided, fromHex(await hmacHex(raw, secretValue)));
  }

  async function createOrder({ amountPaise, currency = 'INR', receipt, notes = {} } = {}) {
    const amount = validPaise(amountPaise);
    const receiptId = String(receipt || '').trim();
    if (amount === null || String(currency).toUpperCase() !== 'INR' ||
        !receiptId || receiptId.length > 40 || /[^A-Za-z0-9_-]/.test(receiptId)) {
      throw Object.assign(new Error('Razorpay order details are invalid.'), { code: 'RAZORPAY_ORDER_INVALID', httpStatus: 400 });
    }
    const payload = await request('/orders', {
      method: 'POST',
      body: { amount, currency: 'INR', receipt: receiptId, notes: notes && typeof notes === 'object' ? notes : {} }
    });
    if (!cleanId(payload?.id, 64) || Number(payload.amount) !== amount || String(payload.currency || '') !== 'INR') {
      throw Object.assign(new Error('Razorpay returned an invalid order response.'), { code: 'RAZORPAY_RESPONSE_INVALID', httpStatus: 502 });
    }
    return Object.freeze({
      id: String(payload.id), amount: Number(payload.amount),
      currency: String(payload.currency), status: String(payload.status || ''),
      receipt: String(payload.receipt || receiptId)
    });
  }

  async function fetchPayment(paymentId) {
    const idValue = cleanId(paymentId, 64);
    if (!idValue) throw Object.assign(new Error('Razorpay payment ID is invalid.'), { code: 'RAZORPAY_PAYMENT_ID_INVALID', httpStatus: 400 });
    return request('/payments/' + encodeURIComponent(idValue));
  }

  async function capturePayment(paymentId, amountPaise, currency = 'INR') {
    const idValue = cleanId(paymentId, 64);
    const amount = validPaise(amountPaise);
    if (!idValue || amount === null || String(currency).toUpperCase() !== 'INR') {
      throw Object.assign(new Error('Razorpay capture details are invalid.'), { code: 'RAZORPAY_CAPTURE_INVALID', httpStatus: 400 });
    }
    const payload = await request('/payments/' + encodeURIComponent(idValue) + '/capture', {
      method: 'POST',
      body: { amount, currency: 'INR' }
    });
    if (String(payload.id || '') !== idValue || Number(payload.amount) !== amount ||
        String(payload.currency || '') !== 'INR') {
      throw Object.assign(new Error('Razorpay returned an invalid capture response.'), { code: 'RAZORPAY_RESPONSE_INVALID', httpStatus: 502 });
    }
    return payload;
  }

  async function fetchRefund(refundId) {
    const idValue = cleanId(refundId, 64);
    if (!idValue) throw Object.assign(new Error('Razorpay refund ID is invalid.'), { code: 'RAZORPAY_REFUND_ID_INVALID', httpStatus: 400 });
    return request('/refunds/' + encodeURIComponent(idValue));
  }

  async function refundPayment(paymentId, { amountPaise, receipt, notes = {}, idempotencyKey } = {}) {
    const pid = cleanId(paymentId, 64);
    const amount = validPaise(amountPaise);
    const receiptId = String(receipt || '').trim();
    const key = String(idempotencyKey || '').trim();
    if (!pid || amount === null || !receiptId || receiptId.length > 40 ||
        !/^[A-Za-z0-9_-]+$/.test(receiptId) || !key || key.length > 180) {
      throw Object.assign(new Error('Razorpay refund details are invalid.'), { code: 'RAZORPAY_REFUND_INVALID', httpStatus: 400 });
    }
    const payload = await request('/payments/' + encodeURIComponent(pid) + '/refund', {
      method: 'POST',
      headers: { 'X-Refund-Idempotency': key },
      body: { amount, receipt: receiptId, notes: notes && typeof notes === 'object' ? notes : {}, speed: 'normal' }
    });
    if (!cleanId(payload?.id, 64) || String(payload.payment_id || pid) !== pid || Number(payload.amount) !== amount) {
      throw Object.assign(new Error('Razorpay returned an invalid refund response.'), { code: 'RAZORPAY_RESPONSE_INVALID', httpStatus: 502 });
    }
    return Object.freeze({ id: String(payload.id), paymentId: pid, amount: Number(payload.amount), status: String(payload.status || '') });
  }

  return Object.freeze({ createOrder, fetchPayment, capturePayment, fetchRefund, refundPayment, verifyPaymentSignature, verifyWebhookSignature });
}
