/* SMV ASTRO V292: outcome-first D1 reader. This is a traditional symbolic
 * interpretation, NOT a validated personality/medical prediction.
 * Every displayed house result is selected from planet+polarity+house-specific
 * consequences, verified natal relations and the house lord's actual location.
 * Pure functions: no network, DB, observers, DOM, randomness, or recalculation.
 */
(function(root,factory){const api=factory();/* bundled helper: preserve core CommonJS export */if(root)root.SMVD1LivedResultsV292=api;})(typeof window!=='undefined'?window:globalThis,function(){'use strict';
const PLANETS=['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu'];
const PN={Sun:'சூரியன்',Moon:'சந்திரன்',Mars:'செவ்வாய்',Mercury:'புதன்',Jupiter:'குரு',Venus:'சுக்கிரன்',Saturn:'சனி',Rahu:'ராகு',Ketu:'கேது'};
const SIGNS_TA=['மேஷ','ரிஷப','மிதுன','கடக','சிம்ம','கன்னி','துலா','விருச்சிக','தனுசு','மகர','கும்ப','மீன'];
const SIGNS_EN=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const ASC_TA=['எதிலும் முன்னின்று செயல்படும் துணிவு','நிலைத்த முயற்சியும் சுகவாழ்வின் மீது அக்கறையும்','தகவல் தேடலும் பேசித் தெளிவுபடுத்தும் ஆர்வமும்','உறவுகளைப் பாதுகாக்கும் அக்கறை','தன்மானம் மற்றும் வழிநடத்தும் மனநிலை','தவறுகளைக் கண்டுபிடித்து சரிசெய்யும் துல்லியம்','இரு தரப்பையும் கேட்கும் சமநிலை உணர்வு','மறைந்த காரணங்களை ஆராயும் கூர்மை','நம்பிக்கையும் புதியவற்றைக் கற்கும் ஆர்வமும்','கடமை உணர்வும் நீண்ட முயற்சியும்','தனித்த சிந்தனையும் புதிய வழிகளைத் தேடுதலும்','இரக்கமும் ஆன்மிகச் சிந்தனையும்'];
const ASC_EN=['quick initiative and courage','steady commitment and practical comfort','curiosity and verbal agility','protective warmth in relationships','personal dignity and leadership','careful analysis and precision','fairness and cooperation','depth and scrutiny','faith and discovery','patience and duty','independent ideas and experimentation','compassion and reflection'];
const NAK_TA=['அசுவினி','பரணி','கார்த்திகை','ரோகிணி','மிருகசீரிடம்','திருவாதிரை','புனர்பூசம்','பூசம்','ஆயில்யம்','மகம்','பூரம்','உத்திரம்','அஸ்தம்','சித்திரை','சுவாதி','விசாகம்','அனுஷம்','கேட்டை','மூலம்','பூராடம்','உத்திராடம்','திருவோணம்','அவிட்டம்','சதயம்','பூரட்டாதி','உத்திரட்டாதி','ரேவதி'];
const NAK_EN=['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishta','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati'];
const NAK_TONE_TA=['முன்னின்று முயற்சித்தல்','கடமையை உறுதியாகப் பிடித்தல்','நேரடியாகத் தீர்மானித்தல்','நம்பியவரைப் பாதுகாத்தல்','மீண்டும் கேட்டு அறிதல்','கடினமான உண்மையையும் எதிர்கொள்ளுதல்','தோல்விக்குப் பிறகு புதிய வழி தேடுதல்','குடும்பப் பொறுப்பை ஏற்றல்','உள்ளுணர்வை வெளிக்காட்டாமல் வைத்தல்','கௌரவத்தையும் குடும்ப மரபையும் மதித்தல்','அன்பையும் நல்ல சூழலையும் நாடுதல்','முக்கியப் பொறுப்பை ஏற்றல்','திறமையில் நுட்பம் தேடுதல்','அழகையும் துல்லியத்தையும் ரசித்தல்','தன்னிச்சையான முடிவு','கூட்டாக இலக்கை அடைதல்','உறவின் நம்பிக்கையைப் பேணுதல்','பெற்ற உரிமையைப் பாதுகாத்தல்','அடிப்படை காரணம் தேடுதல்','கொள்கையில் நிலைத்திருத்தல்','நீண்ட இலக்கில் விடாமுயற்சி','கவனமாகக் கேட்டு நடைமுறைப்படுத்தல்','கால ஒழுங்கைப் பேணுதல்','புதிய தீர்வைச் சோதித்தல்','கடின உழைப்பைத் தொடர்தல்','உள்ளார்ந்த சிந்தனையும் கடமையும்','உதவும் மனப்பான்மை'];
const TITLES_TA=['ஜாதகரின் குணநலன்கள்','பேச்சு, குடும்பம், சேமிப்பு மற்றும் பொருளாதாரம்','முயற்சி, துணிவு, திறமை மற்றும் உடன்பிறப்புகள்','தாய், வீடு, மனநிம்மதி மற்றும் சொத்து','கல்வி, அறிவு, சிந்தனை மற்றும் குழந்தைகள்','வேலை, போட்டி, கடன் மற்றும் அன்றாடப் பொறுப்புகள்','திருமணம், துணைவர் மற்றும் கூட்டாண்மை','மாற்றங்கள், ரகசியங்கள் மற்றும் நீடித்த சவால்கள்','தந்தை, ஆசிரியர், நம்பிக்கை மற்றும் வழிகாட்டுதல்','தொழில், பொறுப்பு மற்றும் சமூக நிலை','வருமானம், ஆதாயம், நண்பர்கள் மற்றும் இலக்குகள்','செலவு, தனிநேரம், உறக்கம் மற்றும் மன அமைதி'];
const TITLES_EN=['Personal character and temperament','Speech, family, savings and money','Effort, skill, courage and siblings','Mother, home, peace and property','Education, discernment and children','Work, competition, debt and duties','Marriage, spouse and partnerships','Changes, secrets and long challenges','Father, mentors, beliefs and guidance','Career, responsibilities and reputation','Income, gains, friends and goals','Expenses, privacy, sleep and reflection'];
// For each house: Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, Ketu.
// Each cell is an independently edited lived outcome for SUPPORT | PRESSURE.
const TA=[
[
'முன்னின்று பொறுப்பை ஏற்று முடிவு செய்வீர்கள்; உங்களை நம்பியவர் சிரமத்தில் இருந்தால் ஒதுங்க மாட்டீர்கள்.|தன்னுடைய மரியாதை கேள்விக்குள்ளானவுடன் பதிலளிக்கும் வேகம் அதிகம்; விமர்சனத்தைத் தனிப்பட்ட எதிர்ப்பாக எடுத்துக்கொள்வீர்கள்.',
'மற்றவரின் கஷ்டத்தைக் கேட்டதும் உதவிசெய்ய முன்வருவீர்கள்; நெருங்கியவர்களின் மனநிலையை எளிதில் உணர்வீர்கள்.|அன்பு வைத்தவரிடமிருந்து எதிர்பாராத வார்த்தை வந்தால் உணர்ச்சிவசப்பட்டுப் பேசுவீர்கள்; பிறகு நடந்ததை மீண்டும் நினைப்பீர்கள்.',
'தடை வந்த வேலையை நிறுத்தாமல் உடனடியாக வேறு வழி முயல்வீர்கள்; அநியாயத்தைப் பார்த்தால் எதிர்ப்பீர்கள்.|ஒருவர் தவறு செய்கிறார் என்று தோன்றியதும் முழு விளக்கத்தைக் கேட்குமுன் கடுமையாகப் பதிலளிப்பீர்கள்.',
'பிறர் சொல்வதைக் கண்மூடித்தனமாக ஏற்காமல் காரணத்தைச் சரிபார்ப்பீர்கள்; சிறிய தவறும் உங்கள் கவனத்திலிருந்து தப்பாது.|எல்லாத் தகவலும் சரியாக இருக்க வேண்டும் என்ற பிடிப்பால் ஒரு முடிவை மீண்டும் மீண்டும் மாற்றுவீர்கள்.',
'உதவி கேட்பவரிடம் நியாயமான காரணத்துடன் பேசுவீர்கள்; பிறருக்கு விளக்கிச் சொல்லி வழிநடத்துவீர்கள்.|தன்னுடைய ஆலோசனையே சரி என்ற எண்ணத்தால் பிறருடைய வேறுபட்ட அனுபவத்தைக் குறைவாக மதிப்பீர்கள்.',
'அன்பையும் மரியாதையையும் ஒருங்கே எதிர்பார்ப்பீர்கள்; கருத்து மாறினாலும் உறவைப் பேண முயல்வீர்கள்.|உறவைச் சீராக வைத்திருக்கச் சொல்லாமல் விட்ட குறை பின்னர் மனவருத்தமாக வெளிப்படும்.',
'எடுத்த பணியை முடித்தே தீரவேண்டும் என்ற உறுதி உண்டு; சிறிய குறையை விட்டுச் செல்ல விரும்பமாட்டீர்கள்.|ஒருவரை நம்புவதற்குமுன் அவரை அதிகமாகச் சோதிப்பீர்கள்; பிடிவாதத்தால் சாதாரண விவாதம் நீளும்.',
'புதிய முறைகளைத் தானே சோதிப்பீர்கள்; வழக்கமான தீர்வை விட மாற்று வழி தேடுவீர்கள்.|முடிவை விரைவாகக் காணவேண்டும் என்ற ஏக்கம் தேவையற்ற அவசரத்தையும் மாற்றத்தையும் உருவாக்கும்.',
'தேவையில்லாத வெளிப்பாட்டைத் தவிர்த்து அமைதியாகச் சிந்திப்பீர்கள்; தனியாகக் கற்றவற்றைச் செயலில் காட்டுவீர்கள்.|மனம் காயமடைந்தால் காரணத்தைத் திறந்துபேசாமல் விலகுவீர்கள்; மற்றவரின் உதவியை மறுத்துவிடுவீர்கள்.'
],
[
'குடும்பத்துக்கான பணப் பொறுப்பை முன்வந்து ஏற்றுக்கொள்வீர்கள்; செலவுக்கு முன் முக்கியத் தேவையைத் தீர்மானிப்பீர்கள்.|தனது வார்த்தை மதிக்கப்படவில்லை என்றால் குடும்பப் பேச்சு கடுமையாகும்; தன்மானத்திற்காகத் தேவையற்ற செலவும் செய்வீர்கள்.',
'வீட்டில் ஒருவர் சிரமப்பட்டால் சேமித்த பணத்தையும் உதவிக்குப் பயன்படுத்துவீர்கள்; அன்பான பேச்சால் சமாதானப்படுத்துவீர்கள்.|மனவருத்தம் ஏற்பட்ட நேரத்தில் செலவு அல்லது பண உறுதி கொடுத்துவிட்டு பின்னர் வருத்தப்படுவீர்கள்.',
'மனதில் பட்டதை நேராகக் கூறுவீர்கள்; சம்பாதிப்பதற்குப் பிறர் உதவியை விடத் தன் முயற்சியை நம்புவீர்கள்.|தவறைச் சுட்டிக்காட்டும் நேரத்தில் வார்த்தை கூர்மையாகும்; திடீர் முடிவுகள் கையிருப்பைக் குறைக்கும்.',
'வாங்கும் முன் விலை, தரம், பயன் அனைத்தையும் ஒப்பிடுவீர்கள்; குடும்பப் பேச்சிலும் ஆதாரம் கேட்பீர்கள்.|கணக்குகளை மீண்டும் மீண்டும் மாற்றுவதால் நிதித் தீர்மானம் தாமதமாகும்; சொற்களை அதிகம் ஆராய்ந்து வாக்குவாதம் நீளும்.',
'பணத்தைத் தேவைக்கு ஏற்பப் பிரித்து வைத்துப் பயன்படுத்துவீர்கள்; குடும்பத்தினருக்குப் பொருள் புரியும்படி விளக்குவீர்கள்.|உதவி கேட்ட அனைவருக்கும் அளவுக்கு மீறி உறுதி கொடுத்து, தன் செலவிற்கே நெருக்கடி ஏற்படுத்துவீர்கள்.',
'குடும்பத் தேவையையும் வாழ்க்கை வசதியையும் இணைத்து நிதி ஒழுங்கை விரும்புவீர்கள்; இனிமையாகப் பேசுவீர்கள்.|அமைதி குலையக்கூடாது என்று பணப் பிரச்சினையைத் தள்ளிப்போட்டு அது பெரிதான பிறகு பேசுவீர்கள்.',
'கிடைக்கும் வருமானத்தை உடனே செலவிடாமல் பாதுகாப்பீர்கள்; கடமைகளுக்கு முன்னுரிமை கொடுப்பீர்கள்.|செலவுக்கான சிறிய விஷயத்திலும் அதிகம் சந்தேகித்து வீட்டில் கடுமையாகப் பேசுவீர்கள்.',
'புதிய வருமான வாய்ப்பைப் பற்றி முதலில் அறிந்து முயல்வீர்கள்; பேச்சால் தொடர்புகளை உருவாக்குவீர்கள்.|உறுதியாகாத வருமானத்தை நம்பி செலவுக்குத் திட்டமிடுவதால் பின்னர் கணக்கு தவறும்.',
'தனிப்பட்ட செலவுகளைப் பிறரிடம் கூறாமல் கையாள்வீர்கள்; தேவையற்ற ஆடம்பரத்தை ஒதுக்குவீர்கள்.|பண விஷயத்தைத் திறந்துபேசாமல் தனியாகச் சுமப்பதால் குடும்பத்தில் புரிதல் குறையும்.'
],
[
'புதிய முயற்சியைத் துவக்குவதில் தயங்கமாட்டீர்கள்; சகோதரருக்குத் தேவையான நேரத்தில் பொறுப்பெடுப்பீர்கள்.|உடன்பிறந்தவர்களின் ஆலோசனையைத் தன் முயற்சிக்கான தடையாகக் கருதி வாக்குவாதம் செய்வீர்கள்.',
'உடன்பிறந்தவரின் தேவையை அறிந்து உதவுவீர்கள்; அனுபவத்தில் கற்ற திறமையைப் பகிர்வீர்கள்.|ஒரு சிறிய கருத்து வேறுபாட்டையே மனதில் சுமந்து ஒத்துழைப்பைத் தற்காலிகமாகக் குறைப்பீர்கள்.',
'புதிதாகக் கற்ற வேலையை உடனே தானே முயல்வீர்கள்; சிரமம் வந்தாலும் மறுபடியும் செய்து முடிப்பீர்கள்.|ஒரு பணியில் முழுக் காரணம் அறியுமுன் செயலில் இறங்குவதால் திருத்தவேண்டிய வேலை அதிகரிக்கும்.',
'தொழில்நுட்பச் சிறு விவரங்களையும் சோதித்து திறமையை உயர்த்துவீர்கள்; மற்றவருக்கு முறையாகக் கற்றுக் கொடுப்பீர்கள்.|திறமையில் சிறு குறை கண்டால் மீண்டும் தொடங்கி நேரத்தைச் செலவிடுவீர்கள்; உடன்பிறந்தவரை அதிகம் விமர்சிப்பீர்கள்.',
'அனுபவத்தில் கற்றதை விளக்கிச் சொல்லுவீர்கள்; ஒருவரின் முயற்சிக்கு சரியான வழி காட்டுவீர்கள்.|தெரிந்த வழியே சிறந்தது என்ற உறுதியால் வேறு முயற்சியைத் தேவையின்றித் தள்ளிவிடுவீர்கள்.',
'கைத்திறன், அலங்காரம் அல்லது வடிவமைப்பு போன்ற முயற்சிகளில் அக்கறையுடன் செயல்படுவீர்கள்; கூட்டு வேலையில் இணக்கம் காப்பீர்கள்.|மற்றவர் வேகம் பொருந்தாததால் வேலையைத் தானே செய்ய முற்பட்டு அவர்களுடன் இடைவெளி உருவாக்குவீர்கள்.',
'ஒரு திறமையை நாள்தோறும் பயிற்சி செய்து கற்றுக்கொள்வீர்கள்; மெதுவான முன்னேற்றத்தையும் கைவிடமாட்டீர்கள்.|முதலில் கடினமாகத் தோன்றும் முயற்சியை அளவுக்கு அதிகமாகத் தயங்கி தாமதப்படுத்துவீர்கள்.',
'புதிய கருவி, புதிய முறை அல்லது புதிய தொடர்பு வழியாக முயற்சிக்குத் தொடக்கம் காண்பீர்கள்.|திடீரென முறையை மாற்றிக்கொண்டே இருப்பதால் பழைய முயற்சியின் பலன் முழுமையடையாது.',
'அமைதியாகத் தனித்துப் பயிற்சி செய்து தேர்ச்சி பெறுவீர்கள்; பலரின் கவனத்தைத் தேடமாட்டீர்கள்.|உடன்பிறந்தவரிடம் உதவி கேட்டால் பலவீனம் என்று எண்ணித் தனியாகச் சிரமப்படுவீர்கள்.'
],
[
'வீட்டின் முக்கிய முடிவுகளைத் தானே ஒழுங்குபடுத்துவீர்கள்; தாயாரின் தேவையைப் பொறுப்பாகக் கவனிப்பீர்கள்.|வீட்டு விஷயங்களில் தன்னுடைய வார்த்தையே இறுதி முடிவாக இருக்க வேண்டும் என்ற பிடிப்பு உருவாகும்.',
'வீட்டில் யாருக்காவது கவலை இருந்தால் முதலில் உணர்ந்து சமாதானப்படுத்துவீர்கள்; உறவுகளுக்கு நேரம் ஒதுக்குவீர்கள்.|குடும்பத்தில் சிறிய மனவருத்தமும் வீட்டின் அமைதியை குலைத்ததாக உணர்ந்து நீண்ட நேரம் வருந்துவீர்கள்.',
'வீட்டில் பழுதான பொருளை உடனே சரிசெய்ய விரும்புவீர்கள்; சொத்தைப் பராமரிப்பதில் முன்னின்று செயல்படுவீர்கள்.|பழுதைச் சரிசெய்யும் அவசரத்தில் வீட்டாரின் கருத்தைக் கேட்காமல் செலவையோ மாற்றத்தையோ மேற்கொள்வீர்கள்.',
'வீடு அல்லது வாகனத் தேர்வில் பயன்பாடு, பராமரிப்பு, செலவு அனைத்தையும் ஒப்பிடுவீர்கள்.|வீட்டில் ஒவ்வொரு குறையையும் சுட்டிக்காட்டுவதால் அங்கிருப்பவர்களுக்கு நெருக்கடி ஏற்படும்.',
'தாயாரும் வீட்டாரும் எதை எதிர்பார்க்கிறார்கள் என்று கேட்டுத் திட்டமிடுவீர்கள்; சொத்துத் தீர்மானத்தில் நீண்டகாலப் பயனைப் பார்ப்பீர்கள்.|தனது நல்ல ஆலோசனை ஏற்கப்படாதால் மனதில் குறையை வைத்துக்கொண்டு அதை மீண்டும் பேசுவீர்கள்.',
'வீட்டின் வசதி, அழகு, அமைதி ஆகியவற்றை ஒருங்கே பேணுவீர்கள்; உறவினர் வந்தால் வரவேற்க விரும்புவீர்கள்.|அமைதி குலையக்கூடாது என்பதற்காக வீட்டு பிரச்சினையை நேரத்தில் பேசாமல் விட்டுவிடுவீர்கள்.',
'வீடு வாங்குதல் அல்லது பராமரிப்பில் அவசரப்படாமல் படிப்படியாக ஏற்பாடு செய்வீர்கள்; சொத்து ஆவணங்களைப் பாதுகாப்பீர்கள்.|குடும்ப உறுப்பினரின் சிறிய பிழையைக் கூட மறக்காமல் கூறிக்கொண்டிருப்பதால் வீட்டுச் சுகம் குறையும்.',
'வழக்கமான வீட்டமைப்பிலிருந்து மாறுபட்ட வசதிகளைத் தேடுவீர்கள்; புதிய இடம் பற்றித் தகவல் சேர்ப்பீர்கள்.|வீட்டையோ இருப்பிடத்தையோ அடிக்கடி மாற்றவேண்டும் என்ற எண்ணம் குடும்பத்தினருக்குச் சிரமம் தரும்.',
'வீட்டில் அமைதியான தனி இடம் வைத்துக் கொள்ள விரும்புவீர்கள்; தேவைக்கு மட்டும் செலவு செய்வீர்கள்.|தாயாரோ உறவினரோ புரிந்துகொள்ளவில்லை என்ற எண்ணத்தில் பேசாமல் விலகுவீர்கள்.'
],
[
'கற்ற அறிவை மற்றவர்களுக்கு எடுத்துரைப்பீர்கள்; குழந்தைகளின் கேள்விக்கு நேரம் ஒதுக்கி விளக்குவீர்கள்.|தான் கற்ற முறையை மற்றவரும் பின்பற்ற வேண்டும் என்று வற்புறுத்தி குழந்தைகளிடம் கடுமையாக நடப்பீர்கள்.',
'குழந்தைகள் மற்றும் இளையோரின் மனநிலையைப் புரிந்து கற்பிப்பீர்கள்; படித்ததை அனுபவத்துடன் இணைப்பீர்கள்.|கல்வியில் ஒரு தோல்வியையே அதிகமாக மனதில் வைத்து தன் திறமையைத் தானே சந்தேகிப்பீர்கள்.',
'படிப்பில் கடினமான பகுதியை நேரடியாகச் செய்து கற்றுக்கொள்வீர்கள்; போட்டியில் சோர்வடையமாட்டீர்கள்.|பதில் உடனே வராதபோது கோபம் கொண்டு படிப்பை இடைநிறுத்துவீர்கள்; இளையோரிடம் பொறுமை குறையும்.',
'கேட்ட செய்தியைத் தானே ஆராய்ந்து உறுதிப்படுத்துவீர்கள்; தவறுகளைத் திருத்துவதால் நுட்பமான அறிவு வளரும்.|ஒரு சிறிய குறையைத் திருத்திக்கொண்டே இருப்பதால் பெரிய இலக்குக்கான நேரம் குறையும்.',
'கற்ற அறிவின் காரணத்தையும் பயன்பாட்டையும் புரிந்து பிறருக்கு வழிகாட்டுவீர்கள்; ஆசிரியரிடமும் கேள்வி கேட்பீர்கள்.|தன் கருத்து நியாயமானது என்ற உறுதியில் புதிதாக வந்த ஆதாரத்தை ஏற்கத் தயங்குவீர்கள்.',
'கலை, கற்பனை, வடிவமைப்பு ஆகியவற்றைக் கற்றலுடன் இணைப்பீர்கள்; குழந்தைகளிடம் மென்மையாகப் பழகுவீர்கள்.|அனைத்தும் அழகாகவும் சரியாகவும் இருக்க வேண்டும் என்ற எதிர்பார்ப்பு குழந்தைகள் மீது அழுத்தம் தரும்.',
'கடினமான பாடத்தையும் தொடர்ந்து பயிற்சி செய்து தேர்ச்சி பெறுவீர்கள்; படிப்பில் ஒழுங்கு காப்பீர்கள்.|முடிவெடுப்பதில் தாமதமும் தன்னைத்தானே அதிகமாக விமர்சிப்பதும் கற்றல் ஆர்வத்தைத் தணிக்கும்.',
'புதிய பாடம் அல்லது தொழில்நுட்பத்தை விரைவில் கற்று வேறு முறையில் பயன்படுத்துவீர்கள்.|ஒரே நேரத்தில் பல விஷயங்களைத் தொடங்குவதால் ஒன்றில் ஆழம் பெறத் தாமதமாகும்.',
'தனியாகப் படித்து அரிய விவரங்களை அறிந்து கொள்வீர்கள்; சாதாரணமாகத் தெரியாத காரணத்தை கண்டுபிடிப்பீர்கள்.|பிறர் உதவியைத் தவிர்த்துத் தனியாகக் கற்கும்போது தேவையற்ற தடையை உருவாக்குவீர்கள்.'
],
[
'வேலையில் முக்கியப் பொறுப்பை ஏற்றுப் போட்டியை எதிர்கொள்வீர்கள்; கடனுக்கான கணக்கையும் காலவரிசையையும் அமைப்பீர்கள்.|தன் திறனை நிரூபிக்கவேண்டும் என்ற வேகத்தில் கூடுதல் கடமைகளை ஏற்று ஓய்வை இழப்பீர்கள்.',
'உடன் பணியாற்றுபவரின் சிரமத்தை உணர்ந்து உதவுவீர்கள்; பணிப் பிரச்சினையில் சமரசம் தேடுவீர்கள்.|வேலைக்குள் ஏற்பட்ட மனவருத்தத்தை வீட்டிலும் சுமப்பீர்கள்; தேவைப்பட்ட உதவியைக் கேட்கத் தயங்குவீர்கள்.',
'போட்டியாளரை நேரடியாகச் சந்திப்பீர்கள்; சிரமமான வேலையையும் தள்ளிவைக்காமல் செய்து முடிப்பீர்கள்.|வேகமாக முடிக்கவேண்டும் என்ற முயற்சியில் ஆவணங்களையும் கடன் நிபந்தனைகளையும் முழுவதும் படிக்காமல் முடிவெடுப்பீர்கள்.',
'வேலையின் கணக்கு, ஆவணம், ஒழுங்கு ஆகியவற்றைச் சரியாகப் பார்த்து பிழைகளைத் தவிர்ப்பீர்கள்.|ஒவ்வொரு சிறு பிழையையும் சரிசெய்யும் பிடிப்பால் வேலை முடியும் நேரம் தள்ளிப்போகும்.',
'பிரச்சினையைத் துண்டுகளாகப் பிரித்து தீர்வு தருவீர்கள்; மற்றவரும் கற்றுக்கொள்ளும் வகையில் விளக்குவீர்கள்.|அனைவருடைய சுமையையும் தானே சுமக்க வேண்டும் என்ற எண்ணத்தால் கடமைகள் பெருகும்.',
'பணியிடத்தில் நல்லுறவு பேணுவீர்கள்; கருத்து வேறுபாட்டை சமரசமாக்க முயல்வீர்கள்.|இணக்கம் குலையக்கூடாது என்று கடன் அல்லது ஒப்பந்தச் சிக்கலைத் தாமதமாக எதிர்கொள்வீர்கள்.',
'நாள்தோறும் கடமையை ஒழுங்காகச் செய்து படிப்படியாக உயர்வீர்கள்; சிரமத்திற்கு மத்தியில் தொடர்வீர்கள்.|பணிச்சுமை அதிகமாகும்போது மற்றவரிடம் வேலையைப் பகிராமல் தானே செய்து சோர்வடைவீர்கள்.',
'போட்டியில் தனித்த வழி தேடுவீர்கள்; வழக்கமான வேலை முறையை மேம்படுத்த முயல்வீர்கள்.|உடனடி வெற்றிக்காக உறுதியாகாத வேலை வாய்ப்பையோ கடனையோ ஏற்றுக்கொள்வீர்கள்.',
'மறைமுகமாக உள்ள பிரச்சினையைத் தனியாகக் கண்டுபிடித்து சரிசெய்வீர்கள்; பாராட்டைத் தேடமாட்டீர்கள்.|உதவி கேட்காமல் நீண்ட நேரம் வேலை செய்து தனிமையில் சுமையை அதிகப்படுத்துவீர்கள்.'
],
[
'நெருக்கமான உறவில் மற்றவரின் கருத்தைக் கேட்டு முக்கிய முடிவில் பொறுப்பெடுப்பீர்கள்; உறவுக்குத் தக்க பாதுகாப்பளிப்பீர்கள்.|துணைவர் தன் முடிவை ஏற்க வேண்டும் என்று எதிர்பார்த்தால் விவாதம் நீளும்.',
'துணைவரின் மனநிலையை உடனே உணர்ந்து அக்கறையுடன் பழகுவீர்கள்; சிறிய உதவியையும் நினைவில் வைத்திருப்பீர்கள்.|எதிர்பார்த்த அன்பு கிடைக்காதபோது சொல்லாமல் மனவருத்தம் வைத்துக்கொள்வீர்கள்.',
'கூட்டாகச் செய்யும் பணியில் விரைவாக முன்வந்து முடிவெடுப்பீர்கள்; உறவைப் பாதுகாக்கத் துணிவுடன் நிற்பீர்கள்.|கோபம் வந்த உடனே பதிலளிப்பதால் தீர்க்கக்கூடிய கருத்து வேறுபாடும் தீவிரமாகும்.',
'பிரச்சினையைத் திறந்துபேசி காரணம் கண்டுபிடிப்பீர்கள்; கூட்டு முடிவில் ஒப்பந்த நிபந்தனைகளை ஆராய்வீர்கள்.|உறவில் ஒவ்வொரு வார்த்தைக்கும் விளக்கம் தேடி இயல்பான உரையாடலைச் சிக்கலாக்குவீர்கள்.',
'துணைவருக்கு நியாயமான ஆலோசனை கூறுவீர்கள்; நீடித்த குடும்பத் திட்டத்தில் பொறுப்பாக இருப்பீர்கள்.|தானே சிறந்த வழிகாட்டி என்ற எண்ணத்தில் துணைவரின் விருப்பத்திற்கு இடம் குறைவாகத் தருவீர்கள்.',
'பாசத்தையும் சமரசத்தையும் வெளிப்படுத்துவீர்கள்; சிறிய நல்ல அனுபவங்களால் உறவை வளர்ப்பீர்கள்.|பிரச்சினையைக் நேரடியாகச் சொல்லாமல் தவிர்ப்பதால் பின்னர் மனக்கசப்பு பெருகும்.',
'உறுதியான உறவைப் படிப்படியாக வளர்ப்பீர்கள்; ஒருமுறை கொடுத்த வாக்கைக் காப்பீர்கள்.|முந்தைய தவறைத் தொடர்ந்து நினைத்து நெருக்கமான உறவில் மற்றவரை மீண்டும் மீண்டும் சந்தேகிப்பீர்கள்.',
'வழக்கத்திற்கு மாறான பின்னணி அல்லது கருத்துடையவர்களுடன் ஒத்துழைப்பீர்கள்; புதுமையான தீர்வு தேடுவீர்கள்.|உறவில் உடனடித் திருப்தி வேண்டும் என்ற அவசரம் பரஸ்பர புரிதலைக் குறைக்கும்.',
'துணைவரின் தனிநேரத்தை மதிப்பீர்கள்; உறவின் உள்ளார்ந்த அர்த்தத்தைப் புரிந்துகொள்வீர்கள்.|மனவருத்தமானபோது ஒன்றும் பேசாமல் விலகுவதால் துணைவருக்கு குழப்பம் ஏற்படும்.'
],
[
'திடீர் மாற்றம் வந்தாலும் முக்கியக் கடமையைத் தள்ளாமல் செயலில் இறங்குவீர்கள்; தகவலைச் சேமிப்பீர்கள்.|எதிர்பாராத மாற்றத்தைத் தனது மரியாதைக்கு வந்த சவாலாக எடுத்துக்கொண்டு உடனடியாக எதிர்ப்பீர்கள்.',
'திடீர் சிக்கலில் பிறர் எவ்வாறு பாதிக்கப்படுகிறார்கள் என்று கவனித்து உதவுவீர்கள்.|முன்பு ஏற்பட்ட பாதிப்பை நீண்ட நேரம் நினைத்து அடுத்த முடிவிலும் அதற்குப் பயப்படுவீர்கள்.',
'சூழல் மாறும்போது வேறு வழி தேடி விரைந்து தொடங்குவீர்கள்; கடினமான வேலையைத் தவிர்க்கமாட்டீர்கள்.|முழு விவரம் அறியாமல் உடனடி நடவடிக்கை எடுப்பதால் மீண்டும் திருத்த வேண்டியிருக்கும்.',
'மறைக்கப்பட்ட தகவலைத் தேடி உண்மையை அறிந்து கொள்ளுவீர்கள்; ஆவணங்களைச் சரிபார்ப்பீர்கள்.|எல்லாவற்றிலும் சந்தேகம் தேடுவதால் சாதாரண மாற்றமும் பெரும் பிரச்சினையாகத் தோன்றும்.',
'கஷ்டமான சூழலிலிருந்து அறிந்ததைப் பிறருக்கு விளக்குவீர்கள்; நீண்டகாலத் திட்டத்தை மறுசீரமைப்பீர்கள்.|தனது பழைய நம்பிக்கையை மாற்ற மறுத்து புதிய சூழலுக்கு ஏற்ப பழகத் தாமதிப்பீர்கள்.',
'உறவு பாதிக்காமல் மாற்றத்தைக் கையாளுவீர்கள்; பழைய உடன்பாட்டைத் திருத்திப் பேசி புதிய ஒப்புதல் பெறுவீர்கள்.|அமைதி காக்க வேண்டும் என்பதற்காக அவசியமான உண்மையைத் தாமதமாகப் பகிர்வீர்கள்.',
'நீண்ட சவாலில் முறையை மாற்றாமல் ஒழுங்காகத் தொடர்வீர்கள்; பாதுகாப்பான மாற்றுத் திட்டம் வைத்திருப்பீர்கள்.|மாற்றத்தை மனதில் ஏற்கத் தாமதித்து காலத்தால் தீர்க்கக்கூடிய சிக்கலையும் பெரிதாக்குவீர்கள்.',
'நெருக்கடியிலிருந்து புதுமையான வழியைத் தேடி மீள்வீர்கள்; வழக்கமற்ற தகவல்களையும் ஆராய்வீர்கள்.|ஆதாரம் முழுமையில்லாத செய்தியை நம்பி தேவையற்ற அச்சம் அடைவீர்கள்.',
'தனியாக ஆராய்ச்சி செய்து மறைந்த காரணத்தைத் தெரிந்துகொள்வீர்கள்; ரகசியத்தைப் பாதுகாப்பீர்கள்.|பிரச்சினையை பிறருடன் பகிராமல் தனியே சுமந்து தீர்வு தாமதமாகும்.'
],
[
'பெரியோர் அறிவுரையை நடைமுறையில் நிறைவேற்றுவீர்கள்; தர்மம் சார்ந்த கடமைகளில் முன்னின்று செயல்படுவீர்கள்.|ஆசிரியரின் கருத்து தன் நம்பிக்கையுடன் பொருந்தாதபோது உரையாடலைக் கடுமையாக்குவீர்கள்.',
'தந்தை அல்லது வழிகாட்டியின் தேவைக்கு உணர்வோடு பதிலளிப்பீர்கள்; குடும்ப மரபை மதிப்பீர்கள்.|பெரியவர் சொன்ன ஒரு கடுமையான வார்த்தையை நீண்டகாலம் மனதில் வைத்துக்கொள்வீர்கள்.',
'நம்பிய கொள்கைக்காக உழைப்பீர்கள்; வழிகாட்டுதலைக் கேட்டு செயலில் இறங்குவீர்கள்.|முழுமையாக அறியுமுன் ஒரு கருத்தை எதிர்ப்பதால் நல்ல ஆலோசனையைத் தவறவிடுவீர்கள்.',
'ஆசிரியர் கொடுத்த தகவலைச் சோதித்து உண்மையைத் தேர்ந்தெடுப்பீர்கள்; அறிந்ததை மற்றவருக்குக் கற்பிப்பீர்கள்.|சிறிய முரண்பாடுகளையே பெரிதாக்கி முக்கியமான அறிவுரையைப் பின்பற்றத் தாமதிப்பீர்கள்.',
'அனுபவத்துடன் அறநெறியை இணைத்து முடிவெடுப்பீர்கள்; பிறருக்கு வழிகாட்டும்போது நீதியைக் காப்பீர்கள்.|தனது கொள்கை மட்டுமே சரி என்ற பிடிப்பு வேறு அனுபவங்களை ஏற்க விடாமல் தடுக்கும்.',
'பெரியோருடன் இணக்கமாகப் பழகி குடும்ப மரபுகளைப் பேணுவீர்கள்; வழிபாடு, கலை தொடர்பில் ஈடுபடுவீர்கள்.|மற்றவரை வருத்தக்கூடாது என்று முக்கியமான கருத்து வேறுபாட்டை வெளிப்படுத்தாமல் இருப்பீர்கள்.',
'நம்பிய வழியை பொறுமையாகப் பின்பற்றுவீர்கள்; முன்னோர்களின் அனுபவத்தை கடமையாகக் கருதுவீர்கள்.|முன்பு பெற்ற வழிமுறையை மாற்றத் தயங்குவதால் புதிய பயனுள்ள ஆலோசனையைத் தாமதமாக ஏற்றுக்கொள்வீர்கள்.',
'வழக்கத்திற்கு மாறான அறிவைத் தேடுவீர்கள்; வேறு மரபுகளிலிருந்தும் பயன்பாட்டை அறிந்து கொள்வீர்கள்.|உடனடி முடிவு அளிக்கும் புதிய நம்பிக்கையைச் சோதிக்காமல் பின்பற்றுவீர்கள்.',
'தனியாகத் தியானித்து அல்லது படித்து கொள்கையை உருவாக்குவீர்கள்; வெளிப்பாட்டைவிட அர்த்தத்திற்கு மதிப்பளிப்பீர்கள்.|பிறர் கொடுத்த ஆலோசனையை மனதுக்குள் வைத்துக்கொண்டு தெளிவு கேட்காமல் தவறாகப் புரிந்துகொள்வீர்கள்.'
],
[
'பொறுப்பான வேலையை முன்னின்று ஏற்றுச் செய்வீர்கள்; செய்து முடித்த பணியால் பிறரின் நம்பிக்கையைப் பெறுவீர்கள்.|பதவி அல்லது மதிப்பில் ஏற்பட்ட சிறு எதிர்ப்பையும் பெரிதாக எடுத்துக்கொண்டு பணியில் கடுமையாக நடப்பீர்கள்.',
'உடன் பணியாற்றுபவரின் தேவையைப் புரிந்து ஒத்துழைப்பீர்கள்; வாடிக்கையாளரின் மனநிலையைக் கவனிப்பீர்கள்.|தொழிலில் ஒருவர் கூறிய விமர்சனத்தை மனதில் வைத்து முடிவெடுக்கும் வேகம் குறையும்.',
'தொழிலில் புதிய முயற்சியைத் தொடங்குவீர்கள்; சிக்கலான வேலையைத் நேரடியாகச் செய்து முடிப்பீர்கள்.|வேலை முடிவை விரைவாகக் காணவேண்டும் என்று ஒரே நேரத்தில் பல திட்டங்களைத் தொடங்குவீர்கள்.',
'தொழிலின் சிறிய பிழையையும் கண்டுபிடித்து திருத்துவீர்கள்; முறையையும் ஆவணங்களையும் தெளிவாக்குவீர்கள்.|தொடர்ந்து திருத்திக்கொண்டே இருப்பதால் வேலை நேரத்தில் முடிவதிலும் ஒப்படைப்பதிலும் தாமதம் ஏற்படும்.',
'வாடிக்கையாளர் அல்லது பணியாளர் பிரச்சினைக்கு காரணம் கண்டுபிடித்து விளக்குவீர்கள்; நம்பிக்கையை நிலைப்படுத்துவீர்கள்.|பிறருடைய வேலைக்கும் தானே தீர்வு சொல்ல வேண்டும் என்ற எண்ணம் கூடுதல் பொறுப்பை உருவாக்கும்.',
'உறவுகளையும் திறமையையும் இணைத்துத் தொழிலில் வாய்ப்பை உருவாக்குவீர்கள்; பேச்சுவார்த்தையில் இணக்கம் காண்பீர்கள்.|ஒப்பந்தத்தில் மறுபக்கம் வருந்தக்கூடாது என்பதற்காக தன் நிபந்தனையைத் தெளிவாகக் கூறாமல் விடுவீர்கள்.',
'ஒரே தொழிலில் தொடர்ந்து உழைத்து தரமான பணியால் நம்பிக்கை பெறுவீர்கள்; முடிவுகளுக்குப் பொறுப்பெடுப்பீர்கள்.|மற்றவரை நம்பாமல் எல்லாப் பணியையும் தானே சுமந்து முன்னேற்ற வேகம் குறையும்.',
'புதிய தொழில்நுட்பம் அல்லது வழக்கமற்ற சேவை முறையை முயல்வீர்கள்; புதுமை மூலம் கவனம் பெறுவீர்கள்.|விரைவான வளர்ச்சிக்காகப் பல புதிய முயற்சிகளை ஒன்றாகத் தொடங்கிப் பழைய பணியை முடிக்காமல் விடுவீர்கள்.',
'தொழிலின் ஆழமான விவரத்தைத் தனியாகக் கற்று நிபுணத்துவம் பெறுவீர்கள்; விளம்பரத்தை விடத் திறமையை நம்புவீர்கள்.|தன்னுடைய வேலையை மற்றவருக்குக் காட்டாமல் வைத்துக்கொள்வதால் அங்கீகாரம் பெறத் தாமதமாகும்.'
],
[
'முக்கியத் தொடர்புகளைப் பேணி வருமானத்திற்கான வாய்ப்பை உருவாக்குவீர்கள்; குழுவில் பொறுப்புடன் செயல்படுவீர்கள்.|அங்கீகாரத்தின் பேரில் நண்பரிடம் தேவையற்ற நிதி உறுதி அளிப்பீர்கள்.',
'நண்பரின் தேவையை அறிந்து உதவுவீர்கள்; பழைய தொடர்பை அக்கறையுடன் பேணுவீர்கள்.|அன்புக்காகச் சேமிப்பை மிகையாகப் பயன்படுத்தி பின்னர் குறை உணர்வீர்கள்.',
'வாய்ப்பைக் கண்டவுடன் முயற்சியில் இறங்குவீர்கள்; கூட்டுத் திட்டத்தை முன்னெடுத்து ஆதாயம் தேடுவீர்கள்.|ஆதாயம் உறுதியாகுமுன் அடுத்த செலவு அல்லது திட்டத்திற்குச் செல்லும் அவசரம் உண்டு.',
'கிடைக்கும் வருமானத்தை ஒப்பிட்டுப் பதிவு செய்வீர்கள்; எதிர்கால இலக்கிற்குக் கணக்கு வைத்திருப்பீர்கள்.|கணக்குகளைத் தொடர்ந்து மாற்றிக் கொண்டிருப்பதால் முதலீடு அல்லது சேமிப்பு முடிவு தாமதமாகும்.',
'நல்ல வழிகாட்டுதலால் வாய்ப்பை அறிந்துகொள்வீர்கள்; கிடைத்த ஆதாயத்தில் ஒரு பகுதியைப் பாதுகாப்பீர்கள்.|எல்லாருக்கும் உதவ வேண்டும் என்ற எண்ணத்தில் தனது நீண்டகாலச் சேமிப்பைக் குறைப்பீர்கள்.',
'நண்பர்களுடன் இணைந்து பயன் தரும் தொடர்பை வளர்ப்பீர்கள்; கலை அல்லது சேவை வழி ஆதாயம் தேடுவீர்கள்.|நல்லுறவு காப்பதற்காக நிதி தொடர்பான தெளிவான எல்லை வைக்கத் தயங்குவீர்கள்.',
'மெதுவாக வந்த வருமானத்தையும் பாதுகாத்து நீடித்த சேமிப்பாக மாற்றுவீர்கள்; பல ஆண்டுகளுக்கான இலக்கு அமைப்பீர்கள்.|வாய்ப்பைப் பற்றி அதிகமாகச் சந்தேகித்துத் தேவையான முடிவையும் தாமதப்படுத்துவீர்கள்.',
'புதிய சந்தையோ வலையமைப்போ வழியாக வருமான வாய்ப்பைத் தேடுவீர்கள்; புதுமையில் ஈடுபடுவீர்கள்.|வராத வருமானத்தைக் கணக்கில் சேர்த்து முன்கூட்டியே செலவு செய்வீர்கள்.',
'சிறிய வட்டத்திலிருந்தும் நம்பகமான தொடர்பைப் பேணுவீர்கள்; தனித்த முயற்சியின் ஆதாயத்தை அமைதியாகச் சேமிப்பீர்கள்.|நண்பரிடம் உதவி கேட்க விரும்பாமல் தனியாக முயன்று சில வாய்ப்புகளைத் தவறவிடுவீர்கள்.'
],
[
'தனிநேரத்திலும் பொறுப்பைச் சீராகப் பகிர்வீர்கள்; பயனற்ற செலவை வெட்டித் திட்டமிடுவீர்கள்.|மரியாதைக்காகத் தேவைக்கு அதிகமாகச் செலவு செய்து ஓய்வையும் குறைப்பீர்கள்.',
'தனிமையில் மனதை அமைதிப்படுத்துவீர்கள்; நெருக்கமானவருக்குத் தெரியாமல் உதவி செய்வீர்கள்.|உணர்ச்சிக் கவலையை உள்ளுக்குள் வைத்துப் படுக்கும்போதும் அதையே நினைத்துக்கொண்டிருப்பீர்கள்.',
'தேவையான வேலையை விரைவாக முடித்துத் தனிநேரத்தைப் பாதுகாப்பீர்கள்; திட்டமிட்ட பயணத்தில் ஈடுபடுவீர்கள்.|தீராத வேலையை உடனே முடிக்க வேண்டும் என்று இரவு ஓய்வையும் குறைத்துக்கொள்வீர்கள்.',
'செலவுகளைத் தெளிவாகப் பிரித்து எழுதுவீர்கள்; தனிமையில் இருந்து புதிய விஷயத்தைக் கற்பீர்கள்.|சிறிய செலவையும் தொடர்ந்து கணக்கிடுவதால் ஓய்வுக்குரிய நேரத்திலும் மனம் செயல்பட்டுக் கொண்டிருக்கும்.',
'தனியாகச் சிந்தித்துப் பெரிய முடிவுக்கு வழி காண்பீர்கள்; கல்வி அல்லது உதவிக்குத் திட்டமிட்டுச் செலவு செய்வீர்கள்.|பிறருக்காக எல்லா நேரத்தையும் செலவிட்டு தனக்குத் தேவையான ஓய்வைத் தள்ளுவீர்கள்.',
'கலை, பக்தி அல்லது அமைதியான பொழுதுபோக்குக்குத் தனிநேரம் தருவீர்கள்; செலவில் அளவு காப்பீர்கள்.|தற்காலிக மனநிம்மதிக்காகத் தேவைக்கு அதிகமாகச் செலவிட்டு பின்னர் கணக்கில் நெருக்கடி ஏற்படும்.',
'ஓய்வுக்கான நேரத்தை ஒழுங்காக நிர்ணயிப்பீர்கள்; தனியாக நீண்ட முயற்சியைப் பொறுமையாகச் செய்வீர்கள்.|முடிக்காத கடமையை நினைத்து ஓய்வைத் தள்ளுவதால் அன்றாட உறக்க நேரம் குறையும்.',
'புதிய அனுபவத்திற்கும் தூர இடங்களுக்குமான செலவைத் திட்டமிடுவீர்கள்; அமைதியான ஆய்வில் ஈடுபடுவீர்கள்.|உறுதியாகாத தகவலின் பேரில் செலவு செய்து பின்னர் திட்டம் மாற்றுவீர்கள்.',
'அமைதியான தனிநேரத்தில் ஆழ்ந்து படிப்பீர்கள்; வேண்டாத பொருட்செலவைத் தவிர்ப்பீர்கள்.|எண்ணங்களைப் பிறரிடம் பகிராமல் தனியாகப் போராடுவதால் உறவுகளின் உதவி கிடைக்காமல் போகும்.'
]
];
const EN=[
['You take the lead when someone needs a decision.|Criticism of your standing sparks a sharp reply.','You readily comfort someone in distress.|A hurtful remark from a loved one stays on your mind.','You confront an obstacle without waiting for help.|You answer a perceived wrong before hearing the whole account.','You verify what others tell you.|You keep checking minor details long after a decision is due.','You offer guidance with clear reasons.|You find it hard to hear an alternative to your advice.','You try to preserve affection during disagreements.|You avoid saying what bothers you until resentment grows.','You finish a duty even when it takes longer.|You distrust others and prolong minor disagreements.','You test a new solution rather than follow routine.|Impatience for a quick result disrupts a sound plan.','You work out your thoughts privately.|You withdraw instead of asking for needed assistance.'],
['You assume family financial responsibility.|Your pride turns money discussions into disputes.','You put savings toward a relative who needs help.|Emotion leads you to promise money too soon.','You speak plainly and try to earn by your own effort.|Sharp words strain family ties and impulsive spending reduces savings.','You check prices and household figures before deciding.|Repeated recalculation delays an important financial decision.','You budget essentials and explain choices patiently.|Over-generous commitments cut into your own reserves.','You combine comfort with orderly family spending.|You postpone an uncomfortable budget conversation.','You preserve hard-earned money for future duties.|Excessive caution turns minor purchases into arguments.','You notice unusual ways to increase income.|You spend against earnings that are not yet secured.','You keep personal expenses modest.|Keeping all money concerns private causes misunderstanding.'],
['You begin difficult work without waiting for others.|Siblings or collaborators feel overruled by your initiative.','You share practical skills and help siblings.|You carry a small hurt into later discussions.','You learn a skill by trying it directly.|You rush into work before understanding what needs checking.','You improve a skill through repeated testing.|You revise an already workable solution too often.','You explain what experience has taught you.|You reject another useful method because your own seems superior.','You take care with design and collaborative skills.|You take over others’ work when their pace differs.','You practise steadily until a skill becomes reliable.|You put off a difficult first attempt for too long.','You experiment with unfamiliar tools and methods.|Frequent changes prevent a useful method from maturing.','You develop expertise quietly and independently.|You refuse help that would save time.'],
['You organise household obligations and care for relatives.|You expect the family to accept your final decision.','You notice distress at home and offer reassurance.|A small household conflict lingers in your mind.','You repair household problems promptly.|Hasty repair or spending choices bypass the family.','You compare upkeep, cost and utility before buying.|Repeated criticism of household details unsettles others.','You plan property decisions for lasting benefit.|You repeatedly revisit advice that others declined.','You maintain an inviting and comfortable home.|You avoid speaking about an issue until tension accumulates.','You make slow, methodical property decisions.|You keep reminding relatives of earlier mistakes.','You explore new living arrangements and amenities.|Frequent changes of plan disturb domestic stability.','You maintain a quiet private area at home.|You retreat rather than resolve a family disagreement.'],
['You share knowledge and answer younger people’s questions.|You expect children or students to follow your way.','You adjust teaching to a child’s feelings.|One academic setback makes you question your ability.','You learn difficult material through hands-on effort.|Impatience disrupts teaching and study.','You challenge information and correct small errors.|Perfectionism keeps you revising completed work.','You explain both the reason and purpose of what you learn.|Certainty in your own opinion blocks new evidence.','You combine creativity with patient instruction.|Expecting perfect results puts strain on children.','You practise a demanding subject until it becomes clear.|Excessive self-criticism slows the learning process.','You rapidly adopt unfamiliar technology or subjects.|Too many interests prevent sustained progress.','You discover overlooked details by studying alone.|Avoiding assistance creates unnecessary obstacles.'],
['You take ownership of a difficult assignment.|You assume too many duties to prove yourself.','You help coworkers through stressful periods.|Workplace hurt follows you into private time.','You challenge competitors and finish difficult tasks.|You act on a debt or agreement before checking its terms.','You keep records and rectify mistakes at work.|Checking every small error delays delivery.','You explain complicated problems to coworkers.|You take responsibility for everyone’s difficulties.','You preserve cooperation in a demanding workplace.|You postpone discussing difficult contractual terms.','You sustain steady work through pressure.|You carry every duty alone and tire yourself.','You look for unconventional solutions to competition.|You accept uncertain jobs or debts too quickly.','You quietly detect hidden problems.|You work in isolation instead of seeking help.'],
['You shoulder your share of a partnership.|You demand that your partner endorse your decisions.','You notice your partner’s feelings and show care.|Unspoken disappointment becomes resentment.','You act promptly to protect a shared commitment.|Angry words turn a manageable dispute into a larger one.','You discuss the reasoning behind an agreement.|Questioning every phrase complicates ordinary conversation.','You give thoughtful guidance and plan for the long term.|You leave too little room for your partner’s preferences.','You show affection and make room for compromise.|Avoiding a difficult discussion allows resentment to grow.','You honour long-term commitments.|You repeatedly revisit an old mistake and become distrustful.','You discover creative ways to cooperate.|Expecting quick satisfaction weakens mutual understanding.','You respect private space within a relationship.|You withdraw without explaining your distress.'],
['You take charge when circumstances change.|You interpret an unexpected change as a challenge to your status.','You support people affected by sudden disruption.|Past disappointments colour a new decision.','You act quickly to find an alternative plan.|You rush into a change before checking the facts.','You investigate hidden causes and examine documents.|You turn ordinary uncertainty into an extensive suspicion.','You learn from hard circumstances and reorganise plans.|You cling to an old explanation despite changed facts.','You renegotiate commitments while preserving relationships.|You put off sharing information that needs discussion.','You keep working through a drawn-out difficulty.|You resist necessary change and prolong the strain.','You find unconventional routes out of a setback.|Unverified information magnifies worry.','You carry out quiet research and protect confidences.|You carry a problem alone rather than discuss it.'],
['You put respected guidance into practice.|You argue strongly when an elder questions your beliefs.','You show gratitude and care toward mentors.|A harsh remark from an elder remains on your mind.','You work for a principle you consider important.|You challenge advice before hearing it fully.','You verify what a teacher says and share what you learn.|Small inconsistencies eclipse the central lesson.','You connect ethical principles with lived experience.|Strong conviction prevents you hearing different experience.','You preserve family traditions with kindness.|You conceal an important disagreement to keep the peace.','You follow a long-held principle consistently.|You hesitate to reconsider advice learned years earlier.','You seek knowledge beyond familiar traditions.|You accept a promising new claim too quickly.','You study a belief in private before expressing it.|You misunderstand advice instead of asking for clarity.'],
['You take visible responsibility and finish difficult work.|Concern for status makes workplace criticism feel personal.','You understand clients and help colleagues cooperate.|A critical remark slows your professional decisions.','You begin challenging professional work with energy.|You start too many projects before finishing the first.','You find technical flaws and document solutions.|Continuous revision delays delivery and handover.','You explain the reasons behind sound work and earn trust.|You take on other people’s responsibilities unnecessarily.','You establish trust through effective collaboration.|Avoiding an awkward negotiation weakens your terms.','You earn regard by steady reliable work.|You do too much alone because delegation feels risky.','You experiment with new services and technology.|Hurrying toward quick growth leaves unfinished work.','You develop specialist skill through quiet study.|Keeping your work unseen postpones recognition.'],
['You build useful contacts through shared responsibility.|You promise financial help to win recognition.','You sustain caring friendships over time.|Generosity cuts into necessary savings.','You act quickly when a genuine opportunity arrives.|You plan expenses before earnings are confirmed.','You track actual gains against longer goals.|Endless recalculation delays a saving decision.','You learn about opportunities from knowledgeable people.|Helping everyone reduces your long-term reserves.','You build alliances through service and goodwill.|Avoiding clear money boundaries complicates friendships.','You steadily preserve slow-earned gains.|You become so cautious that worthwhile decisions are postponed.','You find new networks and markets.|You treat expected earnings as certain money.','You preserve a small reliable network.|Reluctance to ask friends for help costs you opportunities.'],
['You arrange private time and cut needless spending.|You spend to defend appearances and sacrifice rest.','You gain quiet relief from caring and reflection.|Unspoken worries follow you into bedtime.','You finish essential tasks promptly and reserve quiet hours.|Unfinished work drives you to cut sleep.','You budget private expenses and study independently.|Minor financial calculations consume time meant for rest.','You reflect on long-term choices and spend on learning.|Helping others leaves too little room for your own recovery.','You enjoy art and quiet recreation within a budget.|Short-lived comforts turn into excessive spending.','You protect rest through a steady routine.|Duty continues to occupy your thoughts long after work.','You make plans for travel or novel experiences.|Unverified expectations lead to wasteful spending.','You use solitude to study and think deeply.|You withhold concerns and miss help from those close to you.']
];
const ROUTE_TA=[
'தன் சுயமுடிவுகளை வெளிப்படுத்தும்',
'குடும்பத்துக்கான பணம், பேச்சு மற்றும் கையிருப்பை நிர்வகிக்கும்',
'தனியாக முயற்சி செய்து திறமையை வளர்க்கும்',
'வீட்டுப் பொறுப்புகளையும் தாயாரின் தேவைகளையும் எதிர்கொள்ளும்',
'கற்ற அறிவையும் குழந்தைகள் சார்ந்த முடிவுகளையும் கையாளும்',
'வேலை, போட்டி, கடன் தொடர்பான பிரச்சினையைத் தீர்க்கும்',
'துணைவர் அல்லது கூட்டாளியுடன் முடிவெடுக்கும்',
'மறைமுகத் தகவலையும் வாழ்க்கை மாற்றங்களையும் எதிர்கொள்ளும்',
'ஆசிரியர், தந்தை அல்லது பெரியோர் வழிகாட்டுதலைப் பெறும்',
'தொழில் சார்ந்த முடிவுகளுக்கும் வெளியுலகப் பொறுப்புகளுக்கும்',
'நண்பர் தொடர்புகளிலும் கிடைக்கும் ஆதாயத்திலும்',
'தனிநேரம், செலவு மற்றும் ஓய்வை அமைக்கும்'
];
const ROUTE_EN=['making personal decisions','managing family money and speech','practising independent skills','caring for home and family','learning and attending to children','meeting work and debt obligations','making joint decisions with a partner','handling confidential matters and major changes','receiving guidance from elders and teachers','carrying professional responsibility','building contacts and managing gains','handling private time, expenses and rest'];
const SIGN_SCENES_TA=[
 'உடனடியாக முடிவெடுக்க வேண்டிய தருணத்தில்',
 'நீண்ட காலம் பொறுமையுடன் தொடரும் வேலையில்',
 'பல தகவல்கள் ஒரே நேரத்தில் வரும் சூழலில்',
 'உறவினரின் உணர்வுகள் சம்பந்தப்பட்ட நேரத்தில்',
 'சுயமரியாதை முக்கியமானதாகத் தோன்றும் நேரத்தில்',
 'சிறிய குறையைத் திருத்த வேண்டிய நிலையில்',
 'இரு தரப்பினரின் கருத்தையும் கேட்க வேண்டிய போது',
 'ஒரு விஷயத்தின் மறைந்த காரணத்தைத் தேடும் இடத்தில்',
 'புதிய ஆலோசனையைச் சோதித்துப் பார்க்கும் நேரத்தில்',
 'நீண்டகாலக் கடமையை நிறைவேற்றும் சூழலில்',
 'வழக்கத்திலிருந்து மாறுபட்ட முடிவைத் தேர்ந்தெடுக்கும் போது',
 'பிறருடைய தேவையை அறிந்து உதவி செய்யும் நேரத்தில்'
];
const SIGN_SCENES_EN=[
 'when immediate action is required','when patient long-term effort is needed',
 'when many pieces of information arrive together','when a relative’s feelings enter the discussion',
 'when personal dignity matters','when an overlooked detail needs correcting',
 'when both sides must be heard','when the hidden cause of an event must be examined',
 'when testing unfamiliar guidance','when following through on a demanding long-term duty',
 'when choosing an unconventional approach','when responding to someone who needs help'
];
const CROSS_TA=[
 ['உங்களுடைய முடிவுகளில்','தனது கருத்தை எப்போது வெளிப்படுத்துவது என்பதைத் தெளிவாகத் தேர்ந்தெடுப்பீர்கள்.','பிரச்சினை வந்த பிறகே முடிவை மாற்றத் தொடங்குவதால் தேவையற்ற உரசல் உண்டாகும்.'],
 ['குடும்பப் பேச்சிலும் பண நிர்வாகத்திலும்','தனக்கான வருமான வழியை உருவாக்கும்போது குடும்பத் தேவையை கணக்கில் எடுப்பீர்கள்.','பணம் பற்றிய கருத்தைத் தெளிவுபடுத்தும் வேகம் குடும்பத்தில் கருத்து வேறுபாட்டை உருவாக்கும்.'],
 ['தனிப்பட்ட முயற்சியிலும் உடன்பிறப்புத் தொடர்பிலும்','புதிய முயற்சியை கற்ற அறிவுடன் இணைத்துச் செய்து பார்க்கிறீர்கள்.','கூட்டு வேலையில் தன் வேகத்தையே எதிர்பார்ப்பதால் மற்றவர் பின்தங்கியதாகத் தோன்றும்.'],
 ['தாய், வீடு மற்றும் சொத்துத் தீர்மானங்களில்','வீட்டின் தேவையைக் கணக்கிட்டு நீண்டகாலப் பயன்பாட்டுக்கே செலவு செய்வீர்கள்.','ஒரு வீட்டுத் திட்டத்தைப் பற்றி மீண்டும் மீண்டும் கேள்வி எழுப்புவதால் செயல்பாடு தாமதமாகும்.'],
 ['கல்வி, சிந்தனை மற்றும் குழந்தைகள் சார்ந்த முடிவுகளில்','கற்ற தகவலைத் தன் அனுபவத்துடன் ஒப்பிட்டுப் பயன்படுத்துவீர்கள்.','மிகுதியான திருத்தமும் கடுமையான எதிர்பார்ப்பும் கற்றலுக்கான நேரத்தைச் செலவிடும்.'],
 ['வேலை, போட்டி மற்றும் கடன் விவகாரங்களில்','பொறுப்புகளை ஒழுங்குபடுத்தி சிரமமான வேலையைத் தொடர்வீர்கள்.','ஒரு பிரச்சினைக்கு உடனடித் தீர்வு தேடுவதால் மற்ற கடமைகள் தேங்கும்.'],
 ['திருமணம் அல்லது நெருக்கமான கூட்டுறவில்','கூட்டாகப் பொறுப்பு ஏற்றுப் பிரச்சினையின் காரணத்தைப் பகிர்ந்து பேசுவீர்கள்.','தனது முடிவே முதன்மை என்று வற்புறுத்தும்போது நெருக்கம் குறையும்.'],
 ['மாற்றங்கள் மற்றும் மறைக்கப்பட்ட விஷயங்களில்','நடந்ததை ஆராய்ந்து அடுத்தமுறை உதவும் மாற்று ஏற்பாட்டை உருவாக்குவீர்கள்.','எல்லா விளைவுகளையும் முன்கூட்டியே அறிய முயல்வதால் தேவையான மாற்றமும் தாமதமாகும்.'],
 ['தந்தை, ஆசிரியர் மற்றும் பெரியோரின் அறிவுரைகளில்','கேட்டதைத் தனது அனுபவத்துடன் சோதித்து பொருத்தமான வழியைப் பின்பற்றுவீர்கள்.','பழைய கொள்கையை விட முடியாமல் புதிதாகச் சொல்வதைக் கேட்க மறுப்பீர்கள்.'],
 ['தொழில், பதவி மற்றும் பொதுப் பொறுப்புகளில்','வேலையைத் தரமாக முடித்து அதன் வழியே நம்பிக்கையைப் பெறுகிறீர்கள்.','பல முயற்சிகளை ஒரே நேரத்தில் முன்னெடுப்பதால் பணியின் நிறைவு பின்தங்கும்.'],
 ['வருமானம், ஆதாயம் மற்றும் நண்பர் தொடர்புகளில்','உறுதியான ஆதாயத்தைச் சேமிப்பாக வைத்துக் கொள்வீர்கள்.','உறுதியாகாத புதிய வாய்ப்பிற்காக முன்கூட்டியே பணம் ஒதுக்குவீர்கள்.'],
 ['செலவு, ஓய்வு மற்றும் தனிநேரத்தில்','முக்கியக் கடமைகளுக்கும் தனக்கான அமைதிக்கும் நேரம் ஒதுக்குவீர்கள்.','முடிக்காத பணியை நினைத்துக்கொண்டே ஓய்வைத் தள்ளுவீர்கள்.']
];
const CROSS_EN=[
 ['In your personal decisions','you explain the reason for the action you choose.','you reconsider choices only after a disagreement develops.'],
 ['In family discussions and financial plans','you connect earnings with actual household needs.','you allow a sharp exchange to shape money decisions.'],
 ['In independent effort and sibling relationships','you apply a newly learned skill directly.','you expect others to work at your pace.'],
 ['In home and property decisions','you compare upkeep against long-term benefit.','repeated questions postpone work that could be completed.'],
 ['In education and decisions involving children','you apply lessons to practical experience.','persistent corrections place too much pressure on learning.'],
 ['In work and financial obligations','you order tasks and sustain effort.','trying to solve everything at once creates a backlog.'],
 ['In marriage and partnership','you share responsibilities and discuss practical reasons.','insisting on one choice reduces closeness.'],
 ['In transitions and confidential matters','you reflect and prepare a useful alternate plan.','trying to foresee every outcome delays a needed step.'],
 ['In guidance from parents and teachers','you test advice against experience.','clinging to an old conviction blocks a useful lesson.'],
 ['In professional responsibility','completed high-quality work earns trust.','starting too many plans postpones delivery.'],
 ['In income and social opportunities','you preserve gains actually received.','unconfirmed opportunities influence spending too soon.'],
 ['In private spending and rest','you make room for necessary reflection.','unfinished work repeatedly displaces rest.']
];
const ROUTE_VERBS_TA=['முக்கியப் பங்கு வகிக்கிறது','சம்பாதிக்கும் முறையையும் பேச்சின் வேகத்தையும் மாற்றுகிறது','நீங்கள் முயற்சி செய்யும் வழியை அமைக்கிறது','வீட்டுக்கான திட்டங்களில் முன்னிலைக்கு வருகிறது','கற்றதைப் பயன்படுத்தும் விதத்தை வடிவமைக்கிறது','வேலைக்கான முடிவுகளை மாற்றுகிறது','இருவரின் எதிர்பார்ப்புகள் வெளிப்படும் இடமாக அமைகிறது','மாற்று வழி தேர்ந்தெடுக்கும் பழக்கத்துடன் இணைகிறது','அறிவுரைகளைச் செயல்படுத்தும் முறையைத் தீர்மானிக்கிறது','தொழிலின் அன்றாட முடிவுகளில் வெளிப்படுகிறது','வாய்ப்பை கையாளும் போது முக்கியமாகிறது','நேரத்தையும் செலவையும் ஒதுக்கும் முறையில் இடம் பெறுகிறது'];
const ENDING_TA=[
['நியாயமான காரணம் புரிந்த பிறகு எடுத்த முடிவை உறுதியாக நிறைவேற்றுவீர்கள்.','எதிர்க்கும் முன் முழுக் காரணத்தையும் கேட்டால் தேவையற்ற உரசல் குறையும்.'],
['குடும்பத் தேவைக்கான பணத்தையும் விருப்பச் செலவையும் தனித்தனியாக வைத்துச் செயல்படுவீர்கள்.','வார்த்தையின் வேகத்தையும் பண உறுதிகளையும் கட்டுப்படுத்தாவிட்டால் உறவில் இடைவெளி உருவாகும்.'],
['ஒரு முறையைத் தேர்ந்தெடுத்து தொடர்ந்து பயிற்சி செய்வதன் மூலம் தனித்திறனை நிலைப்படுத்துவீர்கள்.','ஒரே வேலையைத் திரும்பத் திரும்பத் தொடங்குவதற்குப் பதிலாக முடித்துக் கொடுப்பதில் கவனம் தேவை.'],
['வீட்டாரின் தேவையையும் பராமரிப்புச் செலவையும் இணைத்துச் சிறந்த முடிவை எடுப்பீர்கள்.','வீட்டைச் சீராக வைத்திருக்க முயலும்போது அங்கே வாழ்பவர்களின் கருத்து புறக்கணிக்கப்படக்கூடாது.'],
['ஆராய்ந்த அறிவை நடைமுறைப் பயன்பாட்டிற்கு கொண்டு வருவது உங்கள் கற்றலின் சிறந்த வெளிப்பாடு.','எல்லாம் குறையின்றி இருக்க வேண்டும் என்ற எதிர்பார்ப்பு இளையோருக்கு அதிக அழுத்தம் தரும்.'],
['பொறுப்புகளை முன்னுரிமைப்படுத்தினால் சிரமமான பணியையும் முடித்து நம்பிக்கை பெறுவீர்கள்.','எல்லாவற்றையும் தனியாக ஏற்கும் முயற்சி உங்கள் நேரத்தையும் மன ஆற்றலையும் குறைக்கும்.'],
['துணைவருடன் கருத்தைத் தெளிவுபடுத்தி இருவருக்கும் பொருந்தும் முடிவை உருவாக்குவீர்கள்.','ஒரே முடிவை வற்புறுத்துவதால் எளிதில் தீரக்கூடிய கருத்து வேறுபாடும் நீளும்.'],
['பழைய அனுபவத்தைக் கொண்டு மாற்றுத் திட்டம் உருவாக்குவது உங்கள் முக்கியமான பதில் ஆகும்.','உண்மையைச் சரிபார்க்கும் பழக்கம் அளவுக்கு மீறிச் சந்தேகமாக மாறினால் முடிவு தாமதப்படும்.'],
['கேட்ட அறிவுரையைச் செயலில் சோதித்து உங்களுக்கு ஏற்ற நல்ல வழியைத் தேர்ந்தெடுப்பீர்கள்.','தன் கொள்கையைப் பாதுகாப்பதற்காகப் புதிய சரியான ஆதாரத்தை நிராகரிக்க வேண்டாம்.'],
['முடித்த பணியின் தரமே உங்களுடைய தொழில் மதிப்பை உருவாக்கும்.','தொடங்கிய முயற்சிகளை முழுமைப்படுத்தாமல் அடுத்த முயற்சிக்குச் செல்வது நம்பிக்கையைக் குறைக்கும்.'],
['உறுதியான வருமானத்தில் ஒரு பகுதியைப் பாதுகாப்பதால் நீண்டகால இலக்கு நிலைபெறும்.','வரப்போகும் ஆதாயத்தை வருமானம் என்று எண்ணி முன்கூட்டியே கடமை ஏற்காதீர்கள்.'],
['அமைதியான நேரத்தைப் பாதுகாத்தால் பிற பொறுப்புகளையும் தெளிவாகக் கையாள்வீர்கள்.','முடிக்காத வேலைகளுக்காக உறக்க நேரத்தை அடிக்கடி ஒதுக்குவது வாழ்க்கை ஒழுங்கைக் குலைக்கும்.']
];
const ENDING_EN=[
['You act consistently once the facts are clear.','Hearing the full story before answering reduces needless friction.'],
['You separate household essentials from optional spending.','Sharp words and premature promises strain trust at home.'],
['Continued practice turns an initial effort into a dependable skill.','Finishing a chosen method matters more than restarting it.'],
['You balance upkeep costs against the needs of those at home.','A well-ordered home also needs room for others’ preferences.'],
['You apply knowledge rather than simply collecting it.','Demanding flawless work puts excessive pressure on younger people.'],
['You gain confidence by prioritising and completing duties.','Carrying everything alone consumes the time needed to recover.'],
['You make space for joint choices and plain discussion.','Insisting on one answer needlessly prolongs disagreement.'],
['Past experience helps you prepare an alternative plan.','An endless search for certainty postpones necessary action.'],
['You test advice in practice before adopting it.','New evidence deserves a hearing even when conviction runs strong.'],
['Completed work, not quick promises, earns your professional regard.','Leaving projects unfinished weakens others’ confidence.'],
['You preserve a portion of reliable income for later needs.','Projected gains should not be spent like money already earned.'],
['Protecting quiet time improves how you handle other obligations.','Letting unfinished tasks consume sleep disrupts daily routines.']
];
function moonNote(e,ta){if(!e.moon?.known)return '';if(e.moon.nature==='malefic')return ta?'பிறப்பில் சந்திர பலம் குறைந்த திதியில் அமைந்திருப்பதால், உணர்ச்சி எழும் நேரத்தில் உடனடி எதிர்வினை மேலோங்கும் தொடர்புக்கும் முக்கியத்துவம் உள்ளது.':'The Moon falls below the configured fifth-tithi threshold, adding emphasis to quicker emotional reactions.';
 return ta?'பிறப்புச் சந்திரன் பலமான திதியில் இருப்பதால், பிறர் மனநிலையைப் புரிந்துகொண்டு செயலைச் சீரமைக்கும் தொடர்பு வலிமை பெறுகிறது.':'The Moon falls within the stronger fifth-tithi interval, adding an emphasis on responsive choices.';}
function hasAspect(d,planet,house){return d.houses[house-1].aspects.includes(planet)}
function joinOthers(d,key){return PLANETS.filter(p=>p!==key&&d.planets[p].house===d.planets[key].house);}
function create(d,n,lang='ta',core,opts={}){
 if(!core||typeof core.influence!=='function')throw Error('V292 requires evaluated D1 influence');
 const ta=lang!=='en',h=d.houses[n-1],lord=d.planets[h.lord],e=core.influence(d,n,opts),pos=e.positive,neg=e.negative;
 const choose=(e.dominantSide==='support'?pos:neg)||e.rows[0];
 const modify=(choose.score>=0?neg:pos)||e.rows.find(x=>x.key!==choose.key)||null;
 const idx=PLANETS.indexOf(choose.key),mid=modify?PLANETS.indexOf(modify.key):-1;
 const text=(k,sign)=>{const j=PLANETS.indexOf(k);const s=(ta?TA:EN)[n-1][j].split('|');return s[sign>=0?0:1];};
 const list=[],add=(t,key,actors)=>{if(t&&!list.some(p=>p.text===t))list.push({house:n,text:t,evidence:{source:key,actors:actors||[]}})};
 if(n===1){let mq=d.planets.Moon.longitude;const nk=Number.isFinite(mq)?Math.floor((((mq%360)+360)%360)/(360/27)):null,pada=Number.isFinite(mq)?Math.floor(((((mq%360)+360)%360)%(360/27))/(360/108))+1:null;
 if(ta)add(`${SIGNS_TA[d.lagna]} லக்னத்தின் ${ASC_TA[d.lagna]} என்ற பொதுவான பண்புடன், ${SIGNS_TA[d.planets.Moon.sign]} ராசியின் ${ASC_TA[d.planets.Moon.sign]} என்ற மனப்பாங்கு கலந்துள்ளது.${nk!==null?' '+NAK_TA[nk]+' '+pada+'-ஆம் பாதத்தின் '+NAK_TONE_TA[nk]+' என்ற இயல்பும் இணைகிறது.':''}`, 'lagna-rasi-nakshatra',['Moon',h.lord]);
 else add(`A ${SIGNS_EN[d.lagna]} ascendant brings ${ASC_EN[d.lagna]}, while the ${SIGNS_EN[d.planets.Moon.sign]} Moon adds ${ASC_EN[d.planets.Moon.sign]}. ${nk!==null?'The Moon is in '+NAK_EN[nk]+' pada '+pada+'.':''} These differing tendencies affect close relationships and decisive moments.`, 'lagna-rasi-nakshatra',['Moon',h.lord]);}
 const first=text(choose.key,choose.score),second=modify?text(modify.key,modify.score):'';
 // Only natal connections (not an arbitrary global personality paragraph) may enter text.
 const context=choose.tags.includes('occupant')?'occupant':choose.tags.includes('aspect')?'aspect':choose.tags.includes('house-lord')?'house-lord':choose.tags.includes('lord-conjunction')?'lord-conjunction':choose.tags.includes('lord-aspect')?'lord-aspect':'linked';
 if(!(n===1&&choose.key==='Saturn'&&hasAspect(d,'Saturn',1)))add(ta?`${SIGN_SCENES_TA[d.planets[choose.key].sign]}, ${first}`:`${SIGN_SCENES_EN[d.planets[choose.key].sign]}, ${first}`,'leading-lived-outcome',[choose.key]);
 if(modify)add(ta?`${SIGN_SCENES_TA[d.planets[modify.key].sign]}, ${second}`:`${SIGN_SCENES_EN[d.planets[modify.key].sign]}, ${second}`,'counter-lived-outcome',[modify.key]);
 // The house ruler belongs to the FOCUS house. Occupants/aspects of the focus
 // house must never be described as occupying the ruler's separate house.
 const cross=(ta?CROSS_TA:CROSS_EN)[n-1];
 const dest=lord.house===n?(ta?'அந்தத் துறையின் பொறுப்பைத் தானே சுமக்கும்':'taking responsibility in the same area'):(ta?ROUTE_TA:ROUTE_EN)[lord.house-1],lordSide=e.rows.find(x=>x.key===h.lord)?.score||0;
 const lordHouse=d.houses[lord.house-1],joined=joinOthers(d,h.lord),lordAspects=lordHouse.aspects;
 // Output describes a lived setting. The precise ruler, rasi, separate ruler-house
 // conjunction and aspects remain machine evidence, not a misleading prose list.
 if(ta){
  add(`${cross[0]} ${dest} இயல்பு ${ROUTE_VERBS_TA[n-1]}. ${cross[lordSide>=0?1:2]}`,'ruler-situation-result',[h.lord,...joined,...lordAspects]);
 }else{
  add(`${cross[0]}, the ruler's placement connects the matter with ${dest}; ${cross[lordSide>=0?1:2]}`,'ruler-situation-result',[h.lord,...joined,...lordAspects]);
 }
 // A third *directly contacting* planet can add a distinct consequence,
 // but never by reusing another house's stock text or restating the leading one.
 const third=e.rows.find(r=>r.key!==choose.key&&r.key!==modify?.key&&
   (r.tags.includes('occupant')||r.tags.includes('aspect'))&&
   Math.sign(r.score)===Math.sign(choose.score)&&Math.abs(r.score)>=Math.abs(choose.score)*0.5);
 if(third)add(ta?`${SIGN_SCENES_TA[d.planets[third.key].sign]}, ${text(third.key,third.score)}`:`${SIGN_SCENES_EN[d.planets[third.key].sign]}, ${text(third.key,third.score)}`,'third-direct-contact-result',[third.key]);
 if(n===1){
  if(e.moon?.known&&d.houses[d.planets.Moon.house-1].aspects.includes('Mars'))add(ta?'சந்திரனின் உணர்ச்சிப் பிரதிபலிப்பில் செவ்வாயின் வேகம் கலப்பதால், அநியாயம் நடந்ததாக நினைக்கும் நேரத்தில் உடனே எதிர்த்துப் பேசுவீர்கள். சம்பவம் முடிந்த பிறகு காரணத்தை மீண்டும் ஆராய்வது அந்த வேகத்தைச் சீரமைக்கிறது.':'Mars aspecting the Moon adds rapid reactions when something seems unjust. After the moment passes, re-examining the reasons helps settle the response.','moon-mars-conditional',['Moon','Mars']);
  if(hasAspect(d,'Saturn',1)){const s=d.planets.Saturn;add(ta?`${s.dignity==='own'?'சொந்த ராசியில் உள்ள ':''}${s.retrograde?'வக்கிர ':''}சனி லக்னத்தைப் பார்ப்பதால் ஒருவரை நம்புவதற்கு முன் பலமுறை சோதிப்பீர்கள். நீங்கள் கவனித்த தவற்றை அப்படியே விட்டுச் செல்லாமல் திருத்துவீர்கள்; ஆனால் அதே பழக்கம் சாதாரண விவாதத்தையும் நீட்டிக்கும்.`:`${s.dignity==='own'?'Strong ':' '}${s.retrograde?'retrograde ':''}Saturn aspecting the ascendant brings persistence and scrutiny. You correct overlooked errors, but the same resolve can prolong an ordinary disagreement.`,'saturn-asc-conditional',['Saturn']);}
  if(e.moon?.known&&d.planets.Moon.house===d.planets.Jupiter.house&&d.houses[d.planets.Moon.house-1].aspects.includes('Mars')){add(ta?'குருவின் இரக்கமும் நியாய உணர்வும் சந்திரனின் உணர்ச்சியுடன் இணைந்துள்ளன; அதே இடத்தைச் செவ்வாய் பார்ப்பதால் அன்பு வைத்தவரின் தவறையும் உடனடியாகக் கேள்வி கேட்பீர்கள். கோபத்திற்குப் பிறகு தன் பங்கில் தவறு இருந்ததா என்று சிந்தித்து சரிசெய்யும் குணமும் இதனுடன் கலந்து நிற்கிறது.':'Jupiter and Moon together under Mars’s aspect join compassion to a forceful reaction against perceived wrongs. On reflection, you examine your own part and look for a correction.','jupiter-moon-mars-conditional',['Jupiter','Moon','Mars']);}
  // Lunar tithi modifies influence scores; generic Moon-phase filler is not printed.
 }
 if(n===2&&h.lord==='Mars'&&lord.house===3&&hasAspect(d,'Jupiter',2))add(ta?'மனதில் தோன்றிய கருத்தைச் சுற்றிவளைத்துப் பேசாமல் நேரடியாகச் சொல்வீர்கள். தவறைச் சுட்டிக்காட்டும்போது அதன் காரணத்தையும் விளக்குவீர்கள்; ஆனால் வார்த்தையின் வேகம் குடும்பத்தினருக்குக் கடுமையாகத் தோன்றும். எதைச் சொல்கிறீர்கள் என்பதோடு எப்போது சொல்கிறீர்கள் என்பதும் உறவை மாற்றுகிறது.':'With Mars ruling speech from the third house and Jupiter aspecting the second, you speak plainly and explain the reason behind a correction. The timing and sharpness of the words, however, can strain family conversations.','mars-2nd-lord-jupiter-conditional',['Mars','Jupiter']);
 if(n===5&&h.occupants.includes('Mercury')&&h.aspects.includes('Saturn'))add(ta?'கேட்ட தகவலைச் சோதிக்காமல் ஏற்க மாட்டீர்கள். ஏற்கெனவே முடிந்த செயலிலும் சிறிய குறை தெரிந்தால் மறுபடியும் திருத்துவீர்கள்; அந்தத் துல்லியமே கற்றலில் நன்மையாகவும் நேரச் செலவில் தடையாகவும் செயல்படுகிறது.':'Mercury in the fifth under Saturn’s aspect supports checking information and refining work, though repeated revisions can consume the time meant for completion.','mercury-saturn-5th-conditional',['Mercury','Saturn']);
 if(n===10&&h.occupants.includes('Rahu')&&h.aspects.includes('Mars')&&h.aspects.includes('Jupiter'))add(ta?'தொழிலில் புதிய முறையைத் தேர்ந்தெடுத்து முயற்சி செய்வீர்கள். குறைக்கான காரணத்தைக் கண்டுபிடித்து மாற்றும் வேகம் அதிகம்; பல முயற்சிகளைத் தொடங்கும் போதும் ஒன்றை முழுமையாக முடித்துக் காட்டுவதில்தான் உங்கள் மதிப்பு உருவாகிறது.':'Rahu in the tenth, with Mars and Jupiter aspects, combines experimentation and initiative with the need to complete an undertaking and demonstrate its quality.','rahu-mars-jupiter-10th-conditional',['Rahu','Mars','Jupiter']);
 if(list.length<3)add((ta?ENDING_TA:ENDING_EN)[n-1][e.dominantSide==='support'?0:1],'minimum-evidenced-outcome',[choose.key,h.lord]);
 return {number:n,title:(ta?TITLES_TA:TITLES_EN)[n-1],paragraphs:list,evidence:{method:'V292-house-planet-outcome-conditioned',focusHouse:n,houseLord:h.lord,actualLordHouse:lord.house,actualLordSign:lord.sign,leadingPlanet:choose.key,leadingScore:choose.score,relation:context,opposingPlanet:modify?.key||null,directOccupants:h.occupants,directAspects:h.aspects,lordHouseOccupants:joined,lordHouseAspects:lordAspects,balance:e.balance,contacts:e.rows,moon:e.moon}};
}
return Object.freeze({create,version:'292-varying-lived-consequences'});
});


