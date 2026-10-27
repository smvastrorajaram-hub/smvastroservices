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
  assert.match(server, /registerLiveSessionRoutes\(\{app,db,FieldValue,crypto,requireUser,isAdminUser,admin,multiProjectFirestore\}\)/);
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

test('Explicit login renders a generic shell only for non-Admin roles; Admin enters Admin directly', () => {
  const frontend = read('public/smvastro.mjs');
  const start = frontend.indexOf('async function submitAuth(mode)');
  const shell = frontend.indexOf('smvRenderFastDashboardShell(loginShellRole);', start);
  const profile = frontend.indexOf('const loginProfile=await getUserProfile(loginCred.user.uid)', start);
  const role = frontend.indexOf('const role=await resolveSmvRole(loginCred.user,profile)', start);
  assert.ok(start >= 0 && shell > start);
  assert.ok(profile > shell, 'Known Customer/Astrologer shell is mounted before profile reads');
  assert.ok(role > profile, 'Role resolution follows the first profile result');
  assert.ok(frontend.includes('const goToAdmin=pendingAfterLogin==="admin" || loginCred.user.uid===ADMIN_UID;'));
  assert.ok(frontend.includes('if(!goToAdmin && loginShellRole){'));
  assert.ok(frontend.includes('smvEnterInternalView("dashboard",true)'));
  assert.ok(!frontend.includes('if(!goToQuestion&&!goToAdmin){'));
  assert.ok(!frontend.includes('Login successful. Opening your dashboard…'));
  assert.ok(!frontend.includes('<h2>DASHBOARD</h2>'));
  assert.ok(frontend.includes('if(!goToAdmin && loginShellRole){'));
  assert.ok(frontend.includes('if($("dashboardTitle"))$("dashboardTitle").textContent=loginShellRole==="astrologer"?"ASTROLOGER DASHBOARD":"CUSTOMER DASHBOARD";'));
});

test('Customer Dashboard loads current Live/Booking and Wallet UI without legacy question histories', () => {
  const frontend = read('public/smvastro.mjs');
  const html = read('public/index.html');
  assert.ok(frontend.includes('smvCustomerBookingChatCardHtml()'));
  assert.ok(frontend.includes('smvWalletDashboardCardHtml()'));
  assert.ok(frontend.includes('smvBindCustomerBookingChat();'));
  assert.ok(frontend.includes('smvBindCustomerWallet({load:false});'));
  assert.ok(!frontend.includes('/customer/consultations'));
  assert.ok(!frontend.includes('/customer/private-consultations'));
  assert.ok(!frontend.includes('Previous Question History'));
  assert.ok(!frontend.includes('My Consultation Requests'));
  assert.ok(!html.includes('smvPublicQuestionWindow'));
  assert.ok(!html.includes('privateConsultationQuestionForm'));
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
  assert.ok(html.includes('smvastro.mjs?v=20261027-four-firestore-read-routing-v1'));
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
  assert.ok(html.includes('smvastro.mjs?v=20261027-four-firestore-read-routing-v1'));
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
  assert.ok(html.includes('smvastro.mjs?v=20261027-four-firestore-read-routing-v1'));
});

