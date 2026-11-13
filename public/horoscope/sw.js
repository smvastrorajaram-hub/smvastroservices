/* SMV HOROSCOPE service worker — offline-first UI + local calculation assets.
   The last successful online UI/core download is retained for offline reopening.
   Authentication, published Firestore refresh, account data and online services stay network-only.
   Location lookup keeps its existing GeoNames + India-offline behavior.
*/
const IS_PAGES_DEV_HOST = self.location.hostname === 'smvastroservices.pages.dev' || self.location.hostname.endsWith('.smvastroservices.pages.dev') || self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';
const SMV_CACHE_RELEASE = IS_PAGES_DEV_HOST ? '20261113-receipt-ui-astro-open-color-pages-v1' : '20261113-receipt-ui-astro-open-color-in-v1';
const OFFLINE_CACHE='smv-horoscope-offline';
const LOCATION_CACHE='smv-shared-india-places';
const SHELL_CACHE='smv-horoscope-shell-'+SMV_CACHE_RELEASE;
const RUNTIME_REVISION = IS_PAGES_DEV_HOST ? 'v280-pages-dev-guides-sitemap-20261111' : 'v275-in-guides-home-hide-20261111';
const PAGES_DEV_HELPER_FILES=IS_PAGES_DEV_HOST?['../pages-dev-host-independence.js','../pages-dev-apk-pwa-icons.js']:[];

const CORE=[
  './','./index.html',
  './horoscope.css','./chart-style.css','./marriage-basic-report.css',
  './horoscope-readings.css','./smv-ui.css',
  './v358-result-layout.css','./v359-symmetric-gutters.css',
  './manifest-en.webmanifest','./manifest-ta.webmanifest',
  './assets/pwa-horoscope-192.svg','./assets/pwa-horoscope-512.png','./assets/pwa-horoscope-maskable-192.svg','./assets/pwa-horoscope-maskable.svg',
  './assets/android-app-icon-horoscope.svg','./assets/android-app-icon-horoscope-source.png',
  './assets/favicon-horoscope.png','./assets/favicon-horoscope.ico',
  './android-apk-download.mjs','./android-apk-icons.css',
  './assets/smv-horoscope-website.webp','./assets/smv-horoscope-header-logo.png',
  ...PAGES_DEV_HELPER_FILES,'./report-identity.js','./boot.mjs','./horoscope-auth.mjs','./report-store.mjs',
  './chart-style.js','./config.js','./d9-reading.js','./marriage-matching.js',
  './marriage-basic-report.mjs','./matching-timeline.mjs','./d1-15-year-reading.mjs',
  './report-print.js','./report-print.css','./report-cover-dynamic.js','./report-cover-professional.css',
  './saved-compat.mjs','./prediction-rules-published.js','./prediction-rule-engine.js',
  './prediction-rules-sync.mjs','./prediction-admin.mjs','./prediction-admin-workbench.mjs',
  './horoscope.js','./prediction-online.js','./horoscope-translations.js',
  './horoscope-language.js','./location-search-online-offline.js',
  './horoscope-details.js','./horoscope-form.js','./birth-offset-live.mjs',
  './android-apk-download.mjs','./pwa.js',
  './horoscope-life-engine.js','./horoscope-judgement-engine.js',
  './integrated.js','./d1-time-reading.js','./prediction-synthesis.js',
  './offline/offline-engine.mjs','./offline/server-wrapper.browser.mjs',
  './offline/swiss_vedic.browser.mjs','./offline/wasm-provider.mjs',
  './offline/transit_panchang.browser.mjs','./offline/astro_advanced.browser.mjs',
  './offline/dasa_engine.browser.mjs','./offline/pvr-longevity-sodhya-timing.browser.mjs',
  './offline/cg-rajan-ayurdaya-pinda.browser.mjs','./offline/cg-rajan-ayurdaya-research.browser.mjs',
  './offline/bv-raman-ayurdaya-report.browser.mjs','./offline/bv-raman-hpa-ayurdaya-combined.browser.mjs',
  './offline/bv-raman-ashtakavarga-ayurdaya.browser.mjs','./offline/bv-raman-ishta-kashta.browser.mjs',
  './offline/bv-raman-shadbala.browser.mjs','./offline/cg-rajan-jathaka-kanitham-shadbala.browser.mjs',
  './offline/bphs-cheshta-swiss-orbital-research.browser.mjs','./offline/bphs-shadbala-rectification.browser.mjs',
  './offline/bphs-sputa-drishti.browser.mjs','./offline/bphs-swiss-solar-cheshta.browser.mjs',
  './offline/classical-shodhana.browser.mjs','./offline/saura-classical-mean-motion.browser.mjs',
  './offline/saura-classical-tabular-jya.browser.mjs','./offline/saura-classical-true-longitude.browser.mjs',
  './offline/saura-natal-five-cheshta.browser.mjs','./offline/uttara-kalamrita-ayurdaya.browser.mjs',
  './offline/uttara-kalamrita-shadbala.browser.mjs','./offline/uttara-kalamrita-six-bala.browser.mjs',
  './offline/places/timezone.mjs','./offline/places/tz-boundary-lookup.mjs',
  './offline/vendor/smv-swisseph-local.mjs',
  './offline/vendor/wasm/swisseph.mjs','./offline/vendor/wasm/swisseph.js',
  './offline/vendor/wasm/swisseph.wasm','./offline/vendor/wasm/swisseph.data',
  './offline/places/place-search.mjs','./offline/places/place-display.mjs',
  './offline/places/india-manifest.json'
];

