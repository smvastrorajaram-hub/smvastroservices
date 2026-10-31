-- Lossless, resumable Firestore -> D1 import support.
-- Legacy ledger rows are archived separately so historical INSERTs cannot replay
-- their balance deltas through the live Wallet ledger triggers.
ALTER TABLE smv_domain_wallet_offers
  ADD COLUMN legacy_successful_redemptions INTEGER NOT NULL DEFAULT 0 CHECK (legacy_successful_redemptions >= 0);
ALTER TABLE smv_domain_wallet_offers
  ADD COLUMN legacy_total_bonus_minutes INTEGER NOT NULL DEFAULT 0 CHECK (legacy_total_bonus_minutes >= 0);

CREATE TABLE IF NOT EXISTS smv_domain_legacy_documents (
  source_collection TEXT NOT NULL,
  document_id TEXT NOT NULL,
  source_update_time_ms INTEGER,
  payload_sha256 TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  imported_at_ms INTEGER NOT NULL,
  PRIMARY KEY (source_collection, document_id)
);
CREATE INDEX IF NOT EXISTS idx_smv_domain_legacy_documents_collection_imported
  ON smv_domain_legacy_documents(source_collection, imported_at_ms DESC);

CREATE TABLE IF NOT EXISTS smv_domain_legacy_wallet_transactions (
  source_document_id TEXT PRIMARY KEY NOT NULL,
  owner_uid TEXT NOT NULL,
  owner_role TEXT NOT NULL,
  type TEXT NOT NULL,
  direction TEXT NOT NULL,
  amount_paise INTEGER NOT NULL DEFAULT 0,
  balance_after_paise INTEGER NOT NULL DEFAULT 0,
  reserved_balance_after_paise INTEGER NOT NULL DEFAULT 0,
  bonus_minutes INTEGER NOT NULL DEFAULT 0,
  bonus_minutes_credited INTEGER NOT NULL DEFAULT 0,
  bonus_minutes_balance_after INTEGER NOT NULL DEFAULT 0,
  reserved_bonus_minutes_after INTEGER NOT NULL DEFAULT 0,
  idempotency_key TEXT NOT NULL DEFAULT '',
  reference_type TEXT,
  reference_id TEXT,
  note TEXT NOT NULL DEFAULT '',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'posted',
  created_at_ms INTEGER NOT NULL DEFAULT 0,
  payload_json TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_smv_domain_legacy_wallet_transactions_owner_created
  ON smv_domain_legacy_wallet_transactions(owner_uid, created_at_ms DESC, source_document_id);

CREATE TABLE IF NOT EXISTS smv_domain_legacy_wallet_recharges (
  recharge_id TEXT PRIMARY KEY NOT NULL,
  customer_uid TEXT NOT NULL,
  amount_paise INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  paid_amount_paise INTEGER,
  paid_at_ms INTEGER,
  created_at_ms INTEGER NOT NULL DEFAULT 0,
  updated_at_ms INTEGER NOT NULL DEFAULT 0,
  payload_json TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_smv_domain_legacy_recharges_owner_created
  ON smv_domain_legacy_wallet_recharges(customer_uid, created_at_ms DESC);
CREATE INDEX IF NOT EXISTS idx_smv_domain_legacy_recharges_order
  ON smv_domain_legacy_wallet_recharges(razorpay_order_id);

CREATE TABLE IF NOT EXISTS smv_domain_settings (
  setting_id TEXT PRIMARY KEY NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  source_update_time_ms INTEGER,
  updated_at_ms INTEGER NOT NULL
);

INSERT INTO smv_domain_schema_meta (schema_key, schema_version, applied_at_ms)
VALUES ('wallet-recharges', '0005_legacy_wallet_backfill', CAST(strftime('%s','now') AS INTEGER) * 1000)
ON CONFLICT(schema_key) DO UPDATE SET
  schema_version = excluded.schema_version,
  applied_at_ms = excluded.applied_at_ms;
