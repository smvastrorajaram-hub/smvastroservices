'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeAllowlist, isConfiguredAdminIdentity } = require('../admin-auth');

test('configured Admin UID allowlist preserves existing Admin accounts', () => {
  assert.equal(isConfiguredAdminIdentity({ uid: 'owner-admin' }, { adminUids: ['owner-admin', 'legacy-admin'] }), true);
  assert.equal(isConfiguredAdminIdentity({ uid: 'legacy-admin' }, { adminUids: 'owner-admin, legacy-admin' }), true);
  assert.equal(isConfiguredAdminIdentity({ uid: 'customer-1' }, { adminUids: ['owner-admin'] }), false);
});

test('verified Firebase Admin custom claims are trusted', () => {
  assert.equal(isConfiguredAdminIdentity({ uid: 'u1', admin: true }), true);
  assert.equal(isConfiguredAdminIdentity({ uid: 'u2', role: 'admin' }), true);
  assert.equal(isConfiguredAdminIdentity({ uid: 'u3', role: 'customer' }), false);
});

test('explicitly configured, verified Admin emails are accepted case-insensitively', () => {
  assert.equal(isConfiguredAdminIdentity(
    { uid: 'u1', email: 'ADMIN@EXAMPLE.COM', email_verified: true },
    { adminEmails: ['admin@example.com'] }
  ), true);
  assert.equal(isConfiguredAdminIdentity(
    { uid: 'u1', email: 'admin@example.com', email_verified: false },
    { adminEmails: ['admin@example.com'] }
  ), false);
  assert.equal(isConfiguredAdminIdentity(
    { uid: 'u1', email: 'other@example.com', email_verified: true },
    { adminEmails: ['admin@example.com'] }
  ), false);
});

test('mutable profile-role data alone never grants Admin authorization', () => {
  assert.equal(isConfiguredAdminIdentity({ uid: 'customer-1', profile: { role: 'admin' } }), false);
  assert.equal(isConfiguredAdminIdentity({ uid: 'customer-1', role: 'customer' }), false);
  assert.equal(isConfiguredAdminIdentity(null), false);
  assert.deepEqual([...normalizeAllowlist([' one ', '', 'two'])], ['one', 'two']);
});
