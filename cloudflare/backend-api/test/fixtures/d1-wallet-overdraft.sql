INSERT INTO smv_domain_wallet_ledger
(ledger_id, owner_uid, owner_role, type, direction, amount_paise, available_delta_paise,
 reserved_delta_paise, bonus_minutes_delta, reserved_bonus_minutes_delta, idempotency_key, created_at_ms)
VALUES ('smoke-overdraft','ci-wallet-smoke','customer','manual_debit','debit',999999,-999999,0,0,0,'overdraft:1',1008);
