import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { Worker } from 'node:worker_threads';
import { webcrypto } from 'node:crypto';
import { createD1WalletAdapter } from '../../../shared/backend-platform/d1-wallet-adapter.mjs';
import { createD1LiveSessionService } from '../../../shared/backend-platform/d1-live-session-service.mjs';
import { createD1WithdrawalService } from '../../../shared/backend-platform/d1-live-withdrawal-service.mjs';
import { registerWalletRechargeRoutes } from '../src/wallet-recharge-routes.mjs';
import { LiveSessionCoordinator } from '../src/live-session-coordinator.mjs';

const RELEASE_GUARD = 'smv_domain_live_booking_release_pending_validate';

async function walk(directory, depth = 0) {
  if (depth > 12) return [];
  let entries;
  try { entries = await readdir(directory, { withFileTypes: true }); } catch { return []; }
  const found = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', '.git'].includes(entry.name)) found.push(...await walk(fullPath, depth + 1));
    } else if (/\.(?:sqlite|sqlite3|db)$/i.test(entry.name)) found.push(fullPath);
  }
  return found;
}

async function openMigratedLocalD1() {
  const roots = [path.resolve(process.cwd(), '.wrangler'), path.resolve(process.cwd(), '../.wrangler')];
  const files = [...new Set((await Promise.all(roots.map(root => walk(root)))).flat())];
  for (const file of files) {
    let sqlite;
    try {
      sqlite = new DatabaseSync(file);
      const table = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='smv_domain_live_sessions'").all();
      const guard = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='trigger' AND name=?").get(RELEASE_GUARD);
      if (table.length && guard) {
        sqlite.exec('PRAGMA busy_timeout=10000');
        return { sqlite, file };
      }
      sqlite.close();
    } catch { try { sqlite?.close(); } catch {} }
  }
  throw new Error('No ephemeral Wrangler local D1 with migration 0011 was found. Apply all migrations with Wrangler --local; never use remote/Production D1.');
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
        async first() { return sqlite.prepare(sql).get(...values) || null; },
        async all() { return { success: true, results: sqlite.prepare(sql).all(...values) }; }
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

function runWorker(workerData) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./local-d1-live-invariant-worker.mjs', import.meta.url), { workerData, execArgv: [] });
    let received = false;
    worker.once('message', message => { received = true; resolve(message); });
    worker.once('error', error => { if (!received) reject(error); });
    worker.once('exit', code => {
      if (code !== 0 && !received) reject(new Error('Live invariant worker exited with code ' + code));
    });
  });
}

function id(prefix) { return prefix + '_' + webcrypto.randomUUID().replaceAll('-', ''); }

function seedWallet(sqlite, uid, role, available, bonus, nowMs) {
  sqlite.prepare(
    `INSERT INTO smv_domain_wallets
     (owner_uid,owner_role,currency,available_balance_paise,reserved_balance_paise,
      bonus_minutes_balance,reserved_bonus_minutes,version,created_at_ms,updated_at_ms)
     VALUES (?,?,'INR',?,0,?,0,1,?,?)`
  ).run(uid, role, available, bonus, nowMs, nowMs);
}

function insertLedger(sqlite, row) {
  sqlite.prepare(
    `INSERT INTO smv_domain_wallet_ledger
     (ledger_id,owner_uid,owner_role,currency,type,direction,amount_paise,
      available_delta_paise,reserved_delta_paise,bonus_minutes_delta,reserved_bonus_minutes_delta,
      idempotency_key,reference_type,reference_id,note,metadata_json,status,source,created_at_ms)
     VALUES (?,?,?,'INR',?,?,?,?,?,?,?,?,?,?,?,'{}','posted','local_d1_test',?)`
  ).run(row.ledgerId,row.ownerUid,row.ownerRole,row.type,row.direction,row.amountPaise,
    row.availableDeltaPaise,row.reservedDeltaPaise,row.bonusMinutesDelta||0,
    row.reservedBonusMinutesDelta||0,row.idempotencyKey,row.referenceType,row.referenceId,
    row.note||'local D1 invariant test',row.createdAtMs);
}

function cleanupFixture(sqlite, options = {}) {
  const { uids = [], references = [], sessions = [], bookings = [], orders = [], recharges = [], eventKeys = [] } = options;
  sqlite.exec('BEGIN IMMEDIATE');
  try {
    for (const key of eventKeys) sqlite.prepare('DELETE FROM smv_domain_razorpay_webhook_events WHERE event_key=?').run(key);
    for (const uid of uids) sqlite.prepare('DELETE FROM smv_domain_wallet_ledger WHERE owner_uid=?').run(uid);
    for (const ref of references) {
      sqlite.prepare('DELETE FROM smv_domain_wallet_ledger WHERE reference_id=?').run(ref);
      sqlite.prepare('DELETE FROM smv_domain_earnings WHERE reference_id=?').run(ref);
    }
    for (const bookingId of bookings) sqlite.prepare('DELETE FROM smv_domain_live_bookings WHERE booking_id=?').run(bookingId);
    for (const sessionId of sessions) {
      sqlite.prepare('DELETE FROM smv_domain_live_connections WHERE session_id=?').run(sessionId);
      sqlite.prepare('DELETE FROM smv_domain_live_sessions WHERE session_id=?').run(sessionId);
    }
    for (const orderId of orders) sqlite.prepare('DELETE FROM smv_domain_razorpay_orders WHERE order_id=?').run(orderId);
    for (const rechargeId of recharges) sqlite.prepare('DELETE FROM smv_domain_wallet_recharges WHERE recharge_id=?').run(rechargeId);
    for (const uid of uids) sqlite.prepare('DELETE FROM smv_domain_wallets WHERE owner_uid=?').run(uid);
    sqlite.exec('COMMIT');
  } catch (error) {
    sqlite.exec('ROLLBACK');
    throw error;
  }
}

