import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldDeferUnverifiedSignOut } from '../public/verification-auth-state.mjs';

test('keeps the temporary unverified session alive during registration profile setup', () => {
  assert.equal(shouldDeferUnverifiedSignOut({ registrationInProgress: true }), true);
});

test('keeps the temporary unverified session alive while requesting a resend email', () => {
  assert.equal(shouldDeferUnverifiedSignOut({ verificationResendInProgress: true }), true);
});

test('does not defer automatic sign-out outside registration or resend', () => {
  assert.equal(shouldDeferUnverifiedSignOut({}), false);
  assert.equal(shouldDeferUnverifiedSignOut({
    registrationInProgress: false,
    verificationResendInProgress: false
  }), false);
});
