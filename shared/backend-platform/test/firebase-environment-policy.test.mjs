import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveFirebaseAuthProjectIds,
  isD1IdentityAuthorizationAllowed
} from '../firebase-environment-policy.mjs';

test('Production accepts only Firebase Project 1 even if other project IDs are configured', () => {
  assert.deepEqual(resolveFirebaseAuthProjectIds({
    SMV_ENVIRONMENT: 'production',
    FIREBASE_AUTH_PROJECT_IDS: 'smv-astro-staging,smv-astro,project-5'
  }), ['smv-astro']);
});

test('Production keeps Project 1 as the default allowlist when the variable is absent', () => {
  assert.deepEqual(resolveFirebaseAuthProjectIds({ SMV_ENVIRONMENT: 'production' }), ['smv-astro']);
});

test('staging uses only the explicitly configured isolated project allowlist', () => {
  assert.deepEqual(resolveFirebaseAuthProjectIds({
    SMV_ENVIRONMENT: 'staging',
    FIREBASE_AUTH_PROJECT_IDS: 'smv-astro-staging'
  }), ['smv-astro-staging']);
});

test('staging with no configured project IDs stays fail-closed', () => {
  assert.deepEqual(resolveFirebaseAuthProjectIds({ SMV_ENVIRONMENT: 'staging' }), []);
});

test('Production D1 Identity authorization needs enabled, cutover-complete and explicit approval flags', () => {
  const base = {
    SMV_ENVIRONMENT: 'production',
    SMV_IDENTITY_PROFILE_D1_AUTHORIZATION_ENABLED: 'true'
  };
  assert.equal(isD1IdentityAuthorizationAllowed(base), false);
  assert.equal(isD1IdentityAuthorizationAllowed({
    ...base, SMV_IDENTITY_PROFILE_CUTOVER_COMPLETE: 'true'
  }), false);
  assert.equal(isD1IdentityAuthorizationAllowed({
    ...base,
    SMV_IDENTITY_PROFILE_CUTOVER_COMPLETE: 'true',
    SMV_IDENTITY_PROFILE_PRODUCTION_AUTHORIZATION_APPROVED: 'true'
  }), true);
  assert.equal(isD1IdentityAuthorizationAllowed({
    ...base,
    SMV_IDENTITY_PROFILE_CUTOVER_COMPLETE: 'false',
    SMV_IDENTITY_PROFILE_PRODUCTION_AUTHORIZATION_APPROVED: 'true'
  }), false);
});

test('D1 Identity authorization remains opt-in for staging and rejects unknown environments', () => {
  assert.equal(isD1IdentityAuthorizationAllowed({
    SMV_ENVIRONMENT: 'staging',
    SMV_IDENTITY_PROFILE_D1_AUTHORIZATION_ENABLED: 'true'
  }), true);
  assert.equal(isD1IdentityAuthorizationAllowed({
    SMV_ENVIRONMENT: 'staging',
    SMV_IDENTITY_PROFILE_D1_AUTHORIZATION_ENABLED: 'false'
  }), false);
  assert.equal(isD1IdentityAuthorizationAllowed({
    SMV_ENVIRONMENT: 'development',
    SMV_IDENTITY_PROFILE_D1_AUTHORIZATION_ENABLED: 'true'
  }), false);
});
