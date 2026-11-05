/* SMV HOROSCOPE service worker — offline-first UI + local calculation assets.
   The last successful online UI/core download is retained for offline reopening.
   Authentication, published Firestore refresh, account data and online services stay network-only.
   Location lookup keeps its existing GeoNames + India-offline behavior.
*/
const SMV_CACHE_RELEASE='20261105-offline-ui-v2';
const OFFLINE_CACHE='smv-horoscope-offline';
const SHELL_CACHE='smv-horoscope-shell-'+SMV_CACHE_RELEASE;
const RUNTIME_REVISION='v261-offline-first-shell-20261105';

const CORE=[
  './','./index.html',
  './horoscope.css','./chart-style.css','./marriage-basic-report.css',
  './horoscope-readings.css','./smv-ui.css',
  './v358-result-layout.css','./v359-symmetric-gutters.css',
  './manifest-en.webmanifest','./manifest-ta.webmanifest',
  './report-identity.js','./boot.mjs','./horoscope-auth.mjs','./report-store.mjs',
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
  './index.html','./horoscope.css','./boot.mjs','./horoscope.js',
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
          const target=await caches.open(path.startsWith('./offline/')?OFFLINE_CACHE:SHELL_CACHE);
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
  event.waitUntil(cacheCore(6).then(()=>self.skipWaiting()));
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
