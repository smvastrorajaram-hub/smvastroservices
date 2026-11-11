-- Rupee-denominated promotional Bonus Credit, kept separate from cash and legacy minute balances.
ALTER TABLE smv_domain_wallets ADD COLUMN bonus_credit_balance_paise INTEGER NOT NULL DEFAULT 0 CHECK (bonus_credit_balance_paise BETWEEN 0 AND 9007199254740991);
ALTER TABLE smv_domain_wallets ADD COLUMN reserved_bonus_credit_paise INTEGER NOT NULL DEFAULT 0 CHECK (reserved_bonus_credit_paise BETWEEN 0 AND 9007199254740991);

ALTER TABLE smv_domain_wallet_ledger ADD COLUMN bonus_credit_delta_paise INTEGER NOT NULL DEFAULT 0;
ALTER TABLE smv_domain_wallet_ledger ADD COLUMN reserved_bonus_credit_delta_paise INTEGER NOT NULL DEFAULT 0;
ALTER TABLE smv_domain_wallet_ledger ADD COLUMN bonus_credit_balance_after_paise INTEGER;
ALTER TABLE smv_domain_wallet_ledger ADD COLUMN reserved_bonus_credit_balance_after_paise INTEGER;

ALTER TABLE smv_domain_wallet_offers ADD COLUMN bonus_credit_paise INTEGER NOT NULL DEFAULT 0 CHECK (bonus_credit_paise BETWEEN 0 AND 9007199254740991);
ALTER TABLE smv_domain_offer_redemptions ADD COLUMN bonus_credit_paise INTEGER NOT NULL DEFAULT 0 CHECK (bonus_credit_paise BETWEEN 0 AND 9007199254740991);

ALTER TABLE smv_domain_live_sessions ADD COLUMN reserved_bonus_credit_paise INTEGER NOT NULL DEFAULT 0 CHECK (reserved_bonus_credit_paise BETWEEN 0 AND 9007199254740991);
ALTER TABLE smv_domain_live_bookings ADD COLUMN reserved_bonus_credit_paise INTEGER NOT NULL DEFAULT 0 CHECK (reserved_bonus_credit_paise BETWEEN 0 AND 9007199254740991);

-- Old minute-only offers are no longer awarded. Their counters and already-issued
-- minute balances remain intact for audit; no guessed rupee conversion is made.
UPDATE smv_domain_wallet_offers
SET enabled=0, updated_at_ms=CAST(strftime('%s','now') AS INTEGER)*1000
WHERE bonus_credit_paise=0 AND bonus_minutes>0;

DROP TRIGGER IF EXISTS smv_domain_wallet_ledger_validate;
DROP TRIGGER IF EXISTS smv_domain_wallet_ledger_apply;
CREATE TRIGGER smv_domain_wallet_ledger_validate
BEFORE INSERT ON smv_domain_wallet_ledger
BEGIN
  SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM smv_domain_wallets WHERE owner_uid=NEW.owner_uid)
    THEN RAISE(ABORT,'WALLET_OWNER_NOT_FOUND') END;
  SELECT CASE WHEN (SELECT owner_role FROM smv_domain_wallets WHERE owner_uid=NEW.owner_uid)<>NEW.owner_role
    THEN RAISE(ABORT,'WALLET_OWNER_ROLE_MISMATCH') END;
  SELECT CASE WHEN (SELECT available_balance_paise+NEW.available_delta_paise FROM smv_domain_wallets WHERE owner_uid=NEW.owner_uid)<0
    THEN RAISE(ABORT,'WALLET_INSUFFICIENT_BALANCE') END;
  SELECT CASE WHEN (SELECT reserved_balance_paise+NEW.reserved_delta_paise FROM smv_domain_wallets WHERE owner_uid=NEW.owner_uid)<0
    THEN RAISE(ABORT,'WALLET_RESERVED_BALANCE_MISMATCH') END;
  SELECT CASE WHEN (SELECT bonus_minutes_balance+NEW.bonus_minutes_delta FROM smv_domain_wallets WHERE owner_uid=NEW.owner_uid)<0
    THEN RAISE(ABORT,'WALLET_BONUS_BALANCE_MISMATCH') END;
  SELECT CASE WHEN (SELECT reserved_bonus_minutes+NEW.reserved_bonus_minutes_delta FROM smv_domain_wallets WHERE owner_uid=NEW.owner_uid)<0
    THEN RAISE(ABORT,'WALLET_RESERVED_BONUS_MISMATCH') END;
  SELECT CASE WHEN (SELECT bonus_credit_balance_paise+NEW.bonus_credit_delta_paise FROM smv_domain_wallets WHERE owner_uid=NEW.owner_uid)<0
    THEN RAISE(ABORT,'WALLET_BONUS_CREDIT_BALANCE_MISMATCH') END;
  SELECT CASE WHEN (SELECT reserved_bonus_credit_paise+NEW.reserved_bonus_credit_delta_paise FROM smv_domain_wallets WHERE owner_uid=NEW.owner_uid)<0
    THEN RAISE(ABORT,'WALLET_RESERVED_BONUS_CREDIT_MISMATCH') END;
  SELECT CASE WHEN
    (SELECT available_balance_paise+NEW.available_delta_paise FROM smv_domain_wallets WHERE owner_uid=NEW.owner_uid)>9007199254740991 OR
    (SELECT reserved_balance_paise+NEW.reserved_delta_paise FROM smv_domain_wallets WHERE owner_uid=NEW.owner_uid)>9007199254740991 OR
    (SELECT bonus_credit_balance_paise+NEW.bonus_credit_delta_paise FROM smv_domain_wallets WHERE owner_uid=NEW.owner_uid)>9007199254740991 OR
    (SELECT reserved_bonus_credit_paise+NEW.reserved_bonus_credit_delta_paise FROM smv_domain_wallets WHERE owner_uid=NEW.owner_uid)>9007199254740991
    THEN RAISE(ABORT,'WALLET_BALANCE_OVERFLOW') END;
  SELECT CASE WHEN
    (SELECT bonus_minutes_balance+NEW.bonus_minutes_delta FROM smv_domain_wallets WHERE owner_uid=NEW.owner_uid)>1000000 OR
    (SELECT reserved_bonus_minutes+NEW.reserved_bonus_minutes_delta FROM smv_domain_wallets WHERE owner_uid=NEW.owner_uid)>1000000
    THEN RAISE(ABORT,'WALLET_BALANCE_OVERFLOW') END;
