/* Saved snapshot printing: normal same-origin page, no blank popup or recalculation. */
(async()=>{
 async function readSaved(key){
  const db=await new Promise((resolve,reject)=>{const q=indexedDB.open('smv-reports-v2',1);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});
  try{return await new Promise((resolve,reject)=>{const q=db.transaction('reports','readonly').objectStore('reports').get(key);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});}finally{db.close();}
 }
 const status=document.getElementById('printStatus'),button=document.getElementById('printNow');
 document.getElementById('printBack').onclick=()=>history.back();
 try{
  const selection=JSON.parse(sessionStorage.getItem('smv-print-report')||'null');
  const owner=JSON.parse(sessionStorage.getItem('smv-offline-owner')||'null');
  if(!selection||!owner?.uid||selection.owner!==owner.uid||typeof selection.key!=='string')throw Error('Open a saved report from your logged-in account before printing.');
  const report=await readSaved(selection.key);
  if(!report||report.deleted||report.owner!==owner.uid||typeof report.html!=='string')throw Error('This saved report is unavailable. Return to Saved reports.');
  const tamil=selection.language==='ta';document.documentElement.lang=tamil?'ta':'en';
  document.getElementById('printBack').textContent=tamil?'திரும்புக':'Back';
  button.textContent=tamil?'அச்சிட / PDF சேமிக்க':'Print / Save as PDF';
  const root=document.getElementById('printReport');root.innerHTML=report.views?.[tamil?'ta':'en']||report.html;
  root.querySelectorAll('script,style,link,iframe,object,embed,form,meta,base').forEach(e=>e.remove());
  root.querySelectorAll('*').forEach(e=>{for(const a of [...e.attributes])if(/^on/i.test(a.name)||['href','xlink:href','srcset','action','formaction','style'].includes(a.name))e.removeAttribute(a.name);});
  root.querySelectorAll('details').forEach(e=>e.open=true);
  root.querySelectorAll('[hidden]').forEach(e=>e.hidden=false);
  root.querySelectorAll('.hidden').forEach(e=>e.classList.remove('hidden'));
  root.querySelectorAll('.dasha-node').forEach(e=>e.classList.add('open'));
  root.querySelectorAll('.smv-advanced-part').forEach(e=>e.classList.add('is-expanded'));
  await document.fonts.ready;
  await Promise.all([...document.images].map(i=>i.decode?.().catch(()=>{})));
  button.disabled=false;button.onclick=()=>window.print();
  status.textContent=tamil?'அச்சிட பொத்தானை அழுத்தி PDF ஆகவும் சேமிக்கலாம்.':'Use Print to print or save this report as PDF.';
 }catch(e){status.textContent=e.message||String(e);}
})();
