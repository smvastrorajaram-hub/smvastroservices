'use strict';

function normalizeAllowlist(values) {
  if (values instanceof Set) return new Set([...values].map(value => String(value || '').trim()).filter(Boolean));
  if (Array.isArray(values)) return new Set(values.map(value => String(value || '').trim()).filter(Boolean));
  return new Set(String(values || '').split(',').map(value => value.trim()).filter(Boolean));
}

/**
 * Accept only deployment-managed UIDs, verified custom claims, or explicitly
 * configured verified emails. A mutable Firestore profile role is deliberately
 * not accepted here; the caller may separately check the smv_admins allowlist.
 */
function isConfiguredAdminIdentity(user, { adminUids = [], adminEmails = [] } = {}) {
  if (!user || typeof user !== 'object') return false;
  const uid = String(user.uid || '').trim();
  const uids = normalizeAllowlist(adminUids);
  if (uid && uids.has(uid)) return true;

  if (user.admin === true || String(user.role || '').trim().toLowerCase() === 'admin') return true;

  const email = String(user.email || '').trim().toLowerCase();
  const verified = user.email_verified === true;
  const emails = new Set([...normalizeAllowlist(adminEmails)].map(value => value.toLowerCase()));
  return Boolean(verified && email && emails.has(email));
}

module.exports = { normalizeAllowlist, isConfiguredAdminIdentity };
