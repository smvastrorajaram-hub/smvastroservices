/* SMV HOROSCOPE installation controller.
 * V354: use Chrome's own offer, not shared-origin localStorage, on Pages.
 * The established custom-domain behaviour below is deliberately unchanged.
 */
if(location.hostname==='smvastroservices.pages.dev'){
(()=>{
'use strict';
const area=document.getElementById('smvHoroscopeInstallArea')||document.querySelector('#siteFooter .smv-install-area');
const button=document.getElementById('installApp');
const status=document.getElementById('installStatus');
const manifest=document.getElementById('appManifest');
const key='smv-horoscope-pwa-installed-v1';
const visibilityClass='smv-v354-horoscope-install-offered';
const pagesStyle=document.createElement('style');
pagesStyle.id='smv-v354-pages-horoscope-install-style';
pagesStyle.textContent=`html:not(.${visibilityClass}) #smvHoroscopeInstallArea{display:none!important}`;
document.head.appendChild(pagesStyle);
let deferred=window.__smvHoroscopeInstallPrompt||null;
const standalone=()=>['standalone','minimal-ui','fullscreen'].some(mode=>matchMedia(`(display-mode: ${mode})`).matches)||navigator.standalone===true;
const statusText=t=>{if(status)status.textContent=t||'';};
const hidden=()=>{document.documentElement.classList.remove(visibilityClass);if(area)area.hidden=true;};
const visible=()=>{document.documentElement.classList.add(visibilityClass);if(area)area.hidden=false;};
const flag=value=>{try{value?localStorage.setItem(key,'1'):localStorage.removeItem(key);}catch(_){}};
const syncManifest=()=>{if(manifest)manifest.href=`manifest-${document.documentElement.lang==='ta'?'ta':'en'}.webmanifest`;};
const eligible=e=>{
 if(e){e.preventDefault?.();deferred=e;window.__smvHoroscopeInstallPrompt=e;}
 if(standalone()){hidden();return;}
 // A fresh native install offer is the recovery signal after uninstall.
 flag(false);statusText('');visible();
};
// A parent SMV ASTRO Pages PWA is also standalone; never mark Horoscope installed
// from display-mode alone, because these PWAs share the Pages origin/storage.
if(standalone())hidden();
else if(deferred)eligible(deferred);
else hidden();
window.addEventListener('beforeinstallprompt',eligible);
window.addEventListener('smv:horoscope-installable',()=>{
 if(window.__smvHoroscopeInstallPrompt)eligible(window.__smvHoroscopeInstallPrompt);
});
window.addEventListener('appinstalled',()=>{
 deferred=null;window.__smvHoroscopeInstallPrompt=null;flag(true);hidden();statusText('');
});
window.addEventListener('smv-language',syncManifest);
syncManifest();
if('serviceWorker' in navigator){
 navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'})
  .then(reg=>reg.update().catch(()=>{})).catch(()=>{});
}
button?.addEventListener('click',async()=>{
 if(standalone()){hidden();return;}
 const offer=deferred||window.__smvHoroscopeInstallPrompt;
 if(!offer){hidden();return;}
 // prompt() MUST be called while the user activation from this click is alive.
 deferred=null;window.__smvHoroscopeInstallPrompt=null;hidden();
 try{
  await offer.prompt();
  const choice=await offer.userChoice;
  if(choice?.outcome!=='accepted'){
   flag(false);
   // This event is now consumed: wait for a NEW native offer before showing the button.
   statusText('');
  }
  // Accepted is not the same as installed. appinstalled confirms installation.
 }catch(_){flag(false);statusText('');}
});
})();
}else{
(()=>{
'use strict';
const area=document.getElementById('smvHoroscopeInstallArea')||document.querySelector('#siteFooter .smv-install-area');
const button=document.getElementById('installApp');
const status=document.getElementById('installStatus');
const manifest=document.getElementById('appManifest');
let deferred=window.__smvHoroscopeInstallPrompt||null;
const installedKey='smv-horoscope-pwa-installed-v1';
const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const setStatus=t=>{if(status)status.textContent=t||''};
const hide=()=>{if(area)area.hidden=true;};
const show=()=>{if(area)area.hidden=false;};
function storedInstalled(){try{return localStorage.getItem(installedKey)==='1'}catch{return false}}
function markInstalled(v){try{v?localStorage.setItem(installedKey,'1'):localStorage.removeItem(installedKey)}catch{}}
function currentLang(){return document.documentElement.lang==='ta'?'ta':'en'}
function syncManifest(){if(manifest)manifest.href=`manifest-${currentLang()}.webmanifest`;}
function makeInstallable(e){
 if(e){e.preventDefault?.();deferred=e;window.__smvHoroscopeInstallPrompt=e;}
 markInstalled(false);
 if(!standalone())show();
 setStatus('');
}
if(standalone()){markInstalled(true);hide();return;}
if(storedInstalled()&&!deferred)hide();
else if(deferred)show();
else hide();
window.addEventListener('smv:horoscope-installable',()=>makeInstallable(window.__smvHoroscopeInstallPrompt));
window.addEventListener('beforeinstallprompt',makeInstallable);
window.addEventListener('appinstalled',()=>{deferred=null;window.__smvHoroscopeInstallPrompt=null;markInstalled(true);hide();setStatus('');});
window.addEventListener('smv-language',syncManifest);
syncManifest();
let swReady=Promise.resolve(null);
if('serviceWorker' in navigator){
 swReady=navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).then(async reg=>{try{await reg.update()}catch{}return navigator.serviceWorker.ready;}).catch(()=>null);
}
if(button)button.addEventListener('click',async()=>{
 if(standalone()){markInstalled(true);hide();return;}
 await swReady;
 let p=deferred||window.__smvHoroscopeInstallPrompt;
 if(!p){
   // Keep the control hidden when Chrome has no actionable install event (already installed or not eligible).
   hide();
   return;
 }
 deferred=null;window.__smvHoroscopeInstallPrompt=null;
 try{
   await p.prompt();
   const choice=await p.userChoice;
   if(choice&&choice.outcome==='accepted'){
     markInstalled(true);hide();setStatus('');
   }else{
     markInstalled(false);show();setStatus('Install cancelled.');
   }
 }catch{
   markInstalled(false);show();setStatus('Open Chrome menu and choose Install app.');
 }
});
// A stale installed flag must not suppress a fresh Chrome install event after uninstall.
setTimeout(()=>{if(window.__smvHoroscopeInstallPrompt)makeInstallable(window.__smvHoroscopeInstallPrompt);},1200);
})();
}
