'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

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
  assert.ok(workflow.includes('base64 --decode'));
  assert.ok(workflow.includes('keytool -list'));
  assert.ok(workflow.includes('assembleRelease'));
  assert.ok(workflow.includes('apksigner" verify --verbose --print-certs'));
  assert.ok(workflow.includes('rm -f "$RUNNER_TEMP/smv-astro-release.jks"'));
  assert.ok(workflow.includes('SMV-ASTRO-PERMANENT-RELEASE-APK'));
  assert.ok(workflow.includes('retention-days: 30'));
  assert.ok(docs.includes('Do not send the keystore, Base64 value, or passwords'));

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
  assert.ok(docs.includes('The existing .github/workflows/build-test-apks.yml workflow is not changed'));
});
