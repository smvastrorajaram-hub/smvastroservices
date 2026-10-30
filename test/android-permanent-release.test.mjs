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
  APK_FORMAT_BLOCKED_MESSAGE,
  NOT_ENABLED_MESSAGE,
  getCloudinaryConfigurationStatus,
  parseReleasePublicId,
  createAndroidApkCloudinaryStore,
  cloudinaryPublicError
} = require('../android-app-release-cloudinary');
const { Writable } = require('node:stream');

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
  assert.ok(server.includes('createAndroidApkCloudinaryStore'));
  assert.equal(server.includes("collection('smv_app_releases')"), false);
  assert.equal(server.includes('getStorage('), false);
  assert.ok(installer.includes('res.cloudinary.com'));
  assert.equal(installer.includes('firebasestorage.googleapis.com'), false);
  assert.ok(installer.includes('/raw/upload/'));
  assert.ok(read('android-app-release-cloudinary.js').includes('CLOUDINARY_APK_UPLOAD_ENABLED'));
  assert.ok(read('android-app-release-cloudinary.js').includes("resource_type: 'raw'"));
  assert.ok(read('android-app-release-cloudinary.js').includes("type: 'upload'"));
  assert.deepEqual(manifest.related_applications, [{ platform: 'play', id: SMV_ANDROID_PACKAGE }]);
  assert.equal(assetLinks[0].target.namespace, 'android_app');
  assert.equal(assetLinks[0].target.package_name, SMV_ANDROID_PACKAGE);
  assert.equal(assetLinks[0].target.sha256_cert_fingerprints[0].replaceAll(':', ''), SMV_RELEASE_CERT_SHA256);
  assert.ok(nativeManifest.includes('android:name="asset_statements"'));
  assert.ok(assetStatements.includes('https://smvastroservices.in'));
  assert.ok(assetStatements.includes('https://www.smvastroservices.in'));
  assert.ok(activity.includes('adminGroupAppManagement'));
  assert.ok(read('docs/SMV-ANDROID-PERMANENT-APK-WEBSITE-INSTALL.md').includes('Cloudinary Support'));
});

function cloudinaryTestEnv() {
  return {
    CLOUDINARY_CLOUD_NAME: 'l6r6c8zi',
    CLOUDINARY_API_KEY: 'test-api-key',
    CLOUDINARY_API_SECRET: 'test-api-secret',
    CLOUDINARY_APK_UPLOAD_ENABLED: 'true'
  };
}

function makeCloudinaryTestSdk({ resources = [], uploadError = null } = {}) {
  const state = { config: null, uploads: [], resourceCalls: [] };
  const sdk = {
    config(value) { state.config = value; },
    api: {
      async resources(options) {
        state.resourceCalls.push(options);
        return { resources, next_cursor: '' };
      }
    },
    uploader: {
      upload_stream(options, callback) {
        state.uploads.push(options);
        return new Writable({
          write(chunk, encoding, done) { done(); },
          final(done) {
            if (uploadError) callback(uploadError);
            else callback(null, {
              public_id: options.public_id,
              secure_url: 'https://res.cloudinary.com/l6r6c8zi/raw/upload/v1790000000/' + options.public_id,
              version: 1790000000,
              bytes: 2048,
              created_at: '2026-10-30T09:00:00Z',
              context: { custom: options.context }
            });
            done();
          }
        });
      }
    }
  };
  return { sdk, state };
}

test('Cloudinary APK publishing is disabled until Support approval and server credentials are configured', () => {
  const status = getCloudinaryConfigurationStatus({});
  assert.equal(status.ready, false);
  assert.equal(status.enabled, false);
  assert.match(status.message, /Cloudinary Support/);
  const missing = getCloudinaryConfigurationStatus({ CLOUDINARY_APK_UPLOAD_ENABLED: 'true' });
  assert.equal(missing.ready, false);
  assert.match(missing.message, /CLOUDINARY_API_SECRET/);
});

test('Cloudinary release public IDs enforce the Android versionCode sequence and environment boundary', () => {
  assert.deepEqual(parseReleasePublicId('smv-astro/android/releases/production/v1.1-1001.apk', 'smv-astro/android/releases/production'), {
    versionName: 'v1.1', versionCode: 1001
  });
  assert.equal(parseReleasePublicId('smv-astro/android/releases/production/v1.1-1002.apk', 'smv-astro/android/releases/production'), null);
  assert.equal(parseReleasePublicId('smv-astro/android/releases/staging/v1.1-1001.apk', 'smv-astro/android/releases/production'), null);
});

