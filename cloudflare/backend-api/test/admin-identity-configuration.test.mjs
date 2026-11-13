import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveConfiguredAdminUids, resolveConfiguredAdminWalletUid } from '../src/admin-identity-configuration.mjs';

test('configured Admin UID allowlist includes the dedicated Production binding', () => {
  assert.deepEqual(
    resolveConfiguredAdminUids({
      SMV_CONFIGURED_ADMIN_UIDS: ' TwjeEIFS3Zcf1SxboLZoujm91Ky2,second-admin, ',
      ADMIN_UIDS: 'legacy-admin,second-admin'
    }),
    ['legacy-admin', 'second-admin', 'TwjeEIFS3Zcf1SxboLZoujm91Ky2']
  );
});

test('configured Admin UID allowlist preserves legacy single-UID binding and ignores blanks', () => {
  assert.deepEqual(
    resolveConfiguredAdminUids({
      ADMIN_UID: '  legacy-single-admin ',
      ADMIN_UIDS: ', ,',
      SMV_CONFIGURED_ADMIN_UIDS: ''
    }),
    ['legacy-single-admin']
  );
});


test('the unique configured Admin resolves the canonical Production Admin Wallet UID', () => {
  assert.equal(
    resolveConfiguredAdminWalletUid({
      SMV_CONFIGURED_ADMIN_UIDS: 'TwjeEIFS3Zcf1SxboLZoujm91Ky2'
    }),
    'TwjeEIFS3Zcf1SxboLZoujm91Ky2'
  );
});

test('an explicit ADMIN_WALLET_UID takes precedence over the Admin allowlist', () => {
  assert.equal(
    resolveConfiguredAdminWalletUid({
      ADMIN_WALLET_UID: 'primary-admin-wallet',
      SMV_CONFIGURED_ADMIN_UIDS: 'other-admin'
    }),
    'primary-admin-wallet'
  );
});

test('multiple configured Admins fail closed without an explicit primary Admin Wallet owner', () => {
  assert.equal(
    resolveConfiguredAdminWalletUid({
      SMV_CONFIGURED_ADMIN_UIDS: 'admin-one,admin-two'
    }),
    ''
  );
});
