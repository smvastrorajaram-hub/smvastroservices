import { createSign } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const FIRESTORE_API = 'https://firestore.googleapis.com/v1';
const GOOGLE_TOKEN_URI = 'https://oauth2.googleapis.com/token';
const DATASTORE_SCOPE = 'https://www.googleapis.com/auth/datastore';
const STAGING_PROJECT_ID = 'smv-astro-staging';

const COLLECTIONS = Object.freeze([
  { key: 'wallets', path: 'smv_wallets' },
  { key: 'walletTransactions', path: 'smv_wallet_transactions' },
  { key: 'walletRecharges', path: 'smv_wallet_recharges' },
  {
    key: 'walletRechargeOffers',
    path: 'smv_offers',
    filter: { field: 'offerType', op: 'EQUAL', value: 'wallet_recharge_bonus_minutes' },
    filterDescription: 'offerType == wallet_recharge_bonus_minutes'
  },
  {
    key: 'walletOfferAudit',
    path: 'smv_offer_audit',
    filter: { field: 'service', op: 'EQUAL', value: 'wallet_recharge' },
    filterDescription: 'service == wallet_recharge'
  },
  { key: 'walletOfferUsageCounters', path: 'smv_offer_usage_counters' },
  { key: 'liveSessions', path: 'smv_live_sessions' },
  { key: 'liveBookings', path: 'smv_live_bookings' },
  {
    key: 'scheduledCallChatAppointments',
    path: 'smv_appointments',
    filter: { field: 'bookingKind', op: 'IN', value: ['scheduled_call_request', 'scheduled_chat_request'] },
    filterDescription: 'bookingKind in [scheduled_call_request, scheduled_chat_request]'
  },
  {
    key: 'liveSessionEarnings',
    path: 'smv_payments',
    filter: { field: 'source', op: 'EQUAL', value: 'live_session' },
    filterDescription: 'source == live_session'
  },
  { key: 'withdrawals', path: 'smv_withdrawals' },
  { key: 'withdrawalPayouts', path: 'smv_withdrawal_payouts' },
  {
    key: 'walletRechargeRazorpayOrders',
    path: 'razorpay_orders',
    filter: { field: 'serviceName', op: 'EQUAL', value: 'SMV ASTRO Wallet Recharge' },
    filterDescription: 'serviceName == SMV ASTRO Wallet Recharge'
  },
  { key: 'razorpayWebhookEvents', path: 'razorpay_webhook_events' },
  { key: 'questionsRefundSourceCandidate', path: 'smv_questions' },
  { key: 'privateConsultationsRefundSourceCandidate', path: 'smv_private_consultations' },
  { key: 'notificationsRefundAuditCandidate', path: 'smv_notifications' }
]);

const QUIESCENCE_FILTERS = Object.freeze({
  activeOrConnectingLiveSessions: {
    collectionId: 'smv_live_sessions',
    filter: { field: 'state', op: 'IN', value: ['ringing', 'preparing', 'connecting', 'active'] }
  },
  pendingLiveBookings: {
    collectionId: 'smv_live_bookings',
    filter: { field: 'status', op: 'EQUAL', value: 'pending' }
  },
  reservedLiveBookings: {
    collectionId: 'smv_live_bookings',
    filter: { field: 'walletReservationState', op: 'EQUAL', value: 'reserved' }
  },
  nonTerminalWalletRecharges: {
    collectionId: 'smv_wallet_recharges',
    filter: { field: 'status', op: 'IN', value: ['creating', 'order_created', 'payment_pending', 'created', 'pending', 'processing'] }
  }
});

const SETTINGS_DOCUMENTS = Object.freeze([
  'liveSessionPricing',
  'commission'
]);

const NON_TERMINAL_RECHARGE_STATES = Object.freeze([
  'creating',
  'order_created',
  'payment_pending',
  'created',
  'pending',
  'processing'
]);

const REFUND_STATUS_VALUES = Object.freeze([
  'pending',
  'processed',
  'completed',
  'failed'
]);

function assertProjectId(projectId) {
  const value = String(projectId || '').trim();
  if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(value)) {
    throw new Error('SMV_FIRESTORE_SOURCE_PROJECT_ID is missing or invalid.');
  }
  if (value.toLowerCase() === STAGING_PROJECT_ID || value.toLowerCase().includes('staging')) {
    throw new Error('Read-only inventory refuses a staging project ID; select the intended Production project.');
  }
  return value;
}

