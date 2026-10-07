/* SMV HOROSCOPE service worker — ONLINE AUTHORITY.
   V241 context refresh marker: 2026-10-07.
   No V-number UI cache.
   Frontend, access policy and Print always come from the current network.
   Only /offline/ calculation/location assets may use one stable lazy cache.

   This revision intentionally changes the service-worker bytes so existing
   Chrome/Opera/PWA installations replace any older UI-caching worker. On
   activation, every open Horoscope page is navigated once to its current URL.
*/
const OFFLINE_CACHE='smv-horoscope-offline';
const RUNTIME_REVISION='v241-context-refresh-20261007';

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
    const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
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
