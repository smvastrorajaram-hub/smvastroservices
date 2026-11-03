import test from 'node:test';
import assert from 'node:assert/strict';
import { registerAdminAccessRoute, registerPublicRuntimeReadRoutes } from '../src/core-read-routes.mjs';

function harness() {
  const handlers = new Map();
  return {
    handlers,
    get(path, handler) { handlers.set('GET ' + path, handler); }
  };
}
function response() {
  return {
    statusCode: 200, headers: {}, body: null,
    status(code) { this.statusCode = code; return this; },
    set(name,value) {
      if (typeof name === 'object') Object.assign(this.headers,name);
      else this.headers[name] = value;
      return this;
    },
    json(body) { this.body = body; return this; }
  };
}
function request(authorization = 'Bearer verified-token') {
  return { get(name) { return String(name).toLowerCase() === 'authorization' ? authorization : ''; } };
}

test('public push config returns only the public VAPID key and uses no-store', () => {
  const app = harness();
  registerPublicRuntimeReadRoutes({ app, env: { FCM_VAPID_PUBLIC_KEY: 'public-vapid-fixture' } });
  const res = response();
  app.handlers.get('GET /public/push-config')({}, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { success: true, vapidPublicKey: 'public-vapid-fixture' });
  assert.equal(res.headers['Cache-Control'], 'no-store');
});

test('public push config safely returns an empty key when push is not configured', () => {
  const app = harness();
  registerPublicRuntimeReadRoutes({ app, env: {} });
  const res = response();
  app.handlers.get('GET /public/push-config')({}, res);
  assert.deepEqual(res.body, { success: true, vapidPublicKey: '' });
});

test('admin access reports only the verified service allowlist/claim result', async () => {
  const app = harness();
  registerAdminAccessRoute({
    app,
    identityService: {
      async authenticateAuthorization() {
        return { uid: 'admin-fixture', role: 'admin', isAdmin: true };
      }
    }
  });
  const res = response();
  await app.handlers.get('GET /admin/access')(request(), res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { success: true, isAdmin: true });
});

test('admin access does not elevate a mutable profile role without an Admin grant', async () => {
  const app = harness();
  registerAdminAccessRoute({
    app,
    identityService: {
      async authenticateAuthorization() {
        return { uid: 'customer-fixture', role: 'customer', isAdmin: false };
      }
    }
  });
  const res = response();
  await app.handlers.get('GET /admin/access')(request(), res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { success: true, isAdmin: false });
});

test('admin access fails closed on unauthenticated or unavailable identity services', async () => {
  const cases = [
    { error: Object.assign(new Error('no auth'), { code: 'AUTH_REQUIRED', httpStatus: 401 }), status: 401 },
    { error: Object.assign(new Error('denied'), { code: 'FIRESTORE_PERMISSION_DENIED', httpStatus: 403 }), status: 403 },
    { error: Object.assign(new Error('offline'), { code: 'IDENTITY_PROFILE_UNAVAILABLE', httpStatus: 503 }), status: 503 }
  ];
  for (const item of cases) {
    const app = harness();
    registerAdminAccessRoute({
      app,
      identityService: { async authenticateAuthorization() { throw item.error; } }
    });
    const res = response();
    await app.handlers.get('GET /admin/access')(request(), res);
    assert.equal(res.statusCode, item.status);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, item.error.code);
  }
});


function firestoreFixture(documents = {}, queries = {}) {
  const reads = [];
  const queryCalls = [];
  return {
    reads, queryCalls,
    async getDocument(documentPath) {
      reads.push(documentPath);
      return documents[documentPath] || {
        exists: false, id: documentPath.split('/').pop(), data: null
      };
    },
    async runQuery(options) {
      queryCalls.push(options);
      return queries[options.collectionPath + ':' + options.filters[0].field] || [];
    }
  };
}

test('account role returns Admin only from the verified Admin authorization result', async () => {
  const { registerAccountRoleRoute } = await import('../src/core-read-routes.mjs');
  const app = harness();
  const firestore = firestoreFixture();
  registerAccountRoleRoute({
    app,
    identityService: { async authenticateAuthorization() { return { uid: 'admin-1', isAdmin: true, role: 'admin' }; } },
    firestore
  });
  const res = response();
  await app.handlers.get('GET /account/role')(request(), res);
  assert.deepEqual(res.body, { success: true, role: 'admin' });
  assert.equal(firestore.reads.length, 0);
});

test('account role returns the verified customer profile contract', async () => {
  const { registerAccountRoleRoute } = await import('../src/core-read-routes.mjs');
  const app = harness();
  const firestore = firestoreFixture({
    'smv_users/customer-1': { exists: true, data: { uid: 'customer-1', role: 'customer', publicId: 'smvcr-12345' } }
  });
  registerAccountRoleRoute({
    app,
    identityService: { async authenticateAuthorization() { return { uid: 'customer-1', isAdmin: false, role: 'customer' }; } },
    firestore
  });
  const res = response();
  await app.handlers.get('GET /account/role')(request(), res);
  assert.deepEqual(res.body, {
    success: true, role: 'customer', profileFound: true,
    astrologerProfileFound: false, astrologerProfileCollection: null
  });
});

test('account role resolves canonical and legacy Astrologer documents by UID/public ID', async () => {
  const { registerAccountRoleRoute } = await import('../src/core-read-routes.mjs');
  for (const collection of ['smv_astrologers', 'smv_astrologer']) {
    const app = harness();
    const firestore = firestoreFixture({
      'smv_users/astro-1': { exists: true, data: { uid: 'astro-1', role: 'customer', publicId: 'smvar-12345' } },
      [collection + '/astro-1']: { exists: true, data: { uid: 'astro-1', publicId: 'smvar-12345', status: 'approved' } }
    });
    registerAccountRoleRoute({
      app,
      identityService: { async authenticateAuthorization() { return { uid: 'astro-1', isAdmin: false, role: 'customer' }; } },
      firestore
    });
    const res = response();
    await app.handlers.get('GET /account/role')(request(), res);
    assert.equal(res.body.role, 'astrologer');
    assert.equal(res.body.astrologerProfileFound, true);
    assert.equal(res.body.astrologerProfileCollection, collection);
  }
});

test('account role ignores an Astrologer profile linked to a different UID', async () => {
  const { registerAccountRoleRoute } = await import('../src/core-read-routes.mjs');
  const app = harness();
  const firestore = firestoreFixture({
    'smv_users/customer-2': { exists: true, data: { uid: 'customer-2', role: 'customer', publicId: 'smvcr-45678' } },
    'smv_astrologers/customer-2': { exists: true, data: { uid: 'someone-else', status: 'approved' } }
  }, {
    'smv_astrologers:uid': [{ exists: true, data: { uid: 'someone-else', status: 'approved' } }],
    'smv_astrologer:uid': [{ exists: true, data: { uid: 'someone-else', status: 'approved' } }]
  });
  registerAccountRoleRoute({
    app,
    identityService: { async authenticateAuthorization() { return { uid: 'customer-2', isAdmin: false, role: 'customer' }; } },
    firestore
  });
  const res = response();
  await app.handlers.get('GET /account/role')(request(), res);
  assert.equal(res.body.role, 'customer');
  assert.equal(res.body.astrologerProfileFound, false);
});
