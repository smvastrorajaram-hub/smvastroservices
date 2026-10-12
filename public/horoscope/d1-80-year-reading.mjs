/* SMV ASTRO V293 — report-date to 80th-birthday age-boundary-safe D1 timeline.
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
const ALIAS={'குரு':'Jupiter','சனி':'Saturn','ராகு':'Rahu','கேது':'Ketu','சூரியன்':'Sun','சந்திரன்':'Moon','செவ்வாய்':'Mars','புதன்':'Mercury','சுக்கிரன்':'Venus',Jupiter:'Jupiter',Saturn:'Saturn',Rahu:'Rahu',Ketu:'Ketu',Sun:'Sun',Moon:'Moon',Mars:'Mars',Mercury:'Mercury',Venus:'Venus'};
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
function four(tr){if(!Array.isArray(tr?.planets))throw Error('Swiss transit does not provide planets');const out={};for(const p of tr.planets){const key=ALIAS[p?.name];if(key){const sign=getSign(p);if(sign<0){if(KEY.includes(key))throw Error('Missing transit sign '+key);continue;}out[key]={sign,retrograde:!!p.retrograde};}}if(KEY.some(p=>!out[p]))throw Error('Missing four slow-moving transit placements');return out;}
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
const MINOR_BHAVA_EN=[
 ['personal development and habits','rushing into new habits'],
 ['family communication and practical needs','taking on adult financial concerns'],
 ['age-appropriate skill practice and siblings','pressure to compete'],
 ['home safety and caregiver routines','disruption to rest and study'],
 ['learning, play and creative interests','excessive expectations around school'],
 ['school routines, rest and everyday care','losing play or sleep to academic pressure'],
 ['cooperation with peers and caregivers','friction with friends'],
 ['adapting to change with family support','unpreparedness for a new setting'],
 ['learning from teachers and trusted adults','rejecting useful advice too quickly'],
 ['training, skills and small responsibilities','age-inappropriate duties'],
 ['friends, group activities and belonging','unhelpful peer comparisons'],
 ['sleep, rest and familiar routines','late-night screen habits']
];
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
// V293: outcomes refer to the activated house, life stage, and operating period.
// The technical MD/AD facts remain in evidence, not duplicated in each paragraph.
const PERIOD_LIVED_TA=[
 ['தன்னம்பிக்கையுடன் புதிய பொறுப்பை ஏற்கும் அணுகுமுறை உருவாகும்.','அவசர முடிவுகளால் முயற்சியை மீண்டும் திருத்த நேரிடும்.'],
 ['குடும்பத் தேவைகளையும் சேமிப்பையும் பிரித்துத் திட்டமிடுவது முன்னிலை பெறும்.','வாக்குறுதி கொடுப்பதற்கும் பணம் ஒதுக்குவதற்கும் இடையே வேறுபாடு கவனிக்கப்பட வேண்டும்.'],
 ['கற்ற ஒரு திறனை நடைமுறையில் சோதித்து மேம்படுத்தும் முயற்சி அதிகரிக்கும்.','ஒரே நேரத்தில் பல வேலைகளைத் தொடங்கினால் முடிக்க வேண்டிய பணிகள் தேங்கும்.'],
 ['வீட்டுப் பொறுப்பு, வசதி, குடும்பத்தினரின் தேவைகள் பற்றிய முடிவுகள் முன்னிலை பெறும்.','வீட்டில் அனைவரின் கருத்தையும் கேட்காமல் செலவுகளை முடிவு செய்வதால் முரண்பாடு ஏற்படும்.'],
 ['ஆழமாகப் படித்ததைப் பயிற்சியில் பயன்படுத்தும் நேரம் உருவாகும்.','முழுமையாகத் தெரிந்த பிறகே தொடங்க வேண்டும் என்ற பிடிப்பு கற்றல் வேகத்தைக் குறைக்கும்.'],
 ['சிக்கலான பணிகளைப் பிரித்து முடிப்பதன் மூலம் அன்றாட ஒழுங்கு வலுப்படும்.','பொறுப்புகளைப் பகிராமல் அனைத்தையும் தானே செய்தால் ஓய்வு நேரம் குறையும்.'],
 ['நெருக்கமான உறவுகளிலும் கூட்டாக மேற்கொள்ளும் செயல்களிலும் எதிர்பார்ப்புகளைத் தெளிவுபடுத்துவீர்கள்.','ஒருதரப்பு முடிவு சேர்ந்து செயல்படும் உறவுகளில் மனவருத்தத்தை உருவாக்கும்.'],
 ['எதிர்பாராத மாற்றத்திற்காக மாற்று ஏற்பாடுகளைத் திட்டமிடும் நடை உருவாகும்.','முழுத் தகவலின்றி மாற்றம் செய்தால் முன்பு முடித்த வேலையை மீண்டும் செய்ய நேரிடும்.'],
 ['ஆசிரியர், பெரியவர் அல்லது அனுபவமுள்ளவரின் வழிகாட்டலை நடைமுறை அனுபவத்துடன் இணைப்பீர்கள்.','பழைய நம்பிக்கையை மட்டும் அடிப்படையாகக் கொண்டால் புதிய உதவியைத் தாமதமாக ஏற்றுக்கொள்வீர்கள்.'],
 ['பொறுப்பேற்ற பணியின் தரத்தை உயர்த்திப் பிறரிடம் நம்பிக்கையை உருவாக்குவீர்கள்.','முடிக்கக்கூடிய அளவை மீறிப் புதிய பணியை ஒப்புக்கொண்டால் முந்தைய பொறுப்பு பின்தங்கும்.'],
 ['நம்பகமான ஆதாயத்தையும் உறுதியாகாத வாய்ப்பையும் தனித்தனியாகக் கையாளும் ஒழுங்கு உருவாகும்.','வரவாகாத பணத்தை முன்கூட்டியே செலவுக்குக் கணக்கிட்டால் சேமிப்பு குறையும்.'],
 ['தனிப்பட்ட நேரம், ஓய்வு, செலவு ஆகியவற்றுக்குத் தனித்த இடம் அளிப்பீர்கள்.','முடிக்காத வேலையை நினைத்து உறங்கும் நேரத்தைத் தள்ளிவைத்தால் மறுநாள் செயல்திறன் குறையும்.']
];
const PERIOD_MINOR_TA=[
 ['விளையாட்டிலும் வகுப்புப் பணியிலும் தானே முயற்சி செய்து கற்கும் ஆர்வம் வளரும்.','போட்டியில் உடனே வெல்ல வேண்டும் என்ற அவசரம் பயிற்சியைத் தடுக்கும்.'],
 ['குடும்பத்துடன் பேசும் முறையிலும் சிறிய செலவுகளைப் புரிந்துகொள்வதிலும் புதிய பழக்கம் உருவாகும்.','வீட்டில் ஏற்பட்ட கருத்து வேறுபாட்டை நீண்ட நேரம் மனதில் வைத்துக்கொள்ளும் பழக்கம் குறைய வேண்டும்.'],
 ['பயிற்சி, விளையாட்டு அல்லது கைகளால் செய்யும் திறமையில் முயற்சி அதிகரிக்கும்.','செய்து பார்க்காமல் முடிவு கூறுவதால் பாடத்தை மீண்டும் கற்க நேரிடும்.'],
 ['பாட நேரத்துக்கும் விளையாட்டு நேரத்துக்கும் வீட்டில் ஒழுங்கு அமைக்கப்படும்.','வீட்டுக் கட்டுப்பாடு அதிகமாக உணரப்பட்டால் பெற்றோருடன் கருத்து வேறுபாடு உருவாகும்.'],
 ['பாடம், நினைவாற்றல், படைப்புத் திறன் போன்றவற்றில் விருப்பமான பகுதியைத் தேர்ந்து பயிற்சி தொடரும்.','மதிப்பெண்ணைப் பற்றிய அதிக எதிர்பார்ப்பு கற்றலில் தேவையற்ற அழுத்தத்தை உருவாக்கும்.'],
 ['பள்ளிக் கடமைகளையும் அன்றாட உடற்பயிற்சியையும் ஒழுங்குபடுத்தும் பழக்கம் முக்கியமாகும்.','படிப்பை முடிக்க முயன்று விளையாட்டு மற்றும் ஓய்வைக் குறைப்பது சமநிலையைக் குலைக்கும்.'],
 ['நண்பர்கள், வகுப்புத் தோழர்கள், பெற்றோருடன் சேர்ந்து முடிவு செய்வதைப் பழகுவீர்கள்.','விளையாட்டில் தன் கருத்து மட்டுமே சரி என்ற பிடிப்பு நட்பில் மனவருத்தம் தரும்.'],
 ['புதிய சூழலுக்கும் பள்ளி மாற்றத்திற்கும் தயாராகும் திறன் மேம்படும்.','புதிய சூழலை முன்னமே அஞ்சுவதால் கற்றல் முயற்சி தாமதமாகும்.'],
 ['ஆசிரியர், பெற்றோர் வழிகாட்டுதலைச் செயலில் பயன்படுத்தி ஒரு திறனை மேம்படுத்துவீர்கள்.','கேட்ட அறிவுரையைப் புரிந்துகொள்ளாமல் உடனே நிராகரிப்பது வளர்ச்சியைத் தாமதப்படுத்தும்.'],
 ['சிறிய பொறுப்புகளைச் சரியான நேரத்தில் முடிக்கும் ஒழுக்கம் கற்றுக்கொள்ளப்படும்.','வயதுக்கு மீறிய குடும்பக் கடமையைச் சுமத்தினால் படிப்பு மற்றும் ஓய்வு பாதிக்கப்படும்.'],
 ['நண்பர்களுடன் இணைந்து சிறு திட்டத்தில் பங்கெடுப்பது கற்றலுக்குப் பயன் தரும்.','மற்றவரின் திறமையுடன் தொடர்ந்து ஒப்பிடுவது தன்னம்பிக்கையைக் குறைக்கும்.'],
 ['உறக்கம், படிப்பு, விளையாட்டு நேரத்துக்கான ஒழுங்கு உருவாகும்.','இரவு நேரத் திரைப் பயன்பாடு அதிகரித்தால் பள்ளி நாள் சோர்வாக அமையும்.']
];
const PERIOD_SENIOR_TA=[
 ['தனக்கேற்ற அன்றாடச் செயல்களைத் தேர்ந்தெடுத்து அனுபவத்தின் அடிப்படையில் முடிவெடுப்பீர்கள்.','பொறுப்புகளை மற்றவரிடம் பகிராமல் சுமப்பது ஓய்வு நேரத்தைச் சுருக்கும்.'],
 ['குடும்பச் சேமிப்பையும் அடுத்த தலைமுறைக்கான உதவியையும் தெளிவாகத் திட்டமிடுவீர்கள்.','பழைய நிதி ஏற்பாட்டை மறுபரிசீலனை செய்ய மறுப்பது தேவையற்ற சுமையாக மாறும்.'],
 ['கற்ற அனுபவத்தை இளையோரிடம் பகிர்ந்து அவர்களுடன் செயல்படுவீர்கள்.','புதிய முறைகளை ஏற்கத் தயங்குவது நடைமுறை உதவியைப் பெறத் தாமதப்படுத்தும்.'],
 ['குடும்பத்துடன் அமைதியாக நேரம் செலவிடவும் வீட்டுப் பராமரிப்பை ஒழுங்குபடுத்தவும் முன்வருவீர்கள்.','எல்லா வீட்டுப் பொறுப்பையும் தானே செய்ய முயல்வது ஓய்வைக் குறைக்கும்.'],
 ['கற்ற அனுபவத்தை இளைய தலைமுறையுடன் பகிர்ந்து வழிகாட்டும் காலமாக அமையும்.','இளையோரின் முடிவுகளைத் தன் முறைக்கேற்ப மாற்ற வற்புறுத்துவது இடைவெளியை ஏற்படுத்தும்.'],
 ['அன்றாடச் செயல்களில் முன்னுரிமை, ஓய்வு, பகிர்ந்த பொறுப்பு ஆகியவை முக்கியமாகும்.','தன் பழைய வேலையளவையே தொடர்ந்து எதிர்பார்ப்பது ஓய்வு ஒழுங்கைக் குறைக்கும்.'],
 ['ஏற்கெனவே உள்ள உறவுகளில் கருத்துப் பரிமாற்றமும் துணையும் முதன்மை பெறும்.','முன்பிருந்த குறைகளை மீண்டும் பேசுவது குடும்ப அமைதியைக் குறைக்கும்.'],
 ['நீண்ட அனுபவத்திலிருந்து பெற்ற பாடங்களைப் பயன்படுத்தி மாற்றங்களை அமைதியாக எதிர்கொள்வீர்கள்.','புதிய ஏற்பாட்டைப் பற்றி அளவுக்கு மீறிக் கவலைப்படுவது முடிவைத் தாமதப்படுத்தும்.'],
 ['வழிகாட்டிய அனுபவத்தையும் குடும்ப மரபையும் இளையோரிடம் எடுத்துரைப்பீர்கள்.','புதிய கருத்துகளைக் கேட்காமல் மறுப்பதால் உரையாடல் கடினமாகும்.'],
 ['அனுபவத்தால் பிறருக்குப் பயன் தரும் ஆலோசனைகளை அளிப்பீர்கள்.','புதிய பதவி அல்லது கடும் உழைப்பைத் தானாக எதிர்பார்ப்பது பொருத்தமற்ற சுமையாக மாறும்.'],
 ['குடும்ப ஆதரவையும் நீண்டகாலச் செலவுத் திட்டத்தையும் தெளிவாக ஒழுங்குபடுத்துவீர்கள்.','உறுதியாகாத வரவுக்காகப் புதிய பெரிய பொறுப்பை ஏற்க வேண்டாம்.'],
 ['அமைதியான நேரம், குடும்பத் தொடர்பு, தொடர்ச்சியான ஓய்வு ஆகியவற்றுக்கு முன்னுரிமை அளிப்பீர்கள்.','முடிக்காத குடும்பப் பொறுப்புகளை எண்ணி ஓய்வைத் தள்ளுவது அன்றாட ஒழுங்கைச் சீர்குலைக்கும்.']
];
const PERIOD_EN=[
 ['You take initiative in decisions that directly affect your routines.','Acting before clarifying a plan can require a second round of work.'],
 ['You make separate plans for household needs and savings.','Promising funds before confirming them creates avoidable pressure.'],
 ['You practice a chosen skill with more direct involvement.','Starting several competing projects leaves early work incomplete.'],
 ['You organise home upkeep and consult household members.','Making unilateral home decisions creates friction.'],
 ['You apply a particular area of learning in practice.','Perfectionism can delay the start of a useful project.'],
 ['You develop a clearer routine for work and duties.','Taking every responsibility alone reduces time for rest.'],
 ['You clarify expectations in established close relationships.','Unilateral decisions strain cooperation.'],
 ['You plan alternatives for changes beyond your control.','Switching paths without reliable information wastes effort.'],
 ['You apply practical lessons from mentors and experience.','Ignoring new evidence limits useful guidance.'],
 ['You develop trust through completed responsibilities.','New commitments can displace unfinished work.'],
 ['You separate reliable income from speculative opportunities.','Spending unconfirmed gains reduces reserves.'],
 ['You set clearer limits for private time and rest.','Late unfinished work displaces sleep.']
];
/* V299: The operating planetary pair changes the interpretation, not just the heading.
   These are traditional themes, never diagnoses or assured real-world events. */
