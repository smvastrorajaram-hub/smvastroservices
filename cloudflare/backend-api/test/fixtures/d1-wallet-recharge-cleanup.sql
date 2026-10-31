DELETE FROM _smv_recharge_smoke_assert;
DELETE FROM smv_domain_offer_redemptions WHERE customer_uid='ci-wallet-recharge-smoke';
DELETE FROM smv_domain_wallet_offer_redemption_usage WHERE customer_uid='ci-wallet-recharge-smoke';
DELETE FROM smv_domain_wallet_ledger WHERE owner_uid='ci-wallet-recharge-smoke';
DELETE FROM smv_domain_wallet_recharges WHERE customer_uid='ci-wallet-recharge-smoke';
DELETE FROM smv_domain_razorpay_orders WHERE owner_uid='ci-wallet-recharge-smoke';
DELETE FROM smv_domain_wallet_offers WHERE offer_id='ci-offer-smoke';
DELETE FROM smv_domain_wallets WHERE owner_uid='ci-wallet-recharge-smoke';

DELETE FROM smv_domain_wallet_ledger WHERE owner_uid='ci-wallet-premature';
DELETE FROM smv_domain_wallet_recharges WHERE recharge_id='ci-recharge-premature';
DELETE FROM smv_domain_razorpay_orders WHERE order_id='order_ci_premature';
DELETE FROM smv_domain_wallets WHERE owner_uid='ci-wallet-premature';
