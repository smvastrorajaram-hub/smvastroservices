import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { Worker } from 'node:worker_threads';
import { webcrypto } from 'node:crypto';
import { createD1WalletAdapter } from '../../../shared/backend-platform/d1-wallet-adapter.mjs';
import { createD1LiveSessionService } from '../../../shared/backend-platform/d1-live-session-service.mjs';
import { registerWalletRechargeRoutes } from '../src/wallet-recharge-routes.mjs';

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
  const astrologerUid = id('booking_astro'), bookingId = id('booking');
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
  } finally {
    cleanupFixture(sqlite, { uids: [customerUid], sessions: [bookingId], bookings: [bookingId], references: [bookingId] });
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
