-- Local-only smoke fixture for lossless legacy Wallet snapshot/history import.
CREATE TABLE IF NOT EXISTS _smv_backfill_assert(assert_id INTEGER PRIMARY KEY,ok INTEGER NOT NULL CHECK(ok=1));
DELETE FROM _smv_backfill_assert;
DELETE FROM smv_domain_legacy_documents WHERE document_id IN ('ci-legacy-wallet','ci-legacy-ledger','ci-legacy-recharge');
DELETE FROM smv_domain_legacy_wallet_transactions WHERE source_document_id='ci-legacy-ledger';
DELETE FROM smv_domain_legacy_wallet_recharges WHERE recharge_id='ci-legacy-recharge';
DELETE FROM smv_domain_wallet_recharges WHERE recharge_id='ci-legacy-recharge';
DELETE FROM smv_domain_wallet_offers WHERE offer_id='ci-backfill-offer';
DELETE FROM smv_domain_wallets WHERE owner_uid='ci-backfill-wallet';

INSERT INTO smv_domain_wallets
(owner_uid,owner_role,currency,available_balance_paise,reserved_balance_paise,
 bonus_minutes_balance,reserved_bonus_minutes,version,created_at_ms,updated_at_ms)
VALUES ('ci-backfill-wallet','customer','INR',7500,0,5,0,4,1000,2000);

INSERT INTO smv_domain_legacy_wallet_transactions
(source_document_id,owner_uid,owner_role,type,direction,amount_paise,balance_after_paise,
 reserved_balance_after_paise,bonus_minutes,bonus_minutes_credited,bonus_minutes_balance_after,
 reserved_bonus_minutes_after,idempotency_key,reference_type,reference_id,note,metadata_json,
 status,created_at_ms,payload_json)
VALUES ('ci-legacy-ledger','ci-backfill-wallet','customer','recharge','credit',5000,7500,
 0,5,5,5,0,'recharge:legacy-payment','razorpay_payment','legacy-payment',
 'Historical Wallet Recharge','{}','posted',1500,'{}');

INSERT INTO smv_domain_legacy_wallet_recharges
(recharge_id,customer_uid,amount_paise,currency,status,razorpay_order_id,razorpay_payment_id,
 paid_amount_paise,paid_at_ms,created_at_ms,updated_at_ms,payload_json)
VALUES ('ci-legacy-recharge','ci-backfill-wallet',5000,'INR','paid','ci-legacy-order',
 'ci-legacy-payment',5000,1600,1000,1600,'{"bonusMinutesCredited":5}');

-- A linked paid legacy recharge is indexed for idempotent reads, without any new
-- balance/ledger credit; its original cash/bonus history remains archived above.
INSERT INTO smv_domain_wallet_recharges
(recharge_id,customer_uid,amount_paise,currency,status,razorpay_order_id,
 razorpay_payment_id,paid_at_ms,payload_json,created_at_ms,updated_at_ms)
VALUES ('ci-legacy-recharge','ci-backfill-wallet',5000,'INR','paid','ci-legacy-order',
 'ci-legacy-payment',1600,'{"bonusMinutesCredited":5}',1000,1600);

INSERT INTO smv_domain_wallet_offers
(offer_id,enabled,minimum_recharge_paise,bonus_minutes,per_customer_limit,total_usage_limit,
 used_count,priority,start_at_ms,end_at_ms,payload_json,created_at_ms,updated_at_ms,
 legacy_successful_redemptions,legacy_total_bonus_minutes)
VALUES ('ci-backfill-offer',1,5000,5,2,100,20,10,1000,9999999999999,
 '{"name":"Historical Deepavali","bannerTheme":"diwali"}',1000,2000,18,90);

INSERT INTO smv_domain_legacy_documents
(source_collection,document_id,source_update_time_ms,payload_sha256,payload_json,imported_at_ms)
VALUES ('smv_wallets','ci-legacy-wallet',2000,'ci-wallet-hash','{"ownerUid":"ci-backfill-wallet"}',3000);

CREATE TABLE IF NOT EXISTS _smv_backfill_assert(assert_id INTEGER PRIMARY KEY,ok INTEGER NOT NULL CHECK(ok=1));
DELETE FROM _smv_backfill_assert;
INSERT INTO _smv_backfill_assert(assert_id,ok)
SELECT 1,CASE WHEN
  (SELECT available_balance_paise=7500 AND reserved_balance_paise=0
      AND bonus_minutes_balance=5 AND version=4
   FROM smv_domain_wallets WHERE owner_uid='ci-backfill-wallet')
  AND (SELECT COUNT(*)=0 FROM smv_domain_wallet_ledger WHERE owner_uid='ci-backfill-wallet')
  AND (SELECT COUNT(*)=1 FROM smv_domain_legacy_wallet_transactions WHERE owner_uid='ci-backfill-wallet')
  AND (SELECT COUNT(*)=1 FROM smv_domain_legacy_wallet_recharges WHERE recharge_id='ci-legacy-recharge')
  AND (SELECT status='paid' AND razorpay_payment_id='ci-legacy-payment'
       FROM smv_domain_wallet_recharges WHERE recharge_id='ci-legacy-recharge')
  AND (SELECT legacy_successful_redemptions=18 AND legacy_total_bonus_minutes=90
       FROM smv_domain_wallet_offers WHERE offer_id='ci-backfill-offer')
  AND (SELECT COUNT(*)=1 FROM smv_domain_legacy_documents
       WHERE source_collection='smv_wallets' AND document_id='ci-legacy-wallet'
         AND payload_sha256='ci-wallet-hash')
  THEN 1 ELSE 0 END;
