import test from 'node:test';
import assert from 'node:assert/strict';
import { registerLegacyRazorpayRoutes } from '../src/legacy-razorpay-routes.mjs';

function appHarness() {
  const handlers = new Map();
  return {
    handlers,
    post(path, handler) { handlers.set('POST ' + path, handler); },
    get(path, handler) { handlers.set('GET ' + path, handler); }
  };
}

function responseHarness() {
  return {
    statusCode: 200, headers: {}, body: null,
    status(code) { this.statusCode = code; return this; },
    set(name, value) {
      if (typeof name === 'object') Object.assign(this.headers, name);
      else this.headers[name] = value;
      return this;
    },
    json(body) { this.body = body; return this; },
    send(body) { this.body = body; return this; }
  };
}

function request({ authorization = 'Bearer customer-token', body = {}, headers = {}, params = {} } = {}) {
  return {
    body, params,
    get(name) {
      const key = Object.keys(headers).find(item => item.toLowerCase() === String(name).toLowerCase());
      if (key) return headers[key];
      if (String(name).toLowerCase() === 'authorization') return authorization;
      return '';
    }
  };
}

function firestoreFixture(initial = {}) {
  const documents = new Map(Object.entries(initial).map(([path, value]) => [path, structuredClone(value)]));
  const writes = [];
  const reads = [];
  const queries = [];
  const copy = value => value === undefined ? undefined : structuredClone(value);
  const snapshot = path => {
    const value = documents.get(path);
    return value
      ? { exists: true, id: path.split('/').pop(), path, data: copy(value) }
      : { exists: false, id: path.split('/').pop(), path, data: null };
  };
  return {
    documents, writes, reads, queries,
    async getDocument(path) { reads.push(path); return snapshot(path); },
    async setDocument(path, data, options = {}) {
      writes.push({ type: 'set', path, data: copy(data), options });
      const old = documents.get(path) || {};
      documents.set(path, options.merge ? { ...old, ...copy(data) } : copy(data));
      return { success: true };
    },
    async runQuery(options) {
      queries.push(copy(options));
      const collection = options.collectionPath;
      const filter = options.filters?.[0];
      const prefix = collection + '/';
      const rows = [];
      for (const [path, data] of documents.entries()) {
        if (!path.startsWith(prefix) || path.slice(prefix.length).includes('/')) continue;
        if (filter && data?.[filter.field] !== filter.value) continue;
        rows.push({ id: path.slice(prefix.length), path, data: copy(data) });
      }
      return rows.slice(0, options.limit || rows.length);
    },
    async runTransaction(callback) {
      const draft = new Map([...documents.entries()].map(([path, value]) => [path, copy(value)]));
      const tx = {
        async getDocument(path) {
          const value = draft.get(path);
          return value ? { exists: true, id: path.split('/').pop(), path, data: copy(value) } :
            { exists: false, id: path.split('/').pop(), path, data: null };
        },
        create(path, value) {
          if (draft.has(path)) throw Object.assign(new Error('ALREADY_EXISTS'), { code: 'FIRESTORE_ALREADY_EXISTS', httpStatus: 409 });
          draft.set(path, copy(value));
        },
        set(path, value, options = {}) {
          const old = draft.get(path) || {};
          draft.set(path, options.merge ? { ...old, ...copy(value) } : copy(value));
        },
        update(path, value) {
          if (!draft.has(path)) throw Object.assign(new Error('NOT_FOUND'), { code: 'FIRESTORE_NOT_FOUND', httpStatus: 404 });
          draft.set(path, { ...draft.get(path), ...copy(value) });
        },
        delete(path) { draft.delete(path); }
      };
      const result = await callback(tx);
      documents.clear();
      for (const [path, value] of draft.entries()) documents.set(path, value);
      writes.push({ type: 'transaction' });
      return result;
    }
  };
}

