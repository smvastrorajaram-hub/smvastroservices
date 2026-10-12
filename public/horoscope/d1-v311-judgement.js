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
function varga(full,d,k){let v=full?.advanced?.vargas||full?.vargas;const div=d===9?'D-9':d===7?'D-7':'D-10';const row=Array.isArray(v)?v.find(x=>x.division===div):null;const star=row?.planets?.find(x=>norm(x.planet)===k);if(!star)return null;const s=SIGNS.indexOf(star.rasi);if(s<0)return null;const good=(OWN[k]||[]).includes(s)||EX[k]===s,weak=EX[k]!==undefined&&(EX[k]+6)%12===s;return {division:div,planet:k,sign:s,dignity:good?'strong':weak?'weak':'neutral',source:'advanced.vargas'};}
function assess(d,k){try{const r=g.SMVD1StrengthV303?.assess?.(d,k);if(Number.isFinite(r?.score))return {value:Math.max(0,Math.min(1,r.score)),dignity:r.dignity||d.planets[k]?.dignity,combust:!!r.combust?.combust};}catch(_){}return {value:.5,dignity:d.planets[k]?.dignity||'unknown',combust:!!d.planets[k]?.combust};}
function candidate(d,k,relation,house){const p=d.planets[k],s=assess(d,k),owned=d.houses.filter(h=>h.lord===k).map(h=>h.no);let delta=(s.value-.5)*3;
 if(['own','exalted'].includes(s.dignity))delta+=.75; if(s.dignity==='debilitated')delta-=.9;
 if(s.combust)delta-=.35; if(owned.includes(1)||owned.includes(5)||owned.includes(9))delta+=.25;
 if(owned.includes(6)||owned.includes(8)||owned.includes(12))delta-=.23;
 if(['Mars','Saturn','Rahu','Ketu'].includes(k)&&!owned.includes(1)&&!owned.includes(5)&&!owned.includes(9))delta-=.2;
 const strength=relation==='lord'?1.65:relation==='occupies'?1.05:relation==='aspects'?.68:.35;
 return {planet:k,relation,planetHouse:p.house,owned,delta:delta*strength,dignity:s.dignity,combust:s.combust,weight:strength,natal:true};}
function read(d,full,n,age){const h=d.houses[n-1],k=h?.lord;if(!h||!d.planets[k])return null;const loc=d.planets[k].house;
 if(!Number.isInteger(loc)||loc<1||loc>12)return null;
 const a=[candidate(d,k,'lord',n)];for(const p of new Set(h.occupants||[]))if(d.planets[p])a.push(candidate(d,p,'occupies',n));for(const p of new Set(h.aspects||[]))if(d.planets[p])a.push(candidate(d,p,'aspects',n));for(const p of KAR[n-1])if(d.planets[p])a.push(candidate(d,p,'karaka',n));
 const plus=a.filter(x=>x.delta>=.16).sort((x,y)=>y.delta-x.delta);const minus=a.filter(x=>x.delta<=-.16).sort((x,y)=>x.delta-y.delta);
 const sum=a.reduce((s,x)=>s+x.delta,0),support=sum>.8?'support':sum<-.8?'strain':'qualified';
 const relevant=n===7?9:n===5?7:n===10?10:null;const division=relevant?varga(full,relevant,k):null;
 const related=d.houses.filter(x=>x.lord===k&&x.no!==n).map(x=>x.no);
 // Weighted rule evidence selects a conclusion BEFORE narrative. Opposing evidence cannot disappear.
 const dominant=support==='support'?plus[0]:support==='strain'?minus[0]:Math.abs(plus[0]?.delta||0)>=Math.abs(minus[0]?.delta||0)?plus[0]:minus[0];
 const main=age!==null&&age<18&&[2,5,7,10,11].includes(n)?({2:'குடும்பப் பேச்சு மற்றும் கற்றலுக்கான பொருட்கள்',5:'பள்ளிப் படிப்பும் விளையாட்டும்',7:'நண்பர்களுடன் இணைந்து பழகும் விதம்',10:'பள்ளிப் பொறுப்பும் பயிற்சியும்',11:'நண்பர் வட்டமும் குழு நடவடிக்கையும்'})[n]:T[n-1][support==='strain'?2:1];
 return Object.freeze({house:n,lord:k,location:loc,houseOccupants:[...new Set(h.occupants||[])],houseAspects:[...new Set(h.aspects||[])],otherLordships:related,main,eventKind:support==='strain'?'obstacle':support==='support'?'opportunity':'negotiation',conclusion:support,relativeScore:Math.round(sum*100)/100,dominant,positive:plus,negative:minus,all:a,division,ageUnder18:age!==null&&age<18,topicTA:T[n-1],topicEN:E[n-1],destinationTA:DEST_TA[loc-1],destinationEN:DEST_EN[loc-1],source:'natal D1 + V303 strength + relevant validated varga only',ruleMethod:'relative priority heuristic; no factual event certainty'});
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
return Object.freeze({read,resolve,synthesize,norm,varga,PLAN,NTA,T,E,DEST_TA,DEST_EN,KAR});
});
