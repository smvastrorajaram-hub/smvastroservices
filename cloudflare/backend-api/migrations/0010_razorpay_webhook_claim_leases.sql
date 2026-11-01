-- Atomic, lease-backed Razorpay webhook event claims.
-- Additive only: existing processed events and inbox history are preserved.
ALTER TABLE smv_domain_razorpay_webhook_events
  ADD COLUMN claim_token TEXT;

ALTER TABLE smv_domain_razorpay_webhook_events
  ADD COLUMN lease_until_ms INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_smv_domain_razorpay_webhook_claim_lease
  ON smv_domain_razorpay_webhook_events(processed, lease_until_ms, received_at_ms);
