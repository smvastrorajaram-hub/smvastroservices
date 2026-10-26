'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseRupeesToPaise, paiseToRupees, calculateStartedMinuteCharge, walletLedgerDocId, createWalletService, selectRechargeBonusOffer, rechargeOfferMatches, offerUsageCounterId, classifyRechargeIntent } = require('../wallet-service');

test('failed Wallet recharge order can be retried with the same idempotency key without weakening amount checks', () => {
  assert.equal(classifyRechargeIntent({ status: 'failed', storedAmountPaise: 10000, requestedAmountPaise: 10000 }), 'retry_failed');
  assert.equal(classifyRechargeIntent({ status: 'order_created', storedAmountPaise: 10000, requestedAmountPaise: 10000 }), 'reuse_order');
  assert.equal(classifyRechargeIntent({ status: 'paid', storedAmountPaise: 10000, requestedAmountPaise: 10000 }), 'already_paid');
  assert.equal(classifyRechargeIntent({ status: 'creating', storedAmountPaise: 10000, requestedAmountPaise: 10000 }), 'in_progress');
  assert.equal(classifyRechargeIntent({ status: 'failed', storedAmountPaise: 10000, requestedAmountPaise: 12000 }), 'amount_conflict');
});

test('rupee input converts to exact integer paise', () => {
  assert.equal(parseRupeesToPaise('1'), 100);
  assert.equal(parseRupeesToPaise('10.1'), 1010);
  assert.equal(parseRupeesToPaise('0.01'), 1);
  assert.equal(parseRupeesToPaise('999.99'), 99999);
  assert.equal(paiseToRupees(1010), 10.1);
});

test('rupee input rejects values that could be ambiguous or unsafe', () => {
  for (const value of ['', null, undefined, '-1', '-0.01', '1.001', '1,000', '₹10', 'Infinity', '1e3']) {
    assert.equal(parseRupeesToPaise(value), null, 'Invalid value: ' + String(value));
  }
  assert.equal(parseRupeesToPaise('0'), null);
  assert.equal(parseRupeesToPaise('0', { allowZero: true }), 0);
  assert.equal(parseRupeesToPaise('9007199254740992'), null);
});

test('started-minute billing subtracts promotional time before rounding', () => {
  assert.deepEqual(calculateStartedMinuteCharge({ connectedSeconds: 300, freeSeconds: 300, ratePerMinutePaise: 1000 }), {
    connectedSeconds: 300, freeSeconds: 300, billableSeconds: 0, billableMinutes: 0, amountPaise: 0
  });
  assert.equal(calculateStartedMinuteCharge({ connectedSeconds: 301, freeSeconds: 300, ratePerMinutePaise: 1000 }).amountPaise, 1000);
  assert.equal(calculateStartedMinuteCharge({ connectedSeconds: 360, freeSeconds: 300, ratePerMinutePaise: 1200 }).amountPaise, 1200);
  assert.equal(calculateStartedMinuteCharge({ connectedSeconds: 420, freeSeconds: 300, ratePerMinutePaise: 1200 }).amountPaise, 2400);
  assert.equal(calculateStartedMinuteCharge({ connectedSeconds: -1, freeSeconds: 0, ratePerMinutePaise: 1000 }), null);
});

test('wallet ledger ids are deterministic and stable', () => {
  assert.equal(walletLedgerDocId('recharge', 'customer:pay_1'), walletLedgerDocId('recharge', 'customer:pay_1'));
  assert.notEqual(walletLedgerDocId('recharge', 'customer:pay_1'), walletLedgerDocId('recharge', 'customer:pay_2'));
});

