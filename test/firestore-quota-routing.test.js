'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { isFirestoreQuotaError, readWithQuotaFallback } = require('../firestore-quota-routing');

test('recognizes Firestore quota errors by canonical code and message', () => {
  assert.equal(isFirestoreQuotaError({ code: 8, message: 'Resource exhausted' }), true);
  assert.equal(isFirestoreQuotaError({ code: 'resource-exhausted' }), true);
  assert.equal(isFirestoreQuotaError({ message: 'Quota exceeded for this database.' }), true);
  assert.equal(isFirestoreQuotaError({ code: 'permission-denied', message: 'Permission denied' }), false);
});

test('quota exhaustion on a replicated read falls back to authoritative data and records the fallback', async () => {
  const secondaryDb = { id: 'project-3' };
  const authoritativeDb = { id: 'project-5' };
  const readProjects = [];
  const warnings = [];
  let fallbackMarked = false;
  const result = await readWithQuotaFallback({
    secondaryDb,
    authoritativeDb,
    read: async db => {
      readProjects.push(db.id);
      if (db === secondaryDb) throw Object.assign(new Error('Quota exceeded'), { code: 8 });
      return { source: db.id, docs: ['authoritative-copy'] };
    },
    onQuotaFallback: async () => { fallbackMarked = true; },
    logger: { warn: (...args) => warnings.push(args) },
    label: 'Live Chat messages'
  });

  assert.deepEqual(readProjects, ['project-3', 'project-5']);
  assert.equal(fallbackMarked, true);
  assert.equal(result.source, 'authoritative');
  assert.equal(result.usedFallback, true);
  assert.deepEqual(result.value.docs, ['authoritative-copy']);
  assert.equal(warnings.length, 1);
});

test('non-quota failures are not silently masked by switching databases', async () => {
  const secondaryDb = { id: 'project-3' };
  const authoritativeDb = { id: 'project-5' };
  let authoritativeReads = 0;
  await assert.rejects(
    readWithQuotaFallback({
      secondaryDb,
      authoritativeDb,
      read: async db => {
        if (db === secondaryDb) throw Object.assign(new Error('Permission denied'), { code: 7 });
        authoritativeReads += 1;
        return 'should not be reached';
      },
      logger: { warn() {} }
    }),
    /Permission denied/
  );
  assert.equal(authoritativeReads, 0);
});

test('does not retry against another database when the secondary is already authoritative', async () => {
  const db = { id: 'project-5' };
  const readProjects = [];
  const result = await readWithQuotaFallback({
    secondaryDb: db,
    authoritativeDb: db,
    read: async target => { readProjects.push(target.id); return 'from-current-db'; }
  });
  assert.deepEqual(readProjects, ['project-5']);
  assert.equal(result.source, 'authoritative');
  assert.equal(result.usedFallback, false);
});
