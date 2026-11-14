# SMV ASTRO — 5,000 Daily Customers / D1 5M Quota Root-Cause Audit

**Audit date:** 14 November 2026  
**Audited source:** `smvastrorajaram-hub/smvastroservices`  
**Main baseline:** `4254de3b5a0cefce1334b551088af899840bf955` (after PR #495; includes PRs #491 and #494)  
**Status:** Documentation-only audit. No runtime source, configuration, secrets, production data, database migrations, or deployments are changed by this document.

## 1. Objective and conclusion

The objective is to establish a measurable path to **5,000 distinct customers per day while remaining inside the Cloudflare D1 Workers Free daily quota**. This audit does not claim the target is already proven.

The current source includes the D1 read-amplification fixes from PRs #473/#474 and the Live Chat polling reduction from PR #494. Remaining priorities are:

1. Read actual Production D1 Rows Read / Rows Written and Query Insights using Cloudflare Account Analytics Read permission; do not substitute historic query snapshots for current use.
2. Align the Live route/health readiness contract with the six 0014 indexes that the current SQL forces. All six indexes have already been confirmed in Production; no migration is needed.
3. Keep Firebase Project 1 registration/identity separate. A Firestore phone-registry miss can still fall back to a full `smv_users` scan, which is a distinct Firebase read-scaling risk, not D1 usage.
4. Measure the large SMV ASTRO UI bundle and stylesheet separately. These affect loading and browser responsiveness, not D1 rows-read directly.

**Important distinction:** 5,000 customers/day is not the same as 5,000 simultaneous users. A daily active-user target, peak concurrent sessions, and peak Live Chat/Call concurrency need separate workload tests.

## 2. What the 5M quota actually means

Cloudflare's current D1 pricing documentation (last updated 30 October 2026) lists the Workers Free allowances as:

| Metric | Workers Free daily allowance |
|---|---:|
| Rows read | 5,000,000 |
| Rows written | 100,000 |
| Storage | 5 GB total across the account |

Rows read means rows scanned by a query, not just rows returned to the Worker. An unindexed filter can return one row while scanning many. Indexes can reduce rows read, but writes to indexed columns also incur index-row writes. Free daily limits reset at 00:00 UTC.

Cloudflare's D1 Limits documentation also lists **50 D1 query subrequests per Worker invocation on Workers Free** (1,000 on Paid). A `db.batch()` counts as one query against this per-invocation limit, rather than one per statement. Each D1 database is single-threaded; query duration, per-request overhead, and queue depth affect throughput. A full queue can return an overloaded error.

Official references:
- [D1 pricing, rows read/written and usage tracking](https://developers.cloudflare.com/d1/platform/pricing/)
- [D1 limits, subrequests and single-threaded throughput](https://developers.cloudflare.com/d1/platform/limits/)
- [Free-tier daily limit enforcement (effective 1 September 2026)](https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/)

### 5,000-customer arithmetic

The raw upper bound, before reserving any capacity for non-customer traffic, is:

- 5,000,000 reads ÷ 5,000 customers = **1,000 rows read per customer/day**.
- 100,000 writes ÷ 5,000 customers = **20 rows written per customer/day**.

That is not a safe operating target because Admin activity, Astrologer activity, background jobs, webhooks, public endpoints and other services share the account allowance.

A provisional operating budget with 30% headroom is:

| Budget | Account target/day | Average for 5,000 customers |
|---|---:|---:|
| D1 rows read | ≤ 3,500,000 | ≤ 700/customer |
| D1 rows written | ≤ 70,000 | ≤ 14/customer |

These are planning ceilings, not observed usage. If other account workloads consume part of the budget, the SMV ASTRO allocation must be lower. The 50-subrequest invocation limit is a separate per-request constraint and cannot be averaged across customers.

## 3. Historical D1 read-amplification root cause — fixes already merged

### PR #473 — Optimize D1 read architecture for 5,000 daily Customers

PR #473 documented a historical Production Query Insights snapshot:

- `REQUIRED_SCHEMA_QUERY`: 3.68M rows read across 1,740 executions.
- `BONUS_CREDIT_SCHEMA_QUERY`: 1.96M rows read across 1,524 executions.
- Combined: 5.64M rows read in that snapshot.

These figures are aggregate totals across repeated executions, not one query execution each and not customer counts.

The recorded root cause was that PR #352 introduced `inspectBackendSchema()` without caching between requests, and PR #455 added a separate Bonus Credit schema probe. Both probes repeatedly inspected SQLite schema metadata.

PR #473 added a 30-second Worker-isolate schema cache with in-flight request coalescing; a participant-scoped `GET /live/sessions/status` query limited to active/recent sessions; participant/time-oriented Live Session indexes; and related regression coverage. The PR explicitly did **not** claim a completed 5,000-customer load test.

### PR #474 — Reduce D1 schema readiness Rows Read amplification

PR #474 further consolidated schema object checks, schema-version reads and Bonus Credit table-column checks into fewer materialized metadata scans/aggregations. Its PR description recorded a subsequent Query Insights snapshot in which the repeated readiness probes accounted for approximately 3.96M rows read.

**Current evidence gap:** this audit did not access the Cloudflare account's live D1 Query Insights / Row Metrics. Therefore it cannot confirm the actual post-#474/#494 daily row-read total or claim that the historic 5.64M/3.96M costs are now reduced to a particular number. A before/after Query Insights comparison is still required.


### Production read-only verification — 14 November 2026

The Production Worker endpoints were queried directly (read-only):

- `GET https://smvastroservices.astroservices.workers.dev/healthz`
- `GET https://smvastroservices.astroservices.workers.dev/api/backend/migration-status`

Observed at approximately 04:49:54–04:49:55 UTC:

- `environment=production`, D1 binding present, schema ready, and Firebase connectivity true.
- Migration markers `0002` through `0014` were all reported true.
- `0014_live_session_query_indexes` was true and the six Live query indexes were ready.
- Live/Wallet/Recharge routes and Production financial readiness were reported ready.
- The global `productionTrafficEnabled=false` remained unchanged.

**Result:** Production already has all six 0014 indexes. No Production D1 migration, index creation, or row write was needed or performed for this work.

The Production main Pages deployment for PR #494 subsequently passed (GitHub run `43559595015`); the two satellite PWA deployments also passed (Horoscope `43559633769`, Calendar `43559635904`). The deployed `.in` main script and all three Service Workers returned the new synchronized cache markers.

**Rows Read / Rows Written are still unverified.** The Production-only metrics workflow from PR #495 ran as GitHub Actions run `43560299555`, but the Cloudflare GraphQL Analytics API returned `not authorized for that account`. The workflow stopped before any metrics were returned; its optional `wrangler d1 insights` step was skipped. No D1 query, SQL read, migration or write was performed by this failed metrics run.

Cloudflare documents that D1 account analytics comes from the GraphQL Analytics API and that `wrangler d1 insights` requires an API token with **Account Analytics Read** permission. A separate follow-up PR #496 uses a dedicated `CLOUDFLARE_D1_ANALYTICS_READ_TOKEN` secret so the existing `CLOUDFLARE_D1_API_TOKEN` remains unchanged. This report must stay marked unverified until a token scoped to the correct Cloudflare account with Account Analytics Read is added to the GitHub `production` environment and the report completes.

References: [Cloudflare D1 Metrics and Analytics](https://developers.cloudflare.com/d1/observability/metrics-analytics/) and [Find slow and expensive queries](https://developers.cloudflare.com/d1/observability/find-expensive-queries/).

## 4. Current source findings

### P1 — Active Live Chat polling reduced by PR #494 (merged and deployed)

**Source paths:**
- `public/smvastro.mjs`: `smvLiveStartChatRecovery()`, `smvLivePollMessages()`, `smvLiveApplySession()`
- `cloudflare/backend-api/src/live-session-routes.mjs`: `GET /live/sessions/:id/messages`
- `shared/backend-platform/d1-live-session-service.mjs`: `listMessages()` and `getSession()`

Before PR #494, the client made a cursor-based message recovery call every 1,500 ms for each active Chat panel even while the existing SSE stream was healthy. The D1 `listMessages()` path reads the session and then the bounded message list, so each recovery HTTP request normally issued at least two D1 statements.

PR #494 changed the healthy-SSE safety reconciliation to 15,000 ms and checks `smvLiveEventStreamConnected` before issuing that poll. SSE continues to deliver new messages immediately. If SSE disconnects, the pre-existing faster fallback poller remains active; it was not removed or slowed.

**Expected request-count change while SSE is healthy (not a measured rows-read saving):**
- Before: 40 recovery polls/minute/client.
- After: 4 recovery polls/minute/client.
- For both Customer and Astrologer panels: 80 → 8 recovery HTTP requests/minute/session.
- At two D1 statements per request, the illustrative ceiling changes from about 9,600 to 960 statement executions per fully observed two-sided active Chat hour.

Actual rows read depend on the index/query plan and the number of message rows scanned. This 90% reduction applies only to the redundant cursor-reconciliation polling while SSE is healthy; it is not a 90% reduction in all D1 usage.

PR #494's 16 GitHub Actions checks passed. The Production GitHub Pages deployment and the independent Horoscope and Calendar PWA deployments all passed. No Worker/D1 code, migration, financial write, or traffic gate was changed by this UI transport optimization.

### P1 — 0014 query-index readiness does not consistently match SQL's forced-index dependency

**Source paths:**
- `cloudflare/backend-api/src/live-session-routes.mjs`: `assertReady()` and `GET /live/sessions/status`
- `cloudflare/backend-api/src/index.mjs`: `checkLiveSessionSchemaReady()`, `/healthz`, and `/api/backend/migration-status`
- `shared/backend-platform/d1-live-session-service.mjs`: `listSessions()`, `listSessionStatus()`, and `listEndedSessionsForAppointments()`
- `cloudflare/backend-api/migrations/0014_live_session_query_indexes.sql`
- `cloudflare/backend-api/test/backend-readiness.test.mjs`

The D1 service uses explicit SQLite `INDEXED BY` clauses for the six 0014 Live query indexes. SQLite requires a named index referenced by `INDEXED BY` to exist when the query is prepared/executed.

However:
- `checkLiveSessionSchemaReady()`, which is passed into the Live route `isReady` gate, checks the core Live Session and Wallet security schema but does not include `liveSessionQueryIndexes`.
- The `/healthz` Live route readiness calculation also checks the core schema/security markers without the 0014 index marker.
- `/api/backend/migration-status` does include `schema.checks.liveSessionQueryIndexes` in its Live route readiness value.
- The readiness test explicitly allows core readiness and `liveCallChatRoutesEnabled=true` while 0014 is absent, whereas the current query implementation uses `INDEXED BY` for indexes created by 0014.

This is a source-level readiness-contract mismatch. **It does not prove that Production is missing 0014**; this audit did not inspect the remote Production schema. But if one of those forced indexes is absent, the corresponding query cannot use its current SQL plan and can fail despite a readiness response suggesting the Live routes are enabled.

**Required verification before load testing:** read-only confirm that every 0014 index exists in the intended D1 database; align the runtime gate and health/readiness contracts with the actual SQL dependency, or provide and test a safe fallback query plan. Do not apply a Production migration as part of this audit.

### P1 — Phone registry miss can scan the full Firebase Project 1 user collection

**Source:** `server.js`, `findExistingPhoneOwners()`, called from Customer and Astrologer registration paths.

The current function checks `smv_phone_registry/{phoneHash}` first. If that document is absent, it reads the full `smv_users` collection with only three fields selected and scans those documents in application code to prevent a previously used phone number from being claimed.

That fallback is an O(number of existing users) Firestore read on every registry miss. If the phone registry is incomplete for legacy users, new registrations can repeatedly incur a full user scan. This is a **Firebase Project 1 read/latency risk, not a Cloudflare D1 row-read charge**.

**Safety boundary:** do not remove the fallback or switch Login/Register/identity reads in this capacity work. A separate identity-scoped proposal must first prove complete phone-registry parity from read-only Production evidence. No registration or identity source change is included here. Only then can a separate identity-scoped proposal evaluate a safe replacement. This audit makes no identity, profile, registration or Firebase data change.

### P2 — SMV ASTRO browser source remains large and costly to maintain

Current main source sizes (raw repository bytes, not compressed transfer sizes):

| File | Raw bytes | Source-level observation |
|---|---:|---|
| `public/smvastro.mjs` | 449,584 | Main auth/dashboard/live UI module |
| `public/index.html` | 95,647 | Main page shell |
| `public/smvastro.css` | 607,721 | 3,817 rule blocks; 7,313 `!important` declarations |
| `public/smv-ui.css` | 35,345 | 430 `!important` declarations |
| `public/dashboard-typography.css` | 22,520 | 286 `!important` declarations |

These numbers are raw source measurements only. They do not establish gzip size, LCP, interaction delay, CSS parse time, or a specific performance regression. The CSS count indicates cascade/override maintenance debt; it is not itself evidence that every `!important` is removable.

The existing #226 source audit already recommended narrow CSS consolidation and feature-level module loading. The next optimization work should use captured mobile/desktop baselines and scoped changes. Do not add another global override layer or use broad `!important` patches. Do not change Horoscope/Calendar calculations or saved reports as part of SMV ASTRO UI optimization.

## 5. Work already present and should not be duplicated

- **PR #174:** SSE-first Live transport and reduced redundant polling were previously implemented. The remaining 1.5-second active-Chat cursor poll described above is a specific residual, not a reason to reimplement the whole SSE system.
- **PR #226:** broad source-level report-only audit already covered request body limits, CORS, storage/Service Worker safety, Horoscope lazy loading, Calendar build scope, CSS cascade and browser baselines.
- **PR #473:** D1 readiness caching/single-flight, bounded status route and Live indexes.
- **PR #474:** consolidation of D1 schema metadata scans.
- **PR #491:** booked session settlement, Android receipt margins and numeric Session IDs.
- **PR #494:** reduced healthy-SSE Live Chat recovery polling to 15 seconds, synchronized all three PWA cache releases, and deployed the main site plus both satellite PWAs.
- **PR #495:** added a Production-only, read-only D1 Analytics workflow; its first run was blocked by missing account-level Analytics authorization.
- **PR #496:** follow-up to use a dedicated `CLOUDFLARE_D1_ANALYTICS_READ_TOKEN`; awaiting the operator-created Production environment secret.

The old branch `perf/d1-read-architecture-5000-customers-20261112` is not reused. This follow-up audit starts from current main to avoid pulling in a branch that has diverged from main.

## 6. Required validation plan for a 5,000/day readiness claim

A credible capacity statement requires a representative test mix and measured query accounting. A unit test or a successful APK build is not a load test.

### Production-only validation — passive real traffic

Do not direct synthetic high-volume traffic at the live Production site or Production D1. Do not run a 500 → 1,000 → 2,500 → 5,000-user stress ramp against customers' live service. This capacity check uses real Production customer activity and read-only account metrics only.

For each daily observation window, correlate:
- Actual distinct daily Customer activity from the approved aggregate business analytics source (counts only; no customer identities or profile values).
- Production D1 account-wide Rows Read / Rows Written, Query Insights by normalized SQL statement, and Workers request/CPU/error/overload metrics.
- Active Live session count, concurrent Chat/Call count and message volume from aggregate operational metrics.
- Admin, Astrologer, background and webhook traffic so those reads/writes are not incorrectly attributed to Customers.
- API p50/p95/p99 latency, error rate and quota headroom over the same window.
- Browser mobile LCP/INP/CLS and JS/CSS transferred bytes separately from database metrics.

Collect the same read-only metrics over consecutive ordinary Production days, including the busiest observed day. No wallet/payment transactions, booking/session mutations, customer test accounts, D1 migrations or database writes are part of this measurement. Never log auth tokens, UIDs, private birth details, message bodies, bank data or payment secrets.

Until Production genuinely receives 5,000 distinct Customers/day, a projection from observed per-customer rates is only an estimate. It must not be described as a completed 5,000-customer load test. When real Production traffic reaches that level, the same metrics provide the direct capacity evidence.

### Metrics required

For each D1 statement and API route, record:
- `meta.rows_read`, `meta.rows_written` and query duration.
- D1 statements/subrequests per Worker invocation, including `db.batch()` usage.
- API p50/p95/p99 latency, error rate, Worker CPU and overload/queue failures.
- D1 account-wide daily Row Metrics and Query Insights by normalized SQL statement.
- Firebase Project 1 reads/writes separately from D1 counts.
- Active Live session count, simultaneous Chat/Call count and message volume.
- Browser mobile LCP/INP/CLS and JS/CSS transferred bytes separately from database metrics.

### Pass criteria

- Scaled 5,000-customer journey remains within the provisional **3.5M D1 rows-read / 70K rows-written per day** operating budget after including system, Admin and Astrologer traffic.
- Per-invocation D1 query subrequests remain below the applicable platform limit (50 for Workers Free); target a buffer rather than testing exactly at the ceiling.
- No missing 0014 forced index; no `no such index`, D1 overloaded, daily quota exceeded, or route-readiness false-positive.
- No regression in Live message delivery, session acceptance/end/receipt, Wallet accounting, idempotency or payment flows.
- Firestore Project 1 usage is measured separately; the D1 5M budget does not absorb Firebase reads.
- Existing app data, user sessions, saved reports and offline location caches remain intact.

Production capacity is judged from passive real-traffic observations, not an artificial load spike. After each separately approved Production deployment, compare the same Query Insights / Row Metrics and peak concurrency to the prior Production baseline before increasing the customer-growth target.

## 7. Prioritized implementation sequence

| Priority | Separate scoped task | Gate |
|---|---|---|
| P0 | Align route/health/readiness gate with forced-index SQL | Production index presence is already confirmed; source gate + local D1 unit fixtures for present/missing-index behavior |
| P1 | Measure the Production Row Read / Row Written effect of PR #494 after deployment | Cloudflare D1 Analytics Read permission; compare the same 1-day and 7-day Query Insights windows before/after; no synthetic Production stress traffic |
| P1 (separate domain) | Reconcile Project 1 phone registry before changing the full-scan fallback | Read-only Production aggregate completeness evidence and a separately reviewed identity proposal; no identity cutover in this D1 work |
| P2 | Measure then split main SMV ASTRO modules and consolidate CSS in small batches | Real browser baselines, mobile/desktop screenshots, existing dashboard/live/print regressions |

## 8. Explicit non-goals and safety

This audit makes no changes to:
- Firebase Project 1 Login/Register/email verification/identity/profile/roles.
- Wallet, Recharge, Razorpay, refunds, commission, ledger or payout logic.
- Production D1 rows, migrations, indexes or schema.
- Cloudflare Worker/Pages, Render, secrets, environment variables, routing flags or DNS.
- Horoscope or Calendar calculations, report contents, offline calculation assets or saved user data.
- Any APK signing/build/release configuration.

Any code change should be a separate focused PR with tests and before/after evidence. No production migration/deployment, traffic cutover or PR merge is authorized by this audit.
