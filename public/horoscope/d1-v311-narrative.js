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

/* Tamil life explanations reuse the resolved chart; no additional calculation. */
const NATAL_MIXED_TA = [
 "தனிப்பட்ட முடிவுகளில் உங்கள் விருப்பத்தையும் பிறர் எதிர்பார்ப்பையும் எவ்வாறு சமநிலைப்படுத்துகிறீர்கள் என்பது முக்கியமாகிறது",
 "குடும்பப் பணவிஷயங்களில் வரவு, செலவு, சேமிப்பு ஆகியவற்றை ஒன்றாகப் புரிந்துகொள்ள வேண்டிய அமைப்பு உள்ளது",
 "முயற்சியின் பலனைப் புரிந்துகொள்ள பயிற்சியையும் தொடர்புகளையும் சேர்த்துப் பார்க்க வேண்டும்",
 "வீட்டுச் சூழலும் குடும்பத்தாரின் தேவைகளும் உங்கள் மற்ற முன்னுரிமைகளுடன் தொடர்புபடும் அமைப்பு உள்ளது",
 "கல்வியிலும் படைப்புப் பணியிலும் ஆர்வத்தை எவ்வாறு நடைமுறையில் பயன்படுத்துகிறீர்கள் என்பது முக்கியமாகிறது",
 "பணி ஒழுங்கு, போட்டி, ஓய்வு ஆகியவற்றை ஒன்றாகக் கவனிக்க வேண்டிய அமைப்பு உள்ளது",
 "துணைவர் அல்லது கூட்டாளியுடன் எதிர்பார்ப்பையும் பொறுப்பையும் தெளிவுபடுத்துவது முக்கியமாகிறது",
 "பகிர்ந்த நிதி அல்லது நீண்டகால ஏற்பாட்டைப் புரிந்துகொள்ள அதன் விவரங்களைச் சேர்த்துப் பார்க்க வேண்டும்",
 "கிடைக்கும் வழிகாட்டலையும் உங்கள் சொந்தத் திட்டத்தையும் எவ்வாறு இணைக்கிறீர்கள் என்பது முக்கியமாகிறது",
 "தொழிலில் ஏற்கும் பொறுப்பையும் அதற்குக் கிடைக்கும் பலனையும் சேர்த்துப் பார்க்க வேண்டிய அமைப்பு உள்ளது",
 "வருமான வழிகளையும் தொடர்புகளையும் ஒன்றாகப் புரிந்துகொள்வது முக்கியமாகிறது",
 "செலவு, தனிநேரம், ஓய்வு ஆகியவை ஒன்றையொன்று பாதிக்கும் அமைப்பு உள்ளது"
];
const NATAL_DETAIL_TA = [
 "ஒரு முடிவில் முன்னிலை வகிப்பது மட்டும் போதாமல், அதைத் தொடர்ந்து செயல்படுத்தும் பொறுப்பும் முக்கியமாகிறது. உங்கள் விருப்பத்தைத் தெளிவாகச் சொல்வதுடன், அதன் நடைமுறை விளைவையும் கவனிப்பது இந்த அமைப்புக்குப் பொருத்தமான அணுகுமுறையாகும்.",
 "வருமானம் கிடைப்பதும் அந்தப் பணம் சேமிப்பாகத் தங்குவதும் தனித்தனி விஷயங்கள். குடும்பத் தேவைகள், ஏற்றுக்கொள்ளும் பணப் பொறுப்புகள், கையில் வைத்திருக்க வேண்டிய தொகை ஆகியவற்றைத் தெளிவுபடுத்துவது இந்தத் துறையைப் புரிந்துகொள்ள உதவும்.",
 "ஒரு முயற்சியின் மதிப்பு உடனடிப் பலனில் மட்டும் தெரியாது; தொடர்ந்து செய்த பயிற்சியும் அதிலிருந்து கற்ற அனுபவமும் முக்கியம். உடன்பிறந்தோர் அல்லது நெருக்கமானவர்களுடன் தொடர்பு கொள்ளும்போது எதிர்பார்ப்பைத் தெளிவாகப் பேசுவது உதவும்.",
 "வீடு சார்ந்த முடிவில் வசதியையும் குடும்பத்தாரின் தேவையையும் தனித்தனியாகப் பார்க்க முடியாது. வசிப்பிடம் அல்லது பராமரிப்பு குறித்து தேர்வு செய்யும்போது, அது உங்கள் நேரத்தையும் அன்றாட அமைதியையும் எவ்வாறு பாதிக்கிறது என்பதையும் கவனிக்கலாம்.",
 "படிப்பிலும் படைப்புப் பணியிலும் ஆர்வத்தைத் தொடர்ந்து பயிற்சியாக மாற்றுவது முக்கியமாகிறது. எதைக் கற்கிறீர்கள் என்பதுடன், கற்றதை எங்கே பயன்படுத்த முடியும் என்பதையும் பார்க்கும்போது இந்தத் துறையின் நடைமுறை பொருள் தெளிவாகும்.",
 "கடினமான பணியை முடிப்பதுடன், அதைத் தொடர்ந்து செய்யக்கூடிய அன்றாட ஒழுங்கும் முக்கியம். போட்டி அல்லது கடன் தொடர்பான பொறுப்பு இருந்தால், அதைச் சமாளிக்கும் திட்டத்துடன் ஓய்வுக்கான நேரத்தையும் சேர்த்துப் பார்க்கலாம்.",
 "இணைந்து செயல்படும் உறவில் இருவருக்கும் எது முக்கியம் என்பதைப் புரிந்துகொள்வதே அடிப்படையாகிறது. பணம், நேரம், பொறுப்பு ஆகியவற்றில் யார் எதை ஏற்கிறார்கள் என்பதைத் தெளிவுபடுத்துவது இந்த அமைப்பின் நடைமுறை பொருளாகும்.",
 "பகிர்ந்து கையாளும் பணம் அல்லது ஆவணங்கள் இருந்தால், அவற்றில் உங்கள் பொறுப்பு என்ன என்பதைத் தெரிந்துகொள்வது முக்கியம். மாற்றம் தேவைப்படும் சூழலில் எதைப் பாதுகாக்க வேண்டும், எதைத் திருத்தலாம் என்பதைப் பிரித்துப் பார்ப்பது உதவும்.",
 "ஆசிரியர் அல்லது பெரியோரின் ஆலோசனை கிடைக்கும்போது, அதை உங்கள் சூழலுக்கு ஏற்ற நடைமுறைத் திட்டமாக மாற்றுவது முக்கியம். மேற்படிப்பு அல்லது தொலைதூர முயற்சி குறித்து தேர்வு செய்யும்போது அதன் பயனையும் அதற்குத் தேவையான ஏற்பாட்டையும் சேர்த்துப் பார்க்கலாம்.",
 "வேலை அல்லது தொழில் சார்ந்த முடிவில் பொறுப்பின் அளவும் அதற்குக் கிடைக்கும் பலனும் முக்கியமாகின்றன. புதிய பொறுப்பை ஏற்கும் சூழல் வந்தால், அதை நிறைவேற்றத் தேவையான நேரம், திறன், ஒத்துழைப்பு ஆகியவற்றைத் தெளிவுபடுத்துவது உதவும்.",
 "தொடர்புகளின் எண்ணிக்கையை விட அவற்றின் நம்பகத்தன்மையும் பயனும் முக்கியமாகின்றன. வருமானம் தொடர்பான திட்டம் அமைக்கும்போது, எதிர்பார்க்கும் வரவையும் உண்மையில் கிடைத்த தொகையையும் தனித்தனியாகப் பார்ப்பது இந்தத் துறையைத் தெளிவுபடுத்தும்.",
 "செலவைக் குறைப்பது மட்டும் போதாமல், தவிர்க்க முடியாத தேவைகளுக்கும் ஓய்வுக்கும் இடம் கொடுப்பதும் முக்கியம். வெளியூர் தொடர்பான திட்டம் இருந்தால், அதற்கான பணச் செலவுடன் நேரமும் குடும்ப ஏற்பாடும் எவ்வாறு மாறும் என்பதையும் பார்க்கலாம்."
];
const NATAL_YOUTH_AREA_TA = [
 "தன்னம்பிக்கையும் சிறிய முடிவுகளும்",
 "குடும்பத்துடன் தேவைகளைப் பகிர்தல்",
 "திறன் பயிற்சியும் நெருக்கமானவர்களுடன் பழகுதலும்",
 "வீட்டுச் சூழலும் குடும்ப ஆதரவும்",
 "கற்றலும் படைப்பாற்றலும்",
 "அன்றாட ஒழுங்கும் பயிற்சியும்",
 "நண்பர்களுடன் ஒத்துழைத்தல்",
 "பொருள் பொறுப்பும் மாற்றங்களை எதிர்கொள்ளுதலும்",
 "பெற்றோர் அல்லது ஆசிரியர் வழிகாட்டலும்",
 "வயதுக்கேற்ற பொறுப்பும் திறன் வளர்ப்பும்",
 "நண்பர் வட்டமும் குழுச் செயல்களும்",
 "உறக்கமும் ஓய்வும்"
];
const NATAL_YOUTH_CHANNEL_TA = [
 "தனியாகச் செய்யக்கூடிய சிறிய செயல்களுக்கு இடம் கொடுப்பது உதவும்",
 "கல்விக்கும் அன்றாடத் தேவைகளுக்கும் குடும்பத்தின் உதவி முக்கியமாகிறது",
 "தொடர் பயிற்சியும் நெருக்கமானவர்களுடன் உரையாடுவதும் இதனுடன் இணைகின்றன",
 "வீட்டில் கிடைக்கும் ஆதரவும் அமைதியான சூழலும் முக்கியமாகின்றன",
 "வயதுக்கேற்ற கற்றலும் விளையாட்டும் படைப்புச் செயல்களும் இதற்கான வழிகளாக அமைகின்றன",
 "பயிற்சி நேரத்தையும் ஓய்வையும் பொருத்தமாக அமைப்பது உதவும்",
 "நண்பர்களுடன் பொறுப்பைப் பகிர்ந்து பழகுவது முக்கியமாகிறது",
 "பொருள்களைப் பாதுகாப்பதும் புதிய சூழலுக்குப் பழகுவதும் இதனுடன் இணைகின்றன",
 "பெற்றோர் அல்லது ஆசிரியரின் வழிகாட்டலைப் பயன்படுத்துவது உதவும்",
 "வயதுக்கேற்ற ஒரு பொறுப்பை எடுத்துச் செய்து பழகுவது முக்கியமாகிறது",
 "நண்பர் வட்டமும் குழுவாகச் செய்யும் செயல்களும் இதனுடன் இணைகின்றன",
 "உறக்கத்திற்கும் இடைவெளிக்கும் போதிய நேரம் கொடுப்பது உதவும்"
];
const NATAL_YOUTH_DETAIL_TA = [
 "எளிய தேர்வுகளுக்கு காரணம் சொல்லிப் பழகுவதும், உதவி தேவைப்படும் போது பெரியவர்களிடம் கேட்பதும் தன்னம்பிக்கையை வளர்க்க உதவும்.",
 "தேவையான பொருள் எது, அதை எதற்குப் பயன்படுத்தப் போகிறீர்கள் என்பதை குடும்பத்தாரிடம் விளக்கிப் பழகுவது உதவும்.",
 "ஆர்வமான ஒரு திறனைச் சிறிது சிறிதாகப் பயிற்சி செய்வதும், மற்றவர் பேசும்போது கேட்பதும் இந்தத் துறைக்குப் பொருத்தமான பழக்கங்களாகும்.",
 "கற்றலுக்கான இடத்தையும் குடும்பத்துடன் உரையாடும் நேரத்தையும் பொருத்தமாக அமைப்பது இந்தத் துறையை நடைமுறையில் அணுக உதவும்.",
 "வயதுக்கேற்ற படிப்பு, இசை, ஓவியம் அல்லது விளையாட்டில் ஆர்வத்தை வெளிப்படுத்த இடம் கொடுப்பது உதவும்.",
 "எளிதாகத் தொடரக்கூடிய அன்றாடப் பழக்கத்தை அமைத்து, சோர்வு ஏற்பட்டால் இடைவெளி கொடுப்பது உதவும்.",
 "மாறிமாறிப் பொறுப்பை ஏற்கவும், தன் தேவையைச் சொல்லவும், மற்றவரின் கருத்தைக் கேட்கவும் பழகுவது உதவும்.",
 "பொருள்களைப் பாதுகாப்பாக வைத்திருப்பதும், புதிய சூழல் புரியாதபோது பெற்றோர் அல்லது பராமரிப்பவரிடம் கேட்பதும் உதவும்.",
 "தெரியாததை கேள்வியாகக் கேட்டு, கிடைக்கும் விளக்கத்தை ஒரு சிறிய செயலாக முயன்று பார்ப்பது உதவும்.",
 "வயதுக்கேற்ற சிறிய பொறுப்பை எடுத்துச் செய்து முடிப்பதன் மூலம் அதன் நடைமுறை பொருளைப் புரிந்துகொள்ளலாம்.",
 "குழுச் செயல்களில் ஒவ்வொருவரின் பங்கையும் புரிந்துகொண்டு, நம்பகமான நண்பர்களுடன் பழகுவதற்கு இடம் கொடுப்பது உதவும்.",
 "உறக்கத்தையும் விளையாட்டு அல்லது கற்றல் இடைவெளியையும் குடும்பத்துடன் சேர்ந்து அமைத்துக் கொள்வது உதவும்."
];
function natalEvidenceTA(e){
 const name=actor(e.planet,true);
 const relation={lord:'இந்தத் துறையின் அதிபதியாக இருப்பது',occupies:'இந்தத் துறைக்குரிய வீட்டில் இருப்பது',aspects:'இந்தத் துறைக்குரிய வீட்டைப் பார்ப்பது',karaka:'இந்தத் துறைக்குரிய காரகமாக எடுத்துக் கொள்ளப்படுவது'}[e.relation]||'இந்தத் துறையுடன் தொடர்பு பெறுவது';
 return `${name} ${relation}`;
}
function natalTamil(c){
 const d=J().resolve(c),idx=c.house-1,minor=c.ageUnder18;
 const areas=minor?NATAL_YOUTH_AREA_TA:AREA_TA;
 const focus=minor?`இந்த வயதில் ${areas[idx]} சார்ந்த பழக்கங்களை வளர்ப்பதே இந்தத் துறையின் பொருத்தமான வெளிப்பாடாகும்`:
  d.status==='supported'?FIRST_TA[idx][0]:d.status==='restricted'?FIRST_TA[idx][1]:NATAL_MIXED_TA[idx];
 const channel=minor?NATAL_YOUTH_CHANNEL_TA[c.location-1]:CHANNEL_TA[c.location-1];
 const first=`${focus}. ${channel}.`;
 const name=actor(c.lord,true),other=(c.otherLordships||[]).filter(n=>n!==c.house);
 const placement=c.location===c.house?'அவர் அதே வீட்டில் அமர்ந்துள்ளார்':`அவர் ${areas[c.location-1]} தொடர்பான வீட்டில் அமர்ந்துள்ளார்`;
 const structural=`உங்கள் ஜாதகத்தில் ${areas[idx]} சார்ந்த வீட்டின் அதிபதி ${name}. ${placement}. இதனால் இந்தத் துறையின் விளக்கத்தில் அவரது இருப்பிடமும் முக்கியமாகிறது.`;
 const related=other.length?` ${other.map(n=>areas[n-1]).join(' மற்றும் ')} சார்ந்த ${other.length===1?'வீட்டிற்கும்':'வீடுகளுக்கும்'} ${name} அதிபதியாக இருப்பதால், அந்தப் ${other.length===1?'பகுதியையும்':'பகுதிகளையும்'} சேர்த்துப் புரிந்துகொள்ள வேண்டும்.`:'';
 const detail=minor?`${NATAL_YOUTH_CHANNEL_TA[idx]}. ${NATAL_YOUTH_DETAIL_TA[idx]}`:NATAL_DETAIL_TA[idx];
 const out=[first,structural+related,detail];
 const top=c.positive?.[0],risk=c.negative?.[0];
 if(top&&risk)out.push(`${natalEvidenceTA(top)} இந்தத் துறையில் முன்னேற்றத்திற்கு ஆதரவான தொடர்பாக உள்ளது. அதே நேரத்தில் ${natalEvidenceTA(risk)} இந்தப் பகுதியில் கூடுதல் கவனமும் தெளிவான ஏற்பாடும் தேவைப்படுவதைக் குறிக்கிறது. எனவே இந்தத் துறையைப் புரிந்துகொள்ள வாய்ப்பையும் அதைச் சமாளிக்க வேண்டிய சூழலையும் ஒன்றாகப் பார்க்க வேண்டும்.`);
 else if(top)out.push(`${natalEvidenceTA(top)} இந்தத் துறையின் சாதகமான பக்கத்தை வலுப்படுத்துகிறது. மேலே கூறிய நடைமுறை வாய்ப்புகளைப் புரிந்துகொள்ள இந்தத் தொடர்பு ஒரு ஆதரவான சுட்டாக எடுத்துக் கொள்ளப்படுகிறது.`);
 else if(risk)out.push(`${natalEvidenceTA(risk)} இந்தப் பகுதியில் கூடுதல் கவனம் தேவைப்படுவதைக் குறிக்கிறது. எனவே இந்தத் துறைக்கான முடிவுகளில் வேகத்தை விட ஏற்பாட்டின் தெளிவுக்கு முக்கியத்துவம் அளிப்பது உதவும்.`);
 if(c.division&&c.division.dignity!=='neutral'){
  const v=c.division;
  out.push(`${v.division} வர்க்கத்திலும் ${actor(v.planet,true)} ${v.dignity==='strong'?'ஆட்சி அல்லது உச்ச':'நீச'} நிலையில் இருப்பதாகக் கிடைத்துள்ளது. இது ${v.dignity==='strong'?'இந்த விளக்கத்திற்கு கூடுதல் ஆதரவாக':'சிரமமான பக்கத்திற்கு கூடுதல் சூழலாக'} எடுத்துக் கொள்ளப்படுகிறது.`);
 }
 return out;
}
function natal(c,lang){if(lang!=='en')return natalTamil(c);const ta=lang!=='en',d=J().resolve(c),idx=c.house-1;
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
