-- Additive shared Wallet/Live domain schema.
-- Existing staging tables and the legacy 0001 readiness marker are not modified.
CREATE TABLE IF NOT EXISTS smv_domain_schema_meta (
  schema_key TEXT PRIMARY KEY,
  schema_version TEXT NOT NULL,
  applied_at_ms INTEGER NOT NULL
);

INSERT INTO smv_domain_schema_meta (schema_key, schema_version, applied_at_ms)
VALUES ('shared-domain', '0002_shared_domain_repository', CAST(strftime('%s','now') AS INTEGER) * 1000)
ON CONFLICT(schema_key) DO UPDATE SET
  schema_version = excluded.schema_version,
  applied_at_ms = excluded.applied_at_ms;

CREATE TABLE IF NOT EXISTS smv_domain_wallets (
  owner_uid TEXT PRIMARY KEY NOT NULL,
  owner_role TEXT NOT NULL CHECK (owner_role IN ('customer','astrologer','admin')),
  currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
  available_balance_paise INTEGER NOT NULL DEFAULT 0 CHECK (available_balance_paise BETWEEN 0 AND 9007199254740991),
  reserved_balance_paise INTEGER NOT NULL DEFAULT 0 CHECK (reserved_balance_paise BETWEEN 0 AND 9007199254740991),
  bonus_minutes_balance INTEGER NOT NULL DEFAULT 0 CHECK (bonus_minutes_balance BETWEEN 0 AND 1000000),
  reserved_bonus_minutes INTEGER NOT NULL DEFAULT 0 CHECK (reserved_bonus_minutes BETWEEN 0 AND 1000000),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS smv_domain_wallet_ledger (
  ledger_id TEXT PRIMARY KEY NOT NULL,
  owner_uid TEXT NOT NULL,
  owner_role TEXT NOT NULL CHECK (owner_role IN ('customer','astrologer','admin')),
  currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
  type TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('credit','debit','reserve','release')),
  amount_paise INTEGER NOT NULL DEFAULT 0 CHECK (amount_paise BETWEEN 0 AND 9007199254740991),
  available_delta_paise INTEGER NOT NULL DEFAULT 0,
  reserved_delta_paise INTEGER NOT NULL DEFAULT 0,
  bonus_minutes_delta INTEGER NOT NULL DEFAULT 0,
  reserved_bonus_minutes_delta INTEGER NOT NULL DEFAULT 0,
  balance_after_paise INTEGER,
  reserved_balance_after_paise INTEGER,
  bonus_minutes_balance_after INTEGER,
  reserved_bonus_minutes_after INTEGER,
  idempotency_key TEXT NOT NULL,
  reference_type TEXT,
  reference_id TEXT,
  note TEXT NOT NULL DEFAULT '',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('posted','pending','failed','reversed')),
  source TEXT,
  created_at_ms INTEGER NOT NULL,
  UNIQUE(owner_uid, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_smv_domain_wallet_ledger_owner_created
  ON smv_domain_wallet_ledger(owner_uid, created_at_ms DESC, ledger_id);
CREATE INDEX IF NOT EXISTS idx_smv_domain_wallet_ledger_reference
  ON smv_domain_wallet_ledger(reference_type, reference_id, created_at_ms DESC);

-- Ledger INSERT is the sole balance mutation command. These triggers validate
-- available/reserved cash and bonus-minute reserves and update the Wallet row in
-- the same SQLite transaction as the ledger row.
CREATE TRIGGER IF NOT EXISTS smv_domain_wallet_ledger_validate
BEFORE INSERT ON smv_domain_wallet_ledger
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM smv_domain_wallets WHERE owner_uid = NEW.owner_uid
  ) THEN RAISE(ABORT, 'WALLET_OWNER_NOT_FOUND') END;

  SELECT CASE WHEN (
    SELECT owner_role FROM smv_domain_wallets WHERE owner_uid = NEW.owner_uid
  ) <> NEW.owner_role THEN RAISE(ABORT, 'WALLET_OWNER_ROLE_MISMATCH') END;

  SELECT CASE WHEN (
    SELECT available_balance_paise + NEW.available_delta_paise
    FROM smv_domain_wallets WHERE owner_uid = NEW.owner_uid
  ) < 0 THEN RAISE(ABORT, 'WALLET_INSUFFICIENT_BALANCE') END;

  SELECT CASE WHEN (
    SELECT reserved_balance_paise + NEW.reserved_delta_paise
    FROM smv_domain_wallets WHERE owner_uid = NEW.owner_uid
  ) < 0 THEN RAISE(ABORT, 'WALLET_RESERVED_BALANCE_MISMATCH') END;

  SELECT CASE WHEN (
    SELECT bonus_minutes_balance + NEW.bonus_minutes_delta
    FROM smv_domain_wallets WHERE owner_uid = NEW.owner_uid
  ) < 0 THEN RAISE(ABORT, 'WALLET_BONUS_BALANCE_MISMATCH') END;

  SELECT CASE WHEN (
    SELECT reserved_bonus_minutes + NEW.reserved_bonus_minutes_delta
    FROM smv_domain_wallets WHERE owner_uid = NEW.owner_uid
  ) < 0 THEN RAISE(ABORT, 'WALLET_RESERVED_BONUS_MISMATCH') END;

  SELECT CASE WHEN (
    SELECT available_balance_paise + NEW.available_delta_paise
    FROM smv_domain_wallets WHERE owner_uid = NEW.owner_uid
  ) > 9007199254740991 OR (
    SELECT reserved_balance_paise + NEW.reserved_delta_paise
    FROM smv_domain_wallets WHERE owner_uid = NEW.owner_uid
  ) > 9007199254740991 THEN RAISE(ABORT, 'WALLET_BALANCE_OVERFLOW') END;

  SELECT CASE WHEN (
    SELECT bonus_minutes_balance + NEW.bonus_minutes_delta
    FROM smv_domain_wallets WHERE owner_uid = NEW.owner_uid
  ) > 1000000 OR (
    SELECT reserved_bonus_minutes + NEW.reserved_bonus_minutes_delta
    FROM smv_domain_wallets WHERE owner_uid = NEW.owner_uid
  ) > 1000000 THEN RAISE(ABORT, 'WALLET_BALANCE_OVERFLOW') END;
