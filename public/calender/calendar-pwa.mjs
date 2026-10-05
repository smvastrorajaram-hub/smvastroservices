let installPrompt=window.__smvCalendarInstallPrompt||null;
let resolvePrompt;
const promptReady=new Promise(r=>{resolvePrompt=r;if(installPrompt)r(installPrompt)});
const params=new URLSearchParams(location.search);
const ta=()=>document.documentElement.lang==='ta';
const installButton=document.getElementById('calInstall');
const installStatus=document.getElementById('calInstallStatus');
const launchedAsCalendar=()=>matchMedia('(display-mode: standalone)').matches&&params.get('source')==='calendar-pwa';
const setStatus=(en,tamil)=>{if(installStatus)installStatus.textContent=ta()?tamil:en;};
function language(lang){
 document.documentElement.lang=lang;
 try{localStorage.setItem('smv-calendar-language',lang)}catch{}
 document.title='SMV CALENDAR';
 document.getElementById('calendarManifest').href=`manifest-${lang}.webmanifest`;
 if(installButton)installButton.textContent=ta()?'SMV CALENDAR நிறுவுக':'Install SMV CALENDAR';
 window.dispatchEvent(new CustomEvent('smv-language',{detail:lang}));
}
document.getElementById('calTamil').onclick=()=>language('ta');
document.getElementById('calEnglish').onclick=()=>language('en');
let stored;try{stored=localStorage.getItem('smv-calendar-language')}catch{}
const requested=params.get('lang');
language(['ta','en'].includes(requested)?requested:stored==='ta'?'ta':'en');
addEventListener('beforeinstallprompt',e=>{
 e.preventDefault();installPrompt=e;window.__smvCalendarInstallPrompt=e;resolvePrompt?.(e);
 setStatus('Calendar is ready to install as a separate app.','காலண்டரை தனி App ஆக நிறுவ தயாராக உள்ளது.');
});
addEventListener('appinstalled',()=>{
 installPrompt=null;window.__smvCalendarInstallPrompt=null;
 if(installButton)installButton.hidden=true;
 setStatus('SMV CALENDAR installed as a separate app.','SMV CALENDAR தனி App ஆக நிறுவப்பட்டது.');
});
if(launchedAsCalendar()&&installButton)installButton.hidden=true;
let swReady=null;
if('serviceWorker'in navigator){
 swReady=navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).then(()=>navigator.serviceWorker.ready).catch(()=>{
  setStatus('Offline files could not be saved. Reopen while online.','இணையமில்லா சேமிப்பு முடியவில்லை; இணையத்துடன் மீண்டும் திறக்கவும்.');return null;
 });
}
if(installButton)installButton.onclick=async()=>{
 if(launchedAsCalendar()){installButton.hidden=true;return;}
 if(swReady)await swReady;
 let p=installPrompt||window.__smvCalendarInstallPrompt;
 if(!p)p=await Promise.race([promptReady,new Promise(r=>setTimeout(()=>r(null),2200))]);
 if(p){
  installPrompt=null;window.__smvCalendarInstallPrompt=null;
  try{
   await p.prompt();const choice=await p.userChoice;
   if(choice.outcome==='accepted')setStatus('Installing SMV CALENDAR as a separate app…','SMV CALENDAR தனி App ஆக நிறுவப்படுகிறது…');
   else setStatus('Installation was not accepted. Use Chrome menu → Install app while this Calendar page is open.','நிறுவல் ஏற்கப்படவில்லை. இந்த Calendar பக்கம் திறந்திருக்கும் போது Chrome menu → Install app பயன்படுத்தவும்.');
  }catch{
   setStatus('Chrome could not open the Calendar install prompt. Reload this Calendar page once, then use Chrome menu → Install app.','Calendar நிறுவல் சாளரத்தை Chrome திறக்கவில்லை. இந்த Calendar பக்கத்தை ஒருமுறை Reload செய்து Chrome menu → Install app பயன்படுத்தவும்.');
  }
  return;
 }
 setStatus('This Calendar page is not install-ready yet. Reload once, then use Chrome menu → Install app.','இந்த Calendar பக்கம் இன்னும் install-ready ஆகவில்லை. ஒருமுறை Reload செய்து Chrome menu → Install app பயன்படுத்தவும்.');
};
