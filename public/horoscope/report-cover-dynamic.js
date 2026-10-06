/* SMV V238 — UI-only cover formatter.
   The saved-report calculation/rendering path is unchanged.
   No Firebase/API reads or data-refresh observers are added. */
(function(){
  'use strict';

  function stripMatchingPrefix(text){
    return String(text||'')
      .replace(/^(Bride|Groom|பெண்|ஆண்)\s*[·•:-]\s*/i,'')
      .trim();
  }

  function fit(el, length, normal, medium, small){
    if(!el) return;
    el.style.fontSize = (length > 32 ? small : length > 21 ? medium : normal);
  }

  function prepare(){
    const grid=document.getElementById('smvCoverBirthGrid');
    if(!grid)return false;
    const cards=[...grid.querySelectorAll('.smv-cover-person')];
    if(!cards.length)return false;

    const single=grid.classList.contains('is-single');

    cards.forEach((card)=>{
      const h=card.querySelector('h2');
      if(h && !single)h.textContent=stripMatchingPrefix(h.textContent);

      const valueNodes=[h,...card.querySelectorAll('.smv-cover-detail span')].filter(Boolean);
      valueNodes.forEach(el=>el.setAttribute('title',el.textContent||''));

      if(single){
        fit(h,(h?.textContent||'').length,'9.6pt','8.4pt','7.2pt');
        card.querySelectorAll('.smv-cover-detail span').forEach((el,i)=>{
          fit(el,(el.textContent||'').length,i===2?'8.0pt':'8.4pt',i===2?'7.0pt':'7.4pt','6.1pt');
        });
      }else{
        fit(h,(h?.textContent||'').length,'8.2pt','7.2pt','6.1pt');
        card.querySelectorAll('.smv-cover-detail span').forEach((el,i)=>{
          fit(el,(el.textContent||'').length,i===2?'6.9pt':'7.1pt',i===2?'6.0pt':'6.3pt','5.3pt');
        });
      }
    });

    const pair=document.getElementById('smvCoverPrimaryName');
    if(pair && !single){
      const n=(pair.textContent||'').length;
      pair.style.fontSize=n>52?'9.5pt':n>38?'11pt':n>27?'13pt':'15pt';
      pair.setAttribute('title',pair.textContent||'');
    }

    document.getElementById('smvPrintCover')?.classList.add('smv-cover-ready');
    return true;
  }

  // report-print.js is an async IIFE. Wait only for its local DOM cover population.
  let frames=0;
  function arm(){
    if(prepare())return;
    if(++frames<180)requestAnimationFrame(arm);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>requestAnimationFrame(arm),{once:true});
  else requestAnimationFrame(arm);
})();
