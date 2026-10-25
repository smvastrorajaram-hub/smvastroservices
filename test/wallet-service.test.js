'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseRupeesToPaise, paiseToRupees, calculateStartedMinuteCharge, walletLedgerDocId, createWalletService } = require('../wallet-service');

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
