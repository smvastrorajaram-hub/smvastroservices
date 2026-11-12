import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const migrationUrl = new URL('../migrations/0014_reset_legacy_free_minutes.sql', import.meta.url);
const migration = readFileSync(fileURLToPath(migrationUrl), 'utf8');

function makeDatabase() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE smv_domain_wallets (
      owner_uid TEXT PRIMARY KEY,
      owner_role TEXT NOT NULL,
      available_balance_paise INTEGER NOT NULL DEFAULT 0,
      reserved_balance_paise INTEGER NOT NULL DEFAULT 0,
      bonus_minutes_balance INTEGER NOT NULL DEFAULT 0,
      reserved_bonus_minutes INTEGER NOT NULL DEFAULT 0,
      bonus_credit_balance_paise INTEGER NOT NULL DEFAULT 0,
      reserved_bonus_credit_paise INTEGER NOT NULL DEFAULT 0,
      version INTEGER NOT NULL DEFAULT 1,
      updated_at_ms INTEGER
    );
    CREATE TABLE smv_domain_wallet_ledger (
      ledger_id TEXT PRIMARY KEY,
      owner_uid TEXT NOT NULL,
      owner_role TEXT NOT NULL,
      currency TEXT NOT NULL,
      type TEXT NOT NULL,
      direction TEXT NOT NULL,
      amount_paise INTEGER NOT NULL,
      available_delta_paise INTEGER NOT NULL,
      reserved_delta_paise INTEGER NOT NULL,
      bonus_minutes_delta INTEGER NOT NULL,
      reserved_bonus_minutes_delta INTEGER NOT NULL,
      bonus_credit_delta_paise INTEGER NOT NULL,
      reserved_bonus_credit_delta_paise INTEGER NOT NULL,
      bonus_minutes_balance_after INTEGER,
      idempotency_key TEXT NOT NULL,
      reference_type TEXT,
      reference_id TEXT,
      note TEXT NOT NULL,
      metadata_json TEXT NOT NULL,
      status TEXT NOT NULL,
      source TEXT,
      created_at_ms INTEGER NOT NULL,
      UNIQUE(owner_uid,idempotency_key)
    );
    CREATE TRIGGER smv_domain_wallet_ledger_apply
    AFTER INSERT ON smv_domain_wallet_ledger
    BEGIN
      UPDATE smv_domain_wallets
      SET available_balance_paise=available_balance_paise+NEW.available_delta_paise,
          reserved_balance_paise=reserved_balance_paise+NEW.reserved_delta_paise,
          bonus_minutes_balance=bonus_minutes_balance+NEW.bonus_minutes_delta,
          reserved_bonus_minutes=reserved_bonus_minutes+NEW.reserved_bonus_minutes_delta,
          bonus_credit_balance_paise=bonus_credit_balance_paise+NEW.bonus_credit_delta_paise,
          reserved_bonus_credit_paise=reserved_bonus_credit_paise+NEW.reserved_bonus_credit_delta_paise,
          version=version+1,
          updated_at_ms=NEW.created_at_ms
      WHERE owner_uid=NEW.owner_uid;
      UPDATE smv_domain_wallet_ledger
      SET bonus_minutes_balance_after=(
        SELECT bonus_minutes_balance FROM smv_domain_wallets WHERE owner_uid=NEW.owner_uid
      )
      WHERE ledger_id=NEW.ledger_id;
    END;
    INSERT INTO smv_domain_wallets VALUES
      ('customer-with-legacy','customer',27500,1000,1530,4,4200,300,5,1),
      ('customer-zero','customer',8000,0,0,0,0,0,1,1),
      ('astrologer-legacy','astrologer',9900,0,12,0,0,0,2,1);
  `);
  return db;
}

test('0014 resets available Customer Legacy Free Minutes through an auditable ledger debit only', () => {
  const db = makeDatabase();
  try {
    db.exec(migration);

    const customer = db.prepare('SELECT * FROM smv_domain_wallets WHERE owner_uid=?').get('customer-with-legacy');
    assert.equal(customer.bonus_minutes_balance, 0);
    assert.equal(customer.available_balance_paise, 27500);
    assert.equal(customer.reserved_balance_paise, 1000);
    assert.equal(customer.reserved_bonus_minutes, 4, 'legacy minutes already reserved for any pending session stay reserved');
    assert.equal(customer.bonus_credit_balance_paise, 4200);
    assert.equal(customer.reserved_bonus_credit_paise, 300);

    const audit = db.prepare('SELECT * FROM smv_domain_wallet_ledger WHERE owner_uid=?').get('customer-with-legacy');
    assert.equal(audit.type, 'legacy_free_minutes_reset');
    assert.equal(audit.direction, 'debit');
    assert.equal(audit.amount_paise, 0);
    assert.equal(audit.bonus_minutes_delta, -1530);
    assert.equal(audit.bonus_minutes_balance_after, 0);
    assert.equal(audit.reference_type, 'legacy_wallet_balance_reset');
    assert.equal(audit.reference_id, 'legacy-free-minutes-reset-20261112');
    assert.equal(audit.source, 'migration');
    const metadata = JSON.parse(audit.metadata_json);
    assert.equal(metadata.previousBalanceMinutes, 1530);
    assert.equal(metadata.reason, 'user_requested_legacy_free_minutes_reset');

    const zeroCustomer = db.prepare('SELECT bonus_minutes_balance FROM smv_domain_wallets WHERE owner_uid=?').get('customer-zero');
    assert.equal(zeroCustomer.bonus_minutes_balance, 0);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM smv_domain_wallet_ledger WHERE owner_uid=?').get('customer-zero').n, 0);

    const astrologer = db.prepare('SELECT bonus_minutes_balance FROM smv_domain_wallets WHERE owner_uid=?').get('astrologer-legacy');
    assert.equal(astrologer.bonus_minutes_balance, 12);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM smv_domain_wallet_ledger WHERE owner_uid=?').get('astrologer-legacy').n, 0);
  } finally {
    db.close();
  }
});

test('0014 can be reapplied without duplicating the Customer reset ledger entry', () => {
  const db = makeDatabase();
  try {
    db.exec(migration);
    db.exec(migration);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM smv_domain_wallet_ledger WHERE owner_uid=?').get('customer-with-legacy').n, 1);
    assert.equal(db.prepare('SELECT bonus_minutes_balance FROM smv_domain_wallets WHERE owner_uid=?').get('customer-with-legacy').bonus_minutes_balance, 0);
  } finally {
    db.close();
  }
});
