/* SMV ASTRO — D1 + Vimshottari MD/AD + four slow transits; evidence-led edition.
   Inspect all 12 D1 houses for each topic; narrate only direct activations.
   Uses computed full result and optional user-declared context; no recalc, requests,
   AI, randomness, promises of life events or Rahu/Ketu speculative aspects. */
(function(root,factory){const b=typeof module==='object'&&module.exports?require('./d1-life-reading.js'):root?.SMVLifePredictionD1;const api=factory(b);if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.SMVTimePredictionD1=api;})(typeof window!=='undefined'?window:globalThis,function(BASE){'use strict';
 if(!BASE||typeof BASE.toD1!=='function')throw Error('Load d1-life-reading.js before d1-time-reading.js');
 const P=['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu'];
 const T=['சூரியன்','சந்திரன்','செவ்வாய்','புதன்','குரு','சுக்கிரன்','சனி','ராகு','கேது'];
 const ALIAS=Object.fromEntries(P.map((p,i)=>[T[i],p]));for(const p of P)ALIAS[p]=p;
 Object.assign(ALIAS,{Surya:'Sun',Chandra:'Moon',Kuja:'Mars',Budha:'Mercury',Guru:'Jupiter',Shukra:'Venus',Shani:'Saturn'});
 const LABEL=Object.fromEntries(P.map((p,i)=>[p,T[i]]));const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const CROSS_TA=['சுய முடிவுகள்','குடும்பச் செலவும் பேச்சும்','புதிய முயற்சிகள்','வீட்டின் பொறுப்புகள்','படிப்பு மற்றும் குழந்தைகள் சார்ந்த முடிவுகள்','போட்டியும் அன்றாடக் கடமையும்','நெருங்கிய உறவுகளும் ஒப்பந்தங்களும்','எதிர்பாராத மாற்றம்','வழிகாட்டுதலும் உயர்கல்வியும்','தொழில் பொறுப்பு','வருமான இலக்கும் நண்பர்களும்','ஓய்வும் செலவும்'];
 const CROSS_EN=['personal choices','family finances and communication','fresh initiatives','home duties','study and children','daily duties and competition','partnership and agreements','unexpected changes','mentors and advanced study','career responsibilities','income and friends','rest and expenses'];
 const DASHA_TA=[
 ['தனக்கென ஒரு முடிவை எடுக்கும் துணிவு அதிகரிக்கலாம்','அளவுக்கு அதிகமான பொறுப்பு ஏற்றால் எரிச்சல் சொற்களிலும் வெளிப்படலாம்'],
 ['பேச்சில் தீர்க்கமான முடிவுகள் உருவாகி குடும்பச் செலவுகளை மறுசீரமைக்கும் எண்ணம் வரலாம்','சேமிப்பு, உறவினர் எதிர்பார்ப்பு இரண்டையும் ஒன்றாகச் சுமப்பதால் முரண்பாடு உருவாகலாம்'],
 ['பழைய திறனை மீண்டும் பயிற்சி செய்து புதிய முயற்சியில் பயன்படுத்தும் காலநிலை','சகோதரர் அல்லது சக பணியாளரின் உதவியை எதிர்பார்த்துச் செயல் தாமதப்படலாம்'],
 ['வீட்டாரின் தேவைக்கும் தனிப்பட்ட அமைதிக்கும் இடையே முன்னுரிமை மாற்றம் தேவைப்படலாம்','வீட்டு வேலை மற்றும் வெளிப்பணி ஒன்றாக வந்தால் மனச்சுமை கூடலாம்'],
 ['கற்ற விஷயத்தை நடைமுறைக்கு மாற்றி அறிவை மேம்படுத்தும் ஆர்வம் அதிகரிக்கலாம்','அதிகமாக ஆராய்வதால் ஒரு கல்வித் தீர்மானம் இழுபறியாகலாம்'],
 ['வேலையில் சிக்கியிருந்த பணியை ஒழுங்குபடுத்தி முடிக்கும் முயற்சி அதிகரிக்கலாம்','சிக்கலைத் தீர்க்கும் பெயரில் எல்லாப் பணியையும் தானே ஏற்றுக்கொள்ளும் நிலை வரலாம்'],
 ['நெருங்கிய உறவில் பேசித் தெளிவுபடுத்த வேண்டிய விஷயங்கள் முன்னிலையாகலாம்','ஒருவரின் அறிவுரை மற்றவருக்குக் கட்டுப்பாடாகத் தோன்றக்கூடிய இடைவெளி உண்டாகலாம்'],
 ['முன்பு ஒத்திவைத்த மாற்றுத் திட்டத்தை மறுபரிசீலனை செய்வதற்கான சூழல் உருவாகலாம்','முழுத் தகவல் இல்லாத மாற்றத்திற்கு விரைந்து ஒப்புக்கொள்வதில் சிரமம் இருக்கலாம்'],
 ['வழிகாட்டியிடம் ஆலோசனை கேட்டு நீண்டகால இலக்கைத் திருத்தும் எண்ணம் வரலாம்','கொள்கை வேறுபாடு காரணமாக பயனுள்ள அறிவுரையையும் தவிர்க்கும் மனநிலை இருக்கலாம்'],
 ['பணியில் ஏற்கெனவே தெரிந்த திறனுக்கு அதிகப் பொறுப்பு கிடைக்கும் சூழலை ஆராயலாம்','வேலை ஒப்பந்தம் அல்லது பதவி பற்றிய எதிர்பார்ப்பில் நிதானம் தேவைப்படலாம்'],
 ['முன்னரே உள்ள தொடர்புகள் வழியாக வருமான முயற்சியைத் திட்டமிடலாம்','நண்பர்கள் அல்லது கூட்டாளிகளிடம் ஆதாய எதிர்பார்ப்பை அளவோடு வைக்க வேண்டும்'],
 ['செலவு மற்றும் ஓய்வு பழக்கங்களை மறுசீரமைக்க விருப்பம் உருவாகலாம்','முடிக்காத பணியை நினைத்து ஓய்வையும் தூக்கத்தையும் குறைக்கும் நிலை இருக்கலாம்']
 ];
 const DASHA_EN=[
 ['a more decisive approach to personal choices','taking on too much responsibility and becoming irritable'],
 ['clearer family money conversations and changed saving priorities','conflict between savings and relatives’ expectations'],
 ['reusing acquired skills in new initiatives','delays while waiting for siblings or coworkers'],
 ['rebalancing household needs with time for oneself','mental pressure from overlapping work and household duties'],
 ['using learned ideas more actively','putting off study decisions through excessive analysis'],
 ['organizing delayed everyday tasks','taking over everyone’s tasks when solving problems'],
 ['discussing unresolved expectations in close relationships','well-meant guidance sounding like control'],
 ['reconsidering a previously postponed contingency plan','rushing into a change before facts are checked'],
 ['reviewing long-range aims with a mentor','rejecting useful guidance over differences in beliefs'],
 ['reviewing opportunities to take responsibility for familiar work','unrealistic expectations over role or contract changes'],
 ['planning an income effort through existing contacts','expecting too much from friends or colleagues'],
 ['adjusting spending and rest routines','losing sleep over unfinished tasks']
 ];
 const TRANSIT_TA=[
 ['முன்னுரிமைகளைத் தானாக வகுத்து முடிவெடுக்கும் முறையில் மாற்றம்','பல முடிவுகளை ஒரே நேரத்தில் துரத்துவதால் கவனம் குறைதல்'],
 ['குடும்ப வரவு–செலவுக் கணக்கில் புதிய ஒழுங்கு கொண்டு வருதல்','கவர்ச்சியான செலவு அல்லது தேவையற்ற கொள்முதலை அதிகப்படுத்துதல்'],
 ['சிறிய முயற்சியைப் பயிற்சியுடன் வளர்ப்பதற்கான வாய்ப்பை அறிதல்','விரைவான முடிவின் காரணமாகத் தொடங்கிய செயலையே மாற்றுதல்'],
 ['வீட்டின் வசதிகளை மாற்றுவது குறித்து ஆலோசனை நடத்துதல்','சில தாமதங்களால் வீட்டுத் திட்டத்திற்கான பொறுமை குறைதல்'],
 ['புதிய கற்றல் முறையைச் சோதித்து திறனை விரிவுபடுத்துதல்','ஒரு தகவலால் கவரப்பட்டு அடிப்படைப் புரிதலைத் தவிர்த்தல்'],
 ['பணிப்பழக்கத்தில் நீண்டகால ஒழுங்கை வலுப்படுத்துதல்','புதிய வேலைச்சுமையால் பழைய உடல்நலப் பழக்கங்களைப் புறக்கணித்தல்'],
 ['நெருங்கிய உறவுகளின் தேவைகளைப் பேசித் தெளிவுபடுத்துதல்','வெளிப்புற மாற்றங்களை உறவின் நிரந்தரப் பிரச்சினையாகக் கருதுதல்'],
 ['எதிர்பாராத மாற்றத்துக்கான பாதுகாப்புத் திட்டத்தைப் புதுப்பித்தல்','சரிபார்க்காத தகவலை நம்பி முக்கிய மாற்றம் மேற்கொள்ளுதல்'],
 ['வழிகாட்டுதலையும் படிப்பிற்கான வாய்ப்பையும் மீளாய்வு செய்தல்','வழக்கமான நம்பிக்கைக்கும் புதிய ஆலோசனைக்கும் இடையே குழப்பம்'],
 ['பணியின் நடைமுறையை மேம்படுத்த புதிய பொறுப்பை ஆய்வு செய்தல்','தாமதமான அங்கீகாரத்தை முழுத் தோல்வியாகக் கருதுதல்'],
 ['நீண்டகால வருமான இலக்கிற்கேற்ப நட்பு/தொடர்புகளைச் சீரமைத்தல்','உடனடி ஆதாயத்தின் பின்னால் பழைய பொறுப்புகளை விடுதல்'],
 ['ஓய்வு, தனிப்பட்ட இடம் மற்றும் செலவு ஒழுங்கை மீண்டும் திட்டமிடுதல்','திடீர் செலவிற்காகச் சேமிப்பை அளவுக்கு மீறிப் பயன்படுத்துதல்']
 ];
 const TRANSIT_EN=[
 ['revisiting personal priorities and decision-making','losing focus by pursuing too many decisions'],
 ['organizing the family budget','unnecessary purchases or attractive but unsuitable expenses'],
 ['practising a new skill or initiative','changing a plan too quickly'],
 ['reviewing practical home improvements','impatience over delayed household plans'],
 ['testing a new learning method','following attractive information without checking the basics'],
 ['strengthening a sustainable work routine','neglecting wellbeing because of increased duties'],
 ['clarifying the needs of close partners','treating an external disruption as a permanent relationship problem'],
 ['revising contingency plans','making a change based on unchecked information'],
 ['re-evaluating mentors and study opportunities','confusion between old values and new advice'],
 ['considering a new work responsibility','treating delayed recognition as failure'],
 ['aligning networks with lasting income aims','chasing a short-term gain while neglecting commitments'],
 ['replanning spending and private downtime','using savings impulsively for unplanned costs']
 ];
 const PERIOD_TA={Sun:'அதிகாரம் மற்றும் சுயமரியாதை',Moon:'உணர்ச்சி மற்றும் குடும்பக் கவனம்',Mars:'துணிவான செயல் மற்றும் போட்டி',Mercury:'பேச்சு, கணக்கு மற்றும் விவர ஆய்வு',Jupiter:'ஆலோசனை, அறிவு மற்றும் கொள்கை',Venus:'உறவு ஒத்துழைப்பு மற்றும் வசதி',Saturn:'கடமை, பொறுமை மற்றும் ஒழுங்கு',Rahu:'புதிய வழி மற்றும் வழக்கமற்ற முயற்சி',Ketu:'தேர்வு செய்து சிலவற்றை விலக்கும் அணுகுமுறை'};
 const PERIOD_EN={Sun:'authority and self-respect',Moon:'emotions and family care',Mars:'initiative and competition',Mercury:'communication and checking details',Jupiter:'learning and guidance',Venus:'cooperation and comfort',Saturn:'duty and patience',Rahu:'experimentation',Ketu:'discernment and withdrawal'};
 const TR_TA={Jupiter:'குரு',Saturn:'சனி',Rahu:'ராகு',Ketu:'கேது'};
 const TRANSIT_ROLE_TA={Jupiter:'வளர்ச்சிக்கான ஆலோசனையைப் பெறும் வாய்ப்பாக',Saturn:'கடமையை நீண்டகால ஒழுங்காக மாற்றும் சோதனையாக',Rahu:'புதுமையைத் தேர்ந்தெடுக்கும் ஆர்வமாக',Ketu:'தேவையற்ற சுமையை விடுவிக்கும் தேடலாக'};
 const TRANSIT_ROLE_EN={Jupiter:'learning from advice and growth opportunities',Saturn:'patient restructuring of duties',Rahu:'testing unusual alternatives',Ketu:'simplifying and letting go'};
 function normName(s){return ALIAS[String(s||'').trim()]||null;}
 function dateString(s){const v=String(s||'').slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(v))return null;const dt=new Date(v+'T00:00:00Z');return Number.isFinite(dt.getTime())&&dt.toISOString().startsWith(v)?v:null;}
 function ageInfo(birth,asOf){const b=dateString(birth),a=dateString(asOf);if(!b||!a||a<b)return null;let y=Number(a.slice(0,4))-Number(b.slice(0,4));if(a.slice(5)<b.slice(5))y--;const stage=y<=3?'infant':y<=12?'child':y<=17?'teen':y<=24?'young':y<=59?'adult':y<=69?'mature':'senior';return {age:y,stage};}
 function chosenPeriod(periods,asOf){if(!Array.isArray(periods))return null;const md=periods.find((x,i)=>dateString(x.start)&&dateString(x.end)&&x.start<=asOf&&(asOf<x.end||(i===periods.length-1&&asOf===x.end)));if(!md)return null;const list=Array.isArray(md.antardashas)?md.antardashas:[],ad=list.find((x,i)=>dateString(x.start)&&dateString(x.end)&&x.start<=asOf&&(asOf<x.end||(i===list.length-1&&asOf===x.end)));if(!ad)return null;const a=normName(md.lord),b=normName(ad.lord);return a&&b?{md:a,ad:b,mdStart:md.start,mdEnd:md.end,adStart:ad.start,adEnd:ad.end}:null;}
 function chartBirthDate(full){const c=full?.chart||full;return c?.birthDate||c?.birth?.date||c?.birth?.birthDate||null;}
 function aspect(p,from,to){return (BASE.DRISHTI[p]||[]).some(n=>((from+n-2)%12)+1===to);}
 function periodImpact(d,p,h){const x=d.planets[p],topic=d.houses[h-1],lord=d.planets[topic.lord];const marks=[];if(x.house===h)marks.push('occupies');if(topic.lord===p)marks.push('rules');if(aspect(p,x.house,h))marks.push('aspects');if(x.house===lord.house&&p!==topic.lord)marks.push('conjuncts-lord');if(aspect(p,x.house,lord.house))marks.push('aspects-lord');return {planet:p,house:h,marks,points:marks.reduce((n,m)=>n+({occupies:4,rules:4,aspects:3,'conjuncts-lord':2,'aspects-lord':1}[m]||0),0)};}
 function filteredContext(context){return BASE.sanitizeContext(context||{});}
 function stagePhrase(topic,stage,ta){const child=['infant','child','teen'].includes(stage);if(child&&[7,10,11].includes(topic))return ta?'இந்த வயதில் இதை நேரடி திருமண, வேலை அல்லது சம்பள நிகழ்வாக அல்ல; குடும்ப ஆதரவு, பழக்க வளர்ச்சி, கல்வி எனப் பொருள் கொள்ள வேண்டும்.':'At this age this concerns guidance, habits and learning, not imminent marriage, employment or earnings.';if(stage==='senior'&&[5,7,10].includes(topic))return ta?'முதிய வயதில் இந்தத் தொடர்பு அனுபவத்தைப் பகிர்வதும் ஏற்கெனவே உள்ள உறவுகளும் முதன்மை; புதிய இளவயது நிகழ்வை முன்கூட்டியே கூறுவதல்ல.':'In later life, focus on existing relationships and sharing experience, not youthful milestones.';if(stage==='young'&&[6,10].includes(topic))return ta?'இப்பருவத்தில் பயிற்சியிலிருந்து நடைமுறைப் பொறுப்புக்குச் செல்லும் மாற்றத்துடன் இதை இணைத்துப் பார்க்கலாம்.':'For this life stage, connect it with training and entering practical responsibilities.';return '';}
 function contextPhrase(topic,ctx,ta){const t=String(ctx.currentWork||'').toLowerCase(),m=String(ctx.maritalStatus||'').toLowerCase();if(topic===10&&t){const study=/student|studying|மாணவ|படிப்பு/.test(t),retired=/retired|pension|ஓய்வு/.test(t),business=/business|self.employed|வியாபாரம்|தொழில்முனை/.test(t);return ta?(study?'நீங்கள் மாணவராக இருப்பதாகத் தெரிவித்துள்ளதால் வேலை உயர்வாக அல்ல, கற்றல் மற்றும் பயிற்சியாக இந்தக் காலத் தொடர்பைப் பார்க்க வேண்டும்.':retired?'நீங்கள் ஓய்வுபெற்றதாகத் தெரிவித்துள்ளதால் புதிய பதவி அல்ல, அனுபவப் பகிர்வும் அன்றாட ஒழுங்கும் பொருத்தமானவை.':business?'நீங்கள் சொந்தத் தொழில் செய்வதாகத் தெரிவித்துள்ளதால் வாடிக்கையாளர், ஒப்பந்தம் மற்றும் பொறுப்புகளை இந்தக் காலத்துடன் இணைக்கலாம்.':'தற்போதைய பணிநிலையை நீங்கள் தெரிவித்துள்ளதால் அதற்கேற்ப பொறுப்புகளின் மாற்றத்தைக் கவனிக்கலாம்.'):(study?'You report studying: apply this to training rather than promotion.':retired?'You report retirement: apply this to routine and mentoring rather than a new post.':business?'You report running a business: consider clients and shared responsibilities.':'Interpret this alongside your stated current work.');}
 if(topic===7&&m){const single=/unmarried|single|திருமணமாகவில்லை|மணமாகாத/.test(m),married=/married|திருமணமான|திருமணம் ஆன/.test(m);if(single)return ta?'திருமணமாகாதவர் என்று நீங்கள் தெரிவித்துள்ளதால் இது இப்போதைய உறவு அணுகுமுறை அல்லது துணைத் தேர்வு பற்றிய வாசிப்பே; நிகழ்ந்த திருமண வாழ்க்கை என்று கருதப்படவில்லை.':'You report being unmarried; this concerns relationship approaches, not an existing marriage.';if(married)return ta?'திருமணமானவர் என்று நீங்கள் தெரிவித்துள்ளதால் இது ஏற்கெனவே உள்ள பொறுப்புகள் மற்றும் உரையாடல் பற்றிய காலப் பின்னணியாகப் பார்க்கப்படுகிறது.':'You report marriage, so this is read through current shared duties and communication.';}
 if(topic===4&&ctx.currentResidence&&ctx.birthPlace&&ctx.currentResidence.toLowerCase()!==ctx.birthPlace.toLowerCase())return ta?'தற்போது பிறப்பிடத்திலிருந்து வேறு இடத்தில் வசிப்பதாகத் தெரிவித்துள்ளதால் குடும்பத் தொடர்பு அல்லது பயணத் தீர்மானங்களில் அந்த நடைமுறைத் தூரத்தையும் கவனிக்கலாம்.':'You report living away from your birthplace; consider that practical distance for home or travel decisions.';
 return '';}
 function ageTopic(topic,stage,ctx,ta){const s=stagePhrase(topic,stage,ta),c=contextPhrase(topic,ctx,ta);return [s,c].filter(Boolean).join(' ');}
 // V271: Each period is interpreted from *actual* natal links, not a universal
 // paragraph repeated for all 12 houses. Missing links never become events.
 const NATAL_SIGNS_TA=['மேஷம்','ரிஷபம்','மிதுனம்','கடகம்','சிம்மம்','கன்னி','துலாம்','விருச்சிகம்','தனுசு','மகரம்','கும்பம்','மீனம்'];
 const NATAL_SIGNS_EN=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
 const BHAAVA_TA=['தனிப்பட்ட அணுகுமுறை','குடும்ப பேச்சு மற்றும் பொருளாதாரம்','முயற்சி மற்றும் சகோதர உதவி','வீட்டுப் பொறுப்பு மற்றும் மன அமைதி','கல்வி, சிந்தனை மற்றும் குழந்தைகள்','போட்டி, கடன் மற்றும் அன்றாட உடல்நலப் பழக்கம்','உறவு மற்றும் கூட்டுச் செயல்பாடு','எதிர்பாராத மாற்றங்கள் மற்றும் பாதுகாப்பு','வழிகாட்டுதல் மற்றும் நீண்டகால நம்பிக்கை','தொழில் மற்றும் பொறுப்புப் பங்கீடு','வருமான வாய்ப்பு மற்றும் சமூக உறவு','செலவு, ஓய்வு மற்றும் தனிப்பட்ட நேரம்'];
 const BHAAVA_EN=['personal choices','family resources and speech','initiative and sibling ties','home duties and inner peace','learning and children','competition, obligations and health routines','partner communication','unexpected changes and contingency planning','mentoring and belief','work and responsibility','income and social connections','spending and private rest'];
 const PLANET_LENS_TA={Sun:['தலைமைப் பொறுப்பு','அதிகாரத்துடன் ஏற்படக்கூடிய கருத்து வேறுபாடு'],Moon:['மனநிலை மற்றும் நெருக்கம்','உணர்ச்சி வேகத்தால் முடிவை மாற்றுதல்'],Mars:['முயற்சி மற்றும் துணிவு','அவசர நடவடிக்கை மற்றும் மோதல்'],Mercury:['கணக்கீடும் பேச்சுவார்த்தையும்','விவரம் சரிபார்க்காமல் எடுத்த முடிவு'],Jupiter:['வழிகாட்டலும் கற்றலும்','அளவுக்கு அதிக எதிர்பார்ப்பு'],Venus:['ஒத்துழைப்பும் இணக்கமும்','வசதி சார்ந்த கூடுதல் செலவு'],Saturn:['ஒழுங்கும் நீடித்த முயற்சியும்','தாமதமும் பொறுப்புச் சுமையும்'],Rahu:['புதிய செயல்முறை தேடலும்','சரிபார்க்கப்படாத புதுமையில் அவசரம்'],Ketu:['தேவையற்றதை விலக்கும் தெளிவும்','திடீர் விலகலும் கவனக்குறைவும்']};
 const PLANET_LENS_EN={Sun:['leadership and responsibility','authority-related friction'],Moon:['emotional attentiveness','reacting too quickly to feelings'],Mars:['initiative and courage','rushed actions and conflict'],Mercury:['detailed analysis and negotiation','insufficiently checked decisions'],Jupiter:['guidance and education','unrealistic expectations'],Venus:['cooperation and harmony','comfort-driven expense'],Saturn:['discipline and sustained effort','delay and overload'],Rahu:['experimenting with new methods','unchecked risk-taking'],Ketu:['letting go of unneeded burdens','abrupt withdrawal']};
 function linkedPlanetSummary(d,planet,topic,lang){
  const ta=lang!=='en',pl=d.planets[planet],h=d.houses[topic-1],r=d.houses[pl.house-1],pts=BASE.scorePlanet(d,pl),marks=periodImpact(d,planet,topic).marks;
  const planetLabel=ta?LABEL[planet]:planet;
  const rel=marks.includes('rules')? (ta?'இந்தப் பாவத்திற்கு அதிபதியாகவும்': 'as ruler of this house'):
       marks.includes('occupies')?(ta?'இதே பாவத்தில் நின்றும்':'being placed in this house'):
       marks.includes('aspects')?(ta?'இந்தப் பாவத்தைப் பார்த்தும்':'through an aspect to this house'):
       marks.includes('conjuncts-lord')?(ta?'பாவாதிபதியுடன் சேர்ந்தும்':'by joining its ruler'):
       marks.includes('aspects-lord')?(ta?'பாவாதிபதியைப் பார்த்தும்':'by aspecting its ruler'):
       (ta?'நேரடித் தொடர்பு குறைவாக இருந்தும்':'with no direct natal link');
  const sign=(ta?NATAL_SIGNS_TA:NATAL_SIGNS_EN)[pl.sign],quality=pts>=2?(ta?'வலிமையான நிலையில்':'in a supported state'):pts<=-2?(ta?'அழுத்தம் கொண்ட நிலையில்':'under natal strain'):(ta?'கலப்பான நிலையில்':'with mixed strength');
  return {label:planetLabel,planet,pts,marks,house:pl.house,relatedLord:r.lord,relation:rel,sign,quality,positive:(ta?PLANET_LENS_TA:PLANET_LENS_EN)[planet][0],negative:(ta?PLANET_LENS_TA:PLANET_LENS_EN)[planet][1]};
 }
 function lifeStageLink(topic,age,ta){
  if(['infant','child','teen'].includes(age.stage)){
   if(topic===5)return ta?'இந்த வயதில் பாடங்களை ஏற்றுக்கொள்ளும் முறை, விளையாட்டால் கற்றல், ஆசிரியர் ஆதரவு போன்ற வளர்ச்சி சார்ந்த பலன்களுக்கே முன்னுரிமை.':'At this age, interpret education as learning habits and teacher support.';
   if(topic===7)return ta?'திருமண நிகழ்வு அல்ல; நண்பர்கள், பெற்றோர், நெருங்கியவர்களுடன் நம்பிக்கையை வளர்க்கும் பழக்கமாகப் பார்க்க வேண்டும்.':'This concerns trust with caregivers and friends, not a marriage event.';
   if(topic===10)return ta?'பதவி அல்லது சம்பளம் அல்ல; திறன் பயிற்சி, ஆசிரியருடன் ஒத்துழைப்பு, பொறுப்பைக் கற்றுக்கொள்வது என்பதே பொருத்தமான வாசிப்பு.':'Read professional houses as practical learning and developing responsibility, not a new job.';
  }
  if(['mature','senior'].includes(age.stage)){
   if(topic===6)return ta?'முறையான உடல்நலக் கண்காணிப்பும் தனக்கேற்ற அன்றாட ஒழுங்கும் இப்பருவத்தில் முக்கியம்; குறிப்பிட்ட நோய் என்று ஊகிக்கக் கூடாது.':'Prioritize reasonable routines and preventive care, not a diagnosis.';
   if(topic===7)return ta?'ஏற்கெனவே உள்ள நெருங்கிய உறவுகளைப் பராமரிப்பதும் உரையாடலுக்கு நேரம் ஒதுக்குவதும்தான் இப்பருவத்தின் முதன்மைப் பொருள்.':'Emphasize caring for existing relationships at this life stage.';
   if(topic===10)return ta?'புதிய பதவி பெறுதல் என்ற ஒரே பொருளில் அல்ல; அனுபவப் பகிர்வு, பொறுப்புக் குறைப்பு அல்லது தன்னார்வச் செயலாகவும் வாசிக்க வேண்டும்.':'Read this as experience sharing or adjusted commitments, not automatic promotion.';
  }
  if(age.stage==='young'&&topic===10)return ta?'பயிற்சியிலிருந்து வேலைத் திறன் உருவாகும் மாற்றப் பருவமாகக் கொள்ள வேண்டும்.':'Interpret this as a transition from training to independent skills.';
  return '';
 }
 function cautionForTopic(topic,md,ad,age,ta){
  if([1,6,8,12].includes(topic))return ta?
    `${LABEL[md]}–${LABEL[ad]} காலத்தில் 1, 6, 8, 12 பாவங்களின் தொடர்பை மரபு ரீதியில் கவனித்தாலும், குறிப்பிட்ட நோய், விபத்து அல்லது ஆயுள் முடியும் வயதை இதனால் நிர்ணயிக்க முடியாது. ${age.age>=60?'முறையான மருத்துவப் பரிசோதனை, மருந்து ஒழுங்கு மற்றும் ஓய்வு பற்றிய கவனமே முதன்மை.':'உடற்பயிற்சி, தூக்க நேரம், மன அழுத்தம் மற்றும் தேவையான மருத்துவப் பராமரிப்பில் ஒழுங்கு முக்கியம்.'}`:
    'Traditional house links do not diagnose disease, accidents, or lifespan. Appropriate preventive care and professional medical assessment take priority.';
  return '';
 }
 function dashaEffectsForAge(index,age,ta){
  const k=index+1;
  if(['infant','child','teen'].includes(age.stage)){
   const taMap={5:['படிப்பில் கவனம் செலுத்துவதற்கும் புதிய விஷயங்களைப் பயிற்சி செய்யவும் வாய்ப்பு','பாடச் சுமை அல்லது கவனச் சிதறலால் கற்றல் இடையூறு'],7:['நண்பர்களுடன் ஒத்துழைத்து கருத்தைப் பகிரும் பழக்கம் வளர்தல்','நண்பர்கள் அல்லது பெரியவர்களின் வழிகாட்டுதலைத் தவறாகப் புரிந்துகொள்ளும் சூழல்'],10:['வகுப்புப் பணி, சிறிய பொறுப்பு மற்றும் திறன் பயிற்சியில் முன்னேற்றம்','மிகுதியான எதிர்பார்ப்பால் பள்ளிப் பொறுப்புகளில் மனச்சுமை'],11:['நண்பர்கள், குழுச் செயல்கள் மற்றும் பயிற்சியில் ஒத்துழைப்பு','நண்பர்களுடன் ஒப்பிடுவதால் கவலை அல்லது கவனச்சிதறல்']};
   const enMap={5:['progress in lessons and practical skills','study pressure and distraction'],7:['learning cooperation and communication with friends','misunderstandings with peers or caregivers'],10:['developing skills and age-appropriate responsibility','overly demanding study expectations'],11:['support from friends and group learning','unhelpful comparison with peers']};
   if((ta?taMap:enMap)[k])return (ta?taMap:enMap)[k];
  }
  if(['mature','senior'].includes(age.stage)){
   const taMap={5:['அனுபவத்தை இளையோருடன் பகிர்வதற்கான வாய்ப்பு','குடும்பத்தில் எல்லா முடிவையும் தானே ஏற்கும் சுமை'],7:['ஏற்கெனவே உள்ள நெருங்கிய உறவுகளுடன் நேரத்தைப் பகிர்தல்','பழைய கருத்து வேறுபாடுகளைப் பேசாமல் ஒதுக்குவது'],10:['அனுபவத்தை வழிகாட்டலாக மாற்றும் வாய்ப்பு','தனக்கேற்ற பொறுப்பின் அளவைத் தேர்ந்தெடுக்காத சுமை']};
   const enMap={5:['sharing experience with younger people','carrying too many family decisions'],7:['giving time to established relationships','leaving old disputes undiscussed'],10:['mentoring and practical experience','taking on unmanageable commitments']};
   if((ta?taMap:enMap)[k])return (ta?taMap:enMap)[k];
  }
  return (ta?DASHA_TA:DASHA_EN)[index];
 }
 function transitEffectsForAge(index,age,ta){
  const k=index+1;
  if(['infant','child','teen'].includes(age.stage)){
   const taMap={5:['கற்றல் பழக்கங்களில் முன்னேற்றம்','படிப்பில் கவனச் சிதறல்'],7:['பரஸ்பர ஒத்துழைப்பில் பழக்கம் பெறுதல்','நண்பர்களிடையே கருத்து வேறுபாடு'],10:['பயிற்சி மற்றும் வகுப்புப் பொறுப்பில் முன்னேற்றம்','கற்றலுக்குத் தேவைக்கு அதிகப் பொறுப்பு'],11:['நண்பர்களுடன் குழுச் செயல்களில் பங்கேற்பது','சுற்றத்தினருடன் ஒப்பிடும் சிரமம்']};
   const enMap={5:['strengthening learning habits','losing study focus'],7:['developing cooperation','misunderstanding friends'],10:['learning routines and class duties','excessive expectations on learning'],11:['learning through groups and friends','comparison with peers']};
   if((ta?taMap:enMap)[k])return (ta?taMap:enMap)[k];
  }
  if(['mature','senior'].includes(age.stage)){
   const taMap={5:['குடும்பத்தினருடன் அறிவையும் அனுபவத்தையும் பகிர்தல்','அளவுக்கு அதிக அறிவுரை காரணமான இடைவெளி'],10:['பொறுப்புகளைக் குறைத்து அனுபவப் பகிர்வு','உடல்நலத் தேவையை மீறி பணிச்சுமை ஏற்றல்']};
   const enMap={5:['sharing experience with family','too much unsolicited advice'],10:['mentoring and simplifying responsibilities','duties that strain wellbeing']};
   if((ta?taMap:enMap)[k])return (ta?taMap:enMap)[k];
  }
  return (ta?TRANSIT_TA:TRANSIT_EN)[index];
 }
 function renderDasha(full,asOf,lang='ta',context={}){
  const ta=lang!=='en',date=dateString(asOf);
  if(!date)return {ok:false,reason:'invalid-reference-date'};
  const chart=full?.chart||full,age=ageInfo(chartBirthDate(full),date);
  if(!age)return {ok:false,reason:'missing-birth-date-or-before-birth'};
  const period=chosenPeriod(chart?.dashas?.periods,date);
  if(!period)return {ok:false,reason:'no-covered-mahadasha-bhukti'};
  const d=BASE.toD1(chart),ctx=filteredContext(context),topics=[];
  for(let i=0;i<12;i++){
   const focus=i+1,focusHouse=d.houses[i],focusScore=BASE.houseScore(d,focusHouse);
   const all=Array.from({length:12},(_,j)=>{const rel=j+1,lens=BASE.lens(d,focus,rel),mdImpact=periodImpact(d,period.md,rel),adImpact=periodImpact(d,period.ad,rel);return {relatedHouse:rel,lens,mdImpact,adImpact,activation:mdImpact.points*2+adImpact.points+lens.relevance};});
   const md=linkedPlanetSummary(d,period.md,focus,lang),ad=linkedPlanetSummary(d,period.ad,focus,lang);
   const signal=focusScore+md.pts+ad.pts;
   const primary=(md.marks.length>ad.marks.length?md:ad),second=(primary===md?ad:md);
   const base=dashaEffectsForAge(i,age,ta),area=(ta?BHAAVA_TA:BHAAVA_EN)[i];
   const positive=signal>=-2,negative=signal<=3;
   // V272: each major/sub period gets a TWO-SIDED READING grounded in
   // natal lordship and actual MD/AD placements. Avoid separate generic
   // 'supportive potential' paragraphs that repeated in thousands of windows.
   const natalTie=all.filter(x=>x.relatedHouse!==focus&&
       (x.mdImpact.points+x.adImpact.points>=4)&&x.lens.links.length)
      .sort((a,b)=>b.activation-a.activation||a.relatedHouse-b.relatedHouse)[0];
   const nearby=natalTie? (ta?BHAAVA_TA:BHAAVA_EN)[natalTie.relatedHouse-1]:'';
   const natalLink=natalTie?(ta?` இந்த அமைப்பில் ${nearby} தொடர்பும் சேர்ந்ததால் அந்தத் துறையில் எடுக்கும் முடிவு ${area} பற்றிய அணுகுமுறையையும் மாற்றக்கூடும்.`:
     ` The same placements also activate ${nearby}, linking decisions across those two areas.`):'';
   const supportive=ta?
    `${LABEL[period.md]} மகாதசையில் ${LABEL[period.ad]} புக்தி நடக்கும்போது ${area} தொடர்பாக ${base[0]} என்ற வழியில் முன்னேற்றத்தைத் தேடக்கூடும். ${primary.label} ${primary.sign} ராசியில் ${primary.house}-ஆம் பாவத்தில் ${primary.quality} இருப்பதும் ${primary.relation} செயல்படுவதும் இந்த வாய்ப்பின் முக்கிய ஜாதக ஆதாரமாகும். ${second.label} ${second.house}-ஆம் பாவத்திலிருந்து ${second.relation} இந்த முயற்சிக்குத் துணையாகவோ கட்டுப்பாடாகவோ அமையலாம்.${natalLink}`:
    `In ${period.md} major period and ${period.ad} subperiod, ${area} may develop through ${base[0]}. Natal ${primary.label} in ${primary.sign}, house ${primary.house}, ${primary.quality}, acts ${primary.relation}. ${second.label} in house ${second.house} ${second.relation}.${natalLink}`;
   const challenge=ta?
    `இதே காலத்தின் சவாலான பக்கம் ${base[1]} என்பதாக இருக்கலாம். ${md.label} (${md.sign}, ${md.house}-ஆம் பாவம்) மற்றும் ${ad.label} (${ad.sign}, ${ad.house}-ஆம் பாவம்) இருவரின் தொடர்பு ${signal>=2?'ஒப்பீட்டளவில் ஆதரவாக இருந்தாலும் இந்தச் சிக்கல் முற்றிலும் நீங்கிவிடாது':'கலப்பான அல்லது அழுத்தமான நிலையில் இருப்பதால் பொறுப்புகளின் அளவை உணர்ந்து செயல்பட வேண்டியிருக்கலாம்'}. ${md.negative} என்பதைக் கவனிப்பதோடு ${ad.negative} என்ற போக்கையும் அளவோடு கையாள வேண்டியிருக்கும்.`:
    `The difficult side of this period may be ${base[1]}. Natal ${md.label} (${md.sign}, house ${md.house}) and ${ad.label} (${ad.sign}, house ${ad.house}) have combined signal ${signal}; guard against ${md.negative} and ${ad.negative}.`;
   const paragraphs=[
     {relatedHouse:focus,text:supportive,evidence:{focusHouse:focus,md,ad,signal,period,side:'supportive'}},
     {relatedHouse:focus,text:challenge,evidence:{focusHouse:focus,md,ad,signal,period,side:'challenging'}}
   ];
   const linked=all.filter(x=>x.relatedHouse!==focus&&(x.mdImpact.points+x.adImpact.points>=4)&&x.lens.relevance>=2).sort((a,b)=>b.activation-a.activation||a.relatedHouse-b.relatedHouse).slice(0,2);
   for(const x of linked){const whom=x.mdImpact.points>=x.adImpact.points?md:ad,side=focusScore+x.lens.score>=0,other=(ta?BHAAVA_TA:BHAAVA_EN)[x.relatedHouse-1],trait=side?whom.positive:whom.negative;
     paragraphs.push({relatedHouse:x.relatedHouse,text:ta?
     `${area} பற்றிய முடிவில் ${other} சார்ந்த நிலையும் கலந்து வரலாம். ${whom.label} ${whom.house}-ஆம் பாவத்தில் இருந்து ${x.relatedHouse}-ஆம் பாவத்துடன் தொடர்பு கொண்டிருப்பதால், ${trait} என்ற நடைமுறை விளைவு உருவாகலாம்; ஆனால் அது சூழ்நிலைக்கேற்ப மாறக்கூடும்.`:
     `Decisions about ${area} can also depend on ${other}. ${whom.label} in house ${whom.house} links to house ${x.relatedHouse}, where ${trait} may modify the outcome.`,evidence:x});}
   // Age is already reflected by dashaEffectsForAge; avoid reprinting identical
   // life-stage and medical notes in each topic and every future window.
   const user=contextPhrase(focus,ctx,ta);
   if(user)paragraphs.push({relatedHouse:focus,text:user,evidence:{stage:age.stage,source:'user-declared-context'}});
   topics.push({number:focus,title:BASE.THEMES[i][ta?0:1],analyzedHouses:12,paragraphs,evidenceMatrix:all});
  }
  return {ok:true,kind:'dasha',referenceDate:date,age:age.age,ageStage:age.stage,period,topics};
 }
 function signIndex(v){if(typeof v==='number'&&Number.isFinite(v))return Math.floor(((v%360)+360)%360/30);const t=['மேஷம்','ரிஷபம்','மிதுனம்','கடகம்','சிம்மம்','கன்னி','துலாம்','விருச்சிகம்','தனுசு','மகரம்','கும்பம்','மீனம்'],e=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];const s=String(v||'').trim();let i=t.indexOf(s);if(i<0)i=e.findIndex(x=>x.toLowerCase()===s.toLowerCase());return i;}
 function normalizedTransit(transit,asOf){if(!transit||dateString(transit?.requested?.date)!==asOf||!Array.isArray(transit.planets))return null;const out={};for(const p of transit.planets){const n=normName(p.name);if(!['Jupiter','Saturn','Rahu','Ketu'].includes(n))continue;const sign=signIndex(p.rasi??p.longitude);if(sign>=0)out[n]={sign,retrograde:Boolean(p.retrograde)};}return ['Jupiter','Saturn','Rahu','Ketu'].every(k=>out[k])?out:null;}
 function transitImpact(d,positions,p,house){const x=positions[p],from=((x.sign-d.lagna+12)%12)+1,target=d.houses[house-1],lord=d.planets[target.lord],marks=[];if(from===house)marks.push('transit-through');if(['Jupiter','Saturn'].includes(p)&&aspect(p,from,house))marks.push('transit-aspect');if(lord.sign===x.sign)marks.push('natal-lord-contact');return {planet:p,transitHouse:from,house,marks,points:marks.reduce((n,m)=>n+({"transit-through":5,"transit-aspect":3,"natal-lord-contact":2}[m]||0),0)};}
 function transitStory(topic,age,ctx,ta,score){
  const defaultLine=(ta?TRANSIT_TA:TRANSIT_EN)[topic-1][score>=0?0:1];
  const work=String(ctx.currentWork||'').toLowerCase(),marital=String(ctx.maritalStatus||'').toLowerCase();
  if(['infant','child','teen'].includes(age.stage)&&[7,10,11].includes(topic))return ta?'குடும்பத்தாரின் வழிகாட்டுதலுடன் பள்ளிப் பழக்கங்களையும் ஒத்துழைப்பையும் வளர்த்தல்':'developing school habits and cooperation with caregivers';
  if(topic===10&&/student|மாணவ|படிப்பு/.test(work))return ta?'பாடம் சார்ந்த பயிற்சி, செய்முறைத் திறன் மற்றும் ஆசிரியர் வழிகாட்டுதலை மாற்றிப் பயன்படுத்துதல்':'adapting studies, practical skills and teacher guidance';
  if(topic===10&&/retired|pension|ஓய்வு/.test(work))return ta?'அனுபவத்தை மற்றவர்களுடன் பகிர்ந்து ஓய்வுக்கேற்ற பொறுப்புகளைத் தேர்ந்தெடுத்தல்':'sharing experience and choosing manageable commitments in retirement';
  if(topic===7&&/unmarried|single|திருமணமாகவில்லை|மணமாகாத/.test(marital))return ta?'நெருங்கிய உறவுகளிலும் துணையைத் தேர்ந்தெடுக்கும் அணுகுமுறையிலும் எதிர்பார்ப்பைத் தெளிவாக்குதல்':'clarifying expectations in close relationships and partner preferences';
  if(topic===4&&ctx.currentResidence&&ctx.birthPlace&&ctx.currentResidence.toLowerCase()!==ctx.birthPlace.toLowerCase())return ta?'பிறப்பிடத்திலிருந்து வேறு இடத்தில் வசிக்கும் நடைமுறைக்கு ஏற்ற குடும்பத் தொடர்பையும் வீட்டுத் திட்டத்தையும் சீரமைத்தல்':'adjusting home arrangements and family contact while living away from the birthplace';
  if(age.stage==='senior'&&[5,7,10].includes(topic))return ta?'ஏற்கெனவே உள்ள உறவுகளுக்கும் அனுபவப் பகிர்வுக்கும் நேரம் ஒதுக்குதல்':'devoting attention to existing relationships and sharing experience';
  return defaultLine;
 }
 // V271 transit narrative: only describe areas connected to the actual moving
 // planet, with different favourable and difficult consequences.
 function renderTransit(full,asOf,lang='ta',context={}){
  const ta=lang!=='en',date=dateString(asOf);
  if(!date)return {ok:false,reason:'invalid-reference-date'};
  const chart=full?.chart||full,age=ageInfo(chartBirthDate(full),date);
  if(!age)return {ok:false,reason:'missing-birth-date-or-before-birth'};
  const pos=normalizedTransit(full?.transit,date);
  if(!pos)return {ok:false,reason:'transit-missing-or-date-mismatch'};
  const d=BASE.toD1(chart),ctx=filteredContext(context),topics=[],ps=['Jupiter','Saturn','Rahu','Ketu'];
  for(let i=0;i<12;i++){
   const focus=i+1,h=d.houses[i],score=BASE.houseScore(d,h);
   const all=Array.from({length:12},(_,j)=>{const relatedHouse=j+1,links=ps.map(p=>transitImpact(d,pos,p,relatedHouse)),lens=BASE.lens(d,focus,relatedHouse);return {relatedHouse,links,lens,activation:links.reduce((a,x)=>a+x.points,0)+lens.relevance};});
   const onHouse=all[i].links.filter(x=>x.points>0).sort((a,b)=>b.points-a.points||ps.indexOf(a.planet)-ps.indexOf(b.planet));
   const rows=[],life=(ta?BHAAVA_TA:BHAAVA_EN)[i],lifeStory=transitStory(focus,age,ctx,ta,score);
   for(const activated of onHouse.slice(0,2)){
    const p=activated.planet,other=d.planets[h.lord],natal=linkedPlanetSummary(d,h.lord,focus,lang),planetHouse=activated.transitHouse;
    const gained=score+(p==='Jupiter'?2:p==='Saturn'?-1:p==='Rahu'?-2:-1);
    const ageEffects=transitEffectsForAge(i,age,ta),opportunity=ageEffects[0],challenge=ageEffects[1];
    const actual=activated.marks.includes('transit-through')?(ta?'நேரடியாகக் கடக்கிறது':'passes through'):
      activated.marks.includes('transit-aspect')?(ta?'பாரம்பரியப் பார்வையால் பார்க்கிறது':'aspects'):
      (ta?'பாவாதிபதி இருக்கும் ராசியைத் தொடுகிறது':'contacts the sign of its natal ruler');
    const caution=p==='Saturn'?(ta?'முடிவு தாமதமானாலும் பணியை முறையாகப் பகிர்ந்து தொடர்ந்து செய்வது முக்கியம்.':'Delays reward careful pacing and shared duties.'):
      p==='Rahu'?(ta?'புதிய வாய்ப்பில் ஆவல் ஏற்பட்டாலும் ஒப்பந்தங்களையும் விவரங்களையும் உறுதி செய்ய வேண்டும்.':'Check practical details before acting on novel options.'):
      p==='Ketu'?(ta?'பழைய முறையை விட்டு விலகுவதற்கு முன் அதனால் ஏற்படும் நடைமுறை விளைவுகளைப் பரிசீலிக்க வேண்டும்.':'Consider practical consequences before withdrawing from an existing approach.'):
      (ta?'வாய்ப்பை விரிவாக்குவதற்கு முன்பு அது எந்த அளவு பொறுப்பை உருவாக்கும் என்பதையும் அறிந்துகொள்ள வேண்டும்.':'Consider the commitments that accompany growth.');
    const transitFact=ta?`${TR_TA[p]} ${planetHouse}-ஆம் பாவத்திலிருந்து ${focus}-ஆம் பாவத்தை ${actual}; அந்தப் பாவாதிபதி ${natal.label} ${natal.sign} ராசியில் ${natal.house}-ஆம் பாவத்தில் ${natal.quality} உள்ளார்.`:
      `${p} in transit house ${planetHouse} ${actual} natal house ${focus}; the natal ruler ${natal.label} is in ${natal.sign}, house ${natal.house}, ${natal.quality}.`;
    const opportunityText=ta?
      `${transitFact} இந்த அமைப்பில் சாதகமாக வெளிப்பட்டால் ${opportunity} என்ற செயலில் முன்னேற்றம் இருக்கலாம். ${p==='Jupiter'?'வாய்ப்பின் பரப்பை விரிவாக்குவதற்கு':'இருக்கும் பொறுப்பை மறுசீரமைப்பதற்கு'} முன் ${natal.label} குறிக்கும் பிறப்பு ஜாதகச் சூழலையும் கருத்தில் கொள்ள வேண்டும்.`:
      `${transitFact} A constructive expression may involve ${opportunity}; weigh the natal ruler's situation before acting.`;
    const difficultText=ta?
      `${TR_TA[p]} பெயர்ச்சியின் சவாலான வெளிப்பாடு ${challenge} என்ற நிலையை ஏற்படுத்தக்கூடும். பிறப்பு பாவாதிபதியின் பலமதிப்பீடு ${score>=2?'ஆதரவாக':'அழுத்தமும் சாதகமும் கலந்த நிலையில்'} இருப்பதால், ${caution}`:
      `The challenging expression of ${p} may include ${challenge}. Natal house score ${score}: ${caution}`;
    // A single cause -> supportive/challenging reading prevents the same
    // transit contact from being narrated twice in every year/ingress.
    rows.push({relatedHouse:focus,text:opportunityText+' '+difficultText,evidence:{focusHouse:focus,planet:p,transitHouse:planetHouse,marks:activated.marks,natalLord:other,signal:gained,side:'both'}});
   }
   // Related-house evidence is included only for a genuine D1 link and transit activation.
   const indirect=all.filter(x=>x.relatedHouse!==focus&&x.lens.links.length>0&&x.lens.relevance>=4&&x.links.some(z=>z.points>=3))
     .sort((x,y)=>y.activation-x.activation||x.relatedHouse-y.relatedHouse).slice(0,onHouse.length?1:2);
   for(const x of indirect){
    const chosen=x.links.filter(z=>z.points>=3).sort((a,b)=>b.points-a.points)[0];
    const other=(ta?BHAAVA_TA:BHAAVA_EN)[x.relatedHouse-1];
    const otherLord=d.planets[d.houses[x.relatedHouse-1].lord];
    const focusLord=d.planets[h.lord];
    const strength=score+x.lens.score;
    const action=(ta?PLANET_LENS_TA:PLANET_LENS_EN)[chosen.planet][strength<0?1:0];
    const place=ta?`அதன் அதிபதி ${(ta?LABEL[d.houses[x.relatedHouse-1].lord]:d.houses[x.relatedHouse-1].lord)} ${(ta?NATAL_SIGNS_TA:NATAL_SIGNS_EN)[otherLord.sign]} ராசியில் ${otherLord.house}-ஆம் பாவத்தில் இருக்கிறார்; ${life} பாவாதிபதி ${(ta?LABEL[h.lord]:h.lord)} ${focusLord.house}-ஆம் பாவத்தில் உள்ளார்.`:
      `Its ruler occupies ${(ta?NATAL_SIGNS_TA:NATAL_SIGNS_EN)[otherLord.sign]}, house ${otherLord.house}; the ruler of ${life} occupies house ${focusLord.house}.`;
    const actualLink=x.lens.links.includes('mutual-exchange')?(ta?'இரு அதிபதிகள் பரிவர்த்தனை பெற்றுள்ளன':'The rulers exchange houses'):
      x.lens.links.includes('lords-conjunct')?(ta?'இரு அதிபதிகள் சேர்ந்துள்ளன':'The two rulers are conjunct'):
      x.lens.links.includes('focus-lord-in-related')?(ta?'முதன்மைப் பாவாதிபதி தொடர்புடைய பாவத்தில் இருக்கிறார்':'The focus ruler occupies the related house'):
      x.lens.links.includes('related-lord-in-focus')?(ta?'தொடர்புடைய பாவாதிபதி முதன்மைப் பாவத்தில் இருக்கிறார்':'The related ruler occupies the focus house'):
      (ta?'பிறப்பு ஜாதகத்தில் பார்வைத் தொடர்பு உள்ளது':'A natal aspect links these houses');
    rows.push({relatedHouse:x.relatedHouse,text:ta?
      `${TR_TA[chosen.planet]} ${x.links.find(z=>z.planet===chosen.planet).transitHouse}-ஆம் பாவத்திலிருந்து ${other} தொடர்பைத் தூண்டுகிறது. ${actualLink}; ${place} இந்த இரு தொடர்புகளும் இணையும் சூழலில் ${action} என்ற விளைவு வலுப்படலாம்; இது நிகழ்வு நடந்தே தீரும் என்ற உறுதி அல்ல.`:
      `${chosen.planet} activates ${other} through its transit from house ${chosen.transitHouse}. ${actualLink}; ${place} This connection may emphasise ${action}, not a certain event.`,
      evidence:{...x,planet:chosen.planet,impacts:x.links,transitHouse:chosen.transitHouse,linkedLordHouse:otherLord.house}});
   }
   if(!rows.length){
    const lord=d.planets[h.lord];
    rows.push({relatedHouse:focus,text:ta?
      `இந்தத் தேதியில் நான்கு மெதுவான பெயர்ச்சிக் கிரகங்களும் ${life} சார்ந்த பாவத்துடன் வலுவான நேரடித் தொடர்பு பெறவில்லை. அதன் அதிபதி ${LABEL[h.lord]} ${lord.house}-ஆம் பாவத்தில் இருப்பது பிறப்புத் தன்மையை விளக்கும்; ஆனால் இந்த நாளுக்குத் தனியாக உறுதியான பலனைச் சொல்லப் போதுமான பெயர்ச்சி ஆதாரம் இல்லை.`:
      `None of the four assessed slow transits has a strong direct link to ${life} on this date. Its natal ruler ${h.lord} in house ${lord.house} does not alone establish an event.`,evidence:{focusHouse:focus,direct:false}});
   }
   const stage='',personal=contextPhrase(focus,ctx,ta);
   if(onHouse.length||indirect.length){for(const x of [stage,personal].filter(Boolean))rows.push({relatedHouse:focus,text:x,evidence:{source:'age-or-provided-context'}});}
   topics.push({number:focus,title:BASE.THEMES[i][ta?0:1],analyzedHouses:12,paragraphs:rows,evidenceMatrix:all});
  }
  return {ok:true,kind:'transit',referenceDate:date,age:age.age,ageStage:age.stage,transiting:pos,topics};
 }
 function htmlBlock(rep,lang){const ta=lang!=='en',kind=rep.kind==='transit'?'transit':'dasha',title=kind==='dasha'?(ta?'II. D1, தசா–புக்தி மற்றும் வயதின் அடிப்படையிலான வாழ்க்கைப் பலன்கள்':'II. D1, Dasha–Bhukti and Age-Based Predictions'):(ta?'III. D1, குரு–சனி–ராகு–கேது பெயர்ச்சி மற்றும் வயதின் அடிப்படையிலான பலன்கள்':'III. D1, Jupiter–Saturn–Rahu–Ketu Transits and Age-Based Predictions');if(!rep.ok)return `<section class="smv-d1-life-reading smv-d1-time-reading" data-d1-time="${kind}"><h2>${title}</h2><p>${ta?'கணக்கிடப்பட்ட காலத் தரவு கிடைக்காததால் ஊகப் பலன் காட்டப்படவில்லை.':'Missing calculated timing data: no result has been invented.'}</p></section>`;
 const p=rep.period;const info=kind==='dasha'?(ta?`தேதி: ${rep.referenceDate} · வயது: ${rep.age} · ${LABEL[p.md]} மகாதசை (${p.mdStart} – ${p.mdEnd}) · ${LABEL[p.ad]} புக்தி (${p.adStart} – ${p.adEnd}). இந்த முழுப் புக்திக்குமான வாசிப்பு; ஒவ்வொரு நாளும் புதிய நிகழ்வு என்று அர்த்தமில்லை.`:`Date ${rep.referenceDate} · Age ${rep.age} · ${p.md} major period (${p.mdStart}–${p.mdEnd}), ${p.ad} sub-period (${p.adStart}–${p.adEnd}). This is a reading for the period, not a new event on each date.`):(ta?`பெயர்ச்சி தேதி: ${rep.referenceDate} · வயது: ${rep.age} · குரு, சனி, ராகு, கேது நிலைகள் பிறப்பு D1-உடன் ஒப்பிடப்பட்டுள்ளன.`:`Transit date ${rep.referenceDate} · Age ${rep.age} · Jupiter, Saturn, Rahu and Ketu compared against natal D1.`);
 const medical=kind==='dasha'?(ta?' 1, 6, 8, 12 பாவங்களை வைத்து நோயையோ ஆயுள் முடியும் தேதியையோ தீர்மானிக்க முடியாது; உடல்நலத்தில் மருத்துவ ஆலோசனைதான் முதன்மை.':' House connections do not diagnose illness or determine lifespan; clinical advice takes priority.'):(ta?' பெயர்ச்சி என்பது ஆயுள் அல்லது குறிப்பிட்ட நோயைக் கணிக்கும் மருத்துவ முறை அல்ல.':' Transit readings cannot determine lifespan or diagnose illness.');
 const topics=rep.topics.map(t=>`<section class="smv-d1-life-topic" data-d1-${kind}-topic="${t.number}"><h3>${t.number}. ${esc(t.title)}</h3>${t.paragraphs.map(z=>`<p class="smv-d1-life-paragraph" data-d1-${kind}-related-house="${z.relatedHouse}">${esc(z.text)}</p>`).join('')}</section>`).join('');return `<section class="smv-d1-life-reading smv-d1-time-reading" data-d1-time="${kind}" lang="${ta?'ta':'en'}"><h2>${title}</h2><p class="smv-d1-life-method">${esc(info+medical)}</p>${topics}</section>`;}
 function html(full,asOf,lang='ta',context={}){return htmlBlock(renderDasha(full,asOf,lang,context),lang)+htmlBlock(renderTransit(full,asOf,lang,context),lang);}
 return Object.freeze({renderDasha,renderTransit,html,htmlBlock,ageInfo,chosenPeriod,normalizedTransit,version:'272-d1-evidence-led-repetition-reduction'});
});
