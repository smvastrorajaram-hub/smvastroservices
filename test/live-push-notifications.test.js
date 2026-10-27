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
  assert.match(server, /const liveSessionSettlementDb=walletDomainDb\(\)/);
  assert.match(server, /registerLiveSessionRoutes\(\{app,db:liveSessionSettlementDb,profileDb:db,FieldValue,crypto,requireUser,isAdminUser,admin,multiProjectFirestore\}\)/);
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

test('Live Chat uses canonical mode/state and native visibility instead of a chat-only CSS layout override', () => {
  const css = read('public/smvastro.css');
  const frontend = read('public/smvastro.mjs');
  const html = read('public/index.html');
  assert.ok(frontend.includes("function smvLiveChatIsActive(session){return smvLiveCanonicalMode(session)==='chat'&&String(session?.state||session?.status||'')==='active';}"));
  assert.ok(frontend.includes("mode=smvLiveCanonicalMode(s),call=mode==='call',chat=mode==='chat'"));
  assert.ok(frontend.includes('if(chatArea)chatArea.hidden=!smvLiveChatIsActive(s);'));
  assert.equal(frontend.includes('smvLiveApplyChatLayout'), false, 'Chat visibility must not depend on a second dynamic layout mutator');
  assert.equal(frontend.includes('smv-live-chat-active'), false, 'no chat-only modal class should be toggled by JavaScript');
  assert.equal(css.includes('.smv-live-chat-active'), false, 'Chat must not depend on a special CSS override block');
  assert.ok(html.includes('smvastro.css?v=20261027-live-chat-natural-source-v4'));
  assert.ok(html.includes('smvastro.mjs?v=20261027-live-chat-two-way-v5'));
});

test('Live Chat connected confirmation requires a rendered message pane and does not open a separate Chat window', () => {
  const frontend = read('public/smvastro.mjs');
  const helperStart = frontend.indexOf('function smvLiveChatBoxIsVisible(){');
  const helperEnd = frontend.indexOf('function smvLiveOpenSession(session,wallet,incoming){', helperStart);
  const visibility = frontend.slice(helperStart, helperEnd);
  assert.ok(visibility.includes("!modal||modal.classList.contains('hidden')||!chat||chat.hidden||!messages"));
  assert.ok(visibility.includes('chatRect.width>0&&chatRect.height>0&&messagesRect.width>0&&messagesRect.height>0'));
  const connectStart = frontend.indexOf("const connectChat=$('smvLiveConnectChat');");
  const connectEnd = frontend.indexOf("const connectMic=$('smvLiveConnectMic');", connectStart);
  const connect = frontend.slice(connectStart, connectEnd);
  assert.ok(connect.includes('smvLiveChatBoxIsVisible()'));
  assert.ok(connect.includes('smvLiveOpenSession(responseSession,null,false);'));
  assert.equal(connect.includes('window.open('), false, 'Connect Chat must stay in the existing session panel');
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
  assert.ok(html.includes('smvastro.mjs?v=20261027-live-chat-two-way-v5'));
});

