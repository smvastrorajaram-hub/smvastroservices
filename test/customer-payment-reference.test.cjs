'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { nextCustomerPaymentIdInTransaction } = require('../public/horoscope/customer-payment-reference.cjs');

test('new customer payments use a lowercase smvpy six-digit random reference', async () => {
  const seen = new Set();
  const tx = { async get(ref) { return { exists: seen.has(ref.id) }; } };
  const collection = { doc(id) { return { id }; } };
  const value = await nextCustomerPaymentIdInTransaction(tx, collection, () => 123456);
  assert.equal(value, 'smvpy-123456');
});

test('customer payment ID generation retries a collision inside the transaction', async () => {
  const seen = new Set(['smvpy-111111']);
  const calls = [];
  const tx = { async get(ref) { calls.push(ref.id); return { exists: seen.has(ref.id) }; } };
  const collection = { doc(id) { return { id }; } };
  const values = [111111, 654321];
  const value = await nextCustomerPaymentIdInTransaction(tx, collection, () => values.shift());
  assert.equal(value, 'smvpy-654321');
  assert.deepEqual(calls, ['smvpy-111111', 'smvpy-654321']);
});

test('new payment ID generation fails closed when all candidates collide', async () => {
  const tx = { async get() { return { exists: true }; } };
  const collection = { doc(id) { return { id }; } };
  await assert.rejects(
    nextCustomerPaymentIdInTransaction(tx, collection, () => 222222),
    /unique Customer Payment ID/
  );
});
