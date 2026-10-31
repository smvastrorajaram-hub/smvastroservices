-- Additive Wallet order idempotency and private payout encryption schema.
-- The legacy plaintext payout table is intentionally retained but is never written.
ALTER TABLE smv_domain_razorpay_orders ADD COLUMN wallet_recharge_id TEXT;
ALTER TABLE smv_domain_razorpay_orders ADD COLUMN idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_smv_domain_razorpay_orders_idempotency
  ON smv_domain_razorpay_orders(idempotency_key)
  WHERE idempotency_key IS NOT NULL AND idempotency_key <> '';

CREATE TABLE IF NOT EXISTS smv_domain_withdrawal_payouts_encrypted (
  withdrawal_id TEXT PRIMARY KEY NOT NULL,
  algorithm TEXT NOT NULL CHECK (algorithm = 'AES-256-GCM'),
  key_version TEXT NOT NULL,
  nonce_hex TEXT NOT NULL,
  ciphertext_hex TEXT NOT NULL,
  auth_tag_hex TEXT NOT NULL,
  source_payload_sha256 TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL
);

-- The legacy Firebase Live service applies a 20/80 commission fallback only
-- when its commission document is absent or invalid. Preserve that exact
-- compatibility behavior in isolated D1 staging, without overwriting a
-- commission setting that was successfully imported from Firestore.
INSERT OR IGNORE INTO smv_domain_settings
  (setting_id,payload_json,source_update_time_ms,updated_at_ms)
VALUES
  ('commission','{"astroPercent":20,"adminPercent":80,"migrationSource":"legacy_runtime_fallback"}',
   NULL,CAST(strftime('%s','now') AS INTEGER) * 1000);

INSERT INTO smv_domain_schema_meta (schema_key,schema_version,applied_at_ms)
VALUES ('wallet-security','0009_wallet_razorpay_payout_encryption',CAST(strftime('%s','now') AS INTEGER) * 1000)
ON CONFLICT(schema_key) DO UPDATE SET
  schema_version=excluded.schema_version,
  applied_at_ms=excluded.applied_at_ms;
