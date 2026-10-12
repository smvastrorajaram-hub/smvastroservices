/* SMV ASTRO V302 — ONE full-life reading in TWELVE house headings, not three competing reports.
 * Native D1 facts + physical associations + 15-y actual computed Dasha/Bhukti
 * + actual slow-planet Swiss snapshots. Never forecasts a clinical diagnosis.
 * All output built from already-loaded/derived reports; no independent API call.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.SMVD1IntegratedV302=api;})(typeof window!=='undefined'?window:globalThis,function(){'use strict';
const TA={Sun:'சூரியன்',Moon:'சந்திரன்',Mars:'செவ்வாய்',Mercury:'புதன்',Jupiter:'குரு',Venus:'சுக்கிரன்',Saturn:'சனி',Rahu:'ராகு',Ketu:'கேது'};
const EN=Object.fromEntries(Object.entries(TA).map(([a,b])=>[b,a]));
const esc=x=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const planet=(name,ta)=>ta?(TA[name]||name):(EN[name]||name);
const validISO=x=>/^\d{4}-\d{2}-\d{2}$/.test(String(x||''));
const SIGN_TA=['மேஷம்','ரிஷபம்','மிதுனம்','கடகம்','சிம்மம்','கன்னி','துலாம்','விருச்சிகம்','தனுசு','மகரம்','கும்பம்','மீனம்'];
const SIGN_EN=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
// Each paragraph tells an actual house-specific outcome, not an interchangeable house definition.
const LIFE_TA=[
 ['நீங்கள் ஒரு முடிவை எடுப்பதற்கு முன் அதன் நடைமுறை விளைவுகளை அறிய முயல்வீர்கள். ஒருமுறை பொறுப்பை ஏற்றுக்கொண்டால் முழுமையாகச் செய்ய வேண்டும் என்ற எண்ணம் மேலோங்கும். ஆனால் பிறருக்காக எல்லாவற்றையும் தானே செய்து முடிக்க முயல்வது உங்கள் நேரத்தையும் ஓய்வையும் குறைக்கலாம்.', 'உங்கள் முன்னேற்றத்தின் அளவு வேகம் மட்டுமல்ல; நீண்ட நாள் ஒரே முறையைப் பின்பற்றும் ஒழுங்கும் ஆகும். தனிப்பட்ட பழக்கங்களில் சிறிய மாற்றங்கள் ஏற்பட்டாலே பணியிலும் உறவுகளிலும் அதன் பயன் உணரப்படும்.'],
 ['பொருளாதாரத்தில் ஒரு தொகையைச் சம்பாதிப்பதைவிட அது எதற்குச் செலவாகிறது என்பதை அறிந்திருப்பது முக்கியமாக அமையும். குடும்பத்தாருக்காக செலவு செய்வதிலும் எதிர்காலச் சேமிப்பிற்காக வைத்திருப்பதிலும் அவ்வப்போது கருத்து வேறுபாடு வரலாம்.', 'பேச்சில் நேர்மையை விரும்பினாலும், எதிரிலிருப்பவரின் மனநிலையை அறியாமல் உடனடியாகப் பதில் கூறுவது சிறிய குடும்பப் பிரச்சினையைப் பெரிதாக்கலாம். உறவுகளிடம் பணம் மற்றும் பொறுப்பு பற்றிய எதிர்பார்ப்பை முன்கூட்டியே தெளிவுபடுத்துவது பயனளிக்கும்.'],
 ['ஒரே முயற்சியில் முடிவு வரவில்லை என்பதற்காக அதை விட்டுவிடாமல் வேறொரு வழியைத் தேடும் குணம் உண்டு. எழுத்து, தொழில்நுட்பம், கற்றல், தகவல் பரிமாற்றம் அல்லது சிறு பயணங்களின் மூலம் புதிய வாய்ப்புகள் உருவாகலாம்.', 'உடன்பிறந்தவர்கள் அல்லது நெருங்கியவர்களுடன் ஒத்துழைக்கும்போது யார் எந்தப் பொறுப்பை ஏற்கிறார் என்பதைத் தெளிவாக வைத்தால் தேவையற்ற மனக்கசப்பைத் தவிர்க்கலாம். அவசரமாகச் செய்த ஒரு முயற்சியை மீண்டும் திருத்த வேண்டிய சூழலும் வரலாம்.'],
 ['வீடு என்பது உங்களுக்கு வசிப்பதற்கான இடம் மட்டுமல்ல; மனஅமைதியுடன் சிந்திக்கவும் வேலை செய்யவும் இடம் தேவைப்படும். வீட்டில் செய்யப்படும் ஒரு மாற்றம் உங்கள் அன்றாடப் பணியையும் குடும்ப நேரத்தையும் மாற்றக்கூடும்.', 'தாயார் மற்றும் குடும்பத்தாரின் நலனில் அக்கறை இருந்தாலும், உங்கள் தனிப்பட்ட முடிவுகளை எல்லோரும் உடனே ஏற்றுக்கொள்ள வேண்டும் என எதிர்பார்க்கும்போது கருத்து வேறுபாடு வரலாம். வீடு, வாகனம் அல்லது சொத்து தொடர்பான செலவில் பயன்பாடும் பராமரிப்பும் முதலில் பார்க்கப்பட வேண்டும்.'],
 ['கற்றதை அப்படியே ஏற்றுக்கொள்வதைவிட ஏன் அப்படி இருக்கிறது என்று ஆராயும்போது உங்கள் அறிவு சிறப்பாகச் செயல்படும். பிழையைத் திருத்தும் திறன் உங்களுக்கு சாதகமாக இருந்தாலும், முடிவில்லாத திருத்தங்கள் ஒரு நல்ல முயற்சியை வெளியிடுவதில் தாமதம் தரலாம்.', 'குழந்தைகள் அல்லது மாணவர்கள் தொடர்பான விஷயங்களில் எதிர்பார்ப்பை மட்டும் வலியுறுத்தாமல் அவர்களின் தனித்த திறனுக்கும் இடம் கொடுப்பது உறவை வலுப்படுத்தும். கல்வி, ஆலோசனை, ஆய்வு, கணக்கீடு, படைப்புத் தொழில் போன்றவற்றில் ஆழ்ந்து ஈடுபடும் வாய்ப்பு உண்டு.'],
 ['உங்கள் வேலை ஒரு பிரச்சினையை அடையாளம் காண்பதுடன் நின்றுவிடாமல் அதற்கான தீர்வைத் தேடும் வகையில் அமையலாம். கடினமான பொறுப்பை ஏற்றுக்கொண்டு அதைச் சரிசெய்தபோது கிடைக்கும் நம்பிக்கையே அடுத்த வாய்ப்புக்கு அடித்தளமாகும்.', 'வேலையில் போட்டி, கடன் அல்லது பிறரது அவசரத் தேவைகள் அதிகரிக்கும்போது உணவு, உறக்கம், ஓய்வு ஆகியவற்றை பின்னுக்குத் தள்ளாதிருப்பது முக்கியம். ஒரு வேலை முடிவதற்குள் அடுத்ததை ஏற்றுக்கொண்டால் உழைப்பு கூடினாலும் பலன் தெளிவாகத் தெரியாமல் போகலாம்.'],
 ['துணைவர் அல்லது கூட்டாளியுடன் வாழும் போது ஒரே கருத்து இருப்பதைவிட கருத்து வேறுபாட்டைச் சமாளிக்கும் முறை முக்கியமாகும். குடும்ப அமைதி, குழந்தைகள், செலவுகள், தொழில் நேரம் போன்ற நடைமுறை விஷயங்களே உறவின் தரத்தை முடிவு செய்யக்கூடும்.', 'மற்றவர் சொன்ன ஒரு வார்த்தையை மீண்டும் மீண்டும் நினைத்து வருந்துவதற்குப் பதிலாக அப்போது இருந்த சூழலைத் தெளிவுபடுத்திப் பேசுவது நல்ல மாற்றம் தரும். உறுதியளித்த பொறுப்புகளைச் சரியான நேரத்தில் நிறைவேற்றுவது நம்பிக்கையை வளர்க்கும்.'],
 ['திடீரென வரும் மாற்றங்களை நீங்கள் பெரும்பாலும் அதன் உண்மையான காரணத்தை அறிந்த பிறகே ஏற்றுக்கொள்வீர்கள். பழைய நடைமுறை வேலை செய்யாவிட்டால் அதைக் கவனமாக மாற்றுவதன் மூலம் பெரிய இழப்பைத் தவிர்க்க முடியும்.', 'காப்பீடு, ஆவணங்கள், ஒப்பந்தங்கள், சொத்து அல்லது மறைமுகச் செலவுகள் போன்ற விஷயங்களைப் புரிந்துகொள்ளாமல் ஒப்புதல் தர வேண்டாம். எதிர்பாராத மாற்றம் எப்போதும் தீமையாகவே முடியாது; பழைய சுமையிலிருந்து விடுபடும் வழியாகவும் மாறலாம்.'],
 ['உங்கள் அறிவை வளர்ப்பதில் புத்தகங்கள் மட்டுமல்ல; அனுபவமுள்ளவர்களுடன் உரையாடுவது, சொந்த முயற்சி, பயணம் ஆகியவையும் பங்கு வகிக்கலாம். ஒரு கருத்து நடைமுறையில் பொருந்துகிறதா என்று ஆராய்ந்த பிறகே அதை ஏற்றுக்கொள்வீர்கள்.', 'தந்தை, ஆசிரியர், மூத்தவர் அல்லது வழிகாட்டியுடன் கருத்து வேறுபாடு ஏற்பட்டாலும் அதிலிருந்து பயன்படும் அறிவைப் பிரித்தெடுக்கும் திறன் வளர வேண்டும். நீண்ட பயணம் அல்லது உயர்கல்வி தொடர்பான முடிவுகளில் உடனடிப் பலனைவிட நீண்டகாலப் பயனைப் பார்க்க வேண்டும்.'],
 ['உங்களுக்கு மரியாதையைத் தருவது பதவிப் பெயர் மட்டுமல்ல; பிறரால் முடியாத ஒரு பணியை ஒழுங்காக முடிப்பதே ஆகும். அறிவு, கணக்கீடு, ஆலோசனை, சேவை அல்லது தொழில்நுட்பம் போன்ற துறைகளில் அடிக்கடி தீர்வு தேடும் பொறுப்புகள் வரலாம்.', 'புதிய வழிமுறைகளில் ஆர்வம் இருந்தாலும் சோதிக்காத ஒன்றை உடனடியாக அனைவருக்கும் வழங்குவதால் நம்பிக்கைக்குச் சிரமம் வரலாம். உங்கள் வேலை மற்றவருக்குப் புரியும் வகையில் ஆவணப்படுத்தப்பட்டால் அந்த அனுபவமே தொழிலின் வளர்ச்சியாக மாறும்.'],
 ['வருமானம் ஒரே நாளில் மிகப் பெரிதாக உயர்வதைவிட ஒழுங்கான உழைப்பும் நம்பகமான தொடர்புகளும் மூலம் படிப்படியாக வளர்வது உங்களுக்கு பொருத்தமாக அமையலாம். நண்பர்கள், வாடிக்கையாளர்கள் அல்லது தொழில் வட்டம் வழியாக வாய்ப்புகள் உருவாகலாம்.', 'எதிர்பார்க்கப்படும் வருமானத்தையும் கைக்கு வந்த பணத்தையும் ஒன்றாகக் கணக்கிடாமல் இருந்தால் குடும்பத்திற்கும் தொழிலுக்கும் பாதுகாப்பு கிடைக்கும். மற்றவர்களுக்கு உதவுவது நல்லதே என்றாலும் அதற்காகத் தனிப்பட்ட தேவைகள் பாதிக்கப்படக் கூடாது.'],
 ['தனியாகச் சிந்திக்க நேரம் கிடைத்தால் பல சிக்கல்களுக்குத் தீர்வு காண முடியும். ஆனால் அதே தனிமை நீண்ட நேரம் வேலை செய்வதோடு இணைந்துவிட்டால் ஓய்வுக்குரிய நேரமும் வேலைக்கே போய்விடலாம்.', 'பயணம், ஆன்மிக ஆர்வம், தானம், கல்வி, குடும்பத் தேவைகள் ஆகியவற்றிற்குச் செலவுகள் வரலாம். எது தேவையான செலவு, எது தள்ளிப்போடக்கூடியது என்று பிரித்து வைத்தால் பொருளாதாரமும் மனநிம்மதியும் ஒரே நேரத்தில் காக்கப்படும்.']
];
const LIFE_EN=[
 ['You approach decisions by examining their practical consequences. Once a responsibility is yours, you tend to see it through, yet carrying everybody else’s work can quietly crowd out rest.','Your progress benefits more from steady habits than from speed alone. A small change in how you plan your day can make both work and family life easier.'],
 ['You may earn well at times yet feel the real question is where the money goes. Family needs and future reserves will occasionally pull in different directions.','You prefer speaking plainly, but an immediate reply can turn a small disagreement into a larger one. Agreeing on financial responsibilities before spending protects both savings and relationships.'],
 ['When an approach fails, you are likely to try another rather than give up. Writing, technology, communication, new skills and short journeys can open useful possibilities.','Sibling and peer relationships benefit from explicit responsibilities. An initiative launched in haste may require a second round of careful work.'],
 ['Home is not simply where you live; you need enough peace to think and work well. Changes to the household may therefore affect your daily productivity as well as family time.','Concern for your mother and relatives may coexist with disagreements about your own decisions. For property, vehicles and renovations, weigh upkeep and usefulness against initial excitement.'],
 ['Your learning grows when you can investigate why something works. Finding errors is a strength, but endless revisions can delay sharing a valuable result.','With children or students, leave room for individual strengths rather than insisting on one standard. Research, teaching, calculation and problem-solving may be meaningful outlets.'],
 ['You are drawn to solving difficult tasks, not merely spotting faults. Completing a demanding responsibility can build the trust that brings the next opportunity.','Competition, debt or urgent requests from others can consume meal, sleep and rest time. Taking on the next task before closing the last may leave you busy without a clear outcome.'],
 ['In a partnership, how you resolve a disagreement matters more than never disagreeing. The ordinary questions of money, work hours, home and children can shape the relationship.','Instead of revisiting a difficult remark in isolation, discuss what each person understood and needs. Reliability in small commitments builds lasting trust.'],
 ['When circumstances change unexpectedly, you often need to understand the cause before accepting them. Thoughtfully replacing an ineffective method may prevent a greater loss.','Review insurance, agreements, records and hidden expenses before making commitments. A surprise need not be a defeat; it may also remove an unhelpful burden.'],
 ['Learning from experienced people, travel and independent effort can matter as much as books. You may test a principle in real life before adopting it.','Differences with teachers, elders or mentors can still produce useful insight. For higher study and distant travel, weigh long-term value over immediate reward.'],
 ['Your standing grows through dependable results, not titles alone. Work involving knowledge, calculations, advice, service or technology can repeatedly demand practical solutions.','An experimental idea should be checked before being shared at scale. Clear documentation turns hard-won experience into a lasting professional asset.'],
 ['Income may grow more steadily through reliable work and trustworthy networks than through sudden windfalls. Clients, colleagues and acquaintances may bring opportunities.','Do not confuse hoped-for income with money already received. Helping others should not come at the expense of essential family commitments.'],
 ['Quiet time can lead to useful solutions, but when solitude turns into late-night work it can consume the rest it was meant to provide.','Travel, study, charity, spiritual interests and family needs may all compete for resources. Distinguishing essential costs from avoidable ones protects both finances and peace of mind.']
];
// These lines are not medical diagnoses; each house has its OWN time-specific lived consequence.
const WINDOW_TA=[
 ['சொந்த முடிவுகளைப் பற்றிய தெளிவு அதிகரித்து, முன்னுரிமைகளை மாற்றியமைக்கும் முயற்சி வரலாம்.','எல்லா பொறுப்பையும் ஒரே நேரத்தில் ஏற்கும் போது உடல் ஓய்வும் குடும்ப நேரமும் குறையலாம்.'],
 ['சேமிப்பு, குடும்பப் பொறுப்பு அல்லது செலவுத் திட்டத்தில் குறிப்பிடத்தக்க திருத்தம் செய்ய நேரிடலாம்.','பணம் தருவதாகத் தெரிவித்த வாய்ப்பை உண்மையான வரவாக எண்ணி செலவிட வேண்டாம்.'],
 ['புதிய திறன் பயிற்சி, எழுதுதல், தகவல் பரிமாற்றம் அல்லது சுயமுயற்சி மூலம் முன்னேற்றம் பெறலாம்.','அவசரமாகப் பயணம் செய்வதையோ ஆய்வு செய்யாமல் ஒப்பந்தம் செய்வதையோ தவிர்க்க வேண்டும்.'],
 ['வீட்டில் வேலை செய்யும் இடத்தை மாற்றுதல், குடும்ப ஒழுங்கை மேம்படுத்துதல் அல்லது சொத்துத் திட்டமிடல் முக்கியமாகலாம்.','குடும்பத்தாரின் கருத்தைக் கேட்காமல் பெரிய செலவு செய்யும்போது மனக்கசப்பு ஏற்படலாம்.'],
 ['கற்றல், ஆலோசனை, தொழில்நுட்பப் படைப்பு அல்லது குழந்தைகளின் கல்வியைச் சார்ந்த முயற்சி முன்னேறலாம்.','செய்ததை மீண்டும் மீண்டும் திருத்துவது நல்ல முடிவை வெளியிடுவதில் தாமதம் தரலாம்.'],
 ['நீண்ட நாளாக நிலுவையில் இருந்த வேலை அல்லது கடன் ஒழுங்கைத் தீர்க்க முயல்வீர்கள்.','உணவு, தூக்கம் மற்றும் உடல் ஓய்வை விட்டுக்கொடுத்து வேலை செய்தால் அசௌகரியம் அதிகமாக உணரப்படலாம்.'],
 ['துணைவர் அல்லது கூட்டாளியுடன் பகிர்ந்து செய்ய வேண்டிய பொறுப்புகளில் தெளிவு ஏற்படலாம்.','திட்டத்தைப் பகிராமல் தனியாக முடிவு எடுத்தால் கருத்து வேறுபாடு நீளலாம்.'],
 ['மறந்துபோன ஆவணம் அல்லது பழைய பொறுப்பை ஒழுங்குபடுத்துவது பின்னர் உதவியாகலாம்.','எதிர்பாராத செலவுக்கு முன்கூட்டியே ஒரு மாற்று ஏற்பாடு வைத்திருப்பது நல்லது.'],
 ['ஒரு வழிகாட்டியின் ஆலோசனையால் அல்லது சொந்தப் பயிற்சியால் அடுத்த நிலைக்குச் செல்ல வாய்ப்பு வரலாம்.','புதிய கருத்தை உடனே நிராகரிக்காமல் அதன் நடைமுறை மதிப்பைக் காண வேண்டும்.'],
 ['முன்பு தொடங்கிய பணியின் தரத்தை உயர்த்துவதன் மூலம் புதிய பொறுப்போ நல்ல பெயரோ கிடைக்கலாம்.','மிக அதிகமான திட்டங்களை ஒரே நேரத்தில் தொடங்குவது முடிவுகளைத் தாமதப்படுத்தலாம்.'],
 ['பழைய தொடர்புகள் வழியாகப் புதிய வாடிக்கையாளர் அல்லது வருமான வாய்ப்பு கிடைக்கலாம்.','கிடைக்காத வருவாயை அடிப்படையாகக் கொண்டு செலவுகளை உயர்த்த வேண்டாம்.'],
 ['தேவையற்ற செலவுகளைக் குறைத்து ஓய்வு நேரத்தை மீட்டெடுக்க ஏற்ற மாற்றம் வரலாம்.','வேலை முடிந்த பின்னரும் அதைப் பற்றிச் சிந்தித்துக்கொண்டிருந்தால் உறக்க ஒழுங்கு பாதிக்கப்படலாம்.']
];
const WINDOW_EN=[
 ['You may reconsider priorities and gain clarity about choices that were previously postponed.','Carrying too many obligations at once can reduce rest and time with family.'],
 ['This may be a time to reorganize savings, family responsibilities and the household budget.','Do not spend in advance of income that has not actually arrived.'],
 ['Progress can come through a practical new skill, writing, communication or self-directed effort.','Avoid hurried travel and agreements made without checking the details.'],
 ['Changes to the home workspace, family routines or property planning may become important.','Major spending without household discussion can prolong resentment.'],
 ['Study, advice, technical creation or matters concerning children’s learning may advance.','Repeated revisions can delay publishing something already useful.'],
 ['This can bring an opportunity to resolve unfinished work or reorganize obligations and debt.','Working at the expense of meals, sleep and recovery may make discomfort more noticeable.'],
 ['Shared responsibilities with a spouse or partner may become clearer.','A unilateral decision can prolong an avoidable disagreement.'],
 ['Organizing an old record or obligation now can prevent later confusion.','Leave room for an unexpected expense instead of assuming every plan will hold.'],
 ['Guidance or deliberate practice may help move learning to a new level.','Consider the practical value of unfamiliar advice before rejecting it.'],
 ['Improving the quality of earlier work may build responsibility and reputation.','Starting several projects simultaneously can delay a visible result.'],
 ['An existing network may bring clients or earning opportunities.','Avoid increasing expenses against income that has not been received.'],
 ['Simplifying costs and making room for rest may improve daily balance.','Unfinished work carried into the night can disturb sleep habits.']
];
const BODY_LINK_TA={vision:'கண் களைப்பு, ஒளி உணர்வு',digestion:'வயிற்று உப்புசம், செரிமான அசௌகரியம்',metabolism:'உணவுப் பழக்கமும் உடல் எடை மாற்றமும்',bones:'மூட்டு மற்றும் தசை இறுக்கம்',breath:'மார்பு அல்லது சுவாசப்பாதை அசௌகரியம்',skin:'தோல் உலர்வு அல்லது அரிப்பு',reproductive:'இடுப்பு மற்றும் கீழ்வயிற்றுப் பகுதி அசௌகரியம்',sleep:'தூக்க நேர மாறுதல், ஓய்வுக் குறைவு'};
const BODY_LINK_EN={vision:'eye strain or sensitivity to light',digestion:'bloating or digestive discomfort',metabolism:'changes in appetite or body weight',bones:'joint or muscular stiffness',breath:'chest or airway discomfort',skin:'dryness or irritation of the skin',reproductive:'pelvic or lower-abdominal discomfort',sleep:'irregular sleep and insufficient rest'};
const MEDICAL_PRIMARY={vision:2,digestion:5,metabolism:6,bones:11,breath:4,skin:1,reproductive:8,sleep:12};
const MEDICAL_SECONDARY={vision:12,digestion:6,metabolism:8,bones:10,breath:3,skin:6,reproductive:7,sleep:4};
const PLANET_MOD_TA={Jupiter:'அனுபவமுள்ளவர்களின் ஆலோசனையும் கற்றலும் துணை நிற்கலாம்',Saturn:'முடிவுகள் மெதுவாக வந்தாலும் ஒழுங்கை நிலைநிறுத்துவது பலனளிக்கும்',Rahu:'புதிய வழியைச் சோதிப்பதற்கு முன் அதன் நம்பகத்தன்மையை ஆராய வேண்டும்',Ketu:'பயன் தராத பழைய சுமையைக் குறைப்பது முன்னேற்றத்துக்கு இடமளிக்கலாம்'};
const PLANET_MOD_EN={Jupiter:'guidance and learning may offer support',Saturn:'discipline matters even when progress is slow',Rahu:'check the reliability of an unfamiliar solution before adopting it',Ketu:'removing unnecessary commitments can create room for progress'};
function cleanedParagraphs(topic){return (topic?.paragraphs||[]).map(x=>typeof x==='string'?x:x?.text).filter(x=>typeof x==='string'&&x.trim());}
function chooseBaseline(topic){const arr=cleanedParagraphs(topic);const seen=new Set();return arr.filter(s=>{const k=s.toLocaleLowerCase().replace(/\s+/g,' ').slice(0,120);if(seen.has(k))return false;seen.add(k);return s.length>70;}).sort((a,b)=>b.length-a.length).slice(0,2);}
function physicalByHouse(report,n,lang){
 const item=report?.physicalTopics?.[n-1],rows=cleanedParagraphs(item);if(!rows.length)return "";
 // One body-constitution sentence INSIDE the relevant house, never a duplicate block.
 const chosen=rows.find(x=>x.length>70)||rows[0];return chosen;
}
function medicalByHouse(report,n,lang){const ta=lang!=='en',notes=[];for(const m of report.medicalTopics||[]){const h=MEDICAL_PRIMARY[m.id];if(h!==n)continue;const category=m.evidence?.classification;if(category!=='traditional-concern'&&category!=='mixed')continue;const sym=(ta?BODY_LINK_TA:BODY_LINK_EN)[m.id];if(!sym)continue;
 // One standalone house sentence with no health subheading, and no claim of a congenital defect.
 notes.push(ta?`இந்தப் பாவத்திற்கான உடல் சார்ந்த பாரம்பரியக் குறியீடுகளில் ${sym} போன்ற அசௌகரியங்கள் தொடர்புபடுத்தப்படுகின்றன. இந்தச் சின்னம் வாழ்நாள் முழுவதும் ஒரு நோய் இருக்கும் என்று சொல்வதில்லை; வேலை–உணவு–ஓய்வு சூழலும் தொடர்புடைய காலப்பலனும் ஒன்றாக வரும்போது கவனிக்கப்படும் விஷயமாகும்.`:`The traditional body correspondence for this house includes ${sym}. That does not mean a lifelong illness or a confirmed congenital condition; the theme is considered alongside changing routines and period evidence.`);
 }return notes.slice(0,2);}
function relation(natal,n,lang){if(!natal?.houses?.[n-1])return '';const h=natal.houses[n-1],l=natal.planets?.[h.lord];if(!l||!Number.isInteger(l.house))return '';const ta=lang!=='en',loc=l.house;const occ=(h.occupants||[]).filter(x=>x!==h.lord);
 // Relationships are causal provenance: practical narrative follows separately.
 return ta?`${n}-ஆம் பாவத்திற்கு அதிபதியான ${planet(h.lord,true)} ${loc}-ஆம் வீட்டில் இருப்பதால் இரு பாவங்களின் வாழ்க்கைச் சூழல்களும் தொடர்புபடுகின்றன.${occ.length?' இந்த வீட்டில் '+occ.map(x=>planet(x,true)).join(', ')+' இருப்பதும் பலனை மாற்றுகிறது.':''}`:
 `The ruler of house ${n}, ${planet(h.lord,false)}, occupies house ${loc}, linking those areas of life.${occ.length?' The presence of '+occ.map(x=>planet(x,false)).join(', ')+' modifies the outcome.':''}`;
}
function starThread(natal,timeline,n,lang){
 const first=timeline?.dasha?.[0];if(!first||!natal?.planets)return '';
 const ev=globalThis.SMVD1V301Evidence;if(!ev?.points||!ev?.starOf)return '';
 const md=EN[first.md]||first.md,ad=EN[first.ad]||first.ad;
 if(!natal.planets[md]||!natal.planets[ad])return '';
 const weighted=ev.points(natal,md,ad)?.ranked||[];
 if(!weighted.slice(0,5).some(x=>x.house===n))return '';
 const m=natal.planets[md],a=natal.planets[ad],ms=ev.starOf(natal,md),as=ev.starOf(natal,ad);
 const nm=lang!=='en',ln=x=>planet(x,nm);
 return nm?`நடப்பு ${ln(md)} தசையில் ${ln(ad)} புக்தி செயல்படும் போது, பிறப்பில் ${ln(md)} ${m.house}-ஆம் வீட்டிலிருந்தும் அதன் நட்சத்திர அதிபதி ${ln(ms?.lord||md)} வழியாகவும் பலன் தருகிறார். ${ln(ad)} ${a.house}-ஆம் வீட்டிலிருந்து ${ln(as?.lord||ad)} சாரத்தையும் இணைக்கிறார். அந்தத் தொடர்புகள் இந்த ${n}-ஆம் பாவத்தையும் முன்னிலைப்படுத்துவதால், ஒரே கிரகத்தின் இருப்பிடத்தை மட்டும் வைத்து நல்லது அல்லது கெட்டது என்று முடிவு செய்ய முடியாது.`:
 `During ${ln(md)} major period and ${ln(ad)} sub-period, the natal ${ln(md)} in house ${m.house} works through its star ruler ${ln(ms?.lord||md)}, while ${ln(ad)} in house ${a.house} links to ${ln(as?.lord||ad)}. Their weighted connections activate house ${n}, so no single placement should be treated as an isolated promise or setback.`;
}
function periodOverlap(a,b){return validISO(a?.from)&&validISO(b?.from)&&a.from<b.to&&b.from<a.to;}
function candidates(report,n){if(!report)return [];
 const dashas=(report.dasha||[]).flatMap((p,i)=>(p.topics||[]).filter(t=>t.number===n).map(t=>({type:'period',from:p.from,to:p.to,period:p,activation:t.activation||0,rank:(t.activation||0)+(i===0?4:0),topic:t})));
 const transits=(report.transitYears||[]).flatMap((y,i)=>(y.notes||[]).filter(x=>x.focus===n).map(note=>({type:'transit',from:y.from,to:y.to,year:y,note,activation:0,rank:(i===0?3:0)+1})));
 // Pair *real* period and local midpoint observation; never invent an ingress date.
 for(const c of dashas){const hits=transits.filter(t=>periodOverlap(c,t)).sort((a,b)=>b.rank-a.rank);if(hits.length){c.hit=hits[0];c.rank+=3;}}
 // Prefer immediate/major-lord variation as well as strong house activation; do not repeat every monthly snapshot.
 const sorted=[...dashas,...transits.filter(t=>!dashas.some(d=>periodOverlap(d,t)))].sort((a,b)=>b.rank-a.rank||a.from.localeCompare(b.from));
 const selected=[],signatures=new Set();for(const c of sorted){if(selected.length>=5)break;const sig=c.type==='period'?`${c.period.md}:${c.period.ad}`:`transit:${c.note.planet}:${c.from.slice(0,4)}`;
 if(signatures.has(sig))continue;if(selected.some(x=>periodOverlap(x,c)))continue;selected.push(c);signatures.add(sig);}
 // Guarantee a near-term item when genuinely relevant.
 const first=dashas.find(x=>x.from===report.referenceDate);if(first&&!selected.some(x=>periodOverlap(x,first))){selected.pop();selected.unshift(first);}
 return selected.sort((a,b)=>a.from.localeCompare(b.from));
}
function timedParagraph(c,n,lang){const ta=lang!=='en',scene=(ta?WINDOW_TA:WINDOW_EN)[n-1],period=c.type==='period'?c.period:null;
 const title=period?(ta?`${planet(period.md,true)} தசையில் ${planet(period.ad,true)} புக்தி`:`${planet(period.md,false)} major period and ${planet(period.ad,false)} sub-period`):'';
 const d=ta?`${c.from} முதல் ${c.to} வரை`:`From ${c.from} to ${c.to}`;
 const msg=c.rank>=6?scene[0]:scene[1];let s=period?(ta?`${d} ${title} செயல்படுவதால் ${msg}`:`${d}, with ${title}, ${msg}`):(ta?`${d} கோச்சாரத் தொடர்பு வலுப்பெறும் போது ${scene[0]}`:`${d}, as the transit contacts this area, ${scene[0]}`);
 const transit=c.hit|| (c.type==='transit'?c:null);if(transit?.note){const pname=transit.note.planet,dt=transit.year?.date||transit.from;
 s+=ta?` ${dt} அன்று கணிக்கப்பட்ட ${planet(pname,true)} பெயர்ச்சியும் இந்தப் பாவத்துடன் தொடர்பு பெறுகிறது; ${PLANET_MOD_TA[pname]||'அந்தப் பெயர்ச்சியின் வலிமையை மற்ற கிரகங்களுடன் சேர்த்து வாசிக்க வேண்டும்'}.`:
 ` A calculated ${planet(pname,false)} transit snapshot on ${dt} also connects to this house; ${PLANET_MOD_EN[pname]||'it should be weighed alongside the other factors'}.`;
 }
 return s;}
function build(chart,lang='ta',context={},timeline=null){const reader=globalThis.SMVLifePredictionD1;if(!reader?.render||!reader?.toD1)throw Error('D1 life reader is required');
 const rep=reader.render(chart,lang,context),natal=reader.toD1(chart);if(rep.topics?.length!==12)throw Error('12 D1 life topics required');
 const topics=rep.topics.map((t,i)=>{const n=i+1,ta=lang!=='en';const base=chooseBaseline(t);const scene=(ta?LIFE_TA:LIFE_EN)[i];const evidence=relation(natal,n,lang);const para=[];if(base[0])para.push(base[0]);para.push(scene[0]);if(base[1]&&base[1]!==base[0])para.push(base[1]);para.push(scene[1]);if(evidence)para.push(evidence);const star=starThread(natal,timeline,n,lang);if(star)para.push(star);
 const physical=physicalByHouse(rep,n,lang);if(physical)para.push(physical);const medical=medicalByHouse(rep,n,lang);para.push(...medical);
 const times=candidates(timeline,n);para.push(...times.map(c=>timedParagraph(c,n,lang)));
 return {number:n,title:t.title,paragraphs:para,timedWindows:times.length,medicalAssociations:medical.length};});
 return {topics,lang:lang==='en'?'en':'ta',timeline:timeline?{from:timeline.referenceDate,to:timeline.end,years:timeline.meta?.forecastHorizonYears??15}:null};}
function html(report){const ta=report.lang!=='en';const span=report.timeline?`${report.timeline.from} – ${report.timeline.to}`:(ta?'கணிக்கப்படுகிறது':'being calculated');
 return `<section class="smv-d1-life-reading smv-v302-integrated" data-smv-d1-life="1" data-smv-integrated="12" lang="${report.lang}"><h2>${ta?'முழு வாழ்க்கைப் பலன்கள்':'Complete Life Predictions'}</h2><p class="smv-v302-intro">${ta?`பிறப்பு ஜாதகம், கிரக பலம், நட்சத்திரத் தொடர்பு, உடல் சார்ந்த பாரம்பரியக் காரகங்கள், தசை–புக்தி மற்றும் பெயர்ச்சிகள் அனைத்தும் பன்னிரண்டு வாழ்க்கைத் தலைப்புகளுக்குள்ளேயே இணைக்கப்பட்டுள்ளன. காலப்பார்வை: ${esc(span)}. எந்த உடல் உபாதையும் ஜாதகத்தால் மருத்துவ ரீதியாக உறுதிப்படுத்தப்படுவதில்லை.`:`The twelve life topics integrate natal evidence, traditional bodily associations, Dasha–Bhukti and calculated transits. Forward window: ${esc(span)}. A horoscope does not diagnose disease or congenital conditions.`}</p>${report.topics.map(t=>`<section class="smv-d1-life-topic smv-v302-house" data-d1-topic="${t.number}"><h3>${t.number}. ${esc(t.title)}</h3>${t.paragraphs.map(p=>`<p class="smv-d1-life-paragraph">${esc(p)}</p>`).join('')}</section>`).join('')}</section>`;}
return Object.freeze({build,html,candidates,medicalByHouse,version:'302-one-12-house-15-year-integrated'});
});
