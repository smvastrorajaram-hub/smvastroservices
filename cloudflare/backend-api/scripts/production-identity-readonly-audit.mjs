import fs from 'node:fs';
import { createGoogleServiceAccountTokenProvider } from '../../../shared/backend-platform/google-service-account-token.mjs';

export const SOURCE_COLLECTIONS = Object.freeze([
  'smv_users',
  'smv_astrologers',
  'smv_astrologer',
  'smv_admins',
  'smv_phone_registry',
  'smv_public_ids',
  'smv_payouts'
]);

function safeCount(value) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) throw new TypeError('AUDIT_COUNT_INVALID');
  return number;
}

export function readFirestoreAggregateCount(payload) {
  const rows = Array.isArray(payload) ? payload : [payload];
  const row = rows.find(item => item?.result?.aggregateFields?.count ||
    item?.aggregateFields?.count);
  const raw = row?.result?.aggregateFields?.count?.integerValue ??
    row?.result?.aggregateFields?.count?.doubleValue ??
    row?.aggregateFields?.count?.integerValue ??
    row?.aggregateFields?.count?.doubleValue;
  if (raw === undefined || raw === null) throw new TypeError('FIRESTORE_AGGREGATE_COUNT_MISSING');
  return safeCount(raw);
}

export function readD1MetricRows(payload) {
  const metrics = new Map();
  function walk(node) {
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    if (!node || typeof node !== 'object') return;
    if (typeof node.metric === 'string' && node.value !== undefined) {
      metrics.set(node.metric, safeCount(node.value));
      return;
    }
    for (const value of Object.values(node)) walk(value);
  }
  walk(payload);
  return metrics;
}

export function evaluateIdentityInventory({ firebaseCounts, d1Metrics }) {
  const blockers = [];
  const sourceVsAudit = [];
  for (const collection of SOURCE_COLLECTIONS) {
    const sourceCount = safeCount(firebaseCounts[collection]);
    const auditCount = d1Metrics.get('audit:' + collection + ':total');
    const warningCount = d1Metrics.get('audit:' + collection + ':warning');
    sourceVsAudit.push({
      collection,
      firebaseCount: sourceCount,
      d1ImportAuditCount: auditCount ?? null,
      warningCount: warningCount ?? null,
      matched: auditCount !== undefined && sourceCount === auditCount,
      warningFree: warningCount === 0
    });
    if (auditCount === undefined) blockers.push('Missing D1 import-audit count for ' + collection);
    else if (sourceCount !== auditCount) blockers.push('Firebase/D1 import-audit count mismatch for ' + collection);
    if (warningCount === undefined) blockers.push('Missing warning count for ' + collection);
    else if (warningCount !== 0) blockers.push('D1 import audit has warning rows for ' + collection);
  }

  for (const name of ['inventory_complete', 'reconciliation_complete', 'source_quiesced']) {
    if (d1Metrics.get('meta:' + name) !== 1) {
      blockers.push('Production Identity/Profile migration attestation is incomplete: ' + name);
    }
  }
  for (const name of [
    'd1:identity_users', 'd1:identity_astrologers', 'd1:identity_admins',
    'd1:identity_phones', 'd1:identity_public_ids', 'd1:identity_payout_profiles'
  ]) {
    if (!d1Metrics.has(name)) blockers.push('Missing D1 Identity/Profile table count: ' + name);
  }
  if (!d1Metrics.has('d1:identity_import_audit')) {
    blockers.push('Missing D1 Identity/Profile import-audit inventory');
  }
  if (!d1Metrics.has('d1:identity_migration_meta')) {
    blockers.push('Missing D1 Identity/Profile migration metadata inventory');
  }

  return Object.freeze({
    ok: blockers.length === 0,
    readyForAuthorization: blockers.length === 0,
    firebaseProjectId: 'smv-astro',
    auditMode: 'read_only_counts_and_attestations',
    sourceVsAudit,
    d1IdentityTableCounts: Object.fromEntries([
      'd1:identity_users', 'd1:identity_astrologers', 'd1:identity_admins',
      'd1:identity_phones', 'd1:identity_public_ids', 'd1:identity_payout_profiles',
      'd1:identity_import_audit', 'd1:identity_migration_meta'
    ].map(name => [name, d1Metrics.get(name) ?? null])),
    migrationAttestations: Object.fromEntries(
      ['inventory_complete', 'reconciliation_complete', 'source_quiesced']
        .map(name => [name, d1Metrics.get('meta:' + name) === 1])
    ),
    blockers
  });
}

