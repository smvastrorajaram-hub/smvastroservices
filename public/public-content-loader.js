/* SMV ASTRO consultation/profile code splitter.
 * Public home, auth and dashboard code remains in the main app. The approved
 * Astrologer directory, profile dialogs, bookings and Live Call/Chat UI load
 * only when the Customer opens the consultation route.
 */
(function(){
  'use strict';
  const MODULE_URL='./public-content.mjs?v=20261029-consult-module-lazy-v1';
  let pending=null;
  function isConsultVisible(){
    const target=document.getElementById('private-consultation');
    return !!target && !target.classList.contains('hidden');
  }
  function ensureConsultationModule(){
    if(window.__smvConsultationModuleReady===true)return Promise.resolve();
    if(pending)return pending;
    pending=import(MODULE_URL).then(()=>{
      window.__smvConsultationModuleReady=true;
    }).catch(error=>{
      pending=null;
      window.__smvConsultationModuleReady=false;
      console.error('SMV ASTRO consultation module could not load:',error);
      throw error;
    });
    return pending;
  }
  window.__smvEnsureConsultationModule=ensureConsultationModule;
  function onConsultOpen(){
    ensureConsultationModule().catch(()=>{});
  }
  window.addEventListener('smv:private-consultation-open',onConsultOpen);
  window.addEventListener('smv:app-ready',()=>{
    if(isConsultVisible())onConsultOpen();
  });
  window.addEventListener('smv:auth-user',()=>{
    if(isConsultVisible())onConsultOpen();
  });
  // Recover direct links and browser history before the first navigation event.
  function restoreDeepLink(){
    const params=new URLSearchParams(location.search);
    if(params.get('view')==='consult'||isConsultVisible())onConsultOpen();
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',restoreDeepLink,{once:true});
  }else{
    restoreDeepLink();
  }
})();
