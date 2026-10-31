'use strict';

import { Buffer } from 'node:buffer';
import { createFirebaseIdTokenVerifier } from '../../shared/backend-platform/firebase-id-token.mjs';
import androidReleaseModule from '../../android-app-release.js';

const { inspectSmvAndroidApk, MAX_APK_BYTES, SMV_ANDROID_PACKAGE } = androidReleaseModule;
const DEFAULT_LEGACY_URL = 'https://smvastroservices.onrender.com/public/android-app';
const DEFAULT_WORKER_ADMIN_UID = 'TwjeEIFS3Zcf1SxboLZoujm91Ky2';
const FIREBASE_BUCKETS = new Set([
  'smv-astro.firebasestorage.app',
]);
const APK_CONTENT_TYPE = 'application/vnd.android.package-archive';
const MAX_UPLOADS_PER_HOUR = 5;
const UPLOAD_WINDOW_MS = 60 * 60 * 1000;
const verifyFirebaseIdToken = createFirebaseIdTokenVerifier();

function parseCsv(value) {
  return String(value || '').split(',').map(item => item.trim()).filter(Boolean);
}

function allowedOrigins(env) {
  return new Set(parseCsv(env.ALLOWED_ORIGINS || [
    'https://smvastroservices.in',
    'https://www.smvastroservices.in',
    'https://smvastro.pages.dev',
    'https://smvastroservices.pages.dev',
    'https://smvastro.workers.dev'
  ].join(',')));
}

function normalizedPath(url) {
  const prefix = '/api/android-app';
  if (url.pathname === prefix) return '/';
  if (url.pathname.startsWith(prefix + '/')) return url.pathname.slice(prefix.length);
  return url.pathname;
}

function routePrefix(url) {
  return url.pathname === '/api/android-app' ||
    url.pathname.startsWith('/api/android-app/') ? '/api/android-app' : '';
}

function respond(request, env, body, status = 200, suppliedHeaders = {}) {
  const headers = new Headers(suppliedHeaders);
  const origin = String(request.headers.get('Origin') || '');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'no-referrer');
  headers.append('Vary', 'Origin');
  if (origin && allowedOrigins(env).has(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept');
    headers.set('Access-Control-Max-Age', '86400');
  }
  return new Response(body, { status, headers });
}

function json(request, env, data, status = 200, headers = {}) {
  const out = new Headers(headers);
  out.set('Content-Type', 'application/json; charset=utf-8');
  if (!out.has('Cache-Control')) out.set('Cache-Control', 'no-store');
  return respond(request, env, JSON.stringify(data), status, out);
}

function configuredProjects(env) {
  const projects = parseCsv(env.FIREBASE_ALLOWED_PROJECT_IDS || 'smv-astro');
  return projects.length ? projects : ['smv-astro'];
}

function isAdminIdentity(identity, env) {
  if (!identity || !identity.uid || !identity.projectId) return false;
  if (identity.admin === true || String(identity.role || '').trim().toLowerCase() === 'admin') return true;

  const adminUids = new Set(parseCsv(env.SMV_ANDROID_RELEASE_ADMIN_UIDS));
  if (identity.projectId === 'smv-astro' && !adminUids.size) adminUids.add(DEFAULT_WORKER_ADMIN_UID);
  if (adminUids.has(String(identity.uid))) return true;

  const emails = new Set(parseCsv(env.SMV_ANDROID_RELEASE_ADMIN_EMAILS).map(value => value.toLowerCase()));
  return identity.email_verified === true &&
    emails.has(String(identity.email || '').trim().toLowerCase());
}

async function requireAdmin(request, env, verifyToken) {
  const authorization = String(request.headers.get('Authorization') || '');
  if (!authorization.startsWith('Bearer ')) {
    return { response: json(request, env, { success: false, error: 'Login session is required.' }, 401) };
  }
  let identity;
  try {
    identity = await verifyToken(authorization.slice(7), configuredProjects(env));
  } catch (_) {
    return { response: json(request, env, { success: false, error: 'Login session is invalid or expired.' }, 401) };
  }
  if (!isAdminIdentity(identity, env)) {
    return { response: json(request, env, { success: false, error: 'Admin access denied.' }, 403) };
  }
  return { identity };
}

