/* V311 corrected: a resolved chart decision is input; prose is output only.
 * No placeholder paragraphs, invented event dates or generic annual filler.
 * Each sentence is grounded in a supplied D1/D9/dasha/transit property.
 */
(function(root,factory){'use strict';const api=factory(root);root.SMVD311Narrative=api;if(typeof module==='object'&&module.exports)module.exports=api;})(typeof window!=='undefined'?window:globalThis,function(g){'use strict';
const J=()=>g.SMVD311Judgement;
const AREA_TA=['தனிப்பட்ட முடிவுகள்','பணம் மற்றும் குடும்பப் பேச்சு','முயற்சியும் உடன்பிறப்புகளும்','வீடும் தாய்வழிப் பொறுப்பும்','கல்வியும் படைப்பாற்றலும்','சேவையும் பணிப் போட்டியும்','திருமணமும் கூட்டு உடன்பாடும்','கூட்டுச் சொத்தும் எதிர்பாராத மாற்றமும்','பாக்கியமும் பெரியோர் வழிகாட்டலும்','தொழிலும் பொதுப் பொறுப்பும்','வருமானமும் நட்பும்','செலவுகளும் ஓய்வும்'];
const AREA_EN=['independent choices','money and family communication','initiative and siblings','housing and family support','education and creative efforts','service and competition','marriage and partnership','shared assets and change','mentoring and long-distance plans','career and public duties','earnings and networks','expenses and recovery'];
/* Destination = concrete channel. Not a second prediction, but a link from
 * house lord's actual natal occupancy to the selected life issue. */
const CHANNEL_TA=[
 'தன் முடிவுகளையும் உடல் உழைப்பையும் நம்பியே இதற்கான நடவடிக்கை ஆரம்பிக்கும்',
 'கையில் இருக்கும் பணம், குடும்பத்தினருடன் நடக்கும் உரையாடல் ஆகியவை முக்கியமாகின்றன',
 'பயிற்சியும் தொடர் முயற்சியும், உடன்பிறந்தோருடனான தொடர்பும் இடையில் வருகின்றன',
 'வீட்டு வசதி அல்லது பெற்றோரின் தேவையை ஒதுக்கிவிட்டு முடிவெடுக்க இயலாது',
 'கல்வி, குழந்தைகள், படைப்புத்திறன் தொடர்பான தேர்வுகள் வழி திறக்கின்றன',
 'பணிச்சுமை, போட்டி அல்லது கடனைச் சமாளிக்கும் விதமே முன்னேற்றத்தின் வேகத்தை நிர்ணயிக்கும்',
 'துணைவர் அல்லது கூட்டாளியின் ஒப்புதல், தெளிவான பொறுப்புப் பங்கீடு தேவைப்படும்',
 'கூட்டுப் பணம், மறுசீரமைப்பு அல்லது எதிர்பாராத செலவு கணக்கில் எடுத்துக்கொள்ளப்படும்',
 'ஆசிரியர் அல்லது மூத்தவரின் வழிகாட்டலும் தொலைதூரத் தொடர்பும் முடிவை மாற்றுகின்றன',
 'வேலையின் தன்மை, பதவி அல்லது நிர்வாகப் பொறுப்பு வழியாக இது வெளிப்படும்',
 'நண்பர் வட்டம், வாடிக்கையாளர் தொடர்பு அல்லது கிடைக்கும் ஆதாயம் இதற்குத் துணையாகும்',
 'வெளியூர், தனிமையான உழைப்பு, ஓய்வு அல்லது கூடுதல் செலவின் வழியாக இதன் தாக்கம் தெரியும்'
];
const CHANNEL_EN=[
 'the native must take personal responsibility for the decision',
 'available funds and family discussions become part of the decision',
 'skills, repeated efforts and sibling contacts influence its course',
 'housing and parental needs cannot be separated from the decision',
 'education, children or creative work influence the route forward',
 'workload, competition or liabilities affect the pace of progress',
 'a partner or collaborator must agree on responsibilities',
 'shared money, restructuring or unexpected commitments matter',
 'mentors, advanced education or long-distance plans shape the outcome',
 'professional standing and organisational responsibility shape the outcome',
 'contacts, customers and earned gains influence the outcome',
 'distance, solitude, recovery or additional costs affect the plan'
];
const FIRST_TA=[
 ['மற்றவர்கள் முடிவெடுப்பதற்காகக் காத்திருப்பதைவிட தானே முன்னிலை வகிக்கும் சூழல் அதிகமாகலாம்','முடிவெடுப்பதில் தன்னம்பிக்கை இருந்தாலும் அதற்குரிய பொறுப்பைச் சுமக்க வேண்டியிருக்கும்'],
 ['வீட்டுக்குள் பணம் வருவது மட்டும் போதாமல், எவ்வளவு சேமிக்க முடிகிறது என்பதே நிம்மதியை நிர்ணயிக்கும்','குடும்பத் தேவைக்காகச் செய்யும் செலவையும் பிறருக்குக் கொடுக்கும் வாக்குறுதியையும் பிரிக்க வேண்டியிருக்கும்'],
 ['குறுகிய கால முயற்சியை விட தொடர்ந்து ஒரே திறனில் வேலை செய்வதால் முன்னேற்றம் காணலாம்','ஒரு முயற்சியைத் தொடங்கிய உடனே முடிவு கிடைக்காமல் இடையில் முறையை மாற்றும் சூழல் வரலாம்'],
 ['வசிப்பிடம் அல்லது குடும்பப் பராமரிப்பு முடிவுகள் வாழ்க்கையின் பிற முன்னுரிமைகளையும் மாற்றக்கூடும்','வீடு சார்ந்த செலவோ உறவினர் பொறுப்போ தனிப்பட்ட திட்டங்களைத் தாமதப்படுத்தலாம்'],
 ['பயிற்சியை நடைமுறையில் பயன்படுத்தும்போதுதான் கற்றலின் முழுப் பயன் வெளிப்படும்','ஆர்வம் பல திசைகளுக்குச் சென்றால் ஒன்றில் ஆழ்ந்த திறன் பெற நேரம் பிடிக்கலாம்'],
 ['சிக்கலான பணியைப் பொறுப்பாக எடுத்துச் செய்வதால் அனுபவமும் நம்பிக்கையும் வளரக்கூடும்','வேலைப்பளுவையும் கடமைகளையும் ஒழுங்குபடுத்தாவிட்டால் தனிநேரம் குறையலாம்'],
 ['ஒற்றுமையாகச் செயல்படுவதற்கு இருவருக்கும் எது முக்கியம் என்பதைத் தெளிவாகப் பேச வேண்டியிருக்கும்','உறவு அல்லது தொழில் கூட்டு முயற்சியில் எதிர்பார்ப்பு வேறுபாடு தாமதத்தை உருவாக்கலாம்'],
 ['ஏற்கெனவே உள்ள ஏற்பாட்டில் தேவையான மாற்றத்தைச் செய்து பாதுகாப்பை வளர்க்கும் வாய்ப்பு உள்ளது','ஆவணங்கள் அல்லது பகிர்ந்த நிதி தொடர்பான விஷயங்கள் திடீரென கவனம் கேட்கலாம்'],
 ['வழிகாட்டல் அல்லது மேல்படிப்பிலிருந்து வரும் புதிய புரிதல் வாழ்க்கைத் தேர்வை மாற்றக்கூடும்','பெரியோர் கருத்துக்கும் தனிப்பட்ட விருப்பத்திற்கும் இடையே சமநிலை தேவைப்படும்'],
 ['முக்கியமான வேலையை நம்பிக்கையுடன் ஒப்படைக்கும் நிலை படிப்படியாக உருவாகலாம்','தொழிலில் செய்த முயற்சிக்கும் கிடைக்கும் அங்கீகாரத்திற்கும் இடையில் கால இடைவெளி வரலாம்'],
 ['சம்பாதிக்கும் திறனைப் போலவே சரியான தொடர்புகளைத் தேர்ந்தெடுப்பதும் பலனளிக்கும்','எதிர்பார்த்த வரவு தாமதமானால் புதிய நிதி முடிவை ஒத்திவைக்க வேண்டியிருக்கும்'],
 ['தனிநேரத்தையும் செலவையும் ஒரே திட்டத்தில் வைத்தால் மன ஓய்வு அதிகரிக்கலாம்','வெளியூர் அல்லது குடும்பத் தேவைகள் காரணமாக ஒதுக்கிய பணமும் நேரமும் மாறக்கூடும்']
];
const FIRST_EN=[
 ['Taking the initiative may become more important than waiting for others to decide','Independent decisions can bring responsibilities alongside confidence'],
 ['The amount retained as savings matters as much as the income coming in','Family commitments and financial promises may compete for available money'],
 ['Steady practice can matter more than a short burst of effort','An initiative may need to be revised before it is useful'],
 ['Housing and care decisions can reshape other priorities','Home costs and family duties can delay personal plans'],
 ['Learning becomes useful when practice turns it into a working skill','Many interests may delay depth in a particular field'],
 ['Trust can grow from accepting difficult responsibilities','Workload may crowd out recovery when duties are not shared'],
 ['Shared life or business decisions require explicit expectations','Unspoken assumptions can slow partnership decisions'],
 ['Restructuring an existing arrangement can improve security','Shared documents or liabilities may require closer attention'],
 ['Mentors or advanced study can change a major decision','Advice from elders and independent plans may not always agree'],
 ['Trust and wider responsibilities may accumulate gradually at work','Recognition may lag behind work completed'],
 ['Carefully chosen contacts can help convert skill into earnings','Forecast receipts need not arrive when first expected'],
 ['Separating unavoidable costs from optional spending can protect rest','Travel or family care can interrupt an established budget']
];
const CAUSE_TA=[
 'அந்த அமைப்பு வாழ்வில் எந்தப் பொறுப்பைத் தானாக ஏற்கிறார் என்பதோடு சேர்ந்து செயல்படுகிறது',
 'வருமானத்தை எவ்வாறு பயன்படுத்துகிறார், எதை குடும்பத்துடன் பகிர்கிறார் என்ற இரண்டிலும் அதன் தாக்கம் தெரிகிறது',
 'முயற்சி திடீரெனப் பலனளிப்பதைவிட பயிற்சி செய்து உறுதி பெறும் வழியே முக்கியமாகிறது',
 'வீட்டில் செய்யப்படும் ஒரு முடிவு வேலையையும் அன்றாட அமைதியையும் மாற்றும் சூழல் அமைகிறது',
 'கற்றதை எங்கே பயன்படுத்துகிறார் என்பதில்தான் படிப்பின் பலன் தெளிவாகிறது',
 'தினசரி வேலை, கடமைகள், போட்டி மூன்றின் சமநிலை அதன் விளைவை மாற்றுகிறது',
 'நெருங்கியவர் உடன் எவ்வளவு பொறுப்பை ஏற்றுக்கொள்கிறார் என்பது முடிவை நிர்ணயிக்கிறது',
 'பாதுகாக்க வேண்டிய நிதியையும் மாற்ற வேண்டிய ஏற்பாட்டையும் பிரித்துக் கையாள வேண்டியிருக்கிறது',
 'கிடைக்கும் அறிவுரையை நடைமுறை முயற்சியாக மாற்றும்போது அதன் பயன் தெரியும்',
 'செய்த வேலையின் அளவை விட பொறுப்பின் தரமும் பொது நம்பிக்கையும் தொழிலின் போக்கை மாற்றுகின்றன',
 'அறிமுகத்தின் எண்ணிக்கையை விட யாருடன் செயல்படுகிறார் என்பதே ஆதாயத்தை நிர்ணயிக்கிறது',
 'செலவு, தூரப் பணி, ஓய்வு ஆகியவற்றில் ஒன்றை மாற்றினால் மற்ற இரண்டும் மாறும் நிலை ஏற்படுகிறது'
];
const COUNTER_TA=[
 'முடிவை எடுக்கத் தேவையான துணிவு இருக்கும்போதும் நேரம் எடுத்துச் செய்வதே நன்மை தரும்',
 'வரவு இருக்கிறதென்பதற்காகச் சேமிப்பும் அதிகரிக்கும் என்று உறுதியாகச் சொல்ல முடியாது',
 'தனித்திறன் உயரும்போது உறவினரின் எதிர்பார்ப்புகளையும் சமாளிக்க வேண்டியிருக்கும்',
 'வீட்டிற்கு வரும் வசதியுடன் புதிய பராமரிப்புச் செலவும் வர வாய்ப்பு உண்டு',
 'கல்வித் திறனை வளர்க்கும் வாய்ப்பும் கவனம் சிதறச் செய்யும் பொறுப்பும் ஒன்றாக வருகின்றன',
 'வேலை வாய்ப்பு இருக்கும்போது ஓய்வு மற்றும் கடன் பற்றிய பொறுப்பையும் புறக்கணிக்க இயலாது',
 'ஒத்துழைப்பு கிடைக்கும் போதிலும் உடன்படிக்கையின் சிறு விவரங்களால் கருத்து வேறுபாடு வரலாம்',
 'ஒரு மாற்றம் பயன் தரும்போது அதற்கான ஆவணச் சுமையும் அதிகரிக்கலாம்',
 'ஆசிரியர் வழிகாட்டல் உதவும்; இறுதி முடிவில் தன் அனுபவமும் முக்கியமாகும்',
 'தொழிலில் கூடுதல் பொறுப்பு வரும்போது அங்கீகாரம் கிடைக்கும் வேகம் வேறுபடலாம்',
 'ஆதாய வாய்ப்பும் பணம் கைக்கு வரும் காலமும் ஒரே நேரமாக அமைய வேண்டியதில்லை',
 'வெளியூர் வாய்ப்போ ஓய்வு தேவையோ இருந்தாலும் செலவுக் கட்டுப்பாடு அவசியமாகும்'
];
function actor(k,ta){return ta?(J().NTA[k]||k):k;}
function riskAndSupport(c,ta){const top=c.positive[0],risk=c.negative[0];if(!top&&!risk)return '';
 if(top&&risk){return ta?`${actor(top.planet,true)} தரும் ஆதரவுக்கு எதிராக ${actor(risk.planet,true)} தொடர்பும் இருப்பதால் ${COUNTER_TA[c.house-1]}.`:`A supportive ${top.planet} contact is offset by restrictive ${risk.planet} evidence; the result depends on how the competing circumstances are handled.`;}
 if(risk)return ta?`${actor(risk.planet,true)} தொடர்பின் அழுத்தம் இருப்பதால் முயற்சியின் வேகத்தைவிட ஏற்பாட்டின் நிலைத்தன்மை முக்கியமாகிறது.`:`A restrictive ${risk.planet} contact makes stability of the arrangements more important than speed.`;
 // A positive contact is already reflected in J.resolve(c).status and the
 // concrete life-scene above. Restating "chart evidence exists" is filler,
 // not a life prediction; omit this sentence entirely in BOTH languages.
 return ''; }
function natal(c,lang){const ta=lang!=='en',d=J().resolve(c),idx=c.house-1;
 const domain=ta?AREA_TA[idx]:AREA_EN[idx],channel=ta?CHANNEL_TA[c.location-1]:CHANNEL_EN[c.location-1];
 const minor=c.ageUnder18;const focus=(minor&&[7,10,11].includes(c.house))?(ta?'நட்பிலும் குழுச் செயலிலும் பொறுப்பைப் பகிர்வது':'learning to cooperate with peers'):(ta?FIRST_TA[idx][d.status==='supported'?0:1]:FIRST_EN[idx][d.status==='supported'?0:1]);
 const first=ta?`${focus}. ${channel[0].toUpperCase()+channel.slice(1)}.`:`${focus}. In practice, ${channel}.`;
 const other=c.otherLordships?.filter(n=>n!==c.house)||[];
 const structural=ta?`${actor(c.lord,true)} ${c.house}-ஆம் பாவத்தின் அதிபதியாக ${c.location}-ஆம் இடத்தில் அமர்ந்துள்ளார். ${CAUSE_TA[c.house-1]}.`:`${c.lord} owns house ${c.house} and occupies house ${c.location}; this links ${domain} with ${AREA_EN[c.location-1]}.`;
 const related=other.length&&[1,2,4,5,7,10,11].includes(c.house)?(ta?`மேலும் ${other.map(n=>AREA_TA[n-1]).join(' மற்றும் ')} ஆகியவற்றுக்கும் ${actor(c.lord,true)} அதிபதியாக இருப்பதால் இந்த முடிவு அங்கேயும் தாக்கம் செலுத்தலாம்.`:`The same ruler also governs ${other.map(n=>AREA_EN[n-1]).join(' and ')}, joining decisions across these areas.`):'';
 const second=[structural,related,riskAndSupport(c,ta)].filter(Boolean).join(' ');
 const out=[first,second];
 if(c.division&&c.division.dignity!=='neutral'){const v=c.division;out.push(ta?`${v.division} வர்க்கத்தில் ${actor(v.planet,true)} ${v.dignity==='strong'?'ஆட்சி அல்லது உச்ச நிலையில் இருப்பது இந்த முடிவுக்கு கூடுதல் துணையாகிறது':'நீச நிலையில் இருப்பது முடிவின் சிரமமான பக்கத்தை வலுப்படுத்துகிறது'}.`:`In ${v.division}, ${v.planet} has ${v.dignity==='strong'?'own-sign or exalted':'debilitated'} dignity and is considered as supporting context rather than a separate guaranteed event.`);}
 return out;}
function period(win,claim,lang){const ta=lang!=='en',p=win.period,st=J().resolve(claim),md=actor(p.md,ta),ad=actor(p.ad,ta),age=p.age;
 const minor=age!==null&&age<18;
 const objective=minor?(ta?'பள்ளிப் படிப்பு, பயிற்சி அல்லது குடும்பப் பழக்கத்தின் வளர்ச்சி':'learning, developing habits and family support'):(ta?st.sceneTA:st.sceneEN);
 const area=ta?AREA_TA[claim.house-1]:AREA_EN[claim.house-1];
 const location=ta?AREA_TA[claim.location-1]:AREA_EN[claim.location-1];
 const main=ta?`${p.from} முதல் ${p.to} வரை ${md} மகாதசை–${ad} புக்தி தொடர்பில் ${objective} என்ற வாழ்க்கைச் சூழல் முன்னிலை பெறுகிறது.`:`For ${p.from}–${p.to}, the ${md} major period with ${ad} sub-period highlights ${objective}.`;
 const rationale=ta?`${claim.lord===p.md||claim.lord===p.ad?'அந்தக் கால அதிபதிகளில் ஒருவர்':'இந்தக் காலத்தின் கிரகங்கள்'} ${actor(claim.lord,true)} ஆளும் ${claim.house}-ஆம் பாவத்துடன் பிறப்பிலேயே தொடர்பு பெறுவதால் ${location} வழியாக ${area} பற்றிய முடிவு முக்கியமாகலாம்.`:`The period planets have computed natal ties to house ${claim.house}; the effect is channelled through ${location}.`;
 const limit=st.status==='restricted'?(ta?'வேகம் குறைந்தாலும் பணியைச் சீரமைக்க முடியும்; திடீர் உயர்வு என்று மட்டும் கூற முடியாது.':'Delay or reorganisation is more plausible than an automatic rapid advance.') :st.status==='supported'?(ta?'எடுத்த பொறுப்பை முடித்துக் காட்டினால் கிடைக்கும் வாய்ப்பைத் தக்கவைத்துக்கொள்ள முடியும்.':'Completion of existing obligations can help retain the opening.'):(ta?'இணைந்திருக்கும் சாதகமும் தடையும் காரணமாக பலன் ஒரே சீரில் அமையாமல் சில முறை மாறக்கூடும்.':'Positive and restraining indications coexist, so the result may develop unevenly.');
 const transit=win.transit?(ta?`கணிக்கப்பட்ட ${actor(win.transit.planet,true)} கோச்சாரம் ${win.transit.observedOn} அன்று அதே பாவத்தைத் தொடர்புகொண்டுள்ளது; இது கூடுதல் காலச்சுட்டு மட்டுமே.`:`A computed ${win.transit.planet} transit on ${win.transit.observedOn} provides a secondary timing indicator.`):'';
 return [main,rationale,limit,transit].filter(Boolean).join(' ');
}
function year(group,lang){const ta=lang!=='en';if(group.kind==='insufficient')return '';
 const c=group.claim,dec=J().resolve(c);const house=ta?AREA_TA[c.house-1]:AREA_EN[c.house-1],dest=ta?AREA_TA[c.location-1]:AREA_EN[c.location-1];
 const transit=actor(group.transit.planet,ta),md=actor(group.period.md,ta),ad=actor(group.period.ad,ta);
 const o=group.observations||[],down=o.reduce((a,b)=>a+b,0)<0;
 const scene=ta?FIRST_TA[c.house-1][down?1:0]:FIRST_EN[c.house-1][down?1:0];
 const when=ta?`${group.from} – ${group.to}`:`${group.from} – ${group.to}`;
 const age=group.age;
 if(age!==null&&age<18){
  const youthTA={1:'தனியாகப் படிப்பதற்கான பொறுப்பை ஏற்றுக்கொள்ளும் அணுகுமுறை',2:'குடும்பத்துடன் கல்விச் செலவும் தேவையும் பற்றிப் பேசும் பழக்கம்',3:'திறன் பயிற்சி, பேச்சாற்றல் மற்றும் நண்பர்களுடன் இணைந்து செயல்படுதல்',4:'வீட்டுச் சூழல் படிப்பு நேரத்திற்குத் தரும் ஆதரவு',5:'பாடங்களில் ஆர்வமும் படைப்புச் செயல்களும்',6:'ஒழுங்கான பயிற்சிக்கும் ஓய்வுக்கும் இடம் அமைத்தல்',7:'நண்பர்களுடன் கருத்து வேறுபாட்டைத் தீர்க்கும் பழக்கம்',8:'பாதுகாப்பான இணையப் பழக்கமும் பொருள் பொறுப்பும்',9:'ஆசிரியர் வழிகாட்டலுடன் மேற்படிப்புக்கான ஆர்வம்',10:'விளையாட்டு அல்லது பள்ளிப் பொறுப்பை முடிக்கும் திறன்',11:'பயனுள்ள நண்பர் வட்டம் மற்றும் குழுக் கற்றல்',12:'உறக்கமும் படிப்பு இடைவெளியும் பொருத்தமாக அமைதல்'};
  const youthEN={1:'responsibility for independent study',2:'discussions of educational needs at home',3:'skills and communication with peers',4:'a supportive study environment at home',5:'school interests and creativity',6:'balance between training and rest',7:'handling disagreements among peers',8:'safer habits and shared responsibilities',9:'mentoring and aspirations for study',10:'school duties and team activity',11:'peer networks and group learning',12:'sleep and study breaks'};
  const y=ta?youthTA[c.house]:youthEN[c.house];const b=age>=15?(ta?'மேல்நிலைப் பாடத் தேர்வுகளில் முன்னுரிமைகளைத் தெளிவாக வைத்தால்':'As academic decisions become more important, clear priorities can help'):age>=11?(ta?'பள்ளிப் பழக்கத்தை அமைக்கும் வயதில்':'At school-going age'):(ta?'சிறுவயதில்':'In childhood');
  const recurrence=group.recurrences?.length?(ta?` இதே அமைப்புக்கான பிற கணிக்கப்பட்ட காலங்கள்: ${group.recurrences.map(x=>x.from+'–'+x.to).join(', ')}.`:` Similar computed windows: ${group.recurrences.map(x=>x.from+'–'+x.to).join(', ')}.`):'';
  return ta?`${when}: ${y} முக்கியம் பெறும் காலமாகும். ${b} குடும்பத்தாரின் வழிகாட்டல் உதவும். ${md}–${ad} தசா–புக்தியுடன் ${transit} கோச்சாரமும் ${c.house}-ஆம் பாவத்தைத் தொடர்புகொள்கிறது.${recurrence}`:`${when}: The chart highlights ${y}. ${b}; the computed ${md}/${ad} period and ${transit} transit both link to house ${c.house}.${recurrence}`;
 }
 const lead=ta?`${when}: ${scene}.`:`${when}: ${scene}.`;
 const detail=ta?`${house} பற்றிய இந்தச் சுட்டுக்கு ${md}–${ad} தசா–புக்தியும் ${transit} பெயர்ச்சியும் ஒரே காலத்தில் தொடர்பு தருகின்றன. பிறப்பில் ${actor(c.lord,true)} அமர்ந்துள்ள ${c.location}-ஆம் இடம் காரணமாக ${dest} சார்ந்த சூழலும் சேரலாம்.`:`During ${md}/${ad}, the computed ${transit} contact also activates ${house}. Its ruler ${c.lord} occupies natal house ${c.location}, linking the timing to ${dest}.`;
 const restraint=dec.risk&&dec.protection?(ta?'சாதகமான வாய்ப்புடன் எதிர் ஆதாரமும் இருப்பதால் இதை உறுதியான நிகழ்வுத் தேதியாக எடுத்துக்கொள்ள முடியாது.':'The natal chart has counter-evidence, so this is not an exact event-date forecast.') :'';
 const recurrence=group.recurrences?.length?(ta?` இதே சுட்டு மறுபடியும் காணப்படும் காலங்கள்: ${group.recurrences.map(x=>x.from+'–'+x.to).join(', ')}.`:` Other sampled windows with the same theme: ${group.recurrences.map(x=>x.from+'–'+x.to).join(', ')}.`):'';
 return [lead,detail,restraint].filter(Boolean).join(' ')+recurrence;
}
function summary(s,lang){const ta=lang!=='en',a=s.main,b=s.counter,ar=J().resolve(a);const main=ta?AREA_TA[a.house-1]:AREA_EN[a.house-1],channel=ta?AREA_TA[a.location-1]:AREA_EN[a.location-1];
 const first=ta?`${main} வாழ்க்கையில் கூடுதல் முக்கியத்துவம் பெறும் அமைப்பு காணப்படுகிறது. ${actor(a.lord,true)} ${a.house}-ஆம் இடத்திற்கு அதிபதியாகி ${a.location}-ஆம் இடத்தில் இருப்பதால் ${channel} தொடர்பான தீர்மானங்கள் இதனை மாற்றும்.`:`The dominant pattern concerns ${main}. ${a.lord} rules house ${a.house} and occupies house ${a.location}, bringing in ${channel}.`;
 const second=b.house!==a.house?(ta?`${AREA_TA[b.house-1]} பற்றி ${actor(b.lord,true)} தரும் ${b.conclusion==='strain'?'எதிர் ஆதாரம்':'மற்றொரு ஆதாரம்'} காரணமாக ஒரே நேரத்தில் எல்லா முயற்சிகளும் ஒரே வகையில் அமையாது.`:`A separate indicator involving ${AREA_EN[b.house-1]} provides ${b.conclusion==='strain'?'counterweight':'additional context'} to this reading.`):'';
 return [first,second].filter(Boolean);
}
return Object.freeze({natal,period,year,summary});
});
