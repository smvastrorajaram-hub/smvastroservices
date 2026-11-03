import { appendFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import { createFirestoreAdminRestClient } from '../../../shared/backend-platform/firestore-admin-rest.mjs';
import {
  createIdentityProfileBackfillService,
  IDENTITY_PROFILE_SOURCE_COLLECTIONS
} from '../../../shared/backend-platform/d1-identity-profile-backfill.mjs';

const PROJECT_ID = 'smv-astro-staging';
const DATABASE_ID = '0ddb87a9-8a16-4e39-a806-c9137c64959a';
const DATABASE_NAME = 'smvastro-wallet-staging';
const PAGE_SIZE = 25;
const MAX_PAGES_PER_COLLECTION = 5000;

function required(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error('Required staging migration setting is missing: ' + name);
  return value;
}

function sqlLiteral(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('Non-finite SQL number refused.');
    return String(value);
  }
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'string') return "'" + value.replace(/'/g, "''") + "'";
  throw new TypeError('Unsupported D1 SQL parameter type refused.');
}

function bindSql(sql, params) {
  let index = 0;
  const statement = String(sql).replace(/\?/g, () => {
    if (index >= params.length) throw new Error('D1 parameter count mismatch.');
    return sqlLiteral(params[index++]);
  });
  if (index !== params.length) throw new Error('D1 parameter count mismatch.');
  return statement;
}

function createCloudflareD1HttpClient({ accountId, apiToken, databaseId }) {
  const endpoint = 'https://api.cloudflare.com/client/v4/accounts/' +
    encodeURIComponent(accountId) + '/d1/database/' + encodeURIComponent(databaseId) + '/query';

  async function execute(body) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + apiToken,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000)
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.success !== true || !Array.isArray(payload?.result)) {
      throw new Error('Cloudflare D1 API query failed safely (HTTP ' + response.status + ').');
    }
    if (payload.result.some(item => item?.success !== true)) {
      throw new Error('Cloudflare D1 API returned an unsuccessful statement result.');
    }
    return payload.result;
  }

  return Object.freeze({
    prepare(sql) {
      return Object.freeze({
        bind(...values) {
          const boundSql = bindSql(sql, values);
          return Object.freeze({
            sql: String(sql),
            values: [...values],
            async first() {
              const result = await execute({ sql: boundSql });
              const rows = result[0]?.results;
              return Array.isArray(rows) && rows.length ? rows[0] : null;
            },
            async all() {
              const result = await execute({ sql: boundSql });
              return { results: Array.isArray(result[0]?.results) ? result[0].results : [] };
            },
            async run() {
              const result = await execute({ sql: boundSql });
              return { success: result[0]?.success === true, meta: result[0]?.meta || null };
            }
          });
        }
      });
    },
    async batch(statements) {
      if (!Array.isArray(statements) || statements.length > 100) {
        throw new Error('D1 batch size is invalid; maximum is 100 statements.');
      }
      if (!statements.length) return [];
      const batch = statements.map(item => {
        if (!item || typeof item.sql !== 'string' || !Array.isArray(item.values)) {
          throw new TypeError('D1 batch statement is malformed.');
        }
        return { sql: bindSql(item.sql, item.values) };
      });
      const results = await execute({ batch });
      if (results.length !== batch.length) {
        throw new Error('D1 batch result count does not match the submitted statements.');
      }
      return results.map(item => ({ success: item.success === true, meta: item.meta || null }));
    }
  });
}

function warningTotal(items) {
  return (Array.isArray(items) ? items : []).reduce((total, item) => total + Number(item?.count || 0), 0);
}

function failOnReconciliation(result, collection) {
  const counters = [
    'auditMissing', 'payloadMismatches', 'targetMappingsMissing',
    'targetMappingMismatches', 'warningCount'
  ];
  const diagnostic = {
    phase: 'identity_profile_reconciliation',
    collection,
    sourceDocuments: Number(result?.sourceDocuments || 0),
    auditMissing: Number(result?.auditMissing || 0),
    payloadMismatches: Number(result?.payloadMismatches || 0),
    targetMappingsMissing: Number(result?.targetMappingsMissing || 0),
    targetMappingMismatches: Number(result?.targetMappingMismatches || 0),
    warningCount: Number(result?.warningCount || 0),
    mismatchKinds: Array.isArray(result?.samples?.targetMappingMismatches)
      ? result.samples.targetMappingMismatches.slice(0, 10) : []
  };
  console.log(JSON.stringify(diagnostic));
  const failed = counters.filter(key => Number(result?.[key] || 0) !== 0);
  if (failed.length) {
    throw new Error('Identity/Profile reconciliation failed for ' + collection + ': ' + failed.join(', ') + '.');
  }
}