test('local D1 enforces per-Astrologer Live capacity under independent concurrent writers', async () => {
  const { sqlite, file: dbPath } = await openMigratedLocalD1();
  const nowMs = Date.now(), astrologerUid = id('cap_astro');
  const customers = Array.from({ length: 8 }, () => id('cap_customer'));
  const sessionIds = customers.map(() => id('cap_session'));
  const previous = sqlite.prepare('SELECT payload_json,source_update_time_ms,updated_at_ms FROM smv_domain_settings WHERE setting_id=?').get('liveSessionPricing');
  try {
    sqlite.prepare(
      `INSERT INTO smv_domain_settings(setting_id,payload_json,source_update_time_ms,updated_at_ms)
       VALUES ('liveSessionPricing',?,?,?)
       ON CONFLICT(setting_id) DO UPDATE SET payload_json=excluded.payload_json,
       source_update_time_ms=excluded.source_update_time_ms,updated_at_ms=excluded.updated_at_ms`
    ).run(JSON.stringify({ maxConcurrentSessions: 2, callRatePaise: 1000, chatRatePaise: 1000 }), nowMs, nowMs);
    for (const uid of customers) seedWallet(sqlite, uid, 'customer', 10000, 0, nowMs);

    const results = await Promise.all(customers.map((customerUid, index) => runWorker({
      action: 'capacity-insert', dbPath, nowMs, customerUid, astrologerUid,
      sessionId: sessionIds[index], amountPaise: 1000
    })));
    const winners = results.filter(result => result.inserted === true);
    const losers = results.filter(result => result.inserted === false);
    assert.equal(winners.length, 2, 'exactly two sessions must fit the configured capacity');
    assert.equal(losers.length, 6, 'all additional concurrent sessions must be rejected');
    assert.ok(losers.every(result => String(result.error || '').includes('LIVE_ASTROLOGER_BUSY')),
      'each rejected request must fail at the database capacity guard');
    const active = sqlite.prepare(
      "SELECT COUNT(*) AS total FROM smv_domain_live_sessions WHERE astrologer_uid=? AND state IN ('ringing','preparing','connecting','active')"
    ).get(astrologerUid);
    const reserves = sqlite.prepare(
      "SELECT COUNT(*) AS total FROM smv_domain_wallet_ledger WHERE reference_type='live_session' AND reference_id IN (" +
      sessionIds.map(() => '?').join(',') + ") AND type='live_session_reserve'"
    ).get(...sessionIds);
    assert.equal(Number(active.total), 2);
    assert.equal(Number(reserves.total), 2, 'the reserve from every rejected request must roll back with its session insert');
    for (const uid of customers) {
      const wallet = sqlite.prepare('SELECT available_balance_paise,reserved_balance_paise FROM smv_domain_wallets WHERE owner_uid=?').get(uid);
      const won = winners.some(result => result.customerUid === uid);
      assert.equal(Number(wallet.available_balance_paise), won ? 9000 : 10000);
      assert.equal(Number(wallet.reserved_balance_paise), won ? 1000 : 0);
    }
  } finally {
    cleanupFixture(sqlite, { uids: customers, sessions: sessionIds, references: sessionIds });
    if (!previous) sqlite.prepare('DELETE FROM smv_domain_settings WHERE setting_id=?').run('liveSessionPricing');
    else sqlite.prepare('UPDATE smv_domain_settings SET payload_json=?,source_update_time_ms=?,updated_at_ms=? WHERE setting_id=?')
      .run(previous.payload_json, previous.source_update_time_ms, previous.updated_at_ms, 'liveSessionPricing');
    sqlite.close();
  }
});

test('local D1 blocks stale booking cancellation/expiry release after accept transferred the reserve', async () => {
  const { sqlite } = await openMigratedLocalD1();
  const nowMs = Date.now(), customerUid = id('booking_customer');
  const astrologerUid = id('booking_astro'), adminUid = id('booking_admin'), bookingId = id('booking');
  seedWallet(sqlite, customerUid, 'customer', 10000, 2, nowMs);
  try {
    sqlite.exec('BEGIN IMMEDIATE');
    insertLedger(sqlite, {
      ledgerId: id('booking_reserve_ledger'), ownerUid: customerUid, ownerRole: 'customer',
      type: 'live_booking_reserve', direction: 'reserve', amountPaise: 3000,
      availableDeltaPaise: -3000, reservedDeltaPaise: 3000,
      bonusMinutesDelta: -2, reservedBonusMinutesDelta: 2,
      idempotencyKey: 'live-booking:' + bookingId, referenceType: 'live_booking',
      referenceId: bookingId, createdAtMs: nowMs
    });
    const bookingPayload = {
      id: bookingId, customerUid, astrologerUid, mode: 'chat', minutes: 5,
      ratePerMinutePaise: 1000, reservedAmountPaise: 3000, reservedBonusMinutes: 2,
      walletReservationState: 'reserved', origin: 'offline_queue',
      createdAtMs: nowMs, expiresAtMs: nowMs + 86400000
    };
    sqlite.prepare(
      `INSERT INTO smv_domain_live_bookings
       (booking_id,customer_uid,astrologer_uid,mode,status,wallet_reservation_state,
        reserved_amount_paise,reserved_bonus_minutes,expires_at_ms,payload_json,created_at_ms,updated_at_ms)
       VALUES (?,?,?,'chat','pending','reserved',?,?,?,?,?,?)`
    ).run(bookingId,customerUid,astrologerUid,3000,2,nowMs+86400000,JSON.stringify(bookingPayload),nowMs,nowMs);
    const sessionPayload = {
      ...bookingPayload, id: bookingId, sessionId: bookingId,
      state: 'preparing', origin: 'accepted_booking', walletReservationState: 'transferred',
      acceptedAtMs: nowMs, customerReady: false, astrologerReady: false
    };
    sqlite.prepare(
      `INSERT INTO smv_domain_live_sessions
       (session_id,customer_uid,astrologer_uid,mode,state,appointment_id,
        reserved_amount_paise,reserved_bonus_minutes,actual_charge_paise,
        started_at_ms,ended_at_ms,settlement_operation_id,payload_json,created_at_ms,updated_at_ms)
       VALUES (?,?,?,'chat','preparing',NULL,?,?,0,NULL,NULL,NULL,?,?,?)`
    ).run(bookingId,customerUid,astrologerUid,3000,2,JSON.stringify(sessionPayload),nowMs,nowMs);
    sqlite.prepare(
      `UPDATE smv_domain_live_bookings SET status='accepted',wallet_reservation_state='transferred',payload_json=?,updated_at_ms=?
       WHERE booking_id=? AND status='pending' AND wallet_reservation_state='reserved'`
    ).run(JSON.stringify({ ...bookingPayload, status: 'accepted', walletReservationState: 'transferred', sessionId: bookingId }),nowMs,bookingId);
    sqlite.exec('COMMIT');

    for (const kind of ['live_booking_unused_release','live_booking_bonus_release']) {
      sqlite.exec('BEGIN IMMEDIATE');
      try {
        const cash = kind === 'live_booking_unused_release';
        insertLedger(sqlite, {
          ledgerId: id('stale_release'), ownerUid: customerUid, ownerRole: 'customer',
          type: kind, direction: 'credit', amountPaise: cash ? 3000 : 0,
          availableDeltaPaise: cash ? 3000 : 0, reservedDeltaPaise: cash ? -3000 : 0,
          bonusMinutesDelta: cash ? 0 : 2, reservedBonusMinutesDelta: cash ? 0 : -2,
          idempotencyKey: id('stale_idempotency'), referenceType: 'live_booking',
          referenceId: bookingId, createdAtMs: nowMs + 1
        });
        sqlite.exec('ROLLBACK');
        assert.fail('A stale cancellation/expiry writer must not release an accepted booking reserve.');
      } catch (error) {
        try { sqlite.exec('ROLLBACK'); } catch {}
        assert.match(String(error.message), /LIVE_BOOKING_RELEASE_NOT_PENDING/);
      }
    }
    const booking = sqlite.prepare('SELECT status,wallet_reservation_state FROM smv_domain_live_bookings WHERE booking_id=?').get(bookingId);
    const wallet = sqlite.prepare('SELECT available_balance_paise,reserved_balance_paise,bonus_minutes_balance,reserved_bonus_minutes FROM smv_domain_wallets WHERE owner_uid=?').get(customerUid);
    const releaseRows = sqlite.prepare(
      "SELECT COUNT(*) AS total FROM smv_domain_wallet_ledger WHERE reference_id=? AND type IN ('live_booking_unused_release','live_booking_bonus_release')"
    ).get(bookingId);
    assert.equal(booking.status, 'accepted');
    assert.equal(booking.wallet_reservation_state, 'transferred');
    assert.equal(Number(wallet.available_balance_paise), 7000);
    assert.equal(Number(wallet.reserved_balance_paise), 3000);
    assert.equal(Number(wallet.bonus_minutes_balance), 0);
    assert.equal(Number(wallet.reserved_bonus_minutes), 2);
    assert.equal(Number(releaseRows.total), 0);

    // The accepted scheduled booking follows the same D1 settlement path as
    // a direct Call Now / Chat Now session. Three connected started minutes
    // consume two reserved bonus minutes and credit one paid minute (₹10 gross,
    // 20% Astrologer commission, 80% Admin commission).
    const activePayload = {
      ...sessionPayload,state:'active',startedAtMs:nowMs,
      astrologerCommissionPercent:20,adminCommissionPercent:80,
      customerReady:true,astrologerReady:true
    };
    sqlite.prepare(
      `UPDATE smv_domain_live_sessions
       SET state='active',started_at_ms=?,payload_json=?,updated_at_ms=?
       WHERE session_id=? AND state='preparing'`
    ).run(nowMs,JSON.stringify(activePayload),nowMs,bookingId);
    const liveService=makeService(sqlite,nowMs+180000,adminUid);
    const settled=await liveService.endSession({
      sessionId:bookingId,reason:'participant_ended',system:true
    });
    assert.equal(settled.session.state,'ended');
    const settledRow=sqlite.prepare('SELECT payload_json FROM smv_domain_live_sessions WHERE session_id=?').get(bookingId);
    assert.equal(JSON.parse(settledRow.payload_json).origin,'accepted_booking');
    assert.equal(settled.session.actualChargePaise,1000);
    assert.equal(settled.session.freeMinutesUsed,2);

    const earning=sqlite.prepare(
      'SELECT gross_amount_paise,astrologer_amount_paise,admin_amount_paise,status FROM smv_domain_earnings WHERE reference_id=?'
    ).get(bookingId);
    assert.equal(Number(earning.gross_amount_paise),1000);
    assert.equal(Number(earning.astrologer_amount_paise),200);
    assert.equal(Number(earning.admin_amount_paise),800);
    assert.equal(earning.status,'credited');

    const earningsService=createD1WithdrawalService({
      db:makeD1Binding(sqlite),
      firestore:{
        async runQuery(){return [];},
        async getDocument(){return {exists:false,data:null};}
      },
      now:()=>nowMs+180001,cryptoImpl:webcrypto,
      payoutEncryptionKey:Buffer.from('01234567890123456789012345678901').toString('base64'),
      payoutKeyVersion:'v1',sourceProjectId:'smv-astro'
    });
    const dashboard=await earningsService.getEarningsDashboard(astrologerUid);
    assert.equal(dashboard.totalEarnings,2);
    assert.equal(dashboard.ledger.length,1);
    assert.equal(dashboard.ledger[0].id,bookingId);
    assert.equal(dashboard.ledger[0].commission,2);
  } finally {
    cleanupFixture(sqlite, { uids: [customerUid, astrologerUid, adminUid], sessions: [bookingId], bookings: [bookingId], references: [bookingId] });
    sqlite.close();
  }
});

