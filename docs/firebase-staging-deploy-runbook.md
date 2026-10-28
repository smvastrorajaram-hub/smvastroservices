# Manual Firebase staging deployment runbook

## Purpose and trigger

`.github/workflows/firebase-staging-deploy-manual.yml` is intentionally available only through GitHub Actions' **Run workflow** button (`workflow_dispatch`). It is not a production deployment workflow. The dispatch input must exactly match the protected `FIREBASE_STAGING_REPLICA_PROJECT_ID` variable in the `firebase-staging` GitHub Environment, and a separate checkbox explicitly confirms staging-only deployment.

The source Firebase project is fixed in code to `smv-astro-staging`. The workflow rejects the known production project IDs `smv-astro`, `astro-service-ae9e7`, `smv-astro-services`, `svm-astro`, and `smvastro-services`.

## One-time GitHub Environment setup

Before manually running it, a repository administrator must create the GitHub Environment named `firebase-staging` and configure **required reviewers / protection rules**. Do not rely on the workflow name alone to supply approvals.

Create the following environment variable:

- `FIREBASE_STAGING_REPLICA_PROJECT_ID`: exact ID of the separately provisioned, isolated secondary staging project. It must be different from `smv-astro-staging` and must not be a production-named project listed above.

Create these environment secrets:

- `FIREBASE_STAGING_SOURCE_SERVICE_ACCOUNT_JSON`: JSON key for a dedicated service account with deployment rights only to `smv-astro-staging`, and permission to check the names of the two required Secret Manager entries.
- `FIREBASE_STAGING_REPLICA_SERVICE_ACCOUNT_JSON`: JSON key for a dedicated service account limited to deploying Firestore rules and indexes to the staging replica project.

Never commit these JSON values or post them in chat. Use separate accounts so the replica rules job does not reuse the source project's credentials.

## Source-project prerequisites

Provision these Secret Manager secrets in `smv-astro-staging` separately, with values for the selected **staging replica** service account only:

- `SMV_REPLICA_TARGET_CLIENT_EMAIL`
- `SMV_REPLICA_TARGET_PRIVATE_KEY`

The workflow checks only that the secret names exist; it never reads or prints their values. The Firebase Functions deploy will fail safely if the secret configuration or required permissions are missing. The source project's deployed functions will be explicitly configured with `SMV_DASHBOARD_READ_REPLICA_MIRROR_WRITES=false`.

The Firebase CLI is pinned to `firebase-tools@15.34.1`. Node.js 22 is used on the GitHub runner.

## What a manual run deploys

1. Deploys `firestore.multi-project.rules` (deny-all client reads and writes) plus `firestore.indexes.json` to the exact staging replica project using `firebase.secondary-replica.json`.
2. Only after that job succeeds, deploys Cloud Functions plus `firestore.rules` and `firestore.indexes.json` to the fixed source project `smv-astro-staging` using `firebase.json`.
3. Creates a temporary `functions/.env.smv-astro-staging` with exact staging source/target IDs and mirror writes set to false; cleans it up on success or failure.

The workflow is manual and staging-only. It does **not** copy data, run any backfill, run reconciliation, enable mirror writes, or change any replica read-complete or Wallet cutover/read switch.

## Separate operator work still outstanding

A successful Firebase deployment does not prove data was copied or that the replica matches its source. After staging deployment, separately inspect Functions/logs and run the documented staging-only backfill and read-only reconciliation procedures, with a reviewed report. Do not use production IDs or production service accounts for staging validation. Keep all read flags disabled until an approved rollout plan and clean reconciliation report exist. Project 5 Wallet cutover remains out of scope and unchanged.
