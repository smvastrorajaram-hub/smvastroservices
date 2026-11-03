const DEFAULT_TOKEN_URI = 'https://oauth2.googleapis.com/token';
const DEFAULT_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

function encodeBase64Url(value) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : new Uint8Array(value);
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(bytes.length, offset + 0x8000)));
  }
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function privateKeyDer(pem) {
  const match = String(pem || '').match(/-----BEGIN PRIVATE KEY-----([\s\S]+?)-----END PRIVATE KEY-----/);
  if (!match) throw new TypeError('A PKCS#8 service-account private key is required.');
  const raw = match[1].replace(/\s+/g, '');
  const binary = atob(raw);
  const output = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) output[i] = binary.charCodeAt(i);
  return output;
}

function normalizeCredentials(credentials) {
  const clientEmail = String(credentials?.client_email || credentials?.clientEmail || '').trim();
  const privateKey = String(credentials?.private_key || credentials?.privateKey || '').replace(/\\n/g, '\n').trim();
  const tokenUri = String(credentials?.token_uri || credentials?.tokenUri || DEFAULT_TOKEN_URI).trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail) || !privateKey ||
      tokenUri !== DEFAULT_TOKEN_URI) {
    throw new TypeError('Google service-account credentials are incomplete.');
  }
  return { clientEmail, privateKey, tokenUri };
}

/** WebCrypto-based OAuth2 service-account JWT bearer token provider for Workers and Node. */
export function createGoogleServiceAccountTokenProvider({
  credentials,
  scope = DEFAULT_SCOPE,
  fetchImpl = globalThis.fetch,
  cryptoImpl = globalThis.crypto,
  nowSeconds = () => Math.floor(Date.now() / 1000)
} = {}) {
  const account = normalizeCredentials(credentials);
  const scopes = [...new Set(String(scope || '').split(/\s+/).filter(Boolean))].sort();
  if (!scopes.length) throw new TypeError('At least one Google OAuth scope is required.');
  if (typeof fetchImpl !== 'function' || typeof cryptoImpl?.subtle?.importKey !== 'function' ||
      typeof cryptoImpl?.subtle?.sign !== 'function') {
    throw new TypeError('Fetch and WebCrypto RSASSA-PKCS1-v1_5 support are required.');
  }
  let importedKeyPromise;
  let cachedToken = '';
  let tokenExpiresAt = 0;
  let pending = null;

  async function signAssertion() {
    if (!importedKeyPromise) {
      importedKeyPromise = cryptoImpl.subtle.importKey(
        'pkcs8', privateKeyDer(account.privateKey),
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false, ['sign']
      );
    }
    const key = await importedKeyPromise;
    const now = Number(nowSeconds());
    if (!Number.isSafeInteger(now) || now < 1) throw new TypeError('Invalid OAuth clock value.');
    const header = encodeBase64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claims = encodeBase64Url(JSON.stringify({
      iss: account.clientEmail,
      scope: scopes.join(' '),
      aud: account.tokenUri,
      iat: now,
      exp: now + 3600
    }));
    const unsigned = header + '.' + claims;
    const signature = await cryptoImpl.subtle.sign(
      { name: 'RSASSA-PKCS1-v1_5' }, key, new TextEncoder().encode(unsigned)
    );
    return unsigned + '.' + encodeBase64Url(signature);
  }

  async function fetchToken() {
    const assertion = await signAssertion();
    let response;
    try {
      response = await fetchImpl(account.tokenUri, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion
        }).toString(),
        signal: AbortSignal.timeout(10000)
      });
    } catch {
      throw Object.assign(new Error('Google OAuth token endpoint is unavailable.'), { code: 'GOOGLE_OAUTH_UNAVAILABLE' });
    }
    const payload = await response.json().catch(() => ({}));
    const token = String(payload?.access_token || '').trim();
    const expiresIn = Number(payload?.expires_in);
    if (!response.ok || !token || !Number.isFinite(expiresIn) || expiresIn < 60) {
      throw Object.assign(new Error('Google OAuth token exchange failed.'), {
        code: 'GOOGLE_OAUTH_TOKEN_FAILED',
        httpStatus: response.status >= 500 ? 503 : 502
      });
    }
    cachedToken = token;
    tokenExpiresAt = Number(nowSeconds()) + expiresIn;
    return token;
  }

  async function getAccessToken() {
    const now = Number(nowSeconds());
    if (cachedToken && now < tokenExpiresAt - 60) return cachedToken;
    if (!pending) {
      pending = fetchToken().finally(() => { pending = null; });
    }
    return pending;
  }

  return Object.freeze({ getAccessToken, scope: scopes.join(' ') });
}

export { DEFAULT_SCOPE as FIREBASE_MESSAGING_SCOPE, DEFAULT_TOKEN_URI as GOOGLE_OAUTH_TOKEN_URI };
