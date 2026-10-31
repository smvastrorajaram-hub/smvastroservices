CREATE TABLE IF NOT EXISTS android_app_releases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  package_name TEXT NOT NULL CHECK (package_name = 'in.smvastroservices.smvastro'),
  version_name TEXT NOT NULL CHECK (length(version_name) BETWEEN 4 AND 20),
  version_code INTEGER NOT NULL UNIQUE CHECK (version_code >= 1000),
  storage_provider TEXT NOT NULL CHECK (storage_provider IN ('r2', 'firebase')),
  object_key TEXT UNIQUE,
  external_download_url TEXT,
  sha256 TEXT,
  certificate_sha256 TEXT,
  size_bytes INTEGER NOT NULL DEFAULT 0 CHECK (size_bytes >= 0),
  uploaded_by TEXT NOT NULL,
  uploaded_at INTEGER NOT NULL CHECK (uploaded_at >= 0),
  CHECK (
    (storage_provider = 'r2' AND object_key IS NOT NULL AND external_download_url IS NULL) OR
    (storage_provider = 'firebase' AND object_key IS NULL AND external_download_url IS NOT NULL)
  )
);

CREATE TRIGGER IF NOT EXISTS android_app_releases_monotonic_version
BEFORE INSERT ON android_app_releases
WHEN NEW.version_code <= COALESCE((SELECT MAX(version_code) FROM android_app_releases), 1000)
BEGIN
  SELECT RAISE(ABORT, 'VERSION_CODE_NOT_INCREASING');
END;

CREATE TABLE IF NOT EXISTS android_apk_upload_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid TEXT NOT NULL CHECK (length(uid) BETWEEN 1 AND 128),
  attempted_at INTEGER NOT NULL CHECK (attempted_at >= 0)
);

CREATE INDEX IF NOT EXISTS android_apk_upload_attempts_uid_time
ON android_apk_upload_attempts(uid, attempted_at);


-- Enforce the per-Admin upload cap at the database boundary as well as the
-- application check, so simultaneous requests cannot exceed the hourly limit.
CREATE TRIGGER IF NOT EXISTS android_apk_upload_attempts_hourly_limit
BEFORE INSERT ON android_apk_upload_attempts
WHEN (
  SELECT COUNT(*) FROM android_apk_upload_attempts
  WHERE uid = NEW.uid AND attempted_at >= NEW.attempted_at - 3600000
) >= 5
BEGIN
  SELECT RAISE(ABORT, 'APK_UPLOAD_RATE_LIMIT');
END;
