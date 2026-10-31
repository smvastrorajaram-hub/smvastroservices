import test from 'node:test';
import assert from 'node:assert/strict';
import { createD1WalletAdapter } from '../../../shared/backend-platform/d1-wallet-adapter.mjs';
import { createFirestoreWalletAdapter } from '../../../shared/backend-platform/firestore-wallet-adapter.mjs';

class FakeD1 {
  constructor() { this.wallets = new Map(); this.ledger = new Map(); }
  prepare(sql) {
    const db = this;
    return {
      sql, values: [],
      bind(...values) { this.values = values; return this; },
      async run() { return db.execute(this.sql, this.values, 'run'); },
      async first() { return db.execute(this.sql, this.values, 'first'); },
      async all() { return db.execute(this.sql, this.values, 'all'); }
    };
  }
  async batch(statements) {
    const wallets = structuredClone(this.wallets);
    const ledger = structuredClone(this.ledger);
    try {
      const out = [];
      for (const statement of statements) out.push(await this.execute(statement.sql, statement.values, 'run'));
      return out;
    } catch (error) {
      this.wallets = wallets; this.ledger = ledger;
      throw error;
    }
  }
  async execute(sql, values, mode) {
    if (sql.startsWith('INSERT OR IGNORE INTO smv_domain_wallets')) {
      const [uid, role, created, updated] = values;
      if (!this.wallets.has(uid)) this.wallets.set(uid, {
        owner_uid: uid, owner_role: role, currency: 'INR', available_balance_paise: 0,
        reserved_balance_paise: 0, bonus_minutes_balance: 0, reserved_bonus_minutes: 0,
        version: 1, created_at_ms: created, updated_at_ms: updated
      });
      return { success: true, meta: { changes: 1 } };
    }
    if (sql.includes('FROM smv_domain_wallets WHERE owner_uid = ?')) {
      const row = this.wallets.get(values[0]) || null;
      return mode === 'first' ? (row ? { ...row } : null) : { results: row ? [{ ...row }] : [] };
    }
    if (sql.includes('FROM smv_domain_wallet_ledger WHERE owner_uid = ? AND idempotency_key = ?')) {
      const row = [...this.ledger.values()].find(item => item.owner_uid === values[0] && item.idempotency_key === values[1]) || null;
      return mode === 'first' ? (row ? { ...row } : null) : { results: row ? [{ ...row }] : [] };
    }
    if (sql.includes('FROM smv_domain_wallet_ledger WHERE owner_uid = ? ORDER BY')) {
      const rows = [...this.ledger.values()].filter(item => item.owner_uid === values[0])
        .sort((a,b) => b.created_at_ms - a.created_at_ms).slice(0, values[1]);
      return { results: rows.map(row => ({ ...row })) };
    }
    if (sql.startsWith('INSERT INTO smv_domain_wallet_ledger')) {
      const [ledgerId, uid, role, type, direction, amount, availableDelta, reservedDelta,
        bonusDelta, reservedBonusDelta, key, referenceType, referenceId, note, metadataJson, source, createdAt] = values;
      const wallet = this.wallets.get(uid);
      if (!wallet) throw new Error('WALLET_OWNER_NOT_FOUND');
      if (wallet.owner_role !== role) throw new Error('WALLET_OWNER_ROLE_MISMATCH');
      if ([...this.ledger.values()].some(item => item.owner_uid === uid && item.idempotency_key === key)) {
        throw new Error('UNIQUE constraint failed: smv_domain_wallet_ledger.owner_uid, idempotency_key');
      }
      const next = {
        available_balance_paise: wallet.available_balance_paise + availableDelta,
        reserved_balance_paise: wallet.reserved_balance_paise + reservedDelta,
        bonus_minutes_balance: wallet.bonus_minutes_balance + bonusDelta,
        reserved_bonus_minutes: wallet.reserved_bonus_minutes + reservedBonusDelta
      };
      if (next.available_balance_paise < 0) throw new Error('WALLET_INSUFFICIENT_BALANCE');
      if (next.reserved_balance_paise < 0) throw new Error('WALLET_RESERVED_BALANCE_MISMATCH');
      if (next.bonus_minutes_balance < 0 || next.reserved_bonus_minutes < 0) throw new Error('WALLET_BONUS_BALANCE_MISMATCH');
      Object.assign(wallet, next, { version: wallet.version + 1, updated_at_ms: createdAt });
      const row = {
        ledger_id: ledgerId, owner_uid: uid, owner_role: role, currency: 'INR', type, direction,
        amount_paise: amount, available_delta_paise: availableDelta, reserved_delta_paise: reservedDelta,
        bonus_minutes_delta: bonusDelta, reserved_bonus_minutes_delta: reservedBonusDelta,
        balance_after_paise: next.available_balance_paise, reserved_balance_after_paise: next.reserved_balance_paise,
        bonus_minutes_balance_after: next.bonus_minutes_balance, reserved_bonus_minutes_after: next.reserved_bonus_minutes,
        idempotency_key: key, reference_type: referenceType, reference_id: referenceId, note,
        metadata_json: metadataJson, status: 'posted', source, created_at_ms: createdAt
      };
      this.ledger.set(ledgerId, row);
      return { success: true, meta: { changes: 1 } };
    }
    throw new Error('FakeD1 does not recognize query: ' + sql);
  }
}

