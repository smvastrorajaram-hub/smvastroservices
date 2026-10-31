DELETE FROM _smv_backfill_assert;
DELETE FROM smv_domain_legacy_documents WHERE document_id IN ('ci-legacy-wallet','ci-legacy-ledger','ci-legacy-recharge');
DELETE FROM smv_domain_legacy_wallet_transactions WHERE source_document_id='ci-legacy-ledger';
DELETE FROM smv_domain_legacy_wallet_recharges WHERE recharge_id='ci-legacy-recharge';
DELETE FROM smv_domain_wallet_recharges WHERE recharge_id='ci-legacy-recharge';
DELETE FROM smv_domain_wallet_offers WHERE offer_id='ci-backfill-offer';
DELETE FROM smv_domain_wallets WHERE owner_uid='ci-backfill-wallet';
