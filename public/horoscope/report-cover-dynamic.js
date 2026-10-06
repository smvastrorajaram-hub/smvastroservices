/* SMV V239 — integrated live cover data formatter.
   Rebuilds only the four birth-detail rows inside the supplied artwork frame.
   No Firebase/API reads, no report recalculation, no observers. */
(function(){
  'use strict';
  const labels=['பெயர் / Name','பிறந்த தேதி / Date of Birth','நேரம் / Time of Birth','பிறந்த இடம் / Place of Birth'];

  function stripPrefix(text){return String(text||'').replace(/^(Bride|Groom|பெண்|ஆண்)\s*[·•:-]\s*/i,'').trim();}
  function makeRow(label,value,index){
    const row=document.createElement('div');row.className='smv-cover-live-row';row.dataset.row=String(index);
    const b=document.createElement('b');b.className='smv-cover-live-label';b.textContent=label;
    const c=document.createElement('i');c.className='smv-cover-live-colon';c.textContent=':';
    const v=document.createElement('span');v.className='smv-cover-live-value';v.textContent=String(value||'—').trim()||'—';v.title=v.textContent;
    row.append(b,c,v);return row;
  }
  function prepare(){
    const grid=document.getElementById('smvCoverBirthGrid');if(!grid)return false;
    const cards=[...grid.querySelectorAll('.smv-cover-person')];if(!cards.length)return false;
    const single=grid.classList.contains('is-single');
    cards.forEach(card=>{
      if(card.dataset.smvCoverV239==='1')return;
      const h=card.querySelector('h2');
      const detailValues=[...card.querySelectorAll('.smv-cover-detail span')].map(x=>x.textContent||'—');
      const name=single?String(h?.textContent||'—').trim():stripPrefix(h?.textContent||'—');
      const values=[name,detailValues[0]||'—',detailValues[1]||'—',detailValues[2]||'—'];
      card.replaceChildren(...values.map((v,i)=>makeRow(labels[i],v,i)));
      card.dataset.smvCoverV239='1';
    });
    const pair=document.getElementById('smvCoverPrimaryName');
    if(pair&&!single){pair.title=pair.textContent||'';}
    document.getElementById('smvPrintCover')?.classList.add('smv-cover-ready');
    return true;
  }
  let frames=0;function arm(){if(prepare())return;if(++frames<180)requestAnimationFrame(arm);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>requestAnimationFrame(arm),{once:true});else requestAnimationFrame(arm);
})();
