// Platform-neutral Wallet business rules shared by Render and Cloudflare adapters.
// Promotional Wallet value is rupee-denominated Bonus Credit only.
export const WALLET_CURRENCY = 'INR';
export const MAX_WALLET_PAISE = Number.MAX_SAFE_INTEGER;

export function walletError(code, message, httpStatus = 409, details = {}) {
  return Object.assign(new Error(message || code), { code, httpStatus, ...details });
}

export function validateWalletOwner(ownerUid, ownerRole) {
  const uid = String(ownerUid || '').trim();
  const role = String(ownerRole || '').trim().toLowerCase();
  if (!uid || uid.length > 160 || !['customer', 'astrologer', 'admin'].includes(role)) {
    throw walletError('WALLET_OWNER_INVALID', 'Invalid Wallet owner.', 400);
  }
  return { ownerUid: uid, ownerRole: role };
}

export function safePaise(value) {
  const number = Number(value ?? 0);
  return Number.isSafeInteger(number) && number >= 0 ? number : 0;
}

export function normalizeWallet(raw = {}, ownerUid = '', ownerRole = '') {
  const owner = validateWalletOwner(ownerUid || raw.ownerUid, ownerRole || raw.ownerRole);
  return Object.freeze({
    ownerUid: owner.ownerUid,
    ownerRole: owner.ownerRole,
    currency: WALLET_CURRENCY,
    availableBalancePaise: safePaise(raw.availableBalancePaise),
    reservedBalancePaise: safePaise(raw.reservedBalancePaise),
    bonusCreditBalancePaise: safePaise(raw.bonusCreditBalancePaise),
    reservedBonusCreditPaise: safePaise(raw.reservedBonusCreditPaise),
    version: safePaise(raw.version),
    createdAt: raw.createdAt ?? null,
    updatedAt: raw.updatedAt ?? null
  });
}

export function calculateWalletReservation({ wallet, minutes, ratePerMinutePaise } = {}) {
  const length = Number(minutes);
  const rate = Number(ratePerMinutePaise);
  if (!Number.isSafeInteger(length) || length < 1 || length > 1440 ||
      !Number.isSafeInteger(rate) || rate < 0) {
    throw walletError('LIVE_PRICE_INVALID', 'Session duration or per-minute rate is invalid.', 400);
  }
  const grossRequiredPaise = length * rate;
  const availableBonusCredit = safePaise(wallet?.bonusCreditBalancePaise);
  const reservedBonusCreditPaise = Math.min(grossRequiredPaise, availableBonusCredit);
  const reservedAmountPaise = grossRequiredPaise - reservedBonusCreditPaise;
  const available = safePaise(wallet?.availableBalancePaise);
  if (!Number.isSafeInteger(grossRequiredPaise) || available < reservedAmountPaise) {
    throw walletError('WALLET_INSUFFICIENT_BALANCE', 'Insufficient Wallet balance for the selected duration.', 409, {
      availableBalancePaise: available,
      requiredBalancePaise: Number.isSafeInteger(reservedAmountPaise) ? reservedAmountPaise : 0,
      shortfallPaise: Number.isSafeInteger(reservedAmountPaise) ? Math.max(0, reservedAmountPaise - available) : 0
    });
  }
  const reserved = safePaise(wallet?.reservedBalancePaise);
  const reservedBonus = safePaise(wallet?.reservedBonusCreditPaise);
  if (!Number.isSafeInteger(reserved + reservedAmountPaise) ||
      !Number.isSafeInteger(reservedBonus + reservedBonusCreditPaise) ||
      reserved + reservedAmountPaise > MAX_WALLET_PAISE ||
      reservedBonus + reservedBonusCreditPaise > MAX_WALLET_PAISE) {
    throw walletError('WALLET_BALANCE_OVERFLOW', 'Wallet reserve exceeds the supported balance range.');
  }
  return Object.freeze({
    minutes: length,
    ratePerMinutePaise: rate,
    grossRequiredPaise,
    reservedAmountPaise,
    reservedBonusCreditPaise,
    availableBalanceAfterPaise: available - reservedAmountPaise,
    reservedBalanceAfterPaise: reserved + reservedAmountPaise,
    bonusCreditBalanceAfterPaise: availableBonusCredit - reservedBonusCreditPaise,
    reservedBonusCreditAfterPaise: reservedBonus + reservedBonusCreditPaise
  });
}

