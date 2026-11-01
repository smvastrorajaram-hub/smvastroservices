import test from 'node:test';
import assert from 'node:assert/strict';
import {
  readBackendProviderReadiness,
  readD1SchemaReadiness
} from '../../../shared/backend-platform/backend-readiness-state.mjs';

test('readiness and migration status share the awaited Firebase and Razorpay provider results', async () => {
  let providerCalls = 0;
  let identityCalls = 0;
  const snapshot = await readBackendProviderReadiness({
    async providerProbe() {
      providerCalls += 1;
      await Promise.resolve();
      return { firebaseConnected: true, razorpayConnected: true };
    },
    async identityProbe() {
      identityCalls += 1;
      await Promise.resolve();
      return {
        ready: false,
        reason: 'migration_attestation_incomplete',
        schemaReady: true,
        inventoryComplete: true,
        reconciliationComplete: false,
        sourceQuiesced: false
      };
    }
  });

  assert.equal(providerCalls, 1);
  assert.equal(identityCalls, 1);
  assert.equal(snapshot.firebaseConnected, true);
  assert.equal(snapshot.firestoreConnected, true);
  assert.equal(snapshot.razorpayConnected, true);
  assert.equal(snapshot.razorpayProviderConnectionVerified, true);
  assert.equal(snapshot.identityProfileD1AuthorizationReady, false);
  assert.equal(snapshot.identityProfileD1AuthorizationSchemaReady, true);
  assert.equal(snapshot.identityProfileD1AuthorizationInventoryComplete, true);
  assert.equal(snapshot.identityProfileD1AuthorizationReconciliationComplete, false);
  assert.equal(snapshot.identityProfileD1AuthorizationSourceQuiesced, false);
});

test('D1 schema readiness reports each business migration marker independently', async () => {
  const rows = [
    { schema_key: 'shared-domain', schema_version: '0002_shared_domain_repository' },
    { schema_key: 'wallet-recharges', schema_version: '0005_legacy_wallet_backfill' },
    { schema_key: 'live-sessions', schema_version: '0006_d1_live_wallet_settlement' },
    { schema_key: 'identity-profiles', schema_version: '0008_identity_profile_backfill_audit' }
  ];
  const db = {
    prepare(sql) {
      return {
        bind(...values) {
          return {
            async first() {
              if (sql.includes('smv_wallet_schema_meta')) return { schema_version: '0001_wallet_live_domain' };
              if (sql.includes('smv_domain_identity_migration_meta')) {
                assert.deepEqual(values, ['smv-astro-staging']);
                return { inventory_complete: 1, reconciliation_complete: 0, source_quiesced: 0 };
              }
              return null;
            },
            async all() {
              assert.ok(sql.includes('smv_domain_schema_meta'));
              return { results: rows };
            }
          };
        }
      };
    }
  };

  const result = await readD1SchemaReadiness(db);
  assert.equal(result.available, true);
  assert.equal(result.schemaMetaAvailable, true);
  assert.equal(result.walletCoreSchemaReady, true);
  assert.equal(result.sharedDomainSchemaReady, true);
  assert.equal(result.walletRechargeSchemaReady, true);
  assert.equal(result.liveSessionSchemaReady, true);
  assert.equal(result.identityProfileSchemaReady, true);
  assert.deepEqual(result.identityProfileMigrationAttestation, {
    inventoryComplete: true,
    reconciliationComplete: false,
    sourceQuiesced: false
  });
});

test('D1 schema readiness fails closed when the database or migration metadata is unavailable', async () => {
  const absent = await readD1SchemaReadiness(null);
  assert.equal(absent.available, false);
  assert.equal(absent.walletCoreSchemaReady, false);

  const broken = await readD1SchemaReadiness({
    prepare() {
      return { bind() { return { async first() { throw new Error('unavailable'); }, async all() { throw new Error('unavailable'); } }; } };
    }
  });
  assert.equal(broken.available, true);
  assert.equal(broken.schemaMetaAvailable, false);
  assert.equal(broken.sharedDomainSchemaReady, false);
  assert.equal(broken.walletRechargeSchemaReady, false);
  assert.equal(broken.liveSessionSchemaReady, false);
});
