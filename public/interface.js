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
  // Admin quick links are owned by smvastro.mjs so background dashboard refreshes
  // can preserve/re-anchor them without MutationObserver or duplicate DOM builders.
  window.__smvEnsureAdminQuickLinks?.();
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
  if(active){document.body.classList.remove('smv-consult-dedicated','smv-internal-public-view');document.getElementById('smv-consult-dedicated-shell')?.classList.add('hidden');}
  const internal=active||document.body.classList.contains('smv-consult-dedicated');
  for(const id of ['smv-public-page','smvPremiumHeaderV9','smv24-footer'])document.getElementById(id)?.classList.toggle('hidden',internal);
 }
 window.__smvSyncWorkspace=sync;
 sync();
})();
