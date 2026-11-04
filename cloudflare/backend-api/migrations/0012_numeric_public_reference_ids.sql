-- Keep the new six-digit customer-facing references unique while retaining
-- UUID/internal primary keys and existing historical reference values.
CREATE UNIQUE INDEX IF NOT EXISTS smv_domain_withdrawals_public_withdrawal_id_uq
ON smv_domain_withdrawals(
  CASE WHEN json_valid(payload_json) THEN json_extract(payload_json,'$.withdrawalId') END
)
WHERE CASE WHEN json_valid(payload_json) THEN json_extract(payload_json,'$.withdrawalId') ELSE '' END
  GLOB 'smvwt-[0-9][0-9][0-9][0-9][0-9][0-9]';

CREATE UNIQUE INDEX IF NOT EXISTS smv_domain_withdrawals_admin_payment_id_uq
ON smv_domain_withdrawals(
  CASE WHEN json_valid(payload_json) THEN json_extract(payload_json,'$.adminPaymentId') END
)
WHERE CASE WHEN json_valid(payload_json) THEN json_extract(payload_json,'$.adminPaymentId') ELSE '' END
  GLOB 'smvpt-[0-9][0-9][0-9][0-9][0-9][0-9]';

CREATE UNIQUE INDEX IF NOT EXISTS smv_domain_wallet_recharges_customer_payment_id_uq
ON smv_domain_wallet_recharges(
  CASE WHEN json_valid(payload_json) THEN json_extract(payload_json,'$.customerPaymentId') END
)
WHERE CASE WHEN json_valid(payload_json) THEN json_extract(payload_json,'$.customerPaymentId') ELSE '' END
  GLOB 'smvpy-[0-9][0-9][0-9][0-9][0-9][0-9]';

INSERT INTO smv_domain_schema_meta (schema_key,schema_version,applied_at_ms)
VALUES ('numeric-public-reference-ids','0012_numeric_public_reference_ids',CAST(strftime('%s','now') AS INTEGER)*1000)
ON CONFLICT(schema_key) DO UPDATE SET
  schema_version=excluded.schema_version,
  applied_at_ms=excluded.applied_at_ms;
