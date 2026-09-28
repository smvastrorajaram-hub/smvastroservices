const CACHE="smv-offline-v74-adaptive-icons"+self.registration.scope+self.registration.scope;
const FILES=[
"./","./index.html","./config.js","./boot.mjs","./horoscope.js","./horoscope-payment.mjs","./horoscope-saved.js","./report-identity.js","./report-print.css","./report-print.html","./report-print.js","./horoscope-predictions.js","./horoscope-translations.js","./horoscope-language.js","./horoscope-form.js","./horoscope-details.js","./horoscope.css","./marriage-matching.js","./marriage-matching.css","./pwa.js","./manifest-en.webmanifest","./manifest-ta.webmanifest",
"./assets/hero-desktop.png","./assets/hero-mobile.png","./assets/icon-192.png","./assets/icon-512.png","./assets/smv-brand-logo-v17.png","./assets/smvlogo.png","./assets/vinayagar-report.png","./assets/temple-frame.png",
"./offline/wasm-provider.mjs","./offline/places/place-search.mjs","./offline/places/timezone.mjs","./offline/places/india-manifest.json","./offline/server-v107-wrapper.browser.mjs","./offline/dasa_engine.browser.mjs","./offline/offline-only-router.mjs","./offline/offline-engine.mjs","./offline/swiss_vedic.browser.mjs","./offline/transit_panchang.browser.mjs","./offline/parity.mjs","./offline/astro_advanced.browser.mjs","./offline/vendor/README.txt","./offline/vendor/smv-swisseph-local.mjs","./offline/vendor/CONTRACT.md","./offline/vendor/wasm/swisseph.wasm","./offline/vendor/wasm/swisseph.data","./offline/vendor/wasm/swisseph.js",
"./licenses/GPL-3.0-RUNTIME-NOTICE.txt","./licenses/GEONAMES-CC-BY-4.0-NOTICE.txt","./fonts/noto-sans-tamil.woff2","./fonts/OFL.txt"
];
self.addEventListener('install',e=>e.waitUntil((async()=>{const c=await caches.open(CACHE);for(const f of FILES){const r=await fetch(new Request(f,{cache:'reload'}));if(!r.ok)throw Error('Cache install failed: '+f);await c.put(f,r);}await self.skipWaiting();})()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith('smv-offline-')&&k.endsWith(self.registration.scope)&&k!==CACHE)await caches.delete(k);await self.clients.claim();})()));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 const u=new URL(e.request.url);if(u.origin!==self.location.origin)return;
 // Never return a stale feature gate or HTML for a versioned JavaScript request.
 const fresh=e.request.mode==='navigate'||/\.(?:m?js|css|html)$/.test(u.pathname);
 e.respondWith((async()=>{
  const c=await caches.open(CACHE);
  if(fresh){
   try{const r=await fetch(e.request);if(r.ok){await c.put(e.request,r.clone());return r;}throw Error('Asset unavailable');}
   catch(error){const cached=await c.match(e.request)||await c.match(u.pathname);if(cached)return cached;throw error;}
  }
  return await c.match(e.request,{ignoreSearch:true})||fetch(e.request);
 })());
});
