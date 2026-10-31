import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { createIdentityProfileBackfillService } from '../../../shared/backend-platform/d1-identity-profile-backfill.mjs';

function fakeD1() {
  const prepared = [];
  const batches = [];
  return {
    prepared, batches,
    prepare(sql) {
      return {
        sql,
        bind(...values) {
          const item = { sql, values };
          prepared.push(item);
          return {
            ...item,
            async first() { return null; },
            async all() { return { results: [] }; },
            async run() { return { success: true }; }
          };
        }
      };
    },
    async batch(items) {
      batches.push(items);
      return items.map(() => ({ success: true }));
    }
  };
}

function setup({ collection = 'smv_users', documents = [], projectId = 'smv-astro-staging',
  environment = 'staging', payoutEncryptionKey = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=' } = {}) {
  const db = fakeD1();
  const reads = [];
  const firestore = {
    projectId,
    async listDocuments(path, options) {
      reads.push({ path, options });
      assert.equal(path, collection);
      return { documents, nextPageToken: '' };
    }
  };
  const service = createIdentityProfileBackfillService({
    db, firestore, sourceProjectId: projectId, environment, payoutEncryptionKey, cryptoImpl: webcrypto,
    now: () => 1800000000000
  });
  return { db, firestore, reads, service };
}

test('rejects production, wrong Firebase project, and project/client mismatch', () => {
  const db = fakeD1();
  const firestore = { projectId: 'smv-astro-services', async listDocuments() { throw new Error('must not read'); } };
  assert.throws(() => createIdentityProfileBackfillService({
    db, firestore, sourceProjectId: 'smv-astro-services', environment: 'production', cryptoImpl: webcrypto
  }), /smv-astro-staging/);
  assert.throws(() => createIdentityProfileBackfillService({
    db, firestore, sourceProjectId: 'smv-astro-staging', environment: 'staging', cryptoImpl: webcrypto
  }), /smv-astro-staging/);
});

test('preview reads only source pages and returns counts without profile PII', async () => {
  const { db, reads, service } = setup({
    documents: [{
      id: 'customer-1',
      data: { uid: 'customer-1', role: 'customer', name: 'Sensitive Name', email: 'person@example.com',
        phone: '9876543210', publicId: 'smvcr-12345', status: 'active' }
    }]
  });
  const result = await service.previewPage({ collection: 'users', pageSize: 10 });
  assert.equal(reads.length, 1);
  assert.equal(reads[0].path, 'smv_users');
  assert.equal(result.sourceDocuments, 1);
  assert.equal(result.writesPerformed, 0);
  assert.equal(result.personalDataReturned, false);
  assert.equal(JSON.stringify(result).includes('Sensitive Name'), false);
  assert.equal(JSON.stringify(result).includes('person@example.com'), false);
  assert.equal(db.batches.length, 0);
});

test('imports customer profile, public ID and canonical phone into separate D1 domains', async () => {
  const { db, service } = setup({
    documents: [{
      id: 'customer-1',
      data: { uid: 'customer-1', role: 'customer', name: 'Test Customer', email: 'test@example.com',
        status: 'active', phone: '09876543210', phoneVerified: false, publicId: 'smvcr-12345',
        password: 'must-not-import', idToken: 'must-not-import' }
    }]
  });
  const result = await service.applyPage({ collection: 'users', pageSize: 10 });
  assert.equal(result.importedDocuments, 1);
  assert.equal(result.personalDataReturned, false);
  assert.equal(result.sourceDataDeleted, false);
  assert.equal(db.batches.length, 1);
  const sql = db.batches[0].map(item => item.sql).join('\n');
  assert.match(sql, /smv_domain_identity_users/);
  assert.match(sql, /smv_domain_identity_phones/);
  assert.match(sql, /smv_domain_identity_public_ids/);
  assert.match(sql, /smv_domain_identity_import_audit/);
  const userWrite = db.batches[0].find(item => item.sql.includes('smv_domain_identity_users'));
  assert.equal(userWrite.values[0], 'smv-astro-staging');
  assert.equal(userWrite.values[1], 'customer-1');
  assert.equal(userWrite.values[3], 'customer');
  assert.equal(userWrite.values[7], '+919876543210');
  assert.equal(userWrite.values[8].length, 64);
  assert.equal(userWrite.values[10].includes('must-not-import'), false);
});

test('a mutable role=admin in smv_users is imported as unknown, not an Admin grant', async () => {
  const { db, service } = setup({
    documents: [{ id: 'intruder', data: { uid: 'intruder', role: 'admin', status: 'active' } }]
  });
  await service.applyPage({ collection: 'users' });
  const userWrite = db.batches[0].find(item => item.sql.includes('smv_domain_identity_users'));
  assert.equal(userWrite.values[3], 'unknown');
  assert.equal(db.batches[0].some(item => item.sql.includes('smv_domain_identity_admins')), false);
});

test('only the smv_admins source collection writes the separate Admin allowlist', async () => {
  const { db, service } = setup({
    collection: 'smv_admins',
    documents: [{ id: 'trusted-admin', data: { grantedBy: 'owner', createdAt: new Date(1700000000000) } }]
  });
  await service.applyPage({ collection: 'admins' });
  assert.equal(db.batches[0].filter(item => item.sql.includes('smv_domain_identity_admins')).length, 1);
});

test('payout records are isolated from ordinary profile JSON and never returned', async () => {
  const { db, service } = setup({
    collection: 'smv_payouts',
    documents: [{
      id: 'astro-1',
      data: { uid: 'astro-1', bankName: 'Private Bank', accountName: 'Account Holder',
        accountNumber: '123456789012', ifsc: 'ABCD0000123', upi: 'holder@upi',
        status: 'pending_admin_review' }
    }]
  });
  const result = await service.applyPage({ collection: 'payouts' });
  const payoutWrite = db.batches[0].find(item => item.sql.includes('smv_domain_identity_payout_profiles'));
  assert.ok(payoutWrite);
  assert.equal(db.batches[0].some(item => item.sql.includes('smv_domain_identity_users')), false);
  assert.equal(result.personalDataReturned, false);
  assert.equal(JSON.stringify(result).includes('123456789012'), false);
  const envelope = JSON.parse(payoutWrite.values[2]);
  assert.equal(envelope.algorithm, 'A256GCM');
  assert.equal(envelope.version, 1);
  assert.equal(payoutWrite.values[2].includes('123456789012'), false);
  const key = await webcrypto.subtle.importKey('raw', new Uint8Array(32), { name: 'AES-GCM' }, false, ['decrypt']);
  const iv = Uint8Array.from(atob(envelope.iv), ch => ch.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(envelope.ciphertext), ch => ch.charCodeAt(0));
  const plaintext = await webcrypto.subtle.decrypt({ name: 'AES-GCM', iv,
    additionalData: new TextEncoder().encode('smv-astro-staging:astro-1'), tagLength: 128 }, key, ciphertext);
  const restored = new TextDecoder().decode(plaintext);
  assert.match(restored, /123456789012/);
  assert.match(restored, /Private Bank/);
});

test('rejects phone registry entries whose SHA-256 document ID does not match the canonical phone', async () => {
  const { db, service } = setup({
    collection: 'smv_phone_registry',
    documents: [{ id: 'not-the-phone-hash', data: { uid: 'customer-1', role: 'customer',
      phoneNormalized: '+919876543210', verificationMode: 'email_unique' } }]
  });
  const preview = await service.previewPage({ collection: 'phones' });
  assert.equal(preview.mappableDocuments, 0);
  assert.equal(preview.warningCounts[0].code, 'PHONE_REGISTRY_HASH_MISMATCH');
  await assert.rejects(service.applyPage({ collection: 'phones' }),
    error => error.code === 'IDENTITY_BACKFILL_SOURCE_WARNINGS' && error.httpStatus === 409);
  assert.equal(db.batches.length, 0);
});

test('supports canonical and legacy astrologer collections, keeping approval in its own table', async () => {
  const { db, service } = setup({
    collection: 'smv_astrologers',
    documents: [{ id: 'astro-1', data: { uid: 'astro-1', publicId: 'smvar-10001',
      status: 'approved', name: 'Astrologer', bankName: 'must-not-be-in-profile' } }]
  });
  await service.applyPage({ collection: 'astrologers' });
  const sql = db.batches[0].map(item => item.sql).join('\n');
  assert.match(sql, /smv_domain_identity_astrologers/);
  assert.match(sql, /smv_domain_identity_public_ids/);
  const astro = db.batches[0].find(item => item.sql.includes('smv_domain_identity_astrologers'));
  assert.equal(astro.values[3], 'approved');
  assert.equal(astro.values[4].includes('must-not-be-in-profile'), false);
});

test('validates page size and prevents unsupported collections', async () => {
  const { service } = setup();
  await assert.rejects(service.previewPage({ collection: 'smv_wallets' }),
    error => error.code === 'IDENTITY_BACKFILL_COLLECTION_UNSUPPORTED');
  await assert.rejects(service.previewPage({ collection: 'users', pageSize: 26 }),
    error => error.code === 'IDENTITY_BACKFILL_PAGE_SIZE_INVALID');
});

test('reconciliation is read-only and never declares cutover safe', async () => {
  const { db, service } = setup({
    documents: [{ id: 'customer-1', data: { uid: 'customer-1', role: 'customer', status: 'active' } }]
  });
  const result = await service.reconcilePage({ collection: 'users' });
  assert.equal(result.writesPerformed, 0);
  assert.equal(result.cutoverSafe, false);
  assert.equal(result.personalDataReturned, false);
  assert.equal(db.batches.length, 0);
});

test('blocks payout import when the protected AES-GCM key is not configured', async () => {
  const { db, service } = setup({
    collection: 'smv_payouts', payoutEncryptionKey: '',
    documents: [{ id: 'astro-1', data: { uid: 'astro-1', accountNumber: '123456789012' } }]
  });
  const preview = await service.previewPage({ collection: 'payouts' });
  assert.equal(preview.mappableDocuments, 0);
  assert.equal(preview.warningCounts[0].code, 'PAYOUT_ENCRYPTION_KEY_MISSING');
  await assert.rejects(service.applyPage({ collection: 'payouts' }),
    error => error.code === 'IDENTITY_BACKFILL_SOURCE_WARNINGS');
  assert.equal(db.batches.length, 0);
});
