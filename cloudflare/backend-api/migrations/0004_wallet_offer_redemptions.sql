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

INSERT INTO smv_domain_schema_meta (schema_key, schema_version, applied_at_ms)
VALUES ('wallet-recharges', '0004_wallet_offer_redemptions', CAST(strftime('%s','now') AS INTEGER) * 1000)
ON CONFLICT(schema_key) DO UPDATE SET
  schema_version = excluded.schema_version,
  applied_at_ms = excluded.applied_at_ms;
