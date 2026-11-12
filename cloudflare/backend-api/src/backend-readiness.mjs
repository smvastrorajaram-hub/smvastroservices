'use strict';

import { isProductionFinancialTrafficRoutingEnabled } from './production-financial-traffic-readiness.mjs';

const REQUIRED_SCHEMA_QUERY = [
  "SELECT",
  "  (SELECT schema_version FROM smv_domain_schema_meta WHERE schema_key = 'shared-domain' LIMIT 1) AS shared_domain_version,",
  "  (SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'smv_domain_notification_inbox') AS notification_inbox_table_count,",
  "  (SELECT COUNT(*) FROM sqlite_master WHERE type = 'index' AND name = 'idx_smv_domain_notification_inbox_state') AS notification_inbox_index_count,",
  "  (SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'smv_domain_wallet_offer_redemption_usage') AS offer_redemption_usage_table_count,",
  "  (SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'smv_domain_offer_redemptions') AS offer_redemptions_table_count,",
  "  (SELECT COUNT(*) FROM sqlite_master WHERE type = 'trigger' AND name = 'smv_domain_offer_redemption_validate') AS offer_redemption_validate_trigger_count,",
  "  (SELECT COUNT(*) FROM sqlite_master WHERE type = 'trigger' AND name = 'smv_domain_offer_redemption_apply') AS offer_redemption_apply_trigger_count,",
  "  (SELECT schema_version FROM smv_domain_schema_meta WHERE schema_key = 'wallet-recharges' LIMIT 1) AS wallet_recharges_version,",
  "  (SELECT schema_version FROM smv_domain_schema_meta WHERE schema_key = 'live-sessions' LIMIT 1) AS live_sessions_version,",
  "  (SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'smv_domain_identity_users') AS identity_users_table_count,",
  "  (SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'smv_domain_identity_migration_meta') AS identity_migration_meta_table_count,",
  "  (SELECT schema_version FROM smv_domain_schema_meta WHERE schema_key = 'identity-profiles' LIMIT 1) AS identity_profiles_version,",
  "  (SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'smv_domain_identity_import_audit') AS identity_import_audit_table_count,",
  "  (SELECT COUNT(*) FROM sqlite_master WHERE type = 'index' AND name = 'idx_smv_domain_identity_import_audit_project_collection') AS identity_import_audit_index_count,",
  "  (SELECT schema_version FROM smv_domain_schema_meta WHERE schema_key = 'wallet-security' LIMIT 1) AS wallet_security_version,",
  "  (SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'smv_domain_withdrawal_payouts_encrypted') AS encrypted_payout_table_count,",
  "  (SELECT COUNT(*) FROM sqlite_master WHERE type = 'index' AND name = 'idx_smv_domain_razorpay_orders_idempotency') AS razorpay_order_idempotency_index_count,",
  "  (SELECT COUNT(*) FROM pragma_table_info('smv_domain_razorpay_orders') WHERE name IN ('wallet_recharge_id', 'idempotency_key')) AS razorpay_order_idempotency_columns_count,",
  "  (SELECT COUNT(*) FROM pragma_table_info('smv_domain_razorpay_webhook_events') WHERE name IN ('claim_token', 'lease_until_ms')) AS razorpay_claim_columns_count,",
  "  (SELECT schema_version FROM smv_domain_schema_meta WHERE schema_key = 'live-booking-release-guard' LIMIT 1) AS live_booking_release_version,",
  "  (SELECT COUNT(*) FROM sqlite_master WHERE type = 'trigger' AND name = 'smv_domain_live_booking_release_pending_validate') AS live_booking_release_trigger_count,",
  "  (SELECT schema_version FROM smv_domain_schema_meta WHERE schema_key = 'numeric-public-reference-ids' LIMIT 1) AS numeric_public_reference_ids_version,",
  "  (SELECT COUNT(*) FROM sqlite_master WHERE type = 'index' AND name = 'smv_domain_withdrawals_public_withdrawal_id_uq') AS public_withdrawal_id_index_count,",
  "  (SELECT COUNT(*) FROM sqlite_master WHERE type = 'index' AND name = 'smv_domain_withdrawals_admin_payment_id_uq') AS admin_payment_id_index_count,",
  "  (SELECT COUNT(*) FROM sqlite_master WHERE type = 'index' AND name = 'smv_domain_wallet_recharges_customer_payment_id_uq') AS customer_payment_id_index_count,",
  "  (SELECT schema_version FROM smv_domain_schema_meta WHERE schema_key = 'live-session-query-indexes' LIMIT 1) AS live_session_query_indexes_version,",
  "  (SELECT COUNT(*) FROM sqlite_master WHERE type = 'index' AND name IN ('idx_smv_domain_sessions_customer_recent','idx_smv_domain_sessions_astrologer_recent','idx_smv_domain_sessions_customer_status_updated','idx_smv_domain_sessions_astrologer_status_updated','idx_smv_domain_sessions_customer_appointment','idx_smv_domain_sessions_astrologer_appointment')) AS live_session_query_indexes_count"
].join('\n');

