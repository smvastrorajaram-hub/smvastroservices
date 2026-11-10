import test from 'node:test';
import assert from 'node:assert/strict';
import { createAndroidApkReleaseWorker } from '../cloudflare/android-apk-release/worker.mjs';

const PACKAGE = 'in.smvastroservices.smvastro';
const LEGACY_URL = 'https://firebasestorage.googleapis.com/v0/b/smv-astro.firebasestorage.app/o/smv-astro%2Fandroid%2Freleases%2F1005%2Flegacy.apk?alt=media&token=legacy-token';

class FakeD1 {
  constructor() {
    this.releases = new Map();
    this.attempts = [];
  }

  key(appId, versionCode) {
    return appId === 'astro' ? Number(versionCode) : appId + ':' + Number(versionCode);
  }

  rowsFor(appId) {
    return [...this.releases.values()].filter(row => (row.app_id || 'astro') === appId);
  }

  latestCode(appId) {
    return Math.max(0, ...this.rowsFor(appId).map(row => Number(row.version_code || 0)));
  }

  async batch(statements) {
    const oldReleases = new Map(this.releases);
    try {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      return results;
    } catch (error) {
      this.releases = oldReleases;
      throw error;
    }
  }

  prepare(sql) {
    const db = this;
    let args = [];
    return {
      bind(...values) {
        args = values;
        return this;
      },
      async first() {
        if (sql.includes("sqlite_master") && sql.includes("android_app_releases")) return { name: 'android_app_releases' };
        if (sql.includes("sqlite_master") && sql.includes("android_apk_upload_attempts")) return { name: 'android_apk_upload_attempts' };
        if (sql.includes('SELECT COUNT(*) AS count')) {
          const [uid, after] = args;
          return { count: db.attempts.filter(row => row.uid === uid && row.attempted_at >= after).length };
        }
        if (sql.includes('ORDER BY version_code DESC LIMIT 1')) {
          const appId = args[0] || 'astro';
          return db.rowsFor(appId).sort((a, b) => b.version_code - a.version_code)[0] || null;
        }
        if (sql.includes('WHERE app_id = ? AND version_code = ?')) {
          const [appId, versionCode] = args;
          return db.releases.get(db.key(appId, versionCode)) || null;
        }
        if (sql.includes('WHERE version_code = ?')) return db.releases.get(Number(args[0])) || null;
        throw new Error('Unsupported FakeD1 first() SQL: ' + sql);
      },
      async all() {
        if (sql.includes('ORDER BY version_code DESC LIMIT 100')) {
          const appId = args[0] || 'astro';
          return { results: db.rowsFor(appId).sort((a, b) => b.version_code - a.version_code).slice(0, 100) };
        }
        throw new Error('Unsupported FakeD1 all() SQL: ' + sql);
      },
      async run() {
        if (sql.startsWith('INSERT INTO android_apk_upload_attempts')) {
          db.attempts.push({ uid: args[0], attempted_at: args[1] });
          return { success: true };
        }
        if (sql.startsWith('DELETE FROM android_apk_upload_attempts')) {
          db.attempts = db.attempts.filter(row => row.attempted_at >= args[0]);
          return { success: true };
        }
        if (sql.startsWith('INSERT OR IGNORE INTO android_app_releases')) {
          const [package_name, version_name, version_code, external_download_url, size_bytes, uploaded_at] = args;
          const key = db.key('astro', version_code);
          if (db.releases.has(key)) return { success: true, meta: { changes: 0 } };
          const current = Math.max(1000, db.latestCode('astro'));
          if (Number(version_code) <= current) throw new Error('VERSION_CODE_NOT_INCREASING');
          db.releases.set(key, {
            app_id: 'astro', package_name, version_name, version_code: Number(version_code),
            storage_provider: 'firebase', object_key: null, external_download_url,
            sha256: null, certificate_sha256: null, size_bytes: Number(size_bytes),
            uploaded_by: 'legacy-migration', uploaded_at: Number(uploaded_at)
          });
          return { success: true, meta: { changes: 1 } };
        }
        if (sql.startsWith('DELETE FROM android_app_releases')) {
          const [appId, versionCode] = args;
          const key = db.key(appId, versionCode);
          const row = db.releases.get(key);
          const latest = db.latestCode(appId);
          if (row && row.storage_provider === 'r2' && Number(versionCode) < latest) {
            db.releases.delete(key);
            return { success: true, meta: { changes: 1 } };
          }
          return { success: true, meta: { changes: 0 } };
        }
        if (sql.startsWith('INSERT INTO android_app_releases')) {
          const [app_id, package_name, version_name, version_code, object_key, sha256, certificate_sha256, size_bytes, uploaded_by, uploaded_at] = args;
          const key = db.key(app_id, version_code);
          const baseline = app_id === 'astro' ? 1000 : 999;
          const current = Math.max(baseline, db.latestCode(app_id));
          if (Number(version_code) <= current) throw new Error('VERSION_CODE_NOT_INCREASING');
          if (db.releases.has(key)) throw new Error('UNIQUE constraint failed: android_app_releases.app_id, android_app_releases.version_code');
          db.releases.set(key, {
            app_id, package_name, version_name, version_code: Number(version_code),
            storage_provider: 'r2', object_key, external_download_url: null,
            sha256, certificate_sha256, size_bytes: Number(size_bytes), uploaded_by, uploaded_at: Number(uploaded_at)
          });
          return { success: true, meta: { changes: 1 } };
        }
        throw new Error('Unsupported FakeD1 run() SQL: ' + sql);
      }
    };
  }
}
class FakeR2 {
  constructor() { this.objects = new Map(); }
  async put(key, value, options) {
    const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
    this.objects.set(key, {
      bytes: new Uint8Array(bytes),
      contentType: options?.httpMetadata?.contentType || '',
      customMetadata: options?.customMetadata || {}
    });
  }
  async get(key) {
    const found = this.objects.get(key);
    if (!found) return null;
    return {
      body: new Response(found.bytes).body,
      size: found.bytes.byteLength,
      httpEtag: '"fake-etag"'
    };
  }
  async head(key) {
    const found = this.objects.get(key);
    return found ? { size: found.bytes.byteLength } : null;
  }
  async delete(key) { this.objects.delete(key); }
}

