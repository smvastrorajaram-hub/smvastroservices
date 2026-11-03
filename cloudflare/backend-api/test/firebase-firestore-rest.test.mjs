import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createFirebaseFirestoreRestClient,
  decodeFirestoreValue,
  encodeDocumentPath
} from '../../../shared/backend-platform/firebase-firestore-rest.mjs';

test('encodes a valid Firestore resource path and rejects traversal', () => {
  assert.equal(
    encodeDocumentPath('smv-astro-staging', 'smv_users/customer-1'),
    'projects/smv-astro-staging/databases/(default)/documents/smv_users/customer-1'
  );
  assert.throws(
    () => encodeDocumentPath('smv-astro-staging', 'smv_users/../smv_admins/admin'),
    { code: 'FIRESTORE_DOCUMENT_PATH_INVALID' }
  );
});

test('decodes Firestore primitive, array and map value types', () => {
  assert.equal(decodeFirestoreValue({ integerValue: '1200' }), 1200);
  assert.equal(decodeFirestoreValue({ booleanValue: true }), true);
  assert.deepEqual(decodeFirestoreValue({
    arrayValue: { values: [{ stringValue: 'Tamil' }, { nullValue: null }] }
  }), ['Tamil', null]);
  assert.deepEqual(decodeFirestoreValue({
    mapValue: { fields: { role: { stringValue: 'customer' }, active: { booleanValue: true } } }
  }), { role: 'customer', active: true });
});

test('reads a Firestore document with the Firebase ID token and decodes fields', async () => {
  let call;
  const client = createFirebaseFirestoreRestClient({
    fetchImpl: async (url, options) => {
      call = { url, options };
      return new Response(JSON.stringify({
        name: 'projects/smv-astro-staging/databases/(default)/documents/smv_users/u-1',
        createTime: '2026-10-31T00:00:00Z',
        fields: {
          role: { stringValue: 'customer' },
          emailVerified: { booleanValue: true },
          credits: { integerValue: '25' },
          tags: { arrayValue: { values: [{ stringValue: 'wallet' }] } }
        }
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
  });
  const result = await client.getDocument({
    projectId: 'smv-astro-staging',
    documentPath: 'smv_users/u-1',
    idToken: 'firebase-test-token'
  });
  assert.equal(call.options.headers.Authorization, 'Bearer firebase-test-token');
  assert.match(call.url, /smv_users\/u-1$/);
  assert.equal(result.exists, true);
  assert.deepEqual(result.data, {
    role: 'customer', emailVerified: true, credits: 25, tags: ['wallet']
  });
});

test('returns a safe not-found result for a missing document', async () => {
  const client = createFirebaseFirestoreRestClient({
    fetchImpl: async () => new Response('', { status: 404 })
  });
  const result = await client.getDocument({
    projectId: 'smv-astro-staging',
    documentPath: 'smv_admins/u-1',
    idToken: 'firebase-test-token'
  });
  assert.equal(result.exists, false);
  assert.equal(result.id, 'u-1');
});

test('does not leak Firestore response details on permission or upstream failures', async () => {
  const denied = createFirebaseFirestoreRestClient({
    fetchImpl: async () => new Response('private diagnostic body', { status: 403 })
  });
  await assert.rejects(() => denied.getDocument({
    projectId: 'smv-astro-staging', documentPath: 'smv_users/u-1', idToken: 'token'
  }), { code: 'FIRESTORE_PERMISSION_DENIED', httpStatus: 403 });

  const unavailable = createFirebaseFirestoreRestClient({
    fetchImpl: async () => new Response('internal diagnostic body', { status: 503 })
  });
  await assert.rejects(() => unavailable.getDocument({
    projectId: 'smv-astro-staging', documentPath: 'smv_users/u-1', idToken: 'token'
  }), { code: 'FIRESTORE_UPSTREAM_UNAVAILABLE', httpStatus: 503 });
});
