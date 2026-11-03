import test from 'node:test';
import assert from 'node:assert/strict';
import { createAndroidApkReleaseWorker } from '../cloudflare/android-apk-release/worker.mjs';

test('Public Horoscope and Calendar release history exposes only safe version metadata', async () => {
  const rows = {
    horoscope: [{
      app_id: 'horoscope',
      package_name: 'in.smvastroservices.horoscope',
      version_name: 'v1.0',
      version_code: 1000,
      storage_provider: 'r2',
      object_key: 'smv-horoscope/android/releases/1000/private-object.apk',
      external_download_url: null,
      sha256: 'secret-hash',
      certificate_sha256: 'secret-certificate',
      size_bytes: 863546,
      uploaded_by: 'private-admin-uid',
      uploaded_at: 1793696467688
    }],
    calendar: [{
      app_id: 'calendar',
      package_name: 'in.smvastroservices.calendar',
      version_name: 'v1.0',
      version_code: 1000,
      storage_provider: 'r2',
      object_key: 'smv-calendar/android/releases/1000/private-object.apk',
      external_download_url: null,
      sha256: 'secret-hash',
      certificate_sha256: 'secret-certificate',
      size_bytes: 687146,
      uploaded_by: 'private-admin-uid',
      uploaded_at: 1793696511122
    }]
  };

  const env = {
    MULTI_APP_RELEASES_ENABLED: 'true',
    DB: {
      prepare(sql) {
        let params = [];
        return {
          bind(...values) { params = values; return this; },
          async first() {
            if (sql.includes("sqlite_master") && sql.includes("android_app_releases")) return { name: 'android_app_releases' };
            if (sql.includes("sqlite_master") && sql.includes("android_apk_upload_attempts")) return { name: 'android_apk_upload_attempts' };
            return null;
          },
          async all() {
            if (!sql.includes('SELECT app_id, package_name, version_name, version_code, storage_provider, size_bytes, uploaded_at')) {
              throw new Error('Public history must use the sanitized SELECT projection.');
            }
            return { results: rows[params[0]] || [] };
          }
        };
      }
    },
    APK_RELEASES: {
      async put() {},
      async get() { return null; },
      async head() { return null; },
      async delete() {}
    },
    ALLOWED_ORIGINS: 'https://smvastroservices.in,https://www.smvastroservices.in',
    FIREBASE_ALLOWED_PROJECT_IDS: 'smv-astro'
  };

  const worker = createAndroidApkReleaseWorker();
  for (const appId of ['horoscope', 'calendar']) {
    const response = await worker.fetch(new Request(
      'https://smv-astro-apk-release-api.astroservices.workers.dev/public/android-apps/' + appId + '/versions',
      { headers: { Origin: 'https://smvastroservices.in', Accept: 'application/json' } }
    ), env);

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://smvastroservices.in');
    const data = await response.json();
    assert.equal(data.success, true);
    assert.equal(data.appId, appId);
    assert.equal(data.versions.length, 1);
    assert.equal(data.versions[0].packageName,
      appId === 'horoscope' ? 'in.smvastroservices.horoscope' : 'in.smvastroservices.calendar');
    assert.equal(data.versions[0].versionName, 'v1.0');
    assert.equal(data.versions[0].versionCode, 1000);
    assert.equal(data.versions[0].isCurrent, true);
    assert.equal(data.versions[0].canDelete, false);
    assert.equal(data.versions[0].storageProvider, 'r2');
    assert.ok(data.versions[0].downloadUrl.includes('/download/' + appId + '/1000'));

    for (const forbidden of ['sha256', 'certificateSha256', 'uploadedBy', 'object_key', 'external_download_url']) {
      assert.equal(Object.hasOwn(data.versions[0], forbidden), false, forbidden + ' must not leave the Worker');
    }
  }
});

test('Public multi-app history is limited to HOROSCOPE and CALENDAR and remains feature-gated', async () => {
  const env = {
    MULTI_APP_RELEASES_ENABLED: 'false',
    DB: {
      prepare(sql) {
        return {
          bind() { return this; },
          async first() {
            if (sql.includes("sqlite_master") && sql.includes("android_app_releases")) return { name: 'android_app_releases' };
            if (sql.includes("sqlite_master") && sql.includes("android_apk_upload_attempts")) return { name: 'android_apk_upload_attempts' };
            return null;
          },
          async all() { throw new Error('The gated query must not run.'); }
        };
      }
    },
    APK_RELEASES: { async put() {}, async get() { return null; } },
    ALLOWED_ORIGINS: 'https://smvastroservices.in'
  };
  const worker = createAndroidApkReleaseWorker();
  const blocked = await worker.fetch(new Request(
    'https://apk.example/public/android-apps/calendar/versions',
    { headers: { Origin: 'https://smvastroservices.in' } }
  ), env);
  assert.equal(blocked.status, 503);
  assert.match((await blocked.json()).error, /disabled/i);

  const notPublic = await worker.fetch(new Request(
    'https://apk.example/public/android-apps/astro/versions',
    { headers: { Origin: 'https://smvastroservices.in' } }
  ), env);
  assert.equal(notPublic.status, 404);
});
