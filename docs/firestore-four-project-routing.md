# Four-Project Firestore Read Distribution — Safe Rollout Plan

## Scope of this PR

This PR prevents overlapping Live Call / Live Chat recovery reads and records the routing design. It does **not** enable secondary-project routing, copy data, change Firestore Rules, or change production Firebase configuration. Existing reads and writes remain on the current primary project.

## Proposed ownership map

| Project | Intended data domain | Safety boundary |
|---|---|---|
| Project 1 — current Auth / primary | Firebase Authentication verification, user roles/profiles, Wallet balances/reservations, payment and earning ledgers, withdrawals, and any operation that must be atomic with billing | Keep financial records and the source-of-truth for wallet/session billing together until a separately tested cross-project coordinator exists. |
| Project 2 | Customer consultation/question history and related non-financial history | Route only after a backfill/verification plan and every read/write path is mapped. The current dashboard no longer loads retired question/private-consultation histories as part of its normal render. |
| Project 3 | Live Call / Chat messages and WebRTC signals; session metadata only after lifecycle/billing consistency is proven | A Firestore transaction cannot atomically update documents in different projects. Do not split wallet reservation, charge, refund, commission, or session state transitions across projects without idempotent orchestration and reconciliation. |
| Project 4 | High-read, public/cacheable content and explicitly approved public read models | Do not move private astrologer profile fields into a public data store. Publish an allow-listed projection, not the source profile document. |

The project labels above are logical roles. Real project IDs and service accounts must be supplied through protected runtime configuration; no IDs or credentials are embedded in source.

## Required routing and security design

1. Keep Firebase Auth token verification anchored to the existing Auth project. Each secondary Firestore client must explicitly target its project and use a service account granted least-privilege IAM access in that project. Do not treat a project ID by itself as authorization.
2. Route by data ownership, not by retrying a failed read against every project. A quota error must not produce an empty or different account view, and the same record must not be independently writable in multiple projects.
3. Keep Wallet balance, reservations, payment ledger, earning ledger and withdrawals under one authoritative financial consistency boundary. Cross-project Firestore transactions are not atomic. Any later split must use durable idempotency keys, a transactional outbox/coordinator, retry-safe transitions, and reconciliation for partial failure.
4. Before turning on any secondary route, define the canonical collection/document owner; migrate or backfill only with explicit approval; compare document counts and financial totals; configure required indexes; apply and test per-project security rules; and pass authenticated staging tests for customer, astrologer and admin roles.
5. The production rollout must be opt-in until those gates pass. This PR does not move or delete existing documents and does not change any production environment variables.

## Read-load protection included here

- Live Session Server-Sent Events remain the primary update transport.
- Recovery polling remains only for stream failure and keeps its current low-frequency schedule.
- Chat message and call-signal polling now allow at most one in-flight request per session ID. A slow request can no longer cause the interval to stack duplicate requests with the same `afterMs` cursor.
- Responses from an old session panel are ignored so they cannot update a newly opened session.
- Customer Wallet balance is fetched independently before its recent-transaction history; history failure leaves the balance visible and reports that only transaction history is unavailable.