test('Astrologer Dashboard renders its main UI before earnings and withdrawal history resolve', () => {
  const frontend = read('public/smvastro.mjs');
  const html = read('public/index.html');
  const start = frontend.indexOf('async function loadDashboard(expectedRole=null,force=false,background=false)');
  const end = frontend.indexOf('function openPayoutChange()', start);
  assert.ok(start >= 0 && end > start);
  const dashboard = frontend.slice(start, end);
  const mainRender = dashboard.indexOf('smv-astrologer-dashboard');
  const earningsHydration = dashboard.indexOf('earningsResultPromise.then(async earningsRead=>{');
  assert.ok(mainRender >= 0);
  assert.ok(earningsHydration > mainRender);
  assert.ok(dashboard.includes('const earningsResultPromise=(async()=>{'));
  assert.ok(!dashboard.includes('let earningsRead=astrologerEarningsPromise?await astrologerEarningsPromise:null;'));
  assert.ok(dashboard.includes('id="smvAstroTotalEarnings"'));
  assert.ok(dashboard.includes('id="smvAstroEarningsHistory"'));
  assert.ok(dashboard.includes('id="smvAstroWithdrawalHistory"'));
  assert.ok(dashboard.includes('id="smvAstroWithdrawalStatus"'));
  assert.ok(html.includes('smvastro.mjs?v=20261027-four-firestore-read-routing-v1'));
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
  assert.ok(events.includes("'withdrawals_payouts','financial','astrologers','astrologer_settings','settings','reviews'"));
  assert.ok(!events.includes("doc('workflow'),kind:'workflow'"));
  assert.ok(!events.includes("'questions','private_consultations','withdrawals_payouts'"));
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
  assert.ok(!frontend.includes("getDoc(doc(db,'smv_settings','question'))"));
});


test('Customer Dashboard event stream does not read retired question notification history', () => {
  const events = read('dashboard-events.js');
  const frontend = read('public/smvastro.mjs');
  assert.ok(events.includes("const refs=[{ref:db.collection('smv_users').doc(user.uid),kind:'profile'}]"));
  assert.ok(!events.includes('smv_notifications'));
  assert.ok(!events.includes("kind:'notifications'"));
  assert.ok(frontend.includes("window.addEventListener('smv:wallet-updated'"));
  assert.ok(frontend.includes("smvLiveStartEventStream"));
});

test('Admin home reads only the Live Session earnings ledger and the current management datasets', () => {
  const server = read('server.js');
  const frontend = read('public/smvastro.mjs');
  const start = server.indexOf('app.get("/admin-data"');
  const end = server.indexOf('\n});', start);
  assert.ok(start >= 0 && end > start);
  const route = server.slice(start, end);
  assert.ok(route.includes('readCount("customers",db.collection("smv_users").where("role","==","customer"))'));
  assert.ok(route.includes('readCollection("smv_astrologers")'));
  assert.ok(route.includes('readCollection("smv_payments",db.collection("smv_payments").where("source","==","live_session"))'));
  assert.ok(!route.includes('smv_questions'));
  assert.ok(!route.includes('smv_private_consultations'));
  assert.ok(!route.includes('privateConsultationWorkflow'));
  assert.ok(!route.includes('getPrivateCommissionSettings()'));
  assert.ok(frontend.includes('adminData.customerCount'));
  assert.ok(frontend.includes('adminData.astrologerCount'));
  assert.ok(!frontend.includes('adminData.questionCount'));
  assert.ok(!frontend.includes('adminEarnedQuestions'));
  assert.ok(frontend.includes("p.source==='live_session'&&p.type==='astrologer_earning'&&p.status==='credited'"));
});

test('Astrologer earnings no longer replay every historical Live Session on dashboard open', () => {
  const server = read('server.js');
  const live = read('live-session-service.js');
  const start = server.indexOf('app.get("/astrologer/earnings"');
  const end = server.indexOf('// V165 withdrawal request:', start);
  assert.ok(start >= 0 && end > start);
  const route = server.slice(start, end);
  assert.ok(!route.includes('syncLiveSessionEarningsForAstrologer'));
  assert.ok(route.includes('.where("status", "==", "answered")'));
  assert.ok(route.includes('.where("commissionStatus", "==", "credited")'));
  assert.ok(route.includes('.where("source", "==", "live_session")'));
  assert.ok(route.includes('.where("type", "==", "astrologer_earning")'));
  assert.ok(route.includes('.select("astrologerCommissionAmount", "commissionAmount").get()'));
  assert.ok(route.includes('.select("astrologerCreditedAmount", "astrologerAmount").get()'));
  assert.ok(route.includes('liveEarningsQuery.orderBy("createdAt", "desc").limit(50).get()'));
  assert.ok(route.includes('AggregateField.sum("earningAmount")'));
  assert.ok(route.includes('ledger:ledger.slice(0,50)'));
  assert.ok(route.includes('historicalEarnings + liveEarningsTotal'));
  assert.ok(route.includes('if(!liveEarningsSnap||liveEarningsTotal===null||!Number.isFinite(liveEarningsTotal))'));
  assert.ok(!route.includes('privateDashboard:'));
  assert.ok(!route.includes('questions,withdrawals'));
  assert.ok(live.includes("paymentId: earningRefDoc.id, type: 'astrologer_earning', source: 'live_session'"));
});

