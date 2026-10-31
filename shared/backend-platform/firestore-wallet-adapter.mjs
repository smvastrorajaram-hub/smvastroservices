import {
  WALLET_CURRENCY,
  calculateWalletReservation,
  calculateWalletReservationSettlement,
  normalizeWallet,
  validateWalletEntry,
  validateWalletOwner,
  walletError
} from './wallet-domain.mjs';

const WALLET_COLLECTION = 'smv_wallets';
const LEDGER_COLLECTION = 'smv_wallet_transactions';

async function sha256Hex(value, cryptoImpl) {
  if (!cryptoImpl?.subtle?.digest) throw new TypeError('Web Crypto SHA-256 is required.');
  const digest = await cryptoImpl.subtle.digest('SHA-256', new TextEncoder().encode(String(value)));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

function walletView(snapshot, owner) {
  return normalizeWallet(snapshot?.exists ? snapshot.data() || {} : {}, owner.ownerUid, owner.ownerRole);
}

function ledgerData(row, timestamp) {
  return {
    ownerUid: row.ownerUid, ownerRole: row.ownerRole, currency: WALLET_CURRENCY,
    type: row.type, direction: row.direction, amountPaise: row.amountPaise,
    availableDeltaPaise: row.availableDeltaPaise || 0,
    reservedDeltaPaise: row.reservedDeltaPaise || 0,
    bonusMinutesDelta: row.bonusMinutesDelta || 0,
    reservedBonusMinutesDelta: row.reservedBonusMinutesDelta || 0,
    balanceAfterPaise: row.balanceAfterPaise ?? null,
    reservedBalanceAfterPaise: row.reservedBalanceAfterPaise ?? null,
    bonusMinutesBalanceAfter: row.bonusMinutesBalanceAfter ?? null,
    reservedBonusMinutesAfter: row.reservedBonusMinutesAfter ?? null,
    idempotencyKey: row.idempotencyKey,
    referenceType: row.referenceType || null, referenceId: row.referenceId || null,
    note: String(row.note || '').slice(0, 240),
    metadata: row.metadata && typeof row.metadata === 'object' ? row.metadata : {},
    source: row.source || null, status: 'posted', createdAt: timestamp
  };
}

function makeWalletPatch(wallet, deltas, owner, timestamp) {
  const next = {
    availableBalancePaise: wallet.availableBalancePaise + Number(deltas.availableDeltaPaise || 0),
    reservedBalancePaise: wallet.reservedBalancePaise + Number(deltas.reservedDeltaPaise || 0),
    bonusMinutesBalance: wallet.bonusMinutesBalance + Number(deltas.bonusMinutesDelta || 0),
    reservedBonusMinutes: wallet.reservedBonusMinutes + Number(deltas.reservedBonusMinutesDelta || 0)
  };
  for (const value of [next.availableBalancePaise, next.reservedBalancePaise]) {
    if (!Number.isSafeInteger(value) || value < 0) throw walletError('WALLET_INSUFFICIENT_BALANCE', 'Wallet reserve or available balance does not reconcile.');
  }
  for (const value of [next.bonusMinutesBalance, next.reservedBonusMinutes]) {
    if (!Number.isSafeInteger(value) || value < 0 || value > 1_000_000) throw walletError('LIVE_WALLET_RESERVE_MISMATCH', 'Wallet promotional minute reserve does not reconcile.');
  }
  return {
    ownerUid: owner.ownerUid, ownerRole: owner.ownerRole, currency: WALLET_CURRENCY,
    ...next, version: wallet.version + 1,
    createdAt: wallet.createdAt || timestamp, updatedAt: timestamp
  };
}

/** Firestore Admin SDK adapter. The same Wallet operations and pure rules are used by D1. */
export function createFirestoreWalletAdapter({ db, FieldValue, cryptoImpl = globalThis.crypto } = {}) {
  if (!db || typeof db.runTransaction !== 'function' || !FieldValue?.serverTimestamp) {
    throw new TypeError('Firestore db and FieldValue.serverTimestamp are required.');
  }
  const walletRef = uid => db.collection(WALLET_COLLECTION).doc(String(uid));
  const ledgerRef = id => db.collection(LEDGER_COLLECTION).doc(String(id));

  async function ledgerId(type, ownerUid, idempotencyKey, referenceId) {
    const value = referenceId
      ? String(type) + ':' + String(referenceId)
      : String(type) + ':' + String(ownerUid) + ':' + String(idempotencyKey);
    return sha256Hex(value, cryptoImpl);
  }

  async function getWallet(ownerUid) {
    const uid = String(ownerUid || '').trim();
    if (!uid) throw walletError('WALLET_OWNER_INVALID', 'Wallet owner is required.', 400);
    const snap = await walletRef(uid).get();
    if (!snap.exists) return null;
    return walletView(snap, { ownerUid: uid, ownerRole: snap.data()?.ownerRole });
  }

  async function ensureWallet(ownerUid, ownerRole) {
    const owner = validateWalletOwner(ownerUid, ownerRole);
    const ref = walletRef(owner.ownerUid);
    await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (snap.exists) {
        if (String(snap.data()?.ownerRole || '') !== owner.ownerRole) {
          throw walletError('WALLET_OWNER_ROLE_MISMATCH', 'Wallet owner role does not match the stored Wallet.');
        }
        return;
      }
      const timestamp = FieldValue.serverTimestamp();
      tx.create(ref, {
        ownerUid: owner.ownerUid, ownerRole: owner.ownerRole, currency: WALLET_CURRENCY,
        availableBalancePaise: 0, reservedBalancePaise: 0,
        bonusMinutesBalance: 0, reservedBonusMinutes: 0,
        version: 1, createdAt: timestamp, updatedAt: timestamp
      });
    });
    return getWallet(owner.ownerUid);
  }

  async function executeOne({ owner, row }) {
    const wRef = walletRef(owner.ownerUid), lRef = ledgerRef(row.ledgerId);
    return db.runTransaction(async tx => {
      const [walletSnap, ledgerSnap] = await Promise.all([tx.get(wRef), tx.get(lRef)]);
      if (ledgerSnap.exists) {
        return { alreadyProcessed: true, wallet: walletView(walletSnap, owner), transactionId: row.ledgerId };
      }
      const wallet = walletView(walletSnap, owner);
      const timestamp = FieldValue.serverTimestamp();
      const patch = makeWalletPatch(wallet, row, owner, timestamp);
      const nextLedger = {
        ...ledgerData({ ...row, ownerUid: owner.ownerUid, ownerRole: owner.ownerRole,
          balanceAfterPaise: patch.availableBalancePaise,
          reservedBalanceAfterPaise: patch.reservedBalancePaise,
          bonusMinutesBalanceAfter: patch.bonusMinutesBalance,
          reservedBonusMinutesAfter: patch.reservedBonusMinutes }, timestamp)
      };
      tx.set(wRef, patch, { merge: true });
      tx.create(lRef, nextLedger);
      return { alreadyProcessed: false, wallet: normalizeWallet(patch, owner.ownerUid, owner.ownerRole), transactionId: row.ledgerId };
    });
  }

  async function postWalletEntry(input) {
    const owner = validateWalletOwner(input?.ownerUid, input?.ownerRole);
    const entry = validateWalletEntry(input);
    if (entry.amountPaise <= 0 || !['credit', 'debit'].includes(entry.direction)) {
      throw walletError('WALLET_TRANSACTION_INVALID', 'Wallet credit/debit entries must have a positive paise amount.', 400);
    }
    await ensureWallet(owner.ownerUid, owner.ownerRole);
    const ledgerIdValue = await ledgerId(entry.type, owner.ownerUid, entry.idempotencyKey);
    const row = {
      ...entry, ledgerId: ledgerIdValue,
      availableDeltaPaise: entry.direction === 'credit' ? entry.amountPaise : -entry.amountPaise,
      referenceType: input.referenceType, referenceId: input.referenceId,
      note: input.note, metadata: input.metadata, source: input.source
    };
    const result = await executeOne({ owner, row });
    return { success: true, ...result };
  }

  async function reserveWallet({ ownerUid, ownerRole, mode, minutes, ratePerMinutePaise, sessionId, reservationType = 'live_session' } = {}) {
    const owner = validateWalletOwner(ownerUid, ownerRole);
    const id = String(sessionId || '').trim();
    if (!id) throw walletError('LIVE_SESSION_ID_REQUIRED', 'Live Session ID is required.', 400);
    const booking = reservationType === 'live_booking';
    if (!['live_session', 'live_booking'].includes(reservationType)) throw walletError('LIVE_RESERVATION_TYPE_INVALID', 'Invalid reservation type.', 400);
    await ensureWallet(owner.ownerUid, owner.ownerRole);
    const type = booking ? 'live_booking_reserve' : 'live_session_reserve';
    const key = (booking ? 'live-booking:' : 'live-session:') + id;
    const idValue = await ledgerId(type, owner.ownerUid, key, id);
    const wallet = await getWallet(owner.ownerUid);
    const reserve = calculateWalletReservation({ wallet, minutes, ratePerMinutePaise });
    const result = await executeOne({ owner, row: {
      ledgerId: idValue, type, direction: 'reserve', amountPaise: reserve.reservedAmountPaise,
      idempotencyKey: key, availableDeltaPaise: -reserve.reservedAmountPaise,
      reservedDeltaPaise: reserve.reservedAmountPaise,
      bonusMinutesDelta: -reserve.bonusMinutesReserved,
      reservedBonusMinutesDelta: reserve.bonusMinutesReserved,
      referenceType: booking ? 'live_booking' : 'live_session', referenceId: id,
      note: 'Wallet reserve for ' + (booking ? 'booked Live ' : 'Live ') + String(mode || 'chat')
    }});
    return { success: true, ...result, reserve };
  }

  async function settleReservation({ ownerUid, ownerRole, sessionId, reservedAmountPaise, reservedBonusMinutes,
    chargedAmountPaise, freeMinutesUsed = 0 } = {}) {
    const owner = validateWalletOwner(ownerUid, ownerRole);
    const id = String(sessionId || '').trim();
    if (!id) throw walletError('LIVE_SESSION_ID_REQUIRED', 'Live Session ID is required.', 400);
    const usage = calculateWalletReservationSettlement({
      wallet: await getWallet(owner.ownerUid), reservedAmountPaise, reservedBonusMinutes,
      chargedAmountPaise, freeMinutesUsed
    });
    const specs = [];
    if (usage.chargedAmountPaise > 0) specs.push({
      type: 'live_session_usage', direction: 'debit', amountPaise: usage.chargedAmountPaise,
      idempotencyKey: 'live-session-usage:' + id, reservedDeltaPaise: -usage.chargedAmountPaise
    });
    if (usage.freeMinutesUsed > 0) specs.push({
      type: 'live_session_bonus_minutes', direction: 'debit', amountPaise: 0,
      idempotencyKey: 'live-session-bonus-used:' + id, reservedBonusMinutesDelta: -usage.freeMinutesUsed
    });
    if (usage.bonusMinutesReleased > 0) specs.push({
      type: 'live_session_bonus_minutes_release', direction: 'credit', amountPaise: 0,
      idempotencyKey: 'live-session-bonus-release:' + id,
      bonusMinutesDelta: usage.bonusMinutesReleased, reservedBonusMinutesDelta: -usage.bonusMinutesReleased
    });
    if (usage.releasedAmountPaise > 0) specs.push({
      type: 'live_session_unused_release', direction: 'credit', amountPaise: usage.releasedAmountPaise,
      idempotencyKey: 'live-session-release:' + id,
      availableDeltaPaise: usage.releasedAmountPaise, reservedDeltaPaise: -usage.releasedAmountPaise
    });
    if (!specs.length) return { success: true, alreadyProcessed: true, wallet: await getWallet(owner.ownerUid), settlement: usage };
    const rows = [];
    for (const spec of specs) rows.push({
      ...spec, ownerUid: owner.ownerUid, ownerRole: owner.ownerRole,
      ledgerId: await ledgerId(spec.type, owner.ownerUid, spec.idempotencyKey, id),
      referenceType: 'live_session', referenceId: id
    });
    const refs = rows.map(row => ledgerRef(row.ledgerId));
    const result = await db.runTransaction(async tx => {
      const [walletSnap, ...ledgerSnaps] = await Promise.all([tx.get(walletRef(owner.ownerUid)), ...refs.map(ref => tx.get(ref))]);
      const found = ledgerSnaps.filter(snap => snap.exists).length;
      if (found === rows.length) return { alreadyProcessed: true, wallet: walletView(walletSnap, owner) };
      if (found > 0) throw walletError('WALLET_LEDGER_PARTIAL_SETTLEMENT', 'Wallet settlement ledger is incomplete and requires reconciliation.');
      const current = walletView(walletSnap, owner);
      const nowTimestamp = FieldValue.serverTimestamp();
      let next = current;
      for (const row of rows) {
        const patch = makeWalletPatch(next, row, owner, nowTimestamp);
        const ledger = ledgerData({ ...row,
          balanceAfterPaise: patch.availableBalancePaise,
          reservedBalanceAfterPaise: patch.reservedBalancePaise,
          bonusMinutesBalanceAfter: patch.bonusMinutesBalance,
          reservedBonusMinutesAfter: patch.reservedBonusMinutes
        }, nowTimestamp);
        tx.create(ledgerRef(row.ledgerId), ledger);
        next = normalizeWallet(patch, owner.ownerUid, owner.ownerRole);
      }
      tx.set(walletRef(owner.ownerUid), { ...next, updatedAt: nowTimestamp }, { merge: true });
      return { alreadyProcessed: false, wallet: next };
    });
    return { success: true, ...result, settlement: usage };
  }

  async function listTransactions(ownerUid, limit = 30) {
    const uid = String(ownerUid || '').trim();
    if (!uid) throw walletError('WALLET_OWNER_INVALID', 'Wallet owner is required.', 400);
    const max = Math.max(1, Math.min(100, Math.floor(Number(limit) || 30)));
    const snapshot = await db.collection(LEDGER_COLLECTION).where('ownerUid', '==', uid)
      .orderBy('createdAt', 'desc').limit(max).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() || {}) }));
  }

  return Object.freeze({ ensureWallet, getWallet, postWalletEntry, reserveWallet, settleReservation, listTransactions });
}
