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
