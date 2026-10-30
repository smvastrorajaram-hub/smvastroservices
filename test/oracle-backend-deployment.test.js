'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('server exposes quota-free /healthz liveness route', () => {
  const source = read('server.js');
  assert.match(source, /app\.get\(['"]\/healthz['"]/);
  assert.match(source, /status:\s*'ok'/);
});

test('Docker runtime is non-root and binds the expected API port', () => {
  const dockerfile = read('ops/oracle/Dockerfile');
  const compose = read('ops/oracle/compose.yaml');
  assert.match(dockerfile, /USER node/);
  assert.match(dockerfile, /EXPOSE 10000/);
  assert.match(compose, /127\.0\.0\.1:10000:10000/);
  assert.doesNotMatch(compose, /0\.0\.0\.0:10000:10000/);
});

test('ARM64 PDF rendering uses a separate pinned-pack Chromium package', () => {
  const renderer = read('html-pdf-renderer.js');
  const pkg = JSON.parse(read('package.json'));
  assert.match(renderer, /process\.arch === 'arm64'/);
  assert.match(renderer, /CHROMIUM_PACK_URL/);
  assert.equal(pkg.dependencies['@sparticuz/chromium-min'], '153.0.0');
});

test('Docker context does not exclude Swiss Ephemeris or public location datasets', () => {
  const ignore = read('.dockerignore').split(/\r?\n/).map(s => s.trim());
  assert.ok(!ignore.some(line => line === 'ephe' || line === 'ephe/'));
  assert.ok(!ignore.some(line => line === 'public' || line === 'public/'));
  assert.ok(ignore.includes('ops/oracle/backend.env'));
});
