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
          return [...db.releases.values()].sort((a, b) => b.version_code - a.version_code)[0] || null;
        }
        if (sql.includes('WHERE version_code = ?')) return db.releases.get(Number(args[0])) || null;
        throw new Error('Unsupported FakeD1 first() SQL: ' + sql);
      },
      async all() {
        if (sql.includes('ORDER BY version_code DESC LIMIT 100')) {
          return { results: [...db.releases.values()].sort((a, b) => b.version_code - a.version_code).slice(0, 100) };
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
          if (db.releases.has(Number(version_code))) return { success: true, meta: { changes: 0 } };
          const current = Math.max(1000, ...db.releases.keys());
          if (Number(version_code) <= current) throw new Error('VERSION_CODE_NOT_INCREASING');
          db.releases.set(Number(version_code), {
            package_name, version_name, version_code: Number(version_code),
            storage_provider: 'firebase', object_key: null, external_download_url,
            sha256: null, certificate_sha256: null, size_bytes: Number(size_bytes),
            uploaded_by: 'legacy-migration', uploaded_at: Number(uploaded_at)
          });
          return { success: true, meta: { changes: 1 } };
        }
        if (sql.startsWith('INSERT INTO android_app_releases')) {
          const [package_name, version_name, version_code, object_key, sha256, certificate_sha256, size_bytes, uploaded_by, uploaded_at] = args;
          const current = Math.max(1000, ...db.releases.keys());
          if (Number(version_code) <= current) throw new Error('VERSION_CODE_NOT_INCREASING');
          if (db.releases.has(Number(version_code))) throw new Error('UNIQUE constraint failed: android_app_releases.version_code');
          db.releases.set(Number(version_code), {
            package_name, version_name, version_code: Number(version_code),
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
    MAX_APK_BYTES: String(100 * 1024 * 1024),
    FIREBASE_ALLOWED_PROJECT_IDS: 'smv-astro',
    SMV_ANDROID_RELEASE_ADMIN_UIDS: 'admin-uid',
    ALLOWED_ORIGINS: 'https://smvastroservices.in',
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

function apkPayload(versionName, versionCode) {
  return Buffer.from(JSON.stringify({
    packageName: PACKAGE,
    versionName,
    versionCode
  }).padEnd(1100, ' '));
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
  assert.deepEqual(await current.json(), { success: true, available: false });

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
  assert.equal((await current.json()).versionCode, 1001);

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


test('Homepage shows install/update states and only trusts the configured Cloudflare APK release origin', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const installer = fs.readFileSync(path.join(root, 'public/android-app-install.js'), 'utf8');
  const moduleSource = fs.readFileSync(path.join(root, 'public/smvastro.mjs'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');

  assert.ok(installer.includes('SMV ASTRO IS UP TO DATE'));
  assert.ok(installer.includes('UPDATE APP'));
  assert.ok(installer.includes('INSTALL APP'));
  assert.ok(installer.includes('DOWNLOAD APP'));
  assert.ok(installer.includes('health?.success === true && health.ready === true'));
  assert.ok(installer.includes('getInstalledRelatedApps'));
  assert.ok(installer.includes('firebasestorage.googleapis.com'));
  assert.ok(moduleSource.includes('smvAndroidApkWorkerStatus'));
  assert.ok(moduleSource.includes('/admin/android-app/versions'));
  assert.ok(moduleSource.includes('DOWNLOAD APK'));
  assert.ok(html.includes('id="adminAndroidAppHistory"'));
  assert.ok(html.includes('id="adminAndroidApkBackendStatus"'));
  assert.ok(html.includes('id="adminAndroidAppFileInfo"'));
  assert.ok(html.includes('APK Install &amp; Update Manager'));
  assert.ok(moduleSource.includes('Cloudflare APK service READY · R2/D1 connected · Admin APK publishing ENABLED.'));
  assert.ok(moduleSource.includes('Selected APK: '));
  assert.ok(html.includes('v=20261031-cloudflare-r2-apk-release-v3-admin-worker-route'));
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
  assert.match(html, /window\.SMV_APK_RELEASE_API_URL\s*=\s*window\.SMV_APK_RELEASE_API_URL\s*\|\|\s*""/);
  assert.match(html, /window\.SMV_APK_RELEASE_ADMIN_API_URL\s*=\s*window\.SMV_APK_RELEASE_ADMIN_API_URL\s*\|\|\s*"https:\/\/smv-astro-apk-release-api\.astroservices\.workers\.dev"/);
  assert.match(moduleSource, /window\.SMV_APK_RELEASE_ADMIN_API_URL\|\|window\.SMV_APK_RELEASE_API_URL/);
  assert.doesNotMatch(installer, /SMV_APK_RELEASE_ADMIN_API_URL|smv-astro-apk-release-api\.astroservices\.workers\.dev/);
  assert.doesNotMatch(moduleSource, /smv-astro-apk-release-api\.astroservices\.workers\.dev/);
  assert.doesNotMatch(installer + moduleSource, /DEFAULT_WORKER_BASE|SMV_ANDROID_APK_WORKER_DEFAULT/);
  assert.match(readme, /5105ebb3-435c-47b7-9983-2e171fa911cd/);
  assert.match(readme, /does not change existing Firebase, Razorpay, Render/);
  assert.match(readme, /Use only the existing D1 database/);
  assert.match(readme, /available=false/);
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
  assert.ok(workflow.includes('Worker health did not become ready after bounded propagation retries'));
  assert.ok(workflow.includes('Public APK metadata'));
  assert.ok(workflow.includes("typeof data.available !== 'boolean'"));
  assert.ok(workflow.includes('Public APK metadata did not pass validation'));
});