END;

CREATE TRIGGER IF NOT EXISTS smv_domain_wallet_ledger_apply
AFTER INSERT ON smv_domain_wallet_ledger
BEGIN
  UPDATE smv_domain_wallets
  SET available_balance_paise = available_balance_paise + NEW.available_delta_paise,
      reserved_balance_paise = reserved_balance_paise + NEW.reserved_delta_paise,
      bonus_minutes_balance = bonus_minutes_balance + NEW.bonus_minutes_delta,
      reserved_bonus_minutes = reserved_bonus_minutes + NEW.reserved_bonus_minutes_delta,
      version = version + 1,
      updated_at_ms = NEW.created_at_ms
  WHERE owner_uid = NEW.owner_uid;

  UPDATE smv_domain_wallet_ledger
  SET balance_after_paise = (SELECT available_balance_paise FROM smv_domain_wallets WHERE owner_uid = NEW.owner_uid),
      reserved_balance_after_paise = (SELECT reserved_balance_paise FROM smv_domain_wallets WHERE owner_uid = NEW.owner_uid),
      bonus_minutes_balance_after = (SELECT bonus_minutes_balance FROM smv_domain_wallets WHERE owner_uid = NEW.owner_uid),
      reserved_bonus_minutes_after = (SELECT reserved_bonus_minutes FROM smv_domain_wallets WHERE owner_uid = NEW.owner_uid)
  WHERE ledger_id = NEW.ledger_id;
END;

