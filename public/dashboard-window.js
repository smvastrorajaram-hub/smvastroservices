/* SMV ASTRO dashboard navigation stays in the current browser/PWA window.
   The role-aware router in smvastro.mjs owns Dashboard/Admin navigation and
   reuses an already-rendered dashboard without starting another data load. */
(function(){
 'use strict';
 window.__smvOpenDashboardWindow=function(){ return false; };
})();