function walletInbox() {
  const events = new Map();
  let sequence = 0;
  const calls = [];
  return {
    events, calls,
    async recordWebhookEvent(input) {
      calls.push(['record', input]);
      const existing = events.get(input.eventKey);
      if (existing?.processed) return { success: true, alreadyProcessed: true, eventKey: input.eventKey };
      if (existing?.claimToken) return { success: true, inProgress: true, eventKey: input.eventKey };
      const claimToken = 'claim_' + (++sequence);
      events.set(input.eventKey, { processed: false, claimToken, eventType: input.eventType });
      return { success: true, alreadyProcessed: false, inProgress: false, eventKey: input.eventKey, claimToken };
    },
    async completeWebhookEvent(key, token) {
      calls.push(['complete', key, token]);
      const event = events.get(key);
      if (!event || event.claimToken !== token) return { success: true, changed: 0 };
      event.processed = true;
      event.claimToken = null;
      return { success: true, changed: 1 };
    },
    async releaseWebhookEvent(key, token, reason) {
      calls.push(['release', key, token, reason]);
      const event = events.get(key);
      if (event?.claimToken === token) event.claimToken = null;
      return { success: true, changed: 1 };
    },
    async getRechargeByOrderId() { return null; },
    async finalizeRecharge(input) { calls.push(['finalizeRecharge', input]); return { alreadyProcessed: false }; },
    async markRechargePaymentFailed(input) { calls.push(['markRechargePaymentFailed', input]); }
  };
}

function razorpayFixture(overrides = {}) {
  const calls = [];
  let orderCounter = 0;
  const payments = new Map();
  const refunds = new Map();
  return {
    calls, payments, refunds,
    async createOrder(input) {
      calls.push(['createOrder', input]);
      return { id: 'order_test_' + (++orderCounter), amount: input.amountPaise, currency: 'INR', status: 'created' };
    },
    async findOrderByReceipt() { return null; },
    async fetchOrder(id) {
      calls.push(['fetchOrder', id]);
      return { id, amount: 1000, currency: 'INR', status: 'created' };
    },
    async fetchOrderPayments(id) {
      calls.push(['fetchOrderPayments', id]);
      return { items: [...payments.values()].filter(p => p.order_id === id) };
    },
    async fetchPayment(id) {
      calls.push(['fetchPayment', id]);
      return payments.get(id) || { id, order_id: 'order_test_1', amount: 1000, currency: 'INR', status: 'captured' };
    },
    async capturePayment(id, amount, currency) {
      calls.push(['capturePayment', id, amount, currency]);
      const payment = payments.get(id) || { id, order_id: 'order_test_1', amount, currency };
      payment.status = 'captured';
      return payment;
    },
    async verifyPaymentSignature() { return true; },
    async verifyWebhookSignature() { calls.push(['verifyWebhookSignature']); return true; },
    async fetchPaymentRefunds(id, options) {
      calls.push(['fetchPaymentRefunds', id, options]);
      return { items: [...refunds.values()].filter(item => item.payment_id === id) };
    },
    async fetchRefund(id) {
      calls.push(['fetchRefund', id]);
      if (!refunds.has(id)) throw Object.assign(new Error('refund missing'), { code: 'REFUND_NOT_FOUND', httpStatus: 404 });
      return refunds.get(id);
    },
    async refundPayment(paymentId, input) {
      calls.push(['refundPayment', paymentId, input]);
      const refund = {
        id: 'rfnd_' + (refunds.size + 1), payment_id: paymentId,
        amount: input.amountPaise, status: 'pending', acquirer_data: { rrn: 'rrn-fixture' }
      };
      refunds.set(refund.id, refund);
      return { id: refund.id, paymentId, amount: input.amountPaise, status: refund.status };
    },
    ...overrides
  };
}

