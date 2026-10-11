/* SMV ASTRO V280 — report-date to 80th-birthday age-boundary-safe D1 timeline.
   Triggered ONLY after authorized Full Horoscope; no Firebase/API/network calls.
   Real Vimshottari MD/AD boundaries come from full.chart.dashas.periods.
   Jupiter/Saturn/Rahu/Ketu future positions come from local Swiss WASM.
   Seven-day sampling + date bisection records zodiac changes to one calendar day;
   a brief excursion entirely between two samples could be missed.
   The 80th birthday is a reporting CUTOFF, NOT an assertion about length of life.
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
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||!Number.isFinite(utcOffsetMinutes)||lat< -90||lat>90||lon< -180||lon>180)throw Error('Birth coordinates are missing for the forecast through age 80.');
 return {lat,lon,utcOffsetMinutes,language:'ta',time:'12:00'};
}
function birthDate(full){const c=full?.chart||full;return c?.birthDate||c?.birth?.date||c?.birth?.birthDate||null;}
function getSign(p){if(Number.isFinite(Number(p?.longitude)))return Math.floor(((Number(p.longitude)%360)+360)%360/30);const idx=ZTA.indexOf(p?.rasi);return idx>=0?idx:ZEN.indexOf(p?.rasi);}
function four(tr){if(!Array.isArray(tr?.planets))throw Error('Swiss transit does not provide planets');const out={};for(const p of tr.planets){const key=ALIAS[p?.name];if(key&&KEY.includes(key)){const sign=getSign(p);if(sign<0)throw Error('Missing transit sign '+key);out[key]={sign,retrograde:!!p.retrograde};}}if(KEY.some(p=>!out[p]))throw Error('Missing four slow-moving transit placements');return out;}
function stage(n){return n<5?'early':n<=17?'school':n<=24?'emerging':n<=59?'adult':n<=69?'mature':'senior';}
function reduceTopic(t,ta){const rows=t.paragraphs||[];const choices=rows.filter(x=>x?.evidence?.planet||x?.evidence?.signal!==undefined||x?.evidence?.md);
 return choices.length?choices.slice(0,2).map(x=>x.text).join(' '):(rows[0]?.text||'');}
/* V280: Forecast starts at report date, but ENDS on the 80th birthday.
   Age is calculated from birth. This does not assume an 80-year lifespan.
   Vimshottari is extended only when existing periods are insufficient. */
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
 const begin=requested<born?born:requested; // no forecast before birth
 // Unlike V279, do not forecast past the person's 80th birthday.
 const end=yearAfter(born,80),start=day(begin),limit=day(end),chart=full?.chart||full;
 // For age 80+, return a clear completed-window result rather than calculating
 // unrequested ages 80–160 or failing the entire horoscope report.
 if(start>=limit)return {birth:born,referenceDate:begin,end,periods:[],continuationCount:0,ageLimitReached:true};
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
  throw Error('Mahadasha/Bhukti intervals do not continuously cover the remaining years up to age 80.');
 return {birth:born,referenceDate:begin,end,periods:out,continuationCount:out.filter(x=>x.derivedContinuation).length};
}
/* V284: Period DIFFERENCE reading, not 12 copies of immutable D1 house evidence.
   Each MD/AD interval still analyzes 12 themes in the existing interpreter.
   Narrate only the themes ACTIVATED by the current operating planets; the
   other themes continue to be represented in the separate full D1 section.
   Never suppress a distinct MD/AD or age-stage transition, and never treat
   recurring natal aspects as newly formed events at a later date.
*/
const PNTA={Sun:'சூரியன்',Moon:'சந்திரன்',Mars:'செவ்வாய்',Mercury:'புதன்',Jupiter:'குரு',Venus:'சுக்கிரன்',Saturn:'சனி',Rahu:'ராகு',Ketu:'கேது'};
const PNA=x=>PNTA[x]||x;
const TO_EN=Object.fromEntries(Object.entries(PNTA).map(([en,ta])=>[ta,en]));
const ENKEY=x=>TO_EN[x]||x;
const BHAVA_MATTER_TA=[
 ['தனித்த முடிவுகள், செயல்வேகம்','உடல் மற்றும் முயற்சியில் அதிகச் சுமை'],
 ['சேமிப்பும் குடும்பப் பேச்சும்','வருமானத்தையும் செலவையும் கலக்குவது'],
 ['புதிய முயற்சி, பயிற்சி, உடன்பிறப்பு தொடர்பு','அவசரமான தகவல் பகிர்வு'],
 ['வீடு, தாய், சொத்து மற்றும் மன அமைதி','வீடு–வேலை பொறுப்புச் சீர்கேடு'],
 ['கற்றல், திட்டமிடல், குழந்தைகள் பற்றிய அணுகுமுறை','எதிர்பார்ப்புகளைப் பிறர்மீது திணித்தல்'],
 ['சேவை, கடன், போட்டி, அன்றாட ஒழுங்கு','வேலைப்பளுவையும் உடல்நலக் கவனிப்பையும் புறக்கணித்தல்'],
 ['திருமண ஒத்துழைப்பு மற்றும் ஒப்பந்தம்','முடிவெடுப்பதில் கருத்து மோதல்'],
 ['மாற்றம், மறைவு, பொறுப்பு மற்றும் பாதுகாப்பு','திட்டமிடாத மாற்றத்தைச் சந்தித்தல்'],
 ['வழிகாட்டுதல், நெறி, மேற்படிப்பு','ஆலோசனையைப் பரிசீலிக்காமல் தவிர்த்தல்'],
 ['தொழில் முடிவுகள், பதவி, கடமை','பொறுப்புகளுக்கு நேரம் ஒதுக்காமல் இருப்பது'],
 ['ஆதாயம், நண்பர்கள், சமூக வட்டம்','வருமானத்தையும் வருவாய் எதிர்பார்ப்பையும் குழப்புதல்'],
 ['செலவு, உறக்கம், தனித்த நேரம்','ஓய்வுக்கும் செலவுக்கும் எல்லை வைக்காதிருத்தல்']];
