import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  createBackendSchemaInspector,
  inspectBackendSchema,
  registerBackendReadinessRoute
} from '../src/backend-readiness.mjs';

function readyRow() {
  return {
    shared_domain_version: '0002_shared_domain_repository',
    notification_inbox_table_count: 1,
    notification_inbox_index_count: 1,
    offer_redemption_usage_table_count: 1,
    offer_redemptions_table_count: 1,
    offer_redemption_validate_trigger_count: 1,
    offer_redemption_apply_trigger_count: 1,
    wallet_recharges_version: '0005_legacy_wallet_backfill',
    live_sessions_version: '0006_d1_live_wallet_settlement',
    identity_users_table_count: 1,
    identity_migration_meta_table_count: 1,
    identity_profiles_version: '0008_identity_profile_backfill_audit',
    identity_import_audit_table_count: 1,
    identity_import_audit_index_count: 1,
    wallet_security_version: '0009_wallet_razorpay_payout_encryption',
    encrypted_payout_table_count: 1,
    razorpay_order_idempotency_index_count: 1,
    razorpay_order_idempotency_columns_count: 2,
    razorpay_claim_columns_count: 2,
    live_booking_release_version: '0011_live_booking_release_claim',
    live_booking_release_trigger_count: 1,
    numeric_public_reference_ids_version: '0012_numeric_public_reference_ids',
    public_withdrawal_id_index_count: 1,
    admin_payment_id_index_count: 1,
    customer_payment_id_index_count: 1,
    live_session_query_indexes_version: '0014_live_session_query_indexes',
    live_session_query_indexes_count: 6,
    bonus_credit_wallet_version: '0013_bonus_credit_wallet',
    wallet_bonus_credit_columns_count: 2,
    wallet_ledger_bonus_credit_columns_count: 4,
    wallet_offer_bonus_credit_columns_count: 1,
    offer_redemption_bonus_credit_columns_count: 1,
    live_session_bonus_credit_columns_count: 1,
    live_booking_bonus_credit_columns_count: 1,
    live_session_bonus_reserve_trigger_count: 1,
    live_earning_bonus_credit_trigger_count: 1,
    wallet_ledger_bonus_credit_apply_trigger_count: 1,
    wallet_ledger_bonus_credit_validate_trigger_count: 1,
  };
}

function dbWith(row, { fail = false, bonusCreditFail = false } = {}) {
  const calls = [];
  return {
    calls,
    prepare(sql) {
      calls.push(sql);
      return {
        async first() {
          if (fail) throw new Error('D1 read failed');
          if (bonusCreditFail && /bonus-credit-wallet/.test(sql)) {
            throw new Error('Bonus Credit schema marker is unavailable');
          }
          return row;
        }
      };
    }
  };
}

function responseRecorder() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) { this.statusCode = code; return this; },
    set(headers) { Object.assign(this.headers, headers); return this; },
    json(body) { this.body = body; return this; }
  };
}