const REQUIRED_CORE=new Set([
  ...PAGES_DEV_HELPER_FILES,
  './index.html','./horoscope.css','./boot.mjs','./horoscope.js',
  './assets/pwa-horoscope-192.svg','./assets/pwa-horoscope-512.png','./assets/pwa-horoscope-maskable-192.svg','./assets/pwa-horoscope-maskable.svg',
  './assets/android-app-icon-horoscope.svg','./assets/android-app-icon-horoscope-source.png',
  './assets/favicon-horoscope.png','./assets/favicon-horoscope.ico',
  './android-apk-download.mjs','./android-apk-icons.css',
  './assets/smv-horoscope-website.webp','./assets/smv-horoscope-header-logo.png',
  './marriage-matching.js','./marriage-basic-report.mjs','./matching-timeline.mjs',
  './d1-15-year-reading.mjs',
  './offline/offline-engine.mjs','./offline/server-wrapper.browser.mjs',
  './offline/swiss_vedic.browser.mjs','./offline/wasm-provider.mjs',
  './offline/transit_panchang.browser.mjs','./offline/astro_advanced.browser.mjs',
  './offline/dasa_engine.browser.mjs','./offline/pvr-longevity-sodhya-timing.browser.mjs',
  './offline/cg-rajan-ayurdaya-pinda.browser.mjs','./offline/cg-rajan-ayurdaya-research.browser.mjs',
  './offline/bv-raman-ayurdaya-report.browser.mjs','./offline/bv-raman-hpa-ayurdaya-combined.browser.mjs',
  './offline/bv-raman-ashtakavarga-ayurdaya.browser.mjs','./offline/bv-raman-ishta-kashta.browser.mjs',
  './offline/bv-raman-shadbala.browser.mjs','./offline/cg-rajan-jathaka-kanitham-shadbala.browser.mjs',
  './offline/bphs-cheshta-swiss-orbital-research.browser.mjs','./offline/bphs-shadbala-rectification.browser.mjs',
  './offline/bphs-sputa-drishti.browser.mjs','./offline/bphs-swiss-solar-cheshta.browser.mjs',
  './offline/classical-shodhana.browser.mjs','./offline/saura-classical-mean-motion.browser.mjs',
  './offline/saura-classical-tabular-jya.browser.mjs','./offline/saura-classical-true-longitude.browser.mjs',
  './offline/saura-natal-five-cheshta.browser.mjs','./offline/uttara-kalamrita-ayurdaya.browser.mjs',
  './offline/uttara-kalamrita-shadbala.browser.mjs','./offline/uttara-kalamrita-six-bala.browser.mjs',
  './offline/places/timezone.mjs','./offline/places/tz-boundary-lookup.mjs',
  './location-search-online-offline.js','./offline/places/place-search.mjs','./offline/places/place-display.mjs','./offline/places/india-manifest.json',
  './offline/vendor/smv-swisseph-local.mjs',
  './offline/vendor/wasm/swisseph.mjs','./offline/vendor/wasm/swisseph.wasm',
  './offline/vendor/wasm/swisseph.data'
]);

