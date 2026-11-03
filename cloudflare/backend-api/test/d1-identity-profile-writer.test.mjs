import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { createD1IdentityProfileWriter } from '../../../shared/backend-platform/d1-identity-profile-writer.mjs';

function fakeDb() {
  const batches = [];
  return {
    batches,
    prepare(sql) { return { bind(...values) { return { sql, values }; } }; },
    async batch(statements) { batches.push(statements); return statements.map(() => ({ success: true })); }
  };
}

test('writes a fresh Customer identity/profile, public ID and hashed phone to D1', async () => {
  const db = fakeDb();
  const writer = createD1IdentityProfileWriter({ db, projectId: 'smv-astro', cryptoImpl: webcrypto, now: () => 1900000000000 });
  const result = await writer.upsertCustomerProfile({
    uid: 'customer-1', email: 'customer@example.com', name: 'Customer One',
    phone: '9876543210', publicId: 'smvcr-12345', emailVerified: true
  });
  assert.deepEqual(result, { uid: 'customer-1', role: 'customer', status: 'active', publicId: 'smvcr-12345' });
  assert.equal(db.batches.length, 1);
  const writes = db.batches[0];
  assert.equal(writes.length, 3);
  const user = writes.find(item => item.sql.includes('smv_domain_identity_users'));
  assert.equal(user.values[0], 'smv-astro');
  assert.equal(user.values[1], 'customer-1');
  assert.equal(user.values[3], 'customer');
  assert.equal(user.values[4], 'active');
  assert.equal(user.values[8].length, 64);
  assert.ok(writes.some(item => item.sql.includes('smv_domain_identity_public_ids')));
  assert.ok(writes.some(item => item.sql.includes('smv_domain_identity_phones')));
});

test('writes Astrologer pending identity status separately from profile role', async () => {
  const db = fakeDb();
  const writer = createD1IdentityProfileWriter({ db, projectId: 'smv-astro', cryptoImpl: webcrypto, now: () => 1900000000000 });
  const result = await writer.upsertAstrologerProfile({
    uid: 'astro-1', email: 'astro@example.com', name: 'Astrologer One',
    phone: '+919876543210', publicId: 'smvar-12345',
    specialization: 'Vedic Astrology', experience: 8, languages: ['Tamil', 'English'],
    status: 'pending', bio: 'Profile bio', bankName: 'MUST_NOT_WRITE'
  });
  assert.equal(result.role, 'astrologer');
  assert.equal(result.status, 'pending');
  const writes = db.batches[0];
  const user = writes.find(item => item.sql.includes('smv_domain_identity_users'));
  const astro = writes.find(item => item.sql.includes('smv_domain_identity_astrologers'));
  assert.equal(user.values[4], 'pending');
  assert.equal(astro.values[3], 'pending');
  assert.equal(JSON.stringify(writes).includes('MUST_NOT_WRITE'), false);
  assert.ok(writes.some(item => item.sql.includes('smv_domain_identity_public_ids')));
  assert.ok(writes.some(item => item.sql.includes('smv_domain_identity_phones')));
});

test('rejects invalid UID and incomplete D1 batch writes', async () => {
  const db = fakeDb();
  db.batch = async () => [{ success: false }];
  const writer = createD1IdentityProfileWriter({ db, projectId: 'smv-astro', cryptoImpl: webcrypto });
  await assert.rejects(writer.upsertCustomerProfile({ uid: '../bad' }), error => error.code === 'AUTH_UID_INVALID');
  await assert.rejects(writer.upsertCustomerProfile({ uid: 'customer-1' }),
    error => error.code === 'IDENTITY_PROFILE_D1_WRITE_FAILED' && error.httpStatus === 503);
});
