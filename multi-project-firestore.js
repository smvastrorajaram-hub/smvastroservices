'use strict';

// Secondary Firestore projects are opt-in. No data is routed away from the
// primary project unless the relevant credentials and explicit cutover flags exist.
const DEFAULT_PROJECT_IDS = Object.freeze({
  primary: 'smv-astro',
  consultations: 'astro-service-ae9e7',
  liveData: 'smv-astro-services',
  content: 'svm-astro'
});
const DEFAULT_WALLET_DOMAIN_PROJECT_ID = 'smvastro-services';
// The complete active Wallet/Call/Chat domain is wired to one database resolver.
// This is only a source-readiness gate: production still requires a successful backfill,
// a clean reconciliation report, dependency verification, and all explicit cutover flags.
const WALLET_DOMAIN_RUNTIME_ROUTING_IMPLEMENTED = true;

const APP_NAMES = Object.freeze({
  consultations: 'smv-multiproject-consultations',
  liveData: 'smv-multiproject-live-data',
  content: 'smv-multiproject-public-content',
  walletDomain: 'smv-project5-wallet-domain'
});

function enabledFlag(value) {
  return /^(?:1|true|yes|on)$/i.test(String(value ?? '').trim());
}

function normalizePrivateKey(value) {
  return String(value || '')
    .replace(/^['"]|['"]$/g, '')
    .replace(/\\n/g, '\n')
    .trim();
}

function credentialsFromEnv(env, prefix, projectId) {
  const clientEmail = String(env[prefix + '_CLIENT_EMAIL'] || '').trim();
  const privateKey = normalizePrivateKey(env[prefix + '_PRIVATE_KEY']);
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firestore project access is enabled but ' + prefix +
      '_CLIENT_EMAIL / ' + prefix + '_PRIVATE_KEY / project ID is missing.');
  }
  return { projectId, clientEmail, privateKey };
}

function databaseForProject(admin, projectId, appName, credentials) {
  const existing = (admin.apps || []).find(app => app.name === appName);
  if (existing) {
    const actual = String(existing.options?.projectId || '');
    if (actual && actual !== projectId) {
      throw new Error('Firebase Admin app ' + appName + ' is already initialized for a different project.');
    }
    return admin.firestore(existing);
  }
  const app = admin.initializeApp({
    credential: admin.credential.cert(credentials)
  }, appName);
  return admin.firestore(app);
}

function resolveWalletDomainDatabase(multiProjectState, primaryDb) {
  if (multiProjectState?.walletDomainCutoverComplete === true &&
      multiProjectState?.walletDomainEnabled === true &&
      multiProjectState.walletDomainDb &&
      multiProjectState.walletDomainDb !== primaryDb) {
    return multiProjectState.walletDomainDb;
  }
  return primaryDb;
}