const ONLINE_ONLY_ROOTS=new Set([
  'api','auth','wallet','payment','payments','razorpay','session','sessions',
  'booking','bookings','consultation','consultations','notification','notifications',
  'email','account','profile','firebase','firestore','functions'
]);

function isOfflineAsset(url){
  if(url.origin!==self.location.origin)return false;
  const scopePath=new URL(self.registration.scope).pathname;
  return url.pathname.startsWith(scopePath+'offline/');
}

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

const cacheURL=path=>new URL(path,self.registration.scope).href;

function isIndiaPlaceAsset(url){return url.origin===self.location.origin&&url.pathname.includes('/offline/places/');}

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
  let index=0;
  const failures=[];
  const jobs=Array.from({length:Math.min(concurrency,CORE.length)},async()=>{
    while(index<CORE.length){
      const path=CORE[index++];
      try{
        const request=new Request(cacheURL(path),{cache:'reload'});
        const response=await fetch(request,{cache:'no-store'});
        if(response&&response.ok){
          const target=path.startsWith('./offline/places/')?await caches.open(LOCATION_CACHE):await caches.open(path.startsWith('./offline/')?OFFLINE_CACHE:SHELL_CACHE);
          await target.put(request,response.clone());
        }else if(REQUIRED_CORE.has(path)){
          failures.push(path+' (HTTP '+(response?.status||'unknown')+')');
        }
      }catch(error){
        if(REQUIRED_CORE.has(path))failures.push(path+' ('+String(error?.message||error)+')');
      }
    }
  });
  await Promise.all(jobs);
  if(failures.length)throw new Error('Required Horoscope offline UI/calculation assets failed to cache: '+failures.join(', '));
}

self.addEventListener('install',event=>{
  event.waitUntil(cacheCore(6).then(async()=>prefetchIndiaPlaceShards(await caches.open(LOCATION_CACHE),'./offline/places/india-manifest.json','./offline/places/india/')).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const retained=new Set([OFFLINE_CACHE,SHELL_CACHE]);
    const keys=await caches.keys();
    await Promise.all(keys
      .filter(name=>name.startsWith('smv-horoscope-')&&!retained.has(name))
      .map(name=>caches.delete(name)));
    await self.clients.claim();
    // Do not reload open report/forms or disturb saved work during activation.
  })());
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;

  if(isOfflineAsset(url)){
    event.respondWith((async()=>{
      const cache=await caches.open(isIndiaPlaceAsset(url)?LOCATION_CACHE:OFFLINE_CACHE);
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

  // Static screen files only. Same-origin API and user-specific requests are
  // not intercepted or cached even when their HTTP method is GET.
  if(!isStaticPresentationRequest(req,url))return;
  event.respondWith((async()=>{
    const cache=await caches.open(SHELL_CACHE);
    try{
      const network=await fetch(req,{cache:'no-store'});
      if(network&&network.ok)await cache.put(req,network.clone());
      return network;
    }catch(_){
      const saved=await cache.match(req,{ignoreSearch:true})||
        await cache.match(url.pathname,{ignoreSearch:true});
      if(saved)return saved;
      if(req.mode==='navigate'){
        const shell=await cache.match(cacheURL('./index.html'));
        if(shell)return shell;
      }
      return new Response('SMV HOROSCOPE offline screen asset is not cached. Reconnect once to complete the first load.',{
        status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}
      });
    }
  })());
});
