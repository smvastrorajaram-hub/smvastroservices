import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveFirebaseAuthorization } from '../../../shared/backend-platform/firebase-authorization.mjs';

test('recognizes an ordinary customer from their own profile', () => {
  const result = resolveFirebaseAuthorization({
    identity: { uid: 'customer-1', email_verified: true },
    profileDocument: { exists: true, data: { role: 'customer', status: 'active' } },
    adminDocument: { exists: false },
    astrologerDocument: { exists: false }
  });
  assert.equal(result.role, 'customer');
  assert.equal(result.isAdmin, false);
  assert.equal(result.astrologerApproved, false);
});

test('recognizes an approved astrologer only when both profile records agree', () => {
  const result = resolveFirebaseAuthorization({
    identity: { uid: 'astro-1' },
    profileDocument: { exists: true, data: { role: 'astrologer', status: 'active' } },
    adminDocument: { exists: false },
    astrologerDocument: { exists: true, data: { status: 'approved' } }
  });
  assert.equal(result.role, 'astrologer');
  assert.equal(result.astrologerApproved, true);
});

test('does not grant Admin from a mutable user profile role', () => {
  const result = resolveFirebaseAuthorization({
    identity: { uid: 'fake-admin' },
    profileDocument: { exists: true, data: { role: 'admin', status: 'active' } },
    adminDocument: { exists: false },
    astrologerDocument: { exists: false }
  });
  assert.equal(result.isAdmin, false);
  assert.equal(result.role, 'unknown');
});

test('recognizes Admin only through verified claim or own server-controlled allowlist document', () => {
  const viaDocument = resolveFirebaseAuthorization({
    identity: { uid: 'admin-1' },
    profileDocument: { exists: true, data: { role: 'customer' } },
    adminDocument: { exists: true, data: {} },
    astrologerDocument: { exists: false }
  });
  const viaClaim = resolveFirebaseAuthorization({
    identity: { uid: 'admin-2', admin: true },
    profileDocument: { exists: false },
    adminDocument: { exists: false },
    astrologerDocument: { exists: false }
  });
  assert.equal(viaDocument.isAdmin, true);
  assert.equal(viaDocument.role, 'admin');
  assert.equal(viaClaim.isAdmin, true);
});

test('does not approve an astrologer when either status is inactive or unapproved', () => {
  const result = resolveFirebaseAuthorization({
    identity: { uid: 'astro-2' },
    profileDocument: { exists: true, data: { role: 'astrologer', status: 'pending' } },
    adminDocument: { exists: false },
    astrologerDocument: { exists: true, data: { status: 'approved' } }
  });
  assert.equal(result.astrologerApproved, false);
});
