export const WALLET_RECHARGE_OFFER_TYPE = 'wallet_recharge_bonus_minutes';
export const WALLET_OFFER_THEMES = Object.freeze([
  'auto','generic','pongal','diwali','navaratri','dasara','ayudha_pooja','shivaratri',
  'tamil_new_year','vinayagar_chaturthi','karthigai_deepam','thaipusam','new_year',
  'onam','christmas','eid'
]);

export function walletRechargeError(code, message, httpStatus = 409) {
  return Object.assign(new Error(message || code), { code, httpStatus });
}

export function parseRupeesToPaise(value, { allowZero = false } = {}) {
  const raw = String(value ?? '').trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) return null;
  const [whole, fraction = ''] = raw.split('.');
  const paise = Number(whole) * 100 + Number((fraction + '00').slice(0, 2));
  if (!Number.isSafeInteger(paise) || paise < 0 || (!allowZero && paise === 0)) return null;
  return paise;
}

export function paiseToRupees(value) {
  const paise = Number(value);
  return Number.isSafeInteger(paise) && paise >= 0 ? paise / 100 : null;
}

export function classifyRechargeIntent({ status, storedAmountPaise, requestedAmountPaise } = {}) {
  const stored = Number(storedAmountPaise);
  const requested = Number(requestedAmountPaise);
  if (!Number.isSafeInteger(stored) || !Number.isSafeInteger(requested) || stored !== requested) return 'amount_conflict';
  const state = String(status || '');
  if (state === 'paid') return 'already_paid';
  if (state === 'order_created') return 'reuse_order';
  if (state === 'failed') return 'retry_failed';
  if (state === 'order_creating') return 'in_progress';
  return 'in_progress';
}

export function offerDateMilliseconds(value) {
  if (value == null || value === '') return null;
  if (value && typeof value.toMillis === 'function') {
    const timestamp = Number(value.toMillis());
    return Number.isFinite(timestamp) ? timestamp : null;
  }
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const raw = String(value).trim();
  if (!raw) return null;
  // Match the legacy Admin Offer contract: datetime-local values are India time.
  const ist = /^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}(?::\\d{2})?$/.test(raw);
  const parsed = Date.parse(ist ? raw + '+05:30' : raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function rechargeOfferMatches(offer, { amountPaise, nowMs = Date.now(), redemptionCount = 0 } = {}) {
  if (!offer || offer.offerType !== WALLET_RECHARGE_OFFER_TYPE || offer.enabled !== true) return false;
  const amount = Number(amountPaise);
  const bonus = Number(offer.bonusMinutes);
  const minimum = Number(offer.minimumRechargeAmountPaise ?? 0);
  const used = Number(offer.usedCount ?? 0);
  const totalLimit = Number(offer.totalUsageLimit ?? 0);
  const perCustomerLimit = Number(offer.perCustomerLimit ?? 1);
  const usedByCustomer = Number(redemptionCount);
  if (!Number.isSafeInteger(amount) || amount < 100 ||
      !Number.isSafeInteger(bonus) || bonus < 1 || bonus > 1440 ||
      !Number.isSafeInteger(minimum) || minimum < 0 || amount < minimum ||
      !Number.isSafeInteger(used) || used < 0 ||
      !Number.isSafeInteger(totalLimit) || totalLimit < 0 ||
      !Number.isSafeInteger(perCustomerLimit) || perCustomerLimit < 0 ||
      !Number.isSafeInteger(usedByCustomer) || usedByCustomer < 0) return false;
  if (totalLimit > 0 && used >= totalLimit) return false;
  if (perCustomerLimit > 0 && usedByCustomer >= perCustomerLimit) return false;
  if (offer.startAt != null) {
    const start = offerDateMilliseconds(offer.startAt);
    if (start === null || nowMs < start) return false;
  }
  if (offer.endAt != null) {
    const end = offerDateMilliseconds(offer.endAt);
    if (end === null || nowMs >= end) return false;
  }
  return true;
}

export function selectRechargeBonusOffer({ offers, amountPaise, nowMs = Date.now(), usageCounts = {} } = {}) {
  const candidates = (Array.isArray(offers) ? offers : []).filter(offer =>
    rechargeOfferMatches(offer, { amountPaise, nowMs, redemptionCount: usageCounts[offer.id] ?? 0 })
  );
  candidates.sort((a,b) =>
    Number(b.priority || 0) - Number(a.priority || 0) ||
    Number(b.bonusMinutes || 0) - Number(a.bonusMinutes || 0) ||
    String(a.name || a.id || '').localeCompare(String(b.name || b.id || ''))
  );
  return candidates.length ? candidates[0] : null;
}

export async function walletRechargeId(ownerUid, idempotencyKey, cryptoImpl = globalThis.crypto) {
  const uid = String(ownerUid || '').trim();
  const key = String(idempotencyKey || '').trim();
  if (!uid || uid.length > 160 || !/^[A-Za-z0-9:_-]{8,128}$/.test(key)) {
    throw walletRechargeError('WALLET_IDEMPOTENCY_KEY_INVALID', 'Wallet recharge request key is invalid.', 400);
  }
  if (!cryptoImpl?.subtle?.digest) throw new TypeError('Web Crypto SHA-256 is required.');
  const value = 'wallet-recharge:' + uid + ':' + key;
  const digest = await cryptoImpl.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
