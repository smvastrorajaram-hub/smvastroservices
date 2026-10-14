/* SMV ASTRO — deterministic, read-only interpretation rule engine.
 * Uses existing calculated Section I–IX evidence. NEVER recalculates the chart,
 * calls a remote API, modifies ephemerides, or treats reference tables as measurements.
 * Locally authored rules affect only this browser until an owner deploys a published file.
 */
(function(root,factory){'use strict';const api=factory(root);root.SMVPredictionRules=api;if(typeof module==='object'&&module.exports)module.exports=api;})(typeof window==='object'?window:globalThis,function(g){'use strict';
 const RULES_KEY='smv-prediction-rules-local-v1',OVERRIDE_KEY='smv-prediction-overrides-local-v1',AUTHOR_KEY='smv-prediction-author-mode-v1';
 const PLAN=['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu'];
 const KARA={1:['Sun'],2:['Jupiter','Mercury'],3:['Mars'],4:['Moon'],5:['Jupiter','Mercury'],6:['Mars','Saturn'],7:['Venus','Jupiter'],8:['Saturn'],9:['Jupiter','Sun'],10:['Sun','Mercury','Saturn'],11:['Jupiter'],12:['Saturn','Ketu']};
 const VALID_OPS=new Set(['eq','ne','gt','gte','lt','lte','in','contains','exists']);
 const VALID_CHANNELS=new Set(['natal','mdad','pd','transit','remedy','matching']);
 const NUM=(x)=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x))?Number(x):null;
 const circular=(a,b)=>{const x=NUM(a),y=NUM(b);if(x===null||y===null)return null;const delta=Math.abs(x-y)%360;return Math.min(delta,360-delta);};
 const sign=v=>{if(Number.isInteger(v)&&v>=0&&v<12)return v;const n=NUM(v);return n===null||n<0||n>=360?null:Math.floor(n/30);};
 const storage={read(key,fallback){try{let s=g.localStorage?.getItem(key);return s?JSON.parse(s):fallback;}catch{return fallback;}},write(key,value){try{g.localStorage?.setItem(key,JSON.stringify(value));return true;}catch{return false;}}};
 const digest=text=>{let h=2166136261;const str=String(text||'');for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(16).padStart(8,'0');};
 function identity(raw,d){const source=raw?.chart?.lagna?raw.chart:raw||{},ls=source?.lagna?.longitude??null;const p=(source?.planets||[]).map(x=>[x.name??x.planet,NUM(x.longitude)]).sort((a,b)=>String(a[0]).localeCompare(String(b[0])));return 'chart-'+digest(JSON.stringify({date:source.birthDate||source.birth?.date||raw?.birthDate||'',time:source.birthTime||source.birth?.time||raw?.birthTime||'',lat:source.lat??raw?.lat??null,lon:source.lon??raw?.lon??null,asc:NUM(ls),planets:p,lagna:d?.lagna}));}
 function fields(d,star,chart,timeline,windowPeriod=null){
  const facts={};const put=(name,value)=>{if(value!==null&&value!==undefined&&value!==''&&!(typeof value==='number'&&!Number.isFinite(value)))facts[name]=value;};
  put('lagna.sign',d?.lagna);put('lagna.nakshatra',star?.lagna?.star?.en);put('lagna.pada',star?.lagna?.star?.pada);put('lagna.starLord',star?.lagna?.starRuler);put('lagna.lord',star?.lagna?.lord);
  put('moon.sign',d?.planets?.Moon?.sign);put('moon.nakshatra',star?.planets?.Moon?.star?.en);put('moon.pada',star?.planets?.Moon?.star?.pada);put('moon.starLord',star?.planets?.Moon?.starRuler);
  for(const n of PLAN){const p=d?.planets?.[n],e=star?.planets?.[n];if(!p)continue;const k='planet.'+n+'.';
   put(k+'sign',p.sign);put(k+'house',p.house);put(k+'longitude',p.longitude);put(k+'retrograde',p.retrograde);put(k+'combust',p.combust);put(k+'dignity',p.dignity);
   put(k+'nakshatra',e?.star?.en);put(k+'pada',e?.star?.pada);put(k+'starLord',e?.starRuler);put(k+'starLordHouse',e?.rulerHouse);put(k+'starLordDignity',e?.rulerDignity);put(k+'starLordRetrograde',e?.rulerRetrograde);
   put(k+'rahuOrb',n!=='Rahu'?circular(p.longitude,d.planets?.Rahu?.longitude):null);
   for(const a of e?.rulerAspects||[])if(a?.from&&a?.to){put('aspect.'+a.from+'.'+a.to+'.active',true);put('aspect.'+a.from+'.'+a.to+'.orb',a.orb);put('aspect.'+a.from+'.'+a.to+'.combust',a.combust);put('aspect.'+a.from+'.'+a.to+'.closeRahu',a.closeRahu);}
  }
  for(const h of d?.houses||[]){const key='house.'+h.no+'.';put(key+'sign',h.sign);put(key+'lord',h.lord);put(key+'occupants',h.occupants);put(key+'aspects',h.aspects);put(key+'lordHouse',d.planets?.[h.lord]?.house);put(key+'karakas',KARA[h.no]);}
  // Extend the EXISTING judgement's Parashari aspect witness to all actual pairs;
  // sign-only/aspect geometry stays in judgement.js, not duplicated here.
  const aspect=g.SMVD311Judgement?.aspectWitness;
  if(typeof aspect==='function')for(const from of PLAN)for(const to of PLAN){if(from===to)continue;
    const a=aspect(d,from,to);if(!a)continue;
    const key='aspect.'+from+'.'+to+'.';put(key+'active',true);put(key+'orb',a.orb);put(key+'combust',a.combust);put(key+'closeRahu',a.closeRahu);
  }
  for(const from of PLAN)for(const to of PLAN){if(from===to)continue;
   const a=d?.planets?.[from],b=d?.planets?.[to];if(!a||!b||a.sign!==b.sign)continue;
   const orb=circular(a.longitude,b.longitude);put('conjunction.'+from+'.'+to+'.active',true);put('conjunction.'+from+'.'+to+'.orb',orb);
  }
  if(star?.lagna?.aspects)for(const a of star.lagna.aspects){put('aspect.'+a.from+'.Lagna.active',true);put('aspect.'+a.from+'.Lagna.orb',a.orb);}
  const p=windowPeriod?.period||windowPeriod||{};for(const x of ['md','ad','pd'])put('dasha.'+x,p[x]);
  for(const x of ['from','to'])put('dasha.'+x,p[x]);
  const tr=windowPeriod?.transit||{};put('transit.planet',tr.planet);put('transit.signal',tr.signal);put('transit.date',tr.observedOn||tr.date);
  const source=chart?.chart?.lagna?chart.chart:chart||{};
  const advanced=chart?.advanced||source?.advanced||{};
  const divisional=advanced?.divisional||advanced?.vargas||chart?.vargas||source?.divisional||{};
  const translated={சூரியன்:'Sun',சந்திரன்:'Moon',செவ்வாய்:'Mars',புதன்:'Mercury',குரு:'Jupiter',சுக்கிரன்:'Venus',சனி:'Saturn',ராகு:'Rahu',கேது:'Ketu'};
  // Actual Section I output is an array: [{division:'D-9',planets:[{planet,longitude, ...}]}].
  // Do not invent house placements without a calculated divisional Lagna.
  for(const division of ['D2','D7','D9','D10','D12','D24','D30']){
   const n=division.slice(1);
   const val=Array.isArray(divisional)?divisional.find(x=>String(x?.division||'').replace(/[^0-9]/g,'')===n):
     divisional[division]||divisional[n]||advanced[division]||advanced[n];
   if(val&&typeof val==='object'){
    put('varga.'+division+'.available',true);
    for(const rawPlanet of val.planets||[]){const name=translated[rawPlanet?.planet]||rawPlanet?.planet;if(!PLAN.includes(name))continue;
     const si=sign(rawPlanet.longitude);put('varga.'+division+'.'+name+'.sign',si);
     put('varga.'+division+'.'+name+'.pada',NUM(rawPlanet.pada));
     // Names can be localized; store a name only if it is genuinely calculated.
     put('varga.'+division+'.'+name+'.nakshatra',rawPlanet.nakshatra);
    }
   }
  }
  const av=advanced?.ashtakavarga;if(Array.isArray(av?.sarva))for(let i=0;i<12;i++){
   put('ashtakavarga.sign.'+i+'.bindus',NUM(av.sarva[i]));
   if(d?.lagna!==null&&d?.lagna!==undefined)put('ashtakavarga.house.'+((i-d.lagna+12)%12+1)+'.bindus',NUM(av.sarva[i]));
  }
  if(advanced?.tajaka){put('tajaka.yearLord',advanced.tajaka.yearLord);put('tajaka.munthaHouse',advanced.tajaka.muntha?.house);}
  if(Array.isArray(advanced?.avastha))for(const a of advanced.avastha){const name=translated[a.planet]||a.planet;if(PLAN.includes(name))put('avastha.'+name+'.bala',a.balaAvastha);}
  if(advanced?.numerology?.bodyNumber!==undefined)put('numerology.bodyNumber',NUM(advanced.numerology.bodyNumber));
  if(advanced?.numerology?.lifeNumber!==undefined)put('numerology.lifeNumber',NUM(advanced.numerology.lifeNumber));
  put('section.I.available',!!d?.lagna||d?.lagna===0);
  put('section.II.available',!!(windowPeriod?.period?.md||windowPeriod?.md||timeline?.periods?.length||timeline?.chronology?.length||chart?.phase4?.dashas||chart?.dashas));
  put('section.III.available',!!(advanced?.tajaka||advanced?.tajakaAnalysis));
  put('section.IV.available',!!(windowPeriod?.transit?.planet||timeline?.years?.length||timeline?.transit||chart?.transit));
  put('section.V.available',!!(advanced?.remedial||advanced?.remedialMeasures||advanced?.remedies));
  put('section.VI.available',!!(advanced?.numerology||advanced?.numbers||chart?.numerology));
  // VII–IX are static reference sections in the current UI: no fake per-chart facts.
  for(const roman of ['VII','VIII','IX'])put('section.'+roman+'.referenceOnly',true);
  return facts;
 }
 const allowedField=field=>/^(lagna|moon)\.(sign|nakshatra|pada|starLord|lord)$/.test(field)||
  /^planet\.(Sun|Moon|Mars|Mercury|Jupiter|Venus|Saturn|Rahu|Ketu)\.(sign|house|longitude|retrograde|combust|dignity|nakshatra|pada|starLord|starLordHouse|starLordDignity|starLordRetrograde|rahuOrb)$/.test(field)||
  /^aspect\.(Sun|Moon|Mars|Mercury|Jupiter|Venus|Saturn|Rahu|Ketu)\.(Sun|Moon|Mars|Mercury|Jupiter|Venus|Saturn|Rahu|Ketu|Lagna)\.(active|orb|combust|closeRahu)$/.test(field)||
  /^conjunction\.(Sun|Moon|Mars|Mercury|Jupiter|Venus|Saturn|Rahu|Ketu)\.(Sun|Moon|Mars|Mercury|Jupiter|Venus|Saturn|Rahu|Ketu)\.(active|orb)$/.test(field)||
  /^house\.(?:[1-9]|1[0-2])\.(?:sign|lord|lordHouse|occupants|aspects|karakas)$/.test(field)||
  /^varga\.(?:D2|D7|D9|D10|D12|D24|D30)\.available$/.test(field)||
  /^varga\.(?:D2|D7|D9|D10|D12|D24|D30)\.(?:Sun|Moon|Mars|Mercury|Jupiter|Venus|Saturn|Rahu|Ketu)\.(?:sign|pada|nakshatra)$/.test(field)||
  /^ashtakavarga\.(?:sign\.(?:[0-9]|1[01])|house\.(?:[1-9]|1[0-2]))\.bindus$/.test(field)||
  /^tajaka\.(yearLord|munthaHouse)$/.test(field)||
  /^avastha\.(Sun|Moon|Mars|Mercury|Jupiter|Venus|Saturn|Rahu|Ketu)\.bala$/.test(field)||
  /^numerology\.(bodyNumber|lifeNumber)$/.test(field)||
  /^section\.(?:I|II|III|IV|V|VI)\.available$/.test(field)||
  /^dasha\.(md|ad|pd|from|to)$/.test(field)||
  /^transit\.(planet|signal|date)$/.test(field)||
  /^matching\.(?:porutham\.score|verdict)$/.test(field)||
  /^(?:bride|groom)\.varga\.(?:D2|D7|D9|D10|D12|D24|D30)\.(?:Sun|Moon|Mars|Mercury|Jupiter|Venus|Saturn|Rahu|Ketu)\.(?:sign|pada|nakshatra)$/.test(field)||
  /^(?:bride|groom)\.(?:(?:lagna|moon)\.(?:sign|nakshatra|pada|starLord|lord)|planet\.(?:Sun|Moon|Mars|Mercury|Jupiter|Venus|Saturn|Rahu|Ketu)\.(?:sign|house|longitude|retrograde|combust|dignity|nakshatra|pada|starLord|starLordHouse|starLordDignity|starLordRetrograde|rahuOrb)|house\.(?:[1-9]|1[0-2])\.(?:sign|lord|lordHouse|occupants|aspects|karakas))$/.test(field);
 // Partner facts are only used after the full matching entitlement gate;
 // public Nakshatra-only never evaluates manual or published matching rules.
 function matchingFacts(brideD,brideStar,brideChart,groomD,groomStar,groomChart,porutham,verdict){
  const f={};for(const [prefix,d,star,chart] of [['bride',brideD,brideStar,brideChart],['groom',groomD,groomStar,groomChart]]){
   const facts=fields(d,star,chart,null);
   for(const [k,v] of Object.entries(facts))if(allowedField(prefix+'.'+k))f[prefix+'.'+k]=v;
  }
  if(Number.isInteger(porutham?.score))f['matching.porutham.score']=porutham.score;
  if(['match','no','consult'].includes(verdict?.k))f['matching.verdict']=verdict.k;
  f['section.I.available']=Boolean(brideD?.houses?.length===12&&groomD?.houses?.length===12);
  return f;
 }
 function cleanRule(rule){if(!rule||typeof rule!=='object')return null;const id=String(rule.id||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,64);if(!id||!VALID_CHANNELS.has(rule.channel))return null;
  const conditions=(Array.isArray(rule.conditions)?rule.conditions:[]).slice(0,16).map(c=>({field:String(c.field||''),op:String(c.op||'eq'),value:c.value})).filter(c=>allowedField(c.field)&&VALID_OPS.has(c.op));
  if(!conditions.length||conditions.length!==(rule.conditions||[]).length)return null; // fail closed on malformed conditions
  if(rule.channel==='mdad'&&!conditions.some(c=>/^dasha\.(md|ad)$/.test(c.field)))return null;
  if(rule.channel==='pd'&&!conditions.some(c=>c.field==='dasha.pd'))return null;
  if(rule.channel==='transit'&&!conditions.some(c=>/^transit\.(planet|signal|date)$/.test(c.field)))return null;
  if(rule.channel==='matching'&&!conditions.some(c=>/^(?:matching\.|bride\.|groom\.)/.test(c.field)))return null;
  const effect={ta:String(rule.effect?.ta||'').slice(0,12000).trim(),en:String(rule.effect?.en||'').slice(0,12000).trim()};if(!effect.ta&&!effect.en)return null;
  const house=rule.house==='all'?'all':Number(rule.house);if(house!=='all'&&(!Number.isInteger(house)||house<1||house>12))return null;
  const section=String(rule.sourceSection||'I');if(!/^(I|II|III|IV|V|VI|VII|VIII|IX)$/.test(section))return null;
  return {id,title:String(rule.title||id).slice(0,130),enabled:rule.enabled!==false,channel:rule.channel,house,priority:Math.max(-100,Math.min(100,Number(rule.priority)||0)),conditions,effect,sourceSection:section,intent:String(rule.intent||'').slice(0,120),conflictGroup:String(rule.conflictGroup||'').slice(0,50)};
 }
 function normalizeRules(input){const arr=Array.isArray(input)?input:Array.isArray(input?.rules)?input.rules:[];const ids=new Set(),out=[];for(const item of arr.slice(0,500)){const r=cleanRule(item);if(r&&!ids.has(r.id)){ids.add(r.id);out.push(r)}}return out.sort((a,b)=>b.priority-a.priority||a.id.localeCompare(b.id));}
 function evalOne(c,facts){if(!Object.prototype.hasOwnProperty.call(facts,c.field))return false;const val=facts[c.field],arg=c.value;if(c.op==='exists')return Boolean(val)===Boolean(arg===undefined?true:arg);
  if(c.op==='eq')return String(val)===String(arg);if(c.op==='ne')return String(val)!==String(arg);
  if(c.op==='in'){const xs=Array.isArray(arg)?arg:String(arg??'').split(',').map(x=>x.trim());return xs.some(x=>String(x)===String(val));}
  if(c.op==='contains')return Array.isArray(val)?val.some(x=>String(x)===String(arg)):typeof val==='string'&&val.includes(String(arg));
  const a=NUM(val),b=NUM(arg);if(a===null||b===null)return false;
  return c.op==='gte'?a>=b:c.op==='lte'?a<=b:c.op==='gt'?a>b:c.op==='lt'?a<b:false;
 }
 function ruleMatches(rule,facts,channel,house){const gate=rule.sourceSection;if(/^(I|II|III|IV|V|VI)$/.test(gate)&&facts['section.'+gate+'.available']!==true)return false;return rule.enabled&&rule.channel===channel&&(rule.house==='all'||rule.house===house)&&rule.conditions.every(c=>evalOne(c,facts));}
 function getLocalRules(){return normalizeRules(storage.read(RULES_KEY,[]));}
 function getPublishedRules(){return normalizeRules(g.SMVPUBLISHED_PREDICTION_RULES||[]);}
 function getRules(){const published=getPublishedRules();const local=storage.read(AUTHOR_KEY,false)?getLocalRules():[];const map=new Map(published.map(r=>[r.id,r]));for(const rule of local)map.set(rule.id,rule);return [...map.values()].sort((a,b)=>b.priority-a.priority||a.id.localeCompare(b.id));}
 const compiledRules=new WeakMap();
 function run(rules,facts,channel,house,lang,seen=new Set()){const out=[];const conflicts=new Set();let ready=Array.isArray(rules)?compiledRules.get(rules):null;if(!ready){ready=normalizeRules(rules);if(Array.isArray(rules))compiledRules.set(rules,ready);}for(const rule of ready){if(!ruleMatches(rule,facts,channel,house)||seen.has(rule.id)||rule.conflictGroup&&conflicts.has(rule.conflictGroup))continue;const s=lang==='en'?rule.effect.en:rule.effect.ta;if(!s)continue;out.push({ruleId:rule.id,source:rule.sourceSection,text:s,intent:rule.intent});seen.add(rule.id);if(rule.conflictGroup)conflicts.add(rule.conflictGroup);}return out;}
 function getOverrides(){const obj=storage.read(OVERRIDE_KEY,{});return obj&&typeof obj==='object'&&!Array.isArray(obj)?obj:{};}
 function setOverride(chartId,sectionId,data){if(!/^chart-[0-9a-f]{8}$/.test(chartId)||!/^((house-(?:[1-9]|1[0-2]))|(period-[0-9a-f]{8})|(pd-[0-9a-f]{8})|(annual-[0-9a-f]{8})|overview)$/.test(sectionId))return false;
  const mode=data?.mode==='replace'?'replace':'append',textTa=String(data?.ta||'').slice(0,18000).trim(),textEn=String(data?.en||'').slice(0,18000).trim();if(!textTa&&!textEn)return false;
  const existing=getOverrides();existing[chartId]||={};existing[chartId][sectionId]={mode,ta:textTa,en:textEn,updatedAt:new Date().toISOString()};return storage.write(OVERRIDE_KEY,existing);
 }
 function importOverrides(bundle){if(bundle?.format!=='SMV-REPORT-OVERRIDES'||bundle?.schemaVersion!==1||!bundle.overrides||typeof bundle.overrides!=='object')return false;
  const current=getOverrides();let count=0;
  for(const [chart,sections] of Object.entries(bundle.overrides)){
   if(!/^chart-[0-9a-f]{8}$/.test(chart)||!sections||typeof sections!=='object')continue;
   for(const [name,data] of Object.entries(sections)){
    if(!/^((house-(?:[1-9]|1[0-2]))|(period-[0-9a-f]{8})|(pd-[0-9a-f]{8})|(annual-[0-9a-f]{8})|overview)$/.test(name))continue;
    const ta=String(data?.ta||'').slice(0,18000).trim(),en=String(data?.en||'').slice(0,18000).trim();if(!ta&&!en)continue;
    current[chart]||={};current[chart][name]={mode:data?.mode==='replace'?'replace':'append',ta,en,updatedAt:new Date().toISOString()};count++;if(count>=500)return storage.write(OVERRIDE_KEY,current);
   }
  }
  return count>0&&storage.write(OVERRIDE_KEY,current);
 }
 function removeOverride(chartId,sectionId){const all=getOverrides();if(!all[chartId])return false;delete all[chartId][sectionId];if(!Object.keys(all[chartId]).length)delete all[chartId];return storage.write(OVERRIDE_KEY,all);}
 function getOverride(chartId,sectionId){return getOverrides()?.[chartId]?.[sectionId]||null;}
 function applyText(paragraphs,o,lang){const text=lang==='en'?o?.en:o?.ta;if(!text)return [...paragraphs];return o.mode==='replace'?[text]:[...paragraphs,text];}
 function anchor(prefix,x){return prefix+'-'+digest([x?.from||'',x?.to||'',x?.md||'',x?.ad||'',x?.pd||'',x?.house||''].join('|'));}
 function applyToReport(r,source,d,star,timing){if(!r||!Array.isArray(r.topics))return r;const id=identity(source,d),lang=r.lang||'ta',overrides=getOverrides()[id]||{},rules=getRules();
  const result={...r,topics:r.topics.map(t=>({...t,paragraphs:[...(t.paragraphs||[])],periods:(t.periods||[]).map(x=>({...x})),remedies:[...(t.remedies||[])]})),chronology:(r.chronology||[]).map(x=>({...x})),pdChronology:(r.pdChronology||[]).map(x=>({...x})),annual:(r.annual||[]).map(x=>({...x})),overview:[...(r.overview||[])],manualEditor:{chartId:id,appliedRules:[],localRuleMode:storage.read(AUTHOR_KEY,false)}};
  const facts=fields(d,star,source,timing),seen=new Set();
  const insert=(where,arr,channel,house,windowData)=>{const bundle=fields(d,star,source,timing,windowData);const eligible=['natal','remedy'].includes(channel)&&house!==1?rules.filter(rule=>rule.house!=='all'):rules;const found=run(eligible,bundle,channel,house,lang,new Set());for(const x of found){const scope=channel+':'+(windowData?.period?.from||windowData?.from||'natal')+':'+house+':'+x.ruleId;if(seen.has(scope))continue;arr.push(x.text);result.manualEditor.appliedRules.push({...x,channel,house,scope});seen.add(scope);}};
  for(const t of result.topics){insert('house',t.paragraphs,'natal',t.number);insert('remedy',t.remedies,'remedy',t.number);t.paragraphs=applyText(t.paragraphs,overrides['house-'+t.number],lang);}
  result.overview=applyText(result.overview,overrides.overview,lang);
  for(const group of [['chronology','period','mdad'],['pdChronology','pd','pd'],['annual','annual','transit']]){
   const [part,prefix,channel]=group;
   for(const x of result[part]){const b={period:x.period||x,transit:x.transit};const extra=[];insert(part,extra,channel,x.house||x.focusHouse||'all',b);let lines=applyText([x.text,...extra],overrides[anchor(prefix,x)],lang);x.text=lines.join('\n\n');}
  }
  return result;
 }
 function setLocalRules(input){const arr=normalizeRules(input);return storage.write(RULES_KEY,arr);}
 const authorEnabled=()=>storage.read(AUTHOR_KEY,false)===true;
 const setAuthorEnabled=on=>storage.write(AUTHOR_KEY,!!on);
 function publicBundle(rules){return {format:'SMV-PREDICTION-RULES',schemaVersion:1,generatedAt:new Date().toISOString(),rules:normalizeRules(rules)};}
 return Object.freeze({PLAN,KARA,fields,matchingFacts,identity,circular,allowedField,normalizeRules,evalOne,ruleMatches,run,getRules,getLocalRules,getPublishedRules,setLocalRules,authorEnabled,setAuthorEnabled,getOverrides,setOverride,getOverride,removeOverride,importOverrides,applyToReport,anchor,publicBundle,config:{RULES_KEY,OVERRIDE_KEY,AUTHOR_KEY}});
});
