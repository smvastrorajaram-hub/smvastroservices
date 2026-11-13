-- Targeted removal of the unrequested Admin Promotional Fund only.
-- This is run by its dedicated, manually dispatched Production D1 workflow.
-- Customer Bonus Credit balances, Offer rows/redemptions, Wallet ledger,
-- Legacy Free Minutes, Live settlement and other D1 objects are not modified.
DROP TRIGGER IF EXISTS smv_domain_promotional_fund_ledger_validate;
DROP TRIGGER IF EXISTS smv_domain_promotional_fund_ledger_apply;
DROP TABLE IF EXISTS smv_domain_promotional_fund_ledger;
DROP TABLE IF EXISTS smv_domain_promotional_fund;
