# D1 Identity/Profile foundation (migration step 0007)

This step prepares Cloudflare D1 to become the application-profile and
authorization source after a separately audited, staging-only import and
reconciliation.

## Firebase Authentication boundary

Firebase Authentication remains responsible for:
- Creating Firebase Auth accounts.
- Email/password and Google/provider sign-in.
- Email verification and password-reset flows.
- Issuing Firebase ID tokens.

The Cloudflare service in this step only verifies a Firebase ID token and resolves
application authorization from D1. It does not call Firebase Auth user-management
APIs, create/delete Auth users, send verification emails, or change Firebase Auth
provider/project settings.

## Schema introduced

Migration \`0007_identity_profile_domain.sql\` adds separate D1 tables for:
- Customer/Astrologer application profile snapshots.
- Astrologer approval state.
- Server-managed Admin allowlist.
- One-phone-one-account uniqueness registry.
- Public Customer/Astrologer IDs.
- Separate payout profile storage.
- Per-source-project identity migration/reconciliation metadata.

Bank/payout details are intentionally separate from ordinary profile reads. The
ordinary user profile role cannot grant Admin access; Admin authority must come
from a trusted Firebase custom claim, a project-scoped configured server
allowlist, or the separate project-scoped D1 Admin allowlist table. Identity,
Astrologer approval and Admin records use the Firebase project ID together with
the UID because Firebase UIDs are scoped to their project.

## Runtime state and safety

- The new resolver is a standalone module and is not wired into live routes yet.
- Configured Admin UID/email entries use `<firebaseProjectId>:<uid-or-email>` so a
  trusted identity in one Firebase project cannot inherit Admin authority in another.
- Existing \`firebase-identity-service.mjs\` and its Firestore reads are unchanged.
- No user/profile/phone/Admin/payout data is copied by this step.
- No production or staging Firestore is read or written.
- No remote D1 migration or Cloudflare Worker deployment is run.
- No Render config, frontend API URL, DNS, Firebase Auth settings, Razorpay, APK,
  Horoscope or Calendar source is changed.
- No cutover flag is enabled.

A later PR must inventory and import the existing profile and authorization
collections from an explicitly selected isolated staging Firebase project, then
reconcile document counts, public-ID uniqueness, phone uniqueness, Admin allowlist
membership, Astrologer approval states and payout records before a D1 identity
resolver can replace the current Firestore-dependent resolver.
