DELETE FROM smv_domain_wallet_ledger WHERE owner_uid='ci-wallet-premature';
DELETE FROM smv_domain_offer_redemptions WHERE recharge_id='ci-recharge-premature';
DELETE FROM smv_domain_wallet_recharges WHERE recharge_id='ci-recharge-premature';
DELETE FROM smv_domain_razorpay_orders WHERE order_id='order_ci_premature';
DELETE FROM smv_domain_wallets WHERE owner_uid='ci-wallet-premature';

INSERT INTO smv_domain_wallets
(owner_uid,owner_role,currency,available_balance_paise,reserved_balance_paise,
 bonus_minutes_balance,reserved_bonus_minutes,version,created_at_ms,updated_at_ms)
VALUES ('ci-wallet-premature','customer','INR',0,0,0,0,1,1000,1000);

INSERT INTO smv_domain_wallet_recharges
(recharge_id,customer_uid,amount_paise,currency,status,razorpay_order_id,payload_json,created_at_ms,updated_at_ms)
VALUES ('ci-recharge-premature','ci-wallet-premature',5000,'INR','order_created','order_ci_premature','{}',1000,1000);

INSERT INTO smv_domain_razorpay_orders
(order_id,owner_uid,service_name,amount_paise,currency,status,payload_json,created_at_ms,updated_at_ms)
VALUES ('order_ci_premature','ci-wallet-premature','SMV ASTRO Wallet Recharge',5000,'INR','created','{"rechargeId":"ci-recharge-premature"}',1000,1000);

UPDATE smv_domain_razorpay_orders
SET status='paid',payment_id='pay_ci_premature',updated_at_ms=2000
WHERE order_id='order_ci_premature';

-- There is intentionally no matching cash ledger entry. This UPDATE must abort.
UPDATE smv_domain_wallet_recharges
SET status='paid',razorpay_payment_id='pay_ci_premature',paid_at_ms=2000,updated_at_ms=2000
WHERE recharge_id='ci-recharge-premature';
