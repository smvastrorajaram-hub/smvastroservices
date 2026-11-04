const REFERENCE_MIN = 100_000;
const REFERENCE_RANGE = 900_000;
const UINT32_SPACE = 0x1_0000_0000;
const ACCEPT_LIMIT = Math.floor(UINT32_SPACE / REFERENCE_RANGE) * REFERENCE_RANGE;

/**
 * Produce a non-sequential, cryptographically random six-digit public reference.
 * Database-backed callers should use createUniqueNumericReference so the
 * corresponding unique index can protect the value across concurrent writes.
 */
export function createNumericReference(prefix, cryptoImpl = globalThis.crypto) {
  const normalizedPrefix = String(prefix || '').trim().toLowerCase();
  if (!/^[a-z]{2,12}$/.test(normalizedPrefix)) {
    throw new TypeError('A short lowercase reference prefix is required.');
  }
  if (typeof cryptoImpl?.getRandomValues !== 'function') {
    throw new TypeError('Web Crypto secure random values are required.');
  }

  const sample = new Uint32Array(1);
  for (let attempt = 0; attempt < 128; attempt += 1) {
    cryptoImpl.getRandomValues(sample);
    const value = Number(sample[0]);
    // Rejection sampling avoids modulo bias across the 900,000 valid IDs.
    if (value < ACCEPT_LIMIT) {
      return normalizedPrefix + '-' + String(REFERENCE_MIN + (value % REFERENCE_RANGE));
    }
  }
  throw new Error('Secure random reference generation did not converge.');
}

export async function createUniqueNumericReference({
  prefix,
  cryptoImpl = globalThis.crypto,
  exists,
  maxAttempts = 32
} = {}) {
  if (typeof exists !== 'function') {
    throw new TypeError('A reference-existence check is required.');
  }
  const attempts = Math.max(1, Math.min(128, Math.floor(Number(maxAttempts) || 32)));
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const candidate = createNumericReference(prefix, cryptoImpl);
    if (!(await exists(candidate))) return candidate;
  }
  throw Object.assign(
    new Error('A unique public payment reference could not be allocated. Please retry.'),
    { code: 'PUBLIC_REFERENCE_ID_EXHAUSTED', httpStatus: 503 }
  );
}
