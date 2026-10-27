'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { isFirestoreQuotaError, readWithQuotaFallback } = require('../firestore-quota-routing');

test('recognizes Firestore resource-exhausted quota errors, not authorization failures', () => {
  assert.equal(isFirestoreQuotaError({ code: 8, message: 'Resource exhausted' }), true);
  assert.equal(isFirestoreQuotaError({ code: 'resource-exhausted' }), true);
  assert.equal(isFirestoreQuotaError({ code: 'firestore/resource-exhausted' }), true);
  assert.equal(isFirestoreQuotaError({ message: 'Quota exceeded for this database.' }), true);
  assert.equal(isFirestoreQuotaError({ code: 7, message: 'Permission denied' }), false);
  assert.equal(isFirestoreQuotaError({ code: 9, message: 'Missing composite index' }), false);
});

test('routes a primary quota read to an explicitly supplied verified replica', async () => {
  const primaryDb = { id: 'project-1' };
  const historyReplica = { id: 'project-2' };
  const seen = [];
  const result = await readWithQuotaFallback({
    candidates: [{ id: 'project-1', db: primaryDb }, { id: 'project-2-verified-history-replica', db: historyReplica }],
    read: async db => {
      seen.push(db.id);
      if (db === primaryDb) throw Object.assign(new Error('Resource exhausted'), { code: 8 });
      return { rows: ['replicated-record'] };
    },
    logger: { warn() {} },
    label: 'verified History'
  });
  assert.deepEqual(seen, ['project-1', 'project-2']);
  assert.equal(result.source, 'project-2-verified-history-replica');
  assert.equal(result.usedFallback, true);
  assert.deepEqual(result.value.rows, ['replicated-record']);
  assert.deepEqual(result.attemptedSources, ['project-1', 'project-2-verified-history-replica']);
});

test('skips quota-exhausted sources until a later explicitly approved replica succeeds', async () => {
  const projects = ['project-1', 'project-3', 'project-4', 'project-5'].map(id => ({ id }));
  const seen = [];
  const result = await readWithQuotaFallback({
    candidates: projects.map(db => ({ id: db.id, db })),
    read: async db => {
      seen.push(db.id);
      if (db.id !== 'project-5') throw Object.assign(new Error('Quota exceeded'), { code: 'resource-exhausted' });
      return db.id;
    },
    logger: { warn() {} },
    label: 'known replicated read'
  });
  assert.deepEqual(seen, ['project-1', 'project-3', 'project-4', 'project-5']);
  assert.equal(result.value, 'project-5');
  assert.equal(result.source, 'project-5');
  assert.deepEqual(result.attemptedSources, ['project-1', 'project-3', 'project-4', 'project-5']);
});

test('does not reroute permission, index, or application failures', async () => {
  const primaryDb = { id: 'project-1' };
  const replicaDb = { id: 'project-2' };
  let replicaReads = 0;
  await assert.rejects(readWithQuotaFallback({
    candidates: [{ id: 'project-1', db: primaryDb }, { id: 'project-2', db: replicaDb }],
    read: async db => {
      if (db === primaryDb) throw Object.assign(new Error('Permission denied'), { code: 7 });
      replicaReads += 1;
      return 'should-not-be-reached';
    },
    logger: { warn() {} }
  }), /Permission denied/);
  assert.equal(replicaReads, 0);
});

test('fails visibly if every explicitly approved candidate is quota exhausted', async () => {
  const candidates = [{ id: 'project-1', db: {} }, { id: 'project-2', db: {} }];
  await assert.rejects(readWithQuotaFallback({
    candidates,
    read: async () => { throw Object.assign(new Error('Quota exceeded'), { code: 8 }); },
    logger: { warn() {} }
  }), error => error.code === 8 && error.quotaRoutingSources.length === 2);
});

test('does not try the same Firestore database twice under different aliases', async () => {
  const shared = { id: 'shared' };
  let calls = 0;
  const result = await readWithQuotaFallback({
    candidates: [{ id: 'project-1', db: shared }, { id: 'alias-for-project-1', db: shared }],
    read: async () => { calls += 1; return 'ok'; }
  });
  assert.equal(result.value, 'ok');
  assert.equal(calls, 1);
});