test('Customer and Astrologer Dashboards mount the Live Call/Chat controls after rendering', () => {
  const frontend = read('public/smvastro.mjs');
  const dashboardStart = frontend.indexOf('async function loadDashboard(expectedRole=null,force=false,background=false)');
  const dashboardEnd = frontend.indexOf('function openPayoutChange()', dashboardStart);
  assert.ok(dashboardStart >= 0 && dashboardEnd > dashboardStart, 'Dashboard render function exists');
  const dashboard = frontend.slice(dashboardStart, dashboardEnd);
  const bindCall = "if(role==='customer'||role==='astrologer')smvLiveBindDashboard(role);";
  const bindAt = dashboard.indexOf(bindCall);
  const readyAt = dashboard.indexOf('dashboardReadyRole=role; smvWatchDashboardEvents(role);', bindAt);
  assert.ok(bindAt >= 0, 'Live Call/Chat panel binding runs in the successful Dashboard render path');
  assert.ok(readyAt > bindAt, 'Live controls mount before the Dashboard is marked ready');
  assert.ok(frontend.includes('function smvLiveBindDashboard(role){'));
  assert.ok(frontend.includes('id="smvLiveAvailability"'));
  assert.ok(frontend.includes('id="smvLiveSetAvailability"'));
  assert.ok(frontend.includes('id="smvLiveCallEnabled"'));
  assert.ok(frontend.includes('id="smvLiveChatEnabled"'));
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
  assert.ok(html.includes('smvastro.mjs?v=20261027-live-chat-two-way-v5'));
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
  assert.ok(html.includes('smvastro.mjs?v=20261027-live-chat-two-way-v5'));
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
  assert.ok(html.includes('smvastro.mjs?v=20261027-live-chat-two-way-v5'));
});

test('Customer fast shell binds Wallet actions without starting a duplicate initial Wallet read', () => {
  const frontend = read('public/smvastro.mjs');
  assert.ok(frontend.includes("smvBindCustomerWallet({load:false});"));
  assert.ok(frontend.includes("function smvBindCustomerWallet({load=true}={}){"));
  assert.ok(frontend.includes("if(load)smvLoadCustomerWallet();"));
});

