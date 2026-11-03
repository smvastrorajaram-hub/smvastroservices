import { FirestoreFieldValue } from '../../../shared/backend-platform/firestore-admin-rest.mjs';

function sendError(res, error, fallback) {
  const status = Number(error?.httpStatus) || 500;
  return res.status(status).set('Cache-Control', 'no-store').json({
    success: false,
    error: status >= 500 ? fallback : String(error?.message || fallback),
    code: String(error?.code || 'ADMIN_PROFILE_MUTATION_FAILED')
  });
}

function safeAdminUid(user) {
  return String(user?.uid || '').trim();
}

export function registerAdminAstrologerProfileRoutes({ app, firestore, identityService, randomId = () => globalThis.crypto.randomUUID() } = {}) {
  if (!app || typeof app.post !== 'function' ||
      !firestore || typeof firestore.runTransaction !== 'function' ||
      !identityService || typeof identityService.authenticateAuthorization !== 'function') {
    throw new TypeError('Admin Astrologer profile routes require Firestore transactions and verified identity.');
  }

  async function requireAdmin(req) {
    const actor = await identityService.authenticateAuthorization(req.get('Authorization'));
    if (actor.isAdmin !== true && String(actor.role || '').toLowerCase() !== 'admin') {
      throw Object.assign(new Error('Admin access denied.'), { code: 'ADMIN_REQUIRED', httpStatus: 403 });
    }
    return actor;
  }

  async function linkedProfilePaths(tx, astrologerId) {
    const selectedPath = 'smv_astrologers/' + astrologerId;
    const selectedSnapshot = await tx.getDocument(selectedPath);
    if (!selectedSnapshot.exists) {
      throw Object.assign(new Error('Astrologer profile not found.'), {
        code: 'ASTROLOGER_PROFILE_NOT_FOUND', httpStatus: 404
      });
    }
    const selected = selectedSnapshot.data || {};
    const uid = String(selected.uid || selectedSnapshot.id || '').trim();
    if (!uid || uid.length > 128 || uid.includes('/')) {
      throw Object.assign(new Error('Astrologer profile has no valid login UID.'), {
        code: 'ASTROLOGER_PROFILE_UID_INVALID', httpStatus: 409
      });
    }
    const linked = await tx.query({
      collectionPath: 'smv_astrologers',
      filters: [{ field: 'uid', op: '==', value: uid }],
      limit: 25
    });
    const paths = new Set([selectedPath, 'smv_astrologers/' + uid]);
    for (const document of linked) {
      const recordUid = String(document.data?.uid || '').trim();
      if (recordUid && recordUid !== uid) continue;
      paths.add('smv_astrologers/' + document.id);
    }
    return { selected, uid, paths };
  }

  app.post('/admin/astrologer-profile-permission', async (req, res) => {
    try {
      const actor = await requireAdmin(req);
      const astrologerId = String(req.body?.astrologerId || '').trim();
      const allow = req.body?.allow;
      if (!astrologerId || astrologerId.length > 200 || astrologerId.includes('/') ||
          typeof allow !== 'boolean') {
        return res.status(400).set('Cache-Control', 'no-store').json({
          success: false, error: 'A valid Astrologer ID and permission value are required.'
        });
      }
      const result = await firestore.runTransaction(async tx => {
        const { uid, paths } = await linkedProfilePaths(tx, astrologerId);
        const timestamp = FirestoreFieldValue.serverTimestamp();
        const patch = {
          profileEditAllowed: allow,
          profileEditPermissionUpdatedAt: timestamp,
          profileEditPermissionUpdatedBy: safeAdminUid(actor),
          updatedAt: timestamp
        };
        for (const path of paths) tx.set(path, patch, { merge: true });
        return { uid };
      });
      return res.set('Cache-Control', 'no-store').json({
        success: true, astrologerId, uid: result.uid, allow
      });
    } catch (error) {
      return sendError(res, error, 'Unable to save Astrologer profile permission.');
    }
  });

  app.post('/admin/astrologer-profile-description', async (req, res) => {
    try {
      const actor = await requireAdmin(req);
      const astrologerId = String(req.body?.astrologerId || '').trim();
      const action = String(req.body?.action || 'save').trim().toLowerCase();
      if (!astrologerId || astrologerId.length > 200 || astrologerId.includes('/') ||
          !['save', 'approve', 'reject'].includes(action)) {
        return res.status(400).set('Cache-Control', 'no-store').json({
          success: false, error: 'A valid Astrologer ID and description action are required.'
        });
      }
      const result = await firestore.runTransaction(async tx => {
        const { selected, uid, paths } = await linkedProfilePaths(tx, astrologerId);
        let description = String(req.body?.description || '').trim();
        if (action === 'approve') description = String(selected.profileDescriptionPending || '').trim();
        if (action === 'save' && (description.length < 20 || description.length > 2000)) {
          throw Object.assign(new Error('Description must be 20–2000 characters.'), {
            code: 'PROFILE_DESCRIPTION_INVALID', httpStatus: 400
          });
        }
        if (action === 'approve' && !description) {
          throw Object.assign(new Error('There is no pending description to approve.'), {
            code: 'PROFILE_DESCRIPTION_NOT_PENDING', httpStatus: 409
          });
        }
        const timestamp = FirestoreFieldValue.serverTimestamp();
        let patch;
        if (action === 'save' || action === 'approve') {
          patch = {
            profileDescription: description,
            profileDescriptionPending: '',
            profileDescriptionStatus: 'approved',
            profileDescriptionApprovedAt: timestamp,
            profileDescriptionApprovedBy: safeAdminUid(actor),
            updatedAt: timestamp
          };
        } else {
          patch = {
            profileDescriptionPending: '',
            profileDescriptionStatus: 'rejected',
            profileDescriptionRejectedAt: timestamp,
            profileDescriptionRejectedBy: safeAdminUid(actor),
            updatedAt: timestamp
          };
          description = '';
        }
        for (const path of paths) tx.set(path, patch, { merge: true });
        if (action === 'approve') {
          const suffix = String(randomId()).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
          tx.create('smv_notifications/' + uid + '_profile_approved_' + (suffix || 'approval'), {
            userId: uid,
            type: 'profile_description',
            title: 'Profile description approved',
            message: 'Your updated profile description has been approved by Admin.',
            createdAt: timestamp,
            read: false
          });
        }
        return { uid, description };
      });
      return res.set('Cache-Control', 'no-store').json({
        success: true,
        astrologerId,
        uid: result.uid,
        action,
        description: result.description
      });
    } catch (error) {
      return sendError(res, error, 'Unable to save Astrologer profile description.');
    }
  });

  return Object.freeze({
    paths: Object.freeze([
      '/admin/astrologer-profile-permission',
      '/admin/astrologer-profile-description'
    ])
  });
}