test('wallet transaction history falls back when the owner/date composite index is missing', async () => {
  const transactions = [
    { id: 'older', data: () => ({ type: 'recharge', direction: 'credit', amountPaise: 1000, balanceAfterPaise: 1000, createdAt: new Date('2026-01-01T00:00:00Z') }) },
    { id: 'welcome', data: () => ({ type: 'welcome_credit', direction: 'credit', amountPaise: 2500, balanceAfterPaise: 3500, createdAt: new Date('2026-10-01T00:00:00Z') }) },
    { id: 'newest', data: () => ({ type: 'booking', direction: 'debit', amountPaise: 500, balanceAfterPaise: 3000, createdAt: new Date('2026-10-20T00:00:00Z') }) }
  ];
  let indexQueryAttempts = 0;
  const collection = {
    where(field, op, uid) {
      assert.equal(field, 'ownerUid');
      assert.equal(op, '==');
      assert.equal(uid, 'customer-1');
      return {
        orderBy(fieldName, direction) {
          assert.equal(fieldName, 'createdAt');
          assert.equal(direction, 'desc');
          return {
            limit() {
              return {
                get: async () => {
                  indexQueryAttempts++;
                  throw Object.assign(new Error('The query requires an index.'), { code: 9 });
                }
              };
            }
          };
        },
        limit(count) {
          return { get: async () => ({ docs: transactions.slice(0, count) }) };
        }
      };
    }
  };
  const service = createWalletService({
    db: { collection: name => { assert.equal(name, 'smv_wallet_transactions'); return collection; } },
    FieldValue: { serverTimestamp: () => new Date() }
  });
  const result = await service.getTransactions('customer-1', 2);
  assert.equal(indexQueryAttempts, 1);
  assert.deepEqual(result.map(t => t.id), ['newest', 'welcome']);
  assert.equal(result[0].amountPaise, 500);
});


test('Wallet recharge offers select one active matching festival rule without stacking', () => {
  const nowMs = Date.parse('2026-10-26T06:00:00.000Z');
  const offers = [
    { id: 'low-priority', offerType: 'wallet_recharge_bonus_minutes', enabled: true, name: 'Pongal', bonusMinutes: 8, minimumRechargeAmountPaise: 10000, usedCount: 0, totalUsageLimit: 0, perCustomerLimit: 1, priority: 1 },
    { id: 'high-priority', offerType: 'wallet_recharge_bonus_minutes', enabled: true, name: 'Diwali', bonusMinutes: 5, minimumRechargeAmountPaise: 5000, usedCount: 0, totalUsageLimit: 20, perCustomerLimit: 1, priority: 2 },
    { id: 'disabled', offerType: 'wallet_recharge_bonus_minutes', enabled: false, name: 'Disabled', bonusMinutes: 99, minimumRechargeAmountPaise: 100, usedCount: 0, totalUsageLimit: 0, perCustomerLimit: 0, priority: 99 },
    { id: 'legacy-discount', offerType: 'percentage_discount', enabled: true, name: 'Legacy', bonusMinutes: 100, minimumRechargeAmountPaise: 100, usedCount: 0, totalUsageLimit: 0, perCustomerLimit: 0, priority: 100 },
    { id: 'not-started', offerType: 'wallet_recharge_bonus_minutes', enabled: true, name: 'Future', bonusMinutes: 100, minimumRechargeAmountPaise: 100, usedCount: 0, totalUsageLimit: 0, perCustomerLimit: 0, priority: 100, startAt: '2026-10-27T12:00' }
  ];
  const selected = selectRechargeBonusOffer({ offers, amountPaise: 15000, nowMs, usageCounts: {} });
  assert.equal(selected.id, 'high-priority');
  assert.equal(selectRechargeBonusOffer({ offers, amountPaise: 4000, nowMs, usageCounts: {} }), null);
  assert.equal(selectRechargeBonusOffer({ offers, amountPaise: 15000, nowMs, usageCounts: { 'high-priority': 1 } }).id, 'low-priority');
  assert.equal(rechargeOfferMatches({ ...offers[1], usedCount: 20 }, { amountPaise: 15000, nowMs }), false);
  assert.match(offerUsageCounterId('offer/with/slash', 'customer-1'), /^[a-f0-9]{64}$/);
});

function createWalletFirestoreMock(seed = {}) {
  const rows = new Map(Object.entries(seed).map(([path, value]) => [path, structuredClone(value)]));
  const snapshot = (exists, value, id) => ({ exists, id, data: () => value ? structuredClone(value) : undefined });
  const docRef = (collectionName, id) => ({
    kind: 'document', collectionName, id, path: collectionName + '/' + id,
    get: async () => {
      const value = rows.get(collectionName + '/' + id);
      return snapshot(value !== undefined, value, id);
    }
  });
  const collection = name => ({
    doc: id => docRef(name, String(id)),
    where(field, op, value) {
      assert.equal(op, '==');
      const query = { kind: 'query', collectionName: name, field, value, max: 100 };
      query.limit = n => { query.max = n; return query; };
      return query;
    }
  });
  const db = {
    collection,
    async runTransaction(callback) {
      const writes = [];
      const tx = {
        async get(reference) {
          if (reference.kind === 'query') {
            const docs = [...rows.entries()]
              .filter(([path, value]) => path.startsWith(reference.collectionName + '/') && value?.[reference.field] === reference.value)
              .slice(0, reference.max)
              .map(([path, value]) => snapshot(true, value, path.slice(reference.collectionName.length + 1)));
            return { docs, size: docs.length, empty: docs.length === 0 };
          }
          const value = rows.get(reference.path);
          return snapshot(value !== undefined, value, reference.id);
        },
        set(reference, value, options = {}) {
          writes.push({ op: 'set', reference, value: structuredClone(value), merge: options.merge === true });
        },
        create(reference, value) {
          writes.push({ op: 'create', reference, value: structuredClone(value) });
        }
      };
      const result = await callback(tx);
      for (const write of writes) {
        const prior = rows.get(write.reference.path);
        if (write.op === 'create' && prior !== undefined) throw new Error('Document already exists: ' + write.reference.path);
        rows.set(write.reference.path, write.merge ? { ...(prior || {}), ...write.value } : write.value);
      }
      return result;
    },
    inspect(path) { const value = rows.get(path); return value ? structuredClone(value) : null; }
  };
  return db;
}

