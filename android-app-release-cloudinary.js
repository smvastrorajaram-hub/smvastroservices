'use strict';

const { Readable } = require('node:stream');

const SMV_ANDROID_PACKAGE = 'in.smvastroservices.smvastro';
const SMV_RELEASE_CERT_SHA256 = '7A3BE159218A38083986DEC117C0BD281B3EF42BDA65F2BB7B8C9946B5293401';
const RELEASE_TAG = 'smv-astro-android-release';
const DEFAULT_RELEASE_PREFIX = 'smv-astro/android/releases';
const APK_FORMAT_BLOCKED_MESSAGE = 'Cloudinary is blocking .apk files for this product environment. Cloudinary Support must explicitly allow APK raw-file uploads; there is no Console switch for this file type.';
const NOT_ENABLED_MESSAGE = 'Cloudinary APK publishing is disabled until Cloudinary Support has explicitly allowed .apk uploads for this product environment.';

function getCloudinaryConfigurationStatus(env = process.env) {
  const cloudName = String(env.CLOUDINARY_CLOUD_NAME || '').trim();
  const apiKey = String(env.CLOUDINARY_API_KEY || '').trim();
  const apiSecret = String(env.CLOUDINARY_API_SECRET || '').trim();
  const enabled = String(env.CLOUDINARY_APK_UPLOAD_ENABLED || '').trim().toLowerCase() === 'true';
  const credentialsConfigured = !!(cloudName && apiKey && apiSecret);
  const ready = enabled && credentialsConfigured;
  let message = '';
  if (!enabled) message = NOT_ENABLED_MESSAGE;
  else if (!credentialsConfigured) message = 'Cloudinary server credentials are incomplete. Configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in the backend environment.';
  return { cloudName, enabled, credentialsConfigured, ready, message };
}

function parseReleasePublicId(publicId, prefix = DEFAULT_RELEASE_PREFIX) {
  const escapedPrefix = String(prefix).replace(/[.*+?^$|{}()[\]\\]/g, '\\$&');
  const match = new RegExp('^' + escapedPrefix + '/v([1-9][0-9]*)\\.([0-9]{1,3})-([1-9][0-9]*)\\.apk$').exec(String(publicId || ''));
  if (!match) return null;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const versionCode = Number(match[3]);
  if (!Number.isSafeInteger(versionCode) || versionCode !== major * 1000 + minor) return null;
  return { versionName: 'v' + major + '.' + minor, versionCode };
}

function toPublicRelease(asset, cloudName, releasePrefix) {
  const parsed = parseReleasePublicId(asset?.public_id, releasePrefix);
  if (!parsed) return null;
  const version = Number(asset.version || 0);
  const downloadUrl = String(asset.secure_url || (version > 0
    ? 'https://res.cloudinary.com/' + encodeURIComponent(cloudName) + '/raw/upload/v' + version + '/' + asset.public_id
    : '')).trim();
  if (!downloadUrl) return null;
  const custom = asset.context?.custom || asset.context || {};
  return {
    success: true,
    available: true,
    packageName: String(custom.packageName || SMV_ANDROID_PACKAGE),
    versionName: parsed.versionName,
    versionCode: parsed.versionCode,
    downloadUrl,
    size: Number(asset.bytes || 0),
    uploadedAt: Date.parse(asset.created_at || '') || 0,
    sha256: String(custom.sha256 || ''),
    certificateSha256: String(custom.certificateSha256 || SMV_RELEASE_CERT_SHA256),
    uploadedBy: String(custom.uploadedBy || ''),
    cloudName
  };
}