test('Customer Wallet balance and bonus minutes load after the final Dashboard DOM is mounted', () => {
  const frontend = read('public/smvastro.mjs');
  const start = frontend.indexOf('async function loadDashboard(expectedRole=null,force=false,background=false)');
  const end = frontend.indexOf('function openPayoutChange()', start);
  assert.ok(start >= 0 && end > start, 'Dashboard render function exists');
  const dashboard = frontend.slice(start, end);
  const walletBind = dashboard.lastIndexOf('smvBindCustomerWallet({load:false});');
  const walletLoad = dashboard.indexOf('void smvLoadCustomerWallet();', walletBind);
  const liveBind = dashboard.indexOf("if(role==='customer'||role==='astrologer')smvLiveBindDashboard(role);", walletLoad);
  assert.ok(walletBind >= 0, 'Wallet action handlers are bound after Customer card render');
  assert.ok(walletLoad > walletBind, 'Initial Wallet API read starts after the final Customer DOM is present');
  assert.ok(liveBind > walletLoad, 'Wallet hydration is started without blocking Live Call/Chat dashboard mounting');
  const shellStart = frontend.indexOf("function smvRenderFastDashboardShell(roleValue='')");
  const shellEnd = frontend.indexOf('function smvWalletMoney', shellStart);
  const shell = frontend.slice(shellStart, shellEnd);
  assert.ok(shellStart >= 0 && shellEnd > shellStart);
  assert.equal(shell.includes('void smvLoadCustomerWallet();'), false, 'Temporary shell does not start a duplicate Wallet read');
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
  assert.ok(route.includes('readCollection("smv_payments",walletDomainDb().collection("smv_payments").where("source","==","live_session"))'));
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
  assert.ok(service.includes('const sessionHistoryDb = !walletDomainCutover && multiProjectFirestore?.sessionHistoryBackfillComplete ? multiProjectFirestore.consultationsDb : null;'));
  assert.ok(service.includes("next.historyArchivedToSecondary = false"));
  assert.ok(service.includes("next.liveAuxStoreReady = true"));
  assert.ok(service.includes("sessionHistoryMirrorWritesEnabled || multiProjectFirestore.sessionHistoryBackfillComplete"));
  assert.ok(service.includes("liveDataMirrorWritesEnabled || liveDataReadDb"));
  assert.ok(service.includes('const messageStoreDb = afterMs > 0 ? db : (loaded.data.liveAuxStoreReady === true && liveDataReadDb ? liveDataReadDb : db);'));
  assert.ok(service.includes('Initial history may use the completed archive. Incremental reads must use'));
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

test('Project 3 WebRTC auxiliary data does not change FCM sender project 1', () => {
  const server = read('server.js');
  const worker = read('public/sw.js');
  const live = read('live-session-service.js');
  const multi = read('multi-project-firestore.js');
  assert.ok(server.includes('projectId: process.env.FIREBASE_PROJECT_ID'));
  assert.ok(server.includes('FCM_VAPID_PUBLIC_KEY'));
  assert.ok(worker.includes("projectId: 'smv-astro'"));
  assert.ok(worker.includes("messagingSenderId: '299081899217'"));
  assert.ok(live.includes('admin.messaging().send('));
  assert.ok(live.includes("mirrorLiveRecordToSecondary(sessionId, 'signals'"));
  assert.ok(live.includes("mirrorLiveRecordToSecondary(sessionId, 'messages'"));
  assert.ok(multi.includes("liveData: 'smv-astro-services'"));
  assert.ok(multi.includes("DEFAULT_WALLET_DOMAIN_PROJECT_ID = 'smvastro-services'"));
});

test('Wallet recharge offer endpoints use the selected Wallet financial domain', () => {
  const server = read('server.js');
  const start = server.indexOf('// Admin-managed Wallet recharge bonus-minute Offers.');
  const end = server.indexOf('// The Web Push VAPID public key', start);
  assert.ok(start >= 0 && end > start, 'Wallet offer routes are isolated in the expected section');
  const section = server.slice(start, end);
  assert.equal(
    (section.match(/walletDomainDb\(\)\.collection\('smv_offers'\)/g) || []).length,
    5,
    'public offer reads, Admin offer reads, save and delete use the selected Wallet domain'
  );
  assert.equal(section.includes("db.collection('smv_offers')"), false,
    'Wallet offer endpoints must not bypass the selected financial domain');
});


test('Customer Live Session dashboard status follows the accepted-session SSE update without a manual refresh', () => {
  const frontend = read('public/smvastro.mjs');
  const pollStart = frontend.indexOf('async function smvLivePollSessions(){');
  const pollEnd = frontend.indexOf('function smvLiveRenderScheduledBookings(', pollStart);
  const poll = frontend.slice(pollStart, pollEnd);
  const eventsStart = frontend.indexOf('function smvLiveHandleEvent(ev){');
  const eventsEnd = frontend.indexOf('function smvLiveStopEventStream()', eventsStart);
  const events = frontend.slice(eventsStart, eventsEnd);
  assert.ok(frontend.includes('function smvLiveUpdateDashboardSessionStatus(session){'));
  assert.ok(frontend.includes('data-live-dashboard-status='));
  assert.ok(poll.includes('smvLiveUpdateDashboardSessionStatus(session);'),
    'recovery polling must also update the already-rendered Customer Dashboard status');
  assert.ok(events.includes('smvLiveUpdateDashboardSessionStatus(s);'),
    'accepted/preparing SSE events must update the Dashboard card immediately');
  assert.ok(frontend.includes('smvLiveUpdateDashboardSessionStatus(current);'),
    'the 3-minute preparation countdown must keep the Dashboard status current');
});


test('Live Call transitions from preparation to a clear Customer connect action and replays missed WebRTC offers', () => {
  const frontend = read('public/smvastro.mjs');
  const statusStart = frontend.indexOf('function smvLiveSessionStatusLabel(session){');
  const statusEnd = frontend.indexOf('function smvLivePanelHtml(s,incoming){', statusStart);
  const status = frontend.slice(statusStart, statusEnd);
  const panelStart = frontend.indexOf('function smvLivePanelHtml(s,incoming){');
  const panelEnd = frontend.indexOf('async function smvLivePrintReceipt(', panelStart);
  const panel = frontend.slice(panelStart, panelEnd);
  const handlerStart = frontend.indexOf('function smvLiveOpenSession(session,wallet,incoming){');
  const handlerEnd = frontend.indexOf('function smvLiveDismissSessionUi(', handlerStart);
  const handler = frontend.slice(handlerStart, handlerEnd);
  assert.ok(status.includes("?'Connect to Astrologer':'Connect Customer Call / Microphone'"));
  assert.ok(panel.includes("viewerIsCustomer?'CONNECT TO ASTROLOGER':'CONNECT CUSTOMER CALL / MICROPHONE'"));
  assert.ok(frontend.includes('Tap CONNECT TO ASTROLOGER to start the voice call.'));
  assert.ok(handler.includes('await smvLiveReconcileCallSignals(id);'),
    'a peer that becomes ready after the original offer event must fetch pending signals again');
  assert.ok(frontend.includes('async function smvLiveReconcileCallSignals(id){'));
});

test('Preparation countdown reconciles the server session at zero instead of leaving a stale Connecting/Ringing state', () => {
  const frontend = read('public/smvastro.mjs');
  const server = read('live-session-service.js');
  const countdownStart = frontend.indexOf('function smvLiveUpdatePreparationCountdown(session){');
  const countdownEnd = frontend.indexOf('function smvLiveStartClock(s){', countdownStart);
  const countdown = frontend.slice(countdownStart, countdownEnd);
  assert.ok(countdown.includes('if(seconds===0)smvLiveReconcileExpiredPreparation(id);'));
  assert.ok(frontend.includes("renderApi('/live/sessions',{method:'GET',timeoutMs:10000})"));
  assert.ok(server.includes('Runtime timeouts are in-memory.'));
  assert.ok(server.includes("if (plan.delayMs <= 0)"));
  assert.ok(server.includes('? await completePreparation(row.id)'));
  assert.ok(server.includes('scheduleSessionTimer(row.id, row)'));
});

test('Live Chat state stays active across delayed events and the Connect action verifies rendered Chat visibility', () => {
  const frontend = read('public/smvastro.mjs');
  const helperStart = frontend.indexOf('function smvLiveMergeSessionState(previous,incoming){');
  const helperEnd = frontend.indexOf('function smvLiveSessionStatusLabel(session){', helperStart);
  const merge = frontend.slice(helperStart, helperEnd);
  assert.ok(frontend.includes('const SMV_LIVE_SESSION_STATE_RANK=Object.freeze({ringing:0,preparing:1,connecting:2,active:3,ended:4});'));
  assert.ok(merge.includes('incomingRank<previousRank'));
  assert.ok(merge.includes("previousState==='ended'&&incomingState!=='ended'"));
  const applyStart = frontend.indexOf('function smvLiveApplySession(session){');
  const applyEnd = frontend.indexOf('function smvLiveOpenSession(session,wallet,incoming){', applyStart);
  const apply = frontend.slice(applyStart, applyEnd);
  assert.ok(apply.includes('smvLiveMergeSessionState(smvLiveCurrentSession,{...session,id:smvLivePanelSessionId})'));
  const dashboardStart = frontend.indexOf('function smvLiveUpdateDashboardSessionStatus(session){');
  const dashboardEnd = frontend.indexOf('async function smvLivePollSessions(){', dashboardStart);
  assert.ok(frontend.slice(dashboardStart, dashboardEnd).includes('smvLiveMergeSessionState(previous,{...session,id})'));
  const connectStart = frontend.indexOf("const connectChat=$('smvLiveConnectChat');");
  const connectEnd = frontend.indexOf("const connectMic=$('smvLiveConnectMic');", connectStart);
  const connect = frontend.slice(connectStart, connectEnd);
  assert.ok(connect.includes("if(responseId!==id)throw new Error("));
  assert.ok(connect.includes('smvLiveOpenSession(responseSession,null,false);'));
  assert.ok(connect.includes('smvLiveChatBoxIsVisible()'));
  assert.ok(connect.includes('smvLivePollMessages(id).catch(()=>{});'));
});

test('Live Chat message rendering never marks a message seen before a message box exists, and preserves both sides of the chat', () => {
  const frontend = read('public/smvastro.mjs');
  const server = read('live-session-service.js');
  const appendStart = frontend.indexOf('function smvLiveAppendMessage(m){');
  const appendEnd = frontend.indexOf('const smvLiveMessagePollsInFlight', appendStart);
  const append = frontend.slice(appendStart, appendEnd);
  const sendStart = server.indexOf('async function sendMessage(sessionId, senderUid, text)');
  const sendEnd = server.indexOf('async function signal(sessionId, senderUid, type, payload)', sendStart);
  const send = server.slice(sendStart, sendEnd);
  assert.ok(append.indexOf("const host=$('smvLiveMessages');if(!host") < append.indexOf('smvLiveMessageSeen.add(m.id)'));
  assert.ok(append.includes('body.textContent=String(m.text||\'\')'));
  assert.ok(frontend.includes("ev.type==='live.chat.message'&&ev.message?.sessionId===smvLivePanelSessionId"));
  assert.ok(send.includes('current.customerUid !== senderUid && current.astrologerUid !== senderUid'));
  assert.ok(send.includes("current.state !== 'active'"));
  assert.ok(send.includes("sendToParticipants(session, { type: 'live.chat.message', message: safe })"));
  assert.ok(server.includes("messageQuery.limit(afterMs > 0 ? 50 : 100)"));
});


test('Live and booked Call/Chat sessions share the same timeout, readiness and settlement lifecycle', () => {
  const live = read('live-session-service.js');
  const frontend = read('public/smvastro.mjs');
  const acceptedBookingStart = live.indexOf('async function acceptBooking(');
  const acceptedBookingEnd = live.indexOf('async function acceptSession(', acceptedBookingStart);
  const acceptedBooking = live.slice(acceptedBookingStart, acceptedBookingEnd);
  const scheduledStart = live.indexOf("app.post('/live/scheduled-appointments/:id/start'");
  const scheduledEnd = live.indexOf("app.post('/live/requests'", scheduledStart);
  const scheduled = live.slice(scheduledStart, scheduledEnd);
  const directRequest = live.slice(live.indexOf("app.post('/live/requests'"), live.indexOf("app.get('/live/sessions'", live.indexOf("app.post('/live/requests'")));
  assert.ok(acceptedBooking.includes("state: 'preparing', origin: 'accepted_booking'"));
  assert.ok(acceptedBooking.includes('scheduleSessionTimer(id, txResult.data);'));
  assert.ok(acceptedBooking.includes("type: 'live.session.request'"));
  assert.ok(scheduled.includes('const accepted = await acceptSession(result.session.id, uid);'));
  assert.ok(scheduled.includes("bookingStatus: isSession ? 'in_progress' : 'waiting_for_online'"));
  assert.ok(directRequest.includes('const result = await createRequest('));
  assert.ok(frontend.includes("if(s.state==='connecting'&&!call&&String(s.customerUid||'')===String(currentUser?.uid||''))smvLiveMarkReady(s.id,false)"));
  assert.ok(frontend.includes("id=\"smvLiveConnectChat\""));
  assert.ok(live.includes('const release = reservedAmount - charge;'));
  assert.ok(live.includes('const commission = Number.isFinite(savedAstroPercent)'));
  assert.ok(live.includes('earningRefDoc = earningRef(id);'));
});



test('Live Session timer failures retry settlement with bounded backoff and log the selected Firestore project', () => {
  const service = read('live-session-service.js');
  const server = read('server.js');
  const timerStart = service.indexOf('function scheduleSessionTimerRetry(sessionId, data, reason, error)');
  const timerEnd = service.indexOf('function scheduleSessionTimer(sessionId, data)', timerStart);
  const retry = service.slice(timerStart, timerEnd);
  assert.ok(retry.includes('const retryDelayMs = Math.min(60_000, 5_000 * (2 ** Math.min(attempt - 1, 4)));'));
  assert.ok(retry.includes("else await endSession(sessionId, '', reason, true);"));
  assert.ok(retry.includes('scheduleSessionTimerRetry(sessionId, data, reason, retryError);'));
  assert.ok(retry.includes("'[Live Session] Timer operation failed; retry queued:'"));
  assert.ok(server.includes("console.info('[Live Session] Settlement Firestore route:'"));
  assert.ok(server.includes('walletDomainCutoverComplete:multiProjectFirestore.walletDomainCutoverComplete===true'));
  assert.ok(server.includes('db:liveSessionSettlementDb'));
});

test('Customer and Astrologer Live Chat messages broadcast both ways and recover recent writes from the primary store', () => {
  const frontend = read('public/smvastro.mjs');
  const service = read('live-session-service.js');
  const sendStart = service.indexOf('async function sendMessage(sessionId, senderUid, text)');
  const sendEnd = service.indexOf('async function signal(sessionId, senderUid, type, payload)', sendStart);
  const send = service.slice(sendStart, sendEnd);
  const messagesRoute = service.slice(service.indexOf("app.get('/live/sessions/:id/messages'"), service.indexOf('async function restoreTimers()'));
  assert.ok(send.includes("sendToParticipants(session, { type: 'live.chat.message', message: safe });"));
  assert.ok(!send.includes("sendTo(recipientUid, { type: 'live.chat.message', message: safe });"));
  assert.ok(service.includes('function sendToParticipants(session, payload)'));
  assert.ok(service.includes('sendTo(session.customerUid, payload);'));
  assert.ok(service.includes('sendTo(session.astrologerUid, payload);'));
  assert.ok(messagesRoute.includes('const messageStoreDb = afterMs > 0 ? db :'));
  assert.ok(frontend.includes('let smvLiveChatRecoveryTimer=null,smvLiveChatRecoverySessionId=\'\';'));
  assert.ok(frontend.includes('smvLivePollMessages(key).catch(()=>{});'));
  assert.ok(frontend.includes('},1500);'));
  assert.ok(frontend.includes('if(chat&&active)smvLiveStartChatRecovery(s.id,s);'));
});

test('Live Chat and Call recover messages/signals after an SSE reconnect without consuming messages when the chat pane is absent', () => {
  const frontend = read('public/smvastro.mjs');
  const helperStart = frontend.indexOf('async function smvLiveReconcileAfterEventStreamConnect(){');
  const helperEnd = frontend.indexOf('function smvLiveHandleEvent(ev){', helperStart);
  const helper = frontend.slice(helperStart, helperEnd);
  const pollStart = frontend.indexOf('async function smvLivePollMessages(id){');
  const pollEnd = frontend.indexOf('const smvLiveSignalPollsInFlight', pollStart);
  const poll = frontend.slice(pollStart, pollEnd);
  const streamStart = frontend.indexOf('function smvLiveStartEventStream(){');
  const streamEnd = frontend.indexOf('function smvLiveBindPushOpenListener()', streamStart);
  const stream = frontend.slice(streamStart, streamEnd);
  assert.ok(helper.includes('await smvLivePollSessions()'));
  assert.ok(helper.includes('await smvLivePollMessages(id)'));
  assert.ok(helper.includes('await smvLiveReconcileCallSignals(id)'));
  assert.ok(stream.includes('smvLiveReconcileAfterEventStreamConnect().catch(()=>{});'));
  assert.ok(poll.includes("if(!key||!$('smvLiveMessages'))return;"));
  assert.ok(poll.includes('if(!$(' + "'smvLiveMessages'" + '))break;'));
  assert.ok(poll.includes('(appended||smvLiveMessageSeen.has(messageId))'));
});