function initializeMultiProjectFirestore({ admin, primaryDb, env = process.env } = {}) {
  if (!admin || !primaryDb) throw new Error('Multi-project Firestore requires the primary Firebase Admin SDK and Firestore.');

  const projectIds = Object.freeze({
    primary: String(env.FIREBASE_PROJECT_ID || DEFAULT_PROJECT_IDS.primary).trim(),
    consultations: String(env.FIREBASE_CONSULTATIONS_PROJECT_ID || DEFAULT_PROJECT_IDS.consultations).trim(),
    liveData: String(env.FIREBASE_LIVE_DATA_PROJECT_ID || DEFAULT_PROJECT_IDS.liveData).trim(),
    content: String(env.FIREBASE_CONTENT_PROJECT_ID || DEFAULT_PROJECT_IDS.content).trim(),
    walletDomain: String(env.FIREBASE_WALLET_DOMAIN_PROJECT_ID || DEFAULT_WALLET_DOMAIN_PROJECT_ID).trim()
  });
  const enabled = enabledFlag(env.SMV_FIRESTORE_MULTI_PROJECT_ENABLED);
  const walletDomainEnabled = enabledFlag(env.SMV_WALLET_DOMAIN_ENABLED);

  const state = {
    enabled: false,
    projectIds,
    consultationsDb: primaryDb,
    liveDataDb: primaryDb,
    contentDb: primaryDb,
    walletDomainDb: primaryDb,
    walletDomainEnabled: false,
    walletDomainBackfillComplete: false,
    walletDomainCutoverComplete: false,
    walletDomainRuntimeIntegrationVerified: false,
    walletDomainMirrorWritesEnabled: false,
    customerHistoryBackfillComplete: false,
    sessionHistoryBackfillComplete: false,
    liveDataBackfillComplete: false,
    contentBackfillComplete: false,
    sessionHistoryMirrorWritesEnabled: false,
    liveDataMirrorWritesEnabled: false,
    contentMirrorWritesEnabled: false
  };

  // The fifth project can be prepared independently; it does not require the
  // older four-project routing flag. With both flags off, behavior is unchanged.
  if (!enabled && !walletDomainEnabled) return state;

  if (!projectIds.primary) throw new Error('FIREBASE_PROJECT_ID is required before enabling multi-project Firestore.');

  if (enabled) {
    const isNonProductionPrimary = projectIds.primary !== DEFAULT_PROJECT_IDS.primary;
    const defaultSecondaryIds = [DEFAULT_PROJECT_IDS.consultations, DEFAULT_PROJECT_IDS.liveData, DEFAULT_PROJECT_IDS.content];
    const selectedSecondaryIds = [projectIds.consultations, projectIds.liveData, projectIds.content];
    const crossEnvironmentOverride = enabledFlag(env.SMV_ALLOW_CROSS_ENV_FIRESTORE_PROJECTS);
    if (isNonProductionPrimary && !crossEnvironmentOverride &&
        selectedSecondaryIds.some((id, index) => id === defaultSecondaryIds[index])) {
      throw new Error('Refusing to connect a non-production primary project to the production secondary projects. Create isolated secondary projects and explicitly set all FIREBASE_*_PROJECT_ID variables, or set SMV_ALLOW_CROSS_ENV_FIRESTORE_PROJECTS=true only after a deliberate security review.');
    }
    if (new Set([projectIds.primary, ...selectedSecondaryIds]).size !== 4) {
      throw new Error('The four-project Firestore project IDs must be distinct.');
    }
    state.consultationsDb = databaseForProject(admin, projectIds.consultations, APP_NAMES.consultations,
      credentialsFromEnv(env, 'FIREBASE_CONSULTATIONS', projectIds.consultations));
    state.liveDataDb = databaseForProject(admin, projectIds.liveData, APP_NAMES.liveData,
      credentialsFromEnv(env, 'FIREBASE_LIVE_DATA', projectIds.liveData));
    state.contentDb = databaseForProject(admin, projectIds.content, APP_NAMES.content,
      credentialsFromEnv(env, 'FIREBASE_CONTENT', projectIds.content));
    state.enabled = true;
    state.customerHistoryBackfillComplete = enabledFlag(env.SMV_CUSTOMER_HISTORY_BACKFILL_COMPLETE);
    state.sessionHistoryBackfillComplete = enabledFlag(env.SMV_SESSION_HISTORY_BACKFILL_COMPLETE);
    state.liveDataBackfillComplete = enabledFlag(env.SMV_LIVE_DATA_BACKFILL_COMPLETE);
    state.contentBackfillComplete = enabledFlag(env.SMV_CONTENT_BACKFILL_COMPLETE);
    state.sessionHistoryMirrorWritesEnabled = enabledFlag(env.SMV_SESSION_HISTORY_MIRROR_WRITES);
    state.liveDataMirrorWritesEnabled = enabledFlag(env.SMV_LIVE_DATA_MIRROR_WRITES);
    state.contentMirrorWritesEnabled = enabledFlag(env.SMV_CONTENT_MIRROR_WRITES);
  }

  if (walletDomainEnabled) {
    const allConfiguredIds = [projectIds.primary, projectIds.consultations, projectIds.liveData, projectIds.content, projectIds.walletDomain];
    if (new Set(allConfiguredIds).size !== allConfiguredIds.length) {
      throw new Error('Project 5 must have a different project ID from Projects 1–4. Check FIREBASE_WALLET_DOMAIN_PROJECT_ID and the other project IDs.');
    }
    state.walletDomainDb = databaseForProject(admin, projectIds.walletDomain, APP_NAMES.walletDomain,
      credentialsFromEnv(env, 'FIREBASE_WALLET_DOMAIN', projectIds.walletDomain));
    state.walletDomainEnabled = true;
    state.walletDomainBackfillComplete = enabledFlag(env.SMV_WALLET_DOMAIN_BACKFILL_COMPLETE);
    // These two gates intentionally do not trigger data routing by themselves.
    // Runtime cutover must also be wired to the fully tested wallet/session domain.
    state.walletDomainRuntimeIntegrationVerified = WALLET_DOMAIN_RUNTIME_ROUTING_IMPLEMENTED &&
      enabledFlag(env.SMV_WALLET_DOMAIN_RUNTIME_INTEGRATION_VERIFIED);
    state.walletDomainCutoverComplete = state.walletDomainBackfillComplete &&
      enabledFlag(env.SMV_WALLET_DOMAIN_CUTOVER_COMPLETE) &&
      enabledFlag(env.SMV_WALLET_DOMAIN_DEPENDENCIES_VERIFIED) &&
      state.walletDomainRuntimeIntegrationVerified;
    state.walletDomainMirrorWritesEnabled = enabledFlag(env.SMV_WALLET_DOMAIN_MIRROR_WRITES);
  }

  return state;
}

module.exports = {
  DEFAULT_PROJECT_IDS,
  DEFAULT_WALLET_DOMAIN_PROJECT_ID,
  enabledFlag,
  normalizePrivateKey,
  resolveWalletDomainDatabase,
  initializeMultiProjectFirestore
};