test('Astrologer withdrawal validation does not rescan every Live Session and parallelizes balance reads', () => {
  const server = read('server.js');
  const start = server.indexOf('app.post("/astrologer/withdrawal-request"');
  const end = server.indexOf('\n});', start);
  assert.ok(start >= 0 && end > start);
  const route = server.slice(start, end);
  assert.ok(!route.includes('syncLiveSessionEarningsForAstrologer'));
  assert.ok(route.includes('const [questionSnap, privateCreditSnap, liveCreditSnap, withdrawalSnap] = await Promise.all(['));
  assert.ok(route.includes('.where("source", "==", "live_session")'));
  assert.ok(route.includes('const cooldownMs = 7 * 24 * 60 * 60 * 1000;'));
});

test('Admin navigation does not show the generic DASHBOARD flash before role resolution', () => {
  const frontend = read('public/smvastro.mjs');
  const html = read('public/index.html');
  assert.ok(frontend.includes('const goToAdmin=pendingAfterLogin==="admin" || loginCred.user.uid===ADMIN_UID;'));
  assert.ok(frontend.includes('if(!goToAdmin && loginShellRole){'));
  assert.ok(frontend.includes('if($("dashboardTitle"))$("dashboardTitle").textContent=loginShellRole==="astrologer"?"ASTROLOGER DASHBOARD":"CUSTOMER DASHBOARD";'));
  assert.ok(!frontend.includes('<h2>DASHBOARD</h2>'));
  assert.ok(html.includes('<h2 class="admin-dashboard-title">ADMIN DASHBOARD</h2>'));
});


test('Astrologer earning indexes cover the credited-only queries used for Dashboard and withdrawal validation', () => {
  const indexes = JSON.parse(read('firestore.indexes.json'));
  const has = (collectionGroup, fields) => (indexes.indexes || []).some(index =>
    index.collectionGroup === collectionGroup &&
    fields.every(([fieldPath, order], i) =>
      index.fields[i]?.fieldPath === fieldPath && index.fields[i]?.order === order
    ) &&
    index.fields.length === fields.length
  );
  assert.ok(has('smv_questions', [
    ['astrologerId','ASCENDING'],['status','ASCENDING'],['commissionStatus','ASCENDING']
  ]));
  assert.ok(has('smv_private_consultations', [
    ['astrologerId','ASCENDING'],['commissionStatus','ASCENDING']
  ]));
  assert.ok(has('smv_payments', [
    ['astrologerId','ASCENDING'],['source','ASCENDING'],['type','ASCENDING'],['status','ASCENDING']
  ]));
  assert.ok(has('smv_payments', [
    ['astrologerId','ASCENDING'],['source','ASCENDING'],['type','ASCENDING'],['status','ASCENDING'],['createdAt','DESCENDING']
  ]));
});


test('Four-project Firestore routing stays on the primary project until explicitly enabled', () => {
  const { initializeMultiProjectFirestore, DEFAULT_PROJECT_IDS } = require('../multi-project-firestore');
  const primaryDb = { project: 'primary' };
  const fakeAdmin = makeFakeMultiProjectAdmin();
  const routed = initializeMultiProjectFirestore({
    admin: fakeAdmin, primaryDb, env: { FIREBASE_PROJECT_ID: 'smv-astro' }
  });
  assert.equal(routed.enabled, false);
  assert.equal(routed.consultationsDb, primaryDb);
  assert.equal(routed.liveDataDb, primaryDb);
  assert.equal(routed.contentDb, primaryDb);
  assert.equal(routed.customerHistoryBackfillComplete, false);
  assert.deepEqual(DEFAULT_PROJECT_IDS, {
    primary: 'smv-astro',
    consultations: 'astro-service-ae9e7',
    liveData: 'smv-astro-services',
    content: 'svm-astro'
  });
  assert.equal(fakeAdmin.apps.length, 0);
});

