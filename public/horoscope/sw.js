/* SMV HOROSCOPE service worker — ONLINE AUTHORITY.
   No V-number cache.
   Frontend, access policy and Print always come from the current network.
   Only /offline/ calculation/location assets may use one stable lazy cache.

   This source change intentionally forces existing Chrome/Opera/PWA service
   workers to update. On activation, every open Horoscope page is navigated once
   to its current URL so the current online JS takes control immediately.
*/
const OFFLINE_CACHE='smv-horoscope-offline';

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

    // Remove every historical versioned Horoscope UI cache.
    await Promise.all(
      keys
        .filter(k=>k!==OFFLINE_CACHE&&k.startsWith('smv-horoscope-'))
        .map(k=>caches.delete(k))
    );

    await self.clients.claim();

    // Force currently-open old runtime pages to load the current online source.
    const clients=await self.clients.matchAll({
      type:'window',
      includeUncontrolled:true
    });

    await Promise.all(clients.map(client=>{
      try{return client.navigate(client.url)}
      catch(_){return null}
    }));
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
        const saved=
          await cache.match(req,{ignoreSearch:true}) ||
          await cache.match(url.pathname,{ignoreSearch:true});

        if(saved)return saved;

        return new Response(
          'Offline calculation asset is unavailable.',
          {
            status:503,
            headers:{'Content-Type':'text/plain; charset=utf-8'}
          }
        );
      }
    })());
    return;
  }

  // UI / Admin access / Auth / Print / cover assets:
  // never serve a Cache Storage copy.
  event.respondWith(
    fetch(req,{cache:'no-store'}).catch(()=>new Response(
      'Connect to the internet to load the current SMV HOROSCOPE screen.',
      {
        status:503,
        headers:{'Content-Type':'text/plain; charset=utf-8'}
      }
    ))
  );
});
