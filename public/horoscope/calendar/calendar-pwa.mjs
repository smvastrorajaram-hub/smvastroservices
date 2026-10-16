/* V354: Separate Pages-domain Calendar install visibility from legacy hosts. */
if(location.hostname==='smvastroservices.pages.dev'){
 const params=new URLSearchParams(location.search);
 const area=document.getElementById('smvCalendarInstallArea');
 const button=document.getElementById('calInstall');
 const status=document.getElementById('calInstallStatus');
 const manifest=document.getElementById('calendarManifest');
 let offer=window.__smvCalendarInstallPrompt||null;
 const ta=()=>document.documentElement.lang==='ta';
 const standalone=()=>['standalone','minimal-ui','fullscreen'].some(mode=>matchMedia(`(display-mode: ${mode})`).matches)||navigator.standalone===true;
 const flag=value=>{try{value?localStorage.setItem('smv-calendar-pwa-installed-v217','1'):localStorage.removeItem('smv-calendar-pwa-installed-v217')}catch(_){}};
 const statusText=(en,tamil)=>{if(status)status.textContent=ta()?tamil:en;};
 // The calendar module rebuilds .cal-app-link when the language changes. Use a
 // CSS state on html so a newly inserted link cannot reappear after install.
 const style=document.createElement('style');
 style.id='smv-v354-pages-calendar-install-style';
 style.textContent='html:not(.smv-v354-calendar-install-offered) #smvCalendarInstallArea,html:not(.smv-v354-calendar-install-offered) .cal-app-link{display:none!important}';
 document.head.appendChild(style);
 const hide=()=>{
  document.documentElement.classList.remove('smv-v354-calendar-install-offered');
  if(area)area.hidden=true;
  const link=document.querySelector('.cal-app-link');if(link)link.hidden=true;
 };
 const show=()=>{
  if(standalone()){hide();return;}
  document.documentElement.classList.add('smv-v354-calendar-install-offered');
  if(area)area.hidden=false;
  const link=document.querySelector('.cal-app-link');if(link)link.hidden=false;
 };
 function language(lang){
  document.documentElement.lang=lang;
  try{localStorage.setItem('smv-calendar-language',lang)}catch(_){ }
  if(manifest)manifest.href=`manifest-${lang}.webmanifest`;
  const span=button?.querySelector('span');
  if(span)span.textContent=lang==='ta'?'SMV CALENDAR நிறுவுக':'Install SMV CALENDAR';
  window.dispatchEvent(new CustomEvent('smv-language',{detail:lang}));
 }
 document.getElementById('calTamil')?.addEventListener('click',()=>language('ta'));
 document.getElementById('calEnglish')?.addEventListener('click',()=>language('en'));
 let storedLanguage;try{storedLanguage=localStorage.getItem('smv-calendar-language')}catch(_){ }
 const requested=params.get('lang');
 language(['ta','en'].includes(requested)?requested:(storedLanguage==='ta'?'ta':'en'));
 // No stored flag or display-mode can establish installation of the child app
 // on a shared origin. Only appinstalled or a fresh beforeinstallprompt matters.
 function installable(e){
  if(e){e.preventDefault?.();offer=e;window.__smvCalendarInstallPrompt=e;}
  if(standalone()){hide();return;}
  flag(false);statusText('','');show();
 }
 hide();
 if(offer)installable(offer);
 addEventListener('beforeinstallprompt',installable);
 addEventListener('smv:calendar-installable',()=>{
  if(window.__smvCalendarInstallPrompt)installable(window.__smvCalendarInstallPrompt);
 });
 addEventListener('appinstalled',()=>{
  offer=null;window.__smvCalendarInstallPrompt=null;
  flag(true);hide();statusText('','');
 });
 if('serviceWorker' in navigator){
  navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'})
   .then(reg=>reg.update().catch(()=>{})).catch(()=>{
    statusText('Offline files could not be saved. Reopen while online.','இணையமில்லா சேமிப்பு முடியவில்லை; இணையத்துடன் மீண்டும் திறக்கவும்.');
   });
 }
 async function runInstall(){
  if(standalone()){hide();return;}
  const p=offer||window.__smvCalendarInstallPrompt;
  if(!p){hide();return;}
  // Do not await serviceWorker.ready or a timeout before consuming user gesture.
  offer=null;window.__smvCalendarInstallPrompt=null;hide();
  try{
   await p.prompt();
   const choice=await p.userChoice;
   if(choice?.outcome!=='accepted')flag(false);
   // A Chrome accepted choice is NOT appinstalled; don't record a false positive.
  }catch(_){flag(false);}
 }
 button?.addEventListener('click',runInstall);
 addEventListener('smv-calendar-install-request',runInstall);
}else{
let installPrompt=window.__smvCalendarInstallPrompt||null;
const params=new URLSearchParams(location.search);
const installArea=document.getElementById('smvCalendarInstallArea');
const installButton=document.getElementById('calInstall');
const installStatus=document.getElementById('calInstallStatus');
const manifest=document.getElementById('calendarManifest');
const installedKey='smv-calendar-pwa-installed-v217';
const staleKeys=['smv-calendar-pwa-installed-v1','smv-calendar-pwa-installed-v215','smv-calendar-pwa-installed-v216'];
const ta=()=>document.documentElement.lang==='ta';
const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const setStatus=(en,tamil)=>{if(installStatus)installStatus.textContent=ta()?tamil:en};
const appLink=()=>document.querySelector('.cal-app-link');
const show=()=>{if(installArea)installArea.hidden=false;appLink()?.removeAttribute('hidden');};
const hide=()=>{if(installArea)installArea.hidden=true;appLink()?.setAttribute('hidden','');};
function setStored(key,value){try{value?localStorage.setItem(key,'1'):localStorage.removeItem(key)}catch{}}
function stored(key){try{return localStorage.getItem(key)==='1'}catch{return false}}
function markInstalled(value){setStored(installedKey,value);}
function language(lang){
 document.documentElement.lang=lang;
 try{localStorage.setItem('smv-calendar-language',lang)}catch{}
 if(manifest)manifest.href=`manifest-${lang}.webmanifest`;
 const span=installButton?.querySelector('span');if(span)span.textContent=lang==='ta'?'SMV CALENDAR நிறுவுக':'Install SMV CALENDAR';
 window.dispatchEvent(new CustomEvent('smv-language',{detail:lang}));
}
for(const k of staleKeys)setStored(k,false);
document.getElementById('calTamil')?.addEventListener('click',()=>language('ta'));
document.getElementById('calEnglish')?.addEventListener('click',()=>language('en'));
let storedLanguage;try{storedLanguage=localStorage.getItem('smv-calendar-language')}catch{}
const requested=params.get('lang');language(['ta','en'].includes(requested)?requested:(storedLanguage==='ta'?'ta':'en'));

function installable(e){
 if(e){e.preventDefault?.();installPrompt=e;window.__smvCalendarInstallPrompt=e;}
 markInstalled(false);show();setStatus('','');
}
if(standalone()){
 markInstalled(true);hide();
}else if(stored(installedKey)){
 hide();
}else{
 show();
}
addEventListener('smv:calendar-installable',()=>installable(window.__smvCalendarInstallPrompt));
addEventListener('beforeinstallprompt',installable);
addEventListener('appinstalled',()=>{
 installPrompt=null;window.__smvCalendarInstallPrompt=null;
 markInstalled(true);hide();setStatus('','');
});

function waitForInstallPrompt(timeout=6000){
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
 const reloadKey='smv-calendar-controller-reload-v217';
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

async function runInstall(){
 if(standalone()){markInstalled(true);hide();return;}
 markInstalled(false);show();setStatus('Checking Chrome install…','Chrome install சரிபார்க்கப்படுகிறது…');
 await swReady;
 let p=installPrompt||window.__smvCalendarInstallPrompt;
 if(!p)p=await waitForInstallPrompt(6000);
 if(!p){
  show();
  setStatus('Chrome has not provided the native install prompt yet. Reload this Calendar page once, then tap Install SMV CALENDAR again. If Chrome still does not offer it, use Chrome menu → Install app.','Chrome native install prompt இன்னும் கிடைக்கவில்லை. இந்த Calendar page-ஐ ஒருமுறை Reload செய்து மீண்டும் Install SMV CALENDAR அழுத்தவும். அதற்குப் பிறகும் வரவில்லை என்றால் Chrome menu → Install app பயன்படுத்தவும்.');
  return;
 }
 installPrompt=null;window.__smvCalendarInstallPrompt=null;
 try{
  await p.prompt();
  const choice=await p.userChoice;
  if(choice?.outcome==='accepted'){
   // Do not hide or mark installed merely because the prompt was accepted.
   // Only appinstalled/standalone confirms the WebAPK was actually installed.
   show();setStatus('Installing SMV CALENDAR…','SMV CALENDAR நிறுவப்படுகிறது…');
  }else{
   markInstalled(false);show();setStatus('Install cancelled.','நிறுவல் ரத்து செய்யப்பட்டது.');
  }
 }catch{
  markInstalled(false);show();setStatus('Chrome menu → Install app.','Chrome menu → Install app பயன்படுத்தவும்.');
 }
}
installButton?.addEventListener('click',runInstall);
addEventListener('smv-calendar-install-request',runInstall);
setTimeout(()=>{if(window.__smvCalendarInstallPrompt)installable(window.__smvCalendarInstallPrompt);},1200);
}