/* SMV ASTRO V292 — lean D1 evidence evaluator and output orchestrator.
 * Former V289–V291 stock-prose libraries and unused compilers are not shipped.
 * Pure local calculations; no Firebase, requests, timers or DOM observers.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.SMVD1HumanNarrative=api;})(typeof window!=='undefined'?window:globalThis,function(){'use strict';
const KEYS=['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu'];
const KARAKA=['Sun','Jupiter','Mars','Moon','Jupiter','Mars','Venus','Saturn','Jupiter','Mercury','Jupiter','Saturn'];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const dec=n=>Number.isFinite(n)?Math.round(n*1000)/1000:null;
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const dedupe=arr=>[...new Set(arr)];
function lunar(d){const moon=d?.planets?.Moon,sun=d?.planets?.Sun;
 if(!finite(moon?.longitude)||!finite(sun?.longitude))return {known:false,reason:'requires Sun and Moon absolute longitudes',phase:'unknown',strength:null,nature:null};
 const angle=((moon.longitude-sun.longitude)%360+360)%360;
 const strength=1-Math.abs(180-angle)/180; // 0 new, 1 full, 0 next new
 const waxing=angle<180,bright=angle>=48&&angle<228;
 const tithi=Math.floor(angle/12)+1;
 return {known:true,elongation:dec(angle),tithi,phase:angle<180?'waxing':'waning',relativeIllumination:dec((1-Math.cos(angle*Math.PI/180))/2),strength:dec(strength),nature:bright?'benefic':'malefic',threshold:'fifth-tithi user rule',newMoonEquivalent:angle<6||angle>=354?'Saturn/Rahu strength analogy':null,fullMoonEquivalent:Math.abs(180-angle)<6?'Jupiter strength analogy':null};
}
function contactsWith(d,k){const p=d.planets[k];if(!p)return [];return KEYS.filter(x=>x!==k&&d.planets[x]&&p.house===d.planets[x].house);}
function basicNature(k,moon){if(k==='Moon')return moon.known?(moon.nature==='benefic'?0.45+0.85*moon.strength:-1.30*(1-moon.strength*.30)):0;return ({Jupiter:1.3,Venus:1.05,Mercury:0.6,Sun:-0.62,Mars:-0.95,Saturn:-1.22,Rahu:-1.35,Ketu:-1.08})[k]||0;}
function mercuryNature(d,moon){const together=contactsWith(d,'Mercury');const mal=together.filter(k=>basicNature(k,moon)<-0.15),good=together.filter(k=>basicNature(k,moon)>0.15);
 // Do not turn Mercury entirely good merely because Venus shares a sign with a combust Sun.
 const burn=!!d.planets.Mercury.combust;
 const raw=clamp(0.65+good.reduce((s,k)=>s+0.22*Math.abs(basicNature(k,moon)),0)-mal.reduce((s,k)=>s+0.44*Math.abs(basicNature(k,moon)),0)-(burn?.35:0),-1.25,1.25);
 // The configured rule classifies Mercury as malefic upon conjunction with a malefic.
 // Benefic conjunction still mitigates severity, rather than flipping classification.
 const value=mal.length?Math.min(-0.24,raw-(burn?.27:0)):raw;
 return {value,raw,maleficAssociates:mal,beneficAssociates:good,combust:burn};
}
function functional(d,k){const owned=d.houses.filter(h=>h.lord===k).map(h=>h.no);if(!owned.length)return 0;
 let score=0;for(const h of owned){score+=({1:1.05,2:0,3:-0.42,4:0.12,5:0.83,6:-0.72,7:0,8:-0.68,9:0.9,10:0.26,11:-0.3,12:-0.55})[h]||0;}
 return clamp(score,-1.1,1.4);
}
const dignityScore={exalted:1.7,moolatrikona:1.55,own:1.48,friend:1.15,neutral:1,enemy:.87,debilitated:.65,undetermined:1};
function grade(d,k,moon,options){const p=d.planets[k];const dign=options.planetDignity?options.planetDignity(d,p):null;
 const state=dign?.state&&dign.state!=='undetermined'?dign.state:p.dignity;
 let power=dignityScore[state]||1;
 if(p.combust&&k!=='Sun')power*=.8;
 // retrograde can intensify expression/reassessment; no universal 'retrograde is evil' rule.
 if(p.retrograde&&!['Rahu','Ketu'].includes(k))power*=1.10;
 let nat=k==='Mercury'?mercuryNature(d,moon).value:basicNature(k,moon);
 const fn=functional(d,k);
 let val=clamp(nat+.42*fn,-1.8,1.8);
 if(k==='Moon'&&!moon.known)val=.05; // no inferred birth tithi from rasi alone
 if(k==='Moon'&&moon.known){power*=moon.nature==='benefic'?(0.65+.5*moon.strength):(1.25-.3*moon.strength);}
 return {key:k,sign:p.sign,house:p.house,retrograde:!!p.retrograde,combust:!!p.combust,dignity:state,power:dec(power),natural:dec(nat),functional:dec(fn),direction:dec(val),mercury:k==='Mercury'?mercuryNature(d,moon):undefined};
}
function influence(d,focus,options={}){
 const h=d.houses[focus-1],lord=d.planets[h.lord],moon=lunar(d),influences=new Map();
 const take=(key,kind,weight)=>{if(!d.planets[key])return;const old=influences.get(key)||{key,weight:0,tags:[]};old.weight=Math.max(old.weight,weight);old.tags.push(kind);influences.set(key,old);};
 take(h.lord,'house-lord',1.6);
 for(const k of h.occupants)take(k,'occupant',1.55);
 for(const k of h.aspects)take(k,'aspect',1.13);
 for(const k of contactsWith(d,h.lord))take(k,'lord-conjunction',.78);
 for(const p of Object.values(d.planets))if(p.key!==h.lord&&d.houses[lord.house-1].aspects.includes(p.key))take(p.key,'lord-aspect',.80);
 const dispositor=d.houses.find(x=>x.sign===lord.sign)?.lord;if(dispositor&&dispositor!==h.lord)take(dispositor,'lord-dispositor',.48);
 // Primary karaka is independent only if a different graha; never double-count same root.
 take(KARAKA[focus-1],'karaka',.42);
 const rows=[...influences.values()].map(x=>{const g=grade(d,x.key,moon,options);let adjustment=0;
  // In an upachaya house, persistent malefic discipline can have constructive effort effects.
  if([3,6,10,11].includes(focus)&&['Saturn','Mars'].includes(x.key)&&x.tags.includes('occupant'))adjustment=.28*g.power;
  const scalar=g.direction*g.power*x.weight+adjustment;
  return {...g,tags:dedupe(x.tags),weight:x.weight,score:dec(scalar),abs:Math.abs(scalar)};
 }).sort((a,b)=>b.abs-a.abs||KEYS.indexOf(a.key)-KEYS.indexOf(b.key));
 const good=rows.filter(x=>x.score>0).reduce((s,x)=>s+x.score,0),bad=-rows.filter(x=>x.score<0).reduce((s,x)=>s+x.score,0);
 const balance=(good-bad)/(good+bad||1),dominant=balance>.13?'support':balance<-.13?'pressure':'mixed';
 const pos=rows.filter(x=>x.score>0).sort((a,b)=>b.score-a.score)[0]||null;
 const neg=rows.filter(x=>x.score<0).sort((a,b)=>a.score-b.score)[0]||null;
 return {house:focus,houseLord:h.lord,lordHouse:lord.house,lordSign:lord.sign,moon,good:dec(good),bad:dec(bad),balance:dec(balance),dominant,dominantSide:balance>=0?'support':'pressure',rows,positive:pos,negative:neg,allNinePlanetsReviewed:KEYS.length,relatedHouses:dedupe(rows.map(x=>x.house)).sort((a,b)=>a-b)};
}
function render(d,lang='ta',options={}){
 if(!Number.isInteger(d?.lagna)||!Array.isArray(d?.houses)||d.houses.length!==12||KEYS.some(k=>!d?.planets?.[k]))throw Error('Complete normalized D1 with all nine planets required');
 const locale=lang==='en'?'en':'ta';
 const livedApi=(typeof globalThis!=='undefined'&&globalThis.SMVD1LivedResultsV292)||((typeof module==='object'&&module.exports)?require('./d1-lived-results-v292.js'):null);
 if(!livedApi||typeof livedApi.create!=='function')throw Error('V292 lived-result module not loaded');
 const physicalApi=(typeof globalThis!=='undefined'&&globalThis.SMVD1PhysicalMedical)||((typeof module==='object'&&module.exports)?require('./d1-physical-medical.js'):null);
 if(!physicalApi||typeof physicalApi.physical!=='function'||typeof physicalApi.medical!=='function')throw Error('V291 physical/medical reader not loaded');
 return {lang:locale,lagnaSign:d.lagna,
 topics:Array.from({length:12},(_,i)=>livedApi.create(d,i+1,locale,{influence},options)),
 physicalTopics:Array.from({length:12},(_,i)=>physicalApi.physical(d,i+1,locale,{influence},options)),
 medicalTopics:physicalApi.medical(d,locale,{influence},options),
 lunarEvidence:lunar(d),source:'D1-only',method:'V292 subject-specific house-and-graha results + V291 physical + symbolic medical'};
}
return Object.freeze({render,lunar,influence,grade,version:'292-lived-results-12-houses'});
});