function makeService(sqlite, nowMs, adminUid) {
  const db = makeD1Binding(sqlite);
  const walletAdapter = createD1WalletAdapter({ db, now: () => nowMs, cryptoImpl: webcrypto });
  const firestore = { async getDocument() { return { exists: false, data: {} }; } };
  return createD1LiveSessionService({ db, walletAdapter, firestore, adminWalletUid: adminUid, cryptoImpl: webcrypto, now: () => nowMs });
}

test('local D1 rolls back failed Live settlement and serializes two competing settlement attempts', async () => {
  const { sqlite, file: dbPath } = await openMigratedLocalD1();
  const nowMs = 1800000000000, customerUid = id('settlement_customer');
  const astrologerUid = id('settlement_astro'), adminUid = id('settlement_admin');
  const sessionId = id('settlement_session');
  seedWallet(sqlite, customerUid, 'customer', 10000, 0, nowMs);
  try {
    sqlite.exec('BEGIN IMMEDIATE');
    insertLedger(sqlite, {
      ledgerId: id('settlement_reserve'), ownerUid: customerUid, ownerRole: 'customer',
      type: 'live_session_reserve', direction: 'reserve', amountPaise: 5000,
      availableDeltaPaise: -5000, reservedDeltaPaise: 5000,
      idempotencyKey: 'live-session:' + sessionId, referenceType: 'live_session',
      referenceId: sessionId, createdAtMs: nowMs
    });
    const payload = {
      id: sessionId, sessionId, origin: 'direct', customerUid, astrologerUid,
      mode: 'chat', minutes: 5, ratePerMinutePaise: 1000,
      reservedAmountPaise: 5000, reservedBonusMinutes: 0,
      startedAtMs: nowMs - 60000, createdAtMs: nowMs - 60000, updatedAtMs: nowMs,
      astrologerCommissionPercent: 20, adminCommissionPercent: 80,
      customerReady: true, astrologerReady: true
    };
    sqlite.prepare(
      `INSERT INTO smv_domain_live_sessions
       (session_id,customer_uid,astrologer_uid,mode,state,appointment_id,
        reserved_amount_paise,reserved_bonus_minutes,actual_charge_paise,
        started_at_ms,ended_at_ms,settlement_operation_id,payload_json,created_at_ms,updated_at_ms)
       VALUES (?,?,?,'chat','active',NULL,?,0,0,?,NULL,NULL,?,?,?)`
    ).run(sessionId,customerUid,astrologerUid,5000,nowMs-60000,JSON.stringify(payload),nowMs-60000,nowMs);
    sqlite.exec('COMMIT');

    sqlite.prepare(
      `CREATE TRIGGER test_force_live_earning_rollback
       BEFORE INSERT ON smv_domain_earnings
       WHEN NEW.reference_id='` + sessionId + `'
       BEGIN SELECT RAISE(ABORT,'TEST_FORCED_SETTLEMENT_ROLLBACK'); END`
    ).run();
    const service = makeService(sqlite, nowMs, adminUid);
    await assert.rejects(service.endSession({ sessionId, reason: 'participant_ended', system: true }), /TEST_FORCED_SETTLEMENT_ROLLBACK/);
    const after = sqlite.prepare('SELECT state,actual_charge_paise FROM smv_domain_live_sessions WHERE session_id=?').get(sessionId);
    const walletAfter = sqlite.prepare('SELECT available_balance_paise,reserved_balance_paise FROM smv_domain_wallets WHERE owner_uid=?').get(customerUid);
    const posted = sqlite.prepare("SELECT COUNT(*) AS total FROM smv_domain_wallet_ledger WHERE reference_id=? AND type<>'live_session_reserve'").get(sessionId);
    assert.equal(after.state, 'active');
    assert.equal(Number(after.actual_charge_paise), 0);
    assert.equal(Number(walletAfter.available_balance_paise), 5000);
    assert.equal(Number(walletAfter.reserved_balance_paise), 5000);
    assert.equal(Number(posted.total), 0);

    sqlite.exec('DROP TRIGGER test_force_live_earning_rollback');
    const outcomes = await Promise.all([
      runWorker({ action: 'end-live-session', dbPath, nowMs, sessionId, adminUid }),
      runWorker({ action: 'end-live-session', dbPath, nowMs, sessionId, adminUid })
    ]);
    assert.ok(outcomes.every(item => item.ok === true), JSON.stringify(outcomes));
    assert.equal(outcomes.filter(item => item.result?.alreadyProcessed === false).length, 1);
    assert.equal(outcomes.filter(item => item.result?.alreadyProcessed === true).length, 1);
    const ended = sqlite.prepare('SELECT state,actual_charge_paise,settlement_operation_id FROM smv_domain_live_sessions WHERE session_id=?').get(sessionId);
    assert.equal(ended.state, 'ended');
    assert.equal(Number(ended.actual_charge_paise), 1000);
    assert.equal(ended.settlement_operation_id, 'live-session-settle:' + sessionId);
    const customerWallet = sqlite.prepare('SELECT available_balance_paise,reserved_balance_paise FROM smv_domain_wallets WHERE owner_uid=?').get(customerUid);
    const astroWallet = sqlite.prepare('SELECT available_balance_paise FROM smv_domain_wallets WHERE owner_uid=?').get(astrologerUid);
    const adminWallet = sqlite.prepare('SELECT available_balance_paise FROM smv_domain_wallets WHERE owner_uid=?').get(adminUid);
    assert.equal(Number(customerWallet.available_balance_paise), 9000);
    assert.equal(Number(customerWallet.reserved_balance_paise), 0);
    assert.equal(Number(astroWallet.available_balance_paise), 200);
    assert.equal(Number(adminWallet.available_balance_paise), 800);
    assert.equal(Number(sqlite.prepare('SELECT COUNT(*) AS total FROM smv_domain_earnings WHERE reference_id=?').get(sessionId).total), 1);

    const earningsReader=createD1WithdrawalService({
      db:makeD1Binding(sqlite),
      firestore:{
        async runQuery(){return [];},
        async getDocument(){return {exists:false,data:null};}
      },
      now:()=>nowMs+1,cryptoImpl:webcrypto,
      payoutEncryptionKey:Buffer.from('01234567890123456789012345678901').toString('base64'),
      payoutKeyVersion:'v1',sourceProjectId:'smv-astro'
    });
    const earnings=await earningsReader.getEarningsDashboard(astrologerUid);
    assert.equal(earnings.totalEarnings,2);
    assert.equal(earnings.ledger.length,1);
    assert.equal(earnings.ledger[0].id,sessionId);
    assert.equal(earnings.ledger[0].commission,2);

    for (const type of ['live_session_usage','live_session_unused_release','live_session_earning','live_session_admin_commission']) {
      assert.equal(Number(sqlite.prepare('SELECT COUNT(*) AS total FROM smv_domain_wallet_ledger WHERE reference_id=? AND type=?').get(sessionId,type).total), 1);
    }
  } finally {
    try { sqlite.exec('DROP TRIGGER IF EXISTS test_force_live_earning_rollback'); } catch {}
    cleanupFixture(sqlite, { uids: [customerUid, astrologerUid, adminUid], sessions: [sessionId], references: [sessionId] });
    sqlite.close();
  }
});

