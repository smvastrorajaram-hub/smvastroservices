/* Complete snapshots; report opening and printing use IndexedDB, never Firebase. */
(()=>{'use strict';
const $=id=>document.getElementById(id),ta=()=>document.documentElement.lang==='ta',T=(en,t)=>ta()?t:en;
function tokenUid(){try{const t=String(window.__smvHoroscopePaidState?.token||'').split('.')[1];if(!t)return '';const j=JSON.parse(atob(t.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(t.length/4)*4,'=')));return String(j.user_id||j.sub||'');}catch(_){return '';}}
function owner(){const state=String(window.__smvHoroscopePaidState?.user?.uid||''),token=String(window.__smvHoroscopePaidState?.token||'');if(!state||!token)return '';const decoded=tokenUid();return decoded&&decoded!==state?'':state;}
let authEpoch=0;
const api=(...args)=>window.__smvHoroscopeApi(...args),live=new Map();let syncPending=null;
async function syncApi(path,opt={}){const state=window.__smvHoroscopePaidState||{},backend=String(state.backend||window.SMV_BACKEND_URL||'').replace(/\/$/,'');const headers={...((await (async()=>{const token=state.token;return token?{Authorization:'Bearer '+token}:{};})())),...(opt.headers||{})};if(opt.body&&!headers['Content-Type'])headers['Content-Type']='application/json';const r=await fetch(backend+path,{...opt,cache:'no-store',headers});const j=await r.json().catch(()=>({}));if(!r.ok||j.success===false)throw Error(j.error||('Request failed: '+r.status));return j;}
function dbOpen(){return new Promise((ok,no)=>{const q=indexedDB.open('smv-reports-v2',2);q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains('reports'))q.result.createObjectStore('reports',{keyPath:'key'});if(!q.result.objectStoreNames.contains('pdfs'))q.result.createObjectStore('pdfs',{keyPath:'key'});};q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error);});}
async function records(action,value){const db=await dbOpen();return new Promise((ok,no)=>{const tx=db.transaction('reports',['put','delete'].includes(action)?'readwrite':'readonly'),store=tx.objectStore('reports'),q=action==='put'?store.put(value):action==='delete'?store.delete(value):action==='get'?store.get(value):store.getAll();let result;q.onsuccess=()=>result=q.result;tx.oncomplete=()=>{db.close();ok(result)};tx.onerror=()=>{db.close();no(tx.error)};});}
async function pdfRecords(action,value){const db=await dbOpen();return new Promise((ok,no)=>{const tx=db.transaction('pdfs',['put','delete'].includes(action)?'readwrite':'readonly'),store=tx.objectStore('pdfs'),q=action==='put'?store.put(value):action==='delete'?store.delete(value):store.get(value);let result;q.onsuccess=()=>result=q.result;tx.oncomplete=()=>{db.close();ok(result)};tx.onerror=()=>{db.close();no(tx.error)};});}
function clean(html){const t=document.createElement('template');t.innerHTML=html;t.content.querySelectorAll('button.dasha-head,button.smv-advanced-part-title').forEach(b=>{const h=document.createElement('div');h.className=b.className;h.innerHTML=b.innerHTML;h.setAttribute('role','button');h.tabIndex=0;b.replaceWith(h);});t.content.querySelectorAll('script,style,link,iframe,object,embed,form,meta,base,button,input,.smv-horoscope-pay-gate,.horoscope-export-actions').forEach(e=>e.remove());t.content.querySelectorAll('*').forEach(e=>{for(const a of [...e.attributes]){if(/^on/i.test(a.name)||['srcset','href','xlink:href','action','formaction','style'].includes(a.name))e.removeAttribute(a.name);if(a.name==='src'&&!/^data:image\/(png|jpeg|webp);base64,/.test(a.value)&&!/^assets\/[a-z0-9_.-]+$/i.test(a.value))e.removeAttribute(a.name);}});t.content.querySelectorAll('.south-indian-chart').forEach(chart=>{if(chart.parentElement?.classList.contains('print-chart'))return;const nodes=[chart];let previous=chart.previousElementSibling;if(previous?.matches('p')){nodes.unshift(previous);previous=previous.previousElementSibling;}if(previous?.matches('h3,h4'))nodes.unshift(previous);const group=document.createElement('section');group.className='print-chart';nodes[0].before(group);nodes.forEach(n=>group.append(n));});const output=document.createElement('div');output.append(t.content.cloneNode(true));return output.innerHTML;}
async function hash(feature,birth){const bytes=new TextEncoder().encode(window.SMVReportIdentity.canonical(feature,birth));return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');}
function status(text){if($('smvSavedStatus'))$('smvSavedStatus').textContent=text;}
function fail(e){status(e.message||String(e));}
async function verifiedPaid(feature,birthIdentity){return true;}
async function display(key){const uid=owner(),report=await records('get',key);if(!uid||uid!==owner()||report?.owner!==uid||report.deleted)throw Error(T('Log in to the account that saved this report.','அறிக்கையைச் சேமித்த கணக்கில் உள்நுழைக.'));const view=$('smvSavedViewer');view.dataset.reportKey=key;view.innerHTML=clean(report.views?.[ta()?'ta':'en']||report.html);view.lang=report.views?.[ta()?'ta':'en']?(ta()?'ta':'en'):report.language;view.querySelectorAll('[id]').forEach(e=>e.id='saved-'+e.id);view.hidden=false;view.scrollIntoView({behavior:'auto',block:'start'});return report;}
function authHeaders(){const h={};const token=window.__smvHoroscopePaidState?.token;if(token)h.Authorization='Bearer '+token;return h;}
function selectedSavedLanguage(report){
 const wanted=ta()?'ta':'en';
 if(report?.views?.[wanted])return wanted;
 if(report?.language===wanted&&report?.html)return wanted;
 if(report?.views?.[report?.language])return report.language;
 return report?.views?.ta?'ta':'en';
}
async function prepareSavedForOutput(key,mode='view'){
 const uid=owner(),report=await records('get',key);
 if(!uid||report?.owner!==uid||report.deleted)throw Error(T('Log in to the account that saved this report.','அறிக்கையைச் சேமித்த கணக்கில் உள்நுழைக.'));
 const lang=selectedSavedLanguage(report);
 const html=report.views?.[lang]||(report.language===lang?report.html:'');
 if(typeof html!=='string'||!html.trim())throw Error(T('Generate this report in the selected language first.','இந்த அறிக்கையை தேர்ந்தெடுத்த மொழியில் முதலில் உருவாக்கவும்.'));
 status(report.feature==='marriage_matching'?T('Generating marriage matching report…','திருமண பொருத்த அறிக்கை உருவாக்கப்படுகிறது…'):T('Generating horoscope…','ஜாதகம் உருவாக்கப்படுகிறது…'));
 // Let the completed saved snapshot settle before handing control to the browser PDF/print page.
 await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 return {report,lang};
}
const outputPending=new Map();
function generationBusy(){
 if(saving.size||manualSaving.size||outputPending.size)return true;
 for(const x of live.values())if(x?.root?.getAttribute?.('aria-busy')==='true')return true;
 return document.getElementById('mmResult')?.getAttribute('aria-busy')==='true';
}
async function waitForGeneration(){
 if(!generationBusy())return false;
 status(T('Wait — generating PDF…','காத்திருக்கவும் — PDF உருவாக்கப்படுகிறது…'));
 const pending=[...saving.values(),...manualSaving.values()];
 if(pending.length)await Promise.allSettled(pending);
 while(generationBusy())await new Promise(r=>setTimeout(r,120));
 return true;
}
async function openLocalPrint(key,mode='view'){
 if(outputPending.has(key)){status(T('Wait — generating PDF…','காத்திருக்கவும் — PDF உருவாக்கப்படுகிறது…'));return outputPending.get(key);}
 const task=(async()=>{
  const uid=owner();
  await waitForGeneration();
  const {report,lang}=await prepareSavedForOutput(key,mode);
  sessionStorage.setItem('smv-print-report',JSON.stringify({key,owner:uid,language:lang,mode,createdAt:Date.now()}));
  const url='report-print.html?mode='+encodeURIComponent(mode)+'&v=V1-flow-fix';
  const w=window.open(url,'_blank','noopener');
  if(!w)location.href=url;
  status(mode==='view'?T('Opening saved report locally…','சேமித்த அறிக்கை சாதனத்திலிருந்து திறக்கப்படுகிறது…'):T('Opening browser PDF/print…','Browser PDF/அச்சிடும் வசதி திறக்கப்படுகிறது…'));
  return true;
 })().finally(()=>outputPending.delete(key));
 outputPending.set(key,task);return task;
}
async function viewPdf(key){return openLocalPrint(key,'view');}
async function downloadPdf(key){return openLocalPrint(key,'download');}
async function printReport(key){return openLocalPrint(key,'print');}
async function remove(key){
 if(generationBusy()){status(T('Wait — generating PDF…','காத்திருக்கவும் — PDF உருவாக்கப்படுகிறது…'));return;}
 const uid=owner(),r=await records('get',key);if(!uid||r?.owner!==uid)return;
 await records('delete',key);
 await pdfRecords('delete',key+':en').catch(()=>{});await pdfRecords('delete',key+':ta').catch(()=>{});
 $('smvSavedViewer').replaceChildren();
 status(T('Saved report deleted from this browser.','சேமித்த அறிக்கை இந்த browser-லிருந்து நீக்கப்பட்டது.'));
 await list();
}
const saving=new Map();
function save(feature){if(saving.has(feature))return saving.get(feature);const p=saveReport(feature).finally(()=>saving.delete(feature));saving.set(feature,p);return p;}
async function saveReport(feature){const uid=owner(),item=live.get(feature);if(!uid)throw Error(T('Log in before saving.','சேமிப்பதற்கு முன் உள்நுழைக.'));if(!item||!item.root.isConnected)throw Error(T('Complete this report first.','முதலில் அறிக்கையை நிறைவு செய்யவும்.'));const {root,birthIdentity}=item;if(root.getAttribute('aria-busy')==='true')throw Error(T('Wait for the calculation to finish.','கணக்கீடு முடியும் வரை காத்திருக்கவும்.'));const requestedLanguage=(item.generationLanguage||root.dataset.generationLanguage||root.dataset.resultLanguage||(ta()?'ta':'en'))==='ta'?'ta':'en';status(requestedLanguage==='ta'?'அறிக்கை சேமிக்கத் தயாராகிறது…':'Preparing report for saving…');let prepareWarning='';const advancedEnabled=window.__smvHoroscopePaidState?.config?.advanced_analysis?.enabled===true;const shouldPrepare=feature==='marriage_matching'||advancedEnabled;try{if(shouldPrepare)await root.__smvPrepareReport?.();}catch(e){prepareWarning=String(e?.message||e||'');console.warn('Non-fatal report preparation warning:',prepareWarning);}if(uid!==owner())throw Error('Account changed during saving.');const id=await hash(feature,birthIdentity),key=uid+':'+id,old=await records('get',key);const language=requestedLanguage;let sourceHtml=root.innerHTML;if(feature==='advanced_analysis'&&!advancedEnabled){const snap=document.createElement('template');snap.innerHTML=sourceHtml;snap.content.querySelectorAll('.smv-advanced-part-content,.smv-advanced-part-title,[data-feature="advanced_analysis"],[data-horoscope-feature="advanced_analysis"],.smv-advanced-analysis,.advanced-analysis-section,#advancedAnalysis,#advanced-analysis').forEach(e=>e.remove());const wrap=document.createElement('div');wrap.append(snap.content.cloneNode(true));sourceHtml=wrap.innerHTML;}const html=clean(sourceHtml),views={...(old?.views||{}),[language]:html};/* V89: never call prepareViews here. It builds the alternate language and was causing EN → TA → EN work before PDF save. The paid report stores/generates only the language selected when generation started. */if(uid!==owner()||live.get(feature)!==item)throw Error('Report changed during saving. Retry the current report.');const paid=true;const report={format:'smv-report',version:2,id,key,owner:uid,feature,birthIdentity,name:item.name,language,html,views,calculation:item.calculation||null,savedAt:Date.now(),dirty:false,paid,prepareWarning,pdfState:'browser_native',storage:'indexeddb'};await records('put',report);await list();status(T('Report saved locally.','அறிக்கை browser-ல் சேமிக்கப்பட்டது.'));/* V93 local-first: do not let metadata sync block selected-language PDF completion. *//* V107: never cloud-sync an unverified local snapshot. A pre-payment report must stay local/view-only; posting it is what produced the false 403 Payment required banner. */return report;}
async function sync(){if(syncPending)return syncPending;const uid=owner(),epoch=authEpoch;if(!uid)return;syncPending=(async()=>{const valid=()=>uid===owner()&&epoch===authEpoch;if(!valid())return;const rows=(await records('all')).filter(r=>r.owner===uid);for(const r of rows.filter(r=>r.dirty)){if(!valid())return;if(!r.deleted&&!r.paid)continue;if(r.deleted){await syncApi('/horoscope-reports/'+r.id,{method:'DELETE'});if(valid())await records('delete',r.key);}else{const out=await syncApi('/horoscope-reports',{method:'POST',body:JSON.stringify({feature:r.feature,birthIdentity:r.birthIdentity,report:r})});if(valid())await records('put',{...r,dirty:false,revision:out.revision,paid:true,savedAt:out.savedAt});}}
 if(!valid())return;const remote=await syncApi('/horoscope-reports');if(!valid())return;for(const meta of remote.reports||[]){if(!valid())return;const key=uid+':'+meta.id,local=await records('get',key);if(local?.deleted||local?.dirty)continue;if(local?.revision===meta.revision&&!local?.needsVerification&&local.paid===true)continue;const out=await syncApi('/horoscope-reports/'+meta.id);if(!valid())return;const r=out.report;if(r?.owner===uid)await records('put',{...r,key,html:clean(r.html),revision:meta.revision,paid:true,needsVerification:false,dirty:false});}if(!valid())return;await list();status(T('Saved reports are synchronized. Opening them uses the saved file.','அறிக்கைகள் ஒத்திசைக்கப்பட்டன. திறக்கும்போது சேமித்த கோப்பு பயன்படுத்தப்படும்.'));})().catch(e=>{if(uid===owner()&&epoch===authEpoch)status(T('Saved reports remain available locally. Cloud sync could not complete: ','சேமித்த அறிக்கைகள் சாதனத்தில் உள்ளன. Cloud ஒத்திசைவு முடிக்கப்படவில்லை: ')+(e.message||e))}).finally(()=>syncPending=null);return syncPending;}
function personFrom(b,role){const cap=role[0].toUpperCase()+role.slice(1),alts=role==='groom'?['groom','male','boy','person1']:['bride','female','girl','person2'];for(const k of alts){if(b?.[k]&&typeof b[k]==='object')return b[k];}const x={};for(const f of ['name','birthDate','date','dob','birthTime','time','birthPlace','place','location']){for(const k of [role+cap.replace(cap, f[0].toUpperCase()+f.slice(1)),role+f[0].toUpperCase()+f.slice(1),role+'_'+f])if(b?.[k]){x[f]=b[k];break;}}return x;}
function personText(x,fallback=''){const date=x.birthDate||x.date||x.dob||'',time=x.birthTime||x.time||'',place=x.birthPlace||x.place||x.location||'';return [x.name||fallback,date,time,place].filter(Boolean).join(' ; ');}
function birthLabel(r){const b=r.birthIdentity||{};if(r.feature==='marriage_matching'){return {groom:personText(personFrom(b,'groom')),bride:personText(personFrom(b,'bride'))};}const x=(b.birth&&typeof b.birth==='object'?b.birth:(b.person&&typeof b.person==='object'?b.person:b));return {single:personText(x,r.name)||r.name||T('Saved report','சேமித்த அறிக்கை')};}
async function list(){const uid=owner(),h=$('smvSavedHoroscopeList'),m=$('smvSavedMatchingList'),panel=$('smvSavedReports');if(!h||!m)return;const hGroup=h.closest('.saved-report-group'),mGroup=m.closest('.saved-report-group');if(hGroup)hGroup.hidden=!uid;if(mGroup)mGroup.hidden=!uid;if(panel)panel.hidden=!uid;if(!uid){h.replaceChildren();m.replaceChildren();return;}const rows=(await records('all')).filter(r=>r.owner===uid&&!r.deleted).sort((a,b)=>b.savedAt-a.savedAt);if(uid!==owner())return;h.replaceChildren();m.replaceChildren();const render=(host,r)=>{const row=document.createElement('div');row.className='saved-report-row';const label=document.createElement('div');label.className='saved-report-label';const info=birthLabel(r);if(r.feature==='marriage_matching'){const g=document.createElement('div'),br=document.createElement('div');g.textContent=T('Groom Name: ','மணமகன் பெயர்: ')+(info.groom||'—');br.textContent=T('Bride Name: ','மணமகள் பெயர்: ')+(info.bride||'—');label.append(g,br);}else label.textContent=info.single;const langTag=document.createElement('div');langTag.className='saved-report-language';langTag.textContent=r.language==='ta'?'தமிழ் சேமிப்பு':'English Saved';label.append(langTag);row.append(label);const actions=document.createElement('div');actions.className='saved-report-actions';for(const [name,fn]of [[T('Download PDF','PDF பதிவிறக்க'),()=>downloadPdf(r.key)],[T('View PDF','PDF பார்க்க'),()=>viewPdf(r.key)],[T('Print','அச்சிட'),()=>printReport(r.key)],[T('Delete','நீக்க'),()=>remove(r.key)]]){const b=document.createElement('button');b.type='button';b.textContent=name;b.onclick=()=>fn().catch(fail);actions.append(b);}row.append(actions);host.append(row);};rows.forEach(r=>render(r.feature==='marriage_matching'?m:h,r));if(!h.children.length)h.textContent=T('No saved horoscope reports yet.','சேமித்த ஜாதக அறிக்கைகள் இல்லை.');if(!m.children.length)m.textContent=T('No saved marriage matching reports yet.','சேமித்த திருமண பொருத்த அறிக்கைகள் இல்லை.');}
/* V120: automatic/pending PDF recovery removed. PDFs are strictly on-demand. */
async function migrateLegacy(){const uid=owner();if(!uid)return;const request=indexedDB.open('smv-horoscope-saved-v1');const old=await new Promise((ok,no)=>{request.onsuccess=()=>ok(request.result);request.onerror=()=>no(request.error)});if(!old.objectStoreNames.contains('reports')){old.close();return;}const rows=await new Promise((ok,no)=>{const q=old.transaction('reports').objectStore('reports').getAll();q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error)});old.close();for(const r of rows.filter(r=>r.owner===uid)){const key=uid+':'+r.id;if(!await records('get',key))await records('put',{...r,key,html:clean(r.html),paid:true,dirty:false,legacy:true,feature:'advanced_analysis',pdfState:'on_demand'});}}
function init(){const host=$('english-horoscope');if(!host)return;const panel=document.createElement('section');panel.id='smvSavedReports';panel.innerHTML='<style>#smvSavedReports{margin-top:2rem}#smvSavedReports[hidden]{display:none!important}.saved-report-group{margin:1.7rem 0}.saved-report-heading{display:flex;align-items:center;justify-content:space-between;gap:.75rem;margin:0 0 1rem}.saved-report-heading h3{margin:0}.saved-report-row{padding:1rem 0;border-bottom:1px solid #d7c899}.saved-report-label{margin-bottom:.8rem;font-weight:600}.saved-report-language{margin-top:.35rem;font-size:.86rem;font-weight:700;color:#8B0000}.saved-report-actions{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.55rem}.saved-report-actions button{width:100%;min-height:48px;padding:.55rem .35rem;font:inherit}@media(max-width:620px){.saved-report-heading{align-items:flex-start}.saved-report-sync{font-size:.82rem;min-height:34px}.saved-report-actions{grid-template-columns:repeat(4,minmax(0,1fr));gap:.35rem}.saved-report-actions button{font-size:.82rem;padding:.45rem .2rem}}#smvSavedViewer{position:absolute;left:-100000px;width:794px}</style><p id="smvSavedStatus" role="status"></p><div class="saved-report-group"><div class="saved-report-heading"><h3 data-h-title></h3></div><div id="smvSavedHoroscopeList"></div></div><div class="saved-report-group"><div class="saved-report-heading"><h3 data-m-title></h3></div><div id="smvSavedMatchingList"></div></div><div id="smvSavedViewer" hidden></div>';host.after(panel);bind($('smvSavedViewer'));function labels(){panel.querySelector('[data-h-title]').textContent=T('Saved Horoscope Reports','சேமித்த ஜாதக அறிக்கைகள்');panel.querySelector('[data-m-title]').textContent=T('Saved Marriage Matching Reports','சேமித்த திருமண பொருத்த அறிக்கைகள்');}labels();window.addEventListener('smv-language',()=>{labels();/* V121: language toggle must not rebuild/query Saved Reports. */});window.addEventListener('smv:horoscope-feature-config',()=>list().catch(fail));const refreshForAuth=()=>{authEpoch++;syncPending=null;live.clear();list().catch(fail);if(owner()){migrateLegacy().then(()=>list()).catch(fail);setTimeout(()=>sync().catch(()=>{}),0);}};
window.addEventListener('smv:horoscope-local-auth',refreshForAuth);
list().catch(fail);
// Existing Firebase session can be restored before this classic script receives the auth event.
// Bootstrap that already-authenticated state too, and only react when the UID actually changes.
let seenOwner=owner();if(seenOwner){migrateLegacy().then(()=>list()).catch(fail);setTimeout(()=>sync().catch(()=>{}),0);}
const authWatch=setInterval(()=>{const now=owner();if(now!==seenOwner){seenOwner=now;refreshForAuth();}},250);
window.addEventListener('pagehide',()=>clearInterval(authWatch),{once:true});
}
const manualSaving=new Map();
function featureSaveLabel(feature){return feature==='marriage_matching'?T('Save Marriage Matching','திருமண பொருத்தத்தை சேமி'):T('Save Horoscope','ஜாதகத்தை சேமி');}
function attachSaveButton(feature,item){const root=item?.root;if(!root||!root.isConnected)return;let bar=root.querySelector(':scope > .smv-manual-save-actions');if(!bar){bar=document.createElement('div');bar.className='smv-manual-save-actions';bar.style.cssText='display:flex;justify-content:center;gap:.6rem;margin:1rem 0';const b=document.createElement('button');b.type='button';b.className='smv-manual-save-report';bar.append(b);root.append(bar);}const b=bar.querySelector('button');b.textContent=featureSaveLabel(feature);b.onclick=()=>manualSave(feature,b);}
async function currentSavedReport(feature){
 const uid=owner(),item=live.get(feature);if(!uid||!item?.birthIdentity)return null;
 const id=await hash(feature,item.birthIdentity),key=uid+':'+id,r=await records('get',key);
 return r&&!r.deleted?r:null;
}
async function captureRenderedLanguageViews(){
 const uid=owner();if(!uid)return;
 const language=ta()?'ta':'en';
 for(const [feature,item] of live){
  const root=item?.root;if(!root?.isConnected||root.getAttribute('aria-busy')==='true')continue;
  const id=await hash(feature,item.birthIdentity),key=uid+':'+id,r=await records('get',key);if(!r||r.deleted)continue;
  const html=clean(root.innerHTML);if(!html||r.views?.[language]===html)continue;
  await records('put',{...r,views:{...(r.views||{}),[language]:html},dirty:false,storage:'indexeddb'});
 }
}
async function manualSave(feature,button){if(manualSaving.has(feature))return manualSaving.get(feature);if(!owner()){fail(Error(T('Log in before saving.','சேமிப்பதற்கு முன் உள்நுழைக.')));return;}const task=(async()=>{if(button)button.disabled=true;const existing=await currentSavedReport(feature);if(existing){status(feature==='marriage_matching'?T('Marriage matching is already saved.','திருமண பொருத்தம் ஏற்கனவே சேமிக்கப்பட்டுள்ளது.'):T('Horoscope is already saved.','ஜாதகம் ஏற்கனவே சேமிக்கப்பட்டுள்ளது.'));await list();return existing;}const r=await saveReport(feature);const ready={...r,pdfState:'browser_native',pdfReadyAt:null,dirty:false,storage:'indexeddb'};await records('put',ready);status(feature==='marriage_matching'?T('Marriage matching saved. PDF/Print opens locally only when View/Download/Print is selected.','திருமண பொருத்தம் சேமிக்கப்பட்டது. PDF/அச்சிடும் வசதி பார்க்க/பதிவிறக்க/அச்சிட தேர்வு செய்தால் மட்டும் சாதனத்தில் திறக்கும்.'):T('Horoscope saved. PDF/Print opens locally only when View/Download/Print is selected.','ஜாதகம் சேமிக்கப்பட்டது. PDF/அச்சிடும் வசதி பார்க்க/பதிவிறக்க/அச்சிட தேர்வு செய்தால் மட்டும் சாதனத்தில் திறக்கும்.'));await list();return ready;})().catch(fail).finally(()=>{manualSaving.delete(feature);if(button)button.disabled=false;});manualSaving.set(feature,task);return task;}
window.addEventListener('smv:report-ready',e=>{const item=e.detail;if(!item?.feature)return;live.set(item.feature,item);attachSaveButton(item.feature,item);/* V133: authenticated complete/free or paid reports auto-save. Basic-only/Admin-OFF remains manual. */if(owner()&&!item.basicOnly){queueMicrotask(()=>manualSave(item.feature).catch?.(()=>{}));}});
window.addEventListener('smv-language',()=>{
 /* V124 invariant: language toggle never syncs or creates/fetches PDF. After the translated DOM settles, only cache that rendered language into the already-saved local report. */
 for(const [feature,item] of live)attachSaveButton(feature,item);
 queueMicrotask(()=>{for(const [feature,item] of live)attachSaveButton(feature,item);});
 setTimeout(()=>{for(const [feature,item] of live)attachSaveButton(feature,item);captureRenderedLanguageViews().catch(console.warn);},0);
 setTimeout(()=>captureRenderedLanguageViews().catch(console.warn),120);
});
window.__smvFinalizePaidReport=()=>Promise.resolve(null);
window.__smvSaveCompleteReport=feature=>manualSave(feature);
window.__smvOpenMatchingSavedReport=async(feature,birthIdentity)=>{const uid=owner();if(!uid)return false;const id=await hash(feature,birthIdentity),key=uid+':'+id,r=await records('get',key);if(!r||r.deleted)return false;await display(key);return true;};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
