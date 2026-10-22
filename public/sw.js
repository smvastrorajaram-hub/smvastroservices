/* SMV ASTRO main-site service worker — ONLINE AUTHORITY.
   No versioned frontend cache. No app-shell cache.
   Frontend/Admin/UI always use the deployed network source.
   Only offline place-search data may fall back to one stable cache. */
const OFFLINE_PLACE_CACHE='smv-astro-offline-places';

// SMV ASTRO Web Push: reuse this existing root-scope service worker so the PWA
// offline-place behavior and fetch policy stay intact. Messages are data-only;
// this handler renders a single persistent system notification.
try {
  importScripts("https://www.gstatic.com/firebasejs/12.1.0/firebase-app-compat.js");
  importScripts("https://www.gstatic.com/firebasejs/12.1.0/firebase-messaging-compat.js");
  if (self.firebase && !self.firebase.apps.length) {
    self.firebase.initializeApp({
      apiKey: "AIzaSyCKXyfZ9sjGmej7ygxHpzHNcNysMXHuvSs",
      authDomain: (self.location.hostname === "smvastroservices.pages.dev" || self.location.hostname.endsWith(".smvastroservices.pages.dev")) ? "smv-astro.firebaseapp.com" : "auth.smvastroservices.in",
      projectId: "smv-astro",
      storageBucket: "smv-astro.firebasestorage.app",
      messagingSenderId: "299081899217",
      appId: "1:299081899217:web:8d558df08e86037ea539f0"
    });
    const smvPushMessaging = self.firebase.messaging();
    smvPushMessaging.onBackgroundMessage(payload => {
      const data = payload && payload.data ? payload.data : {};
      const title = String(data.title || (payload && payload.notification && payload.notification.title) || "SMV ASTRO");
      const options = {
        body: String(data.body || (payload && payload.notification && payload.notification.body) || "A new SMV ASTRO notification is available."),
        icon: "/assets/icon-192.png",
        badge: "/assets/favicon-64.png",
        tag: String(data.tag || "smv-admin-notification"),
        data: { url: String(data.url || "/#dashboard") }
      };
      return self.registration.showNotification(title, options);
    });
  }
} catch (error) {
  // Browsing, offline place search and normal PWA behavior remain available even
  // if the Firebase Messaging SDK cannot load in a restricted network.
  console.warn("SMV ASTRO background push initialization failed:", error && (error.message || error));
}

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const rawTarget = event.notification && event.notification.data && event.notification.data.url || "/#dashboard";
  const target = new URL(String(rawTarget).startsWith("/") ? String(rawTarget) : "/#dashboard", self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin !== self.location.origin) continue;
      if (client.url !== target && typeof client.navigate === "function") await client.navigate(target);
      return client.focus();
    }
    if (self.clients.openWindow) return self.clients.openWindow(target);
  })());
});


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
