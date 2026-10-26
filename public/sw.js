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


self.addEventListener('notificationclick', event => {
  const details = {
    type: String(event.notification?.data?.type || ''),
    mode: String(event.notification?.data?.mode || ''),
    sessionId: String(event.notification?.data?.sessionId || ''),
    bookingId: String(event.notification?.data?.bookingId || '')
  };
  event.notification?.close();
  event.waitUntil((async () => {
    let target = new URL(String(event.notification?.data?.url || '/'), self.location.origin);
    if (target.origin !== self.location.origin) target = new URL('/', self.location.origin);
    target.searchParams.set('smvLivePush', '1');
    if (details.sessionId) target.searchParams.set('smvSessionId', details.sessionId);
    if (details.bookingId) target.searchParams.set('smvBookingId', details.bookingId);
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin !== self.location.origin) continue;
      await client.focus();
      client.postMessage({ type: 'SMV_LIVE_PUSH_OPEN', payload: details });
      return;
    }
    await self.clients.openWindow(target.href);
  })());
});

/* Firebase Cloud Messaging: data-only push alerts for Astrologer Live Call,
   Live Chat and scheduled/live bookings. Never depend on an open page for delivery. */
try {
  importScripts('https://www.gstatic.com/firebasejs/12.1.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/12.1.0/firebase-messaging-compat.js');
  const SMV_STAGING_PUSH_HOSTS = [
    'smv-astro-phase1-browser-staging.onrender.com',
    'smv-astro-phase1-browser-isolated.onrender.com'
  ];
  const SMV_PUSH_STAGING = SMV_STAGING_PUSH_HOSTS.includes(self.location.hostname);
  const SMV_PUSH_FIREBASE_CONFIG = SMV_PUSH_STAGING
    ? {
        apiKey: 'AIzaSyD9LzJ-7OKZMaVV5kXa9aABBECS6kE8mA',
        authDomain: 'smv-astro-staging.firebaseapp.com',
        projectId: 'smv-astro-staging',
        storageBucket: 'smv-astro-staging.firebasestorage.app',
        messagingSenderId: '73946216796',
        appId: '1:73946216796:web:09500761bec02699a4e999'
      }
    : {
        apiKey: 'AIzaSyCKXyfZ9sjGmej7ygxHpzHNcNysMXHuvSs',
        authDomain: (self.location.hostname === 'smvastroservices.pages.dev' || self.location.hostname.endsWith('.smvastroservices.pages.dev')) ? 'smv-astro.firebaseapp.com' : 'auth.smvastroservices.in',
        projectId: 'smv-astro',
        storageBucket: 'smv-astro.firebasestorage.app',
        messagingSenderId: '299081899217',
        appId: '1:299081899217:web:8d558df08e86037ea539f0'
      };
  if (!firebase.apps.length) firebase.initializeApp(SMV_PUSH_FIREBASE_CONFIG);
  const smvPushMessaging = firebase.messaging();
  smvPushMessaging.onBackgroundMessage(payload => {
    const data = payload?.data || {};
    const fallback = payload?.notification || {};
    const title = String(data.title || fallback.title || 'SMV ASTRO Alert').slice(0, 100);
    const body = String(data.body || fallback.body || 'Open SMV ASTRO to review the request.').slice(0, 240);
    const tag = String(data.tag || ('smv-push-' + Date.now())).slice(0, 100);
    self.registration.showNotification(title, {
      body,
      icon: '/assets/icon-192.png',
      badge: '/assets/icon-192.png',
      tag,
      renotify: true,
      requireInteraction: true,
      vibrate: [250, 120, 250, 120, 450],
      data: {
        url: '/',
        type: String(data.type || 'live_alert'),
        mode: String(data.mode || ''),
        sessionId: String(data.sessionId || ''),
        bookingId: String(data.bookingId || '')
      }
    });
  });
} catch (error) {
  // Other site features continue working if FCM is unsupported or not configured.
  console.warn('SMV ASTRO background push setup is unavailable:', error?.message || error);
}

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
