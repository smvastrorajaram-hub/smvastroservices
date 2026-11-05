import { appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

export const ANDROID_RELEASE_APPS = Object.freeze({
  astro: {
    envName: 'SMV_ANDROID_VERSION_NAME',
    endpoint: '/public/android-app',
    packageName: 'in.smvastroservices.smvastro'
  },
  horoscope: {
    envName: 'SMV_HOROSCOPE_ANDROID_VERSION_NAME',
    endpoint: '/public/android-apps/horoscope',
    packageName: 'in.smvastroservices.horoscope'
  },
  calendar: {
    envName: 'SMV_CALENDAR_ANDROID_VERSION_NAME',
    endpoint: '/public/android-apps/calendar',
    packageName: 'in.smvastroservices.calendar'
  }
});

const RELEASE_API_ORIGIN = 'https://smv-astro-apk-release-api.astroservices.workers.dev';

export function nextAndroidReleaseVersion(release, appId) {
  const app = ANDROID_RELEASE_APPS[appId];
  if (!app) throw new Error('Unsupported Android app ID: ' + appId);
  if (!release || release.success !== true || release.available !== true) {
    throw new Error('The current Cloudflare APK release is unavailable for ' + appId + '; refusing to guess a version.');
  }
  if (release.appId !== appId || release.packageName !== app.packageName) {
    throw new Error('Cloudflare APK release identity mismatch for ' + appId + '.');
  }

  const match = /^v([1-9][0-9]*)\.([0-9]{1,3})$/.exec(String(release.versionName || ''));
  if (!match) throw new Error('Cloudflare APK release has an invalid versionName for ' + appId + '.');
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const expectedCode = major * 1000 + minor;
  if (!Number.isSafeInteger(expectedCode) || Number(release.versionCode) !== expectedCode) {
    throw new Error('Cloudflare APK versionName/versionCode mismatch for ' + appId + '.');
  }

  const nextMajor = minor === 999 ? major + 1 : major;
  const nextMinor = minor === 999 ? 0 : minor + 1;
  const nextVersionName = 'v' + nextMajor + '.' + nextMinor;
  const nextVersionCode = nextMajor * 1000 + nextMinor;
  if (!Number.isSafeInteger(nextVersionCode) || nextVersionCode > 2100000000) {
    throw new Error('Next Android versionCode is outside the supported range for ' + appId + '.');
  }
  if (nextVersionCode <= Number(release.versionCode)) {
    throw new Error('Next Android versionCode did not increase for ' + appId + '.');
  }
  return { appId, versionName: nextVersionName, versionCode: nextVersionCode };
}

export async function appendAndroidReleaseVersionToEnv(appId, next, envPath = process.env.GITHUB_ENV) {
  const app = ANDROID_RELEASE_APPS[appId];
  if (!app) throw new Error('Unsupported Android app ID: ' + appId);
  if (!envPath) throw new Error('GITHUB_ENV is not available; this step must run inside GitHub Actions.');
  if (next?.appId !== appId || !/^v[1-9][0-9]*\\.[0-9]{1,3}$/.test(String(next.versionName || ''))) {
    throw new Error('Refusing to write an invalid Android release version for ' + appId + '.');
  }
  await appendFile(envPath, app.envName + '=' + next.versionName + '\n', { encoding: 'utf8' });
}

export async function resolveNextAndroidReleaseVersion(appId, fetchImpl = fetch) {
  const app = ANDROID_RELEASE_APPS[appId];
  if (!app) throw new Error('Unsupported Android app ID: ' + appId);
  const url = RELEASE_API_ORIGIN + app.endpoint;
  const response = await fetchImpl(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(20000)
  });
  if (!response.ok) throw new Error('Cloudflare APK metadata request failed for ' + appId + ' (HTTP ' + response.status + ').');
  const release = await response.json();
  return nextAndroidReleaseVersion(release, appId);
}

async function main() {
  const appIds = process.argv.slice(2);
  if (!appIds.length || appIds.some(id => !ANDROID_RELEASE_APPS[id])) {
    throw new Error('Pass one or more app IDs: astro, horoscope, calendar.');
  }
  if (!process.env.GITHUB_ENV) throw new Error('GITHUB_ENV is not available; this script must run inside GitHub Actions.');
  for (const appId of appIds) {
    const next = await resolveNextAndroidReleaseVersion(appId);
    await appendAndroidReleaseVersionToEnv(appId, next);
    process.stdout.write('Allocated ' + appId + ' next version ' + next.versionName + ' (versionCode ' + next.versionCode + ') from the current Cloudflare release.\\n');
  }
}

const entry = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (entry === import.meta.url) {
  main().catch(error => {
    process.stderr.write('Android release version allocation failed: ' + (error?.message || String(error)) + '\n');
    process.exitCode = 1;
  });
}