async function hasReleaseSchema(env) {
  if (!env?.DB?.prepare || !env?.APK_RELEASES?.put || !env?.APK_RELEASES?.get) return false;
  try {
    const releases = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='android_app_releases'").first();
    const attempts = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='android_apk_upload_attempts'").first();
    return Boolean(releases && attempts);
  } catch (_) {
    return false;
  }
}

async function latestRow(db) {
  return db.prepare(
    'SELECT package_name, version_name, version_code, storage_provider, object_key, external_download_url, sha256, certificate_sha256, size_bytes, uploaded_by, uploaded_at FROM android_app_releases ORDER BY version_code DESC LIMIT 1'
  ).first();
}

async function rowByVersion(db, versionCode) {
  return db.prepare(
    'SELECT package_name, version_name, version_code, storage_provider, object_key, external_download_url, sha256, certificate_sha256, size_bytes, uploaded_by, uploaded_at FROM android_app_releases WHERE version_code = ? LIMIT 1'
  ).bind(versionCode).first();
}

function safeLegacyDownloadUrl(value) {
  let url;
  try { url = new URL(String(value || '')); } catch (_) { return null; }
  if (url.protocol !== 'https:' || url.hostname !== 'firebasestorage.googleapis.com') return null;
  const path = decodeURIComponent(url.pathname);
  const bucketMatch = /^\/v0\/b\/([^/]+)\/o\/smv-astro\/android\/releases\/[1-9][0-9]*\/[^/]+\.apk$/.exec(path);
  if (!bucketMatch || !FIREBASE_BUCKETS.has(bucketMatch[1])) return null;
  if (url.searchParams.get('alt') !== 'media' || !url.searchParams.get('token')) return null;
  return url.href;
}

async function fetchLegacyRelease(env, fetchImpl) {
  const endpoint = String(env.LEGACY_ANDROID_RELEASE_URL || DEFAULT_LEGACY_URL).trim();
  let parsed;
  try { parsed = new URL(endpoint); } catch (_) { throw new Error('Legacy Android release endpoint is invalid.'); }
  if (parsed.origin !== new URL(DEFAULT_LEGACY_URL).origin || parsed.pathname !== '/public/android-app' || parsed.search) {
    throw new Error('Legacy Android release endpoint is not allowlisted.');
  }
  let response;
  try {
    response = await fetchImpl(endpoint, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(8000)
    });
  } catch (_) {
    throw new Error('Legacy Android release lookup is unavailable; version safety cannot be verified.');
  }
  if (!response.ok) throw new Error('Legacy Android release lookup returned HTTP ' + response.status + '.');
  let data;
  try { data = await response.json(); } catch (_) { throw new Error('Legacy Android release response is invalid.'); }
  if (data?.success !== true || data.available !== true) return null;
  const versionCode = Number(data.versionCode);
  const size = Number(data.size || 0);
  const uploadedAt = Number(data.uploadedAt || 0);
  const downloadUrl = safeLegacyDownloadUrl(data.downloadUrl);
  if (data.packageName !== SMV_ANDROID_PACKAGE ||
      !Number.isSafeInteger(versionCode) || versionCode < 1001 ||
      !/^v[1-9][0-9]*\.[0-9]{1,3}$/.test(String(data.versionName || '')) ||
      !downloadUrl || !Number.isSafeInteger(size) || size < 0 ||
      !Number.isSafeInteger(uploadedAt) || uploadedAt < 0) {
    throw new Error('Legacy Android release metadata failed validation.');
  }
  return {
    success: true,
    available: true,
    packageName: SMV_ANDROID_PACKAGE,
    versionName: String(data.versionName),
    versionCode,
    downloadUrl,
    size,
    uploadedAt,
    sha256: '',
    certificateSha256: '',
    uploadedBy: 'legacy-migration'
  };
}

function publicDownloadUrl(request, versionCode) {
  const url = new URL(request.url);
  return url.origin + routePrefix(url) + '/download/' + String(versionCode);
}

function publicReleaseFromRow(row, request, includeAdminFields = false) {
  if (!row) return { success: true, available: false };
  const data = {
    success: true,
    available: true,
    packageName: String(row.package_name || SMV_ANDROID_PACKAGE),
    versionName: String(row.version_name || ''),
    versionCode: Number(row.version_code),
    downloadUrl: publicDownloadUrl(request, row.version_code),
    size: Number(row.size_bytes || 0),
    uploadedAt: Number(row.uploaded_at || 0)
  };
  if (includeAdminFields) {
    data.sha256 = String(row.sha256 || '');
    data.certificateSha256 = String(row.certificate_sha256 || '');
    data.uploadedBy = String(row.uploaded_by || '');
    data.storageProvider = String(row.storage_provider || 'r2');
  }
  return data;
}

