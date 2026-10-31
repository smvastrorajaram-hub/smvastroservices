import { IDENTITY_PROFILE_SOURCE_COLLECTIONS } from '../../../shared/backend-platform/d1-identity-profile-backfill.mjs';

function sendError(res, error, fallback) {
  const status = Number(error?.httpStatus) || 500;
  return res.status(status).set('Cache-Control', 'no-store').json({
    success: false,
    code: String(error?.code || 'IDENTITY_BACKFILL_ERROR'),
    error: status >= 500 ? fallback : String(error?.message || fallback)
  });
}

function optionsFrom(body = {}) {
  const collection = String(body.collection || '').trim();
  if (!Object.prototype.hasOwnProperty.call(IDENTITY_PROFILE_SOURCE_COLLECTIONS, collection)) {
    throw Object.assign(new Error('Choose a supported Identity/Profile collection.'), {
      code: 'IDENTITY_BACKFILL_COLLECTION_UNSUPPORTED', httpStatus: 400
    });
  }
  const pageSize = Number(body.pageSize ?? 20);
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 25) {
    throw Object.assign(new Error('Page size must be from 1 to 25.'), {
      code: 'IDENTITY_BACKFILL_PAGE_SIZE_INVALID', httpStatus: 400
    });
  }
  const pageToken = String(body.pageToken || '');
  if (pageToken.length > 4096) {
    throw Object.assign(new Error('Page token is invalid.'), {
      code: 'IDENTITY_BACKFILL_PAGE_TOKEN_INVALID', httpStatus: 400
    });
  }
  return { collection, pageSize, pageToken };
}

/**
 * Admin-only, staging-only, resumable Identity/Profile backfill controls.
 * Responses contain counts, hashes status and warning codes, never profile or
 * payout values. There is intentionally no cutover/activation endpoint.
 */
export function registerIdentityProfileBackfillRoutes({
  app, identityService, backfillService,
  toolsEnabled = false, environment = 'unknown', sourceProjectId = '',
  cutoverComplete = false, isReady = async () => false
} = {}) {
  if (!app || typeof app.get !== 'function' || typeof app.post !== 'function' ||
      !identityService || typeof identityService.authenticateAuthorization !== 'function' ||
      !backfillService || typeof backfillService.previewPage !== 'function' ||
      typeof backfillService.applyPage !== 'function' ||
      typeof backfillService.reconcilePage !== 'function' ||
      typeof backfillService.status !== 'function') {
    throw new TypeError('Identity backfill routes require Admin identity, D1 and Firestore services.');
  }

  async function requireAdmin(req) {
    const user = await identityService.authenticateAuthorization(req.get('Authorization'));
    if (user.isAdmin !== true && user.role !== 'admin') {
      throw Object.assign(new Error('Admin access is required.'), {
        code: 'ADMIN_REQUIRED', httpStatus: 403
      });
    }
    return user;
  }

  async function requireTools() {
    if (toolsEnabled !== true) {
      throw Object.assign(new Error('Identity/Profile backfill tools are disabled.'), {
        code: 'IDENTITY_BACKFILL_DISABLED', httpStatus: 503
      });
    }
    if (environment !== 'staging' || String(sourceProjectId) !== 'smv-astro-staging') {
      throw Object.assign(new Error('Identity/Profile backfill is restricted to isolated staging.'), {
        code: 'IDENTITY_BACKFILL_STAGING_ONLY', httpStatus: 403
      });
    }
    if (cutoverComplete === true) {
      throw Object.assign(new Error('Backfill is blocked after cutover completion.'), {
        code: 'IDENTITY_BACKFILL_CUTOVER_CLOSED', httpStatus: 409
      });
    }
    if (!(await isReady())) {
      throw Object.assign(new Error('D1 Identity/Profile migrations 0007 and 0008 are not ready.'), {
        code: 'IDENTITY_BACKFILL_SCHEMA_NOT_READY', httpStatus: 503
      });
    }
  }

  app.get('/admin/identity-profile/backfill/status', async (req, res) => {
    try {
      await requireAdmin(req);
      await requireTools();
      const status = await backfillService.status();
      return res.set('Cache-Control', 'no-store').json({
        success: true, sourceProjectId, environment, ...status,
        personalDataReturned: false, cutoverSafe: false
      });
    } catch (error) {
      return sendError(res, error, 'Unable to load Identity/Profile backfill status.');
    }
  });

  app.post('/admin/identity-profile/backfill/preview', async (req, res) => {
    try {
      await requireAdmin(req);
      await requireTools();
      const options = optionsFrom(req.body || {});
      const result = await backfillService.previewPage(options);
      return res.set('Cache-Control', 'no-store').json({
        success: true, mode: 'read_only_preview', sourceProjectId,
        ...result, writesPerformed: 0, personalDataReturned: false
      });
    } catch (error) {
      return sendError(res, error, 'Unable to preview Identity/Profile source data.');
    }
  });

  app.post('/admin/identity-profile/backfill/apply', async (req, res) => {
    try {
      await requireAdmin(req);
      await requireTools();
      const confirmation = String(req.body?.confirmSourceProjectId || '').trim();
      if (confirmation !== String(sourceProjectId)) {
        throw Object.assign(new Error('Explicit staging Firebase project confirmation is required.'), {
          code: 'IDENTITY_BACKFILL_SOURCE_CONFIRMATION_REQUIRED', httpStatus: 400
        });
      }
      const options = optionsFrom(req.body || {});
      const result = await backfillService.applyPage(options);
      return res.set('Cache-Control', 'no-store').json({
        success: true, mode: 'staging_page_import', sourceProjectId,
        ...result, sourceDataDeleted: false, cutoverComplete: false,
        personalDataReturned: false
      });
    } catch (error) {
      return sendError(res, error, 'Unable to import the Identity/Profile page into staging D1.');
    }
  });

  app.post('/admin/identity-profile/backfill/reconcile', async (req, res) => {
    try {
      await requireAdmin(req);
      await requireTools();
      const options = optionsFrom(req.body || {});
      const result = await backfillService.reconcilePage(options);
      const clean = result.auditMissing === 0 && result.payloadMismatches === 0 &&
        result.targetMappingsMissing === 0 && result.warningCount === 0;
      return res.status(clean ? 200 : 409).set('Cache-Control', 'no-store').json({
        success: clean, mode: 'read_only_reconciliation', sourceProjectId,
        ...result, cutoverSafe: false, writesPerformed: 0,
        personalDataReturned: false, sourceDataDeleted: false
      });
    } catch (error) {
      return sendError(res, error, 'Unable to reconcile Identity/Profile source data.');
    }
  });

  return Object.freeze({ paths: Object.freeze([
    '/admin/identity-profile/backfill/status',
    '/admin/identity-profile/backfill/preview',
    '/admin/identity-profile/backfill/apply',
    '/admin/identity-profile/backfill/reconcile'
  ]) });
}
