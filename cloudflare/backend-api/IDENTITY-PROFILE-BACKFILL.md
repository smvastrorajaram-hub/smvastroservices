# Identity/Profile Firestore → D1 staging backfill (step 0008)

## Scope and hard boundaries

This PR adds a **staging-only, page-based importer** for the seven Identity/Profile collections below. It is not a production migration and does not switch application authorization to D1.

- Source project is hard-limited in code to `smv-astro-staging`; the Firestore REST client must report that same project.
- Firestore use is read-only: the importer calls `listDocuments` only. It does not create, update, delete, or change Firestore rules.
- Firebase Authentication remains responsible for account creation, password/email/Google sign-in, email verification, password reset and ID-token issuance. No Auth user-management APIs are called.
- D1 writes happen only when the separate `SMV_IDENTITY_PROFILE_BACKFILL_ENABLED` flag is explicitly enabled in a staging Worker. The flag is not enabled by this PR.
- Preview and reconciliation are read-only. Apply requires an Admin token, staging source confirmation and schema migrations 0007/0008.
- There is no cutover endpoint. `cutoverSafe` is always false, and profile reads/authorization are not switched to D1.
- No Production Firebase, production Cloudflare Worker/D1, Render config/deployment, DNS, Razorpay, Horoscope or Calendar resources are changed.

## Collections and destination mapping

| Firestore source | D1 destination |
|---|---|
| `smv_users` | `smv_domain_identity_users`; project-scoped UID; valid customer/astrologer role only |
| `smv_astrologers` | `smv_domain_identity_astrologers` |
| `smv_astrologer` | Legacy Astrologer profile compatibility; same normalized D1 table |
| `smv_admins` | Separate `smv_domain_identity_admins` allowlist; never inferred from `smv_users.role` |
| `smv_phone_registry` | Global phone-hash registry; recomputes the SHA-256 digest and blocks mismatched IDs |
| `smv_public_ids` | `smv_domain_identity_public_ids`; global public-ID uniqueness |
| `smv_payouts` | Separate `smv_domain_identity_payout_profiles` only |

Customer/Astrologer profile snapshots omit credentials and payout-like fields from their JSON snapshot. Existing phone values are normalized using the same Indian-number canonicalization rules as the registration backend. A malformed number, a phone-registry digest mismatch, invalid public ID, invalid UID, or invalid source document creates a warning and blocks that page from applying. Unique-key conflicts in D1 also fail the batch; resolve those conflicts rather than overwriting the other owner.

Admin authority is imported only from `smv_admins`. A mutable `role: "admin"` value in a user profile maps to `unknown`, not an Admin grant.

## Payout data protection

Bank/UPI data is never stored in the ordinary user or Astrologer JSON profile and is never included in preview, status, apply or reconciliation responses. Before payout pages can be applied, configure a **32-byte AES-GCM key**, base64-encoded, as the protected Cloudflare Worker secret `SMV_IDENTITY_PAYOUT_ENCRYPTION_KEY`. The importer encrypts the payout document with AES-256-GCM and binds its additional authenticated data to `firebaseProjectId:uid`. The D1 `payload_json` column contains only the versioned encrypted envelope. Without the key, payout import produces `PAYOUT_ENCRYPTION_KEY_MISSING` and apply is blocked.

Keep this key outside source control and do not paste it into chat, PR comments, or ordinary Worker variables. Back it up securely; losing it makes the imported payout data unreadable. `SMV_IDENTITY_PAYOUT_KEY_VERSION` labels the key version (default `v1`).

## Protected staging configuration (not changed by this PR)

Only after staging access is explicitly approved, configure through Cloudflare's protected secrets/variables:

- `SMV_ENVIRONMENT=staging`
- `FIREBASE_PROJECT_ID=smv-astro-staging`
- `FIREBASE_AUTH_PROJECT_IDS=smv-astro-staging`
- `FIREBASE_SERVICE_ACCOUNT_JSON`: a service account from the staging project with Firestore read-only access
- `SMV_IDENTITY_PROFILE_BACKFILL_ENABLED=true`
- `SMV_IDENTITY_PROFILE_CUTOVER_COMPLETE=false`
- `SMV_IDENTITY_PAYOUT_ENCRYPTION_KEY`: protected secret, base64 of exactly 32 random bytes
- optionally `SMV_IDENTITY_PAYOUT_KEY_VERSION=v1`

