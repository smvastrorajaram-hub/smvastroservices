-- SMV ASTRO Wallet/Live-domain staging schema.
-- This creates an empty schema only. It does not import Firebase data or enable traffic.
-- All monetary amounts use integer paise. Timestamps use Unix milliseconds.

CREATE TABLE IF NOT EXISTS smv_wallet_schema_meta (
  id TEXT PRIMARY KEY CHECK (id = 'primary'),
  schema_version TEXT NOT NULL,
  applied_at_ms INTEGER NOT NULL
);

INSERT INTO smv_wallet_schema_meta (id, schema_version, applied_at_ms)
VALUES ('primary', '0001_wallet_live_domain', unixepoch() * 1000)
ON CONFLICT(id) DO UPDATE SET
  schema_version = excluded.schema_version,
  applied_at_ms = excluded.applied_at_ms;

-- Profile and pricing projection only. Firebase remains authoritative for login,
-- account identity, role/approval and admin-managed profile configuration.
CREATE TABLE IF NOT EXISTS smv_profile_projection (
  uid TEXT PRIMARY KEY,
  source_project_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('customer', 'astrologer', 'admin')),
  display_name TEXT NOT NULL DEFAULT '',
  approval_status TEXT NOT NULL DEFAULT 'unknown',
  online_status TEXT NOT NULL DEFAULT 'offline',
  call_rate_paise INTEGER NOT NULL DEFAULT 0 CHECK (call_rate_paise >= 0),
  chat_rate_paise INTEGER NOT NULL DEFAULT 0 CHECK (chat_rate_paise >= 0),
  source_revision TEXT,
  source_updated_at_ms INTEGER,
  synced_at_ms INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profile_projection_role_online
  ON smv_profile_projection(role, online_status, approval_status);

