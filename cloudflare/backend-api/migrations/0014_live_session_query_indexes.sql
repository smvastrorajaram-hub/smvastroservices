-- Query indexes for bounded per-participant Live status, history and scheduled receipt lookups.
-- Additive only: no existing rows, balances, ledger entries or session state are modified.
CREATE INDEX IF NOT EXISTS idx_smv_domain_sessions_customer_recent
  ON smv_domain_live_sessions(customer_uid, created_at_ms DESC, session_id);
CREATE INDEX IF NOT EXISTS idx_smv_domain_sessions_astrologer_recent
  ON smv_domain_live_sessions(astrologer_uid, created_at_ms DESC, session_id);
CREATE INDEX IF NOT EXISTS idx_smv_domain_sessions_customer_status_updated
  ON smv_domain_live_sessions(customer_uid, state, updated_at_ms DESC, session_id);
CREATE INDEX IF NOT EXISTS idx_smv_domain_sessions_astrologer_status_updated
  ON smv_domain_live_sessions(astrologer_uid, state, updated_at_ms DESC, session_id);
CREATE INDEX IF NOT EXISTS idx_smv_domain_sessions_customer_appointment
  ON smv_domain_live_sessions(customer_uid, state, appointment_id, started_at_ms, ended_at_ms DESC);
CREATE INDEX IF NOT EXISTS idx_smv_domain_sessions_astrologer_appointment
  ON smv_domain_live_sessions(astrologer_uid, state, appointment_id, started_at_ms, ended_at_ms DESC);

INSERT INTO smv_domain_schema_meta(schema_key, schema_version, applied_at_ms)
VALUES ('live-session-query-indexes', '0014_live_session_query_indexes', CAST(strftime('%s','now') AS INTEGER) * 1000)
ON CONFLICT(schema_key) DO UPDATE SET
  schema_version=excluded.schema_version,
  applied_at_ms=excluded.applied_at_ms;
