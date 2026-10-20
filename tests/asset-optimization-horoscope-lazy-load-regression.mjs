/* Regression gate: defer heavy reading bundles without changing protected flows. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const html = read('public/horoscope/index.html');
let checks = 0;
const ok = (value, message) => { assert.ok(value, message); checks++; };

const scriptTags = [...html.matchAll(/<script\b([^>]*)>/gi)].map(m => m[1]);
const eagerSources = scriptTags.map(a => (a.match(/\bsrc=["']([^"']+)["']/i) || [])[1]).filter(Boolean);
const lazy = [
  'horoscope-life-engine.js', 'd9-reading.js', 'horoscope-judgement-engine.js',
  'integrated.js', 'd1-time-reading.js', 'prediction-synthesis.js'
];
for (const file of lazy) {
  ok(!eagerSources.some(src => src.split('?')[0].replace(/^\.\//, '') === file),
     file + ' must not download in the initial Horoscope document');
}
const match = html.match(/<script id="smv-v360-lazy-horoscope-engines">([\s\S]*?)<\/script>/);
ok(!!match, 'On-demand calculation-engine bootstrap exists');
const loader = match?.[1] || '';
const declared = loader.match(/const lazyScripts=(\[[\s\S]*?\]);/);
ok(!!declared, 'Lazy script dependency manifest exists');
const declaredOrder = JSON.parse(declared[1]);
ok(JSON.stringify(declaredOrder) === JSON.stringify(lazy),
   'Lazy scripts preserve their previous runtime dependency order');
ok(loader.includes("document.addEventListener('click'") &&
   loader.includes('event.preventDefault()') && loader.includes('event.stopImmediatePropagation()') &&
   loader.includes('button.click()') && loader.includes('},true);'),
   'First user action is gated and replayed after loading');
ok(loader.includes('tag.async=false') && loader.includes('Promise.all(lazyScripts.map(loadScript))'),
   'Bundles download concurrently while dynamic classic-script execution remains ordered');
ok(loader.includes('if(waitingButton)return') && loader.includes('window.__smvLoadHoroscopeAdvanced=ensure'),
   'Rapid taps coalesce and Matching can await the shared loader');
ok(loader.includes('#smvAdmPreview')&&loader.includes('[data-wb-calculate]')&&!loader.includes('#smvAdminRulesAccess'),
   'Admin Preview/Calculate load their dependencies on demand without intercepting Admin entry/login');
ok(html.includes('window.__smvLoadHoroscopeAdvanced?window.__smvLoadHoroscopeAdvanced():Promise.resolve()'),
   'Marriage Matching waits for calculation dependencies before loading its own script');

for (const file of [
  'config.js', 'horoscope-auth.mjs', 'report-store.mjs',
  'prediction-rules-published.js', 'prediction-rule-engine.js',
  'prediction-rules-sync.mjs', 'prediction-admin.mjs', 'prediction-admin-workbench.mjs',
  'horoscope.js?v=20261019-ayurdaya-rules-duration-v253',
  'horoscope-form.js', 'pwa.js'
]) ok(eagerSources.includes(file), 'Protected eager dependency retained: ' + file);
ok(html.includes('id="smvAdminRulesAccess"') && html.includes('id="smvHoroscopeAuth"'),
   'Existing Admin entry and auth UI anchors remain present');
for (const path of [
  'public/horoscope/report-store.mjs',
  'public/horoscope/report-print.js',
  'public/horoscope/report-print.css',
  'public/horoscope/report-print.html',
  'public/horoscope/report-identity.js',
  'public/horoscope/fonts/noto-sans-tamil.woff2',
  'public/horoscope/assets/smv-marriage-shiva-parvati.webp',
  'public/horoscope/assets/vinayagar-cover.svg'
]) ok(fs.existsSync(new URL('../' + path, import.meta.url)), 'Protected report/font/art asset retained: ' + path);


const appPackage = JSON.parse(read('package.json'));
const renderConfig = read('render.yaml');
ok(!fs.existsSync(new URL('../public/horoscope/server.js', import.meta.url)),
   'Unused public-published backend copy is removed');
ok(fs.existsSync(new URL('../server.js', import.meta.url)),
   'Actual root backend source is preserved');
ok(appPackage.scripts?.start === 'node server.js' && renderConfig.includes('startCommand: npm start'),
   'Deployment still starts the retained root server.js');
ok(!fs.existsSync(new URL('../public/horoscope/horoscope-predictions.js', import.meta.url)),
   'Retired duplicate prediction bundle stays removed after consumer migration');
ok(!/<script\\b[^>]*src=["'][^"']*(?:server|horoscope-predictions)\\.js/i.test(html),
   'Horoscope page has no script dependency on deleted public server/prediction copies');

const runtime = { appended: [], clickHandler: null, status: null };
const document = {
  documentElement: { lang: 'ta' },
  head: {
    appendChild(tag) {
      runtime.appended.push(tag.src);
      queueMicrotask(() => tag.onload?.());
    }
  },
  createElement(tagName) {
    return { tagName, async: true, setAttribute() {}, removeAttribute() {} };
  },
  getElementById() { return runtime.status; },
  addEventListener(type, callback, capture) {
    if (type === 'click' && capture === true) runtime.clickHandler = callback;
  }
};
const window = { dispatchEvent() {} };
vm.runInNewContext(match[1], {
  document, window, console, Promise, Map, Error,
  CustomEvent: class { constructor(type) { this.type = type; } }, queueMicrotask
}, { timeout: 5000 });

let replayCount = 0;
const button = {
  id: 'smvAdmPreview', isConnected: true, busy: false,
  closest(selector) { return selector.includes('#' + this.id) ? this : null; },
  setAttribute(name) { if (name === 'aria-busy') this.busy = true; },
  removeAttribute(name) { if (name === 'aria-busy') this.busy = false; },
  click() {
    runtime.clickHandler({target:this,preventDefault(){},stopImmediatePropagation(){}});
    replayCount++;
  }
};
let prevented = 0, stopped = 0;
runtime.clickHandler({
  target: button,
  preventDefault() { prevented++; },
  stopImmediatePropagation() { stopped++; }
});
await new Promise(resolve => setTimeout(resolve, 0));
await new Promise(resolve => setTimeout(resolve, 0));
ok(prevented === 1 && stopped === 1, 'First Admin Preview action waits behind the lazy dependency loader');
ok(JSON.stringify(runtime.appended) === JSON.stringify(lazy),
   'Runtime loader inserts all six scripts in the audited order for Admin Preview');
ok(replayCount === 1 && !button.busy, 'Admin Preview is replayed exactly once after loading and busy state clears');
console.log(JSON.stringify({pass:true,assertions:checks,deferredScripts:lazy.length,protectedFlows:[
  'saved reports','browser-native print/PDF','Tamil font','approved report-cover artwork',
  'authentication/dashboard/Admin rules and Firebase prediction-rule loading'
]}));
