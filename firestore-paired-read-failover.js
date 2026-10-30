'use strict';

const { readWithQuotaFallback } = require('./firestore-quota-routing');

// Only datasets deliberately mirrored to both members of a pair may fail over.
// Project 1 is not a member of either pair. Financial state is intentionally excluded.
const PAIRED_READ_DATASETS = Object.freeze({
  p23: new Set([
    'smv_questions',
    'smv_private_consultations',
    'smv_astrologers',
    'smv_reviews',
    'smv_notifications',
    'smv_astrologer_quiz_questions',
    'smv_live_sessions',
    'smv_live_sessions/messages',
    'smv_live_sessions/signals'
  ]),
  p45: new Set(['smv_content'])
});

function pairedReadCandidates({
  pool,
  dataset,
  sourceDb,
  peerDb,
  enabled = false,
  sourceId,
  peerId
} = {}) {
  const key = String(pool || '').trim().toLowerCase();
  const allowed = PAIRED_READ_DATASETS[key];
  if (!allowed) throw new TypeError('Unknown Firestore read-failover pool.');
  if (!sourceDb) throw new TypeError('A source Firestore database is required.');

  const resolvedSourceId = String(sourceId || (key === 'p23' ? 'project-2-or-3-source' : 'project-4-or-5-source'));
  const validPairMember = key === 'p23'
    ? /project-(?:2|3)/i.test(resolvedSourceId)
    : /project-(?:4|5)/i.test(resolvedSourceId);
  const candidates = [{ id: resolvedSourceId, db: sourceDb }];
  if (enabled === true && validPairMember && allowed.has(String(dataset || '')) &&
      peerDb && peerDb !== sourceDb) {
    candidates.push({
      id: String(peerId || (key === 'p23' ? 'paired-project-3-or-2-replica' : 'paired-project-5-or-4-content-replica')),
      db: peerDb
    });
  }
  return candidates;
}

async function readPairedWithQuotaFallback({
  pool,
  dataset,
  sourceDb,
  peerDb,
  enabled = false,
  sourceId,
  peerId,
  read,
  logger = console,
  label
} = {}) {
  const candidates = pairedReadCandidates({
    pool, dataset, sourceDb, peerDb, enabled, sourceId, peerId
  });
  return readWithQuotaFallback({
    candidates,
    read,
    logger,
    label: label || (String(pool || '').toUpperCase() + ' ' + String(dataset || 'dataset') + ' read')
  });
}

module.exports = { PAIRED_READ_DATASETS, pairedReadCandidates, readPairedWithQuotaFallback };
