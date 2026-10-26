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

test('Explicit login immediately opens a Dashboard shell before profile and role reads', () => {
  const frontend = read('public/smvastro.mjs');
  const start = frontend.indexOf('async function submitAuth(mode)');
  const shell = frontend.indexOf('smvRenderFastDashboardShell(loginShellRole);', start);
  const profile = frontend.indexOf('const loginProfile=await getUserProfile(loginCred.user.uid)', start);
  const role = frontend.indexOf('const role=await resolveSmvRole(loginCred.user,profile)', start);
  assert.ok(start >= 0 && shell > start);
  assert.ok(profile > shell, 'The Dashboard shell must render before profile reads');
  assert.ok(role > profile, 'Role resolution follows the first profile result');
  assert.ok(frontend.includes('if(!goToQuestion&&!goToAdmin){'));
  assert.ok(frontend.includes('smvEnterInternalView("dashboard",true)'));
  assert.ok(!frontend.includes('Login successful. Opening your dashboard…'));
});

test('Customer Dashboard keeps its shell when history reads fail without a Dashboard-wide quota note', () => {
  const frontend = read('public/smvastro.mjs');
  assert.ok(frontend.includes("const questionReadFailed=!!customerResults[0]?.error||!cr?.success||!Array.isArray(cr.questions);"));
  assert.ok(frontend.includes("const privateReadFailed=!!customerResults[1]?.error||!privateCr?.success||!Array.isArray(privateCr.consultations);"));
  assert.ok(frontend.includes("Question history is temporarily unavailable. Your records have not been deleted."));
  assert.ok(frontend.includes("Chat booking history is temporarily unavailable. Your records have not been deleted."));
  assert.ok(!frontend.includes("Dashboard opened, but some data is temporarily unavailable."));
  assert.ok(!frontend.includes("Please retry when Firebase is available."));
  assert.ok(!frontend.includes('id="smvCustomerDataRetry"'));
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
  assert.ok(html.includes('smvastro.mjs?v=20261027-astrologer-single-heading-parallel-profile-v1'));
});

test('Customer and Astrologer Dashboard open without Dashboard-wide loading or quota notes', () => {
  const frontend = read('public/smvastro.mjs');
  const html = read('public/index.html');
  assert.ok(frontend.includes("function smvRenderFastDashboardShell(roleValue=''){"));
  assert.ok(frontend.includes("smvRenderFastDashboardShell(loginShellRole);"));
  assert.ok(frontend.includes("smvRenderFastDashboardShell(role);"));
  assert.ok(frontend.includes("smvRenderFastDashboardShell(headerRole);"));
  assert.equal(frontend.includes('Loading your dashboard...'), false);
  assert.ok(!frontend.includes("because Firebase could not be read."));
  assert.ok(!frontend.includes("Dashboard is open. Astrologer profile and data"));
  assert.ok(html.includes('smvastro.mjs?v=20261027-astrologer-single-heading-parallel-profile-v1'));
});

test('Explicit login keeps the fast role shell mounted and does not hide/reopen Dashboard', () => {
  const frontend = read('public/smvastro.mjs');
  const start = frontend.indexOf('async function submitAuth(mode)');
  const roleBranch = frontend.indexOf('if(goToAdmin || adminUser){', start);
  const normalBranch = frontend.indexOf('}else{\n      hide("admin"); hide("adminLink");\n      show("dashLink");', roleBranch);
  const roleShell = frontend.indexOf('if(loginShellRole!==role)smvRenderFastDashboardShell(role);', normalBranch);
  assert.ok(start>=0 && roleBranch>start && normalBranch>roleBranch && roleShell>normalBranch);
  assert.equal(frontend.slice(normalBranch,roleShell).includes('hide("dashboard")'), false);
  assert.ok(!frontend.includes('pendingAfterLogin=null;\n    hide("dashboard"); hide("admin"); hide("dashLink"); hide("adminLink");\n    if(goToAdmin || adminUser){'));
  assert.ok(!frontend.includes("dashboardReadyRole===await resolveSmvRole(user)"));
});

