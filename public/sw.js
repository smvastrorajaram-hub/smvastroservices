/* SMV ASTRO main-site service worker V221 — static/PWA + on-demand main location-search assets.
   Firebase, API, dashboard, payment and application-data requests are never intercepted. */
const CACHE_NAME='smv-astro-static-master-20261005-v221-calendar-nav';
const PLACE_BOOT=[
  './main-location-search-v187.js?v=208-reopt',
  './main-ui-v187.css?v=187',
  './smv-ui-v207.css?v=207',
  './horoscope/offline/places/india-manifest.json?v=187'
];
function isPlaceAsset(url){if(url.origin!==self.location.origin)return false;const p=url.pathname.toLowerCase();return p.endsWith('/main-location-search-v187.js')||p.endsWith('/main-ui-v187.css')||p.includes('/horoscope/offline/places/');}
function isStaticPresentationAsset(url){if(url.origin!==self.location.origin)return false;const p=url.pathname.toLowerCase();if(isPlaceAsset(url))return true;if(p==='/horoscope'||p.startsWith('/horoscope/'))return false;return p.endsWith('/sw.js')||p.includes('/assets/')||/\.css$/.test(p)||/\.(png|jpe?g|webp|gif|svg|ico|avif)$/.test(p)||/(?:logo|icon|favicon)/.test(p)||/\.webmanifest$/.test(p);}
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE_NAME);await Promise.allSettled(PLACE_BOOT.map(u=>cache.add(u)));await self.skipWaiting();})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('smv-astro-static-')&&k!==CACHE_NAME).map(k=>caches.delete(k)));await self.clients.claim();})()));
self.addEventListener('fetch',event=>{const req=event.request;if(req.method!=='GET')return;const url=new URL(req.url);if(!isStaticPresentationAsset(url))return;event.respondWith((async()=>{const cache=await caches.open(CACHE_NAME);const navScript=url.pathname.endsWith('/main-location-search-v187.js');if(navScript){try{const response=await fetch(req,{cache:'no-store'});if(response?.ok){await cache.put(req,response.clone());return response;}}catch(_){}const fallback=await cache.match(req,{ignoreSearch:true})||await caches.match(req,{ignoreSearch:true});if(fallback)return fallback;}const cached=await cache.match(req);if(cached)return cached;try{const response=await fetch(req,{cache:'no-cache'});if(response?.ok)await cache.put(req,response.clone());return response;}catch(err){const any=await caches.match(req);if(any)return any;if(isPlaceAsset(url)){const placeFallback=await caches.match(req,{ignoreSearch:true});if(placeFallback)return placeFallback;}throw err;}})());});
