'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { initializeMultiProjectFirestore, DEFAULT_PROJECT_IDS, resolveWalletDomainDatabase } = require('../multi-project-firestore');

function fakeAdmin() {
  const apps = [];
  const databases = new Map();
  const admin = {
    apps,
    credential: { cert: credentials => ({ credentials }) },
    initializeApp(options, name) {
      const app = { name, options };
      apps.push(app);
      return app;
    },
    firestore(app) {
      const key = app ? app.name : '[primary]';
      if (!databases.has(key)) databases.set(key, { appName: key });
      return databases.get(key);
    }
  };
  return admin;
}

test('Project 5 remains off by default and preserves the primary database', () => {
  const admin = fakeAdmin();
  const primaryDb = { primary: true };
  const result = initializeMultiProjectFirestore({ admin, primaryDb, env: {} });
  assert.equal(result.walletDomainEnabled, false);
  assert.equal(result.walletDomainDb, primaryDb);
  assert.equal(result.walletDomainBackfillComplete, false);
  assert.equal(result.walletDomainCutoverComplete, false);
  assert.equal(result.walletDomainRuntimeIntegrationVerified, false);
  assert.equal(admin.apps.length, 0);
});

test('Wallet domain database resolver uses Project 5 only after the complete cutover gate', () => {
  const primaryDb = { name: 'project-1' };
  const project5Db = { name: 'project-5' };
  assert.equal(resolveWalletDomainDatabase({ walletDomainEnabled: true, walletDomainCutoverComplete: false, walletDomainDb: project5Db }, primaryDb), primaryDb);
  assert.equal(resolveWalletDomainDatabase({ walletDomainEnabled: false, walletDomainCutoverComplete: true, walletDomainDb: project5Db }, primaryDb), primaryDb);
  assert.equal(resolveWalletDomainDatabase({ walletDomainEnabled: true, walletDomainCutoverComplete: true, walletDomainDb: project5Db }, primaryDb), project5Db);
  assert.equal(resolveWalletDomainDatabase({ walletDomainEnabled: true, walletDomainCutoverComplete: true, walletDomainDb: primaryDb }, primaryDb), primaryDb);
});

test('Project 5 can be initialized independently of the existing four-project flag', () => {
  const admin = fakeAdmin();
  const primaryDb = { primary: true };
  const result = initializeMultiProjectFirestore({
    admin,
    primaryDb,
    env: {
      FIREBASE_PROJECT_ID: DEFAULT_PROJECT_IDS.primary,
      FIREBASE_WALLET_DOMAIN_PROJECT_ID: 'smvastro-services',
      FIREBASE_WALLET_DOMAIN_CLIENT_EMAIL: 'wallet-project5@example.iam.gserviceaccount.com',
      FIREBASE_WALLET_DOMAIN_PRIVATE_KEY: 'test-private-key',
      SMV_WALLET_DOMAIN_ENABLED: 'true'
    }
  });
  assert.equal(result.enabled, false);
  assert.equal(result.walletDomainEnabled, true);
  assert.equal(result.projectIds.walletDomain, 'smvastro-services');
  assert.equal(result.walletDomainDb.appName, 'smv-project5-wallet-domain');
  assert.equal(result.walletDomainCutoverComplete, false);
  assert.equal(admin.apps.length, 1);
});