const MINOR_BHAVA_TA=[
 ['வளர்ச்சி, இயக்கம், சுயபழக்கம்','விளையாட்டில் பாதுகாப்பு மற்றும் ஓய்வு'],
 ['குடும்ப மொழிப் பழக்கம் மற்றும் தேவைகளுக்கான ஆதரவு','குடும்பச் செலவினக் கட்டுப்பாடு'],
 ['கற்றல் முயற்சி, விளையாட்டு, உடன்பிறப்பு உறவு','தகவல் பகிர்வில் அவசரத்தையும் போட்டியையும் குறைத்தல்'],
 ['வீட்டுச் சூழல், பெற்றோர் பராமரிப்பு மற்றும் அமைதி','வீட்டில் ஓய்வும் பாதுகாப்பும் புறக்கணிக்கப்படுதல்'],
 ['கல்வி, விளையாட்டு, நினைவாற்றல் மற்றும் படைப்புத் திறன்','கற்றலை அழுத்தமாக்கும் எதிர்பார்ப்புகள்'],
 ['பள்ளி ஒழுங்கு, ஓய்வு, உடல்நலப் பழக்கம்','படிப்பு–விளையாட்டு சமநிலை குறைதல்'],
 ['ஒத்துழைப்பு, நட்பு மற்றும் மற்றவர்களை மதிக்கும் பழக்கம்','விளையாட்டிலோ பேச்சிலோ பிடிவாதம்'],
 ['மாற்றங்களை ஏற்றுக்கொள்ளும் திறன், குடும்ப பாதுகாப்பு','புதிய சூழலுக்கு போதிய தயாரிப்பு இல்லாமை'],
 ['ஆசிரியர், பெற்றோர் வழிகாட்டுதல் மற்றும் நல்ல பழக்கங்கள்','வழிகாட்டலைக் கேட்காமல் உடனடி முடிவு'],
 ['கல்விப் பயிற்சி, திறன் வளர்ப்பு மற்றும் பொறுப்புணர்வு','வயதுக்கு மீறிய கடமைகள்'],
 ['நண்பர்கள், குழுவிளையாட்டு மற்றும் ஆதரவு','சக மாணவருடன் ஒப்பிட்டுப் பதற்றம்'],
 ['உறக்கம், ஓய்வு, தனிப்பட்ட இடம் மற்றும் பாதுகாப்பு','உறக்கமும் பராமரிப்பும் குறைதல்']];
const BHAVA_MATTER_EN=[
 ['personal decisions and initiative','taking on more than can be sustained'],
 ['savings and family communication','confusing earnings with available savings'],
 ['initiatives, skills and younger relations','rushing important communication'],
 ['home, parents and mental ease','neglecting the balance between home and duties'],
 ['learning, planning and raising children','imposing expectations on others'],
 ['service, debt, competition and daily routines','neglecting health-related routines'],
 ['partnership, consent and agreements','allowing disagreements to become adversarial'],
 ['sudden changes and safety planning','making changes without contingency plans'],
 ['mentoring, higher learning and values','discarding guidance without evaluating it'],
 ['work, career decisions and duty','committing to more work than time allows'],
 ['gains, friends and social circles','mistaking prospective gains for income'],
 ['spending, sleep and personal time','leaving no room for rest or savings']];
