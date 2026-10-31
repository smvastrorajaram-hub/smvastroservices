# SMV ASTRO Production Firestore Wallet Read-Only Inventory

This stage is an inventory only. It does not backfill historical documents, write to D1, modify Firestore, change DNS/Render, or perform a production cutover.

## Required GitHub Environment

Environment name: `firestore-wallet-readonly`

Environment variable:
- `SMV_FIRESTORE_SOURCE_PROJECT_ID`: the exact Production Firestore project ID.

Environment secret:
- `SMV_FIRESTORE_SOURCE_READONLY_CREDENTIALS`: the complete JSON key for the read-only service account.

The service account should have only `roles/datastore.viewer` on the intended Production project. Confirm that it has no inherited or additional write-capable role. Do not add the JSON key to repository files, workflow YAML, logs, artifacts, or chat.

## What the workflow reads

The workflow uses Google's OAuth service-account flow and Firestore's server-side `runAggregationQuery` count operation for the legacy Wallet collection registry. It also reads only the existence and update timestamp of `smv_settings/liveSessionPricing` and `smv_settings/commission`. For three allowlisted collections (`smv_wallet_recharges`, `razorpay_orders`, and `smv_offer_audit`), it issues field-projected metadata queries using fixed field allowlists. These projected values are used only in process memory to compute age buckets, order-registry linkage/status counters, and audit-field-presence counts; they are never written to logs or artifacts. Document IDs, customer identity fields, raw recharge/order IDs, payment IDs and settings values are not included in the report.

The report includes collection counts, filtered counts for Wallet offers/audit, scheduled Call/Chat appointments, live-session earnings and Wallet recharge Razorpay orders, plus status-only diagnostics for non-terminal Wallet recharges and refund-candidate collections. It compares the legacy offer-audit service filter with the known Wallet offer type without reading individual documents. It evaluates the existing historical-backfill quiescence blockers: active/connecting sessions, pending bookings, reserved bookings, and non-terminal Wallet recharges.

The `messages` and `signals` counts are database-wide collection-group counts. They are labelled that way intentionally; the count query alone does not assert every matching subcollection is under `smv_live_sessions`.

## Output

The successful run uploads `firestore-wallet-source-inventory.json` as a GitHub Actions artifact with 14-day retention. The artifact contains aggregate counts, status/age buckets, field-presence counts, and settings-document timestamps only. Per-document values are not included. Inventory reads are not a transactionally consistent snapshot; the report marks this for projected recharge diagnostics. It does not include document IDs, wallet balances, customer payloads, service-account credentials, or access tokens.

A quiescence result of `false` is a stop condition for a later historical snapshot/backfill step. It is not an authorization or signal to cut over. That later step requires separate review and must remain resumable, hash-checked, idempotent, and read-only on the Production Firestore source.

The latest verified inventory run found 8 non-terminal recharges, all `order_created`, 1–7 days old, each with a recorded order ID, no recorded payment ID, and a matching `razorpay_orders` registry document. The internal order registry listed six as `created` and two as `failed`. These statuses are only Firestore registry metadata; no live Razorpay API was called, and the records must not be edited or treated as terminal based on this inventory. The historical snapshot gate therefore remains closed.

The same run found two `smv_offer_audit` documents with a `service` field but no `offerType` field; neither matched the Wallet-specific `service` nor `offerType` filters. Their service values are intentionally not exported. They remain an audit-schema review item rather than being assumed to be Wallet recharge audit records.

## Trigger and scope

The workflow is scoped to the dedicated `feature/firestore-wallet-readonly-inventory-20261031` branch. It does not run on pull-request events, and this inventory job performs no D1 or Firestore writes.
