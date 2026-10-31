import test from 'node:test';
import assert from 'node:assert/strict';
import { createGoogleServiceAccountTokenProvider } from '../../../shared/backend-platform/google-service-account-token.mjs';
import { createFirebaseMessagingHttpV1Client } from '../../../shared/backend-platform/firebase-messaging-http-v1.mjs';
import { createR2ObjectStore } from '../../../shared/backend-platform/r2-object-store.mjs';

const credentials = {
  client_email: 'smv-staging@example.iam.gserviceaccount.com',
  private_key: '-----BEGIN PRIVATE KEY-----\nAQIDBAUGBwgJCgsMDQ4PEA==\n-----END PRIVATE KEY-----',
  token_uri: 'https://oauth2.googleapis.com/token',
  project_id: 'smv-astro-staging'
};

function fakeCrypto() {
  return {
    subtle: {
      async importKey() { return { testKey: true }; },
      async sign(_algorithm, _key, data) {
        assert.ok(data instanceof Uint8Array);
        return new Uint8Array([1, 2, 3, 4]);
      }
    }
  };
}

function tokenResponse(token = 'test-access-token') {
  return new Response(JSON.stringify({ access_token: token, expires_in: 3600 }), {
    status: 200, headers: { 'Content-Type': 'application/json' }
  });
}

test('Google service-account token provider creates a JWT exchange and caches its access token', async () => {
  let calls = 0;
  let now = 1000;
  const provider = createGoogleServiceAccountTokenProvider({
    credentials,
    fetchImpl: async (_url, options) => {
      calls += 1;
      assert.equal(options.method, 'POST');
      assert.ok(String(options.body).includes('grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer'));
      return tokenResponse();
    },
    cryptoImpl: fakeCrypto(),
    nowSeconds: () => now
  });
  assert.equal(await provider.getAccessToken(), 'test-access-token');
  assert.equal(await provider.getAccessToken(), 'test-access-token');
  assert.equal(calls, 1, 'valid access token is cached');
  now += 3600;
  assert.equal(await provider.getAccessToken(), 'test-access-token');
  assert.equal(calls, 2, 'expired token is refreshed');
});

test('Google token provider fails closed for malformed service-account credentials', () => {
  assert.throws(() => createGoogleServiceAccountTokenProvider({
    credentials: { client_email: 'not-an-email', private_key: 'bad' },
    fetchImpl: async () => tokenResponse(),
    cryptoImpl: fakeCrypto()
  }), /credentials are incomplete/);
});

test('FCM HTTP v1 client validates targets and sends the expected request', async () => {
  let sent;
  const client = createFirebaseMessagingHttpV1Client({
    projectId: 'smv-astro-staging',
    tokenProvider: { async getAccessToken() { return 'access-token'; } },
    fetchImpl: async (url, options) => {
      sent = { url, options, body: JSON.parse(options.body) };
      return new Response(JSON.stringify({ name: 'projects/smv-astro-staging/messages/msg-1' }), { status: 200 });
    }
  });
  const result = await client.send({
    token: 'device-token',
    notification: { title: 'Incoming Call', body: 'A Customer is calling.' },
    data: { type: 'live_call', sessionId: 'session-1' }
  });
  assert.equal(result.success, true);
  assert.equal(sent.options.headers.Authorization, 'Bearer access-token');
  assert.equal(sent.body.message.token, 'device-token');
  assert.equal(sent.body.message.data.type, 'live_call');
  await assert.rejects(client.send({ token: 'one', topic: 'also-one' }), /Exactly one FCM target/);
});

test('FCM returns a stable error for unregistered device tokens', async () => {
  const client = createFirebaseMessagingHttpV1Client({
    projectId: 'smv-astro-staging',
    tokenProvider: { async getAccessToken() { return 'access-token'; } },
    fetchImpl: async () => new Response(JSON.stringify({
      error: { status: 'NOT_FOUND', details: [{ errorCode: 'UNREGISTERED' }] }
    }), { status: 404 })
  });
  await assert.rejects(client.send({ token: 'old-token' }), error => error.code === 'FCM_TOKEN_UNREGISTERED');
});

test('R2 object store keeps binary metadata and returns existing object details', async () => {
  const objects = new Map();
  const bucket = {
    async put(key, value, options) {
      objects.set(key, { value, options, size: value.byteLength, etag: 'etag-1' });
      return { etag: 'etag-1', version: 'v1' };
    },
    async get(key) {
      const item = objects.get(key);
      return item ? {
        size: item.size, etag: item.etag, version: 'v1', body: item.value,
        httpMetadata: item.options.httpMetadata, customMetadata: item.options.customMetadata
      } : null;
    },
    async head(key) {
      const item = objects.get(key);
      return item ? { size: item.size, etag: item.etag, httpMetadata: item.options.httpMetadata, customMetadata: item.options.customMetadata } : null;
    },
    async delete(key) { objects.delete(key); }
  };
  const store = createR2ObjectStore({ bucket, maxObjectBytes: 1024 });
  const bytes = new Uint8Array([1, 2, 3, 4]);
  const put = await store.put('smv-astro/apk/v1.apk', bytes, {
    contentType: 'application/vnd.android.package-archive',
    cacheControl: 'public, max-age=31536000, immutable',
    customMetadata: { versionCode: 1001, sha256: 'abc123' }
  });
  assert.equal(put.etag, 'etag-1');
  const object = await store.get('smv-astro/apk/v1.apk');
  assert.equal(object.size, 4);
  assert.equal(object.httpMetadata.contentType, 'application/vnd.android.package-archive');
  assert.equal(object.customMetadata.versionCode, '1001');
  assert.equal(await store.head('missing'), null);
  await store.delete('smv-astro/apk/v1.apk');
  assert.equal(await store.get('smv-astro/apk/v1.apk'), null);
});

test('R2 object store rejects traversal and over-sized uploads', async () => {
  const bucket = { put() {}, get() {}, head() {}, delete() {} };
  const store = createR2ObjectStore({ bucket, maxObjectBytes: 3 });
  await assert.rejects(store.put('../escape', new Uint8Array([1])), /key is invalid/);
  await assert.rejects(store.put('large', new Uint8Array([1, 2, 3, 4])), error => error.code === 'R2_OBJECT_TOO_LARGE');
});
