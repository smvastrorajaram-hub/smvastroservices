import test from 'node:test';
import assert from 'node:assert/strict';
import { registerWalletOfferRoutes } from '../src/wallet-offer-routes.mjs';
import { walletRechargeError } from '../../../shared/backend-platform/wallet-recharge-domain.mjs';

function appHarness() {
  const handlers = new Map();
  return {
    handlers,
    get(path, handler) { handlers.set('GET ' + path, handler); },
    post(path, handler) { handlers.set('POST ' + path, handler); }
  };
}
function responseHarness() {
  return {
    statusCode: 200, headers: {}, body: null,
    status(code) { this.statusCode = code; return this; },
    set(name, value) { if (typeof name === 'object') Object.assign(this.headers, name); else this.headers[name] = value; return this; },
    json(body) { this.body = body; return this; }
  };
}
function request(body = {}, authorization = 'Bearer token') {
  return { body, get(name) { return name.toLowerCase() === 'authorization' ? authorization : ''; } };
}
function makeState(overrides = {}) {
  const calls = [];
  const offer = {
    id: 'offer-1', offerType: 'wallet_recharge_bonus_credit', name: 'Deepavali',
    bannerTheme: 'diwali', enabled: true, minimumRechargeAmountPaise: 5000,
    bonusCreditAmountPaise: 2500, legacyBonusMinutes: 5, perCustomerLimit: 2, totalUsageLimit: 100,
    usedCount: 4, successfulRedemptions: 4, totalBonusMinutesAwarded: 20, totalBonusCreditPaiseAwarded: 10000,
    priority: 10, startAt: '2026-10-31T04:30:00.000Z', endAt: null
  };
  const walletAdapter = {
    async listWalletOffers(options) { calls.push(['list', options]); return [offer]; },
    async saveWalletOffer(input) { calls.push(['save', input]); return { ...offer, ...input, id: input.id || 'new-offer' }; },
    async deleteWalletOffer(id) { calls.push(['delete', id]); return { success: true, id }; },
    async getPromotionalFund() { calls.push(['fund-read']); return {fundId:'SMV_ASTRO',balancePaise:25000,adminWalletAvailableBalancePaise:90000}; },
    async allocatePromotionalFund(input) { calls.push(['fund-allocate',input]); return {success:true,alreadyProcessed:false,fundId:'SMV_ASTRO',balancePaise:37500,adminWalletAvailableBalancePaise:77500}; }
  };
  const identityService = {
    async authenticateAuthorization(header) {
      calls.push(['auth', header]);
      return overrides.user || { uid: 'admin-1', role: 'admin', isAdmin: true };
    }
  };
  const state = {
    app: appHarness(), walletAdapter, identityService,
    isReady: overrides.isReady || (async () => true), calls
  };
  registerWalletOfferRoutes(state);
  return state;
}

test('public Home-page route lists only active offers from D1', async () => {
  const state = makeState();
  const res = responseHarness();
  await state.app.handlers.get('GET /wallet/recharge-offers')(request(), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.offers[0].bannerTheme, 'diwali');
  assert.equal(res.body.offers[0].bonusCreditAmountPaise, 2500);
  assert.equal('bonusMinutes' in res.body.offers[0], false);
  assert.deepEqual(state.calls.find(call => call[0] === 'list')[1], { activeOnly: true });
});

test('Admin offer listing is blocked for Customer identities', async () => {
  const state = makeState({ user: { uid: 'customer-1', role: 'customer', isAdmin: false } });
  const res = responseHarness();
  await state.app.handlers.get('GET /admin/offers')(request(), res);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.code, 'ADMIN_REQUIRED');
});

test('Admin can list saved offers without losing redemption counters', async () => {
  const state = makeState();
  const res = responseHarness();
  await state.app.handlers.get('GET /admin/offers')(request(), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.offers[0].usedCount, 4);
  assert.equal(res.body.offers[0].totalBonusMinutesAwarded, 20);
  assert.equal(res.body.offers[0].totalBonusCreditPaiseAwarded, 10000);
  assert.deepEqual(state.calls.find(call => call[0] === 'list')[1], { activeOnly: false });
});

test('Admin can read the separate Promotional Fund and Admin cash balance', async () => {
  const state=makeState();
  const res=responseHarness();
  await state.app.handlers.get('GET /admin/promotional-fund')(request(),res);
  assert.equal(res.statusCode,200);
  assert.equal(res.body.success,true);
  assert.equal(res.body.fund.balancePaise,25000);
  assert.equal(res.body.fund.adminWalletAvailableBalancePaise,90000);
  assert.ok(state.calls.some(call=>call[0]==='auth'));
  assert.ok(state.calls.some(call=>call[0]==='fund-read'));
});

