import { resolveFirebaseAuthorization } from './firebase-authorization.mjs';

function normalizedSet(value) {
  const list = value instanceof Set ? [...value] : Array.isArray(value) ? value : String(value || '').split(',');
  return new Set(list.map(item => String(item || '').trim()).filter(Boolean));
}

function identityError(code, status, message) {
  return Object.assign(new Error(message || code), { code, httpStatus: status });
}

/**
 * Shared Firebase identity and profile-role resolver. The same contract can be
 * injected into Render (Admin SDK reader) or Cloudflare (privileged REST reader).
 */
export function createFirebaseIdentityService({
  verifyIdToken,
  firestore,
  projectIds,
  adminUids = [],
  adminEmails = []
} = {}) {
  if (typeof verifyIdToken !== 'function' || !firestore || typeof firestore.getDocument !== 'function') {
    throw new TypeError('Firebase token verifier and privileged Firestore document reader are required.');
  }
  const allowedProjects = normalizedSet(projectIds);
  if (!allowedProjects.size) throw new TypeError('At least one allowed Firebase project ID is required.');
  const configuredAdminUids = normalizedSet(adminUids);
  const configuredAdminEmails = normalizedSet(adminEmails);

  async function authenticateAuthorization(header) {
    const authorization = String(header || '');
    if (!authorization.startsWith('Bearer ')) throw identityError('AUTH_REQUIRED', 401, 'Login session is missing.');
    const token = authorization.slice(7).trim();
    if (!token || token.length > 16 * 1024) throw identityError('AUTH_REQUIRED', 401, 'Login session is invalid.');
    let identity;
    try {
      identity = await verifyIdToken(token, [...allowedProjects]);
    } catch {
      throw identityError('AUTH_REQUIRED', 401, 'Login session expired. Please login again.');
    }
    const uid = String(identity?.uid || '').trim();
    if (!uid || uid.length > 160) throw identityError('AUTH_REQUIRED', 401, 'Verified Firebase identity is invalid.');
    let profileDocument, adminDocument;
    try {
      [profileDocument, adminDocument] = await Promise.all([
        firestore.getDocument('smv_users/' + uid),
        firestore.getDocument('smv_admins/' + uid)
      ]);
    } catch {
      throw identityError('IDENTITY_PROFILE_UNAVAILABLE', 503, 'Account permissions are temporarily unavailable.');
    }
    const resolved = resolveFirebaseAuthorization({
      identity,
      profileDocument,
      adminDocument,
      adminUids: configuredAdminUids,
      adminEmails: configuredAdminEmails
    });
    const profileRole = String(profileDocument?.data?.role || '').trim().toLowerCase();
    const claimRole = String(identity?.role || '').trim().toLowerCase();
    const role = resolved.isAdmin ? 'admin' :
      ['customer', 'astrologer'].includes(profileRole) ? profileRole :
      ['customer', 'astrologer'].includes(claimRole) ? claimRole : 'unknown';
    return Object.freeze({
      uid,
      email: String(identity.email || ''),
      emailVerified: identity.emailVerified === true || identity.email_verified === true,
      role,
      isAdmin: resolved.isAdmin,
      astrologerApproved: resolved.astrologerApproved,
      projectId: String(identity.projectId || '')
    });
  }

  return Object.freeze({ authenticateAuthorization });
}
