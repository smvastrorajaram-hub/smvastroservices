import {offsetMinutesAt} from './offline/places/timezone.mjs';
import {signs,stars,planets,holidays2026,holidaySource,favorable} from './calendar-data.mjs';
const host=document.getElementById('smvDailyCalendar');
if(host){
 const $=s=>host.querySelector(s),ta=()=>document.documentElement.lang==='ta',L=(en,tamil)=>ta()?tamil:en;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const storage={get(){try{return JSON.parse(localStorage.getItem('smv-calendar-settings')||'{}')}catch{return {}}},set(v){try{localStorage.setItem('smv-calendar-settings',JSON.stringify(v))}catch{}}};
 let cfg={lat:11.2342,lon:78.8808,offset:330,place:'Perambalur',rasi:0,star:0,...storage.get()},daily=null,month=null,seq=0,pending=new Map(),worker=null,dayRequest=0,monthRequest=0,locationSearchTimer=0,locationSearchAbort=null;
 const monthCache=new Map();
 const monthCacheKey=key=>[Number(cfg.lat).toFixed(5),Number(cfg.lon).toFixed(5),Number(cfg.offset),key].join('|');
 const rememberMonth=(key,value)=>{monthCache.set(key,value);while(monthCache.size>6)monthCache.delete(monthCache.keys().next().value);};
 const localNow=()=>new Date(Date.now()+Number(cfg.offset)*60000).toISOString();let selected=localNow().slice(0,10),monthKey=selected.slice(0,7);
 const workerCall=(kind,input)=>new Promise((resolve,reject)=>{if(!worker){worker=new Worker(new URL('./calendar-worker.mjs',import.meta.url),{type:'module'});worker.onmessage=({data})=>{const p=pending.get(data.id);if(p){pending.delete(data.id);data.error?p.reject(new Error(data.error)):p.resolve(data.result)}};worker.onerror=()=>{for(const p of pending.values())p.reject(new Error('Calendar engine unavailable'));pending.clear();worker.terminate();worker=null;}}const id=++seq;pending.set(id,{resolve,reject});worker.postMessage({id,kind,input});});
 function input(date){if(cfg.timezone){try{cfg.offset=offsetMinutesAt(cfg.timezone,date,'12:00')}catch(e){console.warn('Calendar timezone unavailable',e)}}return {date,time:date===localNow().slice(0,10)?localNow().slice(11,16):'12:00',lat:+cfg.lat,lon:+cfg.lon,utcOffsetMinutes:+cfg.offset,language:'en'}}
 function settings(){cfg.rasi=+$('#calRasi').value;cfg.star=+$('#calStar').value;storage.set(cfg);renderExtra()}
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
 function shell(){const pagesDevHost=location.hostname==='smvastroservices.pages.dev'||location.hostname.endsWith('.smvastroservices.pages.dev');const calendarAppPage=location.hostname==='calendar.smvastroservices.in'||location.pathname.startsWith('/horoscope/calendar/');host.innerHTML=`<header class="cal-header"><div><p>SMV CALENDAR</p><h2>${L('Your day, guided by the sky','உங்கள் நாளுக்கான ஜோதிட வழிகாட்டி')}</h2><span>${L('Panchang · Hora · Transits · Tamil calendar','பஞ்சாங்கம் · ஹோரை · கோச்சாரம் · தமிழ் நாட்காட்டி')}</span></div><a class="cal-download-app-link"${calendarAppPage&&pagesDevHost?' hidden aria-hidden="true"':''} href="${calendarAppPage?'#smvCalendarAndroidApkSection':(location.hostname==='smvastroservices.pages.dev'?'/horoscope/calendar/?lang=':'https://calendar.smvastroservices.in/?lang=')+(ta()?'ta':'en')}"${calendarAppPage?'':' target="_blank" rel="noopener"'}><span class="cal-app-badge" aria-hidden="true">APK</span>${calendarAppPage?L('Download Android App','Android App பதிவிறக்கம்'):L('Open Calendar','காலண்டரைத் திறக்க')}</a></header><section class="cal-input-zone" aria-label="${L('Daily reading inputs','தினசரி பலன் உள்ளீடுகள்')}"><div class="cal-controls"><label>${L('Date','தேதி')}<input id="calDate" type="date" min="1800-01-01" max="2399-12-31" value="${selected}"></label><label>${L('Your Moon sign','உங்கள் சந்திர ராசி')}<select id="calRasi">${signs.map((s,i)=>`<option value="${i}" ${i===+cfg.rasi?'selected':''}>${s[ta()?1:0]}</option>`).join('')}</select></label><label>${L('Birth star · Tara','பிறந்த நட்சத்திரம் · தாராபலம்')}<select id="calStar">${stars.map((s,i)=>`<option value="${i}" ${i===+cfg.star?'selected':''}>${s[ta()?1:0]}</option>`).join('')}</select></label><button type="button" id="calToday">${L('Today','இன்று')}</button></div><details class="cal-location"><summary>${L('Location','இடம்')}: ${esc(cfg.place)} · UTC ${(+cfg.offset/60>=0?'+':'')+ +cfg.offset/60}</summary><form id="calLocation"><label class="cal-place-label">${L('Place','இடம்')}<span class="cal-place-search"><input id="calPlace" name="place" value="${esc(cfg.place)}" required maxlength="80"><span id="calPlaceResults" class="cal-place-results" role="listbox"></span></span></label><label>${L('Latitude','அட்சரேகை')}<input id="calLat" name="lat" type="number" min="-89" max="89" step="any" value="${cfg.lat}" required></label><label>${L('Longitude','தீர்க்கரேகை')}<input id="calLon" name="lon" type="number" min="-180" max="180" step="any" value="${cfg.lon}" required></label><label>UTC ${L('hours','மணி')}<input id="calOffset" name="offset" type="number" min="-12" max="14" step=".25" value="${+cfg.offset/60}" required></label><button>${L('Apply location','இடத்தைப் பயன்படுத்து')}</button><button type="button" id="calGeo">${L('Use my location','என் இருப்பிடம்')}</button></form></details><p id="calStatus" role="status"></p></section><div id="calMonth"></div><section id="calDateDetails" class="cal-date-details" aria-label="${L('Date Details','தேதி விவரங்கள்')}"><header class="cal-date-details-head"><div><h3 class="cal-date-details-title">${L('Date Details','தேதி விவரங்கள்')}</h3><p>${L('Panchangam, Tamil date and daily muhurthas','பஞ்சாங்கம், தமிழ் தேதி மற்றும் தினசரி முகூர்த்தங்கள்')}</p></div></header><div id="calDateDetailsExtra"></div><div id="calDaily"></div><section id="calReadings"></section><section id="calEvents"></section></section>`;
  if(calendarAppPage&&!pagesDevHost){const appLink=$('.cal-download-app-link');if(appLink)appLink.hidden=false;}
 bindPlaceSearch();
 $('#calDate').onchange=()=>{if(!$('#calDate').checkValidity()||!$('#calDate').value)return;selected=$('#calDate').value;loadFrom('#calDate')};$('#calToday').onclick=()=>{selected=localNow().slice(0,10);$('#calDate').value=selected;loadFrom('.cal-controls')};$('#calRasi').onchange=settings;$('#calStar').onchange=settings;
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
 function renderExtra(){if(!daily)return;const r=+cfg.rasi,n=+cfg.star,p=daily.en.p,ps=daily.en.t.planets,mo=ps.find(x=>x.name==='Moon');if(!mo)return;const moonSign=((Math.floor(Number(mo.longitude)/30)%12)+12)%12,chandraRasi=(moonSign-7+12)%12,tara=((p.nakshatra.number-1-n+27)%27)%9;const taraNames=[['Janma · birth','ஜன்மம்'],['Sampat · prosperity','சம்பத்து'],['Vipat · caution','விபத்து'],['Kshema · wellbeing','க்ஷேமம்'],['Pratyak · obstacles','பிரத்தியக்கு'],['Sadhana · achievement','சாதனம்'],['Naidhana · caution','நைதனம்'],['Mitra · friendship','மித்திரம்'],['Parama Mitra · support','பரம மித்திரம்']];
 const names=[...holidays(selected),...daily.events.map(x=>x.name)];if(selected==='2026-04-01')names.push(['Bank annual closing · banks only','வங்கிக் கணக்கு ஆண்டு முடிவு · வங்கிகளுக்கு மட்டும்']);if(new Date(selected+'T12:00:00Z').getUTCDay()===0)names.push(['Sunday','ஞாயிறு']);
 $('#calEvents').innerHTML=`<h3>${L('Festivals, vrats & holidays','பண்டிகைகள், விரதங்கள் & விடுமுறைகள்')}</h3><div class="cal-tags">${names.length?names.map(x=>`<span>${esc(x[ta()?1:0])}</span>`).join(''):L('No listed observance for this date.','இத்தேதியில் பட்டியலிட்ட சிறப்பு நாள் இல்லை.')}</div><p class="cal-note">${L('Vrats use local sunrise, sunset or the relevant tithi window. Holiday list: Tamil Nadu annual schedule, 2026; local and later government orders may differ.','விரதங்கள் உள்ளூர் உதயம், அஸ்தமனம் அல்லது உரிய திதி நேரத்தைச் சார்ந்தவை. விடுமுறைப் பட்டியல்: தமிழ்நாடு 2026 ஆண்டுப் பட்டியல்; உள்ளூர் மற்றும் பிந்தைய அரசு அறிவிப்புகள் மாறுபடலாம்.')} <a href="${holidaySource}" target="_blank" rel="noopener">${L('Holiday source','விடுமுறை ஆதாரம்')}</a>${selected.startsWith('2026')?'':` <b>${L('Official holidays for this year have not been loaded.','இந்த ஆண்டிற்கான அரசு விடுமுறைகள் இணைக்கப்படவில்லை.')}</b>`}</p>`;
 $('#calReadings').innerHTML=`<h3>${L('Birth Star, Tara Bala & Chandrashtama','பிறந்த நட்சத்திரம் · தாராபலம் · சந்திராஷ்டமம்')}</h3><div class="cal-summary"><article><h4>${L('Tara Bala','தாராபலம்')}</h4><p>${taraNames[tara][ta()?1:0]}</p><p><b>${L('Transit Moon Rasi','கோச்சார சந்திர ராசி')}:</b> ${signs[moonSign][ta()?1:0]}</p><p>${[1,3,5,7,8].includes(tara)?L('Supportive star relationship for planned efforts.','திட்டமிட்ட முயற்சிகளுக்கு ஆதரவான நட்சத்திர உறவு.'):L('Give important work extra preparation and review.','முக்கிய பணிகளில் கூடுதல் தயாரிப்பும் சரிபார்ப்பும் தேவை.')}</p></article><article class="cal-chandrashtama ${r===chandraRasi?'is-active':''}"><h4>${L('Chandrashtama','சந்திராஷ்டமம்')}</h4><p><b>${L('Chandrashtama Rasi','சந்திராஷ்டம ராசி')}:</b> ${signs[chandraRasi][ta()?1:0]}</p><p>${r===chandraRasi?L(`Yes — transit Moon is in ${signs[moonSign][0]}, the eighth sign from your selected Rasi. Keep plans flexible and respond calmly.`,`ஆம் — கோச்சார சந்திரன் ${signs[moonSign][1]} ராசியில், தேர்ந்தெடுத்த ${signs[r][1]} ராசிக்கு எட்டாம் இடத்தில் உள்ளது. திட்டங்களில் நெகிழ்வும் செயல்களில் நிதானமும் தேவை.`):L(`Your selected Rasi ${signs[r][0]} is not under Chandrashtama at the displayed transit time. Transit Moon is in ${signs[moonSign][0]}.`,`தேர்ந்தெடுத்த ${signs[r][1]} ராசிக்கு காட்டப்பட்ட நேரத்தில் சந்திராஷ்டமம் இல்லை. கோச்சார சந்திரன் ${signs[moonSign][1]} ராசியில் உள்ளது.`)}</p></article></div>`;
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
 const tamilDayYogaTable=[
  'SPSSSSSSSMSASSSMMMASAAMSSAA',
  'SSMASSASSMSSSPAMSSSMMASSMSS',
  'SSSASMSSSSSASSSMSMASPSSMMAS',
  'MSASSSSSSSAAMSSSSSMAASPSASM',
  'ASMMMMASSASMSSASSPSSSSSMSSS',
  'ASSMSSSMMMSSASSSSMAPSMSSSSS',
  'SSSASSSSMASMMMSSSSSSSSSAMSP'
 ];
 const tamilDayYogaNames={
  S:{key:'siddha',en:'Siddha Yogam',ta:'சித்த யோகம்',resultEn:'Accomplishment · auspicious',resultTa:'காரிய சித்தி · சுபமானது',bad:false},
  A:{key:'amirtha',en:'Amirtha Yogam',ta:'அமிர்த யோகம்',resultEn:'Nectar · highly auspicious',resultTa:'அமிர்தம் · மிகச் சிறந்த சுப யோகம்',bad:false},
  M:{key:'marana',en:'Marana Yogam',ta:'மரண யோகம்',resultEn:'Traditionally avoided for new auspicious beginnings',resultTa:'சுப காரியத் தொடக்கத்திற்கு பாரம்பரியமாகத் தவிர்க்கப்படும்',bad:true},
  P:{key:'prabalarishta',en:'Prabalarishta Yogam',ta:'பிரபலாரிஷ்ட யோகம்',resultEn:'Traditionally considered strongly inauspicious',resultTa:'பாரம்பரியமாக வலுவான அசுப யோகம்',bad:false}
 };
 function dayYogaFor(weekday,star){
  const row=tamilDayYogaTable[weekday],number=Number(star);
  if(!row||!Number.isInteger(number)||number<1||number>27)return {key:'unknown',en:'Unavailable',ta:'கிடைக்கவில்லை',resultEn:'—',resultTa:'—',bad:false};
  return tamilDayYogaNames[row[number-1]]||tamilDayYogaNames.S;
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
 function renderDateDetails(){
  if(!daily)return;
  const p=daily.en.p,solar=p?.tamilSolar,weekday=new Date(selected+'T12:00:00Z').getUTCDay();
  const yearName=getTamilYearName(solar,selected,ta());
  const solarDay=Number(solar?.day),monthTa=solar?.monthTa||'—',monthEn=solar?.monthEn||'—';
  const tamilDate=Number.isFinite(solarDay)?String(solarDay)+' · '+(ta()?monthTa:monthEn)+' · '+yearName:'—';
  const dayStar=Number(daily.dayStar)||Number(p?.nakshatra?.number);
  const dayYoga=dayYogaFor(weekday,dayStar);
  const sunrise=clockMinutes(p?.sunrise),sunset=clockMinutes(p?.sunset);
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
  const yogaName=ta()?dayYoga.ta:dayYoga.en,yogaResult=ta()?dayYoga.resultTa:dayYoga.resultEn;
  $('#calDateDetailsExtra').innerHTML=
   '<div class="cal-details-summary">'+
    '<article class="cal-tamil-date-card"><small>'+L('Tamil date · month · year','தமிழ் தேதி · மாதம் · ஆண்டு')+'</small><strong>'+esc(tamilDate)+'</strong><span>'+esc((ta()?monthTa:monthEn)+' · '+yearName)+'</span></article>'+
    '<article class="cal-day-yoga-card '+(dayYoga.bad?'is-inauspicious':'is-auspicious')+'"><small>'+L('Tamil day yoga','தமிழ் நாள் யோகம்')+'</small><strong>'+esc(yogaName)+'</strong><span>'+esc(yogaResult)+'</span><small>'+L('Weekday + Nakshatra at sunrise','சூரிய உதயக் கிழமை + நட்சத்திரம்')+'</small></article>'+
    '<article class="cal-muhurta-card"><small>'+L('Brahma Muhurtham','பிரம்ம முகூர்த்தம்')+'</small><strong>'+(brahma?brahma.join(' – '):'—')+'</strong><span>'+L('14th of 15 equal parts of the preceding night','முந்தைய இரவின் 15 சம முகூர்த்தங்களில் 14-வது')+'</span></article>'+
    '<article class="cal-muhurta-card"><small>'+L('Abhijit Muhurtham','அபிஜித் முகூர்த்தம்')+'</small><strong>'+(abhijit?abhijit.join(' – '):'—')+'</strong><span>'+L('The 8th of 15 equal daytime Muhurtas','பகல் நேரத்தின் 15 சம முகூர்த்தங்களில் 8-வது')+'</span></article>'+
    '<article class="cal-shoolam-card"><small>'+L('Travel Shoolam','பயண சூலம்')+'</small><strong>'+(ta()?shool.directionTa:shool.directionEn)+'</strong><span>'+L('Pariharam','பரிகாரம்')+': '+(ta()?shool.remedyTa:shool.remedyEn)+'</span></article>'+
   '</div>';

  const yogaRow=[...($('#calDaily')?.querySelectorAll('.panchang-data-table tbody tr')||[])].find(row=>/^(Yoga|யோகம்)$/i.test(row.cells?.[0]?.textContent?.trim()||''));
  if(yogaRow){
   yogaRow.classList.add('cal-name-yoga-row');
   yogaRow.cells[0].classList.add('cal-name-yoga-label');
   yogaRow.cells[0].textContent=L('Name Yoga','நாம யோகம்');
   const yogaName=String(p?.yoga?.name||'').trim();
   const yogaResult=nityaYogaResults[yogaName];
   if(yogaResult&&yogaRow.cells[1]){
    const result=document.createElement('small');
    result.className='cal-name-yoga-result';
    result.textContent=ta()?yogaResult[1]:yogaResult[0];
    yogaRow.cells[1].append(document.createElement('br'),result);
   }
  }
 }

 function renderDaily(){if(!daily)return;const lang=ta()?'ta':'en';const now=localNow(),minute=+now.slice(11,13)*60+ +now.slice(14,16),sunrise=Number(String(daily.en.p.sunrise||'').slice(0,2))*60+Number(String(daily.en.p.sunrise||'').slice(3,5)),beforeSunrise=selected===now.slice(0,10)&&Number.isFinite(sunrise)&&minute<sunrise,horaOverride=beforeSunrise?daily.en.previousNight:null;window.SMVRenderDaily(daily[lang].t,daily[lang].p,lang,'calDaily',horaOverride);
 // Calendar localisation is isolated from the stored horoscope and never recalculates it.
 const dict=new Map([...signs,...stars,...planets,...[['Transit Chart','கோச்சாரச் சக்கரம்'],['Transit Planetary Positions','கோச்சார கிரக நிலைகள்'],['Planet','கிரகம்'],['Rasi','ராசி'],['Degree','பாகை'],['Nakshatra','நட்சத்திரம்'],['Pada','பாதம்'],['Status','நிலை'],['Retrograde','வக்கிரம்'],['Direct','நேர்கதி'],['Asc','லக்னம்'],['Su','சூ'],['Mo','சந்'],['Ma','செ'],['Me','பு'],['Ju','கு'],['Ve','சு'],['Sa','சனி'],['Ra(R)','ரா(R)'],['Ke(R)','கே(R)']]]);
 if(ta()){for(const [a,b] of [['Su','சூ'],['Mo','சந்'],['Ma','செ'],['Me','பு'],['Ju','கு'],['Ve','சு'],['Sa','சனி']])dict.set(a+'(R)',b+'(R)');const walker=document.createTreeWalker($('#calDaily'),NodeFilter.SHOW_TEXT);while(walker.nextNode()){const node=walker.currentNode;node.textContent=node.textContent.replace('Transit தேதி/நேரம்:','கோச்சார தேதி/நேரம்:').replace(/\bto\b/g,'முதல்');for(const [en,tamil]of dict)if(node.textContent.trim()===en||node.textContent.trim()==='🪐 '+en){node.textContent=node.textContent.replace(en,tamil);break}}}
 updateHora();renderExtra();renderMonth();
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
   td.className='hora-time'+(h.planetEn===lord?' smv-hora-bright-'+(green?'green':'red'):current?' smv-hora-current-'+(green?'green':'red'):'');
   td.closest('tr').classList.toggle('cal-current-hora',current);
   td.setAttribute('aria-label',`${h.range}${current?L(' · Current Hora',' · தற்போதைய ஹோரை'):''}`);
  });
 }
 async function load(anchor=null){const request=++dayRequest;daily=null;host.setAttribute('aria-busy','true');$('#calStatus').textContent=L('Calculating Panchang, Hora and transits…','பஞ்சாங்கம், ஹோரை மற்றும் கோச்சாரக் கணக்கீடு நடைபெறுகிறது…');try{const resultDay=await workerCall('day',input(selected));if(request!==dayRequest)return;daily=resultDay;$('#calStatus').textContent=`${cfg.place} · ${selected} · ${daily.en.t.requested.time} · UTC ${+cfg.offset/60}`;renderDaily();const key=selected.slice(0,7);if(!month||monthKey!==key){const mr=++monthRequest,hadMonth=!!month;if(!hadMonth)$('#calMonth').textContent=L('Loading monthly calendar…','மாத நாட்காட்டி தயாராகிறது…');const ck=monthCacheKey(key);let result=monthCache.get(ck);if(!result){result=await workerCall('month',input(key+'-01'));rememberMonth(ck,result);}if(request!==dayRequest||mr!==monthRequest)return;monthKey=key;month=result;renderMonth();}if(request===dayRequest){host.removeAttribute('aria-busy');restoreViewport(anchor)}}catch(e){if(request===dayRequest){host.removeAttribute('aria-busy');$('#calStatus').textContent=L('Unable to calculate. Check the location and retry.','கணக்கிட முடியவில்லை. இட விவரங்களைச் சரிபார்த்து மீண்டும் முயலவும்.');const b=document.createElement('button');b.textContent=L('Retry','மீண்டும் முயல்க');b.onclick=()=>load(anchor);$('#calStatus').append(b);restoreViewport(anchor);console.error(e)}}}
 shell();load();window.addEventListener('smv-language',()=>{shell();renderDaily();renderMonth()});
 let lastDate=localNow().slice(0,10);setInterval(()=>{if(document.hidden)return;const date=localNow().slice(0,10);if(lastDate!==date&&selected===lastDate){selected=date;$('#calDate').value=date;lastDate=date;load()}else updateHora()},60000);
 addEventListener('pagehide',()=>{locationSearchAbort?.abort();clearTimeout(locationSearchTimer);try{worker?.terminate()}catch{}worker=null;pending.clear()},{once:true});
}
