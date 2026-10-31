import test from 'node:test';
import assert from 'node:assert/strict';
import { createD1IdentityService } from '../../../shared/backend-platform/d1-identity-service.mjs';

function createDb({ user = null, astrologer = null, admin = null, fail = false } = {}) {
  const calls = [];
  return {
    calls,
    prepare(sql) {
      return {
        bind(...values) {
          return {
            async first() {
              calls.push({ sql, values });
              if (fail) throw new Error('D1 unavailable');
              if (sql.includes('FROM smv_domain_identity_users')) return user;
              if (sql.includes('FROM smv_domain_identity_astrologers')) return astrologer;
              if (sql.includes('FROM smv_domain_identity_admins')) return admin;
              throw new Error('Unexpected SQL query');
            }
          };
        }
      };
    }
  };
}

const verifiedIdentity = Object.freeze({
  uid: 'firebase-uid-1',
  projectId: 'smv-astro-staging',
  email: 'person@example.com',
  emailVerified: true,
  signInProvider: 'password'
});

function serviceFor({ db = createDb(), identity = verifiedIdentity, verifyError = false, ...options } = {}) {
  return createD1IdentityService({
    db,
    projectIds: ['smv-astro-staging', 'smv-astro-other'],
    verifyIdToken: async (token, allowedProjects) => {
      assert.equal(token, 'valid-token');
      assert.deepEqual(allowedProjects, ['smv-astro-staging', 'smv-astro-other']);
      if (verifyError) throw new Error('invalid token');
      return identity;
    },
    ...options
  });
}

test('rejects a missing or malformed bearer token before D1 access', async () => {
  const db = createDb();
  const service = serviceFor({ db });
  await assert.rejects(service.authenticateAuthorization(''),
    error => error.code === 'AUTH_REQUIRED' && error.httpStatus === 401);
  await assert.rejects(service.authenticateAuthorization('Bearer '),
    error => error.code === 'AUTH_REQUIRED' && error.httpStatus === 401);
  assert.equal(db.calls.length, 0);
});

test('rejects an invalid Firebase ID token before D1 access', async () => {
  const db = createDb();
  const service = serviceFor({ db, verifyError: true });
  await assert.rejects(service.authenticateAuthorization('Bearer valid-token'),
    error => error.code === 'AUTH_REQUIRED' && error.httpStatus === 401);
  assert.equal(db.calls.length, 0);
});

test('resolves an active Customer from project-scoped D1 profile data', async () => {
  const db = createDb({
    user: {
      uid: 'firebase-uid-1',
      firebase_project_id: 'smv-astro-staging',
      email: 'old-profile@example.com',
      role: 'customer',
      status: 'active',
      public_id: 'smvcr-48372',
      name: 'Test Customer',
      email_verified: 0,
      profile_json: '{"displayName":"Test Customer"}'
    }
  });
  const user = await serviceFor({ db }).authenticateAuthorization('Bearer valid-token');
  assert.equal(user.uid, 'firebase-uid-1');
  assert.equal(user.role, 'customer');
  assert.equal(user.name, 'Test Customer');
  assert.equal(user.publicId, 'smvcr-48372');
  assert.equal(user.email, 'person@example.com');
  assert.equal(user.emailVerified, true);
  assert.equal(user.isAdmin, false);
  assert.equal(user.astrologerApproved, false);
  assert.equal(db.calls.length, 3);
  assert.deepEqual(db.calls.map(call => call.values), [
    ['smv-astro-staging', 'firebase-uid-1'],
    ['smv-astro-staging', 'firebase-uid-1'],
    ['smv-astro-staging', 'firebase-uid-1']
  ]);
});


test('the same UID cannot inherit an application profile from another Firebase project', async () => {
  const otherProjectIdentity = {
    ...verifiedIdentity,
    projectId: 'smv-astro-other'
  };
  const db = createDb();
  const user = await serviceFor({ db, identity: otherProjectIdentity })
    .authenticateAuthorization('Bearer valid-token');

  assert.equal(user.uid, 'firebase-uid-1');
  assert.equal(user.firebaseProjectId, 'smv-astro-other');
  assert.equal(user.role, 'unknown');
  assert.equal(user.isAdmin, false);
  assert.deepEqual(db.calls.map(call => call.values), [
    ['smv-astro-other', 'firebase-uid-1'],
    ['smv-astro-other', 'firebase-uid-1'],
    ['smv-astro-other', 'firebase-uid-1']
  ]);
});

