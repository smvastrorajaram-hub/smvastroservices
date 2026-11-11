'use strict';

const fs = require('node:fs');
const path = require('node:path');

const PORT = Number(process.env.SMV_DEBUG_PORT || 9222);
const EXPECTED_PATH = process.env.SMV_EXPECTED_PATH || '/';
const EXPECTED_NAME = process.env.SMV_EXPECTED_NAME || 'SMV ASTRO';
const CACHE_PREFIX = process.env.SMV_CACHE_PREFIX || 'smv-astro-shell-';
const OUTPUT_DIR = process.env.SMV_SCREENSHOT_DIR || process.cwd();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForTarget() {
  const deadline = Date.now() + 180000;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const response = await fetch('http://127.0.0.1:' + PORT + '/json/list');
      if (response.ok) {
        const targets = await response.json();
        const target = targets.find((item) => {
          if (item.type !== 'page' || !item.webSocketDebuggerUrl ||
              !item.url.startsWith('https://smvastroservices.pages.dev')) return false;
          try {
            return new URL(item.url).pathname === EXPECTED_PATH;
          } catch {
            return false;
          }
        });
        if (target) return target;
      }
    } catch (error) {
      lastError = error;
    }
    await sleep(1500);
  }
  throw new Error('Could not find the Pages.dev Electron page via CDP. ' + String(lastError || 'Timed out.'));
}

function connectCdp(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const pending = new Map();
    const eventWaiters = new Map();
    let sequence = 0;
    const timeout = setTimeout(() => reject(new Error('Timed out connecting to Electron DevTools.')), 20000);

    ws.addEventListener('open', () => {
      clearTimeout(timeout);
      const send = (method, params = {}) => new Promise((resolveSend, rejectSend) => {
        const id = ++sequence;
        pending.set(id, { resolve: resolveSend, reject: rejectSend });
        ws.send(JSON.stringify({ id, method, params }));
        const timer = setTimeout(() => {
          const item = pending.get(id);
          if (item) {
            pending.delete(id);
            rejectSend(new Error('CDP command timed out: ' + method));
          }
        }, 30000);
        timer.unref?.();
      });

      const waitForEvent = (method, timeoutMs = 60000) => new Promise((resolveEvent, rejectEvent) => {
        const list = eventWaiters.get(method) || [];
        const entry = { resolve: resolveEvent, reject: rejectEvent };
        list.push(entry);
        eventWaiters.set(method, list);
        const timer = setTimeout(() => {
          const current = eventWaiters.get(method) || [];
          const index = current.indexOf(entry);
          if (index >= 0) {
            current.splice(index, 1);
            rejectEvent(new Error('Timed out waiting for CDP event: ' + method));
          }
        }, timeoutMs);
        timer.unref?.();
      });

      const evaluate = async (expression) => {
        const result = await send('Runtime.evaluate', {
          expression,
          returnByValue: true,
          awaitPromise: true,
          userGesture: true
        });
        if (result.exceptionDetails) {
          throw new Error(result.exceptionDetails.text || 'Runtime.evaluate failed');
        }
        return result.result ? result.result.value : undefined;
      };

      ws.addEventListener('message', (event) => {
        let message;
        try {
          message = JSON.parse(typeof event.data === 'string' ? event.data : String(event.data));
        } catch {
          return;
        }
        if (message.id && pending.has(message.id)) {
          const item = pending.get(message.id);
          pending.delete(message.id);
          if (message.error) item.reject(new Error(message.error.message || 'CDP error'));
          else item.resolve(message.result || {});
          return;
        }
        if (message.method && eventWaiters.has(message.method)) {
          const list = eventWaiters.get(message.method);
          const item = list.shift();
          if (item) item.resolve(message.params || {});
          if (!list.length) eventWaiters.delete(message.method);
        }
      });

      resolve({ ws, send, evaluate, waitForEvent });
    });
    ws.addEventListener('error', () => {
      clearTimeout(timeout);
      reject(new Error('Electron DevTools websocket failed.'));
    });
  });
}

