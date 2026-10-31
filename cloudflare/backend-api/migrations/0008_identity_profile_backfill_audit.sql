-- Source-to-D1 Identity/Profile import audit. Only hashes/status are stored here;
-- sensitive payout payloads remain isolated in smv_domain_identity_payout_profiles.
CREATE TABLE IF NOT EXISTS smv_domain_identity_import_audit (
  source_project_id TEXT NOT NULL,
  source_collection TEXT NOT NULL,
  document_id TEXT NOT NULL,
  uid TEXT,
  source_update_time TEXT NOT NULL,
  source_payload_sha256 TEXT NOT NULL,
  mapping_status TEXT NOT NULL CHECK (mapping_status IN ('mapped','warning')),
  warning_codes TEXT NOT NULL DEFAULT '[]',
  imported_at_ms INTEGER NOT NULL,
  PRIMARY KEY (source_project_id, source_collection, document_id)
);

CREATE INDEX IF NOT EXISTS idx_smv_domain_identity_import_audit_project_collection
  ON smv_domain_identity_import_audit(source_project_id, source_collection, mapping_status);

INSERT INTO smv_domain_schema_meta (schema_key, schema_version, applied_at_ms)
VALUES ('identity-profiles', '0008_identity_profile_backfill_audit', CAST(strftime('%s','now') AS INTEGER) * 1000)
ON CONFLICT(schema_key) DO UPDATE SET
  schema_version = excluded.schema_version,
  applied_at_ms = excluded.applied_at_ms;
