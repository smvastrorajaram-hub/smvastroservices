'use strict';

const FIREBASE_SECURETOKEN_JWKS_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const CLOCK_SKEW_SECONDS = 300;
const DEFAULT_JWKS_TTL_SECONDS = 300;
const MAX_JWKS_TTL_SECONDS = 3600;
const MAX_TOKEN_LENGTH = 16 * 1024;

function authError(code) {
  return Object.assign(new Error(code), { code });
}

function decodeBase64UrlBytes(value) {
  const raw = String(value || '');
  if (!/^[A-Za-z0-9_-]+$/.test(raw)) throw authError('AUTH_TOKEN_MALFORMED');
  const base64 = raw.replace(/-/g, '+').replace(/_/g, '/') +
    '='.repeat((4 - (raw.length % 4)) % 4);
  let binary;
  try {
    binary = atob(base64);
  } catch (_) {
    throw authError('AUTH_TOKEN_MALFORMED');
  }
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function decodeJsonSegment(value) {
  try {
    return JSON.parse(new TextDecoder().decode(decodeBase64UrlBytes(value)));
  } catch (_) {
    throw authError('AUTH_TOKEN_MALFORMED');
  }
}

function normalizeProjectAllowlist(value) {
  const values = value instanceof Set
    ? [...value]
    : Array.isArray(value)
      ? value
      : String(value || '').split(',');
  return new Set(values.map(item => String(item || '').trim()).filter(item =>
    /^[a-z0-9][a-z0-9-]{4,29}$/.test(item)
  ));
}

function jwksMaxAge(response) {
  const header = String(response.headers?.get?.('Cache-Control') || '');
  const match = /(?:^|,)\s*max-age=(\d+)/i.exec(header);
  const seconds = match ? Number(match[1]) : DEFAULT_JWKS_TTL_SECONDS;
  if (!Number.isSafeInteger(seconds) || seconds < 1) return DEFAULT_JWKS_TTL_SECONDS;
  return Math.min(MAX_JWKS_TTL_SECONDS, Math.max(60, seconds));
}

export function createFirebaseIdTokenVerifier({
  fetchImpl = globalThis.fetch,
  cryptoImpl = globalThis.crypto,
  nowSeconds = () => Math.floor(Date.now() / 1000)
} = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('A Fetch-compatible implementation is required.');
  if (!cryptoImpl?.subtle) throw new TypeError('Web Crypto SubtleCrypto is required.');

  let cachedKeys = null;
  let cacheExpiresAt = 0;
  let pendingFetch = null;

  async function loadSigningKeys(force = false) {
    const now = Number(nowSeconds());
    if (!force && cachedKeys && now < cacheExpiresAt) return cachedKeys;
    if (pendingFetch) return pendingFetch;

    pendingFetch = (async () => {
      const response = await fetchImpl(FIREBASE_SECURETOKEN_JWKS_URL, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8000)
      });
      if (!response?.ok) throw authError('AUTH_SIGNING_KEYS_UNAVAILABLE');
      const document = await response.json();
      if (!Array.isArray(document?.keys) || document.keys.length === 0) {
        throw authError('AUTH_SIGNING_KEYS_INVALID');
      }
      const keys = document.keys.filter(key =>
        key && key.kty === 'RSA' && typeof key.kid === 'string' &&
        key.kid.length > 0 && (!key.alg || key.alg === 'RS256') &&
        (!key.use || key.use === 'sig') && typeof key.n === 'string' && typeof key.e === 'string'
      );
      if (keys.length === 0) throw authError('AUTH_SIGNING_KEYS_INVALID');
      cachedKeys = keys;
      cacheExpiresAt = Number(nowSeconds()) + jwksMaxAge(response);
      return cachedKeys;
    })();

    try {
      return await pendingFetch;
    } finally {
      pendingFetch = null;
    }
  }

  return async function verifyFirebaseIdToken(token, allowedProjectIds) {
    const raw = String(token || '').trim();
    if (!raw || raw.length > MAX_TOKEN_LENGTH) throw authError('AUTH_TOKEN_MALFORMED');
    const parts = raw.split('.');
    if (parts.length !== 3) throw authError('AUTH_TOKEN_MALFORMED');

    const header = decodeJsonSegment(parts[0]);
    const claims = decodeJsonSegment(parts[1]);
    if (header?.alg !== 'RS256' || typeof header.kid !== 'string' ||
        (header.typ !== undefined && header.typ !== 'JWT')) {
      throw authError('AUTH_TOKEN_ALGORITHM_INVALID');
    }

    const projects = normalizeProjectAllowlist(allowedProjectIds);
    const projectId = typeof claims.aud === 'string' ? claims.aud : '';
    if (!projectId || !projects.has(projectId) ||
        claims.iss !== 'https://securetoken.google.com/' + projectId) {
      throw authError('AUTH_TOKEN_PROJECT_NOT_ALLOWED');
    }

    const uid = String(claims.sub || '');
    const now = Number(nowSeconds());
    const exp = Number(claims.exp);
    const iat = Number(claims.iat);
    const authTime = Number(claims.auth_time);
    if (!uid || uid.length > 128 ||
        !Number.isSafeInteger(exp) || exp <= now ||
        !Number.isSafeInteger(iat) || iat > now + CLOCK_SKEW_SECONDS ||
        !Number.isSafeInteger(authTime) || authTime > now + CLOCK_SKEW_SECONDS ||
        authTime > iat) {
      throw authError('AUTH_TOKEN_CLAIMS_INVALID');
    }
    if (claims.nbf !== undefined &&
        (!Number.isSafeInteger(Number(claims.nbf)) || Number(claims.nbf) > now + CLOCK_SKEW_SECONDS)) {
      throw authError('AUTH_TOKEN_NOT_YET_VALID');
    }
    if (!claims.firebase || typeof claims.firebase !== 'object' ||
        typeof claims.firebase.sign_in_provider !== 'string' ||
        !claims.firebase.sign_in_provider) {
      throw authError('AUTH_TOKEN_NOT_FIREBASE_ID_TOKEN');
    }

    let keys = await loadSigningKeys(false);
    let jwk = keys.find(key => key.kid === header.kid);
    if (!jwk) {
      keys = await loadSigningKeys(true);
      jwk = keys.find(key => key.kid === header.kid);
    }
    if (!jwk) throw authError('AUTH_SIGNING_KEY_NOT_FOUND');

    let publicKey;
    try {
      publicKey = await cryptoImpl.subtle.importKey(
        'jwk',
        jwk,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['verify']
      );
    } catch (_) {
      throw authError('AUTH_SIGNING_KEY_INVALID');
    }

    let valid = false;
    try {
      valid = await cryptoImpl.subtle.verify(
        { name: 'RSASSA-PKCS1-v1_5' },
        publicKey,
        decodeBase64UrlBytes(parts[2]),
        new TextEncoder().encode(parts[0] + '.' + parts[1])
      );
    } catch (_) {
      throw authError('AUTH_TOKEN_SIGNATURE_INVALID');
    }
    if (!valid) throw authError('AUTH_TOKEN_SIGNATURE_INVALID');

    return Object.freeze({
      uid,
      projectId,
      emailVerified: claims.email_verified === true,
      signInProvider: claims.firebase.sign_in_provider,
      email: typeof claims.email === 'string' ? claims.email : ''
    });
  };
}

export const FIREBASE_SECURETOKEN_JWKS_ENDPOINT = FIREBASE_SECURETOKEN_JWKS_URL;
