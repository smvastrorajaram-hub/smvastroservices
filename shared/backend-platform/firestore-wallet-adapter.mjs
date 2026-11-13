import {
  WALLET_CURRENCY,
  calculateWalletReservation,
  calculateWalletReservationSettlement,
  normalizeWallet,
  validateWalletEntry,
  validateWalletOwner,
  walletReservationSettlementKeys,
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
    bonusCreditDeltaPaise: row.bonusCreditDeltaPaise || 0,
    reservedBonusCreditDeltaPaise: row.reservedBonusCreditDeltaPaise || 0,
    balanceAfterPaise: row.balanceAfterPaise ?? null,
    reservedBalanceAfterPaise: row.reservedBalanceAfterPaise ?? null,
    bonusCreditBalanceAfterPaise: row.bonusCreditBalanceAfterPaise ?? null,
    reservedBonusCreditBalanceAfterPaise: row.reservedBonusCreditBalanceAfterPaise ?? null,
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
    bonusCreditBalancePaise: wallet.bonusCreditBalancePaise + Number(deltas.bonusCreditDeltaPaise || 0),
    reservedBonusCreditPaise: wallet.reservedBonusCreditPaise + Number(deltas.reservedBonusCreditDeltaPaise || 0)
  };
  for (const value of Object.values(next)) {
    if (!Number.isSafeInteger(value) || value < 0 || value > Number.MAX_SAFE_INTEGER) {
      throw walletError('LIVE_WALLET_RESERVE_MISMATCH', 'Wallet cash or Bonus Credit reserve does not reconcile.');
    }
  }
  return {
    ownerUid: owner.ownerUid, ownerRole: owner.ownerRole, currency: WALLET_CURRENCY,
    ...next, version: wallet.version + 1,
    createdAt: wallet.createdAt || timestamp, updatedAt: timestamp
  };
}