test('Project 5 cutover requires the integrated runtime plus every explicit migration gate', () => {
  const primaryDb = { primary: true };
  const baseEnv = {
    FIREBASE_PROJECT_ID: DEFAULT_PROJECT_IDS.primary,
    FIREBASE_WALLET_DOMAIN_PROJECT_ID: 'smvastro-services',
    FIREBASE_WALLET_DOMAIN_CLIENT_EMAIL: 'wallet-project5@example.iam.gserviceaccount.com',
    FIREBASE_WALLET_DOMAIN_PRIVATE_KEY: 'test-private-key',
    SMV_WALLET_DOMAIN_ENABLED: 'true',
    SMV_WALLET_DOMAIN_BACKFILL_COMPLETE: 'true',
    SMV_WALLET_DOMAIN_CUTOVER_COMPLETE: 'true'
  };
  const missingDependencyGate = initializeMultiProjectFirestore({
    admin: fakeAdmin(), primaryDb,
    env: { ...baseEnv, SMV_WALLET_DOMAIN_RUNTIME_INTEGRATION_VERIFIED: 'true' }
  });
  assert.equal(missingDependencyGate.walletDomainRuntimeIntegrationVerified, true);
  assert.equal(missingDependencyGate.walletDomainCutoverComplete, false);

  const missingRuntimeFlag = initializeMultiProjectFirestore({
    admin: fakeAdmin(), primaryDb,
    env: { ...baseEnv, SMV_WALLET_DOMAIN_DEPENDENCIES_VERIFIED: 'true' }
  });
  assert.equal(missingRuntimeFlag.walletDomainCutoverComplete, false);

  const ready = initializeMultiProjectFirestore({
    admin: fakeAdmin(), primaryDb,
    env: {
      ...baseEnv,
      SMV_WALLET_DOMAIN_DEPENDENCIES_VERIFIED: 'true',
      SMV_WALLET_DOMAIN_RUNTIME_INTEGRATION_VERIFIED: 'true'
    }
  });
  assert.equal(ready.walletDomainRuntimeIntegrationVerified, true);
  assert.equal(ready.walletDomainCutoverComplete, true);
  assert.notEqual(ready.walletDomainDb, primaryDb);
});

test('Project 5 rejects missing service-account credentials instead of silently connecting', () => {
  assert.throws(
    () => initializeMultiProjectFirestore({
      admin: fakeAdmin(),
      primaryDb: { primary: true },
      env: { SMV_WALLET_DOMAIN_ENABLED: 'true', FIREBASE_WALLET_DOMAIN_PROJECT_ID: 'smvastro-services' }
    }),
    /FIREBASE_WALLET_DOMAIN_CLIENT_EMAIL \/ FIREBASE_WALLET_DOMAIN_PRIVATE_KEY/
  );
});

test('Project 5 rejects duplicate project IDs', () => {
  assert.throws(
    () => initializeMultiProjectFirestore({
      admin: fakeAdmin(),
      primaryDb: { primary: true },
      env: {
        SMV_WALLET_DOMAIN_ENABLED: 'true',
        FIREBASE_PROJECT_ID: 'smv-astro',
        FIREBASE_WALLET_DOMAIN_PROJECT_ID: 'smv-astro',
        FIREBASE_WALLET_DOMAIN_CLIENT_EMAIL: 'wallet-project5@example.iam.gserviceaccount.com',
        FIREBASE_WALLET_DOMAIN_PRIVATE_KEY: 'test-private-key'
      }
    }),
    /Project 5 must have a different project ID/
  );
});

test('Project 2/3 paired read failover stays disabled until all read replicas are verified', () => {
  const primaryDb = { primary: true };
  const env = {
    SMV_FIRESTORE_MULTI_PROJECT_ENABLED: 'true',
    FIREBASE_PROJECT_ID: DEFAULT_PROJECT_IDS.primary,
    FIREBASE_CONSULTATIONS_CLIENT_EMAIL: 'project2@example.iam.gserviceaccount.com',
    FIREBASE_CONSULTATIONS_PRIVATE_KEY: 'project2-key',
    FIREBASE_LIVE_DATA_CLIENT_EMAIL: 'project3@example.iam.gserviceaccount.com',
    FIREBASE_LIVE_DATA_PRIVATE_KEY: 'project3-key',
    FIREBASE_CONTENT_CLIENT_EMAIL: 'project4@example.iam.gserviceaccount.com',
    FIREBASE_CONTENT_PRIVATE_KEY: 'project4-key',
    SMV_P23_READ_FAILOVER_COMPLETE: 'true',
    SMV_P23_PAIRED_REPLICA_MIRROR_WRITES: 'true',
    SMV_CUSTOMER_HISTORY_BACKFILL_COMPLETE: 'true',
    SMV_SESSION_HISTORY_BACKFILL_COMPLETE: 'true',
    SMV_LIVE_DATA_BACKFILL_COMPLETE: 'true',
    SMV_DASHBOARD_READ_REPLICA_BACKFILL_COMPLETE: 'true'
  };
  const result = initializeMultiProjectFirestore({ admin: fakeAdmin(), primaryDb, env });
  assert.equal(result.p23ReadFailoverComplete, true);
  assert.equal(result.p23MirrorWritesEnabled, true);
  assert.notEqual(result.consultationsDb, result.liveDataDb);
});

