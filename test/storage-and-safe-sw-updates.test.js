'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('main site does not clear origin-wide local/session storage or all Cache API entries', () => {
  const html = read('public/index.html');
  assert.doesNotMatch(html, /localStorage\.clear\s*\(/);
  assert.doesNotMatch(html, /sessionStorage\.clear\s*\(/);
  assert.doesNotMatch(html, /caches\.keys\(\)\.then\(keys=>Promise\.all\(keys\.map\(k=>caches\.delete\(k\)\)\)\)/);
  assert.match(html, /smv-v223-scoped-storage-policy/);
});

test('main Service Worker does not force-reload open tabs and preserves offline place cache', () => {
  const sw = read('public/sw.js');
  assert.doesNotMatch(sw, /client\.navigate\s*\(\s*client\.url\s*\)/);
  assert.match(sw, /SMV_LOCATION_CACHE='smv-shared-india-places'/);
  assert.match(sw, /k!==SMV_LOCATION_CACHE/);
  assert.match(sw, /await self\.clients\.claim\(\)/);
});

test('Horoscope Service Worker does not force-reload open report/form tabs and preserves offline cache', () => {
  const sw = read('public/horoscope/sw.js');
  assert.doesNotMatch(sw, /client\.navigate\s*\(\s*client\.url\s*\)/);
  assert.match(sw, /OFFLINE_CACHE='smv-horoscope-offline'/);
  assert.match(sw, /const retained=new Set\(\[OFFLINE_CACHE,SHELL_CACHE\]\)/);
  assert.match(sw, /name\.startsWith\('smv-horoscope-'\)&&!retained\.has\(name\)/);
  assert.match(sw, /await self\.clients\.claim\(\)/);
});


test('main SMV ASTRO caches only the offline UI shell while leaving online-only routes and Horoscope scope isolated', () => {
  const sw = read('public/sw.js');
  assert.ok(sw.includes("APP_SHELL_CACHE='smv-astro-shell-'+SMV_CACHE_RELEASE"));
  assert.ok(sw.includes("SMV_CACHE_RELEASE = IS_PAGES_DEV_HOST ? '20261114-web-push-vapid-render-route-pages-v1' : '20261114-web-push-vapid-render-route-in-v1'"));
  assert.ok(sw.includes('APP_SHELL_FILES'));
  for (const icon of ['./assets/pwa-astro-192.svg','./assets/pwa-astro-512.png','./assets/pwa-astro-maskable-192.svg','./assets/pwa-astro-maskable.svg','./assets/favicon-astro.png','./assets/favicon-astro.ico']) {
    assert.ok(sw.includes(icon), 'SMV ASTRO must precache its manifest icon/favicon: '+icon);
  }
  assert.ok(sw.includes("'./main-location-search.js'"));
  assert.ok(sw.includes("'./horoscope/offline/places/india-manifest.json'"));
  assert.ok(sw.includes("SMV_LOCATION_CACHE='smv-shared-india-places'"));
  assert.ok(sw.includes('prefetchIndiaPlaceShards'));
  assert.ok(sw.includes('isOfflinePlaceAsset(new URL(request.url))?await caches.open(SMV_LOCATION_CACHE):cache'));
  assert.ok(sw.includes('isOnlineOnlyRequest'));
  assert.ok(sw.includes('if(!isStaticPresentationRequest(req,url))return;'));
  assert.ok(sw.includes("if(p==='/horoscope'||p.startsWith('/horoscope/'))return false"));
  assert.ok(sw.includes('k!==SMV_LOCATION_CACHE&&k!==APP_SHELL_CACHE'));
  assert.ok(sw.includes("if(isOfflinePlaceAsset(url))"));
  assert.ok(sw.includes("if(req.mode==='navigate')"));
});

