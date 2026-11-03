import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const output = execFileSync('npx', [
  '--yes', 'wrangler@4.156.0',
  'd1', 'execute', 'smvastro-wallet-staging',
  '--local', '--json', '--config', 'wrangler.jsonc',
  '--file', 'test/fixtures/d1-staging-legacy-schema-assert.sql'
], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });

let parsed;
try {
  parsed = JSON.parse(output);
} catch {
  throw new Error('Wrangler --json output was not valid JSON: ' + output.slice(0, 600));
}
const batches = Array.isArray(parsed) ? parsed : [parsed];
const rows = batches.flatMap(batch => Array.isArray(batch?.results) ? batch.results : []);
const checks = rows.at(-1);
assert.ok(checks && typeof checks === 'object', 'D1 compatibility assertions returned no row');

const required = [
  'legacy_outbox_preserved',
  'legacy_outbox_schema_unchanged',
  'legacy_idempotency_preserved',
  'legacy_idempotency_schema_unchanged',
  'new_event_outbox_ready',
  'new_request_idempotency_ready',
  'all_pending_migrations_applied',
  'shared_schema_marker_ready'
];
const failed = required.filter(name => Number(checks[name]) !== 1);
assert.deepEqual(failed, [], 'D1 migration compatibility assertions failed: ' + failed.join(', '));
console.log('PASS: legacy outbox and idempotency rows/schema preserved');
console.log('PASS: new event outbox and request idempotency tables/indexes ready');
console.log('PASS: migrations 0002–0006 recorded in local D1');
console.log('PASS: shared-domain schema marker verified (local D1 only)');
