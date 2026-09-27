(()=>{
let promptEvent=null,ready=false,failed=false;
const button=document.getElementById('installApp'),status=document.getElementById('installStatus');
const ta=()=>document.documentElement.lang==='ta';
function update(){
 document.getElementById('appManifest').href=ta()?'manifest-ta.webmanifest':'manifest-en.webmanifest';
 button.textContent=ta()?'செயலியை நிறுவுக':'Install app';
 button.hidden=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 status.textContent=failed?(ta()?'இணையமில்லா கோப்புகளைச் சேமிக்க முடியவில்லை. இணைய இணைப்புடன் மீண்டும் திறக்கவும்.':'Offline download failed. Reopen with an internet connection.'):(ready?(ta()?'இணையமில்லாமல் பயன்படுத்தத் தயார்.':'Ready for offline use.'):(ta()?'இணையமில்லா பயன்பாட்டிற்கான கோப்புகள் சேமிக்கப்படுகின்றன…':'Preparing files for offline use…'));
}
addEventListener('smv-language',update);
addEventListener('beforeinstallprompt',e=>{e.preventDefault();promptEvent=e;update()});
addEventListener('appinstalled',()=>{promptEvent=null;button.hidden=true;});
button.onclick=async()=>{if(promptEvent){const p=promptEvent;promptEvent=null;await p.prompt();await p.userChoice;update();}else status.textContent=ta()?'உலாவியின் மெனுவில் “முகப்புத் திரையில் சேர்” என்பதைத் தேர்ந்தெடுக்கவும். ஐபோனில் பகிர் பொத்தானைப் பயன்படுத்தவும்.':'Choose “Add to Home Screen” in your browser menu. On iPhone, use the Share button.';};
if('serviceWorker'in navigator){navigator.serviceWorker.register('./sw.js').then(()=>navigator.serviceWorker.ready).then(()=>{ready=true;update()}).catch(()=>{failed=true;update()});}else{failed=true;}update();
})();
