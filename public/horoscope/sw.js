/* SMV HOROSCOPE service worker — ONLINE AUTHORITY.
   No V-number cache and no install-time pre-cache delay.
   Frontend, Admin access policy and Print always come from the network.
   Only /offline/ calculation/location assets may use one stable lazy cache. */
const OFFLINE_CACHE='smv-horoscope-offline';

function isOfflineAsset(url){
  if(url.origin!==self.location.origin)return false;
  const scopePath=new URL(self.registration.scope).pathname;
  return url.pathname.startsWith(scopePath+'offline/');
}

self.addEventListener('install',event=>{
  // Activate immediately. Do NOT wait for WASM/location pre-caching.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==OFFLINE_CACHE&&k.startsWith('smv-horoscope-')).map(k=>caches.delete(k)));
    await self.clients.claim();
    const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    await Promise.all(clients.map(c=>{try{return c.navigate(c.url)}catch(_){return null}}));
  })());
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;

  if(isOfflineAsset(url)){
    event.respondWith((async()=>{
      const cache=await caches.open(OFFLINE_CACHE);
      try{
        const network=await fetch(req,{cache:'no-store'});
        if(network&&network.ok)await cache.put(req,network.clone());
        return network;
      }catch(_){
        const saved=await cache.match(req,{ignoreSearch:true})||await cache.match(url.pathname,{ignoreSearch:true});
        if(saved)return saved;
        return new Response('Offline calculation asset is unavailable.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
      }
    })());
    return;
  }

  // Horoscope UI, access config, auth UI, report-store and Print are always online-current.
  event.respondWith(fetch(req,{cache:'no-store'}).catch(()=>new Response(
    'Connect to the internet to load the current SMV HOROSCOPE screen.',
    {status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}}
  )));
});