async function main() {
  if (String(process.env.SMV_IDENTITY_PROFILE_STAGING_IMPORT_ENABLED || '') !== 'true') {
    throw new Error('Staging Identity/Profile import is not explicitly enabled for this run.');
  }
  if (String(process.env.SMV_IDENTITY_PROFILE_PRODUCTION_IMPORT_ENABLED || 'false') === 'true') {
    throw new Error('Production Identity/Profile import is forbidden by this staging-only runner.');
  }
  if (String(process.env.SMV_ENVIRONMENT || 'staging') !== 'staging') {
    throw new Error('Identity/Profile import is restricted to staging.');
  }

  const accountId = required('CLOUDFLARE_ACCOUNT_ID');
  const apiToken = required('CLOUDFLARE_API_TOKEN');
  const configuredDatabaseId = required('SMV_IDENTITY_PROFILE_D1_DATABASE_ID');
  if (configuredDatabaseId !== DATABASE_ID) {
    throw new Error('Refusing D1 target: this runner accepts only the pinned staging database.');
  }

  const credentials = JSON.parse(required('FIREBASE_SERVICE_ACCOUNT_JSON'));
  if (credentials?.project_id !== PROJECT_ID || !credentials?.client_email || !credentials?.private_key) {
    throw new Error('Refusing Firebase source: a complete service account from smv-astro-staging is required.');
  }

  const encodedKey = required('SMV_IDENTITY_PAYOUT_ENCRYPTION_KEY');
  const normalizedKey = encodedKey.replace(/-/g, '+').replace(/_/g, '/');
  const keyBytes = Buffer.from(normalizedKey, 'base64');
  if (keyBytes.length !== 32 || keyBytes.toString('base64').replace(/=+$/g, '') !== normalizedKey.replace(/=+$/g, '')) {
    throw new Error('Identity payout encryption key must decode to exactly 32 bytes.');
  }

  const firestore = createFirestoreAdminRestClient({
    projectId: PROJECT_ID,
    allowedProjectIds: [PROJECT_ID],
    credentials
  });
  const db = createCloudflareD1HttpClient({ accountId, apiToken, databaseId: DATABASE_ID });
  const service = createIdentityProfileBackfillService({
    db,
    firestore,
    sourceProjectId: PROJECT_ID,
    environment: 'staging',
    payoutEncryptionKey: encodedKey,
    payoutKeyVersion: String(process.env.SMV_IDENTITY_PAYOUT_KEY_VERSION || 'v1'),
    cryptoImpl: webcrypto
  });

  // Preview every page of every collection before the first D1 write.
  const inventories = [];
  let totalSourceDocuments = 0;
  let totalPlannedStatements = 0;
  for (const collection of Object.keys(IDENTITY_PROFILE_SOURCE_COLLECTIONS)) {
    let pageToken = '';
    let pageCount = 0;
    let sourceDocuments = 0;
    let plannedStatements = 0;
    let warnings = 0;
    const pages = [];
    do {
      if (pageCount >= MAX_PAGES_PER_COLLECTION) {
        throw new Error('Identity/Profile page safety limit reached for ' + collection + '.');
      }
      const preview = await service.previewPage({ collection, pageSize: PAGE_SIZE, pageToken });
      pageCount += 1;
      sourceDocuments += Number(preview.sourceDocuments || 0);
      plannedStatements += Number(preview.plannedD1Statements || 0);
      warnings += warningTotal(preview.warningCounts);
      pages.push(pageToken);
      pageToken = String(preview.nextPageToken || '');
    } while (pageToken);

    inventories.push({ collection, pageCount, sourceDocuments, plannedStatements, warnings, pages });
    totalSourceDocuments += sourceDocuments;
    totalPlannedStatements += plannedStatements;
    console.log(JSON.stringify({
      collection, pages: pageCount, sourceDocuments, plannedStatements, warnings, writesPerformed: 0
    }));
    if (warnings !== 0) {
      throw new Error('Identity/Profile preview contains source warnings for ' + collection + '; no import writes were started.');
    }
  }

  // Idempotent writes; every source page is recalculated immediately before apply.
  let importedDocuments = 0;
  let d1Writes = 0;
  for (const inventory of inventories) {
    for (const pageToken of inventory.pages) {
      const result = await service.applyPage({
        collection: inventory.collection, pageSize: PAGE_SIZE, pageToken
      });
      importedDocuments += Number(result.importedDocuments || 0);
      d1Writes += Number(result.writesPerformed || 0);
    }
  }

  // Independent source-to-target reconciliation after all writes.
  let reconciledDocuments = 0;
  for (const inventory of inventories) {
    for (const pageToken of inventory.pages) {
      const result = await service.reconcilePage({
        collection: inventory.collection, pageSize: PAGE_SIZE, pageToken
      });
      failOnReconciliation(result, inventory.collection);
      reconciledDocuments += Number(result.sourceDocuments || 0);
    }
  }
  if (reconciledDocuments !== totalSourceDocuments || importedDocuments !== totalSourceDocuments) {
    throw new Error('Identity/Profile imported/reconciled document totals do not match the preflight inventory.');
  }

  // Record a reconciled staging mirror, but explicitly do not attest source quiescence.
  const now = Date.now();
  const counts = Object.fromEntries(inventories.map(item => [item.collection, item.sourceDocuments]));
  const metadataSql = [
    'INSERT INTO smv_domain_identity_migration_meta',
    '(source_project_id,inventory_complete,reconciliation_complete,source_quiesced,',
    'last_source_update_time,imported_users,imported_astrologers,imported_admins,',
    'imported_phones,imported_public_ids,imported_payout_profiles,updated_at_ms)',
    'VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
    'ON CONFLICT(source_project_id) DO UPDATE SET',
    'inventory_complete=excluded.inventory_complete,',
    'reconciliation_complete=excluded.reconciliation_complete,',
    'source_quiesced=0,',
    'last_source_update_time=excluded.last_source_update_time,',
    'imported_users=excluded.imported_users,',
    'imported_astrologers=excluded.imported_astrologers,',
    'imported_admins=excluded.imported_admins,',
    'imported_phones=excluded.imported_phones,',
    'imported_public_ids=excluded.imported_public_ids,',
    'imported_payout_profiles=excluded.imported_payout_profiles,',
    'updated_at_ms=excluded.updated_at_ms'
  ].join(' ');
  await db.prepare(metadataSql).bind(
    PROJECT_ID, 1, 1, 0, new Date(now).toISOString(),
    counts.users || 0,
    (counts.astrologers || 0) + (counts.legacyAstrologers || 0),
    counts.admins || 0,
    counts.phones || 0,
    counts.publicIds || 0,
    counts.payouts || 0,
    now
  ).run();

  const summary = [
    '## Staging Identity/Profile import and reconciliation',
    '',
    '- Source: smv-astro-staging (read-only Firestore)',
    '- Destination: ' + DATABASE_NAME + ' (pinned staging D1 only)',
    '- Imported documents: ' + importedDocuments,
    '- Reconciled documents: ' + reconciledDocuments,
    '- D1 statements confirmed: ' + d1Writes,
    '- Preview warnings: 0',
    '- Source writes/deletes: 0',
    '- Production D1/Worker writes: 0',
    '- Identity D1 authorization: still disabled',
    '- Source quiesced attestation: false; cutover remains blocked',
    '',
    '| Collection | Pages | Documents | Planned statements | Warnings |',
    '|---|---:|---:|---:|---:|',
    ...inventories.map(item => [
      item.collection, item.pageCount, item.sourceDocuments, item.plannedStatements, item.warnings
    ].join(' | ')),
    '',
    'Totals: ' + totalSourceDocuments + ' documents, ' + totalPlannedStatements +
      ' planned statements, ' + d1Writes + ' confirmed D1 writes.'
  ].join('\n');

  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + '\n');
  console.log(JSON.stringify({
    status: 'STAGING_IDENTITY_PROFILE_IMPORT_RECONCILED',
    sourceProjectId: PROJECT_ID,
    destinationDatabase: DATABASE_NAME,
    collections: inventories.length,
    importedDocuments,
    reconciledDocuments,
    d1Writes,
    sourceWrites: 0,
    sourceDeletes: 0,
    productionWrites: 0,
    identityAuthorizationEnabled: false,
    sourceQuiesced: false
  }));
}

main().catch(error => {
  console.error('Identity/Profile staging import failed safely: ' +
    String(error?.message || 'unknown error').replace(/[\r\n]/g, ' ').slice(0, 300));
  process.exitCode = 1;
});
