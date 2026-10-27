'use strict';

// Secondary Firestore projects are opt-in. No project is initialized and no data
// is routed away from the primary project unless the flag and all credentials exist.
const DEFAULT_PROJECT_IDS = Object.freeze({
  primary: 'smv-astro',
  consultations: 'astro-service-ae9e7',
  liveData: 'smv-astro-services',
  content: 'svm-astro'
});

const APP_NAMES = Object.freeze({
  consultations: 'smv-multiproject-consultations',
  liveData: 'smv-multiproject-live-data',
  content: 'smv-multiproject-public-content'
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
    throw new Error('Multi-project Firestore is enabled but ' + prefix +
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

function initializeMultiProjectFirestore({ admin, primaryDb, env = process.env } = {}) {
  if (!admin || !primaryDb) throw new Error('Multi-project Firestore requires the primary Firebase Admin SDK and Firestore.');

  const projectIds = Object.freeze({
    primary: String(env.FIREBASE_PROJECT_ID || DEFAULT_PROJECT_IDS.primary).trim(),
    consultations: String(env.FIREBASE_CONSULTATIONS_PROJECT_ID || DEFAULT_PROJECT_IDS.consultations).trim(),
    liveData: String(env.FIREBASE_LIVE_DATA_PROJECT_ID || DEFAULT_PROJECT_IDS.liveData).trim(),
    content: String(env.FIREBASE_CONTENT_PROJECT_ID || DEFAULT_PROJECT_IDS.content).trim()
  });
  const enabled = enabledFlag(env.SMV_FIRESTORE_MULTI_PROJECT_ENABLED);

  const disabled = {
    enabled: false,
    projectIds,
    consultationsDb: primaryDb,
    liveDataDb: primaryDb,
    contentDb: primaryDb,
    customerHistoryBackfillComplete: false,
    sessionHistoryBackfillComplete: false,
    liveDataBackfillComplete: false,
    contentBackfillComplete: false
  };
  if (!enabled) return disabled;

  if (!projectIds.primary) throw new Error('FIREBASE_PROJECT_ID is required before enabling multi-project Firestore.');
  const isNonProductionPrimary = projectIds.primary !== DEFAULT_PROJECT_IDS.primary;
  const defaultSecondaryIds = [DEFAULT_PROJECT_IDS.consultations, DEFAULT_PROJECT_IDS.liveData, DEFAULT_PROJECT_IDS.content];
  const selectedSecondaryIds = [projectIds.consultations, projectIds.liveData, projectIds.content];
  const crossEnvironmentOverride = enabledFlag(env.SMV_ALLOW_CROSS_ENV_FIRESTORE_PROJECTS);
  if (isNonProductionPrimary && !crossEnvironmentOverride &&
      selectedSecondaryIds.some((id, index) => id === defaultSecondaryIds[index])) {
    throw new Error('Refusing to connect a non-production primary project to the production secondary projects. Create isolated secondary projects and explicitly set all FIREBASE_*_PROJECT_ID variables, or set SMV_ALLOW_CROSS_ENV_FIRESTORE_PROJECTS=true only after a deliberate security review.');
  }
  const ids = Object.values(projectIds);
  if (new Set(ids).size !== ids.length) {
    throw new Error('Multi-project Firestore project IDs must be distinct. Check the four Firebase Project Settings screenshots and environment variables.');
  }

  const consultationsDb = databaseForProject(admin, projectIds.consultations, APP_NAMES.consultations,
    credentialsFromEnv(env, 'FIREBASE_CONSULTATIONS', projectIds.consultations));
  const liveDataDb = databaseForProject(admin, projectIds.liveData, APP_NAMES.liveData,
    credentialsFromEnv(env, 'FIREBASE_LIVE_DATA', projectIds.liveData));
  const contentDb = databaseForProject(admin, projectIds.content, APP_NAMES.content,
    credentialsFromEnv(env, 'FIREBASE_CONTENT', projectIds.content));

  return {
    enabled: true,
    projectIds,
    consultationsDb,
    liveDataDb,
    contentDb,
    // These flags are intentionally separate: a secondary becomes authoritative
    // for reads only after its copy/backfill has completed and been verified.
    customerHistoryBackfillComplete: enabledFlag(env.SMV_CUSTOMER_HISTORY_BACKFILL_COMPLETE),
    sessionHistoryBackfillComplete: enabledFlag(env.SMV_SESSION_HISTORY_BACKFILL_COMPLETE),
    liveDataBackfillComplete: enabledFlag(env.SMV_LIVE_DATA_BACKFILL_COMPLETE),
    contentBackfillComplete: enabledFlag(env.SMV_CONTENT_BACKFILL_COMPLETE)
  };
}

module.exports = {
  DEFAULT_PROJECT_IDS,
  enabledFlag,
  normalizePrivateKey,
  initializeMultiProjectFirestore
};
