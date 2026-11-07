'use strict';

const crypto = require('crypto');

/**
 * Generate an opaque Customer Payment reference and check it inside the
 * caller's Firestore transaction before the payment record is written.
 * Existing legacy references are read-only and are never rewritten.
 */
async function nextCustomerPaymentIdInTransaction(tx, paymentCollection, randomInt = crypto.randomInt) {
  if (!tx || typeof tx.get !== 'function' || !paymentCollection || typeof paymentCollection.doc !== 'function') {
    throw new TypeError('A Firestore transaction and payment collection are required.');
  }
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const candidate = 'smvpy-' + String(randomInt(100000, 1000000));
    const snapshot = await tx.get(paymentCollection.doc(candidate));
    if (!snapshot.exists) return candidate;
  }
  throw new Error('A unique Customer Payment ID could not be generated. Please retry payment verification.');
}

module.exports = { nextCustomerPaymentIdInTransaction };
