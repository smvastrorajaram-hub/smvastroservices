-- Guard stale cancellation/rejection/expiry workers after a booking has
-- atomically transferred its Wallet reservation into an accepted Live Session.
-- The release ledger INSERT is the actual Wallet mutation, so it must verify
-- that the booking is still pending/reserved before the Wallet trigger applies it.
CREATE TRIGGER IF NOT EXISTS smv_domain_live_booking_release_pending_validate
BEFORE INSERT ON smv_domain_wallet_ledger
WHEN NEW.owner_role='customer'
 AND NEW.reference_type='live_booking'
 AND NEW.type IN ('live_booking_unused_release','live_booking_bonus_release')
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1
    FROM smv_domain_live_bookings b
    WHERE b.booking_id=NEW.reference_id
      AND b.customer_uid=NEW.owner_uid
      AND b.status='pending'
      AND b.wallet_reservation_state='reserved'
  ) THEN RAISE(ABORT,'LIVE_BOOKING_RELEASE_NOT_PENDING') END;
END;

INSERT INTO smv_domain_schema_meta (schema_key,schema_version,applied_at_ms)
VALUES ('live-booking-release-guard','0011_live_booking_release_claim',CAST(strftime('%s','now') AS INTEGER)*1000)
ON CONFLICT(schema_key) DO UPDATE SET
  schema_version=excluded.schema_version,
  applied_at_ms=excluded.applied_at_ms;
