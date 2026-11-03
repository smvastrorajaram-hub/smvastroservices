'use strict';

import { Buffer } from 'node:buffer';
import { createFirebaseIdTokenVerifier } from '../../shared/backend-platform/firebase-id-token.mjs';
import androidReleaseModule from '../../android-app-release.js';

const { inspectSmvAndroidApk, MAX_APK_BYTES, SMV_ANDROID_PACKAGE } = androidReleaseModule;
const ANDROID_APPS = Object.freeze({
  astro: { appId: 'astro', label: 'SMV ASTRO', packageName: SMV_ANDROID_PACKAGE, firstVersionCode: 1001 },
  horoscope: { appId: 'horoscope', label: 'SMV HOROSCOPE', packageName: 'in.smvastroservices.horoscope', firstVersionCode: 1000 },
  calendar: { appId: 'calendar', label: 'SMV CALENDAR', packageName: 'in.smvastroservices.calendar', firstVersionCode: 1000 }
});
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
    'https://horoscope.smvastroservices.in',
    'https://calendar.smvastroservices.in',
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
    headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
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

function requestIdFor(request) {
  const ray = String(request.headers.get('cf-ray') || '').trim();
  if (ray && /^[A-Za-z0-9-]{8,100}$/.test(ray)) return ray;
  return globalThis.crypto?.randomUUID?.() || 'apk-' + Date.now();
}

