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
const GITHUB_API_ORIGIN = 'https://api.github.com';
const MAX_GITHUB_RELEASE_PAGES = 20;

function parseVersionName(versionName, appId) {
  const match = /^v([1-9][0-9]*)\.([0-9]{1,3})$/.exec(String(versionName || ''));
  if (!match) return null;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const versionCode = major * 1000 + minor;
  if (!Number.isSafeInteger(versionCode) || versionCode < 1 || versionCode > 2100000000) {
    throw new Error('Android release version is outside the supported range for ' + appId + '.');
  }
  return { versionName: 'v' + major + '.' + minor, versionCode };
}

export function versionNameFromAndroidReleaseTag(tag, appId) {
  const value = String(tag || '');
  let match = null;
  if (appId === 'astro') {
    match = /^smv-astro-apk-(v[1-9][0-9]*\.[0-9]{1,3})-run-[0-9]+$/.exec(value);
    return match?.[1] || null;
  }
  if (appId === 'horoscope') {
    match = /^smv-horoscope-apk-(v[1-9][0-9]*\.[0-9]{1,3})-run-[0-9]+$/.exec(value);
    if (match) return match[1];
    match = /^smv-horoscope-calendar-apks-(v[1-9][0-9]*\.[0-9]{1,3})-v[1-9][0-9]*\.[0-9]{1,3}-run-[0-9]+$/.exec(value);
    return match?.[1] || null;
  }
  if (appId === 'calendar') {
    match = /^smv-calendar-apk-(v[1-9][0-9]*\.[0-9]{1,3})-run-[0-9]+$/.exec(value);
    if (match) return match[1];
    match = /^smv-horoscope-calendar-apks-v[1-9][0-9]*\.[0-9]{1,3}-(v[1-9][0-9]*\.[0-9]{1,3})-run-[0-9]+$/.exec(value);
    return match?.[1] || null;
  }
  throw new Error('Unsupported Android app ID: ' + appId);
}

export function nextAndroidReleaseVersion(release, appId, githubReleaseTags = []) {
  const app = ANDROID_RELEASE_APPS[appId];
  if (!app) throw new Error('Unsupported Android app ID: ' + appId);
  if (!release || release.success !== true || release.available !== true) {
    throw new Error('The current Cloudflare APK release is unavailable for ' + appId + '; refusing to guess a version.');
  }
  if (release.appId !== appId || release.packageName !== app.packageName) {
    throw new Error('Cloudflare APK release identity mismatch for ' + appId + '.');
  }

  const cloudflareVersion = parseVersionName(release.versionName, appId);
  if (!cloudflareVersion || Number(release.versionCode) !== cloudflareVersion.versionCode) {
    throw new Error('Cloudflare APK versionName/versionCode mismatch for ' + appId + '.');
  }

  // Cloudflare metadata is the published APK API state, while GitHub Releases
  // can contain signed APKs newer than the Worker metadata. Never allocate a
  // duplicate or downgrade version when those two release histories differ.
  let highest = cloudflareVersion;
  for (const tag of githubReleaseTags) {
    const versionName = versionNameFromAndroidReleaseTag(tag, appId);
    if (!versionName) continue;
    const candidate = parseVersionName(versionName, appId);
    if (candidate && candidate.versionCode > highest.versionCode) highest = candidate;
  }

  const currentMajor = Math.floor(highest.versionCode / 1000);
  const currentMinor = highest.versionCode % 1000;
  const nextMajor = currentMinor === 999 ? currentMajor + 1 : currentMajor;
  const nextMinor = currentMinor === 999 ? 0 : currentMinor + 1;
  const nextVersionName = 'v' + nextMajor + '.' + nextMinor;
  const nextVersionCode = nextMajor * 1000 + nextMinor;
  if (!Number.isSafeInteger(nextVersionCode) || nextVersionCode > 2100000000) {
    throw new Error('Next Android versionCode is outside the supported range for ' + appId + '.');
  }
  if (nextVersionCode <= highest.versionCode) {
    throw new Error('Next Android versionCode did not increase for ' + appId + '.');
  }
  return { appId, versionName: nextVersionName, versionCode: nextVersionCode };
}

