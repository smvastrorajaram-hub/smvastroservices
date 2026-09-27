(function(){
  const ta=document.documentElement.lang==='ta', t=(en,tamil)=>ta?tamil:en;
  document.addEventListener('input',event=>{if(event.target.closest?.('#dashboard,#admin'))event.target.setAttribute('data-smv-dirty','1');});
  document.addEventListener('change',event=>{if(event.target.closest?.('#dashboard,#admin'))event.target.setAttribute('data-smv-dirty','1');});
  const section=document.getElementById('smvInstallAppSection');
  const mode=window.matchMedia('(display-mode: standalone)');
  const full=window.matchMedia('(display-mode: fullscreen)');
  let installed=false;
  function syncInstall(){if(section)section.hidden=installed||mode.matches||full.matches||navigator.standalone===true;}
  syncInstall();mode.addEventListener?.('change',syncInstall);full.addEventListener?.('change',syncInstall);
  window.addEventListener('appinstalled',()=>{installed=true;syncInstall();});
  // Home owns the banner. Its parent visibility also hides it on internal routes.
  const admin=document.getElementById('admin');
  if(admin){
    const nav=document.createElement('div');nav.className='smv-admin-shortcuts';nav.setAttribute('role','navigation');nav.setAttribute('aria-label',t('Admin sections','நிர்வாகப் பகுதிகள்'));
    for(const [id,en,tamil] of [['adminPendingQuestions','Questions','கேள்விகள் / ஒதுக்கீடு'],['adminAnswers','Answers','பதில் அங்கீகாரம்'],['adminRefunds','Refunds','பணத்திருப்பம்']]){
      const b=document.createElement('button');b.type='button';b.className='smv-admin-shortcut';b.textContent=t(en,tamil);b.onclick=()=>document.getElementById(id)?.parentElement.scrollIntoView({behavior:'smooth',block:'start'});nav.append(b);
    }
    admin.insertBefore(nav,admin.firstChild);
  }
})();

// Account screens live outside the public Home main element.
(function isolateWorkspace(){
 const workspace=document.getElementById('smv-dashboard-page');
 const roots=['dashboard','admin'].map(id=>document.getElementById(id)).filter(Boolean);
 if(!workspace)return;
 function sync(){
  const active=roots.some(el=>!el.classList.contains('hidden'));
  workspace.classList.toggle('hidden',!active);
  document.body.dataset.smvWorkspace=active?'open':'closed';
  const internal=active||document.body.classList.contains('smv-consult-dedicated');
  for(const id of ['smv-public-page','smvPremiumHeaderV9','smv24-footer'])document.getElementById(id)?.classList.toggle('hidden',internal);
 }
 window.__smvSyncWorkspace=sync;
 sync();
})();
