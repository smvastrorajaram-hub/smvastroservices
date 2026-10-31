-- Live session capacity, reservation and settlement invariants.
-- All balances continue to move only through the D1 Wallet ledger triggers.

CREATE INDEX IF NOT EXISTS idx_smv_domain_live_sessions_astro_state_created
  ON smv_domain_live_sessions(astrologer_uid,state,created_at_ms DESC);
CREATE INDEX IF NOT EXISTS idx_smv_domain_live_sessions_customer_state_created
  ON smv_domain_live_sessions(customer_uid,state,created_at_ms DESC);
CREATE INDEX IF NOT EXISTS idx_smv_domain_live_bookings_expiry
  ON smv_domain_live_bookings(status,expires_at_ms);
CREATE INDEX IF NOT EXISTS idx_smv_domain_earnings_astrologer_created
  ON smv_domain_earnings(astrologer_uid,created_at_ms DESC);
CREATE INDEX IF NOT EXISTS idx_smv_domain_earnings_source_reference
  ON smv_domain_earnings(source_type,reference_id);

-- Enforce per-Astrologer concurrent Live session capacity inside the same D1
-- write transaction that creates the session. Pricing defaults to one slot.
CREATE TRIGGER IF NOT EXISTS smv_domain_live_session_capacity_validate
BEFORE INSERT ON smv_domain_live_sessions
WHEN NEW.state IN ('ringing','preparing','connecting','active')
BEGIN
  SELECT CASE WHEN (
    SELECT COUNT(*) FROM smv_domain_live_sessions s
    WHERE s.astrologer_uid=NEW.astrologer_uid
      AND s.state IN ('ringing','preparing','connecting','active')
  ) >= COALESCE((
    SELECT CAST(json_extract(payload_json,'$.maxConcurrentSessions') AS INTEGER)
    FROM smv_domain_settings WHERE setting_id='liveSessionPricing'
  ),1)
  THEN RAISE(ABORT,'LIVE_ASTROLOGER_BUSY') END;
END;

-- A direct Live request must have its matching reserve ledger row in the same
-- batch. A booking-accepted session reuses its existing booking reservation.
CREATE TRIGGER IF NOT EXISTS smv_domain_live_session_reserve_validate
BEFORE INSERT ON smv_domain_live_sessions
WHEN NEW.reserved_amount_paise>0 OR NEW.reserved_bonus_minutes>0 OR
     json_extract(NEW.payload_json,'$.origin') NOT IN ('legacy_unreserved')
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM smv_domain_wallet_ledger l
    WHERE l.owner_uid=NEW.customer_uid
      AND l.reference_id=NEW.session_id
      AND l.direction='reserve'
      AND l.amount_paise=NEW.reserved_amount_paise
      AND l.reserved_delta_paise=NEW.reserved_amount_paise
      AND l.reserved_bonus_minutes_delta=NEW.reserved_bonus_minutes
      AND l.reference_type=CASE
        WHEN json_extract(NEW.payload_json,'$.origin') IN ('accepted_booking','offline_queue')
          THEN 'live_booking'
        ELSE 'live_session' END
      AND l.type=CASE
        WHEN json_extract(NEW.payload_json,'$.origin') IN ('accepted_booking','offline_queue')
          THEN 'live_booking_reserve'
        ELSE 'live_session_reserve' END
  ) THEN RAISE(ABORT,'LIVE_SESSION_RESERVE_MISSING') END;
END;

-- Sessions cannot be reopened, and they cannot be ended while any cash or
-- promotional-minute reserve remains unreconciled in the Wallet ledger.
CREATE TRIGGER IF NOT EXISTS smv_domain_live_session_settlement_validate
BEFORE UPDATE OF state ON smv_domain_live_sessions
WHEN NEW.state='ended' AND OLD.state<>'ended'
BEGIN
  SELECT CASE WHEN COALESCE((
    SELECT SUM(l.reserved_delta_paise)
    FROM smv_domain_wallet_ledger l
    WHERE l.owner_uid=NEW.customer_uid
      AND l.reference_id=NEW.session_id
      AND l.reference_type=CASE
        WHEN json_extract(NEW.payload_json,'$.origin') IN ('accepted_booking','offline_queue')
          THEN 'live_booking'
        ELSE 'live_session' END
  ),0)<>0 THEN RAISE(ABORT,'LIVE_SESSION_CASH_RESERVE_NOT_SETTLED') END;

  SELECT CASE WHEN COALESCE((
    SELECT SUM(l.reserved_bonus_minutes_delta)
    FROM smv_domain_wallet_ledger l
    WHERE l.owner_uid=NEW.customer_uid
      AND l.reference_id=NEW.session_id
      AND l.reference_type=CASE
        WHEN json_extract(NEW.payload_json,'$.origin') IN ('accepted_booking','offline_queue')
          THEN 'live_booking'
        ELSE 'live_session' END
  ),0)<>0 THEN RAISE(ABORT,'LIVE_SESSION_BONUS_RESERVE_NOT_SETTLED') END;
END;

CREATE TRIGGER IF NOT EXISTS smv_domain_live_session_terminal_immutable
BEFORE UPDATE OF state ON smv_domain_live_sessions
WHEN OLD.state='ended' AND NEW.state<>'ended'
BEGIN
  SELECT RAISE(ABORT,'LIVE_SESSION_ALREADY_ENDED');
