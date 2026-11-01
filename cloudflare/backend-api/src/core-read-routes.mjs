function failure(res, error) {
  const status = Number(error?.httpStatus) === 401 ? 401 :
    Number(error?.httpStatus) === 403 ? 403 : 503;
  return res.status(status).set('Cache-Control', 'no-store').json({
    success: false,
    error: status === 503 ? 'Account permissions are temporarily unavailable.' : 'Authentication is required.',
    code: String(error?.code || (status === 503 ? 'IDENTITY_PROFILE_UNAVAILABLE' : 'AUTH_REQUIRED'))
  });
}

/** Public, non-secret runtime configuration retained from the legacy contract. */
export function registerPublicRuntimeReadRoutes({ app, env = {} } = {}) {
  if (!app || typeof app.get !== 'function') {
    throw new TypeError('Public runtime routes require an HTTP app.');
  }
  app.get('/public/push-config', (_req, res) => {
    return res.set('Cache-Control', 'no-store').json({
      success: true,
      vapidPublicKey: String(env.FCM_VAPID_PUBLIC_KEY || '').trim()
    });
  });
  return Object.freeze({ paths: Object.freeze(['/public/push-config']) });
}

/**
 * Admin access is read-only and relies only on the verified identity service's
 * server-controlled Admin claim/allowlist result. A mutable profile role is
 * never accepted as proof of Admin access.
 */
export function registerAdminAccessRoute({ app, identityService } = {}) {
  if (!app || typeof app.get !== 'function' ||
      !identityService || typeof identityService.authenticateAuthorization !== 'function') {
    throw new TypeError('Admin access route requires a verified Firebase identity service.');
  }
  app.get('/admin/access', async (req, res) => {
    try {
      const user = await identityService.authenticateAuthorization(req.get('Authorization'));
      return res.set('Cache-Control', 'no-store').json({
        success: true,
        isAdmin: user.isAdmin === true
      });
    } catch (error) {
      return failure(res, error);
    }
  });
  return Object.freeze({ paths: Object.freeze(['/admin/access']) });
}


/**
 * Legacy dashboard role lookup. The profile is read through the privileged,
 * project-scoped Firestore REST reader and astrologer membership is tied back
 * to the authenticated UID (or its own publicId) in both collection spellings.
 */
export function registerAccountRoleRoute({ app, identityService, firestore } = {}) {
  if (!app || typeof app.get !== 'function' ||
      !identityService || typeof identityService.authenticateAuthorization !== 'function' ||
      !firestore || typeof firestore.getDocument !== 'function' ||
      typeof firestore.runQuery !== 'function') {
    throw new TypeError('Account role route requires verified identity and project-scoped Firestore readers.');
  }

  async function matchingAstrologer(document, uid) {
    return document?.exists === true &&
      (!document.data?.uid || String(document.data.uid) === uid);
  }

  async function firstMatchingQuery(collectionPath, field, value, uid, requirePublicId = false) {
    const rows = await firestore.runQuery({
      collectionPath,
      filters: [{ field, op: '==', value }],
      limit: 1
    });
    const candidate = rows?.[0] || null;
    if (!(await matchingAstrologer(candidate, uid))) return null;
    if (requirePublicId && String(candidate.data?.publicId || '') !== String(value)) return null;
    return candidate;
  }

  app.get('/account/role', async (req, res) => {
    try {
      const user = await identityService.authenticateAuthorization(req.get('Authorization'));
      if (user.isAdmin === true) {
        return res.set('Cache-Control', 'no-store').json({ success: true, role: 'admin' });
      }
      const uid = String(user.uid || '').trim();
      if (!uid || uid.length > 160) {
        return res.status(401).set('Cache-Control', 'no-store').json({
          success: false, error: 'Authentication required.', code: 'AUTH_REQUIRED'
        });
      }

      const userDocument = await firestore.getDocument('smv_users/' + uid);
      const profile = userDocument.exists ? (userDocument.data || {}) : {};
      const publicId = String(profile.publicId || '').trim();
      let astrologerProfile = null;
      let astrologerCollection = '';

      for (const collectionPath of ['smv_astrologers', 'smv_astrologer']) {
        const direct = await firestore.getDocument(collectionPath + '/' + uid);
        if (await matchingAstrologer(direct, uid)) {
          astrologerProfile = direct;
          astrologerCollection = collectionPath;
          break;
        }
        if (!astrologerProfile) {
          astrologerProfile = await firstMatchingQuery(collectionPath, 'uid', uid, uid);
          if (astrologerProfile) {
            astrologerCollection = collectionPath;
            break;
          }
        }
        if (!astrologerProfile && publicId) {
          astrologerProfile = await firstMatchingQuery(collectionPath, 'publicId', publicId, uid, true);
          if (astrologerProfile) {
            astrologerCollection = collectionPath;
            break;
          }
        }
      }

      const storedRole = String(profile.role || '').toLowerCase();
      const role = astrologerProfile || storedRole === 'astrologer' ? 'astrologer' : 'customer';
      return res.set('Cache-Control', 'no-store').json({
        success: true,
        role,
        profileFound: userDocument.exists === true,
        astrologerProfileFound: Boolean(astrologerProfile),
        astrologerProfileCollection: astrologerCollection || null
      });
    } catch (error) {
      return failure(res, error);
    }
  });
  return Object.freeze({ paths: Object.freeze(['/account/role']) });
}
