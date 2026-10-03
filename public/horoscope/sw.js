const CACHE='smv-horoscope-strict-offline-v171-runtime-fix-20261003'+self.registration.scope;
const CORE=[
'./','./index.html','./config.js','./boot.mjs','./horoscope.js','./horoscope-auth.mjs','./report-store.mjs','./report-identity.js','./report-print.css','./report-print.html','./report-print.js','./horoscope-predictions.js','./horoscope-translations.js','./horoscope-language.js','./location-search-online-offline.js','./horoscope-form.js','./horoscope-details.js','./horoscope.css','./marriage-matching.js','./marriage-matching.css','./pwa.js','./manifest-en.webmanifest','./manifest-ta.webmanifest',
'./offline/wasm-provider.mjs','./offline/offline-engine.mjs','./offline/server-v107-wrapper.browser.mjs','./offline/dasa_engine.browser.mjs','./offline/swiss_vedic.browser.mjs','./offline/transit_panchang.browser.mjs','./offline/astro_advanced.browser.mjs','./offline/places/place-search.mjs','./offline/places/timezone.mjs','./offline/places/india-manifest.json','./offline/vendor/smv-swisseph-local.mjs','./offline/vendor/wasm/swisseph.wasm','./offline/vendor/wasm/swisseph.data','./offline/vendor/wasm/swisseph.js','./offline/vendor/wasm/swisseph.mjs','./assets/hero-desktop.png','./assets/hero-mobile.png','./assets/icon-192.png','./assets/icon-512.png','./assets/icon-512-maskable.png','./assets/smvlogo.png','./assets/smv-brand-logo-v17.png','./assets/temple-frame.png','./assets/vinayagar-report.png','./assets/web-black.svg','./assets/phone-black.svg','./assets/whatsapp-black.svg','./assets/email-black.svg','./fonts/noto-sans-tamil.woff2','./fonts/noto-sans-tamil.ttf','./offline/places/india/a.json','./offline/places/india/b.json','./offline/places/india/c.json','./offline/places/india/d.json','./offline/places/india/e.json','./offline/places/india/f.json','./offline/places/india/g.json','./offline/places/india/h.json','./offline/places/india/i.json','./offline/places/india/j.json','./offline/places/india/k.json','./offline/places/india/l.json','./offline/places/india/m.json','./offline/places/india/n.json','./offline/places/india/o.json','./offline/places/india/other.json','./offline/places/india/p.json','./offline/places/india/q.json','./offline/places/india/r.json','./offline/places/india/s.json','./offline/places/india/t.json','./offline/places/india/ta.json','./offline/places/india/u.json','./offline/places/india/v.json','./offline/places/india/w.json','./offline/places/india/x.json','./offline/places/india/y.json','./offline/places/india/z.json'];
function fixed(url,r){const h=new Headers(r.headers),p=new URL(url,self.registration.scope).pathname.toLowerCase();if(/\.m?js$/.test(p))h.set('Content-Type','text/javascript; charset=utf-8');if(/\.wasm$/.test(p))h.set('Content-Type','application/wasm');return new Response(r.clone().body,{status:r.status,statusText:r.statusText,headers:h});}
self.addEventListener('install',e=>e.waitUntil((async()=>{
 const c=await caches.open(CACHE);
 try{
  for(const f of CORE){
   const r=await fetch(new Request(f,{cache:'reload'}));
   if(!r.ok)throw new Error('Required offline asset failed: '+f+' ['+r.status+']');
   await c.put(f,fixed(f,r));
  }
  await self.skipWaiting();
 }catch(err){
  await caches.delete(CACHE);
  console.error('[SMV Offline] Atomic precache failed',err);
  throw err;
 }
})()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith('smv-horoscope-')&&k!==CACHE)await caches.delete(k);await self.clients.claim();})()));
/* Runtime contract: cache-only for Horoscope application resources.
   Network is used only during SW installation/update to seed a complete cache.
   Authentication requests are cross-origin and are deliberately not intercepted. */
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 const u=new URL(e.request.url);
 if(u.origin!==self.location.origin)return;
 e.respondWith((async()=>{
  const c=await caches.open(CACHE);
  const hit=await c.match(e.request,{ignoreSearch:true})||await c.match(u.pathname,{ignoreSearch:true});
  if(hit)return fixed(u.href,hit);
  if(e.request.mode==='navigate'){const home=await c.match('./index.html');if(home)return fixed(new URL('./index.html',self.registration.scope).href,home);}
  return new Response('SMV HOROSCOPE offline asset is not cached.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
 })());
});