function safeDiagnosticMessage(value) {
  return String(value || 'Unknown error')
    .replace(/https?:\/\/[^\s"'<>]+/gi, '[url]')
    .replace(/\bBearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/\b(token|secret|password|authorization)\b\s*[:=]\s*[^\s,;]+/gi, '$1=[redacted]')
    .replace(/\b[A-Za-z0-9_-]{40,}\b/g, '[redacted]')
    .slice(0, 240);
}

function logDiagnosticError(logger, request, path, stage, error, requestId = requestIdFor(request)) {
  const details = [];
  let current = error;
  for (let depth = 0; current && depth < 3; depth += 1) {
    details.push({
      name: safeDiagnosticMessage(current.name || 'Error'),
      message: safeDiagnosticMessage(current.message || current),
      code: safeDiagnosticMessage(current.code || '')
    });
    current = current.cause;
  }
  try {
    logger?.error?.('[smv-apk-release] ' + JSON.stringify({
      event: 'request_failed',
      requestId,
      method: request.method,
      path,
      stage,
      errors: details
    }));
  } catch (_) {
    // Diagnostics must never change the request outcome.
  }
}

function serviceError(code, message, cause) {
  const error = new Error(message);
  error.code = code;
  if (cause) error.cause = cause;
  return error;
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

async function hasR2Connection(env) {
  if (typeof env?.APK_RELEASES?.head !== 'function') return false;
  // A read-only HEAD for a reserved, never-written key verifies the live R2 binding
  // without creating, changing, or deleting any bucket object.
  await env.APK_RELEASES.head('__smv_internal__/apk-release-health-probe');
  return true;
}

async function latestRow(db, appId = 'astro') {
  return db.prepare(
    'SELECT app_id, package_name, version_name, version_code, storage_provider, object_key, external_download_url, sha256, certificate_sha256, size_bytes, uploaded_by, uploaded_at FROM android_app_releases WHERE app_id = ? ORDER BY version_code DESC LIMIT 1'
  ).bind(appId).first();
}

async function rowByVersion(db, versionCode, appId = 'astro') {
  return db.prepare(
    'SELECT app_id, package_name, version_name, version_code, storage_provider, object_key, external_download_url, sha256, certificate_sha256, size_bytes, uploaded_by, uploaded_at FROM android_app_releases WHERE app_id = ? AND version_code = ? LIMIT 1'
  ).bind(appId, versionCode).first();
}

function safeLegacyDownloadUrl(value, expectedVersionCode) {
  let url;
  try { url = new URL(String(value || '')); } catch (_) { return null; }
  if (url.protocol !== 'https:' || url.hostname !== 'firebasestorage.googleapis.com') return null;
  const path = decodeURIComponent(url.pathname);
  const bucketMatch = /^\/v0\/b\/([^/]+)\/o\/smv-astro\/android\/releases\/([1-9][0-9]*)\/[^/]+\.apk$/.exec(path);
  if (!bucketMatch || !FIREBASE_BUCKETS.has(bucketMatch[1]) || Number(bucketMatch[2]) !== Number(expectedVersionCode)) return null;
  if (url.searchParams.get('alt') !== 'media' || !url.searchParams.get('token')) return null;
  return url.href;
}


function publicDownloadUrl(request, appId, versionCode) {
  const url = new URL(request.url);
  const path = appId === 'astro'
    ? '/download/' + String(versionCode)
    : '/download/' + appId + '/' + String(versionCode);
  return url.origin + routePrefix(url) + path;
}

function publicReleaseFromRow(row, request, includeAdminFields = false, appId = 'astro') {
  if (!row) return { success: true, available: false };
  const data = {
    success: true,
    available: true,
    appId,
    appName: String(ANDROID_APPS[appId]?.label || 'SMV Android App'),
    packageName: String(row.package_name || ANDROID_APPS[appId]?.packageName || SMV_ANDROID_PACKAGE),
    versionName: String(row.version_name || ''),
    versionCode: Number(row.version_code),
    downloadUrl: publicDownloadUrl(request, appId, row.version_code),
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

async function currentRelease(env, request, appId = 'astro') {
  const row = await latestRow(env.DB, appId);
  return publicReleaseFromRow(row, request, false, appId);
}

async function listReleaseHistory(env, request, appId = 'astro') {
  const result = await env.DB.prepare(
    'SELECT app_id, package_name, version_name, version_code, storage_provider, object_key, external_download_url, sha256, certificate_sha256, size_bytes, uploaded_by, uploaded_at FROM android_app_releases WHERE app_id = ? ORDER BY version_code DESC LIMIT 100'
  ).bind(appId).all();
  const rows = Array.isArray(result?.results) ? result.results : [];
  return rows.map((row, index) => ({
    ...publicReleaseFromRow(row, request, true, appId),
    isCurrent: index === 0,
    canDelete: index > 0 && row.storage_provider === 'r2'
  }));
}

async function listPublicReleaseHistory(env, request, appId) {
  // The binaries and current release metadata are already publicly downloadable.
  // Expose only the minimum version-list fields; never return uploader IDs,
  // hashes, signer fingerprints or internal R2 object keys.
  const result = await env.DB.prepare(
    'SELECT app_id, package_name, version_name, version_code, storage_provider, size_bytes, uploaded_at FROM android_app_releases WHERE app_id = ? ORDER BY version_code DESC LIMIT 100'
  ).bind(appId).all();
  const rows = Array.isArray(result?.results) ? result.results : [];
  return rows.map((row, index) => ({
    ...publicReleaseFromRow(row, request, false, appId),
    storageProvider: String(row.storage_provider || 'r2'),
    isCurrent: index === 0,
    canDelete: index > 0 && row.storage_provider === 'r2'
  }));
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

function multiAppReleasesEnabled(env) {
  return String(env.MULTI_APP_RELEASES_ENABLED || '').toLowerCase() === 'true';
}

function multiAppGateResponse(request, env, appId) {
  if (appId === 'astro' || multiAppReleasesEnabled(env)) return null;
  return json(request, env, {
    success: false,
    error: 'Horoscope and Calendar APK management is disabled until the app-scoped D1 migration and Worker deployment are verified.'
  }, 503);
}

function safeMaximumBytes(env) {
  const configured = Number(env.MAX_APK_BYTES || MAX_APK_BYTES);
  return Number.isSafeInteger(configured) && configured >= 1024 && configured <= MAX_APK_BYTES
    ? configured : MAX_APK_BYTES;
}

async function handleDownload(request, env, versionCode, appId = 'astro') {
  if (!/^[1-9][0-9]{2,9}$/.test(versionCode)) {
    return json(request, env, { success: false, error: 'Invalid Android versionCode.' }, 400);
  }
  const row = await rowByVersion(env.DB, Number(versionCode), appId);
  if (!row) {
    return json(request, env, { success: false, error: 'This Android APK version was not found.' }, 404);
  }
  // Existing Firebase rows are served only when explicitly present in D1 as
  // archived history. New releases are stored and streamed from Cloudflare R2.
  if (row.storage_provider === 'firebase') {
    if (appId !== 'astro') return json(request, env, { success: false, error: 'Legacy Firebase APK download is only supported for SMV ASTRO.' }, 409);
    const target = safeLegacyDownloadUrl(row.external_download_url, row.version_code);
    if (!target) return json(request, env, { success: false, error: 'The archived APK download target failed validation.' }, 503);
    return respond(request, env, null, 302, { Location: target, 'Cache-Control': 'no-store' });
  }
  const object = await env.APK_RELEASES.get(String(row.object_key || ''));
  if (!object) return json(request, env, { success: false, error: 'The stored APK object is missing.' }, 404);
  const safeVersion = String(row.version_name || '').replace(/[^A-Za-z0-9.-]/g, '');
  const safeAppName = String(ANDROID_APPS[appId]?.label || 'SMV ANDROID').replace(/[^A-Za-z0-9-]/g, '-');
  const headers = {
    'Content-Type': APK_CONTENT_TYPE,
    'Content-Disposition': 'attachment; filename="' + safeAppName + '-' + safeVersion + '.apk"',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Content-Length': String(Number(row.size_bytes || object.size || 0))
  };
  if (object.httpEtag) headers.ETag = object.httpEtag;
  return respond(request, env, object.body, 200, headers);
}

export function createAndroidApkReleaseWorker({
  verifyToken = verifyFirebaseIdToken,
  inspectApk = inspectSmvAndroidApk,
  logger = console
} = {}) {
  return {
    async fetch(request, env) {
      const url = new URL(request.url);
      const path = normalizedPath(url);
      const requestId = requestIdFor(request);
      if (request.method === 'OPTIONS') {
        return respond(request, env, null, 204, { 'Cache-Control': 'no-store' });
      }
      try {
        if (path === '/health' && request.method === 'GET') {
          const d1Ready = await hasReleaseSchema(env);
          let r2Ready = false;
          if (d1Ready) {
            try {
              r2Ready = await hasR2Connection(env);
              if (!r2Ready) throw serviceError('R2_HEALTH_CHECK_UNAVAILABLE', 'R2 head binding is unavailable.');
            } catch (error) {
              logDiagnosticError(logger, request, path, 'r2-health', error, requestId);
            }
          }
          const ready = d1Ready && r2Ready;
          const hasReleaseRecords = d1Ready ? Boolean(await latestRow(env.DB)) : false;
          return json(request, env, {
            success: true,
            ready,
            d1Ready,
            r2Ready,
            uploadsEnabled: ready && String(env.ALLOW_APK_UPLOADS || '').toLowerCase() === 'true',
            deletesEnabled: ready && String(env.ALLOW_APK_DELETES || '').toLowerCase() === 'true',
            multiAppReleasesEnabled: ready && multiAppReleasesEnabled(env),
            hasReleaseRecords
          }, 200, { 'Cache-Control': 'no-store' });
        }

        const publicAppMatch = /^\/public\/android-apps\/(astro|horoscope|calendar)$/.exec(path);
        if ((path === '/public/android-app' || publicAppMatch) && request.method === 'GET') {
          if (!(await hasReleaseSchema(env))) {
            return json(request, env, { success: false, available: false, error: 'Cloudflare APK storage is not configured.' }, 503);
          }
          const appId = publicAppMatch ? publicAppMatch[1] : 'astro';
          const gated = multiAppGateResponse(request, env, appId);
          if (gated) return gated;
          const release = await currentRelease(env, request, appId);
          return json(request, env, release, 200, {
            'Cache-Control': 'public, max-age=30, stale-while-revalidate=120'
          });
        }

        const publicHistoryMatch = /^\\/public\\/android-apps\\/(horoscope|calendar)\\/versions$/.exec(path);
        if (publicHistoryMatch && request.method === 'GET') {
          if (!(await hasReleaseSchema(env))) {
            return json(request, env, { success: false, error: 'Cloudflare APK storage is not configured.' }, 503);
          }
          const appId = publicHistoryMatch[1];
          const gated = multiAppGateResponse(request, env, appId);
          if (gated) return gated;
          return json(request, env, {
            success: true,
            appId,
            versions: await listPublicReleaseHistory(env, request, appId)
          }, 200, {
            'Cache-Control': 'public, max-age=30, stale-while-revalidate=120'
          });
        }

        const multiDownloadMatch = /^\/download\/(astro|horoscope|calendar)\/([1-9][0-9]{2,9})$/.exec(path);
        const astroDownloadMatch = /^\/download\/([1-9][0-9]{2,9})$/.exec(path);
        if ((multiDownloadMatch || astroDownloadMatch) && request.method === 'GET') {
          if (!(await hasReleaseSchema(env))) {
            return json(request, env, { success: false, error: 'Cloudflare APK storage is not configured.' }, 503);
          }
          const appId = multiDownloadMatch ? multiDownloadMatch[1] : 'astro';
          const gated = multiAppGateResponse(request, env, appId);
          if (gated) return gated;
          const versionCode = multiDownloadMatch ? multiDownloadMatch[2] : astroDownloadMatch[1];
          return await handleDownload(request, env, versionCode, appId);
        }

        const adminAppMatch = /^\/admin\/android-apps\/(astro|horoscope|calendar)$/.exec(path);
        const adminAppId = path === '/admin/android-app' ? 'astro' : adminAppMatch?.[1];
        if (adminAppId && request.method === 'GET') {
          const auth = await requireAdmin(request, env, verifyToken);
          if (auth.response) return auth.response;
          const gated = multiAppGateResponse(request, env, adminAppId);
          if (gated) return gated;
          if (!(await hasReleaseSchema(env))) {
            return json(request, env, { success: false, error: 'Cloudflare APK storage is not configured.' }, 503);
          }
          const row = await latestRow(env.DB, adminAppId);
          return json(request, env, row
            ? publicReleaseFromRow(row, request, true, adminAppId)
            : { success: true, available: false, appId: adminAppId, appName: ANDROID_APPS[adminAppId].label });
        }

        const adminHistoryMatch = /^\/admin\/android-apps\/(astro|horoscope|calendar)\/versions$/.exec(path);
        if ((path === '/admin/android-app/versions' || adminHistoryMatch) && request.method === 'GET') {
          const auth = await requireAdmin(request, env, verifyToken);
          if (auth.response) return auth.response;
          if (!(await hasReleaseSchema(env))) {
            return json(request, env, { success: false, error: 'Cloudflare APK storage is not configured.' }, 503);
          }
          const appId = adminHistoryMatch ? adminHistoryMatch[1] : 'astro';
          const gated = multiAppGateResponse(request, env, appId);
          if (gated) return gated;
          return json(request, env, {
            success: true,
            appId,
            versions: await listReleaseHistory(env, request, appId)
          });
        }

        const deleteMultiMatch = /^\/admin\/android-apps\/(astro|horoscope|calendar)\/versions\/([1-9][0-9]{2,9})$/.exec(path);
        const deleteAstroMatch = /^\/admin\/android-app\/versions\/([1-9][0-9]{2,9})$/.exec(path);
        if ((deleteMultiMatch || deleteAstroMatch) && request.method === 'DELETE') {
          const auth = await requireAdmin(request, env, verifyToken);
          if (auth.response) return auth.response;
          if (!(await hasReleaseSchema(env))) return json(request, env, { success: false, error: 'Cloudflare APK storage is not configured.' }, 503);
          if (String(env.ALLOW_APK_DELETES || '').toLowerCase() !== 'true') return json(request, env, { success: false, error: 'Historical APK deletion is disabled until the Admin release manager is verified.' }, 503);
          const appId = deleteMultiMatch ? deleteMultiMatch[1] : 'astro';
          const gated = multiAppGateResponse(request, env, appId);
          if (gated) return gated;
          const versionCode = Number(deleteMultiMatch ? deleteMultiMatch[2] : deleteAstroMatch[1]);
          const row = await rowByVersion(env.DB, versionCode, appId);
          if (!row) return json(request, env, { success: false, error: 'This archived Android APK version was not found.' }, 404);
          const latest = await latestRow(env.DB, appId);
          if (Number(latest?.version_code || 0) <= versionCode) return json(request, env, { success: false, error: 'The current published APK is protected and cannot be deleted.' }, 409);
          if (row.storage_provider !== 'r2') return json(request, env, { success: false, error: 'This legacy Firebase APK is protected from deletion in the R2 manager.' }, 409);
          const objectKey = String(row.object_key || '');
          const expectedPrefix = 'smv-' + appId + '/android/releases/' + versionCode + '/';
          if (!objectKey.startsWith(expectedPrefix) || !objectKey.endsWith('.apk')) return json(request, env, { success: false, error: 'The archived APK storage path failed validation; nothing was deleted.' }, 409);
          try {
            await env.APK_RELEASES.delete(objectKey);
            const deleted = await env.DB.prepare("DELETE FROM android_app_releases WHERE app_id = ? AND version_code = ? AND storage_provider = 'r2' AND version_code < (SELECT MAX(version_code) FROM android_app_releases WHERE app_id = ?)")
              .bind(appId, versionCode, appId).run();
            const changes = Number(deleted?.meta?.changes ?? deleted?.changes ?? 0);
            if (changes !== 1) return json(request, env, { success: false, error: 'The release changed while deletion was processing. Refresh the history and try again.' }, 409);
          } catch (error) {
            logDiagnosticError(logger, request, path, 'delete-archived-apk', error, requestId);
            return json(request, env, { success: false, error: 'The archived APK could not be fully removed. Refresh the history before retrying.' }, 503);
          }
          return json(request, env, { success: true, deleted: true, deletedAppId: appId, deletedVersionCode: versionCode }, 200, { 'Cache-Control': 'no-store' });
        }

        const uploadMultiMatch = /^\/admin\/android-apps\/(astro|horoscope|calendar)\/upload$/.exec(path);
        if ((path === '/admin/android-app/upload' || uploadMultiMatch) && request.method === 'POST') {
          const appId = uploadMultiMatch ? uploadMultiMatch[1] : 'astro';
          const gated = multiAppGateResponse(request, env, appId);
          if (gated) return gated;
          const appSpec = ANDROID_APPS[appId];
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
            apk = inspectApk(Buffer.from(arrayBuffer), { expectedPackageName: appSpec.packageName, appLabel: appSpec.label });
          } catch (error) {
            return json(request, env, { success: false, error: error?.message || 'The APK failed SMV Android Release validation.' }, 400);
          }
          if (apk.packageName !== appSpec.packageName) {
            return json(request, env, { success: false, error: 'This APK is not the ' + appSpec.label + ' Production app.' }, 400);
          }

          let current;
          try {
            current = await latestRow(env.DB, appId);
          } catch (error) {
            return json(request, env, { success: false, error: error?.message || 'Unable to establish the current APK version.' }, 503);
          }
          const currentCode = Math.max(appSpec.firstVersionCode - 1, Number(current?.version_code || 0));
          if (Number(apk.versionCode) <= currentCode) {
            return json(request, env, {
              success: false,
              error: 'The uploaded APK must have a higher versionCode than the current published version for ' + appSpec.label + '.',
              currentVersionCode: currentCode,
              uploadedVersionCode: Number(apk.versionCode)
            }, 409);
          }

          const objectKey = 'smv-' + appId + '/android/releases/' + String(apk.versionCode) + '/' + globalThis.crypto.randomUUID() + '.apk';
          let stored = false;
          try {
            await env.APK_RELEASES.put(objectKey, Buffer.from(arrayBuffer), {
              httpMetadata: {
                contentType: APK_CONTENT_TYPE,
                cacheControl: 'public, max-age=31536000, immutable'
              },
              customMetadata: {
                appId,
                appLabel: appSpec.label,
                packageName: apk.packageName,
                versionName: apk.versionName,
                versionCode: String(apk.versionCode),
                sha256: apk.sha256,
                certificateSha256: apk.certificateSha256
              }
            });
            stored = true;
            await env.DB.prepare(
              "INSERT INTO android_app_releases (app_id, package_name, version_name, version_code, storage_provider, object_key, external_download_url, sha256, certificate_sha256, size_bytes, uploaded_by, uploaded_at) VALUES (?, ?, ?, ?, 'r2', ?, NULL, ?, ?, ?, ?, ?)"
            ).bind(
              appId,
              apk.packageName,
              apk.versionName,
              Number(apk.versionCode),
              objectKey,
              String(apk.sha256 || ''),
              String(apk.certificateSha256 || ''),
              Number(apk.size || arrayBuffer.byteLength),
              String(auth.identity.uid),
              now
            ).run();
          } catch (error) {
            if (stored) {
              try { await env.APK_RELEASES.delete(objectKey); } catch (_) {}
            }
            const message = String(error?.message || error);
            if (/VERSION_CODE_NOT_INCREASING|UNIQUE constraint failed: android_app_releases\\.app_id, android_app_releases\\.version_code|UNIQUE constraint failed: android_app_releases\\.app_id|UNIQUE constraint failed: android_app_releases\\.version_code/i.test(message)) {
              const latest = await latestRow(env.DB, appId);
              return json(request, env, {
                success: false,
                error: 'A newer or equal ' + appSpec.label + ' APK version was published while this upload was processing.',
                currentVersionCode: Math.max(appSpec.firstVersionCode - 1, Number(latest?.version_code || 0)),
                uploadedVersionCode: Number(apk.versionCode)
              }, 409);
            }
            return json(request, env, { success: false, error: 'The ' + appSpec.label + ' APK could not be stored in Cloudflare R2 and D1.' }, 503);
          }

          const row = await rowByVersion(env.DB, Number(apk.versionCode), appId);
          return json(request, env, publicReleaseFromRow(row, request, true, appId), 200, { 'Cache-Control': 'no-store' });
        }

        return json(request, env, { success: false, error: 'APK release route was not found.' }, 404);
      } catch (error) {
        logDiagnosticError(logger, request, path, 'request', error, requestId);
        const code = /^[A-Z0-9_]{3,80}$/.test(String(error?.code || ''))
          ? String(error.code)
          : 'APK_RELEASE_REQUEST_FAILED';
        return json(request, env, {
          success: false,
          error: 'Cloudflare APK release request failed safely.',
          code,
          requestId
        }, 503);
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
