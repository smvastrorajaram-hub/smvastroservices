import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { inspectSmvAndroidApk, SMV_ANDROID_PACKAGE, SMV_RELEASE_CERT_SHA256, MAX_APK_BYTES } = require('../android-app-release');
const { ratePolicyForRequest } = require('../api-security');
const {
  SMV_GITHUB_REPOSITORY,
  parseAndroidReleaseTag,
  makeReleaseBody,
  makeDownloadUrl,
  toPublicAndroidRelease,
  createAndroidApkGitHubStore,
  githubReleasePublicError
} = require('../android-app-release-github');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('SMV ASTRO uses ordered vMAJOR.MINOR names and monotonically increasing Android versionCode', () => {
  const gradle = read('smvastroproduction/build.gradle');
  const workflow = read('.github/workflows/build-smv-astro-production-apk.yml');
  const docs = read('docs/android-native-call-ringtone.md');

  assert.ok(gradle.includes('.orElse("v1.0")'));
  assert.ok(gradle.includes('versionCode appVersionCode'));
  assert.ok(gradle.includes('versionName appVersionName'));
  assert.ok(gradle.includes('calculatedVersionCode = versionMajor * 1000L + versionMinor'));
  assert.ok(workflow.includes('default: "v1.0"'));
  assert.ok(workflow.includes('version_name'));
  assert.ok(workflow.includes('version_code=$((10#$major * 1000 + 10#$minor))'));
  assert.match(docs, /v1\.0[\s\S]*v1\.1[\s\S]*v1\.2/);

  const androidCode = version => {
    const match = /^v([1-9][0-9]*)\.([0-9]{1,3})$/.exec(version);
    assert.ok(match, 'valid version expected: ' + version);
    return Number(match[1]) * 1000 + Number(match[2]);
  };
  const versions = ['v1.0', 'v1.1', 'v1.2', 'v1.9', 'v1.10', 'v1.999', 'v2.0', 'v2.1'];
  const codes = versions.map(androidCode);
  assert.deepEqual(codes, [1000, 1001, 1002, 1009, 1010, 1999, 2000, 2001]);
  assert.ok(codes.every((code, index) => index === 0 || code > codes[index - 1]));
});

test('permanent Release signing reads only repository secrets and never commits a signing key', () => {
  const gradle = read('smvastroproduction/build.gradle');
  const workflow = read('.github/workflows/build-smv-astro-production-apk.yml');
  const docs = read('docs/android-native-call-ringtone.md');

  for (const secret of [
    'SMV_ANDROID_KEYSTORE_BASE64',
    'SMV_ANDROID_KEYSTORE_PASSWORD',
    'SMV_ANDROID_KEY_ALIAS',
    'SMV_ANDROID_KEY_PASSWORD'
  ]) {
    assert.ok(workflow.includes('secrets.' + secret), secret + ' must be sourced from GitHub Actions secrets');
    assert.ok(workflow.includes(secret), secret + ' must be preflight-validated');
  }

  assert.ok(gradle.includes('SMV_ANDROID_KEYSTORE_PATH'));
  assert.ok(gradle.includes('signingConfig signingConfigs.release'));
  assert.ok(gradle.includes('storeType = "PKCS12"'));
  assert.ok(workflow.includes('base64 --decode'));
  assert.ok(workflow.includes('keytool -list'));
  assert.ok(workflow.includes('assembleRelease'));
  assert.ok(workflow.includes('apksigner" verify --verbose --print-certs'));
  assert.ok(workflow.includes('rm -f "$RUNNER_TEMP/smv-astro-release.p12"'));
  assert.ok(workflow.includes('SMV-ASTRO-PERMANENT-RELEASE-APK'));
  assert.ok(workflow.includes('retention-days: 30'));
  assert.ok(docs.includes('Do not send the keystore, Base64 text, or passwords'));

  assert.doesNotMatch(gradle, /\.jks/);
  assert.doesNotMatch(gradle, /password\s*=\s*["'][^"']+["']/i);
});

