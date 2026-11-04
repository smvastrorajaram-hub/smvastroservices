function text(value) { return String(value ?? '').trim(); }
function decodeAes256Key(encoded) {
  const source = text(encoded);
  if (!source) throw new TypeError('PAYOUT_ENCRYPTION_KEY_MISSING');
  const normalized = source.replace(/-/g, '+').replace(/_/g, '/');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(normalized)) throw new TypeError('PAYOUT_ENCRYPTION_KEY_INVALID');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
  if (bytes.length !== 32) throw new TypeError('PAYOUT_ENCRYPTION_KEY_INVALID');
  return bytes;
}
function hex(bytes) {
  return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
}
function fromHex(value, expectedLength) {
  const source = text(value);
  if (!/^(?:[0-9a-f]{2})+$/i.test(source)) throw new TypeError('PAYOUT_CIPHERTEXT_INVALID');
  const bytes = Uint8Array.from(source.match(/.{2}/g), pair => parseInt(pair, 16));
  if (expectedLength && bytes.length !== expectedLength) throw new TypeError('PAYOUT_CIPHERTEXT_INVALID');
  return bytes;
}
function versionedAad(sourceProjectId, withdrawalId, keyVersion) {
  return new TextEncoder().encode(
    'smv-astro-wallet-payout:v1:' + text(sourceProjectId) + ':' +
    text(withdrawalId) + ':' + text(keyVersion)
  );
}
function requireWebCrypto(cryptoImpl, operation) {
  if (!cryptoImpl?.subtle?.importKey || typeof cryptoImpl.subtle[operation] !== 'function' ||
      typeof cryptoImpl.getRandomValues !== 'function') {
    throw new TypeError('PAYOUT_ENCRYPTION_UNAVAILABLE');
  }
}
export function validatePayoutEncryptionConfiguration({payoutEncryptionKey='',payoutKeyVersion='v1'}={}) {
  try {
    decodeAes256Key(payoutEncryptionKey);
    return /^[A-Za-z0-9._-]{1,32}$/.test(text(payoutKeyVersion)||'v1');
  } catch {
    return false;
  }
}

export async function encryptPayoutSnapshot({
  payload, withdrawalId, payoutEncryptionKey, payoutKeyVersion = 'v1',
  sourceProjectId = 'smv-astro-staging', nowMs = Date.now(), cryptoImpl = globalThis.crypto
} = {}) {
  const id = text(withdrawalId);
  const version = text(payoutKeyVersion) || 'v1';
  if (!id) throw new TypeError('PAYOUT_WITHDRAWAL_ID_INVALID');
  if (!/^[A-Za-z0-9._-]{1,32}$/.test(version)) throw new TypeError('PAYOUT_ENCRYPTION_KEY_VERSION_INVALID');
  requireWebCrypto(cryptoImpl, 'encrypt');
  const keyBytes = decodeAes256Key(payoutEncryptionKey);
  const key = await cryptoImpl.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt']);
  const nonce = cryptoImpl.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(payload && typeof payload === 'object' ? payload : {}));
  const encrypted = new Uint8Array(await cryptoImpl.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, additionalData: versionedAad(sourceProjectId, id, version), tagLength: 128 },
    key, plaintext
  ));
  if (encrypted.length <= 16) throw new Error('PAYOUT_ENCRYPTION_FAILED');
  const digest = new Uint8Array(await cryptoImpl.subtle.digest('SHA-256', plaintext));
  const timestamp = Math.max(1, Math.trunc(Number(nowMs) || 1));
  return Object.freeze({
    withdrawalId: id,
    algorithm: 'AES-256-GCM',
    keyVersion: version,
    nonceHex: hex(nonce),
    ciphertextHex: hex(encrypted.slice(0, -16)),
    authTagHex: hex(encrypted.slice(-16)),
    sourcePayloadSha256: hex(digest),
    createdAtMs: timestamp,
    updatedAtMs: timestamp
  });
}
export async function decryptPayoutSnapshot({
  record, payoutEncryptionKey, sourceProjectId = 'smv-astro-staging',
  cryptoImpl = globalThis.crypto
} = {}) {
  const row = record && typeof record === 'object' ? record : {};
  const id = text(row.withdrawal_id || row.withdrawalId);
  const version = text(row.key_version || row.keyVersion);
  if (!id || !version || String(row.algorithm || '') !== 'AES-256-GCM') {
    throw new TypeError('PAYOUT_ENCRYPTED_SNAPSHOT_INVALID');
  }
  requireWebCrypto(cryptoImpl, 'decrypt');
  const key = await cryptoImpl.subtle.importKey(
    'raw', decodeAes256Key(payoutEncryptionKey), { name: 'AES-GCM' }, false, ['decrypt']
  );
  const nonce = fromHex(row.nonce_hex || row.nonceHex, 12);
  const ciphertext = fromHex(row.ciphertext_hex || row.ciphertextHex);
  const tag = fromHex(row.auth_tag_hex || row.authTagHex, 16);
  const combined = new Uint8Array(ciphertext.length + tag.length);
  combined.set(ciphertext);
  combined.set(tag, ciphertext.length);
  const plaintext = await cryptoImpl.subtle.decrypt(
    { name: 'AES-GCM', iv: nonce, additionalData: versionedAad(sourceProjectId, id, version), tagLength: 128 },
    key, combined
  );
  const decoded = JSON.parse(new TextDecoder().decode(plaintext));
  if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) {
    throw new TypeError('PAYOUT_DECRYPTED_PAYLOAD_INVALID');
  }
  return decoded;
}
