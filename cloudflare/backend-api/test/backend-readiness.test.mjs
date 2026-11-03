import test from 'node:test';
import assert from 'node:assert/strict';
import {
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
    wallet_security_version: '0009_wallet_razorpay_payout_encryption',
    razorpay_claim_columns_count: 2,
    live_booking_release_version: '0011_live_booking_release_claim',
    live_booking_release_trigger_count: 1
  };
}

function dbWith(row, { fail = false } = {}) {
  const calls = [];
  return {
    calls,
    prepare(sql) {
      calls.push(sql);
      return {
        async first() {
          if (fail) throw new Error('D1 read failed');
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

test('Production D1 schema readiness recognizes the current 0002-0011 migration contracts', async () => {
  const db = dbWith(readyRow());
  const result = await inspectBackendSchema(db);

  assert.equal(result.d1Binding, true);
  assert.equal(result.querySucceeded, true);
  assert.equal(result.ready, true);
  assert.equal(result.schemaVersion, '0002_shared_domain_repository');
  assert.deepEqual(Object.values(result.schemaMigrations), Array(10).fill(true));
  assert.equal(db.calls.length, 1);
  assert.match(db.calls[0], /smv_domain_schema_meta/);
  assert.doesNotMatch(db.calls[0], /smv_wallet_schema_meta|0001_wallet_live_domain/);
});

test('schema and migration status are read from D1 on every request, never a cached boolean', async () => {
  const row = readyRow();
  const db = dbWith(row);

  assert.equal((await inspectBackendSchema(db)).ready, true);
  row.live_booking_release_trigger_count = 0;
  const next = await inspectBackendSchema(db);

  assert.equal(next.ready, false);
  assert.equal(next.schemaMigrations['0011_live_booking_release_claim'], false);
  assert.equal(db.calls.length, 2);
});

test('any missing or stale required marker or schema object fails readiness closed', async () => {
  for (const mutate of [
    row => { row.shared_domain_version = '0001_wallet_live_domain'; },
    row => { row.wallet_recharges_version = null; },
    row => { row.live_sessions_version = '0005_legacy_wallet_backfill'; },
    row => { row.identity_profiles_version = null; },
    row => { row.wallet_security_version = null; },
    row => { row.razorpay_claim_columns_count = 1; },
    row => { row.live_booking_release_version = null; }
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
  assert.equal(Object.values(response.body.migrationStatus).every(value => value === true), true);
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
