/* SMV ASTRO main-site service worker — stale-cache isolation
   Scope: static presentation/PWA assets only.
   Firebase, API, dashboard, payment and application-data requests are never intercepted. */
const CACHE_NAME='smv-astro-static-master-20261003-v172';

function isStaticPresentationAsset(url){
  if(url.origin!==self.location.origin) return false;
  const p=url.pathname.toLowerCase();
  // Horoscope owns its own nested service worker/runtime.
  if(p==='/horoscope' || p.startsWith('/horoscope/')) return false;
  return p.endsWith('/sw.js') ||
    p.includes('/assets/') ||
    /\.css$/.test(p) ||
    /\.(png|jpe?g|webp|gif|svg|ico|avif)$/.test(p) ||
    /(?:logo|icon|favicon)/.test(p) ||
    /\.webmanifest$/.test(p);
}

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    await caches.open(CACHE_NAME);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys
      .filter(k=>k.startsWith('smv-astro-static-') && k!==CACHE_NAME)
      .map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(!isStaticPresentationAsset(url)) return;

  event.respondWith((async()=>{
    const cache=await caches.open(CACHE_NAME);
    try{
      const response=await fetch(req,{cache:'no-cache'});
      if(response && response.ok) await cache.put(req,response.clone());
      return response;
    }catch(err){
      const cached=await cache.match(req,{ignoreSearch:true});
      if(cached) return cached;
      throw err;
    }
  })());
});
