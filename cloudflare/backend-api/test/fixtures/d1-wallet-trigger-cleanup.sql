DELETE FROM smv_domain_wallet_ledger WHERE owner_uid = 'ci-wallet-smoke';
DELETE FROM smv_domain_wallets WHERE owner_uid = 'ci-wallet-smoke';
DELETE FROM _smv_domain_smoke_assert;
