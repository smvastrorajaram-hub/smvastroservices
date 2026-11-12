import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

async function walk(directory, depth = 0) {
  if (depth > 12) return [];
  let entries;
  try { entries = await readdir(directory, { withFileTypes: true }); } catch { return []; }
  const found = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', '.git'].includes(entry.name)) found.push(...await walk(fullPath, depth + 1));
    } else if (/\.(?:sqlite|sqlite3|db)$/i.test(entry.name)) found.push(fullPath);
  }
  return found;
}

async function openFullyMigratedLocalD1() {
  const roots = [path.resolve(process.cwd(), '.wrangler'), path.resolve(process.cwd(), '../.wrangler')];
  const files = [...new Set((await Promise.all(roots.map(root => walk(root)))).flat())];
  for (const file of files) {
    let db;
    try {
      db = new DatabaseSync(file);
      const marker = db.prepare("SELECT schema_version FROM smv_domain_schema_meta WHERE schema_key='live-booking-release-guard'").get();
      const bonusCredit = db.prepare("SELECT schema_version FROM smv_domain_schema_meta WHERE schema_key='bonus-credit-wallet'").get();
      const queryIndexes = db.prepare("SELECT schema_version FROM smv_domain_schema_meta WHERE schema_key='live-session-query-indexes'").get();
      const encrypted = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='smv_domain_withdrawal_payouts_encrypted'").get();
      if (marker?.schema_version === '0011_live_booking_release_claim' &&
          bonusCredit?.schema_version === '0013_bonus_credit_wallet' &&
          queryIndexes?.schema_version === '0014_live_session_query_indexes' && encrypted) {
        db.exec('PRAGMA busy_timeout=10000');
        return { db, file };
      }
      db.close();
    } catch { try { db?.close(); } catch {} }
  }
  throw new Error('No fully migrated ephemeral Wrangler D1 (0002–0014) was found. Apply migrations with --local only; this audit never opens a remote database.');
}

const TABLES = [
  'smv_domain_schema_meta',
  'smv_domain_wallets','smv_domain_wallet_ledger','smv_domain_wallet_recharges',
  'smv_domain_promotional_fund','smv_domain_promotional_fund_ledger',
  'smv_domain_wallet_offers','smv_domain_offer_usage','smv_domain_wallet_offer_redemption_usage',
  'smv_domain_offer_redemptions','smv_domain_notification_inbox',
  'smv_domain_live_sessions','smv_domain_live_bookings','smv_domain_live_messages','smv_domain_live_signals',
  'smv_domain_scheduled_appointments','smv_domain_earnings','smv_domain_withdrawals',
  'smv_domain_withdrawal_payouts','smv_domain_withdrawal_payouts_encrypted',
  'smv_domain_razorpay_orders','smv_domain_razorpay_webhook_events','smv_domain_event_outbox',
  'smv_domain_request_idempotency','smv_domain_settings','smv_domain_live_connections',
  'smv_domain_legacy_documents','smv_domain_legacy_wallet_transactions',
  'smv_domain_legacy_wallet_recharges','smv_domain_legacy_earning_snapshots',
  'smv_domain_identity_users','smv_domain_identity_astrologers','smv_domain_identity_admins',
  'smv_domain_identity_phones','smv_domain_identity_public_ids',
  'smv_domain_identity_payout_profiles','smv_domain_identity_migration_meta','smv_domain_identity_import_audit'
];

