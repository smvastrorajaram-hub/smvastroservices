/* SMV ASTRO — D1 life interpretation, source-clean narrative edition.
   Every topic examines all 12 houses; only evidenced links become prose.
   Belief-based traditional interpretations, not verifiable personality diagnoses.
   No remote service, cache mutation, or chart recalculation. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.SMVLifePredictionD1=api;})(typeof window!=='undefined'?window:globalThis,function(){'use strict';
 const SIGNS_TA=['மேஷம்','ரிஷபம்','மிதுனம்','கடகம்','சிம்மம்','கன்னி','துலாம்','விருச்சிகம்','தனுசு','மகரம்','கும்பம்','மீனம்'];
 const SIGNS_EN=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
 const PN=['Mars','Venus','Mercury','Moon','Sun','Mercury','Venus','Mars','Jupiter','Saturn','Saturn','Jupiter'];
 const TA={Sun:'சூரியன்',Moon:'சந்திரன்',Mars:'செவ்வாய்',Mercury:'புதன்',Jupiter:'குரு',Venus:'சுக்கிரன்',Saturn:'சனி',Rahu:'ராகு',Ketu:'கேது'};
 const ALIASES={};for(const [en,ta] of Object.entries(TA)){ALIASES[en.toLowerCase()]=en;ALIASES[ta]=en;}
 Object.assign(ALIASES,{surya:'Sun',chandra:'Moon',kuja:'Mars',mangal:'Mars',budha:'Mercury',guru:'Jupiter',brihaspati:'Jupiter',shukra:'Venus',sukra:'Venus',shani:'Saturn',sani:'Saturn',rahu:'Rahu',ketu:'Ketu'});
 const EXALTED={Sun:0,Moon:1,Mars:9,Mercury:5,Jupiter:3,Venus:11,Saturn:6};
 const DEBILITATED={Sun:6,Moon:7,Mars:3,Mercury:11,Jupiter:9,Venus:5,Saturn:0};
 const OWNS={Sun:[4],Moon:[3],Mars:[0,7],Mercury:[2,5],Jupiter:[8,11],Venus:[1,6],Saturn:[9,10]};
 const DRISHTI={Sun:[7],Moon:[7],Mars:[4,7,8],Mercury:[7],Jupiter:[5,7,9],Venus:[7],Saturn:[3,7,10]};
 const THEMES=[
 ['ஜாதகரின் முழு வாழ்க்கை முறைகள்','Personality and overall way of life'],
 ['குடும்பம், பேச்சு, சேமிப்பு மற்றும் பொருளாதார அணுகுமுறை','Family, speech and financial habits'],
 ['முயற்சி, துணிவு, திறமை மற்றும் சகோதர உறவுகள்','Initiative, skills and siblings'],
 ['வீடு, தாயார், மனநிம்மதி மற்றும் சொத்து','Home, mother, peace and property'],
 ['அறிவுத்திறன், கல்வி, சிந்தனை மற்றும் குழந்தைகள்','Learning, thinking and children'],
 ['அன்றாட வேலை, போட்டி, கடன் மற்றும் உடல்நல ஒழுங்கு','Daily work, competition and wellbeing'],
 ['திருமண வாழ்க்கை, துணைவர் மற்றும் கூட்டுறவு','Marriage and partnerships'],
 ['திடீர் மாற்றங்கள், மறைமுக விஷயங்கள் மற்றும் சவால்','Change, resilience and confidential matters'],
 ['தந்தை, வழிகாட்டுதல், நம்பிக்கை மற்றும் தர்மம்','Elders, mentoring and principles'],
 ['தொழில், பொறுப்பு, அதிகாரம் மற்றும் சமூக நிலை','Career, duties and reputation'],
 ['வருமானம், ஆதாயங்கள், நண்பர்கள் மற்றும் இலக்குகள்','Income, friends and aims'],
 ['செலவுகள், ஓய்வு, தனிமை மற்றும் உள்மன வாழ்க்கை','Expenses, rest and private life']];
 // Each topic has its own lived consequence. Conditional use depends on measured D1 contacts.
 const DOMAINS_TA=[
 ['பிறர் சொல்வதைக் கேட்ட பிறகே முடிவு செய்யும் பொறுமை; ஆனால் தனக்குச் சரியாகத் தோன்றிய கருத்தை உறுதியாக விளக்கும் பண்பு','சுயமரியாதைக்கு இடையூறு ஏற்பட்டால் உள்ளுக்குள் சுமந்துகொண்டு பிறகு நேரடியாக எதிர்ப்புத் தெரிவிக்கும் போக்கு'],
 ['குடும்பத்தில் பணம் பற்றிய உரையாடலைத் தெளிவாக நடத்தி சேமிப்பிற்குச் சில விதிகளை உருவாக்கும் பழக்கம்','அன்புடன் கூறும் அறிவுரையே வார்த்தைக் கடுமையால் குறையாகப் புரிந்துகொள்ளப்படும் சூழல்'],
 ['மற்றவர் தொடங்குவதற்காகக் காத்திருக்காமல் தானே முயன்று பயிற்சி மூலம் திறமையை வளர்க்கும் இயல்பு','விரைவாக முடிக்க நினைப்பதால் சகோதரர் அல்லது உடன் பணிபுரிபவரின் வேகத்தை ஏற்றுக்கொள்ளச் சிரமம்'],
 ['வீட்டாரின் தேவைகளைக் கவனித்தபடியே தனக்கென அமைதியான இடம் வைத்துக்கொள்ள விரும்பும் வாழ்க்கை முறை','வேலைச்சுமையை வீட்டுக்குக் கொண்டுவருவதால் ஓய்வு குறைந்து குடும்ப உரையாடல் சுருங்கும் நிலை'],
 ['ஏன் இப்படி நடக்கிறது என்ற கேள்வியால் அறிவை ஆழமாக வளர்த்து பிறருக்கும் தெளிவுபடுத்தும் ஆர்வம்','ஒரே முடிவைப் பலமுறை ஆராய்ந்து படிப்பு அல்லது குழந்தைகள் சார்ந்த தீர்மானங்களைத் தாமதப்படுத்தும் இயல்பு'],
 ['சிக்கலைப் பிரித்து அதன் காரணத்தை அறிந்து அன்றாட வேலையை ஒழுங்குபடுத்தும் திறன்','எல்லாவற்றையும் தானே சரிசெய்யும் எண்ணத்தால் கடமையும் மனச்சுமையும் பெருகும் நிலை'],
 ['உறவில் இருவரும் தங்கள் கருத்தை விளக்கிப் பேச வேண்டும் என்ற எதிர்பார்ப்பும் இணைந்து முடிவு செய்யும் விருப்பமும்','உதவியாகச் சொல்லும் சொற்கள் கட்டுப்படுத்துவதாகத் தோன்றினால் நெருங்கிய உறவில் இடைவெளி'],
 ['திடீர் மாற்றத்தின் காரணத்தைத் தேடி பாதுகாப்பான மாற்று வழியைத் திட்டமிடும் திறன்','ஒருமுறை ஏற்பட்ட நம்பிக்கை இழப்பை அடுத்த சூழ்நிலையிலும் நினைத்து தேவைக்கு மேல் எச்சரிக்கையாக இருப்பது'],
 ['வழிகாட்டுதலுக்கு மதிப்பு கொடுத்தாலும் காரணம் புரிந்தபின் மட்டுமே ஒரு கொள்கையை ஏற்றுக்கொள்ளும் இயல்பு','தன் நம்பிக்கையைத் தெளிவுபடுத்தும் முயற்சி பெரியவர்களுடன் தேவையற்ற விவாதமாக மாறுவது'],
 ['திறமையை வேலையில் வெளிப்படுத்தி பொறுப்பை ஒழுங்காக முடிக்க வேண்டும் என்ற உந்துதல்','வேலை சரியாக நடக்க வேண்டும் என்ற எண்ணத்தால் பிறருக்கான பொறுப்பையும் தானே ஏற்றுச் சோர்வது'],
 ['நம்பகமான தொடர்புகளை வளர்த்து நீண்டகால இலக்கிற்கு பயன்படும் ஒத்துழைப்பைத் தேடும் முறை','உதவியின் மதிப்பை மற்றவர் உணரவில்லை என்றால் வெளியில் சொல்லாமல் நட்பிலிருந்து விலகுவது'],
 ['தனியாகச் சிந்திக்கும் நேரத்தைச் செலவிட்டு பிறகு தெளிவாகச் செயல்பட விரும்புவது','முடிக்காத பணியை மனதில் தொடர்ந்து சுமந்து தூக்கம் மற்றும் தனிப்பட்ட ஓய்வைத் தள்ளிவைப்பது']
 ];
 const DOMAINS_EN=[
 ['listening before deciding while standing by a carefully considered view','carrying wounded pride internally before answering too sharply'],
 ['discussing family spending openly and building savings rules','helpful advice sounding like criticism when phrased forcefully'],
 ['learning by initiative and practice rather than waiting to be instructed','impatience when siblings or colleagues work at a different pace'],
 ['caring for family needs while wanting a quiet private space','bringing work pressure home and losing time for family conversation'],
 ['examining why things work and explaining complex ideas clearly','overthinking a learning or child-related decision until it stalls'],
 ['breaking a problem into manageable steps and maintaining daily order','taking on every duty personally and becoming overburdened'],
 ['preferring a partnership where both sides explain their views','well-meant guidance sounding controlling to a close partner'],
 ['examining unexpected changes and making a safety plan','letting a past disappointment create distrust in new situations'],
 ['respecting mentors while asking for the reasons behind their guidance','turning an honest question into a dispute with elders'],
 ['demonstrating competence through dependable responsibility at work','taking over others’ duties in the name of high standards'],
 ['building dependable friendships for long-term goals','withdrawing from friends when help is taken for granted'],
 ['using quiet private time to think before acting','continuing to worry about incomplete tasks when rest is needed']
 ];
 const ROUTES_TA=[
  [
  'இவர் இயல்பாக எப்படி நடந்துகொள்வார் என்பதை வெளியில் காணும் தோற்றத்தை வைத்து மட்டும் முடிவு செய்ய முடியாது; சூழ்நிலைக்குத் தகுந்து அணுகுமுறையை மாற்றிக்கொள்ளும் தன்மை இருக்கலாம்.',
  'தனக்கு முக்கியமான கருத்தைப் பேசும்போது விரிவாக விளக்க வேண்டும் என்ற விருப்பம் இருக்கும்; குடும்பத்தில் அந்த விளக்கம் அறிவுரையாகவும் சில நேரம் பிடிவாதமாகவும் புரிந்துகொள்ளப்படலாம்.',
  'ஒரு வேலை நின்றுபோனால் வேறு யாராவது தொடங்குவார்கள் என்று காத்திருக்காமல் தானே முயன்றுபார்க்கும் மனநிலை வெளிப்படலாம்.',
  'குடும்பத்தாரிடம் பாசம் இருந்தாலும் தன் எண்ணத்தைத் தனியாகச் சிந்திக்க இடமும் நேரமும் வேண்டுமென்று விரும்பலாம்.',
  'புதிய விஷயங்களை அறிந்துகொள்ளும் ஆர்வமும், அறிந்ததை மற்றவர்களுக்கு எடுத்துச் சொல்லும் விருப்பமும் இவரது பழக்கத்தில் தெரியும்.',
  'பிறர் கவனிக்காத குறையைச் சரிசெய்ய முயல்வார்; இதனால் உதவும் குணமும் தேவைக்கு அதிகப் பொறுப்பை ஏற்றுக்கொள்ளும் பழக்கமும் ஒன்றாக வரலாம்.',
  'நெருங்கிய உறவுகளில் வார்த்தையை விட பரஸ்பரப் புரிதலுக்கே அதிக மதிப்பு தரலாம்; கருத்து வேறுபாடு வந்தால் காரணம் கேட்கும் குணம் வெளிப்படும்.',
  'எதிர்பாராத ஏமாற்றம் இவரை உடனே சோர்வடையச் செய்யாமல் ஏன் நடந்தது என்று உள்ளுக்குள் ஆராய வைக்கலாம்.',
  'பெரியவர்களை மதித்தாலும் ஒரு விஷயத்திற்கான காரணத்தை அறியாமல் ஏற்றுக்கொள்ளத் தயங்கலாம்.',
  'தன்னுடைய பணியில் திறமை வெளிப்பட வேண்டும் என்று நினைப்பார்; தேவையான இடத்தில் பொறுப்பைத் தானாக ஏற்றுக்கொள்வார்.',
  'நண்பர்களைத் தேர்ந்தெடுப்பதில் நம்பகத்தன்மையைப் பார்க்கலாம்; நீண்ட நாள் பழகியவர்களுக்கு உதவ முன்வருவார்.',
  'வெளியில் அனைவருடனும் பழகினாலும் தனிப்பட்ட நேரத்தில் அமைதியாகச் சிந்திக்க வேண்டிய தேவையும் இவருக்கு இருக்கலாம்.'
  ],
  [
  'சுயமரியாதையைப் பாதுகாத்தபடி பொருளாதார முடிவெடுப்பார்; பிறரிடம் உதவி கேட்பதற்கு முன் தன்னுடைய வழியைத் தேடலாம்.',
  'குடும்பத்தில் பேசும் வார்த்தைகளும் பணம் பற்றிய முடிவுகளும் நீண்டகால உறவுகளைப் பாதிக்கக்கூடியவை என்பதால் இவ்விரண்டையும் இணைத்துப் பார்ப்பார்.',
  'சொந்த முயற்சியில் கற்ற திறன்களை வருமானத்திற்குப் பயன்படுத்தும் வாய்ப்பைத் தேடக்கூடும்; அவசர முடிவெடுப்பதையும் கவனிக்க வேண்டும்.',
  'வீட்டின் தேவைகள், பெற்றோர் வசதி, சொத்து பாதுகாப்பு போன்றவற்றுக்கான செலவுகளில் முன்னுரிமை மாறக்கூடும்.',
  'கல்வி மற்றும் குழந்தைகளுக்காகச் செலவிடுவதில் வெறும் செலவுக் கணக்கு மட்டுமல்ல எதிர்காலப் பயனையும் மதிப்பிடுவார்.',
  'கடன் அல்லது தவணைப் பொறுப்பு வந்தால் அதைத் தள்ளிப்போடாமல் திட்டமிட்டு முடிக்க முயல்வார்; உழைப்புக்கும் செலவுக்கும் சமநிலை தேவை.',
  'வாழ்க்கைத்துணையுடன் பணம் பற்றிய திறந்த உரையாடல் இருந்தால் உறவு மேம்படும்; கருத்தைத் தெளிவுபடுத்தாமல் கணக்கு வைத்திருப்பது தொந்தரவாகலாம்.',
  'எதிர்பாராத செலவுகள் வரக்கூடும் என்ற எண்ணத்தால் பாதுகாப்புச் சேமிப்பை விரும்பலாம்; அச்சத்தால் எல்லா வாய்ப்புகளையும் மறுக்க வேண்டியதில்லை.',
  'குடும்ப மரபு, பெரியோரின் ஆலோசனை, தனித்த நம்பிக்கை ஆகியவற்றில் எந்த வழி நடைமுறைக்கு உதவும் என்று ஆராய்வார்.',
  'தொழிலில் வருமானம் அதிகரிப்பதைவிட அதனை நிலையாகப் பாதுகாப்பதும் முக்கியம் என்ற எண்ணம் உருவாகலாம்.',
  'நண்பர்கள் அல்லது அறிமுகங்கள் வழியாக வரும் நிதி வாய்ப்பில் நம்பிக்கையை விட ஒப்பந்தத்தின் தெளிவுக்கே மதிப்பு தருவது நல்லது.',
  'தனிப்பட்ட வசதி, பயணம், ஓய்வு போன்றவற்றுக்குச் செலவிடும்போதும் சேமிப்பின் பாதுகாப்பை மனதில் வைத்திருப்பார்.'
  ],
  [
  'ஒரு புதிய முயற்சியில் தன்னால் செய்யமுடியும் என்ற நம்பிக்கையே முதலில் செயல்பட வைக்கும்; அதைச் செயலாக மாற்றும் ஒழுங்கு மிக முக்கியம்.',
  'பேச்சு, விற்பனை அல்லது தகவல் பகிர்வு வழியாகத் தன் திறனை மற்றவர்களிடம் காட்டக்கூடும்; நேரடியான சொற்கள் எல்லோருக்கும் ஒரே மாதிரி ஏற்றதாக இருக்காது.',
  'சிறிய முயற்சிகளைத் திரும்பத் திரும்பச் செய்து கற்றுக்கொள்வார்; சகோதரர் அல்லது சக பணியாளரின் வேகம் தன்னுடன் பொருந்தாவிட்டால் உரசல் ஏற்படலாம்.',
  'வீட்டில் கிடைக்கும் ஆதரவு அல்லது இடையூறு முயற்சிக்கான மனநிலையை மாற்றலாம்; சுதந்திரமாகச் செயல்படும் இடம் தேவைப்படலாம்.',
  'படித்து அறிந்ததைச் செயலில் முயற்சி செய்து பார்க்கும் ஆவல் இருக்கும்; கற்றதை விளக்கிக் காட்டும் வாய்ப்பையும் தேடலாம்.',
  'போட்டி அல்லது எதிர்ப்பு வந்தால் ஆரம்பத்தில் சிரமம் உணர்ந்தாலும் பிரச்சினைக்குள் இறங்கிச் சரிசெய்ய முயல்வார்.',
  'கூட்டாகச் செய்யும் வேலையில் முடிவை ஒருவரே எடுப்பதா, இருவரும் பகிர்வதா என்பது முன்பே தெளிவாக இருக்க வேண்டும்.',
  'திடீர் தடைகள் ஆரம்பத் திட்டத்தை மாற்றக்கூடும்; மாறுபட்ட வழியை உடனே யோசிக்கும் பழக்கம் உதவலாம்.',
  'ஆசிரியர் அல்லது வழிகாட்டியிடம் கற்ற கருத்தை அப்படியே பின்பற்றாமல் நடைமுறையில் சோதித்துப் பார்க்க விரும்புவார்.',
  'தன் முயற்சி தொழில் திறனாகத் தெரிய வேண்டும் என்று விரும்புவர்; புதிய பொறுப்பை ஏற்கும்போது கால அளவை மதிப்பிட வேண்டும்.',
  'திறமையான நண்பர்களுடன் சேரும்போது முயற்சிக்கு ஊக்கம் கிடைக்கும்; ஒப்பீடும் போட்டியுணர்வும் அளவாக இருக்க வேண்டும்.',
  'பல வேலைகளை ஒரே சமயம் தொடங்கினால் ஓய்வு குறையலாம்; இடைவெளி விட்டு முடிப்பது முயற்சியின் தரத்தை உயர்த்தும்.'
  ],
  [
  'தனக்குச் சொந்தமான இடம், அதில் எடுக்கும் முடிவுகள் ஆகியவற்றில் உரிமை உணர்வு அதிகமாக இருக்கலாம்.',
  'குடும்பத்தினர் பேசும் விதம் வீட்டு அமைதியை நேரடியாகப் பாதிக்கும்; தேவையான விஷயத்தைத் தெளிவாகச் சொல்லிப் புரியவைக்க முயல்வார்.',
  'வீட்டைப் பராமரிக்கத் தானே முன்வந்து சிறு வேலைகளைச் செய்யும் ஆர்வம் இருக்கும்; பிறர் உதவி குறைவாக இருந்தால் மனக்கசப்பு வரலாம்.',
  'வீட்டில் மனநிம்மதி கிடைப்பதே பல முடிவுகளின் அடிப்படையாக அமையலாம்; தனக்கு விருப்பமான ஒழுங்கை வைத்திருக்க விரும்புவார்.',
  'கற்றல், புத்தகங்கள், குழந்தைகளின் முன்னேற்றம் போன்றவை வீட்டுச் சூழலில் முக்கியப் பேச்சாக வரலாம்.',
  'அன்றாட வேலைச்சுமை வீட்டின் அமைதியைப் பாதிக்காமல் பார்த்துக்கொள்ள வேண்டும்; முடியாத வேலையை மனதில் சுமந்துவரும் போக்கு இருக்கலாம்.',
  'வாழ்க்கைத்துணையுடன் வீடு மற்றும் குடும்பப் பொறுப்புகளை முன்பே பகிர்ந்தால் நெருக்கம் அதிகரிக்கலாம்.',
  'சொத்து அல்லது குடும்பத் தீர்மானங்களில் எதிர்பாராத மாற்றம் வந்தால் ஆவணங்களையும் விவரங்களையும் மீண்டும் சரிபார்க்கத் தோன்றும்.',
  'தாயார் மற்றும் பெரியோரின் ஆலோசனையை மதித்தாலும் தன் குடும்ப வாழ்க்கைக்கான முடிவைத் தானே எடுக்க விரும்பலாம்.',
  'வேலைக்காக வீடு மற்றும் தொழில் இடையே சமநிலையைப் பேண வேண்டிய சூழல்கள் உருவாகலாம்.',
  'குடும்பத் தேவைகளுக்கான நீண்டகாலச் சேமிப்பை நண்பர்கள் ஆலோசனைக்குப் பதிலாகத் தனியாகத் திட்டமிடலாம்.',
  'தனிமையும் நிம்மதியும் தரும் ஒரு இடத்திற்குத் திரும்பும் தேவை இருக்கும்; ஓய்வைத் தவிர்ப்பது மனச்சுமையை அதிகரிக்கலாம்.'
  ],
  [
  'கற்றுக்கொள்வதில் தனக்குப் பொருத்தமான முறையைத் தேடுவார்; ஒரே விளக்கத்தில் திருப்தியடையாமல் காரணம் கேட்கலாம்.',
  'பேச்சிலும் நினைவிலும் புதிய தகவல்களை இணைத்துச் சொல்லும் ஆற்றல் வளரலாம்; சிறு விஷயத்தையும் தேவைக்கு மேல் விவாதிக்கலாம்.',
  'பயிற்சியால் அறிவைச் செயல்முறையாக மாற்ற விரும்புவார்; நேரடியாக முயற்சி செய்தால் புரிதல் அதிகரிக்கும்.',
  'வீட்டில் படிக்கவும் சிந்திக்கவும் அமைதியான இடம் கிடைப்பது கவனத்தை அதிகரிக்கக்கூடும்.',
  'புதிய கருத்துகளை உருவாக்குவதிலும் குழந்தைகளிடம் விளக்கிப் பேசுவதிலும் ஆர்வம் இருக்கும்; தன் எண்ணத்தை எல்லோருக்கும் திணிக்காமல் இருக்க வேண்டும்.',
  'பணிச் சிக்கல்கள் அல்லது போட்டி ஏற்படும்போது ஆழமாகச் சிந்தித்து வழி கண்டுபிடிப்பார்; அதே சிந்தனை அழுத்தமாக மாறலாம்.',
  'நெருங்கியவருடன் சிந்தனைகளைப் பகிரும்போது புதிய பார்வை கிடைக்கும்; கருத்து வேறுபாட்டை தனிப்பட்ட எதிர்ப்பாகக் கொள்ள வேண்டாம்.',
  'தோல்வி ஏற்பட்ட பாடங்களை நினைவில் வைத்துக் கொண்டு அடுத்த முயற்சியை மாற்றலாம்; கடந்த தவறில் மட்டும் நிலைத்திருக்கக்கூடாது.',
  'ஆசிரியர்களிடம் காரணத்துடன் விளக்கப்படும்போது வேகமாகக் கற்றுக்கொள்வார்; தனிப்பட்ட நம்பிக்கையையும் அறிவையும் ஒப்பிடுவார்.',
  'ஆழமாக அறிந்த அறிவைத் தொழிலில் பயன்படுத்தும் வாய்ப்பைத் தேடலாம்; குறிப்பிட்ட துறையில் திறமையை வளர்க்கும் நோக்கம் இருக்கும்.',
  'நண்பர்களுடன் கருத்துப் பகிர்வு புதிய வாய்ப்புக்குக் காரணமாகலாம்; மற்றவர் கருத்தைச் சோதிக்காமல் ஏற்கமாட்டார்.',
  'தனியாகப் படிக்கும் அல்லது ஆராயும் நேரம் இவருக்கு உதவும்; மன ஓய்வுக்கான எல்லையையும் வைத்திருக்க வேண்டும்.'
  ],
  [
  'தன்னுடைய திறமையை நிரூபிக்கச் சவால்களை எதிர்கொள்ள முற்படலாம்; எல்லா சிக்கலும் தனக்கான பொறுப்பு அல்ல என்பதை உணர வேண்டும்.',
  'பணியில் சிறிய தவறைச் சரிசெய்யும்போது சொற்களின் தொனி முக்கியமாகும்; நேரடிப் பேச்சு உதவியாகவும் விமர்சனமாகவும் புரியலாம்.',
  'ஒரு பிரச்சினை வந்தால் தானே களத்தில் இறங்கிப் பார்க்க விரும்புவார்; ஓய்வின்றி முயல்வதைத் தவிர்க்க வேண்டும்.',
  'வீட்டுப் பொறுப்புகளுக்கும் பணிச்சுமைக்கும் இடையே தெளிவான நேர ஒதுக்கீடு தேவைப்படலாம்.',
  'சிக்கலான வேலைகளைப் பிரித்து ஆராய்ந்து தீர்வு காண விரும்புவார்; திட்டமிடுவதில் அதிக நேரம் செலவிடக்கூடும்.',
  'அன்றாட வேலை ஒழுங்கு, கடன் பற்றிய கவனம், போட்டியை எதிர்கொள்வது ஆகியவற்றில் கட்டுப்பாடு வைத்திருக்க முயல்வார்.',
  'கூட்டுப் பணியில் பொறுப்பைத் தெளிவாகப் பிரிக்காவிட்டால் ஒருவருடைய சுமை மற்றொருவருக்கு மாறக்கூடும்.',
  'திடீர் வேலைமாற்றமோ எதிர்பாராத பிரச்சினையோ வந்தால் மாற்றுத் திட்டம் வைத்திருப்பது உதவும்.',
  'வழிகாட்டுதலை ஏற்றுக்கொண்டாலும் தானே பரிசோதித்துப் பார்க்கும் மனநிலை இருக்கும்; விதிகளின் காரணத்தைக் கேட்பார்.',
  'தொழிலில் சவாலான பணியைக் கையாண்டு திறமையைக் காட்டலாம்; எல்லா பொறுப்பையும் தனியாக ஏற்க வேண்டியதில்லை.',
  'பணியிலான போட்டி சில நண்பர்களுடனான தொடர்பை மாற்றலாம்; தொழில் மற்றும் நட்புக்கான எல்லை தேவை.',
  'அதிகப் பணிச்சுமை ஓய்வைக் குறைக்கக் கூடும்; திட்டமிட்ட இடைவேளை செயல் திறனைத் தக்க வைக்கும்.'
  ],
  [
  'நெருங்கிய உறவிலும் தனக்கென ஒரு அடையாளமும் சுதந்திரமும் இருக்க வேண்டும் என்று நினைக்கலாம்.',
  'உறவுகளில் சொல்லப்படாத எதிர்பார்ப்புகளே சிக்கலை உண்டாக்கலாம்; செலவுகள் மற்றும் குடும்பக் கடமைகளை வெளிப்படையாகப் பேசுவது உதவும்.',
  'துணையுடன் சேர்ந்து செயல்படும் போது வேகத்திலும் முடிவெடுக்கும் முறையிலும் வேறுபாடு தெரிந்தால் அதனைப் புரிந்துகொள்ள முயற்சி தேவை.',
  'வீடு மற்றும் இரு குடும்பங்கள் பற்றிய முடிவுகளில் இருவரின் மனநிம்மதிக்கும் இடமளிப்பது முக்கியமாகும்.',
  'குழந்தைகள், கல்வி, விருப்பங்கள் குறித்து இருவரும் விவாதித்துத் திட்டமிடும் பழக்கம் உறவை வளர்க்கலாம்.',
  'வேலைச்சுமையை வீட்டுக்கு எடுத்துவராமல் பேசித் தீர்ப்பது நல்லது; குறைசொல்லும் மொழியை கவனிக்க வேண்டும்.',
  'உறவில் கருத்துகளுக்கான மதிப்பு முக்கியமாக இருக்கும்; கேட்பதற்கும் விளக்குவதற்கும் சமமான இடம் வழங்க வேண்டும்.',
  'எதிர்பாராத நம்பிக்கைச் சிக்கலில் உடனடி முடிவெடுப்பதைவிட உண்மையைத் தெளிவுபடுத்திக் கொள்வது உதவும்.',
  'பெரியோரின் ஆலோசனையைப் பெற்றாலும் இரண்டு பேருடைய ஒப்புதலே முக்கியம் என்பதைத் தெளிவுபடுத்த வேண்டும்.',
  'தொழில் இலக்குகளைத் துணையுடன் பகிர்ந்தால் பொறுப்புகளில் ஒத்துழைப்பு அதிகரிக்கும்.',
  'உறவினர், நண்பர் தலையீடு வந்தால் எல்லைகளை மென்மையாகக் குறிப்பிடுவது புரிதலைப் பாதுகாக்கும்.',
  'இருவருக்கும் தனித்த ஓய்வு நேரம் தேவைப்படலாம்; அமைதியை அலட்சியமாகப் புரிந்துகொள்ளாமல் இருப்பது நல்லது.'
  ],
  [
  'வாழ்க்கையில் திடீரென மாறும் சூழ்நிலையைச் சந்திக்கும்போது முதலில் தன்னுடைய நிலையைப் பாதுகாக்க முயல்வார்.',
  'குடும்பத்தில் மறைக்கப்பட்ட விவரங்கள் பின்னர் குழப்பம் தரக்கூடும்; பணம் மற்றும் முக்கிய முடிவுகளில் தெளிவு தேவை.',
  'முன்னைய முயற்சி தோல்வியடைந்தால் வேறுவழியில் முயன்று பார்க்கும் துணிவு இருக்கலாம்; ஆவலில் ஆபத்தை ஏற்க வேண்டாம்.',
  'வீடு அல்லது சொத்துக்கு தொடர்பான மாற்றத்தில் விவரங்களையும் ஆவணங்களையும் ஆராய்வதற்கு முக்கியத்துவம் தரலாம்.',
  'சிக்கல்களை ஆழமாகப் புரிந்துகொள்ளும் ஆர்வம் ஆராய்ச்சிக்குத் துணை நிற்கலாம்; எல்லாவற்றிலும் சந்தேகம் கொள்ளத் தேவையில்லை.',
  'தடை வந்ததும் அதற்கான காரணத்தைத் தேடுவார்; உடல் மற்றும் மன ஓய்வு தேவைப்படும் எல்லையையும் உணர வேண்டும்.',
  'உறவில் ஏற்பட்ட சந்தேகத்தை மனதில் சேர்த்துவைக்காமல் நேரடியாகக் கேட்டுத் தெளிவுபடுத்துவது நல்லது.',
  'எதிர்பாராத மாற்றங்களுக்கு மாற்றுத் திட்டம் வைத்திருப்பார்; பயத்தால் புதிய முடிவுகளை முழுமையாகத் தவிர்க்க வேண்டாம்.',
  'நம்பிக்கை, வாழ்க்கை பற்றிய கேள்விகள் முக்கிய அனுபவங்களுக்குப் பின் மாறக்கூடும்; கற்றதை அமைதியாகப் பரிசீலிப்பார்.',
  'தொழிலில் மறைமுக இடையூறு வந்தால் ஆதாரங்களைத் திரட்டிப் பிரச்சினையைத் தீர்க்க முயல்வார்.',
  'ஆதாயம் தாமதமானால் காரணத்தை ஆராய்ந்துதான் அடுத்த முயற்சியைத் தொடர்வார்; அவசரமான பரிந்துரைகளை எச்சரிக்கையுடன் பார்ப்பார்.',
  'தனிப்பட்ட கவலைகளை வெளியில் சொல்லாமல் மனதில் வைத்துக்கொள்ளலாம்; நம்பகமான ஒருவருடன் பேசுவது உதவும்.'
  ],
  [
  'தன்னுடைய வாழ்க்கைக்கான கொள்கைகளைத் தேர்ந்தெடுக்கும்போது அவை தன் அனுபவத்துக்கு பொருந்துகின்றனவா என்பதைப் பார்க்கலாம்.',
  'குடும்ப மரபை மதித்தாலும் எல்லா வழக்கங்களின் பொருளையும் கேட்டுத் தெரிந்துகொள்ள விரும்பலாம்.',
  'ஆசிரியரிடம் கேட்ட அறிவை முயற்சியில் பயன்படுத்திப் பார்த்த பின்னரே முழுமையாக நம்பும் இயல்பு இருக்கலாம்.',
  'தந்தை அல்லது மூத்தோரின் விருப்பத்துக்கும் தனிப்பட்ட முடிவுக்கும் வேறுபாடு வந்தால் விளக்கிக் கூறி சமாளிக்க முயல்வார்.',
  'படிப்பும் தத்துவச் சிந்தனையும் ஒன்றையொன்று ஊக்குவிக்கலாம்; புதிய கருத்தை விரிவாக ஆராய விருப்பம் இருக்கும்.',
  'தனது கொள்கைகளை நடைமுறையில் பயன்படுத்தும்போது சிக்கல் வந்தால் சூழ்நிலைக்கேற்ப சரிசெய்வதைக் கற்றுக்கொள்ளலாம்.',
  'உறவுகளில் ஒரே நம்பிக்கையை எல்லோரிடமும் எதிர்பார்க்காமல் பரஸ்பர மதிப்பைப் பேணுவது உதவும்.',
  'முக்கிய ஏமாற்றங்களுக்குப் பின் மனிதர்களையும் சூழல்களையும் பற்றிய கண்ணோட்டம் மாறக்கூடும்.',
  'வழிகாட்டி மற்றும் மரபு மீது மதிப்பு இருக்கும்; காரணமில்லாத கட்டளையைப் பின்பற்றத் தயக்கம் உண்டாகலாம்.',
  'தொழிலில் நேர்மை பற்றிய கொள்கைக்கும் நடைமுறை முடிவுகளுக்கும் சமநிலையைத் தேடுவார்.',
  'நண்பர்களையும் சமூகத் தொடர்புகளையும் தேர்வுசெய்யும்போது அவர்களுடைய நம்பகத்தன்மையையும் மதிப்பார்.',
  'தனிமையில் படிப்பு, சிந்தனை அல்லது வழிபாட்டில் மனநிறைவு காணலாம்; இவை தனிப்பட்ட விருப்பங்களைப் பொறுத்தது.'
  ],
  [
  'தன் திறமையை வெளியில் காட்ட வேண்டும் என்ற எண்ணம் செயல்பாட்டைத் தூண்டலாம்; தன்னம்பிக்கையும் பொறுப்பும் இணைந்து செயல்பட வேண்டியது முக்கியம்.',
  'தொழில் குறித்த பேச்சிலும் வருமான ஒப்பந்தங்களிலும் நுணுக்கமான விவரங்களைத் தெளிவுபடுத்த விரும்புவார்.',
  'புதிய திறனைக் கற்றபின் அதை நேரடியாகப் பணியில் பயன்படுத்த முயல்வார்; முயற்சியை திட்டமாக மாற்றினால் பயன் அதிகம்.',
  'வேலை நேரம் குடும்பத்துடன் செலவிடும் நேரத்தைக் குறைக்காமல் திட்டமிட வேண்டிய அவசியம் வரலாம்.',
  'ஆராய்ந்து கற்ற அறிவை வேலைப்பாட்டில் புதிய முறையாக மாற்றும் ஆர்வம் இருக்கும்; தன் கருத்தை எடுத்துரைக்க விரும்புவார்.',
  'சிக்கலான பணிகளைத் தீர்த்து நிர்வாகத்தின் நம்பிக்கையைப் பெறலாம்; வேலைச்சுமையைச் சரியாகப் பகிர்வது அவசியம்.',
  'கூட்டாளி அல்லது வாடிக்கையாளரின் எதிர்பார்ப்பைச் சரியாகப் புரிந்துகொள்ளாவிட்டால் திறமை இருந்தும் கருத்து வேறுபாடு ஏற்படலாம்.',
  'திடீர் வேலைமாற்றம் அல்லது திட்டமாற்றம் வந்தால் காரணத்தை ஆராய்ந்து மாற்று வழி தேடுவார்.',
  'ஆசிரியர், மூத்தோர் அல்லது வழிகாட்டியின் உதவியால் தொழில் முடிவை மாற்றிப் பார்க்கும் சூழல் உருவாகலாம்.',
  'வேலையில் பொறுப்பை ஏற்றுக்கொள்ளும் மனநிலை இருக்கும்; முடிவின் தரம் தனக்குரிய பெயராக இருக்க வேண்டும் என்று நினைப்பார்.',
  'பழகியவர்கள் மூலம் தொழில் வாய்ப்பு வரலாம்; நம்பிக்கைக்குப் பின் செயல்முறை விவரங்களையும் பார்க்க வேண்டும்.',
  'வேலைக்காக அதிக நேரம் செலவிடும்போது தனிப்பட்ட ஓய்வு பாதிக்காமல் எல்லை நிர்ணயிப்பது அவசியம்.'
  ],
  [
  'தனது முயற்சியின் பலனைத் தெளிவாகக் காண விரும்புவார்; வெற்றியைப் பிறருடன் ஒப்பிடாமல் தன் முன்னேற்றத்தைக் கணக்கிடுவது உதவும்.',
  'குடும்பத் தேவைகளுக்கான வருமானமும் நீண்டகாலச் சேமிப்பும் ஒரே திட்டத்தில் இணைக்கப்படலாம்.',
  'சிறு முயற்சிகளைத் தொடர்ந்து செய்தால் வாய்ப்புகள் திறக்கும்; நண்பர்களுடன் போட்டியிடுவதைவிட ஒத்துழைப்பை விரும்பலாம்.',
  'வீடு, சொத்து மற்றும் நீண்டகாலப் பாதுகாப்புக்காக ஆதாயத்தைப் பயன்படுத்தும் எண்ணம் இருக்கும்.',
  'கற்ற திறனையும் புதிய சிந்தனையையும் வருமான வாய்ப்பாக மாற்ற விரும்புவர்; எல்லா யோசனையும் உடனடிப் பலன் தராது.',
  'கடன் அல்லது வேலைப் பொறுப்பு அதிகமானால் ஆதாயம் இருந்தும் நிம்மதி குறையலாம்; முதலில் ஒழுங்கை வலுப்படுத்த வேண்டும்.',
  'வாழ்க்கைத்துணையின் ஆலோசனையோ கூட்டாளியின் பங்களிப்போ சில இலக்குகளில் உதவலாம்; ஒப்பந்தம் தெளிவாக இருக்க வேண்டும்.',
  'எதிர்பாராத செலவு அல்லது திட்டமாற்றம் ஆதாயத்தை மாற்றலாம்; பாதுகாப்புத் திட்டம் மனநிம்மதி தரும்.',
  'கற்ற ஆசிரியர் அல்லது மூத்தோரின் வழிகாட்டுதல் புதிய வாய்ப்புக்குக் காரணமாகலாம்; தனக்குப் பொருத்தமானதைத் தேர்ந்தெடுப்பார்.',
  'தொழில் முன்னேற்றத்தின் அடிப்படையில் ஆதாயம் உயர வேண்டும் என்ற விருப்பம் இருக்கும்; திறமை மேம்பாடு தொடர வேண்டும்.',
  'நண்பர்களின் வட்டத்தை எண்ணிக்கையால் அல்ல நம்பிக்கையால் தேர்வுசெய்யலாம்; தொடர்ந்து உதவும் உறவுகளையே மதிப்பார்.',
  'அதிக வருமானத்துக்காக ஓய்வையும் குடும்ப நேரத்தையும் முழுவதுமாக விட்டுவிடாமல் பார்த்துக்கொள்வது நல்லது.'
  ],
  [
  'உள்ளுக்குள் ஓடும் எண்ணங்களுக்கு இடையில் தனக்கென்று நேரம் ஒதுக்க விரும்பலாம்; ஓய்வும் தனிப்பட்ட சுதந்திரமும் தேவையாக இருக்கும்.',
  'செலவுகள் குறித்து குடும்பத்துடன் பேசும்போது தேவைக்கும் விருப்பத்திற்கும் வேறுபாடு காட்டத் தெரிந்திருப்பது உதவும்.',
  'அதிகம் முயற்சி செய்த நாட்களில் சிந்தனையை நிறுத்தி ஓய்வெடுக்கச் சிரமம் வரலாம்; சிறிய இடைவேளைகள் உதவும்.',
  'வீட்டில் அமைதியாக இருக்கக்கூடிய இடம் கிடைத்தால் மனம் தெளிவடையக்கூடும்; தனிமையை உறவிலிருந்து விலகலாகக் கருத வேண்டாம்.',
  'தனியாகப் படிப்பதோ புதிய விஷயங்களை ஆராய்வதோ ஓய்வாக இருக்கலாம்; ஓய்வு நேரத்தையும் வேலையாக மாற்றத் தேவையில்லை.',
  'முடிக்காத பொறுப்புகளை மனதில் சுமந்து கொண்டிருந்தால் உறக்க ஒழுங்கு பாதிக்கப்படலாம்; பணிகளை முடிக்கத் திட்டமிடுவது உதவும்.',
  'நெருங்கியவரிடம் தனிமை தேவை என்பதை முன்பே கூறினால் தவறான புரிதல் குறையும்.',
  'முந்தைய ஏமாற்றங்களைத் தனியாக நினைத்துக்கொண்டிருந்தால் நம்பகமானவருடன் பகிர்வது மனச்சுமையைத் தளர்த்தலாம்.',
  'நம்பிக்கை அல்லது ஆன்மிக வழக்கங்கள் சில நேரங்களில் மன அமைதி தரலாம்; அவை தனிப்பட்ட விருப்பத்திற்கு ஏற்ப இருக்க வேண்டும்.',
  'வேலை முடிந்து ஓய்வுக்குத் திரும்பும் எல்லை தெளிவாக இல்லாவிட்டால் மனம் தொடர்ந்து பணியையே நினைக்கலாம்.',
  'நண்பர்கள் சுற்றம் இருந்தாலும் அனைவருடனும் எப்போதும் இருக்க வேண்டிய அவசியம் இல்லை; தனிப்பட்ட நேரமும் முக்கியம்.',
  'செலவுகள், தூக்கம், ஓய்வு ஆகியவற்றுக்கு ஒழுங்கை வைத்திருப்பது சிந்தனையைத் தெளிவாக வைத்திருக்க உதவும்.'
  ]
 ];
 // English text offers the same twelve linked topics, never a copy of translated Tamil DOM.
 const ROUTES_EN=[
 ['Their everyday character can show different sides depending on the situation.','Speech and family expectations can make their certainty seem like advice or stubbornness.','They may prefer trying a stalled task personally rather than waiting for someone else.','They can value family closeness while needing room to think independently.','Curiosity and the wish to explain what they know can shape conversations.','They may volunteer to fix an overlooked problem, sometimes taking on too much.','In close relationships, being understood matters more than reassuring words alone.','Unexpected disappointment may prompt investigation rather than immediate retreat.','They may respect elders while still asking why a practice should be followed.','They want their abilities to show through the quality of their work.','They may prefer a small dependable circle and remain loyal to old friends.','They can enjoy company but still require undisturbed private time.'],
 ['Financial decisions can be tied to independence and self-respect.','Family words and financial promises may have a lasting effect on trust.','A personally acquired skill may become a source of income if developed patiently.','Household needs and property security can reshape the spending plan.','Education and children may be seen as investments in the future.','Debt or recurring obligations call for an orderly repayment plan.','Open conversations about shared expenses can protect partnerships.','An emergency reserve may feel more important than quick gains.','Family tradition and practical financial advice may sometimes compete.','Stable income can matter as much as increasing income.','Offers made through friends still benefit from written clarity.','Personal comforts and rest can be funded without ignoring future security.'],
 ['Self-belief can initiate a new effort, but discipline determines what follows.','Communication skills may help them demonstrate what they can do.','Practice and repeated attempts may teach more than instruction alone.','The atmosphere at home can help or frustrate sustained effort.','Trying out a new idea can consolidate what they learned.','Resistance may push them to investigate the problem more deeply.','Working jointly requires clear decisions about roles and pace.','A sudden obstacle may require an alternate approach.','They may prefer testing a teacher’s advice in real conditions.','Practical initiative may become a professional strength.','Capable friends can help if rivalry is kept under control.','Beginning too many tasks may crowd out necessary rest.'],
 ['Personal space and household decisions may be closely connected.','The tone of family discussions can support or unsettle peace at home.','They may take practical household tasks into their own hands.','A predictable home rhythm may be important to their sense of comfort.','Learning and children may influence how the home is organized.','Carrying work worries home can consume family time.','Sharing home duties explicitly can reduce resentment.','Unexpected changes in property matters call for documentation.','They may respect parents while choosing their own domestic habits.','Work ambitions can require careful balance with home needs.','Long-term housing plans need practical saving habits.','A quiet place to recover can be more valuable than constant activity.'],
 ['They may want to understand the reason behind what they are taught.','The ability to connect ideas can help, while over-explanation may distract.','Hands-on practice can make abstract knowledge useful.','A calm home environment may support concentration.','They may enjoy creating ideas and explaining them to younger people.','Troubleshooting can be a learning strength but also a source of pressure.','Discussion with a partner may deepen thinking if disagreement is tolerated.','Past mistakes may become useful lessons rather than lasting regrets.','They may respect a teacher most when the lesson is explained clearly.','Specialist knowledge can become useful in a chosen profession.','Debate with friends can introduce fresh viewpoints.','Private reading time may help, provided it does not replace rest.'],
 ['Their urge to prove competence may draw them into difficult tasks.','Direct feedback can resolve errors but may sound harsher than intended.','They may prefer solving a practical problem themselves.','Work and household duties need realistic time boundaries.','Breaking an issue into parts may reveal a workable solution.','Daily routines and debt obligations require consistency.','Shared responsibility is easier when roles are written down.','Disruptions are easier to face with a backup plan.','They may ask why workplace rules exist before following them.','Difficult assignments can reveal ability if workload stays manageable.','Competition at work should not dominate friendships.','Excess work needs to be balanced with recovery.'],
 ['A close relationship may need both togetherness and individuality.','Unspoken family and money expectations can become friction.','Differences in working pace call for conscious cooperation.','Home decisions work better when both people feel heard.','Joint discussions on children, study and interests can create closeness.','Work frustrations should not become criticism at home.','Listening and explaining deserve equal space in a relationship.','A trust concern is better investigated calmly than judged immediately.','Elders can advise, but both partners must agree on key decisions.','Sharing career plans can make family responsibilities easier to coordinate.','Boundaries with friends and relatives may protect privacy.','Each person may need individual downtime without it being rejection.'],
 ['They may first focus on preserving stability during abrupt change.','Clear information about money and family commitments avoids surprises.','An unsuccessful effort may prompt a different method.','Property changes call for careful document checks.','Research can be a strength if questioning does not turn into suspicion.','Facing setbacks requires attention to recovery and boundaries.','Sensitive doubts in a relationship benefit from direct discussion.','A backup plan can help without making fear the main decision-maker.','Difficult experiences may reshape personal beliefs.','Unexpected work problems are best handled using evidence.','Delayed gains can invite investigation before further investment.','Keeping every worry private can increase emotional strain.'],
 ['They may shape beliefs around personal experience and observation.','Respect for tradition can coexist with questions about its meaning.','They may trust a teacher’s idea more after testing it.','Differences with parents may be discussed rather than simply obeyed.','Study may encourage deeper questions about ethics and meaning.','Practical complications can refine a cherished principle.','Different beliefs in relationships deserve mutual respect.','Major disappointments may change their worldview.','Guidance is most convincing when its reasons are clear.','At work they may try balancing integrity with practical needs.','Trustworthiness may influence their choice of friends.','Private study or spiritual practice may be a personal source of calm.'],
 ['They may want their competence and identity to be visible at work.','Clear speech and sound financial agreements strengthen work relationships.','Newly learned skills can be tested in a real role.','Career demands need not erase time at home.','Knowledge and research can lead to better working methods.','Solving complex work problems can build trust if tasks are delegated.','Client and partner expectations need to be confirmed rather than assumed.','Unexpected work changes may require a revised plan.','Mentorship can help them reassess a professional decision.','Responsibility and reliable work can become central to reputation.','Contacts may open doors, but details still require verification.','Strong work involvement makes scheduled rest important.'],
 ['They may prefer to measure progress against their own goals.','Income and household security benefit from a joined plan.','Small consistent efforts may gradually open opportunities.','Gains can be directed toward a safer home or property goal.','Creative skills might become useful earning opportunities.','Debt pressure can undermine the satisfaction of improved income.','A partner’s contribution may help when arrangements are clear.','Unexpected spending makes reserves important.','Experienced mentors may introduce practical opportunities.','Career growth can shape financial gains through increased skill.','Long-standing dependable friendships may be valued over a large circle.','Pursuing income should not consume all family and recovery time.'],
 ['They may need private time to regain clarity after a busy day.','Discussing needs and wishes may ease family spending tension.','Heavy effort can make switching off difficult.','A quiet place at home may support emotional rest.','Reading and research can be relaxing if not treated as more work.','Unfinished tasks may keep the mind busy before sleep.','Explaining the need for solitude can prevent misunderstandings.','Talking about old disappointments may reduce silent strain.','Belief or reflection may be a personal way to settle the mind.','A clear end to working hours can help with recovery.','Even socially engaged people can need uninterrupted alone time.','Regular spending, sleep and rest routines can support balance.']
 ];

 const CROSS_TA=['சொந்த முடிவுகள்','குடும்பப் பேச்சும் சேமிப்பும்','முயற்சியும் உடன்பிறப்புகளும்','வீட்டுச் சூழலும் தாயார் சார்ந்த பொறுப்பும்','கற்றலும் குழந்தைகள் தொடர்பான சிந்தனையும்','வேலைப்பளுவும் போட்டியும்','துணைவர் அல்லது கூட்டாளியுடன் ஒத்துழைப்பும்','திடீர் மாற்றத்திற்கான முன்னெச்சரிக்கையும்','பெரியோரின் ஆலோசனையும் கொள்கையும்','தொழில் பொறுப்பும் மதிப்பும்','நண்பர்கள் மற்றும் வருமான இலக்குகளும்','தனிப்பட்ட நேரமும் செலவும்'];
 const CROSS_EN=['personal decisions','family speech and savings','initiative and siblings','home and parental duties','learning and guidance for children','workload and competition','partnership and collaboration','preparing for sudden change','mentors and values','work responsibility and reputation','friendships and income plans','time alone and expenditure'];
 const TRAITS_TA={Sun:['முன்னின்று பொறுப்பேற்கும் ஆற்றல்','தன்னுடைய கருத்திற்கு அதிக முக்கியத்துவம் கொடுக்கும் பிடிவாதம்'],Moon:['மற்றவர் மனநிலையை உணரும் நுணுக்கம்','சுற்றியுள்ளவர்களின் உணர்ச்சிகளால் கவனம் திசைதிரும்புதல்'],Mars:['வேகமாகச் செயல்படும் துணிவு','அவசர எதிர்வினையும் நேரடியான வார்த்தையும்'],Mercury:['விவரங்களை இணைத்து விளக்கும் அறிவு','அனைத்தையும் ஆராய்ந்து முடிவைத் தள்ளிப்போடுதல்'],Jupiter:['ஆலோசனை செய்து நியாயத்தைத் தேடும் பாங்கு','தன்னுடைய கருத்தே சரி என்று நீண்ட விளக்கம் தருதல்'],Venus:['உறவைச் சுமுகமாக வைத்திருக்கும் திறன்','மற்றவர் விருப்பத்திற்கு அளவுக்கு மேல் இணங்குதல்'],Saturn:['ஒழுங்குடன் நீண்டகாலப் பொறுப்பு ஏற்பது','கடமையை மனதில் சுமந்து மெதுவாகவே மாற்றம் ஏற்றுக்கொள்ளுதல்'],Rahu:['புதிய முறையை ஆராயும் துணிச்சல்','ஒரே நேரத்தில் பல புதுப் பாதைகளைத் தேடுதல்'],Ketu:['தேவையற்றதை விலக்கி ஆழமாக ஆராய்தல்','சொல்லாமல் விலகுவதால் தவறாகப் புரிந்துகொள்ளப்படுதல்']};
 const TRAITS_EN={Sun:['readiness to take responsibility','excessive insistence on one’s own view'],Moon:['sensitivity to others’ emotions','distraction by surrounding emotions'],Mars:['bold initiative','rash reactions and blunt speech'],Mercury:['connecting details and communicating clearly','analysis that delays decisions'],Jupiter:['reasoned advice and fairness','explaining a personal view too insistently'],Venus:['keeping relationships cooperative','over-accommodating others'],Saturn:['long-term discipline','carrying responsibilities too heavily'],Rahu:['exploring unfamiliar approaches','pursuing too many new directions'],Ketu:['deep scrutiny and detachment','silently withdrawing and being misunderstood']};
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function signIndex(v){if(Number.isInteger(v)&&v>=0&&v<12)return v;if(typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<360)return Math.floor(v/30);const s=String(v??'').trim();const ta=SIGNS_TA.indexOf(s),en=SIGNS_EN.findIndex(x=>x.toLowerCase()===s.toLowerCase());return ta>=0?ta:en;}
 function planetName(v){return ALIASES[String(v??'').trim()]||ALIASES[String(v??'').trim().toLowerCase()]||null;}
 function dignity(p){const n=p.key,s=p.sign;if(n==='Rahu'||n==='Ketu')return 'neutral';if(EXALTED[n]===s)return 'exalted';if(DEBILITATED[n]===s)return 'debilitated';if((OWNS[n]||[]).includes(s))return 'own';return 'neutral';}
 function toD1(chart){const source=chart?.chart&&chart.chart.lagna?chart.chart:chart;const lagna=signIndex(source?.lagna?.rasi??source?.lagna?.longitude);if(lagna<0)throw Error('D1 Lagna is required; no default sign.');const planets={};for(const p of source?.planets||[]){const key=planetName(p?.name||p?.planet);if(!key)continue;const sign=signIndex(p?.rasi??p?.longitude);if(sign<0)continue;planets[key]={key,sign,house:(sign-lagna+12)%12+1,retrograde:Boolean(p?.strength?.retrograde||p?.retrograde),combust:Boolean(p?.strength?.combustion),dignity:null};}
  if(Object.keys(TA).some(x=>!planets[x]))throw Error('Nine valid D1 planetary signs required.');const houses=Array.from({length:12},(_,i)=>({no:i+1,sign:(lagna+i)%12,lord:PN[(lagna+i)%12],occupants:[],aspects:[]}));for(const p of Object.values(planets)){p.dignity=dignity(p);houses[p.house-1].occupants.push(p.key);for(const step of DRISHTI[p.key]||[]){houses[(p.house+step-2)%12].aspects.push(p.key);}}for(const h of houses){h.aspects=[...new Set(h.aspects)];h.occupants=[...new Set(h.occupants)];}return {lagna,planets,houses};}
 function scorePlanet(d,p){if(!p)return 0;let n={exalted:3,own:2,neutral:0,debilitated:-3}[p.dignity]||0;if(p.combust&&p.key!=='Sun')n--;for(const k of d.houses[p.house-1].aspects){if(['Jupiter','Venus'].includes(k))n++;if(['Saturn','Mars'].includes(k))n--;}return Math.max(-4,Math.min(4,n));}
 function houseScore(d,h){let n=scorePlanet(d,d.planets[h.lord]);for(const k of h.occupants){if(['Jupiter','Venus','Mercury'].includes(k))n++;if(['Saturn','Mars','Rahu','Ketu'].includes(k))n--;}for(const k of h.aspects){if(['Jupiter','Venus'].includes(k))n++;if(['Saturn','Mars'].includes(k))n--;}return Math.max(-4,Math.min(4,n));}
 function links(d,focus,other){const f=d.houses[focus-1],o=d.houses[other-1],fp=d.planets[f.lord],op=d.planets[o.lord],out=[];if(fp.house===other)out.push('focus-lord-in-related');if(op.house===focus)out.push('related-lord-in-focus');if(fp.house===op.house&&f.lord!==o.lord)out.push('lords-conjunct');if(o.aspects.includes(f.lord))out.push('focus-lord-aspects-related');if(f.aspects.includes(o.lord))out.push('related-lord-aspects-focus');if(o.occupants.some(k=>f.occupants.includes(k)))out.push('common-occupant');if(fp.house===other&&op.house===focus)out.push('mutual-exchange');return [...new Set(out)];}
 function dominant(d,focus,other){const f=d.houses[focus-1],o=d.houses[other-1];const a=[f.lord,...f.occupants,...o.occupants,...o.aspects,o.lord];return [...new Set(a)].sort((x,y)=>Math.abs(scorePlanet(d,d.planets[y]))-Math.abs(scorePlanet(d,d.planets[x]))||a.indexOf(x)-a.indexOf(y))[0];}
 function lens(d,focus,related){const f=d.houses[focus-1],h=d.houses[related-1],rel=links(d,focus,related),p=dominant(d,focus,related);const score=houseScore(d,h)+Math.round(scorePlanet(d,d.planets[f.lord])/2);const relevance=(related===focus?7:0)+rel.length*3+(d.planets[f.lord].house===related?4:0)+(h.occupants.length?1:0)+(h.aspects.includes(f.lord)?2:0);return {focusHouse:focus,relatedHouse:related,focusLord:f.lord,focusLordHouse:d.planets[f.lord].house,relatedLord:h.lord,occupants:h.occupants,aspects:h.aspects,links:rel,planet:p,score,relevance};}
 // User-provided context only: geography must not be used to infer character, caste, income or status.
 function sanitizeContext(c){return {currentWork:String(c?.currentWork||'').trim().slice(0,120),maritalStatus:String(c?.maritalStatus||'').trim().slice(0,80),currentResidence:String(c?.currentResidence||'').trim().slice(0,120),birthPlace:String(c?.birthPlace||'').trim().slice(0,120)};}
 function situation(topic,ctx,ta){if(!ctx)return '';const t=String(ctx.currentWork||'').toLowerCase(),m=String(ctx.maritalStatus||'').toLowerCase();if(topic===10&&t){const student=/student|studying|படிப்பு|மாணவ|கல்வி/.test(t),retired=/retired|pension|ஓய்வு/.test(t),business=/business|self.employed|வியாபாரம்|தொழில்முனை/.test(t);return ta?(student?'நீங்கள் தற்போது படிப்பில் இருப்பதாகத் தெரிவித்துள்ளதால் இதை வேலை உயர்வாக அல்ல, கற்றல் மற்றும் பயிற்சித் திறனாகப் பார்க்க வேண்டும்.':retired?'நீங்கள் ஓய்வுபெற்றிருப்பதாகத் தெரிவித்துள்ளதால் புதிய பதவியை அல்ல, அனுபவப் பகிர்வையும் அன்றாட ஒழுங்கையும் மையமாக்க வேண்டும்.':business?'நீங்கள் சொந்தத் தொழில் செய்வதாகத் தெரிவித்துள்ளதால் இத்தொடர்பு வாடிக்கையாளர், முடிவு மற்றும் பொறுப்புப் பகிர்வில் பார்க்கப்படுகிறது.':'நீங்கள் தெரிவித்த தற்போதைய பணிச்சூழலுடன் இந்த இயல்பை ஒப்பிட்டுப் பார்ப்பது பொருத்தமானது.'):(student?'As you report studying, read this as learning and training, not a job promotion.':retired?'As you report retirement, apply this to mentoring and daily routines rather than new posts.':business?'As you report self-employment, apply this to clients, decisions and shared duties.':'Relate this tendency to the current work situation you described.');}
  if(topic===7&&m){const single=/unmarried|single|திருமணமாகவில்லை|மணமாகாத/.test(m);const married=/married|திருமணமான|திருமணம் ஆன/.test(m);if(single)return ta?'நீங்கள் திருமணமாகவில்லை என்று தெரிவித்துள்ளதால் இப்பலனை இப்போதுள்ள நெருங்கிய உறவுகளிலும் எதிர்காலத் துணைத் தேர்விலும் பொருத்திப் பார்க்கலாம்.':'As you report being unmarried, consider close relationships and future partner preferences, not an existing spouse.';if(married)return ta?'நீங்கள் திருமணமானவர் என்று தெரிவித்துள்ளதால் இப்பலன் நடைமுறையில் பொறுப்புகளைப் பகிர்வதிலும் கருத்துப் பரிமாற்றத்திலும் பார்க்கப்படுகிறது.':'As you report being married, interpret this through current communication and shared responsibilities.';}
  if(topic===4&&ctx.currentResidence&&ctx.birthPlace&&ctx.currentResidence.trim().toLowerCase()!==ctx.birthPlace.trim().toLowerCase())return ta?'தற்போதைய வசிப்பிடம் பிறப்பிடத்திலிருந்து வேறுபடுவதாக நீங்கள் தெரிவித்துள்ளீர்கள்; குடும்பத் தொடர்பு, பயணம் மற்றும் தனிப்பட்ட நேரத்தை அதன் நடைமுறைச் சூழலுடன் இணைத்துப் பார்க்கலாம்.':'You report living somewhere other than your birthplace; interpret home ties and travel within that practical setting.';return '';}
 function render(chart,lang='ta',context={}){const ta=lang!=='en',d=toD1(chart),ctx=sanitizeContext(context),topics=[];for(let i=0;i<12;i++){
  const focus=i+1,all=Array.from({length:12},(_,j)=>lens(d,focus,j+1)),primary=all[i],f=d.houses[i],lord=d.planets[f.lord],score=houseScore(d,f),traits=ta?TRAITS_TA:TRAITS_EN,base=ta?DOMAINS_TA:DOMAINS_EN,rows=[];
  const lead=score>=1?base[i][0]:score<=-2?base[i][1]:(ta?`${base[i][0]}; சூழல் கடினமாகும்போது ${base[i][1]}`:`${base[i][0]}; under strain, ${base[i][1]}`);
  const active=[...f.occupants,...f.aspects, f.lord];const character=active.sort((a,b)=>Math.abs(scorePlanet(d,d.planets[b]))-Math.abs(scorePlanet(d,d.planets[a])))[0]||f.lord;
  const effect=scorePlanet(d,d.planets[character])>=0?traits[character][0]:traits[character][1];
  rows.push({house:focus,text:ta?`${lead} என்பது இவ்வமைப்பில் காணக்கூடிய ஒரு போக்காகும். அதனுடன் ${effect} இணைவதால் இது அன்றாட நடவடிக்கைகளிலும் வெளிப்படலாம்.`:`The chart emphasizes ${lead}. ${effect} is a related tendency in everyday choices.`,evidence:primary});
  const notable=all.filter(x=>x.relatedHouse!==focus&&x.relevance>=3).sort((a,b)=>b.relevance-a.relevance||Math.abs(b.score)-Math.abs(a.score)||a.relatedHouse-b.relatedHouse).slice(0,3);
  for(const row of notable){const rel=row.relatedHouse,theme=(ta?CROSS_TA:CROSS_EN)[rel-1],mode=row.score>=2?'positive':row.score<=-2?'challenging':'mixed',behavior=(ta?DOMAINS_TA:DOMAINS_EN)[i][mode==='challenging'?1:0],detail=traits[row.planet][row.score<0?1:0];
   const lived=(ta?ROUTES_TA:ROUTES_EN)[i][rel-1].replace(/[.]$/,'');
   const line=ta?(mode==='positive'?`${lived}; இந்தப் பலனில் ${detail} என்ற கிரகச் சார்பான இயல்பு கூடுதலாக வலுப்பெறலாம்.`:
      mode==='challenging'?`${lived}; ஆனால் ${detail} என்ற எதிர்வினை இவ்விரு வாழ்க்கைத் துறைகளையும் ஒருசேரச் சிரமப்படுத்தலாம்.`:
      `${lived}; அதனுடன் ${detail} என்ற அணுகுமுறை கலந்து வரக்கூடும்.`):
      (mode==='positive'?`${lived}; the associated planetary tendency is ${detail}.`:
       mode==='challenging'?`${lived}; however, ${detail} can complicate the interaction between these domains.`:
       `${lived}; a related tendency is ${detail}.`);
   rows.push({house:rel,text:line,evidence:row});
  }
  const practical=situation(focus,ctx,ta);if(practical)rows.push({house:focus,text:practical,evidence:{context:'user-provided',focusHouse:focus}});
  topics.push({number:focus,title:THEMES[i][ta?0:1],analyzedHouses:12,paragraphs:rows,evidenceMatrix:all});
 }
 return {lang:ta?'ta':'en',lagnaSign:d.lagna,topics,source:'D1-only',method:'Whole-sign Parashari drishti; selective evidence narrative',planetarySigns:Object.fromEntries(Object.values(d.planets).map(p=>[p.key,p.sign]))};}
 function html(chart,lang='ta',context={}){const rep=render(chart,lang,context),ta=rep.lang==='ta',content=rep.topics.map(t=>`<section class="smv-d1-life-topic" data-d1-topic="${t.number}"><h3>${t.number}. ${esc(t.title)}</h3>${t.paragraphs.map(p=>`<p class="smv-d1-life-paragraph" data-d1-related-house="${p.house}">${esc(p.text)}</p>`).join('')}</section>`).join('');return `<section class="smv-d1-life-reading" data-smv-d1-life="1" lang="${rep.lang}"><h2>${ta?'I. ஜாதகரின் முழு வாழ்க்கை பலன்கள்':'I. Complete Life Predictions of the Native'}</h2><p class="smv-d1-life-method">${ta?'ஒவ்வொரு தலைப்பிற்கும் 12 பாவங்களும் ஆய்வு செய்யப்பட்டு தொடர்புள்ள பலன்கள் மட்டும் தொகுக்கப்பட்டுள்ளன.':'All twelve houses are examined for every topic; only relevant connections are narrated.'}</p>${content}</section>`;}
 return Object.freeze({render,html,toD1,houseScore,scorePlanet,links,lens,sanitizeContext,THEMES,DRISHTI,version:'269-d1-evidence-synthesis'});
});
