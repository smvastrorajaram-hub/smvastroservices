import test from 'node:test';
import assert from 'node:assert/strict';
import { createD1IdentityAuthorizationGate } from '../../../shared/backend-platform/d1-identity-authorization-gate.mjs';

function setup({
  enabled = true, environment = 'staging', sourceProjectId = 'smv-astro-staging',
  projectIds = ['smv-astro-staging'], schemaVersion = '0008_identity_profile_backfill_audit',
  inventoryComplete = 1, reconciliationComplete = 1, sourceQuiesced = 1, fail = false
} = {}) {
  const calls = [];
  const db = {
    prepare(sql) {
      return { bind(...values) { return { async first() {
        calls.push({ sql, values });
        if (fail) throw new Error('D1 unavailable');
        if (sql.includes('smv_domain_schema_meta')) return { schema_version: schemaVersion };
        if (sql.includes('smv_domain_identity_migration_meta')) {
          return { inventory_complete: inventoryComplete, reconciliation_complete: reconciliationComplete,
            source_quiesced: sourceQuiesced };
        }
        throw new Error('Unexpected D1 query');
      } }; } };
    }
  };
  let authCalls = 0;
  const identityService = { async authenticateAuthorization(header) {
    authCalls += 1;
    return { uid: 'staging-user', role: 'customer', isAdmin: false, header };
  } };
  const gate = createD1IdentityAuthorizationGate({
    identityService, db, enabled, environment, sourceProjectId, projectIds
  });
  return { gate, calls, get authCalls() { return authCalls; } };
}

test('D1 authorization stays disabled by default without D1 access or auth delegation', async () => {
  const state = setup({ enabled: false });
  const readiness = await state.gate.readiness();
  assert.equal(readiness.ready, false);
  assert.equal(readiness.reason, 'disabled');
  await assert.rejects(state.gate.authenticateAuthorization('Bearer token'),
    error => error.code === 'IDENTITY_D1_AUTHORIZATION_NOT_READY' && error.httpStatus === 503);
  assert.equal(state.calls.length, 0);
  assert.equal(state.authCalls, 0);
});

test('D1 authorization is restricted to the single isolated staging Firebase project', async () => {
  for (const options of [
    { environment: 'production' },
    { sourceProjectId: 'smv-astro-services' },
    { projectIds: ['smv-astro-staging', 'smv-astro-other'] },
    { projectIds: ['smv-astro-services'] }
  ]) {
    const state = setup(options);
    const readiness = await state.gate.readiness();
    assert.equal(readiness.ready, false);
    assert.match(readiness.reason, /scope_mismatch|allowlist_mismatch/);
    assert.equal(state.calls.length, 0);
  }
});

test('D1 authorization requires schema 0008 and all three explicit migration attestations', async () => {
  for (const options of [
    { schemaVersion: '0007_identity_profile_domain' },
    { inventoryComplete: 0 },
    { reconciliationComplete: 0 },
    { sourceQuiesced: 0 }
  ]) {
    const state = setup(options);
    assert.equal((await state.gate.readiness()).ready, false);
    await assert.rejects(state.gate.authenticateAuthorization('Bearer token'),
      error => error.code === 'IDENTITY_D1_AUTHORIZATION_NOT_READY');
    assert.equal(state.authCalls, 0);
  }
});

test('D1 authorization delegates only after schema, inventory, reconciliation and quiescence pass', async () => {
  const state = setup();
  assert.equal((await state.gate.readiness()).ready, true);
  assert.deepEqual(await state.gate.authenticateAuthorization('Bearer test-token'), {
    uid: 'staging-user', role: 'customer', isAdmin: false, header: 'Bearer test-token'
  });
  assert.equal(state.authCalls, 1);
  assert.equal(state.calls.length, 4); // readiness + authenticated request each verify schema and migration state
});

test('D1 readiness failures fail closed without delegating to the identity resolver', async () => {
  const state = setup({ fail: true });
  const readiness = await state.gate.readiness();
  assert.equal(readiness.ready, false);
  assert.equal(readiness.reason, 'd1_readiness_unavailable');
  await assert.rejects(state.gate.authenticateAuthorization('Bearer token'),
    error => error.code === 'IDENTITY_D1_AUTHORIZATION_NOT_READY' && error.httpStatus === 503);
  assert.equal(state.authCalls, 0);
});
