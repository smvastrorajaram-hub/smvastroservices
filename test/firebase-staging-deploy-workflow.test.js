'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/firebase-staging-deploy-manual.yml'), 'utf8');
const runbook = fs.readFileSync(path.join(root, 'docs/firebase-staging-deploy-runbook.md'), 'utf8');
const config = JSON.parse(fs.readFileSync(path.join(root, 'firebase.secondary-replica.json'), 'utf8'));

test('Firebase deployment workflow is manual-only', () => {
  const match = workflow.match(/^on:\n([\s\S]*?)(?=^permissions:|^concurrency:|^jobs:)/m);
  assert.ok(match, 'workflow must declare a trigger section');
  const triggers = match[1];
  assert.match(triggers, /^  workflow_dispatch:/m);
  assert.doesNotMatch(triggers, /^  (push|pull_request|pull_request_target|schedule|workflow_run|deployment):/m);
  assert.equal((triggers.match(/^  workflow_dispatch:/gm) || []).length, 1);
  assert.match(workflow, /environment:\n\s+name: firebase-staging/);
  assert.match(workflow, /confirm_staging_only/);
});

test('Deployment workflow fixes the source to staging and rejects production project IDs', () => {
  assert.match(workflow, /SOURCE_PROJECT_ID: smv-astro-staging/);
  for (const id of ['smv-astro', 'astro-service-ae9e7', 'smv-astro-services', 'svm-astro', 'smvastro-services']) {
    assert.ok(workflow.includes(id), 'missing denylist entry: ' + id);
  }
  assert.ok(workflow.includes('if [[ "$TARGET_REPLICA_PROJECT_ID" != "$EXPECTED_TARGET_REPLICA_PROJECT_ID" ]]'));
  assert.match(workflow, /FIREBASE_STAGING_REPLICA_PROJECT_ID/);
  assert.match(workflow, /FIREBASE_STAGING_SOURCE_SERVICE_ACCOUNT_JSON/);
  assert.match(workflow, /FIREBASE_STAGING_REPLICA_SERVICE_ACCOUNT_JSON/);
});

test('Deployment workflow uses separate staging configs and non-interactive Firebase CLI commands', () => {
  assert.match(workflow, /--config firebase\.secondary-replica\.json/);
  assert.match(workflow, /--config firebase\.json/);
  assert.match(workflow, /--only firestore:rules,firestore:indexes/);
  assert.match(workflow, /--only functions,firestore:rules,firestore:indexes/);
  assert.match(workflow, /--non-interactive/);
  assert.match(workflow, /firebase-tools@15\.34\.1/);
  assert.equal(config.firestore.rules, 'firestore.multi-project.rules');
  assert.equal(config.firestore.indexes, 'firestore.indexes.json');
});

test('Deployment workflow remains data-copy and cutover free with mirror writes disabled', () => {
  assert.match(workflow, /SMV_DASHBOARD_READ_REPLICA_MIRROR_WRITES=false/);
  assert.match(workflow, /does not copy data|No backfill, reconciliation/i);
  assert.doesNotMatch(workflow, /scripts\/backfill-multi-project-firestore\.js|scripts\/backfill-wallet-domain\.js|scripts\/validate-wallet-domain\.js|SMV_WALLET_DOMAIN_CUTOVER_COMPLETE=true|SMV_DASHBOARD_READ_REPLICA_BACKFILL_COMPLETE=true|--apply/);
  assert.match(runbook, /does \*\*not\*\* copy data, run any backfill, run reconciliation, enable mirror writes/);
  assert.match(runbook, /Project 5 Wallet cutover remains out of scope and unchanged/);
});

test('Replica configuration deploys deny-all client rules', () => {
  const rules = fs.readFileSync(path.join(root, 'firestore.multi-project.rules'), 'utf8');
  assert.match(rules, /allow read, write: if false/);
});
