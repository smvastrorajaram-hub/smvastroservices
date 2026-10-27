# Project-wide quota-aware read routing — guarded rollout

## Current state

This source change adds a reusable quota-only read router and wires it into the read paths that already have a documented, domain-specific copy. It does not turn all five Firestore projects into interchangeable copies of the website database. Project IDs, service-account credentials, and quota are independent; a destination is eligible only when the exact required data is known to be present and sufficiently current.

All routing/backfill flags remain opt-in. This PR does not change Render environment variables, deploy Firestore rules, copy production data, enable cutovers, or modify Razorpay keys.

## Verified routing domains

| Domain | Verified secondary | Safe behavior when quota is exhausted |
| --- | --- | --- |
| Customer question/private-consultation history | Project 2 (astro-service-ae9e7) after the history backfill flag | The archive read can fall back to Project 1. If Project 1 quota blocks recent-delta reads, serve the known archive as partial data and flag the API response as partial instead of silently claiming it is complete. |
| Ended Live Session history | Project 2 (astro-service-ae9e7) after the session-history backfill flag | Project 2 archive read can fall back to the active authoritative session database. Active sessions and pending/unarchived records continue to use the authoritative database. |
| Live Chat messages and WebRTC signals | Project 3 (smv-astro-services) only for sessions with the existing liveAuxStoreReady marker and completed mirror backfill | Quota-only fallback may switch between Project 3's verified mirror and the active authoritative session database (Project 1 before Project 5 cutover, Project 5 after it). Project 3 quota marks that session's mirror not-ready so later reads stop repeatedly using the exhausted mirror. Incremental reads still prefer the authoritative source and use the mirror only on a quota failure. |
| Public content | Project 4 (svm-astro) after its content cutover flag | No cross-project fallback is enabled after Project 4 becomes authoritative because the existing code stops mirroring later Admin content changes back to Project 1. A stale copy must not be presented as complete content. |
| Wallet, ledger, booking, settlement, commission, earnings and payout data | Project 1, or Project 5 only after the guarded complete-domain cutover | No cross-project read or write fallback. The complete financial/session transaction must stay in one authoritative database. |
| User identity, roles, approvals, dashboards, other primary-only collections | Project 1 today | No replica fallback until a collection-specific copy, ongoing replication, reconciliation and freshness policy are implemented and tested. |

## Why a random project fallback is not safe

An empty collection or old copy on another project is not an authoritative result. Each fallback candidate must be listed by the calling feature and must contain the same queryable records. The router retries only explicit quota errors (RESOURCE_EXHAUSTED, code 8, or clear quota/rate-limit messages); permission-denied, missing-index, invalid-query and application errors are surfaced without rerouting. It performs reads only and cannot be used around Wallet/Payment writes.

## Remaining work for a genuinely site-wide pool

A complete five-project pool for every ordinary website read needs an inventory of every collection/subcollection queried by the dashboards and APIs, a source-of-truth decision per collection, backfill and continuous change replication for every selected replica, and a read-only reconciliation/freshness validator before enabling that collection's replica reads. Collections without such a validated copy must stay on their authoritative source. This PR is the safe foundation and fallback coverage for the existing copy domains, not a claim that every Project 1 read can now be served by Projects 2–5.

## Rollout

1. Keep SMV_FIRESTORE_MULTI_PROJECT_ENABLED, all BACKFILL_COMPLETE flags and Project 5 cutover flags off until staging checks are complete.
2. Verify the new service-account keys work against the expected project IDs without logging private key values.
3. Deploy each secondary project's deny-client-write rules and required indexes; verify index readiness.
4. Run scripts/backfill-multi-project-firestore.js in dry-run mode, review counts, then apply only under its documented copy procedure.
5. Reconcile copies and run authenticated browser tests for history, Live Chat, WebRTC, booking, Wallet, content publishing and dashboards.
6. Enable one read domain at a time, retaining a rollback procedure. Never enable Project 5 cutover based solely on credentials being present.
