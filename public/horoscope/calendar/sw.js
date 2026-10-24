const CACHE='smv-calendar-forecast-assets-v7';
const CORE=[
 './','./index.html','./admin.html','./rasi-palan-periods.mjs','./calendar-pwa.mjs','./manifest-en.webmanifest','./manifest-ta.webmanifest',
 '../daily-calendar.mjs','../daily-calendar.css','../calendar-rasi-palan.mjs','../calendar-rasi-palan.css','../calendar-rasi-palan-rules.mjs','../calendar-theme.css','../calendar-data.mjs','../calendar-worker.mjs','../horoscope.js','../horoscope.css','../location-search-online-offline.js',
 '../assets/calendar-192.png','../assets/calendar-512.png','../assets/calendar-maskable.png',
 '../offline/wasm-provider.mjs','../offline/swiss_vedic.browser.mjs','../offline/transit_panchang.browser.mjs',
 '../offline/vendor/smv-swisseph-local.mjs','../offline/vendor/wasm/swisseph.mjs','../offline/vendor/wasm/swisseph.js','../offline/vendor/wasm/swisseph.wasm','../offline/vendor/wasm/swisseph.data',
 '../offline/places/place-search.mjs','../offline/places/india-manifest.json',
];
function fixed(url,r){const h=new Headers(r.headers),p=new URL(url,self.location.origin).pathname.toLowerCase();if(/\.m?js$/.test(p))h.set('Content-Type','text/javascript; charset=utf-8');if(/\.webmanifest$/.test(p))h.set('Content-Type','application/manifest+json; charset=utf-8');if(/\.json$/.test(p))h.set('Content-Type','application/json; charset=utf-8');if(/\.wasm$/.test(p))h.set('Content-Type','application/wasm');if(/\.data$/.test(p))h.set('Content-Type','application/octet-stream');return new Response(r.clone().body,{status:r.status,statusText:r.statusText,headers:h});}
const REQUIRED_CORE = new Set([
 './index.html','./admin.html','./calendar-pwa.mjs',
 './rasi-palan-periods.mjs','../daily-calendar.mjs','../calendar-rasi-palan.mjs',
 '../calendar-rasi-palan.css','../calendar-rasi-palan-rules.mjs','../daily-calendar.css',
 '../calendar-data.mjs','../calendar-worker.mjs','../offline/wasm-provider.mjs',
 '../offline/vendor/wasm/swisseph.js','../offline/vendor/wasm/swisseph.wasm','../offline/vendor/wasm/swisseph.data'
]);
const cacheURL = path => new URL(path, self.registration.scope).href;
async function cacheCore(concurrency=6){
 const c=await caches.open(CACHE);let i=0;const failures=[];
 const job=async()=>{while(i<CORE.length){
  const path=CORE[i++],url=cacheURL(path);
  try{
   const r=await fetch(new Request(url,{cache:'reload'}));
   if(r.ok)await c.put(url,fixed(url,r));
   else if(REQUIRED_CORE.has(path))failures.push(path+' (HTTP '+r.status+')');
  }catch(error){if(REQUIRED_CORE.has(path))failures.push(path+' ('+String(error?.message||error)+')');}
 }};
 await Promise.all(Array.from({length:Math.min(concurrency,CORE.length)},job));
 if(failures.length)throw new Error('Required Calendar offline assets failed to cache: '+failures.join(', '));
}
self.addEventListener('install',e=>e.waitUntil(cacheCore(6).then(()=>self.skipWaiting())));
async function preserveCachedIndiaPlaces(target){
 const oldNames=(await caches.keys()).filter(name=>name.startsWith('smv-calendar-')&&name!==CACHE);
 for(const name of oldNames){
  const source=await caches.open(name);
  for(const request of await source.keys()){
   const pathname=new URL(request.url).pathname;
   if(!/\/offline\/places\/india\/[^/]+\.json$/.test(pathname))continue;
   if(await target.match(request))continue;
   const response=await source.match(request);
   if(response)await target.put(request,response);
  }
 }
}
self.addEventListener('activate',e=>e.waitUntil((async()=>{
 const target=await caches.open(CACHE);
 // Keep any India location shards already downloaded for offline use; future
 // missing shards are cached lazily when the user searches for those places.
 await preserveCachedIndiaPlaces(target);
 for(const k of await caches.keys())if(k.startsWith('smv-calendar-')&&k!==CACHE)await caches.delete(k);
 await self.clients.claim();
})()));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;const u=new URL(e.request.url);if(u.origin!==self.location.origin)return;
 if(e.request.mode==='navigate'){
  const scopePath=new URL(self.registration.scope).pathname;
  if(!u.pathname.startsWith(scopePath))return;
  const requestedPath=u.pathname.slice(scopePath.length).replace(/^\/+/, '');
  // Cloudflare Pages may normalize /admin.html to /admin. Both URLs must
  // resolve to the same independently cached Admin document.
  const relativePath=!requestedPath?'index.html':
   (requestedPath==='admin'||requestedPath==='admin/'?'admin.html':
    (requestedPath==='index'||requestedPath==='index/'?'index.html':requestedPath));
  const cacheKey=cacheURL('./'+relativePath);
  e.respondWith((async()=>{
   const c=await caches.open(CACHE);
   try{
    const r=await fetch(e.request,{cache:'no-store'});
    if(r?.ok){await c.put(cacheKey,fixed(u.href,r));return fixed(u.href,r);}
   }catch(_){}
   const hit=await c.match(cacheKey);
   return hit?fixed(u.href,hit):new Response(relativePath==='admin.html'?'SMV CALENDAR Admin page is not cached. Reconnect once to update Calendar offline files.':'SMV CALENDAR offline page is not cached.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
  })());return;
 }
 e.respondWith((async()=>{const c=await caches.open(CACHE);const critical=/\/(?:calendar-pwa\.mjs|rasi-palan-periods\.mjs|calendar-rasi-palan\.mjs|calendar-rasi-palan\.css|calendar-rasi-palan-rules\.mjs|daily-calendar\.mjs|daily-calendar\.css|calendar-theme\.css|location-search-online-offline\.js|manifest-(?:en|ta)\.webmanifest)$/.test(u.pathname);if(critical){try{const r=await fetch(e.request,{cache:'no-store'});if(r?.ok){await c.put(e.request,r.clone());return fixed(u.href,r);}}catch(_){}}const hit=await c.match(e.request,{ignoreSearch:true})||await caches.match(e.request,{ignoreSearch:true});if(hit){if(!/\/offline\/places\/india\//.test(u.pathname))e.waitUntil(fetch(e.request,{cache:'no-cache'}).then(async r=>{if(r?.ok)await c.put(e.request,r.clone())}).catch(()=>{}));return fixed(u.href,hit);}try{const r=await fetch(e.request,{cache:'no-store'});if(r?.ok){await c.put(e.request,r.clone());return fixed(u.href,r);}}catch(_){}return new Response('SMV CALENDAR offline asset is not cached.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});})());
});
