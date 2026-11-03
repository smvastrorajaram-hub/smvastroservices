import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const nativeConfig = JSON.parse(fs.readFileSync(path.join(root, 'wrangler.native-probe.jsonc'), 'utf8'));
const expressConfig = JSON.parse(fs.readFileSync(path.join(root, 'wrangler.express-probe.jsonc'), 'utf8'));
const nativeSource = fs.readFileSync(path.join(root, 'src/runtime-probes/native.mjs'), 'utf8');
const expressSource = fs.readFileSync(path.join(root, 'src/runtime-probes/express-http.mjs'), 'utf8');

test('Native runtime probe has no application bindings or Production data access', () => {
  assert.equal(nativeConfig.name, 'smvastroservices-native-probe');
  assert.equal(nativeConfig.workers_dev, true);
  assert.equal(nativeConfig.preview_urls, false);
  assert.equal(nativeConfig.d1_databases, undefined);
  assert.equal(nativeConfig.durable_objects, undefined);
  assert.match(nativeSource, /probe:\s*'native-worker-runtime'/);
  assert.match(nativeSource, /status:\s*200/);
});

test('Express probe reproduces the same Cloudflare Node HTTP bridge pattern in isolation', () => {
  assert.equal(expressConfig.name, 'smvastroservices-http-probe');
  assert.ok(expressConfig.compatibility_flags.includes('nodejs_compat'));
  assert.equal(expressConfig.d1_databases, undefined);
  assert.equal(expressConfig.durable_objects, undefined);
  assert.match(expressSource, /import express from 'express'/);
  assert.match(expressSource, /import \{ httpServerHandler \} from 'cloudflare:node'/);
  assert.match(expressSource, /app\.listen\(3001\)/);
  assert.match(expressSource, /httpServerHandler\(\{ port: 3001 \}\)/);
  assert.match(expressSource, /probe:\s*'express-http-server-runtime'/);
});