async function currentRelease(env, request, fetchImpl) {
  const row = await latestRow(env.DB);
  if (row) return publicReleaseFromRow(row, request, false);
  const legacy = await fetchLegacyRelease(env, fetchImpl);
  return legacy
    ? { ...legacy, downloadUrl: publicDownloadUrl(request, legacy.versionCode) }
    : { success: true, available: false };
}

async function listReleaseHistory(env, request, fetchImpl) {
  const result = await env.DB.prepare(
    'SELECT package_name, version_name, version_code, storage_provider, object_key, external_download_url, sha256, certificate_sha256, size_bytes, uploaded_by, uploaded_at FROM android_app_releases ORDER BY version_code DESC LIMIT 100'
  ).all();
  const rows = Array.isArray(result?.results) ? result.results : [];
  if (rows.length) return rows.map(row => publicReleaseFromRow(row, request, true));
  const legacy = await fetchLegacyRelease(env, fetchImpl);
  return legacy ? [{
    ...legacy,
    storageProvider: 'firebase'
  }] : [];
}

async function recordUploadAttempt(env, uid, now) {
  const result = await env.DB.prepare(
    'SELECT COUNT(*) AS count FROM android_apk_upload_attempts WHERE uid = ? AND attempted_at >= ?'
  ).bind(uid, now - UPLOAD_WINDOW_MS).first();
  if (Number(result?.count || 0) >= MAX_UPLOADS_PER_HOUR) return false;
  try {
    await env.DB.prepare(
      'INSERT INTO android_apk_upload_attempts (uid, attempted_at) VALUES (?, ?)'
    ).bind(uid, now).run();
  } catch (error) {
    if (/APK_UPLOAD_RATE_LIMIT/i.test(String(error?.message || error))) return false;
    throw error;
  }
  await env.DB.prepare(
    'DELETE FROM android_apk_upload_attempts WHERE attempted_at < ?'
  ).bind(now - 2 * UPLOAD_WINDOW_MS).run();
  return true;
}

function safeMaximumBytes(env) {
  const configured = Number(env.MAX_APK_BYTES || MAX_APK_BYTES);
  return Number.isSafeInteger(configured) && configured >= 1024 && configured <= MAX_APK_BYTES
    ? configured : MAX_APK_BYTES;
}

async function handleDownload(request, env, versionCode, fetchImpl) {
  if (!/^[1-9][0-9]{2,9}$/.test(versionCode)) {
    return json(request, env, { success: false, error: 'Invalid Android versionCode.' }, 400);
  }
  const row = await rowByVersion(env.DB, Number(versionCode));
  if (!row) {
    const legacy = await fetchLegacyRelease(env, fetchImpl);
    if (legacy && legacy.versionCode === Number(versionCode)) {
      return respond(request, env, null, 302, {
        Location: legacy.downloadUrl,
        'Cache-Control': 'no-store'
      });
    }
    return json(request, env, { success: false, error: 'This Android APK version was not found.' }, 404);
  }
  if (row.storage_provider === 'firebase') {
    const target = safeLegacyDownloadUrl(row.external_download_url);
    if (!target) return json(request, env, { success: false, error: 'The archived APK download target failed validation.' }, 503);
    return respond(request, env, null, 302, { Location: target, 'Cache-Control': 'no-store' });
  }
  const object = await env.APK_RELEASES.get(String(row.object_key || ''));
  if (!object) return json(request, env, { success: false, error: 'The stored APK object is missing.' }, 404);
  const safeVersion = String(row.version_name || '').replace(/[^A-Za-z0-9.-]/g, '');
  const headers = {
    'Content-Type': APK_CONTENT_TYPE,
    'Content-Disposition': 'attachment; filename="SMV-ASTRO-' + safeVersion + '.apk"',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Content-Length': String(Number(row.size_bytes || object.size || 0))
  };
  if (object.httpEtag) headers.ETag = object.httpEtag;
  return respond(request, env, object.body, 200, headers);
}