function envFor({ uploadsEnabled = true } = {}) {
  return {
    DB: new FakeD1(),
    APK_RELEASES: new FakeR2(),
    ALLOW_APK_UPLOADS: uploadsEnabled ? 'true' : 'false',
    ALLOW_APK_DELETES: 'true',
    MAX_APK_BYTES: String(100 * 1024 * 1024),
    FIREBASE_ALLOWED_PROJECT_IDS: 'smv-astro',
    SMV_ANDROID_RELEASE_ADMIN_UIDS: 'admin-uid',
    ALLOWED_ORIGINS: 'https://smvastroservices.in,https://horoscope.smvastroservices.in,https://calendar.smvastroservices.in',
  };
}


function makeWorker(env, { logger = { error() {} } } = {}) {
  const worker = createAndroidApkReleaseWorker({
    verifyToken: async token => {
      if (token !== 'admin-token') throw new Error('invalid token');
      return { uid: 'admin-uid', projectId: 'smv-astro', email: 'admin@example.com', email_verified: true };
    },
    inspectApk: bytes => {
      const value = JSON.parse(Buffer.from(bytes).toString('utf8'));
      return {
        packageName: value.packageName,
        versionName: value.versionName,
        versionCode: value.versionCode,
        size: bytes.byteLength,
        sha256: 'a'.repeat(64),
        certificateSha256: '7A3BE159218A38083986DEC117C0BD281B3EF42BDA65F2BB7B8C9946B5293401'
      };
    },
    logger
  });
  return { worker, env };
}

function apkPayload(versionName, versionCode, packageName = PACKAGE) {
  return Buffer.from(JSON.stringify({
    packageName,
    versionName,
    versionCode
  }).padEnd(1100, ' '));
}

async function uploadProduct(worker, env, appId, versionName, versionCode, packageName) {
  return worker.fetch(new Request('https://smv-astro-apk-release-api.smvastro.workers.dev/admin/android-apps/' + appId + '/upload', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer admin-token',
      'Content-Type': 'application/vnd.android.package-archive',
      Origin: appId === 'horoscope' ? 'https://horoscope.smvastroservices.in' : 'https://calendar.smvastroservices.in'
    },
    body: apkPayload(versionName, versionCode, packageName)
  }), env);
}

async function upload(worker, env, versionName, versionCode, token = 'admin-token') {
  return worker.fetch(new Request('https://smv-astro-apk-release-api.smvastro.workers.dev/admin/android-app/upload', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/vnd.android.package-archive',
      Origin: 'https://smvastroservices.in'
    },
    body: apkPayload(versionName, versionCode)
  }), env);
}

