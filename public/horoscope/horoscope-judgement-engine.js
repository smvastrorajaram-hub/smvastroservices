/* SMV ASTRO — canonical ordered horoscope-judgement-engine.js; no source version in path. */

/* ---- d1-events.js (preserves original execution order) ---- */
/* SMV ASTRO V307 — evidence-to-life-event reader.
 * No static chart sample, no Firebase, no calculation/network calls, no user-profiling.
 * Traditional astrology interpretation: possible themes, never certain outcomes,
 * no sex-of-child / medical diagnosis / denial of children or marriage.
 * Consumes existing real D1 and V302/303 15-year Swiss period/transit outputs.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.SMVD1IntegratedV303=api;})(typeof window!=='undefined'?window:globalThis,function(){'use strict';
const P={Sun:'சூரியன்',Moon:'சந்திரன்',Mars:'செவ்வாய்',Mercury:'புதன்',Jupiter:'குரு',Venus:'சுக்கிரன்',Saturn:'சனி',Rahu:'ராகு',Ketu:'கேது'};
const nk=x=>P[x]?x:(Object.keys(P).find(k=>P[k]===x)||null);
const pl=(k,ta)=>ta?P[k]||k:k;
const names=['தனித்தன்மை, குணநலன்கள் மற்றும் உடல் வளர்ச்சி','குடும்பம், பேச்சு மற்றும் செல்வப் பாதுகாப்பு','முயற்சி, திறமை மற்றும் உடன்பிறப்புகள்','தாய், வீடு, நிலம் மற்றும் மனநிம்மதி','அறிவு, கல்வி, படைப்பாற்றல் மற்றும் புத்திரம்','போட்டி, பணிப்பழக்கம் மற்றும் உடல்நல ஒழுங்கு','திருமணம், உடன்பாடு மற்றும் இணைந்து செயல்படுதல்','பாதுகாப்பு, எதிர்பாராத மாற்றம் மற்றும் ஆராய்ச்சி','தந்தை, குரு, உயர் கல்வி மற்றும் பாக்கியம்','தொழில், கடமை மற்றும் சமூகப் பொறுப்பு','வருமானம், நண்பர்கள் மற்றும் இலக்கு நிறைவேற்றம்','செலவு, உறக்கம், அந்நியத் தொடர்பு மற்றும் ஓய்வு'];
const enames=['Identity, character and physical wellbeing','Family, speech and material security','Effort, skills and siblings','Mother, home, property and emotional security','Learning, creativity and matters concerning children','Competition, duty and daily health routines','Marriage, agreements and cooperation','Safety, unexpected changes and research','Father, mentors, higher studies and principles','Work, duties and public responsibility','Income, networks and long-range aims','Expenses, sleep, overseas contacts and rest'];
// Explicit age lenses: child themes MUST NOT become adult marital/income/career events.
const LENS_TA={
 infant:['உடல் வளர்ச்சி, உறக்கம் மற்றும் பராமரிப்பாளர்களுடன் பழகுதல்','பெற்றோர் வழங்கும் உணவு, பாதுகாப்பு மற்றும் குழந்தையின் ஒலிப்பயிற்சி','கைகளால் விளையாடுதல், பொருள்களைத் தொட்டு அறிதல் மற்றும் அருகிலுள்ள உறவுகள்','தாயின் பராமரிப்பு, வீட்டின் ஒலி–ஒளிச் சூழல் மற்றும் பாதுகாப்பு','விளையாட்டு வழியான கற்றல், நினைவு மற்றும் புதிய ஒலிகளை அறிதல்','உணவு, தூக்கம், தூய்மை மற்றும் வயதுக்கேற்ற உடல் அசைவுகள்','பெற்றோர் மற்றும் பராமரிப்பாளர்களுடன் அன்புப் பிணைப்பு','புதிய சூழலை மெதுவாகப் பழக்குதல் மற்றும் குடும்பக் கவனிப்பு','தந்தை, மூத்தோர் அன்பு மற்றும் வழிகாட்டும் பராமரிப்பு','சிறிய பழக்கங்களைக் கற்றல், பராமரிப்பாளர்கள் வழி ஒழுங்கு','குடும்ப ஆதரவு, விளையாட்டுக் குழு மற்றும் பழகும் வாய்ப்பு','தூக்கம், பாதுகாப்பான ஓய்வு மற்றும் குழந்தைக்கான குடும்பச் செலவுகள்'],
 primary:['தன்னம்பிக்கை, உடற்பயிற்சி மற்றும் வகுப்பு பழக்கம்','வீட்டின் உதவி, மொழித்திறன், எண்ணறிவு மற்றும் சிக்கனப் பழக்கம்','எழுத்து, விளையாட்டுத் திறன், உடன்பிறப்பு மற்றும் தோழர் தொடர்புகள்','வீட்டுப் படிப்பிடம், தாய்–குடும்ப ஆதரவு, பள்ளி வசதி','வாசிப்பு, கணிதம், கலை, நினைவாற்றல் மற்றும் படைப்புப் பயிற்சி','பள்ளிப் போட்டி, விளையாட்டு, உணவு–உறக்க ஒழுங்கு','நண்பர்கள், குழுப் பணிகள் மற்றும் நியாயமாகப் பேசிப் பழகுதல்','வகுப்பு மாற்றம், பாதுகாப்புப் பழக்கம், புதிய சூழலைச் சமாளித்தல்','தந்தை–ஆசிரியர் வழிகாட்டுதல், கல்விச் சுற்றுலா','பள்ளி வேலைகளை முடித்தல், திறனுக்குக் கிடைக்கும் பாராட்டு','நண்பர்கள், குழுச் செயல்பாடுகள் மற்றும் படிப்பு இலக்குகள்','படிப்புச் செலவு, திரைநேரம், ஓய்வு மற்றும் குடும்பக் கட்டுப்பாடு'],
 teen:['சுயமுடிவு, அடையாளம், உடற்பயிற்சி மற்றும் ஒழுக்கம்','தொடர்பாடல், குடும்ப ஆதரவு, சேமிப்பின் அடிப்படை','தேர்வு முயற்சி, எழுதுதல், தொழில்நுட்பப் பயிற்சி மற்றும் சக மாணவர்கள்','வீட்டுப் படிப்பிடம், குடும்பத்தோடு முடிவுகளைப் பகிர்தல்','பாடத் தேர்வு, திறன் வளர்ச்சி, தேர்வுகள் மற்றும் படைப்பாற்றல்','போட்டித் தேர்வு, சீரான பயிற்சி மற்றும் ஓய்வு','நட்பு, ஒத்துழைப்பு, தனிப்பட்ட எல்லைகள்','பாடத்திட்ட மாற்றம், புதிய பொறுப்பை ஏற்றுப் பழகுதல்','ஆசிரியர் உதவி, உயர்கல்விக்கான ஆயத்தம்','எதிர்காலத் தொழில் திறன், பயிற்சி மற்றும் திட்டமிடல்','குழு சாதனை, போட்டி வெற்றி, நண்பர்களின் உதவி','கல்விச் செலவுகள், பயணம், உறக்கம் மற்றும் கவனம்'],
 youth:['தன்னம்பிக்கையுடன் வழியைத் தேர்ந்தெடுக்கும் காலம்','முதல் சேமிப்பு, குடும்பப் பங்களிப்பு மற்றும் பேச்சு','பயிற்சி, தொழில்நுட்ப முயற்சி மற்றும் துணிவான திட்டங்கள்','வசிப்பிடம், தாய்–குடும்பப் பொறுப்புகளைப் பகிர்தல்','உயர்கல்வி, படைப்புத் தொழில், கற்றதைச் செயல்படுத்துதல்','வேலைப் பயிற்சி, போட்டி, தினசரி ஒழுங்கு','நெருங்கிய உறவு, ஒப்பந்தம், பரஸ்பர புரிதல்','வாழ்க்கை மாறுதலுக்கு ஆயத்தம், ஆவணப் பாதுகாப்பு','உயர்கல்வி, பயணம், ஆசிரியர் வழிகாட்டுதல்','வேலைக்கான திறன் நிரூபிப்பு, தொழில் பாதை','ஆரம்ப வருமானம், தொடர்புகள் மற்றும் தெளிவான இலக்குகள்','கல்வி/தொழில் செலவு, வெளியூர்த் தொடர்பு, உறக்கம்'],
 adult:['சொந்த முடிவு, வாழ்க்கைமுறை, உழைப்பு மற்றும் சுயமரியாதை','குடும்பப் பொருளாதாரம், சேமிப்பு, பேச்சின் தாக்கம்','சுயமுயற்சி, தகவல் தொடர்பு, உடன்பிறப்பு மற்றும் புதிய திறன்','சொத்து, வீடு, தாய்–குடும்பத் தேவைகள்','அறிவைத் தொழிலில் பயன்படுத்துதல், குழந்தைகளின் கல்வி மற்றும் படைப்பாற்றல்','வேலைப்பளு, போட்டியைச் சமாளித்தல், கடன் மற்றும் அன்றாட ஒழுங்கு','வாழ்க்கைத்துணை, வணிகப் பங்காளி, பொறுப்புப் பகிர்வு','திடீர் செலவு, மறைந்த தகவல், பாதுகாப்புத் திட்டம்','தந்தை, வழிகாட்டி, உயர்கல்வி, நீண்ட பயணம்','வேலை, சேவை, பதவி, வாடிக்கையாளர் நம்பிக்கை','வருமான வளர்ச்சி, நண்பர் வட்டம், நீண்டகால நோக்கம்','தொழில் முதலீடு, செலவு, அந்நியத் தொடர்பு, உறக்கம்'],
 senior:['உடலின் தாங்குதிறன், சுயமரியாதை மற்றும் விருப்பமான செயல்பாடு','ஏற்கெனவே உள்ள சேமிப்பு, குடும்ப ஆலோசனை மற்றும் பண நிர்வாகம்','அனுபவம் பகிர்தல், உறவுச் செய்திகள், விருப்பக் கற்றல்','வசிப்பிடம், குடும்ப அமைதி, வீட்டு பராமரிப்பு','பிள்ளைகள் மற்றும் இளையோருக்கு வழிகாட்டுதல், அறிவுப் பகிர்வு','உடல் ஒழுங்கு, விருப்பமான பணி, அன்றாடப் பொறுப்பின் அளவு','நீண்டகால உறவுகளைப் பேணுதல், குடும்பப் புரிதல்','ஆவணப் பாதுகாப்பு, பழைய பொறுப்புகளை ஒழுங்குபடுத்துதல்','குடும்பத்தாருக்கு ஆலோசனை, ஆன்மிக வாசிப்பு, பயணத் திட்டம்','அனுபவத்தின் பயனைப் பகிர்தல், விருப்பமான சமூகச் செயல்','சேமிப்பு நிர்வாகம், நண்பர்கள், நிறைவேறிய இலக்குகள்','ஓய்வு, மருத்துவப் பராமரிப்புச் செலவுக்கான திட்டம், தனிநேரம்']};
const LENS_EN={
 infant:['physical development, sleep and bonding','care, nutrition and early sounds','hand coordination, play and close relationships','caregiving, the atmosphere at home and safety','learning by play, memory and recognising sounds','food, sleep, hygiene and appropriate movement','bonding with caregivers','adjusting gradually to unfamiliar settings','care and guidance from parents and elders','learning small habits with caregivers','family support and early friendships','sleep, safe rest and household care expenses'],
 primary:['confidence, play and school routine','family support, speech and early numeracy','writing, play skills and peer or sibling ties','a reliable study space and caregiver support','reading, mathematics, arts and curiosity','school activities, rest and food','friendships, fairness and teamwork','changes of class, safety and adaptation','teachers, parents and educational outings','completing tasks and recognition at school','clubs, friendships and attainable goals','study costs, screens and rest'],
 teen:['independent judgment, identity and physical routines','communication and family finance basics','exam preparation, writing and technical skills','study conditions and family conversations','subject choices, examination and creativity','competitive practice and balanced rest','friendships, boundaries and cooperation','handling syllabus changes and new responsibilities','mentors and preparation for further studies','training and choosing future work skills','team achievement and peer support','education costs, travel, attention and sleep'],
 youth:['choosing a direction with growing confidence','starting savings and contributing to family','training, technology, initiative and skill','residence and sharing family responsibilities','higher learning, creative projects and applying skills','career training, competition and daily discipline','close relationships, agreements and understanding','preparing for change and keeping documents safe','further study, travel and mentoring','demonstrating skills and starting a career path','first earnings, connections and realistic goals','study/work expenses, travel and rest'],
 adult:['decisions, habits, effort and dignity','household money, savings and the effect of speech','initiative, communication, siblings and skills','property, home, mother and family needs','knowledge applied in work and supporting children','workload, competition, debt and daily routine','partnerships and sharing duties','unexpected costs, sensitive information and planning','father, mentors, higher studies and longer travel','work, service, role and reputation','earning growth, networks and long-range plans','investment expenses, travel contacts and sleep'],
 senior:['stamina, dignity and chosen activities','managing accumulated resources and advising family','sharing experience, relationships and chosen learning','home comfort, family peace and maintenance','guiding younger people and sharing knowledge','body-care routines and chosen responsibilities','maintaining established relationships','reviewing records and reorganising responsibilities','advising family, spiritual reading and travel plans','sharing expertise and optional community work','managing savings and maintaining friendships','rest, planned care expenses and private time']};
// Each house has TWO chart-triggered event threads. No generic fate claims.
const DOMAINS_TA=[
 ['தனிப்பட்ட முடிவுகளை எவ்வளவு உறுதியுடன் எடுக்க முடிகிறது','உடல் சக்தியைச் செலவிடும் அளவுக்கும் ஓய்வுக்கும் எல்லை வைப்பது','தன்னம்பிக்கை வளர்ந்து பொறுப்பை ஏற்கும் திறன்','பிறர் எதிர்பார்ப்புக்காகத் தனிப்பட்ட நேரத்தை முழுதும் ஒதுக்க வேண்டிய அழுத்தம்'],
 ['குடும்பத்தில் பேச்சால் நம்பிக்கையை உருவாக்குவது','கிடைக்கும் வளத்தைச் சேமிப்புக்கும் தேவையான செலவுக்கும் பிரிப்பது','வரவு–செலவை ஒழுங்குபடுத்தி குடும்பத்திற்கு நிம்மதி தருவது','பேச்சில் அவசரம் அல்லது தேவையற்ற உறுதியால் மனக்கசப்பு, செலவு'],
 ['தொடர்ந்து முயன்று ஒரு திறனில் தேர்ச்சி பெறுவது','சகோதரர் அல்லது நண்பருடன் தகவலைப் பகிர்ந்து செயல்படுவது','முயற்சியால் புதிய வழியை உருவாக்குவது','அவசர முடிவால் பயிற்சியை பாதியில் நிறுத்துவது'],
 ['தாய் மற்றும் குடும்பத்தின் உண்மையான தேவைகளைக் கவனிப்பது','படிப்பு அல்லது வேலைக்குத் தகுந்த வீட்டு இடத்தை அமைப்பது','குடும்ப அமைதியுடன் வசிப்பிடத்தை மேம்படுத்துவது','வீட்டு முடிவுகள் அல்லது பராமரிப்புச் செலவால் அமைதி குறைவது'],
 ['புதிய அறிவைப் புரிந்து பயன்பாட்டிற்குக் கொண்டுவருவது','வயதிற்கேற்ப படிப்பு, கலை அல்லது பிள்ளைகளின் வளர்ச்சியில் பங்கேற்பது','கற்றதை மற்றவர்க்கும் பயன்படும் திறனாக மாற்றுவது','அளவுக்கு மீறிய எதிர்பார்ப்பு கற்றலிலும் குடும்பத் திட்டத்திலும் அழுத்தம் தருவது'],
 ['போட்டி அல்லது சிக்கலான பணியை முறையாகச் சமாளிப்பது','உணவு, உறக்கம் மற்றும் உடல் இயக்கத்தின் தினசரி வரிசையைப் பேணுவது','அனுபவம் சேரும்போது கடினமான பொறுப்பையும் நிறைவேற்றுவது','அதிக வேலைச்சுமை அல்லது திடீர் செலவால் உடல் ஒழுங்கு பாதிப்பது'],
 ['இருவரும் தங்களுடைய எதிர்பார்ப்பைப் பகிர்ந்து பேசுவது','நண்பர்கள் அல்லது துணையுடன் ஒப்பந்தம், பொறுப்பு பகிர்வு செய்வது','தெளிவான உரையாடலால் நீடித்த ஒத்துழைப்பு உருவாவது','புரிதல் இல்லாத வாக்குறுதி காரணமாக உறவில் இடைவெளி ஏற்படுவது'],
 ['மறைந்திருக்கும் குறைகள் மற்றும் ஆவணங்களைச் சோதிப்பது','மாற்றம் வந்தாலும் பாதுகாப்பான திட்டத்தைத் தக்கவைப்பது','பழைய சிக்கலை ஆராய்ந்து பயனுள்ள மாற்றம் செய்வது','தயாரிப்பில்லாத மாற்றத்தால் கூடுதல் செலவு அல்லது குழப்பம்'],
 ['தந்தை அல்லது வழிகாட்டியின் அறிவை நடைமுறையில் பயன்படுத்துவது','உயர்கல்வி, நூலறிவு அல்லது பயணத்தில் புதிய விளக்கம் பெறுவது','சொந்த முயற்சியுடன் நல்ல ஆலோசனையை இணைப்பது','ஒரு கருத்தைப் பிடித்துக்கொண்டு மாற்றுக் கருத்தைப் புறக்கணிப்பது'],
 ['செய்த வேலையின் தரத்தால் நம்பிக்கையை வளர்ப்பது','புதிய திறன் அல்லது நிர்வாக முறையைப் பணியில் பயன்படுத்துவது','சிக்கலைச் சரிசெய்த அனுபவத்தால் பொறுப்பு அல்லது அங்கீகாரம் வளர்வது','எல்லா வேலைகளையும் தனியே ஏற்று முடிக்க முயல்வதால் தாமதம் ஏற்படுவது'],
 ['தொடர்ச்சியான வருமான வழியையும் நம்பகமான தொடர்பையும் உருவாக்குவது','நண்பர்கள் அல்லது குழுக்களிடம் இருந்து பயன்படும் ஆதரவை அறிதல்','கற்ற திறனைப் பயன்படுத்தி மெதுவாக ஆதாயம் பெருகுவது','வராத வருமானத்தை முன்கூட்டியே செலவிடும் சிரமம்'],
 ['உறக்கத்தையும் தனிப்பட்ட ஓய்வையும் பாதுகாப்பது','வீடு, கல்வி அல்லது பயணச் செலவின் பயனைப் பரிசோதிப்பது','தேவையான செலவைச் செய்து தேவையற்ற சுமையைக் குறைப்பது','ஓய்வு நேரத்தைத் தியாகம் செய்து செலவு–சோர்வு சுழற்சியில் சிக்குவது']
];
const DOMAINS_EN=[
 ['making independent decisions','setting boundaries around exertion and rest','growing confidence through accepted responsibilities','taking on others’ expectations until personal time disappears'],
 ['building family trust through speech','allocating resources between saving and necessary spending','building orderly family finances','hasty promises and unnecessary financial pressure'],
 ['mastering a skill through practice','communicating with siblings or peers','creating a path through initiative','abandoning practice because of haste'],
 ['recognising the family’s real needs','making a home environment suitable for work or study','improving home comfort and peaceful routines','unplanned home costs or decisions disturbing peace'],
 ['turning new learning into practical ability','participating in study, art or children’s growth as age permits','making knowledge useful to others','excessive expectations putting pressure on learning or family plans'],
 ['working through competition and difficult tasks','maintaining eating, rest and activity routines','handling hard responsibilities through experience','workload and incidental costs disrupting routines'],
 ['discussing expectations clearly','sharing agreements and duties in close relationships','creating reliable cooperation through clarity','unspoken expectations or casual promises causing distance'],
 ['checking hidden faults and records','preserving a contingency plan during change','improving an old problem through careful inquiry','changing arrangements without preparation'],
 ['applying a mentor’s or parent’s advice','learning through higher studies or travel','joining personal effort with sound guidance','overlooking useful alternatives from fixed opinions'],
 ['earning trust through quality of work','applying a new method or skill to duty','gaining responsibility through problem solving','delays from carrying every task alone'],
 ['developing reliable sources of gain','recognising practical support from networks','gains gradually following useful work','spending income before it arrives'],
 ['protecting sleep and private time','checking the purpose of study, home or travel costs','making necessary spending useful','losing rest while expenses and strain rise']
];
const MINOR_DOMAINS_TA={
2:['வீட்டில் பேசும் மொழியை கற்றுக்கொள்வது','குடும்பம் வழங்கும் உணவு, புத்தகம் மற்றும் கல்வி உதவியைப் பயன்படுத்துவது','பேச்சு மற்றும் எண்ணறிவு வளர்ச்சியில் நம்பிக்கை பெறுவது','அவசரப் பேச்சு அல்லது குடும்பச் சூழல் காரணமாகக் கவனம் சிதறுவது'],
5:['பாடங்களைப் புரிந்து விளையாட்டு/பயிற்சியால் கற்றுக்கொள்வது','கணிதம், நினைவாற்றல், கலை மற்றும் படைப்புப் பயிற்சியைச் செய்வது','ஆர்வத்திற்கேற்ற கல்வித் திறன் வளர்வது','அதிகப் பாடச்சுமை மற்றும் ஒப்பீடுகளால் ஆர்வம் குறைவது'],
6:['விளையாட்டு, தேர்வுப் போட்டி அல்லது அன்றாட ஒழுங்கில் முயல்வது','உணவு, தூக்கம் மற்றும் பயிற்சி நேரத்தைப் பேணுவது','கடினமான பாடத்தையும் பயிற்சியால் கையாள்வது','அளவுக்கு மீறிய பயிற்சியால் ஓய்வு குறைவது'],
7:['நண்பர்கள், சக மாணவர்கள் மற்றும் பராமரிப்பாளர்களுடன் பழகுவது','குழுவில் விளையாடுதல், பகிர்தல், கருத்து வேறுபாட்டைப் பேசுவது','நியாயமான உரையாடலால் நல்ல நட்பு வளர்வது','சொல்லாத எதிர்பார்ப்பால் சிறு மனக்கசப்பு உருவாவது'],
8:['பள்ளி, வகுப்பு அல்லது வீட்டுச் சூழலில் வரும் மாற்றத்துடன் பழகுவது','புதிய இடத்திலும் பாதுகாப்புப் பழக்கத்தைப் பேணுவது','மாற்றத்தைப் பழகிய பின் தன்னம்பிக்கை வளர்வது','அறிமுகமற்ற மாற்றம் குறித்து தேவையற்ற அச்சம் உருவாவது'],
10:['பள்ளியில் தரப்படும் சிறிய பொறுப்பைச் செய்வது','நேரத்துக்குள் பாடப் பணி முடித்தல், திறனைப் பயிற்சி செய்வது','ஆசிரியரின் பாராட்டும் பொறுப்புணர்வும் வளர்வது','அனைத்தையும் சிறப்பாகச் செய்ய நினைப்பதால் பள்ளிப் பணி தாமதமாவது'],
11:['நண்பர் வட்டம் மற்றும் குழுச் செயல்பாடுகளில் சேர்வது','குடும்ப ஆதரவுடன் சிறிய படிப்பு இலக்கை நிர்ணயிப்பது','பயிற்சி, போட்டி மற்றும் விளையாட்டில் குழுவின் ஆதரவு கிடைப்பது','மற்ற குழந்தைகளுடன் ஒப்பிடுவதால் ஊக்கம் குறைவது'],
12:['வயதுக்கேற்ற உறக்க நேரத்தையும் அமைதியையும் பாதுகாப்பது','குடும்பம் வழங்கும் கற்றல் சாதனங்களை முறையாகப் பயன்படுத்துவது','தொடர்ச்சியான ஓய்வால் படிப்பிலும் விளையாட்டிலும் கவனம் வளர்வது','திரை நேரம் மற்றும் தூக்கமின்மையால் சோர்வு ஏற்படுவது']};
const MINOR_DOMAINS_EN={
2:['learning speech and family habits','using family-provided food, books and educational care','growing confidence in language and numbers','distraction through rushed speech or unsettled routines'],
5:['learning through lessons, play and practice','practising mathematics, memory, arts and creativity','developing a chosen learning skill','losing interest under heavy lessons or comparison'],
6:['engaging in play, school competition or routine','maintaining meals, rest and activity','working through a difficult lesson by practice','tiring oneself with excess practice'],
7:['bonding with peers and caregivers','sharing, playing together and talking through differences','building dependable friendships','small conflicts from unspoken expectations'],
8:['adjusting to changes in school, class or home','preserving safe habits in new surroundings','gaining confidence after gradual adaptation','unnecessary worry about unfamiliar changes'],
10:['taking on small school responsibilities','completing assignments and practising a skill','earning teacher recognition and responsibility','delaying tasks by demanding perfect work'],
11:['joining peer groups and activities','setting manageable study goals with family support','receiving group encouragement in sport or study','losing motivation through comparison'],
12:['protecting age-appropriate sleep and quiet time','using family-provided learning tools carefully','improving focus through adequate rest','fatigue from excessive screens and poor sleep']};
const PATH_TA=['தனது உடல்நலம் மற்றும் மன உறுதி','குடும்பத்தில் பேச்சு, பணப் பாதுகாப்பு','புதிய திறனைப் பயிலும் முயற்சி','வீடு, தாய் மற்றும் அமைதியான சூழல்','அறிவு, படிப்பு அல்லது பிள்ளைகளின் கல்வி','போட்டி, அன்றாட வேலை மற்றும் உணவுப் பழக்கம்','உறவுப் புரிதலும் கூட்டுத் திட்டமும்','ஆவணப் பாதுகாப்பு மற்றும் திடீர் மாற்றம்','தந்தை–ஆசிரியர் வழிகாட்டுதல் அல்லது பயணம்','பணி, பொறுப்பு மற்றும் பொதுநம்பிக்கை','நண்பர்கள், வருமான வாய்ப்பு மற்றும் இலக்குகள்','வெளியிடச் செலவு, உறக்கம் மற்றும் தனிநேரம்'];
const PATH_EN=['self-confidence and physical wellbeing','family communication and resources','skills and initiative','home, mother and domestic calm','learning and educational responsibilities','competition, daily service and routines','partnership and shared plans','records, security and change','mentors, principles or travel','duty, work and reputation','networks, gains and long-range aims','spending, sleep and private time'];
const PLANET_TA={Sun:['நிர்வாகப் பொறுப்பை ஏற்கும் எண்ணம்','மரியாதை மற்றும் தலைமைக்கான விருப்பம்','அதிகார விவகாரங்களில் பிடிவாதம்'],Moon:['குடும்பத்தினரைக் கவனிக்கும் மனம்','மாறும் உணர்ச்சியைப் புரிந்து ஒத்துழைப்பது','சிந்தனை மற்றும் உறக்கத்தில் ஏற்றத்தாழ்வு'],Mars:['வேகமான முயற்சியும் தொழில்நுட்பச் செயலும்','போட்டியை எதிர்கொள்ளும் துணிவு','அவசரப் பேச்சும் அதிக உழைப்பும்'],Mercury:['கணக்கு, எழுத்து மற்றும் செய்தி பரிமாற்றம்','புதிய விவரத்தை ஆராய்ந்து விளக்குவது','மீண்டும் மீண்டும் எண்ணிப் பணியைத் தள்ளுவது'],Jupiter:['ஆலோசனை, கற்றல் மற்றும் அறநெறி','அறிவைப் பிறருக்குப் பயன்படச் செய்வது','பொறுப்பின் அளவை அதிகமாக மதிப்பிடுவது'],Venus:['கலைநயம், உறவு மற்றும் வசதி','நல்ல ஒத்துழைப்பால் படைப்பாற்றல்','வசதிக்காக அதிகச் செலவு செய்வது'],Saturn:['ஒழுக்கம், உழைப்பு மற்றும் நீடித்த முயற்சி','பொறுமையால் ஒரு முறையை நிலைநாட்டுவது','தாமதம், கூடுதல் பொறுப்பு, கடினத்தன்மை'],Rahu:['புதிய தொழில்நுட்பம், அந்நியத் தொடர்பு','வழக்கத்திற்கு மாறான முயற்சியைச் சோதிப்பது','விரைவான வெற்றியை எதிர்பார்த்து ஆபத்தை ஏற்குவது'],Ketu:['தனிமையில் ஆழமான ஆராய்ச்சி','பயனற்ற பழக்கத்தை விலக்கி முதன்மையைத் தேர்வது','பற்றின்மை காரணமாக ஒத்துழைப்பைக் குறைப்பது']};
const PLANET_EN={Sun:['administration and authority','recognition and leadership','rigidity in authority matters'],Moon:['care for family','responsive emotional cooperation','fluctuating rest and mood'],Mars:['energetic technical effort','courage under competition','haste and overwork'],Mercury:['numbers, writing and communications','analysing and explaining new information','delaying action through overthinking'],Jupiter:['study, counsel and principled judgment','putting knowledge at others’ service','overestimating available capacity'],Venus:['art, relationships and comfort','creativity through collaboration','overspending on comforts'],Saturn:['discipline and prolonged effort','building stable methods patiently','delays and heavy obligations'],Rahu:['new technology and unusual contacts','testing unconventional work','chasing results too quickly'],Ketu:['solitary deep research','setting aside distracting habits','withdrawal that reduces cooperation']};
const BODY_TA=['உடலின் பொது சக்தி, தலை','வாய், பற்கள் மற்றும் உணவு','தோள், கைகள் மற்றும் இயக்கம்','மார்பு, சுவாச வசதி','மேல்வயிறு மற்றும் செரிமான பழக்கம்','குடல் பகுதி மற்றும் தினசரி உணவு','இடுப்பு மற்றும் கீழ்வயிறு','கீழ்வயிறு மற்றும் வெளியேற்ற உறுப்புகள்','தொடை மற்றும் நடை இயக்கம்','முழங்கால், பணியின்போதான இயக்கம்','கெண்டைக்கால் மற்றும் கால்தசைகள்','பாதங்கள் மற்றும் தூக்க ஒழுங்கு'];
const BODY_EN=['general stamina and head','mouth, teeth and food','arms, shoulders and movement','chest and breathing comfort','upper abdomen and digestion routines','intestinal area and eating routine','pelvic and lower-abdominal area','lower abdomen and eliminative organs','thighs and movement','knees and movement while working','lower legs and calves','feet and sleep patterns'];
const PI={infant:0,primary:1,teen:2,youth:3,adult:4,senior:5};
const enc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const iso=s=>/^\d{4}-\d\d-\d\d$/.test(String(s||''));
function age(b,d){if(!iso(b)||!iso(d))return null;const x=new Date(b+'T00:00:00Z'),y=new Date(d+'T00:00:00Z');if(!Number.isFinite(+x)||!Number.isFinite(+y))return null;let a=y.getUTCFullYear()-x.getUTCFullYear();if(y.getUTCMonth()<x.getUTCMonth()||(y.getUTCMonth()===x.getUTCMonth()&&y.getUTCDate()<x.getUTCDate()))a--;return Math.max(0,a);}
const phase=a=>a===null?'adult':a<5?'infant':a<13?'primary':a<18?'teen':a<25?'youth':a<60?'adult':'senior';
function lived(n,a,ta){return (ta?LENS_TA:LENS_EN)[phase(a)][n-1];}
const domain=(n,ta,a=null)=>(a!==null&&a<18&&((ta?MINOR_DOMAINS_TA:MINOR_DOMAINS_EN)[n])?(ta?MINOR_DOMAINS_TA:MINOR_DOMAINS_EN)[n]:(ta?DOMAINS_TA:DOMAINS_EN)[n-1]);
const path=(n,ta)=>(ta?PATH_TA:PATH_EN)[n-1];
function own(d,k){return d.houses.filter(h=>h.lord===k).map(h=>h.no);}
function fact(d,s,k){const p=d.planets[k];return p?{key:k,house:p.house,own:own(d,k),strength:s.assess(d,k)}:null;}
// V339: preserve distinct qualitative sign dignity, combustion, Paksha and retrograde.
const v339MoonText=(d,s,ta)=>{const ph=s.phase(d);if(!ph)return '';
 const weak=!ph.brightFifthWindow,pct=Math.round(ph.light*100),dir=ph.waxing;
 return ta?`பிறப்புச் சந்திரன் ${dir?'வளர்பிறை':'தேய்பிறை'} நிலையில் ${pct}% ஒளியுடன் உள்ளது. ${weak?'கிருஷ்ண பஞ்சமி முதல் சுக்ல பஞ்சமி வரையான குறைந்த ஒளிப்பலக் காலநிலையுடன் தொடர்புடையது':'சுக்ல பஞ்சமி முதல் கிருஷ்ண பஞ்சமி வரையான உதவும் ஒளிப்பலக் காலநிலையுடன் தொடர்புடையது'}. இது சந்திரனின் ராசி நிலை, சேர்க்கை, பார்வை, பாவாதிபத்தியத்தை நீக்கிவிடாது.`:
 `Natal Moon is ${dir?'waxing':'waning'} with approximately ${pct}% illumination, within the ${weak?'low-light Krishna Panchami-to-Shukla Panchami':'stronger-light Shukla Panchami-to-Krishna Panchami'} interval. Its sign, lordship, aspects and conjunctions remain separate evidence.`;
};
const V339_VARGA_BRIDGES={
 1:[['marriage','identity within partnership'],['profession','identity expressed through vocation']],
 2:[['marriage','shared speech and family savings'],['profession','income stability from work']],
 3:[['profession','skills, correspondence and enterprise']],
 4:[['marriage','household cooperation'],['children','home care and family education']],
 5:[['children','learning and children-related responsibility']],
 6:[['profession','service, competition and workload']],
 7:[['marriage','agreements and responsibilities']],
 8:[['marriage','joint obligations and trust']],
 9:[['children','education and mentors'],['profession','qualifications and career direction']],
 10:[['profession','work, service and recognition']],
 11:[['profession','income and professional networks'],['children','family objectives']],
 12:[['marriage','private time and expenditure'],['profession','work-related distance and rest']]
};
function v339HouseVargaEvidence(evidence,n,ta,young){
 if(!evidence)return [];
 const plans=(V339_VARGA_BRIDGES[n]||[]).filter(([kind])=>kind!=='marriage'||!young);
 const p=[];
 for(const [kind,sector] of plans){const f=evidence[kind],nat=f?.d1,division=f?.varga,pl=division?.lordPlacement;if(!nat||!pl)continue;
  const D=kind==='children'?7:kind==='marriage'?9:10,benefit=division.aspects?.benefic||[],difficulty=division.aspects?.difficult||[];
  const dignity=pl.dignity,strong=['own','exalted','moolatrikona'].includes(dignity),weak=dignity==='debilitated'||[6,8,12].includes(pl.house);
  const support=strong||benefit.length,contra=weak||difficulty.length;
  const topicTa={children:'கல்வி–புத்திரப் பொறுப்பு',marriage:'திருமண–குடும்ப ஒத்துழைப்பு',profession:'தொழில்–கடமை'}[kind];
  const tr=(x)=>({'Sun':'சூரியன்','Moon':'சந்திரன்','Mars':'செவ்வாய்','Mercury':'புதன்','Jupiter':'குரு','Venus':'சுக்கிரன்','Saturn':'சனி'}[x]||x);
  if(ta)p.push(`${n}-ஆம் பாவத்தின் வாழ்க்கைத் துறையை D1 மற்றும் D${D} ${topicTa} ஆதாரங்களுடன் ஒப்பிடும்போது, D${D} ${kind==='children'?5:kind==='marriage'?7:10}-ஆம் பாவாதிபதி ${tr(pl.planet)} ${pl.house}-ஆம் பாவத்தில் (${dignity==='debilitated'?'நீசம்':strong?'ஆட்சி/உச்ச/மூலத்திரிகோண ஆதரவு':'சாதாரண ராசிநிலை'}) இருக்கிறார். ${benefit.length?`${benefit.map(tr).join(', ')} சுபப் பார்வை உதவும்; `:''}${difficulty.length?`${difficulty.map(tr).join(', ')} கடினப் பார்வை எதிர் ஆதாரம்; `:''}${support&&contra?'உதவும் பலமும் தடை தரும் தொடர்பும் சேர்ந்ததால்':'இதன் தொடர்பு இருப்பதால்'} ${n}-ஆம் பாவ வாழ்க்கை முடிவுகளில் ${topicTa} நிலை ஒரு துணைக் காரணியாக வெளிப்படலாம். D${D} மட்டும் தனி நிகழ்வு/திருமணம்/சந்தானம்/வேலை உறுதி அளிக்காது.`);
  else p.push(`For natal house ${n}, D${D} adds ${sector} context: the divisional lord ${pl.planet} is in house ${pl.house} (${dignity}); ${benefit.length?`supporting aspects: ${benefit.join(', ')}; `:''}${difficulty.length?`challenging aspects: ${difficulty.join(', ')}; `:''}${support&&contra?'support and counter-evidence coexist.':support?'there is additional support.':contra?'pressure requires adjustment.':'this is secondary context.'} Divisional evidence alone does not predict a certain event.`);
 }
 return p;
}
const friendWord=(q,ta)=>ta?({own:'ஆட்சி',exalted:'உச்ச',friend:'நட்பு',enemy:'பகை',debilitated:'நீச',neutral:'சம'}[q]||'சம'):({own:'own sign',exalted:'exalted',friend:'friendly sign',enemy:'inimical sign',debilitated:'debilitated',neutral:'neutral'}[q]||'neutral');
function supports(s,d,n){const h=d.houses[n-1],l=s.assess(d,h.lord),s0=Math.max(0,Math.min(1,l?.score??0.5));let pro=s0*1.6,con=(1-s0)*1.2;
 const moon=s.phase(d);for(const k of h.occupants.concat(h.aspects)){const q=s.assess(d,k),mult=h.occupants.includes(k)?1:0.55;
  if(['Jupiter','Venus'].includes(k)){pro+=(q?.score||.5)*.6*mult;}else if(k==='Mercury'){pro+=(q?.score||.5)*.35*mult;}else if(k==='Moon'){pro+=(moon?.light??.3)*.55*mult;con+=(1-(moon?.light??.3))*.2*mult;}else if(['Rahu','Ketu','Saturn','Mars'].includes(k)){con+=((q?.score||.5)*.48+.15)*mult;}else if(k==='Sun'){pro+=(q?.score||.5)*.12*mult;con+=.2*mult;}}
 return {pro,con,major:pro>con+.5?'supportive':con>pro+.5?'challenging':'mixed'};}
function ascendantStory(d,s,n,a,ta){const h=d.houses[n-1],p=d.planets[h.lord],q=s.assess(d,h.lord),k=(n===5?'Jupiter':n===7?'Venus':n===2?'Jupiter':n===4?'Moon':n===10?'Sun':n===9?'Jupiter':null),kq=k?s.assess(d,k):null,bal=supports(s,d,n),[what,choice,gain,risk]=domain(n,ta,a),link=path(p.house,ta),beh=PLANET_TA[h.lord],ben=PLANET_EN[h.lord];
 let out=[];
 if(ta){out.push(`${bal.major==='supportive'?gain+' என்ற முன்னேற்றத்திற்கு இந்த ஜாதகத்தில் ஆதரவு உள்ளது':bal.major==='challenging'?risk+' காரணமாக பலனைப் பெற கூடுதல் முயற்சி தேவைப்படலாம்':gain+' என்ற வாய்ப்பும், '+risk+' என்ற சவாலும் இணைந்து வரலாம்'}. ${lived(n,a,true)} தொடர்பான பாவத்தின் அதிபதியான ${pl(h.lord,true)} ${p.house}-ஆம் பாவத்தில் இருப்பதால் ${what} என்ற அனுபவம், ${link} வழியாக வெளிப்படுவதற்கான தொடர்பு காணப்படுகிறது.`);
  const conjunctions=d.houses[p.house-1].occupants.filter(k=>k!==h.lord);const x=conjunctions.length?` ${pl(h.lord,true)} உடன் ${conjunctions.map(x=>pl(x,true)).join(', ')} இருப்பதால் ${conjunctions.map(x=>PLANET_TA[x][0]).join('; ')} போன்ற காரகத்துவங்களும் இந்த நிகழ்வுகளுடன் கலக்கின்றன.`:'';
  out.push(`${pl(h.lord,true)} ${friendWord(q?.dignity,true)} ராசி நிலையில் இருப்பதால், ${beh[0]} என்பதைப் பயன்படுத்தி ${choice} என்ற அணுகுமுறை உருவாகலாம்.${x} ${bal.major==='supportive'?`${gain} என்பதற்கான ஆதரவு கூடுதலாக உள்ளது.`:bal.major==='challenging'?`${risk} என்பதைத் தவிர்க்கத் திட்டமிடுதலும் பெரியோரின் அல்லது நம்பகமானோரின் உதவியும் தேவையாகலாம்.`:`${gain} மற்றும் ${risk} இரண்டும் வெவ்வேறு சூழல்களில் வெளிப்படலாம்.`}`);
  if(k){const kp=d.planets[k];out.push(`${n}-ஆம் பாவம், அதன் அதிபதி ${pl(h.lord,true)} (${p.house}-ஆம் பாவம்), இதற்குரிய இயற்கைக் காரகன் ${pl(k,true)} (${kp.house}-ஆம் பாவம்) ஆகிய மூன்றையும் சேர்த்து வாசிக்கும்போது, ${path(kp.house,true)} மற்றும் ${what} ஒன்றுடன் ஒன்று தொடர்பு பெறுகின்றன. ${kq?.score>.6?`${gain} என்ற நல்ல வெளிப்பாட்டை ஊக்குவிக்கக்கூடிய துணைத் தொடர்பு உள்ளது.`:kq?.score<.36?`${choice} என்ற ஒழுங்கை வளர்த்த பின்னரே சில பலன்கள் நிலைக்கக்கூடும்.`:`${choice} என்ற நடைமுறை அணுகுமுறையே வளர்ச்சிக்கும் பாதுகாப்புக்கும் அடிப்படை.`}`);}
 }else{out.push(`At this age ${lived(n,a,false)} is the relevant expression of this life area. ${h.lord} rules this house and occupies natal house ${p.house}; accordingly, ${what} intersects ${link}. A constructive path is ${gain}, while ${risk} requires balance.`);
  const con=d.houses[p.house-1].occupants.filter(x=>x!==h.lord);out.push(`The ${friendWord(q?.dignity,false)} status of ${h.lord} colours the expression of ${ben[0]}; ${choice} becomes consequential.${con.length?` Its natal partners ${con.join(', ')} also contribute ${con.map(x=>PLANET_EN[x][0]).join(' and ')}.`:''} ${bal.major==='supportive'?'The chart contains relatively more supportive links for this theme.':bal.major==='challenging'?'Extra effort and dependable help are important where the theme meets obstacles.':'Opportunities and responsibilities may arise together.'}`);
  if(k){const kp=d.planets[k];out.push(`House ${n}, its ruler ${h.lord} (house ${p.house}) and natural significator ${k} (house ${kp.house}) must all be considered; the significator adds the life theme of ${path(kp.house,false)}. ${kq?.score>.6?`This adds support for ${gain}.`:kq?.score<.36?`Progress requires care around ${risk}.`:`Practical attention to ${choice} balances this interaction.`}`);}
 }
 return out;}
function specialEvents(d,s,n,a,ta){const h=d.houses[n-1],out=[],ks=h.occupants,q=supports(s,d,n),kid=a!==null&&a<18;
 const say=(t,e)=>out.push(ta?t:e);
 // Conjunction meaning is transferred to the topic only when actually in that house.
 for(const k of ks.filter(k=>!['Rahu','Ketu'].includes(k)).slice(0,3)){
  const co=d.houses[n-1].occupants.filter(x=>x!==k),p=PLANET_TA[k],e=PLANET_EN[k],owners=own(d,k),mode=q.major;
  if(ta)say(`${pl(k,true)} இப்பாவத்தில் இருப்பதால் ${p[0]} தொடர்பான இயல்பு ${domain(n,true,a)[0]} என்ற விஷயத்தில் வெளிப்படலாம். ${mode==='challenging'?`${p[2]} அதிகரித்தால் ${domain(n,true,a)[3]} என்ற சிக்கல் உருவாகலாம்.`:`${p[1]} மூலம் ${domain(n,true,a)[2]} என்ற வாய்ப்பு வளரலாம்.`}${co.length?` ${co.map(x=>pl(x,true)).join(', ')} உடன் இணைவதால் அவர்களின் ஆதிபத்தியப் பாவங்களின் பலன்களும் கலக்கின்றன.`:''}`,`With ${k} in this house, ${e[0]} may shape ${domain(n,false,a)[0]}; ${mode==='challenging'?`${e[2]} needs care.`:`${e[1]} can reinforce ${domain(n,false,a)[2]}.`}${co.length?` Its conjunction with ${co.join(', ')} brings their separate lordships into the picture.`:''}`);
  else say('',`With ${k} placed here, ${e[0]} shapes ${domain(n,false,a)[0]}. ${mode==='challenging'?`The difficulty is ${e[2]}.`:`A helpful outlet is ${e[1]}.`}${co.length?` ${co.join(', ')} shares the house and modifies the reading.`:''}`);
 }
 for(const k of ks.filter(k=>['Rahu','Ketu'].includes(k))){const nn=s.nodes(d,k),close=nn.conjunctions.filter(x=>Number.isFinite(x.degrees)&&x.degrees<=15).sort((a,b)=>a.degrees-b.degrees),sign=nn.signLord;
  const strength=close[0]?.degrees<=3?'3°':close[0]?.degrees<=8?'8°':close[0]?.degrees<=15?'15°':null;
  if(ta)out.push(`${pl(k,true)} இருப்பதால் ${PLANET_TA[k][0]} என்ற அனுபவம் இப்பாவத்தில் நுழைகிறது. ராசி அதிபதி ${pl(sign,true)} ${d.planets[sign].house}-ஆம் பாவத்தில் இருப்பதால் ${path(d.planets[sign].house,true)} அதன் பின்னணியாகிறது.${strength?` ${pl(close[0].b,true)} உடன் ${close[0].degrees.toFixed(1)}° (${strength} நெருக்கப் பிரிவு) இருப்பதால் இந்தச் சேர்க்கையின் தாக்கத்தைப் பலவீனமான தொடர்புக்கு இணையாக எடுத்துக்கொள்ளவில்லை.`:''} ${kid?`இந்த வயதில் இது ${lived(n,a,true)} என்ற குழந்தையின் சூழலில்தான் வாசிக்கப்படுகிறது.`:`${domain(n,true,a)[3]} என்ற பக்கத்தைப் பெரிதுபடுத்தாமல், ${domain(n,true,a)[1]} என்ற ஏற்பாடு முக்கியம்.`}`);
  else out.push(`${k} introduces ${PLANET_EN[k][0]} to this area. Its sign lord ${sign} occupies house ${d.planets[sign].house}, linking the matter with ${path(d.planets[sign].house,false)}.${strength?` A ${close[0].degrees.toFixed(1)}° contact with ${close[0].b} belongs to the ${strength} proximity band; it is not treated like a distant same-sign association.`:''} ${kid?`For a child this concerns ${lived(n,a,false)}, not adult responsibilities.`:`Care is needed around ${domain(n,false,a)[3]}.`}`);
 }
 if(h.aspects.includes('Saturn')){const ss=s.assess(d,'Saturn'),sat=d.planets.Saturn,karma=ss?.score>=.6,ctx=ta?`${lived(n,a,true)}`:lived(n,a,false);
  say(`சனி ${sat.house}-ஆம் பாவத்திலிருந்து இப்பாவத்தைப் பார்ப்பதால் ${ctx} தொடர்பில் ${karma?'படிப்படியான உழைப்பு, பொறுப்பு மற்றும் நிலைத்த பழக்கம்':'தடை, தாமதம், கடினமான பொறுப்பு'} முன்வரலாம். ஆனால் ${pl(h.lord,true)} என்ற பாவாதிபதிக்கும் ${n===5?'குரு என்ற புத்திர/அறிவுக் காரகனுக்கும்':n===7?'சுக்கிரன் என்ற உறவுக் காரகனுக்கும்':'மற்ற ஆதரவான கிரகங்களுக்கும்'} இருக்கும் பலத்தைப் பார்க்காமல் இந்தப் பாவம் முற்றிலும் பலனற்றது என முடிவு செய்யக்கூடாது.${sat.retrograde?' சனி வக்ரமாக இருப்பது தாக்கத்தின் தீவிரத்திற்கான தனிக் குறிப்பு; எல்லா பலன்களையும் உச்ச நன்மையாக மாற்றுவதல்ல.':''}`,`Saturn aspects this house from natal house ${sat.house}. It can express as ${karma?'gradual consolidation through discipline':'delay and demanding obligations'} concerning ${ctx}. It cannot by itself cancel this house’s favourable indications; the house ruler and natural significator still matter.${sat.retrograde?' Retrogression adds prominence, not universal exaltation.':''}`);
 }
 if(h.aspects.includes('Jupiter')&&!h.occupants.includes('Jupiter')){const q=s.assess(d,'Jupiter');say(`குரு ${d.planets.Jupiter.house}-ஆம் பாவத்திலிருந்து தரும் பார்வை காரணமாக ${domain(n,true,a)[0]} என்ற விஷயத்தில் அனுபவமுள்ளவரின் வழிகாட்டுதல் உதவியாகலாம். ${q?.score>=.6?`${domain(n,true,a)[2]} என்பதற்கான ஆதரவு உள்ளது.`:`ஆனால் குருவின் சொந்த நிலை மற்றும் எதிர் பார்வைகளை மதிப்பிட்ட பின்னரே அதன் பலத்தை அதிகமாகக் கொள்ள முடியும்.`}`,`Jupiter aspects this area from natal house ${d.planets.Jupiter.house}, potentially offering guidance when ${domain(n,false,a)[0]}; ${q?.score>=.6?`it can support ${domain(n,false,a)[2]}.`:`Jupiter's own natal strength limits how much weight is assigned to that support.`}`);}
 if(h.aspects.includes('Moon')&&!h.occupants.includes('Moon')){const p=s.phase(d),others=d.houses[d.planets.Moon.house-1].occupants;const withJ=others.includes('Jupiter');const light=p?.light,weakMoon=p?!p.brightFifthWindow:true;
  say(`சந்திரனின் ஏழாம் பார்வை இப்பாவத்தைத் தொடுகிறது. பிறப்புச் சந்திரனின் ஒளியளவு ${Number.isFinite(light)?(light*100).toFixed(0)+'%':'கிடைக்கவில்லை'}; ${weakMoon?'ஒளிப்பலம் குறைந்த நிலையில் இருப்பதால் உணர்ச்சிவசப்பட்ட முடிவுகளை மெதுவாக எடுப்பது':'ஒளிப்பலம் ஒப்பீட்டளவில் உதவுவதால் குடும்ப ஒத்துழைப்பை வளர்ப்பது'} ${domain(n,true,a)[1]} என்ற சூழலில் பொருத்தமானது.${withJ?' சந்திரனுடன் குரு இருப்பதால் அதன் ஆதரவையும் சேர்த்துப் பார்க்க வேண்டும்.':''}`,`Moon aspects this house. Its approximate birth illumination is ${Number.isFinite(light)?(light*100).toFixed(0)+'%':'unknown'}; ${weakMoon?'a dimmer Moon favours cautious responses':'brighter lunar strength may support emotional cooperation'} when ${domain(n,false,a)[1]}.${withJ?' Jupiter shares Moon’s natal house and also needs weighing.':''}`);}
 if(n===5||n===7||n===2){const matter=s.matter(d,n===5?'children':n===7?'marriage':'wealth');if(matter){let x=n===5?['புத்திரப் பாக்கியம் குறித்த முடிவுக்கு ஐந்தாம் பாவம், அதன் அதிபதி, குரு ஆகிய மூன்றும் தேவையானவை. குழந்தை பிறக்காது அல்லது ஆண்/பெண் குழந்தை உறுதி என இந்தக் கிரகத் தொடர்பை வைத்து தீர்ப்பளிப்பதில்லை.','For matters of children, house five, its ruler and Jupiter must all be weighed; a single Saturn aspect cannot deny children or determine a child’s sex.']:n===7?['திருமண உறவைக் கணிக்க ஏழாம் வீடு, ஏழாம் அதிபதி, சுக்கிரன் ஆகியோரின் ஒருங்கிணைந்த நிலை தேவை. தனிக் கிரகத் தொடர்பு கொண்டு திருமண முறிவு என்ற தீர்ப்பு இல்லை.','Marriage themes require the seventh house, seventh ruler and Venus together; a single adverse contact is not a verdict of separation.']:['குடும்பச் செல்வத்தை ஆராய இரண்டாம் பாவம், இரண்டாம் அதிபதி, குரு ஆகியவற்றுடன் பதினொன்றாம் வரவு மற்றும் பன்னிரண்டாம் செலவையும் கவனிக்க வேண்டும்.','For family wealth, house two, its ruler and Jupiter require context from gains and expenditures.'];
 if(!kid){
  const lh=d.planets[matter.houseLord]?.house,kh=d.planets[matter.karaka]?.house;
  const theme=n===5?['குழந்தைகள், வழிகாட்டல் மற்றும் கற்றல்','children, mentoring and learning']:n===7?['திருமணப் பொறுப்பும் பரஸ்பர உடன்பாடும்','marital responsibility and shared decisions']:['குடும்பச் சேமிப்பு, பேச்சு மற்றும் செலவுத் திட்டம்','family finances, speech and spending'];
  const outlook=matter.score>=.65?[`இரண்டு ஆதாரங்களிலும் ஒப்பீட்டளவில் உதவி கிடைப்பதால் நிலையான முயற்சிக்கு இடமுள்ளது`,`the two indicators provide comparatively helpful support`]:matter.score<=.36?[`இரண்டு ஆதாரங்களையும் கருத்தில் கொண்டு முடிவுகளைப் படிப்படியாக எடுப்பது நல்லது`,`the available factors point to a need for gradual decisions`]:[`உதவும் தொடர்பும் சிரமமும் கலந்து வருவதால் ஒரே கிரகத்தை வைத்து இறுதி முடிவு கூற முடியாது`,`support and strain need to be weighed together rather than inferring a single outcome`];
  say(`${theme[0]} தொடர்பான ஜாதக ஆதாரமாக ${n}-ஆம் பாவாதிபதி ${pl(matter.houseLord,true)} ${lh}-ஆம் பாவத்திலும் காரகன் ${pl(matter.karaka,true)} ${kh}-ஆம் பாவத்திலும் உள்ளனர். ${outlook[0]}.`,
   `For ${theme[1]}, the ${n===2?'2nd':n+'th'} house lord ${matter.houseLord} occupies house ${lh}, while its natural significator ${matter.karaka} occupies house ${kh}; ${outlook[1]}.`);
 }}
 }
 if(n===5&&d.houses[4].lord===d.houses[5].lord){/* not an exchange; leave alone */}
 // 5-6 exchange: check computed lords, NEVER copied Pisces example.
 if([5,6].includes(n)){const h5=d.houses[4],h6=d.houses[5];if(d.planets[h5.lord].house===6&&d.planets[h6.lord].house===5){say(n===5?`${pl(h5.lord,true)}–${pl(h6.lord,true)} 5–6 பரிவர்த்தனையால் கல்வியை அன்றாடச் சேவையோடு இணைக்கும் வாய்ப்பு உள்ளது. கடினமான பாடத்திலோ ஆராய்ச்சியிலோ எழும் குறையைச் சரிசெய்வதன் மூலம் அறிவு வளரும்; அதற்காகத் தன்னிடமோ குழந்தையிடமோ அளவுக்கு மீறிய எதிர்பார்ப்பை வைக்க வேண்டாம்.`:`${pl(h5.lord,true)}–${pl(h6.lord,true)} பரிவர்த்தனையால் போட்டி, வேலை ஒழுங்கு ஆகியவை கல்வி மற்றும் திட்டமிடும் திறனோடு இணைகின்றன. வேலைக்காகக் கற்றுக்கொள்ளும் புதிய முறை சிக்கலைத் தீர்க்க உதவலாம்; இடைவிடாத வேலைப்பளு கற்றலின் ஆர்வத்தைப் பாதிக்காமல் கவனிக்க வேண்டும்.`,n===5?'The fifth and sixth rulers exchange natal houses, connecting learning with practical service. Errors encountered in study or research may lead to better skill; avoid excessive expectations.':'The fifth-sixth exchange connects competition and routines with learning and planning. New work methods can solve problems, but relentless tasks should not displace the joy of learning.');}}
 return out.slice(0,7);}
function strengthInteractions(d,s,n,a,ta){
 const h=d.houses[n-1],out=[],child=a!==null&&a<18;
 // Interpret natural benefic/malefic links separately from event star chains.
 const rahu=d.planets.Rahu,ketu=d.planets.Ketu,j=d.planets.Jupiter;
 for(const node of ['Rahu','Ketu']){
  const nodeP=d.planets[node];if(nodeP.house!==n)continue;
  for(const other of h.occupants.filter(k=>k!==node&&k!=='Rahu'&&k!=='Ketu')){
   const c=s.conjunction(d,node,other);if(!Number.isFinite(c.degrees))continue;
   const q=s.assess(d,other),dist=c.degrees,degree=dist<=3?'3°':dist<=8?'8°':dist<=15?'15°':'15°-க்கு மேல்';
   const tight=dist<=3,medium=dist<=8,weak=dist>15;
   const good=(q?.score||0)>0.62;
   if(node==='Rahu'&&other==='Jupiter'){
    if(ta)out.push(`ராகுவும் குருவும் ${dist.toFixed(1)}° இடைவெளியில் உள்ளனர் (${degree} அளவு). ${weak?'பாகை நெருக்கம் குறைவதால் ஒரே ராசியில் இருப்பதற்காகக் குருவின் கல்வி, செல்வம், புத்திர காரகத்துவம் அனைத்தும் பாதிக்கப்பட்டதாகக் கொள்ளக்கூடாது.':tight?'மிக நெருக்கமான தொடர்பு என்பதால் வழிகாட்டல், செல்வத் திட்டம், குழந்தை/கல்வி தொடர்பான எதிர்பார்ப்புகளில் வேகமும் மாற்றமும் அதிகரிக்கலாம்.':'தொடர்பு உள்ளது; ஆனால் மிக நெருக்கமான கிரகணச் சேர்க்கையுடன் சமமாக மதிப்பிட முடியாது.'} ${good?'குருவின் சொந்த சுபபலமும் மற்ற கிரக ஆதரவும் இருப்பதால் புதிய தொழில்நுட்ப/அறிவு வாய்ப்புகளை ஒழுங்குடன் பயன்படுத்தும் திறனும் அமையலாம்.':'குருவின் பலம் குறைந்தால் பெரிய வாக்குறுதி, செலவு அல்லது வழிகாட்டல் தேர்வுகளில் கூடுதல் சோதனை தேவைப்படலாம்.'} இதிலிருந்து குழந்தையின் பாலினமோ புத்திரம் முற்றிலும் இல்லை என்ற தீர்ப்போ வராது.`);
    else out.push(`Jupiter and Rahu are ${dist.toFixed(1)}° apart (${weak?'beyond 15°':tight?'within 3°':medium?'within 8°':'within 15°'}). ${weak?'Being in one sign does not annul Jupiter’s education, wealth or children themes.':tight?'The close contact may intensify ambitions and uncertainty in guidance, education or family expectations.':'The contact is meaningful but not equivalent to an exact conjunction.'} ${good?'Jupiter’s remaining support can channel this into carefully assessed learning opportunities.':'Weak natal support calls for scrutiny of ambitious promises.'}`);
   }else if(ta){out.push(`${pl(node,true)}–${pl(other,true)} ${dist.toFixed(1)}° இடைவெளியில் உள்ளனர். ${weak?'பெரிய பாகை விலகலால் இருவரின் காரகத்துவங்களும் ஒன்றையொன்று முழுமையாக மறைக்காது.':node==='Ketu'?`${tight?'மிக நெருக்கமாக':'தொடர்புடன்'} இருக்கும் கேது, ${PLANET_TA[other][1]} என்பதில் தேவையற்றதை விலக்கி நுண்ணிய முயற்சிக்கு இடமளிக்கும் தொடர்பாக மதிப்பிடப்படுகிறது.`:`ராகுவின் ${tight?'மிக அதிக':'குறிப்பிடத்தக்க'} நெருக்கம் ${PLANET_TA[other][0]} சார்ந்த செயல்களில் அதீத ஆசை அல்லது எதிர்பாராத மாற்றத்தைத் தூண்டலாம்.`} ${good?'சம்பந்தப்பட்ட கிரகத்தின் சொந்த சுபத்துவம் இந்தத் தாக்கத்தை மாற்றக்கூடும்.':'அதன் பலவீனம் இருந்தால் அவசர முடிவைத் தவிர்ப்பது பொருத்தமாகும்.'}`);
   }else out.push(`${node} and ${other} have ${dist.toFixed(1)}° natal separation. ${weak?'This is a loose same-sign contact, not a total cancellation of the other planet.':node==='Ketu'?`Ketu may narrow attention toward ${PLANET_EN[other][1]}.`:`Rahu may intensify ambition around ${PLANET_EN[other][0]}.`} ${good?'The other planet’s supportive condition modifies the outcome.':'A weak associated planet calls for caution.'}`);
  }
 }
 if(h.occupants.includes('Moon')&&h.occupants.includes('Jupiter')){const c=s.conjunction(d,'Moon','Jupiter'),ph=s.phase(d);if(Number.isFinite(c.degrees)){
  if(ta)out.push(`சந்திரன்–குரு ${c.degrees.toFixed(1)}° இடைவெளியில் இணைகிறார்கள். சந்திரனின் ஒளியளவு ${ph?(ph.light*100).toFixed(0)+'%':'கணிக்கப்படவில்லை'}; ${ph?.light<.45?'சந்திரன் ஒளிப்பலம் குறைந்திருந்தாலும் குருவின் அறிவு, ஆலோசனை, புத்திர/செல்வ காரகத்துவம் தனியாகத் துணைபுரியலாம்.':'சந்திர ஒளிப் பலம் வலுப்பெறுவது குருவின் வழிகாட்டும் தொடர்பைச் சிறப்பிக்கலாம்.'} ${child?'இந்த வயதில் இதை குழந்தையின் சொந்தக் கற்றல் மற்றும் பராமரிப்பிற்கான பெற்றோர் முயற்சியாகப் பார்க்க வேண்டும்.':'கற்ற அறிவை அன்றாடச் சேவையில் பயன்படுத்துதல், குடும்பத் திட்டங்களுக்கு நிதானமான வழிகாட்டுதல் ஆகிய நிகழ்வுகளை ஆராயலாம்.'}`);
  else out.push(`Moon and Jupiter are ${c.degrees.toFixed(1)}° apart; Moon has approximately ${ph?(ph.light*100).toFixed(0)+'%':'unknown'} illumination. ${ph?.light<.45?'Diminished lunar light is weighed alongside Jupiter’s support rather than cancelling it.':'Relatively brighter lunar light may reinforce cooperation and guidance.'} ${child?'At this age interpret the link through care and schooling.':'Learning used in practical service and family decisions is the age-relevant theme.'}`);
 }}
 for(const k of h.occupants.filter(x=>!['Sun','Rahu','Ketu'].includes(x))){const c=s.combust(d,k);if(!Number.isFinite(c.orb)||c.orb>18)continue;
  if(ta)out.push(`${pl(k,true)} சூரியனிலிருந்து ${c.orb.toFixed(1)}° தூரத்தில் உள்ளார். ${c.combust?'அஸ்தங்க வரம்பிற்குள் இருப்பதால் அந்தக் கிரகத்தின் உறவு, கற்றல் அல்லது பணிச் செயல்பாடுகளில் அழுத்தம் தோன்றலாம்.':'அஸ்தங்க வரம்புக்கு வெளியே இருப்பதால் அதன் காரகத்துவங்கள் முழுதும் குறைந்துவிட்டதாகக் கூற இயலாது.'}${c.combust&&c.relief.length?' வர்க்கோத்தமம், திக்பலம் போன்ற தணிக்கும் குறியீடுகள் கிடைத்ததால் அந்தப் பாதிப்பை முழுமையான பலனின்மையாகக் கொள்ளவில்லை.':''} சம்பந்தப்பட்ட கிரகத்தின் ஆதிபத்தியம், பிற சுபப்பார்வை ஆகியவை இறுதி விளக்கத்தை மாற்றும்.`);
  else out.push(`${k} is ${c.orb.toFixed(1)}° from the Sun. ${c.combust?'The configured combustion orb may add pressure to this planet’s own and ruled matters.':'This is outside the configured combustion orb; its significations are not erased.'}${c.combust&&c.relief.length?' Mitigating varga or directional indications are also present.':''}`);
 }
 const eclipse=s.eclipse(d).filter(x=>(x.kind.startsWith('solar')?h.occupants.includes('Sun'):h.occupants.includes('Moon')));
 if(eclipse.length){if(ta)out.push(`ராகு–கேது அச்சுடன் சூரிய/சந்திர இணைப்பில் கிரகணம் சார்ந்த நெருக்க அமைப்பு பதிவாகியுள்ளது. கிரகணம் ஏற்பட்டது என்று வானியல் உறுதி செய்யாமல், இந்தப் பிறப்பு இணைப்பின் பாகைத் தொடர்பை மட்டும் சம்பந்தப்பட்ட காரகத்துவங்களின் கூடுதல் வலிமைச் சோதனையாகக் கணக்கிடுகிறோம்.`);else out.push('A Sun/Moon–node proximity pattern has been identified. It is treated as additional traditional strength evidence, not as proof that an astronomical eclipse occurred.');}
 return out.slice(0,4);
}
function bodyText(d,s,n,a,ta){
 const h=d.houses[n-1],bal=supports(s,d,n),young=a!==null&&a<18,body=ta?BODY_TA[n-1]:BODY_EN[n-1];
 const lord=d.planets[h.lord],aspect=h.aspects||[],co=h.occupants||[];
 const evidence=ta?
  `${pl(h.lord,true)} ${lord.house}-ஆம் பாவத்தில் இருப்பதால் ${path(lord.house,true)} சார்ந்த வாழ்க்கை வழக்கமும் இந்தப் பாவத்தின் உடல் ஒழுங்குடன் இணைந்து பார்க்கப்படுகிறது.${co.length?` ${co.map(k=>pl(k,true)).join(', ')} இப்பாவத்தில் இருப்பதும் தனிக் காரணம்.`:''}${aspect.length?` ${aspect.map(k=>pl(k,true)).join(', ')} பார்வை ஆதாரமும் கணக்கில் உள்ளது.`:''}`:
  `${h.lord} rules this house and occupies house ${lord.house}; routines tied to ${path(lord.house,false)} are part of this bodily interpretation.${co.length?` Natal occupants ${co.join(', ')} add independent context.`:''}${aspect.length?` Whole-sign aspects from ${aspect.join(', ')} must also be weighed.`:''}`;
 const practice=bal.major==='challenging'?(ta?`${young?'வயதுக்கேற்ற பராமரிப்பு':'அன்றாட நடைமுறை'}, உணவு, இயக்கம், ஓய்வு ஆகியவற்றில் கூடுதல் ஒழுங்கு தேவைப்படலாம்.`:'Meals, movement and rest deserve more consistent attention.'):bal.major==='supportive'?(ta?'சீரான அன்றாட வழக்கமும் உடல் இயக்கமும் ஆதரவைப் பேண உதவும்.':'Consistent movement and rest can help maintain a supportive routine.'):(ta?'வழக்கத்தில் மாற்றம் தேவைப்பட்டால் உடல் வசதிக்கேற்ற முறையில் திட்டமிடலாம்.':'Any routine changes should be adjusted to the person’s actual comfort.');
 return ta?`இந்தப் பாவத்தின் உடல் காரகத்துவத்தில் ${body} முக்கியமானது. ${evidence} ${practice}`:`Bodily associations for this house include ${body}. ${evidence} ${practice}`;
}

function star(d,k){const x=globalThis.SMVD1V301Evidence?.starOf?.(d,k);return x?.lord||null;}
function contact(d,s,k,other){const a=d.planets[k],b=d.planets[other];if(!a||!b)return null;const c=s.conjunction(d,k,other);return a.house===b.house&&c.degrees!==null?c:null;}
function timeSegments(birth,from,to){if(!iso(from)||!iso(to)||from>=to)return [];const cuts=[from,to];if(iso(birth)){const date=birth.slice(5);for(const limit of [5,13,18,25,60,70]){const birthday=String(+birth.slice(0,4)+limit).padStart(4,'0')+'-'+date;if(birthday>from&&birthday<to&&/^\d{4}-\d\d-\d\d$/.test(birthday))cuts.push(birthday);}}cuts.sort();return cuts.slice(0,-1).map((x,i)=>({from:x,to:cuts[i+1],age:age(birth,x)}));}
function periodCandidates(d,timeline,n){const e=globalThis.SMVD1V301Evidence,rs=[];
 for(const p of timeline?.dasha||[]){if(!iso(p.from)||!iso(p.to))continue;const md=nk(p.md),ad=nk(p.ad);if(!md||!ad)continue;
  const h=d.houses[n-1],a=d.planets[md],b=d.planets[ad],pa=e?.points?.(d,md,ad),pri=pa?.ranked?.find(x=>x.house===n)?.weight||0,existing=p.topics?.find(x=>x.number===n)?.activation||0;
  const direct=(h.lord===md?3:0)+(h.lord===ad?3.5:0)+(a.house===n?2:0)+(b.house===n?2.5:0)+(h.aspects.includes(md)?1.2:0)+(h.aspects.includes(ad)?1.2:0),score=direct+pri*.55+Math.min(4,existing*.55);
  if(score<2.2)continue;rs.push({p,score,direct,md,ad});}
 rs.sort((x,y)=>y.score-x.score||x.p.from.localeCompare(y.p.from));const result=[],seen=new Set();for(const x of rs){const key=x.p.from+':'+x.p.to+':'+x.md+':'+x.ad;if(seen.has(key))continue;seen.add(key);result.push(x);if(result.length===5)break;}return result.sort((x,y)=>x.p.from.localeCompare(y.p.from));}
function periodNarrative(d,s,n,a,birth,x,ta){const {p,md,ad}=x,des=domain(n,ta,a),rp=d.planets[md],ap=d.planets[ad],sl=star(d,ad),q=s.assess(d,ad),m=s.assess(d,md),bal=supports(s,d,n),h=d.houses[n-1],direct=h.lord===ad||ap.house===n,strong=(q?.score??.5)>=.6,weak=(q?.score??.5)<.36;
const title=`${p.from} – ${p.to} · ${pl(md,ta)} / ${pl(ad,ta)}`;
if(ta)return `${title}: ${lived(n,a,true)} தொடர்பான விஷயங்களில் ${strong&&bal.major!=='challenging'?`${des[2]} என்ற முன்னேற்றம் கிடைக்க வாய்ப்புள்ளது`:weak?`${des[3]} காரணமாக எதிர்பார்த்த வேகத்தில் முடிவு வராமல் இருக்கலாம்`:`${des[2]} என்ற வாய்ப்புடன் ${des[3]} என்பதையும் சமாளிக்க வேண்டியிருக்கலாம்`}. ${direct?`புக்திநாதர் ${pl(ad,true)} இந்தப் பாவத்தின் ${h.lord===ad?'அதிபதியாக இருப்பதால்':'நேரடி கிரகமாக இருப்பதால்'} இந்த விஷயம் முடிவு எடுக்க வேண்டிய நிலைக்கு வரலாம்`:`${pl(ad,true)} இருக்கும் ${ap.house}-ஆம் பாவத்தின் வழியாக ${path(ap.house,true)} இந்த விஷயத்தைத் தூண்டலாம்`}. ${pl(md,true)} தசையின் பின்னணி ${rp.house}-ஆம் பாவத்துடன் இணைவதால் ${path(rp.house,true)} சார்ந்த சூழலையும் சேர்த்துப் பார்க்க வேண்டும். ${strong&&((m?.score??.5)<.36)?'புக்தி அளவில் ஆதரவு இருந்தாலும் தசை அளவிலான தடைகள் காரணமாக பலன் படிப்படியாகவே வரக்கூடும்.':weak&&((m?.score??.5)>=.6)?'தசாநாதரின் ஆதரவு இருந்தாலும் இந்த புக்தியில் ஏற்படும் சிரமத்தைக் குறைக்க முயற்சி தேவை; முழு தசையும் பாதிப்பு என்று கருத வேண்டாம்.':`${des[1]} என்பதே இந்த காலத்தில் வாய்ப்பைப் பயன்படுத்தவும் சிரமத்தைச் சமாளிக்கவும் பொருத்தமான நடைமுறை.`}${sl&&d.planets[sl]?` நட்சத்திர அதிபதி ${pl(sl,true)} ${d.planets[sl].house}-ஆம் பாவத்தில் இருப்பது, ${path(d.planets[sl].house,true)} வழியாக கூடுதல் தொடர்பைக் காட்டுகிறது.`:''}${a===null?'':` காலத் தொடக்க வயது: ${a}.`}`;
return `${title}: in ${lived(n,a,false)}, ${strong&&bal.major!=='challenging'?`there is room for ${des[2]}`:weak?`${des[3]} may slow an expected outcome`:`${des[2]} may arise alongside ${des[3]}`}. ${direct?`${ad} directly activates this house ${h.lord===ad?'as its ruler':'by natal occupation'}, so a decision can become more immediate`:`${ad} in natal house ${ap.house} links the period with ${path(ap.house,false)}`}. The major-period background is ${md} in house ${rp.house}, connecting the matter with ${path(rp.house,false)}. ${strong&&(m?.score??.5)<.36?'Sub-period support may bring incremental progress within a more demanding major period.':weak&&(m?.score??.5)>=.6?'A difficult sub-period does not make the whole major period adverse; use its underlying support while addressing the immediate obstacle.':`A practical response is ${des[1]}.`}${sl&&d.planets[sl]?` The star ruler ${sl} in house ${d.planets[sl].house} adds a link through ${path(d.planets[sl].house,false)}.`:''}${a===null?'':` Age at the start: ${a}.`}`;}
function transitNarrative(d,s,n,timeline,birth,ta){const out=[],seen=new Set();for(const y of timeline?.transitYears||[]){if(!iso(y.from)||!iso(y.to))continue;for(const t of y.notes||[]){const k=nk(t.planet);if(!['Jupiter','Saturn','Rahu','Ketu'].includes(k)||t.focus!==n||!t.text)continue;const token=y.from+':'+k+':'+t.text;if(seen.has(token))continue;seen.add(token);const candidates=periodCandidates(d,{dasha:(timeline.dasha||[]).filter(p=>p.from<y.to&&p.to>y.from)},n),lead=candidates.sort((a,b)=>b.score-a.score)[0],yearAge=age(birth,y.from);
const timing=lead?(ta?` இதே ஆண்டு ${lead.p.from<y.from?y.from:lead.p.from} முதல் ${lead.p.to>y.to?y.to:lead.p.to} வரை ${pl(lead.md,true)} / ${pl(lead.ad,true)} காலமும் இந்த வாழ்க்கைப் பகுதியை செயல்படுத்துகிறது. அதனால் பெயர்ச்சிச் சுட்டியைத் தனியாகப் பார்க்காமல் அந்த காலத்தில் ஏற்படும் வாய்ப்பு அல்லது பொறுப்புடன் இணைத்துப் பார்க்கலாம்.`:` Within this year, ${lead.p.from<y.from?y.from:lead.p.from}–${lead.p.to>y.to?y.to:lead.p.to} (${lead.md}/${lead.ad}) also activates this life area. Read the transit alongside that period’s opportunity or responsibility.`):(ta?' இந்த ஆண்டில் இந்தப் பாவத்தை நேரடியாக செயல்படுத்தும் வலுவான தசைத் தொடர்பு தனியாகத் தேர்வாகவில்லை; கோச்சாரம் மட்டும் நிகழ்வின் தேதியை உறுதி செய்யாது.':'No strongly activating period was isolated for this house in this year; transit alone does not establish an event date.');
out.push(`${y.from} – ${y.to}${yearAge===null?'':ta?` · ${yearAge} வயது`:` · age ${yearAge}`}: ${t.text.trim()}${timing}`);}}
return out;}

function birthOf(chart,timeline){const src=chart?.chart||chart;return timeline?.birth||src?.birthDate||src?.birth?.date||null;}
function validateTimeline(t){return !!(t&&t.meta?.forecastHorizonYears===15&&t.meta?.fromReportDate===t.referenceDate&&t.meta?.throughDate===t.end&&Array.isArray(t.dasha)&&t.dasha.length>0&&Array.isArray(t.transitYears)&&t.transitYears.length>0&&Number(t.meta?.samplesChecked)>0);}
// V308 final: lived-outcome synthesis — place a plausible life consequence ahead of the astrological proof.
// This replaces the earlier "X என்ற அனுபவம் ... வழியாக" sentence pattern; it does not change D1/dasha calculations.
const HUMAN_TA=[
 ['தனக்குப் பொருத்தமான வழியைத் தேர்ந்தெடுப்பதில் உறுதி கூடும்','பிறருடைய எதிர்பார்ப்பிற்காகத் தன் முடிவுகளை மாற்ற வேண்டிய அழுத்தம் வரலாம்','தன் விருப்பத்தைத் தெளிவாகச் சொல்லி, பொறுப்புகளை அளவோடு ஏற்கும்போது தனித்தன்மை வெளிப்படும்'],
 ['வீட்டில் பேசப்படும் பண முடிவுகளிலும் சேமிப்பிலும் தெளிவு வரலாம்','உறவினரின் தேவையையும் தன் வசதியையும் சமப்படுத்துவது சிரமமாகலாம்','வரவு, நிலையான செலவு, உதவிக்கான தொகை என்று பிரித்துப் பேசுவது குடும்ப நம்பிக்கையைப் பாதுகாக்கும்'],
 ['தொடர்ச்சியான பயிற்சியால் கைவரும் திறனுக்குப் பிறரிடம் மதிப்பு உருவாகலாம்','ஆரம்ப வேகத்திற்குப் பிறகு முயற்சியைத் தொடர்வதில் இடைஞ்சல் வரலாம்','உடன்பிறந்தவர் அல்லது நெருங்கியவருடன் பேசும் முறையையும் தன் முயற்சியையும் ஒரே நேரத்தில் கவனிக்க வேண்டும்'],
 ['வீட்டின் பொறுப்புகளைத் திட்டமிட்டால் மனநிம்மதி நிலைபெற வாய்ப்புள்ளது','வசிப்பிடம், தாயார் தேவைகள் அல்லது சொத்து சார்ந்த முடிவுகள் தாமதமாகலாம்','குடும்ப உறுப்பினர்களுடன் முன்னரே பேசி வீட்டு வசதி மற்றும் செலவினத்தை ஒழுங்குபடுத்துவது உதவும்'],
 ['கற்றதை செயல்படுத்தும் திறனும் இளையோருக்கு வழிகாட்டும் வாய்ப்பும் வளரலாம்','படிப்பு அல்லது பிள்ளைகளின் முன்னேற்றத்தில் எதிர்பார்ப்புக்கும் நடைமுறைக்கும் இடைவெளி வரலாம்','ஒப்பீட்டைத் தவிர்த்து தனிப்பட்ட கற்றல் முறை, பொறுமை மற்றும் சரியான ஆதரவைத் தேர்வு செய்வது பலன் தரலாம்'],
 ['சிக்கலை அடையாளம் கண்டு ஒவ்வொரு படியாகச் சரிசெய்யும் திறன் வளரும்','வேலைப்பளு, போட்டி அல்லது அன்றாட உடல் ஒழுங்கின்மை ஒரே நேரத்தில் அழுத்தம் தரலாம்','நேரம், கடன், உணவு மற்றும் ஓய்விற்கு தனித்தனி ஒழுங்கு வைத்தால் சிரமத்தை நிர்வகிக்க முடியும்'],
 ['புரிந்துகொண்டு செயல்படும் கூட்டுறவு உறவிலும் ஒப்பந்தத்திலும் பயன் தரலாம்','இருவரின் எதிர்பார்ப்புகள் வெளிப்படையாகப் பேசப்படாவிட்டால் மனக்கசப்பு சேரலாம்','பொறுப்பை ஒருவர்மீது முழுவதும் வைக்காமல் இருவரும் சேர்ந்து முடிவு எடுப்பது உறவைப் பாதுகாக்கும்'],
 ['மாற்றம் வந்தபோது காரணத்தை ஆராய்ந்து அமைதியாகத் தீர்வு காணும் திறன் பயன்படலாம்','மறைந்த செலவு அல்லது தெளிவற்ற தகவலைச் சரிபார்க்காமல் முடிவெடுப்பது சிரமம் தரலாம்','ஆவணங்கள், காப்பீடு மற்றும் குடும்பத்தில் அவசியம் பகிர வேண்டிய தகவல்களை ஒழுங்காக வைத்திருப்பது நல்லது'],
 ['நல்ல ஆசிரியர் அல்லது அனுபவமிக்கவரின் ஆலோசனையால் புதிய பார்வை கிடைக்கலாம்','உயர்கல்வி, தூரப் பயணம் அல்லது குடும்ப நம்பிக்கைகள் தொடர்பில் கருத்து வேறுபாடு எழலாம்','பெற்றோர் கருத்தைக் கேட்டு சொந்த அனுபவத்தையும் இணைத்துக் கொள்வது முக்கியம்'],
 ['செய்த வேலையின் தரம் அறியப்பட்டு கூடுதல் பொறுப்பு அல்லது அங்கீகாரம் வரலாம்','ஒரே நேரத்தில் பல பொறுப்புகளை ஏற்றதால் முடிவில் தாமதம் ஏற்படலாம்','தனக்குத் திறமையான பணியை முதலில் முடித்து பிறகு புதிய பொறுப்பை ஏற்றால் வளர்ச்சி நிலைக்கும்'],
 ['முன்னர் செய்த முயற்சிக்கும் தொடர்புகளுக்கும் பலன் கிடைக்க வாய்ப்புள்ளது','வருமான வாய்ப்புகள் மாறுபடும்போது திட்டமில்லாத செலவு ஆதாயத்தைக் குறைக்கலாம்','நம்பகமான நண்பர்களுடன் இணைந்து முன்னேறும் போதும் வரவு–செலவுக் கணக்கைத் தனியாக வைத்திருக்க வேண்டும்'],
 ['அமைதியான சூழலில் திட்டமிடும் வேளையில் பயனுள்ள முடிவுகள் உருவாகலாம்','வெளியூர், தனிநேரம், உறக்கம் அல்லது திடீர் செலவின் காரணமாக அன்றாட ஒழுங்கு மாறலாம்','செலவின் தேவையைத் தேர்வு செய்து ஓய்வுக்கும் குடும்பத்திற்கும் நிரந்தர நேரம் வைப்பது உதவும்']
];
const HUMAN_MINOR_TA={
 1:['தன் திறனைத் தெரிந்துகொள்ளும் ஆர்வமும் தன்னம்பிக்கையும் படிப்படியாக வளரும்','சக மாணவர்களுடன் ஒப்பிடப்படும்போது தயக்கம் உருவாகலாம்','குழந்தையின் சொந்த முயற்சியைப் பாராட்டிக் கவனமான ஓய்வையும் விளையாட்டையும் தொடர வேண்டும்'],
 2:['பேச்சுத் திறனும் எண்ணறிவும் வீட்டின் உதவியால் வளர வாய்ப்புள்ளது','குடும்பப் பேச்சால் குழந்தை தேவையில்லாத கவலை எடுத்துக்கொள்ளலாம்','கற்றல் முயற்சியைப் பாராட்டி பணம் பற்றிய பொறுப்பை வயதுக்கேற்ற அளவில் மட்டும் சொல்ல வேண்டும்'],
 5:['பாடத்தைப் புரிந்துகொள்ளும் முறையிலும் படைப்புப் பயிற்சியிலும் ஆர்வம் வளரலாம்','தேர்வு மதிப்பெண் மற்றும் பிறருடன் ஒப்பீடு காரணமாக ஆர்வம் குறையலாம்','வயதுக்கேற்ற வாசிப்பு, கணிதம் அல்லது கலைப் பயிற்சிக்கு நேரம் ஒதுக்கினால் திறமை மேம்படும்'],
 6:['தினசரி பள்ளி ஒழுங்கும் தொடர்ச்சியான பயிற்சியும் பழக்கமாகலாம்','பள்ளிப் போட்டி அல்லது அதிகப் பாடச்சுமையால் சோர்வு வரலாம்','உணவு, உறக்கம், விளையாட்டு மற்றும் படிப்பு நேரத்தைச் சமமாக வைத்திருக்க வேண்டும்'],
 7:['நண்பர்களுடன் பகிர்ந்து செயல்படும் திறன் உருவாகலாம்','சொல்லாமல் வைத்த எதிர்பார்ப்பால் குழுவில் சிறு மனக்கசப்பு வரலாம்','நட்பில் எல்லைகளை மதித்து தெளிவாகப் பேசுவது நல்ல பழக்கமாகும்'],
 10:['பள்ளியில் தரப்படும் சிறிய பொறுப்புகளைச் செய்து ஆசிரியரின் நம்பிக்கையைப் பெறலாம்','ஒரே நேரத்தில் அதிகப் பாடப் பணிகளை ஏற்றுக்கொண்டால் குழப்பம் ஏற்படலாம்','முடித்த பயிற்சியை மதிப்பிட்டு அடுத்த பணியை வரிசையாகச் செய்வது உதவும்']
};
const HUMAN_MINOR_EN={
 1:['confidence and self-direction can develop through practice','comparison with classmates may cause hesitation','recognise effort while leaving enough time for rest and play'],
 2:['speech and early numeracy may improve with family support','household discussions may create worry beyond a child’s age','encourage learning and keep financial responsibility age-appropriate'],
 5:['curiosity and creative study habits can improve','comparison and exam scores may erode motivation','make time for reading, problem-solving or the arts at a suitable pace'],
 6:['steady school routines may become easier','heavy schoolwork or competition may cause fatigue','balance meals, sleep, play and study'],
 7:['cooperation with friends may grow','unspoken expectations can cause friction within a group','practise fair boundaries and direct communication'],
 10:['small school responsibilities can bring a teacher’s trust','too many simultaneous tasks can be confusing','complete and review one assignment before taking another']
};
const HUMAN_EN=[
 ['independent judgment can become more consistent','outside expectations can dilute personal priorities','state a decision clearly while carrying obligations at a sustainable pace'],
 ['family financial decisions and savings may grow clearer','family needs can compete with available resources','separate regular costs, savings and what you can afford to contribute'],
 ['practice can turn a skill into visible competence','initial enthusiasm may fade before results emerge','combine sustained effort with careful communication with siblings and peers'],
 ['thoughtful household planning can build a steadier home life','housing, property or parental needs may introduce delays','agree on home arrangements and maintenance costs in advance'],
 ['applied learning and mentoring can develop','expectations about study or younger family members may outrun practical progress','support each learner individually rather than making comparisons'],
 ['persistent effort can improve how practical problems are handled','competition and a demanding routine can combine into strain','plan time, debts, meals and rest separately'],
 ['a cooperative relationship or partnership may bring mutual gains','unspoken expectations can cause resentment','agree on responsibilities together rather than leaving them to one person'],
 ['careful investigation can help during unforeseen change','uncertain documents or costs can complicate decisions','keep records and essential family information in order'],
 ['a mentor can widen educational and ethical perspective','study, travel or family beliefs may generate differences','weigh experienced guidance against the facts of the situation'],
 ['reliable work can attract responsibility and recognition','taking on too many duties at once can delay completion','finish core tasks before accepting additional responsibilities'],
 ['past work and relationships may create useful opportunities','variable income can make spending hard to control','keep a separate record of income and expenditure'],
 ['quiet reflection can lead to useful plans','travel, sleep or unplanned costs may unsettle routines','set aside predictable time for rest and family']
];
// Meaning of the destination house depends on the life matter being considered.
const PAIR_TA={
 1:{10:'சுயமரியாதையை வேலைப்பொறுப்பிலேயே அதிகம் காணும் இயல்பு உண்டு. செய்த பணியை மற்றவர் மதிக்காதபோது உள்ளுக்குள் ஏமாற்றம் வரலாம்; அதற்காக எல்லாவற்றையும் தனியாகச் சுமக்க வேண்டியதில்லை.',6:'ஒருவரின் சுயமதிப்பும் அன்றாடப் பணியும் ஒன்றுடன் ஒன்று கலக்கலாம். போட்டி இருக்கும்போது தன் நலனையும் ஓய்வையும் கடைசியில் வைக்காமல் பார்க்க வேண்டும்.',9:'பெரியவர்கள் வழங்கும் அறிவுரை வாழ்க்கைப் பாதையை மாற்றக்கூடும்; ஆனால் அது நடைமுறையில் பொருந்துகிறதா என்று சுயமாகப் பரிசோதிக்கும் மனமும் தேவை.'},
 2:{2:'குடும்ப வரவையும் சேமிப்பையும் நிதானமாகச் சேர்க்கும் வாய்ப்பு வலுவாக இருக்கும்; பணம் பற்றிய சொற்கள் வீட்டாரின் நம்பிக்கையை நேரடியாகப் பாதிக்கும்.',11:'வருமானம் உயர்ந்தாலும் சேரும் தொகை எவ்வளவு என்பதை சேமிப்புப் பழக்கமே தீர்மானிக்கும்.',8:'கூட்டுப் பணம், வாரிசு அல்லது எதிர்பாராத செலவுகளைத் தெளிவாகப் பிரித்துப் பார்ப்பது அவசியமாகலாம்.'},
 3:{10:'திறமை வேலை இடத்தில் தெரிய வரும்; எழுதுதல், பேசுதல் அல்லது தொழில்நுட்ப முயற்சியைத் தொடர்ந்து செய்தால் அதற்கான பொறுப்பும் உருவாகலாம்.',6:'முயற்சி போட்டி மற்றும் கடினப் பயிற்சியோடு இணையும். ஒரே தோல்வியைத் திறமைக் குறைவாக எண்ணாமல் முறையைத் திருத்திக்கொள்ள வேண்டும்.'},
 4:{2:'வீடு சார்ந்த அமைதி குடும்ப வரவு–செலவுடன் இணைந்திருக்கும்; வீட்டு வசதிக்குச் செலவிடும் தொகையை உறவினருடன் திட்டமிட்டுப் பேச வேண்டும்.',10:'தொழில் காரணமாக வீடு அல்லது வசிப்பிட ஒழுங்கை மாற்ற வேண்டிய சூழல் வரலாம்; வேலையின் முன்னேற்றம் குடும்ப நேரத்தைக் குறைக்காதபடி கவனம் தேவை.',12:'வசிப்பிடம் மாறுதல், வெளியூர்த் தொடர்பு அல்லது தனிநேரத்தின் தேவை குடும்ப நிம்மதியில் தாக்கம் செலுத்தலாம்.'},
 5:{6:'கல்வியில் போட்டி, வேலைநேரம் அல்லது பிள்ளைகளின் அன்றாடப் பழக்கம் முக்கியமாகலாம். அதிக அழுத்தத்தைத் தவிர்த்தால் சிரமமான பாடத்திலும் படிப்படியான முன்னேற்றம் உண்டு.',8:'ஆழ்ந்து ஆராயும் திறன் கூடலாம்; ஆனால் பாடத்தேர்வு மற்றும் பிள்ளைகள் தொடர்பான முடிவுகளில் உறுதி செய்யாத தகவலால் அச்சமடைய வேண்டாம்.',1:'சொந்த அறிவை நம்பி செயல்படும் இயல்பு உண்டு; குழந்தைகளின் கற்றலிலும் தனிப்பட்ட எதிர்பார்ப்பை அளவோடு வைத்தல் நல்லது.'},
 6:{10:'பணிச்சூழலில் தொடர்ச்சியான போட்டியும் பயிற்சியும் இருக்கும்; திட்டமிட்ட ஒழுங்கே செயல்திறனை நிலைநிறுத்தும்.',2:'கடன், அன்றாடச் செலவு மற்றும் குடும்பப் பொருளாதாரம் தொடர்புபடலாம்; பணம் கொடுத்தல்–வாங்கலில் தெளிவு முக்கியம்.'},
 7:{2:'திருமணத்திற்குப் பிறகோ கூட்டுத் தொழிலிலோ இரு குடும்பங்களின் பேச்சும் பணமுறையும் முக்கியமாகலாம்; நெருக்கத்தைப் பாதுகாப்பது வெளிப்படையான கணக்கே.',5:'உறவில் சிந்தனைப் பொருத்தம், கல்வி அல்லது பிள்ளைகள் குறித்த உரையாடல் அதிக இடம் பெறலாம்; எதிர்பார்ப்புகளைச் சொல்லாமலே புரிந்துவிடுவார் என்று நினைக்க வேண்டாம்.',12:'துணையுடன் செலவுகள், வெளியூரில் இருப்பது அல்லது தனிநேரம் பற்றிய சமநிலை முக்கியமாகலாம்; தூரம் இருந்தாலும் தொடர்பைத் திட்டமிடலாம்.',10:'தொழிலும் உறவும் ஒன்றையொன்று பாதிக்கலாம்; ஒருவரின் முன்னேற்றத்திற்கு மற்றவர் இடமளிக்க வேண்டும்.'},
 8:{8:'சிக்கலான விஷயங்களை ஆழ்ந்து புரிந்துகொள்ளும் திறன் உண்டு; ஆனால் எதிர்பாராத சூழலைத் தன்னுடைய தவறாக எண்ணிக் கொள்ள வேண்டாம்.',12:'திடீர் செலவுகள் அல்லது வெளியூர்ச் சூழல் காரணமாகப் பாதுகாப்புத் திட்டம் தேவைப்படலாம்.',2:'கூட்டுப் பணம் மற்றும் குடும்பச் சேமிப்பின் எல்லையைத் தெளிவாக வைத்திருப்பது மனஅழுத்தத்தைத் தவிர்க்க உதவும்.'},
 9:{1:'ஆசிரியர் அல்லது தந்தை கூறிய வழியைத் தனக்குப் பொருத்தமாக மாற்றிச் செயல்படுத்தும் திறன் உருவாகலாம்.',6:'உயர்கல்வி, வழிகாட்டுதல் மற்றும் உழைப்பின் ஒழுங்கு இணையும்; பொறுமையுடன் பயிற்சி செய்தால் பின்பு அதன் பயன் தெரியும்.',12:'வெளியூர் கல்வி, தொலைதூரப் பயணம் அல்லது ஆன்மிகத் தேடலுக்கான செலவு வரலாம்; நோக்கத்தை முன்பே தெளிவாக்க வேண்டும்.'},
 10:{10:'பொறுப்பையும் தொழில்நுட்பத் திறனையும் தானே நிரூபிக்க வேண்டிய நிலை அதிகம். வேலை தரம் உயரும்போது பிறர் நம்பிக்கை வளரும்; அதிகச் சுமையால் தரம் குறையாமல் பார்த்துக்கொள்ள வேண்டும்.',6:'சேவை, போட்டி, கடினமான தினசரிப் பணி ஆகியவை தொழிலின் மையமாகலாம்; நிரந்தரப் பயிற்சியே முன்னேற்றத்திற்கு அடித்தளம்.',2:'குடும்ப வருமானத்திற்கான பொறுப்பு தொழில்முடிவில் முக்கியமான இடம் பெறலாம்; சம்பாதிப்பதையும் சேமிப்பதையும் தனித்தனி இலக்குகளாக வைத்தல் நல்லது.',9:'உயர்கல்வி, பயணம் அல்லது அனுபவமிக்கவரின் ஆலோசனை தொழிலின் திசையை மாற்ற உதவலாம்.'},
 11:{2:'வருமானம் குடும்பச் சேமிப்பாக மாறுவதற்கு வரவு–செலவுக் கட்டுப்பாடு முக்கியம்.',10:'தொழிலில் செய்யப்பட்ட நல்ல வேலைக்கான பலன் காலப்போக்கில் வருமானமாகவும் புதிய அறிமுகமாகவும் திரும்பலாம்.',12:'ஆதாயம் கிடைத்த உடனே செலவாகிவிடும் வாய்ப்பு உள்ளது; எவ்வளவு மீதமாகிறது என்பதைப் பார்ப்பதே முக்கியம்.'},
 12:{7:'தனிநேரம், உறவுப் பொறுப்பு மற்றும் செலவு ஆகியவற்றில் சமநிலை தேவைப்படலாம்; உணர்வைப் பகிர்வது தூரத்தைச் சுருக்கும்.',9:'வெளியூர் கல்வி, ஆன்மிகம் அல்லது நீண்ட பயணத்திற்குச் செலவிடும் நிலை இருக்கலாம்.',10:'வேலைக்காகப் பயணம் அல்லது தனிநேரத்தை விட்டுக் கொடுக்கும் சூழல் வரலாம்; ஓய்வைத் திட்டமிட வேண்டும்.'}
};
const CHILD_LINK_TA=[
 'தன் உடல்நல ஒழுங்கும் தன்னம்பிக்கையும் வளர்வது',
 'வீட்டில் பேசப்படும் விதமும் படிப்பிற்கான உதவியும் கிடைப்பது',
 'தனியாகப் பயிற்சி செய்வதும் உடன்பிறந்தவர்களுடன் பழகுவதும்',
 'வீட்டின் அமைதியும் பெற்றோரின் ஆதரவும் கிடைப்பது',
 'பாடப் புரிதல், விளையாட்டு மற்றும் கலை ஆர்வம் வளர்வது',
 'தினசரி பள்ளிப் பயிற்சி, நேர ஒழுங்கு மற்றும் சீரான ஓய்வு',
 'சக மாணவர்களுடன் ஒத்துழைத்துக் குழுவாகச் செயல்படுவது',
 'வகுப்பு அல்லது வீட்டுச் சூழல் மாறும்போது பாதுகாப்பாகப் பழகுவது',
 'ஆசிரியர் மற்றும் மூத்தோரின் வழிகாட்டுதலைப் பெறுவது',
 'பள்ளியில் சிறிய பொறுப்பை முடித்து அங்கீகாரம் பெறுவது',
 'நண்பர்கள், விளையாட்டு குழு மற்றும் சாதிக்கக்கூடிய இலக்குகளை அமைப்பது',
 'படிப்பு, பயணம், உறக்கம் மற்றும் ஓய்வு நேரத்தைச் சமப்படுத்துவது'
];
const CHILD_LINK_EN=[
 'confidence and healthy personal habits','the way family speaks and supports schoolwork',
 'practice and sibling or peer interaction','home stability and caregiver support',
 'learning, play and creative interests','school routines and sufficient rest',
 'cooperation with classmates','safe adjustment to changes at school or home',
 'guidance from teachers and elders','earning trust through manageable school tasks',
 'friendships and attainable learning goals','balancing study, outings, sleep and rest'
];
function humanNarrative(d,s,n,a,ta){
 const h=d.houses[n-1],p=d.planets[h.lord],q=s.assess(d,h.lord),bal=supports(s,d,n),young=a!==null&&a<18;
 const [good,bad,practice]=((a!==null&&a<18&&(ta?HUMAN_MINOR_TA:HUMAN_MINOR_EN)[n])||(ta?HUMAN_TA:HUMAN_EN)[n-1]);
 const owned=own(d,h.lord),partners=d.houses[p.house-1].occupants.filter(k=>k!==h.lord);
 const pName=pl(h.lord,ta),field=lived(n,a,ta);
 const strong=q?.score>=.64,weak=q?.score<=.35;
 let first,second;
 if(ta){
  first=`${field} என்ற வாழ்க்கைப் பகுதியில் ${bal.major==='supportive'?good:bal.major==='challenging'?bad:`${good}; அதே நேரத்தில் ${bad}`}. ${practice}. இந்த முயற்சியில் ${pName} குறிக்கும் ${PLANET_TA[h.lord][1]} ${path(p.house,true)} சார்ந்த சூழலோடு இணைந்து வெளிப்படலாம்.`;
  const linked=(PAIR_TA[n]||{})[p.house];
  const connection=young?`${field} தொடர்பான பலனைப் பார்க்கும்போது ${CHILD_LINK_TA[p.house-1]} இதற்கு முக்கியப் பின்னணியாகிறது. வீட்டிலும் பள்ளியிலும் கிடைக்கும் உதவியோடு இதைப் பொருத்திப் பார்க்க வேண்டும்.`:(linked||`${n}-ஆம் பாவம் தொடர்பான முடிவுகளை எடுக்கும்போது ${path(p.house,true)} சார்ந்த சூழலும் முன்னிலைக்கு வரும். இதைத் தனியாகப் பார்க்காமல் இரண்டையும் இணைத்து முடிவெடுப்பது பொருத்தம்.`);
  const ownerLink=owned.length>1?` ${pName} ${owned.join(', ')}-ஆம் பாவங்களை ஆள்வதால் இரண்டு பாவங்களின் பொறுப்புகளும் இணைகின்றன.`:'';
  const companions=partners.length?` ${pName} உடன் ${partners.map(k=>pl(k,true)).join(', ')} இருப்பதால் ${partners.map(k=>PLANET_TA[k][0]).join(', ')} சார்ந்த சூழலும் இந்தப் பலனை மாற்றலாம்.`:'';
  second=`இதற்கான ஜாதகக் காரணம்: ${n}-ஆம் பாவ அதிபதி ${pName} ${p.house}-ஆம் பாவத்தில் ${friendWord(q?.dignity,true)} நிலையில் இருக்கிறார்.${ownerLink} ${connection}${companions} ${strong?'இந்த அதிபதியின் ஆதரவு பலத்தைப் பயன்படுத்துவதற்கு சாதகமாக இருக்கிறது.':weak?'இந்த அதிபதியின் பலம் குறைவாக இருப்பதால் முடிவுகளை அவசரப்படுத்தாமல் ஆதாரத்தோடு எடுக்க வேண்டும்.':'உதவும் தொடர்புகளும் தடையும் இருப்பதால் சூழலைப் பொறுத்தே பலன் வெளிப்படும்.'}`;
 }else{
  first=`In the area of ${field}, ${bal.major==='supportive'?good:bal.major==='challenging'?bad:`${good}, although ${bad}`}. A practical response is to ${practice}. The ruler ${h.lord} brings ${PLANET_EN[h.lord][1]} into circumstances linked with ${path(p.house,false)}.`;
  second=`The natal reason is specific: ${h.lord} rules house ${n} and sits in house ${p.house} (${friendWord(q?.dignity,false)}). This links ${field} with ${young?CHILD_LINK_EN[p.house-1]:path(p.house,false)}.${owned.length>1?' The same planet also rules house '+owned.filter(x=>x!==n).join(', ')+'.':''}${partners.length?' Its conjunction with '+partners.join(', ')+' adds their separate natural and functional indications.':''} ${strong?'The ruler has meaningful support.':weak?'The ruler has limited support and decisions deserve more evidence.':'Support and strain both need weighing.'}`;
 }
 return [first,second];
}
function build(chart,lang='ta',context={},timeline=null){const r=globalThis.SMVLifePredictionD1,s=globalThis.SMVD1StrengthV303;if(!r?.toD1||!s?.assess||!s?.nodes||!s?.matter)throw Error('V307 requires existing D1 reader and strength module');const d=r.toD1(chart),ta=lang!=='en',birth=birthOf(chart,timeline),referenceDate=timeline?.referenceDate||new Date().toISOString().slice(0,10),nowAge=age(birth,referenceDate);d.birthDate=birth;d.referenceDate=referenceDate;
 const v339Classical=globalThis.SMVClassicalEvidenceV337?.analyse?.(chart)||null;const topics=[];for(let n=1;n<=12;n++){const text=[...humanNarrative(d,s,n,nowAge,ta),...specialEvents(d,s,n,nowAge,ta),...strengthInteractions(d,s,n,nowAge,ta),bodyText(d,s,n,nowAge,ta)];if(text.length<4){const h=d.houses[n-1],support=supports(s,d,n);text.push(ta?`இந்தப் பாவத்தில் கிரகம் இல்லாதது அதன் வாழ்க்கைப் பலன் இல்லை என்று பொருள் அல்ல. ${pl(h.lord,true)}-ன் இருப்பிடமும் ${h.aspects.length?h.aspects.map(k=>pl(k,true)).join(', ')+' பார்வையும்':'அந்த ராசி அதிபதியின் வலிமையும்'} சேர்ந்து ${domain(n,true,nowAge)[2]} என்ற வழியைத் திறக்கலாம். ${support.major==='challenging'?domain(n,true,nowAge)[3]:domain(n,true,nowAge)[1]} என்பதைக் கணக்கில் கொண்டு முடிவு செய்வது பொருத்தமானது.`:`An empty natal house does not mean its life area is absent. ${h.lord}'s placement and ${h.aspects.length?'aspects from '+h.aspects.join(', '):'the sign ruler’s dignity'} condition ${domain(n,false,nowAge)[2]}, while ${support.major==='challenging'?domain(n,false,nowAge)[3]:domain(n,false,nowAge)[1]} remains relevant.`);}if(n===1)text.push(v339MoonText(d,s,ta));
 text.push(...v339HouseVargaEvidence(v339Classical,n,ta,nowAge!==null&&nowAge<18));
 if(n===7&&(nowAge===null||nowAge>=18)&&globalThis.SMVD9V308)text.push(...globalThis.SMVD9V308.narrative(chart,lang,nowAge));if(timeline){for(const x of periodCandidates(d,timeline,n)){for(const split of timeSegments(birth,x.p.from,x.p.to)){text.push(periodNarrative(d,s,n,split.age,birth,{...x,p:{...x.p,from:split.from,to:split.to}},ta));}}text.push(...transitNarrative(d,s,n,timeline,birth,ta));}const seen=new Set(),paragraphs=text.filter(t=>{if(!t||seen.has(t))return false;seen.add(t);return true;});topics.push({number:n,title:(ta?names:enames)[n-1],paragraphs});}
 return {topics,lang:ta?'ta':'en',birth,ageAtReport:nowAge,timeline:timeline?{from:timeline.referenceDate,to:timeline.end,years:15,complete:validateTimeline(timeline)}:null};}
function html(rep){const ta=rep.lang!=='en',interval=rep.timeline?rep.timeline.from+' – '+rep.timeline.to:(ta?'பிறப்பு ஜாதக அமைப்பு':'Natal chart');return `<section class="smv-d1-life-reading smv-v303-integrated smv-v307-events" data-smv-d1-life="1" data-smv-integrated="12" data-smv-15-year-ready="${rep.timeline?.complete?'1':'0'}" lang="${rep.lang}"><h2>${ta?'முழு வாழ்க்கைப் பலன்கள்':'Complete Life Predictions'}</h2><p class="smv-v303-intro">${ta?'பிறப்புப் பாவம், அதிபதி, இயற்கைக் காரகன், நட்சத்திரம், சேர்க்கை, பார்வை, வயது, தசை–புக்தி மற்றும் கணிக்கப்பட்ட பெயர்ச்சி தொடர்புகளிலிருந்து தேர்ந்தெடுக்கப்பட்ட வாழ்க்கைப் பலன்கள்.':'Life events selected from natal houses, rulers, natural significators, aspects, stars, age, computed periods and transits.'} ${enc(interval)}.</p>${rep.topics.map(t=>`<section class="smv-d1-life-topic smv-v303-house" data-d1-topic="${t.number}"><h3>${t.number}. ${enc(t.title)}</h3>${t.paragraphs.map(p=>`<p class="smv-d1-life-paragraph">${enc(p)}</p>`).join('')}</section>`).join('')}<p class="smv-v306-medical-note">${ta?'உடல் தொடர்புகள் பாரம்பரிய ஜோதிடக் குறியீடுகள்; நோயறிதல் அல்ல.':'Bodily links are traditional symbolic associations, not diagnoses.'}</p></section>`;}
return Object.freeze({build,html,age,phase,timeSegments,periodCandidates,version:'308-final-lived-evidence-age-d9-timing'});
});

;

/* ---- judgement.js (preserves original execution order) ---- */
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
 const div=d===9?'D-9':d===7?'D-7':'D-10';const row=Array.isArray(v)?v.find(x=>x.division===div):null;
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
 const karaka=relevant?(n===5?'Jupiter':n===7?'Venus':'Saturn'):null;
 const divisionKaraka=karaka?varga(full,relevant,karaka):null;
 const divisionEvidence=[division,divisionKaraka].filter(Boolean);
 const classical=classicalLinks(d,n);
 const related=d.houses.filter(x=>x.lord===k&&x.no!==n).map(x=>x.no);
 // Weighted rule evidence selects a conclusion BEFORE narrative. Opposing evidence cannot disappear.
 const dominant=support==='support'?plus[0]:support==='strain'?minus[0]:Math.abs(plus[0]?.delta||0)>=Math.abs(minus[0]?.delta||0)?plus[0]:minus[0];
 const main=age!==null&&age<18&&[2,5,7,10,11].includes(n)?({2:'குடும்பப் பேச்சு மற்றும் கற்றலுக்கான பொருட்கள்',5:'பள்ளிப் படிப்பும் விளையாட்டும்',7:'நண்பர்களுடன் இணைந்து பழகும் விதம்',10:'பள்ளிப் பொறுப்பும் பயிற்சியும்',11:'நண்பர் வட்டமும் குழு நடவடிக்கையும்'})[n]:T[n-1][support==='strain'?2:1];
 return Object.freeze({house:n,lord:k,location:loc,houseOccupants:[...new Set(h.occupants||[])],houseAspects:[...new Set(h.aspects||[])],otherLordships:related,main,eventKind:support==='strain'?'obstacle':support==='support'?'opportunity':'negotiation',conclusion:support,relativeScore:Math.round(sum*100)/100,dominant,positive:plus,negative:minus,all:a,division,divisionEvidence,classical,ageUnder18:age!==null&&age<18,topicTA:T[n-1],topicEN:E[n-1],destinationTA:DEST_TA[loc-1],destinationEN:DEST_EN[loc-1],source:'natal D1 + V303 strength + relevant validated varga only',ruleMethod:'relative priority heuristic; no factual event certainty'});
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
/* Star/pada assessment: derives ONLY from genuine D1 0..360 longitude or
 * explicit natal nakshatra/pada fields. No ephemeris, astrology API or new file.
 * Graha drishti is sign based; degrees supply an additional orb witness, never
 * replace the traditional sign test. Close Rahu / combust are qualitative flags.
 */
const NAK_TA=['அஸ்வினி','பரணி','கார்த்திகை','ரோகிணி','மிருகசீரிஷம்','திருவாதிரை','புனர்பூசம்','பூசம்','ஆயில்யம்','மகம்','பூரம்','உத்திரம்','ஹஸ்தம்','சித்திரை','சுவாதி','விசாகம்','அனுஷம்','கேட்டை','மூலம்','பூராடம்','உத்திராடம்','திருவோணம்','அவிட்டம்','சதயம்','பூரட்டாதி','உத்திரட்டாதி','ரேவதி'];
const NAK_EN=['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishta','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati'];
const NAK_RULERS=['Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury'];
const CYCLE=13+1/3,QUARTER=CYCLE/4;
function starFromLongitude(raw){if(raw===null||raw===undefined||raw==='')return null;const num=Number(raw);if(!Number.isFinite(num)||num<0||num>=360)return null;const idx=Math.min(26,Math.floor(num/CYCLE)),offset=num-idx*CYCLE;
return {index:idx,ta:NAK_TA[idx],en:NAK_EN[idx],pada:Math.min(4,Math.floor((offset+1e-8)/QUARTER)+1),ruler:NAK_RULERS[idx%9],source:'natal-longitude',longitude:num};}
function explicitStar(obj){if(!obj||typeof obj!=='object')return null;const raw=String(obj.nakshatra||obj.star||obj.birthStar||'').trim();if(!raw)return null;const idx=NAK_TA.indexOf(raw)>=0?NAK_TA.indexOf(raw):NAK_EN.findIndex(v=>v.toLowerCase()===raw.toLowerCase());if(idx<0)return null;const p=Number(obj.pada??obj.nakshatraPada??obj.starPada),pada=Number.isInteger(p)&&p>=1&&p<=4?p:null;return {index:idx,ta:NAK_TA[idx],en:NAK_EN[idx],pada,ruler:NAK_RULERS[idx%9],source:'explicit-natal-field',longitude:null};}
function planetStar(d,source,key){const p=d.planets[key];if(!p)return null;const raw=(source?.planets||[]).find(x=>norm(x.planet||x.name)===key);const fromDeg=starFromLongitude(p.longitude);const supplied=explicitStar(raw);if(fromDeg&&supplied&&fromDeg.index!==supplied.index)return {...fromDeg,conflict:'explicit-star-disagrees-with-longitude'};return fromDeg||supplied;}
function degreeGap(a,b){return Math.abs((((a-b+540)%360)+360)%360-180);}
const DRISHTI_STEPS={Sun:[7],Moon:[7],Mars:[4,7,8],Mercury:[7],Jupiter:[5,7,9],Venus:[7],Saturn:[3,7,10]};
function aspectWitness(d,fromKey,toKey,toLongitude){const a=d.planets[fromKey],b=toKey?d.planets[toKey]:null;if(!a||(!b&&!Number.isFinite(toLongitude)))return null;
 const target=Number.isFinite(toLongitude)?toLongitude:b?.longitude,targetSign=Number.isFinite(target)?Math.floor(target/30):b?.sign;
 if(!Number.isInteger(targetSign)||!(DRISHTI_STEPS[fromKey]||[]).length)return null;
 const step=(targetSign-a.sign+12)%12+1;if(!DRISHTI_STEPS[fromKey].includes(step))return null;
 const exact=Number.isFinite(a.longitude)&&Number.isFinite(target)?degreeGap(target,(a.longitude+(step-1)*30)%360):null;
 const rahu=d.planets.Rahu,nearRahu=Number.isFinite(a.longitude)&&Number.isFinite(rahu?.longitude)&&fromKey!=='Rahu'&&degreeGap(a.longitude,rahu.longitude)<8;
 const suppressed=!!a.combust||nearRahu;
 return {from:fromKey,to:toKey||'Lagna',aspectHouse:step,orb:exact,closeness:exact===null?'sign-only':exact<=2?'near-exact':exact<=5?'close':exact<=10?'moderate':'wide',combust:!!a.combust,closeRahu:nearRahu,qualified:suppressed,source:'D1 graha drishti and actual angular positions only'};
}
function starEvidence(d,chart){const s=chart?.chart?.lagna?chart.chart:chart,lag=s?.lagna||{},lagnaSign=d.lagna;
 const lagnaLong=Number(lag?.longitude),trustedLagna=lag?.longitude!==null&&lag?.longitude!==undefined&&lag?.longitude!==''&&Number.isFinite(lagnaLong)&&lagnaLong>=0&&lagnaLong<360&&Math.floor(lagnaLong/30)===lagnaSign?lagnaLong:null;
 const lagnaStar=(trustedLagna!==null?starFromLongitude(trustedLagna):null)||explicitStar(lag);
 const planets={};for(const k of PLAN){const item=planetStar(d,s,k);const ruler=item?.ruler||null,owner=ruler?d.planets[ruler]:null;const aspects=owner?PLAN.filter(p=>p!==ruler).map(p=>aspectWitness(d,p,ruler)).filter(Boolean).sort((a,b)=>(a.orb??100)-(b.orb??100)):[];
 planets[k]={star:item,starRuler:ruler,rulerHouse:owner?.house||null,rulerDignity:owner?.dignity||null,rulerRetrograde:!!owner?.retrograde,rulerCombust:!!owner?.combust,rulerAspects:aspects};}
 const owner=lagnaStar?d.planets[lagnaStar.ruler]:null;
 const lagnaAspects=PLAN.map(k=>aspectWitness(d,k,null,trustedLagna)).filter(Boolean);
 const ascLord=d.houses[0]?.lord,ascPlanet=d.planets[ascLord];
 const ascLordAspects=ascPlanet?PLAN.filter(k=>k!==ascLord).map(k=>aspectWitness(d,k,ascLord)).filter(Boolean).sort((a,b)=>(a.orb??180)-(b.orb??180)):[];
 const ascConjunctions=ascPlanet?PLAN.filter(k=>k!==ascLord&&d.planets[k]?.sign===ascPlanet.sign).map(k=>({planet:k,degreeDistance:Number.isFinite(ascPlanet.longitude)&&Number.isFinite(d.planets[k]?.longitude)?degreeGap(ascPlanet.longitude,d.planets[k].longitude):null})):[];
 const lagna={star:lagnaStar,starRuler:lagnaStar?.ruler||null,rulerHouse:owner?.house||null,rulerDignity:owner?.dignity||null,rulerRetrograde:!!owner?.retrograde,rulerCombust:!!owner?.combust,rulerAspects:owner?PLAN.filter(k=>k!==lagnaStar.ruler).map(k=>aspectWitness(d,k,lagnaStar.ruler)).filter(Boolean):[],aspects:lagnaAspects,occupants:[...(d.houses[0]?.occupants||[])],lord:ascLord,lordHouse:ascPlanet?.house||null,lordDignity:ascPlanet?.dignity||null,lordStar:ascLord?planets[ascLord]||null:null,lordAspects:ascLordAspects,lordConjunctions:ascConjunctions};
 const houses={};for(const h of d.houses)houses[h.no]={house:h.no,lord:h.lord,lordStar:planets[h.lord],karakas:KAR[h.no-1].map(k=>({planet:k,...planets[k]}))};
 return {lagna,planets,houses,lagnaSign,moonSign:d.planets.Moon?.sign??null,validLongitudes:PLAN.filter(k=>Number.isFinite(d.planets[k]?.longitude)).length,source:'D1 single-load and explicit birth star fields; no recalculation'};
}

return Object.freeze({read,resolve,decide,synthesize,norm,varga,classicalLinks,starEvidence,starFromLongitude,aspectWitness,PLAN,NTA,T,E,DEST_TA,DEST_EN,KAR});
});

;

/* ---- timing.js (preserves original execution order) ---- */
/* V311 / 2 of 4. Verified MD/AD and optional PD, computed slow-planet transit convergence.
 * Never generates fictitious dates/PD; uses upstream offline Swiss forecast once per chart.
 */
(function(g,f){const v=f(g);g.SMVD311Timing=v;if(typeof module==='object'&&module.exports)module.exports=v;})(typeof window==='object'?window:globalThis,function(g){'use strict';
const j=()=>g.SMVD311Judgement;const valid=x=>/^\d{4}-\d{2}-\d{2}$/.test(x||'');
/* P.V.R. Narasimha Rao, Vedic Astrology: An Integrated Approach, PDF p224:
 * distribute each COMPLETE Antardasha among nine Pratyantaras according to
 * Vimshottari planetary years. Calendar dates are rounded at day precision.
 * Never extrapolate a truncated AD at a forecast boundary.
 */
const DASHA_ORDER=['Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury'];
const DASHA_YEARS={Ketu:7,Venus:20,Sun:6,Moon:10,Mars:7,Rahu:18,Jupiter:16,Saturn:19,Mercury:17};
const DAY=86400000;
function asDay(date){if(!valid(date))return NaN;const d=new Date(date+'T00:00:00Z');return d.toISOString().slice(0,10)===date?d.getTime()/DAY:NaN;}
function fromDay(day){return new Date(day*DAY).toISOString().slice(0,10);}
function computePD(periods,forecast){
 const reference=forecast?.referenceDate||forecast?.from||null;
 const end=forecast?.end||null;const segments=[],skipped=[];
 for(let i=0;i<periods.length;i++){
  const p=periods[i];if(p.pd)continue;const a=asDay(p.from),b=asDay(p.to);
  if(!Number.isFinite(a)||!Number.isFinite(b)||b<=a||!DASHA_YEARS[p.ad])continue;
  // A first/last partial AD is NOT its full period, so its PD lord cannot
  // be assigned correctly using the clipped range. Skip instead of guessing.
  if((reference&&p.from===reference)||(end&&p.to===end)){
    skipped.push({from:p.from,to:p.to,md:p.md,ad:p.ad,reason:'clipped forecast-edge AD; original start/end not supplied'});continue;
  }
  const first=DASHA_ORDER.indexOf(p.ad),order=Array.from({length:9},(_,k)=>DASHA_ORDER[(first+k)%9]);
  let day=a,acc=0;
  for(let k=0;k<9;k++){
   acc+=DASHA_YEARS[order[k]];let next=k===8?b:a+Math.round((b-a)*acc/120);
   next=Math.max(day,Math.min(b,next));if(next>day)segments.push({from:fromDay(day),to:fromDay(next),md:p.md,ad:p.ad,pd:order[k],age:p.age,source:'proportional-from-complete-upstream-AD',approximateDayBoundaries:true,planetYears:DASHA_YEARS[order[k]]});day=next;
  }
 }
 return {segments,skipped,algorithm:'PVR Vimshottari AD -> nine proportional PD; exact day boundary depends on calendar convention'};
}

function ageAt(b,d){if(!valid(b)||!valid(d))return null;return +d.slice(0,4)-+b.slice(0,4)-(d.slice(5)<b.slice(5)?1:0);}
function periods(t,sourceBirth){const input=Array.isArray(t?.dasha)?t.dasha:[];const rows=input.filter(p=>valid(p.from)&&valid(p.to)&&p.to>p.from).map(p=>{const md=j().norm(p.md),ad=j().norm(p.ad),pd=j().norm(p.pd||p.pratyantar||p.antaram);return {from:p.from,to:p.to,md,ad,pd,age:ageAt(sourceBirth,p.from),source:'verified dasha intervals',derivedContinuation:!!p.derivedContinuation};}).filter(x=>x.md&&x.ad).sort((a,b)=>a.from.localeCompare(b.from));const distinct=[];
 for(const p of rows){const last=distinct[distinct.length-1];if(last&&last.to===p.from&&last.md===p.md&&last.ad===p.ad&&last.pd===p.pd){last.to=p.to;last.ageSwitch=last.ageSwitch||last.age!==p.age;last.joinedCount=(last.joinedCount||1)+1;}else distinct.push({...p});}
 return distinct;}
function activation(d,c,p){let value=0,links=[];function one(k,scale){if(!k||!d.planets[k])return;const x=d.planets[k];const owns=d.houses.filter(h=>h.lord===k).map(h=>h.no);let n=0;
 if(k===c.lord){n+=6;links.push(k+':rules-'+c.house);}
 if(x.house===c.house){n+=4.5;links.push(k+':occupies-'+c.house);}
 if(c.houseAspects.includes(k)){n+=2.5;links.push(k+':aspects-'+c.house);}
 if(c.otherLordships.includes(x.house)){n+=1.1;links.push(k+':also-related');}
 if(owns.some(h=>[c.house,c.location].includes(h))){n+=1.25;links.push(k+':owns-related');}
 if(x.house===c.location&&k!==c.lord){n+=1.1;links.push(k+':with-ruler-house');}
 value+=n*scale;
 }one(p.md,1);if(p.ad!==p.md)one(p.ad,.88);else value*=1.14;if(p.pd&&p.pd!==p.ad)one(p.pd,.30);return {weight:Math.round(value*100)/100,links};}
function transitYear(t,y,house){const notes=(y?.notes||[]).filter(x=>Number(x.focus)===house&&['Jupiter','Saturn','Rahu','Ketu'].includes(j().norm(x.planet))&&x.evidence?.marks?.length);return notes.map(n=>({planet:j().norm(n.planet),focus:house,marks:n.evidence.marks,signal:Number(n.evidence.signal)||0,yearFrom:y.from,yearTo:y.to,observedOn:y.date,score:((n.strength||0)*2)+Math.abs(Number(n.evidence.signal)||0),source:'upstream Swiss transit reading',textEvidence:n.text})).sort((a,b)=>b.score-a.score);}
function inPeriod(y,p){return y.from<p.to&&y.to>p.from;}
function linkedTransits(t,p,house){return (t?.transitYears||[]).filter(y=>valid(y.from)&&valid(y.to)&&inPeriod(y,p)&&valid(y.date)&&y.date>=p.from&&y.date<p.to).flatMap(y=>transitYear(t,y,house)).sort((a,b)=>b.score-a.score);}
function scoreWindow(d,c,p,t){const base=activation(d,c,p),note=linkedTransits(t,p,c.house)[0]||null;return {...base,period:p,periodPlanetHouses:{md:d.planets[p.md]?.house||null,ad:d.planets[p.ad]?.house||null,pd:p.pd?d.planets[p.pd]?.house||null:null},transit:note,coincidence:!!(note&&base.weight>=3),priority:base.weight+(note?Math.min(1.6,note.score/8):0)};}
function timeline(d,claims,t,birth){const all=periods(t,birth),perHouse=Object.fromEntries(claims.map(c=>[c.house,[]])),chronology=[];
 const calculatedPD=computePD(all,t),pdChronology=[],pdRejected={sameRuler:0,noDistinctEvidence:0};
 // Use upstream-supplied PD dates FIRST; do not turn an independently dated
 // PD into a proportional guess. Derived periods fill only complete ADs
 // where an actual PD is not present.
 const actualPD=all.filter(p=>p.pd&&valid(p.from)&&valid(p.to)).map(p=>({...p,source:'upstream dated PD',approximateDayBoundaries:false}));
 const pdInputs=[...actualPD,...calculatedPD.segments].sort((a,b)=>a.from.localeCompare(b.from)||a.to.localeCompare(b.to));
 for(const p of pdInputs){
   // MD/AD alone already explains this same planet's natal connection;
   // without a third independent trigger, printing another lengthy paragraph
   // would only pad the report with a relabelled repetition.
   if(p.pd===p.md||p.pd===p.ad){pdRejected.sameRuler++;continue;}
   const ranked=claims.map(c=>({claim:c,...scoreWindow(d,c,p,t)})).sort((a,b)=>b.priority-a.priority||a.claim.house-b.claim.house);
   const x=ranked.find(w=>{
     if(w.weight<3||!w.links.some(y=>y.startsWith(p.pd+':')))return false;
     const direct=(w.claim.all||[]).some(e=>e.planet===p.pd&&['lord','occupies','aspects'].includes(e.relation)&&Math.abs(e.delta)>=.16);
     return direct;
   });
   if(!x){pdRejected.noDistinctEvidence++;continue;}
   pdChronology.push({period:p,claim:x.claim,house:x.claim.house,weight:x.weight,links:x.links,transit:x.transit,periodPlanetHouses:x.periodPlanetHouses,thirdRulerWitness:(x.claim.all||[]).filter(e=>e.planet===p.pd)});
 }

 for(const p of all){const ranked=claims.map(c=>({...scoreWindow(d,c,p,t),claim:c})).sort((a,b)=>b.priority-a.priority||a.claim.house-b.claim.house);
 const selected=ranked.filter(x=>x.weight>=2.4).slice(0,3); const chosen=selected.length?selected:ranked.slice(0,1).map(x=>({...x,weakConnection:true}));
 const primary=chosen[0];if(primary.weight>=2.4&&primary.links.length)chronology.push({period:p,mainHouse:primary.claim.house,mainWeight:primary.weight,mainClaim:primary.claim,transit:primary.transit,secondaryHouses:chosen.slice(1).map(x=>x.claim.house),weakConnection:false,evidence:primary.links,periodPlanetHouses:primary.periodPlanetHouses});
 for(const x of selected)perHouse[x.claim.house].push(x);
 }
 for(const [key,rows] of Object.entries(perHouse))perHouse[key]=rows.sort((a,b)=>b.priority-a.priority||a.period.from.localeCompare(b.period.from)).slice(0,3).sort((a,b)=>a.period.from.localeCompare(b.period.from));
 // Every supplied forecast year is kept, but only computed transit notes qualify for judgement.
 const years=(t?.transitYears||[]).filter(y=>valid(y.from)&&valid(y.to)).map(y=>{const ranked=claims.flatMap(c=>transitYear(t,y,c.house).slice(0,1).map(n=>({claim:c,n}))).sort((a,b)=>b.n.score-a.n.score);
 const period=valid(y.date)?all.find(p=>p.from<=y.date&&p.to>y.date)||null:null; // never combine a transit sample with an unrelated earlier/later subperiod
 const linked=period?ranked.find(x=>activation(d,x.claim,period).weight>=2.4):null;
 const selected=linked||null;return {from:y.from,to:y.to,date:y.date,age:ageAt(birth,y.date),year:y.forecastYear,period,house:selected?.claim.house||null,claim:selected?.claim||null,transit:selected?.n||null,confirmedConvergence:!!linked,notesAvailable:(y.notes||[]).length,pass:!!linked,sourceSignature:linked?`${linked.claim.house}/${linked.n.planet}/${period?.md}/${period?.ad}`:null};});
 return {all,perHouse,chronology,years,pdChronology,calculatedPD,meta:{calculatedPDRanges:calculatedPD.segments.length,actualPDWindows:actualPD.length,qualifiedPDWindows:pdChronology.length,skippedPDEdges:calculatedPD.skipped.length,pdFilteredAsRepetitive:pdRejected.sameRuler,pdFilteredNoIndependentEvidence:pdRejected.noDistinctEvidence,actualPeriods:all.length,computedTransitYears:years.filter(x=>x.notesAvailable>0).length,convergedYears:years.filter(x=>x.confirmedConvergence).length,pdAvailable:all.some(x=>x.pd!==null),forecastHorizonYears:t?.meta?.forecastHorizonYears||null,samplesChecked:t?.meta?.samplesChecked||0,periodEnd:all.length?all[all.length-1].to:null}};
}
/* Consecutive annual snapshots are NOT fifteen different events. Keep only
 * independently linked natal+dasha+transit windows, merge same signatures.
 * A change in a period ruler or focused house begins a new window.
 */
function groupYears(years){const out=[];
 for(const y of years){
  if(!y.pass||!y.claim||!y.transit||!y.period){const last=out[out.length-1];
   if(last&&last.kind==='insufficient'&&last.to===y.from){last.to=y.to;last.years++;}
   else out.push({kind:'insufficient',from:y.from,to:y.to,years:1});continue;}
  // A transit year can straddle an AD boundary. Its event window must be
  // constrained to the actual MD/AD intersection, never to the full year.
  const eventFrom=y.from>y.period.from?y.from:y.period.from;
  const eventTo=y.to<y.period.to?y.to:y.period.to;
  if(eventTo<=eventFrom)continue;
  const signature=`${y.claim.house}:${y.claim.conclusion}:${y.claim.location}:${y.period.md}:${y.period.ad}:${y.transit.planet}`;
  const last=out[out.length-1];
  // Only truly adjacent intervals with SAME MD/AD, life focus and sampled
  // transit may be merged; non-adjacent recurrences remain separate windows.
  if(last&&last.kind==='event'&&last.signature===signature&&last.to===eventFrom){
   last.to=eventTo;last.years++;last.samples.push(y.date);last.observations.push(y.transit.signal);
  }else out.push({kind:'event',signature,from:eventFrom,to:eventTo,years:1,
   focusHouse:y.house,claim:y.claim,period:y.period,transit:y.transit,
   samples:[y.date],observations:[y.transit.signal],age:y.age,recurrences:[]});
 }
 return out;
}

return Object.freeze({timeline,ageAt,periods,activation,transitYear,groupYears,computePD});
});

;

/* ---- prediction-timing-validation.js (preserves original execution order) ---- */
/* SMV ASTRO — strictly validate existing V311 MD/AD/PD and transit inputs.
 * This is an interpretation-input boundary, NOT an ephemeris, birth, payment,
 * dasha, chart, or PDF calculation replacement.  Preserve computed PD output.
 * Load after timing.js, before integrated.js.
 */
(function(root){'use strict';
 const original=root.SMVD311Timing;
 if(!original||typeof original.timeline!=='function'||original.strictCalendarGuard===true)return;
 const ISO=/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;
 function validDate(value){
  if(typeof value!=='string'||!ISO.test(value))return false;
  const timestamp=Date.parse(value+'T00:00:00.000Z');
  return Number.isFinite(timestamp)&&new Date(timestamp).toISOString().slice(0,10)===value;
 }
 const validRange=(from,to)=>validDate(from)&&validDate(to)&&from<to;
 const inRange=(date,from,to)=>date>=from&&date<to;
 function prepare(source){
  const t=source&&typeof source==='object'?source:{};
  const reference=validDate(t.referenceDate)?t.referenceDate:validDate(t.from)?t.from:null;
  const end=validDate(t.end)?t.end:null;
  // Explicitly malformed forecast metadata must not silently disable bounds.
  const malformedBounds=(t.referenceDate!=null&&!validDate(t.referenceDate))||
    (t.end!=null&&!validDate(t.end))||Boolean(reference&&end&&reference>=end);
  const dasha=(Array.isArray(t.dasha)?t.dasha:[]).filter(p=>p&&validRange(p.from,p.to));
  const transitYears=(Array.isArray(t.transitYears)?t.transitYears:[])
   .filter(y=>y&&validRange(y.from,y.to)&&(!reference||y.to>reference)&&(!end||y.from<end))
   .map(y=>{
    const validSample=!malformedBounds&&validDate(y.date)&&inRange(y.date,y.from,y.to)&&
      (!reference||y.date>=reference)&&(!end||y.date<end);
    // Retain the forecast-year row so that the original engine explicitly
    // reports an insufficient-evidence window instead of fabricating an event.
    return validSample?y:{...y,date:null,notes:[]};
   });
  return {...t,dasha,transitYears};
 }
 function timeline(d,claims,forecast,birth){
  return original.timeline(d,claims,prepare(forecast),validDate(birth)?birth:null);
 }
 function periods(forecast,birth){return original.periods(prepare(forecast),validDate(birth)?birth:null);}
 function computePD(rows,forecast){
  const validRows=(Array.isArray(rows)?rows:[]).filter(p=>p&&validRange(p.from,p.to));
  return original.computePD(validRows,prepare(forecast));
 }
 function ageAt(birth,on){return validDate(birth)&&validDate(on)&&birth<=on?original.ageAt(birth,on):null;}
 const guarded=Object.freeze({...original,validDate,validRange,prepare,timeline,periods,computePD,ageAt,strictCalendarGuard:true});
 root.SMVD311Timing=guarded;
 if(typeof module==='object'&&module.exports)module.exports=guarded;
})(typeof window==='object'?window:globalThis);

;

/* ---- narrative.js (preserves original execution order) ---- */
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
// House-specific implications of a ruler governing more than one life domain.
// The underlying co-lordship is verified in the judgement object.
const CROSS_TA={
 1:'சொந்த முடிவுகளிலும் உடலுழைப்பிலும் அதன் விளைவு தெரியலாம்',
 2:'குடும்ப வரவும் சேமிப்புக்கான முடிவுகளும் அதோடு இணையும்',
 3:'உடன்பிறந்தோர் தொடர்பு, பயிற்சி அல்லது சொந்த முயற்சி அதன் வழியாக வெளிப்படும்',
 4:'வீட்டுப் பொறுப்பு, பெற்றோர் தேவைகள் மற்றும் வசிப்பிட ஏற்பாட்டிலும் அது பிரதிபலிக்கும்',
 5:'கல்வி, குழந்தைகள் அல்லது படைப்புப் பயிற்சிக்கான நேர ஒதுக்கீட்டிலும் அதன் பங்கு இருக்கும்',
 6:'வேலைப்பளு, போட்டி அல்லது கடன் ஒழுங்கைச் சீர்படுத்தும் தேவையும் அதோடு வரும்',
 7:'துணைவர் அல்லது தொழில் கூட்டாளியுடன் பொறுப்பைப் பகிர்வதிலும் அதன் விளைவு தெரியும்',
 8:'கூட்டுச் சொத்து, ஆவணம் அல்லது எதிர்பாராத செலவு சார்ந்த முடிவிலும் அதன் பங்கு இருக்கும்',
 9:'மேற்படிப்பு, பெரியோர் ஆலோசனை அல்லது தொலைதூர முயற்சிக்கு அது வழிகாட்டலாம்',
 10:'தொழில் முடிவு, பதவி மற்றும் பணிப் பொறுப்பில் அது தெளிவாக வெளிப்படும்',
 11:'நண்பர், வாடிக்கையாளர் தொடர்பு அல்லது வருமான வாய்ப்புக்கும் அது பரவக்கூடும்',
 12:'தூரத்திலுள்ள கடமை, செலவு மற்றும் ஓய்வுக்கான நேரத்திலும் அது தாக்கம் செலுத்தலாம்'
};
/* Distinct observed-life translations for natal condition versus MD/AD versus
 * sampled transit. A single house judgement must not be pasted three times. */
const PERIOD_TA=[
 ['தன் முடிவை நடைமுறையாக்கும் பொறுப்பு உயரலாம்','முடிவு எடுப்பதற்கு முன் பிறர் கோரிக்கைகளைச் சீர்செய்ய நேரலாம்','சொந்த திட்டமும் குடும்பத் தேவையும் ஒரே நேரத்தில் கவனம் பெறலாம்'],
 ['வருமானத்தைச் சேமிப்பாக ஒதுக்கும் முடிவுகள் முன்னேறலாம்','குடும்பச் செலவும் முன் ஒப்புக்கொண்ட தொகையும் சேமிப்பில் அழுத்தம் தரலாம்','பேச்சு மற்றும் செலவுப் பொறுப்புகளைச் சரிபார்க்க வேண்டியிருக்கும்'],
 ['ஒரு திறனைத் தொடர்ந்து பயன்படுத்தும் வாய்ப்பு கிடைக்கலாம்','செய்யத் தொடங்கிய வேலையின் முறையை மாற்ற நேரலாம்','பயிற்சி மற்றும் உடன்பிறப்புகளுக்கான நேரத்தைப் பகிர நேரலாம்'],
 ['வீடு அல்லது குடும்பப் பராமரிப்பிற்கான ஏற்பாடு வளரலாம்','வீட்டுச் செலவோ பெற்றோர் தேவையோ திட்டத்தைத் தாமதப்படுத்தலாம்','வசிப்பிட முடிவு மற்றும் அன்றாட பொறுப்புகளை இணைக்க நேரலாம்'],
 ['கற்றல் அல்லது படைப்புப் பயிற்சியில் முன்னேற்றம் அமையலாம்','படிப்பில் இடைவெளி ஏற்பட்டால் பழைய திட்டத்தைத் திருத்த நேரலாம்','கல்வியும் குழந்தைகள் சார்ந்த கடமையும் சமநிலைப்படுத்தப்படலாம்'],
 ['பணிச்சிக்கலைத் தீர்க்கும் திறன் மதிக்கப்படலாம்','போட்டியும் வேலைப்பளுவும் அன்றாட ஒழுங்கை மாற்றலாம்','உழைப்பிற்கும் ஓய்விற்கும் தனித்த எல்லை அமைக்க வேண்டியிருக்கும்'],
 ['கூட்டாளியுடன் உடன்பாட்டை உறுதிசெய்ய வாய்ப்பு அமையலாம்','கருத்து வேறுபாடு ஏற்பட்டு பொறுப்பைப் புதிதாகப் பகிர நேரலாம்','உறவில் நேரம், செலவு, கடமையைத் தெளிவாக்க வேண்டியிருக்கும்'],
 ['பழைய ஆவணங்களையும் பகிர்ந்த சொத்தையும் சீர்செய்ய வாய்ப்பு கிடைக்கலாம்','மறுசீரமைப்பு அல்லது கூடுதல் பொறுப்பு காரணமாகத் திட்டம் மாறலாம்','பாதுகாப்புக்கும் புதிய முயற்சிக்கும் இடையில் முடிவு செய்ய நேரலாம்'],
 ['கற்றவரின் ஆலோசனை நடைமுறை வாய்ப்பாக மாறலாம்','மேற்படிப்பு அல்லது தூர முயற்சிக்கான காலத் திட்டம் மாறலாம்','ஆலோசனையைச் சொந்த அனுபவத்துடன் ஒப்பிட வேண்டியிருக்கும்'],
 ['பணியில் செய்த பங்களிப்புக்குப் பொறுப்பும் அங்கீகாரமும் கூடலாம்','வேலைப் பாதை அல்லது பொறுப்பில் மாற்றம் அவசியமாகலாம்','வேலையின் அளவும் அதன் பலனும் ஒப்பிட்டுப் பார்க்கப்படும்'],
 ['தொடர்புகளின் மூலம் ஆதாய வாய்ப்புகள் உருவாகலாம்','எதிர்பார்த்த பண வரவு தாமதமாகலாம்','முடிவடைந்த வரவுக்கும் உறுதிப்படாத வரவுக்கும் வேறுபாடு தேவைப்படும்'],
 ['செலவு திட்டமிட்டதாகவும் ஓய்வு ஒழுங்கானதாகவும் மாறலாம்','வெளியூர் அல்லது குடும்பத் தேவையால் புதிய செலவுகள் சேரலாம்','தூரக் கடமைகளும் உறக்க நேரமும் மறுசீரமைக்கப்படலாம்']
];
const PERIOD_EN=[
 ['personal initiative may carry greater responsibility','other people’s expectations may delay a personal choice','personal aims and family needs may need balancing'],
 ['a regular saving decision may become possible','household commitments may press against available savings','cash flow and spending promises may require review'],
 ['practical skills may find repeated use','an initiative may need restructuring','practice and sibling obligations may compete for time'],
 ['a home arrangement may become easier to sustain','care and housing costs may defer a planned move','home arrangements may need adjusting to daily duties'],
 ['education or creative practice may advance','a study plan may have to change after disruption','learning and younger-family responsibilities may need balancing'],
 ['difficult duties may build professional trust','competition may force a change in working routines','work and recovery may require firmer boundaries'],
 ['a shared agreement may become more stable','a partner may request a different distribution of responsibilities','terms of time and spending may need clarification'],
 ['joint records and long-standing agreements may be improved','unexpected restructuring may change agreed priorities','security and change may need balancing'],
 ['mentorship may support an important choice','travel or advanced study could be delayed','advice may have to be reconciled with personal experience'],
 ['sustained work may bring responsibility and recognition','a role or working practice could require revision','workload may need to be compared with its actual reward'],
 ['useful networks may open an income route','an expected payment may arrive later','received income should be distinguished from projections'],
 ['planned expenses may leave more room for rest','distance and care obligations may increase costs','private time and long-distance demands may need readjusting']
];
function classicSentence(c,d,ta,seen){
 // Only a demonstrated relationship may add a classical-style inference.
 // Mention the two actual planets and the current life topic, not a yoga label
 // that the simple association cannot conclusively establish.
 const rules=d.classical||[],first=(keys)=>keys.map(k=>rules.find(r=>r.key===k)).find(Boolean);
 const r=first(['PARIVARTANA','DHANA_2_11_LINK','GURU_COUNTER_ASPECT','KENDRA_TRIKONA_LINK','DUSTHANA_LORD_LINK']);
 if(!r||seen?.has(r.key))return [];
 if(seen)seen.add(r.key);
 const names=r.planets.map(k=>actor(k,ta)).join(ta?'–':' and ');
 const subject=ta?`இந்த ${c.house}-ஆம் பாவத்தின் ${c.topicTA[0]} விஷயத்தில்`:`For house ${c.house} (${c.topicEN[0]})`;
 const note={
 PARIVARTANA:[`${names} இடையே உண்மையான அதிபதி–பாவ இடமாற்றம் இருப்பதால், இரு துறைகளின் பரஸ்பர பொறுப்பை ஒப்பிட்டு முடிவெடுக்க வேண்டும்.`,`${names} mutually exchange house rulership positions. Both connected life areas need to be considered together.`],
 DHANA_2_11_LINK:[`${names} அதிபதிகளின் நேரடித் தொடர்பு வருமானம் கிடைப்பதற்கும் அதைச் சேமிப்பதற்கும் உள்ள வேறுபாட்டைக் காட்டுகிறது.`,`${names} link income sources to savings decisions, rather than proving wealth.`],
 GURU_COUNTER_ASPECT:[`குருவின் பார்வையுடன் கட்டுப்படுத்தும் பார்வையும் சேர்ந்திருப்பதால் சாதக–பாதகக் காரணங்களைத் தனித்தனியாக அளவிட வேண்டியுள்ளது.`,`A Jupiter aspect coincides with a restrictive aspect; neither automatically cancels the other.`],
 KENDRA_TRIKONA_LINK:[`${names} அதிபதிகள் இணைந்திருப்பது வாய்ப்பு உருவாகும் தொடர்பாகும்; இந்தத் தொடர்பை மட்டும் முழு ராஜயோகம் என நிர்ணயிக்கவில்லை.`,`The observed connection between ${names}, angular and trinal rulers, is supportive, not proof of an unqualified royal yoga.`],
 DUSTHANA_LORD_LINK:[`ஆறு/எட்டு/பன்னிரண்டு இடங்களில் அதிபதித் தொடர்பு இருப்பினும், தனியே விபரீத ராஜயோகம் என உறுதிப்படுத்த முடியாது.`,`The difficult-house ruler's placement does not, by itself, confirm Viparita Raja Yoga.`]
 }[r.key];
 if(!note)return [];
 return [ta?`${subject}, ${note[0]}`:`${subject}, ${note[1]}`];
}
function divisionSentence(c,d,ta){const div=d.divisionEvidence||[],lord=div.find(v=>v.planet===c.lord),karaka=div.find(v=>v.planet!==c.lord);if(!lord&&!karaka)return '';
 const label=(x)=>`${x.division} ${actor(x.planet,ta)}`;
 if(lord&&karaka&&lord.dignity!==karaka.dignity&&lord.dignity!=='neutral'&&karaka.dignity!=='neutral')return ta?`${label(lord)} வலிமை ${lord.dignity==='strong'?'உயர்ந்தாலும்':'குறைந்தாலும்'}, ${label(karaka)} அதற்கு மாறான நிலை கொண்டிருப்பதால், இத்துறையில் ஒரே பக்கத் தீர்ப்பு வழங்கப்படவில்லை.`:`${label(lord)} and ${label(karaka)} have opposing dignities; the division does not justify a one-sided conclusion.`;
 return div.filter(x=>x.dignity!=='neutral').map(x=>ta?`${label(x)} ${x.reason==='own'?'சொந்த ராசியில்':x.reason==='exalted'?'உச்ச ராசியில்':'நீச ராசியில்'} இருப்பது பிறப்புப் பாவத்தின் மதிப்பீட்டிற்குத் துணை ஆதாரம்; தனியாக நிகழ்வு உறுதி அல்ல.`:`${label(x)} is ${x.reason} in the supplied divisional chart, providing secondary context rather than an event guarantee.`).join(' ');
}
/* Inter-domain outcomes: require observed lord-placement and/or distinct ownership.
 * BVR How to Judge I PDF pp.30-31 and The Art and Science II pp.225-226:
 * a house lord carries the meanings of BOTH houses; dignity, occupants,
 * contradictory varga evidence all qualify the outcome. Not literal aphorisms. */
function domainConsequences(c,ta){
 const owned=(c.otherLordships||[]),n=c.house,h=c.location,k=actor(c.lord,ta);
 const dual=owned[0]||null,neg=c.negative?.[0],pos=c.positive?.[0];
 const actual=ta?`${k} ${n}-ஆம் பாவத்தின் அதிபதியாகி ${h}-ஆம் பாவத்தில் இருப்பதால்`:
 `${k}, lord of house ${n}, occupies house ${h};`;
 const cross=(n===10&&h===2)?(owned.includes(11)?
 ['தொழிலில் ஏற்கும் கூடுதல் வேலை குடும்பத்திற்குக் கிடைக்கும் வருவாயுடன் இணைகிறது; வருமானம் பெறுதல், சேமிக்க முடிதல் இரண்டும் ஒன்றல்ல.',
 'Additional career work may affect household income, but actual receipts and accumulated savings require separate assessment.']:
 owned.includes(9)?['தொழில் வருவாயை உயர்த்த ஆசிரியர் ஆலோசனை, உயர்கல்வி அல்லது பயிற்சி முக்கிய பங்கு பெறலாம்; அதற்கான செலவு மற்றும் குடும்பத் தேவை சமநிலையில் இருக்க வேண்டும்.',
 'Mentorship and learning may shape career income; training costs and family obligations need a separate decision.']:null):
 n===7&&[8,12].includes(h)?['உறவில் இணையும் செலவு, தனிநேரம் அல்லது பகிர்ந்த ஆவணங்கள் பற்றிய தெளிவு இல்லாவிட்டால் ஒப்பந்தம் நீளலாம்; இதை திருமணத் தடையாக மட்டும் முடிவு செய்ய முடியாது.',
 'Shared spending, time away or records may need negotiation; this alone does not prove a marriage delay.']:
 n===5&&h===8?['கல்வித் திட்டம் அல்லது குழந்தைகள் தொடர்பான பொறுப்பு மாற்றமடையும் போது உடனடி முடிவைக் காட்டிலும் ஆவணம், பயிற்சி மற்றும் குடும்ப ஆதரவைச் சரிபார்க்க வேண்டியிருக்கும்.',
 'Study or child-related responsibilities may be reorganized; training, documentation and support matter before a definite conclusion.']:
 n===4&&[7,10,12].includes(h)?['வீடு குறித்த முடிவில் தொழிலின் நேரம், கூட்டு உடன்பாடு அல்லது வெளியூர் வசிப்பு சேர்ந்திருக்கும்; சொத்துப் பலனை தனியாகப் பிரித்து உறுதிசெய்ய முடியாது.',
 'Home decisions may intersect work, agreements or time away; property results cannot be read in isolation.']:
 n===2&&[8,11].includes(h)?['வருமானம் மற்றும் கையில் தங்கும் தொகைக்கு இடையில் பகிர்ந்த கடமை அல்லது உறுதியாகக் கிடைக்கும் பணத்தின் வேறுபாடு இருக்கும்; இதை முன்கூட்டியே கணக்கில் கொள்ள வேண்டும்.',
 'Income and retained savings may diverge through shared commitments or timing of actual receipts.']:
 n===10&&h===6?['போட்டி, பழுதைச் சரிசெய்தல் அல்லது பிறர் சிக்கலைத் தீர்ப்பது தொழிலில் பெயர் கிடைக்கும் வழியாகலாம்; வேலைப்பளு தாங்கும் நேரம் முக்கியம்.',
 'Competition and solving others’ problems may become a career channel; available time and capacity remain limiting factors.']:null;
 const interference=(neg&&pos)?(ta?`இங்கு ${actor(neg.planet,true)}-ன் பாதகத் தொடர்பு இருந்தாலும் ${actor(pos.planet,true)} வழங்கும் சாதகத் தொடர்பையும் சேர்த்து மதிப்பிட வேண்டும்.`:
 `Restrictive ${neg.planet} evidence must be weighed with constructive ${pos.planet} evidence.`):'';
 if(!cross&&!dual)return [];
 const text=cross?(ta?`${actual}, ${cross[0]} ${interference}`:`${actual} ${cross[1]} ${interference}`):'';
 const dualText=(dual&&dual!==n)?(ta?
 `${k} ${dual}-ஆம் பாவத்திற்கும் அதிபதியாக இருப்பதால், இரண்டு துறைகளிலும் ஒரே கிரகத்தின் வலிமை செயல்படுகிறது; ${AREA_TA[dual-1]} சார்ந்த முடிவுகள் ${AREA_TA[n-1]} பற்றிய முடிவை மாற்றக்கூடும்.`:
 `The same ${k} also rules house ${dual} (${AREA_EN[dual-1]}), so its actual natal condition affects both that area and ${AREA_EN[n-1]}.`):'';
 return [text].filter(Boolean);
}
function relevantVargaContrast(c,ta){
 const info=c.divisionEvidence||[];
 const unique=info.filter((x,i)=>info.findIndex(y=>y.division===x.division&&y.planet===x.planet)===i);
 if(!unique.length)return '';
 const lord=unique.filter(x=>x.planet===c.lord),reverse=lord.find(x=>x.dignity==='weak'),lift=lord.find(x=>x.dignity==='strong');
 const sep=(unique.map(x=>`${x.division} ${actor(x.planet,ta)}`)).join(ta?' மற்றும் ':', ');
 if(reverse&&lift)return ta?`${sep} பதிவுகளில் ஒரே பாவாதிபதிக்கு பலவீனமும் வலிமையும் வேறு வர்க்கங்களில் தெரிகின்றன. ${c.house}-ஆம் பாவத்தின் வாழ்க்கைத் துறையை ஒரே வர்க்கத்தை வைத்து உறுதி செய்ய முடியாது.`:
 `${sep} show differing conditions of the same lord across supplied divisions; the result cannot be reduced to one placement.`;
 if(reverse)return ta?`${reverse.division} கட்டத்தில் ${actor(reverse.planet,true)} நீசநிலை பெறுவது ${c.house}-ஆம் பாவத்தின் தீர்ப்பில் மறுபரிசீலனைக்குரிய எதிர் ஆதாரம். D1 ஆதாரம் இல்லாமல் இதைத் தனியாக தோஷம் எனக் கூற முடியாது.`:
 `${reverse.planet} is debilitated in supplied ${reverse.division}; that qualifies the house reading, without creating an independent dosha.`;
 if(lift)return ta?`${lift.division} கட்டத்தில் ${actor(lift.planet,true)} ${lift.reason==='own'?'ஆட்சி':'உச்ச'} பலம் பெற்றிருப்பது ${c.house}-ஆம் பாவத்தில் கிடைக்கும் ஆதரவிற்கான துணைச் சுட்டு. ஆனால் பிறப்புப் பாவத்தின் தடையை அது தனியே நீக்காது.`:
 `${lift.planet} gains ${lift.reason==='own'?'own-sign':'exaltation'} dignity in supplied ${lift.division}, a corroborating factor rather than automatic cancellation.`;
 return '';
}
/* House lord and independent natural karaka are separate witnesses.
 * Raman I PDF pp.30-31, not a rule that a karaka alone proves an event. */
function karakaWitness(c,ta){
 const entries=(c.all||[]).filter(x=>x.relation==='karaka'&&x.planet!==c.lord&&Number.isInteger(x.planetHouse)&&Math.abs(x.delta)>=.06);
 const a=entries.sort((x,y)=>Math.abs(y.delta)-Math.abs(x.delta))[0];if(!a)return '';
 const ruler=actor(c.lord,ta),ind=actor(a.planet,ta),subject=ta?AREA_TA[c.house-1]:AREA_EN[c.house-1];
 const domain=ta?AREA_TA[a.planetHouse-1]:AREA_EN[a.planetHouse-1];
 const status=a.delta<0?(ta?'துணைச் சுட்டில் கட்டுப்பாடு தென்படுகிறது':'the second witness is restrictive'):
 (ta?'துணைச் சுட்டில் சாதகத் தொடர்பு தென்படுகிறது':'the second witness is supportive');
 const opposition=c.positive.length>0&&c.negative.length>0;
 return ta?`இந்தப் பலனுக்கு ${ruler} என்ற பாவாதிபதி மட்டுமல்ல, இயற்கைக் காரகரான ${ind} பிறப்பில் ${a.planetHouse}-ஆம் இடத்தில் இருப்பதும் தனி ஆதாரம். அதனால் ${subject} பற்றிய முடிவு ${domain} சம்பந்தமான சூழலால் பாதிக்கப்படலாம்; ${status}. ${opposition?'சாதகமும் பாதகமும் இரண்டும் இருப்பதால் ஒரே முடிவை முன்கூட்டியே உறுதிசெய்ய முடியாது.':''}`:
 `The ruler ${ruler} is not the only witness for ${subject}. Its distinct natural significator ${ind} occupies natal house ${a.planetHouse} (${domain}); ${status}. ${opposition?'Both supportive and adverse factors qualify the interpretation.':''}`;
}
function actor(k,ta){return ta?(J().NTA[k]||k):k;}
/* A result is selected by Judgement.decide() BEFORE any text is rendered.
 * Natural language here is deterministic. No random template choice, no
 * fabricated dates, no vacant phrases presented as chart evidence.
 */
function evidenceName(v,ta){return actor(v.planet,ta);}
function relationTA(v,c){const n=evidenceName(v,true);
 return v.relation==='lord'?`${n} ${c.house}-ஆம் பாவத்திற்கு அதிபதியாக இருப்பது`:
 v.relation==='occupies'?`${n} இந்தப் பாவத்தில் அமர்ந்திருப்பது`:
 v.relation==='aspects'?`${n} இந்தப் பாவத்தைப் பார்ப்பது`:`${n} காரகத் தொடர்பு பெறுவது`;
}
function relationEN(v,c){const n=v.planet;
 return v.relation==='lord'?`${n} rules the ${c.house} house`:
 v.relation==='occupies'?`${n} occupies this house`:
 v.relation==='aspects'?`${n} aspects this house`:`${n} is a relevant significator`;
}
function roleOf(p,c,ta){const owner=(p===c.lord),occ=c.houseOccupants.includes(p),asp=c.houseAspects.includes(p);
 if(ta)return owner?'அதிபதித் தொடர்பு':occ?'நேரடி இருப்பிடம்':asp?'பார்வைத் தொடர்பு':'தொடர்புடைய பிறப்பு நிலை';
 return owner?'rulership':occ?'occupation':asp?'aspect':'natal association';}
function natal(c,lang,seenClassical){const ta=lang!=='en',d=J().decide(c);if(!d)return [];
 const primary=ta?d.leadTA:d.leadEN,link=ta?d.linkTA:d.linkEN,lord=actor(d.lord,ta);
 const ownership=ta?`${c.house}-ஆம் பாவத்தை ஆளும் ${lord}, பிறப்பில் ${c.location}-ஆம் பாவத்தில் அமர்ந்திருக்கிறார்.`:
  `${lord} rules house ${c.house} and occupies natal house ${c.location}.`;
 const scene=ta?`${d.completedTA} ${ownership}`:
  `The central theme is ${primary}. ${ownership} It is therefore linked with ${link}.`;
 const other=d.otherLordships.filter(x=>x!==c.house);
 const cross=other.length?(ta?`${lord} ${other.map(x=>x+'-ஆம்').join(', ')} பாவத்திற்கும் அதிபதியாக இருப்பதால், ${other.map(x=>CROSS_TA[x]).filter(Boolean).join('; ')}.`:
  `The same ruler also governs ${other.map(x=>AREA_EN[x-1]).join(' and ')}, so these life themes are connected.`):'';
 const pos=d.positive.find(x=>x.delta>=.16),neg=d.negative.find(x=>x.delta<=-.16);
 let balance='';
 if(pos&&neg)balance=ta?`${relationTA(pos,c)} சாதகமாக உள்ளது; அதே நேரத்தில் ${relationTA(neg,c)} காரணமாக இம்முயற்சி தடையின்றி நிறைவேறும் என்று சொல்ல இயலாது.`:
 `${relationEN(pos,c)} provides supporting evidence, while ${relationEN(neg,c)} provides an opposing factor. Neither one alone establishes a certain outcome.`;
 else if(neg)balance=ta?`${relationTA(neg,c)} இந்த முயற்சியில் தாமதம் அல்லது கூடுதல் பொறுப்பைக் காட்டுகிறது. அதைக் குறைக்கும் தனி சாதகத் தொடர்பு கணிக்கப்பட்ட இந்தப் பாவ விவரங்களில் இல்லை.`:
 `${relationEN(neg,c)} is a restrictive indicator, so this theme may involve delay or revision. There is no separate counter-indicator in the available inputs.`;
 else if(pos)balance=ta?`${relationTA(pos,c)} இவ்விஷயத்தில் சாதகமாக இருக்கிறது; குறிப்பாக ${link} தொடர்புடைய வாழ்க்கைச் சூழல் அதன் பயனை வெளிப்படுத்தக்கூடும்.`:
 `${relationEN(pos,c)} reinforces the reading through ${link}; it does not establish that an event has already occurred.`;
 const division=divisionSentence(c,d,ta);const ruleText=classicSentence(c,d,ta,seenClassical).join(' ');
 return [scene,[cross,balance,division,ruleText].filter(Boolean).join(' '),karakaWitness(c,ta),...domainConsequences(c,ta)].filter(Boolean);
}
/* A different AD is a different operative planet. The report must explain
 * that planet's observed house and its relationship to the D1 topic instead
 * of recycling a generic house-level event sentence for every sub-period. */
const AD_ROLE_TA={
 Sun:'அதிகாரமும் பொறுப்பும் தொடர்பான முடிவில் தெளிவைப் பெற வேண்டியிருக்கும்',
 Moon:'குடும்பத்தவரின் உணர்வுகளையும் அன்றாட நிம்மதியையும் கருத்தில் கொள்ள நேரிடும்',
 Mars:'அவசரத் தீர்மானத்தைத் தவிர்த்து தன்னுடைய செயல் வேகத்தை ஒழுங்குபடுத்த வேண்டியிருக்கும்',
 Mercury:'ஆவணங்கள், பேச்சுவார்த்தை, கணக்குகள் ஆகியவற்றின் துல்லியம் முக்கியமாகும்',
 Jupiter:'பெரியோர் ஆலோசனை, கற்றல் மற்றும் நீண்டகால நன்மை ஆகியவற்றை ஒப்பிட வேண்டியிருக்கும்',
 Venus:'உறவு, ஒப்புதல், வசதிக்கான செலவு ஆகியவற்றில் சமநிலை தேவைப்படும்',
 Saturn:'நீடிக்கும் கடமை, வேலை நேரம் மற்றும் பொறுமைக்கான சோதனை முக்கியமாகும்',
 Rahu:'வழக்கத்திலில்லாத யோசனை அல்லது புதிய தொடர்பின் நம்பகத்தன்மையை ஆராய வேண்டியிருக்கும்',
 Ketu:'பழையதை விட்டு மாறும் எண்ணத்துக்கு முன் நிறைவேறாத பொறுப்பைச் சரிபார்க்க வேண்டியிருக்கும்'
};
const AD_ROLE_EN={
 Sun:'questions of authority and responsibility become prominent',Moon:'family needs and emotional steadiness require attention',
 Mars:'the pace of decisions and practical follow-through matters',Mercury:'accuracy in records and negotiations matters',
 Jupiter:'learning, counsel and long-term benefit need comparison',Venus:'relationship expectations and discretionary costs need balance',
 Saturn:'enduring obligations and sustainable work routines matter',Rahu:'unusual opportunities require careful independent verification',
 Ketu:'plans to withdraw or change course require a review of unfinished duties'
};
const AD_ROLE_CHILD_TA={Sun:'ஆசிரியரிடம் பொறுப்பை ஏற்று முடிப்பதில் நிதானம் தேவைப்படும்',Moon:'குடும்ப ஆதரவும் அன்றாடக் கற்றல் பழக்கமும் முக்கியமாகும்',Mars:'விளையாட்டிலும் பயிற்சியிலும் அவசரத்தை விட ஒழுங்கு முக்கியம்',Mercury:'பாடக் குறிப்பும் தகவல்தொடர்பும் தெளிவாக இருக்க வேண்டும்',Jupiter:'ஆசிரியர் வழிகாட்டலும் பாடத்தில் ஆர்வமும் துணையாகும்',Venus:'நண்பர்களுடன் ஒத்துழைக்கும் பழக்கமும் படைப்புப் பயிற்சியும் முக்கியமாகும்',Saturn:'வீட்டுப்பாடம் மற்றும் ஒழுங்கான பயிற்சியில் பொறுமை தேவைப்படும்',Rahu:'புதிய தகவலை ஆசிரியர் அல்லது பெற்றோருடன் சரிபார்க்க வேண்டும்',Ketu:'தனித்து முடிவு செய்யும் முன் பெரியோரிடம் ஆலோசனை கேட்க வேண்டும்'};
const AD_ROLE_CHILD_EN={Sun:'assigned school responsibilities need careful follow-through',Moon:'family support and everyday learning routines matter',Mars:'safe play and steady practice matter more than haste',Mercury:'accurate class notes and communication are important',Jupiter:'teacher guidance and curiosity in learning are relevant',Venus:'peer cooperation and creative practice matter',Saturn:'patience with homework and routines is needed',Rahu:'new information should be verified with teachers or parents',Ketu:'caregiver advice matters before withdrawing from activities'};
const CHILD_PERIOD_TA=[
 ['ஒரு பொறுப்பைத் தானே செய்து முடிக்கும் திறன் வளரலாம்','தனிப்பட்ட விருப்பத்தை பெற்றோருடன் பேசி ஒழுங்குபடுத்த நேரலாம்','திறமை வளர்ச்சிக்கும் ஓய்வுக்கும் நேரம் பகிர வேண்டியிருக்கும்'],
 ['கல்வித் தேவைகளைப் பெற்றோரிடம் தெளிவாகப் பகிரக் கற்றுக் கொள்ளலாம்','பள்ளிச் செலவோ வீட்டுத் தேவையோ பெற்றோர் திட்டத்தை மாற்றக் கூடும்','கல்வி வளங்களையும் குடும்பப் பழக்கங்களையும் சமப்படுத்த வேண்டும்'],
 ['பயிற்சியில் தொடர்ந்து முயற்சி செய்து முன்னேற்றம் காணலாம்','நண்பர்கள் அல்லது உடன்பிறந்தோருடன் ஒத்துழைப்புக்குக் கூடுதல் பயிற்சி தேவைப்படலாம்','புதிய திறனைப் பயிற்சி செய்வதற்கான நேரத்தை அமைக்க நேரிடும்'],
 ['வீட்டில் படிப்புக்குத் தேவையான ஆதரவு மேம்படலாம்','வீட்டுச் சூழலில் ஏற்படும் மாற்றம் படிப்பு ஒழுங்கை பாதிக்கலாம்','பெற்றோரின் உதவியுடன் தினசரி பழக்கத்தை மாற்ற நேரலாம்'],
 ['கற்றல் திறனை அடுத்த கட்டத்திற்குக் கொண்டு செல்ல முடியும்','பாடத்தில் கவனம் வைப்பதற்கான முறை மாற வேண்டியிருக்கும்','படைப்புப் பயிற்சிக்கும் பள்ளிப் பணிக்கும் நேரம் பகிர வேண்டும்'],
 ['ஒழுங்கான வீட்டுப்பாடப் பழக்கத்தால் நம்பிக்கை உருவாகலாம்','அதிகப் பயிற்சியால் ஓய்வு குறையாமல் கவனிக்க வேண்டியிருக்கும்','உணவு, ஓய்வு, பள்ளிப் பொறுப்புகளைச் சீரமைக்க வேண்டியிருக்கும்'],
 ['வகுப்புத் தோழர்களுடன் கூட்டாகச் செயல்படக் கற்றுக்கொள்ளலாம்','நண்பர்களுக்குள் கருத்து வேறுபாட்டைப் பேசித் தீர்க்கப் பயிற்சி தேவைப்படலாம்','குழு வேலைகளில் பொறுப்புகளைச் சமமாகப் பகிர வேண்டியிருக்கும்'],
 ['பாதுகாப்பு வழிமுறைகளைப் புரிந்து பெரியோருடன் செயல்படலாம்','திடீர் மாற்றம் வந்தால் பெற்றோரின் உதவி முக்கியமாகும்','புதிய சூழலுக்கேற்ற பாதுகாப்புப் பழக்கம் கற்றுக்கொள்ளலாம்'],
 ['ஆசிரியர் வழிகாட்டலால் புதிய பாடத்தில் ஆர்வம் வளரலாம்','கற்றல் முறை அல்லது வகுப்புச் சூழலில் மாற்றம் தேவைப்படலாம்','பெரியோரின் ஆலோசனையையும் தன் ஆர்வத்தையும் இணைக்கலாம்'],
 ['பள்ளியில் ஒப்படைக்கப்பட்ட பணியை முடித்து நம்பிக்கை பெறலாம்','பயிற்சியின் அளவு அதிகரித்தால் பணியைச் சிறிய பகுதிகளாகப் பிரிக்க வேண்டும்','பள்ளிப் பொறுப்புக்கும் விளையாட்டுக்கும் நேரம் ஒதுக்க வேண்டும்'],
 ['குழுவாகக் கற்கும் வாய்ப்புகள் அதிகரிக்கலாம்','நண்பர் வட்டத்தால் கவனம் சிதறாமல் பெரியோர் துணை தேவைப்படலாம்','குழு முயற்சிக்கும் தனிப்பட்ட படிப்புக்கும் சமநிலை தேவைப்படும்'],
 ['தினசரி ஓய்வு மற்றும் வீட்டுப் பழக்கத்தில் ஒழுங்கு மேம்படலாம்','பயணம் அல்லது வீட்டுச் சூழல் மாற்றம் உறக்கத்தை பாதிக்கலாம்','ஓய்வு மற்றும் பள்ளிப் பணியின் நேரத்தை மறுஅமைக்க நேரிடும்']
];
const CHILD_PERIOD_EN=[
 ['independent habits may improve','personal choices may require caregiver guidance','rest and training need balancing'],
 ['school needs may be communicated better','household changes may affect school resources','learning supplies and family needs require balance'],
 ['regular practice may strengthen skills','peer and sibling cooperation may need support','time is needed for training'],
 ['study support at home may improve','home changes may disrupt school routines','caregivers can help revise daily habits'],
 ['learning may advance','study routines may need adjustment','creative work and homework need balancing'],
 ['steady homework habits may improve','overtraining and lost rest should be avoided','food, sleep and schoolwork need planning'],
 ['cooperation with peers may improve','disagreements with classmates may need mediation','group duties should be shared fairly'],
 ['safety habits can be developed','unexpected changes require caregiver support','new settings require practical safety awareness'],
 ['teachers may encourage new learning','study methods may need revision','personal interests can be balanced with guidance'],
 ['school assignments may build trust','tasks may need to be broken into steps','play and study should share the schedule'],
 ['group learning may help','peer distractions may need support','team activities need balancing with study'],
 ['rest routines may improve','travel or household changes may interrupt sleep','rest and homework may need rescheduling']
];
const CHILD_AREA_TA=['சொந்த பழக்கமும் வளர்ச்சியும்','குடும்ப உரையாடலும் கல்வித் தேவைகளும்','பள்ளிப் பயிற்சியும் உடன்பிறந்தோர் ஒத்துழைப்பும்','வீடும் பெற்றோர் ஆதரவும்','படிப்பும் படைப்பாற்றலும்','வீட்டுப்பாடமும் தினசரி பழக்கமும்','நண்பர்களுடன் ஒத்துழைப்பும்','பாதுகாப்புப் பழக்கமும் பெரியோர் உதவியும்','ஆசிரியர் வழிகாட்டலும் மேற்பயிற்சியும்','பள்ளிப் பொறுப்பும் மதிப்பீடும்','குழுவாகக் கற்கும் சூழலும்','உறக்கமும் குடும்பப் பயணமும்'];
const CHILD_AREA_EN=['self-development and habits','family conversations and schooling needs','practice and sibling cooperation','home and caregiver support','education and creative learning','homework and everyday routines','cooperation with peers','safety habits and adult guidance','mentors and training','school responsibilities','teamwork and peers','sleep and family travel'];
const CHILD_CHANNEL_TA=['சொந்த பழக்கமும் வளர்ச்சியும்','குடும்ப உரையாடலும் கல்வித் தேவைகளும்','பயிற்சியும் நண்பர் அல்லது உடன்பிறந்தோர் ஒத்துழைப்பும்','வீடும் பெற்றோர் ஆதரவும்','பள்ளிக் கற்றலும் விளையாட்டும்','வீட்டுப்பாடமும் அன்றாட ஒழுங்கும்','வகுப்புத் தோழர் ஒத்துழைப்பும்','பாதுகாப்புப் பழக்கமும் பெற்றோர் வழிகாட்டலும்','ஆசிரியர் அறிவுரையும் பயிற்சியும்','பள்ளிப் பொறுப்பும் கற்றல் முன்னேற்றமும்','குழு நடவடிக்கைகளும் நட்பும்','உறக்கமும் பயணப் பழக்கமும்'];
function period(win,c,lang,opts){const ta=lang!=='en',p=win?.period,d=J().decide(c);
 if(!p?.md||!p?.ad||!d||!win?.links?.length||win.weight<2.4)return '';
 const age=p.age,child=age!==null&&age<18,senior=age!==null&&age>=65;
 const md=actor(p.md,ta),ad=actor(p.ad,ta),pd=p.pd?actor(p.pd,ta):null;
 const ph=win.periodPlanetHouses||{};const mdHouse=ph.md,adHouse=ph.ad;
 const mdLink=roleOf(p.md,c,ta),adLink=roleOf(p.ad,c,ta);
 const isAdDirect=p.ad===c.lord||c.houseOccupants.includes(p.ad)||c.houseAspects.includes(p.ad);
 const domain=ta?(child?CHILD_AREA_TA[c.house-1]:AREA_TA[c.house-1]):(child?CHILD_AREA_EN[c.house-1]:AREA_EN[c.house-1]);
 const dest=Number.isInteger(adHouse)?(ta?(child?CHILD_CHANNEL_TA[adHouse-1]:CHANNEL_TA[adHouse-1]):AREA_EN[adHouse-1]):null;
 const stage=d.stage==='support'?0:d.stage==='strain'?1:2;
 const ageText=child?(ta?({7:'இந்த வயதில் இது திருமணம் அல்ல; வகுப்புத் தோழர்களுடன் ஒத்துழைக்கக் கற்றுக் கொள்வதோடு தொடர்புடையது',10:'பள்ளிப் பயிற்சி மற்றும் கல்விப் பொறுப்பின் வழியே இந்தத் தொடர்பை வாசிக்க வேண்டும்',11:'குழுக் கற்றலும் நண்பர் வட்டமும் பிரதானமானவை'})[c.house]||'இங்கு குழந்தையின் படிப்பு, பழக்கம், குடும்ப ஆதரவு ஆகியவற்றையே முன்னிலைப்படுத்த வேண்டும்':
 'At this age the focus is on school, peers and family support rather than adult events'):
 senior?(ta?'இந்த வயதில் பணியிடப் போட்டியை மட்டுமே மையப்படுத்தாமல் அனுபவப் பகிர்வு, ஓய்வு, குடும்பப் பொறுப்புகளுக்கும் இடம் கொடுக்க வேண்டும்.':
 'At this age mentoring, rest and family priorities should be weighed alongside paid work.') : '';
 // The differentiated result is a synthesis of MD vs AD roles, AD house, and natal judgement.
 const opening=ta?`${p.from} முதல் ${p.to} வரையிலான ${md} மகாதசை – ${ad} புக்தியில் ${domain} முக்கியமாகும்.`:
 `From ${p.from} to ${p.to}, the ${md} major period and ${ad} sub-period bring attention to ${domain}.`;
 const ruler=ta?`${md} மகாதசை அதிபதிக்கும் இந்தத் துறைக்கும் உள்ள தொடர்பு ${mdLink}; ${ad} புக்தி ${adLink} மூலம் செயல்படுகிறது.`:
 `The major-period lord ${md} has ${mdLink} to this subject; the sub-period lord ${ad} contributes ${adLink}.`;
 const houseSentence=ta? (child?`${dest} பற்றிய முடிவுகளில் பெற்றோர் அல்லது ஆசிரியரின் உதவி முக்கியமாகும்.`:`${dest}.`):
    `${dest||'The operative natal house'} is a separate channel for this sub-period.`;
 const adDetail=ta?`${ad} பிறப்பு ஜாதகத்தில் ${Number.isInteger(adHouse)?adHouse+'-ஆம் பாவத்தில் இருப்பதால், ':''}${isAdDirect?'இந்தத் துறையை நேரடியாக இயக்குகிறார். ':'இந்தத் துறையுடன் துணைத் தொடர்பு பெறுகிறார். '}${dest?houseSentence+' ':''}${(child?AD_ROLE_CHILD_TA:AD_ROLE_TA)[p.ad]||''}.`:
    `${ad} ${Number.isInteger(adHouse)?'occupies natal house '+adHouse+', ':''}${isAdDirect?'directly activating this life area':'providing a secondary natal connection'}. ${dest?houseSentence+' ':''}${(child?AD_ROLE_CHILD_EN:AD_ROLE_EN)[p.ad]||''}.`;
 const pos=c.positive.find(x=>['lord','occupies','aspects'].includes(x.relation));
 const neg=c.negative.find(x=>['lord','occupies','aspects'].includes(x.relation));
 const supportText=pos?(ta?`${relationTA(pos,c)} சாதகத் துணை அளிக்கிறது`:`${relationEN(pos,c)} provides natal support`):'';
 const riskText=neg?(ta?`${relationTA(neg,c)} கடினத்தை உணர்த்துகிறது`:`${relationEN(neg,c)} signals a constraint`):'';
 const balance=ta?`${[supportText,riskText].filter(Boolean).join('; ')}${pos||neg?' என்ற ஆதாரங்களின் அடிப்படையில், ':''}${md}–${ad} காலத்தில் இந்தத் துறையைப் பற்றிய முடிவுகளை ${d.stage==='strain'?'பொறுமையுடனும் முன் தயாரிப்புடனும்':d.stage==='support'?'கிடைத்த ஆதரவைப் பயன்படுத்தி':'சாதக–பாதக நிலைகளை ஒப்பிட்டு'} மேற்கொள்ளலாம்.`:
   `${[supportText,riskText].filter(Boolean).join('; ')}. This places the ${ad} sub-period in a ${d.stage==='strain'?'more restrictive':d.stage==='support'?'supportive':'qualified'} natal context rather than predicting a certain event.`;
 const sampled=win.transit?(ta?`${actor(win.transit.planet,true)} பெயர்ச்சி ${win.transit.observedOn} அன்று கணிக்கப்பட்ட இந்தப் புக்திக்குள் வருகிறது; `:
 `A computed ${win.transit.planet} transit sample dated ${win.transit.observedOn} lies inside this sub-period.`):'';
 const trace=opts?.seen;const fresh=(key,text)=>{if(!trace)return text;if(trace.has(key))return '';trace.add(key);return text;};
 const uniqueRuler=fresh(`md:${p.md}:${c.house}:${mdLink}`,ruler);
 const uniqueAdDetail=fresh(`ad:${p.ad}:${adHouse}:${isAdDirect}:${c.house}`,adDetail);
 const uniqueBalance=fresh(`balance:${c.house}:${c.lord}:${c.location}:${pos?.planet||''}:${neg?.planet||''}`,balance);
 const pdLine=pd?(ta?`${pd} அந்தரத்தின் பெயர் தரப்பட்டுள்ளது; தனியான தொடக்கம்–முடிவு வழங்கப்படாவிட்டால் அந்தர நிகழ்வு தேதியை உருவாக்க முடியாது.`:
 `The ${pd} pratyantara name was supplied; no new sub-sub-period dates are inferred.`):'';
 return [opening,uniqueRuler,uniqueAdDetail,uniqueBalance,ageText,sampled,pdLine].filter(Boolean).join(' ');
}
function year(group,lang){if(group?.kind==='insufficient'||!group?.claim||!group?.period||!group?.transit)return '';
 const ta=lang!=='en',c=group.claim,d=J().decide(c),p=group.period;if(!d)return '';
 const md=actor(p.md,ta),ad=actor(p.ad,ta),tr=actor(group.transit.planet,ta);
 const age=group.age,child=age!==null&&age<18,subject=ta?(child?CHILD_AREA_TA:AREA_TA)[c.house-1]:(child?CHILD_AREA_EN:AREA_EN)[c.house-1];
 const signal=Number(group.transit.signal),reading=signal>0?(ta?'துணைச் சுட்டாக':'supportive context'):signal<0?(ta?'மறு ஆய்வுக்குரிய சுட்டாக':'reason for review'):(ta?'கலந்த சுட்டாக':'mixed context');
 const link=ta?`${actor(c.lord,true)} ${c.house}-ஆம் இடத்தின் அதிபதியாகி ${c.location}-ஆம் பாவத்தில் இருப்பது`:
  `${c.lord} ruling house ${c.house} from natal house ${c.location}`;
 const stage=ta?d.stage==='strain'?'உடனடி முடிவைவிடத் திட்டத்தின் பாதுகாப்பைக் கவனிப்பது பொருத்தமாகலாம்':d.stage==='support'?'ஆதரவு உள்ள இடத்தில் பொருத்தமான வாய்ப்பைத் திட்டமிட்டு பயன்படுத்தலாம்':'நன்மையும் தடையும் இணைந்திருப்பதால் ஒரே தீர்ப்பு கொடுக்க இயலாது':
  d.stage==='strain'?'the natal constraints make cautious planning important':d.stage==='support'?'the natal supports invite well-planned action':'the natal evidence remains mixed';
 const years=group.recurrences?.length?(ta?`தொடர்புடைய மற்ற கணிக்கப்பட்ட இடைவெளிகள் ${group.recurrences.map(x=>x.from+'–'+x.to).join(', ')}.`:
  `Other related computed intervals: ${group.recurrences.map(x=>x.from+'–'+x.to).join(', ')}.`):'';
 return ta?`${group.from} – ${group.to}: ${tr} பெயர்ச்சியின் ${group.transit.observedOn} கணிக்கப்பட்ட நிலை, ${md}–${ad} காலத்தில் ${subject} தொடர்பாக ${reading} வருகிறது; ஏனெனில் ${link}. இதனால் ${stage}.${child?' பள்ளி, நண்பர் மற்றும் பெற்றோர் சூழலுக்கேற்ப இதை வாசிக்கவும்.':''} ${years}`.trim():
  `${group.from} – ${group.to}: the ${tr} transit observation on ${group.transit.observedOn} falls in ${md}/${ad} as ${reading} for ${subject}, considering ${link}; ${stage}. ${child?'Interpret this through schooling, peer groups and caregiver support.':''} ${years}`.trim();
}
function summary(s,lang){if(!s?.main)return [];
 const ta=lang!=='en',main=J().decide(s.main),counter=J().decide(s.counter);if(!main)return [];
 const first=ta?`ஜாதகத்தில் முன்னிலைப்படும் வாழ்க்கைத் துறையில் ${main.completedTA} ${actor(main.lord,true)} ${main.house}-ஆம் பாவத்தை ஆண்டு, ${main.location}-ஆம் இடத்தில் அமர்ந்திருப்பதால் ${main.linkTA} தொடர்பான முடிவுகளும் உடன் வருகின்றன.`:
  `The chart's leading life theme is ${main.leadEN}. ${main.lord}, ruling house ${main.house}, occupies house ${main.location} and links it with ${main.linkEN}.`;
 const other=counter&&counter.house!==main.house?(ta?`${AREA_TA[counter.house-1]} சார்ந்த விஷயத்தில் ${counter.completedTA} இதற்கு ${actor(counter.lord,true)} ${counter.location}-ஆம் பாவத்தில் இருக்கும் அமைப்பும் தொடர்புடையதாகும்.`:
  `Another indicator concerns ${counter.leadEN} in ${AREA_EN[counter.house-1]}; the two areas have different evidence.`):'';
 return [first,other].filter(Boolean);
}
/* LONG-FORM lived-outcome layer (V311). Independent graha/nakshatra rule evidence
 * is computed in Judgement and consumed here; birth calculations stay untouched.
 * Each matter has a distinct human outcome, not a relabelled chart-position line.
 */
const SIGN_GENERAL_TA=[
 ['மேஷம்','முயற்சியைத் தொடங்குவதில் தயங்காத தன்மை இவ்வகை லக்னத்தின் பாரம்பரியக் குணமாகக் கூறப்படுகிறது. வேலை தொடங்கிய பின்னரே அதன் சவாலை முழுமையாகப் புரிந்து கொள்வது இவர்களிடம் காணப்படும் அணுகுமுறை. உடனடியாகக் கிடைக்கும் வெற்றியைவிடத் தனியாக முடிவெடுக்க முடிவதையே முக்கியமாகக் கருதலாம்.'],
 ['ரிஷபம்','வாழ்க்கையில் நிலையான அடித்தளத்தை உருவாக்கி அதன்மேல் முன்னேற விரும்பும் இயல்பு முன்வைக்கப்படுகிறது. சாப்பாடு, இருப்பிடம், பொருளாதாரப் பாதுகாப்பு போன்ற நடைமுறை தேவைகளுக்கு முன்னுரிமை கொடுக்கும் மனப்போக்கு இருக்கலாம். பழகிய சூழலை உடனடியாக மாற்றுவதற்கு முன் அதன் நன்மைகளைச் சீர்தூக்கிப் பார்க்க விரும்புவர்.'],
 ['மிதுனம்','ஒன்றைப் பற்றிய தகவலைக் கேட்டறிந்து மற்றொரு தகவலுடன் ஒப்பிடும் ஆர்வம் இவ்வகை லக்னத்தின் இயல்பாகக் கூறப்படுகிறது. உரையாடல், எழுத்து, பரிமாற்றம் வழியாகத் தன் உலகை விரிவுபடுத்த முயல்வர். ஒரே வேலையில் மட்டும் நிலைக்காமல் புதிய திறன்களை இணைத்துக் கொள்ளும் விருப்பமும் இருக்கலாம்.'],
 ['கடகம்','நெருக்கமான உறவுகள், நினைவுகள், குடும்பத்தைப் பாதுகாக்கும் விருப்பம் ஆகியவை வாழ்க்கை முடிவுகளில் இடம் பெறலாம். சூழலின் உணர்ச்சி மாற்றங்களை உடனே உணரும் திறன் இருப்பதாகப் பாரம்பரியமாக விளக்கப்படுகிறது. மற்றவர்களுக்கு ஆதரவளிக்கும்போது தமக்கான ஓய்வையும் பாதுகாப்பையும் தேடுவார்கள்.'],
 ['சிம்மம்','ஒரு பணியைத் தன் பொறுப்பாக எடுத்தால் அதன் முடிவில் தனக்கான பங்கு தெளிவாகத் தெரிய வேண்டும் என்று விரும்புவர். மரியாதை, வெளிப்படையான நடத்தை, முன்மாதிரியாக இருப்பது ஆகியவற்றைக் கருத்தில் கொள்ளும் இயல்பு உண்டு. பாராட்டை விரும்புவதோடு தமக்குப் பொருத்தமான வழியில் பிறரை ஊக்குவிக்கும் போக்கும் சொல்லப்படுகிறது.'],
 ['கன்னி','வேலையின் குறைகளை முன்கூட்டியே கண்டறிந்து திருத்துவதில் கவனம் செலுத்தும் இயல்பு இவ்வகை லக்னத்துடன் இணைக்கப்படுகிறது. ஒரு பொறுப்பின் சிறிய விவரம்கூட முடிவை மாற்றக்கூடும் என்று எண்ணுவர். பிறருக்கு உதவுவது என்பது அவர்களுக்குப் பல நேரங்களில் ஒழுங்காகச் செய்து கொடுப்பதைக் குறிக்கலாம்.'],
 ['துலாம்','ஒரே விஷயத்தை இரு தரப்பின் பார்வையிலிருந்து புரிந்துகொள்ளும் முயற்சி வாழ்க்கை அணுகுமுறையின் மையமாக இருக்கலாம். உறவு, ஒப்பந்தம், நேர்மை மற்றும் அழகுணர்வு போன்றவற்றை மதிப்பர். தனக்கான முடிவையும் மற்றவரின் தேவையையும் சமப்படுத்துவதில் அதிக மனநேரம் செலவிடலாம்.'],
 ['விருச்சிகம்','வெளியில் உடனே வெளிப்படுத்தாத எண்ணங்களை உள்ளுக்குள் ஆராய்ந்து முடிவெடுக்கும் இயல்பு குறிப்பிடப்படுகிறது. நம்பிக்கையைப் பெற நேரம் எடுத்துக்கொள்வதுடன், ஏற்றுக் கொண்ட உறவுகளில் ஆழமான ஈடுபாடும் இருக்கலாம். தடைகளை எதிர்கொள்ளும்போது பழைய முறையை மாற்றிப் புதிய வழி தேடும் மனப்பாங்கு காணப்படலாம்.'],
 ['தனுசு','ஒரு செயலுக்குப் பின்னால் இருக்கும் நோக்கம் என்ன என்பதைப் புரிந்துகொள்ள விரும்பும் மனப்போக்கு இருக்கலாம். கல்வி, பயணம், தத்துவம், வழிகாட்டல் போன்றவற்றில் பெரிய படத்தைப் பார்க்கும் ஆர்வம் முன்வைக்கப்படுகிறது. தாம் சரி என்று நம்புவதை வெளிப்படையாகக் கூறும் விருப்பமும் இருக்கலாம்.'],
 ['மகரம்','நீண்டகால முயற்சியில் சிறுசிறு படிகளைத் தொடர்ச்சியாக எடுத்து வைப்பதே வளர்ச்சிப் பாதையாகக் கருதப்படலாம். விதிமுறை, நேரம், பொறுப்பு ஆகியவற்றைக் கைவிட விரும்பாத குணம் முன்வைக்கப்படுகிறது. தன் சாதனைகளை உடனடியாக வெளிப்படுத்தாமல் செயலில் நிரூபிப்பது இவர்களுக்கு இயல்பாக இருக்கலாம்.'],
 ['கும்பம்','வழக்கமாக அனைவரும் பின்பற்றும் முறையையே ஏற்காமல் வேறொரு சாத்தியத்தைப் பற்றி சிந்திக்கும் ஆர்வம் இருக்கலாம். குழுவின் நன்மை, அறிவுப் பரிமாற்றம், தனித்த கண்ணோட்டம் ஆகியவை முக்கியம் பெறலாம். நெருக்கமான உறவுகளிலும் தனக்கான சுதந்திரமான சிந்தனையைப் பாதுகாக்க விரும்புவர்.'],
 ['மீனம்','மற்றவர்களின் நிலையை உணர்ந்து அதற்கேற்பப் பதிலளிக்கும் மென்மையான அணுகுமுறை இவ்வகை லக்னத்தின் அடிப்படைக் குணமாகக் கூறப்படுகிறது. கற்பனை, நம்பிக்கை, கலை மற்றும் சேவை மனப்பான்மை ஆகியவற்றுக்கு இடம் அளிக்கலாம். வெளிப்புறப் பொறுப்புக்கும் உள்ளுணர்வுக்கும் இடையில் சமநிலை தேடும் இயல்பும் இருக்கலாம்.']
];
const MOON_GENERAL_TA=[
 'மனம் ஒரு விஷயத்தில் ஆர்வம் கொண்டவுடன் உடனே முயற்சி செய்ய விரும்பும் சுறுசுறுப்பு முன்வைக்கப்படுகிறது. உணர்ச்சிகளை நீண்ட நேரம் மறைத்து வைத்திருக்காமல் வெளிப்படுத்தும் இயல்பு சொல்லப்படுகிறது.',
 'மன நிம்மதிக்கு நம்பகமான அன்றாட ஒழுங்கும் பழக்கமான மனிதர்களும் முக்கியமாக இருக்கலாம். விருப்பமான சூழல் உறுதியான பிறகே பெரிய மாற்றத்தை ஏற்கும் போக்கு குறிப்பிடப்படுகிறது.',
 'பல விஷயங்களைப் பற்றிக் கேட்கவும் பேசவும் அறியவும் மனம் விரும்பலாம். ஒரே எண்ணத்தை விட புதிய தகவல் கிடைக்கும்போது நிலைப்பாட்டை மாற்றும் நெகிழ்வுத்தன்மை சொல்லப்படுகிறது.',
 'குடும்ப உறுப்பினர்களின் உணர்ச்சிகளையும் வீட்டின் சூழலையும் மனம் அதிகமாகப் பிரதிபலிக்கலாம். பழைய நினைவுகளுக்கு வழங்கும் முக்கியத்துவம் உறவுகளைத் தேர்வதிலும் தோன்றலாம்.',
 'மனதிற்கு மரியாதையும் பாராட்டும் தேவைப்படலாம்; தன் அன்பையும் நேரடியாக வெளிப்படுத்த விரும்பலாம். பிறரின் நம்பிக்கையைப் பெற்றபின் முன்நின்று பொறுப்பு ஏற்கும் ஆர்வம் இருக்கலாம்.',
 'சிறிய தவறுகளையும் கவனிக்கும் மனப்பாங்கு காரணமாக வேலை முறையாக இருக்க வேண்டும் என்ற எண்ணம் எழலாம். தன்னிடமும் பிறரிடமும் அளவுக்கு மீறிய எதிர்பார்ப்பு வைத்துக்கொள்ளாமல் பழகுவது உதவலாம்.',
 'நெருங்கிய உறவுகளில் சுமுகத்தன்மையும் பரஸ்பர மரியாதையும் மனதிற்கு முக்கியம் பெறலாம். விவாதத்தின் இரு தரப்பையும் புரிந்து கொள்ள நேரம் எடுத்துக்கொள்ளும் அணுகுமுறை உண்டு.',
 'அறிந்த மனிதர்களிடமும் எல்லா உணர்ச்சிகளையும் உடனே பகிராத தன்மை முன்வைக்கப்படுகிறது. நம்பிக்கை உருவானபின் உறவிற்கு முழு ஈடுபாடு அளிக்கும் ஆழமான மனப்போக்கு இருக்கலாம்.',
 'மனதிற்கு புதிய கருத்து, வாசிப்பு, தூர இடங்கள் அல்லது பெரிய இலக்கு பற்றிய சிந்தனை உற்சாகம் அளிக்கலாம். சிறிய தடையிலும் மொத்தப் பயணத்தின் பொருளைப் பார்க்க விரும்புவர்.',
 'பொறுப்பை நிறைவேற்றிய பிறகே முழுமையாக ஓய்வெடுக்கத் தகுதி கிடைத்ததாக எண்ணும் மனநிலை இருக்கலாம். உணர்ச்சியை வெளிப்படுத்துவதற்கு மாற்றாகப் பயனுள்ள செயலைச் செய்வது வழக்கமாக இருக்கலாம்.',
 'தனிப்பட்ட எண்ணங்களுக்கு இடம் வேண்டும் என்ற மன விருப்பம் முன்வைக்கப்படுகிறது. நண்பர்கள் அல்லது குழுவுடன் இணைந்தாலும் ஒவ்வொருவருக்கும் தனித்த கண்ணோட்டம் இருப்பதை மதிக்கலாம்.',
 'கற்பனையும் பரிவும் அதிகம் இடம் பெறும் மனப்பாங்கு கூறப்படுகிறது. இசை, அமைதி, ஆன்மிகச் சிந்தனை போன்றவற்றின் மூலம் உள்ளுணர்வை ஒழுங்குபடுத்த விரும்பலாம்.'
];
const NAK_TRAITS_TA=[
 'புதிய முயற்சிக்கு முதல் அடி எடுப்பதில் ஈடுபாடு; வேகத்திற்கும் பொறுப்பிற்கும் சரியான இடம் தேடும் பழக்கம்.',
 'ஒரு கடமையை ஏற்றுக்கொண்டால் அதன் கட்டுப்பாட்டையும் விளைவையும் மனதில் வைத்துச் செயல்படுதல்.',
 'தெளிவாக வேறுபடுத்திப் பார்க்கும் ஆர்வம்; பொருத்தமற்றதைத் திருத்தும் மன உறுதி.',
 'வளர்ச்சியை மெதுவாகப் பேணுதல்; உறவுகளிலும் பொருட்களிலும் பராமரிப்புக்கு முக்கியத்துவம்.',
 'புதிய அறிவைத் தொடர்ந்து தேடுதல்; முடிவெடுப்பதற்கு முன் பல வாய்ப்புகளை ஆராய்தல்.',
 'சவாலுக்குப் பின்னால் உள்ள காரணத்தை அறிய முயற்சித்தல்; பழைய கருத்தைத் துணிந்து மறுபரிசீலனை செய்தல்.',
 'மாறிய சூழலில் மீண்டும் தொடங்கும் நம்பிக்கை; உடைந்த இணைப்பைச் சீரமைக்கும் முனைப்பு.',
 'ஒழுங்காகப் பாதுகாக்கும் பொறுப்பு; தேவையுடையவருக்கு நம்பகமான ஆதரவாக இருத்தல்.',
 'விஷயத்தின் நுணுக்கத்தைத் தேடி அறியும் தன்மை; மறைமுகக் காரணங்களைப் புரிந்துகொள்ளும் ஆர்வம்.',
 'முன்னோர் மரபு மற்றும் குடும்ப அடையாளத்திற்கு வழங்கும் மரியாதை; தகுந்த இடத்தில் தலைமை ஏற்கும் விருப்பம்.',
 'கலை, உறவு, ஓய்வு ஆகியவற்றில் மன நிறைவை நாடுதல்; பிறரை இணைக்கும் திறனைப் பேணுதல்.',
 'ஒப்புக்கொண்ட பொறுப்பை நிறைவேற்றித் தனித்தன்மையை நிரூபித்தல்; செயலில் நம்பகத்தன்மை தேடுதல்.',
 'கைகளால் செய்வதிலும் சூழலைக் கவனிப்பதிலும் நுணுக்கம்; சிறிய செயலையும் பயனாக மாற்ற முயற்சித்தல்.',
 'புதிய வடிவங்களை உருவாக்கும் ஆர்வம்; அழகுணர்வையும் தொழில்நுட்பத்தையும் இணைத்துப் பார்க்கும் திறன்.',
 'தன் வழியைத் தேர்ந்தெடுக்க விரும்புதல்; வெவ்வேறு சூழல்களுக்கு விரைவாக ஏற்படக்கூடிய நெகிழ்வு.',
 'பல நோக்கங்களை ஒரே இலக்கில் இணைக்கும் துணிவு; வெற்றி வரை தொடர்ந்து முயல்வதில் ஈடுபாடு.',
 'உறவின் நிலைத்தன்மைக்கும் நட்பின் நம்பிக்கைக்கும் முன்னுரிமை; தொடர்ச்சியான முயற்சியை மதித்தல்.',
 'சிக்கலின் மையத்தைத் துல்லியமாக அறிய விரும்புதல்; தன் எல்லைகளைக் காத்து முடிவெடுத்தல்.',
 'ஒரு பழைய அமைப்பின் அடிப்படையை ஆராய்தல்; தேவையற்றதை விலக்கி புதிய தொடக்கம் தேடுதல்.',
 'படிப்படியாக முன்னேறும்போதும் உயர்ந்த நோக்கத்தை விடாமல் இருப்பது; அனுபவத்திலிருந்து நம்பிக்கை பெறுதல்.',
 'முழுமையான பொறுப்பைச் சுமப்பதற்குத் தயாராகும் மனப்பாங்கு; நிலையான பெயரை உருவாக்க விரும்புதல்.',
 'கவனமாகக் கேட்டு அறிவைப் பெருக்கும் விருப்பம்; உரையாடல் மற்றும் வழிகாட்டுதலுக்கு மதிப்பு.',
 'குழுவில் பங்களிப்பை ஒழுங்கமைக்கும் திறன்; ஒற்றுமைக்குப் பின்னால் இருக்கும் உழைப்பைப் புரிதல்.',
 'பழைய விதிகளைச் சோதித்துப் புதிய தீர்வு தேடுதல்; தனிப்பட்ட ஆராய்ச்சியைத் தொடர விருப்பம்.',
 'பொறுப்பையும் கொள்கையையும் இணைக்க முயற்சித்தல்; வேறுபட்ட கருத்துகளுக்கிடையே சமநிலை தேடுதல்.',
 'ஆழ்ந்து சிந்தித்த பின்னரே கருத்தை உறுதிப்படுத்தும் தன்மை; கடினமான பொறுப்பை அமைதியாக ஏற்றுக்கொள்ளல்.',
 'ஒரு பயணத்தை நிறைவு செய்து அடுத்த திசையைத் தேர்ந்தெடுக்க விரும்புதல்; பிறருக்கு வழி காட்டும் மென்மை.'
];
const MATTER_TA=[
 [
 ['Sun','உடல் நடவடிக்கை','தினசரி நடவடிக்கைகளில் தன்னம்பிக்கை வளர்ந்தாலும் ஓய்வையும் அளவாகப் பகிர்ந்துகொள்ளும் வழி உருவாகலாம்.','உடல் செயல்பாட்டிற்காகத் தேவையான நேரத்தை ஒதுக்காமல் பொறுப்புகளைத் தொடர்ந்து ஏற்கும்போது சோர்வு மேலோங்கக்கூடும்.'],
 ['Moon','மனநிலை','உணர்ச்சிகளைப் புரிந்துகொண்டு பேசும் திறன் தனிப்பட்ட உறவுகளை நெருக்கமாக்க உதவலாம்.','மற்றவர்களின் உணர்ச்சியைத் தனக்குள் எடுத்துக்கொள்வதால் முடிவுகளில் தேவையற்ற மன அழுத்தம் சேரலாம்.'],
 ['Sun','முகமும் வெளிப்பாடும்','மக்களைச் சந்திக்கும் சூழலில் தன்னுடைய கருத்தை உறுதியுடனும் மரியாதையுடனும் வெளிப்படுத்தும் முயற்சி வளரலாம்.','உள்ளுக்குள் இருக்கும் பதற்றம் முகபாவனையிலும் உரையாடும் வேகத்திலும் வெளிப்படுவதால் தவறாகப் புரிந்துகொள்ளப்படும் தருணங்கள் இருக்கலாம்.'],
 ['Saturn','நிலைத்த குணம்','அவசர வெற்றியை விட நம்பகமான செயல் முறையால் மதிப்பைப் பெறும் வழி உருவாகலாம்.','தன்னிடம் மிகுந்த கட்டுப்பாடு எதிர்பார்ப்பது மகிழ்ச்சியுடன் செய்யக்கூடிய செயலையும் கடமையாக மாற்றிவிடலாம்.'],
 ['Mars','எதிர்வினையும் துணிவும்','திடீர் சிக்கலில் விரைந்து உதவும் மன உறுதி வெளிப்படலாம்; செயலுக்கு முன் சூழலை அளவிடும் திறனும் வளர்க்கலாம்.','விரைவான எதிர்வினையை மற்றவர்கள் கடுமையான அணுகுமுறையாகப் புரிந்துகொள்ள வாய்ப்புள்ளதால் உரையாடலின் இடைவெளி முக்கியம்.']
 ],
 [
 ['Jupiter','தனச் சேர்க்கை','சம்பாதிப்பில் ஒரு பகுதியைத் திட்டமிட்டுச் சேமிப்பாக மாற்றும் திறன் வளரலாம்; குடும்பத்தின் நீண்டகாலத் தேவைகளை முன்கூட்டியே அறிந்து பணத்தை ஒதுக்க விரும்பலாம்.','வரவிற்கு இணையாகக் குடும்பத் தேவைகளும் பெருகுவதால் கையில் தங்கும் தொகை எதிர்பார்த்த அளவாக இருக்காமல் போகலாம்; சேமிப்பைத் தனியே பாதுகாக்க வேண்டியிருக்கும்.'],
 ['Jupiter','குடும்ப உறுப்பினர்கள்','குடும்பத்தினர் இடையே கருத்து வேறுபாடு வந்தபோதும் ஒருவருடைய தேவையை மற்றவருக்கு எடுத்துச் சொல்லும் பொறுப்பு உருவாகலாம்; பெரியோரின் ஆலோசனை இடம் பெறலாம்.','உறவினரின் செலவு அல்லது பொறுப்பைத் தனியாக ஏற்றுக்கொள்ளும் சூழல் சுமையாகலாம்; உதவிக்கு எல்லை அமைப்பதே உறவைப் பாதுகாக்கும் வழியாக இருக்கும்.'],
 ['Mercury','வாக்கால் வாழ்வாதாரம்','பேச்சுவார்த்தை, தகவல் பரிமாற்றம், கணக்கு அல்லது வாடிக்கையாளருடன் பழகும் திறன் சம்பாதிப்பிற்கான துணை வழியாக அமையலாம்.','சொன்ன வாக்குறுதிக்கும் எழுதப்பட்ட ஒப்பந்தத்திற்கும் வேறுபாடு ஏற்பட்டால் வருமானம் பாதிக்கப்படலாம்; தகவலை உறுதிப்படுத்தும் பழக்கம் தேவைப்படும்.'],
 ['Mercury','பேச்சின் பாங்கு','சூழலுக்கேற்ப சொற்களைத் தேர்ந்தெடுப்பதன் மூலம் எதிர்ப்புக் கருத்தையும் விளக்கிச் சொல்லும் திறன் வளரலாம்; நேர்த்தியான உரையாடல் ஒரு பலமாக அமையலாம்.','கோபத்தில் வேகமாகப் பேசுவது அல்லது குறையைச் சுட்டிக்காட்டும் முறை கடுமையாகத் தோன்றுவது உறவுகளில் இடைவெளியை உருவாக்கலாம்.'],
 ['Moon','உணவுப் பழக்கம்','உடலுக்கு ஏற்ற நேரத்தையும் அளவையும் கவனித்துச் சாப்பிடும் ஒழுங்கு நீண்டகால நலனுக்குத் துணையாகலாம்.','வேலைப்பளு அல்லது மனச் சோர்விற்கு ஏற்ப உணவு நேரம் மாறும்போது பழக்கத்தைத் திரும்ப ஒழுங்குபடுத்த வேண்டியிருக்கும்.'],
 ['Venus','திருமணத்திற்குப் பின் குடும்பம்','இரு குடும்பங்களின் தேவைகளைக் கேட்டறிந்து செலவையும் பொறுப்பையும் பகிர்வதில் புதிய உடன்பாடு உருவாக்கும் திறன் இருக்கலாம்.','திருமணத்திற்கு முன் பழகிய குடும்பச் செலவு முறையும் பின்னர் உருவாகும் தேவைகளும் மாறுபட்டால் உரையாடலின் மூலம் ஒழுங்கமைக்க வேண்டியிருக்கும்.'],
 ['Sun','முகம், வாய், பற்கள்','தனிப்பட்ட தோற்றத்தையும் வாய்ச் சுகாதார ஒழுங்கையும் பராமரிப்பதில் கவனம் செலுத்துவது அன்றாட நம்பிக்கைக்கு உதவலாம்.','பணி நேரம் சீரற்றபோது உணவு, பற்கள் பராமரிப்பு போன்ற அடிப்படைப் பழக்கங்கள் பின்தங்காமல் பார்த்துக்கொள்ள வேண்டியிருக்கும்.'],
 ['Mars','உணவு விருப்பமும் அன்றாடப் பழக்க ஒழுங்கும்','பசியின் நேரம், உணவுச் சுவை, விருப்பமான உணவு வகை ஆகியவற்றை அன்றாட வேலை மற்றும் குடும்பச் சூழலுடன் பொருத்திச் செயல்படும் முறை அமையலாம்.','வேலை அழுத்தம் அல்லது பயண நேரம் மாறும்போது உணவு நேரத்தைப் பாதுகாக்கவும், விருப்பங்களுக்கு இடையே அளவைப் பேணவும் தனிப்பட்ட ஒழுங்கு தேவைப்படலாம்.']
 ],
 [
 ['Mars','தனித்த முயற்சி','சிறிய பணியைத் தொடர்ந்து பயிற்சி செய்து பிறர் உதவியில்லாமல் முடிக்கும் திறன் வளரலாம்.','அடிக்கடி திட்டத்தை மாற்றுவதால் முடிக்கப்பட்ட வேலைகளை விடத் தொடங்கிய வேலைகள் அதிகமாகிவிடலாம்.'],
 ['Mercury','எழுத்தும் தகவலும்','வழிகாட்டும் குறிப்புகள், தகவல் பதிவு, செய்தி பரிமாற்றம் போன்ற வழிகளில் திறமையை வெளிப்படுத்தலாம்.','சொல்ல வந்த கருத்தைச் சரியாகப் பதிவு செய்யாததால் புரிதல் பிழைகள் ஏற்படும் சூழலைக் குறைக்க வேண்டியிருக்கும்.'],
 ['Mars','உடன்பிறப்புகளுடன் உறவு','பரஸ்பரம் உதவும் வேலைகளின் மூலம் சகோதர உறவுகள் நெருக்கமாகப் பேணப்படலாம்.','ஒரே குடும்பப் பொறுப்பை யார் ஏற்க வேண்டும் என்ற விவாதம் நீளும்போது தனிப்பட்ட எல்லைகள் உதவக்கூடும்.'],
 ['Sun','தைரியமும் நிலைப்பாடும்','தக்க சமயத்தில் தன் கருத்தை வெளியிடும் துணிவு புதிய வாயில்களைத் திறக்கலாம்.','ஆர்வத்தில் உடனடி உறுதி அளித்த பிறகு நேரமும் வளமும் குறைவாக இருப்பது தெரியவரலாம்.'],
 ['Mars','கைகள், தோள்கள், இயக்கம்','செயல்பாட்டு பயிற்சி, கைத்திறன் அல்லது விளையாட்டு வழியாக இயங்கும் திறனை மேம்படுத்த ஆர்வம் தோன்றலாம்.','அவசர அசைவுகளிலும் அதிகப் பயிற்சியிலும் உடலின் சௌகரிய எல்லையை மதிப்பது முக்கியம்.']
 ],
 [
 ['Moon','தாயாருடன் உறவு','வீட்டில் பரஸ்பரம் கேட்டு முடிவெடுக்கும் நடைமுறை குடும்பத்தினருக்குப் பாதுகாப்பு உணர்வை அளிக்கலாம்.','குடும்பத்தினரின் உணர்ச்சிப் பாரத்தை ஒருவரே சுமப்பதால் சொந்த மன ஓய்வு குறையலாம்.'],
 ['Venus','வீடு மற்றும் வசதி','வாழும் இடத்தை வசதியாகவும் பராமரிக்க எளிமையாகவும் அமைத்துக்கொள்வதில் மகிழ்ச்சி கிடைக்கலாம்.','அழகுக்கான செலவுகளும் அத்தியாவசிய வீட்டு செலவுகளும் கலந்துவிட்டால் திட்டமிட்ட செலவு வரம்பு உதவும்.'],
 ['Mars','நிலம், சொத்து, ஆவணம்','சொத்து தொடர்பான ஆவணங்களைச் சரிபார்த்து நீண்டகாலத் திட்டத்தை வகுப்பதில் உறுதி வளரலாம்.','கையொப்பம், பங்கீடு அல்லது பழைய பதிவுகள் தெளிவாக இல்லாவிட்டால் பெரிய முடிவைத் தாமதித்து உறுதிப்படுத்த வேண்டியிருக்கும்.'],
 ['Moon','மன அமைதி','வீட்டில் தனக்கான அமைதியான நேரத்தை உருவாக்கிக்கொள்வது பிற பொறுப்புகளையும் தெளிவாகக் கையாள உதவலாம்.','வீட்டுப் பிரச்சினையை வேலை நேரத்திற்கும் கொண்டு சென்றால் இரண்டிலும் கவனம் சிதற வாய்ப்புள்ளது.'],
 ['Mercury','அடிப்படைக் கல்வி','பழக்கமான சூழலில் முறையான குறிப்பெடுக்கும் பயிற்சி புதிய அறிவைக் கற்றுக்கொள்வதை எளிதாக்கலாம்.','ஒரே நேரத்தில் பல பணிகள் சேரும்போது அடிப்படைப் பயிற்சிக்கு இடைவெளி ஏற்பட்டு மீண்டும் தொடங்க வேண்டியிருக்கும்.']
 ],
 [
 ['Jupiter','கல்வி, கருத்தறிவு','படித்ததைத் தனக்கான புரிதலுடன் இணைத்து மற்றவருக்கும் விளக்கிச் சொல்லும் திறன் வளரலாம்.','திறன் இருந்தபோதும் எந்தத் துறையில் ஆழப்பட வேண்டும் என்ற குழப்பத்தால் பயிற்சி திசை மாறலாம்.'],
 ['Mercury','நினைவுத் திறன்','குறிப்புகள், மறுபயிற்சி மற்றும் நடைமுறை எடுத்துக்காட்டுகள் வழியாகக் கற்றதை நினைவில் நிலைநிறுத்த முடியும்.','பெரிய அளவில் தகவல் சேரும்போது முன்னுரிமைப்படுத்தி மீண்டும் படிக்கும் முறை தேவைப்படும்.'],
 ['Jupiter','குழந்தைகள் மற்றும் வழிகாட்டல்','குழந்தைகள் அல்லது இளையோரின் கேள்விகளுக்கு பொறுமையாகப் பதிலளித்து அவர்களின் முயற்சிக்கு ஆதரவளிக்க விருப்பம் இருக்கலாம்.','குழந்தைகளிடம் தன் எதிர்பார்ப்பை அப்படியே அமல்படுத்தும்போது அவர்களது தனித்த ஆர்வத்துடன் முரண்பாடு தோன்றலாம்.'],
 ['Venus','படைப்பாற்றல்','கலை, இசை, வடிவமைப்பு அல்லது தனித்த விருப்பப் பயிற்சியில் நேரம் செலவிடுவது மனநிறைவாக மாறலாம்.','படைப்புப் பணியின் முடிவை விரைவில் மதிப்பிடுவதால் தொடர்ச்சியான பயிற்சிக்கு இடையூறு நேரலாம்.'],
 ['Mercury','ஆலோசனை, திட்டமிடல்','ஒரு யோசனையைச் சிறிய முயற்சியாகச் சோதித்து அதன் பயனை அறிந்த பின்னரே விரிவாக்க விரும்பலாம்.','திடீர் ஆதாயம் கிடைக்கும் என்ற எதிர்பார்ப்பில் பரிசீலிக்காத செலவை ஏற்காமல் இருப்பது உதவும்.']
 ],
 [
 ['Mars','சவால் மற்றும் போட்டி','கடினமான பிரச்சினையைக் கட்டங்களாகப் பிரித்து சரிசெய்யும் முயற்சியில் பணித் திறன் வெளிப்படலாம்.','மற்றவரின் தவறுக்கான பொறுப்பையும் தனியே ஏற்றுக்கொள்ளும்போது வேலைப்பளு அளவுக்கு மீறலாம்.'],
 ['Saturn','பணி ஒழுங்கு','தொடர்ச்சியாக முடிக்கும் சிறிய பொறுப்புகள் நீண்டகால நம்பகத்தன்மையாக உருவாகலாம்.','ஓய்வு நேரத்தை கணக்கில் கொள்ளாமல் கடமைகளை ஏற்றால் வேலைத் தரம் மாறுபடலாம்.'],
 ['Mars','கடன், செலுத்துதல்','கட்டணத் தேதிகளையும் தேவையான செலவுகளையும் முன்கூட்டியே ஒழுங்கமைப்பதன் மூலம் நிதிச் சுமையைக் கட்டுப்படுத்த முடியும்.','சரிபார்க்கப்படாத நிபந்தனை அல்லது திடீர் கடன் குடும்பத் திட்டத்தையும் பாதிக்கக்கூடும்.'],
 ['Mercury','வேலை தொடர்பான வாதம்','ஆவணங்கள் மற்றும் தெளிவான தகவல் பரிமாற்றம் மூலம் கருத்து வேறுபாட்டை நடைமுறைத் தீர்விற்கு அழைத்துச் செல்லலாம்.','தவறாகப் புரிந்துகொள்ளப்பட்ட வார்த்தையால் நீண்ட விவாதம் உருவாக வாய்ப்புள்ளதால் பதிவு பாதுகாப்பு உதவும்.'],
 ['Sun','உடல்நல ஒழுங்கு','உறக்கம், இயங்கும் நேரம், உணவு ஆகியவற்றை முறையாக வைத்துக்கொள்வது நாளாந்தச் செயல்திறனைத் தாங்கலாம்.','அறிகுறிகளை கிரகநிலையால் மட்டும் விளக்காமல் உண்மையான உடல்நலத் தேவைக்கான நேரடி மருத்துவ ஆலோசனை அவசியம்.']
 ],
 [
 ['Venus','திருமணத்தில் புரிதல்','தன் விருப்பத்தையும் துணைவரின் தேவையையும் வெளிப்படையாகப் பகிர்வது நம்பிக்கை வளர்க்கும் வழியாக அமையலாம்.','உரையாடாமல் எதிர்பார்ப்புகளை உள்ளுக்குள் வைத்துக்கொள்வதால் சிறிய வேறுபாடு பெரிய மனக்கசப்பாக மாறலாம்.'],
 ['Jupiter','துணைவர் குடும்பத் தொடர்பு','இரு குடும்பங்களின் பழக்கங்களை மதித்து ஒற்றுமைக்கான நடைமுறையை உருவாக்க முடியும்.','குடும்பத்தினரின் தலையீட்டிற்கும் தம்பதிகளின் தனி முடிவிற்கும் எல்லை தேவைப்படலாம்.'],
 ['Mercury','கூட்டுத் தொழில் ஒப்பந்தம்','வேலைப் பங்கு, வரவு பகிர்வு மற்றும் பொறுப்புகளை எழுதிப் பதியும்போது கூட்டுறவு தெளிவடையலாம்.','வாய்வழி ஒப்பந்தங்கள் மாறுபட்டால் பணமும் நம்பிக்கையும் பாதிக்கப்படும் வாய்ப்பு இருக்கும்.'],
 ['Venus','அன்பும் நேரமும்','ஒன்றாகச் செலவிடும் சிறிய நேரங்களே நெருக்கத்தைப் பேணும் முக்கியமான பழக்கமாக மாறலாம்.','வேலை நேரமும் தனிப்பட்ட ஓய்வும் தொடர்ந்து மோதினால் உறவிற்கு உரிய நேரம் ஒதுக்க வேண்டியிருக்கும்.'],
 ['Sun','பொதுவெளி தொடர்பு','மற்றவர்களின் முன்னிலையில் சமமான மரியாதையுடன் செயல்படுவது குடும்பத்திற்கும் தொழிலுக்கும் நற்பெயரை வளர்க்கலாம்.','வெளியில் காட்டும் உறுதியான கருத்து வீட்டிற்குள் கட்டளையாகத் தோன்றாமல் பார்க்க வேண்டியிருக்கும்.']
 ],
 [
 ['Saturn','எதிர்பாராத மாற்றங்கள்','பழைய ஏற்பாடு பலனளிக்காதபோது அதை நிதானமாகச் சீரமைக்கும் திறன் வளரலாம்.','திடீரென வரும் புதிய பொறுப்பு ஏற்கெனவே உள்ள திட்டத்தை மாற்ற வேண்டிய சூழலைத் தரலாம்.'],
 ['Jupiter','பகிர்ந்த பணமும் சொத்தும்','பங்கீடு, காப்பீடு, பரம்பரை ஆவணங்கள் போன்றவற்றில் தெளிவான பதிவுகள் வைத்திருப்பது பாதுகாப்பான நடைமுறையாகலாம்.','பிறரின் தகவலை நம்பி உறுதி அளிப்பதற்கு முன் உரிமை மற்றும் பொறுப்பைச் சரிபார்க்க வேண்டியிருக்கும்.'],
 ['Mercury','ஆய்வு, ரகசியத் தகவல்','ஆழமாகத் தேடிப் புரிந்து கொள்வதற்கான ஆர்வம் தொழில்திறன் அல்லது தனிப்பட்ட அறிவாக மாறலாம்.','போதுமான சான்று இல்லாத சந்தேகத்தை முடிவாக ஏற்றுக்கொண்டால் தேவையற்ற மனசுமை சேரலாம்.'],
 ['Moon','உள்மாற்றம்','கடந்து வந்த சவால்களின் அனுபவத்தைப் புதிய வாழ்க்கைத் திட்டத்திற்கு பயன்படுத்தலாம்.','முடிவடைந்த நிகழ்வை மனதில் மீண்டும் மீண்டும் நிகழ்த்துவதால் அடுத்த வாய்ப்பைக் காணாமல் போகலாம்.'],
 ['Saturn','நீடித்த உடல் பராமரிப்பு','நீண்டகால நலனுக்கான சீரான பழக்கம் முக்கியம் பெறலாம்; சிறிய மாற்றத்தைத் தொடர்ந்து பேணுவது பயனுள்ளதாக இருக்கும்.','நோய் அல்லது ஆயுள் குறித்து உறுதியான ஜோதிடத் தீர்ப்பை எழுதாமல், உண்மையான உடல்நல மதிப்பீட்டையே அடிப்படையாகக் கொள்ள வேண்டும்.']
 ],
 [
 ['Jupiter','தந்தை, பெரியோர்','வழிகாட்டியோரின் அனுபவத்திலிருந்து தன் வாழ்க்கைக்கு ஏற்ற பகுதியைத் தேர்ந்தெடுக்கலாம்.','பெரியோர் கூறிய பாதையும் சொந்த விருப்பமும் மாறுபட்டால் மரியாதையுடன் கருத்தை விளக்க வேண்டியிருக்கும்.'],
 ['Jupiter','உயர்கல்வி','புதிய துறை கற்றல் அல்லது சான்றிதழ் பெறும் முயற்சியை வாழ்க்கைப் பொறுப்புடன் இணைக்க முடியும்.','பயிற்சிக்கான நேரமும் செலவும் சரியாக அமைக்கப்படாவிட்டால் கற்றல் நீளலாம்.'],
 ['Sun','நீதி, கொள்கை','சொந்த முடிவுகளில் நேர்மையைப் பேணுவது மற்றவர்களின் நம்பிக்கையை வளர்க்கலாம்.','கொள்கையில் மிகுந்த கடுமை காட்டும்போது வேறுபட்ட சூழலுக்குத் தேவையான நெகிழ்ச்சி குறையலாம்.'],
 ['Rahu','தொலைதூர வாய்ப்புகள்','புதிய இடம் அல்லது வேறுபட்ட மனிதர்களுடன் பழகுவதன் மூலம் புதிய அறிவைப் பெறலாம்.','பயண ஏற்பாடு அல்லது வெளியூர் வாய்ப்பை முழுமையாகச் சரிபார்க்காமல் நிதிப் பொறுப்பை ஏற்க வேண்டாம்.'],
 ['Jupiter','நம்பிக்கை, ஆன்மிகம்','வாழ்க்கையின் நோக்கத்தைப் பற்றி சிந்தித்துப் பிறருக்குப் பயன்படும் பணியில் ஈடுபட விருப்பம் இருக்கலாம்.','பழக்கமான நம்பிக்கையைப் பற்றிய கருத்து வேறுபாடு உறவுகளை பாதிக்காத வகையில் மரியாதை பேணுவது நல்லது.']
 ],
 [
 ['Mercury','தொழிலின் தன்மை','தகவல், கணக்கு, எழுத்து, வாடிக்கையாளர் அல்லது ஒருங்கிணைப்பு சார்ந்த திறன்களைப் பயன்படுத்தும் வாய்ப்புகளில் நன்மை காணலாம்.','பணித் திட்டம் தெளிவாக இல்லாமல் பல பொறுப்புகளை ஏற்றால் முடித்த வேலைக்கான அங்கீகாரம் தாமதிக்கலாம்.'],
 ['Sun','பொறுப்பு, அதிகாரம்','முடிவின் பொறுப்பை ஏற்று பிறருக்கு வழிகாட்டும் பணியில் நம்பிக்கை பெறலாம்.','அதிகார எல்லையும் பொறுப்பின் அளவும் தெளிவில்லாவிட்டால் பணியிடத்தில் கருத்து வேறுபாடு உண்டாகலாம்.'],
 ['Saturn','நீண்டகாலத் தொழில் வளர்ச்சி','தொடர்ச்சியான செயல்பாடும் தரமான வேலைப்பழக்கமும் நிலையான பெயரை உருவாக்க உதவலாம்.','உடனடியாகப் பலன் தெரியாத உழைப்பால் மனச்சோர்வு வந்தால் இலக்கை இடைநிலைப் படிகளாக மாற்றுவது உதவும்.'],
 ['Mars','செயல்பாட்டுத் திறன்','சிக்கலான பணியில் உடனடி செயல் திட்டத்தை உருவாக்கி அணியுடன் செயல்படுத்தும் திறன் வெளிப்படலாம்.','அவசர முடிவால் மற்றவர்களின் வேலை நேரத்தை பாதிக்காதவாறு செயல் வரிசையைத் திட்டமிட வேண்டியிருக்கும்.'],
 ['Jupiter','பணிநிலை, மதிப்பு','அனுபவத்தைப் பகிர்ந்து பயிற்சி அளிப்பது தனிப்பட்ட மதிப்பையும் தொழில் வாய்ப்பையும் வளர்க்கலாம்.','மற்றவரின் உயர்வுக்கு உதவும்போது சொந்தத் திறன் வளர்ச்சிக்கான நேரத்தையும் ஒதுக்க வேண்டியிருக்கும்.']
 ],
 [
 ['Jupiter','வருமான வளர்ச்சி','ஒரு வேலை மூலமான வருமானத்துடன் கற்ற திறன்கள் அல்லது நம்பகமான தொடர்புகள் துணை வழியாக அமையலாம்.','வரவேண்டிய தொகையும் உண்மையில் பெறப்பட்ட தொகையும் வேறுபடும்போது செலவுத் திட்டம் சிரமப்படலாம்.'],
 ['Mercury','வாடிக்கையாளர், வலையமைப்பு','பழைய தொடர்புகளைப் பேணி புதியவர்களுடன் தெளிவாகப் பேசுவதன் மூலம் வாய்ப்புகளை விரிவுபடுத்தலாம்.','ஒரே சமயத்தில் பல வாக்குறுதிகளை அளிப்பதால் நம்பிக்கை பாதிக்கப்படாமல் கால அளவை முன்பே தீர்மானிக்க வேண்டும்.'],
 ['Jupiter','மூத்த உடன்பிறந்தோர்','அனுபவம் வாய்ந்த உறவினருடன் பேசி அவரவர் தேவைக்கேற்ப உதவியைப் பகிர்ந்து கொள்ளலாம்.','ஒவ்வொருவரின் தனிப்பட்ட பணப் பொறுப்பையும் தெளிவுபடுத்தாவிட்டால் உறவில் அழுத்தம் உருவாகலாம்.'],
 ['Moon','நண்பர்கள்','நம்பிக்கையுடன் பகிரக்கூடிய நட்பு வட்டம் மன உறுதியையும் புதிய அறிவையும் அளிக்கலாம்.','அனைவரின் எதிர்பார்ப்பையும் நிறைவேற்ற நினைப்பதால் சொந்தத் திட்டம் பின்னுக்குத் தள்ளப்படலாம்.'],
 ['Sun','நீண்டகால இலக்கு','அடைய வேண்டிய இலக்கைத் தெளிவாகக் குறித்துச் சிறிய முன்னேற்றங்களைப் பதிவுசெய்வது உற்சாகம் அளிக்கலாம்.','வெளிப்படையான அங்கீகாரத்தை மட்டுமே வெற்றியாகக் கருதினால் பயனுள்ள இடைநிலை வளர்ச்சியைத் தவறவிடலாம்.']
 ],
 [
 ['Saturn','செலவுக் கட்டுப்பாடு','அத்தியாவசியம், விருப்பம், எதிர்பாராத தேவை எனச் செலவைப் பிரிப்பதால் நிதியில் தெளிவு உருவாகலாம்.','சிறுசிறு செலவுகள் சேர்ந்து அதிகமாகும் நிலையைக் கண்காணிக்காவிட்டால் சேமிப்பு சுருங்கலாம்.'],
 ['Moon','உறக்கம், ஓய்வு','நாளின் முடிவில் அமைதியான நேரத்தை ஒதுக்குவது வேலைக்கும் குடும்பத்திற்கும் புத்துணர்வைத் தரலாம்.','பணி நினைவுகளையும் முடிக்காத வேலைகளையும் ஓய்வு நேரத்திற்குக் கொண்டு வருவது மனநிம்மதியைக் குறைக்கலாம்.'],
 ['Rahu','அந்நியத் தொடர்பு','வேறுபட்ட மொழி அல்லது சூழலைக் கற்றுக்கொள்வது வெளியூர் தொடர்புகளில் பயன்படலாம்.','புதிய இடத்தில் கிடைக்கும் வாய்ப்பை ஏற்கும் முன் ஒப்பந்தம், செலவு, குடும்பச் சூழலை ஒப்பிட்டுப் பார்க்க வேண்டும்.'],
 ['Venus','தனிநேரம், உறவுச் சமநிலை','தனிப்பட்ட விருப்பங்களுக்காக அளவான நேரம் வைத்திருப்பது நெருங்கிய உறவுகளிலும் பொறுமையை வளர்க்கலாம்.','தனிமைக்கான தேவை பற்றி திறந்துபேசாவிட்டால் மற்றவர்கள் அதைத் தவிர்க்கும் மனப்பான்மையாகப் புரிந்துகொள்ளலாம்.'],
 ['Saturn','சேவை, மன அமைதி','மற்றவருக்குச் செய்யும் உதவியைத் தன் திறன் வரம்பிற்குள் தொடர்ந்து செய்வது உள்ளார்ந்த நிறைவைக் கொடுக்கலாம்.','அளவுக்கு மீறிய சேவைப்பொறுப்பால் தன்னுடைய தேவைகள் புறக்கணிக்கப்படாமல் கவனிக்க வேண்டியிருக்கும்.']
 ]
];
const MATTER_EN=[
 ['body and everyday energy','emotional response','outward expression','reliable conduct','reaction to challenges'],
 ['wealth and savings','family duties','earnings through speech','tone of speech','food routines','family after marriage','mouth and dental care','personal choices around food or substances'],
 ['practical initiative','writing and information','siblings','courage','arms and movement'],
 ['mother and caregiving','home comfort','property decisions','peace of mind','foundational learning'],
 ['education','memory','children and mentoring','creativity','planning'],
 ['competitive work','discipline','loans and repayment','disputes','wellbeing routines'],
 ['marital understanding','in-laws and family ties','business agreements','affection and time','public cooperation'],
 ['restructuring','shared finances','research','emotional resilience','long-term physical care'],
 ['parents and mentors','higher learning','principles','long-distance opportunities','belief and service'],
 ['job skills','authority','career sustainability','execution','professional standing'],
 ['income growth','clients','elder siblings','friendships','long-term aims'],
 ['spending','sleep','overseas connections','private time','voluntary service']
];
const TA_DEST=['தனிப்பட்ட தேர்வுகள்','குடும்பச் செலவுகள்','எழுத்து மற்றும் முயற்சி','வசிப்பிடமும் பராமரிப்பும்','கல்வி மற்றும் இளையோர்','வேலைப் போட்டி','கூட்டாக எடுக்கும் முடிவு','பகிர்ந்த ஆவணங்கள்','வழிகாட்டலும் பயணமும்','பணி மற்றும் பொதுப் பொறுப்பு','நட்பு மற்றும் வரவு','செலவும் தனிநேரமும்'];
const EN_DEST=['personal initiative','household finances','written communication','home responsibilities','learning and children','work pressure','agreements','shared records','study and distance','career duties','income and contacts','spending and rest'];
function matterSupport(c,karaka){const a=(c.all||[]).find(x=>x.relation==='karaka'&&x.planet===karaka)||(c.all||[]).find(x=>x.planet===karaka);
const measured=a?Number(a.delta):0;return c.conclusion==='support'&&measured>=-.15?'support':c.conclusion==='strain'||measured<-.30?'strain':'mixed';}
// Each karakatwa has its OWN possible lived outcome and counter-condition.
// No generic 'this area is important' text, arbitrary odd/even selection or
// disclosure of house calculations in the user-facing prediction.
const MATTER_EN_LIVED=[
 [
 ['Personal initiative can show through the way a commitment is accepted and completed.','Taking charge of every request may gradually crowd out physical recovery.'],
 ['Reading another person’s mood can make difficult conversations more considerate.','Carrying everyone’s concern as a personal obligation can distort priorities.'],
 ['Measured expressions can make a firm decision look approachable.','An urgent inner response can make an otherwise reasonable statement seem harsh.'],
 ['Reliability can become the quality others first notice in daily dealings.','Excessive self-restraint can turn recreation into another duty.'],
 ['Fast action can be an asset when a practical obstacle must be resolved.','A quick response may be interpreted as hostility before the intended help is understood.']
 ],
 [
 ['Separate savings from household spending so income can mature into reserves.','Rising family commitments may use available earnings before a planned reserve grows.'],
 ['Listening to differing family needs can strengthen trust across generations.','Accepting a relative’s obligations without limits can burden a close relationship.'],
 ['Negotiation, accounts and accurate explanations may contribute to earning opportunities.','Unrecorded promises or ambiguous terms can put payment for completed work at risk.'],
 ['Selecting words carefully can help explain a difficult position without humiliation.','A sharp comment made under pressure can linger longer than intended.'],
 ['A consistent eating rhythm can support the demands of work and home.','Skipping meals during stressful periods can disrupt personal routines.'],
 ['Partners may develop a shared way of dividing family costs and decisions.','Different inherited spending habits may require explicit agreements after marriage.'],
 ['Attention to personal presentation can reinforce confidence in public dealings.','Irregular routines can push oral care and preventive habits aside.'],
 ['Personal decisions about diet and stimulants deserve conscious attention.','No birth chart establishes whether someone consumes meat, tobacco or alcohol; the actual habit must be known.']
 ],
 [
 ['Repeated practice may turn an individual skill into something useful to others.','Changing the objective too frequently can leave several promising efforts unfinished.'],
 ['Clear notes or messages can become a practical strength in collaboration.','Incomplete information can cause a capable person’s meaning to be lost.'],
 ['Sharing a task can create a more cooperative bond with siblings or peers.','Disagreement about who carries family duties can cause friction.'],
 ['A timely statement of conviction can create room for an independent decision.','An early promise may prove difficult once the resources are counted.'],
 ['Working with hands or movement may reward sustained, measured practice.','Hurrying physical work can ignore fatigue and the need for safe technique.']
 ],
 [
 ['Making room for listening can improve trust within the home.','Absorbing another family member’s distress may leave little personal rest.'],
 ['A practical layout and careful upkeep can improve everyday comfort.','Decoration and essential maintenance may compete for the same budget.'],
 ['Reviewing property documents early can prevent avoidable later confusion.','Unclear ownership records or family shares can delay a housing decision.'],
 ['A settled household rhythm can protect concentration elsewhere in life.','Home concerns carried into every working hour may divide attention.'],
 ['Regular revision in a familiar setting can support foundational learning.','Competing responsibilities can interrupt the continuity of study.']
 ],
 [
 ['Deep study can help turn an interest into a skill worth explaining to others.','Repeatedly changing a field may postpone the benefit of sustained learning.'],
 ['Practical examples and notes can strengthen recall over time.','Information overload may make it difficult to choose what to retain.'],
 ['Mentoring younger people may bring satisfaction through their progress.','Expecting a child to follow one predetermined path can create tension.'],
 ['Creative practice can offer a constructive outlet for private ideas.','Judging unfinished work too quickly can interrupt improvement.'],
 ['Testing a small plan before scaling it may bring sounder choices.','Unverified expectations of quick profit can undermine preparation.']
 ],
 [
 ['Handling a complicated duty in stages can build confidence at work.','Taking responsibility for others’ unfinished work may become exhausting.'],
 ['Consistent execution may make a person dependable to colleagues.','A schedule that excludes rest can eventually reduce the quality of work.'],
 ['Tracking repayment dates can keep borrowing from dominating decisions.','An urgent loan with unclear terms may constrain family choices.'],
 ['Careful written records can make a workplace disagreement easier to resolve.','A misunderstood statement may prolong a dispute unnecessarily.'],
 ['Stable sleep and meals can support the stamina needed for responsibilities.','Physical symptoms need real assessment rather than an astrological diagnosis.']
 ],
 [
 ['Explaining wishes openly can deepen mutual understanding in partnership.','Unspoken assumptions about duty can gradually weaken cooperation.'],
 ['Respecting both families can make shared celebrations and decisions easier.','Different household expectations may require a new agreement.'],
 ['Written roles can strengthen a business or professional partnership.','Vague responsibilities may turn a minor disagreement into a financial dispute.'],
 ['Protecting time for attention and affection can make a bond more durable.','Overwork may leave closeness to be maintained only through promises.'],
 ['Fair listening can improve decisions made with the public or clients.','Trying to please everyone can blur an essential personal boundary.']
 ],
 [
 ['A careful review may help replace an outdated arrangement safely.','Abrupt changes can expose gaps in a plan that once seemed settled.'],
 ['Clear records can protect shared money and inherited obligations.','Unexamined liabilities may surface when a joint decision is due.'],
 ['Methodical investigation can reveal a useful overlooked detail.','Suspicion without verification can consume time and confidence.'],
 ['Recognising a setback as temporary can support gradual recovery.','Keeping concerns private for too long may isolate the person from help.'],
 ['Sensible preventive routines can support long-term wellbeing.','No astrological pattern alone identifies a specific disease or lifespan.']
 ],
 [
 ['Thoughtful guidance can help frame a longer educational or personal plan.','Conflicting advice from respected elders may make a choice difficult.'],
 ['Specialist study can broaden opportunities beyond a familiar role.','A course or qualification may need more sustained time than first expected.'],
 ['Consistent values can guide choices made under public pressure.','Rigid certainty may make constructive disagreement harder to hear.'],
 ['Travel or remote collaboration can open new forms of learning.','Distance and documents may complicate an otherwise promising opportunity.'],
 ['Service informed by personal belief can strengthen a sense of purpose.','Promising more time than one can offer may undermine the intended help.']
 ],
 [
 ['Applying a learned skill steadily can increase trust in professional work.','Frequent interruptions may delay the visibility of real ability.'],
 ['Taking responsibility for a team may develop sound judgement.','Too many obligations at once can leave little space for delegation.'],
 ['A sustainable routine may turn consistent effort into longer employment.','Unplanned changes in workload can make career choices more difficult.'],
 ['Closing one project before starting another may improve execution.','Rushing into a new commitment can fragment professional attention.'],
 ['Reliable conduct can build standing even without immediate recognition.','Recognition may lag behind effort and should not be confused with a lack of skill.']
 ],
 [
 ['Turning reliable contacts into paid work may strengthen income.','Promised receipts may arrive later than the expenses they must cover.'],
 ['Clear terms with clients can support repeat work and trust.','Ambiguous expectations may cause delays or disputed payments.'],
 ['A cooperative relationship with older siblings may widen useful support.','Unbalanced expectations around family assistance can become burdensome.'],
 ['A small, dependable circle may contribute more than broad acquaintances.','Following every invitation may dilute time needed for firm commitments.'],
 ['Long-term goals can become manageable when divided into stages.','Changing targets before each milestone may conceal real progress.']
 ],
 [
 ['Planned discretionary spending can make room for genuine priorities.','Small uncontrolled expenses can gradually weaken a useful reserve.'],
 ['Protecting regular sleep can improve the day’s decisions.','Late work and worry may reduce the rest needed for recovery.'],
 ['Clear arrangements can make travel or overseas connections productive.','Distance, fees and unclear expectations can complicate remote work.'],
 ['Private time can restore attention after demanding interactions.','Avoiding necessary conversation can turn quietness into disconnection.'],
 ['Giving service within realistic limits can be meaningful.','Taking on every request can drain the resources intended for others.']
 ]
];
const NATAL_CHANNEL_TA=[
 'சுயமாக முடிவு எடுக்கும் சூழல்','குடும்பத்தின் வரவு–செலவு முடிவுகள்','கையெழுத்து, தகவல், திறன் பயிற்சி','வசிப்பிடம் மற்றும் வீட்டாரின் தேவை',
 'படிப்பு, படைப்பாற்றல் அல்லது குழந்தைகளின் வழிகாட்டல்','பணிச்சுமை, போட்டி, கடன் ஒழுங்கு','துணைவருடனான ஒப்புதல் அல்லது கூட்டு ஒப்பந்தம்',
 'பகிர்ந்த சொத்து, ஆவணம் மற்றும் திடீர் மாற்றங்கள்','உயர்கல்வி, பெரியோர் வழிகாட்டல், தொலைதூரத் திட்டம்',
 'தொழிலின் பொறுப்பு மற்றும் நற்பெயர்','வாடிக்கையாளர் தொடர்பும் வருமான இலக்கும்','தனிச் செலவு, ஓய்வு மற்றும் வெளியூர்த் தேவைகள்'
];
const NATAL_CHANNEL_EN=[
 'independent choices','family budgets','writing and trained skills','home and domestic needs','learning and younger people','work pressure and borrowing',
 'partnership agreements','joint assets and older records','mentors and distant opportunities','professional duties','income and dependable contacts','rest, expenses and distance'
];
const KARAKA_TOUCH_TA={
 Sun:'பொறுப்பேற்ற முடிவில் தன்மானத்தையும் மற்றவர் தரும் அங்கீகாரத்தையும் காப்பது',
 Moon:'குடும்பத்தவரின் உணர்வுகளைக் கேட்ட பிறகு தன் மனநிலைக்கும் இடம் ஒதுக்குவது',
 Mars:'வேகமான செயலைத் தகுந்த நேரத்தில் முடிப்பதோடு அவசரத்தைத் தவிர்ப்பது',
 Mercury:'பேச்சு, கணக்கு அல்லது ஆவணங்களில் புரிதல் பிழை வராமல் செய்தியைத் தெளிவாக்குவது',
 Jupiter:'உடனடி லாபத்தைவிட நீண்டகால நம்பிக்கையும் அறிவார்ந்த தேர்வும் முக்கியமென்று கருதுவது',
 Venus:'உறவின் ஒப்புதலையும் வசதிக்கான செலவையும் ஒரே முடிவில் சமப்படுத்துவது',
 Saturn:'நெடுநாள் பொறுப்பைச் சிறிய கட்டங்களாக நிறைவேற்றி நம்பகத்தன்மை உருவாக்குவது',
 Rahu:'புதிய வழியில் கிடைக்கும் தகவலையும் அதன் நம்பகத்தன்மையையும் ஒப்பிட்டுப் பார்ப்பது',
 Ketu:'அத்தியாவசியமற்ற செலவுகளைக் குறைத்து முடியாத பணியை நிறைவேற்றுவது'
};
const KARAKA_TOUCH_EN={
 Sun:'recognition and accountability',Moon:'emotional understanding and family needs',Mars:'initiative versus haste',
 Mercury:'clear speech and precise records',Jupiter:'long-term judgement and trusted counsel',Venus:'consent and shared resources',
 Saturn:'steady execution of obligations',Rahu:'unfamiliar offers and independent verification',Ketu:'simplifying unfinished arrangements'
};
function matterSupport(c,karaka){
 const kar=(c.all||[]).find(x=>x.relation==='karaka'&&x.planet===karaka)||(c.all||[]).find(x=>x.planet===karaka);
 const ruler=(c.all||[]).find(x=>x.relation==='lord');
 const k=Number(kar?.delta)||0,l=Number(ruler?.delta)||0;
 if(c.positive?.length&&c.negative?.length)return 'mixed';
 if(k>=.2&&l>=-.2)return 'support';
 if(k<=-.2||l<=-.45)return 'strain';
 return c.conclusion==='support'?'support':c.conclusion==='strain'?'strain':'mixed';
}
function matterEvidenceClause(c,entry,star,lang){
 const ta=lang!=='en',planet=entry[0],focus=entry[1],kar=(c.all||[]).find(x=>x.relation==='karaka'&&x.planet===planet),lordHouse=c.location;
 const karStatus=Number(kar?.delta)>=.2?'support':Number(kar?.delta)<=-.2?'pressure':'mixed';
 const starRuler=star?.planets?.[planet],channel=starRuler?.rulerHouse||null;
 const uniqueChannel=Number.isInteger(channel)&&channel!==c.house&&channel!==lordHouse?channel:null;
 const lch=Number.isInteger(lordHouse)&&lordHouse!==c.house?lordHouse:null;
 if(ta){
  const domain=lch?NATAL_CHANNEL_TA[lch-1]:null,via=uniqueChannel?NATAL_CHANNEL_TA[uniqueChannel-1]:null;
  const karMeaning=KARAKA_TOUCH_TA[planet];
  if(karStatus==='support'&&domain)return `${focus} குறித்து உருவாகும் வாய்ப்புகள் ${domain} சார்ந்த அனுபவத்தோடு சேர்ந்தால் ${karMeaning} பயனாக வெளிப்படலாம்.`;
  if(karStatus==='pressure'&&domain)return `${domain} பற்றிய கவலை அதிகரிக்கும் நேரத்தில் ${focus} சார்ந்த முடிவுகளை அவசரமாகச் செய்யாமல் ${karMeaning} தேவையாகலாம்.`;
  if(via)return `${focus} சார்ந்த பழக்கம் ${via} தொடர்பான வாழ்க்கைத் தேவையைச் சந்திக்கும்போது ${karMeaning} என்ற தன்மை வெளிப்படலாம்.`;
  return '';
 }
 const domain=lch?NATAL_CHANNEL_EN[lch-1]:null,via=uniqueChannel?NATAL_CHANNEL_EN[uniqueChannel-1]:null;
 if(karStatus==='support'&&domain)return `When ${focus} intersects with ${domain}, ${KARAKA_TOUCH_EN[planet]} may become a usable strength.`;
 if(karStatus==='pressure'&&domain)return `Pressure involving ${domain} makes ${KARAKA_TOUCH_EN[planet]} an important consideration for ${focus}.`;
 return via?`A second influence through ${via} may change how ${focus} is handled, particularly around ${KARAKA_TOUCH_EN[planet]}.`:'';
}
function paragraphNoCalc(c,entry,idx,lang,star){
 const ta=lang!=='en',state=matterSupport(c,entry[0]);
 const alternatives=ta?[entry[2],entry[3]]:(MATTER_EN_LIVED[c.house-1]||[])[idx];
 if(!alternatives)return '';
 const hasDual=!!(c.positive?.length&&c.negative?.length);
 // Two contradictory indicators warrant TWO different lived consequences,
 // never one positive claim arbitrarily selected by paragraph index.
 const scenario=state==='support'?alternatives[0]:state==='strain'?alternatives[1]:
  hasDual?`${alternatives[0]} ${alternatives[1]}`:(c.relativeScore>=0?alternatives[0]:alternatives[1]);
 const evidence=matterEvidenceClause(c,entry,star,lang);
 return [scenario,evidence].filter(Boolean).join(' ');
}

const GRAHA_MIND_TA={
 Sun:'தன்னுடைய முடிவு வெளியில் எவ்வாறு மதிக்கப்படும் என்ற விழிப்புணர்வும் தன்மானமும் பொறுப்புணர்வோடு கலக்கலாம்',
 Moon:'தனக்கான அமைதியையும் பிறருடைய மனநிலையையும் ஒரே நேரத்தில் கவனிக்க வேண்டியிருக்கும்',
 Mars:'விரைந்து செயலில் இறங்கும் உந்துதலை நீண்டகாலத் திட்டத்துடன் ஒத்திசைக்க முயற்சிப்பார்',
 Mercury:'கேள்வி கேட்டு உறுதி செய்யும் அறிவு, கணக்கு, சொற்களின் துல்லியம் ஆகியவற்றில் ஈடுபாடு உயரலாம்',
 Jupiter:'முடிவின் நியாயத்தையும் நீண்டகாலப் பயனையும் முதலில் மதிப்பிடும் இயல்பு மேலோங்கலாம்',
 Venus:'உறவின் ஒற்றுமையையும் வசதியையும் இழக்காமல் கடமையை நிறைவேற்ற முயற்சிப்பார்',
 Saturn:'தன் கடமையை ஏற்ற பிறகே உரிமையை கோரும் பொறுமையும் நீண்டகால நினைப்பும் செயல்படலாம்',
 Rahu:'வழக்கமில்லாத வாய்ப்பை ஏற்கும் முன் அதன் விளைவுகளைப் பரிசீலிக்க வேண்டும் என்ற தேடல் எழலாம்',
 Ketu:'வெளிப்படையான வெற்றியைவிடத் தனக்குப் பொருள் உள்ள பணியைத் தேர்வது முக்கியமாகலாம்'
};
const GRAHA_LIFE_EN={
 Sun:'recognition, leadership and personal accountability',Moon:'emotional steadiness and family needs',
 Mars:'initiative and the pace of decisions',Mercury:'speech, study, writing and practical accounting',
 Jupiter:'mentoring, learning and long-term judgement',Venus:'relationships and agreements',
 Saturn:'enduring obligations and patience',Rahu:'unfamiliar opportunities and critical verification',
 Ketu:'simplification and obligations that should be completed'
};
const GRAHA_MIND_EN={
 Sun:'attention to how responsibility is recognized',Moon:'awareness of the emotional needs of close people',
 Mars:'urgency to turn an idea into action',Mercury:'the habit of questioning and checking information',
 Jupiter:'the wish to understand the purpose of a decision',Venus:'sensitivity to harmony and consent',
 Saturn:'preference for durable commitments over quick recognition',Rahu:'interest in unconventional solutions',
 Ketu:'the inclination to withdraw from distractions'
};
function aspectLife(a,ta,domain){
 // A sign-based Parashari aspect must be present before this is called.
 // Never conflate independent combustion and <=8-degree Rahu proximity flags.
 if(!a?.from||!Number.isInteger(a.aspectHouse))return '';
 const near=Number.isFinite(a.orb)&&a.orb<=5;
 const details=[];
 if(ta){
  if(a.combust)details.push('அஸ்தமனம் பெற்றதால் அந்த கிரகத்தின் பலனளிக்கும் திறனைத் தனியாக மதிப்பிட வேண்டும்');
  if(a.closeRahu)details.push('ராகுவுக்கு உண்மையாக எட்டு பாகைக்குள் இருப்பதால் அந்த நெருக்கத்தின் தாக்கத்தையும் தனியாக மதிப்பிட வேண்டும்');
  const mind=GRAHA_MIND_TA[a.from]||'';
  const contact=`${actor(a.from,true)} உண்மையில் பார்வை தரும் தொடர்பால் ${mind}`;
  const effect=details.length?` இந்தப் பார்வை முற்றிலும் நீங்குவதில்லை; ${details.join('; ')}.`:'';
  return contact+'.'+(near?` பார்வையின் பாகை நெருக்கம் ${a.orb.toFixed(1)}° என்பதால் அந்தத் தொடர்பு அதிக நேரடியாக எடுத்துக்கொள்ளப்படுகிறது.`:'')+effect;
 }
 if(a.combust)details.push('the aspecting planet is combust');
 if(a.closeRahu)details.push('the aspecting planet is within 8° of natal Rahu');
 return `${GRAHA_LIFE_EN[a.from]||a.from} influence ${domain} through a verified classical aspect.`+
  (near?` Its calculated angular deviation is ${a.orb.toFixed(1)}°.`:'')+
  (details.length?` This aspect still exists, but ${details.join(' and ')}; strength is therefore assessed separately.`:'');
}
function ascendantStarReading(star,ta){const l=star?.lagna,who=l?.star;if(!who)return [];
 const planet=ta?actor(l.starRuler,true):l.starRuler;
 const focus=ta?TA_DEST[(l.rulerHouse||1)-1]:EN_DEST[(l.rulerHouse||1)-1];
 const own=['own','exalted'].includes(l.rulerDignity),weak=l.rulerDignity==='debilitated';
 const result=[];
 if(ta){
  result.push(`லக்னப்புள்ளி ${who.ta} ${who.pada||'?'}-ஆம் பாதத்தின் பாரம்பரிய இயல்புடன் சேர்ந்துள்ளது. அதன் நட்சத்திரநாதனான ${planet} வழியாக ${focus} தொடர்பான வாழ்க்கை அனுபவங்களைத் தனித்தன்மையுடன் அணுகும் எண்ணம் உருவாகலாம்; உடனடியாகப் பலனை மட்டுமே தேடுவதற்குப் பதிலாகச் செயல் முறையைத் தானே தீர்மானிக்க விரும்பலாம்.`);
  result.push(own?`இந்த நட்சத்திரநாதனின் சொந்த/உச்ச ராசி ஆதரவு காரணமாக, பொறுப்பு ஏற்ற முடிவைத் தொடர்ந்து கொண்டு செல்லும் உறுதி உருவாகலாம். ${l.rulerRetrograde?'வக்ரநிலை இருப்பதால் தொடங்கிய முயற்சியின் நோக்கத்தையே மீண்டும் ஆராய்ந்து பழைய அனுபவத்தைப் பயன்படுத்தும் இயல்பும் இணைகிறது.':'முன்னர் வகுத்த திட்டத்தையும் நடைமுறைச் சூழலையும் ஒப்பிட்டு முன்னேறுவது முக்கியமாகலாம்.'}`:
   weak?`நட்சத்திரநாதனின் நீசநிலை காரணமாக மனம் விரும்பியதை நடைமுறைப்படுத்துவதற்கு முன் வெளிப்புற உதவி அல்லது திட்டமிடல் தேவைப்படலாம். ஒரே தடையைத் தனிப்பட்ட தோல்வியாகக் கருதாமல் வழிமுறையை மாற்றிக்கொள்ளும் போக்கு முக்கியமாகும்.`:
   `நட்சத்திரநாதனின் இருப்பிடம் தொடர்புடைய பல்வேறு பொறுப்புகள் முடிவெடுக்கும் முறையை மாற்றக்கூடும். ${l.rulerRetrograde?'முன்னர் நிறுத்திய முயற்சியை மீண்டும் தொடங்குவதற்கான உள்ளார்ந்த ஆய்வு கூடலாம்.':'மற்றவர்களின் எதிர்பார்ப்பைக் கேட்டபின் சொந்த முடிவிற்கு வர முயல்வார்.'}`);
 }else{
  result.push(`The ascendant falls in ${who.en}, pada ${who.pada||'unknown'}; its stellar ruler is ${planet}. The native may approach personal choices through the practical demands of ${focus}.`);
  result.push(own?'The stellar ruler has a strong sign dignity, pointing to a traditional preference for consistency and ownership of commitments.':weak?'Weak sign dignity of this ruler calls for a more qualified reading of initiative and self-assurance.':'The ruler has neither verified own/exalted nor debilitated sign dignity, so other natal influences must modify the reading.');
  if(l.rulerRetrograde)result.push('Retrograde motion may be read traditionally as a tendency to reconsider an earlier decision rather than move forward unquestioningly.');
 }
 const strong=(l.rulerAspects||[]).filter(a=>!a.qualified),weakAspects=(l.rulerAspects||[]).filter(a=>a.qualified);
 // Every aspect first passes the graha-drishti sign test. Degree orb is a separate refinement.
 if(strong.length)result.push((ta?'நட்சத்திரநாதனைப் பார்க்கும் கிரகங்களின் செயல்படும் குணங்கள்: ':'Stellar ruler aspects: ')+strong.slice(0,3).map(a=>aspectLife(a,ta,'decisions')).join(' '));
 if(weakAspects.length)result.push((ta?'முழு வலிமையுடன் கருத முடியாத தொடர்பு: ':'Qualified aspects: ')+weakAspects.slice(0,2).map(a=>aspectLife(a,ta,'decisions')).join(' '));
 return result.filter(Boolean);
}
function lagnaBodyMindReading(star,lang){const l=star?.lagna;if(!l?.lord)return [];
 const ta=lang!=='en',p=l.lord,planet=ta?actor(p,true):p,scene=l.lordHouse?TA_DEST[l.lordHouse-1]:null;
 const occupants=(l.occupants||[]),conj=(l.lordConjunctions||[]),aspects=(l.lordAspects||[]);
 const all=[];
 if(ta){
   const theme={Sun:'தன்னம்பிக்கையை வெளிக்காட்டும் விதமும் மற்றவர் அளிக்கும் மதிப்பும்',Moon:'மனதின் ஏற்றத்தாழ்வையும் நெருங்கியோரின் தேவைகளையும் சமாளிக்கும் பாங்கும்',Mars:'விரைவாகச் செயல்படும் வேகத்திற்கும் பொறுமைக்கும் உள்ள சமநிலையும்',Mercury:'தகவலைக் கேட்டறிந்து முடிவெடுக்கும் நுணுக்கமும்',Jupiter:'நியாயம், நம்பிக்கை மற்றும் அறிவைப் பகிரும் மனப்பான்மையும்',Venus:'உறவுகளோடு இசைந்து தன் விருப்பத்தைப் பாதுகாக்கும் குணமும்',Saturn:'கடமைக்கு முன்னுரிமை தரும் அமைதியான உறுதியும்'}[p]||'சுய முடிவுகளும்';
   all.push(`லக்னாதிபதியின் பிறப்பு நிலையால் ${theme} வாழ்க்கைத் தேர்வுகளில் பிரதிபலிக்கலாம். ${scene?scene+' வழியாக அனுபவம் சேரும்போது இந்தப் பழக்கம் வெளியில் தெரியலாம்.':''}`);
   if(occupants.length)all.push(`லக்னத்தில் நேரடியாகக் கிரகங்கள் இருப்பதால் தனிப்பட்ட செயல்பாட்டில் ${occupants.map(x=>GRAHA_MIND_TA[x]).filter(Boolean).join('; ')}. இந்த இயல்புகள் தனிப்பட்ட செயல்பாட்டிலும் பிறரிடம் எதிர்பார்க்கும் ஒத்துழைப்பிலும் வெளிப்படலாம்.`);
   if(l.aspects?.length)all.push(`லக்னத்தின் மீது உள்ள பார்வைத் தொடர்பு காரணமாக ${l.aspects.map(x=>aspectLife(x,true,'self')).join(' ')} இது குணநலன் மட்டும் அல்லாமல் முடிவு எடுக்கும் வேகம், செயலில் காட்டும் பொறுமை, பிறரிடம் பேசும் முறையிலும் வெளிப்படலாம்.`);
   if(conj.length)all.push(`லக்னாதிபதியோடு அதே ராசியில் அமைந்துள்ள ${conj.map(x=>actor(x.planet,true)).join(', ')}-ன் இயல்புகளும் இணைவதால் ${conj.map(x=>GRAHA_MIND_TA[x.planet]).filter(Boolean).join('; ')}. இதனால் ஒரே சூழலில் அறிவும் உணர்ச்சியும் ஒரே வேகத்தில் செயல்பட வேண்டியதில்லை.`);
   if(aspects.length)all.push(`லக்னாதிபதியைப் பார்க்கும் கிரகங்களின் வழியாக ${aspects.map(x=>aspectLife(x,true,'the self')).join(' ')} அழுத்தமான சூழல்களில் எந்த முடிவை உடனே செயல்படுத்துவது, எதற்கு காலம் கொடுப்பது என்ற வேறுபாடும் இந்தத் தொடர்புகளால் வெளிப்படலாம்.`);
 }else{
   all.push(`The ascendant ruler ${planet} is linked to ${l.lordHouse?EN_DEST[l.lordHouse-1]:'the natal chart'}. Its natural themes enter the way the native acts and adjusts to responsibility.`);
   if(l.aspects?.length)all.push(l.aspects.map(x=>aspectLife(x,false,'self-directed decisions')).join(' '));
   if(conj.length)all.push(`Other planets sharing the ascendant ruler's sign: ${conj.map(x=>x.planet).join(', ')}. This brings ${conj.map(x=>GRAHA_LIFE_EN[x.planet]).join(' and ')} into the assessment.`);
   if(aspects.length)all.push(aspects.map(x=>aspectLife(x,false,'the ascendant ruler')).join(' '));
 }
 return all.filter(Boolean);
}

/* Additional independent sign/nakshatra portraits. These three blocks are
 * sign/star-only: no natal graha aspect, house occupant or dasha is consulted. */
const ASC_GENERAL_MORE_TA=[
 ['ஒரு சூழல் உறுதியற்றதாக இருந்தாலும் தொடக்க முயற்சியைத் தாமதிக்காமல் செய்து பார்க்கும் இயல்பு பாரம்பரியமாகக் கூறப்படுகிறது.','முயற்சியில் தன்னுடைய தேர்வு முக்கியமானதாக இருப்பதால், நீண்ட ஆலோசனையை விட நேரடி அனுபவத்திற்கே மதிப்பு அளிக்கலாம்.'],
 ['பழகிய உறவின் நிலைத்தன்மையும் அடிக்கடி மாறாத வாழ்க்கை வழக்கமும் மனதிற்கு உறுதுணையாக இருக்கலாம்.','கடின உழைப்பின் சிறிய பலன்களையும் பாதுகாத்து வைத்தால் அவை பிற்காலத் திட்டங்களுக்கு அடிப்படையாகும் என்று எண்ணலாம்.'],
 ['ஒரே கருத்துக்கு பல விளக்கங்கள் இருப்பதை விரைவில் புரிந்துகொண்டு உரையாடலின் திசையை மாற்றும் திறன் இருக்கலாம்.','புதிய மனிதர்களையும் முறைகளையும் அறியும் ஆர்வத்தால் வாழ்வின் வெவ்வேறு துறைகளுக்கிடையே அறிவைப் பரிமாற விரும்பலாம்.'],
 ['ஒரு இடத்தோடு அல்லது மனிதரோடு உருவான நெருக்கத்தை உடனே கைவிடாமல் காத்துக் கொள்ளும் இயல்பு கூறப்படுகிறது.','தனக்குப் பாதுகாப்பளித்த அனுபவங்களை நினைவில் வைத்துக்கொண்டு அடுத்த தலைமுறைக்கும் அதே ஆதரவை அளிக்க விரும்பலாம்.'],
 ['தனது பங்களிப்பு அங்கீகரிக்கப்பட்டால் இன்னும் உற்சாகமாகச் செயல்படும் மனப்பாங்கு இருக்கலாம்.','தன்னிடம் எதிர்பார்ப்பு வைத்தவர்களை ஏமாற்றாமல் இருப்பதற்காக இயல்பாகவே சில பொறுப்புகளை முன்வந்து ஏற்கலாம்.'],
 ['ஒரு வேலை முடிந்ததாகக் கூறுவதற்கு முன் அதன் சிறிய குறைகளையும் திருத்த வேண்டும் என்ற எண்ணம் இருக்கலாம்.','பெரிய இலக்கைவிட அன்றாடம் சரியாகச் செய்யப்படும் முயற்சிகள் நம்பகத்தன்மையை உருவாக்கும் என்று மதிக்கலாம்.'],
 ['நேரடியாக மோதுவதற்குப் பதிலாக இரு தரப்புக்கும் ஏற்ற வழியை விவாதித்து அறிய விரும்பலாம்.','உறவின் மரியாதை நிலைநிற்க வேண்டும் என்பதற்காக சொந்த விருப்பத்தை வெளிப்படுத்தும் முறையிலும் கவனம் செலுத்தலாம்.'],
 ['ஒரு மாற்றத்தை ஏற்கும் முன் அதன் மறைந்துள்ள காரணத்தையும் நீண்டகால விளைவையும் ஆராயும் தன்மை இருக்கலாம்.','அன்பைப் பொதுவெளியில் அதிகம் காட்டாவிட்டாலும் நம்பியவர்களுக்கான உதவியில் உறுதியாக இருக்க விரும்பலாம்.'],
 ['அறிவைப் பெற்றுக் கொள்வதோடு மற்றவருடன் பகிர்ந்தால்தான் அது முழுமை பெறும் என்ற சிந்தனை இருக்கலாம்.','ஒரே இடத்தில் நிலைப்பதைவிட வாழ்க்கைப் பார்வையை விரிவாக்கும் அனுபவங்கள் முக்கியமானவை என்று கருதலாம்.'],
 ['உறுதியான அடித்தளம் கிடைத்த பிறகே பெரிய பொறுப்பை ஏற்கும் பழக்கம் கூறப்படுகிறது.','தொடர்ச்சியான சிறிய முயற்சிகளின் கணக்கை மனதில் வைத்திருப்பதால் காலம் எடுக்கும் சாதனைகளையும் மதிக்கலாம்.'],
 ['பழக்கமான முறையில் தீர்வு இல்லாத இடத்தில் குழுவோடு சேர்ந்து மாற்று வழி கண்டுபிடிக்க விரும்பலாம்.','தனிப்பட்ட சுதந்திரத்தைப் பாதுகாத்தபடியே பெரிய சமூக நோக்கில் பங்கெடுப்பது மன நிறைவை அளிக்கலாம்.'],
 ['ஒருவரின் சொல்லை மட்டுமல்ல, அந்தச் சொல்லுக்குப் பின்னால் இருக்கும் உணர்வையும் கவனிக்கும் இயல்பு கூறப்படுகிறது.','கற்பனையான இலக்கை அன்றாடத்தில் நடைமுறைப்படுத்தும் அமைதியான முயற்சியை மேற்கொள்ள விரும்பலாம்.']
];
const MOON_GENERAL_MORE_TA=[
 ['மனதில் எழும் ஆர்வத்திற்கு உடனடியான பதில் தேவைப்படலாம்; காத்திருக்கும் நேரம் நீண்டதாகத் தோன்றும்.', 'அன்றாடச் சம்பவத்தை விரைவாக மறந்து அடுத்த பணிக்குத் திரும்பும் இயல்பு கூறப்படுகிறது.'],
 ['மன அமைதியை ஒரே நாளில் உருவாக்க முடியாது; பழகிய சூழலும் நம்பிக்கையான உறவுகளும் அதை வளர்க்கும் என்று கருதலாம்.','மாற்றத்தின் மதிப்பை அறிந்தாலும் பழைய வழக்கம் வழங்கும் நிம்மதியை எளிதில் விட விரும்பமாட்டார்கள்.'],
 ['மனதிற்கு உரையாடலும் புதிய தகவலும் ஓய்வைப் போலவே தேவைப்படலாம்.','ஒரே எண்ணத்தில் சிறிது நேரம் இருந்தாலும் அடுத்த கேள்வி தோன்றும்போது புதிய சிந்தனையில் ஈடுபடலாம்.'],
 ['ஒரு பழைய நினைவு இன்றைய முடிவையும் பாதிக்கும் அளவுக்கு மனதில் பதிந்திருக்கலாம்.','நெருங்கியோரின் நலனுக்காகத் தன் வசதியைத் தள்ளிப்போட வேண்டுமா என மனதில் மீண்டும் மீண்டும் சீர்தூக்கலாம்.'],
 ['பிறர் தன்னிடம் வைத்துள்ள நம்பிக்கை உந்துதலாக மாறலாம்.','அன்பு செலுத்துவதிலும் கருத்தை வெளிப்படுத்துவதிலும் மறைமுகத்தைவிட நேரடியான மனப்போக்கு இருக்கலாம்.'],
 ['தவறு ஏற்படுமுன் கண்டறிய வேண்டும் என்ற கவனம் மனதை அடிக்கடி சுறுசுறுப்பாக வைத்திருக்கலாம்.','முழுமை தேடும் எண்ணம் மன ஓய்வுக்கு இடையூறாகாமல் இருக்க சிலவற்றை விட்டுவிடவும் பழகலாம்.'],
 ['சுற்றியிருப்போரின் கருத்துகள் மாறுபடும்போது சமநிலையைத் தேடிக் கொண்டிருப்பது மன உழைப்பாகலாம்.','ஒற்றுமை காக்கும் முயற்சியிலும் தனக்குத் தேவையான நேரத்தைக் கைவிடாமல் இருக்க விரும்பலாம்.'],
 ['ஒரு அனுபவத்தின் வெளிப்புறச் சம்பவத்தைவிட உள்ளார்ந்த காரணத்தை நினைவில் வைத்திருக்கலாம்.','நம்பிக்கைக்கு முறிவு ஏற்பட்டால் மீண்டும் அணுகுவதற்கு உரையாடலைவிட நீண்டகால நடத்தையே முக்கியமாகலாம்.'],
 ['நாளைய வாய்ப்பைப் பற்றிய எண்ணம் அன்றாடக் கட்டுப்பாடுகளுக்குள் சிக்காமல் இருக்க உதவலாம்.','புதிய கருத்துடன் நேரடியாகப் பழகும்போது பழைய நம்பிக்கையை திருத்திக் கொள்ளவும் முன்வரலாம்.'],
 ['மனக்கவலையை வார்த்தைகளால் காட்டாமல் வேலை செய்து முடிப்பதன் மூலம் சமாளிக்கலாம்.','சொந்தத் தேவைகளுக்கும் பொறுப்பிற்கும் உரிய நேரத்தை ஒதுக்க வேண்டும் என்ற உணர்வு மெதுவாக வலுப்பெறலாம்.'],
 ['வேறுபட்ட மனிதர்களிடம் தனித்த கண்ணோட்டத்தை அறிந்து கொள்ளும் ஆர்வம் மனதை ஈர்க்கலாம்.','தனியாக சிந்திக்கும் நேரமும் பொருத்தமான குழுவில் பங்கேற்கும் நேரமும் இரண்டும் முக்கியமானவையாகலாம்.'],
 ['இசை, கதை, அமைதியான இடம் போன்றவை மனப்போராட்டத்திற்கு ஓர் இடைவெளி வழங்கலாம்.','பிறர் உணர்வை உணர முடிந்தாலும் அதற்கெல்லாம் தனிப்பட்ட பொறுப்பு ஏற்க வேண்டுமா என்ற எல்லை தேவைப்படலாம்.']
];
const NAK_GENERAL_MORE_TA=[
 'புதிய தொடக்கத்தில் துணைநிற்கும் மனம் இருந்தாலும் முடிக்கும் பொறுப்பையும் தனியே பார்க்க விரும்பலாம்.',
 'விருப்பத்தை ஒழுங்குக்குள் கொண்டு வருவதில் மன உறுதி தேவைப்படுவதாகப் பாரம்பரியம் எடுத்துரைக்கிறது.',
 'தேவையானதைத் தேர்ந்தெடுத்து தேவையற்றதை விலக்கும் துல்லியமான அணுகுமுறை முன்வைக்கப்படுகிறது.',
 'வளர்ச்சி என்றால் பராமரிப்பும் தொடர்ச்சியும் முக்கியம் என்ற நம்பிக்கை வெளிப்படலாம்.',
 'அறிந்த பதிலை விட புதிய கேள்வியைத் தேடும் மன ஆர்வம் வாழ்க்கை முழுவதும் தொடரலாம்.',
 'அனுபவத்தில் வந்த மாற்றத்தை மறைத்து வைக்காமல் அதிலிருந்து புதிய புரிதல் பெற முயல்வர்.',
 'இடையூறுக்குப் பிறகும் மீண்டு எழும் எண்ணம் புதிய உறவுகளையும் முயற்சிகளையும் தேடலாம்.',
 'பிறருக்குப் பாதுகாப்பு வழங்கும்போது கடமையைத் தெளிவாகப் பிரித்து நிறைவேற்ற விரும்பலாம்.',
 'காரணத்தின் பின்னணியை அறியும் ஆழமான ஆர்வம் எல்லோரிடமும் உடனடியாக வெளிப்படாமல் இருக்கலாம்.',
 'குடும்ப மரபின் அனுபவத்தை மதித்தாலும் தனக்கான மதிப்பைத் தனியே நிரூபிக்க விரும்பலாம்.',
 'அழகு, நட்பு, நெருக்கம் ஆகியவற்றின் வழியாக வாழ்வின் சுவையை அறிய விருப்பம் இருக்கலாம்.',
 'ஒப்புக்கொண்ட பணியை முடித்த பிறகு வரும் நம்பகத்தன்மையை வெளிப்படையான பாராட்டைவிட மதிக்கலாம்.',
 'கண்களுக்கு நேரடியாகத் தெரியும் சின்னச் சின்ன வேறுபாடுகளையும் பயன்படுத்தும் நுணுக்கம் இருக்கலாம்.',
 'வடிவமைப்பிலும் செய்முறையிலும் புதுமையை உருவாக்கும் ஆர்வம் பழைய முறையைக் கேள்வி கேட்கச் செய்யலாம்.',
 'சுதந்திரமாகத் தேர்ந்தெடுத்த பாதையை அனுபவத்தின் அடிப்படையில் மாற்றிக்கொள்ளும் நெகிழ்வு இருக்கலாம்.',
 'ஒரே இலக்குக்காகப் பல ஆற்றல்களை இணைக்கும் முயற்சியில் நீண்டகால ஈடுபாடு இருக்கலாம்.',
 'காலத்தால் சோதிக்கப்பட்ட உறவுகளில் பொறுப்பை விடாமல் காப்பதே நம்பிக்கைக்கான அடையாளமாகலாம்.',
 'நுணுக்கமான ஆய்வில் நேரத்தைச் செலவிட்டாலும் முடிவிற்கான காரணம் தெளிவாக வேண்டும் என்று எண்ணலாம்.',
 'பழைய கட்டமைப்பைச் சீரமைத்து புதிய அடித்தளத்தை அமைக்கும் எண்ணம் அடிக்கடி தோன்றலாம்.',
 'பெரிய இலக்கை நோக்கிய முன்னேற்றத்தில் கிடைக்கும் சிறிய படிகளைத் தொடர்ந்து போற்றலாம்.',
 'ஒரு வேலைக்கு முழுப் பொறுப்பு அளிக்கப்பட்டால் அதன் நடைமுறையைத் தானே வகுத்துக்கொள்ள விரும்பலாம்.',
 'கவனமாகக் கேட்டு கொண்டிருக்கும் தகவலை அடுத்தவரின் நன்மைக்கு மாற்றுவது மனநிறைவாக இருக்கலாம்.',
 'குழு ஒற்றுமையைப் பேணுவதில் வெளியில் தெரியாத உழைப்பையும் மதிக்கும் இயல்பு இருக்கலாம்.',
 'தனிமையில் ஆய்ந்த கருத்தை பலருடன் பகிரும் போது அவர்களின் எதிர்ப்பையும் திறந்த மனத்துடன் ஆராயலாம்.',
 'கொள்கையில் தெளிவையும் மனிதர்களிடம் நெகிழ்வையும் ஒரே நேரத்தில் காக்க முயலலாம்.',
 'ஆழமான உறுதியுடன் செயல்படும் முன் முழுச் சூழலையும் அமைதியாகக் கவனிக்க விரும்பலாம்.',
 'முடிவை ஏற்றுக்கொண்டு அடுத்த தொடக்கத்திற்கான பாதையைத் தேர்ந்தெடுக்கும் மென்மையான அணுகுமுறை இருக்கலாம்.'
];
function introTraits(star,lang){if(!star)return [];const ta=lang!=='en',lag=star.lagnaSign,moon=star.moonSign,birth=star.planets?.Moon?.star,txt=[];
 if(Number.isInteger(lag)&&SIGN_GENERAL_TA[lag]){
  txt.push(ta?`லக்னத்தின் பொதுக் குணநலன் — ${SIGN_GENERAL_TA[lag][0]}: ${SIGN_GENERAL_TA[lag][1]}`:`Ascendant sign — ${SIGN_GENERAL_TA[lag][0]}: a traditional sign-only temperament portrait.`);
  if(ta)txt.push(...ASC_GENERAL_MORE_TA[lag]);
 }
 if(Number.isInteger(moon)&&MOON_GENERAL_TA[moon]){
  txt.push(ta?`சந்திர ராசியின் பொதுக் குணநலன் — ${SIGN_GENERAL_TA[moon][0]}: ${MOON_GENERAL_TA[moon]}`:`Moon sign — ${SIGN_GENERAL_TA[moon][0]}: the sign-only outlook of the mind.`);
  if(ta)txt.push(...MOON_GENERAL_MORE_TA[moon]);
 }
 if(birth?.index!==undefined){
  txt.push(ta?`பிறந்த நட்சத்திரத்தின் பொதுக் குணநலன் — ${birth.ta}: ${NAK_TRAITS_TA[birth.index]}`:`Birth nakshatra — ${birth.en}: traditional constellation-specific traits.`);
  if(ta&&NAK_GENERAL_MORE_TA[birth.index])txt.push(NAK_GENERAL_MORE_TA[birth.index]);
 }
 return txt;
}
function starLordLife(c,star,lang){const d=star?.houses?.[c.house],s=d?.lordStar;if(!s?.star||!s?.starRuler||!s.rulerHouse)return '';
 const ta=lang!=='en',core=TA_DEST[s.rulerHouse-1],domain=TA_DEST[c.house-1];if(c.house===s.rulerHouse)return '';
 const stable=['own','exalted'].includes(s.rulerDignity),retro=s.rulerRetrograde;
 if(ta)return `${domain} பற்றிய முக்கிய முடிவுகளைச் செயல்படுத்தும்போது ${core} சார்ந்த சூழல் துணைப் பாதையாக அமையலாம். ${stable?'நிலையான ஆதரவு இருந்தால் இரு பொறுப்புகளையும் ஒரே திட்டத்தில் இணைக்க முடியும்.':retro?'முன்பு முயன்ற ஏற்பாட்டை மீண்டும் திருத்திப் பயனுள்ள வழியாக மாற்றும் எண்ணம் எழலாம்.':'ஒரு துறையில் முன்னேற்றம் வரும்போது மற்றத் துறையின் நேரம் அல்லது பணத் தேவையை ஒப்பிட்டுப் பார்க்க வேண்டியிருக்கும்.'}`;
 return `Progress in ${EN_DEST[c.house-1]} intersects with ${EN_DEST[s.rulerHouse-1]}; ${stable?'steady effort may join the two':'the two commitments may need renewed planning'}.`;
}
function wealthFamilySpeechReading(c,star,lang){
 if(c?.house!==2||!star?.houses?.[2])return [];
 const ta=lang!=='en',planet=k=>c.all?.filter(x=>x.planet===k&&x.relation==='karaka')?.[0],J=planet('Jupiter'),M=planet('Mercury');
 const strong=k=>(k?.delta??0)>.2,weak=k=>(k?.delta??0)<-.2;
 const loc=c.location,oc=new Set(c.houseOccupants||[]),as=new Set(c.houseAspects||[]);
 const influence=k=>oc.has(k)||as.has(k),speechIncome=[10,11,2].includes(loc)||c.otherLordships?.some(n=>n===10||n===11);
 const mixed=c.positive?.length>0&&c.negative?.length>0,activeMars=influence('Mars'),activeSaturn=influence('Saturn');
 const r=[];
 if(ta){
  // Money, speech and family are NOT collapsed into a single judgement.
  if(strong(J)&&c.conclusion==='support')r.push('குடும்பத்தின் அடிப்படைச் செலவுகளை நிறைவேற்றிய பின்னரும் ஒரு பகுதியைச் சேமிப்பாக வைத்துக்கொள்ளும் வாய்ப்பைத் திட்டமிட்ட உழைப்பால் வளர்க்கலாம். வருமானம் வரும் பாதையில் தொடர்ந்து ஒரே முறையைப் பின்பற்றுவதை விடத் தகுந்த சந்தர்ப்பத்தில் மேம்படுத்தும் திறனும் பொருளாதார முன்னேற்றத்திற்கு உதவலாம்.');
  else if(weak(J)||c.conclusion==='strain')r.push('சம்பாதிப்பு இருப்பினும் கையில் பணம் தங்கும் வேகம் செலவு மற்றும் குடும்பப் பொறுப்புகளால் மாறக்கூடும். புதிய வருமானத்திற்கு முன்பே செலவு ஏற்பாடு செய்வதைத் தவிர்ப்பதும், சேமிப்புக்கு தனி வரம்பு அமைப்பதும் நிதி நிலைத்தன்மையை வளர்க்கும் வழியாக இருக்கலாம்.');
  else r.push('வருமானத்தைப் பெறும் முயற்சிக்கும் அதைச் சேமித்து வைத்திருக்கும் நடைமுறைக்கும் இடையில் வேறுபாடு இருக்கலாம். குடும்பத்தின் நீண்டகாலத் தேவைகளைக் கணக்கிட்டு ஒதுக்கும் தொகை, தொழில் சார்ந்த புதிய முயற்சிக்கு வேண்டிய தொகை எனப் பிரித்துச் செயல்படுவது பொருத்தமாகலாம்.');
  if(activeMars)r.push('குடும்பத்துக்கான பண முடிவுகளில் செயல்படும் வேகமும் உறவினர் எதிர்பார்ப்பும் ஒரே நேரத்தில் எழலாம். ஒப்புக்கொண்ட செலவை உடனே நிறைவேற்ற விரும்பினாலும், பிறரின் கருத்தைச் சரிபார்க்காமல் பணப் பொறுப்பை ஏற்கும்போது கருத்து வேறுபாடு உருவாகும் வாய்ப்புள்ளது.');
  else if(activeSaturn)r.push('குடும்பச் செலவுகள் குறித்து நீண்டகாலக் கட்டுப்பாட்டை விரும்பும் இயல்பு வலுப்பெறலாம். உதவிகளைச் செய்யும்போதும் வருமானத்திற்கான ஒழுங்கையும் எதிர்காலப் பாதுகாப்பையும் முதலில் உறுதிப்படுத்தும் பாங்கு இருக்கும்.');
  else if(influence('Venus')||influence('Moon'))r.push('வீட்டாரின் வசதி, உணர்ச்சி நெருக்கம் மற்றும் அன்றாடத் தேவைகளைப் பணத்தை விட முன்னிலைப்படுத்தும் சூழல்கள் வரலாம். ஒருவருக்குச் செய்த உதவி மற்றவருக்கும் நியாயமானதாகத் தோன்றுகிறதா என்பதைத் தெளிவுபடுத்தும் பேச்சு குடும்ப ஒற்றுமைக்கு உதவும்.');
  else r.push('குடும்பத்தில் முடிவெடுக்கும் பொறுப்பும் செலவுகளை ஏற்கும் பொறுப்பும் ஒரே நபரிடம் சேராமல் பகிரப்பட்டால் உறவுகளின் நம்பிக்கை வளரலாம். முன்கூட்டியே கொடுத்த வாக்குறுதிகளின் அளவு உண்மையான வருமானத்துடன் பொருந்துகிறதா என்பதைப் பார்த்தே புதிய கடமைகளை ஏற்கும் போக்கு இருக்கலாம்.');
  if(strong(M)&&!activeMars)r.push(speechIncome?'சொற்களைத் தெளிவாகத் தேர்ந்தெடுத்து விளக்கும் திறன், தகவல் பகிர்வு, வாடிக்கையாளர் தொடர்பு, கணக்கு அல்லது கற்பித்தல் சார்ந்த பணிகளில் மதிப்பைப் பெற உதவலாம். அந்தத் திறனைச் சம்பாத்தியமாக மாற்றும் வாய்ப்பு தொழில் மற்றும் இலாபப் பாவ ஆதரவைப் பொறுத்து அதிகரிக்கலாம்.':'தன்னுடைய கருத்தை முழுமையாகப் புரிந்துகொண்ட பிறகே வெளிப்படுத்தும் நடை இருக்கலாம். உறவினர்களிடமும் நண்பர்களிடமும் தகவலை ஒழுங்காகச் சொல்வதால் குழப்பங்களைத் தவிர்க்கும் திறன் மேலோங்கலாம்.');
  else if(activeMars&&weak(M))r.push('வாக்குவாதத்தில் கருத்தை விரைவாகச் சொல்லும் உந்துதலும் அதே நேரத்தில் சொல்லப்பட்ட வார்த்தையின் பொருள் சரியாகப் புரியாத சிக்கலும் உருவாகலாம். குறிப்பாக பணம் அல்லது குடும்ப உரிமை தொடர்பான உரையாடலில் அவசரப் பதிலை விடச் சுருக்கமான தெளிவான விளக்கம் அதிகப் பயன் தரும்.');
  else if(activeMars)r.push('பேச்சில் நேரடித்தன்மையும் செயலுக்கு அழைக்கும் வேகமும் காணப்படலாம். உறுதியான கருத்து மற்றவருக்கு கடுமையாகக் கேட்கும் சூழலில் தேவையைத் தெளிவுபடுத்தி உரையாடும் விதத்தை மாற்றுவது நம்பிக்கையைப் பாதுகாக்க உதவும்.');
  else if(weak(M))r.push('வாய்மொழியில் கூறிய விவரங்களுக்கும் எழுதப்பட்ட ஒப்பந்தங்களுக்கும் இடையே வேறுபாடு வராமல் பார்த்துக்கொள்வது முக்கியமாகலாம். பேச்சுக்காக மட்டும் பொறுப்பு ஏற்காமல் உறுதி செய்யப்பட்ட தகவலுடன் முடிவு எடுக்கும் பாங்கு வளரலாம்.');
  else r.push('பேச்சில் ஒருசில நேரங்களில் நிதானமும் மற்ற நேரங்களில் உடனடி பதிலும் மாறி வரலாம். குடும்பத்தில் யாரிடம் என்ன கூற வேண்டும் என்ற புரிதலை வளர்த்துக்கொள்வது நல்லுறவைப் பேண உதவும்.');
  // Tastes are only traditional chart-conditioned inclinations; neither meat,
  // tobacco nor alcohol consumption can be reliably diagnosed from a natal chart.
  if(activeMars)r.push('உணவில் வலுவான சுவை அல்லது காரமான உணவுகளுக்கான விருப்பம் சூழலுக்கேற்ப வெளிப்படக்கூடியதாகப் பாரம்பரியமாகக் கருதப்படுகிறது. உணவின் அளவு, நேரம் ஆகியவற்றிலும் செயலின் அவசரத்தைப் போலவே மாற்றங்கள் வரலாம்.');
  else if(influence('Venus'))r.push('உணவின் மணம், சுவை, பரிமாறும் முறை மற்றும் வீட்டாருடன் சேர்ந்து உண்பது போன்ற அனுபவங்களுக்குக் கூடுதல் முக்கியத்துவம் இருக்கலாம். வசதி இருந்தாலும் உணவுச் செலவின் அளவைப் பற்றி தனி விருப்பங்கள் தோன்றக்கூடும்.');
  else if(influence('Moon'))r.push('வீட்டில் பழகிய உணவு மற்றும் மனநிலைக்கேற்ப உணவின் தேர்வு மாறுபடலாம். நெருங்கியோர் விரும்பும் உணவுக்கு ஏற்ப தன் விருப்பத்தையும் மாற்றிக்கொள்ளும் போக்கு இருக்கலாம்.');
  else if(activeSaturn)r.push('உணவில் எளிமையையும் பழகிய நேரத்தையும் பாதுகாக்கும் விருப்பம் வெளிப்படலாம். வேலைப்பளு நீண்டாலும் உணவு நேரத்தைத் தவறவிடாமல் வைத்திருப்பதிலேயே அன்றாட ஒழுங்கு மேம்படலாம்.');
  if(mixed)r.push('குடும்பத்தின் பொருளாதார ஒத்துழைப்பும் பேச்சில் உருவாகும் மனவருத்தமும் ஒரே காலத்தில் நிகழலாம். ஒன்றில் ஏற்பட்ட முன்னேற்றத்தை மற்றொன்றின் தீர்வாகக் கருதாமல் இரண்டிற்கும் தனித் திட்டம் அமைக்கும் பழக்கம் உதவும்.');
  return r;
 }
 if(strong(J)&&c.conclusion==='support')r.push('The income-and-family evidence offers a traditional basis for building savings after meeting ordinary responsibilities, rather than treating all earnings as immediately spendable.');
 else if(weak(J)||c.conclusion==='strain')r.push('Income and retained savings may diverge when household obligations consume funds; long-term provision needs a separate plan from day-to-day earning.');
 else r.push('Financial resources, household commitments and the portion retained as savings may develop at different rates; how they are balanced deserves a separate judgement.');
 if(activeMars)r.push('Speed of reaction can affect money discussions with relatives; a quick promise may create a responsibility larger than initially intended.');
 else if(activeSaturn)r.push('A practical approach to family spending may favor predictable obligations and a reserve for later needs.');
 else r.push('Shared understanding of financial expectations matters more than assigning every expense to the same family member.');
 if(strong(M)&&!activeMars)r.push(speechIncome?'Careful explanations and clear communication may be useful in customer work, accounts or teaching, if professional and income factors also support that connection.':'Speech may favor detail, explanation and checking whether others have understood a point.');
 else if(activeMars)r.push('Direct or rapid speech can convey conviction, but may require additional care when discussing sensitive family spending.');
 else r.push('In practical conversations, the native may need to distinguish a spoken assurance from a fully confirmed agreement.');
 if(activeMars)r.push('Traditional symbolism can point to a preference for stronger food flavors when circumstances allow; this is not evidence of actual diet.');
 else if(influence('Venus'))r.push('Presentation and enjoyment of food may carry personal importance in the traditional reading.');
 else if(activeSaturn)r.push('A preference for simple or familiar eating routines may be symbolically emphasized.');
 if(mixed)r.push('Supportive family intentions and disagreement over how to use money can coexist; improved earnings alone do not settle both questions.');
 return r;
}

const STAR_LORD_DOMAIN_TA=[
 'தன்னுடைய கருத்தைப் பிறரிடம் கொண்டு செல்லும் வேகத்தையும் பொறுப்பையும் புதிய சூழலுக்கேற்ப மாற்றலாம்',
 'வரவு, குடும்பச் செலவு, பேச்சால் கிடைக்கும் தொழில் வாய்ப்பு ஆகியவற்றில் எது நிலைத்த பயன் தருகிறது என்பதைப் பிரித்தறியலாம்',
 'தான் கற்றுத் தேர்ந்த திறனைக் கொண்டு உடன்பிறப்புகளுடனும் சுற்றத்தாருடனும் இணையும் புதிய வேலை அமைந்திடலாம்',
 'வசிப்பிட அமைதியும் சொத்து பற்றிய நீண்டகாலத் திட்டமும் ஒரே நேரத்தில் கவனத்திற்கு வரலாம்',
 'கல்வி, கற்பிக்கும் பொறுப்பு, குழந்தைகளை வழிநடத்தும் செயல்முறை ஆகியவற்றில் முயற்சியின் வடிவம் மாறலாம்',
 'பணியில் எழும் போட்டியையும் கடன் அல்லது உடல்நல ஒழுங்கையும் தனித்தனி செயல் திட்டமாக அணுகலாம்',
 'உறவு, கூட்டுத் தொழில், பொது ஒப்பந்தம் ஆகியவற்றில் உள்ள ஒப்புதல்களைச் சமநிலைப்படுத்த புதிய உரையாடல் தேவைப்படலாம்',
 'கூட்டுச் சொத்து, மாற்றம், மறைந்திருந்த செலவு போன்றவற்றை ஆய்வு செய்து பாதுகாப்பான ஏற்பாட்டுக்குத் திரும்பலாம்',
 'தந்தை அல்லது வழிகாட்டியிடம் பெற்ற அறிவைச் சொந்தப் பயிற்சியாக மாற்றிக் கொள்ளும் புதிய வழி உருவாகலாம்',
 'தொழிலின் செய்முறையை மாற்றுவதா அல்லது இருக்கும் பணியில் பொறுப்பை வளர்ப்பதா என்ற இரு பாதைகள் முன்னிலைக்கு வரலாம்',
 'வருவாய் மற்றும் நம்பகமான நண்பர் வட்டத்திற்கிடையே நீண்டகால உறுதியான ஒப்பந்தங்கள் உருவாகலாம்',
 'வெளியூர் தொடர்புகள், அத்தியாவசியச் செலவு, தனிப்பட்ட ஓய்வு ஆகியவற்றிற்கு வெளிப்படையான வரம்புகள் தேவைப்படலாம்'
];
const TRANSIT_DOMAIN_CHANGE_TA=[
 'முன்னர் தன் முடிவைத் தள்ளிப்போட்டிருந்தால் அதைச் செயலாக்கும் முறையைத் திருத்திக் கொள்ளலாம்',
 'கிடைக்கும் வரவு நேரத்தையும் குடும்பம் ஏற்கும் செலவையும் மீண்டும் பொருத்திப் பார்க்கலாம்',
 'எழுத்து, குறும்பயணம் அல்லது திறன் பயிற்சி வழியாகத் தொடங்கிய முயற்சியை முடிக்க கவனம் செலுத்தலாம்',
 'வீட்டிலுள்ள ஒருவரின் தேவையும் வசிப்பிடம் பற்றிய திட்டமும் ஒன்றோடொன்று பின்னிப் பிணையலாம்',
 'படிப்பு, படைப்புத் திறன் அல்லது இளையவருக்கான பொறுப்பில் புதிய கட்டம் தொடங்கலாம்',
 'வேலைப்பளு அதிகரிக்குமுன் கடன், போட்டி, உடல்நல ஒழுங்கு ஆகியவற்றின் முன்னுரிமையை மாற்றலாம்',
 'துணைவர் அல்லது கூட்டாளியுடனான ஒப்புதல் புதிய நிபந்தனைகளைத் தேடலாம்',
 'பழைய ஆவணங்கள், பகிர்ந்த நிதி, எதிர்பாராத பொறுப்பு ஆகியவற்றின் நிலையை உறுதிப்படுத்தலாம்',
 'வழிகாட்டல், உயர் கல்வி அல்லது தொலைதூர முயற்சியில் இருந்து பயனான புதிய திட்டம் உருவாகலாம்',
 'வேலை முடிவுகளுக்கான அங்கீகாரமும் பணியிடம் கோரும் கடமையும் ஒரே நேரத்தில் முன்னிலை பெறலாம்',
 'வாடிக்கையாளர்கள் அல்லது தொடர்புகள் மூலம் வந்த வாய்ப்பை உண்மையான வருமானமாக மாற்றுவதற்கான நிபந்தனைகளைத் தீர்மானிக்கலாம்',
 'பயணம், சேவை, தனிநேரம் சார்ந்த செலவுகளை நீண்டகால வருமானத்திற்கு ஏற்றவாறு மாற்றலாம்'
];
function detailedStarRulerReading(c,star,lang,seen){const row=star?.houses?.[c.house];if(!row)return [];
 const s=row.lordStar,house=c.house,ta=lang!=='en';if(!s?.star||!s?.starRuler)return [];
 const domain=ta?TA_DEST[house-1]:EN_DEST[house-1],station=s.rulerHouse?ta?TA_DEST[s.rulerHouse-1]:EN_DEST[s.rulerHouse-1]:null;
 const isOwn=['own','exalted'].includes(s.rulerDignity),isWeak=s.rulerDignity==='debilitated';
 const first=ta?`${STAR_LORD_DOMAIN_TA[house-1]} ${station&&station!==domain?`${domain} சார்ந்த முடிவுகளில் ${station} அடிப்படையான தேர்வை மாற்றுகிறது. `:''}${isOwn?`நட்சத்திரநாதன் உறுதியான ராசி நிலையில் இருப்பதால் ${domain} குறித்த முயற்சிகளில் தொடர்ச்சியைப் பேணும் போக்கு வெளிப்படலாம்.`:isWeak?`${domain} சார்ந்த முடிவுகளில் முதல் முயற்சிக்குப் பதிலாக மாற்று வழிகளைத் தேர்ந்தெடுக்கும் நிலை அதிகமாக இருக்கலாம்.`:`${domain} சார்ந்த பலன் ஆதரவும் எதிர்ப்பும் சேர்ந்த பிறப்புத் தொடர்புகளின் அளவுக்கேற்ப மாறக்கூடும்.`}`:
 `The stellar ruler of the natal house lord ties ${domain} to ${station||'a second life theme'}; ${isOwn?'the stronger ruler may support persistence':isWeak?'the weaker ruler may require another practical route':'the relative pressure should be assessed rather than assumed'}.`;
 const aspects=(s.rulerAspects||[]).slice(0,2);const aspectKey='nakshatra-ruler-aspects:'+s.starRuler+':'+aspects.map(x=>x.from+'/'+x.aspectHouse+'/'+x.qualified).join('|');const allowAspect=aspects.length&&(!seen||!seen.has(aspectKey));if(allowAspect)seen?.add(aspectKey);const extra=allowAspect?(ta?`அந்த நட்சத்திரநாதனுக்குக் கிடைக்கும் கிரகத் தொடர்புகளால் ${aspects.map(x=>aspectLife(x,true,'a life-domain')).join(' ')}`:aspects.map(x=>aspectLife(x,false,'its stellar ruler')).join(' ')):'';
 return [first,extra].filter(Boolean);
}
function lifeNatal(c,lang,star,seen){if(!c)return [];const ta=lang!=='en',rows=[];
 if(c.house===1){rows.push(...introTraits(star,lang),...ascendantStarReading(star,ta),...lagnaBodyMindReading(star,lang));}
 const slots=MATTER_TA[c.house-1]||[];
 for(let i=0;i<slots.length;i++){
  const entry=slots[i];const adult=c.ageUnder18&&[2,5,7,10,11].includes(c.house);
  if(adult&&([2,5].includes(c.house)&&['திருமணத்திற்குப் பின் குடும்பம்','குழந்தைகள் மற்றும் வழிகாட்டல்'].includes(entry[1])||c.house===7&&['திருமணத்தில் புரிதல்','துணைவர் குடும்பத் தொடர்பு','அன்பும் நேரமும்'].includes(entry[1])))continue;
  const content=paragraphNoCalc(c,entry,i,lang,star);const p=ta?`${entry[1]} — ${content}`:`${MATTER_EN[c.house-1]?.[i]||'Daily life'} — ${content}`;
  const norm=p.replace(/\s+/g,' ').trim();if(!seen||!seen.has(norm)){rows.push(p);seen?.add(norm);}
 }
 const role=starLordLife(c,star,lang);if(role)rows.push(role);
 rows.push(...wealthFamilySpeechReading(c,star,lang),...detailedStarRulerReading(c,star,lang,seen));
 return rows.filter(t=>{const k='paragraph:'+t.replace(/\s+/g,' ').trim();if(seen?.has(k))return false;seen?.add(k);return true;});
}
// Interpret each ACTUAL MD/AD/PD window with natal house significations and
// an independently identified operative planet. No invented dates or transit.
const PERIOD_TA_LIVED={
 Sun:'அதிகாரத்திடம் பதில் சொல்லும் அல்லது தலைமை ஏற்கும் முடிவு',
 Moon:'நெருங்கியோரின் தேவையும் மனநிம்மதியும்',
 Mars:'முயற்சியின் வேகமும் நடைமுறைத் துணிவும்',
 Mercury:'பேச்சு, ஆவணம், கணக்கு அல்லது கற்றல் சார்ந்த தேர்வு',
 Jupiter:'நீண்டகால நன்மை, பெரியோர் ஆலோசனை அல்லது கல்வி',
 Venus:'ஒப்புதல், உறவு, வசதி அல்லது பணப் பகிர்வு',
 Saturn:'நெடுநாள் உழைப்பு, ஒழுங்கு, தாமதமான பலன்',
 Rahu:'புதிய தொடர்பு, வழக்கமில்லாத வாய்ப்பு அல்லது செய்தி',
 Ketu:'முடிவடைய வேண்டிய பழைய ஏற்பாடு அல்லது தனித்த ஆர்வம்'
};
const PERIOD_EN_LIVED={Sun:'taking public responsibility',Moon:'home life and emotional needs',Mars:'active effort and its pace',Mercury:'communication, learning or financial records',Jupiter:'study, counsel and longer-term judgement',Venus:'consent, relationships and shared expenditure',Saturn:'sustained work and durable duties',Rahu:'an unfamiliar offer or route',Ketu:'simplifying an earlier commitment'};
const TRANSIT_LIVED={Jupiter:'வாய்ப்பை விரிவாக்கவும் அனுபவமுள்ளவரின் உதவியைப் பயன்படுத்தவும்',Saturn:'பொறுப்பின் நீடிப்பையும் நேர ஒழுங்கையும் மறுஆய்வு செய்யவும்',Rahu:'புதிய செய்தியின் உண்மைத்தன்மையையும் ஆவண நிபந்தனைகளையும் சோதிக்கவும்',Ketu:'பழைய ஏற்பாட்டின் தேவையற்ற பகுதியை விலக்கவும்'};
const TRANSIT_EN={Jupiter:'an opening that may benefit from mentorship',Saturn:'a test of continuity and realistic obligations',Rahu:'an unusual route whose reliability needs checking',Ketu:'a chance to simplify a commitment that has lost its purpose'};
const PERIOD_HOUSE_SCENE_TA=[
 ['தன்னம்பிக்கையை வெளிப்படுத்தும் பொறுப்பை ஏற்கும்போது பிறர் நம்பிக்கை வளரலாம்','தன் நலனுக்கான நேரம் குறையுமளவு பிறர் கடமைகளை ஏற்கும் அழுத்தம் கூடலாம்'],
 ['வருமானத்தை வீட்டுத் தேவைகளுக்கு ஒதுக்கி மீதியைச் சேமிக்கும் வழி உருவாகலாம்','வரவு வந்தவுடன் உறவினர் தேவையோ நிலுவைச் செலவோ அதைப் பயன்படுத்த வேண்டியிருக்கலாம்'],
 ['தனித்திறனைப் பயனுள்ள பணியாக மாற்றுவதற்கான முயற்சி உருவாகலாம்','ஒரு முயற்சியை முடிப்பதற்குள் அதற்கான நடைமுறை மாற்றம் தேவைப்படலாம்'],
 ['வசிப்பிடம் மற்றும் குடும்பப் பராமரிப்பு சார்ந்த ஒரு முடிவை உறுதிப்படுத்தலாம்','வீட்டாரின் தேவைக்காக முன்கூட்டிய சொத்து அல்லது பராமரிப்புத் திட்டத்தை மாற்ற வேண்டியிருக்கலாம்'],
 ['ஆர்வமான கல்வி அல்லது படைப்புப் பயிற்சியில் முன்னேற்றம் தென்படலாம்','படிப்புக்கோ இளையோருக்கோ ஒதுக்கிய நேரத்தை மறுசீரமைக்க நேரலாம்'],
 ['சிக்கலான வேலையைச் சரி செய்த அனுபவத்தால் நம்பிக்கை கிடைக்கலாம்','வேலைப் போட்டியோ கடன் பொறுப்போ காரணமாக ஓய்வுக்கான நேரத்தை மீண்டும் வகுக்க நேரலாம்'],
 ['ஒரு கூட்டு முடிவுக்கான நிபந்தனைகளில் தெளிவு உருவாகலாம்','பொறுப்புகளை யார் ஏற்க வேண்டும் என்ற வேறுபாட்டை உடனே பேசித் தீர்க்க வேண்டியிருக்கலாம்'],
 ['பகிர்ந்த நிதி அல்லது பழைய ஆவணத்தில் பாதுகாப்பான மாற்றம் செய்யலாம்','எதிர்பாராத தகவல் காரணமாக ஏற்கெனவே செய்த ஒப்பந்தத்தை மீண்டும் பரிசீலிக்க நேரலாம்'],
 ['பெரியோர் வழிகாட்டலை புதிய பயிற்சி அல்லது பயணத் திட்டமாகப் பயன்படுத்தலாம்','படிப்பு மற்றும் தொலைதூர முயற்சியின் செலவு அல்லது கால வரம்பு மாற்றம் கேட்கலாம்'],
 ['பணியில் ஒரு புதிய பொறுப்பைச் செய்து காட்டும் வாய்ப்பு உருவாகலாம்','உழைப்பிற்கு உடனடி அங்கீகாரம் கிடைக்காமல் பணிமுறையை மாற்ற வேண்டியிருக்கலாம்'],
 ['பயனுள்ள தொடர்பை நிலையான வருமானத்திற்கான வழியாக வளர்க்கலாம்','கிடைக்கும் என்று எண்ணிய வரவு தாமதமானால் மாற்று பணத் திட்டம் தேவைப்படலாம்'],
 ['செலவையும் பயணத்தையும் திட்டமிட்டு தனக்கான ஓய்வை ஒதுக்கலாம்','வெளியூர் அல்லது குடும்பத் தேவை காரணமாக ஓய்வுக்கான திட்டம் மாறக்கூடும்']
];
const PERIOD_HOUSE_SCENE_EN=[
 ['taking independent responsibility may build trust','other demands may crowd out recovery'],
 ['income may be divided into household support and real savings','pending family costs can absorb an expected receipt'],
 ['practical skills may lead to independent work','a plan may need revision before it is complete'],
 ['a housing or care decision may become clearer','family needs may delay a property arrangement'],
 ['a line of study may become more rewarding','education or mentoring may need renewed time'],
 ['solving a hard work problem may bring credibility','workload or borrowing may constrain rest'],
 ['shared agreements may become clearer','an unequal division of duties may require discussion'],
 ['a joint financial arrangement may be made more secure','older agreements may need checking after a change'],
 ['mentoring may help put a longer plan into practice','the cost or timing of learning or travel may change'],
 ['a responsibility may become visible at work','recognition can lag behind the effort invested'],
 ['dependable contacts may turn into real income','promised money may arrive after it is needed'],
 ['rest and discretionary costs may become easier to plan','distance or care commitments may change those plans']
];
const PERIOD_ACTION_BY_HOUSE_TA=[
 'சொந்த முடிவை ஏற்ற பிறகு அதன் விளைவைத் திருத்திக் கொள்வது',
 'வருவாயையும் கையில் மிஞ்சும் தொகையையும் தனித்தனியாகக் கணக்கிடுவது',
 'கற்ற திறனுக்குச் செய்யக்கூடிய பணியைத் தேர்ந்தெடுப்பது',
 'வீட்டில் யாருக்கென்ன உதவி தேவை என்பதைப் பகிர்ந்து செய்வது',
 'கல்வி அல்லது படைப்புப் பயிற்சியில் தொடர்ச்சியைப் பாதுகாப்பது',
 'வேலை மற்றும் கடன் கட்டணங்களுக்கான முன்னுரிமையை அமைப்பது',
 'இருவரும் சம்மதிக்கும் பொறுப்புப் பங்கீட்டை உருவாக்குவது',
 'சொந்தப் பணத்தையும் கூட்டு ஆவணங்களையும் தெளிவாக வைத்திருப்பது',
 'வழிகாட்டலை ஏற்கும் முன் அது வாழ்க்கைத் திட்டத்திற்கு ஏற்றதா என்று பார்ப்பது',
 'செய்த பணிக்குரிய பொறுப்பையும் கிடைக்கும் அங்கீகாரத்தையும் வேறுபடுத்துவது',
 'வாடிக்கையாளரின் வாக்குறுதியையும் உறுதியான வரவையும் பிரித்தறிவது',
 'ஓய்வு, பயணம், சேவைச் செலவுகளை மற்ற தேவைகளோடு இணைப்பது'
];
const AGE_TOPIC_TA={2:'பள்ளி வழக்கத்திற்கு ஏற்ற குடும்ப உதவியும் செலவுக் கட்டுப்பாடும்',5:'பாடங்கள், விளையாட்டு, படைப்புப் பயிற்சிகளின் தொடர்ச்சி',7:'வகுப்புத் தோழர்களுடனான ஒத்துழைப்பு மற்றும் வரம்புகள்',10:'பள்ளித் திட்டங்கள், ஆசிரியர் அளிக்கும் கடமை மற்றும் எதிர்காலத் திறன்',11:'குழு கற்றல், நட்பில் நம்பிக்கை மற்றும் பெரியோர் உதவி'};
const AGE_TOPIC_EN={2:'family support and everyday spending',5:'learning, play and creative practice',7:'cooperation with classmates and peers',10:'assigned study tasks and emerging skills',11:'group learning, friendships and help from adults'};
function chosenMatter(c,op){const slots=MATTER_TA[c.house-1]||[];return slots.find(x=>x[0]===op)||slots.find(x=>x[0]===c.lord)||slots[0]||null;}
function nakshatraChannel(star,planet,lang){const s=star?.planets?.[planet],ta=lang!=='en';if(!s?.starRuler)return '';
 const place=s.rulerHouse||null,domain=place?(ta?NATAL_CHANNEL_TA[place-1]:NATAL_CHANNEL_EN[place-1]):null;
 const ruler=s.starRuler,glow=s.rulerDignity;
 if(ta){const name=actor(ruler,true);const result=domain?`${domain} சார்ந்த அனுபவமும் இந்த முடிவோடு இணையலாம்`:'நட்சத்திரநாதன் வழியாக இன்னொரு வாழ்க்கைத் தேவை இந்த முடிவில் கலந்து வரலாம்';
  if(glow==='debilitated'||s.rulerCombust)return `${name} வழி வரும் ${result.replace('இணையலாம்','இணையும் போதும்')} உடனடி உறுதியைவிடச் சரிபார்க்கப்பட்ட வழிமுறை உதவலாம்.`;
  if(glow==='own'||glow==='exalted')return `${name} தொடர்பான ${result}; அந்த வழியில் தொடர்ச்சியாக முயல்வதற்கான ஆதரவும் இருக்கலாம்.`;
  return `${name} மூலம் ${result}.`;
 }
 return `${ruler}'s natal stellar link${domain?' also brings '+domain+' into this decision':''}${glow==='debilitated'||s.rulerCombust?', but its condition requires measured expectations':glow==='own'||glow==='exalted'?', with a supportive sign position':''}.`;
}
function lifePeriod(win,c,lang,star){const p=win?.period;if(!p?.from||!p?.to||!p?.md||!p?.ad||!c||!win?.links?.length)return '';
 const ta=lang!=='en',child=p.age!=null&&p.age<18,focus=child?(ta?(AGE_TOPIC_TA[c.house]||NATAL_CHANNEL_TA[c.house-1]):(AGE_TOPIC_EN[c.house]||NATAL_CHANNEL_EN[c.house-1])):null;
 const area=focus||(ta?NATAL_CHANNEL_TA[c.house-1]:NATAL_CHANNEL_EN[c.house-1]);
 const state=c.conclusion==='support'?0:c.conclusion==='strain'?1:(win?.transit?.signal>0?0:1);
 const scene=(ta?PERIOD_HOUSE_SCENE_TA:PERIOD_HOUSE_SCENE_EN)[c.house-1][state];
 const md=(ta?PERIOD_TA_LIVED:PERIOD_EN_LIVED)[p.md],ad=(ta?PERIOD_TA_LIVED:PERIOD_EN_LIVED)[p.ad];
 const matter=chosenMatter(c,p.ad);
 const nodeAd=star?.planets?.[p.ad],nodeMd=star?.planets?.[p.md];
 const adHouse=nodeAd?.rulerHouse||null,mdHouse=nodeMd?.rulerHouse||null;
 const direct=win?.links?.some(x=>String(x).startsWith(p.ad+':'));
 const caseResult=matter?(ta?(state===0?matter[2]:matter[3]):
   (MATTER_EN_LIVED[c.house-1]||[])[(MATTER_TA[c.house-1]||[]).indexOf(matter)]?.[state]):'';
 const mdInfo=nakshatraChannel(star,p.md,lang),adInfo=p.md!==p.ad?nakshatraChannel(star,p.ad,lang):'';
 const coherent=adHouse&&mdHouse&&adHouse!==mdHouse?(ta?`${NATAL_CHANNEL_TA[mdHouse-1]} வழியாகத் தொடங்கும் நீண்டகால நோக்கமும் ${NATAL_CHANNEL_TA[adHouse-1]} சார்ந்த அன்றாடத் தேர்வும் ஒரே நேரத்தில் முன்னிலை பெறலாம்.`:
 `The longer aim concerns ${NATAL_CHANNEL_EN[mdHouse-1]}, while daily choices involve ${NATAL_CHANNEL_EN[adHouse-1]}.`):'';
 const evidence=win?.transit?(ta?`${actor(win.transit.planet,true)} கோச்சாரமும் இக்காலத்துடன் சேர்ந்திருந்தால், ${PERIOD_ACTION_BY_HOUSE_TA[c.house-1]} குறித்த முடிவுக்கு ஆதரவு அல்லது மறுஆய்வு தேவை வரலாம்.`:
 `A sampled ${win.transit.planet} transit adds a separate reason to review ${area}.`):'';
 if(ta)return [
   `${p.from} முதல் ${p.to} வரை ${area} தொடர்பாக ${scene}.`,
   `${actor(p.md,true)} மகாதசைச் சூழலில் ${md}; ${actor(p.ad,true)} புக்தி செயல்படும் போது ${ad}. `,
   caseResult&&!(child&&[2,5,7,10,11].includes(c.house))?caseResult:'',
   coherent,mdInfo,adInfo,evidence
  ].filter(Boolean).join(' ');
 return [
   `${p.from}–${p.to}: ${scene} in ${area}.`,
   `The ${p.md} major period emphasizes ${md}; the ${p.ad} sub-period shifts the immediate choice toward ${ad}.`,
   child?`At this age the focus is on ${focus} rather than adult events.`:(caseResult||''),coherent,mdInfo,adInfo,evidence
 ].filter(Boolean).join(' ');
}
function lifePD(win,lang,star){const p=win?.period,c=win?.claim;if(!p?.pd||!p?.from||!p?.to||!c)return '';
 const ta=lang!=='en',age=p.age,child=age!=null&&age<18;
 const src=star?.planets?.[p.pd],pdHouse=src?.rulerHouse||null;
 const target=chosenMatter(c,p.pd),both=(c.positive||[]).length>0&&(c.negative||[]).length>0;
 const base=ta?(child?(AGE_TOPIC_TA[c.house]||NATAL_CHANNEL_TA[c.house-1]):NATAL_CHANNEL_TA[c.house-1]):
  (child?(AGE_TOPIC_EN[c.house]||NATAL_CHANNEL_EN[c.house-1]):NATAL_CHANNEL_EN[c.house-1]);
 const path=nakshatraChannel(star,p.pd,lang),third=ta?PERIOD_TA_LIVED[p.pd]:PERIOD_EN_LIVED[p.pd];
 const md=ta?PERIOD_TA_LIVED[p.md]:PERIOD_EN_LIVED[p.md],ad=ta?PERIOD_TA_LIVED[p.ad]:PERIOD_EN_LIVED[p.ad];
 const witnesses=win.thirdRulerWitness||[];
 const pressure=witnesses.some(x=>Number(x.delta)<-.2),support=witnesses.some(x=>Number(x.delta)>.2);
 const resolved=pressure&&!support?'strain':support&&!pressure?'support':both?'mixed':c.conclusion;
 const idx=(MATTER_TA[c.house-1]||[]).indexOf(target);
 const material=child&&[2,5,7,10,11].includes(c.house)?'':
  target?(ta?(resolved==='strain'?target[3]:resolved==='support'?target[2]:`${target[2]} ${target[3]}`):
   (MATTER_EN_LIVED[c.house-1]||[])[idx]?.[resolved==='strain'?1:0]||''):'';
 const domain=pdHouse?(ta?NATAL_CHANNEL_TA[pdHouse-1]:NATAL_CHANNEL_EN[pdHouse-1]):null;
 if(ta)return [
   `${p.from} – ${p.to} அந்தரக் காலத்தில் ${base} சார்ந்த முடிவு புதிய முன்னுரிமையாகலாம்.`,
   `${actor(p.md,true)} மகாதசையின் ${md} என்ற நோக்கத்திற்கும் ${actor(p.ad,true)} புக்தியின் ${ad} என்ற நடைமுறைக்கும் இடையில், ${actor(p.pd,true)} அந்தரம் ${third} தொடர்பான குறிப்பிட்ட செயலை முன்னிலைப்படுத்தலாம்.`,
   material,domain&&pdHouse!==c.house?`${domain} பற்றிய நிகழ்வும் இந்தத் தீர்மானத்தை மாற்றக்கூடும்.`:'',path
 ].filter(Boolean).join(' ');
 return [
  `${p.from}–${p.to}: a distinct ${p.pd} third-level period is linked to ${base}.`,
  `The longer ${p.md} theme concerns ${md}; ${p.ad} brings ${ad}, while ${p.pd} modifies the practical choice through ${third}.`,
  material,domain&&pdHouse!==c.house?`Natal links to ${domain} may also alter the decision.`:'',path
 ].filter(Boolean).join(' ');
}
function lifeYear(group,lang,star){if(!group?.claim||!group.period||!group.transit||!group.from||!group.to)return '';
 const c=group.claim,ta=lang!=='en',p=group.period,t=group.transit;
 const child=group.age!=null&&group.age<18;
 const area=child?(ta?AGE_TOPIC_TA[c.house]:AGE_TOPIC_EN[c.house]):null;
 const field=area||(ta?NATAL_CHANNEL_TA[c.house-1]:NATAL_CHANNEL_EN[c.house-1]);
 const supportive=Number(t.signal)>0,restrictive=Number(t.signal)<0;
 const theme=ta?TRANSIT_LIVED[t.planet]:TRANSIT_EN[t.planet];
 const scene=(ta?PERIOD_HOUSE_SCENE_TA:PERIOD_HOUSE_SCENE_EN)[c.house-1][supportive?0:1];
 const ad=star?.planets?.[p.ad],another=ad?.rulerHouse&&ad.rulerHouse!==c.house?(ta?NATAL_CHANNEL_TA[ad.rulerHouse-1]:NATAL_CHANNEL_EN[ad.rulerHouse-1]):null;
 const observed=Array.isArray(group.samples)&&group.samples.length?group.samples[0]:t.observedOn;
 const retest=ta?(supportive?'முன்னேற்றத்திற்கு ஏற்ற அடிப்படை இருக்கலாம்':restrictive?'புதிய உறுதி அளிப்பதற்கு முன் நிபந்தனைகளை மீண்டும் பார்க்க வேண்டியிருக்கலாம்':'ஆதரவும் தடையும் கலந்து இருக்கும் சூழல்'):
  (supportive?'a supporting context':restrictive?'a reason to revise existing plans':'a mixed context');
 if(ta)return [
  `${group.from} – ${group.to} கால இடைவெளியில் ${field} தொடர்பாக ${scene}.`,
  `${actor(t.planet,true)} பெயர்ச்சியின் ${observed||'கணிக்கப்பட்ட'} நிலையுடன் ${actor(p.md,true)} மகாதசையும் ${actor(p.ad,true)} புக்தியும் சேர்ந்துள்ளதால், ${theme||'வாழ்க்கைத் திட்டத்தை ஆராயவும்'} என்ற தேவை ${retest}.`,
  another?`${another} பற்றிய முன்பிருந்த ஏற்பாடு முடிவெடுக்கும் வேகத்தை மாற்றக்கூடும்.`:'',
  nakshatraChannel(star,p.ad,lang)
 ].filter(Boolean).join(' ');
 return [
  `${group.from}–${group.to}: ${scene} in ${field}.`,
  `The sampled ${t.planet} movement (${observed||'dated'}), considered alongside ${p.md}/${p.ad}, represents ${retest} and ${theme||'a fresh review of plans'}.`,
  another?`Existing commitments involving ${another} can change the pace of a choice.`:'',
  nakshatraChannel(star,p.ad,lang)
 ].filter(Boolean).join(' ');
}
function lifeOverview(s,star,lang){if(!s?.main)return [];
 const lead=lang!=='en'?NATAL_CHANNEL_TA[s.main.house-1]:NATAL_CHANNEL_EN[s.main.house-1];
 const counter=s.counter&&s.counter.house!==s.main.house?(lang!=='en'?NATAL_CHANNEL_TA[s.counter.house-1]:NATAL_CHANNEL_EN[s.counter.house-1]):null;
 return lang!=='en'?[
  `${lead} பற்றிய தீர்மானங்கள் ஜாதகரின் வாழ்வில் தொடர்ச்சியாக இடம் பெறலாம்; அவற்றின் சாதகமான பகுதியைத் தேர்ந்தெடுக்க முன் ஏற்பட்ட அனுபவம் உதவக்கூடும்.`,
  ...(counter?[`${counter} சார்ந்த கடமையும் உடன் வந்தால் இரண்டிற்கும் தேவைப்படும் நேரம் வேறுபடக்கூடும்; இந்த வேறுபாட்டைப் புரிந்து செயல் திட்டத்தை அமைக்கும் வழக்கம் வளரலாம்.`]:[])
 ]:[`Decisions about ${lead} may occupy an important place in the person's life.`,...(counter?[`The additional demands of ${counter} may have to be weighed separately rather than treated as one outcome.`]:[])];
}

return Object.freeze({natal,period,year,summary,lifeNatal,lifePeriod,lifePD,lifeYear,lifeOverview,introTraits});
});

;

/* ---- remedies.js (preserves original execution order) ---- */
/* V311 remedies evidence expansion — D1 risk + lord/occupant/aspect + date.
   Reference for classification: Encyclopedia of Astrological Remedies (2020),
   PDF pp 11–13; sign-element traditions are optional cultural practices,
   NOT established medical/financial outcomes. No automatic gemstone sale.
   No readings, network calls, DOM changes, timers or random choices. */
(function(g,f){'use strict';const api=f(g);g.SMVD311Remedies=api;if(typeof module==='object'&&module.exports)module.exports=api;})(typeof window!=='undefined'?window:globalThis,function(g){'use strict';
// Each topic carries a distinct chain of concrete precautions. Only show
// when a natal difficulty is present; do not print an unqualified checklist.
const HOUSE_ACTIONS=[
 [
  ['முடிவெடுக்கும்போது குடும்பத்தின் ஆலோசனையையும் சொந்த விருப்பத்தையும் தனித்தனியாகக் குறித்துவிட்டு முடிவு எடுக்கவும்','உடல் உழைப்புக்கு ஏற்ற ஓய்வை முன்கூட்டியே ஒதுக்கி அதிக வேலைகளை ஏற்றுக்கொள்வதைத் தவிர்க்கவும்','தன்னம்பிக்கைக் குறைவு ஏற்பட்டால் முடித்த சிறிய செயல்களின் பட்டியலை வைத்துத் தொடங்கவும்'],
  ['Separate your own choice from family expectations before taking a commitment','Reserve recovery time before accepting extra physical tasks','Build confidence from a written record of completed small tasks']
 ],[
  ['வரவு உறுதிப்பட்ட பிறகே செலவுக்கான ஒப்புதல் அளிக்கவும்; எதிர்பார்த்த தொகையை வரவாக எழுத வேண்டாம்','குடும்பத்தில் செலவு பற்றி பேசும்போது நபரை விமர்சிக்காமல் எண்ணிக்கை, தேதி, காரணத்தைப் பதிவு செய்யவும்','மாதாந்திரச் சேமிப்பையும் அவசரத் தேவைக்கான பணத்தையும் தனித் திட்டங்களாக வைத்திருக்கவும்'],
  ['Approve spending only against confirmed income, not promised receipts','Discuss family expenses using figures, dates and purposes rather than personal blame','Keep an emergency reserve plan separate from routine savings']
 ],[
  ['புதிய முயற்சியில் எடுக்க வேண்டிய மூன்று நடவடிக்கைகளை மட்டும் எழுதி முதல் முயற்சியை முடித்த பிறகு அடுத்ததைத் தொடங்கவும்','உடன்பிறந்தோரிடம் பணம் அல்லது உதவி எதிர்பார்த்தால் வாக்குறுதியை எழுத்தில் தெளிவுபடுத்தவும்','திறமை வளர்ச்சிக்காக குறுகிய காலப் பயிற்சியைத் தேர்ந்து செய்த முன்னேற்றத்தைச் சரிபார்க்கவும்'],
  ['Break a new initiative into three practical steps and finish the first before switching plans','Put expectations of sibling help or repayment into clear terms','Review measurable progress after a short skills-training cycle']
 ],[
  ['வீடு/நில ஆவணத்தில் பட்டா, உரிமை, கடன் விவரங்களை ஒரே கோப்பில் சேகரிக்கவும்','பெற்றோர் பராமரிப்புக்கான நேரம் மற்றும் செலவை மற்ற குடும்ப உறுப்பினர்களுடன் பகிர்ந்து திட்டமிடவும்','வசிப்பிட மாற்றத்தால் கல்வி, பணி, போக்குவரத்துக்கு வரும் விளைவுகளை முன்கூட்டியே கணக்கிடவும்'],
  ['Gather title, liabilities and ownership documents for independent review','Share a written care-time and budget plan with relevant family members','Cost the impact of a move on schooling, work and travel before committing']
 ],[
  ['கல்வியில் குறைந்த முன்னேற்றத்தை ஒரே நாளில் சரிசெய்ய முயலாமல் வார வாரமாகப் பயிற்சியை அமைக்கவும்','குழந்தைகளுக்கான திட்டங்களில் அவர்களுடைய வயதும் விருப்பமும் கல்வி நிலையும் பொருந்துகிறதா பார்க்கவும்','படைப்புப் பணியை கைவிடுவதற்கு முன் தடையாக இருப்பது நேரமா, வழிகாட்டலா, செலவா என்பதைத் தெளிவாக்கவும்'],
  ['Replace crash-study plans with a measurable weekly learning routine','Keep children’s plans age-appropriate and responsive to their needs','Identify whether time, training or cost blocks creative work before abandoning it']
 ],[
  ['பணிச்சுமையைப் பணிக்கான காலக் கட்டங்களாகப் பிரித்து முடியாத பணியை முன்கூட்டியே தெரிவித்துவிடவும்','கடனின் வட்டி, தவணை, கடைசித் தேதியை எழுதி வைத்து புதிய கடன் எடுப்பதைச் சரிபார்க்கவும்','உடல்நலக் கவலை தொடர்ந்தால் மருத்துவரை அணுகவும்; ஜோதிட முடிவை நோயறிதலாக எடுத்துக்கொள்ள வேண்டாம்'],
  ['Set realistic work deadlines and communicate overload early','Check interest, installments and maturity dates before taking on new borrowing','Seek qualified medical assessment for persistent symptoms; do not treat astrology as diagnosis']
 ],[
  ['திருமணம் அல்லது கூட்டுத் தொழிலில் எதிர்பார்ப்புகள், செலவு, தனிநேரம் குறித்து இருவரும் பேசிப் பதிவு செய்யவும்','கருத்து வேறுபாட்டில் முதலாவதாக விவாதிக்க வேண்டிய ஒன்றை மட்டும் தேர்ந்து முந்தைய பிரச்சினைகளைக் கலக்க வேண்டாம்','உறவு அல்லது ஒப்பந்த முடிவிற்கு முன் நிதிப் பொறுப்பு, குடும்பத் தலையீடு, வேலை நேரம் ஆகியவற்றைச் சரிபார்க்கவும்'],
  ['Discuss and record expectations, time and spending in partnership','Resolve one disagreement at a time instead of reopening unrelated disputes','Review finances, family boundaries and work hours before binding decisions']
 ],[
  ['கூட்டுச் சொத்து, வாரிசு, காப்பீடு மற்றும் கடன் ஆவணங்களுக்கு தனித் தொகுப்பு உருவாக்கவும்','எதிர்பாராத செலவிற்காக கணக்கில் எளிதில் அணுகக்கூடிய பாதுகாப்புத் தொகை வைத்திருக்கவும்','பழைய ஒப்பந்தத்தை மாற்றும்போது சட்ட அல்லது கணக்கியல் நிபுணரிடம் நிபந்தனைகளைச் சரிபார்க்கவும்'],
  ['Maintain separate records for joint assets, inheritance, insurance and debt','Plan readily accessible funds for unplanned obligations','Seek qualified legal or accounting review before altering a long-standing contract']
 ],[
  ['பெரியோர் அல்லது ஆசிரியர் ஆலோசனையைக் கேட்டு அதற்கான செயல்திட்டத்தைச் சொந்த சூழலுக்கேற்ப மாற்றவும்','மேற்படிப்பு, பயணம் அல்லது சான்றிதழுக்கான தொகையைப் படிப்படியாக ஒதுக்கவும்','அறிமுகமில்லாத இடத்திற்குச் செல்லும்போது பயண, தங்குமிட, தொடர்பு தகவல்களை முன்கூட்டியே சரிபார்க்கவும்'],
  ['Translate mentors’ advice into a plan that fits actual circumstances','Budget study, travel and certification costs in stages','Verify arrangements, contacts and lodging before distant travel']
 ],[
  ['செய்த பணிகள், முடிந்த திட்டங்கள், பெற்ற பாராட்டுகள் ஆகியவற்றைத் தேதியுடன் பதிவு செய்யவும்','பொறுப்பு அதிகரித்தால் அதற்கான அதிகாரம், உதவி, நேரம் ஆகியவையும் கிடைக்கிறதா மதிப்பிடவும்','வேலை மாறுவதற்கு முன் புதிய வேலையின் நடைமுறை நிபந்தனைகள் மற்றும் வருமான இடைவெளியைச் சரிபார்க்கவும்'],
  ['Record completed assignments, project dates and verified contributions','Compare added duties with available authority, support and time','Check offer terms and the income gap before resigning or changing roles']
 ],[
  ['வருமானம் தரும் தொடர்புகளுக்கும் நேரம் மட்டுமே எடுத்துக்கொள்ளும் தொடர்புகளுக்கும் வேறுபாடு காணவும்','நண்பர்கள் அல்லது கூட்டாளிகள் கூறும் இலாபத்தைக் கையில் கிடைத்த வரவாகக் கருத வேண்டாம்','மீண்டும் கிடைக்கும் வாடிக்கையாளர்கள் மற்றும் தாமதிக்கும் கட்டணங்களை தனியே பதிவு செய்யவும்'],
  ['Distinguish networks that generate verified work from those consuming time','Do not count a friend’s promise of profit as available cash','Track returning clients and overdue payments separately']
 ],[
  ['வெளியூர் பயணம், தங்குமிடம், உணவு, போக்குவரத்து ஆகியவற்றுக்கு தனித்துச் செலவு வரம்பு நிர்ணயிக்கவும்','ஓய்வு குறையும் நாட்களில் முக்கிய முடிவுகளைத் தள்ளிவைத்து உறக்க முறையைச் சீர்செய்யவும்','தூர உறவினருக்கான உதவியில் தன்னுடைய வருவாய் மற்றும் குடும்பத் தேவைக்குப் போதிய தொகையைப் பாதுகாக்கவும்'],
  ['Set independent limits for travel, lodging, meals and transport','Delay major choices made while exhausted and restore sleep routines','Keep your own household reserve safe when supporting distant relatives']
 ]
];
const CHILD_ACTIONS={
 2:[['குடும்பத்தில் கல்வி மற்றும் உணவுக்கான தேவையைப் பெரியோரிடம் தெளிவாகச் சொல்லப் பயிற்சி செய்யவும்','விளையாட்டு பொருட்களுக்கும் படிப்புப் பொருட்களுக்கும் தேவையான செலவைப் பெற்றோருடன் முன்கூட்டியே திட்டமிடவும்'],['Practise stating school and household needs clearly to trusted adults','Plan school and play supplies with parents in advance']],
 5:[['பள்ளிப் பாடத்தைச் சிறிய பயிற்சி நேரங்களாகப் பிரித்து ஆசிரியரின் கருத்தைக் கேட்கவும்','விளையாட்டு, படிப்பு, ஓய்வு மூன்றுக்கும் ஒழுங்கான அட்டவணை அமைக்கவும்'],['Divide school practice into short sessions and seek teacher feedback','Balance play, study and rest in an age-appropriate routine']],
 6:[['வீட்டுப்பாடம், உணவு, விளையாட்டு, ஓய்வு ஆகியவற்றுக்கு பெற்றோருடன் எளிய அட்டவணை அமைக்கவும்','பள்ளிச் சிக்கல் தொடர்ந்தால் பெற்றோர் அல்லது ஆசிரியரிடம் உடனே தெரிவிக்கவும்'],['Plan homework, meals, activity and rest with a parent','Tell parents or teachers about persistent school difficulties']],
 7:[['நண்பர்களுடன் கருத்து வேறுபாடு வந்தால் ஆசிரியர் உதவியுடன் பேசித் தீர்ப்பதைக் கற்றுக்கொள்ளவும்','குழுவில் ஒவ்வொருவருக்கும் ஒரு பொறுப்பு இருப்பதை ஒப்புக்கொண்டு பகிர்ந்து செய்யவும்'],['Discuss peer disagreements with help from a teacher or parent','Practise fair sharing of duties in group learning']],
 8:[['பள்ளி அல்லது வீட்டில் பாதுகாப்பு விதிகளைப் புரிந்து பெரியோரிடம் சந்தேகங்களைக் கேட்கவும்','முக்கியக் குடும்ப ஆவணங்களைப் பெற்றோர்கள் பாதுகாப்பாக வைத்திருப்பதை உறுதி செய்யச் சொல்லவும்'],['Discuss practical safety precautions with responsible adults','Ask caregivers to keep important family records safe']],
 10:[['ஒப்படைக்கப்பட்ட பள்ளிப் பணியைச் சிறிய பகுதிகளாக முடித்துச் சோதிக்கவும்','திறமை மதிப்பீட்டில் குறை இருந்தால் ஆசிரியரிடம் குறிப்பிட்ட மேம்பாட்டு வழிமுறையைக் கேட்கவும்'],['Break assigned schoolwork into small completed steps','Ask teachers for specific feedback when learning needs improvement']],
 11:[['குழு விளையாட்டு அல்லது வகுப்புத் திட்டத்தில் அனைவருக்கும் வாய்ப்பு கிடைக்க உதவவும்','நண்பர் தொடர்புகளால் வீட்டுப்பாடம் அல்லது ஓய்வு பாதிக்கப்படுகிறதா கவனிக்கவும்'],['Make group activities fair to all classmates','Balance peer time with schoolwork and rest']],
 12:[['இரவு உறக்கத்துக்கும் படிப்புக்கும் பெற்றோருடன் நிலையான பழக்கம் அமைக்கவும்','வெளியூர் பயணம் அல்லது புதிய இடம் தொடர்பான பயத்தைப் பெற்றோருடன் பேசவும்'],['Keep a regular bedtime and school routine with caregivers','Discuss travel or unfamiliar-place worries with trusted adults']]
};
const PRACTICE={
 Sun:['பதவி அல்லது அதிகாரம் தொடர்பான உரையாடலில் தெளிவான பொறுப்பை அமைக்கவும்','Define authority and responsibility clearly','சூரிய நமஸ்காரம் அல்லது காலையில் அமைதியான தியானம்','Sun-related prayer or quiet morning contemplation'],
 Moon:['மனஅழுத்தமும் உறக்க நேரமும் பாதிக்கப்படாமல் குடும்ப உரையாடலை ஒழுங்குபடுத்தவும்','Protect sleep and schedule supportive family discussions','சிவ அல்லது அம்மன் வழிபாடு, அன்னதானம்','Shiva or Devi devotion, food charity'],
 Mars:['கோபமான தருணத்தில் ஒப்பந்தத்தை முடிக்காமல் பாதுகாப்பான உடற்பயிற்சி வழக்கம் அமைக்கவும்','Avoid signing contracts in anger; maintain safe exercise','முருகன் வழிபாடு, உடலுழைப்புச் சேவை','Murugan devotion, practical volunteering'],
 Mercury:['கணக்கு, செய்தி, ஒப்பந்த நிபந்தனைகளை இரண்டாம் முறையாக வாசித்துச் சரிபார்க்கவும்','Double-check accounts, messages and contractual wording','விஷ்ணு வழிபாடு, மாணவர்களுக்குக் கல்வி உதவி','Vishnu devotion, educational charity'],
 Jupiter:['ஆசிரியர் மற்றும் ஆலோசகர்களின் கருத்தை நடைமுறை ஆதாரத்துடன் ஒப்பிடவும்','Test mentors’ advice against practical evidence','குரு வழிபாடு, ஆசிரியர்களுக்கு உதவி','Guru devotion, service to teachers'],
 Venus:['உறவுக்கான எதிர்பார்ப்பையும் செலவையும் நிதானமாக வெளிப்படுத்தவும்','Speak openly about affection, expectations and costs','மகாலட்சுமி வழிபாடு, பெண்கள் கல்விக்கு உதவி','Lakshmi devotion, support for women’s education'],
 Saturn:['நீடித்த கடமையைச் சிறிய காலத் திட்டங்களாகப் பிரிக்கவும்','Divide long-term commitments into manageable milestones','சனீஸ்வரர் வழிபாடு, முதியோருக்கும் தொழிலாளர்களுக்கும் உதவி','Saturn devotion, help to elders or workers'],
 Rahu:['புதிய முதலீடு மற்றும் ஆன்லைன் தகவலில் மூலத்தைப் பரிசோதிக்கவும்','Verify sources behind investment pitches and online claims','துர்க்கை வழிபாடு, சமூகத் தொண்டு','Durga devotion, community service'],
 Ketu:['தனிமையில் முடிவெடுப்பதை விடத் தொடர்புடையவர்களின் கருத்தையும் கேட்கவும்','Seek relevant feedback before making isolated decisions','விநாயகர் வழிபாடு, தன்னார்வ கல்விச் சேவை','Vinayagar devotion, volunteering in learning support']
};
// Sign-based traditional categories are drawn from Remedies book PDF p.13.
// They are alternatives for personal preference, NOT automatic instructions.
const TRADITION=[
 ['விருப்பமிருந்தால் சுருக்கமான பிரார்த்தனை அல்லது வழிபாட்டு விரதம் பற்றிப் பாரம்பரிய வழிகாட்டலுடன் ஆலோசிக்கலாம். உடல் நலத்தால் பாதிக்கப்படும் விரதத்தை மேற்கொள்ள வேண்டாம்.','If desired, discuss optional prayer or a fast with a knowledgeable guide; avoid fasting that conflicts with health needs.'],
 ['விருப்பமான கோவில் தரிசனம் அல்லது அமைதியான தியான நேரத்தைத் தேர்ந்தெடுக்கலாம்; ரத்தினம் வாங்குவதற்கு முன் முழு ஜாதகத் தீர்ப்பு அவசியம்.','If meaningful to you, choose temple visits or reflection; no gemstone is prescribed without a full independent assessment.'],
 ['தனிப்பட்ட மனப்பக்குவத்திற்கு ஏற்ற சிறிய மந்திரம் அல்லது ஸ்தோத்திர பாராயணம் ஒன்றைத் தேர்ந்தெடுக்கலாம்.','An optional mantra or hymn practice can be chosen for personal reflection.'],
 ['தன்னால் இயன்ற அளவில் குடிநீர் உதவி அல்லது உணவுத் தொண்டு போன்ற செயல்களைத் தேர்ந்தெடுக்கலாம்.','Consider voluntary water or food service according to your means.']
];
function element(sign){if(!Number.isInteger(sign)||sign<0||sign>11)return -1;return [0,1,2,3][sign%4];}
const relTA={lord:'பாவாதிபதியாக',occupies:'பாவத்தில் இருப்பதால்',aspects:'பாவத்தைப் பார்ப்பதால்'};
const STAR_REMEDY_TA=[
 'முக்கிய முடிவிற்கு முன் இரண்டு மாற்று வழிகளின் காலம், செலவு, குடும்ப ஆதரவைத் தனியே எழுதிவிட்டு தேர்வு செய்யவும்',
 'வரவு, உறுதியான சேமிப்பு, குடும்பத்தாருக்கு வழங்கும் உதவி ஆகியவற்றை மூன்று தனிப் பதிவுகளாகப் பாதுகாக்கவும்',
 'உடன்பிறந்தோர் அல்லது நெருங்கியோர் சார்ந்த பொறுப்பை யார் எப்போது முடிப்பார் என்பதை வெளிப்படையாக ஒப்புக்கொள்ளவும்',
 'வசிப்பிடம் அல்லது சொத்துத் திட்டத்தில் உரிமைச் சான்றையும் பராமரிப்புச் செலவையும் இரண்டு கட்டமாகச் சரிபார்க்கவும்',
 'கல்வி அல்லது குழந்தைகளின் வளர்ச்சியில் விரைவான முடிவுக்கு பதிலாக வயதுக்கேற்ற தொடர்ச்சியான பயிற்சியைத் தேர்ந்தெடுக்கவும்',
 'வேலைப் போட்டி அதிகரிக்கும் போது முக்கியமான உடல் நலச் சோதனை, ஓய்வு, கடன் தவணையை விடாமல் கவனிக்கவும்',
 'கூட்டாளியின் கருத்தைக் கேட்டபின் பணம், நேரம், குடும்பத் தலையீடு குறித்து எழுத்தில் தெளிவுபடுத்தவும்',
 'பகிர்ந்த சொத்து அல்லது புதிய ஒப்பந்தத்தில் சிக்கல் இருந்தால் தனித்த சட்ட மற்றும் கணக்கியல் ஆலோசனையைப் பெறவும்',
 'ஆசிரியர் அல்லது பெரியோர் ஆலோசனையைச் சொந்தத் திறன், செலவு, காலநிலைக்கு ஏற்ற செயல் திட்டமாக மாற்றவும்',
 'பணிக்கான அங்கீகாரம் தாமதிக்கும்போது முடிந்த பணி மற்றும் கூடுதல் பொறுப்புகளுக்கான ஆதாரத்தைச் சேர்த்து வைக்கவும்',
 'பழைய கடன் அல்லது நிலுவைக் கட்டணத்தைப் புதிய வருமான வாய்ப்புடன் கலக்காமல் தனி அட்டவணையில் வைத்திருக்கவும்',
 'பயணம் அல்லது உறவினர் உதவிக்காக ஒதுக்கும் பணம் குடும்பத்திற்குத் தேவையான பாதுகாப்புத் தொகையை பாதிக்காதபடி பார்க்கவும்'
];
const STAR_REMEDY_EN=[
 'compare the costs, timing and family support behind two realistic choices',
 'record confirmed income, protected savings and help to relatives separately',
 'clarify who is responsible for completing a shared task and by when',
 'review legal title and ongoing maintenance costs independently',
 'use regular age-appropriate practice instead of forcing quick results',
 'protect rest, scheduled repayment and genuine healthcare needs under work pressure',
 'clarify shared money, time and boundaries before major agreements',
 'obtain appropriate legal or accounting review of jointly held obligations',
 'adapt the advice of teachers or mentors to realistic time and resources',
 'document completed work and responsibilities when recognition is delayed',
 'track overdue money separately from new, unconfirmed opportunities',
 'protect the household reserve before committing to travel or distant support'
];
function select(c,lang,used,windows=[],starContext=null){const ta=lang!=='en';
 // More coverage than the previous five-house hard limit, but never assign
 // remedies for a favourable chart without an evidenced restrictive factor.
 const risks=c.negative.filter(x=>['lord','occupies','aspects'].includes(x.relation)&&x.delta<=-.4).sort((a,b)=>a.delta-b.delta);
 if(!risks.length)return [];
 const risk=risks[0],key=`H${c.house}:${risk.relation}:${risk.planet}:${risk.delta.toFixed(2)}`;
 if(used.has(key))return [];used.add(key);
 const lordTa=g.SMVD311Judgement?.NTA?.[risk.planet]||risk.planet;
 const base=ta?`${c.house}-ஆம் பாவத்தின் தொடர்பில் ${lordTa} ${relTA[risk.relation]} காணப்படும் சிரமச் சுட்டுக்காக`:
 `For the observed ${risk.planet} ${risk.relation} challenge to house ${c.house}`;
 const mitigation=(c.classical||[]).some(x=>x.key==='GURU_COUNTER_ASPECT')||(c.divisionEvidence||[]).some(x=>x.planet===c.lord&&x.dignity==='strong');
 const period=(windows||[]).find(w=>(w?.period?.md===risk.planet||w?.period?.ad===risk.planet)&&w?.weight>=2.4&&w?.links?.length);
 const timing=period?`${period.period.from}–${period.period.to}`:null;
 const transit=period?.coincidence&&period?.transit?.planet?period.transit:null;
 const windowFrom=transit&&timing?[period.period.from,transit.yearFrom].filter(Boolean).sort().slice(-1)[0]:null;
 const windowTo=transit&&timing?[period.period.to,transit.yearTo].filter(Boolean).sort()[0]:null;
 const convergence=Boolean(windowFrom&&windowTo&&windowFrom<windowTo);
 const details=(c.ageUnder18&&CHILD_ACTIONS[c.house]?CHILD_ACTIONS[c.house]:HOUSE_ACTIONS[c.house-1])?.[ta?0:1]||[];
 const evidence={planet:risk.planet,house:c.house,reason:risk.relation,score:risk.delta,mitigation,period:timing,sourceKey:key,transitPlanet:convergence?transit.planet:null,dashaTransitConvergence:convergence};
 const action=(kind,text)=>({...evidence,kind,text});const out=[];
 out.push(action('risk-linked-plan',ta?`${base}, நடைமுறையில் ${c.ageUnder18?'பெற்றோர் அல்லது ஆசிரியர் துணையுடன் ':''}${details[0]}`:`${base}, ${c.ageUnder18?'with a parent or teacher, ':''}${details[0]}.`));
 out.push(action('workable-checkpoint',ta?`${details[1]}`:`${details[1]}.`));
 if(convergence)out.push(action('verified-period-transit-focus',ta?
  `${windowFrom} முதல் ${windowTo} வரையிலான தசா–கோச்சாரத் தொடர்பில் ${c.house}-ஆம் பாவத்தின் ஏற்பாடுகளை முன்கூட்டியே சரிபார்க்கவும். ${g.SMVD311Judgement?.NTA?.[transit.planet]||transit.planet} கோச்சாரத் தொடர்பும் இந்தக் காலத் தேர்வில் கணக்கில் கொள்ளப்பட்டுள்ளது.`:
  `Review the house ${c.house} arrangements during the linked ${windowFrom}–${windowTo} dasha/transit interval. The ${transit.planet} transit supports selecting this period, not a certain outcome.`));
 const link=starContext?.houses?.[c.house]?.lordStar;
 if(link?.starRuler&&link.rulerHouse&&STAR_REMEDY_TA[c.house-1]){
  const ownerTa=g.SMVD311Judgement?.NTA?.[link.starRuler]||link.starRuler;
  const source=ta?`${ownerTa} வழியே ${c.house}-ஆம் பாவத்தின் நட்சத்திரச் சார்பு செயல்படும் சூழலில்`:
   `Where the house lord's stellar ruler ${link.starRuler} is relevant`;
  out.push(action('stellar-ruler-house-specific',ta?`${source}, ${STAR_REMEDY_TA[c.house-1]}.`:
   `${source}, ${STAR_REMEDY_EN[c.house-1]}.`));
 }
 if(!c.ageUnder18)out.push(action('prevention',ta?`${details[2]}${timing?' குறிப்பாக '+timing+' காலத்தில் தற்போதைய ஏற்பாடுகளை மறுபரிசீலனை செய்யலாம்.':''}`:`${details[2]}.${timing?' Review the current arrangements during '+timing+'.':''}`));
 const p=PRACTICE[risk.planet];if(p&&!c.ageUnder18&&!used.has('behaviour:'+risk.planet)){ used.add('behaviour:'+risk.planet); out.push(action('planet-behaviour',ta?`${lordTa} தொடர்பான நடைமுறை மாற்றமாக ${p[0]}`:`For the ${risk.planet} connection, ${p[1]}.`)); }
 /* Different vargas can modify a D1 risk without asserting automatic dosha-bhanga.
  * Each added action carries the same observed adverse planet & house sourceKey. */
 const weakDiv=(c.divisionEvidence||[]).find(x=>x.planet===risk.planet&&x.dignity==='weak');
 if(weakDiv&&!c.ageUnder18){out.push(action('division-linked-check',ta?
  `${weakDiv.division} வர்க்கத்தில் ${lordTa} பலம் குறைவாக இருப்பது ${c.house}-ஆம் பாவத் தீர்ப்பை மறுபரிசீலிக்க வேண்டிய துணை ஆதாரம். ${c.house}-ஆம் பாவத்துக்குரிய செலவு அல்லது ஒப்பந்தத்திற்கு முன் தகுந்த சான்றுகளைத் தனியாகச் சரிபார்க்கவும்.`:
  `The supplied ${weakDiv.division} indicates weaker dignity for ${risk.planet}, qualifying the ${c.house} house; check evidence before a related expense or commitment.`));}
 const strongDiv=(c.divisionEvidence||[]).find(x=>x.planet===risk.planet&&x.dignity==='strong');
 if(strongDiv){out.push(action('counter-evidence',ta?
  `${strongDiv.division} வர்க்கத்தில் ${lordTa} பெற்றுள்ள ${strongDiv.reason==='own'?'ஆட்சி':strongDiv.reason==='exalted'?'உச்ச':'கூடுதல்'} வலிமையையும் எதிர் ஆதாரமாகக் கணக்கில் கொண்டு, பாதக பலனை உறுதியானதாக எடுத்துக்கொள்ளாமல் நடைமுறைத் திட்டத்தை அளவோடு அமைக்கலாம்.`:
  `In supplied ${strongDiv.division}, ${risk.planet} gains dignity; treat the adverse D1 indicator as qualified, not inevitable.`));}
 const secondaryHouse=(c.otherLordships||[]).find(n=>n!==c.house);
 if(secondaryHouse&&!c.ageUnder18&&Math.abs(risk.delta)>=0.6){out.push(action('co-ownership-precaution',ta?
  `${lordTa} ${secondaryHouse}-ஆம் பாவத்திற்கும் அதிபதியாக இருப்பதால், ${c.house}-ஆம் பாவத்தின் முடிவை எடுக்கும் போது ${secondaryHouse}-ஆம் பாவத்துக்குரிய பொறுப்பையும் தனியே சரிபார்த்து இரண்டிற்கும் நடைமுறையில் இடமளிக்கவும்.`:
  `${risk.planet} also rules house ${secondaryHouse}; evaluate that second area independently before changing arrangements for house ${c.house}.`));}
 if(mitigation)out.push(action('balancing-factor',ta?`${c.house}-ஆம் பாவத்தில் ${lordTa} குறித்த எதிர் ஆதாரத்துடன் குருவின் பார்வையோ தொடர்புடைய வர்க்க வலிமையோ இருப்பதால், இந்தத் துறையின் தடையை உறுதியானதாகக் கருதாமல் முன்னேற்பாடாகப் பயன்படுத்தவும்.`:`The ${c.house} house includes a counterweight to ${risk.planet} through Jupiter aspect or verified divisional dignity; this is preparation, not a certain adverse event.`));
 // Avoid repeatedly printing the same prayer for this planet across houses.
 if(p&&!c.ageUnder18&&!used.has('ritual:'+risk.planet)){
   used.add('ritual:'+risk.planet);
   out.push(action('tradition-optional',ta?`விருப்பப் பாரம்பரியம் (${lordTa}): ${p[2]}. இது வாழ்க்கைத் தீர்மானத்தையோ மருத்துவ உதவியையோ மாற்றுவதில்லை.`:`Optional ${risk.planet} tradition: ${p[3]}. It does not replace professional advice.`));
   const e=element(risk.sign);if(e>=0)out.push(action('tradition-sign-choice',ta?`பிறப்பு ${lordTa} இருக்கும் ராசியின் தன்மையை அடிப்படையாகக் கொண்ட மரபுச் சாத்தியம்: ${TRADITION[e][0]}`:`A sign-element tradition associated with natal ${risk.planet}: ${TRADITION[e][1]}`));
 }
 return out;
}
return Object.freeze({select});
});

;

/* ---- prediction-evidence-outcomes.js (preserves original execution order) ---- */
/* SMV ASTRO — evidence-to-lived-outcome layer.
 * Reads the already computed I–IX inputs. Never computes planetary longitudes,
 * reloads Swiss, changes Firebase or makes a network request.
 * Traditional, conditional interpretations; a chart cannot establish someone's
 * actual food, smoking, alcohol or personal health habits.
 */
(function(root,factory){'use strict';const api=factory(root);root.SMVPredictionOutcomes=api;if(typeof module==='object'&&module.exports)module.exports=api;})(typeof window!=='undefined'?window:globalThis,function(g){'use strict';
const PLAN={Sun:['சூரியன்','authority'],Moon:['சந்திரன்','comfort'],Mars:['செவ்வாய்','action'],Mercury:['புதன்','communication'],Jupiter:['குரு','judgement'],Venus:['சுக்கிரன்','relationships'],Saturn:['சனி','discipline'],Rahu:['ராகு','unusual paths'],Ketu:['கேது','detachment']};
const FIELD_TA=['தனிப்பட்ட முடிவுகளும் உடல் ஒழுங்கும்','குடும்பச் செலவு மற்றும் சேமிப்பு','திறன் பயிற்சியும் தகவல் பரிமாற்றமும்','வீடும் குடும்பப் பராமரிப்பும்','கல்வியும் படைப்புத் திறனும்','பணி ஒழுங்கும் போட்டியும்','இணைந்து எடுக்கும் முடிவுகளும்','கூட்டுப் பணமும் மாற்றங்களும்','வழிகாட்டலும் தொலைதூரத் திட்டங்களும்','தொழிலும் பொதுப் பொறுப்பும்','வருமானமும் நண்பர் வட்டமும்','செலவு, ஓய்வு மற்றும் தூரத் தொடர்புகள்'];
const FIELD_EN=['personal choices and daily self-care','household expenses and saving','skills and communication','home and family care','study and creative work','work routines and competition','shared choices and agreements','shared resources and change','guidance and long-range plans','professional duties and recognition','income and dependable contacts','expenses, rest and distance'];
// Per-house topics and concrete lived circumstances; not a planet-karakatwa dump.
// (title TA, title EN, supporting-karakas, support TA, pressure TA, support EN, pressure EN)
const TOPICS=[
 [
 ['முடிவெடுக்கும் நடை','Decision-making',['Sun','Mars'],'சொந்த முடிவுக்கு முன் பொறுப்புகளின் வரிசையைத் தெளிவுபடுத்துவதால் பிறரின் நம்பிக்கையைப் பெறும் வாய்ப்பு உருவாகலாம்','பிறரின் கோரிக்கைகளுக்கும் தன் முன்னுரிமைக்கும் இடையே இழுபறி வந்தால் முடிவை மாற்றிப் பார்க்க வேண்டியிருக்கலாம்','clarifying responsibilities before acting can strengthen the trust placed in personal decisions','competing demands may require decisions to be reworked rather than hurried'],
 ['நடத்தை மற்றும் வெளிப்பாடு','Temperament',['Moon','Mercury'],'கடினமான சூழலிலும் கருத்தைச் செயலில் காட்டும் போக்கு வெளிப்படலாம்','உள்ளுக்குள் வைத்துக் கொண்ட கருத்துகள் தாமதமாக வெளிப்படும் போது அடுத்தவர் நோக்கத்தைத் தவறாகப் புரிந்துகொள்ளலாம்','conduct may be expressed through dependable action rather than display','unspoken expectations may be misunderstood when communication comes late'],
 ['உடல் பராமரிப்பு ஒழுங்கு','Body-care routine',['Sun','Saturn'],'வேலை மற்றும் ஓய்வுக்குத் தொடர்ச்சியான ஒழுங்கை அமைப்பது உதவலாம்','ஒரே நேரத்தில் பல கடமைகளை ஏற்றால் உறக்கம், உணவு நேரம் போன்ற அடிப்படைப் பழக்கங்கள் பின்தங்கக்கூடும்','a consistent pattern of activity and rest may be useful','too many simultaneous commitments may crowd out basic rest and meal routines']
 ],[
 ['குடும்ப சேமிப்பு','Family saving',['Jupiter','Saturn'],'உறவினர் பொறுப்புகளையும் நீண்டகாலச் சேமிப்பையும் தனித் திட்டங்களாக வகுத்துச் செயல்படலாம்','குடும்பத்தின் எதிர்பாராத செலவும் வரவைப் பற்றிய வாக்குறுதியும் ஒரே நேரத்தில் வந்தால் சேமிப்பு தாமதமாகலாம்','separating savings from family obligations may improve financial planning','unplanned family expenses can postpone saving when income promises are uncertain'],
 ['பேச்சும் வார்த்தையின் தாக்கமும்','Speech and its effects',['Mercury','Moon'],'கேள்வியைப் புரிந்த பிறகு தெளிவாகப் பதிலளிக்கும் பழக்கம் குடும்பம் மற்றும் தொழிலில் நம்பிக்கையை வளர்க்கலாம்','வேகமான பதில், கடுமையான சொல் அல்லது பேசாமல் விடுதல் காரணமாக சிறிய கருத்து வேறுபாடு நீடிக்கலாம்','listening before responding may build trust at home and in work','hurried wording or long silences may prolong an avoidable disagreement'],
 ['உணவுத் தேர்வும் நேர ஒழுங்கும்','Food preferences and routine',['Moon','Venus'],'வீட்டு உணவுப் பழக்கத்தையும் பணிநேரத்தையும் பொருத்தி உணவு நேரத்தை நிர்ணயிக்கும் ஆர்வம் இருக்கலாம்','வேலை நேரமும் குடும்ப நடைமுறையும் மாறும்போது உணவு நேரத்தை நிலையாக வைத்துக்கொள்ள கூடுதல் திட்டம் தேவைப்படலாம்','household preferences and work schedules may shape meal planning','changing work and family routines may make regular meals harder to maintain']
 ],[
 ['முயற்சியும் திறன் மேம்பாடும்','Independent effort and skills',['Mars','Mercury'],'சிறிய பயிற்சியைத் தொடர்ச்சியான பணியாக மாற்றி அனுபவம் சேர்க்கும் வாய்ப்பு உள்ளது','ஒரே முயற்சியில் பல மாற்றங்கள் செய்ய வேண்டியிருந்தால் முதலில் தொடங்கிய வேலையை முடிப்பதில் தாமதம் வரலாம்','repeated training may develop into a useful skill','frequent changes of approach can delay completing an initial attempt'],
 ['உடன்பிறப்புகள் மற்றும் நெருங்கியோர்','Siblings and close peers',['Mars','Moon'],'பொறுப்பைத் தெளிவாகப் பகிரும்போது சகோதரர் அல்லது நெருங்கியோருடன் ஒத்துழைப்பு மேம்படலாம்','யார் எந்தப் பணியைச் செய்வது என்ற தெளிவின்மை மீண்டும் வரும் கருத்து வேறுபாட்டை உருவாக்கலாம்','clear division of duties can improve cooperation with siblings or peers','unclear expectations may reopen the same disagreement'],
 ['எழுத்து மற்றும் தகவல் பரிமாற்றம்','Writing and communications',['Mercury','Saturn'],'செய்திகளைக் குறிப்பெடுத்து சரிபார்த்து அனுப்புவது பயனான தொடர்புகளை உருவாக்கலாம்','விரைந்து அனுப்பிய தகவலைப் பின்னர் திருத்த வேண்டிய சூழல் ஏற்படலாம்','checking written information before sharing can make communication more reliable','rushed messages may need correction later']
 ],[
 ['வீட்டின் அமைதி','Home stability',['Moon','Venus'],'வீட்டில் ஒவ்வொருவரின் தேவையையும் கேட்டுத் தீர்மானிக்கும் பழக்கம் அமைதியைப் பேண உதவலாம்','வீட்டு வேலை அல்லது பராமரிப்பு ஒருவர்மீது மட்டும் விழுந்தால் மனச்சுமை கூடலாம்','considering each household member’s needs may support a calmer home','care duties falling on one person may add strain'],
 ['நிலம் மற்றும் சொத்து முடிவுகள்','Property decisions',['Mars','Saturn'],'ஆவணங்களையும் உரிமைத் தகவல்களையும் சரிபார்த்து நிலையான ஏற்பாட்டிற்கு நகரலாம்','அவசரமாக ஒப்புக்கொண்ட சொத்து அல்லது பழுது செலவுகளை மீளாய்வு செய்ய வேண்டியிருக்கலாம்','checking ownership and property documents can lead to steadier arrangements','hurried property or repair decisions may require revision'],
 ['தாயார் மற்றும் குடும்பப் பராமரிப்பு','Mother and family support',['Moon','Jupiter'],'குடும்ப மூத்தோரின் தேவைகளுக்கு நேரமும் பொருளும் திட்டமிட்டு ஒதுக்க முடியும்','குடும்பப் பொறுப்புகள் ஒரே காலத்தில் அதிகரித்தால் தனிப்பட்ட திட்டம் ஒத்திவைக்கப்படலாம்','care for elders can be planned alongside personal commitments','concentrated family duties may postpone personal plans']
 ],[
 ['படிப்பு மற்றும் ஆர்வம்','Learning and interests',['Mercury','Jupiter'],'கற்ற திறனைப் பயன்படுத்திப் புதிய பொறுப்பை ஏற்கும் வழி உருவாகலாம்','ஒரே நேரத்தில் பல பாடங்கள் அல்லது முயற்சிகள் எடுத்தால் ஆழமான பயிற்சி தடைபடலாம்','learned skills may open a route into new responsibilities','too many simultaneous pursuits may hinder deeper practice'],
 ['படைப்பாற்றல்','Creativity',['Venus','Mercury'],'சிந்தனையை எழுத்து, வடிவமைப்பு அல்லது கற்பித்தல் போன்ற செயலாக மாற்றலாம்','உடனடிப் பாராட்டை எதிர்பார்த்தால் படைப்பைத் திருத்தி மேம்படுத்தும் பொறுமை குறையலாம்','ideas may become writing, design or teaching projects','seeking immediate recognition may make revision less patient'],
 ['குழந்தைகள் மற்றும் வழிகாட்டல்','Children and mentoring',['Jupiter','Moon'],'இளையோரின் தேவையைக் கேட்டு அவர்களுக்குரிய பயிற்சியைத் திட்டமிடும் சூழல் வரலாம்','கல்வி நேரம் அல்லது பராமரிப்புச் செலவு தொடர்பாக முன்னுரிமைகளை மீண்டும் பேச வேண்டியிருக்கலாம்','listening to younger people can guide educational planning','time or expense for mentoring may need renegotiation']
 ],[
 ['வேலைப்பளு மற்றும் சேவை','Workload and service',['Saturn','Mars'],'சிக்கலான பணியைப் படிப்படியாக முடிப்பதால் அனுபவமும் பொறுப்பும் அதிகரிக்கலாம்','பணிக்கான காலக்கெடும் உதவி குறைவும் சேரும்போது கூடுதல் அழுத்தம் வரலாம்','handling demanding tasks steadily may increase experience and responsibility','tight deadlines and limited help may add work pressure'],
 ['கடனும் ஒப்பந்தப் பொறுப்பும்','Debt and obligations',['Saturn','Jupiter'],'தவணை, செலவு மற்றும் வருமானத்தைத் தெளிவாகப் பிரித்தால் கட்டுப்பாடு நிலைக்கலாம்','கடன் நிபந்தனைகளைப் புரியாமல் புதிய பொறுப்பு ஏற்றால் பின்னர் மீண்டும் ஒழுங்குபடுத்த வேண்டியிருக்கலாம்','clear tracking of instalments and income can support control','new commitments without reading terms may need restructuring'],
 ['உடல்நலப் பழக்க ஒழுங்கு','Health routines',['Sun','Moon'],'ஓய்வு, உணவு நேரம், வேலை இடைவெளி ஆகியவற்றைச் சமமாகப் பராமரிக்க முயற்சி செய்யலாம்','வேலை அழுத்தம் அதிகமான போது அடிப்படைப் பராமரிப்பு பின்தங்காமல் இருக்க கவனம் தேவைப்படலாம்','balanced rest and daily routines may support personal care','workload may crowd out recovery time unless protected']
 ],[
 ['திருமணத்தில் பொறுப்புப் பகிர்வு','Responsibilities in partnership',['Venus','Saturn'],'செயல்களையும் முடிவுகளையும் பகிர்ந்து செய்யும் போது இருவருக்கும் நம்பிக்கை அதிகரிக்கலாம்','பொறுப்பை ஒருவர் மட்டும் ஏற்றால் சமநிலையை மீண்டும் பேச வேண்டியிருக்கலாம்','shared duties may strengthen confidence in the partnership','unequal duties may require deliberate renegotiation'],
 ['கூட்டு ஒப்பந்தங்கள்','Joint agreements',['Mercury','Jupiter'],'நிபந்தனைகளை ஆரம்பத்திலேயே தெளிவுபடுத்துவது பிற்கால முரண்பாடுகளைக் குறைக்கலாம்','வார்த்தையால் மட்டுமே செய்த ஒப்புதல் பின்னர் வேறு பொருள் பெறக்கூடும்','clarifying terms early may prevent later disagreement','informal agreements may later be interpreted differently'],
 ['உறவின் நேரமும் தனியிடமும்','Time and boundaries',['Venus','Moon'],'இணைந்து செலவிடும் நேரத்தையும் தனிப்பட்ட தேவையையும் சமப்படுத்தும் முயற்சி பலன் தரலாம்','பணி நேரம் அல்லது தூரம் காரணமாக நேரடி உரையாடலுக்கு திட்டமிடல் தேவைப்படலாம்','balancing shared time and personal space may help','work schedules or distance may make regular conversation harder']
 ],[
 ['கூட்டுப் பணமும் பாதுகாப்பும்','Shared financial security',['Saturn','Jupiter'],'ஆவணங்களை ஒருமுறை சரிபார்த்து கூட்டுப் பணத்திற்கான தெளிவான பொறுப்பை அமைக்கலாம்','திடீர் செலவு அல்லது தெளிவற்ற உரிமைத் தகவல் காரணமாக ஒப்பந்தத்தை மீளாய்வு செய்ய நேரலாம்','documenting shared resources may help clarify accountability','unexpected expenses or unclear ownership may require reviewing agreements'],
 ['மாற்றத்திற்கு ஏற்ற செயல்திட்டம்','Adapting to change',['Mars','Mercury'],'மாறிய சூழலைப் புரிந்துகொண்டு செயல்முறையைப் புதுப்பிக்க முடியும்','முன்பிருந்த திட்டம் செயல்படாத நேரத்தில் பழைய முடிவைப் பிடித்துக்கொண்டால் இழுபறி உருவாகலாம்','changing conditions may be met with a revised practical plan','holding to an outdated plan can prolong a transition'],
 ['ஆராய்ச்சியும் ரகசியத் தகவலும்','Research and privacy',['Mercury','Ketu'],'தகவலைச் சரிபார்த்து மறைமுகக் காரணங்களைப் புரிந்துகொள்ளும் ஆர்வம் உதவலாம்','முழுமையற்ற தகவல் அடிப்படையில் முடிவு எடுத்தால் அதைச் சரிசெய்ய மீண்டும் முயற்சி தேவைப்படலாம்','careful verification may support analytical work','acting on partial information can require later correction']
 ],[
 ['மேற்படிப்பும் பயிற்சியும்','Higher study and training',['Jupiter','Mercury'],'நீண்டகால நோக்கத்துடன் கற்றலுக்கு நேரம் ஒதுக்குவது தொழிலிலும் பயன்படலாம்','பல துறைகளுக்கிடையே கவனம் மாறும்போது படிப்பை முடிப்பதற்கு கூடுதல் திட்டம் தேவைப்படலாம்','long-range study may become useful in work','switching between too many paths can delay completion'],
 ['தந்தை, ஆசிரியர் வழிகாட்டல்','Father and mentors',['Sun','Jupiter'],'மூத்தோர் வழங்கும் அனுபவத்தைத் தன் நிலைக்கு ஏற்ப பயன்படுத்தலாம்','மற்றவர் ஆலோசனையையும் சொந்த விருப்பத்தையும் ஒப்பிட வேண்டிய நிலையில் கருத்து வேறுபாடு வரலாம்','mentors’ experience may be adapted to personal circumstances','external advice and personal priorities may need reconciliation'],
 ['தொலைதூர முயற்சிகள்','Long-distance plans',['Jupiter','Saturn'],'பயணம் அல்லது வெளியூர்ப் பயிற்சியைச் சரியான ஆவணங்களுடன் முன்னெடுக்கலாம்','செலவு அல்லது கால வரம்பு காரணமாக பயணத் திட்டத்தை மாற்ற வேண்டியிருக்கலாம்','documents and planning may support travel or distant study','costs or schedules may require changing a travel plan']
 ],[
 ['தொழில் பொறுப்பு','Professional responsibility',['Sun','Saturn'],'பணியின் முடிவைத் தெளிவாகக் காட்டுவதால் நம்பகமான பொறுப்புகள் அதிகரிக்கலாம்','அதிகப் பணியை ஒருவரே ஏற்கும்போது முடிவின் தரத்தையும் நேரத்தையும் ஒருசேர காப்பது சிரமமாகலாம்','visible delivery of work may lead to greater responsibility','taking too many duties alone may undermine quality and timing'],
 ['வேலைத்திறன் மற்றும் முன்னேற்றம்','Skill and advancement',['Mercury','Jupiter'],'தொழிலில் கற்ற புதிய முறையைச் செயலாக்குவது முன்னேற்றத்திற்கு வழியாகலாம்','துறையில் மாற்றம் வரும்போது பழைய திறனைப் புதுப்பிக்காமல் இருந்தால் வாய்ப்பு தாமதமாகலாம்','applying newly learned methods may open professional opportunities','skills may need updating when the field changes'],
 ['நற்பெயர் மற்றும் சமூகக் கடமை','Reputation and public duty',['Sun','Venus'],'உறுதிமொழியை நிறைவேற்றும் பழக்கம் வெளியில் நம்பகத்தன்மையை உருவாக்கலாம்','பிறர் எதிர்பார்ப்பிற்கு உடனடிப் பதில் தர முயன்றால் சொந்த நேரம் பாதிக்கப்படலாம்','meeting commitments may gradually build standing','constant responsiveness to others may erode personal time']
 ],[
 ['வருமானத்தை நிலைப்படுத்துதல்','Stable income',['Jupiter','Saturn'],'வருமானம் தரும் தொடர்புகளையும் நிலையான வரவையும் பிரித்தறிந்து திட்டமிடலாம்','வரலாம் என்று எதிர்பார்த்த பணத்தை முன்கூட்டியே செலவிட்டால் நெருக்கடி வரலாம்','distinguishing dependable income from leads may improve planning','spending anticipated income before receipt can add pressure'],
 ['நண்பர்களும் உதவியும்','Friends and support',['Venus','Mercury'],'நம்பகமான தொடர்புகளுடன் இணைந்து செயல்படுவது திட்டங்களை விரிவாக்கலாம்','பிறர் வழங்கும் வாக்குறுதியைச் சரிபார்க்காமல் பொறுப்பு ஏற்றால் மாற்றுத் திட்டம் தேவைப்படலாம்','reliable contacts may help plans grow','untested promises can make commitments harder'],
 ['இலக்குகளை நிறைவேற்றுதல்','Long-term goals',['Saturn','Jupiter'],'குறுகிய கட்டங்களாக இலக்கை வகுத்துத் தொடர்ந்து செய்வது பலன் தரலாம்','ஒரே காலத்தில் பல இலக்குகளைத் தொடங்கினால் முடிவை அடையத் தாமதமாகலாம்','staged goals can favour consistent progress','starting too many goals at once may delay finishing']
 ],[
 ['தேவையான செலவும் கட்டுப்பாடும்','Expenses and limits',['Saturn','Jupiter'],'அத்தியாவசியச் செலவுக்கும் விருப்பச் செலவுக்கும் இடையில் தெளிவான வரம்பை உருவாக்கலாம்','புதிய பொறுப்பு அல்லது பயணம் காரணமாகச் செலவை மீண்டும் கணக்கிட நேரலாம்','setting priorities among expenses may support stability','travel or new duties may require budget revision'],
 ['உறக்கமும் தனிப்பட்ட ஓய்வும்','Sleep and recovery',['Moon','Saturn'],'தனிப்பட்ட ஓய்வுக்கான நேரத்தைத் திட்டமிட்டுப் பாதுகாக்க முடியும்','நீண்ட நேரப் பணி அல்லது மாறும் அட்டவணை காரணமாக ஓய்வை மீண்டும் ஒழுங்குபடுத்த வேண்டியிருக்கலாம்','protecting regular recovery time may be useful','changing schedules or long hours may disrupt rest'],
 ['வெளியூர் மற்றும் தனிப்பட்ட முயற்சி','Distance and independent effort',['Rahu','Mercury'],'வெளியூர்த் தொடர்புகளுக்கான ஆவணங்களை முன்னரே தயார் செய்வதால் சிக்கல்களைக் குறைக்கலாம்','தகவல் தெளிவில்லாத தூரத் தொடர்பில் செலவையும் நேரத்தையும் மீளாய்வு செய்ய வேண்டியிருக்கலாம்','preparing documentation may help distant arrangements','unclear distant commitments may need careful cost and time review']
 ]];
const OWNTEXT_TA=['தனக்கான முன்னுரிமை','குடும்ப வரவு–செலவு','திறன் மற்றும் தொடர்பு','வீடு மற்றும் பராமரிப்பு','கல்வி மற்றும் இளையோர்','பணி–கடன் ஒழுங்கு','இணைத் தீர்மானம்','ஆவணம் மற்றும் பகிர்வு','ஆசிரியர்–பயணத் திட்டம்','தொழில் பொறுப்பு','வருமானம் மற்றும் நண்பர் வட்டம்','செலவு மற்றும் ஓய்வு'];
const OWNTEXT_EN=['self-directed choices','household resources','skills and communication','home and care','education and mentoring','work and debt management','partnership decisions','records and shared resources','study and travel plans','work and reputation','income and networks','expenses and rest'];
const isInt=n=>Number.isInteger(n)&&n>=1&&n<=12;
function influence(c,karakas){const entries=(c?.all||[]).filter(x=>x&&PLAN[x.planet]);const direct=entries.filter(x=>karakas.includes(x.planet)&&x.relation==='karaka');const peers=entries.filter(x=>['lord','occupies','aspects'].includes(x.relation));const support=[...direct,...peers].filter(x=>x.delta>=.16).sort((a,b)=>b.delta-a.delta),strain=[...direct,...peers].filter(x=>x.delta<=-.16).sort((a,b)=>a.delta-b.delta);
 const sum=peers.reduce((v,x)=>v+(Number(x.delta)||0),0)+direct.reduce((v,x)=>v+(Number(x.delta)||0)*.4,0);
 const posTotal=support.reduce((v,x)=>v+Math.max(0,Number(x.delta)||0),0),negTotal=strain.reduce((v,x)=>v+Math.abs(Number(x.delta)||0),0);
 const conflict=posTotal>=.5&&negTotal>=.5&&Math.min(posTotal,negTotal)/Math.max(posTotal,negTotal)>=.35;
 const state=conflict?'mixed':sum>=.6?'support':sum<=-.6?'strain':c?.conclusion==='support'?'support':c?.conclusion==='strain'?'strain':'qualified';return {state,support:support[0]||null,strain:strain[0]||null,sum:+sum.toFixed(3)};}
function factorText(c,domain,lang,star){const ta=lang!=='en',out=[];const house=c.house,lordHouse=c.location;const ruler=star?.houses?.[house]?.lordStar;const secondary=(c.otherLordships||[]).filter(isInt).filter(x=>x!==house);
 if(isInt(lordHouse)&&lordHouse!==house){out.push(ta?`${FIELD_TA[lordHouse-1]} பற்றிய தேர்வுகளும் இந்தத் துறையின் நிகழ்வுகளை மாற்றக்கூடும்.`:`Choices concerning ${FIELD_EN[lordHouse-1]} may also shape the outcome.`);}
 if(secondary.length){const h=secondary[0];out.push(ta?`இதன் பாவாதிபதி ${FIELD_TA[h-1]} துறைக்கும் பொறுப்புடையதால் இரண்டு தேவைகளையும் ஒரே நேரத்தில் கவனிக்க வேண்டியிருக்கலாம்.`:`The same house ruler is also responsible for ${FIELD_EN[h-1]}, bringing two practical priorities together.`);}
 if(ruler?.starRuler&&isInt(ruler.rulerHouse)&&ruler.rulerHouse!==house&&ruler.rulerHouse!==lordHouse){out.push(ta?`நட்சத்திரநாதனின் தொடர்பு ${FIELD_TA[ruler.rulerHouse-1]} சார்ந்த தனி சூழலையும் இந்த முடிவோடு இணைக்கலாம்.`:`The calculated stellar-ruler link additionally connects this choice with ${FIELD_EN[ruler.rulerHouse-1]}.`);}
 return out.slice(0,2);
}
function identifyAspect(d,from,to){if(!PLAN[from]||!PLAN[to]||from===to)return null;const fn=g.SMVD311Judgement?.aspectWitness;return typeof fn==='function'?fn(d,from,to):null;}
function detailedAspects(d,c,lang){const ta=lang!=='en',lord=c?.lord;if(!PLAN[lord])return [];const names=Object.keys(PLAN),links=names.filter(from=>from!==lord).map(from=>identifyAspect(d,from,lord)).filter(Boolean).sort((a,b)=>(a.orb??100)-(b.orb??100));const result=[];
 for(const a of links.slice(0,2)){const p=ta?PLAN[a.from][0]:a.from,target=ta?PLAN[lord][0]:lord;
 const causes=[];if(a.combust)causes.push(ta?'அஸ்தமன நிலை':'combustion');if(a.closeRahu)causes.push(ta?'ராகுவுடன் உண்மையான பாகை நெருக்கம்':'an actual close Rahu conjunction');
 const conditional=causes.length?(ta?`${causes.join(' மற்றும் ')} இருப்பதால் பார்வையைப் பலனாக மாற்றும்போது அதன் செயல்திறனைக் குறைத்து மதிப்பிட வேண்டும்.`:`Because ${causes.join(' and ')} is present, its interpretive strength is qualified.`):'';
 result.push({from:a.from,to:lord,orb:a.orb,combust:!!a.combust,closeRahu:!!a.closeRahu,text:ta?`${p} ${target} மீது பாரம்பரியக் கிரகப் பார்வை கொண்டுள்ளார். ${conditional}`:`${a.from} has a calculated traditional aspect on ${lord}. ${conditional}`});}
 return result;
}
function houseResult(d,c,star,lang='ta',age=null){if(!c||!isInt(c.house)||!Array.isArray(c.all))return {paragraphs:[],evidence:[]};const ta=lang!=='en',topics=TOPICS[c.house-1]||[],paragraphs=[],evidence=[],child=(age!==null&&age<18)||c.ageUnder18===true;
 if(child&&c.house===7)return {paragraphs:[ta?'இந்த வயதில் ஏழாம் பாவத்தின் இணைவு குறிகள் நட்புறவு, குழுவில் ஒத்துழைப்பு, மற்றவரின் கருத்தைக் கேட்பது போன்ற வளர்ச்சிப் பயிற்சிகளாக மட்டுமே எடுத்துக்கொள்ளப்படுகின்றன.':'At this age the seventh-house cooperation theme is applied only to friendships, group work and listening skills.'],evidence:[],aspects:[]};
 for(let index=0;index<topics.length;index++){
  const [titleTa,titleEn,karakas,supportTa,strainTa,supportEn,strainEn]=topics[index];
  if(child&&(c.house===7||c.house===5&&index===2||c.house===2&&index===2))continue;
  const v=influence(c,karakas),support=v.state==='support'||v.state==='mixed';const scenario=ta?(support?supportTa:strainTa):(support?supportEn:strainEn);
  // Contradicting evidence changes the result; do not silently erase it.
  const counter=v.state==='mixed'?(ta?`ஒரு பக்கம் உதவும் தொடர்பும் மறுபக்கம் கட்டுப்படுத்தும் தொடர்பும் இருப்பதால், முயற்சிக்கான நேரமும் வளமும் தனித்தனியாக ஒதுக்கப்பட்டால் நடைமுறையில் நல்ல சமநிலை கிடைக்கலாம்.`:`Both assisting and restrictive chart indications are present; a practical division of time and resources matters.`):'';
  const factual=factorText(c,index,lang,star);const line=[`${ta?titleTa:titleEn} — ${scenario}.`,counter,...(index===0?factual:[])].filter(Boolean).join(' ');
  paragraphs.push(line);evidence.push({topic:ta?titleTa:titleEn,house:c.house,karakas,conclusion:v.state,score:v.sum,leadingSupport:v.support?.planet||null,leadingStrain:v.strain?.planet||null,lord:c.lord,lordHouse:c.location,secondaryOwnership:c.otherLordships||[]});
 }
 const aspects=detailedAspects(d,c,lang);
 // Technical aspect evidence is stored separately; prose only describes an
 // actual consequence when a corresponding direct natal influence exists.
 if(aspects.length){const a=aspects[0],topic=TOPICS[c.house-1]?.[0],actor=ta?PLAN[a.from][0]:a.from;
  paragraphs.push(ta?`இந்தப் பாவத்தின் அதிபதியை ${actor} நேரடியாகப் பார்ப்பதால் ${topic[0]} தொடர்பான பொறுப்பு அல்லது தேர்வின் வேகம் ${a.combust||a.closeRahu?'கிரகத்தின் குறைக்கப்பட்ட செயல்திறனுக்கேற்ப':'அந்தக் கிரகத்தின் சொந்த நிலைக்கேற்ப'} மாறலாம்.`:`A verified aspect from ${actor} to the house ruler can modify ${topic[1].toLowerCase()}, subject to the condition and strength of the aspecting planet.`);
 }
 return {paragraphs,evidence,aspects};
}
function extendPeriod(win,claim,star,lang='ta'){const p=win?.period||win;if(!p?.md||!p?.ad||!claim||!isInt(claim.house))return '';const md=star?.planets?.[p.md],ad=star?.planets?.[p.ad];const ta=lang!=='en';const h=claim.house;const k=ad?.rulerHouse;const mdh=md?.rulerHouse;
 if(!isInt(k)||k===h||!isInt(mdh)||mdh===h||mdh===k)return '';const subject=ta?FIELD_TA[h-1]:FIELD_EN[h-1],middle=ta?FIELD_TA[k-1]:FIELD_EN[k-1],long=ta?FIELD_TA[mdh-1]:FIELD_EN[mdh-1];
 return ta?`${p.from||''} – ${p.to||''} காலத்தில் ${subject} பற்றிய முடிவு, மகாதசை சார்ந்த ${long} என்ற நீண்டகாலத் திட்டத்தையும் புக்தி சார்ந்த ${middle} என்ற உடனடித் தேவையையும் ஒப்பிட்டே அமைக்கப்படலாம்.`:`During ${p.from||''}–${p.to||''}, decisions about ${subject} may need to reconcile the longer major-period focus on ${long} with the sub-period responsibility for ${middle}.`;
}
return Object.freeze({version:'1',TOPICS,FIELD_TA,FIELD_EN,influence,identifyAspect,detailedAspects,houseResult,extendPeriod});
});

;