test('Debug APK remains a test-only artifact and existing Test APK workflow is separate', () => {
  const workflow = read('.github/workflows/build-smv-astro-production-apk.yml');
  const gradle = read('smvastroproduction/build.gradle');
  const docs = read('docs/android-native-call-ringtone.md');

  assert.match(workflow, /assembleDebug/);
  assert.match(workflow, /SMV-ASTRO-PRODUCTION-DEBUG-TEST-APK/);
  assert.match(workflow, /retention-days: 7/);
  assert.match(gradle, /applicationId "in\.smvastroservices\.smvastro"/);
  assert.ok(docs.includes('Debug APKs are for testing only'));
  assert.ok(docs.includes('The existing ') && docs.includes('.github/workflows/build-test-apks.yml') && docs.includes('workflow is not changed'));
});

test('mobile-only one-time keystore generation is explicit, password-protected, and short-lived', () => {
  const workflow = read('.github/workflows/build-smv-astro-production-apk.yml');
  const gradle = read('smvastroproduction/build.gradle');
  const docs = read('docs/android-native-call-ringtone.md');

  assert.ok(workflow.includes('generate_release_keystore'));
  assert.ok(workflow.includes('inputs.generate_release_keystore'));
  assert.ok(workflow.includes('Generate password-protected PKCS12 keystore and Base64 copy'));
  assert.ok(workflow.includes('keytool -genkeypair'));
  assert.ok(workflow.includes('-storetype PKCS12'));
  assert.ok(workflow.includes('-keysize 4096'));
  assert.ok(workflow.includes('SMV-ASTRO-RELEASE-KEYSTORE-ONE-TIME'));
  assert.ok(workflow.includes('retention-days: 1'));
  assert.ok(workflow.includes('SMV_ANDROID_KEYSTORE_BASE64.txt'));
  assert.ok(workflow.includes('A keystore Base64 secret already exists'));
  assert.ok(workflow.includes('at least 32 characters'));
  assert.ok(workflow.includes('build:') && workflow.includes('!inputs.generate_release_keystore'));
  assert.ok(gradle.includes('storeType = "PKCS12"'));
  assert.ok(docs.includes('Android phone + GitHub Cloud'));
  assert.ok(docs.includes('This repository is public'));
  assert.ok(docs.includes('delete the artifact'));
  assert.ok(docs.includes('feature/smv-astro-permanent-release-build-20261030'));
  assert.ok(docs.includes('The artifact expires after **1 day**') || docs.includes('expires after **1 day**'));
  assert.doesNotMatch(workflow, /echo\s+["']?\$SMV_ANDROID_(?:KEYSTORE_PASSWORD|KEY_PASSWORD)/);
});


test('Android APK validator enforces size, package, ordered version and permanent signing identity', () => {
  assert.equal(SMV_ANDROID_PACKAGE, 'in.smvastroservices.smvastro');
  assert.equal(SMV_RELEASE_CERT_SHA256, '7A3BE159218A38083986DEC117C0BD281B3EF42BDA65F2BB7B8C9946B5293401');
  assert.equal(MAX_APK_BYTES, 100 * 1024 * 1024);
  assert.throws(() => inspectSmvAndroidApk(Buffer.alloc(512)), /between 1 KB and 100 MB/);
  assert.throws(() => inspectSmvAndroidApk(Buffer.alloc(1024)), /valid ZIP archive/);
});

test('APK manager API limits public polling and Admin upload attempts', () => {
  assert.equal(ratePolicyForRequest({ method: 'GET', path: '/public/android-app' }).name, 'public-read');
  const policy = ratePolicyForRequest({ method: 'POST', path: '/admin/android-app/upload' });
  assert.equal(policy.name, 'admin-apk-upload');
  assert.equal(policy.max, 5);
  assert.equal(policy.windowMs, 60 * 60_000);
});

test('Website APK manager only exposes download/update controls and hides native app management', () => {
  const html = read('public/index.html');
  const installer = read('public/android-app-install.js');
  const server = read('server.js');
  const manifest = JSON.parse(read('public/manifest.webmanifest'));
  const assetLinks = JSON.parse(read('public/.well-known/assetlinks.json'));
  const nativeManifest = read('smvastroproduction/src/main/AndroidManifest.xml');
  const activity = read('smvastroproduction/src/main/java/in/smvastroservices/smvastro/MainActivity.java');
  const assetStatements = read('smvastroproduction/src/main/res/values/strings.xml');

  assert.ok(html.includes('id="adminGroupAppManagement"'));
  assert.ok(html.includes('id="adminAndroidAppFile"'));
  assert.ok(html.includes('id="adminAndroidAppUpload"'));
  assert.equal(html.includes('smvPermanentApkUpload'), false);
  assert.equal(installer.includes('releases/new'), false);
  assert.ok(installer.includes('DOWNLOAD APP'));
  assert.ok(installer.includes('UPDATE APP'));
  assert.ok(installer.includes('getInstalledRelatedApps'));
  assert.ok(installer.includes('SMVNativeCalls.isNativeApp'));
  assert.ok(server.includes("app.post('/admin/android-app/upload'"));
  assert.ok(server.includes('isAdminUser(actor)'));
  assert.ok(server.includes("express.raw({ type: 'application/vnd.android.package-archive'"));
  assert.ok(server.includes('androidApkReleaseStore.publishRelease'));
  assert.ok(server.includes('createAndroidApkGitHubStore'));
  assert.ok(read('android-app-release-github.js').includes('SMV_GITHUB_RELEASE_TOKEN'));
  assert.equal(server.includes("collection('smv_app_releases')"), false);
  assert.equal(server.includes('getStorage('), false);
  assert.equal(server.includes("require('cloudinary')"), false);
  assert.ok(installer.includes("'/smvastrorajaram-hub/smvastroservices/releases/download/'"));
  assert.ok(installer.includes("url.hostname !== 'github.com'"));
  assert.equal(installer.includes('res.cloudinary.com'), false);
  assert.equal(installer.includes('firebasestorage.googleapis.com'), false);
  assert.ok(read('android-app-release-github.js').includes('uploads.github.com'));
  assert.ok(read('android-app-release-github.js').includes('draft: true'));
  assert.ok(read('android-app-release-github.js').includes("make_latest: 'false'"));
  assert.deepEqual(manifest.related_applications, [{ platform: 'play', id: SMV_ANDROID_PACKAGE }]);
  assert.equal(assetLinks[0].target.namespace, 'android_app');
  assert.equal(assetLinks[0].target.package_name, SMV_ANDROID_PACKAGE);
  assert.equal(assetLinks[0].target.sha256_cert_fingerprints[0].replaceAll(':', ''), SMV_RELEASE_CERT_SHA256);
  assert.ok(nativeManifest.includes('android:name="asset_statements"'));
  assert.ok(assetStatements.includes('https://smvastroservices.in'));
  assert.ok(assetStatements.includes('https://www.smvastroservices.in'));
  assert.ok(activity.includes('adminGroupAppManagement'));
  assert.ok(read('docs/SMV-ANDROID-PERMANENT-APK-WEBSITE-INSTALL.md').includes('SMV_GITHUB_RELEASE_TOKEN'));
});


function apkFixture(versionName = 'v1.1', extra = {}) {
  const match = /^v([1-9][0-9]*)\.([0-9]{1,3})$/.exec(versionName);
  if (!match) throw new Error('Bad fixture version.');
  return {
    packageName: SMV_ANDROID_PACKAGE,
    versionName,
    versionCode: Number(match[1]) * 1000 + Number(match[2]),
    sha256: 'a'.repeat(64),
    certificateSha256: SMV_RELEASE_CERT_SHA256,
    size: 2048,
    ...extra
  };
}

function githubEnv(token = 'test-github-token') {
  return token ? { SMV_GITHUB_RELEASE_TOKEN: token } : {};
}

function githubReleaseFixture(versionName, id = 1, options = {}) {
  const apk = apkFixture(versionName);
  const parsed = parseAndroidReleaseTag('smv-astro-' + versionName);
  const metadata = {
    packageName: SMV_ANDROID_PACKAGE,
    versionName: apk.versionName,
    versionCode: apk.versionCode,
    sha256: apk.sha256,
    certificateSha256: apk.certificateSha256,
    uploadedBy: 'admin-uid',
    uploadedAt: '2026-10-30T09:00:00.000Z'
  };
  const fileName = parsed.fileName;
  const asset = {
    id: id * 10,
    name: fileName,
    size: options.size || 4096,
    state: options.assetState || 'uploaded',
    browser_download_url: makeDownloadUrl(parsed.tagName, fileName),
    created_at: options.createdAt || '2026-10-30T09:00:00Z'
  };
  return {
    id,
    tag_name: parsed.tagName,
    name: 'SMV ASTRO Android ' + versionName,
    body: makeReleaseBody(metadata),
    draft: !!options.draft,
    prerelease: !!options.prerelease,
    published_at: options.draft ? null : '2026-10-30T09:00:00Z',
    assets: options.noAsset ? [] : [asset]
  };
}

function fakeResponse(status, value) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get() { return null; } },
    async text() {
      if (value === null || value === undefined) return '';
      return typeof value === 'string' ? value : JSON.stringify(value);
    }
  };
}

