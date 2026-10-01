/* V125 browser-native saved-report output: IndexedDB -> print-ready HTML -> browser Print/Save as PDF. */
(async()=>{
 async function readSaved(key){
  const db=await new Promise((resolve,reject)=>{const q=indexedDB.open('smv-reports-v2',2);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);q.onblocked=()=>reject(Error('Saved-report database is busy.'));});
  try{return await new Promise((resolve,reject)=>{const q=db.transaction('reports','readonly').objectStore('reports').get(key);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});}finally{db.close();}
 }
 const status=document.getElementById('printStatus'),button=document.getElementById('printNow'),back=document.getElementById('printBack');
 back.onclick=()=>history.length>1?history.back():location.assign('./');
 try{
  let selection=null;
  try{selection=JSON.parse(sessionStorage.getItem('smv-print-report')||'null');}catch(_){}
  if(!selection){try{selection=JSON.parse(localStorage.getItem('smv-print-report-handoff')||'null');}catch(_){}}
  if(selection?.createdAt&&Date.now()-Number(selection.createdAt)>10*60*1000)selection=null;
  if(selection)localStorage.removeItem('smv-print-report-handoff');
  if(!selection||!selection.owner||typeof selection.key!=='string')throw Error('Open a saved report before printing.');
  const report=await readSaved(selection.key);
  if(!report||report.deleted||report.owner!==selection.owner)throw Error('This saved report is unavailable in this browser.');
  const tamil=selection.language==='ta',lang=tamil?'ta':'en',mode=new URLSearchParams(location.search).get('mode')||selection.mode||'view';
  const html=report.views?.[lang]||(report.language===lang?report.html:'');
  if(typeof html!=='string'||!html.trim())throw Error(tamil?'இந்த மொழியில் சேமித்த அறிக்கை இல்லை.':'The saved report is not available in this language.');
  document.documentElement.lang=lang;
  back.textContent=tamil?'திரும்புக':'Back';
  button.textContent=tamil?'அச்சிட / PDF சேமிக்க':'Print / Save as PDF';
  const root=document.getElementById('printReport');root.innerHTML=html;
  root.querySelectorAll('script,style,link,iframe,object,embed,form,meta,base,button,input,.smv-manual-save-actions,.horoscope-export-actions,.smv-horoscope-pay-gate').forEach(e=>e.remove());
  root.querySelectorAll('*').forEach(e=>{for(const a of [...e.attributes])if(/^on/i.test(a.name)||['href','xlink:href','srcset','action','formaction','contenteditable'].includes(a.name))e.removeAttribute(a.name);});
  root.querySelectorAll('details').forEach(e=>e.open=true);
  root.querySelectorAll('[hidden]').forEach(e=>e.hidden=false);
  root.querySelectorAll('.hidden').forEach(e=>e.classList.remove('hidden'));
  root.querySelectorAll('.dasha-node').forEach(e=>e.classList.add('open'));
  root.querySelectorAll('.smv-advanced-part').forEach(e=>e.classList.add('is-expanded'));
  // Print-only first-page identity. Keep the live horoscope DOM unchanged.
  const firstCard=root.querySelector('.card');
  if(firstCard){
   const nameNode=firstCard.querySelector('h2');
   const compact=firstCard.querySelector('p.small[style*="text-align:center"]');
   if(nameNode&&compact){
    const raw=(compact.textContent||'').replace(/\s+/g,' ').trim();
    const labels=tamil
      ?{date:'பிறந்த தேதி',time:'நேரம்',place:'பிறந்த இடம்'}
      :{date:'Date of Birth',time:'Time',place:'Place of Birth'};
    const escRe=v=>v.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const re=new RegExp(escRe(labels.date)+'\\s*:\\s*(.*?)\\s*[·•]\\s*'+escRe(labels.time)+'\\s*:\\s*(.*?)\\s*[·•]\\s*'+escRe(labels.place)+'\\s*:\\s*(.*)$','i');
    const m=raw.match(re);
    const identity=document.createElement('section');identity.className='print-birth-identity';
    const n=document.createElement('h2');n.className='print-birth-name';n.textContent=nameNode.textContent.trim();identity.append(n);
    if(m){
     const grid=document.createElement('div');grid.className='print-birth-details';
     [[labels.date,m[1]],[labels.time,m[2]],[labels.place,m[3]]].forEach(([label,value])=>{
      const a=document.createElement('span');a.className='label';a.textContent=label;
      const c=document.createElement('span');c.className='colon';c.textContent=':';
      const v=document.createElement('span');v.className='value';v.textContent=value;
      grid.append(a,c,v);
     });identity.append(grid);
    }else{const p=document.createElement('p');p.className='print-birth-fallback';p.textContent=raw;identity.append(p);}
    nameNode.replaceWith(identity);compact.remove();
   }
  }
  // Keep the report compact: remove empty UI shells left after controls are stripped.
  root.querySelectorAll('div,section,p').forEach(e=>{if(!e.textContent.trim()&&!e.querySelector('img,svg,table,.south-indian-chart')){if(!e.children.length)e.remove();}});
  await document.fonts.ready;
  await Promise.all([...document.images].map(i=>i.decode?.().catch(()=>{})));
  button.disabled=false;button.onclick=()=>window.print();
  status.textContent=tamil?'இந்த அறிக்கை browser-லேயே தயாராக உள்ளது. PDF ஆக சேமிக்க “அச்சிட / PDF சேமிக்க” என்பதை பயன்படுத்தவும்.':'This report is ready locally. Use Print / Save as PDF to create the PDF on this device.';
  // Download/Print buttons intentionally use the browser's native PDF path. No server, Cloudinary, or PDF upload.
  if(mode==='download'||mode==='print')setTimeout(()=>window.print(),250);
 }catch(e){status.textContent=e.message||String(e);}
})();
