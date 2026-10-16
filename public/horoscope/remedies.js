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
