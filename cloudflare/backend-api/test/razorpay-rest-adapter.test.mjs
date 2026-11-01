import test from 'node:test';
import assert from 'node:assert/strict';
import { createRazorpayRestClient } from '../../../shared/backend-platform/razorpay-rest-adapter.mjs';

function response(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return payload; }
  };
}

function clientWithFetch(handler) {
  const calls = [];
  const client = createRazorpayRestClient({
    keyId: 'rzp_test_sample_key',
    keySecret: 'test_secret_value',
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), init });
      return handler(String(url), init, calls.length);
    }
  });
  return { client, calls };
}

test('fetchMultipleRefund follows the payment refunds collection contract and preserves pagination', async () => {
  const { client, calls } = clientWithFetch(async () => response({
    entity: 'collection',
    count: 1,
    items: [{ id: 'rfnd_123456', payment_id: 'pay_123456', amount: 1200, status: 'processed' }]
  }));

  const result = await client.fetchMultipleRefund('pay_123456', { count: 100, skip: 200 });

  assert.equal(calls.length, 1);
  const url = new URL(calls[0].url);
  assert.equal(url.pathname, '/v1/payments/pay_123456/refunds');
  assert.equal(url.searchParams.get('count'), '100');
  assert.equal(url.searchParams.get('skip'), '200');
  assert.equal(calls[0].init.method, 'GET');
  assert.equal(calls[0].init.headers.Authorization, 'Basic ' + btoa('rzp_test_sample_key:test_secret_value'));
  assert.equal(result.items[0].id, 'rfnd_123456');
});

test('fetchPaymentRefunds is an explicit alias for the historical refund-list method', async () => {
  const { client } = clientWithFetch(async () => response({ entity: 'collection', count: 0, items: [] }));
  assert.deepEqual(
    await client.fetchPaymentRefunds('pay_123456', { count: 20, skip: 0 }),
    { entity: 'collection', count: 0, items: [] }
  );
});

test('payment refund listing rejects invalid payment IDs and page boundaries before network I/O', async () => {
  const { client, calls } = clientWithFetch(async () => response({ entity: 'collection', items: [] }));

  await assert.rejects(client.fetchPaymentRefunds('../pay_1'), error => error.code === 'RAZORPAY_REFUND_LIST_INVALID');
  await assert.rejects(client.fetchPaymentRefunds('pay_1', { count: 0 }), error => error.code === 'RAZORPAY_REFUND_LIST_INVALID');
  await assert.rejects(client.fetchPaymentRefunds('pay_1', { count: 101 }), error => error.code === 'RAZORPAY_REFUND_LIST_INVALID');
  await assert.rejects(client.fetchPaymentRefunds('pay_1', { skip: -1 }), error => error.code === 'RAZORPAY_REFUND_LIST_INVALID');
  await assert.rejects(client.fetchPaymentRefunds('pay_1', { skip: 9901 }), error => error.code === 'RAZORPAY_REFUND_LIST_INVALID');
  assert.equal(calls.length, 0);
});

test('refund idempotency retries send the same header and identical request body', async () => {
  const providerRefund = {
    id: 'rfnd_123456',
    payment_id: 'pay_123456',
    amount: 1200,
    status: 'pending'
  };
  const { client, calls } = clientWithFetch(async () => response(providerRefund));
  const input = {
    amountPaise: 1200,
    receipt: 'SMV_REFUND_123456',
    notes: { questionId: 'question_1' },
    idempotencyKey: 'smv-refund-key-123456'
  };

  const first = await client.refundPayment('pay_123456', input);
  const second = await client.refundPayment('pay_123456', input);

  assert.deepEqual(first, second);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, calls[1].url);
  assert.equal(calls[0].init.headers['X-Refund-Idempotency'], input.idempotencyKey);
  assert.equal(calls[1].init.headers['X-Refund-Idempotency'], input.idempotencyKey);
  assert.equal(calls[0].init.body, calls[1].init.body);
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    amount: 1200,
    receipt: 'SMV_REFUND_123456',
    notes: { questionId: 'question_1' },
    speed: 'normal'
  });
});

test('refund idempotency keys must contain 10–180 allowed characters', async () => {
  const { client, calls } = clientWithFetch(async () => response({
    id: 'rfnd_123456', payment_id: 'pay_123456', amount: 1200, status: 'pending'
  }));

  for (const idempotencyKey of ['short', 'bad key name', 'bad/key', 'x'.repeat(181)]) {
    await assert.rejects(
      client.refundPayment('pay_123456', {
        amountPaise: 1200,
        receipt: 'SMV_REFUND_123456',
        idempotencyKey
      }),
      error => error.code === 'RAZORPAY_REFUND_INVALID'
    );
  }
  assert.equal(calls.length, 0);
});

test('payment refund listing rejects a malformed provider response', async () => {
  const { client } = clientWithFetch(async () => response({ entity: 'collection', items: null }));
  await assert.rejects(
    client.fetchPaymentRefunds('pay_123456'),
    error => error.code === 'RAZORPAY_RESPONSE_INVALID' && error.httpStatus === 502
  );
});
