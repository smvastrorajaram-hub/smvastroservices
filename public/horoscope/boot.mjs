/* Unified adapter selector: server API when available, local WASM when not. */
const SMV_RENDER_BACKEND='https://smvastroservices.onrender.com';
window.SMV_BACKEND_URL=String(window.SMV_BACKEND_URL||SMV_RENDER_BACKEND).replace(/\/$/,'');
window.SMVEngineReady=(async()=>{
  const forceOffline = new URLSearchParams(location.search).get('offline') === '1';
  if(location.protocol === 'file:' || forceOffline){
    await import('./offline/offline-only-router.mjs');
    window.__SMV_ENGINE_MODE__='offline';
    return 'offline';
  }
  try{
    const r=await fetch(window.SMV_BACKEND_URL+'/api/smv-mode',{cache:'no-store',signal:AbortSignal.timeout(8000)});
    const d=await r.json();
    if(r.ok && d && d.mode==='server'){
      window.__SMV_ENGINE_MODE__='online';
      return 'online';
    }
  }catch(_e){}
  await import('./offline/offline-only-router.mjs');
  window.__SMV_ENGINE_MODE__='offline';
  return 'offline';
})();
