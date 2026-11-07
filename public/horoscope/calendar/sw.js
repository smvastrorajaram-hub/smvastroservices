const SMV_CACHE_RELEASE='20261107-private-chat-selected-astrologer-v5';
const CACHE='smv-calendar-forecast-assets-'+SMV_CACHE_RELEASE;
const LOCATION_CACHE='smv-shared-india-places';
const CORE=[
 './','./index.html','./admin.html','./rasi-palan-periods.mjs','./calendar-pwa.mjs','./manifest-en.webmanifest','./manifest-ta.webmanifest',
 '../assets/favicon-calendar-16.png','../assets/favicon-calendar-32.png','../assets/favicon-calendar-64.png','../assets/favicon-calendar.ico',
 '../assets/smv-calendar-website.webp',
 '../daily-calendar.mjs','../daily-calendar.css','../calendar-rasi-palan.mjs','../calendar-rasi-palan.css','../calendar-rasi-palan-rules.mjs','../calendar-theme.css','../calendar-data.mjs','../calendar-worker.mjs','../horoscope.js','../horoscope.css','../location-search-online-offline.js',
 '../assets/calendar-192.png','../assets/calendar-512.png','../assets/calendar-maskable.png',
 '../offline/wasm-provider.mjs','../offline/swiss_vedic.browser.mjs','../offline/transit_panchang.browser.mjs',
 '../offline/vendor/smv-swisseph-local.mjs','../offline/vendor/wasm/swisseph.mjs','../offline/vendor/wasm/swisseph.js','../offline/vendor/wasm/swisseph.wasm','../offline/vendor/wasm/swisseph.data',
 '../offline/places/place-search.mjs','../offline/places/place-display.mjs','../offline/places/timezone.mjs','../offline/places/tz-boundary-lookup.mjs','../offline/places/india-manifest.json',
];
function fixed(url,r){const h=new Headers(r.headers),p=new URL(url,self.location.origin).pathname.toLowerCase();if(/\.m?js$/.test(p))h.set('Content-Type','text/javascript; charset=utf-8');if(/\.webmanifest$/.test(p))h.set('Content-Type','application/manifest+json; charset=utf-8');if(/\.json$/.test(p))h.set('Content-Type','application/json; charset=utf-8');if(/\.wasm$/.test(p))h.set('Content-Type','application/wasm');if(/\.data$/.test(p))h.set('Content-Type','application/octet-stream');return new Response(r.clone().body,{status:r.status,statusText:r.statusText,headers:h});}
const REQUIRED_CORE = new Set([
 './index.html','./admin.html','./calendar-pwa.mjs',
 '../assets/calendar-192.png','../assets/calendar-512.png','../assets/calendar-maskable.png',
 '../assets/favicon-calendar-16.png','../assets/favicon-calendar-32.png','../assets/favicon-calendar-64.png','../assets/favicon-calendar.ico',
 '../assets/smv-calendar-website.webp',
 './rasi-palan-periods.mjs','../daily-calendar.mjs','../calendar-rasi-palan.mjs',
 '../calendar-rasi-palan.css','../calendar-rasi-palan-rules.mjs','../daily-calendar.css',
 '../calendar-data.mjs','../calendar-worker.mjs','../offline/wasm-provider.mjs','../offline/places/timezone.mjs','../offline/places/tz-boundary-lookup.mjs',
 '../offline/places/place-search.mjs','../offline/places/place-display.mjs','../offline/places/india-manifest.json',
 '../location-search-online-offline.js',
 '../offline/vendor/wasm/swisseph.js','../offline/vendor/wasm/swisseph.wasm','../offline/vendor/wasm/swisseph.data'
]);
const cacheURL = path => new URL(path, self.registration.scope).href;
const ONLINE_ONLY_ROOTS=new Set([
 'api','auth','wallet','payment','payments','razorpay','session','sessions',
 'booking','bookings','consultation','consultations','notification','notifications',
 'email','account','profile','firebase','firestore','functions'
]);
function isOnlineOnlyRequest(url){
 const scopePath=new URL(self.registration.scope).pathname;
 const relative=url.pathname.startsWith(scopePath)?url.pathname.slice(scopePath.length):url.pathname;
 const first=relative.toLowerCase().split('/').filter(Boolean)[0]||'';
 if(ONLINE_ONLY_ROOTS.has(first))return true;
 return [...url.searchParams.keys()].some(key=>/^(?:token|access_token|id_token|auth|uid|userid|sessionid|bookingid|paymentid|orderid|customerid|wallet|email|phone)$/i.test(key));
}
function isStaticPresentationRequest(req,url){
 if(url.origin!==self.location.origin||isOnlineOnlyRequest(url))return false;
 if(req.mode==='navigate')return true;
 return /\.(?:html?|css|js|mjs|json|webmanifest|png|jpe?g|webp|gif|svg|ico|avif|woff2?|ttf|otf|wasm|data)$/.test(url.pathname.toLowerCase());
}
async function prefetchIndiaPlaceShards(target,manifestPath,shardDirectory){
  const manifestUrl=new URL(manifestPath,self.registration.scope).href;
  let response=await target.match(manifestUrl);
  if(!response){
    response=await fetch(new Request(manifestUrl,{cache:'reload'}),{cache:'no-store'});
    if(!response?.ok)throw new Error('India offline location manifest could not be downloaded.');
    await target.put(manifestUrl,response.clone());
  }
  const manifest=await response.json();
  const entries=Object.entries(manifest?.shards||{});
  if(entries.length!==28)throw new Error('Expected 28 India location shards; found '+entries.length);
  const version=encodeURIComponent(String(manifest.version||1));
  let next=0;const failures=[];
  async function worker(){
    while(next<entries.length){
      const [key,metadata]=entries[next++];
      const file=String(metadata?.file||'');
      if(!/^[a-z]+\.json$/.test(file)){failures.push(String(key)+': invalid shard filename');continue;}
      const url=new URL(shardDirectory+encodeURIComponent(file)+'?v='+version,self.registration.scope).href;
      const request=new Request(url,{cache:'reload'});
      const current=await target.match(request).catch(()=>null);
      if(current?.ok)continue;
      let saved=false,lastError=null;
      for(let attempt=0;attempt<2&&!saved;attempt++){
        try{
          const result=await fetch(request,{cache:'no-store'});
          if(!result?.ok)throw new Error('HTTP '+(result?.status||'unavailable'));
          await target.put(request,result.clone());
          const verified=await target.match(request);
          if(!verified?.ok)throw new Error('Cache Storage verification failed');
          saved=true;
        }catch(error){lastError=error;}
      }
      if(!saved)failures.push(file+' ('+String(lastError?.message||lastError||'download failed')+')');
    }
  }
  await Promise.all([worker(),worker()]);
  if(failures.length)throw new Error('India offline location pack incomplete: '+failures.length+' shards failed: '+failures.slice(0,8).join(', '));
  const records=Number(manifest?.records);
  if(!Number.isSafeInteger(records)||records!==557995)throw new Error('Unexpected India place count in manifest: '+records);
  console.info('SMV India offline place pack verified:',records,'records,',entries.length,'shards.');
}