export function validateInventoryConfig(projectId, credentials) {
  const selectedProjectId = assertProjectId(projectId);
  if (!credentials || typeof credentials !== 'object' || Array.isArray(credentials)) {
    throw new Error('Read-only service-account credentials are missing or not a JSON object.');
  }
  if (credentials.type !== 'service_account' ||
      typeof credentials.client_email !== 'string' ||
      !credentials.client_email.includes('@') ||
      typeof credentials.private_key !== 'string' ||
      !credentials.private_key.includes('BEGIN PRIVATE KEY') ||
      typeof credentials.project_id !== 'string') {
    throw new Error('Credentials are not a complete Google service-account JSON key.');
  }
  if (credentials.project_id !== selectedProjectId) {
    throw new Error('Selected Firestore project ID does not match the service-account project_id.');
  }
  const tokenUri = new URL(credentials.token_uri || GOOGLE_TOKEN_URI);
  if (tokenUri.origin !== new URL(GOOGLE_TOKEN_URI).origin || tokenUri.pathname !== '/token') {
    throw new Error('Service-account token endpoint is not the approved Google OAuth endpoint.');
  }
  return Object.freeze({
    projectId: selectedProjectId,
    clientEmail: credentials.client_email,
    privateKey: credentials.private_key,
    tokenUri: GOOGLE_TOKEN_URI
  });
}

export function buildAggregationRequest(collectionId, filter = null, { allDescendants = false } = {}) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(String(collectionId || ''))) {
    throw new TypeError('Collection ID is invalid.');
  }
  const from = { collectionId };
  if (allDescendants) from.allDescendants = true;
  const structuredQuery = { from: [from] };
  if (filter) {
    if (!filter.field || !['EQUAL', 'IN'].includes(filter.op)) {
      throw new TypeError('Inventory filter is not allowlisted.');
    }
    const encodedValue = filter.op === 'IN'
      ? { arrayValue: { values: filter.value.map(value => ({ stringValue: String(value) })) } }
      : { stringValue: String(filter.value) };
    structuredQuery.where = {
      fieldFilter: {
        field: { fieldPath: String(filter.field) },
        op: filter.op,
        value: encodedValue
      }
    };
  }
  return {
    structuredAggregationQuery: {
      structuredQuery,
      aggregations: [{ alias: 'documentCount', count: {} }]
    }
  };
}

export function parseAggregationCount(payload) {
  const rows = Array.isArray(payload) ? payload : [payload];
  for (const row of rows) {
    const value = row?.result?.aggregateFields?.documentCount;
    if (!value) continue;
    const raw = value.integerValue ?? value.doubleValue;
    const count = Number(raw);
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new Error('Firestore aggregation returned an invalid count.');
    }
    return count;
  }
  throw new Error('Firestore aggregation response did not contain a document count.');
}

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

async function createAccessToken(config, fetchImpl = globalThis.fetch) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(JSON.stringify({
    iss: config.clientEmail,
    scope: DATASTORE_SCOPE,
    aud: config.tokenUri,
    iat: now,
    exp: now + 3600
  }));
  const signingInput = header + '.' + claims;
  const signer = createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();
  const assertion = signingInput + '.' + signer.sign(config.privateKey).toString('base64url');
  const response = await fetchImpl(config.tokenUri, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    }),
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) {
    throw new Error('Google OAuth token exchange failed with HTTP ' + response.status + '.');
  }
  const payload = await response.json();
  if (typeof payload.access_token !== 'string' || !payload.access_token) {
    throw new Error('Google OAuth token response did not include an access token.');
  }
  return payload.access_token;
}

function encodeFirestorePath(value) {
  return String(value).split('/').map(segment => encodeURIComponent(segment)).join('/');
}

function aggregationCacheKey(collectionId, filter, allDescendants) {
  return JSON.stringify({ collectionId, filter: filter || null, allDescendants: allDescendants === true });
}

async function getJson(fetchImpl, url, token, { method = 'GET', body, label }) {
  const response = await fetchImpl(url, {
    method,
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/json',
      ...(body === undefined ? {} : { 'content-type': 'application/json' })
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(20000)
  });
  if (!response.ok) {
    // Do not print upstream response bodies; they can contain project metadata.
    throw new Error(label + ' failed with HTTP ' + response.status + '.');
  }
  return response.json();
}