function createFakeFirestore() {
  const records = new Map();
  const collectionMap = name => {
    if (!records.has(name)) records.set(name, new Map());
    return records.get(name);
  };
  const makeRef = (name, id) => ({
    id, path: name + '/' + id,
    async get() {
      const data = collectionMap(name).get(id);
      return { exists: data !== undefined, id, data: () => data === undefined ? undefined : structuredClone(data) };
    }
  });
  const db = {
    collection(name) {
      return {
        doc(id) {
          const ref = makeRef(name, String(id));
          return {
            ...ref,
            async get() { return ref.get(); },
            async set(data, options) {
              const current = collectionMap(name).get(String(id)) || {};
              collectionMap(name).set(String(id), options?.merge ? { ...current, ...structuredClone(data) } : structuredClone(data));
            }
          };
        },
        where(field, op, value) {
          let rows = [...collectionMap(name).entries()].filter(([,data]) => op === '==' && data[field] === value);
          const query = {
            orderBy(fieldName, direction) {
              rows = rows.sort((a,b) => {
                const delta = String(a[1][fieldName] || '').localeCompare(String(b[1][fieldName] || ''));
                return direction === 'desc' ? -delta : delta;
              });
              return query;
            },
            limit(max) { rows = rows.slice(0, max); return query; },
            async get() {
              return { docs: rows.map(([id,data]) => ({ id, data: () => structuredClone(data) })) };
            }
          };
          return query;
        }
      };
    },
    async runTransaction(callback) {
      const pending = [];
      const tx = {
        async get(ref) { return ref.get(); },
        create(ref, data) {
          pending.push({ kind: 'create', ref, data: structuredClone(data) });
        },
        set(ref, data, options) {
          pending.push({ kind: 'set', ref, data: structuredClone(data), merge: options?.merge === true });
        }
      };
      const result = await callback(tx);
      for (const write of pending) {
        const [name, id] = write.ref.path.split('/');
        const collection = collectionMap(name);
        if (write.kind === 'create' && collection.has(id)) throw new Error('ALREADY_EXISTS');
        const current = collection.get(id) || {};
        collection.set(id, write.merge ? { ...current, ...write.data } : write.data);
      }
      return result;
    },
    _records: records
  };
  return db;
}

function fieldValue() {
  return { serverTimestamp: () => new Date().toISOString() };
}

