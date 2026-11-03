import test from 'node:test';
import assert from 'node:assert/strict';
import { registerIdentityProfileBackfillRoutes } from '../src/identity-profile-backfill-routes.mjs';

function setup(reconciliation, { previewOnly = true } = {}) {
  const routes = { get: new Map(), post: new Map() };
  const app = {
    get(path, handler) { routes.get.set(path, handler); },
    post(path, handler) { routes.post.set(path, handler); }
  };
  const identityService = {
    async authenticateAuthorization(header) {
      assert.equal(header, 'Bearer staging-admin-token');
      return { uid: 'staging-admin', role: 'admin', isAdmin: true };
    }
  };
  const backfillService = {
    async previewPage() { return { sourceDocuments: 1, personalDataReturned: false }; },
    async applyPage() { return { importedDocuments: 1, personalDataReturned: false }; },
    async reconcilePage() { return reconciliation; },
    async status() { return { sourceCollections: [], cutoverSafe: false }; }
  };
  registerIdentityProfileBackfillRoutes({
    app,
    identityService,
    backfillService,
    toolsEnabled: true,
    previewOnly,
    environment: 'staging',
    sourceProjectId: 'smv-astro-staging',
    cutoverComplete: false,
    isReady: async () => true
  });
  return routes;
}

async function invoke(handler, body = {}) {
  const response = {
    statusCode: 200,
    headers: {},
    payload: null,
    status(code) { this.statusCode = code; return this; },
    set(key, value) { this.headers[key] = value; return this; },
    json(payload) { this.payload = payload; return this; }
  };
  await handler({
    get(name) { return name === 'Authorization' ? 'Bearer staging-admin-token' : ''; },
    body
  }, response);
  return response;
}

test('Identity reconciliation route returns 409 when target field values differ from source', async () => {
  const routes = setup({
    auditMissing: 0,
    payloadMismatches: 0,
    targetMappingsMissing: 0,
    targetMappingMismatches: 1,
    warningCount: 0,
    cutoverSafe: false,
    writesPerformed: 0,
    personalDataReturned: false,
    sourceDataDeleted: false
  });
  const response = await invoke(routes.post.get('/admin/identity-profile/backfill/reconcile'),
    { collection: 'users' });
  assert.equal(response.statusCode, 409);
  assert.equal(response.payload.success, false);
  assert.equal(response.payload.targetMappingMismatches, 1);
  assert.equal(response.payload.cutoverSafe, false);
});

test('Identity reconciliation route reports clean only when every parity counter is zero', async () => {
  const routes = setup({
    auditMissing: 0,
    payloadMismatches: 0,
    targetMappingsMissing: 0,
    targetMappingMismatches: 0,
    warningCount: 0,
    cutoverSafe: false,
    writesPerformed: 0,
    personalDataReturned: false,
    sourceDataDeleted: false
  });
  const response = await invoke(routes.post.get('/admin/identity-profile/backfill/reconcile'),
    { collection: 'users' });
  assert.equal(response.statusCode, 200);
  assert.equal(response.payload.success, true);
  assert.equal(response.payload.cutoverSafe, false);
});

test('Identity apply endpoint is blocked in staging preview-only mode', async () => {
  const routes = setup({ sourceDocuments: 1, importedDocuments: 1 });
  const response = await invoke(routes.post.get('/admin/identity-profile/backfill/apply'), {
    collection: 'users',
    confirmSourceProjectId: 'smv-astro-staging'
  });
  assert.equal(response.statusCode, 403);
  assert.equal(response.payload.success, false);
  assert.equal(response.payload.code, 'IDENTITY_BACKFILL_PREVIEW_ONLY');
});

test('read-only Identity preview endpoint remains available in preview-only mode', async () => {
  const routes = setup({ sourceDocuments: 1, plannedD1Statements: 2, writesPerformed: 0, personalDataReturned: false });
  const response = await invoke(routes.post.get('/admin/identity-profile/backfill/preview'), {
    collection: 'users',
    pageSize: 10
  });
  assert.equal(response.statusCode, 200);
  assert.equal(response.payload.mode, 'read_only_preview');
  assert.equal(response.payload.writesPerformed, 0);
  assert.equal(response.payload.personalDataReturned, false);
});
