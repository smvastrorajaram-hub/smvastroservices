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

/* Topic names and chart-specific explanations replace repeated report labels. */
const TOPIC_TA = [
 "தன்னம்பிக்கை மற்றும் சொந்த முடிவுகள்",
 "குடும்பத்தின் வரவு–செலவு",
 "முயற்சி மற்றும் திறன் வளர்ச்சி",
 "வீடு மற்றும் குடும்ப ஆதரவு",
 "கல்வி மற்றும் படைப்பாற்றல்",
 "பணி ஒழுங்கு மற்றும் போட்டி",
 "திருமணம் மற்றும் கூட்டாண்மை",
 "பகிர்ந்த நிதி மற்றும் ஆவணங்கள்",
 "மேற்படிப்பு மற்றும் வழிகாட்டல்",
 "தொழில் மற்றும் வேலைப் பொறுப்பு",
 "வருமானம் மற்றும் தொடர்புகள்",
 "செலவு மற்றும் ஓய்வு"
];
const YOUTH_TOPIC_TA = [
 "தன்னம்பிக்கையும் சிறிய முடிவுகளும்",
 "குடும்பத்துடன் தேவைகளைப் பகிர்தல்",
 "திறன் பயிற்சியும் உடன்பிறந்தோர் உறவும்",
 "வீட்டுச் சூழலும் குடும்ப ஆதரவும்",
 "படிப்பும் படைப்புப் பயிற்சியும்",
 "அன்றாட ஒழுங்கும் பயிற்சியும்",
 "நண்பர்களுடன் ஒத்துழைத்தல்",
 "பொருள்களைப் பாதுகாத்தலும் மாற்றங்களுக்குப் பழகுதலும்",
 "பெற்றோர் அல்லது ஆசிரியர் வழிகாட்டல்",
 "பள்ளிப் பொறுப்பும் திறன் வளர்ப்பும்",
 "நண்பர் வட்டமும் குழுக் கற்றலும்",
 "உறக்கமும் ஓய்வும்"
];
const OWNER_TA = [
 "லக்னாதிபதியான",
 "குடும்பப் பணத்தைக் குறிக்கும் பாவத்தின் அதிபதியான",
 "முயற்சி மற்றும் தொடர்புகளைக் குறிக்கும் பாவத்தின் அதிபதியான",
 "வீடு மற்றும் குடும்ப ஆதரவைக் குறிக்கும் பாவத்தின் அதிபதியான",
 "கல்வி மற்றும் படைப்பாற்றலைக் குறிக்கும் பாவத்தின் அதிபதியான",
 "பணி மற்றும் போட்டியைக் குறிக்கும் பாவத்தின் அதிபதியான",
 "திருமணம் மற்றும் கூட்டாண்மையைக் குறிக்கும் பாவத்தின் அதிபதியான",
 "கூட்டுச் சொத்து மற்றும் மாற்றத்தைக் குறிக்கும் பாவத்தின் அதிபதியான",
 "மேற்படிப்பு மற்றும் வழிகாட்டலைக் குறிக்கும் பாவத்தின் அதிபதியான",
 "தொழில் அதிபதியான",
 "வருமானப் பாவத்தின் அதிபதியான",
 "செலவு மற்றும் ஓய்வைக் குறிக்கும் பாவத்தின் அதிபதியான"
];
const CONNECTION_SUBJECT_TA = [
 "உங்கள் சொந்த முடிவுகள்",
 "குடும்பத்தின் பணத் திட்டங்கள்",
 "உங்கள் முயற்சியும் திறன் வளர்ச்சியும்",
 "வீட்டிற்கான ஏற்பாடுகள்",
 "படிப்பும் படைப்புப் பணியும்",
 "பணி ஒழுங்கும் போட்டியும்",
 "துணைவருடன் ஏற்படுத்தும் உடன்பாடுகள்",
 "பகிர்ந்த பணம் மற்றும் ஆவணங்களுக்கான முடிவுகள்",
 "மேற்படிப்பு மற்றும் பயணத் திட்டங்கள்",
 "வேலை குறித்து எடுக்கும் முடிவுகள்",
 "வருமானத்தை வளர்க்கும் முயற்சிகள்",
 "செலவு மற்றும் ஓய்வுக்கான திட்டங்கள்"
];
const CONNECTION_CONTEXT_TA = [
 "உங்கள் நேரடி முயற்சியோடு",
 "குடும்பத்தின் பணத் தேவைகளோடு",
 "பயிற்சி, எழுத்து மற்றும் உடன்பிறந்தோர் தொடர்புகளோடு",
 "வீட்டுச் சூழல் மற்றும் குடும்பப் பராமரிப்போடு",
 "கல்வி, குழந்தைகள் அல்லது படைப்புப் பணியோடு",
 "அன்றாட பணி, போட்டி மற்றும் பொறுப்புகளோடு",
 "துணைவர் அல்லது கூட்டாளியின் முடிவுகளோடு",
 "பகிர்ந்த நிதி மற்றும் எதிர்பாராத மாற்றங்களோடு",
 "வழிகாட்டல், மேற்படிப்பு மற்றும் பயணத்தோடு",
 "பணியிடப் பொறுப்புகளோடு",
 "நண்பர்கள் மற்றும் பயனுள்ள தொடர்புகளோடு",
 "வெளியூர் ஏற்பாடுகள், செலவு மற்றும் ஓய்வோடு"
];
const INDICATION_TA = [
 "உங்கள் தன்மையையும் முடிவெடுக்கும் முறையையும்",
 "குடும்பத்தின் வரவு–செலவையும் பேச்சையும்",
 "சொந்த முயற்சியையும் திறன் வளர்ச்சியையும்",
 "வீட்டையும் குடும்ப ஆதரவையும்",
 "கல்வியையும் படைப்பாற்றலையும்",
 "பணி ஒழுங்கையும் போட்டியையும்",
 "திருமணத்தையும் கூட்டாண்மையையும்",
 "பகிர்ந்த நிதியையும் ஆவணங்களையும்",
 "மேற்படிப்பையும் வழிகாட்டலையும்",
 "தொழிலையும் வேலைப் பொறுப்பையும்",
 "வருமானத்தையும் தொடர்புகளையும்",
 "செலவையும் ஓய்வையும்"
];
const YOUTH_INDICATION_TA = [
 "தன்னம்பிக்கையையும் சிறிய முடிவுகளையும்",
 "குடும்பத்துடன் தேவைகளைப் பகிரும் பழக்கத்தை",
 "திறன் பயிற்சியையும் உடன்பிறந்தோர் உறவையும்",
 "வீட்டுச் சூழலையும் குடும்ப ஆதரவையும்",
 "படிப்பையும் படைப்புப் பயிற்சியையும்",
 "அன்றாட ஒழுங்கையும் பயிற்சியையும்",
 "நண்பர்களுடன் ஒத்துழைக்கும் பழக்கத்தை",
 "பொருள்களைப் பாதுகாக்கும் பழக்கத்தையும் மாற்றங்களுக்குப் பழகுவதையும்",
 "பெற்றோர் அல்லது ஆசிரியர் வழிகாட்டலை",
 "பள்ளிப் பொறுப்பையும் திறன் வளர்ப்பையும்",
 "நண்பர் வட்டத்தையும் குழுக் கற்றலையும்",
 "உறக்கத்தையும் ஓய்வையும்"
];
function indicationTamil(c,house=c.house){return (c.ageUnder18?YOUTH_INDICATION_TA:INDICATION_TA)[house-1];}
function topicTamil(c,house=c.house){return (c.ageUnder18?YOUTH_TOPIC_TA:TOPIC_TA)[house-1];}
function ownerTamil(c){return c.ageUnder18?`${indicationTamil(c)} குறிக்கும் ${c.house}-ஆம் பாவத்தின் அதிபதியான`:OWNER_TA[c.house-1];}
function locationTamil(c){return `${indicationTamil(c,c.location)} குறிக்கும் ${c.location}-ஆம் பாவத்தில்`;}
function naturalRelationTamil(v,c){
 const name=actor(v.planet,true),house=indicationTamil(c);
 return v.relation==='lord'?`${name} ${house} குறிக்கும் பாவத்தை ஆள்வது`:
 v.relation==='occupies'?`${name} ${house} குறிக்கும் பாவத்தில் அமர்ந்திருப்பது`:
 v.relation==='aspects'?`${name} ${house} குறிக்கும் பாவத்தைப் பார்ப்பது`:`${name} ${house} தொடர்பான காரகமாவது`;
}
function naturalDivisionTamil(c,d){
 const rows=(d.divisionEvidence||[]).filter(v=>v.dignity==='strong'||v.dignity==='weak');
 return rows.map(v=>{
  const place={own:'சொந்த ராசியில்',exalted:'உச்ச ராசியில்',debilitated:'நீச ராசியில்'}[v.reason]||(v.dignity==='strong'?'வலிமையான நிலையில்':'பலவீனமான நிலையில்');
  return `${v.division} வர்க்கத்தில் ${actor(v.planet,true)} ${place} இருப்பது, ${topicTamil(c)} தொடர்பாக ${v.dignity==='strong'?'கூடுதல் ஆதரவைக் காட்டுகிறது':'கூடுதல் கவனம் தேவைப்படுவதைக் காட்டுகிறது'}.`;
 }).join(' ');
}
function naturalClassicTamil(c,d,seen){
 const rules=d.classical||[];
 const r=['PARIVARTANA','DHANA_2_11_LINK','GURU_COUNTER_ASPECT','KENDRA_TRIKONA_LINK','DUSTHANA_LORD_LINK'].map(key=>rules.find(x=>x.key===key)).find(Boolean);
 if(!r||seen?.has(r.key))return '';
 if(seen)seen.add(r.key);
 const names=r.planets.map(k=>actor(k,true)).join('–'),topic=topicTamil(c);
 if(r.key==='PARIVARTANA')return `${names} ஒருவருக்குரிய பாவத்தில் மற்றொருவர் அமர்ந்துள்ளனர். அதனால் ${topic} பற்றிய முடிவுகளும் ${topicTamil(c,c.location)} பற்றிய முடிவுகளும் ஒன்றோடு ஒன்று இணைகின்றன.`;
 if(r.key==='DHANA_2_11_LINK')return c.ageUnder18?`${names} அதிபதிகளின் தொடர்பு, குடும்பத்திலிருந்து கிடைக்கும் உதவியையும் கற்றலுக்கான தேவைகளையும் இணைக்கிறது.`:`${names} அதிபதிகளின் நேரடித் தொடர்பு, சம்பாதிக்கும் பணத்தையும் குடும்பத்திற்காகச் சேமிக்கும் தொகையையும் இணைக்கிறது. வருமானம் வளரும்போது சேமிப்புக்கான முடிவுகளும் முக்கியமாகின்றன.`;
 if(r.key==='GURU_COUNTER_ASPECT'){
  const restrictive=(c.houseAspects||[]).filter(k=>k==='Mars'||k==='Saturn').map(k=>actor(k,true)).join(' மற்றும் ');
  return `குருவின் பார்வை ${topic} தொடர்பாக ஆதரவளிக்கிறது.${restrictive?` ${restrictive} பார்வையும் இருப்பதால் வாய்ப்புடன் பொறுப்புகளையும் சேர்த்துக் கவனிக்க வேண்டும்.`:''}`;
 }
 if(r.key==='KENDRA_TRIKONA_LINK')return `${names} என்ற கேந்திர–திரிகோண அதிபதிகளின் தொடர்பு, ${topic} சார்ந்த வாய்ப்பைச் செயல்படுத்த உதவும் அமைப்பாக உள்ளது.`;
 return `${names} ஆறாம், எட்டாம் அல்லது பன்னிரண்டாம் பாவங்களுக்குள் அதிபதித் தொடர்பு ${r.planets.length>1?'பெறுகின்றனர்':'பெறுகிறார்'}. ${topic} பற்றிய முடிவுகளில் பொறுப்புகளையும் மாற்றத்திற்கான ஏற்பாடுகளையும் கவனிக்க வேண்டியுள்ளது.`;
}
const PRESSURE_CONTEXT_TA = [
 "சொந்த முடிவைச் செயல்படுத்தும்போது பிறரின் எதிர்பார்ப்புகளையும் சமாளிக்க வேண்டியிருக்கலாம்.",
 "வரவு இருந்தாலும் குடும்பப் பொறுப்புகளுக்கான செலவு சேமிப்பின் அளவை மாற்றலாம்.",
 "முயற்சி தொடர்ந்தாலும் அதன் நடைமுறையை மாற்றிச் செய்வதற்கு நேரம் தேவைப்படலாம்.",
 "வீட்டிற்கான நல்ல ஏற்பாட்டுடன் பராமரிப்புப் பொறுப்புகளையும் இணைத்துக் கவனிக்க வேண்டியிருக்கலாம்.",
 "ஆர்வமுள்ள படிப்பில் தொடர்ந்து ஈடுபடுவதற்கான நேரமும் சூழலும் முக்கியமாகின்றன.",
 "பொறுப்பை முடிப்பதோடு ஓய்வுக்கான நேரத்தையும் பாதுகாக்க வேண்டியிருக்கலாம்.",
 "ஒத்துழைப்பு கிடைத்தாலும் பணம், நேரம், பொறுப்பு பற்றிய உடன்பாடு தெளிவாக இருக்க வேண்டும்.",
 "மாற்றம் தேவைப்பட்டாலும் ஆவணங்களும் பகிர்ந்த பொறுப்புகளும் தெளிவாக இருக்க வேண்டும்.",
 "கிடைக்கும் வழிகாட்டலை உங்கள் சூழலுக்கு ஏற்பப் பயன்படுத்துவதில் கவனம் தேவைப்படலாம்.",
 "கூடுதல் பொறுப்பை ஏற்கும்போது அதை நிறைவேற்றத் தேவையான நேரமும் ஒத்துழைப்பும் முக்கியமாகின்றன.",
 "வருமான வாய்ப்பையும் பணம் கைக்கு வரும் நேரத்தையும் தனித்தனியாகக் கவனிக்க வேண்டியிருக்கலாம்.",
 "செலவுத் திட்டத்துடன் ஓய்வு மற்றும் குடும்ப நேரத்திற்கும் இடம் வைத்திருக்க வேண்டியிருக்கலாம்."
];
const YOUTH_PRESSURE_CONTEXT_TA = [
 "சிறிய முடிவுகளை எடுத்துப் பழகும்போது பெரியவர்களின் உதவியும் முக்கியமாகிறது.",
 "கல்விக்கும் அன்றாடத் தேவைகளுக்கும் குடும்பத்தினரின் உதவியைப் பயன்படுத்துவது முக்கியமாகிறது.",
 "தொடர்ந்து பயிற்சி செய்யும் பழக்கத்திற்கும் இடைவெளிக்கும் சமநிலை தேவைப்படலாம்.",
 "வீட்டில் படிப்பதற்கான இடமும் குடும்பத்துடன் உரையாடும் நேரமும் முக்கியமாகின்றன.",
 "படிப்பு, விளையாட்டு, படைப்புப் பயிற்சி ஆகியவற்றிற்கான நேரத்தைப் பகிர்ந்து கொள்ள வேண்டியிருக்கலாம்.",
 "பயிற்சிக்கும் ஓய்வுக்கும் ஏற்ற அன்றாட ஒழுங்கை அமைத்துக் கொள்வது உதவும்.",
 "நண்பர்களுடன் மாறிமாறிப் பொறுப்பை ஏற்றுச் செயல்படப் பழகுவது உதவும்.",
 "புதிய சூழல் புரியாதபோது பெரியவர்களிடம் கேட்டு உதவி பெறுவது முக்கியமாகிறது.",
 "ஆசிரியர் அல்லது பெற்றோர் விளக்கத்தை நடைமுறையில் முயன்று பார்ப்பது உதவும்.",
 "ஒப்படைக்கப்படும் பள்ளிப் பொறுப்பை முடிக்க நேரமும் வழிகாட்டலும் தேவைப்படலாம்.",
 "குழுச் செயல்களில் பிறரின் கருத்தையும் தன் பங்கையும் புரிந்துகொள்வது முக்கியமாகிறது.",
 "படிப்பிற்கும் விளையாட்டிற்கும் இடையில் உறக்கம் மற்றும் ஓய்வுக்கான நேரம் தேவைப்படுகிறது."
];
const PLANET_POSSESSIVE_TA = {"Sun":"சூரியனின்","Moon":"சந்திரனின்","Mars":"செவ்வாயின்","Mercury":"புதனின்","Jupiter":"குருவின்","Venus":"சுக்கிரனின்","Saturn":"சனியின்","Rahu":"ராகுவின்","Ketu":"கேதுவின்"};
function possessiveTamil(k){return PLANET_POSSESSIVE_TA[k]||actor(k,true);}
function shortPressureTamil(v,c){
 const name=actor(v.planet,true);
 return v.relation==='lord'?`${name} அதிபதியாகவும் இருப்பதால்`:
 v.relation==='occupies'?`${name} அதே பாவத்தில் அமர்ந்திருப்பதால்`:
 v.relation==='aspects'?`${possessiveTamil(v.planet)} பார்வையும் இருப்பதால்`:`${name} காரகத் தொடர்பும் இருப்பதால்`;
}
function naturalNatalTamil(c,d,seen){
 const lord=actor(d.lord,true);
 let cause=`${ownerTamil(c)} ${lord}, ${c.location===c.house?'தான் ஆளும் பாவத்திலேயே':locationTamil(c)} அமர்ந்திருக்கிறார்.`;
 if(c.location!==c.house&&!c.ageUnder18)cause+=` இதனால் ${CONNECTION_SUBJECT_TA[c.house-1]} ${CONNECTION_CONTEXT_TA[c.location-1]} இணைந்து அமையலாம்.`;
 const other=d.otherLordships.filter(h=>h!==c.house);
 const cross=other.length?`${lord} ${other.map(h=>indicationTamil(c,h)).join(' மற்றும் ')} குறிக்கும் பாவத்தையும் ஆள்கிறார். ${c.ageUnder18?'வீட்டில் கிடைக்கும் உதவி, கற்றல் மற்றும் பழக்க வளர்ச்சியுடன் இந்தத் தொடர்பை இணைத்துப் பார்க்கலாம்.':other.map(h=>CROSS_TA[h]).filter(Boolean).map(s=>s.charAt(0).toUpperCase()+s.slice(1)+'.').join(' ')}`:'';
 const positive=d.positive.find(v=>v.delta>=.16),negative=d.negative.find(v=>v.delta<=-.16);
 let balance='';
 if(positive&&negative){const context=(c.ageUnder18?YOUTH_PRESSURE_CONTEXT_TA:PRESSURE_CONTEXT_TA)[c.house-1];balance=`${naturalRelationTamil(positive,c)} சாதகமாக உள்ளது. ${shortPressureTamil(negative,c)}, ${context.charAt(0).toLowerCase()+context.slice(1)}`;}
 else if(positive)balance=`${naturalRelationTamil(positive,c)} நல்ல ஆதரவாக உள்ளது.`;
 else if(negative)balance=`${naturalRelationTamil(negative,c)} காரணமாக முடிவை நிறைவேற்றுவதற்குக் கூடுதல் நேரமோ பொறுப்போ தேவைப்படலாம்.`;
 return [d.completedTA,cause,cross,balance,naturalDivisionTamil(c,d),naturalClassicTamil(c,d,seen)].filter(Boolean);
}
function periodConnectionsTamil(keys,c){
 const unique=keys.filter(Boolean).filter((k,i,a)=>a.indexOf(k)===i),sentences=[];
 let named=false;
 if(unique.includes(c.lord)){sentences.push(`${actor(c.lord,true)} ${indicationTamil(c)} குறிக்கும் பாவத்தின் அதிபதி.`);named=true;}
 const occupants=unique.filter(k=>k!==c.lord&&c.houseOccupants.includes(k));
 if(occupants.length){sentences.push(`${occupants.map(k=>actor(k,true)).join(' மற்றும் ')} ${named?'அதே பாவத்தில்':indicationTamil(c)+' குறிக்கும் பாவத்தில்'} ${occupants.length===1?'அமர்ந்திருக்கிறார்':'அமர்ந்துள்ளனர்'}.`);named=true;}
 const aspects=unique.filter(k=>k!==c.lord&&!occupants.includes(k)&&c.houseAspects.includes(k));
 if(aspects.length)sentences.push(`${aspects.length===1?possessiveTamil(aspects[0]):aspects.map(k=>actor(k,true)).join(' மற்றும் ')+' ஆகியோரின்'} ${named?'பார்வையும் அதே பாவத்தின் மீது':'பார்வை '+indicationTamil(c)+' குறிக்கும் பாவத்தின் மீது'} உள்ளது.`);
 return sentences.join(' ');
}
function naturalPeriodTamil(win,c,d){
 const p=win.period,knownAge=Number.isFinite(p.age),child=knownAge?p.age<18:!!c.ageUnder18,senior=knownAge&&p.age>=65;
 const scoped={...c,ageUnder18:child};
 const stage=d.stage==='support'?0:d.stage==='strain'?1:2;
 const school={7:'நண்பர்கள் மற்றும் ஆசிரியர்களுடன் பொறுப்பைப் பகிர்ந்துகொள்ளும் பழக்கம் வளரலாம்',10:'பள்ளிப் பயிற்சியில் ஒப்படைக்கப்பட்ட பணியை முடிக்கும் திறன் வளரலாம்',11:'குழுக் கற்றலிலும் நண்பர்கள் உறவிலும் புதிய அனுபவம் பெறலாம்'};
 const effect=senior&&c.house===10?'பணி அனுபவத்தைப் பகிர்வதும் பொறுப்பை மறுஒதுக்குவதும் முன்னிலைப்படலாம்':child&&school[c.house]?school[c.house]:PERIOD_TA[c.house-1][stage];
 const md=actor(p.md,true),ad=actor(p.ad,true);
 const ties=periodConnectionsTamil([p.md,p.ad,p.pd],scoped);
 const why=ties||`${md}–${ad} கால அதிபதிகளின் பிறப்பு இருப்பிடங்களும் ${topicTamil(scoped)} பற்றிய பலனுடன் இணைகின்றன.`;
 const pd=p.pd?`அந்தர அதிபதி ${actor(p.pd,true)}.`:'';
 const transit=win.transit?`${win.transit.observedOn} அன்று கணிக்கப்பட்ட ${possessiveTamil(win.transit.planet)} கோச்சார நிலையும் ${topicTamil(scoped)} தொடர்பாக இதே காலத்தில் அமைகிறது.`:'';
 return [`${p.from} முதல் ${p.to} வரை ${md} தசை–${ad} புக்தியில் ${effect}.`,why,pd,transit].filter(Boolean).join(' ');
}
function naturalYearTamil(group,c,d){
 const p=group.period,knownAge=Number.isFinite(group.age),child=knownAge?group.age<18:!!c.ageUnder18,stage=d.stage==='support'?0:d.stage==='strain'?1:2;
 const scoped={...c,ageUnder18:child};
 const school={7:'நண்பர்களுடன் இணைந்து செயல்படும் பழக்கம் வளரலாம்',10:'பள்ளிப் பொறுப்பை ஏற்று முடிக்கும் திறன் வளரலாம்',11:'குழுக் கற்றலில் புதிய அனுபவம் பெறலாம்'};
 const effect=child&&school[c.house]?school[c.house]:PERIOD_TA[c.house-1][stage];
 const ties=periodConnectionsTamil([p.md,p.ad],scoped);
 const when=`${group.from} – ${group.to}: ${effect}.`;
 const rulers=`${actor(p.md,true)} தசை–${actor(p.ad,true)} புக்தி ${topicTamil(scoped)} தொடர்பான மாற்றங்களை முன்னிலைப்படுத்தும் காலமாக அமைகிறது.`;
 const transit=`${group.transit.observedOn} அன்று கணிக்கப்பட்ட ${possessiveTamil(group.transit.planet)} கோச்சார நிலையும் அதனுடன் இணைகிறது.`;
 const recurring=group.recurrences?.length?`இதே போன்ற காலச்சூழல் மீண்டும் காணப்படும் இடைவெளிகள்: ${group.recurrences.map(x=>x.from+'–'+x.to).join('; ')}.`:'';
 return [when,rulers,ties,transit,recurring].filter(Boolean).join(' ');
}
function natal(c,lang,seenClassical){const ta=lang!=='en',d=J().decide(c);if(!d)return [];if(ta)return naturalNatalTamil(c,d,seenClassical);
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
 return [scene,[cross,balance,division,ruleText].filter(Boolean).join(' ')].filter(Boolean);
}
function period(win,c,lang){const ta=lang!=='en',p=win.period,d=J().decide(c);if(!p||!p.md||!p.ad||!d)return '';
 if((win.links||[]).length===0 || win.weight<2.4)return ''; // no weak fallback prediction
 if(ta)return naturalPeriodTamil(win,c,d);
 const age=p.age,child=age!==null&&age<18;
 const theme=child?(ta?({7:'நண்பர்களுடன் பழகும் முறையில் பொறுப்பு உருவாவது',10:'பள்ளி மற்றும் பயிற்சியில் ஒப்படைக்கப்படும் பொறுப்பை முடிப்பது',11:'குழுவாகக் கற்கவும் செயல்படவும் வாய்ப்பு உருவாவது'})[c.house]||d.leadTA:
 ({7:'learning cooperation with peers',10:'finishing assigned study and training',11:'group learning and peer support'})[c.house]||d.leadEN):ta?d.leadTA:d.leadEN;
 const md=actor(p.md,ta),ad=actor(p.ad,ta),pd=p.pd?actor(p.pd,ta):null;
 const direct=[p.md,p.ad,p.pd].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).filter(k=>k===c.lord||c.houseOccupants.includes(k)||c.houseAspects.includes(k));
 const ties=direct.map(k=>`${actor(k,ta)} (${roleOf(k,c,ta)})`).join(', ');
 const stage=d.stage==='support'?0:d.stage==='strain'?1:2;
 const isSenior=age!==null&&age>=65;
 const effect=(isSenior&&c.house===10)?(ta?'பணி அனுபவத்தைப் பகிர்வதும் பொறுப்பை மறுஒதுக்குவதும் முன்னிலைப்படலாம்':'mentoring and reassessing work commitments may take priority'):
  (child&&[7,10,11].includes(c.house))?(ta?({7:'நண்பர்கள் மற்றும் ஆசிரியர்களுடன் பொறுப்பைப் பகிர்ந்துகொள்ளும் பழக்கம் வளரலாம்',10:'பள்ளிப் பயிற்சியில் ஒப்படைக்கப்பட்ட பணியை முடிக்கும் திறன் வளரலாம்',11:'குழுக் கற்றலிலும் நண்பர்கள் உறவிலும் புதிய அனுபவம் பெறலாம்'})[c.house]:({7:'cooperation with classmates and teachers may improve',10:'completing study commitments may become easier',11:'group learning and peer skills may develop'})[c.house]):(ta?PERIOD_TA:PERIOD_EN)[c.house-1][stage];
 const started=ta?`${p.from} முதல் ${p.to} வரையிலான ${md}–${ad} காலத்தில் ${effect}`:
  `During ${p.from}–${p.to} (${md}/${ad}), ${effect}.`;
 const why=ta?`இதற்கான பிறப்புத் தொடர்பு: ${ties||'கால அதிபதிகளின் நேரடித் தொடர்பு'}; ${c.house}-ஆம் பாவாதிபதி ${actor(c.lord,true)} ${c.location}-ஆம் பாவத்தில் இருப்பதும் முடிவை மாற்றுகிறது${pd?'; '+pd+' அந்தரத் தரவும் வழங்கப்பட்டுள்ளது':''}.`:
  `The ${md} major period and ${ad} sub-period${pd?' / '+pd+' sub-sub-period':''} have natal links with this house: ${ties||'computed natal links'}.`;
 const overlap=win.transit?(ta?`${actor(win.transit.planet,true)} பெயர்ச்சியின் ${win.transit.observedOn} மாதிரிக் கணிப்பும் இந்தப் புக்தியுடன் தொடர்பு பெறுகிறது.`:
  `The ${win.transit.planet} transit sampled on ${win.transit.observedOn} also falls within this sub-period.`):'';
 return [started,why,overlap].filter(Boolean).join(' ');
}
function year(group,lang){if(!group||group.kind==='insufficient'||!group.claim||!group.period||!group.transit)return '';
 const ta=lang!=='en',c=group.claim,d=J().decide(c);if(!d)return '';if(ta)return naturalYearTamil(group,c,d);
 const p=group.period,age=group.age,child=age!==null&&age<18;
 const subject=child?(ta?({5:'பாடங்களில் ஆழ்ந்து திறனை மேம்படுத்துதல்',7:'நண்பர்களுடன் இணைந்து செயல்படுதல்',10:'பள்ளிப் பொறுப்பை முடித்தல்',11:'குழுவினருடன் பயிற்சி பெறுதல்'})[c.house]||d.leadTA:
  ({5:'developing a learning skill',7:'working with peers',10:'carrying out school responsibilities',11:'learning with peers'})[c.house]||d.leadEN):ta?d.leadTA:d.leadEN;
 const md=actor(p.md,ta),ad=actor(p.ad,ta),planet=actor(group.transit.planet,ta);
 const matches=[p.md,p.ad].filter((k,i,a)=>a.indexOf(k)===i).filter(k=>k===c.lord||c.houseOccupants.includes(k)||c.houseAspects.includes(k));
 const link=ta?'':`The natal ruler of house ${c.house} occupies house ${c.location}.`;
 const fact=ta?`${md} தசை–${ad} புக்தியில் ${matches.map(x=>actor(x,true)).join(' மற்றும் ')||actor(c.lord,true)} இந்தப் பாவத்துடன் பிறப்புத் தொடர்பில் உள்ளது. ${planet} பெயர்ச்சியின் ${group.transit.observedOn} கணிக்கப்பட்ட நிலையுடன் இவை இணைகின்றன.`:
  `In the ${md}/${ad} sub-period, ${matches.join(' and ')||c.lord} has a natal link to this area; the sampled ${planet} transit falls on ${group.transit.observedOn}.`;
 const continuity=group.recurrences?.length?(ta?`அதே கருப்பொருளுடன் தொடர்புடைய பிற கணிக்கப்பட்ட காலங்கள்: ${group.recurrences.map(x=>x.from+'–'+x.to).join('; ')}.`:
  `Other sampled windows for the same theme: ${group.recurrences.map(x=>x.from+'–'+x.to).join('; ')}.`):'';
 const stage=d.stage==='support'?0:d.stage==='strain'?1:2;
 const effect=(child&&[7,10,11].includes(c.house))?subject:(ta?PERIOD_TA:PERIOD_EN)[c.house-1][stage];
 return (ta?`${group.from} – ${group.to}: ${effect}. ${fact}`:
  `${group.from} – ${group.to}: ${effect}. ${link} ${fact}`)+(continuity?' '+continuity:'');
}
function summary(s,lang){if(!s?.main)return [];
 const ta=lang!=='en',main=J().decide(s.main),counter=J().decide(s.counter);if(!main)return [];if(ta)return [main.completedTA,counter&&counter.house!==main.house?counter.completedTA:''].filter(Boolean);
 const first=ta?`ஜாதகத்தில் முன்னிலைப்படும் வாழ்க்கைத் துறையில் ${main.completedTA} ${actor(main.lord,true)} ${main.house}-ஆம் பாவத்தை ஆண்டு, ${main.location}-ஆம் இடத்தில் அமர்ந்திருப்பதால் ${main.linkTA} தொடர்பான முடிவுகளும் உடன் வருகின்றன.`:
  `The chart's leading life theme is ${main.leadEN}. ${main.lord}, ruling house ${main.house}, occupies house ${main.location} and links it with ${main.linkEN}.`;
 const other=counter&&counter.house!==main.house?(ta?`${AREA_TA[counter.house-1]} சார்ந்த விஷயத்தில் ${counter.completedTA} இதற்கு ${actor(counter.lord,true)} ${counter.location}-ஆம் பாவத்தில் இருக்கும் அமைப்பும் தொடர்புடையதாகும்.`:
  `Another indicator concerns ${counter.leadEN} in ${AREA_EN[counter.house-1]}; the two areas have different evidence.`):'';
 return [first,other].filter(Boolean);
}
return Object.freeze({natal,period,year,summary});
});