const DASHA_STYLE_TA={
 Sun:['பொறுப்பைத் தானாக ஏற்று முடிவை வெளிப்படையாகச் சொல்வது','அங்கீகாரத்தை எதிர்பார்த்து பிறர் கருத்தை அவசரமாக நிராகரிப்பது'],
 Moon:['குடும்பத் தேவைகளையும் மனநிறைவையும் முடிவில் சேர்ப்பது','உணர்ச்சிவசப்பட்ட நாளில் ஏற்கெனவே எடுத்த முடிவை மாற்றுவது'],
 Mars:['தாமதமான வேலையை உடனடியாகச் செயல்படுத்துவது','முழு விவரத்தை அறியுமுன் அவசரமாக முடிவெடுப்பது'],
 Mercury:['விவரங்களை ஒப்பிட்டு பேசிச் சமரசம் செய்வது','அதிகம் ஆராய்ந்து எளிய முடிவையும் தள்ளிப்போடுவது'],
 Jupiter:['கற்ற அறிவையும் மூத்தோர் ஆலோசனையையும் பயன்படுத்துவது','ஆலோசனையை மட்டுமே நம்பி நடைமுறைச் செயலைத் தள்ளுவது'],
 Venus:['உறவுகளின் ஒத்துழைப்பையும் விருப்பத் தேர்வையும் மதிப்பது','இணக்கத்திற்காகத் தேவையான எல்லையையும் விட்டுக்கொடுப்பது'],
 Saturn:['பொறுப்புகளை வரிசைப்படுத்தி நீண்டகாலம் நிலைத்துச் செய்வது','எல்லாப் பொறுப்பையும் தனியே சுமந்து வேலை நீளச் செய்வது'],
 Rahu:['வழக்கத்துக்கு மாறான மாற்று வழிகளையும் புதிய தொடர்புகளையும் ஆராய்வது','உறுதிப்படுத்தாத வாய்ப்பிற்காக பழைய ஏற்பாட்டை உடைப்பது'],
 Ketu:['தேவையற்ற சுமையை விலக்கி முக்கிய செயலுக்குத் திரும்புவது','உதவி தேவைப்படும் இடத்திலும் தனியாக விலகி நிற்பது']
};
const DASHA_STYLE_EN={
 Sun:['taking ownership of visible decisions','rejecting useful input while seeking recognition'],
 Moon:['bringing family needs into decisions','revising plans in a moment of heightened feeling'],
 Mars:['acting on delayed work','moving before essential details are checked'],
 Mercury:['comparing details and negotiating','delaying simple decisions through overanalysis'],
 Jupiter:['applying learning and considered guidance','replacing practical steps with advice alone'],
 Venus:['valuing cooperation and personal choice','giving up necessary boundaries for harmony'],
 Saturn:['sequencing duties and sustaining effort','carrying every duty alone and extending delays'],
 Rahu:['examining unconventional options and new networks','abandoning a sound arrangement for an unverified prospect'],
 Ketu:['reducing distractions and concentrating on essentials','withdrawing when practical help would be useful']
};
function periodTopicProse(full,period,topic,trigger,lang){
 const n=topic.number,ta=lang!=='en',minor=period.age<18,senior=period.age>=70;
 const baseline=(ta?(minor?PERIOD_MINOR_TA:senior?PERIOD_SENIOR_TA:PERIOD_LIVED_TA):PERIOD_EN)[n-1];
 const md=ENKEY(period.md),ad=ENKEY(period.ad),styles=ta?DASHA_STYLE_TA:DASHA_STYLE_EN;
 const m=styles[md]||styles.Saturn,a=styles[ad]||styles.Jupiter;
 const mdDirect=trigger.mdMarks.length>0,adDirect=trigger.adMarks.length>0;
 const topicName=(ta?(minor?MINOR_BHAVA_TA:BHAVA_MATTER_TA):BHAVA_MATTER_EN)[n-1][0];
 const source=trigger.source||{};
 const known=(x)=>Number.isInteger(x?.house)&&x.house>=1&&x.house<=12;
 // Keep the provenance explicit: unlike a canned positive/negative prediction,
 // this sentence changes for the real two operating lords and their natal links.
 let positive,negative='';
 if(ta){
  const primary=mdDirect?`${PNA(md)} மகாதசை — ${m[0]}`:`${PNA(md)} மகாதசையின் பின்னணி`;
  const secondary=adDirect?`${PNA(ad)} புக்தி — ${a[0]}`:`${PNA(ad)} புக்திக்கு இப்பாவத்தில் நேரடிப் புதிய தொடர்பில்லை`;
  positive=`${topicName} தொடர்பில் ${baseline[0]} ${primary}; ${secondary}.`;
  if(md!==ad&&(mdDirect&&adDirect||Number(source.signal)<0))negative=`கலப்பின் மறுபக்கம்: ${m[1]}; ${a[1]}. குறிப்பாக ${baseline[1]}`;
 }else{
  const primary=mdDirect?`${md} major period emphasizes ${m[0]}`:`${md} is background rather than a direct house link`;
  const secondary=adDirect?`${ad} sub-period brings ${a[0]}`:`${ad} has no new direct link to this house`;
  positive=`For ${topicName}, ${baseline[0]} ${primary}; ${secondary}.`;
  if(md!==ad&&(mdDirect&&adDirect||Number(source.signal)<0))negative=`Counterweight: ${m[1]}; ${a[1]}. In particular, ${baseline[1]}`;
 }
 // Natal house placements are recorded in the evidence row, not presented
 // as a fresh event in every future window.
 return {positive,negative};
}