function setup({ documents = {}, privateConsultation = true, razorpay = {}, wallet = {}, ready = true } = {}) {
  const app = appHarness();
  const firestore = firestoreFixture(documents);
  const inbox = walletInbox();
  const gateway = razorpayFixture(razorpay);
  const d1 = { ...inbox, ...wallet };
  const identityService = {
    async authenticateAuthorization(header) {
      if (header === 'Bearer admin-token') return { uid: 'admin-1', email: 'admin@example.test', role: 'admin', isAdmin: true };
      if (header !== 'Bearer customer-token') throw Object.assign(new Error('auth required'), { code: 'AUTH_REQUIRED', httpStatus: 401 });
      return { uid: 'customer-1', email: 'customer@example.test', role: 'customer' };
    }
  };
  registerLegacyRazorpayRoutes({
    app, identityService, firestore, walletAdapter: d1, razorpay: gateway,
    razorpayKeyId: 'rzp_test_fixture', razorpayKeySecretPresent: true,
    razorpayWebhookSecret: 'test-webhook-secret', razorpayMode: 'test',
    enablePrivateConsultation: privateConsultation, allowNewQuestions: true,
    isD1Ready: async () => ready,
    cryptoImpl: globalThis.crypto,
    now: () => 1760000000000
  });
  return { app, firestore, wallet: d1, razorpay: gateway };
}

test('registers the unified webhook, Question payment and Question/Private refund routes', () => {
  const state = setup();
  for (const path of [
    'POST /razorpay/webhook', 'POST /create-order', 'POST /verify-payment',
    'POST /admin/reject-question', 'POST /admin/retry-refund', 'POST /customer/sync-refund',
    'POST /admin/sync-refund', 'POST /private-consultation/create-order',
    'POST /private-consultation/retry-payment', 'POST /private-consultation/cancel-payment',
    'POST /private-consultation/recover-payment', 'POST /private-consultation/verify-payment',
    'POST /admin/private-consultation/reject-question', 'POST /admin/private-consultation/retry-refund',
    'POST /admin/private-consultation/sync-refund', 'GET /admin/refund-trace/:questionId'
  ]) assert.equal(state.app.handlers.has(path), true, path);
});

test('Question create-order keeps the saved original price, validates ownership and returns legacy checkout fields', async () => {
  const state = setup({
    documents: {
      'smv_questions/q-1': {
        customerId: 'customer-1', questionId: 'q-1', amount: 15, originalAmount: 20,
        status: 'awaiting_payment', paymentStatus: 'pending', question: 'Test question'
      }
    }
  });
  const res = responseHarness();
  await state.app.handlers.get('POST /create-order')(
    request({ body: { questionId: 'q-1' } }), res
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.questionId, 'q-1');
  assert.equal(res.body.amount, 1500);
  assert.equal(res.body.originalAmount, 20);
  assert.equal(res.body.keyId, 'rzp_test_fixture');
  assert.ok(state.firestore.documents.get('smv_questions/q-1').razorpayOrderId);
  const audit = [...state.firestore.documents.entries()].find(([path]) => path.startsWith('razorpay_orders/'));
  assert.ok(audit);
});