const INDEXES = [
  'idx_smv_domain_wallet_ledger_owner_created','idx_smv_domain_wallet_ledger_reference',
  'idx_smv_domain_recharges_owner_created','idx_smv_domain_offers_active',
  'idx_smv_domain_sessions_customer_state','idx_smv_domain_sessions_astrologer_state',
  'idx_smv_domain_bookings_astrologer_status','idx_smv_domain_bookings_customer_status',
  'idx_smv_domain_messages_session_created','idx_smv_domain_signals_session_created',
  'idx_smv_domain_appointments_astrologer_status','idx_smv_domain_earnings_astrologer_status',
  'idx_smv_domain_withdrawals_astrologer_status','idx_smv_domain_orders_owner_created',
  'idx_smv_domain_event_outbox_pending','idx_smv_domain_request_idempotency_expiry',
  'idx_smv_domain_offer_redemptions_offer_created','idx_smv_domain_offer_redemptions_customer_offer',
  'idx_smv_domain_live_sessions_astro_state_created','idx_smv_domain_live_sessions_customer_state_created',
  'idx_smv_domain_sessions_customer_recent','idx_smv_domain_sessions_astrologer_recent',
  'idx_smv_domain_sessions_customer_status_updated','idx_smv_domain_sessions_astrologer_status_updated',
  'idx_smv_domain_sessions_customer_appointment','idx_smv_domain_sessions_astrologer_appointment',
  'idx_smv_domain_live_bookings_expiry','idx_smv_domain_earnings_astrologer_created',
  'idx_smv_domain_earnings_source_reference','idx_smv_domain_live_connections_deadline',
  'idx_smv_domain_razorpay_orders_idempotency','idx_smv_domain_notification_inbox_state',
  'idx_smv_domain_legacy_documents_collection_imported',
  'idx_smv_domain_legacy_wallet_transactions_owner_created','idx_smv_domain_legacy_recharges_owner_created',
  'idx_smv_domain_legacy_recharges_order','idx_smv_domain_identity_import_audit_project_collection','idx_smv_domain_identity_users_project_role',
  'idx_smv_domain_identity_users_public_id','idx_smv_domain_identity_astrologers_public_id',
  'idx_smv_domain_razorpay_webhook_claim_lease'
];

const TRIGGERS = [
  'smv_domain_wallet_ledger_validate','smv_domain_wallet_ledger_apply',
  'smv_domain_offer_redemption_validate','smv_domain_offer_redemption_apply',
  'smv_domain_wallet_order_attach_validate','smv_domain_wallet_order_paid_validate',
  'smv_domain_recharge_ledger_validate','smv_domain_recharge_paid_validate',
  'smv_domain_withdrawal_validate','smv_domain_live_earning_validate',
  'smv_domain_live_session_capacity_validate','smv_domain_live_session_reserve_validate',
  'smv_domain_live_disconnect_generation_validate','smv_domain_live_settlement_ledger_validate',
  'smv_domain_live_session_settlement_validate','smv_domain_live_message_validate',
  'smv_domain_live_signal_validate','smv_domain_live_session_terminal_immutable',
  'smv_domain_live_booking_reserve_validate','smv_domain_live_session_booking_transfer_validate',
  'smv_domain_live_booking_accept_validate','smv_domain_live_booking_release_validate',
  'smv_domain_live_booking_release_pending_validate',
  'smv_domain_promotional_fund_ledger_validate','smv_domain_promotional_fund_ledger_apply'
];

test('local D1 contains every required Wallet, Live, Earnings, Withdrawal and Identity/Profile table, index and trigger', async () => {
  const { db, file } = await openFullyMigratedLocalD1();
  try {
    const tables = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(row => row.name));
    const indexes = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='index'").all().map(row => row.name));
    const triggers = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='trigger'").all().map(row => row.name));
    assert.deepEqual(TABLES.filter(name => !tables.has(name)), [], 'missing D1 tables in ' + file);
    assert.deepEqual(INDEXES.filter(name => !indexes.has(name)), [], 'missing D1 indexes');
    assert.deepEqual(TRIGGERS.filter(name => !triggers.has(name)), [], 'missing D1 integrity triggers');

    const payoutColumns = new Set(db.prepare("PRAGMA table_info('smv_domain_withdrawal_payouts_encrypted')").all().map(row => row.name));
    for (const name of ['withdrawal_id','algorithm','key_version','nonce_hex','ciphertext_hex','auth_tag_hex','source_payload_sha256','created_at_ms','updated_at_ms']) {
      assert.ok(payoutColumns.has(name), 'missing encrypted payout column ' + name);
    }
    const markers = new Map(db.prepare('SELECT schema_key,schema_version FROM smv_domain_schema_meta').all().map(row => [row.schema_key,row.schema_version]));
    for (const [key,version] of [
      ['shared-domain','0002_shared_domain_repository'],
      ['wallet-recharges','0005_legacy_wallet_backfill'],
      ['live-sessions','0006_d1_live_wallet_settlement'],
      ['identity-profiles','0008_identity_profile_backfill_audit'],
      ['wallet-security','0009_wallet_razorpay_payout_encryption'],
      ['live-booking-release-guard','0011_live_booking_release_claim'],
      ['bonus-credit-wallet','0013_bonus_credit_wallet'],
      ['live-session-query-indexes','0014_live_session_query_indexes']
    ]) assert.equal(markers.get(key), version, 'schema marker ' + key);
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
    assert.ok(tables.has('smv_domain_withdrawal_payouts'), 'legacy plaintext table retained for read-only compatibility');
  } finally { db.close(); }
});