CREATE TABLE IF NOT EXISTS smv_domain_wallet_recharges (
  recharge_id TEXT PRIMARY KEY NOT NULL,
  customer_uid TEXT NOT NULL,
  amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
  currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
  status TEXT NOT NULL,
  razorpay_order_id TEXT UNIQUE,
  razorpay_payment_id TEXT UNIQUE,
  paid_at_ms INTEGER,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_smv_domain_recharges_owner_created
  ON smv_domain_wallet_recharges(customer_uid, created_at_ms DESC);

CREATE TABLE IF NOT EXISTS smv_domain_wallet_offers (
  offer_id TEXT PRIMARY KEY NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0,1)),
  minimum_recharge_paise INTEGER NOT NULL DEFAULT 0,
  bonus_minutes INTEGER NOT NULL CHECK (bonus_minutes BETWEEN 1 AND 1440),
  per_customer_limit INTEGER NOT NULL DEFAULT 1,
  total_usage_limit INTEGER NOT NULL DEFAULT 0,
  used_count INTEGER NOT NULL DEFAULT 0,
  priority INTEGER NOT NULL DEFAULT 0,
  start_at_ms INTEGER,
  end_at_ms INTEGER,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_smv_domain_offers_active
  ON smv_domain_wallet_offers(enabled, start_at_ms, end_at_ms, priority DESC);

CREATE TABLE IF NOT EXISTS smv_domain_offer_usage (
  offer_id TEXT NOT NULL,
  customer_uid TEXT NOT NULL,
  redemption_count INTEGER NOT NULL DEFAULT 0,
  last_recharge_id TEXT,
  updated_at_ms INTEGER NOT NULL,
  PRIMARY KEY (offer_id, customer_uid)
);

CREATE TABLE IF NOT EXISTS smv_domain_live_sessions (
  session_id TEXT PRIMARY KEY NOT NULL,
  customer_uid TEXT NOT NULL,
  astrologer_uid TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('call','chat')),
  state TEXT NOT NULL,
  appointment_id TEXT,
  reserved_amount_paise INTEGER NOT NULL DEFAULT 0,
  reserved_bonus_minutes INTEGER NOT NULL DEFAULT 0,
  actual_charge_paise INTEGER NOT NULL DEFAULT 0,
  started_at_ms INTEGER,
  ended_at_ms INTEGER,
  settlement_operation_id TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_smv_domain_sessions_customer_state
  ON smv_domain_live_sessions(customer_uid, state, created_at_ms DESC);
CREATE INDEX IF NOT EXISTS idx_smv_domain_sessions_astrologer_state
  ON smv_domain_live_sessions(astrologer_uid, state, created_at_ms DESC);

CREATE TABLE IF NOT EXISTS smv_domain_live_bookings (
  booking_id TEXT PRIMARY KEY NOT NULL,
  customer_uid TEXT NOT NULL,
  astrologer_uid TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('call','chat')),
  status TEXT NOT NULL,
  wallet_reservation_state TEXT NOT NULL DEFAULT 'none',
  reserved_amount_paise INTEGER NOT NULL DEFAULT 0,
  reserved_bonus_minutes INTEGER NOT NULL DEFAULT 0,
  expires_at_ms INTEGER,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_smv_domain_bookings_astrologer_status
  ON smv_domain_live_bookings(astrologer_uid, status, created_at_ms DESC);
CREATE INDEX IF NOT EXISTS idx_smv_domain_bookings_customer_status
  ON smv_domain_live_bookings(customer_uid, status, created_at_ms DESC);

CREATE TABLE IF NOT EXISTS smv_domain_live_messages (
  session_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  sender_uid TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL,
  PRIMARY KEY (session_id, message_id)
);
CREATE INDEX IF NOT EXISTS idx_smv_domain_messages_session_created
  ON smv_domain_live_messages(session_id, created_at_ms ASC);

