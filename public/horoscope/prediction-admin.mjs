/* SMV ASTRO — owner-only GLOBAL A/B prediction editors.
 * The public Horoscope has NO per-chart editing controls. Both tabs publish
 * ordinary, evidence-gated rules to smv_content/prediction_rules_v1.
 * Authorization is enforced by existing Firestore rules: smv_content writes
 * are isAdmin() only. Admin session uses a SECONDARY Firebase app, isolated
 * from the customer-only Horoscope Auth instance.
 */
const host=document.getElementById('smvAdminRulesPanel');
const E=window.SMVPredictionRules;
const entry=document.getElementById('smvAdminToolsEntry');
const openButton=document.getElementById('smvAdminOpenTools');
if(host&&E&&entry&&openButton){
 const $=id=>host.querySelector('#'+id);
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const OPS=['eq','ne','gt','gte','lt','lte','in','contains','exists'];
 const pf=['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu'];
 const ta={Sun:'சூரியன்',Moon:'சந்திரன்',Mars:'செவ்வாய்',Mercury:'புதன்',Jupiter:'குரு',Venus:'சுக்கிரன்',Saturn:'சனி',Rahu:'ராகு',Ketu:'கேது'};
 let firebase=null,auth=null,fs=null,verified=false,opening=null,currentId='';
 const status=(msg,bad=false)=>{const el=$('smvAdminMessage');if(el){el.textContent=msg;el.style.color=bad?'#a41020':'#13592f';}};
 const entryStatus=msg=>{const el=document.getElementById('smvAdminToolsStatus');if(el)el.textContent=msg||'';};
 const parse=x=>{let s=String(x??'').trim();if(s==='true')return true;if(s==='false')return false;if(s!==''&&Number.isFinite(Number(s)))return Number(s);return s;};
 const download=(name,data,type='application/json')=>{const blob=new Blob([data],{type:type+';charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);};
 function shell(){host.hidden=false;host.innerHTML=`<style>
  #smvAdminRulesPanel{background:#fffdf9;color:#292328;border:1px solid #e0cbc9;border-radius:12px;font-family:system-ui,'Noto Sans Tamil',sans-serif}
  #smvAdminRulesPanel *{box-sizing:border-box}#smvAdminRulesPanel h2{color:#862039;font-size:1.35rem}
  #smvAdminRulesPanel label{display:block;font-weight:650;margin:10px 0 4px}
  #smvAdminRulesPanel input:not([type=checkbox]),#smvAdminRulesPanel textarea,#smvAdminRulesPanel select{width:100%;padding:9px;border:1px solid #bdaeb1;border-radius:6px;font:inherit;background:white;color:#241d21}
  #smvAdminRulesPanel textarea{line-height:1.65;min-height:95px}
  #smvAdminRulesPanel button{font:inherit;padding:9px 13px;border-radius:7px;background:#7c1f35;color:white;border:0;cursor:pointer}
  #smvAdminRulesPanel button.secondary{background:#5f595d}#smvAdminRulesPanel button.danger{background:#a72226}
  #smvAdminRulesPanel button:disabled{opacity:.6}#smvAdminRulesPanel .row{display:flex;gap:9px;flex-wrap:wrap;margin:12px 0}
  #smvAdminRulesPanel .cols{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
  #smvAdminRulesPanel .cols3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
  #smvAdminRulesPanel .box{border:1px solid #ebdede;padding:12px;margin:12px 0;border-radius:9px}
  #smvAdminRulesPanel .hint{font-size:.89rem;line-height:1.7;color:#544c51}
  #smvAdminRulesPanel .condition{display:grid;grid-template-columns:2fr 1fr 1.4fr auto;gap:6px;margin:7px 0}
  #smvAdminRulesPanel .rules{max-height:270px;overflow:auto}#smvAdminRulesPanel .rule-row{padding:8px;border-bottom:1px solid #eee}
  #smvAdminRulesPanel #smvAdminMessage{font-weight:650;min-height:1.4em}
  #smvAdminRulesPanel #smvAdminClose{width:40px;min-width:40px;height:40px;padding:0;display:inline-flex;align-items:center;justify-content:center;font-size:22px;line-height:1}
  #smvAdminRulesPanel [hidden]{display:none!important}
  @media(max-width:700px){#smvAdminRulesPanel .cols,#smvAdminRulesPanel .cols3,#smvAdminRulesPanel .condition{grid-template-columns:1fr}}
  @media print{#smvAdminRulesPanel{display:none!important}}
 </style><div class="row" style="align-items:center;justify-content:flex-start;margin:0"><button id="smvAdminClose" type="button" class="secondary" aria-label="Close Admin tools">×</button></div><div id="smvAdminMessage" role="status"></div><div id="smvAdminAuthArea" hidden></div><div id="smvAdminEditorArea" hidden></div>`;
  $('smvAdminClose').onclick=()=>{host.hidden=true;openButton.setAttribute('aria-expanded','false');entryStatus('Admin tools மூடப்பட்டுள்ளன. மீண்டும் திறக்க Admin Tools-ஐ அழுத்தவும்.');openButton.focus({preventScroll:true});};
 }
 async function initFirebase(){if(firebase&&auth?.currentUser)return firebase;
  const [appM,authM,fsM]=await Promise.all([
   import('https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js'),
   import('https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js'),
   import('https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js')]);
  const app=appM.getApps().find(x=>x.name==='smv-horoscope-local');
  if(!app)throw Error('முதலில் SMV HOROSCOPE Login மூலம் உள்நுழையவும்.');
  auth=authM.getAuth(app);if(auth.authStateReady)await auth.authStateReady();fs=fsM.getFirestore(app);
  firebase={authM,fsM};return firebase;
 }
 async function verifyAdmin(){
  if(!auth?.currentUser)return false;
  // The document does not have to exist. The *read permission* for any
  // smv_settings doc except 'question' is available only to isAdmin().
  // This mirrors the server-enforced role gate with no hard-coded email/UID.
  try{await firebase.fsM.getDocFromServer(firebase.fsM.doc(fs,'smv_settings','prediction_editor_access'));
   return true;
  }catch(e){if(e?.code==='permission-denied')return false;throw e;}
 }
 function fieldSuggestions(){const fields=['lagna.sign','lagna.nakshatra','lagna.pada','lagna.starLord','moon.sign','moon.nakshatra','moon.pada','moon.starLord','dasha.md','dasha.ad','dasha.pd','dasha.from','dasha.to','transit.planet','transit.signal','tajaka.yearLord','tajaka.munthaHouse','numerology.bodyNumber','numerology.lifeNumber','matching.porutham.score','matching.verdict'];
  for(const n of ['I','II','III','IV','V','VI'])fields.push('section.'+n+'.available');
  for(let h=1;h<=12;h++)for(const p of ['lord','lordHouse','occupants','aspects','karakas','conclusion','relativeScore','positiveCount','negativeCount'])fields.push(`house.${h}.${p}`);
  for(const p of pf){for(const attr of ['sign','house','longitude','retrograde','combust','dignity','nakshatra','pada','starLord','starLordHouse','starLordDignity','rahuOrb'])fields.push(`planet.${p}.${attr}`);
   for(const d of [2,7,9,10,12,24,30])fields.push(`varga.D${d}.${p}.sign`);
   for(const q of pf)if(p!==q){fields.push(`aspect.${p}.${q}.active`,`aspect.${p}.${q}.orb`,`conjunction.${p}.${q}.active`,`conjunction.${p}.${q}.orb`);}
  }
  for(const prefix of ['bride','groom'])for(const p of pf)fields.push(`${prefix}.planet.${p}.house`,`${prefix}.planet.${p}.starLord`);
  for(let i=0;i<12;i++)fields.push(`ashtakavarga.sign.${i}.bindus`);
  return [...new Set(fields)].filter(E.allowedField);
 }
 const channelOps='<option value="natal">D1/வாழ்க்கைப் பலன்</option><option value="mdad">மகாதசை/புக்தி</option><option value="pd">அந்தரம்</option><option value="transit">கோச்சாரம்</option><option value="remedy">பரிகாரம்</option><option value="matching">திருமணப் பொருத்தம் (முழு)</option>';
 const areas='<option value="I">I · D1/வற்கம்</option><option value="II">II · தசை</option><option value="III">III · தாஜக</option><option value="IV">IV · கோச்சாரம்</option><option value="V">V · பரிகாரம்</option><option value="VI">VI · Numerology</option><option value="VII">VII · மந்திரம் Reference</option><option value="VIII">VIII · அதிதேவதை Reference</option><option value="IX">IX · தெய்வம் Reference</option>';
 function editor(){if(!verified||!auth?.currentUser)return;
  $('smvAdminAuthArea').innerHTML='';$('smvAdminEditorArea').hidden=false;
  $('smvAdminEditorArea').innerHTML=`<div class="row"><button type="button" id="smvAdminLoadPublished" class="secondary">Published Rules-ஐ Draft ஆக ஏற்றவும்</button><button type="button" id="smvAdminPublish">Publish — எல்லா Online பயனாளர்களுக்கும்</button></div><p class="hint"><b>கணக்கீடுகள் I–IX மாறாது.</b> கணிக்கப்பட்ட கிரகம்/பாவம்/நட்சத்திரம்/பார்வை/தசை/கோச்சாரம் பொருந்தும் போது மட்டுமே Manual Prediction வருகிறது. Draft உங்கள் Browser-ல் மட்டும் இருக்கும்; Firestore Publish செய்த பிறகு புதிய Horoscope மற்றும் Matching முடிவுகளில் அனைவருக்கும் கிடைக்கும். Offline பயன்பாட்டிற்கு முன்பே Cache செய்யப்பட்ட விதிகள் தேவை. VII–IX துணை Reference மட்டுமே; அவற்றைக் கணக்கீடு என்று காட்ட வேண்டாம்.</p>
  <div class="row"><button type="button" id="smvAdminTabA">A — எல்லா கிரகங்களுக்கும் Rules</button><button type="button" id="smvAdminTabB" class="secondary">B — பொதுப் பலன் உரைத் திருத்தம்</button></div>
  <div id="smvAdminA"><div class="box"><h3>A · Astrology Conditions → Prediction Rule</h3>
  <div class="cols"><div><label>Rule ID</label><input id="smvAdmRuleId" maxlength="64" placeholder="saturn_jupiter_house_10"></div><div><label>விதியின் தலைப்பு</label><input id="smvAdmTitle" maxlength="130" placeholder="10ஆம் பாவ தொழில் பலன்"></div></div>
  <div class="cols3"><div><label>பிரிவு</label><select id="smvAdmChannel">${channelOps}</select></div><div><label>பாவம்</label><select id="smvAdmHouse"><option value="all">அனைத்து பாவங்கள்</option>${Array.from({length:12},(_,i)=>`<option value="${i+1}">${i+1}-ஆம் பாவம்</option>`).join('')}</select></div><div><label>I–IX ஆதாரம்</label><select id="smvAdmSection">${areas}</select></div></div>
  <div class="cols3"><div><label>Priority</label><input type="number" id="smvAdmPriority" value="0" min="-100" max="100"></div><div><label>Conflict Group</label><input id="smvAdmConflict" placeholder="career_theme"></div><div><label>Life Result Tag</label><input id="smvAdmIntent" placeholder="career_income"></div></div>
  <label>பலன் செயல்பாடு</label><select id="smvAdmMode"><option value="append">Append — புதிய விளக்கத்தைச் சேர்க்கவும்</option><option value="replace">Replace — இந்த பாவம்/காலத்திற்கான பழைய Prediction-ஐ மாற்றவும்</option></select><label><input id="smvAdmEnabled" type="checkbox" checked> இந்த விதி Enabled</label>
  <h4>உண்மையாகப் பொருந்த வேண்டிய நிபந்தனைகள் (AND)</h4><p class="hint">ஒரு விதியாவது அவசியம்; கிரகப் பார்வை இல்லாவிட்டால் பார்வைப் பலன் வராது. 9 கிரகங்கள், 12 பாவங்கள், D2/D7/D9/D10 மற்றும் கால ஆதாரங்களைத் தேர்ந்தெடுக்கலாம்.</p><div class="box"><h4>9 கிரகங்களுக்கும் ஒரே Quick Condition Builder</h4><div class="cols3"><div><label>கிரகம்</label><select id="smvAdmQuickPlanet">${pf.map(p=>`<option value="${p}">${ta[p]} · ${p}</option>`).join('')}</select></div><div><label>உறவு / நிலை</label><select id="smvAdmQuickKind"><option value="aspect">மற்றொரு கிரகத்தின் மீது உண்மையான பார்வை</option><option value="conjunction">இணைவு (ஒரே ராசி)</option><option value="house">கிரகம் இருக்கும் பாவம்</option><option value="sign">கிரகம் இருக்கும் ராசி (0–11)</option><option value="starLord">நட்சத்திரநாதன்</option><option value="rahuOrb">ராகு பாகை நெருக்கம் (8°க்குள்)</option><option value="combust">அஸ்தமனம்</option><option value="retrograde">வக்ரம்</option><option value="dignity">ஆட்சி/உச்சம்/நீசம் நிலை</option></select></div><div><label>இலக்கு கிரகம் / எண் / ராசி நிலை</label><input id="smvAdmQuickValue" list="smvAdmQuickTargetList" value="Saturn" placeholder="Saturn / 10 / own"><datalist id="smvAdmQuickTargetList">${pf.map(p=>`<option value="${p}">${ta[p]}</option>`).join('')}<option value="true"><option value="own"><option value="exalted"><option value="debilitated">${Array.from({length:12},(_,i)=>`<option value="${i}"></option>`).join('')}</datalist></div></div><div class="row"><button type="button" id="smvAdmQuickBuild" class="secondary">கணக்கீட்டு நிபந்தனையைச் சேர்க்கவும்</button></div></div>
  <datalist id="smvAdmFieldList">${fieldSuggestions().map(x=>`<option value="${esc(x)}"></option>`).join('')}</datalist><div id="smvAdmConditions"></div><div class="row"><button type="button" id="smvAdmAddCondition" class="secondary">+ நிபந்தனை</button></div>
  <div class="cols"><div><label>தமிழ்ப் பலன்</label><textarea id="smvAdmTA" rows="5" placeholder="இந்தக் கிரக அமைப்பின் வாழ்க்கை விளைவு... "></textarea></div><div><label>English Prediction</label><textarea id="smvAdmEN" rows="5"></textarea></div></div>
  <div class="row"><button type="button" id="smvAdmSaveDraft">Save Draft</button><button type="button" id="smvAdmNew" class="secondary">New Rule</button></div></div>
  <div class="box"><h3>Draft Rules</h3><div id="smvAdmRuleList" class="rules"></div></div>
  <div class="box"><h3>Rule Preview (கணிக்கப்பட்ட JSON இருந்தால்)</h3><textarea id="smvAdmJSON" rows="4" placeholder='{"chart":{"lagna":{"longitude":...},"planets":[...]}}'></textarea><div class="row"><button type="button" class="secondary" id="smvAdmPreview">Actual Fact Match Preview</button></div><pre id="smvAdmPreviewResult" style="max-height:250px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere"></pre></div></div>
  <div id="smvAdminB" hidden><div class="box"><h3>B · Global Prediction Text Editor — Report-specific Edit இல்லை</h3><p class="hint">இது ஒரே ஜாதகரை மாற்றாது. A-வில் உள்ள பொதுவிதியின் <b>தமிழ்/ஆங்கிலப் பலனை</b> திருத்தலாம். ஏற்கெனவே உள்ள Offline Prediction-ஐ மாற்ற, குறிப்பிட்ட <b>பாவம் + கணிக்கப்பட்ட நிபந்தனை + Replace</b> விதியை உருவாக்கலாம். இதை Publish செய்தால் அடுத்த புதிய கணக்கீடுகளில் எல்லாப் பயனாளர்களுக்கும் பொருந்தும்.</p>
  <label>திருத்த வேண்டிய பொது Rule</label><select id="smvAdmBRule"></select><label>தமிழில் திருத்தப்பட்ட பலன்</label><textarea id="smvAdmBTA" rows="8"></textarea><label>English Updated Prediction</label><textarea id="smvAdmBEN" rows="8"></textarea><label>Output Mode</label><select id="smvAdmBMode"><option value="replace">Replace the entire matched house/period interpretation</option><option value="append">Add an evidenced paragraph</option></select><div class="row"><button type="button" id="smvAdmBSave">இந்தப் பொதுவிதியின் பலனை Save Draft செய்யவும்</button></div>
  <hr><h3>புதிய பொதுப் பலன் (12 பாவங்கள் / 9 கிரகங்கள்)</h3><p class="hint">இந்தப் படிவம் A-வில் ஒரு புதிய ஆதார நிபந்தனை விதியை உருவாக்குகிறது; B போல எல்லா பயனாளர்களுக்கும் பொருந்தும். ஜாதக நிபந்தனை இல்லாமல் பொதுப் பலன் உருவாக்காது.</p><div class="cols3"><div><label>பாவம்</label><select id="smvAdmBHouse">${Array.from({length:12},(_,i)=>`<option value="${i+1}">${i+1}</option>`).join('')}</select></div><div><label>அந்தப் பாவத்தின் அதிபதி</label><select id="smvAdmBPlanet">${pf.filter(p=>!['Rahu','Ketu'].includes(p)).map(p=>`<option value="${p}">${ta[p]} / ${p}</option>`).join('')}</select></div><div><label>பலன் வகை</label><select id="smvAdmBType"><option value="natal">வாழ்க்கை</option><option value="remedy">பரிகாரம்</option></select></div></div><div class="row"><button type="button" id="smvAdmBCreate">A-வில் இந்த ஆதார நிபந்தனை உருவாக்கவும்</button></div></div></div>
  <div class="box"><div class="row"><button type="button" id="smvAdmExport" class="secondary">Rules JSON Backup</button><button type="button" id="smvAdmExportStatic" class="secondary">Offline Snapshot JS (optional)</button><label style="display:inline-block" for="smvAdmImport">Rules JSON Restore</label><input type="file" id="smvAdmImport" accept=".json,application/json" style="max-width:220px"></div><p class="hint">Publish கோரிக்கை Firebase Admin Permission மூலம் பாதுகாக்கப்படுகிறது. Preview / Save Draft-க்கு எந்த Firestore Writes-மும் இல்லை. நடப்புக் கணக்கீடுகள் மாற்றப்படவில்லை.</p></div>`;
  $('smvAdminLoadPublished').onclick=()=>{if(!confirm('Draft-ல் உள்ள மாற்றங்களை Published Rules கொண்டு மாற்றவா?'))return;E.setLocalRules(E.getPublishedRules());list();status('தற்போது வெளியிடப்பட்ட Rules Draft ஆக ஏற்றப்பட்டன.');};
  $('smvAdminPublish').onclick=publish;
  $('smvAdminTabA').onclick=()=>tab('A');$('smvAdminTabB').onclick=()=>tab('B');
  $('smvAdmAddCondition').onclick=()=>condition();$('smvAdmQuickBuild').onclick=quickCondition;$('smvAdmSaveDraft').onclick=saveA;$('smvAdmNew').onclick=()=>fillA(null);
  $('smvAdmBRule').onchange=loadB;$('smvAdmBSave').onclick=saveB;$('smvAdmBCreate').onclick=makeB;
  $('smvAdmExport').onclick=()=>download('SMV_GLOBAL_PREDICTION_RULES_BACKUP.json',JSON.stringify(E.publicBundle(E.getLocalRules()),null,2));
  $('smvAdmExportStatic').onclick=()=>download('prediction-rules-published.js','/* Admin-approved SMV offline prediction snapshot. */\nwindow.SMVPUBLISHED_PREDICTION_RULES = '+JSON.stringify(E.getLocalRules(),null,2)+';\n','application/javascript');
  $('smvAdmImport').onchange=async ev=>{const file=ev.target.files?.[0];if(!file||file.size>800000){status('JSON அளவு 800 KB-க்கு குறைவாக இருக்க வேண்டும்.',true);return;}try{const data=JSON.parse(await file.text());if(data?.format!=='SMV-PREDICTION-RULES'||data?.schemaVersion!==1)throw Error('Invalid SMV JSON');const rows=E.normalizeRules(data);if(!rows.length||rows.length!==(data.rules||[]).length)throw Error('Rule format invalid');E.setLocalRules(rows);list();status(rows.length+' விதிகள் Draft ஆக மீட்டெடுக்கப்பட்டன.');}catch(e){status(e.message,true);}ev.target.value='';};
  $('smvAdmPreview').onclick=preview;
  if(!E.getLocalRules().length&&E.getPublishedRules().length)E.setLocalRules(E.getPublishedRules());
  fillA(null);list();tab('A');
 }
 function tab(which){$('smvAdminA').hidden=which!=='A';$('smvAdminB').hidden=which!=='B';$('smvAdminTabA').className=which==='A'?'':'secondary';$('smvAdminTabB').className=which==='B'?'':'secondary';if(which==='B')loadB();}
 function condition(x={field:'',op:'eq',value:''}){const row=document.createElement('div');row.className='condition';
  row.innerHTML=`<input aria-label="Evidence field" class="cond-field" list="smvAdmFieldList" placeholder="planet.Saturn.house"><select aria-label="Operator" class="cond-op">${OPS.map(op=>`<option value="${op}">${op}</option>`).join('')}</select><input aria-label="Evidence value" class="cond-value" placeholder="true / 10 / Mars"><button type="button" class="danger" aria-label="Remove condition">×</button>`;
  row.querySelector('.cond-field').value=String(x.field||'');row.querySelector('.cond-op').value=x.op||'eq';row.querySelector('.cond-value').value=Array.isArray(x.value)?x.value.join(','):String(x.value??'');row.querySelector('button').onclick=()=>row.remove();$('smvAdmConditions').appendChild(row);
 }
 function quickCondition(){
  const p=$('smvAdmQuickPlanet').value,k=$('smvAdmQuickKind').value,v=$('smvAdmQuickValue').value.trim();
  const pairs={aspect:'aspect.'+p+'.'+v+'.active',conjunction:'conjunction.'+p+'.'+v+'.active',house:'planet.'+p+'.house',sign:'planet.'+p+'.sign',starLord:'planet.'+p+'.starLord',rahuOrb:'planet.'+p+'.rahuOrb',combust:'planet.'+p+'.combust',retrograde:'planet.'+p+'.retrograde',dignity:'planet.'+p+'.dignity'};
  const field=pairs[k];if(['aspect','conjunction'].includes(k)&&p===v){status('ஒரு கிரகம் தன்னைத்தானே பார்க்கும் தனிவிதி இல்லை.',true);return;}
  if(!E.allowedField(field)){status('தவறான கிரகம் அல்லது நிபந்தனை இலக்கு.',true);return;}
  const c={field,op:k==='rahuOrb'?'lt':'eq',value:k==='rahuOrb'?8:['aspect','conjunction','combust','retrograde'].includes(k)?true:parse(v)};
  if(['house','sign'].includes(k)&&!Number.isInteger(c.value)){status('பாவம் / ராசி எண்ணை உள்ளிடவும்.',true);return;}
  if(['aspect','conjunction','starLord'].includes(k)&&!pf.includes(v)){status('இலக்கு கிரகத்தின் English பெயரைத் தேர்ந்தெடுக்கவும்.',true);return;}
  condition(c);status(ta[p]+' → '+field+' நிபந்தனை சேர்க்கப்பட்டது.');
 }
 function fillA(r){currentId=r?.id||'';for(const [k,v] of [['smvAdmRuleId','id'],['smvAdmTitle','title'],['smvAdmChannel','channel'],['smvAdmHouse','house'],['smvAdmSection','sourceSection'],['smvAdmPriority','priority'],['smvAdmConflict','conflictGroup'],['smvAdmIntent','intent']])$(k).value=String(r?.[v]??(v==='house'?'all':v==='priority'?0:v==='sourceSection'?'I':v==='channel'?'natal':''));
  $('smvAdmEnabled').checked=r?.enabled!==false;$('smvAdmMode').value=r?.effect?.mode||'append';$('smvAdmTA').value=r?.effect?.ta||'';$('smvAdmEN').value=r?.effect?.en||'';$('smvAdmConditions').replaceChildren();(r?.conditions||[]).forEach(condition);
 }
 function readA(){return {id:$('smvAdmRuleId').value,title:$('smvAdmTitle').value,channel:$('smvAdmChannel').value,house:$('smvAdmHouse').value,sourceSection:$('smvAdmSection').value,priority:Number($('smvAdmPriority').value),conflictGroup:$('smvAdmConflict').value,intent:$('smvAdmIntent').value,enabled:$('smvAdmEnabled').checked,conditions:[...$('smvAdmConditions').children].map(r=>({field:r.querySelector('.cond-field').value.trim(),op:r.querySelector('.cond-op').value,value:parse(r.querySelector('.cond-value').value)})),effect:{mode:$('smvAdmMode').value,ta:$('smvAdmTA').value,en:$('smvAdmEN').value}};}
 function saveA(){if(!verified)return;const raw=readA();if(raw.channel==='matching')raw.effect.mode='append';const rows=E.normalizeRules([raw]);if(rows.length!==1||!raw.conditions.length){status('Rule நிபந்தனை/பிரிவு/உரை சரிபார்க்கவும். கணக்கீட்டு ஆதாரம் கட்டாயம்.',true);return;}
  let all=E.getLocalRules().filter(x=>x.id!==rows[0].id);if(currentId&&currentId!==rows[0].id)all=all.filter(x=>x.id!==currentId);all.push(rows[0]);
  if(all.length>200){status('ஒரே பதிப்பில் அதிகபட்சம் 200 விதிகள்.',true);return;}
  if(!E.setLocalRules(all)){status('Local storage அனுமதி இல்லை; JSON Backup பயன்படுத்தவும்.',true);return;}
  currentId=rows[0].id;list();status('Draft சேமிக்கப்பட்டது. Publish செய்யும் வரை பொதுப் பயனாளர்களுக்குப் பலன் மாறாது.');
 }
 function list(){const rows=E.getLocalRules(),h=$('smvAdmRuleList');h.replaceChildren();for(const r of rows){const line=document.createElement('div');line.className='rule-row';line.innerHTML=`<b>${esc(r.title||r.id)}</b> (${esc(r.id)}) — ${esc(r.channel)} · ${esc(r.sourceSection)} · ${esc(r.house)} `;
  const edit=document.createElement('button');edit.type='button';edit.textContent='Edit';edit.className='secondary';edit.onclick=()=>{fillA(r);tab('A');$('smvAdmRuleId').focus();};
  const del=document.createElement('button');del.type='button';del.textContent='Delete';del.className='danger';del.onclick=()=>{if(!confirm('விதியை Draft-ல் இருந்து நீக்கவா?'))return;E.setLocalRules(E.getLocalRules().filter(x=>x.id!==r.id));list();};
  line.append(' ',edit,' ',del);h.appendChild(line);
 }
  if(!rows.length)h.textContent='Draft விதிகள் இல்லை. முதல் விதியை A மூலம் சேர்க்கவும்.';
  const select=$('smvAdmBRule'),selected=select.value;select.replaceChildren();for(const row of rows){const op=document.createElement('option');op.value=row.id;op.textContent=row.title+' ['+row.id+']';select.appendChild(op);}if(rows.some(x=>x.id===selected))select.value=selected;loadB();
 }
 function loadB(){const r=E.getLocalRules().find(x=>x.id===$('smvAdmBRule').value);$('smvAdmBTA').value=r?.effect?.ta||'';$('smvAdmBEN').value=r?.effect?.en||'';$('smvAdmBMode').value=r?.effect?.mode||'replace';}
 function saveB(){if(!verified)return;const id=$('smvAdmBRule').value,r=E.getLocalRules().find(x=>x.id===id);if(!r){status('முதலில் A-வில் ஒரு பொது விதியைத் தேர்ந்தெடுக்கவும்.',true);return;}
  const rows=E.normalizeRules([{...r,effect:{mode:r.channel==='matching'?'append':$('smvAdmBMode').value,ta:$('smvAdmBTA').value,en:$('smvAdmBEN').value}}]);if(rows.length!==1){status('தமிழ் / English விளக்கத்தைச் சேர்க்கவும்.',true);return;}
  E.setLocalRules(E.getLocalRules().map(x=>x.id===id?rows[0]:x));list();status('B · பொதுப் Prediction உரை Draft புதுப்பிக்கப்பட்டது; Publish செய்தால் எல்லா ஜாதகங்களுக்கும் பொருந்தும்.');
 }
 function makeB(){const h=Number($('smvAdmBHouse').value),p=$('smvAdmBPlanet').value,k=Date.now().toString(36).slice(-5);
  const r={id:`house${h}_${p.toLowerCase()}_${k}`,title:`${h}-ஆம் பாவம் ${ta[p]} ஆதிபத்தியப் பலன்`,channel:$('smvAdmBType').value,house:h,sourceSection:'I',priority:10,enabled:true,conditions:[{field:`house.${h}.lord`,op:'eq',value:p}],effect:{mode:'replace',ta:'',en:''},intent:`house_${h}_life`};
  fillA(r);tab('A');$('smvAdmTA').focus();status('கணக்கீட்டு நிபந்தனை உருவாக்கப்பட்டது. புதிய தமிழ்/English வாழ்க்கைப் பலனை எழுதிச் Save Draft செய்யவும்.');
 }
 async function publish(){if(!verified||!auth?.currentUser){status('Admin login required.',true);return;}
  const rules=E.getLocalRules();if(!rules.length){status('வெளியிட விதிகள் இல்லை. முதலில் குறைந்தது ஒரு சரிபார்க்கப்பட்ட விதியை உருவாக்கி Save Draft செய்யவும்.',true);return;}if(rules.length>200){status('அதிகபட்சம் 200 விதிகள்.',true);return;}
  const body={published:true,schemaVersion:1,rules,updatedAt:firebase.fsM.serverTimestamp(),editorVersion:2};
  if(new TextEncoder().encode(JSON.stringify({...body,updatedAt:''})).length>700000){status('Firestore வரம்பு: விதிகளை 700 KB-க்குள் குறைக்கவும்.',true);return;}
  if(!rules.every(r=>r.effect.ta&&r.effect.en)){status('Publish செய்யும் முன் எல்லா விதிகளுக்கும் தமிழ் மற்றும் English பலன் இரண்டும் இருக்க வேண்டும்.',true);return;}
  if(!confirm('இந்த '+rules.length+' பொது விதிகளையும் வெளியிட்டால், அடுத்து ஜாதகம் உருவாக்கும் எல்லா Online பயனாளர்களுக்கும் பலன்கள் மாறும். தொடரவா?'))return;
  const b=$('smvAdminPublish');b.disabled=true;status('Firebase Admin அனுமதியுடன் வெளியிடப்படுகிறது...');
  try{if(!await verifyAdmin())throw Error('Admin session expired. Login again.');
   await firebase.fsM.setDoc(firebase.fsM.doc(fs,'smv_content','prediction_rules_v1'),body);
   window.SMVPredictionRulesSync?.acceptPublished({published:true,schemaVersion:1,rules});
   status('✅ '+rules.length+' பொது விதிகள் Published. இனி புதிய Online Horoscope/Matching கணக்கீடுகளில் பொருந்தும்; மற்ற சாதனங்களில் பக்கத்தை மீண்டும் திறக்கவும்.');
  }catch(e){status('Publish முடியவில்லை: '+(e.code||e.message||e)+' · Firebase Auth Domain மற்றும் Firestore permissions சரிபார்க்கவும்.',true);}finally{b.disabled=false;}
 }
 function preview(){const out=$('smvAdmPreviewResult');try{const raw=JSON.parse($('smvAdmJSON').value),J=window.SMVD311Judgement,D=window.SMVLifePredictionD1;
  if(!D?.toD1||!J?.starEvidence)throw Error('I–IX D1 Normalizer இன்னும் தயாராகவில்லை');
  const d=D.toD1(raw),star=J.starEvidence(d,raw),facts=E.fields(d,star,raw,raw?.timeline);
  const results=[];for(const r of E.getLocalRules())if(r.channel==='natal'||r.channel==='remedy'){
   const hs=r.house==='all'?[1,2,3,4,5,6,7,8,9,10,11,12]:[r.house];
   for(const h of hs)for(const x of E.run([r],facts,r.channel,h,'ta'))results.push({house:h,id:x.ruleId,ta:x.text});
  }
  out.textContent=JSON.stringify({matchedRules:results,knownFacts:Object.keys(facts).length},null,2);
 }catch(e){out.textContent='Preview: '+(e.message||e);}}
 window.addEventListener('smv:horoscope-local-auth',event=>{
  const detail=event?.detail||{};
  if(detail.loggedIn!==true||detail.isAdmin!==true){
   verified=false;host.hidden=true;host.replaceChildren();firebase=null;auth=null;fs=null;
   openButton.setAttribute('aria-expanded','false');entryStatus('');
  }
 });
 async function open(){if(opening)return opening;opening=(async()=>{
  if(!host.hidden){host.hidden=true;openButton.setAttribute('aria-expanded','false');entryStatus('Admin tools மூடப்பட்டுள்ளன. மீண்டும் திறக்க Admin Tools-ஐ அழுத்தவும்.');return;}
  try{
   entryStatus('Admin அனுமதி சரிபார்க்கப்படுகிறது…');
   await initFirebase();
   if(!auth?.currentUser||!await verifyAdmin())throw Error('இந்தக் கணக்கிற்கு Admin அனுமதி இல்லை. மீண்டும் சரியான Admin account மூலம் Login செய்யவும்.');
   await window.SMVPredictionRulesSync?.ensureReady?.();
   if(!auth?.currentUser)throw Error('Login session முடிந்துவிட்டது. மீண்டும் Login செய்யவும்.');
   // Preserve verified-login behavior: seed an empty local Draft from reviewed
   // static/published rules, without publishing or writing to Firestore.
   if(!E.getLocalRules().length){
    const baseline=E.getPublishedRules();
    if(baseline.length)E.setLocalRules(baseline);
   }
   shell();verified=true;editor();status('Admin அணுகல் உறுதிப்படுத்தப்பட்டது. Static fallback விதிகள் Draft-இல் தயாராக உள்ளன; பரிசீலித்து Publish செய்த பிறகே Online பயனாளர்களுக்கு மாறும்.');entryStatus('');
   openButton.setAttribute('aria-expanded','true');
   window.dispatchEvent(new CustomEvent('smv:admin-console-open',{detail:{uid:auth.currentUser.uid}}));
   try{host.scrollIntoView({behavior:'smooth',block:'start'});}catch{}
  }catch(e){
   verified=false;host.hidden=true;openButton.setAttribute('aria-expanded','false');
   entryStatus(e?.message||String(e));
  }
 })();try{await opening;}finally{opening=null;}}
 openButton.addEventListener('click',open);
}
