/*
  SMV HOROSCOPE service worker — ONLINE SOURCE OF TRUTH

  There is deliberately NO V-number cache.

  Browser-visible frontend, Admin/access files and Print files are never served
  from Cache Storage. When online, Chrome / Opera / other browsers request the
  current deployed files from the network with cache:'no-store'.

  Only /offline/ calculation/location assets may use the one stable offline
  cache, and even those are network-first when internet is available.
*/
const OFFLINE_CACHE='smv-horoscope-offline';

const OFFLINE_ASSETS=[
  './offline/wasm-provider.mjs',
  './offline/offline-engine.mjs',
  './offline/server-v107-wrapper.browser.mjs',
  './offline/dasa_engine.browser.mjs',
  './offline/swiss_vedic.browser.mjs',
  './offline/transit_panchang.browser.mjs',
  './offline/astro_advanced.browser.mjs',
  './offline/vendor/smv-swisseph-local.mjs',
  './offline/vendor/wasm/swisseph.mjs',
  './offline/vendor/wasm/swisseph.js',
  './offline/vendor/wasm/swisseph.wasm',
  './offline/vendor/wasm/swisseph.data',
  './offline/places/place-search.mjs',
  './offline/places/timezone.mjs',
  './offline/places/india-manifest.json',
  ...['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','other','p','q','r','s','t','ta','u','v','w','x','y','z']
    .map(x=>'./offline/places/india/'+x+'.json')
];

function fixed(url,response){
  const headers=new Headers(response.headers);
  const p=new URL(url,self.registration.scope).pathname.toLowerCase();
  if(/\.m?js$/.test(p))headers.set('Content-Type','text/javascript; charset=utf-8');
  if(/\.json$/.test(p))headers.set('Content-Type','application/json; charset=utf-8');
  if(/\.wasm$/.test(p))headers.set('Content-Type','application/wasm');
  if(/\.data$/.test(p))headers.set('Content-Type','application/octet-stream');
  return new Response(response.clone().body,{
    status:response.status,
    statusText:response.statusText,
    headers
  });
}

async function refreshOfflineAssets(){
  const cache=await caches.open(OFFLINE_CACHE);
  let i=0;
  const worker=async()=>{
    while(i<OFFLINE_ASSETS.length){
      const asset=OFFLINE_ASSETS[i++];
      try{
        const r=await fetch(new Request(asset,{cache:'reload'}));
        if(r.ok)await cache.put(asset,fixed(asset,r));
      }catch(_){}
    }
  };
  await Promise.all(Array.from({length:4},worker));
}

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    await refreshOfflineAssets();
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    // Remove every historical versioned Horoscope cache.
    for(const key of await caches.keys()){
      if(key!==OFFLINE_CACHE && key.startsWith('smv-horoscope-')){
        await caches.delete(key);
      }
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;

  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;

  const scopePath=new URL(self.registration.scope).pathname;
  if(!url.pathname.startsWith(scopePath))return;

  const relative=url.pathname.slice(scopePath.length);
  const isOfflineAsset=relative.startsWith('offline/');

  if(isOfflineAsset){
    event.respondWith((async()=>{
      const cache=await caches.open(OFFLINE_CACHE);
      try{
        // Online always gets the latest offline engine/location asset first.
        const network=await fetch(event.request,{cache:'no-store'});
        if(network&&network.ok){
          await cache.put(event.request,network.clone());
          return fixed(url.href,network);
        }
      }catch(_){}

      const saved=
        await cache.match(event.request,{ignoreSearch:true}) ||
        await cache.match(url.pathname,{ignoreSearch:true});
      if(saved)return fixed(url.href,saved);

      return new Response('Offline calculation asset is unavailable.',{
        status:503,
        headers:{'Content-Type':'text/plain; charset=utf-8'}
      });
    })());
    return;
  }

  // EVERYTHING ELSE is online authoritative:
  // navigation, HTML, CSS, JS, Admin access, language UI, saved-report UI,
  // report-print HTML/CSS/JS and cover assets.
  event.respondWith(
    fetch(event.request,{cache:'no-store'})
      .catch(()=>new Response(
        'This screen requires an online connection to load the current SMV ASTRO version.',
        {status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}}
      ))
  );
});
