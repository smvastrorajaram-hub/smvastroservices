'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('Astrologer push subscription endpoints require the Astrologer role', () => {
  const service = read('live-session-service.js');
  assert.match(service, /app\.post\('\/live\/push\/register'/);
  assert.match(service, /app\.post\('\/live\/push\/unregister'/);
  assert.match(service, /app\.post\('\/live\/push\/test'/);
  assert.match(service, /requireRole\(req, res, \['astrologer'\]\)/);
  assert.match(service, /String\(snap\.data\(\)\?\.uid \|\| ''\) !== String\(auth\.user\.uid\)/);
});

test('Live requests and Live bookings trigger best-effort server-side pushes', () => {
  const service = read('live-session-service.js');
  assert.match(service, /admin\.messaging\(\)\.send\(/);
  assert.match(service, /notifyAstrologerPush\(astroId, \{/);
  assert.match(service, /type: 'live_request'/);
  assert.match(service, /type: 'live_booking'/);
  assert.match(service, /messaging\/registration-token-not-registered/);
  assert.match(service, /session\.state === 'ringing' && String\(session\.astrologerUid \|\| ''\) === String\(uid\)/);
});

test('Scheduled Call and Chat bookings also trigger an Astrologer push', () => {
  const server = read('server.js');
  assert.match(server, /registerLiveSessionRoutes\(\{app,db,FieldValue,crypto,requireUser,isAdminUser,admin\}\)/);
  assert.match(server, /type: 'scheduled_booking'/);
  assert.match(server, /app\.get\('\/public\/push-config'/);
  assert.match(server, /process\.env\.FCM_VAPID_PUBLIC_KEY/);
  assert.match(server, /liveSessionService\.notifyAstrologerPush\(callBooking\.astrologerUid/);
});

test('Astrologer can register and test device-level Background Alerts', () => {
  const frontend = read('public/smvastro.mjs');
  assert.match(frontend, /Notification\.requestPermission\(\)/);
  assert.match(frontend, /messagingModule\.getToken\(messaging,\s*\{\s*vapidKey,\s*serviceWorkerRegistration\s*:\s*registration\s*\}\)/);
  assert.match(frontend, /id="smvLivePushEnable"/);
  assert.match(frontend, /id="smvLivePushTest"/);
  assert.match(frontend, /renderApi\('\/live\/push\/register'/);
});

test('service worker displays background pushes and focuses the app when clicked', () => {
  const worker = read('public/sw.js');
  assert.match(worker, /onBackgroundMessage/);
  assert.match(worker, /self\.registration\.showNotification/);
  assert.match(worker, /self\.addEventListener\('notificationclick'/);
  assert.match(worker, /smv-astro-staging/);
  assert.match(worker, /projectId: 'smv-astro'/);
});

test('Live Chat active modal dimensions are not overridden by generic dialog rules', () => {
  const css = read('public/smvastro.css');
  const html = read('public/index.html');
  assert.ok(css.includes('.modalbox:where(:not(.smv-css-island,.smv-css-island *)):not(#modal.smv-live-session-modal .modalbox){width:calc(-24px + 100vw)!important'));
  assert.ok(css.includes('.modalbox:where(:not(.smv-css-island,.smv-css-island *)):not(#modal.smv-live-session-modal .modalbox){width:calc(-20px + 100vw)!important'));
  assert.ok(css.includes('.modalbox:where(:not(.smv-css-island,.smv-css-island *)):not(#modal.smv-live-session-modal .modalbox){width:calc(-10px + 100vw)!important'));
  assert.ok(css.includes('#modal.smv-live-session-modal.smv-live-chat-active .modalbox{width:min(calc(100vw - 16px),960px);max-width:960px;height:calc(100dvh - 16px - env(safe-area-inset-bottom))'));
  assert.ok(css.includes('#modal.smv-live-session-modal.smv-live-chat-active #smvLiveMessages{display:flex;flex:1 1 0%'));
  assert.ok(css.includes('#modal.smv-live-session-modal.smv-live-chat-active #smvLiveMessages{display:flex;flex:1 1 0%;flex-direction:column;width:100%;height:auto;min-width:0;min-height:0;max-height:none;overflow-y:auto'));
  assert.ok(html.includes('smvastro.css?v=20261026-livechat-scroll-place-black-v2'));
});

test('Live Chat uses one large, scrolling message pane without changing preparation timing', () => {
  const css = read('public/smvastro.css');
  const frontend = read('public/smvastro.mjs');
  assert.ok(css.includes('#modal.smv-live-session-modal.smv-live-chat-active .smv-live-session-body{display:flex;flex:1 1 0%;flex-direction:column;width:100%;min-width:0;min-height:0;max-height:none;overflow:hidden'));
  assert.ok(css.includes('#modal.smv-live-session-modal.smv-live-chat-active #smvLiveChatArea{display:flex;flex:1 1 0%;flex-direction:column;width:100%;height:auto;min-width:0;min-height:0'));
  assert.ok(frontend.includes("messages.style.height='auto'"));
  assert.ok(frontend.includes("messages.style.minHeight='0'"));
  assert.ok(frontend.includes("host.scrollTop=host.scrollHeight"));
  assert.ok(frontend.includes("s.state==='preparing'"));
});

test('Explicit login opens a neutral Dashboard shell before Firestore profile and role reads', () => {
  const frontend = read('public/smvastro.mjs');
  const start = frontend.indexOf('async function submitAuth(mode)');
  const shell = frontend.indexOf('Login successful. Opening your dashboard', start);
  const profile = frontend.indexOf('const loginProfile=await getUserProfile(loginCred.user.uid)', start);
  const role = frontend.indexOf('const role=await resolveSmvRole(loginCred.user,profile)', start);
  assert.ok(start >= 0 && shell > start);
  assert.ok(profile > shell, 'The visible neutral shell must render before profile reads');
  assert.ok(role > profile, 'Role-specific rendering must still wait for role resolution');
  assert.ok(frontend.includes('if(!goToQuestion&&!goToAdmin){'));
  assert.ok(frontend.includes('role="status"'));
  assert.ok(frontend.includes('smvEnterInternalView("dashboard",true)'));
});

test('Customer Dashboard remains usable when consultation reads hit a Firestore quota error', () => {
  const frontend = read('public/smvastro.mjs');
  assert.ok(frontend.includes("const questionReadFailed=!!customerResults[0]?.error||!cr?.success||!Array.isArray(cr.questions);"));
  assert.ok(frontend.includes("const privateReadFailed=!!customerResults[1]?.error||!privateCr?.success||!Array.isArray(privateCr.consultations);"));
  assert.ok(frontend.includes("Dashboard opened, but some data is temporarily unavailable."));
  assert.ok(frontend.includes("Question history is temporarily unavailable. Your records have not been deleted."));
  assert.ok(frontend.includes("Chat booking history is temporarily unavailable. Your records have not been deleted."));
  assert.ok(frontend.includes('id="smvCustomerDataRetry"'));
  assert.ok(frontend.includes("loadDashboard('customer',true)"));
  assert.ok(!frontend.includes("if(customerResult?.error)throw customerResult.error;"));
  assert.ok(frontend.includes("smvProfiles.set(uid,{data:{},at:Date.now()});"));
  assert.ok(frontend.includes("const profile=loginProfile;"));
});

test('Live Session uses SSE as primary transport and reserves polling for recovery', () => {
  const frontend = read('public/smvastro.mjs');
  const html = read('public/index.html');
  assert.ok(frontend.includes('let smvLiveEventStreamConnected=false'));
  assert.ok(frontend.includes('function smvLiveStartFallbackPolling(){'));
  assert.ok(frontend.includes('if(smvLiveEventStreamConnected||!currentUser'));
  assert.ok(frontend.includes('smvLiveEventStreamConnected=true;'));
  assert.ok(frontend.includes('smvLiveStopFallbackPolling();'));
  assert.ok(frontend.includes('enabling recovery polling.'));
  assert.ok(!frontend.includes("smvLiveMessageTimer=setInterval(()=>{if(smvLivePanelSessionId===id&&smvLiveCurrentSession?.state!=='ended')smvLivePollMessages(id).catch(()=>{});},600)"));
  assert.ok(!frontend.includes("smvLiveDashboardTimer=setInterval(()=>smvLivePollSessions().catch(()=>{}),4500"));
  assert.ok(html.includes('smvastro.mjs?v=20261027-dashboard-fast-shell-no-loading-v1'));
});

test('Customer and Astrologer Dashboard show a fast role shell without Dashboard-wide loading text', () => {
  const frontend = read('public/smvastro.mjs');
  const html = read('public/index.html');
  assert.ok(frontend.includes("function smvRenderFastDashboardShell(roleValue=''){"));
  assert.ok(frontend.includes("smvRenderFastDashboardShell(smvCachedDashboardRole(loginCred.user.uid));"));
  assert.ok(frontend.includes("smvRenderFastDashboardShell(role);"));
  assert.ok(frontend.includes("smvRenderFastDashboardShell(headerRole);"));
  assert.equal(frontend.split('Loading your dashboard...').length - 1, 1, 'Only the historical explanatory comment may mention this label');
  assert.ok(html.includes('smvastro.mjs?v=20261027-dashboard-fast-shell-no-loading-v1'));
});

test('Last-known Dashboard role cache only stores Customer or Astrologer UI roles', () => {
  const frontend = read('public/smvastro.mjs');
  assert.ok(frontend.includes("return ['customer','astrologer'].includes(role)?role:'';"));
  assert.ok(frontend.includes("if(!uid||!['customer','astrologer'].includes(safeRole))return;"));
  assert.ok(frontend.includes('const cachedRole=smvCachedDashboardRole(user.uid);'));
  assert.ok(frontend.includes("if(!profile?._smvProfileReadFailed)smvRememberDashboardRole(user.uid,resolvedRole);"));
});

test('Customer fast shell binds Wallet actions without starting a duplicate initial Wallet read', () => {
  const frontend = read('public/smvastro.mjs');
  assert.ok(frontend.includes("smvBindCustomerWallet({load:false});"));
  assert.ok(frontend.includes("function smvBindCustomerWallet({load=true}={}){"));
  assert.ok(frontend.includes("if(load)smvLoadCustomerWallet();"));
});

test('Live Chat receipt includes chat history in Print / Save as PDF', () => {
  const frontend = read('public/smvastro.mjs');
  assert.ok(frontend.includes('async function smvLivePrintReceipt(session)'));
  assert.ok(frontend.includes('Live Chat History ('));
  assert.ok(frontend.includes('class="chat-history"'));
  assert.ok(frontend.includes("renderApi('/live/sessions/'+encodeURIComponent(String(s.id||s.sessionId||''))+'/messages'"));
  assert.ok(frontend.includes('transcriptMessages.map'));
  assert.ok(frontend.includes("row.dataset.senderUid"));
  assert.ok(frontend.includes("row.dataset.createdAt"));
});

test('Customer dashboard, live forms and booking location suggestions use black text on white', () => {
  const css = read('public/smvastro.css');
  const places = read('public/question-place-search.mjs');
  const content = read('public/public-content.mjs');
  const start = css.indexOf('/* Main-site birth-place suggestions: high contrast');
  const end = css.indexOf('@media (min-width: 900px)', start);
  assert.ok(start >= 0 && end > start);
  const mainPlaces = css.slice(start, end);
  assert.ok(mainPlaces.includes('.smv-main-place-results{'));
  assert.ok(mainPlaces.includes('background:#ffffff;'));
  assert.ok(mainPlaces.includes('color:#111111;'));
  assert.ok(mainPlaces.includes('-webkit-text-fill-color:#111111;'));
  assert.ok(mainPlaces.includes('.smv-main-place-row{'));
  assert.ok(places.includes("WebkitTextFillColor:'#111'"));
  assert.ok(places.includes("colorScheme:'light'"));
  assert.equal(content.split('question-place-search.mjs?v=20261026-livechat-scroll-place-black-v2').length-1,2);
});