export async function appendAndroidReleaseVersionToEnv(appId, next, envPath = process.env.GITHUB_ENV) {
  const app = ANDROID_RELEASE_APPS[appId];
  if (!app) throw new Error('Unsupported Android app ID: ' + appId);
  if (!envPath) throw new Error('GITHUB_ENV is not available; this step must run inside GitHub Actions.');
  if (next?.appId !== appId || !/^v[1-9][0-9]*\.[0-9]{1,3}$/.test(String(next.versionName || ''))) {
    throw new Error('Refusing to write an invalid Android release version for ' + appId + '.');
  }
  const parsed = parseVersionName(next.versionName, appId);
  if (parsed.versionCode !== next.versionCode) {
    throw new Error('Refusing to write a mismatched Android versionCode for ' + appId + '.');
  }
  await appendFile(envPath, app.envName + '=' + next.versionName + '\n', { encoding: 'utf8' });
}

async function getPublishedGithubReleaseTags(appId, fetchImpl, repository, token) {
  if (!/^[A-Za-z0-9_.-]+\\/[A-Za-z0-9_.-]+$/.test(String(repository || ''))) {
    throw new Error('GITHUB_REPOSITORY is missing or invalid; refusing to allocate a possibly duplicate Android version.');
  }

  const tags = [];
  for (let page = 1; page <= MAX_GITHUB_RELEASE_PAGES; page += 1) {
    const url = GITHUB_API_ORIGIN + '/repos/' + repository + '/releases?per_page=100&page=' + page;
    const headers = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };
    if (token) headers.Authorization = 'Bearer ' + token;
    const response = await fetchImpl(url, {
      method: 'GET',
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(20000)
    });
    if (!response.ok) {
      throw new Error('GitHub Android release history request failed (HTTP ' + response.status + ').');
    }
    const releases = await response.json();
    if (!Array.isArray(releases)) throw new Error('GitHub Android release history response is invalid.');
    for (const item of releases) {
      if (typeof item?.tag_name === 'string') tags.push(item.tag_name);
    }
    if (releases.length < 100) return tags;
  }
  throw new Error('GitHub Android release history exceeded the safe pagination limit; refusing to guess a version.');
}

export async function resolveNextAndroidReleaseVersion(
  appId,
  fetchImpl = fetch,
  repository = process.env.GITHUB_REPOSITORY,
  token = process.env.GITHUB_TOKEN
) {
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
  const githubReleaseTags = await getPublishedGithubReleaseTags(appId, fetchImpl, repository, token);
  return nextAndroidReleaseVersion(release, appId, githubReleaseTags);
}

async function main() {
  const appIds = process.argv.slice(2);
  if (!appIds.length || appIds.some(id => !ANDROID_RELEASE_APPS[id])) {
    throw new Error('Pass one or more app IDs: astro, horoscope, calendar.');
  }
  if (!process.env.GITHUB_ENV) throw new Error('GITHUB_ENV is not available; this script must run inside GitHub Actions.');
  if (!process.env.GITHUB_REPOSITORY) throw new Error('GITHUB_REPOSITORY is not available; refusing to allocate a possibly duplicate Android version.');
  for (const appId of appIds) {
    const next = await resolveNextAndroidReleaseVersion(appId);
    await appendAndroidReleaseVersionToEnv(appId, next);
    process.stdout.write('Allocated ' + appId + ' next version ' + next.versionName + ' (versionCode ' + next.versionCode + ') from the maximum Cloudflare/GitHub release history.\n');
  }
}

const entry = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (entry === import.meta.url) {
  main().catch(error => {
    process.stderr.write('Android release version allocation failed: ' + (error?.message || String(error)) + '\n');
    process.exitCode = 1;
  });
}