async function countCollection({ projectId, collection, tokenProvider, fetchImpl = globalThis.fetch }) {
  const endpoint = 'https://firestore.googleapis.com/v1/projects/' + encodeURIComponent(projectId) +
    '/databases/(default)/documents:runAggregationQuery';
  let response;
  try {
    response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + await tokenProvider.getAccessToken(),
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        structuredAggregationQuery: {
          structuredQuery: { from: [{ collectionId: collection }] },
          aggregations: [{ count: {}, alias: 'count' }]
        }
      }),
      signal: AbortSignal.timeout(15000)
    });
  } catch {
    throw new Error('FIRESTORE_READ_ONLY_AGGREGATION_UNAVAILABLE');
  }
  if (!response.ok) throw new Error('FIRESTORE_READ_ONLY_AGGREGATION_REJECTED');
  let payload;
  try { payload = await response.json(); }
  catch { throw new Error('FIRESTORE_AGGREGATION_RESPONSE_INVALID'); }
  return readFirestoreAggregateCount(payload);
}

function loadCredentials() {
  const raw = String(process.env.SMV_IDENTITY_AUDIT_SERVICE_ACCOUNT_JSON || '').trim();
  if (!raw) throw new Error('FIREBASE_PROJECT_1_SERVICE_ACCOUNT_MISSING');
  let credentials;
  try { credentials = JSON.parse(raw); }
  catch { throw new Error('FIREBASE_PROJECT_1_SERVICE_ACCOUNT_INVALID'); }
  if (String(credentials?.project_id || '').trim() !== 'smv-astro') {
    throw new Error('FIREBASE_PROJECT_1_SERVICE_ACCOUNT_PROJECT_MISMATCH');
  }
  return credentials;
}

async function main() {
  const d1ReportPath = process.argv[2];
  if (!d1ReportPath) throw new Error('D1_READ_ONLY_REPORT_PATH_REQUIRED');
  const d1Raw = fs.readFileSync(d1ReportPath, 'utf8');
  let d1Payload;
  try {
    const start = Math.min(...[d1Raw.indexOf('['), d1Raw.indexOf('{')].filter(value => value >= 0));
    if (!Number.isFinite(start)) throw new Error('no_json');
    d1Payload = JSON.parse(d1Raw.slice(start));
  } catch {
    throw new Error('D1_READ_ONLY_REPORT_INVALID');
  }
  const d1Metrics = readD1MetricRows(d1Payload);
  const credentials = loadCredentials();
  const tokenProvider = createGoogleServiceAccountTokenProvider({
    credentials,
    scope: 'https://www.googleapis.com/auth/datastore'
  });
  const entries = await Promise.all(SOURCE_COLLECTIONS.map(async collection => [
    collection, await countCollection({ projectId: 'smv-astro', collection, tokenProvider })
  ]));
  const firebaseCounts = Object.fromEntries(entries);
  const report = evaluateIdentityInventory({ firebaseCounts, d1Metrics });
  console.log(JSON.stringify({ ...report, firebaseSourceCollectionCounts: firebaseCounts }, null, 2));
  if (!report.readyForAuthorization) process.exitCode = 2;
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  main().catch(error => {
    const code = String(error?.message || 'PRODUCTION_IDENTITY_AUDIT_FAILED')
      .replace(/[^A-Z0-9_:-]/gi, '_').slice(0, 100);
    console.error(JSON.stringify({
      ok: false,
      readyForAuthorization: false,
      firebaseProjectId: 'smv-astro',
      auditMode: 'read_only_counts_and_attestations',
      blockers: [code]
    }, null, 2));
    process.exitCode = 2;
  });
}