test('Horoscope precaches its UI and required local calculation/WASM assets without caching online services', () => {
  const sw = read('public/horoscope/sw.js');
  assert.ok(sw.includes("SHELL_CACHE='smv-horoscope-shell-'+SMV_CACHE_RELEASE"));
  assert.ok(sw.includes("SMV_CACHE_RELEASE = IS_PAGES_DEV_HOST ? '20261114-web-push-vapid-render-route-pages-v1' : '20261114-web-push-vapid-render-route-in-v1'"));
  assert.ok(sw.includes("OFFLINE_CACHE='smv-horoscope-offline'"));
  assert.ok(sw.includes("LOCATION_CACHE='smv-shared-india-places'"));
  assert.ok(sw.includes('prefetchIndiaPlaceShards'));
  for (const asset of [
    './assets/pwa-horoscope-192.svg','./assets/pwa-horoscope-512.png','./assets/pwa-horoscope-maskable-192.svg','./assets/pwa-horoscope-maskable.svg',
    './assets/favicon-horoscope.png','./assets/favicon-horoscope.ico','./assets/smv-horoscope-header-logo.png',
    './assets/android-app-icon-horoscope-source.png','./android-apk-download.mjs','./android-apk-icons.css',
    './index.html','./boot.mjs','./horoscope.js','./marriage-matching.js',
    './marriage-basic-report.mjs','./matching-timeline.mjs','./d1-15-year-reading.mjs',
    './offline/offline-engine.mjs','./offline/server-wrapper.browser.mjs',
    './offline/swiss_vedic.browser.mjs','./offline/wasm-provider.mjs',
    './offline/transit_panchang.browser.mjs','./offline/astro_advanced.browser.mjs',
    './offline/dasa_engine.browser.mjs','./offline/pvr-longevity-sodhya-timing.browser.mjs',
    './offline/cg-rajan-ayurdaya-pinda.browser.mjs',
    './offline/bv-raman-ayurdaya-report.browser.mjs',
    './offline/vendor/smv-swisseph-local.mjs',
    './offline/vendor/wasm/swisseph.wasm','./offline/vendor/wasm/swisseph.data',
    './offline/places/timezone.mjs','./offline/places/tz-boundary-lookup.mjs'
  ]) assert.ok(sw.includes(asset), 'Missing offline core asset: '+asset);
  assert.ok(sw.includes('const retained=new Set([OFFLINE_CACHE,SHELL_CACHE])'));
  assert.ok(sw.includes('isOnlineOnlyRequest'));
  assert.ok(sw.includes('if(!isStaticPresentationRequest(req,url))return;'));
});

test('Calendar keeps its offline UI/WASM precache and India shard migration while bypassing online-only API routes', () => {
  const sw = read('public/horoscope/calendar/sw.js');
  assert.ok(sw.includes("const CACHE='smv-calendar-forecast-assets-'+SMV_CACHE_RELEASE"));
  assert.ok(sw.includes("SMV_CACHE_RELEASE = IS_PAGES_DEV_HOST ? '20261114-web-push-vapid-render-route-pages-v1' : '20261114-web-push-vapid-render-route-in-v1'"));
  assert.ok(sw.includes('const REQUIRED_CORE = new Set(['));
  assert.ok(sw.includes('await preserveCachedIndiaPlaces(target)'));
  assert.ok(sw.includes("LOCATION_CACHE='smv-shared-india-places'"));
  assert.ok(sw.includes('prefetchIndiaPlaceShards'));
  for (const asset of [
    '../assets/pwa-calendar-192.svg','../assets/pwa-calendar-512.png','../assets/pwa-calendar-maskable-192.svg','../assets/pwa-calendar-maskable.svg',
    '../assets/favicon-calendar.png','../assets/favicon-calendar.ico',
    '../assets/android-app-icon-calendar-source.png','../android-apk-download.mjs','../android-apk-icons.css'
  ]) assert.ok(sw.includes(asset), 'SMV CALENDAR must require and precache its manifest icon/favicon: '+asset);
  assert.ok(sw.includes("'../offline/places/timezone.mjs'"));
  assert.ok(sw.includes("'../offline/places/tz-boundary-lookup.mjs'"));
  assert.ok(sw.includes("'../offline/places/place-display.mjs'"));
  assert.ok(sw.includes("'../location-search-online-offline.js'"));
  assert.ok(sw.includes('isOnlineOnlyRequest'));
  assert.ok(sw.includes('if(!isStaticPresentationRequest(e.request,u))return;'));
});

test('Horoscope place search retains online GeoNames lookup and offline India fallback', () => {
  const location = read('public/horoscope/location-search-online-offline.js');
  assert.ok(location.includes("if(navigator.onLine!==false)"));
  assert.ok(location.includes("'/api/locations/search'"));
  assert.ok(location.includes('const module=await offline()'));
  assert.ok(location.includes("'/api/locations/timezone'"));
});