test('Question verify-payment checks owner, order, signature and provider captured state before one atomic payment record', async () => {
  const state = setup({
    documents: {
      'smv_questions/q-1': {
        customerId: 'customer-1', questionId: 'q-1', amount: 10,
        status: 'awaiting_payment', paymentStatus: 'order_created', razorpayOrderId: 'order_test_1',
        question: 'Will payment work?'
      },
      'smv_settings/workflow': { allowWithoutAdminApproval: true }
    }
  });
  const res = responseHarness();
  await state.app.handlers.get('POST /verify-payment')(request({
    body: { questionId: 'q-1', razorpay_order_id: 'order_test_1', razorpay_payment_id: 'pay_123', razorpay_signature: 'valid-signature' }
  }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.verified, true);
  assert.equal(res.body.status, 'available_to_astrologers');
  const question = state.firestore.documents.get('smv_questions/q-1');
  assert.equal(question.paymentStatus, 'paid');
  assert.equal(question.razorpayPaymentId, 'pay_123');
  assert.ok(question.customerPaymentId.startsWith('smvcp_'));
  const paymentDocs = [...state.firestore.documents.keys()].filter(path => path.startsWith('smv_payments/'));
  assert.equal(paymentDocs.length, 1);
});

test('Question payment verification fails closed for wrong owner and mismatched provider order/amount', async () => {
  const state = setup({
    documents: {
      'smv_questions/q-1': {
        customerId: 'someone-else', amount: 10, status: 'awaiting_payment',
        paymentStatus: 'order_created', razorpayOrderId: 'order_test_1'
      }
    }
  });
  const ownerResponse = responseHarness();
  await state.app.handlers.get('POST /verify-payment')(request({
    body: { questionId: 'q-1', razorpay_order_id: 'order_test_1', razorpay_payment_id: 'pay_123', razorpay_signature: 'sig' }
  }), ownerResponse);
  assert.equal(ownerResponse.statusCode, 403);

  const amountGateway = razorpayFixture({
    async fetchPayment(id) { return { id, order_id: 'order_test_1', amount: 999, currency: 'INR', status: 'captured' }; }
  });
  const state2 = setup({
    documents: { 'smv_questions/q-1': { customerId: 'customer-1', amount: 10, status: 'awaiting_payment', paymentStatus: 'order_created', razorpayOrderId: 'order_test_1' } },
    razorpay: amountGateway
  });
  const amountResponse = responseHarness();
  await state2.app.handlers.get('POST /verify-payment')(request({
    body: { questionId: 'q-1', razorpay_order_id: 'order_test_1', razorpay_payment_id: 'pay_123', razorpay_signature: 'sig' }
  }), amountResponse);
  assert.equal(amountResponse.statusCode, 409);
  assert.equal(state2.firestore.documents.has('smv_payments/'), false);
});

test('unified webhook rejects invalid raw-body signature before any business reads or D1 claims', async () => {
  const state = setup({
    wallet: { async recordWebhookEvent() { throw new Error('must not claim invalid signature'); } },
    razorpay: { async verifyWebhookSignature() { return false; } }
  });
  const res = responseHarness();
  await state.app.handlers.get('POST /razorpay/webhook')(
    request({ body: new TextEncoder().encode('{"event":"payment.captured"}'), headers: { 'X-Razorpay-Signature': 'bad' } }), res
  );
  assert.equal(res.statusCode, 401);
  assert.equal(state.firestore.reads.length, 0);
});

test('unified webhook claims provider event ID, verifies captured Question payment and commits once', async () => {
  const state = setup({
    documents: {
      'razorpay_orders/order_test_1': { razorpayOrderId: 'order_test_1', questionId: 'q-1', amount: 1000, status: 'created' },
      'smv_questions/q-1': {
        customerId: 'customer-1', questionId: 'q-1', amount: 10, question: 'Webhook question?',
        status: 'awaiting_payment', paymentStatus: 'order_created', razorpayOrderId: 'order_test_1'
      }
    }
  });
  const event = {
    event: 'payment.captured',
    payload: { payment: { entity: { id: 'pay_123', order_id: 'order_test_1', amount: 1000, currency: 'INR', status: 'captured' } } }
  };
  const raw = new TextEncoder().encode(JSON.stringify(event));
  const res = responseHarness();
  await state.app.handlers.get('POST /razorpay/webhook')(
    request({ body: raw, headers: { 'X-Razorpay-Signature': 'valid', 'X-Razorpay-Event-Id': 'evt-question-1' } }), res
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body, 'OK');
  assert.equal(state.firestore.documents.get('smv_questions/q-1').paymentStatus, 'paid');
  assert.equal(state.wallet.events.get('razorpay_evt-question-1').processed, true);
  assert.equal(state.wallet.calls.filter(call => call[0] === 'complete').length, 1);
  const replay = responseHarness();
  await state.app.handlers.get('POST /razorpay/webhook')(
    request({ body: raw, headers: { 'X-Razorpay-Signature': 'valid', 'X-Razorpay-Event-Id': 'evt-question-1' } }), replay
  );
  assert.equal(replay.statusCode, 200);
  assert.equal(state.wallet.calls.filter(call => call[0] === 'complete').length, 1);
  assert.equal([...state.firestore.documents.keys()].filter(path => path.startsWith('smv_payments/')).length, 1);
});

test('unified webhook returns retryable 503 for an event already owned by another worker', async () => {
  const state = setup({
    wallet: { async recordWebhookEvent(input) { return { success: true, inProgress: true, eventKey: input.eventKey }; } }
  });
  const res = responseHarness();
  await state.app.handlers.get('POST /razorpay/webhook')(
    request({ body: new TextEncoder().encode('{"event":"refund.created"}'), headers: { 'X-Razorpay-Signature': 'valid', 'X-Razorpay-Event-Id': 'evt-busy' } }), res
  );
  assert.equal(res.statusCode, 503);
  assert.equal(res.headers['Retry-After'], '5');
});

test('unified webhook refuses to acknowledge if D1 event inbox schema is not ready', async () => {
  const state = setup({ ready: false });
  const res = responseHarness();
  await state.app.handlers.get('POST /razorpay/webhook')(
    request({ body: new TextEncoder().encode('{"event":"refund.created"}'), headers: { 'X-Razorpay-Signature': 'valid' } }), res
  );
  assert.equal(res.statusCode, 503);
});

test('refund webhook reconciles the actual refund ID, amount and bank reference to the owning Question', async () => {
  const state = setup({
    documents: {
      'smv_questions/q-1': { customerId: 'customer-1', razorpayPaymentId: 'pay_123', amount: 10, paymentStatus: 'paid' }
    },
    razorpay: {
      async verifyWebhookSignature() { return true; }
    }
  });
  const event = {
    event: 'refund.processed',
    payload: { refund: { entity: { id: 'rfnd_123', payment_id: 'pay_123', amount: 1000, currency: 'INR', status: 'processed', acquirer_data: { rrn: '123456789' } } } }
  };
  const res = responseHarness();
  await state.app.handlers.get('POST /razorpay/webhook')(
    request({ body: new TextEncoder().encode(JSON.stringify(event)), headers: { 'X-Razorpay-Signature': 'valid', 'X-Razorpay-Event-Id': 'evt-refund-1' } }), res
  );
  assert.equal(res.statusCode, 200);
  const q = state.firestore.documents.get('smv_questions/q-1');
  assert.equal(q.refundId, 'rfnd_123');
  assert.equal(q.refundStatus, 'processed');
  assert.equal(q.refundAmount, 10);
  assert.equal(q.refundRrn, '123456789');
});

test('Private Consultation verify-payment records captured payments once and respects the customer owner', async () => {
  const state = setup({
    documents: {
      'smv_private_consultations/pc-1': {
        customerId: 'customer-1', consultationId: 'pc-1', customerName: 'Test Customer',
        astrologerId: 'astro-1', question: 'Private question', chatPrice: 25,
        paymentStatus: 'order_created', status: 'awaiting_payment', razorpayOrderId: 'order_test_1'
      }
    },
    razorpay: {
      async fetchPayment(id) { return { id, order_id: 'order_test_1', amount: 2500, currency: 'INR', status: 'captured' }; }
    }
  });
  const res = responseHarness();
  await state.app.handlers.get('POST /private-consultation/verify-payment')(request({
    body: { consultationId: 'pc-1', razorpay_order_id: 'order_test_1', razorpay_payment_id: 'pay_123', razorpay_signature: 'sig' }
  }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.paymentStatus, 'paid');
  assert.equal(state.firestore.documents.get('smv_private_consultations/pc-1').paymentStatus, 'paid');
  assert.equal([...state.firestore.documents.keys()].filter(path => path.startsWith('smv_payments/')).length, 1);
});

test('Private Consultation recover-payment fetches payments for the saved order and only restores captured INR amount', async () => {
  const state = setup({
    documents: {
      'smv_private_consultations/pc-1': {
        customerId: 'customer-1', consultationId: 'pc-1', chatPrice: 30,
        paymentStatus: 'order_created', status: 'awaiting_payment', razorpayOrderId: 'order_test_1'
      }
    },
    razorpay: {
      async fetchOrderPayments(orderId) {
        return { items: [
          { id: 'pay_failed', order_id: orderId, amount: 3000, currency: 'INR', status: 'failed' },
          { id: 'pay_success', order_id: orderId, amount: 3000, currency: 'INR', status: 'captured' }
        ] };
      }
    }
  });
  const res = responseHarness();
  await state.app.handlers.get('POST /private-consultation/recover-payment')(request({ body: { consultationId: 'pc-1' } }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.recovered, true);
  assert.equal(state.firestore.documents.get('smv_private_consultations/pc-1').razorpayPaymentId, 'pay_success');
});

test('Private Consultation routes stay retired when the explicit Staging-only flag is OFF', async () => {
  const state = setup({ privateConsultation: false });
  const res = responseHarness();
  await state.app.handlers.get('POST /private-consultation/create-order')(request({ body: {} }), res);
  assert.equal(res.statusCode, 410);
});

test('Admin Question refund uses a stable idempotency key, checks provider history and stores the real refund ID', async () => {
  const state = setup({
    documents: {
      'smv_questions/q-1': {
        customerId: 'customer-1', questionId: 'q-1', amount: 10,
        paymentStatus: 'paid', status: 'answered',
        razorpayOrderId: 'order_test_1', razorpayPaymentId: 'pay_123'
      }
    }
  });
  const res = responseHarness();
  await state.app.handlers.get('POST /admin/reject-question')(
    request({ authorization: 'Bearer admin-token', body: { questionId: 'q-1', reason: 'Not eligible' } }), res
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.refundId, 'rfnd_1');
  const refundCall = state.razorpay.calls.find(call => call[0] === 'refundPayment');
  assert.ok(refundCall[2].idempotencyKey.startsWith('smv-question-'));
  assert.equal(refundCall[2].amountPaise, 1000);
  assert.equal(state.firestore.documents.get('smv_questions/q-1').refundId, 'rfnd_1');
});

test('Question refund retry reconciles the prior provider refund before creating another', async () => {
  const existingRefund = { id: 'rfnd_existing', payment_id: 'pay_123', amount: 1000, status: 'pending' };
  const state = setup({
    documents: {
      'smv_questions/q-1': {
        customerId: 'customer-1', questionId: 'q-1', amount: 10, status: 'question_rejected',
        paymentStatus: 'paid', razorpayOrderId: 'order_test_1', razorpayPaymentId: 'pay_123',
        refundReason: 'Reject', refundStatus: 'pending'
      }
    },
    razorpay: {
      async fetchPaymentRefunds() { return { items: [existingRefund] }; },
      async fetchRefund() { return existingRefund; }
    }
  });
  const res = responseHarness();
  await state.app.handlers.get('POST /admin/retry-refund')(
    request({ authorization: 'Bearer admin-token', body: { questionId: 'q-1' } }), res
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.refundId, 'rfnd_existing');
  assert.equal(state.razorpay.calls.some(call => call[0] === 'refundPayment'), false);
});

test('Customer cannot sync another user Question refund', async () => {
  const state = setup({ documents: { 'smv_questions/q-1': { customerId: 'someone-else', razorpayPaymentId: 'pay_123', refundId: 'rfnd_1' } } });
  const res = responseHarness();
  await state.app.handlers.get('POST /customer/sync-refund')(request({ body: { questionId: 'q-1' } }), res);
  assert.equal(res.statusCode, 403);
});

test('Private Consultation reject/refund and sync routes preserve Razorpay IDs and bank references', async () => {
  const state = setup({
    documents: {
      'smv_private_consultations/pc-1': {
        customerId: 'customer-1', consultationId: 'pc-1', chatPrice: 12,
        paymentStatus: 'paid', status: 'pending_admin_approval',
        razorpayOrderId: 'order_test_1', razorpayPaymentId: 'pay_123'
      }
    },
    razorpay: {
      async fetchPayment(id) { return { id, order_id: 'order_test_1', amount: 1200, currency: 'INR', status: 'captured' }; }
    }
  });
  const rejected = responseHarness();
  await state.app.handlers.get('POST /admin/private-consultation/reject-question')(
    request({ authorization: 'Bearer admin-token', body: { consultationId: 'pc-1', reason: 'Not eligible' } }), rejected
  );
  assert.equal(rejected.statusCode, 200);
  assert.equal(rejected.body.refundId, 'rfnd_1');
  const synced = responseHarness();
  await state.app.handlers.get('POST /admin/private-consultation/sync-refund')(
    request({ authorization: 'Bearer admin-token', body: { consultationId: 'pc-1' } }), synced
  );
  assert.equal(synced.statusCode, 200);
  assert.equal(synced.body.refundId, 'rfnd_1');
});

test('Unified webhook does not downgrade a previously paid Question on a late payment.failed event', async () => {
  const state = setup({
    documents: {
      'razorpay_orders/order_test_1': { questionId: 'q-1' },
      'smv_questions/q-1': {
        customerId: 'customer-1', amount: 10, paymentStatus: 'paid',
        status: 'available_to_astrologers', razorpayOrderId: 'order_test_1',
        razorpayPaymentId: 'pay_paid'
      }
    }
  });
  const event = { event: 'payment.failed', payload: { payment: { entity: { id: 'pay_old_fail', order_id: 'order_test_1', amount: 1000, currency: 'INR', status: 'failed' } } } };
  const res = responseHarness();
  await state.app.handlers.get('POST /razorpay/webhook')(
    request({ body: new TextEncoder().encode(JSON.stringify(event)), headers: { 'X-Razorpay-Signature': 'valid', 'X-Razorpay-Event-Id': 'evt-late-fail' } }), res
  );
  assert.equal(res.statusCode, 200);
  assert.equal(state.firestore.documents.get('smv_questions/q-1').paymentStatus, 'paid');
});


test('unified webhook resolves an order from the canonical Question when async audit metadata is missing', async () => {
  const state = setup({
    documents: {
      'smv_questions/q-fallback': {
        customerId: 'customer-1', questionId: 'q-fallback', amount: 10,
        question: 'Audit document may lag', status: 'awaiting_payment',
        paymentStatus: 'order_created', razorpayOrderId: 'order_test_1'
      }
    }
  });
  const event = {
    event: 'payment.captured',
    payload: { payment: { entity: { id: 'pay_fallback', order_id: 'order_test_1', amount: 1000, currency: 'INR', status: 'captured' } } }
  };
  const res = responseHarness();
  await state.app.handlers.get('POST /razorpay/webhook')(
    request({ body: new TextEncoder().encode(JSON.stringify(event)), headers: { 'X-Razorpay-Signature': 'valid', 'X-Razorpay-Event-Id': 'evt-order-fallback' } }), res
  );
  assert.equal(res.statusCode, 200);
  assert.equal(state.firestore.documents.get('smv_questions/q-fallback').paymentStatus, 'paid');
  assert.equal(state.wallet.events.get('razorpay_evt-order-fallback').processed, true);
});

test('unified webhook does not guess when the same Razorpay order maps to multiple legacy records', async () => {
  const state = setup({
    documents: {
      'smv_questions/q-ambiguous': { customerId: 'customer-1', amount: 10, paymentStatus: 'order_created', razorpayOrderId: 'order_test_1' },
      'smv_private_consultations/pc-ambiguous': { customerId: 'customer-1', chatPrice: 10, paymentStatus: 'order_created', razorpayOrderId: 'order_test_1' }
    }
  });
  const event = {
    event: 'payment.captured',
    payload: { payment: { entity: { id: 'pay_ambiguous', order_id: 'order_test_1', amount: 1000, currency: 'INR', status: 'captured' } } }
  };
  const res = responseHarness();
  await state.app.handlers.get('POST /razorpay/webhook')(
    request({ body: new TextEncoder().encode(JSON.stringify(event)), headers: { 'X-Razorpay-Signature': 'valid', 'X-Razorpay-Event-Id': 'evt-order-ambiguous' } }), res
  );
  assert.equal(res.statusCode, 500);
  assert.equal(state.firestore.documents.get('smv_questions/q-ambiguous').paymentStatus, 'order_created');
  assert.equal(state.wallet.calls.some(call => call[0] === 'release'), true);
});
