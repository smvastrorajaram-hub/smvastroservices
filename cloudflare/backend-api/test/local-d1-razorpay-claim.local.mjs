import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { Worker } from 'node:worker_threads';
import { createD1WalletAdapter } from '../../../shared/backend-platform/d1-wallet-adapter.mjs';

async function walk(directory, depth = 0) {
  if (depth > 12) return [];
  let entries;
  try { entries = await readdir(directory, { withFileTypes: true }); }
  catch { return []; }
  const found = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', '.git'].includes(entry.name)) {
        found.push(...await walk(fullPath, depth + 1));
      }
    } else if (/\.(?:sqlite|sqlite3|db)$/i.test(entry.name)) {
      found.push(fullPath);
    }
  }
  return found;
}

function openMigratedLocalD1() {
  const roots = [
    path.resolve(process.cwd(), '.wrangler'),
    path.resolve(process.cwd(), '../.wrangler')
  ];
  return (async () => {
    const files = [...new Set((await Promise.all(roots.map(root => walk(root)))).flat())];
    for (const file of files) {
      let sqlite;
      try {
        sqlite = new DatabaseSync(file);
        const tables = sqlite.prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='smv_domain_razorpay_webhook_events'"
        ).all();
        if (!tables.length) { sqlite.close(); continue; }
        const columns = new Set(sqlite.prepare(
          'PRAGMA table_info(smv_domain_razorpay_webhook_events)'
        ).all().map(row => String(row.name)));
        if (!columns.has('claim_token') || !columns.has('lease_until_ms')) {
          sqlite.close();
          continue;
        }
        return { sqlite, file };
      } catch {
        try { sqlite?.close(); } catch {}
      }
    }
    throw new Error(
      'No migrated Wrangler local D1 SQLite database with Razorpay claim lease columns was found. ' +
      'Run the staging workflow migration step before this test; never point this test at remote Production D1.'
    );
  })();
}


function claimInIndependentWorker({ dbPath, nowMs, input }) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./local-d1-claim-worker.mjs', import.meta.url), {
      workerData: { dbPath, nowMs, input },
      execArgv: []
    });
    let settled = false;
    worker.once('message', message => {
      settled = true;
      if (message?.ok) resolve(message.result);
      else reject(new Error(message?.error || 'Local D1 claim worker failed.'));
    });
    worker.once('error', error => {
      if (!settled) reject(error);
    });
    worker.once('exit', code => {
      if (code !== 0 && !settled) reject(new Error('Local D1 claim worker exited with code ' + code));
    });
  });
}


function finalizeRechargeInIndependentWorker({ dbPath, nowMs, input }) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./local-d1-recharge-worker.mjs', import.meta.url), {
      workerData: { dbPath, nowMs, input },
      execArgv: []
    });
    let settled = false;
    worker.once('message', message => {
      settled = true;
      if (message?.ok) resolve(message.result);
      else reject(new Error(message?.error || 'Local D1 recharge worker failed.'));
    });
    worker.once('error', error => {
      if (!settled) reject(error);
    });
    worker.once('exit', code => {
      if (code !== 0 && !settled) reject(new Error('Local D1 recharge worker exited with code ' + code));
    });
  });
}

