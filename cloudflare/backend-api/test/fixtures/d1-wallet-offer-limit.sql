INSERT INTO smv_domain_wallet_recharges
(recharge_id,customer_uid,amount_paise,currency,status,razorpay_order_id,payload_json,created_at_ms,updated_at_ms)
VALUES ('ci-recharge-smoke-2','ci-wallet-recharge-smoke',5000,'INR','order_created','order_ci_wallet_smoke_2','{}',3000,3000);

INSERT INTO smv_domain_offer_redemptions
(redemption_id,offer_id,customer_uid,recharge_id,amount_paise,bonus_minutes,created_at_ms)
VALUES ('ci-redemption-smoke-2','ci-offer-smoke','ci-wallet-recharge-smoke','ci-recharge-smoke-2',5000,3,3000);
