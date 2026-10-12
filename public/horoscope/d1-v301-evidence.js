/* SMV ASTRO V301 — offline, D1-specific natal/Nakshatra/dasha/transit synthesis.
 * Consumes computed natal/period/transit data; no APIs, Firebase or chart recalc.
 * House + dispositor + star ruler are separate levels, not interchangeable.
 * Interpretations are traditional symbolism, never clinical disease forecasts.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.SMVD1V301Evidence=api;})(typeof window!=='undefined'?window:globalThis,function(){'use strict';
const ORDER=['Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury'];
const PN={Sun:'சூரியன்',Moon:'சந்திரன்',Mars:'செவ்வாய்',Mercury:'புதன்',Jupiter:'குரு',Venus:'சுக்கிரன்',Saturn:'சனி',Rahu:'ராகு',Ketu:'கேது'};
const normalize=x=>PN[x]?x:Object.keys(PN).find(k=>PN[k]===x)||x;
const RASI_TA=['மேஷம்','ரிஷபம்','மிதுனம்','கடகம்','சிம்மம்','கன்னி','துலாம்','விருச்சிகம்','தனுசு','மகரம்','கும்பம்','மீனம்'];
const RASI_EN=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const HOUSES_TA=['சுயநம்பிக்கையும் உடல் ஆற்றலும்','குடும்பப் பேச்சும் வரவு செலவும்','முயற்சியும் சிறு பயணமும்','வீடும் தாய்வழி உறவும் மன அமைதியும்','கல்வியும் ஆராய்ச்சியும் குழந்தைகள் சார்ந்த பொறுப்பும்','பணிப் போட்டியும் கடனும் உடல் ஒழுங்கும்','திருமண உறவும் கூட்டுச் செயல்களும்','திடீர் மாற்றமும் பொறுப்பு மாற்றமும்','உயர்கல்வியும் தந்தை/ஆசிரியர் வழிகாட்டுதலும்','தொழில் நிலையும் பொதுச் செயல்களும்','வருமானமும் நட்பு வட்டமும்','தனிநேரமும் ஓய்வும் வெளியிடச் செலவும்'];
const HOUSES_EN=['personal confidence and daily energy','family speech and finances','initiative and shorter journeys','home, maternal ties and peace of mind','learning, research and responsibilities involving children','workload, debt and day-to-day bodily routine','partnerships and cooperation','unplanned changes and reorganised duties','higher learning and guidance','career direction and practical duties','earnings and networks','privacy, rest and outgoings'];
const LIFE_TA={1:['தன்னுடைய வரம்பை அறிந்து வேலைப் பொறுப்பைப் பகிர்ந்தால் செயல்திறன் நீடிக்கும்.','அடுத்தடுத்து பொறுப்பு ஏற்றுக்கொண்டால் தனிப்பட்ட ஓய்வு பின்தங்கலாம்.'],2:['வரவு வருவது மட்டுமல்ல, குடும்பத்துக்காக எவ்வாறு செலவிடப்படுகிறது என்பதையும் முன்கூட்டியே ஒழுங்குபடுத்தும் வாய்ப்பு உண்டு.','உணர்ச்சி வேகத்தில் கொடுக்கப்படும் பண உறுதிகள் பிற்காலத்தில் சுமையாக மாறலாம்.'],3:['பழைய தவறைத் திருத்தி ஒரு செயல்முறையில் தேர்ச்சி பெறும் முயற்சி பலன் தரலாம்.','ஒவ்வொரு சிறிய திருத்தத்துக்கும் வேலையைத் தொடக்கத்திலிருந்து செய்தால் முக்கிய இலக்கு தள்ளிப் போகலாம்.'],4:['வீட்டின் நடைமுறை வசதியும் அமைதியான தனி வேலை இடமும் ஒரே நேரத்தில் தேவைப்படலாம்.','வீட்டு மாற்றம் அல்லது சொத்துச் செலவு குறித்து முடிவெடுப்பதில் குடும்பத்தினரின் ஒப்புதல் முக்கியம்.'],5:['கற்ற விவரத்தைக் களத்தில் பயன்படுத்தி, பிறருக்கும் புரியும் முறையில் மாற்றி அமைக்கும் திறன் வளரும்.','அறிவைப் பெருக்கிக்கொண்டே அதன் பயனை வெளியிடாமல் தாமதப்படுத்தும் போக்கு கூடலாம்.'],6:['பிறரால் முடிக்கப்படாத கடினமான பணியைப் பிரித்து ஆராய்ந்து தீர்வுகாண முடியும்.','அந்த வேலையையே தொடர்ந்து நினைத்தால் உணவும் உறக்கமும் ஒழுங்கிழக்கலாம்.'],7:['வேலைப் பங்கீடு, வாக்குறுதி, ஆலோசனை ஆகியவற்றில் தெளிவான உரையாடல் ஒத்துழைப்பைக் காக்கும்.','சொல்லப்படாத எதிர்பார்ப்பால் சிறிய கருத்து வேறுபாடு நீளலாம்.'],8:['முன்பிருந்த முறையின் மறைந்த குறைகளை அறிந்து பொருத்தமான மாற்றத்தை உருவாக்கக்கூடும்.','சரிபார்க்காத முடிவிற்காகப் பாதுகாக்க வேண்டிய அமைப்பை உடைத்துவிட வேண்டாம்.'],9:['நூலறிவை அனுபவத்தில் சோதித்துப் பார்த்து வழிகாட்டும் நபர்களிடம் இருந்து பயன்படும் கருத்தைத் தேர்ந்தெடுக்கலாம்.','ஒரே கருத்தில் பிடிவாதமாக இருந்தால் புதிய பயனுள்ள தகவலைத் தவறவிடலாம்.'],10:['செய்து முடித்த பணியின் தரமும் தொடர்ந்து வழங்கும் சேவையுமே நல்ல பெயரை உருவாக்கும்.','ஒவ்வொரு பொறுப்பையும் ஒருவரே ஏற்றால் முன்னேற்றத்துடன் சோர்வும் சேரக்கூடும்.'],11:['நம்பிக்கையான தொடர்புகளால் படிப்படியான வருமான வாய்ப்பு உருவாகலாம்.','உறுதியாகாத வருமானத்திற்காகச் செலவு செய்வதைத் தவிர்க்க வேண்டும்.'],12:['தொழிலுக்குத் தேவையான செலவும் தேவையற்ற செலவும் தனித்துக் கணக்கிட்டால் சேமிப்பு பாதுகாக்கப்படும்.','ஓய்வு நேரத்தை வேலைக்காக விட்டுக்கொடுத்தால் பிற முயற்சிகளிலும் கவனம் குறையலாம்.']};
const LIFE_EN={1:['Sharing responsibilities while recognising limits makes personal effort sustainable.','Too many new obligations may crowd out personal rest.'],2:['An intentional plan for family expenditure can be more valuable than income alone.','Financial promises made in haste can become a burden.'],3:['Revisiting a flawed process can develop a useful skill.','Repeating minor corrections may delay the central objective.'],4:['A comfortable home and a quiet area for focused work may both matter.','Family agreement matters before making costly changes to living arrangements.'],5:['The value of learning grows when it is turned into clear practical guidance.','Endless refinement can delay sharing useful work.'],6:['Complex work becomes manageable when broken into smaller problems.','Carrying unfinished tasks into meal and sleep time causes strain.'],7:['Clear expectations about roles and promises protect collaboration.','Unspoken expectations can prolong minor disagreements.'],8:['Revising an old system can reveal problems that were previously hidden.','Do not dismantle useful safeguards without verification.'],9:['Testing what mentors and texts teach helps identify dependable guidance.','A fixed opinion can obscure better evidence.'],10:['Completed work and dependable service contribute more to a reputation than publicity alone.','Taking every task personally can bring fatigue along with progress.'],11:['Trustworthy connections may gradually widen earning opportunities.','Do not spend income that has not yet been received.'],12:['Separating useful operating costs from avoidable spending protects reserves.','Sacrificing rest for work can reduce effectiveness elsewhere.']};
const HEALTH={
 vision:{ta:['கண்களை நீண்ட நேரம் ஒரே வேலையில் வைத்திருப்பதால் கண் சோர்வு, ஒளியில் அசௌகரியம் போன்ற உபாதைகள் தோன்றலாம்.','கண் சோர்வு அல்லது ஒளி உணர்வில் மாறுபாடு போன்றவை இப்பகுதிக்கான மரபுக் கவனப் பொருளாக இருக்கலாம்.'],en:['Eye fatigue or discomfort with bright light may be a traditional theme when activity is prolonged.','Visual comfort and light sensitivity are the conventional symbolic themes.']},
 digestion:{ta:['உணவு நேரம் மாறினால் அஜீரணம், வயிற்றெரிச்சல், வயிறு உப்புசம் போன்ற உபாதைகள் வெளிப்படக்கூடும்.','செரிமான ஒழுங்கு, வயிறு உப்புசம் போன்ற இடையிடை அசௌகரியங்களை மரபுக் குறியீடாக வாசிக்கலாம்.'],en:['Irregular meals may coincide with indigestion, burning discomfort or bloating in a traditional reading.','Digestive comfort and occasional bloating are the traditional themes.']},
 metabolism:{ta:['பசி நேரம் மாறுதல், உடல் சதைப்பற்று ஏற்ற இறக்கம் ஆகியவை மரபுவழி உடல் காரகத்துவமாகக் கருதப்படலாம்.','உணவின் அளவும் உடல் பழக்கமும் மாறுவதைக் குறிக்கும் மரபுக் குறிப்புகள் உள்ளன.'],en:['Changes in appetite timing and body fullness form the traditional association.','Traditional symbols concern food regularity and body proportions.']},
 bones:{ta:['முழங்கால் அல்லது மூட்டுகளில் இறுக்கம், நீண்ட உடலுழைப்புக்குப் பின் தசை வலி போன்ற அசௌகரியங்கள் மரபு வாசிப்பில் இடம் பெறலாம்.','மூட்டு இயக்கம் மற்றும் உடலுழைப்புக்குப் பிந்தைய ஓய்வு மரபுக் கவனப் பொருள்கள்.'],en:['Stiff joints or muscle discomfort after extended effort may be mentioned symbolically.','Joint movement and recovery after exertion are the traditional themes.']},
 breath:{ta:['மார்பு இறுக்கம், சளி சார்ந்த அசௌகரியம் அல்லது சுவாசப்பாதை எரிச்சல் போன்றவை மரபு ஜோதிடத்தில் இப்பகுதியுடன் இணைக்கப்படுகின்றன.','மார்பு சுகமும் சுவாச ஒழுங்கும் மரபு வாசிப்பில் கவனிக்கப்படும்.'],en:['Chest tightness, congestion and airway irritation appear in older symbolic correspondences.','Chest comfort and breathing patterns are the traditional symbolic focus.']},
 skin:{ta:['தோல் உலர்வு, அரிப்பு அல்லது வெளிப்புற எரிச்சல் போன்ற அசௌகரியங்களை மரபு காரகத்துவத்தில் ஆராயலாம்.','தோல் மென்மை மற்றும் வெளிப்புற மாற்றங்கள் மரபுக் கவனப் பொருளாக இருக்கலாம்.'],en:['Dry or irritated skin is an older symbolic association, rather than a specific disease.','Skin comfort and outward variation are traditional themes.']},
 reproductive:{ta:['கீழ்வயிறு அல்லது இடுப்புப் பகுதியில் இடையிடை அசௌகரியங்களை மரபுப் பாவக் காரகத்துவம் விவரிக்கலாம்.','இடுப்புப் பகுதியின் அன்றாட சுகமும் ஓய்வும் மரபு வாசிப்பில் இடம் பெறுகின்றன.'],en:['Pelvic or lower-abdominal discomfort is sometimes mentioned in traditional analogies.','Pelvic comfort and rest are the traditional symbolic focus.']},
 sleep:{ta:['அதிக சிந்தனையால் தூங்கத் தாமதித்தல், இடையில் விழித்தல், ஓய்வுக் குறைவு போன்ற உபாதைகள் ஏற்படக்கூடும்.','உறக்க நேரம் மாறுதல் மற்றும் தனிநேரம் குறைதல் போன்ற பழக்கங்கள் மரபுக் கவனப் பொருள்கள்.'],en:['Delayed sleep, interrupted rest and a changing sleep routine are traditional themes.','Sleep schedule and sufficient private rest are the main themes.']}
};
const validHouse=h=>Number.isInteger(h)&&h>=1&&h<=12;
const planet=(d,k)=>d?.planets?.[k]||null;
const owners=(d,k)=>Array.isArray(d?.houses)?d.houses.filter(h=>h.lord===k&&validHouse(h.no)).map(h=>h.no):[];
function starOf(d,k){const p=planet(d,k),v=Number(p?.longitude);if(!Number.isFinite(v))return null;const i=Math.floor((((v%360)+360)%360)/(360/27));return {index:i,lord:ORDER[i%9]};}
function points(d,md,ad){const score=new Map(),reasons=new Map();const put=(h,w,why)=>{if(!validHouse(h))return;score.set(h,(score.get(h)||0)+w);(reasons.get(h)||[]).push(why);};
 const root=(k,w,label)=>{const p=planet(d,k);if(!p)return;put(p.house,w*1.5,label+'-placement');for(const h of owners(d,k))put(h,w,label+'-lord');};
 root(md,2.2,'MD');root(ad,3.0,'AD');
 if(planet(d,md)&&planet(d,ad)&&md!==ad&&planet(d,md).house===planet(d,ad).house)put(planet(d,ad).house,1.5,'MD-AD-conjunction');
 // Nakshatra dispositor gets less weight; repeatedly visited planet is NOT counted again.
 const chain=[];for(const [from,mult] of [[md,1.35],[ad,1.5]]){const seen=new Set([from]);let cur=from;for(let depth=0;depth<3;depth++){const st=starOf(d,cur);if(!st||seen.has(st.lord))break;seen.add(st.lord);chain.push({from:cur,to:st.lord,depth});root(st.lord,mult*Math.pow(.57,depth),'star'+(depth+1));cur=st.lord;}}
 const ranked=[...score].sort((a,b)=>b[1]-a[1]||a[0]-b[0]).map(([house,weight])=>({house,weight:Math.round(weight*100)/100,reasons:reasons.get(house)}));
 return {ranked,chain,md,ad};
}
function evidenceClause(d,k,ta){const p=planet(d,k);if(!p)return '';const owned=owners(d,k).map(x=>ta?`${x}-ஆம்`:`${x}`);return ta?`${PN[k]||k} ${owned.length?owned.join(', ')+' பாவ அதிபதியாக ':''}${p.house}-ஆம் பாவத்தில் இருக்கிறார்`:`${k} rules ${owned.join(' and ')||'no classical house'} and occupies house ${p.house}`;}
function enhanceLife(d,topics,lang){if(!Array.isArray(topics))return topics;const ta=lang!=='en';return topics.map(t=>{const n=Number(t.number),house=d.houses?.[n-1],p=planet(d,house?.lord);if(!p||!validHouse(n))return t;
 // A natal supplement is justified by a cross-house linkage, not a stock paragraph for every house.
 const exchange=planet(d,d.houses?.[p.house-1]?.lord),hasMutual=!!exchange&&exchange.house===n&&p.house!==n;
 const interlocked=p.house!==n&&(d.houses[p.house-1]?.lord&&d.houses[p.house-1].lord!==house.lord)||hasMutual;
 const occupied=house.occupants?.length>0;
 if(!interlocked&&!occupied)return t;
 const others=(house.occupants||[]).filter(k=>k!==house.lord), lead=others[0]||house.lord;
 const base=(ta?LIFE_TA:LIFE_EN)[n]||[];
 const start=ta?`${n}-ஆம் பாவத்தின் ${HOUSES_TA[n-1]} தொடர்பான வாழ்வில் ${evidenceClause(d,house.lord,true)}. ${p.house!==n?`அதனால் ${p.house}-ஆம் பாவத்திற்குரிய ${HOUSES_TA[p.house-1]} சார்ந்த சூழலும் இங்கு இணைகிறது.`:''}`:`${evidenceClause(d,house.lord,false)}. ${p.house!==n?`This links ${HOUSES_EN[n-1]} with ${HOUSES_EN[p.house-1]}.`:''}`;
 const add=others.length?(ta?`${PN[lead]} இப்பாவத்தில் இருப்பதால் நடைமுறையில் ${base[0]} ${base[1]}`:`With ${lead} occupying this house, ${base[0]} ${base[1]}`):(ta?`${base[0]} ${base[1]}`:`${base[0]} ${base[1]}`);
 const item={text:`${start} ${add}`,evidence:{source:'v301-life-cross-house',house:n,lord:house.lord,lordHouse:p.house,planet:lead,planetSign:planet(d,lead)?.sign}};
 return {...t,paragraphs:[...(t.paragraphs||[]),item]};});}
function enhancePhysical(d,n,lang){const h=d.houses?.[n-1];if(!h)return null;const lord=planet(d,h.lord),ta=lang!=='en';if(!lord)return null;
 // Bring bodily routine together with actual chart configuration, no new diagnosis.
 if(![1,3,4,5,6,10,12].includes(n)||(!h.occupants?.length&&lord.house===n))return null;
 return {text:ta?`${n}-ஆம் பாவத்தின் உடல் உருவகத்துடன் ${PN[h.lord]} ${lord.house}-ஆம் பாவத்தில் இருப்பதையும் சேர்த்து வாசிக்க வேண்டும். ${lord.house!==n?`அன்றாட வாழ்க்கையில் ${HOUSES_TA[lord.house-1]} காரணமாக வேலை, உணவு அல்லது ஓய்வு நேரங்களைச் சீரமைக்க வேண்டிய தருணங்கள் உருவாகலாம்.`:`அதே பாவத்தில் திரளும் கிரகத் தொடர்புகள் ஓய்வு மற்றும் உடல் இயக்கத்தின் ஒழுங்கை அதிகம் கவனிக்கச் செய்கின்றன.`}`:`The ruler ${h.lord} occupies house ${lord.house}; consider this alongside the body symbolism of house ${n}. Routines connected with ${HOUSES_EN[lord.house-1]} may influence when work and rest are taken.`,evidence:{source:'v301-physical-ruler-context',house:n,lord:h.lord,lordHouse:lord.house}};
}
function enhanceMedical(d,spec,side,adverse,supports,lang){const ta=lang!=='en',type=side==='traditional-concern'?0:1,desc=HEALTH[spec.id];if(!desc)return null;const active=Array.isArray(adverse)&&adverse.length>0;
 const phrase=(ta?desc.ta:desc.en)[active?type:1],p=d.houses?.[spec.houses[0]-1],l=planet(d,p?.lord);
 const bound=l&&l.house!==spec.houses[0]?(ta?`இவற்றின் பாவாதிபதி ${PN[p.lord]} ${l.house}-ஆம் வீட்டில் இருப்பதால் ${HOUSES_TA[l.house-1]} தொடர்பான வாழ்க்கைச் சூழலையும் சேர்த்து இந்த வாசிப்பை ஆராயலாம்.`:`The house ruler ${p.lord} occupies house ${l.house}, linking this theme with ${HOUSES_EN[l.house-1]}.`):'';
 return {text:`${phrase} ${bound}`,evidence:{source:'v301-body-period-distinction',houses:spec.houses,houseLord:p?.lord,lordHouse:l?.house,category:side,contactCount:(adverse||[]).length,mitigationCount:(supports||[]).length,notClinical:true}};
}
function periodInsight(d,period,lang='ta'){const md=normalize(period?.md),ad=normalize(period?.ad),ta=lang!=='en';if(!planet(d,md)||!planet(d,ad))return null;
 const a=points(d,md,ad),focused=a.ranked.slice(0,5),main=focused.slice(0,3);
 const detail=main.map(x=>ta?`${x.house}-ஆம் பாவம் (${HOUSES_TA[x.house-1]})`:`house ${x.house} (${HOUSES_EN[x.house-1]})`);
 const starMd=starOf(d,md),starAd=starOf(d,ad),periodName=ta?`${PN[md]} தசை–${PN[ad]} புக்தி`:`${md} major period – ${ad} sub-period`;
 const explanation=ta?`${periodName} காலத்தில் ${evidenceClause(d,md,true)}; புக்திநாதரான ${evidenceClause(d,ad,true)}. ${PN[md]} பிறப்பு நட்சத்திர அதிபதி ${starMd?PN[starMd.lord]:'கணக்கிடப்படவில்லை'}; ${PN[ad]} பிறப்பு நட்சத்திர அதிபதி ${starAd?PN[starAd.lord]:'கணக்கிடப்படவில்லை'}. எனவே ${detail.join(', ')} ஆகியவை முதன்மையாக இயங்குகின்றன.`:
 `${periodName}: ${evidenceClause(d,md,false)}; ${evidenceClause(d,ad,false)}. Their natal star rulers are ${starMd?.lord||'not resolved'} and ${starAd?.lord||'not resolved'}. The leading activated themes are ${detail.join(', ')}.`;
 const lead=main[0]?.house,practical=lead?(ta?LIFE_TA[lead]:LIFE_EN[lead]):null;
 const next=practical?(ta?`நல்ல பக்கத்தில் ${practical[0]} அதே அமைப்பின் சிரமமான பக்கத்தில் ${practical[1]} குடும்பம், தொழில், உடலுழைப்பு ஆகியவற்றில் எந்தத் துறை உண்மையில் முன்னிலை பெறுகிறது என்பதை நடப்பு கோச்சாரத்துடன் இணைத்தே காலமாகத் தீர்மானிக்க வேண்டும்.`:`Constructive possibility: ${practical[0]} Counterweight: ${practical[1]} The actual timing depends on intersecting transits, not this period alone.`):'';
 const starExtras=[...new Set(a.chain.map(x=>x.to))].filter(x=>x!==md&&x!==ad).slice(0,3);
 const secondary=a.ranked.slice(3,7).map(x=>ta?`${x.house}-ஆம் (${HOUSES_TA[x.house-1]})`:`house ${x.house} (${HOUSES_EN[x.house-1]})`);
 const network=starExtras.length?(ta?`மேலும் நட்சத்திர அதிபதிகள் வழியாக ${starExtras.map(k=>evidenceClause(d,k,true)).join('; ')}. இதனால் ${secondary.join(', ')} ஆகிய துணைப் பாவப் பலன்களும் இணையலாம். ஆனால் இவை நேரடித் தசை–புக்தி முதன்மைப் பாவங்களை விட குறைந்த முன்னுரிமை கொண்டவை; அனைத்தும் ஒரே நாளில் நிகழும் என்று எடுத்துக்கொள்ளக் கூடாது.`:
 `The nakshatra-ruler chain also connects ${starExtras.map(k=>evidenceClause(d,k,false)).join('; ')}. Secondary themes include ${secondary.join(', ')}; these should not outrank the direct period houses or be treated as simultaneous events.`):'';
 const sun=planet(d,'Sun'),moon=planet(d,'Moon');let moonNote='';
 if((md==='Moon'||ad==='Moon')&&Number.isFinite(sun?.longitude)&&Number.isFinite(moon?.longitude)){
  const angle=((moon.longitude-sun.longitude)%360+360)%360,strong=angle>=48&&angle<228;
  const bornWithJupiter=planet(d,'Jupiter')?.house===moon.house;
  moonNote=ta?(strong?`பிறப்புச் சந்திரன் பௌர்ணமி நோக்கிய அல்லது பௌர்ணமிக்குப் பின்பட்ட முதற்பகுதி பலத்தில் இருப்பதால், சந்திரன் சார்ந்த மனநிறைவு மற்றும் குடும்ப ஆதரவு அம்சங்களைத் தக்க சுபக் கிரகத் தொடர்புகளுடன் சேர்த்து வாசிக்க வேண்டும்.`:
   `பிறப்புச் சந்திரன் வளர்பிறை பஞ்சமிக்கு முந்தைய அல்லது தேய்பிறை பஞ்சமிக்குப் பிந்தைய குறைந்த ஒளிப் பலத்தில் இருக்கிறார். எனவே சந்திர தசையை முழுச் சுபபலமாக மட்டும் கருத முடியாது; சிந்தனை, குடும்பம், வேலை மற்றும் ஓய்வு இடையிலான ஏற்றத்தாழ்வையும் பார்க்க வேண்டும்.${bornWithJupiter?' அதே வீட்டிலுள்ள குரு ஒரு தணிக்கும் தொடர்பாக அமைவதால் அனைத்தையும் கடினமான பலனாகக் கூறுவதும் சரியல்ல.':''}`):
  (strong?'The natal Moon has relatively brighter phase strength; weigh that with benefic and functional house links.':`The natal Moon is outside the bright fifth-tithi-to-fifth-tithi interval. Read emotional and work-rest fluctuations alongside other dignity, aspect and lordship factors.${bornWithJupiter?' Natal Jupiter shares the Moon’s house and may moderate the traditional reading.':''}`);
 }
 return {ranked:a.ranked,chain:a.chain,paragraphs:[explanation,network,moonNote,next].filter(Boolean),houses:main.map(x=>x.house),mdStar:starMd?.lord||null,adStar:starAd?.lord||null};
}
function transitInsight(d,period,snapshot,lang='ta'){const ta=lang!=='en',md=normalize(period?.md),ad=normalize(period?.ad);
 if(!planet(d,md)||!planet(d,ad)||!snapshot?.pos)return null;
 const active=points(d,md,ad),selected=active.ranked.slice(0,3),baseDate=snapshot.date||period?.from||'';
 const lLord=d.houses?.[0]?.lord,mLord=d.houses?.[planet(d,'Moon')?.house-1]?.lord;const priorities=[lLord,mLord,md,ad,'Jupiter','Saturn','Rahu','Ketu'].filter(Boolean);
 const distinct=[...new Set(priorities)];const checked=distinct.map(k=>{const t=snapshot.pos[k];if(!t||!Number.isInteger(t.sign))return null;return {key:k,sign:t.sign,house:((t.sign-d.lagna+12)%12)+1};}).filter(Boolean);
 const slow=checked.filter(x=>['Jupiter','Saturn','Rahu','Ketu'].includes(x.key));
 const high=checked.map(x=>({...x,match:selected.find(a=>a.house===x.house)})).filter(x=>x.match).sort((a,b)=>(b.match.weight-a.match.weight)||priorities.indexOf(a.key)-priorities.indexOf(b.key));
 const labels=checked.filter(x=>[lLord,mLord,md,ad].includes(x.key)).slice(0,4).map(x=>ta?`${PN[x.key]} ${RASI_TA[x.sign]} (${x.house}-ஆம் பாவம்)`:`${x.key} in ${RASI_EN[x.sign]} (house ${x.house})`);
 const slowLabels=slow.map(x=>ta?`${PN[x.key]} ${x.house}-ஆம் பாவத்தில்`:`${x.key} in house ${x.house}`);
 const main=high.slice(0,2),lead=main[0],out=[];
 out.push(ta?`${baseDate} அன்று கணிக்கப்பட்ட கோச்சார நிலையில், லக்னாதிபதி ${PN[lLord]||lLord}, ராசி அதிபதி ${PN[mLord]||mLord}, தசாநாதன் ${PN[md]}, புக்திநாதன் ${PN[ad]} ஆகியோரின் கிடைக்கப்பெற்ற நிலைகள்: ${labels.join('; ')||'முழுமையான கிரகத் தரவு இல்லை'}. ${slowLabels.join('; ')} என்ற மெதுவான பெயர்ச்சிகளையும் தனியாகக் கவனிக்க வேண்டும்.`:
 `At the ${baseDate} calculated snapshot, available ascendant ruler, Moon-sign ruler, period lord and sub-period lord transits are: ${labels.join('; ')||'not all fast-planet positions available'}. Separately, the slow transits are ${slowLabels.join('; ')}.`);
 if(lead){const house=lead.house,base=(ta?LIFE_TA:LIFE_EN)[house], who=ta?PN[lead.key]:lead.key, opp=(high[1]&&high[1].key!==lead.key)?(ta?PN[high[1].key]:high[1].key):'';
 out.push(ta?`இந்தத் தேதியில் ${who} பெயர்ச்சி, செயல்படும் ${house}-ஆம் பாவத்துடன் நேரடியாகக் கூடுகிறது${opp?`; ${opp} பெயர்ச்சியும் தொடர்பு பெறுகிறது`:''}. அதனால் ${base[0]} சிரமத்தின் பக்கத்தில் ${base[1]} இந்த இடைவெளியில் ${HOUSES_TA[house-1]} முதன்மைப் பொருளாகும்; கோச்சார ராசி மாறினால் மறுமதிப்பீடு செய்ய வேண்டும்.`:
 `The transit of ${who}${opp?' and '+opp:''} directly meets activated house ${house}. ${base[0]} In the counter-case, ${base[1]} Reassess after the next sign change.`);
 }else out.push(ta?'இந்தத் தேதியின் கோச்சாரத்தில் தசை–புக்தி முதன்மைப் பாவத்துடன் நேரடி ராசி இட ஒற்றுமை இல்லை. ஆகவே கோச்சாரம் மட்டும் வைத்து தனித்த நிகழ்ச்சியோ நோயோ கூறப்படவில்லை.':'This snapshot has no direct same-house convergence with the leading period houses; no isolated event is inferred.');
 const extra=planet(d,'Moon');if(extra&&(['Moon','Ketu'].includes(md)||['Moon','Ketu'].includes(ad))){
  const body=selected.filter(x=>[4,5,6,8,12].includes(x.house));if(body.length&&main.some(x=>body.some(b=>b.house===x.house)))out.push(ta?`உடல் சார்ந்த மரபு வாசிப்பில் ${body.map(b=>b.house+'-ஆம்').join(', ')} பாவங்கள் செயல்பட்டாலும், இதனால் பிறவிக் குறைபாடோ குறிப்பிட்ட நோயோ நிரூபிக்கப்படுவதில்லை. வேலை–உணவு–ஓய்வு ஒழுங்கில் தோன்றும் தற்காலிக அசௌகரியங்களையும் நல்ல மாற்றங்களையும் அந்தந்த நடப்பு சூழலில் மட்டும் வாசிக்க வேண்டும்.`:`Houses ${body.map(x=>x.house).join(', ')} can raise traditional bodily themes, but neither congenital conditions nor particular diseases follow. Read temporary routine concerns and improvements only in their real-life context.`);
 }
 return {paragraphs:out,checked,primaryHouses:selected.map(x=>x.house),matchingTransits:high.map(x=>x.key)};
}
function snapshotFromTransit(transit,date){
 const out={};
 for(const p of transit?.planets||[]){
  const k=normalize(String(p.name??p.planet??''));if(!PN[k])continue;
  let sign=-1;const lon=Number(p.longitude);
  if(p.longitude!==null&&p.longitude!==undefined&&p.longitude!==''&&Number.isFinite(lon))sign=Math.floor((((lon%360)+360)%360)/30);
  else{const raw=String(p.rasi||p.sign||'').trim().replace(/ம்$/,'');sign=RASI_EN.findIndex(x=>x.toLowerCase()===raw.toLowerCase());if(sign<0)sign=RASI_TA.findIndex(x=>x.replace(/ம்$/,'')===raw);}
  if(sign>=0&&sign<12)out[k]={sign,retrograde:!!p.retrograde};
 }
 return {date,pos:out};
}
return Object.freeze({starOf,points,snapshotFromTransit,enhanceLife,enhancePhysical,enhanceMedical,periodInsight,transitInsight,version:'301-natal-period-transit-evidence'});
});
