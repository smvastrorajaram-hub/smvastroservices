// Keep Firebase Project 1 as the sole Production identity authority.
// Staging may use its explicitly configured isolated Firebase project.
export function resolveFirebaseAuthProjectIds(env = {}) {
  const environment = String(env.SMV_ENVIRONMENT || '').trim().toLowerCase();
  if (environment === 'production') return ['smv-astro'];
  return String(env.FIREBASE_AUTH_PROJECT_IDS || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
}

// D1 Identity/Profile authorization is a staging experiment only.
// Production Customer/Astrologer/Admin authorization remains Firebase-backed.
export function isD1IdentityAuthorizationAllowed(env = {}) {
  return String(env.SMV_ENVIRONMENT || '').trim().toLowerCase() === 'staging' &&
    String(env.SMV_IDENTITY_PROFILE_D1_AUTHORIZATION_ENABLED || '').trim().toLowerCase() === 'true';
}
