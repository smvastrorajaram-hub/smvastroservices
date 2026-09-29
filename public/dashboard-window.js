/* A user click opens/reuses one account window. Blocked popups retain the local router. */
(function(){
 'use strict';
 const child=new URL(location.href).searchParams.get('view')==='dashboard-window';
 let accountWindow=null;
 window.__smvOpenDashboardWindow=function(){
  if(child||!window.__smvCurrentUserPresent)return false;
  try{
   if(accountWindow&&!accountWindow.closed){accountWindow.focus();return true;}
   const url=new URL(location.href);url.searchParams.set('view','dashboard-window');url.hash='dashboard';
   accountWindow=window.open(url.href,'smv-account-dashboard');
   if(!accountWindow)return false;
   accountWindow.opener=null;accountWindow.focus();return true;
  }catch(_){return false;}
 };
 document.addEventListener('click',event=>{
  if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  if(!event.target.closest?.('#dashLink,#adminLink'))return;
  if(window.__smvOpenDashboardWindow()){event.preventDefault();event.stopImmediatePropagation();}
 },true);
})();