const DASHA_TOPIC_CAP=3;
function periodTrigger(t){
 const source=t.paragraphs?.[0]?.evidence||{},md=source.md||{},ad=source.ad||{};
 const mdMarks=Array.isArray(md.marks)?md.marks:[],adMarks=Array.isArray(ad.marks)?ad.marks:[];
 const weights={rules:6,occupies:5,aspects:4,'conjuncts-lord':3,'aspects-lord':2};
 const power=marks=>marks.reduce((n,v)=>n+(weights[v]||0),0);
 return {mdMarks,adMarks,power:power(mdMarks)+power(adMarks),hasDirect:!!(mdMarks.length||adMarks.length),source};
}
const V301_D1_CACHE=new WeakMap();
function v301Natal(full){
 const chart=full?.chart||full;
 if(!chart||typeof chart!=='object')return null;
 if(V301_D1_CACHE.has(chart))return V301_D1_CACHE.get(chart);
 const d=globalThis.SMVLifePredictionD1?.toD1?.(chart)||null;
 V301_D1_CACHE.set(chart,d);
 return d;
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
   number:t.number,title:language!=='en'?(p.age<18?MINOR_BHAVA_TA[t.number-1][0]:p.age>=70&&t.number===7?'ஏற்கெனவே உள்ள உறவுகள் மற்றும் ஒத்துழைப்பு':p.age>=70&&t.number===10?'அனுபவப் பகிர்வு மற்றும் அன்றாடப் பொறுப்புகள்':BHAVA_MATTER_TA[t.number-1][0]):BHAVA_MATTER_EN[t.number-1][0],activation:trigger.power,
   mdMarks:trigger.mdMarks,adMarks:trigger.adMarks,
   ...(()=>{const narrative=periodTopicProse(full,p,t,trigger,language);if(previous&&previous.md===p.md&&previous.ad===p.ad)narrative.negative="";return narrative;})(),
   // Static secondary natal facts belong in the D1 section and must not
   // reappear in each bhukti and each year. Preserve them via evidence only.
   linkedEvidenceCount:(t.paragraphs||[]).slice(2).filter(x=>x.evidence?.relatedHouse||x.evidence?.planet||x.evidence?.md).length
  }));
  const v301=globalThis.SMVD1V301Evidence;
  const natal=v301Natal(full);
  const insight=natal&&v301?.periodInsight?v301.periodInsight(natal,p,language):null;
  entries.push({...p,ageStage:reading.ageStage,changes,insight,reviewedTopics:reading.topics.length,
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
/* V299 transit reading: house-specific actions vary by planet and by age.
   Only a newly changed/activated link is narrated; the full ingress log remains factual. */
const TRANSIT_EFFECTS_TA={
 Jupiter:['சுயமுடிவில் ஆசிரியர் அல்லது அனுபவமுள்ளவரின் கருத்தைச் சேர்ப்பது','குடும்பத் தொகை ஒதுக்கீட்டில் நீண்டகால தேவையை மதிப்பிடுவது','தனக்குத் தேவையான பயிற்சியை ஆழமாகக் கற்றுச் செயல்படுத்துவது','வீட்டின் வசதி மற்றும் கல்வி தொடர்பான ஏற்பாட்டைச் சீர்செய்வது','படிப்பு அல்லது படைப்புத் திறனில் புதிய முறையைத் தேர்வது','அன்றாடப் பணிப் பயிற்சியைத் திட்டமிட்டுப் பகிர்வது','கூட்டு முடிவில் ஒருவருக்கொருவர் எதிர்பார்ப்பை வெளிப்படுத்துவது','எதிர்பாராத மாற்றத்திற்கு முன்கூட்டியே தகவல் சேர்ப்பது','அனுபவமுள்ள வழிகாட்டியிடம் கேட்டதைச் செயலில் சோதிப்பது','பணியில் கற்ற திறனைப் பயன்படுத்தி பொறுப்பை விரிவாக்குவது','நண்பர்கள் மற்றும் தொடர்புகளின் உதவியுடன் வாய்ப்பைக் கண்டறிவது','கற்றதைத் தனிநேரத்தில் ஒழுங்காகப் பயிற்சி செய்வது'],
 Saturn:['தினசரிப் பொறுப்புகளை வரிசைப்படுத்திச் செயல்முறையை நிலைநாட்டுவது','வருமானம் வருவதற்கும் செலவு செய்வதற்கும் தனித்த கணக்கு வைப்பது','முடிக்காமல் விட்ட பயிற்சியைத் தொடர்ச்சியாக முடிப்பது','வீட்டுப் பராமரிப்பில் தள்ளிவைத்த சிறிய வேலைகளைத் திட்டமிடுவது','பாடம் அல்லது படைப்புத் திட்டத்தில் நீண்டகாலப் பயிற்சியைத் தொடர்வது','வேலைப் பகிர்வையும் ஓய்வு நேரத்தையும் திட்டத்தில் இணைப்பது','கூட்டு உறவில் பொறுப்புகளுக்கான தெளிவான எல்லையை அமைப்பது','மாற்றக் காலத்திற்கான பாதுகாப்பு ஏற்பாட்டை எழுதி வைப்பது','ஆலோசனையை அன்றாட ஒழுக்கமாக மாற்றுவது','செய்த வேலையின் தரத்தை உயர்த்தி நிலையான பொறுப்பை ஏற்குவது','வராத ஆதாயத்தைச் செலவுக் கணக்கில் சேர்க்காமல் இருப்பது','உறக்கம், செலவு, தனிநேரத்திற்கு நடைமுறை எல்லை அமைப்பது'],
 Rahu:['புதிய துறையொன்றில் ஆர்வம் வந்தால் ஆதாரத்தைச் சரிபார்த்துத் தொடங்குவது','புதிய வருமான யோசனையின் ஆபத்தையும் செலவையும் வேறுபடுத்துவது','தொழில்நுட்பம் சார்ந்த புதிய திறனைச் சோதிப்பது','வீடு மாற்றம் அல்லது வசதி மாற்றத்துக்கான தகவலை ஒப்பிடுவது','புதிய பாடம், கலை அல்லது செயல்முறையில் பரிசோதனை செய்வது','பணிப் பழக்கத்தை மாற்றுமுன் அதன் விளைவைக் கணக்கிடுவது','புதிய கூட்டுறவில் ஒப்பந்தத்தின் விவரங்களைத் தெளிவுபடுத்துவது','எதிர்பாராத மாற்றத்திற்கான மாற்று வழியைத் தேர்வது','மாறுபட்ட கருத்தை ஏற்குமுன் அதன் உண்மையை ஆராய்வது','புதிய பணிமுறை அல்லது தொடர்பு வழியைச் சோதிப்பது','புதிய நண்பர்கள், சமூக வட்டத்தில் நம்பகத்தன்மையை ஆராய்வது','புதிய செலவு அல்லது பயணத் திட்டத்தின் தேவையைச் சோதிப்பது'],
 Ketu:['தன் முயற்சிகளில் பயன் இல்லாதவற்றை விலக்குவது','அத்தியாவசியமற்ற செலவுகளை ஒதுக்குவது','கவனத்தைச் சிதைக்கும் செயல்களை நீக்கிப் பயிற்சியைத் தொடர்வது','வீட்டில் அத்தியாவசியமற்ற மாற்றங்களைத் தவிர்ப்பது','தேவையற்ற கற்றல் சுமையைக் குறைத்துப் பிரதான பாடத்தில் கவனம் தருவது','அன்றாட வேலையில் தேவையற்ற சிக்கலைக் குறைப்பது','உறவுகளில் சொல்லாத எதிர்பார்ப்பைத் தெளிவுபடுத்துவது','மாற்றத்தில் முதலில் பாதுகாக்க வேண்டியதைத் தேர்வது','பழைய கருத்தில் பயனுள்ளதை மட்டும் எடுத்துக்கொள்வது','பதவி பெயரைவிட வேலையின் பயனில் கவனம் தருவது','பயனற்ற சமூக ஒப்பீட்டை விலக்குவது','அவசியமற்ற செலவையும் ஓய்வைக் குலைக்கும் பழக்கத்தையும் விலக்குவது']
};
const TRANSIT_EFFECTS_EN={
 Jupiter:['using trusted advice in personal decisions','budgeting for longer-term family needs','deepening one practical skill','improving household or study arrangements','trying a more effective learning method','sharing practical training and workload','clarifying expectations in agreements','gathering evidence before a major change','testing advice in practice','applying newly learned skills to duties','finding useful opportunities through reliable contacts','setting regular time for learning and rest'],
 Saturn:['putting daily duties into a sustainable sequence','separating received income from planned expenditure','finishing an unfinished training task','scheduling deferred household maintenance','sustaining structured learning or creative work','balancing assigned work with actual rest','agreeing on clear boundaries in a partnership','writing a practical contingency plan','turning guidance into a consistent routine','improving work quality before taking on more','not spending gains that have yet to arrive','setting limits for expenses and rest'],
 Rahu:['checking evidence before trying a novel approach','checking costs and risks of a new financial idea','testing a technology-based skill','comparing plans for changing the home environment','experimenting with a new subject or creative method','testing how a changed routine affects work','reading the details of a new agreement','planning alternatives for unfamiliar changes','verifying unconventional advice','trialling a new professional workflow','checking the reliability of a new network','checking the value of a novel expense or trip'],
 Ketu:['removing low-value commitments','cutting nonessential expenses','reducing distraction while practising a skill','avoiding unnecessary changes to the home','concentrating on the key area of learning','simplifying an overcomplicated work routine','speaking clearly about unspoken expectations','prioritising what needs protection during change','keeping useful parts of established guidance','valuing useful work over titles','stepping away from unhelpful comparisons','removing unnecessary expenses and sleep-disrupting habits']
};
function transitNarrative(full,timeline,language,periods=[]){
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
   for(const c of candidates){if(used>=1||notes.length>=3)break;
    const k=[planet,y.pos[planet].sign,c.focus,c.evidence.marks.slice().sort().join(',')].join('/');
    if(seen.has(k))continue;seen.add(k);used++;
    const minor=y.age<18,senior=y.age>=70;
    const theme=(ta?(minor?MINOR_BHAVA_TA:BHAVA_MATTER_TA):(minor?MINOR_BHAVA_EN:BHAVA_MATTER_EN))[c.focus-1];
    const state=(ta?ZTA:ZEN)[y.pos[planet].sign];
    const mode=c.evidence.marks.includes('transit-through')?'through':c.evidence.marks.includes('transit-aspect')?'aspect':'lord';
    // Never reuse the natal report-date child title in an age-79 forecast.
    const stageTitle=senior&&c.focus===10?(ta?'அனுபவப் பகிர்வும் விருப்பமான செயல்களும்':'mentoring and chosen activities'):senior&&c.focus===7?(ta?'நீண்டகால உறவுகளும் ஒத்துழைப்பும்':'longstanding relationships and cooperation'):theme[0];
    const ageTitle=`${c.focus}. ${stageTitle}`;
    let message=(ta?TRANSIT_EFFECTS_TA:TRANSIT_EFFECTS_EN)[planet][c.focus-1];
    // A forecast at 14 is about study/peers, not contracts or marriage; at 79
    // it must not promise a job/promotion or an existing spouse.
    if(minor){
      const young=ta?PERIOD_MINOR_TA[c.focus-1][0]:MINOR_BHAVA_EN[c.focus-1][0];
      const method=ta?({Jupiter:'பெற்றோர் அல்லது ஆசிரியர் வழிகாட்டுதலுடன்',Saturn:'தினசரி பழக்கத்தைத் தொடர்ந்து',Rahu:'புதிய முறையைப் பெரியோர் ஆதரவுடன் சோதித்து',Ketu:'தேவையற்ற அழுத்தத்தைக் குறைத்து'}[planet]):({Jupiter:'with teacher guidance',Saturn:'through steady practice',Rahu:'by carefully testing a new approach',Ketu:'by reducing distraction'}[planet]);
      message=ta?`${method} ${young} தொடர்பான பழக்கத்தை வளர்ப்பது`:`${method}, ${young}`;
    }
    if(senior&&[7,10].includes(c.focus)){
      const older=ta?PERIOD_SENIOR_TA[c.focus-1][0]:('Saturn'===planet?'maintaining chosen responsibilities':c.focus===10?'sharing skills in chosen activities':'keeping valued relationships active');
      const method=ta?({Jupiter:'அனுபவமுள்ளவர்களுடன் உரையாடி',Saturn:'உழைப்பின் அளவைத் தானே தேர்ந்தெடுத்து',Rahu:'புதிய உதவி முறையைச் சோதித்து',Ketu:'தேவையற்ற சுமையைக் குறைத்து'}[planet]):({Jupiter:'through valued guidance',Saturn:'with self-chosen limits',Rahu:'by testing accessible alternatives',Ketu:'by simplifying obligations'}[planet]);
      message=ta?`${method} ${older}`:`${method}, ${older}`;
    }
    const place=mode==='through'?(ta?'அந்தப் பாவத்தில் நேரடியாகச் செல்கிறார்':'crosses that house'):
      mode==='aspect'?(ta?'அந்தப் பாவத்தைப் பார்க்கிறார்':'aspects that house'):(ta?'அதன் அதிபதியுடன் தொடர்பு பெறுகிறார்':'links with its ruler');
    // Midpoint position and house link establish a *dated thematic reading*,
    // not a claim that the same placement applies throughout the whole year.
    const impact=ta?
      `${KTA[planet]} ${state} ராசியில் இருந்து ${c.focus}-ஆம் பாவத்துடன் தொடர்பு பெறுகிறார் (${place}). ${theme[0]} சார்ந்து ${message}. இதில் ${theme[1]} என்பதையும் கணக்கில் கொள்ளுங்கள்.`:
      `${planet} in ${state} ${place} (house ${c.focus}). For ${theme[0]}, ${message}; balance this against ${theme[1]}.`;
    notes.push({...c,title:ageTitle,text:impact.trim(),natalLord:c.evidence.natalLord,sign:y.pos[planet].sign});
   }
  }
  const v301=globalThis.SMVD1V301Evidence;
  const natal=v301Natal(full);
  const currentPeriod=periods.find(p=>p.from<=y.date&&y.date<p.to)||periods.find(p=>p.from<=y.from&&y.from<p.to);
  const insight=natal&&currentPeriod&&v301?.transitInsight?v301.transitInsight(natal,currentPeriod,y,language):null;
  years.push({...y,topics:[],notes,insight});
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
  const inactive=false&&x.inactiveTopicNumbers.length?(ta?
    `மற்ற ${x.inactiveTopicNumbers.length} தலைப்புகள் (பாவங்கள் ${x.inactiveTopicNumbers.join(', ')}) இந்தப் புக்தியில் நேரடி புதிய தசாநாதர்/புக்திநாதர் தொடர்பைப் பெறவில்லை. அவற்றின் நிலையான D1 ஆதாரங்களை முதல் பகுதியில் வாசிக்கவும்; கால நிகழ்வுகளை ஊகித்துச் சேர்க்கவில்லை.`:
    `The other ${x.inactiveTopicNumbers.length} topics (houses ${x.inactiveTopicNumbers.join(', ')}) have no newly active direct D1 period link. See section I for natal baseline; no period event has been invented.`):'';
  return `<details class="smv-80-window" ${i===0?'open':''}><summary>${label} — ${x.from} – ${x.to} (${ta?'வயது':'age'} ${x.age}; ${stage})</summary><div class="smv-80-change">${changed} · ${ta?'நேரடித் தொடர்புள்ளவை':'directly activated'}: ${x.topics.length}/12</div>${x.insight?.paragraphs?.map(s=>`<p class="smv-v301-period">${safe(s)}</p>`).join('')||''}${topicRows}${inactive?`<div class="smv-80-unlinked">${safe(inactive)}</div>`:''}</details>`;
 });
 return `<div class="smv-80-content" data-long-dasha="1" data-narrative="house-planet-pair-v299"><h3>${ta?'அறிக்கைத் தேதியிலிருந்து 80 வயது வரை — தசா–புக்திகள்':'Dasha and Bhukti — report date until age 80'}</h3>
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
 ${y.insight?.paragraphs?.map(s=>`<p class="smv-v301-transit">${safe(s)}</p>`).join('')||''}
 ${y.events.length?`<p><strong>${ta?'இந்த ஆண்டில் கண்டறியப்பட்ட பெயர்ச்சி ராசி மாற்றங்கள்':'Detected sign changes during this year'}:</strong> ${y.events.map(e=>`${e.date}: ${ta?KTA[e.planet]:e.planet} ${(ta?ZTA:ZEN)[e.from]} → ${(ta?ZTA:ZEN)[e.to]}`).join('; ')}</p>`:''}
 ${(y.age<18||y.age>=70)&&y.notes.length?`<p class="smv-80-stage">${ta?(y.age<18?'இந்த வயதில் கல்வி, குடும்ப ஆதரவு மற்றும் வளர்ச்சிப் பழக்கங்களுக்கே இவ்வாசிப்பு பொருந்தும்.':y.age>=70?'இந்த வயதில் அனுபவப் பகிர்வு, விரும்பிய செயல்கள் மற்றும் ஓய்வுக்கே இந்த வாசிப்பு பொருந்தும்.':''):(y.age<18?'At this age the reading concerns learning, family support and age-appropriate development.':y.age>=70?'At this age the reading concerns chosen activities, established relationships and rest.':'')}</p>`:''}
 ${y.notes.map(n=>`<section class="smv-80-topic" data-transit-planet="${n.planet}" data-focus-house="${n.focus}"><h4>${n.focus}. ${safe(n.title)}</h4><p>${safe(n.text)}</p></section>`).join('')}${!y.notes.length?'':''}
 ${events.filter(e=>e.date>=y.from&&e.date<y.to&&e.topics.length).map(e=>`<section class="smv-80-event"><h4>${e.date} · ${ta?KTA[e.planet]:e.planet}: ${(ta?ZTA:ZEN)[e.from]} → ${(ta?ZTA:ZEN)[e.to]}</h4>${e.topics.map(t=>`<p><strong>${t.number}. ${safe(t.title)}:</strong> ${t.paragraphs.map(safe).join(' ')}</p>`).join('')}</section>`).join('')}</details>`).join('')}
 <p class="smv-80-complete-marker" data-smv-full-timeline-complete="1">${ta?'80 வயது வரையிலான கோச்சார அறிக்கை முழுமை அடைந்தது.':'Transit report through age 80 is complete.'}</p>
 </div>`;
}
export function translate80Year(full,base,lang='ta'){
 const dasha=dashaNarrative(full,base.dasha.map(x=>({md:x.md,ad:x.ad,from:x.from,to:x.to,age:x.age})),lang);
 const transitYears=transitNarrative(full,base.transitTimeline,lang,base.dasha);
 const transitEvents=[]; // date-level changes already listed with each forecast year
 return {...base,dasha,transitYears,transitEvents,language:lang};
}
export async function build80Year(full,payload,{lang='ta',onProgress,signal}={}){
 const {periods,birth,referenceDate,end,continuationCount,ageLimitReached}=clipPeriods(full,payload?.referenceDate),dasha=ageLimitReached?[]:dashaNarrative(full,periods,lang);
 onProgress?.({stage:'dasha',done:1,total:1});
 const transitTimeline=ageLimitReached?{birth,referenceDate,end,years:[],events:[],stepDays:7,precision:'No forecast remains before age 80',samplesChecked:0}:await computeTransitTimeline(full,payload,{onProgress,signal});
 const transitYears=ageLimitReached?[]:transitNarrative(full,transitTimeline,lang,dasha);
 const transitEvents=[]; // no repeated prose for each ingress; preserve real ingress dates
 return {birth,referenceDate,end,dasha,transitYears,transitEvents,transitTimeline,language:lang,meta:{dashaPeriods:dasha.length,transitSignChanges:transitTimeline.events.length,forecastYears:transitTimeline.years.length,untilAge:80,ageLimitReached:!!ageLimitReached,fromReportDate:referenceDate,throughDate:end,derivedContinuations:continuationCount,samplesChecked:transitTimeline.samplesChecked}};
}
export function render80Year(report,lang=report.language||'ta'){
 return {dashaHTML:dashaHTML(report.dasha,lang),transitHTML:transitHTML(report.transitTimeline,report.transitYears,report.transitEvents,lang)};
}
export {clipPeriods,computeTransitTimeline,transitNarrative,sourceInput,yearAfter};