function createAndroidApkCloudinaryStore({ cloudinary, env = process.env, isStaging = false } = {}) {
  if (!cloudinary || typeof cloudinary.config !== 'function' || !cloudinary.api || typeof cloudinary.api.resources !== 'function' || !cloudinary.uploader || typeof cloudinary.uploader.upload_stream !== 'function') {
    throw new TypeError('A Cloudinary SDK v2 client is required.');
  }
  const prefix = DEFAULT_RELEASE_PREFIX + (isStaging ? '/staging' : '/production');

  function configurationStatus() {
    return getCloudinaryConfigurationStatus(env);
  }

  function requireReady() {
    const status = configurationStatus();
    if (!status.ready) {
      const error = new Error(status.message || NOT_ENABLED_MESSAGE);
      error.code = status.enabled ? 'CLOUDINARY_NOT_CONFIGURED' : 'CLOUDINARY_APK_NOT_ENABLED';
      error.httpStatus = 503;
      throw error;
    }
    cloudinary.config({
      cloud_name: status.cloudName,
      api_key: String(env.CLOUDINARY_API_KEY).trim(),
      api_secret: String(env.CLOUDINARY_API_SECRET).trim(),
      secure: true
    });
    return status;
  }

  async function listAssets() {
    const status = requireReady();
    const resources = [];
    let nextCursor = '';
    let pages = 0;
    do {
      const options = {
        resource_type: 'raw',
        type: 'upload',
        prefix: prefix + '/',
        max_results: 500,
        fields: 'secure_url,bytes,version,created_at,context'
      };
      if (nextCursor) options.next_cursor = nextCursor;
      const page = await cloudinary.api.resources(options);
      resources.push(...(Array.isArray(page?.resources) ? page.resources : []));
      nextCursor = String(page?.next_cursor || '');
      pages += 1;
      if (pages > 100) throw new Error('Cloudinary APK release listing exceeded the safe pagination limit.');
    } while (nextCursor);
    return resources.map(asset => toPublicRelease(asset, status.cloudName, prefix)).filter(Boolean);
  }

  async function getLatestRelease() {
    if (!configurationStatus().ready) return null;
    const releases = await listAssets();
    releases.sort((a, b) => b.versionCode - a.versionCode || b.uploadedAt - a.uploadedAt);
    return releases[0] || null;
  }

  function uploadBuffer(buffer, options) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
        if (error) reject(error);
        else resolve(result || {});
      });
      Readable.from([buffer]).pipe(uploadStream);
    });
  }

  async function publishRelease(buffer, apk, uploadedBy = '') {
    const status = requireReady();
    const latestBefore = await getLatestRelease();
    const currentCode = Math.max(1000, Number(latestBefore?.versionCode || 0));
    if (apk.versionCode <= currentCode) {
      const conflict = new Error('The uploaded APK must have a higher versionCode than the current published version.');
      conflict.code = 'ANDROID_APK_VERSION_CONFLICT';
      conflict.httpStatus = 409;
      conflict.currentVersionCode = currentCode;
      conflict.uploadedVersionCode = apk.versionCode;
      throw conflict;
    }

    const publicId = prefix + '/' + apk.versionName + '-' + apk.versionCode + '.apk';
    let uploaded;
    try {
      uploaded = await uploadBuffer(buffer, {
        resource_type: 'raw',
        type: 'upload',
        public_id: publicId,
        overwrite: false,
        unique_filename: false,
        use_filename: false,
        tags: [RELEASE_TAG],
        context: {
          packageName: SMV_ANDROID_PACKAGE,
          versionName: apk.versionName,
          versionCode: String(apk.versionCode),
          sha256: apk.sha256,
          certificateSha256: apk.certificateSha256,
          uploadedBy: String(uploadedBy || '').slice(0, 128)
        }
      });
    } catch (error) {
      const detail = String(error?.message || error || '');
      if (/format.*(?:apk|not allowed)|(?:apk|file extension).*not allowed|unsupported.*(?:apk|format)/i.test(detail)) {
        const blocked = new Error(APK_FORMAT_BLOCKED_MESSAGE);
        blocked.code = 'CLOUDINARY_APK_FORMAT_BLOCKED';
        blocked.httpStatus = 503;
        throw blocked;
      }
      if (/already exists|public.?id.*exist|already taken/i.test(detail)) {
        const conflict = new Error('This Android version is already stored in Cloudinary. Publish a higher versionCode.');
        conflict.code = 'ANDROID_APK_VERSION_CONFLICT';
        conflict.httpStatus = 409;
        throw conflict;
      }
      throw error;
    }

    const asset = {
      public_id: String(uploaded.public_id || publicId),
      secure_url: String(uploaded.secure_url || ''),
      version: uploaded.version,
      bytes: uploaded.bytes || buffer.length,
      created_at: uploaded.created_at || new Date().toISOString(),
      context: uploaded.context || { custom: {
        packageName: SMV_ANDROID_PACKAGE,
        versionName: apk.versionName,
        versionCode: String(apk.versionCode),
        sha256: apk.sha256,
        certificateSha256: apk.certificateSha256,
        uploadedBy
      } }
    };
    const release = toPublicRelease(asset, status.cloudName, prefix);
    if (!release || release.packageName !== SMV_ANDROID_PACKAGE || release.versionCode !== apk.versionCode) {
      const error = new Error('Cloudinary stored the APK but did not return verifiable release metadata.');
      error.code = 'CLOUDINARY_RELEASE_METADATA_INVALID';
      error.httpStatus = 503;
      throw error;
    }
    return release;
  }

  return { configurationStatus, getLatestRelease, publishRelease, releasePrefix: prefix };
}

function cloudinaryPublicError(error) {
  return {
    status: Number(error?.httpStatus || 503),
    body: {
      success: false,
      error: String(error?.message || 'Cloudinary could not complete the Android APK operation.'),
      code: String(error?.code || 'CLOUDINARY_APK_OPERATION_FAILED'),
      ...(Number.isSafeInteger(error?.currentVersionCode) ? { currentVersionCode: error.currentVersionCode } : {}),
      ...(Number.isSafeInteger(error?.uploadedVersionCode) ? { uploadedVersionCode: error.uploadedVersionCode } : {})
    }
  };
}

module.exports = {
  SMV_ANDROID_PACKAGE,
  SMV_RELEASE_CERT_SHA256,
  RELEASE_TAG,
  DEFAULT_RELEASE_PREFIX,
  APK_FORMAT_BLOCKED_MESSAGE,
  NOT_ENABLED_MESSAGE,
  getCloudinaryConfigurationStatus,
  parseReleasePublicId,
  toPublicRelease,
  createAndroidApkCloudinaryStore,
  cloudinaryPublicError
};
