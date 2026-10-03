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
  root.querySelectorAll('details').forEach(e=>{e.open=true;e.removeAttribute('hidden');e.classList.remove('hidden','collapsed','is-collapsed');});
  root.querySelectorAll('[hidden]').forEach(e=>e.hidden=false);
  root.querySelectorAll('.hidden').forEach(e=>e.classList.remove('hidden'));
  root.querySelectorAll('.dasha-node').forEach(e=>{e.classList.add('open');e.classList.remove('collapsed','is-collapsed');});
  root.querySelectorAll('.dasha-children,.dasha-body,.dasha-content,.smv-advanced-part-content').forEach(e=>{e.hidden=false;e.classList.remove('hidden','collapsed','is-collapsed');e.style.setProperty('display','block','important');e.style.setProperty('max-height','none','important');e.style.setProperty('height','auto','important');e.style.setProperty('overflow','visible','important');});
  root.querySelectorAll('.smv-advanced-part').forEach(e=>e.classList.add('is-expanded'));
  // V137: preserve the original first-page Birth Details layout; only nudge the
  // existing birth block toward the visual centre. Do not collapse it into one line.
  const firstCard=root.querySelector('.card');
  if(firstCard){
   firstCard.classList.add('smv-print-first-card');
   const nameNode=firstCard.querySelector('h2');
   const compact=firstCard.querySelector('p.small[style*="text-align:center"]');
   if(nameNode)nameNode.classList.add('smv-print-birth-name');
   if(compact)compact.classList.add('smv-print-birth-summary');
   const identityCandidates=[...firstCard.querySelectorAll('div,section')].filter(e=>/Ascendant|லக்னம்/.test(e.textContent||'')&&/Moon Rasi|சந்திர ராசி|ராசி/.test(e.textContent||''));
   const identityBlock=identityCandidates.sort((a,b)=>(a.textContent||'').length-(b.textContent||'').length)[0];
   if(identityBlock)identityBlock.classList.add('smv-print-lagna-rasi');
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