function periodTopicProse(full,period,topic,trigger,lang){
 const ta=lang!=='en',d=(globalThis.SMVLifePredictionD1||{}).toD1?.(full?.chart||full);
 const focus=topic.number,mdKey=ENKEY(period.md),adKey=ENKEY(period.ad),major=d?.planets?.[mdKey],sub=d?.planets?.[adKey];
 const matter=(ta?(period.age<18?MINOR_BHAVA_TA:BHAVA_MATTER_TA):BHAVA_MATTER_EN)[focus-1];
 const mi=trigger.mdMarks,ai=trigger.adMarks;
 const direct=(ta? 'பாவாதிபதி':'house-rulership');
 const root=(a,x)=>a.includes('rules')?(ta?'அதிபதியாக':'as ruler'):
     a.includes('occupies')?(ta?'நேரடியாக அமர்ந்து':'by occupation'):
     a.includes('aspects')?(ta?'பார்வையால்':'by aspect'):
     a.includes('conjuncts-lord')?(ta?'பாவ அதிபதியுடன் சேர்ந்து':'by conjunction with the lord'):
     (ta?'பாவத் தொடர்பால்':'through a house link');
 const mdHow=root(mi,period.md),adHow=root(ai,period.ad);
 const same=mdKey===adKey;
 const delta=major&&sub?((sub.house-major.house+12)%12+1):0;
 const sixEight=delta===6||delta===8;
 const ageYoung=period.age<18;
 const otherOwners=a=>d?.houses?.map((h,j)=>h.lord===a?j+1:null).filter(Boolean).join(', ')||'?';
 const role=(key,position,how)=>{
   const owns=otherOwners(key),name=ta?PNA(key):key;
   const ownNumbers=owns==='?'?[]:owns.split(', ').map(x=>x+'-ஆம்');
   const ownPhrase=ownNumbers.length===1?ownNumbers[0]+' பாவத்தின் அதிபதியாக':ownNumbers.join(', ')+' பாவங்களின் அதிபதியாக';
   if(ta)return `${name} ${owns==='?'?'நிழற்கிரகத் தொடர்புடன்':ownPhrase} பிறப்பு ${position.house}-ஆம் பாவத்தில் இருந்து ${how}`;
   return `${name} ${owns==='?'?'as a lunar node':'ruling natal house(s) '+owns} from house ${position.house} (${how})`;
 };
 const driver=major&&sub?(same?
    (ta?`${role(mdKey,major,mdHow)} செயல்படுகிறார்; இந்தப் புக்தியிலும் அதே கிரகம் தொடர்கிறது.`:`${role(mdKey,major,mdHow)}; the same planet governs this subperiod.`):
    (ta?`${role(mdKey,major,mdHow)} செயல்படுகிறார்; புக்திநாதர் ${role(adKey,sub,adHow)} இணைகிறார்.`:
       `${role(mdKey,major,mdHow)}; subperiod ruler ${role(adKey,sub,adHow)} also operates.`)):'';
 const outlook=ta?`இந்தக் காலத்தில் ${matter[0]} குறித்து ஏற்கெனவே எடுத்த முடிவுகளை மாற்றவோ உறுதிப்படுத்தவோ வேண்டிய சூழல் முன்னிலையாகலாம்.`:
   `This period highlights reviewing or sustaining decisions about ${matter[0]}.`;
 const exception=sixEight?(ta?`${PNA(mdKey)}–${PNA(adKey)} காலத்தின் பிறப்புநிலை ${delta}/8 சஷ்டாஷ்டக உறவில் உள்ளதால் ${matter[1]} தொடர்பான அழுத்தத்தைத் தனியாகச் சரிபார்க்க வேண்டும்; இதனால் பாதிப்பு உறுதி என்று பொருளல்ல.`:
   `The natal period lords stand ${delta} houses apart, a 6/8-type strain; check ${matter[1]} without treating this as an inevitable event.`):
   (ta?`${PNA(mdKey)} ${major?.house||'?'}-ஆம் பாவத்திலும் ${PNA(adKey)} ${sub?.house||'?'}-ஆம் பாவத்திலும் இருப்பதால் ${matter[1]} என்ற சவாலை இக்காலத்தின் செயல்பாட்டு பொறுப்புகளுடன் ஒப்பிட்டு ஒழுங்குபடுத்தலாம்.`:
   `Consider the countervailing concern of ${matter[1]} according to actual circumstances.`);
 const age=ageYoung?(ta?(period.age<4?'பிஞ்சு வயதில் பெற்றோர் மற்றும் பராமரிப்பாளரின் ஒழுங்கே இந்தப் பலனின் பொருள்.':period.age<13?'பள்ளி வயதில் கற்றல், உடற்பயிற்சி மற்றும் பெற்றோர் வழிகாட்டலுடன் இந்தக் குறிப்பை வாசிக்க வேண்டும்.':'பதின்ம வயதில் கல்வித் தேர்வும் நண்பர் தொடர்புகளும் முக்கியம்; தனிப்பட்ட தொழில் அல்லது திருமண நிகழ்வாக இதைப் படிக்கக்கூடாது.'):
  'Apply this through caregiver/education routines at the actual age; do not predict adult events for children.'):
  period.age>=70?(ta?'மூத்த வயதில் பொறுப்பைப் பகிர்ந்து ஓய்வு மற்றும் அனுபவப் பரிமாற்றத்துடன் பொருத்த வேண்டும்.':'In later life, consider shared duties, rest and mentoring.'):
  period.age>=60?(ta?'முதிர் பருவத்தில் குடும்பம், பொருளாதாரப் பாதுகாப்பு மற்றும் உடல்நலச் செயல்முறைகளுக்கான ஒழுங்கு முக்கியமானது.':'At this stage, balance family responsibilities, planning and health routines.'):
  period.age<25?(ta?'இளமைப் பருவத்தில் கற்றல், தொழில் தொடக்கம் மற்றும் உறவுகளில் சொந்த முடிவுகளை நிதானமாக மதிப்பிட வேண்டும்.':'For young adults, evaluate education, career entry and relationships without making fixed forecasts.') :'';
 return {positive:[driver,outlook,age].filter(Boolean).join(' '),negative:exception};
}
const DASHA_TOPIC_CAP=4;
function periodTrigger(t){
 const source=t.paragraphs?.[0]?.evidence||{},md=source.md||{},ad=source.ad||{};
 const mdMarks=Array.isArray(md.marks)?md.marks:[],adMarks=Array.isArray(ad.marks)?ad.marks:[];
 const weights={rules:6,occupies:5,aspects:4,'conjuncts-lord':3,'aspects-lord':2};
 const power=marks=>marks.reduce((n,v)=>n+(weights[v]||0),0);
 return {mdMarks,adMarks,power:power(mdMarks)+power(adMarks),hasDirect:!!(mdMarks.length||adMarks.length),source};
}
function dashaNarrative(full,periods,language){
 const core=globalThis.SMVTimePredictionD1;
 if(!core||typeof core.renderDasha!=='function')throw Error('Current Dasha reading engine unavailable');
 const entries=[];
 let previous=null;
 for(const p of periods){
  const reading=core.renderDasha(full,p.from,language);
  if(!reading.ok)throw Error('Dasha reading missing at '+p.from+': '+reading.reason);
  const changes={md:!previous||previous.md!==p.md,ad:!previous||previous.ad!==p.ad,ageStage:!!previous&&previous.stage!==reading.ageStage};
  const ranked=reading.topics.map(t=>({t,trigger:periodTrigger(t)}))
    .filter(x=>x.trigger.hasDirect)
    .sort((a,b)=>b.trigger.power-a.trigger.power||a.t.number-b.t.number);
  const chosen=ranked.slice(0,DASHA_TOPIC_CAP);
  // If a period's operating lords have no usable D1 house links, do not
  // invent life events for all twelve houses. Explain the evidence gap.
  const topics=chosen.map(({t,trigger})=>({
   number:t.number,title:t.title,activation:trigger.power,
   mdMarks:trigger.mdMarks,adMarks:trigger.adMarks,
   ...(()=>{const narrative=periodTopicProse(full,p,t,trigger,language);if(previous&&previous.md===p.md&&previous.ad===p.ad)narrative.negative="";return narrative;})(),
   // Static secondary natal facts belong in the D1 section and must not
   // reappear in each bhukti and each year. Preserve them via evidence only.
   linkedEvidenceCount:(t.paragraphs||[]).slice(2).filter(x=>x.evidence?.relatedHouse||x.evidence?.planet||x.evidence?.md).length
  }));
  entries.push({...p,ageStage:reading.ageStage,changes,reviewedTopics:reading.topics.length,
    inactiveTopicNumbers:reading.topics.filter(t=>!chosen.some(z=>z.t.number===t.number)).map(t=>t.number),topics});
  previous={md:p.md,ad:p.ad,stage:reading.ageStage};
 }
 return entries;
}