test('Project 2/3 read failover rejects an incomplete replica setup', () => {
  assert.throws(() => initializeMultiProjectFirestore({
    admin: fakeAdmin(),
    primaryDb: { primary: true },
    env: {
      SMV_FIRESTORE_MULTI_PROJECT_ENABLED: 'true',
      FIREBASE_PROJECT_ID: DEFAULT_PROJECT_IDS.primary,
      FIREBASE_CONSULTATIONS_CLIENT_EMAIL: 'project2@example.iam.gserviceaccount.com',
      FIREBASE_CONSULTATIONS_PRIVATE_KEY: 'project2-key',
      FIREBASE_LIVE_DATA_CLIENT_EMAIL: 'project3@example.iam.gserviceaccount.com',
      FIREBASE_LIVE_DATA_PRIVATE_KEY: 'project3-key',
      FIREBASE_CONTENT_CLIENT_EMAIL: 'project4@example.iam.gserviceaccount.com',
      FIREBASE_CONTENT_PRIVATE_KEY: 'project4-key',
      SMV_P23_READ_FAILOVER_COMPLETE: 'true',
      SMV_P23_PAIRED_REPLICA_MIRROR_WRITES: 'true'
    }
  }), /verified Customer-history, Session-history, Live-data and Dashboard-replica backfills/);
});

test('Project 4/5 readiness is content-only and requires Project 5 mirror access', () => {
  const primaryDb = { primary: true };
  const result = initializeMultiProjectFirestore({
    admin: fakeAdmin(), primaryDb,
    env: {
      SMV_FIRESTORE_MULTI_PROJECT_ENABLED: 'true',
      SMV_WALLET_DOMAIN_ENABLED: 'true',
      FIREBASE_PROJECT_ID: DEFAULT_PROJECT_IDS.primary,
      FIREBASE_CONSULTATIONS_CLIENT_EMAIL: 'project2@example.iam.gserviceaccount.com',
      FIREBASE_CONSULTATIONS_PRIVATE_KEY: 'project2-key',
      FIREBASE_LIVE_DATA_CLIENT_EMAIL: 'project3@example.iam.gserviceaccount.com',
      FIREBASE_LIVE_DATA_PRIVATE_KEY: 'project3-key',
      FIREBASE_CONTENT_CLIENT_EMAIL: 'project4@example.iam.gserviceaccount.com',
      FIREBASE_CONTENT_PRIVATE_KEY: 'project4-key',
      FIREBASE_WALLET_DOMAIN_CLIENT_EMAIL: 'project5@example.iam.gserviceaccount.com',
      FIREBASE_WALLET_DOMAIN_PRIVATE_KEY: 'project5-key',
      SMV_CONTENT_BACKFILL_COMPLETE: 'true',
      SMV_P45_PAIRED_CONTENT_MIRROR_WRITES: 'true',
      SMV_P45_READ_FAILOVER_COMPLETE: 'true'
    }
  });
  assert.equal(result.p45ReadFailoverComplete, true);
  assert.equal(result.p45ContentMirrorWritesEnabled, true);
  assert.notEqual(result.contentDb, result.walletDomainDb);
});
