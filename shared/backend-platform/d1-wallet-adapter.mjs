import {
  WALLET_CURRENCY,
  calculateWalletReservation,
  calculateWalletReservationSettlement,
  normalizeWallet,
  safePaise,
  safeMinutes,
  validateWalletEntry,
  validateWalletOwner,
  walletError
} from './wallet-domain.mjs';

const WALLET_TABLE = 'smv_domain_wallets';
const LEDGER_TABLE = 'smv_domain_wallet_ledger';

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
    return getWallet(owner.ownerUid);
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
      referenceType, referenceId, note: String(note || '').slice(0, 240),
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
    const wallet = await getWallet(owner.ownerUid);
    if (!wallet) throw walletError('WALLET_NOT_FOUND', 'Wallet not found.', 409);
    const settlement = calculateWalletReservationSettlement({
      wallet, reservedAmountPaise, reservedBonusMinutes, chargedAmountPaise, freeMinutesUsed
    });
    const specs = [];
    if (settlement.chargedAmountPaise > 0) specs.push({
      type: 'live_session_usage', direction: 'debit', amountPaise: settlement.chargedAmountPaise,
      idempotencyKey: 'live-session-usage:' + id, availableDeltaPaise: 0,
      reservedDeltaPaise: -settlement.chargedAmountPaise,
      note: 'Live session paid usage'
    });
    if (settlement.freeMinutesUsed > 0) specs.push({
      type: 'live_session_bonus_minutes', direction: 'debit', amountPaise: 0,
      idempotencyKey: 'live-session-bonus-used:' + id, reservedBonusMinutesDelta: -settlement.freeMinutesUsed,
      note: 'Promotional free minutes used'
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
    if (!specs.length) return { success: true, alreadyProcessed: true, wallet };
    const rows = [];
    for (const spec of specs) rows.push(await buildLedgerRow({
      ...owner, ...spec, ledgerId: await sha256Hex(spec.type + ':' + id, cryptoImpl),
      referenceType: 'live_session', referenceId: id
    }));
    const existingRows = await Promise.all(rows.map(row => findLedger(owner.ownerUid, row.idempotencyKey)));
    if (existingRows.every(Boolean)) return { success: true, alreadyProcessed: true, wallet: await getWallet(owner.ownerUid), settlement };
    if (existingRows.some(Boolean)) throw walletError('WALLET_LEDGER_PARTIAL_SETTLEMENT', 'Wallet settlement ledger is incomplete and requires reconciliation.');
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

  return Object.freeze({ ensureWallet, getWallet, postWalletEntry, reserveWallet, settleReservation, listTransactions });
}