test('does not trust an Admin-looking value in an ordinary user profile', async () => {
  const db = createDb({
    user: { uid: 'firebase-uid-1', role: 'unknown', status: 'active', profile_json: '{"role":"admin"}' }
  });
  const user = await serviceFor({ db }).authenticateAuthorization('Bearer valid-token');
  assert.equal(user.isAdmin, false);
  assert.equal(user.role, 'unknown');
});

test('resolves Admin only from a separate project-scoped D1 allowlist or trusted identity', async () => {
  const allowlisted = await serviceFor({
    db: createDb({ admin: { uid: 'firebase-uid-1' } })
  }).authenticateAuthorization('Bearer valid-token');
  assert.equal(allowlisted.isAdmin, true);
  assert.equal(allowlisted.role, 'admin');

  const configuredUid = await serviceFor({
    db: createDb(),
    adminUids: ['smv-astro-staging:firebase-uid-1']
  }).authenticateAuthorization('Bearer valid-token');
  assert.equal(configuredUid.isAdmin, true);

  const configuredEmail = await serviceFor({
    db: createDb(),
    adminEmails: ['smv-astro-staging:person@example.com']
  }).authenticateAuthorization('Bearer valid-token');
  assert.equal(configuredEmail.isAdmin, true);
});

test('configured Admin identities cannot cross Firebase projects', async () => {
  const otherProjectIdentity = {
    ...verifiedIdentity,
    projectId: 'smv-astro-other'
  };
  const uidFromOtherProject = await serviceFor({
    db: createDb(),
    identity: otherProjectIdentity,
    adminUids: ['smv-astro-staging:firebase-uid-1']
  }).authenticateAuthorization('Bearer valid-token');
  assert.equal(uidFromOtherProject.isAdmin, false);

  const emailFromOtherProject = await serviceFor({
    db: createDb(),
    identity: otherProjectIdentity,
    adminEmails: ['smv-astro-staging:person@example.com']
  }).authenticateAuthorization('Bearer valid-token');
  assert.equal(emailFromOtherProject.isAdmin, false);
});

test('does not grant configured-email Admin access when the email is unverified', async () => {
  const identity = { ...verifiedIdentity, emailVerified: false };
  const user = await serviceFor({
    db: createDb(),
    identity,
    adminEmails: ['smv-astro-staging:person@example.com']
  }).authenticateAuthorization('Bearer valid-token');
  assert.equal(user.isAdmin, false);
});

test('marks only an active, approved Astrologer as approved', async () => {
  const db = createDb({
    user: { uid: 'firebase-uid-1', role: 'astrologer', status: 'active', profile_json: '{}' },
    astrologer: { uid: 'firebase-uid-1', status: 'approved' }
  });
  const approved = await serviceFor({ db }).authenticateAuthorization('Bearer valid-token');
  assert.equal(approved.role, 'astrologer');
  assert.equal(approved.astrologerApproved, true);

  const pendingDb = createDb({
    user: { uid: 'firebase-uid-1', role: 'astrologer', status: 'pending' },
    astrologer: { uid: 'firebase-uid-1', status: 'pending' }
  });
  const pending = await serviceFor({ db: pendingDb }).authenticateAuthorization('Bearer valid-token');
  assert.equal(pending.role, 'astrologer');
  assert.equal(pending.astrologerApproved, false);
});

test('rejects an identity returned for a project outside the allowlist', async () => {
  const service = serviceFor({
    identity: { ...verifiedIdentity, projectId: 'unexpected-project' }
  });
  await assert.rejects(service.authenticateAuthorization('Bearer valid-token'),
    error => error.code === 'AUTH_REQUIRED' && error.httpStatus === 401);
});

test('fails closed when the D1 identity schema or data is unavailable', async () => {
  const service = serviceFor({ db: createDb({ fail: true }) });
  await assert.rejects(service.authenticateAuthorization('Bearer valid-token'),
    error => error.code === 'IDENTITY_PROFILE_UNAVAILABLE' && error.httpStatus === 503);
});