function routeApp() {
  const handlers = new Map();
  return { handlers, post(route, handler) { handlers.set(route, handler); } };
}
function routeRequest(body = {}, headers = {}) {
  const normalized = Object.fromEntries(Object.entries(headers).map(([key,value]) => [key.toLowerCase(),value]));
  return { body, get(name) { return normalized[String(name).toLowerCase()] || ''; } };
}
function routeResponse() {
  return {
    statusCode: 200, headers: {}, body: null,
    status(code) { this.statusCode = code; return this; },
    set(name,value) {
      if (typeof name === 'object') Object.assign(this.headers,name);
      else this.headers[name] = value;
      return this;
    },
    json(body) { this.body = body; return this; },
    send(body) { this.body = body; return this; }
  };
}

test('local D1 rejects payment signature/order/amount/currency mismatches and credits only one valid webhook replay', async () => {
  const { sqlite } = await openMigratedLocalD1();
  const nowMs = Date.now(), ownerUid = id('payment_customer');
  const rechargeId = id('payment_recharge'), orderId = id('payment_order');
  const paymentId = id('payment_id'), eventId = id('payment_event');
  const eventKey = 'razorpay_' + eventId, amountPaise = 5000;
  const db = makeD1Binding(sqlite);
  const walletAdapter = createD1WalletAdapter({ db, now: () => nowMs, cryptoImpl: webcrypto });
  let paymentSignatureValid = true, webhookSignatureValid = true;
  let payment = { id: paymentId, order_id: orderId, amount: amountPaise, currency: 'INR', status: 'captured' };
  let fetchCount = 0;
  const razorpay = {
    async createOrder() { return { id: orderId }; },
    async verifyPaymentSignature() { return paymentSignatureValid; },
    async verifyWebhookSignature() { return webhookSignatureValid; },
    async fetchPayment() { fetchCount += 1; return payment; },
    async capturePayment() { return payment; }
  };
  await walletAdapter.ensureWallet(ownerUid, 'customer');
  sqlite.prepare(
    `INSERT INTO smv_domain_wallet_recharges
     (recharge_id,customer_uid,amount_paise,currency,status,razorpay_order_id,payload_json,created_at_ms,updated_at_ms)
     VALUES (?,?,?,'INR','order_created',?,'{}',?,?)`
  ).run(rechargeId,ownerUid,amountPaise,orderId,nowMs,nowMs);
  sqlite.prepare(
    `INSERT INTO smv_domain_razorpay_orders
     (order_id,owner_uid,service_name,amount_paise,currency,status,payment_id,payload_json,created_at_ms,updated_at_ms)
     VALUES (?,?,'SMV ASTRO Wallet Recharge',?,'INR','created',NULL,?,?,?)`
  ).run(orderId,ownerUid,amountPaise,JSON.stringify({ rechargeId }),nowMs,nowMs);
  const app = routeApp();
  registerWalletRechargeRoutes({
    app,
    identityService: { async authenticateAuthorization() { return { uid: ownerUid, role: 'customer' }; } },
    walletAdapter, razorpay, razorpayKeyId: 'rzp_test_local_only',
    razorpayWebhookSecret: 'local-webhook-secret-only',
    isReady: async () => true, cryptoImpl: webcrypto
  });
  const verifyPath = '/wallet/recharge/verify', webhookPath = '/wallet/recharge/webhook';
  const verifyBody = { rechargeId, razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: 'test-signature' };
  const eventBody = new TextEncoder().encode(JSON.stringify({
    event: 'payment.captured',
    payload: { payment: { entity: { id: paymentId, order_id: orderId } } }
  }));
  const webhookHeaders = { 'X-Razorpay-Signature': 'valid-webhook', 'X-Razorpay-Event-Id': eventId };

  try {
    let response = routeResponse();
    await app.handlers.get(verifyPath)(routeRequest({ ...verifyBody, razorpay_order_id: id('wrong_order') }),response);
    assert.equal(response.statusCode,409);
    assert.equal(response.body.code,'WALLET_ORDER_MISMATCH');

    paymentSignatureValid = false;
    const beforeFetch = fetchCount;
    response = routeResponse();
    await app.handlers.get(verifyPath)(routeRequest(verifyBody),response);
    assert.equal(response.statusCode,400);
    assert.equal(response.body.code,'RAZORPAY_SIGNATURE_INVALID');
    assert.equal(fetchCount,beforeFetch);

    paymentSignatureValid = true;
    payment = { ...payment, amount: amountPaise - 1 };
    response = routeResponse();
    await app.handlers.get(verifyPath)(routeRequest(verifyBody),response);
    assert.equal(response.statusCode,409);
    assert.equal(response.body.code,'WALLET_PAYMENT_MISMATCH');

    payment = { ...payment, id: id('wrong_provider_payment'), amount: amountPaise, currency: 'INR' };
    response = routeResponse();
    await app.handlers.get(verifyPath)(routeRequest(verifyBody),response);
    assert.equal(response.statusCode,409);
    assert.equal(response.body.code,'WALLET_PAYMENT_MISMATCH');

    payment = { ...payment, amount: amountPaise, currency: 'USD' };
    response = routeResponse();
    await app.handlers.get(verifyPath)(routeRequest(verifyBody),response);
    assert.equal(response.statusCode,409);
    assert.equal(response.body.code,'WALLET_PAYMENT_MISMATCH');

    webhookSignatureValid = false;
    response = routeResponse();
    await app.handlers.get(webhookPath)(routeRequest(eventBody,{
      'X-Razorpay-Signature':'invalid-webhook','X-Razorpay-Event-Id':eventId
    }),response);
    assert.equal(response.statusCode,401);
    assert.equal(Number(sqlite.prepare('SELECT COUNT(*) AS total FROM smv_domain_razorpay_webhook_events WHERE event_key=?').get(eventKey).total),0);

    webhookSignatureValid = true;
    payment = { id:paymentId,order_id:orderId,amount:amountPaise-1,currency:'INR',status:'captured' };
    response = routeResponse();
    await app.handlers.get(webhookPath)(routeRequest(eventBody,webhookHeaders),response);
    assert.equal(response.statusCode,500);
    const unprocessed = sqlite.prepare('SELECT processed,claim_token,lease_until_ms FROM smv_domain_razorpay_webhook_events WHERE event_key=?').get(eventKey);
    assert.equal(Number(unprocessed.processed),0);
    assert.equal(unprocessed.claim_token,null);
    assert.equal(Number(unprocessed.lease_until_ms),0);
    assert.equal((await walletAdapter.getWallet(ownerUid)).availableBalancePaise,0);
    assert.equal(Number(sqlite.prepare("SELECT COUNT(*) AS total FROM smv_domain_wallet_ledger WHERE owner_uid=? AND type='recharge'").get(ownerUid).total),0);

    payment = { id:id('wrong_provider_payment'),order_id:orderId,amount:amountPaise,currency:'INR',status:'captured' };
    response = routeResponse();
    await app.handlers.get(webhookPath)(routeRequest(eventBody,webhookHeaders),response);
    assert.equal(response.statusCode,500);
    const wrongProviderPayment = sqlite.prepare('SELECT processed,claim_token,lease_until_ms FROM smv_domain_razorpay_webhook_events WHERE event_key=?').get(eventKey);
    assert.equal(Number(wrongProviderPayment.processed),0);
    assert.equal(wrongProviderPayment.claim_token,null);
    assert.equal(Number(wrongProviderPayment.lease_until_ms),0);
    assert.equal((await walletAdapter.getWallet(ownerUid)).availableBalancePaise,0);

    payment = { id:paymentId,order_id:orderId,amount:amountPaise,currency:'INR',status:'captured' };
    response = routeResponse();
    await app.handlers.get(webhookPath)(routeRequest(eventBody,webhookHeaders),response);
    assert.equal(response.statusCode,200);
    assert.equal(response.body,'OK');
    assert.equal((await walletAdapter.getWallet(ownerUid)).availableBalancePaise,amountPaise);
    assert.equal(Number(sqlite.prepare("SELECT COUNT(*) AS total FROM smv_domain_wallet_ledger WHERE owner_uid=? AND type='recharge'").get(ownerUid).total),1);

    response = routeResponse();
    await app.handlers.get(webhookPath)(routeRequest(eventBody,webhookHeaders),response);
    assert.equal(response.statusCode,200);
    assert.equal((await walletAdapter.getWallet(ownerUid)).availableBalancePaise,amountPaise);
    assert.equal(Number(sqlite.prepare("SELECT COUNT(*) AS total FROM smv_domain_wallet_ledger WHERE owner_uid=? AND type='recharge'").get(ownerUid).total),1);

    response = routeResponse();
    await app.handlers.get(verifyPath)(routeRequest(verifyBody),response);
    assert.equal(response.statusCode,200);
    assert.equal(response.body.alreadyCredited,true);
    assert.equal((await walletAdapter.getWallet(ownerUid)).availableBalancePaise,amountPaise);
  } finally {
    cleanupFixture(sqlite,{uids:[ownerUid],orders:[orderId],recharges:[rechargeId],eventKeys:[eventKey]});
    sqlite.close();
  }
});


