/* SMV ASTRO main-site service worker — offline-capable static UI shell.
   HTML/CSS/JS presentation is network-first and retained for offline reopening.
   Authentication, account data, APIs, payments and consultation operations stay network-only.
   Location search keeps its existing independent online/offline cache. */
const OFFLINE_PLACE_CACHE='smv-astro-offline-places';
const APP_SHELL_CACHE='smv-astro-shell-v1';
const APP_SHELL_FILES=[
  './','./index.html','./manifest.webmanifest',
  './smvastro.css','./smv-ui.css','./dashboard-typography.css',
  './android-app-install.css','./payment-timing.js','./smvastro.mjs',
  './coalesced-refresh.mjs','./razorpay-checkout-loader.mjs','./chat-moderation.js',
  './assets/icon-192.png','./assets/favicon-64.png'
];
const ONLINE_ONLY_ROOTS=new Set([
  'api','auth','wallet','payment','payments','razorpay','session','sessions',
  'booking','bookings','consultation','consultations','notification','notifications',
  'email','account','profile','firebase','firestore','functions'
]);

function isOnlineOnlyRequest(url){
  const first=url.pathname.toLowerCase().split('/').filter(Boolean)[0]||'';
  if(ONLINE_ONLY_ROOTS.has(first))return true;
  return [...url.searchParams.keys()].some(key=>/^(?:token|access_token|id_token|auth|uid|userid|sessionid|bookingid|paymentid|orderid|customerid|wallet|email|phone)$/i.test(key));
}

function isOfflinePlaceAsset(url){
  if(url.origin!==self.location.origin)return false;
  const p=url.pathname.toLowerCase();
  return p.endsWith('/main-location-search.js')||p.includes('/horoscope/offline/places/');
}

function isStaticPresentationRequest(req,url){
  if(url.origin!==self.location.origin||isOnlineOnlyRequest(url))return false;
  const p=url.pathname.toLowerCase();
  // HOROSCOPE and CALENDAR own narrower service-worker scopes and caches.
  if(p==='/horoscope'||p.startsWith('/horoscope/'))return false;
  if(req.mode==='navigate')return true;
  return /\.(?:html?|css|js|mjs|json|webmanifest|png|jpe?g|webp|gif|svg|ico|avif|woff2?|ttf|otf|wasm|data)$/.test(p);
}

async function cacheAppShell(){
  const cache=await caches.open(APP_SHELL_CACHE);
  await Promise.allSettled(APP_SHELL_FILES.map(async path=>{
    const request=new Request(new URL(path,self.registration.scope).href,{cache:'reload'});
    const response=await fetch(request,{cache:'no-store'});
    if(response&&response.ok)await cache.put(request,response.clone());
  }));
}

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    await cacheAppShell();
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==OFFLINE_PLACE_CACHE&&k!==APP_SHELL_CACHE&&(k.startsWith('smv-astro-')||k.startsWith('smvastro-'))).map(k=>caches.delete(k)));
    await self.clients.claim();
    // Do not force-reload open customer/admin/live-session windows during activation.
    // The online-authoritative fetch handler serves current assets on their next request.
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
    'smv-astro-phase1-browser-isolated.onrender.com',
    'fix-cloudflare-live-booking.smvastroservices.pages.dev'
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
    if (String(data.type || '') === 'stop_ringing') return;
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

  // Keep the established online + offline India place-search behavior isolated.
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

  // Only static presentation resources are eligible. API/account/financial and
  // other online-only requests are left entirely to the browser/network stack.
  if(!isStaticPresentationRequest(req,url))return;
  event.respondWith((async()=>{
    const cache=await caches.open(APP_SHELL_CACHE);
    try{
      const network=await fetch(req,{cache:'no-store'});
      if(network&&network.ok)await cache.put(req,network.clone());
      return network;
    }catch(_){
      const saved=await cache.match(req,{ignoreSearch:true})||
        await cache.match(new URL(url.pathname,self.location.origin).href,{ignoreSearch:true});
      if(saved)return saved;
      if(req.mode==='navigate'){
        const shell=await cache.match(new URL('./index.html',self.registration.scope).href);
        if(shell)return shell;
      }
      return new Response('SMV ASTRO offline UI asset is not cached. Reconnect once to load it.',{
        status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}
      });
    }
  })());
});