CREATE TABLE IF NOT EXISTS smv_wallet_accounts (
  owner_uid TEXT PRIMARY KEY,
  owner_role TEXT NOT NULL CHECK (owner_role IN ('customer', 'astrologer', 'admin')),
  currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
  available_balance_paise INTEGER NOT NULL DEFAULT 0 CHECK (available_balance_paise >= 0),
  reserved_balance_paise INTEGER NOT NULL DEFAULT 0 CHECK (reserved_balance_paise >= 0),
  bonus_minutes_balance INTEGER NOT NULL DEFAULT 0 CHECK (bonus_minutes_balance >= 0),
  reserved_bonus_minutes INTEGER NOT NULL DEFAULT 0 CHECK (reserved_bonus_minutes >= 0),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS smv_wallet_ledger (
  entry_id TEXT PRIMARY KEY,
  owner_uid TEXT NOT NULL REFERENCES smv_wallet_accounts(owner_uid),
  entry_type TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('credit', 'debit')),
  amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
  balance_after_paise INTEGER NOT NULL CHECK (balance_after_paise >= 0),
  bonus_minutes_delta INTEGER NOT NULL DEFAULT 0,
  bonus_minutes_after INTEGER NOT NULL DEFAULT 0 CHECK (bonus_minutes_after >= 0),
  idempotency_key TEXT NOT NULL UNIQUE,
  reference_type TEXT,
  reference_id TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at_ms INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wallet_ledger_owner_time
  ON smv_wallet_ledger(owner_uid, created_at_ms DESC);

CREATE TABLE IF NOT EXISTS smv_wallet_recharges (
  recharge_id TEXT PRIMARY KEY,
  owner_uid TEXT NOT NULL REFERENCES smv_wallet_accounts(owner_uid),
  source_project_id TEXT NOT NULL,
  razorpay_order_id TEXT NOT NULL UNIQUE,
  razorpay_payment_id TEXT UNIQUE,
  amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
  status TEXT NOT NULL CHECK (status IN ('created', 'paid', 'failed', 'refunded')),
  credited_ledger_id TEXT UNIQUE REFERENCES smv_wallet_ledger(entry_id),
  offer_id TEXT,
  bonus_minutes_credited INTEGER NOT NULL DEFAULT 0 CHECK (bonus_minutes_credited >= 0),
  verified_event_id TEXT UNIQUE,
  created_at_ms INTEGER NOT NULL,
  paid_at_ms INTEGER,
  updated_at_ms INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wallet_recharges_owner_time
  ON smv_wallet_recharges(owner_uid, created_at_ms DESC);

-- Offer definitions are read-only projections of the existing Admin/Firebase offer
-- configuration. Worker routes must never let a client create or edit an offer rule.
CREATE TABLE IF NOT EXISTS smv_offer_rules (
  offer_id TEXT PRIMARY KEY,
  source_project_id TEXT NOT NULL,
  source_document_id TEXT NOT NULL,
  offer_type TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
  minimum_recharge_amount_paise INTEGER NOT NULL DEFAULT 0 CHECK (minimum_recharge_amount_paise >= 0),
  bonus_minutes INTEGER NOT NULL DEFAULT 0 CHECK (bonus_minutes >= 0),
  valid_from_ms INTEGER,
  valid_until_ms INTEGER,
  usage_limit INTEGER CHECK (usage_limit IS NULL OR usage_limit >= 0),
  per_user_limit INTEGER CHECK (per_user_limit IS NULL OR per_user_limit >= 0),
  source_revision TEXT,
  synced_at_ms INTEGER NOT NULL,
  UNIQUE(source_project_id, source_document_id)
);

CREATE TABLE IF NOT EXISTS smv_offer_usage (
  usage_id TEXT PRIMARY KEY,
  offer_id TEXT NOT NULL REFERENCES smv_offer_rules(offer_id),
  owner_uid TEXT NOT NULL,
  recharge_id TEXT NOT NULL REFERENCES smv_wallet_recharges(recharge_id),
  bonus_minutes_awarded INTEGER NOT NULL CHECK (bonus_minutes_awarded >= 0),
  idempotency_key TEXT NOT NULL UNIQUE,
  used_at_ms INTEGER NOT NULL,
  UNIQUE(offer_id, recharge_id)
);

CREATE TABLE IF NOT EXISTS smv_live_bookings (
  booking_id TEXT PRIMARY KEY,
  customer_uid TEXT NOT NULL,
  astrologer_uid TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('call', 'chat')),
  scheduled_at_ms INTEGER NOT NULL,
  timezone_id TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  status TEXT NOT NULL CHECK (status IN (
    'pending_payment', 'booked', 'confirmed', 'connecting', 'completed',
    'cancelled', 'rejected', 'missed', 'refunded'
  )),
  prepayment_amount_paise INTEGER NOT NULL DEFAULT 0 CHECK (prepayment_amount_paise >= 0),
  session_id TEXT UNIQUE,
  idempotency_key TEXT NOT NULL UNIQUE,
  source_project_id TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_live_bookings_astrologer_schedule
  ON smv_live_bookings(astrologer_uid, scheduled_at_ms, status);

CREATE INDEX IF NOT EXISTS idx_live_bookings_customer_time
  ON smv_live_bookings(customer_uid, created_at_ms DESC);

CREATE TABLE IF NOT EXISTS smv_live_sessions (
  session_id TEXT PRIMARY KEY,
  customer_uid TEXT NOT NULL,
  astrologer_uid TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('call', 'chat')),
  source_type TEXT NOT NULL CHECK (source_type IN ('instant', 'booking')),
  booking_id TEXT UNIQUE REFERENCES smv_live_bookings(booking_id),
  status TEXT NOT NULL CHECK (status IN (
    'ringing', 'accepted', 'preparing', 'connecting', 'active', 'completed',
    'rejected', 'cancelled', 'connection_failed', 'refunded'
  )),
  rate_per_minute_paise INTEGER NOT NULL CHECK (rate_per_minute_paise >= 0),
  commission_bps INTEGER NOT NULL CHECK (commission_bps BETWEEN 0 AND 10000),
  reserved_amount_paise INTEGER NOT NULL DEFAULT 0 CHECK (reserved_amount_paise >= 0),
  reserved_bonus_minutes INTEGER NOT NULL DEFAULT 0 CHECK (reserved_bonus_minutes >= 0),
  connected_at_ms INTEGER,
  started_at_ms INTEGER,
  ended_at_ms INTEGER,
  connected_seconds INTEGER NOT NULL DEFAULT 0 CHECK (connected_seconds >= 0),
  billable_minutes INTEGER NOT NULL DEFAULT 0 CHECK (billable_minutes >= 0),
  customer_debit_paise INTEGER NOT NULL DEFAULT 0 CHECK (customer_debit_paise >= 0),
  refund_amount_paise INTEGER NOT NULL DEFAULT 0 CHECK (refund_amount_paise >= 0),
  end_reason TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  source_project_id TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_live_sessions_customer_time
  ON smv_live_sessions(customer_uid, created_at_ms DESC);

CREATE INDEX IF NOT EXISTS idx_live_sessions_astrologer_time
  ON smv_live_sessions(astrologer_uid, created_at_ms DESC);

CREATE INDEX IF NOT EXISTS idx_live_sessions_state_time
  ON smv_live_sessions(status, updated_at_ms);

CREATE TABLE IF NOT EXISTS smv_live_messages (
  message_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES smv_live_sessions(session_id),
  sender_uid TEXT NOT NULL,
  client_message_id TEXT NOT NULL,
  message_text TEXT NOT NULL CHECK (length(message_text) BETWEEN 1 AND 4000),
  created_at_ms INTEGER NOT NULL,
  UNIQUE(session_id, sender_uid, client_message_id)
);

CREATE INDEX IF NOT EXISTS idx_live_messages_session_time
  ON smv_live_messages(session_id, created_at_ms);

CREATE TABLE IF NOT EXISTS smv_webrtc_signals (
  signal_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES smv_live_sessions(session_id),
  sender_uid TEXT NOT NULL,
  recipient_uid TEXT NOT NULL,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('offer', 'answer', 'ice', 'renegotiate')),
  payload_json TEXT NOT NULL,
  expires_at_ms INTEGER NOT NULL,
  created_at_ms INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_webrtc_signals_recipient_expiry
  ON smv_webrtc_signals(session_id, recipient_uid, expires_at_ms);

CREATE TABLE IF NOT EXISTS smv_commission_entries (
  entry_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES smv_live_sessions(session_id),
  recipient_uid TEXT NOT NULL,
  recipient_role TEXT NOT NULL CHECK (recipient_role IN ('astrologer', 'admin')),
  amount_paise INTEGER NOT NULL CHECK (amount_paise >= 0),
  share_bps INTEGER NOT NULL CHECK (share_bps BETWEEN 0 AND 10000),
  status TEXT NOT NULL CHECK (status IN ('pending', 'credited', 'reversed')),
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at_ms INTEGER NOT NULL,
  credited_at_ms INTEGER,
  UNIQUE(session_id, recipient_uid, recipient_role)
);

CREATE INDEX IF NOT EXISTS idx_commission_owner_time
  ON smv_commission_entries(recipient_uid, created_at_ms DESC);

CREATE TABLE IF NOT EXISTS smv_refund_records (
  refund_id TEXT PRIMARY KEY,
  owner_uid TEXT NOT NULL,
  session_id TEXT,
  recharge_id TEXT,
  amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
  reason_code TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('requested', 'processing', 'completed', 'failed')),
  idempotency_key TEXT NOT NULL UNIQUE,
  source_project_id TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL,
  completed_at_ms INTEGER
);

CREATE TABLE IF NOT EXISTS smv_withdrawal_requests (
  withdrawal_id TEXT PRIMARY KEY,
  owner_uid TEXT NOT NULL REFERENCES smv_wallet_accounts(owner_uid),
  amount_paise INTEGER NOT NULL CHECK (amount_paise >= 30000),
  status TEXT NOT NULL CHECK (status IN ('requested', 'approved', 'processing', 'paid', 'rejected', 'cancelled')),
  requested_at_ms INTEGER NOT NULL,
  eligible_at_ms INTEGER NOT NULL,
  payout_snapshot_json TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  reviewed_by_uid TEXT,
  reviewed_at_ms INTEGER,
  completed_at_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_withdrawals_owner_time
  ON smv_withdrawal_requests(owner_uid, requested_at_ms DESC);

-- Source event inbox deduplicates signed payment/projection events from every
-- configured Firebase project. Project IDs are data, not hardcoded to one project.
CREATE TABLE IF NOT EXISTS smv_firebase_event_inbox (
  source_project_id TEXT NOT NULL,
  source_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  processing_status TEXT NOT NULL CHECK (processing_status IN ('received', 'processed', 'failed')),
  received_at_ms INTEGER NOT NULL,
  processed_at_ms INTEGER,
  PRIMARY KEY(source_project_id, source_event_id)
);

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

CREATE INDEX IF NOT EXISTS idx_domain_outbox_delivery
  ON smv_domain_outbox(delivery_status, created_at_ms);
