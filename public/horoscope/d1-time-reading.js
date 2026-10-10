/* SMV ASTRO V267 — X. Predictions: D1 + current Vimshottari MD/AD and D1 + 4 slow transits.
   One analysis per life topic and each of the 12 D1 houses (12 x 12 per module).
   This module never calculates a new chart, fetches data, modifies access rules or uses
   Bhava Chalit, D7, D9, D10, AI/remote requests, randomness or DOM overrides.
   All dates, transit placements and periods MUST come from the existing Full result.
   A traditional interpretative aid, not validated predictions of actual events.
*/
(function(root, factory){
  const base=typeof module==='object'&&module.exports?require('./d1-life-reading.js'):root?.SMVLifePredictionD1;
  const api=factory(base);
  if(typeof module==='object'&&module.exports) module.exports=api;
  if(root)root.SMVTimePredictionD1=api;
})(typeof window!=='undefined'?window:globalThis, function(BASE){'use strict';
 if(!BASE||typeof BASE.toD1!=='function')throw Error('D1 life engine must load before D1 time predictions.');
 const TA=['சூரியன்','சந்திரன்','செவ்வாய்','புதன்','குரு','சுக்கிரன்','சனி','ராகு','கேது'];
 const EN=['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu'];
 const NAMED=Object.fromEntries(TA.map((x,i)=>[x,EN[i]]));
 for(const x of EN)NAMED[x]=x;
 Object.assign(NAMED,{Surya:'Sun',Chandra:'Moon',Kuja:'Mars',Budha:'Mercury',Guru:'Jupiter',Shukra:'Venus',Shani:'Saturn'});
 const LABEL=Object.fromEntries(EN.map((x,i)=>[x,TA[i]]));
 const OFFSETS={Sun:[7],Moon:[7],Mars:[4,7,8],Mercury:[7],Jupiter:[5,7,9],Venus:[7],Saturn:[3,7,10]};
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const D1_CACHE=new WeakMap();
 function prepared(chart,lang){
  let x=D1_CACHE.get(chart);if(!x){x={};D1_CACHE.set(chart,x)}
  if(!x[lang])x[lang]={d:BASE.toD1(chart),base:BASE.render(chart,lang)};
  return x[lang];
 }
 const normName=s=>NAMED[String(s||'').trim()]||null;
 const signIndex=(s)=>{
   const ta=['மேஷம்','ரிஷபம்','மிதுனம்','கடகம்','சிம்மம்','கன்னி','துலாம்','விருச்சிகம்','தனுசு','மகரம்','கும்பம்','மீனம்'];
   const en=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
   if(typeof s==='number'&&Number.isFinite(s))return Math.floor(((s%360)+360)%360/30);
   let i=ta.indexOf(String(s||'').trim());if(i<0)i=en.findIndex(x=>x.toLowerCase()===String(s||'').trim().toLowerCase());return i;
 };
 // Specific lived domains, not another copy of section I's generic descriptions.
 const FOCUS_TA=[
  'தனது பழக்கம், மன உறுதி மற்றும் தன்னம்பிக்கையை வெளிப்படுத்தும் விதம்',
  'குடும்பப் பேச்சு, சேமிப்பு, தேவைக்கேற்ற பணப் பயன்பாடு',
  'சொந்த முயற்சி, புதிய திறன், சகோதரர்களுடன் பொறுப்பைப் பகிர்தல்',
  'வீட்டின் அமைதி, தாயார் சார்ந்த கடமை, சொத்து நிர்வாகம்',
  'கல்வி, புரிதல், படைப்பாற்றல் மற்றும் குழந்தைகளுக்கான வழிகாட்டுதல்',
  'தினசரி வேலை ஒழுங்கு, போட்டியைச் சமாளித்தல், கடன் கட்டுப்பாடு மற்றும் ஆரோக்கியப் பழக்கங்கள்',
  'வாழ்க்கைத்துணை மற்றும் நெருங்கிய கூட்டுறவுகளில் பரஸ்பரப் புரிதல்',
  'மாற்றங்களை எதிர்கொள்ளுதல், ரகசியமான முடிவுகள், நம்பிக்கை மற்றும் பாதுகாப்பு',
  'தந்தை, வழிகாட்டி, கொள்கை, நீண்டகாலக் கற்றல்',
  'தொழில் முடிவுகள், பணிப் பொறுப்பு, நிர்வாகத் திறன், சமூக அங்கீகாரம்',
  'நண்பர் வட்டம், வருமான இலக்கு, கூட்டுத் திட்டங்களின் பலன்',
  'செலவு ஒழுங்கு, உறக்கம், தனிப்பட்ட நேரம் மற்றும் மன ஓய்வு'
 ];
 const FOCUS_EN=[
  'personal conduct, confidence and how decisions are expressed',
  'family communication, savings and purposeful use of money',
  'self-initiative, learning practical skills and sharing responsibilities with siblings',
  'home atmosphere, obligations involving the mother and property management',
  'education, understanding, creativity and guidance for children',
  'daily work patterns, managing competition, debt discipline and wellbeing routines',
  'mutual understanding within close or marital partnerships',
  'coping with change, confidential decisions, trust and security',
  'guidance from elders, values, study and long-term direction',
  'professional choices, responsibility, leadership and reputation',
  'friendships, income goals and returns from joint plans',
  'spending, sleep, personal space and mental rest'
 ];
 const CROSS_TA=[
  'தன்னுடைய அணுகுமுறை மற்றும் உடனடியாக எடுக்கும் முடிவுகள்',
  'குடும்பத்தில் பேசப்படும் விஷயங்களும் செலவுக்கான முன்னுரிமைகளும்',
  'தானாக முன்வந்து செய்யும் முயற்சிகளும் நெருங்கிய உறவுகளின் உதவியும்',
  'வீட்டுச் சூழல், பெற்றோரின் தேவை மற்றும் மனநிம்மதி',
  'கற்றல், குழந்தைகள், திட்டமிட்ட சிந்தனை மற்றும் புதிய யோசனைகள்',
  'போட்டி, கடமை, பணியில் எழும் சிக்கல்கள் மற்றும் உடல் பராமரிப்பு',
  'இணைந்து செய்யும் வேலைகளில் ஒப்பந்தமும் பரஸ்பர எதிர்பார்ப்பும்',
  'எதிர்பாராத மாற்றமும் அவற்றிற்காக வைத்திருக்கும் மாற்றுத் திட்டமும்',
  'பெரியோர் ஆலோசனை, வழிகாட்டுதல் மற்றும் தூரநோக்குக் கருத்துகள்',
  'தொழிலில் வெளிப்படும் திறன், பதவி சார்ந்த கடமை மற்றும் பொறுப்பு',
  'நண்பர்கள் தரும் தொடர்புகள், வருவாய் வாய்ப்புகள் மற்றும் இலக்குகள்',
  'தனிப்பட்ட செலவுகள், ஓய்வு, உறக்கம் மற்றும் அமைதியான நேரம்'
 ];
 const CROSS_EN=[
  'personal choices and the immediate response to a situation',
  'family discussions and priorities for spending',
  'independent initiatives and support from close relatives',
  'home conditions, parental needs and emotional security',
  'study, children, planning and new ideas',
  'competition, obligations, workplace obstacles and wellbeing',
  'agreements and mutual expectations in shared commitments',
  'sudden changes and the fallback plan kept for them',
  'senior advice, mentoring and long-range values',
  'professional performance, workplace authority and accountability',
  'contacts, income opportunities and longer-term goals',
  'personal expenses, sleep, rest and quiet time'
 ];
 const PLANET_PERIOD_TA={
  Sun:'தன்னம்பிக்கை, பெரியவர்களுடனான நிலைப்பாடு, பொறுப்பை ஏற்கும் முறை',
  Moon:'மனநிலை, குடும்பத்தின் தேவை, அன்றாடக் கவனச்சிதறல் மற்றும் பராமரிப்பு',
  Mars:'முயற்சியில் வேகம், கருத்தை நேரடியாக வெளிப்படுத்துதல், போட்டியில் செயல்பாடு',
  Mercury:'தகவலைப் புரிந்துகொள்ளுதல், கணக்கு, பேச்சுவார்த்தை, திட்டத்தை மாற்றியமைத்தல்',
  Jupiter:'கற்றல், அறிவுரை, குடும்ப வழிகாட்டுதல், நீண்டகால நம்பிக்கைகள்',
  Venus:'ஒத்துழைப்பு, உறவுகளைச் சீராக்குதல், வசதி மற்றும் செலவுக்கான விருப்பங்கள்',
  Saturn:'கடமை, பொறுமை, தாமதத்தைச் சமாளித்தல், ஒழுங்கை நிலைநாட்டுதல்',
  Rahu:'புதிய பாதை, எதிர்பாராத ஆர்வம், அசாதாரண வாய்ப்பைச் சோதித்தல்',
  Ketu:'தேவையற்ற பற்றை விடுதல், தனிமையில் சிந்தித்தல், விஷயங்களை வடிகட்டுதல்'
 };
 const PLANET_PERIOD_EN={
  Sun:'self-confidence, authority and accepting responsibility',Moon:'emotional balance, caregiving and family priorities',
  Mars:'initiative, directness and responses to competition',Mercury:'communication, planning and checking information',
  Jupiter:'learning, mentoring and long-term beliefs',Venus:'cooperation, relationships and personal comforts',
  Saturn:'duty, patience and building consistent routines',Rahu:'experiments, unusual options and ambition',
  Ketu:'detachment, discernment and reflective time'
 };
 const HOUSE_LIFE_TA=['தன் செயல்பாடு','குடும்பப் பேச்சும் பணப் பழக்கமும்','சொந்த முயற்சியும் உடன்பிறப்புகளும்','வீட்டு அமைதியும் தாயார் தொடர்பும்','கற்றலும் குழந்தைகள் தொடர்பான முடிவுகளும்','அன்றாடக் கடமையும் போட்டியும்','நெருங்கிய உறவும் கூட்டுத்திட்டமும்','மறைமுகச் சிக்கலும் மாற்றமும்','பெரியோர் வழிகாட்டுதலும் கொள்கையும்','தொழிலும் பொறுப்பும்','வருமானமும் நட்பும்','செலவும் ஓய்வும்'];
 const HOUSE_LIFE_EN=['personal conduct','family speech and money habits','independent work and siblings','home and maternal responsibilities','learning and children','daily duties and competition','close partnerships','unexpected change and uncertainty','mentors and values','work and accountability','income and friends','spending and rest'];
 const AGE_STAGE=[{max:3,key:'infant'},{max:12,key:'child'},{max:17,key:'teen'},{max:24,key:'young'},{max:59,key:'adult'},{max:69,key:'mature'},{max:Infinity,key:'senior'}];
 const AGE_TA={
  infant:'இந்த வயதில் பலன் குழந்தையின் சொந்த முடிவாக அல்ல; பெற்றோர் பராமரிப்பு, பாதுகாப்பு மற்றும் வளர்ச்சிச் சூழலாகவே வாசிக்கப்படுகிறது.',
  child:'இந்தப் பள்ளிப் பருவத்தில் கற்றல், பழக்க வளர்ச்சி மற்றும் பெற்றோர் வழிகாட்டுதலே முதன்மை.',
  teen:'இந்த வயதில் கல்வி, நட்பு மற்றும் தனித்த முடிவெடுக்கும் திறன் உருவாகும் விதத்திற்கே முன்னுரிமை தர வேண்டும்.',
  young:'பயிற்சி, உயர்கல்வி, ஆரம்பப் பணி மற்றும் சொந்தப் பொறுப்புகளைக் கற்றுக்கொள்ளும் நிலையுடன் இதை இணைத்துப் பார்க்கலாம்.',
  adult:'இப்போதைய குடும்பம், தொழில் மற்றும் பொருளாதாரப் பொறுப்புகளுடன் இதன் தொடர்பை ஆராயலாம்.',
  mature:'நிலைத்த வருவாய், குடும்ப வழிகாட்டுதல், நீண்டகாலத் திட்டம் மற்றும் உடல்நல ஒழுங்கு இப்போது முக்கியம்.',
  senior:'முதிய வயதில் இளம் வயதிற்கான வேலை/திருமண நிகழ்வுகளை வலியுறுத்தாமல், உறவுகள், அனுபவப் பகிர்வு, நலம், ஓய்வு ஆகியவற்றுடன் பொருத்திப் பார்க்க வேண்டும்.'
 };
 const AGE_EN={
  infant:'At this age, interpret the theme through caregiving and development, not a decision made by the infant.',
  child:'School, developing habits and caregiver support take priority at this age.',
  teen:'Education, friendships and gradual independence matter more than adult milestones.',
  young:'Link this period to training, further study, entering work and learning responsibility.',
  adult:'Consider the native’s current family, professional and financial responsibilities.',
  mature:'Long-range planning, family guidance and healthy routines matter particularly now.',
  senior:'Focus on relationships, sharing experience, wellbeing and rest rather than promising youthful career or marriage milestones.'
 };
 function dateString(s){const v=String(s||'').slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(v))return null;
  const d=new Date(v+'T00:00:00Z');return !Number.isNaN(d.valueOf())&&d.toISOString().startsWith(v)?v:null;}
 function ageInfo(birthDate,asOf){let b=dateString(birthDate),a=dateString(asOf);if(!b||!a||a<b)return null;
  let y=Number(a.slice(0,4))-Number(b.slice(0,4));if(a.slice(5)<b.slice(5))y--;return {age:y,stage:AGE_STAGE.find(x=>y<=x.max).key};}
 function chartBirthDate(full){const c=full?.chart||full;return c?.birthDate||c?.birth?.date||c?.birth?.birthDate||null;}
 function adultSafety(topic,stage,ta){
  if(['infant','child','teen'].includes(stage)&&[7,10,11].includes(topic))return ta?'திருமணம், வேலை அல்லது சம்பாத்தியம் நடந்துவிடும் என்று இதைச் சொல்லக்கூடாது; குடும்ப ஆதரவு, கல்வி மற்றும் வருங்காலத் திறனாகவே பொருள் கொள்ள வேண்டும்.':'Do not present this as an imminent marriage, job or income event; it concerns guidance, education and skills in development.';
  if(stage==='senior'&&[5,7,10].includes(topic))return ta?'புதிய வயதுக்குரிய கட்டாய நிகழ்வாக அல்ல; ஏற்கெனவே உள்ள உறவுகள், அனுபவம் மற்றும் குடும்பப் பொறுப்பின் வழியாக இதைப் பார்க்க வேண்டும்.':'Read this through existing relationships, accumulated experience and family duties, not as a guaranteed youthful milestone.';
  return '';
 }
 function contextLine(i,j,ta){const a=(ta?FOCUS_TA:FOCUS_EN)[i],b=(ta?CROSS_TA:CROSS_EN)[j];
  return ta?`${a} தொடர்பாக, ${b} எந்த வகையில் ஒத்துழைக்கின்றன என்பதைக் கவனிக்க வேண்டிய கட்டம்.`:
  `For ${a}, the relevant point is how ${b} shape the day-to-day outcome.`;
 }
 const SUPPORT_TA=[
  'தொடர்புள்ள வேலைகளுக்கு முன்னுரிமை வைத்தால் சிறிய முன்னேற்றங்களைத் தொடர்ந்து உருவாக்க முடியும்.',
  'சரியான நேரத்தில் உதவி கேட்பதும் சீராகப் பயிற்சி செய்வதும் சாதகமான மாற்றமாக அமையலாம்.',
  'முன்பு கற்ற முறைகளை நடைமுறையில் பயன்படுத்த நல்ல சந்தர்ப்பம் அமையக்கூடும்.',
  'தொடங்கிய செயலை முடித்துவிடும் ஒழுங்கு இந்த நேரத்தில் பலம் தரக்கூடும்.'
 ];
 const CAUTION_TA=[
  'அவசரமாக முடிவு எடுத்துவிடாமல் விவரங்களையும் பொறுப்புப் பகிர்வையும் தெளிவுபடுத்துவது அவசியம்.',
  'ஒரே நேரத்தில் பல பொறுப்புகளை ஏற்றால் நேரம் மற்றும் மனச்சுமை அதிகரிக்கலாம்.',
  'பேசாமல் உள்ளுக்குள் வைத்துக்கொள்ளும் அதிருப்தியை உரியவரிடம் தெளிவாகச் சொல்லுவது உதவும்.',
  'சிறிய தடையைப் பெரிய தோல்வியாகக் கருதாமல் வேலைக்கான மாற்று வழியை அமைத்துக்கொள்ள வேண்டும்.'
 ];
 const SUPPORT_EN=[
  'Giving the linked tasks a clear priority can yield steady, modest progress.',
  'Asking for support at the right moment and practising consistently could make a difference.',
  'There may be an opening to use what has already been learned in practical ways.',
  'Following through on existing commitments may be more useful than starting too many new ones.'
 ];
 const CAUTION_EN=[
  'Avoid rushing a decision; clarify details and who is responsible for what.',
  'Taking on too many duties at once could strain time and energy.',
  'A difficult expectation is best discussed explicitly rather than silently carried.',
  'Treat a setback as a reason to adjust the plan, not proof of failure.'
 ];
 function natalQualification(d,focus,related,ta){
   const fh=d.houses[focus-1],rh=d.houses[related-1];
   const fLord=d.planets[fh.lord],rLord=d.planets[rh.lord];
   const aligned=fLord.house===related||rLord.house===focus||fLord.house===rLord.house;
   const support=['own','exalted'].includes(fLord.dignity)||rh.aspects.includes('Jupiter');
   const obstacle=fLord.dignity==='debilitated'||rh.occupants.includes('Saturn')||rh.occupants.includes('Mars');
   if(ta){
     if(aligned&&support)return 'பிறப்பு ஜாதகத்தில் இரு பாவங்களின் அதிபதித் தொடர்பும் உறுதியான ஆதரவும் இருப்பதால், இந்த மாற்றத்தைச் செயல்படுத்த ஒரு தொடர்ச்சியான முயற்சி பயனளிக்கலாம்.';
     if(aligned&&obstacle)return 'பிறப்பு ஜாதகத்தில் இந்த இரு பாவங்களும் தொடர்புபட்டாலும் சிரமம் தரும் கிரகநிலையும் இருப்பதால், விரைவான முடிவைவிட பொறுப்புகளை ஒழுங்குபடுத்துவது முக்கியம்.';
     if(aligned)return 'பிறப்பு ஜாதகத்தில் இந்த இரு பாவங்களின் அதிபதிகள் ஒன்றுடன் ஒன்று சம்பந்தப்படுவதால், ஒரு துறையில் எடுத்த முடிவு மற்ற துறையிலும் தாக்கம் ஏற்படுத்தலாம்.';
     if(support)return 'பிறப்பு ஜாதகத்தில் கிடைக்கும் ஆதரவைப் பயன்படுத்தி சிறிய இலக்குகளை முறையாக அடையலாம்; காலப்பலனை மட்டும் நம்பி முடிவெடுக்கத் தேவையில்லை.';
     if(obstacle)return 'பிறப்பு ஜாதகத்தில் சவாலான தொடர்புகள் இருப்பதால், வேலைப்பளு மற்றும் எதிர்பார்ப்புகளை முன்கூட்டியே திட்டமிடுவது உதவும்.';
     return 'பிறப்பு ஜாதகத்தில் இந்த இரு பாவங்களுக்கிடையே நேரடித் தொடர்பு வலுவாக இல்லாததால், பெரும் நிகழ்வை உறுதியாகக் கணிக்க ஆதாரம் போதாது.';
   }
   if(aligned&&support)return 'The natal rulers connect both areas with some support: deliberate follow-through may help.';
   if(aligned&&obstacle)return 'The natal rulers connect these areas but also carry challenges: organize obligations before making a quick choice.';
   if(aligned)return 'The natal rulers connect the two domains, so a choice in one may influence the other.';
   if(support)return 'There is some natal support for measured progress; timing alone is not a reason to commit.';
   if(obstacle)return 'Natal challenges call for realistic expectations and a manageable workload.';
   return 'The natal link between these two domains is weak; there is insufficient basis for predicting a major event.';
 }
 function unique(a){return [...new Set(a)];}
 function aspect(p,house,target){return (OFFSETS[p]||[]).some(n=>(house+n-2)%12+1===target);}
 function involvement(d,p,target){const x=d.planets[p];const h=d.houses[target-1];if(!x)return 0;
  let n=(x.house===target?3:0)+(h.lord===p?3:0)+(aspect(p,x.house,target)?2:0);
  const l=d.planets[h.lord];if(l&&(l.house===x.house||aspect(p,x.house,l.house)))n+=1;
  return n;
 }
 function strength(d,key){const p=d.planets[key];if(!p)return 0;
  const dignity={exalted:2,own:2,neutral:0,debilitated:-2}[p.dignity]||0;
  const difficult=(p.house===6||p.house===8||p.house===12)?-1:0;
  const receiving=d.houses[p.house-1].aspects;
  return Math.max(-3,Math.min(3,dignity+difficult+(receiving.includes('Jupiter')?1:0)-(receiving.includes('Saturn')?1:0)));
 }
 function chosenPeriod(periods,asOf){if(!Array.isArray(periods))return null;
  const p=periods.find((x,i)=>dateString(x.start)&&dateString(x.end)&&x.start<=asOf&&(asOf<x.end||(i===periods.length-1&&asOf===x.end)));
  if(!p)return null;const child=Array.isArray(p.antardashas)?p.antardashas:[];
  const ad=child.find((x,i)=>dateString(x.start)&&dateString(x.end)&&x.start<=asOf&&(asOf<x.end||(i===child.length-1&&asOf===x.end)));
  if(!ad)return null;const mdName=normName(p.lord),adName=normName(ad.lord);
  if(!mdName||!adName)return null;
  return {md:mdName,ad:adName,mdStart:p.start,mdEnd:p.end,adStart:ad.start,adEnd:ad.end};
 }
 function evidenceStatus(d,key,focus,related){const n=involvement(d,key,focus)*2+involvement(d,key,related);
  if(n>=7)return 'strong';if(n>=3)return 'linked';return 'indirect';}
 function dashaTopicOpening(d,focus,period,ta){
   const md=period.md,ad=period.ad,p=d.planets[md],q=d.planets[ad];
   const emphasis=involvement(d,md,focus)*2+involvement(d,ad,focus);
   if(ta){
    const scope=emphasis>=5?'இந்த வாழ்க்கைத் துறையில் நேரடியாக வெளிப்படக்கூடிய காலத் தொடர்பு உள்ளது.':emphasis>=2?'இந்த வாழ்க்கைத் துறையுடன் ஒரு அளவுக்குத் தொடர்பு உள்ளது.':'இந்தத் துறையில் குறிப்பிட்ட நிகழ்வைச் சொல்லப் போதிய நேரடித் தசா ஆதாரம் இல்லை.';
    return `${LABEL[md]} பிறப்பு ஜாதகத்தின் ${p.house}-ஆம் பாவத்தில் இருந்து ${PLANET_PERIOD_TA[md]} ஆகியவற்றை முன்னிலைப்படுத்தலாம்; ${LABEL[ad]} ${q.house}-ஆம் பாவத்தில் இருந்து ${PLANET_PERIOD_TA[ad]} தொடர்பான அன்றாட முடிவுகளை மாற்றக்கூடும். ${scope}`;
   }
   const scope=emphasis>=5?'The period rulers are directly linked to this domain.':emphasis>=2?'There is a partial natal link to this domain.':'No clear direct natal timing link supports a definite event here.';
   return `In the natal D1, ${md} occupies house ${p.house}, emphasizing ${PLANET_PERIOD_EN[md]}; ${ad} occupies house ${q.house}, bringing in ${PLANET_PERIOD_EN[ad]}. ${scope}`;
 }
 function renderDasha(full, asOf,lang='ta'){
  const ta=lang!=='en',date=dateString(asOf);if(!date)return {ok:false,reason:'invalid-reference-date'};
  const chart=full?.chart||full;const age=ageInfo(chartBirthDate(full),date);if(!age)return {ok:false,reason:'missing-birth-date-or-before-birth'};
  const mdad=chosenPeriod(chart?.dashas?.periods,date);if(!mdad)return {ok:false,reason:'no-covered-mahadasha-bhukti'};
  const {d,base}=prepared(chart,lang),topics=[];
  for(let i=0;i<12;i++){
   const paragraphs=[];
   for(let j=0;j<12;j++){
    const f=i+1,r=j+1,md=mdad.md,ad=mdad.ad,mdLinks=involvement(d,md,f)+involvement(d,md,r),adLinks=involvement(d,ad,f)+involvement(d,ad,r);
    const indicator=mdLinks*2+adLinks+strength(d,md)+strength(d,ad);
    const level=indicator>=7?'focused':indicator>=3?'moderate':'indirect';
    const tone=indicator<0?'cautious':indicator>4?'supportive':'balanced';
    const consequence=(tone==='cautious'?(ta?CAUTION_TA:CAUTION_EN):(ta?SUPPORT_TA:SUPPORT_EN))[(i*7+j*3+(mdLinks+adLinks))%4];
    // The period and age are stated ONCE in the subsection header rather than
    // repeating identical boilerplate through all 144 linked-house passages.
    const intro='';
    const link=level==='focused'?(ta?'தசாநாதர்களின் பிறப்பு ஜாதகத் தொடர்பு இத்துறையை நேரடியாகத் தூண்டுகிறது; ':'The natal connections of the period lords give this topic direct emphasis; '):
     level==='moderate'?(ta?'இந்தப் பாவத் தொடர்பு சில சூழல்களில் முன்னிலையாகலாம்; ':'this natal house connection may become noticeable in particular circumstances; '):
      (ta?'இந்தத் தலைப்பிற்கு நேரடியான கால ஆதாரம் குறைவாக இருப்பதால் குறிப்பிட்ட நிகழ்வு உறுதி என்று கூற முடியாது; ':'there is no strong direct timing link, so a specific event should not be claimed; ');
    const text=ta?`${intro}${contextLine(i,j,true)} ${link}${consequence} ${natalQualification(d,f,r,true)}`:
      `${intro}${contextLine(i,j,false)} ${link}${consequence} ${natalQualification(d,f,r,false)}`;
    paragraphs.push({relatedHouse:r,text,evidence:{mahadasha:md,antardasha:ad,mdNatalHouse:d.planets[md].house,adNatalHouse:d.planets[ad].house,mdLinks,adLinks,level,tone,focusHouse:f,relatedHouse:r}});
   }
   // Age or life-stage rule is applied per topic, not repeated across 144 paragraphs.
   topics.push({number:i+1,title:base.topics[i].title,opening:dashaTopicOpening(d,i+1,mdad,ta),ageGuidance:adultSafety(i+1,age.stage,ta),paragraphs});
  }
  return {ok:true,kind:'dasha',referenceDate:date,age:age.age,ageStage:age.stage,ageGuidance:(ta?AGE_TA:AGE_EN)[age.stage],period:mdad,topics};
 }
 function normalizedTransit(transit,asOf){if(!transit||dateString(transit?.requested?.date)!==asOf||!Array.isArray(transit.planets))return null;
  const positions={};for(const p of transit.planets){const n=normName(p.name);if(!['Jupiter','Saturn','Rahu','Ketu'].includes(n))continue;
   const si=signIndex(p.rasi??p.longitude);if(si>=0)positions[n]={sign:si,retrograde:Boolean(p.retrograde)};
  }
  return ['Jupiter','Saturn','Rahu','Ketu'].every(k=>positions[k])?positions:null;
 }
 function transitConnection(d,pos,p,focus,related){const house=((pos.sign-d.lagna+12)%12)+1;
   const occupying=(house===focus?4:0)+(house===related?3:0);
   // No inferred Rahu/Ketu 'special' drishti: positional influence only.
   const af=(p==='Jupiter'||p==='Saturn')&&aspect(p,house,focus)?2:0;
   const ar=(p==='Jupiter'||p==='Saturn')&&aspect(p,house,related)?2:0;
   const fLord=d.planets[d.houses[focus-1].lord];const rLord=d.planets[d.houses[related-1].lord];
   const natalLink=(fLord.sign===pos.sign?2:0)+(rLord.sign===pos.sign?1:0);
   return {house,points:occupying+af+ar+natalLink,aspectsFocus:!!af,aspectsRelated:!!ar,conjFocusLord:fLord.sign===pos.sign};
 }
 const TR_TA={Jupiter:['கற்றுக்கொள்ளவும் நல்ல ஆலோசனையைப் பயன்படுத்தவும் ஒரு வாய்ப்பு','அளவுக்கு மீறிய நம்பிக்கையால் தேவையான சரிபார்ப்பைத் தவிர்க்காதிருப்பது'],Saturn:['பொறுப்பை ஒழுங்குபடுத்தி நீண்டகாலத்திற்கு பயன் தரும் அடித்தளம் அமைப்பது','தாமதத்தைத் தோல்வியாகக் கருதாமல் வேலையைப் படிப்படியாக முடிப்பது'],Rahu:['பழைய முறையை மாற்றிப் பார்க்கும் துணிச்சலை முறையாகப் பயன்படுத்துவது','புதிதாகத் தோன்றும் விஷயத்தின் விவரங்களை முழுமையாக அறிந்த பிறகே முடிவெடுப்பது'],Ketu:['தேவையற்ற சுமையை நீக்கி கவனத்தைச் சீராக்குவது','அவசர விலகல் அல்லது பேசாமல் தீர்மானிப்பதைத் தவிர்ப்பது']};
 const TR_EN={Jupiter:['use guidance and opportunities to learn','avoid overconfidence and verify the details'],Saturn:['establish a patient, dependable routine','do not interpret delays as an inevitable failure'],Rahu:['experiment with a new approach in a considered way','check facts before following an attractive new possibility'],Ketu:['reduce unnecessary demands and keep priorities clear','avoid withdrawing or deciding without discussion']};
 function renderTransit(full, asOf,lang='ta'){
  const ta=lang!=='en',date=dateString(asOf);if(!date)return {ok:false,reason:'invalid-reference-date'};
  const chart=full?.chart||full,age=ageInfo(chartBirthDate(full),date);if(!age)return {ok:false,reason:'missing-birth-date-or-before-birth'};
  const pos=normalizedTransit(full?.transit,date);if(!pos)return {ok:false,reason:'transit-missing-or-date-mismatch'};
  const {d,base}=prepared(chart,lang),topics=[];
  const target=['Jupiter','Saturn','Rahu','Ketu'];
  for(let i=0;i<12;i++){
   const paragraphs=[];
   for(let j=0;j<12;j++){
    const f=i+1,r=j+1,links=target.map(p=>({planet:p,...transitConnection(d,pos[p],p,f,r)}));
    const weights=[...links].sort((a,b)=>b.points-a.points||target.indexOf(a.planet)-target.indexOf(b.planet));
    const activated=weights.filter(x=>x.points>0);const primary=activated[0]||null;
    const secondary=activated.find(x=>x.planet!==primary?.planet&&x.points>=3)||null;
    const guidance=primary?(ta?TR_TA:TR_EN)[primary.planet][(i+j)%2]:null;
    const backUp=secondary?(ta?TR_TA:TR_EN)[secondary.planet][(i+j+1)%2]:null;
    let text;
    if(ta){
     text=`${contextLine(i,j,true)} `;
     if(primary){text+=`${LABEL[primary.planet]} தற்போதைய பெயர்ச்சியில் ஜாதகத்தின் ${primary.house}-ஆம் பாவம் வழியாக இந்தப் பகுதிக்குத் தொடர்பு தருகிறது; ${guidance} முக்கியமாக இருக்கலாம். `;
      if(secondary)text+=`மேலும் ${LABEL[secondary.planet]} காட்டும் ${backUp} என்ற தேவையையும் ஒருசேரக் கவனிக்கலாம். `;
     }else text+='இந்த நான்கு மெதுவாக நகரும் கிரகங்களின் தற்போதைய நிலைகளில் இப்பகுதிக்கு நேரடித் தொடர்பு குறைவு; தனியாக நிகழ்வு அல்லது நன்மை/தீமை உறுதியாகக் கூற முடியாது. ';
     text+=natalQualification(d,f,r,true);
    }else{
     text=`${contextLine(i,j,false)} `;
     if(primary){text+=`${primary.planet} is transiting natal house ${primary.house}, giving this area a relevant connection; it may help to ${guidance}. `;
      if(secondary)text+=`Alongside this, ${secondary.planet} suggests a need to ${backUp}. `;
     }else text+='The current placements of these four slow-moving planets show no direct link to this specific area; an event or outcome should not be asserted. ';
     text+=natalQualification(d,f,r,false);
    }
    paragraphs.push({relatedHouse:r,text,evidence:{focusHouse:f,relatedHouse:r,transitDate:date,placements:links,activated:activated.map(x=>x.planet),natalRelatedLord:d.houses[j].lord,natalRelatedLordHouse:d.planets[d.houses[j].lord].house}});
   }
   topics.push({number:i+1,title:base.topics[i].title,opening:'',ageGuidance:adultSafety(i+1,age.stage,ta),paragraphs});
  }
  return {ok:true,kind:'transit',referenceDate:date,age:age.age,ageStage:age.stage,ageGuidance:(ta?AGE_TA:AGE_EN)[age.stage],transiting:pos,topics};
 }
 function htmlBlock(report,lang){const ta=lang!=='en',type=report.kind==='dasha'?'dasha':'transit';
  const title=type==='dasha'?(ta?'II. D1, தசா–புக்தி மற்றும் வயதின் அடிப்படையிலான வாழ்க்கைப் பலன்கள்':'II. D1, Dasha–Bhukti and Age-Based Life Predictions'):
    (ta?'III. D1, குரு–சனி–ராகு–கேது பெயர்ச்சி மற்றும் வயதின் அடிப்படையிலான பலன்கள்':'III. D1, Jupiter–Saturn–Rahu–Ketu Transits and Age-Based Predictions');
  if(!report.ok)return `<section class="smv-d1-life-reading smv-d1-time-reading" data-d1-time="${type}"><h2>${title}</h2><p class="smv-d1-life-method">${ta?'தேவையான காலத் தகவல்கள் முழுமையாகக் கிடைக்காததால் ஊகப் பலன்கள் காட்டப்படவில்லை.':'No reading is invented when the required period or transit data are incomplete.'}</p></section>`;
  const period=report.period;
  const info=type==='dasha'?(ta?`தேதி: ${report.referenceDate} · வயது: ${report.age} · ${LABEL[period.md]} மகாதசை (${period.mdStart} – ${period.mdEnd}) · ${LABEL[period.ad]} புக்தி (${period.adStart} – ${period.adEnd})`:
    `Reference: ${report.referenceDate} · Age: ${report.age} · ${period.md} major period (${period.mdStart} – ${period.mdEnd}) · ${period.ad} sub-period (${period.adStart} – ${period.adEnd})`):
    (ta?`பெயர்ச்சி தேதி: ${report.referenceDate} · வயது: ${report.age} · குரு, சனி, ராகு, கேது பெயர்ச்சி நிலைகளை D1-உடன் ஒப்பீடு`:
      `Transit date: ${report.referenceDate} · Age: ${report.age} · Jupiter, Saturn, Rahu and Ketu compared with D1`);
  const h=report.topics.map(t=>`<section class="smv-d1-life-topic" data-d1-${type}-topic="${t.number}"><h3>${t.number}. ${esc(t.title)}</h3>${t.opening?`<p class="smv-d1-topic-opening">${esc(t.opening)}</p>`:''}${t.ageGuidance?`<p class="smv-d1-age-guidance">${esc(t.ageGuidance)}</p>`:''}${t.paragraphs.map(x=>`<p class="smv-d1-life-paragraph" data-d1-${type}-related-house="${x.relatedHouse}">${esc(x.text)}</p>`).join('')}</section>`).join('');
  return `<section class="smv-d1-life-reading smv-d1-time-reading" data-d1-time="${type}" lang="${ta?'ta':'en'}"><h2>${title}</h2><p class="smv-d1-life-method">${esc(info)}</p><p class="smv-d1-age-guidance">${esc(report.ageGuidance)}</p>${h}</section>`;
 }
 function html(full,asOf,lang='ta'){const d=renderDasha(full,asOf,lang),t=renderTransit(full,asOf,lang);return htmlBlock(d,lang)+htmlBlock(t,lang);}
 return Object.freeze({renderDasha,renderTransit,html,htmlBlock,ageInfo,chosenPeriod,version:'267-period-transit-twelve-house-lenses'});
});
