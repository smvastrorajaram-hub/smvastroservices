/* SMV HOROSCOPE service worker — ONLINE AUTHORITY.
   V245 context refresh marker: 2026-10-18 — Ayurdaya text wrapping/color and Ishta note removal.
   No V-number UI cache.
   Frontend, access policy and Print always come from the current network.
   Only /offline/ calculation/location assets may use one stable lazy cache.

   The worker claims its scope without force-reloading open pages; this avoids
   interrupting unsaved report work or active user flows during an update.
*/
const OFFLINE_CACHE='smv-horoscope-offline';
const RUNTIME_REVISION='v250-ayurdaya-selected-total-20261019';

function isOfflineAsset(url){
  if(url.origin!==self.location.origin)return false;
  const scopePath=new URL(self.registration.scope).pathname;
  return url.pathname.startsWith(scopePath+'offline/');
}

self.addEventListener('install',event=>{
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(
      keys
        .filter(k=>k!==OFFLINE_CACHE&&k.startsWith('smv-horoscope-'))
        .map(k=>caches.delete(k))
    );
    await self.clients.claim();
    // Existing tabs keep their current UI state; the online fetch policy supplies
    // current resources on the next navigation/request rather than interrupting work.
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

  event.respondWith(
    fetch(req,{cache:'no-store'}).catch(()=>new Response(
      'Connect to the internet to load the current SMV HOROSCOPE screen.',
      {status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}}
    ))
  );
});
