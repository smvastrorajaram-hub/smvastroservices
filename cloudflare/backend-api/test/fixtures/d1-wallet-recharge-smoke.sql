DELETE FROM smv_domain_offer_redemptions WHERE recharge_id='ci-recharge-smoke';
DELETE FROM smv_domain_offer_usage WHERE offer_id='ci-offer-smoke';
DELETE FROM smv_domain_wallet_ledger WHERE owner_uid='ci-wallet-recharge-smoke';
DELETE FROM smv_domain_wallet_recharges WHERE recharge_id='ci-recharge-smoke';
DELETE FROM smv_domain_razorpay_orders WHERE order_id='order_ci_wallet_smoke';
DELETE FROM smv_domain_wallet_offers WHERE offer_id='ci-offer-smoke';
DELETE FROM smv_domain_wallets WHERE owner_uid='ci-wallet-recharge-smoke';

INSERT INTO smv_domain_wallets
(owner_uid,owner_role,currency,available_balance_paise,reserved_balance_paise,
 bonus_minutes_balance,reserved_bonus_minutes,version,created_at_ms,updated_at_ms)
VALUES ('ci-wallet-recharge-smoke','customer','INR',0,0,0,0,1,1000,1000);

INSERT INTO smv_domain_wallet_recharges
(recharge_id,customer_uid,amount_paise,currency,status,razorpay_order_id,payload_json,created_at_ms,updated_at_ms)
VALUES ('ci-recharge-smoke','ci-wallet-recharge-smoke',5000,'INR','order_created','order_ci_wallet_smoke','{}',1000,1000);

INSERT INTO smv_domain_wallet_offers
(offer_id,enabled,minimum_recharge_paise,bonus_minutes,per_customer_limit,total_usage_limit,
 used_count,priority,payload_json,created_at_ms,updated_at_ms)
VALUES ('ci-offer-smoke',1,1000,3,1,10,0,50,'{"name":"CI smoke offer"}',1000,1000);

INSERT INTO smv_domain_razorpay_orders
(order_id,owner_uid,service_name,amount_paise,currency,status,payload_json,created_at_ms,updated_at_ms)
VALUES ('order_ci_wallet_smoke','ci-wallet-recharge-smoke','SMV ASTRO Wallet Recharge',5000,'INR','created','{"rechargeId":"ci-recharge-smoke"}',1000,1000);

INSERT INTO smv_domain_wallet_ledger
(ledger_id,owner_uid,owner_role,currency,type,direction,amount_paise,available_delta_paise,
 reserved_delta_paise,bonus_minutes_delta,reserved_bonus_minutes_delta,idempotency_key,
 reference_type,reference_id,note,metadata_json,status,created_at_ms)
VALUES ('ci-recharge-cash','ci-wallet-recharge-smoke','customer','INR','recharge','credit',5000,5000,
 0,0,0,'recharge:pay_ci_smoke','razorpay_payment','pay_ci_smoke','Wallet recharge','{}','posted',2000);

INSERT INTO smv_domain_wallet_ledger
(ledger_id,owner_uid,owner_role,currency,type,direction,amount_paise,available_delta_paise,
 reserved_delta_paise,bonus_minutes_delta,reserved_bonus_minutes_delta,idempotency_key,
 reference_type,reference_id,note,metadata_json,status,created_at_ms)
VALUES ('ci-recharge-bonus','ci-wallet-recharge-smoke','customer','INR','recharge_bonus_minutes','credit',0,0,
 0,3,0,'recharge-bonus:pay_ci_smoke','razorpay_payment','pay_ci_smoke','Wallet recharge bonus','{}','posted',2000);

INSERT INTO smv_domain_offer_redemptions
(redemption_id,offer_id,customer_uid,recharge_id,amount_paise,bonus_minutes,created_at_ms)
VALUES ('ci-redemption-smoke','ci-offer-smoke','ci-wallet-recharge-smoke','ci-recharge-smoke',5000,3,2000);

UPDATE smv_domain_razorpay_orders
SET status='paid',payment_id='pay_ci_smoke',updated_at_ms=2000
WHERE order_id='order_ci_wallet_smoke';

UPDATE smv_domain_wallet_recharges
SET status='paid',razorpay_payment_id='pay_ci_smoke',paid_at_ms=2000,updated_at_ms=2000
WHERE recharge_id='ci-recharge-smoke';

CREATE TABLE IF NOT EXISTS _smv_recharge_smoke_assert (assert_id INTEGER PRIMARY KEY,ok INTEGER NOT NULL CHECK(ok=1));
DELETE FROM _smv_recharge_smoke_assert;
INSERT INTO _smv_recharge_smoke_assert(assert_id,ok)
SELECT 1, CASE WHEN
  (SELECT available_balance_paise=5000 AND bonus_minutes_balance=3 AND reserved_balance_paise=0 AND version=3
   FROM smv_domain_wallets WHERE owner_uid='ci-wallet-recharge-smoke')
  AND (SELECT COUNT(*)=2 FROM smv_domain_wallet_ledger WHERE owner_uid='ci-wallet-recharge-smoke')
  AND (SELECT COUNT(*)=1 FROM smv_domain_offer_redemptions WHERE recharge_id='ci-recharge-smoke')
  AND (SELECT used_count=1 FROM smv_domain_wallet_offers WHERE offer_id='ci-offer-smoke')
  AND (SELECT redemption_count=1 FROM smv_domain_offer_usage WHERE offer_id='ci-offer-smoke' AND customer_uid='ci-wallet-recharge-smoke')
  AND (SELECT status='paid' AND razorpay_payment_id='pay_ci_smoke' FROM smv_domain_wallet_recharges WHERE recharge_id='ci-recharge-smoke')
  AND (SELECT status='paid' AND payment_id='pay_ci_smoke' FROM smv_domain_razorpay_orders WHERE order_id='order_ci_wallet_smoke')
  THEN 1 ELSE 0 END;
