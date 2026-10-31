-- Additive Identity/Profile domain for Cloudflare D1.
-- Firebase Authentication remains the identity provider. This schema stores
-- application profile/authorization data; it does not create/manage Auth users.
CREATE TABLE IF NOT EXISTS smv_domain_identity_users (
  uid TEXT PRIMARY KEY NOT NULL,
  firebase_project_id TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'unknown'
    CHECK (role IN ('customer','astrologer','unknown')),
  status TEXT NOT NULL DEFAULT 'pending',
  public_id TEXT,
  name TEXT NOT NULL DEFAULT '',
  phone_e164 TEXT,
  phone_hash TEXT,
  email_verified INTEGER NOT NULL DEFAULT 0 CHECK (email_verified IN (0,1)),
  profile_json TEXT NOT NULL DEFAULT '{}',
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_smv_domain_identity_users_project_role
  ON smv_domain_identity_users(firebase_project_id, role, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_smv_domain_identity_users_public_id
  ON smv_domain_identity_users(public_id)
  WHERE public_id IS NOT NULL AND public_id <> '';

CREATE TABLE IF NOT EXISTS smv_domain_identity_astrologers (
  uid TEXT PRIMARY KEY NOT NULL,
  public_id TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  profile_json TEXT NOT NULL DEFAULT '{}',
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_smv_domain_identity_astrologers_public_id
  ON smv_domain_identity_astrologers(public_id)
  WHERE public_id <> '';

-- Admin authority is separate from the mutable user profile role.
CREATE TABLE IF NOT EXISTS smv_domain_identity_admins (
  uid TEXT PRIMARY KEY NOT NULL,
  source TEXT NOT NULL DEFAULT 'migrated_admin_allowlist',
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL
);

-- Global one-phone-one-account registry; the digest is used for uniqueness.
CREATE TABLE IF NOT EXISTS smv_domain_identity_phones (
  phone_hash TEXT PRIMARY KEY NOT NULL,
  uid TEXT NOT NULL UNIQUE,
  phone_e164 TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('customer','astrologer')),
  verification_mode TEXT NOT NULL DEFAULT 'email_unique',
  phone_verified INTEGER NOT NULL DEFAULT 0 CHECK (phone_verified IN (0,1)),
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS smv_domain_identity_public_ids (
  public_id TEXT PRIMARY KEY NOT NULL,
  uid TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('customer','astrologer')),
  created_at_ms INTEGER NOT NULL,
  UNIQUE(uid, role)
);

-- Sensitive bank/payout fields are isolated from ordinary profile reads.
CREATE TABLE IF NOT EXISTS smv_domain_identity_payout_profiles (
  uid TEXT PRIMARY KEY NOT NULL,
  payload_json TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS smv_domain_identity_migration_meta (
  source_project_id TEXT PRIMARY KEY NOT NULL,
  inventory_complete INTEGER NOT NULL DEFAULT 0 CHECK (inventory_complete IN (0,1)),
  reconciliation_complete INTEGER NOT NULL DEFAULT 0 CHECK (reconciliation_complete IN (0,1)),
  source_quiesced INTEGER NOT NULL DEFAULT 0 CHECK (source_quiesced IN (0,1)),
  last_source_update_time TEXT,
  imported_users INTEGER NOT NULL DEFAULT 0,
  imported_astrologers INTEGER NOT NULL DEFAULT 0,
  imported_admins INTEGER NOT NULL DEFAULT 0,
  imported_phones INTEGER NOT NULL DEFAULT 0,
  imported_public_ids INTEGER NOT NULL DEFAULT 0,
  imported_payout_profiles INTEGER NOT NULL DEFAULT 0,
  updated_at_ms INTEGER NOT NULL
);

INSERT INTO smv_domain_schema_meta (schema_key, schema_version, applied_at_ms)
VALUES ('identity-profiles', '0007_identity_profile_domain', CAST(strftime('%s','now') AS INTEGER) * 1000)
ON CONFLICT(schema_key) DO UPDATE SET
  schema_version = excluded.schema_version,
  applied_at_ms = excluded.applied_at_ms;
