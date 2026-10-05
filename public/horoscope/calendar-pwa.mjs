let installPrompt=window.__smvCalendarInstallPrompt||null;
let resolvePrompt;const promptReady=new Promise(r=>{resolvePrompt=r;if(installPrompt)r(installPrompt)});
const ta=()=>document.documentElement.lang==='ta';
const installButton=document.getElementById('calInstall');
const installStatus=document.getElementById('calInstallStatus');
const installed=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const setStatus=(en,tamil)=>{if(installStatus)installStatus.textContent=ta()?tamil:en;};
function language(lang){document.documentElement.lang=lang;try{localStorage.setItem('smv-calendar-language',lang)}catch{}document.title='SMV CALENDAR';document.getElementById('calendarManifest').href=`calendar-${lang}.webmanifest`;if(installButton)installButton.textContent=ta()?'SMV CALENDAR நிறுவுக':'Install SMV CALENDAR';window.dispatchEvent(new CustomEvent('smv-language',{detail:lang}));}
document.getElementById('calTamil').onclick=()=>language('ta');document.getElementById('calEnglish').onclick=()=>language('en');
let stored;try{stored=localStorage.getItem('smv-calendar-language')}catch{}const requested=new URLSearchParams(location.search).get('lang');language(['ta','en'].includes(requested)?requested:stored==='ta'?'ta':'en');
addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;window.__smvCalendarInstallPrompt=e;resolvePrompt?.(e);setStatus('Calendar is ready to install.','காலண்டர் நிறுவ தயாராக உள்ளது.');});
addEventListener('appinstalled',()=>{installPrompt=null;window.__smvCalendarInstallPrompt=null;if(installButton)installButton.hidden=true;setStatus('SMV CALENDAR installed.','SMV CALENDAR நிறுவப்பட்டது.');});
if(installed()&&installButton)installButton.hidden=true;
let swReady=null;
if('serviceWorker'in navigator){swReady=navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(()=>navigator.serviceWorker.ready).catch(()=>{setStatus('Offline files could not be saved. Reopen while online.','இணையமில்லா சேமிப்பு முடியவில்லை; இணையத்துடன் மீண்டும் திறக்கவும்.');return null;});}
if(installButton)installButton.onclick=async()=>{
 if(installed()){installButton.hidden=true;return;}
 if(swReady)await swReady;
 let p=installPrompt||window.__smvCalendarInstallPrompt;
 if(!p){p=await Promise.race([promptReady,new Promise(r=>setTimeout(()=>r(null),1800))]);}
 if(p){installPrompt=null;window.__smvCalendarInstallPrompt=null;try{await p.prompt();const choice=await p.userChoice;if(choice.outcome==='accepted'){installButton.hidden=true;setStatus('SMV CALENDAR installed.','SMV CALENDAR நிறுவப்பட்டது.');}else setStatus('Installation was not accepted. You can try again from Chrome menu → Install app.','நிறுவல் ஏற்கப்படவில்லை. Chrome menu → Install app மூலம் மீண்டும் முயலலாம்.');}catch{setStatus('Chrome could not open the install prompt. Use Chrome menu → Install app.','Chrome நிறுவல் சாளரத்தைத் திறக்க முடியவில்லை. Chrome menu → Install app பயன்படுத்தவும்.');}return;
 }
 setStatus('Chrome has not offered the install prompt yet. Reload this page once, then use Chrome menu → Install app / Add to Home screen.','Chrome இன்னும் நிறுவல் சாளரத்தை வழங்கவில்லை. இந்தப் பக்கத்தை ஒருமுறை Reload செய்து, Chrome menu → Install app / Add to Home screen பயன்படுத்தவும்.');
};