/** Firestore Admin SDK adapter. Wallet promotional value is Bonus Credit only. */
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
        bonusCreditBalancePaise: 0, reservedBonusCreditPaise: 0,
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
      const nextLedger = ledgerData({
        ...row, ownerUid: owner.ownerUid, ownerRole: owner.ownerRole,
        balanceAfterPaise: patch.availableBalancePaise,
        reservedBalanceAfterPaise: patch.reservedBalancePaise,
        bonusCreditBalanceAfterPaise: patch.bonusCreditBalancePaise,
        reservedBonusCreditBalanceAfterPaise: patch.reservedBonusCreditPaise
      }, timestamp);
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
    const previous = await ledgerRef(idValue).get();
    if (previous.exists) return { success: true, alreadyProcessed: true, wallet: await getWallet(owner.ownerUid), reserve: previous.data() || {} };
    const wallet = await getWallet(owner.ownerUid);
    const reserve = calculateWalletReservation({ wallet, minutes, ratePerMinutePaise });
    const result = await executeOne({ owner, row: {
      ledgerId: idValue, type, direction: 'reserve', amountPaise: reserve.reservedAmountPaise,
      idempotencyKey: key, availableDeltaPaise: -reserve.reservedAmountPaise,
      reservedDeltaPaise: reserve.reservedAmountPaise,
      bonusCreditDeltaPaise: -reserve.reservedBonusCreditPaise,
      reservedBonusCreditDeltaPaise: reserve.reservedBonusCreditPaise,
      referenceType: booking ? 'live_booking' : 'live_session', referenceId: id,
      note: 'Wallet reserve for ' + (booking ? 'booked Live ' : 'Live ') + String(mode || 'chat') +
        (reserve.reservedBonusCreditPaise ? '; Bonus Credit ₹' + (reserve.reservedBonusCreditPaise / 100).toFixed(2) : '')
    }});
    return { success: true, ...result, reserve };
  }

  async function settleReservation({
    ownerUid, ownerRole, sessionId, reservedAmountPaise, reservedBonusCreditPaise,
    chargedAmountPaise, bonusCreditUsedPaise = 0
  } = {}) {
    const owner = validateWalletOwner(ownerUid, ownerRole);
    const id = String(sessionId || '').trim();
    if (!id) throw walletError('LIVE_SESSION_ID_REQUIRED', 'Live Session ID is required.', 400);
    const expectedKeys = walletReservationSettlementKeys({
      sessionId: id, reservedAmountPaise, reservedBonusCreditPaise,
      chargedAmountPaise, bonusCreditUsedPaise
    });
    const expectedRefs = await Promise.all(expectedKeys.map(async item =>
      ledgerRef(await ledgerId(item.type, owner.ownerUid, item.idempotencyKey, id))
    ));
    const found = await Promise.all(expectedRefs.map(async ref => (await ref.get()).exists));
    if (found.length && found.every(Boolean)) {
      return { success: true, alreadyProcessed: true, wallet: await getWallet(owner.ownerUid) };
    }
    if (found.some(Boolean)) {
      throw walletError('WALLET_LEDGER_PARTIAL_SETTLEMENT', 'Wallet settlement ledger is incomplete and requires reconciliation.');
    }
    const wallet = await getWallet(owner.ownerUid);
    if (!wallet) throw walletError('WALLET_NOT_FOUND', 'Wallet not found.', 409);
    const settlement = calculateWalletReservationSettlement({
      wallet, reservedAmountPaise, reservedBonusCreditPaise,
      chargedAmountPaise, bonusCreditUsedPaise
    });
    const specs = [];
    if (settlement.chargedAmountPaise > 0) specs.push({
      type: 'live_session_usage', direction: 'debit', amountPaise: settlement.chargedAmountPaise,
      idempotencyKey: 'live-session-usage:' + id, reservedDeltaPaise: -settlement.chargedAmountPaise
    });
    if (settlement.bonusCreditUsedPaise > 0) specs.push({
      type: 'live_session_bonus_credit_used', direction: 'debit',
      amountPaise: settlement.bonusCreditUsedPaise,
      idempotencyKey: 'live-session-bonus-credit-used:' + id,
      reservedBonusCreditDeltaPaise: -settlement.bonusCreditUsedPaise
    });
    if (settlement.bonusCreditReleasedPaise > 0) specs.push({
      type: 'live_session_bonus_credit_release', direction: 'credit',
      amountPaise: settlement.bonusCreditReleasedPaise,
      idempotencyKey: 'live-session-bonus-credit-release:' + id,
      bonusCreditDeltaPaise: settlement.bonusCreditReleasedPaise,
      reservedBonusCreditDeltaPaise: -settlement.bonusCreditReleasedPaise
    });
    if (settlement.releasedAmountPaise > 0) specs.push({
      type: 'live_session_unused_release', direction: 'credit', amountPaise: settlement.releasedAmountPaise,
      idempotencyKey: 'live-session-release:' + id,
      availableDeltaPaise: settlement.releasedAmountPaise, reservedDeltaPaise: -settlement.releasedAmountPaise
    });
    if (!specs.length) return { success: true, alreadyProcessed: true, wallet, settlement: usage };
    const rows = [];
    for (const spec of specs) rows.push({
      ...spec, ownerUid: owner.ownerUid, ownerRole: owner.ownerRole,
      ledgerId: await ledgerId(spec.type, owner.ownerUid, spec.idempotencyKey, id),
      referenceType: 'live_session', referenceId: id
    });
    const refs = rows.map(row => ledgerRef(row.ledgerId));
    const result = await db.runTransaction(async tx => {
      const [walletSnap, ...ledgerSnaps] = await Promise.all([tx.get(walletRef(owner.ownerUid)), ...refs.map(ref => tx.get(ref))]);
      const foundCount = ledgerSnaps.filter(snap => snap.exists).length;
      if (foundCount === rows.length) return { alreadyProcessed: true, wallet: walletView(walletSnap, owner) };
      if (foundCount > 0) throw walletError('WALLET_LEDGER_PARTIAL_SETTLEMENT', 'Wallet settlement ledger is incomplete and requires reconciliation.');
      const current = walletView(walletSnap, owner);
      const nowTimestamp = FieldValue.serverTimestamp();
      let next = current;
      for (const row of rows) {
        const patch = makeWalletPatch(next, row, owner, nowTimestamp);
        const ledger = ledgerData({ ...row,
          balanceAfterPaise: patch.availableBalancePaise,
          reservedBalanceAfterPaise: patch.reservedBalancePaise,
          bonusCreditBalanceAfterPaise: patch.bonusCreditBalancePaise,
          reservedBonusCreditBalanceAfterPaise: patch.reservedBonusCreditPaise
        }, nowTimestamp);
        tx.create(ledgerRef(row.ledgerId), ledger);
        next = normalizeWallet(patch, owner.ownerUid, owner.ownerRole);
      }
      tx.set(walletRef(owner.ownerUid), { ...next, updatedAt: nowTimestamp }, { merge: true });
      return { alreadyProcessed: false, wallet: next };
    });
    return { success: true, ...result, settlement };
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