test('captured Wallet recharge awards one matching free-minute offer only once and respects customer limit', async () => {
  const db = createWalletFirestoreMock({
    'smv_wallets/customer-1': { ownerUid: 'customer-1', ownerRole: 'customer', availableBalancePaise: 500, reservedBalancePaise: 0, bonusMinutesBalance: 0, reservedBonusMinutes: 0, version: 1 },
    'smv_wallet_recharges/recharge-1': { customerUid: 'customer-1', amountPaise: 10000, razorpayOrderId: 'order-1', status: 'order_created' },
    'razorpay_orders/order-1': { status: 'created' },
    'smv_offers/diwali-5': { id: 'diwali-5', offerType: 'wallet_recharge_bonus_minutes', name: 'Diwali', enabled: true, bonusMinutes: 5, minimumRechargeAmountPaise: 5000, startAt: null, endAt: null, perCustomerLimit: 1, totalUsageLimit: 10, usedCount: 0, successfulRedemptions: 0, totalBonusMinutesAwarded: 0, priority: 5 }
  });
  const service = createWalletService({ db, FieldValue: { serverTimestamp: () => new Date('2026-10-26T06:00:00.000Z') } });

  const first = await service.finalizeRecharge({ rechargeId: 'recharge-1', orderId: 'order-1', paymentId: 'pay-1', amountPaise: 10000, currency: 'INR' });
  assert.equal(first.alreadyProcessed, false);
  assert.equal(first.availableBalancePaise, 10500);
  assert.equal(first.bonusMinutesCredited, 5);
  assert.equal(first.bonusMinutesBalance, 5);
  assert.equal(first.offerId, 'diwali-5');
  assert.equal(db.inspect('smv_offers/diwali-5').usedCount, 1);
  assert.equal(db.inspect('smv_wallet_transactions/' + walletLedgerDocId('recharge', 'customer-1:pay-1')).bonusMinutesCredited, 5);

  const replay = await service.finalizeRecharge({ rechargeId: 'recharge-1', orderId: 'order-1', paymentId: 'pay-1', amountPaise: 10000, currency: 'INR' });
  assert.equal(replay.alreadyProcessed, true);
  assert.equal(replay.bonusMinutesCredited, 5);
  assert.equal(db.inspect('smv_wallets/customer-1').availableBalancePaise, 10500);
  assert.equal(db.inspect('smv_wallets/customer-1').bonusMinutesBalance, 5);
  assert.equal(db.inspect('smv_offers/diwali-5').usedCount, 1);

  await db.collection('smv_wallet_recharges').doc('recharge-2');
  const rechargeTwo = db.collection('smv_wallet_recharges').doc('recharge-2');
  await db.runTransaction(async tx => {
    tx.set(rechargeTwo, { customerUid: 'customer-1', amountPaise: 10000, razorpayOrderId: 'order-2', status: 'order_created' });
    tx.set(db.collection('razorpay_orders').doc('order-2'), { status: 'created' });
  });
  const second = await service.finalizeRecharge({ rechargeId: 'recharge-2', orderId: 'order-2', paymentId: 'pay-2', amountPaise: 10000, currency: 'INR' });
  assert.equal(second.bonusMinutesCredited, 0);
  assert.equal(second.bonusMinutesBalance, 5);
  assert.equal(db.inspect('smv_offers/diwali-5').usedCount, 1);
  assert.equal(db.inspect('smv_wallets/customer-1').availableBalancePaise, 20500);
});