class LocalDeadlineStorage {
  constructor() { this.values = new Map(); this.alarmAt = null; }
  async get(key) { return this.values.get(key); }
  async put(key, value) { this.values.set(key, structuredClone(value)); }
  async setAlarm(timestamp) { this.alarmAt = timestamp; }
  async deleteAlarm() { this.alarmAt = null; }
  async getAlarm() { return this.alarmAt; }
}

function makeLocalD1DeadlineCoordinator(sqlite, adminUid) {
  const storage = new LocalDeadlineStorage();
  const published = [];
  const userHub = {
    idFromName(uid) { return String(uid); },
    get(uid) {
      return {
        async fetch(_url, options = {}) {
          const body = JSON.parse(String(options.body || '{}'));
          published.push({ uid: String(uid), ...body });
          return new Response(JSON.stringify({ ok: true }), {
            status: 200, headers: { 'Content-Type': 'application/json' }
          });
        }
      };
    }
  };
  const ctx = { storage, getWebSockets() { return []; } };
  const env = {
    DB: makeD1Binding(sqlite),
    ADMIN_WALLET_UID: adminUid,
    LIVE_USER_EVENT_HUB: userHub
  };
  return {
    coordinator: new LiveSessionCoordinator(ctx, env),
    storage,
    published
  };
}

