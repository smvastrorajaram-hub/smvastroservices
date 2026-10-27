'use strict';

const QUOTA_ERROR_CODES = new Set(['8', 'resource-exhausted', 'resource_exhausted']);

function isFirestoreQuotaError(error) {
  const code = String(error?.code ?? error?.status ?? '').trim().toLowerCase();
  if (QUOTA_ERROR_CODES.has(code)) return true;
  const message = String(error?.message || error?.details || '');
  return /(?:quota(?:\s+has)?\s+(?:been\s+)?exceeded|resource[_\s-]+exhausted|rate\s+limit\s+exceeded)/i.test(message);
}

/**
 * Read from a verified secondary replica, falling back to its authoritative
 * source only when the secondary reports quota exhaustion. This deliberately
 * does not retry writes: cross-project Wallet/session writes are not atomic.
 */
async function readWithQuotaFallback({
  secondaryDb,
  authoritativeDb,
  read,
  onQuotaFallback,
  logger = console,
  label = 'Firestore secondary read'
} = {}) {
  if (typeof read !== 'function') throw new TypeError('readWithQuotaFallback requires a read(db) function.');
  if (!authoritativeDb) throw new TypeError('readWithQuotaFallback requires an authoritative Firestore database.');

  if (!secondaryDb || secondaryDb === authoritativeDb) {
    return { value: await read(authoritativeDb), source: 'authoritative', usedFallback: false };
  }

  try {
    return { value: await read(secondaryDb), source: 'secondary', usedFallback: false };
  } catch (error) {
    if (!isFirestoreQuotaError(error)) throw error;

    const code = String(error?.code ?? error?.status ?? 'quota-exceeded');
    logger?.warn?.('[Firestore quota routing] ' + label + ' exhausted its secondary-project quota; retrying the authoritative read. code=' + code);
    if (typeof onQuotaFallback === 'function') {
      try { await onQuotaFallback(error); }
      catch (fallbackSideEffectError) {
        logger?.warn?.('[Firestore quota routing] Could not record secondary-read fallback for ' + label + ':', fallbackSideEffectError?.message || fallbackSideEffectError);
      }
    }
    return { value: await read(authoritativeDb), source: 'authoritative', usedFallback: true, originalErrorCode: code };
  }
}

module.exports = { isFirestoreQuotaError, readWithQuotaFallback };
