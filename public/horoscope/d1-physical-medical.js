/* SMV ASTRO V293 — house-conditioned constitution and traditional medical symbolism.
 * Deliberately NOT a diagnostic model, disease forecast, medical risk score,
 * estimate of organ functioning, or reason for using spectacles. Works offline.
 * Input is the already normalized natal D1; no I/O, observers, caches, API calls.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.SMVD1PhysicalMedical=api;})(typeof window!=='undefined'?window:globalThis,function(){'use strict';
const PN={Sun:'சூரியன்',Moon:'சந்திரன்',Mars:'செவ்வாய்',Mercury:'புதன்',Jupiter:'குரு',Venus:'சுக்கிரன்',Saturn:'சனி',Rahu:'ராகு',Ketu:'கேது'};
// Sign correspondences are Kalapurusha symbolism; house themes are different.
const SIGN_TA=['மேஷ','ரிஷப','மிதுன','கடக','சிம்ம','கன்னி','துலா','விருச்சிக','தனுசு','மகர','கும்ப','மீன'];
const BODIES=[
 {ta:'தலை, முகத்தோற்றம் மற்றும் தேக அமைப்பு',en:'Head, appearance and constitution',
  robustTA:'தலை–முக வெளிப்பாட்டில் உறுதியான தோற்றமும் உடல் இயக்கத்தில் ஒழுங்கும் முன்னிலை பெறுகின்றன.',fragileTA:'தலை–முக வெளிப்பாட்டில் இறுக்கமான தோற்றமும் அன்றாட இயக்கத்தில் சோர்வைக் கவனிக்கும் பழக்கமும் முன்னிலை பெறுகின்றன.',
  robustEN:'The traditional reading favours a firm bearing and deliberate physical carriage.',fragileEN:'The traditional reading emphasizes a restrained bearing and fluctuating physical pace.'},
 {ta:'முகம், பற்கள், வாய் மற்றும் கண் குறியீடுகள்',en:'Face, teeth, mouth and vision symbolism',robustTA:'முகத்தில் தெளிவான வெளிப்பாடும் பேச்சின் போது கட்டுப்பட்ட முக அசைவுகளும் வலுப்பெறுகின்றன.',fragileTA:'முகத்திலும் வாயிலும் இறுக்கமான வெளிப்பாடும் உணவு மற்றும் பேச்சு ஒழுங்கைத் தொடர்ந்து மாற்றும் போக்கும் மேலோங்குகின்றன.',robustEN:'Clear expression and controlled facial movement take prominence.',fragileEN:'A restrained facial expression and changing routines are emphasized.'},
 {ta:'தோள், கை மற்றும் உடலுழைப்பின் இயக்கம்',en:'Shoulders, hands and physical exertion',robustTA:'கைகளால் செயலைத் தொடங்கும் சுறுசுறுப்பும் தொடர்ந்து பயிற்சி செய்யும் ஒழுங்கும் இணைகின்றன.',fragileTA:'கைச் செயல்களில் முதலில் வேகமும் பின்னர் தாமதமாக நிறைவு செய்யும் பழக்கமும் வெளிப்படுகின்றன.',robustEN:'Initiative with the hands is combined with repeatable practice.',fragileEN:'A fast start followed by uneven pacing is emphasized.'},
 {ta:'மார்பு, ஓய்வு மற்றும் உடல் சுகம்',en:'Chest, rest and physical comfort',robustTA:'வீட்டில் ஓய்வை ஒழுங்குபடுத்திக் கொள்ளும் பழக்கமும் உடல் சுகத்தைக் காப்பாற்றும் விருப்பமும் இணைகின்றன.',fragileTA:'வீட்டுக் கடமைகளை முடிக்க முயல்வதால் ஓய்வு நேரத்தைத் தள்ளிவைக்கும் பழக்கம் முன்னிலைப்படுகிறது.',robustEN:'Regular home rest and attention to comfort are traditional themes.',fragileEN:'Putting home duties before rest is the prevailing routine theme.'},
 {ta:'மேல்வயிறு மற்றும் உடல் நடுப்பகுதி',en:'Upper abdomen and midsection',robustTA:'உடல் நடுப்பகுதியில் சீரான தோற்றமும் உணவு ஒழுங்கைப் பேணும் பழக்கமும் முன்னிலை பெறுகின்றன.',fragileTA:'உடல் நடுப்பகுதியில் சதைப்பற்று மற்றும் ஒழுங்கற்ற நேர உணவுப் பழக்கத்தின் மாறுபாடு குறிப்பிடத்தக்கதாகிறது.',robustEN:'Balanced midsection symbolism and orderly meals are emphasized.',fragileEN:'Fuller midsection symbolism and irregular eating routines take focus.'},
 {ta:'வயிற்றின் கீழ்ப்பகுதி மற்றும் அன்றாட உழைப்பு',en:'Lower abdomen and daily exertion',robustTA:'பணிச்சுமையைப் பகுதிகளாகப் பிரித்து செய்யும் ஒழுங்கு உடற்பழக்கத்திலும் பிரதிபலிக்கிறது.',fragileTA:'பணியை முழுவதும் முடிக்க வேண்டும் என்ற பிடிப்பால் உணவு, ஓய்வு நேரங்கள் மாறும் பழக்கம் மேலோங்குகிறது.',robustEN:'The emphasis is on an organised rhythm of daily activity.',fragileEN:'Work demands tend to displace regular food and rest routines.'},
 {ta:'இடுப்பு மற்றும் உடல் சமநிலை',en:'Waist and physical balance',robustTA:'இடுப்பின் இயக்கத்தில் சமநிலையைக் காக்கும் ஒழுக்கமும் மெதுவான தொடர்ச்சியும் முன்னிலைப்படுகின்றன.',fragileTA:'நீண்ட நேரம் ஒரே வேலையில் ஈடுபடுவதால் உடற்பயிற்சிக்கும் இடைவெளிக்கும் இடையே ஒழுங்கின்மை முன்னிலைப்படுகிறது.',robustEN:'A measured approach to balance and sustained movement is highlighted.',fragileEN:'Long uninterrupted tasks challenge routine movement breaks.'},
 {ta:'நீண்டகால உடல் மாற்றங்கள்',en:'Long-term bodily transitions',robustTA:'உடல் பழக்கங்களை அனுபவத்துக்கு ஏற்றபடி மாற்றிக் கொள்ளும் திறன் முன்னிலைப்படுகிறது.',fragileTA:'உடல் நிலைமாற்றங்களைப் பற்றி அதிகம் சிந்தித்து பழக்கங்களை அடிக்கடி மாற்றும் போக்கு மேலோங்குகிறது.',robustEN:'Adapting habits over time is the stronger theme.',fragileEN:'Repeated adjustment of routines becomes the traditional theme.'},
 {ta:'தொடை, நடையியல் மற்றும் நீண்ட பயணம்',en:'Thighs, gait and extended travel',robustTA:'நீண்டநேரப் பயணத்திலும் அன்றாட நடையிலும் சீரான வேகத்தைப் பேணும் பழக்கம் முன்னிலைப்படுகிறது.',fragileTA:'அவசரத்தில் பயணத்தைத் தொடங்கி நடுவில் வேகத்தைக் குறைக்கும் மாறுபாடு மேலோங்குகிறது.',robustEN:'A steady pace is emphasized in sustained walking and travel.',fragileEN:'Changing pace across long activities is more prominent.'},
 {ta:'முழங்கால், எலும்பு மற்றும் வேலைத் திறன்',en:'Knees, skeletal symbolism and workload',robustTA:'உடல் இயக்கத்தை மெதுவாகவும் ஒழுங்காகவும் தொடரும் கட்டுப்பாடு முன்னிலை பெறுகிறது.',fragileTA:'உழைப்பைக் குறைவான இடைவெளியில் நீட்டிப்பதால் உடலுக்கான ஓய்வை மறுக்கும் பழக்கம் மேலோங்குகிறது.',robustEN:'Steady pacing and disciplined activity are emphasized.',fragileEN:'Extended work without sufficient breaks is the dominant routine theme.'},
 {ta:'காலின் கீழ்ப்பகுதி மற்றும் நீடித்த முயற்சி',en:'Lower legs and repeated effort',robustTA:'ஒரு உடற்பழக்கத்தைத் தொடர்ந்து செய்வதற்கான கட்டுப்பாடு வெளிப்படுகிறது.',fragileTA:'ஒரே நாளில் அதிகம் செய்துவிட்டு பின்பு இடைவெளி விடும் பழக்கம் முன்னிலைப்படுகிறது.',robustEN:'Consistency in repeated movement is emphasized.',fragileEN:'Bursts of activity alternating with long gaps are emphasized.'},
 {ta:'பாதங்கள், உறக்கம் மற்றும் ஓய்வு',en:'Feet, sleep and restorative routines',robustTA:'தனிமை மற்றும் ஓய்வுக்கான நேரத்தை ஒதுக்கும் பழக்கம் முன்னிலை பெறுகிறது.',fragileTA:'முடிக்காத வேலைகளை நினைத்துப் படுக்கும் நேரத்தைத் தள்ளிவைக்கும் பழக்கம் முன்னிலை பெறுகிறது.',robustEN:'Time for sleep and private rest is protected.',fragileEN:'Unfinished work tends to displace the hours set aside for rest.'}
];
const PHYSICAL_GRAHA_TA={Sun:'உடல் மொழியில் தன்னம்பிக்கை, நடையில் உறுதி',Moon:'அன்றாட அசைவுகளில் மென்மை, ஓய்வின் தேவைக்கேற்ப வேக மாற்றம்',Mars:'விரைவான இயக்கம், ஒரு செயலில் உடனே ஈடுபடும் துடிப்பு',Mercury:'கைகளின் நுட்பமான இயக்கம், செயல்களைச் சீரமைக்கும் ஒழுங்கு',Jupiter:'உடலமைப்பில் சதைப்பற்று, செயல்பாட்டில் விரிவு',Venus:'உடல் வெளிப்பாட்டில் மென்மை, சமச்சீரான தோற்றத்தை நாடுதல்',Saturn:'மெலிந்த தோற்றம், அசைவில் கட்டுப்பாடு, தொடர்ந்து செய்யும் விடாமுயற்சி',Rahu:'இயக்க வேகத்தில் மாறுபாடு, புதிய பழக்கங்களை விரைந்து முயற்சி செய்தல்',Ketu:'அமைதியான உடல் மொழி, தனித்துப் பணியாற்றும் பழக்கம்'};
const PHYSICAL_GRAHA_EN={Sun:'a firm and confident bearing',Moon:'gentler movement with changing pace',Mars:'rapid initiation of physical tasks',Mercury:'precision and coordination of fine movements',Jupiter:'fuller-build symbolism and expansive movement',Venus:'softness and symmetry in bodily expression',Saturn:'restrained movement and a leaner-build indication',Rahu:'variable pacing and experimentation with routines',Ketu:'reserved physical expression and independent routines'};
const SIGN_BODY_TA=['தலைப்பகுதி','முகமும் கழுத்தும்','தோளும் கைகளும்','மார்புப் பகுதி','மேல்வயிறும் முதுகின் மேல்பகுதியும்','வயிற்றின் நடுப்பகுதி','இடுப்பு','கீழ்வயிறு','தொடை','முழங்கால்','காலின் கீழ்ப்பகுதி','பாதம்'];
const SIGN_BODY_EN=['head','face and neck','shoulders and arms','chest','upper abdomen and upper back','mid-abdomen','waist','lower abdomen','thighs','knees','lower legs','feet'];
const ROOTS=[
 {id:'vision',houses:[2,12],actors:['Sun','Moon','Venus'],ta:'கண் பார்வை மற்றும் ஒளி உணர்வு',en:'Vision and light sensitivity',assocTA:'கண் பார்வை குறைவு மற்றும் பார்வைச் சுகம் சார்ந்த பாரம்பரியக் காரகத்துவங்கள்',assocEN:'traditional associations with visual comfort and sight'},
 {id:'digestion',houses:[5,6],actors:['Jupiter','Moon','Mars'],ta:'வயிறு மற்றும் செரிமானக் காரகத்துவம்',en:'Digestive symbolism',assocTA:'வயிற்றுச் சுகம், செரிமான ஒழுங்கு தொடர்பான பாரம்பரிய நோய்க் குறியீடுகள்',assocEN:'traditional digestive comfort and irregularity themes'},
 {id:'metabolism',houses:[6,8],actors:['Jupiter','Venus','Moon'],ta:'சர்க்கரை மற்றும் வளர்சிதை மாற்றக் காரகத்துவம்',en:'Metabolic and sugar symbolism',assocTA:'உடல் திசு, சதைப்பற்று மற்றும் வளர்சிதை மாற்றம் சார்ந்த பாரம்பரியக் குறியீடுகள்',assocEN:'traditional symbolism related to sugar, body fat and metabolism'},
 {id:'bones',houses:[1,10,11],actors:['Saturn','Mars'],ta:'எலும்புகள், மூட்டுகள் மற்றும் உடல் இயக்கம்',en:'Bones, joints and movement',assocTA:'மூட்டு இறுக்கம், உடல் இயக்க ஒழுங்கு தொடர்பான பாரம்பரியக் குறியீடுகள்',assocEN:'traditional joint stiffness and motion themes'},
 {id:'breath',houses:[3,4],actors:['Moon','Mercury'],ta:'மார்பு மற்றும் சுவாசக் காரகத்துவம்',en:'Chest and breathing symbolism',assocTA:'மார்பு சுகம், சுவாச ஒழுங்கு தொடர்பான பாரம்பரியக் குறியீடுகள்',assocEN:'traditional chest-comfort and breathing themes'},
 {id:'skin',houses:[1,6],actors:['Mercury','Saturn','Venus'],ta:'தோல் மற்றும் வெளித்தோற்றக் காரகத்துவம்',en:'Skin and appearance symbolism',assocTA:'தோல் சுகம், வெளிப்புற உடல் தோற்ற மாற்றங்கள் பற்றிய பாரம்பரியக் குறியீடுகள்',assocEN:'traditional themes of skin and outward appearance'},
 {id:'reproductive',houses:[7,8],actors:['Venus','Mars'],ta:'இனப்பெருக்க உறுப்புகளின் காரகத்துவம்',en:'Reproductive symbolism',assocTA:'இனப்பெருக்க உறுப்புகளுடன் தொடர்புபடுத்தப்படும் பாரம்பரிய உடல் காரகத்துவங்கள்',assocEN:'traditional reproductive-organ themes'},
 {id:'sleep',houses:[12,4],actors:['Moon','Saturn'],ta:'உறக்கம் மற்றும் ஓய்வின் காரகத்துவம்',en:'Sleep and rest symbolism',assocTA:'உறக்கம், ஓய்வு மற்றும் அன்றாட அழுத்தம் குறித்த பாரம்பரியக் குறியீடுகள்',assocEN:'traditional rest and sleep themes'}
];

/* V300: Kalapurusha body signs and 12 house-specific physical readings.
 * The classic sources describe symbolic correspondences, not validated
 * clinical predictions. Do not classify a human as diseased or disabled.
 * BPHS ch.3 (planetary constitution), ch.12 (body), ch.17 (sixth house);
 * Brihat Jataka ch.1 & ch.20 (body/sign and placements).
 * Preserve normalized natal D1 and existing life's report unchanged.
 */