END;

-- Pending booking reservations are backed by a matching reserve ledger row.
CREATE TRIGGER IF NOT EXISTS smv_domain_live_booking_reserve_validate
BEFORE INSERT ON smv_domain_live_bookings
WHEN NEW.wallet_reservation_state='reserved'
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM smv_domain_wallet_ledger l
    WHERE l.owner_uid=NEW.customer_uid AND l.reference_id=NEW.booking_id
      AND l.reference_type='live_booking' AND l.type='live_booking_reserve'
      AND l.direction='reserve' AND l.amount_paise=NEW.reserved_amount_paise
      AND l.reserved_delta_paise=NEW.reserved_amount_paise
      AND l.reserved_bonus_minutes_delta=NEW.reserved_bonus_minutes
  ) THEN RAISE(ABORT,'LIVE_BOOKING_RESERVE_MISSING') END;
END;

CREATE TRIGGER IF NOT EXISTS smv_domain_live_session_booking_transfer_validate
BEFORE INSERT ON smv_domain_live_sessions
WHEN json_extract(NEW.payload_json,'$.origin')='accepted_booking'
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM smv_domain_live_bookings b
    WHERE b.booking_id=NEW.session_id
      AND b.customer_uid=NEW.customer_uid
      AND b.astrologer_uid=NEW.astrologer_uid
      AND b.status='pending'
      AND b.wallet_reservation_state='reserved'
      AND b.reserved_amount_paise=NEW.reserved_amount_paise
      AND b.reserved_bonus_minutes=NEW.reserved_bonus_minutes
  ) THEN RAISE(ABORT,'LIVE_BOOKING_TRANSFER_INVALID') END;
END;

CREATE TRIGGER IF NOT EXISTS smv_domain_live_booking_accept_validate
BEFORE UPDATE OF status ON smv_domain_live_bookings
WHEN NEW.status='accepted' AND OLD.status<>'accepted'
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM smv_domain_live_sessions s
    WHERE s.session_id=NEW.booking_id
      AND s.customer_uid=NEW.customer_uid
      AND s.astrologer_uid=NEW.astrologer_uid
      AND s.state='preparing'
      AND json_extract(s.payload_json,'$.origin')='accepted_booking'
  ) THEN RAISE(ABORT,'LIVE_BOOKING_SESSION_MISSING') END;
END;

-- Cancellation/rejection/expiry releases the exact booking reserve. A booking
-- accepted into a Live Session transfers the reservation to that session.
CREATE TRIGGER IF NOT EXISTS smv_domain_live_booking_release_validate
BEFORE UPDATE OF status,wallet_reservation_state ON smv_domain_live_bookings
WHEN OLD.wallet_reservation_state='reserved'
 AND NEW.status IN ('cancelled','rejected','expired')
 AND NEW.wallet_reservation_state='released'
BEGIN
  SELECT CASE WHEN COALESCE((
    SELECT SUM(l.reserved_delta_paise) FROM smv_domain_wallet_ledger l
    WHERE l.owner_uid=NEW.customer_uid AND l.reference_id=NEW.booking_id
      AND l.reference_type='live_booking'
  ),0)<>0 THEN RAISE(ABORT,'LIVE_BOOKING_CASH_RESERVE_NOT_RELEASED') END;
  SELECT CASE WHEN COALESCE((
    SELECT SUM(l.reserved_bonus_minutes_delta) FROM smv_domain_wallet_ledger l
    WHERE l.owner_uid=NEW.customer_uid AND l.reference_id=NEW.booking_id
      AND l.reference_type='live_booking'
  ),0)<>0 THEN RAISE(ABORT,'LIVE_BOOKING_BONUS_RESERVE_NOT_RELEASED') END;
END;

-- Live-session earnings are created only after a fully reconciled session
-- settlement, and the Astrologer/Admin commission split must equal gross.
CREATE TRIGGER IF NOT EXISTS smv_domain_live_earning_validate
BEFORE INSERT ON smv_domain_earnings
WHEN NEW.source_type='live_session'
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM smv_domain_live_sessions s
    WHERE s.session_id=NEW.reference_id
      AND s.astrologer_uid=NEW.astrologer_uid
      AND s.customer_uid=NEW.customer_uid
      AND s.state='ended'
      AND s.actual_charge_paise=NEW.gross_amount_paise
      AND json_extract(s.payload_json,'$.astrologerCommissionPaise')=NEW.astrologer_amount_paise
      AND json_extract(s.payload_json,'$.adminCommissionPaise')=NEW.admin_amount_paise
  ) THEN RAISE(ABORT,'LIVE_EARNING_SESSION_SETTLEMENT_MISMATCH') END;
  SELECT CASE WHEN NEW.gross_amount_paise<>NEW.astrologer_amount_paise+NEW.admin_amount_paise
    THEN RAISE(ABORT,'LIVE_EARNING_COMMISSION_MISMATCH') END;
END;

INSERT INTO smv_domain_schema_meta (schema_key,schema_version,applied_at_ms)
VALUES ('live-sessions','0006_d1_live_wallet_settlement',CAST(strftime('%s','now') AS INTEGER)*1000)
ON CONFLICT(schema_key) DO UPDATE SET
  schema_version=excluded.schema_version,
  applied_at_ms=excluded.applied_at_ms;
