/* SMV HOROSCOPE strict browser-only calculation boot.
   Horoscope/Advanced/Marriage/Transit/Panchang/Place Search never probe a server.
   Login/Register/Logout remains a separate online authentication concern. */
window.SMVEngineReady=(async()=>{
  const engine=await import('./offline/offline-engine.mjs');
  const places=await import('./offline/places/place-search.mjs');
  const swiss=await import('./offline/swiss_vedic.browser.mjs');
  const tp=await import('./offline/transit_panchang.browser.mjs');
  window.SMVOffline={full:engine.full,searchPlaces:places.searchPlaces,calculateSwiss:swiss.calculateSwiss,panchang:tp.panchang,transit:tp.transit};
  window.__SMV_ENGINE_MODE__='offline';
  window.dispatchEvent(new CustomEvent('smv:engine-mode',{detail:{mode:'offline'}}));
  return 'offline';
})();
