# Four-project Firestore read sharing — rollout guide

## Project assignments from the uploaded Project Settings screenshots

| Purpose | Firebase project ID | Routing rule |
|---|---|---|
| Primary identity and money | `smv-astro` | Auth, profiles/roles, Wallet, payment ledger, bookings and the authoritative Live Session billing transaction stay here. |
| Consultation/history archive | `astro-service-ae9e7` | Copy of legacy question/private-consultation history and ended Live Session history. Source records remain in Project 1. |
| Live auxiliary data | `smv-astro-services` | Copy of Live Chat messages and WebRTC signals. Primary session and billing transaction remain in Project 1. |
| Public content | `svm-astro` | Published content reads and, after verified backfill, Admin content writes. |

The spelling matters: the screenshot shows **`svm-astro`** for the project named **SVM ASTRO**, while the current SMV ASTRO backend uses **`smv-astro`**. The initializer rejects duplicate project IDs.

## Why routing is feature-gated

Firestore cannot make a single atomic transaction across different projects. Therefore Wallet reserve/settlement, commission ledger and the authoritative session document are not split across projects by this change. Live messages/signals are still created transactionally in the primary project and mirrored to Project 3 after commit; a failed mirror disables secondary reads for that particular session so the primary copy remains visible.

Secondary reads are enabled only after the relevant data has been copied and verified. No production Render variables are changed by this PR.

## Render environment variables

Never commit service-account JSON or private keys. The four project IDs above came from the uploaded screenshots and are the production-named projects. The current `smv-astro-staging` backend must **not** route data into these projects. The router rejects this combination unless an explicit cross-environment override is provided, and that override is not recommended for normal testing. Test with isolated secondary staging projects first; enable the production project IDs only on the intended production backend after review.

Required to initialize all four projects:

- `SMV_FIRESTORE_MULTI_PROJECT_ENABLED=true`
- `FIREBASE_PROJECT_ID=smv-astro` (existing primary setting)
- `FIREBASE_CONSULTATIONS_CLIENT_EMAIL` and `FIREBASE_CONSULTATIONS_PRIVATE_KEY`
- `FIREBASE_LIVE_DATA_CLIENT_EMAIL` and `FIREBASE_LIVE_DATA_PRIVATE_KEY`
- `FIREBASE_CONTENT_CLIENT_EMAIL` and `FIREBASE_CONTENT_PRIVATE_KEY`

To prevent gaps while live writes continue, set these **before** running the copy:

- `SMV_SESSION_HISTORY_MIRROR_WRITES=true`
- `SMV_LIVE_DATA_MIRROR_WRITES=true`
- `SMV_CONTENT_MIRROR_WRITES=true`

These mirror flags write to the secondary projects but keep secondary reads disabled. They do not move the source of truth or split Wallet/payment transactions.

Project ID overrides are available as `FIREBASE_CONSULTATIONS_PROJECT_ID`, `FIREBASE_LIVE_DATA_PROJECT_ID`, and `FIREBASE_CONTENT_PROJECT_ID`; defaults match the table above. Each credential must belong to its respective secondary project and have only the Firestore access required by the backend.

With the master flag off (the default), the backend uses Project 1 only and does not initialize secondary apps. With the master flag on but credentials missing/IDs duplicated, startup fails fast rather than silently writing to the wrong database. A non-production primary is also blocked from the screenshot-named production secondaries by default.

## Copy/backfill sequence

1. Create isolated secondary staging projects and configure their explicit `FIREBASE_*_PROJECT_ID` overrides. Deploy the code with the master flag and the three `*_MIRROR_WRITES` flags enabled, while all `*_BACKFILL_COMPLETE` read flags remain **false**.
2. Set `SMV_CUSTOMER_HISTORY_CUTOVER_AT` to an ISO 8601 timestamp immediately before the first dry run. Keep this same value throughout the dry run and apply/copy phase. The apply script refuses to proceed without it.
3. Run the dry run:

   ```sh
   node scripts/backfill-multi-project-firestore.js
   ```