CREATE TABLE IF NOT EXISTS smv_domain_live_signals (
  session_id TEXT NOT NULL,
  signal_id TEXT NOT NULL,
  sender_uid TEXT NOT NULL,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('offer','answer','ice')),
  payload_json TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL,
  PRIMARY KEY (session_id, signal_id)
);
CREATE INDEX IF NOT EXISTS idx_smv_domain_signals_session_created
  ON smv_domain_live_signals(session_id, created_at_ms ASC);

CREATE TABLE IF NOT EXISTS smv_domain_scheduled_appointments (
  appointment_id TEXT PRIMARY KEY NOT NULL,
  customer_uid TEXT,
  astrologer_uid TEXT,
  booking_kind TEXT NOT NULL,
  booking_status TEXT NOT NULL,
  preferred_at_ms INTEGER,
  live_session_id TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_smv_domain_appointments_astrologer_status
  ON smv_domain_scheduled_appointments(astrologer_uid, booking_status, preferred_at_ms);

CREATE TABLE IF NOT EXISTS smv_domain_earnings (
  earning_id TEXT PRIMARY KEY NOT NULL,
  astrologer_uid TEXT NOT NULL,
  customer_uid TEXT,
  source_type TEXT NOT NULL,
  reference_id TEXT NOT NULL,
  gross_amount_paise INTEGER NOT NULL DEFAULT 0,
  astrologer_amount_paise INTEGER NOT NULL DEFAULT 0,
  admin_amount_paise INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_smv_domain_earnings_astrologer_status
  ON smv_domain_earnings(astrologer_uid, status, created_at_ms DESC);

CREATE TABLE IF NOT EXISTS smv_domain_withdrawals (
  withdrawal_id TEXT PRIMARY KEY NOT NULL,
  astrologer_uid TEXT NOT NULL,
  amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
  status TEXT NOT NULL,
  available_at_ms INTEGER,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_smv_domain_withdrawals_astrologer_status
  ON smv_domain_withdrawals(astrologer_uid, status, created_at_ms DESC);

CREATE TABLE IF NOT EXISTS smv_domain_withdrawal_payouts (
  withdrawal_id TEXT PRIMARY KEY NOT NULL,
  private_payout_json TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS smv_domain_razorpay_orders (
  order_id TEXT PRIMARY KEY NOT NULL,
  owner_uid TEXT,
  service_name TEXT NOT NULL,
  amount_paise INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL,
  payment_id TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_smv_domain_orders_owner_created
  ON smv_domain_razorpay_orders(owner_uid, created_at_ms DESC);

CREATE TABLE IF NOT EXISTS smv_domain_razorpay_webhook_events (
  event_key TEXT PRIMARY KEY NOT NULL,
  event_type TEXT NOT NULL,
  payment_id TEXT,
  order_id TEXT,
  processed INTEGER NOT NULL DEFAULT 0 CHECK (processed IN (0,1)),
  retry_count INTEGER NOT NULL DEFAULT 0,
  payload_json TEXT NOT NULL DEFAULT '{}',
  received_at_ms INTEGER NOT NULL,
  processed_at_ms INTEGER
);

CREATE TABLE IF NOT EXISTS smv_domain_outbox (
  outbox_id TEXT PRIMARY KEY NOT NULL,
  event_type TEXT NOT NULL,
  event_key TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','sent','failed','dead')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  next_attempt_at_ms INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL,
  UNIQUE(event_type, event_key)
);
CREATE INDEX IF NOT EXISTS idx_smv_domain_outbox_pending
  ON smv_domain_outbox(status, next_attempt_at_ms, created_at_ms);

CREATE TABLE IF NOT EXISTS smv_domain_idempotency (
  scope TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  status TEXT NOT NULL,
  response_json TEXT,
  created_at_ms INTEGER NOT NULL,
  expires_at_ms INTEGER NOT NULL,
  PRIMARY KEY(scope, idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_smv_domain_idempotency_expiry
  ON smv_domain_idempotency(expires_at_ms);
