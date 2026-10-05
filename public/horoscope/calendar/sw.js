const CACHE='smv-calendar-v227-color-today';
const PLACE_SHARDS=['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','other','p','q','r','s','t','ta','u','v','w','x','y','z'];
const CORE=[
 './','./index.html','./calendar-pwa.mjs','./manifest-en.webmanifest','./manifest-ta.webmanifest',
 '../daily-calendar.mjs','../daily-calendar.css','../calendar-v226.css','../calendar-data.mjs','../calendar-worker.mjs','../horoscope.js','../horoscope.css','../location-search-online-offline.js',
 '../assets/calendar-192.png','../assets/calendar-512.png','../assets/calendar-maskable.png',
 '../offline/wasm-provider.mjs','../offline/swiss_vedic.browser.mjs','../offline/transit_panchang.browser.mjs',
 '../offline/vendor/smv-swisseph-local.mjs','../offline/vendor/wasm/swisseph.mjs','../offline/vendor/wasm/swisseph.js','../offline/vendor/wasm/swisseph.wasm','../offline/vendor/wasm/swisseph.data',
 '../offline/places/place-search.mjs','../offline/places/india-manifest.json',
 ...PLACE_SHARDS.map(x=>'../offline/places/india/'+x+'.json')
];
function fixed(url,r){const h=new Headers(r.headers),p=new URL(url,self.location.origin).pathname.toLowerCase();if(/\.m?js$/.test(p))h.set('Content-Type','text/javascript; charset=utf-8');if(/\.webmanifest$/.test(p))h.set('Content-Type','application/manifest+json; charset=utf-8');if(/\.json$/.test(p))h.set('Content-Type','application/json; charset=utf-8');if(/\.wasm$/.test(p))h.set('Content-Type','application/wasm');if(/\.data$/.test(p))h.set('Content-Type','application/octet-stream');return new Response(r.clone().body,{status:r.status,statusText:r.statusText,headers:h});}
async function cacheCore(concurrency=6){const c=await caches.open(CACHE);let i=0;const job=async()=>{while(i<CORE.length){const u=CORE[i++];try{const r=await fetch(new Request(u,{cache:'reload'}));if(r.ok)await c.put(u,fixed(u,r));}catch(_){}}};await Promise.all(Array.from({length:Math.min(concurrency,CORE.length)},job));}
self.addEventListener('install',e=>e.waitUntil(cacheCore(6).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith('smv-calendar-')&&k!==CACHE)await caches.delete(k);await self.clients.claim();})()));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;const u=new URL(e.request.url);if(u.origin!==self.location.origin)return;
 if(e.request.mode==='navigate'){if(!u.pathname.startsWith('/horoscope/calendar/'))return;e.respondWith((async()=>{const c=await caches.open(CACHE);try{const r=await fetch(e.request,{cache:'no-store'});if(r?.ok){await c.put('./index.html',r.clone());return fixed(u.href,r);}}catch(_){}const hit=await c.match('./index.html');return hit?fixed(u.href,hit):new Response('SMV CALENDAR offline page is not cached.',{status:503});})());return;}
 e.respondWith((async()=>{const c=await caches.open(CACHE);const critical=/\/(?:calendar-pwa\.mjs|daily-calendar\.mjs|location-search-online-offline\.js|manifest-(?:en|ta)\.webmanifest)$/.test(u.pathname);if(critical){try{const r=await fetch(e.request,{cache:'no-store'});if(r?.ok){await c.put(e.request,r.clone());return fixed(u.href,r);}}catch(_){}}const hit=await c.match(e.request,{ignoreSearch:true})||await caches.match(e.request,{ignoreSearch:true});if(hit){if(!/\/offline\/places\/india\//.test(u.pathname))e.waitUntil(fetch(e.request,{cache:'no-cache'}).then(async r=>{if(r?.ok)await c.put(e.request,r.clone())}).catch(()=>{}));return fixed(u.href,hit);}try{const r=await fetch(e.request,{cache:'no-store'});if(r?.ok){await c.put(e.request,r.clone());return fixed(u.href,r);}}catch(_){}return new Response('SMV CALENDAR offline asset is not cached.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});})());
});