END;

CREATE TRIGGER smv_domain_wallet_ledger_apply
AFTER INSERT ON smv_domain_wallet_ledger
BEGIN
  UPDATE smv_domain_wallets
  SET available_balance_paise=available_balance_paise+NEW.available_delta_paise,
      reserved_balance_paise=reserved_balance_paise+NEW.reserved_delta_paise,
      bonus_minutes_balance=bonus_minutes_balance+NEW.bonus_minutes_delta,
      reserved_bonus_minutes=reserved_bonus_minutes+NEW.reserved_bonus_minutes_delta,
      bonus_credit_balance_paise=bonus_credit_balance_paise+NEW.bonus_credit_delta_paise,
      reserved_bonus_credit_paise=reserved_bonus_credit_paise+NEW.reserved_bonus_credit_delta_paise,
      version=version+1,updated_at_ms=NEW.created_at_ms
  WHERE owner_uid=NEW.owner_uid;
  UPDATE smv_domain_wallet_ledger
  SET balance_after_paise=(SELECT available_balance_paise FROM smv_domain_wallets WHERE owner_uid=NEW.owner_uid),
      reserved_balance_after_paise=(SELECT reserved_balance_paise FROM smv_domain_wallets WHERE owner_uid=NEW.owner_uid),
      bonus_minutes_balance_after=(SELECT bonus_minutes_balance FROM smv_domain_wallets WHERE owner_uid=NEW.owner_uid),
      reserved_bonus_minutes_after=(SELECT reserved_bonus_minutes FROM smv_domain_wallets WHERE owner_uid=NEW.owner_uid),
      bonus_credit_balance_after_paise=(SELECT bonus_credit_balance_paise FROM smv_domain_wallets WHERE owner_uid=NEW.owner_uid),
      reserved_bonus_credit_balance_after_paise=(SELECT reserved_bonus_credit_paise FROM smv_domain_wallets WHERE owner_uid=NEW.owner_uid)
  WHERE ledger_id=NEW.ledger_id;
END;