test('Production D1 schema readiness recognizes the current 0002-0013 migration contracts', async () => {
  const db = dbWith(readyRow());
  const result = await inspectBackendSchema(db);

  assert.equal(result.d1Binding, true);
  assert.equal(result.querySucceeded, true);
  assert.equal(result.ready, true);
  assert.equal(result.schemaVersion, '0002_shared_domain_repository');
  assert.deepEqual(Object.values(result.schemaMigrations), Array(13).fill(true));
  assert.equal(result.checks.bonusCreditWalletSchema, true);
  assert.equal(db.calls.length, 2);
  assert.match(db.calls[0], /smv_domain_schema_meta/);
  assert.doesNotMatch(db.calls[0], /bonus-credit-wallet/);
  assert.match(db.calls[1], /bonus-credit-wallet/);
  assert.doesNotMatch(db.calls[1], /promotional_fund/i);
  assert.doesNotMatch(db.calls[0], /smv_wallet_schema_meta|0001_wallet_live_domain/);
  assert.match(db.calls[0], /schema_objects AS MATERIALIZED/);
  assert.doesNotMatch(db.calls[1], /table_columns AS MATERIALIZED/);
  assert.doesNotMatch(db.calls[1], /UNION ALL/i,
    'Bonus Credit table metadata checks must avoid compound SELECT terms for D1 compatibility');
  assert.equal((db.calls[0].match(/FROM sqlite_master/g) || []).length, 1,
    'the required schema contract scans sqlite_master once per probe');
  assert.equal((db.calls[1].match(/FROM sqlite_master/g) || []).length, 1,
    'the Bonus Credit schema contract scans sqlite_master once per probe');
  assert.equal((db.calls[1].match(/FROM pragma_table_info\(/g) || []).length, 6,
    'Bonus Credit column checks read each required table definition once');
});

test('required schema query aggregates all six optional Live Session indexes', async () => {
  const db = dbWith(readyRow());
  const result = await inspectBackendSchema(db);
  const query = db.calls[0];
  const expectedIndexes = [
    'idx_smv_domain_sessions_customer_recent',
    'idx_smv_domain_sessions_astrologer_recent',
    'idx_smv_domain_sessions_customer_status_updated',
    'idx_smv_domain_sessions_astrologer_status_updated',
    'idx_smv_domain_sessions_customer_appointment',
    'idx_smv_domain_sessions_astrologer_appointment'
  ];

  assert.match(query, /AS live_session_query_indexes_count/);
  assert.ok(query.includes("SUM(CASE WHEN type='index' AND name IN ("));
  for (const name of expectedIndexes) {
    assert.equal((query.match(new RegExp(name, 'g')) || []).length, 2,
      name + ' must be both selected by the metadata CTE and included in the aggregate');
  }
  assert.equal(result.schemaMigrations['0014_live_session_query_indexes'], true);
  assert.equal(result.checks.liveSessionQueryIndexes, true);

  const incompleteRow = readyRow();
  incompleteRow.live_session_query_indexes_count = 5;
  const incomplete = await inspectBackendSchema(dbWith(incompleteRow));
  assert.equal(incomplete.schemaMigrations['0014_live_session_query_indexes'], false);
  assert.equal(incomplete.checks.liveSessionQueryIndexes, false);
  assert.equal(incomplete.ready, true, 'the optional 0014 index gate must not block core readiness');
});

test('schema inspector coalesces concurrent probes and reuses a bounded successful result', async () => {
  let clock = 1000;
  let prepareCalls = 0;
  const db = {
    prepare() {
      prepareCalls += 1;
      return { async first() { return readyRow(); } };
    }
  };
  const inspect = createBackendSchemaInspector({ db, ttlMs: 500, errorTtlMs: 100, now: () => clock });
  const [first, concurrent] = await Promise.all([inspect(), inspect()]);
  assert.equal(first.ready, true);
  assert.equal(concurrent.ready, true);
  assert.equal(prepareCalls, 2, 'one probe pair is shared by concurrent requests');
  await inspect();
  assert.equal(prepareCalls, 2, 'the result is reused inside the TTL');
  clock += 500;
  await inspect();
  assert.equal(prepareCalls, 4, 'the cache refreshes after its bounded TTL');
});

test('schema inspector briefly caches D1 errors instead of retrying on every request', async () => {
  let prepareCalls = 0;
  const inspect = createBackendSchemaInspector({
    db: { prepare() { prepareCalls += 1; return { async first() { throw new Error('D1 quota exhausted'); } }; } },
    ttlMs: 1000,
    errorTtlMs: 250
  });
  const first = await inspect();
  const second = await inspect();
  assert.equal(first.querySucceeded, false);
  assert.equal(second.querySucceeded, false);
  assert.equal(prepareCalls, 1, 'a D1 failure is not hammered by every incoming request');
});

test('schema and migration status are read from D1 on every request, never a cached boolean', async () => {
  const row = readyRow();
  const db = dbWith(row);

  assert.equal((await inspectBackendSchema(db)).ready, true);
  row.live_booking_release_trigger_count = 0;
  const next = await inspectBackendSchema(db);

  assert.equal(next.ready, false);
  assert.equal(next.schemaMigrations['0011_live_booking_release_claim'], false);
  assert.equal(db.calls.length, 4);
});

test('a missing 0013 Bonus Credit schema does not mask valid 0002-0012 migration evidence', async () => {
  const db = dbWith(readyRow(), { bonusCreditFail: true });
  const result = await inspectBackendSchema(db);

  assert.equal(result.d1Binding, true);
  assert.equal(result.querySucceeded, true);
  assert.equal(result.bonusCreditSchemaQuerySucceeded, false);
  assert.equal(result.ready, false);
  for (const key of Object.keys(result.schemaMigrations).filter(key => key !== '0013_bonus_credit_wallet')) {
    assert.equal(result.schemaMigrations[key], true, key + ' should remain visible when only 0013 is missing');
  }
  assert.equal(result.schemaMigrations['0013_bonus_credit_wallet'], false);
  assert.equal(result.checks.bonusCreditWalletSchema, false);
  assert.equal(db.calls.length, 2);
});

test('any missing or stale required marker or schema object fails readiness closed', async () => {
  for (const mutate of [
    row => { row.shared_domain_version = '0001_wallet_live_domain'; },
    row => { row.wallet_recharges_version = null; },
    row => { row.live_sessions_version = '0005_legacy_wallet_backfill'; },
    row => { row.identity_profiles_version = null; },
    row => { row.identity_import_audit_table_count = 0; },
    row => { row.identity_import_audit_index_count = 0; },
    row => { row.wallet_security_version = null; },
    row => { row.encrypted_payout_table_count = 0; },
    row => { row.razorpay_order_idempotency_index_count = 0; },
    row => { row.razorpay_order_idempotency_columns_count = 1; },
    row => { row.razorpay_claim_columns_count = 1; },
    row => { row.live_booking_release_version = null; },
    row => { row.numeric_public_reference_ids_version = null; },
    row => { row.public_withdrawal_id_index_count = 0; },
    row => { row.admin_payment_id_index_count = 0; },
    row => { row.customer_payment_id_index_count = 0; },
    row => { row.bonus_credit_wallet_version = null; },
    row => { row.wallet_bonus_credit_columns_count = 1; },
    row => { row.wallet_ledger_bonus_credit_columns_count = 3; },
    row => { row.wallet_offer_bonus_credit_columns_count = 0; },
    row => { row.offer_redemption_bonus_credit_columns_count = 0; },
    row => { row.live_session_bonus_credit_columns_count = 0; },
    row => { row.live_booking_bonus_credit_columns_count = 0; },
    row => { row.live_session_bonus_reserve_trigger_count = 0; },
    row => { row.live_earning_bonus_credit_trigger_count = 0; },
    row => { row.wallet_ledger_bonus_credit_apply_trigger_count = 0; },
    row => { row.wallet_ledger_bonus_credit_validate_trigger_count = 0; },
  ]) {
    const row = readyRow();
    mutate(row);
    const result = await inspectBackendSchema(dbWith(row));
    assert.equal(result.ready, false);
    assert.equal(result.checks.allRequiredMigrations, false);
  }
});

test('missing D1 binding and D1 query errors fail readiness closed without throwing', async () => {
  const missing = await inspectBackendSchema(null);
  assert.equal(missing.d1Binding, false);
  assert.equal(missing.ready, false);

  const failed = await inspectBackendSchema(dbWith(null, { fail: true }));
  assert.equal(failed.d1Binding, true);
  assert.equal(failed.querySucceeded, false);
  assert.equal(failed.ready, false);
  assert.equal(Object.values(failed.schemaMigrations).every(value => value === false), true);
});

test('GET /api/backend/readiness returns the live D1 result and keeps inactive feature gates off', async () => {
  const handlers = new Map();
  const app = { get(path, handler) { handlers.set('GET ' + path, handler); } };
  const response = responseRecorder();
  const db = dbWith(readyRow());

  registerBackendReadinessRoute({
    app,
    db,
    firebaseConnectivityProbe: async () => true,
    getRuntimeState: () => ({
      walletReadRoutesRegistered: false,
      walletRechargeRoutesRegistered: false,
      walletOfferRoutesRegistered: false,
      walletReadRouteGateOpen: false,
      liveSessionRoutesRegistered: false,
      liveSessionRoutesOpen: false,
      walletPayoutEncryptionConfigured: false,
      walletRechargeMode: 'disabled',
      razorpayPolicy: { enabled: false, mode: 'disabled', reason: 'disabled' }
    })
  });

  await handlers.get('GET /api/backend/readiness')({}, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers['Cache-Control'], 'no-store');
  assert.equal(response.body.ok, true);
  assert.equal(response.body.ready, true);
  assert.equal(response.body.firebaseConnected, true);
  assert.equal(response.body.walletReadRoutesEnabled, false);
  assert.equal(response.body.walletRechargeRoutesEnabled, false);
  assert.equal(response.body.liveCallChatRoutesEnabled, false);
  assert.equal(response.body.walletPayoutEncryptionConfigured, false);
  assert.equal(response.body.walletPayoutEncryptionReady, false);
  assert.equal(response.body.productionTrafficEnabled, false);
  assert.equal(response.body.productionFinancialTrafficRoutingEnabled, false);
  assert.equal(Object.values(response.body.migrationStatus).every(value => value === true), true);
});

test('GET /api/backend/readiness derives selected Production financial routing from all live gates', async () => {
  const handlers = new Map();
  const app = { get(path, handler) { handlers.set('GET ' + path, handler); } };
  const response = responseRecorder();

  registerBackendReadinessRoute({
    app,
    db: dbWith(readyRow()),
    firebaseConnectivityProbe: async () => true,
    getRuntimeState: () => ({
      environment: 'production',
      backendActive: true,
      walletReadRoutesRegistered: true,
      walletRechargeRoutesRegistered: true,
      walletOfferRoutesRegistered: true,
      walletReadRouteGateOpen: true,
      liveSessionRoutesRegistered: true,
      liveSessionRoutesOpen: true,
      walletPayoutEncryptionConfigured: true,
      walletRechargeMode: 'live',
      identityProfileD1AuthorizationOpen: true,
      razorpayPolicy: { enabled: true, mode: 'live', reason: 'production_live_mode_explicitly_enabled' },
      razorpayKeyId: 'rzp_live_key',
      razorpayKeySecret: 'configured',
      razorpayWebhookSecret: 'configured'
    }),
    getIdentityGate: async () => ({ enabled: true, ready: true, reason: 'fresh_start_approved' }),
    getRazorpayVerification: async () => ({ connected: true, connectionVerified: true, checkedAt: '2026-11-04T10:00:00.000Z' })
  });

  await handlers.get('GET /api/backend/readiness')({}, response);

  assert.equal(response.body.productionTrafficEnabled, false);
  assert.equal(response.body.productionFinancialTrafficRoutingEnabled, true);
  assert.equal(response.body.walletReadRoutesEnabled, true);
  assert.equal(response.body.walletRechargeRoutesEnabled, true);
  assert.equal(response.body.walletOfferRoutesEnabled, true);
  assert.equal(response.body.liveCallChatRoutesEnabled, true);
  assert.equal(response.body.walletPayoutEncryptionConfigured, true);
  assert.equal(response.body.walletPayoutEncryptionReady, true);
  assert.equal(response.body.checks.numericPublicReferenceIdsSchema, true);
});

test('missing optional Live query indexes do not block core D1 readiness but keep Live routes closed', async () => {
  const handlers = new Map();
  const app = { get(path, handler) { handlers.set('GET ' + path, handler); } };
  const response = responseRecorder();
  const row = readyRow();
  row.live_session_query_indexes_version = null;
  row.live_session_query_indexes_count = 0;

  registerBackendReadinessRoute({
    app,
    db: dbWith(row),
    firebaseConnectivityProbe: async () => true,
    getRuntimeState: () => ({
      environment: 'production',
      backendActive: true,
      walletReadRoutesRegistered: true,
      walletRechargeRoutesRegistered: true,
      walletOfferRoutesRegistered: true,
      walletReadRouteGateOpen: true,
      liveSessionRoutesRegistered: true,
      liveSessionRoutesOpen: true,
      walletPayoutEncryptionConfigured: true,
      walletRechargeMode: 'live',
      identityProfileD1AuthorizationOpen: true,
      razorpayPolicy: { enabled: true, mode: 'live', reason: 'production_live_mode_explicitly_enabled' },
      razorpayKeyId: 'rzp_live_key',
      razorpayKeySecret: 'configured',
      razorpayWebhookSecret: 'configured'
    }),
    getIdentityGate: async () => ({ enabled: true, ready: true, reason: 'fresh_start_approved' }),
    getRazorpayVerification: async () => ({ connected: true, connectionVerified: true })
  });

  await handlers.get('GET /api/backend/readiness')({}, response);

  assert.equal(response.body.ready, true, 'the required 0002-0013 foundation remains ready');
  assert.equal(response.body.schemaMigrations['0014_live_session_query_indexes'], false);
  assert.equal(response.body.checks.liveSessionQueryIndexes, false);
  assert.equal(response.body.liveCallChatRoutesEnabled, false, 'Live routes must remain closed while their explicitly forced 0014 query indexes are unapplied');
});

test('GET /api/backend/readiness returns 503 for incomplete Production schema', async () => {
  const handlers = new Map();
  const app = { get(path, handler) { handlers.set('GET ' + path, handler); } };
  const response = responseRecorder();
  const row = readyRow();
  row.notification_inbox_table_count = 0;

  registerBackendReadinessRoute({ app, db: dbWith(row) });
  await handlers.get('GET /api/backend/readiness')({}, response);

  assert.equal(response.statusCode, 503);
  assert.equal(response.body.ok, false);
  assert.equal(response.body.ready, false);
  assert.equal(response.body.schemaMigrations['0003_notification_inbox'], false);
});


test('GET /api/backend/readiness reflects the actual Razorpay provider probe result', async () => {
  const handlers = new Map();
  const app = { get(path, handler) { handlers.set('GET ' + path, handler); } };
  const response = responseRecorder();

  registerBackendReadinessRoute({
    app,
    db: dbWith(readyRow()),
    getRuntimeState: () => ({
      razorpayPolicy: { enabled: true, mode: 'live', reason: 'production_live_mode_explicitly_enabled' },
      razorpayKeyId: 'rzp_live_key',
      razorpayKeySecret: 'configured',
      razorpayWebhookSecret: 'configured'
    }),
    getRazorpayVerification: async () => ({
      connected: true,
      connectionVerified: true,
      checkedAt: '2026-11-04T10:00:00.000Z',
      ordersVisible: 2
    })
  });

  await handlers.get('GET /api/backend/readiness')({}, response);

  assert.equal(response.body.razorpayConnected, true);
  assert.equal(response.body.razorpayProviderConnectionVerified, true);
  assert.equal(response.body.razorpayProviderConnectionCheckedAt, '2026-11-04T10:00:00.000Z');
});

test('GET /api/backend/readiness fails closed when the Razorpay provider probe throws', async () => {
  const handlers = new Map();
  const app = { get(path, handler) { handlers.set('GET ' + path, handler); } };
  const response = responseRecorder();

  registerBackendReadinessRoute({
    app,
    db: dbWith(readyRow()),
    getRazorpayVerification: async () => { throw new Error('private error'); }
  });

  await handlers.get('GET /api/backend/readiness')({}, response);

  assert.equal(response.body.razorpayConnected, false);
  assert.equal(response.body.razorpayProviderConnectionVerified, false);
  assert.equal(response.body.razorpayProviderConnectionCheckedAt, null);
});

test('GET /api/backend/readiness reports payout withdrawals unavailable when the encryption key is missing or malformed', async () => {
  const handlers = new Map();
  const app = { get(path, handler) { handlers.set('GET ' + path, handler); } };
  const response = responseRecorder();

  registerBackendReadinessRoute({
    app,
    db: dbWith(readyRow()),
    firebaseConnectivityProbe: async () => true,
    getRuntimeState: () => ({
      environment: 'production',
      backendActive: true,
      walletReadRoutesRegistered: true,
      walletRechargeRoutesRegistered: true,
      walletOfferRoutesRegistered: true,
      walletReadRouteGateOpen: true,
      liveSessionRoutesRegistered: true,
      liveSessionRoutesOpen: true,
      walletPayoutEncryptionConfigured: false,
      walletRechargeMode: 'live',
      razorpayPolicy: { enabled: true, mode: 'live' },
      razorpayKeyId: 'rzp_live_key',
      razorpayKeySecret: 'configured',
      razorpayWebhookSecret: 'configured'
    }),
    getIdentityGate: async () => ({ enabled: true, ready: true, reason: 'fresh_start_approved' }),
    getRazorpayVerification: async () => ({ connected: true, connectionVerified: true })
  });

  await handlers.get('GET /api/backend/readiness')({}, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.checks.walletSecuritySchema, true);
  assert.equal(response.body.walletPayoutEncryptionConfigured, false);
  assert.equal(response.body.walletPayoutEncryptionReady, false);
  assert.equal(response.body.liveCallChatRoutesEnabled, true);
});


test('Production Worker validates the payout encryption secret from the Cloudflare runtime env', async () => {
  const workerIndex = await readFile(new URL('../src/index.mjs', import.meta.url), 'utf8');
  assert.ok(workerIndex.includes('const walletPayoutEncryptionConfigured = validatePayoutEncryptionConfiguration({'));
  assert.ok(workerIndex.includes("payoutEncryptionKey: String(env.SMV_WALLET_PAYOUT_ENCRYPTION_KEY || '')"));
  assert.ok(workerIndex.includes("payoutKeyVersion: String(env.SMV_WALLET_PAYOUT_KEY_VERSION || 'v1')"));
  assert.ok(workerIndex.includes('walletPayoutEncryptionConfigured,'));
});