const IMPORTANT=['Saturn','Mars','Rahu','Ketu'];
const CONDITIONS={
 1:{ta:{standard:'தலை முதல் தோள் வரை உயர்ந்து நிற்கும் உடல் நிலைப்பாட்டில் உறுதியும், முக அமைப்பில் தெளிவான வெளிப்பாடும் என்ற மரபு வாசிப்பு கிடைக்கிறது.',strain:'தலை–கழுத்துப் பகுதியில் இறுக்கமான உடல் நிலைப்பாடு, நீண்டு மெலிந்த தேகத் தோற்றம் என்ற மரபுச் சித்திரம் மேலோங்குகிறது.',mixed:'தலையின் வெளிப்பாட்டில் உறுதியும் மெலிவும் கலந்த தேக அமைப்பு என்ற மரபு வாசிப்பு கிடைக்கிறது.'},en:{standard:'Traditional symbolism favours a composed posture with a defined head and facial bearing.',strain:'The classic physical analogy is a leaner frame with a more rigid head-and-neck posture.',mixed:'A combination of a defined posture and leaner frame appears in this symbolic reading.'}},
 2:{ta:{standard:'முகத்தின் வட்டம், தாடை மற்றும் புன்னகையின் வெளிப்பாட்டில் மென்மையான சமச்சீர் தோற்றத்தை மரபு குறிப்பிடுகிறது.',strain:'முக எலும்புகள் தெளிவாகத் தெரியும், தாடை–கன்னம் பகுதியில் இறுக்கமான தோற்றம் என்ற சித்திரம் மேலோங்குகிறது.',mixed:'முகத்தில் மென்மையான வெளிப்பாட்டுடன் தாடை–கன்னம் பகுதியில் உறுதியான கோடும் இணையும் மரபு வாசிப்பு கிடைக்கிறது.'},en:{standard:'The face is symbolically read as soft and balanced around the jaw and cheeks.',strain:'Classical appearance symbolism emphasizes a sharper jaw and cheek contour.',mixed:'A softer expression and a more defined jawline are combined in the traditional picture.'}},
 3:{ta:{standard:'தோள் விரிப்பு, கை நீட்டல் மற்றும் விரல்களின் நுண்ணிய அசைவில் சீரான இயக்கத்தை மரபு சித்தரிக்கிறது.',strain:'தோள்–முழங்கை அசைவில் இறுக்கமான பாணியும், சிறு கைவேலையில் அதிக கவனத்துடன் செயல்படும் தோற்றமும் முன்னிலை பெறுகின்றன.',mixed:'கைகளில் சுறுசுறுப்புடன் தோள் இயக்கத்தில் அளவான கட்டுப்பாடு என்ற இரட்டை அமைப்பு காணப்படுகிறது.'},en:{standard:'The shoulder span and fine hand movements are portrayed as smooth and composed.',strain:'Tighter shoulder-and-elbow motion is the traditional analogy.',mixed:'Agile hands with more measured shoulder movement form the mixed physical reading.'}},
 4:{ta:{standard:'மார்பின் வெளிப்புற விரிப்பும் தோள்களின் இயல்பான நிலைப்பாடும் சீரானதாகச் சித்தரிக்கப்படுகின்றன.',strain:'மார்பின் வெளிப்புறத் தோற்றத்தில் குறுகிய, இறுக்கமான நிலைப்பாட்டை மரபு உருவகப்படுத்துகிறது.',mixed:'மார்பில் ஒழுங்கான நிலைப்பாட்டுடன் தோள் சுற்றில் ஓரளவு இறுக்கம் என்ற கலப்பு சித்திரம் கிடைக்கிறது.'},en:{standard:'The outward chest and shoulder carriage are symbolized as open and balanced.',strain:'A narrow or restrained chest posture appears in traditional physical symbolism.',mixed:'The imagery combines an open chest posture with more measured shoulders.'}},
 5:{ta:{standard:'மேல்வயிற்றின் வெளிப்புற வளைவும் முதுகின் மேற்பகுதியும் சமச்சீராக அமையும் உடற்கட்டு மரபு வாசிப்பில் முன்னிலை பெறுகிறது.',strain:'மேல்வயிற்றில் தனித்த சதைப்பற்று அல்லது உடல் நடுப்பகுதியில் மற்ற பகுதிகளைவிட வேறுபட்ட அளவு என்ற மரபு உருவகம் காணப்படுகிறது.',mixed:'தோள் பகுதியோடு ஒப்பிடும்போது மேல்வயிற்றின் அளவில் மிதமான வேறுபாடு வெளிப்படும் மரபுச் சித்திரம் கிடைக்கிறது.'},en:{standard:'The upper-abdomen and upper-back proportions are described as balanced.',strain:'Classical symbolism contrasts upper-abdominal fullness against the rest of the frame.',mixed:'A moderate contrast between the midsection and shoulder proportions is suggested.'}},
 6:{ta:{standard:'வயிற்றின் கீழ்நடு பகுதி மற்றும் இடை வளைவில் மென்மையான, சீரான வெளிப்புற அமைப்பை மரபு சுட்டுகிறது.',strain:'கீழ்வயிற்றுப் பகுதியில் இறுக்கமான இடைவளைவு அல்லது மாறுபட்ட சதைப் பரவல் என்ற மரபுக் குறிப்பே முன்னிலை பெறுகிறது.',mixed:'கீழ்வயிறு மென்மையாகவும் இடை வளைவு கட்டுப்பட்டதாகவும் இருக்கும் கலப்பு வெளிப்புறத் தோற்றம் சித்தரிக்கப்படுகிறது.'},en:{standard:'The lower abdominal outline is traditionally pictured as even and soft.',strain:'A tighter waistline or contrasting lower-abdominal proportions appear in the symbolism.',mixed:'A softer lower abdomen and a more restrained waistline are combined.'}},
 7:{ta:{standard:'இடுப்பின் அகலமும் இடுப்பு–முதுகு இணையும் வெளிப்புற அமைப்பும் சமநிலையாகக் குறிப்பிடப்படுகின்றன.',strain:'இடுப்பு வளைவில் இறுக்கமான தோற்றமும் உடல் எடையை மாற்றும் நிலைப்பாட்டில் அளவான அசைவும் மரபுக் குறிப்பாக வருகிறது.',mixed:'இடுப்பு அகலத்திலும் வளைவிலும் மென்மையும் கட்டுப்பாடும் கலந்த தோற்றம் மரபு வாசிப்பில் இடம்பெறுகிறது.'},en:{standard:'The hip-to-waist outline is symbolically balanced.',strain:'A restrained waist contour and measured weight-shifting posture are emphasized.',mixed:'Both softness and a defined waist contour appear in the traditional analogy.'}},
 8:{ta:{standard:'கீழ்வயிற்றுக்கும் இடுப்புக்கும் இடையிலான வெளிப்புறத் தேக அமைப்பு சீரானதாக மரபு குறிப்பிடுகிறது.',strain:'கீழ்வயிற்றின் வடிவமும் இடுப்பு வளைவும் மற்ற உடற்பகுதிகளிலிருந்து மாறுபடுகின்றன என்ற மரபுக் குறிப்பு கிடைக்கிறது.',mixed:'கீழ்வயிற்றின் மென்மையும் இடுப்பு வளையின் உறுதியும் ஒருங்கிணைந்த தோற்றமாக வாசிக்கப்படுகின்றன.'},en:{standard:'Traditional symbolism describes balanced lower-torso contours.',strain:'Different proportions around the lower torso are emphasized symbolically.',mixed:'The lower-torso imagery combines softness and a firm waist contour.'}},
 9:{ta:{standard:'தொடையின் வெளிப்புறத் தசைவிரிப்பும் நடை வேகத்தில் சீரான அழுத்தமும் மரபுச் சித்திரத்தில் இடம்பெறுகின்றன.',strain:'தொடை எலும்பின் கோடு தெளிவாகத் தெரியும் மெலிந்த தோற்றமும் நீளமான நடை பாணியும் சுட்டப்படுகின்றன.',mixed:'தொடையின் மென்மையான தசை அமைப்போடு உறுதியான நடை பாணியும் கலந்த தோற்றம் குறிப்பிடப்படுகிறது.'},en:{standard:'Thigh contours and gait are pictured with even movement.',strain:'A lean thigh outline and long, measured stride are traditional associations.',mixed:'A softer thigh contour with a firmer walking rhythm forms the mixed description.'}},
 10:{ta:{standard:'முழங்காலின் வெளிப்புற வடிவம் மற்றும் காலின் மடக்குமிடத்து நிலைப்பாட்டில் சீரான தோற்றம் மரபுக் குறிப்பாக உள்ளது.',strain:'முழங்கால் எலும்புக் கோடு தெளிவாகக் காட்டும் ஒல்லியான தோற்றம் என்ற மரபுச் சின்னம் மேலோங்குகிறது.',mixed:'முழங்காலின் உறுதியான வெளிப்புற வடிவத்துடன் மிதமான மெலிவு சேரும் பாரம்பரிய சித்திரம் கிடைக்கிறது.'},en:{standard:'An even outward knee contour is the symbolic description.',strain:'A defined, lean knee outline is the classical association.',mixed:'A firm knee contour with moderate leanness forms the mixed picture.'}},
 11:{ta:{standard:'கெண்டைக்காலின் சதைப்பற்றும் கணுக்கால் வரையிலான வெளிப்புற விகிதமும் சீராக இருப்பதாக மரபு சித்தரிக்கிறது.',strain:'கெண்டைக்கால் ஒல்லியாகவும் கணுக்காலின் எலும்புக் கோடு தெளிவாகவும் தோன்றும் சித்திரம் கிடைக்கிறது.',mixed:'கெண்டைக்கால் விகிதத்தில் மென்மையும் கணுக்கால் பகுதியில் கூர்மையான வெளிப்புற வடிவமும் இணைகின்றன.'},en:{standard:'Lower-leg and ankle proportions are pictured as balanced.',strain:'A thinner calf and defined ankle outline are traditional analogies.',mixed:'Softer calves with more defined ankles are combined symbolically.'}},
 12:{ta:{standard:'பாதத்தின் வெளிப்புற வடிவம், குதிகால் மற்றும் விரல்களின் நிலைப்பாடு ஒழுங்கானதாக மரபு சித்தரிக்கிறது.',strain:'குதிகால்–பாத விரிப்பு மெலிந்ததாகவும் விரல்களின் நிலைப்பாடு இறுக்கமானதாகவும் சித்தரிக்கப்படுகிறது.',mixed:'பாத விரிப்பில் மென்மையும் குதிகால் சுற்றில் உறுதியான வடிவமும் சேர்ந்த மரபு உருவகம் கிடைக்கிறது.'},en:{standard:'Feet, heels and toe posture are symbolized as even and composed.',strain:'Narrow feet and restrained toe posture are classical appearance analogies.',mixed:'Softer foot contours and a defined heel shape are combined symbolically.'}}
};
const PLANET_BODY={
 Saturn:{ta:'சனி தொடர்பு எலும்புக் கோடுகள் தெளிவாகத் தெரியும் மெலிவு அல்லது கட்டுப்பட்ட நிலைப்பாட்டை மரபில் குறிப்பதாகும்.',en:'Saturn traditionally contributes a leaner outline and more defined bone structure.'},
 Jupiter:{ta:'குரு தொடர்பு சதைப்பற்றும் வட்டமான உடல்விகிதமும் சேரும் வெளிப்புறத் தோற்றத்தை மரபில் குறிக்கிறது.',en:'Jupiter contributes fuller contours and rounded bodily proportions in the traditional picture.'},
 Mars:{ta:'செவ்வாய் தொடர்பு உறுதியான தசை வெளிப்பாட்டையும் சுறுசுறுப்பான உடல் நிலைப்பாட்டையும் சித்தரிக்கிறது.',en:'Mars symbolically adds firmer muscle definition and energetic posture.'},
 Venus:{ta:'சுக்கிரன் தொடர்பு மென்மையான தோல் வெளிப்பாட்டையும் வளைவுகளின் சமச்சீரையும் சித்தரிக்கிறது.',en:'Venus is associated with softer outward contours and symmetry.'},
 Moon:{ta:'சந்திரன் தொடர்பு மென்மையான தோற்றமும் வட்டமான தேக வெளிப்பாடும் தரும் மரபுச் சின்னமாக உள்ளது.',en:'The Moon gives the traditional imagery of softness and rounded contours.'},
 Mercury:{ta:'புதன் தொடர்பு மெலிந்த, நுட்பமான உடலமைப்பையும் கைவிரல் இயக்கத்தின் துல்லியத்தையும் குறிக்கும் உருவகம்.',en:'Mercury is traditionally linked with finer proportions and nimble gestures.'},
 Sun:{ta:'சூரியன் தொடர்பு தலை நிமிர்ந்த உறுதியான வெளிப்பாட்டை உருவகப்படுத்துகிறது.',en:'The Sun symbolizes an upright, firm bearing.'},
 Rahu:{ta:'ராகு தொடர்பு வழக்கமான உடல்விகிதத்திலிருந்து வேறுபட்ட வெளிப்புற அமைப்பை மரபில் சுட்டுகிறது.',en:'Rahu symbolizes a more unusual contrast in outward proportions.'},
 Ketu:{ta:'கேது தொடர்பு அடக்கமான, வெளிப்புற அசைவுகள் குறைவான உடல் நிலைப்பாட்டை உருவகப்படுத்துகிறது.',en:'Ketu is symbolically linked with a reserved and quiet posture.'}
};
const EXAMPLES={
 vision:{ta:'கண் சோர்வு, ஒளியில் அசௌகரியம், பார்வைத் தெளிவு குறைவது போன்ற கண் தொடர்பான மரபுச் சுட்டீடுகள்',en:'eye fatigue, light discomfort and uncertain clarity of vision'},
 digestion:{ta:'அஜீரணம், வயிற்று எரிச்சல், வயிற்றுப் பூரிப்பு போன்ற செரிமானத் தொந்தரவு வகைகள்',en:'indigestion, abdominal discomfort and bloating'},
 metabolism:{ta:'பசி ஒழுங்கு மாறுதல், சதைப்பற்று மற்றும் உணவின் உடல் எதிர்வினை பற்றிய மரபுச் சுட்டீடுகள்',en:'appetite patterns, body fullness and traditional food-response symbolism'},
 bones:{ta:'மூட்டு இறுக்கம், எலும்பு–தசைப் பகுதியில் அசௌகரியம், இயக்கத்தில் வரம்பு போன்ற மரபுச் சுட்டீடுகள்',en:'stiff joints, musculoskeletal discomfort and restrained movement'},
 breath:{ta:'சளி சார்ந்த மார்பு அசௌகரியம், மூச்சுச் சீரின்மை என்று பழைய நூல்களில் இணைக்கப்படும் வகைகள்',en:'chest congestion and irregular breathing comfort in older texts'},
 skin:{ta:'தோல் உலர்வு, எரிச்சல், நிறம்/வெளித்தோற்ற மாறுபாடு போன்ற மரபுச் சுட்டீடுகள்',en:'dryness, irritation and changes in outward skin appearance'},
 reproductive:{ta:'கீழ்வயிறு மற்றும் இடுப்புப் பகுதியின் சுகம் தொடர்பான மரபுச் சுட்டீடுகள்',en:'traditional pelvic-comfort symbolism'},
 sleep:{ta:'ஓய்வின் ஒழுங்கு மாறுதல், தூங்குவதில் சிரமம், இரவில் இடையிடையே விழித்தல் போன்றவை',en:'irregular rest, difficulty settling to sleep and interrupted sleep'}
};
const MEDICAL_OUTCOME_TA={
 vision:{
  'traditional-concern':'கண் பார்வை தொடர்பான பாரம்பரிய விதிகளில் ஒளிச்சகிப்பு குறைவு, கண் சோர்வு, பார்வைத் தெளிவு தொடர்பான சிரமம் என்ற வகைச் சுட்டீடுகள் முன்னிலை பெறுகின்றன. இது கண் நோய் அல்லது கண்ணாடி தேவைப்படும் என்ற உறுதியான கணிப்பு அல்ல.',
  mixed:'கண்களின் ஒளிச்சகிப்பு, கண் சோர்வு போன்ற மரபுக் குறிப்புகளுக்கு எதிராகத் தணிக்கும் கிரக ஆதாரங்களும் உள்ளன. எனவே ஒரே வகைப் பார்வைக் குறைபாட்டை இந்தக் கட்டமைப்பில் முடிவுசெய்ய முடியாது.',
  'traditional-support':'கண் காரகத்துவத்தில் குறுக்கிடும் கிரகத் தொடர்பு தனியாக மேலோங்கவில்லை. பாரம்பரியத்தில் முகம் மற்றும் கண்களின் வெளிப்புற அமைப்பிற்குச் சாதகமான குறிப்பு முன்னிலை பெறுகிறது; கண் நோய் இல்லை என்பதற்கான பரிசோதனை இது அல்ல.'},
 digestion:{
  'traditional-concern':'உணவுக்குப் பிறகு வயிற்று எரிச்சல், அஜீரணம், வயிற்றுப் பூரிப்பு போன்ற செரிமான அசௌகரிய வகைகளை மரபுவழி விதிகள் இங்கு சுட்டுகின்றன. அவை இந்த ஜாதகருக்கு உண்மையில் இருப்பதாக உறுதிப்படுத்தப்படவில்லை.',
  mixed:'வயிற்று எரிச்சல், அஜீரணம் போன்ற பழைய நூல்களின் செரிமான ஒப்புமைகளும் அதைத் தணிக்கும் கிரகத் தொடர்பும் ஒரே நேரத்தில் காணப்படுகின்றன. தனித்த வயிற்று நோய் வரப்போகிறது என்று இதிலிருந்து முடிவுசெய்ய முடியாது.',
  'traditional-support':'வயிற்றுச் சுகக் காரகத்துவத்தில் பலமான பாதகச் சேர்க்கை முன்னிலை பெறாததால் மரபு வாசிப்பில் நடுப்பகுதியின் சீரான உடல்விகிதம் மற்றும் உணவு சார்ந்த சுகக் குறிப்பு வலுப்பெறுகிறது; மருத்துவ ரீதியான செரிமானச் சான்று அல்ல.'},
 metabolism:{
  'traditional-concern':'உடல் நடுப்பகுதியின் சதைப்பற்று, பசியின் நேர ஒழுங்கு, உணவுக்குப் பிறகான உடல் உணர்வு போன்ற வளர்சிதை மாற்றச் சின்னங்களை மரபு இங்கு முதன்மைப்படுத்துகிறது. சர்க்கரை நோய் ஏற்படும் என்பதற்கான நம்பகமான சுட்டீடாக இதைக் கொள்ள முடியாது.',
  mixed:'சதைப்பற்று மற்றும் உணவு ஒழுங்கு பற்றிய மரபுக் குறிப்புகள் இருக்கின்றன; அவற்றைக் கட்டுப்படுத்தும் சுபக் கிரக நிலைகளும் இருக்கின்றன. இதன் அடிப்படையில் நீரிழிவு அல்லது வேறு வளர்சிதை மாற்ற நோயை முன்னறிவிக்க முடியாது.',
  'traditional-support':'உணவு–உடல்விகிதக் காரகத்துவத்தில் கடினமான கலப்பு முன்னிலை பெறவில்லை. இந்தப் பகுதியின் மரபு வாசிப்பு சீரான தேக விகிதத்தை மட்டுமே விவரிக்கிறது; ரத்தச் சர்க்கரை இயல்பானதென்ற தகவல் இதில் இல்லை.'},
 bones:{
  'traditional-concern':'எலும்பு மற்றும் மூட்டு காரகத்துவங்களில் சனியுடன் தொடர்புடைய மூட்டு இறுக்கம், நீண்ட உழைப்புக்குப் பிறகான உடல் அசௌகரியம் ஆகிய வரலாற்றுச் சின்னங்கள் வலியுறுகின்றன. நடை மாற்றுத்திறன் அல்லது மூட்டு நோய் உறுதியாக வரும் என்பதல்ல.',
  mixed:'சனியின் இறுக்கச் சின்னமும் செவ்வாயின் உடல் இயக்கச் சின்னமும் எதிரெதிர் தொடர்புகளைப் பெறுகின்றன. முழங்கால், மூட்டு இயக்கம் போன்றவற்றின் மரபு வாசிப்பில் முரண்பட்ட குறிப்புகள் இருப்பதால் உடல் குறைபாட்டைத் தீர்மானிக்க முடியாது.',
  'traditional-support':'எலும்பு, கால் இயக்கச் சின்னங்களில் பாதகத் தொடர்பு மேலாதிக்கம் பெறவில்லை. சீரான உடல் நிலைப்பாடு மற்றும் மூட்டின் வெளிப்புறக் கட்டமைப்பு என்ற பாரம்பரிய விளக்கமே முன்னிலை பெறுகிறது.'},
 breath:{
  'traditional-concern':'மார்பு–சுவாசக் காரகத்துவங்களில் சளி தேக்கம், குளிர்ச்சியின்போது மார்பு அசௌகரியம் போன்ற வரலாற்று விளக்கங்கள் குறிப்பிடப்படுகின்றன. ஆஸ்துமா அல்லது நுரையீரல் நோய் உறுதியானது எனப் பொருள் கொள்ளக் கூடாது.',
  mixed:'மார்புச் சின்னத்தை கடினமாக்கும் கிரகங்களுடன் அதைத் தணிக்கும் தொடர்புகளும் உள்ளன. அதனால் சளி, மூச்சில் அசௌகரியம் என்ற மரபுக் குறிப்புகளைத் தனிப்பட்ட சுவாச நோயாக மாற்றிக் கூற முடியாது.',
  'traditional-support':'மார்புப் பகுதியின் வெளிப்புற அமைப்பில் சீரான விரிப்பு என்ற மரபு வாசிப்பே முன்னிலை பெறுகிறது. நுரையீரல் செயல்பாடு இயல்பாக இருக்கிறது என்பதைக் கணிக்க முடியாது.'},
 skin:{
  'traditional-concern':'தோல் உலர்வு, அரிப்பு, வெளித்தோற்றத்தில் நிறமாற்றம் ஆகியவற்றை இணைத்துக் கூறும் மரபுவழி காரகத்துவம் செயல்படுகிறது. தோல் நோய் கண்டறிதலாக இதைக் கூற இயலாது.',
  mixed:'சனியின் உலர்வு சார்ந்த சின்னத்திற்கு எதிராக சுக்கிரனின் மென்மை சார்ந்த தொடர்பும் இருப்பதால் தோலின் வெளிப்புறக் காரகத்துவம் கலப்பாக உள்ளது. எந்தத் தோல் நோயும் இங்கு உறுதியாகத் தீர்மானிக்கப்படவில்லை.',
  'traditional-support':'தோலின் வெளிப்புற அமைப்பில் மென்மையும் சீரான தோற்றமும் என்ற பாரம்பரிய ஒப்புமை மேலோங்குகிறது. தோல் பரிசோதனை செய்யாமல் மருத்துவ முடிவு சொல்ல இயலாது.'},
 reproductive:{
  'traditional-concern':'கீழ்வயிறு–இடுப்பு பகுதி சுகத்தைச் சுற்றிய மரபுக் காரகத்துவங்கள் கடினமான தொடர்பைப் பெறுகின்றன. குறிப்பிட்ட இனப்பெருக்க நோய், மலட்டுத்தன்மை அல்லது எதிர்காலக் குழந்தைப்பேறு குறித்து இதிலிருந்து தீர்மானிக்க முடியாது.',
  mixed:'கீழ்வயிறு மற்றும் இடுப்பு சார்ந்த சுகக் காரகத்துவத்தில் சுப–பாபத் தொடர்புகள் ஒன்றோடொன்று கலக்கின்றன. இதற்கு தனித்த மருத்துவ நோய் பெயர் வழங்குவதற்கான ஆதாரம் ஜாதகத்தில் இல்லை.',
  'traditional-support':'கீழ்வயிற்றின் வெளிப்புறச் சமநிலை மற்றும் இடுப்பு சார்ந்த பாரம்பரியச் சுகக் காரகத்துவம் முன்னிலை பெறுகிறது. இனப்பெருக்க உறுப்பின் செயல்பாடு குறித்த மருத்துவ மதிப்பீடு இதல்ல.'},
 sleep:{
  'traditional-concern':'ஓய்வைப் பின்னுக்கு தள்ளுவது, இரவில் இடையிடையே விழிப்பு, தூக்கம் தொடங்கத் தாமதம் ஆகியவற்றை பழைய நூல்களின் சந்திர–சனி சின்னங்கள் இணைக்கின்றன. இது உறக்கக் கோளாறு கண்டறியும் கணிப்பு அல்ல.',
  mixed:'தூக்க நேரம் மாறுதல் மற்றும் ஓய்வின் தொடர்ச்சி பற்றிய மரபுச் சின்னங்கள் இருவிதமாக உள்ளன. மனநோய் அல்லது உறக்கக் கோளாறு உள்ளது என்று இந்தக் கிரகக் கலப்பால் தீர்மானிக்க முடியாது.',
  'traditional-support':'ஓய்வு, தனிநேரம் சார்ந்த சின்னங்களில் சீரான ஒழுங்கு என்ற பாரம்பரியக் குறிப்பு மேலோங்குகிறது. ஒருவரின் உண்மையான உறக்கத் தரத்தை இது அளவிடவில்லை.'}
};
const MEDICAL_OUTCOME_EN={
 vision:{'traditional-concern':'The classical association concerns eye fatigue, discomfort in bright light, and blurred clarity; it cannot predict eye disease or a need for glasses.',mixed:'Traditional eye-fatigue and light-sensitivity symbolism is counterbalanced by mitigating contacts; no specific eye condition follows.', 'traditional-support':'Traditional associations favour a regular facial and visual bearing. This cannot establish normal eyesight.'},
 digestion:{'traditional-concern':'Classical analogies mention indigestion, abdominal burning and bloating, not an established diagnosis for this person.',mixed:'Digestive-discomfort symbolism is accompanied by mitigating factors and cannot identify a personal stomach disease.', 'traditional-support':'The reading depicts balanced abdominal contours and ordinary dietary symbolism, not proven digestive health.'},
 metabolism:{'traditional-concern':'Traditional symbolism concerns midsection proportions, appetite timing and dietary responses. It cannot predict diabetes or metabolic disease.',mixed:'Mixed symbolic influences concern appetite and fullness, not a valid prediction of diabetes.', 'traditional-support':'Balanced body-proportion symbolism predominates; it does not imply measured normal blood glucose.'},
 bones:{'traditional-concern':'Traditional texts connect Saturn with stiffness and skeletal concerns, but this does not identify disability or disease.',mixed:'The mixed reading contrasts Saturn-like stiffness with other movement symbolism and cannot identify a joint disease.', 'traditional-support':'Traditional interpretation favours an even skeletal bearing, not certified joint health.'},
 breath:{'traditional-concern':'Older interpretations mention congestion and chest discomfort; they cannot predict asthma or lung disease.',mixed:'Chest-congestion symbolism is tempered by other planetary influences; it is not a lung diagnosis.', 'traditional-support':'Open outward chest posture is the classical analogy, not an assessment of breathing function.'},
 skin:{'traditional-concern':'The traditional imagery mentions dry skin, irritation and outward changes without identifying a skin disease.',mixed:'Dryness symbolism is balanced by softer Venus-associated imagery; no specific skin disease is indicated clinically.', 'traditional-support':'Softer outward skin contours predominate as symbolic imagery, not as a medical skin finding.'},
 reproductive:{'traditional-concern':'Traditional pelvic associations cannot predict reproductive disease, infertility or future childbearing.',mixed:'Pelvic-comfort symbolism is mixed and supplies no clinical reproductive diagnosis.', 'traditional-support':'Balanced pelvic structure is a traditional external analogy, not a measure of reproductive function.'},
 sleep:{'traditional-concern':'Moon–Saturn imagery may mention delayed or interrupted rest, not a diagnosed sleep disorder.',mixed:'Mixed symbolism about sleep timing cannot establish a sleep or mental-health condition.', 'traditional-support':'Even rest routines appear in the traditional interpretation, not a measured sleep outcome.'}
};