The current PR does not set these values or deploy the Worker. The API checks project IDs and environment at construction time, and route registration remains off while the backfill flag is false.

## D1 authorization integration — disabled until verified

The Worker contains a D1 authorization path behind
`SMV_IDENTITY_PROFILE_D1_AUTHORIZATION_ENABLED`. The staging Wrangler config
sets this flag to `false`. While disabled, the existing Firebase/Firestore
authorization path remains unchanged. When enabled, the Worker switches
`/api/auth/authorization` and any enabled Wallet/Live route identity checks to
the project-scoped D1 resolver; it does not silently fall back to Firestore.

The D1 path is restricted in code to `SMV_ENVIRONMENT=staging`,
`FIREBASE_PROJECT_ID=smv-astro-staging`, and the single-project
`FIREBASE_AUTH_PROJECT_IDS=smv-astro-staging` allowlist. Every request checks
the D1 schema marker and three migration attestations. It returns HTTP 503
until all are true:

- `inventory_complete=1`: every page of all seven source collections has been
  previewed and imported, including both Astrologer collections.
- `reconciliation_complete=1`: every imported source page has been reconciled
  after the final source update, with zero missing audit entries, hash
  mismatches, missing target mappings, target-value mismatches or warnings.
- `source_quiesced=1`: profile/role/admin/phone/public-ID/payout writes in the
  staging Firestore source have been paused for final reconciliation and
  remain paused while D1 authorization is used.

These values are operator attestations, not facts inferred from partial page
imports. Do not set them merely to make the gate green. Only after the complete
evidence above exists, use the isolated staging D1 SQL console:

```sql
INSERT INTO smv_domain_identity_migration_meta
  (source_project_id, inventory_complete, reconciliation_complete,
   source_quiesced, last_source_update_time, updated_at_ms)
VALUES
  ('smv-astro-staging', 1, 1, 1,
   strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
   CAST(strftime('%s', 'now') AS INTEGER) * 1000)
ON CONFLICT(source_project_id) DO UPDATE SET
  inventory_complete = excluded.inventory_complete,
  reconciliation_complete = excluded.reconciliation_complete,
  source_quiesced = excluded.source_quiesced,
  last_source_update_time = excluded.last_source_update_time,
  updated_at_ms = excluded.updated_at_ms;
```

Then, and only for the isolated staging Worker, set the protected variable
`SMV_IDENTITY_PROFILE_D1_AUTHORIZATION_ENABLED=true`. Keep
`SMV_IDENTITY_PROFILE_CUTOVER_COMPLETE=false` while backfill tools remain
needed. If the D1 gate becomes unavailable after activation, authorization
fails closed with HTTP 503; there is no automatic Firestore fallback. Firebase
Auth itself remains unchanged.

This repository change does not run a real Firestore import, set these
attestation fields, set Cloudflare secrets/variables, apply remote migrations,
or deploy the staging Worker.

## Admin routes

All routes require a Firebase ID token whose application identity resolves as Admin using the existing trusted Admin mechanism. Routes are registered only while the staging flag is true.

- `GET /admin/identity-profile/backfill/status`
- `POST /admin/identity-profile/backfill/preview`
- `POST /admin/identity-profile/backfill/apply`
- `POST /admin/identity-profile/backfill/reconcile`

POST body accepts `collection`, `pageSize` (1–25), and `pageToken`. Apply additionally requires `confirmSourceProjectId: "smv-astro-staging"`. Page tokens are Firestore pagination cursors; process each collection page-by-page. Do not skip pages. Re-run import pages after source changes, then reconcile each page against its current source hash. The audit table stores hashes, IDs, status and warning codes—not raw source profile or payout values.

## What still blocks migration/cutover

1. Protected read-only staging Firestore credentials and staging D1 binding must be configured and tested by the operator.
2. Complete all seven collections, including every page of both canonical and legacy Astrologer collections.
3. Resolve every phone/public-ID/UID conflict and every preview warning.
4. Re-run reconciliation after the final source update; require zero missing audit entries, payload mismatches, target mapping gaps and warnings.
5. Independently audit the D1 profile and payout read/write APIs, then wire the D1 identity resolver only in a later PR with a rollback plan.
6. Keep Firebase Auth unchanged. No production profile/authorization cutover is included here.

CI applies SQL migrations to a local, ephemeral D1 database only. It does not import real data, access Firestore credentials, run remote D1 migrations or deploy a Worker.