async function runWalletParity(label, createAdapter, seedBonus) {
  const adapter = createAdapter();
  const owner = { ownerUid: 'customer-1', ownerRole: 'customer' };
  await adapter.ensureWallet(owner.ownerUid, owner.ownerRole);

  const first = await adapter.postWalletEntry({
    ...owner, type: 'recharge', direction: 'credit', amountPaise: 5000,
    idempotencyKey: 'recharge:pay-1', referenceType: 'razorpay_payment', referenceId: 'pay-1'
  });
  assert.equal(first.alreadyProcessed, false, label + ': initial credit');
  assert.equal(first.availableBalancePaise ?? first.wallet?.availableBalancePaise, 5000, label + ': credit balance');

  const duplicateCredit = await adapter.postWalletEntry({
    ...owner, type: 'recharge', direction: 'credit', amountPaise: 5000,
    idempotencyKey: 'recharge:pay-1', referenceType: 'razorpay_payment', referenceId: 'pay-1'
  });
  assert.equal(duplicateCredit.alreadyProcessed, true, label + ': duplicate credit');

  await adapter.postWalletEntry({
    ...owner, type: 'manual_debit', direction: 'debit', amountPaise: 1000,
    idempotencyKey: 'manual:1'
  });
  await seedBonus();
  const reserve = await adapter.reserveWallet({
    ...owner, mode: 'call', minutes: 5, ratePerMinutePaise: 1000, sessionId: 'session-1'
  });
  assert.equal(reserve.alreadyProcessed, false, label + ': reserve first run');
  const duplicateReserve = await adapter.reserveWallet({
    ...owner, mode: 'call', minutes: 5, ratePerMinutePaise: 1000, sessionId: 'session-1'
  });
  assert.equal(duplicateReserve.alreadyProcessed, true, label + ': duplicate reserve');

  const settled = await adapter.settleReservation({
    ...owner, sessionId: 'session-1', reservedAmountPaise: 3000,
    reservedBonusMinutes: 2, chargedAmountPaise: 1000, freeMinutesUsed: 1
  });
  assert.equal(settled.alreadyProcessed, false, label + ': settlement first run');
  assert.equal(settled.wallet.availableBalancePaise, 3000, label + ': final available cash');
  assert.equal(settled.wallet.reservedBalancePaise, 0, label + ': final reserved cash');
  assert.equal(settled.wallet.bonusMinutesBalance, 1, label + ': final bonus minutes');
  assert.equal(settled.wallet.reservedBonusMinutes, 0, label + ': final reserved bonus minutes');

  const duplicateSettlement = await adapter.settleReservation({
    ...owner, sessionId: 'session-1', reservedAmountPaise: 3000,
    reservedBonusMinutes: 2, chargedAmountPaise: 1000, freeMinutesUsed: 1
  });
  assert.equal(duplicateSettlement.alreadyProcessed, true, label + ': duplicate settlement');
  assert.equal(duplicateSettlement.wallet.availableBalancePaise, 3000, label + ': duplicate did not mutate');
  const history = await adapter.listTransactions(owner.ownerUid, 100);
  assert.equal(history.length, 7, label + ': seven ledger events recorded');
}

test('D1 Wallet adapter conforms to shared reserve, settlement and idempotency semantics', async () => {
  const db = new FakeD1();
  await runWalletParity('D1', () => createD1WalletAdapter({ db, now: () => 1000 }), async () => {
    db.wallets.get('customer-1').bonus_minutes_balance = 2;
  });
});

test('Firestore Admin Wallet adapter conforms to shared reserve, settlement and idempotency semantics', async () => {
  const db = createFakeFirestore();
  const adapter = createFirestoreWalletAdapter({ db, FieldValue: fieldValue() });
  await runWalletParity('Firestore', () => adapter, async () => {
    await db.collection('smv_wallets').doc('customer-1').set({ bonusMinutesBalance: 2 }, { merge: true });
  });
});
