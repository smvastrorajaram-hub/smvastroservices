'use strict';

const DOMAIN_SCHEMA_KEYS = Object.freeze([
  'shared-domain',
  'wallet-recharges',
  'live-sessions',
  'identity-profiles'
]);

/**
 * One provider/identity snapshot shared by readiness and migration-status.
 * Both API reports must await the same probes instead of reading module-load
 * booleans that may still contain their initial false values.
 */
export async function readBackendProviderReadiness({
  providerProbe,
  identityProbe
} = {}) {
  if (typeof providerProbe !== 'function' || typeof identityProbe !== 'function') {
    throw new TypeError('Provider and Identity readiness probes are required.');
  }

  const [providers, identity] = await Promise.all([
    Promise.resolve().then(() => providerProbe()),
    Promise.resolve().then(() => identityProbe())
  ]);

  const firebaseConnected = providers?.firebaseConnected === true;
  const razorpayConnected = providers?.razorpayConnected === true;

  return Object.freeze({
    firebaseConnected,
    firestoreConnected: firebaseConnected,
    razorpayConnected,
    razorpayProviderConnectionVerified: razorpayConnected,
    identityProfileD1AuthorizationReady: identity?.ready === true,
    identityProfileD1AuthorizationReason: String(identity?.reason || 'not_configured'),
    identityProfileD1AuthorizationSchemaReady: identity?.schemaReady === true,
    identityProfileD1AuthorizationInventoryComplete: identity?.inventoryComplete === true,
    identityProfileD1AuthorizationReconciliationComplete: identity?.reconciliationComplete === true,
    identityProfileD1AuthorizationSourceQuiesced: identity?.sourceQuiesced === true
  });
}

/**
 * Read-only D1 schema diagnostics. These values describe migration markers,
 * not whether source data has been imported or reconciled.
 */
export async function readD1SchemaReadiness(db, sourceProjectId = 'smv-astro-staging') {
  const empty = {
    available: false,
    schemaMetaAvailable: false,
    walletCoreSchemaVersion: null,
    schemaVersions: Object.freeze({}),
    walletCoreSchemaReady: false,
    sharedDomainSchemaReady: false,
    walletRechargeSchemaReady: false,
    liveSessionSchemaReady: false,
    identityProfileSchemaReady: false,
    identityProfileMigrationAttestation: Object.freeze({
      inventoryComplete: false,
      reconciliationComplete: false,
      sourceQuiesced: false
    })
  };
  if (!db || typeof db.prepare !== 'function') return Object.freeze(empty);

  let walletCore = null;
  let domainRows = [];
  let schemaMetaAvailable = false;
  try {
    [walletCore, domainRows] = await Promise.all([
      db.prepare(
        'SELECT schema_version FROM smv_wallet_schema_meta WHERE id = ? LIMIT 1'
      ).bind('primary').first(),
      db.prepare(
        'SELECT schema_key,schema_version FROM smv_domain_schema_meta WHERE schema_key IN (?,?,?,?)'
      ).bind(...DOMAIN_SCHEMA_KEYS).all().then(result => result?.results || [])
    ]);
    schemaMetaAvailable = true;
  } catch {
    // Missing or unavailable migration metadata is a closed readiness gate.
  }

  const schemaVersions = Object.fromEntries(
    (Array.isArray(domainRows) ? domainRows : []).map(row => [
      String(row?.schema_key || ''),
      String(row?.schema_version || '')
    ]).filter(([key, version]) => key && version)
  );
  let migration = null;
  if (schemaVersions['identity-profiles'] === '0008_identity_profile_backfill_audit') {
    try {
      migration = await db.prepare(
        'SELECT inventory_complete,reconciliation_complete,source_quiesced ' +
        'FROM smv_domain_identity_migration_meta WHERE source_project_id = ? LIMIT 1'
      ).bind(String(sourceProjectId || '')).first();
    } catch {
      migration = null;
    }
  }

  const identityProfileMigrationAttestation = Object.freeze({
    inventoryComplete: Number(migration?.inventory_complete) === 1,
    reconciliationComplete: Number(migration?.reconciliation_complete) === 1,
    sourceQuiesced: Number(migration?.source_quiesced) === 1
  });

  return Object.freeze({
    available: true,
    schemaMetaAvailable,
    walletCoreSchemaVersion: String(walletCore?.schema_version || '') || null,
    schemaVersions: Object.freeze(schemaVersions),
    walletCoreSchemaReady: String(walletCore?.schema_version || '') === '0001_wallet_live_domain',
    sharedDomainSchemaReady: schemaVersions['shared-domain'] === '0002_shared_domain_repository',
    walletRechargeSchemaReady: schemaVersions['wallet-recharges'] === '0005_legacy_wallet_backfill',
    liveSessionSchemaReady: schemaVersions['live-sessions'] === '0006_d1_live_wallet_settlement',
    identityProfileSchemaReady: schemaVersions['identity-profiles'] === '0008_identity_profile_backfill_audit',
    identityProfileMigrationAttestation
  });
}