const BONUS_CREDIT_SCHEMA_QUERY = [
  "SELECT",
  "  (SELECT schema_version FROM smv_domain_schema_meta WHERE schema_key = 'bonus-credit-wallet' LIMIT 1) AS bonus_credit_wallet_version,",
  "  (SELECT COUNT(*) FROM pragma_table_info('smv_domain_wallets') WHERE name IN ('bonus_credit_balance_paise','reserved_bonus_credit_paise')) AS wallet_bonus_credit_columns_count,",
  "  (SELECT COUNT(*) FROM pragma_table_info('smv_domain_wallet_ledger') WHERE name IN ('bonus_credit_delta_paise','reserved_bonus_credit_delta_paise','bonus_credit_balance_after_paise','reserved_bonus_credit_balance_after_paise')) AS wallet_ledger_bonus_credit_columns_count,",
  "  (SELECT COUNT(*) FROM pragma_table_info('smv_domain_wallet_offers') WHERE name = 'bonus_credit_paise') AS wallet_offer_bonus_credit_columns_count,",
  "  (SELECT COUNT(*) FROM pragma_table_info('smv_domain_offer_redemptions') WHERE name = 'bonus_credit_paise') AS offer_redemption_bonus_credit_columns_count,",
  "  (SELECT COUNT(*) FROM pragma_table_info('smv_domain_live_sessions') WHERE name = 'reserved_bonus_credit_paise') AS live_session_bonus_credit_columns_count,",
  "  (SELECT COUNT(*) FROM pragma_table_info('smv_domain_live_bookings') WHERE name = 'reserved_bonus_credit_paise') AS live_booking_bonus_credit_columns_count,",
  "  (SELECT COUNT(*) FROM sqlite_master WHERE type = 'trigger' AND name = 'smv_domain_live_session_reserve_validate') AS live_session_bonus_reserve_trigger_count,",
  "  (SELECT COUNT(*) FROM sqlite_master WHERE type = 'trigger' AND name = 'smv_domain_live_earning_validate') AS live_earning_bonus_credit_trigger_count,",
  "  (SELECT COUNT(*) FROM sqlite_master WHERE type = 'trigger' AND name = 'smv_domain_wallet_ledger_apply') AS wallet_ledger_bonus_credit_apply_trigger_count,",
  "  (SELECT COUNT(*) FROM sqlite_master WHERE type = 'trigger' AND name = 'smv_domain_wallet_ledger_validate') AS wallet_ledger_bonus_credit_validate_trigger_count,",
  "  (SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'smv_domain_promotional_fund') AS promotional_fund_table_count,",
  "  (SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'smv_domain_promotional_fund_ledger') AS promotional_fund_ledger_table_count,",
  "  (SELECT COUNT(*) FROM smv_domain_promotional_fund WHERE fund_id='SMV_ASTRO') AS promotional_fund_seed_count,",
  "  (SELECT COUNT(*) FROM sqlite_master WHERE type = 'trigger' AND name = 'smv_domain_promotional_fund_ledger_validate') AS promotional_fund_validate_trigger_count,",
  "  (SELECT COUNT(*) FROM sqlite_master WHERE type = 'trigger' AND name = 'smv_domain_promotional_fund_ledger_apply') AS promotional_fund_apply_trigger_count"
].join('\n');

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
        countIs(bonusCreditRow.wallet_ledger_bonus_credit_validate_trigger_count, 1) &&
        countIs(bonusCreditRow.promotional_fund_table_count, 1) &&
        countIs(bonusCreditRow.promotional_fund_ledger_table_count, 1) &&
        countIs(bonusCreditRow.promotional_fund_seed_count, 1) &&
        countIs(bonusCreditRow.promotional_fund_validate_trigger_count, 1) &&
        countIs(bonusCreditRow.promotional_fund_apply_trigger_count, 1),
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
