'use strict';

import { isProductionFinancialTrafficRoutingEnabled } from './production-financial-traffic-readiness.mjs';

const REQUIRED_SCHEMA_QUERY = [
  "WITH schema_objects AS MATERIALIZED (",
  "  SELECT type, name FROM sqlite_master",
  "  WHERE name IN (",
  "    'smv_domain_notification_inbox','idx_smv_domain_notification_inbox_state',",
  "    'smv_domain_wallet_offer_redemption_usage','smv_domain_offer_redemptions',",
  "    'smv_domain_identity_users','smv_domain_identity_migration_meta',",
  "    'smv_domain_identity_import_audit','idx_smv_domain_identity_import_audit_project_collection',",
  "    'smv_domain_withdrawal_payouts_encrypted','idx_smv_domain_razorpay_orders_idempotency',",
  "    'smv_domain_withdrawals_public_withdrawal_id_uq','smv_domain_withdrawals_admin_payment_id_uq',",
  "    'smv_domain_wallet_recharges_customer_payment_id_uq','smv_domain_offer_redemption_validate',",
  "    'smv_domain_offer_redemption_apply','smv_domain_live_booking_release_pending_validate',",
  "    'idx_smv_domain_sessions_customer_recent','idx_smv_domain_sessions_astrologer_recent',",
  "    'idx_smv_domain_sessions_customer_status_updated','idx_smv_domain_sessions_astrologer_status_updated',",
  "    'idx_smv_domain_sessions_customer_appointment','idx_smv_domain_sessions_astrologer_appointment'",
  "  )",
  "),",
  "schema_versions AS MATERIALIZED (",
  "  SELECT schema_key, schema_version FROM smv_domain_schema_meta",
  "  WHERE schema_key IN (",
  "    'shared-domain','wallet-recharges','live-sessions','identity-profiles',",
  "    'wallet-security','live-booking-release-guard','numeric-public-reference-ids',",
  "    'live-session-query-indexes'",
  "  )",
  "),",
  "object_checks AS (",
  "  SELECT",
  "    MAX(CASE WHEN type='table' AND name='smv_domain_notification_inbox' THEN 1 ELSE 0 END) AS notification_inbox_table_count,",
  "    MAX(CASE WHEN type='index' AND name='idx_smv_domain_notification_inbox_state' THEN 1 ELSE 0 END) AS notification_inbox_index_count,",
  "    MAX(CASE WHEN type='table' AND name='smv_domain_wallet_offer_redemption_usage' THEN 1 ELSE 0 END) AS offer_redemption_usage_table_count,",
  "    MAX(CASE WHEN type='table' AND name='smv_domain_offer_redemptions' THEN 1 ELSE 0 END) AS offer_redemptions_table_count,",
  "    MAX(CASE WHEN type='trigger' AND name='smv_domain_offer_redemption_validate' THEN 1 ELSE 0 END) AS offer_redemption_validate_trigger_count,",
  "    MAX(CASE WHEN type='trigger' AND name='smv_domain_offer_redemption_apply' THEN 1 ELSE 0 END) AS offer_redemption_apply_trigger_count,",
  "    MAX(CASE WHEN type='table' AND name='smv_domain_identity_users' THEN 1 ELSE 0 END) AS identity_users_table_count,",
  "    MAX(CASE WHEN type='table' AND name='smv_domain_identity_migration_meta' THEN 1 ELSE 0 END) AS identity_migration_meta_table_count,",
  "    MAX(CASE WHEN type='table' AND name='smv_domain_identity_import_audit' THEN 1 ELSE 0 END) AS identity_import_audit_table_count,",
  "    MAX(CASE WHEN type='index' AND name='idx_smv_domain_identity_import_audit_project_collection' THEN 1 ELSE 0 END) AS identity_import_audit_index_count,",
  "    MAX(CASE WHEN type='table' AND name='smv_domain_withdrawal_payouts_encrypted' THEN 1 ELSE 0 END) AS encrypted_payout_table_count,",
  "    MAX(CASE WHEN type='index' AND name='idx_smv_domain_razorpay_orders_idempotency' THEN 1 ELSE 0 END) AS razorpay_order_idempotency_index_count,",
  "    MAX(CASE WHEN type='trigger' AND name='smv_domain_live_booking_release_pending_validate' THEN 1 ELSE 0 END) AS live_booking_release_trigger_count,",
  "    MAX(CASE WHEN type='index' AND name='smv_domain_withdrawals_public_withdrawal_id_uq' THEN 1 ELSE 0 END) AS public_withdrawal_id_index_count,",
  "    MAX(CASE WHEN type='index' AND name='smv_domain_withdrawals_admin_payment_id_uq' THEN 1 ELSE 0 END) AS admin_payment_id_index_count,",
  "    MAX(CASE WHEN type='index' AND name='smv_domain_wallet_recharges_customer_payment_id_uq' THEN 1 ELSE 0 END) AS customer_payment_id_index_count,",
  "    SUM(CASE WHEN type='index' AND name IN (",
  "      'idx_smv_domain_sessions_customer_recent','idx_smv_domain_sessions_astrologer_recent',",
  "      'idx_smv_domain_sessions_customer_status_updated','idx_smv_domain_sessions_astrologer_status_updated',",
  "      'idx_smv_domain_sessions_customer_appointment','idx_smv_domain_sessions_astrologer_appointment'",
  "    ) THEN 1 ELSE 0 END) AS live_session_query_indexes_count",
  "  FROM schema_objects",
  "),",
  "version_checks AS (",
  "  SELECT",
  "    MAX(CASE WHEN schema_key='shared-domain' THEN schema_version END) AS shared_domain_version,",
  "    MAX(CASE WHEN schema_key='wallet-recharges' THEN schema_version END) AS wallet_recharges_version,",
  "    MAX(CASE WHEN schema_key='live-sessions' THEN schema_version END) AS live_sessions_version,",
  "    MAX(CASE WHEN schema_key='identity-profiles' THEN schema_version END) AS identity_profiles_version,",
  "    MAX(CASE WHEN schema_key='wallet-security' THEN schema_version END) AS wallet_security_version,",
  "    MAX(CASE WHEN schema_key='live-booking-release-guard' THEN schema_version END) AS live_booking_release_version,",
  "    MAX(CASE WHEN schema_key='numeric-public-reference-ids' THEN schema_version END) AS numeric_public_reference_ids_version,",
  "    MAX(CASE WHEN schema_key='live-session-query-indexes' THEN schema_version END) AS live_session_query_indexes_version",
  "  FROM schema_versions",
  ")",
  "SELECT version_checks.*, object_checks.*,",
  "  (SELECT COUNT(*) FROM pragma_table_info('smv_domain_razorpay_orders') WHERE name IN ('wallet_recharge_id','idempotency_key')) AS razorpay_order_idempotency_columns_count,",
  "  (SELECT COUNT(*) FROM pragma_table_info('smv_domain_razorpay_webhook_events') WHERE name IN ('claim_token','lease_until_ms')) AS razorpay_claim_columns_count",
  "FROM version_checks CROSS JOIN object_checks"
].join('\n');