export function createAndroidApkReleaseWorker({
  verifyToken = verifyFirebaseIdToken,
  inspectApk = inspectSmvAndroidApk,
  fetchImpl = globalThis.fetch
} = {}) {
  return {
    async fetch(request, env) {
      const url = new URL(request.url);
      const path = normalizedPath(url);
      if (request.method === 'OPTIONS') {
        return respond(request, env, null, 204, { 'Cache-Control': 'no-store' });
      }
      try {
        if (path === '/health' && request.method === 'GET') {
          const ready = await hasReleaseSchema(env);
          const hasReleaseRecords = ready ? Boolean(await latestRow(env.DB)) : false;
          return json(request, env, {
            success: true,
            ready,
            uploadsEnabled: ready && String(env.ALLOW_APK_UPLOADS || '').toLowerCase() === 'true',
            hasReleaseRecords
          }, 200, { 'Cache-Control': 'no-store' });
        }

        if (path === '/public/android-app' && request.method === 'GET') {
          if (!(await hasReleaseSchema(env))) {
            return json(request, env, { success: false, available: false, error: 'Cloudflare APK storage is not configured.' }, 503);
          }
          const release = await currentRelease(env, request, fetchImpl);
          return json(request, env, release, 200, {
            'Cache-Control': 'public, max-age=30, stale-while-revalidate=120'
          });
        }

        const downloadMatch = /^\/download\/([^/]+)$/.exec(path);
        if (downloadMatch && request.method === 'GET') {
          if (!(await hasReleaseSchema(env))) {
            return json(request, env, { success: false, error: 'Cloudflare APK storage is not configured.' }, 503);
          }
          return await handleDownload(request, env, downloadMatch[1], fetchImpl);
        }

        if (path === '/admin/android-app' && request.method === 'GET') {
          const auth = await requireAdmin(request, env, verifyToken);
          if (auth.response) return auth.response;
          if (!(await hasReleaseSchema(env))) {
            return json(request, env, { success: false, error: 'Cloudflare APK storage is not configured.' }, 503);
          }
          const row = await latestRow(env.DB);
          if (row) return json(request, env, publicReleaseFromRow(row, request, true));
          const legacy = await fetchLegacyRelease(env, fetchImpl);
          return json(request, env, legacy ? { ...legacy, storageProvider: 'firebase' } : { success: true, available: false });
        }

        if (path === '/admin/android-app/versions' && request.method === 'GET') {
          const auth = await requireAdmin(request, env, verifyToken);
          if (auth.response) return auth.response;
          if (!(await hasReleaseSchema(env))) {
            return json(request, env, { success: false, error: 'Cloudflare APK storage is not configured.' }, 503);
          }
          return json(request, env, {
            success: true,
            versions: await listReleaseHistory(env, request, fetchImpl)
          });
        }

        if (path === '/admin/android-app/upload' && request.method === 'POST') {
          const auth = await requireAdmin(request, env, verifyToken);
          if (auth.response) return auth.response;
          if (!(await hasReleaseSchema(env))) {
            return json(request, env, { success: false, error: 'Cloudflare APK storage is not configured.' }, 503);
          }
          if (String(env.ALLOW_APK_UPLOADS || '').toLowerCase() !== 'true') {
            return json(request, env, { success: false, error: 'Cloudflare APK upload is disabled until R2 and D1 staging verification is complete.' }, 503);
          }
          const contentType = String(request.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
          if (contentType !== APK_CONTENT_TYPE) {
            return json(request, env, { success: false, error: 'Upload the APK as application/vnd.android.package-archive.' }, 415);
          }
          const contentLength = Number(request.headers.get('Content-Length') || 0);
          const maxBytes = safeMaximumBytes(env);
          if (contentLength > maxBytes) {
            return json(request, env, { success: false, error: 'The APK is larger than the configured upload limit.' }, 413);
          }
          const now = Date.now();
          if (!(await recordUploadAttempt(env, auth.identity.uid, now))) {
            return json(request, env, { success: false, error: 'The Admin APK upload rate limit has been reached. Try again later.' }, 429);
          }
          const arrayBuffer = await request.arrayBuffer();
          if (arrayBuffer.byteLength < 1024 || arrayBuffer.byteLength > maxBytes) {
            return json(request, env, { success: false, error: 'Upload a valid APK between 1 KB and the configured size limit.' }, 413);
          }

          let apk;
          try {
            apk = inspectApk(Buffer.from(arrayBuffer));
          } catch (error) {
            return json(request, env, { success: false, error: error?.message || 'The APK failed SMV ASTRO Release validation.' }, 400);
          }
          if (apk.packageName !== SMV_ANDROID_PACKAGE) {
            return json(request, env, { success: false, error: 'This APK is not the SMV ASTRO Production app.' }, 400);
          }

          let current;
          let legacyBaseline = null;
          try {
            current = await latestRow(env.DB);
            if (!current) legacyBaseline = await fetchLegacyRelease(env, fetchImpl);
          } catch (error) {
            return json(request, env, { success: false, error: error?.message || 'Unable to establish the current APK version.' }, 503);
          }
          const currentCode = Math.max(1000, Number(current?.version_code || legacyBaseline?.versionCode || 0));
          if (Number(apk.versionCode) <= currentCode) {
            return json(request, env, {
              success: false,
              error: 'The uploaded APK must have a higher versionCode than the current published version.',
              currentVersionCode: currentCode,
              uploadedVersionCode: Number(apk.versionCode)
            }, 409);
          }

          const objectKey = 'smv-astro/android/releases/' + String(apk.versionCode) + '/' + globalThis.crypto.randomUUID() + '.apk';
          let stored = false;
          try {
            await env.APK_RELEASES.put(objectKey, Buffer.from(arrayBuffer), {
              httpMetadata: {
                contentType: APK_CONTENT_TYPE,
                cacheControl: 'public, max-age=31536000, immutable'
              },
              customMetadata: {
                packageName: apk.packageName,
                versionName: apk.versionName,
                versionCode: String(apk.versionCode),
                sha256: apk.sha256,
                certificateSha256: apk.certificateSha256
              }
            });
            stored = true;
            const insertStatements = [];
            if (!current && legacyBaseline) {
              insertStatements.push(env.DB.prepare(
                "INSERT OR IGNORE INTO android_app_releases (package_name, version_name, version_code, storage_provider, object_key, external_download_url, sha256, certificate_sha256, size_bytes, uploaded_by, uploaded_at) VALUES (?, ?, ?, 'firebase', NULL, ?, NULL, NULL, ?, 'legacy-migration', ?)"
              ).bind(
                legacyBaseline.packageName,
                legacyBaseline.versionName,
                Number(legacyBaseline.versionCode),
                legacyBaseline.downloadUrl,
                Number(legacyBaseline.size || 0),
                Number(legacyBaseline.uploadedAt || now)
              ));
            }
            insertStatements.push(env.DB.prepare(
              "INSERT INTO android_app_releases (package_name, version_name, version_code, storage_provider, object_key, external_download_url, sha256, certificate_sha256, size_bytes, uploaded_by, uploaded_at) VALUES (?, ?, ?, 'r2', ?, NULL, ?, ?, ?, ?, ?)"
            ).bind(
              apk.packageName,
              apk.versionName,
              Number(apk.versionCode),
              objectKey,
              String(apk.sha256 || ''),
              String(apk.certificateSha256 || ''),
              Number(apk.size || arrayBuffer.byteLength),
              String(auth.identity.uid),
              now
            ));
            if (insertStatements.length > 1) await env.DB.batch(insertStatements);
            else await insertStatements[0].run();
          } catch (error) {
            if (stored) {
              try { await env.APK_RELEASES.delete(objectKey); } catch (_) {}
            }
            const message = String(error?.message || error);
            if (/VERSION_CODE_NOT_INCREASING|UNIQUE constraint failed: android_app_releases\.version_code/i.test(message)) {
              const latest = await latestRow(env.DB);
              return json(request, env, {
                success: false,
                error: 'A newer or equal Android APK version was published while this upload was processing.',
                currentVersionCode: Math.max(1000, Number(latest?.version_code || 0)),
                uploadedVersionCode: Number(apk.versionCode)
              }, 409);
            }
            return json(request, env, { success: false, error: 'The APK could not be stored in Cloudflare R2 and D1.' }, 503);
          }

          const row = await rowByVersion(env.DB, Number(apk.versionCode));
          return json(request, env, publicReleaseFromRow(row, request, true), 200, { 'Cache-Control': 'no-store' });
        }

        return json(request, env, { success: false, error: 'APK release route was not found.' }, 404);
      } catch (error) {
        return json(request, env, { success: false, error: 'Cloudflare APK release request failed safely.' }, 503);
      }
    }
  };
}

const worker = createAndroidApkReleaseWorker();
export default {
  fetch(request, env, context) {
    return worker.fetch(request, env, context);
  }
};