function makeGitHubFetchMock({ releases = [], failUpload = false } = {}) {
  const state = {
    releases: structuredClone(releases),
    requests: [],
    nextId: Math.max(0, ...releases.map(item => Number(item.id) || 0)) + 1
  };
  const fetchImpl = async (input, options = {}) => {
    const url = new URL(String(input));
    const method = String(options.method || 'GET').toUpperCase();
    state.requests.push({
      url: url.href,
      method,
      headers: options.headers || {},
      body: options.body
    });

    if (url.hostname === 'api.github.com') {
      const base = '/repos/' + SMV_GITHUB_REPOSITORY;
      if (method === 'GET' && url.pathname === base + '/releases') {
        const page = Number(url.searchParams.get('page') || 1);
        const start = (page - 1) * 100;
        return fakeResponse(200, state.releases.slice(start, start + 100));
      }
      if (method === 'POST' && url.pathname === base + '/releases') {
        const payload = JSON.parse(options.body);
        const release = {
          id: state.nextId++,
          tag_name: payload.tag_name,
          name: payload.name,
          body: payload.body,
          draft: payload.draft,
          prerelease: payload.prerelease,
          published_at: null,
          assets: []
        };
        state.releases.push(release);
        return fakeResponse(201, release);
      }
      const releaseMatch = new RegExp('^' + base + '/releases/([0-9]+)$').exec(url.pathname);
      if (releaseMatch && method === 'PATCH') {
        const release = state.releases.find(item => item.id === Number(releaseMatch[1]));
        if (!release) return fakeResponse(404, { message: 'Not Found' });
        const payload = JSON.parse(options.body);
        Object.assign(release, payload);
        if (payload.draft === false) release.published_at = '2026-10-30T09:10:00Z';
        return fakeResponse(200, release);
      }
      if (releaseMatch && method === 'DELETE') {
        state.releases = state.releases.filter(item => item.id !== Number(releaseMatch[1]));
        return fakeResponse(204, null);
      }
      if (method === 'DELETE' && url.pathname.startsWith(base + '/git/refs/tags/')) {
        state.deletedTag = decodeURIComponent(url.pathname.slice((base + '/git/refs/tags/').length));
        return fakeResponse(204, null);
      }
      return fakeResponse(404, { message: 'Unexpected mock API route: ' + method + ' ' + url.pathname });
    }

    if (url.hostname === 'uploads.github.com' && method === 'POST') {
      if (failUpload) return fakeResponse(500, { message: 'Mock upload failure' });
      const match = new RegExp('^/repos/' + SMV_GITHUB_REPOSITORY + '/releases/([0-9]+)/assets$').exec(url.pathname);
      if (!match) return fakeResponse(404, { message: 'Unknown release upload path' });
      const release = state.releases.find(item => item.id === Number(match[1]));
      if (!release) return fakeResponse(404, { message: 'Release not found' });
      const name = url.searchParams.get('name');
      const tag = release.tag_name;
      const size = Buffer.isBuffer(options.body) ? options.body.length : 0;
      const asset = {
        id: release.id * 10,
        name,
        size,
        state: 'uploaded',
        browser_download_url: makeDownloadUrl(tag, name),
        created_at: '2026-10-30T09:05:00Z'
      };
      release.assets.push(asset);
      return fakeResponse(201, asset);
    }

    return fakeResponse(404, { message: 'Unexpected host: ' + url.hostname });
  };
  return { fetchImpl, state };
}