const BONUS_CREDIT_SCHEMA_QUERY = [
  "WITH schema_objects AS MATERIALIZED (",
  "  SELECT type, name FROM sqlite_master",
  "  WHERE name IN (",
  "    'smv_domain_live_session_reserve_validate','smv_domain_live_earning_validate',",
  "    'smv_domain_wallet_ledger_apply','smv_domain_wallet_ledger_validate'",
  "  )",
  "),",
  "table_columns AS MATERIALIZED (",
  "  SELECT 'smv_domain_wallets' AS table_name, name AS column_name FROM pragma_table_info('smv_domain_wallets')",
  "  UNION ALL SELECT 'smv_domain_wallet_ledger', name FROM pragma_table_info('smv_domain_wallet_ledger')",
  "  UNION ALL SELECT 'smv_domain_wallet_offers', name FROM pragma_table_info('smv_domain_wallet_offers')",
  "  UNION ALL SELECT 'smv_domain_offer_redemptions', name FROM pragma_table_info('smv_domain_offer_redemptions')",
  "  UNION ALL SELECT 'smv_domain_live_sessions', name FROM pragma_table_info('smv_domain_live_sessions')",
  "  UNION ALL SELECT 'smv_domain_live_bookings', name FROM pragma_table_info('smv_domain_live_bookings')",
  "),",
  "object_checks AS (",
  "  SELECT",
  "    MAX(CASE WHEN type='trigger' AND name='smv_domain_live_session_reserve_validate' THEN 1 ELSE 0 END) AS live_session_bonus_reserve_trigger_count,",
  "    MAX(CASE WHEN type='trigger' AND name='smv_domain_live_earning_validate' THEN 1 ELSE 0 END) AS live_earning_bonus_credit_trigger_count,",
  "    MAX(CASE WHEN type='trigger' AND name='smv_domain_wallet_ledger_apply' THEN 1 ELSE 0 END) AS wallet_ledger_bonus_credit_apply_trigger_count,",
  "    MAX(CASE WHEN type='trigger' AND name='smv_domain_wallet_ledger_validate' THEN 1 ELSE 0 END) AS wallet_ledger_bonus_credit_validate_trigger_count",
  "  FROM schema_objects",
  "),",
  "column_checks AS (",
  "  SELECT",
  "    SUM(CASE WHEN table_name='smv_domain_wallets' AND column_name IN ('bonus_credit_balance_paise','reserved_bonus_credit_paise') THEN 1 ELSE 0 END) AS wallet_bonus_credit_columns_count,",
  "    SUM(CASE WHEN table_name='smv_domain_wallet_ledger' AND column_name IN ('bonus_credit_delta_paise','reserved_bonus_credit_delta_paise','bonus_credit_balance_after_paise','reserved_bonus_credit_balance_after_paise') THEN 1 ELSE 0 END) AS wallet_ledger_bonus_credit_columns_count,",
  "    SUM(CASE WHEN table_name='smv_domain_wallet_offers' AND column_name='bonus_credit_paise' THEN 1 ELSE 0 END) AS wallet_offer_bonus_credit_columns_count,",
  "    SUM(CASE WHEN table_name='smv_domain_offer_redemptions' AND column_name='bonus_credit_paise' THEN 1 ELSE 0 END) AS offer_redemption_bonus_credit_columns_count,",
  "    SUM(CASE WHEN table_name='smv_domain_live_sessions' AND column_name='reserved_bonus_credit_paise' THEN 1 ELSE 0 END) AS live_session_bonus_credit_columns_count,",
  "    SUM(CASE WHEN table_name='smv_domain_live_bookings' AND column_name='reserved_bonus_credit_paise' THEN 1 ELSE 0 END) AS live_booking_bonus_credit_columns_count",
  "  FROM table_columns",
  "),",
  "bonus_credit_version AS (",
  "  SELECT schema_version AS bonus_credit_wallet_version",
  "  FROM smv_domain_schema_meta WHERE schema_key='bonus-credit-wallet' LIMIT 1",
  ")",
  "SELECT bonus_credit_version.bonus_credit_wallet_version, object_checks.*, column_checks.*",
  "FROM object_checks CROSS JOIN column_checks CROSS JOIN bonus_credit_version"
].join('\\n');