test('health exposes readiness but never enables publishing by default', async () => {
  const env = envFor({ uploadsEnabled: false });
  const { worker } = makeWorker(env);
  const response = await worker.fetch(new Request('https://apk.example/health'), env);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    success: true,
    ready: true,
    d1Ready: true,
    r2Ready: true,
    uploadsEnabled: false,
    deletesEnabled: true,
    multiAppReleasesEnabled: false,
    hasReleaseRecords: false
  });
});

test('health performs a read-only R2 binding probe and fails closed when R2 is unreachable', async () => {
  const env = envFor({ uploadsEnabled: true });
  const logged = [];
  env.APK_RELEASES.head = async () => { throw new Error('R2 bucket access denied token=do-not-log-this'); };
  const { worker } = makeWorker(env, { logger: { error: message => logged.push(message) } });
  const response = await worker.fetch(new Request('https://apk.example/health', {
    headers: { 'cf-ray': 'health-probe-ray-1234' }
  }), env);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    success: true,
    ready: false,
    d1Ready: true,
    r2Ready: false,
    uploadsEnabled: false,
    deletesEnabled: false,
    multiAppReleasesEnabled: false,
    hasReleaseRecords: false
  });
  assert.equal(logged.length, 1);
  assert.match(logged[0], /health-probe-ray-1234/);
  assert.match(logged[0], /r2-health/);
  assert.doesNotMatch(logged[0], /do-not-log-this/);
});

test('empty D1 metadata is healthy and never calls the unavailable Render service', async () => {
  const env = envFor();
  const { worker } = makeWorker(env);
  const response = await worker.fetch(new Request('https://apk.example/public/android-app'), env);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, available: false });
});

test('empty Admin history and unknown downloads are resolved from D1 without Render access', async () => {
  const env = envFor();
  const { worker } = makeWorker(env);
  const current = await worker.fetch(new Request('https://apk.example/admin/android-app', {
    headers: { Authorization: 'Bearer admin-token' }
  }), env);
  assert.equal(current.status, 200);
  assert.deepEqual(await current.json(), { success: true, available: false, appId: 'astro', appName: 'SMV ASTRO' });

  const history = await worker.fetch(new Request('https://apk.example/admin/android-app/versions', {
    headers: { Authorization: 'Bearer admin-token' }
  }), env);
  assert.equal(history.status, 200);
  assert.deepEqual((await history.json()).versions, []);

  const missing = await worker.fetch(new Request('https://apk.example/download/1001'), env);
  assert.equal(missing.status, 404);
});
test('admin-only upload rejects unauthenticated requests and respects disabled upload gate', async () => {
  const env = envFor({ uploadsEnabled: true });
  const { worker } = makeWorker(env);
  const unauth = await worker.fetch(new Request('https://apk.example/admin/android-app/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/vnd.android.package-archive' },
    body: apkPayload('v1.1', 1001)
  }), env);
  assert.equal(unauth.status, 401);

  env.ALLOW_APK_UPLOADS = 'false';
  const disabled = await upload(worker, env, 'v1.1', 1001);
  assert.equal(disabled.status, 503);
  assert.match((await disabled.json()).error, /disabled/);
});

test('Admin upload publishes the newer signed APK to R2 and D1 and download serves stored bytes', async () => {
  const env = envFor();
  const { worker } = makeWorker(env);
  const postedBytes = apkPayload('v1.1', 1001);
  const posted = await worker.fetch(new Request('https://apk.example/admin/android-app/upload', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer admin-token',
      'Content-Type': 'application/vnd.android.package-archive',
      Origin: 'https://smvastroservices.in'
    },
    body: postedBytes
  }), env);
  assert.equal(posted.status, 200);
  const published = await posted.json();
  assert.equal(published.success, true);
  assert.equal(published.available, true);
  assert.equal(published.versionName, 'v1.1');
  assert.equal(published.versionCode, 1001);
  assert.equal(published.storageProvider, 'r2');
  assert.equal(published.sha256, 'a'.repeat(64));
  assert.match(published.downloadUrl, /\/download\/1001$/);
  assert.equal(env.APK_RELEASES.objects.size, 1);

  const current = await worker.fetch(new Request('https://apk.example/public/android-app'), env);
  assert.equal(current.status, 200);
  const currentRelease = await current.json();
  assert.equal(currentRelease.versionCode, 1001);
  assert.equal(currentRelease.storageProvider, 'r2');

  const history = await worker.fetch(new Request('https://apk.example/admin/android-app/versions', {
    headers: { Authorization: 'Bearer admin-token' }
  }), env);
  assert.equal(history.status, 200);
  assert.equal((await history.json()).versions[0].versionCode, 1001);

  const downloaded = await worker.fetch(new Request('https://apk.example/download/1001'), env);
  assert.equal(downloaded.status, 200);
  assert.equal(downloaded.headers.get('content-type'), 'application/vnd.android.package-archive');
  assert.equal(downloaded.headers.get('content-disposition'), 'attachment; filename="SMV-ASTRO-v1.1.apk"');
  assert.deepEqual(Buffer.from(await downloaded.arrayBuffer()), postedBytes);
});

