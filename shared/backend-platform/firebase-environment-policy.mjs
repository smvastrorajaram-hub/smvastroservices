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

// Staging remains opt-in. Production requires a separate deployment approval and
// an explicitly completed identity/profile cutover in addition to the feature flag.
export function isD1IdentityAuthorizationAllowed(env = {}) {
  const environment = String(env.SMV_ENVIRONMENT || '').trim().toLowerCase();
  const enabled = String(env.SMV_IDENTITY_PROFILE_D1_AUTHORIZATION_ENABLED || '').trim().toLowerCase() === 'true';
  if (!enabled) return false;
  if (environment === 'staging') return true;
  if (environment !== 'production') return false;
  return String(env.SMV_IDENTITY_PROFILE_CUTOVER_COMPLETE || '').trim().toLowerCase() === 'true' &&
    String(env.SMV_IDENTITY_PROFILE_PRODUCTION_AUTHORIZATION_APPROVED || '').trim().toLowerCase() === 'true' &&
    String(env.SMV_IDENTITY_PROFILE_FRESH_START_APPROVED || '').trim().toLowerCase() === 'true';
}
