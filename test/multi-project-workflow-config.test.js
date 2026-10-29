'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const workflowPath = path.join(root, '.github/workflows/multi-project-read-replication.yml');
const workflow = fs.readFileSync(workflowPath, 'utf8');

test('multi-project replication workflow only syntax-checks scripts present in the repository', () => {
  const commands = [...workflow.matchAll(/node --check\s+([^\s\\]+)/g)].map(match => match[1]);
  assert.ok(commands.length >= 8, 'expected the workflow to check its main sources and tests');
  for (const relative of commands) {
    assert.ok(fs.existsSync(path.join(root, relative)), 'workflow references missing file: ' + relative);
  }
  assert.equal(workflow.includes('scripts/validate-multi-project-firestore.js'), false);
});

test('workflow still runs the replica sync and quota routing suites', () => {
  assert.match(workflow, /node --test test\/firestore-replica-sync\.test\.js test\/firestore-quota-routing\.test\.js/);
  assert.match(workflow, /npm install --prefix functions/);
});
