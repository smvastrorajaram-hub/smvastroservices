import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const frontend=await readFile(new URL('../public/smvastro.mjs',import.meta.url),'utf8');
const index=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
const earningsService=await readFile(new URL('../shared/backend-platform/d1-live-withdrawal-service.mjs',import.meta.url),'utf8');
const privateChatRoutes=await readFile(new URL('../cloudflare/backend-api/src/private-chat-routes.mjs',import.meta.url),'utf8');

test('Production financial API resolver routes all Wallet, Live, Astrologer earnings and Admin withdrawal calls to Cloudflare',()=>{
  assert.ok(index.includes('window.SMV_CLOUDFLARE_FINANCIAL_API_ENABLED = true'));
  const start=frontend.indexOf('function smvApiBackend(');
  const end=frontend.indexOf('const BACKEND=',start);
  assert.ok(start>=0&&end>start,'financial API resolver exists');
  const resolver=frontend.slice(start,end);
  assert.ok(resolver.includes('astrologer\\/(?:appointments|availability|change-payout|earnings|open-questions|qualification-config|sync-approval|withdrawal-request|edit-answer|claim-question)'));
  assert.ok(resolver.includes('withdrawal-mark-processing|withdrawal-reject|withdrawal-mark-paid'));
  assert.ok(frontend.includes('const apiBackend=smvApiBackend(path)'));
  assert.ok(frontend.includes('fetch(apiBackend+path'));
});

test('Implemented non-Auth SMV ASTRO dashboard APIs share the Cloudflare Worker origin',()=>{
  const start=frontend.indexOf('function smvApiBackend(');
  const end=frontend.indexOf('const BACKEND=',start);
  const resolver=frontend.slice(start,end);
  assert.ok(resolver.includes('const cloudflareRoute'));
  for(const route of [
    'admin\\/(?:appointments|astrologers-data|settings-data',
    'admin-data(?:\\/|$)',
    'astrologer-quiz\\/(?:questions',
    'astrologer\\/(?:appointments|availability',
    'customer\\/(?:appointments|reviews',
    'public\\/(?:astrologers',
    'live\\/(?:requests|sessions|bookings|pricing|ice-config|events|scheduled-appointments|push',
    'google-form\\/astrologer-quiz-config',
    'webhooks\\/google-form'
  ]) {
    assert.ok(resolver.includes(route),'Cloudflare API allowlist includes '+route);
  }
  assert.ok(!resolver.includes('account\\/role'));
  assert.ok(!resolver.includes('admin\\/(?:access'));
  assert.ok(!resolver.includes('lookup-id-login'));
  assert.ok(!resolver.includes('register-customer-profile'));
  assert.ok(!resolver.includes('horoscope-feature-settings'));
  assert.ok(!resolver.includes('api\\/locations'));
});

test('Admin Processing, Reject and Paid operations all use D1 withdrawal mutation endpoints only',()=>{
  const start=frontend.indexOf("const withdrawalPayload=await renderApi('/admin/withdrawals-data'");
  const end=frontend.indexOf('/* Active Admin earnings history',start);
  assert.ok(start>=0&&end>start,'Admin withdrawal panel exists');
  const block=frontend.slice(start,end);
  assert.ok(block.includes('/admin/withdrawal-mark-processing'));
  assert.ok(block.includes('/admin/withdrawal-reject'));
  assert.ok(block.includes('/admin/withdrawal-mark-paid'));
  assert.ok(block.includes('renderApi(withdrawalRoute'));
  assert.ok(!block.includes('updateDoc(withdrawalRef'));
  assert.ok(!block.includes("doc(db,'smv_withdrawals',withdrawalId)"));
  assert.ok(block.includes('smv_notifications'),'Firebase notifications remain a separate notification write');
});

test('Astrologer Earnings History does not silently read stale Firebase withdrawal rows after D1 cutover',()=>{
  const start=frontend.indexOf('// Earnings and withdrawals share the D1 financial source after cutover.');
  assert.ok(start>=0,'D1 earnings display path exists');
  const section=frontend.slice(start,start+8000);
  assert.ok(section.includes('Array.isArray(epRemote.ledger)'));
  assert.ok(section.includes('epRemote?.withdrawals'));
  assert.ok(!section.includes("getDocs(query(collection(db,'smv_withdrawals'"));
  assert.ok(section.includes("earningsTotalNode.textContent='Unavailable'"));
});

test('Render Razorpay is not coupled to Cloudflare production financial routing in the frontend',()=>{
  assert.ok(frontend.includes('const CLOUDFLARE_FINANCIAL_BACKEND_URL'));
  assert.ok(frontend.includes('function smvApiBackend(path)'));
});


test('Astrologer lifetime totals use authoritative backend aggregates, not the recent withdrawal history page',()=>{
  const start=frontend.indexOf('// Earnings and withdrawals share the D1 financial source after cutover.');
  const end=frontend.indexOf('const earningsTotalNode=',start);
  const hydration=frontend.slice(start,end);
  assert.ok(hydration.includes('totalEarnings=Number(epRemote.totalEarnings)'));
  assert.ok(hydration.includes('totalWithdrawals=Number(epRemote.totalWithdrawals)'));
  assert.ok(hydration.includes('availableToWithdraw=Math.max(0,Number(epRemote.availableToWithdraw))'));
  assert.ok(hydration.includes('withdrawalEligible=epRemote.withdrawalEligible===true'));
  assert.equal(hydration.includes('withdrawalSnap.docs.forEach'),false);
});

test('D1 earnings history merges credited Live, Booking, Question, Private Chat and Private Consultation rows',()=>{
  for(const token of ['summary.legacyEarnings?.ledger','liveLedger',"privateChat?'Private Chat':'Question'","sourceLabel:'Private Consultation'",'.slice(0,50)']) assert.ok(earningsService.includes(token),token);
  assert.ok(frontend.includes('Recent Earnings History'));
});

test('Live, Book, Private and Scheduled dashboard records display source timestamps in Asia/Kolkata',()=>{
  assert.ok(frontend.includes("timeZone:'Asia/Kolkata'"));
  assert.ok(frontend.includes('smvLiveSessionDateSummary(current)'));
  assert.ok(frontend.includes('smvLiveBookingDateSummary(b)'));
  assert.ok(frontend.includes('smvScheduledBookingDateSummary(a)'));
  assert.ok(frontend.includes('smvPrivateChatDateSummary(q)'));
  assert.ok(privateChatRoutes.includes("'commissionCreditedAt'"));
});

test('Astrologer Earnings History refreshes after a Live session settlement',()=>{
  assert.ok(frontend.includes("new Event('smv:astrologer-earnings-updated')"));
  assert.ok(frontend.includes("window.addEventListener('smv:astrologer-earnings-updated'"));
});