export async function runInventory({
  projectId,
  credentials,
  fetchImpl = globalThis.fetch,
  now = () => new Date()
} = {}) {
  const config = validateInventoryConfig(projectId, credentials);
  const token = await createAccessToken(config, fetchImpl);
  const documentsRoot = FIRESTORE_API + '/projects/' + encodeURIComponent(config.projectId) + '/databases/(default)/documents';
  const countCache = new Map();
  let aggregationQueries = 0;

  async function countDocuments(collectionId, filter = null, { allDescendants = false } = {}) {
    const cacheKey = aggregationCacheKey(collectionId, filter, allDescendants);
    if (countCache.has(cacheKey)) return countCache.get(cacheKey);
    const requestBody = buildAggregationRequest(collectionId, filter, { allDescendants });
    const payload = await getJson(fetchImpl, documentsRoot + ':runAggregationQuery', token, {
      method: 'POST',
      body: requestBody,
      label: 'Count query for ' + collectionId
    });
    aggregationQueries += 1;
    const count = parseAggregationCount(payload);
    countCache.set(cacheKey, count);
    return count;
  }

  const collections = {};
  for (const spec of COLLECTIONS) {
    const totalDocuments = await countDocuments(spec.path);
    const matchingDocuments = spec.filter
      ? await countDocuments(spec.path, spec.filter)
      : totalDocuments;
    collections[spec.key] = {
      collectionPath: spec.path,
      totalDocuments,
      ...(spec.filter ? {
        filter: spec.filterDescription,
        matchingDocuments
      } : {})
    };
  }

  const quiescence = {};
  for (const [key, spec] of Object.entries(QUIESCENCE_FILTERS)) {
    quiescence[key] = await countDocuments(spec.collectionId, spec.filter);
  }
  quiescence.noActiveSessions = quiescence.activeOrConnectingLiveSessions === 0;
  quiescence.noPendingLiveBookings = quiescence.pendingLiveBookings === 0;
  quiescence.noReservedLiveBookings = quiescence.reservedLiveBookings === 0;
  quiescence.noNonTerminalWalletRecharges = quiescence.nonTerminalWalletRecharges === 0;
  quiescence.safeForHistoricalSnapshot = [
    quiescence.noActiveSessions,
    quiescence.noPendingLiveBookings,
    quiescence.noReservedLiveBookings,
    quiescence.noNonTerminalWalletRecharges
  ].every(Boolean);

  const nonTerminalRechargeStatusBreakdown = {};
  for (const status of NON_TERMINAL_RECHARGE_STATES) {
    nonTerminalRechargeStatusBreakdown[status] = await countDocuments('smv_wallet_recharges', {
      field: 'status', op: 'EQUAL', value: status
    });
  }
  const classifiedNonTerminalRecharges = Object.values(nonTerminalRechargeStatusBreakdown)
    .reduce((sum, count) => sum + count, 0);
  nonTerminalRechargeStatusBreakdown.knownStatusTotal = classifiedNonTerminalRecharges;
  nonTerminalRechargeStatusBreakdown.unclassifiedCount =
    quiescence.nonTerminalWalletRecharges - classifiedNonTerminalRecharges;

  const offerAuditDiagnostics = {
    totalDocuments: collections.walletOfferAudit.totalDocuments,
    serviceWalletRechargeMatches: collections.walletOfferAudit.matchingDocuments,
    offerTypeWalletRechargeMatches: await countDocuments('smv_offer_audit', {
      field: 'offerType', op: 'EQUAL', value: 'wallet_recharge_bonus_minutes'
    })
  };

  const refundCandidates = {};
  for (const [key, collectionPath] of [
    ['questions', 'smv_questions'],
    ['privateConsultations', 'smv_private_consultations']
  ]) {
    const collectionKey = key === 'questions'
      ? 'questionsRefundSourceCandidate'
      : 'privateConsultationsRefundSourceCandidate';
    const statusCounts = {};
    for (const status of REFUND_STATUS_VALUES) {
      statusCounts[status] = await countDocuments(collectionPath, {
        field: 'refundStatus', op: 'EQUAL', value: status
      });
    }
    refundCandidates[key] = {
      totalDocuments: collections[collectionKey].totalDocuments,
      rejectedByAdminStatusCount: await countDocuments(collectionPath, {
        field: 'status', op: 'EQUAL', value: 'question_rejected'
      }),
      refundStatusCounts: statusCounts
    };
  }

  const collectionGroups = {};
  for (const collectionId of ['messages', 'signals']) {
    collectionGroups[collectionId] = {
      scope: 'database_wide_collection_group',
      documents: await countDocuments(collectionId, null, { allDescendants: true }),
      note: 'Counts every subcollection with this name in the database; exact live-session ancestry is not asserted by this query.'
    };
  }

  const settingsDocuments = {};
  for (const documentId of SETTINGS_DOCUMENTS) {
    const path = 'smv_settings/' + documentId;
    const url = documentsRoot + '/' + encodeFirestorePath(path);
    try {
      const payload = await getJson(fetchImpl, url, token, { label: 'Read settings-document metadata for ' + documentId });
      settingsDocuments[documentId] = {
        exists: true,
        updateTime: typeof payload.updateTime === 'string' ? payload.updateTime : null
      };
      // Only existence and updateTime are retained. Document field values are never placed in the report.
    } catch (error) {
      if (String(error?.message || '').includes('HTTP 404')) {
        settingsDocuments[documentId] = { exists: false, updateTime: null };
      } else {
        throw error;
      }
    }
  }

  const report = {
    reportType: 'SMV_ASTRO_FIRESTORE_WALLET_SOURCE_INVENTORY',
    schemaVersion: 1,
    mode: 'read-only-counts-and-settings-metadata',
    generatedAt: now().toISOString(),
    sourceProjectId: config.projectId,
    serviceAccountProjectMatches: true,
    readMethod: 'Firestore server-side count aggregations plus two settings-document metadata reads',
    noDocumentPayloadExported: true,
    noFirestoreWritesAttempted: true,
    aggregationQueries,
    collections,
    collectionGroups,
    settingsDocuments,
    quiescence,
    nonTerminalRechargeStatusBreakdown,
    offerAuditDiagnostics,
    refundCandidates,
    interpretation: {
      sourceCountInventoryCompleteForRegistry: true,
      collectionGroupCountsAreDatabaseWideByName: true,
      historicalBackfillExecuted: false,
      d1WritesExecuted: false,
      productionCutoverExecuted: false
    }
  };

  return report;
}

