/* SMV ASTRO V343 — chart layout and CSP-safe PDF rendering are PRESENTATION ONLY.
 * No calculation, transit/dasha, nakshatra, payment, or matching engine changes.
 * Render from the already-calculated South chart DOM. Store a reversible original
 * in a <template> so saved reports keep their chosen chart in native print/PDF.
 */
(() => {
 'use strict';
 const ORDER=[11,0,1,2,10,null,null,3,9,null,null,4,8,7,6,5];
 const NORTH={1:[50,24],2:[28,9],3:[9,28],4:[24,50],5:[9,72],6:[28,91],7:[50,76],8:[72,91],9:[91,72],10:[76,50],11:[91,28],12:[72,9]};
 // Bengali/East chart: Aries at top centre, signs FIXED anti-clockwise.
 const EAST=[[50,16],[24,9],[9,24],[16,50],[9,76],[24,91],[50,84],[76,91],[91,76],[84,50],[91,24],[76,9]];
 const STYLE_KEY='smv-horoscope-chart-layout-v342';
 const safe=x=>['south','north','east'].includes(x)?x:'south';
 const isTa=()=>document.documentElement.lang==='ta'||document.body.classList.contains('tamil-mode');
 const isTamilReport=node=>{const root=node?.closest?.('#tamilHoroscopeResult,#englishHoroscopeResult');return root?root.id==='tamilHoroscopeResult':isTa();};
 const hindiNumber=value=>String(value).replace(/[0-9]/g,d=>'०१२३४५६७८९'[Number(d)]);
 const roman=['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
 const bhavaNumberText=(house,tamil)=>tamil?romanHouse(house):String(house);
 const bhavaNumberListText=(houses,tamil)=>houses.map(h=>bhavaNumberText(h,tamil)).join(' / ');
 const houseNumber=value=>{
  const raw=String(value??'').trim().toUpperCase();
  if(/^\d{1,2}$/.test(raw)){const n=Number(raw);return n>=1&&n<=12?n:0;}
  const index=roman.indexOf(raw);return index>=0?index+1:0;
 };
 const romanHouse=house=>roman[Number(house)-1]||'—';
 function normalizeSouthBhavaHouseLabels(chart){
  const tamil=isTamilReport(chart);
  for(const label of chart.querySelectorAll('.bhava-house-no')){
   const house=houseNumber(label.dataset.bhavaHouse)||houseNumber(label.textContent);
   if(house){label.dataset.bhavaHouse=String(house);label.textContent=bhavaNumberText(house,tamil);}
  }
 }
 function restoreRomanBhavaLabels(root){
  const chart=root?.querySelector('#bhavaChart');if(!chart)return;
  normalizeSouthBhavaHouseLabels(chart);
  const tamil=isTamilReport(root);
  for(const label of chart.querySelectorAll('.smv-v342-house-number[data-bhava-houses]')){
   const houses=label.dataset.bhavaHouses.split(',').map(houseNumber).filter(Boolean);
   label.textContent=bhavaNumberListText(houses,tamil);
  }
 }
 let choice='south';
 try{choice=safe(sessionStorage.getItem(STYLE_KEY));}catch(_){choice='south';}
 const forms=()=>[document.getElementById('englishChartStyle'),document.getElementById('tamilChartStyle')].filter(Boolean);
 function styleChoice(v){choice=safe(v);forms().forEach(e=>{e.value=choice;});try{sessionStorage.setItem(STYLE_KEY,choice);}catch(_){}return choice;}
 function createSvg(kind){
  const path=kind==='north'
   ?'<path d="M0 0L100 100M100 0L0 100M50 0L100 50L50 100L0 50Z"/>'
   :'<path d="M33.333 0V100M66.667 0V100M0 33.333H100M0 66.667H100M0 0L33.333 33.333M66.667 33.333L100 0M0 100L33.333 66.667M66.667 66.667L100 100"/>';
  return `<svg class="smv-v342-geometry" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><rect x=".35" y=".35" width="99.3" height="99.3" fill="none" stroke="#4c473e" stroke-width=".65"/>${path.replace('<path ','<path fill="none" stroke="#4c473e" stroke-width=".65" ')}</svg>`;
 }
 function sourceNode(chart){
  const t=chart.querySelector(':scope > template.smv-v342-south-original');
  if(t)return t;
  if(!chart.querySelector(':scope > .south-rasi-cell'))return null;
  const src=document.createElement('template');src.className='smv-v342-south-original';src.innerHTML=chart.innerHTML;
  return src;
 }
 function southCells(src){
  const d=document.createElement('div');d.innerHTML=src.innerHTML;
  const cells=[...d.children].filter(e=>e.classList.contains('south-rasi-cell'));
  if(cells.length!==12)return null;
  const out=Array(12),houses=Array(12),cusp=Array(12),bhavaSignByHouse=Array(13).fill(-1);
  let i=0;
  for(const si of ORDER){if(si==null)continue;const el=cells[i++];out[si]=el;
   houses[si]=el.querySelector('.dynamic-rasi-number')?.textContent?.trim()||'';
   const labels=[...el.querySelectorAll('.bhava-house-no')];
   cusp[si]=labels.map(label=>houseNumber(label.dataset.bhavaHouse)||houseNumber(label.textContent)).filter(n=>n>0);
   for(const label of labels){
    const house=houseNumber(label.dataset.bhavaHouse)||houseNumber(label.textContent);
    const explicitSign=Number(label.dataset.bhavaSign);
    if(house)bhavaSignByHouse[house]=Number.isInteger(explicitSign)&&explicitSign>=1&&explicitSign<=12?explicitSign-1:si;
   }
  }
  return {out,houses,cusp,bhavaSignByHouse};
 }

 function ascSign(chart,arr){
  if(chart.id==='transitChart'||chart.classList.contains('transit-chart')){
   // Transit Lagna is a rendered planet-flow glyph, not the natal .lagna node.
   // Read its source sign so North/East presentation can place the Transit chart.
   for(let si=0;si<12;si++)if(arr.out[si]?.querySelector('[data-transit-lagna]'))return si;
   return -1;
  }
  if(chart.id==='bhavaChart'){
   const i=arr.cusp.findIndex(c=>c.includes(1));if(i!==-1)return i;
   const d=chart.closest('#englishHoroscopeResult,#tamilHoroscopeResult');
   const r=d?.querySelector('#rasiChart template.smv-v342-south-original');
   const plain=r?(()=>{const fake=document.createElement('div');fake.innerHTML=r.innerHTML;return [...fake.querySelectorAll('.south-rasi-cell')];})():[];
   if(plain.length===12){const idx=plain.findIndex(e=>e.querySelector('.lagna'));if(idx>=0)return ORDER.filter(x=>x!==null)[idx];}
   return -1;
  }
  for(let si=0;si<12;si++)if(arr.out[si]?.querySelector('.lagna'))return si;
  return -1;
 }
 function pointCell(x,y,sign,house,source,style,kind,ta,planetEntries=null,bhavaHouseLabel=''){
  const cell=document.createElement('div');cell.className='smv-v342-cell';cell.dataset.sign=String(sign+1);
  const triangleCell=style==='north'?[2,3,5,6,8,9,11,12].includes(house):style==='east'?[2,3,5,6,8,9,11,12].includes(sign+1):false;
  if(triangleCell)cell.classList.add('smv-v342-triangle-cell');
  if(kind==='bhava')cell.classList.add('smv-v342-bhava-cell');
  if(house>=1&&house<=12)cell.dataset.house=String(house);
  // North Indian cells show the Rasi number in Devanagari, including Bhava:
  // the fixed North house slot identifies the Bhava, while this number names
  // the Sphuta Rasi occupying that slot. It is display-only and never moves a graha.
  if(style==='north'){
   const number=document.createElement('span');number.className='smv-v342-sign-number';
   number.textContent=hindiNumber(sign+1);
   number.setAttribute('aria-label','Rasi '+String(sign+1));
   cell.append(number);
  }
  // East Bhava groups distinct Bhava IDs under the actual Sphuta Rasi.
  if(kind==='bhava'&&style==='east'&&String(bhavaHouseLabel||'').trim()){
   const tamil=isTamilReport(cell);
   const houses=String(bhavaHouseLabel).split(/[\\/,]/).map(houseNumber).filter(Boolean);
   const label=document.createElement('span');label.className='smv-v342-house-number';
   label.dataset.bhavaHouses=houses.join(',');
   label.textContent=bhavaNumberListText(houses,tamil);
   label.setAttribute('aria-label','Bhava '+label.textContent);
   cell.append(label);
  }
  // The Lagna marker remains a separate display marker; no calculation changes.
  if(house===1&&kind!=='transit'){const mark=document.createElement('span');mark.className='smv-v342-asc';mark.textContent=ta?'ல':'As';cell.append(mark);}
  const contents=document.createElement('span');contents.className='smv-v342-planets';
  const items=planetEntries??[...source.out[sign].querySelectorAll('.planet-line')];
  const planetCount=kind==='transit'?items.filter(item=>!item.querySelector('[data-transit-lagna]')).length:items.length;
  cell.dataset.chartPlanetCount=String(planetCount);
  if(planetCount>=3)cell.classList.add('smv-chart-cell-compact');
  if(items.length){for(const item of items){contents.append(item.cloneNode(true));}}
  else if(kind==='transit'){
   // Keep the Transit empty-cell dash; Rasi/Navamsa/Bhava remain blank.
   const m=document.createElement('span');m.className='smv-v342-empty';m.textContent='—';contents.append(m);
  }
  cell.append(contents);return cell;
 }

 // Bhava Chalit may have multiple bhava cusps in one sign. The source Bhava
 // TABLE is the only reliable per-house assignment; never infer this from a
 // merged South sign cell. This is a read-only presentation conversion.
 const ZODIAC_TA=['மேஷம்','ரிஷபம்','மிதுனம்','கடகம்','சிம்மம்','கன்னி','துலாம்','விருச்சிகம்','தனுசு','மகரம்','கும்பம்','மீனம்'];
 const ZODIAC_EN=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
 const SHORT_TA={'சூரியன்':'சூ','சந்திரன்':'சந்','செவ்வாய்':'செ','புதன்':'பு','குரு':'கு','சுக்கிரன்':'சு','சனி':'ச','ராகு':'ரா','கேது':'கே','மாந்தி':'மா'};
 const SHORT_EN={'சூரியன்':'Su','சந்திரன்':'Mo','செவ்வாய்':'Ma','புதன்':'Me','குரு':'Ju','சுக்கிரன்':'Ve','சனி':'Sa','ராகு':'Ra','கேது':'Ke','மாந்தி':'Md',Sun:'Su',Moon:'Mo',Mars:'Ma',Mercury:'Me',Jupiter:'Ju',Venus:'Ve',Saturn:'Sa',Rahu:'Ra',Ketu:'Ke',Maandi:'Md'};
 function readBhavaTable(chart,ta){
  const root=chart.closest('#englishHoroscopeResult,#tamilHoroscopeResult,#printReport');
  const rows=[...(root?.querySelectorAll('.bhava-table tbody tr')||[])];
  if(rows.length!==12)return null;
  const byHouse=Array(13).fill(null);
  for(const row of rows){
   const td=row.querySelectorAll('td');if(td.length<6)return null;
   const h=houseNumber(td[0].textContent);if(!h||byHouse[h])return null;
   const text=td[4].textContent.trim(),z=ZODIAC_TA.findIndex(s=>text.includes(s));
   const sign=z>=0?z:ZODIAC_EN.findIndex(s=>text.toLowerCase().includes(s.toLowerCase()));
   if(sign<0)return null;
   const names=td[5].textContent.split(/[,;،]/).map(s=>s.trim()).filter(s=>s&&s!=='—'&&s!=='-');
   const planets=names.map(name=>{
    const line=document.createElement('span');line.className='planet-line';
    const glyph=document.createElement('span');glyph.className='planet-glyph';
    glyph.textContent=(ta?SHORT_TA[name]:SHORT_EN[name])||name;
    line.append(glyph);return line;
   });
   byHouse[h]={sign,planets};
  }
  return byHouse.slice(1).every(Boolean)?byHouse:null;
 }
 
 function render(chart,style){
  if(style==='south'){
   const src=chart.querySelector(':scope > template.smv-v342-south-original');
   if(src)chart.innerHTML=src.innerHTML;
   // Apply the Roman display labels even on the first/default South render,
   // when no alternate-layout source template has been created yet.
   normalizeSouthBhavaHouseLabels(chart);
   chart.classList.remove('smv-v342-north','smv-v342-east');
   chart.dataset.smvChartStyle='south';
   return;
  }
  if(chart.dataset.smvChartStyle===style&&chart.querySelector(':scope > template.smv-v342-south-original')&&chart.querySelector(':scope > .smv-v342-geometry'))return;
  const src=sourceNode(chart);if(!src)return;
  const from=southCells(src);if(!from)return;
  const kind=chart.id==='bhavaChart'?'bhava':chart.id==='navamsaChart'?'d9':chart.id==='rasiChart'?'d1':'transit';
  const bhavaRows=kind==='bhava'?readBhavaTable(chart,isTa()):null;
  // Bhava house placement comes from Bhava Table / cusp mappings, never from
  // Lagna. Requiring a Lagna here made North/East silently remain South.
  const lagna=kind==='bhava'?-1:ascSign(chart,from);
  if(kind!=='bhava'&&lagna<0)return; // Never infer an unknown Rasi/Navamsa/Transit Lagna.
  if(kind==='bhava'&&style==='north'&&!bhavaRows){
   // The source Bhava chart already contains each house label beside its
   // calculated Sphuta Rasi. Multiple houses may share one Rasi; retain all
   // twelve North positions instead of abandoning the requested chart style.
   const mapped=new Set(from.cusp.flat());
   if(roman.some((_,index)=>!mapped.has(index+1))){
    chart.dataset.smvV343BhavaFallback='incomplete-source-house-map';
    if(chart.querySelector(':scope > template.smv-v342-south-original'))render(chart,'south');
    return;
   }
  }
  const bhavaHousesBySign=Array.from({length:12},()=>[]);
  const bhavaPlanetsBySign=Array.from({length:12},()=>[]);
  const bhavaSignByHouse=Array(13).fill(-1);
  if(kind==='bhava'){
   // Use the calculated Bhava-to-Sphuta-Rasi metadata carried by the original
   // source labels. The Bhava Table fills only missing values in older snapshots.
   for(let sign=0;sign<12;sign++){
    for(const house of from.cusp[sign]||[]){
     const explicit=from.bhavaSignByHouse?.[house];
     const mapped=Number.isInteger(explicit)&&explicit>=0&&explicit<12?explicit:sign;
     if(bhavaSignByHouse[house]===-1){
      bhavaSignByHouse[house]=mapped;
      bhavaHousesBySign[mapped].push(house);
     }
    }
    bhavaPlanetsBySign[sign]=[...(from.out[sign]?.querySelectorAll('.planet-line')||[])];
   }
   if(bhavaRows){
    for(let house=1;house<=12;house++){
     const row=bhavaRows[house];
     if(bhavaSignByHouse[house]===-1){
      bhavaSignByHouse[house]=row.sign;
      bhavaHousesBySign[row.sign].push(house);
     }
    }
    for(let sign=0;sign<12;sign++){
     if(!bhavaPlanetsBySign[sign].length&&bhavaHousesBySign[sign].length){
      bhavaPlanetsBySign[sign]=bhavaHousesBySign[sign].flatMap(house=>bhavaRows[house]?.planets||[]);
     }
    }
   }
  }
  const table=document.createElement('template');table.className='smv-v342-south-original';table.innerHTML=src.innerHTML;
  const ta=isTa(),frame=document.createElement('div');frame.innerHTML=createSvg(style);
  chart.replaceChildren(table,frame.firstElementChild);
  chart.classList.remove('smv-v342-north','smv-v342-east');chart.classList.add('smv-v342-'+style);
  chart.dataset.smvChartStyle=style;
  chart.setAttribute('aria-label',`${kind.toUpperCase()} — ${style==='north'?'North Indian':'East Indian'} chart`);
  if(style==='east'){
   for(let sign=0;sign<12;sign++){
    const house=kind==='bhava'?0:(sign-lagna+12)%12+1;
    const [x,y]=EAST[sign];
    const planets=kind==='bhava'?bhavaPlanetsBySign[sign]:null;
    const bhavaLabel=kind==='bhava'?bhavaHousesBySign[sign].join(' / '):'';
    chart.append(pointCell(x,y,sign,house,from,style,kind,ta,planets,bhavaLabel));
   }
  }else{
   for(let house=1;house<=12;house++){
    const bhava=kind==='bhava'?bhavaRows?.[house]:null;
    const sign=kind==='bhava'?(bhavaSignByHouse[house]>=0?bhavaSignByHouse[house]:(bhava?.sign??-1)):(lagna+house-1)%12;
    if(sign<0)continue;
    let planetEntries=null;
    if(kind==='bhava'){
     const sourceLines=[...(from.out[sign]?.querySelectorAll('.planet-line')||[])];
     const hasHouseAssignments=sourceLines.some(line=>line.hasAttribute('data-bhava-house'));
     planetEntries=hasHouseAssignments
      ?sourceLines.filter(line=>houseNumber(line.dataset.bhavaHouse)===house)
      :(bhava?.planets||((from.cusp[sign]?.length===1)?sourceLines:[]));
    }
    const [x,y]=NORTH[house];
    chart.append(pointCell(x,y,sign,house,from,style,kind,ta,planetEntries,''));
   }
  }
  if(style==='east'){
   const title=document.createElement('div');title.className='smv-v342-east-center';
   title.textContent=kind==='d9'?(ta?'நவாம்சம்':'Navamsa'):kind==='bhava'?(ta?'பாவம்':'Bhava'):kind==='transit'?(ta?'கோச்சாரம்':'Transit'):(ta?'ராசி':'Rasi');
   chart.append(title);
  }
  markBlackPlanetText(chart,style,kind);
 }
 function markBlackPlanetText(chart,style,kind){
  if(!['north','east'].includes(style)||!['d1','d9','bhava'].includes(kind))return;
  const isBlack=color=>{
   const values=(color.match(/[0-9.]+/g)||[]).map(Number);
   return values.length>=3&&values.slice(0,3).every(value=>value<=72);
  };
  for(const glyph of chart.querySelectorAll('.smv-v342-planets .planet-glyph')){
   if(isBlack(getComputedStyle(glyph).color))glyph.classList.add('smv-v342-black-planet-text');
  }
 }
 function apply(root,style=choice){
  if(!root)return;
  const charts=[...root.querySelectorAll('#rasiChart,#navamsaChart,#bhavaChart,.south-indian-chart.transit-chart')];
  for(const c of charts)try{render(c,style);}catch(e){console.warn('V342 chart presentation unavailable; calculation unchanged',e);}
  root.dataset.smvChartStyle=style;
 }
 const roots=()=>['tamilHoroscopeResult','englishHoroscopeResult'].map(id=>document.getElementById(id)).filter(Boolean);
 function updateAll(v){styleChoice(v);roots().forEach(r=>apply(r));}
 function start(){
  styleChoice(choice);
  for(const el of forms())el.addEventListener('change',e=>updateAll(e.currentTarget.value));
  // Run synchronously before Saved Reports takes its HTML snapshot.
  window.addEventListener('smv:report-ready',e=>{if(e.detail?.feature==='advanced_analysis')apply(e.detail?.root,choice);});
  window.addEventListener('smv-language',()=>{
   forms().forEach(x=>x.value=choice);
   roots().forEach(restoreRomanBhavaLabels);
  });
  // Apply chosen layout to saved V342 snapshots as well; source chart HTML
  // is preserved inside the template, and Bhava uses the printed Bhava Table.
  const preparePrint=root=>{
    if(!root)return;
    const selected=root.querySelector('#rasiChart')?.dataset.smvChartStyle||root.dataset.smvChartStyle||'south';
    apply(root,safe(selected));
  };
  window.SMVChartPresentationV342=Object.freeze({getStyle:()=>choice,setStyle:updateAll,apply,preparePrint});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