const MIGRATION_KEYS = [
  '0002_shared_domain_repository',
  '0003_notification_inbox',
  '0004_wallet_offer_redemptions',
  '0005_legacy_wallet_backfill',
  '0006_d1_live_wallet_settlement',
  '0007_identity_profile_domain',
  '0008_identity_profile_backfill_audit',
  '0009_wallet_razorpay_payout_encryption',
  '0010_razorpay_webhook_claim_leases',
  '0011_live_booking_release_claim',
  '0012_numeric_public_reference_ids',
  '0013_bonus_credit_wallet',
  '0014_live_session_query_indexes'
];

function countIs(value, expected) {
  return Number(value || 0) === expected;
}

function unavailableSchema(d1Binding, querySucceeded = false) {
  const schemaMigrations = Object.fromEntries(MIGRATION_KEYS.map(key => [key, false]));
  return {
    d1Binding,
    querySucceeded,
    ready: false,
    schemaVersion: null,
    sharedDomainSchemaVersion: null,
    schemaMigrations,
    migrationStatus: schemaMigrations,
    checks: {
      sharedDomainSchema: false,
      walletSchema: false,
      walletRechargeSchema: false,
      liveSessionSchema: false,
      identityProfileSchema: false,
      walletSecuritySchema: false,
      razorpayWebhookClaimSchema: false,
      liveBookingReleaseSchema: false,
      numericPublicReferenceIdsSchema: false,
      bonusCreditWalletSchema: false,
      liveSessionQueryIndexes: false,
      bonusCreditSchemaQuerySucceeded: false,
      allRequiredMigrations: false
    }
  };
}

