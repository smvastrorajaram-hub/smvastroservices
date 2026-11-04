'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('D1 availability uses the active Live-session table and preserves an explicit Busy choice',()=>{
 const service=read('shared/backend-platform/d1-live-session-service.mjs');
 assert.match(service,/FROM \$\{SESSION_TABLE\}[\s\S]*state IN \('ringing','preparing','connecting','active'\)/);
 assert.match(service,/manualAvailabilityStatus\|\|''\)\.toLowerCase\(\)==='busy'/);
 assert.match(service,/manualAvailabilityStatus:requestedStatus==='busy'\?'busy':''/);
 assert.match(service,/const finalAvailabilityStatus=current\.activeSessionCount>0\?'busy':requestedStatus/);
});

test('Astrologer dashboard does not overwrite Busy when Live Call or Chat toggles change',()=>{
 const frontend=read('public/smvastro.mjs');
 assert.match(frontend,/deriveStatusFromModes&&availabilitySelect&&availabilitySelect\.value!=='busy'/);
 assert.match(frontend,/availabilityStatus:availabilitySelect\?\.value\|\|'offline'/);
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



test('Live-session Open Session action stays bright green until ended on both Customer and Astrologer dashboards',()=>{
 const css=read('public/dashboard-typography.css');
 const frontend=read('public/smvastro.mjs');
 const style=css.match(/#dashboardContent #smvLiveDashboardCard \.smv-live-session-open-button\{([^}]*)\}/)?.[1]||'';
 assert.match(style,/color:#00e676/,'default Open Session text is bright green');
 assert.doesNotMatch(style,/color:#ff1744\s*!important/,'typography must not force the active action to red');
 assert.match(frontend,/openButton\.style\.color=ended\?'#ff1744':'#00e676'/,'active/ringing sessions stay bright green and terminal sessions keep their distinct closed colour');
 assert.match(frontend,/openButton\.style\.webkitTextFillColor=ended\?'#ff1744':'#00e676'/,'Android WebView text fill follows the same live-session state');
 assert.match(frontend,/function smvLiveDashboardHtml\(role\)[\s\S]*id="smvLiveDashboardSessions"[\s\S]*smv-live-session-open-button/,'both dashboard roles use the shared Live Sessions list');
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
