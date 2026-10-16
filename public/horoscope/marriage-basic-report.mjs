/* SMV ASTRO — factual two-person Marriage Matching calculation report.
 * Reuses natal Swiss results, the existing Advanced Vargas/BAV/SAV/Shadbala
 * and the selected-date offline transit calculation. No invented values.
 * Output is static HTML suitable for the existing Save/Print snapshot pipeline.
 */
import {vargaSign} from './offline/astro_advanced.browser.mjs';
import {offsetMinutesAt} from './offline/places/timezone.mjs';
const SIGNS_EN=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const SIGNS_TA=['மேஷம்','ரிஷபம்','மிதுனம்','கடகம்','சிம்மம்','கன்னி','துலாம்','விருச்சிகம்','தனுசு','மகரம்','கும்பம்','மீனம்'];
const P_EN=['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu'];
const P_TA=['சூரியன்','சந்திரன்','செவ்வாய்','புதன்','குரு','சுக்கிரன்','சனி','ராகு','கேது'];
const NAK_EN=['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishta','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati'];
const NAK_TA=['அசுவினி','பரணி','கார்த்திகை','ரோகிணி','மிருகசீரிடம்','திருவாதிரை','புனர்பூசம்','பூசம்','ஆயில்யம்','மகம்','பூரம்','உத்திரம்','ஹஸ்தம்','சித்திரை','சுவாதி','விசாகம்','அனுஷம்','கேட்டை','மூலம்','பூராடம்','உத்திராடம்','திருவோணம்','அவிட்டம்','சதயம்','பூரட்டாதி','உத்திரட்டாதி','ரேவதி'];
const SOUTH=[11,0,1,2,10,null,null,3,9,null,null,4,8,7,6,5];
const esc=x=>String(x??'—').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
const signIndex=v=>Math.floor((((Number(v)%360)+360)%360)/30);
const safeStyle=s=>['south','north','east'].includes(s)?s:'south';
const name=(s,ta)=>{const j=P_TA.findIndex((p,i)=>p===s||P_EN[i].toLowerCase()===String(s||'').toLowerCase());return j<0?String(s||'—'):(ta?P_TA:P_EN)[j]};
const sign=(i,ta)=>(ta?SIGNS_TA:SIGNS_EN)[(i+12)%12];
const localizedSign=(value,ta)=>{
 const idx=SIGNS_EN.findIndex((x,i)=>x.toLowerCase()===String(value||'').toLowerCase()||SIGNS_TA[i]===value);
 return idx<0?String(value||'—'):sign(idx,ta);
};
const nak=(p,ta)=>{
 if(finite(p?.longitude)){
  const idx=Math.min(26,Math.floor((((Number(p.longitude)%360)+360)%360)/(360/27)));
  return (ta?NAK_TA:NAK_EN)[idx];
 }
 const v=String(p?.nakshatra||'');
 const idx=NAK_EN.findIndex((x,i)=>x.toLowerCase()===v.toLowerCase()||NAK_TA[i]===v);
 return idx>=0?(ta?NAK_TA:NAK_EN)[idx]:v||'—';
};
const pada=p=>finite(p?.longitude)?Math.min(4,Math.floor(((((Number(p.longitude)%360)+360)%360)%(360/27))/(360/108))+1):(p?.pada||'—');
const val=(n,d=2)=>finite(n)?Number(n).toFixed(d):'—';
const numLabel=(n,ta)=>ta?String(n):String(n);
const title=(en,ta,lang)=>lang==='ta'?ta:en;
const tr=(a)=>'<tr>'+a.map(x=>'<td>'+esc(x)+'</td>').join('')+'</tr>';
const table=(head,rows,extra='')=>'<div class="mm-base-scroll"><table class="mm-base-table '+extra+'"><thead><tr>'+head.map(x=>'<th>'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+rows.join('')+'</tbody></table></div>';
const heading=(en,ta,lang)=>'<h4>'+esc(title(en,ta,lang))+'</h4>';
function chart(caption,planets,lagnaSign,style,ta,mode,bhavas=[]){
 const kind=safeStyle(style),bhava=mode==='bhava';
 const bySign=Array.from({length:12},()=>[]),byHouse=Array.from({length:12},()=>[]);
 const housesBySign=Array.from({length:12},()=>[]);
 const short=raw=>{
  const i=P_TA.findIndex((t,n)=>t===raw||P_EN[n].toLowerCase()===String(raw||'').toLowerCase());
  return i<0?String(raw||'').slice(0,3):(ta?['சூ','சந்','செ','பு','கு','சுக்','சனி','ரா','கே']:['Su','Mo','Ma','Me','Ju','Ve','Sa','Ra','Ke'])[i];
 };
 const validAsc=Number.isInteger(lagnaSign)&&lagnaSign>=0&&lagnaSign<12;
 const hSign=h=>{
  const d=bhavas?.[h-1];
  if(finite(d?.madhyaLongitude))return signIndex(d.madhyaLongitude);
  return validAsc?(lagnaSign+h-1)%12:h-1;
 };
 if(bhava){
  for(let h=1;h<=12;h++)housesBySign[hSign(h)].push(h);
 }
 for(const p of planets||[]){
  const code=short(p?.name??p?.planet);
  if(!code)continue;
  if(bhava){
   const h=Number(p?.bhava);
   if(Number.isInteger(h)&&h>=1&&h<=12){
    byHouse[h-1].push(code);
    bySign[hSign(h)].push(code);
   }
  }else if(finite(p?.longitude)){
   bySign[signIndex(p.longitude)].push(code);
  }
 }
 if(validAsc){
  if(bhava){
   byHouse[0].unshift(ta?'லக்':'As');
   bySign[hSign(1)].unshift(ta?'லக்':'As');
  }else if(mode!=='transit'){
   bySign[lagnaSign].unshift(ta?'லக்':'As');
  }
 }
 const cell=(position,tokens,identifier='')=>'<div class="mm-base-cell mm-base-pos-'+position+'">'+
  (identifier?'<span class="mm-base-index">'+esc(identifier)+'</span>':'')+
  '<span class="mm-base-planets">'+tokens.map(v=>'<span class="mm-base-planet">'+esc(v)+'</span>').join('')+'</span></div>';
 const kindCells=kind==='north'
  ?Array.from({length:12},(_,i)=>{
    const h=i+1,s=validAsc?(lagnaSign+i)%12:i;
    return cell(i,bhava?byHouse[i]:bySign[s],String(s+1));
   }).join('')
  :Array.from({length:12},(_,i)=>{
    const houseLabels=bhava?housesBySign[i].join(','):'';
    return cell(i,bySign[i],houseLabels);
   }).join('');
 const southLines='M25 0V100 M75 0V100 M0 25H100 M0 75H100 M0 50H25 M75 50H100 M50 0V25 M50 75V100';
 const northLines='M0 0L100 100 M100 0L0 100 M50 0L100 50L50 100L0 50Z';
 const eastLines='M33.333 0V100 M66.667 0V100 M0 33.333H100 M0 66.667H100 M0 0L33.333 33.333 M66.667 33.333L100 0 M0 100L33.333 66.667 M66.667 66.667L100 100';
 const lines=kind==='south'?southLines:kind==='north'?northLines:eastLines;
 const svg='<svg class="mm-base-geometry" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><rect x=".5" y=".5" width="99" height="99"/><path d="'+lines+'"/></svg>';
 return '<div class="mm-base-chart-wrap" data-chart-mode="'+esc(mode)+'"><h4>'+esc(caption)+'</h4><div class="mm-base-chart mm-base-'+kind+'" data-chart-style="'+kind+'">'+svg+kindCells+'</div></div>';
}
function tablePlanetRows(ps,ta,lagna){
 let out=[];
 if(finite(lagna))out.push(tr([ta?'லக்னம்':'Ascendant',sign(signIndex(lagna),ta),val((lagna%30+30)%30,4),nak({longitude:lagna},ta),pada({longitude:lagna}),1]));
 for(const p of ps||[])out.push(tr([name(p.name??p.planet,ta),finite(p.longitude)?sign(signIndex(p.longitude),ta):localizedSign(p.rasi,ta),p.degree||val(((Number(p.longitude)||0)%30),4),nak(p,ta),pada(p),p.bhava??'—']));
 return out;
}
function dataBlock(chartResult,ta){
 const c=chartResult;
 const h=ta?['கிரகம்','ராசி','பாகை','நட்சத்திரம்','பாதம்','பாவம்']:['Planet','Sign','Degree','Nakshatra','Pada','House'];
 return table(h,tablePlanetRows(c.planets,ta,c.lagna?.longitude));
}
function houseTable(c,ta){
 const source=Array.isArray(c.bhavas)?c.bhavas:Array.isArray(c.bhavaDetails)?c.bhavaDetails:[];
 const byHouse=Array.from({length:12},(_,i)=>{
  const h=i+1,detail=source[i]||{},occupants=(c.planets||[]).filter(p=>p.bhava===h).map(p=>name(p.name,ta)).join(', ');
  return tr([h,detail.rasi?localizedSign(detail.rasi,ta):sign((signIndex(c.lagna?.longitude)+i)%12,ta),detail.arambha||detail.degree||'—',detail.madhya||'—',detail.antyaDegree||detail.antya||'—',occupants||'—']);
 });
 return table(ta?['பாவம்','ராசி','ஆரம்பம்','மத்திமம்','முடிவு','கிரகங்கள்']:['House','Sign','Start','Midpoint','End','Planets'],byHouse);
}
function vargaFor(c,d){return (c?.advanced?.vargas||[]).find(x=>x.division==='D-'+d)||null;}
function vargaTable(c,d,ta){
 const v=vargaFor(c,d);if(!v||!Array.isArray(v.planets))return '<p class="mm-base-unavailable">'+(ta?'கணக்கீட்டுத் தரவு கிடைக்கவில்லை':'Calculated data unavailable')+'</p>';
 return table(ta?['கிரகம்','ராசி','பாகை','நட்சத்திரம்','பாதம்']:['Planet','Sign','Degree','Nakshatra','Pada'],v.planets.map(p=>tr([name(p.planet,ta),finite(p.longitude)?sign(signIndex(p.longitude),ta):localizedSign(p.rasi,ta),p.degree||'—',nak(p,ta),pada(p)])));
}
function ashtakavarga(c,ta){
 const av=c?.advanced?.ashtakavarga;if(!av?.bhinna||!Array.isArray(av.sarva))return '<p class="mm-base-unavailable">'+(ta?'கணக்கீட்டுத் தரவு கிடைக்கவில்லை':'Calculated data unavailable')+'</p>';
 const head=[ta?'ராசி':'Sign',...av.bhinna.map(p=>name(p.planet,ta)),ta?'சர்வாஷ்டகவர்க்கம்':'SAV'];
 const rows=Array.from({length:12},(_,i)=>tr([sign(i,ta),...av.bhinna.map(p=>p.bindus?.[i]??'—'),av.sarva[i]]));
 rows.push(tr([ta?'மொத்தம்':'Total',...av.bhinna.map(p=>p.total??'—'),av.sarvaTotal??'—']));
 return table(head,rows,'mm-base-av');
}
function shadbala(c,ta){
 const ps=(c?.planets||[]).filter(p=>p?.strength3?.available);
 if(!ps.length)return '<p class="mm-base-unavailable">'+(ta?'கணக்கீட்டுத் தரவு கிடைக்கவில்லை':'Calculated data unavailable')+'</p>';
 const h1=ta?['கிரகம்','ஸ்தான','திக்','கால','சேஷ்டா','நைசர்கிக','திருக்']:['Planet','Sthana','Dig','Kala','Cheshta','Naisargika','Drik'];
 const h2=ta?['கிரகம்','மொத்த விரூபம்','ரூபம்','தேவை','விகிதம்']:['Planet','Total Virupa','Rupa','Required','Ratio'];
 const part1=ps.map(p=>{
  const x=p.strength3,a=x.components||{};
  return tr([name(p.name,ta),val(a.sthana?.total),val(a.dig),val(a.kala?.total),val(a.cheshta),val(a.naisargika),val(a.drik)]);
 });
 const part2=ps.map(p=>{
  const x=p.strength3;
  return tr([name(p.name,ta),val(x.totalVirupa),val(x.totalRupa,3),val(x.requiredVirupa),val(x.ratio,3)]);
 });
 // Two complete, aligned tables prevent single Tamil letters in 11 narrow columns.
 return table(h1,part1,'mm-base-shad-components')+table(h2,part2,'mm-base-shad-total');
}
function dasha(c,ta,ref){
 const from=String(ref||new Date().toISOString().slice(0,10));
 const to=String(Number(from.slice(0,4))+15)+from.slice(4);
 const md=c?.dashas?.periods||c?.dashas?.mahadashas||[];
 const rows=[];
 for(const p of md){
  if(String(p.end||'')<from||String(p.start||'')>to)continue;
  const major=name(p.lord||p.name,ta);
  rows.push(tr([major,ta?'மகாதசை':'Mahadasha','—',p.start||'—',p.end||'—']));
  for(const x of p.antardashas||p.bhuktis||p.subPeriods||[]){
   if(String(x.end||'')<from||String(x.start||'')>to)continue;
   rows.push(tr([major,ta?'புக்தி':'Bhukti',name(x.lord||x.name,ta),x.start||'—',x.end||'—']));
  }
 }
 return rows.length?table(ta?['தசா','கால வகை','புக்தி','தொடக்கம்','முடிவு']:['Dasha','Period','Bhukti','Start','End'],rows):'<p class="mm-base-unavailable">'+(ta?'இந்தக் கால எல்லையில் தசைத் தரவு கிடைக்கவில்லை':'No calculated Dasha periods in the selected window')+'</p>';
}
const TRANSIT_CACHE=new WeakMap();
async function reviewTransit(c,ref,ta,engine){
 const zone=String(c.birthTimezone||'').trim();
 const lat=Number(c.birthLat),lon=Number(c.birthLon);
 if(!zone||!Number.isFinite(lat)||!Number.isFinite(lon))return null;
 const offset=offsetMinutesAt(zone,ref,'12:00');
 const key=ref+'|'+zone+'|'+lat+'|'+lon+'|'+offset;
 const cached=TRANSIT_CACHE.get(c);
 if(cached?.key===key)return cached.data;
 // Compute once per actual chart and review date. Bilingual views translate
 // the unchanged numeric longitudes without a second Swiss calculation.
 const data=await engine({date:ref,time:'12:00',lat,lon,latitude:lat,longitude:lon,utcOffsetMinutes:offset,language:'en'});
 const verified=data?.planets?data:null;
 if(verified)TRANSIT_CACHE.set(c,{key,data:verified});
 return verified;
}
function miniPerson(c,person,ta){
 const info=(label,v)=>'<span><b>'+esc(label)+'</b> '+esc(v)+'</span>';
 return '<h3>'+esc(person)+' — '+esc(c.birthName||'—')+'</h3><div class="mm-base-identity">'+[
  info(ta?'பிறந்த தேதி':'Date',c.birthDate||'—'),info(ta?'நேரம்':'Time',c.birthTime||'—'),
  info(ta?'இடம்':'Place',c.birthPlace||'—'),info('IANA',c.birthTimezone||'—'),
  info('UTC',finite(c.birthOffsetMinutes)?String(Number(c.birthOffsetMinutes)/60):'—'),
  info(ta?'அட்சரேகை':'Latitude',c.birthLat??'—'),info(ta?'தீர்க்கரேகை':'Longitude',c.birthLon??'—')
 ].join('')+'</div>';
}
export async function renderBasicMatching(bride,groom,{language='ta',brideStyle='south',groomStyle='south',reviewDate='',poruthamRows=[],transitFn}={}){
 if(typeof transitFn!=='function')throw Error('Matching transit engine is required');
 const ta=language==='ta',ref=/^\d{4}-\d{2}-\d{2}$/.test(reviewDate)?reviewDate:new Date().toISOString().slice(0,10);
 const personData=[[bride,ta?'பெண்':'Bride',brideStyle],[groom,ta?'ஆண்':'Groom',groomStyle]];
 const sections=[];
 for(const [c,who,style] of personData){
  const ri=finite(c.lagna?.longitude)?signIndex(c.lagna.longitude):-1;
  const d9=vargaFor(c,9);
  const d9ri=ri<0?-1:vargaSign(Number(c.lagna.longitude),9);
  let trData=null,transitError='';
  try{trData=await reviewTransit(c,ref,ta,transitFn);}catch(e){transitError=String(e.message||e);}
  const charts='<div class="mm-base-chart-row">'+
   chart(ta?'ராசிக் கட்டம் D1':'Rasi Chart D1',c.planets,ri,style,ta,'rasi')+
   (d9?chart(ta?'நவாம்சக் கட்டம் D9':'Navamsa Chart D9',d9.planets,d9ri,style,ta,'navamsa'):'')+
   chart(ta?'பாவக் கட்டம்':'Bhava Chart',c.planets,ri,style,ta,'bhava',c.bhavas||c.bhavaDetails||[])+'</div>';
  const transitSection=trData?
   '<div class="mm-base-chart-row">'+chart((ta?'கோச்சாரக் கட்டம்':'Transit Chart')+' · '+ref,trData.planets,ri,style,ta,'transit')+'</div>'+
   table(ta?['கிரகம்','ராசி','பாகை','நட்சத்திரம்','பாதம்']:['Planet','Sign','Degree','Nakshatra','Pada'],(trData.planets||[]).map(p=>tr([name(p.name,ta),finite(p.longitude)?sign(signIndex(p.longitude),ta):localizedSign(p.rasi,ta),p.degree||'—',nak(p,ta),pada(p)]))):
   '<p class="mm-base-unavailable">'+esc(transitError||title('Transit data unavailable','கோச்சாரத் தரவு கிடைக்கவில்லை',language))+'</p>';
  const panels=[
   charts,
   heading('Natal planetary positions with Nakshatra/Pada','பிறப்புக் கிரக நிலைகள் — நட்சத்திரம், பாதம்',language)+dataBlock(c,ta),
   heading('Bhava / House Table','பாவ அட்டவணை',language)+houseTable(c,ta),
   ...[[2,'Hora','ஹோரா'],[7,'Saptamsa','சப்தாம்சம்'],[9,'Navamsa','நவாம்சம்'],[10,'Dasamsa','தசாம்சம்']].map(([d,en,tm])=>heading('D'+d+' — '+en+' · Nakshatra/Pada','D'+d+' — '+tm+' · நட்சத்திரம்/பாதம்',language)+vargaTable(c,d,ta)),
   heading('Bhinna and Sarvashtakavarga','பின்னாஷ்டகவர்க்கம் மற்றும் சர்வாஷ்டகவர்க்கம்',language)+ashtakavarga(c,ta),
   heading('Shadbala (seven classical planets)','ஷட்பலம் (ஏழு கிரகங்கள்)',language)+shadbala(c,ta),
   heading('Vimshottari Dasha / Bhukti — Next 15 Years','விம்சோத்தரி தசா / புக்தி — அடுத்த 15 ஆண்டுகள்',language)+dasha(c,ta,new Date().toISOString().slice(0,10)),
   heading('Gochara chart and positions','கோச்சாரக் கட்டம் மற்றும் கிரக நிலைகள்',language)+transitSection
  ];
  sections.push('<section class="mm-base-person mm-person-result">'+miniPerson(c,who,ta)+panels.join('')+'</section>');
 }
 const porutham=Array.isArray(poruthamRows)&&poruthamRows.length?
  '<section class="mm-base-person mm-person-result">'+heading('Ten Nakshatra Porutham calculations','பத்து நட்சத்திரப் பொருத்தக் கணக்கீடுகள்',language)+
   table(ta?['பொருத்தம்','முடிவு','ஆதாரம்']:['Porutham','Result','Evidence'],poruthamRows.map(x=>tr([x[0],x[1]?title('Matches','பொருந்துகிறது',language):title('Does not match','பொருந்தவில்லை',language),x[2]||'—'])))+'</section>':'';
 return '<div class="mm-full-results mm-basic-report" data-report="calculation-only">'+
 '<h2>'+esc(title('Marriage Matching — Basic Calculation Report','திருமணப் பொருத்தம் — அடிப்படைக் கணக்கீட்டு அறிக்கை',language))+'</h2>'+
 '<p class="mm-base-note">'+esc(title('Calculation data for both horoscopes; the two selected birthplaces use independent historical UTC offsets and the review-date transits use each location’s IANA timezone.','இருவரின் தனித்தனி பிறந்த இட நேர வேறுபாடுகளுடன் கணக்கிடப்பட்ட ஜாதகத் தரவுகள். தேர்ந்தெடுத்த கோச்சாரத் தேதிக்கும் அந்தந்த IANA நேர மண்டலம் பயன்படுத்தப்படுகிறது.',language))+'</p>'+
 sections.join('')+porutham+'</div>';
}