test('GitHub Release tag parser enforces the established Android versionCode sequence', () => {
  assert.deepEqual(parseAndroidReleaseTag('smv-astro-v1.1'), {
    tagName: 'smv-astro-v1.1',
    versionName: 'v1.1',
    versionCode: 1001,
    fileName: 'SMV-ASTRO-v1.1.apk'
  });
  assert.deepEqual(parseAndroidReleaseTag('smv-astro-v2.12').versionCode, 2012);
  assert.equal(parseAndroidReleaseTag('smv-astro-v1.1001'), null);
  assert.equal(parseAndroidReleaseTag('other-app-v1.1'), null);
  assert.equal(parseAndroidReleaseTag('smv-astro-v0.1'), null);
});

test('GitHub APK publishing is disabled without a token and always read-only on staging', () => {
  const missing = createAndroidApkGitHubStore({ env: {}, fetchImpl: async () => fakeResponse(200, []) });
  assert.equal(missing.configurationStatus().ready, false);
  assert.match(missing.configurationStatus().message, /SMV_GITHUB_RELEASE_TOKEN/);

  const staging = createAndroidApkGitHubStore({ env: githubEnv(), isStaging: true, fetchImpl: async () => fakeResponse(200, []) });
  assert.equal(staging.configurationStatus().tokenConfigured, true);
  assert.equal(staging.configurationStatus().ready, false);
  assert.match(staging.configurationStatus().message, /read-only/);
});

