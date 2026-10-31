import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FirestoreFieldValue,
  buildFirestoreStructuredQuery,
  buildWrite,
  createFirestoreAdminRestClient,
  decodeFirestoreValue,
  encodeFirestoreValue
} from '../../../shared/backend-platform/firestore-admin-rest.mjs';

const doc = {
  name: 'projects/smv-astro-staging/databases/(default)/documents/smv_users/customer-1',
  fields: {
    role: { stringValue: 'customer' },
    active: { booleanValue: true },
    balance: { integerValue: '1234' },
    createdAt: { timestampValue: '2026-10-31T06:00:00.000Z' },
    profile: { mapValue: { fields: { name: { stringValue: 'Customer One' } } } }
  },
  createTime: '2026-10-31T06:00:00.000Z',
  updateTime: '2026-10-31T06:01:00.000Z'
};

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } });
}

function clientWithFetch(fetchImpl) {
  return createFirestoreAdminRestClient({
    projectId: 'smv-astro-staging',
    allowedProjectIds: ['smv-astro-staging'],
    tokenProvider: { async getAccessToken() { return 'admin-access-token'; } },
    fetchImpl
  });
}

test('Firestore value encoding and decoding preserves primitive, timestamp, byte and nested map types', () => {
  assert.deepEqual(encodeFirestoreValue({ enabled: true, points: [1, 'two'] }), {
    mapValue: { fields: {
      enabled: { booleanValue: true },
      points: { arrayValue: { values: [{ integerValue: '1' }, { stringValue: 'two' }] } }
    } }
  });
  assert.equal(decodeFirestoreValue({ integerValue: '99999999999999999' }), '99999999999999999');
  assert.equal(decodeFirestoreValue({ timestampValue: '2026-10-31T06:00:00.000Z' }).toISOString(), '2026-10-31T06:00:00.000Z');
  assert.deepEqual([...decodeFirestoreValue({ bytesValue: 'AQID' })], [1, 2, 3]);
});

test('Admin REST client gets a document with the service-account access token and decodes fields', async () => {
  let captured;
  const client = clientWithFetch(async (url, options) => {
    captured = { url: String(url), options };
    return jsonResponse(doc);
  });
  const result = await client.getDocument('smv_users/customer-1');
  assert.equal(result.exists, true);
  assert.equal(result.id, 'customer-1');
  assert.equal(result.data.role, 'customer');
  assert.equal(result.data.balance, 1234);
  assert.equal(captured.options.headers.Authorization, 'Bearer admin-access-token');
  assert.ok(captured.url.endsWith('/smv_users/customer-1'));
});

test('Admin REST document read returns a non-existing snapshot on 404', async () => {
  const client = clientWithFetch(async () => jsonResponse({ error: { status: 'NOT_FOUND' } }, 404));
  const result = await client.getDocument('smv_users/missing');
  assert.equal(result.exists, false);
  assert.equal(result.id, 'missing');
});

test('Structured query builds equality filters, ordering, limit and nested parent path', () => {
  const built = buildFirestoreStructuredQuery({
    collectionPath: 'smv_live_sessions/session-1/messages',
    filters: [{ field: 'senderUid', op: '==', value: 'customer-1' }],
    orderBy: [{ field: 'createdAt', direction: 'desc' }],
    limit: 25
  });
  assert.equal(built.parentPath, 'smv_live_sessions/session-1');
  assert.equal(built.structuredQuery.from[0].collectionId, 'messages');
  assert.equal(built.structuredQuery.where.fieldFilter.op, 'EQUAL');
  assert.equal(built.structuredQuery.orderBy[0].direction, 'DESCENDING');
  assert.equal(built.structuredQuery.limit, 25);
});

test('runQuery sends the structured query to the correct parent collection and decodes results', async () => {
  let captured;
  const client = clientWithFetch(async (url, options) => {
    captured = { url: String(url), options, body: JSON.parse(options.body) };
    return jsonResponse([{ document: doc, readTime: '2026-10-31T06:02:00Z' }]);
  });
  const rows = await client.runQuery({
    collectionPath: 'smv_users',
    filters: [{ field: 'role', op: '==', value: 'customer' }],
    orderBy: [{ field: 'createdAt', direction: 'desc' }],
    limit: 10
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].data.role, 'customer');
  assert.ok(captured.url.endsWith('/documents:runQuery'));
  assert.equal(captured.body.structuredQuery.where.fieldFilter.value.stringValue, 'customer');
});

