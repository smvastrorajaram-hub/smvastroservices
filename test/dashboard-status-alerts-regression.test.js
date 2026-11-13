'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('Cloudflare presence is Busy only for started sessions while capacity retains every in-flight state',()=>{
 const service=read('shared/backend-platform/d1-live-session-service.mjs');
 const domain=read('shared/backend-platform/live-session-domain.mjs');
 assert.match(service,/state IN \('ringing','preparing','connecting','active'\)/);
 assert.match(service,/WHERE astrologer_uid=\? AND state='active'/);
 assert.match(service,/const availabilityStatus=startedCount>0\?'busy'/);
 assert.match(service,/const finalAvailabilityStatus=current\.startedSessionCount>0\?'busy':requestedStatus/);
 assert.match(service,/startedSessionCount:startedCount/);
 assert.doesNotMatch(service,/astrologerManualBusy/);
 assert.doesNotMatch(domain,/astrologerManualBusy/);
 assert.match(domain,/return modeEnabled&&Number\.isSafeInteger\(active\)/);
});

test('Astrologer dashboard exposes only Online and Offline manual availability states',()=>{
 const frontend=read('public/smvastro.mjs');
 assert.match(frontend,/<option value="offline">Offline<\/option><option value="online">Online<\/option>/);
 assert.doesNotMatch(frontend,/<option value="busy">Busy<\/option>/);
 assert.match(frontend,/if\(deriveStatusFromModes&&availabilitySelect\)/);
 assert.doesNotMatch(frontend,/manualAvailabilityStatus/);
});

