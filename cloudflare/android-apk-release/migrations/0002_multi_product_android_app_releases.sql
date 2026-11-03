-- Expand the APK registry to one independent release sequence per product.
-- Existing SMV ASTRO R2/Firebase metadata is preserved under app_id='astro'.
DROP TRIGGER IF EXISTS android_app_releases_monotonic_version;
ALTER TABLE android_app_releases RENAME TO android_app_releases_before_multi_app;

CREATE TABLE android_app_releases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  app_id TEXT NOT NULL CHECK (app_id IN ('astro', 'horoscope', 'calendar')),
  package_name TEXT NOT NULL,
  version_name TEXT NOT NULL CHECK (length(version_name) BETWEEN 4 AND 20),
  version_code INTEGER NOT NULL CHECK (version_code >= 1000),
  storage_provider TEXT NOT NULL CHECK (storage_provider IN ('r2', 'firebase')),
  object_key TEXT UNIQUE,
  external_download_url TEXT,
  sha256 TEXT,
  certificate_sha256 TEXT,
  size_bytes INTEGER NOT NULL DEFAULT 0 CHECK (size_bytes >= 0),
  uploaded_by TEXT NOT NULL,
  uploaded_at INTEGER NOT NULL CHECK (uploaded_at >= 0),
  UNIQUE (app_id, version_code),
  CHECK (
    (app_id = 'astro' AND package_name = 'in.smvastroservices.smvastro') OR
    (app_id = 'horoscope' AND package_name = 'in.smvastroservices.horoscope') OR
    (app_id = 'calendar' AND package_name = 'in.smvastroservices.calendar')
  ),
  CHECK (
    (storage_provider = 'r2' AND object_key IS NOT NULL AND external_download_url IS NULL) OR
    (storage_provider = 'firebase' AND object_key IS NULL AND external_download_url IS NOT NULL)
  )
);

INSERT INTO android_app_releases (
  app_id, package_name, version_name, version_code, storage_provider, object_key,
  external_download_url, sha256, certificate_sha256, size_bytes, uploaded_by, uploaded_at
)
SELECT
  'astro', package_name, version_name, version_code, storage_provider, object_key,
  external_download_url, sha256, certificate_sha256, size_bytes, uploaded_by, uploaded_at
FROM android_app_releases_before_multi_app
ORDER BY version_code ASC;

DROP TABLE android_app_releases_before_multi_app;

CREATE INDEX android_app_releases_app_version
ON android_app_releases(app_id, version_code DESC);

CREATE TRIGGER android_app_releases_package_matches_app
BEFORE INSERT ON android_app_releases
WHEN NOT (
  (NEW.app_id = 'astro' AND NEW.package_name = 'in.smvastroservices.smvastro') OR
  (NEW.app_id = 'horoscope' AND NEW.package_name = 'in.smvastroservices.horoscope') OR
  (NEW.app_id = 'calendar' AND NEW.package_name = 'in.smvastroservices.calendar')
)
BEGIN
  SELECT RAISE(ABORT, 'APK_PACKAGE_DOES_NOT_MATCH_APP');
END;

CREATE TRIGGER android_app_releases_monotonic_version
BEFORE INSERT ON android_app_releases
WHEN NEW.version_code <= COALESCE(
  (SELECT MAX(version_code) FROM android_app_releases WHERE app_id = NEW.app_id),
  CASE WHEN NEW.app_id = 'astro' THEN 1000 ELSE 999 END
)
BEGIN
  SELECT RAISE(ABORT, 'VERSION_CODE_NOT_INCREASING');
END;
