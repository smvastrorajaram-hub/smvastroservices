/* SMV ASTRO main-site service worker — ONLINE AUTHORITY.
   No versioned frontend cache. No app-shell cache.
   Frontend/Admin/UI always use the deployed network source.
   Only offline place-search data may fall back to one stable cache. */
const OFFLINE_PLACE_CACHE='smv-astro-offline-places';

function isOfflinePlaceAsset(url){
  if(url.origin!==self.location.origin)return false;
  const p=url.pathname.toLowerCase();
  return p.endsWith('/main-location-search-v187.js')||p.includes('/horoscope/offline/places/');
}

self.addEventListener('install',event=>{
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==OFFLINE_PLACE_CACHE&&(k.startsWith('smv-astro-')||k.startsWith('smvastro-'))).map(k=>caches.delete(k)));
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

  if(isOfflinePlaceAsset(url)){
    event.respondWith((async()=>{
      const cache=await caches.open(OFFLINE_PLACE_CACHE);
      try{
        const network=await fetch(req,{cache:'no-store'});
        if(network&&network.ok)await cache.put(req,network.clone());
        return network;
      }catch(_){
        const saved=await cache.match(req,{ignoreSearch:true})||await cache.match(url.pathname,{ignoreSearch:true});
        if(saved)return saved;
        return new Response('Offline place-search data is unavailable.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
      }
    })());
    return;
  }

  // HTML, JS, CSS, images, Admin UI and all other main-site presentation are online-only.
  event.respondWith(fetch(req,{cache:'no-store'}).catch(()=>new Response(
    'Connect to the internet to load the current SMV ASTRO site.',
    {status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}}
  )));
});
