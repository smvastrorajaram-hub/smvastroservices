/* SMV ASTRO V187 — Ask Now + Private Consultation local place search.
   Uses the existing bundled India place database. No Firebase/API polling and no MutationObserver. */
(function(){
  'use strict';
  if(window.__SMV_MAIN_LOCATION_SEARCH_V187__) return;
  window.__SMV_MAIN_LOCATION_SEARCH_V187__=true;

  const BASE='./horoscope/offline/places/';
  let manifest=null;
  const shardCache=new Map();
  const aliasCache=new WeakMap();
  const searchState=new Map();
  const norm=s=>String(s||'').normalize('NFKD').toLowerCase().replace(/\p{M}/gu,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  async function getJson(url){
    const r=await fetch(url,{cache:'default'});
    if(!r.ok) throw new Error('HTTP '+r.status);
    return r.json();
  }
  async function getManifest(){
    if(manifest) return manifest;
    manifest=await getJson(BASE+'india-manifest.json?v=187');
    return manifest;
  }
  function keyFor(n){
    const c=n[0]||'';
    if(c>='a'&&c<='z') return c;
    if(/[\u0B80-\u0BFF]/u.test(c)) return 'ta';
    return 'other';
  }
  async function getShard(k){
    if(shardCache.has(k)) return shardCache.get(k);
    const m=await getManifest();
    const meta=m?.shards?.[k];
    if(!meta) return [];
    const rows=await getJson(BASE+'india/'+encodeURIComponent(meta.file)+'?v=187');
    shardCache.set(k,rows);
    return rows;
  }
  function aliasesFor(row){
    let cached=aliasCache.get(row);
    if(cached) return cached;
    cached=(row[8]||[]).map(norm).filter(Boolean);
    aliasCache.set(row,cached);
    return cached;
  }
  async function searchPlaces(q,limit){
    const n=norm(q);
    if(n.length<2) return [];
    const key=keyFor(n),rows=await getShard(key);
    const prior=searchState.get(key);
    const source=prior&&n.startsWith(prior.query)&&n.length>prior.query.length?prior.rows:rows;
    const out=[];
    for(const x of source){
      let best=99;
      for(const a of aliasesFor(x)){
        if(a===n){best=0;break;}
        if(a.startsWith(n)) best=Math.min(best,1);
        else if(a.includes(' '+n)) best=Math.min(best,2);
        else if(a.includes(n)) best=Math.min(best,3);
      }
      if(best<99) out.push({x,score:best});
    }
    searchState.set(key,{query:n,rows:out.map(v=>v.x)});
    out.sort((a,b)=>a.score-b.score||(Number(b.x[7])||0)-(Number(a.x[7])||0)||String(a.x[1]||'').localeCompare(String(b.x[1]||'')));
    return out.slice(0,limit||8).map(({x})=>{
      const district=x[3]||'', state=x[2]||'';
      return {
        place:[x[1],district,state,'India'].filter((v,i,a)=>v&&a.indexOf(v)===i).join(', '),
        lat:x[4], lon:x[5], timezone:x[6]||'Asia/Kolkata'
      };
    });
  }

  function bind(inputId){
    const input=document.getElementById(inputId);
    if(!input||input.dataset.smvPlaceSearch==='1') return;
    input.dataset.smvPlaceSearch='1';
    input.autocomplete='off';
    const host=input.parentElement||input;
    host.classList?.add('smv-main-place-host');
    const box=document.createElement('div');
    box.className='smv-main-place-results';
    box.id=inputId+'SearchResults';
    box.setAttribute('role','listbox');
    input.insertAdjacentElement('afterend',box);
    let timer=0, seq=0;

    const close=()=>{box.classList.remove('smv-open');box.innerHTML='';};
    const note=(msg,error)=>{box.innerHTML='<div class="smv-main-place-note'+(error?' smv-error':'')+'">'+esc(msg)+'</div>';box.classList.add('smv-open');};
    const render=(rows,query)=>{
      if(!rows.length){note('No matching place found.',false);return;}
      box.innerHTML=rows.map((x,i)=>'<button type="button" class="smv-main-place-row" role="option" data-i="'+i+'">'+esc(x.place||query)+'</button>').join('');
      box.classList.add('smv-open');
      box.querySelectorAll('.smv-main-place-row').forEach(btn=>{
        btn.addEventListener('click',()=>{
          const x=rows[Number(btn.dataset.i)]||{};
          input.value=x.place||query;
          input.dataset.latitude=String(x.lat??'');
          input.dataset.longitude=String(x.lon??'');
          input.dataset.timezone=String(x.timezone||'Asia/Kolkata');
          close();
          input.dispatchEvent(new Event('change',{bubbles:true}));
        });
      });
    };

    input.addEventListener('input',()=>{
      clearTimeout(timer);
      input.dataset.latitude='';input.dataset.longitude='';input.dataset.timezone='';
      const q=input.value.trim();
      if(q.length<2){close();return;}
      const mine=++seq;
      timer=setTimeout(async()=>{
        note('Searching location…',false);
        try{
          const rows=await searchPlaces(q,10);
          if(mine!==seq) return;
          render(rows,q);
        }catch(err){
          if(mine!==seq) return;
          note('Location search data is unavailable right now. You can still type the place manually.',true);
        }
      },260);
    });
    input.addEventListener('keydown',e=>{if(e.key==='Escape') close();});
    box.__smvClose=close;
    input.__smvPlaceBox=box;
  }

  function init(){
    bind('birthPlace');
    bind('privateConsultBirthPlace');
    if(!document.documentElement.dataset.smvPlaceOutsideBound){
      document.documentElement.dataset.smvPlaceOutsideBound='1';
      document.addEventListener('pointerdown',e=>{
        document.querySelectorAll('.smv-main-place-results.smv-open').forEach(box=>{
          const input=box.previousElementSibling;
          if(e.target!==input&&!box.contains(e.target)) box.__smvClose?.();
        });
      },{passive:true});
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();
