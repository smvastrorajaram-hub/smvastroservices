/* SMV ASTRO V321 — owner-only calculated Prediction Review & Correction.
 * The existing A/B editor owns global Draft/Publish rules. This module supports
 * individual-chart prose in a local saved/printed preview only; it never publishes
 * personal text to customers or Firestore, and never changes chart calculations.
 * The SINGLE offline Swiss calculation/15-year timeline is reused for rule revisions.
 */
(()=>{'use strict';
const adminButton=document.getElementById('smvAdminRulesAccess');
const adminPanel=document.getElementById('smvAdminRulesPanel');
if(!adminButton||!adminPanel)return;
const rootPath=new URL('./',import.meta.url);
const by=id=>document.getElementById(id);
const E=()=>window.SMVPredictionRules;
const encode=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let accessUid='',auth=null,detach=null,connecting=null,calc=null,rawByLanguage=new Map(),views=null,selected='overview',busy=false,translationTimer=null,translationSeq=0;
const personalEdits=new Map(),personalDrafts=new Map();
let pendingPersonalDraft={text:'',mode:'replace'};
let wb=null;
const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
function canUse(){return Boolean(accessUid&&auth?.currentUser?.uid===accessUid&&wb?.isConnected&&!adminPanel.hidden);}
function clean(){accessUid='';calc=null;views=null;rawByLanguage.clear();personalEdits.clear();personalDrafts.clear();pendingPersonalDraft={text:'',mode:'replace'};translationSeq++;wb?.remove();wb=null;}
function message(value,bad=false){const box=wb?.querySelector('[data-wb-status]');if(box){box.textContent=value||'';box.dataset.error=bad?'1':'0';}}
function validDate(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const d=new Date(value+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value;}
function value(sel){return wb?.querySelector(sel)?.value?.trim()||'';}
function label(en,ta){return document.documentElement.lang==='ta'?ta:en;}
const css=`
#smvAdminPredictionWorkbench{font:inherit;line-height:1.65;background:transparent;border:0;border-radius:0;padding:0;margin:14px 0;color:#292328}
#smvAdminPredictionWorkbench *{box-sizing:border-box}
#smvAdminPredictionWorkbench h3{margin:5px 0 10px;color:#7c1936}
#smvAdminPredictionWorkbench .wb-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
#smvAdminPredictionWorkbench label{font-weight:600;font-size:14px;display:block;margin:0 0 2px}
#smvAdminPredictionWorkbench input,#smvAdminPredictionWorkbench select{width:100%;font:inherit;font-size:15px;min-height:42px;background:#fff;color:#232323;border:1px solid #ccb9a5;border-radius:6px;padding:7px}
#smvAdminPredictionWorkbench textarea{display:block;width:100%;min-height:150px;font:inherit;font-size:15px;line-height:1.7;background:#fff;color:#232323;border:1px solid #ccb9a5;border-radius:6px;padding:9px;resize:vertical}
#smvAdminPredictionWorkbench button{border:0;border-radius:7px;background:#7c1f35;color:#fff;font:inherit;padding:9px 12px;cursor:pointer}
#smvAdminPredictionWorkbench button[disabled]{opacity:.6}
#smvAdminPredictionWorkbench button.wb-secondary{background:#5e6262}
#smvAdminPredictionWorkbench .wb-actions{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
#smvAdminPredictionWorkbench .wb-note{font-size:13px;color:#565049;line-height:1.7}
#smvAdminPredictionWorkbench [data-wb-status][data-error="1"]{color:#ab1531}
#smvAdminPredictionWorkbench [data-wb-status]{font-weight:650;min-height:1.5em}
#smvAdminPredictionWorkbench .wb-place-results{display:grid;gap:4px;max-height:190px;overflow-y:auto}
#smvAdminPredictionWorkbench .wb-place-results button{background:#fff;text-align:left;border:1px solid #ddd;color:#222;font-size:13px}
#smvAdminPredictionWorkbench .wb-block{padding:10px 0;border:0;border-top:1px solid #e5d8c2;border-radius:0;margin:14px 0;background:transparent}
#smvAdminPredictionWorkbench .wb-cols{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}
#smvAdminPredictionWorkbench .wb-prose{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.8;font-size:15px;margin:0}
#smvAdminPredictionWorkbench .wb-cols article{padding:0;margin:0;border:0;border-radius:0;background:transparent}#smvAdminPredictionWorkbench .wb-cols article h4{padding-bottom:5px;border-bottom:1px solid #e5d8c2}#smvAdminPredictionWorkbench .wb-changed{border:0;background:transparent}
#smvAdminPredictionWorkbench .wb-diff-summary{margin:8px 0;font-weight:650;font-size:13px}
#smvAdminPredictionWorkbench pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;line-height:1.5;max-height:340px;overflow:auto}
#smvAdminPredictionWorkbench .wb-pill{display:inline-block;border:1px solid #bd8b78;border-radius:12px;padding:1px 8px;margin:4px;color:#662035}
#smvAdminPredictionWorkbench [hidden]{display:none!important}
@media(max-width:700px){#smvAdminPredictionWorkbench .wb-grid,#smvAdminPredictionWorkbench .wb-cols{grid-template-columns:1fr}#smvAdminPredictionWorkbench{padding:9px}#smvAdminPredictionWorkbench button{font-size:14px}}
@media print{#smvAdminPredictionWorkbench .wb-actions,#smvAdminPredictionWorkbench .wb-grid{display:none}}
`;
function shell(){
 const area=adminPanel.querySelector('#smvAdminEditorArea');if(!area||area.hidden||!accessUid)return;
 if(wb?.isConnected)return;
 wb=document.createElement('section');wb.id='smvAdminPredictionWorkbench';
 wb.innerHTML=`<style>${css}</style><h3>Admin · Prediction Rule Review & Correction / பலன் ஆய்வு</h3>
 <p class="wb-note">Admin-only: Existing Offline Swiss D1, I–IX evidence, real 15-year Dasha/Pratyantara/Transit. One calculation; Draft / Published comparison; no payment or customer report editing.</p>
 <section class="wb-personal-authoring" aria-labelledby="wbPersonalAuthoringTitle">
  <h4 id="wbPersonalAuthoringTitle">தனிப்பட்ட ஜாதகப் பலன் எழுதுதல் / Personal Prediction Authoring</h4>
  <p class="wb-note">Admin அனுமதி கிடைத்தவுடன் இங்கு உங்கள் உரையை எழுதலாம். ஜாதகக் கணிப்பு முடிந்த பிறகு ஒரு பகுதியைத் தேர்ந்தெடுத்து Apply செய்யலாம். இது இந்த Admin preview-க்கு மட்டும்; பொதுவான A/B Rule, customer report அல்லது Firebase-ஐ மாற்றாது.</p>
  <div class="wb-grid">
   <div><label for="wbPersonalSection">தனிப்பட்ட பலனை இணைக்க வேண்டிய பகுதி / Chart section</label><select id="wbPersonalSection" disabled><option value="">Calculate முடிந்த பிறகு பகுதியைத் தேர்ந்தெடுக்கவும் / Calculate first</option></select></div>
   <div><label for="wbPersonalMode">எழுதிய உரையை எப்படிச் சேர்ப்பது? / Apply mode</label><select id="wbPersonalMode"><option value="replace">இந்தப் பகுதியின் கணினிப் பலனை மாற்று / Replace section</option><option value="append">கணிக்கப்பட்ட பலனுக்குப் பின் சேர் / Append to section</option></select></div>
  </div>
  <label for="wbPersonalText">நீங்கள் எழுதும் உண்மையான வாழ்க்கை பலன் / Your authored prediction</label>
  <textarea id="wbPersonalText" maxlength="18000" rows="8" spellcheck="true" placeholder="இந்த ஜாதகரின் உண்மை வாழ்க்கை அனுபவம், ஜாதக ஆதாரம், காலவரம்பு மற்றும் நடைமுறை வழிகாட்டலை உங்கள் சொற்களில் எழுதுங்கள்…"></textarea>
  <div class="wb-actions"><button type="button" class="wb-secondary" data-wb-personal-copy disabled>கணிக்கப்பட்ட Draft-ஐ தொடக்க உரையாக எடு / Copy Draft as Starting Text</button><button type="button" data-wb-personal-apply disabled>இந்த ஜாதக Preview-ல் பயன்படுத்து / Apply to This Chart Preview</button><button type="button" class="wb-secondary" data-wb-personal-clear>என் உரையை நீக்கு / Clear My Text</button></div>
  <p data-wb-personal-status class="wb-note" aria-live="polite">உரையை இப்போதே எழுதலாம். Calculate முடியும் வரை Copy/Apply செயல்கள் முடக்கப்பட்டுள்ளன.</p>
  <div class="wb-personal-preview"><h4>இந்த ஜாதகத்தின் இறுதி தனிப்பட்ட Preview / Final individual preview</h4><div data-wb-personal-preview class="wb-prose">ஜாதக விவரங்களை Calculate செய்து, மேலே ஒரு பகுதியைத் தேர்ந்தெடுத்து உங்கள் உரையை இணைக்கவும் / Calculate a chart and select a section to attach your authored text.</div></div>
 </section>
 <div class="wb-grid">
  <div><label for="wbName">ஜாதகர் பெயர் / Name</label><input id="wbName" maxlength="80" autocomplete="off"></div>
  <div><label for="wbDate">பிறந்த தேதி / DOB</label><input id="wbDate" type="date" min="1800-01-01" max="2399-12-31"></div>
  <div><label for="wbTime">பிறந்த நேரம் / Time</label><input id="wbTime" type="time"></div>
  <div><label for="wbPlace">பிறந்த இடம் / Place</label><input id="wbPlace" autocomplete="off" placeholder="Perambalur, Tamil Nadu"><div class="wb-place-results" data-wb-places></div></div>
  <div><label for="wbLat">Latitude / அட்சரேகை</label><input id="wbLat" type="number" step="any" min="-90" max="90"></div>
  <div><label for="wbLon">Longitude / தீர்க்கரேகை</label><input id="wbLon" type="number" step="any" min="-180" max="180"></div>
  <div><label for="wbOffset">UTC வேறுபாடு (மணி)</label><input id="wbOffset" type="number" min="-12" max="14" step="0.25" value="5.5"></div>
  <div><label for="wbLang">பலன் மொழி / Prediction language</label><select id="wbLang"><option value="ta">தமிழ்</option><option value="en">English</option></select></div>
 </div>
 <div class="wb-actions"><button type="button" data-wb-calculate>ஒருமுறை கணிக்க / Calculate</button><button type="button" class="wb-secondary" data-wb-preview disabled>Draft மாற்றத்தை ஒப்பிடு / Compare</button><button type="button" class="wb-secondary" data-wb-save disabled>Save Preview</button><button type="button" class="wb-secondary" data-wb-print disabled>Print Preview</button></div>
 <p data-wb-status role="status"></p>
 <div data-wb-result hidden>
  <h3>கணிக்கப்பட்ட பலன்கள் / Calculated Predictions</h3><p data-wb-changes class="wb-diff-summary" role="status"></p>
  <div class="wb-grid"><div><label for="wbSection">பகுதி / Section</label><select id="wbSection"></select></div><div><label>Published Rules</label><span data-wb-published></span></div><div><label>Draft Rules</label><span data-wb-draft></span></div></div>
  <div class="wb-cols"><article class="wb-block"><h4>தற்போது வெளியான பலன் / Published</h4><div data-wb-before class="wb-prose"></div></article><article class="wb-block wb-changed"><h4>புதிய Draft பலன் / Preview</h4><div data-wb-after class="wb-prose"></div></article></div>
  <div class="wb-actions"><button type="button" data-wb-create>இந்தப் பகுதிக்கான Rule-ஐ A-வில் உருவாக்கவும் / Create Rule</button></div>
  <details class="wb-evidence"><summary>கணிக்கப்பட்ட ஜாதக ஆதாரங்கள் / Real calculated evidence</summary><pre data-wb-evidence></pre></details>
  <p class="wb-note">Save Preview: Admin browser IndexedDB only. Publish uses the EXISTING A/B Publish button; previews never publish or trigger payment. Select an individual section to inspect what changed.</p>
 </div><details class="wb-saved"><summary>Saved local Admin snapshots / சேமித்த பலன்கள்</summary><div data-wb-saved></div></details>`;
 area.appendChild(wb);
 // Load Calendar editor assets only after the existing Horoscope Admin role gate has opened the workbench.
 import('./calendar-rasi-palan-admin.mjs').then(({ mountCalendarRasiPalanAdmin }) => {
  if(accessUid && auth?.currentUser?.uid===accessUid && wb?.isConnected) mountCalendarRasiPalanAdmin(wb, auth);
 }).catch(error => {
  const box=wb?.querySelector('[data-wb-status]');
  if(box){box.textContent='SMV CALENDAR Admin editor could not load: '+String(error?.message||error);box.dataset.error='1';}
  console.error('SMV CALENDAR Admin editor failed to load',error);
 });
 wb.querySelector('[data-wb-calculate]').addEventListener('click',calculate);
 wb.querySelector('[data-wb-preview]').addEventListener('click',compare);
 wb.querySelector('[data-wb-save]').addEventListener('click',save);
 wb.querySelector('[data-wb-print]').addEventListener('click',print);
 wb.querySelector('[data-wb-create]').addEventListener('click',createRule);
 wb.querySelector('[data-wb-personal-copy]').addEventListener('click',copyDraftToPersonalEditor);
 wb.querySelector('[data-wb-personal-apply]').addEventListener('click',applyPersonalEdit);
 wb.querySelector('[data-wb-personal-clear]').addEventListener('click',clearPersonalEdit);
 wb.querySelector('#wbPersonalText').addEventListener('input',capturePersonalDraft);
 wb.querySelector('#wbPersonalMode').addEventListener('change',capturePersonalDraft);
 wb.querySelector('#wbPersonalSection').addEventListener('change',event=>{
  if(!views||!canUse())return;
  selected=event.target.value;
  const section=wb.querySelector('#wbSection');if(section)section.value=selected;
  renderSelected();
 });
 wb.querySelector('#wbSection').addEventListener('change',event=>{
  selected=event.target.value;
  const personalSection=wb.querySelector('#wbPersonalSection');if(personalSection)personalSection.value=selected;
  renderSelected();
 });
 wb.querySelector('#wbLang').addEventListener('change',()=>{if(calc)compare()});
 // A new DOB/time/place must NEVER silently reuse an old chart. Draft edits,
 // section changes and language changes, by contrast, reuse the same chart.
 const birthFields=new Set(['wbName','wbDate','wbTime','wbPlace','wbLat','wbLon','wbOffset']);
 wb.addEventListener('input',event=>{if(birthFields.has(event.target?.id))invalidateBirth();});
 placeSearch();
 bindAutoTranslation();
 updatePersonalControls();
 listSaved().catch(()=>{});
 message('Admin அனுமதி உறுதி. Personal Prediction Authoring இப்போது தயாராக உள்ளது; ஜாதகத்தை கணித்த பிறகு Apply செய்யலாம்.');
}
function invalidateBirth(){
 if(!calc||busy)return;
 calc=null;views=null;rawByLanguage.clear();personalEdits.clear();personalDrafts.clear();pendingPersonalDraft={text:'',mode:'replace'};
 wb.querySelector('[data-wb-result]').hidden=true;
 for(const key of ['[data-wb-preview]','[data-wb-save]','[data-wb-print]'])wb.querySelector(key).disabled=true;
 const personalSection=wb.querySelector('#wbPersonalSection');personalSection.replaceChildren();
 const option=document.createElement('option');option.value='';option.textContent='Calculate first';personalSection.appendChild(option);
 const editor=wb.querySelector('#wbPersonalText');if(editor)editor.value='';
 wb.querySelector('#wbPersonalMode').value='replace';
 wb.querySelector('[data-wb-personal-preview]').textContent='பிறந்த விவரம் மாறியது. புதிய ஜாதகத்தை Calculate செய்து, பின்னர் தனிப்பட்ட உரையை இணைக்கவும்.';
 wb.querySelector('[data-wb-personal-status]').textContent='பழைய ஜாதகத்திற்கான உரை புதிய ஜாதகத்துக்கு மாற்றப்படவில்லை.';
 updatePersonalControls();
 message('பிறந்த விவரம் மாற்றப்பட்டது. புதிய ஜாதகத்திற்கு Calculate மீண்டும் அழுத்தவும்.');
}
function placeSearch(){let timer,ctrl;
 const place=wb.querySelector('#wbPlace'),list=wb.querySelector('[data-wb-places]');
 place.addEventListener('input',()=>{clearTimeout(timer);ctrl?.abort();wb.querySelector('#wbLat').value='';wb.querySelector('#wbLon').value='';list.replaceChildren();let q=place.value.trim();if(q.length<2)return;
  timer=setTimeout(async()=>{ctrl=new AbortController();try{
   const search=window.__smvSearchPlacesOnlineOffline;
   if(typeof search!=='function')throw Error('Shared online/offline location-search is not loaded');
   const places=await search(q,15,ctrl.signal);if(place.value.trim()!==q)return;list.replaceChildren();
   for(const x of places){const b=document.createElement('button');b.type='button';b.textContent=x.place;b.addEventListener('click',()=>{place.value=x.place;wb.querySelector('#wbLat').value=x.latitude;wb.querySelector('#wbLon').value=x.longitude;list.replaceChildren();invalidateBirth();});list.appendChild(b);}
   if(!places.length)message('இடம் கிடைக்கவில்லை; சரியான Latitude / Longitude கைமுறையாக உள்ளிடலாம்.',true);
  }catch(e){if(e?.name!=='AbortError')message('Place search unavailable — enter latitude and longitude manually.',true);}},450);
 });
}
function collect(){
 const input={name:value('#wbName'),date:value('#wbDate'),time:value('#wbTime'),birthPlace:value('#wbPlace'),lat:Number(value('#wbLat')),lon:Number(value('#wbLon')),utcOffsetMinutes:Number(value('#wbOffset'))*60,language:'ta',houseSystem:'S',height:0};
 const y=Number(input.date.slice(0,4));
 if(!validDate(input.date)||y<1800||y>2399)throw Error('பிறந்த தேதி தவறு அல்லது ஆதரிக்கப்படாத வருடம்.');
 if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time))throw Error('சரியான பிறந்த நேரம் தேவை.');
 if(input.birthPlace.length<2||value('#wbLat')===''||value('#wbLon')==='')throw Error('பிறந்த இடம் மற்றும் அதன் இரண்டு Coordinates தேவை.');
 if(!Number.isFinite(input.lat)||input.lat< -90||input.lat>90||!Number.isFinite(input.lon)||input.lon< -180||input.lon>180)throw Error('Latitude / Longitude வரம்பு தவறு.');
 if(value('#wbOffset')===''||!Number.isFinite(input.utcOffsetMinutes)||input.utcOffsetMinutes< -720||input.utcOffsetMinutes>840)throw Error('UTC offset தவறு.');
 return input;
}
async function calculate(){if(!canUse()||busy)return;busy=true;const button=wb.querySelector('[data-wb-calculate]');button.disabled=true;
 calc=null;views=null;rawByLanguage.clear();personalEdits.clear();personalDrafts.clear();wb.querySelector('[data-wb-result]').hidden=true;
 for(const key of ['[data-wb-preview]','[data-wb-save]','[data-wb-print]'])wb.querySelector(key).disabled=true;
 updatePersonalControls();
 try{
  const input=collect();message('Swiss Offline engine: birth chart, D1/D9, Dasha and 15-year transit calculation…');
  await window.SMVEngineReady;
  if(!canUse())throw Error('Admin session ended');
  if(typeof window.SMVOffline?.full!=='function')throw Error('Offline full calculation not available');
  const full=await window.SMVOffline.full({...input,tajakaYear:new Date().getFullYear(),dailyDate:today(),dailyTime:'12:00'});
  if(!canUse())throw Error('Admin session ended');
  if(!full?.ok||!full?.meta?.complete||!Array.isArray(full.chart?.planets))throw Error('Full offline chart incomplete; no predictions shown');
  message('15 வருட உண்மையான தசா / கோச்சாரக் காலங்கள் கணிக்கப்படுகின்றன…');
  const engine=await import(new URL('d1-15-year-reading.mjs',rootPath));
  const timeline=await engine.build15Year(full,{...input,referenceDate:today()},{lang:'ta'});
  if(!canUse())throw Error('Admin session ended');
  if(JSON.stringify(collect())!==JSON.stringify(input))throw Error('Birth details changed while calculation was running. Calculate again.');
  calc={full,input,timeline,engine};rawByLanguage.clear();
  wb.querySelector('[data-wb-preview]').disabled=false;
  await compare();message('கணக்கீடு முடிந்தது. Published மற்றும் Draft பலன்களை ஒப்பிடலாம்.');
 }catch(e){message('கணக்கீடு முடியவில்லை: '+String(e?.message||e),true);}
 finally{busy=false;if(button?.isConnected)button.disabled=false;updatePersonalControls();}
}
function getRaw(lang){if(rawByLanguage.has(lang))return rawByLanguage.get(lang);
 const {full,input,timeline,engine}=calc;
 const chart={...full.chart,advanced:full.advanced||full.chart.advanced,phase4:full.phase4||full.chart.phase4,transit:full.transit||full.chart.transit};
 const dates=timeline.language===lang?timeline:engine.translate15Year(full,timeline,lang);
 const base=window.SMVD1IntegratedV303;
 if(typeof base?.build!=='function')throw Error('Integrated I–IX prediction engine missing');
 const raw=base.build(chart,lang,{birthPlace:input.birthPlace},dates,{rawPredictionReport:true});
 if(!raw?.topics?.length||!raw?.v311?.judgements?.length)throw Error('Prediction result incomplete. No fabricated report.');
 const normalized=window.SMVLifePredictionD1.toD1(chart),star=raw.v311.starContext||window.SMVD311Judgement.starEvidence(normalized,chart);
 const context={raw,chart,d:normalized,star,dates};rawByLanguage.set(lang,context);return context;
}
function sections(r){const out=[];
 const add=(id,title,body,extra={})=>out.push({id,title,body:body.map(s=>String(s||'').trim()).filter(Boolean).join('\n\n'),...extra});
 add('overview',r.lang==='ta'?'முழு வாழ்க்கைப் பலன் — முன்னுரை':'Full Life Reading — Overview',r.overview||[]);
 for(const x of r.topics||[]){add('house-'+x.number,`${x.number}. ${x.title}`,x.paragraphs||[],{house:x.number,evidence:x.evidence});
  if(x.remedies?.length)add('remedy-'+x.number,`${x.number}. ${r.lang==='ta'?'வழிமுறைகள் / பரிகாரங்கள்':'Remedies / practical guidance'}`,x.remedies,{house:x.number,evidence:x.evidence});
 }
 for(const [key,name] of [['chronology',r.lang==='ta'?'மகாதசை / புக்தி':'Mahadasha / Antardasha'],['pdChronology',r.lang==='ta'?'பிரத்யந்தரம்':'Pratyantara'],['annual',r.lang==='ta'?'அடுத்த 15 ஆண்டுகள் — கோச்சாரம்':'15-Year Transit Windows']]){
  for(const [i,item] of (r[key]||[]).entries()){
   const range=[item.from,item.to].filter(Boolean).join(' – '),period=[item.md||item.period?.md,item.ad||item.period?.ad,item.pd||item.period?.pd].filter(Boolean).join('/');
   add(`${key}-${i}`,`${name}: ${range} ${period}`,[item.text],{house:item.house||item.focusHouse||'all',period:item.period||item,transit:item.transit||null});
  }
 }
 for(const [i,x] of (r.v311?.uncoveredWindows||[]).entries()){
  add(`unconfirmed-${i}`,`${r.lang==='ta'?'போதிய தசா–கோச்சார ஆதாரம் இல்லை':'Insufficient Dasha–Transit Evidence'}: ${x.from} – ${x.to}`,
   [r.lang==='ta'?'இந்தக் காலத்திற்கு தனித்த நிகழ்வுப் பலன் கணிக்கப்படவில்லை.':'No independently supported event forecast was computed for this interval.'],{readOnly:true});
 }
 return out;
}
async function compare(){if(!canUse()||!calc)return;try{
 const lang=value('#wbLang')==='en'?'en':'ta';
 message('Draft விதிகளைப் பயன்படுத்தி பலன்களை ஒப்பிடுகிறோம் — புதிய Swiss கணக்கீடு இல்லை.');
 const context=getRaw(lang),rules=E();
 const published=rules.getPublishedRules(),draft=rules.getLocalRules();
 const before=rules.applyToReport(context.raw,context.chart,context.d,context.star,context.dates,published);
 const after=rules.applyToReport(context.raw,context.chart,context.d,context.star,context.dates,draft);
 const a=sections(before),b=sections(after);
 const draftById=new Map(b.map(x=>[x.id,x]));
 const changed=a.filter(x=>x.body!==(draftById.get(x.id)?.body||''));
 views={lang,before:a,after:b,context,published:published.length,draft:draft.length,changedIds:new Set(changed.map(x=>x.id))};
 wb.querySelector('[data-wb-changes]').textContent=changed.length
   ? `${changed.length} / ${a.length} ${label('sections changed by local Draft.', 'பகுதிகளில் Draft மாற்றம் உள்ளது.')} ${label('Select sections marked ● to inspect.', '● குறியிட்ட பகுதிகளைத் தேர்ந்தெடுத்து ஒப்பிடவும்.')}`
   : label('No prediction changes from Draft. Edit an A/B rule, Save Draft, then Compare.', 'Draft விதிகளால் பலனில் மாற்றம் இல்லை. A/B Rule-ஐ Save Draft செய்து Compare அழுத்தவும்.');
 const selector=wb.querySelector('#wbSection'),personalSelector=wb.querySelector('#wbPersonalSection');const old=selected;
 selector.replaceChildren();personalSelector.replaceChildren();
 for(const s of a){
  const title=(views.changedIds.has(s.id)?'● ':'')+s.title;
  const opt=document.createElement('option');opt.value=s.id;opt.textContent=title;selector.appendChild(opt);
  const personalOpt=document.createElement('option');personalOpt.value=s.id;personalOpt.textContent=title;personalSelector.appendChild(personalOpt);
 }
 selected=a.some(x=>x.id===old)?old:a[0]?.id;
 selector.value=selected;personalSelector.value=selected;
 if(pendingPersonalDraft.text.trim()){
  personalDrafts.set(personalKey(lang,selected),{text:pendingPersonalDraft.text,mode:pendingPersonalDraft.mode||'replace'});
  pendingPersonalDraft={text:'',mode:'replace'};
 }
 wb.querySelector('[data-wb-result]').hidden=false;
 wb.querySelector('[data-wb-save]').disabled=false;wb.querySelector('[data-wb-print]').disabled=false;
 wb.querySelector('[data-wb-published]').textContent=String(published.length);
 wb.querySelector('[data-wb-draft]').textContent=String(draft.length);
 renderSelected();message('Published vs Draft ready. Rule Edit/Save செய்த பிறகு Compare அழுத்தினால் மட்டும் புதிய விளக்கம் தெரியும்.');
 }catch(e){message('Preview முடியவில்லை: '+String(e?.message||e),true)}
}
function renderSelected(){if(!views||!canUse())return;
 const a=views.before.find(s=>s.id===selected),b=views.after.find(s=>s.id===selected);
 if(!a)return;
 const personalSelector=wb.querySelector('#wbPersonalSection');if(personalSelector)personalSelector.value=selected;
 const before=wb.querySelector('[data-wb-before]'),after=wb.querySelector('[data-wb-after]');
 before.textContent=a.body||'இந்தப் பகுதியில் உறுதிசெய்யப்பட்ட பலன் இல்லை.';
 after.textContent=b?.body||'இந்தப் பகுதியில் Draft பலன் இல்லை.';
 after.closest('article')?.classList.toggle('wb-changed',a.body!==b?.body);
 const support=a.evidence||{};
 let witness={section:a.title,house:a.house??null,lagna:views.context.d.lagna,
  natal_planets:views.context.d.planets,
  house_lord:support.lord||null,house_lord_location:support.lordHouse||null,
  conclusion:support.conclusion||null,support:support.support||[],opposition:support.opposition||[],
  nakshatra:support.nakshatra||null,divisional:support.substituteDivision||null,
  dasha_period:a.period||null,computed_transit:a.transit||null,
  warning:'Calculated witnesses only. A matching house/planet condition is necessary. VII–IX are references, not independently calculated positions.'};
 wb.querySelector('[data-wb-evidence]').textContent=JSON.stringify(witness,(_,v)=>typeof v==='bigint'?String(v):v,2).slice(0,23000);
 renderPersonalEditor(a,b);
}
function personalKey(lang,id){return `${lang}|${id}`}
function authoredBody(section,lang){const edit=personalEdits.get(personalKey(lang,section.id));if(!edit)return section.body||'';return edit.mode==='append'?[section.body,edit.text].filter(Boolean).join('\n\n'):edit.text}
function getPersonalSections(){if(!views)return[];return views.after.map(section=>({...section,body:authoredBody(section,views.lang)}))}
function countPersonalEdits(lang){let count=0;for(const key of personalEdits.keys())if(key.startsWith(`${lang}|`))count++;return count}
function updatePersonalControls(){
 if(!wb)return;
 const ready=Boolean(canUse()&&calc&&views&&!busy);
 const section=wb.querySelector('#wbPersonalSection');
 const copy=wb.querySelector('[data-wb-personal-copy]');
 const apply=wb.querySelector('[data-wb-personal-apply]');
 const clear=wb.querySelector('[data-wb-personal-clear]');
 if(section)section.disabled=!ready;
 if(copy)copy.disabled=!ready;
 if(apply)apply.disabled=!ready;
 if(clear)clear.disabled=!canUse()&&!Boolean((wb.querySelector('#wbPersonalText')?.value||'').trim());
 if(!ready){
  const status=wb.querySelector('[data-wb-personal-status]');
  if(status&&!status.dataset.userMessage)status.textContent='உரையை இப்போதே எழுதலாம். Calculate முடியும் வரை Copy/Apply செயல்கள் முடக்கப்பட்டுள்ளன.';
 }
}
function capturePersonalDraft(){
 if(!canUse())return;
 const text=wb.querySelector('#wbPersonalText').value,mode=wb.querySelector('#wbPersonalMode').value;
 const status=wb.querySelector('[data-wb-personal-status]');
 if(!views||!calc){
  pendingPersonalDraft={text,mode};
  if(status){status.dataset.userMessage='1';status.textContent='உங்கள் உரை தற்காலிகமாக வைத்திருக்கப்படுகிறது. Calculate முடிந்ததும் தேர்ந்தெடுத்த ஜாதகப் பகுதிக்கு இணைக்கலாம்.';}
  return;
 }
 const key=personalKey(views.lang,selected);
 personalDrafts.set(key,{text,mode});
 pendingPersonalDraft={text:'',mode:'replace'};
 if(status){status.dataset.userMessage='1';status.textContent=personalEdits.has(key)?'மாற்றிய உரை இன்னும் Apply செய்யப்படவில்லை. Save/Print பழைய Apply செய்யப்பட்ட உரையைத்தான் பயன்படுத்தும்.':'உங்கள் உரை இன்னும் Preview-க்கு Apply செய்யப்படவில்லை.';}
}
function copyDraftToPersonalEditor(){if(!canUse()||!views||!calc||busy)return;const section=views.after.find(x=>x.id===selected)||views.before.find(x=>x.id===selected);const key=personalKey(views.lang,selected),editor=wb.querySelector('#wbPersonalText'),mode=wb.querySelector('#wbPersonalMode');editor.value=String(section?.body||'').slice(0,18000);if(!personalDrafts.has(key)&&!personalEdits.has(key))mode.value='replace';personalDrafts.set(key,{text:editor.value,mode:mode.value});wb.querySelector('[data-wb-personal-status]').textContent='கணிக்கப்பட்ட உரை தொடக்க உரையாக நகலெடுக்கப்பட்டது. உங்கள் சொற்களில் திருத்தி Apply செய்யவும்.'}
function applyPersonalEdit(){if(!canUse()||!views||!calc||busy)return;const key=personalKey(views.lang,selected),text=wb.querySelector('#wbPersonalText').value.trim(),mode=wb.querySelector('#wbPersonalMode').value;if(!text){message('தனிப்பட்ட பலன் உரையை எழுதவும் அல்லது Draft-ஐ தொடக்க உரையாக எடுத்து திருத்தவும்.',true);return}if(text.length>18000){message('ஒரு பிரிவின் தனிப்பட்ட உரை 18,000 எழுத்துகளுக்குள் இருக்க வேண்டும்.',true);return}const edit={text,mode};personalEdits.set(key,edit);personalDrafts.set(key,edit);renderSelected();message('தனிப்பட்ட உரை இந்த ஜாதகத்தின் local Save/Print Preview-க்கு சேர்க்கப்பட்டது. பொதுப் பயனாளர்களுக்கு வெளியிடப்படவில்லை.')}
function clearPersonalEdit(){
 if(!canUse())return;
 const editor=wb.querySelector('#wbPersonalText'),mode=wb.querySelector('#wbPersonalMode');
 if(!views||!calc){
  pendingPersonalDraft={text:'',mode:'replace'};
  if(editor)editor.value='';
  if(mode)mode.value='replace';
  const status=wb.querySelector('[data-wb-personal-status]');if(status){status.dataset.userMessage='1';status.textContent='தற்காலிகத் தனிப்பட்ட உரை நீக்கப்பட்டது.';}
  wb.querySelector('[data-wb-personal-preview]').textContent='ஜாதக விவரங்களை Calculate செய்து, மேலே ஒரு பகுதியைத் தேர்ந்தெடுத்து உங்கள் உரையை இணைக்கவும்.';
  updatePersonalControls();return;
 }
 const key=personalKey(views.lang,selected);personalEdits.delete(key);personalDrafts.delete(key);renderSelected();message('இந்தப் பகுதியின் தனிப்பட்ட உரை நீக்கப்பட்டது; கணிக்கப்பட்ட Draft மீண்டும் காட்டப்படுகிறது.')
}
function renderPersonalEditor(a,b){
 const key=personalKey(views.lang,selected),saved=personalEdits.get(key),draft=personalDrafts.get(key)||saved||{text:'',mode:'replace'},editor=wb.querySelector('#wbPersonalText'),mode=wb.querySelector('#wbPersonalMode');
 editor.value=draft.text;mode.value=draft.mode;
 wb.querySelector('[data-wb-personal-preview]').textContent=authoredBody(b||a,views.lang)||'இந்தப் பகுதியில் தனிப்பட்ட பலனோ கணிக்கப்பட்ட உரையோ இல்லை.';
 const status=wb.querySelector('[data-wb-personal-status]');
 if(status){status.dataset.userMessage='1';status.textContent=saved?'தனிப்பட்ட உரை Apply செய்யப்பட்டுள்ளது. Save Preview அல்லது Print Preview பயன்படுத்தவும்.':draft.text?'உரை இந்த ஜாதகப் பகுதியில் தயாராக உள்ளது; Apply அழுத்தினால் தனிப்பட்ட Preview-க்கு சேரும்.':'இந்த ஜாதகப் பகுதிக்கான தனிப்பட்ட உரையை எழுதலாம்.';}
}
function createRule(){if(!canUse()||!views)return;
 const active=views.after.find(s=>s.id===selected);if(!active||active.readOnly){message('கணிக்கப்பட்ட நிகழ்வு ஆதாரம் இல்லாத பகுதிக்கு விதியை உருவாக்க முடியாது.',true);return;}
 const area=adminPanel.querySelector('#smvAdminEditorArea');if(!area||area.hidden)return;
 const q=key=>area.querySelector('#'+key);
 const num=Number(active.house),house=Number.isInteger(num)&&num>=1&&num<=12?num:'all';
 let channel='natal',section='I',field='',target='',ruler='',quick=false;
 if(active.id.startsWith('remedy-'))channel='remedy';
 else if(active.id.startsWith('chronology-')){channel='mdad';section='II';field='dasha.md';target=active.period?.md||'';}
 else if(active.id.startsWith('pdChronology-')){channel='pd';section='II';field='dasha.pd';target=active.period?.pd||'';}
 else if(active.id.startsWith('annual-')){channel='transit';section='IV';field='transit.planet';target=typeof active.transit==='string'?active.transit:active.transit?.planet||'';}
 if(!field){if(house==='all'){field='lagna.sign';target=views.context.d.lagna;}
  else{field=`house.${house}.lord`;ruler=views.context.d.houses?.find(x=>x.no===house)?.lord||active.evidence?.lord;target=ruler||'';}}
 if(!target&&target!==0){message('இந்தப் பிரிவுக்கான உண்மையான ஆதாரம் கிடைக்கவில்லை. வேறு Section தேர்வு செய்யவும்.',true);return;}
 const tab=q('smvAdminTabA'),newRule=q('smvAdmNew');if(!tab||!newRule)return;
 tab.click();newRule.click();
 const set=(id,val)=>{if(q(id))q(id).value=String(val)};
 const id=`wb_${channel}_${String(house)}_${Date.now().toString(36).slice(-6)}`;
 set('smvAdmRuleId',id);set('smvAdmTitle',active.title.slice(0,125));set('smvAdmChannel',channel);set('smvAdmHouse',house);set('smvAdmSection',section);
 set('smvAdmMode',channel==='matching'?'append':'replace');set('smvAdmPriority','10');set('smvAdmIntent',`house_${house}_${channel}`);
 // Use the existing A condition builder; do not synthesize a planet's dignity,
 // aspect or dasha if it was absent in this actual chart.
 const add=q('smvAdmAddCondition');add?.click();const rows=area.querySelectorAll('#smvAdmConditions .condition');const row=rows[rows.length-1];
 if(!row){message('A Rule Editor condition builder unavailable.',true);return;}
 row.querySelector('.cond-field').value=field;row.querySelector('.cond-op').value='eq';row.querySelector('.cond-value').value=String(target);
 set('smvAdmTA',views.lang==='ta'?active.body:'');set('smvAdmEN',views.lang==='en'?active.body:'');
 // Starting a Rule from a computed section should also attempt the available
 // browser-local translation, not require typing the same paragraph twice.
 // Unsupported browsers must never copy untranslated source into the other field.
 const to=views.lang==='ta'?'smvAdmEN':'smvAdmTA', source=active.body,fromLang=views.lang,toLang=fromLang==='ta'?'en':'ta';
 if(source.trim()&&typeof globalThis.Translator?.create==='function'){
  const seq=++translationSeq;
  translate(source,q(to),fromLang,toLang).then(text=>{
   if(!canUse()||seq!==translationSeq||q('smvAdmRuleId')?.value!==id||q(to)?.value?.trim())return;
   q(to).value=text;q(to).dataset.smvAutoTranslated='1';
   message('மற்ற மொழிப் பலன் தானாக உருவாக்கப்பட்டது. மொழிபெயர்ப்பைச் சரிபார்த்து Save Draft செய்யவும்.');
  }).catch(e=>{if(canUse()&&seq===translationSeq)message('மொழிபெயர்ப்பு கிடைக்கவில்லை: '+String(e?.message||e),true);});
 }
 q('smvAdmRuleId')?.scrollIntoView({behavior:'smooth',block:'center'});
 message('A-வில் ஆதார நிபந்தனை நிரப்பப்பட்டது. தமிழ்/English உரையைச் சரிபார்த்து Save Draft; பின்னர் Compare மூலம் மாற்றத்தைப் பார்க்கவும்.');
}
function asyncIDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open('smv-admin-prediction-review',1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('snapshots'))req.result.createObjectStore('snapshots',{keyPath:'id'});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
async function save(){if(!canUse()||!views)return;try{const db=await asyncIDB(),parts=getPersonalSections(),hasPersonalText=countPersonalEdits(views.lang)>0;const record={id:`${Date.now()}-${crypto.getRandomValues(new Uint32Array(1))[0]}`,at:new Date().toISOString(),uid:accessUid,name:calc.input.name,date:calc.input.date,lang:views.lang,birthPlace:calc.input.birthPlace,sections:parts,personalTextApplied:hasPersonalText};await new Promise((yes,no)=>{const tx=db.transaction('snapshots','readwrite');tx.objectStore('snapshots').put(record);tx.oncomplete=yes;tx.onerror=()=>no(tx.error);});db.close();message(hasPersonalText?'தனிப்பட்ட ஜாதகப் பலன் இந்த Admin browser-ல் மட்டும் சேமிக்கப்பட்டது; பொதுப் பயனாளர்களுக்கும் Firebase-க்கும் வெளியிடப்படவில்லை.':'Admin Preview IndexedDB-ல் சேமிக்கப்பட்டது. பொதுப் பயனாளர்களுக்கும் Firebase-க்கும் அனுப்பப்படவில்லை.');listSaved().catch(()=>{});}catch(e){message('Save தோல்வி: '+String(e?.message||e),true);}}
async function listSaved(){if(!canUse())return;try{const db=await asyncIDB(),all=await new Promise((yes,no)=>{const req=db.transaction('snapshots','readonly').objectStore('snapshots').getAll();req.onsuccess=()=>yes(req.result);req.onerror=()=>no(req.error)});db.close();const place=wb.querySelector('[data-wb-saved]');if(!place)return;place.replaceChildren();for(const x of all.filter(x=>x.uid===accessUid).sort((a,b)=>b.at.localeCompare(a.at)).slice(0,15)){const entry=document.createElement('p'),b=document.createElement('button');b.textContent='Print';b.type='button';b.onclick=()=>printSections(x.name,x.date,x.lang,x.sections,Boolean(x.personalTextApplied));entry.append(document.createTextNode(`${x.at.slice(0,16)} · ${x.name||'Chart'} · ${x.date} · ${x.lang} `),b);place.appendChild(entry);}if(!place.children.length)place.textContent='No saved previews.';}catch(e){message(String(e?.message||e),true);}}
function printSections(name,date,lang,parts,personalTextApplied=false){if(!canUse())return;
 // Open directly inside a trusted click handler (mobile popup blockers).
 const printable=window.open('','_blank');if(!printable){message('Popup blocked. Allow printing popup for this site.',true);return;}
 const html=`<!doctype html><html lang="${lang}"><head><meta charset="UTF-8"><title>SMV Admin Prediction Review</title><style>body{font:15px/1.8 system-ui,'Noto Sans Tamil',sans-serif;margin:18mm;color:#222}h1{text-align:center;color:#7f1e36}h2{font-size:18px;break-after:avoid;border-bottom:1px solid #bd9f7c}section{break-inside:auto;margin:18px 0}p{white-space:pre-wrap;overflow-wrap:anywhere;orphans:3;widows:3}.info{text-align:center;color:#666}@page{size:A4;margin:15mm}</style></head><body><h1>SMV ASTRO — Admin Prediction Preview</h1><div class="info">${encode(name)} · ${encode(date)} · ${lang.toUpperCase()} · Draft Preview (not published)${personalTextApplied?' · Admin-authored personal text included':''}</div>${parts.map(s=>`<section><h2>${encode(s.title)}</h2><p>${encode(s.body)}</p></section>`).join('')}</body></html>`;
 printable.document.open();printable.document.write(html);printable.document.close();printable.focus();setTimeout(()=>printable.print(),200);
}
function print(){if(!canUse()||!views)return;printSections(calc.input.name,calc.input.date,views.lang,getPersonalSections(),countPersonalEdits(views.lang)>0)}
// Browsers with local Translator API can translate A/B rule paragraphs when the
// author finishes one field. Never send private chart data to a third-party API.
// If unsupported (or Tamil pair unavailable), ask for the missing language;
// NEVER silently put untranslated text in the other language field.
async function translate(source,target,from,to){if(!canUse())return;const Translator=globalThis.Translator;
 if(typeof Translator?.create!=='function')throw Error('இந்த Browser-ல் Tamil ↔ English Translator API இல்லை. மற்ற மொழிப் பலனை கைமுறையாக எழுதவும்.');
 if(typeof Translator.availability==='function'){
  const availability=await Translator.availability({sourceLanguage:from,targetLanguage:to});
  if(availability==='unavailable'||availability==='no')throw Error('Tamil ↔ English translation model unavailable on this device.');
 }
 const model=await Translator.create({sourceLanguage:from,targetLanguage:to});
 try{return await model.translate(source)}finally{try{model.destroy?.()}catch{}}
}
function bindAutoTranslation(){const area=adminPanel.querySelector('#smvAdminEditorArea');if(area.dataset.wbTranslated==='1')return;area.dataset.wbTranslated='1';
 area.addEventListener('input',e=>{if(e.isTrusted&&['smvAdmTA','smvAdmEN','smvAdmBTA','smvAdmBEN'].includes(e.target?.id))delete e.target.dataset.smvAutoTranslated;});
 area.addEventListener('focusout',e=>{
  if(!canUse())return;const input=e.target;
  const fields={'smvAdmTA':['smvAdmEN','ta','en'],'smvAdmEN':['smvAdmTA','en','ta'],'smvAdmBTA':['smvAdmBEN','ta','en'],'smvAdmBEN':['smvAdmBTA','en','ta']};
  const type=fields[input.id];if(!type)return;const destination=area.querySelector('#'+type[0]),entered=input.value.trim();
  if(!entered||!destination||(destination.value.trim()&&destination.dataset.smvAutoTranslated!=='1'))return;
  clearTimeout(translationTimer);const seq=++translationSeq;
  translationTimer=setTimeout(async()=>{try{message('Bilingual prediction automatic translation…');const translated=await translate(entered,destination,type[1],type[2]);if(!canUse()||seq!==translationSeq||(destination.value.trim()&&destination.dataset.smvAutoTranslated!=='1')||input.value.trim()!==entered)return;destination.value=translated;destination.dataset.smvAutoTranslated='1';destination.dispatchEvent(new Event('input',{bubbles:true}));message('தமிழ் / English மாற்றம் உருவானது. Publish செய்வதற்கு முன்பு இரு மொழிகளையும் சரிபார்க்கவும்.');}
    catch(err){message(String(err?.message||err),true)}},300);
 },true);
}
async function start(){if(connecting)return connecting;connecting=(async()=>{
 try{const [apps,authMod,fsM]=await Promise.all([import('https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js'),import('https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js')]);
  let app;for(let i=0;i<50;i++){app=apps.getApps().find(x=>x.name==='smv-prediction-admin-auth');if(app)break;await sleep(110);}if(!app)return;
  auth=authMod.getAuth(app);
  if(detach)return;
  detach=authMod.onAuthStateChanged(auth,async user=>{
   if(!user){clean();return;}
   try{
    // Only isAdmin() can read this exact protected settings document.
    await fsM.getDocFromServer(fsM.doc(fsM.getFirestore(app),'smv_settings','prediction_editor_access'));
    if(auth.currentUser?.uid!==user.uid)return;
    accessUid=user.uid;
    for(let k=0;k<500;k++){
     const area=adminPanel.querySelector('#smvAdminEditorArea');if(area&&!area.hidden&&!adminPanel.hidden){shell();return;}
     await sleep(120);if(auth.currentUser?.uid!==user.uid)return;
    }
   }catch(_){clean();}
  });
 }catch(e){/* Not used on public until Admin clicks; existing login handles errors. */}
 })();try{await connecting}finally{connecting=null}}
// The editor clears its own innerHTML on every re-open; restore our panel
// after it reconstructs A/B, without Firestore refresh or MutationObserver.
async function restoreAfterOpen(){
 if(!accessUid||!auth?.currentUser)return;
 for(let i=0;i<500;i++){
  if(adminPanel.hidden)return;
  const editor=adminPanel.querySelector('#smvAdminEditorArea');
  if(editor&&!editor.hidden){shell();return;}
  await sleep(120);
 }
}
adminButton.addEventListener('click',()=>{start().then(restoreAfterOpen).catch(()=>{});},false);
// Admin password submission can finish well after the access button click.
// Listen only to the existing form submission; do not insert any auth/Firebase read.
adminPanel.addEventListener('submit',e=>{
 if(e.target?.id==='smvAdminLoginForm')start().then(restoreAfterOpen).catch(()=>{});
},true);
adminPanel.addEventListener('click',e=>{
 if(e.target?.closest?.('#smvAdminTabA,#smvAdminTabB')){if(canUse())shell();else if(auth?.currentUser)start().catch(()=>{});}
});
})();
