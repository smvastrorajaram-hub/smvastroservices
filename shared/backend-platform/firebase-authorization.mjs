'use strict';

function normalizedSet(value) {
  const list = value instanceof Set ? [...value] : Array.isArray(value) ? value : String(value || '').split(',');
  return new Set(list.map(item => String(item || '').trim()).filter(Boolean));
}

export function resolveFirebaseAuthorization({
  identity,
  profileDocument,
  adminDocument,
  astrologerDocument,
  adminUids = [],
  adminEmails = []
} = {}) {
  if (!identity || !String(identity.uid || '').trim()) {
    throw new TypeError('A verified Firebase identity is required.');
  }

  const uid = String(identity.uid).trim();
  const claimsAdmin = identity.admin === true ||
    String(identity.role || '').trim().toLowerCase() === 'admin';
  const configuredUidAdmin = normalizedSet(adminUids).has(uid);
  const email = String(identity.email || '').trim().toLowerCase();
  const configuredEmailAdmin = identity.email_verified === true &&
    normalizedSet(adminEmails).size > 0 &&
    [...normalizedSet(adminEmails)].some(value => value.toLowerCase() === email);
  const isAdmin = claimsAdmin || configuredUidAdmin || configuredEmailAdmin || adminDocument?.exists === true;

  const profile = profileDocument?.exists === true ? (profileDocument.data || {}) : {};
  const astrologer = astrologerDocument?.exists === true ? (astrologerDocument.data || {}) : {};
  const profileRole = String(profile.role || '').trim().toLowerCase();
  const astrologerApproved = profileRole === 'astrologer' &&
    String(profile.status || '').trim().toLowerCase() === 'active' &&
    String(astrologer.status || '').trim().toLowerCase() === 'approved';

  return Object.freeze({
    uid,
    isAdmin,
    role: isAdmin ? 'admin' :
      profileRole === 'customer' ? 'customer' :
      profileRole === 'astrologer' ? 'astrologer' : 'unknown',
    astrologerApproved,
    emailVerified: identity.email_verified === true
  });
}