function seedLocalTimerSession(sqlite, options) {
  const {
    sessionId, customerUid, astrologerUid, mode = 'call', state = 'ringing',
    createdAtMs = Date.now(), updatedAtMs = createdAtMs,
    startedAtMs = null, connectingAtMs = null, preparationUntilMs = null,
    minutes = 5, reservedAmountPaise = 5000
  } = options;
  seedWallet(sqlite, customerUid, 'customer', 10000, 0, createdAtMs);
  const payload = {
    id: sessionId, sessionId, origin: 'direct', customerUid, astrologerUid,
    mode, state, minutes, ratePerMinutePaise: 1000, reservedAmountPaise,
    reservedBonusMinutes: 0, walletReservationState: 'reserved',
    createdAtMs, updatedAtMs, startedAtMs, connectingAtMs, preparationUntilMs,
    astrologerCommissionPercent: 20, adminCommissionPercent: 80,
    customerReady: state === 'active', astrologerReady: state === 'active'
  };
  sqlite.exec('BEGIN IMMEDIATE');
  try {
    insertLedger(sqlite, {
      ledgerId: id('timer_reserve'), ownerUid: customerUid, ownerRole: 'customer',
      type: 'live_session_reserve', direction: 'reserve',
      amountPaise: reservedAmountPaise, availableDeltaPaise: -reservedAmountPaise,
      reservedDeltaPaise: reservedAmountPaise,
      idempotencyKey: 'live-session:' + sessionId,
      referenceType: 'live_session', referenceId: sessionId, createdAtMs
    });
    sqlite.prepare(
      `INSERT INTO smv_domain_live_sessions
       (session_id,customer_uid,astrologer_uid,mode,state,appointment_id,
        reserved_amount_paise,reserved_bonus_minutes,actual_charge_paise,
        started_at_ms,ended_at_ms,settlement_operation_id,payload_json,created_at_ms,updated_at_ms)
       VALUES (?,?,?,?,?,NULL,?,?,0,?,NULL,NULL,?,?,?)`
    ).run(
      sessionId, customerUid, astrologerUid, mode, state, reservedAmountPaise, 0,
      startedAtMs, JSON.stringify(payload), createdAtMs, updatedAtMs
    );
    sqlite.exec('COMMIT');
  } catch (error) {
    sqlite.exec('ROLLBACK');
    throw error;
  }
  return payload;
}

function seedLocalTimerBooking(sqlite, options) {
  const { bookingId, customerUid, astrologerUid, createdAtMs, expiresAtMs,
    reservedAmountPaise = 3000, reservedBonusMinutes = 2 } = options;
  seedWallet(sqlite, customerUid, 'customer', 10000, reservedBonusMinutes, createdAtMs);
  const payload = {
    id: bookingId, customerUid, astrologerUid, mode: 'chat', status: 'pending',
    minutes: 5, ratePerMinutePaise: 600, reservedAmountPaise,
    reservedBonusMinutes, walletReservationState: 'reserved', origin: 'offline_queue',
    createdAtMs, expiresAtMs, updatedAtMs: createdAtMs
  };
  sqlite.exec('BEGIN IMMEDIATE');
  try {
    insertLedger(sqlite, {
      ledgerId: id('timer_booking_reserve'), ownerUid: customerUid, ownerRole: 'customer',
      type: 'live_booking_reserve', direction: 'reserve',
      amountPaise: reservedAmountPaise, availableDeltaPaise: -reservedAmountPaise,
      reservedDeltaPaise: reservedAmountPaise,
      bonusMinutesDelta: -reservedBonusMinutes,
      reservedBonusMinutesDelta: reservedBonusMinutes,
      idempotencyKey: 'live-booking:' + bookingId,
      referenceType: 'live_booking', referenceId: bookingId, createdAtMs
    });
    sqlite.prepare(
      `INSERT INTO smv_domain_live_bookings
       (booking_id,customer_uid,astrologer_uid,mode,status,wallet_reservation_state,
        reserved_amount_paise,reserved_bonus_minutes,expires_at_ms,payload_json,created_at_ms,updated_at_ms)
       VALUES (?,?,?,'chat','pending','reserved',?,?,?,?,?,?)`
    ).run(
      bookingId, customerUid, astrologerUid, reservedAmountPaise,
      reservedBonusMinutes, expiresAtMs, JSON.stringify(payload), createdAtMs, createdAtMs
    );
    sqlite.exec('COMMIT');
  } catch (error) {
    sqlite.exec('ROLLBACK');
    throw error;
  }
  return payload;
}

async function fireLocalD1Deadline(harness, sessionId, state, deadline) {
  const response = await harness.coordinator.fetch(new Request('https://live-session.internal/schedule', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, state, deadlines: [deadline] })
  }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).ok, true);
  await harness.coordinator.alarm();
}

test('Production D1-backed coordinator settles an expired Live session once and publishes to both participants', async () => {
  const { sqlite } = await openMigratedLocalD1();
  const nowMs = Date.now(), customerUid = id('timer_customer');
  const astrologerUid = id('timer_astro'), adminUid = id('timer_admin');
  const sessionId = id('timer_duration_session');
  const startedAtMs = nowMs - 6 * 60_000;
  try {
    seedLocalTimerSession(sqlite, {
      sessionId, customerUid, astrologerUid, mode: 'chat', state: 'active',
      createdAtMs: startedAtMs - 60_000, updatedAtMs: nowMs,
      startedAtMs, minutes: 5, reservedAmountPaise: 5000
    });
    const harness = makeLocalD1DeadlineCoordinator(sqlite, adminUid);
    await fireLocalD1Deadline(harness, sessionId, 'active', {
      type: 'session_duration', atMs: startedAtMs + 5 * 60_000,
      deadlineId: 'duration:' + sessionId, generation: 0
    });

    const session = sqlite.prepare('SELECT state,actual_charge_paise,payload_json FROM smv_domain_live_sessions WHERE session_id=?').get(sessionId);
    assert.equal(session.state, 'ended');
    assert.equal(Number(session.actual_charge_paise), 5000);
    assert.equal(JSON.parse(session.payload_json).endReason, 'duration_complete');
    const customer = sqlite.prepare('SELECT available_balance_paise,reserved_balance_paise FROM smv_domain_wallets WHERE owner_uid=?').get(customerUid);
    const astrologer = sqlite.prepare('SELECT available_balance_paise FROM smv_domain_wallets WHERE owner_uid=?').get(astrologerUid);
    const admin = sqlite.prepare('SELECT available_balance_paise FROM smv_domain_wallets WHERE owner_uid=?').get(adminUid);
    assert.equal(Number(customer.available_balance_paise), 5000);
    assert.equal(Number(customer.reserved_balance_paise), 0);
    assert.equal(Number(astrologer.available_balance_paise), 1000);
    assert.equal(Number(admin.available_balance_paise), 4000);
    assert.equal(Number(sqlite.prepare("SELECT COUNT(*) AS total FROM smv_domain_earnings WHERE reference_id=? AND status='credited'").get(sessionId).total), 1);
    assert.equal(Number(sqlite.prepare("SELECT COUNT(*) AS total FROM smv_domain_wallet_ledger WHERE reference_id=? AND type='live_session_usage'").get(sessionId).total), 1);
    assert.deepEqual(harness.published.map(item => item.uid).sort(), [astrologerUid, customerUid].sort());
    assert.ok(harness.published.every(item => item.type === 'live.session.ended' && item.data?.session?.state === 'ended'));

    await harness.coordinator.alarm();
    assert.equal(Number(sqlite.prepare("SELECT COUNT(*) AS total FROM smv_domain_earnings WHERE reference_id=?").get(sessionId).total), 1);
    assert.equal(Number(sqlite.prepare("SELECT COUNT(*) AS total FROM smv_domain_wallet_ledger WHERE reference_id=? AND type='live_session_usage'").get(sessionId).total), 1);
    assert.equal(harness.published.length, 2, 'a repeated alarm must not duplicate settlement or participant events');
  } finally {
    cleanupFixture(sqlite, { uids: [customerUid, astrologerUid, adminUid], sessions: [sessionId], references: [sessionId] });
    sqlite.close();
  }
});

