import test from 'node:test';
import assert from 'node:assert/strict';
import { registerRootRuntimeRoute } from '../src/root-runtime-route.mjs';

test('GET / returns a clear API runtime response instead of the fail-closed legacy 503', async () => {
  const handlers = new Map();
  const app = { get(path, handler) { handlers.set('GET ' + path, handler); } };
  const response = {
    statusCode: 200, headers: {}, body: null,
    status(code) { this.statusCode = code; return this; },
    set(name, value) { this.headers[name] = value; return this; },
    json(body) { this.body = body; return this; }
  };

  registerRootRuntimeRoute({ app, env: { SMV_ENVIRONMENT: 'staging' } });
  const handler = handlers.get('GET /');
  assert.equal(typeof handler, 'function');
  await handler({}, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers['Cache-Control'], 'no-store');
  assert.equal(response.body.ok, true);
  assert.equal(response.body.service, 'smvastro-backend-api');
  assert.equal(response.body.runtime, 'cloudflare-workers-express-http-bridge');
  assert.equal(response.body.environment, 'staging');
  assert.equal(response.body.readiness, '/api/backend/readiness');
});
