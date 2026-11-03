import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveConfiguredAdminUids } from '../src/admin-identity-configuration.mjs';

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
