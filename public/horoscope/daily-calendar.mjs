import {offsetMinutesAt} from './offline/places/timezone.mjs';
import {signs,stars,planets,holidays2026,holidaySource,favorable} from './calendar-data.mjs';
import {getTamilCalendarDayFlags,getNakshatraDirection,getNethiramJeevan} from './tamil-day-classifications.mjs';
import {classifySubhaMuhurtham} from './calendar-muhurta-classification.mjs';
import {getChandrashtamaRasiIndex,getBirthStarPadasInRasi,getNakshatraPadaAtLongitude,getChandrashtamaPadaProjection,formatRasiDegree} from './calendar-chandrashtama.mjs';

const host=document.getElementById('smvDailyCalendar');
if(host){
 const $=s=>host.querySelector(s),ta=()=>document.documentElement.lang==='ta',L=(en,tamil)=>ta()?tamil:en;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const storage={get(){try{return JSON.parse(localStorage.getItem('smv-calendar-settings')||'{}')}catch{return {}}},set(v){try{localStorage.setItem('smv-calendar-settings',JSON.stringify(v))}catch{}}};
 let cfg={lat:11.2342,lon:78.8808,offset:330,place:'Perambalur',rasi:0,star:0,starPada:1,...storage.get()},daily=null,month=null,seq=0,pending=new Map(),worker=null,dayRequest=0,monthRequest=0,locationSearchTimer=0,locationSearchAbort=null,chandrashtamaRequest=0;
 const monthCache=new Map();
 let pendingMonthCacheKey='',pendingMonthPromise=null;
 const monthCacheKey=(key,offset=cfg.offset)=>[Number(cfg.lat).toFixed(5),Number(cfg.lon).toFixed(5),Number(offset),key].join('|');
 const rememberMonth=(key,value)=>{monthCache.set(key,value);while(monthCache.size>6)monthCache.delete(monthCache.keys().next().value);};
 const localNowAt=offset=>new Date(Date.now()+Number(offset)*60000).toISOString();
 const localNow=()=>localNowAt(cfg.offset);let selected=localNow().slice(0,10),monthKey=selected.slice(0,7);
 const workerCall=(kind,input)=>new Promise((resolve,reject)=>{if(!worker){worker=new Worker(new URL('./calendar-worker.mjs',import.meta.url),{type:'module'});worker.onmessage=({data})=>{const p=pending.get(data.id);if(p){pending.delete(data.id);data.error?p.reject(new Error(data.error)):p.resolve(data.result)}};worker.onerror=()=>{for(const p of pending.values())p.reject(new Error('Calendar engine unavailable'));pending.clear();worker.terminate();worker=null;}}const id=++seq;pending.set(id,{resolve,reject});worker.postMessage({id,kind,input});});
 function input(date,updateOffset=true){
  let offset=Number(cfg.offset);
  if(cfg.timezone){
   try{offset=offsetMinutesAt(cfg.timezone,date,'12:00')}
   catch(error){console.warn('Calendar timezone unavailable',error)}
  }
  if(updateOffset)cfg.offset=offset;
  const now=localNowAt(offset);
  return {date,time:date===now.slice(0,10)?now.slice(11,16):'12:00',lat:+cfg.lat,lon:+cfg.lon,utcOffsetMinutes:offset,timezone:cfg.timezone||'',language:'en'};
 }
 function settings(){cfg.rasi=+$('#calRasi').value;cfg.star=+$('#calStar').value;cfg.starPada=+$('#calStarPada').value;storage.set(cfg);renderExtra()}
 function viewportAnchor(selector){const el=selector?$(selector):null;return el?{selector,top:el.getBoundingClientRect().top}:null}
 function restoreViewport(anchor){if(!anchor)return;requestAnimationFrame(()=>requestAnimationFrame(()=>{const el=$(anchor.selector);if(!el)return;const delta=el.getBoundingClientRect().top-anchor.top;if(Math.abs(delta)>1)window.scrollBy(0,delta)}))}
 function loadFrom(selector){return load(viewportAnchor(selector))}
 function closePlaceResults(){const box=$('#calPlaceResults');if(box){box.replaceChildren();box.classList.remove('is-open')}}
 function bindPlaceSearch(){
  const place=$('#calPlace'),lat=$('#calLat'),lon=$('#calLon'),offset=$('#calOffset'),box=$('#calPlaceResults');if(!place||!lat||!lon||!offset||!box)return;
  place.autocomplete='off';
  const status=(msg,error=false)=>{box.replaceChildren();if(!msg){box.classList.remove('is-open');return;}const d=document.createElement('div');d.className='cal-place-note'+(error?' is-error':'');d.textContent=msg;box.append(d);box.classList.add('is-open');};
  const render=rows=>{box.replaceChildren();if(!rows.length){status(L('No matching place found. Type a little more.','பொருத்தமான இடம் கிடைக்கவில்லை. மேலும் சில எழுத்துகளை உள்ளிடவும்.'),true);return;}const frag=document.createDocumentFragment();rows.slice(0,70).forEach(x=>{const b=document.createElement('button');b.type='button';b.className='cal-place-option';b.setAttribute('role','option');b.textContent=x.place||x.name||'';b.onclick=async()=>{
  const name=x.place||x.name||'';place.value=name;
  lat.value=Number(x.latitude).toFixed(6);lon.value=Number(x.longitude).toFixed(6);
  place.dataset.locationSelected='1';place.dataset.timezoneSource='unverified';
  place.dataset.timezone='';offset.value='';
  status(L('Verifying timezone with GeoNames…','GeoNames நேர மண்டலம் சரிபார்க்கப்படுகிறது…'));
  try{
   const item=await window.__smvResolvePlaceTimezone(x);
   if(place.value!==name||place.dataset.locationSelected!=='1')return;
   const corrected=offsetMinutesAt(item.timezone,selected,'12:00');
   place.dataset.timezone=item.timezone;place.dataset.timezoneSource=item.timezoneSource;
   offset.value=String(corrected/60);closePlaceResults();
  }catch(_e){
   if(place.value===name)status(L('GeoNames timezone unavailable; select a verified UTC offset.','GeoNames நேர மண்டலம் கிடைக்கவில்லை; சரியான UTC நேர வேறுபாட்டைத் தேர்வு செய்யவும்.'),true);
  }
 };frag.append(b)});box.append(frag);box.classList.add('is-open');};
  place.oninput=()=>{place.dataset.locationSelected='0';lat.value='';lon.value='';clearTimeout(locationSearchTimer);locationSearchAbort?.abort();const q=place.value.trim();if(q.length<2){closePlaceResults();return;}locationSearchTimer=setTimeout(async()=>{locationSearchAbort=new AbortController();status(L('Searching location…','இடம் தேடப்படுகிறது…'));try{if(typeof window.__smvSearchPlacesOnlineOffline!=='function')throw Error('Location search module is not ready');const rows=await window.__smvSearchPlacesOnlineOffline(q,70,locationSearchAbort.signal);render(rows)}catch(e){if(e?.name==='AbortError')return;status(L('Location search is unavailable. Enter coordinates manually.','இடத் தேடல் கிடைக்கவில்லை. அட்சரேகை, தீர்க்கரேகையை கைமுறையாக உள்ளிடவும்.'),true)}},350);};
  place.onfocus=()=>{if(box.children.length)box.classList.add('is-open')};
  place.onkeydown=e=>{if(e.key==='Escape')closePlaceResults()};
  if(host.dataset.placeOutsideBound!=='1'){host.dataset.placeOutsideBound='1';document.addEventListener('pointerdown',e=>{const b=document.getElementById('calPlaceResults'),i=document.getElementById('calPlace');if(b&&i&&e.target!==i&&!b.contains(e.target)){b.replaceChildren();b.classList.remove('is-open')}},{passive:true});}
 }
 // Keep the three-result summary immediately after Travel Shoolam and the Kari/Thaniya day flags.
 function shell(){const pagesDevHost=location.hostname==='smvastroservices.pages.dev'||location.hostname.endsWith('.smvastroservices.pages.dev');const calendarAppPage=location.hostname==='calendar.smvastroservices.in'||location.pathname.startsWith('/horoscope/calendar/');host.innerHTML=`<header class="cal-header"><div><p>SMV CALENDAR</p><h2>${L('Your day, guided by the sky','உங்கள் நாளுக்கான ஜோதிட வழிகாட்டி')}</h2><span>${L('Panchang · Hora · Transits · Tamil calendar','பஞ்சாங்கம் · ஹோரை · கோச்சாரம் · தமிழ் நாட்காட்டி')}</span></div><a class="cal-download-app-link"${calendarAppPage&&pagesDevHost?' hidden aria-hidden="true"':''} href="${calendarAppPage?'#smvCalendarAndroidApkSection':(location.hostname==='smvastroservices.pages.dev'?'/horoscope/calendar/?lang=':'https://calendar.smvastroservices.in/?lang=')+(ta()?'ta':'en')}"${calendarAppPage?'':' target="_blank" rel="noopener"'}><span class="cal-app-badge" aria-hidden="true">APK</span>${calendarAppPage?L('Download Android App','Android App பதிவிறக்கம்'):L('Open Calendar','காலண்டரைத் திறக்க')}</a></header><section class="cal-input-zone" aria-label="${L('Daily reading inputs','தினசரி பலன் உள்ளீடுகள்')}"><div class="cal-controls"><label>${L('Date','தேதி')}<input id="calDate" type="date" min="1800-01-01" max="2399-12-31" value="${selected}"></label><label>${L('Your Moon sign','உங்கள் சந்திர ராசி')}<select id="calRasi">${signs.map((s,i)=>`<option value="${i}" ${i===+cfg.rasi?'selected':''}>${s[ta()?1:0]}</option>`).join('')}</select></label><label>${L('Birth star · Tara','பிறந்த நட்சத்திரம் · தாராபலம்')}<select id="calStar">${stars.map((s,i)=>`<option value="${i}" ${i===+cfg.star?'selected':''}>${s[ta()?1:0]}</option>`).join('')}</select></label><button type="button" id="calToday">${L('Today','இன்று')}</button></div><details class="cal-location"><summary>${L('Location','இடம்')}: ${esc(cfg.place)} · UTC ${(+cfg.offset/60>=0?'+':'')+ +cfg.offset/60}</summary><form id="calLocation"><label class="cal-place-label">${L('Place','இடம்')}<span class="cal-place-search"><input id="calPlace" name="place" value="${esc(cfg.place)}" required maxlength="80"><span id="calPlaceResults" class="cal-place-results" role="listbox"></span></span></label><label>${L('Latitude','அட்சரேகை')}<input id="calLat" name="lat" type="number" min="-89" max="89" step="any" value="${cfg.lat}" required></label><label>${L('Longitude','தீர்க்கரேகை')}<input id="calLon" name="lon" type="number" min="-180" max="180" step="any" value="${cfg.lon}" required></label><label>UTC ${L('hours','மணி')}<input id="calOffset" name="offset" type="number" min="-12" max="14" step=".25" value="${+cfg.offset/60}" required></label><button>${L('Apply location','இடத்தைப் பயன்படுத்து')}</button><button type="button" id="calGeo">${L('Use my location','என் இருப்பிடம்')}</button></form></details><p id="calStatus" role="status"></p></section><div id="calMonth"></div><section id="calDateDetails" class="cal-date-details" aria-label="${L('Date Details','தேதி விவரங்கள்')}"><header class="cal-date-details-head"><div><h3 class="cal-date-details-title">${L('Date Details','தேதி விவரங்கள்')}</h3><p>${L('Panchangam, Tamil date and daily muhurthas','பஞ்சாங்கம், தமிழ் தேதி மற்றும் தினசரி முகூர்த்தங்கள்')}</p></div></header><div id="calDateDetailsExtra"></div><div id="calMuhurtaLagna" class="cal-muhurta-lagna-section" aria-live="polite"></div><div id="calDaily"></div><section id="calReadings"></section><section id="calEvents"></section></section>`;
  if(calendarAppPage&&!pagesDevHost){const appLink=$('.cal-download-app-link');if(appLink)appLink.hidden=false;}
 bindPlaceSearch();
 $('#calDate').onchange=()=>{if(!$('#calDate').checkValidity()||!$('#calDate').value)return;selected=$('#calDate').value;loadFrom('#calDate')};$('#calToday').onclick=()=>{selected=localNow().slice(0,10);$('#calDate').value=selected;loadFrom('.cal-controls')};$('#calRasi').onchange=settings;$('#calStar').onchange=settings;$('#calStarPada').onchange=settings;
 $('#calLocation').onsubmit=e=>{
  e.preventDefault();const f=new FormData(e.target);
  const raw=String(f.get('offset')??'').trim(),latitude=String(f.get('lat')??'').trim(),longitude=String(f.get('lon')??'').trim();
  if(!raw||!Number.isFinite(Number(raw))||Number(raw)<-12||Number(raw)>14||!latitude||!longitude||!Number.isFinite(Number(latitude))||!Number.isFinite(Number(longitude))){
   const message=L('Confirm coordinates and a valid UTC offset before using Calendar.','Calendar பயன்படுத்தும் முன் இடக் கோடுகளையும் சரியான UTC நேர வேறுபாட்டையும் உறுதிப்படுத்தவும்.');
   status(message,true);return;
  }
  cfg={...cfg,place:f.get('place'),lat:Number(latitude),lon:Number(longitude),offset:Number(raw)*60,timezone:$('#calPlace')?.dataset.timezone||''};
  storage.set(cfg);month=null;monthCache.clear();shell();load();
 };
 $('#calGeo').onclick=()=>{if(!navigator.geolocation)return;$('#calStatus').textContent=L('Finding your location…','உங்கள் இருப்பிடம் தேடப்படுகிறது…');navigator.geolocation.getCurrentPosition(pos=>{cfg={...cfg,lat:+pos.coords.latitude.toFixed(5),lon:+pos.coords.longitude.toFixed(5),offset:-new Date().getTimezoneOffset(),place:L('Current location','தற்போதைய இடம்')};storage.set(cfg);month=null;monthCache.clear();shell();load()},()=>{$('#calStatus').textContent=L('Location permission unavailable. Enter coordinates above.','இருப்பிடம் கிடைக்கவில்லை. மேலே விவரங்களை உள்ளிடவும்.')},{timeout:10000});};
 }
 const holidays=date=>date.startsWith('2026-')?(holidays2026[date.slice(5)]||[]):[];

 function dateInMonth(year,month,day){
  const last=new Date(Date.UTC(year,month,0)).getUTCDate();
  const safeDay=Math.max(1,Math.min(Number(day)||1,last));
  return String(year).padStart(4,'0')+'-'+String(month).padStart(2,'0')+'-'+String(safeDay).padStart(2,'0');
 }
 function supportedDate(value){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value||'')))return false;
  const year=Number(value.slice(0,4)),parsed=new Date(value+'T12:00:00Z');
  return year>=1800&&year<=2399&&!Number.isNaN(parsed.getTime())&&parsed.toISOString().slice(0,10)===value;
 }
 function renderMonth(){
  if(!month)return;
  const parts=monthKey.split('-').map(Number),y=parts[0],m=parts[1];
  const first=new Date(Date.UTC(y,m-1,1)).getUTCDay(),today=localNow().slice(0,10);
  const weekdays=ta()?['ஞா','தி','செ','பு','வி','வெ','ச']:['Su','Mo','Tu','We','Th','Fr','Sa'];
  const monthTitle=new Date(Date.UTC(y,m-1,15)).toLocaleDateString(ta()?'ta-IN':'en-IN',{month:'long',year:'numeric',timeZone:'UTC'});
  const selectedEntry=month.find(d=>d.date===selected)||month[Math.min(month.length-1,14)];
  const solar=selectedEntry&&selectedEntry.tamilSolar;
  const solarYear=getTamilYearName(solar,selected,ta());
  const solarTitle=solar?(ta()?solar.monthTa:solar.monthEn)+' · '+solarYear:'';
  const monthOptions=Array.from({length:12},(_,i)=>{
   const name=new Date(Date.UTC(2020,i,1)).toLocaleDateString(ta()?'ta-IN':'en-IN',{month:'long',timeZone:'UTC'});
   return '<option value="'+(i+1)+'" '+(i+1===m?'selected':'')+'>'+esc(name)+'</option>';
  }).join('');
  const titleHtml='<div class="cal-month-title"><button type="button" data-month="-1" aria-label="'+L('Previous month','முந்தைய மாதம்')+'">‹</button><button type="button" class="cal-month-current" data-open-jump aria-expanded="false" aria-controls="calMonthJump"><strong>'+esc(monthTitle)+'</strong>'+(solarTitle?'<small>'+esc(solarTitle)+'</small>':'')+'</button><button type="button" data-month="1" aria-label="'+L('Next month','அடுத்த மாதம்')+'">›</button></div>';
  const jumpHtml='<div class="cal-month-jump" id="calMonthJump" hidden><div class="cal-jump-year-actions"><button type="button" data-year="-1">'+L('Previous Year','முந்தைய ஆண்டு')+'</button><button type="button" data-year="1">'+L('Next Year','அடுத்த ஆண்டு')+'</button></div><div class="cal-jump-date-row"><label>'+L('Date','தேதி')+'<input id="calJumpDate" type="date" min="1800-01-01" max="2399-12-31" value="'+selected+'"></label><button type="button" data-jump-date>'+L('Go to Date','தேதிக்குச் செல்ல')+'</button></div><div class="cal-jump-month-row"><label>'+L('Month','மாதம்')+'<select id="calJumpMonth">'+monthOptions+'</select></label><label>'+L('Year','ஆண்டு')+'<input id="calJumpYear" type="number" min="1800" max="2399" step="1" value="'+y+'"></label><button type="button" data-jump-month>'+L('Go','செல்')+'</button></div><button type="button" class="cal-jump-close" data-close-jump>'+L('Close','மூடு')+'</button></div>';
  const cells=month.map(d=>{
   const names=[...holidays(d.date),...d.events.map(e=>e.name)];
   const labels=names.map(n=>n[ta()?1:0]),tamilDay=d.tamilSolar?.day??'—';
   const classes=[names.length?'cal-special':'',d.date===today?'cal-today':(d.date<today?'cal-date-past':'cal-date-future')].filter(Boolean).join(' ');
   const aria=[d.date,L('Tamil date','தமிழ் தேதி')+' '+tamilDay,...labels].join(' · ');
   const eventHtml=labels.length?'<small class="cal-event-name">'+esc(labels[0])+'</small>':'';
   const moreHtml=labels.length>1?'<small class="cal-event-more">+'+(labels.length-1)+'</small>':'';
   return '<button type="button" data-date="'+d.date+'" data-tamil-date="'+tamilDay+'" '+(d.date===selected?'aria-current="date" ':'')+'class="'+classes+'" aria-label="'+esc(aria)+'"><strong>'+Number(d.date.slice(8))+'</strong><small class="cal-day-tamil">'+tamilDay+'</small>'+eventHtml+moreHtml+'</button>';
  }).join('');
  $('#calMonth').innerHTML=titleHtml+jumpHtml+'<div class="cal-month-grid">'+weekdays.map(x=>'<b>'+x+'</b>').join('')+'<span></span>'.repeat(first)+cells+'</div>';
  const applyDate=(date,anchor)=>{
   if(!supportedDate(date)){
    const status=$('#calStatus');
    if(status)status.textContent=L('Choose a date from 1800 to 2399.','1800 முதல் 2399 வரையிலான தேதியைத் தேர்வு செய்யவும்.');
    return;
   }
   selected=date;$('#calDate').value=date;load(anchor);
  };
  const shiftMonth=delta=>{
   const current=selected.split('-').map(Number);
   const total=current[0]*12+current[1]-1+delta;
   const nextYear=Math.floor(total/12),nextMonth=((total%12)+12)%12+1;
   if(nextYear<1800||nextYear>2399)return;
   applyDate(dateInMonth(nextYear,nextMonth,current[2]),viewportAnchor('.cal-month-title'));
  };
  $('#calMonth').querySelectorAll('[data-date]').forEach(button=>button.onclick=()=>{
   applyDate(button.dataset.date,viewportAnchor('.cal-month-title'));
  });
  $('#calMonth').querySelectorAll('[data-month]').forEach(button=>button.onclick=()=>shiftMonth(Number(button.dataset.month)));
  const open=$('#calMonth').querySelector('[data-open-jump]'),panel=$('#calMonthJump');
  open.onclick=()=>{
   panel.hidden=!panel.hidden;open.setAttribute('aria-expanded',String(!panel.hidden));
   if(!panel.hidden){$('#calJumpDate').value=selected;$('#calJumpMonth').value=String(m);$('#calJumpYear').value=String(y);}
  };
  panel.querySelector('[data-close-jump]').onclick=()=>{panel.hidden=true;open.setAttribute('aria-expanded','false')};
  panel.querySelector('[data-jump-date]').onclick=()=>applyDate($('#calJumpDate').value,viewportAnchor('.cal-month-title'));
  panel.querySelector('[data-jump-month]').onclick=()=>{
   const yearInput=$('#calJumpYear'),monthInput=$('#calJumpMonth');
   if(!yearInput.checkValidity()||!monthInput.checkValidity())return;
   const nextYear=Number(yearInput.value),nextMonth=Number(monthInput.value);
   if(nextYear<1800||nextYear>2399||nextMonth<1||nextMonth>12)return;
   applyDate(dateInMonth(nextYear,nextMonth,Number(selected.slice(8,10))),viewportAnchor('.cal-month-title'));
  };
  panel.querySelectorAll('[data-year]').forEach(button=>button.onclick=()=>{
   const nextYear=Number($('#calJumpYear').value)+Number(button.dataset.year);
   if(nextYear<1800||nextYear>2399)return;
   $('#calJumpYear').value=String(nextYear);
   applyDate(dateInMonth(nextYear,Number($('#calJumpMonth').value),Number(selected.slice(8,10))),viewportAnchor('.cal-month-title'));
  });
  let touchStart=null,suppressGridClickUntil=0;
  const grid=$('#calMonth').querySelector('.cal-month-grid');
  grid.addEventListener('touchstart',event=>{
   const touch=event.touches&&event.touches[0];
   if(touch)touchStart={x:touch.clientX,y:touch.clientY};
  },{passive:true});
  grid.addEventListener('touchend',event=>{
   const touch=event.changedTouches&&event.changedTouches[0],start=touchStart;touchStart=null;
   if(!touch||!start)return;
   const dx=touch.clientX-start.x,dy=touch.clientY-start.y;
   if(Math.abs(dx)<60||Math.abs(dx)<Math.abs(dy)*1.2)return;
   suppressGridClickUntil=Date.now()+500;shiftMonth(dx<0?1:-1);
  },{passive:true});
  grid.querySelectorAll('[data-date]').forEach(button=>{
   const original=button.onclick;
   button.onclick=event=>{
    if(Date.now()<suppressGridClickUntil){event.preventDefault();return;}
    original&&original.call(button,event);
   };
  });
 }

 function localDateLabel(date){
  const match=String(date||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match?match[3]+'/'+match[2]+'/'+match[1]:String(date||'—');
 }
 function chandrashtamaWindowsHtml(result,janmaRasiIndex,starIndex,birthPada){
  const lang=ta()?1:0;
  const targetRasi=getChandrashtamaRasiIndex(janmaRasiIndex);
  const targetName=signs[targetRasi]?.[lang]||'—';
  const birthStarPadas=getBirthStarPadasInRasi(starIndex,janmaRasiIndex);
  const birthStarName=stars[starIndex]?.[lang]||'—';
  const birthCompatibility=birthStarPadas.length
   ? L(
      'Selected birth star '+birthStarName+' falls in '+signs[janmaRasiIndex][0]+' at pada'+(birthStarPadas.length===1?' ':'s ')+birthStarPadas.join(', ')+'.',
      'தேர்ந்தெடுத்த '+birthStarName+' நட்சத்திரம் '+signs[janmaRasiIndex][1]+' ராசியில் '+birthStarPadas.join(', ')+'-ம் பாதங்களில் அமைகிறது.'
     )
   : L(
      'The selected birth star does not fall in the selected Moon sign. Verify the birth star / Rasi pair; the windows below use the selected Moon sign.',
      'தேர்ந்தெடுத்த பிறந்த நட்சத்திரம், தேர்ந்தெடுத்த சந்திர ராசியில் அமையவில்லை. பிறந்த நட்சத்திரம் / ராசியைச் சரிபார்க்கவும்; கீழுள்ள நேரங்கள் தேர்ந்தெடுத்த ராசியை அடிப்படையாகக் கொண்டவை.'
     );
  const windows=Array.isArray(result.windows)?result.windows:[];
  const windowsHtml=windows.length?windows.map((item,index)=>{
   const active=item.active===true;
   const durationHours=Math.floor(Number(item.durationMinutes||0)/60);
   const durationMinutes=Number(item.durationMinutes||0)%60;
   const rows=(item.segments||[]).map(segment=>{
    const starName=stars[Number(segment.nakshatraIndex)]?.[lang]||'—';
    return '<div class="cal-chandra-pada-row" data-nakshatra-index="'+Number(segment.nakshatraIndex)+'" data-pada="'+Number(segment.pada)+'">'+
     '<strong>'+esc(starName)+' · '+L('Pada ','பாதம் ')+esc(segment.pada)+'</strong>'+
     '<span>'+esc(formatRasiDegree(segment.fromDegree))+' – '+esc(formatRasiDegree(segment.toDegree))+'</span>'+
     '<small>'+esc(localDateLabel(segment.startDate)+' '+segment.startTime)+' – '+esc(localDateLabel(segment.endDate)+' '+segment.endTime)+'</small>'+
    '</div>';
   }).join('');
   return '<article class="cal-chandra-window'+(active?' is-active':'')+'">'+
    '<div class="cal-chandra-window-heading"><strong>'+esc(localDateLabel(item.startDate)+' '+item.startTime)+' – '+esc(localDateLabel(item.endDate)+' '+item.endTime)+'</strong>'+
    (active?'<span>'+L('Now','தற்போது')+'</span>':'')+'</div>'+
    '<small>'+L('Moon in '+targetName+' · duration '+durationHours+'h '+durationMinutes+'m',
                 targetName+' ராசியில் சந்திரன் · கால அளவு '+durationHours+' மணி '+durationMinutes+' நிமிடம்')+'</small>'+
    '<details><summary>'+L('Exact Nakshatra / Pada timings (9)','நட்சத்திரம் / பாதம் துல்லிய நேரங்கள் (9)')+'</summary>'+
    '<div class="cal-chandra-pada-list">'+rows+'</div></details>'+
   '</article>';
  }).join(''):'<p class="cal-note">'+L('No complete Chandrashtama window was found inside the selected 90-day range.','தேர்ந்தெடுத்த 90 நாள் வரம்பில் முழுமையான சந்திராஷ்டம காலம் கிடைக்கவில்லை.')+'</p>';
  return '<div class="cal-chandra-result-meta">'+
   '<p><b>'+L('8th Rasi from your Janma Rasi','உங்கள் ஜன்ம ராசிக்கு எட்டாம் ராசி')+':</b> '+esc(targetName)+'</p>'+
   '<p>'+esc(birthCompatibility)+'</p>'+
   '<p class="cal-note">'+L('Rasi method: the complete 30° transit is shown. Each 3°20′ Nakshatra Pada has its own exact start / end time. Times use the selected location’s local time zone.',
      'ராசி முறை: முழு 30° கோச்சாரமும் காட்டப்படுகிறது. ஒவ்வொரு 3°20′ நட்சத்திரப் பாதத்திற்கும் தனித்தனி தொடக்கம் / முடிவு நேரம் கணக்கிடப்படுகிறது. தேர்ந்தெடுத்த இடத்தின் உள்ளூர் நேர மண்டலம் பயன்படுத்தப்படுகிறது.')+'</p>'+
  '</div><div class="cal-chandra-windows">'+windowsHtml+'</div>';
 }
 function loadChandrashtamaWindows(){
  const target=$('#calChandrashtamaPeriods');
  if(!target)return;
  const request=++chandrashtamaRequest;
  const janmaRasiIndex=Number(cfg.rasi),starIndex=Number(cfg.star),birthPada=Number(cfg.starPada||1);
  target.innerHTML='<p class="cal-note">'+L('Calculating exact Moon sign / Nakshatra Pada boundaries…','சந்திர ராசி / நட்சத்திரப் பாத எல்லைகள் துல்லியமாகக் கணக்கிடப்படுகின்றன…')+'</p>';
  workerCall('chandrashtama-windows',{
   ...input(selected,false),
   janmaRasiIndex,
   horizonDays:90
  }).then(result=>{
   if(request!==chandrashtamaRequest||!$('#calChandrashtamaPeriods'))return;
   if(!result?.available){
    target.innerHTML='<p class="cal-note">'+esc(result?.reason||L('Chandrashtama timing unavailable.','சந்திராஷ்டம நேரம் கிடைக்கவில்லை.'))+'</p>';
    return;
   }
   target.innerHTML=chandrashtamaWindowsHtml(result,janmaRasiIndex,starIndex,birthPada);
  }).catch(error=>{
   if(request!==chandrashtamaRequest||!$('#calChandrashtamaPeriods'))return;
   target.innerHTML='<p class="cal-note">'+esc(L('Chandrashtama timing unavailable: ','சந்திராஷ்டம நேரம் கிடைக்கவில்லை: ')+String(error?.message||error))+'</p>';
   console.warn('Calendar Chandrashtama window calculation unavailable.',error);
  });
 }

 function renderExtra(){if(!daily)return;const r=+cfg.rasi,n=+cfg.star,p=daily.en.p,ps=daily.en.t.planets,mo=ps.find(x=>x.name==='Moon');if(!mo)return;const moonPosition=getNakshatraPadaAtLongitude(mo.longitude);if(!moonPosition)return;const moonSign=moonPosition.signIndex,chandraRasi=(moonSign-7+12)%12,tara=((p.nakshatra.number-1-n+27)%27)%9;const taraNames=[['Janma · birth','ஜன்மம்'],['Sampat · prosperity','சம்பத்து'],['Vipat · caution','விபத்து'],['Kshema · wellbeing','க்ஷேமம்'],['Pratyak · obstacles','பிரத்தியக்கு'],['Sadhana · achievement','சாதனம்'],['Naidhana · caution','நைதனம்'],['Mitra · friendship','மித்திரம்'],['Parama Mitra · support','பரம மித்திரம்']];
 const names=[...holidays(selected),...daily.events.map(x=>x.name)];if(selected==='2026-04-01')names.push(['Bank annual closing · banks only','வங்கிக் கணக்கு ஆண்டு முடிவு · வங்கிகளுக்கு மட்டும்']);if(new Date(selected+'T12:00:00Z').getUTCDay()===0)names.push(['Sunday','ஞாயிறு']);
 $('#calEvents').innerHTML=`<h3>${L('Festivals, vrats & holidays','பண்டிகைகள், விரதங்கள் & விடுமுறைகள்')}</h3><div class="cal-tags">${names.length?names.map(x=>`<span>${esc(x[ta()?1:0])}</span>`).join(''):L('No listed observance for this date.','இத்தேதியில் பட்டியலிட்ட சிறப்பு நாள் இல்லை.')}</div><p class="cal-note">${L('Vrats use local sunrise, sunset or the relevant tithi window. Holiday list: Tamil Nadu annual schedule, 2026; local and later government orders may differ.','விரதங்கள் உள்ளூர் உதயம், அஸ்தமனம் அல்லது உரிய திதி நேரத்தைச் சார்ந்தவை. விடுமுறைப் பட்டியல்: தமிழ்நாடு 2026 ஆண்டுப் பட்டியல்; உள்ளூர் மற்றும் பிந்தைய அரசு அறிவிப்புகள் மாறுபடலாம்.')} <a href="${holidaySource}" target="_blank" rel="noopener">${L('Holiday source','விடுமுறை ஆதாரம்')}</a>${selected.startsWith('2026')?'':` <b>${L('Official holidays for this year have not been loaded.','இந்த ஆண்டிற்கான அரசு விடுமுறைகள் இணைக்கப்படவில்லை.')}</b>`}</p>`;
 $('#calReadings').innerHTML=`<h3>${L('Birth Star, Tara Bala & Chandrashtama','பிறந்த நட்சத்திரம் · தாராபலம் · சந்திராஷ்டமம்')}</h3><div class="cal-summary"><article><h4>${L('Tara Bala','தாராபலம்')}</h4><p>${taraNames[tara][ta()?1:0]}</p><p><b>${L('Transit Moon Rasi','கோச்சார சந்திர ராசி')}:</b> ${signs[moonSign][ta()?1:0]}</p><p>${[1,3,5,7,8].includes(tara)?L('Supportive star relationship for planned efforts.','திட்டமிட்ட முயற்சிகளுக்கு ஆதரவான நட்சத்திர உறவு.'):L('Give important work extra preparation and review.','முக்கிய பணிகளில் கூடுதல் தயாரிப்பும் சரிபார்ப்பும் தேவை.')}</p></article><article class="cal-chandrashtama ${r===chandraRasi?'is-active':''}"><h4>${L('Chandrashtama','சந்திராஷ்டமம்')}</h4><p><b>${L('Chandrashtama Rasi','சந்திராஷ்டம ராசி')}:</b> ${signs[chandraRasi][ta()?1:0]}</p><p><b>${L('Moon at selected time · Nakshatra / Pada','தேர்ந்தெடுத்த நேரச் சந்திர நட்சத்திரம் / பாதம்')}:</b> ${esc(stars[moonPosition.nakshatraIndex]?.[ta()?1:0]||'—')} · ${L('Pada ','பாதம் ')}${esc(moonPosition.pada)} · ${esc(formatRasiDegree(moonPosition.degreeInSign))}</p><p>${r===chandraRasi?L(`Yes — transit Moon is in ${signs[moonSign][0]}, the eighth sign from your selected Rasi. Keep plans flexible and respond calmly.`,`ஆம் — கோச்சார சந்திரன் ${signs[moonSign][1]} ராசியில், தேர்ந்தெடுத்த ${signs[r][1]} ராசிக்கு எட்டாம் இடத்தில் உள்ளது. திட்டங்களில் நெகிழ்வும் செயல்களில் நிதானமும் தேவை.`):L(`Your selected Rasi ${signs[r][0]} is not under Chandrashtama at the displayed transit time. Transit Moon is in ${signs[moonSign][0]}.`,`தேர்ந்தெடுத்த ${signs[r][1]} ராசிக்கு காட்டப்பட்ட நேரத்தில் சந்திராஷ்டமம் இல்லை. கோச்சார சந்திரன் ${signs[moonSign][1]} ராசியில் உள்ளது.`)}</p><div id="calChandrashtamaPeriods" aria-live="polite"></div></article></div>`;
  loadChandrashtamaWindows();
  renderDateDetails();
 }

 const tamilCycleEn=['Prabhava','Vibhava','Shukla','Pramodoota','Prajotpatti','Angirasa','Srimukha','Bhava','Yuva','Dhata','Ishvara','Bahudhanya','Pramadi','Vikrama','Vrisha','Chitrabhanu','Svabhanu','Tarana','Parthiva','Vyaya','Sarvajit','Sarvadhari','Virodhi','Vikruti','Khara','Nandana','Vijaya','Jaya','Manmatha','Durmukhi','Hevilambi','Vilambi','Vikari','Sharvari','Plava','Shubhakrit','Shobhakrit','Krodhi','Vishvavasu','Parabhava','Plavanga','Kilaka','Saumya','Sadharana','Virodhikrit','Paridhavi','Pramadicha','Ananda','Rakshasa','Nala','Pingala','Kalayukti','Siddharthi','Raudri','Durmati','Dundubhi','Rudhirodgari','Raktakshi','Krodhana','Akshaya'];
 const tamilCycleTa=['பிரபவ','விபவ','சுக்ல','பிரமோதூத','பிரசோற்பத்தி','ஆங்கீரச','ஸ்ரீமுக','பவ','யுவ','தாது','ஈஸ்வர','வெகுதானிய','பிரமாதி','விக்கிரம','விஷு','சித்திரபானு','சுபானு','தாரண','பார்த்திப','விய','சர்வஜித்','சர்வதாரி','விரோதி','விகிருதி','கர','நந்தன','விஜய','ஜய','மன்மத','துன்முகி','ஹேவிளம்பி','விளம்பி','விகாரி','சார்வரி','பிலவ','சுபகிருது','சோபகிருது','குரோதி','விசுவாவசு','பராபவ','பிலவங்க','கீலக','சௌமிய','சாதாரண','விரோதிகிருது','பரிதாபி','பிரமாதீச','ஆனந்த','ராட்சச','நள','பிங்கள','காளயுக்தி','சித்தார்த்தி','ரௌத்திரி','துன்மதி','துந்துபி','ருத்ரோத்காரி','ரக்தாட்சி','குரோதன','அட்சய'];

 function getTamilYearName(solar,date,tamil){
  if(!solar)return '—';
  const parts=String(date||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!parts)return '—';
  const y=Number(parts[1]),m=Number(parts[2]),d=Number(parts[3]);
  const traditionalStart=(m>4||(m===4&&d>=14))?y:y-1;
  const index=((traditionalStart-1987)%60+60)%60;
  return (tamil?tamilCycleTa:tamilCycleEn)[index]||'—';
 }
 const nityaYogaResults={
  Vishkumbha:['Support · opening portion calls for care','தாங்குதல் · தொடக்கப் பகுதியில் கவனம் தேவை',true],
  Priti:['Affection and harmony','அன்பும் ஒற்றுமையும்',false],
  Ayushman:['Vitality and longevity','ஆயுள் மற்றும் உறுதி',false],
  Saubhagya:['Good fortune','நற்பேறு',false],
  Shobhana:['Splendour and grace','அழகும் மங்களமும்',false],
  Atiganda:['Major obstacles · traditionally avoided','பெரிய இடையூறு · பாரம்பரியமாகத் தவிர்க்கப்படும்',true],
  Sukarma:['Good deeds and constructive work','நற்செயலும் பயனுள்ள முயற்சியும்',false],
  Dhriti:['Steadiness and determination','உறுதியும் நிலைத்தன்மையும்',false],
  Shula:['Sharpness and difficulty · use care','கூர்மை மற்றும் சிரமம் · கவனம் தேவை',true],
  Ganda:['Obstruction and complications','தடை மற்றும் சிக்கல்கள்',true],
  Vriddhi:['Growth and increase','வளர்ச்சியும் பெருக்கமும்',false],
  Dhruva:['Stability and firmness','நிலைத்தன்மையும் உறுதியும்',false],
  Vyaghata:['Impact and obstruction','தாக்கமும் இடையூறும்',true],
  Harshana:['Joy and happiness','மகிழ்ச்சியும் சந்தோஷமும்',false],
  Vajra:['Forceful or difficult conditions','கடினமான சூழ்நிலை',true],
  Siddhi:['Achievement and success','சாதனையும் வெற்றியும்',false],
  Vyatipata:['Disruption · traditionally avoided','சீர்குலைவு · பாரம்பரியமாகத் தவிர்க்கப்படும்',true],
  Variyana:['Comfort and excellence','சௌகரியமும் மேன்மையும்',false],
  Parigha:['Obstruction · first half traditionally avoided','தடை · முதல் பாதி பாரம்பரியமாகத் தவிர்க்கப்படும்',true],
  Shiva:['Auspiciousness and calm','மங்களமும் அமைதியும்',false],
  Siddha:['Accomplishment','காரிய நிறைவேற்றம்',false],
  Sadhya:['Attainable goals and effort','அடையக்கூடிய இலக்கும் முயற்சியும்',false],
  Shubha:['Auspiciousness and goodness','சுபமும் நன்மையும்',false],
  Shukla:['Clarity and brightness','தெளிவும் ஒளியும்',false],
  Brahma:['Sacred learning and knowledge','புனிதக் கல்வியும் அறிவும்',false],
  Indra:['Leadership and strength','தலைமையும் வலிமையும்',false],
  Vaidhriti:['Separation or obstruction · traditionally avoided','பிரிவும் தடையும் · பாரம்பரியமாகத் தவிர்க்கப்படும்',true]
 };
 function clockMinutes(value){
  const match=String(value??'').match(/(\d{1,2}):(\d{2})/);
  return match?Number(match[1])*60+Number(match[2]):null;
 }
 function clockText(value){
  const minute=((Math.round(Number(value))%1440)+1440)%1440;
  return String(Math.floor(minute/60)).padStart(2,'0')+':'+String(minute%60).padStart(2,'0');
 }

 function renderMuhurtaLagna(){
  const target=$('#calMuhurtaLagna');
  if(!target||!daily)return;
  const classification=classifySubhaMuhurtham({date:selected});
  const phaseLabel=classification.available&&classification.isSubhaMuhurtham
   ? (classification.paksha==='valarpirai'
      ? L('Valarpirai','வளர்பிறை')
      : classification.paksha==='theipirai'
       ? L('Theipirai','தேய்பிறை')
       : '')
   : '';
  const verdict=classification.available
   ? (classification.isSubhaMuhurtham
      ? (classification.paksha==='valarpirai'
        ? L('Valarpirai Subha Muhurtham day','வளர்பிறை சுபமுகூர்த்த நாள்')
        : L('Theipirai Subha Muhurtham day','தேய்பிறை சுபமுகூர்த்த நாள்'))
      : L('No','இல்லை'))
   : L('Annual Muhurtham list unavailable','இந்த ஆண்டிற்கான வெளியிடப்பட்ட பட்டியல் கிடைக்கவில்லை');
  const lagnaRaw=String(daily.en?.t?.lagna?.rasi||'');
  const lagnaIndex=signs.findIndex(s=>s[0]===lagnaRaw||s[1]===lagnaRaw);
  const lagnaName=lagnaIndex>=0?signs[lagnaIndex][ta()?1:0]:'—';
  const calculationTime=String(daily.en?.t?.requested?.time||daily.en?.p?.requested?.time||'—');
  const isToday=selected===localNow().slice(0,10);
  const lagnaHeading=isToday?L('Current Lagna','நடப்பு லக்னம்'):L('Lagna at selected time','தேர்ந்தெடுத்த நேர லக்னம்');
  const balance=daily.solarSignRasiMana;
  let balanceLine=L('Solar-sign Rasi Mana is being calculated…','சூரிய ராசி மானம் கணக்கிடப்படுகிறது…');
  let balanceMeta='';
  if(daily.solarSignRasiManaLoaded){
   if(balance){
    const solarSign=signs[Number(balance.sunSignIndex)]?.[ta()?1:0]||'—';
    const sunrise=String(balance.sunrise||daily.en.p?.sunrise||'—');
    const n=Number(balance.balanceNazhigai??0),v=Number(balance.balanceVinazhigai??0);
    const fullN=Number(balance.fullBalanceNazhigai??0),fullV=Number(balance.fullBalanceVinazhigai??0);
    const formatDegrees=value=>{
     const total=Math.max(0,Math.round(Number(value||0)*3600));
     const degrees=Math.floor(total/3600),minutes=Math.floor(total%3600/60),seconds=total%60;
     return degrees+'°'+String(minutes).padStart(2,'0')+'′'+String(seconds).padStart(2,'0')+'″';
    };
    const sunDegreeText=formatDegrees(balance.sunriseSunDegreeInSign);
    const remainingDegreeText=formatDegrees(balance.remainingSignDegrees);
    const ingressTime=String(balance.ingressTime||'—');
    const sunrisePositionMeta=balance.sunriseMonthBoundaryApplied
     ? L('Sun at sunrise: '+sunDegreeText+' · Tamil-month start used: 0°','உதயத்தில் சூரியன்: '+sunDegreeText+' · தமிழ் மாதத் தொடக்கக் கணக்கு: 0°')
     : L('Sun at sunrise: '+sunDegreeText,'உதயத்தில் சூரியன்: '+sunDegreeText);
    balanceLine=L(
     solarSign+' Lagna balance: '+n+' na '+v+' vi',
     solarSign+' லக்ன இருப்பு: '+n+' நா '+v+' வி'
    );
    balanceMeta=L(
     'Solar ingress: '+ingressTime+' · '+sunrisePositionMeta+' · Remaining sign arc: '+remainingDegreeText+' · Full 30° Rasi Mana: '+fullN+' na '+fullV+' vi · Sunrise: '+sunrise+' · Fixed until next sunrise',
     'சூரிய பெயர்ச்சி: '+ingressTime+' · '+sunrisePositionMeta+' · மீத ராசிப் பாகை: '+remainingDegreeText+' · முழு 30° ராசி மானம்: '+fullN+' நா '+fullV+' வி · சூ.உதயம்: '+sunrise+' · அடுத்த சூ.உதயம் வரை மாறாது'
    );
   }else{
    balanceLine=L('Lagna balance is unavailable for this location/date.','இந்த ஊர் / தேதிக்கான லக்ன இருப்பைக் கணக்கிட முடியவில்லை.');
   }
  }
  const sourceSummary=classification.available
   ? L('Published Tamil Muhurtham list · '+classification.year+' · '+classification.publishedCount+' dates','வெளியிடப்பட்ட தமிழ் முகூர்த்தப் பட்டியல் · '+classification.year+' · '+classification.publishedCount+' நாட்கள்')
   : L('The published list is currently available for 2026 and 2027 only.','தற்போது 2026, 2027 ஆண்டுகளுக்கான வெளியிடப்பட்ட பட்டியல் மட்டுமே இணைக்கப்பட்டுள்ளது.');
  target.innerHTML=
   '<div class="cal-muhurta-lagna-grid">'+
    '<div class="cal-muhurta-lagna-item"><small>'+L('Subha Muhurtham day','சுபமுகூர்த்த நாள்')+'</small><strong class="cal-subha-verdict '+(classification.available?(classification.isSubhaMuhurtham?'is-subha':'is-not-subha'):'is-unknown')+'">'+esc(verdict)+'</strong><span>'+esc(phaseLabel)+'</span></div>'+
    '<div class="cal-muhurta-lagna-item"><small>'+esc(lagnaHeading)+'</small><strong>'+esc(lagnaName)+'</strong><span>'+L('Calculated at','கணக்கீட்டு நேரம்')+' '+esc(calculationTime)+'</span></div>'+
    '<div class="cal-muhurta-lagna-item"><small>'+L('Rasi Mana Lagna Balance','ராசி மான லக்ன இருப்பு')+'</small><strong class="cal-rasi-balance-line">'+esc(balanceLine)+'</strong><span class="cal-rasi-balance-meta">'+esc(balanceMeta)+'</span></div>'+
   '</div>'+
   '<p class="cal-muhurta-explanation">'+esc(sourceSummary)+' · <a href="'+esc(classification.source||'https://tamilcalendarapp.com/subha-muhurtham-dates/')+'" target="_blank" rel="noopener">'+L('Source list','ஆதாரப் பட்டியல்')+'</a></p>';
 }

 function renderDateDetails(){
  if(!daily)return;
  const p=daily.en.p,solar=p?.tamilSolar,weekday=new Date(selected+'T12:00:00Z').getUTCDay();
  const yearName=getTamilYearName(solar,selected,ta());
  const solarDay=Number(solar?.day),monthTa=solar?.monthTa||'—',monthEn=solar?.monthEn||'—';
  const tamilDate=Number.isFinite(solarDay)?String(solarDay)+' · '+(ta()?monthTa:monthEn)+' · '+yearName:'—';
  const dayStar=Number(daily.dayStar);
  const sunStar=Number(daily.sunStar);
  const dayStarName=Number.isInteger(dayStar)&&dayStar>=1&&dayStar<=27?(stars[dayStar-1]?.[ta()?1:0]||'—'):'—';
  const sunStarName=Number.isInteger(sunStar)&&sunStar>=1&&sunStar<=27?(stars[sunStar-1]?.[ta()?1:0]||'—'):'—';
  const nethiramJeevan=getNethiramJeevan(sunStar,dayStar);
  const nakshatraDirection=getNakshatraDirection(dayStar);
  const weekdayName=(ta()?['ஞாயிறு','திங்கள்','செவ்வாய்','புதன்','வியாழன்','வெள்ளி','சனி']:['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'])[weekday];
  const yogaSegments=Array.isArray(daily.amirthadiYogaSegments)?daily.amirthadiYogaSegments:[];
  const dayFlags=getTamilCalendarDayFlags(solar);
  const sunrise=clockMinutes(p?.sunrise),sunset=clockMinutes(p?.sunset);
  const kariEndTime=dayFlags.kari&&sunrise!=null?clockText(sunrise+144):null;
  const priorSunset=clockMinutes(daily.previousSunset);
  const nightLength=sunrise!=null&&priorSunset!=null?sunrise+1440-priorSunset:null;
  const nightMuhurta=nightLength>0?nightLength/15:null;
  const brahma=nightMuhurta? [clockText(sunrise+1440-nightMuhurta*2),clockText(sunrise+1440-nightMuhurta)]:null;
  const daylight=sunrise!=null&&sunset!=null?(sunset-sunrise+1440)%1440:null;
  const abhijit=daylight>0?[clockText(sunrise+daylight*7/15),clockText(sunrise+daylight*8/15)]:null;
  const shool=[
   {directionEn:'West',directionTa:'மேற்கு',remedyEn:'Jaggery',remedyTa:'வெல்லம்'},
   {directionEn:'East',directionTa:'கிழக்கு',remedyEn:'Curd',remedyTa:'தயிர்'},
   {directionEn:'North',directionTa:'வடக்கு',remedyEn:'Milk',remedyTa:'பால்'},
   {directionEn:'North',directionTa:'வடக்கு',remedyEn:'Milk',remedyTa:'பால்'},
   {directionEn:'South',directionTa:'தெற்கு',remedyEn:'Sesame oil',remedyTa:'தைலம்'},
   {directionEn:'West',directionTa:'மேற்கு',remedyEn:'Jaggery',remedyTa:'வெல்லம்'},
   {directionEn:'East',directionTa:'கிழக்கு',remedyEn:'Curd',remedyTa:'தயிர்'}
  ][weekday];
  const yogaBoundaryLabel=value=>{
   const match=String(value??'').match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}:\d{2})$/);
   if(!match)return String(value??'—');
   const boundaryDate=match[3]+'-'+match[2]+'-'+match[1];
   return match[4]+(boundaryDate===selected?'':' ('+match[1]+'/'+match[2]+')');
  };
  const thyajyamIntervals=Array.isArray(daily.thyajyamIntervals)?daily.thyajyamIntervals:[];
  const thyajyamBoundaryLabel=value=>{
   const match=String(value??'').match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}:\d{2})$/);
   if(!match)return String(value??'—');
   const boundaryDate=match[3]+'-'+match[2]+'-'+match[1];
   return match[4]+(boundaryDate===selected?'':' ('+match[1]+'/'+match[2]+')');
  };
  const thyajyamHtml=daily.thyajyamAvailable?thyajyamIntervals.length?thyajyamIntervals.map(item=>{
   const starName=stars[Number(item.nakshatraNumber)-1]?.[ta()?1:0]||'—';
   return '<div class="cal-yoga-segment is-inauspicious"><div class="cal-yoga-segment-info"><strong>'+esc(starName)+'</strong><small>'+L('Avoid this 4-ghati period','இந்த 4 நாழிகை காலத்தைத் தவிர்க்கவும்')+'</small></div><span class="cal-yoga-segment-time">'+esc(thyajyamBoundaryLabel(item.start)+' – '+thyajyamBoundaryLabel(item.end))+'</span></div>';
  }).join(''):'<small>'+L('No Thyajyam period overlaps this local sunrise day.','இந்த உள்ளூர் சூரிய உதய நாளில் தியாஜ்ய நேரம் இல்லை.')+'</small>':'<small>'+L('Thyajyam timing unavailable.','தியாஜ்ய நேரத்தைக் கணக்கிட முடியவில்லை.')+'</small>';
  const ahas=daily.ahasNazhigai;
  const ahasText=ahas?.available?String(ahas.nazhigai)+' '+L('Nazhigai','நாழி')+' '+String(ahas.vinazhigai)+' '+L('Vinazhigai','விநாழிகை')+' '+String(ahas.tharparai??0)+' '+L('Tharparai','தற்பரை'):'—';
  const ratri=daily.ratriNazhigai;
  const ratriText=ratri?.available?String(ratri.nazhigai)+' '+L('Nazhigai','நாழி')+' '+String(ratri.vinazhigai)+' '+L('Vinazhigai','விநாழிகை')+' '+String(ratri.tharparai??0)+' '+L('Tharparai','தற்பரை'):'—';
  const dinantham=daily.dinantham;
  const dinanthamText=dinantham?.available?String(dinantham.time||'—'):'—';
  const yogaSegmentsHtml=yogaSegments.length?yogaSegments.map(segment=>{
   const yogaName=ta()?segment.ta:segment.en;
   const starName=stars[Number(segment.nakshatraNumber)-1]?.[ta()?1:0]||'—';
   const result=ta()?segment.resultTa:segment.resultEn;
   const tone=segment.bad?'is-inauspicious':segment.key==='unknown'?'is-unknown':'is-auspicious';
   const range=yogaBoundaryLabel(segment.start)+' – '+yogaBoundaryLabel(segment.end);
   return '<div class="cal-yoga-segment '+tone+'"><div class="cal-yoga-segment-info"><strong>'+esc(yogaName)+'</strong><small>'+esc(starName)+' · '+esc(result)+'</small></div><span class="cal-yoga-segment-time">'+esc(range)+'</span></div>';
  }).join(''):'<div class="cal-yoga-segment is-unknown"><div class="cal-yoga-segment-info"><strong>'+L('Unavailable','கிடைக்கவில்லை')+'</strong><small>'+L('Nakshatra interval data is unavailable.','நட்சத்திர நேரத் தரவு கிடைக்கவில்லை.')+'</small></div></div>';
  $('#calDateDetailsExtra').innerHTML=
   '<div class="cal-details-summary">'+
    '<article class="cal-tamil-date-card"><small>'+L('Tamil date · month · year','தமிழ் தேதி · மாதம் · ஆண்டு')+'</small><strong>'+esc(tamilDate)+'</strong><span>'+esc((ta()?monthTa:monthEn)+' · '+yearName)+'</span></article>'+
    '<article class="cal-day-yoga-card"><small>'+L('Amirthadi Yogam · Tamil day yoga','அமிர்தாதி யோகம் · தமிழ் நாள் யோகம்')+'</small><div class="cal-yoga-segments">'+yogaSegmentsHtml+'</div><small>'+L('Sunrise reference: ','சூரிய உதய அடிப்படை: ')+(weekdayName||'—')+' · '+dayStarName+(Number.isInteger(dayStar)?' ('+dayStar+')':'')+'</small></article>'+
    '<article class="cal-day-yoga-card is-inauspicious"><small>'+L('Nakshatra Thyajyam / Varjyam','நட்சத்திர தியாஜ்யம்')+'</small><div class="cal-yoga-segments">'+thyajyamHtml+'</div><small>'+L('Based on the star’s 60-ghati division; each Thyajyam lasts 4 ghatis.','நட்சத்திரத்தின் 60 நாழிகைப் பிரிவில், தியாஜ்யம் 4 நாழிகை நீடிக்கும்.')+'</small></article>'+
    '<article class="cal-muhurta-card"><small>'+L('Ahas : Day length','அகஸ் :- பகல் மானம்')+'</small><strong>'+esc(ahasText)+'</strong><span>'+L('Sunrise: ','சூரிய உதயம்: ')+(ahas?.sunrise||'—')+' · '+L('Sunset: ','சூரிய அஸ்தமனம்: ')+(ahas?.sunset||'—')+'</span></article>'+
    '<article class="cal-muhurta-card"><small>'+L('Ahas : Night length','அகஸ் :- இரவு மானம்')+'</small><strong>'+esc(ratriText)+'</strong><span>'+L('Sunset: ','சூரிய அஸ்தமனம்: ')+(p?.sunset||'—')+' · '+L('Next sunrise: ','மறுநாள் சூரிய உதயம்: ')+(daily.nextSunrise||'—')+'</span></article>'+
    '<article class="cal-muhurta-card"><small>'+L('Dinantham / Night reference','தினாந்தம் (இரவு)')+'</small><strong>'+esc(dinanthamText)+'</strong><span>'+L('Midpoint of the third night yama','இரவு மூன்றாம் யாமத்தின் நடுப்புள்ளி')+'</span></article>'+
    '<article class="cal-muhurta-card"><small>'+L('Nethiram','நேத்திரம்')+'</small><strong>'+esc(nethiramJeevan.available?String(nethiramJeevan.nethiram):'—')+'</strong><span>'+L('Sun star: ','சூரிய நட்சத்திரம்: ')+esc(sunStarName)+' · '+L('Day star at sunrise: ','உதய நட்சத்திரம்: ')+esc(dayStarName)+'</span></article>'+
    '<article class="cal-muhurta-card"><small>'+L('Jeevan','ஜீவன்')+'</small><strong>'+esc(nethiramJeevan.available?String(nethiramJeevan.jeevan):'—')+'</strong><span>'+L('Calculated from the Sun and sunrise Nakshatras','சூரிய மற்றும் உதய நட்சத்திர அடிப்படையில்')+'</span></article>'+
    '<article class="cal-muhurta-card"><small>'+L('Nakshatra day direction','நட்சத்திர நோக்கு நாள்')+'</small><strong>'+esc(nakshatraDirection.available?(nakshatraDirection.symbol+' '+(ta()?nakshatraDirection.ta:nakshatraDirection.en)):'—')+'</strong><span>'+esc(dayStarName)+'</span></article>'+
    '<article class="cal-muhurta-card"><small>'+L('Brahma Muhurtham','பிரம்ம முகூர்த்தம்')+'</small><strong>'+(brahma?brahma.join(' – '):'—')+'</strong><span>'+L('14th of 15 equal parts of the preceding night','முந்தைய இரவின் 15 சம முகூர்த்தங்களில் 14-வது')+'</span></article>'+
    '<article class="cal-day-flags-card"><div class="cal-day-flags"><div class="cal-day-flag '+(!dayFlags.available?'is-unknown':dayFlags.kari?'is-marked':'is-clear')+'"><small>'+L('Kari Naal','கரி நாள்')+'</small><strong>'+(!dayFlags.available?'—':dayFlags.kari?L('Yes','உள்ளது'):L('No','இல்லை'))+'</strong>'+(dayFlags.kari?'<small>'+L('Monthly Tyajyam ends ','மாதத் தியாஜ்ய முடிவு ')+esc(kariEndTime||'—')+'</small>':'')+'</div><div class="cal-day-flag '+(!dayFlags.thaniyaAvailable?'is-unknown':dayFlags.thaniya?'is-marked':'is-clear')+'"><small>'+L('Thaniya Naal','தனிய நாள்')+'</small><strong>'+(!dayFlags.thaniyaAvailable?'—':dayFlags.thaniya?L('Yes','உள்ளது'):L('No','இல்லை'))+'</strong><small>'+L('Sri Thanigai calculation','ஸ்ரீ தணிகை கணிதம்')+'</small></div></div></article>' +
    '<article class="cal-muhurta-card"><small>'+L('Abhijit Muhurtham','அபிஜித் முகூர்த்தம்')+'</small><strong>'+(abhijit?abhijit.join(' – '):'—')+'</strong><span>'+L('The 8th of 15 equal daytime Muhurtas','பகல் நேரத்தின் 15 சம முகூர்த்தங்களில் 8-வது')+'</span></article>' +
    '<article class="cal-shoolam-card"><div class="cal-shoolam-main"><small>'+L('Travel Shoolam','பயண சூலம்')+'</small><strong>'+(ta()?shool.directionTa:shool.directionEn)+'</strong><span>'+L('Pariharam','பரிகாரம்')+': '+(ta()?shool.remedyTa:shool.remedyEn)+'</span></div></article>' +
   '</div>';

  const yogaRow=[...($('#calDaily')?.querySelectorAll('.panchang-data-table tbody tr')||[])].find(row=>/^(Yoga|யோகம்)$/i.test(row.cells?.[0]?.textContent?.trim()||''));
  if(yogaRow){
   yogaRow.classList.add('cal-name-yoga-row');
   yogaRow.cells[0].classList.add('cal-name-yoga-label');
   yogaRow.cells[0].textContent=L('Namah Yoga','நாம யோகம்');
   const yogaName=String(p?.yoga?.name||'').trim();
   const yogaResult=nityaYogaResults[yogaName];
   if(yogaResult&&yogaRow.cells[1]){
    const result=document.createElement('small');
    result.className='cal-name-yoga-result';
    result.textContent=ta()?yogaResult[1]:yogaResult[0];
    yogaRow.cells[1].append(document.createElement('br'),result);
   }
  }
  renderMuhurtaLagna();
 }

 function renderDaily(){if(!daily)return;const lang=ta()?'ta':'en';const now=localNow(),minute=+now.slice(11,13)*60+ +now.slice(14,16),sunrise=Number(String(daily.en.p.sunrise||'').slice(0,2))*60+Number(String(daily.en.p.sunrise||'').slice(3,5)),beforeSunrise=selected===now.slice(0,10)&&Number.isFinite(sunrise)&&minute<sunrise,horaOverride=beforeSunrise?daily.en.previousNight:null;window.SMVRenderDaily(daily[lang].t,daily[lang].p,lang,'calDaily',horaOverride);
 // Calendar localisation is isolated from the stored horoscope and never recalculates it.
 const dict=new Map([...signs,...stars,...planets,...[['Transit Chart','கோச்சாரச் சக்கரம்'],['Transit Planetary Positions','கோச்சார கிரக நிலைகள்'],['Planet','கிரகம்'],['Rasi','ராசி'],['Degree','பாகை'],['Nakshatra','நட்சத்திரம்'],['Pada','பாதம்'],['Status','நிலை'],['Retrograde','வக்கிரம்'],['Direct','நேர்கதி'],['Asc','லக்னம்'],['Su','சூ'],['Mo','சந்'],['Ma','செ'],['Me','பு'],['Ju','கு'],['Ve','சு'],['Sa','சனி'],['Ra(R)','ரா(R)'],['Ke(R)','கே(R)']]]);
 if(ta()){for(const [a,b] of [['Su','சூ'],['Mo','சந்'],['Ma','செ'],['Me','பு'],['Ju','கு'],['Ve','சு'],['Sa','சனி']])dict.set(a+'(R)',b+'(R)');const walker=document.createTreeWalker($('#calDaily'),NodeFilter.SHOW_TEXT);while(walker.nextNode()){const node=walker.currentNode;node.textContent=node.textContent.replace('Transit தேதி/நேரம்:','கோச்சார தேதி/நேரம்:').replace(/\bto\b/g,'முதல்');for(const [en,tamil]of dict)if(node.textContent.trim()===en||node.textContent.trim()==='🪐 '+en){node.textContent=node.textContent.replace(en,tamil);break}}}
 updateHora();renderExtra();if(month&&monthKey===selected.slice(0,7))renderMonth();
 }
 function updateHora(){
  if(!daily)return;
  const now=localNow(),today=now.slice(0,10),min=+now.slice(11,13)*60+ +now.slice(14,16);
  const p=daily.en.p;
  const minuteOf=value=>{const m=String(value??'').match(/^(\d{1,2}):(\d{2})/);return m?Number(m[1])*60+Number(m[2]):null;};
  const sunrise=minuteOf(p.sunrise),beforeSunrise=selected===today&&sunrise!==null&&min<sunrise;
  const horaP=beforeSunrise&&daily.en.previousNight?daily.en.previousNight:p;
  const sunset=minuteOf(horaP.sunset)??0,timelineMinute=beforeSunrise?min+1440:min;
  const lord={Sunday:'Sun',Monday:'Moon',Tuesday:'Mars',Wednesday:'Mercury',Thursday:'Jupiter',Friday:'Venus',Saturday:'Saturn'}[horaP.vara];
  $('#calDaily').querySelectorAll('.hora-time').forEach((td,i)=>{
   const h=horaP.hora[i];if(!h)return;
   let a=Number(h.start),b=Number(h.end);
   if(i>=12&&a<sunset)a+=1440;
   if(b<=a)b+=1440;
   const current=selected===today&&timelineMinute>=a&&timelineMinute<b;
   const green=['Mercury','Jupiter','Venus'].includes(h.planetEn)||(h.planetEn==='Moon'&&horaP.tithi.number<=15);
   td.className='hora-time smv-calendar-neutral-time'+(h.planetEn===lord?' smv-hora-bright-'+(green?'green':'red'):current?' smv-hora-current-'+(green?'green':'red'):'');
   td.closest('tr').classList.toggle('cal-current-hora',current);
   td.setAttribute('aria-label',`${h.range}${current?L(' · Current Hora',' · தற்போதைய ஹோரை'):''}`);
  });
 }
 function ensureMonth(key){
  const monthInput=input(key+'-01',false);
  const cacheKey=monthCacheKey(key,monthInput.utcOffsetMinutes);
  if(month&&monthKey===key){
   if(pendingMonthCacheKey&&pendingMonthCacheKey!==cacheKey){
    monthRequest++;
    pendingMonthCacheKey='';pendingMonthPromise=null;
    renderMonth();
   }
   return Promise.resolve(month);
  }
  if(pendingMonthCacheKey===cacheKey&&pendingMonthPromise)return pendingMonthPromise;
  const cached=monthCache.get(cacheKey);
  if(cached){
   monthRequest++;
   pendingMonthCacheKey='';pendingMonthPromise=null;
   month=cached;monthKey=key;renderMonth();
   return Promise.resolve(cached);
  }
  const request=++monthRequest;
  pendingMonthCacheKey=cacheKey;
  const target=$('#calMonth');
  target.setAttribute('aria-busy','true');
  target.textContent=L('Loading monthly calendar…','மாத நாட்காட்டி தயாராகிறது…');
  const promise=workerCall('month',monthInput).then(result=>{
   if(request!==monthRequest)return null;
   month=result;monthKey=key;rememberMonth(cacheKey,result);renderMonth();
   return result;
  }).catch(error=>{
   if(request===monthRequest){
    target.removeAttribute('aria-busy');
    target.textContent=L('Unable to load the monthly calendar.','மாத நாட்காட்டியை ஏற்ற முடியவில்லை.');
    pendingMonthCacheKey='';pendingMonthPromise=null;
    console.error(error);
   }
   return null;
  }).finally(()=>{
   if(request===monthRequest){
    $('#calMonth').removeAttribute('aria-busy');
    pendingMonthCacheKey='';pendingMonthPromise=null;
   }
  });
  pendingMonthPromise=promise;
  return promise;
 }
 async function load(anchor=null){
  const request=++dayRequest,requestedDate=selected,key=selected.slice(0,7);
  daily=null;
  host.setAttribute('aria-busy','true');
  $('#calStatus').textContent=L('Calculating Panchang, Hora and transits…','பஞ்சாங்கம், ஹோரை மற்றும் கோச்சாரக் கணக்கீடு நடைபெறுகிறது…');
  const dayInput=input(requestedDate);
  const monthPromise=ensureMonth(key);
  try{
   const resultDay=await workerCall('day',dayInput);
   if(request!==dayRequest)return;
   daily=resultDay;
   $('#calStatus').textContent=`${cfg.place} · ${requestedDate} · ${daily.en.t.requested.time} · UTC ${+dayInput.utcOffsetMinutes/60}`;
   renderDaily();
   void workerCall('solar-sign-rasi-mana',dayInput).then(balance=>{
    if(request!==dayRequest||selected!==requestedDate)return;
    daily.solarSignRasiMana=balance;
    daily.solarSignRasiManaLoaded=true;
    renderMuhurtaLagna();
   }).catch(error=>{
    if(request!==dayRequest||selected!==requestedDate)return;
    daily.solarSignRasiMana=null;
    daily.solarSignRasiManaLoaded=true;
    renderMuhurtaLagna();
    console.warn('Calendar solar-sign Rasi Mana unavailable.',error);
   });
   host.removeAttribute('aria-busy');
   await monthPromise;
   if(request===dayRequest)restoreViewport(anchor);
  }catch(error){
   if(request===dayRequest){
    host.removeAttribute('aria-busy');
    $('#calStatus').textContent=L('Unable to calculate. Check the location and retry.','கணக்கிட முடியவில்லை. இட விவரங்களைச் சரிபார்த்து மீண்டும் முயலவும்.');
    const button=document.createElement('button');
    button.textContent=L('Retry','மீண்டும் முயல்க');
    button.onclick=()=>load(anchor);
    $('#calStatus').append(button);
    restoreViewport(anchor);
    console.error(error);
   }
  }
 }
 shell();load();window.addEventListener('smv-language',()=>{shell();renderDaily();renderMonth()});
 let lastDate=localNow().slice(0,10);setInterval(()=>{if(document.hidden)return;const date=localNow().slice(0,10);if(lastDate!==date&&selected===lastDate){selected=date;$('#calDate').value=date;lastDate=date;load()}else{updateHora();if(selected===date&&daily?.solarSignRasiManaLoaded)renderMuhurtaLagna()}},60000);
 addEventListener('pagehide',()=>{locationSearchAbort?.abort();clearTimeout(locationSearchTimer);try{worker?.terminate()}catch{}worker=null;pending.clear()},{once:true});
}
