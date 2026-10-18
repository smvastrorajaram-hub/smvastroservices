/* SMV ASTRO — factual two-person Marriage Matching calculation report.
 * Reuses natal Swiss results, the existing Advanced Vargas/BAV/SAV/Shadbala
 * and the selected-date offline transit calculation. No invented values.
 * Output is static HTML suitable for the existing Save/Print snapshot pipeline.
 */
import {vargaSign,vargaLongitude} from './offline/astro_advanced.browser.mjs';
import {offsetMinutesAt} from './offline/places/timezone.mjs';
const SIGNS_EN=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const SIGNS_TA=['மேஷம்','ரிஷபம்','மிதுனம்','கடகம்','சிம்மம்','கன்னி','துலாம்','விருச்சிகம்','தனுசு','மகரம்','கும்பம்','மீனம்'];
const P_EN=['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu'];
const P_TA=['சூரியன்','சந்திரன்','செவ்வாய்','புதன்','குரு','சுக்கிரன்','சனி','ராகு','கேது'];
const NAK_EN=['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishta','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati'];
const NAK_TA=['அசுவினி','பரணி','கார்த்திகை','ரோகிணி','மிருகசீரிடம்','திருவாதிரை','புனர்பூசம்','பூசம்','ஆயில்யம்','மகம்','பூரம்','உத்திரம்','ஹஸ்தம்','சித்திரை','சுவாதி','விசாகம்','அனுஷம்','கேட்டை','மூலம்','பூராடம்','உத்திராடம்','திருவோணம்','அவிட்டம்','சதயம்','பூரட்டாதி','உத்திரட்டாதி','ரேவதி'];
const esc=x=>String(x??'—').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
const signIndex=v=>Math.floor((((Number(v)%360)+360)%360)/30);
const safeStyle=s=>['south','north','east'].includes(s)?s:'south';
const name=(s,ta)=>{if(['மாந்தி','Maandi','Mandi'].includes(String(s||'')))return ta?'மாந்தி':'Maandi';const j=P_TA.findIndex((p,i)=>p===s||P_EN[i].toLowerCase()===String(s||'').toLowerCase());return j<0?String(s||'—'):(ta?P_TA:P_EN)[j]};
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
const title=(en,ta,lang)=>lang==='ta'?ta:en;
const tr=(a)=>'<tr>'+a.map(x=>'<td>'+esc(x)+'</td>').join('')+'</tr>';
const table=(head,rows,extra='')=>'<div class="mm-base-scroll"><table class="mm-base-table '+extra+'"><thead><tr>'+head.map(x=>'<th>'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+rows.join('')+'</tbody></table></div>';
const heading=(en,ta,lang)=>'<h4>'+esc(title(en,ta,lang))+'</h4>';
function chart(caption,planets,lagnaSign,style,ta,mode,bhavas=[],natalPlanets=[]){
 const kind=safeStyle(style),bhava=mode==='bhava';
 const bySign=Array.from({length:12},()=>[]),byHouse=Array.from({length:12},()=>[]);
 const housesBySign=Array.from({length:12},()=>[]);
 const short=raw=>{
  const i=P_TA.findIndex((t,n)=>t===raw||P_EN[n].toLowerCase()===String(raw||'').toLowerCase());
  if(['மாந்தி','Maandi','Mandi'].includes(raw))return ta?'மா':'Md';
  return i<0?String(raw||'').slice(0,3):(ta?['சூ','சந்','செ','பு','கு','சு','ச','ரா','கே']:['Su','Mo','Ma','Me','Ju','Ve','Sa','Ra','Ke'])[i];
 };
 const validAsc=Number.isInteger(lagnaSign)&&lagnaSign>=0&&lagnaSign<12;
 // Preserve the original short planetary codes and attach existing calculated
 // retrograde/combustion flags to D1, D9, Bhava and selected-date Transit charts.
 const natalState=new Map((natalPlanets||[]).map(p=>[name(p?.name??p?.planet,false),p?.strength||p]));
 const token=p=>{
  const k=name(p?.name??p?.planet,false),st=p?.strength||natalState.get(k)||p||{};
  const retro=st.retrograde===true||(st.retrograde==null&&finite(p?.speed)&&Number(p.speed)<-1e-7);
  const combustion=st.combustion===true;
  return {label:short(String((p?.name??p?.planet)??'')),retro,combustion};
 };
 const hSign=h=>{
  const d=bhavas?.[h-1];
  // Trust calculated Sripati Bhava-Madhya; never assume one Bhava per Rasi.
  if(Number.isInteger(d?.rasiIndex)&&d.rasiIndex>=0&&d.rasiIndex<12)return d.rasiIndex;
  if(finite(d?.madhyaLongitude))return signIndex(d.madhyaLongitude);
  const fromLabel=SIGNS_TA.findIndex((n,i)=>n===d?.rasi||SIGNS_EN[i].toLowerCase()===String(d?.rasi||'').toLowerCase());
  if(fromLabel>=0)return fromLabel;
  return validAsc?(lagnaSign+h-1)%12:h-1;
 };
 if(bhava){
  for(let h=1;h<=12;h++)housesBySign[hSign(h)].push(h);
 }
 for(const p of planets||[]){
  const code=token(p);
  if(!code.label)continue;
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
   byHouse[0].unshift({label:ta?'ல':'As'});
   bySign[hSign(1)].unshift({label:ta?'ல':'As'});
  }else if(mode!=='transit'){
   bySign[lagnaSign].unshift({label:ta?'ல':'As'});
  }
 }
 const cell=(position,tokens,identifier='')=>'<div class="mm-base-cell mm-base-pos-'+position+'">'+
  (identifier?'<span class="mm-base-index">'+esc(identifier)+'</span>':'')+
  '<span class="mm-base-planets">'+tokens.map(v=>'<span class="mm-base-planet">'+esc(v.label)+(v.retro?'<sup class="mm-base-flag">'+(ta?'வ':'R')+'</sup>':'')+(v.combustion?'<sup class="mm-base-flag">'+(ta?'அ':'C')+'</sup>':'')+'</span>').join('')+'</span></div>';
 const kindCells=kind==='north'
  ?Array.from({length:12},(_,i)=>{
    const h=i+1,s=validAsc?(lagnaSign+i)%12:i;
    return cell(i,bhava?byHouse[i]:bySign[s],String(bhava?h:s+1));
   }).join('')
  :Array.from({length:12},(_,i)=>{
    const houseLabels=bhava?housesBySign[i].join('/'):(kind==='east'?String(i+1):'');
    return cell(i,bySign[i],houseLabels);
   }).join('');
 const southLines='M25 0V100 M75 0V100 M0 25H100 M0 75H100 M0 50H25 M75 50H100 M50 0V25 M50 75V100';
 const northLines='M0 0L100 100 M100 0L0 100 M50 0L100 50L50 100L0 50Z';
 const eastLines='M33.333 0V100 M66.667 0V100 M0 33.333H100 M0 66.667H100 M0 0L33.333 33.333 M66.667 33.333L100 0 M0 100L33.333 66.667 M66.667 66.667L100 100';
 const lines=kind==='south'?southLines:kind==='north'?northLines:eastLines;
 const svg='<svg class="mm-base-geometry" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><rect x=".5" y=".5" width="99" height="99"/><path d="'+lines+'"/></svg>';
 const middle=kind==='north'?'':'<div class="mm-base-centerlabel">'+esc(mode==='rasi'?(ta?'ராசி':'Rasi'):mode==='navamsa'?(ta?'நவாம்சம்':'Navamsa'):mode==='bhava'?(ta?'பாவம்':'Bhava'):(ta?'கோச்சாரம்':'Transit'))+'</div>';
 return '<div class="mm-base-chart-wrap" data-chart-mode="'+esc(mode)+'"><h4>'+esc(caption)+'</h4><div class="mm-base-chart mm-base-'+kind+'" data-chart-style="'+kind+'">'+svg+kindCells+middle+'</div></div>';
}
function natalMaandi(c){
 const m=c?.upagrahas?.maandi||c?.bookUpagrahas?.maandi;
 if(!m||!finite(m.longitude))return null;
 const starts=(c?.bhavas||[]).map(x=>Number(x?.arambhaLongitude));
 const lon=((Number(m.longitude)%360)+360)%360;
 let bhava=null;
 if(starts.length===12&&starts.every(Number.isFinite)){
  for(let i=0;i<12;i++){
   const a=((starts[i]%360)+360)%360,b=((starts[(i+1)%12]%360)+360)%360;
   const arc=(b-a+360)%360, distance=(lon-a+360)%360;
   if(distance<arc){bhava=i+1;break;}
  }
 }
 return {...m,name:'மாந்தி',bhava};
}
function chartPlanetStatus(p,ta){
 const st=p?.strength||{};
 const retro=st.retrograde;
 const comb=st.combustion;
 return [retro===true?(ta?'வக்ரம்':'Retrograde'):retro===false?(ta?'நேர்கதி':'Direct'):'—',
  comb===true?(ta?'அஸ்தமனம்':'Combust'):comb===false?(ta?'இல்லை':'No'):'—'];
}
// The only places showing motion / combustion flags are the three
// calculated position tables: natal Graha, selected-date transit and Bhava.
function markedPlanetName(p,ta){
 const base=name(p?.name??p?.planet,ta);
 const status=p?.strength||p||{};
 const retro=status.retrograde===true;
 const combust=status.combustion===true;
 const suffix=[retro?(ta?'வ':'R'):null,combust?(ta?'அ':'C'):null].filter(Boolean);
 return suffix.length?base+' ('+suffix.join(',')+')':base;
}
function tablePlanetRows(ps,ta,lagna){
 const out=[];
 if(finite(lagna))out.push(tr([ta?'லக்னம்':'Ascendant',sign(signIndex(lagna),ta),val((lagna%30+30)%30,4),nak({longitude:lagna},ta),pada({longitude:lagna}),1]));
 for(const p of ps||[]){
  out.push(tr([markedPlanetName(p,ta),
    finite(p.longitude)?sign(signIndex(p.longitude),ta):localizedSign(p.rasi,ta),
    p.degree||(finite(p.longitude)?val((Number(p.longitude)%30+30)%30,4):'—'),
    nak(p,ta),pada(p),p.bhava??'—']));
 }
 return out;
}
function dataBlock(c,ta,natal){
 const columns=ta?['கிரகம்','ராசி','பாகை','நட்சத்திரம்','பாதம்','பாவம்']:['Planet','Sign','Degree','Nakshatra','Pada','House'];
 return table(columns,tablePlanetRows(natal,ta,c.lagna?.longitude));
}
function houseTable(c,ta,natal){
 const source=Array.isArray(c.bhavas)?c.bhavas:Array.isArray(c.bhavaDetails)?c.bhavaDetails:[];
 // Index people by calculated house ONCE. Do not recompute the mapping twelve times.
 const byHouse=Array.from({length:12},()=>[]);
 for(const p of natal||[]){
  const h=Number(p?.bhava);
  if(Number.isInteger(h)&&h>=1&&h<=12)byHouse[h-1].push(markedPlanetName(p,ta));
 }
 const rows=source.length===12?source:Array.from({length:12},(_,i)=>source[i]||{});
 return table(ta?['பாவம்','ராசி','ஆரம்பம்','மத்திமம்','முடிவு','கிரகங்கள்']:['House','Sign','Start','Midpoint','End','Planets'],
   rows.map((detail,i)=>tr([
    i+1,
    detail.rasi?localizedSign(detail.rasi,ta):finite(detail.madhyaLongitude)
       ?sign(signIndex(detail.madhyaLongitude),ta)
       :finite(c.lagna?.longitude)?sign((signIndex(c.lagna.longitude)+i)%12,ta):'—',
    detail.arambha||detail.degree||'—',detail.madhya||'—',
    detail.antyaDegree||detail.antya||'—',byHouse[i].join(', ')||'—'
   ])));
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
 const ps=(c?.planets||[]).filter(p=>p?.strengthUttaraKalamrita?.source);
 if(!ps.length)return '<p class="mm-base-unavailable">'+(ta?'Uttara Kalamrita இடைக்காலச் சட்பலத் தரவு கிடைக்கவில்லை':'Uttara Kalamrita intermediate Shadbala data unavailable')+'</p>';
 const h1=ta?['கிரகம்','ஸ்தானம் (UK)','திக் (UK)','காலம் (UK)','சேஷ்டா (UK)','நைசர்கிகம் (UK)','த்ரிக் (UK)','யுத்தம் (UK)']:['Planet','Sthana (UK)','Dig (UK)','Kala (UK)','Cheshta (UK)','Naisargika (UK)','Drig (UK)','Yuddha (UK)'];
 const h2=ta?['கிரகம்','முழு மொத்த விரூபம்','ரூபம்','நிலை']:['Planet','Full Total Virupa','Rupa','Status'];
 const part1=ps.map(p=>{
  const x=p.strengthUttaraKalamrita,st=x.sthana||{},k=x.kala||{};
  const war=(x.missing||[]).includes('planetary war unresolved')?null:x.warVirupa;
  return tr([name(p.name,ta),val(st.totalVirupa),val(x.dig?.virupa),val(k.totalVirupa),val(x.cheshta?.virupa),val(x.naisargikaVirupa),val(x.drig?.virupa),val(war)]);
 });
 const part2=ps.map(p=>{
  const x=p.strengthUttaraKalamrita;
  const status=Number.isFinite(x.totalVirupa)
   ?(ta?'இடைக்கால மொத்தம் — முழுச் சான்றிதழ் இல்லை':'Intermediate total — not fully certified')
   :(ta?'முழு மொத்தம் நிலுவை; சேஷ்டா/மூல ஆதாரம் தீர்க்கப்படவில்லை':'Full total pending; Cheshta/source evidence unresolved');
  return tr([name(p.name,ta),val(x.totalVirupa),val(x.totalRupa,3),status]);
 });
 const status=ta
  ?'<p class="small mm-shadbala-status">Uttara Kalamrita இடைக்காலக் கூறுகள் மட்டுமே காட்டப்படுகின்றன. பிறப்பு ஜாதக Cheshta உள்ளீடுகளுக்கு ஒரே வானியல் அடிப்படையிலான சுயாதீன ஆதாரம் இல்லாததால் முழு மொத்தம்/விகிதம் காட்டப்படவில்லை; இது இறுதி சட்பலச் சான்றிதழ் அல்ல.</p>'
  :'<p class="small mm-shadbala-status">Only Uttara Kalamrita intermediate components are shown. A same-frame independently verified natal Cheshta source is still missing, so the full total/ratio is withheld; this is not a final Shadbala certificate.</p>';
 return status+table(h1,part1,'mm-base-shad-components')+table(h2,part2,'mm-base-shad-total');
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
async function reviewTransit(c,ref,engine){
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
  try{trData=await reviewTransit(c,ref,transitFn);}catch(e){transitError=String(e.message||e);}
  const maandi=natalMaandi(c);
  const native=c.planets||[],natal=[...native,...(maandi?[maandi]:[])];
  const vargaMaandi=maandi?{...maandi,longitude:vargaLongitude(Number(maandi.longitude),9)}:null;
  const d9Planets=d9?[...d9.planets,...(vargaMaandi?[vargaMaandi]:[])]:[];
  const charts='<div class="mm-base-chart-row">'+
   chart(ta?'ராசிக் கட்டம் D1':'Rasi Chart D1',natal,ri,style,ta,'rasi',[],native)+
   (d9?chart(ta?'நவாம்சக் கட்டம் D9':'Navamsa Chart D9',d9Planets,d9ri,style,ta,'navamsa',[],native):'')+
   chart(ta?'பாவக் கட்டம்':'Bhava Chart',natal,ri,style,ta,'bhava',c.bhavas||c.bhavaDetails||[],native)+'</div>';
  const transitSection=trData?
   '<div class="mm-base-chart-row">'+chart((ta?'கோச்சாரக் கட்டம்':'Transit Chart')+' · '+ref,trData.planets,ri,style,ta,'transit')+'</div>'+
   table(ta?['கிரகம்','ராசி','பாகை','நட்சத்திரம்','பாதம்']:['Planet','Sign','Degree','Nakshatra','Pada'],(trData.planets||[]).map(p=>tr([markedPlanetName(p,ta),finite(p.longitude)?sign(signIndex(p.longitude),ta):localizedSign(p.rasi,ta),p.degree||'—',nak(p,ta),pada(p)]))):
   '<p class="mm-base-unavailable">'+esc(transitError||title('Transit data unavailable','கோச்சாரத் தரவு கிடைக்கவில்லை',language))+'</p>';
  const panels=[
   charts,
   heading('Natal planetary positions with Nakshatra/Pada','பிறப்புக் கிரக நிலைகள் — நட்சத்திரம், பாதம்',language)+dataBlock(c,ta,natal),
   heading('Bhava / House Table','பாவ அட்டவணை',language)+houseTable(c,ta,natal),
   ...[[2,'Hora','ஹோரா'],[7,'Saptamsa','சப்தாம்சம்'],[9,'Navamsa','நவாம்சம்'],[10,'Dasamsa','தசாம்சம்']].map(([d,en,tm])=>heading('D'+d+' — '+en+' · Nakshatra/Pada','D'+d+' — '+tm+' · நட்சத்திரம்/பாதம்',language)+vargaTable(c,d,ta)),
   heading('Bhinna and Sarvashtakavarga','பின்னாஷ்டகவர்க்கம் மற்றும் சர்வாஷ்டகவர்க்கம்',language)+ashtakavarga(c,ta),
   heading('Shadbala (seven classical planets)','ஷட்பலம் (ஏழு கிரகங்கள்)',language)+shadbala(c,ta),
   heading('Vimshottari Dasha / Bhukti — Next 15 Years','விம்சோத்தரி தசா / புக்தி — அடுத்த 15 ஆண்டுகள்',language)+dasha(c,ta,new Date().toISOString().slice(0,10)),
   heading('Gochara chart and positions','கோச்சாரக் கட்டம் மற்றும் கிரக நிலைகள்',language)+transitSection
  ];
  sections.push('<section class="mm-base-person">'+miniPerson(c,who,ta)+panels.join('')+'</section>');
 }
 const porutham=Array.isArray(poruthamRows)&&poruthamRows.length?
  '<section class="mm-base-person">'+heading('Ten Nakshatra Porutham calculations','பத்து நட்சத்திரப் பொருத்தக் கணக்கீடுகள்',language)+
   table(ta?['பொருத்தம்','முடிவு','ஆதாரம்']:['Porutham','Result','Evidence'],poruthamRows.map(x=>tr([x[0],x[1]?title('Matches','பொருந்துகிறது',language):title('Does not match','பொருந்தவில்லை',language),x[2]||'—'])))+'</section>':'';
 return '<div class="mm-basic-report" data-report="calculation-only">'+
 '<h2>'+esc(title('Marriage Matching — Basic Calculation Report','திருமணப் பொருத்தம் — அடிப்படைக் கணக்கீட்டு அறிக்கை',language))+'</h2>'+
 '<p class="mm-base-note">'+esc(title('Calculation data for both horoscopes; the two selected birthplaces use independent historical UTC offsets and the review-date transits use each location’s IANA timezone.','இருவரின் தனித்தனி பிறந்த இட நேர வேறுபாடுகளுடன் கணக்கிடப்பட்ட ஜாதகத் தரவுகள். தேர்ந்தெடுத்த கோச்சாரத் தேதிக்கும் அந்தந்த IANA நேர மண்டலம் பயன்படுத்தப்படுகிறது.',language))+'</p>'+
 sections.join('')+porutham+'</div>';
}