test('Four-project Firestore routing requires unique project IDs and all secondary credentials', () => {
  const { initializeMultiProjectFirestore } = require('../multi-project-firestore');
  const primaryDb = { project: 'primary' };
  assert.throws(() => initializeMultiProjectFirestore({
    admin: makeFakeMultiProjectAdmin(),
    primaryDb,
    env: { SMV_FIRESTORE_MULTI_PROJECT_ENABLED: 'true', FIREBASE_PROJECT_ID: 'smv-astro' }
  }), /FIREBASE_CONSULTATIONS_CLIENT_EMAIL/);
  assert.throws(() => initializeMultiProjectFirestore({
    admin: makeFakeMultiProjectAdmin(),
    primaryDb,
    env: {
      SMV_FIRESTORE_MULTI_PROJECT_ENABLED: 'true',
      FIREBASE_PROJECT_ID: 'smv-astro',
      FIREBASE_CONTENT_PROJECT_ID: 'smv-astro'
    }
  }), /project IDs must be distinct/);
});

test('Enabled four-project routing uses screenshot project IDs and waits for verified backfill flags', () => {
  const { initializeMultiProjectFirestore } = require('../multi-project-firestore');
  const env = {
    SMV_FIRESTORE_MULTI_PROJECT_ENABLED: 'true',
    FIREBASE_PROJECT_ID: 'smv-astro',
    FIREBASE_CONSULTATIONS_CLIENT_EMAIL: 'consultations@astro-service-ae9e7.iam.gserviceaccount.com',
    FIREBASE_CONSULTATIONS_PRIVATE_KEY: 'private-key',
    FIREBASE_LIVE_DATA_CLIENT_EMAIL: 'live-data@smv-astro-services.iam.gserviceaccount.com',
    FIREBASE_LIVE_DATA_PRIVATE_KEY: 'private-key',
    FIREBASE_CONTENT_CLIENT_EMAIL: 'content@svm-astro.iam.gserviceaccount.com',
    FIREBASE_CONTENT_PRIVATE_KEY: 'private-key'
  };
  const primaryDb = { project: 'primary' };
  const admin = makeFakeMultiProjectAdmin();
  const routed = initializeMultiProjectFirestore({ admin, primaryDb, env });
  assert.equal(routed.enabled, true);
  assert.equal(routed.projectIds.primary, 'smv-astro');
  assert.equal(routed.projectIds.consultations, 'astro-service-ae9e7');
  assert.equal(routed.projectIds.liveData, 'smv-astro-services');
  assert.equal(routed.projectIds.content, 'svm-astro');
  assert.notEqual(routed.consultationsDb, primaryDb);
  assert.notEqual(routed.liveDataDb, primaryDb);
  assert.notEqual(routed.contentDb, primaryDb);
  assert.equal(routed.sessionHistoryBackfillComplete, false);
  assert.equal(routed.liveDataBackfillComplete, false);
  assert.equal(routed.contentBackfillComplete, false);
  assert.equal(routed.sessionHistoryMirrorWritesEnabled, false);
  assert.equal(routed.liveDataMirrorWritesEnabled, false);
  assert.equal(routed.contentMirrorWritesEnabled, false);
  assert.equal(admin.apps.length, 3);
});

function makeFakeMultiProjectAdmin() {
  const apps = [];
  const admin = {
    apps,
    credential: { cert: value => value },
    initializeApp(options, name) {
      const app = { name, options };
      apps.push(app);
      return app;
    }
  };
  admin.firestore = app => ({ projectId: app?.options?.credential?.projectId || 'primary', appName: app?.name || 'default' });
  return admin;
}

