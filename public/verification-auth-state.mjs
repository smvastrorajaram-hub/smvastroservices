export function shouldDeferUnverifiedSignOut({
  registrationInProgress = false,
  verificationResendInProgress = false
} = {}) {
  return Boolean(registrationInProgress || verificationResendInProgress);
}