test('Firestore writes encode nested update masks and server-side transforms', () => {
  const write = buildWrite('smv-astro-staging', 'smv_users/customer-1', {
    profile: { name: 'Updated Name' },
    lastSeen: FirestoreFieldValue.serverTimestamp(),
    requestCount: FirestoreFieldValue.increment(1),
    obsoleteField: FirestoreFieldValue.delete()
  }, { mode: 'update' });
  assert.equal(write.update.name.endsWith('/smv_users/customer-1'), true);
  assert.equal(write.update.fields.profile.mapValue.fields.name.stringValue, 'Updated Name');
  assert.equal(write.currentDocument.exists, true);
  assert.ok(write.updateMask.fieldPaths.includes('profile.name'));
  assert.ok(write.updateMask.fieldPaths.includes('obsoleteField'));
  assert.deepEqual(write.updateTransforms.map(item => item.fieldPath).sort(), ['lastSeen','requestCount']);
  assert.equal(write.updateTransforms[0].setToServerValue, 'REQUEST_TIME');
});

test('Firestore Admin transaction reads through the transaction and commits all writes atomically', async () => {
  const calls = [];
  const client = clientWithFetch(async (url, options) => {
    const target = String(url);
    calls.push({ url: target, method: options.method, body: options.body ? JSON.parse(options.body) : null });
    if (target.endsWith(':beginTransaction')) return jsonResponse({ transaction: 'txn-1' });
    if (target.includes('/smv_users/customer-1?transaction=txn-1')) return jsonResponse(doc);
    if (target.endsWith(':commit')) return jsonResponse({ writeResults: [{}] });
    if (target.endsWith(':rollback')) return jsonResponse({});
    throw new Error('Unexpected Firestore call ' + target);
  });
  const result = await client.runTransaction(async tx => {
    const snapshot = await tx.getDocument('smv_users/customer-1');
    assert.equal(snapshot.data.role, 'customer');
    tx.update('smv_users/customer-1', {
      lastSeen: FirestoreFieldValue.serverTimestamp(),
      profile: { name: 'New Name' }
    });
    return { uid: snapshot.id, stagedWrites: tx.writeCount() };
  });
  assert.deepEqual(result, { uid: 'customer-1', stagedWrites: 1 });
  const commit = calls.find(call => call.url.endsWith(':commit'));
  assert.equal(commit.body.transaction, 'txn-1');
  assert.equal(commit.body.writes.length, 1);
  assert.ok(commit.body.writes[0].updateTransforms.some(item => item.fieldPath === 'lastSeen'));
  assert.ok(commit.body.writes[0].updateMask.fieldPaths.includes('profile.name'));
});

test('Firestore transaction retries an ABORTED commit using a new transaction ID', async () => {
  const calls = [];
  let commits = 0;
  const client = clientWithFetch(async (url, options) => {
    const target = String(url);
    calls.push(target);
    if (target.endsWith(':beginTransaction')) return jsonResponse({ transaction: 'txn-' + (commits + 1) });
    if (target.includes('/smv_users/customer-1?transaction=')) return jsonResponse(doc);
    if (target.endsWith(':commit')) {
      commits += 1;
      if (commits === 1) return jsonResponse({ error: { code: 409, status: 'ABORTED' } }, 409);
      return jsonResponse({ writeResults: [{}] });
    }
    if (target.endsWith(':rollback')) return jsonResponse({});
    throw new Error('Unexpected Firestore call ' + target);
  });
  let callbacks = 0;
  const result = await client.runTransaction(async tx => {
    callbacks += 1;
    const snap = await tx.getDocument('smv_users/customer-1');
    tx.update('smv_users/customer-1', { role: snap.data.role });
    return callbacks;
  });
  assert.equal(result, 2);
  assert.equal(callbacks, 2);
  assert.equal(commits, 2);
  assert.equal(calls.filter(url => url.endsWith(':beginTransaction')).length, 2);
});

test('Firestore batch write commits staged operations together', async () => {
  let body;
  const client = clientWithFetch(async (_url, options) => {
    body = JSON.parse(options.body);
    return jsonResponse({ writeResults: [{}, {}] });
  });
  const batch = client.createWriteBatch();
  batch.set('smv_users/customer-1', { role: 'customer' }, { merge: true });
  batch.delete('smv_users/customer-2');
  const result = await batch.commit();
  assert.equal(result.writeResults.length, 2);
  assert.equal(body.writes.length, 2);
});
