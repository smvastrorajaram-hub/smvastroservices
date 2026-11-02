'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const createAnswerCredit = require('../answer-credit');
const { isStagingDeployment } = require('../deployment-environment');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('disabling the legacy answer-credit scheduler performs zero Firestore reads', () => {
  let reads = 0;
  const db = {
    collection() {
      reads += 1;
      throw new Error('Firestore must not be touched when the scheduler is disabled.');
    }
  };
  const service = createAnswerCredit({
    db,
    FieldValue: { serverTimestamp: () => new Date() },
    privateAmounts: async () => ({ astrologerAmount: 0, adminAmount: 0, privateAstrologerCommissionRate: 0 })
  });

  assert.equal(service.start({ enabled: false }), null);
  assert.equal(reads, 0);
});

test('Render Node.js default NODE_ENV=production does not hide the Staging service identity', () => {
  assert.equal(isStagingDeployment({
    NODE_ENV: 'production',
    RENDER_SERVICE_NAME: 'smv-astro-phase1-staging',
    RENDER_SERVICE_ID: 'srv-dbes0alg1s2s73dk7ie0'
  }), true);
});

test('Production Render service names do not accidentally disable the legacy scheduler', () => {
  assert.equal(isStagingDeployment({
    NODE_ENV: 'production',
    RENDER_SERVICE_NAME: 'smv-astro-phase1-production',
    FIREBASE_PROJECT_ID: 'smv-astro'
  }), false);
});

test('explicit staging Firebase project remains a valid staging signal', () => {
  assert.equal(isStagingDeployment({
    NODE_ENV: 'production',
    FIREBASE_PROJECT_ID: 'smv-astro-staging',
    RENDER_SERVICE_NAME: 'service'
  }), true);
});

test('Staging disables only the legacy answer-credit scheduler while Production keeps it enabled', () => {
  const server = read('server.js');
  assert.ok(server.includes('answerCredit.start({enabled: !IS_STAGING_DEPLOYMENT});'));
  assert.ok(server.includes('answerCredit.start({enabled: !IS_STAGING_DEPLOYMENT})'));
  assert.ok(server.includes('const IS_STAGING_DEPLOYMENT ='));
});

test('public Wallet recharge offers use one bounded short-lived cache and keep the eligibility transaction authoritative', () => {
  const server = read('server.js');
  const start = server.indexOf("app.get('/wallet/recharge-offers'");
  const end = server.indexOf("app.get('/admin/offers'", start);
  assert.ok(start >= 0 && end > start, 'public Wallet offers route is present');
  const route = server.slice(start, end);
  assert.ok(server.includes("walletRechargeOffersCache=createTtlSingleFlightCache({ttlMs:15000,maxEntries:1})"));
  assert.ok(route.includes("walletRechargeOffersCache.get('active'"));
  assert.equal((route.match(/db\.collection\('smv_offers'\)/g) || []).length, 1);
  assert.ok(server.includes("walletRechargeOffersCache.invalidate('active')"), 'Admin save/delete invalidate the snapshot');
  assert.ok(server.includes("const offers = await walletRechargeOffersCache.get('active'"), 'display cache does not wrap recharge settlement');
});

test('Live session timer restoration is retained for billing safety', () => {
  const live = read('live-session-service.js');
  assert.ok(live.includes('async function restoreTimers()'));
  assert.ok(live.includes("where('state', 'in', ['preparing', 'ringing', 'connecting', 'active']).limit(100)"));
  assert.ok(live.includes('restoreTimers().catch(() => {})'));
});
