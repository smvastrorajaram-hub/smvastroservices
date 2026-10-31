import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import {
  createFirebaseIdTokenVerifier,
  FIREBASE_SECURETOKEN_JWKS_ENDPOINT
} from '../../../shared/backend-platform/firebase-id-token.mjs';

const PROJECT_ID = 'smv-astro-staging';
const NOW = 1_800_000_000;
const KID = 'smv-test-signing-key';
let signingKey;
let publicJwk;
let keyFetchCount;

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

async function makeToken(overrides = {}, privateKey = signingKey) {
  const header = { alg: 'RS256', typ: 'JWT', kid: KID };
  const claims = {
    iss: 'https://securetoken.google.com/' + PROJECT_ID,
    aud: PROJECT_ID,
    sub: 'test-customer-uid',
    iat: NOW - 60,
    auth_time: NOW - 120,
    exp: NOW + 3600,
    email: 'customer@example.test',
    email_verified: true,
    firebase: { sign_in_provider: 'password' },
    ...overrides
  };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedClaims = base64url(JSON.stringify(claims));
  const input = encodedHeader + '.' + encodedClaims;
  const signature = await webcrypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    privateKey,
    new TextEncoder().encode(input)
  );
  return input + '.' + Buffer.from(signature).toString('base64url');
}

function makeVerifier() {
  keyFetchCount = 0;
  return createFirebaseIdTokenVerifier({
    cryptoImpl: webcrypto,
    nowSeconds: () => NOW,
    fetchImpl: async url => {
      assert.equal(url, FIREBASE_SECURETOKEN_JWKS_ENDPOINT);
      keyFetchCount += 1;
      return new Response(JSON.stringify({ keys: [publicJwk] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' }
      });
    }
  });
}

before(async () => {
  const pair = await webcrypto.subtle.generateKey({
    name: 'RSASSA-PKCS1-v1_5',
    modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: 'SHA-256'
  }, true, ['sign', 'verify']);
  signingKey = pair.privateKey;
  publicJwk = await webcrypto.subtle.exportKey('jwk', pair.publicKey);
  publicJwk.kid = KID;
  publicJwk.alg = 'RS256';
  publicJwk.use = 'sig';
});

test('accepts a valid Firebase ID token from an explicitly allowed project', async () => {
  const verify = makeVerifier();
  const token = await makeToken();
  const identity = await verify(token, [PROJECT_ID]);
  assert.equal(identity.uid, 'test-customer-uid');
  assert.equal(identity.projectId, PROJECT_ID);
  assert.equal(identity.emailVerified, true);
  assert.equal(identity.signInProvider, 'password');
  assert.equal(identity.email, 'customer@example.test');
  // Preserve the complete signed claims used by existing Render role checks.
  assert.equal(identity.aud, PROJECT_ID);
  assert.equal(identity.iss, 'https://securetoken.google.com/' + PROJECT_ID);
  assert.equal(identity.email_verified, true);
  assert.equal(identity.firebase.sign_in_provider, 'password');
  assert.equal(keyFetchCount, 1);
});

test('rejects a validly signed token whose project is not allowlisted', async () => {
  const verify = makeVerifier();
  const token = await makeToken();
  await assert.rejects(() => verify(token, ['some-other-project']), { code: 'AUTH_TOKEN_PROJECT_NOT_ALLOWED' });
  assert.equal(keyFetchCount, 0);
});

test('rejects expired tokens before any signing-key network request', async () => {
  const verify = makeVerifier();
  const token = await makeToken({ exp: NOW - 1 });
  await assert.rejects(() => verify(token, [PROJECT_ID]), { code: 'AUTH_TOKEN_CLAIMS_INVALID' });
  assert.equal(keyFetchCount, 0);
});

test('rejects malformed and non-RS256 tokens', async () => {
  const verify = makeVerifier();
  await assert.rejects(() => verify('not.a.jwt', [PROJECT_ID]), { code: 'AUTH_TOKEN_MALFORMED' });
  const token = await makeToken();
  const parts = token.split('.');
  const badHeader = base64url(JSON.stringify({ alg: 'none', kid: KID }));
  await assert.rejects(() => verify(badHeader + '.' + parts[1] + '.' + parts[2], [PROJECT_ID]), { code: 'AUTH_TOKEN_ALGORITHM_INVALID' });
});

test('rejects invalid signatures and reuses cached Google signing keys', async () => {
  const verify = makeVerifier();
  const first = await makeToken();
  await verify(first, [PROJECT_ID]);
  assert.equal(keyFetchCount, 1);

  const secondPair = await webcrypto.subtle.generateKey({
    name: 'RSASSA-PKCS1-v1_5',
    modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: 'SHA-256'
  }, true, ['sign', 'verify']);
  const forged = await makeToken({}, secondPair.privateKey);
  await assert.rejects(() => verify(forged, [PROJECT_ID]), { code: 'AUTH_TOKEN_SIGNATURE_INVALID' });
  assert.equal(keyFetchCount, 1);
});

test('rejects tokens missing Firebase sign-in metadata', async () => {
  const verify = makeVerifier();
  const token = await makeToken({ firebase: undefined });
  await assert.rejects(() => verify(token, [PROJECT_ID]), { code: 'AUTH_TOKEN_NOT_FIREBASE_ID_TOKEN' });
  assert.equal(keyFetchCount, 0);
});
