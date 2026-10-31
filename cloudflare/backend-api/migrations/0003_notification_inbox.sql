-- Add an idempotent inbox for at-least-once notification queue consumers.
CREATE TABLE IF NOT EXISTS smv_domain_notification_inbox (
  event_id TEXT PRIMARY KEY NOT NULL,
  event_type TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('pending','processing','sent','failed','dead')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  lease_until_ms INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  result_json TEXT,
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL,
  sent_at_ms INTEGER
);
CREATE INDEX IF NOT EXISTS idx_smv_domain_notification_inbox_state
  ON smv_domain_notification_inbox(state, lease_until_ms, created_at_ms);
