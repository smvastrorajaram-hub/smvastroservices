// Complete report snapshots: local IndexedDB plus portable JSON export/import.
// Opening a saved report never calls Firebase, payment access, or the calculation API.
(()=>{'use strict';
const $=id=>document.getElementById(id),isTamil=()=>document.documentElement.lang==='ta';
const T=(en,ta)=>isTamil()?ta:en,owner=()=>window.__smvHoroscopePaidState?.user?.uid||'';
function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open('smv-horoscope-saved-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('reports',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function records(action,value){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction('reports',action==='put'?'readwrite':'readonly'),store=tx.objectStore('reports');const r=action==='put'?store.put(value):action==='get'?store.get(value):store.getAll();let result;r.onsuccess=()=>result=r.result;tx.oncomplete=()=>{db.close();resolve(result)};tx.onerror=()=>{db.close();reject(tx.error)};tx.onabort=()=>{db.close();reject(tx.error||Error('Saving failed'))};});}
function clean(html){const t=document.createElement('template');t.innerHTML=html;t.content.querySelectorAll('script,style,link,iframe,object,embed,form,meta,base,.smv-horoscope-pay-gate,.horoscope-export-actions').forEach(e=>e.remove());t.content.querySelectorAll('*').forEach(e=>{for(const a of [...e.attributes])if(/^on/i.test(a.name)||['src','srcset','href','xlink:href','action','formaction'].includes(a.name))e.removeAttribute(a.name);});return t.innerHTML;}
function currentReport(){return [$('englishHoroscopeResult'),$('tamilHoroscopeResult')].find(e=>e&&!e.classList.contains('hidden')&&e.textContent.trim().length>100);}
function showError(e){alert(e.message||String(e));}
function exportFile(report){const url=URL.createObjectURL(new Blob([JSON.stringify(report)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='SMV-Horoscope-'+report.id+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}
function bindSnapshot(view){
 view.addEventListener('click',e=>{const head=e.target.closest('.smv-advanced-part-title,.dasha-head');if(!head||!view.contains(head))return;
  if(head.matches('.dasha-head')){const n=head.closest('.dasha-node');if(n){n.classList.toggle('open');head.setAttribute('aria-expanded',String(n.classList.contains('open')));}return;}
  const part=head.closest('.smv-advanced-part'),content=part?.querySelector('.smv-advanced-part-content');if(!content)return;const open=part.dataset.smvOpen!=='1';part.dataset.smvOpen=open?'1':'0';content.hidden=!open;part.classList.toggle('is-expanded',open);head.setAttribute('aria-expanded',String(open));
 });
 view.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('.smv-advanced-part-title')){e.preventDefault();e.target.click();}});
}
async function display(id){const uid=owner(),report=await records('get',id);if(!uid||uid!==owner()||report?.owner!==uid)throw Error(T('Log in to the account that saved this report.','இந்த அறிக்கையைச் சேமித்த கணக்கில் உள்நுழைக.'));
 const view=$('smvSavedViewer');view.innerHTML=clean(report.html);view.lang=report.language;view.dataset.resultLanguage=report.language;
 // Keep snapshot IDs separate from the live calculation form and output.
 view.querySelectorAll('[id]').forEach(e=>e.id='saved-'+e.id);view.hidden=false;view.scrollIntoView({behavior:'smooth',block:'start'});
}
async function list(){const uid=owner(),host=$('smvSavedList');if(!host)return;const rows=uid?(await records('all')).filter(r=>r.owner===uid).sort((a,b)=>b.savedAt-a.savedAt):[];if(uid!==owner())return;host.replaceChildren();
 if(!uid){host.textContent=T('Log in to view your saved reports.','சேமித்த அறிக்கைகளைக் காண உள்நுழைக.');return;}
 if(!rows.length){host.textContent=T('No reports saved in this browser yet.','இந்த உலாவியில் இதுவரை அறிக்கை சேமிக்கப்படவில்லை.');return;}
 for(const report of rows){const row=document.createElement('div'),open=document.createElement('button'),download=document.createElement('button');open.type=download.type='button';open.className=download.className='btn';open.textContent=report.name+' · '+new Date(report.savedAt).toLocaleString();open.onclick=()=>display(report.id).catch(showError);download.textContent=T('Export file','கோப்பைப் பதிவிறக்கு');download.onclick=()=>{if(owner()===report.owner)exportFile(report)};row.append(open,download);host.append(row);}
}
function init(){const section=$('english-horoscope');if(!section)return;const panel=document.createElement('section');panel.id='smvSavedReports';panel.innerHTML='<h3></h3><button class="btn" type="button" id="smvSaveReport"></button> <label id="smvImportLabel"><span></span> <input type="file" accept=".json,application/json" id="smvImportReport"></label><p id="smvSavedStatus" role="status"></p><div id="smvSavedList"></div><div id="smvSavedViewer" hidden></div>';section.appendChild(panel);bindSnapshot($('smvSavedViewer'));
 const labels=()=>{panel.querySelector('h3').textContent=T('Saved Horoscopes','சேமித்த ஜாதகங்கள்');$('smvSaveReport').textContent=T('Save Complete Horoscope','முழு ஜாதகத்தைச் சேமிக்க');$('smvImportLabel').querySelector('span').textContent=T('Open saved file','சேமித்த கோப்பைத் திறக்க');};labels();
 $('smvSaveReport').onclick=async()=>{const button=$('smvSaveReport');button.disabled=true;try{
  const uid=owner(),root=currentReport();if(!uid)throw Error(T('Log in before saving.','சேமிப்பதற்கு முன் உள்நுழைக.'));if(!root)throw Error(T('Generate a horoscope first.','முதலில் ஜாதகம் உருவாக்குக.'));if(root.getAttribute('aria-busy')==='true')throw Error(T('Wait for the calculation to finish.','கணக்கீடு முடியும் வரை காத்திருக்கவும்.'));
  $('smvSavedStatus').textContent=T('Preparing all calculated sections for saving…','கணக்கிடப்பட்ட அனைத்துப் பகுதிகளும் சேமிக்கத் தயாராகின்றன…');
  if(root.__smvPrepareReport)await root.__smvPrepareReport();if(uid!==owner())throw Error('Account changed during saving.');
  const incomplete=[...root.querySelectorAll('[data-smv-v61-kind]')].some(e=>e.dataset.loaded!=='1');if(incomplete)throw Error(T('Detailed calculations have not completed. Reopen them and retry.','விரிவான கணக்கீடுகள் நிறைவடையவில்லை. மீண்டும் திறந்து முயற்சிக்கவும்.'));
  const report={format:'smv-horoscope',version:1,id:crypto.randomUUID(),owner:uid,name:($('englishAstroName')?.value||$('tamilAstroName')?.value||'Horoscope').trim().slice(0,80),language:root.dataset.resultLanguage||(isTamil()?'ta':'en'),savedAt:Date.now(),html:clean(root.innerHTML)};
  await records('put',report);await list();$('smvSavedStatus').textContent=T('Saved on this device. Export a file to keep a portable copy.','இந்தச் சாதனத்தில் சேமிக்கப்பட்டது. வேறு சாதனத்திற்காக கோப்பைப் பதிவிறக்கலாம்.');
 }catch(e){$('smvSavedStatus').textContent=e.message||String(e);}finally{button.disabled=false;}};
 $('smvImportReport').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>25000000)throw Error('Saved file is too large.');const report=JSON.parse(await file.text());if(report.format!=='smv-horoscope'||report.version!==1||typeof report.html!=='string'||!report.id||!report.name)throw Error('Invalid saved horoscope file.');if(!owner()||report.owner!==owner())throw Error(T('Use the same account that saved this report.','இந்த அறிக்கையைச் சேமித்த அதே கணக்கைப் பயன்படுத்தவும்.'));report.html=clean(report.html);await records('put',report);await list();await display(report.id);}catch(e){showError(e)}finally{e.target.value='';}};
 window.addEventListener('smv:horoscope-local-auth',()=>{$('smvSavedViewer').replaceChildren();$('smvSavedViewer').hidden=true;list().catch(showError)});window.addEventListener('smv-language',()=>{labels();list().catch(showError)});list().catch(showError);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
