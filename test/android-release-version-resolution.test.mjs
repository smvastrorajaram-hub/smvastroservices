import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  ANDROID_RELEASE_APPS,
  appendAndroidReleaseVersionToEnv,
  nextAndroidReleaseVersion,
  resolveNextAndroidReleaseVersion
} from '../scripts/next-android-release-version.mjs';
import {
  normalizeAndroidReleaseVersionName,
  normalizeAndroidReleaseVersionsInEnv
} from '../scripts/normalize-android-release-version-name.mjs';

const current = (appId, versionName, versionCode) => ({
  success: true,
  available: true,
  appId,
  appName: appId,
  packageName: ANDROID_RELEASE_APPS[appId].packageName,
  versionName,
  versionCode
});

test('next Android release versions increase from the live published version per app', () => {
  assert.deepEqual(nextAndroidReleaseVersion(current('astro', 'v1.18', 1018), 'astro'), {
    appId: 'astro', versionName: 'v1.19', versionCode: 1019
  });
  assert.deepEqual(nextAndroidReleaseVersion(current('horoscope', 'v1.1', 1001), 'horoscope'), {
    appId: 'horoscope', versionName: 'v1.2', versionCode: 1002
  });
  assert.deepEqual(nextAndroidReleaseVersion(current('calendar', 'v1.1', 1001), 'calendar'), {
    appId: 'calendar', versionName: 'v1.2', versionCode: 1002
  });
});

test('version allocation carries to the next major at minor 999', () => {
  assert.deepEqual(nextAndroidReleaseVersion(current('astro', 'v1.999', 1999), 'astro'), {
    appId: 'astro', versionName: 'v2.0', versionCode: 2000
  });
});

test('version allocation fails closed on missing release metadata or identity mismatch', () => {
  assert.throws(() => nextAndroidReleaseVersion({ success: true, available: false }, 'astro'), /unavailable/);
  const wrongApp = current('astro', 'v1.18', 1018);
  wrongApp.packageName = 'in.smvastroservices.horoscope';
  assert.throws(() => nextAndroidReleaseVersion(wrongApp, 'astro'), /identity mismatch/);
  assert.throws(() => nextAndroidReleaseVersion(current('astro', 'v1.18', 1017), 'astro'), /mismatch/);
  assert.throws(() => nextAndroidReleaseVersion(current('astro', 'v1.18', 1018), 'unknown'), /Unsupported/);
});

test('version allocation reads only the selected app public metadata endpoint', async () => {
  const requested = [];
  const fetchImpl = async (url, options) => {
    requested.push({ url, options });
    const appId = url.endsWith('/public/android-app') ? 'astro' : 'horoscope';
    return new Response(JSON.stringify(current(appId, appId === 'astro' ? 'v1.18' : 'v1.1', appId === 'astro' ? 1018 : 1001)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };
  const astro = await resolveNextAndroidReleaseVersion('astro', fetchImpl);
  const horoscope = await resolveNextAndroidReleaseVersion('horoscope', fetchImpl);
  assert.equal(astro.versionName, 'v1.19');
  assert.equal(horoscope.versionName, 'v1.2');
  assert.deepEqual(requested.map(x => x.url), [
    'https://smv-astro-apk-release-api.astroservices.workers.dev/public/android-app',
    'https://smv-astro-apk-release-api.astroservices.workers.dev/public/android-apps/horoscope'
  ]);
  for (const call of requested) {
    assert.equal(call.options.method, 'GET');
    assert.equal(call.options.cache, 'no-store');
    assert.equal(call.options.headers.Accept, 'application/json');
  }
});

test('GITHUB_ENV receives one real newline-delimited variable for each app', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'smv-apk-version-env-'));
  const envFile = path.join(directory, 'github-env');
  try {
    await appendAndroidReleaseVersionToEnv('astro', {
      appId: 'astro', versionName: 'v1.19', versionCode: 1019
    }, envFile);
    await appendAndroidReleaseVersionToEnv('horoscope', {
      appId: 'horoscope', versionName: 'v1.2', versionCode: 1002
    }, envFile);
    await appendAndroidReleaseVersionToEnv('calendar', {
      appId: 'calendar', versionName: 'v1.2', versionCode: 1002
    }, envFile);

    const value = await readFile(envFile, 'utf8');
    assert.deepEqual(value.split('\n'), [
      'SMV_ANDROID_VERSION_NAME=v1.19',
      'SMV_HOROSCOPE_ANDROID_VERSION_NAME=v1.2',
      'SMV_CALENDAR_ANDROID_VERSION_NAME=v1.2',
      ''
    ]);
    assert.ok(!value.includes('\\n'), 'GITHUB_ENV must contain actual line breaks, not literal backslash-n text.');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});


test('manual Android version shorthand is normalized to the required major.minor format', () => {
  assert.deepEqual(normalizeAndroidReleaseVersionName('v3', 'SMV ASTRO'), {
    versionName: 'v3.0', versionCode: 3000, wasNormalized: true
  });
  assert.deepEqual(normalizeAndroidReleaseVersionName('v2', 'SMV HOROSCOPE'), {
    versionName: 'v2.0', versionCode: 2000, wasNormalized: true
  });
  assert.deepEqual(normalizeAndroidReleaseVersionName('v1.18', 'SMV ASTRO'), {
    versionName: 'v1.18', versionCode: 1018, wasNormalized: false
  });
  assert.throws(() => normalizeAndroidReleaseVersionName('v0', 'SMV ASTRO'), /vMAJOR\.MINOR/);
  assert.throws(() => normalizeAndroidReleaseVersionName('v2.1000', 'SMV CALENDAR'), /vMAJOR\.MINOR/);
  assert.throws(() => normalizeAndroidReleaseVersionName('v2100001', 'SMV HOROSCOPE'), /supported range/);
});

test('manual Android version normalization writes each selected app version to GITHUB_ENV', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'smv-manual-apk-version-'));
  const envFile = path.join(directory, 'github-env');
  try {
    const records = await normalizeAndroidReleaseVersionsInEnv(
      ['astro', 'horoscope', 'calendar'],
      {
        SMV_ANDROID_VERSION_NAME: 'v3',
        SMV_HOROSCOPE_ANDROID_VERSION_NAME: 'v2',
        SMV_CALENDAR_ANDROID_VERSION_NAME: 'v1.7'
      },
      envFile
    );
    assert.deepEqual(records.map(({appId, versionName, versionCode, wasNormalized}) => ({
      appId, versionName, versionCode, wasNormalized
    })), [
      {appId:'astro',versionName:'v3.0',versionCode:3000,wasNormalized:true},
      {appId:'horoscope',versionName:'v2.0',versionCode:2000,wasNormalized:true},
      {appId:'calendar',versionName:'v1.7',versionCode:1007,wasNormalized:false}
    ]);
    assert.equal(await readFile(envFile, 'utf8'), [
      'SMV_ANDROID_VERSION_NAME=v3.0',
      'SMV_HOROSCOPE_ANDROID_VERSION_NAME=v2.0',
      'SMV_CALENDAR_ANDROID_VERSION_NAME=v1.7',
      ''
    ].join('\n'));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
