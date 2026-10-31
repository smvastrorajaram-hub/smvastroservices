import test from 'node:test';
import assert from 'node:assert/strict';
import { createFirebaseIdentityService } from '../../../shared/backend-platform/firebase-identity-service.mjs';
import { registerWalletReadRoutes } from '../src/wallet-read-routes.mjs';

function createApp() {
  const handlers = new Map();
  return { handlers, get(path, handler) { handlers.set(path, handler); } };
}

function createResponse() {
  return {
    statusCode: 200, headers: {}, body: null,
    status(code) { this.statusCode = code; return this; },
    set(name, value) { if (typeof name === 'object') Object.assign(this.headers, name); else this.headers[name] = value; return this; },
    json(body) { this.body = body; return this; }
  };
}

function request(authorization = 'Bearer test-token', query = {}) {
  return { get: name => name === 'Authorization' ? authorization : '', query };
}

test('identity service combines verified token, Admin allowlist and authoritative profile role', async () => {
  const calls = [];
  const identity = createFirebaseIdentityService({
    projectIds: ['smv-astro-staging'],
    verifyIdToken: async token => {
      assert.equal(token, 'test-token');
      return { uid: 'customer-1', email: 'customer@example.com', emailVerified: true, projectId: 'smv-astro-staging' };
    },
    firestore: {
      async getDocument({ documentPath }) {
        calls.push(documentPath);
        if (documentPath === 'smv_users/customer-1') return { exists: true, data: { role: 'customer' } };
        return { exists: false, data: null };
      }
    }
  });
  const user = await identity.authenticateAuthorization('Bearer test-token');
  assert.equal(user.uid, 'customer-1');
  assert.equal(user.role, 'customer');
  assert.equal(user.emailVerified, true);
  assert.deepEqual(calls.sort(), ['smv_admins/customer-1', 'smv_users/customer-1']);
});

test('identity service rejects missing or expired Firebase ID tokens', async () => {
  const identity = createFirebaseIdentityService({
    projectIds: ['smv-astro-staging'],
    verifyIdToken: async () => { throw new Error('invalid'); },
    firestore: { async getDocument() { return { exists:false }; } }
  });
  await assert.rejects(identity.authenticateAuthorization(''), error => error.code === 'AUTH_REQUIRED');
  await assert.rejects(identity.authenticateAuthorization('Bearer expired'), error => error.code === 'AUTH_REQUIRED');
});

test('Wallet read routes preserve Customer wallet JSON contract and integer paise', async () => {
  const app = createApp();
  const identityService = { async authenticateAuthorization() { return { uid:'customer-1', role:'customer' }; } };
  const walletAdapter = {
    async ensureWallet(uid, role) {
      assert.equal(uid, 'customer-1'); assert.equal(role, 'customer');
      return { ownerUid:uid,ownerRole:role,availableBalancePaise:12550,reservedBalancePaise:500,bonusMinutesBalance:2,reservedBonusMinutes:1,updatedAt:1000 };
    },
    async listTransactions() { return []; }
  };
  registerWalletReadRoutes({ app, identityService, walletAdapter });
  const res = createResponse();
  await app.handlers.get('/wallet')(request(), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['Cache-Control'], 'no-store');
  assert.equal(res.body.wallet.availableBalance, 125.5);
  assert.equal(res.body.wallet.totalBalance, 130.5);
  assert.equal(res.body.wallet.bonusMinutesBalance, 2);
});

test('Admin Wallet reads use the configured shared Admin wallet owner UID', async () => {
  const app = createApp();
  const identityService = { async authenticateAuthorization() { return { uid:'admin-user', role:'admin' }; } };
  const walletAdapter = {
    async ensureWallet(uid, role) {
      assert.equal(uid, 'admin-master-wallet');
      assert.equal(role, 'admin');
      return { availableBalancePaise:0,reservedBalancePaise:0,bonusMinutesBalance:0,reservedBonusMinutes:0 };
    },
    async listTransactions() { return []; }
  };
  registerWalletReadRoutes({ app, identityService, walletAdapter, adminWalletUid:'admin-master-wallet' });
  const res = createResponse();
  await app.handlers.get('/wallet')(request(), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.wallet.ownerRole, 'admin');
});

test('Wallet transaction reads cap limit and return safe ledger view fields', async () => {
  const app = createApp();
  const identityService = { async authenticateAuthorization() { return { uid:'customer-2', role:'customer' }; } };
  let limitSeen;
  const walletAdapter = {
    async ensureWallet() { return { availableBalancePaise:5000,reservedBalancePaise:0,bonusMinutesBalance:1,reservedBonusMinutes:0 }; },
    async listTransactions(uid, limit) {
      assert.equal(uid, 'customer-2'); limitSeen=limit;
      return [{ id:'ledger-1',type:'recharge',direction:'credit',status:'posted',amountPaise:5000,balanceAfterPaise:5000,reservedBalanceAfterPaise:0,bonusMinutesBalanceAfter:1,createdAt:1000 }];
    }
  };
  registerWalletReadRoutes({ app, identityService, walletAdapter });
  const res = createResponse();
  await app.handlers.get('/wallet/transactions')(request('Bearer token',{limit:'999'}),res);
  assert.equal(limitSeen,100);
  assert.equal(res.body.transactions[0].amount,50);
  assert.equal(res.body.transactions[0].createdAt,'1970-01-01T00:00:01.000Z');
});

test('Wallet routes reject unknown roles and surface identity failures', async () => {
  const app = createApp();
  const identityService = { async authenticateAuthorization() { return { uid:'guest', role:'unknown' }; } };
  const walletAdapter = { async ensureWallet() { throw new Error('must not read'); }, async listTransactions() { return []; } };
  registerWalletReadRoutes({ app, identityService, walletAdapter });
  const roleResponse = createResponse();
  await app.handlers.get('/wallet')(request(), roleResponse);
  assert.equal(roleResponse.statusCode, 403);
  assert.equal(roleResponse.body.code, 'WALLET_ROLE_REQUIRED');

  const authApp = createApp();
  const authFailure = { async authenticateAuthorization() { throw Object.assign(new Error('expired'),{code:'AUTH_REQUIRED',httpStatus:401}); } };
  registerWalletReadRoutes({ app:authApp, identityService:authFailure, walletAdapter });
  const unauthenticated = createResponse();
  await authApp.handlers.get('/wallet')(request(), unauthenticated);
  assert.equal(unauthenticated.statusCode, 401);
  assert.equal(unauthenticated.body.code, 'AUTH_REQUIRED');
});