test('All three app workers bump Pages.dev and .in cache releases together for public content changes', () => {
  const workers = [
    read('public/sw.js'),
    read('public/horoscope/sw.js'),
    read('public/horoscope/calendar/sw.js')
  ];
  const releases = workers.map(source => {
    const match = /const SMV_CACHE_RELEASE\s*=\s*IS_PAGES_DEV_HOST\s*\?\s*'([^']+)'\s*:\s*'([^']+)'/.exec(source);
    assert.ok(match, 'Every app worker must select a host-specific SMV_CACHE_RELEASE');
    return { pages: match[1], legacy: match[2] };
  });
  assert.deepEqual(releases.map(item => item.pages), [
    '20261114-web-push-vapid-render-route-pages-v1',
    '20261114-web-push-vapid-render-route-pages-v1',
    '20261114-web-push-vapid-render-route-pages-v1'
  ]);
  assert.deepEqual(releases.map(item => item.legacy), [
    '20261114-web-push-vapid-render-route-in-v1',
    '20261114-web-push-vapid-render-route-in-v1',
    '20261114-web-push-vapid-render-route-in-v1'
  ]);
  assert.ok(workers[0].includes("APP_SHELL_CACHE='smv-astro-shell-'+SMV_CACHE_RELEASE"));
  assert.ok(workers[0].includes("'./assets/android-app-icon-astro-source.png'"), 'ASTRO directly precaches its launcher PNG');
  assert.ok(workers[1].includes("'./android-apk-icons.css'") && workers[1].includes("'./android-apk-download.mjs'"));
  assert.ok(workers[2].includes("'../android-apk-icons.css'") && workers[2].includes("'../android-apk-download.mjs'"));
  assert.ok(workers[1].includes("SHELL_CACHE='smv-horoscope-shell-'+SMV_CACHE_RELEASE"));
  assert.ok(workers[2].includes("CACHE='smv-calendar-forecast-assets-'+SMV_CACHE_RELEASE"));
  assert.ok(workers[0].includes("SMV_LOCATION_CACHE='smv-shared-india-places'"));
  assert.ok(workers[1].includes("OFFLINE_CACHE='smv-horoscope-offline'"));
});


