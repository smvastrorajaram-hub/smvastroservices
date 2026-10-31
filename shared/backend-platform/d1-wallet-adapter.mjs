import {
  WALLET_CURRENCY,
  calculateWalletReservation,
  calculateWalletReservationSettlement,
  normalizeWallet,
  safePaise,
  safeMinutes,
  validateWalletEntry,
  validateWalletOwner,
  walletReservationSettlementKeys,
  walletError
} from './wallet-domain.mjs';

const WALLET_TABLE = 'smv_domain_wallets';
const LEDGER_TABLE = 'smv_domain_wallet_ledger';
import {
  classifyRechargeIntent,
  selectRechargeBonusOffer,
  walletRechargeId,
  walletRechargeError
} from './wallet-recharge-domain.mjs';

function mapLedger(row) {
  if (!row) return null;
  let metadata = {};
  try { metadata = JSON.parse(String(row.metadata_json || '{}')); } catch { metadata = {}; }
  return {
    id: String(row.ledger_id),
    ownerUid: String(row.owner_uid),
    ownerRole: String(row.owner_role),
    currency: String(row.currency || WALLET_CURRENCY),
    type: String(row.type),
    direction: String(row.direction),
    amountPaise: safePaise(row.amount_paise),
    balanceAfterPaise: safePaise(row.balance_after_paise),
    reservedBalanceAfterPaise: safePaise(row.reserved_balance_after_paise),
    bonusMinutesBalanceAfter: safeMinutes(row.bonus_minutes_balance_after),
    reservedBonusMinutesAfter: safeMinutes(row.reserved_bonus_minutes_after),
    idempotencyKey: String(row.idempotency_key),
    referenceType: row.reference_type || null,
    referenceId: row.reference_id || null,
    note: String(row.note || ''),
    metadata,
    status: String(row.status || 'posted'),
    source: row.source || null,
    createdAt: Number(row.created_at_ms || 0)
  };
}

function mapWallet(row) {
  if (!row) return null;
  return normalizeWallet({
    ownerUid: row.owner_uid,
    ownerRole: row.owner_role,
    currency: row.currency,
    availableBalancePaise: row.available_balance_paise,
    reservedBalancePaise: row.reserved_balance_paise,
    bonusMinutesBalance: row.bonus_minutes_balance,
    reservedBonusMinutes: row.reserved_bonus_minutes,
    version: row.version,
    createdAt: row.created_at_ms,
    updatedAt: row.updated_at_ms
  });
}

