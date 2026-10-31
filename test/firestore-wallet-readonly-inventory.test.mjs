import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import {
  buildAggregationRequest,
  parseAggregationCount,
  runInventory,
  validateInventoryConfig
} from '../scripts/firestore-wallet-readonly-inventory.mjs';

const projectId = 'smvastro-prod-2026';
const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' }
});
const credentials = {
  type: 'service_account',
  project_id: projectId,
  client_email: 'smv-wallet-firestore-ro@example.iam.gserviceaccount.com',
  private_key: privateKey,
  token_uri: 'https://oauth2.googleapis.com/token'
};

test('project selection requires the matching service-account project and refuses staging', () => {
  assert.equal(validateInventoryConfig(projectId, credentials).projectId, projectId);
  assert.throws(() => validateInventoryConfig('smv-astro-staging', credentials), /refuses a staging project ID/);
  assert.throws(() => validateInventoryConfig('smvastro-prod-other', credentials), /does not match/);
  assert.throws(() => validateInventoryConfig(projectId, { ...credentials, token_uri: 'https://attacker.invalid/token' }), /approved Google OAuth endpoint/);
});

test('aggregation request is a server-side count query and contains no write operations', () => {
  const request = buildAggregationRequest('smv_wallets');
  const aggregation = request.structuredAggregationQuery;
  assert.deepEqual(aggregation.structuredQuery.from, [{ collectionId: 'smv_wallets' }]);
  assert.deepEqual(aggregation.aggregations, [{ alias: 'documentCount', count: {} }]);
  assert.equal('writes' in request, false);
  assert.equal('update' in request, false);
});

test('aggregation request supports the allowlisted equality and IN filters', () => {
  const equal = buildAggregationRequest('smv_offers', {
    field: 'offerType', op: 'EQUAL', value: 'wallet_recharge_bonus_minutes'
  });
  assert.equal(equal.structuredAggregationQuery.structuredQuery.where.fieldFilter.op, 'EQUAL');
  assert.deepEqual(
    equal.structuredAggregationQuery.structuredQuery.where.fieldFilter.value,
    { stringValue: 'wallet_recharge_bonus_minutes' }
  );
  const inside = buildAggregationRequest('smv_appointments', {
    field: 'bookingKind', op: 'IN', value: ['scheduled_call_request', 'scheduled_chat_request']
  });
  assert.deepEqual(
    inside.structuredAggregationQuery.structuredQuery.where.fieldFilter.value.arrayValue.values,
    [{ stringValue: 'scheduled_call_request' }, { stringValue: 'scheduled_chat_request' }]
  );
  assert.throws(() => buildAggregationRequest('smv_wallets', { field: 'x', op: 'NOT_EQUAL', value: 'anything' }), /not allowlisted/);
  assert.throws(() => buildAggregationRequest('bad/path'), /Collection ID is invalid/);
});

test('aggregation result parser accepts count values and rejects incomplete responses', () => {
  assert.equal(parseAggregationCount([{ result: { aggregateFields: { documentCount: { integerValue: '42' } } } }]), 42);
  assert.equal(parseAggregationCount({ result: { aggregateFields: { documentCount: { integerValue: '0' } } } }), 0);
  assert.throws(() => parseAggregationCount([]), /did not contain a document count/);
  assert.throws(() => parseAggregationCount({ result: { aggregateFields: { documentCount: { integerValue: '-1' } } } }), /invalid count/);
});

test('inventory uses only Firestore aggregation reads and settings GETs, and never retains settings values', async () => {
  const requests = [];
  const fakeFetch = async (input, init = {}) => {
    const url = new URL(String(input));
    const method = init.method || 'GET';
    requests.push({ url: url.toString(), method, body: typeof init.body === 'string' ? JSON.parse(init.body) : null });
    if (url.origin === 'https://oauth2.googleapis.com') {
      assert.equal(method, 'POST');
      return new Response(JSON.stringify({ access_token: 'fake-access-token', expires_in: 3600 }), { status: 200 });
    }
    assert.equal(url.origin, 'https://firestore.googleapis.com');
    if (url.pathname.endsWith(':runAggregationQuery')) {
      assert.equal(method, 'POST');
      const structured = requests.at(-1).body.structuredAggregationQuery;
      const source = structured.structuredQuery.from[0];
      const filter = structured.structuredQuery.where?.fieldFilter;
      let count = source.allDescendants ? 3 : filter ? 1 : 12;
      if (source.collectionId === 'smv_wallet_recharges' &&
          filter?.field?.fieldPath === 'status' && filter.op === 'IN') count = 6;
      if (source.collectionId === 'smv_wallet_recharges' &&
          filter?.field?.fieldPath === 'status' && filter.op === 'EQUAL') count = 1;
      if (source.collectionId === 'smv_offer_audit' &&
          filter?.field?.fieldPath === 'offerType') count = 1;
      return new Response(JSON.stringify([{
        result: { aggregateFields: { documentCount: { integerValue: String(count) } } }
      }]), { status: 200 });
    }
    assert.equal(method, 'GET');
    assert.match(url.pathname, /\/documents\/smv_settings\/(liveSessionPricing|commission)$/);
    return new Response(JSON.stringify({
      updateTime: '2026-10-30T12:00:00Z',
      fields: { secretBalanceValue: { integerValue: '999999' } }
    }), { status: 200 });
  };

  const report = await runInventory({
    projectId,
    credentials,
    fetchImpl: fakeFetch,
    now: () => new Date('2026-10-31T00:00:00.000Z')
  });

  assert.equal(report.sourceProjectId, projectId);
  assert.equal(report.noDocumentPayloadExported, true);
  assert.equal(report.noFirestoreWritesAttempted, true);
  assert.equal(report.interpretation.historicalBackfillExecuted, false);
  assert.equal(report.interpretation.d1WritesExecuted, false);
  assert.equal(report.collections.wallets.totalDocuments, 12);
  assert.equal(report.collections.walletRechargeOffers.matchingDocuments, 1);
  assert.equal(report.collectionGroups.messages.documents, 3);
  assert.equal(report.quiescence.nonTerminalWalletRecharges, 6);
  assert.equal(report.nonTerminalRechargeStatusBreakdown.knownStatusTotal, 6);
  assert.equal(report.nonTerminalRechargeStatusBreakdown.unclassifiedCount, 0);
  assert.equal(report.offerAuditDiagnostics.serviceWalletRechargeMatches, 1);
  assert.equal(report.offerAuditDiagnostics.offerTypeWalletRechargeMatches, 1);
  assert.equal(report.refundCandidates.questions.totalDocuments, 12);
  assert.equal(report.refundCandidates.questions.refundStatusCounts.pending, 1);
  assert.equal(report.settingsDocuments.commission.exists, true);
  assert.equal(report.settingsDocuments.commission.updateTime, '2026-10-30T12:00:00Z');
  assert.equal(JSON.stringify(report).includes('secretBalanceValue'), false);
  assert.equal(JSON.stringify(report).includes('999999'), false);

  const firestoreRequests = requests.filter(request => request.url.startsWith('https://firestore.googleapis.com/'));
  assert.ok(firestoreRequests.length > 0);
  assert.ok(firestoreRequests.every(request =>
    request.method === 'POST'
      ? request.url.endsWith(':runAggregationQuery')
      : request.method === 'GET' && /\/documents\/smv_settings\//.test(new URL(request.url).pathname)
  ));
  assert.ok(firestoreRequests.every(request => !/:(commit|batchWrite|write|beginTransaction|rollback)$/.test(new URL(request.url).pathname)));
});
