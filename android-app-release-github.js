'use strict';

const {
  MAX_APK_BYTES,
  SMV_ANDROID_PACKAGE,
  SMV_RELEASE_CERT_SHA256
} = require('./android-app-release');

const SMV_GITHUB_REPOSITORY = 'smvastrorajaram-hub/smvastroservices';
const SMV_GITHUB_API = 'https://api.github.com';
const SMV_GITHUB_UPLOADS = 'https://uploads.github.com';
const SMV_ANDROID_RELEASE_TAG_PREFIX = 'smv-astro-';
const SMV_ANDROID_APK_FILE_PREFIX = 'SMV-ASTRO-';
const SMV_ANDROID_RELEASE_CACHE_MS = 60_000;

function parseAndroidReleaseTag(tagName) {
  const match = /^smv-astro-v([1-9][0-9]*)\.([0-9]{1,3})$/.exec(String(tagName || ''));
  if (!match) return null;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const versionCode = major * 1000 + minor;
  if (!Number.isSafeInteger(versionCode) || versionCode < 1) return null;
  return {
    tagName: String(tagName),
    versionName: 'v' + major + '.' + minor,
    versionCode,
    fileName: SMV_ANDROID_APK_FILE_PREFIX + 'v' + major + '.' + minor + '.apk'
  };
}

function normalizeFingerprint(value) {
  return String(value || '').replace(/[^0-9a-f]/gi, '').toUpperCase();
}

function parseReleaseMetadata(body) {
  const match = /<!--\s*SMV_ASTRO_APK_METADATA\s*([\s\S]*?)\s*-->/.exec(String(body || ''));
  if (!match) return null;
  try {
    const value = JSON.parse(match[1]);
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  } catch (_) {
    return null;
  }
}

function makeReleaseBody(metadata) {
  return [
    'Official signed SMV ASTRO Android application release.',
    '',
    'Package: ' + SMV_ANDROID_PACKAGE,
    'Version: ' + metadata.versionName,
    'Android versionCode: ' + metadata.versionCode,
    'APK SHA-256: ' + metadata.sha256,
    'Release certificate SHA-256: ' + metadata.certificateSha256,
    '',
    '<!-- SMV_ASTRO_APK_METADATA',
    JSON.stringify(metadata),
    '-->'
  ].join('\n');
}

function makeDownloadUrl(tagName, fileName) {
  return 'https://github.com/' + SMV_GITHUB_REPOSITORY +
    '/releases/download/' + encodeURIComponent(tagName) + '/' + encodeURIComponent(fileName);
}

function toPublicAndroidRelease(release, asset) {
  if (!release || release.draft === true || release.prerelease === true) return null;
  const parsed = parseAndroidReleaseTag(release.tag_name);
  if (!parsed) return null;
  const item = (Array.isArray(release.assets) ? release.assets : [])
    .find(value => value && value.name === parsed.fileName && value.state === 'uploaded') || asset;
  if (!item || item.name !== parsed.fileName || item.state !== 'uploaded') return null;
  const size = Number(item.size || 0);
  if (!Number.isSafeInteger(size) || size < 1024 || size > MAX_APK_BYTES) return null;
  const metadata = parseReleaseMetadata(release.body);
  if (!metadata ||
      metadata.packageName !== SMV_ANDROID_PACKAGE ||
      metadata.versionName !== parsed.versionName ||
      Number(metadata.versionCode) !== parsed.versionCode ||
      normalizeFingerprint(metadata.certificateSha256) !== normalizeFingerprint(SMV_RELEASE_CERT_SHA256) ||
      !/^[0-9a-f]{64}$/i.test(String(metadata.sha256 || ''))) {
    return null;
  }
  const downloadUrl = makeDownloadUrl(parsed.tagName, parsed.fileName);
  const publishedAssetUrl = String(item.browser_download_url || '');
  if (publishedAssetUrl !== downloadUrl) return null;
  return {
    success: true,
    available: true,
    packageName: SMV_ANDROID_PACKAGE,
    versionName: parsed.versionName,
    versionCode: parsed.versionCode,
    downloadUrl,
    size,
    uploadedAt: Date.parse(item.created_at || '') || Date.parse(release.published_at || '') || 0,
    sha256: String(metadata.sha256).toLowerCase(),
    certificateSha256: SMV_RELEASE_CERT_SHA256,
    uploadedBy: String(metadata.uploadedBy || '')
  };
}

