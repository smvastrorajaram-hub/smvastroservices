-- STAGING ONLY. Connectivity/authorization smoke-test target.
-- Never store customer, astrologer, Wallet, payment or live-session data here.
CREATE TABLE IF NOT EXISTS staging_probe_events (
  id TEXT PRIMARY KEY NOT NULL,
  probe_name TEXT NOT NULL CHECK (length(probe_name) BETWEEN 1 AND 40),
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_staging_probe_events_created_at
  ON staging_probe_events (created_at DESC);
