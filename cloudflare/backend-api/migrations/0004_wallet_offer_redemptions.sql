-- Offer redemption claims protect total/per-customer bonus-minute limits under concurrent recharges.
CREATE TABLE IF NOT EXISTS smv_domain_wallet_offer_redemption_usage (
  offer_id TEXT NOT NULL,
  customer_uid TEXT NOT NULL,
  redemption_count INTEGER NOT NULL DEFAULT 0 CHECK (redemption_count >= 0),
  last_recharge_id TEXT,
  updated_at_ms INTEGER NOT NULL,
  PRIMARY KEY (offer_id, customer_uid)
);

CREATE TABLE IF NOT EXISTS smv_domain_offer_redemptions (
  redemption_id TEXT PRIMARY KEY NOT NULL,
  offer_id TEXT NOT NULL,
  customer_uid TEXT NOT NULL,
  recharge_id TEXT NOT NULL UNIQUE,
  amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
  bonus_minutes INTEGER NOT NULL CHECK (bonus_minutes BETWEEN 1 AND 1440),
  created_at_ms INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_smv_domain_offer_redemptions_offer_created
  ON smv_domain_offer_redemptions(offer_id, created_at_ms DESC);
CREATE INDEX IF NOT EXISTS idx_smv_domain_offer_redemptions_customer_offer
  ON smv_domain_offer_redemptions(customer_uid, offer_id, created_at_ms DESC);

CREATE TRIGGER IF NOT EXISTS smv_domain_offer_redemption_validate
BEFORE INSERT ON smv_domain_offer_redemptions
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1
    FROM smv_domain_wallet_recharges r
    WHERE r.recharge_id = NEW.recharge_id
      AND r.customer_uid = NEW.customer_uid
      AND r.amount_paise = NEW.amount_paise
      AND r.status = 'order_created'
  ) THEN RAISE(ABORT, 'WALLET_RECHARGE_NOT_READY') END;

  SELECT CASE WHEN NOT EXISTS (
    SELECT 1
    FROM smv_domain_wallet_offers o
    WHERE o.offer_id = NEW.offer_id
      AND o.enabled = 1
      AND NEW.amount_paise >= o.minimum_recharge_paise
      AND NEW.bonus_minutes = o.bonus_minutes
      AND (o.start_at_ms IS NULL OR NEW.created_at_ms >= o.start_at_ms)
      AND (o.end_at_ms IS NULL OR NEW.created_at_ms < o.end_at_ms)
  ) THEN RAISE(ABORT, 'WALLET_OFFER_NOT_ELIGIBLE') END;

  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM smv_domain_wallet_offers o
    WHERE o.offer_id = NEW.offer_id
      AND o.total_usage_limit > 0
      AND o.used_count >= o.total_usage_limit
  ) THEN RAISE(ABORT, 'WALLET_OFFER_TOTAL_LIMIT_REACHED') END;

  SELECT CASE WHEN EXISTS (
    SELECT 1
    FROM smv_domain_wallet_offers o
    LEFT JOIN smv_domain_wallet_offer_redemption_usage u
      ON u.offer_id = o.offer_id AND u.customer_uid = NEW.customer_uid
    WHERE o.offer_id = NEW.offer_id
      AND o.per_customer_limit > 0
      AND COALESCE(u.redemption_count, 0) >= o.per_customer_limit
  ) THEN RAISE(ABORT, 'WALLET_OFFER_CUSTOMER_LIMIT_REACHED') END;
END;

CREATE TRIGGER IF NOT EXISTS smv_domain_offer_redemption_apply
AFTER INSERT ON smv_domain_offer_redemptions
BEGIN
  UPDATE smv_domain_wallet_offers
  SET used_count = used_count + 1,
      updated_at_ms = NEW.created_at_ms
  WHERE offer_id = NEW.offer_id;

  INSERT INTO smv_domain_wallet_offer_redemption_usage
    (offer_id, customer_uid, redemption_count, last_recharge_id, updated_at_ms)
  VALUES
    (NEW.offer_id, NEW.customer_uid, 1, NEW.recharge_id, NEW.created_at_ms)
  ON CONFLICT(offer_id, customer_uid) DO UPDATE SET
    redemption_count = redemption_count + 1,
    last_recharge_id = excluded.last_recharge_id,
    updated_at_ms = excluded.updated_at_ms;
