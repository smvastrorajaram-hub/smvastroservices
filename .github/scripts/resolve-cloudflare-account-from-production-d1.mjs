import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const API_ROOT = 'https://api.cloudflare.com/client/v4';
export const PRODUCTION_D1_DATABASE_ID = 'b1d5684c-3fcd-48fe-9571-ea41fc605c7d';
export const PRODUCTION_D1_DATABASE_NAME = 'smvastro-wallet-production';

function safeApiError(payload) {
  const codes = Array.isArray(payload?.errors)
    ? payload.errors.map(item => String(item?.code || '')).filter(Boolean).join(',')
    : '';
  return codes ? ' Cloudflare error code(s): ' + codes + '.' : '';
}

export async function resolveCloudflareAccountForProductionD1({
  apiToken = process.env.CLOUDFLARE_API_TOKEN,
  databaseId = PRODUCTION_D1_DATABASE_ID,
  databaseName = PRODUCTION_D1_DATABASE_NAME,
  fetchImpl = globalThis.fetch
} = {}) {
  const token = String(apiToken || '').trim();
  if (!token) throw new Error('CLOUDFLARE_API_TOKEN is missing.');
  if (!/^[a-f0-9-]{36}$/i.test(String(databaseId || ''))) {
    throw new Error('Production D1 database ID is invalid.');
  }
  if (String(databaseName || '') !== PRODUCTION_D1_DATABASE_NAME) {
    throw new Error('Refusing to resolve an account for an unexpected D1 database name.');
  }
  if (typeof fetchImpl !== 'function') throw new Error('Fetch is unavailable in this Node runtime.');

  const headers = { Authorization: 'Bearer ' + token, Accept: 'application/json' };
  async function getJson(path) {
    let response;
    try {
      response = await fetchImpl(API_ROOT + path, { method: 'GET', headers });
    } catch {
      throw new Error('Cloudflare API could not be reached while resolving the Production account.');
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.success !== true) {
      throw new Error('Cloudflare API request failed with HTTP ' + response.status + '.' + safeApiError(payload));
    }
    return payload;
  }

  const accounts = [];
  let page = 1;
  let totalPages = 1;
  do {
    const payload = await getJson('/accounts?page=' + page + '&per_page=50');
    accounts.push(...(Array.isArray(payload.result) ? payload.result : []));
    totalPages = Math.max(1, Number(payload.result_info?.total_pages) || 1);
    page += 1;
  } while (page <= totalPages);

  if (!accounts.length) {
    throw new Error('The Cloudflare token cannot list any accounts. Grant Account Read access or configure CLOUDFLARE_ACCOUNT_ID.');
  }

  const matches = [];
  let d1ReadDenied = 0;
  for (const account of accounts) {
    const accountId = String(account?.id || '').trim();
    if (!accountId) continue;
    let response;
    try {
      response = await fetchImpl(
        API_ROOT + '/accounts/' + encodeURIComponent(accountId) +
          '/d1/database/' + encodeURIComponent(databaseId),
        { method: 'GET', headers }
      );
    } catch {
      throw new Error('Cloudflare D1 lookup failed while locating the configured Production database.');
    }
    const payload = await response.json().catch(() => ({}));
    if (response.status === 404) continue;
    if (response.status === 401 || response.status === 403) {
      d1ReadDenied += 1;
      continue;
    }
    if (!response.ok || payload?.success !== true) {
      throw new Error('Cloudflare D1 lookup returned HTTP ' + response.status + '.' + safeApiError(payload));
    }
    const database = payload.result || {};
    if (String(database.uuid || database.id || '') === databaseId &&
        String(database.name || '') === databaseName) {
      matches.push({ id: accountId, name: String(account.name || '') });
    }
  }

  if (matches.length !== 1) {
    if (matches.length > 1) {
      throw new Error('The Production D1 database ID was found in more than one Cloudflare account. Configure CLOUDFLARE_ACCOUNT_ID explicitly.');
    }
    if (d1ReadDenied === accounts.length) {
      throw new Error('The Cloudflare token cannot read D1 databases. Grant D1 Read access or configure CLOUDFLARE_ACCOUNT_ID.');
    }
    throw new Error('The exact Production D1 database was not found in the Cloudflare accounts visible to this token. Check token Account/D1 Read permissions and the configured D1 ID.');
  }
  return matches[0].id;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const accountId = await resolveCloudflareAccountForProductionD1();
    process.stdout.write(accountId + '\n');
  } catch (error) {
    process.stderr.write(String(error?.message || 'Unable to resolve the Production Cloudflare account.') + '\n');
    process.exitCode = 1;
  }
}