function createAndroidApkGitHubStore({
  env = process.env,
  isStaging = false,
  fetchImpl = globalThis.fetch
} = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('A Fetch API implementation is required.');

  let cachedReleases = null;
  let cacheExpiresAt = 0;

  function configurationStatus() {
    const token = String(env.SMV_GITHUB_RELEASE_TOKEN || '').trim();
    const ready = !!token && !isStaging;
    let message = '';
    if (isStaging) {
      message = 'APK publishing is read-only on the staging backend. Production APKs are published from the production Admin Dashboard only.';
    } else if (!token) {
      message = 'GitHub Releases upload is not configured. Add SMV_GITHUB_RELEASE_TOKEN to the production backend environment.';
    }
    return {
      provider: 'github-releases',
      repository: SMV_GITHUB_REPOSITORY,
      tokenConfigured: !!token,
      ready,
      message
    };
  }

  function buildHeaders({ json = false, binary = false } = {}) {
    const headers = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'SMV-ASTRO-Android-Release-Manager'
    };
    const token = String(env.SMV_GITHUB_RELEASE_TOKEN || '').trim();
    if (token) headers.Authorization = 'Bearer ' + token;
    if (json) headers['Content-Type'] = 'application/json';
    if (binary) headers['Content-Type'] = 'application/vnd.android.package-archive';
    return headers;
  }

  async function request(url, { method = 'GET', body = null, json = false, binary = false } = {}) {
    const headers = buildHeaders({ json, binary });
    const options = { method, headers };
    if (body !== null) options.body = json ? JSON.stringify(body) : body;
    const response = await fetchImpl(url, options);
    const raw = await response.text();
    let data = null;
    if (raw) {
      try { data = JSON.parse(raw); }
      catch (_) { data = { message: raw.slice(0, 500) }; }
    }
    if (!response.ok) {
      const error = new Error(
        'GitHub Releases API returned HTTP ' + response.status +
        (data?.message ? ': ' + String(data.message).slice(0, 300) : '.')
      );
      error.code = response.status === 422 ? 'GITHUB_RELEASE_CONFLICT' : 'GITHUB_RELEASE_API_ERROR';
      error.httpStatus = response.status === 422 ? 409 :
        (response.status === 401 || response.status === 403 ? 503 :
          (response.status >= 400 && response.status < 500 ? 400 : 502));
      error.githubStatus = response.status;
      throw error;
    }
    return { data, response };
  }

  async function listReleases({ forceRefresh = false } = {}) {
    if (!forceRefresh && cachedReleases && Date.now() < cacheExpiresAt) return cachedReleases;
    const all = [];
    for (let page = 1; page <= 10; page++) {
      const url = SMV_GITHUB_API + '/repos/' + SMV_GITHUB_REPOSITORY +
        '/releases?per_page=100&page=' + page;
      const { data } = await request(url);
      if (!Array.isArray(data)) throw new Error('GitHub returned an invalid release list.');
      all.push(...data);
      if (data.length < 100) break;
      if (page === 10) throw new Error('GitHub APK release history exceeded the safe pagination limit.');
    }
    cachedReleases = all;
    cacheExpiresAt = Date.now() + SMV_ANDROID_RELEASE_CACHE_MS;
    return all;
  }

  async function getLatestRelease(options = {}) {
    const releases = await listReleases(options);
    const candidates = releases
      .map(release => {
        const parsed = parseAndroidReleaseTag(release?.tag_name);
        if (!parsed) return null;
        const mapped = toPublicAndroidRelease(release);
        return mapped ? { ...mapped, _tagName: parsed.tagName } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.versionCode - a.versionCode || b.uploadedAt - a.uploadedAt);
    if (!candidates.length) return null;
    const { _tagName, ...latest } = candidates[0];
    return latest;
  }

  async function publishRelease(buffer, apk, uploadedBy = '') {
    const config = configurationStatus();
    if (!config.ready) {
      const error = new Error(config.message || 'GitHub Releases publishing is not configured.');
      error.code = isStaging ? 'GITHUB_RELEASE_STAGING_DISABLED' : 'GITHUB_RELEASE_TOKEN_MISSING';
      error.httpStatus = 503;
      throw error;
    }
    if (!Buffer.isBuffer(buffer) || buffer.length < 1024 || buffer.length > MAX_APK_BYTES) {
      const error = new Error('The APK binary must be between 1 KB and 100 MB.');
      error.code = 'ANDROID_APK_SIZE_INVALID';
      error.httpStatus = 400;
      throw error;
    }
    const parsedVersion = parseAndroidReleaseTag(
      'smv-astro-' + String(apk?.versionName || '')
    );
    if (!parsedVersion ||
        apk?.packageName !== SMV_ANDROID_PACKAGE ||
        Number(apk.versionCode) !== parsedVersion.versionCode ||
        normalizeFingerprint(apk.certificateSha256) !== normalizeFingerprint(SMV_RELEASE_CERT_SHA256) ||
        !/^[0-9a-f]{64}$/i.test(String(apk.sha256 || ''))) {
      const error = new Error('The inspected APK metadata does not match the permanent SMV ASTRO release identity.');
      error.code = 'ANDROID_APK_METADATA_INVALID';
      error.httpStatus = 400;
      throw error;
    }

    const latest = await getLatestRelease({ forceRefresh: true });
    const currentCode = Math.max(1000, Number(latest?.versionCode || 0));
    if (parsedVersion.versionCode <= currentCode) {
      const conflict = new Error('The uploaded APK must have a higher versionCode than the current published version.');
      conflict.code = 'ANDROID_APK_VERSION_CONFLICT';
      conflict.httpStatus = 409;
      conflict.currentVersionCode = currentCode;
      conflict.uploadedVersionCode = parsedVersion.versionCode;
      throw conflict;
    }

    const fileName = parsedVersion.fileName;
    const releaseMetadata = {
      packageName: SMV_ANDROID_PACKAGE,
      versionName: parsedVersion.versionName,
      versionCode: parsedVersion.versionCode,
      sha256: String(apk.sha256).toLowerCase(),
      certificateSha256: SMV_RELEASE_CERT_SHA256,
      uploadedBy: String(uploadedBy || '').slice(0, 128),
      uploadedAt: new Date().toISOString()
    };
    let createdRelease = null;
    try {
      const { data: created } = await request(
        SMV_GITHUB_API + '/repos/' + SMV_GITHUB_REPOSITORY + '/releases',
        {
          method: 'POST',
          json: true,
          body: {
            tag_name: parsedVersion.tagName,
            target_commitish: 'main',
            name: 'SMV ASTRO Android ' + parsedVersion.versionName,
            body: makeReleaseBody(releaseMetadata),
            draft: true,
            prerelease: false,
            make_latest: 'false'
          }
        }
      );
      if (!created || !Number.isSafeInteger(Number(created.id)) || created.tag_name !== parsedVersion.tagName) {
        throw new Error('GitHub did not confirm creation of the expected SMV ASTRO draft release.');
      }
      createdRelease = created;

      const uploadUrl = SMV_GITHUB_UPLOADS + '/repos/' + SMV_GITHUB_REPOSITORY +
        '/releases/' + Number(created.id) + '/assets?name=' + encodeURIComponent(fileName);
      const { data: uploadedAsset } = await request(uploadUrl, {
        method: 'POST',
        body: buffer,
        binary: true
      });
      if (!uploadedAsset ||
          uploadedAsset.name !== fileName ||
          uploadedAsset.state !== 'uploaded' ||
          Number(uploadedAsset.size) !== buffer.length ||
          uploadedAsset.browser_download_url !== makeDownloadUrl(parsedVersion.tagName, fileName)) {
        throw new Error('GitHub uploaded the APK but did not confirm its expected name, size and public download URL.');
      }

      const { data: published } = await request(
        SMV_GITHUB_API + '/repos/' + SMV_GITHUB_REPOSITORY + '/releases/' + Number(created.id),
        {
          method: 'PATCH',
          json: true,
          body: { draft: false, make_latest: 'false' }
        }
      );
      const result = toPublicAndroidRelease(published, uploadedAsset);
      if (!result || result.versionCode !== parsedVersion.versionCode) {
        throw new Error('GitHub did not confirm the published SMV ASTRO APK release metadata.');
      }
      cachedReleases = null;
      cacheExpiresAt = 0;
      return result;
    } catch (error) {
      if (createdRelease?.id) {
        try {
          await request(
            SMV_GITHUB_API + '/repos/' + SMV_GITHUB_REPOSITORY + '/releases/' + Number(createdRelease.id),
            { method: 'DELETE' }
          );
        } catch (_) {}
        try {
          await request(
            SMV_GITHUB_API + '/repos/' + SMV_GITHUB_REPOSITORY + '/git/refs/tags/' + encodeURIComponent(parsedVersion.tagName),
            { method: 'DELETE' }
          );
        } catch (_) {}
      }
      throw error;
    }
  }

  return {
    configurationStatus,
    getLatestRelease,
    publishRelease,
    parseAndroidReleaseTag,
    makeDownloadUrl
  };
}

function githubReleasePublicError(error) {
  return {
    status: Number(error?.httpStatus || 503),
    body: {
      success: false,
      error: String(error?.message || 'GitHub Releases could not complete the Android APK operation.'),
      code: String(error?.code || 'GITHUB_RELEASE_OPERATION_FAILED'),
      ...(Number.isSafeInteger(error?.currentVersionCode) ? { currentVersionCode: error.currentVersionCode } : {}),
      ...(Number.isSafeInteger(error?.uploadedVersionCode) ? { uploadedVersionCode: error.uploadedVersionCode } : {})
    }
  };
}

module.exports = {
  SMV_GITHUB_REPOSITORY,
  SMV_ANDROID_RELEASE_TAG_PREFIX,
  SMV_ANDROID_APK_FILE_PREFIX,
  SMV_ANDROID_RELEASE_CACHE_MS,
  parseAndroidReleaseTag,
  normalizeFingerprint,
  parseReleaseMetadata,
  makeReleaseBody,
  makeDownloadUrl,
  toPublicAndroidRelease,
  createAndroidApkGitHubStore,
  githubReleasePublicError
};