test('Cloudinary release discovery lists raw upload assets and selects the highest valid production version', async () => {
  const { sdk, state } = makeCloudinaryTestSdk({ resources: [
    { public_id: 'smv-astro/android/releases/production/v1.1-1001.apk', version: 10, secure_url: 'https://res.cloudinary.com/l6r6c8zi/raw/upload/v10/smv-astro/android/releases/production/v1.1-1001.apk', bytes: 2048, created_at: '2026-10-30T08:00:00Z', context: { custom: { packageName: SMV_ANDROID_PACKAGE, certificateSha256: 'CERT1' } } },
    { public_id: 'smv-astro/android/releases/production/v1.2-1002.apk', version: 11, secure_url: 'https://res.cloudinary.com/l6r6c8zi/raw/upload/v11/smv-astro/android/releases/production/v1.2-1002.apk', bytes: 4096, created_at: '2026-10-30T09:00:00Z', context: { custom: { packageName: SMV_ANDROID_PACKAGE, certificateSha256: 'CERT2' } } },
    { public_id: 'smv-astro/android/releases/production/not-an-apk.txt', version: 12, bytes: 1 }
  ] });
  const store = createAndroidApkCloudinaryStore({ cloudinary: sdk, env: cloudinaryTestEnv() });
  const latest = await store.getLatestRelease();
  assert.equal(latest.versionName, 'v1.2');
  assert.equal(latest.versionCode, 1002);
  assert.equal(latest.size, 4096);
  assert.equal(latest.certificateSha256, 'CERT2');
  assert.equal(state.config.cloud_name, 'l6r6c8zi');
  assert.equal(state.resourceCalls[0].resource_type, 'raw');
  assert.equal(state.resourceCalls[0].type, 'upload');
  assert.equal(state.resourceCalls[0].prefix, 'smv-astro/android/releases/production/');
});

test('staging and production APK releases use separate Cloudinary folders', async () => {
  const { sdk, state } = makeCloudinaryTestSdk();
  const store = createAndroidApkCloudinaryStore({ cloudinary: sdk, env: cloudinaryTestEnv(), isStaging: true });
  assert.equal(store.releasePrefix, 'smv-astro/android/releases/staging');
  await store.getLatestRelease();
  assert.equal(state.resourceCalls[0].prefix, 'smv-astro/android/releases/staging/');
});

test('APK upload uses authenticated raw/upload delivery and immutable versioned public IDs', async () => {
  const { sdk, state } = makeCloudinaryTestSdk();
  const store = createAndroidApkCloudinaryStore({ cloudinary: sdk, env: cloudinaryTestEnv() });
  const result = await store.publishRelease(Buffer.from('mock-apk'), {
    packageName: SMV_ANDROID_PACKAGE, versionName: 'v1.1', versionCode: 1001,
    sha256: 'sha256-value', certificateSha256: 'cert-value'
  }, 'admin-uid');
  assert.equal(result.versionName, 'v1.1');
  assert.equal(result.versionCode, 1001);
  assert.match(result.downloadUrl, /res\.cloudinary\.com\/l6r6c8zi\/raw\/upload/);
  assert.equal(state.uploads.length, 1);
  assert.equal(state.uploads[0].resource_type, 'raw');
  assert.equal(state.uploads[0].type, 'upload');
  assert.equal(state.uploads[0].overwrite, false);
  assert.equal(state.uploads[0].public_id, 'smv-astro/android/releases/production/v1.1-1001.apk');
  assert.equal(state.uploads[0].context.uploadedBy, 'admin-uid');
  assert.equal(state.uploads[0].context.sha256, 'sha256-value');
});

test('APK upload refuses any version that is not higher than the current Cloudinary release', async () => {
  const { sdk, state } = makeCloudinaryTestSdk({ resources: [
    { public_id: 'smv-astro/android/releases/production/v1.2-1002.apk', version: 11, secure_url: 'https://res.cloudinary.com/l6r6c8zi/raw/upload/v11/smv-astro/android/releases/production/v1.2-1002.apk', bytes: 4096 }
  ] });
  const store = createAndroidApkCloudinaryStore({ cloudinary: sdk, env: cloudinaryTestEnv() });
  await assert.rejects(() => store.publishRelease(Buffer.from('mock-apk'), {
    packageName: SMV_ANDROID_PACKAGE, versionName: 'v1.1', versionCode: 1001, sha256: 'sha', certificateSha256: 'cert'
  }), error => error.httpStatus === 409 && error.currentVersionCode === 1002);
  assert.equal(state.uploads.length, 0);
});

test('APK upload fails closed when Cloudinary Support approval is not enabled', async () => {
  const { sdk, state } = makeCloudinaryTestSdk();
  const store = createAndroidApkCloudinaryStore({ cloudinary: sdk, env: {} });
  await assert.rejects(() => store.publishRelease(Buffer.from('mock-apk'), {
    packageName: SMV_ANDROID_PACKAGE, versionName: 'v1.1', versionCode: 1001, sha256: 'sha', certificateSha256: 'cert'
  }), error => error.httpStatus === 503 && error.message === NOT_ENABLED_MESSAGE);
  assert.equal(state.uploads.length, 0);
});

test('Cloudinary APK format rejection returns the Support allowlist requirement to Admin', async () => {
  const { sdk, state } = makeCloudinaryTestSdk({ uploadError: new Error('File format apk not allowed') });
  const store = createAndroidApkCloudinaryStore({ cloudinary: sdk, env: cloudinaryTestEnv() });
  await assert.rejects(() => store.publishRelease(Buffer.from('mock-apk'), {
    packageName: SMV_ANDROID_PACKAGE, versionName: 'v1.1', versionCode: 1001, sha256: 'sha', certificateSha256: 'cert'
  }), error => error.code === 'CLOUDINARY_APK_FORMAT_BLOCKED' && error.message === APK_FORMAT_BLOCKED_MESSAGE);
  assert.equal(state.uploads.length, 1);
  const mapped = cloudinaryPublicError(Object.assign(new Error(APK_FORMAT_BLOCKED_MESSAGE), { code: 'CLOUDINARY_APK_FORMAT_BLOCKED', httpStatus: 503 }));
  assert.equal(mapped.status, 503);
  assert.equal(mapped.body.code, 'CLOUDINARY_APK_FORMAT_BLOCKED');
});
