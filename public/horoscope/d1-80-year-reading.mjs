/* SMV ASTRO V273 — age-boundary-safe D1 0–80-year timeline.
   Triggered ONLY after authorized Full Horoscope; no Firebase/API/network calls.
   Real Vimshottari MD/AD boundaries come from full.chart.dashas.periods.
   Jupiter/Saturn/Rahu/Ketu future positions come from local Swiss WASM.
   Seven-day sampling + date bisection records zodiac changes to one calendar day;
   a brief excursion entirely between two samples could be missed.
   80 years is a reporting horizon, NOT an assertion about length of life.
   Report is bilingual, year-scoped, and narrative/evidence-linked.
*/
import {calculateSwiss} from './offline/swiss_vedic.browser.mjs';
import {transit} from './offline/transit_panchang.browser.mjs';
const ZTA=['மேஷம்','ரிஷபம்','மிதுனம்','கடகம்','சிம்மம்','கன்னி','துலாம்','விருச்சிகம்','தனுசு','மகரம்','கும்பம்','மீனம்'];
const ZEN=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const KEY=['Jupiter','Saturn','Rahu','Ketu'],KTA={Jupiter:'குரு',Saturn:'சனி',Rahu:'ராகு',Ketu:'கேது'};
const ALIAS={'குரு':'Jupiter','சனி':'Saturn','ராகு':'Rahu','கேது':'Ketu',Jupiter:'Jupiter',Saturn:'Saturn',Rahu:'Rahu',Ketu:'Ketu'};
const ONE_DAY=86400000;
const safe=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const day=date=>{const d=new Date(`${date}T00:00:00Z`);if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==date)throw Error('Invalid date '+date);return d.getTime()};
const stamp=t=>new Date(t).toISOString().slice(0,10);
const yearAfter=(birth,n)=>{const d=new Date(day(birth));const y=d.getUTCFullYear()+n,month=d.getUTCMonth(),date=d.getUTCDate();d.setUTCFullYear(y);if(d.getUTCMonth()!==month) d.setUTCDate(0);return stamp(d.getTime());};
function sourceInput(full,payload){
 const c=full?.chart||full,v=c?.swissValidation||{},s=c?.birth||{};
 const lat=Number(payload?.lat??payload?.latitude??v.latitude??s.lat),lon=Number(payload?.lon??payload?.longitude??v.longitude??s.lon);
 const utcOffsetMinutes=Number(payload?.utcOffsetMinutes??v.utcOffsetMinutes??330);
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||!Number.isFinite(utcOffsetMinutes)||lat< -90||lat>90||lon< -180||lon>180)throw Error('Birth coordinates are missing for 80-year transit calculation.');
 return {lat,lon,utcOffsetMinutes,language:'ta',time:'12:00'};
}
function birthDate(full){const c=full?.chart||full;return c?.birthDate||c?.birth?.date||c?.birth?.birthDate||null;}
function getSign(p){if(Number.isFinite(Number(p?.longitude)))return Math.floor(((Number(p.longitude)%360)+360)%360/30);const idx=ZTA.indexOf(p?.rasi);return idx>=0?idx:ZEN.indexOf(p?.rasi);}
function four(tr){if(!Array.isArray(tr?.planets))throw Error('Swiss transit does not provide planets');const out={};for(const p of tr.planets){const key=ALIAS[p?.name];if(key&&KEY.includes(key)){const sign=getSign(p);if(sign<0)throw Error('Missing transit sign '+key);out[key]={sign,retrograde:!!p.retrograde};}}if(KEY.some(p=>!out[p]))throw Error('Missing four slow-moving transit placements');return out;}
function stage(n){return n<5?'early':n<=17?'school':n<=24?'emerging':n<=59?'adult':n<=69?'mature':'senior';}
function reduceTopic(t,ta){const rows=t.paragraphs||[];const choices=rows.filter(x=>x?.evidence?.planet||x?.evidence?.signal!==undefined||x?.evidence?.md);
 return choices.length?choices.slice(0,2).map(x=>x.text).join(' '):(rows[0]?.text||'');}
/* V279: A rolling forecast begins at the actual report reference date, not at birth.
   Age remains calculated FROM BIRTH. Vimshottari re-enters its 120-year cycle
   after the already calculated source periods are exhausted. */
