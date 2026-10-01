const CACHE_NAME='smv-astro-en-20261001-v107';
const APP_SHELL=["./smv-current-v33.css", "./assets/topics-v27.png", "./assets/service-icons-v24.png", "./assets/footer-v24.png", "./assets/smv-premium-desktop-v20.png", "./assets/smv-veerayah-family-mobile-v14.webp", "./assets/smv-brand-logo-v17.png", "./assets/social/facebook.svg", "./assets/social/instagram.svg", "./assets/social/youtube.svg", "./assets/social/whatsapp.svg", "./assets/social/phone.svg", "./sitemap.html", "./terms.html", "./privacy.html", "./legal-pages-v16.css", "./layout-v26.css", "./public-navigation.js?v=15", "./dashboard-live.mjs?v=13", "./index.html", "./interface.js?v=20260917-v13", "./app.mjs?v=20260918-v17", "./public-content.mjs?v=20260911c", "./admin-workflows.mjs?v=20260911c", "./manifest.webmanifest", "./assets/icon-192.png", "./assets/icon-512.png"];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(APP_SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('smv-astro-')&&k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==self.location.origin)return;
 if(req.mode==='navigate'){
  event.respondWith(fetch(req,{cache:'no-cache'}).then(res=>{if(res.ok && (url.pathname.endsWith('/index.html')||url.pathname.endsWith('/'))){const copy=res.clone();caches.open(CACHE_NAME).then(c=>c.put('./index.html',copy));}return res;}).catch(()=>caches.match('./index.html')));return;
 }
 if(['image','style','script','font'].includes(req.destination)||url.pathname.endsWith('.webmanifest')){
  event.respondWith(fetch(req,{cache:'no-cache'}).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE_NAME).then(c=>c.put(req,copy));}return res;}).catch(()=>caches.match(req)));
 }
});
