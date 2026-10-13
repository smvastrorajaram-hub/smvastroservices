/* V311 / 1 of 4. Classical-structure evidence and resolved life-domain judgement.
 * Heuristic relative weights ARE NOT a quotation of BPHS, probabilities or validated forecasts.
 * No API, observer or calculation of birth longitude.
 */
(function(g,f){const v=f(g);g.SMVD311Judgement=v;if(typeof module==='object'&&module.exports)module.exports=v;})(typeof window==='object'?window:globalThis,function(g){'use strict';
const PLAN=['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu'];
const NTA={Sun:'சூரியன்',Moon:'சந்திரன்',Mars:'செவ்வாய்',Mercury:'புதன்',Jupiter:'குரு',Venus:'சுக்கிரன்',Saturn:'சனி',Rahu:'ராகு',Ketu:'கேது'};
const T=[
 ['சுயநிலை','தன்னம்பிக்கையுடன் தனித்த முடிவெடுப்பது','தன் விருப்பத்தை முழுமையாகப் பிறரிடம் ஒப்படைக்காமல் செயல்படுவது','முடிவு எடுத்தபின் பொறுப்பை ஏற்றுக்கொள்வது'],
 ['குடும்பமும் பணமும்','குடும்பத்திற்கான வரவு–செலவை நிலைப்படுத்துவது','கிடைக்கும் வருமானத்திற்கும் கையில் தங்கும் பணத்திற்கும் வேறுபாடு ஏற்படுவது','பேச்சால் நம்பிக்கையை உருவாக்குவது'],
 ['முயற்சியும் உறவினரும்','முயற்சியைத் திறனாக மாற்றுவது','ஒரே முயற்சியைப் பலமுறை சரிசெய்து நிறைவு செய்வது','உடன்பிறந்தோர் அல்லது அருகிலுள்ளவர்களுடன் தொடர்பைச் சீரமைப்பது'],
 ['வீடும் குடும்ப ஆதரவும்','வீட்டின் நிலைத்தன்மையை மேம்படுத்துவது','வசிப்பிடமும் பணிப் பொறுப்பும் ஒன்றை ஒன்று பாதிப்பது','தாய் மற்றும் குடும்பத்தாரின் தேவையை முன்னிலைப்படுத்துவது'],
 ['கல்வியும் படைப்பும்','படிப்பு அல்லது படைப்புப் பணியில் ஆழமாக ஈடுபடுவது','கற்றதைப் பயன்படுத்துவதற்கு அதிகப் பயிற்சி தேவைப்படுவது','குழந்தைகள் அல்லது மாணவர்களுக்கான பொறுப்பை ஏற்றுக்கொள்வது'],
 ['பணி ஒழுங்கும் போட்டியும்','கடினமான பணியை முறையாக முடித்து நம்பிக்கை பெறுவது','வேலைப்பளுவும் கருத்து மோதலும் காரணமாகப் பணியை மீண்டும் ஒழுங்கமைப்பது','கடன் மற்றும் தினசரி பழக்கங்களுக்கு எல்லை அமைப்பது'],
 ['கூட்டுறவும் ஒப்பந்தமும்','உறவிலும் தொழில் கூட்டிலும் சமமான பொறுப்பைப் பகிர்வது','இரு தரப்பின் எதிர்பார்ப்பில் வேறுபாடு வெளிப்படுவது','நேரடிப் பேச்சால் ஒத்துழைப்பை நிலைநிறுத்துவது'],
 ['மாற்றமும் பாதுகாப்பும்','நீண்டகால ஏற்பாட்டை மாற்றி அமைப்பது','எதிர்பாராத பொறுப்புகளுக்காகத் திட்டத்தைத் திருத்துவது','கூட்டுச் சொத்து அல்லது ஆவணங்களைத் தெளிவுபடுத்துவது'],
 ['வழிகாட்டலும் உயர்கல்வியும்','ஆசிரியர், பெரியோர் ஆலோசனையால் புதிய திசையைத் தேர்வது','கல்வி அல்லது தொலைப் பயணத்தைச் சூழலுக்கேற்ப மாற்றுவது','தனது அனுபவத்தை மற்றவர்களுடன் பகிர்வது'],
 ['தொழிலும் பொறுப்பும்','தொழிலில் புதிய பொறுப்பை ஏற்று அனுபவத்தை வளர்ப்பது','உழைப்புக்கான அங்கீகாரம் உடனே வராமல் திறனை நிரூபிப்பது','வேலை முறை அல்லது பணியிடத்தை மாற்றுவது'],
 ['ஆதாயமும் தொடர்புகளும்','திறன் மற்றும் தொடர்புகளின் உதவியால் வருமான வழியை வளர்ப்பது','எதிர்பார்க்கப்பட்ட ஆதாயம் தாமதமாகக் கிடைப்பது','நம்பகமான நட்பு வட்டத்தைத் தேர்வது'],
 ['செலவும் தனிநேரமும்','செலவையும் தனிநேரத்தையும் சமநிலைப்படுத்துவது','தூரப் பயணம் அல்லது குடும்பத் தேவையால் செலவு அதிகரிப்பது','சுமையைக் குறைத்து உறக்கம் மற்றும் ஓய்வை மீட்பது']
];
const E=[
 ['independence','taking ownership of important personal decisions','revising a decision under added responsibilities','acting with greater confidence'],
 ['family resources','building a workable family budget','income not always translating into savings','improving communication at home'],
 ['initiative','turning practice into a reliable skill','reworking an initiative more than once','maintaining contact with siblings and peers'],
 ['home and support','improving stability at home','home commitments affecting other duties','responding to family needs'],
 ['learning and creativity','deepening a learned skill','needing repeated practice before a breakthrough','supporting children or younger learners'],
 ['work routines','earning trust through demanding work','reorganizing a workload after disagreement','setting manageable routines'],
 ['partnership','sharing responsibilities with a partner or colleague','navigating different expectations','using clear discussions to sustain cooperation'],
 ['change and shared matters','restructuring a long-term arrangement','revising plans when responsibilities change','clarifying records and shared finances'],
 ['guidance','using advice and higher learning constructively','adapting plans for training or travel','sharing accumulated experience'],
 ['career','taking on a new kind of responsibility','recognition taking longer than effort','adjusting job methods or direction'],
 ['gains and networks','strengthening earning routes through skills and contacts','receipts arriving later than expected','choosing reliable associates'],
 ['expenses and rest','balancing spending with private time','additional expenses linked with care or travel','protecting recovery and rest']
];
const DEST_TA=['சுய முடிவு','குடும்பச் சேமிப்பு','பயிற்சி மற்றும் தகவல் தொடர்பு','வீடு மற்றும் தாய் சார்ந்த பொறுப்பு','கல்வி, படைப்பு மற்றும் குழந்தைகள்','வேலை, கடன் மற்றும் போட்டி','துணைவர் அல்லது கூட்டாளி','மாற்றம், பாதுகாப்பு மற்றும் ஆவணங்கள்','ஆசிரியர், பெரியோர் மற்றும் தொலைதூர முயற்சி','தொழில், பதவி மற்றும் பொதுப் பொறுப்பு','நட்பு வட்டம் மற்றும் ஆதாயம்','செலவு, தனிநேரம் மற்றும் வெளியூர்'];
const DEST_EN=['personal decisions','family resources','skills and communication','home and family duties','education and creativity','work routines and competition','partnership','restructuring and shared records','guidance and advanced learning','career duties','networks and earnings','expenses and time away'];
const KAR=[[ 'Sun'],['Jupiter','Mercury'],['Mars'],['Moon','Venus'],['Jupiter','Mercury'],['Saturn','Mars'],['Venus','Jupiter'],['Saturn'],['Jupiter','Sun'],['Saturn','Sun','Mercury'],['Jupiter'],['Saturn','Ketu']];
const OWN={Sun:[4],Moon:[3],Mars:[0,7],Mercury:[2,5],Jupiter:[8,11],Venus:[1,6],Saturn:[9,10]};
const EX={Sun:0,Moon:1,Mars:9,Mercury:5,Jupiter:3,Venus:11,Saturn:6};
const SIGNS=['மேஷம்','ரிஷபம்','மிதுனம்','கடகம்','சிம்மம்','கன்னி','துலாம்','விருச்சிகம்','தனுசு','மகரம்','கும்பம்','மீனம்'];
const ALIAS=Object.fromEntries(Object.entries(NTA).map(([a,b])=>[b,a]));
function norm(x){return PLAN.includes(x)?x:ALIAS[x]||null;}
/* Use only source-supplied varga placements. Never compute a division from the
 * D1 sign or silently interpret an unavailable varga as neutral evidence. */
function varga(full,d,k){const v=full?.advanced?.vargas||full?.vargas;
 const div='D-'+d;const row=Array.isArray(v)?v.find(x=>x.division===div):null;
 const star=row?.planets?.find(x=>norm(x.planet)===k);if(!star)return null;
 const s=SIGNS.indexOf(star.rasi);if(s<0)return null;
 const good=(OWN[k]||[]).includes(s)||EX[k]===s,weak=EX[k]!==undefined&&(EX[k]+6)%12===s;
 return {division:div,planet:k,sign:s,dignity:good?'strong':weak?'weak':'neutral',reason:(OWN[k]||[]).includes(s)?'own':EX[k]===s?'exalted':weak?'debilitated':'other',source:'advanced.vargas'};}
/* Relationship tests are performed with the already normalised D1 chart.
 * These are conditional interpretive supports, NOT certified Sanskrit sutras. */
function isRelated(d,a,b){if(!a||!b||a===b)return false;
 const x=d.planets[a],y=d.planets[b];if(!x||!y)return false;
 return x.house===y.house||d.houses[y.house-1].aspects.includes(a)||d.houses[x.house-1].aspects.includes(b);}
function classicalLinks(d,n){const h=d.houses[n-1],lord=h.lord,lp=d.planets[lord],results=[],src=(key,kind,planets,detail)=>results.push({key,kind,planets,detail,source:'observed D1 relationship'});
 // A kendra/trikona association is tested with distinct rulers only.
 const kendras=new Set([1,4,7,10]),trikonas=new Set([1,5,9]);
 for(const k of new Set(d.houses.filter(h=>kendras.has(h.no)).map(h=>h.lord))){
  for(const t of new Set(d.houses.filter(h=>trikonas.has(h.no)).map(h=>h.lord))){
   if(k===t||!isRelated(d,k,t))continue;
   if((k===lord||t===lord)&&!results.some(x=>x.key==='KENDRA_TRIKONA_LINK'))src('KENDRA_TRIKONA_LINK','support',[k,t],'angular and trinal rulers are related');
  }
 }
 const money=d.houses[1].lord,gain=d.houses[10].lord;
 if([2,10,11].includes(n)&&isRelated(d,money,gain))src('DHANA_2_11_LINK','support',[money,gain],'second and eleventh rulers linked');
 const lordIn=lp.house,mutual=d.houses[lordIn-1]?.lord;
 if(mutual&&mutual!==lord&&d.planets[mutual]?.house===n)src('PARIVARTANA','mixed',[lord,mutual],'actual two-way exchange of sign-house rulers');
 // Dusthana occupation alone does not establish full Vipareeta Raja Yoga;
 // present this as a condition requiring separate assessment.
 if([6,8,12].includes(n)&&[6,8,12].includes(lordIn))src('DUSTHANA_LORD_LINK','mixed',[lord],'dusthana owner in a dusthana, not a certified vipareeta yoga');
 if(h.aspects.includes('Jupiter')&&h.aspects.some(x=>['Mars','Saturn'].includes(x)))src('GURU_COUNTER_ASPECT','mitigation',['Jupiter'],'Jupiter aspect coexists with restrictive aspect');
 return results;}

function signDignity(d,k){const s=d.planets[k]?.sign;if(!Number.isInteger(s)||!(k in EX))return null;return (OWN[k]||[]).includes(s)?'own':EX[k]===s?'exalted':(EX[k]+6)%12===s?'debilitated':null;}
function assess(d,k){try{const r=g.SMVD1StrengthV303?.assess?.(d,k);if(Number.isFinite(r?.score))return {value:Math.max(0,Math.min(1,r.score)),dignity:signDignity(d,k)||r.dignity||d.planets[k]?.dignity,combust:!!r.combust?.combust};}catch(_){}return {value:.5,dignity:signDignity(d,k)||d.planets[k]?.dignity||'unknown',combust:!!d.planets[k]?.combust};}
function candidate(d,k,relation,house){const p=d.planets[k],s=assess(d,k),owned=d.houses.filter(h=>h.lord===k).map(h=>h.no);let delta=(s.value-.5)*3;
 if(['own','exalted'].includes(s.dignity))delta+=.75; if(s.dignity==='debilitated')delta-=.9;
 if(s.combust)delta-=.35; if(owned.includes(1)||owned.includes(5)||owned.includes(9))delta+=.25;
 if(owned.includes(6)||owned.includes(8)||owned.includes(12))delta-=.23;
 if(['Mars','Saturn','Rahu','Ketu'].includes(k)&&!owned.includes(1)&&!owned.includes(5)&&!owned.includes(9))delta-=.2;
 const strength=relation==='lord'?1.65:relation==='occupies'?1.05:relation==='aspects'?.68:.35;
 return {planet:k,relation,planetHouse:p.house,owned,delta:delta*strength,dignity:s.dignity,sign:p.sign,retrograde:!!p.retrograde,combust:s.combust,weight:strength,natal:true};}
function read(d,full,n,age){const h=d.houses[n-1],k=h?.lord;if(!h||!d.planets[k])return null;const loc=d.planets[k].house;
 if(!Number.isInteger(loc)||loc<1||loc>12)return null;
 const a=[candidate(d,k,'lord',n)];for(const p of new Set(h.occupants||[]))if(d.planets[p])a.push(candidate(d,p,'occupies',n));for(const p of new Set(h.aspects||[]))if(d.planets[p])a.push(candidate(d,p,'aspects',n));for(const p of KAR[n-1])if(d.planets[p])a.push(candidate(d,p,'karaka',n));
 const plus=a.filter(x=>x.delta>=.16).sort((x,y)=>y.delta-x.delta);const minus=a.filter(x=>x.delta<=-.16).sort((x,y)=>x.delta-y.delta);
 const sum=a.reduce((s,x)=>s+x.delta,0),support=sum>.8?'support':sum<-.8?'strain':'qualified';
 /* Classical chart-topic correspondence (PVR, Vedic Astrology, PDF pp.72-74).
  * No chart is calculated here: only supplier-computed divisions are accepted.
  * D7+ D24 address distinct children/education readings, not the same event. */
 const relevant=({1:[9],2:[2],3:[3],4:[4,12],5:[7,24],6:[30],7:[9],8:[30],9:[24],10:[10],11:[2],12:[16]})[n]||[];
 const karakas=KAR[n-1].filter(x=>x!==k).slice(0,1);
 const divisionEvidence=relevant.flatMap(div=>[k,...karakas].map(x=>varga(full,div,x)).filter(Boolean));
 const division=divisionEvidence.find(x=>x.planet===k)||null;
 const classical=classicalLinks(d,n);
 const related=d.houses.filter(x=>x.lord===k&&x.no!==n).map(x=>x.no);
 // Weighted rule evidence selects a conclusion BEFORE narrative. Opposing evidence cannot disappear.
 const dominant=support==='support'?plus[0]:support==='strain'?minus[0]:Math.abs(plus[0]?.delta||0)>=Math.abs(minus[0]?.delta||0)?plus[0]:minus[0];
 const main=age!==null&&age<18&&[2,5,7,10,11].includes(n)?({2:'குடும்பப் பேச்சு மற்றும் கற்றலுக்கான பொருட்கள்',5:'பள்ளிப் படிப்பும் விளையாட்டும்',7:'நண்பர்களுடன் இணைந்து பழகும் விதம்',10:'பள்ளிப் பொறுப்பும் பயிற்சியும்',11:'நண்பர் வட்டமும் குழு நடவடிக்கையும்'})[n]:T[n-1][support==='strain'?2:1];
 return Object.freeze({house:n,lord:k,location:loc,houseOccupants:[...new Set(h.occupants||[])],houseAspects:[...new Set(h.aspects||[])],otherLordships:related,main,eventKind:support==='strain'?'obstacle':support==='support'?'opportunity':'negotiation',conclusion:support,relativeScore:Math.round(sum*100)/100,dominant,positive:plus,negative:minus,all:a,division,divisionEvidence,classical,ageUnder18:age!==null&&age<18,topicTA:T[n-1],topicEN:E[n-1],destinationTA:DEST_TA[loc-1],destinationEN:DEST_EN[loc-1],source:'natal D1 + V303 strength + matching supplied D2/D3/D4/D7/D9/D10/D12/D16/D24/D30 varga where relevant',ruleMethod:'relative priority heuristic; no factual event certainty'});
}
/* Verified chart evidence is resolved into a life-scene BEFORE writing prose. */
const SCENE_TA=[
 ['ஒரு முக்கியமான முடிவில் தனியாக முன்னின்று செயல்படுதல்','மற்றவர்களின் எதிர்பார்ப்புகளைச் சுமந்தபடி தன் விருப்பத்தை நிலைநிறுத்துதல்'],
 ['குடும்பப் பணத்தைச் சேமிப்பாக மாற்ற முயற்சித்தல்','குடும்பச் செலவுகளும் பணவாக்குறுதிகளும் சேமிப்பைக் குறைத்தல்'],
 ['தொடர்ச்சியான பயிற்சியால் தனித்திறன் உருவாகுதல்','ஒரே முயற்சியைப் பலமுறை மாற்றிச் செய்ய வேண்டியிருத்தல்'],
 ['வீடு, நிலம் அல்லது வசிப்பிடத்தை நிலைப்படுத்தும் முயற்சி','வீட்டுச் செலவோ குடும்பப் பராமரிப்போ சொத்து முயற்சியைத் தாமதப்படுத்துதல்'],
 ['படிப்பில் ஆழம் அல்லது படைப்பாற்றலால் முன்னேற்றம்','திறமை இருந்தும் கவனம் சிதறுவதால் பயிற்சி நீளுதல்'],
 ['சிக்கலான பணியில் அனுபவம் பெற்று நம்பிக்கை பெறுதல்','வேலைப் போட்டி, கடன் அல்லது பணிச்சுமையால் ஓய்வு குறைதல்'],
 ['துணைவர் அல்லது கூட்டாளியுடன் ஒப்பந்தம் நிலைபெறுதல்','பொறுப்புகளைப் பகிர்வதில் கருத்துவேறுபாடு வருதல்'],
 ['பழைய ஏற்பாட்டை மாற்றி நிதிப் பாதுகாப்பை வளர்த்தல்','கூட்டுப்பணம் அல்லது ஆவணத்தில் திடீர் மாற்றத் தேவை எழுதல்'],
 ['மேற்படிப்பு, வழிகாட்டல் அல்லது தொலைதூர முயற்சிக்கு வாய்ப்பு','பெரியோர் கருத்துக்கும் சொந்தத் திட்டத்துக்கும் இடைவெளி உருவாதல்'],
 ['தொழிலில் கூடுதல் பொறுப்பும் தனிப்பட்ட பெயரும் உருவாதல்','செய்த உழைப்பிற்கு அங்கீகாரம் தாமதித்தல்'],
 ['பயனுள்ள தொடர்புகளால் வரவு வழிகள் விரிவடைதல்','எதிர்பார்த்த வருமானம் தாமதமாக வருதல்'],
 ['செலவைக் கட்டுப்படுத்தி ஓய்வுக்கான இடம் உருவாக்குதல்','தொலைதூரப் பணி அல்லது குடும்பத் தேவையால் செலவுகள் உயர்தல்']
];
const SCENE_EN=[
 ['taking ownership of a major decision','individual decisions becoming harder under obligations'],
 ['turning earnings into family savings','household commitments reducing savings'],
 ['developing a practical skill through repeated effort','reworking an initiative several times'],
 ['stabilizing housing or family support','property plans slowing under care or costs'],
 ['deepening learning or creative work','training taking longer when concentration is divided'],
 ['earning trust by resolving difficult work','workload and debt leaving less time for rest'],
 ['forming a workable partnership','conflict around shared duties'],
 ['securing an existing shared arrangement','unexpected changes in shared records or liabilities'],
 ['progressing through study or mentoring','a disagreement between advice and plans'],
 ['assuming visible professional responsibility','recognition trailing effort'],
 ['expanding income through reliable contacts','anticipated receipts arriving late'],
 ['bringing expenses and rest under control','care or travel disrupting savings']
];
function resolve(c){const age=c.ageUnder18, up=c.conclusion==='support',down=c.conclusion==='strain';
 const linked=[c.location,...c.otherLordships].filter(n=>n!==c.house);
 const essential=age?(({7:3,10:5,11:3,2:4})[c.house]||c.house):c.house;
 const event=(up?0:1), protect=c.positive[0]||null,risk=c.negative[0]||null;
 const status=(up?'supported':down?'restricted':'mixed');
 const sourceKeys=[`H${c.house}:L${c.lord}:IN${c.location}`,...c.all.map(v=>`${v.relation}:${v.planet}:${Number(v.delta).toFixed(2)}`)];
 return Object.freeze({sceneTA:SCENE_TA[essential-1][event],sceneEN:SCENE_EN[essential-1][event],status,primary:c.dominant,protection:protect,risk,linkedHouses:linked,ageBand:age?'minor':'adult',evidenceKeys:sourceKeys,validity:c.all.length>0?'natal-derived':'unsupported'});
}
function synthesize(claims,timing,age){const major=age!==null&&age<18?[5,1,4,3,9]:[10,1,2,4,7,11,5,9];const weighted=claims.filter(c=>major.includes(c.house)).map(c=>({claim:c,impact:Math.abs(c.relativeScore)+0.4,activation:(timing?.perHouse?.[c.house]||[]).length}));
 const selected=[...weighted].sort((a,b)=>b.impact+.25*b.activation-a.impact-.25*a.activation).slice(0,3).map(x=>x.claim);
 const main=selected[0],counter=selected.find(c=>c.conclusion!==main.conclusion)||selected[1]||main;
 const simultaneous=claims.filter(c=>c.house!==main.house&&c.lord===main.lord).map(c=>c.house);
 const current=timing?.chronology?.[0]||null;
 return {mainHouse:main.house,main,counterHouse:counter.house,counter,sameRulerHouses:simultaneous,asofMajor:current?.period?.md||null,asofSub:current?.period?.ad||null,asofPeriodFocus:current?.mainHouse||null,ageBand:age!==null&&age<18?'child':age!==null&&age>=65?'senior':'adult',source:'ranked D1 evidence with timing; no demographic assumption',notAProvenEvent:true};}
/* Chart-specific event decision: this structured object, not the prose layer,
 * selects what can be said. The combinations are traditional interpretive
 * heuristics and NOT predictive probabilities or a guarantee of life events.
 * Without natal evidence there is no invented positive/negative outcome.
 */
const LIFE_TA=[
 ['முக்கிய முடிவில் முன்னின்று பொறுப்பேற்பது','பிறர் எதிர்பார்ப்புகளால் தனிப்பட்ட முடிவு தாமதமாவது','தனிப்பட்ட முடிவையும் குடும்பக் கடமையையும் இணைப்பது'],
 ['குடும்ப வருமானத்தைச் சேமிப்பாக மாற்றுவது','குடும்பக் கடமைகள் சேமிப்பைச் சுருக்குவது','வரவு மற்றும் குடும்பத்திற்கான செலவுகளைச் சமன்படுத்துவது'],
 ['பயிற்சியை வருமானம் அல்லது பயனுள்ள திறனாக வளர்ப்பது','முயற்சியை இடையில் மாற்றி மீண்டும் கற்றுக்கொள்ள வேண்டியிருப்பது','திறமை வளர்ச்சியுடன் உறவினரின் தேவைகளைச் சமாளிப்பது'],
 ['வசிப்பிடத்திற்கான நீண்டகாலத் திட்டத்தை நிறைவேற்றுவது','வீட்டுப் பராமரிப்போ பெற்றோரின் தேவையோ சொத்து முடிவைத் தள்ளிப்போடுவது','வீட்டு வசதியையும் செலவுக் கட்டுப்பாட்டையும் இணைப்பது'],
 ['கல்வியில் ஆழ்ந்து ஒரு திறனை உருவாக்குவது','கல்வி அல்லது படைப்புத்திட்டத்தில் இடையூறு நீடிப்பது','ஆர்வத்திற்கும் தொடர்ச்சியான பயிற்சிக்கும் சமநிலை அமைப்பது'],
 ['சிக்கலான பணியில் நம்பகத்தன்மை பெறுவது','பணிச் சுமை அல்லது போட்டியால் வேலையை மறுசீரமைப்பது','பொறுப்பையும் உடல்நல ஓய்வையும் சமன்படுத்துவது'],
 ['இருவர் இணைந்த முடிவை நிலையான உடன்பாடாக மாற்றுவது','துணைவர் அல்லது கூட்டாளியுடனான எதிர்பார்ப்பு வேறுபாடு வெளிப்படுவது','பணமும் பொறுப்பும் பற்றிய தெளிவான உடன்பாடு அமைப்பது'],
 ['பகிர்ந்த நிதி அல்லது பழைய ஏற்பாட்டைப் பாதுகாப்பாக மாற்றுவது','கூட்டுச் சொத்து அல்லது ஆவணங்களில் திடீர் திருத்தம் தேவைப்படுவது','மாற்றத்திற்கான செலவையும் பாதுகாப்பையும் மதிப்பிடுவது'],
 ['மேற்படிப்பு அல்லது வழிகாட்டலால் வாழ்க்கைப் பாதையை விரிவாக்குவது','தொலைதூரக் கல்வி அல்லது பயணத் திட்டம் தாமதிப்பது','பெரியோரின் ஆலோசனையையும் சொந்த முயற்சியையும் இணைப்பது'],
 ['தொழிலில் பொறுப்பு உயர்ந்து தனிப்பட்ட நம்பிக்கை கிடைப்பது','உழைப்புக்கான அங்கீகாரம் தாமதமோ பணிமாற்றத் தேவையோ ஏற்படுவது','வேலைப் பொறுப்புக்கும் அதற்கான அங்கீகாரத்திற்கும் இடைவெளி இருப்பது'],
 ['பயனுள்ள தொடர்பு வழியாக வருமான வாய்ப்பு விரிவடைவது','எதிர்பார்த்த வரவு தாமதமடைந்து திட்டம் மாறுவது','கிடைக்கும் வரவையும் உண்மையான சேமிப்பையும் பிரித்துக் கையாள்வது'],
 ['ஓய்வையும் செலவையும் ஒழுங்குபடுத்தி மன அமைதி பெறுவது','வெளியூர், தனிமை அல்லது குடும்பத் தேவையால் செலவு உயர்வது','தூரப் பொறுப்புகளையும் தூக்க/ஓய்வு நேரத்தையும் ஒழுங்கமைப்பது']
];
const LIFE_EN=[
 ['taking ownership of an important personal decision','personal decisions slowing under others’ expectations','balancing independent decisions with family duties'],
 ['building a cushion from family earnings','family commitments shrinking possible savings','balancing cash inflow against household obligations'],
 ['building a practical skill through repetition','revisiting a plan after setbacks','balancing skills with sibling or peer obligations'],
 ['improving the security of housing arrangements','care costs delaying a housing choice','balancing a home plan against running costs'],
 ['developing depth in learning or creativity','interruption to steady practice','balancing exploration against sustained learning'],
 ['earning trust by handling complex duties','having to reorganise workload or competition','balancing work obligations with recovery'],
 ['building a workable shared agreement','differences in partners’ expectations','agreeing how responsibility and money will be shared'],
 ['restructuring shared assets more securely','reviewing shared records after unexpected change','weighing costs against protection'],
 ['expanding options through education or mentorship','a delay involving training or travel','combining guidance with independent judgement'],
 ['growing responsibility and credibility at work','recognition lagging behind effort or changing work practices','balancing workload with recognition'],
 ['growing income through dependable connections','a planned receipt arriving late','distinguishing cash received from expected gains'],
 ['making room for rest while managing expenses','travel or care commitments raising spending','balancing long-distance duties with recovery']
];
// Distinct completed judgements, not an adjective substituted into a common sentence.
// The selected column depends on the natal judgement; stronger chart-specific
// rules in decide() take priority over these domain outcomes.
const SENTENCE_TA=[
 ['முக்கிய முடிவுகளைத் தானாக எடுத்து அதற்குரிய பொறுப்பையும் சுமக்கும் வாய்ப்பு உள்ளது.','குடும்பத்தினரின் எதிர்பார்ப்புகள் காரணமாகச் சொந்த முடிவை மாற்றவோ தள்ளிப்போடவோ நேரலாம்.','சொந்த விருப்பத்தையும் குடும்பக் கடமைகளையும் சமமாகக் கவனிக்கும் நிலை உள்ளது.'],
 ['வருமானத்தில் ஒரு பகுதியைத் தொடர்ந்து சேமிப்புக்காக ஒதுக்கும் நிலை வளரக்கூடும்.','வீட்டு அல்லது குடும்பச் செலவுகள் அதிகரிப்பதால் வரவு இருந்தும் சேமிப்பு குறையலாம்.','குடும்பத்திற்குத் தேவையான செலவையும் எதிர்காலச் சேமிப்பையும் பிரித்துத் திட்டமிடும் சூழல் அமையலாம்.'],
 ['தொடர்ந்த பயிற்சி நடைமுறைத் திறனாக மாறி மற்றவர்களின் நம்பிக்கையைப் பெற உதவலாம்.','ஒரு முயற்சியைத் தொடங்கிய பிறகு தடைகளால் வழிமுறையை மாற்றி மீண்டும் முயல வேண்டியிருக்கலாம்.','சொந்தத் திறனை வளர்ப்பதற்கும் உடன்பிறந்தோர் தேவைகளைக் கவனிப்பதற்கும் நேரத்தைப் பகிர வேண்டியிருக்கலாம்.'],
 ['வசிப்பிடத்தைச் சீரமைப்பது அல்லது குடும்பத்திற்கான நீண்டகால ஏற்பாடு செய்வது முன்னேறலாம்.','வீட்டுப் பராமரிப்பு அல்லது பெற்றோரின் தேவைக்காகச் சொத்து சார்ந்த திட்டம் தள்ளிப்போகலாம்.','வீட்டு வசதியை மேம்படுத்தும் எண்ணத்துடன் அதற்கான செலவுக் கணக்கும் முக்கியமாகும்.'],
 ['கல்வி அல்லது படைப்புத் திறனில் தொடர்ந்து பயிற்சி செய்து தனிப்பட்ட முன்னேற்றம் பெறக்கூடும்.','படிப்பு அல்லது படைப்புப் பணியில் இடையூறு வந்து திட்டத்தை மாற்ற வேண்டியிருக்கலாம்.','ஆர்வமுள்ள துறையைத் தேர்ந்தெடுத்து அதில் தொடர்ச்சியான பயிற்சி செய்வது முக்கியமாகலாம்.'],
 ['சிக்கலான பணிகளுக்கு உதவி தேவைப்படும் இடங்களில் செயலாற்றி நம்பிக்கையைப் பெறக்கூடும்.','பணிச்சுமை அல்லது போட்டி காரணமாக வேலை செய்யும் முறையை மாற்ற வேண்டியிருக்கலாம்.','வேலைப் பொறுப்புகளுடன் ஓய்வையும் உடல்நல ஒழுங்கையும் சமமாகக் கவனிக்க வேண்டியிருக்கலாம்.'],
 ['இணைந்து செயல்படுபவருடன் பொறுப்புகளைத் தெளிவாகப் பகிர்ந்து உறவை நிலைப்படுத்தும் வாய்ப்பு உள்ளது.','துணைவர் அல்லது கூட்டாளியின் எதிர்பார்ப்புகள் வேறுபடுவதால் ஒப்பந்தத்தில் திருத்தம் தேவைப்படலாம்.','உறவில் அல்லது கூட்டுப் பணியில் பணம், நேரம், பொறுப்பு ஆகியவற்றை முன்கூட்டியே பகிர்ந்து கொள்ள வேண்டியிருக்கலாம்.'],
 ['கூட்டுச் சொத்து அல்லது பழைய ஆவணங்களைச் சீராக்கி நீண்டகாலப் பாதுகாப்பை மேம்படுத்தும் சூழல் வரலாம்.','பகிர்ந்த நிதி அல்லது பழைய ஏற்பாட்டில் எதிர்பாராத மாற்றம் ஏற்பட்டு ஆவணங்களைத் திருத்த வேண்டியிருக்கலாம்.','கூட்டுச் சொத்தைக் கையாளும்போது பாதுகாப்புக்கும் புதிய செலவுக்கும் இடையில் முடிவெடுக்க வேண்டியிருக்கலாம்.'],
 ['உயர்கல்வி அல்லது அனுபவமிக்கவரின் வழிகாட்டல் புதிய வாழ்க்கைப் பாதையைத் திறக்கக்கூடும்.','பயணம் அல்லது மேல்படிப்புக்கான திட்டம் எதிர்பார்த்த நேரத்தில் நிறைவேறாமல் மாற்றம் தேவைப்படலாம்.','பெரியோரின் அறிவுரையையும் சொந்த அனுபவத்தையும் இணைத்து ஒரு முக்கிய முடிவு எடுக்க நேரலாம்.'],
 ['தொழிலில் கூடுதல் பொறுப்பைப் பெற்று படிப்படியாக நம்பிக்கையும் அங்கீகாரமும் வளரக்கூடும்.','செய்த உழைப்புக்கான அங்கீகாரம் தாமதித்து வேலையின் முறையையோ பொறுப்பையோ மாற்ற வேண்டியிருக்கலாம்.','வேலைப் பொறுப்புகள் அதிகரிக்கும் வேகத்துக்கு ஏற்ப அங்கீகாரம் வராமல் இடைவெளி உருவாகலாம்.'],
 ['நம்பகமான தொழில் தொடர்புகள் மூலம் புதிய வருமான வழிகளை வளர்க்க வாய்ப்பு உள்ளது.','எதிர்பார்த்த வரவு தாமதமாக வருவதால் திட்டமிட்ட செலவுகளை மாற்ற வேண்டியிருக்கலாம்.','வரக்கூடும் என்று எதிர்பார்க்கும் தொகையையும் கையில் கிடைத்த பணத்தையும் வேறுபடுத்திக் கையாள வேண்டியிருக்கலாம்.'],
 ['செலவைக் கட்டுப்படுத்தி ஓய்வுக்கும் தனிப்பட்ட வாழ்வுக்கும் கூடுதல் நேரம் ஒதுக்க முடியும்.','வெளியூர் அல்லது குடும்பப் பொறுப்புகளால் எதிர்பாராத செலவுகள் ஏற்படலாம்.','தூரத்திலுள்ள கடமைகளையும் உறக்கம், ஓய்வு ஆகியவற்றையும் திட்டமிட வேண்டியிருக்கலாம்.']
];
const CHILD_SENTENCE_TA={2:'குடும்பத்தாருடன் தேவையான கல்விச் செலவுகளைப் பற்றிப் பேசும் பழக்கம் உருவாகலாம்.',5:'படிப்பு, விளையாட்டு, படைப்புப் பயிற்சி ஆகியவற்றில் ஆர்வத்தை ஒருங்கிணைக்க உதவி கிடைக்கலாம்.',7:'நண்பர்களுடனும் ஆசிரியர்களுடனும் ஒத்துழைத்துச் செயல்படும் திறன் வளரக்கூடும்.',10:'பள்ளியில் ஒப்படைக்கப்படும் பொறுப்புகளை முடித்து நம்பிக்கையை வளர்த்துக்கொள்ளும் சூழல் அமையலாம்.',11:'குழு நடவடிக்கைகளிலும் நண்பர் வட்டத்திலும் தன் பங்களிப்பைச் செய்ய வாய்ப்பு கிடைக்கலாம்.'};
const SPECIAL_SENTENCE_TA={
 '10:6':'தொழிலில் போட்டியை எதிர்கொள்வதும் பிறருடைய சிக்கல்களுக்குத் தீர்வு காண்பதும் பணிப் பொறுப்பின் ஒரு பகுதியாக அமையலாம்.',
 '10:2:11':'தொழிலில் ஏற்கும் பொறுப்பும் அதன் மூலம் உருவாகும் வருமானமும் குடும்பச் சேமிப்பு முடிவுகளுடன் நேரடியாக இணைந்து அமையலாம்.',
 '10:2:9':'தொழில் வருமானத்தைப் பெருக்கும் முடிவுகளில் கற்ற அனுபவமும் பெரியோர் வழிகாட்டலும் குடும்பக் கடமைகளும் ஒன்றாகப் பங்கு பெறலாம்.',
 '7:12':'துணைவர் அல்லது கூட்டாளியுடனான உறவில் தூரம், செலவு, தனிநேரம் ஆகியவற்றை முன்கூட்டியே ஒழுங்குபடுத்த வேண்டியிருக்கலாம்.',
 '4:4':'வீடு மற்றும் குடும்ப ஆதரவை நிலைநிறுத்துவதில் ஜாதகரின் சொந்த முடிவுகளுக்கு அதிகப் பங்கு இருக்கலாம்.',
 '5:8':'கல்வி அல்லது படைப்புத் திட்டம் எதிர்பாராத விதமாக மாறும்போது புதிய திறனைக் கற்றுக்கொண்டு தொடர வேண்டியிருக்கலாம்.',
 '2:3':'பேச்சு, எழுத்து அல்லது தனித்திறனைப் பயன்படுத்திக் குடும்ப வருமானத்துக்குப் பங்களிக்கும் வாய்ப்பு இருக்கலாம்.',
 '11:11':'நட்பு வட்டம் மற்றும் தொழில் தொடர்புகளைக் கொண்டு வருமான வழிகளை விரிவுபடுத்த வாய்ப்பு இருக்கலாம்.'
};
const CHILD_TA={2:'குடும்பத்தாருடன் கல்விச் செலவும் தேவைகளும் பற்றிப் பேசும் பழக்கம்',5:'கல்வி, படைப்புப் பயிற்சி மற்றும் விளையாட்டு வழியாகத் திறன் வளர்ச்சி',7:'நண்பர்கள், ஆசிரியர்களுடன் இணைந்து செயல்படும் பழக்கம்',10:'பள்ளியில் பொறுப்பை ஏற்று முடிக்கும் பயிற்சி',11:'குழு நடவடிக்கைகளிலும் நண்பர் வட்டத்திலும் ஒத்துழைப்பு'};
const CHILD_EN={2:'understanding educational needs in the family',5:'building skills through learning and play',7:'cooperating with peers and teachers',10:'finishing school and group responsibilities',11:'choosing a constructive peer network'};
const LINK_TA=['தனிப்பட்ட முடிவு அல்லது உடலுழைப்பு','குடும்பப் பணம் மற்றும் பேச்சு','பயிற்சி, எழுத்து அல்லது உடன்பிறந்தோர்','வீடு, தாய் மற்றும் பராமரிப்பு','கல்வி, குழந்தைகள் அல்லது படைப்பாற்றல்','சேவை, போட்டி மற்றும் கடன்','துணைவர், ஒப்பந்தம் அல்லது கூட்டாளி','பகிர்ந்த நிதி, காப்பீடு மற்றும் மாற்றம்','ஆசிரியர், உயர் கல்வி மற்றும் பயணம்','பணியிடம், பதவி மற்றும் பொறுப்பு','வரவு, நட்பு மற்றும் வாடிக்கையாளர் தொடர்பு','செலவு, வெளியூர் மற்றும் ஓய்வு'];
const LINK_EN=['individual initiative','family finances and speech','skills and sibling ties','housing and care duties','study, children and creativity','service, competition and borrowing','contracts and partnership','shared assets and restructuring','education, mentors and travel','work and professional standing','income and useful networks','spending, distance and rest'];
function decide(c){
 if(!c?.all?.length || !Number.isInteger(c.location) || !c.lord)return null;
 const x=resolve(c),stage=c.conclusion==='support'?0:c.conclusion==='strain'?1:2;
 const relevant=c.ageUnder18&&CHILD_TA[c.house];
 const specialTA = !c.ageUnder18 && (
 c.house===10&&c.location===6 ? 'தொழிலில் போட்டி, பணிச்சுமை, பிறர் சிக்கல்களைத் தீர்க்கும் பொறுப்பு ஆகியவற்றின் வழியாக அனுபவமும் அங்கீகாரமும் வளர்வது' :
 c.house===10&&c.location===2&&c.otherLordships.includes(11) ? 'தொழிலில் ஏற்கும் கூடுதல் பொறுப்பு நேரடியாகக் குடும்ப வருமானம், சேமிப்பு மற்றும் ஆதாயத்துடன் இணைவது' :
 c.house===10&&c.location===2&&c.otherLordships.includes(9) ? 'தொழிலால் கிடைக்கும் வருவாயில் பெரியோர் வழிகாட்டல், கற்ற அனுபவம் மற்றும் குடும்பப் பொறுப்பு ஒன்றாகத் தாக்கம் செலுத்துவது' :
 c.house===7&&c.location===12 ? 'துணைவர் அல்லது கூட்டாளியுடனான ஏற்பாட்டில் தூரம், செலவு, தனிநேரம் ஆகியவற்றை முதலில் ஒழுங்குபடுத்த வேண்டியிருப்பது' :
 c.house===4&&c.location===4 ? 'வீடு மற்றும் குடும்ப ஆதரவை நிலைநிறுத்தும் முயற்சியில் சொந்த முடிவுகளின் பங்கு அதிகரிப்பது' :
 c.house===5&&c.location===8 ? 'கல்வி அல்லது படைப்புத் திட்டத்தில் திடீர் மாற்றம் வந்தபோதும் புதிய திறனுக்கு மாற வேண்டியிருப்பது' :
 c.house===2&&c.location===3 ? 'பேச்சு, எழுதுதல் அல்லது தனித்திறன் மூலமாகக் குடும்ப வருமானத்துக்குப் பங்களிக்கும் வாய்ப்பு உருவாவது' :
 c.house===11&&c.location===11 ? 'நண்பர் வட்டம் மற்றும் தொழில்தொடர்புகளைப் பயன்படுத்தி வருமானப் பாதையை வளர்ப்பது' : null);
 const specialEN=!c.ageUnder18 && (
 c.house===10&&c.location===6?'career responsibilities developing through competition, service and resolving others’ problems':
 c.house===10&&c.location===2&&c.otherLordships.includes(11)?'professional responsibility becoming closely tied to household earnings and savings':
 c.house===10&&c.location===2&&c.otherLordships.includes(9)?'professional income intersecting with education, mentorship and household duties':
 c.house===7&&c.location===12?'distance, spending and private time requiring negotiation within partnership':
 c.house===4&&c.location===4?'taking direct responsibility for stability of home and family':
 c.house===5&&c.location===8?'redirecting study or creative work after an unexpected change':null);
 const leadTA=relevant||specialTA||LIFE_TA[c.house-1][stage],leadEN=(c.ageUnder18&&CHILD_EN[c.house])||specialEN||LIFE_EN[c.house-1][stage];
 const keyedSpecial=c.house===10&&c.location===2&&c.otherLordships.includes(11)?'10:2:11':c.house===10&&c.location===2&&c.otherLordships.includes(9)?'10:2:9':`${c.house}:${c.location}`;
 const completedTA=(c.ageUnder18&&CHILD_SENTENCE_TA[c.house])||SPECIAL_SENTENCE_TA[keyedSpecial]||SENTENCE_TA[c.house-1][stage];
 const positive=c.positive.filter(x=>['lord','occupies','aspects'].includes(x.relation)).slice(0,2);
 const negative=c.negative.filter(x=>['lord','occupies','aspects'].includes(x.relation)).slice(0,2);
 const primary=c.dominant,other=c.otherLordships||[];
 return Object.freeze({house:c.house,lord:c.lord,location:c.location,leadTA,leadEN,completedTA,linkTA:LINK_TA[c.location-1],linkEN:LINK_EN[c.location-1],stage:c.conclusion,ageUnder18:c.ageUnder18,positive,negative,primary,otherLordships:other,division:c.division,divisionEvidence:c.divisionEvidence||[],classical:c.classical||[],sourceKeys:x.evidenceKeys.concat((c.classical||[]).map(v=>v.key)),reference:'natal lord and location, relevant occupants/aspects, existing V303 planet strength',key:[c.house,c.lord,c.location,c.conclusion,...positive.map(x=>x.planet),...negative.map(x=>x.planet)].join(':'),hasContradiction:positive.length>0&&negative.length>0});
}
return Object.freeze({read,resolve,decide,synthesize,norm,varga,classicalLinks,PLAN,NTA,T,E,DEST_TA,DEST_EN,KAR});
});