test('Render availability persists manual Busy and keeps session-managed Busy distinct',()=>{
 const service=read('live-session-service.js');
 const server=read('server.js');
 assert.match(service,/function astrologerManualBusy\(/);
 assert.match(service,/astrologerManualBusy\(astro, liveCount\)/);
 assert.match(service,/const canStartNow = liveCount < pricing\.maxConcurrentSessions/);
 assert.match(server,/const manualAvailabilityStatus=availabilityStatus==="busy"\?"busy":""/);
 assert.match(server,/manualAvailabilityStatus,/);
 assert.match(server,/app.get\("\/astrologer\/availability"/);
 assert.match(server,/availabilityStatus:astrologerAvailabilityStatus\(\{\.\.\.astro,manualAvailabilityStatus\},activeCount\)/);
});

test('Native Android Background Alert state is restored from the persisted registration status',()=>{
 const frontend=read('public/smvastro.mjs');
 const service=read('live-session-service.js');
 assert.match(service,/nativeRegistered: registeredPlatforms\.includes\('native-android'\)/);
 assert.match(frontend,/const nativeRegistered=r\.nativeRegistered===true/);
 assert.match(frontend,/enable\.dataset\.registered=nativeRegistered\?'true':'false'/);
});

test('Live booking and session typography follows the requested dashboard scale',()=>{
 const css=read('public/dashboard-typography.css');
 assert.match(css,/\.smv-live-booking-kind[\s\S]*color:#ff1493/);
 assert.match(css,/\.smv-live-booking-detail[\s\S]*font-size:var\(--smv-dashboard-body\)/);
 assert.match(css,/\.smv-live-session-meta b[\s\S]*font-size:var\(--smv-dashboard-body\)/);
 assert.match(css,/\.smv-live-session-open-button[\s\S]*text-decoration:none/);
});



test('Production Worker shares the D1 Live service across legacy route registration blocks',()=>{
 const index=read('cloudflare/backend-api/src/index.mjs');
 assert.ok(index.includes('let gapLiveService = null;'));
 assert.ok(index.includes('gapLiveService = env.DB && sharedWalletAdapter'));
 assert.ok(!index.includes('const gapLiveService = env.DB && sharedWalletAdapter'));
 assert.ok(index.includes('liveService: gapLiveService'));
});



test('Live-session colours keep Customer green, make dismissed Astrologer sessions dark green, and receipts purple',()=>{
 const css=read('public/dashboard-typography.css');
 const frontend=read('public/smvastro.mjs');
 assert.ok(css.includes('#dashboardContent #smvLiveDashboardCard .smv-live-session-open-button{'));
 assert.ok(css.includes('color:#00e676;'),'Customer/default Open Session text retains bright green');
 assert.ok(frontend.includes('windowClosed=ended||smvLiveDismissedSessionIds.has(id);'),'Close Window remains a UI-only dismissed-window state');
 assert.ok(frontend.includes("const dashboardRole=String(window.__smvCurrentRole||'').toLowerCase();"));
 assert.ok(frontend.includes("const actionColor=ended?'#5b2a86':(dashboardRole==='astrologer'&&windowClosed?'#166534':'#00e676');"),'only dismissed, not-ended Astrologer sessions use dark green; ended receipts use dark purple');
 assert.ok(frontend.includes('openButton.style.color=actionColor;'));
 assert.ok(frontend.includes("openButton.classList.toggle('smv-live-session-receipt-action',ended);"),'ended receipts in both roles use the dark-purple receipt class');
 assert.ok(frontend.includes('openButton.style.webkitTextFillColor=actionColor;'),'Android WebView text fill follows the same colour logic');
 assert.ok(frontend.includes('View Session Receipt</button>'),'Customer scheduled receipt label uses title case');
 assert.ok(frontend.includes('smv-plain-text-action smv-live-session-receipt-action'),'scheduled receipt is a plain-text action');
 assert.ok(css.includes('.smv-live-session-receipt-action{')&&css.includes('color:#5b2a86;')&&css.includes('background:transparent;')&&css.includes('border:0;'),'scheduled receipt is dark purple without a button box');
 assert.ok(frontend.includes('function smvLiveDashboardHtml(role)')&&frontend.includes('id="smvLiveDashboardSessions"')&&frontend.includes('smv-live-session-open-button'),'both roles retain the shared Live Sessions list');
});
test('Customer, Astrologer and Admin dashboards share one responsive typography hierarchy',()=>{
 const theme=read('public/smv-ui.css');
 const css=read('public/dashboard-typography.css');
 const html=read('public/index.html');
 const frontend=read('public/smvastro.mjs');
 for(const token of ['--smv-dashboard-title','--smv-dashboard-section','--smv-dashboard-subsection','--smv-dashboard-emphasis','--smv-dashboard-body','--smv-dashboard-support','--smv-dashboard-label','--smv-dashboard-meta','--smv-dashboard-metric']){
  assert.ok(theme.includes(token),'shared type token exists: '+token);
 }
 assert.match(theme,/html\[lang="ta"\] body[\s\S]*--smv-dashboard-body:16px[\s\S]*--smv-dashboard-emphasis-line:1.65/,'Tamil typography gets larger reading sizes and line heights');
 assert.doesNotMatch(css,/font-size:\s*\d+(?:\.\d+)?(?:px|rem|em)/,'dashboard-specific font sizes must use shared tokens');
 assert.match(css,/#dashboardContent \.smv-consultation-item \.smv-question-text[\s\S]*var\(--smv-dashboard-emphasis\)/);
 assert.match(css,/html body #dashboard #dashboardContent :is\(h2,h3\)[\s\S]*var\(--smv-dashboard-section\)/,'shared section heading scale covers the Astrologer dashboard');
 assert.match(css,/#admin \.card:not\(:has\(\.smv-notification-row\)\)>h3[\s\S]*var\(--smv-dashboard-section\)/);
 assert.match(css,/#adminPrivateNotifications \.smv-notification-title[\s\S]*var\(--smv-dashboard-label\)/,'notification title remains separately styled');
 assert.match(css,/#adminPrivateNotifications \.smv-notification-content[\s\S]*var\(--smv-dashboard-meta\)/,'notification body remains separately styled');
 assert.ok(html.indexOf('smv-ui.css')<html.indexOf('dashboard-typography.css'),'shared tokens load before dashboard-specific typography');
 assert.match(html,/smv-ui\.css\?v=20261105-dashboard-typography-hierarchy-v1/,'shared design token stylesheet cache is refreshed');
 assert.match(html,/dashboard-typography\.css\?v=20261105-dashboard-typography-hierarchy-v2/,'dashboard typography cache is refreshed with live-session colour correction');
 assert.match(html,/smvastro\.mjs\?v=20261105-dashboard-typography-hierarchy-v2/,'frontend module cache is refreshed with source changes');
 assert.doesNotMatch(frontend,/loadDashboardTypography/,'dashboard CSS no longer arrives through a late JavaScript injection');
 assert.match(frontend,/id="smvWalletBalance" class="smv-dashboard-metric"/);
 assert.match(frontend,/smv-earnings-total smv-dashboard-metric/);
});