-- Replace the minute-era offer claim with a credit-valued claim.
DROP TRIGGER IF EXISTS smv_domain_offer_redemption_validate;
DROP TRIGGER IF EXISTS smv_domain_offer_redemption_apply;
CREATE TRIGGER smv_domain_offer_redemption_validate
BEFORE INSERT ON smv_domain_offer_redemptions
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM smv_domain_wallet_recharges r
    WHERE r.recharge_id=NEW.recharge_id AND r.customer_uid=NEW.customer_uid
      AND r.amount_paise=NEW.amount_paise AND r.status='order_created'
  ) THEN RAISE(ABORT,'WALLET_RECHARGE_NOT_READY') END;
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM smv_domain_wallet_offers o
    WHERE o.offer_id=NEW.offer_id AND o.enabled=1
      AND NEW.amount_paise>=o.minimum_recharge_paise
      AND NEW.bonus_credit_paise=o.bonus_credit_paise AND NEW.bonus_credit_paise>0
      AND NEW.bonus_minutes=1
      AND (o.start_at_ms IS NULL OR NEW.created_at_ms>=o.start_at_ms)
      AND (o.end_at_ms IS NULL OR NEW.created_at_ms<o.end_at_ms)
  ) THEN RAISE(ABORT,'WALLET_OFFER_NOT_ELIGIBLE') END;
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM smv_domain_wallet_offers o WHERE o.offer_id=NEW.offer_id
      AND o.total_usage_limit>0 AND o.used_count>=o.total_usage_limit
  ) THEN RAISE(ABORT,'WALLET_OFFER_TOTAL_LIMIT_REACHED') END;
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM smv_domain_wallet_offers o
    LEFT JOIN smv_domain_wallet_offer_redemption_usage u
      ON u.offer_id=o.offer_id AND u.customer_uid=NEW.customer_uid
    WHERE o.offer_id=NEW.offer_id AND o.per_customer_limit>0
      AND COALESCE(u.redemption_count,0)>=o.per_customer_limit
  ) THEN RAISE(ABORT,'WALLET_OFFER_CUSTOMER_LIMIT_REACHED') END;
END;
CREATE TRIGGER smv_domain_offer_redemption_apply
AFTER INSERT ON smv_domain_offer_redemptions
BEGIN
  UPDATE smv_domain_wallet_offers SET used_count=used_count+1,updated_at_ms=NEW.created_at_ms
  WHERE offer_id=NEW.offer_id;
  INSERT INTO smv_domain_wallet_offer_redemption_usage
    (offer_id,customer_uid,redemption_count,last_recharge_id,updated_at_ms)
  VALUES (NEW.offer_id,NEW.customer_uid,1,NEW.recharge_id,NEW.created_at_ms)
  ON CONFLICT(offer_id,customer_uid) DO UPDATE SET
    redemption_count=redemption_count+1,last_recharge_id=excluded.last_recharge_id,
    updated_at_ms=excluded.updated_at_ms;
END;

-- Enforce new Bonus Credit reservation parity for direct sessions and bookings.
DROP TRIGGER IF EXISTS smv_domain_live_session_reserve_validate;
CREATE TRIGGER smv_domain_live_session_reserve_validate
BEFORE INSERT ON smv_domain_live_sessions
WHEN COALESCE(json_extract(NEW.payload_json,'$.origin'),'') NOT IN ('legacy_unreserved','legacy_import')
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM smv_domain_wallet_ledger l
    WHERE l.owner_uid=NEW.customer_uid AND l.reference_id=NEW.session_id
      AND l.direction='reserve' AND l.amount_paise=NEW.reserved_amount_paise
      AND l.reserved_delta_paise=NEW.reserved_amount_paise
      AND l.reserved_bonus_minutes_delta=NEW.reserved_bonus_minutes
      AND l.reserved_bonus_credit_delta_paise=NEW.reserved_bonus_credit_paise
      AND l.reference_type=CASE
        WHEN json_extract(NEW.payload_json,'$.origin') IN ('accepted_booking','offline_queue') THEN 'live_booking'
        ELSE 'live_session' END
      AND l.type=CASE
        WHEN json_extract(NEW.payload_json,'$.origin') IN ('accepted_booking','offline_queue') THEN 'live_booking_reserve'
        ELSE 'live_session_reserve' END
  ) THEN RAISE(ABORT,'LIVE_SESSION_RESERVE_MISSING') END;
END;

DROP TRIGGER IF EXISTS smv_domain_live_booking_reserve_validate;
CREATE TRIGGER smv_domain_live_booking_reserve_validate
BEFORE INSERT ON smv_domain_live_bookings
WHEN NEW.wallet_reservation_state='reserved'
 AND COALESCE(json_extract(NEW.payload_json,'$.origin'),'')<>'legacy_import'
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM smv_domain_wallet_ledger l
    WHERE l.owner_uid=NEW.customer_uid AND l.reference_id=NEW.booking_id
      AND l.reference_type='live_booking' AND l.type='live_booking_reserve'
      AND l.direction='reserve' AND l.amount_paise=NEW.reserved_amount_paise
      AND l.reserved_delta_paise=NEW.reserved_amount_paise
      AND l.reserved_bonus_minutes_delta=NEW.reserved_bonus_minutes
      AND l.reserved_bonus_credit_delta_paise=NEW.reserved_bonus_credit_paise
  ) THEN RAISE(ABORT,'LIVE_BOOKING_RESERVE_MISSING') END;
END;