/**
 * Inspect live D1 schema on every call. Nothing is cached between requests;
 * failures and partially-applied migrations always fail closed.
 */
export async function inspectBackendSchema(db) {
  if (!db || typeof db.prepare !== 'function') return unavailableSchema(false);

  try {
    const row = await db.prepare(REQUIRED_SCHEMA_QUERY).first();
    if (!row || typeof row !== 'object') return unavailableSchema(true, true);

    let bonusCreditRow = {};
    let bonusCreditSchemaQuerySucceeded = false;
    try {
      const candidate = await db.prepare(BONUS_CREDIT_SCHEMA_QUERY).first();
      if (candidate && typeof candidate === 'object') {
        bonusCreditRow = candidate;
        bonusCreditSchemaQuerySucceeded = true;
      }
    } catch {
      // 0013 may not be applied yet. Keep 0002-0012 results intact and fail
      // only the Bonus Credit-dependent routes until its schema is available.
    }

    const schemaMigrations = {
      '0002_shared_domain_repository':
        row.shared_domain_version === '0002_shared_domain_repository',
      '0003_notification_inbox':
        countIs(row.notification_inbox_table_count, 1) &&
        countIs(row.notification_inbox_index_count, 1),
      '0004_wallet_offer_redemptions':
        countIs(row.offer_redemption_usage_table_count, 1) &&
        countIs(row.offer_redemptions_table_count, 1) &&
        countIs(row.offer_redemption_validate_trigger_count, 1) &&
        countIs(row.offer_redemption_apply_trigger_count, 1),
      '0005_legacy_wallet_backfill':
        row.wallet_recharges_version === '0005_legacy_wallet_backfill',
      '0006_d1_live_wallet_settlement':
        row.live_sessions_version === '0006_d1_live_wallet_settlement',
      '0007_identity_profile_domain':
        countIs(row.identity_users_table_count, 1) &&
        countIs(row.identity_migration_meta_table_count, 1),
      '0008_identity_profile_backfill_audit':
        row.identity_profiles_version === '0008_identity_profile_backfill_audit' &&
        countIs(row.identity_import_audit_table_count, 1) &&
        countIs(row.identity_import_audit_index_count, 1),
      '0009_wallet_razorpay_payout_encryption':
        row.wallet_security_version === '0009_wallet_razorpay_payout_encryption' &&
        countIs(row.encrypted_payout_table_count, 1) &&
        countIs(row.razorpay_order_idempotency_index_count, 1) &&
        countIs(row.razorpay_order_idempotency_columns_count, 2),
      '0010_razorpay_webhook_claim_leases':
        countIs(row.razorpay_claim_columns_count, 2),
      '0011_live_booking_release_claim':
        row.live_booking_release_version === '0011_live_booking_release_claim' &&
        countIs(row.live_booking_release_trigger_count, 1),
      '0012_numeric_public_reference_ids':
        row.numeric_public_reference_ids_version === '0012_numeric_public_reference_ids' &&
        countIs(row.public_withdrawal_id_index_count, 1) &&
        countIs(row.admin_payment_id_index_count, 1) &&
        countIs(row.customer_payment_id_index_count, 1),
      '0013_bonus_credit_wallet':
        bonusCreditRow.bonus_credit_wallet_version === '0013_bonus_credit_wallet' &&
        countIs(bonusCreditRow.wallet_bonus_credit_columns_count, 2) &&
        countIs(bonusCreditRow.wallet_ledger_bonus_credit_columns_count, 4) &&
        countIs(bonusCreditRow.wallet_offer_bonus_credit_columns_count, 1) &&
        countIs(bonusCreditRow.offer_redemption_bonus_credit_columns_count, 1) &&
        countIs(bonusCreditRow.live_session_bonus_credit_columns_count, 1) &&
        countIs(bonusCreditRow.live_booking_bonus_credit_columns_count, 1) &&
        countIs(bonusCreditRow.live_session_bonus_reserve_trigger_count, 1) &&
        countIs(bonusCreditRow.live_earning_bonus_credit_trigger_count, 1) &&
        countIs(bonusCreditRow.wallet_ledger_bonus_credit_apply_trigger_count, 1) &&
        countIs(bonusCreditRow.wallet_ledger_bonus_credit_validate_trigger_count, 1),
      '0014_live_session_query_indexes':
        row.live_session_query_indexes_version === '0014_live_session_query_indexes' &&
        countIs(row.live_session_query_indexes_count, 6)
    };
    // 0014 is an optional Live query-performance gate. It must not block
    // unrelated Wallet/Recharge financial readiness while that additive index
    // migration is pending. Live routes check it independently below.
    const allRequiredMigrations = MIGRATION_KEYS
      .filter(key => key !== '0014_live_session_query_indexes')
      .every(key => schemaMigrations[key] === true);
    const checks = {
      sharedDomainSchema: schemaMigrations['0002_shared_domain_repository'],
      walletSchema: schemaMigrations['0002_shared_domain_repository'] &&
        schemaMigrations['0005_legacy_wallet_backfill'] &&
        schemaMigrations['0009_wallet_razorpay_payout_encryption'] &&
        schemaMigrations['0013_bonus_credit_wallet'],
      walletRechargeSchema: schemaMigrations['0005_legacy_wallet_backfill'] &&
        schemaMigrations['0013_bonus_credit_wallet'],
      liveSessionSchema: schemaMigrations['0006_d1_live_wallet_settlement'] &&
        schemaMigrations['0013_bonus_credit_wallet'],
      identityProfileSchema: schemaMigrations['0007_identity_profile_domain'] &&
        schemaMigrations['0008_identity_profile_backfill_audit'],
      walletSecuritySchema: schemaMigrations['0009_wallet_razorpay_payout_encryption'],
      razorpayWebhookClaimSchema: schemaMigrations['0010_razorpay_webhook_claim_leases'],
      liveBookingReleaseSchema: schemaMigrations['0011_live_booking_release_claim'],
      numericPublicReferenceIdsSchema: schemaMigrations['0012_numeric_public_reference_ids'],
      bonusCreditWalletSchema: schemaMigrations['0013_bonus_credit_wallet'],
      liveSessionQueryIndexes: schemaMigrations['0014_live_session_query_indexes'],
      bonusCreditSchemaQuerySucceeded,
      allRequiredMigrations
    };

    return {
      d1Binding: true,
      querySucceeded: true,
      bonusCreditSchemaQuerySucceeded,
      ready: allRequiredMigrations,
      schemaVersion: row.shared_domain_version || null,
      sharedDomainSchemaVersion: row.shared_domain_version || null,
      schemaMigrations,
      migrationStatus: schemaMigrations,
      checks
    };
  } catch {
    return unavailableSchema(true);
  }
}

