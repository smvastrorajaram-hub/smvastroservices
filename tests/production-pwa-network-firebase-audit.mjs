/**
 * Live, low-volume production audit:
 * - Chromium fresh-profile / SW-cache reset + reinstall simulation
 * - real navigation/resource transfer sizes and request timings
 * - Calendar PWA lazy GeoNames shard caching
 * - anonymous Firestore/backend call counts at idle, during DOM/language changes,
 *   and around the single published-rule read
 *
 * No credentials, request bodies, cookies, auth tokens, or user data are saved.
 * Actual Android launcher install/uninstall is not simulated by headless Chromium.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

const BASE = String(process.env.SMV_PRODUCTION_BASE_URL || 'https://smvastroservices.pages.dev').replace(/\/+$/, '');
const HOROSCOPE_URL = BASE + '/horoscope/';
const CALENDAR_URL = BASE + '/horoscope/calendar/';
const OUT_DIR = new URL('../artifacts/', import.meta.url);
const REPORT_PATH = new URL('../artifacts/production-pwa-network-firebase-profile.json', import.meta.url);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let currentPhase = 'startup';
let activeCollector = null;
function setPhase(name) { currentPhase = name; console.log('[profile-phase] ' + name); }
function instrumentPage(page) {
  const nativeEvaluate = page.evaluate.bind(page);
  page.evaluate = (...args) => {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Page JavaScript did not answer within 12000ms; phase=' + currentPhase)), 12000);
    });
    return Promise.race([nativeEvaluate(...args), timeout]).finally(() => clearTimeout(timer));
  };
  return page;
}
const safeUrl = raw => {
  try { const u = new URL(raw); return { origin: u.origin, path: u.pathname }; }
  catch { return { origin: 'unparseable', path: '/' }; }
};
const stripComments = value => value.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const isPlaceShard = raw => {
  const p = safeUrl(raw).path;
  return /\/offline\/places\/india\/[^/]+\.json$/i.test(p) && !/india-manifest\.json$/i.test(p);
};
const rpcClass = raw => {
  const u = safeUrl(raw), p = u.path;
  if (u.origin.includes('firestore.googleapis.com')) {
    if (/documents:batchGet/i.test(p)) return 'Firestore documents:batchGet';
    if (/documents:runQuery/i.test(p)) return 'Firestore documents:runQuery';
    if (/documents:commit/i.test(p)) return 'Firestore documents:commit';
    if (/Firestore\/Listen\/channel/i.test(p)) return 'Firestore Listen channel';
    if (/Firestore\/Write\/channel/i.test(p)) return 'Firestore Write channel';
    if (/\/documents\//i.test(p)) return 'Firestore document endpoint';
    return 'Firestore other';
  }
  if (u.origin.includes('identitytoolkit.googleapis.com')) return 'Firebase Auth identity toolkit';
  if (u.origin.includes('securetoken.googleapis.com')) return 'Firebase Auth secure token';
  if (u.origin.includes('smvastroservices.onrender.com')) return 'SMV Render backend';
  return null;
};
const cleanRequest = item => ({
  targetType: item.targetType,
  origin: safeUrl(item.url).origin,
  path: safeUrl(item.url).path.replace(/\/documents\/.*/, '/documents/[redacted]'),
  method: item.method,
  resourceType: item.resourceType,
  status: item.status ?? null,
  durationMs: item.durationMs == null ? null : +item.durationMs.toFixed(1),
  transferredBytes: item.transferredBytes ?? null,
  failure: item.failure || null,
  fromServiceWorker: !!item.fromServiceWorker
});