async function computeTransitTimeline(full,payload,{onProgress,signal}={}){
 const dates=clipPeriods(full,payload?.referenceDate),born=day(dates.referenceDate),end=day(dates.end);
 if(dates.ageLimitReached)return {birth:dates.birth,referenceDate:dates.referenceDate,end:dates.end,years:[],events:[],stepDays:7,precision:'No forecast remains before age 80',samplesChecked:0};
 const input=sourceInput(full,payload),store=new Map();
 const dateData=t=>{const key=stamp(t);if(store.has(key))return store.get(key);const data=four(transit({...input,date:key}));store.set(key,data);return data;};
 // Initialize the same local Swiss WASM used by the existing horoscope engine.
 await calculateSwiss({...input,date:dates.referenceDate});
 let last=born,lastPos=dateData(born),events=[],samples=[],step=7*ONE_DAY,iterations=0;
 const pushEvent=(planet,a,b,oldSign,newSign)=>{let lo=a,hi=b;while(hi-lo>ONE_DAY){const mid=lo+Math.floor((hi-lo)/(2*ONE_DAY))*ONE_DAY;const snap=dateData(mid);if(snap[planet].sign===oldSign)lo=mid;else hi=mid;}events.push({date:stamp(hi),planet,from:oldSign,to:newSign,positions:dateData(hi)});};
 for(let cursor=Math.min(born+step,end);;cursor=Math.min(cursor+step,end)){
  if(signal?.aborted)throw new Error('Transit generation through age 80 was cancelled.');
  const next=dateData(cursor);
  for(const planet of KEY)if(next[planet].sign!==lastPos[planet].sign)pushEvent(planet,last,cursor,lastPos[planet].sign,next[planet].sign);
  iterations++;
  if(iterations%70===0){onProgress?.({stage:'transit',done:cursor-born,total:end-born});await new Promise(resolve=>setTimeout(resolve,0));}
  last=cursor;lastPos=next;if(cursor===end)break;
 }
 // The yearly focus uses an exact (calculated) midway snapshot, not invented long-range transit positions.
 // Generate only the remaining full/partial reporting years. E.g. age 34
 // gets 45 full years plus a final partial year ending exactly at age 80.
 for(let y=0;;y++){
  const from=yearAfter(dates.referenceDate,y);
  if(day(from)>=end)break;
  const candidate=yearAfter(dates.referenceDate,y+1);
  const to=day(candidate)>end?dates.end:candidate;
  const mid=stamp(day(from)+Math.floor((day(to)-day(from))/(2*ONE_DAY))*ONE_DAY);
  samples.push({age:yearsAge(dates.birth,from),forecastYear:y+1,from,to,date:mid,pos:dateData(day(mid)),events:events.filter(e=>e.date>=from&&e.date<to)});
 }
 return {birth:dates.birth,referenceDate:dates.referenceDate,end:dates.end,years:samples,events,stepDays:7,precision:'sign-change date refined to a daily boundary after seven-day sampling; very short reversals between samples cannot be ruled out',samplesChecked:store.size};
}
function transitNarrative(full,timeline,language){
 // A new sign or aspect activation has meaning; the same natal D1 fact
 // repeated on every one of 35 calendar snapshots does not. We store
 // explicit evidence for each annual change and keep untouched natal math.
 const core=globalThis.SMVTimePredictionD1;if(!core?.renderTransit)throw Error('Transit interpreter unavailable');
 const ta=language!=='en',years=[],seen=new Set();
 for(let ix=0;ix<timeline.years.length;ix++){
  const y=timeline.years[ix],prev=timeline.years[ix-1];
  const changed=new Set(y.events.map(e=>e.planet));
  // For the first year the four positions are the factual baseline.
  if(ix===0)KEY.forEach(k=>changed.add(k));
  for(const planet of KEY)if(prev&&prev.pos[planet].sign!==y.pos[planet].sign)changed.add(planet);
  const arr=KEY.map(planet=>({name:ta?KTA[planet]:planet,rasi:(ta?ZTA:ZEN)[y.pos[planet].sign],retrograde:y.pos[planet].retrograde}));
  const reading=core.renderTransit({...full,transit:{requested:{date:y.date},planets:arr}},y.date,language);
  if(!reading.ok)throw Error('Could not read transit window '+y.from);
  const notes=[];
  for(const planet of KEY){if(!changed.has(planet))continue;
   const candidates=[];
   for(const t of reading.topics)for(const para of t.paragraphs){
    const ev=para.evidence;if(ev?.planet!==planet||!ev?.marks?.length)continue;
    const strength=ev.marks.includes('transit-through')?5:ev.marks.includes('transit-aspect')?3:2;
    candidates.push({planet,focus:t.number,title:t.title,evidence:ev,strength});
   }
   candidates.sort((a,b)=>b.strength-a.strength||a.focus-b.focus);
   let used=0;
   for(const c of candidates){if(used>=2)break;
    const k=[planet,y.pos[planet].sign,c.focus,c.evidence.marks.slice().sort().join(',')].join('/');
    if(seen.has(k))continue;seen.add(k);used++;
    const theme=(ta?(y.age<18?MINOR_BHAVA_TA:BHAVA_MATTER_TA):BHAVA_MATTER_EN)[c.focus-1],state=(ta?ZTA:ZEN)[y.pos[planet].sign];
    const mode=c.evidence.marks.includes('transit-through')?(ta?'நேரடியாக கடந்து செல்கிறார்':'passes directly through'):
      c.evidence.marks.includes('transit-aspect')?(ta?'பார்வையால் தொடுகிறார்':'aspects'):(ta?'பிறப்பு பாவாதிபதி நிலையைத் தொடுகிறார்':'contacts the natal house ruler');
    const age=y.age<18?(ta?'குழந்தை/பதின்ம வயதில் இந்தத் தலைப்பு பெற்றோரின் முடிவுகள், பள்ளிப் பயிற்சி அல்லது பாதுகாப்புடன் தொடர்புடையது.':'For a minor this is a caregiver, education or safety theme.'):
      y.age>=70?(ta?'மூத்த வயதுக்கேற்ற ஓய்வு மற்றும் பகிர்ந்த பொறுப்பின் வரம்பை கருத்தில் கொள்ள வேண்டும்.':'Account for later-life rest and shared responsibilities.') :'';
    const impact=ta?
      `${KTA[planet]} ${state} ராசியில் பெயர்ச்சியாகி ${c.focus}-ஆம் பாவத்தின் ${theme[0]} தொடர்பை ${mode}. ${c.evidence.marks.includes('transit-through')?'அந்தத் துறையின் திட்டங்களைக் கவனமாக மறுஆய்வு செய்யலாம்; ':''}${theme[1]} என்ற சவாலைத் தவிர்க்க தற்போதுள்ள சூழலுடன் ஒப்பிட்டே முடிவு எடுக்க வேண்டும். ${age}`:
      `${planet} transits ${state} and ${mode} house ${c.focus}, linked with ${theme[0]}. Avoid ${theme[1]} by checking present circumstances. ${age}`;
    notes.push({...c,text:impact.trim(),natalLord:c.evidence.natalLord,sign:y.pos[planet].sign});
   }
  }
  years.push({...y,topics:[],notes});
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
 const markTA={rules:'பாவ அதிபதியாக',occupies:'அதே பாவத்தில் இருந்து',aspects:'பாவத்தைப் பார்த்து','conjuncts-lord':'பாவ அதிபதியுடன் சேர்ந்து','aspects-lord':'பாவ அதிபதியைப் பார்த்து'};
 const markEN={rules:'as its ruler',occupies:'occupying it',aspects:'aspecting it','conjuncts-lord':'joining its ruler','aspects-lord':'aspecting its ruler'};
 const mark=(xs)=>xs.map(x=>(ta?markTA:markEN)[x]||x).join(ta?', ':', ');
 const summary=entries.map((x,i)=>{
  const stage=ta?(x.age<4?'பிஞ்சுப் பருவம்':x.age<13?'குழந்தைப் பருவம்':x.age<18?'பதின்ம வயது':x.age<25?'இளமை':x.age<60?'பொறுப்புப் பருவம்':x.age<70?'முதிர் பருவம்':'மூத்த வயது'):
       (x.age<4?'early childhood':x.age<13?'childhood':x.age<18?'teenage':x.age<25?'early adulthood':x.age<60?'adulthood':x.age<70?'later adulthood':'older adulthood');
  const label=ta?`${safe(x.md)} மகாதசை · ${safe(x.ad)} புக்தி`:`${safe(x.md)} Mahadasha · ${safe(x.ad)} Bhukti`;
  const changed=x.changes.md?(ta?'புதிய மகாதசை மற்றும் புக்திக் காலத்தின் தொடக்கம்':'A new major and sub-period begins'):
       x.changes.ad?(ta?'மகாதசை தொடர்கிறது; புக்திநாதர் மாறியுள்ளார்':'The major period continues; the sub-period ruler changes'):
       x.changes.ageStage?(ta?'தசை–புக்தி அதே நிலையில் உள்ளது; வயதுப் பருவம் மாறியுள்ளது':'The operating planets are unchanged; the life stage has shifted'):
       (ta?'அதே தசை–புக்தியின் தொடர்ச்சி':'Continuation of the same operating period');
  const topicRows=x.topics.map(t=>{
   const reasons=[];
   if(t.mdMarks.length)reasons.push(ta?`${safe(x.md)} ${safe(mark(t.mdMarks))}`:`${safe(x.md)} ${safe(mark(t.mdMarks))}`);
   if(t.adMarks.length)reasons.push(ta?`${safe(x.ad)} ${safe(mark(t.adMarks))}`:`${safe(x.ad)} ${safe(mark(t.adMarks))}`);
   // Short evidence labels are not extra 'predictions'. The complete causal
   // reading is in the two prose paragraphs; repeating this line as a third
   // paragraph previously inflated the page count without new information.
   const reason=reasons.join(' · ');
   return `<section class="smv-80-topic" data-activation="${t.activation}" data-period-topic="${t.number}"><h4>${t.number}. ${safe(t.title)}</h4><div class="smv-80-evidence">${safe(reason)}</div>${t.positive?`<p>${safe(t.positive)}</p>`:""}${t.negative?`<p>${safe(t.negative)}</p>`:""}</section>`;
  }).join('');
  const inactive=x.inactiveTopicNumbers.length?(ta?
    `மற்ற ${x.inactiveTopicNumbers.length} தலைப்புகள் (பாவங்கள் ${x.inactiveTopicNumbers.join(', ')}) இந்தப் புக்தியில் நேரடி புதிய தசாநாதர்/புக்திநாதர் தொடர்பைப் பெறவில்லை. அவற்றின் நிலையான D1 ஆதாரங்களை முதல் பகுதியில் வாசிக்கவும்; கால நிகழ்வுகளை ஊகித்துச் சேர்க்கவில்லை.`:
    `The other ${x.inactiveTopicNumbers.length} topics (houses ${x.inactiveTopicNumbers.join(', ')}) have no newly active direct D1 period link. See section I for natal baseline; no period event has been invented.`):'';
  return `<details class="smv-80-window" ${i===0?'open':''}><summary>${label} — ${x.from} – ${x.to} (${ta?'வயது':'age'} ${x.age}; ${stage})</summary><div class="smv-80-change">${changed} · ${ta?'நேரடித் தொடர்புள்ளவை':'directly activated'}: ${x.topics.length}/12</div>${topicRows}${inactive?`<div class="smv-80-unlinked">${safe(inactive)}</div>`:''}</details>`;
 });
 return `<div class="smv-80-content" data-long-dasha="1" data-narrative="evidence-change-v285"><h3>${ta?'அறிக்கைத் தேதியிலிருந்து 80 வயது வரை — தசா–புக்திகள்':'Dasha and Bhukti — report date until age 80'}</h3>
 <p>${ta?'ஜாதகம் உருவாக்கிய நாளிலிருந்து 80-வது பிறந்த நாள் வரை மட்டுமே. இது ஆயுள் அளவைக் குறிக்கவில்லை. ஒவ்வொரு புக்தியிலும் நேரடியாகச் செயல்படும் கிரக–பாவ ஆதாரத்திற்கே முன்னுரிமை; நிலையான பிறப்பு ஜாதகக் காரணங்களை எல்லாக் காலங்களிலும் திரும்ப அச்சிடவில்லை.':'From report date until the 80th birthday only; NOT an estimate of lifespan. Period-linked D1 evidence is prioritized instead of repeating immutable natal descriptions.'}</p>
 ${!entries.length?`<p>${ta?'80 வயதிற்கு மேல் புதிய காலப்பலன்கள் இல்லை.':'No further forecast after age 80.'}</p>`:''}${summary.join('')}</div>`;
}

function transitHTML(timeline,years,events=[],lang='ta'){
 const ta=lang!=='en';
 return `<div class="smv-80-content" data-long-transit="1"><h3>${ta?'அறிக்கைத் தேதியிலிருந்து 80 வயது வரை — குரு, சனி, ராகு, கேது':'Transits — report date until age 80 (Jupiter, Saturn, Rahu, Ketu)'}</h3>
 <p>${ta?'அறிக்கைத் தேதியிலிருந்து ஒவ்வொரு அடுத்த ஆண்டின் நடுவில் கணக்கிடப்பட்ட கோச்சார நிலைகளின் 12 பாவ விளக்கம்; ஆண்டு முழுவதும் நிலைகள் மாறாதவை அல்ல. கீழே கொடுக்கப்பட்ட பெயர்ச்சி மாற்றத் தேதிகள் தனியே கணக்கிடப்பட்டவை. இது நோய் அல்லது ஆயுள் முடிவை நிர்ணயிக்கும் முறை அல்ல.':'Each forecast year reading uses a calculated midpoint transit snapshot and 12 natal areas, not unchanged planets for the entire year. Sign transitions are listed for the year. It cannot determine illness or lifespan.'}</p>
 <p>${ta?'கோச்சார தேதித் துல்லியம்: ஏழு நாட்களுக்கு ஒருமுறை பரிசோதித்து, கண்டறிந்த ராசி மாறுதலை நாள் எல்லை வரை நுணுக்கமாகத் தேடியது. ஏழு நாளுக்குள் முழுமையாக நிகழ்ந்து திரும்பும் அரிய வக்ர மாற்றங்கள் தவறியிருக்கலாம்.':'Precision: sampled at seven-day intervals, detected changes narrowed to a day; short reversals between samples may be missed.'}</p>
 ${!years.length?`<p>${ta?'80 வயதை அடைந்துவிட்டதால் இந்த வயது வரம்பிற்குள் புதிய கோச்சாரக் காலப்பலன்கள் இல்லை.':'No transit forecast remains within the age-80 limit.'}</p>`:''}
 ${years.map((y,i)=>`<details class="smv-80-window" ${i===0?'open':''}><summary>${ta?'கணிப்பு ஆண்டு':'Forecast year'} ${y.forecastYear} · ${ta?'வயது':'age'} ${y.age}–${y.age+1} · ${y.from} – ${y.to}</summary>
 <p>${ta?'கணக்கிட்ட நடுத்தேதி':'Calculated reference date'}: ${y.date} · ${KEY.map(p=>`${ta?KTA[p]:p} ${(ta?ZTA:ZEN)[y.pos[p].sign]}`).join(' · ')}</p>
 ${y.events.length?`<p><strong>${ta?'இந்த ஆண்டில் கண்டறியப்பட்ட பெயர்ச்சி ராசி மாற்றங்கள்':'Detected sign changes during this year'}:</strong> ${y.events.map(e=>`${e.date}: ${ta?KTA[e.planet]:e.planet} ${(ta?ZTA:ZEN)[e.from]} → ${(ta?ZTA:ZEN)[e.to]}`).join('; ')}</p>`:''}
 ${y.notes.map(n=>`<section class="smv-80-topic" data-transit-planet="${n.planet}" data-focus-house="${n.focus}"><h4>${n.focus}. ${safe(n.title)}</h4><p>${safe(n.text)}</p></section>`).join('')}${!y.notes.length?'':''}
 ${events.filter(e=>e.date>=y.from&&e.date<y.to&&e.topics.length).map(e=>`<section class="smv-80-event"><h4>${e.date} · ${ta?KTA[e.planet]:e.planet}: ${(ta?ZTA:ZEN)[e.from]} → ${(ta?ZTA:ZEN)[e.to]}</h4>${e.topics.map(t=>`<p><strong>${t.number}. ${safe(t.title)}:</strong> ${t.paragraphs.map(safe).join(' ')}</p>`).join('')}</section>`).join('')}</details>`).join('')}
 </div>`;
}
export function translate80Year(full,base,lang='ta'){
 const dasha=dashaNarrative(full,base.dasha.map(x=>({md:x.md,ad:x.ad,from:x.from,to:x.to,age:x.age})),lang);
 const transitYears=transitNarrative(full,base.transitTimeline,lang);
 const transitEvents=[]; // date-level changes already listed with each forecast year
 return {...base,dasha,transitYears,transitEvents,language:lang};
}
export async function build80Year(full,payload,{lang='ta',onProgress,signal}={}){
 const {periods,birth,referenceDate,end,continuationCount,ageLimitReached}=clipPeriods(full,payload?.referenceDate),dasha=ageLimitReached?[]:dashaNarrative(full,periods,lang);
 onProgress?.({stage:'dasha',done:1,total:1});
 const transitTimeline=ageLimitReached?{birth,referenceDate,end,years:[],events:[],stepDays:7,precision:'No forecast remains before age 80',samplesChecked:0}:await computeTransitTimeline(full,payload,{onProgress,signal});
 const transitYears=ageLimitReached?[]:transitNarrative(full,transitTimeline,lang);
 const transitEvents=[]; // no repeated prose for each ingress; preserve real ingress dates
 return {birth,referenceDate,end,dasha,transitYears,transitEvents,transitTimeline,language:lang,meta:{dashaPeriods:dasha.length,transitSignChanges:transitTimeline.events.length,forecastYears:transitTimeline.years.length,untilAge:80,ageLimitReached:!!ageLimitReached,fromReportDate:referenceDate,throughDate:end,derivedContinuations:continuationCount,samplesChecked:transitTimeline.samplesChecked}};
}
export function render80Year(report,lang=report.language||'ta'){
 return {dashaHTML:dashaHTML(report.dasha,lang),transitHTML:transitHTML(report.transitTimeline,report.transitYears,report.transitEvents,lang)};
}
export {clipPeriods,computeTransitTimeline,transitNarrative,sourceInput,yearAfter};
