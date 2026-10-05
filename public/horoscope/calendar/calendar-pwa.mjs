let installPrompt=window.__smvCalendarInstallPrompt||null;
const params=new URLSearchParams(location.search);
const installArea=document.getElementById('smvCalendarInstallArea');
const installButton=document.getElementById('calInstall');
const installStatus=document.getElementById('calInstallStatus');
const manifest=document.getElementById('calendarManifest');
const installedKey='smv-calendar-pwa-installed-v216';
const legacyInstalledKey='smv-calendar-pwa-installed-v1';
const priorInstalledKey='smv-calendar-pwa-installed-v215';
const ta=()=>document.documentElement.lang==='ta';
const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const setStatus=(en,tamil)=>{if(installStatus)installStatus.textContent=ta()?tamil:en};
const show=()=>{if(installArea)installArea.hidden=false;document.querySelector('.cal-app-link')?.removeAttribute('hidden');};
const hide=()=>{if(installArea)installArea.hidden=true;document.querySelector('.cal-app-link')?.setAttribute('hidden','');};
function setStored(key,value){try{value?localStorage.setItem(key,'1'):localStorage.removeItem(key)}catch{}}
function stored(key){try{return localStorage.getItem(key)==='1'}catch{return false}}
function markInstalled(value){
 setStored(installedKey,value);
 // daily-calendar.mjs already checks this legacy key; keep the two views in sync.
 setStored(legacyInstalledKey,value);
 if(!value)setStored(priorInstalledKey,false);
}
function isMarkedInstalled(){return stored(installedKey)}
function language(lang){
 document.documentElement.lang=lang;
 try{localStorage.setItem('smv-calendar-language',lang)}catch{}
 if(manifest)manifest.href=`manifest-${lang}.webmanifest`;
 const span=installButton?.querySelector('span');if(span)span.textContent=lang==='ta'?'SMV CALENDAR நிறுவுக':'Install SMV CALENDAR';
 window.dispatchEvent(new CustomEvent('smv-language',{detail:lang}));
}
document.getElementById('calTamil')?.addEventListener('click',()=>language('ta'));
document.getElementById('calEnglish')?.addEventListener('click',()=>language('en'));
let storedLanguage;try{storedLanguage=localStorage.getItem('smv-calendar-language')}catch{}
const requested=params.get('lang');language(['ta','en'].includes(requested)?requested:(storedLanguage==='ta'?'ta':'en'));

// V212-V215 used more than one installed flag while the app scope was changing.
// Do not let a stale flag hide the Calendar install control on the corrected /calendar/ scope.
if(!standalone()&&!isMarkedInstalled()){
 setStored(legacyInstalledKey,false);
 setStored(priorInstalledKey,false);
}
function installable(e){
 if(e){e.preventDefault?.();installPrompt=e;window.__smvCalendarInstallPrompt=e;}
 markInstalled(false);
 if(!standalone())show();
 setStatus('','');
}
if(standalone()){
 markInstalled(true);
 hide();
}else if(isMarkedInstalled()){
 hide();
}else{
 // Keep the icon/button visible even before Chrome supplies beforeinstallprompt.
 // On a first visit the child service worker may need to become controller first.
 show();
}
addEventListener('smv:calendar-installable',()=>installable(window.__smvCalendarInstallPrompt));
addEventListener('beforeinstallprompt',installable);
addEventListener('appinstalled',()=>{
 installPrompt=null;window.__smvCalendarInstallPrompt=null;
 markInstalled(true);hide();setStatus('','');
});

function waitForInstallPrompt(timeout=3000){
 const existing=installPrompt||window.__smvCalendarInstallPrompt;
 if(existing)return Promise.resolve(existing);
 return new Promise(resolve=>{
  let done=false;
  const finish=value=>{if(done)return;done=true;clearTimeout(timer);removeEventListener('beforeinstallprompt',onPrompt);resolve(value||null)};
  const onPrompt=e=>{e.preventDefault?.();installPrompt=e;window.__smvCalendarInstallPrompt=e;finish(e)};
  const timer=setTimeout(()=>finish(null),timeout);
  addEventListener('beforeinstallprompt',onPrompt,{once:true});
 });
}

let swReady=Promise.resolve(null);
if('serviceWorker'in navigator){
 let reloading=false;
 const reloadKey='smv-calendar-controller-reload-v216';
 navigator.serviceWorker.addEventListener('controllerchange',()=>{
  const url=navigator.serviceWorker.controller?.scriptURL||'';
  if(reloading||!url.includes('/horoscope/calendar/sw.js'))return;
  try{if(sessionStorage.getItem(reloadKey)==='1')return;sessionStorage.setItem(reloadKey,'1')}catch{}
  reloading=true;location.reload();
 });
 swReady=navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).then(async reg=>{
  try{await reg.update()}catch{}
  await navigator.serviceWorker.ready;
  return reg;
 }).catch(()=>{
  setStatus('Offline files could not be saved. Reopen while online.','இணையமில்லா சேமிப்பு முடியவில்லை; இணையத்துடன் மீண்டும் திறக்கவும்.');
  return null;
 });
}
installButton?.addEventListener('click',async()=>{
 if(standalone()){markInstalled(true);hide();return;}
 await swReady;
 let p=installPrompt||window.__smvCalendarInstallPrompt;
 if(!p)p=await waitForInstallPrompt(3000);
 if(!p){
  // A website cannot force Chrome to install without its install event.
  // Keep the control visible and give the browser-native fallback instead of silently hiding it.
  show();
  setStatus('Chrome menu → Install app / Add to Home screen. Then open SMV CALENDAR from its own icon.','Chrome menu → Install app / Add to Home screen என்பதைத் தேர்ந்தெடுக்கவும். பிறகு SMV CALENDAR தனி icon-ல் திறக்கவும்.');
  return;
 }
 installPrompt=null;window.__smvCalendarInstallPrompt=null;
 try{
  await p.prompt();
  const choice=await p.userChoice;
  if(choice&&choice.outcome==='accepted'){
   markInstalled(true);hide();setStatus('','');
  }else{
   markInstalled(false);show();setStatus('Install cancelled.','நிறுவல் ரத்து செய்யப்பட்டது.');
  }
 }catch{
  markInstalled(false);show();setStatus('Chrome menu → Install app / Add to Home screen.','Chrome menu → Install app / Add to Home screen என்பதைத் தேர்ந்தெடுக்கவும்.');
 }
});
setTimeout(()=>{if(window.__smvCalendarInstallPrompt)installable(window.__smvCalendarInstallPrompt);},1200);