/**
 * Reuse the expensive schema contract probe for a short, bounded period and
 * collapse concurrent requests within one Worker isolate into a single D1 read.
 * The pure inspectBackendSchema() remains uncached for deterministic unit tests.
 */
export function createBackendSchemaInspector({
  db,
  ttlMs = 30_000,
  errorTtlMs = 30_000,
  now = Date.now
} = {}) {
  let cached = null;
  let expiresAt = 0;
  let inFlight = null;

  return async function inspectCachedBackendSchema() {
    const current = Number(now());
    if (cached && current < expiresAt) return cached;
    if (inFlight) return inFlight;

    const pending = inspectBackendSchema(db).then(result => {
      cached = result;
      const ttl = result?.querySucceeded === true ? ttlMs : errorTtlMs;
      expiresAt = Number(now()) + Math.max(0, Number(ttl) || 0);
      return result;
    }).finally(() => {
      if (inFlight === pending) inFlight = null;
    });
    inFlight = pending;
    return pending;
  };
}

export function registerBackendReadinessRoute({
  app,
  db,
  inspectSchema = null,
  firebaseConnectivityProbe = async () => false,
  getRuntimeState = () => ({}),
  getIdentityGate = async () => ({ enabled: false, ready: false, reason: 'disabled' }),
  getRazorpayVerification = async () => ({ connected: false, connectionVerified: false, checkedAt: null })
}) {
  app.get('/api/backend/readiness', async (_req, res) => {
    const schema = await (typeof inspectSchema === 'function' ? inspectSchema() : inspectBackendSchema(db));
    let firebaseConnected = false;
    try {
      firebaseConnected = (await firebaseConnectivityProbe()) === true;
    } catch {
      firebaseConnected = false;
    }

    let runtime = {};
    try {
      runtime = getRuntimeState() || {};
    } catch {
      runtime = {};
    }

    let identityGate = { enabled: false, ready: false, reason: 'identity_runtime_unavailable' };
    try {
      identityGate = await getIdentityGate();
    } catch {
      // Identity/Profile authorization is a separate opt-in gate; fail it closed.
    }

    const razorpayPolicy = runtime.razorpayPolicy || {};
    let razorpayVerification = { connected: false, connectionVerified: false, checkedAt: null };
    try {
      const verification = await getRazorpayVerification();
      if (verification && typeof verification === 'object') razorpayVerification = verification;
    } catch {
      // Provider connectivity is an independent live check; failures remain unverified.
    }
    const walletReadRoutesEnabled = runtime.walletReadRoutesRegistered === true &&
      runtime.walletReadRouteGateOpen === true && schema.checks.walletSchema;
    const walletRechargeRoutesEnabled = runtime.walletRechargeRoutesRegistered === true &&
      runtime.walletReadRouteGateOpen === true && schema.checks.walletRechargeSchema;
    const walletOfferRoutesEnabled = runtime.walletOfferRoutesRegistered === true &&
      runtime.walletReadRouteGateOpen === true && schema.checks.walletRechargeSchema;
    const liveCallChatRoutesEnabled = runtime.liveSessionRoutesRegistered === true &&
      runtime.liveSessionRoutesOpen === true && schema.checks.liveSessionSchema &&
      schema.checks.walletSecuritySchema;
    const razorpayCredentialsConfigured = razorpayPolicy.enabled === true &&
      !!runtime.razorpayKeyId && !!runtime.razorpayKeySecret && !!runtime.razorpayWebhookSecret;
    const walletPayoutEncryptionReady = runtime.walletPayoutEncryptionConfigured === true &&
      schema.checks.walletSecuritySchema === true;
    const identityProfileD1AuthorizationEnabled = runtime.identityProfileD1AuthorizationOpen === true;
    const identityProfileD1AuthorizationReady = identityGate.ready === true;
    const productionFinancialTrafficRoutingEnabled = isProductionFinancialTrafficRoutingEnabled({
      environment: runtime.environment,
      backendActive: runtime.backendActive === true,
      schemaReady: schema.ready,
      firebaseConnected,
      walletReadRoutesEnabled,
      walletRechargeRoutesEnabled,
      walletRechargeMode: String(runtime.walletRechargeMode || 'disabled'),
      walletOfferRoutesEnabled,
      liveCallChatRoutesEnabled,
      identityProfileD1AuthorizationEnabled,
      identityProfileD1AuthorizationReady,
      razorpayMode: String(razorpayPolicy.mode || 'disabled'),
      razorpayCredentialsConfigured,
      razorpayProviderConnectionVerified: razorpayVerification.connectionVerified === true
    });

    const body = {
      ok: schema.ready,
      ready: schema.ready,
      schemaVersion: schema.schemaVersion,
      sharedDomainSchemaVersion: schema.sharedDomainSchemaVersion,
      migrationStatus: schema.migrationStatus,
      schemaMigrations: schema.schemaMigrations,
      checks: {
        expressRuntime: true,
        d1Binding: schema.d1Binding,
        schemaQuerySucceeded: schema.querySucceeded,
        walletSchema: schema.checks.walletSchema,
        sharedDomainSchema: schema.checks.sharedDomainSchema,
        walletRechargeSchema: schema.checks.walletRechargeSchema,
        liveSessionSchema: schema.checks.liveSessionSchema,
        identityProfileSchema: schema.checks.identityProfileSchema,
        walletSecuritySchema: schema.checks.walletSecuritySchema,
        razorpayWebhookClaimSchema: schema.checks.razorpayWebhookClaimSchema,
        liveBookingReleaseSchema: schema.checks.liveBookingReleaseSchema,
        numericPublicReferenceIdsSchema: schema.checks.numericPublicReferenceIdsSchema,
        bonusCreditWalletSchema: schema.checks.bonusCreditWalletSchema,
        liveSessionQueryIndexes: schema.checks.liveSessionQueryIndexes,
        bonusCreditSchemaQuerySucceeded: schema.bonusCreditSchemaQuerySucceeded,
        allRequiredMigrations: schema.checks.allRequiredMigrations
      },
      firebaseConnected,
      firestoreConnected: firebaseConnected,
      razorpayConnected: razorpayVerification.connected === true,
      razorpayCredentialsConfigured,
      razorpayProviderConnectionVerified: razorpayVerification.connectionVerified === true,
      razorpayProviderConnectionCheckedAt: typeof razorpayVerification.checkedAt === 'string'
        ? razorpayVerification.checkedAt
        : null,
      razorpayMode: String(razorpayPolicy.mode || 'disabled'),
      razorpayPolicyReason: String(razorpayPolicy.reason || 'disabled'),
      walletPayoutEncryptionConfigured: runtime.walletPayoutEncryptionConfigured === true,
      walletPayoutEncryptionReady,
      legacyRazorpayRoutesRegistered: runtime.legacyRazorpayRoutesRegistered === true,
      legacyPrivateConsultationRoutesEnabled: false,
      walletReadRoutesEnabled,
      walletRechargeRoutesEnabled,
      walletRechargeMode: String(runtime.walletRechargeMode || 'disabled'),
      walletOfferRoutesEnabled,
      walletBackfillRoutesRegistered: runtime.walletBackfillRoutesRegistered === true,
      walletBackfillToolsEnabled: runtime.walletBackfillToolsOpen === true,
      identityProfileBackfillRoutesRegistered: runtime.identityProfileBackfillRoutesRegistered === true,
      identityProfileBackfillToolsEnabled: runtime.identityProfileBackfillToolsOpen === true,
      identityProfileBackfillPreviewOnly: runtime.identityProfileBackfillPreviewOnly !== false,
      identityProfileD1AuthorizationEnabled: runtime.identityProfileD1AuthorizationOpen === true,
      identityProfileD1AuthorizationReady: identityGate.ready === true,
      identityProfileD1AuthorizationReason: String(identityGate.reason || 'unknown'),
      walletBusinessRoutesEnabled: false,
      liveCallChatRoutesEnabled,
      productionTrafficEnabled: false,
      productionFinancialTrafficRoutingEnabled
    };

    return res.status(schema.ready ? 200 : 503)
      .set({ 'Cache-Control': 'no-store' })
      .json(body);
  });
}
