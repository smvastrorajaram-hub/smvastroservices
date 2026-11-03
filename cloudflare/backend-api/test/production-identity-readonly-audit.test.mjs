import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateIdentityInventory,
  readD1MetricRows,
  readFirestoreAggregateCount,
  SOURCE_COLLECTIONS
} from '../scripts/production-identity-readonly-audit.mjs';

test('Firestore aggregate count accepts the REST aggregate response without reading documents', () => {
  assert.equal(readFirestoreAggregateCount([
    { result: { aggregateFields: { count: { integerValue: '12' } } }, readTime: '2026-11-03T12:00:00Z' }
  ]), 12);
  assert.equal(readFirestoreAggregateCount({
    result: { aggregateFields: { count: { integerValue: '0' } } }
  }), 0);
});

test('D1 report parser extracts only count metrics', () => {
  const rows = readD1MetricRows([{ results: [
    { metric: 'd1:identity_users', value: '4' },
    { metric: 'meta:inventory_complete', value: '1' }
  ], success: true }]);
  assert.equal(rows.get('d1:identity_users'), 4);
  assert.equal(rows.get('meta:inventory_complete'), 1);
});

test('Production identity inventory fails closed when source/audit counts or attestations do not match', () => {
  const firebaseCounts = Object.fromEntries(SOURCE_COLLECTIONS.map(name => [name, 0]));
  const d1Metrics = new Map([
    ['d1:identity_users', 0],
    ['d1:identity_astrologers', 0],
    ['d1:identity_admins', 0],
    ['d1:identity_phones', 0],
    ['d1:identity_public_ids', 0],
    ['d1:identity_payout_profiles', 0],
    ['d1:identity_import_audit', 0],
    ['d1:identity_migration_meta', 0],
    ...SOURCE_COLLECTIONS.flatMap(name => [
      ['audit:' + name + ':total', 0],
      ['audit:' + name + ':warning', 0]
    ])
  ]);
  let report = evaluateIdentityInventory({ firebaseCounts, d1Metrics });
  assert.equal(report.readyForAuthorization, false);
  assert.ok(report.blockers.some(value => value.includes('inventory_complete')));

  d1Metrics.set('meta:inventory_complete', 1);
  d1Metrics.set('meta:reconciliation_complete', 1);
  d1Metrics.set('meta:source_quiesced', 1);
  report = evaluateIdentityInventory({ firebaseCounts, d1Metrics });
  assert.equal(report.readyForAuthorization, true);
  assert.deepEqual(report.blockers, []);
});

test('Production identity inventory detects import count and warning mismatches', () => {
  const firebaseCounts = Object.fromEntries(SOURCE_COLLECTIONS.map(name => [name, 0]));
  firebaseCounts.smv_users = 1;
  const d1Metrics = new Map([
    ['d1:identity_users', 1], ['d1:identity_astrologers', 0],
    ['d1:identity_admins', 0], ['d1:identity_phones', 0],
    ['d1:identity_public_ids', 0], ['d1:identity_payout_profiles', 0],
    ['d1:identity_import_audit', 0], ['d1:identity_migration_meta', 1],
    ['meta:inventory_complete', 1], ['meta:reconciliation_complete', 1], ['meta:source_quiesced', 1],
    ...SOURCE_COLLECTIONS.flatMap(name => [
      ['audit:' + name + ':total', 0],
      ['audit:' + name + ':warning', 0]
    ])
  ]);
  const report = evaluateIdentityInventory({ firebaseCounts, d1Metrics });
  assert.equal(report.readyForAuthorization, false);
  assert.ok(report.blockers.some(value => value.includes('count mismatch for smv_users')));
});
