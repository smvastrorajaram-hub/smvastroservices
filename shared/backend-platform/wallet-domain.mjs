// Platform-neutral Wallet business rules shared by Render and Cloudflare adapters.
export const WALLET_CURRENCY = 'INR';
export const MAX_WALLET_PAISE = Number.MAX_SAFE_INTEGER;
export const MAX_BONUS_MINUTES = 1_000_000;

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

export function safeMinutes(value) {
  const number = Number(value ?? 0);
  return Number.isSafeInteger(number) && number >= 0 && number <= MAX_BONUS_MINUTES ? number : 0;
}

export function normalizeWallet(raw = {}, ownerUid = '', ownerRole = '') {
  const owner = validateWalletOwner(ownerUid || raw.ownerUid, ownerRole || raw.ownerRole);
  return Object.freeze({
    ownerUid: owner.ownerUid,
    ownerRole: owner.ownerRole,
    currency: WALLET_CURRENCY,
    availableBalancePaise: safePaise(raw.availableBalancePaise),
    reservedBalancePaise: safePaise(raw.reservedBalancePaise),
    bonusMinutesBalance: safeMinutes(raw.bonusMinutesBalance),
    reservedBonusMinutes: safeMinutes(raw.reservedBonusMinutes),
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
  const bonusMinutesReserved = Math.min(length, safeMinutes(wallet?.bonusMinutesBalance));
  const cashMinutesRequired = length - bonusMinutesReserved;
  const reservedAmountPaise = cashMinutesRequired * rate;
  if (!Number.isSafeInteger(reservedAmountPaise) || reservedAmountPaise < 0) {
    throw walletError('LIVE_PRICE_INVALID', 'Session reserve is outside the supported range.');
  }
  const available = safePaise(wallet?.availableBalancePaise);
  if (available < reservedAmountPaise) {
    throw walletError('WALLET_INSUFFICIENT_BALANCE', 'Insufficient Wallet balance for the selected duration.', 409, {
      availableBalancePaise: available,
      requiredBalancePaise: reservedAmountPaise,
      shortfallPaise: reservedAmountPaise - available
    });
  }
  return Object.freeze({
    minutes: length,
    ratePerMinutePaise: rate,
    cashMinutesRequired,
    bonusMinutesReserved,
    reservedAmountPaise,
    availableBalanceAfterPaise: available - reservedAmountPaise,
    reservedBalanceAfterPaise: safePaise(wallet?.reservedBalancePaise) + reservedAmountPaise,
    bonusMinutesBalanceAfter: safeMinutes(wallet?.bonusMinutesBalance) - bonusMinutesReserved,
    reservedBonusMinutesAfter: safeMinutes(wallet?.reservedBonusMinutes) + bonusMinutesReserved
  });
}

export function walletReservationSettlementKeys({ sessionId, reservedAmountPaise, reservedBonusMinutes, chargedAmountPaise, freeMinutesUsed } = {}) {
  const id = String(sessionId || '').trim();
  const reservedCash = Number(reservedAmountPaise);
  const reservedBonus = Number(reservedBonusMinutes);
  const charge = Number(chargedAmountPaise);
  const usedBonus = Number(freeMinutesUsed);
  if (!id || ![reservedCash, reservedBonus, charge, usedBonus].every(Number.isSafeInteger) ||
      reservedCash < 0 || reservedBonus < 0 || charge < 0 || charge > reservedCash ||
      usedBonus < 0 || usedBonus > reservedBonus) {
    throw walletError('LIVE_BILLING_CALCULATION_FAILED', 'Wallet settlement values are invalid.');
  }
  const keys = [];
  if (charge > 0) keys.push({ type: 'live_session_usage', idempotencyKey: 'live-session-usage:' + id });
  if (usedBonus > 0) keys.push({ type: 'live_session_bonus_minutes', idempotencyKey: 'live-session-bonus-used:' + id });
  if (reservedBonus - usedBonus > 0) keys.push({ type: 'live_session_bonus_minutes_release', idempotencyKey: 'live-session-bonus-release:' + id });
  if (reservedCash - charge > 0) keys.push({ type: 'live_session_unused_release', idempotencyKey: 'live-session-release:' + id });
  return keys;
}

export function calculateWalletReservationSettlement({
  wallet,
  reservedAmountPaise,
  reservedBonusMinutes,
  chargedAmountPaise,
  freeMinutesUsed
} = {}) {
  const reservedCash = Number(reservedAmountPaise);
  const reservedBonus = Number(reservedBonusMinutes);
  const charge = Number(chargedAmountPaise);
  const usedBonus = Number(freeMinutesUsed);
  walletReservationSettlementKeys({
    sessionId: 'validation-only', reservedAmountPaise: reservedCash,
    reservedBonusMinutes: reservedBonus, chargedAmountPaise: charge, freeMinutesUsed: usedBonus
  });
  const currentReserved = safePaise(wallet?.reservedBalancePaise);
  const currentReservedBonus = safeMinutes(wallet?.reservedBonusMinutes);
  if (currentReserved < reservedCash || currentReservedBonus < reservedBonus) {
    throw walletError('LIVE_WALLET_RESERVE_MISMATCH', 'Wallet cash or promotional reserve does not reconcile with this Live Session.');
  }
  const releasedCashPaise = reservedCash - charge;
  const releasedBonusMinutes = reservedBonus - usedBonus;
  const next = {
    availableBalancePaise: safePaise(wallet?.availableBalancePaise) + releasedCashPaise,
    reservedBalancePaise: currentReserved - reservedCash,
    bonusMinutesBalance: safeMinutes(wallet?.bonusMinutesBalance) + releasedBonusMinutes,
    reservedBonusMinutes: currentReservedBonus - reservedBonus
  };
  for (const value of Object.values(next)) {
    if (!Number.isSafeInteger(value) || value < 0 ||
        value > (value === next.bonusMinutesBalance || value === next.reservedBonusMinutes ? MAX_BONUS_MINUTES : MAX_WALLET_PAISE)) {
      throw walletError('WALLET_BALANCE_OVERFLOW', 'Wallet settlement exceeds the supported balance range.');
    }
  }
  return Object.freeze({
    chargedAmountPaise: charge,
    releasedAmountPaise: releasedCashPaise,
    freeMinutesUsed: usedBonus,
    bonusMinutesReleased: releasedBonusMinutes,
    ...next
  });
}

export function validateWalletEntry({ type, amountPaise, direction, idempotencyKey } = {}) {
  const kind = String(type || '').trim();
  const amount = Number(amountPaise);
  const key = String(idempotencyKey || '').trim();
  const dir = String(direction || '').trim().toLowerCase();
  if (!kind || kind.length > 80 || !key || key.length > 240 ||
      !Number.isSafeInteger(amount) || amount < 0 ||
      !['credit', 'debit', 'reserve', 'release'].includes(dir)) {
    throw walletError('WALLET_TRANSACTION_INVALID', 'Wallet transaction type, amount, direction and idempotency key are required.', 400);
  }
  return { type: kind, amountPaise: amount, direction: dir, idempotencyKey: key };
}