async function sha256Hex(value, cryptoImpl) {
  if (!cryptoImpl?.subtle?.digest) throw new TypeError('Web Crypto SHA-256 is required.');
  const digest = await cryptoImpl.subtle.digest('SHA-256', new TextEncoder().encode(String(value)));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

function d1Error(error) {
  const message = String(error?.message || error || '');
  if (message.includes('WALLET_INSUFFICIENT_BALANCE')) return walletError('WALLET_INSUFFICIENT_BALANCE', 'Insufficient Wallet balance.', 409);
  if (message.includes('WALLET_RESERVED_BALANCE_MISMATCH')) return walletError('LIVE_WALLET_RESERVE_MISMATCH', 'Wallet cash reserve does not reconcile with this operation.');
  if (message.includes('WALLET_BONUS_BALANCE_MISMATCH') || message.includes('WALLET_RESERVED_BONUS_MISMATCH')) return walletError('LIVE_WALLET_RESERVE_MISMATCH', 'Wallet promotional minute reserve does not reconcile with this operation.');
  if (message.includes('WALLET_BALANCE_OVERFLOW')) return walletError('WALLET_BALANCE_OVERFLOW', 'Wallet balance exceeds the supported range.');
  if (message.includes('WALLET_OWNER_ROLE_MISMATCH')) return walletError('WALLET_OWNER_ROLE_MISMATCH', 'Wallet owner role does not match the stored Wallet.');
  if (message.includes('WALLET_OFFER_TOTAL_LIMIT_REACHED')) return walletError('WALLET_OFFER_TOTAL_LIMIT_REACHED', 'This Wallet offer has reached its total redemption limit.');
  if (message.includes('WALLET_OFFER_CUSTOMER_LIMIT_REACHED')) return walletError('WALLET_OFFER_CUSTOMER_LIMIT_REACHED', 'This Wallet offer has reached your redemption limit.');
  if (message.includes('WALLET_OFFER_NOT_ELIGIBLE')) return walletError('WALLET_OFFER_NOT_ELIGIBLE', 'The Wallet offer is no longer eligible for this recharge.');
  return error;
}

/**
 * D1 Wallet adapter. Balance changes are issued as ledger INSERTs. Database
 * triggers validate and update the wallet in the same SQLite transaction,
 * preventing a balance update from committing without its corresponding ledger.
 */
export function createD1WalletAdapter({ db, now = Date.now, cryptoImpl = globalThis.crypto } = {}) {
  if (!db || typeof db.prepare !== 'function' || typeof db.batch !== 'function') {
    throw new TypeError('A Cloudflare D1 database binding is required.');
  }

  function statement(sql, values = []) {
    return db.prepare(sql).bind(...values);
  }

  async function ensureWallet(ownerUid, ownerRole) {
    const owner = validateWalletOwner(ownerUid, ownerRole);
    const timestamp = Number(now());
    await statement(
      `INSERT OR IGNORE INTO ${WALLET_TABLE}
       (owner_uid, owner_role, currency, available_balance_paise, reserved_balance_paise,
        bonus_minutes_balance, reserved_bonus_minutes, version, created_at_ms, updated_at_ms)
       VALUES (?, ?, 'INR', 0, 0, 0, 0, 1, ?, ?)`,
      [owner.ownerUid, owner.ownerRole, timestamp, timestamp]
    ).run();
    const wallet = await getWallet(owner.ownerUid);
    if (wallet.ownerRole !== owner.ownerRole) throw walletError('WALLET_OWNER_ROLE_MISMATCH', 'Wallet owner role does not match the stored Wallet.');
    return wallet;
  }

  async function getWallet(ownerUid) {
    const uid = String(ownerUid || '').trim();
    if (!uid) throw walletError('WALLET_OWNER_INVALID', 'Wallet owner is required.', 400);
    const row = await statement(
      `SELECT owner_uid, owner_role, currency, available_balance_paise, reserved_balance_paise,
              bonus_minutes_balance, reserved_bonus_minutes, version, created_at_ms, updated_at_ms
       FROM ${WALLET_TABLE} WHERE owner_uid = ? LIMIT 1`,
      [uid]
    ).first();
    return mapWallet(row);
  }

  async function findLedger(ownerUid, idempotencyKey) {
    const row = await statement(
      `SELECT * FROM ${LEDGER_TABLE} WHERE owner_uid = ? AND idempotency_key = ? LIMIT 1`,
      [ownerUid, idempotencyKey]
    ).first();
    return mapLedger(row);
  }

  async function buildLedgerRow({ ownerUid, ownerRole, type, direction, amountPaise, idempotencyKey,
    availableDeltaPaise = 0, reservedDeltaPaise = 0, bonusMinutesDelta = 0, reservedBonusMinutesDelta = 0,
    referenceType = null, referenceId = null, note = '', metadata = {}, source = null, ledgerId }) {
    const id = ledgerId || await sha256Hex(type + ':' + referenceId, cryptoImpl);
    return {
      ledgerId: id, ownerUid, ownerRole, type, direction, amountPaise,
      idempotencyKey, availableDeltaPaise, reservedDeltaPaise, bonusMinutesDelta, reservedBonusMinutesDelta,
      referenceType: referenceType == null ? null : String(referenceType),
      referenceId: referenceId == null ? null : String(referenceId), note: String(note || '').slice(0, 240),
      metadataJson: JSON.stringify(metadata && typeof metadata === 'object' ? metadata : {}),
      source: source ? String(source).slice(0, 80) : null,
      createdAtMs: Number(now())
    };
  }

  function insertStatement(row) {
    return statement(
      `INSERT INTO ${LEDGER_TABLE}
       (ledger_id, owner_uid, owner_role, currency, type, direction, amount_paise,
        available_delta_paise, reserved_delta_paise, bonus_minutes_delta, reserved_bonus_minutes_delta,
        idempotency_key, reference_type, reference_id, note, metadata_json, status, source, created_at_ms)
       VALUES (?, ?, ?, 'INR', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'posted', ?, ?)`,
      [row.ledgerId, row.ownerUid, row.ownerRole, row.type, row.direction, row.amountPaise,
       row.availableDeltaPaise, row.reservedDeltaPaise, row.bonusMinutesDelta, row.reservedBonusMinutesDelta,
       row.idempotencyKey, row.referenceType, row.referenceId, row.note, row.metadataJson, row.source, row.createdAtMs]
    );
  }

  async function insertOne(row) {
    try {
      await insertStatement(row).run();
      return { alreadyProcessed: false, ledger: await findLedger(row.ownerUid, row.idempotencyKey) };
    } catch (error) {
      const existing = await findLedger(row.ownerUid, row.idempotencyKey);
      if (existing) return { alreadyProcessed: true, ledger: existing };
      throw d1Error(error);
    }
  }

  async function postWalletEntry(input) {
    const owner = validateWalletOwner(input?.ownerUid, input?.ownerRole);
    const entry = validateWalletEntry(input);
    if (entry.amountPaise <= 0 || !['credit', 'debit'].includes(entry.direction)) {
      throw walletError('WALLET_TRANSACTION_INVALID', 'Wallet credit/debit entries must have a positive paise amount.', 400);
    }
    await ensureWallet(owner.ownerUid, owner.ownerRole);
    const previous = await findLedger(owner.ownerUid, entry.idempotencyKey);
    if (previous) {
      const wallet = await getWallet(owner.ownerUid);
      return { success: true, alreadyProcessed: true, transactionId: previous.id, ...wallet };
    }
    const ledgerId = await sha256Hex(entry.type + ':' + owner.ownerUid + ':' + entry.idempotencyKey, cryptoImpl);
    const delta = entry.direction === 'credit' ? entry.amountPaise : -entry.amountPaise;
    const row = await buildLedgerRow({
      ...owner, ...entry, ledgerId, availableDeltaPaise: delta,
      referenceType: input.referenceType, referenceId: input.referenceId,
      note: input.note, metadata: input.metadata, source: input.source
    });
    const result = await insertOne(row);
    const wallet = await getWallet(owner.ownerUid);
    return { success: true, alreadyProcessed: result.alreadyProcessed, transactionId: result.ledger.id, ...wallet };
  }

  async function reserveWallet({ ownerUid, ownerRole, mode, minutes, ratePerMinutePaise, sessionId, reservationType = 'live_session' } = {}) {
    const owner = validateWalletOwner(ownerUid, ownerRole);
    const id = String(sessionId || '').trim();
    if (!id || id.length > 180) throw walletError('LIVE_SESSION_ID_REQUIRED', 'Live Session ID is required.', 400);
    const booking = reservationType === 'live_booking';
    if (!['live_session', 'live_booking'].includes(reservationType)) throw walletError('LIVE_RESERVATION_TYPE_INVALID', 'Invalid reservation type.', 400);
    await ensureWallet(owner.ownerUid, owner.ownerRole);
    const existingKey = (booking ? 'live-booking:' : 'live-session:') + id;
    const ledgerType = booking ? 'live_booking_reserve' : 'live_session_reserve';
    const previous = await findLedger(owner.ownerUid, existingKey);
    if (previous) return { success: true, alreadyProcessed: true, wallet: await getWallet(owner.ownerUid), reserve: previous };
    const wallet = await getWallet(owner.ownerUid);
    const reserve = calculateWalletReservation({ wallet, minutes, ratePerMinutePaise });
    const row = await buildLedgerRow({
      ...owner, type: ledgerType, direction: 'reserve', amountPaise: reserve.reservedAmountPaise,
      idempotencyKey: existingKey, ledgerId: await sha256Hex(ledgerType + ':' + id, cryptoImpl),
      availableDeltaPaise: -reserve.reservedAmountPaise, reservedDeltaPaise: reserve.reservedAmountPaise,
      bonusMinutesDelta: -reserve.bonusMinutesReserved, reservedBonusMinutesDelta: reserve.bonusMinutesReserved,
      referenceType: booking ? 'live_booking' : 'live_session', referenceId: id,
      note: 'Wallet reserve for ' + (booking ? 'booked Live ' : 'Live ') + String(mode || 'chat') +
        (reserve.bonusMinutesReserved ? '; ' + reserve.bonusMinutesReserved + ' promotional free minute(s)' : '')
    });
    const result = await insertOne(row);
    return { success: true, alreadyProcessed: result.alreadyProcessed, wallet: await getWallet(owner.ownerUid), reserve: result.ledger };
  }

  async function settleReservation({ ownerUid, ownerRole, sessionId, reservedAmountPaise, reservedBonusMinutes,
    chargedAmountPaise, freeMinutesUsed = 0 } = {}) {
    const owner = validateWalletOwner(ownerUid, ownerRole);
    const id = String(sessionId || '').trim();
    if (!id) throw walletError('LIVE_SESSION_ID_REQUIRED', 'Live Session ID is required.', 400);
    const expectedKeys = walletReservationSettlementKeys({
      sessionId: id, reservedAmountPaise, reservedBonusMinutes, chargedAmountPaise, freeMinutesUsed
    });
    const existingRows = await Promise.all(expectedKeys.map(item => findLedger(owner.ownerUid, item.idempotencyKey)));
    if (existingRows.length && existingRows.every(Boolean)) {
      return { success: true, alreadyProcessed: true, wallet: await getWallet(owner.ownerUid) };
    }
    if (existingRows.some(Boolean)) {
      throw walletError('WALLET_LEDGER_PARTIAL_SETTLEMENT', 'Wallet settlement ledger is incomplete and requires reconciliation.');
    }
    const wallet = await getWallet(owner.ownerUid);
    if (!wallet) throw walletError('WALLET_NOT_FOUND', 'Wallet not found.', 409);
    const settlement = calculateWalletReservationSettlement({
      wallet, reservedAmountPaise, reservedBonusMinutes, chargedAmountPaise, freeMinutesUsed
    });
    const specs = [];
    if (settlement.chargedAmountPaise > 0) specs.push({
      type: 'live_session_usage', direction: 'debit', amountPaise: settlement.chargedAmountPaise,
      idempotencyKey: 'live-session-usage:' + id, availableDeltaPaise: 0,
      reservedDeltaPaise: -settlement.chargedAmountPaise, note: 'Live session paid usage'
    });
    if (settlement.freeMinutesUsed > 0) specs.push({
      type: 'live_session_bonus_minutes', direction: 'debit', amountPaise: 0,
      idempotencyKey: 'live-session-bonus-used:' + id,
      reservedBonusMinutesDelta: -settlement.freeMinutesUsed, note: 'Promotional free minutes used'
    });
    if (settlement.bonusMinutesReleased > 0) specs.push({
      type: 'live_session_bonus_minutes_release', direction: 'credit', amountPaise: 0,
      idempotencyKey: 'live-session-bonus-release:' + id,
      bonusMinutesDelta: settlement.bonusMinutesReleased,
      reservedBonusMinutesDelta: -settlement.bonusMinutesReleased,
      note: 'Unused promotional free minutes returned'
    });
    if (settlement.releasedAmountPaise > 0) specs.push({
      type: 'live_session_unused_release', direction: 'credit', amountPaise: settlement.releasedAmountPaise,
      idempotencyKey: 'live-session-release:' + id,
      availableDeltaPaise: settlement.releasedAmountPaise,
      reservedDeltaPaise: -settlement.releasedAmountPaise,
      note: 'Unused Live Wallet reserve released'
    });
    if (!specs.length) return { success: true, alreadyProcessed: true, wallet, settlement };
    const rows = [];
    for (const spec of specs) rows.push(await buildLedgerRow({
      ...owner, ...spec, ledgerId: await sha256Hex(spec.type + ':' + id, cryptoImpl),
      referenceType: 'live_session', referenceId: id
    }));
    try {
      const results = await db.batch(rows.map(insertStatement));
      if (results.length !== rows.length || results.some(result => result?.success === false)) {
        throw new Error('D1_WALLET_BATCH_INCOMPLETE');
      }
    } catch (error) {
      const after = await Promise.all(rows.map(row => findLedger(owner.ownerUid, row.idempotencyKey)));
      if (after.every(Boolean)) return { success: true, alreadyProcessed: true, wallet: await getWallet(owner.ownerUid), settlement };
      if (after.some(Boolean)) throw walletError('WALLET_LEDGER_PARTIAL_SETTLEMENT', 'Wallet settlement batch requires reconciliation.');
      throw d1Error(error);
    }
    return { success: true, alreadyProcessed: false, wallet: await getWallet(owner.ownerUid), settlement };
  }

    async function createRechargeIntent({ ownerUid, ownerRole = 'customer', amountPaise, idempotencyKey } = {}) {
    const owner = validateWalletOwner(ownerUid, ownerRole);
    if (owner.ownerRole !== 'customer') throw walletError('WALLET_CUSTOMER_REQUIRED', 'Only a Customer can recharge a Wallet.', 403);
    const amount = Number(amountPaise);
    if (!Number.isSafeInteger(amount) || amount < 100) throw walletError('WALLET_RECHARGE_AMOUNT_INVALID', 'Recharge amount must be at least ₹1.00.', 400);
    await ensureWallet(owner.ownerUid, owner.ownerRole);
    const rechargeId = await walletRechargeId(owner.ownerUid, idempotencyKey, cryptoImpl);
    const timestamp = Number(now());
    const payloadJson = JSON.stringify({ idempotencyKey: String(idempotencyKey) });
    const inserted = await statement(
      `INSERT OR IGNORE INTO smv_domain_wallet_recharges
       (recharge_id, customer_uid, amount_paise, currency, status, payload_json, created_at_ms, updated_at_ms)
       VALUES (?, ?, ?, 'INR', 'order_creating', ?, ?, ?)`,
      [rechargeId, owner.ownerUid, amount, payloadJson, timestamp, timestamp]
    ).run();
    let row = await statement(
      'SELECT * FROM smv_domain_wallet_recharges WHERE recharge_id = ? LIMIT 1',
      [rechargeId]
    ).first();
    if (!row || String(row.customer_uid || '') !== owner.ownerUid) {
      throw walletError('WALLET_RECHARGE_NOT_FOUND', 'Wallet recharge request was not found.', 404);
    }
    const disposition = classifyRechargeIntent({
      status: row.status, storedAmountPaise: row.amount_paise, requestedAmountPaise: amount
    });
    if (disposition === 'amount_conflict') {
      throw walletError('WALLET_IDEMPOTENCY_CONFLICT', 'This recharge request key was already used for a different amount.', 409);
    }
    if (disposition === 'already_paid') {
      return { success: true, acquired: false, alreadyPaid: true, rechargeId, amountPaise: amount, orderId: row.razorpay_order_id || null };
    }
    if (disposition === 'reuse_order') {
      return { success: true, acquired: false, alreadyPaid: false, rechargeId, amountPaise: amount, orderId: row.razorpay_order_id };
    }
    if (Number(inserted?.meta?.changes || 0) === 1) {
      return { success: true, acquired: true, alreadyPaid: false, rechargeId, amountPaise: amount, orderId: null };
    }
    const currentState = String(row.status || '');
    const stale = currentState === 'order_creating' && timestamp - Number(row.updated_at_ms || 0) >= 60000;
    if (currentState === 'failed' || stale) {
      const updated = await statement(
        `UPDATE smv_domain_wallet_recharges
         SET status='order_creating', updated_at_ms=?, payload_json=?
         WHERE recharge_id=? AND status=? AND updated_at_ms=?`,
        [timestamp, payloadJson, rechargeId, currentState, Number(row.updated_at_ms || 0)]
      ).run();
      if (Number(updated?.meta?.changes || 0) === 1) {
        return { success: true, acquired: true, alreadyPaid: false, rechargeId, amountPaise: amount, orderId: null, retrying: true };
      }
      row = await statement('SELECT * FROM smv_domain_wallet_recharges WHERE recharge_id = ? LIMIT 1',[rechargeId]).first();
    }
    if (String(row?.status || '') === 'paid') {
      return { success: true, acquired: false, alreadyPaid: true, rechargeId, amountPaise: amount, orderId: row.razorpay_order_id || null };
    }
    if (String(row?.status || '') === 'order_created' && row.razorpay_order_id) {
      return { success: true, acquired: false, alreadyPaid: false, rechargeId, amountPaise: amount, orderId: row.razorpay_order_id };
    }
    return { success: true, acquired: false, inProgress: true, rechargeId, amountPaise: amount, orderId: row?.razorpay_order_id || null };
  }

  async function attachRechargeOrder({ ownerUid, rechargeId, orderId, amountPaise, currency = 'INR', receipt = '' } = {}) {
    const owner = validateWalletOwner(ownerUid, 'customer');
    const rid = String(rechargeId || '').trim();
    const oid = String(orderId || '').trim();
    const amount = Number(amountPaise);
    if (!rid || !oid || !Number.isSafeInteger(amount) || amount < 100 || String(currency).toUpperCase() !== 'INR') {
      throw walletError('WALLET_RECHARGE_INVALID', 'Razorpay order details are invalid.', 400);
    }
    const timestamp = Number(now());
    const results = await db.batch([
      statement(
        `UPDATE smv_domain_wallet_recharges
         SET razorpay_order_id=?, status='order_created', updated_at_ms=?
         WHERE recharge_id=? AND customer_uid=? AND amount_paise=? AND status='order_creating'`,
        [oid, timestamp, rid, owner.ownerUid, amount]
      ),
      statement(
        `INSERT OR IGNORE INTO smv_domain_razorpay_orders
         (order_id, owner_uid, service_name, amount_paise, currency, status, payment_id, payload_json, created_at_ms, updated_at_ms)
         VALUES (?, ?, 'SMV ASTRO Wallet Recharge', ?, 'INR', 'created', NULL, ?, ?, ?)`,
        [oid, owner.ownerUid, amount, JSON.stringify({ rechargeId: rid, receipt: String(receipt || '') }), timestamp, timestamp]
      )
    ]);
    if (results.some(result => result?.success === false)) throw walletError('WALLET_ORDER_SAVE_FAILED', 'Unable to save the Wallet recharge order.', 503);
    const row = await statement(
      'SELECT status, razorpay_order_id, amount_paise FROM smv_domain_wallet_recharges WHERE recharge_id=? AND customer_uid=? LIMIT 1',
      [rid, owner.ownerUid]
    ).first();
    if (!row || Number(row.amount_paise) !== amount || String(row.razorpay_order_id || '') !== oid ||
        !['order_created','paid'].includes(String(row.status || ''))) {
      throw walletError('WALLET_RECHARGE_STATE_CONFLICT', 'Wallet recharge order state could not be confirmed.', 409);
    }
    return { success: true, rechargeId: rid, orderId: oid, status: row.status };
  }

  async function markRechargeOrderFailed({ ownerUid, rechargeId, reason = 'order_create_failed' } = {}) {
    const owner = validateWalletOwner(ownerUid, 'customer');
    const rid = String(rechargeId || '').trim();
    const timestamp = Number(now());
    await statement(
      `UPDATE smv_domain_wallet_recharges
       SET status='failed', payload_json=?, updated_at_ms=?
       WHERE recharge_id=? AND customer_uid=? AND status='order_creating'`,
      [JSON.stringify({ failureReason: String(reason).slice(0, 200) }), timestamp, rid, owner.ownerUid]
    ).run();
    return { success: true };
  }

  async function getRechargeForOwner({ ownerUid, rechargeId } = {}) {
    const owner = validateWalletOwner(ownerUid, 'customer');
    const rid = String(rechargeId || '').trim();
    if (!rid) throw walletError('WALLET_RECHARGE_INVALID', 'Wallet recharge ID is required.', 400);
    const row = await statement(
      'SELECT * FROM smv_domain_wallet_recharges WHERE recharge_id=? AND customer_uid=? LIMIT 1',
      [rid, owner.ownerUid]
    ).first();
    if (!row) throw walletError('WALLET_RECHARGE_NOT_FOUND', 'Wallet recharge was not found.', 404);
    let payload = {};
    try { payload = JSON.parse(String(row.payload_json || '{}')); } catch {}
    return {
      rechargeId: String(row.recharge_id),
      customerUid: String(row.customer_uid),
      amountPaise: safePaise(row.amount_paise),
      currency: String(row.currency || 'INR'),
      status: String(row.status || ''),
      orderId: row.razorpay_order_id || null,
      paymentId: row.razorpay_payment_id || null,
      paidAt: Number(row.paid_at_ms || 0),
      bonusMinutesCredited: safeMinutes(payload.bonusMinutesCredited),
      offerId: payload.offerId || null,
      offerName: payload.offerName || null
    };
  }

  async function finalizeRecharge({ ownerUid, rechargeId, orderId, paymentId, amountPaise, currency = 'INR', source = 'payment_verification' } = {}) {
    const owner = validateWalletOwner(ownerUid, 'customer');
    const rid = String(rechargeId || '').trim();
    const oid = String(orderId || '').trim();
    const pid = String(paymentId || '').trim();
    const amount = Number(amountPaise);
    if (!rid || !oid || !pid || !Number.isSafeInteger(amount) || amount < 100 || String(currency).toUpperCase() !== 'INR') {
      throw walletError('WALLET_RECHARGE_INVALID', 'Wallet recharge verification data is incomplete or invalid.', 400);
    }
    await ensureWallet(owner.ownerUid, owner.ownerRole);
    let recharge = await statement(
      'SELECT * FROM smv_domain_wallet_recharges WHERE recharge_id=? AND customer_uid=? LIMIT 1',
      [rid, owner.ownerUid]
    ).first();
    if (!recharge) throw walletError('WALLET_RECHARGE_NOT_FOUND', 'Wallet recharge record was not found.', 404);
    if (String(recharge.razorpay_order_id || '') !== oid) throw walletError('WALLET_ORDER_MISMATCH', 'Razorpay order does not match this Wallet recharge.', 409);
    if (safePaise(recharge.amount_paise) !== amount) throw walletError('WALLET_AMOUNT_MISMATCH', 'Razorpay amount does not match this Wallet recharge.', 409);
    if (String(recharge.status || '') === 'paid') {
      if (String(recharge.razorpay_payment_id || '') !== pid) throw walletError('WALLET_RECHARGE_ALREADY_PAID', 'This Wallet recharge was paid with another payment.', 409);
      const wallet = await getWallet(owner.ownerUid);
      let payload = {};
      try { payload = JSON.parse(String(recharge.payload_json || '{}')); } catch {}
      return {
        success: true, alreadyProcessed: true, rechargeId: rid, paymentId: pid, amountPaise: amount,
        availableBalancePaise: wallet.availableBalancePaise,
        bonusMinutesCredited: safeMinutes(payload.bonusMinutesCredited),
        bonusMinutesBalance: wallet.bonusMinutesBalance
      };
    }
    if (String(recharge.status || '') !== 'order_created') {
      throw walletError('WALLET_RECHARGE_NOT_READY', 'This Wallet recharge is not ready to be credited.', 409);
    }
    const cashKey = 'recharge:' + pid;
    const bonusKey = 'recharge-bonus:' + pid;
    const [cashLedger, bonusLedger, wallet] = await Promise.all([
      findLedger(owner.ownerUid, cashKey),
      findLedger(owner.ownerUid, bonusKey),
      getWallet(owner.ownerUid)
    ]);
    if (cashLedger || bonusLedger) throw walletError('WALLET_LEDGER_CONFLICT', 'A Wallet recharge ledger already exists and requires reconciliation.', 409);
    const nowMs = Number(now());
    const offersResult = await statement(
      `SELECT o.offer_id, o.enabled, o.minimum_recharge_paise, o.bonus_minutes,
              o.per_customer_limit, o.total_usage_limit, o.used_count, o.priority,
              o.start_at_ms, o.end_at_ms, o.payload_json,
              COALESCE(u.redemption_count, 0) AS customer_redemption_count
       FROM smv_domain_wallet_offers o
       LEFT JOIN smv_domain_offer_usage u
         ON u.offer_id=o.offer_id AND u.customer_uid=?
       WHERE o.enabled=1 AND o.minimum_recharge_paise<=?
         AND (o.start_at_ms IS NULL OR o.start_at_ms<=?)
         AND (o.end_at_ms IS NULL OR o.end_at_ms>?)
         AND (o.total_usage_limit=0 OR o.used_count<o.total_usage_limit)
         AND (o.per_customer_limit=0 OR COALESCE(u.redemption_count,0)<o.per_customer_limit)
       ORDER BY o.priority DESC, o.bonus_minutes DESC, o.offer_id ASC LIMIT 100`,
      [owner.ownerUid, amount, nowMs, nowMs]
    ).all();
    const offerRows = (offersResult?.results || []).map(row => {
      let payload = {};
      try { payload = JSON.parse(String(row.payload_json || '{}')); } catch {}
      return {
        id: String(row.offer_id), offerType: 'wallet_recharge_bonus_minutes', enabled: Number(row.enabled) === 1,
        minimumRechargeAmountPaise: Number(row.minimum_recharge_paise),
        bonusMinutes: Number(row.bonus_minutes), perCustomerLimit: Number(row.per_customer_limit),
        totalUsageLimit: Number(row.total_usage_limit), usedCount: Number(row.used_count),
        priority: Number(row.priority), startAt: row.start_at_ms == null ? null : Number(row.start_at_ms),
        endAt: row.end_at_ms == null ? null : Number(row.end_at_ms),
        name: String(payload.name || ''), bannerTheme: String(payload.bannerTheme || 'auto')
      };
    });
    const usageCounts = Object.fromEntries((offersResult?.results || []).map(row => [String(row.offer_id), Number(row.customer_redemption_count || 0)]));
    const selectedOffer = selectRechargeBonusOffer({ offers: offerRows, amountPaise: amount, nowMs, usageCounts });
    const bonusMinutes = selectedOffer ? Number(selectedOffer.bonusMinutes) : 0;
    if (safePaise(wallet.availableBalancePaise) + amount > Number.MAX_SAFE_INTEGER ||
        safeMinutes(wallet.bonusMinutesBalance) + bonusMinutes > 1_000_000) {
      throw walletError('WALLET_BALANCE_OVERFLOW', 'Wallet balance exceeds the supported range.', 409);
    }
    const cashRow = await buildLedgerRow({
      ...owner, type:'recharge', direction:'credit', amountPaise:amount,
      idempotencyKey:cashKey, ledgerId:await sha256Hex('recharge:' + owner.ownerUid + ':' + pid, cryptoImpl),
      availableDeltaPaise:amount, referenceType:'razorpay_payment', referenceId:pid,
      note:'Wallet recharge successful', metadata:{rechargeId:rid,orderId:oid}, source
    });
    const batchStatements = [insertStatement(cashRow)];
    if (selectedOffer && bonusMinutes > 0) {
      const bonusRow = await buildLedgerRow({
        ...owner, type:'recharge_bonus_minutes', direction:'credit', amountPaise:0,
        idempotencyKey:bonusKey, ledgerId:await sha256Hex('recharge-bonus:' + owner.ownerUid + ':' + pid, cryptoImpl),
        bonusMinutesDelta:bonusMinutes, referenceType:'razorpay_payment', referenceId:pid,
        note:'Wallet recharge bonus: ' + bonusMinutes + ' free Live minute(s)',
        metadata:{rechargeId:rid,offerId:selectedOffer.id,offerName:selectedOffer.name}, source
      });
      batchStatements.push(insertStatement(bonusRow));
      batchStatements.push(statement(
        `INSERT INTO smv_domain_offer_redemptions
         (redemption_id,offer_id,customer_uid,recharge_id,amount_paise,bonus_minutes,created_at_ms)
         VALUES (?,?,?,?,?,?,?)`,
        [await sha256Hex('wallet-recharge-offer:' + rid + ':' + selectedOffer.id, cryptoImpl),
         selectedOffer.id, owner.ownerUid, rid, amount, bonusMinutes, nowMs]
      ));
    }
    const payload = {
      bonusMinutesCredited: bonusMinutes,
      offerId: selectedOffer?.id || null,
      offerName: selectedOffer?.name || null,
      paymentSource: String(source).slice(0, 80)
    };
    batchStatements.push(statement(
      `UPDATE smv_domain_wallet_recharges
       SET status='paid', razorpay_payment_id=?, paid_at_ms=?, payload_json=?, updated_at_ms=?
       WHERE recharge_id=? AND customer_uid=? AND status='order_created'`,
      [pid, nowMs, JSON.stringify(payload), nowMs, rid, owner.ownerUid]
    ));
    batchStatements.push(statement(
      `UPDATE smv_domain_razorpay_orders
       SET status='paid', payment_id=?, payload_json=?, updated_at_ms=?
       WHERE order_id=? AND owner_uid=? AND service_name='SMV ASTRO Wallet Recharge'`,
      [pid, JSON.stringify({rechargeId:rid}), nowMs, oid, owner.ownerUid]
    ));
    try {
      const results = await db.batch(batchStatements);
      if (results.some(result => result?.success === false)) throw new Error('D1_WALLET_RECHARGE_BATCH_INCOMPLETE');
    } catch (error) {
      const fresh = await statement(
        'SELECT status, razorpay_payment_id FROM smv_domain_wallet_recharges WHERE recharge_id=? AND customer_uid=? LIMIT 1',
        [rid, owner.ownerUid]
      ).first();
      if (fresh?.status === 'paid' && fresh.razorpay_payment_id === pid) {
        const current = await getWallet(owner.ownerUid);
        return { success:true,alreadyProcessed:true,rechargeId:rid,paymentId:pid,amountPaise:amount,
          availableBalancePaise:current.availableBalancePaise,bonusMinutesCredited:bonusMinutes,
          bonusMinutesBalance:current.bonusMinutesBalance,offerId:selectedOffer?.id||null,offerName:selectedOffer?.name||null };
      }
      throw d1Error(error);
    }
    const current = await getWallet(owner.ownerUid);
    return {
      success:true,alreadyProcessed:false,rechargeId:rid,paymentId:pid,amountPaise:amount,
      availableBalancePaise:current.availableBalancePaise,bonusMinutesCredited:bonusMinutes,
      bonusMinutesBalance:current.bonusMinutesBalance,offerId:selectedOffer?.id||null,offerName:selectedOffer?.name||null
    };
  }

  async function getRechargeByOrderId(orderId) {
    const oid = String(orderId || '').trim();
    if (!oid) return null;
    const row = await statement(
      `SELECT recharge_id, customer_uid, amount_paise, currency, status, razorpay_order_id,
              razorpay_payment_id, paid_at_ms, payload_json
       FROM smv_domain_wallet_recharges
       WHERE razorpay_order_id=? LIMIT 1`,
      [oid]
    ).first();
    if (!row) return null;
    return {
      rechargeId:String(row.recharge_id), customerUid:String(row.customer_uid),
      amountPaise:safePaise(row.amount_paise), currency:String(row.currency || 'INR'),
      status:String(row.status || ''), orderId:String(row.razorpay_order_id || ''),
      paymentId:row.razorpay_payment_id || null, paidAt:Number(row.paid_at_ms || 0)
    };
  }

  async function markRechargePaymentFailed({ orderId, paymentId, reason = 'payment_failed' } = {}) {
    const oid = String(orderId || '').trim();
    const pid = String(paymentId || '').trim();
    if (!oid) return { success:false, skipped:true };
    const timestamp = Number(now());
    const results = await db.batch([
      statement(
        `UPDATE smv_domain_wallet_recharges
         SET status='failed', payload_json=?, updated_at_ms=?
         WHERE razorpay_order_id=? AND status='order_created'`,
        [JSON.stringify({ failureReason:String(reason).slice(0,160),paymentId:pid }),timestamp,oid]
      ),
      statement(
        `UPDATE smv_domain_razorpay_orders
         SET status='failed',payment_id=?,payload_json=?,updated_at_ms=?
         WHERE order_id=? AND service_name='SMV ASTRO Wallet Recharge'`,
        [pid || null,JSON.stringify({failureReason:String(reason).slice(0,160)}),timestamp,oid]
      )
    ]);
    return { success:true, results };
  }

  async function recordWebhookEvent({ eventKey, eventType, paymentId = null, orderId = null, payload = {} } = {}) {
    const key = String(eventKey || '').trim();
    const type = String(eventType || '').trim();
    if (!/^[A-Za-z0-9:_-]{1,240}$/.test(key) || !/^[A-Za-z0-9._-]{1,100}$/.test(type)) {
      throw walletError('WALLET_WEBHOOK_EVENT_INVALID', 'Razorpay webhook event identity is invalid.', 400);
    }
    const timestamp = Number(now());
    await statement(
      `INSERT OR IGNORE INTO smv_domain_razorpay_webhook_events
       (event_key,event_type,payment_id,order_id,processed,retry_count,payload_json,received_at_ms,processed_at_ms)
       VALUES (?,?,?,?,0,0,?,?,NULL)`,
      [key,type,paymentId,orderId,JSON.stringify(payload && typeof payload === 'object' ? payload : {}),timestamp]
    ).run();
    const row = await statement(
      'SELECT processed,retry_count FROM smv_domain_razorpay_webhook_events WHERE event_key=? LIMIT 1',
      [key]
    ).first();
    if (Number(row?.processed) === 1) return { success:true, alreadyProcessed:true, eventKey:key };
    await statement(
      `UPDATE smv_domain_razorpay_webhook_events
       SET retry_count=retry_count+1,payload_json=?,payment_id=COALESCE(?,payment_id),
           order_id=COALESCE(?,order_id)
       WHERE event_key=? AND processed=0`,
      [JSON.stringify(payload && typeof payload === 'object' ? payload : {}),paymentId,orderId,key]
    ).run();
    return { success:true, alreadyProcessed:false, eventKey:key, retryCount:Number(row?.retry_count || 0) + 1 };
  }

  async function completeWebhookEvent(eventKey) {
    const key = String(eventKey || '').trim();
    const timestamp = Number(now());
    const result = await statement(
      'UPDATE smv_domain_razorpay_webhook_events SET processed=1,processed_at_ms=? WHERE event_key=?',
      [timestamp,key]
    ).run();
    return { success:true, changed:Number(result?.meta?.changes || 0) };
  }

  async function listTransactions(ownerUid, limit = 30) {
    const uid = String(ownerUid || '').trim();
    if (!uid) throw walletError('WALLET_OWNER_INVALID', 'Wallet owner is required.', 400);
    const max = Math.max(1, Math.min(100, Math.floor(Number(limit) || 30)));
    const result = await statement(
      `SELECT * FROM ${LEDGER_TABLE} WHERE owner_uid = ? ORDER BY created_at_ms DESC, ledger_id DESC LIMIT ?`,
      [uid, max]
    ).all();
    return (result?.results || []).map(mapLedger);
  }

  return Object.freeze({ ensureWallet, getWallet, postWalletEntry, createRechargeIntent, attachRechargeOrder, markRechargeOrderFailed, getRechargeForOwner, finalizeRecharge, getRechargeByOrderId, markRechargePaymentFailed, recordWebhookEvent, completeWebhookEvent, reserveWallet, settleReservation, listTransactions });
}
