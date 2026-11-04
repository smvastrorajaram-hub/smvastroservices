import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { createD1WalletAdapter } from '../../../shared/backend-platform/d1-wallet-adapter.mjs';
import { walletRechargeId } from '../../../shared/backend-platform/wallet-recharge-domain.mjs';

class RechargeD1 {
  constructor() {
    this.wallets = new Map();
    this.recharges = new Map();
  }

  prepare(sql) {
    const db = this;
    let values = [];
    return {
      sql,
      bind(...input) { values = input; return this; },
      async run() { return db.execute(sql, values, 'run'); },
      async first() { return db.execute(sql, values, 'first'); },
      async all() { return db.execute(sql, values, 'all'); }
    };
  }

  async batch() { throw new Error('This test does not execute wallet ledger batches.'); }

  async execute(sql, values, mode) {
    if (sql.startsWith('INSERT OR IGNORE INTO smv_domain_wallets')) {
      const [uid, role, created, updated] = values;
      if (!this.wallets.has(uid)) this.wallets.set(uid, {
        owner_uid: uid, owner_role: role, currency: 'INR',
        available_balance_paise: 0, reserved_balance_paise: 0,
        bonus_minutes_balance: 0, reserved_bonus_minutes: 0,
        version: 1, created_at_ms: created, updated_at_ms: updated
      });
      return { success: true, meta: { changes: 1 } };
    }

    if (sql.includes('FROM smv_domain_wallets WHERE owner_uid = ?')) {
      const row = this.wallets.get(values[0]) || null;
      return mode === 'first' ? (row ? structuredClone(row) : null) :
        { results: row ? [structuredClone(row)] : [] };
    }

    if (sql.startsWith('INSERT OR IGNORE INTO smv_domain_wallet_recharges')) {
      const [id, uid, amount, payload, created, updated] = values;
      const inserted = !this.recharges.has(id);
      if (inserted) this.recharges.set(id, {
        recharge_id: id, customer_uid: uid, amount_paise: amount, currency: 'INR',
        status: 'order_creating', payload_json: payload, created_at_ms: created,
        updated_at_ms: updated, razorpay_order_id: null, razorpay_payment_id: null,
        paid_at_ms: null
      });
      return { success: true, meta: { changes: inserted ? 1 : 0 } };
    }

    if (sql.includes("json_extract(payload_json, '$.customerPaymentId') = ?")) {
      const row = [...this.recharges.values()].find(item => {
        try { return JSON.parse(item.payload_json).customerPaymentId === values[0]; }
        catch { return false; }
      }) || null;
      return mode === 'first' ? (row ? { recharge_id: row.recharge_id } : null) :
        { results: row ? [{ recharge_id: row.recharge_id }] : [] };
    }

    if (sql.startsWith('UPDATE smv_domain_wallet_recharges') &&
        sql.includes("json_extract(payload_json, '$.customerPaymentId') IS NULL")) {
      const [payload, updatedAt, rechargeId, ownerUid] = values;
      const row = this.recharges.get(rechargeId);
      if (row && row.customer_uid === ownerUid && row.status !== 'paid') {
        let current = {};
        try { current = JSON.parse(row.payload_json || '{}'); } catch {}
        if (!current.customerPaymentId) {
          row.payload_json = payload;
          row.updated_at_ms = updatedAt;
          return { success: true, meta: { changes: 1 } };
        }
      }
      return { success: true, meta: { changes: 0 } };
    }

    if (sql.includes('FROM smv_domain_wallet_recharges WHERE recharge_id')) {
      const row = this.recharges.get(values[0]) || null;
      if (!row || (values.length > 1 && row.customer_uid !== values[1])) return null;
      return structuredClone(row);
    }

    throw new Error('RechargeD1 does not recognize query: ' + sql);
  }
}

function sequenceCrypto(values) {
  let index = 0;
  return {
    subtle: webcrypto.subtle,
    getRandomValues(buffer) {
      buffer[0] = values[Math.min(index, values.length - 1)] ?? 0;
      index += 1;
      return buffer;
    }
  };
}

test('D1 recharge intent persists one stable six-digit Customer Payment ID across idempotent retries', async () => {
  const db = new RechargeD1();
  const adapter = createD1WalletAdapter({ db, now: () => 1000, cryptoImpl: sequenceCrypto([542622]) });
  const input = {
    ownerUid: 'customer-id-test',
    ownerRole: 'customer',
    amountPaise: 5000,
    idempotencyKey: 'customer-reference-001'
  };

  const first = await adapter.createRechargeIntent(input);
  assert.equal(first.acquired, true);
  assert.match(first.customerPaymentId, /^smvpy-[0-9]{6}$/);

  const retry = await adapter.createRechargeIntent(input);
  assert.equal(retry.inProgress, true);
  assert.equal(retry.customerPaymentId, first.customerPaymentId);

  const stored = [...db.recharges.values()][0];
  assert.equal(JSON.parse(stored.payload_json).customerPaymentId, first.customerPaymentId);
});

test('D1 recharge reference allocation retries an already-used six-digit number', async () => {
  const db = new RechargeD1();
  db.recharges.set('legacy-recharge', {
    recharge_id: 'legacy-recharge', customer_uid: 'legacy-customer',
    amount_paise: 1000, currency: 'INR', status: 'order_created',
    payload_json: JSON.stringify({ customerPaymentId: 'smvpy-100000' }),
    created_at_ms: 1, updated_at_ms: 1, razorpay_order_id: 'order_legacy'
  });
  const adapter = createD1WalletAdapter({ db, now: () => 1000, cryptoImpl: sequenceCrypto([0, 1]) });
  const result = await adapter.createRechargeIntent({
    ownerUid: 'customer-id-test', ownerRole: 'customer',
    amountPaise: 5000, idempotencyKey: 'customer-reference-002'
  });
  assert.equal(result.customerPaymentId, 'smvpy-100001');
});

test('D1 rejects an idempotency amount conflict before assigning a new public reference', async () => {
  const db = new RechargeD1();
  const ownerUid = 'customer-id-test';
  const idempotencyKey = 'customer-reference-003';
  const rechargeId = await walletRechargeId(ownerUid, idempotencyKey, webcrypto);
  db.recharges.set(rechargeId, {
    recharge_id: rechargeId, customer_uid: ownerUid, amount_paise: 5000,
    currency: 'INR', status: 'order_creating',
    payload_json: JSON.stringify({ idempotencyKey }),
    created_at_ms: 1, updated_at_ms: 1, razorpay_order_id: null,
    razorpay_payment_id: null, paid_at_ms: null
  });
  const adapter = createD1WalletAdapter({ db, now: () => 1000, cryptoImpl: webcrypto });
  await assert.rejects(
    () => adapter.createRechargeIntent({
      ownerUid, ownerRole: 'customer', amountPaise: 6000, idempotencyKey
    }),
    error => error.code === 'WALLET_IDEMPOTENCY_CONFLICT'
  );
  assert.equal(JSON.parse(db.recharges.get(rechargeId).payload_json).customerPaymentId, undefined);
});