test('Admin can delete an archived R2 APK, but never the current release', async () => {
  const env = envFor();
  const { worker } = makeWorker(env);
  assert.equal((await upload(worker, env, 'v1.1', 1001)).status, 200);
  assert.equal((await upload(worker, env, 'v1.2', 1002)).status, 200);
  const oldRow = env.DB.releases.get(1001);
  assert.ok(oldRow && env.APK_RELEASES.objects.has(oldRow.object_key));

  const protectedCurrent = await worker.fetch(new Request('https://apk.example/admin/android-app/versions/1002', {
    method: 'DELETE', headers: { Authorization: 'Bearer admin-token' }
  }), env);
  assert.equal(protectedCurrent.status, 409);
  assert.ok(env.DB.releases.has(1002));

  const removed = await worker.fetch(new Request('https://apk.example/admin/android-app/versions/1001', {
    method: 'DELETE', headers: { Authorization: 'Bearer admin-token', Origin: 'https://smvastroservices.in' }
  }), env);
  assert.equal(removed.status, 200);
  assert.deepEqual(await removed.json(), { success: true, deleted: true, deletedAppId: 'astro', deletedVersionCode: 1001 });
  assert.equal(env.DB.releases.has(1001), false);
  assert.equal(env.APK_RELEASES.objects.has(oldRow.object_key), false);
  const current = await worker.fetch(new Request('https://apk.example/public/android-app'), env);
  assert.equal((await current.json()).versionCode, 1002);
});

test('APK history deletion requires Admin authorization, the delete gate and an R2 historical object', async () => {
  const env = envFor();
  const { worker } = makeWorker(env);
  await upload(worker, env, 'v1.1', 1001);
  await upload(worker, env, 'v1.2', 1002);
  const unauth = await worker.fetch(new Request('https://apk.example/admin/android-app/versions/1001', { method: 'DELETE' }), env);
  assert.equal(unauth.status, 401);

  env.ALLOW_APK_DELETES = 'false';
  const disabled = await worker.fetch(new Request('https://apk.example/admin/android-app/versions/1001', {
    method: 'DELETE', headers: { Authorization: 'Bearer admin-token' }
  }), env);
  assert.equal(disabled.status, 503);
  env.ALLOW_APK_DELETES = 'true';

  env.DB.releases.set(1000, {
    package_name: PACKAGE, version_name: 'v1.0', version_code: 1000,
    storage_provider: 'firebase', object_key: null, external_download_url: LEGACY_URL,
    sha256: null, certificate_sha256: null, size_bytes: 2300,
    uploaded_by: 'legacy-migration', uploaded_at: 1700000000000
  });
  const legacy = await worker.fetch(new Request('https://apk.example/admin/android-app/versions/1000', {
    method: 'DELETE', headers: { Authorization: 'Bearer admin-token' }
  }), env);
  assert.equal(legacy.status, 409);
  assert.equal(env.DB.releases.has(1000), true);
});