test('Customer history and public content route only after their explicit copy flags', () => {
  const server = read('server.js');
  const frontend = read('public/smvastro.mjs');
  assert.ok(server.includes('async function readCustomerHistoryCollection(collectionName,uid)'));
  assert.ok(server.includes('SMV_CUSTOMER_HISTORY_CUTOVER_AT'));
  assert.ok(server.includes("consultationsDb.collection(collectionName).where('customerId','==',uid).orderBy('createdAt','desc').limit(100).get()"));
  assert.ok(server.includes("where('createdAt','>=',cutover).orderBy('createdAt','desc')"));
  assert.ok(server.includes("where('updatedAt','>=',cutover).orderBy('updatedAt','desc')"));
  assert.ok(server.includes('for(const snap of [createdAfterCutover,updatedAfterCutover])for(const doc of snap.docs)byId.set(doc.id'));
  assert.ok(server.includes('async function readCustomerHistoryCollection(collectionName,uid)'));
  assert.ok(server.includes('if(!multiProjectFirestore.customerHistoryBackfillComplete)return readPrimary()'));
  assert.ok(server.includes('Customer-history archive read failed; using primary'));
  assert.ok(server.includes('contentStoreDb(){return multiProjectFirestore.contentBackfillComplete?multiProjectFirestore.contentDb:db;}'));
  assert.ok(server.includes("app.get('/public/content'"));
  assert.ok(server.includes(".where('published','==',true).where('language','==','en')"));
  assert.ok(frontend.includes("renderApi('/public/content',{method:'GET'})"));
  assert.ok(!frontend.includes('getDocs(query(collection(db,SMV_CONTENT_COLLECTION),where("published","==",true)'));
  // The current Customer Dashboard deliberately does not fetch retired history as a gate on its first render.
  assert.ok(!frontend.includes("renderApi('/customer/consultations'"));
  assert.ok(!frontend.includes("renderApi('/customer/private-consultations'"));
});

test('Live fallback polling deduplicates same-session in-flight message and signal reads', () => {
  const frontend = read('public/smvastro.mjs');
  assert.ok(frontend.includes('const smvLiveMessagePollsInFlight=new Map();'));
  assert.ok(frontend.includes('const smvLiveSignalPollsInFlight=new Map();'));
  assert.ok(frontend.includes('const pending=smvLiveMessagePollsInFlight.get(key);if(pending)return pending;'));
  assert.ok(frontend.includes('const pending=smvLiveSignalPollsInFlight.get(key);if(pending)return pending;'));
  assert.ok(frontend.includes('if(smvLiveEventStreamConnected)smvLiveStopFallbackPolling();'));
  assert.ok(frontend.includes('else smvLiveStartFallbackPolling();'));
});

test('Live Session auxiliary mirrors do not split the Wallet billing transaction', () => {
  const service = read('live-session-service.js');
  assert.ok(service.includes('tx.create(msgRef, message)'));
  assert.ok(service.includes('tx.create(signalRef, data)'));
  assert.ok(service.includes('void mirrorLiveRecordToSecondary(sessionId, \'messages\', msgRef.id, message, session)'));
  assert.ok(service.includes('void mirrorLiveRecordToSecondary(sessionId, \'signals\', signalRef.id, data, session)'));
  assert.ok(!service.includes('await mirrorLiveRecordToSecondary(sessionId, \'messages\''));
  assert.ok(!service.includes('await mirrorLiveRecordToSecondary(sessionId, \'signals\''));
  assert.ok(service.includes('const sessionHistoryDb = multiProjectFirestore?.sessionHistoryBackfillComplete ? multiProjectFirestore.consultationsDb : null;'));
  assert.ok(service.includes("next.historyArchivedToSecondary = false"));
  assert.ok(service.includes("next.liveAuxStoreReady = true"));
  assert.ok(service.includes("sessionHistoryMirrorWritesEnabled || multiProjectFirestore.sessionHistoryBackfillComplete"));
  assert.ok(service.includes("liveDataMirrorWritesEnabled || liveDataReadDb"));
  assert.ok(service.includes("const messageStoreDb = loaded.data.liveAuxStoreReady === true && liveDataReadDb ? liveDataReadDb : db;"));
  assert.ok(service.includes("const signalStoreDb = loaded.data.liveAuxStoreReady === true && liveDataReadDb ? liveDataReadDb : db;"));
});

