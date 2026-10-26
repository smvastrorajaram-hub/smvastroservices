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

/* V315: Admin shortcuts are a permanent UI control, not a child of the
   asynchronously rendered data/summary area. The legacy runtime may rebuild
   or re-anchor its own links around the Auto Approval card; those are hidden
   ONLY inside Admin, while this stable, pre-built row stays in place.
   Deliberately NO MutationObserver, timer, API call or Firebase read. */
(function stableAdminShortcuts(){
 const admin=document.getElementById('admin');
 const summary=document.getElementById('adminSummary')?.closest('.card');
 if(!admin||!summary||!admin.contains(summary))return;
 if(document.getElementById('smvAdminFixedQuickLinks'))return;
 const title=summary.querySelector('.admin-dashboard-title');
 if(!title)return;
 const shortcuts=[
  ['adminPendingQuestions','Public Questions','parent'],
  ['adminAnswers','Answers','parent'],
  ['adminPrivatePending','Private Questions','parent'],
  ['adminRefunds','Refunds','parent'],
  ['adminHoroscopePriceSet','Horoscope Settings','self'],
  ['adminWithdrawals','Withdrawals','parent'],
  ['adminCommissionSettings','Commission','self']
 ];
 // Isolate the CSS to the eight shortcuts only; do not change the other cards.
 const style=document.createElement('style');
 style.id='smvAdminFixedQuickLinksStyle';
 style.textContent=`
 #admin #smvAdminQuickLinks{display:none!important}
 #admin #smvAdminFixedQuickLinks{
   display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;
   gap:8px 12px!important;justify-content:center!important;justify-items:stretch!important;
   align-items:center!important;width:min(100%,760px)!important;max-width:760px!important;
   box-sizing:border-box!important;margin:18px auto 22px!important;padding:0 8px!important;
 }
 html body #admin #smvAdminFixedQuickLinks > button{
   display:flex!important;align-items:center!important;justify-content:center!important;
   width:100%!important;min-width:0!important;max-width:none!important;
   min-height:44px!important;height:auto!important;margin:0!important;padding:8px 4px!important;
   box-sizing:border-box!important;background:transparent!important;box-shadow:none!important;
   border:0!important;border-bottom:2px solid #e0c489!important;border-radius:0!important;
   font:700 clamp(11px,1.1vw,13px)/1.3 Arial,Helvetica,sans-serif!important;
   color:#9e141f!important;-webkit-text-fill-color:#9e141f!important;
   text-align:center!important;text-wrap:balance;cursor:pointer!important;
 }
 html body #admin #smvAdminFixedQuickLinks > button:focus-visible{
   outline:2px solid #9e141f!important;outline-offset:2px!important;
 }
 @media(max-width:700px){
  #admin #smvAdminFixedQuickLinks{
    grid-template-columns:repeat(2,minmax(0,1fr))!important;
    width:min(100%,520px)!important;max-width:520px!important;
    gap:8px 10px!important;margin:12px auto 20px!important;padding:0 10px!important;
  }
  html body #admin #smvAdminFixedQuickLinks > button{
    min-height:48px!important;padding:8px 3px!important;
    font-size:clamp(11px,2.65vw,14px)!important;
  }
 }`;
 document.head.appendChild(style);
 const nav=document.createElement('div');
 nav.id='smvAdminFixedQuickLinks';
 nav.setAttribute('role','navigation');
 nav.setAttribute('aria-label','Admin dashboard shortcuts');
 for(const [id,label,mode] of shortcuts){
  const button=document.createElement('button');
  button.type='button';
  button.textContent=label;
  button.dataset.adminShortcut=id;
  button.dataset.adminTargetMode=mode;
  nav.appendChild(button);
 }
 nav.addEventListener('click',event=>{
  const btn=event.target.closest?.('button[data-admin-shortcut]');
  if(!btn||!nav.contains(btn))return;
  const el=document.getElementById(btn.dataset.adminShortcut);
  const target=btn.dataset.adminTargetMode==='parent'?el?.parentElement:el;
  target?.scrollIntoView?.({behavior:'smooth',block:'start'});
 });
 // After the title/subtitle, before the dynamic loading/status area.
 const titleBlock=title.parentElement?.parentElement;
 if(titleBlock?.parentElement===summary)titleBlock.insertAdjacentElement('afterend',nav);
 else summary.insertBefore(nav,document.getElementById('adminDataLoadMsg')||summary.firstChild);
})();

/* V354: Pages-only SMV ASTRO install banner, driven by Chrome's native offer.
   The root's legacy inline handler remains intact for custom domains. */
(function pagesNativeInstallState(){
 if(location.hostname!=='smvastroservices.pages.dev')return;
 const section=document.getElementById('smvInstallAppSection');
 const button=document.getElementById('smvInstallAppBtn');
 const help=document.getElementById('smvInstallAppHelp');
 if(!section||!button)return;
 const STYLE_ID='smv-v354-pages-install-style';
 const style=document.createElement('style');
 style.id=STYLE_ID;
 style.textContent='html.smv-v354-no-root-install-offer #smvInstallAppSection{display:none!important}';
 document.head.appendChild(style);
 let offer=null;
 const standalone=()=>['standalone','minimal-ui','fullscreen'].some(mode=>matchMedia(`(display-mode: ${mode})`).matches)||navigator.standalone===true;
 const show=()=>{
  if(standalone())return hide();
  section.hidden=false;
  section.style.removeProperty('display');
  document.documentElement.classList.remove('smv-v354-no-root-install-offer');
  if(help)help.textContent='Tap INSTALL APP to install SMV ASTRO.';
 };
 const hide=()=>{
  document.documentElement.classList.add('smv-v354-no-root-install-offer');
  section.hidden=true;
 };
 hide();
 // Existing inline listener may already have run; this listener provides the
 // Pages-only visibility policy without changing the legacy installation flow.
 addEventListener('beforeinstallprompt',e=>{
  e.preventDefault();offer=e;show();
 });
 addEventListener('appinstalled',()=>{offer=null;hide();});
 button.addEventListener('click',async e=>{
  // Capture first so the legacy onclick cannot consume the same prompt twice.
  e.preventDefault();e.stopImmediatePropagation();
  if(standalone()){hide();return;}
  const p=offer;
  if(!p){hide();return;}
  offer=null;hide();
  try{
   await p.prompt();
   await p.userChoice;
   // 'accepted' is not proof of installation. appinstalled is the signal.
  }catch(_){/* Chrome can offer a fresh prompt later. */}
 },true);
})();
