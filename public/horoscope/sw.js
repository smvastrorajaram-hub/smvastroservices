const CACHE="smv-offline-v118-manual-save-basic-full"+self.registration.scope;
const FILES=[
"./","./index.html","./config.js","./boot.mjs","./horoscope.js","./horoscope-payment.mjs","./horoscope-saved.js","./report-identity.js","./report-print.css","./report-print.html","./report-print.js","./horoscope-predictions.js","./horoscope-translations.js","./horoscope-language.js","./horoscope-form.js","./horoscope-details.js","./horoscope.css","./marriage-matching.js","./marriage-matching.css","./pwa.js","./manifest-en.webmanifest","./manifest-ta.webmanifest",
"./assets/hero-desktop.png","./assets/hero-mobile.png","./assets/icon-192.png","./assets/icon-512.png","./assets/smv-brand-logo-v17.png","./assets/smvlogo.png","./assets/vinayagar-report.png","./assets/temple-frame.png",
"./offline/wasm-provider.mjs","./offline/places/place-search.mjs","./offline/places/timezone.mjs","./offline/places/india-manifest.json","./offline/server-v108-wrapper.browser.mjs","./offline/dasa_engine.browser.mjs","./offline/offline-only-router.mjs","./offline/offline-engine.mjs","./offline/swiss_vedic.browser.mjs","./offline/transit_panchang.browser.mjs","./offline/parity.mjs","./offline/astro_advanced.browser.mjs","./offline/vendor/README.txt","./offline/vendor/smv-swisseph-local.mjs","./offline/vendor/CONTRACT.md","./offline/vendor/wasm/swisseph.wasm","./offline/vendor/wasm/swisseph.data","./offline/vendor/wasm/swisseph.js","./offline/vendor/wasm/swisseph.mjs",
"./licenses/GPL-3.0-RUNTIME-NOTICE.txt","./licenses/GEONAMES-CC-BY-4.0-NOTICE.txt","./fonts/noto-sans-tamil.woff2","./fonts/OFL.txt"
];
self.addEventListener('install',e=>e.waitUntil((async()=>{
 const c=await caches.open(CACHE);
 // V99: one optional asset must not abort the whole SW installation. Cache every
 // available asset independently; critical Swiss files are also fetched on demand.
 for(const f of FILES){
  try{
   const r=await fetch(new Request(f,{cache:'reload'}));
   if(r.ok)await c.put(f,normaliseAssetResponse(f,r));
   else console.warn('[SMV-SW] precache skipped',f,r.status);
  }catch(err){console.warn('[SMV-SW] precache fetch failed',f,String(err?.message||err));}
 }
 await self.skipWaiting();
})()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith('smv-offline-')&&k.endsWith(self.registration.scope)&&k!==CACHE)await caches.delete(k);await self.clients.claim();})()));

function normaliseAssetResponse(pathOrUrl,response){
 const u=new URL(pathOrUrl,self.registration.scope);
 const path=u.pathname.toLowerCase();
 if(!/\.(?:m?js|wasm)$/.test(path))return response.clone();
 const h=new Headers(response.headers);
 // ES modules are rejected by browsers when a host/proxy serves .mjs as
 // text/plain/octet-stream. Preserve bytes/status but force the standards MIME.
 if(/\.m?js$/.test(path))h.set('Content-Type','text/javascript; charset=utf-8');
 if(/\.wasm$/.test(path))h.set('Content-Type','application/wasm');
 return new Response(response.clone().body,{status:response.status,statusText:response.statusText,headers:h});
}

self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 const u=new URL(e.request.url);if(u.origin!==self.location.origin)return;
 const isSwiss=/\/horoscope\/offline\/(?:vendor\/|wasm-provider\.mjs|swiss_vedic\.browser\.mjs|transit_panchang\.browser\.mjs)/.test(u.pathname);
 const fresh=e.request.mode==='navigate'||(/\.(?:m?js|css|html)$/.test(u.pathname)&&!isSwiss);
 e.respondWith((async()=>{
  const c=await caches.open(CACHE);
  // V99 Swiss runtime: cached-good first prevents a temporary network failure from
  // breaking a previously working entitled horoscope. Network is used to seed/update.
  if(isSwiss){
   const cached=await c.match(e.request,{ignoreSearch:true})||await c.match(u.pathname,{ignoreSearch:true});
   if(cached)return normaliseAssetResponse(u.href,cached);
   const r=await fetch(new Request(e.request,{cache:'reload'}));
   if(!r.ok)throw Error('Swiss runtime asset unavailable: '+u.pathname+' ('+r.status+')');
   const fixed=normaliseAssetResponse(u.href,r);
   await c.put(e.request,fixed.clone());
   return fixed;
  }
  if(fresh){
   try{const r=await fetch(e.request);if(r.ok){const fixed=normaliseAssetResponse(u.href,r);await c.put(e.request,fixed.clone());return fixed;}throw Error('Asset unavailable');}
   catch(error){const cached=await c.match(e.request)||await c.match(u.pathname);if(cached)return normaliseAssetResponse(u.href,cached);throw error;}
  }
  return await c.match(e.request,{ignoreSearch:true})||fetch(e.request);
 })());
});