DROP TRIGGER IF EXISTS smv_domain_live_session_booking_transfer_validate;
CREATE TRIGGER smv_domain_live_session_booking_transfer_validate
BEFORE INSERT ON smv_domain_live_sessions
WHEN json_extract(NEW.payload_json,'$.origin')='accepted_booking'
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM smv_domain_live_bookings b
    WHERE b.booking_id=NEW.session_id AND b.customer_uid=NEW.customer_uid
      AND b.astrologer_uid=NEW.astrologer_uid AND b.status='pending'
      AND b.wallet_reservation_state='reserved'
      AND b.reserved_amount_paise=NEW.reserved_amount_paise
      AND b.reserved_bonus_minutes=NEW.reserved_bonus_minutes
      AND b.reserved_bonus_credit_paise=NEW.reserved_bonus_credit_paise
  ) THEN RAISE(ABORT,'LIVE_BOOKING_TRANSFER_INVALID') END;
END;

-- New credit usage/release ledgers are part of the same guarded settlement.
DROP TRIGGER IF EXISTS smv_domain_live_settlement_ledger_validate;
CREATE TRIGGER smv_domain_live_settlement_ledger_validate
BEFORE INSERT ON smv_domain_wallet_ledger
WHEN NEW.type IN (
  'live_session_usage','live_session_bonus_minutes','live_session_bonus_minutes_release',
  'live_session_bonus_credit_used','live_session_bonus_credit_release',
  'live_session_unused_release','live_session_settlement_marker'
)
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM smv_domain_live_sessions s
    WHERE s.session_id=NEW.reference_id AND s.state='settling'
  ) THEN RAISE(ABORT,'LIVE_SESSION_NOT_SETTLING') END;
END;

DROP TRIGGER IF EXISTS smv_domain_live_session_settlement_validate;
CREATE TRIGGER smv_domain_live_session_settlement_validate
BEFORE UPDATE OF state ON smv_domain_live_sessions
WHEN NEW.state='ended' AND OLD.state<>'ended'
BEGIN
  SELECT CASE WHEN COALESCE((
    SELECT SUM(l.reserved_delta_paise) FROM smv_domain_wallet_ledger l
    WHERE l.owner_uid=NEW.customer_uid AND l.reference_id=NEW.session_id
      AND l.reference_type=CASE WHEN json_extract(NEW.payload_json,'$.origin') IN ('accepted_booking','offline_queue')
        THEN 'live_booking' ELSE 'live_session' END
  ),0)<>0 THEN RAISE(ABORT,'LIVE_SESSION_CASH_RESERVE_NOT_SETTLED') END;
  SELECT CASE WHEN COALESCE((
    SELECT SUM(l.reserved_bonus_minutes_delta) FROM smv_domain_wallet_ledger l
    WHERE l.owner_uid=NEW.customer_uid AND l.reference_id=NEW.session_id
      AND l.reference_type=CASE WHEN json_extract(NEW.payload_json,'$.origin') IN ('accepted_booking','offline_queue')
        THEN 'live_booking' ELSE 'live_session' END
  ),0)<>0 THEN RAISE(ABORT,'LIVE_SESSION_BONUS_RESERVE_NOT_SETTLED') END;
  SELECT CASE WHEN COALESCE((
    SELECT SUM(l.reserved_bonus_credit_delta_paise) FROM smv_domain_wallet_ledger l
    WHERE l.owner_uid=NEW.customer_uid AND l.reference_id=NEW.session_id
      AND l.reference_type=CASE WHEN json_extract(NEW.payload_json,'$.origin') IN ('accepted_booking','offline_queue')
        THEN 'live_booking' ELSE 'live_session' END
  ),0)<>0 THEN RAISE(ABORT,'LIVE_SESSION_BONUS_CREDIT_RESERVE_NOT_SETTLED') END;
END;

DROP TRIGGER IF EXISTS smv_domain_live_booking_release_pending_validate;
CREATE TRIGGER smv_domain_live_booking_release_pending_validate
BEFORE INSERT ON smv_domain_wallet_ledger
WHEN NEW.owner_role='customer' AND NEW.reference_type='live_booking'
 AND NEW.type IN ('live_booking_unused_release','live_booking_bonus_release','live_booking_bonus_credit_release')
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM smv_domain_live_bookings b
    WHERE b.booking_id=NEW.reference_id AND b.customer_uid=NEW.owner_uid
      AND b.status='pending' AND b.wallet_reservation_state='reserved'
  ) THEN RAISE(ABORT,'LIVE_BOOKING_RELEASE_NOT_PENDING') END;
END;

INSERT INTO smv_domain_schema_meta(schema_key,schema_version,applied_at_ms)
VALUES ('bonus-credit-wallet','0013_bonus_credit_wallet',CAST(strftime('%s','now') AS INTEGER)*1000)
ON CONFLICT(schema_key) DO UPDATE SET schema_version=excluded.schema_version,applied_at_ms=excluded.applied_at_ms;