function networkCollector(browser) {
  const entries = [];
  const attached = new WeakSet();
  let counter = 0;
  async function attach(target) {
    if (attached.has(target)) return;
    if (!['page', 'service_worker', 'worker', 'shared_worker', 'iframe'].includes(target.type())) return;
    attached.add(target);
    let cdp;
    try { cdp = await target.createCDPSession(); await cdp.send('Network.enable'); }
    catch { return; }
    const targetType = target.type();
    const sessionId = targetType + '-' + (++counter);
    const pending = new Map();
    cdp.on('Network.requestWillBeSent', event => {
      const raw = event.request?.url || '';
      const item = {
        key: sessionId + ':' + event.requestId,
        targetType,
        url: raw,
        method: event.request?.method || 'GET',
        resourceType: event.type || 'Other',
        startTimestamp: event.timestamp,
        startedAt: Number(event.wallTime || 0) * 1000 || Date.now(),
        status: null,
        transferredBytes: null,
        durationMs: null,
        failure: null,
        fromServiceWorker: false
      };
      const previous = pending.get(event.requestId);
      if (previous) {
        previous.failure = 'redirected';
        previous.endedAt = Date.now();
        entries.push(previous);
      }
      pending.set(event.requestId, item);
    });
    cdp.on('Network.responseReceived', event => {
      const item = pending.get(event.requestId);
      if (!item) return;
      item.status = Number(event.response?.status || 0);
      item.mimeType = event.response?.mimeType || '';
      item.fromServiceWorker = !!event.response?.fromServiceWorker;
    });
    cdp.on('Network.loadingFinished', event => {
      const item = pending.get(event.requestId);
      if (!item) return;
      item.transferredBytes = Math.max(0, Number(event.encodedDataLength || 0));
      item.durationMs = Number.isFinite(event.timestamp) && Number.isFinite(item.startTimestamp)
        ? Math.max(0, (event.timestamp - item.startTimestamp) * 1000) : null;
      item.endedAt = Date.now();
      entries.push(item);
      pending.delete(event.requestId);
    });
    cdp.on('Network.loadingFailed', event => {
      const item = pending.get(event.requestId);
      if (!item) return;
      item.failure = String(event.errorText || 'network failure').slice(0, 100);
      item.endedAt = Date.now();
      entries.push(item);
      pending.delete(event.requestId);
    });
    try { await cdp.send('Network.setCacheDisabled', { cacheDisabled: true }); } catch {}
  }
  browser.on('targetcreated', target => { void attach(target); });
  return {
    attach,
    entries,
    mark: () => ({ index: entries.length, time: Date.now() }),
    since: mark => entries.slice(mark.index).filter(x => x.startedAt >= mark.time - 500),
    all: () => entries.slice()
  };
}
function percentile(values, q) {
  if (!values.length) return null;
  const a = values.slice().sort((x,y) => x-y);
  return +a[Math.min(a.length-1, Math.ceil(q*a.length)-1)].toFixed(1);
}
function summarizeNetwork(items) {
  const completed = items.filter(x => x.transferredBytes != null);
  const workerWire = completed.filter(x => x.targetType === 'service_worker' || x.targetType === 'worker');
  const wire = completed.filter(x => {
    if (x.targetType === 'service_worker' || x.targetType === 'worker') return true;
    if (x.targetType !== 'page') return !x.fromServiceWorker;
    if (!x.fromServiceWorker) return true;
    // If the underlying worker fetch was captured, don't count the service-worker
    // response body a second time. If target attach missed it, preserve the page
    // response transfer instead of silently reporting zero bytes.
    return !workerWire.some(w => w.url === x.url && Math.abs(w.startedAt - x.startedAt) < 5000);
  });
  const durations = wire.map(x => x.durationMs).filter(Number.isFinite);
  const resourceBytes = {};
  for (const x of wire) {
    const k = String(x.resourceType || 'Other').toLowerCase();
    resourceBytes[k] = (resourceBytes[k] || 0) + Number(x.transferredBytes || 0);
  }
  const perOrigin = {};
  for (const x of wire) {
    const host = safeUrl(x.url).origin;
    if (!perOrigin[host]) perOrigin[host] = {requests:0,transferredBytes:0};
    perOrigin[host].requests++;
    perOrigin[host].transferredBytes += Number(x.transferredBytes || 0);
  }
  return {
    requestEvents: items.length,
    completedRequests: completed.length,
    failedRequests: items.filter(x => x.failure && x.failure !== 'redirected').map(cleanRequest).slice(0,20),
    wireRequests: wire.length,
    transferredBytes: wire.reduce((s,x)=>s+Number(x.transferredBytes||0),0),
    resourceBytes,
    durationMs:{p50:percentile(durations,.50),p95:percentile(durations,.95),max:durations.length?+Math.max(...durations).toFixed(1):null},
    byOrigin:perOrigin,
    firestore: countRpc(items,'Firestore '),
    renderBackend: countRpc(items,'SMV Render backend')
  };
}
function countRpc(items, prefix) {
  const rows = items.filter(x => String(rpcClass(x.url)||'').startsWith(prefix));
  const byClass = {};
  for (const x of rows) {
    const k = rpcClass(x.url);
    if (!byClass[k]) byClass[k] = {requests:0,statuses:{}};
    byClass[k].requests++;
    const status = x.status == null ? 'no-response' : String(x.status);
    byClass[k].statuses[status] = (byClass[k].statuses[status] || 0) + 1;
  }
  return {requests:rows.length,byClass,rows:rows.map(cleanRequest).slice(0,20)};
}
async function navigate(page, url, collector, label) {
  const mark = collector.mark();
  const started = Date.now();
  console.log('[audit] navigate:start',label,safeUrl(url).path);
  const response = await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});
  console.log('[audit] navigate:domcontentloaded',label,'status',response?.status()??null,'ms',Date.now()-started);
  // Listen to the Chromium-level load event, not a page.evaluate timer. A busy
  // or frozen page main thread must not block this harness's diagnostic timeout.
  await Promise.race([new Promise(resolve=>page.once('load',resolve)),sleep(12000)]);
  const pageLoadWallClockMs = Date.now()-started;
  await sleep(1200);
  setPhase(label + ': read navigation timing');
  const timing = await page.evaluate(() => {
    const n = performance.getEntriesByType('navigation')[0];
    if (!n) return null;
    const delta = k => Number.isFinite(n[k]) && n[k] > 0 ? +(n[k] - n.startTime).toFixed(1) : null;
    return {
      protocol: n.nextHopProtocol || '',
      transferSize: Number(n.transferSize || 0),
      encodedBodySize: Number(n.encodedBodySize || 0),
      decodedBodySize: Number(n.decodedBodySize || 0),
      responseStartMs: delta('responseStart'),
      domContentLoadedMs: delta('domContentLoadedEventEnd'),
      loadEventMs: delta('loadEventEnd')
    };
  });
  const rec = {
    label,url: safeUrl(url),httpStatus:response?.status() ?? null,
    pageLoadWallClockMs, browserNavigation:timing,
    network:summarizeNetwork(collector.since(mark))
  };
  assert.equal(rec.httpStatus,200,label+' production document must return HTTP 200');
  assert.ok(rec.network.completedRequests>0,label+' should contain measurable network resources');
  return rec;
}
async function registrationState(page) {
  return page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return {supported:false};
    const ready = await Promise.race([
      navigator.serviceWorker.ready.then(r => ({reg:r})),
      new Promise(resolve => setTimeout(() => resolve({reg:null,timeout:true}),35000))
    ]);
    let reg = ready.reg || await navigator.serviceWorker.getRegistration().catch(()=>null);
    return {
      supported:true, ready:!!ready.reg, timeout:!!ready.timeout,
      scope:reg?.scope||null,
      activeScript:reg?.active?.scriptURL||null,
      state:reg?.active?.state||null,
      controlled:!!navigator.serviceWorker.controller,
      controllerScript:navigator.serviceWorker.controller?.scriptURL||null
    };
  });
}
async function manifestInfo(page) {
  return page.evaluate(async () => {
    const el=document.querySelector('link[rel="manifest"]');
    if(!el)return {href:null};
    const res=await fetch(el.href,{cache:'no-store'});
    let m=null;try{m=await res.json()}catch{}
    return {href:new URL(el.href).pathname,status:res.status,name:m?.name||null,scope:m?.scope||null,start_url:m?.start_url||null,
      icons:(m?.icons||[]).map(i=>({src:i.src,sizes:i.sizes,purpose:i.purpose||'any'}))};
  });
}
async function cacheEntries(page) {
  return page.evaluate(async () => {
    const names=await caches.keys();
    const rows=[];
    for(const name of names){
      const cache=await caches.open(name);
      for(const req of await cache.keys()){
        const u=new URL(req.url);
        if(/\/offline\/places\/india\/[^/]+\.json$/i.test(u.pathname))
          rows.push({cache:name,path:u.pathname});
      }
    }
    return {cacheNames:names,placeShards:rows};
  });
}
async function resetAnonymousProfile(page, context) {
  await page.evaluate(async () => {
    const regs = await navigator.serviceWorker?.getRegistrations?.() || [];
    await Promise.all(regs.map(r=>r.unregister().catch(()=>false)));
    for(const name of await caches.keys()) await caches.delete(name).catch(()=>false);
    try{localStorage.clear();sessionStorage.clear();}catch{}
    try{
      if(indexedDB.databases){
        const dbs=await indexedDB.databases();
        await Promise.all(dbs.map(d=>d.name?new Promise(resolve=>{
          const q=indexedDB.deleteDatabase(d.name);q.onsuccess=q.onerror=q.onblocked=()=>resolve();
          setTimeout(resolve,1500);
        }):Promise.resolve()));
      }
    }catch{}
  });
  try { await context.clearCookies(); } catch {}
  await sleep(250);
}
async function run() {
  const report = {
    generatedAt:new Date().toISOString(),
    environment:{platform:process.platform,node:process.version,baseOrigin:safeUrl(BASE).origin,browserVersion:null},
    methodology:{
      networkCacheDisabled:true,networkThrottling:'none (real GitHub Actions runner network)',
      transferMeasurement:'Chromium CDP Network.loadingFinished encodedDataLength; browser performance navigation timings',
      pwaReset:'fresh anonymous Chromium process/context, then unregister service workers + clear CacheStorage/localStorage/sessionStorage/IndexedDB + reload',
      firebaseScope:'anonymous public Horoscope page; no login, no writes, one read-only published-rules fetch',
      deviceLimitation:'No physical Android handset or Android launcher is attached. This verifies the installed web service-worker/manifest lifecycle in a mobile-emulated Chromium browser, not the Android home-screen installation UI.'
    },
    checks:{},networkTrials:[],firebaseProfile:{},androidDeviceValidation:{status:'NOT_RUN',reason:'No attached Android device/ADB or launcher available in this run; browser cold-reinstall simulation is recorded separately.'}
  };
  const ruleSync = fs.readFileSync(new URL('../public/horoscope/prediction-rules-sync.mjs',import.meta.url),'utf8');
  const reportStore = fs.readFileSync(new URL('../public/horoscope/report-store.mjs',import.meta.url),'utf8');
  const ruleCode = stripComments(ruleSync), storeCode = stripComments(reportStore);
  assert.ok(ruleSync.includes('getDocFromServer') && ruleSync.includes('if(initial)return initial'),'published rules use the coalesced lazy read');
  assert.ok(!/\b(onSnapshot|setInterval|MutationObserver)\b/.test(ruleCode),'published rules do not install realtime/polling/DOM-triggered readers');
  assert.ok(!/\b(onSnapshot|setInterval|MutationObserver)\b/.test(storeCode),'saved report sync has no realtime listener, polling timer, or MutationObserver');
  report.checks.sourceQuotaGuard={pass:true,publishedRulesRead:'single-flight on first explicit calculation/admin entry',savedReports:'local IndexedDB-first; no periodic/listener/MutationObserver reads'};
  await mkdir(OUT_DIR,{recursive:true});
  console.log('[audit] browser:launch');
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
    defaultViewport: chromium.defaultViewport,
    dumpio: true,
    protocolTimeout: 360000
  });
  report.environment.browserVersion=await browser.version();
  console.log('[audit] browser:ready',report.environment.browserVersion);
  const collector=networkCollector(browser);
  try {
    const context=browser.defaultBrowserContext();
    const page=await browser.newPage();
    await page.setViewport({width:390,height:844,deviceScaleFactor:3,isMobile:true,hasTouch:true});
    await page.setUserAgent('Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36');
    await collector.attach(page.target());

    console.log('[audit] phase:horoscope-cold-start');
    const first=await navigate(page,HOROSCOPE_URL,collector,'horoscope cold profile / first navigation');
    console.log('[audit] phase:horoscope-pwa-registration');
    const firstSw=await registrationState(page);
    console.log('[audit] horoscope-sw-state',JSON.stringify(firstSw));
    const firstManifest=await manifestInfo(page);
    report.networkTrials.push(first);
    report.checks.horoscopeInitialPwa={http200:first.httpStatus===200,serviceWorker:firstSw,manifest:firstManifest};
    assert.ok(firstSw.supported && firstSw.ready && /\/horoscope\/sw\.js$/.test(firstSw.activeScript||''),'Horoscope service worker must install and activate in the fresh profile');
    assert.equal(firstManifest.status,200,'Horoscope web manifest must load');
    assert.ok((firstManifest.icons||[]).some(i=>i.sizes==='192x192') && (firstManifest.icons||[]).some(i=>i.sizes==='512x512'),'manifest must expose 192px and 512px app icons');

    console.log('[audit] phase:repeat-navigation');
    for(let i=2;i<=3;i++) report.networkTrials.push(await navigate(page,HOROSCOPE_URL,collector,'horoscope no-HTTP-cache navigation '+i));
    console.log('[audit] phase:idle-firestore-profile');

    setPhase('measure idle scroll, DOM mutation, and language switching');
    const baselineMark=collector.mark();
    const baselineFirestore=countRpc(collector.all(),'Firestore ');
    const baselineRender=countRpc(collector.all(),'SMV Render backend');
    await page.evaluate(async () => {
      for(let i=0;i<5;i++){
        window.scrollTo(0,document.body.scrollHeight);
        window.scrollTo(0,0);
      }
      const root=document.createElement('div');
      root.hidden=true;root.dataset.auditMutation='1';document.body.appendChild(root);
      for(let i=0;i<20;i++) root.textContent='quota-neutral DOM mutation '+i;
      root.remove();
      document.getElementById('languageTamil')?.click();
      document.getElementById('languageEnglish')?.click();
    });
    await sleep(1800);
    const afterInteraction=collector.all();
    const interactionRequests=collector.since(baselineMark);
    const interactionFirestore=countRpc(interactionRequests,'Firestore ');
    const interactionRender=countRpc(interactionRequests,'SMV Render backend');
    assert.equal(interactionFirestore.requests,0,'scroll, DOM mutation and language switching must not trigger a Firestore request');
    assert.equal(interactionRender.requests,0,'idle UI changes must not call the Render backend');
    report.firebaseProfile.idleInteraction={
      firestoreBefore:baselineFirestore.requests,renderBefore:baselineRender.requests,
      firestoreRequestsAdded:interactionFirestore.requests,renderRequestsAdded:interactionRender.requests,
      scenarios:['5 scroll-to-bottom/top cycles','20 benign DOM mutations','Tamil language toggle','English language toggle'],
      pass:true
    };

    console.log('[audit] phase:published-rules-read');
    const rulesMark=collector.mark();
    const rulesReady=await page.evaluate(async () => {
      if(!window.SMVPredictionRulesSync?.ensureReady)return {available:false};
      try{await window.SMVPredictionRulesSync.ensureReady();return {available:true,settled:true};}
      catch(e){return {available:true,settled:false,error:String(e?.message||e).slice(0,120)};}
    });
    await sleep(1200);
    const firstReadSlice=collector.since(rulesMark);
    const firstReadCount=countRpc(firstReadSlice,'Firestore ');
    assert.ok(rulesReady.available,'public prediction-rules lazy reader must be exposed after page load');
    assert.ok(firstReadCount.requests>0,'one explicit published-rules read should reach Firestore (or transport should be visible for diagnosis)');
    assert.ok(firstReadCount.requests<=8,'one logical read should not fan out to an unexpectedly large number of Firestore transports');
    const repeatMark=collector.mark();
    await page.evaluate(async () => { await window.SMVPredictionRulesSync.ensureReady(); });
    await sleep(900);
    const secondReadSlice=collector.since(repeatMark);
    const secondReadCount=countRpc(secondReadSlice,'Firestore ');
    assert.equal(secondReadCount.requests,0,'a second ensureReady call must reuse the in-flight/settled single read');
    report.firebaseProfile.publishedRulesRead={
      outcome:rulesReady,
      transportRequests:firstReadCount.requests,
      byClass:firstReadCount.byClass,
      statusSummary:firstReadCount.rows.map(r=>({path:r.path,method:r.method,status:r.status,durationMs:r.durationMs,transferredBytes:r.transferredBytes})),
      repeatCallTransportRequests:secondReadCount.requests,
      pass:true,
      interpretation:'One logical document read may use more than one HTTP/WebChannel transport request; exact RPC count is reported without payloads.'
    };

    console.log('[audit] phase:reinstall-reset');
    await resetAnonymousProfile(page,context);
    console.log('[audit] phase:reinstall-navigation');
    const reinstall=await navigate(page,HOROSCOPE_URL,collector,'horoscope after unregister + storage/cache purge');
    const reinstallSw=await registrationState(page);
    const reinstallManifest=await manifestInfo(page);
    assert.equal(reinstall.httpStatus,200,'fresh reinstall reload remains online');
    assert.ok(reinstallSw.ready && /\/horoscope\/sw\.js$/.test(reinstallSw.activeScript||''),'service worker must reinstall and activate after purge');
    assert.equal(reinstallManifest.status,200,'manifest must be restored after purge');
    report.checks.horoscopeColdReinstall={
      pass:true,simulatedUninstall:{registrationsUnregistered:true,cacheStorageCleared:true,localAndSessionStorageCleared:true,indexedDBCleared:true,cookiesCleared:true},
      afterReinstall:{serviceWorker:reinstallSw,manifest:reinstallManifest},
      note:'Browser web-app lifecycle verified; Android launcher shortcut/install prompt itself is outside headless-browser capability.'
    };
    await page.close();

    // Start Calendar in a new page after clearing the anonymous origin state.
    // The Calendar service-worker scope itself has not yet been registered in this context.
    console.log('[audit] phase:calendar-cold-start');
    const calPage=await browser.newPage();
    await calPage.setViewport({width:390,height:844,deviceScaleFactor:3,isMobile:true,hasTouch:true});
    await calPage.setUserAgent('Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36');
    await collector.attach(calPage.target());
    setPhase('measure Calendar PWA fresh install and lazy location cache');
    const calMark=collector.mark();
    const calendarLoad=await navigate(calPage,CALENDAR_URL,collector,'calendar PWA cold profile / install cache');
    const calSw=await registrationState(calPage);
    const calManifest=await manifestInfo(calPage);
    assert.equal(calendarLoad.httpStatus,200,'Calendar PWA document must return HTTP 200');
    assert.ok(calSw.supported&&calSw.ready&&/\/horoscope\/calendar\/sw\.js$/.test(calSw.activeScript||''),'Calendar service worker must install and activate');
    assert.equal(calManifest.status,200,'Calendar manifest must load');
    assert.ok((calManifest.icons||[]).some(i=>i.sizes==='192x192')&&(calManifest.icons||[]).some(i=>i.sizes==='512x512'),'Calendar manifest must contain required app icons');
    await sleep(700);
    console.log('[audit] phase:calendar-check-before-search');
    const beforeSearch=await cacheEntries(calPage);
    assert.equal(beforeSearch.placeShards.length,0,'fresh Calendar PWA install must not cache any India location JSON shard');
    const installEventEnd=collector.all().length;
    const installNetworkEvents=collector.all().slice(calMark.index,installEventEnd);
    const searchMark=collector.mark();
    const searchStarted=Date.now();
    console.log('[audit] phase:calendar-first-place-search');
    const search=await calPage.evaluate(async () => {
      const mod=await import('/horoscope/offline/places/place-search.mjs');
      const rows=await mod.searchPlaces('Perambalur',12);
      return {count:rows.length,matchingRow:rows.find(x=>JSON.stringify(x).toLowerCase().includes('perambalur'))||null};
    });
    const searchElapsedMs=Date.now()-searchStarted;
    await sleep(600);
    assert.ok(search.count>0&&search.matchingRow,'on-demand place search should resolve Perambalur from deployed data');
    const afterSearch=await cacheEntries(calPage);
    assert.ok(afterSearch.placeShards.length>0,'first search should cache selected letter-shard parts for offline reuse');
    const requestedParts=collector.since(searchMark).filter(x=>isPlaceShard(x.url));
    const initialShards=installNetworkEvents.filter(x=>isPlaceShard(x.url));
    assert.equal(initialShards.length,0,'no India location parts may be downloaded before first search');
    report.networkTrials.push({...calendarLoad,network:summarizeNetwork(installNetworkEvents)});
    report.checks.calendarPwa={
      pass:true,serviceWorker:calSw,manifest:calManifest,
      installCache:{cacheNamesBeforeSearch:beforeSearch.cacheNames,placeShardCountBeforeSearch:beforeSearch.placeShards.length,
        placeShardCountAfterSearch:afterSearch.placeShards.length,cachedParts:afterSearch.placeShards.map(x=>({cache:x.cache,path:x.path})),
        networkPartRequestsAtInstall:initialShards.length,networkPartRequestsOnFirstSearch:requestedParts.length},
      firstSearch:{query:'Perambalur',resultCount:search.count,matched:true,searchElapsedMs,partRequestCount:requestedParts.length},
      pass:true
    };
    await calPage.close();

    const all=collector.all();
    report.firebaseProfile.totalObserved=countRpc(all,'Firestore ');
    report.firebaseProfile.totalRenderBackend=countRpc(all,'SMV Render backend');
    report.networkSummary={
      trials:report.networkTrials.map(x=>({label:x.label,httpStatus:x.httpStatus,pageLoadWallClockMs:x.pageLoadWallClockMs,browserNavigation:x.browserNavigation,network:x.network})),
      totalCapturedRequestEvents:all.length,
      note:'CDP wire-transfer counts can exclude requests made by a worker target before its debugger session attaches; page navigation timing remains browser-native. No payload, cookie, email, UID or token is emitted.'
    };
    report.checks.pass=true;
    console.log('SMV_PRODUCTION_PWA_FIREBASE_PROFILE='+JSON.stringify(report));
    await writeFile(REPORT_PATH,JSON.stringify(report,null,2)+'\n','utf8');
  } finally {
    await browser.close();
  }
}
run().catch(async error=>{
  const captured = activeCollector?.all?.() || [];
  const failure = {
    generatedAt:new Date().toISOString(),
    status:'FAILED_BEFORE_PROFILE_COMPLETION',
    failedPhase:currentPhase,
    partialNetworkSummary:captured.length ? summarizeNetwork(captured) : null,
    recentRedactedRequests:captured.slice(-80).map(cleanRequest),
    error:{name:String(error?.name||'Error'),message:String(error?.message||error).slice(0,500),stack:String(error?.stack||'').split(/\\r?\\n/).slice(0,10).join('\\n')},
    androidDeviceValidation:{status:'NOT_RUN',reason:'No attached Android device/ADB or launcher available in this run.'}
  };
  try{
    await mkdir(OUT_DIR,{recursive:true});
    await writeFile(REPORT_PATH,JSON.stringify(failure,null,2)+'\\n','utf8');
  }catch(writeError){
    console.error('Could not write failure report:',String(writeError?.message||writeError));
  }
  console.error(error?.stack||String(error));
  process.exitCode=1;
});