async function main() {
  const projectId = process.env.SMV_FIRESTORE_SOURCE_PROJECT_ID;
  const credentialText = process.env.SMV_FIRESTORE_SOURCE_READONLY_CREDENTIALS;
  if (!projectId || !credentialText) {
    throw new Error('Missing Environment variable SMV_FIRESTORE_SOURCE_PROJECT_ID or secret SMV_FIRESTORE_SOURCE_READONLY_CREDENTIALS in environment firestore-wallet-readonly.');
  }
  let credentials;
  try {
    credentials = JSON.parse(credentialText);
  } catch {
    throw new Error('The read-only service-account secret is not valid JSON.');
  }
  const report = await runInventory({ projectId, credentials });
  const outputPath = resolve('artifacts/firestore-wallet-source-inventory.json');
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify({
    reportType: report.reportType,
    sourceProjectId: report.sourceProjectId,
    mode: report.mode,
    aggregationQueries: report.aggregationQueries,
    collections: Object.fromEntries(Object.entries(report.collections).map(([key, value]) => [
      key,
      value.filter === undefined
        ? value.totalDocuments
        : { total: value.totalDocuments, matching: value.matchingDocuments }
    ])),
    settingsDocuments: report.settingsDocuments,
    quiescence: report.quiescence,
    nonTerminalRechargeStatusBreakdown: report.nonTerminalRechargeStatusBreakdown,
    offerAuditDiagnostics: report.offerAuditDiagnostics,
    refundCandidates: report.refundCandidates,
    collectionGroups: report.collectionGroups,
    noDocumentPayloadExported: report.noDocumentPayloadExported,
    noFirestoreWritesAttempted: report.noFirestoreWritesAttempted
  }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => {
    // Errors are deliberately sanitized; never echo credentials, access tokens or upstream response bodies.
    console.error('Firestore read-only inventory failed: ' + String(error?.message || 'unknown error'));
    process.exitCode = 1;
  });
}
