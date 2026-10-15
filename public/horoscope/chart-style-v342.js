/* SMV ASTRO V342 — chart layout is PRESENTATION ONLY.
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
 const roman=['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
 let choice='south';
 try{choice=safe(sessionStorage.getItem(STYLE_KEY));}catch(_){choice='south';}
 const forms=()=>[document.getElementById('englishChartStyle'),document.getElementById('tamilChartStyle')].filter(Boolean);
 function styleChoice(v){choice=safe(v);forms().forEach(e=>{e.value=choice;});try{sessionStorage.setItem(STYLE_KEY,choice);}catch(_){}return choice;}
 function createSvg(kind){
  const path=kind==='north'
   ?'<path d="M0 0L100 100M100 0L0 100M50 0L100 50L50 100L0 50Z"/>'
   :'<path d="M33.333 0V100M66.667 0V100M0 33.333H100M0 66.667H100M0 0L33.333 33.333M66.667 33.333L100 0M0 100L33.333 66.667M66.667 66.667L100 100"/>';
  return `<svg class="smv-v342-geometry" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><rect x=".35" y=".35" width="99.3" height="99.3"/>${path}</svg>`;
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
  const out=Array(12),houses=Array(12),cusp=Array(12);
  let i=0;
  for(const si of ORDER){if(si==null)continue;const el=cells[i++];out[si]=el;
   houses[si]=el.querySelector('.dynamic-rasi-number')?.textContent?.trim()||'';
   cusp[si]=[...el.querySelectorAll('.bhava-house-no')].map(n=>roman.indexOf(n.textContent.trim())+1).filter(n=>n>0);
  }
  return {out,houses,cusp};
 }
 function ascSign(chart,arr){
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
 function pointCell(x,y,sign,house,source,style,kind,ta){
  const cell=document.createElement('div');cell.className='smv-v342-cell';cell.dataset.sign=String(sign+1);
  if(house>=1&&house<=12)cell.dataset.house=String(house);
  cell.style.left=x+'%';cell.style.top=y+'%';
  const number=document.createElement('span');number.className='smv-v342-sign-number';number.textContent=String(sign+1);cell.append(number);
  if(style==='east'){
   const h=document.createElement('span');h.className='smv-v342-house-number';h.textContent=kind==='bhava'?source.cusp[sign].map(i=>roman[i-1]).join('/'):house?String(house):'';
   cell.append(h);
  }
  if(house===1){const mark=document.createElement('span');mark.className='smv-v342-asc';mark.textContent=ta?'ல':'As';cell.append(mark);}
  const contents=document.createElement('span');contents.className='smv-v342-planets';
  const items=[...source.out[sign].querySelectorAll('.planet-line')];
  if(items.length){for(const item of items){contents.append(item.cloneNode(true));}}
  else {const m=document.createElement('span');m.className='smv-v342-empty';m.textContent='—';contents.append(m);}
  cell.append(contents);return cell;
 }
 function render(chart,style){
  if(style==='south'){
   const src=chart.querySelector(':scope > template.smv-v342-south-original');
   if(src){chart.innerHTML=src.innerHTML;chart.classList.remove('smv-v342-north','smv-v342-east');chart.dataset.smvChartStyle='south';}
   return;
  }
  if(chart.dataset.smvChartStyle===style&&chart.querySelector(':scope > template.smv-v342-south-original')&&chart.querySelector(':scope > .smv-v342-geometry'))return;
  const src=sourceNode(chart);if(!src)return;
  const from=southCells(src);if(!from)return;
  const lagna=ascSign(chart,from);if(lagna<0)return; // Never infer an unknown Lagna.
  const kind=chart.id==='bhavaChart'?'bhava':chart.id==='navamsaChart'?'d9':chart.id==='rasiChart'?'d1':'transit';
  if(kind==='bhava'&&style==='north'){
   // In Bhava Chalit two house cusps may occupy one sign, or one cusp may
   // be missing from a sign; the South chart then cannot tell which planet
   // belongs to which of those houses. Keep the exact Bhava diagram instead
   // of silently misassigning planets to fixed North houses.
   if(from.cusp.some(v=>v.length!==1)){
    chart.dataset.smvV342BhavaFallback='1';
    if(chart.querySelector(':scope > template.smv-v342-south-original'))render(chart,'south');
    return;
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
    const house=(sign-lagna+12)%12+1;
    const [x,y]=EAST[sign];chart.append(pointCell(x,y,sign,house,from,style,kind,ta));
   }
  }else{
   for(let house=1;house<=12;house++){
    const sign=kind==='bhava'?from.cusp.findIndex(c=>c.includes(house)):(lagna+house-1)%12;
    if(sign<0)continue;
    const [x,y]=NORTH[house];chart.append(pointCell(x,y,sign,house,from,style,kind,ta));
   }
  }
  if(style==='east'){
   const title=document.createElement('div');title.className='smv-v342-east-center';
   title.textContent=kind==='d9'?(ta?'நவாம்சம்':'Navamsa'):kind==='bhava'?(ta?'பாவம்':'Bhava'):kind==='transit'?(ta?'கோச்சாரம்':'Transit'):(ta?'ராசி':'Rasi');
   chart.append(title);
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
  window.addEventListener('smv-language',()=>{forms().forEach(x=>x.value=choice);});
  window.SMVChartPresentationV342=Object.freeze({getStyle:()=>choice,setStyle:updateAll,apply});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
