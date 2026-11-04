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
 assert.match(css,/\.smv-live-booking-detail[\s\S]*font-size:15px/);
 assert.match(css,/\.smv-live-session-meta b[\s\S]*font-size:16px/);
 assert.match(css,/\.smv-live-session-open-button[\s\S]*text-decoration:none/);
});



test('Production Worker shares the D1 Live service across legacy route registration blocks',()=>{
 const index=read('cloudflare/backend-api/src/index.mjs');
 assert.ok(index.includes('let gapLiveService = null;'));
 assert.ok(index.includes('gapLiveService = env.DB && sharedWalletAdapter'));
 assert.ok(!index.includes('const gapLiveService = env.DB && sharedWalletAdapter'));
 assert.ok(index.includes('liveService: gapLiveService'));
});