END;

-- A Wallet order may only be attached to a pending recharge record that
-- already contains the same order ID, owner and amount.
CREATE TRIGGER IF NOT EXISTS smv_domain_wallet_order_attach_validate
BEFORE INSERT ON smv_domain_razorpay_orders
WHEN NEW.service_name = 'SMV ASTRO Wallet Recharge'
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM smv_domain_wallet_recharges r
    WHERE r.recharge_id = json_extract(NEW.payload_json, '$.rechargeId')
      AND r.customer_uid = NEW.owner_uid
      AND r.amount_paise = NEW.amount_paise
      AND r.razorpay_order_id = NEW.order_id
      AND r.status = 'order_created'
  ) THEN RAISE(ABORT, 'WALLET_RECHARGE_ORDER_LINK_INVALID') END;
END;

-- A Wallet Razorpay order cannot be marked paid unless the corresponding
-- recharge is still pending and the same order/payment/amount are recorded.
CREATE TRIGGER IF NOT EXISTS smv_domain_wallet_order_paid_validate
BEFORE UPDATE OF status ON smv_domain_razorpay_orders
WHEN NEW.service_name = 'SMV ASTRO Wallet Recharge'
 AND NEW.status = 'paid' AND OLD.status <> 'paid'
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM smv_domain_wallet_recharges r
    WHERE r.recharge_id = json_extract(NEW.payload_json, '$.rechargeId')
      AND r.customer_uid = NEW.owner_uid
      AND r.amount_paise = NEW.amount_paise
      AND r.razorpay_order_id = NEW.order_id
      AND r.status = 'order_created'
  ) THEN RAISE(ABORT, 'WALLET_RECHARGE_ORDER_LINK_INVALID') END;
END;

-- A recharge cash-ledger entry may only be inserted for the exact pending
-- recharge order/owner/amount. This prevents an orphan ledger credit.
CREATE TRIGGER IF NOT EXISTS smv_domain_recharge_ledger_validate
BEFORE INSERT ON smv_domain_wallet_ledger
WHEN NEW.type = 'recharge'
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM smv_domain_wallet_recharges r
    WHERE r.recharge_id = json_extract(NEW.metadata_json, '$.rechargeId')
      AND r.customer_uid = NEW.owner_uid
      AND r.amount_paise = NEW.amount_paise
      AND r.status = 'order_created'
      AND r.razorpay_order_id = json_extract(NEW.metadata_json, '$.orderId')
  ) THEN RAISE(ABORT, 'WALLET_RECHARGE_NOT_READY') END;
END;

-- A recharge cannot become paid unless the exact cash ledger row and the
-- corresponding Razorpay order have both been marked paid in the same D1 batch.
CREATE TRIGGER IF NOT EXISTS smv_domain_recharge_paid_validate
BEFORE UPDATE OF status ON smv_domain_wallet_recharges
WHEN NEW.status = 'paid' AND OLD.status <> 'paid'
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM smv_domain_wallet_ledger l
    WHERE l.owner_uid = NEW.customer_uid
      AND l.type = 'recharge'
      AND l.direction = 'credit'
      AND l.amount_paise = NEW.amount_paise
      AND l.reference_id = NEW.razorpay_payment_id
      AND l.idempotency_key = 'recharge:' || NEW.razorpay_payment_id
      AND json_extract(l.metadata_json, '$.rechargeId') = NEW.recharge_id
  ) THEN RAISE(ABORT, 'WALLET_RECHARGE_LEDGER_MISSING') END;

  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM smv_domain_razorpay_orders o
    WHERE o.order_id = NEW.razorpay_order_id
      AND o.owner_uid = NEW.customer_uid
      AND o.amount_paise = NEW.amount_paise
      AND o.status = 'paid'
      AND o.payment_id = NEW.razorpay_payment_id
  ) THEN RAISE(ABORT, 'WALLET_RECHARGE_ORDER_NOT_PAID') END;
END;

INSERT INTO smv_domain_schema_meta (schema_key, schema_version, applied_at_ms)
VALUES ('wallet-recharges', '0004_wallet_offer_redemptions', CAST(strftime('%s','now') AS INTEGER) * 1000)
ON CONFLICT(schema_key) DO UPDATE SET
  schema_version = excluded.schema_version,
  applied_at_ms = excluded.applied_at_ms;
