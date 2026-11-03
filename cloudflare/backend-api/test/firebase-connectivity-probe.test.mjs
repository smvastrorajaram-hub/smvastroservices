import test from 'node:test';
import assert from 'node:assert/strict';
import { createFirebaseConnectivityProbe } from '../src/firebase-connectivity-probe.mjs';

test('Firestore document exists proves service-account data-plane connectivity', async () => {
  const calls = [];
  const probe = createFirebaseConnectivityProbe({
    firestore: {
      async getDocument(path) {
        calls.push(path);
        return { exists: true, id: 'readiness', data: { ignored: true } };
      }
    },
    now: () => 1000
  });

  assert.equal(await probe(), true);
  assert.deepEqual(calls, ['smv_users/__smv_runtime_readiness_probe__']);
});

test('Firestore NOT_FOUND snapshot also proves service-account data-plane connectivity', async () => {
  const probe = createFirebaseConnectivityProbe({
    firestore: { async getDocument() { return { exists: false, data: null }; } },
    now: () => 1000
  });

  assert.equal(await probe(), true);
});

test('Firestore permission, credential and network errors fail closed', async () => {
  const errors = [
    Object.assign(new Error('permission denied'), { code: 'FIRESTORE_PERMISSION_DENIED' }),
    Object.assign(new Error('unauthenticated'), { code: 'FIRESTORE_UNAUTHENTICATED' }),
    Object.assign(new Error('network unavailable'), { code: 'FIRESTORE_UPSTREAM_UNAVAILABLE' })
  ];
  for (const error of errors) {
    const probe = createFirebaseConnectivityProbe({
      firestore: { async getDocument() { throw error; } },
      now: () => 1000
    });
    assert.equal(await probe(), false);
  }
});

test('missing Firestore adapter fails closed without attempting a provider call', async () => {
  assert.equal(await createFirebaseConnectivityProbe({ firestore: null })(), false);
  assert.equal(await createFirebaseConnectivityProbe({ firestore: {} })(), false);
});

test('concurrent readiness callers share one Firestore read and cached status', async () => {
  let calls = 0;
  let release;
  const waiting = new Promise(resolve => { release = resolve; });
  const probe = createFirebaseConnectivityProbe({
    firestore: {
      async getDocument() {
        calls += 1;
        await waiting;
        return { exists: false };
      }
    },
    ttlMs: 30000,
    now: () => 1000
  });

  const first = probe();
  const second = probe();
  release();
  assert.deepEqual(await Promise.all([first, second]), [true, true]);
  assert.equal(calls, 1);
  assert.equal(await probe(), true);
  assert.equal(calls, 1);
});

test('readiness cache expires and repeats only the single sentinel read', async () => {
  let current = 1000;
  let calls = 0;
  const probe = createFirebaseConnectivityProbe({
    firestore: {
      async getDocument() {
        calls += 1;
        return { exists: false };
      }
    },
    ttlMs: 5000,
    now: () => current
  });

  assert.equal(await probe(), true);
  current = 5999;
  assert.equal(await probe(), true);
  assert.equal(calls, 1);
  current = 6000;
  assert.equal(await probe(), true);
  assert.equal(calls, 2);
});

test('invalid document paths are rejected before contacting Firestore', () => {
  assert.throws(() => createFirebaseConnectivityProbe({
    firestore: { async getDocument() { throw new Error('must not run'); } },
    documentPath: 'smv_runtime',
  }), /document path/);
});
