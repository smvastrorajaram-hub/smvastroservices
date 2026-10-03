(()=>{
let promptEvent=null,ready=false,failed=false,slow=false,installed=false;
const button=document.getElementById('installApp'),status=document.getElementById('installStatus');
const ta=()=>document.documentElement.lang==='ta';
function update(){
 document.getElementById('appManifest').href=ta()?'manifest-ta.webmanifest':'manifest-en.webmanifest';
 button.querySelector('span').textContent=ta()?'SMV ஜாதகம் நிறுவுக':'Install SMV HOROSCOPE';
 button.hidden=installed||matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 status.textContent=failed?(ta()?'இணையமில்லா கோப்புகளைச் சேமிக்க முடியவில்லை. இணைய இணைப்புடன் மீண்டும் திறக்கவும்.':'Offline download failed. Reopen with an internet connection.'):(ready?(ta()?'இணையமில்லாமல் பயன்படுத்தத் தயார்.':'Ready for offline use.'):(slow?(ta()?'இணையமில்லா கோப்புகள் இன்னும் பதிவிறக்கம் ஆகின்றன. இணைய இணைப்பை வைத்திருக்கவும்.':'Offline files are still downloading. Keep your internet connection on.'):(ta()?'இணையமில்லா பயன்பாட்டிற்கான கோப்புகள் சேமிக்கப்படுகின்றன…':'Preparing files for offline use…')));
}
addEventListener('smv-language',update);
addEventListener('beforeinstallprompt',e=>{e.preventDefault();promptEvent=e;update()});
addEventListener('appinstalled',()=>{promptEvent=null;installed=true;update();});
button.onclick=async()=>{if(promptEvent){const p=promptEvent;promptEvent=null;await p.prompt();await p.userChoice;update();}else status.textContent=ta()?'உலாவியின் மெனுவில் “முகப்புத் திரையில் சேர்” என்பதைத் தேர்ந்தெடுக்கவும். ஐபோனில் பகிர் பொத்தானைப் பயன்படுத்தவும்.':'Choose “Add to Home Screen” in your browser menu. On iPhone, use the Share button.';};
if('serviceWorker'in navigator){
 let reloading=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reloading)return;reloading=true;location.reload();});
 const timer=setTimeout(()=>{if(!ready&&!failed){slow=true;update();}},45000);
 navigator.serviceWorker.register('./sw.js?v=v171-runtime-fix-20261003',{updateViaCache:'none'}).then(async reg=>{
  try{await reg.update();}catch(_){}
  const watch=worker=>{if(!worker)return;worker.addEventListener('statechange',()=>{if(worker.state==='redundant'&&!reg.active){failed=true;clearTimeout(timer);update();}});};
  watch(reg.installing);reg.addEventListener('updatefound',()=>watch(reg.installing));
  return navigator.serviceWorker.ready;
 }).then(()=>{clearTimeout(timer);ready=true;failed=false;update();}).catch(()=>{clearTimeout(timer);failed=true;update();});
}else{failed=true;}update();
})();
