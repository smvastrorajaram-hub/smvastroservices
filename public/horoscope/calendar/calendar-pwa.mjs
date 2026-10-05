let installPrompt=window.__smvCalendarInstallPrompt||null;
const params=new URLSearchParams(location.search);
const installArea=document.getElementById('smvCalendarInstallArea');
const installButton=document.getElementById('calInstall');
const installStatus=document.getElementById('calInstallStatus');
const manifest=document.getElementById('calendarManifest');
const installedKey='smv-calendar-pwa-installed-v215';
const ta=()=>document.documentElement.lang==='ta';
const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const setStatus=(en,tamil)=>{if(installStatus)installStatus.textContent=ta()?tamil:en};
const show=()=>{if(installArea)installArea.hidden=false;document.querySelector('.cal-app-link')?.removeAttribute('hidden');};
const hide=()=>{if(installArea)installArea.hidden=true;document.querySelector('.cal-app-link')?.setAttribute('hidden','');};
function mark(v){try{v?localStorage.setItem(installedKey,'1'):localStorage.removeItem(installedKey)}catch{}}
function marked(){try{return localStorage.getItem(installedKey)==='1'}catch{return false}}
function language(lang){
 document.documentElement.lang=lang;
 try{localStorage.setItem('smv-calendar-language',lang)}catch{}
 if(manifest)manifest.href=`manifest-${lang}.webmanifest`;
 const span=installButton?.querySelector('span');if(span)span.textContent=lang==='ta'?'SMV CALENDAR நிறுவுக':'Install SMV CALENDAR';
 window.dispatchEvent(new CustomEvent('smv-language',{detail:lang}));
}
document.getElementById('calTamil')?.addEventListener('click',()=>language('ta'));
document.getElementById('calEnglish')?.addEventListener('click',()=>language('en'));
let stored;try{stored=localStorage.getItem('smv-calendar-language')}catch{}
const requested=params.get('lang');language(['ta','en'].includes(requested)?requested:(stored==='ta'?'ta':'en'));
function installable(e){if(e){e.preventDefault?.();installPrompt=e;window.__smvCalendarInstallPrompt=e;}mark(false);if(!standalone())show();setStatus('','');}
if(standalone()){mark(true);hide();}
else if(installPrompt){show();}
else if(marked()){hide();}
else hide();
addEventListener('smv:calendar-installable',()=>installable(window.__smvCalendarInstallPrompt));
addEventListener('beforeinstallprompt',installable);
addEventListener('appinstalled',()=>{installPrompt=null;window.__smvCalendarInstallPrompt=null;mark(true);hide();setStatus('','');});
let swReady=Promise.resolve(null);
if('serviceWorker'in navigator){
 swReady=navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).then(async reg=>{try{await reg.update()}catch{}return navigator.serviceWorker.ready;}).catch(()=>{setStatus('Offline files could not be saved. Reopen while online.','இணையமில்லா சேமிப்பு முடியவில்லை; இணையத்துடன் மீண்டும் திறக்கவும்.');return null});
}
installButton?.addEventListener('click',async()=>{
 if(standalone()){mark(true);hide();return;}
 await swReady;
 const p=installPrompt||window.__smvCalendarInstallPrompt;
 if(!p){hide();return;}
 installPrompt=null;window.__smvCalendarInstallPrompt=null;
 try{await p.prompt();const choice=await p.userChoice;if(choice&&choice.outcome==='accepted'){mark(true);hide();setStatus('','')}else{mark(false);show();setStatus('Install cancelled.','நிறுவல் ரத்து செய்யப்பட்டது.')}}catch{mark(false);show();setStatus('Open Chrome menu and choose Install app.','Chrome menu-வில் Install app என்பதைத் தேர்வு செய்யவும்.')}});
setTimeout(()=>{if(window.__smvCalendarInstallPrompt)installable(window.__smvCalendarInstallPrompt);},1200);