test('Production D1-backed coordinator ends a missed Live request and releases its full reserve', async () => {
  const { sqlite } = await openMigratedLocalD1();
  const nowMs = Date.now(), customerUid = id('timer_missed_customer');
  const astrologerUid = id('timer_missed_astro'), adminUid = id('timer_missed_admin');
  const sessionId = id('timer_missed_session');
  const createdAtMs = nowMs - 4 * 60_000;
  try {
    seedLocalTimerSession(sqlite, {
      sessionId, customerUid, astrologerUid, mode: 'call', state: 'ringing',
      createdAtMs, updatedAtMs: nowMs, startedAtMs: null,
      minutes: 5, reservedAmountPaise: 5000
    });
    const harness = makeLocalD1DeadlineCoordinator(sqlite, adminUid);
    await fireLocalD1Deadline(harness, sessionId, 'ringing', {
      type: 'ring_timeout', atMs: createdAtMs + 3 * 60_000,
      deadlineId: 'ring:' + sessionId, generation: 0
    });

    const session = sqlite.prepare('SELECT state,actual_charge_paise,payload_json FROM smv_domain_live_sessions WHERE session_id=?').get(sessionId);
    assert.equal(session.state, 'ended');
    assert.equal(Number(session.actual_charge_paise), 0);
    assert.equal(JSON.parse(session.payload_json).endReason, 'no_answer');
    const customer = sqlite.prepare('SELECT available_balance_paise,reserved_balance_paise FROM smv_domain_wallets WHERE owner_uid=?').get(customerUid);
    assert.equal(Number(customer.available_balance_paise), 10000);
    assert.equal(Number(customer.reserved_balance_paise), 0);
    assert.equal(Number(sqlite.prepare("SELECT COUNT(*) AS total FROM smv_domain_wallet_ledger WHERE reference_id=? AND type='live_session_unused_release'").get(sessionId).total), 1);
    assert.equal(Number(sqlite.prepare('SELECT COUNT(*) AS total FROM smv_domain_earnings WHERE reference_id=?').get(sessionId).total), 0);
    assert.equal(harness.published.length, 2);
    assert.ok(harness.published.every(item => item.type === 'live.session.ended'));
    await harness.coordinator.alarm();
    assert.equal(Number(sqlite.prepare("SELECT COUNT(*) AS total FROM smv_domain_wallet_ledger WHERE reference_id=? AND type='live_session_unused_release'").get(sessionId).total), 1);
  } finally {
    cleanupFixture(sqlite, { uids: [customerUid, astrologerUid, adminUid], sessions: [sessionId], references: [sessionId] });
    sqlite.close();
  }
});

test('Production D1-backed coordinator advances an expired preparation window to the connection timer', async () => {
  const { sqlite } = await openMigratedLocalD1();
  const nowMs = Date.now(), customerUid = id('timer_prepare_customer');
  const astrologerUid = id('timer_prepare_astro'), adminUid = id('timer_prepare_admin');
  const sessionId = id('timer_prepare_session');
  const preparationUntilMs = nowMs - 1000;
  try {
    seedLocalTimerSession(sqlite, {
      sessionId, customerUid, astrologerUid, mode: 'call', state: 'preparing',
      createdAtMs: nowMs - 3 * 60_000, updatedAtMs: nowMs - 10_000,
      startedAtMs: null, connectingAtMs: null, preparationUntilMs,
      minutes: 5, reservedAmountPaise: 5000
    });
    const harness = makeLocalD1DeadlineCoordinator(sqlite, adminUid);
    await fireLocalD1Deadline(harness, sessionId, 'preparing', {
      type: 'preparation_timeout', atMs: preparationUntilMs,
      deadlineId: 'preparation:' + sessionId, generation: 0
    });

    const session = sqlite.prepare('SELECT state,payload_json FROM smv_domain_live_sessions WHERE session_id=?').get(sessionId);
    assert.equal(session.state, 'connecting');
    const payload = JSON.parse(session.payload_json);
    assert.ok(Number(payload.connectingAtMs) >= nowMs);
    const record = await harness.storage.get('live-session-record');
    assert.equal(record.deadlines.length, 1);
    assert.equal(record.deadlines[0].type, 'call_connect_timeout');
    assert.equal(record.deadlines[0].generation, 1);
    assert.ok(record.deadlines[0].atMs > Date.now());
    assert.equal(record.pendingEvents.length, 0);
    assert.equal(harness.published.length, 2);
    assert.ok(harness.published.every(item => item.type === 'live.session.updated' && item.data?.session?.state === 'connecting'));
  } finally {
    cleanupFixture(sqlite, { uids: [customerUid, astrologerUid, adminUid], sessions: [sessionId], references: [sessionId] });
    sqlite.close();
  }
});