function makeD1Binding(sqlite) {
  return {
    prepare(sql) {
      let values = [];
      const statement = {
        bind(...args) { values = args; return statement; },
        async run() {
          const result = sqlite.prepare(sql).run(...values);
          return { success: true, meta: { changes: Number(result.changes || 0) } };
        },
        async first() {
          return sqlite.prepare(sql).get(...values) || null;
        },
        async all() {
          return { success: true, results: sqlite.prepare(sql).all(...values) };
        }
      };
      return statement;
    },
    async batch(statements) {
      sqlite.exec('BEGIN IMMEDIATE');
      try {
        const result = [];
        for (const statement of statements) result.push(await statement.run());
        sqlite.exec('COMMIT');
        return result;
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    }
  };
}

test('local D1 atomically grants one claim to concurrent duplicate webhook deliveries', async () => {
  const { sqlite, file: dbPath } = await openMigratedLocalD1();
  const db = makeD1Binding(sqlite);
  const nowMs = Date.now();
  const adapter = createD1WalletAdapter({ db, now: () => nowMs });
  const eventKey = 'parallel_event_' + crypto.randomUUID();

  try {
    // Every caller opens a separate SQLite connection in a Worker Thread, so
    // lock/claim behavior is exercised across independent concurrent clients.
    const results = await Promise.all(Array.from({ length: 24 }, () => claimInIndependentWorker({
      dbPath,
      nowMs,
      input: {
        eventKey,
        eventType: 'payment.captured',
        paymentId: 'pay_local_fixture',
        orderId: 'order_local_fixture',
        payload: { event: 'payment.captured', fixture: true }
      }
    })));
    const owners = results.filter(result => result.claimToken);
    assert.equal(owners.length, 1, 'only one concurrent delivery may own the event claim');
    assert.equal(results.filter(result => result.inProgress).length, 23);
    const row = sqlite.prepare(
      'SELECT processed,retry_count,claim_token,lease_until_ms FROM smv_domain_razorpay_webhook_events WHERE event_key=?'
    ).get(eventKey);
    assert.equal(Number(row.processed), 0);
    assert.equal(Number(row.retry_count), 1);
    assert.equal(row.claim_token, owners[0].claimToken);
    assert.ok(Number(row.lease_until_ms) > nowMs);

    const staleComplete = await adapter.completeWebhookEvent(eventKey, 'not-the-owner');
    assert.equal(staleComplete.changed, 0, 'a non-owner must not complete the claim');
    const completed = await adapter.completeWebhookEvent(eventKey, owners[0].claimToken);
    assert.equal(completed.changed, 1);
    const replay = await adapter.recordWebhookEvent({
      eventKey, eventType: 'payment.captured', paymentId: 'pay_local_fixture',
      orderId: 'order_local_fixture', payload: { event: 'payment.captured', fixture: true }
    });
    assert.equal(replay.alreadyProcessed, true);
    assert.equal(sqlite.prepare(
      'SELECT COUNT(*) AS count FROM smv_domain_razorpay_webhook_events WHERE event_key=?'
    ).get(eventKey).count, 1);
  } finally {
    sqlite.prepare('DELETE FROM smv_domain_razorpay_webhook_events WHERE event_key=?').run(eventKey);
    sqlite.close();
  }
});

test('local D1 recovers expired claims and rejects stale owners after lease takeover', async () => {
  const { sqlite } = await openMigratedLocalD1();
  const db = makeD1Binding(sqlite);
  let clock = 1_700_000_000_000;
  const adapter = createD1WalletAdapter({ db, now: () => clock });
  const eventKey = 'lease_recovery_' + crypto.randomUUID();

  try {
    const first = await adapter.recordWebhookEvent({
      eventKey, eventType: 'payment.authorized', paymentId: 'pay_local_recovery',
      orderId: 'order_local_recovery', payload: { event: 'payment.authorized', fixture: true }
    });
    assert.ok(first.claimToken);
    clock += 119_999;
    const beforeExpiry = await adapter.recordWebhookEvent({
      eventKey, eventType: 'payment.authorized', paymentId: 'pay_local_recovery',
      orderId: 'order_local_recovery', payload: { event: 'payment.authorized', fixture: true }
    });
    assert.equal(beforeExpiry.inProgress, true);
    assert.equal(beforeExpiry.claimToken, undefined);

    clock += 1;
    const recovered = await adapter.recordWebhookEvent({
      eventKey, eventType: 'payment.authorized', paymentId: 'pay_local_recovery',
      orderId: 'order_local_recovery', payload: { event: 'payment.authorized', fixture: true }
    });
    assert.ok(recovered.claimToken);
    assert.notEqual(recovered.claimToken, first.claimToken);
    assert.equal(recovered.retryCount, 2);
    assert.equal((await adapter.completeWebhookEvent(eventKey, first.claimToken)).changed, 0);
    assert.equal((await adapter.releaseWebhookEvent(eventKey, first.claimToken, 'stale worker')).changed, 0);
    assert.equal((await adapter.completeWebhookEvent(eventKey, recovered.claimToken)).changed, 1);
    const row = sqlite.prepare(
      'SELECT processed,retry_count,claim_token FROM smv_domain_razorpay_webhook_events WHERE event_key=?'
    ).get(eventKey);
    assert.equal(Number(row.processed), 1);
    assert.equal(Number(row.retry_count), 2);
    assert.equal(row.claim_token, null);
  } finally {
    sqlite.prepare('DELETE FROM smv_domain_razorpay_webhook_events WHERE event_key=?').run(eventKey);
    sqlite.close();
  }
});


test('local D1 serializes concurrent payment replay without double-crediting the Wallet', async () => {
  const { sqlite, file: dbPath } = await openMigratedLocalD1();
  const db = makeD1Binding(sqlite);
  const nowMs = Date.now();
  const adapter = createD1WalletAdapter({ db, now: () => nowMs });
  const ownerUid = 'local_replay_customer_' + crypto.randomUUID();
  const rechargeId = 'local_recharge_' + crypto.randomUUID();
  const orderId = 'local_order_' + crypto.randomUUID();
  const paymentId = 'local_payment_' + crypto.randomUUID();
  const input = {
    ownerUid, rechargeId, orderId, paymentId,
    amountPaise: 5000, currency: 'INR', source: 'local_d1_replay_test'
  };

  try {
    await adapter.ensureWallet(ownerUid, 'customer');
    sqlite.prepare(
      `INSERT INTO smv_domain_wallet_recharges
       (recharge_id,customer_uid,amount_paise,currency,status,razorpay_order_id,
        payload_json,created_at_ms,updated_at_ms)
       VALUES (?,?,?,'INR','order_created',?,'{}',?,?)`
    ).run(rechargeId, ownerUid, 5000, orderId, nowMs, nowMs);
    sqlite.prepare(
      `INSERT INTO smv_domain_razorpay_orders
       (order_id,owner_uid,service_name,amount_paise,currency,status,payment_id,
        payload_json,created_at_ms,updated_at_ms)
       VALUES (?,?,'SMV ASTRO Wallet Recharge',?,'INR','created',NULL,?,?,?)`
    ).run(orderId, ownerUid, 5000, JSON.stringify({ rechargeId, receipt: 'local-d1-fixture' }), nowMs, nowMs);

    const results = await Promise.all([
      finalizeRechargeInIndependentWorker({ dbPath, nowMs, input }),
      finalizeRechargeInIndependentWorker({ dbPath, nowMs, input })
    ]);
    assert.ok(results.every(result => result.success === true));
    assert.equal(results.filter(result => result.alreadyProcessed === false).length, 1,
      'exactly one finalizer should perform the first credit');
    assert.equal(results.filter(result => result.alreadyProcessed === true).length, 1,
      'the competing finalizer should observe the committed payment or safely reconcile the race');

    const wallet = sqlite.prepare(
      'SELECT available_balance_paise,reserved_balance_paise,bonus_minutes_balance,reserved_bonus_minutes FROM smv_domain_wallets WHERE owner_uid=?'
    ).get(ownerUid);
    const recharge = sqlite.prepare(
      'SELECT status,razorpay_payment_id FROM smv_domain_wallet_recharges WHERE recharge_id=?'
    ).get(rechargeId);
    const ledger = sqlite.prepare(
      `SELECT COUNT(*) AS count,COALESCE(SUM(available_delta_paise),0) AS cash_delta
       FROM smv_domain_wallet_ledger WHERE owner_uid=? AND type='recharge'`
    ).get(ownerUid);
    assert.equal(Number(wallet.available_balance_paise), 5000);
    assert.equal(Number(wallet.reserved_balance_paise), 0);
    assert.equal(Number(wallet.bonus_minutes_balance), 0);
    assert.equal(Number(wallet.reserved_bonus_minutes), 0);
    assert.equal(recharge.status, 'paid');
    assert.equal(recharge.razorpay_payment_id, paymentId);
    assert.equal(Number(ledger.count), 1);
    assert.equal(Number(ledger.cash_delta), 5000);

    const replay = await adapter.finalizeRecharge(input);
    assert.equal(replay.alreadyProcessed, true);
    assert.equal(Number(sqlite.prepare(
      'SELECT available_balance_paise FROM smv_domain_wallets WHERE owner_uid=?'
    ).get(ownerUid).available_balance_paise), 5000);
    assert.equal(Number(sqlite.prepare(
      "SELECT COUNT(*) AS count FROM smv_domain_wallet_ledger WHERE owner_uid=? AND type='recharge'"
    ).get(ownerUid).count), 1);
  } finally {
    sqlite.exec('BEGIN IMMEDIATE');
    try {
      sqlite.prepare('DELETE FROM smv_domain_wallet_ledger WHERE owner_uid=?').run(ownerUid);
      sqlite.prepare('DELETE FROM smv_domain_razorpay_orders WHERE order_id=?').run(orderId);
      sqlite.prepare('DELETE FROM smv_domain_wallet_recharges WHERE recharge_id=?').run(rechargeId);
      sqlite.prepare('DELETE FROM smv_domain_wallets WHERE owner_uid=?').run(ownerUid);
      sqlite.exec('COMMIT');
    } catch (error) {
      sqlite.exec('ROLLBACK');
      throw error;
    } finally {
      sqlite.close();
    }
  }
});