async function cacheCore(concurrency=6){
 const c=await caches.open(CACHE);let i=0;const failures=[];
 const job=async()=>{while(i<CORE.length){
  const path=CORE[i++],url=cacheURL(path);
  try{
   const r=await fetch(new Request(url,{cache:'reload'}));
   if(r.ok){const target=path.includes('/offline/places/')?await caches.open(LOCATION_CACHE):c;await target.put(url,fixed(url,r));}
   else if(REQUIRED_CORE.has(path))failures.push(path+' (HTTP '+r.status+')');
  }catch(error){if(REQUIRED_CORE.has(path))failures.push(path+' ('+String(error?.message||error)+')');}
 }};
 await Promise.all(Array.from({length:Math.min(concurrency,CORE.length)},job));
 if(failures.length)throw new Error('Required Calendar offline assets failed to cache: '+failures.join(', '));
}
self.addEventListener('install',e=>e.waitUntil(cacheCore(6).then(async()=>prefetchIndiaPlaceShards(await caches.open(LOCATION_CACHE),'../offline/places/india-manifest.json','../offline/places/india/')).then(()=>self.skipWaiting())));
async function preserveCachedIndiaPlaces(target){
 const locationTarget=await caches.open(LOCATION_CACHE);
 const oldNames=(await caches.keys()).filter(name=>name.startsWith('smv-calendar-')&&name!==CACHE);
 for(const name of oldNames){
  const source=await caches.open(name);
  for(const request of await source.keys()){
   const pathname=new URL(request.url).pathname;
   if(!/\/offline\/places\/india\/[^/]+\.json$/.test(pathname))continue;
   if(await locationTarget.match(request))continue;
   const response=await source.match(request);
   if(response)await locationTarget.put(request,response);
  }
 }
}
self.addEventListener('activate',e=>e.waitUntil((async()=>{
 const target=await caches.open(CACHE);
 // Keep any India location shards already downloaded for offline use; future
 // missing shards are cached lazily when the user searches for those places.
 await preserveCachedIndiaPlaces(target);
 for(const k of await caches.keys())if(k.startsWith('smv-calendar-')&&k!==CACHE)await caches.delete(k);
 await self.clients.claim();
})()));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 const u=new URL(e.request.url);
 if(u.origin!==self.location.origin)return;
 // Keep authenticated/admin data, payments, booking and consultation APIs online-only.
 if(!isStaticPresentationRequest(e.request,u))return;
 if(e.request.mode==='navigate'){
  const scopePath=new URL(self.registration.scope).pathname;
  if(!u.pathname.startsWith(scopePath))return;
  const requestedPath=u.pathname.slice(scopePath.length).replace(/^\/+/, '');
  // Cloudflare Pages may normalize /admin.html to /admin. Both URLs resolve
  // to the same independently cached static Calendar Admin redirect document.
  const relativePath=!requestedPath?'index.html':
   (requestedPath==='admin'||requestedPath==='admin/'?'admin.html':
    (requestedPath==='index'||requestedPath==='index/'?'index.html':requestedPath));
  const cacheKey=cacheURL('./'+relativePath);
  e.respondWith((async()=>{
   const c=await caches.open(CACHE);
   try{
    const r=await fetch(e.request,{cache:'no-store'});
    if(r?.ok){await c.put(cacheKey,fixed(u.href,r));return fixed(u.href,r);}
   }catch(_){}
   const hit=await c.match(cacheKey);
   return hit?fixed(u.href,hit):new Response(relativePath==='admin.html'?'SMV CALENDAR Admin page is not cached. Reconnect once to update Calendar offline files.':'SMV CALENDAR offline page is not cached.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
  })());return;
 }
 e.respondWith((async()=>{
  const c=await caches.open(CACHE);
  const critical=/\/(?:calendar-pwa\.mjs|rasi-palan-periods\.mjs|calendar-rasi-palan\.mjs|calendar-rasi-palan\.css|calendar-rasi-palan-rules\.mjs|daily-calendar\.mjs|daily-calendar\.css|calendar-theme\.css|location-search-online-offline\.js|manifest-(?:en|ta)\.webmanifest)$/.test(u.pathname);
  if(critical){
   try{
    const r=await fetch(e.request,{cache:'no-store'});
    if(r?.ok){await c.put(e.request,r.clone());return fixed(u.href,r);}
   }catch(_){}
  }
  const versionedShard=/\/offline\/places\/india\/[^/]+\.json$/i.test(u.pathname)&&u.searchParams.has('v');
  const hit=await c.match(e.request)||(!versionedShard?(await c.match(e.request,{ignoreSearch:true})||await caches.match(e.request,{ignoreSearch:true})):await caches.match(e.request));
  if(hit){
   if(!/\/offline\/places\/india\//.test(u.pathname))e.waitUntil(fetch(e.request,{cache:'no-cache'}).then(async r=>{if(r?.ok)await c.put(e.request,r.clone())}).catch(()=>{}));
   return fixed(u.href,hit);
  }
  try{
   const r=await fetch(e.request,{cache:'no-store'});
   if(r?.ok){await c.put(e.request,r.clone());return fixed(u.href,r);}
  }catch(_){}
  return new Response('SMV CALENDAR offline asset is not cached.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
 })());
});