test('GitHub Release discovery selects the highest valid SMV ASTRO production APK and ignores unrelated releases', async () => {
  const unrelated = {
    id: 90, tag_name: 'v9.9', draft: false, prerelease: false, assets: []
  };
  const invalidCertificate = githubReleaseFixture('v1.9', 19);
  invalidCertificate.body = invalidCertificate.body.replace(/"certificateSha256":"[A-F0-9]{64}"/, '"certificateSha256":"' + '0'.repeat(64) + '"');
  const draft = githubReleaseFixture('v2.0', 20, { draft: true });
  const { fetchImpl } = makeGitHubFetchMock({
    releases: [unrelated, githubReleaseFixture('v1.1', 11), githubReleaseFixture('v1.3', 13), invalidCertificate, draft]
  });
  const store = createAndroidApkGitHubStore({ env: githubEnv(), fetchImpl });
  const latest = await store.getLatestRelease();
  assert.equal(latest.versionName, 'v1.3');
  assert.equal(latest.versionCode, 1003);
  assert.equal(latest.packageName, SMV_ANDROID_PACKAGE);
  assert.equal(latest.certificateSha256, SMV_RELEASE_CERT_SHA256);
  assert.equal(latest.downloadUrl, 'https://github.com/' + SMV_GITHUB_REPOSITORY + '/releases/download/smv-astro-v1.3/SMV-ASTRO-v1.3.apk');
});

test('GitHub APK upload creates a draft, uploads a verified immutable asset, then publishes the release', async () => {
  const { fetchImpl, state } = makeGitHubFetchMock({ releases: [] });
  const store = createAndroidApkGitHubStore({ env: githubEnv(), fetchImpl });
  const result = await store.publishRelease(Buffer.alloc(2048), apkFixture('v1.1'), 'admin-uid');

  assert.equal(result.versionName, 'v1.1');
  assert.equal(result.versionCode, 1001);
  assert.equal(result.size, 2048);
  assert.equal(result.uploadedBy, 'admin-uid');
  assert.equal(result.sha256, 'a'.repeat(64));
  assert.equal(result.downloadUrl, 'https://github.com/' + SMV_GITHUB_REPOSITORY + '/releases/download/smv-astro-v1.1/SMV-ASTRO-v1.1.apk');

  const create = state.requests.find(item => item.method === 'POST' && item.url.endsWith('/releases'));
  const upload = state.requests.find(item => item.method === 'POST' && item.url.startsWith('https://uploads.github.com/'));
  const publish = state.requests.find(item => item.method === 'PATCH' && item.url.endsWith('/releases/' + state.releases[0].id));
  assert.ok(create);
  assert.ok(upload);
  assert.ok(publish);
  assert.equal(JSON.parse(create.body).draft, true);
  assert.equal(JSON.parse(create.body).tag_name, 'smv-astro-v1.1');
  assert.equal(JSON.parse(create.body).target_commitish, 'main');
  assert.equal(upload.headers.Authorization, 'Bearer test-github-token');
  assert.equal(upload.headers['Content-Type'], 'application/vnd.android.package-archive');
  assert.equal(publish.headers.Authorization, 'Bearer test-github-token');
  assert.equal(state.releases[0].draft, false);
  assert.equal(state.releases[0].assets[0].name, 'SMV-ASTRO-v1.1.apk');
  assert.equal(state.releases[0].assets[0].size, 2048);
});