test('SMV ASTRO checks the root Service Worker update on every app entry', () => {
  const html = read('public/index.html');
  assert.match(html, /navigator\.serviceWorker\.register\('\.\/sw\.js',\{scope:'\.\/',updateViaCache:'none'\}\)\.then\(function\(reg\)/);
  assert.match(html, /reg\.update\(\)\.catch\(function\(\)\{\}\)/);
});


test('Private Chat availability refreshes when the Astrologer List returns and price stays in the Question Form', () => {
  const source = read('public/public-content.mjs');
  assert.match(source, /function refreshPrivateChatAvailability\(\)[\s\S]*loadPrivateChatSettings\(true\)/);
  assert.match(source, /function openAstrologerList\(\)[\s\S]*refreshPrivateChatAvailability\(\)/);
  assert.match(source, /const privateChatButtonLabel='PRIVATE CHAT'/);
  assert.doesNotMatch(source, /PRIVATE CHAT ₹['+]/);
  assert.match(source, /Private Chat Price: \$\{priceLabel\}/);
  assert.match(source, /data-live-action="chat"[\s\S]*data-reviews/);
  const actionStart = source.indexOf('smv-astro-booking-actions');
  const reviewsStart = source.indexOf('smv-inline-reviews hidden', actionStart);
  assert.ok(actionStart >= 0 && reviewsStart > actionStart);
  assert.doesNotMatch(source.slice(actionStart, reviewsStart), /data-reviews/);
  const admin = read('public/index.html');
  assert.match(admin, /id="privateChatAstrologerCommissionPercent"/);
  assert.match(admin, /id="privateChatAdminCommissionPercent"/);
  assert.match(admin, /Private Chat commission is separate from Live \/ Booking commission[\s\S]*100%/);
});


test('Private Chat Admin approval, allocation and refund controls are wired to the Admin queue', () => {
  const app = read('public/smvastro.mjs');
  const html = read('public/index.html');
  assert.match(app, /privateChatAssignmentMode/);
  assert.match(app, /\/admin\/private-chat\/approve-question/);
  assert.match(app, /\/admin\/private-chat\/reject-question/);
  assert.match(app, /\/admin\/private-chat\/approve-answer/);
  assert.match(app, /\/admin\/private-chat\/reject-answer/);
  assert.match(app, /\/admin\/private-chat\/retry-refund/);
  assert.match(app, /\/admin\/private-chat\/sync-refund/);
  assert.doesNotMatch(app, /\/astrologer\/private-chat\/claim/);
  assert.doesNotMatch(app, /data-private-chat-claim/);
  assert.match(app, /direct_selected/);
  assert.match(html, /id="privateChatAssignmentMode"/);
  assert.match(html, /Customer-selected Astrologer/);
  assert.match(html, /Private Chat questions are never shown to all Astrologers/);
  assert.match(app, /Waiting for Admin approval before Customer can view it/);
});

test('Private Chat Answer editor restores Submit at the Admin word count and keeps its heading badge white', () => {
  const app = read('public/smvastro.mjs');
  const css = read('public/smvastro.css');
  assert.match(app, /smv-private-chat-answer-modal/);
  assert.doesNotMatch(app, /smvPrivateChatAnswerClose/);
  assert.match(app, /Minimum words set by Admin/);
  assert.match(app, /submit\.textContent=ready\?'SUBMIT ANSWER'/);
  assert.match(app, /\['input','keyup','change','compositionend','blur'\]/);
  assert.match(app, /\/submit-answer/);
  assert.match(css, /#modal #smvPrivateChatAnswerText\{[^}]*color:#241b16!important/);
  assert.match(css, /#modal #smvPrivateChatAnswerText::placeholder/);
  assert.match(css, /#modal \.smv-private-chat-answer-heading \.badge\{[^}]*color:#fff!important/);
});

test('Private Chat 24-hour reallocation, Customer Review flow and workflow timestamps are wired', () => {
  const app = read('public/smvastro.mjs');
  const backend = read('cloudflare/backend-api/src/private-chat-routes.mjs');
  const review = read('cloudflare/backend-api/src/legacy-business-routes.mjs');
  assert.match(backend, /POST \/admin\/private-chat\/reallocate/);
  assert.match(backend, /24\*60\*60\*1000/);
  assert.match(app, /data-private-chat-admin-action="reallocate"/);
  assert.match(app, /canReallocate/);
  assert.match(app, /data-private-chat-review-form/);
  assert.match(app, /\/customer\/submit-review/);
  assert.match(review, /PRIVATE_CHAT_ANSWER_NOT_VIEWED/);
  assert.match(app, /Razorpay Refund ID/);
  assert.match(app, /Admin rejected answer — refund requested/);
  assert.match(app, /\['Requested',w\.createdAt\|\|w\.requestedAt\],\['Processing',w\.processingAt\]/);
  assert.match(app, /saveEditedReview/);
  assert.match(app, /data-review-edit/);
});

test('Reviews stays inside the Live Chat controls with matching button dimensions', () => {
  const source = read('public/public-content.mjs');
  const chat = source.indexOf('data-live-action="chat"');
  const reviews = source.indexOf('data-reviews', chat);
  const booking = source.indexOf('smv-astro-booking-actions', chat);
  assert.ok(chat >= 0 && reviews > chat && (booking < 0 || reviews < booking));
  assert.match(source, /data-reviews[^>]*height:44px/);
  assert.match(source, /data-live-action="chat"[^>]*height:44px/);
});


test('Customer Question Admin Control uses ON for approval and OFF for open questions and direct answers', () => {
  const admin = read('smvastro.mjs');
  assert.match(admin, /const adminControlOn=!allowWithoutAdminApproval/);
  assert.match(admin, /ADMIN CONTROL ON/);
  assert.match(admin, /ADMIN CONTROL OFF/);
  assert.match(admin, /allowWithoutAdminApproval:nextAllowWithoutAdminApproval/);
  assert.match(admin, /Refunds remain Admin-controlled in both modes/);
});

test('Live Call, Live Chat and Reviews share one equal-size row with Reviews to the right of Chat', () => {
  const source = read('public/public-content.mjs');
  const actions = source.indexOf('smv-live-service-actions');
  const call = source.indexOf('data-live-action="call"', actions);
  const chat = source.indexOf('data-live-action="chat"', call);
  const reviews = source.indexOf('data-reviews', chat);
  assert.ok(actions >= 0 && call > actions && chat > call && reviews > chat);
  assert.match(source, /data-live-action="call"[^>]*height:44px/);
  assert.match(source, /data-live-action="chat"[^>]*height:44px/);
  assert.match(source, /data-reviews[^>]*height:44px/);
});

test('Live review UI hides reviews for failed or non-billable terminal reasons', () => {
  const app = read('public/smvastro.mjs');
  const start = app.indexOf('async function smvLiveLoadDashboard(role)');
  const end = app.indexOf('function smvLiveBindDashboard(role)', start);
  assert.ok(start >= 0 && end > start);
  const dashboard = app.slice(start, end);
  assert.ok(dashboard.includes('reviewBlockedEndReasons.includes(endReason)'));
  assert.ok(dashboard.includes("s.origin==='accepted_booking'"), 'Accepted Live bookings are labeled as Booked Call / Chat');
});
