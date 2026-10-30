'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { pairedReadCandidates, readPairedWithQuotaFallback } = require('../firestore-paired-read-failover');

test('Project 1 is not included in either paired failover group', () => {
  const p1 = { id: 'project-1' }, p3 = { id: 'project-3' };
  const candidates = pairedReadCandidates({
    pool: 'p23', dataset: 'smv_questions', sourceDb: p1, peerDb: p3,
    enabled: true, sourceId: 'project-1-primary'
  });
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].db, p1);
});

test('Project 2 read quota falls back to the verified Project 3 mirror', async () => {
  const p2 = { id: 'project-2' }, p3 = { id: 'project-3' }, visited = [];
  const result = await readPairedWithQuotaFallback({
    pool: 'p23', dataset: 'smv_questions', sourceDb: p2, peerDb: p3, enabled: true,
    sourceId: 'project-2-history-archive', peerId: 'project-3-history-replica',
    read: async db => { visited.push(db.id); if (db === p2) throw Object.assign(new Error('Resource exhausted'), { code: 8 }); return 'from-p3'; },
    logger: { warn() {} }
  });
  assert.deepEqual(visited, ['project-2', 'project-3']);
  assert.equal(result.value, 'from-p3');
  assert.equal(result.usedFallback, true);
});

test('Project 3 read quota falls back to the verified Project 2 mirror for Live Chat messages', async () => {
  const p2 = { id: 'project-2' }, p3 = { id: 'project-3' };
  const result = await readPairedWithQuotaFallback({
    pool: 'p23', dataset: 'smv_live_sessions/messages', sourceDb: p3, peerDb: p2, enabled: true,
    sourceId: 'project-3-live-chat-messages', peerId: 'project-2-live-chat-messages-replica',
    read: async db => { if (db === p3) throw Object.assign(new Error('Quota exceeded'), { code: 'resource-exhausted' }); return db.id; },
    logger: { warn() {} }
  });
  assert.equal(result.source, 'project-2-live-chat-messages-replica');
  assert.equal(result.value, 'project-2');
});

test('Project 4/5 failover is limited to replicated public content, not Wallet balances', () => {
  const p4 = { id: 'project-4' }, p5 = { id: 'project-5' };
  const content = pairedReadCandidates({ pool: 'p45', dataset: 'smv_content', sourceDb: p4, peerDb: p5, enabled: true, sourceId: 'project-4-content' });
  const wallet = pairedReadCandidates({ pool: 'p45', dataset: 'smv_wallets', sourceDb: p5, peerDb: p4, enabled: true, sourceId: 'project-5-wallet-domain' });
  assert.equal(content.length, 2);
  assert.equal(wallet.length, 1);
});

test('no peer fallback before a pair has been backfilled and validated', async () => {
  const p4 = { id: 'project-4' }, p5 = { id: 'project-5' };
  const visited = [];
  await assert.rejects(readPairedWithQuotaFallback({
    pool: 'p45', dataset: 'smv_content', sourceDb: p4, peerDb: p5, enabled: false, sourceId: 'project-4-content',
    read: async db => { visited.push(db.id); throw Object.assign(new Error('Resource exhausted'), { code: 8 }); },
    logger: { warn() {} }
  }), error => error.code === 8);
  assert.deepEqual(visited, ['project-4']);
});

test('non-quota failures do not read the paired database', async () => {
  const p2 = { id: 'project-2' }, p3 = { id: 'project-3' };
  let peerReads = 0;
  await assert.rejects(readPairedWithQuotaFallback({
    pool: 'p23', dataset: 'smv_questions', sourceDb: p2, peerDb: p3, enabled: true,
    sourceId: 'project-2-source', peerId: 'project-3-peer',
    read: async db => { if (db === p2) throw Object.assign(new Error('Permission denied'), { code: 7 }); peerReads += 1; return 'bad'; },
    logger: { warn() {} }
  }), /Permission denied/);
  assert.equal(peerReads, 0);
});

test('unapproved collections cannot use a peer even if both databases are connected', () => {
  const p4 = { id: 'project-4' }, p5 = { id: 'project-5' };
  const candidates = pairedReadCandidates({
    pool: 'p45', dataset: 'smv_wallet_transactions', sourceDb: p4, peerDb: p5,
    enabled: true, sourceId: 'project-4-content'
  });
  assert.equal(candidates.length, 1);
});
