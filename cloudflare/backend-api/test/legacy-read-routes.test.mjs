import test from 'node:test';
import assert from 'node:assert/strict';
import { registerLegacyReadRoutes } from '../src/legacy-read-routes.mjs';

function harness() {
  const handlers = new Map();
  return { handlers, get(path, handler) { handlers.set('GET ' + path, handler); } };
}
function response() {
  return {
    statusCode: 200, headers: {}, body: null,
    status(code) { this.statusCode = code; return this; },
    set(name, value) {
      if (typeof name === 'object') Object.assign(this.headers, name);
      else this.headers[name] = value;
      return this;
    },
    json(body) { this.body = body; return this; }
  };
}
function request(token = 'Bearer token') {
  return { get(name) { return String(name).toLowerCase() === 'authorization' ? token : ''; } };
}

test('public Android release returns only the public release fields', async () => {
  const app = harness();
  const paths = [];
  registerLegacyReadRoutes({
    app,
    firestore: {
      async getDocument(path) {
        paths.push(path);
        return { exists: true, data: {
          versionName: '1.3', versionCode: 103, downloadUrl: 'https://example.test/app.apk',
          size: 1234, uploadedAt: 99, uploadedBy: 'private-admin', certificateSha256: 'private-cert'
        } };
      },
      async runQuery() { return []; }
    },
    identityService: { async authenticateAuthorization() { return { uid: 'admin', role: 'admin', isAdmin: true }; } }
  });
  const res = response();
  await app.handlers.get('GET /public/android-app')({}, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    success: true, available: true, packageName: 'in.smvastroservices.smvastro',
    versionName: '1.3', versionCode: 103, downloadUrl: 'https://example.test/app.apk',
    size: 1234, uploadedAt: 99
  });
  assert.deepEqual(paths, ['smv_app_releases/android']);
  assert.equal(JSON.stringify(res.body).includes('private-admin'), false);
});

test('Android release safely reports unavailable when no published record exists', async () => {
  const app = harness();
  registerLegacyReadRoutes({
    app,
    firestore: { async getDocument() { return { exists: false, data: null }; }, async runQuery() { return []; } },
    identityService: { async authenticateAuthorization() { return { uid: 'admin', role: 'admin', isAdmin: true }; } }
  });
  const res = response();
  await app.handlers.get('GET /public/android-app')({}, res);
  assert.deepEqual(res.body, { success: true, available: false });
});

test('admin Android release returns uploader and certificate only to Admin', async () => {
  const app = harness();
  registerLegacyReadRoutes({
    app,
    firestore: { async getDocument() { return { exists: true, data: {
      versionName: '1.3', versionCode: 103, downloadUrl: 'https://example.test/app.apk',
      uploadedBy: 'admin-1', certificateSha256: 'release-cert'
    } }; }, async runQuery() { return []; } },
    identityService: { async authenticateAuthorization() { return { uid: 'admin-1', role: 'admin', isAdmin: true }; } }
  });
  const res = response();
  await app.handlers.get('GET /admin/android-app')(request(), res);
  assert.equal(res.body.uploadedBy, 'admin-1');
  assert.equal(res.body.certificateSha256, 'release-cert');
});

test('non-admin cannot read Android admin metadata or draft content', async () => {
  const app = harness();
  let queries = 0;
  registerLegacyReadRoutes({
    app,
    firestore: {
      async getDocument() { return { exists: false, data: null }; },
      async runQuery() { queries += 1; return []; }
    },
    identityService: { async authenticateAuthorization() { return { uid: 'customer-1', role: 'customer', isAdmin: false }; } }
  });
  const android = response();
  await app.handlers.get('GET /admin/android-app')(request(), android);
  assert.equal(android.statusCode, 403);
  const content = response();
  await app.handlers.get('GET /admin/content')(request(), content);
  assert.equal(content.statusCode, 403);
  assert.equal(queries, 0);
});

test('public content query filters unpublished and non-English drafts at Firestore', async () => {
  const app = harness();
  let query = null;
  registerLegacyReadRoutes({
    app,
    firestore: {
      async getDocument() { return { exists: false, data: null }; },
      async runQuery(options) {
        query = options;
        return [
          { id: 'old', data: { title: 'Old', published: true, language: 'en', updatedAt: new Date('2026-01-01') } },
          { id: 'new', data: { title: 'New', published: true, language: 'en', updatedAt: new Date('2026-10-01') } }
        ];
      }
    },
    identityService: { async authenticateAuthorization() { return { uid: 'customer-1', role: 'customer', isAdmin: false }; } }
  });
  const res = response();
  await app.handlers.get('GET /public/content')({}, res);
  assert.deepEqual(query.filters, [
    { field: 'published', op: '==', value: true },
    { field: 'language', op: '==', value: 'en' }
  ]);
  assert.equal(query.limit, 500);
  assert.deepEqual(res.body.items.map(item => item.id), ['new', 'old']);
});

test('Admin content query includes drafts but remains restricted to English and Admin', async () => {
  const app = harness();
  let query = null;
  registerLegacyReadRoutes({
    app,
    firestore: {
      async getDocument() { return { exists: false, data: null }; },
      async runQuery(options) { query = options; return [{ id: 'draft', data: { published: false, language: 'en' } }]; }
    },
    identityService: { async authenticateAuthorization() { return { uid: 'admin-1', role: 'admin', isAdmin: true }; } }
  });
  const res = response();
  await app.handlers.get('GET /admin/content')(request(), res);
  assert.deepEqual(query.filters, [{ field: 'language', op: '==', value: 'en' }]);
  assert.equal(res.body.items[0].published, false);
});

test('Firestore read failures return sanitized, fail-closed responses', async () => {
  const app = harness();
  registerLegacyReadRoutes({
    app,
    firestore: {
      async getDocument() { throw new Error('sensitive provider detail'); },
      async runQuery() { throw new Error('sensitive provider detail'); }
    },
    identityService: { async authenticateAuthorization() { return { uid: 'admin-1', role: 'admin', isAdmin: true }; } }
  });
  const android = response();
  await app.handlers.get('GET /public/android-app')({}, android);
  assert.equal(android.statusCode, 503);
  assert.equal(JSON.stringify(android.body).includes('sensitive provider detail'), false);
  const content = response();
  await app.handlers.get('GET /public/content')({}, content);
  assert.equal(content.statusCode, 503);
  assert.equal(JSON.stringify(content.body).includes('sensitive provider detail'), false);
});
