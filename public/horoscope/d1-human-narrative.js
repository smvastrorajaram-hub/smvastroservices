/* SMV ASTRO V287 — Two-pass human narrative for natal D1.
 * Inputs: normalized natal chart produced by d1-life-reading.js/toD1.
 * Does not recalculate ephemerides, change payments, requests, or persist data.
 * PRIVATE evidence is returned as metadata; reader-facing prose contains lived effects only.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.SMVD1HumanNarrative=api;})(typeof window!=='undefined'?window:globalThis,function(){'use strict';
const TA_SIGNS=['மேஷ','ரிஷப','மிதுன','கடக','சிம்ம','கன்னி','துலா','விருச்சிக','தனுசு','மகர','கும்ப','மீன'];
const EN_SIGNS=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const TITLES_TA=['ஜாதகரின் குணநலன்கள்','பேச்சு, வாக்கு, குடும்பம் மற்றும் பொருளாதாரம்','முயற்சி, துணிவு, திறமை மற்றும் உடன்பிறப்புகள்','தாய், வீடு, மனநிம்மதி மற்றும் சொத்து','அறிவு, கல்வி, சிந்தனை மற்றும் குழந்தைகள்','வேலை, போட்டி, கடன் மற்றும் உடல்நலப் பழக்கங்கள்','திருமணம், துணைவர் மற்றும் கூட்டுறவு','வாழ்க்கை மாற்றங்கள் மற்றும் நீண்டகாலச் சவால்கள்','தந்தை, ஆசிரியர், நம்பிக்கை மற்றும் வழிகாட்டுதல்','தொழில், பொறுப்பு மற்றும் சமூக அந்தஸ்து','வருமானம், ஆதாயங்கள் மற்றும் சமூக உறவுகள்','செலவுகள், ஓய்வு, தனிமை மற்றும் ஆன்மிக வாழ்க்கை'];
const TITLES_EN=['Character and personality','Speech, family and handling money','Initiative, courage, skills and siblings','Mother, home, comfort and property','Intellect, education, creativity and children','Daily work, competition, debt and wellbeing','Marriage, close relationships and partnership','Change, recovery and long-standing challenges','Father, mentors, convictions and learning','Work, duties and public reputation','Income, gains, friends and ambitions','Spending, rest, private time and inner life'];
// Each rising-sign sketch is independently authored; no sign-name substitutions.
const RISING_TA=[
 ['மேஷ லக்னத்தில் பிறந்துள்ளதால் ஒரு செயலைத் தொடங்குவதற்கான துணிவும் உடனடியாக முடிவு காண விரும்பும் இயல்பும் இவரிடம் மேலோங்கலாம். இடையூறு வந்தால் காத்திருப்பதைவிட முயன்று பார்க்கும் மனம் செயல்படும்.','தனக்கான சுதந்திரத்தை மதிப்பார்; அதே வேகத்தில் மற்றவர்களும் முடிவெடுக்க வேண்டும் என்ற எதிர்பார்ப்பு ஏற்பட்டால் கருத்து வேறுபாடு உருவாகலாம். பொறுமையுடன் கேட்டறிவது இவரது துணிவை இன்னும் பயனுள்ளதாக மாற்றும்.'],
 ['ரிஷப லக்னத்தில் பிறந்துள்ளதால் உறுதியான முடிவு, நம்பிக்கையான உறவு, நிலையான வாழ்க்கை ஆகியவற்றை முன்னிலைப்படுத்தக்கூடும். தொடங்குவதற்கு நேரம் எடுத்தாலும் முடித்துப் பாதுகாக்க விரும்புவார்.','அழகு, வசதி, கலை, இனிய சூழல் ஆகியவற்றில் ஆர்வம் இருக்கலாம். பழகிய முறையை உடனடியாக மாற்ற விரும்பாததால் சில வாய்ப்புகளை மெதுவாக ஏற்கலாம்; ஆனால் ஏற்ற பிறகு தொடர்ந்து உழைப்பார்.'],
 ['மிதுன லக்னத்தில் பிறந்துள்ளதால் கேள்விகள் கேட்கும் ஆர்வம், பலருடன் தகவலைப் பகிர்ந்து கொள்ளும் விருப்பம், ஒன்றுக்கும் மேற்பட்ட வழிகளை ஆராயும் திறன் ஆகியவை வெளிப்படலாம்.','பேச்சின் மூலம் உறவை வளர்ப்பார்; புதிதாகக் கற்ற விஷயத்தை உடனே பகிர விரும்புவார். ஒரு விஷயத்தில் நீண்ட நேரம் நிலைத்து இருப்பதற்குப் பயிற்சி தேவைப்படலாம்; கருத்தை மாற்றுவது எல்லா நேரமும் உறுதியின்மை என்று பொருளல்ல.'],
 ['கடக லக்னத்தில் பிறந்துள்ளதால் நெருங்கியவர்களின் மனநிலையையும் குடும்பப் பாதுகாப்பையும் அதிகம் கவனிக்கும் இயல்பு இருக்கலாம். ஒருவரை முழுமையாக நம்பிய பிறகு அவருக்கான அக்கறை செயலில் வெளிப்படும்.','நினைவுகளும் பழைய அனுபவங்களும் முடிவுகளைப் பாதிக்கலாம். மனதில் வருத்தம் இருந்தாலும் உடனே சொல்லாமல் வைத்துக்கொள்ளக்கூடும்; அன்பை வெளிப்படுத்துவதுடன் தனது தேவைகளையும் தெளிவாகக் கூறுவது நல்லது.'],
 ['சிம்ம லக்னத்தில் பிறந்துள்ளதால் தன்மானம், பொறுப்புணர்வு, தன் முயற்சிக்கு மதிப்பு கிடைக்க வேண்டும் என்ற விருப்பம் ஆகியவை முன்னிலையாகலாம். ஒரு கூட்டத்தில் முன்னின்று செயல்படத் தயங்காத தன்மை இருக்கலாம்.','பிறருக்கு ஊக்கமளிக்கும் மனம் இருந்தாலும் தன் கருத்துக்கு எதிரான ஆலோசனைகளை உடனே ஏற்றுக்கொள்ளாமலும் இருக்கலாம். அங்கீகாரம் பெறுவதற்காக அல்லாமல் செய்த வேலையின் பயனுக்காக இயங்கும்போது சிறந்த தலைமையை வெளிப்படுத்துவார்.'],
 ['கன்னி லக்னத்தில் பிறந்துள்ளதால் சிறிய விவரங்களையும் கவனித்து வேலைகளைச் சரிபார்க்கும் ஆர்வம் இருக்கும். சிக்கலைப் பல பகுதிகளாகப் பிரித்து ஒழுங்காகச் செய்து முடிக்க முயல்வார்.','பிறருக்கு உதவும் போது அவர்களின் பிழைகளையும் சுட்டிக்காட்டலாம்; நல்ல நோக்கத்தில் கூறிய அறிவுரை விமர்சனமாகப் புரியப்படும் சூழல் இருக்கலாம். அனைத்தும் கச்சிதமாக அமையவேண்டும் என்ற அழுத்தத்தைக் குறைப்பது அமைதியைத் தரும்.'],
 ['துலா லக்னத்தில் பிறந்துள்ளதால் இரு தரப்பினரின் கருத்தையும் கேட்டறிந்து சமநிலையை நாடும் இயல்பு இருக்கலாம். தொடர்புகளைப் பேணுவதிலும் முரண்பாடுகளைப் பேசித் தீர்ப்பதிலும் ஆர்வம் காணப்படலாம்.','பிறரின் விருப்பத்திற்கு அளவுக்கு அதிக இடம் கொடுத்தால் தனது முடிவு தாமதமாகலாம். நியாயத்தையும் அழகுணர்வையும் மதிக்கும் அதே நேரத்தில் தேவையான இடத்தில் தெளிவான எல்லைகளை அமைத்துக்கொள்வது உதவும்.'],
 ['விருச்சிக லக்னத்தில் பிறந்துள்ளதால் ஒருவரின் சொற்களைவிடச் செயல்களை வைத்து நம்பிக்கை உருவாக்க விரும்பலாம். வெளியில் அமைதியாகத் தோன்றினாலும் உள்ளுக்குள் விஷயங்களை ஆழமாக ஆராயும் பழக்கம் இருக்கும்.','ஒரு இலக்கைத் தேர்ந்தெடுத்தால் தடைகளைச் சமாளித்துத் தொடர்ந்து முயல்வார். தன் உணர்வுகளை எளிதில் பகிராததால் மற்றவர்கள் இவரைத் தவறாகப் புரிந்துகொள்ளலாம்; நம்பகமானவர்களிடம் திறந்த உரையாடல் உறவை வலுப்படுத்தும்.'],
 ['தனுசு லக்னத்தில் பிறந்துள்ளதால் புதிய அனுபவங்கள், தத்துவச் சிந்தனைகள், கற்றல், நேர்மையான கருத்து பரிமாற்றம் ஆகியவற்றில் ஆர்வம் இருக்கலாம். தன்னை கட்டுப்படுத்தும் சூழலுக்குப் பதிலாக வளர்ச்சிக்கான இடத்தைத் தேடுவார்.','தனக்குத் தெளிவாகத் தெரியும் கருத்தை நேரடியாகச் சொல்வதால் பிறர் மனம் புண்படலாம்; கூறும் விதத்தில் நிதானம் சேர்த்தால் நல்ல ஆலோசகராக விளங்கக்கூடும். நீண்டகால இலக்கு இவருக்கு ஊக்கம் தரும்.'],
 ['மகர லக்னத்தில் பிறந்துள்ளதால் கடமை, பொறுப்பு, நீண்டகால உழைப்பு ஆகியவற்றை வாழ்க்கையின் அடிப்படையாகக் கருதக்கூடும். சாதனை உடனடியாகக் கிடைக்காவிட்டாலும் படிப்படியாக முன்னேற முயல்வார்.','பிறருக்குத் தனது சிரமங்களை வெளிப்படுத்தாமல் செயல்படலாம். எல்லாவற்றையும் கடமையாக எடுத்துக்கொண்டால் மகிழ்ச்சிக்கான நேரம் குறையலாம்; ஓய்வு மற்றும் உணர்வுகளுக்கும் இடம் கொடுப்பது இவருக்கு முக்கியம்.'],
 ['கும்ப லக்னத்தில் பிறந்துள்ளதால் வழக்கமான நடைமுறையை மட்டும் பின்பற்றாமல் புதிய வழிகளை ஆராய விரும்பலாம். மனிதர்களுக்குப் பயன்படும் கருத்துகள், குழு முயற்சிகள், சுதந்திரமான சிந்தனை ஆகியவற்றில் ஆர்வம் இருக்கலாம்.','அனைவரிடமும் நட்பாக இருந்தாலும் தனிப்பட்ட எல்லையைப் பேண விரும்பலாம். தனது கருத்து வேறுபடுவதால் மட்டும் பிறரைப் புறக்கணிக்காமல் பொறுமையாக விளக்கினால் சுற்றத்தாரின் ஒத்துழைப்பு கிடைக்கலாம்.'],
 ['மீன லக்னத்தில் பிறந்துள்ளதால் இவரிடம் இரக்கம், உள்ளுணர்வு, பிறரின் உணர்வுகளைப் புரிந்துகொள்ளும் ஆர்வம் ஆகியவை இயல்பாக வெளிப்படலாம். ஒருவர் தனது சிரமத்தைப் பகிர்ந்தால் அதை வெறும் செய்தியாகக் கேட்காமல் உதவ வேண்டிய பொறுப்பாகக் கருதக்கூடும்.','கற்பனைத்திறனும் ஆழமான சிந்தனையும் இவரது முடிவுகளில் இடம் பெறலாம். உதவி பெற்றவர் எதிர்பார்த்த அன்பைக் காட்டாதபோது மனவருத்தம் ஏற்படலாம்; பிறருக்கு உதவுவதையும் தனக்கான எல்லைகளைப் பாதுகாப்பதையும் சமப்படுத்துவது நல்லது.']
];
const RISING_EN=[
 ['Aries rising may bring a wish to act first and work out obstacles through direct effort. Initiative comes readily, even where others hesitate.','Independence is important; slowing down enough to hear another perspective can make courage more useful.'],
 ['Taurus rising may value continuity, comfort and relationships that prove dependable over time. Decisions may be unhurried but firmly maintained.','Practical beauty and a stable home can matter; adjusting to a necessary change may take time.'],
 ['Gemini rising may favour questioning, conversation and exploring several ways to solve a problem. Learning is often shared aloud.','Ideas may move faster than completion; choosing which projects deserve sustained attention can help.'],
 ['Cancer rising may pay close attention to the feelings and security of loved ones. Care is shown through practical support.','Memories can colour reactions; speaking about needs directly may reduce silent disappointment.'],
 ['Leo rising may value dignity, accountable leadership and seeing a task properly recognised. Initiative may emerge in public settings.','Confidence becomes more effective when appreciation of others is as visible as self-respect.'],
 ['Virgo rising may scrutinise details and try to correct practical problems methodically. Work is often approached in steps.','Helpful advice can sound critical; leaving space for imperfection may improve relationships.'],
 ['Libra rising may seek fairness by hearing both sides before taking a position. Harmony and aesthetic judgement can matter.','Trying to please everyone can delay decisions; clear boundaries are important.'],
 ['Scorpio rising may judge reliability by actions rather than promises. Attention often goes to underlying causes.','Resolve can be strong, while unshared feelings can make communication harder.'],
 ['Sagittarius rising may value learning, exploration and ideas that give life meaning. Freedom can support initiative.','Direct honesty is most effective when paired with tact and a willingness to listen.'],
 ['Capricorn rising may take obligations seriously and build towards distant goals with patience.','Carrying duties silently can crowd out rest and pleasure; sharing responsibilities matters.'],
 ['Aquarius rising may question conventional approaches and enjoy ideas with a social purpose.','A need for independence can coexist with friendship; patiently explaining differences helps.'],
 ['Pisces rising may show compassion and sensitivity to what others are feeling. Someone else’s difficulty can feel like a personal call to help.','Imagination and reflection can be strengths, but clear boundaries can prevent emotional overextension.']
];
const SIGN_STYLE_TA=[
 'அவசர சூழலில் நேரடியாக முடிவு எடுக்கும் வேகம்','நம்பிக்கைக்குரிய பழக்கத்தைக் காப்பாற்றி மாற்றத்தை மெதுவாக ஏற்கும் உறுதி','ஒரே விஷயத்திற்கு பல மாற்று விளக்கங்களைத் தேடும் சிந்தனை','நெருங்கியவர்களின் பாதுகாப்புக்கு முக்கியத்துவம் கொடுக்கும் பாசம்','தன்மானமும் பொறுப்பு ஏற்று வழிநடத்தும் விருப்பமும்','சிறு விவரங்களையும் தவறவிடாமல் சீரமைக்கும் பழக்கம்','இரு தரப்பையும் புரிந்துகொண்டு சமரசம் காணும் எண்ணம்','நம்பிக்கையைச் சோதித்து ஆழமாக ஆராயும் உள்ளுணர்வு','காரணம், கொள்கை, அறிவைத் தேடும் சுதந்திரமான மனம்','மெதுவாகவும் விடாமுயற்சியுடனும் பணியை நிறைவேற்றும் ஒழுங்கு','வழக்கத்துக்கு மாறாகச் சிந்திக்கும் தனித்துவம்','பிறரின் உணர்வைத் தன்னுள் ஏற்றுக்கொள்ளும் நெகிழ்ச்சி'];
const SIGN_STYLE_EN=[
 'quick initiative in urgent situations','persistence and reluctance to abandon dependable routines','curiosity about competing interpretations','a concern for the security of loved ones','self-respect and a readiness to lead','methodical attention to small details','fairness and negotiation','probing instincts and careful trust','independent principles and curiosity','patient discipline over a long effort','unconventional thinking','sensitivity to the feelings of others'];
const PLANET_TA={Sun:['தன் உழைப்புக்கும் கருத்துக்கும் உரிய மரியாதை கிடைக்க வேண்டும் என்று நினைப்பார்','அங்கீகாரம் இல்லாதபோது தன்னுடைய முயற்சியை மற்றவர்கள் புரியவில்லை என்ற எண்ணம் எழலாம்'],Moon:['சுற்றியிருப்பவர்களின் மனமாற்றத்தை விரைவாக உணர்ந்து அணுகுமுறையை மாற்றிக்கொள்வார்','பிறர் கவலை தன்னுடைய கவலையாக மாறும்போது ஓய்வு தேவைப்படலாம்'],Mars:['பிரச்சினை வந்தால் உடனடியாகச் செயல்பட்டு தீர்வு காண விரும்புவார்','அவசர எதிர்வினை அல்லது நேரடியான வார்த்தை சிலருக்கு கடுமையாகத் தோன்றலாம்'],Mercury:['சொன்ன விஷயத்தை மீண்டும் ஆராய்ந்து அதன் காரணங்களை விளக்க விரும்புவார்','அதிக விவரங்களைச் சொல்லும் ஆர்வத்தால் உரையாடல் நீளலாம்'],Jupiter:['அனுபவத்தையும் அறிவையும் சேர்த்து மற்றவர்களுக்கு வழிகாட்ட விரும்புவார்','தன் கருத்தின் நியாயத்தில் உறுதியிருந்தாலும் மாற்றுக் கருத்தைக் கேட்பது உதவும்'],Venus:['அன்பையும் மரியாதையையும் உறவில் வெளிப்படுத்துவதற்கு முக்கியத்துவம் கொடுப்பார்','அமைதிக்காகத் தேவையான விஷயங்களைச் சொல்லாமல் விட்டால் பின்னர் மனக்கசப்பு வரலாம்'],Saturn:['முடிவு தாமதமானாலும் கைவிடாமல் பொறுப்பைத் தொடர்ந்து நிறைவேற்ற முயல்வார்','எல்லாவற்றையும் தனியாகச் சுமக்கும்போது மனச்சோர்வு அதிகரிக்கலாம்'],Rahu:['புதிய வழியில் வாய்ப்பைக் கண்டுபிடிப்பதற்கான ஆவல் இருக்கும்','எதிர்பார்ப்பின் வேகத்தில் விவரங்களைச் சரிபார்க்காமல் போகாமல் இருக்க வேண்டும்'],Ketu:['ஒரு விஷயத்தின் ஆழத்தைப் புரிந்துகொள்ளத் தனியாக ஆராய விரும்புவார்','தனிமையைத் தேர்வுசெய்யும்போது நெருங்கியவர்களுடன் தொடர்பு குறையாமல் பார்த்துக்கொள்ள வேண்டும்']};
const PLANET_EN={Sun:['Recognition and personal accountability can matter to them','Feeling overlooked may become a source of frustration'],Moon:['They may notice shifts in other people’s moods','Others’ worries can become hard to put down'],Mars:['They may move directly towards a problem','A rapid response can sound severe to others'],Mercury:['They may analyse a point and explain the reasons behind it','Giving too much detail can stretch a conversation'],Jupiter:['Learning and advising others can be rewarding','Strong convictions benefit from listening to another viewpoint'],Venus:['They may express care through kindness and courtesy','Avoiding a difficult conversation can store up resentment'],Saturn:['They may continue with duties even when progress is slow','Carrying every burden alone can become exhausting'],Rahu:['An unconventional opening may attract their curiosity','Excitement needs fact-checking'],Ketu:['They may prefer investigating beneath the surface','Solitude should not become disconnection']};
// A placement does not guarantee a life event. It changes WHERE a quality may be expressed.
const ARENA_TA=['தனது அடையாளம், முடிவு மற்றும் தினசரி செயல்பாட்டில்','பேச்சு, குடும்பத் தேவைகள், பணத்தைப் பயன்படுத்தும் முறையில்','சொந்த முயற்சி, பயிற்சி, உடன்பிறந்தோருடனான உரையாடலில்','வீட்டின் பொறுப்புகள், தாய் மற்றும் மன அமைதியில்','கல்வி, சிந்தனை, படைப்பாற்றல் அல்லது குழந்தைகள் சார்ந்த விருப்பங்களில்','வேலைச்சுமை, போட்டி, தினசரி ஒழுங்கு மற்றும் சேவையில்','நெருங்கிய உறவு, துணைவர் மற்றும் கூட்டாக எடுக்கும் முடிவுகளில்','எதிர்பாராத மாற்றங்களைச் சமாளிப்பதிலும் நம்பிக்கை வைப்பதிலும்','பெரியோர், ஆசிரியர், கொள்கை மற்றும் கற்றல் வாய்ப்புகளில்','தொழில், பொதுப்பொறுப்பு மற்றும் சாதனை முயற்சிகளில்','நண்பர்கள், சமூக வட்டம், ஆதாயம் மற்றும் இலக்குகளில்','ஓய்வு, செலவு, தனிப்பட்ட இடம் மற்றும் உள்மனச் சிந்தனையில்'];
const ARENA_EN=['personal choices and daily action','speech, family and managing money','learning by doing and sibling relationships','the home and emotional ease','learning, creativity and caring for children','workload, service and competition','intimate relationships and shared choices','managing upheavals and trust','teachers, values and further learning','career and visible duties','friendships, aims and resources','private life, spending and rest'];
// Topic-specific lived consequences and anatomical domains (not medical claims).
const DOMAIN_TA=[
 ['உடலை இயக்கும் விதத்தில் சுறுசுறுப்பு அல்லது நிதானம் எது மேலோங்குகிறது என்பதும் தினசரி பழக்கங்களால் வெளிப்படும். நடையில் உறுதியும் உடலைச் சுறுசுறுப்பாக வைத்திருக்க வேண்டும் என்ற விருப்பமும் வெளிப்படலாம்; தொடர்ச்சியாக உழைக்கும் போது இடையிடையே ஓய்வெடுக்கத் தெரிந்திருப்பதும் முக்கியம்.','தலைப்பகுதி, முகத்தின் வெளிப்பாடு, உடலின் ஒட்டுமொத்த இயக்கம் ஆகியவற்றில் தனிப்பட்ட கவனம் செலுத்த விரும்பலாம். உடல் சோர்வை வெளிக்காட்டாமல் தொடர்ந்து வேலை செய்வதைவிட ஓய்வையும் பழக்கமாக வைத்திருப்பது நல்லது.'],
 ['ஒரு கருத்தைத் தன் மனதில் தெளிவுபடுத்திய பிறகே சொல்ல விரும்பலாம்; குடும்பத்தில் பேசும் விதம் நெருக்கத்தையும் மனக்கசப்பையும் தீர்மானிக்கக்கூடும். வருமானம் ஈட்டுவதையும் அதனைச் சேமிப்பதையும் ஒரே விஷயமாக எண்ணாமல் திட்டமிடுவது பயனாகலாம்.','வாய், நாக்கு, பற்கள், குரல், உணவு முறைகள் போன்ற உடல் சார்ந்த பழக்கங்களுக்கு இங்கு இடமுண்டு. உணவு நேரம் மற்றும் பேச்சின் வேகத்தில் நிதானம் காப்பது அன்றாட நலனுக்கு உதவும்.'],
 ['ஒரு திறமையைப் பிறர் சொல்லிக்கொடுப்பதோடு நிறுத்தாமல் தானே செய்து பார்த்துக் கற்றுக்கொள்ள விரும்பலாம். இளைய உடன்பிறப்புகளுடன் ஒற்றுமைக்கு உதவுவது அவரவர் செயல்படும் வேகத்தை மதிப்பதே.','கைகள், தோள்கள், காதுகள் மற்றும் செயல் ஒருங்கிணைப்பு சார்ந்த அன்றாடப் பழக்கங்களைக் கவனிக்க வேண்டிய பகுதி இது. ஒரே வேலையை நீண்ட நேரம் செய்யும்போது இடைவெளி எடுத்துக்கொள்வது நல்லது.'],
 ['வீட்டின் அமைதியையும் குடும்பத்திற்கான பாதுகாப்பையும் ஒன்றோடொன்று தொடர்புபடுத்தலாம். சொத்து அல்லது வாகன முடிவுகளில் உணர்ச்சியை விட உண்மையான தேவையை ஆராய்ந்து செயல்படுவது நன்மை தரும்.','வீட்டில் அமைதியாக இருக்கக்கூடிய சூழலை அமைத்துக்கொண்டால் மன அழுத்தம் குறையலாம். மார்பு, நெஞ்சுப் பகுதி மற்றும் சுவாசத்திற்கு ஏற்ற அன்றாடப் பழக்கங்களில் ஒழுங்கைக் காக்க விரும்பலாம்.'],
 ['புதிய விஷயத்தை அறிந்ததும் அதற்கான காரணத்தைப் புரிந்துகொள்ள விரும்பலாம்; குழந்தைகள் அல்லது இளையவர்களுக்கு அறிவுறுத்தும்போது அவர்களுடைய விருப்பத்திற்கும் இடமளிப்பது நல்லது.','வயிற்றின் மேல்பகுதி, அன்றாட உணவு ஒழுங்கு ஆகியவை தொடர்புடைய உடல் வழக்கங்கள். கவனம் செலுத்தும் நேரத்துக்கும் உணவு மற்றும் ஓய்வுக்கும் ஒரு நடைமுறையை வைத்திருப்பது உதவும்.'],
 ['சிக்கல் ஏற்பட்டால் அதைத் தனிப்பட்ட தோல்வியாகக் கருதாமல் ஒவ்வொரு படியாகச் சரிசெய்யும் திறனை வளர்க்கலாம். கடன், போட்டி, வேலைச்சுமை மூன்றுக்கும் தெளிவான எல்லை இருந்தால் சோர்வு குறையும்.','உடலுக்கு ஏற்ற உணவு நேரம், செரிமானத்திற்கு உதவும் நடைமுறை, இடைவிடாத பணிக்கிடையே ஓய்வு போன்றவற்றைச் சீராக வைத்துக்கொள்ளும்போது அன்றாட வாழ்க்கை வசதியாக அமையும்.'],
 ['துணைவரிடம் அன்பைக் காட்டும் விதமும் பிறரின் தனித்தன்மையை மதிக்கும் விதமும் உறவை மாற்றும். ஒப்பந்தங்களிலும் குடும்ப முடிவுகளிலும் சொல்லப்படாத எதிர்பார்ப்புகளை முன்பே பேசுவது நல்லது.','நெருக்கமான வாழ்க்கையில் ஒருவருக்கொருவர் உடல் மற்றும் மனத் தேவைகளுக்கு மதிப்பளிப்பதும், விருப்பமில்லாத விஷயங்களில் எல்லைகளைத் தெளிவாகப் பேசுவதும் உறவைப் பாதுகாக்க உதவும்.'],
 ['திடீர் மாற்றம் நேர்ந்தால் முந்தைய முறையைப் பிடித்துக்கொள்வதைவிட இப்போது எது செயல்படும் என்று ஆராயலாம். நம்பிக்கைக்குரியவர்களுடன் சிக்கலைப் பகிர்வது தனியாகச் சுமக்கும் அழுத்தத்தைக் குறைக்கும்.','உடலின் தனிப்பட்ட தேவைகளைப் புறக்கணிக்காமல் பராமரிப்பதும், நீண்டகால வேலைப்பளுவில் ஓய்வை ஒதுக்குவதும் இவருக்கு உதவும். திடீர் மாற்றங்களின்போது செயல்களை ஒழுங்குபடுத்திக் கொள்வதே முக்கியமாக இருக்கலாம்.'],
 ['அனுபவமிக்கவர்களின் வழிகாட்டலை மதிக்கலாம்; அதே நேரத்தில் ஒரு கருத்தின் பயனைத் தனிப்பட்ட அனுபவத்தில் சோதிக்க விரும்பலாம். தந்தையுடன் கருத்து வேறுபாடு வந்தாலும் மரியாதை காப்பது முக்கியம்.','தொலைதூரப் பயணம், அதிக நேரம் அமர்ந்து படித்தல் போன்ற சூழல்களில் தொடை, இடுப்பு மற்றும் உடலின் இயக்கத்திற்கு ஏற்ற இடைவெளிகளை வைத்துக்கொள்ள விரும்பலாம்.'],
 ['செயலின் முடிவும் பொறுப்பை ஏற்ற விதமும் மதிப்பைப் பெற்றுத்தரும் என்ற எண்ணம் இருக்கலாம். தொழில் வளர்ச்சிக்காகத் தனிப்பட்ட நேரம் அனைத்தையும் விட்டுக்கொடுக்காமல் பணியைப் பகிர்வது உதவும்.','நீண்ட நேரம் நின்றோ உடல் உழைப்பில் ஈடுபட்டோ பணிபுரிந்தால் முழங்கால்களையும் உடல் இயக்கத்தையும் பேணிக்கொள்ள ஏற்ற ஓய்வு முறையைக் கடைப்பிடிப்பது உதவும்.'],
 ['ஆதாயம் கிடைத்த உடனே செலவிடாமல் அடுத்த இலக்கிற்குப் பயன்படுத்த வேண்டும் என்ற எண்ணம் இருக்கலாம். மூத்த உடன்பிறப்புகள் மற்றும் நண்பர்களிடம் எதிர்பார்ப்புகளைத் தெளிவாக வைத்தால் உறவு நிம்மதியாக இருக்கும்.','அதிகப் பயணங்களும் சந்திப்புகளும் தொடரும்போது கால்கள், கணுக்கால் பகுதி மற்றும் அன்றாட நடையின் வேகத்திற்கு ஏற்ற ஓய்வும் தேவைப்படலாம்.'],
 ['தனியாகச் சிந்திக்க வேண்டிய நேரத்தையும் நெருங்கியவர்களுக்கான நேரத்தையும் சமப்படுத்த முயல்வார். செலவுகளுக்கான எல்லையும் ஓய்வுக்கான இடமும் முன்பே திட்டமிடப்பட்டால் மனச்சுமை குறையலாம்.','நீண்ட நாள் உழைப்புக்குப் பிறகு பாதங்களுக்கும் உடலுக்கும் ஓய்வு கொடுப்பதும், தூக்க நேரத்தைத் தள்ளிப்போடாமல் இருப்பதும் மனநிறைவைப் பாதுகாக்க உதவும்.']
];
const DOMAIN_EN=[
 ['They may express determination through their posture and willingness to stay active. Sustained effort also needs regular rest.','Attention to their facial expression, head and general physical routines can help them recognise when to pause rather than push on.'],
 ['Words can strengthen or strain family trust. Earning income and keeping savings require distinct habits.','Eating habits, attention to teeth and voice can be part of everyday self-care.'],
 ['Practice may be more convincing than instructions alone. Mutual respect helps with younger siblings.','Hands, shoulders and ears are traditional bodily associations; take breaks during repetitive activity.'],
 ['A secure home and emotional ease can become linked. Property decisions benefit from checking practical needs.','A settled domestic rhythm can make space for comfortable breathing and emotional rest.'],
 ['Curiosity and education can develop through explaining ideas to others. Give younger people room to learn differently.','Concentration benefits when mealtimes and rest are regular.'],
 ['Problems may become manageable when broken into steps. Debt and workload both need boundaries.','Steady food, rest and digestion-related routines can support day-to-day comfort.'],
 ['Closeness works better when each person has a voice. Speak about expectations before shared decisions.','Close partners benefit from respecting physical comfort, privacy and consent.'],
 ['Change can be met by evaluating what still works. Sharing difficulties may prevent carrying them alone.','Private health needs and long-term care are better met through attention and sensible routines.'],
 ['Guidance can be respected without abandoning personal judgement. Differences with a father or mentor benefit from civility.','Thighs and hips are traditional physical associations; breaks during travel are useful.'],
 ['Competence is often shown through reliable work. Delegating can prevent professional duties from consuming private life.','Knees and mobility routines are the traditional physical focus.'],
 ['New gains may be used towards future aims. Clear expectations help in friendships and with elder siblings.','Lower legs and ankles are traditional physical associations.'],
 ['Time for reflection and people close to us both matter. Plan rest as deliberately as spending.','Feet, sleep and recuperation are traditional bodily associations, not a medical forecast.']
];
const CONDITION_TA={support:['செயல்பாட்டில் உதவும் சூழல் இருந்தால் இந்தத் திறனை நிதானமாக வளர்த்துக்கொள்ள இயலும்.','சரியான மனிதர்களின் ஒத்துழைப்புடன் எடுக்கும் முயற்சிகள் நிறைவடைவதற்கான வாய்ப்பு அதிகரிக்கலாம்.'],pressure:['மற்றவர்களின் வேகத்துக்கும் இவரது எதிர்பார்ப்புக்கும் இடையே வேறுபாடு இருந்தால் அழுத்தம் உணரலாம்.','ஒரே நேரத்தில் பல பொறுப்புகள் சேர்ந்தால் அந்தத் துறையில் கூடுதல் நிதானம் தேவைப்படலாம்.'],mixed:['சூழ்நிலை மாறும் போதெல்லாம் ஒரே அணுகுமுறையைப் பயன்படுத்தாமல் வழிமுறையை மாற்றிக் கொள்ள வேண்டியிருக்கும்.','ஒரு பக்கம் முயற்சிக்கான ஊக்கம் இருந்தாலும் மற்றொரு பக்கம் அதை ஒழுங்குபடுத்த வேண்டிய தேவை இருக்கலாம்.']};
const CONDITION_EN={support:['Supportive conditions can help this ability develop steadily.','Cooperation can make a practical ambition easier to carry through.'],pressure:['Differences in expectations and pace may create friction.','Several competing duties can require extra care.'],mixed:['A change of circumstances may call for a change of method.','Motivation may need to be balanced with patience and structure.']};
function addOnce(out, seen, text, house, evidence){if(!text)return;const key=text.trim().replace(/\s+/g,' ');if(seen.has(key))return;seen.add(key);out.push({house,text:key,evidence});}
function bestDistinct(xs,max){return [...new Set(xs)].slice(0,max);}
function state(d,house,options){
 const h=d.houses[house-1],natal=options.houseScore?options.houseScore(d,h):0;
 const p=d.planets[h.lord];
 const dignity=options.planetDignity?options.planetDignity(d,p):null;
 // Dignity and directional friendship refine, but never override the full house context.
 const dignityScore={exalted:2,moolatrikona:2,own:1,friend:1,neutral:0,enemy:-1,debilitated:-2}[dignity?.state]||0;
 const score=natal+Math.sign(dignityScore);
 return score>=2?'support':score<=-2?'pressure':'mixed';
}
function classify(d,p){return p?.dignity==='exalted'||p?.dignity==='own'?'support':p?.dignity==='debilitated'||p?.combust?'pressure':'mixed';}
function sentence(s){return s.replace(/\.$/,'')+'.';}
  const RESULTS_TA=[
   ['தன்னம்பிக்கையுடன் முன்னேற நினைக்கும் போது பிறரின் ஆலோசனையையும் கேட்டால் முடிவு வலுப்படும்.','தன்னிடம் உள்ள ஆற்றலை ஒரே நேரத்தில் பல வேலைகளில் செலவிட்டால் மனச்சோர்வு வரலாம்.','ஒரு சூழலில் துணிவாகவும் இன்னொரு சூழலில் நிதானமாகவும் நடந்துகொள்ளத் தெரிந்திருப்பது உதவும்.'],
   ['குடும்பப் பேச்சில் தெளிவும் செலவுகளில் கட்டுப்பாடும் இருந்தால் பணம் குறித்த நம்பிக்கை வளரும்.','உணர்ச்சிவசப்பட்டுக் கொடுத்த பணவாக்குறுதிகளைப் பின்னர் நிறைவேற்றுவது சிரமமாகலாம்.','சேமிக்க வேண்டும் என்ற விருப்பத்தையும் குடும்பத் தேவைக்குச் செலவிட வேண்டிய சூழலையும் சமப்படுத்தலாம்.'],
   ['திறமையைச் சிறு முயற்சிகளாகத் தொடர்ந்து பயிற்சி செய்தால் பயன் தென்படலாம்.','மற்றவருடன் போட்டியிட்டு எல்லாவற்றையும் விரைவாக முடிக்க நினைத்தால் உறவில் உரசல் வரலாம்.','துணிவுடன் தொடங்கிய காரியத்தைத் திட்டமிட்டு நிறைவேற்றுவது முக்கியம்.'],
   ['வீட்டில் கருத்துப் பரிமாற்றத்துக்கும் தனிப்பட்ட அமைதிக்கும் இடமளித்தால் குடும்பம் நெருக்கமாகலாம்.','வெளியிலுள்ள பொறுப்புகளை வீட்டிற்குக் கொண்டுவந்தால் ஓய்வும் அன்பும் குறையலாம்.','வீட்டின் வசதிக்கான விருப்பத்தையும் பணச்சுமையையும் ஒப்பிட்டு முடிவு எடுக்கலாம்.'],
   ['கற்றதைப் புரிந்துகொண்டு பகிரும் ஆர்வம் குடும்பத்திலும் கல்வியிலும் பயனுள்ளதாக அமையலாம்.','தன் சிந்தனையை மற்றவர்கள் உடனே ஏற்க வேண்டும் என்ற எதிர்பார்ப்பு அழுத்தத்தைத் தரலாம்.','ஆர்வத்தோடு கற்றாலும் அதனை நடைமுறையில் சோதித்துப் பயன்படுத்துவது நல்லது.'],
   ['ஒழுங்கான வேலை அட்டவணை, கடன் திட்டம், நேரக் கட்டுப்பாடு ஆகியவை சிக்கலைக் குறைக்க உதவும்.','அனைத்துப் பிரச்சினைகளையும் தானே சரிசெய்யும் முயற்சியில் வேலைச்சுமை அதிகரிக்கலாம்.','வேலைக்கான முயற்சிக்கும் உடலுக்கான ஓய்வுக்கும் சமமான இடம் கொடுக்கலாம்.'],
   ['ஒருவருக்கொருவர் பேசிச் சமாதானம் கண்டுகொள்ளும் அணுகுமுறை உறவை வலுப்படுத்தலாம்.','மனம் புண்பட்டதை வெளிப்படுத்தாமல் சேர்த்துவைத்தால் சிறிய கருத்து வேறுபாடும் பெரிதாகலாம்.','ஒன்றாக இருக்க வேண்டிய தேவையும் தனிப்பட்ட சுதந்திரமும் இருவருக்கும் முக்கியம்.'],
   ['சவால் வந்தபோது பழைய அனுபவத்தைப் பயன்படுத்தி வேறு வழி அமைக்கும் திறன் உதவலாம்.','திடீரெனத் தீர்மானம் எடுப்பதைவிட நம்பகமான தகவலைச் சரிபார்ப்பது பாதுகாப்பாக இருக்கும்.','பாதுகாப்பைத் தேடும் எண்ணத்துடன் மாற்றத்தையும் மெதுவாக ஏற்கக் கற்றுக்கொள்ளலாம்.'],
   ['ஆசிரியர் அல்லது மூத்தவர் கூறியதைத் தன் அனுபவத்துடன் இணைக்கும்போது அறிவு வளரலாம்.','தன் கருத்தை மட்டுமே முழு உண்மை என்று கருதினால் நல்ல வழிகாட்டலையும் தவறவிடலாம்.','மரபின் அனுபவத்துக்கும் புதிய அறிவுக்கும் இரண்டிற்கும் இடம் தரலாம்.'],
   ['பணியைச் சரியானவர்களுடன் பகிர்ந்து முடிப்பதால் தொழிலில் நம்பிக்கை அதிகரிக்கலாம்.','உழைப்புக்குரிய அங்கீகாரம் உடனடியாக வராவிட்டால் விரக்தியால் முடிவு எடுக்க வேண்டாம்.','முன்னேற்றத்துடன் குடும்பத்திற்கான நேரத்தையும் இணைத்துத் திட்டமிடுவது பயனளிக்கும்.'],
   ['சுற்றத்தாரின் ஒத்துழைப்பையும் தன் திறமையையும் இணைத்தால் சில இலக்குகளை எளிதாக அணுகலாம்.','நண்பருக்காக அளவுக்கு மீறிய பொருளாதாரப் பொறுப்பை ஏற்றால் மனக்கசப்பு ஏற்படலாம்.','புதிய வருமான வாய்ப்புக்கும் நீண்டகாலச் சேமிப்புக்கும் இடையே சமநிலை தேவை.'],
   ['ஓய்வையும் தனிமையையும் விருப்பமாகத் திட்டமிட்டால் மனதுக்குத் தெளிவு கிடைக்கலாம்.','சோர்வை மறைத்து வேலை தொடர்ந்தால் உடலுக்குத் தேவையான பராமரிப்பு தள்ளிப்போகலாம்.','பிறருக்கான நேரத்துடன் தனக்கான அமைதியான நேரத்தையும் ஒதுக்கிக்கொள்ளலாம்.']
  ];
  const RESULTS_EN=[
   ['Confidence is more useful when balanced with advice.','Taking on everything at once can become exhausting.','Resolve and patience can support each other.'],
   ['Clear promises and measured spending support family trust.','Emotional financial promises may be hard to keep.','Saving and meeting family needs both matter.'],
   ['Steady practice can turn curiosity into skill.','Competition can put strain on personal ties.','Initiative works best when followed through.'],
   ['Space for conversation can improve home life.','Work pressure may consume family time.','Comfort and financial responsibility need balancing.'],
   ['Sharing what is learned can benefit others.','Demanding agreement can make learning stressful.','Curiosity improves through practical testing.'],
   ['A workable routine can reduce competing duties.','Doing every task personally may increase pressure.','Effort and rest need equal attention.'],
   ['Talking through disagreement can protect closeness.','Unspoken resentment may grow.','Independence and togetherness can coexist.'],
   ['Experience may help in rebuilding after change.','Verify facts before acting suddenly.','Security can be balanced with gradual adaptation.'],
   ['Combining guidance with experience can deepen understanding.','Rigid convictions may exclude useful advice.','Old and new perspectives can coexist.'],
   ['Sharing tasks may build professional trust.','Lack of recognition need not dictate decisions.','Career growth and family time both count.'],
   ['Cooperation can help personal ambitions.','A friend’s financial obligation should not become one’s own automatically.','Income and reserves require different plans.'],
   ['Planned time alone may restore clarity.','Working through fatigue can postpone needed rest.','Keep room for both companionship and solitude.']
  ];

// V288: contextual D1 narrative synthesis. No chart math is recalculated here.
const IMPACT_TA = [
// Character
['தன் முடிவுக்கு மதிப்புக் கிடைக்க வேண்டும் என்ற எண்ணம் அவருடைய சுயமரியாதையைத் தூண்டலாம்.','உடனிருப்பவர்களின் உணர்ச்சியை விரைவாகப் புரிந்துகொள்வதால் தன் முடிவையே மறுபரிசீலனை செய்யலாம்.','சிக்கலைத் தள்ளிப்போடாமல் நேருக்கு நேர் சந்திக்கும் துணிவு வெளிப்படலாம்.','எதற்கும் காரணம் கேட்டு அறிந்த பிறகே உறுதியாகப் பேச விரும்பலாம்.','நடந்த அனுபவத்தில் இருந்து நெறியைத் தேடி மற்றவர்களுக்கு வழிகாட்ட முனைவார்.','மற்றவர் மனம் புண்படாதவாறு நடப்பதில் அக்கறை எடுத்துக்கொள்வார்.','ஒரு பொறுப்பை ஏற்றால் முடிவு வரும்வரை பிடிவாதமாக உழைக்க விரும்பலாம்.','வழக்கமான தீர்வுக்கு மாறான வாய்ப்பைத் தேடுவதில் ஆர்வம் இருக்கலாம்.','தனக்கென அமைதியான நேரம் ஒதுக்கி ஆழமாகச் சிந்திக்க விரும்பலாம்.'],
// Family
['குடும்பத்தில் தன் வாக்குறுதியை நிலைநிறுத்துவதே கௌரவம் என்ற எண்ணம் இருக்கலாம்.','குடும்பத்தினரின் மனநிலைக்கு ஏற்ப பேச்சின் நயத்தை மாற்றிக்கொள்வார்.','பணப் பிரச்சினையை உடனே தீர்க்க முயலும்போது கடுமையாகப் பேசுவதைத் தவிர்க்க வேண்டும்.','சேமிப்பு, கணக்கு, ஆவணங்கள் ஆகியவற்றைத் தெளிவாக வைத்திருக்க விரும்பலாம்.','குடும்பப் பொருளாதாரத்தில் நியாயமும் நீண்டகாலத் திட்டமும் முன்னிலையாகலாம்.','உறவுகளுக்காகச் செலவிடுவதிலும் வசதிகளைப் பகிர்வதிலும் மகிழ்ச்சி காணலாம்.','வீட்டுச் செலவுக்கு தெளிவான எல்லை வைக்க முயல்வார்.','வருமானத்திற்கு புதிய வழிகளை ஆராயும் ஆர்வத்துடன் அபாயத்தையும் கணக்கிட வேண்டும்.','தேவையற்ற பேச்சையும் செலவையும் குறைத்து எளிமையைத் தேர்ந்தெடுக்கலாம்.'],
// Initiative
['முயற்சியைத் தொடங்கும்போது தலைமை ஏற்கும் விருப்பம் மேலோங்கலாம்.','உடன்பிறந்தோரின் தேவைகளை அறிந்து இணைந்து முயற்சி செய்ய விரும்பலாம்.','தடை வந்தால் செயலிலேயே பதில் அளிக்கும் துணிவு வெளிப்படும்.','எழுத்து, தகவல் பரிமாற்றம், பயிற்சி வழியாகத் திறமை வளர்க்க முயல்வார்.','கற்ற திறனை மற்றவருடன் பகிர்ந்தால்தான் அதன் மதிப்பு நிறைவு பெறும் என்று எண்ணலாம்.','கலைநயத்தோடு ஒரு திறமையை வளர்ப்பதில் ஆர்வம் இருக்கலாம்.','மெதுவான பயிற்சியையும் தொடர்ந்து செய்வதால் திறன் வலுப்படலாம்.','ஒரே வழியைப் பிடிக்காமல் புதிய முறைகளை முயன்று பார்க்க விரும்பலாம்.','குறைவாகப் பேசிச் செயலின் உள்ளார்ந்த தரத்தை மேம்படுத்த முயல்வார்.'],
// Home
['வீட்டில் பொறுப்பை ஏற்று அனைவருக்கும் தெளிவான ஒழுங்கை ஏற்படுத்த விரும்பலாம்.','வீட்டாரின் மனநிலையைத் தன் அமைதியுடன் தொடர்புபடுத்திக் கொள்வார்.','சொத்து அல்லது வாகன முடிவில் அவசரம் காட்டாமல் கருத்து கேட்பது உதவும்.','வீட்டுத் திட்டங்கள், ஆவணங்கள், பழுது பார்ப்பு ஆகியவற்றில் விவரம் பார்த்துச் செயல்படலாம்.','மூத்தவர்களின் அனுபவத்தைக் கேட்டு குடும்ப முடிவு எடுப்பதில் நம்பிக்கை வைப்பார்.','வீட்டின் அழகையும் அன்பான சூழலையும் பேணுவதில் கவனம் செலுத்தலாம்.','குடும்பத்திற்கு நீண்டகாலப் பாதுகாப்பு அமைப்பதில் பொறுப்புணர்வு இருக்கும்.','வசிப்பிடத்தில் மாற்றம் தேடும்போது நிதி மற்றும் குடும்பத் தேவையை ஒப்பிட வேண்டும்.','வெளிச் சத்தத்திலிருந்து விலகிய தனிப்பட்ட இடம் இவருக்கு அமைதியைத் தரலாம்.'],
// Education
['கற்றதைச் செய்து காட்டி அங்கீகாரம் பெற விரும்பலாம்.','குழந்தைகள் அல்லது மாணவர்களின் உணர்வைப் புரிந்துகொண்டு கற்பிக்க முயல்வார்.','போட்டியில் விரைவாக முன்னேற வேண்டும் என்ற எண்ணம் பயிற்சியைத் தூண்டலாம்.','ஒரு விஷயத்தைப் பல கோணங்களில் படித்து விளக்கும் திறன் வளரலாம்.','அறிவைப் பகிரும் வாய்ப்புகள் படிப்பு மற்றும் வழிகாட்டுதலுக்கு ஊக்கம் தரலாம்.','கலை, மொழி அல்லது படைப்பாற்றலைக் கற்றலில் இணைக்க விரும்பலாம்.','மெதுவாகப் புரிந்தாலும் ஆழமாகத் தேர்ச்சி பெறுவது இவருக்குப் பொருந்தலாம்.','புதுமையான கல்வி வழியை நாடும்போது அடிப்படைத் திறனையும் பேண வேண்டும்.','தனியாக வாசிப்பதும் ஆராய்வதும் சிந்தனையைத் தெளிவாக்கலாம்.'],
// Service
['வேலைக்கான பொறுப்பில் தன் திறனை நிரூபிக்க விரும்பலாம்.','சக பணியாளர்களின் மனநிலையை உணர்ந்து வேலைப் பகிர்வு செய்ய முயல்வார்.','போட்டியை எதிர்கொள்ளும் வேகம் அதிகம் இருந்தாலும் அவசரச் சண்டையைத் தவிர்க்க வேண்டும்.','சிறிய தவறுகளை முன்பே கண்டுபிடித்து தினசரிப் பணியைச் சீரமைக்கலாம்.','சிக்கலுக்கு வழிகாட்டி அமைதியாகத் தீர்வு காண விரும்பலாம்.','கடினமான வேலை உறவிலும் மரியாதை காக்க முயல்வார்.','நீண்டகால உழைப்பால் போட்டியைச் சமாளிக்க வேண்டிய நிலை அமையலாம்.','புதிய வேலை முறையை முயலும்போது அதன் செலவையும் அபாயத்தையும் சோதிக்க வேண்டும்.','தனித்து கவனமாகச் செய்யும் பணியில் திருப்தி காணலாம்.'],
// Marriage
['உறவில் தன்மானமும் ஒருவருக்கொருவர் மதிப்பளிப்பதும் முக்கியமாக இருக்கலாம்.','துணைவரின் மனக்கவலையை உணர்ந்து ஆறுதல் கூற விரும்பலாம்.','கூட்டாக எடுக்கும் முடிவில் நேரடித்தன்மை உதவினாலும் வேகத்தைக் குறைப்பது நல்லது.','பேசித் தெளிவுபடுத்தும் பழக்கம் சிறிய கருத்துவேறுபாடுகளைத் தவிர்க்கலாம்.','உறவில் நம்பிக்கையும் நீண்டகாலப் பொறுப்பும் முன்னிலையாகலாம்.','அன்பையும் அன்றாட அக்கறையையும் வெளிப்படுத்துவதற்கு முக்கியத்துவம் கொடுப்பார்.','உறவுக்காகச் சுமக்கும் கடமை உணர்வை உரையாடலுடனும் இணைக்க வேண்டும்.','வித்தியாசமான எதிர்பார்ப்புகளை வெளிப்படையாகப் பேசுவது புரிதலை வளர்க்கலாம்.','தனிப்பட்ட இடமும் நெருக்கமும் இரண்டும் தேவைப்படலாம்.'],
// Change
['சவால் வந்தால் தன்னம்பிக்கையுடன் முன்னின்று சமாளிக்க விரும்பலாம்.','எதிர்பாராத மாற்றங்கள் மனதைத் தொடும் போது நம்பகமானவருடன் பேசுவது உதவும்.','அவசரத் தீர்வு ஒரு சிக்கலைக் கூட்டாமல் இருக்கத் தகவலைச் சரிபார்க்க வேண்டும்.','மாறிய சூழலைத் தெளிவாகப் புரிய ஆவணங்களையும் காரணங்களையும் ஆராய்வார்.','கடின அனுபவத்தில் இருந்து வாழ்க்கைப் பாடம் கற்க முனைவார்.','மாற்றம் வந்தாலும் உறவுகளின் ஆதரவைப் பேண முயல்வார்.','நீண்டகாலச் சவாலைச் சிறு படிகளாகக் கையாளும் நிதானம் இருக்கலாம்.','புதிதாகக் கிடைக்கும் வழியின் அபாயத்தை முன்பே மதிப்பிட வேண்டும்.','சில மாற்றங்களைத் தனியாக ஆராய்ந்த பிறகே பிறரிடம் பகிர விரும்பலாம்.'],
// Guidance
['தன் கொள்கையை வெளிப்படையாகக் கூறுவதில் உறுதி இருக்கலாம்.','தந்தை அல்லது ஆசிரியரின் உணர்வைக் கருத்தில் கொண்டு ஆலோசனையை ஏற்றுக்கொள்வார்.','தொலைநோக்கை நோக்கிய பயணத்தில் துணிவுடன் செயல்பட விரும்பலாம்.','கேள்வி கேட்டு காரணம் புரிந்த பின்னரே ஒரு கருத்தை ஏற்றுக்கொள்ளலாம்.','ஆசிரியர், பெரியவர், நூல்கள் ஆகியவற்றின் வழி அறிவைப் பெருக்க ஆர்வம் இருக்கலாம்.','கலை மற்றும் மனித உறவுகள் வழியே மதிப்பீடுகளை வளர்த்துக்கொள்ளலாம்.','நீண்டகால அனுபவத்தை மதிப்பதால் மெதுவாகக் கற்றாலும் உறுதியாக நிற்பார்.','புதிய சிந்தனையை ஆராயும்போது உண்மைத் தகவல்களைப் பிரித்தறிய வேண்டும்.','தனிமையில் சிந்திப்பதும் ஆன்மிகக் கேள்விகளைக் கேட்பதும் ஈர்க்கலாம்.'],
// Career
['தொழிலில் பொறுப்பு அல்லது தலைமை ஏற்க வேண்டும் என்ற ஆசை வரலாம்.','பணியிட மனிதர்களின் தேவையைப் புரிந்துகொண்டு ஒத்துழைக்க முயல்வார்.','தாமதமான வேலையை விரைந்து முடிக்க முயல்வதுடன் குழுவின் வேகத்தையும் மதிக்க வேண்டும்.','தகவல், கணக்கு, திட்டமிடல் ஆகியவற்றின் மூலம் வேலைத் திறன் வெளிப்படலாம்.','ஆலோசனை, பயிற்சி அல்லது வழிகாட்டுதல் பொறுப்பில் திருப்தி இருக்கலாம்.','வாடிக்கையாளர் உறவு மற்றும் பணியிட மரியாதைக்கு முக்கியத்துவம் கொடுப்பார்.','கட்டமைப்பு மற்றும் நீடித்த முயற்சியின் மூலம் முன்னேற்றம் நாடலாம்.','புதிய தொழில்நுட்பத்தையோ வேறுபட்ட பணிமுறையையோ முயன்று பார்க்கலாம்.','ஆழமாக ஆராய்ந்து அமைதியாக முடிக்கும் வேலை இவருக்குப் பொருந்தலாம்.'],
// Income
['தன் முயற்சிக்கான உரிய பலன் கிடைக்க வேண்டும் என்ற எதிர்பார்ப்பு இருக்கலாம்.','நண்பர்களின் உணர்வையும் குடும்பத் தேவையையும் கருத்தில் கொண்டு ஆதாயத்தைப் பகிர்வார்.','அதிக வருமானம் தேடும் வேகத்துடன் இழப்பு அபாயத்தையும் அளவிட வேண்டும்.','தொடர்பு வட்டம், தகவல் மற்றும் கணக்குப் பழக்கம் ஆதாய வாய்ப்புகளை அறிய உதவலாம்.','நீண்டகால இலக்கை நோக்கிய முதலீட்டுச் சிந்தனை மேலோங்கலாம்.','உறவுகளின் ஒத்துழைப்பும் கலைநயமான முயற்சியும் ஆதரவாக இருக்கலாம்.','மெதுவாகச் சேமித்து வளர்த்துக் கொள்ளும் ஒழுங்கு இருக்கலாம்.','புதுமையான வாய்ப்புகளில் ஈர்ப்பு இருந்தாலும் நம்பகத்தன்மையைச் சரிபார்க்க வேண்டும்.','தேவைப்பட்ட அளவிலான உறவுகளையே பேணி எளிமையான இலக்கை நாடலாம்.'],
// Spending
['தனக்கான நேரத்தைச் செலவிடுவதிலும் தன் விருப்பத்துக்கு முக்கியத்துவம் கொடுக்கலாம்.','பிறருக்காகச் செலவிடும்போது உணர்ச்சி முடிவுகள் வராமல் எல்லை வைக்க வேண்டும்.','உடனடி வசதிக்காகச் செலவிடும் அவசரத்தைத் திட்டத்துடன் சமப்படுத்தலாம்.','செலவுகளைப் பதிவு செய்தால் மனஅமைதியுடன் ஓய்வையும் திட்டமிடலாம்.','சேவை, கற்றல் அல்லது தானம் சார்ந்த செலவில் அர்த்தம் காணலாம்.','அழகான சூழலும் சுகமான ஓய்வும் வேண்டி செலவிட விரும்பலாம்.','வீண்செலவைக் கட்டுப்படுத்தி நீண்டகாலப் பாதுகாப்புக்காக ஒதுக்கலாம்.','திடீர் செலவுக்கு முன் இரண்டாம் முறை யோசித்துப் பார்க்க வேண்டும்.','தனிமை, வாசிப்பு அல்லது ஆன்மிகத் தேடலில் ஓய்வு காணலாம்.']
];
const IMPACT_EN = [
['Recognition for a considered decision may matter to them.','They may reassess a choice after noticing how someone else feels.','They may prefer facing a problem directly instead of delaying it.','They may ask for reasons before committing to a view.','They may turn experience into advice for others.','They may take care not to bruise another person’s feelings.','They may persevere with a duty long after others have stopped.','An unconventional solution may catch their attention.','Private reflection may help them reach a decision.'],
['Keeping a promise may be central to family trust.','The tone of a family conversation may change with others’ feelings.','A quick response to money worries may need softer words.','Clear records can make earnings and savings easier to distinguish.','Long-term fairness may guide family financial decisions.','Sharing comforts may be a way of expressing affection.','Setting a budget may feel like a duty to the household.','Fresh income ideas need a check on risk as well as promise.','They may prefer fewer commitments and simpler spending.'],
['They may be willing to take the lead in a new effort.','Attending to siblings’ needs may encourage teamwork.','They may answer obstacles through action rather than argument.','Writing, explanation or structured practice may build skill.','Sharing a learned skill may feel as important as acquiring it.','Artistic care may shape how they practise a craft.','Small repeated efforts may suit their learning pace.','They may test a different method when the first fails.','Working quietly on underlying quality may appeal to them.'],
['They may try to bring order to household responsibilities.','The emotional atmosphere at home can affect their ease.','Property and vehicle choices should not be rushed.','Household plans and documents may receive detailed attention.','They may seek an elder’s advice in a family decision.','Beauty and warmth may matter in their domestic setting.','Building long-term security for family may feel important.','A change of residence should be weighed against family and cost.','A private, quiet space may help them recover.'],
['They may prefer demonstrating what they have learned.','They may teach with an awareness of a learner’s feelings.','Competition may motivate practice but also impatience.','They may examine a subject from several angles before explaining it.','Learning and mentoring may reinforce each other.','Language, art or creativity may enliven study.','Deep understanding may come through steady repetition.','New learning methods work best alongside firm foundations.','Private study may sharpen their thinking.'],
['They may want to be accountable for work entrusted to them.','Sensing colleagues’ concerns may help teamwork.','Speed in competition is useful only when temper is managed.','Checking small errors may improve daily work.','They may resolve difficulties by advising patiently.','Courtesy may protect a difficult working relationship.','Progress may depend on sustained effort rather than a shortcut.','A new procedure should be tested for cost and risk.','They may value tasks requiring quiet concentration.'],
['Mutual respect may be as important as affection in partnership.','They may notice a partner’s distress and offer comfort.','Directness can help joint decisions when paired with patience.','Talking through expectations may prevent avoidable disputes.','They may value reliability and long-term commitment.','They may show care through gestures and daily attention.','Responsibility should not replace emotional conversation.','Unusual expectations are easier to manage when stated openly.','They may need both closeness and private space.'],
['They may prefer taking charge when a challenge arrives.','Unexpected change may be easier to face with trusted support.','Checking the facts can prevent a hurried answer from worsening a problem.','They may examine the reasons and records behind a change.','Difficult experience may prompt deeper learning.','They may try to keep relationships steady during disruption.','Breaking a long challenge into stages may help.','The risks of a new opening need assessment.','They may prefer to process a change privately before discussing it.'],
['They may speak firmly about values and convictions.','An elder’s feelings may shape how guidance is received.','They may pursue a distant goal with courage.','They may question an idea before accepting it.','Teachers, books and experienced people may attract their attention.','Art and human relationships may shape their beliefs.','They may respect lessons earned through long experience.','New beliefs may require careful distinction between claim and evidence.','Solitude may foster philosophical or spiritual questions.'],
['They may hope to take responsibility or lead at work.','Understanding colleagues’ needs may encourage cooperation.','Finishing quickly must be balanced with a team’s pace.','Information, accounts and planning may showcase their skills.','Teaching or advisory roles may feel rewarding.','Client relationships and workplace courtesy may matter.','They may seek progress through structure and persistence.','They may experiment with tools or unfamiliar procedures.','Quiet investigation and accurate delivery may suit them.'],
['They may expect fair returns for sustained effort.','They may balance friends’ needs against family resources.','Higher earnings should be weighed against possible loss.','Networks, information and records may reveal opportunities.','Long-range goals may guide their saving and investment habits.','Collaboration and creative work may contribute to their aims.','Accumulating reserves slowly may suit them.','New opportunities deserve verification before commitment.','They may prefer a close circle and modest financial goals.'],
['They may want control over how private time is spent.','Emotional spending on others needs clear limits.','Spontaneous purchases may need a second look.','Recording outgoings may make room for planned rest.','They may find meaning in spending on learning or service.','Comfort and beauty may draw part of their budget.','They may keep expenses restrained for future security.','Unexpected expense deserves careful review.','Quiet study or contemplation may feel restorative.']
];
const KEY_ORDER=['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu'];
const CONTEXT_TA=[
'தன்னம்பிக்கையை வெளிப்படுத்த வேண்டிய தருணங்கள்',
'குடும்பத்தின் தேவைகளையும் பண வரவுச் செலவையும் சமாளித்த அனுபவங்கள்',
'சொந்த முயற்சியிலும் உடன்பிறந்தோருடனான பழக்கத்திலும் கிடைக்கும் பாடங்கள்',
'வீட்டின் அமைதி, தாயாரின் நலம், சொத்து சார்ந்த பொறுப்புகள்',
'படிப்பு, சிந்தனை, படைப்பாற்றல், இளையவர்களைக் கவனித்தல்',
'அன்றாட வேலை, போட்டி, கடன் மற்றும் வழக்கமான உடல்நலப் பராமரிப்பு',
'நெருங்கிய உறவு, துணைவர், கூட்டாக எடுக்கும் முடிவுகள்',
'சிக்கலுக்குப் பிறகு மீண்டும் வழக்கத்தை அமைத்துக்கொள்ளும் அனுபவங்கள்',
'தந்தை, ஆசிரியர்கள், தொலைவான முயற்சிகள் மற்றும் நம்பிக்கைகள்',
'தொழிலில் செய்யும் வேலை, பொறுப்புப் பகிர்வு மற்றும் பொதுமரியாதை',
'நண்பர்கள், மூத்த உடன்பிறப்புகள், ஆதாயம் மற்றும் எதிர்கால இலக்குகள்',
'செலவுகள், தூக்கம், தனிப்பட்ட நேரம், தனிமையில் கிடைக்கும் தெளிவு'
];
const CONTEXT_EN=[
'moments requiring personal confidence',
'family needs and the management of earnings and spending',
'experience gained through personal effort and siblings',
'home, care for a mother and responsibilities involving property',
'education, creativity and caring for younger people',
'daily work, competition, debt and health routines',
'close relationships and shared decisions',
'learning to rebuild a routine after disruption',
'parents, teachers, long journeys and guiding beliefs',
'work, shared responsibility and public expectations',
'friends, elder siblings, gains and future plans',
'expenses, sleep, private time and reflective solitude'
];
const FOCUS_TA=[
'தன்னைப் பற்றிய முடிவுகளை எடுத்துக் கொள்ளும் விதத்தில்',
'வீட்டில் பணத்தைப் பற்றிப் பேசும் விதத்தில்',
'ஒரு திறமையைப் பயின்று செயல்படுத்தும் விதத்தில்',
'வீட்டு வசதியையும் குடும்பப் பொறுப்பையும் கையாளும் விதத்தில்',
'கற்றலைத் தொடரவும் இளையவர்களை வழிநடத்தவும் எடுக்கும் முடிவுகளில்',
'வேலைச்சுமை அல்லது போட்டியைச் சமாளிக்கும் வழியில்',
'துணைவருடனோ நெருங்கியவருடனோ முடிவைப் பகிரும் போது',
'திடீரென வந்த மாற்றத்திற்கு மாற்று வழி தேடும் போது',
'பெரியோர் அறிவுரையைத் தன் அனுபவத்துடன் பொருத்தும் போது',
'தொழில் பணிகளைத் தேர்ந்தெடுத்து நிறைவேற்றும் முறையில்',
'வருமான வாய்ப்பையும் நட்பின் பொறுப்பையும் அளவிடும்போது',
'செலவுக்கும் தனிப்பட்ட ஓய்வுக்கும் எல்லை அமைக்கும் போது'
];
const FOCUS_EN=[
'in personal decision-making',
'in conversations about household finances',
'when learning and applying a skill',
'when balancing comfort against family duties',
'when deciding how to study or mentor younger people',
'when handling workload or competition',
'when making shared decisions in a close relationship',
'when finding an alternative after sudden change',
'when weighing guidance against experience',
'when choosing and completing professional tasks',
'when judging income options and obligations to friends',
'when setting boundaries for spending and rest'
];
// Bodily associations are traditional lifestyle themes, never a disease diagnosis.
const BODY_TA=[
'உடலின் இயக்கம், தலைப்பகுதி, முகத்தின் வெளிப்பாடு போன்றவற்றில் சோர்வைக் கவனிக்காமல் கடமையைத் தொடர வேண்டாம்.',
'உணவு நேரம், வாய், பற்கள் மற்றும் குரலுக்கான அன்றாடப் பராமரிப்பில் ஒழுங்கு உதவும்.',
'கைகள், தோள்கள், காதுகள் சார்ந்த வேலைகளில் ஒரே அசைவை நீண்ட நேரம் தொடர்ந்தால் இடைவெளி எடுப்பது நல்லது.',
'நெஞ்சுப் பகுதி, மூச்சுவிடும் வசதி, வீட்டில் ஓய்வெடுக்கக்கூடிய சூழல் ஆகியவற்றை அன்றாடப் பழக்கத்தில் கவனிக்கலாம்.',
'நீண்ட நேரம் படிக்கும்போது உணவு, வயிற்றுப் பகுதியின் வசதி, ஓய்வு ஆகியவற்றுக்கும் நேரம் ஒதுக்க வேண்டும்.',
'வேலை இடைவெளி, உணவு ஒழுங்கு, செரிமான வசதி ஆகியவற்றில் நடைமுறைக்கு ஏற்ற வழக்கத்தைப் பேணுவது உதவும்.',
'நெருக்கமான உறவில் தனிப்பட்ட உடல் வசதி, பரஸ்பர எல்லைகள், மன அமைதி ஆகியவற்றுக்கு உரிய இடம் தர வேண்டும்.',
'நீண்டகால மனஅழுத்தம் ஏற்பட்டால் ஓய்வையும் தனிப்பட்ட உடல்நலத் தேவைகளுக்கான உரிய பராமரிப்பையும் தள்ளிப் போட வேண்டாம்.',
'பயணங்களிலும் நீண்ட நேரம் அமர்ந்து படிக்கும் சூழலிலும் இடுப்பு, தொடை மற்றும் நடை இயக்கத்திற்குத் தேவையான இடைவெளி உதவும்.',
'நீண்ட நேரம் பணிபுரியும் போது முழங்கால், உடல் இயக்கம், பணிக்கிடையேயான ஓய்வு ஆகியவற்றில் கவனம் தேவை.',
'பயணமும் சந்திப்பும் அதிகமான நாட்களில் கால்கள், கணுக்கால்கள் மற்றும் நடையின் வேகத்திற்கு ஏற்ப ஓய்வு எடுத்துக்கொள்ள வேண்டும்.',
'தூக்க நேரம், பாதங்களின் ஓய்வு, தனிமையில் மனதைத் தெளிவாக்கும் நேரம் ஆகியவற்றை இயல்பான வழக்கமாக வைத்துக்கொள்ளலாம்.'
];
const BODY_EN=[
'Pay attention to fatigue, general movement and the head rather than working through every sign of tiredness.',
'Regular food, dental and voice-care habits can support everyday comfort.',
'Hands, shoulders and ears are traditional associations here; repetitive work deserves proper pauses.',
'Comfortable breathing, chest ease and a restful environment at home merit attention.',
'Study routines should allow time for meals, abdominal comfort and rest.',
'Daily workloads are easier to sustain with breaks, regular meals and suitable digestive routines.',
'Partners benefit when physical comfort, personal boundaries and emotional ease are respected.',
'Long-term stress should not push private health needs or necessary care out of sight.',
'Travel and lengthy sitting call for pauses to move the hips and thighs comfortably.',
'Long workdays call for consideration of knees, movement and rest.',
'Busy travel and social schedules warrant rest for feet, calves and ankles.',
'A consistent sleep routine, rest for the feet and time for quiet recovery may help.'
];
const LINK_OUTCOME_TA=[
'இதனால் தன்னம்பிக்கை உருவாகும் முறையும் பிறரை அணுகும் விதமும் மாறக்கூடும்.',
'இதனால் வீட்டில் பேசும் நயமும் செலவுகளைப் பகிரும் முடிவும் பாதிக்கப்படலாம்.',
'இதனால் முயற்சி தொடங்கும் நேரமும் அதைத் தொடர்ந்து செய்வதற்கான ஒழுங்கும் மாறக்கூடும்.',
'இதனால் மனநிம்மதி, வீட்டுக்கான செலவு, குடும்பத்துடன் செலவிடும் நேரம் ஆகியவற்றில் முன்னுரிமை மாறலாம்.',
'இதனால் எதைத் தொடர்ந்து கற்க வேண்டும், யாருக்கு நேரம் ஒதுக்க வேண்டும் என்ற தீர்மானம் உருவாகலாம்.',
'இதனால் வேலையைப் பகிரும் முறையும் கடனுக்கான எச்சரிக்கையும் முக்கியத்துவம் பெறலாம்.',
'இதனால் நெருக்கமானவர்களுடன் பேசும் முறையும் பரஸ்பர எதிர்பார்ப்பும் தெளிவடைய வேண்டியிருக்கும்.',
'இதனால் ஒரு மாற்றத்தை ஏற்கும் வேகமும் உதவி கேட்கும் முறையும் மாறக்கூடும்.',
'இதனால் வழிகாட்டுதலை ஏற்கும் விதமும் எதிர்காலத்திற்கான நம்பிக்கையும் வலுப்பெறலாம்.',
'இதனால் வேலையில் ஏற்கும் பொறுப்பும் அதை நிறைவேற்றும் நடைமுறையும் மாறக்கூடும்.',
'இதனால் நண்பருக்கு உதவுவது, ஆதாயத்தைச் சேமிப்பது ஆகிய இரண்டுக்கும் எல்லை அமைக்க வேண்டியிருக்கும்.',
'இதனால் செலவுத் திட்டத்தோடு ஓய்வுக்கும் தனிப்பட்ட இடத்துக்கும் மதிப்பு கொடுக்க வேண்டியிருக்கும்.'
];


const BODY_CONTEXT_TA=[
'தன் உடல் சோர்வைப் பிறர் கவனிக்கும்வரை காத்திருக்காமல் ஓய்வெடுக்க வேண்டும்.',
'உணவு நேரமும் குடும்பச் செலவுகளும் ஒரே நேரத்தில் குழம்பாதபடி ஒழுங்கு அமைக்கலாம்.',
'அடிக்கடி பயிற்சி செய்வோர் கைகள் மற்றும் தோள்களுக்கான இடைவெளியை மறக்க வேண்டாம்.',
'வீட்டுச் சூழலில் மனம் அமைதியாகும் நேரத்தைப் பாதுகாக்கலாம்.',
'நீண்ட படிப்பு அல்லது சிந்தனை நேரங்களுக்கிடையில் உடலை அசைக்கும் இடைவெளி தேவை.',
'தினசரி வேலை நேரம் நீளும்போது உணவும் ஓய்வும் தவறாத பழக்கம் பயனளிக்கும்.',
'உறவுகளில் பிறருக்காக நேரம் ஒதுக்கும்போதும் தன் தூக்கம் மற்றும் ஓய்வை மறக்கக் கூடாது.',
'மாற்றங்களைச் சமாளிக்கும்போது கவலையைத் தனியாகச் சுமக்காமல் நம்பகமான உதவி நாடலாம்.',
'பயணத் திட்டங்களில் உடலின் வசதிக்கான இடைநிறுத்தங்களை முன்கூட்டியே சேர்க்கலாம்.',
'பணி பொறுப்புகள் கூடினாலும் ஓய்வு நேரத்தை நிரந்தரமாக ஒத்திவைக்க வேண்டாம்.',
'சந்திப்புகளும் வெளிநடவடிக்கைகளும் அதிகமானால் அன்றாட நடை மற்றும் தூக்கத்தைச் சீர்படுத்தலாம்.',
'இரவு நேரத் தூக்கத்தைத் தள்ளிப்போடும் பழக்கத்தைக் கவனமாகக் கட்டுப்படுத்தலாம்.'
];
const BODY_CONTEXT_EN=[
'Pause when fatigue begins rather than waiting for it to become obvious to others.',
'Give meals their own place in a busy household schedule.',
'Frequent practice calls for breaks for hands and shoulders.',
'Protect a quiet interval at home for emotional recovery.',
'Long hours of study are easier with movement breaks.',
'Lengthy workdays still need dependable meals and rest.',
'Caring for another person should not mean losing one’s own sleep.',
'When adapting to disruption, reliable help can ease sustained strain.',
'Include physical breaks when planning long journeys.',
'Professional responsibilities should not indefinitely postpone rest.',
'Busy meetings and travel call for attention to movement and sleep.',
'Notice habits that regularly delay sleep at night.'
];
const SECOND_LINK_TA=[
'ஒரு முடிவை எடுப்பதற்கு முன் பிறரின் கருத்தைக் கேட்பதும் தன் பொறுப்பைத் தெளிவாக்குவதும் உதவும்.',
'வரவுக்கும் குடும்பத் தேவைக்கும் தனித்த கணக்கு வைத்தால் பேச்சில் குழப்பம் குறையலாம்.',
'மற்றவரின் உதவியைப் பெற்றாலும் தொடங்கிய முயற்சியைத் தானே தொடர்ந்து கவனிக்க வேண்டியிருக்கும்.',
'வீட்டின் அமைதிக்குத் தேவையான நேரத்தை வெளியிலுள்ள பொறுப்புகளுடன் சேர்த்துத் திட்டமிடலாம்.',
'கற்றதைப் பகிரும் போது மற்றவர் புரிந்துகொள்ளும் வேகத்தையும் மதிக்க வேண்டும்.',
'வேலைப் பிரச்சினைகளை வீட்டுக்குக் கொண்டுவராமல் எல்லையை அமைத்துக்கொள்ள முயலலாம்.',
'உறவில் பேசப்படாத எதிர்பார்ப்பைக் குறைக்க இருவரின் நடைமுறைத் தேவைகளையும் கேட்டறியலாம்.',
'எல்லாச் சவாலையும் தனியே சுமக்க வேண்டியதில்லை; நம்பகமான உதவியைத் தேர்ந்தெடுக்கலாம்.',
'அறிவுரை பயனாக இருக்கிறதா என்பதை அனுபவத்துடன் ஒப்பிட்டுப் பார்க்க வேண்டும்.',
'பணியின் தரத்துக்கும் பிறருடன் ஒத்துழைக்கும் முறைக்கும் ஒரே அளவு கவனம் கொடுக்கலாம்.',
'ஆதாயம் வந்தவுடன் அனைத்தையும் செலவிடாமல் அடுத்த தேவையை நினைத்துப் பார்க்க வேண்டும்.',
'ஓய்வெடுக்கும் இடத்தையும் நேரத்தையும் பணிச்சுமைக்கு முன்பே திட்டமிடுவது உதவும்.'
];
const SECOND_LINK_EN=[
'Hearing another point of view can make personal accountability clearer.',
'Separate records for income and family needs may reduce confusion.',
'Accepting help need not mean abandoning responsibility for follow-through.',
'Home life benefits from time protected against outside obligations.',
'Sharing knowledge works better when another learner’s pace is respected.',
'Work troubles are less intrusive when practical boundaries are maintained.',
'Checking each person’s needs can prevent unspoken expectations growing.',
'Choosing reliable support can be better than carrying every difficulty alone.',
'Advice becomes more useful when tested against lived experience.',
'Attention to both work quality and cooperation can support progress.',
'New gains may deserve reserves before additional commitments.',
'Planned rest is more reliable than waiting until duties are finished.'
];
const LINK_OUTCOME_EN=[
'This may shape confidence and how they respond to other people.',
'This may affect the tone of family discussions and choices about shared expenses.',
'This may change how an effort is launched and sustained.',
'This may alter priorities around comfort, property and family time.',
'This may influence what to study next and whom to support.',
'This may change the way work is shared and debts are evaluated.',
'This may require clearer communication and expectations in close relationships.',
'This may affect how quickly change is accepted or help is sought.',
'This may reshape the way guidance is received and future plans are formed.',
'This may change the duties accepted and how they are fulfilled.',
'This may require clearer boundaries between generosity and financial reserves.',
'This may make planned rest and personal space as important as spending limits.'
];

function humanIntro(x,lang) {
 if(lang==='ta') return x.replace(/^[^\s]+ லக்னத்தில் பிறந்துள்ளதால்\s*/,'').trim();
 return x.replace(/^Aries rising may bring a wish to act first and work out obstacles through direct effort\./,'They may prefer to act early and work through obstacles with direct effort.')
 .replace(/^[A-Z][a-z]+ rising may /,'They may ');
}
function tone(score){return score==='support'?'support':score==='pressure'?'pressure':'mixed';}
function textJoin(...pieces){return pieces.filter(Boolean).join(' ').replace(/\s+/g,' ').trim();}
function addV(out,seen,txt,house,evidence){const p=textJoin(txt);if(!p||seen.has(p))return;seen.add(p);out.push({house,text:p,evidence});}
function topInfluences(h){const weighted=[...h.occupants.map(key=>({key,weight:3,kind:'occupant'})),...h.aspects.map(key=>({key,weight:2,kind:'aspect'})),{key:h.lord,weight:1,kind:'lord'}];const uniq=new Map();for(const x of weighted)if(!uniq.has(x.key))uniq.set(x.key,x);return [...uniq.values()].sort((a,b)=>b.weight-a.weight||KEY_ORDER.indexOf(a.key)-KEY_ORDER.indexOf(b.key));}
// Editorial grouping keeps one lived idea per paragraph instead of one tiny
// paragraph per fixed data fragment. All underlying evidence remains attached.
function groupParagraphs(para,personality){
 const pack=(arr)=>({house:arr[0].house,text:arr.map(x=>x.text).join(' '),evidence:{source:'narrative-synthesis',parts:arr.map(x=>x.evidence)}});
 const lead=[],middle=[],end=[],body=[];
 for(const p of para){
  const src=p.evidence?.source;
  if(src==='body-meaning')body.push(p);
  else if(src==='outcome-synthesis')end.push(p);
  else if(src==='life-meaning'||src==='ruler-placement'||src==='ruler-home')lead.push(p);
  else middle.push(p);
 }
 const out=[];
 if(personality){
   const core=middle.filter(x=>x.evidence?.pass===1&&['rising-and-ruler','ruler-context'].includes(x.evidence?.source));
   for(const c of core)out.push(c);
   const contacts=middle.filter(x=>!core.includes(x));
   if(contacts.length)out.push(pack(contacts));
 } else {
   if(lead.length)out.push(pack(lead));
   if(middle.length)out.push(pack(middle));
 }
 if(personality&&lead.length)out.push(pack(lead));
 if(out.length<2&&end.length&&body.length){out.push(pack(end));out.push(pack(body));}
 else if(end.length||body.length)out.push(pack([...end,...body]));
 return out;
}
function compileV288(d,lang='ta',options={}) {
 const ta=lang!=='en',impact=ta?IMPACT_TA:IMPACT_EN,ctx=ta?CONTEXT_TA:CONTEXT_EN,focus=ta?FOCUS_TA:FOCUS_EN,bodyText=ta?BODY_TA:BODY_EN;
 const rising=ta?RISING_TA:RISING_EN,signStyles=ta?SIGN_STYLE_TA:SIGN_STYLE_EN,planetTraits=ta?PLANET_TA:PLANET_EN,results=ta?RESULTS_TA:RESULTS_EN;
 const topics=[],allHouses=Array.from({length:12},(_,i)=>i+1);
 const selected=(key,i)=>impact[i][KEY_ORDER.indexOf(key)];
 for(let i=0;i<12;i++){
  const h=d.houses[i],lord=d.planets[h.lord],strength=state(d,i+1,options),infl=topInfluences(h),seen=new Set(),para=[];
  const meta={lagna:d.lagna,houseLord:h.lord,lordSign:lord.sign,lordHouse:lord.house,occupants:[...h.occupants],aspects:[...h.aspects],score:strength,ownerDignity:options.planetDignity?options.planetDignity(d,lord):null,ownerFunctional:options.functional?options.functional(d,h.lord):null};
  if(i===0){
    // First pass: the native's rising character + real ruler's house/sign,
    // conjunctions and contacts. The reader sees neither sign labels nor formulas.
    const [a,b]=rising[d.lagna];
    addV(para,seen,textJoin(humanIntro(a,ta?'ta':'en'),ta
      ?`அந்த இயல்புடன் ${signStyles[lord.sign]} கலப்பதால் ${selected(h.lord,i)}`
      :`Alongside that tendency, ${signStyles[lord.sign]} may become apparent. ${selected(h.lord,i)}`),1,{pass:1,source:'rising-and-ruler',ruler:h.lord,sign:lord.sign});
    addV(para,seen,textJoin(b,ta
      ?`குறிப்பாக ${ctx[lord.house-1]} வழியாக இந்த இயல்பு நடைமுறையில் சோதிக்கப்படும் வாய்ப்புகள் இருக்கலாம்.`
      :`These traits may be tested through ${ctx[lord.house-1]}.`),1,{pass:1,source:'ruler-context',rulerHouse:lord.house});
    const conjunct=Object.values(d.planets).filter(p=>p.key!==h.lord&&p.house===lord.house).sort((a,b)=>KEY_ORDER.indexOf(a.key)-KEY_ORDER.indexOf(b.key));
    const firstPassShown=new Set([h.lord]);
    for(const p of conjunct.slice(0,2)){firstPassShown.add(p.key);addV(para,seen,textJoin(ta
      ?`${selected(p.key,0)} அந்த இயல்புடன் இவர் ஏற்கும் பொறுப்பும் கலந்து செயல்படுவதால் ஒரு கருத்தை உடனே முடிவாக்காமல் விளைவுகளை ஒப்பிட்டுப் பார்ப்பது உதவும்.`
      :`${selected(p.key,0)} The wish to act responsibly may interact with that impulse, so allowing time to compare consequences can help.`),1,{pass:1,source:'lord-conjunction',planet:p.key});}
    for(const p of infl.filter(x=>!firstPassShown.has(x.key)).slice(0,2))addV(para,seen,textJoin(selected(p.key,0),ta
       ?`இது ${ctx[p.kind==='occupant'?1-1:lord.house-1]} தொடர்பான முடிவுகளில் வெளிப்படலாம்; அதனால் ஒரே நேரத்தில் வேகமாகவும் நிதானமாகவும் செயல்பட வேண்டிய சூழல் வரலாம்.`
       :`It may be especially visible in everyday choices; acting quickly need not exclude considered judgement.`),1,{pass:1,source:p.kind==='occupant'?'rising-occupant':'rising-aspect',planet:p.key});
  } else {
    const chosen=infl[0]||{key:h.lord,kind:'lord'};
    const sourceHouse=d.planets[chosen.key].house-1;
    const sourceContext=ta
      ?(chosen.kind==='occupant'?`இந்த நடைமுறை ${ctx[i]} தொடர்பான முடிவுகளில் நேரடியாகத் தெரியக்கூடும்.`:chosen.kind==='aspect'?`${ctx[sourceHouse]} பெற்ற அனுபவங்களும் இத்தேர்வில் கலந்து வரலாம்.`:`குறிப்பாக ${ctx[sourceHouse]} இதை வளர்க்கும் வாய்ப்பைத் தரலாம்.`)
      :(chosen.kind==='occupant'?`This may show directly in choices involving ${ctx[i]}.`:chosen.kind==='aspect'?`Experience of ${ctx[sourceHouse]} may also shape this choice.`:`It may be developed through ${ctx[sourceHouse]}.`);
    addV(para,seen,textJoin((ta?DOMAIN_TA:DOMAIN_EN)[i][0],selected(chosen.key,i),sourceContext),i+1,{pass:2,source:'life-meaning',planet:chosen.key,kind:chosen.kind,sourceHouse:sourceHouse+1});
  }
  // The ruler's actual location connects each focus to a real different life area.
  const placement=lord.house-1;
  if(placement!==i){
    addV(para,seen,ta
      ?`${focus[i]} ${ctx[placement]} முக்கியப் பங்கு வகிக்கலாம். ${LINK_OUTCOME_TA[i]}`
      :`Experience with ${ctx[placement]} may matter ${focus[i]}. ${LINK_OUTCOME_EN[i]}`,i+1,{pass:2,source:'ruler-placement',lord:h.lord,rulerHouse:lord.house});
  } else if(i!==0){
    addV(para,seen,ta
      ?`${focus[i]} பிறரின் அழுத்தத்தைவிடத் தன் நியாயத்தை முன்னிலைப்படுத்த முயல்வார். ${LINK_OUTCOME_TA[i]}`
      :`They may prefer relying on their own judgement ${focus[i]}. ${LINK_OUTCOME_EN[i]}`,i+1,{pass:2,source:'ruler-home',lord:h.lord});
  }
  // Occupants and actual aspects: topic-specific effects, not repeated generic karaka paragraphs.
  const extras=infl.filter(x=>x.key!==h.lord&&x.kind!=='lord').slice(0,i===0?0:2);
  for(const [extraIndex,p] of extras.entries()){
    const ptext=selected(p.key,i),pressure=planetTraits[p.key][1];
    addV(para,seen,textJoin(ptext,extraIndex>0?'':ta
      ?(strength==='pressure'?`எதிர்பார்ப்பு அதிகமானால் ${pressure}; அதனால் அவசரமின்றி பேசுவதும் உதவி கேட்பதும் முக்கியம்.`:`இந்தத் தன்மை ஒரே நேரத்தில் ${ctx[placement]} தரும் அனுபவத்துடனும் கலந்து வெளிப்படலாம்.`)
      :(strength==='pressure'?`Under pressure, ${pressure.charAt(0).toLowerCase()+pressure.slice(1)}; taking time to review decisions may help.`:`It may combine with lessons drawn from ${ctx[placement]}.`)),i+1,{pass:2,source:p.kind,planet:p.key});
  }
  // A second cross-house link is used only when an actual natal relationship exists.
  if(typeof options.links==='function'&&i!==0){
    const connections=allHouses.filter(x=>x!==i+1&&x!==lord.house).map(x=>({house:x,links:options.links(d,i+1,x)}))
      .filter(x=>x.links.some(code=>['related-lord-in-focus','lords-conjunct','mutual-exchange','focus-lord-aspects-related','related-lord-aspects-focus'].includes(code)))
      .sort((a,b)=>b.links.length-a.links.length||a.house-b.house);
    if(connections.length){const one=connections[0];addV(para,seen,ta
      ?`${focus[i]} ${ctx[one.house-1]} உடனும் தொடர்பு ஏற்படும். ${SECOND_LINK_TA[i]}`
      :`There may also be a link with ${ctx[one.house-1]} ${focus[i]}. ${SECOND_LINK_EN[i]}`,i+1,{pass:2,source:'cross-house-link',relatedHouse:one.house,relation:one.links});}
  }
  // The life result is inferred from natal condition and adapted to the house.
  // Topic-specific result already reflects natal house score and planetary
  // contacts. Do not append an identical generic qualification to all 12
  // houses or repeat the rising-sign style in every house's conclusion.
  addV(para,seen,results[i][strength==='support'?0:strength==='pressure'?1:2],i+1,{pass:2,source:'outcome-synthesis',strength,ruler:h.lord,rulerSign:lord.sign});
  // Physical care: concrete body significations, without fatalistic diagnoses.
  addV(para,seen,textJoin(bodyText[i],(ta?BODY_CONTEXT_TA:BODY_CONTEXT_EN)[lord.house-1],ta
    ?(strength==='pressure'?`வேலை அல்லது குடும்ப அழுத்தம் அதிகமாகும் போது இந்தப் பழக்கங்களைப் புறக்கணிக்க வேண்டாம்.`:strength==='support'?`சீரான அன்றாட ஒழுங்கைத் தொடர்வது உடல் வசதிக்கும் செயல்திறனுக்கும் உதவும்.`:`சூழலுக்கேற்ற ஓய்வு இடைவெளிகளை அமைத்துக் கொள்ளலாம்.`)
    :(strength==='pressure'?`These routines deserve more care during stressful periods.`:strength==='support'?`Keeping routines consistent may support comfort and capacity.`:`Adjust breaks and routines to real conditions.`)),i+1,{pass:2,source:'body-meaning',strength});
  topics.push({number:i+1,title:(ta?TITLES_TA:TITLES_EN)[i],paragraphs:groupParagraphs(para,i===0),analyzedHouses:12,evidence:meta});
 }
 return {lang:ta?'ta':'en',lagnaSign:d.lagna,topics,source:'D1-only',method:'two-pass consequence-led narrative',planetarySigns:Object.fromEntries(Object.values(d.planets).map(p=>[p.key,p.sign]))};
}

return Object.freeze({render:compileV288,version:'288-contextual-d1-narrative'});
});
