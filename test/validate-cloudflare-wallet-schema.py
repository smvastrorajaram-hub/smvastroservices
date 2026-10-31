#!/usr/bin/env python3
"""Validate the Cloudflare D1 migration against SQLite without any remote credentials."""
from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = ROOT / "cloudflare" / "wallet-api" / "migrations" / "0001_wallet_live_domain.sql"

def main():
    sql = SCHEMA.read_text(encoding="utf-8")
    db = sqlite3.connect(":memory:")
    db.execute("PRAGMA foreign_keys = ON")
    db.executescript(sql)

    row = db.execute(
        "SELECT schema_version FROM smv_wallet_schema_meta WHERE id = 'primary'"
    ).fetchone()
    assert row == ("0001_wallet_live_domain",), row

    expected = {
        "smv_profile_projection", "smv_wallet_accounts", "smv_wallet_ledger",
        "smv_wallet_recharges", "smv_offer_rules", "smv_offer_usage",
        "smv_live_bookings", "smv_live_sessions", "smv_live_messages",
        "smv_webrtc_signals", "smv_commission_entries", "smv_refund_records",
        "smv_withdrawal_requests", "smv_firebase_event_inbox",
        "smv_domain_idempotency", "smv_domain_outbox", "smv_wallet_schema_meta",
    }
    actual = {
        name for (name,) in db.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table'"
        ).fetchall()
    }
    missing = sorted(expected - actual)
    assert not missing, f"Required table(s) missing: {missing}"

    db.execute(
        """INSERT INTO smv_wallet_accounts
        (owner_uid, owner_role, available_balance_paise, created_at_ms, updated_at_ms)
        VALUES ('customer-test', 'customer', 10000, 1, 1)"""
    )
    db.execute(
        """INSERT INTO smv_wallet_ledger
        (entry_id, owner_uid, entry_type, direction, amount_paise,
         balance_after_paise, idempotency_key, created_at_ms)
        VALUES ('ledger-1', 'customer-test', 'test_credit', 'credit', 100, 10100,
                'credit-event-1', 2)"""
    )

    try:
        db.execute(
            """INSERT INTO smv_wallet_ledger
            (entry_id, owner_uid, entry_type, direction, amount_paise,
             balance_after_paise, idempotency_key, created_at_ms)
            VALUES ('ledger-2', 'customer-test', 'test_credit', 'credit', 100, 10200,
                    'credit-event-1', 3)"""
        )
        raise AssertionError("Duplicate wallet ledger idempotency key was accepted")
    except sqlite3.IntegrityError:
        pass

    try:
        db.execute(
            """INSERT INTO smv_withdrawal_requests
            (withdrawal_id, owner_uid, amount_paise, status, requested_at_ms,
             eligible_at_ms, payout_snapshot_json, idempotency_key)
            VALUES ('withdrawal-small', 'customer-test', 29999, 'requested', 1,
                    2, '{}', 'withdrawal-key-1')"""
        )
        raise AssertionError("Withdrawal below ₹300 was accepted")
    except sqlite3.IntegrityError:
        pass

    print(f"PASS: D1 migration SQL parsed; {len(expected)} required tables present.")
    print("PASS: schema version metadata is seeded.")
    print("PASS: wallet ledger idempotency uniqueness is enforced.")
    print("PASS: ₹300 minimum withdrawal constraint is enforced.")
    db.close()

if __name__ == "__main__":
    main()
