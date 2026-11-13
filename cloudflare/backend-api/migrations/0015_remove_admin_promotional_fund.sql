-- Remove only the unrequested Admin Promotional Fund feature.
-- Customer Bonus Credit balances, Offer redemptions, Wallet ledger and Live
-- settlement tables are intentionally not touched.
DROP TRIGGER IF EXISTS smv_domain_promotional_fund_ledger_validate;
DROP TRIGGER IF EXISTS smv_domain_promotional_fund_ledger_apply;
DROP TABLE IF EXISTS smv_domain_promotional_fund_ledger;
DROP TABLE IF EXISTS smv_domain_promotional_fund;