test('Production D1-backed coordinator applies Call and Chat connection timeouts with full reserve release', async () => {
  const { sqlite } = await openMigratedLocalD1();
  const adminUid = id('timer_connect_admin');
  const allUids = [adminUid], sessions = [], references = [];
  try {
    for (const mode of ['call', 'chat']) {
      const nowMs = Date.now(), customerUid = id('timer_connect_customer');
      const astrologerUid = id('timer_connect_astro'), sessionId = id('timer_connect_' + mode);
      const timeoutMs = mode === 'chat' ? 5 * 60_000 : 45_000;
      const connectingAtMs = nowMs - timeoutMs - 30_000;
      const createdAtMs = connectingAtMs - 60_000;
      seedLocalTimerSession(sqlite, {
        sessionId, customerUid, astrologerUid, mode, state: 'connecting',
        createdAtMs, updatedAtMs: nowMs, startedAtMs: null, connectingAtMs,
        minutes: 5, reservedAmountPaise: 5000
      });
      const harness = makeLocalD1DeadlineCoordinator(sqlite, adminUid);
      await fireLocalD1Deadline(harness, sessionId, 'connecting', {
        type: mode === 'chat' ? 'chat_accept_timeout' : 'call_connect_timeout',
        atMs: connectingAtMs + timeoutMs,
        deadlineId: mode + '-connect:' + sessionId, generation: 0
      });
      const session = sqlite.prepare('SELECT state,payload_json FROM smv_domain_live_sessions WHERE session_id=?').get(sessionId);
      assert.equal(session.state, 'ended', mode);
      assert.equal(JSON.parse(session.payload_json).endReason, 'connection_failed', mode);
      const wallet = sqlite.prepare('SELECT available_balance_paise,reserved_balance_paise FROM smv_domain_wallets WHERE owner_uid=?').get(customerUid);
      assert.equal(Number(wallet.available_balance_paise), 10000, mode);
      assert.equal(Number(wallet.reserved_balance_paise), 0, mode);
      assert.equal(harness.published.length, 2, mode);
      allUids.push(customerUid, astrologerUid);
      sessions.push(sessionId);
      references.push(sessionId);
    }
  } finally {
    cleanupFixture(sqlite, { uids: allUids, sessions, references });
    sqlite.close();
  }
});

test('Production D1-backed coordinator expires a pending booking and releases cash plus bonus reserve once', async () => {
  const { sqlite } = await openMigratedLocalD1();
  const nowMs = Date.now(), customerUid = id('timer_booking_customer');
  const astrologerUid = id('timer_booking_astro'), bookingId = id('timer_booking');
  const createdAtMs = nowMs - 8 * 24 * 60 * 60 * 1000;
  const expiresAtMs = createdAtMs + 7 * 24 * 60 * 60 * 1000;
  try {
    seedLocalTimerBooking(sqlite, { bookingId, customerUid, astrologerUid, createdAtMs, expiresAtMs });
    const harness = makeLocalD1DeadlineCoordinator(sqlite, id('timer_booking_admin'));
    await fireLocalD1Deadline(harness, bookingId, 'booking_pending', {
      type: 'booking_expiry', atMs: expiresAtMs,
      deadlineId: 'booking:' + bookingId, generation: 0
    });

    const booking = sqlite.prepare('SELECT status,wallet_reservation_state,payload_json FROM smv_domain_live_bookings WHERE booking_id=?').get(bookingId);
    assert.equal(booking.status, 'expired');
    assert.equal(booking.wallet_reservation_state, 'released');
    assert.equal(JSON.parse(booking.payload_json).endReason, 'booking_expired');
    const wallet = sqlite.prepare('SELECT available_balance_paise,reserved_balance_paise,bonus_minutes_balance,reserved_bonus_minutes FROM smv_domain_wallets WHERE owner_uid=?').get(customerUid);
    assert.equal(Number(wallet.available_balance_paise), 10000);
    assert.equal(Number(wallet.reserved_balance_paise), 0);
    assert.equal(Number(wallet.bonus_minutes_balance), 2);
    assert.equal(Number(wallet.reserved_bonus_minutes), 0);
    assert.equal(Number(sqlite.prepare("SELECT COUNT(*) AS total FROM smv_domain_wallet_ledger WHERE reference_id=? AND type='live_booking_unused_release'").get(bookingId).total), 1);
    assert.equal(Number(sqlite.prepare("SELECT COUNT(*) AS total FROM smv_domain_wallet_ledger WHERE reference_id=? AND type='live_booking_bonus_release'").get(bookingId).total), 1);
    assert.deepEqual(harness.published.map(item => item.uid).sort(), [astrologerUid, customerUid].sort());
    assert.ok(harness.published.every(item => item.type === 'live.booking.updated'));
    await harness.coordinator.alarm();
    assert.equal(Number(sqlite.prepare("SELECT COUNT(*) AS total FROM smv_domain_wallet_ledger WHERE reference_id=? AND type='live_booking_unused_release'").get(bookingId).total), 1);
  } finally {
    cleanupFixture(sqlite, { uids: [customerUid, astrologerUid], bookings: [bookingId], references: [bookingId] });
    sqlite.close();
  }
});

test('Production D1-backed coordinator rejects stale disconnect generations and accepts the current grace deadline', async () => {
  const { sqlite } = await openMigratedLocalD1();
  const nowMs = Date.now(), customerUid = id('timer_disconnect_customer');
  const astrologerUid = id('timer_disconnect_astro'), adminUid = id('timer_disconnect_admin');
  const sessionId = id('timer_disconnect_session'), deadlineAtMs = nowMs - 1000;
  try {
    seedLocalTimerSession(sqlite, {
      sessionId, customerUid, astrologerUid, mode: 'call', state: 'active',
      createdAtMs: nowMs - 3 * 60_000, updatedAtMs: nowMs,
      startedAtMs: nowMs - 90_000, minutes: 5, reservedAmountPaise: 5000
    });
    sqlite.prepare(
      `INSERT INTO smv_domain_live_connections
       (session_id,uid,connected,generation,deadline_at_ms,updated_at_ms)
       VALUES (?, ?, 0, 2, ?, ?)`
    ).run(sessionId, customerUid, deadlineAtMs, nowMs - 20_000);

    const harness = makeLocalD1DeadlineCoordinator(sqlite, adminUid);
    await fireLocalD1Deadline(harness, sessionId, 'active', {
      type: 'disconnect_grace', atMs: deadlineAtMs,
      deadlineId: 'disconnect:stale:' + sessionId, generation: 1,
      participantUid: customerUid
    });
    let session = sqlite.prepare('SELECT state FROM smv_domain_live_sessions WHERE session_id=?').get(sessionId);
    assert.equal(session.state, 'active');
    assert.equal(harness.published.length, 0, 'a stale disconnect generation must not end or publish the session');

    await fireLocalD1Deadline(harness, sessionId, 'active', {
      type: 'disconnect_grace', atMs: deadlineAtMs,
      deadlineId: 'disconnect:current:' + sessionId, generation: 2,
      participantUid: customerUid
    });
    session = sqlite.prepare('SELECT state,payload_json FROM smv_domain_live_sessions WHERE session_id=?').get(sessionId);
    assert.equal(session.state, 'ended');
    assert.equal(JSON.parse(session.payload_json).endReason, 'network_disconnect');
    assert.equal(harness.published.length, 2);
    assert.ok(harness.published.every(item => item.type === 'live.session.ended'));
  } finally {
    cleanupFixture(sqlite, { uids: [customerUid, astrologerUid, adminUid], sessions: [sessionId], references: [sessionId] });
    sqlite.close();
  }
});