test('GitHub APK publisher blocks a versionCode that is not higher than the current published release', async () => {
  const { fetchImpl, state } = makeGitHubFetchMock({ releases: [githubReleaseFixture('v1.2', 12)] });
  const store = createAndroidApkGitHubStore({ env: githubEnv(), fetchImpl });
  await assert.rejects(
    () => store.publishRelease(Buffer.alloc(2048), apkFixture('v1.1'), 'admin-uid'),
    error => error.httpStatus === 409 && error.currentVersionCode === 1002 && error.uploadedVersionCode === 1001
  );
  assert.equal(state.requests.some(item => item.method === 'POST' && item.url.endsWith('/releases')), false);
});

test('GitHub APK publisher checks a missing token before attempting any network write', async () => {
  const { fetchImpl, state } = makeGitHubFetchMock();
  const store = createAndroidApkGitHubStore({ env: {}, fetchImpl });
  await assert.rejects(
    () => store.publishRelease(Buffer.alloc(2048), apkFixture('v1.1'), 'admin-uid'),
    error => error.httpStatus === 503 && error.code === 'GITHUB_RELEASE_TOKEN_MISSING'
  );
  assert.equal(state.requests.length, 0);
});

test('GitHub APK publisher removes an incomplete draft release and version tag after asset upload failure', async () => {
  const { fetchImpl, state } = makeGitHubFetchMock({ failUpload: true });
  const store = createAndroidApkGitHubStore({ env: githubEnv(), fetchImpl });
  await assert.rejects(
    () => store.publishRelease(Buffer.alloc(2048), apkFixture('v1.1'), 'admin-uid'),
    error => error.githubStatus === 500
  );
  assert.equal(state.releases.length, 0);
  assert.equal(state.deletedTag, 'smv-astro-v1.1');
});

test('GitHub public download metadata rejects an asset whose published URL or signing identity differs', () => {
  const release = githubReleaseFixture('v1.1', 1);
  const valid = toPublicAndroidRelease(release);
  assert.equal(valid.versionCode, 1001);
  release.assets[0].browser_download_url = 'https://example.com/fake.apk';
  assert.equal(toPublicAndroidRelease(release), null);
});

test('GitHub release list pagination reads later pages before choosing the maximum version', async () => {
  const firstPage = Array.from({ length: 100 }, (_, index) => ({
    id: index + 1, tag_name: 'unrelated-' + index, draft: false, prerelease: false, assets: []
  }));
  const secondPageRelease = githubReleaseFixture('v1.7', 101);
  const { fetchImpl, state } = makeGitHubFetchMock({ releases: [...firstPage, secondPageRelease] });
  const store = createAndroidApkGitHubStore({ env: githubEnv(), fetchImpl });
  const latest = await store.getLatestRelease();
  assert.equal(latest.versionName, 'v1.7');
  assert.equal(state.requests.filter(item => item.method === 'GET' && item.url.includes('/releases?')).length, 2);
});

test('GitHub Release errors map to safe Admin API status and preserve version conflict details', () => {
  const error = Object.assign(new Error('A version already exists.'), {
    code: 'ANDROID_APK_VERSION_CONFLICT',
    httpStatus: 409,
    currentVersionCode: 1002,
    uploadedVersionCode: 1001
  });
  const mapped = githubReleasePublicError(error);
  assert.equal(mapped.status, 409);
  assert.equal(mapped.body.code, 'ANDROID_APK_VERSION_CONFLICT');
  assert.equal(mapped.body.currentVersionCode, 1002);
  assert.equal(mapped.body.uploadedVersionCode, 1001);
});
