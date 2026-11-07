import { appendFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const ANDROID_RELEASE_VERSION_ENV = Object.freeze({
  astro: { envName: 'SMV_ANDROID_VERSION_NAME', label: 'SMV ASTRO' },
  horoscope: { envName: 'SMV_HOROSCOPE_ANDROID_VERSION_NAME', label: 'SMV HOROSCOPE' },
  calendar: { envName: 'SMV_CALENDAR_ANDROID_VERSION_NAME', label: 'SMV CALENDAR' }
});

/**
 * Accept the existing vMAJOR.MINOR format and the common vMAJOR shorthand.
 * A shorthand such as v3 is made explicit as v3.0 before Gradle sees it.
 */
export function normalizeAndroidReleaseVersionName(value, appLabel = 'Android app') {
  const supplied = String(value ?? '').trim();
  const shorthand = /^v([1-9][0-9]*)$/.exec(supplied);
  const versionName = shorthand ? 'v' + shorthand[1] + '.0' : supplied;
  const match = /^v([1-9][0-9]*)\.([0-9]{1,3})$/.exec(versionName);
  if (!match) {
    throw new Error(appLabel + ' version must use vMAJOR.MINOR (for example v1.0); a major-only vMAJOR is accepted and means vMAJOR.0.');
  }

  const major = Number(match[1]);
  const minor = Number(match[2]);
  const versionCode = major * 1000 + minor;
  if (!Number.isSafeInteger(versionCode) || versionCode < 1000 || versionCode > 2100000000) {
    throw new Error(appLabel + ' calculated Android versionCode is outside the supported range.');
  }

  return { versionName, versionCode, wasNormalized: versionName !== supplied };
}

export async function normalizeAndroidReleaseVersionsInEnv(appIds, env = process.env, envPath = env.GITHUB_ENV) {
  if (!Array.isArray(appIds) || appIds.length === 0) {
    throw new Error('Pass one or more app IDs: astro, horoscope, calendar.');
  }
  if (!envPath) {
    throw new Error('GITHUB_ENV is not available; this command must run inside GitHub Actions.');
  }

  const records = [];
  for (const appId of appIds) {
    const app = ANDROID_RELEASE_VERSION_ENV[appId];
    if (!app) throw new Error('Unsupported Android app ID: ' + appId);
    const normalized = normalizeAndroidReleaseVersionName(env[app.envName], app.label);
    await appendFile(envPath, app.envName + '=' + normalized.versionName + '\n', { encoding: 'utf8' });
    records.push({ appId, ...normalized });
    const note = normalized.wasNormalized
      ? 'normalized ' + String(env[app.envName]) + ' to ' + normalized.versionName
      : 'validated ' + normalized.versionName;
    process.stdout.write(app.label + ': ' + note + ' (versionCode ' + normalized.versionCode + ').\n');
  }
  return records;
}

async function main() {
  await normalizeAndroidReleaseVersionsInEnv(process.argv.slice(2));
}

const entry = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (entry === import.meta.url) {
  main().catch(error => {
    process.stderr.write('Android release version normalization failed: ' + (error?.message || String(error)) + '\n');
    process.exitCode = 1;
  });
}
