-- Reproduce the pre-existing staging D1 objects from 0001_wallet_live_domain.sql.
-- These tables are intentionally preserved; the next migrations must not reuse their names.
CREATE TABLE IF NOT EXISTS smv_domain_outbox (
  event_id TEXT PRIMARY KEY,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'delivered', 'failed')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  created_at_ms INTEGER NOT NULL,
  delivered_at_ms INTEGER
);
INSERT OR IGNORE INTO smv_domain_outbox
  (event_id, aggregate_type, aggregate_id, event_type, payload_json, delivery_status, attempt_count, created_at_ms, delivered_at_ms)
VALUES ('legacy-outbox-keep-001', 'legacy', 'aggregate-001', 'legacy.event', '{}', 'pending', 0, 1000, NULL);

CREATE TABLE IF NOT EXISTS smv_domain_idempotency (
  idempotency_key TEXT PRIMARY KEY,
  operation_type TEXT NOT NULL,
  actor_uid TEXT,
  request_hash TEXT NOT NULL,
  response_json TEXT,
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'succeeded', 'failed')),
  created_at_ms INTEGER NOT NULL,
  completed_at_ms INTEGER
);
INSERT OR IGNORE INTO smv_domain_idempotency
  (idempotency_key, operation_type, actor_uid, request_hash, response_json, status, created_at_ms, completed_at_ms)
VALUES ('legacy-request-keep-001', 'legacy.operation', 'staging-test', 'sha256:test', '{}', 'succeeded', 1000, 2000);
