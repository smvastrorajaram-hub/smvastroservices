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
