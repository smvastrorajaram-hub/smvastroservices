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

  // V224: Marriage Matching gets a dynamic premium first page. The richer devotional
  // scene replaces the plain single-Ganesha artwork while keeping both birth identities.
  const cover=document.querySelector('.smv-print-cover');
  if(cover&&report.feature==='marriage_matching'){
   const h=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
   const monthsEn=['January','February','March','April','May','June','July','August','September','October','November','December'];
   const monthsTa=['ஜனவரி','பிப்ரவரி','மார்ச்','ஏப்ரல்','மே','ஜூன்','ஜூலை','ஆகஸ்ட்','செப்டம்பர்','அக்டோபர்','நவம்பர்','டிசம்பர்'];
   const fmtDate=v=>{const m=String(v||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return String(v||'—');const y=+m[1],mo=+m[2],d=+m[3];return tamil?`${String(d).padStart(2,'0')} ${monthsTa[mo-1]||''}, ${y}`:`${String(d).padStart(2,'0')} ${monthsEn[mo-1]||''}, ${y}`;};
   const c=report.calculation||{},br=c.bride||{},gr=c.groom||{};
   const person=(x,fallback)=>{const b=x.birth||{};return {name:x.birthName||x.nativeName||fallback,date:fmtDate(b.date||x.birthDate||''),time:b.time||x.birthTime||'—',place:x.birthPlace||b.place||b.placeName||'—'};};
   const B=person(br,tamil?'பெண்':'Bride'),G=person(gr,tamil?'ஆண்':'Groom');
   const labelDate=tamil?'பிறந்த தேதி':'Date of Birth',labelTime=tamil?'நேரம்':'Time',labelPlace=tamil?'பிறந்த இடம்':'Place of Birth';
   const personCard=(who,x)=>`<section class="smv-matching-cover-person"><h3>${h(who)} · ${h(x.name)}</h3><div><b>${h(labelDate)}</b><span>:</span><em>${h(x.date)}</em><b>${h(labelTime)}</b><span>:</span><em>${h(x.time)}</em><b>${h(labelPlace)}</b><span>:</span><em>${h(x.place)}</em></div></section>`;
   cover.classList.add('smv-matching-cover');
   cover.setAttribute('aria-label',tamil?'SMV ASTRO திருமணப் பொருத்த அறிக்கை':'SMV ASTRO Marriage Matching Report');
   cover.innerHTML=`<div class="smv-matching-cover-frame">
    <div class="smv-matching-cover-kicker">SRI MADURAVEERAYAH ASTRO SERVICES</div>
    <div class="smv-matching-cover-brand">SMV ASTRO SERVICES</div>
    <div class="smv-matching-cover-title">${tamil?'திருமணப் பொருத்த அறிக்கை':'Marriage Matching Report'}</div>
    <img class="smv-matching-cover-scene" src="assets/smv-devotional-scene-v224.webp?v=224" alt="Sri Vinayagar, Sri Madurai Veerayah, Bommi, Vellaiyammal and Sri Murugan devotional scene">
    <div class="smv-matching-cover-people">${personCard(tamil?'பெண்':'Bride',B)}${personCard(tamil?'ஆண்':'Groom',G)}</div>
    <div class="smv-matching-cover-pair"><strong>${h(B.name)} × ${h(G.name)}</strong><span>${tamil?'இரு ஜாதக வேத ஜோதிட பொருத்த ஆய்வு':'Two-horoscope Vedic astrology compatibility review'}</span></div>
    <div class="smv-matching-cover-contact">
      <span><img src="assets/web-black.svg" alt="">www.smvastroservices.in</span>
      <span><img src="assets/phone-black.svg" alt="">6381171084</span>
      <span><img src="assets/whatsapp-black.svg" alt="">8072973399</span>
      <span><img src="assets/email-black.svg" alt="">smvastroservices@gmail.com</span>
    </div>
   </div>`;
  }

  back.textContent=tamil?'திரும்புக':'Back';
  button.textContent=tamil?'அச்சிட / PDF சேமிக்க':'Print / Save as PDF';
  const root=document.getElementById('printReport');root.innerHTML=html;
  root.querySelectorAll('script,style,link,iframe,object,embed,form,meta,base,button,input,.smv-manual-save-actions,.horoscope-export-actions,.smv-horoscope-pay-gate').forEach(e=>e.remove());
  root.querySelectorAll('*').forEach(e=>{for(const a of [...e.attributes])if(/^on/i.test(a.name)||['href','xlink:href','srcset','action','formaction','contenteditable'].includes(a.name))e.removeAttribute(a.name);});
  root.querySelectorAll('details').forEach(e=>{e.open=true;e.setAttribute('open','');});
  root.querySelectorAll('[hidden]').forEach(e=>e.hidden=false);
  root.querySelectorAll('.hidden').forEach(e=>e.classList.remove('hidden'));
  root.querySelectorAll('.dasha-node').forEach(e=>e.classList.add('open'));
  root.querySelectorAll('.smv-advanced-part').forEach(e=>e.classList.add('is-expanded'));
  root.querySelectorAll('[aria-expanded]').forEach(e=>e.setAttribute('aria-expanded','true'));
  root.querySelectorAll('.collapsed,.is-collapsed').forEach(e=>{e.classList.remove('collapsed','is-collapsed');e.classList.add('open','is-expanded');});
  root.querySelectorAll('.smv-v61-sub-body,.smv-advanced-part-content,.dasha-body,.dasha-content,.dasha-children,.smv-prediction-body,.prediction-body').forEach(e=>{e.hidden=false;e.style.display='block';e.style.maxHeight='none';e.style.height='auto';e.style.overflow='visible';});

  // V224 Marriage Matching print flow:
  // 1) remove the old full-page Vinayagar welcome/prayer sheet from legacy saved snapshots;
  // 2) place one compact Vinayagar Vanakkam at the top of the first result page;
  // 3) continue the matching result immediately below it without another page break.
  if(report.feature==='marriage_matching'){
   const mantraRe=/(Om\s*Gam\s*Ganapataye|Vakratunda|Nirvighnam|Sarva\s*Karyeshu|ஓம்\s*கம்\s*கணபதயே|வக்ரதுண்ட|நிர்விக்னம்|சர்வ\s*கார்யேஷு)/i;
   const resultRe=/(Nakshatra\s+Porutham|Dasa\s+Porutham|Marriage\s+Matching|Birth\s+details|நட்சத்திர.*பொருத்த|தசப்\s*பொருத்த|திருமணப்\s*பொருத்த|பிறப்பு\s+விவரங்கள்)/i;
   const all=[...root.querySelectorAll('section,article,div')];
   const candidates=all.filter(el=>{
    if(el.classList.contains('smv-matching-vinayagar-intro'))return false;
    const tx=(el.textContent||'').replace(/\s+/g,' ').trim();
    if(!tx||tx.length>1800||!mantraRe.test(tx))return false;
    if(el.querySelector('table,.mm-person-result,.mm-full-results'))return false;
    // A legacy standalone prayer page may mention the report/couple names, but it must not contain result sections.
    return !resultRe.test(tx.replace(/Marriage\s+Matching/ig,''));
   });
   const set=new Set(candidates);
   const topCandidates=candidates.filter(el=>{let p=el.parentElement;while(p&&p!==root){if(set.has(p))return false;p=p.parentElement;}return true;});
   topCandidates.forEach(el=>el.remove());

   const host=root.querySelector('.mm-full-results')||root;
   host.querySelector(':scope > .smv-matching-vinayagar-intro')?.remove();
   const prayer=document.createElement('section');
   prayer.className='smv-matching-vinayagar-intro';
   prayer.setAttribute('aria-label',tamil?'ஸ்ரீ விநாயகர் வணக்கம்':'Sri Vinayakar Vanakkam');
   prayer.innerHTML=`<img class="smv-matching-vinayagar-img" src="assets/vinayagar-report.png" alt="Lord Vinayagar">
    <h2>${tamil?'ஸ்ரீ விநாயகர் வணக்கம்':'Sri Vinayakar Vanakkam'}</h2>
    <div class="smv-matching-vinayagar-mantra">${tamil?'ஓம் கம் கணபதயே நமஹ':'Om Gam Ganapataye Namah'}</div>
    <div class="smv-matching-vinayagar-sloka">${tamil?'வக்ரதுண்ட மஹாகாய<br>சூர்ய கோடி சமப்ரப<br>நிர்விக்னம் குருமே தேவ<br>சர்வ கார்யேஷு சர்வதா':'Vakratunda Mahakaya<br>Surya Koti Samaprabha<br>Nirvighnam Kurume Deva<br>Sarva Karyeshu Sarvada'}</div>
    <p>${tamil?'இந்த இரு ஜாதக திருமணப் பொருத்த ஆய்வில் தடைகளை நீக்கி, தெளிவு, ஒற்றுமை மற்றும் நல்ல வழிகாட்டலை அருள்வாயாக.':'May Lord Vinayagar remove obstacles and bless this two-horoscope marriage compatibility review with clarity, harmony and good guidance.'}</p>
    <div class="smv-matching-invocation">${tamil?'ஓம் ஸ்ரீ மதுரை வீரன் துணை':'Om Sri Madurai Veeran Thunai'}</div>`;
   host.insertBefore(prayer,host.firstChild);
  }
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
