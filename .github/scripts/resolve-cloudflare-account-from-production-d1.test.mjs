import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveCloudflareAccountForProductionD1,
  PRODUCTION_D1_DATABASE_ID,
  PRODUCTION_D1_DATABASE_NAME
} from './resolve-cloudflare-account-from-production-d1.mjs';

function response(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return payload; }
  };
}

test('Production D1 account resolver selects only the account containing the exact database ID and name', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).endsWith('/accounts?page=1&per_page=50')) {
      return response({
        success: true,
        result: [{ id: 'account-other', name: 'Other' }, { id: 'account-smv', name: 'SMV' }],
        result_info: { total_pages: 1 }
      });
    }
    if (String(url).includes('/accounts/account-other/d1/database/')) {
      return response({ success: false }, 404);
    }
    if (String(url).includes('/accounts/account-smv/d1/database/')) {
      return response({
        success: true,
        result: { uuid: PRODUCTION_D1_DATABASE_ID, name: PRODUCTION_D1_DATABASE_NAME }
      });
    }
    throw new Error('Unexpected Cloudflare endpoint: ' + url);
  };
  const id = await resolveCloudflareAccountForProductionD1({ apiToken: 'test-token', fetchImpl });
  assert.equal(id, 'account-smv');
  assert.equal(calls.length, 3);
  assert.ok(calls.every(call => call.options.headers.Authorization === 'Bearer test-token'));
});

test('Production D1 account resolver rejects an unrelated database with the same account scope', async () => {
  const fetchImpl = async url => {
    if (String(url).includes('/accounts?page=')) {
      return response({ success: true, result: [{ id: 'account-smv' }], result_info: { total_pages: 1 } });
    }
    return response({ success: true, result: { uuid: PRODUCTION_D1_DATABASE_ID, name: 'wrong-name' } });
  };
  await assert.rejects(
    resolveCloudflareAccountForProductionD1({ apiToken: 'test-token', fetchImpl }),
    /exact Production D1 database was not found/
  );
});

test('Production D1 account resolver fails clearly when the token cannot read D1 accounts', async () => {
  const fetchImpl = async url => String(url).includes('/accounts?page=')
    ? response({ success: true, result: [{ id: 'account-smv' }], result_info: { total_pages: 1 } })
    : response({ success: false, errors: [{ code: 10000 }] }, 403);
  await assert.rejects(
    resolveCloudflareAccountForProductionD1({ apiToken: 'test-token', fetchImpl }),
    /cannot read D1 databases/
  );
});

test('Production D1 account resolver refuses missing tokens and unexpected database names', async () => {
  await assert.rejects(resolveCloudflareAccountForProductionD1({ apiToken: '' }), /CLOUDFLARE_API_TOKEN is missing/);
  await assert.rejects(
    resolveCloudflareAccountForProductionD1({
      apiToken: 'test-token', databaseName: 'not-production', fetchImpl: async()=>response({})
    }),
    /unexpected D1 database name/
  );
});
