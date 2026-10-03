const CACHE='smv-horoscope-v168-consolidated-20261003'+self.registration.scope;
const CORE=[
'./','./index.html','./assets/smvlogo-v159.png','./assets/temple-frame.png','./assets/hero-mobile.png','./assets/hero-desktop.png','./assets/smv-brand-logo-v17.png','./assets/icon-192-v159.png','./assets/icon-512-v159.png','./assets/icon-512-maskable-v159.png','./config.js','./boot.mjs','./horoscope.js','./horoscope-auth.mjs','./report-store.mjs','./report-identity.js','./report-print.css','./report-print.html','./report-print.js','./horoscope-predictions.js','./horoscope-translations.js','./horoscope-language.js','./location-search-online-offline.js','./horoscope-form.js','./horoscope-details.js','./horoscope.css','./marriage-matching.js','./marriage-matching.css','./pwa.js','./manifest-en.webmanifest','./manifest-ta.webmanifest',
'./offline/wasm-provider.mjs','./offline/offline-engine.mjs','./offline/server-v107-wrapper.browser.mjs','./offline/dasa_engine.browser.mjs','./offline/swiss_vedic.browser.mjs','./offline/transit_panchang.browser.mjs','./offline/astro_advanced.browser.mjs','./offline/places/place-search.mjs','./offline/places/timezone.mjs','./offline/places/india-manifest.json','./offline/vendor/smv-swisseph-local.mjs','./offline/vendor/wasm/swisseph.wasm','./offline/vendor/wasm/swisseph.data','./offline/vendor/wasm/swisseph.js','./offline/vendor/wasm/swisseph.mjs','./offline/places/india/a.json','./offline/places/india/b.json','./offline/places/india/c.json','./offline/places/india/d.json','./offline/places/india/e.json','./offline/places/india/f.json','./offline/places/india/g.json','./offline/places/india/h.json','./offline/places/india/i.json','./offline/places/india/j.json','./offline/places/india/k.json','./offline/places/india/l.json','./offline/places/india/m.json','./offline/places/india/n.json','./offline/places/india/o.json','./offline/places/india/other.json','./offline/places/india/p.json','./offline/places/india/q.json','./offline/places/india/r.json','./offline/places/india/s.json','./offline/places/india/t.json','./offline/places/india/ta.json','./offline/places/india/u.json','./offline/places/india/v.json','./offline/places/india/w.json','./offline/places/india/x.json','./offline/places/india/y.json','./offline/places/india/z.json'];
function fixed(url,r){const h=new Headers(r.headers),p=new URL(url,self.registration.scope).pathname.toLowerCase();if(/\.m?js$/.test(p))h.set('Content-Type','text/javascript; charset=utf-8');if(/\.wasm$/.test(p))h.set('Content-Type','application/wasm');return new Response(r.clone().body,{status:r.status,statusText:r.statusText,headers:h});}
self.addEventListener('install',e=>e.waitUntil((async()=>{const c=await caches.open(CACHE);for(const f of CORE){try{const r=await fetch(new Request(f,{cache:'reload'}));if(r.ok)await c.put(f,fixed(f,r));}catch(_){}}await self.skipWaiting();})()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith('smv-horoscope-')&&k!==CACHE)await caches.delete(k);await self.clients.claim();})()));
/* V157 runtime contract:
   - Visual assets, CSS, icons, manifests and this SW are network-first.
   - If network is unavailable, their cached copy is used.
   - Horoscope calculation/application resources remain cache-only at runtime.
   - Cross-origin auth/API requests are not intercepted. */
function smvOnlineVisualAsset(u){
 const p=u.pathname.toLowerCase();
 return p.endsWith('/sw.js') || p.includes('/assets/') || /\.css$/.test(p) ||
        /\.(png|jpe?g|webp|gif|svg|ico|avif)$/.test(p) ||
        /(?:logo|icon|favicon)/.test(p) || /\.webmanifest$/.test(p);
}
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 const u=new URL(e.request.url);
 if(u.origin!==self.location.origin)return;
 if(smvOnlineVisualAsset(u)){
  e.respondWith((async()=>{
   const c=await caches.open(CACHE);
   try{
    const r=await fetch(e.request,{cache:'no-cache'});
    if(r && r.ok){const copy=fixed(u.href,r);await c.put(e.request,copy.clone());return copy;}
   }catch(_e){}
   const hit=await c.match(e.request,{ignoreSearch:true})||await c.match(u.pathname,{ignoreSearch:true});
   return hit?fixed(u.href,hit):new Response('SMV HOROSCOPE visual asset unavailable.',{status:503});
  })());
  return;
 }
 e.respondWith((async()=>{
  const c=await caches.open(CACHE);
  const hit=await c.match(e.request,{ignoreSearch:true})||await c.match(u.pathname,{ignoreSearch:true});
  if(hit)return fixed(u.href,hit);
  if(e.request.mode==='navigate'){const home=await c.match('./index.html');if(home)return fixed(new URL('./index.html',self.registration.scope).href,home);}
  return new Response('SMV HOROSCOPE offline asset is not cached.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
 })());
});
