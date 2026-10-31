DELETE FROM smv_domain_wallet_ledger WHERE owner_uid = 'ci-wallet-smoke';
DELETE FROM smv_domain_wallets WHERE owner_uid = 'ci-wallet-smoke';

INSERT INTO smv_domain_wallets
(owner_uid, owner_role, currency, available_balance_paise, reserved_balance_paise,
 bonus_minutes_balance, reserved_bonus_minutes, version, created_at_ms, updated_at_ms)
VALUES ('ci-wallet-smoke', 'customer', 'INR', 0, 0, 2, 0, 1, 1000, 1000);

INSERT INTO smv_domain_wallet_ledger
(ledger_id, owner_uid, owner_role, type, direction, amount_paise, available_delta_paise,
 reserved_delta_paise, bonus_minutes_delta, reserved_bonus_minutes_delta, idempotency_key, created_at_ms)
VALUES ('smoke-credit','ci-wallet-smoke','customer','recharge','credit',5000,5000,0,0,0,'credit:1',1001);

INSERT INTO smv_domain_wallet_ledger
(ledger_id, owner_uid, owner_role, type, direction, amount_paise, available_delta_paise,
 reserved_delta_paise, bonus_minutes_delta, reserved_bonus_minutes_delta, idempotency_key, created_at_ms)
VALUES ('smoke-debit','ci-wallet-smoke','customer','manual_debit','debit',1000,-1000,0,0,0,'debit:1',1002);

INSERT INTO smv_domain_wallet_ledger
(ledger_id, owner_uid, owner_role, type, direction, amount_paise, available_delta_paise,
 reserved_delta_paise, bonus_minutes_delta, reserved_bonus_minutes_delta, idempotency_key, created_at_ms)
VALUES ('smoke-reserve','ci-wallet-smoke','customer','live_session_reserve','reserve',3000,-3000,3000,-2,2,'reserve:1',1003);

INSERT INTO smv_domain_wallet_ledger
(ledger_id, owner_uid, owner_role, type, direction, amount_paise, available_delta_paise,
 reserved_delta_paise, bonus_minutes_delta, reserved_bonus_minutes_delta, idempotency_key, created_at_ms)
VALUES ('smoke-usage','ci-wallet-smoke','customer','live_session_usage','debit',1000,0,-1000,0,0,'usage:1',1004);

INSERT INTO smv_domain_wallet_ledger
(ledger_id, owner_uid, owner_role, type, direction, amount_paise, available_delta_paise,
 reserved_delta_paise, bonus_minutes_delta, reserved_bonus_minutes_delta, idempotency_key, created_at_ms)
VALUES ('smoke-bonus-used','ci-wallet-smoke','customer','live_session_bonus_minutes','debit',0,0,0,0,-1,'bonus-used:1',1005);

INSERT INTO smv_domain_wallet_ledger
(ledger_id, owner_uid, owner_role, type, direction, amount_paise, available_delta_paise,
 reserved_delta_paise, bonus_minutes_delta, reserved_bonus_minutes_delta, idempotency_key, created_at_ms)
VALUES ('smoke-bonus-release','ci-wallet-smoke','customer','live_session_bonus_minutes_release','credit',0,0,0,1,-1,'bonus-release:1',1006);

INSERT INTO smv_domain_wallet_ledger
(ledger_id, owner_uid, owner_role, type, direction, amount_paise, available_delta_paise,
 reserved_delta_paise, bonus_minutes_delta, reserved_bonus_minutes_delta, idempotency_key, created_at_ms)
VALUES ('smoke-cash-release','ci-wallet-smoke','customer','live_session_unused_release','credit',2000,2000,-2000,0,0,'cash-release:1',1007);

CREATE TABLE IF NOT EXISTS _smv_domain_smoke_assert (assert_id INTEGER PRIMARY KEY, ok INTEGER NOT NULL CHECK (ok = 1));
DELETE FROM _smv_domain_smoke_assert;
INSERT INTO _smv_domain_smoke_assert (assert_id, ok)
SELECT 1, CASE WHEN
  (SELECT available_balance_paise = 3000 AND reserved_balance_paise = 0
          AND bonus_minutes_balance = 1 AND reserved_bonus_minutes = 0 AND version = 8
   FROM smv_domain_wallets WHERE owner_uid = 'ci-wallet-smoke')
  AND (SELECT COUNT(*) = 7 FROM smv_domain_wallet_ledger WHERE owner_uid = 'ci-wallet-smoke')
  THEN 1 ELSE 0 END;