test('Secondary-project backfill defaults to dry run and never deletes source documents', () => {
  const script = read('scripts/backfill-multi-project-firestore.js');
  const rules = read('firestore.multi-project.rules');
  assert.ok(script.includes("const APPLY = process.argv.includes('--apply');"));
  assert.ok(script.includes("if (APPLY) await target.doc(doc.id).set(doc.data(), { merge: true });"));
  assert.ok(script.includes("sourceRef.set({"));
  assert.ok(script.includes("SMV_SESSION_HISTORY_MIRROR_WRITES"));
  assert.ok(script.includes("SMV_LIVE_DATA_MIRROR_WRITES"));
  assert.ok(script.includes("SMV_CONTENT_MIRROR_WRITES"));
  assert.ok(script.includes("SMV_CUSTOMER_HISTORY_CUTOVER_AT"));
  assert.ok(script.includes("Refusing to copy while writes can race with the backfill."));
  assert.ok(script.includes("Refusing to copy after secondary reads were enabled."));
  assert.ok(!/\.delete\s*\(/.test(script));
  assert.ok(rules.includes('allow read, write: if false;'));
  assert.ok(read('firebase.multi-project-consultations.json').includes('firestore.multi-project.rules'));
  assert.ok(read('firebase.multi-project-live-data.json').includes('firestore.multi-project.rules'));
  assert.ok(read('firebase.multi-project-content.json').includes('firestore.multi-project.rules'));
});

test('Firestore indexes include public-content and multi-project session-history routing queries', () => {
  const indexes = JSON.parse(read('firestore.indexes.json'));
  const has = (collectionGroup, fields) => indexes.indexes.some(index =>
    index.collectionGroup === collectionGroup &&
    index.fields.length === fields.length &&
    fields.every(([fieldPath, order], i) =>
      index.fields[i]?.fieldPath === fieldPath && index.fields[i]?.order === order
    )
  );
  assert.ok(has('smv_content', [['language','ASCENDING'],['published','ASCENDING']]));
  assert.ok(has('smv_live_sessions', [['customerUid','ASCENDING'],['state','ASCENDING']]));
  assert.ok(has('smv_live_sessions', [['astrologerUid','ASCENDING'],['state','ASCENDING']]));
  assert.ok(has('smv_live_sessions', [['customerUid','ASCENDING'],['state','ASCENDING'],['historyArchivedToSecondary','ASCENDING']]));
  assert.ok(has('smv_live_sessions', [['astrologerUid','ASCENDING'],['state','ASCENDING'],['historyArchivedToSecondary','ASCENDING']]));
});


test('Non-production Firestore cannot silently route into screenshot-named production projects', () => {
  const { initializeMultiProjectFirestore } = require('../multi-project-firestore');
  const apps = [];
  const admin = {
    apps,
    credential: { cert: value => value },
    initializeApp(options, name) { const app = { name, options }; apps.push(app); return app; },
    firestore(app) { return { projectId: app?.options?.credential?.projectId || 'primary' }; }
  };
  assert.throws(() => initializeMultiProjectFirestore({
    admin,
    primaryDb: { project: 'staging' },
    env: { SMV_FIRESTORE_MULTI_PROJECT_ENABLED: 'true', FIREBASE_PROJECT_ID: 'smv-astro-staging' }
  }), /Refusing to connect a non-production primary project to the production secondary projects/);
  assert.equal(apps.length, 0);
});
