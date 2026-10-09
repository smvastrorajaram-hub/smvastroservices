/* SMV ASTRO V265 — D1-only, twelve-lens life reading.
   Independent of the removed 'Integrated Predictions / Section X'.
   All twelve houses are evaluated separately for each of twelve life topics.
   No D7/D9/D10, dasha, transit, remote requests, UI overrides or randomness.
   Interpretations reflect a traditional belief system, not established facts.
 */
(function(root, factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  if(root)root.SMVLifePredictionD1=api;
})(typeof window!=='undefined'?window:globalThis,function(){'use strict';
 const SIGNS_TA=['மேஷம்','ரிஷபம்','மிதுனம்','கடகம்','சிம்மம்','கன்னி','துலாம்','விருச்சிகம்','தனுசு','மகரம்','கும்பம்','மீனம்'];
 const SIGNS_EN=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
 const PN=['Mars','Venus','Mercury','Moon','Sun','Mercury','Venus','Mars','Jupiter','Saturn','Saturn','Jupiter'];
 const TNP={Sun:'சூரியன்',Moon:'சந்திரன்',Mars:'செவ்வாய்',Mercury:'புதன்',Jupiter:'குரு',Venus:'சுக்கிரன்',Saturn:'சனி',Rahu:'ராகு',Ketu:'கேது'};
 const ALIASES={};
 for(const [en,ta] of Object.entries(TNP)){ALIASES[en.toLowerCase()]=en;ALIASES[ta]=en;}
 Object.assign(ALIASES,{'surya':'Sun','chandra':'Moon','kuja':'Mars','mangal':'Mars','budha':'Mercury','guru':'Jupiter','brihaspati':'Jupiter','shukra':'Venus','sukra':'Venus','shani':'Saturn','sani':'Saturn','rahu':'Rahu','ketu':'Ketu'});
 const EXALTED={Sun:0,Moon:1,Mars:9,Mercury:5,Jupiter:3,Venus:11,Saturn:6};
 const DEBILITATED={Sun:6,Moon:7,Mars:3,Mercury:11,Jupiter:9,Venus:5,Saturn:0};
 const OWNS={Sun:[4],Moon:[3],Mars:[0,7],Mercury:[2,5],Jupiter:[8,11],Venus:[1,6],Saturn:[9,10]};
 // Classical graha drishti: all seven planets 7th; Mars 4th/8th, Jupiter 5th/9th, Saturn 3rd/10th.
 // Rahu/Ketu special aspects vary by tradition and are intentionally not inferred.
 const DRISHTI={Sun:[7],Moon:[7],Mars:[4,7,8],Mercury:[7],Jupiter:[5,7,9],Venus:[7],Saturn:[3,7,10]};
 const THEMES=[
  ['ஜாதகரின் முழு வாழ்க்கை முறைகள்','The native’s overall way of life'],
  ['குடும்பம், பேச்சு, சேமிப்பு மற்றும் பொருளாதார அணுகுமுறை','Family, speech, savings and financial habits'],
  ['முயற்சி, துணிவு, திறமை மற்றும் சகோதர உறவுகள்','Initiative, courage, skills and siblings'],
  ['வீடு, தாயார், மனநிம்மதி மற்றும் சொத்து','Home, mother, peace of mind and property'],
  ['அறிவுத்திறன், கல்வி, சிந்தனை மற்றும் குழந்தைகள்','Learning, intelligence, creativity and children'],
  ['அன்றாட வேலை, போட்டி, கடன் மற்றும் உடல்நல ஒழுங்கு','Work routines, obstacles, debts and wellbeing'],
  ['திருமண வாழ்க்கை, துணைவர் மற்றும் கூட்டுறவு','Partnership, marriage and working with others'],
  ['திடீர் மாற்றங்கள், மறைமுக விஷயங்கள் மற்றும் சவால்','Change, resilience and hidden concerns'],
  ['தந்தை, வழிகாட்டுதல், நம்பிக்கை மற்றும் தர்மம்','Father, mentors, beliefs and ethics'],
  ['தொழில், பொறுப்பு, அதிகாரம் மற்றும் சமூக நிலை','Career, responsibility, leadership and standing'],
  ['வருமானம், ஆதாயங்கள், நண்பர்கள் மற்றும் இலக்குகள்','Income, networks, gains and aspirations'],
  ['செலவுகள், ஓய்வு, தனிமை மற்றும் உள்மன வாழ்க்கை','Spending, rest, solitude and inner life']
 ];
 // Every row reads ONE topic from the viewpoint of every D1 house. Sentences are
 // intentionally about observable lived experience, not coordinates of planets.
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
 const PLANET_HOUSE_TA={
  Sun:[
   'தன் முடிவைத் தானே எடுக்க வேண்டும் என்ற எண்ணம் தென்படலாம்.','பேச்சில் தன்னம்பிக்கை இருக்கும்; குடும்பத்தில் மரியாதையை எதிர்பார்க்கலாம்.','ஒரு முயற்சிக்குத் தலைமை எடுக்க விரும்பலாம்.','வீட்டுப் பொறுப்பில் தன் கருத்துக்கு மதிப்புக் கிடைக்க வேண்டும் என்பார்.','கற்றதைக் கௌரவமாக எடுத்துரைக்கும் விருப்பம் இருக்கலாம்.','சிக்கலில் தன்னுடைய திறனை நிரூபிக்க முயல்வார்.','உறவுகளில் தன்னை மதிக்க வேண்டும் என்ற எதிர்பார்ப்பு இருக்கும்.','எதிர்பாராத இழப்பில் தன்மானம் பாதிக்கப்பட்டது போல் உணரலாம்.','கொள்கை பற்றிய உறுதியான கருத்துகளை வெளிப்படுத்தலாம்.','பணியில் முடிவெடுக்கும் அதிகாரத்தை நாடலாம்.','முன்னேற்றத்தில் தன் முயற்சிக்கு அங்கீகாரம் தேடுவார்.','தனியாக இருந்தாலும் தன்னுடைய எதிர்கால நிலையைப் பற்றி சிந்திக்கலாம்.'
  ],
  Moon:[
   'பிறரின் உணர்வுகளை விரைவாகக் கவனிக்கும் இயல்பு இருக்கலாம்.','குடும்பத்தின் பேச்சு மனதை எளிதில் பாதிக்கக்கூடும்.','மனநிலைக்கேற்ப முயற்சியின் வேகம் மாறலாம்.','வீட்டில் பாசமும் மனநிம்மதியும் மிக முக்கியமாகத் தோன்றலாம்.','குழந்தைகள் மற்றும் கற்றலில் மனப்பூர்வ ஈடுபாடு காணலாம்.','பணி நெருக்கடி மனத்தில் நீண்ட நேரம் தங்கக்கூடும்.','துணையின் உணர்ச்சியைப் புரிந்துகொள்ள முயல்வார்.','திடீர் மாற்றம் முதலில் மனக்குழப்பம் தரலாம்.','குடும்ப மரபுடன் உணர்ச்சிசார்ந்த பிணைப்பு இருக்கலாம்.','வேலையில் பாராட்டும் அன்பான அணுகுமுறையும் ஊக்கம் தரலாம்.','நண்பர்கள் தரும் உணர்ச்சிபூர்வ ஆதரவை விரும்பலாம்.','ஓய்வில்லாத சூழலில் உணர்ச்சி சோர்வு ஏற்படலாம்.'
  ],
  Mars:[
   'வேகமாகச் செயல்பட்டு முடிவைக் காண விரும்பலாம்.','வார்த்தைகளில் நேரடித்தன்மை அதிகரித்து உரசல் வரலாம்.','சுயமுயற்சி, துணிவு, செயல்திறன் அதிகமாகத் தெரியலாம்.','வீட்டில் பழுதுகளைத் தானே சரிசெய்ய முன்வரலாம்.','போட்டியுடன் கற்றுக்கொள்வதும் வாதிட்டு விளக்குவதும் பிடிக்கலாம்.','எதிர்ப்பு வந்தால் உடனடியாகத் தீர்வு நோக்கி ஓடலாம்.','கருத்து வேறுபாட்டில் ஒருவருக்கொருவர் இடம் தர வேண்டியிருக்கும்.','சவாலை எதிர்கொள்ளும் துணிவுடன் பாதுகாப்பையும் கவனிக்க வேண்டும்.','கொள்கைக்காகத் தீவிரமாக வாதிடும் போக்கு இருக்கலாம்.','புதிய பணி அல்லது திட்டத்தை விரைவாகத் தொடங்குவார்.','ஆதாயம் பெறுவதில் வேகமும் போட்டி உணர்வும் இருக்கலாம்.','ஓய்விலும் அடுத்த செய்ய வேண்டிய வேலையை நினைக்கலாம்.'
  ],
  Mercury:[
   'ஒரு செய்தியின் பின்னணி என்ன என்பதை ஆராய்ந்து பிறகு பேசலாம்.','பணக் கணக்கும் வார்த்தைகளின் பொருளும் சரியாக இருக்க வேண்டும் என்பார்.','எழுத்து, தகவல் பரிமாற்றம் அல்லது தொழில்நுட்பத்தில் திறன் வெளிப்படலாம்.','வீட்டின் விஷயங்களைத் திட்டமிட்டு விவாதிக்க விரும்புவார்.','கேள்வி கேட்டு ஆராய்வதில் ஆர்வம் அதிகமாக இருக்கலாம்.','பிரச்சினையைத் துண்டுகளாகப் பிரித்து தீர்வு காண்பார்.','துணையுடன் பேசித் தெளிவுபடுத்திக் கொள்வதை விரும்புவார்.','மறைந்திருக்கும் காரணத்தைத் தேடிக் கேள்விகள் கேட்பார்.','மரபுக்குப் பின்னுள்ள கருத்தை அறிந்துகொள்ள விரும்புவார்.','பணியில் கணக்கு, தகவல், திட்டமிடல் வழி நன்மை காணலாம்.','திறன்களை அறிமுகங்கள் வழி பரிமாறிக் கொள்ள விரும்புவார்.','தனிமையில் படித்தோ திட்டமிட்டோ நேரம் செலவிடலாம்.'
  ],
  Jupiter:[
   'நியாயத்தைப் புரிந்து கொண்டு பிறருக்கும் விளக்க விரும்பலாம்.','குடும்ப முடிவுகளில் நீண்டகால நன்மையை வலியுறுத்தலாம்.','முயற்சிக்கான காரணத்தைத் தெளிவாகப் புரிந்துகொள்ள விரும்புவார்.','வீட்டில் பெரியவரின் ஆலோசனையை இணைத்து முடிவெடுக்கலாம்.','கற்றதை மற்றவர்களுக்குக் கற்றுக்கொடுக்கும் விருப்பம் இருக்கும்.','சிரமத்தைச் சரிசெய்யும் போது மற்றவருக்கும் உதவலாம்.','உறவில் நம்பிக்கையையும் நேர்மையையும் வலியுறுத்தலாம்.','மாற்றத்திலிருந்து அர்த்தமுள்ள பாடம் எடுத்துக்கொள்வார்.','ஆசிரியர், அறநெறி, அறிவு மீது மதிப்பு அதிகமாகலாம்.','பணியில் வழிகாட்டும் பொறுப்பு பிடிக்கலாம்.','உதவிக்குரிய நண்பர்களைத் தேர்ந்தெடுப்பார்.','தனியாகச் சிந்தித்து கருத்துகளை ஒழுங்குபடுத்த விரும்பலாம்.'
  ],
  Venus:[
   'சூழலைச் சுமுகமாக வைத்துக்கொண்டு தன் கருத்தைச் சொல்ல விரும்பலாம்.','குடும்பத்தில் இனிய பேச்சையும் பொருத்தமான வசதிகளையும் விரும்புவார்.','கலை, தொடர்பாடல் அல்லது கூட்டு முயற்சியில் ஆர்வம் வரலாம்.','வீட்டின் அமைப்பிலும் வசதிகளிலும் அழகியலைக் கவனிக்கலாம்.','கலை நயம், ரசனை, படைப்பாற்றல் வெளிப்படலாம்.','வேலையில் ஒத்துழைப்புடன் பிரச்சினையைத் தீர்க்க முயல்வார்.','உறவில் அன்பையும் சமரசத்தையும் எதிர்பார்ப்பார்.','சிக்கலான சூழலிலும் உறவைப் பாதுகாக்க விரும்பலாம்.','மரபின் கலை, இசை அல்லது பண்பாட்டில் ஈடுபாடு இருக்கலாம்.','வாடிக்கையாளர் தொடர்பிலும் சமரசப் பேச்சிலும் திறன் காட்டலாம்.','நண்பர்கள் வழி ஒத்துழைப்பு மற்றும் வசதி கிடைக்கலாம்.','தனிப்பட்ட வசதிக்கும் மகிழ்ச்சிக்குமான நேரம் தேவைப்படலாம்.'
  ],
  Saturn:[
   'வெளியில் அமைதியாக இருந்தாலும் பொறுப்பு பற்றிய சிந்தனை ஆழமாக இருக்கலாம்.','குடும்பப் பணத்தில் கவனமும் செலவில் கட்டுப்பாடும் விரும்பலாம்.','முயற்சியில் தொடர் உழைப்பு இருக்கும்; ஆரம்பத்தில் தயக்கம் காணலாம்.','வீட்டில் நிலைத்தன்மையையும் தெளிவான ஒழுங்கையும் எதிர்பார்ப்பார்.','புதிய பாடத்தைப் புரிந்துகொள்ள நேரம் எடுத்தாலும் தொடர்ந்து பயிற்சி செய்வார்.','கடமை உணர்வால் கடினமான வேலையையும் விட்டுவிடாமல் செய்வார்.','நெருங்கிய உறவில் நம்பிக்கை உருவாக நேரம் எடுக்கும்.','சவால்களை அமைதியாகச் சந்தித்தாலும் மனச்சுமையை வெளிப்படுத்தாமல் இருக்கலாம்.','மரபை மதித்தாலும் நடைமுறைக்கு உகந்ததா என்று கவனிப்பார்.','பணியில் பொறுப்பு மற்றும் காலக்கெடு மீது கவனம் அதிகமாகலாம்.','நீண்டகால முயற்சியால் வருமான நிலையை அமைத்துக்கொள்ள நினைப்பார்.','தனிமையில் கவலை அதிகரிக்காதபடி ஓய்வுக்கான ஒழுங்கு தேவை.'
  ],
  Rahu:[
   'வழக்கத்திற்கு மாறான கருத்தைச் சோதித்து பார்க்க விருப்பம் ஏற்படலாம்.','குடும்ப நடைமுறையிலிருந்து வேறுபட்ட நிதித் திட்டம் தோன்றலாம்.','புதுமையான தொழில்நுட்பம் மற்றும் முயற்சியில் ஆர்வம் இருக்கலாம்.','வீட்டிலோ வாழும் இடத்திலோ புதிய வசதி தேடலாம்.','வித்தியாசமான அறிவுத் துறைகளை ஆராய விரும்பலாம்.','கடினமான பிரச்சினையில் பழைய முறையல்லாத தீர்வைக் காணலாம்.','உறவுகளில் ஒருவருடைய எதிர்பார்ப்பு மற்றவருக்கு புதிதாகத் தோன்றலாம்.','எதிர்பாராத மாற்றத்தை ஆர்வத்துடனும் குழப்பத்துடனும் அணுகலாம்.','மரபுகளைத் தன் அனுபவத்தால் சோதித்து பார்க்கலாம்.','புதிய வேலைமுறை அல்லது புதுத் துறை மீது ஆர்வம் அதிகரிக்கலாம்.','பெரிய தொடர்பு வட்டத்தின் மூலம் வாய்ப்புகள் கிடைக்கலாம்.','இரவு நேரம் அல்லது தனிப்பட்ட நேரத்தில் கூடுதல் திட்டமிடல் இருக்கலாம்.'
  ],
  Ketu:[
   'கூட்டத்தில் இருந்தாலும் தனிப்பட்ட எண்ணத்தைப் பாதுகாக்கலாம்.','குடும்ப மரபின் சில பகுதிகளிலிருந்து மனதளவில் விலக விரும்பலாம்.','தனித்து பயிற்சி செய்து திறமையை வளர்க்கும் பழக்கம் இருக்கலாம்.','வீட்டில் அமைதியான இடத்தை அதிகம் விரும்பலாம்.','ஒரு குறிப்பிட்ட அறிவுத் துறையை ஆழமாகத் தெரிந்துகொள்ளலாம்.','ஒரு பிரச்சினையின் தேவையற்ற பகுதிகளை நீக்கிச் சுருக்க முயல்வார்.','உறவில் அவ்வப்போது தனிப்பட்ட இடம் வேண்டுமென்று நினைக்கலாம்.','மறைந்திருக்கும் தகவலை ஆராய்வதில் ஆர்வம் காணலாம்.','சடங்குகளைவிட அவற்றின் பொருளை அறிய விரும்பலாம்.','பணியில் சுயாதீனத் திறமையை வளர்த்துக்கொள்ள விரும்பலாம்.','பெரிய நட்பு வட்டத்தைவிட சில நெருங்கியவர்களை விரும்பலாம்.','தனிமையும் அமைதியான சிந்தனையும் மனநிறைவு தரலாம்.'
  ]
 };
 const PLANET_HOUSE_EN={
  Sun:['They may want ownership of decisions.','Respect in family conversations may matter.','They may prefer to lead a project.','Having a say at home can be important.','They may take pride in explaining knowledge.','They may seek to prove competence when challenged.','Mutual respect may be central to partnership.','Surprises may feel like a personal loss of control.','They may be firm about principles.','They may seek a role with authority.','They may want recognition for effort.','Quiet time can still revolve around future ambitions.'],
  Moon:['They may register the feelings of others quickly.','Family words may leave a lasting impression.','Motivation may vary with mood.','Warmth and safety at home may matter greatly.','They may be emotionally invested in education and children.','Work stress may linger after working hours.','They may work to understand a partner’s feelings.','Sudden changes can initially unsettle them.','Family traditions may carry emotional meaning.','Kind feedback at work may motivate them.','Emotional support from friends may be valued.','Recovery may require more rest after a busy day.'],
  Mars:['They may prefer immediate action.','Speech may become direct enough to cause friction.','Courage and independent effort can become visible.','They may volunteer for practical repairs.','Debate and competition can motivate learning.','They may move quickly to resolve opposition.','Disagreements call for space for both sides.','Courage needs to be paired with risk awareness.','They may defend their principles intensely.','They may start new work quickly.','They may pursue gains energetically.','Even during rest they may plan the next task.'],
  Mercury:['They may examine the reasoning behind news.','Precise wording and accounts may matter.','Writing, technology or communication skills may stand out.','They may plan family discussions carefully.','Questions and research may feel natural.','They may break problems into manageable pieces.','Dialogue can clarify partnership issues.','They may seek the cause of hidden problems.','They may ask what a tradition really means.','Data and planning can serve their work.','They may exchange ideas through networks.','Quiet time may be used for reading and planning.'],
  Jupiter:['They may want to explain what seems fair.','They may emphasize long-term family interests.','They may ask for the purpose behind an effort.','They may consider elder advice at home.','Teaching others may be rewarding.','They may help others solve problems.','Trust and fairness may be essential in partnership.','They may find lessons in change.','Guides and ethical principles can matter.','A mentoring role may appeal at work.','They may choose helpful, dependable friends.','Private reflection can bring clarity.'],
  Venus:['They may prefer a conciliatory approach.','Gentle speech and comfort can matter at home.','Creative or joint projects may appeal.','A pleasant home environment may matter.','Taste and imagination may be prominent.','They may favor cooperation in work problems.','Affection and compromise may be sought in love.','They may try to preserve bonds through change.','Art and cultural traditions may interest them.','Negotiation and client rapport can help.','Cooperation may bring gains through friends.','Personal enjoyment deserves protected time.'],
  Saturn:['They may quietly carry a strong sense of duty.','Careful family budgeting may be preferred.','They may build skills through steady effort.','Order and stability at home can matter.','A subject may be learned through persistence.','They may keep working on difficult tasks.','Trust may take time to establish.','They may hold worries quietly.','They may test traditions for practicality.','Deadlines and duty can guide professional life.','Gradual gains can be more attractive than shortcuts.','Solitude needs to include real rest.'],
  Rahu:['Unconventional ideas may appeal.','They may consider a different way of organizing family finances.','New technologies may attract effort.','Novel living arrangements may interest them.','They may explore unusual fields of knowledge.','They may seek unconventional solutions.','Different expectations may need negotiating in relationships.','Unexpected changes may spark both interest and unease.','They may test tradition against experience.','A new industry or way of working may appeal.','Larger networks may lead to introductions.','Private time may become another planning session.'],
  Ketu:['They may protect an independent inner outlook.','They may question some inherited family customs.','Self-directed practice may suit learning.','They may need quiet space at home.','They may investigate one topic deeply.','They may strip unnecessary steps from a task.','Some personal space may be important in relationships.','They may examine hidden information carefully.','Meaning may matter more to them than ritual.','Specialist independent work may appeal.','A few close friends may feel preferable.','Quiet reflection can be restorative.']
 };
 const LAGNA_BEHAVIOR_TA=[
  'புதிய விஷயத்தைப் பார்த்ததும் அதில் தானே முயன்று பார்க்கும் துணிவு இருக்கும்; சற்று நிதானமாக நடந்தால் உற்சாகம் நல்ல முடிவைத் தரலாம்.',
  'வெளியில் அவசரப்படாமல் உறுதியாகச் செயல்பட விரும்புவார்; ஒருமுறை எடுத்த முடிவை மாற்றுவதற்கு வலுவான காரணம் தேவைப்படலாம்.',
  'ஒரே விஷயத்தைப் பல கோணத்தில் பேசவும் கற்றுக்கொள்ளவும் விரும்புவார்; ஒரே நேரத்தில் பல எண்ணங்கள் ஓடுவதால் கவனம் சிதறலாம்.',
  'நெருங்கியவர்களின் மனநிலையைச் சீக்கிரம் உணரலாம்; பாசம் அதிகமானபோது அவர்களுடைய பிரச்சினையையும் தன்னுடையதாக எடுத்துக்கொள்ளலாம்.',
  'செய்யும் காரியத்தில் தனக்குரிய பங்களிப்பு தெரிய வேண்டும் என்று நினைப்பார்; மரியாதை குறைவாகத் தோன்றினால் மனதில் வைத்துக்கொள்ளலாம்.',
  'ஒரு விஷயம் சரியாக இருக்கிறதா என்று சிறிய விவரங்களைக் கூடச் சரிபார்ப்பார்; குறைகளைச் சரிசெய்யும் ஆர்வம் சில நேரம் அதிகச் சிந்தனையாக மாறலாம்.',
  'மற்றவர் கருத்தைக் கேட்டுத் தீர்மானிக்க விரும்புவார்; அனைவரையும் திருப்திப்படுத்த முயல்வதால் சொந்த முடிவு தாமதமாகலாம்.',
  'எளிதில் எல்லோரிடமும் தன்னை வெளிப்படுத்தாமல் சூழ்நிலையை ஆராய்ந்து பழகுவார்; நம்பிக்கை வந்த பிறகு உறுதியாக நிற்பார்.',
  'ஒரு விஷயம் ஏன் நடக்கிறது என்பதை அறிந்த பிறகே முழுமையாக ஈடுபட விரும்புவார்; புதிய அனுபவங்களைத் தேடும் ஆர்வமும் இருக்கும்.',
  'கடமையை முடிக்காமல் அமைதியாக இருப்பது சிரமமாக இருக்கலாம்; திட்டமிட்டு மெதுவாகவேனும் முன்னேறும் பழக்கம் தென்படலாம்.',
  'மற்றவர்கள் பின்பற்றும் முறையையே பயன்படுத்தாமல் தனக்கென ஒரு வழியைத் தேடக்கூடும்; சுதந்திரமும் தனிப்பட்ட கருத்தும் முக்கியமாகலாம்.',
  'பிறர் சிரமத்தைப் புரிந்துகொண்டு உதவ விரும்புவார்; மனதில் பல விஷயங்களை வைத்துச் சிந்திப்பதால் தனக்கான ஓய்வை மறந்துவிடலாம்.'
 ];
 const LAGNA_BEHAVIOR_EN=[
  'A new challenge may invite immediate action; slowing slightly can make that initiative effective.',
  'A steady deliberate approach may be preferred; changing a firm decision may require good reasons.',
  'They may enjoy exploring several viewpoints and ideas, while needing to guard against scattered attention.',
  'They may notice loved ones’ feelings quickly and sometimes carry concerns that are not their own.',
  'Recognition for a genuine contribution may matter, while perceived disrespect can linger.',
  'They may inspect fine details and want to fix errors, sometimes thinking longer than necessary.',
  'They may invite other people’s views before deciding, occasionally delaying their own choice.',
  'They may observe before revealing much; trust may lead to strong loyalty.',
  'Understanding why something works may matter before full commitment, alongside interest in new experience.',
  'Duty and steady planning may come naturally, even when progress is gradual.',
  'They may look for an independent method instead of repeating an established one.',
  'They may readily understand others’ difficulties, while needing to guard time for themselves.'
 ];
 const STRONG_FOCUS_TA=[
  'தன்னுடைய உள்ளார்ந்த உறுதியை அதிக ஆரவாரமின்றி செயல்களில் காட்டும் வாய்ப்பு இருக்கலாம்.',
  'குடும்பத் தேவைகளுக்கான திட்டத்தைத் தொடர்ந்து செயல்படுத்தக்கூடிய ஒழுங்கு இருக்கும்.',
  'சிறிய முயற்சியில் கிடைத்த அனுபவத்தை அடுத்த பெரிய முயற்சிக்கு அடிப்படையாக மாற்றலாம்.',
  'வீட்டின் நிலைத்தன்மைக்காக நீண்டகால முடிவுகளைச் சிந்திக்கலாம்.',
  'கற்றதைத் தன்னுடைய அனுபவத்துடன் இணைத்து தெளிவாகப் புரிந்துகொள்ள முடியும்.',
  'நாள்தோறும் வரும் வேலைப் பிரச்சினைகளை ஒரே நேரத்தில் அல்லாமல் ஒழுங்காகத் தீர்க்கலாம்.',
  'உறவுகளில் இருவருக்கும் தேவையான இடத்தை வழங்குவதால் புரிதல் வளரும்.',
  'எதிர்பாராத மாற்றத்தையும் கற்ற அனுபவமாக மாற்றும் திறன் வளரக்கூடும்.',
  'தனது நம்பிக்கையின் காரணத்தை தெளிவாக விளக்கி நடக்கலாம்.',
  'திறமையும் பொறுப்பும் இணைந்தால் பணியில் நம்பிக்கையை உருவாக்க முடியும்.',
  'தொடர்ந்து பராமரிக்கும் நல்ல தொடர்புகள் நீண்டகால இலக்குகளுக்கு உதவலாம்.',
  'தனக்குத் தேவையான ஓய்வைத் திட்டமிட்டு மனதைச் சீராக வைத்துக்கொள்ளலாம்.'
 ];
 const WEAK_FOCUS_TA=[
  'தன்னை மற்றவர்களுடன் ஒப்பிடும்போது தயக்கம் வரலாம்; முயற்சியால் நம்பிக்கையை வளர்த்துக் கொள்ள வேண்டும்.',
  'பணம் அல்லது குடும்ப எதிர்பார்ப்புகளில் தெளிவில்லாத முடிவுகள் வந்தால் மீண்டும் திட்டமிட வேண்டியிருக்கும்.',
  'ஒரு முயற்சியைத் தொடங்கிய வேகத்தில் முடிக்க ஒழுங்கான பயிற்சி தேவைப்படலாம்.',
  'வீட்டின் தேவைக்கும் தனிப்பட்ட விருப்பத்துக்கும் இடையே சமநிலை தேட வேண்டியிருக்கலாம்.',
  'கற்றதைப் பயன்படுத்தும் வரை தனக்குத் தெரியவில்லை என்று எண்ணலாம்; பயிற்சி திறனை வெளிப்படுத்தும்.',
  'சில சிக்கல்களை தானே சுமக்காமல் உதவி கேட்கக் கற்றுக்கொள்வது நல்லது.',
  'நெருங்கியவர்களின் அமைதியையும் எதிர்ப்பாக எடுத்துக்கொள்ளாமல் விளக்கிக் கேட்பது உதவும்.',
  'பழைய ஏமாற்றங்களைத் திரும்ப நினைப்பதைவிட இப்போது மாற்றக்கூடியவற்றில் கவனம் தரலாம்.',
  'பெரியோரின் கருத்தையும் சொந்த அனுபவத்தையும் ஒரே நேரத்தில் சமாளிக்கப் பொறுமை தேவை.',
  'வேலையில் பிறர் தரும் அங்கீகாரத்தை மட்டுமே நம்பாமல் தன் திறனைத் தொடர்ந்து வளர்க்க வேண்டும்.',
  'நண்பர்களின் எதிர்பார்ப்பு மற்றும் தன்னுடைய இலக்கு ஒரே மாதிரி இல்லாவிட்டால் எல்லை அமைப்பது நல்லது.',
  'அதிகச் சிந்தனை மன ஓய்வைத் தடுக்கும்போது அன்றாட ஒழுங்கை மாற்றுவது உதவும்.'
 ];
 const STRONG_FOCUS_EN=[
  'Inner confidence may show through action rather than display.',
  'Planning for household needs may become a sustained habit.',
  'Experience from small attempts may support larger initiatives.',
  'Long-term stability may guide household choices.',
  'They may connect learning with experience clearly.',
  'Routine problems may be resolved methodically.',
  'Allowing space for both partners can strengthen understanding.',
  'They may turn unexpected change into useful experience.',
  'They may be able to explain the reasons for a chosen belief.',
  'Skill and responsibility may help build professional trust.',
  'Maintained relationships may support long-term goals.',
  'Planned rest can help keep their thoughts balanced.'
 ];
 const WEAK_FOCUS_EN=[
  'Comparing themselves to others may cause hesitation that practice can address.',
  'Unclear financial or family expectations may require revisiting plans.',
  'Finishing a task may take more routine than starting it.',
  'Home demands and personal needs may require a conscious balance.',
  'Practice may be needed before knowledge feels usable.',
  'Asking for help can be wiser than carrying every problem alone.',
  'A partner’s silence need not be read as rejection.',
  'Current choices deserve more attention than repeated old regrets.',
  'Patience may be needed when elder advice differs from experience.',
  'Developing skill may matter more than waiting for recognition.',
  'Boundaries can protect goals when friendship expectations differ.',
  'Changes in daily routine may ease excessive rumination.'
 ];
 const POS_REL_TA=[
  'தன் விருப்பத்தை மற்றவர்களுக்கு விளக்கி அமைதியாகச் செயல்படுவது இங்கு இவருக்கு உதவலாம்.',
  'செலவு, பேச்சு, குடும்பப் பொறுப்பு ஆகியவற்றில் முன்கூட்டித் திட்டமிடும் பழக்கம் நன்மை தரலாம்.',
  'சிறு முயற்சியைக் கூடத் தொடர்ந்து செய்தால் சுயநம்பிக்கை வலுப்படும்.',
  'வீட்டில் அமைதியான உரையாடலுக்கும் தனிப்பட்ட இடத்திற்கும் முக்கியத்துவம் தரலாம்.',
  'தொடர்ந்து கற்றுக்கொள்வதும் அறிவைப் பகிர்வதும் இந்தத் திறனை வளர்க்கலாம்.',
  'சிக்கலைப் பிரித்துப் பார்த்து முடிப்பதால் தேவையற்ற குழப்பம் குறையலாம்.',
  'இருவரும் கேட்டு பேசும் பழக்கம் நெருக்கமான உறவைப் பாதுகாக்கலாம்.',
  'மாற்றத்திற்கான மாற்றுத் திட்டம் இருப்பதால் நிதானமாகச் செயல்பட முடியும்.',
  'ஆழமாகக் கற்றவற்றை வாழ்க்கை முடிவுகளில் பயனுள்ளதாகப் பயன்படுத்தலாம்.',
  'பொறுப்புகளை ஒழுங்காகப் பகிர்ந்து செய்தால் வேலைத் தரம் மேம்படலாம்.',
  'நம்பிக்கையான தொடர்புகளைக் கொண்டு நீண்டகால இலக்குகளை முன்னெடுக்கலாம்.',
  'ஓய்வுக்கும் வேலைக்கும் தெளிவான எல்லை வைத்தால் அமைதி கிடைக்கலாம்.'
 ];
 const NEG_REL_TA=[
  'தன் கருத்தில் உறுதி அதிகரிக்கும்போது பிறர் நிலையை அறிந்துகொள்வதும் தேவைப்படும்.',
  'ஒரு சொல் அல்லது செலவு பற்றிய தவறான புரிதல் நீளாமல் ஆரம்பத்திலேயே விளக்குவது நல்லது.',
  'வேகம் அதிகரித்தாலும் செய்யவேண்டியவற்றை வரிசைப்படுத்தாததால் முயற்சி சிதறக்கூடும்.',
  'வீட்டின் அமைதியைப் பாதுகாக்க வேலைக்கான கவலைகளைச் சற்று ஒதுக்க வேண்டியிருக்கலாம்.',
  'மிகவும் ஆராய்ந்து கொண்டே இருந்தால் வாய்ப்பு தாமதிக்கலாம்; தேவையான அளவில் முடிவெடுக்க வேண்டும்.',
  'மற்றவர் செய்யவேண்டிய கடமையையும் தானே ஏற்றுக்கொள்வதால் சோர்வு வராமல் கவனிக்க வேண்டும்.',
  'சொல்லப்படாத எதிர்பார்ப்பை மனதில் வைத்திருந்தால் உறவில் குழப்பம் நீளக்கூடும்.',
  'கடந்த அனுபவத்தை எல்லா புதிய முடிவுகளுக்கும் அளவுகோலாக்காமல் இருப்பது நல்லது.',
  'பிறருடைய நம்பிக்கையைக் கேள்வி கேட்கும்போது மரியாதையான அணுகுமுறை உதவும்.',
  'வேலைத் தரத்தில் தீவிரம் இருந்தாலும் அதிகப் பொறுப்பு ஓய்வைத் தள்ளிச் செல்லக்கூடும்.',
  'நண்பர்களிடம் எதிர்பார்ப்பை அளவாக வைத்தால் தேவையற்ற மனவருத்தம் தவிர்க்கலாம்.',
  'தனியாகச் சிந்திப்பது உதவினாலும் கவலையை உள்ளுக்குள்ளேயே வைத்திருக்க வேண்டியதில்லை.'
 ];
 const POS_REL_EN=[
  'Clear decisions and thoughtful communication may support confidence.',
  'Planning family commitments and expenses can protect stability.',
  'Repeated small efforts can strengthen practical confidence.',
  'Calm discussion and personal space may support home life.',
  'Learning and sharing knowledge can deepen this ability.',
  'Breaking a problem into steps may make it manageable.',
  'Listening on both sides can protect close relationships.',
  'A backup plan may support calmer decisions through change.',
  'Deeper study can become useful in practical choices.',
  'Delegating and organizing work can improve its quality.',
  'Reliable connections may help with long-term goals.',
  'A boundary between rest and activity may create more calm.'
 ];
 const NEG_REL_EN=[
  'A strong personal position still needs room for another point of view.',
  'A misunderstanding about words or money is best clarified early.',
  'Too much speed may scatter effort without a clear sequence.',
  'Work concerns may need to be set aside to protect home comfort.',
  'Overthinking can delay decisions after enough facts are available.',
  'Taking over other people’s duties may become exhausting.',
  'Unspoken expectations can unnecessarily prolong disagreement.',
  'An old disappointment need not govern every new decision.',
  'Questions about beliefs are easier to hear when asked respectfully.',
  'High work standards should not crowd out rest.',
  'Balanced expectations of friends can reduce resentment.',
  'Private reflection need not mean keeping every worry to oneself.'
 ];
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const unique=a=>[...new Set(a)];
 function signIndex(v){
  if(Number.isInteger(v)&&v>=0&&v<12)return v;
  if(typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<360)return Math.floor(v/30);
  const s=String(v??'').trim();const ta=SIGNS_TA.indexOf(s),en=SIGNS_EN.findIndex(x=>x.toLowerCase()===s.toLowerCase());return ta>=0?ta:en;
 }
 function planetName(v){return ALIASES[String(v??'').trim()]||ALIASES[String(v??'').trim().toLowerCase()]||null;}
 function dignity(p){const n=p.key,s=p.sign; if(n==='Rahu'||n==='Ketu')return 'neutral';if(EXALTED[n]===s)return 'exalted';if(DEBILITATED[n]===s)return 'debilitated';if((OWNS[n]||[]).includes(s))return 'own';return 'neutral';}
 function toD1(chart){
  const source=chart?.chart&&chart.chart.lagna?chart.chart:chart;
  const lagna=signIndex(source?.lagna?.rasi??source?.lagna?.longitude);
  if(lagna<0)throw Error('D1 Lagna is required: no default sign may be guessed.');
  const planets={};for(const p of source?.planets||[]){const key=planetName(p?.name||p?.planet);if(!key)continue;
   const sign=signIndex(p?.rasi??p?.longitude);if(sign<0)continue;
   planets[key]={key,sign,house:(sign-lagna+12)%12+1,retrograde:Boolean(p?.strength?.retrograde||p?.retrograde),combust:Boolean(p?.strength?.combustion),...{}};
  }
  const names=Object.keys(TNP);if(names.some(x=>!planets[x]))throw Error('All nine D1 planetary signs are required; incomplete charts cannot produce a full reading.');
  const houses=Array.from({length:12},(_,i)=>({no:i+1,sign:(lagna+i)%12,lord:PN[(lagna+i)%12],occupants:[],aspects:[]}));
  for(const p of Object.values(planets)){p.dignity=dignity(p);houses[p.house-1].occupants.push(p.key);if(DRISHTI[p.key])for(const offset of DRISHTI[p.key]){
    const n=((p.house+offset-2)%12)+1;houses[n-1].aspects.push(p.key);
  }}
  for(const h of houses){h.aspects=unique(h.aspects);h.occupants=unique(h.occupants);}
  return {lagna,planets,houses};
 }
 function scorePlanet(d,p){if(!p)return 0;let s={exalted:3,own:2,neutral:0,debilitated:-3}[p.dignity]||0;
  if(p.combust&&p.key!=='Sun')s-=1;
  // Traditional challenging and supporting angular contacts; never substitute sign with a Shadbala/D9 value.
  for(const key of d.houses[p.house-1].aspects){if(key==='Jupiter'||key==='Venus')s+=1;else if(key==='Saturn'||key==='Mars'||key==='Rahu')s-=1;}
  return Math.max(-4,Math.min(4,s));
 }
 function houseScore(d,h){const lord=d.planets[h.lord];let s=scorePlanet(d,lord);
  for(const k of h.occupants){if(k==='Jupiter'||k==='Venus'||k==='Mercury')s+=1; if(k==='Saturn'||k==='Mars'||k==='Rahu'||k==='Ketu')s-=1;}
  for(const k of h.aspects){if(k==='Jupiter'||k==='Venus')s+=1;if(k==='Saturn'||k==='Mars')s-=1;}
  return Math.max(-4,Math.min(4,s));
 }
 function links(d,focus,other){
  const f=d.houses[focus-1],o=d.houses[other-1],fLord=d.planets[f.lord],oLord=d.planets[o.lord];
  const sources=[];
  if(fLord.house===other)sources.push('focus-lord-in-related-house');
  if(oLord.house===focus)sources.push('related-lord-in-focus-house');
  if(f.occupants.includes(o.lord))sources.push('related-lord-conjunct-focus');
  if(o.occupants.includes(f.lord))sources.push('focus-lord-conjunct-related');
  if(o.aspects.some(p=>f.occupants.includes(p)))sources.push('focus-occupant-aspects-related');
  if(f.aspects.some(p=>o.occupants.includes(p)))sources.push('related-occupant-aspects-focus');
  if(f.lord!==o.lord&&fLord.house===oLord.house)sources.push('lords-conjunct');
  if(o.aspects.includes(f.lord))sources.push('focus-lord-aspects-related');
  if(f.aspects.includes(o.lord))sources.push('related-lord-aspects-focus');
  if(fLord.house===other&&oLord.house===focus)sources.push('mutual-exchange');
  return unique(sources);
 }
 function dominantPlanet(d,f,other){const fH=d.houses[f-1],oH=d.houses[other-1],candidates=unique([
    ...((d.planets[fH.lord].house===other)?[fH.lord]:[]),
    ...oH.occupants,...oH.aspects, ...fH.occupants,
    ...((d.planets[oH.lord].house===f)?[oH.lord]:[])
  ]);return candidates.sort((a,b)=>Math.abs(scorePlanet(d,d.planets[b]))-Math.abs(scorePlanet(d,d.planets[a])))[0]||fH.lord;
 }
 function render(chart,lang='ta'){
  const ta=lang!=='en',d=toD1(chart),topics=[];
  for(let i=0;i<12;i++){
    const focus=i+1,f=d.houses[i],pivotLord=d.planets[f.lord],paragraphs=[];
    for(let j=0;j<12;j++){
      const related=j+1,o=d.houses[j],lk=links(d,focus,related);
      const isLinked=focus===related||lk.length>0;
      const pKey=dominantPlanet(d,focus,related);const support=houseScore(d,o)+(isLinked?scorePlanet(d,pivotLord):0);
      const bucket=support>=2?'supportive':support<=-2?'challenging':'mixed';
      const sentence=(i===0 && j===0)?(ta?LAGNA_BEHAVIOR_TA:LAGNA_BEHAVIOR_EN)[d.lagna]:(ta?ROUTES_TA:ROUTES_EN)[i][j];
      const follow=bucket==='supportive'?(ta?POS_REL_TA:POS_REL_EN)[j]:bucket==='challenging'?(ta?NEG_REL_TA:NEG_REL_EN)[j]:(support>=0?(ta?POS_REL_TA:POS_REL_EN)[j]:(ta?NEG_REL_TA:NEG_REL_EN)[j]);
      const planetSentence=(ta?PLANET_HOUSE_TA:PLANET_HOUSE_EN)[pKey][j];
      // Include real D1 connections to the topic lord: conjunctions, aspects and sign dignity.
      const lordLoc=d.houses[pivotLord.house-1];
      const lordConj=lordLoc.occupants.filter(k=>k!==f.lord);
      const lordAspects=lordLoc.aspects.filter(k=>k!==f.lord);
      const dominantConj=lordConj.find(k=>k===pKey)||lordConj[0];
      const dominantAspect=lordAspects.find(k=>k===pKey)||lordAspects[0];
      let lordDetail='';
      // Translate actual D1 dignity, conjunctions and aspects into life effects,
      // without printing the technical planetary formula in the client report.
      if(j===i){
        if(pivotLord.dignity==='exalted'||pivotLord.dignity==='own')
          lordDetail=(ta?STRONG_FOCUS_TA:STRONG_FOCUS_EN)[i];
        else if(pivotLord.dignity==='debilitated')
          lordDetail=(ta?WEAK_FOCUS_TA:WEAK_FOCUS_EN)[i];
      }
      if(j===i || (j===pivotLord.house-1 && j!==i)){
        if(dominantConj)lordDetail+=' '+(ta?PLANET_HOUSE_TA:PLANET_HOUSE_EN)[dominantConj][i];
        if(dominantAspect)lordDetail+=' '+(ta?PLANET_HOUSE_TA:PLANET_HOUSE_EN)[dominantAspect][i];
      }
      // Natural prose only. Do not print technical planet/house commentary
      // 144 times: link calculations influence evidence, score and phrase choice.
      // An especially strong/challenged related house adds a specific practical
      // qualification; neutral links are not inflated into confident claims.
      const narrative=[sentence,planetSentence,lordDetail,follow].filter(Boolean).join(' ');
      const evidence={focusHouse:focus,relatedHouse:related,focusSign:f.sign,relatedSign:o.sign,
         focusLord:f.lord,focusLordHouse:pivotLord.house,relatedLord:o.lord,relatedLordHouse:d.planets[o.lord].house,
         relatedOccupants:o.occupants,aspectsToRelatedHouse:o.aspects,aspectsToFocusHouse:f.aspects,
         focusLordConjunction:d.houses[pivotLord.house-1].occupants.filter(k=>k!==f.lord),
         aspectsToFocusLord:d.houses[pivotLord.house-1].aspects,
         focusLordDignity:pivotLord.dignity,relativeLordDignity:d.planets[o.lord].dignity,
         planet:pKey,score:support,links:lk};
      paragraphs.push({house:related,text:narrative,evidence});
    }
    topics.push({number:focus,title:THEMES[i][ta?0:1],paragraphs});
  }
  return {lang:ta?'ta':'en',lagnaSign:d.lagna,topics,source:'D1-only',method:'whole-sign Parashari graha drishti',planetarySigns:Object.fromEntries(Object.values(d.planets).map(p=>[p.key,p.sign]))};
 }
 function html(chart,lang='ta'){
   const report=render(chart,lang),ta=report.lang==='ta';
   const out=report.topics.map(t=>`<section class="smv-d1-life-topic" data-d1-topic="${t.number}"><h3>${t.number}. ${esc(t.title)}</h3>${t.paragraphs.map(x=>`<p class="smv-d1-life-paragraph" data-d1-related-house="${x.house}">${esc(x.text)}</p>`).join('')}</section>`).join('');
   return `<section class="smv-d1-life-reading" data-smv-d1-life="1" lang="${report.lang}"><h2>${ta?'ஜாதகரின் முழு வாழ்க்கை பலன்':'Complete Life Reading of the Native'}</h2><p class="smv-d1-life-method">${ta?'D1 ராசிக் கட்டத்தின் 12 பாவங்களை ஒவ்வொரு தலைப்பிற்கும் தனித்தனியாக ஆராய்ந்து வழங்கப்படும் பாரம்பரிய ஜோதிட விளக்கம்.':'A traditional reading of all twelve houses through each distinct D1 life topic.'}</p>${out}</section>`;
 }
 return Object.freeze({render,html,toD1,version:'265-d1-twelve-topics'});
});