test('Horoscope and Calendar have independent package identities, version sequences and downloads', async () => {
  const env = envFor();
  // Enable the gated multi-app feature only for tests that exercise those routes.
  env.MULTI_APP_RELEASES_ENABLED = 'true';
  const { worker } = makeWorker(env);
  const horoscopePackage = 'in.smvastroservices.horoscope';
  const calendarPackage = 'in.smvastroservices.calendar';

  const horoscopeUpload = await uploadProduct(worker, env, 'horoscope', 'v1.0', 1000, horoscopePackage);
  assert.equal(horoscopeUpload.status, 200);
  const horoscopeRelease = await horoscopeUpload.json();
  assert.equal(horoscopeRelease.appId, 'horoscope');
  assert.equal(horoscopeRelease.packageName, horoscopePackage);
  assert.equal(horoscopeRelease.versionCode, 1000);
  assert.ok(horoscopeRelease.downloadUrl.endsWith('/download/horoscope/1000'));

  const calendarUpload = await uploadProduct(worker, env, 'calendar', 'v1.0', 1000, calendarPackage);
  assert.equal(calendarUpload.status, 200);
  const calendarRelease = await calendarUpload.json();
  assert.equal(calendarRelease.appId, 'calendar');
  assert.equal(calendarRelease.packageName, calendarPackage);
  assert.equal(calendarRelease.versionCode, 1000);
  assert.ok(calendarRelease.downloadUrl.endsWith('/download/calendar/1000'));

  const [horoscopePublic, calendarPublic] = await Promise.all([
    worker.fetch(new Request('https://apk.example/public/android-apps/horoscope'), env),
    worker.fetch(new Request('https://apk.example/public/android-apps/calendar'), env)
  ]);
  // A Response body is single-use: parse each public response once, then assert its fields.
  const horoscopePublicRelease = await horoscopePublic.json();
  const calendarPublicRelease = await calendarPublic.json();
  assert.equal(horoscopePublicRelease.packageName, horoscopePackage);
  assert.equal(horoscopePublicRelease.storageProvider, 'r2');
  assert.equal(calendarPublicRelease.packageName, calendarPackage);
  assert.equal(calendarPublicRelease.storageProvider, 'r2');

  const horoscopeDownload = await worker.fetch(new Request(horoscopeRelease.downloadUrl), env);
  const calendarDownload = await worker.fetch(new Request(calendarRelease.downloadUrl), env);
  assert.equal(horoscopeDownload.status, 200);
  assert.equal(calendarDownload.status, 200);
  assert.deepEqual(
    Buffer.from(await horoscopeDownload.arrayBuffer()),
    apkPayload('v1.0', 1000, horoscopePackage),
    'Horoscope download must stream the exact bytes accepted by its upload'
  );
  assert.deepEqual(
    Buffer.from(await calendarDownload.arrayBuffer()),
    apkPayload('v1.0', 1000, calendarPackage),
    'Calendar download must stream the exact bytes accepted by its upload'
  );
});

test('Each Admin app manager can upload only its assigned package and protects only its own current release', async () => {
  const env = envFor();
  // Enable the gated multi-app feature only for tests that exercise those routes.
  env.MULTI_APP_RELEASES_ENABLED = 'true';
  const { worker } = makeWorker(env);
  const mismatch = await uploadProduct(worker, env, 'calendar', 'v1.0', 1000, 'in.smvastroservices.horoscope');
  assert.equal(mismatch.status, 400);

  assert.equal((await uploadProduct(worker, env, 'horoscope', 'v1.0', 1000, 'in.smvastroservices.horoscope')).status, 200);
  assert.equal((await uploadProduct(worker, env, 'horoscope', 'v1.1', 1001, 'in.smvastroservices.horoscope')).status, 200);
  assert.equal((await uploadProduct(worker, env, 'calendar', 'v1.0', 1000, 'in.smvastroservices.calendar')).status, 200);

  const protectedCalendar = await worker.fetch(new Request('https://apk.example/admin/android-apps/calendar/versions/1000', {
    method: 'DELETE', headers: { Authorization: 'Bearer admin-token' }
  }), env);
  assert.equal(protectedCalendar.status, 409);

  const deletedHoroscope = await worker.fetch(new Request('https://apk.example/admin/android-apps/horoscope/versions/1000', {
    method: 'DELETE', headers: { Authorization: 'Bearer admin-token' }
  }), env);
  assert.equal(deletedHoroscope.status, 200);
  assert.equal(env.DB.releases.has('horoscope:1000'), false);
  assert.equal(env.DB.releases.has('horoscope:1001'), true);
  assert.equal(env.DB.releases.has('calendar:1000'), true);

  const calendarLatest = await worker.fetch(new Request('https://apk.example/public/android-apps/calendar'), env);
  assert.equal((await calendarLatest.json()).versionCode, 1000);
});

test('Public Horoscope and Calendar APK metadata are CORS-accessible only from their own approved origins', async () => {
  const env = envFor();
  // Enable the gated multi-app feature only for tests that exercise those routes.
  env.MULTI_APP_RELEASES_ENABLED = 'true';
  const { worker } = makeWorker(env);
  const allowed = await worker.fetch(new Request('https://apk.example/public/android-apps/horoscope', {
    headers: { Origin: 'https://horoscope.smvastroservices.in' }
  }), env);
  assert.equal(allowed.headers.get('Access-Control-Allow-Origin'), 'https://horoscope.smvastroservices.in');

  const denied = await worker.fetch(new Request('https://apk.example/public/android-apps/calendar', {
    headers: { Origin: 'https://evil.example' }
  }), env);
  assert.equal(denied.headers.get('Access-Control-Allow-Origin'), null);
});

