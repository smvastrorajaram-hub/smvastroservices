# Paired Firebase Firestore read failover

## Required topology

| Pool | Members | Read behavior |
| --- | --- | --- |
| Standalone | Project 1 `smv-astro` | No automatic failover to Projects 2–5. |
| Pair A | Project 2 `astro-service-ae9e7` ⇄ Project 3 `smv-astro-services` | Quota-only fallback for the exact mirrored, allowlisted replica datasets. |
| Pair B | Project 4 `svm-astro` ⇄ Project 5 `smvastro-services` | Quota-only fallback for `smv_content`, which is mirrored and validated in both projects. |

This does not make five independent Firebase projects interchangeable. A fallback is permitted only for data that has been copied, continuously mirrored and reconciled in both members. A query error that is not a quota/resource-exhausted error is returned as an error.

## Project 2 / Project 3 mirrored datasets

The same top-level read-safe records are backfilled into both Projects 2 and 3: `smv_questions`, `smv_private_consultations`, `smv_astrologers`, `smv_reviews`, `smv_notifications`, and `smv_astrologer_quiz_questions`. Ended Live Session archives, plus Live Chat `messages` and WebRTC `signals` subcollections, are copied and mirrored to both projects. Project 1 remains the source for auth, roles and live-session/financial decisions. Client writes to the secondary projects remain denied.

The Project 1 Cloud Functions trigger fans out source mutations to Project 2 and Project 3 using the same service-account credentials. That account must have appropriate Firestore write access to both target projects. Keep mirror triggers deployed only on the source project; installing the same mirror triggers on the destination projects would create a replication loop.

Configure the Functions parameters in the source project only:

- `SMV_REPLICA_SOURCE_PROJECT_ID=smv-astro`
- `SMV_REPLICA_TARGET_PROJECT_ID=astro-service-ae9e7`
- `SMV_REPLICA_PEER_PROJECT_ID=smv-astro-services`
- `SMV_P23_PAIRED_REPLICA_MIRROR_WRITES=true`
- Keep `SMV_DASHBOARD_READ_REPLICA_MIRROR_WRITES=true` enabled after verifying both targets.

The configured replica service account must be granted the required write access in both target projects. Keep credentials in Firebase Secrets, not in GitHub.

## Project 4 / Project 5 mirrored dataset

Only public/admin content metadata in `smv_content` is mirrored to Project 5 for this pair. The content-only backfill writes no Wallet or payment data:

```sh
node scripts/backfill-p45-public-content.js
node scripts/backfill-p45-public-content.js --apply
node scripts/validate-paired-firestore-replicas.js
```

Set `SMV_P45_PAIRED_CONTENT_MIRROR_WRITES=true` and configure Projects 4 and 5 first. Run the copy while mirroring is active, then run the read-only validator after writes have drained. Do not enable the read gate unless both the copy and validation are clean.

**Wallet balances, ledger/recharge status, Razorpay orders/webhooks, payouts, bookings, settlement, commission, earnings and active billing/session transactions are deliberately excluded from Project 4/5 fallback.** Those records require atomic, current reads and a single authoritative transaction database; stale reads from a content replica would be unsafe. Project 5 is not a replacement Authentication project.

## Backfill and enable order

1. Configure the Project 2, 3, 4 and 5 backend service-account connections, confirm the exact project IDs and permissions, and keep all read-failover flags off.
2. Enable `SMV_FIRESTORE_MULTI_PROJECT_ENABLED`, `SMV_WALLET_DOMAIN_ENABLED` (for Project 5 access), `SMV_P23_PAIRED_REPLICA_MIRROR_WRITES`, the existing history/live/content mirror flags, and `SMV_P45_PAIRED_CONTENT_MIRROR_WRITES` only after the project IDs and permissions are verified.
3. Run `scripts/backfill-multi-project-firestore.js` in dry-run mode, review counts, and apply only after its documented preconditions are met. It now copies the read-safe pair collections and Live Session archive children to both Project 2 and Project 3.
4. Run `scripts/backfill-p45-public-content.js` in dry-run mode, review counts, then apply.
5. Run `node scripts/validate-paired-firestore-replicas.js`. It is read-only. It must output `"ok": true` with no missing, extra or mismatched documents.
6. After reviewing the report and verifying continuous mirrors are running, set the existing per-domain backfill flags:
   - `SMV_CUSTOMER_HISTORY_BACKFILL_COMPLETE=true`
   - `SMV_SESSION_HISTORY_BACKFILL_COMPLETE=true`
   - `SMV_LIVE_DATA_BACKFILL_COMPLETE=true`
   - `SMV_DASHBOARD_READ_REPLICA_BACKFILL_COMPLETE=true`
   - `SMV_CONTENT_BACKFILL_COMPLETE=true`
7. Only then set `SMV_P23_READ_FAILOVER_COMPLETE=true` and/or `SMV_P45_READ_FAILOVER_COMPLETE=true`. Application startup fails fast if a read gate is enabled without its prerequisites.

All flags remain off by default in this source change. No Firebase data, rules, secrets, Render environment variables or production deployments are changed by this PR. Oracle migration is a separate later phase and is not part of this Firebase PR.