export function walletReservationSettlementKeys({
  sessionId, reservedAmountPaise, reservedBonusCreditPaise,
  chargedAmountPaise, bonusCreditUsedPaise
} = {}) {
  const id = String(sessionId || '').trim();
  const reservedCash = Number(reservedAmountPaise);
  const reservedCredit = Number(reservedBonusCreditPaise);
  const charge = Number(chargedAmountPaise);
  const usedCredit = Number(bonusCreditUsedPaise);
  if (!id || ![reservedCash, reservedCredit, charge, usedCredit].every(Number.isSafeInteger) ||
      reservedCash < 0 || reservedCredit < 0 || charge < 0 || charge > reservedCash ||
      usedCredit < 0 || usedCredit > reservedCredit) {
    throw walletError('LIVE_BILLING_CALCULATION_FAILED', 'Wallet settlement values are invalid.');
  }
  const keys = [];
  if (charge > 0) keys.push({ type: 'live_session_usage', idempotencyKey: 'live-session-usage:' + id });
  if (usedCredit > 0) keys.push({ type: 'live_session_bonus_credit_used', idempotencyKey: 'live-session-bonus-credit-used:' + id });
  if (reservedCredit - usedCredit > 0) keys.push({ type: 'live_session_bonus_credit_release', idempotencyKey: 'live-session-bonus-credit-release:' + id });
  if (reservedCash - charge > 0) keys.push({ type: 'live_session_unused_release', idempotencyKey: 'live-session-release:' + id });
  return keys;
}

export function calculateWalletReservationSettlement({
  wallet, reservedAmountPaise, reservedBonusCreditPaise,
  chargedAmountPaise, bonusCreditUsedPaise
} = {}) {
  const reservedCash = Number(reservedAmountPaise);
  const reservedCredit = Number(reservedBonusCreditPaise);
  const charge = Number(chargedAmountPaise);
  const usedCredit = Number(bonusCreditUsedPaise);
  walletReservationSettlementKeys({
    sessionId: 'validation-only', reservedAmountPaise: reservedCash,
    reservedBonusCreditPaise: reservedCredit, chargedAmountPaise: charge,
    bonusCreditUsedPaise: usedCredit
  });
  const currentReserved = safePaise(wallet?.reservedBalancePaise);
  const currentReservedCredit = safePaise(wallet?.reservedBonusCreditPaise);
  if (currentReserved < reservedCash || currentReservedCredit < reservedCredit) {
    throw walletError('LIVE_WALLET_RESERVE_MISMATCH', 'Wallet cash or Bonus Credit reserve does not reconcile.');
  }
  const releasedCashPaise = reservedCash - charge;
  const releasedBonusCreditPaise = reservedCredit - usedCredit;
  const next = {
    availableBalancePaise: safePaise(wallet?.availableBalancePaise) + releasedCashPaise,
    reservedBalancePaise: currentReserved - reservedCash,
    bonusCreditBalancePaise: safePaise(wallet?.bonusCreditBalancePaise) + releasedBonusCreditPaise,
    reservedBonusCreditPaise: currentReservedCredit - reservedCredit
  };
  for (const value of Object.values(next)) {
    if (!Number.isSafeInteger(value) || value < 0 || value > MAX_WALLET_PAISE) {
      throw walletError('WALLET_BALANCE_OVERFLOW', 'Wallet settlement exceeds the supported balance range.');
    }
  }
  return Object.freeze({
    chargedAmountPaise: charge,
    releasedAmountPaise: releasedCashPaise,
    bonusCreditUsedPaise: usedCredit,
    bonusCreditReleasedPaise: releasedBonusCreditPaise,
    ...next
  });
}

export function validateWalletEntry({ type, amountPaise, direction, idempotencyKey, bonusCreditDeltaPaise = 0 } = {}) {
  const kind = String(type || '').trim();
  const amount = Number(amountPaise);
  const key = String(idempotencyKey || '').trim();
  const dir = String(direction || '').trim().toLowerCase();
  const bonusDelta = Number(bonusCreditDeltaPaise ?? 0);
  const bonusDeltaInvalid = !Number.isSafeInteger(bonusDelta) ||
    (bonusDelta !== 0 && (Math.abs(bonusDelta) !== amount ||
      (dir === 'credit' ? bonusDelta < 0 : dir === 'debit' ? bonusDelta > 0 : true)));
  if (!kind || kind.length > 80 || !key || key.length > 240 ||
      !Number.isSafeInteger(amount) || amount < 0 ||
      !['credit', 'debit', 'reserve', 'release'].includes(dir) || bonusDeltaInvalid) {
    throw walletError('WALLET_TRANSACTION_INVALID', 'Wallet transaction type, amount, direction and Bonus Credit delta are invalid.', 400);
  }
  return { type: kind, amountPaise: amount, direction: dir, idempotencyKey: key, bonusCreditDeltaPaise: bonusDelta };
}
