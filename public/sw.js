/* SMV ASTRO main-site service worker — ONLINE AUTHORITY.
   No versioned frontend cache. No app-shell cache.
   Frontend/Admin/UI always use the deployed network source.
   Only offline place-search data may fall back to one stable cache. */
const OFFLINE_PLACE_CACHE='smv-astro-offline-places';

function isOfflinePlaceAsset(url){
  if(url.origin!==self.location.origin)return false;
  const p=url.pathname.toLowerCase();
  return p.endsWith('/main-location-search.js')||p.includes('/horoscope/offline/places/');
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


// Background Push alerts are intentionally independent of the open page.
// The server sends only generic alert text; customer birth details and contact
// information are never included in a system notification.
self.addEventListener('push', event => {
  event.waitUntil((async () => {
    let payload = {};
    try { payload = event.data ? event.data.json() : {}; }
    catch (_) {
      try { payload = { body: event.data ? event.data.text() : '' }; } catch (_) {}
    }

    const title = String(payload.title || 'SMV ASTRO Alert').slice(0, 120);
    const body = String(payload.body || 'You have a new SMV ASTRO request. Tap to open the app.').slice(0, 240);
    const url = String(payload.url || self.registration.scope);
    await self.registration.showNotification(title, {
      body,
      icon: String(payload.icon || new URL('assets/icon-192.png', self.registration.scope).href),
      badge: String(payload.badge || new URL('assets/favicon-64.png', self.registration.scope).href),
      tag: String(payload.tag || 'smv-astro-alert').slice(0, 160),
      renotify: payload.renotify === true,
      requireInteraction: payload.requireInteraction !== false,
      vibrate: Array.isArray(payload.vibrate) ? payload.vibrate.slice(0, 8).map(Number).filter(n => Number.isFinite(n) && n >= 0 && n <= 3000) : [250, 100, 250, 100, 450],
      data: { url }
    });
  })());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const rawTarget = String(event.notification?.data?.url || self.registration.scope);
    let target;
    try { target = new URL(rawTarget, self.registration.scope); }
    catch (_) { target = new URL(self.registration.scope); }
    if (target.origin !== self.location.origin) target = new URL(self.registration.scope);

    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find(client => {
      try { return new URL(client.url).origin === self.location.origin; }
      catch (_) { return false; }
    });
    if (existing) {
      try { await existing.navigate(target.href); } catch (_) {}
      return existing.focus();
    }
    return self.clients.openWindow(target.href);
  })());
});
