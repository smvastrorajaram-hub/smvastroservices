'use strict';

function identityError(code, status, message) {
  return Object.assign(new Error(message || code), { code, httpStatus: status });
}

function normalizedSet(value) {
  const list = value instanceof Set ? [...value] : Array.isArray(value) ? value : String(value || '').split(',');
  return new Set(list.map(item => String(item || '').trim()).filter(Boolean));
}

function parseProfile(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(String(value || '{}'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Cloudflare/D1 identity resolver.
 * Firebase Auth remains responsible for signup/login, password reset,
 * email verification and provider sign-in. This service only verifies a
 * Firebase ID token and resolves application authorization from D1.
 * It deliberately does not read Firestore or manage Firebase Auth users.
 *
 * Configured Admin UID/email entries must be project-scoped strings in the
 * form "<firebaseProjectId>:<uid-or-email>" to prevent cross-project privilege
 * leakage when the Worker accepts more than one Firebase project.
 */
export function createD1IdentityService({
  verifyIdToken,
  db,
  projectIds,
  adminUids = [],
  adminEmails = []
} = {}) {
  if (typeof verifyIdToken !== 'function') {
    throw new TypeError('A Firebase ID-token verifier is required.');
  }
  if (!db || typeof db.prepare !== 'function') {
    throw new TypeError('A Cloudflare D1 database binding is required.');
  }

  const allowedProjects = normalizedSet(projectIds);
  if (!allowedProjects.size) {
    throw new TypeError('At least one Firebase Authentication project ID is required.');
  }
  const configuredAdminUids = normalizedSet(adminUids);
  const configuredAdminEmails = new Set([...normalizedSet(adminEmails)].map(value => value.toLowerCase()));

  async function authenticateAuthorization(header) {
    const authorization = String(header || '');
    if (!authorization.startsWith('Bearer ')) {
      throw identityError('AUTH_REQUIRED', 401, 'Login session is missing.');
    }
    const token = authorization.slice(7).trim();
    if (!token || token.length > 16 * 1024) {
      throw identityError('AUTH_REQUIRED', 401, 'Login session is invalid.');
    }

    let identity;
    try {
      identity = await verifyIdToken(token, [...allowedProjects]);
    } catch {
      throw identityError('AUTH_REQUIRED', 401, 'Login session expired. Please login again.');
    }

    const uid = String(identity?.uid || '').trim();
    const projectId = String(identity?.projectId || '').trim();
    if (!uid || uid.length > 160 || !allowedProjects.has(projectId)) {
      throw identityError('AUTH_REQUIRED', 401, 'Verified Firebase identity is invalid.');
    }

    let profileRow;
    let astrologerRow;
    let adminRow;
    try {
      const [profile, astrologer, admin] = await Promise.all([
        db.prepare(
          'SELECT uid, firebase_project_id, email, role, status, public_id, name, email_verified, profile_json ' +
          'FROM smv_domain_identity_users WHERE firebase_project_id = ? AND uid = ? LIMIT 1'
        ).bind(projectId, uid).first(),
        db.prepare(
          'SELECT uid, status FROM smv_domain_identity_astrologers WHERE firebase_project_id = ? AND uid = ? LIMIT 1'
        ).bind(projectId, uid).first(),
        db.prepare(
          'SELECT uid FROM smv_domain_identity_admins WHERE firebase_project_id = ? AND uid = ? LIMIT 1'
        ).bind(projectId, uid).first()
      ]);
      profileRow = profile || null;
      astrologerRow = astrologer || null;
      adminRow = admin || null;
    } catch {
      throw identityError(
        'IDENTITY_PROFILE_UNAVAILABLE',
        503,
        'Account permissions are temporarily unavailable.'
      );
    }

    const email = String(identity.email || '').trim();
    const emailVerified = identity.emailVerified === true || identity.email_verified === true;
    const claimsAdmin = identity.admin === true ||
      String(identity.role || '').trim().toLowerCase() === 'admin';
    const configuredUidAdmin = configuredAdminUids.has(projectId + ':' + uid);
    const configuredEmailAdmin = emailVerified && !!email &&
      configuredAdminEmails.has((projectId + ':' + email).toLowerCase());
    const isAdmin = claimsAdmin || configuredUidAdmin || configuredEmailAdmin || !!adminRow;

    const profileRole = String(profileRow?.role || '').trim().toLowerCase();
    const role = isAdmin ? 'admin' :
      (profileRole === 'customer' || profileRole === 'astrologer' ? profileRole : 'unknown');
    const profileStatus = String(profileRow?.status || '').trim().toLowerCase();
    const astrologerStatus = String(astrologerRow?.status || '').trim().toLowerCase();
    const astrologerApproved = role === 'astrologer' &&
      profileStatus === 'active' &&
      astrologerStatus === 'approved';

    const safeProfile = parseProfile(profileRow?.profile_json);
    const name = String(profileRow?.name || safeProfile.name || safeProfile.displayName || '').trim();
    const displayName = String(safeProfile.displayName || name).trim();

    return Object.freeze({
      uid,
      email,
      emailVerified,
      role,
      isAdmin,
      astrologerApproved,
      projectId,
      firebaseProjectId: projectId,
      name,
      displayName,
      publicId: String(profileRow?.public_id || ''),
      profileStatus
    });
  }

  return Object.freeze({ authenticateAuthorization });
}