async function withTimeout(promise, ms, message) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), ms);
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const target = await waitForTarget();
  const cdp = await connectCdp(target.webSocketDebuggerUrl);

  try {
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Network.enable');

    // /json/list can expose a destination URL before Chromium has committed its
    // navigation. Wait for the expected document to finish loading before
    // touching navigator.serviceWorker (which is absent in the prior about:blank
    // execution context).
    const readinessDeadline = Date.now() + 90000;
    let documentReady = null;
    while (Date.now() < readinessDeadline) {
      try {
        documentReady = await cdp.evaluate(
          '({href:location.href,readyState:document.readyState,' +
          'secure:isSecureContext,serviceWorkerAvailable:' +
          '(typeof navigator.serviceWorker?.getRegistrations === "function")})'
        );
        if (
          documentReady.href.startsWith('https://smvastroservices.pages.dev') &&
          new URL(documentReady.href).pathname === EXPECTED_PATH &&
          documentReady.readyState === 'complete' &&
          documentReady.secure &&
          documentReady.serviceWorkerAvailable
        ) break;
      } catch {
        // A navigation can replace the execution context while it commits.
      }
      await sleep(500);
    }
    if (
      !documentReady ||
      !documentReady.href.startsWith('https://smvastroservices.pages.dev') ||
      new URL(documentReady.href).pathname !== EXPECTED_PATH ||
      documentReady.readyState !== 'complete' ||
      !documentReady.secure ||
      !documentReady.serviceWorkerAvailable
    ) {
      throw new Error('Expected secure Pages.dev document and Service Worker API were not ready: ' +
        JSON.stringify(documentReady));
    }

    const initialExpression = '(async()=>{' +
      'const link=document.querySelector("link[rel=manifest]");' +
      'let manifest=null;' +
      'if(link){const response=await fetch(link.href,{cache:"no-store"});' +
      'if(!response.ok)throw new Error("Manifest HTTP "+response.status);manifest=await response.json();}' +
      'return {' +
      'href:location.href,pathName:location.pathname,width:innerWidth,height:innerHeight,' +
      'mobileBreakpoint:matchMedia("(max-width: 767px)").matches,' +
      'userAgent:navigator.userAgent,platform:navigator.platform,' +
      'userAgentDataMobile:navigator.userAgentData?.mobile??null,title:document.title,' +
      'bodyText:(document.body?.innerText||"").slice(0,300),' +
      'manifest:manifest?{name:manifest.name,short_name:manifest.short_name,scope:manifest.scope,' +
      'start_url:manifest.start_url,display:manifest.display,icons:manifest.icons?.length||0}:null,' +
      'registrations:(await navigator.serviceWorker.getRegistrations()).map(r=>({scope:r.scope,active:!!r.active,state:r.active?.state||null}))' +
      '};})()';

    const page = await cdp.evaluate(initialExpression);
    if (!page.href.startsWith('https://smvastroservices.pages.dev')) throw new Error('App did not reach Pages.dev: ' + page.href);
    if (!page.pathName.startsWith(EXPECTED_PATH)) throw new Error('Wrong Pages.dev path: ' + page.pathName);
    if (page.width < 1100 || page.mobileBreakpoint) throw new Error('Desktop viewport was not applied: ' + page.width + 'px');
    if (!/Windows NT 10\.0; Win64; x64/.test(page.userAgent) || /Mobile|Android/i.test(page.userAgent)) {
      throw new Error('Desktop Windows Chrome User-Agent was not applied: ' + page.userAgent);
    }
    if (page.userAgentDataMobile === true) throw new Error('Chromium still reports a mobile User-Agent Client Hint.');
    if (!page.manifest || page.manifest.short_name !== EXPECTED_NAME) {
      throw new Error('Expected PWA manifest was not served: ' + JSON.stringify(page.manifest));
    }
    if (page.manifest.scope !== EXPECTED_PATH || page.manifest.display !== 'standalone' || page.manifest.icons < 2) {
      throw new Error('PWA manifest scope/display/icons do not match this app: ' + JSON.stringify(page.manifest));
    }

    const ready = await withTimeout(cdp.evaluate(
      '(async()=>{const reg=await navigator.serviceWorker.ready;return {' +
      'scope:reg.scope,active:!!reg.active,scriptURL:reg.active?.scriptURL||null};})()'
    ), 8 * 60 * 1000, 'Service-worker/offline asset installation did not complete within 8 minutes.');

    if (!ready.active || !ready.scope.endsWith(EXPECTED_PATH)) {
      throw new Error('Expected app-specific service worker did not activate: ' + JSON.stringify(ready));
    }

    const onlineReload = cdp.waitForEvent('Page.loadEventFired', 90000);
    await cdp.send('Page.reload', { ignoreCache: false });
    await onlineReload;

    const onlineState = await cdp.evaluate(
      '(async()=>{const registrations=await navigator.serviceWorker.getRegistrations();' +
      'const loc=await caches.open("smv-shared-india-places");const keys=await loc.keys();' +
      'const shardCount=keys.filter(k=>/\\/offline\\/places\\/india\\/[a-z]+\\.json$/i.test(new URL(k.url).pathname)).length;' +
      'return {href:location.href,title:document.title,controlled:!!navigator.serviceWorker.controller,' +
      'controller:navigator.serviceWorker.controller?.scriptURL||null,cacheNames:await caches.keys(),' +
      'indiaPlaceShardCount:shardCount,bodyLength:(document.body?.innerText||"").length,' +
      'registrations:registrations.map(r=>r.scope)};})()'
    );

    if (!onlineState.controlled) throw new Error('Pages.dev page is not controlled by its service worker.');
    if (!onlineState.cacheNames.some((name) => name.startsWith(CACHE_PREFIX))) {
      throw new Error('App-specific offline cache was not found: ' + onlineState.cacheNames.join(', '));
    }
    if (onlineState.indiaPlaceShardCount < 28) {
      throw new Error('India offline place shards are incomplete: ' + onlineState.indiaPlaceShardCount + '/28');
    }

    const suffix = EXPECTED_PATH === '/' ? 'astro' : (EXPECTED_PATH.includes('calendar') ? 'calendar' : 'horoscope');
    const desktopShot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(OUTPUT_DIR, 'smv-pages-' + suffix + '-desktop.png'), Buffer.from(desktopShot.data, 'base64'));

    await cdp.send('Network.emulateNetworkConditions', {
      offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0, connectionType: 'none'
    });
    const offlineReload = cdp.waitForEvent('Page.loadEventFired', 90000);
    await cdp.send('Page.reload', { ignoreCache: false });
    await offlineReload;

    const offlineState = await cdp.evaluate(
      '(async()=>{const loc=await caches.open("smv-shared-india-places");const keys=await loc.keys();' +
      'return {href:location.href,title:document.title,online:navigator.onLine,' +
      'controlled:!!navigator.serviceWorker.controller,bodyLength:(document.body?.innerText||"").length,' +
      'placeShardCount:keys.filter(k=>/\\/offline\\/places\\/india\\/[a-z]+\\.json$/i.test(new URL(k.url).pathname)).length};})()'
    );

    if (!offlineState.href.startsWith('https://smvastroservices.pages.dev')) {
      throw new Error('Offline reload left the Pages.dev origin: ' + offlineState.href);
    }
    if (!offlineState.href.includes(EXPECTED_PATH)) throw new Error('Offline reload opened the wrong app path.');
    if (!offlineState.controlled || offlineState.bodyLength < 20 || offlineState.placeShardCount < 28) {
      throw new Error('Offline reopen failed or cached location data is missing: ' + JSON.stringify(offlineState));
    }

    const offlineShot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(OUTPUT_DIR, 'smv-pages-' + suffix + '-offline.png'), Buffer.from(offlineShot.data, 'base64'));

    const summary = [
      '### ' + EXPECTED_NAME + ' — Pages.dev Windows verification',
      '',
      '- Desktop viewport: **' + page.width + ' × ' + page.height + '**; mobile breakpoint: **' + page.mobileBreakpoint + '**.',
      '- User-Agent: Windows desktop Chrome (' + page.platform + ').',
      '- PWA manifest: **' + page.manifest.short_name + '**; scope: ' + page.manifest.scope + '.',
      '- Service worker: **active and controlling** (' + ready.scriptURL + ').',
      '- Offline India location data: **' + onlineState.indiaPlaceShardCount + '/28 shards cached**.',
      '- Offline reload: **PASS**; page stayed on Pages.dev with ' + offlineState.bodyLength + ' characters of visible content.',
      ''
    ].join('\n');
    if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
    process.stdout.write(summary);
  } finally {
    try {
      await cdp.send('Network.emulateNetworkConditions', {
        offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1
      });
    } catch {}
    cdp.ws.close();
  }
}

main().catch((error) => {
  process.stderr.write((error && error.stack) || String(error));
  process.exitCode = 1;
});
