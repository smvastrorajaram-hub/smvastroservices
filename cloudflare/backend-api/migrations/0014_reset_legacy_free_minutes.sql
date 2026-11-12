-- User-authorized reset of the available, historical Legacy Free Minutes wallet balance.
-- Every non-zero Customer balance is cleared through the Wallet ledger so the existing
-- AFTER INSERT ledger trigger records the previous value and applies the balance change.
-- Cash, Bonus Credit, reserved minutes (for any pre-existing legacy reservation), and
-- archived legacy transaction/recharge rows are deliberately untouched.
INSERT INTO smv_domain_wallet_ledger (
  ledger_id, owner_uid, owner_role, currency, type, direction, amount_paise,
  available_delta_paise, reserved_delta_paise, bonus_minutes_delta,
  reserved_bonus_minutes_delta, bonus_credit_delta_paise,
  reserved_bonus_credit_delta_paise, idempotency_key, reference_type,
  reference_id, note, metadata_json, status, source, created_at_ms
)
SELECT
  'legacy-free-minutes-reset-' || lower(hex(randomblob(16))),
  w.owner_uid, w.owner_role, 'INR',
  'legacy_free_minutes_reset', 'debit', 0,
  0, 0, -w.bonus_minutes_balance,
  0, 0, 0,
  'legacy-free-minutes-reset-20261112-v1',
  'legacy_wallet_balance_reset', 'legacy-free-minutes-reset-20261112',
  'Legacy Free Minutes reset to zero at Customer request; no cash or Bonus Credit conversion.',
  json_object(
    'reason', 'user_requested_legacy_free_minutes_reset',
    'previousBalanceMinutes', w.bonus_minutes_balance,
    'resetVersion', '20261112-v1'
  ),
  'posted', 'migration', CAST(strftime('%s','now') AS INTEGER) * 1000
FROM smv_domain_wallets AS w
WHERE w.owner_role = 'customer'
  AND w.bonus_minutes_balance > 0
  AND NOT EXISTS (
    SELECT 1
    FROM smv_domain_wallet_ledger AS existing
    WHERE existing.owner_uid = w.owner_uid
      AND existing.idempotency_key = 'legacy-free-minutes-reset-20261112-v1'
  );
