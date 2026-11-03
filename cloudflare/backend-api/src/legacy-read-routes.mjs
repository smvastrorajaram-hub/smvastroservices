function millis(value) {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (value && typeof value === 'object') {
    const seconds = Number(value.seconds ?? value._seconds);
    const nanos = Number(value.nanoseconds ?? value._nanoseconds ?? 0);
    if (Number.isFinite(seconds) && Number.isFinite(nanos)) return seconds * 1000 + nanos / 1e6;
  }
  return 0;
}

function newestActivity(item) {
  return Math.max(
    millis(item?.updatedAt), millis(item?.publishedAt),
    millis(item?.createdAt), millis(item?.uploadedAt)
  );
}

function publicAndroidRelease(data, packageName) {
  if (!data || !data.downloadUrl || !Number.isSafeInteger(Number(data.versionCode))) {
    return { success: true, available: false };
  }
  return {
    success: true,
    available: true,
    packageName,
    versionName: String(data.versionName || ''),
    versionCode: Number(data.versionCode),
    downloadUrl: String(data.downloadUrl),
    size: Number(data.size || 0),
    uploadedAt: Number(data.uploadedAt || 0)
  };
}

function sendError(res, error, message) {
  const status = Number(error?.httpStatus) || 500;
  return res.status(status).set('Cache-Control', 'no-store').json({
    success: false,
    error: status >= 500 ? message : String(error?.message || message),
    code: String(error?.code || 'LEGACY_READ_FAILED')
  });
}

/**
 * Read-only Cloudflare implementations of legacy public/admin read contracts.
 * All privileged reads use the scoped Firebase Admin REST client. Draft content
 * and admin release metadata require a verified Admin identity.
 */
export function registerLegacyReadRoutes({
  app,
  firestore,
  identityService,
  androidPackageName = 'in.smvastroservices.smvastro'
} = {}) {
  if (!app || typeof app.get !== 'function' ||
      !firestore || typeof firestore.getDocument !== 'function' ||
      typeof firestore.runQuery !== 'function' ||
      !identityService || typeof identityService.authenticateAuthorization !== 'function') {
    throw new TypeError('Legacy read routes require Firestore Admin REST and Firebase identity services.');
  }

  async function requireAdmin(req) {
    const actor = await identityService.authenticateAuthorization(req.get('Authorization'));
    if (actor.isAdmin !== true && String(actor.role || '').toLowerCase() !== 'admin') {
      throw Object.assign(new Error('Admin access denied.'), {
        code: 'ADMIN_REQUIRED', httpStatus: 403
      });
    }
    return actor;
  }

  app.get('/public/android-app', async (_req, res) => {
    try {
      const snapshot = await firestore.getDocument('smv_app_releases/android');
      return res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
        .json(publicAndroidRelease(snapshot.exists ? snapshot.data : null, androidPackageName));
    } catch (error) {
      return res.status(503).set('Cache-Control', 'no-store').json({
        success: false, available: false,
        error: 'Android app information is temporarily unavailable.'
      });
    }
  });

  app.get('/admin/android-app', async (req, res) => {
    try {
      await requireAdmin(req);
      const snapshot = await firestore.getDocument('smv_app_releases/android');
      const data = snapshot.exists ? snapshot.data : null;
      return res.set('Cache-Control', 'no-store').json({
        ...publicAndroidRelease(data, androidPackageName),
        uploadedBy: data?.uploadedBy ? String(data.uploadedBy) : '',
        certificateSha256: data?.certificateSha256 ? String(data.certificateSha256) : ''
      });
    } catch (error) {
      return sendError(res, error, 'Unable to load the current Android app release.');
    }
  });

  app.get('/public/content', async (_req, res) => {
    try {
      const documents = await firestore.runQuery({
        collectionPath: 'smv_content',
        filters: [
          { field: 'published', op: '==', value: true },
          { field: 'language', op: '==', value: 'en' }
        ],
        limit: 500
      });
      const items = documents.map(document => ({ id: document.id, ...(document.data || {}) }))
        .sort((left, right) => newestActivity(right) - newestActivity(left));
      return res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
        .json({ success: true, items });
    } catch {
      return res.status(503).set('Cache-Control', 'no-store').json({
        success: false, error: 'Published content is temporarily unavailable.'
      });
    }
  });

  app.get('/admin/content', async (req, res) => {
    try {
      await requireAdmin(req);
      const documents = await firestore.runQuery({
        collectionPath: 'smv_content',
        filters: [{ field: 'language', op: '==', value: 'en' }],
        limit: 500
      });
      const items = documents.map(document => ({ id: document.id, ...(document.data || {}) }))
        .sort((left, right) => newestActivity(right) - newestActivity(left));
      return res.set('Cache-Control', 'no-store').json({ success: true, items });
    } catch (error) {
      return sendError(res, error, 'Unable to load Admin content.');
    }
  });

  return Object.freeze({
    paths: Object.freeze([
      '/public/android-app',
      '/admin/android-app',
      '/public/content',
      '/admin/content'
    ])
  });
}