test('versionCode 1000 is rejected as the pre-release baseline without writing D1 or R2', async () => {
  const env = envFor();
  const { worker } = makeWorker(env);
  const response = await upload(worker, env, 'v1.0', 1000);
  assert.equal(response.status, 409);
  assert.equal((await response.json()).currentVersionCode, 1000);
  assert.equal(env.DB.releases.size, 0);
  assert.equal(env.APK_RELEASES.objects.size, 0);
  const download = await worker.fetch(new Request('https://apk.example/download/1005'), env);
  assert.equal(download.status, 404);
});

test('first Cloudflare APK upload writes only an R2 object and its D1 release record', async () => {
  const env = envFor();
  const { worker } = makeWorker(env);
  const postedBytes = apkPayload('v1.1', 1001);
  const response = await upload(worker, env, 'v1.1', 1001);
  assert.equal(response.status, 200);
  const metadata = await response.json();
  assert.equal(metadata.versionCode, 1001);
  assert.equal(metadata.storageProvider, 'r2');
  assert.equal(env.DB.releases.size, 1);
  assert.equal(env.DB.releases.get(1001).storage_provider, 'r2');
  assert.equal(env.APK_RELEASES.objects.size, 1);

  const publicMetadata = await worker.fetch(new Request('https://apk.example/public/android-app'), env);
  assert.equal(publicMetadata.status, 200);
  assert.equal((await publicMetadata.json()).versionCode, 1001);

  const downloaded = await worker.fetch(new Request('https://apk.example/download/1001'), env);
  assert.equal(downloaded.status, 200);
  assert.equal(downloaded.headers.get('content-type'), 'application/vnd.android.package-archive');
  assert.deepEqual(Buffer.from(await downloaded.arrayBuffer()), postedBytes);
});

test('invalid Admin identity cannot write release metadata', async () => {
  const env = envFor();
  const deniedWorker = createAndroidApkReleaseWorker({
    verifyToken: async () => ({ uid: 'customer-uid', projectId: 'smv-astro' }),
    inspectApk: () => { throw new Error('must not validate an unauthorized upload'); },
  });
  const denied = await deniedWorker.fetch(new Request('https://apk.example/admin/android-app/upload', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer admin-token',
      'Content-Type': 'application/vnd.android.package-archive'
    },
    body: apkPayload('v1.1', 1001)
  }), env);
  assert.equal(denied.status, 403);
  assert.equal(env.APK_RELEASES.objects.size, 0);
  assert.equal(env.DB.releases.size, 0);
});

test('an explicitly archived Firebase row in D1 remains available as historical compatibility', async () => {
  const env = envFor();
  const { worker } = makeWorker(env);
  env.DB.releases.set(1005, {
    package_name: PACKAGE, version_name: 'v1.5', version_code: 1005,
    storage_provider: 'firebase', object_key: null, external_download_url: LEGACY_URL,
    sha256: null, certificate_sha256: null, size_bytes: 2300,
    uploaded_by: 'legacy-migration', uploaded_at: 1700000000000
  });
  const current = await worker.fetch(new Request('https://apk.example/public/android-app'), env);
  assert.equal(current.status, 200);
  const metadata = await current.json();
  assert.equal(metadata.versionCode, 1005);
  assert.ok(metadata.downloadUrl.endsWith('/download/1005'));
  const download = await worker.fetch(new Request(metadata.downloadUrl), env);
  assert.equal(download.status, 302);
  assert.equal(download.headers.get('location'), LEGACY_URL);

  env.DB.releases.get(1005).external_download_url = 'https://evil.example/file.apk';
  const bad = await worker.fetch(new Request('https://apk.example/download/1005'), env);
  assert.equal(bad.status, 503);
});


