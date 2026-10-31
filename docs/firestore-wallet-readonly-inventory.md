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

The workflow uses Google's OAuth service-account flow and Firestore's server-side `runAggregationQuery` count operation for the legacy Wallet collection registry. It also reads only the existence and update timestamp of `smv_settings/liveSessionPricing` and `smv_settings/commission`. Settings field values are not retained or logged.

The report includes collection counts, filtered counts for Wallet offers/audit, scheduled Call/Chat appointments, live-session earnings and Wallet recharge Razorpay orders, plus candidate source collection counts for the legacy refund review. It evaluates the existing historical-backfill quiescence blockers: active/connecting sessions, pending bookings, reserved bookings, and non-terminal Wallet recharges.

The `messages` and `signals` counts are database-wide collection-group counts. They are labelled that way intentionally; the count query alone does not assert every matching subcollection is under `smv_live_sessions`.

## Output

The successful run uploads `firestore-wallet-source-inventory.json` as a GitHub Actions artifact with 14-day retention. It contains counts and settings-document timestamps only. It does not include document IDs, wallet balances, customer payloads, service-account credentials, or access tokens.

A quiescence result of `false` is a stop condition for a later historical snapshot/backfill step. It is not an authorization or signal to cut over. That later step requires separate review and must remain resumable, hash-checked, idempotent, and read-only on the Production Firestore source.

## Trigger and scope

The workflow is scoped to the dedicated `feature/firestore-wallet-readonly-inventory-20261031` branch. It does not run on pull-request events, and this inventory job performs no D1 or Firestore writes.
