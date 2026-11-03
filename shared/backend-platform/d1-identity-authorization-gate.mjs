'use strict';

const REQUIRED_SCHEMA_VERSION = '0008_identity_profile_backfill_audit';

function valuesOf(value) {
  const source = value instanceof Set ? [...value] : Array.isArray(value) ? value : String(value || '').split(',');
  return [...new Set(source.map(item => String(item || '').trim()).filter(Boolean))];
}

function gateError() {
  return Object.assign(
    new Error('D1 Identity/Profile authorization is not ready for this environment.'),
    { code: 'IDENTITY_D1_AUTHORIZATION_NOT_READY', httpStatus: 503 }
  );
}

/**
 * Keeps D1 authorization disabled until the selected environment's exact
 * Firebase project has a complete import inventory, clean reconciliation and
 * an explicitly quiesced Firestore source. Production additionally requires a
 * separate approval flag. This gate never changes either store.
 */
export function createD1IdentityAuthorizationGate({
  identityService,
  db,
  enabled = false,
  environment = 'unknown',
  sourceProjectId = '',
  projectIds = [],
  productionApproved = false
} = {}) {
  const projects = valuesOf(projectIds);
  const source = String(sourceProjectId || '').trim();
  const expectedProject = environment === 'staging' ? 'smv-astro-staging' :
    environment === 'production' ? 'smv-astro' : '';

  async function readiness() {
    const base = {
      enabled: enabled === true,
      ready: false,
      schemaReady: false,
      inventoryComplete: false,
      reconciliationComplete: false,
      sourceQuiesced: false
    };
    if (enabled !== true) return { ...base, reason: 'disabled' };
    if (!expectedProject) return { ...base, reason: 'environment_not_supported' };
    if (environment === 'production' && productionApproved !== true) {
      return { ...base, reason: 'production_approval_missing' };
    }
    if (source !== expectedProject) {
      return { ...base, reason: environment + '_scope_mismatch' };
    }
    if (projects.length !== 1 || projects[0] !== expectedProject) {
      return { ...base, reason: 'firebase_project_allowlist_mismatch' };
    }
    if (!db || typeof db.prepare !== 'function' ||
        typeof identityService?.authenticateAuthorization !== 'function') {
      return { ...base, reason: 'identity_runtime_unavailable' };
    }

    try {
      const [schema, migration] = await Promise.all([
        db.prepare(
          'SELECT schema_version FROM smv_domain_schema_meta WHERE schema_key = ? LIMIT 1'
        ).bind('identity-profiles').first(),
        db.prepare(
          'SELECT inventory_complete,reconciliation_complete,source_quiesced ' +
          'FROM smv_domain_identity_migration_meta WHERE source_project_id = ? LIMIT 1'
        ).bind(expectedProject).first()
      ]);
      const schemaReady = String(schema?.schema_version || '') === REQUIRED_SCHEMA_VERSION;
      const inventoryComplete = Number(migration?.inventory_complete) === 1;
      const reconciliationComplete = Number(migration?.reconciliation_complete) === 1;
      const sourceQuiesced = Number(migration?.source_quiesced) === 1;
      const ready = schemaReady && inventoryComplete && reconciliationComplete && sourceQuiesced;
      return {
        ...base, ready, schemaReady, inventoryComplete, reconciliationComplete, sourceQuiesced,
        reason: ready ? 'ready' : 'migration_attestation_incomplete'
      };
    } catch {
      return { ...base, reason: 'd1_readiness_unavailable' };
    }
  }

  async function authenticateAuthorization(authorizationHeader) {
    const state = await readiness();
    if (!state.ready) throw gateError();
    return identityService.authenticateAuthorization(authorizationHeader);
  }

  return Object.freeze({ authenticateAuthorization, readiness });
}