test('Homepage uses the dedicated Android APK icon/card and hides Download when the current version is installed', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const installer = fs.readFileSync(path.join(root, 'public/android-app-install.js'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const styles = fs.readFileSync(path.join(root, 'public/android-app-install.css'), 'utf8');

  assert.ok(html.includes('id="smvPermanentAndroidAppSection"'));
  assert.ok(html.includes('id="smvPermanentApkDownload"'));
  assert.ok(html.includes('assets/android-app-icon-astro.svg'));
  assert.doesNotMatch(html, /smvInstallAppSection|smvInstallAppBtn|smvInstallAppHelp|smv-install-app-prompt/);
  assert.ok(html.includes('window.SMV_APK_RELEASE_API_URL = window.SMV_APK_RELEASE_API_URL || "https://smv-astro-apk-release-api.astroservices.workers.dev"'));
  assert.ok(html.includes('window.SMV_APK_RELEASE_ADMIN_API_URL = window.SMV_APK_RELEASE_ADMIN_API_URL || "https://smv-astro-apk-release-api.astroservices.workers.dev"'));
  assert.ok(html.includes('android-app-install.css?v=20261110-android-apk-cards-v2'));
  assert.ok(installer.includes('getInstalledRelatedApps'));
  assert.ok(installer.includes('Using Latest Version'));
  assert.ok(installer.includes("'UPDATE'"));
  assert.ok(installer.includes("'DOWNLOAD APK'"));
  assert.ok(installer.includes('uploadedAtLabel'));
  assert.ok(installer.includes("timeZone: 'Asia/Kolkata'"));
  assert.ok(installer.includes("source.cloudflare ? 'r2' : 'firebase'"));
  assert.ok(styles.includes('.smv-android-apk-card'));
  assert.ok(styles.includes('.smv-android-apk-download'));

  const vm = await import('node:vm');
  const release = {
    success: true,
    available: true,
    packageName: PACKAGE,
    versionName: 'v1.1',
    versionCode: 1001,
    downloadUrl: 'https://smv-astro-apk-release-api.astroservices.workers.dev/download/1001',
    size: 2996276,
    uploadedAt: 1793451612279
  };
  async function renderFor(installedApps, supportsInstalledApps = true) {
    const heading = { textContent: '' };
    const description = { textContent: '' };
    const status = { textContent: '' };
    const download = {
      textContent: 'DOWNLOAD APK', hidden: true, href: '',
      setAttribute() {}, removeAttribute(name) { if (name === 'href') this.href = ''; }
    };
    const section = { hidden: true, style: { display: 'none' }, removeAttribute() {} };
    const document = {
      getElementById(id) {
        return ({
          smvPermanentAndroidAppSection: section,
          smvPermanentAndroidApkHeading: heading,
          smvPermanentApkDescription: description,
          smvPermanentApkStatus: status,
          smvPermanentApkDownload: download
        })[id] || null;
      }
    };
    const navigator = {
      userAgent: 'Mozilla/5.0 (Linux; Android 10) Chrome/131.0.0.0'
    };
    if (supportsInstalledApps) navigator.getInstalledRelatedApps = async () => installedApps;
    const fetchImpl = async url => url.endsWith('/health')
      ? { ok: true, json: async () => ({ success: true, ready: true }) }
      : { ok: true, json: async () => release };
    const sandbox = {
      document, navigator,
      window: { SMV_APK_RELEASE_API_URL: 'https://smv-astro-apk-release-api.astroservices.workers.dev' },
      location: { hostname: 'smvastroservices.in' },
      fetch: fetchImpl, URL, AbortSignal, Intl, Date, Set,
      console: { info() {}, warn() {}, error() {} }
    };
    vm.runInNewContext(installer, sandbox);
    await new Promise(resolve => setTimeout(resolve, 0));
    return { section, heading, description, status, download };
  }

  const latest = await renderFor([{ platform: 'play', id: PACKAGE, version: 'v1.1' }]);
  assert.equal(latest.heading.textContent, 'SMV ASTRO v1.1 · code 1001');
  assert.equal(latest.description.textContent, '31 Oct 2026, 6:30 pm · r2');
  assert.equal(latest.status.textContent, 'Using Latest Version');
  assert.equal(latest.download.hidden, true);
  assert.equal(latest.download.href, '');

  const older = await renderFor([{ platform: 'play', id: PACKAGE, version: 'v1.0' }]);
  assert.equal(older.download.hidden, false);
  assert.equal(older.download.textContent, 'UPDATE');
  assert.equal(older.download.href, release.downloadUrl);

  const notInstalled = await renderFor([]);
  assert.equal(notInstalled.download.hidden, false);
  assert.equal(notInstalled.download.textContent, 'DOWNLOAD APK');
  assert.equal(notInstalled.download.href, release.downloadUrl);

  const installedUnknownVersion = await renderFor([{ platform: 'play', id: PACKAGE }]);
  assert.equal(installedUnknownVersion.download.hidden, true);
  assert.equal(installedUnknownVersion.status.textContent, 'Installed app version could not be verified');

  const unsupportedBrowser = await renderFor([], false);
  assert.equal(unsupportedBrowser.download.hidden, false);
  assert.equal(unsupportedBrowser.download.textContent, 'DOWNLOAD APK');
  assert.equal(unsupportedBrowser.download.href, release.downloadUrl);
  assert.equal(unsupportedBrowser.status.textContent, '');
});

test('Admin APK uploads are enabled in the deploy config while the example stays disabled', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const example = fs.readFileSync(path.join(root, 'cloudflare/android-apk-release/wrangler.toml.example'), 'utf8');
  const config = fs.readFileSync(path.join(root, 'cloudflare/android-apk-release/wrangler.toml'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const installer = fs.readFileSync(path.join(root, 'public/android-app-install.js'), 'utf8');
  const moduleSource = fs.readFileSync(path.join(root, 'public/smvastro.mjs'), 'utf8');
  const readme = fs.readFileSync(path.join(root, 'cloudflare/android-apk-release/README.md'), 'utf8');
  const worker = fs.readFileSync(path.join(root, 'cloudflare/android-apk-release/worker.mjs'), 'utf8');
  assert.match(example, /ALLOW_APK_UPLOADS\s*=\s*"false"/);
  assert.match(example, /database_id\s*=\s*"00000000-0000-0000-0000-000000000000"/);
  assert.match(config, /database_id\s*=\s*"5105ebb3-435c-47b7-9983-2e171fa911cd"/);
  assert.match(config, /bucket_name\s*=\s*"smv-astro-apk-releases"/);
  assert.match(config, /ALLOW_APK_UPLOADS\s*=\s*"true"/);
  assert.match(html, /window\.SMV_APK_RELEASE_API_URL\s*=\s*window\.SMV_APK_RELEASE_API_URL\s*\|\|\s*"https:\/\/smv-astro-apk-release-api\.astroservices\.workers\.dev"/);
  assert.match(html, /window\.SMV_APK_RELEASE_ADMIN_API_URL\s*=\s*window\.SMV_APK_RELEASE_ADMIN_API_URL\s*\|\|\s*"https:\/\/smv-astro-apk-release-api\.astroservices\.workers\.dev"/);
  assert.match(moduleSource, /window\.SMV_APK_RELEASE_ADMIN_API_URL\|\|window\.SMV_APK_RELEASE_API_URL/);
  assert.doesNotMatch(installer, /SMV_APK_RELEASE_ADMIN_API_URL|smv-astro-apk-release-api\.astroservices\.workers\.dev/);
  assert.doesNotMatch(moduleSource, /smv-astro-apk-release-api\.astroservices\.workers\.dev/);
  assert.doesNotMatch(installer + moduleSource, /DEFAULT_WORKER_BASE|SMV_ANDROID_APK_WORKER_DEFAULT/);
  assert.match(readme, /5105ebb3-435c-47b7-9983-2e171fa911cd/);
  assert.match(readme, /does not change existing Firebase, Razorpay, Render/);
  assert.match(readme, /Use only the existing D1 database/);
  assert.match(readme, /available[^\\n]*false/);
  assert.doesNotMatch(config + example, /LEGACY_ANDROID_RELEASE_URL/);
  assert.doesNotMatch(worker, /smvastroservices\.onrender\.com|fetchLegacyRelease|DEFAULT_LEGACY_URL/);
  assert.match(readme, /Cloudflare R2/);
  assert.match(readme, /Do not add secrets or APK binaries/);
});

test('deployment workflow retries edge-propagation failures and requires D1/R2 readiness plus valid public metadata', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const workflow = fs.readFileSync(path.join(root, '.github/workflows/deploy-android-apk-release-worker.yml'), 'utf8');
  assert.ok(workflow.includes('for attempt in {1..10}'));
  assert.ok(workflow.includes('health.d1Ready === true'));
  assert.ok(workflow.includes('health.r2Ready === true'));
  assert.ok(workflow.includes('health.deletesEnabled === true'));
  assert.ok(workflow.includes('/public/android-apps/horoscope'));
  assert.ok(workflow.includes('/public/android-apps/calendar'));
  assert.ok(workflow.includes('Worker health did not become ready after bounded propagation retries'));
  assert.ok(workflow.includes('Public APK metadata'));
  assert.ok(workflow.includes("typeof data.available !== 'boolean'"));
  assert.ok(workflow.includes('Public APK metadata did not pass validation'));
});
