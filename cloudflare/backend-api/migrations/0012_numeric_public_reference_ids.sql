-- Keep the new six-digit customer-facing references unique while retaining
-- UUID/internal primary keys and existing historical reference values.
CREATE UNIQUE INDEX IF NOT EXISTS smv_domain_withdrawals_public_withdrawal_id_uq
ON smv_domain_withdrawals(json_extract(payload_json,'$.withdrawalId'))
WHERE json_extract(payload_json,'$.withdrawalId')
  GLOB 'smvwt-[0-9][0-9][0-9][0-9][0-9][0-9]';

CREATE UNIQUE INDEX IF NOT EXISTS smv_domain_withdrawals_admin_payment_id_uq
ON smv_domain_withdrawals(json_extract(payload_json,'$.adminPaymentId'))
WHERE json_extract(payload_json,'$.adminPaymentId')
  GLOB 'smvpt-[0-9][0-9][0-9][0-9][0-9][0-9]';

CREATE UNIQUE INDEX IF NOT EXISTS smv_domain_wallet_recharges_customer_payment_id_uq
ON smv_domain_wallet_recharges(json_extract(payload_json,'$.customerPaymentId'))
WHERE json_extract(payload_json,'$.customerPaymentId')
  GLOB 'smvpy-[0-9][0-9][0-9][0-9][0-9][0-9]';

INSERT INTO smv_domain_schema_meta (schema_key,schema_version,applied_at_ms)
VALUES ('numeric-public-reference-ids','0012_numeric_public_reference_ids',CAST(strftime('%s','now') AS INTEGER)*1000)
ON CONFLICT(schema_key) DO UPDATE SET
  schema_version=excluded.schema_version,
  applied_at_ms=excluded.applied_at_ms;