test('Only Admin can allocate money to the separately funded Promotional Fund', async () => {
  const state=makeState();
  const res=responseHarness();
  await state.app.handlers.get('POST /admin/promotional-fund/allocate')(request({
    amount:'125.00',idempotencyKey:'admin-promo-test-request-001'
  }),res);
  assert.equal(res.statusCode,200);
  assert.equal(res.body.success,true);
  assert.equal(res.body.balancePaise,37500);
  const call=state.calls.find(item=>item[0]==='fund-allocate');
  assert.equal(call[1].adminUid,'admin-1');
  assert.equal(call[1].amountPaise,12500);
  assert.equal(call[1].idempotencyKey,'admin-promo-test-request-001');
});

test('Customer cannot read or allocate the Promotional Fund', async () => {
  const state=makeState({user:{uid:'customer-1',role:'customer',isAdmin:false}});
  const read=responseHarness();
  await state.app.handlers.get('GET /admin/promotional-fund')(request(),read);
  assert.equal(read.statusCode,403);
  const allocate=responseHarness();
  await state.app.handlers.get('POST /admin/promotional-fund/allocate')(request({
    amount:'50.00',idempotencyKey:'admin-promo-test-request-002'
  }),allocate);
  assert.equal(allocate.statusCode,403);
  assert.equal(state.calls.some(call=>call[0]==='fund-allocate'),false);
});

test('Promotional Fund allocation rejects zero or malformed rupee amounts', async () => {
  for(const amount of ['0','-10','1.001','abc']){
    const state=makeState();
    const res=responseHarness();
    await state.app.handlers.get('POST /admin/promotional-fund/allocate')(request({
      amount,idempotencyKey:'admin-promo-test-request-003'
    }),res);
    assert.equal(res.statusCode,400);
    assert.equal(state.calls.some(call=>call[0]==='fund-allocate'),false);
  }
});

test('Admin saves a paise-exact Bonus Credit amount and converts datetime-local as India time', async () => {
  const state = makeState();
  const res = responseHarness();
  await state.app.handlers.get('POST /admin/offers/save')(request({
    name: 'Tamil New Year', bannerTheme: 'tamil_new_year', enabled: true,
    minimumRechargeAmount: '25.50', bonusCreditAmount: '12.50', perCustomerLimit: 0,
    totalUsageLimit: 500, priority: 25,
    startAt: '2026-10-31T10:00', endAt: '2026-11-01T10:00'
  }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  const save = state.calls.find(call => call[0] === 'save')[1];
  assert.equal(save.minimumRechargeAmountPaise, 2550);
  assert.equal(save.bonusCreditPaise, 1250);
  assert.equal(save.startAtMs, Date.parse('2026-10-31T10:00:00+05:30'));
  assert.equal(save.endAtMs, Date.parse('2026-11-01T10:00:00+05:30'));
  assert.equal(save.updatedBy, 'admin-1');
  assert.equal(save.perCustomerLimit, 0);
});

test('Admin save rejects unsupported Welcome theme and invalid date range', async () => {
  for (const payload of [
    { name: 'Old welcome', bannerTheme: 'welcome', bonusCreditAmount: '2.00' },
    { name: 'Missing Bonus Credit amount', bannerTheme: 'generic' },
    { name: 'Reverse dates', bannerTheme: 'generic', bonusCreditAmount: '2.00', startAt: '2026-11-02T10:00', endAt: '2026-11-01T10:00' }
  ]) {
    const state = makeState();
    const res = responseHarness();
    await state.app.handlers.get('POST /admin/offers/save')(request(payload), res);
    assert.equal(res.statusCode, 400);
    assert.equal(state.calls.some(call => call[0] === 'save'), false);
  }
});

test('Admin deletion delegates redemption-history protection to D1', async () => {
  const state = makeState();
  state.walletAdapter.deleteWalletOffer = async id => {
    throw walletRechargeError('WALLET_OFFER_HAS_REDEMPTIONS', 'This Offer has redemption history. Turn it OFF instead of deleting it.', 409);
  };
  const res = responseHarness();
  await state.app.handlers.get('POST /admin/offers/delete')(request({ id: 'offer-1' }), res);
  assert.equal(res.statusCode, 409);
  assert.equal(res.body.code, 'WALLET_OFFER_HAS_REDEMPTIONS');
});

test('Offer routes fail closed when the D1 schema gate is not ready', async () => {
  const state = makeState({ isReady: async () => false });
  const res = responseHarness();
  await state.app.handlers.get('GET /admin/offers')(request(), res);
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.code, 'WALLET_SCHEMA_NOT_READY');
  assert.equal(state.calls.some(call => call[0] === 'auth'), false);
});
