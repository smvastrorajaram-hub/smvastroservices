/* V125 browser-native saved-report output: IndexedDB -> print-ready HTML -> browser Print/Save as PDF. */
(async()=>{
 async function readSaved(key){
  const db=await new Promise((resolve,reject)=>{const q=indexedDB.open('smv-reports-v2',3);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);q.onblocked=()=>reject(Error('Saved-report database is busy.'));});
  try{return await new Promise((resolve,reject)=>{const q=db.transaction('reports','readonly').objectStore('reports').get(key);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});}finally{db.close();}
 }
 function coverDate(v,tamil){
  const raw=String(v||'').trim();if(!raw)return '—';
  const d=new Date(raw.includes('T')?raw:raw+'T00:00:00');if(Number.isNaN(+d))return raw;
  try{return new Intl.DateTimeFormat(tamil?'ta-IN':'en-IN',{day:'2-digit',month:'long',year:'numeric'}).format(d)}catch{return raw}
 }
 function compactBirthFromReport(root,tamil){
  const firstCard=root.querySelector('.card'),compact=firstCard?.querySelector('p.small[style*="text-align:center"]');
  if(!compact)return null;
  const raw=(compact.textContent||'').replace(/\s+/g,' ').trim(),labels=tamil?{date:'பிறந்த தேதி',time:'நேரம்',place:'பிறந்த இடம்'}:{date:'Date of Birth',time:'Time',place:'Place of Birth'};
  const escRe=v=>v.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const re=new RegExp(escRe(labels.date)+'\\s*:\\s*(.*?)\\s*[·•]\\s*'+escRe(labels.time)+'\\s*:\\s*(.*?)\\s*[·•]\\s*'+escRe(labels.place)+'\\s*:\\s*(.*)$','i'),m=raw.match(re);
  return m?{date:m[1],time:m[2],place:m[3]}:{raw};
 }
 function addCoverPerson(grid,title,name,date,time,place,tamil){
  const card=document.createElement('article');card.className='smv-cover-person';
  const h=document.createElement('h2');h.textContent=(title?title+' · ':'')+(name||'—');card.append(h);
  const add=(label,value)=>{const row=document.createElement('div');row.className='smv-cover-detail';const b=document.createElement('b');b.textContent=label;const i=document.createElement('i');i.textContent=':';const v=document.createElement('span');v.textContent=value||'—';row.append(b,i,v);card.append(row)};
  add(tamil?'பிறந்த தேதி':'Date of Birth',date||'—');add(tamil?'நேரம்':'Time',time||'—');add(tamil?'பிறந்த இடம்':'Place of Birth',place||'—');grid.append(card);
 }
 function populatePremiumCover(report,root,tamil){
  const grid=document.getElementById('smvCoverBirthGrid'),title=document.getElementById('smvCoverReportTitle'),primary=document.getElementById('smvCoverPrimaryName'),sub=document.getElementById('smvCoverSubtitle');if(!grid||!title||!primary||!sub)return;
  grid.replaceChildren();
  if(report.feature==='marriage_matching'){
   title.textContent=tamil?'திருமணப் பொருத்த அறிக்கை':'Marriage Matching Report';sub.textContent=tamil?'இரு ஜாதக வேத ஜோதிட பொருத்த ஆய்வு':'Two-chart Vedic compatibility analysis';
   const cb=report.cover?.bride||{},cg=report.cover?.groom||{},b=report.calculation?.bride||{},g=report.calculation?.groom||{};
   const bn=cb.name||b.birthName||b.nativeName||String(report.name||'').split('/')[0]?.trim()||'Bride',gn=cg.name||g.birthName||g.nativeName||String(report.name||'').split('/')[1]?.trim()||'Groom';
   addCoverPerson(grid,tamil?'பெண்':'Bride',bn,coverDate(cb.date||b.birth?.date||b.birthDate,tamil),cb.time||b.birth?.time||b.birthTime||'—',cb.place||b.birthPlace||b.birth?.place||'—',tamil);
   addCoverPerson(grid,tamil?'ஆண்':'Groom',gn,coverDate(cg.date||g.birth?.date||g.birthDate,tamil),cg.time||g.birth?.time||g.birthTime||'—',cg.place||g.birthPlace||g.birth?.place||'—',tamil);
   primary.textContent=`${bn}  ×  ${gn}`;
  }else{
   title.textContent='Sri Maduraveerayah Horoscope';sub.textContent=tamil?'முழு வேத ஜோதிட வாழ்க்கைப் பலன்':'Complete Vedic life-prediction report';grid.classList.add('is-single');
   const compact=compactBirthFromReport(root,tamil),id=report.identity||{};
   addCoverPerson(grid,'',report.name||'Horoscope',compact?.date||coverDate(id.date,tamil),compact?.time||id.time||'—',compact?.place||'—',tamil);primary.textContent=report.name||'SMV HOROSCOPE';
  }
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
  // Legacy V263-and-earlier saved Horoscope snapshots can still contain retired Section X.
  // Omit Section X on view/print without rewriting a customer's existing saved record.
  if(report.feature==='advanced_analysis')root.querySelectorAll('.integrated-predictions,.smv-advanced-quick-card[data-smv-target="integrated-predictions"]').forEach(e=>e.remove());
  populatePremiumCover(report,root,tamil);
  root.querySelectorAll('script,style,link,iframe,object,embed,form,meta,base,button,input,.smv-manual-save-actions,.horoscope-export-actions,.smv-horoscope-pay-gate').forEach(e=>e.remove());
  root.querySelectorAll('*').forEach(e=>{for(const a of [...e.attributes])if(/^on/i.test(a.name)||['href','xlink:href','srcset','action','formaction','contenteditable'].includes(a.name))e.removeAttribute(a.name);});
  // Human-reading-first print/PDF: optional technical evidence stays available on screen but is not expanded into the printed report.
  root.querySelectorAll('[data-print-technical="1"]').forEach(e=>e.remove());
  root.querySelectorAll('details').forEach(e=>{e.open=true;e.setAttribute('open','');});
  // V20: unwrap long-form <details> for reliable browser printing, but do not force
  // one semantic chapter onto one physical page. Natural pagination keeps pages dense
  // while the expanded prediction text supplies the actual report depth.
  root.querySelectorAll('details.smv-v16-longform,details.mm-v16-longform').forEach(d=>{
    const holder=document.createElement('div');
    holder.className='smv-v16-longform-print';
    [...d.childNodes].forEach(n=>{if(n.nodeType===1&&n.tagName==='SUMMARY')return;holder.appendChild(n);});
    d.replaceWith(holder);
  });
  const longPages=[...root.querySelectorAll('[data-smv-v16-page="1"]')];
  longPages.forEach((e,i)=>{e.dataset.smvPrintChapter=String(i+1);});
  root.dataset.smvLongChapterCount=String(longPages.length);
  const welcome=document.getElementById('smvMatchingWelcome');
  if(welcome){
   if(report.feature==='marriage_matching'){
    welcome.hidden=false;
    const bn=report.calculation?.bride?.birthName||report.calculation?.bride?.nativeName||String(report.name||'').split('/')[0]?.trim()||'Bride';
    const gn=report.calculation?.groom?.birthName||report.calculation?.groom?.nativeName||String(report.name||'').split('/')[1]?.trim()||'Groom';
    document.getElementById('smvWelcomeTitle').textContent=tamil?'ஸ்ரீ விநாயகர் அருள் வரவேற்பு':'Sri Vinayakar Blessing';
    document.getElementById('smvWelcomeMantra').textContent=tamil?'ஓம் கம் கணபதயே நமஹ':'Om Gam Ganapataye Namah';
    document.getElementById('smvWelcomeVerse').innerHTML=tamil?'வக்ரதுண்ட மஹாகாய<br>சூர்ய கோடி சமப்ரப<br>நிர்விக்னம் குருமே தேவ<br>சர்வ கார்யேஷு சர்வதா':'Vakratunda Mahakaya<br>Surya Koti Samaprabha<br>Nirvighnam Kurume Deva<br>Sarva Karyeshu Sarvada';
    document.getElementById('smvWelcomeMeaning').textContent=tamil?'வளைந்த துதிக்கையும் பெரும் திருமேனியும் உடைய விநாயகப் பெருமானே, கோடி சூரியர்களைப் போல் பிரகாசிப்பவரே, இந்த இரு ஜாதகத் திருமணப் பொருத்த ஆய்வில் தடைகளை நீக்கி தெளிவு, ஒற்றுமை மற்றும் நல்ல வழிகாட்டலை அருள்வாயாக.':'May Lord Vinayakar remove obstacles and bless this two-chart marriage compatibility study with clarity, harmony and auspicious guidance.';
    document.getElementById('smvWelcomeInvocation').textContent=tamil?'ஓம் ஸ்ரீ மதுரை வீரன் துணை':'Om Sri Madurai Veeran Thunai';
    document.getElementById('smvWelcomePair').textContent=`${bn}  ×  ${gn}`;
    welcome.classList.add('is-compact');
    root.prepend(welcome);
   }else welcome.hidden=true;
  }
  root.querySelectorAll('[hidden]').forEach(e=>e.hidden=false);
  root.querySelectorAll('.hidden').forEach(e=>e.classList.remove('hidden'));
  // The complete interactive Vimshottari tree can span many calculation-only pages. The new Dasha/Bhukti human reading carries the timing interpretation in print.
  const rawDasha=root.querySelector('#dashaTree');
  if(rawDasha){
    let prev=rawDasha.previousElementSibling;
    while(prev&&!prev.classList.contains('transit-before-vimsottari')){const x=prev.previousElementSibling;prev.remove();prev=x;}
    rawDasha.remove();
  }
  root.querySelectorAll('.smv-advanced-part').forEach(e=>e.classList.add('is-expanded'));
  root.querySelectorAll('[aria-expanded]').forEach(e=>e.setAttribute('aria-expanded','true'));
  root.querySelectorAll('.collapsed,.is-collapsed').forEach(e=>{e.classList.remove('collapsed','is-collapsed');e.classList.add('open','is-expanded');});
  root.querySelectorAll('.smv-v61-sub-body,.smv-advanced-part-content,.dasha-body,.dasha-content,.dasha-children,.smv-prediction-body,.prediction-body').forEach(e=>{e.hidden=false;e.style.display='block';e.style.maxHeight='none';e.style.height='auto';e.style.overflow='visible';});
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