test('Last-known Dashboard role cache only stores Customer or Astrologer UI roles', () => {
  const frontend = read('public/smvastro.mjs');
  assert.ok(frontend.includes("return ['customer','astrologer'].includes(role)?role:'';"));
  assert.ok(frontend.includes("if(!uid||!['customer','astrologer'].includes(safeRole))return;"));
  assert.ok(frontend.includes('const cachedRole=smvCachedDashboardRole(user.uid);'));
  assert.ok(frontend.includes("if(!profile?._smvProfileReadFailed)smvRememberDashboardRole(user.uid,resolvedRole);"));
  assert.ok(frontend.includes("if(data._smvProfileReadFailed&&astroProfileReadFailed&&!Object.keys(ad).length){"));
  assert.ok(frontend.includes("id=\"smvAstroDataRetry\""));
  assert.ok(frontend.includes("REFRESH DASHBOARD"));
  assert.ok(frontend.includes("smvProfiles.delete(loadUid);"));
});

test('Astrologer Dashboard keeps one heading and parallelizes its first profile read', () => {
  const frontend = read('public/smvastro.mjs');
  const html = read('public/index.html');
  const fastStart = frontend.indexOf("function smvRenderFastDashboardShell(roleValue='')");
  const fastEnd = frontend.indexOf('function smvWalletMoney', fastStart);
  const fastShell = frontend.slice(fastStart, fastEnd);
  const dashboardStart = frontend.indexOf('async function loadDashboard(expectedRole=null,force=false,background=false)');
  const dashboardEnd = frontend.indexOf('function openPayoutChange()', dashboardStart);
  const dashboard = frontend.slice(dashboardStart, dashboardEnd);
  assert.ok(fastStart >= 0 && fastEnd > fastStart);
  assert.ok(!fastShell.includes('<h2>ASTROLOGER DASHBOARD</h2>'));
  assert.ok(!dashboard.includes('<h2>ASTROLOGER DASHBOARD</h2>'));
  assert.ok(frontend.includes("$('dashboardTitle').textContent=role==='astrologer'?'ASTROLOGER DASHBOARD':'CUSTOMER DASHBOARD';"));
  assert.ok(dashboard.includes("const shouldPreloadAstroProfile=requestedRole==='astrologer'"));
  assert.ok(dashboard.includes('const astrologerProfilePromise=shouldPreloadAstroProfile?readAstrologerProfile():null;'));
  assert.ok(dashboard.includes('astrologerProfileResult=profileResult;'));
  assert.ok(!dashboard.includes("const a=await withTimeout(\n     getDoc(doc(db,'smv_astrologers',currentUser.uid))"));
  assert.ok(html.includes('smvastro.mjs?v=20261027-astrologer-single-heading-parallel-profile-v1'));
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


test('Astrologer dashboard live updates use a lightweight signal instead of history-sized listeners', () => {
  const events = read('dashboard-events.js');
  assert.ok(events.includes("kind:'dashboard_signal'"));
  assert.ok(events.includes("role==='astrologer'&&kind==='dashboard_signal'"));
  assert.ok(events.includes("'questions','private_consultations','withdrawals_payouts','financial','astrologers','astrologer_settings','settings','reviews'"));
  assert.ok(!events.includes("where(role==='astrologer'?'astrologerId':'customerId'"));
  assert.ok(!events.includes("where('status','==','available_to_astrologers')"));
  assert.ok(!events.includes("where('astrologerId','==',user.uid),kind:'withdrawals'"));
});

test('Claiming a public question publishes the Astrologer dashboard invalidation signal', () => {
  const server = read('server.js');
  assert.ok(server.includes("'/astrologer/claim-question'"));
  assert.ok(server.includes("p.includes('/claim-question')"));
  assert.ok(server.includes("db.collection('smv_settings').doc('dashboardChange').set"));
});

test('Astrologer dashboard keeps the fast shell and parallel profile preload', () => {
  const frontend = read('public/smvastro.mjs');
  assert.ok(frontend.includes('smvRenderFastDashboardShell(requestedRole)'));
  assert.ok(frontend.includes("shouldPreloadAstroProfile=requestedRole==='astrologer'||smvCachedDashboardRole(loadUid)==='astrologer'"));
  assert.ok(frontend.includes('const astrologerProfilePromise=shouldPreloadAstroProfile?readAstrologerProfile():null'));
});


test('Admin home avoids eagerly reading the unused private-consultation history collection', () => {
  const server = read('server.js');
  const start = server.indexOf('app.get("/admin-data"');
  const end = server.indexOf('\n});', start);
  assert.ok(start >= 0 && end > start);
  const route = server.slice(start, end);
  assert.ok(route.includes('readCount("customers",db.collection("smv_users").where("role","==","customer"))'));
  assert.ok(!route.includes('readCollection("smv_private_consultations")'));
  assert.ok(!route.includes('privateConsultations: newestFirst('));
  // The full history remains available through the existing dedicated section route.
  assert.ok(server.includes('app.get("/admin/private-consultations-data"'));
});

test('Admin dashboard reuses commission settings from its existing payload', () => {
  const frontend = read('public/smvastro.mjs');
  assert.ok(frontend.includes("adminData?.settings?.commission||{astroPercent:20,adminPercent:80}"));
  assert.ok(!frontend.includes("getDoc(doc(db,'smv_settings','commission'))"));
  assert.ok(!frontend.includes("getDoc(doc(db,'smv_settings','answer'))"));
  assert.ok(frontend.includes("getDoc(doc(db,'smv_settings','question'))"));
});


test('Customer dashboard live question invalidation uses the same 100-record cap as its data API', () => {
  const events = read('dashboard-events.js');
  const server = read('server.js');
  assert.ok(events.includes("where('customerId','==',user.uid).limit(100)"));
  assert.ok(server.includes("db.collection('smv_questions').where('customerId','==',user.uid).limit(100).get()"));
});


test('Admin landing reads only payment documents used by the Astrologer earnings ledger', () => {
  const server = read('server.js');
  const frontend = read('public/smvastro.mjs');
  const start = server.indexOf('app.get("/admin-data"');
  const end = server.indexOf('\n});', start);
  assert.ok(start >= 0 && end > start);
  const route = server.slice(start, end);
  assert.ok(route.includes('readCollection("smv_payments",db.collection("smv_payments").where("type","==","astrologer_earning").where("status","==","credited"))'));
  assert.ok(frontend.includes("String(p.type||'').toLowerCase()==='astrologer_earning' && String(p.status||'').toLowerCase()==='credited'"));
  // Wallet transactions remain served by their existing dedicated route.
  assert.ok(server.includes('app.get("/admin/wallet/transactions"'));
});


test('Admin home uses aggregate counts and targeted history queries instead of reading all users/questions', () => {
  const server = read('server.js');
  const frontend = read('public/smvastro.mjs');
  const start = server.indexOf('app.get("/admin-data"');
  const end = server.indexOf('\n});', start);
  assert.ok(start >= 0 && end > start);
  const route = server.slice(start, end);
  assert.ok(!route.includes('readCollection("smv_users")'));
  assert.ok(route.includes('readCount("customers",db.collection("smv_users").where("role","==","customer"))'));
  assert.ok(route.includes('readCount("questions",db.collection("smv_questions"))'));
  assert.ok(route.includes('where("status","==","answered").where("commissionStatus","==","credited")'));
  assert.ok(route.includes('pendingAstrologers.map(async a=>'));
  assert.ok(frontend.includes('adminData.customerCount'));
  assert.ok(frontend.includes('adminData.questionCount'));
  assert.ok(frontend.includes('a.adminContactEmail'));
  assert.ok(frontend.includes('a.adminContactMobile'));
  assert.ok(!frontend.includes('const userMap=new Map(users.docs'));
});