const ORDER=['கேது','சுக்கிரன்','சூரியன்','சந்திரன்','செவ்வாய்','ராகு','குரு','சனி','புதன்'];
const DURATION=[7,20,6,10,7,18,16,19,17];
const PLANET_EN={Ketu:'கேது',Venus:'சுக்கிரன்',Sun:'சூரியன்',Moon:'சந்திரன்',Mars:'செவ்வாய்',Rahu:'ராகு',Jupiter:'குரு',Saturn:'சனி',Mercury:'புதன்'};
const yearsAge=(born,at)=>{let n=+at.slice(0,4)-+born.slice(0,4);if(at.slice(5)<born.slice(5))n--;return n;};
function extendDashaSequence(source,limit){
 const rows=source.slice();
 if(!rows.length)throw Error('No Mahadasha periods were supplied.');
 let tail=rows[rows.length-1],cursor=day(tail.end),n=0;
 while(cursor<limit){
  if(++n>25)throw Error('Vimshottari continuation exceeded 25 periods');
  const last=ORDER.indexOf(PLANET_EN[tail.lord]||tail.lord);
  if(last<0)throw Error('Unsupported Vimshottari lord: '+String(tail.lord));
  const index=(last+1)%9,mdLord=ORDER[index],years=DURATION[index],mdStart=stamp(cursor),mdEnd=yearAfter(mdStart,years);
  const stop=day(mdEnd),fullDays=(stop-cursor)/ONE_DAY;
  const ads=[],parts=[];for(let j=0;j<9;j++)parts.push(DURATION[(index+j)%9]);
  let cumulative=0,left=cursor;
  for(let j=0;j<9;j++){
   cumulative+=parts[j];const right=j===8?stop:(cursor+Math.round(fullDays*cumulative/120)*ONE_DAY);
   ads.push({lord:ORDER[(index+j)%9],start:stamp(left),end:stamp(right)});left=right;
  }
  tail={lord:mdLord,start:mdStart,end:mdEnd,antardashas:ads,derivedContinuation:true};
  rows.push(tail);cursor=stop;
 }
 return rows;
}
function clipPeriods(full,referenceDate){
 const born=birthDate(full);if(!born)throw Error('Birth date missing');
 const requested=referenceDate||stamp(Date.now());day(requested);
 const begin=requested<born?born:requested; // never issue a negative-age forecast
 const end=yearAfter(begin,80),start=day(begin),limit=day(end),chart=full?.chart||full;
 const majors=chart?.dashas?.periods;if(!Array.isArray(majors)||!majors.length)throw Error('Mahadasha sequence missing');
 const available=extendDashaSequence(majors,limit),out=[];
 const lifeBoundaries=[4,13,18,25,60,70,80].map(n=>yearAfter(born,n));
 for(const md of available){if(!Array.isArray(md.antardashas))continue;for(const ad of md.antardashas){
  if(!md.start||!ad.start||!md.end||!ad.end)continue;
  const left=Math.max(start,day(md.start),day(ad.start)),right=Math.min(limit,day(md.end),day(ad.end));if(left>=right)continue;
  const from=stamp(left),to=stamp(right),breaks=[from,...lifeBoundaries.filter(x=>x>from&&x<to),to];
  for(let i=0;i<breaks.length-1;i++)out.push({md:md.lord,ad:ad.lord,from:breaks[i],to:breaks[i+1],age:Math.max(0,yearsAge(born,breaks[i])),stageSplit:breaks.length>2,derivedContinuation:!!md.derivedContinuation});
 }}
 out.sort((a,b)=>a.from.localeCompare(b.from));
 if(!out.length||out[0].from!==begin||out[out.length-1].to!==end||out.some((x,i)=>i>0&&out[i-1].to!==x.from))
  throw Error('Mahadasha/Bhukti intervals do not continuously cover the next 80 years.');
 return {birth:born,referenceDate:begin,end,periods:out,continuationCount:out.filter(x=>x.derivedContinuation).length};
}
function dashaNarrative(full,periods,language){
 const core=globalThis.SMVTimePredictionD1;if(!core||typeof core.renderDasha!=='function')throw Error('Current Dasha reading engine unavailable');
 const entries=[];
 const linkedSeen=new Set(); // retain distinct house- and period-specific evidence
 for(const p of periods){const reading=core.renderDasha(full,p.from,language);if(!reading.ok)throw Error('Dasha reading missing at '+p.from+': '+reading.reason);
  entries.push({...p,topics:reading.topics.map(t=>({number:t.number,title:t.title,positive:(t.paragraphs[0]||{}).text||'',negative:(t.paragraphs[1]||{}).text||'',linked:t.paragraphs.slice(2).filter(x=>x.evidence?.relatedHouse||x.evidence?.signal!==undefined||x.evidence?.planet||x.evidence?.md).slice(0,3).map(x=>x.text).filter(text=>{const key=p.from+'|'+t.number+'|'+text;if(linkedSeen.has(key))return false;linkedSeen.add(key);return true;}),health:[1,6,8,12].includes(t.number)?t.paragraphs.find(x=>x.text.includes('மருத்துவ')||x.text.includes('preventive care'))?.text||'':''}))});
 }
 return entries;
}
async function computeTransitTimeline(full,payload,{onProgress,signal}={}){
 const dates=clipPeriods(full,payload?.referenceDate),born=day(dates.referenceDate),end=day(dates.end),input=sourceInput(full,payload),store=new Map();
 const dateData=t=>{const key=stamp(t);if(store.has(key))return store.get(key);const data=four(transit({...input,date:key}));store.set(key,data);return data;};
 // Initialize the same local Swiss WASM used by the existing horoscope engine.
 await calculateSwiss({...input,date:dates.referenceDate});
 let last=born,lastPos=dateData(born),events=[],samples=[],step=7*ONE_DAY,iterations=0;
 const pushEvent=(planet,a,b,oldSign,newSign)=>{let lo=a,hi=b;while(hi-lo>ONE_DAY){const mid=lo+Math.floor((hi-lo)/(2*ONE_DAY))*ONE_DAY;const snap=dateData(mid);if(snap[planet].sign===oldSign)lo=mid;else hi=mid;}events.push({date:stamp(hi),planet,from:oldSign,to:newSign,positions:dateData(hi)});};
 for(let cursor=Math.min(born+step,end);;cursor=Math.min(cursor+step,end)){
  if(signal?.aborted)throw new Error('80-year generation was cancelled.');
  const next=dateData(cursor);
  for(const planet of KEY)if(next[planet].sign!==lastPos[planet].sign)pushEvent(planet,last,cursor,lastPos[planet].sign,next[planet].sign);
  iterations++;
  if(iterations%70===0){onProgress?.({stage:'transit',done:cursor-born,total:end-born});await new Promise(resolve=>setTimeout(resolve,0));}
  last=cursor;lastPos=next;if(cursor===end)break;
 }
 // The yearly focus uses an exact (calculated) midway snapshot, not invented long-range transit positions.
 for(let y=0;y<80;y++){
  const from=yearAfter(dates.referenceDate,y),to=yearAfter(dates.referenceDate,y+1),mid=stamp(day(from)+Math.floor((day(to)-day(from))/(2*ONE_DAY))*ONE_DAY);
  samples.push({age:yearsAge(dates.birth,from),forecastYear:y+1,from,to,date:mid,pos:dateData(day(mid)),events:events.filter(e=>e.date>=from&&e.date<to)});
 }
 return {birth:dates.birth,referenceDate:dates.referenceDate,end:dates.end,years:samples,events,stepDays:7,precision:'sign-change date refined to a daily boundary after seven-day sampling; very short reversals between samples cannot be ruled out',samplesChecked:store.size};
}
function transitNarrative(full,timeline,language){
 const core=globalThis.SMVTimePredictionD1;if(!core?.renderTransit)throw Error('Transit interpreter unavailable');
 const years=[];
 const yearParagraphSeen=new Map(); // same wording without new transit evidence is referred to, not reprinted
 for(const y of timeline.years){const arr=KEY.map(planet=>({name:language==='en'?planet:KTA[planet],rasi:(language==='en'?ZEN:ZTA)[y.pos[planet].sign],retrograde:y.pos[planet].retrograde}));
  const alt={...full,transit:{requested:{date:y.date},planets:arr}};
  const data=core.renderTransit(alt,y.date,language);
  if(!data.ok)throw Error('Could not read transit window '+y.from);
  years.push({...y,topics:data.topics.map(t=>{const retained=[],evidence=[],previousAges=[];
   for(const z of t.paragraphs.slice(0,2)){
    const txt=String(z.text||'').trim();if(!txt)continue;
    if(yearParagraphSeen.has(txt)){previousAges.push(yearParagraphSeen.get(txt));continue;}
    yearParagraphSeen.set(txt,y.age);retained.push(txt);evidence.push(z.evidence);
   }
   return {number:t.number,title:t.title,paragraphs:retained,evidence,repeatedFrom:previousAges.length?Math.min(...previousAges):null};
  })});
 }
 return years;
}
function eventNarrative(full,timeline,language){
 const core=globalThis.SMVTimePredictionD1;if(!core?.renderTransit)throw Error('Transit interpreter unavailable');
 const seenEventText=new Set();
 return timeline.events.map(event=>{
  const planets=KEY.map(planet=>({name:language==='en'?planet:KTA[planet],rasi:(language==='en'?ZEN:ZTA)[event.positions[planet].sign],retrograde:event.positions[planet].retrograde}));
  const interpretation=core.renderTransit({...full,transit:{requested:{date:event.date},planets}},event.date,language);
  if(!interpretation.ok)throw Error('Missing ingress interpretation '+event.date);
  const activated=interpretation.topics.map(topic=>{
   const picked=topic.paragraphs.filter(x=>x.evidence?.planet===event.planet||x.evidence?.impacts?.some?.(z=>z.planet===event.planet));
   const score=picked.reduce((v,x)=>v+(x.evidence?.signal??0),0);
   return {number:topic.number,title:topic.title,score,paragraphs:picked.slice(0,2).map(x=>x.text).filter(str=>{if(seenEventText.has(str))return false;seenEventText.add(str);return true;})};
  }).filter(x=>x.paragraphs.length).sort((a,b)=>Math.abs(b.score)-Math.abs(a.score)||a.number-b.number).slice(0,4);
  return {date:event.date,planet:event.planet,from:event.from,to:event.to,topics:activated};
 });
}
function dashaHTML(entries,lang='ta'){
 const ta=lang!=='en';
 return `<div class="smv-80-content" data-long-dasha="1"><h3>${ta?'அறிக்கைத் தேதியிலிருந்து அடுத்த 80 ஆண்டுகள் — தசா–புக்திகள்':'Next 80 years from report date — Dasha and Bhukti'}</h3>
 <p>${ta?'இது கணக்கீட்டின் கால எல்லை மட்டுமே; ஜாதகரின் ஆயுள் அளவைப் பற்றிய முடிவு அல்ல. ஒவ்வொரு காலத்திலும் சாதகப் போக்கும் சவாலான போக்கும் தனித்தனியாகக் காட்டப்படுகின்றன.':'This is the 80-year reporting horizon, not a lifespan estimate. Supportive and challenging tendencies are distinguished in each period.'}</p>
 ${entries.map((x,i)=>`<details class="smv-80-window" ${i===0?'open':''}><summary>${ta?`${safe(x.md)} மகாதசை · ${safe(x.ad)} புக்தி`:`${safe(x.md)} Mahadasha · ${safe(x.ad)} Bhukti`} — ${x.from} – ${x.to} (${ta?'வயது':'age'} ${x.age}; ${ta?(x.age<4?'பிஞ்சுப் பருவம்':x.age<13?'குழந்தைப் பருவம்':x.age<18?'பதின்ம வயது':x.age<25?'இளமை':x.age<60?'பொறுப்புப் பருவம்':x.age<70?'முதிர் பருவம்':'மூத்த வயது'):(x.age<4?'early childhood':x.age<13?'childhood':x.age<18?'teenage':x.age<25?'early adulthood':x.age<60?'adulthood':x.age<70?'later adulthood':'older adulthood')})</summary>${x.topics.map(t=>`<section class="smv-80-topic"><h4>${t.number}. ${safe(t.title)}</h4><p>${safe(t.positive)}</p><p>${safe(t.negative)}</p>${t.linked.map(s=>`<p>${safe(s)}</p>`).join('')}${t.health?`<p class="smv-80-health">${safe(t.health)}</p>`:''}</section>`).join('')}</details>`).join('')}</div>`;
}
function transitHTML(timeline,years,events=[],lang='ta'){
 const ta=lang!=='en';
 return `<div class="smv-80-content" data-long-transit="1"><h3>${ta?'அறிக்கைத் தேதியிலிருந்து அடுத்த 80 ஆண்டுகள் — குரு, சனி, ராகு, கேது':'Next 80 years from report date — Jupiter, Saturn, Rahu, Ketu'}</h3>
 <p>${ta?'அறிக்கைத் தேதியிலிருந்து ஒவ்வொரு அடுத்த ஆண்டின் நடுவில் கணக்கிடப்பட்ட கோச்சார நிலைகளின் 12 பாவ விளக்கம்; ஆண்டு முழுவதும் நிலைகள் மாறாதவை அல்ல. கீழே கொடுக்கப்பட்ட பெயர்ச்சி மாற்றத் தேதிகள் தனியே கணக்கிடப்பட்டவை. இது நோய் அல்லது ஆயுள் முடிவை நிர்ணயிக்கும் முறை அல்ல.':'Each forecast year reading uses a calculated midpoint transit snapshot and 12 natal areas, not unchanged planets for the entire year. Sign transitions are listed for the year. It cannot determine illness or lifespan.'}</p>
 <p>${ta?'கோச்சார தேதித் துல்லியம்: ஏழு நாட்களுக்கு ஒருமுறை பரிசோதித்து, கண்டறிந்த ராசி மாறுதலை நாள் எல்லை வரை நுணுக்கமாகத் தேடியது. ஏழு நாளுக்குள் முழுமையாக நிகழ்ந்து திரும்பும் அரிய வக்ர மாற்றங்கள் தவறியிருக்கலாம்.':'Precision: sampled at seven-day intervals, detected changes narrowed to a day; short reversals between samples may be missed.'}</p>
 ${years.map((y,i)=>`<details class="smv-80-window" ${i===0?'open':''}><summary>${ta?'கணிப்பு ஆண்டு':'Forecast year'} ${y.forecastYear} · ${ta?'வயது':'age'} ${y.age}–${y.age+1} · ${y.from} – ${y.to}</summary>
 <p>${ta?'கணக்கிட்ட நடுத்தேதி':'Calculated reference date'}: ${y.date} · ${KEY.map(p=>`${ta?KTA[p]:p} ${(ta?ZTA:ZEN)[y.pos[p].sign]}`).join(' · ')}</p>
 ${y.events.length?`<p><strong>${ta?'இந்த ஆண்டில் கண்டறியப்பட்ட பெயர்ச்சி ராசி மாற்றங்கள்':'Detected sign changes during this year'}:</strong> ${y.events.map(e=>`${e.date}: ${ta?KTA[e.planet]:e.planet} ${(ta?ZTA:ZEN)[e.from]} → ${(ta?ZTA:ZEN)[e.to]}`).join('; ')}</p>`:''}
 ${y.topics.filter(t=>t.paragraphs.length).map(t=>`<section class="smv-80-topic"><h4>${t.number}. ${safe(t.title)}</h4>${t.paragraphs.map(p=>`<p>${safe(p)}</p>`).join('')}</section>`).join('')}${y.topics.every(t=>!t.paragraphs.length)?`<p>${ta?'இந்த ஆண்டில் புதிதான வலுவான பெயர்ச்சித் தொடர்பு கண்டறியப்படாததால் ஏற்கெனவே கூறிய விளக்கங்களை மீண்டும் அச்சிடவில்லை.':'No newly distinct strong transit links were identified in this yearly snapshot; earlier explanations are not reprinted.'}</p>`:''}
 ${events.filter(e=>e.date>=y.from&&e.date<y.to&&e.topics.length).map(e=>`<section class="smv-80-event"><h4>${e.date} · ${ta?KTA[e.planet]:e.planet}: ${(ta?ZTA:ZEN)[e.from]} → ${(ta?ZTA:ZEN)[e.to]}</h4>${e.topics.map(t=>`<p><strong>${t.number}. ${safe(t.title)}:</strong> ${t.paragraphs.map(safe).join(' ')}</p>`).join('')}</section>`).join('')}</details>`).join('')}
 </div>`;
}
export function translate80Year(full,base,lang='ta'){
 const dasha=dashaNarrative(full,base.dasha.map(x=>({md:x.md,ad:x.ad,from:x.from,to:x.to,age:x.age})),lang);
 const transitYears=transitNarrative(full,base.transitTimeline,lang);
 const transitEvents=eventNarrative(full,base.transitTimeline,lang);
 return {...base,dasha,transitYears,transitEvents,language:lang};
}
export async function build80Year(full,payload,{lang='ta',onProgress,signal}={}){
 const {periods,birth,referenceDate,end,continuationCount}=clipPeriods(full,payload?.referenceDate),dasha=dashaNarrative(full,periods,lang);
 onProgress?.({stage:'dasha',done:1,total:1});
 const transitTimeline=await computeTransitTimeline(full,payload,{onProgress,signal});
 const transitYears=transitNarrative(full,transitTimeline,lang);
 const transitEvents=eventNarrative(full,transitTimeline,lang);
 return {birth,referenceDate,end,dasha,transitYears,transitEvents,transitTimeline,language:lang,meta:{dashaPeriods:dasha.length,transitSignChanges:transitTimeline.events.length,ageYears:80,fromReportDate:referenceDate,throughDate:end,derivedContinuations:continuationCount,samplesChecked:transitTimeline.samplesChecked}};
}
export function render80Year(report,lang=report.language||'ta'){
 return {dashaHTML:dashaHTML(report.dasha,lang),transitHTML:transitHTML(report.transitTimeline,report.transitYears,report.transitEvents,lang)};
}
export {clipPeriods,computeTransitTimeline,transitNarrative,sourceInput,yearAfter};