const STRONG=new Set(['own','exalted','moolatrikona']);
function countDirect(d,houses,keys){
 const matches=[];
 for(const n of houses){const h=d.houses[n-1];for(const k of keys){if(h.occupants.includes(k))matches.push({house:n,key:k,mode:'occupant'});else if(h.aspects.includes(k))matches.push({house:n,key:k,mode:'aspect'});}}
 return matches;
}
function beneficContact(d,k,moon){
 if(k==='Mercury'){const h=d.houses[d.planets.Mercury.house-1];return ![...h.occupants,...h.aspects].some(p=>p!=='Mercury'&&IMPORTANT.includes(p));}
 if(k==='Moon')return !!moon?.known&&moon.nature==='benefic';
 return k==='Jupiter'||k==='Venus';
}
function protect(d,houses){return houses.some(n=>{const p=d.planets[d.houses[n-1].lord];return p&&STRONG.has(p.dignity)})||countDirect(d,houses,['Jupiter','Venus']).length>0;}
function asName(k,ta){return ta?(PN[k]||k):k;}
function gram(h,ta){const sign=Number.isInteger(h.sign)?h.sign:-1;return sign>=0?(ta?SIGN_BODY_TA[sign]:SIGN_BODY_EN[sign]):(ta?'அந்தப் பகுதி':'that body region');}
function contactText(contact,ta){if(!contact)return '';return ta?`${asName(contact.key,true)} ${contact.house}-ஆம் பாவத்தில் ${contact.mode==='occupant'?'இருப்பதால்':'பார்வை செலுத்துவதால்'}`:`${contact.key} ${contact.mode==='occupant'?'occupies':'aspects'} house ${contact.house}`;}
function makePhysical(d,n,lang,core,opts={}){
 const ta=lang!=='en',h=d.houses[n-1],ruler=d.planets[h.lord],evaluation=core.influence(d,n,opts);
 const adverse=countDirect(d,[n],IMPORTANT),help=countDirect(d,[n],['Jupiter','Venus','Mercury','Moon']).filter(x=>beneficContact(d,x.key,evaluation.moon));
 const favorable=protect(d,[n])||evaluation.dominantSide==='support';
 const mix=adverse.length&&favorable,category=adverse.length&&!favorable?'strain':mix?'mixed':'standard';
 const text=CONDITIONS[n][ta?'ta':'en'][category];
 // Lagna-specific frame reading is intentionally confined to body section 1.
 const extras=[];
 if(n===1){const ss=countDirect(d,[1],['Saturn']).length,js=countDirect(d,[1],['Jupiter']).length;const lord=d.planets[h.lord];
  if(ss&&js)extras.push(ta?'லக்னத்தில் சனி–குரு இருவரின் நேரடித் தொடர்பும் இருப்பதால் மெலிவுக்கும் சதைப்பற்றுக்கும் இடையே கலந்த உடற்கட்டு என்ற பாரம்பரிய வாசிப்பு முன்னிலை பெறுகிறது.':'Both Saturn and Jupiter contact the ascendant, creating a mixed lean/full-body analogy.');
  else if(ss)extras.push(ta?'லக்னத்துடனான சனியின் நேரடித் தொடர்பு மெலிவையும் எலும்புக் கோடு வெளிப்பாட்டையும் வலுப்படுத்தும் மரபுக் குறியாக உள்ளது.':'Saturn directly contacting the ascendant is traditionally read as a leaner frame.');
  else if(js)extras.push(ta?'லக்னத்துடனான குருவின் நேரடித் தொடர்பு நிரம்பிய உடல்விகிதத்தையும் மிதமான சதைப்பற்றையும் சித்தரிக்கிறது.':'Jupiter directly contacting the ascendant points to fuller body proportions symbolically.');
  if(lord&&lord.house!==1)extras.push(ta?`லக்னாதிபதி ${PN[h.lord]} ${lord.house}-ஆம் பாவத்தில் இருப்பதால் மொத்த தேக அமைப்பை லக்னத்தில் உள்ள கிரகங்களை மட்டும் வைத்து முடிவுசெய்யாமல் இந்தக் கலப்பையும் சேர்த்து வாசிக்கிறது.`:`The ascendant ruler ${h.lord} in house ${lord.house} modifies this whole-body analogy.`);
 }
 const contacts=countDirect(d,[n],['Saturn','Jupiter','Mars','Venus','Moon','Mercury','Sun','Rahu','Ketu']);
 const featured=contacts.find(x=>x.mode==='occupant')||contacts.find(x=>x.mode==='aspect'&&[3,4,10,11,12].includes(n));
 if(featured&&n!==1) extras.push(ta?`${contactText(featured,true)}, ${BODIES[n-1].ta} சார்ந்த வெளிப்புற அமைப்பில் ${PLANET_BODY[featured.key].ta}`:`${contactText(featured,false)}; ${BODIES[n-1].en} symbolism is modified: ${PLANET_BODY[featured.key].en}`);
 const v301=(typeof globalThis!=='undefined'&&globalThis.SMVD1V301Evidence)||null;
 const supplement=v301?.enhancePhysical?.(d,n,lang)||null;
 const lines=[text,...extras,...(supplement?[supplement.text]:[])];
 return {number:n,title:ta?`${n}-ஆம் பாவம் — ${BODIES[n-1].ta}`:`House ${n} — ${BODIES[n-1].en}`,
  paragraphs:lines.map((t,i)=>({house:n,text:t,evidence:{source:'v300-classical-constitution',house:n,sign:h.sign,lord:h.lord,rulerHouse:ruler?.house,category,directAdverse:adverse,directSupport:help,featured:featured||null,paragraph:i}})),
  evidence:{house:n,sign:h.sign,signBodySymbolism:gram(h,ta),lord:h.lord,category,adverse,help,houseInfluence:evaluation.dominantSide,notMedicalDiagnosis:true}};
}
function makeMedical(d,lang,core,opts={}){
 const ta=lang!=='en';return ROOTS.map((spec,i)=>{
  const adverse=countDirect(d,spec.houses,IMPORTANT);
  const moon=core.influence(d,spec.houses[0],opts).moon;
  const supports=countDirect(d,spec.houses,['Jupiter','Venus','Mercury','Moon']).filter(x=>beneficContact(d,x.key,moon));
  const distressedActors=spec.actors.filter(k=>{const p=d.planets[k];return p&&((p.combust&&k!=='Sun')||p.dignity==='debilitated'||countDirect(d,[p.house],IMPORTANT.filter(z=>z!==k)).length>0);});
  const strengthenedActors=spec.actors.filter(k=>STRONG.has(d.planets[k]?.dignity));
  const protector=protect(d,spec.houses);
  // Do not assign clinical risk, probability, certainty, diagnosis, or disease status.
  // A concern is only a named historical correspondence, gated by more than one
  // *independent* feature: house adversity plus an afflicted karaka.
  const distinctAdverse=new Set(adverse.map(x=>x.key)).size;
  const side=(distinctAdverse>=2&&distressedActors.length>=1&&!protector)?'traditional-concern':
    (!adverse.length&& (supports.length||strengthenedActors.length))?'traditional-support':'mixed';
  const top=adverse[0]||supports[0]||null;
  const example=EXAMPLES[spec.id][ta?'ta':'en'];
  const title=ta?spec.ta:spec.en;
  const signPart=ta?spec.ta:spec.en;
  const conclusion=(ta?MEDICAL_OUTCOME_TA:MEDICAL_OUTCOME_EN)[spec.id][side];
  const evidencePieces=[];
  if(top)evidencePieces.push(ta?`${contactText(top,true)} ${title} தொடர்புடைய மரபுப் பாவக் குறி செயல்படுகிறது.`:`${contactText(top,false)} in the traditional domain of ${title}.`);
  if(distressedActors.length)evidencePieces.push(ta?`${distressedActors.slice(0,2).map(x=>PN[x]).join(' மற்றும் ')} ஆகிய காரகக் கிரகங்களில் பாபத் தொடர்பு அல்லது பலக்குறைவு இருப்பதால் எதிர்மறை மரபுக் குறிப்பையும் கணக்கில் எடுக்கிறது.`:`${distressedActors.slice(0,2).join(' and ')} show historically challenging karaka contacts.`);
  if(supports.length||strengthenedActors.length)evidencePieces.push(ta?`${(supports[0]?.key&&PN[supports[0].key])||(strengthenedActors[0]&&PN[strengthenedActors[0]])} தரும் சுப/ஆட்சி தொடர்பும் இருப்பதால் அதைத் தவிர்த்து ஒருதலைப்பட்சமாக நோய் முடிவைச் சொல்லக்கூடாது.`:`A supportive or dignified planet counterbalances the adverse symbolism.`);
  if(!evidencePieces.length)evidencePieces.push(ta?`${spec.houses.join(', ')}-ஆம் பாவங்களும் ${spec.actors.map(x=>PN[x]).join(', ')} கிரகக் காரகத்துவங்களும் ஆராயப்பட்டன; குறிப்பிட்ட பாதக கூட்டமைப்பு காணப்படவில்லை.`:`Houses ${spec.houses.join(', ')} and related karakas were reviewed without an active adverse combination.`);
  const v301=(typeof globalThis!=='undefined'&&globalThis.SMVD1V301Evidence)||null;
  const supplement=v301?.enhanceMedical?.(d,spec,side,adverse,supports,lang)||null;
  const paragraphs=[...evidencePieces.slice(0,2),supplement?.text||conclusion].map((text,j)=>({text,evidence:{source:j===2&&supplement?'v301-body-period-distinction':'classical-medical-symbolism-only',houses:spec.houses,actors:spec.actors,adverse,protective:supports,distressedActors,category:side,paragraph:j}}));
  return {number:i+1,id:spec.id,title,paragraphs,
   evidence:{classification:side,houseSet:spec.houses,planetKeys:spec.actors,directAdverse:adverse,directSupport:supports,distressedActors,strengthenedActors,sourceTexts:['BPHS 3,12,17','Brihat Jataka 1,20'],traditionalCorrespondence:example},notMedicalRisk:true};
 });
}
return Object.freeze({physical:makePhysical,medical:makeMedical,version:'300-classical-physical-and-nondiagnostic-medical'});
});