4. Review counts and test the target service-account permissions. The default command makes no writes.
5. Run the resumable copy while mirror writes stay enabled:

   ```sh
   node scripts/backfill-multi-project-firestore.js --apply
   ```

   The script copies question/private-consultation history to Project 2, ended Live Session records to Project 2, Live Session `messages` and `signals` subcollections to Project 3, and `smv_content` records to Project 4. It uses merge-set writes and **never deletes source data**. Repeat `--apply` after fixing any reported copy errors; it is idempotent.

6. Compare document counts and sample records in source and destination projects. Confirm both old and new content are visible, ended history is present, and live chat / WebRTC still operate.
7. The two legacy history endpoints merge copied Project 2 rows with Project 1 rows created or updated since the pre-copy cutover timestamp, keyed by document ID so the newest primary version wins. If the cutover value is missing or invalid, those endpoints fail safe to Project 1.
8. Only after verification, set the per-domain read flags on the intended backend:
   - `SMV_CUSTOMER_HISTORY_BACKFILL_COMPLETE=true` — routes the older customer history to Project 2 and merges newer/updated records from Project 1. This flag does not move writes or change the source of truth.
   - `SMV_SESSION_HISTORY_BACKFILL_COMPLETE=true` — reads ended sessions from Project 2 while active and unarchived sessions still fall back to Project 1.
   - `SMV_LIVE_DATA_BACKFILL_COMPLETE=true` — reads messages/signals from Project 3 only for sessions marked ready; a failed mirror switches that session back to Project 1.
   - `SMV_CONTENT_BACKFILL_COMPLETE=true` — routes public content reads and Admin content updates to Project 4.
9. Run authenticated browser tests for Customer and Astrologer login, live Chat send/receive, WebRTC Call connection, booking, session end/refund/commission, Wallet balance, content publishing, and old content visibility before considering production rollout.

## Firestore security

The secondary Firebase clients are **not** initialized in the browser/mobile app. All secondary access goes through the authenticated Render API with Firebase Admin credentials. Deploy the supplied deny-all client rules and indexes to each secondary project before enabling routing.

Examples (run only after confirming the target project and Firebase CLI authentication):

```sh
firebase deploy --only firestore:rules,firestore:indexes --project astro-service-ae9e7 --config firebase.multi-project-consultations.json
firebase deploy --only firestore:rules --project smv-astro-services --config firebase.multi-project-live-data.json
firebase deploy --only firestore:rules,firestore:indexes --project svm-astro --config firebase.multi-project-content.json
```

These deploy commands are documentation only; this PR does not deploy Firestore rules, indexes, secrets, or data.

## Read-quota reductions already included in source

- Public content no longer reads directly from the primary project in the browser; its published-only API switches to Project 4 after backfill.
- Live Chat message and WebRTC signal fallback polling deduplicates overlapping requests for a given session. The existing healthy-SSE behavior remains: polling is recovery-only.
- The primary session transaction no longer performs an extra participant/session read before its own transaction validates the same session.
- The active Customer Dashboard no longer loads the retired question/private-consultation histories as part of its initial render. The two legacy history APIs remain separate; failure of one does not call or gate the other.


## Continuous sync and reconciliation for read replicas

The additional Project 2 replica allowlist includes question/private-consultation records, astrologer profiles, reviews, notifications and quiz questions. Deploy the Cloud Functions triggers in `functions/` to the **source project only**. Supply target service-account credentials through Firebase Functions Secrets, configure `SMV_REPLICA_SOURCE_PROJECT_ID` to the exact source project and `FIREBASE_CONSULTATIONS_PROJECT_ID` to the isolated destination. Keep `SMV_DASHBOARD_READ_REPLICA_MIRROR_WRITES=false` until project IDs and permissions are checked.

The copy script includes the same allowlist and uses source-version sidecars to avoid stale backfill overwrites. Run `node scripts/validate-multi-project-firestore.js` for read-only document-ID and content-hash reconciliation. It must report zero missing, extra or mismatched documents before enabling `SMV_DASHBOARD_READ_REPLICA_BACKFILL_COMPLETE=true` on the intended Render backend.

Client rules remain deny-all in all secondary databases. The generic replica does not include profile/role identity, Admin allowlists, phone/public-ID registries, counters, payment/Razorpay, Wallet, payout/withdrawal, or active booking/settlement records. They stay authoritative in Project 1 (or Project 5 only after its separate guarded cutover).
